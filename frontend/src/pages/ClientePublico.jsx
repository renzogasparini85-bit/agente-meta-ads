/**
 * Vista pública de solo lectura para el cliente final.
 * Acceso: /cliente?token=<view_token>
 * No requiere login — el token lleva la identidad.
 */
import { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle, MessageCircle, DollarSign, TrendingUp, Sparkles } from 'lucide-react'
import api from '../services/api'

const estadoStyles = {
  ok:        { icon: CheckCircle,  color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20',  label: '✅ Todo en orden' },
  atencion:  { icon: AlertTriangle,color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20',label: '⚠️ Hay puntos a revisar' },
  sin_datos: { icon: TrendingUp,   color: 'text-slate-400',  bg: 'bg-slate-400/10 border-slate-400/20',  label: 'Sin datos suficientes' },
}

const tipoColor = {
  escalar:  'text-green-400',
  pausar:   'text-red-400',
  replicar: 'text-blue-400',
  joya:     'text-orange-DEFAULT',
}

function fmt(n) {
  if (n == null) return '—'
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

export default function ClientePublico() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const token = new URLSearchParams(window.location.search).get('token')

  useEffect(() => {
    if (!token) { setError('Token no encontrado en la URL.'); setLoading(false); return }
    api.get(`/client-view/summary?view_token=${encodeURIComponent(token)}`)
      .then(r => setData(r.data))
      .catch(e => setError(e?.response?.data?.detail || 'Error al cargar el resumen'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-violet-DEFAULT/30 border-t-violet-DEFAULT rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-red-400 font-medium mb-2">No se pudo cargar el reporte</p>
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    </div>
  )

  const est = estadoStyles[data.estado] || estadoStyles.sin_datos
  const EstIcon = est.icon

  return (
    <div className="min-h-screen bg-bg font-sans">
      {/* Header */}
      <div className="bg-surface border-b border-border px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-DEFAULT to-violet-light flex items-center justify-center">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{data.marca}</p>
          <p className="text-slate-500 text-xs">Reporte publicitario · {data.periodo}</p>
        </div>
        <p className="ml-auto text-slate-400 text-xs">
          {new Date(data.generado_en).toLocaleDateString('es-AR', { day: '2-digit', month: 'long' })}
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Estado general */}
        <div className={`border rounded-2xl p-6 text-center ${est.bg}`}>
          <EstIcon size={40} className={`${est.color} mx-auto mb-3`} />
          <p className="text-white text-xl font-bold mb-1">{data.estado_label}</p>
          <p className="text-slate-400 text-sm">{data.periodo}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-violet-DEFAULT/15 flex items-center justify-center mx-auto mb-2">
              <DollarSign size={16} className="text-violet-glow" />
            </div>
            <p className="text-white text-xl font-bold">${fmt(data.kpis.gasto)}</p>
            <p className="text-slate-500 text-xs mt-1">Inversión</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-orange-DEFAULT/15 flex items-center justify-center mx-auto mb-2">
              <MessageCircle size={16} className="text-orange-DEFAULT" />
            </div>
            <p className="text-white text-xl font-bold">{fmt(data.kpis.conversaciones)}</p>
            <p className="text-slate-500 text-xs mt-1">Conversaciones</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-violet-DEFAULT/15 flex items-center justify-center mx-auto mb-2">
              <TrendingUp size={16} className="text-violet-glow" />
            </div>
            <p className="text-white text-xl font-bold">${fmt(data.kpis.cpa)}</p>
            <p className="text-slate-500 text-xs mt-1">CPA</p>
          </div>
        </div>

        {/* Campañas */}
        {data.campanas?.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">Rendimiento por campaña</h2>
            <div className="space-y-3">
              {data.campanas.map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                  <p className="text-slate-300 text-sm flex-1 truncate">{c.nombre}</p>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-white text-sm font-medium">{c.conversaciones}</p>
                      <p className="text-slate-400 text-xs">conv.</p>
                    </div>
                    {c.cpa && (
                      <div className="text-right">
                        <p className="text-white text-sm font-medium">${fmt(c.cpa)}</p>
                        <p className="text-slate-400 text-xs">CPA</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recomendaciones */}
        {data.recomendaciones?.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-violet-glow" />
              <h2 className="text-white font-semibold text-sm">Próximos pasos sugeridos</h2>
            </div>
            <div className="space-y-3">
              {data.recomendaciones.map((r, i) => (
                <div key={i} className="flex gap-3">
                  <span className={`text-sm font-bold shrink-0 mt-0.5 ${tipoColor[r.tipo] || 'text-slate-400'}`}>
                    {i + 1}.
                  </span>
                  <div>
                    <p className="text-white text-sm font-medium">{r.titulo}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{r.accion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-slate-400 text-xs">
          Reporte generado por Meta Ads AI · Datos de Meta Graph API
        </p>
      </div>
    </div>
  )
}
