import { useState } from 'react'
import { ChevronDown, ChevronRight, BookOpen, Zap, Target, TrendingUp, AlertTriangle, BarChart2, Layers, Star, Info, CheckCircle, XCircle, HelpCircle } from 'lucide-react'

// ── Acordeón ─────────────────────────────────────────────────────
function Section({ icon: Icon, title, subtitle, color = 'text-violet-400', children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors cursor-pointer text-left"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/5 border border-border`}>
          <Icon size={17} className={color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{title}</p>
          {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
        {open
          ? <ChevronDown size={16} className="text-slate-500 shrink-0" />
          : <ChevronRight size={16} className="text-slate-500 shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-border px-5 py-5 space-y-4 text-sm">
          {children}
        </div>
      )}
    </div>
  )
}

function Callout({ type = 'info', children }) {
  const styles = {
    info:    { bg: 'bg-blue-400/8  border-blue-400/20',   icon: Info,         text: 'text-blue-300'   },
    tip:     { bg: 'bg-green-400/8 border-green-400/20',  icon: CheckCircle,  text: 'text-green-300'  },
    warn:    { bg: 'bg-yellow-400/8 border-yellow-400/20', icon: AlertTriangle, text: 'text-yellow-300' },
    beginner:{ bg: 'bg-violet-400/8 border-violet-400/20', icon: Star,         text: 'text-violet-300' },
  }
  const s = styles[type] || styles.info
  const Icon = s.icon
  return (
    <div className={`rounded-xl border px-4 py-3 flex gap-3 ${s.bg}`}>
      <Icon size={15} className={`${s.text} shrink-0 mt-0.5`} />
      <p className={`text-xs leading-relaxed ${s.text}`}>{children}</p>
    </div>
  )
}

function MetricRow({ label, formula, simple, good, warn, bad }) {
  return (
    <div className="bg-bg border border-border rounded-xl p-4 space-y-2">
      <p className="text-white font-semibold text-sm">{label}</p>
      {formula && <p className="text-slate-500 text-[11px] font-mono bg-slate-800/60 rounded px-2 py-1 inline-block">{formula}</p>}
      <p className="text-slate-300 text-xs leading-relaxed">{simple}</p>
      {(good || warn || bad) && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          {good && <div className="bg-green-400/8 border border-green-400/20 rounded-lg px-2 py-1.5 text-center"><p className="text-green-400 text-[10px] font-semibold">Bien ✓</p><p className="text-green-300 text-[11px]">{good}</p></div>}
          {warn && <div className="bg-yellow-400/8 border border-yellow-400/20 rounded-lg px-2 py-1.5 text-center"><p className="text-yellow-400 text-[10px] font-semibold">Atención ⚡</p><p className="text-yellow-300 text-[11px]">{warn}</p></div>}
          {bad  && <div className="bg-red-400/8 border border-red-400/20 rounded-lg px-2 py-1.5 text-center"><p className="text-red-400 text-[10px] font-semibold">Acción 🔴</p><p className="text-red-300 text-[11px]">{bad}</p></div>}
        </div>
      )}
    </div>
  )
}

