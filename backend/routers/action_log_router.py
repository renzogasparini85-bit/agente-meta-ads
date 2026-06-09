from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Client, ActionLog, AdAccount
from auth import get_current_client
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import asyncio

router = APIRouter(prefix="/action-log", tags=["action-log"])


@router.get("")
def list_action_log(
    limit: int = Query(50, ge=1, le=200),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    logs = (
        db.query(ActionLog)
        .filter(ActionLog.client_id == client.id)
        .order_by(ActionLog.ejecutado_en.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id":           l.id,
            "tipo":         l.tipo,
            "descripcion":  l.descripcion,
            "meta_id":      l.meta_id,
            "resultado":    l.resultado,
            "ejecutado_en": l.ejecutado_en.isoformat() if l.ejecutado_en else None,
        }
        for l in logs
    ]


class ActionLogCreate(BaseModel):
    tipo:        str            # pause | budget_change | create_campaign | duplicate | otro
    descripcion: str
    meta_id:     Optional[str] = None
    resultado:   str = "ok"


@router.post("")
def create_action_log(
    body: ActionLogCreate,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    log = ActionLog(
        client_id=client.id,
        tipo=body.tipo,
        descripcion=body.descripcion,
        meta_id=body.meta_id or None,
        resultado=body.resultado,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {
        "id":           log.id,
        "tipo":         log.tipo,
        "descripcion":  log.descripcion,
        "meta_id":      log.meta_id,
        "resultado":    log.resultado,
        "ejecutado_en": log.ejecutado_en.isoformat() if log.ejecutado_en else None,
    }


@router.delete("/{action_id}")
def delete_action_log(
    action_id: int,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    log = db.query(ActionLog).filter(
        ActionLog.id == action_id,
        ActionLog.client_id == client.id,
    ).first()
    if not log:
        raise HTTPException(404, "Acción no encontrada")
    db.delete(log)
    db.commit()
    return {"ok": True}


@router.get("/{action_id}/impact")
async def get_action_impact(
    action_id: int,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """Compara métricas 7 días antes vs 7 días después de la acción."""
    from services.meta_api import get_ad_insights, extract_conversions, compute_cpa

    log = db.query(ActionLog).filter(
        ActionLog.id == action_id,
        ActionLog.client_id == client.id,
    ).first()
    if not log:
        raise HTTPException(404, "Acción no encontrada")
    if not log.meta_id:
        return {"available": False, "motivo": "Sin ID de Meta asociado"}

    accion_dt = log.ejecutado_en
    now = datetime.utcnow()
    dias_despues = (now - accion_dt).days

    if dias_despues < 2:
        return {"available": False, "motivo": "Muy reciente — esperá al menos 2 días para medir impacto"}

    account = db.query(AdAccount).filter(
        AdAccount.client_id == client.id,
        AdAccount.activo == True,
    ).first()
    if not account:
        return {"available": False, "motivo": "Sin cuenta publicitaria activa"}

    token = client.meta_access_token
    if not token or token == "DEMO":
        return {"available": False, "motivo": "Token no disponible"}

    fmt = "%Y-%m-%d"
    before_since = (accion_dt - timedelta(days=7)).strftime(fmt)
    before_until = accion_dt.strftime(fmt)
    after_since  = accion_dt.strftime(fmt)
    after_until  = min(now, accion_dt + timedelta(days=7)).strftime(fmt)

    def _metricas(ads, meta_id):
        filtrados = [
            a for a in ads
            if a.get("ad_id") == meta_id
            or a.get("adset_id") == meta_id
            or a.get("campaign_id") == meta_id
        ]
        if not filtrados:
            filtrados = ads  # fallback: cuenta completa
        spend = sum(float(a.get("spend") or 0) for a in filtrados)
        conv  = sum(extract_conversions(a.get("actions", [])) for a in filtrados)
        impr  = sum(float(a.get("impressions") or 0) for a in filtrados)
        clicks = sum(float(a.get("clicks") or 0) for a in filtrados)
        freq  = sum(float(a.get("frequency") or 0) for a in filtrados) / len(filtrados) if filtrados else 0
        return {
            "spend": round(spend, 2),
            "conv":  conv,
            "cpa":   round(spend / conv, 2) if conv > 0 else None,
            "ctr":   round(clicks / impr * 100, 2) if impr > 0 else None,
            "freq":  round(freq, 2),
        }

    try:
        before_ads, after_ads = await asyncio.gather(
            get_ad_insights(account.meta_ad_account_id, token, since=before_since, until=before_until),
            get_ad_insights(account.meta_ad_account_id, token, since=after_since,  until=after_until),
        )
    except Exception as e:
        return {"available": False, "motivo": f"Error Meta API: {str(e)[:120]}"}

    before = _metricas(before_ads, log.meta_id)
    after  = _metricas(after_ads,  log.meta_id)

    def _delta(b, a):
        if b is None or a is None or b == 0:
            return None
        return round((a - b) / b * 100, 1)

    return {
        "available":     True,
        "before":        before,
        "after":         after,
        "dias_medicion": min(dias_despues, 7),
        "tipo":          log.tipo,
        "delta": {
            "cpa":   _delta(before["cpa"],   after["cpa"]),
            "spend": _delta(before["spend"], after["spend"]),
            "conv":  _delta(before["conv"],  after["conv"]),
            "ctr":   _delta(before["ctr"],   after["ctr"]),
        },
    }
