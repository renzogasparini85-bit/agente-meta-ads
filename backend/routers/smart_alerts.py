"""
Alertas inteligentes proactivas.
POST /alerts/scan  → analiza todos los clientes activos y genera alertas nuevas.
Se puede llamar desde GitHub Actions diariamente.
Tiene una API key propia para no requerir JWT de usuario.
"""
from fastapi import APIRouter, Header, HTTPException, Query
from sqlalchemy.orm import Session
from database import SessionLocal, Client, AdAccount, Alert
from services.meta_api import get_ad_insights, extract_conversions, compute_cpa
from datetime import datetime
import asyncio, os

router = APIRouter(prefix="/alerts", tags=["alerts"])

SCAN_API_KEY = os.getenv("SCAN_API_KEY", "scan_dev_key")


def _require_scan_key(x_api_key: str = Header(...)):
    if x_api_key != SCAN_API_KEY:
        raise HTTPException(status_code=403, detail="API key inválida")


@router.post("/scan")
async def scan_all_clients(x_api_key: str = Header(...)):
    """
    Endpoint llamado por cron/GitHub Actions.
    Escanea todos los clientes activos y genera alertas proactivas.
    """
    _require_scan_key(x_api_key)
    db = SessionLocal()
    try:
        clients = db.query(Client).filter(Client.activo == True).all()
        total_alerts = 0
        report = []

        for client in clients:
            try:
                n = await _scan_client(client, db)
                total_alerts += n
                report.append({"cliente": client.nombre, "alertas_nuevas": n})
            except Exception as e:
                report.append({"cliente": client.nombre, "error": str(e)})

        db.commit()
        return {
            "ok": True,
            "clientes_escaneados": len(clients),
            "alertas_generadas": total_alerts,
            "detalle": report,
            "ejecutado_en": datetime.utcnow().isoformat(),
        }
    finally:
        db.close()


async def _scan_adset_angles(account_id: str, token: str, db, client_id: int) -> int:
    """
    Analiza rendimiento por adset (ángulo) dentro de cada campaña.
    - Adset con gasto > 3000 ARS y 0 conversiones en 7 días → alerta alta
    - Adset con CPA > 2x promedio de la campaña → alerta media
    """
    from services.meta_api import get_hierarchy_tree
    try:
        tree = await get_hierarchy_tree(account_id, token, days=7)
    except Exception:
        return 0

    nuevas = 0
    for campaign in tree:
        adsets = campaign.get("adsets", [])
        if not adsets:
            continue

        cpas = [a["cpa"] for a in adsets if a.get("cpa") is not None]
        cpa_promedio = sum(cpas) / len(cpas) if cpas else None

        for adset in adsets:
            adset_id = adset["adset_id"]
            adset_name = adset["adset_name"]
            spend = adset.get("spend", 0)
            conv = adset.get("conversiones", 0)
            cpa = adset.get("cpa")

            if spend > 3000 and conv == 0:
                exists = db.query(Alert).filter_by(
                    client_id=client_id, tipo="sin_conversion",
                    ad_id=f"adset_{adset_id}", estado="activa"
                ).first()
                if not exists:
                    db.add(Alert(
                        client_id=client_id,
                        tipo="sin_conversion",
                        severidad="alta",
                        ad_id=f"adset_{adset_id}",
                        mensaje=f'Conjunto "{adset_name}" gastó ${spend:,.0f} en 7 días sin conversiones. Revisá el ángulo o pausalo.',
                        estado="activa",
                    ))
                    nuevas += 1

            if cpa and cpa_promedio and cpa > cpa_promedio * 2:
                exists = db.query(Alert).filter_by(
                    client_id=client_id, tipo="cpa_alto",
                    ad_id=f"adset_{adset_id}", estado="activa"
                ).first()
                if not exists:
                    db.add(Alert(
                        client_id=client_id,
                        tipo="cpa_alto",
                        severidad="media",
                        ad_id=f"adset_{adset_id}",
                        mensaje=f'Conjunto "{adset_name}" tiene CPA ${cpa:,.0f} — el doble del promedio de la campaña (${cpa_promedio:,.0f}). Considerá pausarlo y escalar los otros ángulos.',
                        estado="activa",
                    ))
                    nuevas += 1

    db.commit()
    return nuevas


