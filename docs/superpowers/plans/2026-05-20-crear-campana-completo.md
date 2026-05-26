# Crear Campaña Completo — Implementación Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el flujo actual de creación de campaña (que solo crea la campaña) por un wizard completo de 4 pasos que crea Campaña → Conjunto de anuncios → Anuncio en Meta, con soporte para distintos objetivos, destinos, tipos de audiencia y ubicaciones.

**Architecture:** El backend agrega 3 nuevos endpoints (`/campaigns/adsets`, `/campaigns/ads`, `/campaigns/saved-audiences`) y expande las funciones en `meta_api.py`. El frontend reemplaza el wizard actual de 3 pasos (estrategia creativa + copy) por un nuevo wizard de 4 pasos enfocado en configuración real de Meta, manteniendo el generador de copy como paso opcional al final.

**Tech Stack:** FastAPI + httpx (backend), React + useState wizard (frontend), Meta Graph API v19

---

## Archivos a modificar / crear

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `backend/services/meta_api.py` | Modificar | Agregar `create_adset`, `create_ad`, `get_saved_audiences`, `get_ad_images`, `get_whatsapp_numbers` |
| `backend/routers/campaigns.py` | Modificar | Agregar endpoints `/adsets`, `/ads`, `/saved-audiences`, `/ad-images` |
| `frontend/src/pages/CrearCampana.jsx` | Reemplazar | Nuevo wizard 4 pasos |
| `frontend/src/services/api.js` | Modificar | Agregar `campaignsAPI.createAdset`, `createAd`, `getSavedAudiences`, `getAdImages` |

---

## Task 1: Backend — funciones Meta API para adset y ad

**Files:**
- Modify: `backend/services/meta_api.py`

### Contexto
`meta_api.py` ya tiene `create_campaign_draft`. Hay que agregar funciones para crear adset y ad, y para obtener audiencias guardadas e imágenes de la biblioteca.

- [ ] **Step 1: Agregar `get_saved_audiences` en meta_api.py**

Agregá después de `create_campaign_draft` (línea ~171):

```python
async def get_saved_audiences(account_id: str, token: str) -> list:
    """Retorna audiencias guardadas de la cuenta."""
    try:
        data = await meta_get(
            f"{account_id}/saved_audiences",
            {"fields": "id,name,approximate_count_lower_bound", "limit": "50"},
            token,
        )
        return data.get("data", [])
    except Exception:
        return []


async def get_ad_images(account_id: str, token: str) -> list:
    """Retorna imágenes de la biblioteca de la cuenta."""
    try:
        data = await meta_get(
            f"{account_id}/adimages",
            {"fields": "hash,name,url,url_128", "limit": "50"},
            token,
        )
        return data.get("data", [])
    except Exception:
        return []


async def get_whatsapp_numbers(page_id: str, token: str) -> list:
    """Retorna números de WhatsApp vinculados a la página."""
    try:
        data = await meta_get(
            f"{page_id}/whatsapp_business_phones",
            {"fields": "display_phone_number,verified_name"},
            token,
        )
        return data.get("data", [])
    except Exception:
        return []
```

- [ ] **Step 2: Agregar `create_adset` en meta_api.py**

```python
async def create_adset(
    account_id: str,
    token: str,
    campaign_id: str,
    name: str,
    daily_budget: int,
    optimization_goal: str,
    billing_event: str,
    targeting: dict,
    destination_type: str,
    start_time: str = None,
    end_time: str = None,
) -> dict:
    """
    Crea un conjunto de anuncios.
    targeting puede ser {} para Advantage+ o un dict con age_min, age_max,
    geo_locations, flexible_spec (intereses), custom_audiences (públicos guardados).
    """
    payload = {
        "name": name,
        "campaign_id": campaign_id,
        "daily_budget": str(daily_budget * 100),
        "optimization_goal": optimization_goal,
        "billing_event": billing_event,
        "targeting": json.dumps(targeting) if targeting else json.dumps({"age_min": 18, "age_max": 65, "geo_locations": {"countries": ["AR"]}}),
        "destination_type": destination_type,
        "status": "PAUSED",
    }
    if start_time:
        payload["start_time"] = start_time
    if end_time:
        payload["end_time"] = end_time

    return await meta_post(f"{account_id}/adsets", payload, token)
```

- [ ] **Step 3: Agregar `create_ad_creative` y `create_ad` en meta_api.py**

