import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

const semaforo = {
  verde:    { icon: CheckCircle,   color: 'text-green-400',  bg: 'bg-green-400/8 border-green-400/15' },
  amarillo: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/8 border-yellow-400/15' },
  rojo:     { icon: XCircle,       color: 'text-red-400',    bg: 'bg-red-400/8 border-red-400/15' },
}

const fmt = (n) => n != null ? Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '—'

export default function AdRow({ ad }) {
  const s = semaforo[ad.estado] || semaforo.amarillo
  const Icon = s.icon

  return (
    <div className={`ml-10 flex items-center gap-3 px-3 py-2 rounded-lg border ${s.bg} text-xs`}>
      <Icon size={13} className={`shrink-0 ${s.color}`} />
      <span className="text-slate-300 flex-1 truncate">{ad.ad_name}</span>
      <div className="flex items-center gap-4 shrink-0 text-slate-500">
        {ad.cpa != null && (
          <span className={ad.estado === 'verde' ? 'text-green-400 font-medium' : ''}>
            CPA ${fmt(ad.cpa)}
          </span>
        )}
        <span>CTR {ad.ctr}%</span>
        <span>{ad.conversiones} conv.</span>
        <span className="text-slate-600">${fmt(ad.spend)}</span>
      </div>
    </div>
  )
}
