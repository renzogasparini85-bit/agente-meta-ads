"""
Benchmarks sectoriales para Argentina.
Compara las métricas del cliente contra promedios del sector.
Datos basados en reportes públicos de Meta + datos propios del sistema.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db, Client
from auth import get_current_client
from services.meta_api import get_campaign_insights, get_ad_insights, extract_conversions
from routers.account_resolver import resolve_account

router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])

# Benchmarks por objetivo de campaña (Argentina, 2024-2025)
# Fuentes: Meta Business Insights, WordStream, datos agregados internos
BENCHMARKS = {
    "OUTCOME_ENGAGEMENT": {
        "label": "Engagement",
        "ctr":    {"p25": 0.5,  "p50": 1.2,  "p75": 2.8},
        "cpc":    {"p25": 20.0, "p50": 12.0, "p75": 7.0},
        "freq":   {"p25": 1.8,  "p50": 2.2,  "p75": 3.0},
        "cpa":    None,
    },
    "OUTCOME_LEADS": {
        "label": "Generación de leads",
        "ctr":    {"p25": 0.8,  "p50": 1.8,  "p75": 3.5},
        "cpc":    {"p25": 40.0, "p50": 25.0, "p75": 14.0},
        "freq":   {"p25": 1.5,  "p50": 2.0,  "p75": 2.8},
        "cpa":    {"p25": 1200.0, "p50": 700.0, "p75": 400.0},
    },
    "OUTCOME_TRAFFIC": {
        "label": "Tráfico web",
        "ctr":    {"p25": 1.0,  "p50": 2.2,  "p75": 4.5},
        "cpc":    {"p25": 18.0, "p50": 10.0, "p75": 5.0},
        "freq":   {"p25": 1.6,  "p50": 2.1,  "p75": 2.9},
        "cpa":    None,
    },
    "OUTCOME_SALES": {
        "label": "Ventas / Conversiones",
        "ctr":    {"p25": 0.7,  "p50": 1.5,  "p75": 3.2},
        "cpc":    {"p25": 55.0, "p50": 35.0, "p75": 18.0},
        "freq":   {"p25": 1.4,  "p50": 2.0,  "p75": 2.8},
        "cpa":    {"p25": 2500.0, "p50": 1400.0, "p75": 700.0},
    },
    "OUTCOME_AWARENESS": {
        "label": "Reconocimiento de marca",
        "ctr":    {"p25": 0.3,  "p50": 0.8,  "p75": 1.8},
        "cpc":    {"p25": 35.0, "p50": 20.0, "p75": 10.0},
        "freq":   {"p25": 2.0,  "p50": 2.8,  "p75": 4.0},
        "cpa":    None,
    },
    "MESSAGES": {
        "label": "Mensajes (WhatsApp)",
        "ctr":    {"p25": 0.9,  "p50": 1.8,  "p75": 3.5},
        "cpc":    {"p25": 30.0, "p50": 18.0, "p75": 10.0},
        "freq":   {"p25": 1.5,  "p50": 2.1,  "p75": 2.9},
        "cpa":    {"p25": 900.0, "p50": 550.0, "p75": 300.0},
    },
    "DEFAULT": {
        "label": "General",
        "ctr":    {"p25": 0.8,  "p50": 1.8,  "p75": 3.5},
        "cpc":    {"p25": 35.0, "p50": 20.0, "p75": 10.0},
        "freq":   {"p25": 1.6,  "p50": 2.2,  "p75": 3.0},
        "cpa":    {"p25": 1500.0, "p50": 850.0, "p75": 450.0},
    },
}


def _percentile_label(value, p25, p50, p75, lower_is_better=False):
    """Devuelve posición relativa y emoji de evaluación."""
    if lower_is_better:
        if value <= p75:
            return "top25", "🏆", "Top 25% — excelente"
        if value <= p50:
            return "top50", "✅", "Por debajo del promedio"
        if value <= p25:
            return "top75", "⚠️", "Sobre el promedio"
        return "bottom", "🔴", "Zona de riesgo"
    else:
        if value >= p75:
            return "top25", "🏆", "Top 25% — excelente"
        if value >= p50:
            return "top50", "✅", "Sobre el promedio"
        if value >= p25:
            return "top75", "⚠️", "Por debajo del promedio"
        return "bottom", "🔴", "Zona de riesgo"


def _compare(metric_name, value, bench, lower_is_better=False):
    if value is None or bench is None:
        return None
    p25, p50, p75 = bench["p25"], bench["p50"], bench["p75"]
    tier, icon, desc = _percentile_label(value, p25, p50, p75, lower_is_better)

    if lower_is_better:
        vs_median = round(((p50 - value) / p50) * 100, 1) if p50 else 0
    else:
        vs_median = round(((value - p50) / p50) * 100, 1) if p50 else 0

    return {
        "valor": round(value, 2),
        "mediana_sector": p50,
        "p25_sector": p25,
        "p75_sector": p75,
        "vs_mediana_pct": vs_median,
        "tier": tier,
        "icon": icon,
        "descripcion": desc,
    }


@router.get("")
async def get_benchmarks(
    days: int = Query(30, ge=1, le=90),
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    ad_account_id, token, _, campaign_filter, _ = resolve_account(client, account_id, db)

    # Traer campañas para detectar objetivo dominante
    campaigns = await get_campaign_insights(ad_account_id, token, days)

    if campaign_filter:
        campaigns = [c for c in campaigns if campaign_filter.lower() in (c.get("campaign_name") or "").lower()]

    # Detectar objetivo mayoritario por gasto
    objective_spend = {}
    for c in campaigns:
        obj = c.get("objective") or "DEFAULT"
        spend = float(c.get("spend", 0) or 0)
        objective_spend[obj] = objective_spend.get(obj, 0) + spend

    dominant_obj = max(objective_spend, key=objective_spend.get) if objective_spend else "DEFAULT"
    bench = BENCHMARKS.get(dominant_obj, BENCHMARKS["DEFAULT"])

    # Calcular métricas reales del cliente (ponderadas por gasto)
    total_spend = 0
    total_clicks = 0
    total_impr = 0
    total_conv = 0
    weighted_freq = 0

    for c in campaigns:
        s = float(c.get("spend", 0) or 0)
        total_spend += s
        total_clicks += float(c.get("clicks", 0) or 0)
        total_impr   += float(c.get("impressions", 0) or 0)
        total_conv   += extract_conversions(c.get("actions", []))
        weighted_freq += float(c.get("frequency", 0) or 0) * s

    ctr_real  = (total_clicks / total_impr * 100) if total_impr else None
    cpc_real  = (total_spend / total_clicks) if total_clicks else None
    freq_real = (weighted_freq / total_spend) if total_spend else None
    cpa_real  = (total_spend / total_conv) if total_conv else None

    return {
        "objetivo": dominant_obj,
        "objetivo_label": bench["label"],
        "periodo_dias": days,
        "metricas": {
            "ctr": _compare("ctr", ctr_real, bench["ctr"]),
            "cpc": _compare("cpc", cpc_real, bench["cpc"], lower_is_better=True),
            "frecuencia": _compare("frecuencia", freq_real, bench["freq"], lower_is_better=True),
            "cpa": _compare("cpa", cpa_real, bench["cpa"], lower_is_better=True) if bench["cpa"] else None,
        },
        "benchmarks_disponibles": list(BENCHMARKS.keys()),
    }
