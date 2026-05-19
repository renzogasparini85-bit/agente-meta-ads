from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, Client
from auth import verify_password, create_token

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    client_nombre: str
    client_id: int
    moneda: str = "ARS"
    cpa_escalar: float = 500.0
    cpa_replicar: float = 650.0
    cpa_pausar: float = 900.0


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.email == body.email, Client.activo == True).first()
    if not client or not verify_password(body.password, client.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email o contraseña incorrectos")
    token = create_token(client.id)
    return LoginResponse(
        access_token=token,
        client_nombre=client.nombre,
        client_id=client.id,
        moneda=client.moneda or "ARS",
        cpa_escalar=client.cpa_escalar or 500.0,
        cpa_replicar=client.cpa_replicar or 650.0,
        cpa_pausar=client.cpa_pausar or 900.0,
    )
