from fastapi import APIRouter, Depends, Query, HTTPException
from database import Client
from auth import get_current_client
from services.meta_api import get_ad_insights, get_ad_created_dates, get_ad_thumbnails, extract_conversions, compute_cpa
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db

router = APIRouter(prefix="/creatives", tags=["creatives"])

NUEVO_DIAS       = 7
FATIGA_FREQ      = 2.2   # ventana corta es más sensible
PAUSAR_FREQ      = 3.0
FTIR_PROSPECCION = 60.0  # > 60%  → anuncio llegando a sangre nueva
FTIR_RETARGETING = 35.0  # < 35%  → anuncio circulando en audiencia conocida


def dias_desde(created_time: str) -> int:
    if not created_time:
        return 99
    try:
        dt = datetime.fromisoformat(created_time.replace("+0000", "+00:00"))
        return (datetime.now(timezone.utc) - dt).days
    except Exception:
        return 99


def extract_marca(nombre: str) -> str:
    """Extrae la marca del nombre de campaña. 'IFPA | PROS | WA | CABA' → 'IFPA'"""
    if not nombre:
        return "Sin marca"
    parte = nombre.split("|")[0].strip()
    return parte if parte else nombre.strip()


def compute_ftir(reach: float, impressions: float) -> Optional[float]:
    if impressions <= 0:
        return None
    return round((reach / impressions) * 100, 1)


def compute_roas_hibrido(
    spend: float,
    conv: int,
    purchase_roas_raw,
    ticket_promedio: Optional[float],
    tasa_cierre: Optional[float],
) -> Optional[float]:
    """
    Caso A (e-com): usa purchase_roas de la API si existe.
    Caso B (WhatsApp): (mensajes × tasa_cierre% × ticket_promedio) / spend.
    """
    # Caso A
    if purchase_roas_raw:
        try:
            val = purchase_roas_raw
            if isinstance(val, list) and val:
                val = val[0].get("value", 0)
            return round(float(val), 2)
        except Exception:
            pass

    # Caso B
    if ticket_promedio and tasa_cierre and spend > 0 and conv > 0:
        ingresos_estimados = conv * (tasa_cierre / 100) * ticket_promedio
        return round(ingresos_estimados / spend, 2)

    return None


def ftir_segmento(ftir: Optional[float]) -> str:
    """Clasifica el anuncio según su FTIR."""
    if ftir is None:
        return "sin_datos"
    if ftir >= FTIR_PROSPECCION:
        return "prospeccion"
    if ftir <= FTIR_RETARGETING:
        return "retargeting"
    return "mixto"


