from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

DATABASE_URL = "sqlite:///./metaads.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
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

    # Umbrales de métricas GEM — estándar Ruta Pro 2026 (en moneda de la cuenta)
    cpmr_verde  = Column(Float, default=20.0)     # CPMr < este valor = eficiente (USD) / ajustar según moneda
    cpmr_rojo   = Column(Float, default=25.0)     # CPMr > este valor = rotar urgente
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
    tipo = Column(String, nullable=False)          # pause | budget_change | duplicate | create_campaign
    descripcion = Column(Text, nullable=False)
    meta_id = Column(String, nullable=True)
    resultado = Column(String, nullable=True)      # ok | error
    ejecutado_en = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
