"""
Score de salud de cuenta (0–100).
Evalúa la cartera de anuncios activos y devuelve un puntaje global
con desglose por dimensión y recomendaciones priorizadas.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db, Client
from auth import get_current_client
from services.meta_api import get_ad_insights, get_ad_created_dates, extract_conversions, compute_cpa
from routers.account_resolver import resolve_account
from routers.creatives import classify, compute_ftir, compute_roas_hibrido, dias_desde
import asyncio

router = APIRouter(prefix="/health", tags=["health"])


def _score_cpa(cpa, cpa_escalar, cpa_pausar):
    if cpa is None:
        return 50
    if cpa <= cpa_escalar:
        return 100
    if cpa >= cpa_pausar:
        return 0
    rng = cpa_pausar - cpa_escalar
    return round(100 * (1 - (cpa - cpa_escalar) / rng))


def _score_freq(freq):
    if freq <= 1.5:
        return 100
    if freq >= 3.5:
        return 0
    return round(100 * (1 - (freq - 1.5) / 2.0))


def _score_ctr(ctr):
    if ctr >= 2.5:
        return 100
    if ctr <= 0.5:
        return 0
    return round(100 * (ctr - 0.5) / 2.0)


def _score_diversidad(n_ads, n_escalar, n_pausar):
    """Premia tener creativos escalando, penaliza cartera concentrada en rojo."""
    if n_ads == 0:
        return 0
    pct_escalar = n_escalar / n_ads
    pct_pausar  = n_pausar  / n_ads
    base = 60 + round(pct_escalar * 40) - round(pct_pausar * 40)
    return max(0, min(100, base))


@router.get("/score")
async def health_score(
    days: int = Query(30, ge=1, le=90),
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    ad_account_id, token, _, campaign_filter, _ = resolve_account(client, account_id, db)

    raw, created_dates = await asyncio.gather(
        get_ad_insights(ad_account_id, token, days),
        get_ad_created_dates(ad_account_id, token),
    )

    ads_procesados = []
    for a in raw:
        if campaign_filter:
            nombre_camp = (a.get("campaign_name") or a.get("ad_name") or "").lower()
            if campaign_filter.lower() not in nombre_camp:
                continue
        spend = float(a.get("spend", 0) or 0)
        if spend <= 0:
            continue
        conv   = extract_conversions(a.get("actions", []))
        cpa    = compute_cpa(spend, conv)
        ctr    = float(a.get("ctr", 0) or 0)
        freq   = float(a.get("frequency", 0) or 0)
        impr   = float(a.get("impressions", 0) or 0)
        reach  = float(a.get("reach", 0) or 0)
        ftir   = compute_ftir(reach, impr)
        roas   = compute_roas_hibrido(spend, conv, a.get("purchase_roas"),
                                      client.ticket_promedio, client.tasa_cierre)
        ad_id  = a.get("ad_id")
        dias   = dias_desde(created_dates.get(ad_id, ""))
        badge  = classify(
            cpa, ctr, freq, ftir, roas, spend, dias,
            cpa_escalar=client.cpa_escalar,
            cpa_replicar=client.cpa_replicar,
            cpa_pausar=client.cpa_pausar,
            gasto_minimo=client.gasto_minimo_juzgar,
            roas_meta=client.roas_meta or 3.0,
        )
        ads_procesados.append({"cpa": cpa, "ctr": ctr, "freq": freq, "badge": badge, "spend": spend})

    n = len(ads_procesados)
    if n == 0:
        return {
            "score": 0,
            "label": "Sin datos",
            "color": "gray",
            "dimensiones": {},
            "insights": ["No hay anuncios activos con gasto en el período seleccionado."],
            "n_ads": 0,
        }

    # Calcular scores por dimensión (promedios ponderados por gasto)
    total_spend = sum(a["spend"] for a in ads_procesados) or 1

    def weighted_avg(scores):
        return round(sum(s * a["spend"] for s, a in zip(scores, ads_procesados)) / total_spend)

    scores_cpa  = [_score_cpa(a["cpa"], client.cpa_escalar, client.cpa_pausar) for a in ads_procesados]
    scores_ctr  = [_score_ctr(a["ctr"]) for a in ads_procesados]
    scores_freq = [_score_freq(a["freq"]) for a in ads_procesados]

    n_escalar = sum(1 for a in ads_procesados if a["badge"] in ("escalar", "retener"))
    n_pausar  = sum(1 for a in ads_procesados if a["badge"] in ("pausar", "sin_conversiones"))

    dim_cpa  = weighted_avg(scores_cpa)
    dim_ctr  = weighted_avg(scores_ctr)
    dim_freq = weighted_avg(scores_freq)
    dim_div  = _score_diversidad(n, n_escalar, n_pausar)

    # Score global: CPA 35%, Frecuencia 30%, CTR 20%, Diversidad 15%
    score = round(dim_cpa * 0.35 + dim_freq * 0.30 + dim_ctr * 0.20 + dim_div * 0.15)
    score = max(0, min(100, score))

    if score >= 75:
        label, color = "Saludable", "green"
    elif score >= 50:
        label, color = "Regular", "yellow"
    elif score >= 25:
        label, color = "En riesgo", "orange"
    else:
        label, color = "Crítico", "red"

    # Insights automáticos
    insights = []
    if dim_freq < 50:
        insights.append(f"Alta frecuencia promedio — considerá refrescar creativos o ampliar audiencias.")
    if dim_cpa < 50:
        insights.append(f"CPA elevado — {n_pausar} anuncio(s) superan el umbral de pausa (${client.cpa_pausar:.0f}).")
    if dim_ctr < 50:
        insights.append(f"CTR bajo — revisá los hooks visuales de los anuncios activos.")
    if n_escalar > 0:
        insights.append(f"{n_escalar} anuncio(s) en condición de escalar — considerá aumentar presupuesto.")
    if not insights:
        insights.append("Cartera en buen estado. Seguí monitoreando frecuencia y CPA.")

    return {
        "score": score,
        "label": label,
        "color": color,
        "n_ads": n,
        "dimensiones": {
            "cpa":        {"score": dim_cpa,  "label": "CPA",        "peso": "35%"},
            "frecuencia": {"score": dim_freq, "label": "Frecuencia", "peso": "30%"},
            "ctr":        {"score": dim_ctr,  "label": "CTR",        "peso": "20%"},
            "diversidad": {"score": dim_div,  "label": "Mix creatvo","peso": "15%"},
        },
        "insights": insights,
    }
