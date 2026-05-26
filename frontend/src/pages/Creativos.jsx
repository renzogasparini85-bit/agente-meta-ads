import { useState } from 'react'
import { TrendingUp, Pause, Copy, AlertTriangle, Star, Sparkles, Clock, HelpCircle, X, ArrowUpRight, Wand2, ChevronDown, Check, Zap, ChevronRight, ExternalLink, ScanLine } from 'lucide-react'
import { creativesAPI, campaignsAPI, recommendationsAPI, brandAPI, alertsAPI } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { PageLoading, ErrorState, Spinner } from '../components/LoadingState'
import DateRangePicker from '../components/DateRangePicker'
import CrearCampana from './CrearCampana'
import { useAccount } from '../context/AccountContext'

const badgeConfig = {
  escalar:          { label: 'Escalar',           icon: TrendingUp,    bg: 'bg-green-400/15      border-green-400/30',      text: 'text-green-400'   },
  retener:          { label: 'Retener',           icon: Star,          bg: 'bg-cyan-400/15       border-cyan-400/30',       text: 'text-cyan-400'    },
  optimizar:        { label: 'Optimizar copy',    icon: Wand2,         bg: 'bg-orange-400/15     border-orange-400/30',     text: 'text-orange-400'  },
  replicar:         { label: 'Replicar',          icon: Copy,          bg: 'bg-blue-400/15       border-blue-400/30',       text: 'text-blue-400'    },
  mantener:         { label: 'Mantener',          icon: Star,          bg: 'bg-slate-400/15      border-slate-400/30',      text: 'text-slate-400'   },
  fatiga:           { label: 'Fatiga creativa',   icon: AlertTriangle, bg: 'bg-yellow-400/15     border-yellow-400/30',     text: 'text-yellow-400'  },
  pausar:           { label: 'Pausar',            icon: Pause,         bg: 'bg-red-400/15        border-red-400/30',        text: 'text-red-400'     },
  sin_conversiones: { label: 'Sin conversiones',  icon: HelpCircle,    bg: 'bg-red-400/15        border-red-400/30',        text: 'text-red-400'     },
  nuevo:            { label: 'Nuevo',             icon: Sparkles,      bg: 'bg-violet-DEFAULT/15 border-violet-DEFAULT/30', text: 'text-violet-glow' },
  aprendizaje:      { label: 'Aprendizaje',       icon: Clock,         bg: 'bg-blue-400/15       border-blue-400/30',       text: 'text-blue-400'    },
}

const badgeAdvice = {
  escalar:          'FTIR > 60% y ROAS sobre el objetivo. Llegás a gente nueva y convertís. Aumentá el presupuesto.',
  retener:          'Retargeting eficiente — buen ROAS pero FTIR bajo. No escalable a público frío. Mantenerlo como está.',
  optimizar:        'El creativo llega a gente nueva (FTIR alto) pero no convierte. El problema es el copy o la oferta, no la audiencia.',
  replicar:         'Buen CPA. Creá una variante con otro ángulo para seguir escalando.',
  mantener:         'Rendimiento estable. Monitorear frecuencia y FTIR.',
  fatiga:           'La audiencia ya lo vio demasiado (frecuencia alta o FTIR bajo). Renovar el creativo o ampliar la segmentación.',
  pausar:           'CPA o frecuencia fuera de umbral. Detener el gasto.',
  sin_conversiones: 'Gasto alto sin conversiones. Revisar segmentación o pausar.',
  nuevo:            'En período de aprendizaje. Dejar correr al menos 7 días.',
  aprendizaje:      'Pocos datos todavía. No tomar decisiones aún.',
}

function Badge({ type }) {
  const b = badgeConfig[type] || badgeConfig.mantener
  const Icon = b.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${b.bg} ${b.text}`}>
      <Icon size={11} />
      {b.label}
    </span>
  )
}

function CPABar({ cpa, max = 900 }) {
  const pct = Math.min((cpa / max) * 100, 100)
  const color = cpa < 500 ? 'bg-green-400' : cpa < 700 ? 'bg-yellow-400' : 'bg-red-400'
  const textColor = cpa < 500 ? 'text-green-400' : cpa < 700 ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-20 text-right ${textColor}`}>
        ${cpa.toFixed(0)}
      </span>
    </div>
  )
}

// ── Modal: Generar variación de anuncio pago ──────────────────────
const FORMATOS_SALIDA = [
  { id: 'imagen',   label: 'Placa estática', desc: 'Imagen + caption' },
  { id: 'carrusel', label: 'Carrusel',       desc: '5-7 slides secuenciales' },
  { id: 'reel',     label: 'Reel / Video',   desc: 'Guión + hook + caption' },
]
const ANGULOS = [
  'Mismo tema, distinto gancho',
  'Problema → solución',
  'Testimonio / caso real',
  'Datos y estadísticas',
  'Detrás de escena',
  'Urgencia / oferta limitada',
  'Educativo / tutorial',
  'Comparación antes/después',
]

