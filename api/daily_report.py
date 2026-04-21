from flask import Flask, Response
import json
import urllib.request
import urllib.parse
import os
from datetime import datetime, timedelta, timezone

app = Flask(__name__)

TOKEN = os.environ.get('META_ACCESS_TOKEN', '').strip()
ACCOUNT = os.environ.get('META_AD_ACCOUNT_ID', 'act_3588452974767128').strip()
TG_TOKEN = '8630312418:AAEV4cr6JZVCh_CacsLA86kNtvLygIHvPvc'
TG_CHAT = '6137725296'


def api_get(path, params):
    params['access_token'] = TOKEN
    url = f'https://graph.facebook.com/v19.0/{path}?' + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=15) as r:
        return json.loads(r.read())


def send_tg(msg):
    url = f'https://api.telegram.org/bot{TG_TOKEN}/sendMessage'
    data = urllib.parse.urlencode({
        'chat_id': TG_CHAT,
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


def get_ad_insights(ad_id):
    today = datetime.now(timezone.utc)
    since = (today - timedelta(days=1)).strftime('%Y-%m-%d')
    until = today.strftime('%Y-%m-%d')
    try:
        ins = api_get(f'{ad_id}/insights', {
            'fields': 'impressions,reach,clicks,ctr,spend,frequency,actions',
            'time_range': json.dumps({'since': since, 'until': until})
        })
        return ins['data'][0] if ins.get('data') else {}
    except:
        return {}


@app.route('/api/daily_report', methods=['GET', 'POST'])
def daily_report():
    today = datetime.now(timezone.utc)

    try:
        ads = get_active_ads()
    except Exception as e:
        send_tg(f'❌ Error al consultar Meta: {str(e)}')
        return Response('error', status=500)

    if not ads:
        send_tg('ℹ️ No hay anuncios activos.')
        return Response('ok', status=200)

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
                    if a.get('action_type') == 'onsite_conversion.messaging_conversation_started_7d')
        cpa_val = spend / convs if convs > 0 else 0
        cpa = f'${cpa_val:.0f}' if convs > 0 else '-'

        ad_data.append({'name': name, 'ctr': ctr, 'spend': spend, 'freq': freq,
                        'impressions': impressions, 'convs': convs, 'cpa': cpa_val, 'age': age})

        flags = []
        if freq > 2.5: flags.append(f'FREQ {freq:.1f}')
        if ctr < 0.8 and impressions > 500: flags.append(f'CTR {ctr:.2f}%')
        if age > 30: flags.append(f'{age}d')
        if spend > 5000 and convs == 0: flags.append('SIN CONV')

        icon = '🔴' if flags else '🟢'
        if flags:
            alerts.append(f'  ⚠️ <b>{name}</b>: {" | ".join(flags)}')

        lines.append(
            f'{icon} <b>{name}</b> ({age}d)\n'
            f'   CTR:{ctr:.2f}% | CPA:{cpa} | Freq:{freq:.1f} | ${spend:.0f}'
        )

    recomendaciones = []
    low_cpa = [a for a in ad_data if a['convs'] > 0 and a['cpa'] < 2000]
    worst_ctr = [a for a in ad_data if a['ctr'] < 0.8 and a['impressions'] > 500]
    high_freq = [a for a in ad_data if a['freq'] > 2.5]
    old_ads = [a for a in ad_data if a['age'] > 30]
    no_conv = [a for a in ad_data if a['spend'] > 5000 and a['convs'] == 0]

    for a in low_cpa:
        recomendaciones.append(f'⬆️ Escalar <b>{a["name"]}</b> — CPA ${a["cpa"]:.0f}')
    for a in worst_ctr:
        recomendaciones.append(f'🔄 Refrescar creativo <b>{a["name"]}</b> — CTR {a["ctr"]:.2f}%')
    for a in high_freq:
        recomendaciones.append(f'⏸ Pausar <b>{a["name"]}</b> — Freq {a["freq"]:.1f}')
    for a in no_conv:
        recomendaciones.append(f'⏸ Revisar <b>{a["name"]}</b> — ${a["spend"]:.0f} sin conversiones')
    for a in old_ads:
        recomendaciones.append(f'🔁 Renovar <b>{a["name"]}</b> — {a["age"]}d activo')

    msg1 = f'📊 <b>IFPA Meta Ads — {today.strftime("%d/%m/%Y")}</b>\n'
    msg1 += f'Activos: {len(ads)}\n\n'
    msg1 += '\n\n'.join(lines)
    if alerts:
        msg1 += '\n\n🚨 <b>ALERTAS:</b>\n' + '\n'.join(alerts)

    send_tg(msg1[:4000])

    if recomendaciones:
        msg2 = '🧠 <b>RECOMENDACIONES:</b>\n\n' + '\n'.join(recomendaciones)
        msg2 += '\n\n💬 pausar [nombre] | escalar [nombre] [%]'
        send_tg(msg2[:4000])

    return Response('ok', status=200)
