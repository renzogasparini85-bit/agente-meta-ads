"""
Endpoints de análisis avanzado:
  - GET /analytics/weekday  → rendimiento por día de la semana
  - GET /analytics/fatigue  → curva de fatiga por anuncio (CTR tendencia 7d vs 7d prev)
  - GET /analytics/organic-to-paid → posts orgánicos con potencial paid
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db, Client
from auth import get_current_client
from services.meta_api import (
    meta_get, get_ad_insights, get_ad_created_dates,
    extract_conversions, compute_cpa, date_range,
)
from routers.account_resolver import resolve_account
import asyncio, json

router = APIRouter(prefix="/analytics", tags=["analytics"])


# ── Día de la semana ──────────────────────────────────────────────────────────

@router.get("/weekday")
async def weekday_performance(
    days: int = Query(30, ge=7, le=90),
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    ad_account_id, token, _, campaign_filter, _ = resolve_account(client, account_id, db)

    if token == "DEMO":
        return _demo_weekday()

    try:
        tr = date_range(days)
        data = await meta_get(
            f"{ad_account_id}/insights",
            {
                "fields": "spend,impressions,clicks,actions,reach",
                "time_increment": "1",
                "time_range": json.dumps(tr),
                "level": "account",
                "limit": "200",
            },
            token,
        )
    except Exception as e:
        return {"error": str(e), "days": []}

    dias_semana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    buckets = {i: {"gasto": 0, "clicks": 0, "impr": 0, "conv": 0, "dias": 0} for i in range(7)}

    from datetime import datetime
    for row in data.get("data", []):
        try:
            fecha = datetime.strptime(row["date_start"], "%Y-%m-%d")
            dow = fecha.weekday()  # 0=Monday
        except Exception:
            continue

        if campaign_filter:
            pass  # account-level insights can't be filtered by campaign name here

        buckets[dow]["gasto"]  += float(row.get("spend", 0) or 0)
        buckets[dow]["clicks"] += float(row.get("clicks", 0) or 0)
        buckets[dow]["impr"]   += float(row.get("impressions", 0) or 0)
        buckets[dow]["conv"]   += extract_conversions(row.get("actions", []))
        buckets[dow]["dias"]   += 1

    result = []
    for i in range(7):
        b = buckets[i]
        n = max(b["dias"], 1)
        ctr = round((b["clicks"] / b["impr"] * 100), 2) if b["impr"] else 0
        cpa = compute_cpa(b["gasto"], b["conv"])
        result.append({
            "dia":          dias_semana[i],
            "dia_index":    i,
            "gasto_total":  round(b["gasto"], 2),
            "gasto_prom":   round(b["gasto"] / n, 2),
            "conversiones": b["conv"],
            "conv_prom":    round(b["conv"] / n, 2),
            "ctr":          ctr,
            "cpa":          cpa,
            "n_dias":       b["dias"],
        })

    return {"periodo_dias": days, "days": result}


def _demo_weekday():
    import random
    dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    base = [4200, 3800, 4500, 5100, 6200, 3100, 2400]
    conv = [8,     7,    9,    10,   13,   5,    4]
    return {"periodo_dias": 30, "days": [
        {"dia": d, "dia_index": i, "gasto_total": b*4, "gasto_prom": b,
         "conversiones": c*4, "conv_prom": c,
         "ctr": round(1.2 + random.uniform(0, 0.8), 2),
         "cpa": round(b / max(c, 1), 2), "n_dias": 4}
        for i, (d, b, c) in enumerate(zip(dias, base, conv))
    ]}


# ── Detector de fatiga creativa ───────────────────────────────────────────────

@router.get("/fatigue")
async def fatigue_detector(
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    ad_account_id, token, _, campaign_filter, _ = resolve_account(client, account_id, db)

    if token == "DEMO":
        return _demo_fatigue()

    # Traer últimos 7 días y los 7 días anteriores en paralelo
    recent_task  = get_ad_insights(ad_account_id, token, days=7)
    prev_task    = get_ad_insights(ad_account_id, token, days=14)
    created_task = get_ad_created_dates(ad_account_id, token)

    recent_raw, prev_raw, created_dates = await asyncio.gather(recent_task, prev_task, created_task)

    # Indexar por ad_id
    def index_by_ad(rows):
        out = {}
        for r in rows:
            ad_id = r.get("ad_id")
            if ad_id:
                out[ad_id] = r
        return out

    recent = index_by_ad(recent_raw)
    prev_all = index_by_ad(prev_raw)

    results = []
    for ad_id, r in recent.items():
        if campaign_filter:
            nombre_camp = (r.get("campaign_name") or r.get("ad_name") or "").lower()
            if campaign_filter.lower() not in nombre_camp:
                continue

        spend = float(r.get("spend", 0) or 0)
        if spend < 500:
            continue

        ctr_r = float(r.get("ctr", 0) or 0)
        freq_r = float(r.get("frequency", 0) or 0)
        conv_r = extract_conversions(r.get("actions", []))

        p = prev_all.get(ad_id, {})
        ctr_p = float(p.get("ctr", 0) or 0)

        if ctr_p > 0:
            ctr_drop = round(((ctr_r - ctr_p) / ctr_p) * 100, 1)
        else:
            ctr_drop = 0

        # Nivel de fatiga
        if ctr_drop <= -30 or freq_r >= 3.0:
            nivel = "critica"
        elif ctr_drop <= -15 or freq_r >= 2.2:
            nivel = "moderada"
        elif ctr_drop <= -5:
            nivel = "leve"
        else:
            nivel = "ok"

        from routers.creatives import dias_desde
        dias = dias_desde(created_dates.get(ad_id, ""))

        results.append({
            "ad_id":     ad_id,
            "nombre":    r.get("ad_name") or r.get("campaign_name") or ad_id,
            "ctr_actual": round(ctr_r, 2),
            "ctr_previo": round(ctr_p, 2),
            "ctr_variacion": ctr_drop,
            "frecuencia": round(freq_r, 2),
            "conversiones_7d": conv_r,
            "gasto_7d":  round(spend, 2),
            "dias_activo": dias,
            "nivel_fatiga": nivel,
        })

    results.sort(key=lambda x: {"critica": 0, "moderada": 1, "leve": 2, "ok": 3}.get(x["nivel_fatiga"], 4))
    return results


def _demo_fatigue():
    return [
        {"ad_id": "d1", "nombre": "CLIMASET | PROS | Problema Calor",
         "ctr_actual": 0.9, "ctr_previo": 1.8, "ctr_variacion": -50.0,
         "frecuencia": 3.2, "conversiones_7d": 2, "gasto_7d": 4200, "dias_activo": 45, "nivel_fatiga": "critica"},
        {"ad_id": "d2", "nombre": "CLIMASET | RET | Testimonio verano",
         "ctr_actual": 1.4, "ctr_previo": 1.7, "ctr_variacion": -17.6,
         "frecuencia": 2.4, "conversiones_7d": 5, "gasto_7d": 3800, "dias_activo": 22, "nivel_fatiga": "moderada"},
        {"ad_id": "d3", "nombre": "CLIMASET | PROS | Beneficio frio",
         "ctr_actual": 2.1, "ctr_previo": 2.0, "ctr_variacion": 5.0,
         "frecuencia": 1.6, "conversiones_7d": 9, "gasto_7d": 6100, "dias_activo": 12, "nivel_fatiga": "ok"},
    ]


# ── Cruce Orgánico → Paid ─────────────────────────────────────────────────────

@router.get("/organic-to-paid")
async def organic_to_paid(
    days: int = Query(30, ge=7, le=90),
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """
    Cruza el rendimiento orgánico con los creativos pagos actuales.
    Sugiere los mejores posts orgánicos para convertir en anuncios pagos.
    """
    from routers.organic import _fetch_ig_posts, _fetch_fb_posts, _get_page_token
    from routers.account_resolver import resolve_account as _ra

    ad_account_id, token, account_obj, campaign_filter, _ = resolve_account(client, account_id, db)

    if token == "DEMO":
        return _demo_organic_paid()

    page_id = getattr(account_obj, "meta_page_id", None) if account_obj else None
    ig_id   = getattr(account_obj, "meta_ig_account_id", None) if account_obj else None

    from datetime import datetime, timedelta
    now = datetime.utcnow() - timedelta(hours=3)
    until_str = now.strftime("%Y-%m-%d")
    since_str = (now - timedelta(days=days)).strftime("%Y-%m-%d")

    posts = []

    if ig_id:
        try:
            page_token = await _get_page_token(page_id, token) if page_id else token
            ig_posts = await _fetch_ig_posts(ig_id, page_token, since_str, until_str, page_id=page_id)
            posts.extend(ig_posts)
        except Exception:
            pass

    if page_id:
        try:
            page_token = await _get_page_token(page_id, token)
            fb_posts = await _fetch_fb_posts(page_id, page_token, since_str, until_str)
            posts.extend(fb_posts)
        except Exception:
            pass

    if not posts:
        return []

    # Obtener anuncios pagos activos para cruzar
    try:
        paid_raw = await get_ad_insights(ad_account_id, token, days)
    except Exception:
        paid_raw = []

    paid_names = {(a.get("ad_name") or "").lower() for a in paid_raw}

    # Calcular score de potencial paid para cada post orgánico
    avg_er = sum(p.get("engagement_rate", 0) for p in posts) / max(len(posts), 1)

    sugeridos = []
    for p in posts:
        er = p.get("engagement_rate", 0) or 0
        alcance = p.get("reach", 0) or p.get("impressions", 0) or 0
        likes = p.get("likes", 0) or 0
        caption = (p.get("caption") or p.get("message") or "")[:80]

        if er < avg_er * 0.8:
            continue  # Solo los que superan el promedio

        # Ángulo sugerido basado en contenido del caption
        angulo = _sugerir_angulo(caption, p.get("formato", "imagen"))

        # ¿Ya existe un paid similar?
        palabras = set(caption.lower().split()[:5])
        ya_existe = any(any(pal in pn for pal in palabras) for pn in paid_names)

        sugeridos.append({
            "post_id":    p.get("id"),
            "plataforma": p.get("plataforma", "instagram"),
            "formato":    p.get("formato", "imagen"),
            "thumbnail":  p.get("thumbnail"),
            "caption":    caption,
            "likes":      likes,
            "comentarios": p.get("comments", 0) or 0,
            "engagement_rate": round(er, 2),
            "er_vs_promedio": round(er - avg_er, 2),
            "angulo_sugerido": angulo,
            "ya_existe_paid": ya_existe,
            "potencial": "alto" if er > avg_er * 1.5 else "medio",
        })

    sugeridos.sort(key=lambda x: -x["engagement_rate"])
    return sugeridos[:10]


def _sugerir_angulo(caption: str, formato: str) -> str:
    c = caption.lower()
    if any(w in c for w in ["antes", "después", "cambio", "resultado"]):
        return "Antes vs. después"
    if any(w in c for w in ["cliente", "gracias", "experiencia", "reseña"]):
        return "Testimonio / caso real"
    if any(w in c for w in ["cómo", "guía", "tips", "pasos", "aprendé"]):
        return "Educativo"
    if any(w in c for w in ["oferta", "descuento", "promo", "%", "hoy"]):
        return "Oferta limitada"
    if any(w in c for w in ["problema", "solución", "cansado", "frustra"]):
        return "Problema → solución"
    if formato == "carrusel":
        return "Educativo"
    return "Beneficio directo"


def _demo_organic_paid():
    return [
        {"post_id": "o1", "plataforma": "instagram", "formato": "reel",
         "thumbnail": None, "caption": "Antes del servicio vs después — mirá la diferencia",
         "likes": 312, "comentarios": 28, "engagement_rate": 8.4, "er_vs_promedio": 3.1,
         "angulo_sugerido": "Antes vs. después", "ya_existe_paid": False, "potencial": "alto"},
        {"post_id": "o2", "plataforma": "instagram", "formato": "imagen",
         "thumbnail": None, "caption": "Cliente nos escribió después de 2 semanas: 'increíble'",
         "likes": 187, "comentarios": 15, "engagement_rate": 6.1, "er_vs_promedio": 1.8,
         "angulo_sugerido": "Testimonio / caso real", "ya_existe_paid": False, "potencial": "medio"},
    ]
