import { useEffect, useState } from 'react'
import { healthAPI } from '../services/api'
import { useAccount } from '../context/AccountContext'
import { ShieldCheck, ShieldAlert, ShieldX, Shield } from 'lucide-react'

const colorMap = {
  green:  { ring: '#22c55e', glow: 'shadow-green-500/30',  text: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20',  icon: ShieldCheck },
  yellow: { ring: '#facc15', glow: 'shadow-yellow-500/30', text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', icon: ShieldAlert },
  orange: { ring: '#f97316', glow: 'shadow-orange-500/30', text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', icon: ShieldAlert },
  red:    { ring: '#ef4444', glow: 'shadow-red-500/30',    text: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/20',    icon: ShieldX   },
  gray:   { ring: '#64748b', glow: '',                     text: 'text-slate-400',  bg: 'bg-slate-400/10',  border: 'border-slate-400/20',  icon: Shield    },
}

function Arc({ score, color }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ * 0.75   // 270° arc
  const gap    = circ - filled
  const rotate = -225                            // start top-left

  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32">
      {/* Track */}
      <circle cx="60" cy="60" r={r} fill="none" stroke="#1e293b" strokeWidth="10"
        strokeDasharray={`${circ * 0.75} ${circ}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(${rotate} 60 60)`} />
      {/* Fill */}
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${filled} ${gap}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(${rotate} 60 60)`}
        style={{ transition: 'stroke-dasharray 1s ease' }} />
    </svg>
  )
}

export default function HealthScore({ days = 30 }) {
  const { selected: account } = useAccount()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    healthAPI.score(days, account?.id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [days, account?.id])

  if (loading) return (
    <div className="bg-surface border border-border rounded-xl p-5 flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-violet-DEFAULT/30 border-t-violet-DEFAULT rounded-full animate-spin" />
    </div>
  )

  if (!data) return null

  const c = colorMap[data.color] || colorMap.gray
  const Icon = c.icon

  return (
    <div className={`bg-surface border rounded-xl p-5 ${c.border}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className={c.text} />
        <h2 className="text-white font-semibold text-sm">Score de Salud</h2>
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full border ${c.bg} ${c.border} ${c.text}`}>
          {data.label}
        </span>
      </div>

      <div className="flex items-center gap-5">
        {/* Arc gauge */}
        <div className="relative shrink-0">
          <Arc score={data.score} color={c.ring} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-white text-2xl font-bold leading-none">{data.score}</span>
            <span className="text-slate-500 text-xs">/100</span>
          </div>
        </div>

        {/* Dimensiones */}
        <div className="flex-1 space-y-2">
          {Object.entries(data.dimensiones || {}).map(([key, dim]) => (
            <div key={key}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-slate-400">{dim.label}</span>
                <span className="text-slate-300 font-medium">{dim.score}</span>
              </div>
              <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${dim.score}%`,
                    backgroundColor: dim.score >= 70 ? '#22c55e' : dim.score >= 40 ? '#facc15' : '#ef4444',
                  }}
                />
              </div>
            </div>
          ))}
          <p className="text-slate-500 text-xs mt-1">{data.n_ads} anuncios analizados</p>
        </div>
      </div>

      {/* Insights */}
      {data.insights?.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {data.insights.map((ins, i) => (
            <p key={i} className="text-xs text-slate-400 leading-snug flex gap-2">
              <span className={`shrink-0 mt-0.5 ${c.text}`}>›</span>
              {ins}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
