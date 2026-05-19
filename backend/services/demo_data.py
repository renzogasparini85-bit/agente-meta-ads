"""
Datos ficticios para modo demo.
Se activan cuando el cliente tiene meta_access_token == "DEMO".
Cada cuenta ficticia (act_demo_*) devuelve datos de una empresa distinta.
"""

# ─── NovaSkin — Skincare DTC ─────────────────────────────────────────────────
DEMO_CAMPAIGNS_NOVASKIN = [
    {
        "campaign_id": "ns_c1",
        "campaign_name": "NovaSkin | PROS | WA | CABA",
        "objective": "MESSAGES",
        "spend": "185400.00", "impressions": "142300", "reach": "98500",
        "clicks": "4820", "ctr": "3.39", "cpc": "38.46", "frequency": "1.44",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "312"}],
    },
    {
        "campaign_id": "ns_c2",
        "campaign_name": "NovaSkin | PROS | WA | GBA",
        "objective": "MESSAGES",
        "spend": "97200.00", "impressions": "88100", "reach": "61400",
        "clicks": "2940", "ctr": "3.34", "cpc": "33.06", "frequency": "1.43",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "198"}],
    },
    {
        "campaign_id": "ns_c3",
        "campaign_name": "NovaSkin | PROS | WA | CÓRDOBA",
        "objective": "MESSAGES",
        "spend": "63800.00", "impressions": "51200", "reach": "22100",
        "clicks": "1240", "ctr": "2.42", "cpc": "51.45", "frequency": "2.32",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "87"}],
    },
    {
        "campaign_id": "ns_c4",
        "campaign_name": "NovaSkin | RETARGETING | WA | NACIONAL",
        "objective": "MESSAGES",
        "spend": "41500.00", "impressions": "29800", "reach": "8200",
        "clicks": "980", "ctr": "3.29", "cpc": "42.35", "frequency": "3.63",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "74"}],
    },
    {
        "campaign_id": "ns_c5",
        "campaign_name": "NovaSkin | PROS | LANDING | PACK-INICIAL",
        "objective": "LEAD_GENERATION",
        "spend": "28900.00", "impressions": "32400", "reach": "26800",
        "clicks": "860", "ctr": "2.65", "cpc": "33.60", "frequency": "1.21",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "43"}],
    },
    {
        "campaign_id": "ns_c6",
        "campaign_name": "NovaSkin | PROS | WA | ROSARIO",
        "objective": "MESSAGES",
        "spend": "19200.00", "impressions": "18900", "reach": "15300",
        "clicks": "520", "ctr": "2.75", "cpc": "36.92", "frequency": "1.24",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "51"}],
    },
]

DEMO_ADS_NOVASKIN = [
    {
        "ad_id": "ns_a1", "ad_name": "NovaSkin | REEL | Testimonio-María | ALE",
        "adset_id": "ns_as1", "campaign_id": "ns_c1",
        "spend": "72400.00", "impressions": "58200", "reach": "42100",
        "clicks": "2140", "ctr": "3.68", "cpc": "33.83", "frequency": "1.38",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "134"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "ns_a2", "ad_name": "NovaSkin | CARRUSEL | Beneficios-Pack | LUC",
        "adset_id": "ns_as1", "campaign_id": "ns_c1",
        "spend": "61800.00", "impressions": "49300", "reach": "35600",
        "clicks": "1680", "ctr": "3.41", "cpc": "36.79", "frequency": "1.38",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "108"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "ns_a3", "ad_name": "NovaSkin | IMAGEN | Antes-Después | ALE",
        "adset_id": "ns_as1", "campaign_id": "ns_c1",
        "spend": "51200.00", "impressions": "34800", "reach": "20800",
        "clicks": "1000", "ctr": "2.87", "cpc": "51.20", "frequency": "1.67",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "70"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "ns_a4", "ad_name": "NovaSkin | REEL | Rutina-Noche | LUC",
        "adset_id": "ns_as2", "campaign_id": "ns_c2",
        "spend": "54100.00", "impressions": "47200", "reach": "34100",
        "clicks": "1720", "ctr": "3.64", "cpc": "31.45", "frequency": "1.38",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "118"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "ns_a5", "ad_name": "NovaSkin | CARRUSEL | Ingredientes | ALE",
        "adset_id": "ns_as2", "campaign_id": "ns_c2",
        "spend": "43100.00", "impressions": "40900", "reach": "27300",
        "clicks": "1220", "ctr": "2.98", "cpc": "35.33", "frequency": "1.50",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "80"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "ns_a6", "ad_name": "NovaSkin | IMAGEN | Pack-Hidratación | ALE",
        "adset_id": "ns_as3", "campaign_id": "ns_c3",
        "spend": "63800.00", "impressions": "51200", "reach": "22100",
        "clicks": "1240", "ctr": "2.42", "cpc": "51.45", "frequency": "2.32",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "87"}],
        "date_start": "2026-03-15", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "ns_a7", "ad_name": "NovaSkin | REEL | Urgencia-Stock | LUC",
        "adset_id": "ns_as4", "campaign_id": "ns_c4",
        "spend": "41500.00", "impressions": "29800", "reach": "8200",
        "clicks": "980", "ctr": "3.29", "cpc": "42.35", "frequency": "3.63",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "74"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "ns_a8", "ad_name": "NovaSkin | REEL | Problema-Piel | ALE",
        "adset_id": "ns_as5", "campaign_id": "ns_c5",
        "spend": "28900.00", "impressions": "32400", "reach": "26800",
        "clicks": "860", "ctr": "2.65", "cpc": "33.60", "frequency": "1.21",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "12"}],
        "date_start": "2026-04-20", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "ns_a9", "ad_name": "NovaSkin | CARRUSEL | Pack-Rosario | LUC",
        "adset_id": "ns_as6", "campaign_id": "ns_c6",
        "spend": "19200.00", "impressions": "18900", "reach": "15300",
        "clicks": "520", "ctr": "2.75", "cpc": "36.92", "frequency": "1.24",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "51"}],
        "date_start": "2026-05-05", "date_stop": "2026-05-11",
    },
]

