import { useState, useEffect } from 'react'
import { Calculator, TrendingUp, DollarSign } from 'lucide-react'

export default function BudgetSimulator({ kpis, moneda = 'ARS' }) {
  const cpaActual = kpis?.cpa?.value
  const convActuales = kpis?.conversaciones?.value || 0
  const gastoActual  = kpis?.gasto?.value || 0

  const [meta, setMeta] = useState(Math.ceil(convActuales * 1.5) || 20)

  useEffect(() => {
    setMeta(Math.ceil((convActuales || 0) * 1.5) || 20)
  }, [convActuales])

  if (!cpaActual) return null

  const gastoNecesario = Math.round(meta * cpaActual)
  const deltaPct = gastoActual > 0 ? Math.round(((gastoNecesario - gastoActual) / gastoActual) * 100) : null
  const fmt = (n) => n?.toLocaleString('es-AR', { maximumFractionDigits: 0 })

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={16} className="text-orange-DEFAULT" />
        <h2 className="text-white font-semibold text-sm">Simulador de presupuesto</h2>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Meta de conversaciones</span>
          <span className="text-white font-bold text-base">{meta}</span>
        </div>
        <input
          type="range"
          min={1}
          max={Math.max(convActuales * 5, 100)}
          value={meta}
          onChange={e => setMeta(Number(e.target.value))}
          className="w-full accent-violet-DEFAULT cursor-pointer"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>1</span>
          <span>{Math.max(convActuales * 5, 100)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg rounded-lg p-3 border border-border text-center">
          <p className="text-slate-500 text-xs mb-1">CPA actual</p>
          <p className="text-white font-bold">${fmt(cpaActual)}</p>
        </div>
        <div className="bg-bg rounded-lg p-3 border border-border text-center">
          <p className="text-slate-500 text-xs mb-1">Gasto actual</p>
          <p className="text-white font-bold">${fmt(gastoActual)}</p>
        </div>
        <div className="bg-violet-DEFAULT/10 border border-violet-DEFAULT/30 rounded-lg p-3 text-center">
          <p className="text-slate-400 text-xs mb-1">Gasto necesario</p>
          <p className="text-violet-glow font-bold">${fmt(gastoNecesario)}</p>
        </div>
      </div>

      {deltaPct !== null && (
        <p className={`text-xs mt-3 text-center font-medium ${deltaPct > 0 ? 'text-orange-DEFAULT' : 'text-green-400'}`}>
          {deltaPct > 0
            ? `Necesitás aumentar ${deltaPct}% el presupuesto para alcanzar ${meta} conversaciones`
            : `Con el presupuesto actual podés superar tu meta — bien calibrado`}
        </p>
      )}
    </div>
  )
}
