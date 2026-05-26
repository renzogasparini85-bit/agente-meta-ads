"""
POST /creative/analyze
- Imagen  → Claude Vision (análisis visual)
- Video   → Gemini 1.5 Flash (entiende audio + video nativamente)
- Fallback → respuesta local si no hay API keys
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from database import Client
from auth import get_current_client
import os, base64, json, mimetypes, tempfile, pathlib

router = APIRouter(prefix="/creative", tags=["creative"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm", "video/mpeg"}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES

MAX_IMAGE_MB = 20
MAX_VIDEO_MB = 100   # Gemini File API soporta hasta 2GB; limitamos a 100MB

ANGULOS = [
    "Propuesta de valor directa",
    "Testimonial de cliente",
    "Problema → solución",
    "Beneficios del producto",
    "Urgencia / stock limitado",
    "Detrás de escena / proceso",
    "Comparación de precio / cuotas",
    "Garantía / sin riesgo",
]

_ANGULOS_STR = "\n".join(f"- {a}" for a in ANGULOS)

_JSON_SCHEMA = """{
  "angulo_detectado": "nombre exacto del ángulo de la lista",
  "angulo_razon": "por qué este ángulo en base al creativo",
  "confianza": "alta|media|baja",
  "transcripcion": "texto hablado detectado en el video (solo si es video, sino null)",
  "copy": {
    "headline": "hook/titular de máximo 8 palabras, impacto inmediato",
    "primary_text": "texto principal del anuncio, 3-5 párrafos, con emojis estratégicos",
    "description": "descripción corta de 5-10 palabras",
    "cta": "texto del botón CTA",
    "hook_video": "primeras palabras si fuera video (0-3 segundos)"
  },
  "observaciones_creativo": "qué funciona del creativo y qué mejorar para Meta (2-3 frases)",
  "sugerencias_adicionales": ["variación 1 sugerida", "variación 2 sugerida"]
}"""

_INSTRUCCIONES_BASE = """Sos un experto en publicidad digital de Meta Ads para el mercado argentino.
Analizá el creativo y generá el copy final listo para publicarlo en Meta.
Usá voseo rioplatense (vos, te, tu). Directo, sin fluff corporativo.
Respondé ÚNICAMENTE con un JSON válido. Sin texto extra, sin markdown."""


def _prompt(producto: str, objetivo: str, tono: str, es_video: bool) -> str:
    tipo = "reel/video" if es_video else "imagen/carrusel"
    video_instrucciones = (
        "\n\nEste es un VIDEO. Además de analizar las imágenes, transcribí todo el audio/diálogo "
        "que escuchés y usalo para generar el copy. La transcripción va en el campo 'transcripcion'."
        if es_video else "\nPara 'transcripcion' devolvé null."
    )
    return f"""Analizá este creativo de Meta Ads ({tipo}) y generá el copy final.

CONTEXTO:
- Producto/servicio: {producto or "no especificado"}
- Objetivo Meta: {objetivo or "OUTCOME_LEADS"}
- Tono de marca: {tono or "cercano y directo"}
{video_instrucciones}

ÁNGULOS POSIBLES (elegí el más cercano):
{_ANGULOS_STR}

