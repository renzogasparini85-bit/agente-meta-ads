/**
 * Exporta una tarjeta de resumen como imagen PNG usando Canvas API nativo.
 * No requiere dependencias externas.
 */
import { useState } from 'react'
import { Download, Share2, Loader } from 'lucide-react'

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function generateCard({ marca, periodo, kpis, topCreativos, moneda = 'ARS' }) {
  const W = 1080, H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // KPIs vienen como { value, change } — extraer el valor numérico
  const val = (k) => {
    const v = kpis?.[k]
    if (v == null) return null
    return typeof v === 'object' ? v.value : v
  }

  const fmt = (n) => n != null ? Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '—'

  // Fondo oscuro
  ctx.fillStyle = '#0d1117'
  ctx.fillRect(0, 0, W, H)

  // Gradiente superior violeta
  const grad = ctx.createLinearGradient(0, 0, W, 0)
  grad.addColorStop(0, '#7c3aed22')
  grad.addColorStop(1, '#00000000')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, 300)

  // Borde decorativo top
  ctx.fillStyle = '#7c3aed'
  ctx.fillRect(0, 0, W, 4)

  // Logo / marca pill
  ctx.fillStyle = '#7c3aed33'
  drawRoundRect(ctx, 60, 50, 200, 36, 18)
  ctx.fill()
  ctx.fillStyle = '#a78bfa'
  ctx.font = 'bold 14px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('META ADS AI', 160, 73)

  // Título marca
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 56px -apple-system, sans-serif'
  ctx.fillText(marca, 60, 180)

  ctx.fillStyle = '#64748b'
  ctx.font = '24px -apple-system, sans-serif'
  ctx.fillText(periodo, 60, 220)

  // Línea separadora
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(60, 260)
  ctx.lineTo(W - 60, 260)
  ctx.stroke()

  // KPI Cards (3 en fila)
  const gastoVal = val('gasto')
  const convVal  = val('conversaciones')
  const cpaVal   = val('cpa')

  const kpiData = [
    { label: 'Inversión',      value: gastoVal != null ? `$${fmt(gastoVal)}` : '—', sub: moneda,     color: '#7c3aed' },
    { label: 'Conversaciones', value: convVal  != null ? fmt(convVal)          : '—', sub: 'total',   color: '#f97316' },
    { label: 'CPA',            value: cpaVal   != null ? `$${fmt(cpaVal)}`     : '—', sub: 'por conv.',color: '#7c3aed' },
  ]

  const cardW = (W - 120 - 40) / 3
  kpiData.forEach((kpi, i) => {
    const cx = 60 + i * (cardW + 20)
    const cy = 290

    // Card background
    ctx.fillStyle = '#161b22'
    drawRoundRect(ctx, cx, cy, cardW, 160, 16)
    ctx.fill()

    // Accent line
    ctx.fillStyle = kpi.color
    ctx.fillRect(cx, cy, 4, 160)

    ctx.fillStyle = '#94a3b8'
    ctx.font = '18px -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(kpi.label, cx + 24, cy + 48)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 42px -apple-system, sans-serif'
    ctx.fillText(kpi.value, cx + 24, cy + 108)

    ctx.fillStyle = '#475569'
    ctx.font = '16px -apple-system, sans-serif'
    ctx.fillText(kpi.sub, cx + 24, cy + 136)
  })

  // Top creativos
  if (topCreativos?.length > 0) {
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Top creativos del período', 60, 530)

    const badgeColors = {
      escalar: ['#22c55e22', '#22c55e'],
      replicar: ['#60a5fa22', '#60a5fa'],
      retener: ['#7c3aed22', '#a78bfa'],
      pausar: ['#ef444422', '#ef4444'],
    }

    topCreativos.slice(0, 3).forEach((c, i) => {
      const ry = 560 + i * 130
      const [bgColor, acColor] = badgeColors[c.badge] || ['#1e293b', '#64748b']

      ctx.fillStyle = '#161b22'
      drawRoundRect(ctx, 60, ry, W - 120, 110, 12)
      ctx.fill()

      // Rank number
      ctx.fillStyle = '#1e293b'
      drawRoundRect(ctx, 76, ry + 20, 56, 56, 8)
      ctx.fill()
      ctx.fillStyle = acColor
      ctx.font = 'bold 28px -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`#${i + 1}`, 104, ry + 55)

      // Nombre
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '18px -apple-system, sans-serif'
      ctx.textAlign = 'left'
      const nombre = c.nombre?.length > 55 ? c.nombre.slice(0, 55) + '…' : (c.nombre || '—')
      ctx.fillText(nombre, 152, ry + 44)

      // Badge
      ctx.fillStyle = bgColor
      drawRoundRect(ctx, 152, ry + 62, 90, 26, 13)
      ctx.fill()
      ctx.fillStyle = acColor
      ctx.font = 'bold 13px -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText((c.badge || '').toUpperCase(), 197, ry + 79)

      // Métricas
      ctx.fillStyle = '#64748b'
      ctx.font = '15px -apple-system, sans-serif'
      ctx.textAlign = 'right'
      const metStr = `CPA $${fmt(c.cpa)} · CTR ${c.ctr}% · ${c.conversaciones} conv.`
      ctx.fillText(metStr, W - 80, ry + 60)
    })
  }

  // Footer
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(0, H - 80, W, 80)
  ctx.fillStyle = '#64748b'
  ctx.font = '16px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`Generado por Meta Ads AI · ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}`, W / 2, H - 30)

  return canvas
}

export default function ExportCard({ kpis, topCreativos, marca, periodo, moneda }) {
  const [loading, setLoading] = useState(false)

  const handleExport = () => {
    setLoading(true)
    try {
      const canvas = generateCard({ marca, periodo, kpis, topCreativos, moneda })
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `resumen-${marca?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(url)
        setLoading(false)
      }, 'image/png')
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  const handleShare = async () => {
    setLoading(true)
    try {
      const canvas = generateCard({ marca, periodo, kpis, topCreativos, moneda })
      canvas.toBlob(async blob => {
        const file = new File([blob], 'resumen.png', { type: 'image/png' })
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `Resumen ${marca}` })
        } else {
          // Fallback: copiar al portapapeles
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          alert('Imagen copiada al portapapeles')
        }
        setLoading(false)
      }, 'image/png')
    } catch (e) {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 bg-surface border border-border text-slate-300 text-sm font-medium rounded-lg hover:border-violet-DEFAULT/40 hover:text-white transition-all disabled:opacity-60 cursor-pointer"
        title="Descargar resumen como imagen"
      >
        {loading ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
        Exportar
      </button>
      <button
        onClick={handleShare}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 bg-surface border border-border text-slate-300 text-sm font-medium rounded-lg hover:border-violet-DEFAULT/40 hover:text-white transition-all disabled:opacity-60 cursor-pointer"
        title="Compartir resumen"
      >
        <Share2 size={14} />
        Compartir
      </button>
    </div>
  )
}
