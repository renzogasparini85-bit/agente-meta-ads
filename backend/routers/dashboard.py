import httpx
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Client
from auth import get_current_client
from services.meta_api import get_account_insights, get_campaign_insights, extract_conversions, compute_cpa
from services.meta_objectives import label_objetivo
from routers.account_resolver import resolve_account

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _meta_error_detail(exc: Exception) -> str:
    if isinstance(exc, httpx.HTTPStatusError):
        try:
            meta_err = exc.response.json().get("error", {})
            return meta_err.get("error_user_msg") or meta_err.get("message") or str(exc)
        except Exception:
            return str(exc)
    return str(exc)


@router.get("/overview")
async def overview(
    days: int = Query(30, ge=1, le=90),
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    ad_account_id, token, _, campaign_filter, _ = resolve_account(client, account_id, db)
    if not ad_account_id or not token or token == "DEMO":
        return {
            "periodo_dias": days,
            "meta_configured": False,
            "message": "Configurá META_ACCESS_TOKEN y META_AD_ACCOUNT_ID para ver métricas reales.",
            "kpis": {
                "gasto": {"value": 0, "change": None},
                "conversaciones": {"value": 0, "change": None},
                "cpa": {"value": None, "change": None},
                "ctr": {"value": 0, "change": None},
                "frecuencia": {"value": 0, "change": None},
            },
            "campaigns": [],
        }

    def safe_float(d, key):
        return float(d.get(key, 0) or 0)

    def pct_change(curr, prev):
        if prev == 0:
            return None
        return round(((curr - prev) / prev) * 100, 1)

    try:
        # Si hay filtro de cliente, agregamos métricas desde campañas filtradas
        if campaign_filter:
            curr_raw = await get_campaign_insights(ad_account_id, token, days)
            prev_raw = await get_campaign_insights(ad_account_id, token, days * 2)

            def agg(raw):
                f = [c for c in raw if campaign_filter.lower() in (c.get("campaign_name") or "").lower()]
                spend = sum(float(c.get("spend", 0) or 0) for c in f)
                conv  = sum(extract_conversions(c.get("actions", [])) for c in f)
                impr  = sum(float(c.get("impressions", 0) or 0) for c in f)
                clicks= sum(float(c.get("clicks", 0) or 0) for c in f)
                freq  = (sum(float(c.get("frequency", 0) or 0) for c in f) / max(len(f), 1))
                ctr   = (clicks / impr * 100) if impr else 0
                return {"spend": spend, "conv": conv, "ctr": ctr, "frequency": freq, "actions": []}

            cur = agg(curr_raw)
            prv = agg(prev_raw)
            spend       = cur["spend"]
            spend_prev  = max(prv["spend"] - spend, 0)
            conv        = cur["conv"]
            conv_prev   = max(prv["conv"] - conv, 0)
            ctr         = cur["ctr"]
            freq        = cur["frequency"]
            campaigns_raw_all = curr_raw
        else:
            current  = await get_account_insights(ad_account_id, token, days)
            previous = await get_account_insights(ad_account_id, token, days * 2)
            spend       = safe_float(current, "spend")
            spend_prev  = safe_float(previous, "spend") - spend
            ctr         = safe_float(current, "ctr")
            freq        = safe_float(current, "frequency")
            conv        = extract_conversions(current.get("actions", []))
            conv_prev_total = extract_conversions(previous.get("actions", []))
            conv_prev   = max(conv_prev_total - conv, 0)
            campaigns_raw_all = await get_campaign_insights(ad_account_id, token, days)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Meta API: {_meta_error_detail(e)}")

    cpa = compute_cpa(spend, conv)
    cpa_prev_val = compute_cpa(spend_prev, conv_prev)

    campaigns = []
    for c in campaigns_raw_all:
        if campaign_filter and campaign_filter.lower() not in (c.get("campaign_name") or "").lower():
            continue
        c_spend = float(c.get("spend", 0) or 0)
        c_conv = extract_conversions(c.get("actions", []))
        c_cpa = compute_cpa(c_spend, c_conv)
        c_ctr = float(c.get("ctr", 0) or 0)
        c_freq = float(c.get("frequency", 0) or 0)

        if c_freq > 3.0 or (c_cpa and c_cpa > client.cpa_pausar):
            estado = "rojo"
        elif c_freq > 2.5 or (c_cpa and c_cpa > client.cpa_replicar) or c_ctr < 1.0:
            estado = "amarillo"
        else:
            estado = "verde"

        campaigns.append({
            "id": c.get("campaign_id"),
            "nombre": c.get("campaign_name"),
            "objetivo": label_objetivo(c.get("objective", "")),
            "gasto": c_spend,
            "ctr": round(c_ctr, 2),
            "frecuencia": round(c_freq, 2),
            "conversaciones": c_conv,
            "cpa": c_cpa,
            "estado": estado,
        })

    return {
        "periodo_dias": days,
        "meta_configured": True,
        "kpis": {
            "gasto": {"value": spend, "change": pct_change(spend, spend_prev)},
            "conversaciones": {"value": conv, "change": pct_change(conv, conv_prev)},
            "cpa": {"value": cpa, "change": pct_change(cpa, cpa_prev_val) if cpa and cpa_prev_val else None},
            "ctr": {"value": round(ctr, 2), "change": None},
            "frecuencia": {"value": round(freq, 2), "change": None},
        },
        "campaigns": campaigns,
    }
