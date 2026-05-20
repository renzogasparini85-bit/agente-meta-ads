import { useState, useEffect } from 'react'
import { X, Globe, Search, CheckCircle, XCircle, AlertTriangle, ExternalLink, Copy, RefreshCw, Plus, Code, BookOpen, ChevronDown, ChevronRight } from 'lucide-react'
import { useAccount } from '../context/AccountContext'
import api from '../services/api'

const pixelAPI = {
  status:  (aid) => api.get('/pixel/status', { params: aid ? { account_id: String(aid) } : {} }).then(r => r.data),
  detect:  (sitio_web, aid) => api.post('/pixel/detect', { sitio_web, account_id: aid ? String(aid) : null }).then(r => r.data),
  create:  (nombre, aid) => api.post('/pixel/create', { nombre, account_id: aid ? String(aid) : null }).then(r => r.data),
  snippet: (pixel_id) => api.get(`/pixel/snippet/${pixel_id}`).then(r => r.data),
  saveUrl: (sitio_web, aid) => api.put('/pixel/sitio-web', { sitio_web, account_id: aid ? String(aid) : null }).then(r => r.data),
}

function StatusBadge({ ok, label }) {
  if (ok === true)  return <span className="flex items-center gap-1 text-green-400 text-xs font-medium"><CheckCircle size={12} />{label}</span>
  if (ok === false) return <span className="flex items-center gap-1 text-red-400 text-xs font-medium"><XCircle size={12} />{label}</span>
  return <span className="flex items-center gap-1 text-yellow-400 text-xs font-medium"><AlertTriangle size={12} />{label}</span>
}

function CopyBtn({ text }) {
  const [done, setDone] = useState(false)
  const copy = () => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) }
  return (
    <button onClick={copy} className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs cursor-pointer transition-colors">
      {done ? <CheckCircle size={11} className="text-green-400" /> : <Copy size={11} />}
      {done ? 'Copiado' : 'Copiar'}
    </button>
  )
}

