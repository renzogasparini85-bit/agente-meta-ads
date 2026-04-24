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
    except Exception:
        return {}


def run_report():
    today = datetime.now(timezone.utc)

    try:
        ads = get_active_ads()
    except Exception as e:
        send_tg(f'❌ Error al consultar Meta: {str(e)}')
        return 500

    if not ads:
        send_tg('ℹ️ No hay anuncios activos.')
        return 200

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
    for a in [x for x in ad_data if x['convs'] > 0 and x['cpa'] < 2000]:
        recomendaciones.append(f'⬆️ Escalar <b>{a["name"]}</b> — CPA ${a["cpa"]:.0f}')
    for a in [x for x in ad_data if x['ctr'] < 0.8 and x['impressions'] > 500]:
        recomendaciones.append(f'🔄 Refrescar creativo <b>{a["name"]}</b> — CTR {a["ctr"]:.2f}%')
    for a in [x for x in ad_data if x['freq'] > 2.5]:
        recomendaciones.append(f'⏸ Pausar <b>{a["name"]}</b> — Freq {a["freq"]:.1f}')
    for a in [x for x in ad_data if x['spend'] > 5000 and x['convs'] == 0]:
        recomendaciones.append(f'⏸ Revisar <b>{a["name"]}</b> — ${a["spend"]:.0f} sin conversiones')
    for a in [x for x in ad_data if x['age'] > 30]:
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

    return 200


if __name__ == '__main__':
    import sys
    code = run_report()
    sys.exit(0 if code == 200 else 1)


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        status = run_report()
        self.send_response(status)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'ok' if status == 200 else b'error')

    def do_POST(self):
        self.do_GET()

    def log_message(self, format, *args):
        pass  # silenciar logs de acceso