Estructura JSON de respuesta:
{_JSON_SCHEMA}"""


def _extract_json(raw: str) -> dict:
    raw = raw.strip()
    if "```" in raw:
        parts = raw.split("```")
        for part in parts[1::2]:
            candidate = part.lstrip("json").strip()
            try:
                return json.loads(candidate)
            except Exception:
                continue
    # Intentar directo
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start != -1 and end > start:
        return json.loads(raw[start:end])
    raise ValueError("No se encontró JSON válido")


# ── Análisis con Claude Vision (imágenes) ────────────────────────────────────

def _analyze_image_claude(data: bytes, media_type: str, producto: str, objetivo: str, tono: str) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return None  # señal para usar fallback

    import anthropic
    ant = anthropic.Anthropic(api_key=api_key)
    img_b64 = base64.standard_b64encode(data).decode("utf-8")

    msg = ant.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1600,
        system=_INSTRUCCIONES_BASE,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": img_b64}},
                {"type": "text", "text": _prompt(producto, objetivo, tono, es_video=False)},
            ],
        }],
    )
    return _extract_json(msg.content[0].text)


# ── Análisis con Gemini (video) ───────────────────────────────────────────────

def _analyze_video_gemini(data: bytes, filename: str, mime_type: str,
                           producto: str, objetivo: str, tono: str) -> dict:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return None  # señal para usar fallback

    from google import genai
    from google.genai import types as gtypes
    import time

    client = genai.Client(api_key=api_key)

    # Subir archivo a la File API de Gemini
    with tempfile.NamedTemporaryFile(suffix=pathlib.Path(filename).suffix, delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        uploaded = client.files.upload(
            file=tmp_path,
            config=gtypes.UploadFileConfig(mime_type=mime_type, display_name=filename),
        )

        # Esperar a que Gemini procese el video (estado ACTIVE)
        for _ in range(30):
            status = client.files.get(name=uploaded.name)
            if status.state.name == "ACTIVE":
                break
            if status.state.name == "FAILED":
                raise ValueError("Gemini no pudo procesar el video.")
            time.sleep(2)
        else:
            raise TimeoutError("Timeout esperando procesamiento de Gemini.")

        prompt_text = _prompt(producto, objetivo, tono, es_video=True)

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[uploaded, prompt_text],
            config=gtypes.GenerateContentConfig(
                system_instruction=_INSTRUCCIONES_BASE,
                max_output_tokens=1800,
                temperature=0.4,
            ),
        )

        result = _extract_json(response.text)

        # Limpiar archivo de Gemini
        try:
            client.files.delete(name=uploaded.name)
        except Exception:
            pass

        return result

    finally:
        os.unlink(tmp_path)


# ── Endpoint principal ────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze_creative(
    file: UploadFile = File(...),
    producto: str = Form(""),
    objetivo: str = Form("OUTCOME_LEADS"),
    tono: str = Form("cercano y directo"),
    formato: str = Form("imagen"),
    client: Client = Depends(get_current_client),
):
    content_type = file.content_type or ""
    if content_type not in ALLOWED_TYPES:
        ext = (file.filename or "").rsplit(".", 1)[-1].lower()
        guessed = mimetypes.guess_type(f"f.{ext}")[0] or ""
        if guessed not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail=f"Tipo no soportado. Usá JPG, PNG, WebP, MP4 o MOV.")
        content_type = guessed

    is_video = content_type.startswith("video/")
    max_mb = MAX_VIDEO_MB if is_video else MAX_IMAGE_MB
    data = await file.read()
    size_mb = len(data) / (1024 * 1024)
    if size_mb > max_mb:
        raise HTTPException(status_code=400, detail=f"El archivo pesa {size_mb:.1f}MB. Máximo {max_mb}MB.")

    # Video sin Gemini → pedir transcripción manual al cliente
    if is_video:
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        if not gemini_key:
            raise HTTPException(
                status_code=422,
                detail="VIDEO_NEEDS_TRANSCRIPT",
            )
        try:
            import asyncio
            result = await asyncio.to_thread(_analyze_video_gemini, data, file.filename or "video.mp4", content_type, producto, objetivo, tono)
            if result is None:
                raise HTTPException(status_code=422, detail="VIDEO_NEEDS_TRANSCRIPT")
            return result
        except HTTPException:
            raise
        except Exception as e:
            err = str(e)
            if any(k in err.lower() for k in ("quota", "billing", "exhausted", "limit")):
                raise HTTPException(status_code=422, detail="VIDEO_NEEDS_TRANSCRIPT")
            raise HTTPException(status_code=500, detail=f"Error Gemini: {err}")

    # Imagen → Claude Vision
    try:
        import asyncio
        media_type = content_type if content_type in ALLOWED_IMAGE_TYPES else "image/jpeg"
        result = await asyncio.to_thread(_analyze_image_claude, data, media_type, producto, objetivo, tono)
        if result is None:
            return _fallback_response(producto, formato)
        return result
    except (json.JSONDecodeError, ValueError):
        return _fallback_response(producto, formato)
    except Exception as e:
        err = str(e)
        if any(k in err.lower() for k in ("credit", "quota", "billing")):
            return _fallback_response(producto, formato)
        raise HTTPException(status_code=500, detail=f"Error al analizar: {err}")


class AnalyzeUrlRequest(BaseModel):
    image_url: str
    producto: str = ""
    objetivo: str = "OUTCOME_LEADS"
    tono: str = "cercano y directo"


@router.post("/analyze-url")
async def analyze_image_url(
    body: AnalyzeUrlRequest,
    client: Client = Depends(get_current_client),
):
    """Analiza una imagen a partir de su URL (sin subir archivo) usando Claude Vision."""
    import httpx, asyncio

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return _fallback_response(body.producto, "imagen")

    try:
        async with httpx.AsyncClient(timeout=15) as hclient:
            r = await hclient.get(body.image_url)
            r.raise_for_status()
            data = r.content
            content_type = r.headers.get("content-type", "image/jpeg").split(";")[0].strip()
            if content_type not in ALLOWED_IMAGE_TYPES:
                content_type = "image/jpeg"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo descargar la imagen: {str(e)}")

    try:
        result = await asyncio.to_thread(
            _analyze_image_claude, data, content_type,
            body.producto, body.objetivo, body.tono
        )
        if result is None:
            return _fallback_response(body.producto, "imagen")
        return result
    except (json.JSONDecodeError, ValueError):
        return _fallback_response(body.producto, "imagen")
    except Exception as e:
        err = str(e)
        if any(k in err.lower() for k in ("credit", "quota", "billing")):
            return _fallback_response(body.producto, "imagen")
        raise HTTPException(status_code=500, detail=f"Error al analizar: {err}")


@router.post("/analyze-transcript")
async def analyze_transcript(
    transcripcion: str = Form(...),
    producto: str = Form(""),
    objetivo: str = Form("OUTCOME_LEADS"),
    tono: str = Form("cercano y directo"),
    client: Client = Depends(get_current_client),
):
    """Analiza un video a partir de su transcripción/guión usando Claude."""
    if not transcripcion.strip():
        raise HTTPException(status_code=400, detail="La transcripción no puede estar vacía.")

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return _fallback_response(producto, "reel")

    prompt = f"""Analizá el siguiente guión/transcripción de un reel o video de Meta Ads y generá el copy final para publicarlo.

