from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from database import Client, AdAccount, get_db
from auth import get_current_client
from routers.account_resolver import resolve_account
from routers.ad_accounts import normalize_meta_social_id
from services.demo_organic import demo_organic
from services.meta_api import meta_get
import json
from datetime import datetime, timedelta

router = APIRouter(prefix="/organic", tags=["organic"])

# ─── Helpers de clasificación ────────────────────────────────────────────────

def _badge(eng: float) -> str:
    if eng >= 8:  return "ganador"
    if eng >= 4:  return "bueno"
    if eng >= 2:  return "normal"
    return "bajo"


def _classify_format_fb(post: dict) -> str:
    att  = post.get("attachments", {})
    data = att.get("data", [{}])[0] if att else {}
    t    = data.get("type", "")
    if "video" in t or "reel" in t.lower():
        return "reel"
    if t == "album":
        return "carrusel"
    return "imagen"


def _classify_format_ig(media: dict) -> str:
    mt = media.get("media_type", "")
    if mt == "VIDEO":
        return "reel" if media.get("media_product_type") == "REELS" else "reel"
    if mt == "CAROUSEL_ALBUM":
        return "carrusel"
    return "imagen"


# ─── Fetch Facebook Page posts ───────────────────────────────────────────────

async def _fetch_fb_posts(page_id: str, token: str, since_str: str, until_str: str) -> list:
    try:
        data = await meta_get(
            f"{page_id}/posts",
            {
                "fields": "id,message,story,created_time,full_picture,attachments,"
                          "insights.metric(post_impressions,post_impressions_unique,"
                          "post_reactions_by_type_total,post_activity_by_action_type,post_video_views)",
                "since": since_str,
                "until": until_str,
                "limit": "50",
            },
            token,
        )
    except Exception as e:
        print(f"[organic] FB error page={page_id}: {e}")
        return []

    posts = []
    for p in data.get("data", []):
        ins_raw = p.get("insights", {}).get("data", [])
        ins     = {i["name"]: i.get("values", [{}])[0].get("value", 0) for i in ins_raw}

        reach       = ins.get("post_impressions_unique", 0) or 0
        impressions = ins.get("post_impressions", 0)        or 0
        reactions   = ins.get("post_reactions_by_type_total", {})
        activity    = ins.get("post_activity_by_action_type", {})
        plays       = ins.get("post_video_views")

        likes    = sum(reactions.values()) if isinstance(reactions, dict) else 0
        comments = (activity.get("comment", 0) if isinstance(activity, dict) else 0)
        shares   = (activity.get("share",   0) if isinstance(activity, dict) else 0)
        eng      = round((likes + comments + shares) / max(reach, 1) * 100, 2) if reach else 0
        fmt      = _classify_format_fb(p)

        # Imagen del post: full_picture o primer attachment
        att_data = (p.get("attachments") or {}).get("data", [{}])
        att_img  = (att_data[0] if att_data else {}).get("media", {}).get("image", {}).get("src")
        thumb    = p.get("full_picture") or att_img or None

        posts.append({
            "id":               p.get("id"),
            "plataforma":       "facebook",
            "formato":          fmt,
            "tema":             ((p.get("message") or p.get("story") or "")[:80]),
            "caption":          p.get("message") or "",
            "fecha":            (p.get("created_time") or "")[:10],
            "hora":             (p.get("created_time") or "T00:00")[11:16],
            "reach":            int(reach),
            "impressions":      int(impressions),
            "likes":            int(likes),
            "comments":         int(comments),
            "shares":           int(shares),
            "saves":            0,
            "plays":            int(plays) if plays else None,
            "engagement_rate":  eng,
            "badge":            _badge(eng),
            "thumbnail":        thumb,
        })
    return posts


# ─── Fetch Instagram posts ───────────────────────────────────────────────────

async def _get_page_token(page_id: str, user_token: str) -> str:
    """Obtiene el Page Access Token a partir del User Token."""
    try:
        data = await meta_get(page_id, {"fields": "access_token"}, user_token)
        return data.get("access_token", user_token)
    except Exception:
        return user_token


