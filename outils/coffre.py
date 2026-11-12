"""Rubriques protégées par mot de passe (Cours, S'entraîner et pages d'exercices).

Chiffrement AES-256-GCM, clé dérivée du mot de passe par PBKDF2-SHA256 (sel commun à toutes
les pages, dans outils/sel.txt : une seule saisie du mot de passe ouvre toutes les rubriques).

Pour chaque page protégée, le contenu de <main> et les scripts propres à la page sont chiffrés
dans la page elle-même ; les PDF de « Ressources site internet/cours » sont chiffrés en .pdf.enc.

  python3 outils/coffre.py ouvrir MOTDEPASSE dossier_clair   # dépôt -> dossier clair
  python3 outils/coffre.py fermer MOTDEPASSE dossier_clair   # dossier clair (ou pages encore en clair) -> dépôt
Dossier clair : pages/<page>.main.html, pages/<page>.scripts.html, cours/… (PDF).
Pour changer de mot de passe : ouvrir avec l'ancien, fermer avec le nouveau.
"""
import base64, os, re, sys, glob, urllib.parse
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOS = os.path.join(R, 'Ressources site internet', 'cours')
SEL = os.path.join(R, 'outils', 'sel.txt')
ITER = 300000
PUBLICS = ('theme.js', 'exo.js', 'chem.js', 'aller.js', 'coffre.js', 'goatcounter')
SEP = '<!--coffre-scripts-->'

def pages(): return ['cours.html', 'entrainement.html'] + sorted(os.path.basename(f) for f in glob.glob(os.path.join(R, 'exo-*.html')))
def cle(mdp, sel): return PBKDF2HMAC(hashes.SHA256(), 32, sel, ITER).derive(mdp.encode('utf-8'))
def chiffre(k, d): iv = os.urandom(12); return iv + AESGCM(k).encrypt(iv, d, None)
def dechiffre(k, b): return AESGCM(k).decrypt(b[:12], b[12:], None)
def lire(p): return open(os.path.join(R, p), encoding='utf-8').read()
def ecrire(p, s): open(os.path.join(R, p), 'w', encoding='utf-8').write(s)
MAIN = re.compile(r'(<main class="conteneur"[^>]*>)(.*?)(</main>)', re.S)
SCRIPT = re.compile(r'<script\b[^>]*>.*?</script>\n?', re.S)

def scripts_prives(s):
    fin = s.index('</main>'); out = []
    for m in SCRIPT.finditer(s, fin):
        tete = m.group(0)[:m.group(0).index('>')]
        if not any(p in tete for p in PUBLICS): out.append(m)
    return out

def ouvrir(mdp, clair):
    os.makedirs(os.path.join(clair, 'pages'), exist_ok=True)
    k = None
    for p in pages():
        s = lire(p)
        if 'coffre-donnees' not in s: continue
        sel = base64.b64decode(re.search(r'data-sel="([^"]+)"', s).group(1)); k = cle(mdp, sel)
        data = base64.b64decode(re.search(r'id="coffre-donnees">([^<]+)</script>', s).group(1))
        main, scr = dechiffre(k, data).decode('utf-8').split(SEP)
        main = re.sub(r'href="#" data-enc="([^"]+)\.enc"', r'href="\1" target="_blank" rel="noopener"', main)
        open(os.path.join(clair, 'pages', p + '.main.html'), 'w', encoding='utf-8').write(main)
        open(os.path.join(clair, 'pages', p + '.scripts.html'), 'w', encoding='utf-8').write(scr)
    for f in glob.glob(os.path.join(DOS, '**', '*.enc'), recursive=True):
        dst = os.path.join(clair, 'cours', os.path.relpath(f, DOS)[:-4]); os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, 'wb').write(dechiffre(k, open(f, 'rb').read()))
    print('ouvert dans', clair)

