"""
Servicio de notificaciones externas — Telegram Bot API + Email SMTP.
"""
import os, smtplib, logging
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "") or os.getenv("SMTP_USER", "")


def _telegram_ok() -> bool:
    return bool(TELEGRAM_BOT_TOKEN)


def _email_ok() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASS)


async def enviar_telegram(chat_id: str, mensaje: str) -> dict:
    if not _telegram_ok():
        return {"ok": False, "error": "TELEGRAM_BOT_TOKEN no configurado en .env"}
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(url, json={
                "chat_id": chat_id,
                "text": mensaje,
                "parse_mode": "Markdown",
            })
            data = r.json()
            if data.get("ok"):
                return {"ok": True, "message_id": data["result"]["message_id"]}
            return {"ok": False, "error": data.get("description", "Error Telegram")}
    except Exception as e:
        logger.error(f"Telegram error a {chat_id}: {e}")
        return {"ok": False, "error": str(e)}


def enviar_email(to_email: str, subject: str, body_html: str) -> dict:
    if not _email_ok():
        return {"ok": False, "error": "SMTP no configurado en .env"}
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to_email
        msg.attach(MIMEText(body_html, "html", "utf-8"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())
        logger.info(f"Email enviado a {to_email}")
        return {"ok": True}
    except Exception as e:
        logger.error(f"Email error a {to_email}: {e}")
        return {"ok": False, "error": str(e)}


def formatear_alerta_telegram(cliente_nombre: str, alertas: list[dict], moneda: str = "ARS") -> str:
    altas  = [a for a in alertas if a.get("severidad") == "alta"]
    medias = [a for a in alertas if a.get("severidad") == "media"]

    lineas = [f"🔔 *Resumen diario — {cliente_nombre}*", ""]

    if altas:
        lineas.append(f"🔴 *{len(altas)} alerta(s) crítica(s):*")
        for a in altas[:3]:
            lineas.append(f"• {a['mensaje']}")
        if len(altas) > 3:
            lineas.append(f"  _{len(altas) - 3} más..._")
        lineas.append("")

    if medias:
        lineas.append(f"🟡 *{len(medias)} alerta(s) media(s):*")
        for a in medias[:2]:
            lineas.append(f"• {a['mensaje']}")
        if len(medias) > 2:
            lineas.append(f"  _{len(medias) - 2} más..._")
        lineas.append("")

    if not altas and not medias:
        lineas.append("✅ Todo en orden hoy. Sin alertas críticas.")
    else:
        lineas.append("_Entrá al dashboard para ver el detalle._")

    return "\n".join(lineas)


def formatear_alerta_email_html(cliente_nombre: str, alertas: list[dict]) -> tuple[str, str]:
    """Devuelve (subject, html_body)."""
    altas  = [a for a in alertas if a.get("severidad") == "alta"]
    medias = [a for a in alertas if a.get("severidad") == "media"]
    total = len(altas) + len(medias)

    subject = (
        f"[Meta Ads] {total} alertas activas — {cliente_nombre}"
        if total else
        f"[Meta Ads] Sin alertas — {cliente_nombre}"
    )

    rows = ""
    for a in altas[:5]:
        rows += f'<tr><td style="color:#f87171;padding:8px;white-space:nowrap">🔴 Alta</td><td style="color:#e2e8f0;padding:8px">{a["mensaje"]}</td></tr>'
    for a in medias[:3]:
        rows += f'<tr style="border-top:1px solid #374151"><td style="color:#fbbf24;padding:8px;white-space:nowrap">🟡 Media</td><td style="color:#e2e8f0;padding:8px">{a["mensaje"]}</td></tr>'
    if not rows:
        rows = '<tr><td colspan="2" style="color:#4ade80;padding:8px">✅ Sin alertas críticas hoy</td></tr>'

    html = f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#0f172a;font-family:sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#111827;border-radius:12px;padding:24px;border:1px solid #1e293b">
    <h2 style="color:#a78bfa;margin:0 0 16px;font-size:18px">🔔 Resumen diario</h2>
    <p style="color:#94a3b8;margin:0 0 20px;font-size:14px">{cliente_nombre}</p>
    <table style="width:100%;border-collapse:collapse">
      <tr style="border-bottom:1px solid #374151">
        <th style="text-align:left;padding:8px;color:#64748b;font-size:11px;text-transform:uppercase">Severidad</th>
        <th style="text-align:left;padding:8px;color:#64748b;font-size:11px;text-transform:uppercase">Detalle</th>
      </tr>
      {rows}
    </table>
    <p style="color:#475569;font-size:12px;margin-top:20px">
      Entrá al dashboard para ver el detalle completo y tomar acción.
    </p>
  </div>
</body>
</html>"""

    return subject, html
