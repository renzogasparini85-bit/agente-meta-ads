"""
GET /strategy/overview
Vista estratégica Andromeda/GEM: biblioteca de ángulos activos, semáforo de diversidad,
CPMr, Hook Rate y trazabilidad de decisiones.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from database import Client, ActionLog, get_db, AdAccount
from auth import get_current_client
from services.meta_api import get_ad_insights, extract_conversions, compute_cpa, get_ads_copy
from routers.account_resolver import resolve_account
from routers.creatives import compute_roas_hibrido, compute_ftir, extract_marca, ftir_segmento
import re, os, json
import anthropic

router = APIRouter(prefix="/strategy", tags=["strategy"])

# Caché en memoria: ad_id -> angulo detectado por IA
_angulo_cache: dict[str, str] = {}


async def _clasificar_angulos_con_ia(ads: list[dict], token: str) -> dict[str, str]:
    """
    Recibe lista de {id, nombre, copy, titulo}, devuelve {ad_id: angulo}.
    Llama a Claude una sola vez con todos los anuncios sin ángulo.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {}

    # Traer copy de Meta para los que no tienen
    ad_ids_sin_copy = [a["id"] for a in ads if not a.get("copy")]
    if ad_ids_sin_copy:
        copies = await get_ads_copy(ad_ids_sin_copy, token)
        for a in ads:
            if a["id"] in copies:
                a["copy"]   = copies[a["id"]]["copy"]
                a["titulo"] = copies[a["id"]]["titulo"]

    # Filtrar los que siguen sin copy útil
    ads_con_texto = [a for a in ads if (a.get("copy") or a.get("titulo") or a.get("nombre"))]
    if not ads_con_texto:
        return {}

    angulos_str = "\n".join(f"- {a}" for a in ANGULOS_FRAMEWORK)
    ads_str = "\n\n".join(
        f'AD_ID: {a["id"]}\nNombre: {a.get("nombre","")}\nTítulo: {a.get("titulo","")}\nCopy: {a.get("copy","")}'
        for a in ads_con_texto
    )

    prompt = f"""Clasificá cada anuncio en UNO de estos ángulos psicológicos:
{angulos_str}
- Sin ángulo definido (solo si es imposible clasificar)

Para cada anuncio devolvé SOLO un JSON con formato:
{{"ad_id_1": "Ángulo exacto", "ad_id_2": "Ángulo exacto"}}

Usá el copy y el nombre para inferir el ángulo dominante. Sé específico.

ANUNCIOS:
{ads_str}"""

    try:
        client_ai = anthropic.Anthropic(api_key=api_key)
        msg = client_ai.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text.strip()
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return {}


# Ángulos del framework Andromeda
ANGULOS_FRAMEWORK = [
    "FOMO / Urgencia",
    "Problema → Solución",
    "Testimonial Social Proof",
    "Precio / Cuotas accesibles",
    "Detrás de escena / Proceso",
    "Autoridad / Expertise",
    "Comparación",
    "Garantía / Sin riesgo",
    "Yapper lo-fi",
    "UGC Testimonial",
    "Lifestyle",
]


def _detect_angle(name: str) -> str:
    """Detecta ángulo del nombre del anuncio (convención: 'Nombre — Ángulo')."""
    parts = name.split(" — ")
    if len(parts) >= 2:
        return parts[-1].strip()
    # Buscar keywords en el nombre
    name_lower = name.lower()
    if any(k in name_lower for k in ["fomo", "urgencia", "último", "quedan"]):
        return "FOMO / Urgencia"
    if any(k in name_lower for k in ["testimonial", "caso", "cliente", "ugc"]):
        return "Testimonial Social Proof"
    if any(k in name_lower for k in ["problema", "solución", "dolor"]):
        return "Problema → Solución"
    if any(k in name_lower for k in ["precio", "cuota", "descuento"]):
        return "Precio / Cuotas accesibles"
    if any(k in name_lower for k in ["detrás", "proceso", "cómo"]):
        return "Detrás de escena / Proceso"
    if any(k in name_lower for k in ["garantía", "riesgo", "gratis"]):
        return "Garantía / Sin riesgo"
    if any(k in name_lower for k in ["yapper", "lo-fi", "selfie"]):
        return "Yapper lo-fi"
    return "Sin ángulo definido"


