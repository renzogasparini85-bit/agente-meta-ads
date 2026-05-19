from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db, Client, ActionLog
from auth import get_current_client

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
