# Meta Ads AI Dashboard

Dashboard inteligente para gestión y optimización de campañas de Meta Ads (Facebook / Instagram), con capa de IA integrada para análisis, recomendaciones y generación de copy creativo.

---

## Features

### Campañas
- Vista jerárquica: Campaña → Conjunto → Anuncio
- Métricas por período: hoy, 7 días, 30 días
- Semáforo de salud por campaña (verde / amarillo / rojo)
- Frecuencia y FTIR (First Time Impression Rate) por campaña y conjunto
- Creación de campañas directamente desde el dashboard

### Creativos
- Ranking de anuncios por CPA con badge automático: escalar, replicar, pausar, fatiga, mantener
- Clasificación por segmento FTIR: prospección, retargeting, mixto
- Análisis de imagen y video con IA (Claude / Gemini)
- Generación de briefs creativos con IA por ángulo y formato (imagen, carrusel, reel)
- Vista por conjunto / ángulo
- Acciones directas: pausar, escalar, replicar con modal de confirmación

### Pixel de Meta
- Detección automática de Pixel escaneando el sitio web
- Creación de nuevos Pixels directamente desde el dashboard
- Guía de instalación paso a paso:
  - HTML manual (snippet listo para pegar)
  - WordPress (plugin oficial de Meta + PixelYourSite)
  - Google Tag Manager
- Comparación entre pixels detectados y pixels vinculados a la cuenta

### Multi-cuenta
- Soporte para múltiples cuentas publicitarias por cliente
- Filtro por campaña por cuenta (ej: Climaset, WT, Global)
- Perfil de marca por cuenta con override por cuenta específica
- Selector de cuenta en sidebar

### Alertas inteligentes
- Detección automática de fatiga creativa, CPA alto, frecuencia elevada
- Feed de alertas con severidad (alta / media / baja)
- Alertas por ángulo de conjunto de anuncios

### Recomendaciones IA
- Análisis automático de todos los anuncios activos
- Recomendaciones priorizadas: escalar, pausar, replicar
- Brief del anuncio ganador generado con Claude

### Historial & Analytics
- Gráficos de evolución de inversión, CPA y conversiones
- Análisis avanzado con datos de GA4 y Search Console
- Benchmarks por industria
- Timeline de acciones ejecutadas

### Perfil de Marca
- Configuración de tono, público, propuesta de valor, beneficios
- Palabras a usar / evitar
- Contexto usado por la IA para generar copy más preciso

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | FastAPI + SQLAlchemy + SQLite |
| IA | Claude (Anthropic) + Gemini (Google) |
| Meta API | Graph API v19 |

---

## Instalación

### Requisitos previos
- Python 3.11+
- Node.js 18+
- Cuenta de Meta Business con acceso a la API

### 1. Clonar el repositorio

```bash
git clone https://github.com/renzogasparini85-bit/agente-meta-ads.git
cd agente-meta-ads
```

### 2. Configurar el backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Crear el archivo `backend/.env`:

```env
# Cliente por defecto (seed)
SEED_EMAIL=tu@email.com
SEED_PASSWORD=tupassword
SEED_NOMBRE=TuNombre

# Meta OAuth App
META_APP_ID=tu_app_id
META_APP_SECRET=tu_app_secret

# Meta Ads
META_ACCESS_TOKEN=tu_token_de_meta
META_AD_ACCOUNT_ID=act_XXXXXXXXXX

# Anthropic / Claude
ANTHROPIC_API_KEY=sk-ant-...

# Google (opcional)
GEMINI_API_KEY=...
GOOGLE_SHEET_ID=...
GA4_PROPERTY_ID=...
GA4_CREDENTIALS=google-analytics-credentials.json
SEARCH_CONSOLE_SITE=sc-domain:tusitio.com

# Telegram (opcional)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

Inicializar la base de datos:

```bash
python3 -c "from database import init_db; init_db()"
```

### 3. Configurar el frontend

```bash
cd ../frontend
npm install
```

### 4. Levantar el proyecto

**Backend** (puerto 8000):
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Frontend** (puerto 5173):
```bash
cd frontend
npm run dev
```

Abrí [http://localhost:5173](http://localhost:5173) y loguéate con las credenciales del `.env`.

---

## Token de Meta

El token de Meta Ads debe ser de larga duración (60 días). Para renovarlo:

1. Generá un token en [Graph API Explorer](https://developers.facebook.com/tools/explorer)
2. Permisos necesarios: `ads_read`, `ads_management`, `business_management`, `pages_read_engagement`
3. En la app, andá a **Gestión de Cuentas → Renovar token de Meta**
4. Pegá el token corto — se extiende automáticamente a 60 días

---

## Estructura del proyecto

```
agente-meta-ads/
├── backend/
│   ├── main.py                  # FastAPI app
│   ├── database.py              # Modelos SQLAlchemy
│   ├── auth.py                  # JWT auth
│   ├── requirements.txt
│   ├── routers/
│   │   ├── campaigns.py         # Árbol de campañas
│   │   ├── creatives.py         # Ranking de creativos
│   │   ├── recommendations.py   # IA recomendaciones + briefs
│   │   ├── pixel.py             # Pixel de Meta
│   │   ├── alerts.py            # Alertas
│   │   ├── clients.py           # Perfil de marca
│   │   └── ...
│   └── services/
│       └── meta_api.py          # Wrapper Graph API
└── frontend/
    ├── src/
    │   ├── pages/               # Campanas, Creativos, Pixel, etc.
    │   ├── components/          # Sidebar, AdSetRow, etc.
    │   ├── context/             # Auth, Account context
    │   └── services/api.js      # Axios client
    └── vite.config.js
```

---

## Variables de entorno opcionales

| Variable | Descripción |
|----------|-------------|
| `GEMINI_API_KEY` | Para análisis de imágenes con Gemini |
| `GOOGLE_SHEET_ID` | Export a Google Sheets |
| `GA4_PROPERTY_ID` | Datos de Google Analytics 4 |
| `TELEGRAM_BOT_TOKEN` | Notificaciones vía Telegram |
| `FRONTEND_URL` | URL del frontend en producción (para CORS) |
