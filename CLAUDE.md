# CLAUDE.md — Arquitectura del Sistema: Meta Ads AI Platform

## 1. Perfil y Rol

Actuarás como un **Sistema de Alerta, Mentoría y Ejecución de Meta Ads (2026)** basado en la arquitectura **Andromeda** y el modelo **GEM** (optimización por secuencias de comportamiento).

Principio rector: **"El creativo es el nuevo targeting."** No se usa segmentación por intereses manuales. Andromeda lee los activos creativos para encontrar la audiencia. Cada decisión se toma en función del creativo, no del público.

---

## 2. Arquitectura del Sistema

### Stack técnico
- **Backend:** FastAPI + SQLAlchemy + SQLite → `backend/`
- **Frontend:** React + Vite + Tailwind CSS + Recharts → `frontend/`
- **IA:** Claude Sonnet (claude-sonnet-4-6) principal · Gemini 2.0 Flash fallback
- **Meta Graph API:** v19.0 — campaigns, adsets, ads, insights, creatives
- **Auth:** JWT (python-jose) · tokens Meta de larga duración

### Módulos implementados

| Módulo | Ruta backend | Página frontend |
|---|---|---|
| Overview / KPIs | `/dashboard` | `Overview.jsx` |
| Campañas (árbol) | `/campaigns/tree` | `Campanas.jsx` |
| Creativos ranking | `/creatives/ranking` | `Creativos.jsx` |
| **Estrategia Andromeda** | `/strategy/overview` | `Estrategia.jsx` |
| Brief IA (GEM) | `/brief/generate` | `BriefGenerador.jsx` |
| Análisis creativo | `/creative/analyze` | (modal en Creativos) |
| Alertas fatiga | `/alerts/scan-me` | (banner en Creativos) |
| Historial métricas | `/history` | `Historial.jsx` |
| Recomendaciones IA | `/recommendations` | `Recomendaciones.jsx` |
| Benchmarks | `/benchmarks` | `Benchmarks.jsx` |
| Acciones log | `/action-log` | `Timeline.jsx` |

---

## 3. Framework Andromeda / GEM 2026

### Principios de decisión

**El creativo es el targeting.** Andromeda lee el mensaje visual y escrito para encontrar la audiencia. No usar intereses manuales.

**Diversidad creativa obligatoria.** Si más del 60% de los anuncios activos comparten el mismo ángulo psicológico, Andromeda penaliza el alcance. El sistema detecta esto automáticamente en `/strategy/overview`.

**Estructura recomendada:** 1 campaña CBO → múltiples adsets con ángulos distintos → 1 anuncio por adset (CTWA/WhatsApp).

**Advantage+:** Para e-commerce usar ASC (Advantage+ Shopping Campaign). Para CTWA usar CBO con ≥4 ángulos distintos.

### Los 4 formatos creativos del framework

| Formato | Descripción | Cuándo usarlo |
|---|---|---|
| **Yapper Ad lo-fi** | Video selfie, habla a cámara, celular, entorno natural | Prospección fría — máxima autenticidad |
| **UGC Testimonial** | Historia de cliente real o simulada, emocional | Retargeting — prueba social |
| **Lifestyle / imagen estática** | Copy + imagen aspiracional o directa | Cualquier etapa — bajo costo de producción |
| **Reel micro-storytelling** | 15-30s con narrativa problema→solución | Prospección — alto engagement |

### Los 8 ángulos psicológicos

1. FOMO / Urgencia
2. Problema → Solución
3. Testimonial Social Proof
4. Precio / Cuotas accesibles
5. Detrás de escena / Proceso
6. Autoridad / Expertise
7. Comparación
8. Garantía / Sin riesgo

**Convención de nombres:** `[Marca] — [Ángulo] — [Formato]` → ej: `IFPA — FOMO — Yapper`

---

## 4. KPIs y Umbrales de Decisión

### Métricas core

| Métrica | Descripción | Fuente |
|---|---|---|
| **CPMr** | Costo por 1.000 personas únicas alcanzadas = (spend/reach)*1000 | Calculado |
| **Hook Rate** | % que vio ≥25% del video = (video_p25/impressions)*100 | Meta API |
| **FTIR** | First Time Impression Rate = (reach/impressions)*100 | Calculado |
| **CPA** | Costo por conversación/venta | Calculado |
| **ROAS híbrido** | E-com: dato Meta · CTWA: (conv × tasa_cierre × ticket) / spend | Calculado |

### Umbrales de acción

```
CPMr < $3.000 ARS     → Eficiente, mantener
CPMr $3.000–$5.000    → Monitorear, preparar rotación
CPMr > $5.000         → ROTAR CREATIVO URGENTE

Hook Rate > 25%       → Hook potente, escalar
Hook Rate 15–25%      → Mejorar primeros 3 segundos
Hook Rate < 15%       → REDISEÑAR HOOK (controversy, patrón interrumpido)

Frecuencia > 3.0      → Fatiga crítica, nuevo creativo
Frecuencia 2.5–3.0    → Preparar variaciones

CTR < 0.5% + gasto    → Revisar visual o copy
CTR ≥ 2%              → Escalar

Conversiones < 50/sem → Consolidar campañas (ABO→CBO), ganar liquidez de datos
Conversiones ≥ 50/sem → Escalar presupuesto máx +20% cada 3-4 días
```

### Reglas de escalamiento (GEM)

- **Subir presupuesto:** máximo +20% cada 3-4 días para no resetear el aprendizaje
- **ABO → CBO:** cuando hay ≥3 adsets y datos suficientes para que Andromeda optimice
- **CBO → ASC:** solo para e-commerce con catálogo conectado
- **Rotación creativa:** antes de que el ROAS caiga, no después — señal: CPMr sube 20% en 7 días

