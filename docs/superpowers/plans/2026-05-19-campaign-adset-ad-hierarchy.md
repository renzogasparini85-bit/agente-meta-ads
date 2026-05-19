# Campaign → AdSet → Ad Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestructurar la vista de Campañas y Creativos para mostrar la jerarquía real de Meta (Campaña → Conjunto de anuncios → Anuncio), con análisis de ángulo por conjunto y alertas inteligentes basadas en la estructura.

**Architecture:** El backend agrega un nuevo endpoint `/campaigns/tree` que devuelve la jerarquía completa en una sola llamada (campaigns → adsets → ads con insights). El frontend reemplaza las vistas planas de Campanas.jsx y Creativos.jsx con una vista jerárquica expandible. Las alertas existentes en smart_alerts.py se extienden para evaluar rendimiento por ángulo (adset) dentro de una campaña.

**Tech Stack:** FastAPI + Meta Graph API v19 (backend) · React 19 + Tailwind + Recharts (frontend) · SQLAlchemy para persistir nombre de ángulo por adset_id

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|----------------|
| `backend/services/meta_api.py` | Modificar | Agregar `get_adset_insights()` y `get_hierarchy_tree()` |
| `backend/routers/campaigns.py` | Modificar | Agregar `GET /campaigns/tree` |
| `backend/routers/smart_alerts.py` | Modificar | Alertas por ángulo (adset): ángulo sin conversión, ángulo con mejor CPA |
| `frontend/src/services/api.js` | Modificar | Agregar `campaignsAPI.tree()` |
| `frontend/src/pages/Campanas.jsx` | Reemplazar | Vista jerárquica Campaña → AdSet → Ad |
| `frontend/src/pages/Creativos.jsx` | Modificar | Agregar modo "por conjunto" con análisis de ángulo |
| `frontend/src/components/AdSetRow.jsx` | Crear | Fila expandible de conjunto de anuncios con métricas y badge de ángulo |
| `frontend/src/components/AdRow.jsx` | Crear | Fila de anuncio individual con thumbnail, CPA, badge |

---

## Task 1: Backend — `get_adset_insights()` en meta_api.py

**Files:**
- Modify: `backend/services/meta_api.py` (agregar función al final)

- [ ] **Step 1: Agregar función `get_adset_insights` en `meta_api.py`**

Abrí `backend/services/meta_api.py` y agregá esta función después de `get_ad_insights`:

```python
async def get_adset_insights(account_id: str, token: str, days: int = 30) -> list:
    """Insights al nivel adset: una fila por conjunto de anuncios."""
    if token == "DEMO":
        return []
    data = await meta_get(
        f"{account_id}/insights",
        {
            "fields": "adset_id,adset_name,campaign_id,campaign_name,spend,impressions,reach,clicks,ctr,cpc,frequency,actions",
            "level": "adset",
            "time_range": json.dumps(date_range(days)),
            "filtering": json.dumps([{"field": "spend", "operator": "GREATER_THAN", "value": "0"}]),
            "limit": "200",
        },
        token,
    )
    return data.get("data", [])
```

- [ ] **Step 2: Agregar `get_hierarchy_tree()` en `meta_api.py`**

Agregá esta función después de la anterior. Arma la jerarquía en memoria:

```python
async def get_hierarchy_tree(account_id: str, token: str, days: int = 30) -> list:
    """
    Devuelve lista de campañas, cada una con sus adsets, cada adset con sus ads.
    [{
        campaign_id, campaign_name, objective, spend, ctr, cpa, estado,
        adsets: [{
            adset_id, adset_name, spend, ctr, cpa, conversiones, frecuencia, estado,
            ads: [{ad_id, ad_name, spend, ctr, cpa, conversiones, frecuencia, thumbnail, estado}]
        }]
    }]
    """
    import asyncio
    campaigns_raw, adsets_raw, ads_raw = await asyncio.gather(
        get_campaign_insights(account_id, token, days),
        get_adset_insights(account_id, token, days),
        get_ad_insights(account_id, token, days),
    )

    def extract_conversions(actions):
        if not actions:
            return 0
        conv_types = {"onsite_conversion.messaging_conversation_started_7d", "lead", "offsite_conversion.fb_pixel_purchase"}
        return sum(int(a.get("value", 0)) for a in actions if a.get("action_type") in conv_types)

    def compute_cpa(spend, conv):
        try:
            s = float(spend or 0)
            return round(s / conv, 2) if conv > 0 else None
        except Exception:
            return None

    def semaforo(cpa, freq, ctr):
        if cpa is not None and cpa > 900:
            return "rojo"
        if freq is not None and freq > 3.0:
            return "rojo"
        if ctr is not None and float(ctr or 0) < 0.5:
            return "amarillo"
        if cpa is not None and cpa < 500:
            return "verde"
        return "amarillo"

    # Indexar ads por adset_id
    ads_by_adset: dict = {}
    for ad in ads_raw:
        aid = ad.get("adset_id")
        if not aid:
            continue
        conv = extract_conversions(ad.get("actions"))
        spend = float(ad.get("spend", 0))
        ctr = float(ad.get("ctr", 0))
        freq = float(ad.get("frequency", 0))
        cpa = compute_cpa(spend, conv)
        ads_by_adset.setdefault(aid, []).append({
            "ad_id": ad.get("ad_id"),
            "ad_name": ad.get("ad_name"),
            "spend": spend,
            "ctr": round(ctr, 2),
            "cpa": cpa,
            "conversiones": conv,
            "frecuencia": round(freq, 2),
            "estado": semaforo(cpa, freq, ctr),
        })

    # Indexar adsets por campaign_id
    adsets_by_campaign: dict = {}
    for adset in adsets_raw:
        cid = adset.get("campaign_id")
        if not cid:
            continue
        aid = adset.get("adset_id")
        conv = extract_conversions(adset.get("actions"))
        spend = float(adset.get("spend", 0))
        ctr = float(adset.get("ctr", 0))
        freq = float(adset.get("frequency", 0))
        cpa = compute_cpa(spend, conv)
        adsets_by_campaign.setdefault(cid, []).append({
            "adset_id": aid,
            "adset_name": adset.get("adset_name"),
            "spend": spend,
            "ctr": round(ctr, 2),
            "cpa": cpa,
            "conversiones": conv,
            "frecuencia": round(freq, 2),
            "estado": semaforo(cpa, freq, ctr),
            "ads": ads_by_adset.get(aid, []),
        })

    # Armar árbol de campañas
    tree = []
    for c in campaigns_raw:
        cid = c.get("campaign_id")
        conv = extract_conversions(c.get("actions"))
        spend = float(c.get("spend", 0))
        ctr = float(c.get("ctr", 0))
        cpa = compute_cpa(spend, conv)
        adsets = adsets_by_campaign.get(cid, [])
        tree.append({
            "campaign_id": cid,
            "campaign_name": c.get("campaign_name"),
            "objective": c.get("objective"),
            "spend": spend,
            "ctr": round(ctr, 2),
            "cpa": cpa,
            "conversiones": conv,
            "estado": semaforo(cpa, None, ctr),
            "n_adsets": len(adsets),
            "n_ads": sum(len(a["ads"]) for a in adsets),
            "adsets": adsets,
        })

    tree.sort(key=lambda c: c["spend"], reverse=True)
    return tree
```

- [ ] **Step 3: Verificar que el módulo importa sin errores**

```bash
cd backend && source venv/bin/activate && python3 -c "from services.meta_api import get_hierarchy_tree; print('OK')"
```