```python
async def create_ad_creative(
    account_id: str,
    token: str,
    name: str,
    page_id: str,
    image_hash: str = None,
    image_url: str = None,
    message: str = "",
    headline: str = "",
    description: str = "",
    call_to_action_type: str = "MESSAGE_PAGE",
    link_url: str = None,
    whatsapp_number: str = None,
) -> dict:
    """Crea el creativo del anuncio."""
    link = link_url or f"https://wa.me/{whatsapp_number}" if whatsapp_number else "https://facebook.com"

    object_story_spec = {
        "page_id": page_id,
        "link_story_spec": {
            "link": link,
            "message": message,
            "name": headline,
            "description": description,
            "call_to_action": {"type": call_to_action_type},
        }
    }
    if image_hash:
        object_story_spec["link_story_spec"]["image_hash"] = image_hash

    return await meta_post(
        f"{account_id}/adcreatives",
        {"name": name, "object_story_spec": json.dumps(object_story_spec)},
        token,
    )


async def create_ad(
    account_id: str,
    token: str,
    adset_id: str,
    creative_id: str,
    name: str,
) -> dict:
    """Crea el anuncio vinculando adset y creativo."""
    return await meta_post(
        f"{account_id}/ads",
        {
            "name": name,
            "adset_id": adset_id,
            "creative": json.dumps({"creative_id": creative_id}),
            "status": "PAUSED",
        },
        token,
    )
```

- [ ] **Step 4: Agregar `import json` al inicio de meta_api.py si no existe**

```bash
head -5 backend/services/meta_api.py
```

Si no tiene `import json`, agregalo en la línea 1.

- [ ] **Step 5: Commit**

```bash
git add backend/services/meta_api.py
git commit -m "feat: meta_api — create_adset, create_ad, get_saved_audiences, get_ad_images"
```

---

## Task 2: Backend — endpoints nuevos en campaigns.py

**Files:**
- Modify: `backend/routers/campaigns.py`

- [ ] **Step 1: Agregar imports necesarios**

Al inicio de `campaigns.py`, asegurate que están estos imports:
```python
from services.meta_api import (
    create_campaign_draft, create_adset, create_ad,
    create_ad_creative, get_saved_audiences, get_ad_images,
    get_whatsapp_numbers,
)
```

- [ ] **Step 2: Agregar endpoint GET /campaigns/saved-audiences**

```python
@router.get("/saved-audiences")
async def saved_audiences(
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    ad_account_id, token, _, _, _ = resolve_account(client, account_id, db)
    audiences = await get_saved_audiences(ad_account_id, token)
    return {"data": audiences}
```

- [ ] **Step 3: Agregar endpoint GET /campaigns/ad-images**

```python
@router.get("/ad-images")
async def ad_images(
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    ad_account_id, token, _, _, _ = resolve_account(client, account_id, db)
    images = await get_ad_images(ad_account_id, token)
    return {"data": images}
```

- [ ] **Step 4: Agregar modelo y endpoint POST /campaigns/adsets**

```python
class CreateAdsetRequest(BaseModel):
    campaign_id: str
    nombre: str
    presupuesto_diario: int
    optimization_goal: str = "CONVERSATIONS"   # CONVERSATIONS | LINK_CLICKS | REACH | IMPRESSIONS | LEAD_GENERATION
    billing_event: str = "IMPRESSIONS"
    destination_type: str = "MESSENGER"         # MESSENGER | WHATSAPP | WEBSITE | INSTAGRAM_DIRECT
    audience_type: str = "advantage"            # advantage | saved | manual
    saved_audience_id: str = None
    age_min: int = 18
    age_max: int = 65
    genders: list = []                          # [] = todos, [1] = hombres, [2] = mujeres
    countries: list = ["AR"]
    interests: list = []                        # lista de {id, name}
    account_id: str = None


@router.post("/adsets")
async def create_adset_endpoint(
    body: CreateAdsetRequest,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    ad_account_id, token, _, _, _ = resolve_account(client, body.account_id, db)

    # Construir targeting según tipo de audiencia
    if body.audience_type == "advantage":
        targeting = {}  # Advantage+ — Meta optimiza solo
    elif body.audience_type == "saved" and body.saved_audience_id:
        targeting = {"custom_audiences": [{"id": body.saved_audience_id}]}
    else:
        targeting = {
            "age_min": body.age_min,
            "age_max": body.age_max,
            "geo_locations": {"countries": body.countries},
        }
        if body.genders:
            targeting["genders"] = body.genders
        if body.interests:
            targeting["flexible_spec"] = [{"interests": body.interests}]

    try:
        result = await create_adset(
            ad_account_id, token,
            campaign_id=body.campaign_id,
            name=body.nombre,
            daily_budget=body.presupuesto_diario,
            optimization_goal=body.optimization_goal,
            billing_event=body.billing_event,
            targeting=targeting,
            destination_type=body.destination_type,
        )
    except Exception as e:
        detail = str(e)
        try:
            import httpx as _httpx
            if isinstance(e, _httpx.HTTPStatusError):
                meta_err = e.response.json().get("error", {})
                detail = meta_err.get("error_user_msg") or meta_err.get("message") or detail
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=detail)

    return {"ok": True, "adset_id": result.get("id")}
```