function Collapsible({ title, icon: Icon, iconColor = 'text-slate-400', children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors cursor-pointer"
      >
        <Icon size={15} className={iconColor} />
        <span className="flex-1 text-left text-white text-sm font-medium">{title}</span>
        {open ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
      </button>
      {open && <div className="border-t border-border px-4 py-4 bg-bg">{children}</div>}
    </div>
  )
}

function SnippetViewer({ pixelId, onClose }) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState('manual')

  useEffect(() => {
    pixelAPI.snippet(pixelId).then(setData).finally(() => setLoading(false))
  }, [pixelId])

  if (loading) return <div className="text-slate-500 text-xs text-center py-4">Cargando snippet…</div>

  const tabs = [
    { id: 'manual',    label: 'HTML manual' },
    { id: 'wordpress', label: 'WordPress' },
    { id: 'gtm',       label: 'Google Tag Manager' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-semibold">Código de instalación</p>
          <p className="text-slate-500 text-xs">Pixel ID: <span className="font-mono text-white">{pixelId}</span></p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer"><X size={16} /></button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg rounded-lg p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer
              ${tab === t.id ? 'bg-surface text-white' : 'text-slate-500 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'manual' && (
        <div className="space-y-3">
          <div className="bg-bg border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-xs font-medium">Pegá esto en el &lt;head&gt; de todas tus páginas</p>
              <CopyBtn text={data.snippet_js} />
            </div>
            <pre className="text-green-400 text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
              {data.snippet_js}
            </pre>
          </div>
          <div className="bg-yellow-400/8 border border-yellow-400/20 rounded-lg px-3 py-2 text-yellow-400 text-xs">
            ⚠ Copiá el código antes del cierre de la etiqueta <code>&lt;/head&gt;</code>, no en el body.
          </div>
        </div>
      )}

      {tab === 'wordpress' && (
        <div className="space-y-4">
          <p className="text-slate-400 text-xs">Tres formas de instalar el Pixel en WordPress:</p>

          <div className="space-y-3">
            <div className="bg-bg border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">1</div>
                <p className="text-white text-xs font-semibold">Plugin oficial de Meta (recomendado)</p>
              </div>
              <ol className="text-slate-400 text-xs space-y-1 list-none pl-0">
                <li>1. Instalá el plugin <span className="text-white font-medium">"Meta Pixel for WordPress"</span> desde Plugins → Agregar nuevo</li>
                <li>2. Activalo y andá a <span className="text-white">Configuración → Meta Pixel</span></li>
                <li>3. Pegá tu Pixel ID:</li>
              </ol>
              <div className="flex items-center gap-2 mt-2 bg-surface border border-border rounded-lg px-3 py-2">
                <code className="text-violet-glow text-sm font-mono flex-1">{pixelId}</code>
                <CopyBtn text={pixelId} />
              </div>
              <a href="https://wordpress.org/plugins/official-facebook-pixel/" target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:underline text-xs mt-2">
                <ExternalLink size={10} /> Descargar plugin
              </a>
            </div>

            <div className="bg-bg border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-violet-DEFAULT/20 flex items-center justify-center text-violet-glow text-xs font-bold">2</div>
                <p className="text-white text-xs font-semibold">PixelYourSite (más completo)</p>
              </div>
              <ol className="text-slate-400 text-xs space-y-1">
                <li>1. Instalá <span className="text-white font-medium">"PixelYourSite"</span> desde el repositorio de WordPress</li>
                <li>2. Activalo → andá a <span className="text-white">PixelYourSite → Facebook Pixel</span></li>
                <li>3. Pegá tu Pixel ID y activá eventos automáticos (ViewContent, AddToCart, etc.)</li>
              </ol>
              <div className="flex items-center gap-2 mt-2 bg-surface border border-border rounded-lg px-3 py-2">
                <code className="text-violet-glow text-sm font-mono flex-1">{pixelId}</code>
                <CopyBtn text={pixelId} />
              </div>
              <a href="https://wordpress.org/plugins/pixelyoursite/" target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:underline text-xs mt-2">
                <ExternalLink size={10} /> Descargar plugin
              </a>
            </div>

            <div className="bg-bg border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-slate-500/20 flex items-center justify-center text-slate-400 text-xs font-bold">3</div>
                <p className="text-white text-xs font-semibold">Manual vía header.php</p>
              </div>
              <ol className="text-slate-400 text-xs space-y-1">
                <li>1. Andá a <span className="text-white">Apariencia → Editor de temas → header.php</span></li>
                <li>2. Buscá la etiqueta <code className="text-slate-300">&lt;/head&gt;</code></li>
                <li>3. Pegá el snippet justo antes de esa etiqueta</li>
              </ol>
              <div className="flex items-center justify-between mt-2">
                <p className="text-slate-600 text-xs">Ver snippet completo en la tab "HTML manual"</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'gtm' && (
        <div className="space-y-3">
          <div className="space-y-3">
            <div className="bg-bg border border-border rounded-xl p-4">
              <p className="text-white text-xs font-semibold mb-3">Instalación via Google Tag Manager</p>
              <ol className="text-slate-400 text-xs space-y-2">
                <li><span className="text-white font-medium">1.</span> Abrí GTM → <span className="text-white">Etiquetas → Nueva</span></li>
                <li><span className="text-white font-medium">2.</span> Tipo de etiqueta: <span className="text-white">HTML personalizado</span></li>
                <li><span className="text-white font-medium">3.</span> Pegá este código:</li>
              </ol>
              <div className="mt-3 bg-surface border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-500 text-xs">HTML personalizado</p>
                  <CopyBtn text={data.snippet_gtm} />
                </div>
                <pre className="text-green-400 text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                  {data.snippet_gtm}
                </pre>
              </div>
              <ol className="text-slate-400 text-xs space-y-2 mt-3">
                <li><span className="text-white font-medium">4.</span> Activador: <span className="text-white">Todas las páginas (Page View)</span></li>
                <li><span className="text-white font-medium">5.</span> Guardá y publicá el contenedor</li>
              </ol>
            </div>

            <div className="bg-blue-400/8 border border-blue-400/20 rounded-lg px-3 py-2 text-blue-400 text-xs">
              💡 GTM es la opción más recomendada si ya lo tenés instalado — centralizás todos tus tags sin tocar el código del sitio.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PixelMeta({ onClose }) {
  const { selected: account } = useAccount()
  const accountId = account?.id || null

  const [url, setUrl]             = useState('')
  const [loading, setLoading]     = useState(false)
  const [scanning, setScanning]   = useState(false)
  const [creating, setCreating]   = useState(false)
  const [newPixelName, setNewPixelName] = useState('')
  const [status, setStatus]       = useState(null)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState(null)
  const [snippetPixel, setSnippetPixel] = useState(null)
  const [createError, setCreateError]   = useState(null)
  const [createSuccess, setCreateSuccess] = useState(null)

  useEffect(() => {
    setLoading(true)
    pixelAPI.status(accountId)
      .then(d => { setStatus(d); if (d.sitio_web) setUrl(d.sitio_web) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accountId])

  const handleScan = async () => {
    if (!url.trim()) return
    setScanning(true); setError(null); setResult(null)
    try {
      const d = await pixelAPI.detect(url.trim(), accountId)
      setResult(d)
      setStatus(prev => ({ ...prev, sitio_web: d.url }))
    } catch (e) {
      const detail = e?.response?.data?.detail
      setError(Array.isArray(detail) ? JSON.stringify(detail) : (detail || 'Error al escanear el sitio'))
    } finally { setScanning(false) }
  }

  const handleCreate = async () => {
    if (!newPixelName.trim()) return
    setCreating(true); setCreateError(null); setCreateSuccess(null)
    try {
      const d = await pixelAPI.create(newPixelName.trim(), accountId)
      setCreateSuccess(d)
      setNewPixelName('')
      // Refrescar lista
      const s = await pixelAPI.status(accountId)
      setStatus(s)
    } catch (e) {
      const detail = e?.response?.data?.detail
      setCreateError(detail || 'Error al crear el pixel')
    } finally { setCreating(false) }
  }

  const accountPixels = status?.account_pixels || []
  const detectedIds   = new Set((result?.detectados || []).map(p => p.pixel_id))

  if (snippetPixel) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4" onClick={() => setSnippetPixel(null)}>
        <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="p-5">
            <SnippetViewer pixelId={snippetPixel} onClose={() => setSnippetPixel(null)} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <Globe size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Pixel de Meta</p>
              <p className="text-slate-500 text-xs">{account ? `Cuenta: ${account.nombre}` : 'Global'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">

          {/* Pixels activos */}
          {accountPixels.length > 0 && (
            <div>
              <p className="text-slate-400 text-xs font-medium mb-2">Pixels en tu cuenta</p>
              <div className="space-y-2">
                {accountPixels.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-bg border border-border rounded-xl px-3 py-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white text-xs font-mono font-semibold">{p.id}</p>
                        {result && (detectedIds.has(p.id)
                          ? <span className="text-green-400 text-xs">✓ detectado en sitio</span>
                          : <span className="text-yellow-400 text-xs">⚠ no detectado en sitio</span>
                        )}
                      </div>
                      {p.name && <p className="text-slate-500 text-xs">{p.name}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSnippetPixel(p.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-violet-DEFAULT/10 border border-violet-DEFAULT/20 text-violet-glow text-xs hover:bg-violet-DEFAULT/20 cursor-pointer transition-colors"
                      >
                        <Code size={11} /> Instalar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detectar pixel en sitio */}
          <Collapsible title="Detectar Pixel en mi sitio web" icon={Search} iconColor="text-blue-400" defaultOpen={true}>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScan()}
                  placeholder="https://tusitio.com"
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                />
                <button
                  onClick={handleScan}
                  disabled={scanning || !url.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/15 border border-blue-500/30 text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-500/25 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {scanning ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                  {scanning ? 'Escaneando…' : 'Detectar'}
                </button>
              </div>

              {error && <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 text-red-400 text-xs">{error}</div>}

              {result && (
                <div className={`rounded-xl border px-4 py-3 ${result.ok ? 'bg-green-400/8 border-green-400/20' : 'bg-red-400/8 border-red-400/20'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white text-xs font-semibold">Resultado</p>
                    <StatusBadge ok={result.ok} label={result.ok ? `${result.detectados.length} pixel${result.detectados.length !== 1 ? 's' : ''} encontrado${result.detectados.length !== 1 ? 's' : ''}` : 'Sin pixel'} />
                  </div>
                  {result.detectados.length > 0 ? (
                    result.detectados.map(p => (
                      <div key={p.pixel_id} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-white text-xs font-mono font-semibold">{p.pixel_id}</p>
                          {p.nombre && <p className="text-slate-400 text-xs">{p.nombre}</p>}
                        </div>
                        <StatusBadge ok={p.en_cuenta} label={p.en_cuenta ? 'En tu cuenta' : 'No vinculado'} />
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-xs">No se encontró el Pixel en <span className="text-white">{result.url}</span>. Instalalo usando el botón <strong>Instalar</strong> del pixel de arriba.</p>
                  )}
                </div>
              )}
            </div>
          </Collapsible>

          {/* Crear nuevo pixel */}
          <Collapsible title="Crear nuevo Pixel" icon={Plus} iconColor="text-green-400">
            <div className="space-y-3">
              <p className="text-slate-400 text-xs">Creá un Pixel nuevo directamente desde acá — sin ir a Meta Business Suite.</p>
              <div className="flex gap-2">
                <input
                  value={newPixelName}
                  onChange={e => setNewPixelName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="Nombre del pixel (ej: Sitio Principal)"
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-green-500/50"
                />
                <button
                  onClick={handleCreate}
                  disabled={creating || !newPixelName.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-400/15 border border-green-400/30 text-green-400 text-sm font-medium rounded-lg hover:bg-green-400/25 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {creating ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                  {creating ? 'Creando…' : 'Crear'}
                </button>
              </div>
              {createError   && <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 text-red-400 text-xs">{createError}</div>}
              {createSuccess && (
                <div className="bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3">
                  <p className="text-green-400 text-xs font-semibold mb-1">✓ Pixel creado exitosamente</p>
                  <div className="flex items-center gap-2">
                    <code className="text-white text-sm font-mono">{createSuccess.pixel_id}</code>
                    <CopyBtn text={createSuccess.pixel_id} />
                  </div>
                  <button
                    onClick={() => setSnippetPixel(createSuccess.pixel_id)}
                    className="mt-2 flex items-center gap-1 text-violet-glow text-xs hover:underline cursor-pointer"
                  >
                    <Code size={11} /> Ver código de instalación
                  </button>
                </div>
              )}
            </div>
          </Collapsible>

          {/* Guía de instalación */}
          <Collapsible title="Cómo instalar el Pixel" icon={BookOpen} iconColor="text-violet-glow">
            <div className="space-y-2 text-slate-400 text-xs">
              <p>Elegí un pixel de la lista de arriba y hacé click en <span className="text-white font-medium">Instalar</span> para ver el código y las instrucciones paso a paso para:</p>
              <ul className="space-y-1 pl-3">
                <li className="flex items-center gap-2"><CheckCircle size={11} className="text-green-400 shrink-0" /> HTML manual (pegado en &lt;head&gt;)</li>
                <li className="flex items-center gap-2"><CheckCircle size={11} className="text-green-400 shrink-0" /> WordPress — Plugin oficial de Meta</li>
                <li className="flex items-center gap-2"><CheckCircle size={11} className="text-green-400 shrink-0" /> WordPress — PixelYourSite</li>
                <li className="flex items-center gap-2"><CheckCircle size={11} className="text-green-400 shrink-0" /> Google Tag Manager</li>
              </ul>
            </div>
          </Collapsible>

          {/* Footer */}
          <div className="pt-1 border-t border-border flex items-center justify-between">
            <a href="https://business.facebook.com/events_manager" target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-slate-500 hover:text-blue-400 text-xs transition-colors">
              <ExternalLink size={12} /> Events Manager
            </a>
            <a href="https://developers.facebook.com/docs/meta-pixel/get-started" target="_blank" rel="noreferrer"
              className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
              Documentación oficial
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}
