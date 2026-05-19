# Mapeo exacto de códigos de objetivo de Meta → nombre en español
# Fuente: Meta Ads Manager (interfaz en español, región Argentina)

OBJECTIVE_LABELS = {
    # Objetivos nuevos (Advantage+ / OUTCOME_*)
    "OUTCOME_AWARENESS":       "Reconocimiento",
    "OUTCOME_TRAFFIC":         "Tráfico",
    "OUTCOME_ENGAGEMENT":      "Interacción",
    "OUTCOME_LEADS":           "Clientes potenciales",
    "OUTCOME_APP_PROMOTION":   "Promoción de la app",
    "OUTCOME_SALES":           "Ventas",

    # Objetivos legacy (campañas más antiguas)
    "BRAND_AWARENESS":         "Reconocimiento de marca",
    "REACH":                   "Alcance",
    "LINK_CLICKS":             "Tráfico",
    "VIDEO_VIEWS":             "Reproducciones de video",
    "POST_ENGAGEMENT":         "Interacción con publicación",
    "PAGE_LIKES":              "Me gusta de la página",
    "EVENT_RESPONSES":         "Respuestas a eventos",
    "MESSAGES":                "Mensajes (legacy)",
    "LEAD_GENERATION":         "Generación de clientes potenciales",
    "CONVERSIONS":             "Conversiones",
    "PRODUCT_CATALOG_SALES":   "Ventas del catálogo",
    "APP_INSTALLS":            "Instalaciones de la app",
    "STORE_VISITS":            "Visitas en el negocio",
    "LOCAL_AWARENESS":         "Reconocimiento local",
}


def label_objetivo(code: str) -> str:
    """Devuelve el nombre en español del objetivo. Si no existe, devuelve el código original."""
    return OBJECTIVE_LABELS.get(code, code)
