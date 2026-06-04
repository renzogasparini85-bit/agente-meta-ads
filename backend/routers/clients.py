from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, Client, AdAccount, gem_defaults_por_moneda
from auth import hash_password, get_current_client
import os, json

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
