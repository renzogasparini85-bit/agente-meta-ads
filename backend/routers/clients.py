from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, Client, AdAccount, gem_defaults_por_moneda
from auth import hash_password, get_current_client
from routers.account_resolver import resolve_account
from services.meta_api import get_ad_insights
import os, json, statistics

router = APIRouter(prefix="/clients", tags=["clients"])

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")


def require_admin(client: Client = Depends(get_current_client)):
    if client.email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Solo admins pueden acceder a este endpoint")
    return client


class CreateClientRequest(BaseModel):
    nombre: str
    email: str
    password: str
    meta_access_token: str
    meta_ad_account_id: str
    telegram_chat_id: str = None


class UpdateTokenRequest(BaseModel):
    meta_access_token: str


class MetaCredentialsRequest(BaseModel):
    meta_access_token: str = None
    meta_ad_account_id: str = None


class UpdateSettingsRequest(BaseModel):
    moneda: str = None
    cpa_escalar: float = None
    cpa_replicar: float = None
    cpa_pausar: float = None
    gasto_minimo_juzgar: float = None
    ticket_promedio: float = None
    tasa_cierre: float = None
    roas_meta: float = None
    # Umbrales GEM
    cpmr_verde: float = None
    cpmr_rojo: float = None
    hook_verde: float = None
    hook_rojo: float = None
    freq_amarillo: float = None
    freq_rojo: float = None
    ctr_bueno: float = None
    ctr_malo: float = None
    conv_semana_rojo: float = None
    conv_semana_verde: float = None
    diversidad_amarillo: float = None
    diversidad_rojo: float = None


class UpdateBrandRequest(BaseModel):
    marca_nombre: str = None
    marca_descripcion: str = None
    marca_publico: str = None
    marca_tono: str = None
    marca_propuesta_valor: str = None
    marca_beneficios: str = None
    marca_palabras_si: str = None
    marca_palabras_no: str = None
    marca_competidores: str = None


BRAND_FIELDS = [
    "marca_nombre", "marca_descripcion", "marca_publico", "marca_tono",
    "marca_propuesta_valor", "marca_beneficios", "marca_palabras_si",
    "marca_palabras_no", "marca_competidores",
]

def _client_brand(client: Client) -> dict:
    return {f: getattr(client, f) for f in BRAND_FIELDS}

def _resolve_account(client: Client, account_id, db: Session):
    """Devuelve AdAccount si account_id es válido y pertenece al cliente, sino None."""
    if not account_id:
        return None
    try:
        row_id = int(account_id)
        return db.query(AdAccount).filter_by(id=row_id, client_id=client.id, activo=True).first()
    except (ValueError, TypeError):
        return None


def normalize_meta_account_id(account_id: str | None) -> str | None:
    account_id = (account_id or "").strip()
    if not account_id:
        return None
    return account_id if account_id.startswith("act_") else f"act_{account_id}"


def _token_preview(token: str | None) -> str | None:
    token = token or ""
    if not token:
        return None
    if len(token) <= 12:
        return "••••"
    return f"{token[:6]}...{token[-4:]}"


@router.get("/me/meta")
def get_my_meta(client: Client = Depends(get_current_client)):
    return {
        "meta_configured": bool(client.meta_access_token and client.meta_ad_account_id),
        "has_token": bool(client.meta_access_token),
        "token_preview": _token_preview(client.meta_access_token),
        "meta_ad_account_id": client.meta_ad_account_id or "",
    }


