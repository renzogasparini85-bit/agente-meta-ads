from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# PostgreSQL en producción (DATABASE_URL en .env), SQLite como fallback local
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./metaads.db")

# Render/Railway a veces devuelven "postgres://" — SQLAlchemy 2.x requiere "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

_is_sqlite = DATABASE_URL.startswith("sqlite")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    pool_pre_ping=True,  # reconecta si la conexión se cayó (importante en PG serverless)
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    meta_access_token = Column(String, nullable=False)
    meta_ad_account_id = Column(String, nullable=False)
    telegram_chat_id = Column(String, nullable=True)
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime, default=datetime.utcnow)

    # Umbrales configurables por cliente (moneda local del cliente)
    moneda = Column(String, default="ARS")
    cpa_escalar = Column(Float, default=500.0)
    cpa_replicar = Column(Float, default=650.0)
    cpa_pausar = Column(Float, default=900.0)
    gasto_minimo_juzgar = Column(Float, default=3000.0)

    # Umbrales de métricas GEM — se inicializan con gem_defaults_por_moneda() al crear el cliente
    cpmr_verde  = Column(Float, default=20.0)     # CPMr eficiente — valor en moneda local
    cpmr_rojo   = Column(Float, default=25.0)     # CPMr rotar urgente — valor en moneda local
    hook_verde  = Column(Float, default=25.0)     # Hook Rate > este valor = potente
    hook_rojo   = Column(Float, default=15.0)     # Hook Rate < este valor = rediseñar
    freq_amarillo = Column(Float, default=2.5)    # Frecuencia > este = preparar variaciones
    freq_rojo   = Column(Float, default=3.5)      # Frecuencia > este = fatiga crítica
    ctr_bueno   = Column(Float, default=2.0)      # CTR > este = escalar
    ctr_malo    = Column(Float, default=0.5)      # CTR < este + gasto = revisar
    conv_semana_rojo    = Column(Float, default=50.0)   # Conv/sem < este = consolidar CBO
    conv_semana_verde   = Column(Float, default=100.0)  # Conv/sem > este = escalar
    diversidad_amarillo = Column(Float, default=40.0)   # % ángulo dominante > este = atención
    diversidad_rojo     = Column(Float, default=60.0)   # % ángulo dominante > este = penalización

    # ROAS Híbrido — para clientes WhatsApp sin e-commerce
    ticket_promedio = Column(Float, nullable=True)   # $ promedio por venta cerrada
    tasa_cierre = Column(Float, nullable=True)        # % de mensajes que terminan en venta (0-100)
    roas_meta = Column(Float, default=3.0)            # ROAS objetivo del cliente

    # Perfil de marca — contexto para IA de copy
    marca_nombre = Column(String, nullable=True)
    marca_descripcion = Column(Text, nullable=True)       # qué hace la empresa
    marca_publico = Column(Text, nullable=True)           # cliente ideal
    marca_tono = Column(String, nullable=True)            # profesional | cercano | urgente | inspiracional | divertido
    marca_propuesta_valor = Column(Text, nullable=True)   # qué la hace diferente
    marca_beneficios = Column(Text, nullable=True)        # lista separada por líneas
    marca_palabras_si = Column(Text, nullable=True)       # palabras/frases a usar
    marca_palabras_no = Column(Text, nullable=True)       # palabras/frases a evitar
    marca_competidores = Column(Text, nullable=True)      # competidores de referencia
    sitio_web          = Column(Text, nullable=True)

    # Notificaciones externas
    notif_diaria_activa  = Column(Boolean, default=False)
    notif_hora           = Column(Integer, default=9)      # hora local Argentina para enviar (0-23)
    notif_email          = Column(String, nullable=True)   # email para alertas diarias
    # telegram_chat_id ya existe arriba — reutilizado para notificaciones

    ad_accounts     = relationship("AdAccount", back_populates="client")
    alerts          = relationship("Alert", back_populates="client")
    recommendations = relationship("Recommendation", back_populates="client")


class AdAccount(Base):
    __tablename__ = "ad_accounts"
    id                 = Column(Integer, primary_key=True, index=True)
    client_id          = Column(Integer, ForeignKey("clients.id"), nullable=False)
    nombre             = Column(String, nullable=False)       # nombre amigable
    meta_ad_account_id = Column(String, nullable=False)       # act_XXXXXXXXX
    moneda             = Column(String, default="ARS")
    color              = Column(String, default="violet")     # violet|orange|green|blue|cyan
    activo             = Column(Boolean, default=True)
    creado_en          = Column(DateTime, default=datetime.utcnow)
    meta_page_id       = Column(String, nullable=True)        # ID de Página de Facebook
    meta_ig_account_id = Column(String, nullable=True)        # ID de cuenta de Instagram Business
    campaign_filter    = Column(String, nullable=True)        # Filtro por nombre de campaña (para clientes dentro de un mismo ad account)
    brand_data         = Column(JSON, nullable=True)          # Perfil de marca propio de esta cuenta (override del cliente)
    sitio_web          = Column(Text, nullable=True)
    client             = relationship("Client", back_populates="ad_accounts")


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    tipo = Column(String, nullable=False)          # frecuencia | ctr_caida | cpa_alto | sin_conversion | pausa_auto
    mensaje = Column(Text, nullable=False)
    severidad = Column(String, default="media")    # alta | media | baja
    estado = Column(String, default="activa")      # activa | resuelta
    ad_id = Column(String, nullable=True)
    creado_en = Column(DateTime, default=datetime.utcnow)
    client = relationship("Client", back_populates="alerts")


