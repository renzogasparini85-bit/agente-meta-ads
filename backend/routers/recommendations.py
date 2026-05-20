from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, Client, Recommendation
from auth import get_current_client
from services.meta_api import get_ad_insights, get_ad_created_dates, extract_conversions, compute_cpa
from datetime import datetime, timezone
import httpx
import os
import json

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

# Umbrales (mismos que creatives.py)
ESCALAR_CPA_MAX   = 500
REPLICAR_CPA_MAX  = 650
PAUSAR_CPA_MIN    = 900
PAUSAR_FREQ_MIN   = 3.0
FATIGA_FREQ       = 2.5
NUEVO_DIAS        = 7
GASTO_MINIMO      = 3000


def dias_desde(created_time: str) -> int:
    if not created_time:
        return 99
    try:
        dt = datetime.fromisoformat(created_time.replace("+0000", "+00:00"))
        return (datetime.now(timezone.utc) - dt).days
    except Exception:
        return 99


def analizar_ads(ads: list, created_dates: dict) -> dict:
    """
    Lógica de reglas sobre los datos reales de Meta.
    Devuelve resumen + lista de recomendaciones + brief del ganador.
    """
    enriched = []
    for a in ads:
        spend  = float(a.get("spend", 0) or 0)
        if spend < 100:
            continue
        conv   = extract_conversions(a.get("actions", []))
        cpa    = compute_cpa(spend, conv)
        ctr    = round(float(a.get("ctr", 0) or 0), 2)
        freq   = round(float(a.get("frequency", 0) or 0), 2)
        dias   = dias_desde(created_dates.get(a.get("ad_id"), ""))
        enriched.append({
            "id":     a.get("ad_id"),
            "nombre": a.get("ad_name", ""),
            "gasto":  round(spend, 0),
            "conv":   conv,
            "cpa":    cpa,
            "ctr":    ctr,
            "freq":   freq,
            "dias":   dias,
        })

    if not enriched:
        return None

    con_cpa    = [x for x in enriched if x["cpa"] is not None and x["dias"] > NUEVO_DIAS]
    sin_conv   = [x for x in enriched if x["cpa"] is None and x["gasto"] >= GASTO_MINIMO and x["dias"] > NUEVO_DIAS]
    nuevos     = [x for x in enriched if x["dias"] <= NUEVO_DIAS]
    a_pausar   = [x for x in con_cpa if x["cpa"] >= PAUSAR_CPA_MIN or x["freq"] >= PAUSAR_FREQ_MIN]
    con_fatiga = [x for x in con_cpa if x["freq"] >= FATIGA_FREQ and x["cpa"] < PAUSAR_CPA_MIN]
    ganadores  = sorted([x for x in con_cpa if x["cpa"] <= ESCALAR_CPA_MAX], key=lambda x: x["cpa"])
    replicar   = sorted([x for x in con_cpa if ESCALAR_CPA_MAX < x["cpa"] <= REPLICAR_CPA_MAX], key=lambda x: x["cpa"])

    gasto_total     = sum(x["gasto"] for x in enriched)
    gasto_pausar    = sum(x["gasto"] for x in a_pausar)
    gasto_sin_conv  = sum(x["gasto"] for x in sin_conv)
    gasto_rescatable = gasto_pausar + gasto_sin_conv
    conv_total      = sum(x["conv"] for x in con_cpa)
    cpa_promedio    = round(gasto_total / conv_total, 0) if conv_total > 0 else None

    recomendaciones = []

    # 1. Escalar ganadores
    for g in ganadores[:2]:
        recomendaciones.append({
            "tipo":       "escalar",
            "titulo":     f'Escalar "{g["nombre"][:40]}"',
            "descripcion": f'CPA ${g["cpa"]:,.0f} — mejor del portfolio con {g["conv"]} conversiones y ${g["gasto"]:,.0f} gastados. CTR {g["ctr"]}%.',
            "accion":     f'Subir presupuesto 30-50%. Es el creativo más eficiente activo.',
            "impacto":    "Alto",
            "ad_id":      g["id"],
            "ad_nombre":  g["nombre"],
        })

    # 2. Pausar los peores
    for p in sorted(a_pausar, key=lambda x: -(x["cpa"] or 0))[:3]:
        razon = f'Frecuencia {p["freq"]} (saturación de audiencia)' if p["freq"] >= PAUSAR_FREQ_MIN else f'CPA ${p["cpa"]:,.0f} muy alto'
        recomendaciones.append({
            "tipo":       "pausar",
            "titulo":     f'Pausar "{p["nombre"][:40]}"',
            "descripcion": f'{razon}. ${p["gasto"]:,.0f} gastados con solo {p["conv"]} conversiones.',
            "accion":     f'Pausar y redirigir ${p["gasto"]:,.0f} hacia los creativos ganadores.',
            "impacto":    "Alto",
            "ad_id":      p["id"],
            "ad_nombre":  p["nombre"],
        })

    # 3. Replicar los buenos
    for r in replicar[:1]:
        recomendaciones.append({
            "tipo":       "replicar",
            "titulo":     f'Replicar ángulo de "{r["nombre"][:35]}"',
            "descripcion": f'CPA ${r["cpa"]:,.0f} con {r["conv"]} conversiones. Buen rendimiento — crear variante con nueva imagen o copy.',
            "accion":     f'Duplicar el adset con una variante visual. Probar mismo copy con diferente hook.',
            "impacto":    "Medio",
            "ad_id":      r["id"],
            "ad_nombre":  r["nombre"],
        })

    # 4. Sin conversiones con gasto real
    if sin_conv:
        peor = sorted(sin_conv, key=lambda x: -x["gasto"])[0]
        recomendaciones.append({
            "tipo":       "pausar",
            "titulo":     f'Sin conversiones: "{peor["nombre"][:35]}"',
            "descripcion": f'${peor["gasto"]:,.0f} gastados en {peor["dias"]} días sin ninguna conversión registrada.',
            "accion":     f'Pausar inmediatamente. Revisar segmentación y landing page antes de reactivar.',
            "impacto":    "Alto",
            "ad_id":      peor["id"],
            "ad_nombre":  peor["nombre"],
        })

    # 5. Fatiga
    for f in con_fatiga[:1]:
        recomendaciones.append({
            "tipo":       "fatiga",
            "titulo":     f'Fatiga en "{f["nombre"][:35]}"',
            "descripcion": f'Frecuencia {f["freq"]} — la audiencia ya vio el anuncio demasiadas veces. CTR probablemente cayendo.',
            "accion":     f'Renovar el creativo con nuevo formato o ampliar la audiencia.',
            "impacto":    "Medio",
            "ad_id":      f["id"],
            "ad_nombre":  f["nombre"],
        })

    # Joya oculta: buen CPA pero bajo presupuesto
    joyas = [x for x in ganadores if x["gasto"] < gasto_total * 0.05]
    if joyas:
        j = joyas[0]
        recomendaciones.append({
            "tipo":       "joya",
            "titulo":     f'Joya oculta: "{j["nombre"][:35]}"',
            "descripcion": f'CPA ${j["cpa"]:,.0f} con solo ${j["gasto"]:,.0f} gastados ({round(j["gasto"]/gasto_total*100,1)}% del presupuesto total). Está subutilizado.',
            "accion":     f'Escalar presupuesto x3. Potencial de reducir CPA promedio del portfolio.',
            "impacto":    "Alto",
            "ad_id":      j["id"],
            "ad_nombre":  j["nombre"],
        })

    # Resumen ejecutivo
    partes = []
    if cpa_promedio:
        partes.append(f"CPA promedio del portfolio: ${cpa_promedio:,.0f}")
    if ganadores:
        partes.append(f"{len(ganadores)} creativo{'s' if len(ganadores)>1 else ''} ganador{'es' if len(ganadores)>1 else ''} con CPA < ${ESCALAR_CPA_MAX:,.0f}")
    if a_pausar:
        partes.append(f"{len(a_pausar)} anuncio{'s' if len(a_pausar)>1 else ''} a pausar ({f'${gasto_pausar:,.0f}' } en gasto ineficiente)")
    if nuevos:
        partes.append(f"{len(nuevos)} anuncio{'s' if len(nuevos)>1 else ''} nuevo{'s' if len(nuevos)>1 else ''} en período de aprendizaje")

    resumen = ". ".join(partes) + "."

    # Brief del ganador
    brief = ""
    if ganadores:
        g = ganadores[0]
        brief = (
            f"Anuncio de referencia: {g['nombre']}\n"
            f"CPA: ${g['cpa']:,.0f} | CTR: {g['ctr']}% | Frecuencia: {g['freq']}\n\n"
            f"Este es el creativo con mejor performance del período. "
            f"Crear variante manteniendo el mismo ángulo y gancho visual. "
            f"Probar con nueva cara/voz si es video, o nueva imagen si es estático."
        )

    return {
        "resumen":          resumen,
        "recomendaciones":  recomendaciones[:6],
        "brief":            brief,
    }


