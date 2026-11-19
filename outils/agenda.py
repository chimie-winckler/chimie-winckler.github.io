"""Recopie l'agenda Google public (fichiers .ics) dans agenda.json, lu par la page d'accueil.
Lancé par .github/workflows/agenda.yml (toutes les heures). Ne garde que titre, horaires et lieu."""
import json, sys, urllib.request, datetime as dt
from zoneinfo import ZoneInfo
import icalendar, recurring_ical_events

PARIS = ZoneInfo('Europe/Paris')
SOURCES = [  # (adresse .ics publique, n° de couleur)
    ('https://calendar.google.com/calendar/ical/p6ghh5mdm3u9jir7j6t6fm6i7ms74dlu%40import.calendar.google.com/public/basic.ics', 0),
    ('https://calendar.google.com/calendar/ical/winckler.btsmch%40gmail.com/public/basic.ics', 1),
]
auj = dt.datetime.now(PARIS).date()
debut, fin = auj - dt.timedelta(days=35), auj + dt.timedelta(days=200)
evts, ok = [], 0
for url, coul in SOURCES:
    try:
        cal = icalendar.Calendar.from_ical(urllib.request.urlopen(url, timeout=30).read())
        ok += 1
    except Exception as e:
        print('Agenda illisible :', url, e, file=sys.stderr); continue
    for ev in recurring_ical_events.of(cal).between(debut, fin):
        if str(ev.get('CLASS', 'PUBLIC')).upper() in ('PRIVATE', 'CONFIDENTIAL'): continue
        d, f = ev.get('DTSTART').dt, (ev.get('DTEND') or ev.get('DTSTART')).dt
        jour = not isinstance(d, dt.datetime)
        if not jour:
            d, f = d.astimezone(PARIS), f.astimezone(PARIS)
        evts.append({'t': str(ev.get('SUMMARY', '')).strip() or 'Occupé', 'd': d.isoformat()[:16], 'f': f.isoformat()[:16],
                     'j': jour, 'c': coul, 'l': str(ev.get('LOCATION', '')).strip()})
if not ok:
    sys.exit('Aucun agenda lisible : agenda.json inchangé.')
evts.sort(key=lambda e: (e['d'], e['t']))
json.dump({'maj': dt.datetime.now(PARIS).isoformat()[:16], 'evts': evts}, open('agenda.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(evts), 'événements')
