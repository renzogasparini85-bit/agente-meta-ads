import { useState, useEffect } from 'react'
import { X, Settings, Save, Check, TrendingUp, MessageCircle, Key, RefreshCw, ExternalLink, BarChart2, Zap, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAccount } from '../context/AccountContext'
import api from '../services/api'

const MONEDAS = [
  { value: 'ARS', label: 'ARS — Peso Argentino' },
  { value: 'USD', label: 'USD — Dólar' },
  { value: 'MXN', label: 'MXN — Peso Mexicano' },
  { value: 'COP', label: 'COP — Peso Colombiano' },
  { value: 'BRL', label: 'BRL — Real Brasileño' },
  { value: 'CLP', label: 'CLP — Peso Chileno' },
  { value: 'PEN', label: 'PEN — Sol Peruano' },
  { value: 'EUR', label: 'EUR — Euro' },
]

export default function Configuracion({ onClose }) {
  const { client, updateClient } = useAuth()
  const { selected: account } = useAccount()
  const [tab, setTab] = useState('cpa')
  const [form, setForm] = useState({
    moneda:            client?.moneda            || 'ARS',
    cpa_escalar:       client?.cpa_escalar       || 500,
    cpa_replicar:      client?.cpa_replicar      || 650,
    cpa_pausar:        client?.cpa_pausar        || 900,
    ticket_promedio:   client?.ticket_promedio   || '',
    tasa_cierre:       client?.tasa_cierre       || '',
    roas_meta:         client?.roas_meta         || 3,
    // Umbrales GEM — estándar Ruta Pro 2026
    cpmr_verde:          client?.cpmr_verde          ?? 20,
    cpmr_rojo:           client?.cpmr_rojo            ?? 25,
    hook_verde:          client?.hook_verde           ?? 25,
    hook_rojo:           client?.hook_rojo            ?? 15,
    freq_amarillo:       client?.freq_amarillo        ?? 2.5,
    freq_rojo:           client?.freq_rojo            ?? 3.5,
    ctr_bueno:           client?.ctr_bueno            || 2,
    ctr_malo:            client?.ctr_malo             || 0.5,
    conv_semana_rojo:    client?.conv_semana_rojo     || 50,
    conv_semana_verde:   client?.conv_semana_verde    || 100,
    diversidad_amarillo: client?.diversidad_amarillo  || 40,
    diversidad_rojo:     client?.diversidad_rojo      || 60,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [calibrating, setCalibrating] = useState(false)
  const [calibPreview, setCalibPreview] = useState(null) // { cpmr_verde, cpmr_rojo, motivo, fuente, n_ads }

  // Fetch fresh settings from server on mount to get accurate GEM thresholds
  useEffect(() => {
    api.get('/clients/me/settings').then(res => {
      const d = res.data
      setForm(f => ({
        ...f,
        moneda:              d.moneda              ?? f.moneda,
        cpa_escalar:         d.cpa_escalar         ?? f.cpa_escalar,
        cpa_replicar:        d.cpa_replicar        ?? f.cpa_replicar,
        cpa_pausar:          d.cpa_pausar          ?? f.cpa_pausar,
        ticket_promedio:     d.ticket_promedio      != null ? d.ticket_promedio : f.ticket_promedio,
        tasa_cierre:         d.tasa_cierre          != null ? d.tasa_cierre     : f.tasa_cierre,
        roas_meta:           d.roas_meta           ?? f.roas_meta,
        cpmr_verde:          d.cpmr_verde          ?? f.cpmr_verde,
        cpmr_rojo:           d.cpmr_rojo           ?? f.cpmr_rojo,
        hook_verde:          d.hook_verde          ?? f.hook_verde,
        hook_rojo:           d.hook_rojo           ?? f.hook_rojo,
        freq_amarillo:       d.freq_amarillo       ?? f.freq_amarillo,
        freq_rojo:           d.freq_rojo           ?? f.freq_rojo,
        ctr_bueno:           d.ctr_bueno           ?? f.ctr_bueno,
        ctr_malo:            d.ctr_malo            ?? f.ctr_malo,
        conv_semana_rojo:    d.conv_semana_rojo    ?? f.conv_semana_rojo,
        conv_semana_verde:   d.conv_semana_verde   ?? f.conv_semana_verde,
        diversidad_amarillo: d.diversidad_amarillo ?? f.diversidad_amarillo,
        diversidad_rojo:     d.diversidad_rojo     ?? f.diversidad_rojo,
      }))
    }).catch(err => console.error('[Configuracion] settings fetch failed:', err?.response?.status, err?.message))
  }, [])
  const [tokenCorto, setTokenCorto] = useState('')
  const [savingToken, setSavingToken] = useState(false)
  const [savedToken, setSavedToken] = useState(null) // { expires_days }
  const [errorToken, setErrorToken] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCalibrate = async (apply = false) => {
    setCalibrating(true)
    setCalibPreview(null)
    try {
      const params = new URLSearchParams({ apply: apply ? 'true' : 'false' })
      if (account?.id) params.set('account_id', account.id)
      const res = await api.post(`/clients/me/calibrate?${params}`)
      const d = res.data
      setCalibPreview(d)
      if (apply) {
        setForm(f => ({ ...f, cpmr_verde: d.cpmr_verde, cpmr_rojo: d.cpmr_rojo }))
        updateClient({ cpmr_verde: d.cpmr_verde, cpmr_rojo: d.cpmr_rojo })
      }
    } catch (e) {
      setCalibPreview({ error: e?.response?.data?.detail || 'Error al calibrar' })
    } finally {
      setCalibrating(false)
    }
  }

  // ROAS estimado en base a los inputs actuales
  const roasPreview = (() => {
    const ticket = parseFloat(form.ticket_promedio)
    const cierre = parseFloat(form.tasa_cierre)
    if (!ticket || !cierre) return null
    // Ejemplo: 10 mensajes × tasa_cierre% × ticket / gasto_ejemplo
    return `${((10 * (cierre / 100) * ticket) / 1000).toFixed(2)}x por cada $1.000 invertidos (con 10 mensajes)`
  })()

  const handleSave = async () => {
    if (tab === 'cpa' && (form.cpa_escalar >= form.cpa_replicar || form.cpa_replicar >= form.cpa_pausar)) {
      setError('Los umbrales deben ser: escalar < replicar < pausar')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const payload = {
        moneda:       form.moneda,
        cpa_escalar:  Number(form.cpa_escalar),
        cpa_replicar: Number(form.cpa_replicar),
        cpa_pausar:   Number(form.cpa_pausar),
        roas_meta:    Number(form.roas_meta),
        // Umbrales GEM
        cpmr_verde:          Number(form.cpmr_verde),
        cpmr_rojo:           Number(form.cpmr_rojo),
        hook_verde:          Number(form.hook_verde),
        hook_rojo:           Number(form.hook_rojo),
        freq_amarillo:       Number(form.freq_amarillo),
        freq_rojo:           Number(form.freq_rojo),
        ctr_bueno:           Number(form.ctr_bueno),
        ctr_malo:            Number(form.ctr_malo),
        conv_semana_rojo:    Number(form.conv_semana_rojo),
        conv_semana_verde:   Number(form.conv_semana_verde),
        diversidad_amarillo: Number(form.diversidad_amarillo),
        diversidad_rojo:     Number(form.diversidad_rojo),
      }
      if (form.ticket_promedio !== '') payload.ticket_promedio = Number(form.ticket_promedio)
      if (form.tasa_cierre !== '')     payload.tasa_cierre     = Number(form.tasa_cierre)

      const res = await api.put('/clients/me/settings', payload)
      updateClient({
        moneda:              res.data.moneda,
        cpa_escalar:         res.data.cpa_escalar,
        cpa_replicar:        res.data.cpa_replicar,
        cpa_pausar:          res.data.cpa_pausar,
        ticket_promedio:     res.data.ticket_promedio,
        tasa_cierre:         res.data.tasa_cierre,
        roas_meta:           res.data.roas_meta,
        cpmr_verde:          res.data.cpmr_verde,
        cpmr_rojo:           res.data.cpmr_rojo,
        hook_verde:          res.data.hook_verde,
        hook_rojo:           res.data.hook_rojo,
        freq_amarillo:       res.data.freq_amarillo,
        freq_rojo:           res.data.freq_rojo,
        ctr_bueno:           res.data.ctr_bueno,
        ctr_malo:            res.data.ctr_malo,
        conv_semana_rojo:    res.data.conv_semana_rojo,
        conv_semana_verde:   res.data.conv_semana_verde,
        diversidad_amarillo: res.data.diversidad_amarillo,
        diversidad_rojo:     res.data.diversidad_rojo,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveToken = async () => {
    if (!tokenCorto.trim()) return
    setSavingToken(true)
    setErrorToken(null)
    setSavedToken(null)
    try {
      const res = await api.post(`/auth/meta/exchange-token?short_token=${encodeURIComponent(tokenCorto.trim())}`)
      setSavedToken(res.data)
      setTokenCorto('')
    } catch (e) {
      setErrorToken(e?.response?.data?.detail || 'Error al procesar el token')
    } finally {
      setSavingToken(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-violet-glow" />
            <h2 className="text-white font-semibold text-sm">Configuración</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-2">
          {[
            { id: 'cpa',     label: 'CPA',      icon: TrendingUp },
            { id: 'metricas',label: 'Métricas', icon: BarChart2 },
            { id: 'roas',    label: 'ROAS',     icon: MessageCircle },
            { id: 'token',   label: 'Token',    icon: Key },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                tab === id ? 'border-violet-DEFAULT text-violet-glow' : 'border-transparent text-slate-500 hover:text-white'
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

          {tab === 'cpa' && (
            <>
              {/* Moneda */}
              <div>
                <label className="text-slate-400 text-xs font-medium mb-1.5 block">Moneda del dashboard</label>
                <select
                  value={form.moneda}
                  onChange={e => set('moneda', e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-DEFAULT/60 transition-colors cursor-pointer"
                >
                  {MONEDAS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Umbrales CPA */}
              <div>
                <p className="text-slate-400 text-xs font-medium mb-3">Umbrales de CPA ({form.moneda})</p>
                <div className="space-y-3">
                  {[
                    { key: 'cpa_escalar',  color: 'green', label: 'Escalar — hasta',  focus: 'focus:border-green-400/60' },
                    { key: 'cpa_replicar', color: 'blue',  label: 'Replicar — hasta', focus: 'focus:border-blue-400/60' },
                    { key: 'cpa_pausar',   color: 'red',   label: 'Pausar — desde',   focus: 'focus:border-red-400/60' },
                  ].map(({ key, color, label, focus }) => (
                    <div key={key} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full bg-${color}-400 shrink-0`} />
                      <div className="flex-1">
                        <label className="text-slate-400 text-xs block mb-1">{label}</label>
                        <input
                          type="number"
                          value={form[key]}
                          onChange={e => set(key, e.target.value)}
                          className={`w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none ${focus} transition-colors`}
                        />
                      </div>
                      <span className="text-slate-400 text-xs pt-5">{form.moneda}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'roas' && (
            <>
              <div className="bg-violet-DEFAULT/5 border border-violet-DEFAULT/15 rounded-xl px-4 py-3">
                <p className="text-white text-xs font-semibold mb-1">¿Para qué sirve?</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Si tu negocio cierra ventas por WhatsApp (no e-commerce), la API de Meta no puede calcular el ROAS real.
                  Con tu ticket promedio y tasa de cierre, el dashboard lo estima automáticamente.
                </p>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-medium mb-1.5 block">
                  Ticket promedio por venta ({form.moneda})
                </label>
                <input
                  type="number"
                  value={form.ticket_promedio}
                  onChange={e => set('ticket_promedio', e.target.value)}
                  placeholder="Ej: 85000"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-DEFAULT/60 transition-colors"
                />
                <p className="text-slate-400 text-xs mt-1">Valor promedio de lo que paga un cliente cuando cierra.</p>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-medium mb-1.5 block">
                  Tasa de cierre (%)
                </label>
                <input
                  type="number"
                  min="0" max="100"
                  value={form.tasa_cierre}
                  onChange={e => set('tasa_cierre', e.target.value)}
                  placeholder="Ej: 20"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-DEFAULT/60 transition-colors"
                />
                <p className="text-slate-400 text-xs mt-1">De cada 100 mensajes que recibís, ¿cuántos compran?</p>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-medium mb-1.5 block">ROAS objetivo</label>
                <input
                  type="number"
                  min="1" step="0.5"
                  value={form.roas_meta}
                  onChange={e => set('roas_meta', e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-DEFAULT/60 transition-colors"
                />
                <p className="text-slate-400 text-xs mt-1">Por debajo de este número un anuncio entra en estado Optimizar.</p>
              </div>

              {roasPreview && (
                <div className="bg-green-400/8 border border-green-400/20 rounded-lg px-3 py-2.5">
                  <p className="text-green-400 text-xs font-medium">Vista previa</p>
                  <p className="text-slate-300 text-xs mt-0.5">{roasPreview}</p>
                </div>
              )}
            </>
          )}

          {tab === 'metricas' && (
            <>
              <div className="bg-violet-DEFAULT/5 border border-violet-DEFAULT/15 rounded-xl px-4 py-3 space-y-2">
                <p className="text-white text-xs font-semibold">Umbrales GEM — Estándar Ruta Pro 2026</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Estos valores definen los semáforos verde/amarillo/rojo que ves en Estrategia, Creativos, Alertas e Informe GEM.
                  Los defaults ya vienen calibrados al estándar profesional 2026 — solo ajustalos si tu industria o mercado tiene referencias distintas.
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-green-400/8 border border-green-400/20 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-green-400 text-[10px] font-semibold">Verde</p>
                    <p className="text-green-300 text-[10px]">Dentro del objetivo — mantener o escalar</p>
                  </div>
                  <div className="bg-yellow-400/8 border border-yellow-400/20 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-yellow-400 text-[10px] font-semibold">Amarillo</p>
                    <p className="text-yellow-300 text-[10px]">Zona de atención — monitorear de cerca</p>
                  </div>
                  <div className="bg-red-400/8 border border-red-400/20 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-red-400 text-[10px] font-semibold">Rojo</p>
                    <p className="text-red-300 text-[10px]">Acción inmediata requerida</p>
                  </div>
                </div>
              </div>

              {[
                {
                  titulo: 'CPMr — Costo por 1000 alcance único',
                  nota: `En ${form.moneda || 'tu moneda local'}. Referencia 2026 Argentina: verde < $3.000 · rojo > $7.000. Podés calibrar automáticamente desde tu historial.`,
                  campos: [
                    { key: 'cpmr_verde', label: 'Verde (eficiente) — menor a', color: 'green', hint: form.moneda || 'moneda' },
                    { key: 'cpmr_rojo',  label: 'Rojo (rotar urgente) — mayor a', color: 'red', hint: form.moneda || 'moneda' },
                  ],
                  extraSlot: (
                    <div className="mt-3 space-y-2">
                      {/* Botón calibrar */}
                      <button
                        onClick={() => handleCalibrate(false)}
                        disabled={calibrating}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-DEFAULT/10 border border-violet-DEFAULT/30 text-violet-glow text-xs font-medium hover:bg-violet-DEFAULT/20 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        {calibrating ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                        {calibrating ? 'Analizando historial…' : 'Calibrar con mi historial (90 días)'}
                      </button>

                      {/* Preview resultado */}
                      {calibPreview && !calibPreview.error && (
                        <div className={`rounded-lg px-3 py-2.5 border text-xs space-y-2 ${calibPreview.fuente === 'defaults' ? 'bg-yellow-400/8 border-yellow-400/20' : 'bg-green-400/8 border-green-400/20'}`}>
                          <p className={calibPreview.fuente === 'defaults' ? 'text-yellow-300' : 'text-green-400'}>
                            {calibPreview.fuente === 'defaults' ? '⚠ ' : '✓ '}{calibPreview.motivo}
                          </p>
                          <div className="flex gap-4">
                            <span>🟢 Verde: <strong>${Number(calibPreview.cpmr_verde).toLocaleString('es-AR')}</strong></span>
                            <span>🔴 Rojo: <strong>${Number(calibPreview.cpmr_rojo).toLocaleString('es-AR')}</strong></span>
                          </div>
                          {calibPreview.fuente !== 'defaults' && !calibPreview.aplicado && (
                            <button
                              onClick={() => handleCalibrate(true)}
                              disabled={calibrating}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-400/15 border border-green-400/30 text-green-400 text-xs font-semibold cursor-pointer hover:bg-green-400/25 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle size={12} /> Aplicar estos valores
                            </button>
                          )}
                          {calibPreview.aplicado && (
                            <p className="text-green-400 font-semibold flex items-center gap-1"><Check size={12} /> Aplicado</p>
                          )}
                        </div>
                      )}
                      {calibPreview?.error && (
                        <p className="text-red-400 text-xs">{calibPreview.error}</p>
                      )}
                    </div>
                  )
                },
                {
                  titulo: 'Hook Rate — % que ve el 25% del video',
                  nota: 'Estándar 2026: > 25% verde · < 15% rediseñar el hook',
                  campos: [
                    { key: 'hook_verde', label: 'Verde (potente) — mayor a', color: 'green', hint: '%' },
                    { key: 'hook_rojo',  label: 'Rojo (rediseñar) — menor a', color: 'red', hint: '%' },
                  ]
                },
                {
                  titulo: 'Frecuencia — impactos por persona (7 días, prospecting)',
                  nota: 'Estándar 2026: > 2.5 preparar variaciones · > 3.5 fatiga severa',
                  campos: [
                    { key: 'freq_amarillo', label: 'Amarillo (preparar variaciones) — mayor a', color: 'yellow', hint: 'x' },
                    { key: 'freq_rojo',     label: 'Rojo (fatiga crítica) — mayor a', color: 'red', hint: 'x' },
                  ]
                },
                {
                  titulo: 'CTR — tasa de clics',
                  nota: 'Estándar 2026: > 2% escalar · < 0.5% revisar visual o copy',
                  campos: [
                    { key: 'ctr_bueno', label: 'Bueno (escalar) — mayor a', color: 'green', hint: '%' },
                    { key: 'ctr_malo',  label: 'Malo (revisar) — menor a', color: 'red', hint: '%' },
                  ]
                },
                {
                  titulo: 'Conversiones por semana — Regla de los 50',
                  nota: 'Estándar 2026: < 50 = Andromeda pierde liquidez, CPA sube hasta 50%',
                  campos: [
                    { key: 'conv_semana_verde', label: 'Verde (escalar) — mayor a', color: 'green', hint: 'conv' },
                    { key: 'conv_semana_rojo',  label: 'Rojo (consolidar CBO) — menor a', color: 'red', hint: 'conv' },
                  ]
                },
                {
                  titulo: 'Diversidad de ángulos — Penalización Andromeda',
                  nota: 'Estándar 2026: > 60% similitud = supresión de entrega por redundancia creativa',
                  campos: [
                    { key: 'diversidad_amarillo', label: 'Amarillo — ángulo dominante mayor a', color: 'yellow', hint: '%' },
                    { key: 'diversidad_rojo',     label: 'Rojo (penalización) — mayor a', color: 'red', hint: '%' },
                  ]
                },
              ].map(grupo => (
                <div key={grupo.titulo}>
                  <p className="text-slate-300 text-xs font-semibold mb-1">{grupo.titulo}</p>
                  {grupo.nota && <p className="text-slate-500 text-[10px] mb-2 leading-relaxed">{grupo.nota}</p>}
                  <div className="space-y-2">
                    {grupo.campos.map(({ key, label, color, hint }) => (
                      <div key={key} className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 bg-${color}-400`} />
                        <div className="flex-1">
                          <label className="text-slate-400 text-xs block mb-1">{label}</label>
                          <input
                            type="number"
                            step="any"
                            value={form[key]}
                            onChange={e => set(key, e.target.value)}
                            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-DEFAULT/60 transition-colors"
                          />
                        </div>
                        <span className="text-slate-400 text-xs pt-5 shrink-0">{hint}</span>
                      </div>
                    ))}
                  </div>
                  {grupo.extraSlot}
                </div>
              ))}
            </>
          )}

          {tab === 'token' && (
            <>
              <div className="bg-violet-DEFAULT/5 border border-violet-DEFAULT/15 rounded-xl px-4 py-3">
                <p className="text-white text-xs font-semibold mb-1">¿Cómo renovar el token?</p>
                <ol className="text-slate-400 text-xs leading-relaxed space-y-1 list-decimal list-inside">
                  <li>Abrí el <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" className="text-violet-400 hover:underline inline-flex items-center gap-1">Graph API Explorer <ExternalLink size={10} /></a></li>
                  <li>Seleccioná tu app y hacé clic en <strong className="text-white">Generate Access Token</strong></li>
                  <li>Copiá el token y pegalo abajo — lo convertimos automáticamente a 60 días</li>
                </ol>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-medium mb-1.5 block">Token de Meta (corto o largo)</label>
                <textarea
                  value={tokenCorto}
                  onChange={e => setTokenCorto(e.target.value)}
                  placeholder="EAABwzLixnjYBO..."
                  rows={3}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-violet-DEFAULT/60 transition-colors resize-none"
                />
                <p className="text-slate-400 text-xs mt-1">El token se intercambia automáticamente por uno de 60 días.</p>
              </div>

              {errorToken && (
                <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{errorToken}</p>
              )}
              {savedToken && (
                <div className="bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2.5">
                  <p className="text-green-400 text-xs font-semibold flex items-center gap-1.5">
                    <Check size={13} /> Token actualizado correctamente
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {savedToken.expires_days > 0
                      ? `Expira en ${savedToken.expires_days} días`
                      : 'Token de sistema — no expira'}
                  </p>
                </div>
              )}

              <button
                onClick={handleSaveToken}
                disabled={savingToken || !tokenCorto.trim()}
                className="w-full flex items-center justify-center gap-2 bg-violet-DEFAULT text-white font-semibold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity glow-violet text-sm"
              >
                {savingToken
                  ? <><RefreshCw size={15} className="animate-spin" /> Procesando...</>
                  : <><Key size={15} /> Guardar token</>
                }
              </button>
            </>
          )}

        </div>

        {/* Footer fijo — Guardar */}
        {tab !== 'token' && (
          <div className="px-6 py-4 border-t border-border shrink-0">
            {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-3">{error}</p>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-violet-DEFAULT text-white font-semibold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-60 cursor-pointer transition-opacity glow-violet text-sm"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Guardando...
                </span>
              ) : saved ? (
                <><Check size={16} className="text-green-300" /> Guardado</>
              ) : (
                <><Save size={16} /> Guardar cambios</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