def _diversidad_semaforo(angulos_activos: list, amarillo: float = 40.0, rojo: float = 60.0) -> dict:
    if not angulos_activos:
        return {"estado": "sin_datos", "mensaje": "Sin anuncios activos para analizar"}

    total = len(angulos_activos)
    conteo = {}
    for a in angulos_activos:
        conteo[a] = conteo.get(a, 0) + 1

    max_angulo = max(conteo, key=conteo.get)
    max_pct = conteo[max_angulo] / total * 100

    if max_pct >= rojo:
        return {
            "estado": "rojo",
            "mensaje": f"⚠️ {max_pct:.0f}% de tus anuncios usan el ángulo '{max_angulo}'. Andromeda penaliza la similitud >{rojo:.0f}%. Agregá ángulos distintos.",
            "angulo_dominante": max_angulo,
            "pct_dominante": round(max_pct, 1),
        }
    elif max_pct >= amarillo:
        return {
            "estado": "amarillo",
            "mensaje": f"El ángulo '{max_angulo}' representa el {max_pct:.0f}% de tu biblioteca. Considerá diversificar antes de llegar al {rojo:.0f}%.",
            "angulo_dominante": max_angulo,
            "pct_dominante": round(max_pct, 1),
        }
    return {
        "estado": "verde",
        "mensaje": f"Buena diversidad creativa — ningún ángulo supera el {amarillo:.0f}%. Algoritmo feliz 🟢",
        "angulo_dominante": max_angulo,
        "pct_dominante": round(max_pct, 1),
    }