DEMO_CREATED_DATES_NOVASKIN = {
    "ns_a1": "2026-04-01T00:00:00+0000",
    "ns_a2": "2026-04-01T00:00:00+0000",
    "ns_a3": "2026-04-01T00:00:00+0000",
    "ns_a4": "2026-04-01T00:00:00+0000",
    "ns_a5": "2026-04-01T00:00:00+0000",
    "ns_a6": "2026-03-15T00:00:00+0000",
    "ns_a7": "2026-04-01T00:00:00+0000",
    "ns_a8": "2026-04-20T00:00:00+0000",
    "ns_a9": "2026-05-05T00:00:00+0000",
}

DEMO_ACCOUNT_INSIGHTS_NOVASKIN = {
    "spend": "436000.00", "impressions": "363700", "reach": "232400",
    "clicks": "11360", "ctr": "3.12", "cpc": "38.38", "frequency": "1.56",
    "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "765"}],
}


# ─── EstudiAr — Instituto educativo (leads) ──────────────────────────────────
DEMO_CAMPAIGNS_ESTUDIAR = [
    {
        "campaign_id": "ea_c1",
        "campaign_name": "EstudiAr | PROS | LEADS | CABA",
        "objective": "LEAD_GENERATION",
        "spend": "142000.00", "impressions": "198400", "reach": "154200",
        "clicks": "6320", "ctr": "3.18", "cpc": "22.47", "frequency": "1.29",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "284"}],
    },
    {
        "campaign_id": "ea_c2",
        "campaign_name": "EstudiAr | PROS | LEADS | GBA",
        "objective": "LEAD_GENERATION",
        "spend": "88500.00", "impressions": "124600", "reach": "97800",
        "clicks": "4180", "ctr": "3.35", "cpc": "21.17", "frequency": "1.27",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "196"}],
    },
    {
        "campaign_id": "ea_c3",
        "campaign_name": "EstudiAr | RETARGETING | LEADS | NACIONAL",
        "objective": "LEAD_GENERATION",
        "spend": "34200.00", "impressions": "28900", "reach": "7400",
        "clicks": "980", "ctr": "3.39", "cpc": "34.90", "frequency": "3.91",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "62"}],
    },
    {
        "campaign_id": "ea_c4",
        "campaign_name": "EstudiAr | PROS | WA | INTERIOR",
        "objective": "MESSAGES",
        "spend": "21600.00", "impressions": "24100", "reach": "19800",
        "clicks": "620", "ctr": "2.57", "cpc": "34.84", "frequency": "1.22",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "38"}],
    },
    {
        "campaign_id": "ea_c5",
        "campaign_name": "EstudiAr | PROS | LEADS | CÓRDOBA",
        "objective": "LEAD_GENERATION",
        "spend": "16800.00", "impressions": "20400", "reach": "17200",
        "clicks": "480", "ctr": "2.35", "cpc": "35.00", "frequency": "1.19",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "28"}],
    },
]

