/* Formules des molécules — interface */
(function () {
  const $ = id => document.getElementById(id);
  const vue3d = { rx: -18, ry: 28, compact: false };
  let onglet = 'topo', G = { atomes: [], liaisons: [] };
  const meca = { fleches: [], depart: null, choisie: null, ancres: [] };
  const ed = Editeur.creer($('fm-canevas'), g => { G = g; resultats(); });

  // ── SMILES (sans stéréochimie) d'une composante, pour ouvrir l'outil Représentations spatiales ──
  function smiles(an, comp) {
    const dans = new Set(comp), vu = new Set(), fermetures = new Map(); let num = 1;
    // repérer les liaisons de cycle (arêtes retour d'un parcours en profondeur)
    const pere = new Map(), ordreVisite = [];
    (function dfs(k, p) { vu.add(k); ordreVisite.push(k); an.voisins[k].forEach(v => { if (!dans.has(v.j) || an.atomes[v.j].el === 'H') return; if (!vu.has(v.j)) { pere.set(v.j, k); dfs(v.j, k); } else if (v.j !== p && !fermetures.has(v.liaison.id)) fermetures.set(v.liaison.id, { a: k, b: v.j, o: v.ordre, n: 0 }); }); })(comp.find(k => an.atomes[k].el !== 'H'), -1);
    fermetures.forEach(f => { f.n = num++; });
    const sym = o => (o === 2 ? '=' : o === 3 ? '#' : '');
    const atome = k => { const a = an.atomes[k]; const org = ['B', 'C', 'N', 'O', 'P', 'S', 'F', 'Cl', 'Br', 'I']; if (!a.charge && org.includes(a.el)) return a.el; const h = an.H[k]; return '[' + a.el + (h ? 'H' + (h > 1 ? h : '') : '') + (a.charge ? (a.charge > 0 ? '+' : '-') + (Math.abs(a.charge) > 1 ? Math.abs(a.charge) : '') : '') + ']'; };
    const vu2 = new Set();
    function ecrire(k) {
      vu2.add(k); let s = atome(k);
      fermetures.forEach(f => { if (f.a === k || f.b === k) s += (f.a === k ? sym(f.o) : '') + (f.n > 9 ? '%' + f.n : f.n); });
      const enf = an.voisins[k].filter(v => pere.get(v.j) === k && !vu2.has(v.j));
      enf.forEach((v, i) => { const t = sym(v.ordre) + ecrire(v.j); s += i < enf.length - 1 ? '(' + t + ')' : t; });
      return s;
    }
    return ecrire(ordreVisite[0]);
  }

  function disposer(g, chaine) {        // coordonnées d'un graphe sans dessin (nom ou SMILES)
    const an = Chimie.analyser(g); let dx = 0;
    an.composantes.forEach(c => {
      const lourds = c.filter(k => an.atomes[k].el !== 'H' || an.voisins[k].length === 0);
      let ch = chaine; if (!ch) { const nm = Nomenclature.nommer(an, c); ch = nm && nm.chaine && nm.chaine.length ? nm.chaine : null; }
      const pos = Disposition.zigzag(an, lourds, ch) || new Map(lourds.map((k, i) => [k, [i * 0.87, (i % 2) * 0.5]]));
      const xs = [...pos.values()].map(p => p[0]), x0 = Math.min(...xs);
      lourds.forEach(k => { const p = pos.get(k) || [0, 0]; g.atomes[k].x = p[0] - x0 + dx; g.atomes[k].y = p[1]; });
      dx += Math.max(...xs) - x0 + 2;
    });
    g.atomes = g.atomes.filter((a, k) => a.x !== undefined);
    return g;
  }
  function construire() {
    const t = $('fm-nom').value.trim(); if (!t) return;
    $('fm-err').hidden = true;
    let g = null, chaine = null;
    const r = Nomenclature.lireNom(t);
    if (!r.erreur) g = r.graphe;
    else { try { g = Chimie.lireSmiles(t); } catch (e) { g = null; } }
    if (!g) { $('fm-err').textContent = 'Nom ou SMILES non reconnu' + (r.erreur ? ' : ' + r.erreur : '') + '.'; $('fm-err').hidden = false; return; }
    ed.charger(disposer(g, chaine));
  }

  function resultats() {
    const zone = $('fm-resultats');
    if (!G.atomes.length) { zone.innerHTML = '<p class="fm-vide">Dessine une molécule ou saisis son nom pour voir ses formules.</p>'; $('fm-infos').innerHTML = ''; return; }
    const an = Chimie.analyser(G), simpl = $('fm-simple').checked;
    $('fm-cmdmeca').hidden = onglet !== 'meca';
    const infos = [], blocs = [];
    an.composantes.forEach(c => {
      if (c.every(k => an.atomes[k].el === 'H') && c.length === 1) return;
      const nm = Nomenclature.nommer(an, c), f = Chimie.formuleBrute(an, c), M = Chimie.masseMolaire(an, c);
      let nom = nm && nm.nom ? (simpl ? Nomenclature.simplifier(nm.nom) : nm.nom) : null;
      const err = c.some(k => an.erreur[k]);
      infos.push(`<div class="fm-info"><p class="fm-nomc">${err ? '<span class="fm-alerte">Valence dépassée sur un atome (en rouge).</span>' : nom ? escH(nom) : '<span class="fm-doux">Nom non déterminé' + (nm && nm.raison ? ' (' + escH(nm.raison) + ')' : '') + '</span>'}</p><p>${f.texte.replace(/(\d+)/g, '<sub>$1</sub>')} · M = ${M.toFixed(1).replace('.', ',')} g·mol<sup>−1</sup>${nm && nm.famille ? ' · ' + escH(nm.famille) : ''}</p>${!err && c.length > 1 ? `<p><a class="fm-lien" href="stereo.html?smiles=${encodeURIComponent(smiles(an, c))}">Représentations spatiales (Cram, Newman, Fischer…) →</a></p>` : ''}</div>`);
      let s = null;
      if (onglet === 'brute') s = Rendu.brute(an, c);
      else if (onglet === 'topo') s = Rendu.topologique(an, c, nm && nm.chaine && nm.chaine.length ? nm.chaine : null);
      else if (onglet === 'semi') s = Rendu.semi(an, c);
      else if (onglet === 'dev') s = Rendu.developpee(an, c);
      else if (onglet === 'lewis') s = Rendu.developpee(an, c, { lewis: true });
      else if (onglet === '3d') s = Rendu.modele3d(an, c, vue3d);
      else if (onglet === 'meca') s = '';
      const titres = { meca: 'Mécanisme', brute: 'Formule brute', topo: 'Représentation topologique', semi: 'Formule semi-développée', dev: 'Formule développée', lewis: 'Formule de Lewis', '3d': 'Modèle moléculaire' };
      blocs.push(`<figure class="fm-fig">${s || '<p class="fm-doux">Cette représentation n’est pas disponible pour cette molécule (cycles accolés…).</p>'}<figcaption>${titres[onglet]}${nom ? ' ' + escH(Nomenclature.avecDe ? Nomenclature.avecDe(nom) : 'de ' + nom) : ''}</figcaption></figure>`);
    });
    $('fm-infos').innerHTML = infos.join('');
    if (onglet === 'meca') {
      const r = Rendu.mecanisme(G, meca.fleches, meca); meca.ancres = r.ancres;
      zone.innerHTML = `<figure class="fm-fig fm-meca${meca.depart ? ' choix-fin' : ' choix-debut'}">${r.svg}<figcaption>${meca.depart ? 'Clique maintenant sur l’atome ou la liaison où arrive le doublet (site pauvre en électrons).' : 'Clique sur un doublet non liant ou sur une liaison pour commencer une flèche courbe.'}</figcaption></figure>`;
    } else zone.innerHTML = blocs.join('');
    $('fm-cmd3d').hidden = onglet !== '3d';
  }
  const escH = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // ── mécanisme : flèches courbes (départ : doublet non liant ou liaison ; arrivée : atome ou liaison) ──
  function msg(t) { const m = $('fm-mmsg'); m.textContent = t || ''; m.hidden = !t; }
  $('fm-resultats').addEventListener('click', e => {
    if (onglet !== 'meca') return;
    const f = e.target.closest('[data-f]');
    if (f && !meca.depart) { meca.choisie = +f.dataset.f; msg(''); return resultats(); }
    const c = e.target.closest('[data-a]');
    if (!c) { meca.depart = null; meca.choisie = null; msg(''); return resultats(); }
    const a = meca.ancres[+c.dataset.a];
    if (!meca.depart) {
      if (a.type === 'atome') { msg('Une flèche courbe part d’un doublet non liant ou d’une liaison, pas d’un atome.'); return; }
      meca.depart = { type: a.type, id: a.id }; meca.choisie = null; msg(''); return resultats();
    }
    const d = meca.depart, src = meca.ancres.find(x => x.type === d.type && x.id === d.id);
    if (a.type === 'doublet') { msg('Une flèche courbe arrive sur un atome ou sur une liaison (site pauvre en électrons), pas sur un doublet.'); return; }
    if (a.type === d.type && a.id === d.id) { meca.depart = null; msg(''); return resultats(); }
    if (src && src.type === 'doublet' && a.type === 'atome' && a.id === src.atome) { msg('Le doublet appartient déjà à cet atome : choisis un autre atome ou une liaison.'); return; }
    let alerte = '';
    const at = a.type === 'atome' ? G.atomes.find(x => x.id === a.id) : null;
    if (at && at.charge < 0) alerte = 'Attention : cet atome porte une charge négative, ce n’est pas un site pauvre en électrons.';
    meca.fleches.push({ de: d, vers: { type: a.type, id: a.id }, sens: 1 });
    meca.depart = null; meca.choisie = meca.fleches.length - 1; msg(alerte); resultats();
  });
  $('fm-fl-sens').addEventListener('click', () => { const f = meca.fleches[meca.choisie]; if (f) { f.sens = -(f.sens || 1); resultats(); } });
  $('fm-fl-suppr').addEventListener('click', () => { if (meca.choisie !== null && meca.fleches[meca.choisie]) { meca.fleches.splice(meca.choisie, 1); meca.choisie = null; resultats(); } });
  $('fm-fl-vider').addEventListener('click', () => { meca.fleches = []; meca.depart = null; meca.choisie = null; msg(''); resultats(); });

  // ── commandes ──
  document.querySelectorAll('[data-outil]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-outil]').forEach(x => x.classList.remove('actif')); b.classList.add('actif');
    const v = b.dataset.val; ed.outil(b.dataset.outil, b.dataset.outil === 'liaison' ? +v : b.dataset.outil === 'cycle' ? (v === 'benzene' ? v : +v) : v);
  }));
  $('fm-ok').addEventListener('click', construire);
  $('fm-nom').addEventListener('keydown', e => { if (e.key === 'Enter') construire(); });
  $('fm-annuler').addEventListener('click', () => ed.annuler());
  $('fm-retablir').addEventListener('click', () => ed.retablir());
  $('fm-vider').addEventListener('click', () => ed.vider());
  $('fm-c').addEventListener('change', e => { ed.st.ecrireC = e.target.checked; ed.dessiner(); });
  $('fm-simple').addEventListener('change', resultats);
  document.querySelectorAll('.fm-onglets button').forEach(b => b.addEventListener('click', () => {
    onglet = b.dataset.vue; document.querySelectorAll('.fm-onglets button').forEach(x => x.classList.toggle('actif', x === b)); resultats();
  }));
  $('fm-compact').addEventListener('change', e => { vue3d.compact = e.target.checked; resultats(); });
  $('fm-depart').addEventListener('click', () => { vue3d.rx = -18; vue3d.ry = 28; resultats(); });
  // rotation du modèle 3D à la souris ou au doigt
  let rot = null;
  $('fm-resultats').addEventListener('pointerdown', e => { if (onglet !== '3d') return; rot = [e.clientX, e.clientY]; e.preventDefault(); });
  window.addEventListener('pointermove', e => { if (!rot) return; vue3d.ry += (e.clientX - rot[0]) * 0.6; vue3d.rx += (e.clientY - rot[1]) * 0.6; rot = [e.clientX, e.clientY]; resultats(); });
  window.addEventListener('pointerup', () => { rot = null; });
  // export PNG des formules affichées
  $('fm-png').addEventListener('click', () => {
    const svgs = [...$('fm-resultats').querySelectorAll('svg')]; if (!svgs.length) return;
    const s = svgs[0].cloneNode(true), vb = s.viewBox.baseVal, k = 3;
    const st = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    st.textContent = 'text{font:17px Arial,sans-serif;fill:#111}.ind{font-size:12px}line{stroke:#111;stroke-width:1.6;stroke-linecap:round}.doublet{stroke-width:2}.charge{fill:none;stroke:#111;stroke-width:1.2}.fin{stroke-width:1.2}.point{fill:#111}.baton{stroke:#888;stroke-width:6}';
    s.insertBefore(st, s.firstChild); s.setAttribute('width', vb.width * k); s.setAttribute('height', vb.height * k); s.removeAttribute('style');
    const im = new Image();
    im.onload = () => { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(im, 0, 0); const a = document.createElement('a'); a.download = 'molecule-' + onglet + '.png'; a.href = cv.toDataURL('image/png'); a.click(); };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(s));
  });
  // molécule de départ (paramètre ?nom= possible)
  const p = new URLSearchParams(location.search).get('nom');
  $('fm-nom').value = p || 'acide 2-aminopropanoïque'; construire();
})();
