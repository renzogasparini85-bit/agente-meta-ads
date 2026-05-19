import { useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { historyAPI } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { PageLoading, ErrorState } from '../components/LoadingState'
import DateRangePicker from '../components/DateRangePicker'
import { useAccount } from '../context/AccountContext'

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-xl p-3 shadow-xl">
      <p className="text-slate-400 text-xs mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-white font-semibold">
            {formatter ? formatter(p.name, p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function KPISummary({ rows }) {
  if (!rows?.length) return null
  const totalGasto = rows.reduce((s, r) => s + r.gasto, 0)
  const totalConv  = rows.reduce((s, r) => s + r.conversaciones, 0)
  const avgCTR     = rows.reduce((s, r) => s + r.ctr, 0) / rows.length
  const avgFreq    = rows.reduce((s, r) => s + r.frecuencia, 0) / rows.length
  const cpaTotal   = totalConv > 0 ? totalGasto / totalConv : null
  const maxGasto   = Math.max(...rows.map(r => r.gasto))
  const bestDay    = rows.find(r => r.gasto === maxGasto)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: 'Gasto total',      value: `$${totalGasto.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`, color: 'text-orange-400' },
        { label: 'Conversaciones',   value: totalConv,                                                               color: 'text-green-400'  },
        { label: 'CPA promedio',     value: cpaTotal ? `$${cpaTotal.toFixed(0)}` : '—',                            color: 'text-violet-glow' },
        { label: 'CTR promedio',     value: `${avgCTR.toFixed(2)}%`,                                               color: 'text-blue-400'   },
      ].map(k => (
        <div key={k.label} className="bg-surface border border-border rounded-xl px-4 py-3">
          <p className="text-slate-500 text-xs mb-1">{k.label}</p>
          <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
        </div>
      ))}
    </div>
  )
}

export default function Historial() {
  const { selected: account } = useAccount()
  const [dateRange, setDateRange] = useState({ days: 30, since: null, until: null })

  const { data, loading, error, refetch } = useFetch(
    () => historyAPI.get(dateRange.days, dateRange.since, dateRange.until, account?.id),
    [dateRange, account?.id]
  )

  if (loading) return <PageLoading />
  if (error)   return <ErrorState message={error} onRetry={refetch} />

  // Formatear fecha para el eje X
  const rows = (data || []).map(d => ({
    ...d,
    fecha: d.fecha?.slice(5), // MM-DD
  }))

  const periodoLabel = dateRange.since && dateRange.until
    ? `${dateRange.since} → ${dateRange.until}`
    : `últimos ${dateRange.days} días`

  const fmtMoney = (_, v) => `$${Number(v).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
  const fmtPct   = (_, v) => `${v}%`
  const fmtNum   = (_, v) => v

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Historial y tendencias</h1>
        <p className="text-slate-400 text-sm mt-1">{rows.length} días · {periodoLabel}</p>
      </div>

      <DateRangePicker
        days={dateRange.days}
        since={dateRange.since}
        until={dateRange.until}
        onChange={setDateRange}
        extraButtons={[7, 14, 30, 60, 90]}
      />

      <KPISummary rows={data} />

      {rows.length === 0 && (
        <div className="bg-surface border border-border rounded-xl px-6 py-12 text-center">
          <p className="text-slate-400 text-sm">Sin datos para este período</p>
          <p className="text-slate-600 text-xs mt-2">Meta tarda algunas horas en consolidar el reporte del día.</p>
        </div>
      )}

      {rows.length > 0 && (
        <>
          {/* Gasto + Conversaciones combinado */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-white font-semibold text-sm mb-1">Gasto diario vs. Conversaciones</h2>
            <p className="text-slate-500 text-xs mb-5">Inversión y resultados día a día</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rows} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
                <XAxis dataKey="fecha" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis yAxisId="gasto" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={52} />
                <YAxis yAxisId="conv" orientation="right" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<CustomTooltip formatter={(name, v) => name === 'Gasto' ? fmtMoney(name, v) : v} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
                <Bar yAxisId="gasto" dataKey="gasto" name="Gasto" fill="#FF6B00" opacity={0.8} radius={[3,3,0,0]} />
                <Line yAxisId="conv" type="monotone" dataKey="conversaciones" name="Conversaciones" stroke="#22C55E" strokeWidth={2} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CPA */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <h2 className="text-white font-semibold text-sm mb-1">CPA en el tiempo</h2>
              <p className="text-slate-500 text-xs mb-5">Costo por conversación diario</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={rows} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
                  <XAxis dataKey="fecha" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${v}`} width={55} />
                  <Tooltip content={<CustomTooltip formatter={fmtMoney} />} />
                  <Line type="monotone" dataKey="cpa" name="CPA" stroke="#8B5CF6" strokeWidth={2.5} dot={false}
                    activeDot={{ r: 5, fill: '#8B5CF6' }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* CTR */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <h2 className="text-white font-semibold text-sm mb-1">CTR diario</h2>
              <p className="text-slate-500 text-xs mb-5">Click-through rate promedio por día</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={rows} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
                  <XAxis dataKey="fecha" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}%`} width={40} />
                  <Tooltip content={<CustomTooltip formatter={fmtPct} />} />
                  <Line type="monotone" dataKey="ctr" name="CTR" stroke="#3B82F6" strokeWidth={2.5} dot={false}
                    activeDot={{ r: 5, fill: '#3B82F6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Frecuencia */}
            <div className="bg-surface border border-border rounded-xl p-5 lg:col-span-2">
              <h2 className="text-white font-semibold text-sm mb-1">Frecuencia diaria</h2>
              <p className="text-slate-500 text-xs mb-5">Veces que cada usuario vio el anuncio en promedio</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={rows} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" />
                  <XAxis dataKey="fecha" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} width={28} domain={[0, 4]} />
                  <Tooltip content={<CustomTooltip formatter={fmtNum} />} />
                  {/* Zona de alerta frecuencia alta */}
                  <Line type="monotone" dataKey="frecuencia" name="Frecuencia" stroke="#F59E0B" strokeWidth={2.5} dot={false}
                    activeDot={{ r: 5, fill: '#F59E0B' }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-slate-600 text-xs mt-2">Frecuencia &gt; 2.2 → riesgo de fatiga creativa. &gt; 3.0 → pausar anuncio.</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
