import { useState, useEffect } from 'react'
import { X, Sparkles, ChevronDown, ChevronUp, Copy, Check, Loader2, Info, Download, Image, LayoutGrid, Video } from 'lucide-react'
import api from '../services/api'

const ANGULOS = [
  { id: 'fomo', label: 'FOMO / Urgencia', desc: 'Escasez, tiempo limitado, otros ya lo tienen' },
  { id: 'problema', label: 'Problema → Solución', desc: 'Identificar el dolor y presentar la salida' },
  { id: 'testimonial', label: 'Testimonial Social Proof', desc: 'Historia real de cliente, resultado concreto' },
  { id: 'precio', label: 'Precio / Cuotas accesibles', desc: 'Hacer el precio irresistible o comparable' },
  { id: 'detras', label: 'Detrás de escena / Proceso', desc: 'Mostrar el trabajo, generar confianza' },
  { id: 'autoridad', label: 'Autoridad / Expertise', desc: 'Credenciales, años de experiencia, resultados' },
  { id: 'comparacion', label: 'Comparación', desc: 'Antes/después, vos vs ellos, con/sin el producto' },
  { id: 'garantia', label: 'Garantía / Sin riesgo', desc: 'Eliminar objeciones, devolver dinero, probar gratis' },
]

const TONOS = ['directo y cercano', 'aspiracional', 'urgente', 'educativo', 'humorístico', 'empático']

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="text-slate-500 hover:text-violet-400 transition-colors cursor-pointer p-1"
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  )
}

