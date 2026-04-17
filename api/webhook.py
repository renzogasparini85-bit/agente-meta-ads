import json
import urllib.request
import urllib.parse
import os
from datetime import datetime, timedelta, timezone

TOKEN = os.environ.get('META_ACCESS_TOKEN', '')
ACCOUNT = os.environ.get('META_AD_ACCOUNT_ID', 'act_3588452974767128')
TG_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TG_CHAT = os.environ.get('TELEGRAM_CHAT_ID', '')
ALLOWED_CHATS = {TG_CHAT}


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
    urllib.request.urlopen(url, data=data, timeout=10)


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
    except:
        return {}


def cmd_reporte(chat_id):
    today = datetime.now(timezone.utc)
    ads = get_active_ads()
    if not ads:
        send_tg(chat_id, 'No hay anuncios activos en este momento.')
        return

    lines = []
    alerts = []
    for ad in ads:
        name = ad['name']
        created = datetime.fromisoformat(ad['created_time'].replace('Z', '+00:00'))
        age = (today - created).days
        i = get_ad_insights(ad['id'])

        impressions = i.get('impressions', '0')
        ctr = float(i.get('ctr', 0))
        spend = float(i.get('spend', 0))
        freq = float(i.get('frequency', 0))
        actions = i.get('actions', [])
        convs = sum(int(a.get('value', 0)) for a in actions
                    if a.get('action_type') in [
                        'onsite_conversion.messaging_conversation_started_7d',
                        'onsite_conversion.messaging_first_reply'])
        cpa = f'${spend/convs:.0f}' if convs > 0 else '-'

        flags = []
        if freq > 2.5: flags.append(f'FREQ {freq:.1f}')
        if ctr < 0.8 and int(impressions) > 500: flags.append(f'CTR {ctr:.2f}%')
        if age > 30: flags.append(f'{age}d')
        if spend > 5000 and convs == 0: flags.append('SIN CONV')

        if flags:
            alerts.append(f'  ⚠️ <b>{name}</b>: {" | ".join(flags)}')
            icon = '🔴'
        else:
            icon = '🟢'

        lines.append(f'{icon} <b>{name}</b> ({age}d)\n   CTR:{ctr:.2f}% CPA:{cpa} Freq:{freq:.1f} ${spend:.0f}')

    msg = f'📊 <b>IFPA Meta Ads — {today.strftime("%d/%m/%Y")}</b>\n'
    msg += f'Activos: {len(ads)}\n\n'
    msg += '\n\n'.join(lines)
    if alerts:
        msg += '\n\n🚨 <b>ALERTAS:</b>\n' + '\n'.join(alerts)
    msg += '\n\n💬 Comandos: pausar [nombre] | escalar [nombre] [%] | alertas | status'
    send_tg(chat_id, msg)


def cmd_alertas(chat_id):
    today = datetime.now(timezone.utc)
    ads = get_active_ads()
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
        msg = f'🚨 <b>Alertas activas — {len(alerts)} anuncios</b>\n\n' + '\n\n'.join(alerts)
        msg += '\n\n💬 pausar [nombre] para pausar un anuncio'
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
    except:
        i = {}

    ads = get_active_ads()
    spend = float(i.get('spend', 0))
    clicks = i.get('clicks', '0')
    impressions = i.get('impressions', '0')
    actions = i.get('actions', [])
    convs = sum(int(a.get('value', 0)) for a in actions if 'messaging' in a.get('action_type', ''))
    cpa = f'${spend/convs:.0f}' if convs > 0 else '-'

    msg = f'📈 <b>Status IFPA — últimos 7 días</b>\n\n'
    msg += f'💰 Gasto: ${spend:.0f}\n'
    msg += f'👁 Impresiones: {impressions}\n'
    msg += f'🖱 Clicks: {clicks}\n'
    msg += f'💬 Conversaciones: {convs}\n'
    msg += f'📉 CPA: {cpa}\n'
    msg += f'🟢 Anuncios activos: {len(ads)}'
    send_tg(chat_id, msg)


