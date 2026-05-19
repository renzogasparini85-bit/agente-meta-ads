"""
Modo cliente (read-only).
GET  /client-view/token      → genera un token de solo lectura (7 días) para compartir
GET  /client-view/summary    → vista simplificada con token de lectura
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db, Client, Recommendation
from auth import get_current_client, SECRET_KEY, ALGORITHM
from services.meta_api import get_campaign_insights, extract_conversions, compute_cpa, date_range
from routers.account_resolver import resolve_account
from jose import jwt, JWTError
from datetime import datetime, timedelta

router = APIRouter(prefix="/client-view", tags=["client-view"])

VIEW_EXPIRE_DAYS = 7


def create_view_token(client_id: int, account_id: str = None) -> str:
    expire = datetime.utcnow() + timedelta(days=VIEW_EXPIRE_DAYS)
    payload = {"sub": str(client_id), "exp": expire, "mode": "readonly"}
    if account_id:
        payload["account_id"] = account_id
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_view_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("mode") != "readonly":
            raise HTTPException(status_code=403, detail="Token no es de solo lectura")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")


@router.get("/token")
def generate_view_token(
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """Genera un link de solo lectura para compartir con el cliente final."""
    token = create_view_token(client.id, account_id)
    base_url = "http://localhost:5173"  # en prod sería FRONTEND_URL
    import os
    base_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    link = f"{base_url}/cliente?token={token}"
    return {
        "token": token,
        "link": link,
        "expira_en_dias": VIEW_EXPIRE_DAYS,
        "expira_en": (datetime.utcnow() + timedelta(days=VIEW_EXPIRE_DAYS)).isoformat(),
    }


@router.get("/summary")
async def client_summary(
    view_token: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Vista simplificada para el cliente final.
    Solo necesita el view_token — no JWT.
    """
    payload = decode_view_token(view_token)
    client_id = int(payload["sub"])
    account_id = payload.get("account_id")

    client = db.query(Client).filter(Client.id == client_id, Client.activo == True).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    ad_account_id, token, _, campaign_filter, _ = resolve_account(client, account_id, db)

    # Datos del mes
    campaigns = await get_campaign_insights(ad_account_id, token, days=30)
    if campaign_filter:
        campaigns = [c for c in campaigns if campaign_filter.lower() in (c.get("campaign_name") or "").lower()]

    total_spend = sum(float(c.get("spend", 0) or 0) for c in campaigns)
    total_conv  = sum(extract_conversions(c.get("actions", [])) for c in campaigns)
    cpa_global  = compute_cpa(total_spend, total_conv)

    # Estado general
    cpas = [compute_cpa(float(c.get("spend",0) or 0), extract_conversions(c.get("actions",[])))
            for c in campaigns]
    cpas_validos = [x for x in cpas if x is not None]

    if cpa_global and client.cpa_pausar and cpa_global >= client.cpa_pausar:
        estado = "atencion"
        estado_label = "Hay campañas que necesitan ajuste"
        estado_color = "yellow"
    elif not cpas_validos:
        estado = "sin_datos"
        estado_label = "Sin conversiones registradas este mes"
        estado_color = "gray"
    else:
        estado = "ok"
        estado_label = "Campaña funcionando bien"
        estado_color = "green"

    # Recomendaciones recientes
    recs = (
        db.query(Recommendation)
        .filter(Recommendation.client_id == client_id)
        .order_by(Recommendation.generado_en.desc())
        .limit(3)
        .all()
    )

    return {
        "marca": client.marca_nombre or client.nombre,
        "periodo": "Últimos 30 días",
        "estado": estado,
        "estado_label": estado_label,
        "estado_color": estado_color,
        "kpis": {
            "gasto": round(total_spend, 2),
            "conversaciones": total_conv,
            "cpa": cpa_global,
            "moneda": client.moneda or "ARS",
        },
        "campanas": [
            {
                "nombre": c.get("campaign_name"),
                "conversaciones": extract_conversions(c.get("actions", [])),
                "cpa": compute_cpa(float(c.get("spend", 0) or 0), extract_conversions(c.get("actions", []))),
            }
            for c in campaigns[:5]
        ],
        "recomendaciones": [
            {"titulo": r.titulo, "accion": r.accion, "tipo": r.tipo}
            for r in recs
        ],
        "generado_en": datetime.utcnow().isoformat(),
    }
