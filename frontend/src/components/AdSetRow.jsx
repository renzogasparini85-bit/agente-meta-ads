import { useState } from 'react'
import { ChevronRight, ChevronDown, CheckCircle, AlertTriangle, XCircle, Pause, Play, Loader2 } from 'lucide-react'
import AdRow from './AdRow'
import { campaignsAPI } from '../services/api'

const semaforo = {
  verde:    { icon: CheckCircle,   color: 'text-green-400',  bg: 'bg-green-400/8 border-green-400/20',  label: 'Eficiente' },
  amarillo: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/8 border-yellow-400/20', label: 'Atención' },
  rojo:     { icon: XCircle,       color: 'text-red-400',    bg: 'bg-red-400/8 border-red-400/20',       label: 'Crítico' },
}

const fmt = (n) => n != null ? Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '—'

export default function AdSetRow({ adset, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const [status, setStatus] = useState(adset.status || 'ACTIVE')
  const [loadingStatus, setLoadingStatus] = useState(false)
  const s = semaforo[adset.estado] || semaforo.amarillo
  const Icon = s.icon
  const Chevron = open ? ChevronDown : ChevronRight
  const hasAds = adset.ads?.length > 0

  const angleBadge = adset.adset_name?.includes('—')
    ? adset.adset_name.split('—').pop()?.trim()
    : null

  const anguloInsight = (() => {
    const frec = adset.frecuencia
    const ftir = adset.ftir
    if (!frec && !ftir) return null
    const partes = []
    if (ftir != null) {
      if (ftir >= 60) partes.push(`FTIR ${ftir}% — llegando a audiencia nueva (prospección)`)
      else if (ftir >= 35) partes.push(`FTIR ${ftir}% — audiencia mixta`)
      else partes.push(`FTIR ${ftir}% — mayormente retargeting`)
    }
    if (frec != null) {
      if (frec > 3) partes.push(`frecuencia ${frec} — riesgo de fatiga`)
      else if (frec > 2) partes.push(`frecuencia ${frec} — monitorear`)
      else partes.push(`frecuencia ${frec} — saludable`)
    }
    return partes.join(' · ')
  })()

  const toggleStatus = async (e) => {
    e.stopPropagation()
    setLoadingStatus(true)
    try {
      if (status === 'ACTIVE') {
        await campaignsAPI.pauseAdset(adset.adset_id)
        setStatus('PAUSED')
      } else {
        await campaignsAPI.activateAdset(adset.adset_id)
        setStatus('ACTIVE')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingStatus(false)
    }
  }

  return (
    <div className={`ml-5 space-y-1 ${status === 'PAUSED' ? 'opacity-70' : ''}`}>
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
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-slate-400 text-xs">{adset.ads?.length || 0} anuncios</span>
            {anguloInsight && (
              <span className="text-slate-500 text-[10px] truncate hidden sm:block">· {anguloInsight}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs text-slate-500">
          {status === 'PAUSED' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">PAUSADO</span>
          )}
          <button
            onClick={toggleStatus}
            disabled={loadingStatus}
            className="p-1 rounded hover:bg-slate-700/50 transition-colors text-slate-500 hover:text-slate-200 disabled:opacity-50"
            title={status === 'ACTIVE' ? 'Pausar conjunto' : 'Activar conjunto'}
          >
            {loadingStatus
              ? <Loader2 size={13} className="animate-spin" />
              : status === 'ACTIVE' ? <Pause size={13} /> : <Play size={13} />}
          </button>
          {adset.cpa != null && (
            <div className="text-right">
              <p className={`font-semibold ${adset.estado === 'verde' ? 'text-green-400' : adset.estado === 'rojo' ? 'text-red-400' : 'text-slate-300'}`}>
                CPA ${fmt(adset.cpa)}
              </p>
              <p className="text-slate-400">{adset.conversiones} conv.</p>
            </div>
          )}
          <div className="text-right hidden sm:block">
            <p className="text-slate-400">CTR {adset.ctr}%</p>
            <p className={`text-xs ${adset.frecuencia > 3 ? 'text-red-400' : adset.frecuencia > 2 ? 'text-yellow-400' : 'text-slate-400'}`}>
              Frec. {adset.frecuencia}
            </p>
          </div>
          {adset.ftir != null && (
            <div className="text-right hidden lg:block">
              <p className={`text-xs font-medium ${adset.ftir >= 60 ? 'text-green-400' : adset.ftir >= 35 ? 'text-yellow-400' : 'text-slate-400'}`}>
                FTIR {adset.ftir}%
              </p>
              <p className="text-slate-400 text-[10px]">{adset.ftir >= 60 ? 'Prospección' : adset.ftir >= 35 ? 'Mixto' : 'Retarg.'}</p>
            </div>
          )}
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
