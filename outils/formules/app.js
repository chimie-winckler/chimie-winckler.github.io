/* Formules des molécules — interface */
(function () {
  const $ = id => document.getElementById(id);
  const vue3d = { rx: -18, ry: 28, compact: false };
  let onglet = 'topo', G = { atomes: [], liaisons: [] };
  const meca = { depart: null, choisie: null, ancres: [], etapes: null, cur: 0, cible: 'r' };
  const etapeCour = () => meca.etapes[meca.cur];
  const ed = Editeur.creer($('fm-canevas'), g => {
    G = g;
    // hors de l'onglet Mécanisme, un nouveau dessin repart d'un mécanisme vide ; dans l'onglet, il modifie l'étape en cours
    if (onglet !== 'meca') { meca.etapes = null; meca.cur = 0; meca.depart = null; meca.choisie = null; }
    else if (meca.etapes) etapeCour()[meca.cible === 'p' ? 'P' : 'G'] = JSON.parse(JSON.stringify(g));
    resultats(); synchroNom();
  });
  // le champ du nom suit le dessin (nom IUPAC de la première molécule)
  function synchroNom() {
    if (document.activeElement === $('fm-nom') || !G.atomes.length) return;
    const an = Chimie.analyser(G), noms = an.composantes.filter(c => c.some(k => an.atomes[k].el !== 'H')).map(c => { const r = Nomenclature.nommer(an, c); return r && r.nom; });
    if (noms.length && noms.every(Boolean)) $('fm-nom').value = noms.join(' + ');
  }

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

  function disposer(g, chaine, garderH) {        // coordonnées d'un graphe sans dessin (nom ou SMILES)
    const an = Chimie.analyser(g); let dx = 0;
    an.composantes.forEach(c => {
      const lourds = c.filter(k => an.atomes[k].el !== 'H' || an.voisins[k].length === 0);
      let ch = chaine; if (!ch) { const nm = Nomenclature.nommer(an, c); ch = nm && nm.chaine && nm.chaine.length ? nm.chaine : null; }
      const pos = Disposition.zigzag(an, lourds, ch) || new Map(lourds.map((k, i) => [k, [i * 0.87, (i % 2) * 0.5]]));
      const xs = [...pos.values()].map(p => p[0]), x0 = Math.min(...xs);
      lourds.forEach(k => { const p = pos.get(k) || [0, 0]; g.atomes[k].x = p[0] - x0 + dx; g.atomes[k].y = p[1]; });
      if (garderH) c.forEach(k => { if (!lourds.includes(k)) g.atomes[k].x = undefined; });
      dx += Math.max(...xs) - x0 + 2;
    });
    if (garderH) { g.atomes.forEach(a => { if (a.x === undefined) a._h = true; }); return g; }
    g.atomes = g.atomes.filter((a, k) => a.x !== undefined);
    return g;
  }
  function construire() {
    const t = $('fm-nom').value.trim(); if (!t) return;
    $('fm-err').hidden = true;
    let g = null, chaine = null;
    const r = Nomenclature.lireNom(t);
    if (!r.erreur) g = r.graphe;
    else if (t.includes(' + ')) {          // plusieurs espèces
      const parts = t.split(' + ').map(x => { const q = Nomenclature.lireNom(x.trim()); if (!q.erreur) return q.graphe; try { return Chimie.lireSmiles(x.trim()); } catch (e) { return null; } });
      if (parts.every(Boolean)) { g = { atomes: [], liaisons: [] }; parts.forEach((q, i) => { q.atomes.forEach(a => { a.id = 'm' + i + a.id; g.atomes.push(a); }); q.liaisons.forEach(l => { l.id = 'm' + i + l.id; l.a = 'm' + i + l.a; l.b = 'm' + i + l.b; g.liaisons.push(l); }); }); }
    }
    else { try { g = Chimie.lireSmiles(t); } catch (e) { g = null; } }
    if (!g) { $('fm-err').textContent = 'Nom ou SMILES non reconnu' + (r.erreur ? ' : ' + r.erreur : '') + '.'; $('fm-err').hidden = false; return; }
    ed.charger(disposer(g, chaine));
  }

  function resultats() {
    const zone = $('fm-resultats');
    if (!G.atomes.length) { zone.innerHTML = '<p class="fm-vide">Dessine une molécule ou saisis son nom pour voir ses formules.</p>'; $('fm-infos').innerHTML = ''; return; }
    const an = Chimie.analyser(G), simpl = $('fm-simple').checked;
    $('fm-cmdmeca').hidden = onglet !== 'meca'; $('fm-cmdeq').hidden = onglet !== 'equation';
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
      else if (onglet === 'meca' || onglet === 'equation') s = '';
      const titres = { meca: 'Mécanisme', brute: 'Formule brute', topo: 'Représentation topologique', semi: 'Formule semi-développée', dev: 'Formule développée', lewis: 'Formule de Lewis', '3d': 'Modèle moléculaire' };
      blocs.push(`<figure class="fm-fig">${s || '<p class="fm-doux">Cette représentation n’est pas disponible pour cette molécule (cycles accolés…).</p>'}<figcaption>${titres[onglet]}${nom ? ' ' + escH(Nomenclature.avecDe ? Nomenclature.avecDe(nom) : 'de ' + nom) : ''}</figcaption></figure>`);
    });
    $('fm-infos').innerHTML = infos.join('');
    if (onglet === 'meca') {
      if (!meca.etapes) meca.etapes = [{ G: JSON.parse(JSON.stringify(G)), fleches: [], P: null }];
      const h = [];
      meca.etapes.forEach((e, i) => {
        const cour = i === meca.cur, rr = Rendu.mecanisme(e.G, e.fleches, cour && meca.cible === 'r' ? meca : {});
        if (cour && meca.cible === 'r') meca.ancres = rr.ancres;
        const pv = e.P && e.P.atomes.length ? Rendu.mecanisme(e.P, [], {}).svg : '<p class="fm-vide-p">Produits à écrire :<br>clique sur « Produits » ci-dessous</p>';
        const cr = cour && meca.cible === 'r', cp = cour && meca.cible === 'p';
        const aide = cr ? (meca.depart ? '② Clique sur l’atome ou la liaison où arrive le doublet (site pauvre en électrons).' : '① Clique sur un doublet non liant (trait près d’un atome) ou sur une liaison pour commencer une flèche courbe.')
          : cp ? 'Tu modifies les produits de cette étape avec la zone de dessin (ou « ＋ Ajouter » une espèce).' : 'Clique sur les réactifs ou sur les produits pour les modifier.';
        h.push(`<div class="fm-etape${cour ? ' courante' : ''}"><p class="fm-num-etape">Étape ${i + 1}</p><div class="fm-eq-ligne">
          <figure class="fm-fig fm-meca fm-cote${cr ? ' actif' + (meca.depart ? ' choix-fin' : ' choix-debut') : ''}" data-etape="${i}" data-cote="r"><span class="fm-etiq">Réactifs</span>${rr.svg}</figure>
          <div class="fm-reac">⟶</div>
          <figure class="fm-fig fm-produits fm-cote${cp ? ' actif' : ''}" data-etape="${i}" data-cote="p"><span class="fm-etiq">Produits</span>${pv}</figure>
        </div>${cour ? `<p class="fm-aide-etape">${aide}</p>` : ''}</div>`);
      });
      zone.innerHTML = '<div class="fm-etapes">' + h.join('') + '</div>';
    } else if (onglet === 'equation') zone.innerHTML = equation(an);
    else zone.innerHTML = blocs.join('');
    $('fm-cmd3d').hidden = onglet !== '3d';
  }
  const escH = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // ── mécanisme : flèches courbes (départ : doublet non liant ou liaison ; arrivée : atome ou liaison) ──
  function msg(t) { const m = $('fm-mmsg'); m.textContent = t || ''; m.hidden = !t; }
  $('fm-resultats').addEventListener('click', e => {
    if (onglet === 'equation') { const c = e.target.closest('[data-cote]'); if (c) { cotes[c.dataset.cote] = cotes[c.dataset.cote] === 'p' ? 'r' : 'p'; resultats(); } return; }
    if (onglet !== 'meca') return;
    const fig = e.target.closest('[data-etape]');
    if (fig && (+fig.dataset.etape !== meca.cur || fig.dataset.cote !== meca.cible)) { choisirEtape(+fig.dataset.etape, fig.dataset.cote); return; }
    if (meca.cible !== 'r') return;
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
    etapeCour().fleches.push({ de: d, vers: { type: a.type, id: a.id }, sens: 1 });
    meca.depart = null; meca.choisie = etapeCour().fleches.length - 1; msg(alerte); resultats();
  });
  $('fm-fl-sens').addEventListener('click', () => { const f = etapeCour().fleches[meca.choisie]; if (f) { f.sens = -(f.sens || 1); resultats(); } });
  $('fm-fl-suppr').addEventListener('click', () => { if (meca.choisie !== null && etapeCour().fleches[meca.choisie]) { etapeCour().fleches.splice(meca.choisie, 1); meca.choisie = null; resultats(); } });
  $('fm-fl-vider').addEventListener('click', () => { etapeCour().fleches = []; meca.depart = null; meca.choisie = null; msg(''); resultats(); });

  // ── ajouter une espèce (réactif, ion…) à l'étape en cours, sans effacer le reste ──
  function lireEspece(t) {
    t = t.trim(); if (!t) return null;
    const r = Nomenclature.lireNom(t); if (!r.erreur) return r.graphe;
    try { return Chimie.lireSmiles(t); } catch (e) { return null; }
  }
  function ajouterEspece(t) {
    const g0 = lireEspece(t);
    if (!g0) { msg('Espèce non reconnue : écris son nom (ion hydroxyde, eau, bromométhane…) ou son SMILES.'); return; }
    const g = disposer(g0), base = JSON.parse(JSON.stringify(G));
    const xMax = base.atomes.length ? Math.max(...base.atomes.map(a => a.x)) : -2, yMoy = base.atomes.length ? base.atomes.reduce((t, a) => t + a.y, 0) / base.atomes.length : 0;
    const gy = g.atomes.reduce((t, a) => t + a.y, 0) / g.atomes.length, pre = 'e' + Date.now().toString(36) + '_';
    g.atomes.forEach(a => { a.id = pre + a.id; a.x += xMax + 1.8; a.y += yMoy - gy; base.atomes.push(a); });
    g.liaisons.forEach(l => { l.id = pre + l.id; l.a = pre + l.a; l.b = pre + l.b; base.liaisons.push(l); });
    msg(''); ed.charger(base);
  }
  document.querySelectorAll('[data-espece]').forEach(b => b.addEventListener('click', () => ajouterEspece(b.dataset.espece)));
  $('fm-esp-ok').addEventListener('click', () => { ajouterEspece($('fm-esp').value); $('fm-esp').value = ''; });
  $('fm-esp').addEventListener('keydown', e => { if (e.key === 'Enter') { ajouterEspece($('fm-esp').value); $('fm-esp').value = ''; } });

  function choisirEtape(i, cote = 'r') {
    meca.cur = i; meca.cible = cote; meca.depart = null; meca.choisie = null; msg('');
    const e = meca.etapes[i];
    if (cote === 'p' && !e.P) e.P = JSON.parse(JSON.stringify(e.G));        // les produits partent d'une copie des réactifs
    document.querySelectorAll('[data-cible]').forEach(b => b.classList.toggle('actif', b.dataset.cible === cote));
    ed.charger(cote === 'p' ? e.P : e.G, true);
    msg('');
  }
  document.querySelectorAll('[data-cible]').forEach(b => b.addEventListener('click', () => { if (meca.etapes) choisirEtape(meca.cur, b.dataset.cible); }));
  $('fm-et-plus').addEventListener('click', () => {
    const e = etapeCour(), src = e.P && e.P.atomes.length ? e.P : e.G;
    meca.etapes.splice(meca.cur + 1, 0, { G: JSON.parse(JSON.stringify(src)), fleches: [], P: null });
    choisirEtape(meca.cur + 1, 'r'); msg('Nouvelle étape : ses réactifs sont les produits de l’étape précédente. Place les flèches courbes, puis écris les produits.');
  });
  $('fm-et-moins').addEventListener('click', () => {
    if (meca.etapes.length < 2) { meca.etapes[0].fleches = []; return resultats(); }
    meca.etapes.splice(meca.cur, 1); choisirEtape(Math.max(0, meca.cur - 1));
  });

  // ── équation de réaction ──
  const cotes = {};
  function equation(an) {
    const comps = an.composantes.filter(c => !(c.length === 1 && an.atomes[c[0]].el === 'H' && !an.atomes[c[0]].charge))
      .map(c => ({ c, x: Math.min(...c.map(k => an.atomes[k].x || 0)), cle: an.atomes[c[0]].id })).sort((a, b) => a.x - b.x);
    if (comps.length < 2) return '<p class="fm-doux">Dessine (ou construis) au moins deux espèces : les réactifs à gauche, les produits à droite. Clique sur une espèce pour la passer de réactif à produit.</p>';
    comps.forEach((o, i) => { if (!cotes[o.cle]) cotes[o.cle] = i < Math.ceil(comps.length / 2) ? 'r' : 'p'; });
    const R = comps.filter(o => cotes[o.cle] === 'r'), Pd = comps.filter(o => cotes[o.cle] === 'p');
    const res = Equation.ajuster(R.map(o => Chimie.compter(an, o.c)), Pd.map(o => Chimie.compter(an, o.c)));
    const mode = $('fm-eqmode').value, conditions = $('fm-eqcond').value.trim();
    const bloc = (o, coef) => {
      const nm = Nomenclature.nommer(an, o.c), nom = nm && nm.nom ? nm.nom : '';
      let f;
      if (mode === 'semi') f = Rendu.semi(an, o.c);
      else if (mode === 'topo') f = Rendu.topologique(an, o.c, nm && nm.chaine && nm.chaine.length ? nm.chaine : null);
      else { const fb = Chimie.formuleBrute(an, o.c); f = `<span class="fm-bru">${escH(fb.texte).replace(/(\d+)/g, '<sub>$1</sub>').replace(/([+−])$/, '<sup>$1</sup>')}</span>`; }
      return `<div class="fm-esp" data-cote="${o.cle}" title="Clique pour passer de réactif à produit"><div class="fm-esp-f">${coef > 1 ? `<span class="fm-coef">${coef}</span>` : ''}${f || ''}</div><div class="fm-esp-nom">${escH(nom)}</div></div>`;
    };
    const k = res.coefs || [];
    const g = R.map((o, i) => bloc(o, k[i] || 1)).join('<span class="fm-op">+</span>');
    const d = Pd.map((o, i) => bloc(o, k[R.length + i] || 1)).join('<span class="fm-op">+</span>');
    return `<div class="fm-equation">${g}<span class="fm-fl"><span class="fm-cond">${escH(conditions)}</span>⟶</span>${d}</div>` +
      (res.erreur ? `<p class="fm-alerte">${escH(res.erreur.charAt(0).toUpperCase() + res.erreur.slice(1))}.</p>` : '<p class="fm-doux">Équation ajustée (conservation des éléments et de la charge). Clique sur une espèce pour la passer de réactif à produit.</p>');
  }

  // ── commandes ──
  document.querySelectorAll('[data-outil]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-outil]').forEach(x => x.classList.remove('actif')); b.classList.add('actif');
    const v = b.dataset.val; ed.outil(b.dataset.outil, b.dataset.outil === 'liaison' ? +v : b.dataset.outil === 'cycle' ? (v === 'benzene' ? v : +v) : v);
  }));
  $('fm-ok').addEventListener('click', construire);
  $('fm-nom').addEventListener('keydown', e => { if (e.key === 'Enter') construire(); });
  $('fm-annuler').addEventListener('click', () => ed.annuler());
  window.addEventListener('keydown', e => { if ((e.key === 'Delete' || e.key === 'Backspace') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && ed.st.selection.size) { e.preventDefault(); ed.supprimerSelection(); } });
  // mise en forme : zigzag à 120°, chaîne principale à l'horizontale
  $('fm-forme').addEventListener('click', () => {
    if (!G.atomes.length) return;
    const g = JSON.parse(JSON.stringify(G)), an = Chimie.analyser(g);
    disposer(g, null, true);
    g.atomes.forEach((a, k) => {           // H dessinés : à côté de leur atome
      if (a.x !== undefined && !a._h) return;
      const v = an.voisins[k][0]; if (!v) { a.x = 0; a.y = 0; return; }
      const p = g.atomes[v.j], occ = an.voisins[v.j].filter(x => x.j !== k && g.atomes[x.j].x !== undefined && !g.atomes[x.j]._h).map(x => Math.atan2(g.atomes[x.j].y - p.y, g.atomes[x.j].x - p.x));
      let best = 0, sc = -1; for (let t = 0; t < 12; t++) { const an0 = t * Math.PI / 6, m = occ.length ? Math.min(...occ.map(o => Math.abs(Math.atan2(Math.sin(an0 - o), Math.cos(an0 - o))))) : 3; if (m > sc) { sc = m; best = an0; } }
      a.x = p.x + Math.cos(best); a.y = p.y + Math.sin(best); delete a._h;
    });
    ed.charger(g);
  });
  $('fm-retablir').addEventListener('click', () => ed.retablir());
  $('fm-vider').addEventListener('click', () => ed.vider());
  $('fm-c').addEventListener('change', e => { ed.st.ecrireC = e.target.checked; ed.dessiner(); });
  $('fm-simple').addEventListener('change', resultats);
  $('fm-eqmode').addEventListener('change', resultats);
  $('fm-eqcond').addEventListener('input', resultats);
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
    st.textContent = 'text{font-size:17px;font-family:' + getComputedStyle(document.querySelector('.formules')).getPropertyValue('--fm-police') + ';fill:#111}.ind{font-size:12px}line{stroke:#111;stroke-width:1.6;stroke-linecap:round}.doublet{stroke-width:2}.charge{fill:none;stroke:#111;stroke-width:1.2}.fin{stroke-width:1.2}.point{fill:#111}.baton{stroke:#888;stroke-width:6}';
    s.insertBefore(st, s.firstChild); s.setAttribute('width', vb.width * k); s.setAttribute('height', vb.height * k); s.removeAttribute('style');
    const im = new Image();
    im.onload = () => { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(im, 0, 0); const a = document.createElement('a'); a.download = 'molecule-' + onglet + '.png'; a.href = cv.toDataURL('image/png'); a.click(); };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(s));
  });
  // police des formules (mémorisée sur l'appareil)
  const POLICES = { arial: 'Arial, Helvetica, sans-serif', century: "'Century Gothic', 'URW Gothic', Questrial, sans-serif", calibri: 'Calibri, Carlito, sans-serif', verdana: 'Verdana, Geneva, sans-serif', times: "'Times New Roman', Times, serif", cambria: 'Cambria, Caladea, Georgia, serif' };
  function police(v) { if (!POLICES[v]) v = 'arial'; document.querySelector('.formules').style.setProperty('--fm-police', POLICES[v]); $('fm-police').value = v; try { localStorage.setItem('fm-police', v); } catch (e) {} }
  $('fm-police').addEventListener('change', e => { police(e.target.value); ed.dessiner(); resultats(); });
  try { police(localStorage.getItem('fm-police') || 'arial'); } catch (e) { police('arial'); }
  // molécule de départ (paramètre ?nom= possible)
  const p = new URLSearchParams(location.search).get('nom');
  $('fm-nom').value = p || 'acide 2-aminopropanoïque'; construire();
})();
