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
    gasto_minimo_juzgar: float = 3000.0
    ticket_promedio: float = None
    tasa_cierre: float = None
    roas_meta: float = 3.0
    cpmr_verde: float = 20.0
    cpmr_rojo: float = 25.0
    hook_verde: float = 25.0
    hook_rojo: float = 15.0
    freq_amarillo: float = 2.5
    freq_rojo: float = 3.5
    ctr_bueno: float = 2.0
    ctr_malo: float = 0.5
    conv_semana_rojo: float = 50.0
    conv_semana_verde: float = 100.0
    diversidad_amarillo: float = 40.0
    diversidad_rojo: float = 60.0


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
        gasto_minimo_juzgar=client.gasto_minimo_juzgar or 3000.0,
        ticket_promedio=client.ticket_promedio,
        tasa_cierre=client.tasa_cierre,
        roas_meta=client.roas_meta or 3.0,
        cpmr_verde=client.cpmr_verde or 20.0,
        cpmr_rojo=client.cpmr_rojo or 25.0,
        hook_verde=client.hook_verde or 25.0,
        hook_rojo=client.hook_rojo or 15.0,
        freq_amarillo=client.freq_amarillo or 2.5,
        freq_rojo=client.freq_rojo or 3.5,
        ctr_bueno=client.ctr_bueno or 2.0,
        ctr_malo=client.ctr_malo or 0.5,
        conv_semana_rojo=client.conv_semana_rojo or 50.0,
        conv_semana_verde=client.conv_semana_verde or 100.0,
        diversidad_amarillo=client.diversidad_amarillo or 40.0,
        diversidad_rojo=client.diversidad_rojo or 60.0,
    )
