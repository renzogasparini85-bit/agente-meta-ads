from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from database import init_db, SessionLocal, Client
from auth import hash_password
from routers.auth_router import router as auth_router
from routers.dashboard import router as dashboard_router
from routers.campaigns import router as campaigns_router
from routers.creatives import router as creatives_router
from routers.alerts import router as alerts_router
from routers.history import router as history_router
from routers.recommendations import router as recommendations_router
from routers.clients import router as clients_router
from routers.ad_accounts import router as ad_accounts_router
from routers.organic import router as organic_router
from routers.auth_meta import router as auth_meta_router
from routers.health_score import router as health_score_router
from routers.analytics import router as analytics_router
from routers.action_log_router import router as action_log_router
from routers.benchmarks import router as benchmarks_router
from routers.smart_alerts import router as smart_alerts_router
from routers.client_view import router as client_view_router
from routers.creative_analyze import router as creative_analyze_router
from routers.pixel import router as pixel_router

app = FastAPI(title="Meta Ads AI — Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:4173", os.getenv("FRONTEND_URL", "")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(campaigns_router)
app.include_router(creatives_router)
app.include_router(alerts_router)
app.include_router(history_router)
app.include_router(recommendations_router)
app.include_router(clients_router)
app.include_router(ad_accounts_router)
app.include_router(organic_router)
app.include_router(auth_meta_router)
app.include_router(health_score_router)
app.include_router(analytics_router)
app.include_router(action_log_router)
app.include_router(benchmarks_router)
app.include_router(smart_alerts_router)
app.include_router(client_view_router)
app.include_router(creative_analyze_router)
app.include_router(pixel_router)


@app.on_event("startup")
def startup():
    init_db()
    _seed_default_client()


def _seed_default_client():
    """
    Crea el cliente por defecto desde variables de entorno si no existe.
    Variables requeridas: SEED_EMAIL, SEED_PASSWORD, META_ACCESS_TOKEN, META_AD_ACCOUNT_ID
    Variables opcionales: SEED_NOMBRE, TELEGRAM_CHAT_ID
    """
    seed_email = os.getenv("SEED_EMAIL")
    if not seed_email:
        return  # No hay cliente por defecto configurado

    db = SessionLocal()
    try:
        existing = db.query(Client).filter(Client.email == seed_email).first()
        if not existing:
            client = Client(
                nombre=os.getenv("SEED_NOMBRE", seed_email.split("@")[0]),
                email=seed_email,
                password_hash=hash_password(os.getenv("SEED_PASSWORD", "changeme123")),
                meta_access_token=os.getenv("META_ACCESS_TOKEN", ""),
                meta_ad_account_id=os.getenv("META_AD_ACCOUNT_ID", ""),
                telegram_chat_id=os.getenv("TELEGRAM_CHAT_ID"),
            )
            db.add(client)
            db.commit()
            print(f"✓ Cliente '{client.nombre}' creado")
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