Esperado: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/services/meta_api.py
git commit -m "feat: add get_adset_insights and get_hierarchy_tree to meta_api"
```

---

## Task 2: Backend — endpoint `GET /campaigns/tree`

**Files:**
- Modify: `backend/routers/campaigns.py`

- [ ] **Step 1: Agregar import de `get_hierarchy_tree` en campaigns.py**

Al principio del archivo, donde están los imports de `meta_api`:

```python
from services.meta_api import (
    get_campaigns, get_campaign_insights, get_ad_insights,
    get_ad_thumbnails, get_hierarchy_tree,   # <-- agregar get_hierarchy_tree
)
```

- [ ] **Step 2: Agregar el endpoint `/campaigns/tree`**

Agregar antes del cierre del archivo (antes del endpoint de pause si existe):

```python
@router.get("/tree")
async def campaign_tree(
    days: int = Query(30),
    db: Session = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    """Devuelve jerarquía completa Campaña → AdSet → Ad con insights."""
    account = resolve_account(client, db)
    try:
        tree = await get_hierarchy_tree(account.meta_account_id, account.meta_access_token, days)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Meta API: {str(e)}")
    return {"tree": tree, "days": days}
```

- [ ] **Step 3: Verificar que el backend levanta**

```bash
cd backend && source venv/bin/activate && python3 -c "import main; print('OK')"
```

Esperado: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/routers/campaigns.py
git commit -m "feat: add GET /campaigns/tree endpoint"
```

---

## Task 3: Backend — alertas por ángulo (adset)

**Files:**
- Modify: `backend/routers/smart_alerts.py`

- [ ] **Step 1: Agregar función `_scan_adset_angles` en smart_alerts.py**

En `smart_alerts.py`, después de las funciones de scan existentes, agregar:

```python
async def _scan_adset_angles(account_id: str, token: str, db, client_id: int):
    """
    Analiza rendimiento por adset (ángulo) dentro de cada campaña.
    Alertas:
    - Ángulo con gasto > 3000 ARS y 0 conversiones en 7 días → pausar
    - Ángulo con CPA > 2x el promedio de la campaña → escalar otros
    - Ángulo con mejor CPA → sugerir replicar/escalar
    """
    from services.meta_api import get_hierarchy_tree
    try:
        tree = await get_hierarchy_tree(account_id, token, days=7)
    except Exception:
        return 0

    nuevas = 0
    for campaign in tree:
        adsets = campaign.get("adsets", [])
        if not adsets:
            continue

        # CPA promedio de la campaña (ignorar adsets sin conversión)
        cpas = [a["cpa"] for a in adsets if a.get("cpa") is not None]
        cpa_promedio = sum(cpas) / len(cpas) if cpas else None

        for adset in adsets:
            adset_id = adset["adset_id"]
            adset_name = adset["adset_name"]
            spend = adset.get("spend", 0)
            conv = adset.get("conversiones", 0)
            cpa = adset.get("cpa")

            # Alerta: gasto sin conversión
            if spend > 3000 and conv == 0:
                exists = db.query(Alert).filter_by(
                    client_id=client_id, tipo="sin_conversion",
                    ad_id=adset_id, estado="activa"
                ).first()
                if not exists:
                    db.add(Alert(
                        client_id=client_id,
                        tipo="sin_conversion",
                        severidad="alta",
                        ad_id=adset_id,
                        mensaje=f'Conjunto "{adset_name}" gastó ${spend:,.0f} en 7 días sin conversiones. Revisá el ángulo o pausalo.',
                        estado="activa",
                    ))
                    nuevas += 1

            # Alerta: CPA 2x el promedio → los otros ángulos son más eficientes
            if cpa and cpa_promedio and cpa > cpa_promedio * 2:
                exists = db.query(Alert).filter_by(
                    client_id=client_id, tipo="cpa_alto",
                    ad_id=adset_id, estado="activa"
                ).first()
                if not exists:
                    db.add(Alert(
                        client_id=client_id,
                        tipo="cpa_alto",
                        severidad="media",
                        ad_id=adset_id,
                        mensaje=f'Conjunto "{adset_name}" tiene CPA ${cpa:,.0f} — el doble del promedio de la campaña (${cpa_promedio:,.0f}). Considerá pausarlo y escalar los otros ángulos.',
                        estado="activa",
                    ))
                    nuevas += 1

    db.commit()
    return nuevas
```

- [ ] **Step 2: Llamar a `_scan_adset_angles` desde `_scan_client`**

En la función `_scan_client` (o la función principal de scan), agregar al final antes del return:

```python
    nuevas_angulos = await _scan_adset_angles(account_id, token, db, client.id)
    total_alertas += nuevas_angulos
```

Asegurate de que `total_alertas` se suma correctamente con el resultado existente.

- [ ] **Step 3: Verificar imports**

```bash
cd backend && source venv/bin/activate && python3 -c "import main; print('OK')"
```

Esperado: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/routers/smart_alerts.py
git commit -m "feat: add adset-level angle alerts to smart_alerts"
```

---

## Task 4: Frontend — api.js y componentes base

**Files:**
- Modify: `frontend/src/services/api.js`
- Create: `frontend/src/components/AdSetRow.jsx`
- Create: `frontend/src/components/AdRow.jsx`

- [ ] **Step 1: Agregar `campaignsAPI.tree()` en api.js**

En `frontend/src/services/api.js`, dentro del objeto `campaignsAPI` existente, agregar:

```javascript
export const campaignsAPI = {
  // ... métodos existentes ...
  tree: (days = 30, accountId) => {
    const p = accountId ? `?days=${days}&account_id=${accountId}` : `?days=${days}`
    return api.get(`/campaigns/tree${p}`).then(r => r.data)
  },
}
```

- [ ] **Step 2: Crear `frontend/src/components/AdRow.jsx`**

```jsx
import { CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react'

const semaforo = {
  verde:    { icon: CheckCircle,   color: 'text-green-400',  bg: 'bg-green-400/8 border-green-400/15' },
  amarillo: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/8 border-yellow-400/15' },
  rojo:     { icon: XCircle,       color: 'text-red-400',    bg: 'bg-red-400/8 border-red-400/15' },
}

const fmt = (n) => n != null ? Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '—'

export default function AdRow({ ad, depth = 2 }) {
  const s = semaforo[ad.estado] || semaforo.amarillo
  const Icon = s.icon
  const indent = depth === 2 ? 'ml-10' : 'ml-6'

  return (
    <div className={`${indent} flex items-center gap-3 px-3 py-2 rounded-lg border ${s.bg} text-xs`}>
      <Icon size={13} className={`shrink-0 ${s.color}`} />
      <span className="text-slate-300 flex-1 truncate">{ad.ad_name}</span>
      <div className="flex items-center gap-4 shrink-0 text-slate-500">
        {ad.cpa != null && (
          <span className={ad.estado === 'verde' ? 'text-green-400 font-medium' : ''}>
            CPA ${fmt(ad.cpa)}
          </span>
        )}
        <span>CTR {ad.ctr}%</span>
        <span>{ad.conversiones} conv.</span>
        <span className="text-slate-600">${fmt(ad.spend)}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Crear `frontend/src/components/AdSetRow.jsx`**

```jsx
import { useState } from 'react'
import { ChevronRight, ChevronDown, CheckCircle, AlertTriangle, XCircle, Target } from 'lucide-react'
import AdRow from './AdRow'

const semaforo = {
  verde:    { icon: CheckCircle,   color: 'text-green-400',  bg: 'bg-green-400/8 border-green-400/20',  label: 'Eficiente' },
  amarillo: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/8 border-yellow-400/20', label: 'Atención' },
  rojo:     { icon: XCircle,       color: 'text-red-400',    bg: 'bg-red-400/8 border-red-400/20',       label: 'Crítico' },
}

const fmt = (n) => n != null ? Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '—'

export default function AdSetRow({ adset, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const s = semaforo[adset.estado] || semaforo.amarillo
  const Icon = s.icon
  const Chevron = open ? ChevronDown : ChevronRight
  const hasAds = adset.ads?.length > 0

  // Badge de ángulo: inferido del nombre del adset
  const angleBadge = adset.adset_name?.length > 0 ? adset.adset_name.split('—').pop()?.trim() : null

  return (
    <div className="ml-5 space-y-1">
      {/* Fila del adset */}
      <div
        onClick={() => hasAds && setOpen(o => !o)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${s.bg} ${hasAds ? 'cursor-pointer hover:brightness-110' : ''}`}
      >
        {hasAds && <Chevron size={13} className="text-slate-500 shrink-0" />}
        {!hasAds && <span className="w-3" />}
        <Icon size={14} className={`shrink-0 ${s.color}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-200 text-xs font-medium truncate">{adset.adset_name}</span>
            {angleBadge && (
              <span className="text-xs px-1.5 py-0.5 rounded border border-violet-DEFAULT/25 bg-violet-DEFAULT/10 text-violet-glow shrink-0">
                {angleBadge}
              </span>
            )}
          </div>
          <span className="text-slate-600 text-xs">{adset.ads?.length || 0} anuncios</span>
        </div>

        <div className="flex items-center gap-4 shrink-0 text-xs text-slate-500">
          {adset.cpa != null && (
            <div className="text-right">
              <p className={`font-semibold ${adset.estado === 'verde' ? 'text-green-400' : adset.estado === 'rojo' ? 'text-red-400' : 'text-slate-300'}`}>
                CPA ${fmt(adset.cpa)}
              </p>
              <p className="text-slate-600">{adset.conversiones} conv.</p>
            </div>
          )}
          <div className="text-right hidden sm:block">
            <p className="text-slate-400">CTR {adset.ctr}%</p>
            <p className="text-slate-600">Frec. {adset.frecuencia}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400">${fmt(adset.spend)}</p>
            <p className={`text-xs font-medium ${s.color}`}>{s.label}</p>
          </div>
        </div>
      </div>

      {/* Ads expandidos */}
      {open && hasAds && (
        <div className="space-y-1 pb-1">
          {adset.ads.map(ad => (
            <AdRow key={ad.ad_id} ad={ad} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verificar build**

```bash
cd frontend && npx vite build --mode development 2>&1 | grep -E "error|✓"
```

Esperado: `✓ built in ...`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/api.js frontend/src/components/AdSetRow.jsx frontend/src/components/AdRow.jsx
git commit -m "feat: add tree API method and AdSetRow/AdRow components"
```

---

## Task 5: Frontend — reemplazar Campanas.jsx con vista jerárquica

**Files:**
- Modify: `frontend/src/pages/Campanas.jsx` (reescribir completo)

- [ ] **Step 1: Reemplazar Campanas.jsx con la vista jerárquica**

Reemplazá el contenido completo de `frontend/src/pages/Campanas.jsx`:

```jsx
import { useState } from 'react'
import { ChevronRight, ChevronDown, CheckCircle, AlertTriangle, XCircle,
         RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { campaignsAPI } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { PageLoading, ErrorState } from '../components/LoadingState'
import { useAccount } from '../context/AccountContext'
import AdSetRow from '../components/AdSetRow'

const PERIODS = [
  { label: 'Hoy', days: 1 },
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
]

const semaforo = {
  verde:    { icon: CheckCircle,   color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/25',  label: 'Saludable' },
  amarillo: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/25', label: 'Atención' },
  rojo:     { icon: XCircle,       color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/25',       label: 'Crítico' },
}

const fmt = (n) => n != null ? Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '—'

function CampaignRow({ campaign }) {
  const [open, setOpen] = useState(false)
  const s = semaforo[campaign.estado] || semaforo.amarillo
  const Icon = s.icon
  const Chevron = open ? ChevronDown : ChevronRight

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header de campaña */}
      <div
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/3 transition-colors"
      >
        <Chevron size={15} className="text-slate-500 shrink-0" />
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${campaign.estado === 'verde' ? 'bg-green-400' : campaign.estado === 'rojo' ? 'bg-red-400' : 'bg-yellow-400'}`} />

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{campaign.campaign_name}</p>
          <p className="text-slate-600 text-xs">
            {campaign.n_adsets} conjuntos · {campaign.n_ads} anuncios
            {campaign.objective && ` · ${campaign.objective.replace('OUTCOME_', '')}`}
          </p>
        </div>

        <div className="flex items-center gap-5 shrink-0 text-xs">
          {campaign.cpa != null && (
            <div className="text-right hidden sm:block">
              <p className="text-slate-300 font-semibold">CPA ${fmt(campaign.cpa)}</p>
              <p className="text-slate-600">{campaign.conversiones} conv.</p>
            </div>
          )}
          <div className="text-right hidden md:block">
            <p className="text-slate-400">CTR {campaign.ctr}%</p>
          </div>
          <div className="text-right">
            <p className="text-slate-300 font-medium">${fmt(campaign.spend)}</p>
            <p className={`text-xs font-medium ${s.color}`}>{s.label}</p>
          </div>
        </div>
      </div>

      {/* AdSets expandidos */}
      {open && (
        <div className="border-t border-border bg-bg px-3 py-3 space-y-2">
          {campaign.adsets?.length === 0 && (
            <p className="text-slate-600 text-xs text-center py-3">Sin conjuntos con datos en el período</p>
          )}
          {campaign.adsets?.map(adset => (
            <AdSetRow key={adset.adset_id} adset={adset} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Campanas() {
  const { selected: account } = useAccount()
  const [days, setDays] = useState(30)

  const { data, loading, error, refetch } = useFetch(
    () => campaignsAPI.tree(days, account?.id),
    [days, account?.id]
  )

  if (loading) return <PageLoading />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const tree = data?.tree || []
  const totales = tree.reduce((acc, c) => ({
    spend: acc.spend + (c.spend || 0),
    conversiones: acc.conversiones + (c.conversiones || 0),
    adsets: acc.adsets + (c.n_adsets || 0),
    ads: acc.ads + (c.n_ads || 0),
  }), { spend: 0, conversiones: 0, adsets: 0, ads: 0 })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-white text-2xl font-bold">Campañas</h1>
        <p className="text-slate-400 text-sm mt-1">
          {tree.length} campañas · {totales.adsets} conjuntos · {totales.ads} anuncios
        </p>
      </div>

      {/* Período */}
      <div className="flex gap-2">
        {PERIODS.map(p => (
          <button key={p.days} onClick={() => setDays(p.days)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
              ${days === p.days
                ? 'bg-violet-DEFAULT/20 text-violet-glow border border-violet-DEFAULT/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Inversión total', value: `$${fmt(totales.spend)}` },
          { label: 'Conversaciones', value: fmt(totales.conversiones) },
          { label: 'CPA promedio', value: totales.conversiones > 0 ? `$${fmt(totales.spend / totales.conversiones)}` : '—' },
        ].map(k => (
          <div key={k.label} className="bg-surface border border-border rounded-xl px-4 py-3 text-center">
            <p className="text-slate-500 text-xs">{k.label}</p>
            <p className="text-white font-bold text-lg mt-0.5">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Árbol */}
      <div className="space-y-3">
        {tree.length === 0 && (
          <div className="text-center py-16 text-slate-600 text-sm">
            Sin campañas activas en el período seleccionado.
          </div>
        )}
        {tree.map(campaign => (
          <CampaignRow key={campaign.campaign_id} campaign={campaign} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend && npx vite build --mode development 2>&1 | grep -E "error|✓"
```

Esperado: `✓ built in ...`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Campanas.jsx
git commit -m "feat: replace flat campaign list with Campaign→AdSet→Ad hierarchy view"
```

---

## Task 6: Frontend — panel de análisis por ángulo en Creativos

**Files:**
- Modify: `frontend/src/pages/Creativos.jsx` (agregar tab "Por conjunto")

- [ ] **Step 1: Agregar tab "Por conjunto / ángulo" en Creativos.jsx**

En `Creativos.jsx`, al principio del componente principal, agregar estado de tab:

```jsx
const [tab, setTab] = useState('creativos') // 'creativos' | 'angulos'
```

Agregar el selector de tabs debajo del título (antes del filtro existente):

```jsx
<div className="flex gap-1 border-b border-border pb-0">
  {[
    { key: 'creativos', label: 'Por anuncio' },
    { key: 'angulos',   label: 'Por conjunto / ángulo' },
  ].map(t => (
    <button key={t.key} onClick={() => setTab(t.key)}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-px
        ${tab === t.key
          ? 'border-violet-DEFAULT text-white'
          : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
      {t.label}
    </button>
  ))}
</div>
```

- [ ] **Step 2: Agregar vista "Por conjunto" con fetch del tree**

En `Creativos.jsx`, agregar el fetch de tree (puede ir junto a los otros useFetch existentes):

```jsx
const { data: treeData } = useFetch(
  () => campaignsAPI.tree(days, account?.id),
  [days, account?.id]
)
```

Agregar import de `campaignsAPI` si no está:
```jsx
import { creativesAPI, recommendationsAPI, brandAPI, campaignsAPI } from '../services/api'
```

- [ ] **Step 3: Agregar componente `AngulosView` en Creativos.jsx**

Agregar antes del `export default`, el componente de vista por ángulo:

```jsx
function AngulosView({ tree = [] }) {
  const fmt = (n) => n != null ? Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '—'

  const badgeAngulo = (adset) => {
    const cpa = adset.cpa
    const conv = adset.conversiones
    if (!cpa && conv === 0) return { label: 'Sin datos', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' }
    if (cpa < 500) return { label: 'Escalar', color: 'text-green-400 bg-green-400/10 border-green-400/20' }
    if (cpa < 750) return { label: 'Retener', color: 'text-violet-glow bg-violet-DEFAULT/10 border-violet-DEFAULT/20' }
    if (conv === 0) return { label: 'Pausar', color: 'text-red-400 bg-red-400/10 border-red-400/20' }
    return { label: 'Optimizar', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' }
  }

  if (tree.length === 0) {
    return <p className="text-slate-600 text-sm text-center py-12">Sin datos de campañas.</p>
  }

  return (
    <div className="space-y-6">
      {tree.map(campaign => (
        <div key={campaign.campaign_id}>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-white font-semibold text-sm">{campaign.campaign_name}</p>
            <span className="text-slate-600 text-xs">{campaign.n_adsets} conjuntos</span>
          </div>

          {/* Tabla comparativa de conjuntos */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-6 gap-0 px-4 py-2 border-b border-border bg-bg">
              {['Conjunto / Ángulo', 'CPA', 'Conv.', 'CTR', 'Frec.', 'Acción'].map(h => (
                <p key={h} className="text-slate-600 text-xs font-medium">{h}</p>
              ))}
            </div>
            {campaign.adsets?.length === 0 && (
              <p className="text-slate-600 text-xs text-center py-4">Sin conjuntos en el período</p>
            )}
            {campaign.adsets?.map((adset, i) => {
              const badge = badgeAngulo(adset)
              return (
                <div key={adset.adset_id}
                  className={`grid grid-cols-6 gap-0 px-4 py-3 text-xs ${i % 2 === 0 ? '' : 'bg-bg/40'} border-b border-border/50 last:border-0`}>
                  <p className="text-slate-300 truncate pr-2">{adset.adset_name}</p>
                  <p className={adset.estado === 'verde' ? 'text-green-400 font-semibold' : adset.estado === 'rojo' ? 'text-red-400' : 'text-slate-300'}>
                    {adset.cpa ? `$${fmt(adset.cpa)}` : '—'}
                  </p>
                  <p className="text-slate-400">{adset.conversiones}</p>
                  <p className="text-slate-400">{adset.ctr}%</p>
                  <p className={adset.frecuencia > 3 ? 'text-red-400' : adset.frecuencia > 2.5 ? 'text-yellow-400' : 'text-slate-400'}>
                    {adset.frecuencia}
                  </p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border w-fit ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Insight rápido: mejor y peor ángulo */}
          {campaign.adsets?.length > 1 && (() => {
            const conConv = campaign.adsets.filter(a => a.cpa != null)
            if (conConv.length < 2) return null
            const mejor = conConv.reduce((a, b) => a.cpa < b.cpa ? a : b)
            const peor  = conConv.reduce((a, b) => a.cpa > b.cpa ? a : b)
            return (
              <div className="mt-2 flex gap-2">
                <div className="flex-1 bg-green-400/5 border border-green-400/15 rounded-lg px-3 py-2">
                  <p className="text-green-400 text-xs font-medium">✅ Mejor ángulo</p>
                  <p className="text-slate-300 text-xs mt-0.5 truncate">{mejor.adset_name}</p>
                  <p className="text-green-400 text-xs">CPA ${fmt(mejor.cpa)}</p>
                </div>
                <div className="flex-1 bg-red-400/5 border border-red-400/15 rounded-lg px-3 py-2">
                  <p className="text-red-400 text-xs font-medium">⚠️ Ángulo a revisar</p>
                  <p className="text-slate-300 text-xs mt-0.5 truncate">{peor.adset_name}</p>
                  <p className="text-red-400 text-xs">CPA ${fmt(peor.cpa)}</p>
                </div>
              </div>
            )
          })()}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Renderizar la vista correcta según el tab**

En el JSX del componente principal de Creativos, envolver el contenido existente con la condición de tab:

```jsx
{tab === 'angulos' ? (
  <AngulosView tree={treeData?.tree || []} />
) : (
  /* ... contenido existente de creativos ... */
)}
```

- [ ] **Step 5: Verificar build final**

```bash
cd frontend && npx vite build --mode development 2>&1 | grep -E "error|✓"
```

Esperado: `✓ built in ...`

- [ ] **Step 6: Commit final**

```bash
git add frontend/src/pages/Creativos.jsx
git commit -m "feat: add angle/adset comparison tab to Creativos page"
```

---

## Self-Review

**Cobertura del spec:**
- ✅ Campaña → Conjunto → Anuncio visible y expandible
- ✅ Análisis de ángulo por conjunto dentro de una campaña
- ✅ Badge de acción por conjunto (Escalar / Retener / Optimizar / Pausar)
- ✅ Mejor y peor ángulo destacados con insight automático
- ✅ Alertas proactivas por ángulo sin conversión y CPA 2x promedio
- ✅ Frecuencia coloreada por conjunto (>2.5 amarillo, >3.0 rojo)
- ✅ Tab "Por anuncio" mantiene la vista existente sin romper nada

**Notas de implementación:**
- El endpoint `/campaigns/tree` hace 3 llamadas paralelas a Meta API (campaigns + adsets + ads) con `asyncio.gather` — mínima latencia
- El badge de ángulo en `AdSetRow` infiere el nombre del ángulo desde el nombre del conjunto (split por `—`), siguiendo la convención de nomenclatura habitual en Meta (`Campaña — Ángulo`)
- La vista de Creativos mantiene el tab "Por anuncio" intacto como fallback