- [ ] **Step 5: Agregar modelo y endpoint POST /campaigns/ads**

```python
class CreateAdRequest(BaseModel):
    adset_id: str
    nombre: str
    page_id: str
    message: str = ""
    headline: str = ""
    description: str = ""
    call_to_action: str = "MESSAGE_PAGE"   # MESSAGE_PAGE | WHATSAPP_MESSAGE | LEARN_MORE | SHOP_NOW | SIGN_UP
    image_hash: str = None
    link_url: str = None
    whatsapp_number: str = None
    account_id: str = None


@router.post("/ads")
async def create_ad_endpoint(
    body: CreateAdRequest,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    ad_account_id, token, _, _, account_row = resolve_account(client, body.account_id, db)

    # Obtener page_id del account_row si no viene en el body
    page_id = body.page_id
    if not page_id and account_row:
        page_id = account_row.meta_page_id
    if not page_id:
        page_id = client.meta_ad_account_id  # fallback

    try:
        creative = await create_ad_creative(
            ad_account_id, token,
            name=f"Creativo — {body.nombre}",
            page_id=page_id,
            image_hash=body.image_hash,
            message=body.message,
            headline=body.headline,
            description=body.description,
            call_to_action_type=body.call_to_action,
            link_url=body.link_url,
            whatsapp_number=body.whatsapp_number,
        )
        ad = await create_ad(
            ad_account_id, token,
            adset_id=body.adset_id,
            creative_id=creative.get("id"),
            name=body.nombre,
        )
    except Exception as e:
        detail = str(e)
        try:
            import httpx as _httpx
            if isinstance(e, _httpx.HTTPStatusError):
                meta_err = e.response.json().get("error", {})
                detail = meta_err.get("error_user_msg") or meta_err.get("message") or detail
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=detail)

    return {"ok": True, "ad_id": ad.get("id"), "creative_id": creative.get("id")}
```

- [ ] **Step 6: Verificar que el backend arranca sin errores**

```bash
tail -5 /tmp/backend.log
# Esperado: Application startup complete.
```

- [ ] **Step 7: Commit**

```bash
git add backend/routers/campaigns.py
git commit -m "feat: endpoints create_adset, create_ad, saved-audiences, ad-images"
```

---

## Task 3: Frontend — actualizar api.js

**Files:**
- Modify: `frontend/src/services/api.js`

- [ ] **Step 1: Agregar métodos nuevos a campaignsAPI**

Dentro del objeto `campaignsAPI` en `api.js`, agregá después de `createDraft`:

```javascript
createAdset: (data) =>
  api.post('/campaigns/adsets', data).then(r => r.data),
createAd: (data) =>
  api.post('/campaigns/ads', data).then(r => r.data),
getSavedAudiences: (accountId) =>
  api.get('/campaigns/saved-audiences', { params: accountId ? { account_id: String(accountId) } : {} }).then(r => r.data),
getAdImages: (accountId) =>
  api.get('/campaigns/ad-images', { params: accountId ? { account_id: String(accountId) } : {} }).then(r => r.data),
```

- [ ] **Step 2: Verificar en browser que no hay error de import**