class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    tipo = Column(String, nullable=False)          # escalar | pausar | replicar | joya
    titulo = Column(String, nullable=False)
    descripcion = Column(Text, nullable=False)
    accion = Column(Text, nullable=False)
    impacto = Column(String, default="Medio")      # Alto | Medio | Bajo
    ad_id = Column(String, nullable=True)
    ad_nombre = Column(String, nullable=True)
    generado_en = Column(DateTime, default=datetime.utcnow)
    client = relationship("Client", back_populates="recommendations")


class ActionLog(Base):
    __tablename__ = "action_logs"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, nullable=False)
    account_id = Column(Integer, ForeignKey("ad_accounts.id"), nullable=True)
    tipo = Column(String, nullable=False)          # pause | budget_change | duplicate | create_campaign
    descripcion = Column(Text, nullable=False)
    meta_id = Column(String, nullable=True)
    resultado = Column(String, nullable=True)      # ok | error
    ejecutado_en = Column(DateTime, default=datetime.utcnow)


class Hypothesis(Base):
    __tablename__ = "hypotheses"
    id              = Column(Integer, primary_key=True, index=True)
    client_id       = Column(Integer, ForeignKey("clients.id"), nullable=False)
    titulo          = Column(String, nullable=False)
    descripcion     = Column(Text, nullable=True)
    metrica         = Column(String, nullable=False)   # cpa | ctr | conv | spend | freq
    valor_antes     = Column(Float, nullable=True)     # valor actual al crear
    valor_objetivo  = Column(Float, nullable=True)     # valor esperado
    mejora_pct      = Column(Float, nullable=True)     # % mejora esperada
    dias_medicion   = Column(Integer, default=7)
    ad_id           = Column(String, nullable=True)    # entidad opcional a monitorear
    estado          = Column(String, default="activa") # activa | confirmada | refutada | vencida
    valor_final     = Column(Float, nullable=True)
    delta_real_pct  = Column(Float, nullable=True)
    creado_en       = Column(DateTime, default=datetime.utcnow)
    medido_en       = Column(DateTime, nullable=True)
    notas           = Column(Text, nullable=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def gem_defaults_por_moneda(moneda: str) -> dict:
    """
    Devuelve los umbrales GEM calibrados a la moneda del cliente.
    CPMr y CPA son los únicos sensibles a la moneda local.
    Hook Rate, CTR, Frecuencia y Diversidad son porcentajes — iguales para todos.
    """
    moneda = (moneda or "ARS").upper()

    # CPMr: costo por 1000 personas únicas alcanzadas
    # Fuente ARS: benchmark validado 2026 para mercado argentino
    #   Verde < $3.000  → subastas económicas, contenido relevante
    #   Amarillo $3.000–$7.000 → rango normal con audiencias segmentadas
    #   Rojo > $7.000   → fatiga, audiencia pequeña o alta competencia
    # Otras monedas: escaladas proporcionalmente desde ARS (ref: 1 USD ≈ 1.200 ARS)
    cpmr_por_moneda = {
        "USD": {"cpmr_verde": 2.5,     "cpmr_rojo": 6.0,     "cpa_escalar": 8.0,    "cpa_replicar": 12.0,  "cpa_pausar": 20.0,   "gasto_minimo": 5.0   },
        "ARS": {"cpmr_verde": 3000.0,  "cpmr_rojo": 7000.0,  "cpa_escalar": 5000.0, "cpa_replicar": 8000.0,"cpa_pausar": 15000.0,"gasto_minimo": 3000.0},
        "MXN": {"cpmr_verde": 45.0,    "cpmr_rojo": 105.0,   "cpa_escalar": 150.0,  "cpa_replicar": 250.0, "cpa_pausar": 400.0,  "gasto_minimo": 80.0  },
        "BRL": {"cpmr_verde": 12.0,    "cpmr_rojo": 29.0,    "cpa_escalar": 40.0,   "cpa_replicar": 70.0,  "cpa_pausar": 120.0,  "gasto_minimo": 20.0  },
        "CLP": {"cpmr_verde": 2700.0,  "cpmr_rojo": 6300.0,  "cpa_escalar": 6000.0, "cpa_replicar": 10000.0,"cpa_pausar": 18000.0,"gasto_minimo": 3000.0},
        "COP": {"cpmr_verde": 10000.0, "cpmr_rojo": 23000.0, "cpa_escalar": 30000.0,"cpa_replicar": 50000.0,"cpa_pausar": 90000.0,"gasto_minimo": 15000.0},
    }

    m = cpmr_por_moneda.get(moneda, cpmr_por_moneda["USD"])

    return {
        # CPMr — depende de moneda
        "cpmr_verde":  m["cpmr_verde"],
        "cpmr_rojo":   m["cpmr_rojo"],
        # CPA — depende de moneda (defaults genéricos; el cliente los ajusta a su negocio)
        "cpa_escalar":         m["cpa_escalar"],
        "cpa_replicar":        m["cpa_replicar"],
        "cpa_pausar":          m["cpa_pausar"],
        "gasto_minimo_juzgar": m["gasto_minimo"],
        # Métricas sin moneda — iguales para todos
        "hook_verde":          25.0,
        "hook_rojo":           15.0,
        "freq_amarillo":       2.5,
        "freq_rojo":           3.5,
        "ctr_bueno":           2.0,
        "ctr_malo":            0.5,
        "conv_semana_rojo":    50.0,
        "conv_semana_verde":   100.0,
        "diversidad_amarillo": 40.0,
        "diversidad_rojo":     60.0,
    }


def init_db():
    Base.metadata.create_all(bind=engine)
