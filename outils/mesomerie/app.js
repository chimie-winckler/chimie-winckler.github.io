/* Mésomérie — application : observer les formules mésomères (animations) ou les écrire soi-même (« À toi ») */
(() => {
  const $ = id => document.getElementById(id);
  const LISTE = MesoMolecules.liste;
  const POLICES = { arial: 'Arial, Helvetica, sans-serif', century: "'Century Gothic', 'URW Gothic', Questrial, sans-serif", calibri: 'Calibri, Carlito, sans-serif', verdana: 'Verdana, Geneva, sans-serif', times: "'Times New Roman', Times, serif", cambria: 'Cambria, Caladea, Georgia, serif' };
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let police = POLICES.arial;

  const E = { mode: 'voir', m: null, ch: null, boite: null, k: 0, anim: null };
  const T = { forme: null, fleches: [], depart: null, demi: false, choisie: null, ens: [], refus: null };   // « À toi »

  // ───────── choix de la molécule ─────────
  function boutons() {
    const b = m => `<button type="button" data-mol="${m.id}" title="${esc(m.nom)}">${esc(m.titre)}</button>`;
    $('ms-cours').innerHTML = LISTE.filter(m => m.groupe === 'cours').map(b).join('');
    $('ms-exos').innerHTML = LISTE.filter(m => m.groupe === 'exo').map(b).join('');
  }
  document.querySelector('.mesomerie').addEventListener('click', e => {
    const b = e.target.closest('[data-mol]'); if (b) choisir(b.dataset.mol);
    const md = e.target.closest('[data-mode]'); if (md) changerMode(md.dataset.mode);
    const dm = e.target.closest('[data-demi]'); if (dm) { T.demi = dm.dataset.demi === '1'; document.querySelectorAll('[data-demi]').forEach(x => x.classList.toggle('actif', x === dm)); }
  });
  function choisir(id) {
    stop();
    E.m = LISTE.find(m => m.id === id) || LISTE[0];
    E.ch = Meso.chaine(E.m);
    E.boite = MesoDessin.boiteChaine(E.m, E.ch.formes, E.ch.fleches);
    E.k = E.mode === 'toi' ? (E.m.depart || 0) : 0;
    document.querySelectorAll('[data-mol]').forEach(x => x.classList.toggle('actif', x.dataset.mol === E.m.id));
    $('ms-titre').innerHTML = esc(E.m.titre) + (E.m.nom && E.m.nom !== E.m.titre ? ` <span class="ms-doux">— ${esc(E.m.nom)}</span>` : '');
    $('ms-note').textContent = E.m.note || '';
    if (E.mode === 'toi') initToi(); else afficherVoir();
  }
  function changerMode(md) {
    stop(); E.mode = md;
    document.querySelectorAll('[data-mode]').forEach(x => x.classList.toggle('actif', x.dataset.mode === md));
    $('ms-cmd-voir').hidden = md !== 'voir'; $('ms-cmd-toi').hidden = md !== 'toi';
    choisir(E.m.id);
  }
  function msg(t, ok) { const m = $('ms-msg'); m.innerHTML = t || ''; m.hidden = !t; m.classList.toggle('ok', !!ok); }

  // ───────── affichages communs ─────────
  const opt = (o = {}) => ({ police, boite: E.boite, ...o });
  const flecheMeso = '<svg class="ms-meso" viewBox="0 0 44 14" width="44" height="14" aria-label="flèche de mésomérie"><path d="M5 7 H39" stroke="currentColor" stroke-width="1.6"/><path d="M1 7 L8 3 L8 11 Z M43 7 L36 3 L36 11 Z" fill="currentColor"/></svg>';
  const crochet = d => `<svg class="ms-crochet" viewBox="0 0 12 100" preserveAspectRatio="none" aria-hidden="true"><path d="${d === 'g' ? 'M11 1 H2 V99 H11' : 'M1 1 H10 V99 H1'}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
  function badges(c) {
    if (!c) return '';
    const a = c.a, oct = a.defaut.length ? `<span class="ms-b non">octet ✗</span>` : `<span class="ms-b oui">octet ✓</span>`;
    const ch = `<span class="ms-b">${a.charges ? a.charges + ' charge' + (a.charges > 1 ? 's' : '') : '0 charge'}</span>`;
    const el = a.charges ? (a.malPlacees.length ? `<span class="ms-b non">χ ✗</span>` : `<span class="ms-b oui">χ ✓</span>`) : '';
    return `<div class="ms-badges">${oct}${ch}${el}</div>`;
  }
  function verdict(c) {
    if (!c) return '';
    const cls = c.rang === 'max' ? 'max' : c.rang === 'interdite' ? 'int' : 'moins';
    return `<p class="ms-verdict ${cls}">${esc(c.texte)}${c.egalite ? ' <span class="ms-doux">(à égalité selon les 3 critères)</span>' : ''}${c.raison ? `<br><span class="ms-doux">${esc(c.raison)}</span>` : ''}</p>`;
  }
  // rangée [ f1 ↔ f2 ↔ … ] ; items : [{forme, fleches, actif}]
  function ensemble(items, classes, cliquable) {
    if (!items.length) return '<p class="ms-doux">Aucune formule pour l’instant.</p>';
    const figs = items.map((it, i) => `<figure class="ms-fig${it.actif ? ' actif' : ''}"${cliquable ? ` data-k="${i}" tabindex="0"` : ''}>${MesoDessin.forme(E.m, it.forme, opt({ fleches: it.fleches, zoom: 0.82 }))}${verdict(classes[i])}${badges(classes[i])}</figure>`);
    return crochet('g') + figs.join(`<span class="ms-sep">${flecheMeso}</span>`) + crochet('d');
  }

  // ───────── Observer ─────────
  function afficherVoir() {
    const { formes, fleches } = E.ch, k = E.k, n = formes.length;
    $('ms-consigne').textContent = n > 1 ? `Formule ${k + 1} sur ${n}. « Animer » montre le déplacement des électrons vers la formule suivante.` : '';
    $('ms-scene').innerHTML = MesoDessin.forme(E.m, formes[k], opt({ fleches: k < n - 1 ? fleches[k] : [], zoom: 1.45, classe: 'ms-grand' }));
    $('ms-legende').innerHTML = legende(k);
    $('ms-prec').disabled = k === 0; $('ms-suiv').disabled = k >= n - 1; $('ms-jouer').disabled = k >= n - 1;
    const cl = Meso.classer(E.m, formes);
    $('ms-ensemble').innerHTML = ensemble(formes.map((f, i) => ({ forme: f, fleches: fleches[i], actif: i === k })), cl, true);
    annexes();
    msg('');
  }
  function legende(k) {
    const { formes, fleches } = E.ch;
    if (k >= formes.length - 1) return formes.length > 1 ? 'Dernière formule de l’ensemble.' : '';
    const fl = fleches[k], d = fl.filter(f => f.n === 1).length;
    return `${fl.length} flèche${fl.length > 1 ? 's' : ''} courbe${fl.length > 1 ? 's' : ''}${d ? ` dont ${d} demi-flèche${d > 1 ? 's' : ''} (1 électron chacune)` : ''} : formule ${k + 1} ↔ formule ${k + 2}.`;
  }
  function annexes() {
    const m = E.m, out = [];
    if (m.hybride && E.mode === 'voir') {
      const cl = Meso.classer(m, E.ch.formes), meilleures = E.ch.formes.filter((f, i) => cl[i].rang === 'max');
      out.push(`<figure class="ms-fig ms-hyb">${MesoDessin.hybride(m, meilleures, { police, zoom: 0.92 })}<figcaption>Hybride de résonance${m.cercle ? ' (représentation usuelle du benzène)' : ' : liaisons intermédiaires (trait plein + pointillés), charges partielles δ'}</figcaption></figure>`);
    }
    if (E.ch.interdites.length && E.mode === 'voir') {
      const cl = Meso.classer(m, E.ch.interdites.map(x => x.forme));
      E.ch.interdites.forEach((x, i) => out.push(`<figure class="ms-fig ms-int">${MesoDessin.forme(m, x.forme, { police, zoom: 0.92, barre: true })}<figcaption><b>Écriture interdite</b><br>${esc(cl[i].raison)}</figcaption></figure>`));
    }
    $('ms-annexes').innerHTML = out.join('');
  }
  $('ms-ensemble').addEventListener('click', e => {
    const f = e.target.closest('[data-k]'); if (!f) return;
    stop();
    if (E.mode === 'voir') { E.k = +f.dataset.k; afficherVoir(); }
    else { const it = T.ens[+f.dataset.k]; if (it) { T.forme = it.forme; T.fleches = []; T.depart = null; T.choisie = null; T.cour = +f.dataset.k; afficherToi(); } }
  });
  $('ms-prec').addEventListener('click', () => { stop(); if (E.k > 0) { E.k--; afficherVoir(); } });
  $('ms-suiv').addEventListener('click', () => { stop(); if (E.k < E.ch.formes.length - 1) { E.k++; afficherVoir(); } });
  $('ms-jouer').addEventListener('click', () => { if (E.anim) { stop(); return; } jouer([E.k], () => { E.k++; afficherVoir(); }); });
  $('ms-tout').addEventListener('click', () => {
    if (E.anim) { stop(); return; }
    const n = E.ch.formes.length; if (n < 2) return;
    E.k = 0; afficherVoir();
    jouer([...Array(n - 1).keys()], () => { E.k = n - 1; afficherVoir(); });
  });

  // animation : liste d'indices de transitions, avec une pause sur chaque formule
  const DUREE = 1.9, PAUSE = 0.9;
  function jouer(etapes, fin, cible) {
    const vit = +$('ms-vitesse').value || 1, scene = cible || $('ms-scene');
    let t0 = null, i = 0;
    $('ms-jouer').textContent = '⏸ Pause'; $('ms-tout').textContent = '⏹ Arrêter';
    const pas = ts => {
      if (!E.anim) return;
      if (t0 === null) t0 = ts;
      const k = etapes[i], dt = (ts - t0) / 1000 * vit;
      const { formes, fleches } = E.ch;
      if (dt < PAUSE) scene.innerHTML = MesoDessin.forme(E.m, formes[k], opt({ fleches: fleches[k], zoom: 1.45, classe: 'ms-grand' }));
      else if (dt < PAUSE + DUREE) scene.innerHTML = MesoDessin.transition(E.m, formes[k], formes[k + 1], fleches[k], (dt - PAUSE) / DUREE, opt({ zoom: 1.45, classe: 'ms-grand' }));
      else {
        i++; t0 = ts;
        if (E.mode === 'voir') { E.k = k + 1; surligner(E.k); $('ms-legende').innerHTML = legende(E.k); }
        if (i >= etapes.length) { E.anim = null; boutonsRepos(); fin && fin(); return; }
      }
      E.anim = requestAnimationFrame(pas);
    };
    E.anim = requestAnimationFrame(pas);
  }
  function surligner(k) { document.querySelectorAll('#ms-ensemble .ms-fig').forEach((f, i) => f.classList.toggle('actif', i === k)); }
  function boutonsRepos() { $('ms-jouer').textContent = '▶ Animer'; $('ms-tout').textContent = '⟳ Tout enchaîner'; }
  function stop() { if (E.anim) cancelAnimationFrame(E.anim); E.anim = null; boutonsRepos(); }

  // ───────── vidéo (WebM) de l'enchaînement complet ─────────
  function image(svg, W, H) {
    return new Promise(res => {
      const s = svg.replace(/width="\d+" height="\d+"/, `width="${W}" height="${H}"`).replace(/style="[^"]*"/, 'style="color:#1d1d1f"');
      const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null);
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    });
  }
  function lignes(ctx, txt, max) {
    const mots = txt.split(' '), out = []; let l = '';
    mots.forEach(m => { const t = l ? l + ' ' + m : m; if (ctx.measureText(t).width > max && l) { out.push(l); l = m; } else l = t; });
    if (l) out.push(l); return out;
  }
  $('ms-video').addEventListener('click', async () => {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { msg('Ce navigateur ne permet pas d’enregistrer la vidéo (essaie Chrome, Edge ou Firefox).'); return; }
    stop();
    const b = $('ms-video'); b.disabled = true; b.textContent = 'Enregistrement…';
    const [x0, y0, x1, y1] = E.boite, W = 1280, Hd = Math.min(560, Math.round((y1 - y0) * (W - 120) / (x1 - x0))), Wd = Math.round((x1 - x0) * Hd / (y1 - y0)), H = Hd + 150 + ((Hd + 150) % 2);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    const fps = 30, flux = cv.captureStream(fps);
    const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(flux, type ? { mimeType: type, videoBitsPerSecond: 4e6 } : {}), morceaux = [];
    rec.ondataavailable = e => { if (e.data.size) morceaux.push(e.data); };
    const fini = new Promise(r => { rec.onstop = r; });
    rec.start();
    const { formes, fleches } = E.ch, n = formes.length, seg = PAUSE + DUREE, total = (n - 1) * seg + 1.5;
    const avert = 'Flèches bleues : déplacement formel d’électrons entre formules mésomères — ce n’est pas un mécanisme réactionnel.';
    for (let fr = 0; fr <= Math.round(total * fps); fr++) {
      const t = fr / fps, i = Math.min(n - 1, Math.floor(t / seg)), dt = t - i * seg;
      const svg = i >= n - 1 ? MesoDessin.forme(E.m, formes[n - 1], opt({ fond: '#fff' }))
        : dt < PAUSE ? MesoDessin.forme(E.m, formes[i], opt({ fleches: fleches[i], fond: '#fff' }))
          : MesoDessin.transition(E.m, formes[i], formes[i + 1], fleches[i], Math.min(1, (dt - PAUSE) / DUREE), opt({ fond: '#fff' }));
      const im = await image(svg, Wd, Hd);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      if (im) ctx.drawImage(im, (W - Wd) / 2, 20, Wd, Hd);
      ctx.fillStyle = '#1a7f84'; ctx.font = 'bold 24px Arial'; ctx.fillText(`${E.m.titre} — formule ${Math.min(n, i + (dt >= PAUSE + DUREE * 0.6 && i < n - 1 ? 2 : 1))} sur ${n}`, 30, Hd + 62);
      ctx.fillStyle = '#1565c0'; ctx.font = '19px Arial';
      lignes(ctx, avert, W - 60).forEach((l, q) => ctx.fillText(l, 30, Hd + 98 + q * 24));
      await new Promise(r => setTimeout(r, 1000 / fps));
    }
    rec.stop(); await fini;
    const blob = new Blob(morceaux, { type: 'video/webm' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'mesomerie-' + E.m.id + '.webm'; document.body.appendChild(a); a.click(); a.remove();
    b.disabled = false; b.textContent = 'Enregistrer la vidéo';
  });

  // ───────── À toi ─────────
  function initToi() {
    const f0 = E.ch.formes[E.k];
    T.ens = [{ forme: f0, parent: -1, fleches: [] }]; T.cour = 0;
    T.forme = f0; T.fleches = []; T.depart = null; T.choisie = null;
    msg(''); afficherToi();
  }
  function trouvees() { return E.ch.formes.filter(f => T.ens.some(it => Meso.memeForme(it.forme, f))).length; }
  function afficherToi() {
    const nT = E.ch.formes.length;
    $('ms-consigne').innerHTML = T.depart ? 'Clique maintenant sur le site d’arrivée : <b>une liaison</b> (ou l’atome qui reçoit le doublet).'
      : 'Clique sur le site de départ des électrons (<b>doublet non liant</b>, <b>électron célibataire</b> ou <b>liaison multiple</b>), puis sur le site d’arrivée. Place toutes les flèches, puis écris la formule obtenue.';
    $('ms-scene').innerHTML = MesoDessin.forme(E.m, T.forme, opt({ fleches: T.fleches, cibles: true, depart: T.depart, choisie: T.choisie, zoom: 1.45, classe: 'ms-grand ms-actif' + (T.depart ? ' choix-fin' : ' choix-debut') }));
    $('ms-legende').textContent = T.fleches.length ? `${T.fleches.length} flèche${T.fleches.length > 1 ? 's' : ''} placée${T.fleches.length > 1 ? 's' : ''}.` : '';
    $('ms-score').innerHTML = `Formules trouvées : <b>${trouvees()} / ${nT}</b>`;
    const items = T.ens.map((it, i) => ({ forme: it.forme, fleches: (T.ens[i + 1] && T.ens[i + 1].parent === i) ? T.ens[i + 1].fleches : [], actif: i === T.cour }));
    $('ms-ensemble').innerHTML = ensemble(items, T.ens.length > 1 ? Meso.classer(E.m, T.ens.map(x => x.forme)) : [], true);
    $('ms-annexes').innerHTML = T.refus ? `<figure class="ms-fig ms-int">${MesoDessin.forme(E.m, T.refus.forme, { police, zoom: 0.92, barre: true })}<figcaption><b>Formule refusée</b><br>${esc(T.refus.raison)}</figcaption></figure>` : '';
  }
  $('ms-scene').addEventListener('click', e => {
    if (E.mode !== 'toi' || E.anim) return;
    const fl = e.target.closest('[data-f]');
    const c = e.target.closest('.ms-c');
    if (!c && fl) { T.choisie = +fl.dataset.f; afficherToi(); return; }
    if (!c) return;
    const t = c.dataset.t;
    if (!T.depart) {
      if (t === 'p') T.depart = { t: 'p', i: +c.dataset.i, k: +c.dataset.k };
      else if (t === 'l') {
        const l = c.dataset.l.split('-').map(Number);
        if ((T.forme.e[Meso.cle(...l)] || 0) < 4) { msg('Cette liaison est simple : en mésomérie, ses électrons ne se déplacent pas (le squelette reste intact). Choisis une liaison multiple, un doublet non liant ou un électron célibataire.'); return; }
        T.depart = { t: 'l', l };
      } else { msg('Une flèche courbe part d’un <b>doublet non liant</b>, d’un <b>électron célibataire</b> ou d’une <b>liaison multiple</b> : clique directement dessus.'); return; }
      msg(''); afficherToi(); return;
    }
    // arrivée
    const d = T.depart;
    let vers = t === 'l' ? { l: c.dataset.l.split('-').map(Number) } : { a: +c.dataset.i };
    if (d.t === 'p' && t === 'p' && +c.dataset.i === d.i && +c.dataset.k === d.k) { T.depart = null; afficherToi(); return; }
    if (d.t === 'l' && t === 'l' && Meso.cle(...vers.l) === Meso.cle(...d.l)) { T.depart = null; afficherToi(); return; }
    let de = d.t === 'p' ? { a: d.i } : { l: d.l };
    // doublet vers un atome voisin : la flèche arrive sur la liaison entre les deux atomes
    if (de.a !== undefined && vers.a !== undefined && vers.a !== de.a && T.forme.e[Meso.cle(de.a, vers.a)] !== undefined) vers = { l: [de.a, vers.a] };
    const radical = d.t === 'p' && (T.forme.ne[d.i] % 2 === 1) && MesoDessin.geometrie(E.m, T.forme).atomes[d.i].slots[d.k]?.type === 'r';
    const n = radical || T.demi ? 1 : 2;
    const f = { de, vers, n, s: 0 }; if (d.t === 'p') f.k = d.k;
    const err = verifierFleche(f);
    if (err) { msg(err); T.depart = null; afficherToi(); return; }
    T.fleches.push(f); T.choisie = T.fleches.length - 1; T.depart = null; msg(''); afficherToi();
  });
  // contrôle immédiat de la géométrie d'une flèche (avant l'écriture de la formule)
  function verifierFleche(f) {
    const { de, vers } = f;
    if (de.a !== undefined) {
      if (vers.a !== undefined) return de.a === vers.a ? 'La flèche doit partir du doublet et arriver sur une liaison de cet atome.' : 'Une flèche partant d’un doublet arrive sur une liaison de l’atome qui le porte.';
      if (!vers.l.includes(de.a)) return 'Une flèche partant d’un doublet (ou d’un électron célibataire) arrive sur une liaison <b>de l’atome qui le porte</b>.';
    } else {
      if (vers.a !== undefined && !de.l.includes(vers.a)) return 'Les électrons d’une liaison ne peuvent aller que sur <b>l’un de ses deux atomes</b>, ou sur une liaison voisine.';
      if (vers.l && !vers.l.some(x => de.l.includes(x))) return 'La liaison d’arrivée doit être <b>voisine</b> de la liaison de départ (elles ont un atome en commun).';
    }
    if (f.n === 2 && de.a !== undefined && T.forme.ne[de.a] === 1) return 'Un électron célibataire se déplace avec une <b>demi-flèche</b>.';
    return null;
  }
  $('ms-inv').addEventListener('click', () => { const f = T.fleches[T.choisie ?? T.fleches.length - 1]; if (f) { f.s = f.s === -1 ? 0 : -1; afficherToi(); } });
  $('ms-suppr').addEventListener('click', () => { const i = T.choisie ?? T.fleches.length - 1; if (i >= 0 && T.fleches[i]) { T.fleches.splice(i, 1); T.choisie = null; afficherToi(); } });
  $('ms-vider').addEventListener('click', () => { T.fleches = []; T.choisie = null; T.depart = null; afficherToi(); });
  $('ms-recom').addEventListener('click', () => { T.refus = null; initToi(); });
  $('ms-solution').addEventListener('click', () => { changerMode('voir'); });
  $('ms-ecrire').addEventListener('click', () => {
    if (E.anim) return;
    T.refus = null;
    const r = Meso.appliquer(E.m, T.forme, T.fleches);
    if (r.erreur) { msg(r.erreur); afficherToi(); return; }
    const an = Meso.analyser(E.m, r.forme);
    if (an.interdite) {
      const c = Meso.classer(E.m, [r.forme])[0];
      T.refus = { forme: r.forme, raison: c.raison };
      msg('Cette formule est <b>interdite</b> : ' + esc(c.raison)); afficherToi(); return;
    }
    const deja = T.ens.findIndex(it => Meso.memeForme(it.forme, r.forme));
    const fl = T.fleches.slice(), dep = T.forme;
    if (deja >= 0) { msg('Cette formule est déjà dans ton ensemble (formule ' + (deja + 1) + ').'); T.cour = deja; T.forme = T.ens[deja].forme; T.fleches = []; afficherToi(); return; }
    const connue = E.ch.formes.some(f => Meso.memeForme(f, r.forme));
    T.ens.push({ forme: r.forme, parent: T.cour, fleches: fl });
    // petite animation du passage, puis la nouvelle formule devient la formule de travail
    E.ch.tmp = { formes: [dep, r.forme], fleches: [fl, []] };
    const sauve = E.ch; E.ch = E.ch.tmp;
    $('ms-scene').classList.add('anime');
    jouer([0], () => {
      E.ch = sauve; T.cour = T.ens.length - 1; T.forme = r.forme; T.fleches = []; T.choisie = null;
      const tous = trouvees() === sauve.formes.length;
      msg(connue ? (tous ? '🎉 Bravo : tu as écrit toutes les formules mésomères attendues ! Compare leur représentativité ci-dessous.' : 'Bonne formule mésomère. Continue à partir de celle-ci, ou clique sur une autre formule de ton ensemble.') : 'Formule valide (squelette intact, électrons conservés). Elle ne fait pas partie des formules attendues, mais elle est correcte.', true);
      afficherToi();
    });
  });

  // ───────── police ─────────
  function choisirPolice(v) { if (!POLICES[v]) v = 'arial'; police = POLICES[v]; $('ms-police').value = v; try { localStorage.setItem('fm-police', v); } catch (e) {} }
  $('ms-police').addEventListener('change', e => { choisirPolice(e.target.value); if (E.mode === 'toi') afficherToi(); else afficherVoir(); });
  try { choisirPolice(localStorage.getItem('fm-police') || 'arial'); } catch (e) { choisirPolice('arial'); }

  boutons();
  const h = (location.hash || '').slice(1);
  E.m = LISTE.find(m => m.id === h) || LISTE[0];
  choisir(E.m.id);
})();
