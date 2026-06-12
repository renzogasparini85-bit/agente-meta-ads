from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Client, Hypothesis, AdAccount
from auth import get_current_client
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/hypotheses", tags=["hypotheses"])


class HypothesisCreate(BaseModel):
    titulo:         str
    descripcion:    Optional[str] = None
    metrica:        str           # cpa | ctr | conv | spend | freq
    valor_antes:    Optional[float] = None
    valor_objetivo: Optional[float] = None
    mejora_pct:     Optional[float] = None
    dias_medicion:  int = 7
    ad_id:          Optional[str] = None
    notas:          Optional[str] = None


class HypothesisUpdate(BaseModel):
    notas:       Optional[str] = None
    estado:      Optional[str] = None
    valor_final: Optional[float] = None


def _serialize(h: Hypothesis) -> dict:
    vencimiento = None
    if h.creado_en and h.dias_medicion:
        vencimiento = (h.creado_en + timedelta(days=h.dias_medicion)).isoformat()
    dias_restantes = None
    if h.estado == "activa" and vencimiento:
        dias_restantes = max(0, (datetime.fromisoformat(vencimiento) - datetime.utcnow()).days)
    return {
        "id":             h.id,
        "titulo":         h.titulo,
        "descripcion":    h.descripcion,
        "metrica":        h.metrica,
        "valor_antes":    h.valor_antes,
        "valor_objetivo": h.valor_objetivo,
        "mejora_pct":     h.mejora_pct,
        "dias_medicion":  h.dias_medicion,
        "ad_id":          h.ad_id,
        "estado":         h.estado,
        "valor_final":    h.valor_final,
        "delta_real_pct": h.delta_real_pct,
        "notas":          h.notas,
        "creado_en":      h.creado_en.isoformat() if h.creado_en else None,
        "medido_en":      h.medido_en.isoformat() if h.medido_en else None,
        "vencimiento":    vencimiento,
        "dias_restantes": dias_restantes,
    }


@router.get("")
def list_hypotheses(
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    items = (
        db.query(Hypothesis)
        .filter(Hypothesis.client_id == client.id)
        .order_by(Hypothesis.creado_en.desc())
        .all()
    )
    return [_serialize(h) for h in items]


@router.post("")
def create_hypothesis(
    body: HypothesisCreate,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    h = Hypothesis(
        client_id=client.id,
        titulo=body.titulo,
        descripcion=body.descripcion,
        metrica=body.metrica,
        valor_antes=body.valor_antes,
        valor_objetivo=body.valor_objetivo,
        mejora_pct=body.mejora_pct,
        dias_medicion=body.dias_medicion,
        ad_id=body.ad_id,
        notas=body.notas,
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return _serialize(h)


@router.put("/{hyp_id}")
def update_hypothesis(
    hyp_id: int,
    body: HypothesisUpdate,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    h = db.query(Hypothesis).filter(Hypothesis.id == hyp_id, Hypothesis.client_id == client.id).first()
    if not h:
        raise HTTPException(404, "Hipótesis no encontrada")
    if body.notas is not None:
        h.notas = body.notas
    if body.estado is not None:
        h.estado = body.estado
        if body.estado in ("confirmada", "refutada"):
            h.medido_en = datetime.utcnow()
    if body.valor_final is not None:
        h.valor_final = body.valor_final
        if h.valor_antes and h.valor_antes != 0:
            h.delta_real_pct = round((body.valor_final - h.valor_antes) / h.valor_antes * 100, 1)
    db.commit()
    db.refresh(h)
    return _serialize(h)


@router.post("/{hyp_id}/medir")
async def medir_hypothesis(
    hyp_id: int,
    account_id: str = None,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """
    Mide automáticamente la hipótesis comparando el valor actual de la métrica
    contra el valor_antes registrado. Marca como confirmada/refutada.
    """
    from services.meta_api import get_ad_insights, extract_conversions, compute_cpa
    from routers.account_resolver import resolve_account

    h = db.query(Hypothesis).filter(Hypothesis.id == hyp_id, Hypothesis.client_id == client.id).first()
    if not h:
        raise HTTPException(404, "Hipótesis no encontrada")

    meta_account_id, token, _, campaign_filter, _ = resolve_account(client, account_id, db)
    if token == "DEMO":
        return {"ok": False, "motivo": "Demo no soporta medición automática"}

    try:
        ads = await get_ad_insights(meta_account_id, token, days=7)
    except Exception as e:
        raise HTTPException(502, f"Error Meta API: {str(e)[:120]}")

    if campaign_filter:
        ads = [a for a in ads if campaign_filter.lower() in (a.get("campaign_name") or "").lower()]
    if h.ad_id:
        ads = [a for a in ads if a.get("ad_id") == h.ad_id] or ads

    if not ads:
        return {"ok": False, "motivo": "Sin datos para la métrica seleccionada"}

    total_spend = sum(float(a.get("spend") or 0) for a in ads)
    total_conv  = sum(extract_conversions(a.get("actions", [])) for a in ads)
    total_impr  = sum(float(a.get("impressions") or 0) for a in ads)
    total_clicks = sum(float(a.get("clicks") or 0) for a in ads)
    avg_freq    = sum(float(a.get("frequency") or 0) for a in ads) / len(ads)

    valor_actual = {
        "cpa":   compute_cpa(total_spend, total_conv),
        "spend": total_spend,
        "conv":  total_conv,
        "ctr":   total_clicks / total_impr * 100 if total_impr > 0 else None,
        "freq":  avg_freq,
    }.get(h.metrica)

    if valor_actual is None:
        return {"ok": False, "motivo": f"No se pudo calcular '{h.metrica}' con los datos disponibles"}

    h.valor_final = round(valor_actual, 2)
    if h.valor_antes and h.valor_antes != 0:
        h.delta_real_pct = round((valor_actual - h.valor_antes) / h.valor_antes * 100, 1)

    # Confirmar o refutar según si la mejora supera el 80% de lo esperado
    mejora_esperada = h.mejora_pct or 0
    if h.delta_real_pct is not None and mejora_esperada != 0:
        # Para métricas donde menor es mejor (cpa, spend, freq): mejora = valor negativo
        metricas_menor_mejor = {"cpa", "spend", "freq"}
        if h.metrica in metricas_menor_mejor:
            confirmada = h.delta_real_pct <= mejora_esperada * 0.8  # se esperaba reducción
        else:
            confirmada = h.delta_real_pct >= mejora_esperada * 0.8  # se esperaba aumento
        h.estado = "confirmada" if confirmada else "refutada"
    else:
        h.estado = "vencida"

    h.medido_en = datetime.utcnow()
    db.commit()
    db.refresh(h)
    return {"ok": True, **_serialize(h)}


@router.delete("/{hyp_id}")
def delete_hypothesis(
    hyp_id: int,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    h = db.query(Hypothesis).filter(Hypothesis.id == hyp_id, Hypothesis.client_id == client.id).first()
    if not h:
        raise HTTPException(404, "Hipótesis no encontrada")
    db.delete(h)
    db.commit()
    return {"ok": True}
