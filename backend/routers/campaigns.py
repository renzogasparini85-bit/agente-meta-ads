from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, Client, ActionLog
from auth import get_current_client
from services.meta_objectives import label_objetivo
from services.meta_api import (
    get_campaign_insights, get_ad_insights,
    pause_ad, pause_campaign,
    create_campaign_draft,
    extract_conversions, compute_cpa,
    get_hierarchy_tree,
)
from routers.creatives import compute_roas_hibrido, compute_ftir, extract_marca
from routers.account_resolver import resolve_account

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("")
async def list_campaigns(
    days: int = Query(30, ge=1, le=365),
    since: str = Query(None),
    until: str = Query(None),
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    ad_account_id, token, _, campaign_filter, _ = resolve_account(client, account_id, db)
    raw = await get_campaign_insights(
        ad_account_id, token,
        days, since=since, until=until,
    )
    result = []
    for c in raw:
        nombre_c = c.get("campaign_name") or ""
        # Aplicar filtro de cliente si está configurado
        if campaign_filter and campaign_filter.lower() not in nombre_c.lower():
            continue
        spend       = float(c.get("spend", 0) or 0)
        impressions = float(c.get("impressions", 0) or 0)
        reach       = float(c.get("reach", 0) or 0)
        conv        = extract_conversions(c.get("actions", []))
        cpa         = compute_cpa(spend, conv)
        ftir        = compute_ftir(reach, impressions)
        roas        = compute_roas_hibrido(
            spend, conv,
            c.get("purchase_roas"),
            client.ticket_promedio,
            client.tasa_cierre,
        )
        result.append({
            "id":             c.get("campaign_id"),
            "nombre":         nombre_c,
            "marca":          extract_marca(nombre_c),
            "objetivo":      label_objetivo(c.get("objective", "")),
            "gasto":         spend,
            "impresiones":   int(impressions),
            "alcance":       int(reach),
            "ctr":           round(float(c.get("ctr", 0) or 0), 2),
            "cpc":           round(float(c.get("cpc", 0) or 0), 2),
            "conversaciones": conv,
            "cpa":           cpa,
            "roas":          roas,
            "ftir":          ftir,
            "frecuencia":    round(float(c.get("frequency", 0) or 0), 2),
        })
    return result


@router.get("/{campaign_id}/ads")
async def campaign_ads(
    campaign_id: str,
    days: int = Query(30, ge=1, le=365),
    since: str = Query(None),
    until: str = Query(None),
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    ad_account_id, token, _, campaign_filter, _ = resolve_account(client, account_id, db)
    all_ads = await get_ad_insights(
        ad_account_id, token,
        days, since=since, until=until,
    )
    ads = [a for a in all_ads if a.get("campaign_id") == campaign_id]
    result = []
    for a in ads:
        spend       = float(a.get("spend", 0) or 0)
        impressions = float(a.get("impressions", 0) or 0)
        reach       = float(a.get("reach", 0) or 0)
        conv        = extract_conversions(a.get("actions", []))
        roas        = compute_roas_hibrido(
            spend, conv,
            a.get("purchase_roas"),
            client.ticket_promedio,
            client.tasa_cierre,
        )
        result.append({
            "id":            a.get("ad_id"),
            "nombre":        a.get("ad_name"),
            "adset_id":      a.get("adset_id"),
            "gasto":         spend,
            "impresiones":   int(impressions),
            "ctr":           round(float(a.get("ctr", 0) or 0), 2),
            "cpc":           round(float(a.get("cpc", 0) or 0), 2),
            "frecuencia":    round(float(a.get("frequency", 0) or 0), 2),
            "conversaciones": conv,
            "cpa":           compute_cpa(spend, conv),
            "roas":          roas,
            "ftir":          compute_ftir(reach, impressions),
        })
    return result


@router.get("/tree")
async def campaign_tree(
    days: int = Query(30),
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    """Devuelve jerarquía completa Campaña → AdSet → Ad con insights."""
    _, _, _, _, account = resolve_account(client, None, db)
    try:
        tree = await get_hierarchy_tree(account.meta_ad_account_id, account.meta_access_token, days)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Meta API: {str(e)}")
    return {"tree": tree, "days": days}


@router.post("/{campaign_id}/pause")
async def pause_campaign_endpoint(
    campaign_id: str,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """Pausa una campaña. Acción reversible."""
    if client.meta_access_token == "DEMO":
        result = {"success": True}
    else:
        try:
            result = await pause_campaign(campaign_id, client.meta_access_token)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Error Meta API: {str(e)}")

    log = ActionLog(
        client_id=client.id,
        tipo="pause_campaign",
        descripcion=f"Campaña {campaign_id} pausada desde dashboard",
        meta_id=campaign_id,
        resultado="ok",
    )
    db.add(log)
    db.commit()
    return {"ok": True, "meta_response": result}


@router.post("/ads/{ad_id}/pause")
async def pause_ad_endpoint(
    ad_id: str,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """Pausa un anuncio específico. Acción reversible."""
    if client.meta_access_token == "DEMO":
        result = {"success": True}
    else:
        try:
            result = await pause_ad(ad_id, client.meta_access_token)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Error Meta API: {str(e)}")

    log = ActionLog(
        client_id=client.id,
        tipo="pause_ad",
        descripcion=f"Anuncio {ad_id} pausado desde dashboard",
        meta_id=ad_id,
        resultado="ok",
    )
    db.add(log)
    db.commit()
    return {"ok": True, "meta_response": result}


class CreateCampaignRequest(BaseModel):
    nombre: str
    objetivo: str = "MESSAGES"
    presupuesto_diario: int  # en ARS enteros


@router.post("/draft")
async def create_draft(
    body: CreateCampaignRequest,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """
    Crea una campaña en Meta en estado PAUSED.
    El usuario la activa manualmente desde Meta Ads Manager.
    """
    if client.meta_access_token == "DEMO":
        import uuid
        result = {"id": f"demo_draft_{uuid.uuid4().hex[:8]}"}
    else:
        try:
            result = await create_campaign_draft(
                client.meta_ad_account_id,
                client.meta_access_token,
                body.nombre,
                body.objetivo,
                body.presupuesto_diario,
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Error Meta API: {str(e)}")

    log = ActionLog(
        client_id=client.id,
        tipo="create_campaign",
        descripcion=f"Campaña '{body.nombre}' creada en borrador (PAUSED)",
        meta_id=result.get("id"),
        resultado="ok",
    )
    db.add(log)
    db.commit()
    return {
        "ok": True,
        "campaign_id": result.get("id"),
        "estado": "PAUSED",
        "mensaje": "Campaña creada en Meta en estado pausado. Activala desde Meta Ads Manager.",
    }
