# Dashboard SaaS Multi-Tenant — Arquitectura y Contexto

## Contexto del proyecto

Este dashboard es el producto visual del agente de Meta Ads con IA que ya está corriendo en producción para IFPA (ifpa.edu.ar). El objetivo es convertirlo en un SaaS vendible a múltiples clientes — agencias, institutos educativos, ecommerces — donde cada cliente ve solo sus propios datos.

**Diferencial vs competidores (ej. dashbo.io):** No solo muestra métricas, las interpreta. El sistema detecta creativos ganadores, genera briefs con copies listos, y entrega recomendaciones accionables basadas en IA.

---

## Stack tecnológico

| Capa | Tecnología | Motivo |
|------|-----------|--------|
| Frontend | React + Vite + Tailwind CSS + Recharts | Rápido, responsive, ecosistema amplio |
| Backend | FastAPI (Python) | Ya existe código en Python para el agente |
| Base de datos | SQLite → PostgreSQL cuando escale | Simple para empezar |
| Auth | JWT por cliente | Cada cliente tiene sus propias credenciales |
| Deploy frontend | Vercel | Deploy automático, CDN global |
| Deploy backend | Railway | Simple, soporta Python, bajo costo |

---

## Arquitectura general

```
┌─────────────────────────────────────────┐
│  React Frontend (Vite)                  │
│  - Login por cliente                    │
│  - Dashboard con métricas               │
│  - Historial y tendencias               │
│  - Responsive (mobile/desktop/TV)       │
└──────────────┬──────────────────────────┘
               │ HTTP / REST + JWT
┌──────────────▼──────────────────────────┐
│  FastAPI Backend (Python)               │
│  - Auth JWT por cliente                 │
│  - Conecta a Meta Graph API             │
│  - Guarda historial en DB               │
│  - Expone datos del agente de IA        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Base de datos (SQLite / PostgreSQL)    │
│  - Clientes + sus tokens de Meta        │
│  - Snapshots diarios de métricas        │
│  - Alertas e historial de anuncios      │
│  - Recomendaciones generadas por IA     │
└─────────────────────────────────────────┘
```

---

## Multi-tenancy

Cada cliente tiene:
- `id`, `nombre`, `email`, `password_hash`
- `meta_access_token` (token de 60 días de Meta Graph API)
- `meta_ad_account_id` (ej. `act_3588452974767128`)
- `telegram_chat_id` (opcional, para reportes por Telegram)

El backend filtra todos los datos por `client_id` extraído del JWT. Un cliente nunca puede ver datos de otro.

---

## Pantallas del dashboard

### 1. Login
- Email + password
- JWT almacenado en localStorage
- Redirect automático al dashboard del cliente

### 2. Overview (Home)
- KPIs del período seleccionable (hoy / 7d / 30d):
  - Gasto total
  - Conversaciones (leads WhatsApp)
  - CPA promedio
  - CTR promedio
  - Frecuencia promedio
- Comparativa vs período anterior (% de cambio)
- Semáforo de salud por campaña (verde / amarillo / rojo)
- Feed de alertas activas (anuncios problemáticos)

### 3. Campañas
- Tabla con todas las campañas activas
- Columnas: nombre, objetivo, gasto, impresiones, CTR, CPC, conversaciones, CPA, frecuencia, estado
- Filtros: fecha, sede/campaña, objetivo
- Click en campaña → detalle con adsets y anuncios

### 4. Creativos
- Ranking de anuncios por CPA (mejor → peor)
- Badge por anuncio: 🏆 Escalar / ⏸️ Pausar / 🔁 Replicar / ⚠️ Fatiga
- Indicador de frecuencia con alerta si > 2.5
- Días corriendo por anuncio
- Preview del nombre del creativo

### 5. Historial y tendencias
- Gráfico de línea: CPA, gasto y conversaciones en el tiempo
- Selección de rango de fechas
- Filtro por campaña o vista agregada
- Comparativa entre campañas

### 6. Alertas
- Feed cronológico de alertas generadas por el agente:
  - Anuncio gastando sin conversiones
  - Frecuencia alta (> 2.5)
  - CTR en caída sostenida
  - CPA por encima del umbral
  - Anuncio pausado automáticamente
- Estado: activa / resuelta
- Posibilidad de marcar como vista

### 7. Recomendaciones IA (diferencial clave)
- Sección generada por el agente Claude
- Lista de acciones concretas: escalar X, pausar Y, replicar Z
- Brief de creativos con copies listos para el diseñador
- Análisis de joyas ocultas (CPA excepcional con bajo presupuesto)

---

## Métricas clave a mostrar

| Métrica | Por qué importa |
|---------|----------------|
| CPA (Costo por conversación) | Eficiencia de cada peso invertido |
| Gasto | Control de presupuesto |
| Conversaciones iniciadas | Resultado real del negocio |
| CTR | Calidad del creativo |
| Frecuencia | Alerta de fatiga de audiencia |
| CPC | Costo de atención |
| Días corriendo | Contexto para tomar decisiones |

---

## API endpoints del backend (FastAPI)

```
POST /auth/login                  → JWT
GET  /dashboard/overview          → KPIs del período
GET  /campaigns                   → Lista de campañas activas
GET  /campaigns/{id}/adsets       → Adsets de una campaña
GET  /campaigns/{id}/ads          → Anuncios con métricas
GET  /creatives/ranking           → Ranking por CPA
GET  /alerts                      → Alertas activas
GET  /history?start=&end=         → Datos históricos
GET  /recommendations             → Recomendaciones IA
POST /clients                     → Crear nuevo cliente (admin)
PUT  /clients/{id}/token          → Actualizar token de Meta
```

---

## Diseño visual

- **Estética:** limpia y profesional, similar a dashbo.io pero con capa de IA visible
- **Colores:** fondo oscuro (#0F0F0F o #111827) con acentos en violeta (#6B21A8) y naranja (#FF6B00) — misma paleta del agente IFPA
- **Tipografía:** Inter o Geist, tamaños grandes para métricas
- **Responsive:** mobile-first, funciona en celular, tablet, desktop y pantalla TV
- **Gráficos:** Recharts (librería React, ligera y customizable)
- **Componentes:** shadcn/ui o Radix UI para consistencia

---

## Referencia de producto competidor

**dashbo.io** — dashboard para agencias con múltiples clientes y plataformas.  
Lo que tienen: control de presupuesto, alertas, multi-plataforma (Google, Meta, TikTok, LinkedIn).  
Lo que nosotros agregamos: análisis con IA, ranking de creativos con recomendación, brief generado automáticamente, detección de joyas ocultas.

---

## Contexto técnico existente

El agente ya corre en producción con:
- `META_ACCESS_TOKEN` y `META_AD_ACCOUNT_ID` en `.env`
- Llamadas directas a Meta Graph API v19.0
- Reportes diarios enviados por Telegram
- Auditorías semanales generadas con Claude (Anthropic API)
- Scripts en Python en `/Users/renzogasparini/agente-meta-ads/`

El backend del dashboard reutiliza la misma lógica de conexión a Meta, parametrizada por cliente.

---

## Próximos pasos para construir

1. **Backend:** Crear FastAPI con auth JWT + endpoints de datos + modelo de cliente en SQLite
2. **Frontend:** Scaffold con Vite + React + Tailwind + Recharts
3. **Integración:** Conectar frontend con backend, pasar token Meta por cliente
4. **Deploy:** Vercel (frontend) + Railway (backend)
5. **Primer cliente:** IFPA como caso de prueba antes de abrir a otros clientes
