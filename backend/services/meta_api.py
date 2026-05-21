import asyncio
import httpx
import json
from datetime import datetime, timedelta
from typing import Optional
from services.demo_data import demo_get

META_BASE = "https://graph.facebook.com/v19.0"


async def meta_get(path: str, params: dict, token: str) -> dict:
    params["access_token"] = token
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{META_BASE}/{path}", params=params)
        r.raise_for_status()
        return r.json()


async def meta_post(path: str, data: dict, token: str) -> dict:
    data["access_token"] = token
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(f"{META_BASE}/{path}", data=data)
        r.raise_for_status()
        return r.json()


def date_range(days: int = None, since: str = None, until: str = None) -> dict:
    """Acepta días relativos O rango explícito since/until (YYYY-MM-DD)."""
    if since and until:
        return {"since": since, "until": until}
    now_ar = datetime.utcnow() - timedelta(hours=3)
    today_str = now_ar.strftime("%Y-%m-%d")
    if days == 1:
        return {"since": today_str, "until": today_str}
    since_str = (now_ar - timedelta(days=(days or 30) - 1)).strftime("%Y-%m-%d")
    return {"since": since_str, "until": today_str}


async def get_campaigns(account_id: str, token: str) -> list:
    data = await meta_get(
        f"{account_id}/campaigns",
        {
            "fields": "id,name,objective,status,daily_budget,lifetime_budget",
            "effective_status": json.dumps(["ACTIVE", "PAUSED"]),
            "limit": "50",
        },
        token,
    )
    return data.get("data", [])


async def get_campaign_insights(account_id: str, token: str, days: int = 30, since: str = None, until: str = None) -> list:
    if token == "DEMO":
        return demo_get("campaigns", account_id)
    data = await meta_get(
        f"{account_id}/insights",
        {
            "fields": "campaign_id,campaign_name,objective,spend,impressions,reach,clicks,ctr,cpc,frequency,purchase_roas,actions",
            "level": "campaign",
            "time_range": json.dumps(date_range(days, since, until)),
            "filtering": json.dumps([{"field": "spend", "operator": "GREATER_THAN", "value": "0"}]),
            "limit": "50",
        },
        token,
    )
    return data.get("data", [])


async def get_ad_insights(account_id: str, token: str, days: int = 30, since: str = None, until: str = None) -> list:
    if token == "DEMO":
        return demo_get("ads", account_id)
    data = await meta_get(
        f"{account_id}/insights",
        {
            "fields": "ad_id,ad_name,campaign_id,campaign_name,adset_id,spend,impressions,reach,clicks,ctr,cpc,frequency,purchase_roas,actions,date_start,date_stop",
            "level": "ad",
            "time_range": json.dumps(date_range(days, since, until)),
            "filtering": json.dumps([{"field": "spend", "operator": "GREATER_THAN", "value": "0"}]),
            "limit": "200",
        },
        token,
    )
    return data.get("data", [])


async def get_ad_thumbnails(account_id: str, token: str) -> dict:
    """Devuelve {ad_id: thumbnail_url} para mostrar imagen del creativo."""
    if token == "DEMO":
        return {}
    try:
        data = await meta_get(
            f"{account_id}/ads",
            {
                "fields": "id,creative{image_url,thumbnail_url,object_story_spec}",
                "effective_status": json.dumps(["ACTIVE", "PAUSED", "ARCHIVED"]),
                "limit": "500",
            },
            token,
        )
        result = {}
        for a in data.get("data", []):
            cr = a.get("creative") or {}
            # image_url es la imagen en alta resolución; thumbnail_url es pequeña
            url = cr.get("image_url") or cr.get("thumbnail_url")
            # Para video ads, buscar la imagen de la historia
            if not url:
                story = cr.get("object_story_spec") or {}
                url = (story.get("video_data") or {}).get("image_url")
            if url:
                result[a["id"]] = url
        return result
    except Exception:
        return {}


