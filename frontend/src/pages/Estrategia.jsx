import { useState } from 'react'
import { Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp, Sparkles, RotateCcw, Zap, Loader2, FileText, Download } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import { useAccount } from '../context/AccountContext'
import { PageLoading, ErrorState } from '../components/LoadingState'
import api from '../services/api'
import { strategyAPI } from '../services/api'

const PERIODS = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
]

const fmt = (n) => n != null ? Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '—'
const fmtDec = (n, d = 1) => n != null ? Number(n).toFixed(d) : '—'

// ── Semáforo de diversidad ────────────────────────────────────────
function SemaforoDiversidad({ data, umbrales = {} }) {
  const colors = {
    verde:     { bg: 'bg-green-400/10 border-green-400/30',  text: 'text-green-400',  icon: CheckCircle },
    amarillo:  { bg: 'bg-yellow-400/10 border-yellow-400/30', text: 'text-yellow-400', icon: AlertTriangle },
    rojo:      { bg: 'bg-red-400/10 border-red-400/30',      text: 'text-red-400',    icon: AlertTriangle },
    sin_datos: { bg: 'bg-surface border-border',              text: 'text-slate-400',  icon: Target },
  }
  const c = colors[data.estado] || colors.sin_datos
  const Icon = c.icon

  return (
    <div className={`rounded-2xl border p-5 ${c.bg}`}>
      <div className="flex items-start gap-3">
        <Icon size={20} className={`${c.text} shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className={`font-bold text-sm ${c.text}`}>Semáforo de Diversidad Creativa</p>
          <p className="text-slate-300 text-xs mt-1 leading-relaxed">{data.mensaje}</p>
          {data.pct_dominante != null && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${data.estado === 'rojo' ? 'bg-red-400' : data.estado === 'amarillo' ? 'bg-yellow-400' : 'bg-green-400'}`}
                  style={{ width: `${Math.min(data.pct_dominante, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${c.text}`}>{data.pct_dominante}%</span>
              <span className="text-slate-500 text-xs">umbral: {umbrales.diversidad_rojo ?? 60}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── KPI chip ─────────────────────────────────────────────────────
function KPIChip({ label, value, unit = '', good, warn, bad, tooltip }) {
  const color = bad ? 'text-red-400' : warn ? 'text-yellow-400' : good ? 'text-green-400' : 'text-slate-300'
  return (
    <div className="text-center" title={tooltip}>
      <p className="text-slate-500 text-[10px] uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}{unit}</p>
    </div>
  )
}

// ── Card de ángulo ────────────────────────────────────────────────
function AnguloCard({ angulo, rank, umbrales = {} }) {
  const cpmr_verde = umbrales.cpmr_verde ?? 3000
  const cpmr_rojo  = umbrales.cpmr_rojo  ?? 5000
  const hook_verde = umbrales.hook_verde  ?? 25
  const hook_rojo  = umbrales.hook_rojo   ?? 15
  const ctr_bueno  = umbrales.ctr_bueno   ?? 2
  const [open, setOpen] = useState(false)

  const señalColor = {
    rotar_urgente: 'text-red-400 bg-red-400/10 border-red-400/20',
    cpmr_alto:     'text-orange-400 bg-orange-400/10 border-orange-400/20',
    hook_bajo:     'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  }
  const señalLabel = {
    rotar_urgente: '🔴 Rotar urgente',
    cpmr_alto:     '🟠 CPMr alto',
    hook_bajo:     '🟡 Hook bajo',
  }

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/3 transition-colors cursor-pointer"
      >
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${rank === 0 ? 'bg-orange-500 text-white' : 'bg-border text-slate-400'}`}>
          {rank + 1}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{angulo.angulo}</p>
          <p className="text-slate-500 text-xs">{angulo.n_ads} anuncio{angulo.n_ads !== 1 ? 's' : ''} · ${fmt(angulo.total_spend)} gastados</p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {angulo.señal_rotacion && (
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${señalColor[angulo.señal_rotacion]}`}>
              {señalLabel[angulo.señal_rotacion]}
            </span>
          )}
          {/* CPMr */}
          {angulo.cpmr_promedio != null && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-500">CPMr</p>
              <p className={`text-xs font-bold ${angulo.cpmr_promedio > cpmr_rojo ? 'text-red-400' : angulo.cpmr_promedio > cpmr_verde ? 'text-yellow-400' : 'text-green-400'}`}>
                ${fmt(angulo.cpmr_promedio)}
              </p>
            </div>
          )}
          {/* Hook Rate */}
          {angulo.hook_rate_promedio != null && (
            <div className="text-right hidden md:block">
              <p className="text-[10px] text-slate-500">Hook Rate</p>
              <p className={`text-xs font-bold ${angulo.hook_rate_promedio < hook_rojo ? 'text-red-400' : angulo.hook_rate_promedio < hook_verde ? 'text-yellow-400' : 'text-green-400'}`}>
                {fmtDec(angulo.hook_rate_promedio)}%
              </p>
            </div>
          )}
          {/* CPA */}
          <div className="text-right">
            <p className="text-[10px] text-slate-500">CPA</p>
            <p className="text-xs font-bold text-slate-200">{angulo.cpa_promedio ? `$${fmt(angulo.cpa_promedio)}` : '—'}</p>
          </div>
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>

      {/* Detalle de ads */}
      {open && (
        <div className="border-t border-border">
          {/* Resumen de KPIs del ángulo */}
          <div className="grid grid-cols-4 gap-4 px-5 py-3 bg-bg border-b border-border">
            <KPIChip label="CPMr" value={angulo.cpmr_promedio ? `$${fmt(angulo.cpmr_promedio)}` : '—'}
              bad={angulo.cpmr_promedio > cpmr_rojo} warn={angulo.cpmr_promedio > cpmr_verde}
              good={angulo.cpmr_promedio != null && angulo.cpmr_promedio <= cpmr_verde}
              tooltip={`Costo por 1000 personas únicas. < $${cpmr_verde} = eficiente. > $${cpmr_rojo} = rotar urgente`} />
            <KPIChip label="Hook Rate" value={angulo.hook_rate_promedio != null ? `${fmtDec(angulo.hook_rate_promedio)}%` : '—'}
              bad={angulo.hook_rate_promedio != null && angulo.hook_rate_promedio < hook_rojo}
              warn={angulo.hook_rate_promedio != null && angulo.hook_rate_promedio < hook_verde}
              good={angulo.hook_rate_promedio != null && angulo.hook_rate_promedio >= hook_verde}
              tooltip={`% que vio al menos 25% del video. < ${hook_rojo}% = hook no engancha. > ${hook_verde}% = creativo potente`} />
            <KPIChip label="CTR prom." value={angulo.ctr_promedio != null ? `${fmtDec(angulo.ctr_promedio)}%` : '—'}
              good={angulo.ctr_promedio >= ctr_bueno} warn={angulo.ctr_promedio >= 1} bad={angulo.ctr_promedio < 1} />
            <KPIChip label="Conv. total" value={fmt(angulo.total_conv)}
              good={angulo.total_conv > 5} warn={angulo.total_conv > 0} />
          </div>

          {/* Lista de anuncios */}
          <div className="divide-y divide-border">
            {angulo.ads.map(ad => (
              <div key={ad.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-xs font-medium truncate">{ad.nombre}</p>
                  <p className="text-slate-400 text-[10px] font-mono">{ad.id}</p>
                </div>
                <div className="flex items-center gap-4 text-xs shrink-0">
                  <div className="text-right">
                    <p className="text-slate-500 text-[10px]">Gasto</p>
                    <p className="text-slate-300 font-medium">${fmt(ad.spend)}</p>
                  </div>
                  {ad.cpmr != null && (
                    <div className="text-right hidden sm:block">
                      <p className="text-slate-500 text-[10px]">CPMr</p>
                      <p className={`font-medium ${ad.cpmr > cpmr_rojo ? 'text-red-400' : ad.cpmr > cpmr_verde ? 'text-yellow-400' : 'text-green-400'}`}>
                        ${fmt(ad.cpmr)}
                      </p>
                    </div>
                  )}
                  {ad.hook_rate != null && (
                    <div className="text-right hidden md:block">
                      <p className="text-slate-500 text-[10px]">Hook</p>
                      <p className={`font-medium ${ad.hook_rate < hook_rojo ? 'text-red-400' : ad.hook_rate < hook_verde ? 'text-yellow-400' : 'text-green-400'}`}>
                        {fmtDec(ad.hook_rate)}%
                      </p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-slate-500 text-[10px]">CPA</p>
                    <p className="text-slate-300 font-medium">{ad.cpa ? `$${fmt(ad.cpa)}` : '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 text-[10px]">CTR</p>
                    <p className={`font-medium ${ad.ctr >= ctr_bueno ? 'text-green-400' : ad.ctr >= 1 ? 'text-yellow-400' : 'text-slate-400'}`}>
                      {fmtDec(ad.ctr)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Historial de decisiones ───────────────────────────────────────
function Historial({ acciones }) {
  const [open, setOpen] = useState(false)
  const visible = open ? acciones : acciones.slice(0, 5)

  const tipoConfig = {
    pause_campaign:    { label: 'Pausó campaña',  color: 'text-red-400',    bg: 'bg-red-400/10' },
    pause_ad:          { label: 'Pausó anuncio',  color: 'text-red-400',    bg: 'bg-red-400/10' },
    activate_campaign: { label: 'Activó campaña', color: 'text-green-400',  bg: 'bg-green-400/10' },
    scale_adset:       { label: 'Escaló adset',   color: 'text-green-400',  bg: 'bg-green-400/10' },
    create_campaign:   { label: 'Creó campaña',   color: 'text-violet-400', bg: 'bg-violet-400/10' },
  }

  if (!acciones?.length) return (
    <div className="text-center py-8 text-slate-400 text-xs">Sin acciones registradas aún</div>
  )

  return (
    <div className="space-y-2">
      {visible.map(a => {
        const cfg = tipoConfig[a.tipo] || { label: a.tipo, color: 'text-slate-400', bg: 'bg-slate-400/10' }
        const fecha = a.fecha ? new Date(a.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
        return (
          <div key={a.id} className="flex items-start gap-3 px-4 py-3 bg-bg border border-border rounded-xl">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
            <p className="text-slate-400 text-xs flex-1 leading-relaxed">{a.descripcion}</p>
            <p className="text-slate-400 text-[10px] shrink-0">{fecha}</p>
          </div>
        )
      })}
      {acciones.length > 5 && (
        <button onClick={() => setOpen(o => !o)}
          className="w-full text-slate-500 text-xs py-2 hover:text-white transition-colors cursor-pointer">
          {open ? '▲ Mostrar menos' : `▼ Ver ${acciones.length - 5} acciones más`}
        </button>
      )}
    </div>
  )
}

// ── Informe GEM ───────────────────────────────────────────────────
const SECCIONES_GEM = [
  { key: 'fase_aprendizaje',    label: 'Fase de Aprendizaje',      icon: TrendingUp },
  { key: 'fatiga_creativa',     label: 'Fatiga Creativa',          icon: RotateCcw  },
  { key: 'optimizacion_hook',   label: 'Optimización de Hook',     icon: Zap        },
  { key: 'escalamiento',        label: 'Escalamiento',             icon: TrendingUp },
  { key: 'diversidad_creativa', label: 'Diversidad Creativa',      icon: Sparkles   },
]

function InformeGEM({ informe, resumen }) {
  const estadoStyle = {
    verde:   { border: 'border-green-400/30',  bg: 'bg-green-400/8',  dot: 'bg-green-400',  label: 'OK' },
    amarillo:{ border: 'border-yellow-400/30', bg: 'bg-yellow-400/8', dot: 'bg-yellow-400', label: 'Atención' },
    rojo:    { border: 'border-red-400/30',    bg: 'bg-red-400/8',    dot: 'bg-red-400',    label: 'Acción requerida' },
  }

  return (
    <div className="space-y-4">
      {/* Resumen numérico */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-surface border border-border rounded-xl px-4 py-3">
        {[
          { label: 'Conv/sem',    val: resumen.total_conv ?? '—' },
          { label: 'CPA real',    val: resumen.cpa_real    ? `$${Number(resumen.cpa_real).toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '—' },
          { label: 'CPA obj',     val: resumen.cpa_objetivo ? `$${Number(resumen.cpa_objetivo).toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '—' },
          { label: 'CPMr prom',   val: resumen.avg_cpmr    ? `$${Number(resumen.avg_cpmr).toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '—' },
          { label: 'Hook Rate',   val: resumen.avg_hook_rate != null ? `${resumen.avg_hook_rate}%` : '—' },
          { label: 'Frecuencia',  val: resumen.avg_frecuencia ?? '—' },
        ].map(k => (
          <div key={k.label} className="text-center">
            <p className="text-slate-400 text-[10px] uppercase tracking-wide">{k.label}</p>
            <p className="text-white text-sm font-bold">{k.val}</p>
          </div>
        ))}
      </div>

      {/* 5 secciones */}
      <div className="space-y-3">
        {SECCIONES_GEM.map(({ key, label, icon: Icon }) => {
          const sec = informe[key]
          if (!sec) return null
          const s = estadoStyle[sec.estado] || estadoStyle.amarillo
          return (
            <div key={key} className={`rounded-xl border p-4 ${s.border} ${s.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                <Icon size={13} className="text-slate-400" />
                <p className="text-white font-semibold text-sm">{label}</p>
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.dot === 'bg-green-400' ? 'text-green-400' : s.dot === 'bg-yellow-400' ? 'text-yellow-400' : 'text-red-400'}`}>
                  {s.label}
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed mb-1.5">{sec.diagnostico}</p>
              <div className="bg-black/25 rounded-lg px-3 py-2.5 mt-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5 font-semibold">Instrucción</p>
                <p className="text-white text-xs font-medium leading-relaxed">{sec.instruccion}</p>
              </div>
              {sec.por_que && (
                <div className="mt-2.5 px-1">
                  <p className="text-[10px] text-violet-400 uppercase tracking-wide font-semibold mb-0.5">¿Por qué?</p>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{sec.por_que}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Exportar informe como PDF ─────────────────────────────────────
function exportarInformePDF(informe, resumen) {
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora  = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  const estadoColor = { verde: '#4ade80', amarillo: '#facc15', rojo: '#f87171' }
  const estadoLabel = { verde: 'OK', amarillo: 'Atención', rojo: 'Acción requerida' }
  const estadoBg    = { verde: '#052e16', amarillo: '#1c1408', rojo: '#1c0a0a' }
  const estadoBorder= { verde: '#166534', amarillo: '#854d0e', rojo: '#991b1b' }

  const secciones = [
    { key: 'fase_aprendizaje',    label: 'Fase de Aprendizaje' },
    { key: 'fatiga_creativa',     label: 'Fatiga Creativa' },
    { key: 'optimizacion_hook',   label: 'Optimización de Hook' },
    { key: 'escalamiento',        label: 'Escalamiento' },
    { key: 'diversidad_creativa', label: 'Diversidad Creativa' },
  ]

  const kpis = [
    { label: 'Conv/sem',   val: resumen.total_conv ?? '—' },
    { label: 'CPA real',   val: resumen.cpa_real    ? `$${Number(resumen.cpa_real).toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '—' },
    { label: 'CPA obj',    val: resumen.cpa_objetivo ? `$${Number(resumen.cpa_objetivo).toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '—' },
    { label: 'CPMr prom',  val: resumen.avg_cpmr    ? `$${Number(resumen.avg_cpmr).toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '—' },
    { label: 'Hook Rate',  val: resumen.avg_hook_rate != null ? `${resumen.avg_hook_rate}%` : '—' },
    { label: 'Frecuencia', val: resumen.avg_frecuencia ?? '—' },
  ]

  const seccionesHTML = secciones.map(({ key, label }) => {
    const sec = informe[key]
    if (!sec) return ''
    const color  = estadoColor[sec.estado]  || '#94a3b8'
    const lbl    = estadoLabel[sec.estado]  || sec.estado
    const bg     = estadoBg[sec.estado]     || '#111827'
    const border = estadoBorder[sec.estado] || '#374151'
    return `
      <div style="background:${bg};border:1px solid ${border};border-radius:12px;padding:20px;margin-bottom:16px;page-break-inside:avoid">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
          <span style="color:#fff;font-weight:700;font-size:15px">${label}</span>
          <span style="margin-left:auto;color:${color};font-size:11px;font-weight:700;background:${bg};border:1px solid ${border};padding:2px 10px;border-radius:20px">${lbl}</span>
        </div>
        <p style="color:#cbd5e1;font-size:13px;line-height:1.6;margin:0 0 14px">${sec.diagnostico}</p>
        <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:14px">
          <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin:0 0 6px">Instrucción</p>
          <p style="color:#fff;font-size:13px;font-weight:500;line-height:1.6;margin:0">${sec.instruccion}</p>
        </div>
        ${sec.por_que ? `
        <div style="margin-top:12px;padding:0 4px">
          <p style="color:#a78bfa;font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin:0 0 4px">¿Por qué?</p>
          <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0">${sec.por_que}</p>
        </div>` : ''}
      </div>`
  }).join('')

  const kpisHTML = kpis.map(k => `
    <div style="text-align:center;padding:8px 4px">
      <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 3px">${k.label}</p>
      <p style="color:#fff;font-size:16px;font-weight:700;margin:0">${k.val}</p>
    </div>`).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe GEM 2026 — ${fecha}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #111827; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; max-width: 820px; margin: 0 auto; }
    @media print {
      body { background: #fff; color: #111; padding: 20px; }
      .no-print { display: none !important; }
      @page { margin: 1.5cm; size: A4; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #1e293b">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span style="background:linear-gradient(135deg,#7c3aed,#a855f7);width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px">✦</span>
        <div>
          <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.08em">Meta Ads AI Platform</p>
          <h1 style="color:#fff;font-size:22px;font-weight:800;line-height:1.2">Informe de Acción Inmediata</h1>
          <p style="color:#a78bfa;font-size:13px;font-weight:600">Framework Andromeda / GEM 2026</p>
        </div>
      </div>
    </div>
    <div style="text-align:right">
      <p style="color:#94a3b8;font-size:12px">Generado el</p>
      <p style="color:#e2e8f0;font-size:14px;font-weight:600">${fecha} · ${hora}</p>
      <p style="color:#64748b;font-size:11px;margin-top:4px">Últimos 7 días</p>
    </div>
  </div>

  <!-- KPIs resumen -->
  <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;display:grid;grid-template-columns:repeat(6,1fr);gap:0;margin-bottom:28px;overflow:hidden">
    ${kpisHTML}
  </div>

  <!-- Secciones GEM -->
  ${seccionesHTML}

  <!-- Footer -->
  <div style="margin-top:32px;padding-top:20px;border-top:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center">
    <p style="color:#475569;font-size:11px">Meta Ads AI — Framework Andromeda/GEM 2026</p>
    <p style="color:#475569;font-size:11px">El creativo es el targeting.</p>
  </div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const win  = window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

// ── Componente principal ──────────────────────────────────────────
export default function Estrategia() {
  const { selected: account } = useAccount()
  const [days, setDays] = useState(30)
  const [informe, setInforme]       = useState(null)
  const [loadingInforme, setLoadingInforme] = useState(false)
  const [errorInforme, setErrorInforme]     = useState(null)

  const { data, loading, error, refetch } = useFetch(
    () => api.get(`/strategy/overview?days=${days}${account?.id ? `&account_id=${account.id}` : ''}`).then(r => r.data),
    [days, account?.id]
  )

  const handleGenerarInforme = async () => {
    setLoadingInforme(true)
    setErrorInforme(null)
    setInforme(null)
    try {
      const res = await strategyAPI.informe(account?.id)
      setInforme(res)
    } catch (e) {
      setErrorInforme(e?.response?.data?.detail || 'Error generando informe')
    } finally {
      setLoadingInforme(false)
    }
  }

  if (loading) return <PageLoading />
  if (error)   return <ErrorState message={error} onRetry={refetch} />

  const { diversidad, biblioteca = [], angulos_activos, total_ads, historial = [], umbrales = {} } = data || {}

  // Ángulos que necesitan rotación
  const rotar = biblioteca.filter(a => a.señal_rotacion)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-white text-2xl font-bold">Estrategia Creativa</h1>
          <p className="text-slate-400 text-sm mt-1">
            Framework Andromeda/GEM — {angulos_activos} ángulos activos · {total_ads} anuncios
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {PERIODS.map(p => (
            <button key={p.days} onClick={() => setDays(p.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${days === p.days ? 'bg-violet-DEFAULT/20 text-violet-glow border-violet-DEFAULT/30' : 'text-slate-400 border-border hover:text-white'}`}>
              {p.label}
            </button>
          ))}
          <button
            onClick={handleGenerarInforme}
            disabled={loadingInforme}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-violet-DEFAULT/20 text-violet-glow border border-violet-DEFAULT/30 hover:bg-violet-DEFAULT/30 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingInforme ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            Informe GEM
          </button>
        </div>
      </div>

      {/* Semáforo */}
      {diversidad && <SemaforoDiversidad data={diversidad} umbrales={umbrales} />}

      {/* Informe GEM */}
      {errorInforme && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-red-400 text-xs">{errorInforme}</div>
      )}
      {informe && (
        <div className="bg-surface border border-violet-DEFAULT/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-violet-400" />
            <h2 className="text-white font-bold text-base">Informe de Acción Inmediata — GEM 2026</h2>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-slate-500 text-xs">Últimos 7 días</span>
              <button
                onClick={() => exportarInformePDF(informe.informe, informe.resumen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-slate-300 border border-border hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title="Descargar como PDF"
              >
                <Download size={12} />
                Descargar PDF
              </button>
            </div>
          </div>
          <InformeGEM informe={informe.informe} resumen={informe.resumen} />
        </div>
      )}

      {/* KPIs guía */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'CPMr objetivo',    value: `< $${(umbrales.cpmr_verde ?? 3000).toLocaleString('es-AR')} ARS`, desc: 'Costo por 1000 alcance',       icon: Target,    color: 'text-green-400' },
          { label: 'Hook Rate óptimo', value: `> ${umbrales.hook_verde ?? 25}%`,                                  desc: '% que ve el 25% del video',    icon: Zap,       color: 'text-violet-400' },
          { label: 'Señal de rotación',value: `CPMr > $${(umbrales.cpmr_rojo ?? 5000).toLocaleString('es-AR')}`, desc: `O Hook Rate < ${umbrales.hook_rojo ?? 15}%`, icon: RotateCcw, color: 'text-orange-400' },
          { label: 'Diversidad',       value: `< ${umbrales.diversidad_rojo ?? 60}% un ángulo`,                   desc: 'Andromeda penaliza similitud',  icon: Sparkles,  color: 'text-blue-400' },
        ].map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className="bg-surface border border-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={13} className={k.color} />
                <p className="text-slate-500 text-[10px] uppercase tracking-wide">{k.label}</p>
              </div>
              <p className={`font-bold text-sm ${k.color}`}>{k.value}</p>
              <p className="text-slate-400 text-[10px] mt-0.5">{k.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Alertas de rotación */}
      {rotar.length > 0 && (
        <div className="bg-red-400/8 border border-red-400/20 rounded-xl px-5 py-4">
          <p className="text-red-400 font-semibold text-sm mb-3 flex items-center gap-2">
            <RotateCcw size={15} /> {rotar.length} ángulo{rotar.length > 1 ? 's' : ''} requieren rotación
          </p>
          <div className="space-y-1.5">
            {rotar.map(a => (
              <div key={a.angulo} className="flex items-center gap-3 text-xs">
                <span className="text-red-300 font-medium">{a.angulo}</span>
                <span className="text-slate-500">—</span>
                <span className="text-slate-400">
                  {a.señal_rotacion === 'rotar_urgente' && `CPMr $${fmt(a.cpmr_promedio)} + Hook Rate ${fmtDec(a.hook_rate_promedio)}% — renovar urgente`}
                  {a.señal_rotacion === 'cpmr_alto' && `CPMr $${fmt(a.cpmr_promedio)} — audiencia saturada`}
                  {a.señal_rotacion === 'hook_bajo' && `Hook Rate ${fmtDec(a.hook_rate_promedio)}% — el gancho no engancha`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Biblioteca de ángulos */}
      <div>
        <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
          <Target size={16} className="text-violet-400" />
          Biblioteca de ángulos activos
        </h2>
        {biblioteca.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Sin anuncios con gasto en el período. Probá ampliar el rango de fechas.
          </div>
        ) : (
          <div className="space-y-3">
            {biblioteca.map((a, i) => <AnguloCard key={a.angulo} angulo={a} rank={i} umbrales={umbrales} />)}
          </div>
        )}
      </div>

      {/* Historial de decisiones */}
      <div>
        <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
          <Clock size={16} className="text-slate-400" />
          Trazabilidad de decisiones
        </h2>
        <Historial acciones={historial} />
      </div>
    </div>
  )
}
