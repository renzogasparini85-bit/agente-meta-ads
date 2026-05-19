from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, Client, AdAccount
from auth import get_current_client
from services.meta_api import meta_get

router = APIRouter(prefix="/ad-accounts", tags=["ad_accounts"])

COLORES = {"violet", "orange", "green", "blue", "cyan", "red"}


class AdAccountCreate(BaseModel):
    nombre: str
    meta_ad_account_id: str
    moneda: str = "ARS"
    color: str = "violet"
    campaign_filter: str = None


class AdAccountUpdate(BaseModel):
    nombre: str = None
    moneda: str = None
    color: str = None
    activo: bool = None
    meta_page_id: str = None
    meta_ig_account_id: str = None
    campaign_filter: str = None


@router.get("")
def list_accounts(
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    accounts = db.query(AdAccount).filter(AdAccount.client_id == client.id).order_by(AdAccount.creado_en).all()
    return [
        {
            "id":                  a.id,
            "nombre":              a.nombre,
            "meta_ad_account_id":  a.meta_ad_account_id,
            "moneda":              a.moneda,
            "color":               a.color,
            "activo":              a.activo,
            "meta_page_id":        a.meta_page_id,
            "meta_ig_account_id":  a.meta_ig_account_id,
            "campaign_filter":     a.campaign_filter,
        }
        for a in accounts
    ]


@router.post("")
def create_account(
    body: AdAccountCreate,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    account_id = body.meta_ad_account_id
    if not account_id.startswith("act_"):
        account_id = f"act_{account_id}"

    # Solo bloquear duplicado si tienen el mismo nombre (mismo cliente)
    existing = db.query(AdAccount).filter(
        AdAccount.client_id == client.id,
        AdAccount.meta_ad_account_id == account_id,
        AdAccount.nombre == body.nombre,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese nombre e ID")

    acc = AdAccount(
        client_id=client.id,
        nombre=body.nombre,
        meta_ad_account_id=account_id,
        moneda=body.moneda,
        color=body.color if body.color in COLORES else "violet",
        campaign_filter=body.campaign_filter or None,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return {"id": acc.id, "nombre": acc.nombre, "meta_ad_account_id": acc.meta_ad_account_id}


@router.put("/{account_id}")
def update_account(
    account_id: int,
    body: AdAccountUpdate,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    acc = db.query(AdAccount).filter(AdAccount.id == account_id, AdAccount.client_id == client.id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    if body.nombre             is not None: acc.nombre             = body.nombre
    if body.moneda             is not None: acc.moneda             = body.moneda
    if body.color              is not None: acc.color              = body.color if body.color in COLORES else acc.color
    if body.activo             is not None: acc.activo             = body.activo
    if body.meta_page_id       is not None: acc.meta_page_id       = body.meta_page_id or None
    if body.meta_ig_account_id is not None: acc.meta_ig_account_id = body.meta_ig_account_id or None
    if body.campaign_filter    is not None: acc.campaign_filter    = body.campaign_filter or None
    db.commit()
    return {"ok": True}


@router.get("/pages-from-meta")
async def pages_from_meta(
    client: Client = Depends(get_current_client),
):
    """Lista las páginas de Facebook accesibles con el token, con su cuenta IG conectada."""
    if client.meta_access_token == "DEMO":
        return []
    try:
        data = await meta_get(
            "me/accounts",
            {"fields": "id,name,instagram_business_account", "limit": "50"},
            client.meta_access_token,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al consultar Meta: {str(e)}")

    return [
        {
            "page_id":   p["id"],
            "nombre":    p["name"],
            "ig_id":     p.get("instagram_business_account", {}).get("id"),
        }
        for p in data.get("data", [])
    ]


@router.get("/verify-meta")
async def verify_meta_account(
    account_id: str,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """Verifica que el token del cliente tiene acceso a un ad account específico."""
    acc_id = account_id if account_id.startswith("act_") else f"act_{account_id}"
    try:
        data = await meta_get(
            acc_id,
            {"fields": "name,account_id,currency,account_status"},
            client.meta_access_token,
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail="No se encontró la cuenta o no tenés acceso con este token")

    STATUS_MAP = {1: "activa", 2: "deshabilitada", 3: "sin verificar", 7: "archivada", 9: "bloqueada", 101: "cerrada"}
    return {
        "account_id":  acc_id,
        "nombre":      data.get("name") or acc_id,
        "moneda":      data.get("currency", "ARS"),
        "status":      STATUS_MAP.get(data.get("account_status"), "activa"),
        "ya_agregada": False,  # Permitir agregar el mismo account múltiples veces con distintos clientes
    }


@router.get("/from-meta")
async def list_from_meta(
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    """Trae todas las cuentas publicitarias accesibles con el token del cliente."""
    if client.meta_access_token == "DEMO":
        return []
    try:
        data = await meta_get(
            "me/adaccounts",
            {"fields": "name,account_id,currency,account_status"},
            client.meta_access_token,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al consultar Meta: {str(e)}")

    existing_ids = {
        a.meta_ad_account_id
        for a in db.query(AdAccount).filter(AdAccount.client_id == client.id).all()
    }

    STATUS_MAP = {1: "activa", 2: "deshabilitada", 3: "sin verificar", 7: "archivada", 9: "bloqueada", 101: "cerrada"}

    return [
        {
            "account_id":  a["id"],
            "nombre":      a.get("name") or a["account_id"],
            "moneda":      a.get("currency", "ARS"),
            "status":      STATUS_MAP.get(a.get("account_status"), "activa"),
            "ya_agregada": a["id"] in existing_ids,
        }
        for a in data.get("data", [])
    ]


@router.delete("/{account_id}")
def delete_account(
    account_id: int,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    accounts = db.query(AdAccount).filter(AdAccount.client_id == client.id, AdAccount.activo == True).count()
    if accounts <= 1:
        raise HTTPException(status_code=400, detail="Debés tener al menos una cuenta activa")
    acc = db.query(AdAccount).filter(AdAccount.id == account_id, AdAccount.client_id == client.id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    db.delete(acc)
    db.commit()
    return {"ok": True}