async def get_ad_created_dates(account_id: str, token: str) -> dict:
    """Devuelve {ad_id: created_time} para calcular antigüedad real del anuncio."""
    if token == "DEMO":
        return demo_get("created", account_id)
    try:
        data = await meta_get(
            f"{account_id}/ads",
            {
                "fields": "id,created_time",
                "effective_status": json.dumps(["ACTIVE", "PAUSED", "ARCHIVED"]),
                "limit": "500",
            },
            token,
        )
        return {a["id"]: a.get("created_time", "") for a in data.get("data", [])}
    except Exception:
        return {}


async def get_account_insights(account_id: str, token: str, days: int = 30) -> dict:
    if token == "DEMO":
        return demo_get("insights", account_id)
    data = await meta_get(
        f"{account_id}/insights",
        {
            "fields": "spend,impressions,reach,clicks,ctr,cpc,frequency,actions",
            "time_range": json.dumps(date_range(days)),
        },
        token,
    )
    rows = data.get("data", [])
    return rows[0] if rows else {}


async def pause_ad(ad_id: str, token: str) -> dict:
    """Pausa un anuncio. Acción reversible — no borra nada."""
    return await meta_post(ad_id, {"status": "PAUSED"}, token)


async def pause_campaign(campaign_id: str, token: str) -> dict:
    return await meta_post(campaign_id, {"status": "PAUSED"}, token)


async def get_saved_audiences(account_id: str, token: str) -> list:
    """Retorna audiencias guardadas de la cuenta."""
    try:
        data = await meta_get(
            f"{account_id}/saved_audiences",
            {"fields": "id,name,approximate_count_lower_bound", "limit": "50"},
            token,
        )
        return data.get("data", [])
    except Exception:
        return []


async def get_ad_images(account_id: str, token: str) -> list:
    """Retorna imágenes de la biblioteca de la cuenta."""
    try:
        data = await meta_get(
            f"{account_id}/adimages",
            {"fields": "hash,name,url,url_128", "limit": "50"},
            token,
        )
        return data.get("data", [])
    except Exception:
        return []


async def get_whatsapp_numbers(page_id: str, token: str) -> list:
    """
    Retorna números de WhatsApp de la página.
    Primero intenta el campo whatsapp_number de la página;
    si falla o no tiene, intenta whatsapp_business_phones.
    """
    try:
        page = await meta_get(
            page_id,
            {"fields": "id,name,whatsapp_number"},
            token,
        )
        wa = page.get("whatsapp_number")
        if wa:
            name = page.get("name", "Página")
            digits = "".join(c for c in wa if c.isdigit())
            return [{"display_phone_number": wa, "verified_name": name, "digits": digits}]
    except Exception:
        pass
    try:
        data = await meta_get(
            f"{page_id}/whatsapp_business_phones",
            {"fields": "display_phone_number,verified_name"},
            token,
        )
        return data.get("data", [])
    except Exception:
        return []


async def create_adset(
    account_id: str,
    token: str,
    campaign_id: str,
    name: str,
    daily_budget: int,
    optimization_goal: str,
    billing_event: str,
    targeting: dict,
    destination_type: str,
    page_id: str = None,
    start_time: str = None,
    end_time: str = None,
) -> dict:
    """
    Crea un conjunto de anuncios.
    targeting puede ser {} para Advantage+ o un dict con age_min, age_max,
    geo_locations, flexible_spec (intereses), custom_audiences (públicos guardados).
    """
    # Con CBO el presupuesto va en la campaña; el adset no lleva daily_budget
    t = targeting if targeting else {"age_min": 18, "age_max": 65, "geo_locations": {"countries": ["AR"]}}
    body: dict = {
        "name": name,
        "campaign_id": campaign_id,
        "optimization_goal": optimization_goal,
        "billing_event": billing_event,
        "targeting": t,
        "destination_type": destination_type,
        "status": "PAUSED",
    }
    if page_id:
        body["promoted_object"] = {"page_id": page_id}
    if start_time:
        body["start_time"] = start_time
    if end_time:
        body["end_time"] = end_time

    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            f"{META_BASE}/{account_id}/adsets",
            params={"access_token": token},
            json=body,
        )
        r.raise_for_status()
        return r.json()


