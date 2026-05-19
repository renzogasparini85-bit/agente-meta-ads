import { useState } from 'react'
import { X, Plus, Trash2, Settings, Check, Loader2, ChevronDown, ChevronUp, RefreshCw, Download } from 'lucide-react'
import { adAccountsAPI, metaOAuthAPI } from '../services/api'
import { useAccount } from '../context/AccountContext'

const COLORES = [
  { value: 'violet', label: 'Violeta', cls: 'bg-violet-DEFAULT' },
  { value: 'orange', label: 'Naranja', cls: 'bg-orange-DEFAULT' },
  { value: 'green',  label: 'Verde',   cls: 'bg-green-400' },
  { value: 'blue',   label: 'Azul',    cls: 'bg-blue-400' },
  { value: 'cyan',   label: 'Cian',    cls: 'bg-cyan-400' },
]

const MONEDAS = ['ARS', 'USD', 'MXN', 'COP', 'BRL', 'CLP', 'PEN', 'EUR']

const inputCls = "w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-DEFAULT/60 transition-colors placeholder:text-slate-600"
const labelCls = "text-slate-400 text-xs mb-1 block"

// ─── Formulario nueva cuenta ──────────────────────────────────────────────────
function NuevaCuentaForm({ onSaved, onCancel }) {
  const [idInput, setIdInput]   = useState('')
  const [preview, setPreview]   = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [form, setForm]         = useState({ nombre: '', moneda: 'ARS', color: 'violet', campaign_filter: '' })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const verificar = async () => {
    if (!idInput.trim()) return
    setVerifying(true); setError(null); setPreview(null)
    try {
      const data = await adAccountsAPI.verifyMeta(idInput.trim())
      setPreview(data)
      setForm(f => ({ ...f, nombre: data.nombre, moneda: data.moneda }))
    } catch (e) {
      setError(e?.response?.data?.detail || 'No se encontró la cuenta')
    } finally { setVerifying(false) }
  }

  const handleSave = async () => {
    if (!preview) return
    setSaving(true); setError(null)
    try {
      await adAccountsAPI.create({ nombre: form.nombre, meta_ad_account_id: preview.account_id, moneda: form.moneda, color: form.color, campaign_filter: form.campaign_filter || null })
      onSaved()
    } catch (e) {
      setError(e?.response?.data?.detail || 'Error al agregar')
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-bg border border-violet-DEFAULT/30 rounded-xl p-4 space-y-3">
      <p className="text-white text-xs font-semibold">Agregar cuenta publicitaria</p>

      {/* Buscador por ID */}
      <div>
        <label className={labelCls}>ID de la cuenta</label>
        <div className="flex gap-2">
          <input
            value={idInput}
            onChange={e => { setIdInput(e.target.value); setPreview(null); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && verificar()}
            placeholder="act_XXXXXXXXX o solo el número"
            className={inputCls}
          />
          <button onClick={verificar} disabled={verifying || !idInput.trim()}
            className="px-3 py-2 text-xs bg-violet-DEFAULT/20 border border-violet-DEFAULT/40 text-violet-glow rounded-lg hover:bg-violet-DEFAULT/30 cursor-pointer transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5">
            {verifying ? <Loader2 size={11} className="animate-spin" /> : 'Verificar'}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>

      {/* Preview de la cuenta encontrada */}
      {preview && (
        <>
          <div className="bg-surface border border-green-400/20 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Check size={12} className="text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{preview.nombre}</p>
                <p className="text-slate-500 text-[10px] font-mono">{preview.account_id} · {preview.moneda} · {preview.status}</p>
              </div>
              {preview.ya_agregada && <span className="text-[10px] text-orange-400">Ya agregada</span>}
            </div>
          </div>

          <div>
            <label className={labelCls}>Nombre amigable (editá si querés)</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>
              Filtro de cliente
              <span className="text-slate-600 ml-1 font-normal">— opcional</span>
            </label>
            <input value={form.campaign_filter} onChange={e => set('campaign_filter', e.target.value)}
              placeholder="Ej: climaset — solo muestra campañas con ese nombre"
              className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Moneda</label>
              <select value={form.moneda} onChange={e => set('moneda', e.target.value)}
                className={`${inputCls} cursor-pointer`}>
                {MONEDAS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Color</label>
              <div className="flex gap-2 mt-1.5">
                {COLORES.map(c => (
                  <button key={c.value} onClick={() => set('color', c.value)}
                    className={`w-5 h-5 rounded-full cursor-pointer transition-all ${c.cls} ${form.color === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-bg' : 'opacity-50 hover:opacity-100'}`}
                    title={c.label} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 text-xs text-slate-400 border border-border rounded-lg hover:text-white cursor-pointer transition-colors">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving || !preview || preview.ya_agregada}
          className="flex-1 py-2 text-xs bg-violet-DEFAULT text-white rounded-lg hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity flex items-center justify-center gap-1.5">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          {preview?.ya_agregada ? 'Ya en tu lista' : 'Agregar cuenta'}
        </button>
      </div>
    </div>
  )
}

// ─── Panel de edición completa ────────────────────────────────────────────────
function EditPanel({ acc, onSaved, onCancel }) {
  const [form, setForm] = useState({
    nombre:             acc.nombre             || '',
    moneda:             acc.moneda             || 'ARS',
    color:              acc.color              || 'violet',
    meta_page_id:       acc.meta_page_id       || '',
    meta_ig_account_id: acc.meta_ig_account_id || '',
    campaign_filter:    acc.campaign_filter    || '',
  })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const [saved, setSaved]       = useState(false)
  const [pages, setPages]       = useState(null)
  const [loadingPages, setLoadingPages] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const buscarPaginas = async () => {
    setLoadingPages(true)
    try {
      const data = await adAccountsAPI.pagesFromMeta()
      setPages(data)
    } catch (e) {
      alert(e?.response?.data?.detail || 'Error al buscar páginas')
    } finally { setLoadingPages(false) }
  }

  const seleccionarPagina = (p) => {
    set('meta_page_id', p.page_id)
    if (p.ig_id) set('meta_ig_account_id', p.ig_id)
    setPages(null)
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) { setError('El nombre no puede estar vacío'); return }
    setSaving(true); setError(null)
    try {
      await adAccountsAPI.update(acc.id, {
        nombre:             form.nombre,
        moneda:             form.moneda,
        color:              form.color,
        meta_page_id:       form.meta_page_id       || '',
        meta_ig_account_id: form.meta_ig_account_id || '',
        campaign_filter:    form.campaign_filter     || '',
      })
      setSaved(true)
      setTimeout(() => { setSaved(false); onSaved() }, 800)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-bg border border-violet-DEFAULT/30 rounded-xl p-4 space-y-4">

      {/* Sección: Meta Ads */}
      <div>
        <p className="text-violet-glow text-xs font-semibold mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-DEFAULT inline-block" />
          Meta Ads
        </p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Nombre amigable</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Meta Ad Account ID</label>
            <input value={acc.meta_ad_account_id} readOnly
              className={`${inputCls} opacity-50 cursor-not-allowed`} />
            <p className="text-slate-600 text-[10px] mt-1">El Account ID no se puede modificar una vez creado</p>
          </div>

          <div>
            <label className={labelCls}>
              Filtro de cliente
              <span className="text-slate-600 ml-1 font-normal">— opcional, para separar clientes dentro del mismo ad account</span>
            </label>
            <input
              value={form.campaign_filter}
              onChange={e => set('campaign_filter', e.target.value)}
              placeholder="Ej: climaset, WT, David Neumaticos..."
              className={inputCls}
            />
            <p className="text-slate-600 text-[10px] mt-1">
              Solo muestra campañas cuyo nombre contiene este texto. Dejalo vacío para ver todas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Moneda</label>
              <select value={form.moneda} onChange={e => set('moneda', e.target.value)}
                className={`${inputCls} cursor-pointer`}>
                {MONEDAS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Color en sidebar</label>
              <div className="flex gap-2 mt-1.5">
                {COLORES.map(c => (
                  <button key={c.value} onClick={() => set('color', c.value)}
                    className={`w-5 h-5 rounded-full cursor-pointer transition-all ${c.cls} ${form.color === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-bg' : 'opacity-50 hover:opacity-100'}`}
                    title={c.label} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Separador */}
      <div className="border-t border-border" />

      {/* Sección: Orgánico */}
      <div>
        <p className="text-green-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          Contenido Orgánico
        </p>
        <p className="text-slate-600 text-[10px] mb-3">
          Necesario para ver métricas de posts, reels e historias en la sección Orgánico.
        </p>
        <div className="space-y-3">

          {/* Selector de páginas desde Meta */}
          <button onClick={buscarPaginas} disabled={loadingPages}
            className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-green-400/30 rounded-lg text-green-400 hover:bg-green-400/8 cursor-pointer transition-colors text-xs disabled:opacity-60">
            {loadingPages ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            Buscar mis páginas de Facebook
          </button>

          {pages && (
            <div className="bg-bg border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {pages.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-3">No se encontraron páginas</p>
              ) : pages.map(p => (
                <button key={p.page_id} onClick={() => seleccionarPagina(p)}
                  className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-surface cursor-pointer transition-colors border-b border-border last:border-0 text-left">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{p.nombre}</p>
                    <p className="text-slate-600 text-[10px] font-mono mt-0.5">ID: {p.page_id}</p>
                  </div>
                  {p.ig_id ? (
                    <span className="text-[10px] text-pink-400 bg-pink-400/10 border border-pink-400/20 rounded px-1.5 py-0.5 shrink-0">+ IG</span>
                  ) : (
                    <span className="text-[10px] text-slate-600 shrink-0">solo FB</span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div>
            <label className={labelCls}>
              ID de Página de Facebook
              <span className="text-slate-600 ml-1 font-normal">— métricas orgánicas FB</span>
            </label>
            <input
              value={form.meta_page_id}
              onChange={e => set('meta_page_id', e.target.value)}
              placeholder="Ej: 123456789012345"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              ID de cuenta de Instagram Business
              <span className="text-slate-600 ml-1 font-normal">— métricas orgánicas IG</span>
            </label>
            <input
              value={form.meta_ig_account_id}
              onChange={e => set('meta_ig_account_id', e.target.value)}
              placeholder="Ej: 17841400000000000"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 text-xs text-slate-400 border border-border rounded-lg hover:text-white cursor-pointer transition-colors">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving || saved}
          className={`flex-1 py-2 text-xs rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            saved ? 'bg-green-500 text-white' : 'bg-violet-DEFAULT text-white hover:opacity-90 disabled:opacity-60'
          }`}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Check size={12} />}
          {saved ? 'Guardado' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

// ─── Panel importar desde Meta ────────────────────────────────────────────────
function ImportarDesdeMeta({ onImported }) {
  const [loading, setLoading]   = useState(false)
  const [cuentas, setCuentas]   = useState(null)
  const [adding, setAdding]     = useState(null)
  const [error, setError]       = useState(null)

  const cargar = async () => {
    setLoading(true); setError(null)
    try {
      const data = await adAccountsAPI.fromMeta()
      setCuentas(data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Error al consultar Meta')
    } finally { setLoading(false) }
  }

  const agregar = async (c) => {
    setAdding(c.account_id)
    try {
      await adAccountsAPI.create({ nombre: c.nombre, meta_ad_account_id: c.account_id, moneda: c.moneda, color: 'violet' })
      setCuentas(prev => prev.map(x => x.account_id === c.account_id ? { ...x, ya_agregada: true } : x))
      onImported()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Error al agregar')
    } finally { setAdding(null) }
  }

  if (!cuentas) return (
    <button onClick={cargar} disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-violet-DEFAULT/40 rounded-xl text-violet-glow hover:bg-violet-DEFAULT/8 cursor-pointer transition-colors text-xs disabled:opacity-60">
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
      Importar cuentas desde Meta
    </button>
  )

  if (error) return <p className="text-red-400 text-xs text-center py-2">{error}</p>

  return (
    <div className="bg-bg border border-border rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white text-xs font-semibold">Cuentas disponibles en Meta</p>
        <button onClick={cargar} className="text-slate-500 hover:text-white cursor-pointer transition-colors">
          <RefreshCw size={12} />
        </button>
      </div>
      {cuentas.map(c => (
        <div key={c.account_id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-surface">
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{c.nombre}</p>
            <p className="text-slate-600 text-[10px] font-mono mt-0.5">{c.account_id} · {c.moneda}</p>
          </div>
          {c.status !== 'activa' && (
            <span className="text-[10px] text-slate-500 bg-slate-800 border border-border rounded px-1.5 py-0.5">{c.status}</span>
          )}
          {c.ya_agregada ? (
            <span className="text-[10px] text-green-400 flex items-center gap-1"><Check size={10} /> Agregada</span>
          ) : (
            <button onClick={() => agregar(c)} disabled={adding === c.account_id}
              className="text-[10px] text-violet-glow border border-violet-DEFAULT/40 rounded-lg px-2.5 py-1 hover:bg-violet-DEFAULT/15 cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1">
              {adding === c.account_id ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
              Agregar
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Renovar token Meta ───────────────────────────────────────────────────────
function RenovarToken({ onRenewed }) {
  const [open, setOpen]     = useState(false)
  const [token, setToken]   = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null) // {ok, days} | {error}

  const handleSave = async () => {
    if (!token.trim()) return
    setLoading(true)
    setStatus(null)
    try {
      const res = await metaOAuthAPI.exchangeToken(token.trim())
      setStatus({ ok: true, days: res.expires_days })
      setToken('')
      setOpen(false)
      onRenewed?.()
    } catch (e) {
      setStatus({ error: e?.response?.data?.detail || 'Token inválido' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-border rounded-xl p-4 space-y-3">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 text-left cursor-pointer">
        <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
          <RefreshCw size={13} className="text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-white text-xs font-medium">Renovar token de Meta</p>
          <p className="text-slate-500 text-[10px]">Pegá un token del Graph API Explorer → se convierte a 60 días</p>
        </div>
        {open ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
      </button>

      {open && (
        <div className="space-y-2 pt-1">
          <p className="text-slate-500 text-[10px] leading-relaxed">
            1. Ir a <span className="text-blue-400">developers.facebook.com/tools/explorer</span><br/>
            2. Seleccionar tu app → Generate Access Token<br/>
            3. Copiar el token y pegarlo acá
          </p>
          <textarea
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="EAAxxxxxxx..."
            rows={3}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-white text-xs font-mono resize-none focus:outline-none focus:border-violet-DEFAULT/50 placeholder-slate-600"
          />
          {status?.ok && (
            <p className="text-green-400 text-xs flex items-center gap-1">
              <Check size={11} /> Token guardado · válido por ~{status.days} días
            </p>
          )}
          {status?.error && (
            <p className="text-red-400 text-xs">{status.error}</p>
          )}
          <button onClick={handleSave} disabled={loading || !token.trim()}
            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg text-white text-xs font-medium cursor-pointer transition-colors">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {loading ? 'Guardando...' : 'Guardar token'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export default function GestionCuentas({ onClose }) {
  const { accounts, selected, setSelected, reload } = useAccount()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]     = useState(null)
  const [deleting, setDeleting] = useState(null)

  const handleDelete = async (acc) => {
    if (!window.confirm(`¿Eliminar "${acc.nombre}"?`)) return
    setDeleting(acc.id)
    try {
      await adAccountsAPI.delete(acc.id)
      reload()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Error al eliminar')
    } finally { setDeleting(null) }
  }

  const colorDot = (color) => {
    const map = { violet: 'bg-violet-DEFAULT', orange: 'bg-orange-DEFAULT', green: 'bg-green-400', blue: 'bg-blue-400', cyan: 'bg-cyan-400' }
    return map[color] || 'bg-violet-DEFAULT'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-white font-semibold text-sm">Gestionar cuentas</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3 max-h-[75vh] overflow-y-auto">
          {accounts.map(acc => (
            <div key={acc.id} className="space-y-2">
              <div
                className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-colors cursor-pointer ${
                  selected?.id === acc.id ? 'border-violet-DEFAULT/40 bg-violet-DEFAULT/8' : 'border-border hover:border-slate-600'
                }`}
                onClick={() => { setSelected(acc); if (editId === acc.id) setEditId(null) }}
              >
                <div className={`w-3 h-3 rounded-full shrink-0 ${colorDot(acc.color)}`} />

                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{acc.nombre}</p>
                  <p className="text-slate-600 text-xs font-mono mt-0.5">{acc.meta_ad_account_id} · {acc.moneda}</p>
                  {(acc.meta_page_id || acc.meta_ig_account_id) && (
                    <div className="flex gap-2 mt-1">
                      {acc.meta_page_id && (
                        <span className="text-[10px] text-blue-400/70 bg-blue-400/10 border border-blue-400/20 rounded px-1.5 py-0.5">FB configurado</span>
                      )}
                      {acc.meta_ig_account_id && (
                        <span className="text-[10px] text-pink-400/70 bg-pink-400/10 border border-pink-400/20 rounded px-1.5 py-0.5">IG configurado</span>
                      )}
                    </div>
                  )}
                </div>

                {selected?.id === acc.id && <Check size={13} className="text-violet-glow shrink-0" />}

                <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setEditId(editId === acc.id ? null : acc.id)}
                    className={`p-1.5 rounded-lg cursor-pointer transition-colors ${editId === acc.id ? 'text-violet-glow bg-violet-DEFAULT/15' : 'text-slate-500 hover:text-white'}`}
                    title="Configurar cuenta">
                    {editId === acc.id ? <ChevronUp size={13} /> : <Settings size={13} />}
                  </button>
                  <button onClick={() => handleDelete(acc)} disabled={deleting === acc.id || accounts.length <= 1}
                    className="p-1.5 text-slate-500 hover:text-red-400 cursor-pointer transition-colors disabled:opacity-30">
                    {deleting === acc.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>

              {editId === acc.id && (
                <EditPanel
                  acc={acc}
                  onSaved={() => { setEditId(null); reload() }}
                  onCancel={() => setEditId(null)}
                />
              )}
            </div>
          ))}

          <RenovarToken onRenewed={reload} />
          <ImportarDesdeMeta onImported={reload} />

          {showForm ? (
            <NuevaCuentaForm
              onSaved={() => { setShowForm(false); reload() }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <button onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-xl text-slate-500 hover:text-white hover:border-slate-500 cursor-pointer transition-colors text-xs">
              <Plus size={13} />
              Agregar manualmente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
