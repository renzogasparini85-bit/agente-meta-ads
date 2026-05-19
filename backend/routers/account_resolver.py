from fastapi import HTTPException
from sqlalchemy.orm import Session
from database import AdAccount, Client


def resolve_account(client: Client, account_id: str | None, db: Session):
    """
    Devuelve (meta_ad_account_id, token, moneda, campaign_filter, account_row) para el account_id solicitado.
    Si account_id es None, usa la primera cuenta activa del cliente.
    """
    query = db.query(AdAccount).filter(
        AdAccount.client_id == client.id,
        AdAccount.activo == True,
    )
    if account_id:
        # Buscar por ID numérico de AdAccount (row.id) primero, luego por meta_ad_account_id
        try:
            row_id = int(account_id)
            account = query.filter(AdAccount.id == row_id).first()
        except (ValueError, TypeError):
            account = None

        if not account:
            acc_id = account_id if account_id.startswith("act_") else f"act_{account_id}"
            account = query.filter(AdAccount.meta_ad_account_id == acc_id).first()

        if not account:
            raise HTTPException(status_code=404, detail=f"Cuenta {account_id} no encontrada o sin acceso")
    else:
        account = query.order_by(AdAccount.creado_en).first()
        if not account:
            return client.meta_ad_account_id, client.meta_access_token, client.moneda, None, None

    return account.meta_ad_account_id, client.meta_access_token, account.moneda, account.campaign_filter, account