FORM = '''<div id="coffre" class="coffre" data-sel="{sel}" data-iter="{it}">
<form class="coffre-form" id="coffre-form" hidden>
  <p class="coffre-titre">🔒 Rubrique réservée aux étudiants</p>
  <p>Saisis le mot de passe communiqué par ton enseignant pour accéder à cette rubrique.</p>
  <div class="coffre-ligne"><input type="password" id="coffre-mdp" autocomplete="current-password" aria-label="Mot de passe" placeholder="Mot de passe" required><button type="submit">Ouvrir</button></div>
  <label class="coffre-souvenir"><input type="checkbox" id="coffre-garder" checked> Rester connecté sur cet appareil</label>
  <p class="coffre-msg" id="coffre-msg" role="alert"></p>
</form>
<p class="coffre-attente" id="coffre-attente">Chargement…</p>
<div id="coffre-ouvert" hidden></div>
<script type="application/octet-stream" id="coffre-donnees">{data}</script>
<noscript><p>Cette page nécessite JavaScript.</p></noscript>
</div>'''

def fermer(mdp, clair):
    if not os.path.exists(SEL): open(SEL, 'w').write(base64.b64encode(os.urandom(16)).decode())
    sel64 = open(SEL).read().strip(); k = cle(mdp, base64.b64decode(sel64))
    for p in pages():
        s = lire(p); fm = os.path.join(clair, 'pages', p + '.main.html')
        if os.path.exists(fm):
            main = open(fm, encoding='utf-8').read(); scr = open(os.path.join(clair, 'pages', p + '.scripts.html'), encoding='utf-8').read()
        elif 'coffre-donnees' not in s:
            main = MAIN.search(s).group(2); ms = scripts_prives(s); scr = ''.join(m.group(0) for m in ms)
            for m in reversed(ms): s = s[:m.start()] + s[m.end():]
        else:
            raise SystemExit(p + ' est chiffrée : ouvrir d’abord avec le mot de passe actuel')
        main = re.sub(r'href="(Ressources%20site%20internet/cours/[^"]+\.pdf)" target="_blank" rel="noopener"', r'href="#" data-enc="\1.enc"', main)
        for h in re.findall(r'data-enc="([^"]+)"', main):
            assert os.path.exists(os.path.join(clair, 'cours', urllib.parse.unquote(h)[len('Ressources site internet/cours/'):-4])) or \
                   os.path.exists(os.path.join(R, urllib.parse.unquote(h)[:-4])) or os.path.exists(os.path.join(R, urllib.parse.unquote(h))), h
        data = base64.b64encode(chiffre(k, (main + SEP + scr).encode('utf-8'))).decode()
        m = MAIN.search(s)
        s = s[:m.start(2)] + '\n' + FORM.format(sel=sel64, it=ITER, data=data) + '\n' + s[m.end(2):]
        if 'coffre.js' not in s:
            s = re.sub(r'(<script data-goatcounter)', '<script src="coffre.js?v=3"></script>\n\\1', s, 1)
        s = s.replace('coffre.js?v=2', 'coffre.js?v=3')
        ecrire(p, s)
    # PDF des cours
    src = os.path.join(clair, 'cours'); pdfs = glob.glob(os.path.join(src, '**', '*.pdf'), recursive=True)
    if not pdfs: src = DOS; pdfs = glob.glob(os.path.join(DOS, '**', '*.pdf'), recursive=True)
    if pdfs:
        for f in glob.glob(os.path.join(DOS, '**', '*.enc'), recursive=True): os.remove(f)
        for f in pdfs:
            dst = os.path.join(DOS, os.path.relpath(f, src) + '.enc'); os.makedirs(os.path.dirname(dst), exist_ok=True)
            open(dst, 'wb').write(chiffre(k, open(f, 'rb').read()))
            if src == DOS: os.remove(f)
    print(len(pages()), 'pages fermées,', len(pdfs), 'PDF')

if __name__ == '__main__':
    {'ouvrir': ouvrir, 'fermer': fermer}[sys.argv[1]](sys.argv[2], sys.argv[3])