def creative_health_score(
    cpa, ctr, hook_rate, cpmr, frecuencia, badge,
    *, cpa_escalar, cpa_pausar, cpmr_verde, cpmr_rojo, hook_verde, hook_rojo
) -> dict:
    """
    Score 0-100 ponderado:
      Hook Rate  25 pts — retención del primer segundo
      CTR        20 pts — intención de click
      CPMr       20 pts — eficiencia de alcance
      CPA        25 pts — costo por resultado
      Fatiga     10 pts — penalización por frecuencia alta
    """
    pts_hook = 0
    if hook_rate is not None:
        if hook_rate >= hook_verde:
            pts_hook = 25
        elif hook_rate >= hook_rojo:
            pts_hook = round(((hook_rate - hook_rojo) / max(hook_verde - hook_rojo, 1)) * 25)
        else:
            pts_hook = 0
    else:
        pts_hook = 12  # sin video → neutro

    pts_ctr = 0
    if ctr >= 3.0:    pts_ctr = 20
    elif ctr >= 2.0:  pts_ctr = 16
    elif ctr >= 1.0:  pts_ctr = 10
    elif ctr >= 0.5:  pts_ctr = 5
    else:             pts_ctr = 0

    pts_cpmr = 0
    if cpmr is not None:
        if cpmr <= cpmr_verde:
            pts_cpmr = 20
        elif cpmr <= cpmr_rojo:
            span = max(cpmr_rojo - cpmr_verde, 1)
            pts_cpmr = round((1 - (cpmr - cpmr_verde) / span) * 20)
        else:
            pts_cpmr = 0

    pts_cpa = 0
    if cpa is not None:
        if cpa <= cpa_escalar:
            pts_cpa = 25
        elif cpa <= cpa_pausar:
            span = max(cpa_pausar - cpa_escalar, 1)
            pts_cpa = round((1 - (cpa - cpa_escalar) / span) * 25)
        else:
            pts_cpa = 0
    else:
        pts_cpa = 10  # sin conversiones → neutro bajo

    pts_fatiga = 10
    if frecuencia >= 3.0:   pts_fatiga = 0
    elif frecuencia >= 2.5: pts_fatiga = 4
    elif frecuencia >= 2.0: pts_fatiga = 7

    total = pts_hook + pts_ctr + pts_cpmr + pts_cpa + pts_fatiga

    # Estado legible basado en score + badge
    if badge in ("escalar", "retener") or total >= 75:
        estado = "escalable"
    elif badge in ("pausar", "sin_conversiones") or total < 25:
        estado = "pausar"
    elif badge in ("fatiga",) or total < 45:
        estado = "fatigado"
    elif badge in ("optimizar",) or total < 60:
        estado = "optimizar"
    else:
        estado = "mantener"

    return {
        "score": total,
        "estado": estado,
        "breakdown": {
            "hook_rate": pts_hook,
            "ctr": pts_ctr,
            "cpmr": pts_cpmr,
            "cpa": pts_cpa,
            "fatiga": pts_fatiga,
        }
    }


def classify(
    cpa, ctr, frecuencia, ftir, roas, gasto, dias_activo,
    *, cpa_escalar, cpa_replicar, cpa_pausar, gasto_minimo, roas_meta
):
    if dias_activo <= NUEVO_DIAS:
        return "nuevo"

    if cpa is None and roas is None:
        if gasto >= gasto_minimo:
            return "sin_conversiones"
        return "aprendizaje"

    # Fatiga: frecuencia alta en ventana corta
    if frecuencia >= PAUSAR_FREQ or (cpa is not None and cpa >= cpa_pausar):
        return "pausar"

    if frecuencia >= FATIGA_FREQ:
        return "fatiga"

    # Lógica FTIR + ROAS
    tiene_buen_roas = roas is not None and roas >= roas_meta
    tiene_buen_cpa  = cpa is not None and cpa <= cpa_escalar

    prospeccion = ftir is not None and ftir >= FTIR_PROSPECCION
    retargeting = ftir is not None and ftir <= FTIR_RETARGETING

    # ESCALAR: llegando a gente nueva Y convirtiendo bien
    if prospeccion and (tiene_buen_roas or tiene_buen_cpa) and ctr >= 1.5:
        return "escalar"

    # RETENER: retargeting eficiente (buen ROAS pero no escalable a frío)
    if retargeting and tiene_buen_roas:
        return "retener"

    # OPTIMIZAR: llega a gente nueva pero no convierte → problema de copy/oferta
    if prospeccion and not tiene_buen_roas and not tiene_buen_cpa:
        return "optimizar"

    # Fallback con CPA clásico
    if cpa is not None and cpa <= cpa_replicar:
        return "replicar"

    return "mantener"


