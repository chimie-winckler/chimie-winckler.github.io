"""Rubrique Cours protégée par mot de passe.

Chiffrement AES-256-GCM, clé dérivée du mot de passe par PBKDF2-SHA256.
- verrouiller  : chiffre le contenu de <main> de cours.html et tous les PDF de « Ressources site internet/cours »
                 (fichier.pdf -> fichier.pdf.enc, l'original est supprimé) ;
- deverrouiller: recrée dans un dossier de travail le contenu clair (main.html + PDF) à partir du dépôt.
Usage :
  python3 outils/coffre.py verrouiller MOTDEPASSE [dossier_clair]
  python3 outils/coffre.py deverrouiller MOTDEPASSE dossier_clair
Dans dossier_clair : main.html (contenu clair de la page) et cours/… (PDF clairs).
"""
import base64, os, re, sys, glob, urllib.parse
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(RACINE, 'cours.html')
DOS = os.path.join(RACINE, 'Ressources site internet', 'cours')
ITER = 300000

def cle(mdp, sel):
    return PBKDF2HMAC(hashes.SHA256(), 32, sel, ITER).derive(mdp.encode('utf-8'))
def chiffre(k, data):
    iv = os.urandom(12); return iv + AESGCM(k).encrypt(iv, data, None)
def dechiffre(k, blob): return AESGCM(k).decrypt(blob[:12], blob[12:], None)

def lire_page():
    s = open(PAGE, encoding='utf-8').read()
    m = re.search(r'<main class="conteneur">(.*?)</main>', s, re.S)
    return s, m

def deverrouiller(mdp, clair):
    s, m = lire_page()
    sel = base64.b64decode(re.search(r'data-sel="([^"]+)"', s).group(1))
    k = cle(mdp, sel)
    data = base64.b64decode(re.search(r'<script type="application/octet-stream" id="coffre-donnees">([^<]+)</script>', s).group(1))
    main = dechiffre(k, data).decode('utf-8')
    main = re.sub(r'href="#" data-enc="([^"]+)\.enc"', r'href="\1" target="_blank" rel="noopener"', main)
    os.makedirs(clair, exist_ok=True)
    open(os.path.join(clair, 'main.html'), 'w', encoding='utf-8').write(main)
    for f in glob.glob(os.path.join(DOS, '**', '*.enc'), recursive=True):
        rel = os.path.relpath(f, DOS)[:-4]
        dst = os.path.join(clair, 'cours', rel); os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, 'wb').write(dechiffre(k, open(f, 'rb').read()))
    print('déverrouillé dans', clair)

FORM = '''<div id="coffre" class="coffre" data-sel="{sel}" data-iter="{it}">
<form class="coffre-form" id="coffre-form" hidden>
  <p class="coffre-titre">🔒 Rubrique réservée aux étudiants</p>
  <p>Saisis le mot de passe communiqué par ton enseignant pour accéder aux cours.</p>
  <div class="coffre-ligne"><input type="password" id="coffre-mdp" autocomplete="current-password" aria-label="Mot de passe" placeholder="Mot de passe" required><button type="submit">Ouvrir</button></div>
  <label class="coffre-souvenir"><input type="checkbox" id="coffre-garder" checked> Rester connecté sur cet appareil</label>
  <p class="coffre-msg" id="coffre-msg" role="alert"></p>
</form>
<p class="coffre-attente" id="coffre-attente">Chargement…</p>
<div id="coffre-ouvert" hidden></div>
<script type="application/octet-stream" id="coffre-donnees">{data}</script>
<noscript><p>Cette page nécessite JavaScript.</p></noscript>
</div>'''

def verrouiller(mdp, clair=None):
    s, m = lire_page()
    if clair:
        main = open(os.path.join(clair, 'main.html'), encoding='utf-8').read()
        src_pdf = os.path.join(clair, 'cours')
    else:
        main = m.group(1); src_pdf = DOS
        assert 'coffre-donnees' not in main, 'page déjà verrouillée : utiliser un dossier clair'
    # liens -> data-enc
    def lien(mm):
        return 'href="#" data-enc="' + mm.group(1) + '.enc"'
    main = re.sub(r'href="(Ressources%20site%20internet/cours/[^"]+\.pdf)" target="_blank" rel="noopener"', lien, main)
    sel = os.urandom(16); k = cle(mdp, sel)
    # PDF
    for f in glob.glob(os.path.join(DOS, '**', '*.enc'), recursive=True): os.remove(f)
    pdfs = glob.glob(os.path.join(src_pdf, '**', '*.pdf'), recursive=True)
    for f in pdfs:
        rel = os.path.relpath(f, src_pdf); dst = os.path.join(DOS, rel + '.enc')
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, 'wb').write(chiffre(k, open(f, 'rb').read()))
        if src_pdf == DOS: os.remove(f)
    # vérifier que chaque lien a son fichier
    for h in re.findall(r'data-enc="([^"]+)"', main):
        p = os.path.join(RACINE, urllib.parse.unquote(h))
        assert os.path.exists(p), 'fichier manquant : ' + p
    data = base64.b64encode(chiffre(k, main.encode('utf-8'))).decode()
    bloc = FORM.format(sel=base64.b64encode(sel).decode(), it=ITER, data=data)
    s = s[:m.start(1)] + '\n' + bloc + '\n' + s[m.end(1):]
    if 'coffre.js' not in s:
        s = s.replace('<script src="theme.js?v=1"></script>', '<script src="theme.js?v=1"></script>\n<script src="coffre.js?v=1"></script>')
    open(PAGE, 'w', encoding='utf-8').write(s)
    print(len(pdfs), 'PDF chiffrés,', len(re.findall('data-enc', main)), 'liens')

if __name__ == '__main__':
    a = sys.argv
    if a[1] == 'verrouiller': verrouiller(a[2], a[3] if len(a) > 3 else None)
    elif a[1] == 'deverrouiller': deverrouiller(a[2], a[3])