@router.get("")
def list_recommendations(
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    recs = (
        db.query(Recommendation)
        .filter(Recommendation.client_id == client.id)
        .order_by(Recommendation.generado_en.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id":           r.id,
            "tipo":         r.tipo,
            "titulo":       r.titulo,
            "descripcion":  r.descripcion,
            "accion":       r.accion,
            "impacto":      r.impacto,
            "ad_id":        r.ad_id,
            "ad_nombre":    r.ad_nombre,
            "generado_en":  r.generado_en.isoformat(),
        }
        for r in recs
    ]


@router.post("/generate")
async def generate_recommendations(
    days: int = 30,
    account_id: str = Query(None),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    from routers.account_resolver import resolve_account
    ad_account_id, token, _, campaign_filter, _ = resolve_account(client, account_id, db)

    ads_raw, created_dates = await get_ad_insights(
        ad_account_id, token, days
    ), await get_ad_created_dates(
        ad_account_id, token
    )

    # Filtrar por campaña si corresponde
    if campaign_filter:
        ads_raw = [
            a for a in ads_raw
            if campaign_filter.lower() in (a.get("campaign_name") or a.get("ad_name") or "").lower()
        ]

    resultado = analizar_ads(ads_raw, created_dates)
    if not resultado:
        raise HTTPException(status_code=400, detail="No hay datos suficientes para analizar.")

    # Limpiar recomendaciones anteriores
    db.query(Recommendation).filter(Recommendation.client_id == client.id).delete()

    saved = []
    for r in resultado["recomendaciones"]:
        rec = Recommendation(
            client_id=client.id,
            tipo=r["tipo"],
            titulo=r["titulo"],
            descripcion=r["descripcion"],
            accion=r["accion"],
            impacto=r["impacto"],
            ad_id=r.get("ad_id"),
            ad_nombre=r.get("ad_nombre"),
        )
        db.add(rec)
        saved.append(r)

    db.commit()

    return {
        "ok":               True,
        "resumen":          resultado["resumen"],
        "brief":            resultado["brief"],
        "recomendaciones":  saved,
        "total":            len(saved),
    }


def _generar_brief_interno(angulo, formato, tema, marca, tono, publico, beneficios, propuesta):
    tema = (tema or "el producto/servicio").strip()
    bens_lista = [b.strip() for b in (beneficios or "").split("\n") if b.strip()][:4]
    bens_str   = "\n".join(f"• {b}" for b in bens_lista) if bens_lista else f"• {propuesta or 'Calidad comprobada'}"

    # Cada ángulo define su propia narrativa completa
    briefs_imagen = {
        "Mismo tema, distinto gancho": f"""BRIEF — PLACA ESTÁTICA · Ángulo: Mismo tema, distinto gancho
Marca: {marca}

━━━ TITULAR ━━━
"Algo que todavía no te contamos sobre esto"

━━━ SUBTÍTULO ━━━
Una perspectiva diferente del mismo tema — desde adentro de {marca}.

━━━ CAPTION ━━━
Siempre hablamos de {tema}.
Hoy lo contamos desde otro lado.

Hay una parte de esto que normalmente no mostramos: [completar con detalle único/sorpresivo del proceso, origen o resultado].

Y nos parece importante que lo sepas, porque cambia la forma en que lo vas a ver la próxima vez.

¿Te suma esto? Guardalo para no perderlo. 👇
O escribinos si querés saber más.

━━━ DISEÑO ━━━
• Imagen: ángulo no convencional del producto/servicio (detalle, proceso, reverso)
• Tipografía: bold blanco sobre fondo oscuro o viceversa
• Sin texto excesivo — el copy va en el caption""",

        "Problema → solución": f"""BRIEF — PLACA ESTÁTICA · Ángulo: Problema → solución
Marca: {marca}

━━━ TITULAR ━━━
"¿Cansado de que esto no funcione?"

━━━ SUBTÍTULO ━━━
En {marca} lo resolvemos — sin vueltas.

━━━ CAPTION ━━━
Si alguna vez te pasó que {tema.lower()[:80]}... sabés exactamente de qué estamos hablando.

Es frustrante. Y lo entendemos.

Por eso en {marca} trabajamos para que no tengas que lidiar más con eso.
{bens_str}

La solución existe — y está más cerca de lo que pensás.
Escribinos hoy y te contamos cómo. 👇

━━━ DISEÑO ━━━
• Mitad izquierda: ícono o imagen del "problema" (rojo/gris)
• Mitad derecha: ícono o imagen de la "solución" (verde/color de marca)
• Flecha en el centro separando ambos lados""",

        "Testimonio / caso real": f"""BRIEF — PLACA ESTÁTICA · Ángulo: Testimonio / caso real
Marca: {marca}

━━━ TITULAR ━━━
"Esto nos dijo [nombre de cliente] después de trabajar con nosotros"

━━━ SUBTÍTULO ━━━
Resultados reales, en palabras de quien los vivió.

━━━ CAPTION ━━━
Nada convence más que la experiencia de alguien que ya pasó por lo mismo que vos.

[Nombre], [perfil breve del cliente], nos contactó porque [problema inicial relacionado con: {tema[:60]}].

Hoy [resultado concreto y medible].

¿Querés saber cómo lo logramos?
Escribinos — te contamos el proceso paso a paso. 👇

━━━ DISEÑO ━━━
• Foto real del cliente (con permiso) o foto del resultado
• Cita textual del testimonio en tipografía cursiva o destacada
• Nombre + descripción breve del cliente debajo
• Logo de {marca} discreto""",

        "Datos y estadísticas": f"""BRIEF — PLACA ESTÁTICA · Ángulo: Datos y estadísticas
Marca: {marca}

━━━ TITULAR ━━━
"El X% de las personas lo hace mal — ¿vos sos de ese grupo?"

━━━ SUBTÍTULO ━━━
Un número que cambia la perspectiva sobre {tema[:50]}.

━━━ CAPTION ━━━
Los datos no mienten:
[Dato 1 concreto relacionado con el tema — fuente si es posible]
[Dato 2 que refuerza el problema o la oportunidad]
[Dato 3 que posiciona la solución de {marca}]

La buena noticia: el grupo que lo hace bien, lo hace con {marca}.
{bens_str}

¿Querés estar del lado correcto del dato? Escribinos. 👇

━━━ DISEÑO ━━━
• Número grande en el centro (el dato más impactante)
• Tipografía bold, color de acento
• Contexto del dato en texto pequeño debajo
• Fondo limpio — el número tiene que respirar""",

        "Detrás de escena": f"""BRIEF — PLACA ESTÁTICA · Ángulo: Detrás de escena
Marca: {marca}

━━━ TITULAR ━━━
"Así se hace en {marca} — sin filtros"

━━━ SUBTÍTULO ━━━
El proceso que pocos muestran y que hace la diferencia.

━━━ CAPTION ━━━
La mayoría solo ve el resultado final.
Hoy te mostramos lo que hay detrás.

Cuando trabajamos en {tema[:60]}, hacemos algo que no todo el mundo hace:
[Paso 1 del proceso interno — específico y concreto]
[Paso 2 — lo que hace diferente a {marca}]
[Paso 3 — el control de calidad o el detalle que marca la diferencia]

No es casualidad que el resultado sea así.
¿Querés trabajar con quienes hacen las cosas bien? Hablemos. 👇

━━━ DISEÑO ━━━
• Foto real del proceso/equipo/taller (sin producción excesiva)
• Texto superpuesto discreto
• Estética cruda, auténtica — no stock photos""",

        "Urgencia / oferta limitada": f"""BRIEF — PLACA ESTÁTICA · Ángulo: Urgencia / oferta limitada
Marca: {marca}

━━━ TITULAR ━━━
"Solo hasta el [fecha] — después volvemos al precio normal"

━━━ SUBTÍTULO ━━━
Si lo pensás mucho, lo perdés.

━━━ CAPTION ━━━
Una vez por [período], en {marca} hacemos esto:
[Descripción concreta de la oferta o condición especial relacionada con: {tema[:60]}]

No es marketing. Es una ventana real que se cierra.
{bens_str}

¿Querés aprovecharlo? Escribinos HOY con la palabra [PROMO] y te reservamos el lugar.
Los cupos son limitados — en serio. 👇

━━━ DISEÑO ━━━
• Contador visual o fecha límite destacada
• Colores de urgencia (rojo/naranja) sin perder identidad de marca
• CTA muy visible: "Escribinos hoy"
• Tachado del precio anterior si aplica""",

        "Educativo / tutorial": f"""BRIEF — PLACA ESTÁTICA · Ángulo: Educativo / tutorial
Marca: {marca}

━━━ TITULAR ━━━
"3 cosas que tenés que saber antes de decidir"

━━━ SUBTÍTULO ━━━
Información que te va a ahorrar errores (y plata).

━━━ CAPTION ━━━
Antes de hacer cualquier cosa relacionado con {tema[:60]}, leé esto:

1️⃣ [Consejo clave 1 — específico, accionable, no genérico]
2️⃣ [Consejo clave 2 — algo que la mayoría ignora]
3️⃣ [Consejo clave 3 — el diferencial que maneja {marca}]

¿Por qué te lo contamos? Porque clientes informados toman mejores decisiones.
Y esas decisiones, cuando nos eligen, nos hacen mejores a nosotros también.

Guardalo. Y si tenés dudas, escribinos. 👇

━━━ DISEÑO ━━━
• Lista numerada visual (1, 2, 3) con ícono por punto
• Fondo claro, tipografía legible
• Sensación de "infografía" — educativo, no publicitario""",

        "Comparación antes/después": f"""BRIEF — PLACA ESTÁTICA · Ángulo: Comparación antes/después
Marca: {marca}

━━━ TITULAR ━━━
"Antes de {marca} vs. después de {marca}"

━━━ SUBTÍTULO ━━━
El contraste que lo dice todo.

━━━ CAPTION ━━━
A veces la mejor explicación es mostrar la diferencia.

ANTES: [Situación o problema que tenía el cliente antes de {marca}]
DESPUÉS: [Resultado concreto, medible, tangible con {marca}]

No hace falta agregar mucho más.
{bens_str}

¿Querés pasar del "antes" al "después"? Escribinos hoy. 👇

━━━ DISEÑO ━━━
• División visual clara: izquierda=antes (desaturado/gris) / derecha=después (color)
• Línea divisoria en el centro
• Etiquetas "ANTES" y "DESPUÉS" bien visibles
• Foto real del caso si existe""",
    }

    briefs_carrusel = {
        "Mismo tema, distinto gancho": f"""BRIEF — CARRUSEL · Ángulo: Mismo tema, distinto gancho
Marca: {marca}

SLIDE 1 — PORTADA
Titular: "Lo que nunca te contamos sobre {tema[:50]}"
Visual: imagen del producto/servicio desde un ángulo poco visto

SLIDE 2
Titular: "La versión que todo el mundo conoce"
Texto: Describir cómo se suele comunicar este tema normalmente. El lugar común.

SLIDE 3
Titular: "Pero hay otra historia"
Texto: Presentar el ángulo nuevo, sorpresivo o menos conocido del tema.

SLIDE 4
Titular: "Por qué importa esto"
Texto: Consecuencias concretas de conocer esta perspectiva diferente.
{bens_str}

SLIDE 5
Titular: "En {marca} lo hacemos así"
Texto: Cómo este nuevo enfoque se traduce en lo que ofrece {marca}.

SLIDE 6 — CTA
Titular: "¿Te cambió la perspectiva?"
Texto: Comentá, guardalo, o escribinos si querés saber más.

CAPTION: "Pasá los slides — prometemos que el slide 3 te sorprende. Todo sobre {tema[:40]}... pero desde otro lado."

DISEÑO: Paleta consistente. Tipografía bold en titulares. Flecha sutil en cada slide.""",

        "Problema → solución": f"""BRIEF — CARRUSEL · Ángulo: Problema → solución
Marca: {marca}

SLIDE 1 — PORTADA (el dolor)
Titular: "¿Por qué {tema[:50]} siempre termina siendo un problema?"
Visual: imagen que evoque la frustración del problema

SLIDE 2
Titular: "El error más común"
Texto: El mistake principal que comete la gente con este tema. Concreto, sin rodeos.

SLIDE 3
Titular: "Por qué pasa esto"
Texto: La causa raíz. No el síntoma — la causa real.

SLIDE 4
Titular: "La solución que funciona"
Texto:
{bens_str}

SLIDE 5
Titular: "Cómo lo hacemos en {marca}"
Texto: El proceso paso a paso. Específico. Que genere confianza.

SLIDE 6 — CTA
Titular: "Basta de lidiar con esto solo"
Texto: "En {marca} lo resolvemos. Escribinos hoy."

CAPTION: "Si alguna vez {tema[:50].lower()} te generó un problema, este carrusel es para vos. Pasá los slides — la solución está en el slide 4."

DISEÑO: Slides 1-3 en tonos apagados (el problema). Slides 4-6 en colores de marca (la solución).""",

        "Testimonio / caso real": f"""BRIEF — CARRUSEL · Ángulo: Testimonio / caso real
Marca: {marca}

SLIDE 1 — PORTADA
Titular: "Cómo [nombre cliente] logró [resultado] con {marca}"
Visual: foto del cliente o del resultado (con permiso)

SLIDE 2
Titular: "El punto de partida"
Texto: Situación inicial del cliente. El problema que tenía. En primera persona si es posible.

SLIDE 3
Titular: "Lo que intentó antes"
Texto: Otras soluciones que probó y no funcionaron. Humaniza y genera empatía.

SLIDE 4
Titular: "Por qué eligió {marca}"
Texto: El momento de decisión. Qué le generó confianza.

SLIDE 5
Titular: "El resultado"
Texto: Resultado concreto y medible. Números si es posible. Cita textual del cliente.

SLIDE 6 — CTA
Titular: "¿Querés el mismo resultado?"
Texto: "Escribinos — te contamos cómo."

CAPTION: "Historia real. Resultado real. Así ayudamos a [nombre] con {tema[:40]}. Pasá los slides y mirá cómo fue el proceso de principio a fin."

DISEÑO: Foto real del cliente en portada. Citas en tipografía cursiva. Sensación de caso de estudio.""",

        "Datos y estadísticas": f"""BRIEF — CARRUSEL · Ángulo: Datos y estadísticas
Marca: {marca}

SLIDE 1 — PORTADA (el dato bomba)
Titular: "El X% de las personas no sabe esto — ¿vos sos del otro X%?"
Visual: número grande sobre fondo de color

SLIDE 2
Titular: "El contexto"
Texto: De dónde viene este dato. Por qué es relevante para {tema[:50]}.

SLIDE 3
Titular: "Lo que revela el número"
Texto: Implicancias concretas del dato. Qué significa en la práctica.

SLIDE 4
Titular: "Otro dato que sorprende"
Texto: Segundo estadístico que refuerza la narrativa. Fuente si aplica.

SLIDE 5
Titular: "Cómo {marca} trabaja con estos números"
Texto:
{bens_str}

SLIDE 6 — CTA
Titular: "Pasá al lado correcto de la estadística"
Texto: "Escribinos y te explicamos cómo."

CAPTION: "Los números hablan solos. Y lo que dicen sobre {tema[:40]} es más importante de lo que pensás. Mirá los slides y sacá tus conclusiones."

DISEÑO: Cada slide con UN número o dato protagonista. Tipografía bold enorme. Fondo limpio.""",

        "Detrás de escena": f"""BRIEF — CARRUSEL · Ángulo: Detrás de escena
Marca: {marca}

SLIDE 1 — PORTADA
Titular: "Así funciona {marca} por dentro — sin filtros"
Visual: foto real del espacio de trabajo, equipo o proceso

SLIDE 2
Titular: "El paso que nadie ve"
Texto: Primera etapa del proceso interno. Lo que pasa antes de que el cliente lo reciba.

SLIDE 3
Titular: "Acá es donde hacemos la diferencia"
Texto: El momento clave del proceso donde {marca} se separa de la competencia.

SLIDE 4
Titular: "El control que aplicamos"
Texto: Cómo se asegura la calidad. Estándar interno de {marca}.
{bens_str}

SLIDE 5
Titular: "El resultado de todo esto"
Texto: Lo que el cliente recibe y por qué es distinto a lo que consigue en otro lado.

SLIDE 6 — CTA
Titular: "¿Querés trabajar con quienes hacen las cosas bien?"
Texto: "Hablemos."

CAPTION: "Poca gente muestra esto. Nosotros sí, porque creemos que cuando ves cómo trabajamos, la decisión se toma sola. Pasá los slides."

DISEÑO: Fotos reales (no stock). Estética auténtica. Puede ser levemente imperfecto — eso suma credibilidad.""",

        "Urgencia / oferta limitada": f"""BRIEF — CARRUSEL · Ángulo: Urgencia / oferta limitada
Marca: {marca}

SLIDE 1 — PORTADA
Titular: "ATENCIÓN: esto cierra el [fecha]"
Visual: contador visual o fecha destacada en rojo/naranja

SLIDE 2
Titular: "¿Qué está pasando?"
Texto: Explicación clara de la oferta o condición especial. Sin letra chica.

SLIDE 3
Titular: "Qué incluye"
Texto: Detalle completo de lo que se ofrece. Concreto y específico.
{bens_str}

SLIDE 4
Titular: "¿Para quién es esto?"
Texto: Perfil del cliente ideal para esta oferta. Ayuda a que el lector se identifique.

SLIDE 5
Titular: "Lo que dicen quienes ya lo aprovecharon"
Texto: Testimonios breves o resultados de clientes anteriores.

SLIDE 6 — CTA con urgencia
Titular: "Los cupos se agotan — este es el momento"
Texto: "Escribinos HOY con la palabra [PROMO] y te reservamos el tuyo."

CAPTION: "Pocas veces hacemos esto. Esta es una de esas veces. Pasá los slides y fijate si aplica para vos — si aplica, no lo dejes para mañana."

DISEÑO: Colores de urgencia en portada y CTA. Resto en paleta de marca. Contador visual si es posible.""",

        "Educativo / tutorial": f"""BRIEF — CARRUSEL · Ángulo: Educativo / tutorial
Marca: {marca}

SLIDE 1 — PORTADA
Titular: "Guía completa: {tema[:50]}"
Subtítulo: "Lo que necesitás saber antes de decidir"

SLIDE 2
Titular: "Paso 1: Lo básico"
Texto: El concepto fundamental. Sin tecnicismos. Claro y directo.

SLIDE 3
Titular: "Paso 2: Lo que marca la diferencia"
Texto: La variable clave que la mayoría ignora. El insight que agrega valor.

SLIDE 4
Titular: "Paso 3: Cómo aplicarlo"
Texto: Instrucción concreta y accionable. Que el lector pueda usar esto hoy.

SLIDE 5
Titular: "El error más común (evitalo)"
Texto: El mistake típico y cómo no caer en él.
{bens_str}

SLIDE 6 — CTA
Titular: "¿Querés que lo hagamos nosotros por vos?"
Texto: "En {marca} nos encargamos. Escribinos."

CAPTION: "Todo lo que necesitás saber sobre {tema[:40]} en 6 slides. Guardalo — lo vas a usar. Y si preferís que lo hagamos nosotros, hablemos."

DISEÑO: Estética de infografía. Íconos simples. Numeración visible. Fondo claro.""",

        "Comparación antes/después": f"""BRIEF — CARRUSEL · Ángulo: Antes/después
Marca: {marca}

SLIDE 1 — PORTADA
Titular: "La transformación que logra {marca}"
Visual: imagen dividida antes/después o flecha de evolución

SLIDE 2
Titular: "Así empezaba"
Texto: Situación inicial detallada. El "antes" con sus fricciones y problemas reales.

SLIDE 3
Titular: "El punto de quiebre"
Texto: El momento en que algo cambió. La decisión o el evento que inició la transformación.

SLIDE 4
Titular: "El proceso"
Texto: Cómo se trabajó. Qué hizo {marca} para lograr el cambio.
{bens_str}

SLIDE 5
Titular: "El resultado"
Texto: El "después" con números, fotos o testimonios concretos. La transformación visible.

SLIDE 6 — CTA
Titular: "Tu transformación empieza acá"
Texto: "Escribinos y arrancamos."

CAPTION: "Antes vs. después. No hay filtro — esto es lo que pasa cuando alguien decide trabajar con {marca}. Pasá los slides y mirá la diferencia."

DISEÑO: Slides impares (1,3,5) en tonos del "antes". Slides pares (2,4,6) en tonos del "después". Contraste visual claro.""",
    }

    briefs_reel = {
        "Mismo tema, distinto gancho": f"""BRIEF — REEL · Ángulo: Mismo tema, distinto gancho
Marca: {marca} | Duración: 20-25 seg

HOOK (0-3 seg) ← LO MÁS IMPORTANTE
Texto en pantalla: "Esto sobre {tema[:40]} nadie te lo dice"
En cámara: [Persona mirando a cámara, pausa dramática de 1 seg antes de hablar]
Voz: "Hay algo sobre {tema[:50]} que la mayoría no sabe..."

DESARROLLO (3-18 seg)
Seg 3-8:   Presentar el dato, perspectiva o ángulo nuevo. Voz + texto en pantalla.
Seg 8-14:  Desarrollar por qué importa. Corte a imagen del producto/proceso.
Seg 14-18: Conectar con {marca} — cómo esto se traduce en lo que hacen.

CIERRE Y CTA (18-25 seg)
Voz: "Si esto te sumó, seguinos para más."
Texto en pantalla: "{marca} · [contacto]"
Visual: logo + producto o equipo

CAPTION: "Esto sobre {tema[:50]} nos lo preguntan todo el tiempo. Acá la respuesta. ¿Te sirvió? Guardalo."

EDICIÓN: Cortes cada 2-3 seg. Subtítulos en pantalla siempre. Música suave de fondo. Formato 9:16.""",

        "Problema → solución": f"""BRIEF — REEL · Ángulo: Problema → solución
Marca: {marca} | Duración: 25-30 seg

HOOK (0-3 seg)
Texto en pantalla: "¿Te pasa esto con {tema[:40]}?"
Voz: "Si alguna vez tuviste este problema... mirá esto."
Visual: mostrar el problema de forma visual e inmediata

DESARROLLO — EL PROBLEMA (3-12 seg)
Seg 3-7:   Mostrar el problema en acción. Concreto, reconocible, real.
Seg 7-12:  "Esto pasa porque..." — explicación rápida de la causa.

DESARROLLO — LA SOLUCIÓN (12-22 seg)
Seg 12-17: "La solución es..." — mostrar el proceso o producto de {marca}.
Seg 17-22: Resultado final visible. El contraste con el problema inicial.

CIERRE Y CTA (22-30 seg)
Voz: "En {marca} lo resolvemos. Escribinos hoy."
Texto en pantalla: "Problema resuelto · {marca} · [contacto]"

CAPTION: "¿Cansado de que {tema[:40].lower()} sea siempre un problema? Acá la solución. En {marca} lo manejamos. Escribinos."

EDICIÓN: Primera mitad tonos apagados. Segunda mitad colores de marca. Subtítulos en todo momento.""",

        "Testimonio / caso real": f"""BRIEF — REEL · Ángulo: Testimonio / caso real
Marca: {marca} | Duración: 25-30 seg

HOOK (0-3 seg)
Texto en pantalla: "[Nombre] logró [resultado] — así fue"
Voz del cliente: "Antes de {marca} yo tenía [problema]..."

DESARROLLO — LA HISTORIA (3-20 seg)
Seg 3-10:  El cliente cuenta el problema inicial en sus propias palabras. Breve, natural.
Seg 10-17: "Ahí conocí {marca} y lo que pasó fue..." — el proceso.
Seg 17-20: El resultado en números o hechos concretos.

CIERRE — VALIDACIÓN (20-28 seg)
Seg 20-24: Plano del cliente satisfecho / resultado visual.
Seg 24-28: Logo de {marca} + "¿Querés el mismo resultado? Escribinos."

CAPTION: "Historia real. [Nombre] pasó de [situación inicial] a [resultado] trabajando con {marca}. Sin filtros — tal cual. ¿Querés saber cómo? Escribinos."

EDICIÓN: Grabar al cliente en su ambiente natural. Sin producción excesiva. Autenticidad > perfección.""",

        "Datos y estadísticas": f"""BRIEF — REEL · Ángulo: Datos y estadísticas
Marca: {marca} | Duración: 20-25 seg

HOOK (0-3 seg)
Texto en pantalla gigante: "EL X% NO LO SABE"
Voz: "Este número sobre {tema[:40]} nos sorprendió a nosotros también..."

DESARROLLO (3-18 seg)
Seg 3-8:   Presentar el dato principal. Voz + texto en pantalla. Fuente si aplica.
Seg 8-13:  "Lo que esto significa es..." — implicancia práctica del dato.
Seg 13-18: Segundo dato o consecuencia. Conectar con la solución de {marca}.

CIERRE Y CTA (18-25 seg)
Voz: "En {marca} trabajamos con esto en mente. Por eso los resultados son distintos."
Texto: "{marca} · [contacto]"

CAPTION: "El dato que nadie te dice sobre {tema[:40]}. Lo compartimos porque creemos que la información cambia decisiones. ¿Vos ya lo sabías?"

EDICIÓN: Números en pantalla muy grandes. Transición entre datos. Ritmo ágil. Subtítulos siempre.""",

        "Detrás de escena": f"""BRIEF — REEL · Ángulo: Detrás de escena
Marca: {marca} | Duración: 25-30 seg

HOOK (0-3 seg)
Texto en pantalla: "Lo que pasa en {marca} cuando nadie mira"
Voz: "Te mostramos cómo trabajamos — sin editar."
Visual: toma del espacio real de trabajo, movimiento natural

DESARROLLO — EL PROCESO (3-22 seg)
Seg 3-9:   Paso 1 del proceso. Cámara en mano, natural. Voz en off explicando.
Seg 9-15:  Paso 2 — el momento clave donde se hace la diferencia.
Seg 15-22: El resultado final. La transformación del proceso en producto/servicio terminado.

CIERRE (22-30 seg)
Voz: "Así hacemos las cosas en {marca}. Siempre."
Texto: "¿Querés trabajar con nosotros? Link en bio."

CAPTION: "Sin filtros. Sin producción. Así trabajamos en {marca} todos los días. Hay cosas que solo se entienden viéndolas. ¿Te suma esto?"

EDICIÓN: Cámara en mano, estética documental. Sin música intrusiva. Sonido ambiente real si suma.""",

        "Urgencia / oferta limitada": f"""BRIEF — REEL · Ángulo: Urgencia / oferta limitada
Marca: {marca} | Duración: 20-25 seg

HOOK (0-3 seg)
Texto en pantalla: "ESTO CIERRA EL [FECHA]"
Voz: "Tenemos algo por tiempo muy limitado y no queríamos que te lo perdieras."
Visual: contador o fecha llamativa

DESARROLLO (3-17 seg)
Seg 3-9:   Qué es la oferta. Claro, directo, sin vueltas.
Seg 9-14:  Por qué es una oportunidad real. Qué incluye, qué valor tiene.
Seg 14-17: "Los cupos son [número] — ya se fueron [X]."

CIERRE URGENTE (17-25 seg)
Voz: "Si te interesa, escribinos HOY con la palabra [PROMO]."
Texto en pantalla: "[PROMO] · {marca} · [contacto]"
Visual: flecha hacia el link en bio o número de contacto

CAPTION: "Solo por [período]. Solo [X] lugares. {marca} ofrece [oferta]. Si lo pensás mucho, lo perdés. Escribinos HOY con la palabra PROMO."

EDICIÓN: Energía alta. Cortes rápidos. Colores de urgencia. CTA muy visible al final.""",

        "Educativo / tutorial": f"""BRIEF — REEL · Ángulo: Educativo / tutorial
Marca: {marca} | Duración: 25-30 seg

HOOK (0-3 seg)
Texto en pantalla: "3 cosas que tenés que saber sobre {tema[:40]}"
Voz: "Si vas a hacer algo con {tema[:40]}, necesitás saber esto primero."

DESARROLLO — LOS 3 PUNTOS (3-22 seg)
Seg 3-9:   "Primero:" — Punto 1. Concreto, accionable, sorpresivo.
Seg 9-15:  "Segundo:" — Punto 2. El insight que la mayoría ignora.
Seg 15-22: "Tercero:" — Punto 3. El diferencial que maneja {marca}.

CIERRE (22-30 seg)
Voz: "Si querés que lo hagamos por vos, en {marca} nos encargamos."
Texto: "Guardá este reel · {marca} · [contacto]"

CAPTION: "3 cosas que la mayoría no sabe sobre {tema[:40]}. Guardalo — lo vas a necesitar. Y si preferís que lo hagamos nosotros, hablemos."

EDICIÓN: Número grande en pantalla con cada punto (1, 2, 3). Corte entre cada punto. Subtítulos obligatorios.""",

        "Comparación antes/después": f"""BRIEF — REEL · Ángulo: Antes/después
Marca: {marca} | Duración: 25-30 seg

HOOK (0-3 seg)
Texto en pantalla: "ANTES vs. DESPUÉS — mirá la diferencia"
Visual: split screen o transición rápida antes/después
Voz: "Este es el resultado de trabajar con {marca}."

DESARROLLO — EL ANTES (3-12 seg)
Seg 3-8:   Mostrar la situación inicial. El problema, la incomodidad, el estado previo.
Seg 8-12:  "Así llegó [cliente/situación] a {marca}..."

DESARROLLO — EL DESPUÉS (12-22 seg)
Seg 12-17: El proceso o la intervención de {marca}. Rápido, dinámico.
Seg 17-22: El resultado final. Concreto, visual, impactante.

CIERRE (22-30 seg)
Voz: "Esto es lo que pasa cuando tomás la decisión correcta."
Texto: "{marca} · Tu transformación empieza acá · [contacto]"

CAPTION: "ANTES vs. DESPUÉS. No hace falta explicar mucho más — las imágenes lo dicen solas. ¿Querés el mismo resultado? Escribinos."

EDICIÓN: Primera parte desaturada (el antes). Segunda parte en color pleno (el después). Música que acompañe la transición.""",
    }

    # Seleccionar el brief correcto según formato y ángulo
    angulo_key = angulo.strip()
    if formato == "imagen":
        return briefs_imagen.get(angulo_key, list(briefs_imagen.values())[0])
    elif formato == "carrusel":
        return briefs_carrusel.get(angulo_key, list(briefs_carrusel.values())[0])
    else:
        return briefs_reel.get(angulo_key, list(briefs_reel.values())[0])


class CopyRequest(BaseModel):
    model_config = {"extra": "ignore"}
    angulo:         str
    formato_salida: str = "imagen"
    tema:           str = ""
    perfil_marca:   str = ""
    nombre_cuenta:  str = ""   # nombre de la cuenta seleccionada (ej: "Climaset", "WT")


@router.post("/copy")
async def generate_copy(body: CopyRequest, client: Client = Depends(get_current_client)):
    import anthropic, os
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY no configurada.")

    # Si viene nombre_cuenta lo usamos como marca (multi-cliente)
    marca = body.nombre_cuenta or client.marca_nombre or client.nombre
    tono  = client.marca_tono or "profesional y cercano"
    pub   = client.marca_publico or "público general"
    bens  = client.marca_beneficios or ""
    prop  = client.marca_propuesta_valor or ""

    formato_instrucciones = {
        "imagen": (
            "Formato: PLACA ESTÁTICA (imagen única).\n"
            "Entregá:\n"
            "1. TITULAR (máx 8 palabras, impacto inmediato, va en la imagen)\n"
            "2. SUBTÍTULO (máx 12 palabras, completa el titular, va en la imagen)\n"
            "3. CAPTION completo (3-5 párrafos con gancho, desarrollo, CTA fuerte)\n"
            "4. INSTRUCCIÓN DE DISEÑO (colores, tipografía, elementos visuales sugeridos)"
        ),
        "carrusel": (
            "Formato: CARRUSEL (secuencia de 5-7 slides).\n"
            "Entregá:\n"
            "1. SLIDE 1 — Portada: titular gancho que genere click para pasar\n"
            "2. SLIDES 2-5 — Desarrollo: un punto clave por slide (titular + texto breve)\n"
            "3. SLIDE FINAL — CTA: acción concreta con urgencia\n"
            "4. CAPTION del post (2-3 párrafos presentando el carrusel)\n"
            "5. INSTRUCCIÓN DE DISEÑO para cada slide"
        ),
        "reel": (
            "Formato: REEL / VIDEO CORTO (15-30 segundos).\n"
            "Entregá:\n"
            "1. HOOK (primeros 3 segundos): frase/acción que detiene el scroll\n"
            "2. GUIÓN completo segundo a segundo (lo que se ve + lo que se dice/escucha)\n"
            "3. CAPTION del post (2-3 párrafos, con emojis si corresponde)\n"
            "4. TEXTO EN PANTALLA sugerido (subtítulos/overlays)\n"
            "5. INSTRUCCIÓN de edición (ritmo, música, efectos sugeridos)"
        ),
    }.get(body.formato_salida, "Formato: imagen estática.")

    prompt = f"""Sos un experto en publicidad digital y copywriting para Meta Ads (Facebook/Instagram).

Tu tarea: crear un brief creativo completo y listo para ejecutar, basado en un anuncio que ya está corriendo y sus métricas reales.

━━━ CONTEXTO DEL ANUNCIO ORIGINAL ━━━
{body.tema or '(sin referencia específica)'}

━━━ MARCA Y AUDIENCIA ━━━
Marca: {marca}
Tono: {tono}
Público objetivo: {pub}
Propuesta de valor: {prop}
Beneficios clave: {bens}
{f'Perfil adicional: {body.perfil_marca}' if body.perfil_marca else ''}

━━━ ÁNGULO CREATIVO A APLICAR ━━━
{body.angulo}

━━━ LO QUE DEBÉS ENTREGAR ━━━
{formato_instrucciones}

━━━ REGLAS OBLIGATORIAS ━━━
- Usá voseo rioplatense (vos, sabés, podés, hacé, escribinos)
- El titular tiene que hablar del producto/servicio REAL de {marca}, no genérico
- El caption tiene que mencionar contexto concreto del rubro (no "esto", "el producto", "el servicio")
- Si el CPA o CTR es alto, el ángulo debe atacar esa fricción específica
- Copy listo para publicar, sin placeholders como "[completar]" o "[nombre]"
- Aplicá el ángulo "{body.angulo}" de forma clara, no solo como concepto sino en cada línea

Generá el brief completo ahora:"""

    try:
        import anthropic as _ant
        ant = _ant.Anthropic(api_key=api_key)
        msg = ant.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        contenido = msg.content[0].text
    except Exception:
        # Fallback: generación interna sin API externa
        contenido = _generar_brief_interno(
            angulo=body.angulo,
            formato=body.formato_salida,
            tema=body.tema,
            marca=marca,
            tono=tono,
            publico=pub,
            beneficios=bens,
            propuesta=prop,
        )

    return {
        "formato":   body.formato_salida,
        "angulo":    body.angulo,
        "contenido": contenido,
    }


async def _send_telegram(chat_id: str, text: str) -> bool:
    tg_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not tg_token or not chat_id:
        return False
    url = f"https://api.telegram.org/bot{tg_token}/sendMessage"
    async with httpx.AsyncClient(timeout=15) as c:
        try:
            r = await c.post(url, data={"chat_id": chat_id, "text": text, "parse_mode": "HTML"})
            if r.status_code != 200:
                await c.post(url, data={"chat_id": chat_id, "text": text})
            return True
        except Exception:
            return False


@router.post("/send-telegram")
async def send_recommendations_telegram(
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    recs = (
        db.query(Recommendation)
        .filter(Recommendation.client_id == client.id)
        .order_by(Recommendation.generado_en.desc())
        .limit(10)
        .all()
    )
    if not recs:
        raise HTTPException(status_code=404, detail="No hay recomendaciones generadas todavía.")

    chat_id = client.telegram_chat_id or os.getenv("TELEGRAM_CHAT_ID", "")
    if not chat_id:
        raise HTTPException(status_code=400, detail="El cliente no tiene Telegram configurado.")

    icons = {"escalar": "🚀", "pausar": "⏸", "replicar": "🔁", "joya": "💎", "fatiga": "⚠️"}
    lines = [f"<b>📊 Recomendaciones — {client.nombre}</b>\n"]
    for r in recs:
        icon = icons.get(r.tipo, "•")
        lines.append(f"{icon} <b>{r.titulo}</b>")
        lines.append(r.descripcion)
        lines.append(f"→ {r.accion}\n")

    sent = await _send_telegram(chat_id, "\n".join(lines))
    if not sent:
        raise HTTPException(status_code=500, detail="Error al enviar por Telegram.")
    return {"ok": True, "mensaje": "Recomendaciones enviadas por Telegram."}
