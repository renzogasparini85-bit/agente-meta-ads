from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.parse
import os
from datetime import datetime, timedelta, timezone

TOKEN = os.environ.get('META_ACCESS_TOKEN', '').strip()
ACCOUNT = os.environ.get('META_AD_ACCOUNT_ID', 'act_3588452974767128').strip()
TG_TOKEN = '8630312418:AAEV4cr6JZVCh_CacsLA86kNtvLygIHvPvc'
TG_CHAT = '6137725296'
ALLOWED_CHATS = {'6137725296'}


def api_get(path, params):
    params['access_token'] = TOKEN
    url = f'https://graph.facebook.com/v19.0/{path}?' + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=10) as r:
        return json.loads(r.read())


def api_post(path, params):
    params['access_token'] = TOKEN
    data = urllib.parse.urlencode(params).encode()
    url = f'https://graph.facebook.com/v19.0/{path}'
    req = urllib.request.Request(url, data=data, method='POST')
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def send_tg(chat_id, msg):
    url = f'https://api.telegram.org/bot{TG_TOKEN}/sendMessage'
    data = urllib.parse.urlencode({
        'chat_id': chat_id,
        'text': msg,
        'parse_mode': 'HTML'
    }).encode()
    req = urllib.request.Request(url, data=data)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def get_active_ads():
    return api_get(f'{ACCOUNT}/ads', {
        'fields': 'id,name,status,created_time,adset_id',
        'effective_status': json.dumps(['ACTIVE']),
        'limit': '50'
    }).get('data', [])


def get_ad_insights(ad_id, days=1):
    today = datetime.now(timezone.utc)
    since = (today - timedelta(days=days)).strftime('%Y-%m-%d')
    until = today.strftime('%Y-%m-%d')
    try:
        ins = api_get(f'{ad_id}/insights', {
            'fields': 'impressions,reach,clicks,ctr,spend,frequency,actions',
            'time_range': json.dumps({'since': since, 'until': until})
        })
        return ins['data'][0] if ins.get('data') else {}
    except Exception:
        return {}


def cmd_ayuda(chat_id):
    msg = (
        '🤖 <b>IFPA Meta Ads Bot</b>\n\n'
        'Comandos disponibles:\n\n'
        '📊 <b>reporte</b> — informe completo de hoy\n'
        '📈 <b>status</b> — resumen últimos 7 días\n'
        '🚨 <b>alertas</b> — solo anuncios con problemas\n'
        '⏸ <b>pausar [nombre]</b> — pausa un anuncio activo\n'
        '⬆️ <b>escalar [nombre] [%]</b> — sube presupuesto\n\n'
        'Ejemplos:\n'
        '  pausar ALE HAEDO 3\n'
        '  escalar Ejecutivo 1 20%'
    )
    send_tg(chat_id, msg)


