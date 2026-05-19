"""
Datos orgánicos ficticios para modo demo.
Cada cuenta tiene su set de posts con métricas realistas.
"""
from datetime import datetime, timedelta
import random, math

def _make_posts(marca: str, seed: int, n: int = 24, page_name: str = "") -> list:
    rng = random.Random(seed)
    formatos = ["reel", "imagen", "carrusel", "reel", "imagen", "carrusel", "reel", "imagen"]
    temas_map = {
        "NovaSkin": [
            "Rutina de noche con sérum vitamina C",
            "Antes y después: tratamiento hidratación profunda",
            "3 errores que cometés al limpiar tu piel",
            "Ingredientes que nunca deberían estar en tu crema",
            "Testimonio — María bajó 2 tallas de piel grasa",
            "Pack hidratación: qué incluye y cómo usarlo",
            "¿Por qué tu piel se pone peor en invierno?",
            "Detrás de escena: así formulamos el sérum",
            "El ritual de 5 minutos que transforma tu piel",
            "Comparativa: NovaSkin vs cremas de farmacia",
            "Mitos y verdades sobre el retinol",
            "Cómo leer los ingredientes de un cosmético",
        ],
        "EstudiAr": [
            "Egresada Florencia — de bancaria a instructora de vuelo",
            "¿Qué carreras ofrecemos y cuánto duran?",
            "Beca del 50%: cómo aplicar antes de que cierren",
            "Un día en la vida de un estudiante de aeronavegación",
            "Por qué elegir EstudiAr sobre otras instituciones",
            "Cuotas fijas: pagás lo mismo todo el año",
            "Nuestras instalaciones y simuladores de vuelo",
            "Requisitos para inscribirse — más fácil de lo que pensás",
            "Historia de éxito: Lucas trabaja en Aerolíneas",
            "Preguntas frecuentes — respondemos las 10 más comunes",
            "Jornada de puertas abiertas — agendá tu visita",
            "El mercado laboral aeronáutico en Argentina 2026",
        ],
        "FitZone": [
            "Transformación 30 días — cliente Carlos antes/después",
            "Clase de spinning a full — así somos los martes",
            "¿Por qué el gym no es suficiente sin nutrición?",
            "Nueva sala de pesas — equipo importado",
            "Turno de madrugada: ¿para quién es?",
            "Instructora Sofía explica la técnica del peso muerto",
            "5 mitos del fitness que te frenan",
            "Primera semana gratis: cómo funciona",
            "Rutina de 20 minutos para hacer en casa",
            "Nuestras clases grupales — calendio de la semana",
            "Nutrición pre-entrenamiento: qué comer y cuándo",
            "Torneo interno de verano — inscripciones abiertas",
        ],
        "LegalTech": [
            "Caso real: cobramos $4.2M por accidente laboral",
            "¿Cuánto vale tu caso? Calculadora gratuita",
            "Sin cobro adelantado: ¿cómo funciona?",
            "Derechos del trabajador que muy pocos conocen",
            "Tiempo límite para reclamar — no lo dejes pasar",
            "Testimonio — Guillermo ganó su caso en 8 meses",
            "Áreas en las que trabajamos: accidentes, herencias, divorcios",
            "¿Qué hace un abogado laboral en el primer día?",
            "Consulta por WhatsApp — te respondemos en 24hs",
            "Los 5 errores que cometen los trabajadores despedidos",
            "Herencias: qué pasa cuando no hay testamento",
            "Divorcio express: tiempos y costos reales",
        ],
    }
    temas = temas_map.get(marca, [f"Post {i}" for i in range(12)])

    base_date = datetime(2026, 5, 12)
    posts = []
    for i in range(n):
        fmt = formatos[i % len(formatos)]
        tema = temas[i % len(temas)]
        dias_atras = i * 3 + rng.randint(0, 2)
        fecha = base_date - timedelta(days=dias_atras)
        # Reels y stories → Instagram. Imágenes/carruseles → 60% IG, 40% FB
        if fmt == "reel":
            plataforma = "instagram"
        elif fmt == "stories":
            plataforma = "instagram"
        else:
            plataforma = "instagram" if rng.random() < 0.6 else "facebook"

        # Métricas con distribución realista (power law — algunos ganadores)
        is_winner = rng.random() < 0.15
        base_reach = rng.randint(8000, 18000) if is_winner else rng.randint(800, 6000)
        if fmt == "reel":
            base_reach = int(base_reach * rng.uniform(1.8, 3.2))

        reach = base_reach
        impressions = int(reach * rng.uniform(1.1, 1.8))
        likes = int(reach * rng.uniform(0.03, 0.12))
        comments = int(likes * rng.uniform(0.05, 0.25))
        shares = int(likes * rng.uniform(0.02, 0.15))
        saves = int(likes * rng.uniform(0.08, 0.35))
        plays = int(reach * rng.uniform(1.2, 3.5)) if fmt == "reel" else None
        engagement_rate = round((likes + comments + shares + saves) / max(reach, 1) * 100, 2)

        # Clasificación
        if is_winner or engagement_rate > 8:
            badge = "ganador"
        elif engagement_rate > 4:
            badge = "bueno"
        elif engagement_rate > 2:
            badge = "normal"
        else:
            badge = "bajo"

        posts.append({
            "id": f"demo_post_{marca.lower()}_{i}",
            "marca": marca,
            "page_name": page_name or marca,
            "plataforma": plataforma,
            "formato": fmt,
            "tema": tema,
            "caption": f"{tema} — {marca}",
            "fecha": fecha.strftime("%Y-%m-%d"),
            "hora": f"{rng.randint(8,21):02d}:{rng.choice(['00','15','30','45'])}",
            "reach": reach,
            "impressions": impressions,
            "likes": likes,
            "comments": comments,
            "shares": shares,
            "saves": saves,
            "plays": plays,
            "engagement_rate": engagement_rate,
            "badge": badge,
        })

    # Ordenar por fecha desc
    posts.sort(key=lambda p: p["fecha"], reverse=True)
    return posts


DEMO_ORGANIC = {
    "act_demo_novaskin":  _make_posts("NovaSkin",  42, 24, "NovaSkin Argentina"),
    "act_demo_estudiar":  _make_posts("EstudiAr",   7, 24, "EstudiAr — Instituto"),
    "act_demo_fitzone":   _make_posts("FitZone",   13, 24, "FitZone Gym"),
    "act_demo_legaltech": _make_posts("LegalTech", 99, 24, "LegalTech Estudio Jurídico"),
}


def demo_organic(account_id: str, days: int = 30, since: str = None, until: str = None, formato: str = None) -> list:
    posts = DEMO_ORGANIC.get(account_id) or DEMO_ORGANIC["act_demo_novaskin"]

    # Filtrar por rango
    if since and until:
        posts = [p for p in posts if since <= p["fecha"] <= until]
    else:
        cutoff = (datetime(2026, 5, 11) - timedelta(days=days)).strftime("%Y-%m-%d")
        posts = [p for p in posts if p["fecha"] >= cutoff]

    if formato and formato != "todos":
        posts = [p for p in posts if p["formato"] == formato]

    return posts