@router.put("/me/meta")
def update_my_meta(
    body: MetaCredentialsRequest,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    if body.meta_access_token is not None:
        client.meta_access_token = body.meta_access_token.strip()

    account_id = normalize_meta_account_id(body.meta_ad_account_id)
    if body.meta_ad_account_id is not None:
        client.meta_ad_account_id = account_id or ""

    if account_id:
        existing_accounts = db.query(AdAccount).filter(
            AdAccount.client_id == client.id,
            AdAccount.meta_ad_account_id == account_id,
        ).count()
        if existing_accounts == 0:
            db.add(AdAccount(
                client_id=client.id,
                nombre=f"Cuenta {account_id}",
                meta_ad_account_id=account_id,
                moneda=client.moneda or "ARS",
                color="violet",
            ))

    db.commit()
    return {
        "ok": True,
        "meta_configured": bool(client.meta_access_token and client.meta_ad_account_id),
        "has_token": bool(client.meta_access_token),
        "token_preview": _token_preview(client.meta_access_token),
        "meta_ad_account_id": client.meta_ad_account_id or "",
    }


@router.get("/me/brand")
def get_my_brand(
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    account = _resolve_account(client, account_id, db)
    if account and account.brand_data:
        # Mezcla: base del cliente + overrides de la cuenta
        base = _client_brand(client)
        base.update({k: v for k, v in account.brand_data.items() if v is not None})
        return {**base, "account_id": account.id, "account_nombre": account.nombre}
    base = _client_brand(client)
    if account:
        base["account_id"] = account.id
        base["account_nombre"] = account.nombre
    return base


@router.put("/me/brand")
def update_my_brand(
    body: UpdateBrandRequest,
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    fields = body.model_dump(exclude_none=True)
    account = _resolve_account(client, account_id, db)
    if account:
        # Guardar en brand_data de la cuenta (JSON)
        existing = account.brand_data or {}
        existing.update(fields)
        account.brand_data = existing
        db.commit()
        base = _client_brand(client)
        base.update({k: v for k, v in account.brand_data.items() if v is not None})
        return {"ok": True, "scope": "account", "account_nombre": account.nombre, **base}
    # Sin account_id → guardar en el cliente (perfil global)
    for k, v in fields.items():
        setattr(client, k, v)
    db.commit()
    return {"ok": True, "scope": "global", **_client_brand(client)}


@router.get("/me/settings")
def get_my_settings(client: Client = Depends(get_current_client)):
    return {
        "moneda": client.moneda,
        "cpa_escalar": client.cpa_escalar,
        "cpa_replicar": client.cpa_replicar,
        "cpa_pausar": client.cpa_pausar,
        "gasto_minimo_juzgar": client.gasto_minimo_juzgar,
        "ticket_promedio": client.ticket_promedio,
        "tasa_cierre": client.tasa_cierre,
        "roas_meta": client.roas_meta,
        "cpmr_verde": client.cpmr_verde,
        "cpmr_rojo": client.cpmr_rojo,
        "hook_verde": client.hook_verde,
        "hook_rojo": client.hook_rojo,
        "freq_amarillo": client.freq_amarillo,
        "freq_rojo": client.freq_rojo,
        "ctr_bueno": client.ctr_bueno,
        "ctr_malo": client.ctr_malo,
        "conv_semana_rojo": client.conv_semana_rojo,
        "conv_semana_verde": client.conv_semana_verde,
        "diversidad_amarillo": client.diversidad_amarillo,
        "diversidad_rojo": client.diversidad_rojo,
    }


@router.put("/me/settings")
def update_my_settings(
    body: UpdateSettingsRequest,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    fields = [
        'moneda','cpa_escalar','cpa_replicar','cpa_pausar','gasto_minimo_juzgar',
        'ticket_promedio','tasa_cierre','roas_meta',
        'cpmr_verde','cpmr_rojo','hook_verde','hook_rojo',
        'freq_amarillo','freq_rojo','ctr_bueno','ctr_malo',
        'conv_semana_rojo','conv_semana_verde','diversidad_amarillo','diversidad_rojo',
    ]

    # Si cambia la moneda y no se enviaron umbrales nuevos, recalibrar automáticamente
    nueva_moneda = getattr(body, 'moneda', None)
    if nueva_moneda and nueva_moneda.upper() != (client.moneda or 'ARS').upper():
        payload_tiene_cpmr = getattr(body, 'cpmr_verde', None) is not None
        if not payload_tiene_cpmr:
            defaults = gem_defaults_por_moneda(nueva_moneda)
            for k, v in defaults.items():
                setattr(client, k, v)

    for f in fields:
        val = getattr(body, f, None)
        if val is not None:
            setattr(client, f, val)
    db.commit()
    return {
        "ok": True,
        "moneda": client.moneda,
        "cpa_escalar": client.cpa_escalar,
        "cpa_replicar": client.cpa_replicar,
        "cpa_pausar": client.cpa_pausar,
        "gasto_minimo_juzgar": client.gasto_minimo_juzgar,
        "ticket_promedio": client.ticket_promedio,
        "tasa_cierre": client.tasa_cierre,
        "roas_meta": client.roas_meta,
        "cpmr_verde": client.cpmr_verde,
        "cpmr_rojo": client.cpmr_rojo,
        "hook_verde": client.hook_verde,
        "hook_rojo": client.hook_rojo,
        "freq_amarillo": client.freq_amarillo,
        "freq_rojo": client.freq_rojo,
        "ctr_bueno": client.ctr_bueno,
        "ctr_malo": client.ctr_malo,
        "conv_semana_rojo": client.conv_semana_rojo,
        "conv_semana_verde": client.conv_semana_verde,
        "diversidad_amarillo": client.diversidad_amarillo,
        "diversidad_rojo": client.diversidad_rojo,
    }


def _pct(values: list, p: float) -> float:
    """Percentil simple (0-1). Lista debe estar ordenada."""
    if not values:
        return 0.0
    idx = max(0, min(len(values) - 1, int(len(values) * p)))
    return round(values[idx], 2)


def _calibrar_metrica(values: list, mayor_es_mejor: bool) -> dict | None:
    """
    Devuelve {verde, rojo, fuente} para una métrica.
    mayor_es_mejor=True  → verde=p75, rojo=p25  (CTR, Hook Rate)
    mayor_es_mejor=False → verde=p25, rojo=p75  (CPMr, Frecuencia)
    """
    n = len(values)
    if n < 5:
        return None
    values = sorted(values)
    if n >= 10:
        fuente = "percentil_25_75"
        if mayor_es_mejor:
            verde = _pct(values, 0.75)
            rojo  = _pct(values, 0.25)
        else:
            verde = _pct(values, 0.25)
            rojo  = _pct(values, 0.75)
    else:
        fuente = "mediana_30pct"
        med = statistics.median(values)
        if mayor_es_mejor:
            verde = round(med * 1.30, 2)
            rojo  = round(med * 0.70, 2)
        else:
            verde = round(med * 0.70, 2)
            rojo  = round(med * 1.30, 2)
    # Garantizar verde != rojo
    if verde == rojo:
        rojo = round(verde * (1.5 if not mayor_es_mejor else 0.67), 2)
    return {"verde": verde, "rojo": rojo, "fuente": fuente, "n": n}


@router.post("/me/calibrate")
async def calibrate_thresholds(
    apply: bool = Query(False),
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """
    Calibra todos los umbrales GEM desde el historial real (últimos 90 días):
    CPMr, Hook Rate, CTR, Frecuencia.
    Con apply=true guarda los valores en DB.
    """
    meta_account_id, token, _, _, _ = resolve_account(client, account_id, db)
    defaults = gem_defaults_por_moneda(client.moneda or "ARS")

    try:
        ads = await get_ad_insights(meta_account_id, token, days=90)
    except Exception:
        return {"fuente": "defaults", "motivo": "Error Meta API", "n_ads": 0, **defaults}

    cpmr_vals, hook_vals, ctr_vals, freq_vals = [], [], [], []

    for a in ads:
        spend = float(a.get("spend") or 0)
        reach = float(a.get("reach") or 0)
        impr  = float(a.get("impressions") or 0)
        ctr   = float(a.get("ctr") or 0)
        freq  = float(a.get("frequency") or 0)

        if spend > 0 and reach > 0:
            cpmr_vals.append(spend / reach * 1000)

        # Hook Rate: sum video_p25 / impressions × 100
        vp25_actions = a.get("video_p25_watched_actions") or []
        vp25 = sum(float(x.get("value") or 0) for x in vp25_actions)
        if impr > 0 and vp25 > 0:
            hook_vals.append(vp25 / impr * 100)

        if ctr > 0:
            ctr_vals.append(ctr)
        if freq > 0:
            freq_vals.append(freq)

    resultado = {"n_ads": len(ads), "aplicado": apply, "metricas": {}}

    calibraciones = {
        "cpmr":  (_calibrar_metrica(cpmr_vals, mayor_es_mejor=False), "cpmr_verde",  "cpmr_rojo"),
        "hook":  (_calibrar_metrica(hook_vals, mayor_es_mejor=True),  "hook_verde",  "hook_rojo"),
        "ctr":   (_calibrar_metrica(ctr_vals,  mayor_es_mejor=True),  "ctr_bueno",   "ctr_malo"),
        "freq":  (_calibrar_metrica(freq_vals, mayor_es_mejor=False), "freq_amarillo","freq_rojo"),
    }

    for nombre, (cal, campo_verde, campo_rojo) in calibraciones.items():
        if cal:
            resultado["metricas"][nombre] = {
                "verde": cal["verde"], "rojo": cal["rojo"],
                "fuente": cal["fuente"], "n": cal["n"],
                campo_verde: cal["verde"], campo_rojo: cal["rojo"],
            }
            if apply:
                setattr(client, campo_verde, cal["verde"])
                setattr(client, campo_rojo,  cal["rojo"])
        else:
            n_disponible = len({"cpmr": cpmr_vals,"hook": hook_vals,"ctr": ctr_vals,"freq": freq_vals}[nombre])
            resultado["metricas"][nombre] = {
                "fuente": "defaults",
                "motivo": f"Insuficiente historial ({n_disponible} anuncios)",
                campo_verde: defaults.get(campo_verde),
                campo_rojo:  defaults.get(campo_rojo),
            }

    if apply:
        db.commit()

    # Atajos al nivel raíz para compatibilidad con el frontend actual
    cpmr = resultado["metricas"].get("cpmr", {})
    resultado["cpmr_verde"] = cpmr.get("cpmr_verde", defaults["cpmr_verde"])
    resultado["cpmr_rojo"]  = cpmr.get("cpmr_rojo",  defaults["cpmr_rojo"])
    resultado["fuente"]     = cpmr.get("fuente", "defaults")
    resultado["motivo"]     = f"Calibrado desde {len(ads)} anuncios · 90 días"

    return resultado


@router.post("")
def create_client(
    body: CreateClientRequest,
    db: Session = Depends(get_db),
    admin: Client = Depends(require_admin),
):
    existing = db.query(Client).filter(Client.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe un cliente con ese email")

    moneda = (body.moneda or "ARS").upper()
    defaults = gem_defaults_por_moneda(moneda)

    client = Client(
        nombre=body.nombre,
        email=body.email,
        password_hash=hash_password(body.password),
        meta_access_token=body.meta_access_token,
        meta_ad_account_id=body.meta_ad_account_id,
        telegram_chat_id=body.telegram_chat_id,
        moneda=moneda,
        **defaults,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return {"id": client.id, "nombre": client.nombre, "email": client.email}


@router.put("/{client_id}/token")
def update_token(
    client_id: int,
    body: UpdateTokenRequest,
    db: Session = Depends(get_db),
    admin: Client = Depends(require_admin),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    client.meta_access_token = body.meta_access_token
    db.commit()
    return {"ok": True, "client_id": client_id}


@router.get("/me")
def me(client: Client = Depends(get_current_client)):
    return {
        "id": client.id,
        "nombre": client.nombre,
        "email": client.email,
        "meta_ad_account_id": client.meta_ad_account_id,
    }