def cmd_reporte(chat_id):
    today = datetime.now(timezone.utc)
    try:
        ads = get_active_ads()
    except Exception as e:
        send_tg(chat_id, f'❌ Error al consultar Meta: {str(e)}')
        return

    if not ads:
        send_tg(chat_id, 'No hay anuncios activos.')
        return

    lines = []
    alerts = []
    ad_data = []
    for ad in ads:
        name = ad['name']
        created = datetime.fromisoformat(ad['created_time'].replace('Z', '+00:00'))
        age = (today - created).days
        i = get_ad_insights(ad['id'])

        ctr = float(i.get('ctr', 0))
        spend = float(i.get('spend', 0))
        freq = float(i.get('frequency', 0))
        impressions = int(i.get('impressions', 0))
        actions = i.get('actions', [])
        convs = sum(int(a.get('value', 0)) for a in actions
                    if 'messaging' in a.get('action_type', ''))
        cpa_val = spend / convs if convs > 0 else 0
        cpa = f'${cpa_val:.0f}' if convs > 0 else '-'

        ad_data.append({'name': name, 'ctr': ctr, 'spend': spend, 'freq': freq,
                        'impressions': impressions, 'convs': convs, 'cpa': cpa_val, 'age': age})

        flags = []
        if freq > 2.5: flags.append(f'FREQ {freq:.1f}')
        if ctr < 0.8 and impressions > 500: flags.append(f'CTR {ctr:.2f}%')
        if age > 30: flags.append(f'{age}d')
        if spend > 5000 and convs == 0: flags.append('SIN CONV')

        if flags:
            alerts.append(f'  ⚠️ <b>{name}</b>: {" | ".join(flags)}')
            icon = '🔴'
        else:
            icon = '🟢'

        lines.append(f'{icon} <b>{name}</b> ({age}d)\n   CTR:{ctr:.2f}% CPA:{cpa} Freq:{freq:.1f} ${spend:.0f}')

    recomendaciones = []
    for a in [x for x in ad_data if x['convs'] > 0 and x['cpa'] < 2000]:
        recomendaciones.append(f'⬆️ Escalar <b>{a["name"]}</b> — CPA ${a["cpa"]:.0f}, muy rentable')
    for a in [x for x in ad_data if x['ctr'] < 0.8 and x['impressions'] > 500]:
        recomendaciones.append(f'🔄 Refrescar creativo <b>{a["name"]}</b> — CTR {a["ctr"]:.2f}% en caída')
    for a in [x for x in ad_data if x['freq'] > 2.5]:
        recomendaciones.append(f'⏸ Pausar <b>{a["name"]}</b> — Frecuencia {a["freq"]:.1f}, audiencia saturada')
    for a in [x for x in ad_data if x['spend'] > 3000 and x['convs'] == 0]:
        recomendaciones.append(f'⏸ Revisar <b>{a["name"]}</b> — ${a["spend"]:.0f} gastado sin conversiones')
    for a in [x for x in ad_data if x['age'] > 30]:
        recomendaciones.append(f'🔁 Renovar <b>{a["name"]}</b> — {a["age"]} días activo, riesgo de fatiga')

    msg1 = f'📊 <b>IFPA Meta Ads — {today.strftime("%d/%m/%Y")}</b>\nActivos: {len(ads)}\n\n'
    msg1 += '\n\n'.join(lines)
    if alerts:
        msg1 += '\n\n🚨 <b>ALERTAS:</b>\n' + '\n'.join(alerts)
    send_tg(chat_id, msg1[:4000])

    if recomendaciones:
        msg2 = '🧠 <b>RECOMENDACIONES:</b>\n\n' + '\n'.join(recomendaciones)
        msg2 += '\n\n💬 pausar [nombre] | escalar [nombre] [%]'
        send_tg(chat_id, msg2[:4000])


def cmd_alertas(chat_id):
    today = datetime.now(timezone.utc)
    try:
        ads = get_active_ads()
    except Exception as e:
        send_tg(chat_id, f'❌ Error: {str(e)}')
        return

    alerts = []
    for ad in ads:
        name = ad['name']
        created = datetime.fromisoformat(ad['created_time'].replace('Z', '+00:00'))
        age = (today - created).days
        i = get_ad_insights(ad['id'])
        freq = float(i.get('frequency', 0))
        ctr = float(i.get('ctr', 0))
        impressions = int(i.get('impressions', 0))
        spend = float(i.get('spend', 0))
        actions = i.get('actions', [])
        convs = sum(int(a.get('value', 0)) for a in actions
                    if 'messaging' in a.get('action_type', ''))
        flags = []
        if freq > 2.5: flags.append(f'FREQ ALTA {freq:.1f}')
        if ctr < 0.8 and impressions > 500: flags.append(f'CTR BAJO {ctr:.2f}%')
        if age > 30: flags.append(f'{age} días activo')
        if spend > 5000 and convs == 0: flags.append('GASTO SIN CONV')
        if flags:
            alerts.append(f'⚠️ <b>{name}</b>\n   ' + ' | '.join(flags))

    if not alerts:
        send_tg(chat_id, '✅ Sin alertas. Todos los anuncios están dentro de parámetros.')
    else:
        msg = f'🚨 <b>Alertas — {len(alerts)} anuncios</b>\n\n' + '\n\n'.join(alerts)
        send_tg(chat_id, msg)