DEMO_ADS_ESTUDIAR = [
    {
        "ad_id": "ea_a1", "ad_name": "EstudiAr | REEL | Egresada-Florencia | MAR",
        "adset_id": "ea_as1", "campaign_id": "ea_c1",
        "spend": "68000.00", "impressions": "94200", "reach": "74100",
        "clicks": "3180", "ctr": "3.38", "cpc": "21.38", "frequency": "1.27",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "148"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "ea_a2", "ad_name": "EstudiAr | IMAGEN | Título-en-18-meses | MAR",
        "adset_id": "ea_as1", "campaign_id": "ea_c1",
        "spend": "74000.00", "impressions": "104200", "reach": "80100",
        "clicks": "3140", "ctr": "3.01", "cpc": "23.57", "frequency": "1.30",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "136"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "ea_a3", "ad_name": "EstudiAr | REEL | Beca-50pct | MAR",
        "adset_id": "ea_as2", "campaign_id": "ea_c2",
        "spend": "88500.00", "impressions": "124600", "reach": "97800",
        "clicks": "4180", "ctr": "3.35", "cpc": "21.17", "frequency": "1.27",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "196"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "ea_a4", "ad_name": "EstudiAr | CARRUSEL | Carreras-Disponibles | JUA",
        "adset_id": "ea_as3", "campaign_id": "ea_c3",
        "spend": "34200.00", "impressions": "28900", "reach": "7400",
        "clicks": "980", "ctr": "3.39", "cpc": "34.90", "frequency": "3.91",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "62"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "ea_a5", "ad_name": "EstudiAr | REEL | Proceso-Inscripción | JUA",
        "adset_id": "ea_as4", "campaign_id": "ea_c4",
        "spend": "21600.00", "impressions": "24100", "reach": "19800",
        "clicks": "620", "ctr": "2.57", "cpc": "34.84", "frequency": "1.22",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "38"}],
        "date_start": "2026-05-01", "date_stop": "2026-05-11",
    },
    {
        "ad_id": "ea_a6", "ad_name": "EstudiAr | IMAGEN | Cuotas-Fijas | MAR",
        "adset_id": "ea_as5", "campaign_id": "ea_c5",
        "spend": "16800.00", "impressions": "20400", "reach": "17200",
        "clicks": "480", "ctr": "2.35", "cpc": "35.00", "frequency": "1.19",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "28"}],
        "date_start": "2026-05-04", "date_stop": "2026-05-11",
    },
]

DEMO_CREATED_DATES_ESTUDIAR = {
    "ea_a1": "2026-04-01T00:00:00+0000",
    "ea_a2": "2026-04-01T00:00:00+0000",
    "ea_a3": "2026-04-01T00:00:00+0000",
    "ea_a4": "2026-04-01T00:00:00+0000",
    "ea_a5": "2026-05-01T00:00:00+0000",
    "ea_a6": "2026-05-04T00:00:00+0000",
}

DEMO_ACCOUNT_INSIGHTS_ESTUDIAR = {
    "spend": "303100.00", "impressions": "396400", "reach": "296400",
    "clicks": "12580", "ctr": "3.17", "cpc": "24.09", "frequency": "1.34",
    "actions": [{"action_type": "lead", "value": "608"}],
}


# ─── FitZone — Gym / fitness (WhatsApp) ──────────────────────────────────────
DEMO_CAMPAIGNS_FITZONE = [
    {
        "campaign_id": "fz_c1",
        "campaign_name": "FitZone | PROS | WA | PALERMO",
        "objective": "MESSAGES",
        "spend": "78300.00", "impressions": "96800", "reach": "72400",
        "clicks": "3620", "ctr": "3.74", "cpc": "21.63", "frequency": "1.34",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "241"}],
    },
    {
        "campaign_id": "fz_c2",
        "campaign_name": "FitZone | PROS | WA | BELGRANO",
        "objective": "MESSAGES",
        "spend": "54100.00", "impressions": "67200", "reach": "51800",
        "clicks": "2480", "ctr": "3.69", "cpc": "21.81", "frequency": "1.30",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "174"}],
    },
    {
        "campaign_id": "fz_c3",
        "campaign_name": "FitZone | RETARGETING | WA | CABA",
        "objective": "MESSAGES",
        "spend": "32800.00", "impressions": "24600", "reach": "6800",
        "clicks": "890", "ctr": "3.62", "cpc": "36.85", "frequency": "3.62",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "86"}],
    },
    {
        "campaign_id": "fz_c4",
        "campaign_name": "FitZone | PROS | WA | VILLA-CRESPO",
        "objective": "MESSAGES",
        "spend": "24600.00", "impressions": "29400", "reach": "23800",
        "clicks": "1020", "ctr": "3.47", "cpc": "24.12", "frequency": "1.24",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "79"}],
    },
    {
        "campaign_id": "fz_c5",
        "campaign_name": "FitZone | PROS | WA | CABALLITO",
        "objective": "MESSAGES",
        "spend": "11200.00", "impressions": "14800", "reach": "12600",
        "clicks": "440", "ctr": "2.97", "cpc": "25.45", "frequency": "1.17",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "31"}],
    },
]