function BadgeRow({ color, label, icon, desc }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 mt-0.5 ${color}`}>{label}</span>
      <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
    </div>
  )
}

function ScoreBar({ label, pts, max, desc }) {
  const pct = (pts / max) * 100
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400 text-xs w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-violet-400/60 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-slate-500 text-[10px] w-10 text-right shrink-0">{pts} pts</span>
      <span className="text-slate-500 text-[10px] hidden sm:block">{desc}</span>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function Guia() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-white text-2xl font-bold flex items-center gap-3">
          <BookOpen size={22} className="text-violet-400" />
          Guía del sistema
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Cómo funciona la plataforma, qué mide cada métrica y cómo interpretar los resultados — explicado para principiantes y expertos.
        </p>
      </div>

      {/* 1. Qué hace este sistema */}
      <Section icon={HelpCircle} title="¿Qué hace este sistema?" subtitle="Para entender la lógica general" color="text-blue-400" defaultOpen>
        <p className="text-slate-300 leading-relaxed">
          Esta plataforma conecta directamente con tu cuenta de Meta Ads y lee todos tus anuncios, campañas e inversión en tiempo real. Luego analiza los datos con inteligencia artificial para decirte <span className="text-white font-semibold">qué está pasando, por qué y qué hacer</span>.
        </p>
        <Callout type="beginner">
          Imaginalo como un analista de publicidad disponible 24hs que revisa tus números y te dice: "Este anuncio está perdiendo plata, pausalo" o "Este otro está funcionando bien, aumentá el presupuesto".
        </Callout>
        <p className="text-slate-400 text-xs leading-relaxed">
          El sistema está construido sobre la metodología <span className="text-violet-300 font-semibold">Andromeda / GEM 2026</span>, que establece que <span className="text-white">"el creativo es el nuevo targeting"</span>. Esto significa que en Meta Ads moderno, el contenido del anuncio (imagen, video, copy) es lo que determina a quién le llega — no los intereses manuales. El algoritmo de Meta lee el mensaje y encuentra la audiencia correcta.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { q: '¿Qué está pasando?',       r: 'Dashboard con KPIs en tiempo real' },
            { q: '¿Por qué está pasando?',    r: 'Diagnóstico IA con causa probable' },
            { q: '¿Qué hipótesis probar?',    r: 'Informe GEM con ángulos sugeridos' },
            { q: '¿Qué acción ejecutar?',     r: 'Brief creativo listo para producir' },
          ].map(({ q, r }) => (
            <div key={q} className="bg-bg border border-border rounded-xl p-3">
              <p className="text-slate-500 text-[11px] uppercase tracking-wide">{q}</p>
              <p className="text-slate-200 text-xs font-medium mt-0.5">{r}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 2. Las métricas clave */}
      <Section icon={BarChart2} title="Las métricas que usa el sistema" subtitle="Qué mide cada número y cómo interpretarlo" color="text-green-400">

        <Callout type="beginner">
          Meta Ads Manager muestra decenas de números. Este sistema usa solo los que realmente importan para tomar decisiones. Acá explicamos cada uno.
        </Callout>

        <MetricRow
          label="CPMr — Costo por 1000 personas únicas alcanzadas"
          formula="(inversión / alcance) × 1000"
          simple="Te dice cuánto cuesta llegar a 1000 personas distintas. Es diferente al CPM tradicional porque el CPM conta impresiones (la misma persona puede ver el anuncio 5 veces). El CPMr solo cuenta personas únicas, por eso es más honesto."
          good="< $20 USD"
          warn="$20–$25 USD"
          bad="> $25 USD"
        />

        <MetricRow
          label="Hook Rate — Tasa de retención del gancho"
          formula="(personas que vieron ≥25% del video / impresiones) × 100"
          simple="Mide cuántas personas detuvieron el scroll y siguieron viendo tu video. Si 100 personas lo vieron y 20 llegaron al 25%, tu Hook Rate es 20%. Un hook (gancho) es el primer segundo del video — tiene que ser lo suficientemente interesante para que alguien no pase de largo."
          good="> 25%"
          warn="15–25%"
          bad="< 15%"
        />

        <MetricRow
          label="FTIR — First Time Impression Rate"
          formula="(alcance / impresiones) × 100"
          simple="Indica qué porcentaje de las veces que se mostró tu anuncio fue a una persona que lo veía por primera vez. Un FTIR alto significa que el anuncio está llegando a gente nueva (prospección). Un FTIR bajo significa que siempre se lo estás mostrando a las mismas personas."
          good="> 60% (prospección)"
          warn="35–60% (mixto)"
          bad="< 35% (retargeting)"
        />

        <MetricRow
          label="CPA — Costo por Acción / Conversación"
          formula="inversión / conversiones"
          simple="Cuánto te cuesta conseguir un resultado (una conversación de WhatsApp, un lead, una venta). Es el número más importante para saber si la campaña es rentable."
          good="Bajo tu objetivo configurado"
          warn="En zona media"
          bad="Supera el umbral de pausa"
        />

        <MetricRow
          label="Frecuencia"
          formula="impresiones / alcance"
          simple="Cuántas veces vio tu anuncio cada persona en promedio. Una frecuencia de 3 significa que cada persona lo vio 3 veces. Cuando la frecuencia es muy alta, la gente se aburre del anuncio y el costo sube — a eso se le llama 'fatiga creativa'."
          good="< 2.0"
          warn="2.0–3.0"
          bad="> 3.0 (fatiga)"
        />

        <MetricRow
          label="ROAS híbrido — Retorno sobre inversión publicitaria"
          formula="e-com: dato directo de Meta · WhatsApp: (conv × tasa de cierre × ticket) / inversión"
          simple="Para tiendas online, Meta mide el ROAS directamente. Para negocios que venden por WhatsApp, el sistema lo calcula en base a cuántas conversaciones recibiste, cuántas cerraste como venta y cuánto cobra cada venta en promedio — todo configurable en tu perfil."
          good="> 3x"
          warn="1.5–3x"
          bad="< 1.5x"
        />
      </Section>

      {/* 3. Los badges de creativos */}
      <Section icon={Star} title="Qué significa cada badge en los creativos" subtitle="El sistema clasifica cada anuncio automáticamente" color="text-yellow-400">

        <Callout type="beginner">
          Cada anuncio recibe una etiqueta de color que te dice qué hacer con él. No tenés que analizar los números — el sistema ya lo hizo por vos.
        </Callout>

        <div className="space-y-0.5">
          <BadgeRow color="bg-green-400/15 border-green-400/30 text-green-400"    label="Escalar"          desc="FTIR > 60% y ROAS sobre tu objetivo. El anuncio llega a gente nueva y convierte. Aumentá el presupuesto hasta un 20%." />
          <BadgeRow color="bg-cyan-400/15 border-cyan-400/30 text-cyan-400"       label="Retener"          desc="Buen ROAS pero FTIR bajo — está convirtiendo en audiencias que ya te conocen. Mantenerlo sin cambios, pero no es escalable a público frío." />
          <BadgeRow color="bg-blue-400/15 border-blue-400/30 text-blue-400"       label="Replicar"         desc="Buen CPA. Creá una variación del mismo anuncio con un ángulo diferente para seguir creciendo." />
          <BadgeRow color="bg-orange-400/15 border-orange-400/30 text-orange-400" label="Optimizar copy"   desc="Llega a gente nueva (FTIR alto) pero no convierte. El problema está en el copy, la oferta o el CTA — no en la audiencia." />
          <BadgeRow color="bg-slate-400/15 border-slate-400/30 text-slate-400"    label="Mantener"         desc="Rendimiento estable. Monitorear frecuencia y que el FTIR no baje." />
          <BadgeRow color="bg-yellow-400/15 border-yellow-400/30 text-yellow-400" label="Fatiga creativa"  desc="La audiencia ya lo vio demasiadas veces (frecuencia alta). Hay que rotar el creativo antes de que el CPA suba más." />
          <BadgeRow color="bg-red-400/15 border-red-400/30 text-red-400"          label="Pausar"           desc="CPA o frecuencia fuera de umbral. Cada peso que gastás en este anuncio es plata perdida. Pausarlo es la acción correcta." />
          <BadgeRow color="bg-red-400/15 border-red-400/30 text-red-400"          label="Sin conversiones" desc="Gastó lo suficiente sin generar ni un resultado. Revisar segmentación, destino de WhatsApp o la oferta." />
          <BadgeRow color="bg-violet-400/15 border-violet-400/30 text-violet-400" label="Nuevo"            desc="Tiene menos de 7 días activo. El algoritmo de Meta todavía está aprendiendo. No tomar decisiones hasta la semana." />
          <BadgeRow color="bg-blue-400/15 border-blue-400/30 text-blue-400"       label="Aprendizaje"      desc="Pocos datos todavía. Meta necesita al menos 50 conversiones por semana para optimizar bien. Esperá antes de hacer cambios." />
        </div>
      </Section>

      {/* 4. Creative Health Score */}
      <Section icon={Zap} title="Creative Health Score — el puntaje de salud" subtitle="Cómo se calcula el 0 a 100 de cada anuncio" color="text-violet-400">

        <Callout type="beginner">
          El score es un número del 0 al 100 que resume qué tan bien está funcionando un anuncio. Es como la nota de un examen: 90 es excelente, 40 necesita trabajo, 15 está reprobado.
        </Callout>

        <p className="text-slate-400 text-xs leading-relaxed">
          Se calcula sumando puntos de 5 componentes. Cada uno tiene un peso distinto según su importancia para el resultado final:
        </p>

        <div className="space-y-3">
          <ScoreBar label="Hook Rate"  pts={25} max={100} desc="¿Engancha en el primer segundo?" />
          <ScoreBar label="CPA"        pts={25} max={100} desc="¿Convierte dentro del objetivo?" />
          <ScoreBar label="CTR"        pts={20} max={100} desc="¿Genera clicks?" />
          <ScoreBar label="CPMr"       pts={20} max={100} desc="¿Es eficiente en alcance?" />
          <ScoreBar label="Fatiga"     pts={10} max={100} desc="¿Está fresco o saturado?" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {[
            { range: '75–100', label: 'Escalable',  color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/25' },
            { range: '60–74',  label: 'Mantener',   color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/25' },
            { range: '45–59',  label: 'Optimizar',  color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/25' },
            { range: '0–44',   label: 'Pausar',     color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/25' },
          ].map(s => (
            <div key={s.range} className={`rounded-xl border px-3 py-2.5 text-center ${s.bg}`}>
              <p className={`text-lg font-bold ${s.color}`}>{s.range}</p>
              <p className={`text-xs font-semibold ${s.color}`}>{s.label}</p>
            </div>
          ))}
        </div>

        <Callout type="tip">
          Los umbrales del score usan los valores que configuraste en tu perfil (CPA objetivo, CPMr objetivo, etc.). Dos cuentas con el mismo CPA pueden tener scores distintos si sus objetivos son diferentes — el sistema se adapta a tu negocio.
        </Callout>
      </Section>

      {/* 5. Ángulos psicológicos */}
      <Section icon={Layers} title="Los 8 ángulos psicológicos" subtitle="La base de toda estrategia creativa en Andromeda" color="text-orange-400">

        <p className="text-slate-300 text-xs leading-relaxed">
          Un ángulo psicológico es el <span className="text-white font-semibold">punto de entrada emocional</span> de un anuncio — la razón por la que una persona presta atención. Andromeda recomienda tener anuncios activos con ángulos distintos para no depender de uno solo y darle al algoritmo señales variadas de audiencia.
        </p>

        <Callout type="warn">
          Si más del 60% de tus anuncios activos usan el mismo ángulo, Andromeda penaliza el alcance porque el algoritmo interpreta que todos son "el mismo mensaje" y deja de distribuirlo.
        </Callout>

        <div className="space-y-2">
          {[
            { nombre: 'FOMO / Urgencia',            desc: 'Miedo a quedarse afuera o perder una oportunidad. "Últimos lugares", "Oferta válida hasta el viernes".' },
            { nombre: 'Problema → Solución',         desc: 'Muestra un problema que el cliente ideal ya tiene y ofrece la solución directa. El más clásico y efectivo.' },
            { nombre: 'Testimonial / Prueba social', desc: 'Historia real de un cliente. "Yo estaba igual que vos y ahora...". El más creíble para audiencias frías.' },
            { nombre: 'Precio / Cuotas accesibles',  desc: 'El costo ya no es excusa. Ideal para productos de ticket medio-alto donde el precio es la objeción principal.' },
            { nombre: 'Detrás de escena / Proceso',  desc: 'Muestra cómo se hace, el equipo, el proceso. Genera confianza y diferenciación frente a la competencia.' },
            { nombre: 'Autoridad / Expertise',       desc: 'Posiciona la marca como experta. Estadísticas, certificaciones, años de experiencia, casos de éxito.' },
            { nombre: 'Comparación',                 desc: '"Antes vs. después", "nosotros vs. la competencia". Funciona bien cuando la diferencia es clara y demostrable.' },
            { nombre: 'Garantía / Sin riesgo',       desc: 'Elimina el miedo a comprar. Devolución de dinero, prueba gratis, garantía de resultado. Reduce la fricción.' },
          ].map(a => (
            <div key={a.nombre} className="flex gap-3 bg-bg border border-border rounded-xl px-4 py-3">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 mt-1.5" />
              <div>
                <p className="text-white text-xs font-semibold">{a.nombre}</p>
                <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 6. Fatiga creativa */}
      <Section icon={AlertTriangle} title="Fatiga creativa — la señal más importante" subtitle="Cuándo rotar un anuncio y por qué" color="text-red-400">

        <p className="text-slate-300 text-xs leading-relaxed">
          La fatiga creativa ocurre cuando el algoritmo de Meta ya le mostró tu anuncio a toda la audiencia disponible. Para seguir mostrándoselo, Meta tiene que competir más fuerte en la subasta, lo que sube el costo. El síntoma más claro es que el <span className="text-white font-semibold">CPMr sube sin que hayas cambiado nada</span>.
        </p>

        <Callout type="beginner">
          Imaginá que repartís folletos en un barrio. El primer día es eficiente: nadie los vio. Pero si volvés todos los días al mismo barrio, eventualmente ya todos los vieron y empezás a molestar. El costo por folleto que llega a alguien nuevo sube porque ya no hay gente nueva. Eso es fatiga creativa.
        </Callout>

        <div className="space-y-2">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Señales de fatiga</p>
          {[
            'CPMr sube más de 20% en 7 días sin cambiar el presupuesto',
            'Frecuencia supera 2.5 (advertencia) o 3.0 (crítico)',
            'CTR cae varios días seguidos mientras el gasto se mantiene',
            'CPA sube aunque la oferta y la segmentación no cambiaron',
          ].map(s => (
            <div key={s} className="flex gap-2 text-xs text-slate-400">
              <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
              {s}
            </div>
          ))}
        </div>

        <Callout type="tip">
          La solución a la fatiga siempre es el creativo, no la segmentación. No cambies el público — creá un anuncio nuevo con un ángulo distinto. El problema es el mensaje, no a quién se lo mostrás.
        </Callout>

        <div className="space-y-2">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Cómo actúa el sistema</p>
          {[
            'Monitorea la frecuencia y el CPMr de todos tus anuncios cada vez que cargás la página',
            'Genera una alerta cuando detecta fatiga o tendencia al alza',
            'Sugiere pausar el anuncio fatigado y crear nuevos con ángulos distintos',
            'El Brief IA genera el guión completo para los nuevos creativos en segundos',
          ].map((s, i) => (
            <div key={i} className="flex gap-2 text-xs text-slate-400">
              <CheckCircle size={13} className="text-green-400 shrink-0 mt-0.5" />
              {s}
            </div>
          ))}
        </div>
      </Section>

      {/* 7. Reglas de escalamiento */}
      <Section icon={TrendingUp} title="Reglas de escalamiento" subtitle="Cuándo y cuánto subir el presupuesto" color="text-green-400">

        <Callout type="warn">
          Subir el presupuesto de golpe resetea el aprendizaje del algoritmo. Meta necesita tiempo para re-aprender con el nuevo presupuesto. Si subís 100% de un día para otro, perdés el aprendizaje que costó días construir.
        </Callout>

        <div className="space-y-3">
          {[
            {
              title: 'Regla del +20%',
              desc: 'Nunca subas el presupuesto más de un 20% en un solo cambio. Esperá 3 a 4 días antes del siguiente aumento. Así el algoritmo se adapta gradualmente.',
              icon: CheckCircle, color: 'text-green-400',
            },
            {
              title: 'Regla de las 50 conversiones',
              desc: 'Meta necesita al menos 50 conversiones por semana para que el algoritmo funcione bien. Si tenés menos, no escalés — primero consolidá campañas para juntar más datos en menos adsets.',
              icon: Info, color: 'text-blue-400',
            },
            {
              title: 'ABO → CBO',
              desc: 'Si tenés varios conjuntos de anuncios con presupuesto individual (ABO), es más eficiente consolidarlos en una sola campaña con presupuesto centralizado (CBO) y dejar que Meta distribuya el presupuesto sólo.',
              icon: Target, color: 'text-violet-400',
            },
          ].map(r => {
            const Icon = r.icon
            return (
              <div key={r.title} className="flex gap-3 bg-bg border border-border rounded-xl px-4 py-3">
                <Icon size={15} className={`${r.color} shrink-0 mt-0.5`} />
                <div>
                  <p className="text-white text-xs font-semibold">{r.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{r.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* 8. Las pantallas del sistema */}
      <Section icon={Target} title="Para qué sirve cada pantalla" subtitle="Mapa rápido del sistema" color="text-slate-400">
        <div className="space-y-2">
          {[
            { name: 'Overview',             desc: 'Resumen general: inversión total, CPA, ROAS, tendencias. El punto de partida de cada sesión.' },
            { name: 'Campañas',             desc: 'Árbol completo de campañas → conjuntos → anuncios con métricas y controles de pausa/activar.' },
            { name: 'Creativos',            desc: 'Ranking de anuncios por performance real con score, badge y acciones directas (pausar, escalar, replicar).' },
            { name: 'Estrategia',           desc: 'Matriz de ángulos, semáforo de diversidad e informe GEM generado por IA con instrucciones concretas.' },
            { name: 'Brief IA',             desc: 'Genera guiones completos para Yapper, UGC y estática por ángulo. Incluye lineamientos de diseño y flow de WhatsApp.' },
            { name: 'Alertas',              desc: 'Feed de alertas automáticas: fatiga creativa, CPMr alto, frecuencia crítica. Se analiza al cargar.' },
            { name: 'Historial',            desc: 'Evolución de métricas en el tiempo con gráficos por período.' },
            { name: 'Análisis Avanzado',    desc: 'Comparación de períodos, distribución de inversión y análisis de tendencias.' },
            { name: 'Benchmarks',           desc: 'Compará tus métricas contra referencias del mercado.' },
            { name: 'IA Recomendaciones',   desc: 'Acciones sugeridas por IA ordenadas por prioridad e impacto estimado.' },
            { name: 'Acciones',             desc: 'Historial de todas las acciones ejecutadas desde el dashboard con fecha y resultado.' },
          ].map(p => (
            <div key={p.name} className="flex gap-3 py-2 border-b border-border/50 last:border-0">
              <span className="text-violet-300 font-semibold text-xs w-36 shrink-0">{p.name}</span>
              <p className="text-slate-400 text-xs leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-slate-600 text-xs">
          Esta guía se actualiza cuando el sistema incorpora nuevas funcionalidades.
        </p>
      </div>
    </div>
  )
}
