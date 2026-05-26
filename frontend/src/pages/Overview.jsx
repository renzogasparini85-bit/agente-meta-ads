import { useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, MessageCircle, Target, MousePointerClick, RefreshCw, AlertTriangle, CheckCircle, XCircle, Link, Copy, Check } from 'lucide-react'
import { dashboardAPI } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { PageLoading, ErrorState } from '../components/LoadingState'
import { useAccount } from '../context/AccountContext'
import { useAuth } from '../context/AuthContext'
import HealthScore from '../components/HealthScore'
import BudgetSimulator from '../components/BudgetSimulator'
import ExportCard from '../components/ExportCard'
import api from '../services/api'

const PERIODS = [
  { label: 'Hoy', days: 1 },
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
]

const semaforo = {
  verde:    { icon: CheckCircle,  color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20',  label: 'Saludable' },
  amarillo: { icon: AlertTriangle,color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20',label: 'Atención'  },
  rojo:     { icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20',      label: 'Crítico'   },
}

const kpiConfig = [
  { key: 'gasto',         label: 'Gasto total',    icon: DollarSign,        prefix: '$', color: 'violet' },
  { key: 'conversaciones',label: 'Conversaciones', icon: MessageCircle,     prefix: '',  color: 'orange' },
  { key: 'cpa',           label: 'CPA promedio',   icon: Target,            prefix: '$', color: 'violet' },
  { key: 'ctr',           label: 'CTR promedio',   icon: MousePointerClick, suffix: '%', color: 'orange' },
  { key: 'frecuencia',    label: 'Frecuencia',     icon: RefreshCw,         prefix: '',  color: 'violet' },
]

function fmt(val, prefix = '', suffix = '') {
  if (val == null) return '—'
  const n = typeof val === 'number' ? val.toLocaleString('es-AR', { maximumFractionDigits: 2 }) : val
  return `${prefix}${n}${suffix}`
}

function KPICard({ config, data }) {
  if (!data) return null
  const Icon = config.icon
  const isPositive = config.key === 'cpa' ? (data.change ?? 0) < 0 : (data.change ?? 0) > 0
  const isViolet = config.color === 'violet'
  return (
    <div className="bg-surface border border-border rounded-xl p-5 hover:border-violet-DEFAULT/40 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isViolet ? 'bg-violet-DEFAULT/15' : 'bg-orange-DEFAULT/15'}`}>
          <Icon size={18} className={isViolet ? 'text-violet-glow' : 'text-orange-DEFAULT'} />
        </div>
        {data.change != null && (
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isPositive ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
            {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(data.change)}%
          </span>
        )}
      </div>
      <p className="text-slate-400 text-xs mb-1">{config.label}</p>
      <p className="text-white text-2xl font-bold">
        {fmt(data.value, config.prefix || '', config.suffix || '')}
      </p>
      <p className="text-slate-400 text-xs mt-1">vs período anterior</p>
    </div>
  )
}

function ClientSharePanel({ account, kpis, campaigns }) {
  const [link, setLink] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const p = account?.id ? `?account_id=${account.id}` : ''
      const r = await api.get(`/client-view/token${p}`)
      setLink(r.data.link)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Link size={15} className="text-violet-glow" />
        <h2 className="text-white font-semibold text-sm">Vista para el cliente</h2>
      </div>
      <p className="text-slate-400 text-xs mb-4">
        Generá un link de solo lectura para compartir el resumen del mes con tu cliente.
        Sin login, sin datos técnicos — solo lo que importa.
      </p>
      {!link ? (
        <button onClick={handleGenerate} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-violet-DEFAULT text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer">
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Link size={14} />}
          {loading ? 'Generando…' : 'Generar link'}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input readOnly value={link}
            className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-slate-300 text-xs font-mono truncate" />
          <button onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border ${copied ? 'bg-green-400/10 border-green-400/20 text-green-400' : 'bg-surface border-border text-slate-300 hover:text-white'}`}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function Overview() {
  const { selected: account } = useAccount()
  const { client } = useAuth()
  const [days, setDays] = useState(30)
  const { data, loading, error, refetch } = useFetch(
    () => dashboardAPI.overview(days, account?.id),
    [days, account?.id]
  )

  if (loading) return <PageLoading />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const { kpis, campaigns } = data
  const activeAlerts = (campaigns || []).filter(c => c.estado === 'rojo').slice(0, 3)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Overview</h1>
        <p className="text-slate-400 text-sm mt-1">
          Últimos {days} días · <span className="text-violet-glow font-medium">{account?.nombre || 'Sin cuenta'}</span>
        </p>
      </div>

      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button key={p.days} onClick={() => setDays(p.days)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${days === p.days ? 'bg-violet-DEFAULT/20 text-violet-glow border border-violet-DEFAULT/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpiConfig.map(config => (
          <KPICard key={config.key} config={config} data={kpis?.[config.key]} />
        ))}
      </div>

      {/* Acciones rápidas */}
      <div className="flex items-center justify-end gap-3">
        <ExportCard
          marca={account?.nombre || client?.nombre || 'Cuenta'}
          periodo={`Últimos ${days} días`}
          kpis={kpis}
          topCreativos={(campaigns || []).slice(0, 3).map(c => ({
            nombre: c.nombre,
            badge: c.estado === 'verde' ? 'escalar' : c.estado === 'rojo' ? 'pausar' : 'retener',
            cpa: c.cpa,
            ctr: c.ctr,
            conversaciones: c.conversaciones,
          }))}
          moneda={client?.moneda || 'ARS'}
        />
      </div>

      {/* Score + Simulador */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HealthScore days={days} />
        <BudgetSimulator kpis={kpis} />
      </div>

      {/* Link cliente */}
      <ClientSharePanel account={account} kpis={kpis} campaigns={campaigns} />

      {/* Salud por campaña + Críticos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-white font-semibold text-sm mb-4">Salud por campaña</h2>
          <div className="space-y-3">
            {(campaigns || []).map((c) => {
              const s = semaforo[c.estado] || semaforo.amarillo
              const Icon = s.icon
              return (
                <div key={c.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${s.bg}`}>
                  <Icon size={16} className={s.color} />
                  <span className="text-white text-sm flex-1 truncate">{c.nombre}</span>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
                    {c.cpa && <p className="text-slate-400 text-xs">CPA ${c.cpa.toFixed(0)}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">Campañas críticas</h2>
            {activeAlerts.length > 0 && (
              <span className="bg-red-400/15 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
                {activeAlerts.length}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {activeAlerts.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">Sin campañas críticas</p>
            ) : activeAlerts.map((c) => (
              <div key={c.id} className="flex gap-3 p-3 bg-bg rounded-lg border border-border">
                <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-xs leading-snug">{c.nombre}</p>
                  <p className="text-slate-500 text-xs mt-1">
                    CPA ${c.cpa?.toFixed(0) || '—'} · Frecuencia {c.frecuencia}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
