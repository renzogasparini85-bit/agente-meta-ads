import { useState } from 'react'
import {
  Film, Image, LayoutGrid, Layers, TrendingUp, Heart, MessageCircle,
  Share2, Bookmark, Eye, Star, Wand2, Copy, Check, X, ChevronDown,
  BarChart2, Play,
} from 'lucide-react'

// Íconos de redes sociales como SVG inline
const IgIcon = ({ size = 12, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
)

const FbIcon = ({ size = 12, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)
import { organicAPI, recommendationsAPI, brandAPI, campaignsAPI } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { PageLoading, ErrorState, Spinner } from '../components/LoadingState'
import DateRangePicker from '../components/DateRangePicker'
import { useAccount } from '../context/AccountContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts'

// ─── Config ──────────────────────────────────────────────────────────────────
const badgeConfig = {
  ganador: { label: 'Ganador',  bg: 'bg-green-400/15  border-green-400/30',  text: 'text-green-400',  icon: Star },
  bueno:   { label: 'Bueno',   bg: 'bg-blue-400/15   border-blue-400/30',   text: 'text-blue-400',   icon: TrendingUp },
  normal:  { label: 'Normal',  bg: 'bg-slate-400/15  border-slate-400/30',  text: 'text-slate-400',  icon: BarChart2 },
  bajo:    { label: 'Bajo',    bg: 'bg-red-400/15    border-red-400/30',    text: 'text-red-400',    icon: ChevronDown },
}

const formatoConfig = {
  reel:     { label: 'Reel',     icon: Film,        color: 'text-violet-glow', bg: 'bg-violet-DEFAULT/15 border-violet-DEFAULT/30' },
  imagen:   { label: 'Imagen',   icon: Image,       color: 'text-blue-400',    bg: 'bg-blue-400/15 border-blue-400/30' },
  carrusel: { label: 'Carrusel', icon: LayoutGrid,  color: 'text-orange-400',  bg: 'bg-orange-400/15 border-orange-400/30' },
  stories:  { label: 'Stories',  icon: Layers,      color: 'text-cyan-400',    bg: 'bg-cyan-400/15 border-cyan-400/30' },
}

const FILTROS_FORMATO = [
  { value: 'todos',    label: 'Todos' },
  { value: 'reel',    label: 'Reels' },
  { value: 'imagen',  label: 'Imágenes' },
  { value: 'carrusel',label: 'Carruseles' },
]

const FILTROS_RED = [
  { value: 'todas',     label: 'Todas las redes' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook',  label: 'Facebook' },
]

const plataformaConfig = {
  instagram: { label: 'Instagram', color: 'text-pink-400',  bg: 'bg-pink-400/15 border-pink-400/30',  icon: IgIcon },
  facebook:  { label: 'Facebook',  color: 'text-blue-400',  bg: 'bg-blue-400/15 border-blue-400/30',  icon: FbIcon },
}

// ─── Badge de plataforma ─────────────────────────────────────────────────────
function PlatBadge({ plat }) {
  const p = plataformaConfig[plat]
  if (!p) return null
  const Icon = p.icon
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border font-medium ${p.bg} ${p.color}`}>
      <Icon size={9} /> {p.label}
    </span>
  )
}

// ─── Badge de post ────────────────────────────────────────────────────────────
function PostBadge({ type }) {
  const b = badgeConfig[type] || badgeConfig.normal
  const Icon = b.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${b.bg} ${b.text}`}>
      <Icon size={10} /> {b.label}
    </span>
  )
}

function FormatoBadge({ fmt }) {
  const f = formatoConfig[fmt] || formatoConfig.imagen
  const Icon = f.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${f.bg} ${f.color}`}>
      <Icon size={10} /> {f.label}
    </span>
  )
}

// ─── KPI resumen ─────────────────────────────────────────────────────────────
function ResumenKPIs({ resumen, porFormato }) {
  if (!resumen || resumen.total_posts == null) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
      {[
        { label: 'Posts',        value: resumen.total_posts,                                    icon: BarChart2,       color: 'text-slate-300' },
        { label: 'Alcance total',value: (resumen.total_reach / 1000).toFixed(1) + 'k',         icon: Eye,             color: 'text-violet-glow' },
        { label: 'Likes',        value: resumen.total_likes.toLocaleString('es-AR'),            icon: Heart,           color: 'text-red-400' },
        { label: 'Comentarios',  value: resumen.total_comments.toLocaleString('es-AR'),         icon: MessageCircle,   color: 'text-blue-400' },
        { label: 'Compartidos',  value: resumen.total_shares?.toLocaleString('es-AR'),          icon: Share2,          color: 'text-green-400' },
        { label: 'Guardados',    value: resumen.total_saves?.toLocaleString('es-AR') || '—',   icon: Bookmark,        color: 'text-cyan-400'   },
        { label: 'Eng. prom.',   value: resumen.avg_engagement + '%',                           icon: TrendingUp,      color: 'text-orange-400' },
      ].map(k => {
        const Icon = k.icon
        return (
          <div key={k.label} className="bg-surface border border-border rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={12} className={k.color} />
              <p className="text-slate-500 text-xs">{k.label}</p>
            </div>
            <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Gráfico por formato ──────────────────────────────────────────────────────
function FormatoChart({ porFormato }) {
  if (!porFormato || !Object.keys(porFormato).length) return <EmptyTab text="Sin datos por formato" sub="Ampliá el rango de fechas para ver el análisis por formato." />
  const data = Object.entries(porFormato).map(([fmt, v]) => ({
    formato: formatoConfig[fmt]?.label || fmt,
    'Alcance prom.': v.avg_reach,
    'Engagement %':  v.avg_eng,
    posts:           v.count,
  }))
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-1">Alcance promedio por formato</h3>
        <p className="text-slate-500 text-xs mb-4">¿Qué formato llega a más gente?</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
            <XAxis dataKey="formato" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={40} />
            <Tooltip contentStyle={{ background: '#1A1D2E', border: '1px solid #2A2D3A', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94A3B8' }} itemStyle={{ color: '#fff' }} />
            <Bar dataKey="Alcance prom." fill="#8B5CF6" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-1">Engagement % por formato</h3>
        <p className="text-slate-500 text-xs mb-4">¿Qué formato genera más interacción?</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
            <XAxis dataKey="formato" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${v}%`} width={40} />
            <Tooltip contentStyle={{ background: '#1A1D2E', border: '1px solid #2A2D3A', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94A3B8' }} itemStyle={{ color: '#fff' }} />
            <Bar dataKey="Engagement %" fill="#FF6B00" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Modal generador de variación ────────────────────────────────────────────
const FORMATOS_SALIDA = [
  { id: 'imagen',    label: 'Placa estática',  desc: 'Imagen + caption' },
  { id: 'carrusel',  label: 'Carrusel',        desc: '5-7 slides secuenciales' },
  { id: 'reel',      label: 'Reel / Video',    desc: 'Guión + hook + caption' },
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

function ModalVariacion({ post, perfil, onClose, nombreCuenta }) {
  const [step, setStep]     = useState(1)   // 1=formato, 2=ángulo, 3=resultado
  const [formato, setFormato] = useState('imagen')
  const [angulo, setAngulo] = useState(ANGULOS[0])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError]   = useState(null)
  const [copied, setCopied] = useState(false)

  const generar = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await recommendationsAPI.copy({
        angulo,
        formato_salida: formato,
        tema: String(post.caption || post.tema || ''),
        perfil_marca: String(perfil || ''),
        nombre_cuenta: String(nombreCuenta || ''),
      })
      setResult(res)
      setStep(3)
    } catch (e) {
      const detail = e?.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map(d => d.msg).join(', ')
        : (typeof detail === 'string' ? detail : 'Error al generar. Verificá la API key de Anthropic.')
      setError(msg)
    }
    setLoading(false)
  }

  const doCopy = async () => {
    await navigator.clipboard.writeText(result?.contenido || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const reset = () => { setResult(null); setError(null); setStep(1) }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-DEFAULT/20 border border-violet-DEFAULT/30 flex items-center justify-center">
              <Wand2 size={14} className="text-violet-glow" />
            </div>
            <p className="text-white font-semibold text-sm">Generador de variaciones IA</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer"><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Post base */}
          <div className="bg-bg border border-border rounded-lg px-3 py-2 text-xs text-slate-400 line-clamp-2">
            <span className="text-slate-500 font-medium">Post base: </span>{post.tema}
          </div>

          {/* Paso 1: Formato de salida */}
          <div>
            <p className="text-white text-xs font-semibold mb-2">1. ¿En qué formato vas a publicar?</p>
            <div className="grid grid-cols-3 gap-2">
              {FORMATOS_SALIDA.map(f => (
                <button key={f.id} onClick={() => setFormato(f.id)}
                  className={`text-left px-3 py-3 rounded-xl border transition-all cursor-pointer ${
                    formato === f.id
                      ? 'bg-violet-DEFAULT/15 border-violet-DEFAULT/50 text-white'
                      : 'border-border text-slate-400 hover:border-slate-500 hover:text-white'
                  }`}>
                  <p className="text-xs font-semibold">{f.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Paso 2: Ángulo creativo */}
          <div>
            <p className="text-white text-xs font-semibold mb-2">2. ¿Qué ángulo creativo aplicamos?</p>
            <div className="grid grid-cols-2 gap-1.5">
              {ANGULOS.map(a => (
                <button key={a} onClick={() => setAngulo(a)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-all cursor-pointer ${
                    angulo === a
                      ? 'bg-orange-DEFAULT/15 border-orange-DEFAULT/40 text-orange-300'
                      : 'border-border text-slate-400 hover:border-slate-500 hover:text-white'
                  }`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

          {/* Resultado */}
          {result && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-green-400 text-xs font-semibold flex-1">Brief generado — {FORMATOS_SALIDA.find(f=>f.id===result.formato)?.label}</p>
                <button onClick={reset} className="text-slate-500 hover:text-white text-xs cursor-pointer">← Cambiar</button>
              </div>
              <pre className="bg-bg border border-border rounded-xl p-4 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-72 overflow-auto">
                {result.contenido}
              </pre>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-1">
            {result ? (
              <button onClick={doCopy}
                className="flex-1 flex items-center justify-center gap-2 bg-green-500/20 border border-green-400/30 text-green-400 font-semibold py-2.5 rounded-xl hover:bg-green-500/30 cursor-pointer transition-colors text-sm">
                {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar brief completo</>}
              </button>
            ) : (
              <button onClick={generar} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-DEFAULT text-white font-semibold py-2.5 rounded-xl hover:opacity-90 cursor-pointer transition-opacity text-sm disabled:opacity-50">
                {loading ? <><Spinner size={14} /> Generando brief...</> : <><Wand2 size={14} /> Generar brief completo</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── Tarjeta de post ──────────────────────────────────────────────────────────
function PostCard({ post, perfil, isGanador, nombreCuenta }) {
  const [expanded, setExpanded] = useState(false)
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className={`bg-surface border rounded-xl overflow-hidden transition-all ${
        isGanador ? 'border-green-400/30 hover:border-green-400/50' : 'border-border hover:border-slate-600'
      }`}>
        {/* Imagen del post */}
        {post.thumbnail && (
          <div className="w-full h-44 bg-bg overflow-hidden">
            <img
              src={post.thumbnail}
              alt={post.tema}
              className="w-full h-full object-cover"
              onError={e => { e.target.parentElement.style.display = 'none' }}
            />
          </div>
        )}
        {/* Cabecera */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <FormatoBadge fmt={post.formato} />
              <PostBadge type={post.badge} />
              {post.plataforma && <PlatBadge plat={post.plataforma} />}
            </div>
            <span className="text-slate-400 text-xs shrink-0 ml-2">{post.fecha}</span>
          </div>
          <p className="text-white text-sm font-semibold leading-snug line-clamp-2 mb-2" title={post.tema}>
            {post.tema}
          </p>

          {/* Métricas principales */}
          <div className="grid grid-cols-4 gap-2">
            <Metric icon={Eye}           value={post.reach >= 1000 ? `${(post.reach/1000).toFixed(1)}k` : post.reach} label="Alcance"   color={post.reach > 5000 ? 'text-green-400' : 'text-slate-300'} />
            <Metric icon={Heart}         value={post.likes}                                                             label="Likes"     color="text-red-400" />
            <Metric icon={MessageCircle} value={post.comments}                                                          label="Coment."   color="text-blue-400" />
            <Metric icon={Share2}        value={post.shares}                                                            label="Comp."     color="text-slate-300" />
          </div>
        </div>

        {/* Engagement bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500 text-xs">Engagement</span>
            <span className={`text-xs font-bold ${post.engagement_rate >= 8 ? 'text-green-400' : post.engagement_rate >= 4 ? 'text-yellow-400' : 'text-slate-400'}`}>
              {post.engagement_rate}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${post.engagement_rate >= 8 ? 'bg-green-400' : post.engagement_rate >= 4 ? 'bg-yellow-400' : 'bg-slate-500'}`}
              style={{ width: `${Math.min(post.engagement_rate / 15 * 100, 100)}%` }} />
          </div>
        </div>

        {/* Caption expandible */}
        {post.caption && post.caption !== post.tema && (
          <div className="px-4 pb-3">
            <button onClick={() => setExpanded(!expanded)}
              className="text-slate-500 hover:text-slate-300 text-xs cursor-pointer transition-colors flex items-center gap-1">
              <ChevronDown size={11} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              {expanded ? 'Ocultar caption' : 'Ver caption completo'}
            </button>
            {expanded && (
              <p className="text-slate-400 text-xs mt-2 leading-relaxed bg-bg rounded-lg px-3 py-2 border border-border">
                {post.caption}
              </p>
            )}
          </div>
        )}

        {/* Footer acciones */}
        <div className={`px-3 py-2.5 border-t flex items-center gap-2 ${isGanador ? 'border-green-400/15 bg-green-400/5' : 'border-border'}`}>
          {post.plays != null && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Play size={10} /> {post.plays.toLocaleString('es-AR')} views
            </span>
          )}
          {post.saves != null && post.saves > 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Bookmark size={10} /> {post.saves}
            </span>
          )}
          <div className="flex-1" />
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-DEFAULT/30 bg-violet-DEFAULT/10 text-violet-glow hover:bg-violet-DEFAULT/20 text-xs font-medium cursor-pointer transition-colors">
            <Wand2 size={11} />
            {isGanador ? 'Replicar ganador' : 'Generar variación'}
          </button>
        </div>
      </div>

      {showModal && <ModalVariacion post={post} perfil={perfil} nombreCuenta={nombreCuenta} onClose={() => setShowModal(false)} />}
    </>
  )
}

function Metric({ icon: Icon, value, label, color }) {
  return (
    <div className="text-center">
      <Icon size={11} className={`mx-auto mb-0.5 ${color}`} />
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-slate-400 text-[10px]">{label}</p>
    </div>
  )
}

// ─── Comparativa por plataforma (IG vs FB) ───────────────────────────────────
function EmptyTab({ text, sub }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-6 py-12 text-center">
      <p className="text-slate-400 text-sm font-medium">{text}</p>
      {sub && <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto">{sub}</p>}
    </div>
  )
}

function PorPlataformaView({ porPlataforma }) {
  if (!porPlataforma || !Object.keys(porPlataforma).length)
    return <EmptyTab text="Sin datos por plataforma" sub="Ampliá el rango de fechas o revisá que haya posts en el período." />

  const redes = Object.entries(porPlataforma).map(([plat, v]) => ({
    red: plataformaConfig[plat]?.label || plat,
    plat,
    ...v,
  }))

  const barData = [
    { name: 'Alcance prom.',  ...Object.fromEntries(redes.map(r => [r.red, r.avg_reach])) },
    { name: 'Engagement %',   ...Object.fromEntries(redes.map(r => [r.red, r.avg_eng]))   },
    { name: 'Likes totales',  ...Object.fromEntries(redes.map(r => [r.red, r.total_likes])  ) },
    { name: 'Guardados',      ...Object.fromEntries(redes.map(r => [r.red, r.total_saves])  ) },
  ]

  const COLORS = { Instagram: '#EC4899', Facebook: '#3B82F6' }

  return (
    <div className="space-y-4">
      {/* Cards resumen por red */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {redes.map(r => {
          const cfg = plataformaConfig[r.plat]
          const Icon = cfg?.icon || BarChart2
          return (
            <div key={r.plat} className={`bg-surface border rounded-xl p-5 ${cfg?.bg || 'border-border'}`}>
              <div className="flex items-center gap-2 mb-4">
                <Icon size={16} className={cfg?.color} />
                <p className={`font-semibold text-sm ${cfg?.color}`}>{r.red}</p>
                <span className="text-slate-400 text-xs ml-auto">{r.count} posts</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Alcance prom.',  value: r.avg_reach >= 1000 ? `${(r.avg_reach/1000).toFixed(1)}k` : r.avg_reach },
                  { label: 'Engagement',     value: `${r.avg_eng}%` },
                  { label: 'Likes totales',  value: r.total_likes?.toLocaleString('es-AR') },
                ].map(m => (
                  <div key={m.label}>
                    <p className="text-slate-500 text-xs mb-0.5">{m.label}</p>
                    <p className={`text-lg font-bold ${cfg?.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Gráfico comparativo */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-1">Instagram vs Facebook — comparativa de métricas</h3>
        <p className="text-slate-500 text-xs mb-4">¿En qué red rinde mejor el contenido?</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
            <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={40} />
            <Tooltip contentStyle={{ background: '#1A1D2E', border: '1px solid #2A2D3A', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94A3B8' }} />
            {redes.map(r => (
              <Bar key={r.red} dataKey={r.red} fill={COLORS[r.red] || '#8B5CF6'} radius={[4,4,0,0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Comparativa orgánico vs pago ────────────────────────────────────────────
function ComparativaOrgPago({ resumen, campaigns }) {
  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n ?? '—')
  const fmtPesos = (n) => '$' + Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 })

  if (!resumen || resumen.total_posts == null) return <EmptyTab text="Sin datos orgánicos" sub="Ampliá el rango de fechas para ver posts en el período." />

  const pagoAlcance     = campaigns.reduce((s, c) => s + (c.impresiones || 0), 0)
  const pagoConv        = campaigns.reduce((s, c) => s + (c.conversaciones || 0), 0)
  const pagoGasto       = campaigns.reduce((s, c) => s + (c.gasto || 0), 0)
  const orgInteractions = (resumen.total_likes || 0) + (resumen.total_comments || 0) + (resumen.total_shares || 0)

  const barData = [
    { name: 'Alcance',        Orgánico: resumen.total_reach || 0, Pago: pagoAlcance },
    { name: 'Interacciones',  Orgánico: orgInteractions,          Pago: pagoConv    },
  ]

  const hasPago = campaigns.length > 0

  return (
    <div className="space-y-4">
      {/* KPI cards resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Alcance orgánico',  v: fmt(resumen.total_reach || 0),    color: 'text-green-400',   border: 'border-green-400/20',   bg: 'bg-green-400/5'  },
          { label: 'Alcance pago',      v: hasPago ? fmt(pagoAlcance) : '—', color: 'text-orange-400',  border: 'border-orange-400/20',  bg: 'bg-orange-400/5' },
          { label: 'Inversión paga',    v: hasPago ? fmtPesos(pagoGasto) : '—', color: 'text-violet-glow', border: 'border-violet-DEFAULT/20', bg: 'bg-violet-DEFAULT/5' },
          { label: 'Conv. pagas',       v: hasPago ? pagoConv : '—',         color: 'text-cyan-400',    border: 'border-cyan-400/20',    bg: 'bg-cyan-400/5'   },
        ].map(({ label, v, color, border, bg }) => (
          <div key={label} className={`rounded-xl border p-4 text-center ${bg} ${border}`}>
            <p className={`text-xl font-bold ${color}`}>{v}</p>
            <p className="text-slate-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {!hasPago && (
        <div className="bg-surface border border-orange-400/20 rounded-xl px-5 py-4 text-center">
          <p className="text-orange-400 text-sm font-medium">Sin campañas pagas en este período</p>
          <p className="text-slate-500 text-xs mt-1">Cambiá el rango de fechas o verificá que haya campañas activas con gasto en el período seleccionado.</p>
        </div>
      )}

      {/* Gráfico comparativo */}
      {hasPago && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-1">Orgánico vs. Pago</h3>
          <p className="text-slate-500 text-xs mb-4">Comparativa de alcance e interacciones en el período seleccionado</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
              <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={40} />
              <Tooltip contentStyle={{ background: '#1A1D2E', border: '1px solid #2A2D3A', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94A3B8' }} />
              <Bar dataKey="Orgánico" fill="#22C55E" radius={[4,4,0,0]} />
              <Bar dataKey="Pago"     fill="#FF6B00" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Orgánico — sin inversión</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Pago — {fmtPesos(pagoGasto)} invertidos</span>
          </div>
        </div>
      )}

      {/* Desglose por campaña */}
      {hasPago && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-3">Campañas pagas del período</h3>
          <div className="space-y-2">
            {campaigns.map(c => (
              <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{c.nombre}</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">{c.objetivo}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-xs">
                  <div className="text-right">
                    <p className="text-slate-400 text-[10px]">Alcance</p>
                    <p className="text-white font-semibold">{fmt(c.impresiones || 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-[10px]">Gasto</p>
                    <p className="text-orange-400 font-semibold">{fmtPesos(c.gasto)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-[10px]">Conv.</p>
                    <p className="text-cyan-400 font-semibold">{c.conversaciones ?? '—'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Calendario de contenido ──────────────────────────────────────────────────
function CalendarioView({ posts }) {
  if (!posts?.length) return <EmptyTab text="Sin publicaciones en este período" sub="Probá ampliar el rango de fechas para ver el calendario de contenido." />

  // Agrupar por semana
  const byWeek = {}
  posts.forEach(p => {
    const d = new Date(p.fecha + 'T00:00:00')
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d)
    monday.setDate(diff)
    const key = monday.toISOString().slice(0, 10)
    if (!byWeek[key]) byWeek[key] = []
    byWeek[key].push(p)
  })

  const weeks = Object.entries(byWeek).sort(([a], [b]) => b.localeCompare(a)).slice(0, 4)

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="text-white font-semibold text-sm mb-1">Calendario de publicaciones</h3>
      <p className="text-slate-500 text-xs mb-4">Posts por semana — actividad reciente</p>
      <div className="space-y-4">
        {weeks.map(([weekStart, wPosts]) => {
          const fecha = new Date(weekStart + 'T00:00:00')
          const label = `Semana del ${fecha.getDate()}/${fecha.getMonth()+1}`
          return (
            <div key={weekStart}>
              <p className="text-slate-400 text-xs font-medium mb-2">{label} — {wPosts.length} posts</p>
              <div className="flex flex-wrap gap-2">
                {wPosts.map(p => {
                  const fc = formatoConfig[p.formato]
                  const FmtIcon = fc?.icon || Image
                  const bc = badgeConfig[p.badge]
                  return (
                    <div key={p.id} title={p.tema}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-default ${
                        p.badge === 'ganador' ? 'bg-green-400/10 border-green-400/20 text-green-300' :
                        p.badge === 'bueno'   ? 'bg-blue-400/10  border-blue-400/20  text-blue-300'  :
                        'bg-bg border-border text-slate-400'
                      }`}>
                      <FmtIcon size={11} className={fc?.color} />
                      <span className="max-w-28 truncate">{p.tema.slice(0, 22)}</span>
                      {p.badge === 'ganador' && <Star size={9} className="text-green-400 shrink-0" />}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Organico() {
  const { selected: account } = useAccount()
  const [dateRange, setDateRange]   = useState({ days: 30, since: null, until: null })
  const [formato, setFormato]       = useState('todos')
  const [plataforma, setPlataforma] = useState('todas')
  const [vista, setVista]           = useState('ranking')

  const { data, loading, error, refetch } = useFetch(
    () => organicAPI.posts(dateRange.days, dateRange.since, dateRange.until, account?.id, formato, plataforma),
    [dateRange, account?.id, formato, plataforma]
  )

  // Perfil de marca para el generador de copies
  const { data: perfil } = useFetch(() => brandAPI.get().catch(() => null), [])

  // Campañas pagas para comparativa orgánico vs pago
  const { data: campaigns } = useFetch(
    () => campaignsAPI.list(dateRange.days, dateRange.since, dateRange.until, account?.id).catch(() => []),
    [dateRange, account?.id]
  )

  if (loading) return <PageLoading />
  if (error) {
    const esFaltaConfig = error?.includes?.('Configurá') || error?.includes?.('page') || error?.includes?.('422')
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="bg-surface border border-border rounded-2xl px-8 py-8 max-w-md w-full text-center space-y-4">
          <p className="text-orange-400 font-semibold text-sm">Error al cargar datos</p>
          <p className="text-slate-400 text-sm leading-relaxed">{error}</p>
          {esFaltaConfig && (
            <p className="text-slate-500 text-xs">
              Abrí <span className="text-violet-glow font-medium">Gestionar cuentas</span> en el sidebar,
              hacé clic en el ⚙ de esta cuenta y completá el <span className="text-blue-400">ID de Página de Facebook</span> y/o
              el <span className="text-pink-400">ID de cuenta de Instagram Business</span>.
            </p>
          )}
          <button onClick={refetch}
            className="mt-2 px-4 py-2 border border-border rounded-lg text-slate-400 hover:text-white hover:border-slate-500 cursor-pointer transition-colors text-xs">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const { posts = [], resumen = {}, ganadores = [], por_formato = {}, por_plataforma = {} } = data || {}

  const periodoLabel = dateRange.since && dateRange.until
    ? `${dateRange.since} → ${dateRange.until}`
    : `últimos ${dateRange.days} días`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-white text-2xl font-bold">Contenido Orgánico</h1>
        <p className="text-slate-400 text-sm mt-1">{posts.length} posts · {periodoLabel}</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <DateRangePicker
          days={dateRange.days}
          since={dateRange.since}
          until={dateRange.until}
          onChange={setDateRange}
          extraButtons={[7, 14, 30, 60, 90]}
        />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {/* Filtro red */}
        <div className="flex gap-1">
          {FILTROS_RED.map(f => {
            const cfg = plataformaConfig[f.value]
            const Icon = cfg?.icon
            return (
              <button key={f.value} onClick={() => setPlataforma(f.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  plataforma === f.value
                    ? (cfg ? `${cfg.bg} ${cfg.color}` : 'bg-violet-DEFAULT/20 border-violet-DEFAULT/50 text-violet-glow')
                    : 'border-border text-slate-400 hover:text-white'
                }`}>
                {Icon && <Icon size={11} />}
                {f.label}
              </button>
            )
          })}
        </div>
        <span className="text-border">|</span>
        {/* Filtro formato */}
        <div className="flex gap-1">
          {FILTROS_FORMATO.map(f => (
            <button key={f.value} onClick={() => setFormato(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                formato === f.value
                  ? 'bg-violet-DEFAULT/20 border-violet-DEFAULT/50 text-violet-glow'
                  : 'border-border text-slate-400 hover:text-white'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <ResumenKPIs resumen={resumen} porFormato={por_formato} />

      {/* Tabs de vista */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'ranking',     label: 'Ranking de posts' },
          { id: 'calendario',  label: 'Calendario' },
          { id: 'redes',       label: 'Instagram vs Facebook' },
          { id: 'comparativa', label: 'Orgánico vs Pago' },
          { id: 'formatos',    label: 'Por formato' },
        ].map(t => (
          <button key={t.id} onClick={() => setVista(t.id)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              vista === t.id
                ? 'border-violet-DEFAULT text-white'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="bg-surface border border-border rounded-xl px-6 py-12 text-center">
          <p className="text-slate-400 text-sm">Sin posts para este período o formato</p>
          <p className="text-slate-400 text-xs mt-2">Probá con un rango más amplio o seleccioná "Todos" en el filtro de formato.</p>
        </div>
      )}

      {/* Vista: Ranking */}
      {vista === 'ranking' && posts.length > 0 && (
        <div className="space-y-6">
          {ganadores.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg border bg-green-400/5 border-green-400/20">
                <Star size={13} className="text-green-400" />
                <p className="text-green-400 text-xs font-semibold">Ganadores — replicar y crear variaciones</p>
                <span className="text-slate-400 text-xs">— {ganadores.length} posts con engagement excepcional</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {ganadores.map(p => <PostCard key={p.id} post={p} perfil={perfil} isGanador nombreCuenta={account?.nombre} />)}
              </div>
            </div>
          )}

          {posts.filter(p => p.badge !== 'ganador').length > 0 && (
            <div>
              <p className="text-slate-400 text-xs font-medium mb-3">Todos los posts</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {posts.filter(p => p.badge !== 'ganador').map(p => <PostCard key={p.id} post={p} perfil={perfil} isGanador={false} nombreCuenta={account?.nombre} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vista: Calendario */}
      {vista === 'calendario' && <CalendarioView posts={posts} />}

      {/* Vista: Instagram vs Facebook */}
      {vista === 'redes' && <PorPlataformaView porPlataforma={por_plataforma} />}

      {/* Vista: Comparativa */}
      {vista === 'comparativa' && <ComparativaOrgPago resumen={resumen} campaigns={campaigns || []} />}

      {/* Vista: Por formato */}
      {vista === 'formatos' && posts.length > 0 && <FormatoChart porFormato={por_formato} />}
    </div>
  )
}