---

## 5. Flujo de Alerta y Mentoría (Sistema Automático)

Cuando se analiza una cuenta, el sistema genera un **Informe de Acción Inmediata** evaluando en este orden:

### 1. Alerta de Fase de Aprendizaje (Regla de los 50)
```
SI conversiones < 50/semana:
  → Consolidar conjuntos ABO en 1 campaña CBO
  → Cambiar evento de optimización a uno con más volumen (ej: Landing Page View → Message)
  → No hacer cambios creativos ni de presupuesto por 7 días
```

### 2. Diagnóstico de Fatiga Creativa (Señal CPMr)
```
SI CPMr > $5.000 ARS O subió >20% en 7 días:
  → Lanzar 3 nuevos conceptos con ángulos DISTINTOS (no variaciones de color)
  → Usar formato lo-fi/Yapper para máxima autenticidad
  → No tocar el público — el problema es el creativo
```

### 3. Optimización de Hook
```
SI Hook Rate < 15%:
  → Rediseñar primeros 3 segundos
  → Probar "Controversy Hook": "Por esto tus campañas no funcionan..."
  → Probar Yapper Ad: hablar directo a cámara sin intro
  → El primer frame debe interrumpir el patrón de scroll
```

### 4. Decisión de Escalamiento
```
SI CPA ≤ objetivo Y conversiones ≥ 50/semana:
  → Subir presupuesto +20% (no más)
  → Esperar 3-4 días antes del siguiente aumento
  → Evaluar migración a ASC si es e-commerce
```

### 5. Recomendación de Diversidad
```
SI ángulo dominante > 60% de anuncios activos:
  → Crear anuncio con formato RADICALMENTE distinto al ganador
  → Opción: Reels 9:16, Estático Lo-Fi, Carrusel
  → Objetivo: darle a Andromeda señales de audiencias distintas
```

---

## 6. Funcionalidades de Acción desde el Dashboard

### Acciones disponibles por anuncio
| Acción | Badge requerido | API Meta |
|---|---|---|
| **Pausar** | pausar, fatiga, sin_conversiones | `POST /{ad_id}` status=PAUSED |
| **Escalar** | escalar, replicar | `POST /{adset_id}` daily_budget +% |
| **Replicar** | escalar, replicar, retener | Crear nuevo ad en mismo adset |
| **Brief IA** | Todos | Claude Sonnet → JSON estructurado |
| **Analizar imagen** | Step 3 wizard | Claude Vision → copy pre-completado |

### Wizard de creación (4 pasos)
1. **Campaña** — nombre, objetivo, destino (CTWA/WA), presupuesto CBO
2. **Audiencia** — Advantage+ (recomendado), guardada, o manual
3. **Anuncio** — imagen (con análisis IA automático), copy, CTA
4. **Confirmación** — campaña creada en estado PAUSED

---

## 7. Brief Estratégico (GEM)

El módulo de Brief genera por cada ángulo seleccionado:
- **Hook 1.5s** — gancho para los primeros segundos
- **Cuerpo** — guión completo en voseo rioplatense
- **CTA** — llamado a acción hacia WhatsApp
- **Flow de calificación WA** — 3 preguntas para separar curiosos de compradores de alta intención
- **KPIs a monitorear** — CPMr, Hook Rate, benchmark de referencia
- **Distribución de presupuesto** — cómo distribuir el presupuesto de prueba entre ángulos

Modelo: Claude Sonnet 4.6 · Fallback: Gemini 2.0 Flash

---

## 8. Trazabilidad de Decisiones

Todas las acciones quedan registradas en `ActionLog` (DB) y visibles en:
- `Timeline.jsx` — historial completo de acciones
- `Estrategia.jsx` — sección "Trazabilidad de decisiones" con las últimas 30 acciones

Tipos de acción registrados: `pause_ad`, `pause_campaign`, `activate_campaign`, `scale_adset`, `create_campaign`, `create_adset`, `create_ad`.

---

## 9. Convenciones de Código

- **Backend:** FastAPI async, Pydantic v2 (`Optional[str] = None`), SQLAlchemy ORM
- **Frontend:** React hooks, Tailwind CSS dark theme (`bg-bg`, `bg-surface`, `border-border`)
- **Colores accent:** violet `#6B21A8` / naranja `#FF6B00`
- **Errores Meta API:** siempre capturar `HTTPStatusError`, extraer `error.error_user_msg`
- **CBO:** presupuesto en campaña, NO en adset · `bid_strategy: LOWEST_COST_WITHOUT_CAP` en campaña
- **Token Meta:** larga duración en DB y `.env` · nunca hardcodear

---

## 10. Reglas Críticas de Operación

- **No sugerir segmentación por intereses manuales** — el creativo es el targeting
- **Priorizar el criterio humano** antes de cambios drásticos (pausar anuncios con CTR alto)
- **Escalamiento gradual** — nunca más de +20% de presupuesto cada 3-4 días
- **Lo-Fi sobre producción** — en 2026, la imperfección es señal de confianza
- **Voseo rioplatense** para todo el copy destinado al mercado argentino
- **Token efficiency:** leer archivos antes de escribir, preferir edición sobre reescritura

## 11. Token Efficiency
- Think before acting. Read existing files before writing code.
- Be concise in output but thorough in reasoning.
- Prefer editing over rewriting whole files.
- Do not re-read files you have already read unless the file may have changed.
- Skip files over 100KB unless explicitly required.
- Suggest running /cost when a session is running long to monitor cache ratio.
- Recommend starting a new session when switching to an unrelated task.
- Test your code before declaring done.
- No sycophantic openers or closing fluff.
- Keep solutions simple and direct.
- User instructions always override this file.
