import { useState, useEffect, useRef } from 'react'
import {
  X, Sparkles, Send, AlertTriangle, ChevronDown, Copy, Check,
  Download, Wand2, Eye, Plus, Trash2, Image, Film, LayoutGrid,
  Layers, Lightbulb, ChevronRight, ChevronLeft, Loader2,
  Upload, ScanSearch, ChevronUp, ZoomIn
} from 'lucide-react'
import { campaignsAPI, recommendationsAPI, brandAPI, creativeAnalyzeAPI } from '../services/api'
import { Spinner } from '../components/LoadingState'
import { useAccount } from '../context/AccountContext'

/* ─── Constantes ─────────────────────────────────────────── */
const OBJETIVOS = [
  { value: 'OUTCOME_LEADS',      label: 'Clientes potenciales' },
  { value: 'OUTCOME_SALES',      label: 'Ventas' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Interacción' },
  { value: 'OUTCOME_TRAFFIC',    label: 'Tráfico' },
  { value: 'OUTCOME_AWARENESS',  label: 'Reconocimiento' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'Promoción de la app' },
]

const FORMATOS = [
  { value: 'imagen',    label: 'Imagen',    icon: Image,      desc: '1080×1080 · Feed' },
  { value: 'reel',      label: 'Reel/Video', icon: Film,      desc: '1080×1920 · 15-30s' },
  { value: 'carrusel',  label: 'Carrusel',   icon: LayoutGrid, desc: '3-5 slides' },
  { value: 'stories',   label: 'Stories',    icon: Layers,    desc: '1080×1920 · 5-15s' },
]

/* ─── Sugerencias de ángulos desde el perfil de marca ───── */
function generarSugerencias(perfil) {
  if (!perfil) return ANGULOS_DEFAULT
  const beneficios = (perfil.marca_beneficios || '').split('\n').filter(Boolean)
  const tienePublico = perfil.marca_publico?.length > 20
  const tienePropuesta = perfil.marca_propuesta_valor?.length > 10
  const tieneBeneficios = beneficios.length > 0

  const sugerencias = []

  // 1. Propuesta de valor directa — siempre si hay perfil
  if (tienePropuesta) {
    sugerencias.push({
      angulo: 'Propuesta de valor directa',
      razon: `Tu diferencial: "${perfil.marca_propuesta_valor.slice(0, 70)}..."`,
      formato: 'imagen',
      prioridad: 1,
    })
  }

  // 2. Social proof — siempre necesario
  sugerencias.push({
    angulo: 'Testimonial de cliente',
    razon: 'Social proof — el ángulo que más genera confianza en fría',
    formato: 'reel',
    prioridad: 1,
  })

  // 3. Problema → solución — si hay audiencia definida con objeciones
  if (tienePublico) {
    sugerencias.push({
      angulo: 'Problema → solución',
      razon: 'Atacar la objeción principal antes de que la piensen',
      formato: 'imagen',
      prioridad: 2,
    })
  }

  // 4. Beneficio principal
  if (tieneBeneficios) {
    sugerencias.push({
      angulo: 'Beneficios del producto',
      razon: `Destacar: "${beneficios[0]?.slice(0, 60)}"`,
      formato: 'carrusel',
      prioridad: 2,
    })
  }

  // 5. Urgencia
  sugerencias.push({
    angulo: 'Urgencia / stock limitado',
    razon: 'Activa la decisión en audiencias que ya te conocen (retargeting)',
    formato: 'stories',
    prioridad: 2,
  })

  // 6. Detrás de escena
  sugerencias.push({
    angulo: 'Detrás de escena / proceso',
    razon: 'Genera confianza mostrando lo que otros esconden',
    formato: 'reel',
    prioridad: 3,
  })

  // 7. Precio / cuotas
  sugerencias.push({
    angulo: 'Comparación de precio / cuotas',
    razon: 'Rompe la barrera económica antes de que sea objeción',
    formato: 'imagen',
    prioridad: 3,
  })

  return sugerencias
}

const ANGULOS_DEFAULT = [
  { angulo: 'Propuesta de valor directa', razon: 'Tu diferencial principal frente a la competencia', formato: 'imagen', prioridad: 1 },
  { angulo: 'Testimonial de cliente',     razon: 'Social proof — genera confianza en audiencia fría',  formato: 'reel',   prioridad: 1 },
  { angulo: 'Problema → solución',        razon: 'Atacar la objeción principal de tu audiencia',       formato: 'imagen', prioridad: 2 },
  { angulo: 'Beneficios del producto',    razon: 'Mostrar lo concreto que el usuario va a obtener',    formato: 'carrusel', prioridad: 2 },
  { angulo: 'Urgencia / stock limitado',  razon: 'Activar decisión en retargeting',                    formato: 'stories', prioridad: 2 },
  { angulo: 'Detrás de escena / proceso', razon: 'Transparencia — genera confianza orgánica',          formato: 'reel',   prioridad: 3 },
]

/* ─── Análisis de creativo existente ─────────────────────── */
function AnalyzeCreativo({ form, perfil, onResult }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [needsTranscript, setNeedsTranscript] = useState(false)
  const [transcript, setTranscript] = useState('')
  const inputRef = useRef(null)

  const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,video/mpeg'
  const isVideo = file?.type?.startsWith('video/')

  const handleFile = (f) => {
    if (!f) return
    setFile(f)
    setResult(null)
    setError(null)
    setNeedsTranscript(false)
    setTranscript('')
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const ctx = {
    producto: form.producto || perfil?.marca_nombre || '',
    objetivo: form.objetivo,
    tono: perfil?.marca_tono || '',
  }

  const handleAnalyze = async () => {
    if (!file) return
    setAnalyzing(true)
    setError(null)
    try {
      const res = await creativeAnalyzeAPI.analyze(file, { ...ctx, formato: isVideo ? 'reel' : 'imagen' })
      setResult(res)
    } catch (e) {
      const detail = e?.response?.data?.detail || ''
      if (detail === 'VIDEO_NEEDS_TRANSCRIPT') {
        setNeedsTranscript(true)
      } else {
        setError(detail || 'Error al analizar el creativo.')
      }
    } finally {
      setAnalyzing(false)
    }
  }

  const handleAnalyzeTranscript = async () => {
    if (!transcript.trim()) return
    setAnalyzing(true)
    setError(null)
    try {
      const res = await creativeAnalyzeAPI.analyzeTranscript(transcript, ctx)
      setResult(res)
      setNeedsTranscript(false)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Error al analizar la transcripción.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleApply = () => {
    if (!result) return
    onResult(result)
    setOpen(false)
  }

  const confColor = { alta: 'text-green-400', media: 'text-yellow-400', baja: 'text-red-400' }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-white/3 transition-colors cursor-pointer"
      >
        <div className="w-7 h-7 rounded-lg bg-orange-DEFAULT/15 flex items-center justify-center shrink-0">
          <ScanSearch size={14} className="text-orange-DEFAULT" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-white text-xs font-semibold">Analizar creativo existente</p>
          <p className="text-slate-600 text-xs">Subí una imagen o reel y la IA genera el copy final</p>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-500 shrink-0" /> : <ChevronDown size={14} className="text-slate-500 shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative rounded-xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-2 py-5
              ${dragging ? 'border-orange-DEFAULT/60 bg-orange-DEFAULT/5' : file ? 'border-violet-DEFAULT/40 bg-violet-DEFAULT/5' : 'border-border hover:border-slate-500'}`}
          >
            <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden"
              onChange={e => handleFile(e.target.files[0])} />

            {preview ? (
              <div className="relative">
                <img src={preview} alt="preview" className="max-h-32 max-w-full rounded-lg object-cover" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/50 rounded-lg transition-opacity">
                  <ZoomIn size={20} className="text-white" />
                </div>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center">
                  {isVideo ? <Film size={18} className="text-slate-500" /> : <Upload size={18} className="text-slate-500" />}
                </div>
                <p className="text-slate-400 text-xs text-center">
                  {file ? `📎 ${file.name}` : 'Arrastrá o hacé clic para subir'}
                </p>
                <p className="text-slate-600 text-xs">JPG, PNG, WebP · MP4, MOV</p>
              </>
            )}

            {file && !preview && (
              <p className="text-slate-400 text-xs mt-1">
                {isVideo ? '🎬' : '📎'} {file.name}
              </p>
            )}
          </div>

          {/* Badge IA según tipo */}
          {file && (
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border w-fit
              ${isVideo
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                : 'bg-violet-DEFAULT/10 border-violet-DEFAULT/20 text-violet-glow'}`}>
              <span>{isVideo ? '🎬 Video → Gemini analizará audio + imagen' : '🖼️ Imagen → Claude Vision'}</span>
            </div>
          )}

          {/* Botón analizar */}
          {file && !result && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-DEFAULT/15 border border-orange-DEFAULT/30 text-orange-DEFAULT rounded-lg text-sm font-semibold hover:bg-orange-DEFAULT/25 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {analyzing
                ? <Loader2 size={14} className="animate-spin" />
                : <ScanSearch size={14} />}
              {analyzing
                ? (isVideo ? 'Gemini está analizando el video…' : 'Claude analiza la imagen…')
                : 'Analizar con IA'}
            </button>
          )}

          {/* Transcripción manual (cuando Gemini no está disponible) */}
          {needsTranscript && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Film size={13} className="text-blue-400 shrink-0" />
                <p className="text-blue-400 text-xs font-semibold">Pegá el guión o transcripción del video</p>
              </div>
              <p className="text-slate-500 text-xs">
                Copiá lo que se dice en el reel — subtítulos, texto en pantalla o el guión que tengas. Claude genera el copy a partir del texto.
              </p>
              <textarea
                autoFocus
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder={"Ej: \"¿Sabés cuánto ganás trabajando en aviación? Te lo cuento...\" o pegá los subtítulos del video."}
                rows={4}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-blue-400/40 transition-colors resize-none"
              />
              <button
                onClick={handleAnalyzeTranscript}
                disabled={analyzing || !transcript.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500/15 border border-blue-500/25 text-blue-400 rounded-lg text-sm font-semibold hover:bg-blue-500/25 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {analyzing ? 'Claude analiza el guión…' : 'Generar copy desde guión'}
              </button>
            </div>
          )}

          {error && (
            <div className="flex gap-2 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          {/* Resultado del análisis */}
          {result && (
            <div className="bg-bg border border-border rounded-xl p-3 space-y-3">
              {/* Ángulo detectado */}
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white text-xs font-semibold">{result.angulo_detectado}</p>
                    <span className={`text-xs font-medium ${confColor[result.confianza] || 'text-slate-400'}`}>
                      · {result.confianza}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs">{result.angulo_razon}</p>
                </div>
              </div>

              {/* Transcripción (solo videos) */}
              {result.transcripcion && (
                <div className="bg-blue-500/5 border border-blue-500/15 rounded-lg px-2.5 py-2">
                  <p className="text-blue-400 text-xs font-medium mb-1">🎙️ Transcripción detectada</p>
                  <p className="text-slate-400 text-xs leading-relaxed italic">"{result.transcripcion}"</p>
                </div>
              )}

              {/* Copy generado */}
              <div className="space-y-2">
                {[
                  { key: 'headline', label: 'Hook / Titular' },
                  { key: 'primary_text', label: 'Texto principal' },
                  { key: 'description', label: 'Descripción' },
                  { key: 'cta', label: 'CTA' },
                ].map(f => result.copy?.[f.key] && (
                  <div key={f.key}>
                    <p className="text-slate-500 text-xs mb-0.5">{f.label}</p>
                    <p className="text-slate-300 text-xs bg-surface/60 rounded-lg px-2.5 py-2 leading-relaxed whitespace-pre-wrap">
                      {result.copy[f.key]}
                    </p>
                  </div>
                ))}
              </div>

              {/* Observaciones */}
              {result.observaciones_creativo && (
                <div className="bg-yellow-400/5 border border-yellow-400/15 rounded-lg px-2.5 py-2">
                  <p className="text-slate-500 text-xs mb-0.5">Observaciones del creativo</p>
                  <p className="text-yellow-400/80 text-xs leading-relaxed">{result.observaciones_creativo}</p>
                </div>
              )}

              {/* Variaciones sugeridas */}
              {result.sugerencias_adicionales?.length > 0 && (
                <div>
                  <p className="text-slate-500 text-xs mb-1">Variaciones sugeridas</p>
                  <div className="space-y-1">
                    {result.sugerencias_adicionales.map((s, i) => (
                      <p key={i} className="text-slate-600 text-xs">· {s}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleApply}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-violet-DEFAULT/20 border border-violet-DEFAULT/40 text-violet-glow rounded-lg text-xs font-semibold hover:bg-violet-DEFAULT/30 transition-colors cursor-pointer"
                >
                  <Sparkles size={12} />
                  Aplicar ángulo y copy
                </button>
                <button
                  onClick={() => { setFile(null); setPreview(null); setResult(null) }}
                  className="px-3 py-2 border border-border rounded-lg text-slate-500 hover:text-white text-xs cursor-pointer transition-colors"
                >
                  Nuevo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Componente principal ───────────────────────────────── */
export default function CrearCampana({ onClose, onCreated, anguloInicial = '', productoInicial = '' }) {
  const { selected: account } = useAccount()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    nombre: '',
    objetivo: 'OUTCOME_LEADS',
    presupuesto: '',
    producto: productoInicial,
  })

  // Ángulos seleccionados: [{angulo, formato, razon}]
  const [seleccionados, setSeleccionados] = useState(
    anguloInicial ? [{ angulo: anguloInicial, formato: 'imagen', razon: 'Ángulo pre-cargado', custom: false }] : []
  )
  const [customInput, setCustomInput] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  // Copies generados: {[angulo]: {...copy fields}}
  const [copies, setCopies] = useState({})
  const [generando, setGenerando] = useState(false)
  const [anguloActivo, setAnguloActivo] = useState(null)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [copied, setCopied] = useState(false)

  const [perfil, setPerfil] = useState(null)
  const sugerencias = generarSugerencias(perfil)

  useEffect(() => {
    brandAPI.get(account?.id).then(setPerfil).catch(() => {})
  }, [])

  // Cuando el análisis de creativo devuelve un resultado, aplicarlo como ángulo + pre-cargar copy
  const handleAnalyzeResult = (result) => {
    const angulo = result.angulo_detectado
    if (!angulo) return
    const formato = result.copy?.hook_video ? 'reel' : 'imagen'
    const ya = seleccionados.find(x => x.angulo === angulo)
    if (!ya) {
      setSeleccionados(prev => [...prev, {
        angulo,
        formato,
        razon: result.angulo_razon || 'Detectado desde creativo subido',
        custom: false,
      }])
    }
    if (result.copy) {
      setCopies(prev => ({ ...prev, [angulo]: result.copy }))
    }
    setAnguloActivo(angulo)
  }

  // Cuando cambia producto/perfil, regenerar copies para los ángulos ya seleccionados
  useEffect(() => {
    if (seleccionados.length > 0) {
      const nuevos = {}
      seleccionados.forEach(({ angulo }) => {
        nuevos[angulo] = generarCopyLocal(angulo, form.producto, perfil)
      })
      setCopies(prev => ({ ...nuevos, ...prev }))
    }
  }, [form.producto, perfil])

  const toggleAngulo = (s) => {
    const ya = seleccionados.find(x => x.angulo === s.angulo)
    if (ya) {
      setSeleccionados(prev => prev.filter(x => x.angulo !== s.angulo))
      setCopies(prev => { const n = { ...prev }; delete n[s.angulo]; return n })
    } else {
      setSeleccionados(prev => [...prev, { angulo: s.angulo, formato: s.formato || 'imagen', razon: s.razon || '', custom: !!s.custom }])
      setCopies(prev => ({ ...prev, [s.angulo]: generarCopyLocal(s.angulo, form.producto, perfil) }))
      if (!anguloActivo) setAnguloActivo(s.angulo)
    }
  }

  const setFormato = (angulo, formato) => {
    setSeleccionados(prev => prev.map(x => x.angulo === angulo ? { ...x, formato } : x))
  }

  const addCustom = () => {
    if (!customInput.trim()) return
    const s = { angulo: customInput.trim(), formato: 'imagen', razon: 'Ángulo personalizado', custom: true }
    setSeleccionados(prev => [...prev, s])
    setCopies(prev => ({ ...prev, [s.angulo]: generarCopyLocal(s.angulo, form.producto, perfil) }))
    setCustomInput('')
    setShowCustom(false)
    if (!anguloActivo) setAnguloActivo(s.angulo)
  }

  const setCopyField = (angulo, field, value) => {
    setCopies(prev => ({ ...prev, [angulo]: { ...prev[angulo], [field]: value } }))
  }

  const handleGenerarTodo = async () => {
    if (!form.producto) { setError('Completá el producto antes de generar.'); return }
    if (seleccionados.length === 0) { setError('Seleccioná al menos un ángulo.'); return }
    setError(null)
    setGenerando(true)
    // Intentar Claude por cada ángulo, fallback local si no hay créditos
    const nuevos = { ...copies }
    for (const { angulo } of seleccionados) {
      try {
        const res = await recommendationsAPI.copy({ angulo, producto: form.producto, formato: seleccionados.find(x => x.angulo === angulo)?.formato || 'imagen', perfil_marca: perfil || undefined })
        nuevos[angulo] = res
      } catch {
        if (!nuevos[angulo]) nuevos[angulo] = generarCopyLocal(angulo, form.producto, perfil)
      }
    }
    setCopies(nuevos)
    if (seleccionados.length > 0) setAnguloActivo(seleccionados[0].angulo)
    setGenerando(false)
    setStep(2)
  }

  const handleCrear = async () => {
    if (!form.nombre || !form.presupuesto) { setError('Completá el nombre y el presupuesto.'); return }
    setError(null)
    setCreando(true)
    try {
      const res = await campaignsAPI.createDraft({ nombre: form.nombre, objetivo: form.objetivo, presupuesto_diario: parseInt(form.presupuesto) })
      setResultado(res)
      setStep(3)
      onCreated?.()
    } catch (e) {
      setError(e?.response?.data?.detail || 'Error al crear la campaña en Meta.')
    } finally {
      setCreando(false)
    }
  }

  const briefCompleto = generarBriefCompleto(form, seleccionados, copies, perfil)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(briefCompleto)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([briefCompleto], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `brief-${(form.nombre || form.producto || 'campana').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-DEFAULT/20 border border-violet-DEFAULT/30 flex items-center justify-center">
              <Sparkles size={16} className="text-violet-glow" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">
                {step === 1 && 'Nueva campaña — Estrategia creativa'}
                {step === 2 && 'Copy por ángulo'}
                {step === 3 && 'Campaña creada'}
              </h2>
              <p className="text-slate-500 text-xs">Paso {step} de 3</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex gap-1">
              {[1,2,3].map(s => <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? 'w-6 bg-violet-DEFAULT' : s < step ? 'w-3 bg-violet-DEFAULT/50' : 'w-3 bg-border'}`} />)}
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer transition-colors"><X size={18} /></button>
          </div>
        </div>

        {/* ── STEP 1 ─────────────────────────────────── */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto">
            <div className="grid md:grid-cols-2 gap-0 h-full">

              {/* Col izquierda — parámetros */}
              <div className="px-6 py-5 space-y-4 border-r border-border">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Parámetros</p>

                <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2.5 flex gap-2">
                  <AlertTriangle size={13} className="text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-yellow-400 text-xs">La campaña se crea en Meta en estado <strong>PAUSADA</strong>.</p>
                </div>

                <Field label="Nombre de la campaña">
                  <input value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
                    placeholder="Ej: TCP Turno Noche — CABA — Jun 2025"
                    className={inputCls} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Objetivo">
                    <div className="relative">
                      <select value={form.objetivo} onChange={e => setForm(f => ({...f, objetivo: e.target.value}))}
                        className={`${inputCls} appearance-none cursor-pointer pr-8`}>
                        {OBJETIVOS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                  </Field>
                  <Field label="Presupuesto diario">
                    <input type="number" value={form.presupuesto} onChange={e => setForm(f => ({...f, presupuesto: e.target.value}))}
                      placeholder="5000" className={inputCls} />
                  </Field>
                </div>

                <Field label="Producto / servicio">
                  <input value={form.producto} onChange={e => setForm(f => ({...f, producto: e.target.value}))}
                    placeholder={perfil?.marca_nombre || "Nombre del producto o servicio..."}
                    className={inputCls} />
                  {perfil?.marca_nombre && !form.producto && (
                    <button onClick={() => setForm(f => ({...f, producto: perfil.marca_nombre}))}
                      className="text-xs text-violet-glow mt-1 cursor-pointer hover:underline">
                      Usar "{perfil.marca_nombre}"
                    </button>
                  )}
                </Field>

                {/* Ángulos seleccionados */}
                {seleccionados.length > 0 && (
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-2">Ángulos seleccionados ({seleccionados.length})</p>
                    <div className="space-y-1.5">
                      {seleccionados.map(s => (
                        <div key={s.angulo} className="flex items-center gap-2 bg-violet-DEFAULT/10 border border-violet-DEFAULT/20 rounded-lg px-3 py-2">
                          <span className="text-violet-glow text-xs flex-1 truncate">{s.angulo}</span>
                          {/* Formato selector mini */}
                          <div className="flex gap-1">
                            {FORMATOS.map(f => {
                              const Icon = f.icon
                              return (
                                <button key={f.value} onClick={() => setFormato(s.angulo, f.value)}
                                  title={f.label}
                                  className={`p-1 rounded cursor-pointer transition-colors ${s.formato === f.value ? 'text-violet-glow bg-violet-DEFAULT/20' : 'text-slate-600 hover:text-slate-300'}`}>
                                  <Icon size={11} />
                                </button>
                              )
                            })}
                          </div>
                          <button onClick={() => toggleAngulo(s)} className="text-slate-600 hover:text-red-400 cursor-pointer ml-1"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                    <p className="text-slate-600 text-xs mt-1.5">Los íconos definen el formato: imagen · reel · carrusel · stories</p>
                  </div>
                )}

                {error && <p className="text-red-400 text-xs">{error}</p>}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleGenerarTodo}
                    disabled={generando || seleccionados.length === 0 || !form.producto}
                    className="flex-1 flex items-center justify-center gap-2 bg-violet-DEFAULT text-white font-semibold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity glow-violet text-sm"
                  >
                    {generando ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                    {generando ? 'Generando copies...' : `Generar ${seleccionados.length} copy${seleccionados.length !== 1 ? 's' : ''}`}
                  </button>
                  <button
                    onClick={() => { if (form.nombre && form.presupuesto && seleccionados.length > 0) setStep(2) }}
                    disabled={!form.nombre || !form.presupuesto || seleccionados.length === 0}
                    title="Continuar sin regenerar"
                    className="px-3 py-2.5 border border-border rounded-lg text-slate-400 hover:text-white text-sm cursor-pointer transition-colors disabled:opacity-30"
                  >
                    <Eye size={15} />
                  </button>
                </div>
              </div>

              {/* Col derecha — ángulos */}
              <div className="px-5 py-5 overflow-y-auto max-h-[65vh]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-slate-300 text-xs font-medium">Ángulos del conjunto de anuncios</p>
                    <p className="text-slate-600 text-xs mt-0.5">Seleccioná 3-6 para un test efectivo</p>
                  </div>
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${seleccionados.length >= 3 ? 'bg-green-400/15 text-green-400' : 'bg-yellow-400/15 text-yellow-400'}`}>
                    {seleccionados.length}/6
                  </div>
                </div>

                {/* Sugerencias IA */}
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb size={11} className="text-violet-glow" />
                    <p className="text-slate-500 text-xs">Sugeridos para tu marca</p>
                  </div>
                  <div className="space-y-2">
                    {sugerencias.map(s => {
                      const selec = seleccionados.find(x => x.angulo === s.angulo)
                      const fmtObj = FORMATOS.find(f => f.value === (selec?.formato || s.formato))
                      const FmtIcon = fmtObj?.icon || Image
                      return (
                        <button key={s.angulo} onClick={() => toggleAngulo(s)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all cursor-pointer group ${selec ? 'bg-violet-DEFAULT/15 border-violet-DEFAULT/40' : 'border-border hover:border-slate-500'}`}>
                          <div className="flex items-start gap-2">
                            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 border transition-colors ${selec ? 'bg-violet-DEFAULT border-violet-DEFAULT' : 'border-slate-600 group-hover:border-slate-400'}`}>
                              {selec && <Check size={10} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className={`text-xs font-semibold ${selec ? 'text-violet-glow' : 'text-slate-300'}`}>{s.angulo}</p>
                                <span className={`text-xs px-1.5 py-0.5 rounded border flex items-center gap-1 ${selec ? 'text-violet-glow border-violet-DEFAULT/30 bg-violet-DEFAULT/10' : 'text-slate-600 border-border'}`}>
                                  <FmtIcon size={9} />{fmtObj?.label}
                                </span>
                              </div>
                              <p className="text-slate-600 text-xs mt-0.5 leading-tight">{s.razon}</p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Input ángulo personalizado */}
                <div className="border-t border-border pt-3">
                  {!showCustom ? (
                    <button onClick={() => setShowCustom(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-xl text-slate-500 hover:text-white hover:border-slate-400 text-xs cursor-pointer transition-colors">
                      <Plus size={13} />
                      Agregar ángulo personalizado
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={customInput}
                        onChange={e => setCustomInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addCustom(); if (e.key === 'Escape') setShowCustom(false) }}
                        placeholder="Ej: Doble certificación, Turno noche..."
                        className={`${inputCls} flex-1`}
                      />
                      <button onClick={addCustom} className="px-3 py-2 bg-violet-DEFAULT/20 border border-violet-DEFAULT/30 text-violet-glow rounded-lg text-xs cursor-pointer hover:bg-violet-DEFAULT/30 transition-colors">
                        <Plus size={13} />
                      </button>
                      <button onClick={() => setShowCustom(false)} className="px-2 text-slate-500 hover:text-white cursor-pointer"><X size={13} /></button>
                    </div>
                  )}
                </div>

                {/* Análisis de creativo existente */}
                <div className="mt-3">
                  <AnalyzeCreativo form={form} perfil={perfil} onResult={handleAnalyzeResult} />
                </div>

                {/* Guía rápida */}
                <div className="mt-4 bg-bg border border-border rounded-xl p-3">
                  <p className="text-slate-400 text-xs font-medium mb-1.5">¿Por qué múltiples ángulos?</p>
                  <div className="space-y-1 text-xs text-slate-600">
                    <p>• Meta necesita al menos 3-5 variantes para optimizar bien</p>
                    <p>• Cada persona reacciona a un ángulo distinto</p>
                    <p>• Un A/B test con un solo creativo no da datos suficientes</p>
                    <p>• Los formatos impactan en distintos momentos del feed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2 ─────────────────────────────────── */}
        {step === 2 && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Tabs por ángulo */}
            <div className="flex gap-1 px-6 pt-4 pb-0 overflow-x-auto shrink-0">
              {seleccionados.map((s, i) => {
                const fmtObj = FORMATOS.find(f => f.value === s.formato)
                const FmtIcon = fmtObj?.icon || Image
                return (
                  <button key={s.angulo} onClick={() => setAnguloActivo(s.angulo)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer ${anguloActivo === s.angulo ? 'bg-bg border-violet-DEFAULT text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                    <FmtIcon size={11} />
                    <span className="max-w-32 truncate">{s.angulo}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex-1 overflow-y-auto bg-bg">
              {seleccionados.map(s => {
                if (s.angulo !== anguloActivo) return null
                const copy = copies[s.angulo] || {}
                const fmtObj = FORMATOS.find(f => f.value === s.formato)
                return (
                  <div key={s.angulo} className="px-6 py-5 grid md:grid-cols-2 gap-5">
                    {/* Campos editables */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded border text-violet-glow border-violet-DEFAULT/30 bg-violet-DEFAULT/10`}>{s.angulo}</span>
                        <span className="text-slate-600 text-xs">{fmtObj?.desc}</span>
                      </div>
                      {[
                        { key: 'headline',     label: 'Hook / Titular',    hint: '40 chars',  rows: 1 },
                        { key: 'primary_text', label: 'Texto principal',   hint: '125 chars', rows: 5 },
                        { key: 'description',  label: 'Descripción',       hint: '30 chars',  rows: 1 },
                        { key: 'cta',          label: 'CTA',               hint: '',          rows: 1 },
                        { key: 'hook_video',   label: 'Hook video (0-3s)', hint: 'primeras palabras', rows: 2 },
                      ].map(f => copy[f.key] !== undefined && (
                        <div key={f.key}>
                          <label className="text-xs mb-1 flex justify-between">
                            <span className="text-slate-300 font-medium">{f.label}</span>
                            {f.hint && <span className="text-slate-600">{f.hint}</span>}
                          </label>
                          <textarea value={copy[f.key] || ''} onChange={e => setCopyField(s.angulo, f.key, e.target.value)}
                            rows={f.rows}
                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-DEFAULT/60 transition-colors resize-none" />
                        </div>
                      ))}
                    </div>
                    {/* Brief de este ángulo */}
                    <div>
                      <p className="text-slate-400 text-xs font-medium mb-2 flex items-center gap-1.5"><Download size={12} />Brief visual para diseñador</p>
                      <BriefVisual angulo={s} copy={copy} perfil={perfil} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer step 2 */}
            <div className="px-6 py-4 border-t border-border shrink-0 flex items-center gap-3">
              {error && <p className="text-red-400 text-xs flex-1">{error}</p>}
              <div className="flex gap-2 ml-auto">
                <button onClick={() => setStep(1)} className="px-4 py-2 border border-border rounded-lg text-slate-400 hover:text-white text-sm cursor-pointer transition-colors">
                  Atrás
                </button>
                <button onClick={handleCopy} className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-lg text-slate-300 hover:text-white text-sm cursor-pointer transition-colors">
                  {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  {copied ? 'Copiado' : 'Copiar brief'}
                </button>
                <button onClick={handleDownload} className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-lg text-slate-300 hover:text-white text-sm cursor-pointer transition-colors">
                  <Download size={13} />
                  .txt
                </button>
                <button onClick={handleCrear} disabled={creando || !form.nombre || !form.presupuesto}
                  className="flex items-center gap-2 bg-violet-DEFAULT text-white font-semibold px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity glow-violet text-sm">
                  {creando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {creando ? 'Creando...' : 'Crear en Meta (PAUSADA)'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3 ─────────────────────────────────── */}
        {step === 3 && (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="text-center py-3">
              <div className="w-14 h-14 rounded-full bg-green-400/15 border border-green-400/30 flex items-center justify-center mx-auto mb-3">
                <Send size={24} className="text-green-400" />
              </div>
              <p className="text-white font-semibold">Campaña creada en Meta</p>
              <p className="text-slate-400 text-sm mt-1">Estado: <span className="text-yellow-400 font-medium">PAUSADA</span></p>
              {resultado?.campaign_id && <p className="text-slate-500 text-xs mt-1">ID: {resultado.campaign_id}</p>}
            </div>

            <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-4 py-3">
              <p className="text-yellow-400 text-xs leading-relaxed">
                Entrá a <strong>Meta Ads Manager → Campañas</strong>. Creá {seleccionados.length} anuncios dentro del Ad Set — uno por ángulo — con los creativos de cada brief.
              </p>
            </div>

            {/* Resumen de ángulos */}
            <div>
              <p className="text-slate-400 text-xs font-medium mb-2">Estructura del conjunto de anuncios ({seleccionados.length} creativos)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {seleccionados.map((s, i) => {
                  const fmtObj = FORMATOS.find(f => f.value === s.formato)
                  const FmtIcon = fmtObj?.icon || Image
                  return (
                    <div key={s.angulo} className="bg-bg border border-border rounded-lg px-3 py-2 text-xs">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-slate-500">#{i+1}</span>
                        <FmtIcon size={11} className="text-violet-glow" />
                        <span className="text-slate-500">{fmtObj?.label}</span>
                      </div>
                      <p className="text-white font-medium leading-tight">{s.angulo}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Brief completo */}
            <div className="bg-bg border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white text-xs font-medium flex items-center gap-1.5"><Download size={12} />Brief completo — todos los ángulos</p>
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="text-xs text-slate-400 hover:text-white cursor-pointer flex items-center gap-1">
                    {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />} {copied ? 'Copiado' : 'Copiar'}
                  </button>
                  <button onClick={handleDownload} className="text-xs text-slate-400 hover:text-white cursor-pointer flex items-center gap-1">
                    <Download size={11} /> .txt
                  </button>
                </div>
              </div>
              <pre className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap font-mono bg-surface/60 rounded-lg p-3 max-h-48 overflow-auto">
                {briefCompleto}
              </pre>
            </div>

            <button onClick={onClose} className="w-full bg-surface border border-border rounded-lg py-2.5 text-white text-sm cursor-pointer hover:border-violet-DEFAULT/40 transition-colors">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Brief visual por ángulo ─────────────────────────────── */
function BriefVisual({ angulo, copy, perfil }) {
  const fmtObj = FORMATOS.find(f => f.value === angulo.formato) || FORMATOS[0]
  const texto = [
    `📌 ÁNGULO: ${angulo.angulo}`,
    `📐 FORMATO: ${fmtObj.label} — ${fmtObj.desc}`,
    ``,
    `🎯 HOOK / TITULAR`,
    copy.headline || '',
    ``,
    `📝 TEXTO PRINCIPAL`,
    copy.primary_text || '',
    ``,
    `📌 DESCRIPCIÓN`,
    copy.description || '',
    ``,
    `🔘 CTA: ${copy.cta || ''}`,
    ``,
    `🎬 HOOK VIDEO (0-3s)`,
    copy.hook_video || '',
    perfil?.marca_palabras_si ? `\n✅ PALABRAS CLAVE\n${perfil.marca_palabras_si}` : '',
    perfil?.marca_palabras_no ? `\n❌ EVITAR\n${perfil.marca_palabras_no}` : '',
  ].filter(l => l !== null).join('\n').trim()

  const [copied, setCopied] = useState(false)
  const doCopy = async () => {
    await navigator.clipboard.writeText(texto)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-3 h-full flex flex-col">
      <pre className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap font-mono flex-1 overflow-auto max-h-72">
        {texto}
      </pre>
      <button onClick={doCopy} className="mt-2 flex items-center justify-center gap-1.5 border border-border rounded-lg py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer transition-colors">
        {copied ? <><Check size={12} className="text-green-400" /> Copiado</> : <><Copy size={12} /> Copiar brief del ángulo</>}
      </button>
    </div>
  )
}

/* ─── Brief completo (todos los ángulos) ──────────────────── */
function generarBriefCompleto(form, seleccionados, copies, perfil) {
  const objetivo = OBJETIVOS.find(o => o.value === form.objetivo)?.label || form.objetivo
  const lineas = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📢 BRIEF DE CAMPAÑA`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Campaña: ${form.nombre || '(sin nombre)'}`,
    `Producto: ${form.producto || perfil?.marca_nombre || ''}`,
    `Objetivo: ${objetivo}`,
    `Presupuesto diario: ${form.presupuesto || '—'}`,
    perfil?.marca_tono ? `Tono: ${perfil.marca_tono}` : '',
    `Ángulos / creativos: ${seleccionados.length}`,
    ``,
    perfil?.marca_propuesta_valor ? `💡 PROPUESTA DE VALOR\n${perfil.marca_propuesta_valor}\n` : '',
    perfil?.marca_publico ? `👥 AUDIENCIA OBJETIVO\n${perfil.marca_publico}\n` : '',
  ]

  seleccionados.forEach((s, i) => {
    const copy = copies[s.angulo] || {}
    const fmtObj = FORMATOS.find(f => f.value === s.formato)
    lineas.push(`━━━ CREATIVO #${i+1} ━━━`)
    lineas.push(`Ángulo: ${s.angulo}`)
    lineas.push(`Formato: ${fmtObj?.label} — ${fmtObj?.desc}`)
    lineas.push(``)
    lineas.push(`🎯 HOOK / TITULAR`)
    lineas.push(copy.headline || '')
    lineas.push(``)
    lineas.push(`📝 TEXTO PRINCIPAL`)
    lineas.push(copy.primary_text || '')
    lineas.push(``)
    lineas.push(`📌 DESCRIPCIÓN: ${copy.description || ''}`)
    lineas.push(`🔘 CTA: ${copy.cta || ''}`)
    lineas.push(`🎬 HOOK VIDEO: ${copy.hook_video || ''}`)
    lineas.push(``)
  })

  if (perfil?.marca_palabras_si) {
    lineas.push(`━━━ VOCABULARIO ━━━`)
    lineas.push(`✅ USAR: ${perfil.marca_palabras_si.split('\n').filter(Boolean).join(' · ')}`)
    if (perfil.marca_palabras_no) lineas.push(`❌ EVITAR: ${perfil.marca_palabras_no.split('\n').filter(Boolean).join(' · ')}`)
    lineas.push(``)
  }

  lineas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  lineas.push(`Brief generado por Meta Ads AI`)

  return lineas.filter(l => l !== null && l !== undefined).join('\n').trim()
}

/* ─── Helpers UI ─────────────────────────────────────────── */
const inputCls = "w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-DEFAULT/60 transition-colors"

function Field({ label, children }) {
  return (
    <div>
      <label className="text-slate-400 text-xs font-medium mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

/* ─── Copy engine ────────────────────────────────────────── */
function generarCopyLocal(angulo, producto, perfil) {
  const p = producto || perfil?.marca_nombre || 'nuestro producto'
  const beneficios = (perfil?.marca_beneficios || '').split('\n').filter(Boolean)
  const b = (i) => beneficios[i] || null
  const propuesta = perfil?.marca_propuesta_valor || ''
  const tono = perfil?.marca_tono || 'cercano'
  const ctaWsp = tono === 'urgente' ? 'Escribinos ahora — cupos limitados 👇' : 'Escribinos y te contamos todo 👇'

  const makeBullets = (indices) => {
    const items = indices.map(i => b(i)).filter(Boolean)
    if (!items.length) return null
    return items.map(item => `✅ ${item}`).join('\n')
  }

  const copies = {
    'Propuesta de valor directa': {
      headline: propuesta ? propuesta.split('.')[0].slice(0, 60) : `${p} — sin vueltas`,
      primary_text: `Sin rodeos:\n\n${makeBullets([0,1,2,3]) || `✅ ${p}`}\n\n${propuesta ? `${propuesta}\n\n` : ''}Inscripciones abiertas. ${ctaWsp}`,
      description: `Sin letra chica`,
      cta: 'Enviar mensaje',
      hook_video: `"Por qué ${p} es diferente a todo lo que viste"`,
    },
    'Testimonial de cliente': {
      headline: `El resultado habla solo. ✈️`,
      primary_text: `Empezaron igual que vos — sin experiencia, solo con ganas.\n\nHoy están trabajando en la industria. Y eligieron ${p} para llegar ahí.\n\n${makeBullets([0,1,2,3]) || `✅ ${propuesta || p}`}\n\n${ctaWsp}`,
      description: `Historias reales`,
      cta: 'Enviar mensaje',
      hook_video: `"Empecé desde cero. Hoy trabajo en..."`,
    },
    'Problema → solución': {
      headline: `"No tengo tiempo." — Calculemos. 👇`,
      primary_text: `Eso es lo que más escuchamos. Y es lo que más fácil se rompe.\n\n${p} fue diseñado para eso:\n\n${makeBullets([0,1,4,5]) || `✅ ${propuesta || p}`}\n\nNo hay por qué seguir esperando. ${ctaWsp}`,
      description: `La solución que buscabas`,
      cta: 'Más información',
      hook_video: `"La excusa que más escuchamos... y cómo la rompemos"`,
    },
    'Beneficios del producto': {
      headline: `${p} — por qué lo eligen`,
      primary_text: `${makeBullets([0,1,2,3,4]) || `✅ ${propuesta || p}`}\n\n${propuesta}\n\n${ctaWsp}`,
      description: `Beneficios concretos`,
      cta: 'Más información',
      hook_video: `"3 cosas que hacen diferente a ${p}"`,
    },
    'Urgencia / stock limitado': {
      headline: `⚠️ Últimos cupos disponibles`,
      primary_text: `Si lo estás pensando hace tiempo, este es el momento.\n\n${makeBullets([0,1,2,3]) || `✅ ${p}`}\n\nLas inscripciones cierran pronto. No esperés a que se agoten.\n\n${ctaWsp}`,
      description: `Cupos limitados`,
      cta: 'Enviar mensaje',
      hook_video: `"⚠️ Quedan pocos lugares para ${p}."`,
    },
    'Detrás de escena / proceso': {
      headline: `Lo que nadie te muestra de ${p}`,
      primary_text: `La mayoría no sabe lo que pasa dentro de ${p}.\n\nTe lo mostramos:\n\n${makeBullets([0,2,4,6]) || `✅ ${propuesta || p}`}\n\nNo es un curso más. Es otra cosa. ${ctaWsp}`,
      description: `Transparencia total`,
      cta: 'Más información',
      hook_video: `"Lo que nadie te cuenta sobre ${p}..."`,
    },
    'Comparación de precio / cuotas': {
      headline: `Cuotas accesibles. Carrera real.`,
      primary_text: `Muchos creen que no es para ellos por el precio. Están equivocados.\n\n${p} tiene planes de pago propios, sin banco, sin trámites.\n\n${makeBullets([0,1,3]) || `✅ ${propuesta || p}`}\n\n¿Cuánto cuesta realmente? ${ctaWsp}`,
      description: `Financiación disponible`,
      cta: 'Más información',
      hook_video: `"¿Cuánto cuesta realmente ${p}? La respuesta te sorprende."`,
    },
    'Garantía / sin riesgo': {
      headline: `Sin riesgo. Sin excusas.`,
      primary_text: `¿Qué te frena? En ${p} tenemos respuestas para cada objeción.\n\n${makeBullets([0,1,2,3]) || `✅ ${propuesta || p}`}\n\nSi no es lo que esperabas, te acompañamos. Pero va a ser lo que esperabas.\n\n${ctaWsp}`,
      description: `Respaldo total`,
      cta: 'Más información',
      hook_video: `"¿Qué pasa si no es para mí? Esto es lo que hacemos."`,
    },
  }

  return copies[angulo] || {
    headline: `${p} — inscripciones abiertas`,
    primary_text: `${makeBullets([0,1,2,3]) || `✅ ${propuesta || p}`}\n\n${ctaWsp}`,
    description: `Consultá ahora`,
    cta: 'Enviar mensaje',
    hook_video: `"¿Sabés todo lo que incluye ${p}?"`,
  }
}