function VariacionCard({ v, idx }) {
  const [open, setOpen] = useState(idx === 0)
  const formatoEmoji = { 'Yapper': '🎥', 'UGC': '🙋', 'Lifestyle': '📸' }
  const emoji = Object.entries(formatoEmoji).find(([k]) => v.formato.includes(k))?.[1] || '📌'

  return (
    <div className="bg-bg border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/3 transition-colors cursor-pointer"
      >
        <span className="text-sm font-medium text-slate-300">{emoji} {v.formato}</span>
        {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Hook 1.5s</p>
              <CopyButton text={v.hook_15s} />
            </div>
            <p className="text-orange-400 font-semibold text-sm">"{v.hook_15s}"</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Guión / Copy</p>
              <CopyButton text={v.cuerpo} />
            </div>
            <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line">{v.cuerpo}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1">CTA</p>
            <span className="inline-block bg-green-500/15 text-green-400 text-xs px-2 py-1 rounded-md font-medium">
              {v.cta}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function DisenoSection({ diseno }) {
  const [tab, setTab] = useState('estatica')
  if (!diseno) return null
  const tabs = [
    { id: 'estatica', label: 'Estática', icon: Image },
    { id: 'carrusel', label: 'Carrusel', icon: LayoutGrid },
    { id: 'reel',     label: 'Reel',     icon: Video },
  ]
  return (
    <div className="mt-3 bg-bg border border-border rounded-xl overflow-hidden">
      <div className="flex border-b border-border">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors cursor-pointer border-b-2 ${tab === id ? 'border-violet-500 text-violet-300' : 'border-transparent text-slate-500 hover:text-white'}`}>
            <Icon size={11} />{label}
          </button>
        ))}
      </div>
      <div className="p-3 space-y-2">
        {tab === 'estatica' && diseno.estatica && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">Formato</span>
              <span className="text-slate-300 text-xs font-medium">{diseno.estatica.formato}</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Concepto visual</p>
              <p className="text-slate-300 text-xs leading-relaxed">{diseno.estatica.concepto_visual}</p>
            </div>
            {diseno.estatica.texto_overlay && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Texto overlay</p>
                <p className="text-orange-400 text-xs font-semibold">"{diseno.estatica.texto_overlay}"</p>
              </div>
            )}
            {diseno.estatica.elementos_clave?.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Elementos clave</p>
                <div className="flex flex-wrap gap-1.5">
                  {diseno.estatica.elementos_clave.map((e, i) => (
                    <span key={i} className="text-[10px] bg-surface border border-border text-slate-300 px-2 py-0.5 rounded-md">{e}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {tab === 'carrusel' && diseno.carrusel && (
          <>
            <div className="space-y-2">
              {(diseno.carrusel.slides || []).map((s, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded bg-violet-500/20 text-violet-300 text-[10px] font-bold flex items-center justify-center shrink-0">{s.numero}</span>
                  <div>
                    <p className="text-slate-200 text-xs font-semibold">{s.titulo}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5 leading-relaxed">{s.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
            {diseno.carrusel.paleta_sugerida && (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Paleta / Estilo</p>
                <p className="text-slate-400 text-xs">{diseno.carrusel.paleta_sugerida}</p>
              </div>
            )}
          </>
        )}
        {tab === 'reel' && diseno.reel && (
          <>
            <div className="flex gap-3 mb-2">
              <span className="text-[10px] text-slate-400 bg-surface border border-border px-2 py-0.5 rounded">{diseno.reel.duracion}</span>
              <span className="text-[10px] text-slate-400 bg-surface border border-border px-2 py-0.5 rounded">{diseno.reel.ratio}</span>
              <span className="text-[10px] text-slate-400 bg-surface border border-border px-2 py-0.5 rounded">{diseno.reel.estilo}</span>
            </div>
            <div className="space-y-2">
              {(diseno.reel.estructura || []).map((e, i) => (
                <div key={i} className="grid grid-cols-[60px_1fr_1fr] gap-2 text-[10px]">
                  <span className="text-violet-400 font-semibold pt-0.5">{e.segundo}</span>
                  <div>
                    <p className="text-slate-500 uppercase mb-0.5">Visual</p>
                    <p className="text-slate-300 leading-relaxed">{e.visual}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase mb-0.5">Audio</p>
                    <p className="text-slate-300 leading-relaxed">{e.audio}</p>
                  </div>
                </div>
              ))}
            </div>
            {diseno.reel.caption_sugerido && (
              <div className="mt-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Caption sugerido</p>
                  <CopyButton text={diseno.reel.caption_sugerido} />
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{diseno.reel.caption_sugerido}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function AnguloSection({ angulo, idx }) {
  const [open, setOpen] = useState(true)
  const [view, setView] = useState('copy') // copy | diseno
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/3 transition-colors cursor-pointer"
      >
        <div>
          <p className="text-white font-semibold text-sm">{angulo.nombre}</p>
          {angulo.insight && <p className="text-slate-400 text-xs mt-0.5 italic">{angulo.insight}</p>}
        </div>
        {open ? <ChevronUp size={15} className="text-slate-500 shrink-0" /> : <ChevronDown size={15} className="text-slate-500 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border">
          {/* Toggle copy / diseño */}
          <div className="flex gap-1 mt-3 mb-3">
            <button onClick={() => setView('copy')}
              className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${view === 'copy' ? 'bg-violet-500/20 text-violet-300' : 'text-slate-500 hover:text-white'}`}>
              Copy &amp; Guión
            </button>
            <button onClick={() => setView('diseno')}
              className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${view === 'diseno' ? 'bg-violet-500/20 text-violet-300' : 'text-slate-500 hover:text-white'}`}>
              Diseño
            </button>
          </div>
          {view === 'copy' && (
            <div className="space-y-2">
              {(angulo.variaciones || []).map((v, i) => (
                <VariacionCard key={i} v={v} idx={i} />
              ))}
            </div>
          )}
          {view === 'diseno' && <DisenoSection diseno={angulo.diseno} />}
        </div>
      )}
    </div>
  )
}

function descargarBriefPDF(brief, producto, oferta, clienteIdeal) {
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora  = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  const angulosHTML = (brief.angulos || []).map(angulo => {
    const variacionesHTML = (angulo.variaciones || []).map(v => `
      <div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:14px;margin-bottom:10px">
        <p style="color:#a78bfa;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:0 0 10px">${v.formato}</p>
        <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;margin:0 0 3px">Hook 1.5s</p>
        <p style="color:#fb923c;font-size:13px;font-weight:700;margin:0 0 10px">"${v.hook_15s}"</p>
        <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;margin:0 0 3px">Guión / Copy</p>
        <p style="color:#cbd5e1;font-size:12px;line-height:1.6;margin:0 0 10px;white-space:pre-line">${v.cuerpo}</p>
        <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;margin:0 0 3px">CTA</p>
        <span style="background:#14532d;color:#4ade80;font-size:11px;font-weight:600;padding:3px 10px;border-radius:6px">${v.cta}</span>
      </div>`).join('')

    const d = angulo.diseno
    const disenoHTML = d ? `
      <div style="margin-top:14px">
        <p style="color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px;font-weight:700">── DISEÑO ──</p>
        ${d.estatica ? `
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:12px;margin-bottom:8px">
          <p style="color:#38bdf8;font-size:10px;font-weight:700;text-transform:uppercase;margin:0 0 6px">📷 Estática · ${d.estatica.formato}</p>
          <p style="color:#94a3b8;font-size:10px;margin:0 0 2px">Concepto visual:</p>
          <p style="color:#cbd5e1;font-size:11px;line-height:1.5;margin:0 0 8px">${d.estatica.concepto_visual}</p>
          ${d.estatica.texto_overlay ? `<p style="color:#94a3b8;font-size:10px;margin:0 0 2px">Texto overlay:</p><p style="color:#fb923c;font-size:12px;font-weight:600;margin:0">"${d.estatica.texto_overlay}"</p>` : ''}
        </div>` : ''}
        ${d.carrusel ? `
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:12px;margin-bottom:8px">
          <p style="color:#38bdf8;font-size:10px;font-weight:700;text-transform:uppercase;margin:0 0 8px">🎠 Carrusel · ${d.carrusel.cantidad_slides} slides</p>
          ${(d.carrusel.slides || []).map(s => `
          <div style="display:flex;gap:8px;margin-bottom:6px;align-items:flex-start">
            <span style="background:#312e81;color:#a5b4fc;font-size:10px;font-weight:700;width:18px;height:18px;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${s.numero}</span>
            <div><p style="color:#e2e8f0;font-size:11px;font-weight:600;margin:0">${s.titulo}</p><p style="color:#64748b;font-size:10px;margin:1px 0 0;line-height:1.4">${s.descripcion}</p></div>
          </div>`).join('')}
        </div>` : ''}
        ${d.reel ? `
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:12px">
          <p style="color:#38bdf8;font-size:10px;font-weight:700;text-transform:uppercase;margin:0 0 6px">🎬 Reel · ${d.reel.duracion} · ${d.reel.ratio} · ${d.reel.estilo}</p>
          ${(d.reel.estructura || []).map(e => `
          <div style="display:grid;grid-template-columns:55px 1fr 1fr;gap:6px;margin-bottom:6px;font-size:10px">
            <span style="color:#a78bfa;font-weight:700">${e.segundo}</span>
            <div><p style="color:#475569;margin:0 0 1px">Visual</p><p style="color:#cbd5e1;margin:0;line-height:1.4">${e.visual}</p></div>
            <div><p style="color:#475569;margin:0 0 1px">Audio</p><p style="color:#cbd5e1;margin:0;line-height:1.4">${e.audio}</p></div>
          </div>`).join('')}
          ${d.reel.caption_sugerido ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #1e293b"><p style="color:#94a3b8;font-size:10px;margin:0 0 3px">Caption sugerido:</p><p style="color:#94a3b8;font-size:11px;line-height:1.5;margin:0">${d.reel.caption_sugerido}</p></div>` : ''}
        </div>` : ''}
      </div>` : ''

    return `
      <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:20px;page-break-inside:avoid">
        <p style="color:#fff;font-size:16px;font-weight:800;margin:0 0 4px">${angulo.nombre}</p>
        ${angulo.insight ? `<p style="color:#94a3b8;font-size:12px;font-style:italic;margin:0 0 14px">${angulo.insight}</p>` : ''}
        ${variacionesHTML}
        ${disenoHTML}
      </div>`
  }).join('')

  const kpisHTML = (brief.kpis_monitorear || []).map(k => `
    <div style="display:flex;gap:10px;margin-bottom:6px">
      <span style="color:#a78bfa;font-size:12px;font-weight:700;min-width:100px">${k.metrica}</span>
      <span style="color:#94a3b8;font-size:12px">${k.descripcion}${k.benchmark ? ` — <em>${k.benchmark}</em>` : ''}</span>
    </div>`).join('')

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Brief Estratégico — ${producto}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#111827;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;max-width:860px;margin:0 auto}@media print{body{background:#fff;color:#111;padding:20px}@page{margin:1.5cm;size:A4}}</style>
  </head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid #1e293b">
    <div>
      <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.08em">Meta Ads AI — Brief Estratégico GEM 2026</p>
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:4px 0 2px">${producto}</h1>
      <p style="color:#64748b;font-size:13px">${clienteIdeal}</p>
    </div>
    <div style="text-align:right">
      <p style="color:#94a3b8;font-size:12px">Generado</p>
      <p style="color:#e2e8f0;font-size:14px;font-weight:600">${fecha} · ${hora}</p>
    </div>
  </div>
  <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;margin-bottom:24px">
    <p style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Propuesta de valor / Oferta</p>
    <p style="color:#e2e8f0;font-size:13px;line-height:1.5">${oferta}</p>
  </div>
  ${angulosHTML}
  ${brief.flow_whatsapp ? `
  <div style="background:#052e16;border:1px solid #166534;border-radius:12px;padding:18px;margin-bottom:16px;page-break-inside:avoid">
    <p style="color:#4ade80;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Flow de calificación WhatsApp</p>
    <p style="color:#94a3b8;font-size:10px;margin-bottom:4px">Mensaje de bienvenida:</p>
    <p style="color:#cbd5e1;font-size:12px;font-style:italic;margin-bottom:12px">"${brief.flow_whatsapp.mensaje_bienvenida}"</p>
    ${(brief.flow_whatsapp.preguntas || []).map((q, i) => `<div style="display:flex;gap:8px;margin-bottom:5px"><span style="color:#4ade80;font-weight:700;font-size:12px">${i+1}.</span><span style="color:#94a3b8;font-size:12px">${q}</span></div>`).join('')}
  </div>` : ''}
  ${kpisHTML ? `<div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px;margin-bottom:16px"><p style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:10px">KPIs a monitorear</p>${kpisHTML}</div>` : ''}
  ${brief.recomendacion_presupuesto ? `<div style="background:#1c1408;border:1px solid #854d0e;border-radius:12px;padding:18px"><p style="color:#fbbf24;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:6px">Distribución de presupuesto</p><p style="color:#cbd5e1;font-size:12px;line-height:1.6">${brief.recomendacion_presupuesto}</p></div>` : ''}
  <div style="margin-top:28px;padding-top:16px;border-top:1px solid #1e293b;display:flex;justify-content:space-between">
    <p style="color:#334155;font-size:11px">Meta Ads AI — Framework Andromeda/GEM 2026</p>
    <p style="color:#334155;font-size:11px">El creativo es el targeting.</p>
  </div>
  <script>window.onload=()=>window.print()</script>
  </body></html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export default function BriefGenerador({ onClose, account }) {
  const [step, setStep] = useState('form') // form | result
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [brandLoaded, setBrandLoaded] = useState(false)

  const [producto, setProducto] = useState('')
  const [clienteIdeal, setClienteIdeal] = useState('')
  const [oferta, setOferta] = useState('')
  const [selectedAngulos, setSelectedAngulos] = useState(['FOMO / Urgencia', 'Problema → Solución', 'Testimonial Social Proof'])
  const [tono, setTono] = useState('directo y cercano')

  // Cargar perfil de marca al montar
  useEffect(() => {
    const accountParam = account?.id ? `?account_id=${account.id}` : ''
    api.get(`/clients/me/brand${accountParam}`).then(res => {
      const b = res.data
      if (b.marca_nombre || b.marca_descripcion) {
        const productoStr = [b.marca_nombre, b.marca_descripcion].filter(Boolean).join(' — ')
        const ofertaStr   = [b.marca_propuesta_valor, b.marca_beneficios].filter(Boolean).join('. ')
        if (productoStr) setProducto(productoStr)
        if (b.marca_publico) setClienteIdeal(b.marca_publico)
        if (ofertaStr) setOferta(ofertaStr)
        if (b.marca_tono) {
          const tonoMatch = TONOS.find(t => b.marca_tono.toLowerCase().includes(t.split(' ')[0].toLowerCase()))
          if (tonoMatch) setTono(tonoMatch)
        }
        setBrandLoaded(true)
      }
    }).catch(() => {})
  }, [account?.id])

  const toggleAngulo = (label) => {
    setSelectedAngulos(prev =>
      prev.includes(label) ? prev.filter(a => a !== label) : [...prev, label]
    )
  }

  const handleGenerar = async () => {
    if (!producto.trim() || !oferta.trim() || selectedAngulos.length === 0) {
      setError('Completá producto, oferta y al menos un ángulo.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await api.post('/brief/generate', {
        producto,
        cliente_ideal: clienteIdeal,
        oferta,
        angulos: selectedAngulos,
        objetivo: 'WHATSAPP',
        tono,
        account_id: account?.id ? String(account.id) : undefined,
      })
      setResult(res.data)
      setStep('result')
    } catch (e) {
      const detail = e?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : e?.message || 'Error al generar el brief')
    } finally {
      setLoading(false)
    }
  }

  const brief = result?.brief

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-6 px-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-violet-400" />
            <h2 className="text-white font-bold text-lg">Brief Estratégico</h2>
            {result && (
              <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-medium">
                {result.model}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === 'result' && brief && (
              <button
                onClick={() => descargarBriefPDF(brief, producto, oferta, clienteIdeal)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-slate-300 border border-border hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <Download size={12} /> PDF
              </button>
            )}
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors cursor-pointer">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {step === 'form' && (
            <>
              {/* Banner perfil de marca */}
              {brandLoaded ? (
                <div className="flex items-center gap-2 bg-violet-DEFAULT/8 border border-violet-DEFAULT/20 rounded-xl px-4 py-2.5">
                  <Info size={13} className="text-violet-400 shrink-0" />
                  <p className="text-violet-300 text-xs">Datos cargados desde tu Perfil de Marca. Podés editarlos antes de generar.</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-bg border border-border rounded-xl px-4 py-2.5">
                  <Info size={13} className="text-slate-500 shrink-0" />
                  <p className="text-slate-500 text-xs">Completá tu <span className="text-slate-400 font-medium">Perfil de Marca</span> para pre-llenar estos campos automáticamente.</p>
                </div>
              )}

              {/* Producto & Oferta */}
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 text-xs font-medium block mb-1.5">Producto / Servicio</label>
                  <input
                    value={producto}
                    onChange={e => setProducto(e.target.value)}
                    placeholder="Ej: Curso online de repostería, consultoría contable..."
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-medium block mb-1.5">Cliente ideal / público objetivo</label>
                  <input
                    value={clienteIdeal}
                    onChange={e => setClienteIdeal(e.target.value)}
                    placeholder="Ej: Mamás 25-40 años que buscan emprendimiento desde casa"
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-medium block mb-1.5">Propuesta de valor / Oferta irresistible</label>
                  <textarea
                    value={oferta}
                    onChange={e => setOferta(e.target.value)}
                    rows={3}
                    placeholder="Ej: 3 clases gratis + certificado + soporte por WhatsApp por 30 días"
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Tono */}
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-2">Tono de comunicación</label>
                <div className="flex flex-wrap gap-2">
                  {TONOS.map(t => (
                    <button
                      key={t}
                      onClick={() => setTono(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                        tono === t
                          ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                          : 'text-slate-400 border-border hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ángulos */}
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-2">
                  Ángulos creativos <span className="text-slate-400">({selectedAngulos.length} seleccionados)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ANGULOS.map(a => {
                    const active = selectedAngulos.includes(a.label)
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleAngulo(a.label)}
                        className={`text-left px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                          active
                            ? 'bg-violet-500/15 border-violet-500/40 text-white'
                            : 'bg-bg border-border text-slate-400 hover:border-slate-600 hover:text-slate-300'
                        }`}
                      >
                        <p className="text-xs font-semibold">{a.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{a.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

              <button
                onClick={handleGenerar}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer"
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Generando brief con IA...</> : <><Sparkles size={16} /> Generar Brief Estratégico</>}
              </button>
            </>
          )}

          {step === 'result' && brief && (
            <>
              <button
                onClick={() => setStep('form')}
                className="text-slate-500 hover:text-white text-xs transition-colors cursor-pointer"
              >
                ← Volver y regenerar
              </button>

              {/* Summary */}
              <div className="bg-bg border border-border rounded-xl px-4 py-3 space-y-1">
                <p className="text-slate-500 text-[10px] uppercase tracking-wide font-medium">Resumen del brief</p>
                <p className="text-white text-sm font-semibold">{producto}</p>
                <p className="text-slate-400 text-xs">{oferta}</p>
              </div>

              {/* Ángulos con variaciones */}
              <div className="space-y-3">
                {(brief.angulos || []).map((angulo, i) => (
                  <AnguloSection key={i} angulo={angulo} idx={i} />
                ))}
              </div>

              {/* WhatsApp Flow */}
              {brief.flow_whatsapp && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                  <p className="text-green-400 text-xs font-semibold uppercase tracking-wide mb-2">Flow de calificación WhatsApp</p>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-slate-300 text-xs italic">"{brief.flow_whatsapp.mensaje_bienvenida}"</p>
                    <CopyButton text={brief.flow_whatsapp.mensaje_bienvenida} />
                  </div>
                  <div className="space-y-1.5">
                    {(brief.flow_whatsapp.preguntas || []).map((q, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-green-500 text-xs font-bold shrink-0">{i + 1}.</span>
                        <p className="text-slate-400 text-xs">{q}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KPIs */}
              {brief.kpis_monitorear && brief.kpis_monitorear.length > 0 && (
                <div className="bg-surface border border-border rounded-xl px-4 py-3">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">KPIs a monitorear</p>
                  <div className="space-y-2">
                    {brief.kpis_monitorear.map((kpi, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="text-violet-400 text-xs font-bold shrink-0 mt-0.5">{kpi.metrica}</span>
                        <div className="flex-1">
                          <p className="text-slate-400 text-xs">{kpi.descripcion}</p>
                          {kpi.benchmark && <p className="text-slate-400 text-[10px]">Benchmark: {kpi.benchmark}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Presupuesto */}
              {brief.recomendacion_presupuesto && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
                  <p className="text-orange-400 text-xs font-semibold uppercase tracking-wide mb-1">Distribución de presupuesto</p>
                  <p className="text-slate-300 text-xs leading-relaxed">{brief.recomendacion_presupuesto}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