@router.get("/overview")
async def strategy_overview(
    days: int = Query(30, ge=1, le=365),
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    ad_account_id, token, _, campaign_filter, _ = resolve_account(client, account_id, db)

    try:
        raw = await get_ad_insights(ad_account_id, token, days)
    except Exception as e:
        msg = str(e)
        if "403" in msg:
            raise HTTPException(status_code=502, detail="Token de Meta expirado o sin permisos. Renovalo en Configuración → Token de Meta.")
        raise HTTPException(status_code=502, detail=f"Error Meta API: {msg[:200]}")

    angulos_activos = []
    biblioteca = {}  # angulo -> {ads, spend, conv, cpmr, hook_rate}

    for a in raw:
        if campaign_filter:
            if campaign_filter.lower() not in (a.get("campaign_name") or "").lower():
                continue

        spend       = float(a.get("spend", 0) or 0)
        if spend <= 0:
            continue

        nombre      = a.get("ad_name") or ""
        impressions = float(a.get("impressions", 0) or 0)
        reach       = float(a.get("reach", 0) or 0)
        conv        = extract_conversions(a.get("actions", []))
        cpa         = compute_cpa(spend, conv)
        ctr         = round(float(a.get("ctr", 0) or 0), 2)
        freq        = round(float(a.get("frequency", 0) or 0), 2)
        cpmr        = round(spend / reach * 1000, 2) if reach > 0 else None
        ftir        = compute_ftir(reach, impressions)

        video_views_25 = sum(
            float(v.get("value", 0) or 0)
            for v in (a.get("video_p25_watched_actions") or [])
        )
        hook_rate = round(video_views_25 / impressions * 100, 1) if impressions > 0 and video_views_25 > 0 else None

        ad_id  = a.get("ad_id") or ""
        angulo = _angulo_cache.get(ad_id) or _detect_angle(nombre)

        ad_entry = {
            "id": ad_id,
            "nombre": nombre,
            "spend": round(spend, 2),
            "conv": conv,
            "cpa": cpa,
            "ctr": ctr,
            "frecuencia": freq,
            "cpmr": cpmr,
            "hook_rate": hook_rate,
            "ftir": ftir,
            "_angulo_detectado": angulo,
        }

        angulos_activos.append(angulo)

        if angulo not in biblioteca:
            biblioteca[angulo] = {
                "angulo": angulo,
                "ads": [],
                "total_spend": 0,
                "total_conv": 0,
                "cpmr_values": [],
                "hook_rate_values": [],
                "ctr_values": [],
            }

        biblioteca[angulo]["ads"].append(ad_entry)
        biblioteca[angulo]["total_spend"] += spend
        biblioteca[angulo]["total_conv"] += conv
        if cpmr:
            biblioteca[angulo]["cpmr_values"].append(cpmr)
        if hook_rate:
            biblioteca[angulo]["hook_rate_values"].append(hook_rate)
        biblioteca[angulo]["ctr_values"].append(ctr)

    # Clasificar con IA los anuncios sin ángulo definido (no cacheados aún)
    ads_sin_angulo = []
    for data in biblioteca.get("Sin ángulo definido", {}).get("ads", []):
        if data["id"] and data["id"] not in _angulo_cache:
            ads_sin_angulo.append({"id": data["id"], "nombre": data["nombre"], "copy": "", "titulo": ""})

    if ads_sin_angulo:
        try:
            token_actual = client.meta_access_token
            clasificados = await _clasificar_angulos_con_ia(ads_sin_angulo, token_actual)
            for ad_id, angulo_ia in clasificados.items():
                if angulo_ia and angulo_ia != "Sin ángulo definido":
                    _angulo_cache[ad_id] = angulo_ia

            # Reubicar anuncios que fueron clasificados
            if clasificados:
                ads_reubicar = [
                    a for a in biblioteca.get("Sin ángulo definido", {}).get("ads", [])
                    if _angulo_cache.get(a["id"])
                ]
                for ad in ads_reubicar:
                    nuevo_angulo = _angulo_cache[ad["id"]]
                    biblioteca["Sin ángulo definido"]["ads"].remove(ad)
                    biblioteca["Sin ángulo definido"]["total_spend"] -= ad["spend"]
                    biblioteca["Sin ángulo definido"]["total_conv"]  -= ad["conv"]

                    if nuevo_angulo not in biblioteca:
                        biblioteca[nuevo_angulo] = {
                            "angulo": nuevo_angulo, "ads": [],
                            "total_spend": 0, "total_conv": 0,
                            "cpmr_values": [], "hook_rate_values": [], "ctr_values": [],
                        }
                    biblioteca[nuevo_angulo]["ads"].append(ad)
                    biblioteca[nuevo_angulo]["total_spend"] += ad["spend"]
                    biblioteca[nuevo_angulo]["total_conv"]  += ad["conv"]
                    if ad["cpmr"]:
                        biblioteca[nuevo_angulo]["cpmr_values"].append(ad["cpmr"])
                    if ad["hook_rate"]:
                        biblioteca[nuevo_angulo]["hook_rate_values"].append(ad["hook_rate"])
                    biblioteca[nuevo_angulo]["ctr_values"].append(ad["ctr"])

                # Limpiar "Sin ángulo definido" si quedó vacío
                if not biblioteca.get("Sin ángulo definido", {}).get("ads"):
                    biblioteca.pop("Sin ángulo definido", None)

                # Recalcular angulos_activos
                angulos_activos = []
                for ang, data in biblioteca.items():
                    angulos_activos.extend([ang] * len(data["ads"]))
        except Exception:
            pass

    # Calcular promedios por ángulo
    biblioteca_list = []
    for angulo, data in biblioteca.items():
        cpmr_avg = round(sum(data["cpmr_values"]) / len(data["cpmr_values"]), 2) if data["cpmr_values"] else None
        hook_avg = round(sum(data["hook_rate_values"]) / len(data["hook_rate_values"]), 1) if data["hook_rate_values"] else None
        ctr_avg  = round(sum(data["ctr_values"]) / len(data["ctr_values"]), 2) if data["ctr_values"] else None
        cpa_avg  = compute_cpa(data["total_spend"], data["total_conv"])

        # Señal de rotación usando umbrales del cliente
        señal_rotacion = None
        if cpmr_avg and cpmr_avg > client.cpmr_rojo:
            señal_rotacion = "cpmr_alto"
        if hook_avg is not None and hook_avg < client.hook_rojo:
            señal_rotacion = "hook_bajo" if not señal_rotacion else "rotar_urgente"

        # Estado del ángulo para la matriz visual
        if señal_rotacion == "rotar_urgente":
            estado_angulo = "critico"
        elif señal_rotacion in ("cpmr_alto", "hook_bajo"):
            estado_angulo = "atencion"
        elif cpa_avg is not None and cpa_avg <= client.cpa_escalar:
            estado_angulo = "escalar"
        elif len(data["ads"]) == 0:
            estado_angulo = "oportunidad"
        else:
            estado_angulo = "estable"

        ads_clean = [{k: v for k, v in a.items() if k != "_angulo_detectado"} for a in data["ads"]]
        biblioteca_list.append({
            "angulo":          angulo,
            "n_ads":           len(ads_clean),
            "total_spend":     round(data["total_spend"], 2),
            "total_conv":      data["total_conv"],
            "cpa_promedio":    cpa_avg,
            "cpmr_promedio":   cpmr_avg,
            "hook_rate_promedio": hook_avg,
            "ctr_promedio":    ctr_avg,
            "señal_rotacion":  señal_rotacion,
            "estado_angulo":   estado_angulo,
            "ads":             ads_clean,
        })

    biblioteca_list.sort(key=lambda x: x["total_spend"], reverse=True)

    # Historial de decisiones (últimas 30 acciones)
    acciones = db.query(ActionLog).filter(
        ActionLog.client_id == client.id
    ).order_by(ActionLog.ejecutado_en.desc()).limit(30).all()

    historial = [
        {
            "id":          a.id,
            "tipo":        a.tipo,
            "descripcion": a.descripcion,
            "meta_id":     a.meta_id,
            "resultado":   a.resultado,
            "fecha":       a.ejecutado_en.isoformat() if a.ejecutado_en else None,
        }
        for a in acciones
    ]

    # Agregar ángulos del framework que no tienen ads activos (oportunidades)
    angulos_en_uso = {b["angulo"] for b in biblioteca_list}
    for angulo_framework in ANGULOS_FRAMEWORK:
        if angulo_framework not in angulos_en_uso:
            biblioteca_list.append({
                "angulo":          angulo_framework,
                "n_ads":           0,
                "total_spend":     0,
                "total_conv":      0,
                "cpa_promedio":    None,
                "cpmr_promedio":   None,
                "hook_rate_promedio": None,
                "ctr_promedio":    None,
                "señal_rotacion":  None,
                "estado_angulo":   "oportunidad",
                "ads":             [],
            })

    return {
        "days":            days,
        "diversidad":      _diversidad_semaforo(angulos_activos, client.diversidad_amarillo, client.diversidad_rojo),
        "biblioteca":      biblioteca_list,
        "angulos_activos": len(set(angulos_activos)),
        "total_ads":       len(angulos_activos),
        "historial":       historial,
        "umbrales": {
            "cpmr_verde":           client.cpmr_verde,
            "cpmr_rojo":            client.cpmr_rojo,
            "hook_verde":           client.hook_verde,
            "hook_rojo":            client.hook_rojo,
            "freq_amarillo":        client.freq_amarillo,
            "freq_rojo":            client.freq_rojo,
            "ctr_bueno":            client.ctr_bueno,
            "ctr_malo":             client.ctr_malo,
            "conv_semana_rojo":     client.conv_semana_rojo,
            "conv_semana_verde":    client.conv_semana_verde,
            "diversidad_amarillo":  client.diversidad_amarillo,
            "diversidad_rojo":      client.diversidad_rojo,
        },
    }


GEM_SYSTEM_PROMPT = """Sos un Sistema de Alerta y Mentoría de Meta Ads (Versión 2026) especializado en el framework Andromeda/GEM.

Tu filosofía: "El creativo ES el targeting". No recomendás segmentación manual de intereses. Tu stack preferido: Advantage+ Shopping (ASC) o Advantage+ Audience. Estructura: 1 campaña CBO → 2–3 adsets → 4 anuncios activos por adset.

Analizás 5 dimensiones y respondés SIEMPRE en JSON con esta estructura exacta:
{
  "fase_aprendizaje": {
    "estado": "verde|amarillo|rojo",
    "diagnostico": "...",
    "instruccion": "...",
    "por_que": "..."
  },
  "fatiga_creativa": {
    "estado": "verde|amarillo|rojo",
    "diagnostico": "...",
    "instruccion": "...",
    "por_que": "..."
  },
  "optimizacion_hook": {
    "estado": "verde|amarillo|rojo",
    "diagnostico": "...",
    "instruccion": "...",
    "por_que": "..."
  },
  "escalamiento": {
    "estado": "verde|amarillo|rojo",
    "diagnostico": "...",
    "instruccion": "...",
    "por_que": "..."
  },
  "diversidad_creativa": {
    "estado": "verde|amarillo|rojo",
    "diagnostico": "...",
    "instruccion": "...",
    "por_que": "..."
  }
}

Reglas de estado:
- verde: todo OK, mantener
- amarillo: atención, monitorear o ajustar pronto
- rojo: acción inmediata requerida

Umbrales GEM 2026:
- Fase aprendizaje: <50 conv/semana = rojo (consolidar en CBO). 50-100 = amarillo. >100 = verde.
- Fatiga creativa: Frecuencia ≥3.0 = rojo. 2.0-2.9 = amarillo. <2.0 = verde.
- Hook Rate: <15% = rojo (rotar urgente). 15-25% = amarillo. >25% = verde.
- CPMr: >$7000 ARS = rojo (fatiga/competencia alta). $3000-7000 = amarillo. <$3000 = verde (subastas muy económicas).
- Escalamiento: Escalar máx +20% cada 3-4 días. Solo si CPA < objetivo y conv > 50/semana.
- Diversidad: >60% mismo ángulo = rojo. 40-60% = amarillo. <40% = verde.

Respondé en español rioplatense, directo, sin fluff. Instrucciones accionables y concretas."""


@router.post("/informe")
async def strategy_informe(
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    ad_account_id, token, _, campaign_filter, _ = resolve_account(client, account_id, db)

    try:
        raw = await get_ad_insights(ad_account_id, token, 7)
    except Exception as e:
        msg = str(e)
        if "403" in msg:
            raise HTTPException(status_code=502, detail="Token de Meta expirado o sin permisos. Renovalo en Configuración → Token de Meta.")
        raise HTTPException(status_code=502, detail=f"Error Meta API: {msg[:200]}")

    # Aggregate 7-day metrics
    total_spend = 0.0
    total_conv  = 0
    total_impressions = 0.0
    total_reach = 0.0
    cpmr_values = []
    hook_rate_values = []
    freq_values = []
    ctr_values  = []
    angulos_activos = []
    ads_count = 0

    for a in raw:
        if campaign_filter:
            if campaign_filter.lower() not in (a.get("campaign_name") or "").lower():
                continue

        spend = float(a.get("spend", 0) or 0)
        if spend <= 0:
            continue

        ads_count += 1
        impressions = float(a.get("impressions", 0) or 0)
        reach       = float(a.get("reach", 0) or 0)
        conv        = extract_conversions(a.get("actions", []))
        freq        = float(a.get("frequency", 0) or 0)
        ctr         = float(a.get("ctr", 0) or 0)

        total_spend       += spend
        total_conv        += conv
        total_impressions += impressions
        total_reach       += reach

        cpmr = spend / reach * 1000 if reach > 0 else None
        if cpmr:
            cpmr_values.append(cpmr)

        video_views_25 = sum(
            float(v.get("value", 0) or 0)
            for v in (a.get("video_p25_watched_actions") or [])
        )
        hook_rate = video_views_25 / impressions * 100 if impressions > 0 and video_views_25 > 0 else None
        if hook_rate:
            hook_rate_values.append(hook_rate)

        if freq > 0:
            freq_values.append(freq)
        ctr_values.append(ctr)

        ad_id_inf = a.get("ad_id") or ""
        angulo_inf = _angulo_cache.get(ad_id_inf) or _detect_angle(a.get("ad_name") or "")
        angulos_activos.append(angulo_inf)

    # Get CPA objetivo from brand profile
    cpa_objetivo = None
    try:
        acc_row = db.query(AdAccount).filter(
            AdAccount.client_id == client.id,
            AdAccount.meta_ad_account_id == ad_account_id,
        ).first()
        if acc_row and acc_row.brand_data:
            bd = json.loads(acc_row.brand_data) if isinstance(acc_row.brand_data, str) else acc_row.brand_data
            cpa_obj_str = bd.get("cpa_objetivo") or bd.get("kpi_cpa_objetivo")
            if cpa_obj_str:
                cpa_objetivo = float(str(cpa_obj_str).replace("$", "").replace(",", ".").strip())
    except Exception:
        pass

    cpa_real  = round(total_spend / total_conv, 2) if total_conv > 0 else None
    avg_cpmr  = round(sum(cpmr_values) / len(cpmr_values), 2) if cpmr_values else None
    avg_hook  = round(sum(hook_rate_values) / len(hook_rate_values), 1) if hook_rate_values else None
    avg_freq  = round(sum(freq_values) / len(freq_values), 2) if freq_values else None
    avg_ctr   = round(sum(ctr_values) / len(ctr_values), 2) if ctr_values else None

    diversidad = _diversidad_semaforo(angulos_activos)

    # Build context for Claude
    angulo_counts = {}
    for a in angulos_activos:
        angulo_counts[a] = angulo_counts.get(a, 0) + 1
    angulos_str = ", ".join(f"{k} ({v} ads)" for k, v in sorted(angulo_counts.items(), key=lambda x: -x[1]))

    moneda = client.moneda or "ARS"
    user_prompt = f"""Analizá esta cuenta de Meta Ads (últimos 7 días) y generá el Informe de Acción Inmediata:

DATOS REALES:
- Anuncios activos con gasto: {ads_count}
- Inversión total 7 días: ${total_spend:.2f} {moneda}
- Conversiones totales 7 días: {total_conv}
- CPA real: {f'${cpa_real:.2f} {moneda}' if cpa_real else 'sin datos'}
- CPA objetivo: {f'${cpa_objetivo:.2f} {moneda}' if cpa_objetivo else 'no configurado (el usuario debe configurarlo)'}
- CPMr promedio: {f'${avg_cpmr:.2f} {moneda}' if avg_cpmr else 'sin datos'}
- Hook Rate promedio: {f'{avg_hook:.1f}%' if avg_hook else 'sin datos (anuncios sin video o dato no disponible)'}
- Frecuencia promedio: {f'{avg_freq:.2f}' if avg_freq else 'sin datos'}
- CTR promedio: {f'{avg_ctr:.2f}%' if avg_ctr else 'sin datos'}
- Ángulos detectados: {angulos_str if angulos_str else 'sin datos de ángulos'}
- Diversidad: {diversidad.get('estado','?')} — {diversidad.get('pct_dominante', '?')}% ángulo dominante ({diversidad.get('angulo_dominante','?')})

UMBRALES CONFIGURADOS DEL CLIENTE (usá ESTOS valores, no los del system prompt):
- Fase aprendizaje: rojo < {client.conv_semana_rojo:.0f} conv/sem, verde > {client.conv_semana_verde:.0f} conv/sem
- Fatiga creativa: amarillo frecuencia > {client.freq_amarillo}, rojo > {client.freq_rojo}
- Hook Rate: rojo < {client.hook_rojo:.0f}%, verde > {client.hook_verde:.0f}%
- CPMr: verde < {client.cpmr_verde} {moneda}, rojo > {client.cpmr_rojo} {moneda}
- Diversidad: amarillo > {client.diversidad_amarillo:.0f}%, rojo > {client.diversidad_rojo:.0f}%
- CPA pausa: {client.cpa_pausar} {moneda} | CPA escalar: {client.cpa_escalar} {moneda}

Generá el JSON con los 5 diagnósticos GEM. Sé específico con los números reales. Mencioná los valores concretos en los diagnósticos."""

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY no configurada")

    try:
        anthropic_client = anthropic.Anthropic(api_key=api_key)
        msg = anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            system=GEM_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        text = msg.content[0].text.strip()
        # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', text)
        if json_match:
            informe = json.loads(json_match.group())
        else:
            raise ValueError("No JSON found in response")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Error parseando respuesta de IA")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error IA: {str(e)}")

    return {
        "periodo_dias": 7,
        "resumen": {
            "ads_activos":   ads_count,
            "total_conv":    total_conv,
            "cpa_real":      cpa_real,
            "cpa_objetivo":  cpa_objetivo,
            "avg_cpmr":      avg_cpmr,
            "avg_hook_rate": avg_hook,
            "avg_frecuencia": avg_freq,
            "avg_ctr":       avg_ctr,
        },
        "diversidad": diversidad,
        "informe":    informe,
    }
