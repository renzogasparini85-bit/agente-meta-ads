"""
POST /brief/generate
Genera brief estratégico con ángulos creativos para Meta Ads (Andromeda/GEM 2026).
Cada ángulo produce 3 variaciones de formato: Yapper lo-fi, UGC Testimonial, Lifestyle.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from database import Client, get_db
from auth import get_current_client
from sqlalchemy.orm import Session
from routers.account_resolver import resolve_account
import os, json

router = APIRouter(prefix="/brief", tags=["brief"])


FORMATOS = ["Yapper lo-fi (selfie/habla a cámara)", "UGC Testimonial", "Lifestyle / imagen estática"]

ANGULOS_DISPONIBLES = [
    "FOMO / Urgencia",
    "Problema → Solución",
    "Testimonial Social Proof",
    "Precio / Cuotas accesibles",
    "Detrás de escena / Proceso",
    "Autoridad / Expertise",
    "Comparación",
    "Garantía / Sin riesgo",
]


class BriefRequest(BaseModel):
    producto: str
    cliente_ideal: str
    oferta: str
    angulos: List[str]
    objetivo: str = "WHATSAPP"
    tono: str = "directo y cercano"
    account_id: Optional[str] = None


def _build_prompt(req: BriefRequest, brand: dict) -> str:
    angulos_str = "\n".join(f"- {a}" for a in req.angulos)

    brand_lines = []
    if brand.get("marca_palabras_si"):
        brand_lines.append(f"- Palabras/frases a usar: {brand['marca_palabras_si']}")
    if brand.get("marca_palabras_no"):
        brand_lines.append(f"- Palabras/frases a EVITAR: {brand['marca_palabras_no']}")
    if brand.get("marca_competidores"):
        brand_lines.append(f"- Competidores de referencia: {brand['marca_competidores']}")
    if brand.get("sitio_web"):
        brand_lines.append(f"- Sitio web: {brand['sitio_web']}")
    brand_ctx = ("\n\nRESTRICCIONES Y CONTEXTO ADICIONAL DE MARCA:\n" + "\n".join(brand_lines)) if brand_lines else ""

    return f"""Sos un experto Media Buyer Senior en Meta Ads para el mercado argentino, especializado en la metodología Andromeda/GEM 2026 donde "el creativo es el nuevo targeting".

CONTEXTO DEL NEGOCIO:
- Producto/Servicio: {req.producto}
- Cliente ideal: {req.cliente_ideal}
- Propuesta de valor / Oferta: {req.oferta}
- Objetivo del anuncio: {req.objetivo} (conversación por WhatsApp)
- Tono de comunicación: {req.tono}{brand_ctx}

ÁNGULOS SELECCIONADOS A DESARROLLAR:
{angulos_str}

TAREA:
Para cada ángulo, generá 3 variaciones creativas en estos formatos:
1. Yapper lo-fi: video selfie, lenguaje coloquial, directo a cámara, 15-30 segundos
2. UGC Testimonial: historia de cliente real (o simulada), emocional, relatable
3. Lifestyle / imagen estática: copy para imagen, más aspiracional o visual

Cada variación debe tener:
- hook_15s: las primeras palabras (gancho para los primeros 1.5 segundos), máx 10 palabras
- cuerpo: guión completo o copy del texto principal (3-5 oraciones, emojis si aplica)
- cta: llamado a la acción claro hacia WhatsApp

Además incluí:
- diseño: para cada ángulo, lineamientos de diseño en 3 formatos visuales
- flow_whatsapp: 3 preguntas de calificación para el mensaje automático de WhatsApp (para filtrar leads)
- kpis_monitorear: lista de métricas clave para evaluar estos creativos (Hook Rate, CPMr, etc.)
- recomendacion_presupuesto: cómo distribuir el presupuesto entre ángulos para testear

Usá voseo rioplatense argentino. Tono directo, sin fluff corporativo. Sin palabras como "increíble", "revolucionario" o "único en su tipo".

