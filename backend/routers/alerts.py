from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db, Client, Alert, AdAccount
from auth import get_current_client

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
def list_alerts(
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    alerts = (
        db.query(Alert)
        .filter(Alert.client_id == client.id)
        .order_by(Alert.creado_en.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": a.id,
            "tipo": a.tipo,
            "mensaje": a.mensaje,
            "severidad": a.severidad,
            "estado": a.estado,
            "ad_id": a.ad_id,
            "creado_en": a.creado_en.isoformat(),
        }
        for a in alerts
    ]


@router.post("/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.client_id == client.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    alert.estado = "resuelta"
    db.commit()
    return {"ok": True}


@router.post("/scan-me")
async def scan_my_alerts(
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """Escaneo manual iniciado desde el panel."""
    from routers.smart_alerts import _scan_client
    new_alerts = await _scan_client(client, db)
    db.commit()
    return {"ok": True, "alertas_nuevas": new_alerts}
