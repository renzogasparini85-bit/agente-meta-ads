"""
Genera el PDF de ventas: "Meta Ads AI — Sistema de Inteligencia Publicitaria"
Uso: python3 generar_propuesta_pdf.py
Salida: Meta Ads AI — Propuesta Comercial.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.platypus.flowables import Flowable
from reportlab.lib.colors import HexColor
import os

# ── Paleta ────────────────────────────────────────────────────────────────────
VIOLET      = HexColor('#6B21A8')
VIOLET_LIGHT= HexColor('#A855F7')
VIOLET_BG   = HexColor('#F5F3FF')
ORANGE      = HexColor('#FF6B00')
DARK        = HexColor('#111827')
SLATE       = HexColor('#475569')
SLATE_LIGHT = HexColor('#94A3B8')
WHITE       = colors.white
GREEN       = HexColor('#22C55E')
RED         = HexColor('#EF4444')
BLUE        = HexColor('#3B82F6')
YELLOW      = HexColor('#EAB308')
BG_CARD     = HexColor('#F8F7FF')
BORDER      = HexColor('#E9D5FF')

OUTPUT = '/Users/renzogasparini/agente-meta-ads/Meta Ads AI — Propuesta Comercial.pdf'
W, H = A4

# ── Estilos ───────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

def s(name, **kw):
    return ParagraphStyle(name, **kw)

COVER_TITLE = s('ct', fontName='Helvetica-Bold', fontSize=36, textColor=VIOLET,
                leading=44, alignment=TA_CENTER, spaceAfter=4)
COVER_SUBTITLE = s('cs', fontName='Helvetica', fontSize=16, textColor=SLATE,
                   leading=22, alignment=TA_CENTER, spaceAfter=20)
COVER_TAG = s('ctag', fontName='Helvetica-Bold', fontSize=13, textColor=ORANGE,
              alignment=TA_CENTER, spaceAfter=6)

H1 = s('h1', fontName='Helvetica-Bold', fontSize=18, textColor=VIOLET,
        leading=24, spaceBefore=18, spaceAfter=8)
H2 = s('h2', fontName='Helvetica-Bold', fontSize=13, textColor=DARK,
        leading=18, spaceBefore=10, spaceAfter=5)
H3 = s('h3', fontName='Helvetica-Bold', fontSize=11, textColor=VIOLET,
        leading=16, spaceBefore=8, spaceAfter=4)

BODY = s('body', fontName='Helvetica', fontSize=10.5, textColor=DARK,
         leading=16, spaceAfter=5)
BODY_SMALL = s('bs', fontName='Helvetica', fontSize=9.5, textColor=SLATE,
               leading=14, spaceAfter=4)
BODY_BOLD = s('bb', fontName='Helvetica-Bold', fontSize=10.5, textColor=DARK,
              leading=16, spaceAfter=5)
HIGHLIGHT = s('hl', fontName='Helvetica-Bold', fontSize=11, textColor=VIOLET,
              leading=16, spaceAfter=6)
CENTER = s('ctr', fontName='Helvetica', fontSize=10, textColor=SLATE,
           alignment=TA_CENTER, spaceAfter=4)
FOOTER_S = s('ft', fontName='Helvetica', fontSize=8, textColor=SLATE_LIGHT,
             alignment=TA_CENTER)

def bullet(text, color=VIOLET, bold_part=None):
    if bold_part:
        return Paragraph(f'<font color="#{color.hexval()[2:]}">●</font> <b>{bold_part}</b> {text}', BODY)
    return Paragraph(f'<font color="#{color.hexval()[2:]}">●</font>  {text}', BODY)

def badge(text, bg=VIOLET, fg=WHITE):
    hex_bg = bg.hexval()[2:]
    hex_fg = fg.hexval()[2:]
    return Paragraph(
        f'<font color="#{hex_bg}"><b>[</b></font>'
        f'<font color="#{hex_bg}"><b> {text} </b></font>'
        f'<font color="#{hex_bg}"><b>]</b></font>', BODY)

# ── Flowable: caja coloreada ──────────────────────────────────────────────────
class ColorBox(Flowable):
    def __init__(self, text, bg=VIOLET_BG, border=BORDER, text_color=VIOLET,
                 width=None, padding=10, font_size=11, bold=True):
        super().__init__()
        self.text = text
        self.bg = bg
        self.border = border
        self.text_color = text_color
        self.box_width = width or (W - 4*cm)
        self.padding = padding
        self.font_size = font_size
        self.bold = bold
        self.height = padding * 2 + font_size * 1.5 + 6

    def draw(self):
        c = self.canv
        c.setFillColor(self.bg)
        c.setStrokeColor(self.border)
        c.roundRect(0, 0, self.box_width, self.height, 6, fill=1, stroke=1)
        c.setFillColor(self.text_color)
        fn = 'Helvetica-Bold' if self.bold else 'Helvetica'
        c.setFont(fn, self.font_size)
        c.drawString(self.padding, self.padding + 4, self.text)

    def wrap(self, aW, aH):
        return self.box_width, self.height + 8

# ── Header/Footer de página ───────────────────────────────────────────────────
def on_page(canvas, doc):
    canvas.saveState()
    # Top bar
    canvas.setFillColor(VIOLET)
    canvas.rect(0, H - 8*mm, W, 8*mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont('Helvetica-Bold', 8)
    canvas.drawString(2*cm, H - 5.5*mm, 'META ADS AI')
    canvas.setFont('Helvetica', 8)
    canvas.drawRightString(W - 2*cm, H - 5.5*mm, 'Sistema de Inteligencia Publicitaria')
    # Footer
    canvas.setFillColor(SLATE_LIGHT)
    canvas.setFont('Helvetica', 7.5)
    canvas.drawCentredString(W/2, 1.2*cm, f'renzogasparini85@gmail.com  ·  Confidencial  ·  Mayo 2026')
    canvas.drawRightString(W - 2*cm, 1.2*cm, f'Página {doc.page}')
    canvas.restoreState()

def on_first_page(canvas, doc):
    canvas.saveState()
    # Fondo degradado simulado
    canvas.setFillColor(HexColor('#1A0038'))
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # Banda violeta top
    canvas.setFillColor(VIOLET)
    canvas.rect(0, H - 1.5*cm, W, 1.5*cm, fill=1, stroke=0)
    # Banda naranja
    canvas.setFillColor(ORANGE)
    canvas.rect(0, H - 1.7*cm, W, 2*mm, fill=1, stroke=0)
    canvas.restoreState()

# ── Tabla helpers ─────────────────────────────────────────────────────────────
def make_table(headers, rows, col_widths, stripe=True, header_bg=VIOLET):
    data = [[Paragraph(f'<b>{h}</b>', s('th', fontName='Helvetica-Bold', fontSize=9.5,
                       textColor=WHITE, alignment=TA_CENTER)) for h in headers]]
    for i, row in enumerate(rows):
        data.append([Paragraph(str(v), s(f'td{i}', fontName='Helvetica', fontSize=9.5,
                               textColor=DARK, leading=13)) for v in row])

    ts = [
        ('BACKGROUND', (0, 0), (-1, 0), header_bg),
        ('TEXTCOLOR',  (0, 0), (-1, 0), WHITE),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1),
         [BG_CARD, WHITE] if stripe else [WHITE]),
        ('GRID',    (0, 0), (-1, -1), 0.4, BORDER),
        ('VALIGN',  (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING',  (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING',   (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 6),
        ('ROUNDEDCORNERS', [4]),
    ]
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle(ts))
    return t

# ── Contenido ─────────────────────────────────────────────────────────────────
def build_story():
    story = []
    SP = Spacer(1, 0.3*cm)
    SP2 = Spacer(1, 0.6*cm)

    # ── PORTADA ───────────────────────────────────────────────────────────────
    story.append(Spacer(1, 3.5*cm))
    story.append(Paragraph('META ADS AI', s('covt', fontName='Helvetica-Bold', fontSize=48,
                            textColor=WHITE, alignment=TA_CENTER, leading=56)))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph('Sistema de Inteligencia Publicitaria', s('covs', fontName='Helvetica',
                            fontSize=20, textColor=HexColor('#C4B5FD'), alignment=TA_CENTER)))
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width='60%', thickness=2, color=ORANGE, spaceAfter=16))
    story.append(Paragraph('Dashboard SaaS · IA integrada · Multi-cuenta · Alertas proactivas',
                            s('covd', fontName='Helvetica', fontSize=12, textColor=HexColor('#94A3B8'),
                              alignment=TA_CENTER)))
    story.append(Spacer(1, 1*cm))

    # KPI pills portada
    kpi_data = [['13 módulos', '0-100 Health Score', 'Alertas 7am', 'Copies con IA']]
    kpi_t = Table(kpi_data, colWidths=[3.5*cm, 4.5*cm, 3.5*cm, 3.5*cm])
    kpi_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor('#2D1B69')),
        ('TEXTCOLOR',  (0,0), (-1,-1), HexColor('#C4B5FD')),
        ('FONTNAME',   (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE',   (0,0), (-1,-1), 9),
        ('ALIGN',      (0,0), (-1,-1), 'CENTER'),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING',(0,0),(-1,-1), 8),
        ('LEFTPADDING',(0,0), (-1,-1), 6),
        ('RIGHTPADDING',(0,0),(-1,-1), 6),
        ('ROUNDEDCORNERS',[6]),
        ('GRID',       (0,0), (-1,-1), 0, colors.transparent),
        ('INNERGRID',  (0,0), (-1,-1), 0.5, HexColor('#4C1D95')),
    ]))
    story.append(kpi_t)
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph('Mayo 2026  ·  Preparado por Renzo Gasparini',
                            s('cov_ft', fontName='Helvetica', fontSize=10,
                              textColor=HexColor('#64748B'), alignment=TA_CENTER)))
    story.append(PageBreak())

    # ── ÍNDICE ────────────────────────────────────────────────────────────────
    story.append(Paragraph('Contenido', H1))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=10))
    indice = [
        ('01', 'Por qué este sistema existe', '3'),
        ('02', 'Qué hace el dashboard — visión general', '4'),
        ('03', 'Los 13 módulos explicados', '5'),
        ('04', 'Comparativa: este sistema vs. Meta nativo', '12'),
        ('05', 'A quién le sirve este sistema', '13'),
        ('06', 'Stack tecnológico', '14'),
        ('07', 'Preguntas frecuentes', '15'),
        ('08', 'Próximos pasos', '16'),
    ]
    idx_data = [[Paragraph(f'<b>{n}</b>', s('idxn', fontName='Helvetica-Bold', fontSize=10, textColor=VIOLET)),
                 Paragraph(t, s('idxt', fontName='Helvetica', fontSize=10, textColor=DARK)),
                 Paragraph(p, s('idxp', fontName='Helvetica', fontSize=10, textColor=SLATE, alignment=TA_RIGHT))]
                for n, t, p in indice]
    idx_t = Table(idx_data, colWidths=[1.2*cm, 13*cm, 1.5*cm])
    idx_t.setStyle(TableStyle([
        ('VALIGN',  (0,0),(-1,-1),'MIDDLE'),
        ('TOPPADDING',(0,0),(-1,-1),5),
        ('BOTTOMPADDING',(0,0),(-1,-1),5),
        ('LINEBELOW',(0,0),(-1,-2),0.3,BORDER),
    ]))
    story.append(idx_t)
    story.append(PageBreak())

    # ── 01. POR QUÉ EXISTE ────────────────────────────────────────────────────
    story.append(Paragraph('01. Por qué este sistema existe', H1))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=8))
    story.append(Paragraph(
        'Gestionar campañas de Meta Ads de forma manual es trabajar siempre tarde. '
        'El anuncio ya quemó presupuesto antes de que alguien lo pausara. '
        'El creativo que estaba ganando se identificó dos semanas después de que empezó a bajar. '
        'El reporte llega a fin de mes cuando ya no hay nada que hacer.', BODY))
    story.append(SP)
    story.append(Paragraph(
        'Este sistema invierte esa lógica: el agente trabaja de noche, detecta problemas al amanecer '
        'y entrega decisiones listas — no datos crudos — antes de que el equipo empiece su día.', BODY))
    story.append(SP2)

    story.append(Paragraph('El problema concreto que resuelve', H2))
    problemas = [
        ('Velocidad', 'El Ads Manager muestra datos del día anterior. Las decisiones llegan tarde.'),
        ('Volumen', 'Con 20+ anuncios activos, revisar todo manualmente es inviable todos los días.'),
        ('Contexto', 'Los datos existen pero no se interpretan: nadie dice "este anuncio está muerto".'),
        ('Creativos', 'Los mejores creativos se identifican por intuición, no por datos sistemáticos.'),
        ('Reportes', 'Armar un reporte para el cliente tarda horas y no añade valor estratégico.'),
    ]
    for titulo, texto in problemas:
        story.append(bullet(texto, bold_part=f'{titulo}:'))
    story.append(PageBreak())

    # ── 02. VISIÓN GENERAL ────────────────────────────────────────────────────
    story.append(Paragraph('02. Qué hace el dashboard — visión general', H1))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=8))
    story.append(Paragraph(
        'Es un SaaS multi-cuenta con inteligencia artificial integrada. '
        'No es un reporte bonito encima de Meta — es un agente que razona sobre los datos '
        'y devuelve acciones concretas.', BODY))
    story.append(SP)

    overview_data = [
        ['Área', 'Qué hace', 'Diferencial'],
        ['Monitoreo', 'KPIs en tiempo real, semáforo por campaña', 'Health Score 0–100 por cuenta'],
        ['Creativos', 'Ranking con badge: escalar/pausar/retener/replicar', 'Generador de variaciones con IA'],
        ['Alertas', 'Detección proactiva de problemas', 'Corre a las 7am, llega antes que vos'],
        ['Analytics', 'Rendimiento por día, fatiga creativa, cruce orgánico', 'Detecta joyas antes de gastar'],
        ['Benchmarks', 'Comparativa sectorial P25/P50/P75', 'Sabés si tu CPA es bueno o malo'],
        ['Cliente', 'Vista pública sin login', 'Link de solo lectura para el cliente final'],
        ['Export', 'Imagen PNG 1080×1080 lista para WhatsApp', 'Sin Canva, sin diseñador'],
    ]
    t = make_table(overview_data[0], overview_data[1:], [3.5*cm, 6*cm, 6*cm])
    story.append(t)
    story.append(SP2)

    story.append(ColorBox(
        '💡  El sistema se paga en el primer mes: recuperar el 10% de eficiencia '
        'en una cuenta de $3M/mes son $300.000 ARS mensuales — más que el costo del plan.',
        bg=VIOLET_BG, border=BORDER, text_color=VIOLET, font_size=10
    ))
    story.append(PageBreak())

    # ── 03. LOS 13 MÓDULOS ────────────────────────────────────────────────────
    story.append(Paragraph('03. Los 13 módulos explicados', H1))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=8))

    modulos = [
        {
            'num': '3.1',
            'nombre': 'Overview — Panel principal',
            'descripcion': (
                'La primera pantalla que ve cualquier usuario. Concentra los KPIs más importantes '
                'del período seleccionado (hoy / 7 días / 30 días) con variación vs período anterior.'
            ),
            'metricas': ['Gasto total', 'Conversaciones', 'CPA promedio', 'CTR promedio', 'Frecuencia'],
            'diferencial': 'Cada KPI muestra flecha de tendencia: verde si mejoró, rojo si empeoró. '
                           'No es solo un número — es contexto.',
        },
        {
            'num': '3.2',
            'nombre': 'Health Score 0–100',
            'descripcion': (
                'Un único número que resume el estado de salud de la cuenta. '
                'Se calcula ponderando cuatro dimensiones críticas:'
            ),
            'metricas': [
                'CPA (35%) — ¿Cuánto cuesta cada conversación?',
                'Frecuencia (30%) — ¿Estamos saturando la audiencia?',
                'CTR (20%) — ¿Los creativos siguen enganchando?',
                'Diversidad creativa (15%) — ¿Dependemos de un solo anuncio?',
            ],
            'diferencial': 'Escala visual de 0 a 100 con gauge animado. '
                           '≥70 = saludable (verde), 40-69 = atención (amarillo), <40 = crítico (rojo). '
                           'Cualquier persona del equipo entiende el estado de la cuenta en 2 segundos.',
        },
        {
            'num': '3.3',
            'nombre': 'Ranking de creativos con badges inteligentes',
            'descripcion': (
                'Todos los anuncios activos rankeados por CPA. '
                'El sistema asigna automáticamente un badge a cada creativo según su rendimiento relativo:'
            ),
            'metricas': [
                '🟢 ESCALAR — CPA excepcional, aumentar presupuesto ya',
                '🔵 REPLICAR — Funciona bien, crear versiones similares',
                '🟡 RETENER — Rendimiento aceptable, monitorear',
                '🔴 PAUSAR — CPA alto o sin conversiones, apagar',
            ],
            'diferencial': 'En lugar de revisar 20 anuncios uno por uno, el equipo abre el dashboard '
                           'y en 30 segundos sabe exactamente qué hacer con cada creativo.',
        },
        {
            'num': '3.4',
            'nombre': 'Generador de variaciones con IA (Brief IA)',
            'descripcion': (
                'Desde cualquier anuncio activo, en un clic se abre un modal de 3 pasos que genera '
                'variaciones del copy usando Claude (Anthropic):'
            ),
            'metricas': [
                'Paso 1: Seleccionás el formato (Story / Feed / Carrusel / Video)',
                'Paso 2: Elegís el ángulo de comunicación (precio, miedo, beneficio, social proof, etc.)',
                'Paso 3: IA genera 3 variaciones listas para copiar y usar',
            ],
            'diferencial': 'El brief incluye contexto real del anuncio: CPA actual, CTR, '
                           'conversaciones, nombre de la campaña. La IA adapta el tono a la marca. '
                           'Sin este módulo, un copywriter tarda 2-3 horas en producir lo mismo.',
        },
        {
            'num': '3.5',
            'nombre': 'Recomendaciones IA',
            'descripcion': (
                'Panel de acciones concretas generadas por el agente. '
                'No dice "tu CTR bajó" — dice "pausá el anuncio X porque su CTR cayó 40% '
                'en 7 días y su frecuencia supera 3.0".'
            ),
            'metricas': [
                'Acciones sugeridas con prioridad (alta / media / baja)',
                'Brief de campaña: copy + ángulo + formato + audiencia sugerida',
                'Contexto: por qué se sugiere cada acción con datos concretos',
            ],
            'diferencial': 'El equipo puede aceptar o descartar cada recomendación. '
                           'Con el tiempo, el sistema aprende qué tipos de acciones se ejecutan más.',
        },
        {
            'num': '3.6',
            'nombre': 'Detector de fatiga creativa',
            'descripcion': (
                'Compara el CTR de los últimos 7 días vs los 7 días anteriores para cada anuncio. '
                'Clasifica el nivel de fatiga automáticamente:'
            ),
            'metricas': [
                '🔴 Crítica: caída >30% de CTR — pausar inmediato',
                '🟠 Moderada: caída 15-30% — renovar copy o imagen',
                '🟡 Leve: caída <15% — monitorear',
                '🟢 OK: estable o en crecimiento',
            ],
            'diferencial': 'La fatiga creativa es la causa #1 de ineficiencia en cuentas maduras. '
                           'Sin este detector, el equipo se da cuenta cuando ya se gastó el presupuesto.',
        },
        {
            'num': '3.7',
            'nombre': 'Análisis por día de la semana',
            'descripcion': (
                'Agrupa el rendimiento histórico por día: lunes a domingo. '
                'Identifica cuándo el CPA es más bajo y cuándo sube.'
            ),
            'metricas': [
                'Gráfico de barras por día con el día más eficiente destacado',
                'CPA promedio por día de la semana',
                'Conversaciones y gasto por día',
            ],
            'diferencial': 'Si el martes tiene 30% menos CPA que el viernes, '
                           'subimos el presupuesto los martes y lo bajamos los viernes. '
                           'Sin datos, esa decisión se toma por intuición.',
        },
        {
            'num': '3.8',
            'nombre': 'Benchmarks sectoriales',
            'descripcion': (
                'Compara las métricas de la cuenta contra percentiles reales del sector: '
                'P25 (malo), P50 (promedio), P75 (bueno).'
            ),
            'metricas': [
                'CPA: ¿Estás pagando más o menos que la competencia?',
                'CTR: ¿Tus creativos enganchan más o menos que el sector?',
                'Frecuencia: ¿Estás saturando más que el promedio?',
                'CPM: ¿Cuánto pagás por mil impresiones vs el mercado?',
            ],
            'diferencial': 'Disponible para 6 objetivos: Mensajes, Leads, Ventas, '
                           'Awareness, Engagement y Tráfico. '
                           'La mayoría de los gestores nunca saben si su CPA es bueno o malo en términos absolutos.',
        },
        {
            'num': '3.9',
            'nombre': 'Cross orgánico → pago',
            'descripcion': (
                'Analiza los posts orgánicos del Instagram de la marca y detecta '
                'cuáles tienen alto Engagement Rate (ER) pero no tienen versión pagada.'
            ),
            'metricas': [
                'Lista de posts orgánicos con ER > promedio de la cuenta',
                'Ángulo sugerido por IA basado en el copy del post',
                'Badge "Potencial alto" si el ER supera 2x el promedio',
                'Indicador: ¿Ya existe un anuncio pagado de este post?',
            ],
            'diferencial': 'Los mejores creativos ya están validados gratis por la audiencia. '
                           'Este módulo los detecta automáticamente en lugar de que el equipo los busque a mano.',
        },
        {
            'num': '3.10',
            'nombre': 'Sistema de alertas proactivas',
            'descripcion': (
                'El agente escanea todas las campañas a las 7am Argentina (cron automático). '
                'Detecta problemas críticos y los lista en el feed de alertas antes de que el equipo empiece.'
            ),
            'metricas': [
                'Frecuencia ≥ 2.5: audiencia saturándose (alerta media)',
                'Frecuencia ≥ 3.0: saturación crítica (alerta alta)',
                'Gasto sin conversiones en los últimos 3 días',
                'CPA que supera el umbral configurado por cuenta',
                'CTR < 0.5%: creativo sin tracción',
            ],
            'diferencial': 'Las alertas no se duplican: si ya existe una alerta activa del mismo tipo '
                           'para el mismo anuncio, no genera ruido. '
                           'El equipo puede resolverlas manualmente y el sistema lo registra.',
        },
        {
            'num': '3.11',
            'nombre': 'Historial de tendencias',
            'descripcion': (
                'Gráficos de línea con el rendimiento histórico de la cuenta. '
                'Muestra cómo evolucionaron CPA, CTR, conversaciones y gasto en el tiempo.'
            ),
            'metricas': [
                'Gráfico de CPA diario / semanal',
                'Evolución de conversaciones',
                'Gasto acumulado por período',
                'Comparativa de períodos: este mes vs mes anterior',
            ],
            'diferencial': 'Permite ver patrones estacionales y el impacto real de cada optimización realizada.',
        },
        {
            'num': '3.12',
            'nombre': 'Timeline de acciones',
            'descripcion': (
                'Registro cronológico de todas las acciones ejecutadas sobre la cuenta: '
                'pausas, escalas de presupuesto, creación de campañas, duplicaciones.'
            ),
            'metricas': [
                'Tipo de acción con icono descriptivo',
                'Resultado: exitoso (verde) o con error (rojo)',
                'Quién ejecutó la acción y cuándo',
                'Detalle técnico de cada cambio',
            ],
            'diferencial': 'La auditoría completa de todo lo que pasó en la cuenta, '
                           'sin depender de la memoria del equipo ni del historial de cambios de Meta.',
        },
        {
            'num': '3.13',
            'nombre': 'Vista pública para el cliente + Exportación PNG',
            'descripcion': (
                'Dos herramientas de comunicación pensadas para el flujo de trabajo agencia–cliente:'
            ),
            'metricas': [
                'Link de solo lectura: el cliente ve un resumen sin login y sin datos técnicos',
                'Token JWT con expiración de 7 días — el link vence automáticamente',
                'Exportación PNG 1080×1080: resumen visual listo para WhatsApp o Instagram',
                'Incluye marca, período, KPIs, top 3 creativos y badges',
            ],
            'diferencial': 'El cliente recibe la información justa sin poder modificar nada. '
                           'El PNG reemplaza el armado manual de un reporte en Canva — '
                           'se genera en 1 segundo desde el dashboard.',
        },
    ]

    for mod in modulos:
        story.append(KeepTogether([
            Paragraph(f'{mod["num"]}  {mod["nombre"]}', H2),
            Paragraph(mod['descripcion'], BODY),
        ]))
        for m in mod['metricas']:
            story.append(bullet(m))
        story.append(Spacer(1, 0.2*cm))
        story.append(Paragraph(f'<b>Por qué importa:</b> {mod["diferencial"]}',
                               s('why', fontName='Helvetica', fontSize=10, textColor=SLATE,
                                 leading=14, spaceAfter=6, leftIndent=12,
                                 borderPad=6, borderColor=VIOLET_LIGHT, borderWidth=0)))
        story.append(SP)

    story.append(PageBreak())

    # ── 04. COMPARATIVA ───────────────────────────────────────────────────────
    story.append(Paragraph('04. Comparativa: este sistema vs. Meta nativo', H1))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=8))

    comp_data = [
        ['Función', 'Meta Ads Manager', 'Meta Ads AI'],
        ['Health Score de la cuenta', '❌ No existe', '✅ 0–100 con dimensiones'],
        ['Ranking de creativos con acción', '❌ Solo métricas raw', '✅ Badge: escalar/pausar/replicar'],
        ['Generador de variaciones IA', '❌ No existe', '✅ 3 variaciones en 1 clic'],
        ['Alertas proactivas a las 7am', '❌ No existe', '✅ Cron diario automático'],
        ['Benchmarks sectoriales', '❌ No existe', '✅ P25/P50/P75 por objetivo'],
        ['Cross orgánico → pago', '❌ Separado', '✅ Integrado'],
        ['Fatiga creativa con nivel', '❌ Solo CTR histórico', '✅ Clasificación automática'],
        ['Vista pública para cliente', '❌ No existe', '✅ Link con JWT 7 días'],
        ['Export PNG para WhatsApp', '❌ No existe', '✅ 1080×1080 en 1 segundo'],
        ['Recomendaciones IA con brief', '❌ No existe', '✅ Copy + ángulo + formato'],
    ]
    t = make_table(comp_data[0], comp_data[1:], [6*cm, 5*cm, 5*cm])
    story.append(t)
    story.append(SP2)
    story.append(ColorBox(
        '→  Meta Ads Manager es una herramienta de gestión. Este sistema es una capa de inteligencia encima.',
        bg=VIOLET_BG, border=BORDER, text_color=VIOLET, font_size=10
    ))
    story.append(PageBreak())

    # ── 05. A QUIÉN LE SIRVE ──────────────────────────────────────────────────
    story.append(Paragraph('05. A quién le sirve este sistema', H1))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=8))

    perfiles = [
        ('Media Buyer / Gestor de cuentas',
         'Trabaja con 3+ cuentas en paralelo.',
         'Reemplaza 2 horas diarias de revisión manual. '
         'Recibe las alertas, ejecuta las acciones y le queda tiempo para estrategia.'),
        ('Agencia de marketing',
         'Maneja múltiples clientes de distintos rubros.',
         'Genera automáticamente el reporte del cliente. '
         'El link público reemplaza el PDF mensual. '
         'Escala sin contratar más analistas.'),
        ('Dueño de negocio que invierte en Meta',
         'Invierte $500k–$3M ARS/mes sin gestor dedicado.',
         'Entiende el estado de su cuenta con el Health Score. '
         'Recibe alertas antes de que se queme el presupuesto. '
         'No necesita saber de publicidad digital.'),
        ('CMO / Director de marketing',
         'Necesita visibilidad sin operar el Ads Manager.',
         'Dashboard ejecutivo con semáforo. '
         'Benchmarks para saber si la cuenta es competitiva. '
         'Export para las reuniones de directorio.'),
    ]

    for titulo, perfil, valor in perfiles:
        story.append(KeepTogether([
            Paragraph(f'<b>{titulo}</b>', BODY_BOLD),
            Paragraph(f'<i>Perfil: {perfil}</i>', BODY_SMALL),
            Paragraph(f'Valor: {valor}', BODY),
            Spacer(1, 0.2*cm),
        ]))

    story.append(PageBreak())

    # ── 06. STACK ─────────────────────────────────────────────────────────────
    story.append(Paragraph('06. Stack tecnológico', H1))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=8))

    stack_data = [
        ['Capa', 'Tecnología', 'Por qué'],
        ['Frontend', 'React 19 + Vite + Tailwind CSS', 'Rápido, mobile-first, sin dependencias pesadas'],
        ['UI Components', 'shadcn/ui + Recharts + Lucide', 'Consistencia visual, accesible, personalizable'],
        ['Backend', 'FastAPI (Python)', 'Async nativo, tipado, ideal para IA'],
        ['Base de datos', 'SQLite / PostgreSQL (prod)', 'Simple en dev, escalable en prod'],
        ['IA', 'Claude 3.5 Sonnet (Anthropic)', 'Mejor en razonamiento contextual y copy creativo'],
        ['Alertas cron', 'GitHub Actions (7am UTC-3)', 'Sin costo adicional, confiable, trazable'],
        ['Autenticación', 'JWT (7 días) + read-only JWT', 'Stateless, sin sesiones en servidor'],
        ['Meta API', 'Graph API v19.0', 'Datos en tiempo real de campañas, anuncios y posts'],
        ['Export', 'Canvas API nativo del browser', 'Sin dependencias externas, instantáneo'],
    ]
    t = make_table(stack_data[0], stack_data[1:], [3.5*cm, 5.5*cm, 6.5*cm])
    story.append(t)
    story.append(PageBreak())

    # ── 07. FAQ ───────────────────────────────────────────────────────────────
    story.append(Paragraph('07. Preguntas frecuentes', H1))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=8))

    faqs = [
        ('¿Necesito acceso al Ads Manager para usarlo?',
         'No. El dashboard reemplaza al Ads Manager para el 90% de las tareas diarias. '
         'El Ads Manager sigue disponible para operaciones avanzadas o configuración inicial de campañas.'),
        ('¿El sistema puede pausar o escalar anuncios automáticamente?',
         'Actualmente las acciones son sugeridas y el equipo las ejecuta manualmente. '
         'La automatización de ejecución está en el roadmap como funcionalidad opt-in '
         '(el usuario define umbrales y el sistema actúa dentro de esos límites).'),
        ('¿Qué pasa si el token de Meta vence?',
         'Meta emite tokens de 60 días. El sistema detecta cuando el token está por vencer '
         'y notifica para renovarlo. El proceso de renovación toma menos de 5 minutos.'),
        ('¿Se puede usar con múltiples cuentas de Meta?',
         'Sí. La arquitectura es multi-tenant. Cada cuenta tiene su propio perfil, '
         'sus propias alertas y su propia configuración de campaign filter.'),
        ('¿Los datos del cliente están seguros?',
         'Los datos se almacenan en la infraestructura del operador (no en servidores de terceros). '
         'El link público para clientes usa tokens con expiración automática. '
         'No se almacenan contraseñas ni datos de pago.'),
        ('¿Funciona con Google Ads también?',
         'Actualmente el sistema está optimizado para Meta Ads (Facebook, Instagram, WhatsApp). '
         'La integración con Google Ads está en el roadmap para Q3 2026.'),
        ('¿Necesito saber programar para usarlo?',
         'No. El dashboard es una aplicación web como cualquier otra. '
         'El setup inicial requiere un desarrollador (30 minutos), '
         'después el equipo trabaja desde la interfaz gráfica.'),
    ]

    for pregunta, respuesta in faqs:
        story.append(KeepTogether([
            Paragraph(f'<b>— {pregunta}</b>', BODY_BOLD),
            Paragraph(respuesta, BODY),
            Spacer(1, 0.3*cm),
        ]))

    story.append(PageBreak())

    # ── 08. PRÓXIMOS PASOS ────────────────────────────────────────────────────
    story.append(Paragraph('08. Próximos pasos', H1))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=8))

    pasos_data = [
        ['#', 'Acción', 'Tiempo estimado'],
        ['1', 'Demo en vivo del dashboard con datos reales', '30 minutos'],
        ['2', 'Definir el plan y las cuentas a conectar', '1 reunión'],
        ['3', 'Setup: conectar token Meta + configurar alertas', '30 minutos'],
        ['4', 'Primera auditoría entregada', '48 horas'],
        ['5', 'Onboarding del equipo', '1 hora'],
    ]
    t = make_table(pasos_data[0], pasos_data[1:], [1.2*cm, 11.5*cm, 3.8*cm])
    story.append(t)
    story.append(SP2)

    story.append(Paragraph('Roadmap — próximas funcionalidades', H2))
    roadmap = [
        'Integración Google Ads (campañas de Search y Performance Max)',
        'Automatización de acciones con umbrales configurables',
        'Reporte PDF mensual automático enviado por email/Telegram',
        'Análisis por placement: Stories vs Feed vs Reels vs Shorts',
        'Predicción de CPA: "si escalás $X, el CPA sube Y%"',
        'Integración WhatsApp Business API para ejecutar acciones por chat',
    ]
    for r in roadmap:
        story.append(bullet(r, color=ORANGE))

    story.append(SP2)
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=12))

    # Cierre
    story.append(Paragraph('Renzo Gasparini', s('sig', fontName='Helvetica-Bold', fontSize=14,
                            textColor=VIOLET, alignment=TA_CENTER)))
    story.append(Paragraph('renzogasparini85@gmail.com', s('sig2', fontName='Helvetica', fontSize=11,
                            textColor=SLATE, alignment=TA_CENTER)))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph('Mayo 2026', FOOTER_S))

    return story


# ── Build PDF ─────────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=2*cm,
    rightMargin=2*cm,
    topMargin=2.5*cm,
    bottomMargin=2*cm,
    title='Meta Ads AI — Sistema de Inteligencia Publicitaria',
    author='Renzo Gasparini',
    subject='Propuesta Comercial — Mayo 2026',
)

story = build_story()
doc.build(story, onFirstPage=on_first_page, onLaterPages=on_page)
print(f'✅  PDF generado: {OUTPUT}')
