import { useState } from 'react'
import { ChevronRight, ChevronDown, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { campaignsAPI } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { PageLoading, ErrorState } from '../components/LoadingState'
import { useAccount } from '../context/AccountContext'
import AdSetRow from '../components/AdSetRow'

const PERIODS = [
  { label: 'Hoy', days: 1 },
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
]

const semaforo = {
  verde:    { icon: CheckCircle,   color: 'text-green-400',  label: 'Saludable' },
  amarillo: { icon: AlertTriangle, color: 'text-yellow-400', label: 'Atención' },
  rojo:     { icon: XCircle,       color: 'text-red-400',    label: 'Crítico' },
}

const fmt = (n) => n != null ? Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '—'

function CampaignRow({ campaign }) {
  const [open, setOpen] = useState(false)
  const s = semaforo[campaign.estado] || semaforo.amarillo
  const Chevron = open ? ChevronDown : ChevronRight

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/3 transition-colors"
      >
        <Chevron size={15} className="text-slate-500 shrink-0" />
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          campaign.estado === 'verde' ? 'bg-green-400' :
          campaign.estado === 'rojo'  ? 'bg-red-400'   : 'bg-yellow-400'
        }`} />

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{campaign.campaign_name}</p>
          <p className="text-slate-600 text-xs">
            {campaign.n_adsets} conjuntos · {campaign.n_ads} anuncios
            {campaign.objective && ` · ${campaign.objective.replace('OUTCOME_', '')}`}
          </p>
        </div>

        <div className="flex items-center gap-5 shrink-0 text-xs">
          {campaign.cpa != null && (
            <div className="text-right hidden sm:block">
              <p className="text-slate-300 font-semibold">CPA ${fmt(campaign.cpa)}</p>
              <p className="text-slate-600">{campaign.conversiones} conv.</p>
            </div>
          )}
          <div className="text-right hidden md:block">
            <p className="text-slate-400">CTR {campaign.ctr}%</p>
          </div>
          <div className="text-right">
            <p className="text-slate-300 font-medium">${fmt(campaign.spend)}</p>
            <p className={`text-xs font-medium ${s.color}`}>{s.label}</p>
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-bg px-3 py-3 space-y-2">
          {(!campaign.adsets || campaign.adsets.length === 0) && (
            <p className="text-slate-600 text-xs text-center py-3">Sin conjuntos con datos en el período</p>
          )}
          {campaign.adsets?.map(adset => (
            <AdSetRow key={adset.adset_id} adset={adset} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Campanas() {
  const { selected: account } = useAccount()
  const [days, setDays] = useState(30)

  const { data, loading, error, refetch } = useFetch(
    () => campaignsAPI.tree(days, account?.id),
    [days, account?.id]
  )

  if (loading) return <PageLoading />
  if (error)   return <ErrorState message={error} onRetry={refetch} />

  const tree = data?.tree || []
  const totales = tree.reduce((acc, c) => ({
    spend:        acc.spend        + (c.spend        || 0),
    conversiones: acc.conversiones + (c.conversiones || 0),
    adsets:       acc.adsets       + (c.n_adsets     || 0),
    ads:          acc.ads          + (c.n_ads         || 0),
  }), { spend: 0, conversiones: 0, adsets: 0, ads: 0 })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-white text-2xl font-bold">Campañas</h1>
        <p className="text-slate-400 text-sm mt-1">
          {tree.length} campañas · {totales.adsets} conjuntos · {totales.ads} anuncios
        </p>
      </div>

      <div className="flex gap-2">
        {PERIODS.map(p => (
          <button key={p.days} onClick={() => setDays(p.days)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
              ${days === p.days
                ? 'bg-violet-DEFAULT/20 text-violet-glow border border-violet-DEFAULT/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Inversión total',  value: `$${fmt(totales.spend)}` },
          { label: 'Conversaciones',   value: fmt(totales.conversiones) },
          { label: 'CPA promedio',     value: totales.conversiones > 0 ? `$${fmt(totales.spend / totales.conversiones)}` : '—' },
        ].map(k => (
          <div key={k.label} className="bg-surface border border-border rounded-xl px-4 py-3 text-center">
            <p className="text-slate-500 text-xs">{k.label}</p>
            <p className="text-white font-bold text-lg mt-0.5">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {tree.length === 0 && (
          <div className="text-center py-16 text-slate-600 text-sm">
            Sin campañas activas en el período seleccionado.
          </div>
        )}
        {tree.map(campaign => (
          <CampaignRow key={campaign.campaign_id} campaign={campaign} />
        ))}
      </div>
    </div>
  )
}
