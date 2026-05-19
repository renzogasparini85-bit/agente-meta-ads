from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from database import Client, get_db
from auth import get_current_client
import httpx
import os

router = APIRouter(prefix="/auth/meta", tags=["auth_meta"])

APP_ID     = os.getenv("META_APP_ID", "")
APP_SECRET = os.getenv("META_APP_SECRET", "")


@router.post("/exchange-token")
async def exchange_token(
    short_token: str = Query(..., description="Token corto del Graph API Explorer"),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    async with httpx.AsyncClient() as http:
        r = await http.get(
            "https://graph.facebook.com/v20.0/oauth/access_token",
            params={
                "grant_type":        "fb_exchange_token",
                "client_id":         APP_ID,
                "client_secret":     APP_SECRET,
                "fb_exchange_token": short_token,
            },
        )
    data = r.json()
    if "error" in data:
        raise HTTPException(status_code=400, detail=data["error"].get("message", "Error al intercambiar token"))

    long_token  = data.get("access_token", short_token)
    expires_in  = data.get("expires_in", 0)
    expires_days = round(expires_in / 86400)

    client.meta_access_token = long_token
    db.commit()
    return {"ok": True, "expires_days": expires_days}