CONTEXTO:
- Producto/servicio: {producto or "no especificado"}
- Objetivo Meta: {objetivo or "OUTCOME_LEADS"}
- Tono de marca: {tono or "cercano y directo"}

TRANSCRIPCIÓN DEL VIDEO:
\"\"\"{transcripcion}\"\"\"

ÁNGULOS POSIBLES (elegí el más cercano al contenido):
{_ANGULOS_STR}

Respondé ÚNICAMENTE con un JSON válido con esta estructura:
{_JSON_SCHEMA}

En el campo "transcripcion" devolvé el texto del guión tal como te lo pasaron (limpio).
No agregues nada fuera del JSON."""

    try:
        import anthropic
        ant = anthropic.Anthropic(api_key=api_key)
        msg = ant.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1600,
            system=_INSTRUCCIONES_BASE,
            messages=[{"role": "user", "content": prompt}],
        )
        return _extract_json(msg.content[0].text)
    except (json.JSONDecodeError, ValueError):
        return _fallback_response(producto, "reel")
    except Exception as e:
        err = str(e)
        if any(k in err.lower() for k in ("credit", "quota", "billing")):
            return _fallback_response(producto, "reel")
        raise HTTPException(status_code=500, detail=f"Error al analizar: {err}")


# ── Fallback local ────────────────────────────────────────────────────────────

def _fallback_response(producto: str, formato: str) -> dict:
    p = producto or "este producto"
    return {
        "angulo_detectado": "Propuesta de valor directa",
        "angulo_razon": "Análisis en base al contexto del producto",
        "confianza": "baja",
        "transcripcion": None,
        "copy": {
            "headline": f"{p} — diferente a todo lo que viste",
            "primary_text": (
                f"¿Seguís buscando la opción correcta?\n\n"
                f"✅ {p} tiene todo lo que necesitás\n"
                f"✅ Sin complicaciones\n"
                f"✅ Resultados reales\n\n"
                f"Escribinos y te contamos todo 👇"
            ),
            "description": "Consultá sin compromiso",
            "cta": "Enviar mensaje",
            "hook_video": f'"Esto cambia todo sobre {p}..."',
        },
        "observaciones_creativo": (
            "Asegurate de que el texto visible sea mínimo (menos del 20% del área). "
            "El hook visual debe captar la atención en menos de 1 segundo."
        ),
        "sugerencias_adicionales": [
            "Versión con testimonial de cliente real",
            "Versión con ángulo de urgencia / cupos limitados",
        ],
    }
