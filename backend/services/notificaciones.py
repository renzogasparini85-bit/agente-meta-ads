"""
Servicio de notificaciones externas — WhatsApp vía Twilio.
Usado por el scheduler diario y por el endpoint manual /alerts/notify-now.
"""
import os
import logging
from twilio.rest import Client as TwilioClient
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger(__name__)

TWILIO_SID   = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM  = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")


def _twilio_ok() -> bool:
    return bool(TWILIO_SID and TWILIO_TOKEN)


def enviar_whatsapp(to_number: str, mensaje: str) -> dict:
    """
    Envía un mensaje de WhatsApp al número indicado.
    to_number debe estar en formato E.164 sin prefijo, ej: '+5491112345678'
    Devuelve {"ok": True, "sid": "..."} o {"ok": False, "error": "..."}
    """
    if not _twilio_ok():
        return {"ok": False, "error": "Twilio no configurado — falta TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN en .env"}

    # Normalizar número
    numero = to_number.strip().replace(" ", "").replace("-", "")
    if not numero.startswith("+"):
        numero = "+" + numero
    to_wa = f"whatsapp:{numero}"

    try:
        client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)
        msg = client.messages.create(
            body=mensaje,
            from_=TWILIO_FROM,
            to=to_wa,
        )
        logger.info(f"WhatsApp enviado a {to_wa} — SID: {msg.sid}")
        return {"ok": True, "sid": msg.sid}
    except TwilioRestException as e:
        logger.error(f"Twilio error a {to_wa}: {e}")
        return {"ok": False, "error": str(e)}
    except Exception as e:
        logger.error(f"Error inesperado enviando WhatsApp: {e}")
        return {"ok": False, "error": str(e)}


def formatear_alerta_whatsapp(cliente_nombre: str, alertas: list[dict], moneda: str = "ARS") -> str:
    """
    Genera el texto del mensaje de WhatsApp con las alertas del día.
    alertas: lista de dicts con keys: tipo, mensaje, severidad
    """
    altas   = [a for a in alertas if a.get("severidad") == "alta"]
    medias  = [a for a in alertas if a.get("severidad") == "media"]

    lineas = [
        f"🔔 *Resumen diario — {cliente_nombre}*",
        "",
    ]

    if altas:
        lineas.append(f"🔴 *{len(altas)} alerta(s) crítica(s):*")
        for a in altas[:3]:  # máximo 3 para no saturar
            lineas.append(f"• {a['mensaje']}")
        if len(altas) > 3:
            lineas.append(f"  _...y {len(altas) - 3} más_")
        lineas.append("")

    if medias:
        lineas.append(f"🟡 *{len(medias)} alerta(s) media(s):*")
        for a in medias[:2]:
            lineas.append(f"• {a['mensaje']}")
        if len(medias) > 2:
            lineas.append(f"  _...y {len(medias) - 2} más_")
        lineas.append("")

    if not altas and not medias:
        lineas.append("✅ Todo en orden hoy. Sin alertas críticas.")
    else:
        lineas.append("_Entrá al dashboard para ver el detalle y tomar acción._")

    return "\n".join(lineas)
