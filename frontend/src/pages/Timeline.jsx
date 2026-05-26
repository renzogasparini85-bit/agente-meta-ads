import { Pause, PlusCircle, Copy, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react'
import { actionLogAPI } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { PageLoading, ErrorState } from '../components/LoadingState'

const tipoConfig = {
  pause:           { icon: Pause,      color: 'text-orange-DEFAULT', bg: 'bg-orange-DEFAULT/10 border-orange-DEFAULT/20', label: 'Pausa' },
  budget_change:   { icon: TrendingUp, color: 'text-green-400',      bg: 'bg-green-400/10 border-green-400/20',           label: 'Presupuesto' },
  duplicate:       { icon: Copy,       color: 'text-blue-400',       bg: 'bg-blue-400/10 border-blue-400/20',             label: 'Duplicar' },
  create_campaign: { icon: PlusCircle, color: 'text-violet-glow',    bg: 'bg-violet-DEFAULT/10 border-violet-DEFAULT/20', label: 'Campaña' },
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export default function Timeline() {
  const { data, loading, error, refetch } = useFetch(() => actionLogAPI.list(100))

  if (loading) return <PageLoading />
  if (error)   return <ErrorState message={error} onRetry={refetch} />

  const empty = !data || data.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Historial de acciones</h1>
        <p className="text-slate-400 text-sm mt-1">Registro de cambios ejecutados desde el panel</p>
      </div>

      {empty ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Clock size={40} className="text-slate-400 mb-4" />
          <p className="text-white font-medium mb-1">Sin acciones registradas</p>
          <p className="text-slate-500 text-sm">Las pausas, escaladas y cambios de presupuesto aparecerán acá.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Línea vertical */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-3">
            {data.map((log) => {
              const t = tipoConfig[log.tipo] || tipoConfig.pause
              const Icon = t.icon
              const ok = log.resultado === 'ok'
              return (
                <div key={log.id} className="flex gap-4 relative">
                  {/* Dot */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border z-10 ${t.bg}`}>
                    <Icon size={16} className={t.color} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-surface border border-border rounded-xl p-4 hover:border-violet-DEFAULT/30 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${t.bg} ${t.color}`}>
                          {t.label}
                        </span>
                        {ok
                          ? <CheckCircle size={12} className="text-green-400" />
                          : <XCircle size={12} className="text-red-400" />}
                      </div>
                      <span className="text-slate-400 text-xs shrink-0">{fmtDate(log.ejecutado_en)}</span>
                    </div>
                    <p className="text-slate-300 text-sm">{log.descripcion}</p>
                    {log.meta_id && (
                      <p className="text-slate-400 text-xs mt-1">ID: {log.meta_id}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