@router.get("/ranking")
async def ranking(
    days: int = Query(30, ge=1, le=365),
    since: str = Query(None),
    until: str = Query(None),
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    from routers.account_resolver import resolve_account
    ad_account_id, token, _, campaign_filter, _ = resolve_account(client, account_id, db)
    import asyncio
    results = await asyncio.gather(
        get_ad_insights(ad_account_id, token, days, since=since, until=until),
        get_ad_created_dates(ad_account_id, token),
        get_ad_thumbnails(ad_account_id, token),
        return_exceptions=True,
    )
    if isinstance(results[0], Exception):
        raise HTTPException(status_code=502, detail=f"Error Meta API: {str(results[0])[:200]}")
    raw = results[0]
    created_dates = results[1] if not isinstance(results[1], Exception) else {}
    thumbnails    = results[2] if not isinstance(results[2], Exception) else {}

    result = []
    for a in raw:
        # Aplicar filtro de campaña si existe
        if campaign_filter:
            nombre_camp = (a.get("campaign_name") or a.get("ad_name") or "").lower()
            if campaign_filter.lower() not in nombre_camp:
                continue

        spend = float(a.get("spend", 0) or 0)
        if spend <= 0:
            continue

        conv        = extract_conversions(a.get("actions", []))
        cpa         = compute_cpa(spend, conv)
        ctr         = round(float(a.get("ctr", 0) or 0), 2)
        freq        = round(float(a.get("frequency", 0) or 0), 2)
        impressions = float(a.get("impressions", 0) or 0)
        reach       = float(a.get("reach", 0) or 0)
        ftir        = compute_ftir(reach, impressions)

        # CPMr = costo por 1000 personas únicas alcanzadas
        cpmr = round((spend / reach * 1000), 2) if reach > 0 else None

        # Hook Rate = % que vio al menos el 25% del video (proxy de retención del hook)
        video_views_25 = 0
        for v in (a.get("video_p25_watched_actions") or []):
            video_views_25 += float(v.get("value", 0) or 0)
        hook_rate = round((video_views_25 / impressions * 100), 1) if impressions > 0 and video_views_25 > 0 else None
        segmento    = ftir_segmento(ftir)
        roas        = compute_roas_hibrido(
            spend, conv,
            a.get("purchase_roas"),
            client.ticket_promedio,
            client.tasa_cierre,
        )
        ad_id       = a.get("ad_id")
        dias        = dias_desde(created_dates.get(ad_id, ""))
        badge       = classify(
            cpa, ctr, freq, ftir, roas, spend, dias,
            cpa_escalar=client.cpa_escalar,
            cpa_replicar=client.cpa_replicar,
            cpa_pausar=client.cpa_pausar,
            gasto_minimo=client.gasto_minimo_juzgar,
            roas_meta=client.roas_meta or 3.0,
        )

        health = creative_health_score(
            cpa, ctr, hook_rate, cpmr, freq, badge,
            cpa_escalar=client.cpa_escalar,
            cpa_pausar=client.cpa_pausar,
            cpmr_verde=client.cpmr_verde,
            cpmr_rojo=client.cpmr_rojo,
            hook_verde=client.hook_verde,
            hook_rojo=client.hook_rojo,
        )

        nombre_ad = a.get("ad_name") or ""
        result.append({
            "id":             ad_id,
            "adset_id":       a.get("adset_id"),
            "campaign_id":    a.get("campaign_id"),
            "nombre":         nombre_ad,
            "marca":          extract_marca(nombre_ad),
            "thumbnail":      thumbnails.get(ad_id),
            "gasto":          round(spend, 2),
            "conversaciones": conv,
            "cpa":            cpa,
            "roas":           roas,
            "ctr":            ctr,
            "frecuencia":     freq,
            "impresiones":    int(impressions),
            "alcance":        int(reach),
            "ftir":           ftir,
            "cpmr":           cpmr,
            "hook_rate":      hook_rate,
            "segmento":       segmento,
            "dias_activo":    dias,
            "badge":          badge,
            "health_score":   health["score"],
            "health_estado":  health["estado"],
            "health_breakdown": health["breakdown"],
        })

    def sort_key(x):
        order = {"escalar": 0, "retener": 1, "replicar": 2, "optimizar": 3,
                 "mantener": 4, "fatiga": 5, "pausar": 6,
                 "sin_conversiones": 7, "aprendizaje": 8, "nuevo": 9}
        return (order.get(x["badge"], 10), -(x["roas"] or 0) if x["roas"] else x["cpa"] or 999)

    result.sort(key=sort_key)
    return result