DEMO_ADS_FITZONE = [
    {
        "ad_id": "fz_a1", "ad_name": "FitZone | REEL | Transformación-30días | CAR",
        "adset_id": "fz_as1", "campaign_id": "fz_c1",
        "spend": "42800.00", "impressions": "53200", "reach": "40100",
        "clicks": "2100", "ctr": "3.95", "cpc": "20.38", "frequency": "1.33",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "148"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "fz_a2", "ad_name": "FitZone | IMAGEN | Primera-Semana-Gratis | CAR",
        "adset_id": "fz_as1", "campaign_id": "fz_c1",
        "spend": "35500.00", "impressions": "43600", "reach": "32300",
        "clicks": "1520", "ctr": "3.49", "cpc": "23.36", "frequency": "1.35",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "93"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "fz_a3", "ad_name": "FitZone | REEL | Clases-Grupales | CAR",
        "adset_id": "fz_as2", "campaign_id": "fz_c2",
        "spend": "54100.00", "impressions": "67200", "reach": "51800",
        "clicks": "2480", "ctr": "3.69", "cpc": "21.81", "frequency": "1.30",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "174"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "fz_a4", "ad_name": "FitZone | CARRUSEL | Máquinas-Nuevas | SOF",
        "adset_id": "fz_as3", "campaign_id": "fz_c3",
        "spend": "32800.00", "impressions": "24600", "reach": "6800",
        "clicks": "890", "ctr": "3.62", "cpc": "36.85", "frequency": "3.62",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "86"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "fz_a5", "ad_name": "FitZone | REEL | Precio-Por-Día | SOF",
        "adset_id": "fz_as4", "campaign_id": "fz_c4",
        "spend": "24600.00", "impressions": "29400", "reach": "23800",
        "clicks": "1020", "ctr": "3.47", "cpc": "24.12", "frequency": "1.24",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "79"}],
        "date_start": "2026-04-15", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "fz_a6", "ad_name": "FitZone | IMAGEN | Nuevo-Turno-Noche | CAR",
        "adset_id": "fz_as5", "campaign_id": "fz_c5",
        "spend": "11200.00", "impressions": "14800", "reach": "12600",
        "clicks": "440", "ctr": "2.97", "cpc": "25.45", "frequency": "1.17",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "31"}],
        "date_start": "2026-05-05", "date_stop": "2026-05-11",
    },
]

DEMO_CREATED_DATES_FITZONE = {
    "fz_a1": "2026-04-01T00:00:00+0000",
    "fz_a2": "2026-04-01T00:00:00+0000",
    "fz_a3": "2026-04-01T00:00:00+0000",
    "fz_a4": "2026-04-01T00:00:00+0000",
    "fz_a5": "2026-04-15T00:00:00+0000",
    "fz_a6": "2026-05-05T00:00:00+0000",
}

DEMO_ACCOUNT_INSIGHTS_FITZONE = {
    "spend": "201000.00", "impressions": "232800", "reach": "167400",
    "clicks": "8450", "ctr": "3.63", "cpc": "23.79", "frequency": "1.39",
    "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "611"}],
}


