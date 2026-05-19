import { useState } from 'react'
import { ChevronRight, ChevronDown, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import AdRow from './AdRow'

const semaforo = {
  verde:    { icon: CheckCircle,   color: 'text-green-400',  bg: 'bg-green-400/8 border-green-400/20',  label: 'Eficiente' },
  amarillo: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/8 border-yellow-400/20', label: 'Atención' },
  rojo:     { icon: XCircle,       color: 'text-red-400',    bg: 'bg-red-400/8 border-red-400/20',       label: 'Crítico' },
}

const fmt = (n) => n != null ? Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '—'

export default function AdSetRow({ adset, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const s = semaforo[adset.estado] || semaforo.amarillo
  const Icon = s.icon
  const Chevron = open ? ChevronDown : ChevronRight
  const hasAds = adset.ads?.length > 0

  const angleBadge = adset.adset_name?.includes('—')
    ? adset.adset_name.split('—').pop()?.trim()
    : null

  return (
    <div className="ml-5 space-y-1">
      <div
        onClick={() => hasAds && setOpen(o => !o)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${s.bg} ${hasAds ? 'cursor-pointer hover:brightness-110' : ''}`}
      >
        {hasAds
          ? <Chevron size={13} className="text-slate-500 shrink-0" />
          : <span className="w-3" />}
        <Icon size={14} className={`shrink-0 ${s.color}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-200 text-xs font-medium truncate">{adset.adset_name}</span>
            {angleBadge && (
              <span className="text-xs px-1.5 py-0.5 rounded border border-violet-DEFAULT/25 bg-violet-DEFAULT/10 text-violet-glow shrink-0">
                {angleBadge}
              </span>
            )}
          </div>
          <span className="text-slate-600 text-xs">{adset.ads?.length || 0} anuncios</span>
        </div>

        <div className="flex items-center gap-4 shrink-0 text-xs text-slate-500">
          {adset.cpa != null && (
            <div className="text-right">
              <p className={`font-semibold ${adset.estado === 'verde' ? 'text-green-400' : adset.estado === 'rojo' ? 'text-red-400' : 'text-slate-300'}`}>
                CPA ${fmt(adset.cpa)}
              </p>
              <p className="text-slate-600">{adset.conversiones} conv.</p>
            </div>
          )}
          <div className="text-right hidden sm:block">
            <p className="text-slate-400">CTR {adset.ctr}%</p>
            <p className="text-slate-600">Frec. {adset.frecuencia}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400">${fmt(adset.spend)}</p>
            <p className={`text-xs font-medium ${s.color}`}>{s.label}</p>
          </div>
        </div>
      </div>

      {open && hasAds && (
        <div className="space-y-1 pb-1">
          {adset.ads.map(ad => (
            <AdRow key={ad.ad_id} ad={ad} />
          ))}
        </div>
      )}
    </div>
  )
}
