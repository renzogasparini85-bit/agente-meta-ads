import { useState } from 'react'
import { BarChart2, Flame, ArrowUpRight, Calendar, TrendingDown, TrendingUp, Zap, ExternalLink } from 'lucide-react'
import { analyticsAPI } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { PageLoading, ErrorState, Spinner } from '../components/LoadingState'
import { useAccount } from '../context/AccountContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const PERIODS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
]

const fatigueLevels = {
  critica:  { label: 'Crítica',  bg: 'bg-red-400/10 border-red-400/20',     text: 'text-red-400',    dot: '#ef4444' },
  moderada: { label: 'Moderada', bg: 'bg-orange-DEFAULT/10 border-orange-DEFAULT/20', text: 'text-orange-DEFAULT', dot: '#f97316' },
  leve:     { label: 'Leve',     bg: 'bg-yellow-400/10 border-yellow-400/20', text: 'text-yellow-400', dot: '#facc15' },
  ok:       { label: 'OK',       bg: 'bg-green-400/10 border-green-400/20',  text: 'text-green-400',  dot: '#22c55e' },
}

const potencialColors = {
  alto:  'bg-violet-DEFAULT/15 text-violet-glow border-violet-DEFAULT/20',
  medio: 'bg-blue-400/15 text-blue-400 border-blue-400/20',
}

// ── Weekday chart ──────────────────────────────────────────────────────────────