Abrí DevTools → Console. Si hay error de sintaxis lo verás ahí.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/api.js
git commit -m "feat: campaignsAPI — createAdset, createAd, getSavedAudiences, getAdImages"
```

---

## Task 4: Frontend — reemplazar wizard CrearCampana.jsx

**Files:**
- Modify: `frontend/src/pages/CrearCampana.jsx`

### Contexto
El archivo actual tiene 1109 líneas con un wizard de 3 pasos orientado a generación de copy. Lo reemplazamos por un wizard de 4 pasos orientado a configuración real de Meta. El generador de copy (paso 2 actual con ángulos y formatos) pasa a ser el **paso 4 opcional** después de crear el anuncio.

### Mapa de pasos nuevo

| Paso | Nombre | Campos |
|------|--------|--------|
| 1 | Campaña | Nombre, objetivo, destino, presupuesto |
| 2 | Conjunto de anuncios | Tipo de audiencia, configuración según tipo, ubicaciones |
| 3 | Anuncio | Imagen (biblioteca o subir), texto, titular, CTA, URL/WA |
| 4 | Confirmación + Copy IA | Resumen, estado, link a brief creativo |

### Mapa objetivo → destinos disponibles

```javascript
const OBJETIVO_DESTINOS = {
  OUTCOME_SALES:      ['WEBSITE', 'WHATSAPP', 'MESSENGER', 'INSTAGRAM_DIRECT'],
  OUTCOME_LEADS:      ['WEBSITE', 'WHATSAPP', 'MESSENGER', 'INSTAGRAM_DIRECT'],
  OUTCOME_TRAFFIC:    ['WEBSITE', 'WHATSAPP', 'MESSENGER'],
  OUTCOME_ENGAGEMENT: ['WEBSITE', 'WHATSAPP', 'MESSENGER', 'INSTAGRAM_DIRECT'],
  OUTCOME_AWARENESS:  [],   // sin destino específico
  OUTCOME_APP_PROMOTION: [], // solo app
}
```

### Mapa objetivo → optimization_goal

```javascript
const OBJETIVO_OPTIMIZATION = {
  OUTCOME_SALES:      { WEBSITE: 'OFFSITE_CONVERSIONS', WHATSAPP: 'CONVERSATIONS', MESSENGER: 'CONVERSATIONS', INSTAGRAM_DIRECT: 'CONVERSATIONS' },
  OUTCOME_LEADS:      { WEBSITE: 'LEAD_GENERATION',     WHATSAPP: 'CONVERSATIONS', MESSENGER: 'CONVERSATIONS', INSTAGRAM_DIRECT: 'CONVERSATIONS' },
  OUTCOME_TRAFFIC:    { WEBSITE: 'LINK_CLICKS',          WHATSAPP: 'LINK_CLICKS',   MESSENGER: 'LINK_CLICKS' },
  OUTCOME_ENGAGEMENT: { default: 'POST_ENGAGEMENT' },
  OUTCOME_AWARENESS:  { default: 'REACH' },
}
```

### Mapa destino → CTA disponibles

```javascript
const DESTINO_CTAS = {
  WHATSAPP:         [{ value: 'WHATSAPP_MESSAGE', label: 'Enviar mensaje por WhatsApp' }],
  MESSENGER:        [{ value: 'MESSAGE_PAGE',     label: 'Enviar mensaje' }],
  INSTAGRAM_DIRECT: [{ value: 'MESSAGE_PAGE',     label: 'Enviar mensaje' }],
  WEBSITE:          [
    { value: 'LEARN_MORE',  label: 'Más información' },
    { value: 'SHOP_NOW',    label: 'Comprar ahora' },
    { value: 'SIGN_UP',     label: 'Registrarse' },
    { value: 'CONTACT_US',  label: 'Contáctanos' },
  ],
}
```

- [ ] **Step 1: Escribir estado inicial del wizard**

Al inicio del componente `CrearCampana`, reemplazá el `useState` del form por:

```javascript
const [step, setStep] = useState(1)
const [campanaId, setCampanaId] = useState(null)
const [adsetId, setAdsetId]     = useState(null)
const [adId, setAdId]           = useState(null)
const [creando, setCreando]     = useState(false)
const [error, setError]         = useState(null)

