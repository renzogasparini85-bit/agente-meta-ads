import { useState, useEffect } from 'react'
import { Pause, PlusCircle, Copy, TrendingUp, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Minus, Plus, X, Edit3, DollarSign, Megaphone, Trash2 } from 'lucide-react'
import { actionLogAPI } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { PageLoading, ErrorState } from '../components/LoadingState'
import api from '../services/api'

const tipoConfig = {
  pause:           { icon: Pause,       color: 'text-orange-DEFAULT', bg: 'bg-orange-DEFAULT/10 border-orange-DEFAULT/20', label: 'Pausa' },
  budget_change:   { icon: DollarSign,  color: 'text-green-400',      bg: 'bg-green-400/10 border-green-400/20',           label: 'Presupuesto' },
  duplicate:       { icon: Copy,        color: 'text-blue-400',       bg: 'bg-blue-400/10 border-blue-400/20',             label: 'Duplicar' },
  create_campaign: { icon: Megaphone,   color: 'text-violet-glow',    bg: 'bg-violet-DEFAULT/10 border-violet-DEFAULT/20', label: 'Campaña' },
  create_adset:    { icon: PlusCircle,  color: 'text-violet-glow',    bg: 'bg-violet-DEFAULT/10 border-violet-DEFAULT/20', label: 'Conjunto' },
  create_ad:       { icon: PlusCircle,  color: 'text-cyan-400',       bg: 'bg-cyan-400/10 border-cyan-400/20',             label: 'Anuncio' },
  activate:        { icon: TrendingUp,  color: 'text-green-400',      bg: 'bg-green-400/10 border-green-400/20',           label: 'Activar' },
  otro:            { icon: Edit3,       color: 'text-slate-400',      bg: 'bg-slate-400/10 border-slate-400/20',           label: 'Manual' },
}

const TIPOS_MANUAL = [
  { value: 'pause',           label: 'Pausa' },
  { value: 'activate',        label: 'Activar' },
  { value: 'budget_change',   label: 'Cambio de presupuesto' },
  { value: 'create_campaign', label: 'Nueva campaña' },
  { value: 'create_adset',    label: 'Nuevo conjunto' },
  { value: 'create_ad',       label: 'Nuevo anuncio' },
  { value: 'duplicate',       label: 'Duplicar' },
  { value: 'otro',            label: 'Otro' },
]

function RegistrarModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ tipo: 'create_campaign', descripcion: '', meta_id: '' })
  const [saving, setSaving] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get('/campaigns/names').then(r => setCampaigns(r.data || [])).catch(() => {}).finally(() => setLoadingCampaigns(false))
  }, [])

  const handleSelectCampaign = (e) => {
    const selected = campaigns.find(c => c.id === e.target.value)
    if (selected) {
      set('meta_id', selected.id)
      if (!form.descripcion.trim()) set('descripcion', selected.nombre)
    } else {
      set('meta_id', '')
    }
  }

  const handleSave = async () => {
    if (!form.descripcion.trim()) return
    setSaving(true)
    try {
      const res = await api.post('/action-log', {
        tipo: form.tipo,
        descripcion: form.descripcion.trim(),
        meta_id: form.meta_id.trim() || null,
        resultado: 'ok',
      })
      onCreated(res.data)
      onClose()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Registrar acción manual</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-slate-400 text-xs block mb-1">Tipo de acción</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none cursor-pointer">
              {TIPOS_MANUAL.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-slate-400 text-xs block mb-1">
              Campaña de Meta
              {loadingCampaigns && <span className="text-slate-600 ml-1">(cargando...)</span>}
            </label>
            <select
              onChange={handleSelectCampaign}
              defaultValue=""
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none cursor-pointer"
            >
              <option value="">— Seleccionar campaña (opcional) —</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.estado === 'ACTIVE' ? '✓' : '·'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 text-xs block mb-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              rows={3}
              placeholder="Ej: Creé campaña 'CLIMASET JULIO' con objetivo mensajes, presupuesto $5.000/día CBO"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-DEFAULT/60 resize-none"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs block mb-1">ID de Meta <span className="text-slate-600">(se completa al elegir campaña)</span></label>
            <input
              value={form.meta_id}
              onChange={e => set('meta_id', e.target.value)}
              placeholder="Ej: 120215195928601182"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-DEFAULT/60"
            />
            <p className="text-slate-600 text-[10px] mt-1">Con el ID vinculado podés ver el impacto antes/después</p>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving || !form.descripcion.trim()}
          className="w-full bg-violet-DEFAULT text-white font-semibold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity text-sm">
          {saving ? 'Guardando...' : 'Registrar acción'}
        </button>
      </div>
    </div>
  )
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function fmt(v, prefix = '$', decimals = 0) {
  if (v === null || v === undefined) return '—'
  return prefix + Number(v).toLocaleString('es-AR', { maximumFractionDigits: decimals })
}

function Delta({ value, invertido = false }) {
  if (value === null || value === undefined) return <span className="text-slate-500">—</span>
  const positivo = invertido ? value < 0 : value > 0
  const neutro = Math.abs(value) < 1
  if (neutro) return <span className="text-slate-400 flex items-center gap-0.5"><Minus size={10} /> {Math.abs(value).toFixed(1)}%</span>
  return (
    <span className={`flex items-center gap-0.5 font-semibold ${positivo ? 'text-green-400' : 'text-red-400'}`}>
      {positivo ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function ImpactPanel({ logId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    if (loaded) return
    setLoading(true)
    try {
      const res = await api.get(`/action-log/${logId}/impact`)
      setData(res.data)
    } catch {
      setData({ available: false, motivo: 'Error al cargar' })
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }

  if (!loaded) {
    return (
      <button onClick={load} className="text-xs text-violet-400 hover:text-violet-300 cursor-pointer transition-colors flex items-center gap-1 mt-2">
        <TrendingUp size={11} /> Ver impacto
      </button>
    )
  }

  if (loading) return <p className="text-xs text-slate-500 mt-2">Cargando...</p>

  if (!data?.available) {
    return <p className="text-xs text-slate-500 mt-2 italic">{data?.motivo || 'Sin datos'}</p>
  }

  const { before, after, delta, dias_medicion } = data

  return (
    <div className="mt-3 bg-bg rounded-xl border border-border p-3 space-y-2">
      <p className="text-slate-400 text-[10px] uppercase tracking-wider">Impacto · {dias_medicion} días antes vs después</p>
      <div className="grid grid-cols-4 gap-2 text-xs">
        {[
          { label: 'CPA',   b: fmt(before.cpa), a: fmt(after.cpa), d: delta.cpa,   inv: true },
          { label: 'Gasto', b: fmt(before.spend), a: fmt(after.spend), d: delta.spend, inv: true },
          { label: 'Conv',  b: before.conv, a: after.conv, d: delta.conv, inv: false, prefix: '' },
          { label: 'CTR',   b: fmt(before.ctr, '', 2)+'%', a: fmt(after.ctr, '', 2)+'%', d: delta.ctr, inv: false },
        ].map(({ label, b, a, d, inv }) => (
          <div key={label} className="text-center">
            <p className="text-slate-500 text-[10px] mb-1">{label}</p>
            <p className="text-slate-400 line-through text-[10px]">{b}</p>
            <p className="text-white font-semibold">{a}</p>
            <Delta value={d} invertido={inv} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Timeline() {
  const { data, loading, error, refetch } = useFetch(() => actionLogAPI.list(100))
  const [expanded, setExpanded] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [extra, setExtra] = useState([])
  const [deleting, setDeleting] = useState(null)

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta acción?')) return
    setDeleting(id)
    try {
      await api.delete(`/action-log/${id}`)
      setExtra(e => e.filter(l => l.id !== id))
      // refetch para limpiar del listado principal también
      refetch()
    } catch (e) { console.error(e) }
    finally { setDeleting(null) }
  }

  if (loading) return <PageLoading />
  if (error)   return <ErrorState message={error} onRetry={refetch} />

  const allData = [...extra, ...(data || [])]
  const empty = allData.length === 0

  return (
    <div className="space-y-6">
      {showModal && (
        <RegistrarModal
          onClose={() => setShowModal(false)}
          onCreated={log => setExtra(e => [log, ...e])}
        />
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Historial de acciones</h1>
          <p className="text-slate-400 text-sm mt-1">Acciones ejecutadas desde el panel y registradas manualmente</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-DEFAULT text-white font-semibold rounded-xl hover:opacity-90 cursor-pointer transition-opacity text-sm shrink-0"
        >
          <Plus size={15} /> Registrar acción
        </button>
      </div>

      {empty ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Clock size={40} className="text-slate-400 mb-4" />
          <p className="text-white font-medium mb-1">Sin acciones registradas</p>
          <p className="text-slate-500 text-sm">Las pausas, escaladas y cambios de presupuesto aparecerán acá.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-3">
            {allData.map((log) => {
              const t = tipoConfig[log.tipo] || tipoConfig.pause
              const Icon = t.icon
              const ok = log.resultado === 'ok'
              const isOpen = expanded[log.id]
              return (
                <div key={log.id} className="flex gap-4 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border z-10 ${t.bg}`}>
                    <Icon size={16} className={t.color} />
                  </div>
                  <div className="flex-1 bg-surface border border-border rounded-xl p-4 hover:border-violet-DEFAULT/30 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${t.bg} ${t.color}`}>
                          {t.label}
                        </span>
                        {ok
                          ? <CheckCircle size={12} className="text-green-400" />
                          : <XCircle size={12} className="text-red-400" />}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 text-xs">{fmtDate(log.ejecutado_en)}</span>
                        <button
                          onClick={() => handleDelete(log.id)}
                          disabled={deleting === log.id}
                          className="text-slate-600 hover:text-red-400 cursor-pointer transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm">{log.descripcion}</p>
                    {log.meta_id && (
                      <p className="text-slate-500 text-xs mt-1">ID: {log.meta_id}</p>
                    )}
                    {ok && log.meta_id && (
                      <button
                        onClick={() => setExpanded(e => ({ ...e, [log.id]: !e[log.id] }))}
                        className="text-xs text-violet-400 hover:text-violet-300 cursor-pointer transition-colors flex items-center gap-1 mt-2"
                      >
                        <TrendingUp size={11} />
                        {isOpen ? 'Ocultar impacto' : 'Ver impacto'}
                        {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>
                    )}
                    {isOpen && <ImpactPanel logId={log.id} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
