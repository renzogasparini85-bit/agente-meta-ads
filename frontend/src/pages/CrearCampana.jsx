import { useState, useEffect, Component } from 'react'
import { X, CheckCircle } from 'lucide-react'
import { campaignsAPI } from '../services/api'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div className="p-6 text-red-400 text-sm space-y-2">
        <p className="font-bold">Error en el wizard:</p>
        <pre className="text-xs bg-red-500/10 rounded p-3 overflow-auto whitespace-pre-wrap">{this.state.error?.message}\n{this.state.error?.stack}</pre>
        <button onClick={() => this.setState({ error: null })} className="text-xs underline">Reintentar</button>
      </div>
    )
    return this.props.children
  }
}

const OBJETIVOS = [
  { value: 'OUTCOME_LEADS',         label: 'Clientes potenciales' },
  { value: 'OUTCOME_SALES',         label: 'Ventas' },
  { value: 'OUTCOME_ENGAGEMENT',    label: 'Interacción' },
  { value: 'OUTCOME_TRAFFIC',       label: 'Tráfico' },
  { value: 'OUTCOME_AWARENESS',     label: 'Reconocimiento' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'Promoción de la app' },
]

const OBJETIVO_DESTINOS = {
  OUTCOME_SALES:         ['WHATSAPP', 'WEBSITE', 'MESSENGER', 'INSTAGRAM_DIRECT'],
  OUTCOME_LEADS:         ['WHATSAPP', 'WEBSITE', 'MESSENGER', 'INSTAGRAM_DIRECT'],
  OUTCOME_TRAFFIC:       ['WEBSITE', 'WHATSAPP', 'MESSENGER'],
  OUTCOME_ENGAGEMENT:    ['WEBSITE', 'WHATSAPP', 'MESSENGER', 'INSTAGRAM_DIRECT'],
  OUTCOME_AWARENESS:     [],
  OUTCOME_APP_PROMOTION: [],
}

const OBJETIVO_OPTIMIZATION = {
  OUTCOME_SALES:         { WEBSITE: 'OFFSITE_CONVERSIONS', WHATSAPP: 'CONVERSATIONS', MESSENGER: 'CONVERSATIONS', INSTAGRAM_DIRECT: 'CONVERSATIONS' },
  OUTCOME_LEADS:         { WEBSITE: 'LEAD_GENERATION',     WHATSAPP: 'CONVERSATIONS', MESSENGER: 'CONVERSATIONS', INSTAGRAM_DIRECT: 'CONVERSATIONS' },
  OUTCOME_TRAFFIC:       { WEBSITE: 'LINK_CLICKS',          WHATSAPP: 'LINK_CLICKS',   MESSENGER: 'LINK_CLICKS' },
  OUTCOME_ENGAGEMENT:    { default: 'POST_ENGAGEMENT' },
  OUTCOME_AWARENESS:     { default: 'REACH' },
  OUTCOME_APP_PROMOTION: { default: 'APP_INSTALLS' },
}

const DESTINO_CTAS = {
  WHATSAPP:         [{ value: 'WHATSAPP_MESSAGE', label: 'Enviar mensaje por WhatsApp' }],
  MESSENGER:        [{ value: 'MESSAGE_PAGE',     label: 'Enviar mensaje' }],
  INSTAGRAM_DIRECT: [{ value: 'MESSAGE_PAGE',     label: 'Enviar mensaje directo' }],
  WEBSITE:          [
    { value: 'LEARN_MORE', label: 'Más información' },
    { value: 'SHOP_NOW',   label: 'Comprar ahora' },
    { value: 'SIGN_UP',    label: 'Registrarse' },
    { value: 'CONTACT_US', label: 'Contáctanos' },
  ],
}

const DESTINO_LABELS = {
  WHATSAPP:         '💬 WhatsApp',
  WEBSITE:          '🌐 Sitio web',
  MESSENGER:        '💙 Messenger',
  INSTAGRAM_DIRECT: '📷 Instagram DM',
}

const inputCls = 'w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors'