async def create_ad_creative(
    account_id: str,
    token: str,
    name: str,
    page_id: str,
    image_hash: str = None,
    image_url: str = None,
    message: str = "",
    headline: str = "",
    description: str = "",
    call_to_action_type: str = "MESSAGE_PAGE",
    link_url: str = None,
    whatsapp_number: str = None,
) -> dict:
    """Crea el creativo del anuncio."""
    if link_url:
        link = link_url
    elif whatsapp_number:
        link = f"https://wa.me/{whatsapp_number}"
    else:
        link = f"https://www.facebook.com/{page_id}"

    object_story_spec = {
        "page_id": page_id,
        "link_story_spec": {
            "link": link,
            "message": message,
            "name": headline,
            "description": description,
            "call_to_action": {"type": call_to_action_type},
        }
    }
    if image_hash:
        object_story_spec["link_story_spec"]["image_hash"] = image_hash

    return await meta_post(
        f"{account_id}/adcreatives",
        {"name": name, "object_story_spec": json.dumps(object_story_spec)},
        token,
    )


async def create_ad(
    account_id: str,
    token: str,
    adset_id: str,
    creative_id: str,
    name: str,
) -> dict:
    """Crea el anuncio vinculando adset y creativo."""
    return await meta_post(
        f"{account_id}/ads",
        {
            "name": name,
            "adset_id": adset_id,
            "creative": json.dumps({"creative_id": creative_id}),
            "status": "PAUSED",
        },
        token,
    )


async def create_campaign_draft(account_id: str, token: str, name: str, objective: str, daily_budget: int) -> dict:
    """
    Crea una campaña en estado PAUSED con CBO (Campaign Budget Optimization).
    El presupuesto se gestiona a nivel campaña; los adsets no llevan daily_budget propio.
    """
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            f"{META_BASE}/{account_id}/campaigns",
            params={"access_token": token},
            json={
                "name": name,
                "objective": objective,
                "status": "PAUSED",
                "special_ad_categories": [],
                "daily_budget": daily_budget * 100,  # Meta usa centavos
                "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
            },
        )
        r.raise_for_status()
        return r.json()


CONVERSION_TYPES = {
    "onsite_conversion.messaging_conversation_started_7d",  # WhatsApp principal
    "onsite_conversion.total_messaging_connection",          # Mensajes totales
    "lead",                                                  # Leads de formulario
    "onsite_web_lead",                                       # Leads web
    "omni_initiated_checkout",                               # Checkout
}

def extract_conversions(actions: list) -> int:
    """
    Extrae la conversión más relevante del anuncio.
    Prioriza WhatsApp conversations; si no hay, busca leads de formulario.
    """
    if not actions:
        return 0
    # Prioridad 1: conversación iniciada WhatsApp
    for a in actions:
        if a.get("action_type") == "onsite_conversion.messaging_conversation_started_7d":
            return int(float(a.get("value", 0)))
    # Prioridad 2: leads de formulario / web
    for a in actions:
        if a.get("action_type") in ("lead", "onsite_web_lead"):
            return int(float(a.get("value", 0)))
    return 0


def compute_cpa(spend: float, conversions: int) -> Optional[float]:
    if conversions == 0:
        return None
    return round(spend / conversions, 2)


async def get_adset_insights(account_id: str, token: str, days: int = 30) -> list:
    """Insights al nivel adset: una fila por conjunto de anuncios."""
    if token == "DEMO":
        return []
    data = await meta_get(
        f"{account_id}/insights",
        {
            "fields": "adset_id,adset_name,campaign_id,campaign_name,spend,impressions,reach,clicks,ctr,cpc,frequency,actions",
            "level": "adset",
            "time_range": json.dumps(date_range(days)),
            "filtering": json.dumps([{"field": "spend", "operator": "GREATER_THAN", "value": "0"}]),
            "limit": "200",
        },
        token,
    )
    return data.get("data", [])


