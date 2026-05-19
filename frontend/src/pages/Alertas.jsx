import { AlertTriangle, RefreshCw, TrendingDown, DollarSign, Pause, CheckCheck, ScanSearch } from 'lucide-react'
import { alertsAPI } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { PageLoading, ErrorState, Spinner } from '../components/LoadingState'
import { useState } from 'react'
import { useAccount } from '../context/AccountContext'

const tipoConfig = {
  frecuencia: { icon: RefreshCw, color: 'text-yellow-400' },
  ctr_caida: { icon: TrendingDown, color: 'text-orange-DEFAULT' },
  cpa_alto: { icon: DollarSign, color: 'text-red-400' },
  sin_conversion: { icon: AlertTriangle, color: 'text-red-400' },
  pausa_auto: { icon: Pause, color: 'text-slate-400' },
}

const sevBadge = {
  alta: 'bg-red-400/15 text-red-400 border-red-400/20',
  media: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/20',
  baja: 'bg-slate-400/15 text-slate-400 border-slate-400/20',
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'hace menos de 1 hora'
  if (h < 24) return `hace ${h} hora${h > 1 ? 's' : ''}`
  const d = Math.floor(h / 24)
  return `hace ${d} día${d > 1 ? 's' : ''}`
}

export default function Alertas() {
  const { selected: account } = useAccount()
  const { data: alerts, loading, error, refetch } = useFetch(() => alertsAPI.list())
  const [resolving, setResolving] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState(null)

  const handleScan = async () => {
    setScanning(true)
    setScanMsg(null)
    try {
      const r = await alertsAPI.scanMe(account?.id)
      setScanMsg(r.alertas_nuevas > 0
        ? `${r.alertas_nuevas} alerta(s) nueva(s) detectada(s)`
        : 'Sin problemas nuevos detectados')
      refetch()
    } catch (e) {
      setScanMsg('Error al escanear')
    } finally {
      setScanning(false)
    }
  }

  const handleResolve = async (id) => {
    setResolving(id)
    try {
      await alertsAPI.resolve(id)
      refetch()
    } finally {
      setResolving(null)
    }
  }

  if (loading) return <PageLoading />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const activas = (alerts || []).filter(a => a.estado === 'activa')
  const resueltas = (alerts || []).filter(a => a.estado === 'resuelta')

  if (alerts?.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Alertas</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CheckCheck size={40} className="text-green-400 mb-3" />
          <p className="text-white font-medium">Sin alertas activas</p>
          <p className="text-slate-500 text-sm mt-1">El agente no detectó problemas en tus campañas.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Alertas</h1>
          <p className="text-slate-400 text-sm mt-1">{activas.length} activas · {resueltas.length} resueltas</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {activas.length > 0 && (
            <span className="bg-red-400/15 text-red-400 border border-red-400/20 text-sm font-bold px-3 py-1 rounded-full">
              {activas.length} sin resolver
            </span>
          )}
          <button onClick={handleScan} disabled={scanning}
            className="flex items-center gap-2 px-3 py-2 bg-surface border border-border text-slate-300 text-sm font-medium rounded-lg hover:border-violet-DEFAULT/40 hover:text-white transition-all disabled:opacity-60 cursor-pointer">
            {scanning ? <Spinner size={14} /> : <ScanSearch size={14} />}
            {scanning ? 'Analizando…' : 'Escanear ahora'}
          </button>
        </div>
      </div>

      {scanMsg && (
        <div className="px-4 py-2.5 rounded-lg border bg-violet-DEFAULT/10 border-violet-DEFAULT/20 text-violet-glow text-sm">
          {scanMsg}
        </div>
      )}

      {activas.length > 0 && (
        <div>
          <h2 className="text-white font-semibold text-sm mb-3">Activas</h2>
          <div className="space-y-3">
            {activas.map(a => {
              const t = tipoConfig[a.tipo] || tipoConfig.sin_conversion
              const Icon = t.icon
              return (
                <div key={a.id} className="bg-surface border border-border rounded-xl p-4 hover:border-violet-DEFAULT/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-bg flex items-center justify-center shrink-0">
                      <Icon size={17} className={t.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm leading-snug">{a.mensaje}</p>
                      <p className="text-slate-500 text-xs mt-1">{timeAgo(a.creado_en)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sevBadge[a.severidad] || sevBadge.baja}`}>
                        {a.severidad}
                      </span>
                      <button
                        onClick={() => handleResolve(a.id)}
                        disabled={resolving === a.id}
                        className="text-slate-500 hover:text-green-400 cursor-pointer transition-colors disabled:opacity-50"
                        title="Marcar como resuelta"
                      >
                        <CheckCheck size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {resueltas.length > 0 && (
        <div>
          <h2 className="text-slate-400 font-semibold text-sm mb-3">Resueltas</h2>
          <div className="space-y-2">
            {resueltas.map(a => {
              const t = tipoConfig[a.tipo] || tipoConfig.sin_conversion
              const Icon = t.icon
              return (
                <div key={a.id} className="bg-surface border border-border rounded-xl p-4 opacity-50">
                  <div className="flex items-center gap-4">
                    <Icon size={16} className={t.color} />
                    <p className="text-slate-400 text-sm flex-1 line-through">{a.mensaje}</p>
                    <span className="text-xs text-slate-600">{timeAgo(a.creado_en)}</span>
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
