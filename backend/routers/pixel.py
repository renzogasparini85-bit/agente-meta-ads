import re
import httpx
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, Client, AdAccount
from auth import get_current_client
from routers.account_resolver import resolve_account

router = APIRouter(prefix="/pixel", tags=["pixel"])

PIXEL_RE = re.compile(r"fbq\s*\(\s*['\"]init['\"]\s*,\s*['\"](\d+)['\"]", re.IGNORECASE)
NOSCRIPT_RE = re.compile(r"facebook\.com/tr\?id=(\d+)", re.IGNORECASE)


def _extract_pixels(html: str) -> List[str]:
    found = set(PIXEL_RE.findall(html)) | set(NOSCRIPT_RE.findall(html))
    return sorted(found)


async def _fetch_html(url: str) -> str:
    headers = {"User-Agent": "Mozilla/5.0 (compatible; MetaAdsBot/1.0)"}
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as c:
        r = await c.get(url, headers=headers)
        r.raise_for_status()
        return r.text


async def _get_account_pixels(ad_account_id: str, token: str) -> List[dict]:
    """Pixels vinculados a la cuenta de Meta Ads vía Graph API."""
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(
                f"https://graph.facebook.com/v19.0/{ad_account_id}/adspixels",
                params={"fields": "id,name,last_fired_time,is_unavailable", "access_token": token},
            )
            data = r.json()
            return data.get("data", [])
    except Exception:
        return []


class SitioWebBody(BaseModel):
    sitio_web: str
    account_id: Optional[str] = None


@router.get("/status")
async def pixel_status(
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """Retorna sitio_web guardado + pixels de Meta Ads para la cuenta."""
    ad_account_id, token, _, _, account_row = resolve_account(client, account_id, db)

    sitio_web = None
    if account_row and account_row.sitio_web:
        sitio_web = account_row.sitio_web
    elif client.sitio_web:
        sitio_web = client.sitio_web

    account_pixels = await _get_account_pixels(ad_account_id, token)

    return {
        "sitio_web":      sitio_web,
        "account_pixels": account_pixels,
        "detected":       None,  # se completa al hacer scan
    }


@router.post("/detect")
async def pixel_detect(
    body: SitioWebBody,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """Escanea el sitio web y detecta Pixels de Meta instalados."""
    url = body.sitio_web.strip()
    if not url.startswith("http"):
        url = "https://" + url

    try:
        html = await _fetch_html(url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"No se pudo acceder al sitio: {str(e)[:120]}")

    pixels = _extract_pixels(html)

    # Guardar sitio_web en DB
    ad_account_id, token, _, _, account_row = resolve_account(client, body.account_id, db)
    if account_row:
        account_row.sitio_web = url
    else:
        client.sitio_web = url
    db.commit()

    account_pixels = await _get_account_pixels(ad_account_id, token)
    account_pixel_ids = {p["id"] for p in account_pixels}

    resultado = []
    for pid in pixels:
        resultado.append({
            "pixel_id":   pid,
            "en_cuenta":  pid in account_pixel_ids,
            "nombre":     next((p["name"] for p in account_pixels if p["id"] == pid), None),
        })

    # Pixels en la cuenta pero NO detectados en el sitio
    no_detectados = [
        p for p in account_pixels if p["id"] not in {r["pixel_id"] for r in resultado}
    ]

    return {
        "url":            url,
        "detectados":     resultado,
        "no_detectados":  no_detectados,
        "ok":             len(resultado) > 0,
    }


class CreatePixelBody(BaseModel):
    nombre: str
    account_id: Optional[str] = None


@router.post("/create")
async def pixel_create(
    body: CreatePixelBody,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """Crea un nuevo Pixel de Meta en la cuenta publicitaria."""
    ad_account_id, token, _, _, _ = resolve_account(client, body.account_id, db)
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(
            f"https://graph.facebook.com/v19.0/{ad_account_id}/adspixels",
            data={"name": body.nombre, "access_token": token},
        )
        data = r.json()
    if "error" in data:
        raise HTTPException(status_code=400, detail=data["error"].get("message", "Error al crear pixel"))
    pixel_id = data.get("id")
    return {"ok": True, "pixel_id": pixel_id, "nombre": body.nombre}


@router.get("/snippet/{pixel_id}")
async def pixel_snippet(
    pixel_id: str,
    client: Client = Depends(get_current_client),
):
    """Retorna el snippet JS y noscript para instalar el pixel."""
    js = f"""<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{{if(f.fbq)return;n=f.fbq=function(){{n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)}};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '{pixel_id}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id={pixel_id}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->"""

    gtm = f"""<!-- GTM Custom HTML Tag -->
<script>
!function(f,b,e,v,n,t,s)
{{if(f.fbq)return;n=f.fbq=function(){{n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)}};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '{pixel_id}');
fbq('track', 'PageView');
</script>"""

    return {
        "pixel_id":    pixel_id,
        "snippet_js":  js,
        "snippet_gtm": gtm,
        "pixel_id_only": pixel_id,
    }


@router.put("/sitio-web")
async def save_sitio_web(
    body: SitioWebBody,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """Guarda la URL del sitio sin escanear."""
    _, _, _, _, account_row = resolve_account(client, body.account_id, db)
    url = body.sitio_web.strip()
    if url and not url.startswith("http"):
        url = "https://" + url
    if account_row:
        account_row.sitio_web = url
    else:
        client.sitio_web = url
    db.commit()
    return {"ok": True, "sitio_web": url}