const parseError = (e) => {
  const detail = e?.response?.data?.detail
  if (!detail) return e?.message || 'Error desconocido'
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map(d => d.msg || JSON.stringify(d)).join(' · ')
  return JSON.stringify(detail)
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

function WhatsappNumberSelector({ accountId, value, onChange }) {
  const [numbers, setNumbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [hint, setHint] = useState(null)

  useEffect(() => {
    setLoading(true)
    campaignsAPI.getWhatsappNumbers(accountId)
      .then(r => {
        setNumbers(r.data || [])
        if ((r.data || []).length === 0 && r.pages_available?.length > 0) {
          setHint(`Páginas encontradas sin WA vinculado: ${r.pages_available.map(p => p.name).join(', ')}. Vinculá WhatsApp desde Meta Business Suite.`)
        }
      })
      .catch(() => setNumbers([]))
      .finally(() => setLoading(false))
  }, [accountId])

  if (loading) {
    return <p className="text-slate-500 text-xs py-1">Cargando números de WhatsApp desde Meta…</p>
  }

  if (numbers.length === 0) {
    return (
      <Field label="Número de WhatsApp">
        <input value={value}
          onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
          placeholder="5491112345678"
          className={inputCls} />
        <p className="text-slate-600 text-xs mt-1">
          {hint || 'No se encontró un número de WhatsApp vinculado a esta página. Ingresá manualmente: 549 + código de área + número (sin +, espacios ni guiones).'}
        </p>
      </Field>
    )
  }

  return (
    <Field label="Número de WhatsApp">
      <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
        <option value="">Seleccioná un número…</option>
        {numbers.map(n => {
          const digits = n.digits || n.display_phone_number.replace(/\D/g, '')
          return (
            <option key={digits} value={digits}>
              {n.verified_name} — {n.display_phone_number}
            </option>
          )
        })}
      </select>
    </Field>
  )
}

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
          <option key={a.id} value={a.id}>
            {a.name} (~{Number(a.approximate_count_lower_bound || 0).toLocaleString()})
          </option>
        ))}
      </select>
    </Field>
  )
}

