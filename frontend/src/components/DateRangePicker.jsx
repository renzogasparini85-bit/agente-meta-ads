import { useState } from 'react'
import { Calendar } from 'lucide-react'

const RAPIDOS_DEFAULT = [
  { label: 'Hoy',     days: 1 },
  { label: '7d',      days: 7 },
  { label: '30d',     days: 30 },
  { label: '60d',     days: 60 },
]

const ALL_DAYS = { 1: 'Hoy', 7: '7d', 14: '14d', 30: '30d', 60: '60d', 90: '90d' }

const inputCls = "bg-bg border border-border rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-violet-DEFAULT/60 transition-colors cursor-pointer"

export default function DateRangePicker({ days, since, until, onChange, extraButtons }) {
  const RAPIDOS = extraButtons
    ? extraButtons.map(d => ({ label: ALL_DAYS[d] || `${d}d`, days: d }))
    : RAPIDOS_DEFAULT
  const [custom, setCustom] = useState(false)
  const [desde, setDesde] = useState(since || '')
  const [hasta, setHasta] = useState(until || '')

  const activoRapido = !custom && RAPIDOS.find(r => r.days === days)

  const aplicarCustom = () => {
    if (!desde || !hasta) return
    if (desde > hasta) return
    onChange({ days: null, since: desde, until: hasta })
    setCustom(true)
  }

  const handleRapido = (d) => {
    setCustom(false)
    setDesde('')
    setHasta('')
    onChange({ days: d, since: null, until: null })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Botones rápidos */}
      {RAPIDOS.map((r) => (
        <button
          key={r.days}
          onClick={() => handleRapido(r.days)}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activoRapido?.days === r.days
              ? 'bg-violet-DEFAULT/20 text-violet-glow border border-violet-DEFAULT/30'
              : 'text-slate-400 hover:text-white border border-border'
          }`}
        >
          {r.label}
        </button>
      ))}

      {/* Separador */}
      <span className="text-border">|</span>

      {/* Rango personalizado */}
      <div className="flex items-center gap-1.5">
        <Calendar size={13} className="text-slate-500" />
        <input
          type="date"
          value={desde}
          onChange={e => { setDesde(e.target.value); setCustom(false) }}
          className={inputCls}
        />
        <span className="text-slate-600 text-xs">→</span>
        <input
          type="date"
          value={hasta}
          onChange={e => { setHasta(e.target.value); setCustom(false) }}
          className={inputCls}
        />
        <button
          onClick={aplicarCustom}
          disabled={!desde || !hasta || desde > hasta}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
            custom
              ? 'bg-violet-DEFAULT/20 text-violet-glow border-violet-DEFAULT/30'
              : 'text-slate-400 hover:text-white border-border disabled:opacity-40'
          }`}
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}
