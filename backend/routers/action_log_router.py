from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Client, ActionLog, AdAccount
from auth import get_current_client
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import asyncio
from services.action_impact import metrics_for_meta_entity

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
            "account_id":   l.account_id,
            "resultado":    l.resultado,
            "ejecutado_en": l.ejecutado_en.isoformat() if l.ejecutado_en else None,
        }
        for l in logs
    ]


class ActionLogCreate(BaseModel):
    tipo:        str            # pause | budget_change | create_campaign | duplicate | otro
    descripcion: str
    meta_id:     Optional[str] = None
    account_id:  Optional[int] = None
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
        account_id=body.account_id,
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
        "account_id":   log.account_id,
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

    account_query = db.query(AdAccount).filter(
        AdAccount.client_id == client.id,
        AdAccount.activo == True,
    )
    account = (
        account_query.filter(AdAccount.id == log.account_id).first()
        if log.account_id
        else account_query.order_by(AdAccount.creado_en).first()
    )
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

    try:
        before_ads, after_ads = await asyncio.gather(
            get_ad_insights(account.meta_ad_account_id, token, since=before_since, until=before_until),
            get_ad_insights(account.meta_ad_account_id, token, since=after_since,  until=after_until),
        )
    except Exception as e:
        return {"available": False, "motivo": f"Error Meta API: {str(e)[:120]}"}

    before = metrics_for_meta_entity(before_ads, log.meta_id, extract_conversions)
    after = metrics_for_meta_entity(after_ads, log.meta_id, extract_conversions)
    if before is None or after is None:
        return {
            "available": False,
            "motivo": "El ID de Meta no aparece en ambos períodos para esta cuenta",
        }

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
