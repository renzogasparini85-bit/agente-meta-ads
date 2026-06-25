from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os, asyncio, logging
from datetime import datetime
from zoneinfo import ZoneInfo
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from services.notification_schedule import should_notify_client

load_dotenv()

logger = logging.getLogger(__name__)

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
from routers.brief import router as brief_router
from routers.strategy import router as strategy_router
from routers.hypotheses import router as hypotheses_router

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
app.include_router(brief_router)
app.include_router(strategy_router)
app.include_router(hypotheses_router)


scheduler = AsyncIOScheduler()


@app.on_event("startup")
async def startup():
    init_db()
    _seed_default_client()
    _start_scheduler()


@app.on_event("shutdown")
def shutdown():
    if scheduler.running:
        scheduler.shutdown()


def _start_scheduler():
    """Ejecuta el job cada hora; cada cliente conserva su horario local."""
    scheduler.add_job(
        _job_alertas_diarias,
        CronTrigger(minute=0),
        id="alertas_diarias",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler iniciado — evaluación de alertas cada hora")


async def _job_alertas_diarias():
    """
    Job diario: escanea todos los clientes con notificaciones activas
    y envía por Telegram y/o Email si hay alertas.
    """
    from routers.smart_alerts import _scan_client
    from database import Alert
    from services.notificaciones import (
        enviar_telegram, enviar_email,
        formatear_alerta_telegram, formatear_alerta_email_html,
    )

    db = SessionLocal()
    try:
        timezone_name = os.getenv("NOTIF_TIMEZONE", "America/Argentina/Buenos_Aires")
        local_hour = datetime.now(ZoneInfo(timezone_name)).hour
        clientes = db.query(Client).filter(
            Client.activo == True,
            Client.notif_diaria_activa == True,
        ).all()
        clientes = [client for client in clientes if should_notify_client(client, local_hour)]

        logger.info(f"[Cron alertas] {len(clientes)} cliente(s) programados para las {local_hour}:00")

        for client in clientes:
            tiene_telegram = bool(client.telegram_chat_id)
            tiene_email    = bool(getattr(client, "notif_email", None))
            if not tiene_telegram and not tiene_email:
                continue

            try:
                n = await _scan_client(client, db)
                db.commit()

                alertas = db.query(Alert).filter(
                    Alert.client_id == client.id,
                    Alert.estado == "activa",
                ).order_by(Alert.creado_en.desc()).limit(10).all()

                if not alertas:
                    logger.info(f"[Cron] {client.nombre} — sin alertas, no se envía")
                    continue

                alertas_dict = [{"tipo": a.tipo, "mensaje": a.mensaje, "severidad": a.severidad} for a in alertas]

                if tiene_telegram:
                    texto = formatear_alerta_telegram(client.nombre, alertas_dict, client.moneda or "ARS")
                    r = await enviar_telegram(client.telegram_chat_id, texto)
                    if r["ok"]:
                        logger.info(f"[Cron] Telegram enviado a {client.nombre}")
                    else:
                        logger.error(f"[Cron] Telegram error {client.nombre}: {r.get('error')}")

                if tiene_email:
                    subject, html = formatear_alerta_email_html(client.nombre, alertas_dict)
                    r = enviar_email(client.notif_email, subject, html)
                    if r["ok"]:
                        logger.info(f"[Cron] Email enviado a {client.nombre} ({client.notif_email})")
                    else:
                        logger.error(f"[Cron] Email error {client.nombre}: {r.get('error')}")

            except Exception as e:
                logger.error(f"[Cron] Error procesando {client.nombre}: {e}")
    finally:
        db.close()


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
