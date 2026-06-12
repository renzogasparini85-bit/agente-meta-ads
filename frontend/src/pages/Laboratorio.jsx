import { useState } from 'react'
import { FlaskConical, Plus, CheckCircle, XCircle, Clock, Zap, Trash2, X, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import api from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { PageLoading } from '../components/LoadingState'

const METRICAS = [
  { value: 'cpa',   label: 'CPA',           hint: 'menor es mejor' },
  { value: 'ctr',   label: 'CTR (%)',        hint: 'mayor es mejor' },
  { value: 'conv',  label: 'Conversiones',   hint: 'mayor es mejor' },
  { value: 'spend', label: 'Gasto',          hint: 'menor es mejor' },
  { value: 'freq',  label: 'Frecuencia',     hint: 'menor es mejor' },
]

const ESTADO_CFG = {
  activa:     { color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20',   icon: Clock,        label: 'Activa' },
  confirmada: { color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20', icon: CheckCircle,  label: 'Confirmada' },
  refutada:   { color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20',     icon: XCircle,      label: 'Refutada' },
  vencida:    { color: 'text-slate-400',  bg: 'bg-slate-400/10 border-slate-400/20', icon: Clock,        label: 'Vencida' },
}

function fmt(v, prefix = '$') {
  if (v === null || v === undefined) return '—'
  return prefix + Number(v).toLocaleString('es-AR', { maximumFractionDigits: 1 })
}

function Delta({ value }) {
  if (value === null || value === undefined) return <span className="text-slate-500 text-xs">—</span>
  const abs = Math.abs(value)
  if (abs < 1) return <span className="text-slate-400 text-xs flex items-center gap-0.5"><Minus size={10} />{abs.toFixed(1)}%</span>
  return (
    <span className={`text-xs flex items-center gap-0.5 font-semibold ${value > 0 ? 'text-green-400' : 'text-red-400'}`}>
      {value > 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}{abs.toFixed(1)}%
    </span>
  )
}

function NuevaHipotesisModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ titulo: '', descripcion: '', metrica: 'cpa', valor_antes: '', valor_objetivo: '', mejora_pct: '', dias_medicion: 7, notas: '' })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    if (!form.titulo.trim()) return
    setSaving(true)
    try {
      const payload = {
        titulo: form.titulo,
        descripcion: form.descripcion || null,
        metrica: form.metrica,
        dias_medicion: Number(form.dias_medicion),
        notas: form.notas || null,
      }
      if (form.valor_antes !== '') payload.valor_antes = Number(form.valor_antes)
      if (form.valor_objetivo !== '') payload.valor_objetivo = Number(form.valor_objetivo)
      if (form.mejora_pct !== '') payload.mejora_pct = Number(form.mejora_pct)
      const res = await api.post('/hypotheses', payload)
      onCreated(res.data)
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Nueva hipótesis</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-slate-400 text-xs block mb-1">¿Qué vas a probar?</label>
            <input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ej: Pausar GLOBAL REEL reduce el CPA general" className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-DEFAULT/60" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs block mb-1">Métrica a medir</label>
              <select value={form.metrica} onChange={e => set('metrica', e.target.value)} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none cursor-pointer">
                {METRICAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Días de medición</label>
              <input type="number" min={1} max={30} value={form.dias_medicion} onChange={e => set('dias_medicion', e.target.value)} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs block mb-1">Valor actual</label>
              <input type="number" value={form.valor_antes} onChange={e => set('valor_antes', e.target.value)} placeholder="Ej: 2703" className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Mejora esperada (%)</label>
              <input type="number" value={form.mejora_pct} onChange={e => set('mejora_pct', e.target.value)} placeholder="Ej: -30" className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
              <p className="text-slate-600 text-[10px] mt-0.5">Negativo = reducción</p>
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs block mb-1">Notas (opcional)</label>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2} placeholder="Contexto, por qué esperás esa mejora..." className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-none" />
          </div>
        </div>

        <button onClick={handleCreate} disabled={saving || !form.titulo.trim()} className="w-full bg-violet-DEFAULT text-white font-semibold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity text-sm">
          {saving ? 'Guardando...' : 'Crear hipótesis'}
        </button>
      </div>
    </div>
  )
}

function HipotesisCard({ h, onUpdate, onDelete }) {
  const [mediendo, setMediendo] = useState(false)
  const estado = ESTADO_CFG[h.estado] || ESTADO_CFG.activa
  const EstadoIcon = estado.icon
  const metricaLabel = METRICAS.find(m => m.value === h.metrica)?.label || h.metrica

  const handleMedir = async () => {
    setMediendo(true)
    try {
      const res = await api.post(`/hypotheses/${h.id}/medir`)
      onUpdate(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setMediendo(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta hipótesis?')) return
    await api.delete(`/hypotheses/${h.id}`)
    onDelete(h.id)
  }

  const diasRestantes = h.dias_restantes
  const vencida = h.estado === 'activa' && diasRestantes === 0

  return (
    <div className={`bg-surface border rounded-xl p-4 space-y-3 ${vencida ? 'border-yellow-400/30' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-white text-sm font-semibold leading-snug">{h.titulo}</p>
          {h.descripcion && <p className="text-slate-500 text-xs mt-0.5">{h.descripcion}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${estado.bg} ${estado.color}`}>
            <EstadoIcon size={10} /> {estado.label}
          </span>
          <button onClick={handleDelete} className="text-slate-600 hover:text-red-400 cursor-pointer transition-colors"><Trash2 size={13} /></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-slate-500 text-[10px] mb-0.5">Métrica</p>
          <p className="text-white font-medium">{metricaLabel}</p>
        </div>
        <div>
          <p className="text-slate-500 text-[10px] mb-0.5">Antes</p>
          <p className="text-white font-medium">{fmt(h.valor_antes)}</p>
        </div>
        <div>
          <p className="text-slate-500 text-[10px] mb-0.5">Mejora esperada</p>
          <p className="text-white font-medium">{h.mejora_pct != null ? `${h.mejora_pct > 0 ? '+' : ''}${h.mejora_pct}%` : '—'}</p>
        </div>
      </div>

      {(h.estado === 'confirmada' || h.estado === 'refutada') && (
        <div className={`rounded-lg px-3 py-2.5 border text-xs space-y-1 ${h.estado === 'confirmada' ? 'bg-green-400/8 border-green-400/20' : 'bg-red-400/8 border-red-400/20'}`}>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Resultado real:</span>
            <span className="text-white font-semibold">{fmt(h.valor_final)}</span>
            <Delta value={h.delta_real_pct} />
          </div>
          {h.medido_en && <p className="text-slate-500 text-[10px]">Medido: {new Date(h.medido_en).toLocaleDateString('es-AR')}</p>}
        </div>
      )}

      {h.notas && <p className="text-slate-500 text-xs italic border-t border-border pt-2">{h.notas}</p>}

      <div className="flex items-center justify-between pt-1">
        {h.estado === 'activa' && (
          <p className={`text-[10px] ${vencida ? 'text-yellow-400' : 'text-slate-500'}`}>
            {vencida ? '⚠ Listo para medir' : `${diasRestantes} día${diasRestantes === 1 ? '' : 's'} restantes`}
          </p>
        )}
        {h.estado === 'activa' && (
          <button
            onClick={handleMedir}
            disabled={mediendo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-DEFAULT/10 border border-violet-DEFAULT/30 text-violet-glow text-xs font-semibold cursor-pointer hover:bg-violet-DEFAULT/20 transition-colors disabled:opacity-50"
          >
            <Zap size={11} /> {mediendo ? 'Midiendo...' : 'Medir ahora'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Laboratorio() {
  const { data: initialData, loading } = useFetch(() => api.get('/hypotheses').then(r => r.data))
  const [items, setItems] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const list = items ?? initialData ?? []

  if (loading) return <PageLoading />

  const activas    = list.filter(h => h.estado === 'activa')
  const finalizadas = list.filter(h => h.estado !== 'activa')
  const tasa = finalizadas.length > 0
    ? Math.round(finalizadas.filter(h => h.estado === 'confirmada').length / finalizadas.length * 100)
    : null

  return (
    <div className="space-y-6">
      {showModal && (
        <NuevaHipotesisModal
          onClose={() => setShowModal(false)}
          onCreated={h => setItems(prev => [h, ...(prev ?? initialData ?? [])])}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold flex items-center gap-2">
            <FlaskConical size={22} className="text-violet-glow" /> Laboratorio de Hipótesis
          </h1>
          <p className="text-slate-400 text-sm mt-1">Registrá experimentos, establecé expectativas y medí resultados reales</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-DEFAULT text-white font-semibold rounded-xl hover:opacity-90 cursor-pointer transition-opacity text-sm shrink-0"
        >
          <Plus size={15} /> Nueva hipótesis
        </button>
      </div>

      {/* Stats */}
      {list.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Activas',     value: activas.length,                      color: 'text-blue-400' },
            { label: 'Confirmadas', value: finalizadas.filter(h => h.estado === 'confirmada').length, color: 'text-green-400' },
            { label: 'Tasa de acierto', value: tasa !== null ? `${tasa}%` : '—', color: tasa >= 60 ? 'text-green-400' : tasa !== null ? 'text-yellow-400' : 'text-slate-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface border border-border rounded-xl p-3 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FlaskConical size={40} className="text-slate-600 mb-4" />
          <p className="text-white font-medium mb-1">Sin hipótesis registradas</p>
          <p className="text-slate-500 text-sm mb-4">Creá tu primera hipótesis antes de ejecutar un cambio en tu cuenta</p>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-violet-DEFAULT text-white font-semibold rounded-xl hover:opacity-90 cursor-pointer transition-opacity text-sm">
            <Plus size={15} /> Crear primera hipótesis
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {activas.length > 0 && (
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">En curso</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activas.map(h => (
                  <HipotesisCard
                    key={h.id} h={h}
                    onUpdate={updated => setItems(prev => (prev ?? initialData ?? []).map(x => x.id === updated.id ? updated : x))}
                    onDelete={id => setItems(prev => (prev ?? initialData ?? []).filter(x => x.id !== id))}
                  />
                ))}
              </div>
            </div>
          )}
          {finalizadas.length > 0 && (
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Finalizadas</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {finalizadas.map(h => (
                  <HipotesisCard
                    key={h.id} h={h}
                    onUpdate={updated => setItems(prev => (prev ?? initialData ?? []).map(x => x.id === updated.id ? updated : x))}
                    onDelete={id => setItems(prev => (prev ?? initialData ?? []).filter(x => x.id !== id))}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