def cmd_pausar(chat_id, ad_name):
    ads = get_active_ads()
    match = [a for a in ads if ad_name.lower() in a['name'].lower()]
    if not match:
        send_tg(chat_id, f'❌ No encontré ningún anuncio activo con "{ad_name}".\n\nUsá /reporte para ver los nombres exactos.')
        return
    if len(match) > 1:
        names = '\n'.join(f'• {a["name"]}' for a in match)
        send_tg(chat_id, f'⚠️ Encontré {len(match)} anuncios con ese nombre:\n{names}\n\nSé más específico.')
        return
    ad = match[0]
    try:
        api_post(f'{ad["id"]}', {'status': 'PAUSED'})
        send_tg(chat_id, f'✅ Anuncio <b>{ad["name"]}</b> pausado correctamente.')
    except Exception as e:
        send_tg(chat_id, f'❌ Error al pausar: {str(e)}')


def cmd_escalar(chat_id, parts):
    # Formato: escalar [nombre] [porcentaje]
    # Buscar el porcentaje al final
    pct = None
    name_parts = []
    for p in parts:
        if p.replace('%', '').isdigit():
            pct = int(p.replace('%', ''))
        else:
            name_parts.append(p)
    ad_name = ' '.join(name_parts)

    if not pct or not ad_name:
        send_tg(chat_id, '❌ Formato: escalar [nombre del anuncio] [porcentaje]\nEjemplo: escalar Ejecutivo 1 20%')
        return

    # Buscar el adset del anuncio
    ads = get_active_ads()
    match = [a for a in ads if ad_name.lower() in a['name'].lower()]
    if not match:
        send_tg(chat_id, f'❌ No encontré anuncio con "{ad_name}".')
        return

    ad = match[0]
    try:
        adset = api_get(ad['adset_id'], {'fields': 'id,name,daily_budget'})
        current = int(adset.get('daily_budget', 0))
        new_budget = int(current * (1 + pct / 100))
        api_post(ad['adset_id'], {'daily_budget': str(new_budget)})
        send_tg(chat_id,
            f'✅ Presupuesto escalado +{pct}%\n'
            f'Ad set: <b>{adset.get("name")}</b>\n'
            f'Antes: ${current/100:.0f} → Ahora: ${new_budget/100:.0f}')
    except Exception as e:
        send_tg(chat_id, f'❌ Error al escalar: {str(e)}')


def cmd_ayuda(chat_id):
    msg = (
        '🤖 <b>IFPA Meta Ads Bot</b>\n\n'
        'Comandos disponibles:\n\n'
        '📊 <b>reporte</b> — informe completo de hoy\n'
        '📈 <b>status</b> — resumen de los últimos 7 días\n'
        '🚨 <b>alertas</b> — solo anuncios con problemas\n'
        '⏸ <b>pausar [nombre]</b> — pausa un anuncio activo\n'
        '⬆️ <b>escalar [nombre] [%]</b> — sube presupuesto del ad set\n\n'
        'Ejemplo:\n'
        '  pausar ALE HAEDO 3\n'
        '  escalar Ejecutivo 1 20%'
    )
    send_tg(chat_id, msg)


def handler(request):
    if request.method != 'POST':
        return {'statusCode': 200, 'body': 'IFPA Meta Ads Bot OK'}

    try:
        body = json.loads(request.body)
    except:
        return {'statusCode': 200, 'body': 'ok'}

    msg = body.get('message') or body.get('edited_message')
    if not msg:
        return {'statusCode': 200, 'body': 'ok'}

    chat_id = str(msg.get('chat', {}).get('id', ''))
    text = msg.get('text', '').strip()

    if not text:
        return {'statusCode': 200, 'body': 'ok'}

    # Solo responder al chat autorizado
    if chat_id not in ALLOWED_CHATS:
        send_tg(chat_id, '⛔ No autorizado.')
        return {'statusCode': 200, 'body': 'ok'}

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
        parts = text[8:].strip().split()
        cmd_escalar(chat_id, parts)
    elif text_lower in ('ayuda', 'help', 'start', '/start', '/help'):
        cmd_ayuda(chat_id)
    else:
        send_tg(chat_id,
            '❓ No entendí el comando.\n\n'
            'Mandá <b>ayuda</b> para ver los comandos disponibles.')

    return {'statusCode': 200, 'body': 'ok'}
