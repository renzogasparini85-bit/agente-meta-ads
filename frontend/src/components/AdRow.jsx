import { useState } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Pause, Play, Loader2 } from 'lucide-react'
import { campaignsAPI } from '../services/api'

const semaforo = {
  verde:    { icon: CheckCircle,   color: 'text-green-400',  bg: 'bg-green-400/8 border-green-400/15' },
  amarillo: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/8 border-yellow-400/15' },
  rojo:     { icon: XCircle,       color: 'text-red-400',    bg: 'bg-red-400/8 border-red-400/15' },
}

const fmt = (n) => n != null ? Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '—'

export default function AdRow({ ad }) {
  const s = semaforo[ad.estado] || semaforo.amarillo
  const Icon = s.icon
  const [status, setStatus] = useState(ad.status || 'ACTIVE')
  const [loading, setLoading] = useState(false)

  const toggleStatus = async (e) => {
    e.stopPropagation()
    setLoading(true)
    try {
      if (status === 'ACTIVE') {
        await campaignsAPI.pauseAd(ad.ad_id)
        setStatus('PAUSED')
      } else {
        await campaignsAPI.activateAd(ad.ad_id)
        setStatus('ACTIVE')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`ml-10 flex items-center gap-3 px-3 py-2 rounded-lg border ${s.bg} text-xs ${status === 'PAUSED' ? 'opacity-60' : ''}`}>
      <Icon size={13} className={`shrink-0 ${s.color}`} />
      <span className="text-slate-300 flex-1 truncate">{ad.ad_name}</span>
      {status === 'PAUSED' && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 shrink-0">PAUSADO</span>
      )}
      <div className="flex items-center gap-4 shrink-0 text-slate-500">
        {ad.cpa != null && (
          <span className={ad.estado === 'verde' ? 'text-green-400 font-medium' : ''}>
            CPA ${fmt(ad.cpa)}
          </span>
        )}
        <span>CTR {ad.ctr}%</span>
        <span>{ad.conversiones} conv.</span>
        <span className="text-slate-400">${fmt(ad.spend)}</span>
        <button
          onClick={toggleStatus}
          disabled={loading}
          className="p-1 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-200 disabled:opacity-50"
          title={status === 'ACTIVE' ? 'Pausar anuncio' : 'Activar anuncio'}
        >
          {loading
            ? <Loader2 size={13} className="animate-spin" />
            : status === 'ACTIVE'
              ? <Pause size={13} />
              : <Play size={13} />}
        </button>
      </div>
    </div>
  )
}
