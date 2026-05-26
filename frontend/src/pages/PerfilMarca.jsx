import { useState, useEffect } from 'react'
import { X, Building2, Users, Megaphone, Star, Zap, CheckCircle, XCircle, Trophy, Save, Check, Loader2, ChevronDown } from 'lucide-react'
import { brandAPI } from '../services/api'
import { useAccount } from '../context/AccountContext'

const TONOS = [
  { value: 'profesional',    label: 'Profesional',    desc: 'Serio, técnico, con autoridad' },
  { value: 'cercano',        label: 'Cercano',         desc: 'Amigable, conversacional, cálido' },
  { value: 'inspiracional',  label: 'Inspiracional',  desc: 'Motivador, aspiracional, emocional' },
  { value: 'urgente',        label: 'Urgente',         desc: 'Directo, presión por tiempo/escasez' },
  { value: 'divertido',      label: 'Divertido',       desc: 'Humor, descontracturado, creativo' },
  { value: 'exclusivo',      label: 'Exclusivo',       desc: 'Premium, selecto, para pocos' },
]

const SECCIONES = [
  { id: 'identidad',    label: 'Identidad',     icon: Building2 },
  { id: 'audiencia',    label: 'Audiencia',     icon: Users },
  { id: 'mensaje',      label: 'Mensaje clave', icon: Megaphone },
  { id: 'diferencial',  label: 'Diferencial',   icon: Star },
]