async def _fetch_ig_posts(ig_id: str, token: str, since_str: str, until_str: str, page_id: str = None) -> list:
    # Obtener followers para calcular engagement
    followers = 0
    try:
        info = await meta_get(ig_id, {"fields": "followers_count"}, token)
        followers = int(info.get("followers_count", 0) or 0)
    except Exception:
        pass

    # Traer posts con métricas básicas (sin insights — requieren App Review)
    try:
        data = await meta_get(
            f"{ig_id}/media",
            {
                "fields": "id,caption,media_type,media_product_type,timestamp,like_count,comments_count,media_url,thumbnail_url",
                "since": since_str,
                "until": until_str,
                "limit": "50",
            },
            token,
        )
    except Exception as e:
        print(f"[organic] IG error ig_id={ig_id}: {e}")
        return []

    posts = []
    for m in data.get("data", []):
        # Filtrar por rango de fechas (la API de media no filtra exactamente)
        fecha_str = (m.get("timestamp") or "")[:10]
        if fecha_str < since_str or fecha_str > until_str:
            continue

        likes    = int(m.get("like_count", 0) or 0)
        comments = int(m.get("comments_count", 0) or 0)
        # Engagement sobre seguidores (sin reach disponible sin App Review)
        eng = round((likes + comments) / max(followers, 1) * 100, 2) if followers else 0
        fmt = _classify_format_ig(m)

        thumb = m.get("thumbnail_url") or m.get("media_url") or None
        posts.append({
            "id":              m.get("id"),
            "plataforma":      "instagram",
            "formato":         fmt,
            "tema":            ((m.get("caption") or "")[:80]),
            "caption":         m.get("caption") or "",
            "fecha":           fecha_str,
            "hora":            (m.get("timestamp") or "T00:00")[11:16],
            "reach":           followers,
            "impressions":     0,
            "likes":           likes,
            "comments":        comments,
            "shares":          0,
            "saves":           0,
            "plays":           None,
            "engagement_rate": eng,
            "badge":           _badge(eng),
            "thumbnail":       thumb,
        })
    return posts


# ─── Endpoint principal ──────────────────────────────────────────────────────