# ─── LegalTech — Estudio jurídico (leads) ────────────────────────────────────
DEMO_CAMPAIGNS_LEGALTECH = [
    {
        "campaign_id": "lt_c1",
        "campaign_name": "LegalTech | PROS | LEADS | CABA",
        "objective": "LEAD_GENERATION",
        "spend": "112400.00", "impressions": "87600", "reach": "68200",
        "clicks": "2840", "ctr": "3.24", "cpc": "39.58", "frequency": "1.28",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "156"}],
    },
    {
        "campaign_id": "lt_c2",
        "campaign_name": "LegalTech | PROS | LEADS | GBA",
        "objective": "LEAD_GENERATION",
        "spend": "68900.00", "impressions": "54800", "reach": "43100",
        "clicks": "1920", "ctr": "3.50", "cpc": "35.89", "frequency": "1.27",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "98"}],
    },
    {
        "campaign_id": "lt_c3",
        "campaign_name": "LegalTech | RETARGETING | WA | CABA",
        "objective": "MESSAGES",
        "spend": "39800.00", "impressions": "28200", "reach": "7100",
        "clicks": "880", "ctr": "3.12", "cpc": "45.23", "frequency": "3.97",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "67"}],
    },
    {
        "campaign_id": "lt_c4",
        "campaign_name": "LegalTech | PROS | LEADS | ROSARIO",
        "objective": "LEAD_GENERATION",
        "spend": "28100.00", "impressions": "32600", "reach": "27400",
        "clicks": "880", "ctr": "2.70", "cpc": "31.93", "frequency": "1.19",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "44"}],
    },
    {
        "campaign_id": "lt_c5",
        "campaign_name": "LegalTech | PROS | WA | INTERIOR",
        "objective": "MESSAGES",
        "spend": "14600.00", "impressions": "17200", "reach": "14800",
        "clicks": "420", "ctr": "2.44", "cpc": "34.76", "frequency": "1.16",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "22"}],
    },
]

DEMO_ADS_LEGALTECH = [
    {
        "ad_id": "lt_a1", "ad_name": "LegalTech | REEL | Accidente-Laboral-Caso | FER",
        "adset_id": "lt_as1", "campaign_id": "lt_c1",
        "spend": "58200.00", "impressions": "46400", "reach": "36800",
        "clicks": "1540", "ctr": "3.32", "cpc": "37.79", "frequency": "1.26",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "87"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "lt_a2", "ad_name": "LegalTech | IMAGEN | Sin-Cobro-Adelantado | FER",
        "adset_id": "lt_as1", "campaign_id": "lt_c1",
        "spend": "54200.00", "impressions": "41200", "reach": "31400",
        "clicks": "1300", "ctr": "3.16", "cpc": "41.69", "frequency": "1.31",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "69"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "lt_a3", "ad_name": "LegalTech | CARRUSEL | Áreas-Práctica | AND",
        "adset_id": "lt_as2", "campaign_id": "lt_c2",
        "spend": "68900.00", "impressions": "54800", "reach": "43100",
        "clicks": "1920", "ctr": "3.50", "cpc": "35.89", "frequency": "1.27",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "98"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "lt_a4", "ad_name": "LegalTech | REEL | Testimonio-Cliente | AND",
        "adset_id": "lt_as3", "campaign_id": "lt_c3",
        "spend": "39800.00", "impressions": "28200", "reach": "7100",
        "clicks": "880", "ctr": "3.12", "cpc": "45.23", "frequency": "3.97",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "67"}],
        "date_start": "2026-04-01", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "lt_a5", "ad_name": "LegalTech | IMAGEN | Consulta-Gratis-24hs | FER",
        "adset_id": "lt_as4", "campaign_id": "lt_c4",
        "spend": "28100.00", "impressions": "32600", "reach": "27400",
        "clicks": "880", "ctr": "2.70", "cpc": "31.93", "frequency": "1.19",
        "purchase_roas": None,
        "actions": [{"action_type": "lead", "value": "44"}],
        "date_start": "2026-04-22", "date_stop": "2026-04-30",
    },
    {
        "ad_id": "lt_a6", "ad_name": "LegalTech | REEL | Herencias-Rápido | AND",
        "adset_id": "lt_as5", "campaign_id": "lt_c5",
        "spend": "14600.00", "impressions": "17200", "reach": "14800",
        "clicks": "420", "ctr": "2.44", "cpc": "34.76", "frequency": "1.16",
        "purchase_roas": None,
        "actions": [{"action_type": "onsite_conversion.messaging_conversation_started_7d", "value": "22"}],
        "date_start": "2026-05-03", "date_stop": "2026-05-11",
    },
]

DEMO_CREATED_DATES_LEGALTECH = {
    "lt_a1": "2026-04-01T00:00:00+0000",
    "lt_a2": "2026-04-01T00:00:00+0000",
    "lt_a3": "2026-04-01T00:00:00+0000",
    "lt_a4": "2026-04-01T00:00:00+0000",
    "lt_a5": "2026-04-22T00:00:00+0000",
    "lt_a6": "2026-05-03T00:00:00+0000",
}