function WeekdayChart({ data }) {
  if (!data?.days?.length) return <p className="text-slate-500 text-sm text-center py-8">Sin datos suficientes</p>

  const maxGasto = Math.max(...data.days.map(d => d.gasto_prom))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data.days} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="dia" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false}
          tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
          labelStyle={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}
          formatter={(v, name) => {
            if (name === 'gasto_prom') return [`$${v.toLocaleString('es-AR')}`, 'Gasto prom.']
            if (name === 'conv_prom')  return [v.toFixed(1), 'Conv. prom.']
            return [v, name]
          }}
        />
        <Bar dataKey="gasto_prom" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.days.map((entry, i) => (
            <Cell key={i} fill={entry.gasto_prom === maxGasto ? '#7c3aed' : '#7c3aed44'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Fatiga card ────────────────────────────────────────────────────────────────

function FatigaCard({ ad }) {
  const lvl = fatigueLevels[ad.nivel_fatiga] || fatigueLevels.ok
  return (
    <div className={`border rounded-xl p-4 ${lvl.bg}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-white text-xs font-medium leading-snug flex-1 truncate">{ad.nombre}</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${lvl.bg} ${lvl.text}`}>
          {lvl.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-slate-500 text-xs">CTR actual</p>
          <p className="text-white font-bold text-sm">{ad.ctr_actual}%</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">vs semana ant.</p>
          <p className={`font-bold text-sm ${ad.ctr_variacion < 0 ? 'text-red-400' : 'text-green-400'}`}>
            {ad.ctr_variacion > 0 ? '+' : ''}{ad.ctr_variacion}%
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Frecuencia</p>
          <p className={`font-bold text-sm ${ad.frecuencia >= 2.5 ? 'text-red-400' : 'text-white'}`}>
            {ad.frecuencia}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <span className="text-slate-500 text-xs">{ad.dias_activo} días activo · ${ad.gasto_7d?.toLocaleString('es-AR')} últimos 7d</span>
        {ad.nivel_fatiga !== 'ok' && (
          <span className={`text-xs font-medium ${lvl.text}`}>Renovar copy</span>
        )}
      </div>
    </div>
  )
}

// ── Organic to Paid card ───────────────────────────────────────────────────────

function OrganicCard({ post, onGenerate }) {
  const pot = potencialColors[post.potencial] || potencialColors.medio
  return (
    <div className="bg-surface border border-border rounded-xl p-4 hover:border-violet-DEFAULT/30 transition-all">
      <div className="flex items-start gap-3 mb-3">
        {post.thumbnail ? (
          <img src={post.thumbnail} className="w-14 h-14 rounded-lg object-cover shrink-0 bg-bg" alt="" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-bg border border-border shrink-0 flex items-center justify-center">
            <BarChart2 size={18} className="text-slate-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${pot}`}>{post.potencial}</span>
            <span className="text-slate-500 text-xs capitalize">{post.plataforma} · {post.formato}</span>
          </div>
          <p className="text-slate-300 text-xs leading-snug line-clamp-2">{post.caption || '(sin texto)'}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div>
          <p className="text-slate-500 text-xs">Engagement</p>
          <p className="text-white font-bold text-sm">{post.engagement_rate}%</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">vs promedio</p>
          <p className={`font-bold text-sm ${post.er_vs_promedio > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {post.er_vs_promedio > 0 ? '+' : ''}{post.er_vs_promedio.toFixed(1)}pp
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Likes</p>
          <p className="text-white font-bold text-sm">{post.likes}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <Zap size={12} className="text-violet-glow" />
          <span className="text-violet-glow text-xs font-medium">{post.angulo_sugerido}</span>
        </div>
        {post.ya_existe_paid && (
          <span className="text-xs text-slate-500">Ya tiene paid similar</span>
        )}
        {!post.ya_existe_paid && (
          <button
            onClick={() => onGenerate(post)}
            className="flex items-center gap-1 text-xs text-violet-glow font-medium hover:opacity-80 transition-opacity cursor-pointer"
          >
            Generar brief <ExternalLink size={10} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Analytics() {
  const { selected: account } = useAccount()
  const [days, setDays] = useState(30)
  const [tab, setTab] = useState('weekday')

  const weekday  = useFetch(() => analyticsAPI.weekday(days, account?.id),  [days, account?.id, tab === 'weekday'])
  const fatigue  = useFetch(() => analyticsAPI.fatigue(account?.id),         [account?.id, tab === 'fatigue'])
  const organic2 = useFetch(() => analyticsAPI.organicToPaid(days, account?.id), [days, account?.id, tab === 'organic'])

  const tabs = [
    { key: 'weekday', label: 'Días de la semana', icon: Calendar },
    { key: 'fatigue', label: 'Detector de fatiga', icon: Flame },
    { key: 'organic', label: 'Orgánico → Paid', icon: ArrowUpRight },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Análisis Avanzado</h1>
        <p className="text-slate-400 text-sm mt-1">Insights que los paneles nativos no muestran</p>
      </div>

      {/* Tabs + Period */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${tab === t.key ? 'bg-violet-DEFAULT/20 text-violet-glow' : 'text-slate-400 hover:text-white'}`}>
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>
        {tab !== 'fatigue' && (
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <button key={p.days} onClick={() => setDays(p.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${days === p.days ? 'bg-violet-DEFAULT/20 text-violet-glow border-violet-DEFAULT/30' : 'text-slate-400 hover:text-white border-transparent'}`}>
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Días de la semana ── */}
      {tab === 'weekday' && (
        weekday.loading ? <PageLoading /> :
        weekday.error   ? <ErrorState message={weekday.error} onRetry={weekday.refetch} /> :
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">Gasto promedio por día de la semana</h2>
            <WeekdayChart data={weekday.data} />
          </div>

          <div className="grid grid-cols-7 gap-2">
            {(weekday.data?.days || []).map((d) => {
              const maxC = Math.max(...(weekday.data?.days || []).map(x => x.conv_prom))
              const isTop = d.conv_prom === maxC
              return (
                <div key={d.dia}
                  className={`rounded-xl p-3 text-center border transition-all ${isTop ? 'bg-violet-DEFAULT/15 border-violet-DEFAULT/30' : 'bg-surface border-border'}`}>
                  <p className="text-xs text-slate-400 mb-1">{d.dia.slice(0, 3)}</p>
                  <p className={`font-bold text-sm ${isTop ? 'text-violet-glow' : 'text-white'}`}>
                    {d.conv_prom.toFixed(1)}
                  </p>
                  <p className="text-xs text-slate-600">conv</p>
                  {d.cpa && <p className="text-xs text-slate-500 mt-1">${Math.round(d.cpa)}</p>}
                </div>
              )
            })}
          </div>

          {weekday.data?.days && (() => {
            const sorted = [...weekday.data.days].sort((a, b) => b.conv_prom - a.conv_prom)
            const best = sorted[0]
            const worst = sorted[sorted.length - 1]
            return (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-400/10 border border-green-400/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={14} className="text-green-400" />
                    <span className="text-green-400 text-xs font-bold">Mejor día</span>
                  </div>
                  <p className="text-white font-bold">{best?.dia}</p>
                  <p className="text-slate-400 text-xs">{best?.conv_prom.toFixed(1)} conv. prom · ${best?.gasto_prom.toLocaleString('es-AR')} gasto</p>
                </div>
                <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown size={14} className="text-red-400" />
                    <span className="text-red-400 text-xs font-bold">Peor día</span>
                  </div>
                  <p className="text-white font-bold">{worst?.dia}</p>
                  <p className="text-slate-400 text-xs">{worst?.conv_prom.toFixed(1)} conv. prom · ${worst?.gasto_prom.toLocaleString('es-AR')} gasto</p>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* ── Detector de fatiga ── */}
      {tab === 'fatigue' && (
        fatigue.loading ? <PageLoading /> :
        fatigue.error   ? <ErrorState message={fatigue.error} onRetry={fatigue.refetch} /> :
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {['critica', 'moderada', 'leve', 'ok'].map(lvl => {
              const c = fatigueLevels[lvl]
              const n = (fatigue.data || []).filter(a => a.nivel_fatiga === lvl).length
              return (
                <div key={lvl} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${c.bg} ${c.text}`}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: c.dot, display: 'inline-block' }} />
                  {c.label} · {n}
                </div>
              )
            })}
          </div>

          {!fatigue.data?.length ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              No hay anuncios con suficiente gasto para analizar fatiga
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {fatigue.data.map(ad => <FatigaCard key={ad.ad_id} ad={ad} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Orgánico → Paid ── */}
      {tab === 'organic' && (
        organic2.loading ? <PageLoading /> :
        organic2.error   ? <ErrorState message={organic2.error} onRetry={organic2.refetch} /> :
        <div className="space-y-4">
          <div className="bg-violet-DEFAULT/5 border border-violet-DEFAULT/15 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className="text-violet-glow" />
              <span className="text-violet-glow font-semibold text-sm">Posts orgánicos con potencial paid</span>
            </div>
            <p className="text-slate-400 text-xs">
              Analizamos el engagement de tus posts y detectamos cuáles tienen mayor potencial para convertirse en anuncios pagos, con el ángulo sugerido por IA.
            </p>
          </div>

          {!organic2.data?.length ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              No hay posts orgánicos configurados o no superan el promedio de engagement.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {organic2.data.map(post => (
                <OrganicCard key={post.post_id} post={post}
                  onGenerate={(p) => {
                    // Navegar a Orgánico con el post seleccionado (futuro: deep link)
                    alert(`Ir a Orgánico y usar "Generar variación" en el post con ángulo: ${p.angulo_sugerido}`)
                  }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
