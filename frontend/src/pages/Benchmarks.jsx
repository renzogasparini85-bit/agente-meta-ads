import { useState } from 'react'
import { Award, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { analyticsAPI } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { PageLoading, ErrorState } from '../components/LoadingState'
import { useAccount } from '../context/AccountContext'
import api from '../services/api'

const benchmarksAPI = {
  get: (days, accountId) => {
    const p = new URLSearchParams({ days })
    if (accountId) p.set('account_id', accountId)
    return api.get(`/benchmarks?${p}`).then(r => r.data)
  }
}

const tierStyles = {
  top25:  { bg: 'bg-green-400/10 border-green-400/20',  text: 'text-green-400',   bar: '#22c55e' },
  top50:  { bg: 'bg-blue-400/10 border-blue-400/20',    text: 'text-blue-400',    bar: '#60a5fa' },
  top75:  { bg: 'bg-yellow-400/10 border-yellow-400/20',text: 'text-yellow-400',  bar: '#facc15' },
  bottom: { bg: 'bg-red-400/10 border-red-400/20',      text: 'text-red-400',     bar: '#ef4444' },
}

const PERIODS = [{ label: '7d', days: 7 }, { label: '30d', days: 30 }, { label: '60d', days: 60 }]

const metricLabels = {
  ctr:       { label: 'CTR', unit: '%', desc: 'Porcentaje de clics sobre impresiones', lowerIsBetter: false },
  cpc:       { label: 'CPC', unit: '$', desc: 'Costo por clic promedio', lowerIsBetter: true },
  frecuencia:{ label: 'Frecuencia', unit: 'x', desc: 'Veces que el mismo usuario vio el anuncio', lowerIsBetter: true },
  cpa:       { label: 'CPA', unit: '$', desc: 'Costo por conversión', lowerIsBetter: true },
}

function MetricCard({ name, data }) {
  if (!data) return null
  const cfg = metricLabels[name]
  const t = tierStyles[data.tier] || tierStyles.bottom
  const isUp = data.vs_mediana_pct > 0
  const isBetter = cfg.lowerIsBetter ? !isUp : isUp

  // Barra de posición dentro del rango sector
  const min = data.p25_sector * 0.7
  const max = data.p75_sector * 1.3
  const pct = Math.min(100, Math.max(0, ((data.valor - min) / (max - min)) * 100))
  const p25pct = Math.min(100, Math.max(0, ((data.p25_sector - min) / (max - min)) * 100))
  const p75pct = Math.min(100, Math.max(0, ((data.p75_sector - min) / (max - min)) * 100))

  return (
    <div className={`bg-surface border rounded-xl p-5 ${t.bg}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-slate-400 text-xs mb-0.5">{cfg.label}</p>
          <p className="text-white text-2xl font-bold">
            {cfg.unit === '$' ? '$' : ''}{data.valor.toLocaleString('es-AR', { maximumFractionDigits: 2 })}{cfg.unit !== '$' ? cfg.unit : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-lg">{data.icon}</span>
          <div className={`flex items-center gap-1 text-xs font-medium ${isBetter ? 'text-green-400' : 'text-red-400'}`}>
            {isBetter ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(data.vs_mediana_pct)}% vs mediana
          </div>
        </div>
      </div>

      <p className="text-slate-400 text-xs mb-4">{cfg.desc}</p>

      {/* Banda del sector */}
      <div className="relative h-3 bg-bg rounded-full mb-2">
        {/* Zona verde (p25–p75) */}
        <div className="absolute h-full rounded-full bg-green-400/20"
          style={{ left: `${Math.min(p25pct, p75pct)}%`, width: `${Math.abs(p75pct - p25pct)}%` }} />
        {/* Mediana */}
        <div className="absolute h-full w-0.5 bg-slate-500 rounded-full"
          style={{ left: `${(p25pct + p75pct) / 2}%` }} />
        {/* Tu valor */}
        <div className="absolute w-3 h-3 rounded-full border-2 border-white top-0 -translate-x-1/2 -translate-y-0"
          style={{ left: `${pct}%`, backgroundColor: t.bar }} />
      </div>

      <div className="flex justify-between text-xs text-slate-600">
        <span>P25: {cfg.unit === '$' ? '$' : ''}{data.p25_sector}</span>
        <span className="text-slate-400">Mediana: {cfg.unit === '$' ? '$' : ''}{data.mediana_sector}</span>
        <span>P75: {cfg.unit === '$' ? '$' : ''}{data.p75_sector}</span>
      </div>

      <p className={`text-xs font-medium mt-3 ${t.text}`}>{data.descripcion}</p>
    </div>
  )
}

export default function Benchmarks() {
  const { selected: account } = useAccount()
  const [days, setDays] = useState(30)
  const { data, loading, error, refetch } = useFetch(
    () => benchmarksAPI.get(days, account?.id),
    [days, account?.id]
  )

  if (loading) return <PageLoading />
  if (error)   return <ErrorState message={error} onRetry={refetch} />

  const metricas = data?.metricas || {}
  const topCount = Object.values(metricas).filter(m => m?.tier === 'top25').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award size={18} className="text-violet-glow" />
            <h1 className="text-white text-2xl font-bold">Benchmarks del sector</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Tus métricas vs. el promedio de Argentina · Objetivo: <span className="text-white font-medium">{data?.objetivo_label}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button key={p.days} onClick={() => setDays(p.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${days === p.days ? 'bg-violet-DEFAULT/20 text-violet-glow border-violet-DEFAULT/30' : 'text-slate-400 hover:text-white border-transparent'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen global */}
      <div className="bg-gradient-to-br from-violet-DEFAULT/10 to-violet-DEFAULT/5 border border-violet-DEFAULT/20 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm mb-1">Posición general en el sector</p>
            <p className="text-white text-xl font-bold">
              {topCount} de {Object.values(metricas).filter(Boolean).length} métricas en Top 25%
            </p>
          </div>
          <div className="text-5xl">
            {topCount >= 3 ? '🏆' : topCount >= 2 ? '✅' : topCount >= 1 ? '⚠️' : '🔴'}
          </div>
        </div>
      </div>

      {/* Cards por métrica */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(metricas).map(([key, val]) => (
          <MetricCard key={key} name={key} data={val} />
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="text-slate-500 text-xs leading-relaxed">
          Benchmarks basados en promedios del mercado argentino 2024-2025 para el objetivo <strong className="text-slate-300">{data?.objetivo_label}</strong>.
          Las bandas P25–P75 representan el rango donde opera el 50% central del mercado.
          Tu posición en verde indica rendimiento superior al promedio.
        </p>
      </div>
    </div>
  )
}