export default function PerfilMarca({ onClose }) {
  const { selected: account } = useAccount()
  const accountId = account?.id || null
  const [seccion, setSeccion] = useState('identidad')
  const [form, setForm] = useState({
    marca_nombre: '',
    marca_descripcion: '',
    marca_publico: '',
    marca_tono: '',
    marca_propuesta_valor: '',
    marca_beneficios: '',
    marca_palabras_si: '',
    marca_palabras_no: '',
    marca_competidores: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    brandAPI.get(accountId)
      .then(data => {
        setForm(prev => ({
          ...prev,
          ...Object.fromEntries(Object.entries(data).filter(([k, v]) => v !== null && !['account_id','account_nombre','scope'].includes(k))),
        }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accountId])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await brandAPI.save(form, accountId)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const completado = Object.values(form).filter(v => v && v.trim()).length
  const total = Object.keys(form).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-DEFAULT/20 border border-orange-DEFAULT/30 flex items-center justify-center">
              <Building2 size={16} className="text-orange-DEFAULT" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Perfil de Marca</h2>
              <p className="text-slate-500 text-xs">
                {account ? (
                  <span>Cuenta: <span className="text-violet-glow font-medium">{account.nombre}</span></span>
                ) : (
                  'Perfil global — aplica a todas las cuentas'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Progreso */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-DEFAULT rounded-full transition-all"
                  style={{ width: `${Math.round((completado / total) * 100)}%` }}
                />
              </div>
              <span className="text-slate-500 text-xs">{completado}/{total}</span>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white cursor-pointer transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0 px-2">
          {SECCIONES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSeccion(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                seccion === id
                  ? 'border-violet-DEFAULT text-violet-glow'
                  : 'border-transparent text-slate-500 hover:text-white'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="text-violet-DEFAULT animate-spin" />
            </div>
          ) : (
            <>
              {/* ── Identidad ── */}
              {seccion === 'identidad' && (
                <div className="space-y-4">
                  <SectionHint icon="🏢" title="¿Quién sos?" text="Describí tu marca como se la contarías a un amigo. La IA usa esto como punto de partida para cualquier copy." />

                  <Field label="Nombre de la marca / empresa" required>
                    <input
                      value={form.marca_nombre}
                      onChange={e => set('marca_nombre', e.target.value)}
                      placeholder="Ej: Natura Argentina, TechFlow, Academia Movimiento"
                      className={inputCls}
                    />
                  </Field>

                  <Field label="¿Qué hace tu empresa? (2-4 oraciones)" required>
                    <textarea
                      value={form.marca_descripcion}
                      onChange={e => set('marca_descripcion', e.target.value)}
                      rows={3}
                      placeholder="Ej: Somos una marca de cosméticos naturales que fabrica productos sin parabenos ni químicos agresivos. Vendemos online y en puntos de venta seleccionados de CABA y GBA. Nuestros clientes nos eligen por la transparencia en los ingredientes y el packaging sustentable."
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Tono de comunicación" required>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                      {TONOS.map(t => (
                        <button
                          key={t.value}
                          onClick={() => set('marca_tono', t.value)}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                            form.marca_tono === t.value
                              ? 'bg-violet-DEFAULT/20 border-violet-DEFAULT/50 text-white'
                              : 'border-border text-slate-400 hover:border-slate-500 hover:text-white'
                          }`}
                        >
                          <p className="text-xs font-medium">{t.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-tight">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Competidores de referencia (opcionales)">
                    <textarea
                      value={form.marca_competidores}
                      onChange={e => set('marca_competidores', e.target.value)}
                      rows={2}
                      placeholder="Ej: Lush, Natura, The Body Shop — marcas que respetamos o contra las que competimos"
                      className={inputCls}
                    />
                    <p className="text-slate-400 text-xs mt-1">La IA los usa como referencia de posicionamiento, no para copiarlos.</p>
                  </Field>
                </div>
              )}

              {/* ── Audiencia ── */}
              {seccion === 'audiencia' && (
                <div className="space-y-4">
                  <SectionHint icon="🎯" title="¿A quién le hablás?" text="Cuanto más específico sea el perfil del cliente ideal, más relevante será el copy generado." />

                  <Field label="Cliente ideal" required>
                    <textarea
                      value={form.marca_publico}
                      onChange={e => set('marca_publico', e.target.value)}
                      rows={4}
                      placeholder={`Describí a tu cliente ideal con el mayor detalle posible:\n\n• Edad y género: Ej: Mujeres 25-45 años\n• Situación: Ej: Profesionales con poco tiempo libre\n• Problema que tienen: Ej: Quieren cuidar su piel pero no saben qué productos son seguros\n• Qué los motiva a comprar: precio, resultados, valores de la marca\n• Dónde están geográficamente`}
                      className={inputCls}
                    />
                  </Field>
                </div>
              )}

              {/* ── Mensaje clave ── */}
              {seccion === 'mensaje' && (
                <div className="space-y-4">
                  <SectionHint icon="💬" title="¿Cómo comunicás?" text="Estas palabras y frases le dan a la IA el vocabulario exacto de tu marca." />

                  <Field label="Palabras y frases que SÍ usar" hint="Una por línea">
                    <textarea
                      value={form.marca_palabras_si}
                      onChange={e => set('marca_palabras_si', e.target.value)}
                      rows={4}
                      placeholder={`natural\nsin conservantes\ntransparencia\nhecho en Argentina\ncuidado real\nsin complicaciones`}
                      className={`${inputCls} font-mono text-xs`}
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {form.marca_palabras_si?.split('\n').filter(Boolean).map((p, i) => (
                        <span key={i} className="bg-green-400/10 text-green-400 border border-green-400/20 text-xs px-2 py-0.5 rounded-full">
                          {p.trim()}
                        </span>
                      ))}
                    </div>
                  </Field>

                  <Field label="Palabras y frases que NO usar" hint="Una por línea">
                    <textarea
                      value={form.marca_palabras_no}
                      onChange={e => set('marca_palabras_no', e.target.value)}
                      rows={3}
                      placeholder={`barato\nofertas locas\ngratis\nincreíble (sobreusado)`}
                      className={`${inputCls} font-mono text-xs`}
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {form.marca_palabras_no?.split('\n').filter(Boolean).map((p, i) => (
                        <span key={i} className="bg-red-400/10 text-red-400 border border-red-400/20 text-xs px-2 py-0.5 rounded-full">
                          {p.trim()}
                        </span>
                      ))}
                    </div>
                  </Field>
                </div>
              )}

              {/* ── Diferencial ── */}
              {seccion === 'diferencial' && (
                <div className="space-y-4">
                  <SectionHint icon="⚡" title="¿Por qué te eligen?" text="La propuesta de valor y los beneficios son el núcleo de cada anuncio. La IA los usa en cada copy que genera." />

                  <Field label="Propuesta de valor única" required>
                    <textarea
                      value={form.marca_propuesta_valor}
                      onChange={e => set('marca_propuesta_valor', e.target.value)}
                      rows={3}
                      placeholder="Ej: Somos la única marca de cosméticos que publica el 100% de los ingredientes con su origen y función. No hay letra chica en nuestros productos."
                      className={inputCls}
                    />
                    <p className="text-slate-400 text-xs mt-1">Una sola oración poderosa que nadie más pueda decir.</p>
                  </Field>

                  <Field label="Beneficios principales" hint="Uno por línea (3 a 6 beneficios)">
                    <textarea
                      value={form.marca_beneficios}
                      onChange={e => set('marca_beneficios', e.target.value)}
                      rows={5}
                      placeholder={`Sin parabenos ni sulfatos\nIngredientes con origen certificado\nPackaging 100% reciclado\nEnvío en 24hs a todo el país\nDevolución sin preguntas`}
                      className={`${inputCls} font-mono text-xs`}
                    />
                    <div className="flex flex-col gap-1 mt-1.5">
                      {form.marca_beneficios?.split('\n').filter(Boolean).map((b, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-slate-300">
                          <CheckCircle size={11} className="text-green-400 shrink-0" />
                          {b.trim()}
                        </div>
                      ))}
                    </div>
                  </Field>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center gap-3">
          <div className="flex-1">
            {error && <p className="text-red-400 text-xs">{error}</p>}
            {saved && (
              <p className="text-green-400 text-xs flex items-center gap-1">
                <Check size={12} /> Perfil guardado — la IA lo usará en el próximo copy
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {/* Navegación entre secciones */}
            {SECCIONES.findIndex(s => s.id === seccion) > 0 && (
              <button
                onClick={() => setSeccion(SECCIONES[SECCIONES.findIndex(s => s.id === seccion) - 1].id)}
                className="px-4 py-2 border border-border rounded-lg text-slate-400 hover:text-white text-xs cursor-pointer transition-colors"
              >
                Anterior
              </button>
            )}
            {SECCIONES.findIndex(s => s.id === seccion) < SECCIONES.length - 1 ? (
              <button
                onClick={() => setSeccion(SECCIONES[SECCIONES.findIndex(s => s.id === seccion) + 1].id)}
                className="px-4 py-2 bg-violet-DEFAULT/20 border border-violet-DEFAULT/30 rounded-lg text-violet-glow text-xs cursor-pointer transition-colors hover:bg-violet-DEFAULT/30"
              >
                Siguiente →
              </button>
            ) : null}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-violet-DEFAULT text-white font-semibold px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-60 cursor-pointer transition-opacity glow-violet text-sm"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
              {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar perfil'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helpers
const inputCls = "w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-DEFAULT/60 transition-colors resize-none"

function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="text-slate-300 text-xs font-medium mb-1.5 flex items-center gap-1.5 block">
        {label}
        {required && <span className="text-violet-glow">*</span>}
        {hint && <span className="text-slate-400 font-normal">— {hint}</span>}
      </label>
      {children}
    </div>
  )
}

function SectionHint({ icon, title, text }) {
  return (
    <div className="bg-violet-DEFAULT/5 border border-violet-DEFAULT/15 rounded-xl px-4 py-3 flex gap-3 mb-2">
      <span className="text-lg shrink-0">{icon}</span>
      <div>
        <p className="text-white text-xs font-semibold">{title}</p>
        <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{text}</p>
      </div>
    </div>
  )
}