function ManualAudienceFields({ form, setForm }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Edad mínima">
          <input type="number" value={form.age_min} min={18} max={65}
            onChange={e => setForm(f => ({ ...f, age_min: parseInt(e.target.value) }))}
            className={inputCls} />
        </Field>
        <Field label="Edad máxima">
          <input type="number" value={form.age_max} min={18} max={65}
            onChange={e => setForm(f => ({ ...f, age_max: parseInt(e.target.value) }))}
            className={inputCls} />
        </Field>
      </div>
      <Field label="Género">
        <div className="flex gap-2">
          {[{ v: [], l: 'Todos' }, { v: [1], l: 'Hombres' }, { v: [2], l: 'Mujeres' }].map(({ v, l }) => (
            <button key={l} onClick={() => setForm(f => ({ ...f, genders: v }))}
              className={`flex-1 py-2 rounded-lg border text-xs cursor-pointer transition-all ${JSON.stringify(form.genders) === JSON.stringify(v) ? 'bg-violet-500/20 border-violet-500/40 text-white' : 'border-border text-slate-400 hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>
      </Field>
    </div>
  )
}

function ImageSelector({ accountId, value, onChange }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    campaignsAPI.getAdImages(accountId)
      .then(r => setImages(r.data || []))
      .finally(() => setLoading(false))
  }, [accountId])
  return (
    <Field label="Imagen del anuncio (opcional)">
      {loading ? (
        <p className="text-slate-500 text-xs py-2">Cargando biblioteca…</p>
      ) : images.length === 0 ? (
        <p className="text-slate-500 text-xs py-2">Sin imágenes en la biblioteca. Subí una desde Meta Ads Manager.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
          {images.map(img => (
            <button key={img.hash} onClick={() => onChange(value === img.hash ? '' : img.hash)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${value === img.hash ? 'border-violet-500' : 'border-transparent hover:border-slate-500'}`}>
              <img src={img.url_128} alt={img.name} className="w-full h-full object-cover" />
              {value === img.hash && (
                <div className="absolute inset-0 bg-violet-500/30 flex items-center justify-center">
                  <CheckCircle size={16} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </Field>
  )
}

export default function CrearCampana({ onClose, onCreated, account }) {
  const [step, setStep] = useState(1)
  const [campanaId, setCampanaId] = useState(null)
  const [adsetId, setAdsetId]     = useState(null)
  const [adId, setAdId]           = useState(null)
  const [creando, setCreando]     = useState(false)
  const [error, setError]         = useState(null)

  const [form, setForm] = useState({
    nombre:      '',
    objetivo:    'OUTCOME_LEADS',
    destino:     'WHATSAPP',
    presupuesto: '',
    audience_type:     'advantage',
    saved_audience_id: '',
    age_min:   18,
    age_max:   65,
    genders:   [],
    countries: ['AR'],
    interests: [],
    image_hash:      '',
    message:         '',
    headline:        '',
    description:     '',
    call_to_action:  'WHATSAPP_MESSAGE',
    link_url:        '',
    whatsapp_number: '',
  })

  const handleCrearCampana = async () => {
    setCreando(true); setError(null)
    try {
      const res = await campaignsAPI.createDraft({
        nombre:             form.nombre,
        objetivo:           form.objetivo,
        presupuesto_diario: parseInt(form.presupuesto),
        account_id:         account?.id ? String(account.id) : null,
      })
      setCampanaId(res.campaign_id)
      setStep(2)
    } catch (e) {
      setError(parseError(e) || 'Error al crear la campaña')
    } finally { setCreando(false) }
  }

  const handleCrearAdset = async () => {
    setCreando(true); setError(null)
    const optGoal =
      OBJETIVO_OPTIMIZATION[form.objetivo]?.[form.destino] ||
      OBJETIVO_OPTIMIZATION[form.objetivo]?.default ||
      'CONVERSATIONS'
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
      setError(parseError(e) || 'Error al crear el conjunto de anuncios')
    } finally { setCreando(false) }
  }

  const handleCrearAd = async () => {
    setCreando(true); setError(null)
    try {
      const res = await campaignsAPI.createAd({
        adset_id:        adsetId,
        nombre:          `${form.nombre} — Anuncio`,
        page_id:         account?.meta_page_id || null,
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
      setError(parseError(e) || 'Error al crear el anuncio')
    } finally { setCreando(false) }
  }

  const STEPS = ['Campaña', 'Audiencia', 'Anuncio', 'Listo']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
      <ErrorBoundary>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <p className="font-bold text-white">Nueva campaña</p>
            <p className="text-slate-500 text-xs mt-0.5">Paso {step} de {STEPS.length}: {STEPS[step - 1]}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-border">
          <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${(step / STEPS.length) * 100}%` }} />
        </div>

        {/* ── Paso 1: Campaña ── */}
        {step === 1 && (
          <div className="space-y-4 p-5">
            <Field label="Nombre de la campaña">
              <input value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: IFPA — Mensajes — Mayo 2026"
                className={inputCls} />
            </Field>

            <Field label="Objetivo">
              <select value={form.objetivo}
                onChange={e => {
                  const obj = e.target.value
                  const destinos = OBJETIVO_DESTINOS[obj] || []
                  setForm(f => ({
                    ...f,
                    objetivo:      obj,
                    destino:       destinos[0] || '',
                    call_to_action: DESTINO_CTAS[destinos[0]]?.[0]?.value || '',
                  }))
                }}
                className={inputCls}>
                {OBJETIVOS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>

            {(OBJETIVO_DESTINOS[form.objetivo]?.length > 0) && (
              <Field label="Destino">
                <div className="grid grid-cols-2 gap-2">
                  {OBJETIVO_DESTINOS[form.objetivo].map(d => (
                    <button key={d}
                      onClick={() => setForm(f => ({
                        ...f,
                        destino:       d,
                        call_to_action: DESTINO_CTAS[d]?.[0]?.value || '',
                      }))}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all text-left ${form.destino === d ? 'bg-violet-500/20 border-violet-500/40 text-white' : 'border-border text-slate-400 hover:border-slate-500 hover:text-white'}`}>
                      {DESTINO_LABELS[d] || d}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <Field label="Presupuesto diario (ARS)">
              <input type="number" value={form.presupuesto}
                onChange={e => setForm(f => ({ ...f, presupuesto: e.target.value }))}
                placeholder="5000" min="5000" className={inputCls} />
              <p className="text-slate-600 text-xs mt-1">Mínimo recomendado: $5.000 ARS / día</p>
            </Field>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button onClick={handleCrearCampana}
              disabled={creando || !form.nombre || !form.presupuesto}
              className="w-full py-3 bg-violet-600 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity">
              {creando ? 'Creando campaña…' : 'Continuar →'}
            </button>
          </div>
        )}

        {/* ── Paso 2: Audiencia ── */}
        {step === 2 && (
          <div className="space-y-4 p-5">
            <p className="text-slate-500 text-xs">
              Campaña creada ✓ ID: <span className="text-white font-mono">{campanaId}</span>
            </p>

            <Field label="Tipo de audiencia">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 'advantage', l: '⚡ Advantage+', d: 'Meta optimiza solo' },
                  { v: 'saved',     l: '📋 Guardada',   d: 'Público guardado' },
                  { v: 'manual',    l: '🎯 Manual',      d: 'Intereses y edad' },
                ].map(({ v, l, d }) => (
                  <button key={v} onClick={() => setForm(f => ({ ...f, audience_type: v }))}
                    className={`px-3 py-3 rounded-xl border text-xs font-medium cursor-pointer transition-all text-left ${form.audience_type === v ? 'bg-violet-500/20 border-violet-500/40 text-white' : 'border-border text-slate-400 hover:border-slate-500'}`}>
                    <p>{l}</p>
                    <p className="text-slate-600 mt-0.5 font-normal">{d}</p>
                  </button>
                ))}
              </div>
            </Field>

            {form.audience_type === 'saved' && (
              <SavedAudienceSelector
                accountId={account?.id}
                value={form.saved_audience_id}
                onChange={id => setForm(f => ({ ...f, saved_audience_id: id }))}
              />
            )}

            {form.audience_type === 'manual' && (
              <ManualAudienceFields form={form} setForm={setForm} />
            )}

            {form.destino === 'WEBSITE' && (
              <Field label="URL de destino">
                <input value={form.link_url}
                  onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                  placeholder="https://tusitio.com/landing" className={inputCls} />
              </Field>
            )}

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-2">
              <button onClick={() => setStep(1)}
                className="px-4 py-2.5 border border-border rounded-xl text-slate-400 hover:text-white text-sm cursor-pointer transition-colors">
                ← Atrás
              </button>
              <button onClick={handleCrearAdset} disabled={creando}
                className="flex-1 py-2.5 bg-violet-600 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity">
                {creando ? 'Creando conjunto…' : 'Continuar →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 3: Anuncio ── */}
        {step === 3 && (
          <div className="space-y-4 p-5">
            <p className="text-slate-500 text-xs">
              Conjunto creado ✓ ID: <span className="text-white font-mono">{adsetId}</span>
            </p>

            {!account?.meta_page_id && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2 text-xs text-yellow-400">
                ⚠️ No hay Page ID configurado para esta cuenta. El anuncio puede fallar. Configuralo en Gestión de Cuentas.
              </div>
            )}

            <ImageSelector
              accountId={account?.id}
              value={form.image_hash}
              onChange={hash => setForm(f => ({ ...f, image_hash: hash }))}
            />

            <Field label="Texto principal">
              <textarea rows={3} value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Texto que aparece sobre la imagen..."
                className={`${inputCls} resize-none`} />
            </Field>

            <Field label="Titular">
              <input value={form.headline}
                onChange={e => setForm(f => ({ ...f, headline: e.target.value }))}
                placeholder="Titular del anuncio" className={inputCls} />
            </Field>

            <Field label="Descripción (opcional)">
              <input value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descripción adicional" className={inputCls} />
            </Field>

            <Field label="Botón (CTA)">
              <select value={form.call_to_action}
                onChange={e => setForm(f => ({ ...f, call_to_action: e.target.value }))}
                className={inputCls}>
                {(DESTINO_CTAS[form.destino] || DESTINO_CTAS['WEBSITE']).map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-2">
              <button onClick={() => setStep(2)}
                className="px-4 py-2.5 border border-border rounded-xl text-slate-400 hover:text-white text-sm cursor-pointer transition-colors">
                ← Atrás
              </button>
              <button onClick={handleCrearAd}
                disabled={creando || !form.message}
                className="flex-1 py-2.5 bg-violet-600 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity">
                {creando ? 'Creando anuncio…' : 'Crear anuncio →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 4: Confirmación ── */}
        {step === 4 && (
          <div className="p-5 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-400/15 border border-green-400/30 flex items-center justify-center mx-auto">
              <CheckCircle size={28} className="text-green-400" />
            </div>
            <div>
              <p className="text-white font-bold text-lg">¡Campaña lista!</p>
              <p className="text-slate-400 text-sm mt-1">
                Está en modo <span className="text-yellow-400 font-medium">PAUSED</span>. Activala desde Meta Ads Manager cuando quieras.
              </p>
            </div>
            <div className="bg-bg border border-border rounded-xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Campaña</span>
                <span className="text-white font-mono">{campanaId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Conjunto</span>
                <span className="text-white font-mono">{adsetId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Anuncio</span>
                <span className="text-white font-mono">{adId}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 border border-border rounded-xl text-slate-400 hover:text-white text-sm cursor-pointer transition-colors">
                Cerrar
              </button>
              <button onClick={onCreated}
                className="flex-1 py-2.5 bg-violet-600 text-white font-semibold rounded-xl hover:opacity-90 cursor-pointer transition-opacity">
                Ver campañas
              </button>
            </div>
          </div>
        )}

      </ErrorBoundary>
      </div>
    </div>
  )
}