Respondé ÚNICAMENTE con JSON válido en este esquema exacto:
{{
  "angulos": [
    {{
      "nombre": "nombre del ángulo",
      "insight": "insight psicológico detrás de este ángulo (1 oración)",
      "variaciones": [
        {{
          "formato": "nombre del formato",
          "hook_15s": "gancho inicial",
          "cuerpo": "guión o copy completo",
          "cta": "llamado a la acción"
        }}
      ],
      "diseno": {{
        "estatica": {{
          "formato": "1080x1080 feed / 1080x1350 portrait",
          "concepto_visual": "descripción de la imagen: qué se ve, colores, composición",
          "texto_overlay": "copy que va sobre la imagen (máx 20% del espacio)",
          "elementos_clave": ["elemento 1", "elemento 2", "elemento 3"]
        }},
        "carrusel": {{
          "cantidad_slides": 4,
          "slides": [
            {{"numero": 1, "titulo": "título del slide", "descripcion": "descripción visual y texto"}},
            {{"numero": 2, "titulo": "título del slide", "descripcion": "descripción visual y texto"}},
            {{"numero": 3, "titulo": "título del slide", "descripcion": "descripción visual y texto"}},
            {{"numero": 4, "titulo": "título del slide (CTA)", "descripcion": "slide final con llamado a acción"}}
          ],
          "paleta_sugerida": "descripción de colores y estilo visual"
        }},
        "reel": {{
          "duracion": "15-30 segundos",
          "ratio": "9:16 vertical",
          "estructura": [
            {{"segundo": "0-3s", "visual": "qué se ve en pantalla", "audio": "qué se dice o escucha"}},
            {{"segundo": "3-10s", "visual": "qué se ve en pantalla", "audio": "qué se dice o escucha"}},
            {{"segundo": "10-20s", "visual": "qué se ve en pantalla", "audio": "qué se dice o escucha"}},
            {{"segundo": "20-30s", "visual": "CTA visual + texto en pantalla", "audio": "frase de cierre"}}
          ],
          "estilo": "lo-fi selfie / producido / animación / texto en pantalla",
          "caption_sugerido": "texto del caption del reel con hashtags relevantes"
        }}
      }}
    }}
  ],
  "flow_whatsapp": {{
    "mensaje_bienvenida": "mensaje automático inicial",
    "preguntas": ["pregunta 1", "pregunta 2", "pregunta 3"]
  }},
  "kpis_monitorear": [
    {{"metrica": "nombre", "descripcion": "qué mide", "benchmark": "valor de referencia"}}
  ],
  "recomendacion_presupuesto": "cómo distribuir el presupuesto de prueba"
}}"""


async def _call_claude(prompt: str) -> dict:
    import anthropic
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    text = msg.content[0].text.strip()
    # Strip markdown code blocks if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)


async def _call_gemini(prompt: str) -> dict:
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel("gemini-2.0-flash")
    resp = model.generate_content(prompt)
    text = resp.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)


@router.post("/generate")
async def generate_brief(
    body: BriefRequest,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    if not body.angulos:
        raise HTTPException(status_code=400, detail="Seleccioná al menos un ángulo")

    # Construir perfil de marca: base del cliente + overrides de la cuenta
    brand: dict = {
        "marca_nombre":          client.marca_nombre,
        "marca_descripcion":     client.marca_descripcion,
        "marca_publico":         client.marca_publico,
        "marca_tono":            client.marca_tono,
        "marca_propuesta_valor": client.marca_propuesta_valor,
        "marca_beneficios":      client.marca_beneficios,
        "marca_palabras_si":     client.marca_palabras_si,
        "marca_palabras_no":     client.marca_palabras_no,
        "marca_competidores":    client.marca_competidores,
        "sitio_web":             client.sitio_web,
    }
    try:
        _, _, _, _, account_row = resolve_account(client, body.account_id, db)
        if account_row and getattr(account_row, "brand_data", None):
            bd = account_row.brand_data
            if isinstance(bd, str):
                import json as _json
                bd = _json.loads(bd)
            brand.update({k: v for k, v in bd.items() if v is not None})
        if account_row and account_row.sitio_web:
            brand["sitio_web"] = account_row.sitio_web
    except Exception:
        pass

    prompt = _build_prompt(body, brand)

    # Try Claude first, fallback to Gemini
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")

    result = None
    used_model = None

    if anthropic_key:
        try:
            result = await _call_claude(prompt)
            used_model = "claude-opus-4-7"
        except Exception as e:
            if not gemini_key:
                raise HTTPException(status_code=502, detail=f"Claude error: {str(e)}")

    if result is None and gemini_key:
        try:
            result = await _call_gemini(prompt)
            used_model = "gemini-2.0-flash"
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI error: {str(e)}")

    if result is None:
        raise HTTPException(status_code=503, detail="No hay API keys configuradas para IA")

    return {"ok": True, "model": used_model, "brief": result}