def cmd_status(chat_id):
    today = datetime.now(timezone.utc)
    since = (today - timedelta(days=7)).strftime('%Y-%m-%d')
    until = today.strftime('%Y-%m-%d')
    try:
        ins = api_get(f'{ACCOUNT}/insights', {
            'fields': 'impressions,reach,clicks,spend,actions',
            'time_range': json.dumps({'since': since, 'until': until})
        })
        i = ins['data'][0] if ins.get('data') else {}
        ads = get_active_ads()
        spend = float(i.get('spend', 0))
        clicks = i.get('clicks', '0')
        impressions = i.get('impressions', '0')
        actions = i.get('actions', [])
        convs = sum(int(a.get('value', 0)) for a in actions
                    if 'messaging' in a.get('action_type', ''))
        cpa = f'${spend/convs:.0f}' if convs > 0 else '-'
        msg = (f'📈 <b>Status IFPA — últimos 7 días</b>\n\n'
               f'💰 Gasto: ${spend:.0f}\n'
               f'👁 Impresiones: {impressions}\n'
               f'🖱 Clicks: {clicks}\n'
               f'💬 Conversaciones: {convs}\n'
               f'📉 CPA: {cpa}\n'
               f'🟢 Anuncios activos: {len(ads)}')
        send_tg(chat_id, msg)
    except Exception as e:
        send_tg(chat_id, f'❌ Error: {str(e)}')


def cmd_pausar(chat_id, ad_name):
    try:
        ads = get_active_ads()
        match = [a for a in ads if ad_name.lower() in a['name'].lower()]
        if not match:
            send_tg(chat_id, f'❌ No encontré anuncio con "{ad_name}".\nUsá <b>reporte</b> para ver los nombres.')
            return
        if len(match) > 1:
            names = '\n'.join(f'• {a["name"]}' for a in match)
            send_tg(chat_id, f'⚠️ {len(match)} coincidencias:\n{names}\n\nSé más específico.')
            return
        ad = match[0]
        api_post(f'{ad["id"]}', {'status': 'PAUSED'})
        send_tg(chat_id, f'✅ <b>{ad["name"]}</b> pausado.')
    except Exception as e:
        send_tg(chat_id, f'❌ Error: {str(e)}')


def cmd_escalar(chat_id, parts):
    pct = None
    name_parts = []
    for p in parts:
        if p.replace('%', '').isdigit():
            pct = int(p.replace('%', ''))
        else:
            name_parts.append(p)
    ad_name = ' '.join(name_parts)
    if not pct or not ad_name:
        send_tg(chat_id, '❌ Formato: escalar [nombre] [%]\nEj: escalar Ejecutivo 1 20%')
        return
    try:
        ads = get_active_ads()
        match = [a for a in ads if ad_name.lower() in a['name'].lower()]
        if not match:
            send_tg(chat_id, f'❌ No encontré anuncio con "{ad_name}".')
            return
        ad = match[0]
        adset = api_get(ad['adset_id'], {'fields': 'id,name,daily_budget'})
        current = int(adset.get('daily_budget', 0))
        new_budget = int(current * (1 + pct / 100))
        api_post(ad['adset_id'], {'daily_budget': str(new_budget)})
        send_tg(chat_id,
                f'✅ Presupuesto escalado +{pct}%\n'
                f'<b>{adset.get("name")}</b>\n'
                f'Antes: ${current/100:.0f} → Ahora: ${new_budget/100:.0f}')
    except Exception as e:
        send_tg(chat_id, f'❌ Error: {str(e)}')


def handle_message(body):
    msg = body.get('message') or body.get('edited_message')
    if not msg:
        return

    chat_id = str(msg.get('chat', {}).get('id', ''))
    text = (msg.get('text') or '').strip()

    if not text:
        return

    if chat_id not in ALLOWED_CHATS:
        send_tg(chat_id, '⛔ No autorizado.')
        return

    text_lower = text.lower().lstrip('/')

    if text_lower in ('reporte', 'report'):
        cmd_reporte(chat_id)
    elif text_lower in ('alertas', 'alert', 'alerts'):
        cmd_alertas(chat_id)
    elif text_lower in ('status', 'estado'):
        cmd_status(chat_id)
    elif text_lower.startswith('pausar '):
        cmd_pausar(chat_id, text[7:].strip())
    elif text_lower.startswith('pausa '):
        cmd_pausar(chat_id, text[6:].strip())
    elif text_lower.startswith('escalar '):
        cmd_escalar(chat_id, text[8:].strip().split())
    elif text_lower in ('ayuda', 'help', 'start', '/start', '/help'):
        cmd_ayuda(chat_id)
    else:
        send_tg(chat_id, '❓ No entendí. Mandá <b>ayuda</b> para ver comandos.')


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'IFPA Bot OK')

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = {}
        if length:
            try:
                body = json.loads(self.rfile.read(length))
            except Exception:
                pass
        try:
            handle_message(body)
        except Exception as e:
            send_tg(TG_CHAT, f'❌ Error interno: {str(e)}')
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'ok')

    def log_message(self, format, *args):
        pass
