import { useState } from 'react'
import { TrendingUp, Pause, Copy, Gem, Sparkles, ArrowRight, RefreshCw, Send } from 'lucide-react'
import { recommendationsAPI } from '../services/api'
import { useFetch } from '../hooks/useFetch'
import { PageLoading, ErrorState, Spinner } from '../components/LoadingState'
import { useAccount } from '../context/AccountContext'

const tipoConfig = {
  escalar: { icon: TrendingUp, bg: 'bg-green-400/10 border-green-400/20', accent: 'text-green-400', label: 'Escalar' },
  pausar: { icon: Pause, bg: 'bg-red-400/10 border-red-400/20', accent: 'text-red-400', label: 'Pausar' },
  replicar: { icon: Copy, bg: 'bg-blue-400/10 border-blue-400/20', accent: 'text-blue-400', label: 'Replicar' },
  joya: { icon: Gem, bg: 'bg-orange-DEFAULT/10 border-orange-DEFAULT/20', accent: 'text-orange-DEFAULT', label: 'Joya oculta' },
}

const impactoBadge = {
  Alto: 'bg-violet-DEFAULT/15 text-violet-glow border-violet-DEFAULT/20',
  Medio: 'bg-blue-400/15 text-blue-400 border-blue-400/20',
  Bajo: 'bg-slate-400/15 text-slate-400 border-slate-400/20',
}

export default function Recomendaciones() {
  const { selected: account } = useAccount()
  const { data: recs, loading, error, refetch } = useFetch(() => recommendationsAPI.list())
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState(null)
  const [genError, setGenError] = useState(null)
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState(null)

  const handleSendTelegram = async () => {
    setSending(true)
    setSendMsg(null)
    try {
      await recommendationsAPI.sendTelegram()
      setSendMsg({ type: 'ok', text: 'Recomendaciones enviadas por Telegram.' })
    } catch (e) {
      setSendMsg({ type: 'error', text: e?.response?.data?.detail || 'Error al enviar' })
    } finally {
      setSending(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setGenError(null)
    setGenResult(null)
    try {
      const result = await recommendationsAPI.generate(30, account?.id)
      setGenResult(result)
      refetch()
    } catch (e) {
      setGenError(e?.response?.data?.detail || 'Error al generar recomendaciones')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <PageLoading />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  const isEmpty = !recs || recs.length === 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-violet-glow" />
            <h1 className="text-white text-2xl font-bold">IA Recomendaciones</h1>
          </div>
          <p className="text-slate-400 text-sm">Análisis generado por Claude AI</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isEmpty && (
            <button
              onClick={handleSendTelegram}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-slate-300 font-medium rounded-lg hover:border-violet-DEFAULT/40 hover:text-white transition-all disabled:opacity-60 cursor-pointer text-sm"
              title="Enviar al Telegram del cliente"
            >
              {sending ? <Spinner size={16} /> : <Send size={16} />}
              {sending ? 'Enviando...' : 'Enviar Telegram'}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-violet-DEFAULT text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer glow-violet text-sm"
          >
            {generating ? <Spinner size={16} /> : <RefreshCw size={16} />}
            {generating ? 'Analizando...' : 'Generar análisis'}
          </button>
        </div>
      </div>

      {sendMsg && (
        <div className={`px-4 py-3 rounded-lg border text-sm ${sendMsg.type === 'ok' ? 'bg-green-400/10 border-green-400/20 text-green-400' : 'bg-red-400/10 border-red-400/20 text-red-400'}`}>
          {sendMsg.text}
        </div>
      )}

      {genError && (
        <div className="px-4 py-3 rounded-lg border bg-red-400/10 border-red-400/20 text-red-400 text-sm">
          {genError}
        </div>
      )}

      {genResult && (
        <div className="bg-gradient-to-br from-violet-DEFAULT/10 to-violet-DEFAULT/5 border border-violet-DEFAULT/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={15} className="text-violet-glow" />
            <h2 className="text-violet-glow font-semibold text-sm">Resumen ejecutivo</h2>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">{genResult.resumen}</p>
          {genResult.brief && (
            <div className="mt-4 bg-bg rounded-lg p-4 border border-border font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              <p className="text-violet-glow font-bold mb-2"># BRIEF PARA DISEÑADOR</p>
              {genResult.brief}
            </div>
          )}
        </div>
      )}

      {isEmpty && !genResult ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Sparkles size={40} className="text-violet-glow/40 mb-4" />
          <p className="text-white font-medium mb-2">Sin recomendaciones todavía</p>
          <p className="text-slate-500 text-sm mb-6">Generá un análisis con IA para obtener acciones concretas sobre tus campañas.</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-2.5 bg-violet-DEFAULT text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer glow-violet"
          >
            {generating ? <Spinner size={16} /> : <Sparkles size={16} />}
            {generating ? 'Analizando...' : 'Generar con Claude AI'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(recs || []).map((r) => {
            const t = tipoConfig[r.tipo] || tipoConfig.replicar
            const Icon = t.icon
            return (
              <div key={r.id} className={`bg-surface border rounded-xl p-5 hover:border-violet-DEFAULT/40 transition-all duration-200 ${t.bg}`}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-bg border border-border">
                      <Icon size={17} className={t.accent} />
                    </div>
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-wide ${t.accent}`}>{t.label}</span>
                      <h3 className="text-white font-semibold text-sm leading-tight mt-0.5">{r.titulo}</h3>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${impactoBadge[r.impacto] || impactoBadge.Medio}`}>
                    {r.impacto}
                  </span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">{r.descripcion}</p>
                <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                  <ArrowRight size={14} className={t.accent} />
                  <p className={`text-xs font-medium ${t.accent}`}>{r.accion}</p>
                </div>
                {r.generado_en && (
                  <p className="text-slate-400 text-xs mt-2">
                    Generado {new Date(r.generado_en).toLocaleDateString('es-AR')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