async def get_hierarchy_tree(account_id: str, token: str, days: int = 30) -> list:
    """
    Devuelve lista de campañas, cada una con sus adsets, cada adset con sus ads.
    [{
        campaign_id, campaign_name, objective, spend, ctr, cpa, conversiones, estado, n_adsets, n_ads,
        adsets: [{
            adset_id, adset_name, spend, ctr, cpa, conversiones, frecuencia, estado,
            ads: [{ad_id, ad_name, spend, ctr, cpa, conversiones, frecuencia, estado}]
        }]
    }]
    """
    campaigns_raw, adsets_raw, ads_raw = await asyncio.gather(
        get_campaign_insights(account_id, token, days),
        get_adset_insights(account_id, token, days),
        get_ad_insights(account_id, token, days),
    )

    def compute_cpa(spend, conv):
        try:
            s = float(spend or 0)
            return round(s / conv, 2) if conv > 0 else None
        except Exception:
            return None

    def semaforo(cpa, freq, ctr):
        if cpa is not None and cpa > 900:
            return "rojo"
        if freq is not None and freq > 3.0:
            return "rojo"
        if ctr is not None and float(ctr or 0) < 0.5:
            return "amarillo"
        if cpa is not None and cpa < 500:
            return "verde"
        return "amarillo"

    # Indexar ads por adset_id
    ads_by_adset: dict = {}
    for ad in ads_raw:
        aid = ad.get("adset_id")
        if not aid:
            continue
        conv = extract_conversions(ad.get("actions"))
        spend = float(ad.get("spend", 0))
        ctr = float(ad.get("ctr", 0))
        freq = float(ad.get("frequency", 0))
        cpa = compute_cpa(spend, conv)
        ads_by_adset.setdefault(aid, []).append({
            "ad_id": ad.get("ad_id"),
            "ad_name": ad.get("ad_name"),
            "spend": spend,
            "ctr": round(ctr, 2),
            "cpa": cpa,
            "conversiones": conv,
            "frecuencia": round(freq, 2),
            "estado": semaforo(cpa, freq, ctr),
        })

    # Indexar adsets por campaign_id
    adsets_by_campaign: dict = {}
    for adset in adsets_raw:
        cid = adset.get("campaign_id")
        if not cid:
            continue
        aid = adset.get("adset_id")
        conv = extract_conversions(adset.get("actions"))
        spend = float(adset.get("spend", 0))
        ctr = float(adset.get("ctr", 0))
        freq = float(adset.get("frequency", 0))
        impressions_a = float(adset.get("impressions", 0))
        reach_a = float(adset.get("reach", 0))
        ftir_a = round(reach_a / impressions_a * 100, 1) if impressions_a > 0 else None
        cpa = compute_cpa(spend, conv)
        adsets_by_campaign.setdefault(cid, []).append({
            "adset_id": aid,
            "adset_name": adset.get("adset_name"),
            "spend": spend,
            "ctr": round(ctr, 2),
            "cpa": cpa,
            "conversiones": conv,
            "frecuencia": round(freq, 2),
            "ftir": ftir_a,
            "estado": semaforo(cpa, freq, ctr),
            "ads": ads_by_adset.get(aid, []),
        })

    # Armar árbol de campañas
    tree = []
    for c in campaigns_raw:
        cid = c.get("campaign_id")
        conv = extract_conversions(c.get("actions"))
        spend = float(c.get("spend", 0))
        ctr = float(c.get("ctr", 0))
        freq = float(c.get("frequency", 0))
        impressions = float(c.get("impressions", 0))
        reach = float(c.get("reach", 0))
        ftir = round((reach / impressions * 100), 1) if impressions > 0 else None
        cpa = compute_cpa(spend, conv)
        adsets = adsets_by_campaign.get(cid, [])
        tree.append({
            "campaign_id": cid,
            "campaign_name": c.get("campaign_name"),
            "objective": c.get("objective"),
            "spend": spend,
            "ctr": round(ctr, 2),
            "frecuencia": round(freq, 2),
            "ftir": ftir,
            "cpa": cpa,
            "conversiones": conv,
            "estado": semaforo(cpa, freq, ctr),
            "n_adsets": len(adsets),
            "n_ads": sum(len(a["ads"]) for a in adsets),
            "adsets": adsets,
        })

    tree.sort(key=lambda c: c["spend"], reverse=True)
    return tree
