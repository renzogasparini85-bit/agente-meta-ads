import { useState } from 'react'
import { X, Settings, Save, Check, TrendingUp, MessageCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
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
  const [tab, setTab] = useState('cpa')
  const [form, setForm] = useState({
    moneda:            client?.moneda            || 'ARS',
    cpa_escalar:       client?.cpa_escalar       || 500,
    cpa_replicar:      client?.cpa_replicar      || 650,
    cpa_pausar:        client?.cpa_pausar        || 900,
    ticket_promedio:   client?.ticket_promedio   || '',
    tasa_cierre:       client?.tasa_cierre       || '',
    roas_meta:         client?.roas_meta         || 3,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

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
      }
      if (form.ticket_promedio !== '') payload.ticket_promedio = Number(form.ticket_promedio)
      if (form.tasa_cierre !== '')     payload.tasa_cierre     = Number(form.tasa_cierre)

      const res = await api.put('/clients/me/settings', payload)
      updateClient({
        moneda:          res.data.moneda,
        cpa_escalar:     res.data.cpa_escalar,
        cpa_replicar:    res.data.cpa_replicar,
        cpa_pausar:      res.data.cpa_pausar,
        ticket_promedio: res.data.ticket_promedio,
        tasa_cierre:     res.data.tasa_cierre,
        roas_meta:       res.data.roas_meta,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
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
            { id: 'cpa',  label: 'CPA & Umbrales', icon: TrendingUp },
            { id: 'roas', label: 'ROAS Híbrido',   icon: MessageCircle },
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

        <div className="px-6 py-5 space-y-5">

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
                      <span className="text-slate-600 text-xs pt-5">{form.moneda}</span>
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
                <p className="text-slate-600 text-xs mt-1">Valor promedio de lo que paga un cliente cuando cierra.</p>
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
                <p className="text-slate-600 text-xs mt-1">De cada 100 mensajes que recibís, ¿cuántos compran?</p>
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
                <p className="text-slate-600 text-xs mt-1">Por debajo de este número un anuncio entra en estado Optimizar.</p>
              </div>

              {roasPreview && (
                <div className="bg-green-400/8 border border-green-400/20 rounded-lg px-3 py-2.5">
                  <p className="text-green-400 text-xs font-medium">Vista previa</p>
                  <p className="text-slate-300 text-xs mt-0.5">{roasPreview}</p>
                </div>
              )}
            </>
          )}

          {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

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
      </div>
    </div>
  )
}
