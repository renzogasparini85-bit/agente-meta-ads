from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import Client, get_db
from auth import get_current_client
from services.meta_api import meta_get, extract_conversions, compute_cpa
from services.demo_data import demo_history
from routers.account_resolver import resolve_account
import json
from datetime import datetime, timedelta

router = APIRouter(prefix="/history", tags=["history"])


@router.get("")
async def history(
    days:       int = Query(30, ge=1, le=365),
    since:      str = Query(None),
    until:      str = Query(None),
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    ad_account_id, token, _, campaign_filter, _ = resolve_account(client, account_id, db)

    if token == "DEMO":
        return demo_history(ad_account_id, days=days, since=since, until=until)

    if since and until:
        since_str, until_str = since, until
    else:
        today = datetime.utcnow()
        until_str = today.strftime("%Y-%m-%d")
        since_str = (today - timedelta(days=days - 1)).strftime("%Y-%m-%d")

    time_range = json.dumps({"since": since_str, "until": until_str})

    # Con filtro: traer por campaña y agregar por día
    if campaign_filter:
        data = await meta_get(
            f"{ad_account_id}/insights",
            {
                "fields": "campaign_name,spend,impressions,ctr,frequency,actions",
                "time_increment": "1",
                "level": "campaign",
                "time_range": time_range,
                "limit": "500",
            },
            token,
        )
        # Agrupar por fecha sumando solo campañas que matchean
        by_date = {}
        for d in data.get("data", []):
            if campaign_filter.lower() not in (d.get("campaign_name") or "").lower():
                continue
            fecha = d.get("date_start")
            if fecha not in by_date:
                by_date[fecha] = {"spend": 0, "conv": 0, "impr": 0, "clicks": 0, "freq_sum": 0, "n": 0}
            by_date[fecha]["spend"]    += float(d.get("spend", 0) or 0)
            by_date[fecha]["conv"]     += extract_conversions(d.get("actions", []))
            by_date[fecha]["impr"]     += float(d.get("impressions", 0) or 0)
            by_date[fecha]["freq_sum"] += float(d.get("frequency", 0) or 0)
            by_date[fecha]["n"]        += 1

        rows = []
        for fecha in sorted(by_date):
            v = by_date[fecha]
            spend = v["spend"]
            conv  = v["conv"]
            impr  = v["impr"]
            ctr   = round((v["clicks"] / impr * 100) if impr else 0, 2)
            freq  = round(v["freq_sum"] / max(v["n"], 1), 2)
            rows.append({
                "fecha": fecha, "gasto": round(spend, 2),
                "conversaciones": conv, "cpa": compute_cpa(spend, conv),
                "ctr": ctr, "frecuencia": freq,
            })
        return rows

    # Sin filtro: datos a nivel de cuenta
    data = await meta_get(
        f"{ad_account_id}/insights",
        {
            "fields": "spend,impressions,ctr,frequency,actions",
            "time_increment": "1",
            "time_range": time_range,
        },
        token,
    )

    rows = []
    for d in data.get("data", []):
        spend = float(d.get("spend", 0) or 0)
        conv  = extract_conversions(d.get("actions", []))
        rows.append({
            "fecha":          d.get("date_start"),
            "gasto":          round(spend, 2),
            "conversaciones": conv,
            "cpa":            compute_cpa(spend, conv),
            "ctr":            round(float(d.get("ctr", 0) or 0), 2),
            "frecuencia":     round(float(d.get("frequency", 0) or 0), 2),
        })
    return rows