async def _scan_client(client: Client, db: Session) -> int:
    """Analiza un cliente y crea alertas si detecta problemas. Devuelve cantidad creada."""
    accounts = db.query(AdAccount).filter(
        AdAccount.client_id == client.id,
        AdAccount.activo == True,
    ).all()

    token = client.meta_access_token
    if not token or token == "DEMO":
        return 0

    new_alerts = 0

    for account in accounts:
        ad_account_id = account.meta_ad_account_id
        campaign_filter = account.campaign_filter

        try:
            ads = await get_ad_insights(ad_account_id, token, days=7)
        except Exception:
            continue

        for ad in ads:
            if campaign_filter:
                nombre_camp = (ad.get("campaign_name") or "").lower()
                if campaign_filter.lower() not in nombre_camp:
                    continue

            ad_id   = ad.get("ad_id") or ""
            ad_name = ad.get("ad_name") or ad_id
            spend   = float(ad.get("spend", 0) or 0)
            freq    = float(ad.get("frequency", 0) or 0)
            ctr     = float(ad.get("ctr", 0) or 0)
            conv    = extract_conversions(ad.get("actions", []))
            cpa     = compute_cpa(spend, conv)

            alertas_ad = []

            # Frecuencia crítica
            if freq >= 3.0:
                alertas_ad.append({
                    "tipo": "frecuencia",
                    "severidad": "alta",
                    "mensaje": f"⚠️ Frecuencia crítica ({freq:.1f}) en '{ad_name}'. Renovar creativo urgente.",
                })
            elif freq >= 2.5:
                alertas_ad.append({
                    "tipo": "frecuencia",
                    "severidad": "media",
                    "mensaje": f"Frecuencia elevada ({freq:.1f}) en '{ad_name}'. Empezá a preparar variaciones.",
                })

            # CPA sobre umbral
            if cpa and cpa >= client.cpa_pausar:
                alertas_ad.append({
                    "tipo": "cpa_alto",
                    "severidad": "alta",
                    "mensaje": f"🔴 CPA de ${cpa:.0f} en '{ad_name}' supera el umbral de pausa (${client.cpa_pausar:.0f}).",
                })

            # Gasto sin conversiones
            if spend >= client.gasto_minimo_juzgar and conv == 0:
                alertas_ad.append({
                    "tipo": "sin_conversion",
                    "severidad": "alta",
                    "mensaje": f"⛔ '{ad_name}' gastó ${spend:.0f} en 7 días sin ninguna conversión.",
                })

            # CTR muy bajo
            if ctr < 0.5 and spend >= 1000:
                alertas_ad.append({
                    "tipo": "ctr_caida",
                    "severidad": "media",
                    "mensaje": f"CTR muy bajo ({ctr:.2f}%) en '{ad_name}'. Revisá el visual o el copy.",
                })

            for alerta_data in alertas_ad:
                # Evitar duplicados: misma tipo + ad_id + activa
                existe = db.query(Alert).filter(
                    Alert.client_id == client.id,
                    Alert.ad_id == ad_id,
                    Alert.tipo == alerta_data["tipo"],
                    Alert.estado == "activa",
                ).first()
                if not existe:
                    db.add(Alert(
                        client_id=client.id,
                        tipo=alerta_data["tipo"],
                        severidad=alerta_data["severidad"],
                        mensaje=alerta_data["mensaje"],
                        ad_id=ad_id,
                        estado="activa",
                    ))
                    new_alerts += 1

        # Adset-level angle alerts
        new_alerts += await _scan_adset_angles(ad_account_id, token, db, client.id)

    return new_alerts


@router.post("/scan/me")
async def scan_my_account(
    account_id: str = Query(None),
    x_api_key: str = Header(None),
):
    """
    Escaneo manual desde el panel — usa JWT + puede llamarse desde UI.
    """
    from auth import get_current_client
    from fastapi import Depends
    # Este endpoint se llama desde el frontend con JWT, no con API key
    # Lo manejamos diferente: ver abajo
    raise HTTPException(status_code=501, detail="Usá POST /alerts/scan-me con JWT")


@router.post("/scan-me")
async def scan_my_account_jwt(
    account_id: str = Query(None),
    # Usamos auth manual para no depender de Depends en función async
):
    """Placeholder — el scan manual real está en alerts_router via JWT."""
    raise HTTPException(status_code=501, detail="Ver /alerts/scan con JWT en alerts_router")