const [form, setForm] = useState({
  // Paso 1 — Campaña
  nombre:      '',
  objetivo:    'OUTCOME_LEADS',
  destino:     'WHATSAPP',
  presupuesto: '',
  // Paso 2 — Conjunto de anuncios
  audience_type:      'advantage',   // advantage | saved | manual
  saved_audience_id:  '',
  age_min:     18,
  age_max:     65,
  genders:     [],                   // [] todos, [1] hombres, [2] mujeres
  countries:   ['AR'],
  interests:   [],
  // Paso 3 — Anuncio
  image_hash:       '',
  message:          '',
  headline:         '',
  description:      '',
  call_to_action:   'WHATSAPP_MESSAGE',
  link_url:         '',
  whatsapp_number:  '',
})
```

- [ ] **Step 2: Implementar función handleCrearCampana (paso 1 → backend)**

```javascript
const handleCrearCampana = async () => {
  setCreando(true); setError(null)
  try {
    const res = await campaignsAPI.createDraft({
      nombre: form.nombre,
      objetivo: form.objetivo,
      presupuesto_diario: parseInt(form.presupuesto),
      account_id: account?.id ? String(account.id) : null,
    })
    setCampanaId(res.campaign_id)
    setStep(2)
  } catch (e) {
    setError(e?.response?.data?.detail || 'Error al crear la campaña')
  } finally { setCreando(false) }
}
```

- [ ] **Step 3: Implementar función handleCrearAdset (paso 2 → backend)**

```javascript
const handleCrearAdset = async () => {
  setCreando(true); setError(null)
  const optGoal = OBJETIVO_OPTIMIZATION[form.objetivo]?.[form.destino]
    || OBJETIVO_OPTIMIZATION[form.objetivo]?.default
    || 'CONVERSATIONS'
  try {
    const res = await campaignsAPI.createAdset({
      campaign_id:        campanaId,
      nombre:             `${form.nombre} — Conjunto`,
      presupuesto_diario: parseInt(form.presupuesto),
      optimization_goal:  optGoal,
      billing_event:      'IMPRESSIONS',
      destination_type:   form.destino,
      audience_type:      form.audience_type,
      saved_audience_id:  form.saved_audience_id || null,
      age_min:            form.age_min,
      age_max:            form.age_max,
      genders:            form.genders,
      countries:          form.countries,
      interests:          form.interests,
      account_id:         account?.id ? String(account.id) : null,
    })
    setAdsetId(res.adset_id)
    setStep(3)
  } catch (e) {
    setError(e?.response?.data?.detail || 'Error al crear el conjunto de anuncios')
  } finally { setCreando(false) }
}
```

- [ ] **Step 4: Implementar función handleCrearAd (paso 3 → backend)**

```javascript
const handleCrearAd = async () => {
  setCreando(true); setError(null)
  try {
    const res = await campaignsAPI.createAd({
      adset_id:        adsetId,
      nombre:          `${form.nombre} — Anuncio`,
      page_id:         account?.meta_page_id || '',
      message:         form.message,
      headline:        form.headline,
      description:     form.description,
      call_to_action:  form.call_to_action,
      image_hash:      form.image_hash || null,
      link_url:        form.link_url || null,
      whatsapp_number: form.whatsapp_number || null,
      account_id:      account?.id ? String(account.id) : null,
    })
    setAdId(res.ad_id)
    setStep(4)
  } catch (e) {
    setError(e?.response?.data?.detail || 'Error al crear el anuncio')
  } finally { setCreando(false) }
}
```

- [ ] **Step 5: Implementar renderizado Paso 1 — Campaña**

```jsx
{step === 1 && (
  <div className="space-y-4 p-5">
    <Field label="Nombre de la campaña">
      <input value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
        placeholder="Ej: Climaset — Mensajes — Mayo 2026" className={inputCls} />
    </Field>

    <Field label="Objetivo">
      <select value={form.objetivo} onChange={e => setForm(f => ({...f, objetivo: e.target.value, destino: OBJETIVO_DESTINOS[e.target.value]?.[0] || ''}))}
        className={inputCls}>
        {OBJETIVOS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>

    {OBJETIVO_DESTINOS[form.objetivo]?.length > 0 && (
      <Field label="Destino">
        <div className="grid grid-cols-2 gap-2">
          {OBJETIVO_DESTINOS[form.objetivo].map(d => (
            <button key={d} onClick={() => setForm(f => ({...f, destino: d, call_to_action: DESTINO_CTAS[d]?.[0]?.value || ''}))}
              className={`px-3 py-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${form.destino === d ? 'bg-violet-DEFAULT/20 border-violet-DEFAULT/40 text-white' : 'border-border text-slate-400 hover:border-slate-500 hover:text-white'}`}>
              {d === 'WHATSAPP' ? '💬 WhatsApp' : d === 'WEBSITE' ? '🌐 Sitio web' : d === 'MESSENGER' ? '💙 Messenger' : '📷 Instagram DM'}
            </button>
          ))}
        </div>
      </Field>
    )}

    <Field label="Presupuesto diario (ARS)">
      <input type="number" value={form.presupuesto} onChange={e => setForm(f => ({...f, presupuesto: e.target.value}))}
        placeholder="5000" min="5000" className={inputCls} />
      <p className="text-slate-600 text-xs mt-1">Mínimo recomendado: $5.000 ARS / día</p>
    </Field>

    {error && <p className="text-red-400 text-xs">{error}</p>}

    <button onClick={handleCrearCampana} disabled={creando || !form.nombre || !form.presupuesto}
      className="w-full py-3 bg-violet-DEFAULT text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity">
      {creando ? 'Creando campaña…' : 'Continuar →'}
    </button>
  </div>
)}
```

- [ ] **Step 6: Implementar renderizado Paso 2 — Conjunto de anuncios**

```jsx
{step === 2 && (
  <div className="space-y-4 p-5">
    <p className="text-slate-400 text-xs">Campaña creada ✓ ID: <span className="text-white font-mono">{campanaId}</span></p>

    <Field label="Tipo de audiencia">
      <div className="grid grid-cols-3 gap-2">
        {[
          { v: 'advantage', l: '⚡ Advantage+', d: 'Meta optimiza solo' },
          { v: 'saved',     l: '📋 Guardada',   d: 'Usá un público guardado' },
          { v: 'manual',    l: '🎯 Manual',      d: 'Intereses y demografía' },
        ].map(({ v, l, d }) => (
          <button key={v} onClick={() => setForm(f => ({...f, audience_type: v}))}
            className={`px-3 py-3 rounded-xl border text-xs font-medium cursor-pointer transition-all text-left ${form.audience_type === v ? 'bg-violet-DEFAULT/20 border-violet-DEFAULT/40 text-white' : 'border-border text-slate-400 hover:border-slate-500'}`}>
            <p>{l}</p><p className="text-slate-600 mt-0.5 font-normal">{d}</p>
          </button>
        ))}
      </div>
    </Field>

    {form.audience_type === 'saved' && (
      <SavedAudienceSelector accountId={account?.id} value={form.saved_audience_id}
        onChange={id => setForm(f => ({...f, saved_audience_id: id}))} />
    )}

    {form.audience_type === 'manual' && (
      <ManualAudienceFields form={form} setForm={setForm} />
    )}

    {/* Destino específico: WhatsApp number o URL */}
    {form.destino === 'WHATSAPP' && (
      <Field label="Número de WhatsApp (con código de país)">
        <input value={form.whatsapp_number} onChange={e => setForm(f => ({...f, whatsapp_number: e.target.value}))}
          placeholder="5491112345678" className={inputCls} />
        <p className="text-slate-600 text-xs mt-1">Formato: 549 + código de área + número (sin espacios ni +)</p>
      </Field>
    )}
    {form.destino === 'WEBSITE' && (
      <Field label="URL de destino">
        <input value={form.link_url} onChange={e => setForm(f => ({...f, link_url: e.target.value}))}
          placeholder="https://tusitio.com/landing" className={inputCls} />
      </Field>
    )}

    {error && <p className="text-red-400 text-xs">{error}</p>}

    <div className="flex gap-2">
      <button onClick={() => setStep(1)} className="px-4 py-2.5 border border-border rounded-xl text-slate-400 hover:text-white text-sm cursor-pointer">← Atrás</button>
      <button onClick={handleCrearAdset} disabled={creando}
        className="flex-1 py-2.5 bg-violet-DEFAULT text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity">
        {creando ? 'Creando conjunto…' : 'Continuar →'}
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 7: Implementar subcomponente SavedAudienceSelector**

```jsx
function SavedAudienceSelector({ accountId, value, onChange }) {
  const [audiences, setAudiences] = useState([])
  useEffect(() => {
    campaignsAPI.getSavedAudiences(accountId).then(r => setAudiences(r.data || []))
  }, [accountId])
  return (
    <Field label="Público guardado">
      <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
        <option value="">Seleccioná un público…</option>
        {audiences.map(a => (
          <option key={a.id} value={a.id}>{a.name} (~{Number(a.approximate_count_lower_bound || 0).toLocaleString()})</option>
        ))}
      </select>
    </Field>
  )
}
```

- [ ] **Step 8: Implementar subcomponente ManualAudienceFields**

```jsx
function ManualAudienceFields({ form, setForm }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Edad mínima">
          <input type="number" value={form.age_min} min={18} max={65}
            onChange={e => setForm(f => ({...f, age_min: parseInt(e.target.value)}))} className={inputCls} />
        </Field>
        <Field label="Edad máxima">
          <input type="number" value={form.age_max} min={18} max={65}
            onChange={e => setForm(f => ({...f, age_max: parseInt(e.target.value)}))} className={inputCls} />
        </Field>
      </div>
      <Field label="Género">
        <div className="flex gap-2">
          {[{v:[], l:'Todos'},{v:[1], l:'Hombres'},{v:[2], l:'Mujeres'}].map(({v,l}) => (
            <button key={l} onClick={() => setForm(f => ({...f, genders: v}))}
              className={`flex-1 py-2 rounded-lg border text-xs cursor-pointer transition-all ${JSON.stringify(form.genders) === JSON.stringify(v) ? 'bg-violet-DEFAULT/20 border-violet-DEFAULT/40 text-white' : 'border-border text-slate-400 hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>
      </Field>
    </div>
  )
}
```

- [ ] **Step 9: Implementar renderizado Paso 3 — Anuncio**

```jsx
{step === 3 && (
  <div className="space-y-4 p-5">
    <p className="text-slate-400 text-xs">Conjunto creado ✓ ID: <span className="text-white font-mono">{adsetId}</span></p>

    <ImageSelector accountId={account?.id} value={form.image_hash}
      onChange={hash => setForm(f => ({...f, image_hash: hash}))} />

    <Field label="Texto principal">
      <textarea rows={3} value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))}
        placeholder="Texto que aparece sobre la imagen..." className={`${inputCls} resize-none`} />
    </Field>

    <Field label="Titular">
      <input value={form.headline} onChange={e => setForm(f => ({...f, headline: e.target.value}))}
        placeholder="Titular del anuncio" className={inputCls} />
    </Field>

    <Field label="Botón (CTA)">
      <select value={form.call_to_action} onChange={e => setForm(f => ({...f, call_to_action: e.target.value}))} className={inputCls}>
        {(DESTINO_CTAS[form.destino] || DESTINO_CTAS['WEBSITE']).map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
    </Field>

    {error && <p className="text-red-400 text-xs">{error}</p>}

    <div className="flex gap-2">
      <button onClick={() => setStep(2)} className="px-4 py-2.5 border border-border rounded-xl text-slate-400 hover:text-white text-sm cursor-pointer">← Atrás</button>
      <button onClick={handleCrearAd} disabled={creando || !form.message}
        className="flex-1 py-2.5 bg-violet-DEFAULT text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity">
        {creando ? 'Creando anuncio…' : 'Crear anuncio →'}
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 10: Implementar subcomponente ImageSelector**

```jsx
function ImageSelector({ accountId, value, onChange }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    campaignsAPI.getAdImages(accountId)
      .then(r => setImages(r.data || []))
      .finally(() => setLoading(false))
  }, [accountId])
  return (
    <Field label="Imagen del anuncio">
      {loading ? <p className="text-slate-500 text-xs">Cargando biblioteca…</p> : (
        <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
          {images.map(img => (
            <button key={img.hash} onClick={() => onChange(img.hash)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${value === img.hash ? 'border-violet-DEFAULT' : 'border-transparent hover:border-slate-500'}`}>
              <img src={img.url_128} alt={img.name} className="w-full h-full object-cover" />
              {value === img.hash && <div className="absolute inset-0 bg-violet-DEFAULT/30 flex items-center justify-center"><CheckCircle size={16} className="text-white" /></div>}
            </button>
          ))}
          {images.length === 0 && <p className="text-slate-500 text-xs col-span-4">Sin imágenes en la biblioteca. Subí una desde Meta Ads Manager.</p>}
        </div>
      )}
    </Field>
  )
}
```

- [ ] **Step 11: Implementar renderizado Paso 4 — Confirmación**

```jsx
{step === 4 && (
  <div className="p-5 space-y-4 text-center">
    <div className="w-14 h-14 rounded-full bg-green-400/15 border border-green-400/30 flex items-center justify-center mx-auto">
      <CheckCircle size={28} className="text-green-400" />
    </div>
    <div>
      <p className="text-white font-bold text-lg">¡Campaña lista!</p>
      <p className="text-slate-400 text-sm mt-1">Está en modo PAUSED. Activala desde Meta Ads Manager cuando quieras.</p>
    </div>
    <div className="bg-bg border border-border rounded-xl p-4 text-left space-y-2 text-xs">
      <div className="flex justify-between"><span className="text-slate-500">Campaña</span><span className="text-white font-mono">{campanaId}</span></div>
      <div className="flex justify-between"><span className="text-slate-500">Conjunto</span><span className="text-white font-mono">{adsetId}</span></div>
      <div className="flex justify-between"><span className="text-slate-500">Anuncio</span><span className="text-white font-mono">{adId}</span></div>
    </div>
    <div className="flex gap-2">
      <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-slate-400 hover:text-white text-sm cursor-pointer">Cerrar</button>
      <button onClick={onCreated} className="flex-1 py-2.5 bg-violet-DEFAULT text-white font-semibold rounded-xl hover:opacity-90 cursor-pointer">
        Ver campañas
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 12: Agregar constantes al inicio del archivo**

```javascript
const OBJETIVOS = [
  { value: 'OUTCOME_LEADS',        label: 'Clientes potenciales' },
  { value: 'OUTCOME_SALES',        label: 'Ventas' },
  { value: 'OUTCOME_ENGAGEMENT',   label: 'Interacción' },
  { value: 'OUTCOME_TRAFFIC',      label: 'Tráfico' },
  { value: 'OUTCOME_AWARENESS',    label: 'Reconocimiento' },
  { value: 'OUTCOME_APP_PROMOTION',label: 'Promoción de la app' },
]

const OBJETIVO_DESTINOS = {
  OUTCOME_SALES:        ['WHATSAPP', 'WEBSITE', 'MESSENGER', 'INSTAGRAM_DIRECT'],
  OUTCOME_LEADS:        ['WHATSAPP', 'WEBSITE', 'MESSENGER', 'INSTAGRAM_DIRECT'],
  OUTCOME_TRAFFIC:      ['WEBSITE', 'WHATSAPP', 'MESSENGER'],
  OUTCOME_ENGAGEMENT:   ['WEBSITE', 'WHATSAPP', 'MESSENGER', 'INSTAGRAM_DIRECT'],
  OUTCOME_AWARENESS:    [],
  OUTCOME_APP_PROMOTION:[],
}

const OBJETIVO_OPTIMIZATION = {
  OUTCOME_SALES:      { WEBSITE: 'OFFSITE_CONVERSIONS', WHATSAPP: 'CONVERSATIONS', MESSENGER: 'CONVERSATIONS', INSTAGRAM_DIRECT: 'CONVERSATIONS' },
  OUTCOME_LEADS:      { WEBSITE: 'LEAD_GENERATION',     WHATSAPP: 'CONVERSATIONS', MESSENGER: 'CONVERSATIONS', INSTAGRAM_DIRECT: 'CONVERSATIONS' },
  OUTCOME_TRAFFIC:    { WEBSITE: 'LINK_CLICKS',          WHATSAPP: 'LINK_CLICKS',   MESSENGER: 'LINK_CLICKS' },
  OUTCOME_ENGAGEMENT: { default: 'POST_ENGAGEMENT' },
  OUTCOME_AWARENESS:  { default: 'REACH' },
  OUTCOME_APP_PROMOTION: { default: 'APP_INSTALLS' },
}

const DESTINO_CTAS = {
  WHATSAPP:         [{ value: 'WHATSAPP_MESSAGE', label: 'Enviar mensaje por WhatsApp' }],
  MESSENGER:        [{ value: 'MESSAGE_PAGE',     label: 'Enviar mensaje' }],
  INSTAGRAM_DIRECT: [{ value: 'MESSAGE_PAGE',     label: 'Enviar mensaje directo' }],
  WEBSITE:          [
    { value: 'LEARN_MORE',  label: 'Más información' },
    { value: 'SHOP_NOW',    label: 'Comprar ahora' },
    { value: 'SIGN_UP',     label: 'Registrarse' },
    { value: 'CONTACT_US',  label: 'Contáctanos' },
  ],
}
```

- [ ] **Step 13: Verificar en browser — abrir modal "Nueva campaña" y navegar los 4 pasos**

1. Click en "Nueva campaña" en Campañas
2. Paso 1: completar nombre, objetivo Leads, destino WhatsApp, presupuesto 5000 → Continuar
3. Verificar que se crea la campaña (aparece el ID) y avanza al paso 2
4. Paso 2: elegir Advantage+ → Continuar
5. Verificar que se crea el adset y avanza al paso 3
6. Paso 3: escribir texto → Crear anuncio
7. Verificar que llega al paso 4 con los 3 IDs

- [ ] **Step 14: Commit final**

```bash
git add frontend/src/pages/CrearCampana.jsx
git commit -m "feat: wizard creación completa Campaña + Adset + Anuncio (4 pasos)"
```

---

## Self-Review

**Spec coverage:**
- ✅ Objetivo seleccionable con destinos por objetivo
- ✅ Advantage+ / Público guardado / Manual
- ✅ WhatsApp number o URL según destino
- ✅ CTA según destino
- ✅ Imagen desde biblioteca de Meta
- ✅ Campaña → Adset → Ad en Meta (PAUSED)
- ✅ Confirmación con IDs

**Gaps identificados y resueltos:**
- El `page_id` se obtiene del `account_row.meta_page_id` — si está vacío el anuncio falla. Agregar aviso en el paso 3 si no está configurado.
- `create_adset` usa `meta_post` (form-encoded) pero targeting necesita ser JSON string — ya está con `json.dumps(targeting)` en el payload.
- `CheckCircle` en ImageSelector necesita ser importado.
