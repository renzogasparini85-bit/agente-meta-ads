export const kpis = {
  gasto: { value: '$48.230', change: +12.4 },
  conversaciones: { value: '312', change: +8.7 },
  cpa: { value: '$154,59', change: -6.2 },
  ctr: { value: '3.84%', change: +0.4 },
  frecuencia: { value: '2.1', change: +0.3 },
}

export const campaigns = [
  { id: 1, nombre: 'IFPA | Piloto Aviación | CABA', objetivo: 'MENSAJES', gasto: 18420, impresiones: 312000, ctr: 4.2, cpc: 1.41, conversaciones: 134, cpa: 137.46, frecuencia: 1.8, estado: 'verde' },
  { id: 2, nombre: 'IFPA | Técnico Aeronáutico | GBA', objetivo: 'MENSAJES', gasto: 14800, impresiones: 198000, ctr: 3.6, cpc: 2.07, conversaciones: 89, cpa: 166.29, frecuencia: 2.3, estado: 'amarillo' },
  { id: 3, nombre: 'IFPA | Despachante | Nacional', objetivo: 'MENSAJES', gasto: 9200, impresiones: 156000, ctr: 2.9, cpc: 2.03, conversaciones: 54, cpa: 170.37, frecuencia: 2.7, estado: 'rojo' },
  { id: 4, nombre: 'IFPA | Retargeting 30d', objetivo: 'MENSAJES', gasto: 5810, impresiones: 78000, ctr: 5.1, cpc: 0.95, conversaciones: 35, cpa: 166.0, frecuencia: 3.1, estado: 'rojo' },
]

export const creatives = [
  { id: 1, nombre: 'VID_piloto_testimonial_v3', cpa: 98.20, ctr: 5.8, frecuencia: 1.6, dias: 14, badge: 'escalar', gasto: 8200 },
  { id: 2, nombre: 'CAR_precio_comparativo_v1', cpa: 124.50, ctr: 4.3, frecuencia: 1.9, dias: 21, badge: 'replicar', gasto: 6100 },
  { id: 3, nombre: 'IMG_detrás_escenas_hangar', cpa: 136.80, ctr: 3.9, frecuencia: 2.0, dias: 18, badge: 'mantener', gasto: 5400 },
  { id: 4, nombre: 'VID_clase_simulador_v2', cpa: 148.10, ctr: 3.4, frecuencia: 2.4, dias: 30, badge: 'fatiga', gasto: 7800 },
  { id: 5, nombre: 'IMG_egresados_uniformes', cpa: 183.40, ctr: 2.1, frecuencia: 2.8, dias: 45, badge: 'pausar', gasto: 4200 },
  { id: 6, nombre: 'CAR_precio_cuotas_v2', cpa: 210.70, ctr: 1.8, frecuencia: 3.2, dias: 38, badge: 'pausar', gasto: 3900 },
]

export const historial = [
  { fecha: '01 Abr', cpa: 182, gasto: 1200, conversaciones: 7 },
  { fecha: '05 Abr', cpa: 168, gasto: 1450, conversaciones: 9 },
  { fecha: '09 Abr', cpa: 155, gasto: 1600, conversaciones: 10 },
  { fecha: '13 Abr', cpa: 171, gasto: 1380, conversaciones: 8 },
  { fecha: '17 Abr', cpa: 143, gasto: 1720, conversaciones: 12 },
  { fecha: '21 Abr', cpa: 138, gasto: 1850, conversaciones: 13 },
  { fecha: '25 Abr', cpa: 129, gasto: 1940, conversaciones: 15 },
  { fecha: '29 Abr', cpa: 155, gasto: 1700, conversaciones: 11 },
  { fecha: '03 May', cpa: 147, gasto: 1780, conversaciones: 12 },
  { fecha: '07 May', cpa: 135, gasto: 1920, conversaciones: 14 },
]

export const alerts = [
  { id: 1, tipo: 'frecuencia', mensaje: 'CAR_precio_cuotas_v2 — Frecuencia 3.2 supera el umbral (2.5)', tiempo: 'hace 2 horas', estado: 'activa', severidad: 'alta' },
  { id: 2, tipo: 'ctr_caida', mensaje: 'IMG_egresados_uniformes — CTR cayó 40% en los últimos 7 días', tiempo: 'hace 5 horas', estado: 'activa', severidad: 'alta' },
  { id: 3, tipo: 'cpa_alto', mensaje: 'IFPA | Despachante | Nacional — CPA $170 supera límite de $160', tiempo: 'hace 1 día', estado: 'activa', severidad: 'media' },
  { id: 4, tipo: 'sin_conversion', mensaje: 'CAR_precio_cuotas_v2 — $890 gastados sin nuevas conversiones hoy', tiempo: 'hace 1 día', estado: 'activa', severidad: 'media' },
  { id: 5, tipo: 'pausa_auto', mensaje: 'VID_antiguo_v1 — Pausado automáticamente por CPA > $250', tiempo: 'hace 3 días', estado: 'resuelta', severidad: 'baja' },
  { id: 6, tipo: 'frecuencia', mensaje: 'IFPA | Retargeting 30d — Frecuencia 3.1, audiencia saturada', tiempo: 'hace 3 días', estado: 'activa', severidad: 'alta' },
]

export const recommendations = [
  {
    tipo: 'escalar',
    titulo: 'Escalar VID_piloto_testimonial_v3',
    descripcion: 'CPA $98.20 — el más bajo del portfolio. Aumentar presupuesto 30% y crear variantes con mismo gancho.',
    impacto: 'Alto',
    accion: 'Subir budget de $590/día a $770/día',
  },
  {
    tipo: 'pausar',
    titulo: 'Pausar CAR_precio_cuotas_v2',
    descripcion: 'CPA $210 + frecuencia 3.2. La audiencia está saturada. Cada peso gastado aquí pierde frente a los creativos ganadores.',
    impacto: 'Alto',
    accion: 'Pausar y redirigir $130/día al creativo ganador',
  },
  {
    tipo: 'replicar',
    titulo: 'Replicar ángulo de precio comparativo',
    descripcion: 'CAR_precio_comparativo_v1 convierte bien. Crear versión video del mismo ángulo y probar con audiencias lookalike.',
    impacto: 'Medio',
    accion: 'Brief para diseñador: video 15s con mismo copy',
  },
  {
    tipo: 'joya',
    titulo: 'Joya oculta: VID_piloto_testimonial_v3',
    descripcion: 'Con solo $8.200 de gasto tiene el mejor CPA del portfolio ($98.20). Está siendo subutilizado frente a creativos de menor performance.',
    impacto: 'Alto',
    accion: 'Priorizar en todos los adsets activos',
  },
]