DEMO_ACCOUNT_INSIGHTS_LEGALTECH = {
    "spend": "263800.00", "impressions": "220400", "reach": "161600",
    "clicks": "6940", "ctr": "3.15", "cpc": "38.01", "frequency": "1.36",
    "actions": [{"action_type": "lead", "value": "387"}],
}


# ─── Dispatch por account_id ─────────────────────────────────────────────────
DEMO_REGISTRY = {
    "act_demo_novaskin":  {
        "campaigns": DEMO_CAMPAIGNS_NOVASKIN,
        "ads":       DEMO_ADS_NOVASKIN,
        "created":   DEMO_CREATED_DATES_NOVASKIN,
        "insights":  DEMO_ACCOUNT_INSIGHTS_NOVASKIN,
    },
    "act_demo_estudiar": {
        "campaigns": DEMO_CAMPAIGNS_ESTUDIAR,
        "ads":       DEMO_ADS_ESTUDIAR,
        "created":   DEMO_CREATED_DATES_ESTUDIAR,
        "insights":  DEMO_ACCOUNT_INSIGHTS_ESTUDIAR,
    },
    "act_demo_fitzone": {
        "campaigns": DEMO_CAMPAIGNS_FITZONE,
        "ads":       DEMO_ADS_FITZONE,
        "created":   DEMO_CREATED_DATES_FITZONE,
        "insights":  DEMO_ACCOUNT_INSIGHTS_FITZONE,
    },
    "act_demo_legaltech": {
        "campaigns": DEMO_CAMPAIGNS_LEGALTECH,
        "ads":       DEMO_ADS_LEGALTECH,
        "created":   DEMO_CREATED_DATES_LEGALTECH,
        "insights":  DEMO_ACCOUNT_INSIGHTS_LEGALTECH,
    },
}

def demo_get(key: str, account_id: str):
    bucket = DEMO_REGISTRY.get(account_id) or DEMO_REGISTRY["act_demo_novaskin"]
    return bucket[key]


def demo_history(account_id: str, days: int = 30, since: str = None, until: str = None) -> list:
    """Genera filas diarias ficticias para el historial."""
    from datetime import datetime, timedelta
    import random, math

    bucket = DEMO_REGISTRY.get(account_id) or DEMO_REGISTRY["act_demo_novaskin"]
    insights = bucket["insights"]
    total_spend = float(insights["spend"])
    total_conv  = int(float(insights["actions"][0]["value"]))

    # Determinar rango
    if since and until:
        start = datetime.strptime(since, "%Y-%m-%d")
        end   = datetime.strptime(until, "%Y-%m-%d")
        num_days = (end - start).days + 1
    else:
        end = datetime(2026, 5, 11)
        start = end - timedelta(days=(days or 30) - 1)
        num_days = days or 30

    avg_spend = total_spend / max(num_days, 1)
    avg_conv  = total_conv  / max(num_days, 1)

    # Semilla por cuenta para que los números sean consistentes
    seeds = {"act_demo_novaskin": 42, "act_demo_estudiar": 7, "act_demo_fitzone": 13, "act_demo_legaltech": 99}
    rng = random.Random(seeds.get(account_id, 42))

    rows = []
    for i in range(num_days):
        day = start + timedelta(days=i)
        # Tendencia suave con ruido
        trend = 1 + 0.3 * math.sin(i / (num_days / (2 * math.pi)))
        noise = rng.uniform(0.7, 1.3)
        spend = round(avg_spend * trend * noise, 2)
        conv  = max(0, round(avg_conv * trend * rng.uniform(0.6, 1.4)))
        cpa   = round(spend / conv, 2) if conv > 0 else None
        ctr   = round(rng.uniform(2.4, 4.2), 2)
        freq  = round(rng.uniform(1.1, 2.4), 2)
        rows.append({
            "fecha":          day.strftime("%Y-%m-%d"),
            "gasto":          spend,
            "conversaciones": conv,
            "cpa":            cpa,
            "ctr":            ctr,
            "frecuencia":     freq,
        })
    return rows


# Backwards-compat aliases (para código que todavía las importe directamente)
DEMO_CAMPAIGNS    = DEMO_CAMPAIGNS_NOVASKIN
DEMO_ADS          = DEMO_ADS_NOVASKIN
DEMO_CREATED_DATES = DEMO_CREATED_DATES_NOVASKIN
DEMO_ACCOUNT_INSIGHTS = DEMO_ACCOUNT_INSIGHTS_NOVASKIN
