"""
Alertas inteligentes proactivas.
POST /alerts/scan  → analiza todos los clientes activos y genera alertas nuevas.
Se puede llamar desde GitHub Actions diariamente.
Tiene una API key propia para no requerir JWT de usuario.
"""
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session
from database import SessionLocal, Client, AdAccount, Alert, get_db
from auth import get_current_client
from services.meta_api import get_ad_insights, get_ad_created_dates, extract_conversions, compute_cpa
from datetime import datetime, timezone
import asyncio, os

MIN_AD_AGE_DAYS = 5   # días mínimos antes de empezar a alertar sobre un anuncio


def _ad_age_days(created_time_str: str) -> float:
    """Días transcurridos desde la creación del anuncio. Devuelve 999 si no hay fecha."""
    if not created_time_str:
        return 999
    try:
        # Meta devuelve ISO 8601 con timezone, ej: "2026-05-20T10:30:00+0000"
        dt = datetime.fromisoformat(created_time_str.replace("+0000", "+00:00"))
        return (datetime.now(timezone.utc) - dt).total_seconds() / 86400
    except Exception:
        return 999

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

    # Auto-resolver alertas con más de 7 días (datos ya no son relevantes)
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=7)
    db.query(Alert).filter(
        Alert.client_id == client.id,
        Alert.estado == "activa",
        Alert.creado_en < cutoff,
    ).update({"estado": "resuelta"})

    new_alerts = 0

    for account in accounts:
        ad_account_id = account.meta_ad_account_id
        campaign_filter = account.campaign_filter

        try:
            ads = await get_ad_insights(ad_account_id, token, days=7)
        except Exception:
            continue

        # Fechas de creación — si falla el rate limit, asumimos edad suficiente
        try:
            created_dates = await get_ad_created_dates(ad_account_id, token)
        except Exception:
            created_dates = {}

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

            # Si no hay fecha → asumimos edad suficiente (no bloqueamos la alerta)
            edad_dias = _ad_age_days(created_dates.get(ad_id, ""))
            en_aprendizaje = edad_dias < MIN_AD_AGE_DAYS

            alertas_ad = []

            # Frecuencia crítica — aplica incluso en aprendizaje
            if freq >= client.freq_rojo:
                alertas_ad.append({
                    "tipo": "frecuencia",
                    "severidad": "alta",
                    "mensaje": f"⚠️ Frecuencia crítica ({freq:.1f}) en '{ad_name}'. Renovar creativo urgente.",
                })
            elif freq >= client.freq_amarillo:
                alertas_ad.append({
                    "tipo": "frecuencia",
                    "severidad": "media",
                    "mensaje": f"Frecuencia elevada ({freq:.1f}) en '{ad_name}'. Empezá a preparar variaciones.",
                })

            # Las siguientes alertas requieren mínimo 5 días de datos
            if not en_aprendizaje:
                # CPA sobre umbral
                if cpa and cpa >= client.cpa_pausar:
                    alertas_ad.append({
                        "tipo": "cpa_alto",
                        "severidad": "alta",
                        "mensaje": f"🔴 CPA de ${cpa:.0f} en '{ad_name}' supera el umbral de pausa (${client.cpa_pausar:.0f}). ({edad_dias:.0f} días activo)",
                    })

                # Gasto sin conversiones
                if spend >= client.gasto_minimo_juzgar and conv == 0:
                    alertas_ad.append({
                        "tipo": "sin_conversion",
                        "severidad": "alta",
                        "mensaje": f"⛔ '{ad_name}' gastó ${spend:.0f} en 7 días sin ninguna conversión. ({edad_dias:.0f} días activo)",
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


@router.post("/scan-me")
async def scan_me(
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """Escaneo manual desde el panel — usa JWT. Detecta fatiga, CTR bajo, CPA alto."""
    from routers.account_resolver import resolve_account
    ad_account_id, token, _, campaign_filter, _ = resolve_account(client, account_id, db)
    if token == "DEMO":
        return {"ok": True, "alertas_generadas": 0, "demo": True}

    try:
        ads = await get_ad_insights(ad_account_id, token, days=7)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Meta API: {str(e)}")

    try:
        created_dates = await get_ad_created_dates(ad_account_id, token)
    except Exception:
        created_dates = {}

    new_alerts = 0
    for ad in ads:
        if campaign_filter:
            if campaign_filter.lower() not in (ad.get("campaign_name") or "").lower():
                continue

        ad_id   = ad.get("ad_id") or ""
        ad_name = ad.get("ad_name") or ad_id
        spend   = float(ad.get("spend", 0) or 0)
        freq    = float(ad.get("frequency", 0) or 0)
        ctr     = float(ad.get("ctr", 0) or 0)
        conv    = extract_conversions(ad.get("actions", []))
        cpa     = compute_cpa(spend, conv)

        edad_dias = _ad_age_days(created_dates.get(ad_id, ""))
        en_aprendizaje = edad_dias < MIN_AD_AGE_DAYS

        candidatas = []

        # Frecuencia aplica siempre
        if freq >= client.freq_rojo:
            candidatas.append(("frecuencia", "alta",
                f"⚠️ Frecuencia crítica ({freq:.1f}) en '{ad_name}'. Renovar creativo urgente."))
        elif freq >= client.freq_amarillo:
            candidatas.append(("frecuencia", "media",
                f"Frecuencia elevada ({freq:.1f}) en '{ad_name}'. Preparate para rotar el creativo."))

        # CPA / conversiones / CTR requieren mínimo 5 días
        if not en_aprendizaje:
            if cpa and cpa >= client.cpa_pausar:
                candidatas.append(("cpa_alto", "alta",
                    f"🔴 CPA ${cpa:.0f} en '{ad_name}' supera el umbral de pausa (${client.cpa_pausar:.0f}). ({edad_dias:.0f} días activo)"))

            if spend >= client.gasto_minimo_juzgar and conv == 0:
                candidatas.append(("sin_conversion", "alta",
                    f"⛔ '{ad_name}' gastó ${spend:.0f} en 7 días sin conversiones. ({edad_dias:.0f} días activo)"))

            if ctr < 0.5 and spend >= 1000:
                candidatas.append(("ctr_caida", "media",
                    f"CTR muy bajo ({ctr:.2f}%) en '{ad_name}'. Revisá el visual o el copy."))

        for tipo, severidad, mensaje in candidatas:
            existe = db.query(Alert).filter(
                Alert.client_id == client.id,
                Alert.ad_id == ad_id,
                Alert.tipo == tipo,
                Alert.estado == "activa",
            ).first()
            if not existe:
                db.add(Alert(
                    client_id=client.id,
                    tipo=tipo, severidad=severidad,
                    mensaje=mensaje, ad_id=ad_id, estado="activa",
                ))
                new_alerts += 1

    db.commit()
    return {"ok": True, "alertas_generadas": new_alerts, "ads_analizados": len(ads)}


# ── Notificaciones externas ──────────────────────────────────────────

@router.post("/notify-now")
async def notify_now(
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """Disparo manual: escanea y envía por Telegram y/o Email si hay alertas."""
    from services.notificaciones import (
        enviar_telegram, enviar_email,
        formatear_alerta_telegram, formatear_alerta_email_html,
    )

    tiene_telegram = bool(client.telegram_chat_id)
    tiene_email    = bool(getattr(client, "notif_email", None))

    if not tiene_telegram and not tiene_email:
        raise HTTPException(
            status_code=400,
            detail="No tenés Telegram ni email configurado. Agregalo en Configuración → Notificaciones.",
        )

    n = await _scan_client(client, db)
    db.commit()

    alertas = db.query(Alert).filter(
        Alert.client_id == client.id,
        Alert.estado == "activa",
    ).order_by(Alert.creado_en.desc()).limit(10).all()

    if not alertas:
        return {"ok": True, "enviado": False, "motivo": "Sin alertas activas — no se envió mensaje", "alertas_nuevas": n}

    alertas_dict = [{"tipo": a.tipo, "mensaje": a.mensaje, "severidad": a.severidad} for a in alertas]
    resultados = {}

    if tiene_telegram:
        texto = formatear_alerta_telegram(client.nombre, alertas_dict, client.moneda or "ARS")
        resultados["telegram"] = await enviar_telegram(client.telegram_chat_id, texto)

    if tiene_email:
        subject, html = formatear_alerta_email_html(client.nombre, alertas_dict)
        resultados["email"] = enviar_email(client.notif_email, subject, html)

    ok = any(v.get("ok") for v in resultados.values())
    return {
        "ok": ok,
        "enviado": ok,
        "alertas_nuevas": n,
        "alertas_en_mensaje": len(alertas_dict),
        "canales": resultados,
    }


@router.get("/notify-config")
def get_notify_config(client: Client = Depends(get_current_client)):
    """Devuelve la configuración actual de notificaciones del cliente."""
    from services.notificaciones import _telegram_ok, _email_ok
    return {
        "telegram_chat_id":    client.telegram_chat_id,
        "notif_email":         getattr(client, "notif_email", None),
        "notif_diaria_activa": client.notif_diaria_activa,
        "notif_hora":          client.notif_hora,
        "telegram_configurado": _telegram_ok(),
        "email_configurado":    _email_ok(),
    }


@router.put("/notify-config")
def update_notify_config(
    telegram_chat_id:    str  = None,
    notif_email:         str  = None,
    notif_diaria_activa: bool = None,
    notif_hora:          int  = None,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """Guarda la configuración de notificaciones del cliente."""
    if telegram_chat_id is not None:
        client.telegram_chat_id = telegram_chat_id.strip() or None
    if notif_email is not None:
        client.notif_email = notif_email.strip() or None
    if notif_diaria_activa is not None:
        client.notif_diaria_activa = notif_diaria_activa
    if notif_hora is not None:
        client.notif_hora = max(0, min(23, notif_hora))
    db.commit()
    return {
        "ok": True,
        "telegram_chat_id":    client.telegram_chat_id,
        "notif_email":         getattr(client, "notif_email", None),
        "notif_diaria_activa": client.notif_diaria_activa,
        "notif_hora":          client.notif_hora,
    }