@router.get("/posts")
async def organic_posts(
    days:        int = Query(30, ge=1, le=365),
    since:       str = Query(None),
    until:       str = Query(None),
    account_id:  str = Query(None),
    formato:     str = Query(None),
    plataforma:  str = Query(None),   # instagram | facebook | None = ambas
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    ad_account_id, token, _, campaign_filter, acc_obj = resolve_account(client, account_id, db)

    # ── DEMO ──
    if token == "DEMO":
        posts = demo_organic(ad_account_id, days=days, since=since, until=until, formato=formato)
        if plataforma and plataforma != "todas":
            posts = [p for p in posts if p.get("plataforma") == plataforma]
        return _summary(posts)

    # ── REAL: usar el acc_obj ya resuelto ──
    page_id = getattr(acc_obj, "meta_page_id", None) if acc_obj else None
    ig_id   = getattr(acc_obj, "meta_ig_account_id", None) if acc_obj else None

    if not page_id and not ig_id:
        raise HTTPException(
            status_code=422,
            detail="Configurá el ID de Página de Facebook y/o cuenta de Instagram en Ajustes → Cuentas.",
        )

    # Calcular rango de fechas
    if since and until:
        since_str, until_str = since, until
    else:
        today     = datetime.utcnow()
        until_str = today.strftime("%Y-%m-%d")
        since_str = (today - timedelta(days=days - 1)).strftime("%Y-%m-%d")

    # Fetch ambas plataformas en paralelo
    import asyncio
    print(f"[organic] fetching page_id={page_id} ig_id={ig_id} since={since_str} until={until_str}")
    async def _empty(): return []
    fb_task = _fetch_fb_posts(page_id, token, since_str, until_str) if page_id and plataforma != "instagram" else _empty()
    ig_task = _fetch_ig_posts(ig_id, token, since_str, until_str, page_id=page_id) if ig_id and plataforma != "facebook" else _empty()


    fb_posts, ig_posts = await asyncio.gather(fb_task, ig_task)
    print(f"[organic] fb_posts={len(fb_posts)} ig_posts={len(ig_posts)}")
    posts = fb_posts + ig_posts

    if formato and formato != "todos":
        posts = [p for p in posts if p["formato"] == formato]

    posts.sort(key=lambda p: p["fecha"], reverse=True)
    return _summary(posts)


# ─── Endpoint para IDs de página/IG (para el formulario de Ajustes) ──────────

@router.put("/config")
async def save_organic_config(
    page_id:    str = Query(None),
    ig_id:      str = Query(None),
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    ad_account_id, _, __, campaign_filter_org, _acc = resolve_account(client, account_id, db)
    acc = db.query(AdAccount).filter(
        AdAccount.client_id == client.id,
        AdAccount.meta_ad_account_id == ad_account_id,
    ).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    if page_id: acc.meta_page_id       = normalize_meta_social_id(page_id)
    if ig_id:   acc.meta_ig_account_id = normalize_meta_social_id(ig_id)
    db.commit()
    return {"ok": True}


# ─── Summary ─────────────────────────────────────────────────────────────────

def _summary(posts: list) -> dict:
    if not posts:
        return {"posts": [], "resumen": {}, "ganadores": [], "por_formato": {}, "por_plataforma": {}}

    total_reach    = sum(p["reach"]    for p in posts)
    total_likes    = sum(p["likes"]    for p in posts)
    total_comments = sum(p["comments"] for p in posts)
    total_shares   = sum(p["shares"]   for p in posts)
    total_saves    = sum(p["saves"]    for p in posts)
    avg_eng        = round(sum(p["engagement_rate"] for p in posts) / len(posts), 2)
    best_reach     = max(posts, key=lambda p: p["reach"])
    best_eng       = max(posts, key=lambda p: p["engagement_rate"])

    ganadores = sorted(
        [p for p in posts if p["badge"] == "ganador"],
        key=lambda p: p["engagement_rate"], reverse=True
    )

    # Agrupación por formato
    por_formato: dict = {}
    for p in posts:
        f = p["formato"]
        if f not in por_formato:
            por_formato[f] = {"count": 0, "total_reach": 0, "total_eng": 0.0}
        por_formato[f]["count"]       += 1
        por_formato[f]["total_reach"] += p["reach"]
        por_formato[f]["total_eng"]   += p["engagement_rate"]
    for v in por_formato.values():
        v["avg_reach"] = round(v["total_reach"] / v["count"])
        v["avg_eng"]   = round(v["total_eng"]   / v["count"], 2)

    # Agrupación por plataforma
    por_plataforma: dict = {}
    for p in posts:
        pl = p.get("plataforma", "facebook")
        if pl not in por_plataforma:
            por_plataforma[pl] = {"count": 0, "total_reach": 0, "total_eng": 0.0, "total_likes": 0, "total_saves": 0}
        por_plataforma[pl]["count"]       += 1
        por_plataforma[pl]["total_reach"] += p["reach"]
        por_plataforma[pl]["total_eng"]   += p["engagement_rate"]
        por_plataforma[pl]["total_likes"] += p["likes"]
        por_plataforma[pl]["total_saves"] += p.get("saves", 0)
    for v in por_plataforma.values():
        v["avg_reach"] = round(v["total_reach"] / v["count"])
        v["avg_eng"]   = round(v["total_eng"]   / v["count"], 2)

    return {
        "posts": posts,
        "resumen": {
            "total_posts":    len(posts),
            "total_reach":    total_reach,
            "total_likes":    total_likes,
            "total_comments": total_comments,
            "total_shares":   total_shares,
            "total_saves":    total_saves,
            "avg_engagement": avg_eng,
            "mejor_alcance":  best_reach["tema"],
            "mejor_eng":      best_eng["tema"],
        },
        "ganadores":       ganadores[:6],
        "por_formato":     por_formato,
        "por_plataforma":  por_plataforma,
    }