function ModalVariacionPaid({ ad, onClose, nombreCuenta }) {
  const [step, setStep]       = useState(1)
  const [formato, setFormato] = useState('imagen')
  const [angulo, setAngulo]   = useState(ANGULOS[0])
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)
  const [copied, setCopied]   = useState(false)

  const generar = async () => {
    setLoading(true)
    setError(null)
    try {
      let perfil = ''
      try { const b = await brandAPI.get(account?.id); perfil = JSON.stringify(b) } catch (_) {}
      const contexto = [
        `Nombre del anuncio: ${ad.nombre || ''}`,
        ad.badge     ? `Clasificación actual: ${ad.badge}` : '',
        ad.gasto     ? `Inversión: $${ad.gasto}` : '',
        ad.cpa       ? `CPA: $${ad.cpa}` : '',
        ad.ctr       ? `CTR: ${ad.ctr}%` : '',
        ad.conversaciones ? `Conversiones: ${ad.conversaciones}` : '',
        ad.frecuencia ? `Frecuencia: ${ad.frecuencia}` : '',
        ad.segmento  ? `Segmento FTIR: ${ad.segmento}` : '',
        ad.ftir      ? `FTIR: ${ad.ftir}%` : '',
        ad.dias_activo ? `Días activo: ${ad.dias_activo}` : '',
      ].filter(Boolean).join('\n')

      const res = await recommendationsAPI.copy({
        angulo,
        formato_salida:  formato,
        tema:            contexto,
        perfil_marca:    perfil,
        nombre_cuenta:   String(nombreCuenta || ''),
      })
      setResult(res)
      setStep(3)
    } catch (e) {
      const detail = e?.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : (detail || 'Error al generar'))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result?.contenido || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-DEFAULT/15 border border-violet-DEFAULT/30 flex items-center justify-center">
              <Zap size={13} className="text-violet-glow" />
            </div>
            <p className="text-white font-semibold text-sm">Generar variación</p>
            {step < 3 && (
              <span className="text-slate-400 text-xs ml-1">
                {step}/2 — {step === 1 ? 'Formato' : 'Ángulo'}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer"><X size={16} /></button>
        </div>

        {/* Ad context pill */}
        <div className="px-5 py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            {ad.thumbnail && (
              <img src={ad.thumbnail} className="w-10 h-10 rounded-lg object-cover bg-bg shrink-0" alt="" />
            )}
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{ad.nombre}</p>
              <p className="text-slate-500 text-xs">
                CPA {ad.cpa ? `$${ad.cpa.toFixed(0)}` : '—'} · CTR {ad.ctr}% · {ad.conversaciones} conv.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Step 1: Formato */}
          {step === 1 && (
            <div>
              <p className="text-slate-400 text-xs font-medium mb-3">¿En qué formato vas a publicar la variación?</p>
              <div className="space-y-2">
                {FORMATOS_SALIDA.map(f => (
                  <button key={f.id} onClick={() => setFormato(f.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all cursor-pointer ${formato === f.id ? 'bg-violet-DEFAULT/15 border-violet-DEFAULT/40 text-white' : 'border-border text-slate-400 hover:border-slate-500 hover:text-white'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${formato === f.id ? 'bg-violet-DEFAULT/20' : 'bg-bg'}`}>
                      {f.id === 'imagen' && <Star size={15} className={formato === f.id ? 'text-violet-glow' : 'text-slate-500'} />}
                      {f.id === 'carrusel' && <ChevronRight size={15} className={formato === f.id ? 'text-violet-glow' : 'text-slate-500'} />}
                      {f.id === 'reel' && <TrendingUp size={15} className={formato === f.id ? 'text-violet-glow' : 'text-slate-500'} />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{f.label}</p>
                      <p className="text-xs text-slate-500">{f.desc}</p>
                    </div>
                    {formato === f.id && <Check size={14} className="text-violet-glow ml-auto shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Ángulo */}
          {step === 2 && (
            <div>
              <p className="text-slate-400 text-xs font-medium mb-3">¿Con qué ángulo creativo vas a diferenciarte?</p>
              <div className="space-y-1.5">
                {ANGULOS.map(a => (
                  <button key={a} onClick={() => setAngulo(a)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all cursor-pointer ${angulo === a ? 'bg-violet-DEFAULT/15 border-violet-DEFAULT/30 text-white' : 'border-border text-slate-400 hover:border-slate-500 hover:text-white'}`}>
                    <span className="font-medium">{a}</span>
                  </button>
                ))}
              </div>
              {error && <p className="mt-3 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
          )}

          {/* Step 3: Resultado */}
          {step === 3 && result && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={13} className="text-violet-glow" />
                <p className="text-violet-glow text-xs font-semibold">{result.formato?.toUpperCase()} · {result.angulo}</p>
              </div>
              <pre className="bg-bg border border-border rounded-xl p-4 text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-y-auto max-h-80">
                {result.contenido}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          {step > 1 && step < 3 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 py-2 rounded-lg border border-border text-slate-400 text-sm hover:text-white transition-colors cursor-pointer">
              Atrás
            </button>
          )}
          {step === 3 && (
            <button onClick={() => { setStep(1); setResult(null); setError(null) }}
              className="px-4 py-2 rounded-lg border border-border text-slate-400 text-sm hover:text-white transition-colors cursor-pointer">
              Nueva variación
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {step === 3 && (
              <button onClick={handleCopy}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer ${copied ? 'bg-green-400/10 border-green-400/20 text-green-400' : 'border-border text-slate-300 hover:text-white'}`}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copiado' : 'Copiar brief'}
              </button>
            )}
            {step === 1 && (
              <button onClick={() => setStep(2)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-DEFAULT text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer">
                Siguiente <ChevronRight size={14} />
              </button>
            )}
            {step === 2 && (
              <button onClick={generar} disabled={loading || !angulo}
                className="flex items-center gap-2 px-4 py-2 bg-violet-DEFAULT text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer">
                {loading ? <Spinner size={14} /> : <Zap size={14} />}
                {loading ? 'Generando…' : 'Generar brief'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal de acción: Escalar ──────────────────────────────────────
function ModalEscalar({ ad, onClose }) {
  const [pct, setPct] = useState(30)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const opciones = [20, 30, 50]
  const isCBO = !ad.adset_id

  const handleConfirm = async () => {
    if (!ad.adset_id) return
    setLoading(true)
    setError(null)
    try {
      const res = await campaignsAPI.scaleAdset(ad.adset_id, pct)
      setResult(res)
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || 'Error al escalar'
      setError(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-400/15 border border-green-400/30 flex items-center justify-center">
              <TrendingUp size={14} className="text-green-400" />
            </div>
            <p className="text-white font-semibold text-sm">Escalar anuncio</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer"><X size={16} /></button>
        </div>

        {result ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-400/15 border border-green-400/30 flex items-center justify-center mx-auto">
              <Check size={22} className="text-green-400" />
            </div>
            <p className="text-white font-semibold">¡Presupuesto escalado!</p>
            <div className="bg-bg border border-border rounded-lg px-4 py-3 text-xs space-y-1">
              <p className="text-slate-400">Nuevo presupuesto diario</p>
              <p className="text-green-400 font-bold text-lg">${result.nuevo_budget_ars?.toLocaleString('es-AR')} ARS/día</p>
              <p className="text-slate-400">+{pct}% aplicado vía Meta API</p>
            </div>
            <p className="text-slate-500 text-xs">El cambio puede tardar ~15 min en verse reflejado en Meta.</p>
            <button onClick={onClose} className="w-full border border-border rounded-lg py-2 text-white text-sm cursor-pointer hover:border-green-400/30 transition-colors">
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <p className="text-slate-400 text-xs mb-1 truncate" title={ad.nombre}>{ad.nombre}</p>
            <p className="text-slate-500 text-xs mb-4">
              CPA: <span className="text-green-400 font-semibold">${ad.cpa?.toFixed(0)}</span>
              {' '}· CTR: <span className="text-green-400 font-semibold">{ad.ctr}%</span>
            </p>

            <div className="bg-green-400/8 border border-green-400/20 rounded-lg px-3 py-2.5 mb-4">
              <p className="text-green-400 text-xs leading-relaxed">
                Buen rendimiento. Aumentar el presupuesto del conjunto puede multiplicar resultados sin perder eficiencia.
              </p>
            </div>

            {isCBO ? (
              <div className="bg-yellow-400/8 border border-yellow-400/20 rounded-lg px-3 py-2.5 mb-4">
                <p className="text-yellow-400 text-xs leading-relaxed">
                  Este conjunto usa <strong>presupuesto de campaña (CBO)</strong>. El presupuesto se gestiona a nivel campaña desde Meta Ads Manager.
                </p>
                <a
                  href="https://adsmanager.facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-yellow-400 text-xs underline hover:text-yellow-300"
                >
                  <ExternalLink size={11} /> Ir a Meta Ads Manager
                </a>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-slate-400 text-xs font-medium mb-2">¿Cuánto aumentar el presupuesto?</p>
                  <div className="flex gap-2">
                    {opciones.map(o => (
                      <button key={o} onClick={() => setPct(o)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${pct === o ? 'bg-green-400/20 text-green-400 border-green-400/40' : 'text-slate-400 border-border hover:text-white'}`}>
                        +{o}%
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-3">{error}</p>}

                <button onClick={handleConfirm} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-green-500/20 border border-green-400/40 text-green-400 font-semibold py-2.5 rounded-lg hover:bg-green-500/30 cursor-pointer transition-colors text-sm disabled:opacity-50">
                  {loading ? <Spinner size={14} /> : <TrendingUp size={14} />}
                  {loading ? 'Escalando...' : `Escalar +${pct}% vía Meta API`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Modal de acción: Replicar ─────────────────────────────────────
function ModalReplicar({ ad, account, onClose, onDone }) {
  const [step, setStep] = useState(1) // 1=copy, 2=imagen, 3=confirm, 4=done
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [images, setImages] = useState([])
  const [loadingImages, setLoadingImages] = useState(false)

  const [nombre, setNombre]       = useState(`${ad.nombre} — v2`)
  const [message, setMessage]     = useState('')
  const [headline, setHeadline]   = useState('')
  const [imageHash, setImageHash] = useState('')
  const [result, setResult]       = useState(null)

  const inputCls = 'w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors'

  // Cargar imágenes al abrir
  useState(() => {
    setLoadingImages(true)
    campaignsAPI.getAdImages(account?.id)
      .then(r => setImages(r.data || []))
      .finally(() => setLoadingImages(false))
  }, [])

  if (!ad.adset_id) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
        <div className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
          <p className="text-yellow-400 text-sm">No se encontró el conjunto de anuncios (adset_id) para este creativo. Actualizá la página e intentá de nuevo.</p>
          <button onClick={onClose} className="mt-4 w-full border border-border rounded-lg py-2 text-slate-400 text-sm cursor-pointer">Cerrar</button>
        </div>
      </div>
    )
  }

  const handleCrear = async () => {
    if (!message.trim()) { setError('El texto principal es obligatorio'); return }
    setLoading(true); setError(null)
    try {
      const res = await campaignsAPI.createAd({
        adset_id:       ad.adset_id,
        nombre,
        message,
        headline,
        image_hash:     imageHash || null,
        call_to_action: 'WHATSAPP_MESSAGE',
        account_id:     account?.id ? String(account.id) : null,
      })
      setResult(res)
      setStep(4)
      if (onDone) onDone()
    } catch (e) {
      const detail = e?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : e?.message || 'Error al crear el anuncio')
    } finally {
      setLoading(false)
    }
  }

  const STEPS = ['Copy', 'Imagen', 'Confirmar']

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 py-6 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-400/15 border border-blue-400/30 flex items-center justify-center">
              <Copy size={13} className="text-blue-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Replicar anuncio</p>
              {step < 4 && <p className="text-slate-500 text-[10px]">Mismo adset · nuevo creativo · Paso {step}/3</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer"><X size={16} /></button>
        </div>

        {/* Progress */}
        {step < 4 && (
          <div className="h-1 bg-border">
            <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
        )}

        <div className="p-5 space-y-4">

          {/* Contexto del ad original */}
          {step < 4 && (
            <div className="bg-bg border border-border rounded-lg px-3 py-2.5 flex items-center gap-3">
              {ad.thumbnail && <img src={ad.thumbnail} className="w-10 h-10 rounded-lg object-cover shrink-0" alt="" />}
              <div className="min-w-0">
                <p className="text-slate-400 text-[10px] font-medium">Original</p>
                <p className="text-white text-xs truncate font-medium">{ad.nombre}</p>
                <p className="text-slate-500 text-[10px]">
                  CPA {ad.cpa ? `$${ad.cpa.toFixed(0)}` : '—'} · CTR {ad.ctr}% · Adset <span className="font-mono">{ad.adset_id}</span>
                </p>
              </div>
            </div>
          )}

          {/* STEP 1: Copy */}
          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <label className="text-slate-500 text-[10px] uppercase tracking-wide font-medium">Nombre del nuevo anuncio</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-500 text-[10px] uppercase tracking-wide font-medium">Texto principal *</label>
                <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Copy del anuncio — usá un ángulo diferente al original..."
                  className={`${inputCls} resize-none`} />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-500 text-[10px] uppercase tracking-wide font-medium">Titular</label>
                <input value={headline} onChange={e => setHeadline(e.target.value)}
                  placeholder="Titular corto y directo" className={inputCls} />
              </div>
              <button onClick={() => { if (!message.trim()) { setError('El texto principal es obligatorio'); return }; setError(null); setStep(2) }}
                className="w-full py-2.5 bg-blue-500/20 border border-blue-400/30 text-blue-400 font-semibold rounded-xl hover:bg-blue-500/30 cursor-pointer transition-colors text-sm">
                Siguiente → Elegir imagen
              </button>
            </>
          )}

          {/* STEP 2: Imagen */}
          {step === 2 && (
            <>
              <p className="text-slate-400 text-xs">Elegí una imagen de la biblioteca (opcional — si no seleccionás, Meta usa la del anuncio original).</p>
              {loadingImages ? (
                <p className="text-slate-500 text-xs py-2">Cargando biblioteca…</p>
              ) : images.length === 0 ? (
                <p className="text-slate-500 text-xs py-2">Sin imágenes en la biblioteca.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
                  {images.map(img => (
                    <button key={img.hash} onClick={() => setImageHash(imageHash === img.hash ? '' : img.hash)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${imageHash === img.hash ? 'border-blue-400' : 'border-transparent hover:border-slate-500'}`}>
                      <img src={img.url_128} alt={img.name} className="w-full h-full object-cover" />
                      {imageHash === img.hash && (
                        <div className="absolute inset-0 bg-blue-400/30 flex items-center justify-center">
                          <Check size={16} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="px-4 py-2.5 border border-border rounded-xl text-slate-400 hover:text-white text-sm cursor-pointer transition-colors">← Atrás</button>
                <button onClick={() => setStep(3)} className="flex-1 py-2.5 bg-blue-500/20 border border-blue-400/30 text-blue-400 font-semibold rounded-xl hover:bg-blue-500/30 cursor-pointer transition-colors text-sm">
                  {imageHash ? 'Siguiente → Confirmar' : 'Sin imagen → Confirmar'}
                </button>
              </div>
            </>
          )}

          {/* STEP 3: Confirmar */}
          {step === 3 && (
            <>
              <div className="bg-bg border border-border rounded-xl p-4 space-y-3 text-xs">
                <div><p className="text-slate-500 mb-0.5">Nombre</p><p className="text-white font-medium">{nombre}</p></div>
                <div><p className="text-slate-500 mb-0.5">Copy</p><p className="text-slate-300 leading-relaxed whitespace-pre-line">{message}</p></div>
                {headline && <div><p className="text-slate-500 mb-0.5">Titular</p><p className="text-white">{headline}</p></div>}
                <div><p className="text-slate-500 mb-0.5">Adset destino</p><p className="text-white font-mono">{ad.adset_id}</p></div>
                {imageHash && <div><p className="text-slate-500 mb-0.5">Imagen</p><p className="text-white font-mono">{imageHash}</p></div>}
              </div>
              {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="px-4 py-2.5 border border-border rounded-xl text-slate-400 hover:text-white text-sm cursor-pointer transition-colors">← Atrás</button>
                <button onClick={handleCrear} disabled={loading}
                  className="flex-1 py-2.5 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 disabled:opacity-50 cursor-pointer transition-colors text-sm flex items-center justify-center gap-2">
                  {loading ? <><Spinner size={14} /> Creando…</> : <><Copy size={14} /> Crear anuncio en Meta</>}
                </button>
              </div>
            </>
          )}

          {/* STEP 4: Listo */}
          {step === 4 && result && (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-400/15 border border-blue-400/30 flex items-center justify-center mx-auto">
                <Check size={22} className="text-blue-400" />
              </div>
              <p className="text-white font-semibold">¡Anuncio replicado!</p>
              <p className="text-slate-400 text-xs">Creado en el mismo conjunto. Está en estado PAUSED — activalo desde Meta Ads Manager.</p>
              <div className="bg-bg border border-border rounded-lg px-4 py-3 text-xs text-left space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Ad ID</span><span className="text-white font-mono">{result.ad_id}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Adset</span><span className="text-white font-mono">{ad.adset_id}</span></div>
              </div>
              <button onClick={onClose} className="w-full border border-border rounded-xl py-2.5 text-white text-sm cursor-pointer hover:border-blue-400/30 transition-colors">
                Cerrar
              </button>
            </div>
          )}

          {error && step !== 3 && <p className="text-red-400 text-xs">{error}</p>}
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────
export default function Creativos() {
  const { selected: account } = useAccount()
  const [tab, setTab] = useState('creativos')
  const [dateRange, setDateRange] = useState({ days: 30, since: null, until: null })
  const { data: creatives, loading, error, refetch } = useFetch(
    () => creativesAPI.ranking(dateRange.days, dateRange.since, dateRange.until, account?.id),
    [dateRange, account?.id]
  )
  const { data: treeData } = useFetch(
    () => campaignsAPI.tree(dateRange.days ?? 30, account?.id),
    [dateRange.days, account?.id, tab]
  )
  const [pausing, setPausing]       = useState(null)
  const [msg, setMsg]               = useState(null)
  const [scanning, setScanning]     = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [modalEscalar, setModalEscalar] = useState(null)
  const [modalReplicar, setModalReplicar] = useState(null)
  const [modalVariacion, setModalVariacion] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [marcaFilter, setMarcaFilter] = useState('Todas')

  const handleScanFatiga = async () => {
    setScanning(true)
    setScanResult(null)
    try {
      const res = await alertsAPI.scanMe(account?.id)
      setScanResult(res)
    } catch (e) {
      setScanResult({ error: e?.response?.data?.detail || 'Error al escanear' })
    } finally {
      setScanning(false)
    }
  }

  const handlePauseAd = async (ad) => {
    if (!window.confirm(`¿Pausar "${ad.nombre}"?\n\nDetiene el gasto. Reactivable desde Meta Ads Manager.`)) return
    setPausing(ad.id)
    setMsg(null)
    try {
      await campaignsAPI.pauseAd(ad.id)
      setMsg({ type: 'ok', text: `"${ad.nombre}" pausado correctamente.` })
      refetch()
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.detail || 'Error al pausar' })
    } finally {
      setPausing(null)
    }
  }

  if (loading) return <PageLoading />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const marcas = creatives ? ['Todas', ...new Set(creatives.map(c => c.marca).filter(Boolean))] : ['Todas']
  const base = marcaFilter === 'Todas' ? creatives : creatives?.filter(c => c.marca === marcaFilter)

  // Agrupación por segmento FTIR
  const prospeccion = base?.filter(c => c.segmento === 'prospeccion') || []
  const retargeting = base?.filter(c => c.segmento === 'retargeting') || []
  const mixto       = base?.filter(c => !['prospeccion','retargeting'].includes(c.segmento)) || []

  // Acciones prioritarias (badge) independientes del segmento
  const accionables = base?.filter(c => ['escalar','optimizar','retener'].includes(c.badge)) || []

  const cardProps = (c, i) => ({
    c, rank: i,
    expanded: expandedId === c.id,
    onExpand: () => setExpandedId(expandedId === c.id ? null : c.id),
    onPause: () => handlePauseAd(c), pausing: pausing === c.id,
    onEscalar: () => setModalEscalar(c),
    onReplicar: () => setModalReplicar(c),
    onVariacion: () => setModalVariacion(c),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Creativos</h1>
        <p className="text-slate-400 text-sm mt-1">Ranking · {base?.length || 0} anuncios{marcaFilter !== 'Todas' ? ` · ${marcaFilter}` : ''}</p>
      </div>

      <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl w-fit">
        <button onClick={() => setTab('creativos')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${tab === 'creativos' ? 'bg-violet-DEFAULT text-white' : 'text-slate-400 hover:text-white'}`}>
          Por anuncio
        </button>
        <button onClick={() => setTab('angulos')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${tab === 'angulos' ? 'bg-violet-DEFAULT text-white' : 'text-slate-400 hover:text-white'}`}>
          Por conjunto / ángulo
        </button>
      </div>

      <DateRangePicker
        days={dateRange.days}
        since={dateRange.since}
        until={dateRange.until}
        onChange={setDateRange}
      />

      {tab === 'creativos' && (
        <>
          {marcas.length > 2 && (
            <div className="flex flex-wrap gap-2">
              {marcas.map(m => (
                <button
                  key={m}
                  onClick={() => setMarcaFilter(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    marcaFilter === m
                      ? 'bg-violet-DEFAULT/20 border-violet-DEFAULT/50 text-violet-glow'
                      : 'border-border text-slate-400 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* Banner fatiga creativa */}
          <div className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3">
            <AlertTriangle size={15} className="text-yellow-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold">Detección de fatiga creativa</p>
              <p className="text-slate-500 text-[10px]">Analiza frecuencia, CTR y CPA de los últimos 7 días</p>
            </div>
            {scanResult && !scanResult.error && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${scanResult.alertas_generadas > 0 ? 'bg-yellow-400/15 border-yellow-400/30 text-yellow-400' : 'bg-green-400/15 border-green-400/30 text-green-400'}`}>
                {scanResult.alertas_generadas > 0 ? `${scanResult.alertas_generadas} alertas` : '✓ Todo OK'}
              </span>
            )}
            {scanResult?.error && <span className="text-red-400 text-xs">{scanResult.error}</span>}
            <button
              onClick={handleScanFatiga}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-medium hover:bg-yellow-400/20 cursor-pointer transition-colors disabled:opacity-50 shrink-0"
            >
              {scanning ? <Spinner size={12} /> : <ScanLine size={12} />}
              {scanning ? 'Escaneando…' : 'Escanear'}
            </button>
          </div>

          {msg && (
            <div className={`px-4 py-3 rounded-lg border text-sm ${msg.type === 'ok' ? 'bg-green-400/10 border-green-400/20 text-green-400' : 'bg-red-400/10 border-red-400/20 text-red-400'}`}>
              {msg.text}
            </div>
          )}

          {base?.length === 0 && (
            <div className="text-center py-16 text-slate-500 text-sm space-y-2">
              <p>Sin anuncios con gasto registrado en este período.</p>
              <p className="text-slate-400 text-xs">Probá ampliar el rango de fechas o verificar que la cuenta tenga anuncios activos.</p>
            </div>
          )}

          {/* ── Acciones prioritarias ── */}
          {accionables.length > 0 && (
            <Section title="Acción inmediata" subtitle="Anuncios con señal clara — escalar, retener o mejorar el copy" color="green">
              {accionables.map((c, i) => <CreativoCard key={c.id} {...cardProps(c, i)} />)}
            </Section>
          )}

          {/* ── Nuevos públicos (Prospección) ── */}
          {prospeccion.length > 0 && (
            <Section
              title="Nuevos públicos — Prospección"
              subtitle={`FTIR > 60% · ${prospeccion.length} anuncios llegando a audiencia fría`}
              color="violet"
            >
              {prospeccion.map((c, i) => <CreativoCard key={c.id} {...cardProps(c, i)} />)}
            </Section>
          )}

          {/* ── Consolidación (Retargeting) ── */}
          {retargeting.length > 0 && (
            <Section
              title="Consolidación — Retargeting"
              subtitle={`FTIR < 35% · ${retargeting.length} anuncios circulando en audiencia conocida`}
              color="cyan"
            >
              {retargeting.map((c, i) => <CreativoCard key={c.id} {...cardProps(c, i)} />)}
            </Section>
          )}

          {/* ── Mixto / sin datos ── */}
          {mixto.length > 0 && (
            <Section title="Otros anuncios" subtitle="FTIR intermedio o sin datos suficientes" color="slate">
              {mixto.map((c, i) => <CreativoCard key={c.id} {...cardProps(c, i)} />)}
            </Section>
          )}

          {modalEscalar   && <ModalEscalar   ad={modalEscalar}   onClose={() => setModalEscalar(null)} />}
          {modalReplicar  && <ModalReplicar  ad={modalReplicar} account={account} onClose={() => setModalReplicar(null)} onDone={() => { setModalReplicar(null); refetch() }} />}
          {modalVariacion && <ModalVariacionPaid ad={modalVariacion} onClose={() => setModalVariacion(null)} nombreCuenta={account?.nombre || ''} />}
        </>
      )}

      {tab === 'angulos' && <AngulosView treeData={treeData} />}
    </div>
  )
}

// ── Vista Por conjunto / ángulo ───────────────────────────────────
function AngulosView({ treeData }) {
  if (!treeData?.tree) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
        Cargando datos de conjuntos...
      </div>
    )
  }

  const campaigns = Object.values(treeData.tree)

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        No hay campañas con datos en este período.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {campaigns.map(campaign => <CampaignAngulosTable key={campaign.campaign_id} campaign={campaign} />)}
    </div>
  )
}

function CampaignAngulosTable({ campaign }) {
  const adsets = Object.values(campaign.adsets || {})

  // Sort by spend desc
  const sorted = [...adsets].sort((a, b) => (b.spend || 0) - (a.spend || 0))

  // Compute avg campaign CPA
  const totalConv = sorted.reduce((s, a) => s + (a.conversiones || 0), 0)
  const totalSpend = sorted.reduce((s, a) => s + (a.spend || 0), 0)
  const avgCPA = totalConv > 0 ? totalSpend / totalConv : null

  // Best and worst adset by CPA (with conversiones > 0)
  const withCPA = sorted.filter(a => a.cpa != null && a.conversiones > 0)
  const best  = withCPA.length ? withCPA.reduce((b, a) => a.cpa < b.cpa ? a : b) : null
  const worst = withCPA.length > 1 ? withCPA.reduce((b, a) => a.cpa > b.cpa ? a : b) : null

  const getAdsetBadge = (adset) => {
    if (adset.cpa == null || adset.conversiones === 0) return 'sin_conversiones'
    if (avgCPA && adset.cpa < avgCPA * 0.8) return 'escalar'
    if (avgCPA && adset.cpa > avgCPA * 1.5) return 'pausar'
    if (adset.frecuencia > 3) return 'fatiga'
    return 'retener'
  }

  const extractAngle = (name) => {
    const parts = name?.split(' — ')
    return parts?.length > 1 ? parts[1] : name
  }

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Campaign header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-sm">{campaign.campaign_name}</p>
          <p className="text-slate-500 text-xs mt-0.5">
            {sorted.length} conjuntos · ${totalSpend.toLocaleString('es-AR', { maximumFractionDigits: 0 })} inversión
            {avgCPA && <span> · CPA prom: <span className="text-slate-300">${avgCPA.toFixed(0)}</span></span>}
          </p>
        </div>
      </div>

      {/* Adsets table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-slate-500">
              <th className="text-left px-5 py-2.5 font-medium">Conjunto / Ángulo</th>
              <th className="text-right px-3 py-2.5 font-medium">Inversión</th>
              <th className="text-right px-3 py-2.5 font-medium">Conv.</th>
              <th className="text-right px-3 py-2.5 font-medium">CPA</th>
              <th className="text-right px-3 py-2.5 font-medium">CTR</th>
              <th className="text-right px-3 py-2.5 font-medium">Frec.</th>
              <th className="text-right px-5 py-2.5 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(adset => {
              const badge = getAdsetBadge(adset)
              const angle = extractAngle(adset.adset_name)
              const cfg = badgeConfig[badge] || badgeConfig.mantener
              const Icon = cfg.icon
              return (
                <tr key={adset.adset_id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-white font-medium truncate max-w-[220px]" title={adset.adset_name}>
                      {angle}
                    </p>
                    {angle !== adset.adset_name && (
                      <p className="text-slate-400 text-[10px] truncate max-w-[220px]">{adset.adset_name}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-300 font-mono">
                    ${(adset.spend || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-300 font-mono">{adset.conversiones || 0}</td>
                  <td className={`px-3 py-3 text-right font-mono font-semibold ${adset.cpa ? (adset.cpa < 500 ? 'text-green-400' : adset.cpa < 900 ? 'text-yellow-400' : 'text-red-400') : 'text-slate-400'}`}>
                    {adset.cpa ? `$${adset.cpa.toFixed(0)}` : '—'}
                  </td>
                  <td className={`px-3 py-3 text-right font-mono ${adset.ctr >= 2 ? 'text-green-400' : adset.ctr >= 1 ? 'text-yellow-400' : 'text-slate-400'}`}>
                    {adset.ctr ? `${adset.ctr.toFixed(1)}%` : '—'}
                  </td>
                  <td className={`px-3 py-3 text-right font-mono ${adset.frecuencia > 3 ? 'text-red-400' : adset.frecuencia > 2 ? 'text-yellow-400' : 'text-slate-400'}`}>
                    {adset.frecuencia ? adset.frecuencia.toFixed(1) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.text}`}>
                      <Icon size={9} />
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Best / Worst insight cards */}
      {(best || worst) && (
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border">
          {best && (
            <div className="bg-green-400/8 border border-green-400/20 rounded-xl px-4 py-3">
              <p className="text-green-400 text-[10px] font-semibold uppercase tracking-wide mb-1">Mejor ángulo</p>
              <p className="text-white text-xs font-medium truncate">{extractAngle(best.adset_name)}</p>
              <p className="text-green-400 text-xs mt-0.5">CPA ${best.cpa.toFixed(0)} · {best.conversiones} conv.</p>
            </div>
          )}
          {worst && (
            <div className="bg-red-400/8 border border-red-400/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-[10px] font-semibold uppercase tracking-wide mb-1">Ángulo a revisar</p>
              <p className="text-white text-xs font-medium truncate">{extractAngle(worst.adset_name)}</p>
              <p className="text-red-400 text-xs mt-0.5">CPA ${worst.cpa.toFixed(0)} · {worst.conversiones} conv.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sección con título ────────────────────────────────────────────
function Section({ title, subtitle, color, children }) {
  const colors = {
    green:  'text-green-400  border-green-400/20  bg-green-400/5',
    blue:   'text-blue-400   border-blue-400/20   bg-blue-400/5',
    violet: 'text-violet-glow border-violet-DEFAULT/20 bg-violet-DEFAULT/5',
    cyan:   'text-cyan-400   border-cyan-400/20   bg-cyan-400/5',
    slate:  'text-slate-400  border-border        bg-transparent',
  }
  return (
    <div>
      <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg border ${colors[color]}`}>
        <p className={`text-xs font-semibold ${colors[color].split(' ')[0]}`}>{title}</p>
        <span className="text-slate-400 text-xs">—</span>
        <p className="text-slate-500 text-xs">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  )
}

// ── Tarjeta de creativo ───────────────────────────────────────────
function CreativoCard({ c, rank, expanded, onExpand, onPause, pausing, onEscalar, onReplicar, onVariacion }) {
  const canEscalar  = c.badge === 'escalar'
  const canReplicar = ['replicar','retener','escalar'].includes(c.badge)
  const canOptimizar = c.badge === 'optimizar'
  const canPause    = ['pausar', 'sin_conversiones', 'fatiga'].includes(c.badge)

  return (
    <div className={`bg-surface border rounded-xl overflow-hidden transition-all duration-200 ${
      canEscalar   ? 'border-green-400/30  hover:border-green-400/50' :
      canOptimizar ? 'border-orange-400/30 hover:border-orange-400/50' :
      canReplicar  ? 'border-blue-400/20   hover:border-blue-400/40' :
      canPause     ? 'border-red-400/20    hover:border-red-400/30' :
      'border-border hover:border-slate-600'
    }`}>
      {/* Imagen del creativo */}
      {c.thumbnail && (
        <div className="w-full h-44 bg-black overflow-hidden flex items-center justify-center">
          <img
            src={c.thumbnail}
            alt={c.nombre}
            className="w-full h-full object-contain"
            onError={e => { e.target.parentElement.style.display = 'none' }}
          />
        </div>
      )}

      {/* Cabecera */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-2 ${rank === 0 ? 'bg-orange-DEFAULT text-white' : 'bg-border text-slate-400'}`}>
            {rank + 1}
          </span>
          <Badge type={c.badge} />
        </div>

        {c.marca && (
          <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-DEFAULT/15 text-violet-glow border border-violet-DEFAULT/30 mb-1">{c.marca}</span>
        )}
        <p className="text-white text-sm font-semibold leading-tight mb-1 line-clamp-2" title={c.nombre}>
          {c.nombre}
        </p>
        <p className="text-slate-500 text-xs">
          ${c.gasto?.toLocaleString('es-AR', { maximumFractionDigits: 0 })} gastados
          {c.dias_activo != null && <span className="ml-2 text-slate-400">· {c.dias_activo}d</span>}
        </p>
      </div>

      {/* Métricas */}
      <div className="px-4 pb-3">
        {c.cpa != null ? (
          <div className="mb-3">
            <p className="text-slate-500 text-xs mb-1">CPA</p>
            <CPABar cpa={c.cpa} />
          </div>
        ) : (
          <p className="text-slate-400 text-xs mb-3 italic">Sin conversiones registradas</p>
        )}

        <div className="grid grid-cols-4 gap-2">
          <Metric label="CTR"   value={`${c.ctr}%`} good={c.ctr >= 3} warn={c.ctr >= 1.5} />
          <Metric label="Frec." value={c.frecuencia} warn={c.frecuencia > 2} bad={c.frecuencia > 2.5} />
          <Metric
            label="ROAS"
            value={c.roas != null ? `${c.roas}x` : '—'}
            good={c.roas != null && c.roas >= 3}
            warn={c.roas != null && c.roas >= 1.5 && c.roas < 3}
            bad={c.roas != null && c.roas < 1.5}
            tooltip="ROAS estimado. E-com: dato real de Meta. WhatsApp: (mensajes × tasa de cierre × ticket promedio) / inversión"
          />
          <Metric
            label="FTIR"
            value={c.ftir != null ? `${c.ftir}%` : '—'}
            good={c.ftir != null && c.ftir >= 60}
            warn={c.ftir != null && c.ftir >= 35 && c.ftir < 60}
            bad={c.ftir != null && c.ftir < 35}
            tooltip="First Time Impression Rate: % de impresiones a personas nuevas. > 60% = prospección. < 35% = retargeting"
          />
        </div>
      </div>

      {/* Consejo expandible */}
      {expanded && (
        <div className="px-4 pb-3">
          <div className={`text-xs rounded-lg px-3 py-2.5 leading-relaxed ${
            canEscalar ? 'bg-green-400/8 border border-green-400/15 text-green-400' :
            canReplicar ? 'bg-blue-400/8 border border-blue-400/15 text-blue-400' :
            canPause ? 'bg-red-400/8 border border-red-400/15 text-red-400' :
            'bg-bg border border-border text-slate-400'
          }`}>
            {badgeAdvice[c.badge]}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className={`px-3 py-2.5 border-t flex items-center gap-1.5 ${
        canEscalar ? 'border-green-400/15 bg-green-400/5' :
        canReplicar ? 'border-blue-400/15 bg-blue-400/5' :
        canPause ? 'border-red-400/15 bg-red-400/5' :
        'border-border'
      }`}>
        {/* Botón expandir consejo */}
        <button onClick={onExpand}
          className="p-1.5 text-slate-500 hover:text-white cursor-pointer transition-colors rounded"
          title={expanded ? 'Ocultar consejo' : 'Ver consejo'}>
          <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {/* Generar variación — disponible en todos */}
        <button onClick={onVariacion}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-violet-DEFAULT/30 bg-violet-DEFAULT/10 text-violet-glow text-xs font-medium hover:bg-violet-DEFAULT/20 cursor-pointer transition-colors"
          title="Generar brief de variación con IA">
          <Zap size={11} /> Brief IA
        </button>

        <div className="flex-1" />

        {canPause && (
          <ActionBtn
            label="Pausar" icon={<Pause size={12} />}
            color="red" onClick={onPause} loading={pausing}
          />
        )}
        {canReplicar && (
          <ActionBtn
            label="Replicar" icon={<Copy size={12} />}
            color="blue" onClick={onReplicar}
          />
        )}
        {(canEscalar || canReplicar) && (
          <ActionBtn
            label="Escalar" icon={<ArrowUpRight size={12} />}
            color="green" onClick={onEscalar}
          />
        )}
        {c.badge === 'fatiga' && (
          <ActionBtn
            label="Pausar" icon={<Pause size={12} />}
            color="yellow" onClick={onPause} loading={pausing}
          />
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, good, warn, bad, tooltip }) {
  const color = bad ? 'text-red-400' : warn ? 'text-yellow-400' : good ? 'text-green-400' : 'text-slate-300'
  return (
    <div title={tooltip || undefined}>
      <p className="text-slate-500 text-xs truncate">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
    </div>
  )
}

function ActionBtn({ label, icon, color, onClick, loading }) {
  const colors = {
    red:    'bg-red-400/15    border-red-400/30    text-red-400    hover:bg-red-400/25',
    green:  'bg-green-400/15  border-green-400/30  text-green-400  hover:bg-green-400/25',
    blue:   'bg-blue-400/15   border-blue-400/30   text-blue-400   hover:bg-blue-400/25',
    yellow: 'bg-yellow-400/15 border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/25',
  }
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 ${colors[color]}`}
    >
      {loading ? <Spinner size={11} /> : icon}
      {label}
    </button>
  )
}
