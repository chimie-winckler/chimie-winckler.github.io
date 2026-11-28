/* Schémas de montages — interface */
(function () {
  const $ = id => document.getElementById(id), V = Verrerie.pieces, M = Montage;
  const svg = $('mt-scene');
  let scene = { items: [], nb: false }, sel = null, outil = 'sel';
  const histo = [], refaire = [];
  const sauver = () => { histo.push(JSON.stringify(scene)); if (histo.length > 80) histo.shift(); refaire.length = 0; };
  const garder = () => { try { localStorage.setItem('montage-scene', JSON.stringify(scene)); } catch (e) {} };
  const trouve = id => scene.items.find(i => i.id === id);

  // ── palette ──
  function vignette(id) {
    const d = V[id], it = M.piece(id, 0, 0, { liq: d.interieur ? { niv: 0.4, coul: '#bfe3f7' } : null });
    const b = M.boite(it), w = b[2] - b[0] + 20, h = b[3] - b[1] + 20;
    return `<svg viewBox="${b[0] - 10} ${b[1] - 10} ${w} ${h}" class="mt-vign mt-dessin">${M.rendre({ items: [it] }, null)}</svg>`;
  }
  $('mt-palette').innerHTML = Verrerie.categories.map((c, i) => `<details${i < 2 ? ' open' : ''}><summary>${c}</summary><div class="mt-grille">${Object.values(V).filter(p => p.cat === c).map(p => `<button type="button" class="mt-piece" data-piece="${p.id}" title="${p.nom}">${vignette(p.id)}<span>${p.nom}</span></button>`).join('')}</div></details>`).join('');
  $('mt-modele').innerHTML = '<option value="">Partir d’un modèle…</option>' + Object.entries(Modeles.liste).map(([k, m]) => `<option value="${k}">${m.nom}</option>`).join('');

  // ── rendu ──
  function vue() {
    svg.innerHTML = `<g id="mt-contenu">${M.rendre(scene, sel)}</g>`;
    const mode = M.modeDe(scene);
    document.body.classList.toggle('mt-nb', mode === 'nb'); document.body.classList.toggle('mt-illu', mode === 'illu');
    $('mt-style').value = mode;
    proprietes(); garder();
  }
  function cadrer() {
    if (!scene.items.length) { svg.setAttribute('viewBox', '-400 -450 800 520'); return; }
    const bs = scene.items.map(M.boite), x0 = Math.min(...bs.map(b => b[0])), y0 = Math.min(...bs.map(b => b[1])), x1 = Math.max(...bs.map(b => b[2])), y1 = Math.max(...bs.map(b => b[3]));
    const m = 40, w = Math.max(400, x1 - x0 + 2 * m), h = Math.max(300, y1 - y0 + 2 * m), r = svg.clientWidth / svg.clientHeight || 1.4;
    let W = w, H = h; if (W / H < r) W = H * r; else H = W / r;
    svg.setAttribute('viewBox', `${(x0 + x1) / 2 - W / 2} ${(y0 + y1) / 2 - H / 2} ${W} ${H}`);
  }
  function pt(e) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [q.x, q.y]; }
  function centreVue() { const vb = svg.viewBox.baseVal; return [vb.x + vb.width / 2, vb.y + vb.height / 2]; }

  // ── ajout ──
  function ajouter(id, p) {
    sauver();
    const d = V[id], it = M.piece(id, ...(p || centreVue()), d.interieur ? { liq: { niv: d.id === 'cristallisoir' ? 0.6 : 0, coul: '#bfe3f7' } } : {});
    if (d.eau) it.eau = true;
    scene.items.push(it); sel = it.id; vue();
  }
  $('mt-palette').addEventListener('click', e => { const b = e.target.closest('[data-piece]'); if (b) ajouter(b.dataset.piece); });
  // glisser depuis la palette
  $('mt-palette').addEventListener('dragstart', e => { const b = e.target.closest('[data-piece]'); if (b) e.dataTransfer.setData('text/plain', b.dataset.piece); });
  svg.addEventListener('dragover', e => e.preventDefault());
  svg.addEventListener('drop', e => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (V[id]) ajouter(id, pt(e)); });

  // ── gestes ──
  let geste = null;
  svg.addEventListener('pointerdown', e => {
    const p = pt(e), g = e.target.closest('.obj'), poignee = e.target.closest('.poignee');
    if (outil === 'legende') { sauver(); const it = { id: M.nid(), t: 'legende', x1: p[0], y1: p[1], x2: p[0] + 60, y2: p[1], texte: 'légende' }; scene.items.push(it); sel = it.id; geste = { type: 'p2', it }; svg.setPointerCapture(e.pointerId); vue(); return; }
    if (outil === 'texte') { sauver(); const it = { id: M.nid(), t: 'texte', x: p[0], y: p[1], texte: 'Texte', taille: 14 }; scene.items.push(it); sel = it.id; choisirOutil('sel'); vue(); setTimeout(() => { const t = $('mt-p-texte'); if (t) { t.focus(); t.select(); } }); return; }
    if (!g) { sel = null; vue(); return; }
    const it = trouve(g.dataset.id); sel = it.id; sauver();
    if (poignee && it.t === 'legende') geste = { type: 'p' + poignee.dataset.p, it };
    else geste = { type: 'deplacer', it, p0: p, o: JSON.parse(JSON.stringify(it)), bouge: false };
    svg.setPointerCapture(e.pointerId); vue();
  });
  svg.addEventListener('pointermove', e => {
    if (!geste) return; const p = pt(e), it = geste.it;
    if (geste.type === 'p1') { it.x1 = p[0]; it.y1 = p[1]; }
    else if (geste.type === 'p2') { it.x2 = p[0]; it.y2 = p[1]; }
    else {
      const dx = p[0] - geste.p0[0], dy = p[1] - geste.p0[1], o = geste.o; if (Math.hypot(dx, dy) > 2) geste.bouge = true;
      if (it.t === 'legende') { it.x1 = o.x1 + dx; it.y1 = o.y1 + dy; it.x2 = o.x2 + dx; it.y2 = o.y2 + dy; }
      else { it.x = o.x + dx; it.y = o.y + dy; if (it.t === 'piece') accrocher(it); }
    }
    svg.querySelector('#mt-contenu').innerHTML = M.rendre(scene, sel);
  });
  svg.addEventListener('pointerup', () => { if (geste && geste.type === 'deplacer' && !geste.bouge) histo.pop(); if (geste && geste.type === 'p2' && outil === 'legende') { choisirOutil('sel'); setTimeout(() => { const t = $('mt-p-texte'); if (t) { t.focus(); t.select(); } }); } geste = null; vue(); });
  // accrochage : un rodage de la pièce déplacée vient sur le rodage le plus proche d'une autre pièce
  function accrocher(it) {
    if (!$('mt-aimant').checked) return;
    const mes = M.joints(it), autres = scene.items.filter(x => x !== it && x.t === 'piece').flatMap(M.joints);
    let best = null, d0 = 14;
    mes.forEach(a => autres.forEach(b => { const d = Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1]); if (d < d0) { d0 = d; best = [b.p[0] - a.p[0], b.p[1] - a.p[1]]; } }));
    if (best) { it.x += best[0]; it.y += best[1]; }
  }
  window.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    const it = sel && trouve(sel);
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); annuler(); return; }
    if (!it) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); supprimer(); }
    const pas = e.shiftKey ? 10 : 1, mv = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] }[e.key];
    if (mv) { e.preventDefault(); if (it.t === 'legende') { it.x1 += mv[0]; it.x2 += mv[0]; it.y1 += mv[1]; it.y2 += mv[1]; } else { it.x += mv[0]; it.y += mv[1]; } vue(); }
  });

  // ── propriétés de l'objet choisi ──
  function proprietes() {
    const it = sel && trouve(sel), z = $('mt-props');
    if (!it) { z.innerHTML = '<p class="mt-doux">Clique sur un objet pour le modifier. Glisse une pièce : ses rodages s’emboîtent tout seuls sur ceux des autres pièces.</p>'; return; }
    let h = '';
    if (it.t === 'piece') {
      const d = V[it.p];
      h += `<p class="mt-titre">${d.nom}</p>
        <div class="mt-l"><span>Rotation</span><button type="button" data-act="rot" data-v="-15">↺ 15°</button><input type="number" id="mt-p-rot" value="${Math.round(it.rot || 0)}" step="5"><button type="button" data-act="rot" data-v="15">↻ 15°</button></div>
        <div class="mt-l"><span>Taille</span><input type="range" id="mt-p-sc" min="40" max="220" value="${Math.round((it.sc || 1) * 100)}"><output>${Math.round((it.sc || 1) * 100)} %</output></div>
        <div class="mt-l"><button type="button" data-act="flip">⇋ Miroir</button><button type="button" data-act="avant">Premier plan</button><button type="button" data-act="arriere">Arrière-plan</button></div>`;
      if (d.interieur) h += `<div class="mt-l"><span>Liquide</span><input type="range" id="mt-p-niv" min="0" max="100" value="${Math.round(((it.liq && it.liq.niv) || 0) * 100)}"><input type="color" id="mt-p-coul" value="${(it.liq && it.liq.coul) || '#bfe3f7'}"></div>`;
      if (d.deuxPhases) h += `<div class="mt-l"><span>Phase du bas</span><input type="range" id="mt-p-niv2" min="0" max="100" value="${Math.round(((it.liq && it.liq.niv2) || 0) * 100)}"><input type="color" id="mt-p-coul2" value="${(it.liq && it.liq.coul2) || '#f3d27a'}"></div>`;
      if (d.interieur) h += `<label class="mt-case"><input type="checkbox" id="mt-p-sol"${it.liq && it.liq.solide ? ' checked' : ''}> Solide au fond</label>`;
      if (d.eau) h += `<label class="mt-case"><input type="checkbox" id="mt-p-eau"${it.eau ? ' checked' : ''}> Entrée et sortie d’eau</label>`;
      if (it.p === 'pince' || it.p === 'support_ampoule') h += `<div class="mt-l"><span>Bras</span><input type="range" id="mt-p-bras" min="10" max="200" value="${it.bras || (it.p === 'pince' ? 44 : 60)}"></div>`;
      if (it.p === 'support_ampoule') h += `<div class="mt-l"><span>Ouverture</span><input type="range" id="mt-p-ouv" min="15" max="70" value="${it.ouv || 26}"></div>`;
      if (it.p === 'potence') h += `<div class="mt-l"><span>Hauteur</span><input type="range" id="mt-p-h" min="150" max="800" value="${it.h || 420}"></div>`;
    } else {
      h += `<p class="mt-titre">${it.t === 'legende' ? 'Légende' : 'Texte'}</p><div class="mt-l"><input type="text" id="mt-p-texte" value="${String(it.texte).replace(/"/g, '&quot;')}"></div>`;
      if (it.t === 'texte') h += `<div class="mt-l"><span>Taille</span><input type="range" id="mt-p-tt" min="10" max="36" value="${it.taille || 14}"></div>`;
    }
    h += '<div class="mt-l"><button type="button" data-act="dup">Dupliquer</button><button type="button" data-act="suppr" class="mt-danger">Supprimer</button></div>';
    z.innerHTML = h;
    const lier = (id, f, ev = 'input') => { const x = $(id); if (x) x.addEventListener(ev, () => { f(x); svg.querySelector('#mt-contenu').innerHTML = M.rendre(scene, sel); garder(); }); };
    lier('mt-p-rot', x => { it.rot = +x.value || 0; });
    lier('mt-p-sc', x => { it.sc = x.value / 100; x.nextElementSibling.textContent = x.value + ' %'; });
    lier('mt-p-niv', x => { it.liq = Object.assign(it.liq || {}, { niv: x.value / 100 }); });
    lier('mt-p-coul', x => { it.liq = Object.assign(it.liq || {}, { coul: x.value }); });
    lier('mt-p-niv2', x => { it.liq = Object.assign(it.liq || {}, { niv2: x.value / 100 }); });
    lier('mt-p-coul2', x => { it.liq = Object.assign(it.liq || {}, { coul2: x.value }); });
    lier('mt-p-sol', x => { it.liq = Object.assign(it.liq || { niv: 0 }, { solide: x.checked }); }, 'change');
    lier('mt-p-eau', x => { it.eau = x.checked; }, 'change');
    lier('mt-p-texte', x => { it.texte = x.value; });
    lier('mt-p-bras', x => { it.bras = +x.value; });
    lier('mt-p-ouv', x => { it.ouv = +x.value; });
    lier('mt-p-h', x => { it.h = +x.value; });
    lier('mt-p-tt', x => { it.taille = +x.value; });
    ['mt-p-rot', 'mt-p-sc', 'mt-p-niv', 'mt-p-niv2', 'mt-p-texte'].forEach(id => { const x = $(id); if (x) x.addEventListener('focus', sauver, { once: true }); });
  }
  $('mt-props').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return; const it = trouve(sel); if (!it) return; sauver();
    const a = b.dataset.act;
    if (a === 'rot') it.rot = ((it.rot || 0) + +b.dataset.v) % 360;
    if (a === 'flip') it.flip = !it.flip;
    if (a === 'avant') { scene.items = scene.items.filter(x => x !== it).concat([it]); }
    if (a === 'arriere') { scene.items = [it].concat(scene.items.filter(x => x !== it)); }
    if (a === 'dup') { const c = JSON.parse(JSON.stringify(it)); c.id = M.nid(); if (c.t === 'legende') { c.y1 += 24; c.y2 += 24; } else { c.x += 30; c.y += 30; } scene.items.push(c); sel = c.id; }
    if (a === 'suppr') return supprimer(true);
    vue();
  });
  function supprimer(dejaSauve) { if (!sel) return; if (!dejaSauve) sauver(); scene.items = scene.items.filter(x => x.id !== sel); sel = null; vue(); }
  function annuler() { if (!histo.length) return; refaire.push(JSON.stringify(scene)); scene = JSON.parse(histo.pop()); sel = null; vue(); }
  function retablir() { if (!refaire.length) return; histo.push(JSON.stringify(scene)); scene = JSON.parse(refaire.pop()); sel = null; vue(); }

  // ── barre d'outils ──
  function choisirOutil(o) { outil = o; document.querySelectorAll('[data-outil]').forEach(b => b.classList.toggle('actif', b.dataset.outil === o)); svg.dataset.outil = o; }
  document.querySelectorAll('[data-outil]').forEach(b => b.addEventListener('click', () => choisirOutil(b.dataset.outil)));
  $('mt-annuler').addEventListener('click', annuler); $('mt-retablir').addEventListener('click', retablir);
  $('mt-vider').addEventListener('click', () => { sauver(); scene.items = []; sel = null; vue(); cadrer(); });
  $('mt-cadrer').addEventListener('click', cadrer);
  $('mt-style').addEventListener('change', e => { scene.style = e.target.value; scene.nb = scene.style === 'nb'; vue(); });
  $('mt-modele').addEventListener('change', e => {
    const m = Modeles.liste[e.target.value]; if (!m) return;
    sauver(); scene.items = m.f(); if (m.style && !scene.style) scene.style = m.style; sel = null; vue(); cadrer(); e.target.value = '';
  });
  // ── export ──
  function svgExport() {
    const c = svg.cloneNode(true); c.querySelectorAll('.poignee').forEach(x => x.remove()); c.querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
    const st = document.createElementNS('http://www.w3.org/2000/svg', 'style'); st.textContent = window.MONTAGE_STYLE(M.modeDe(scene)); c.insertBefore(st, c.firstChild);
    const bs = scene.items.map(M.boite), x0 = Math.min(...bs.map(b => b[0])) - 30, y0 = Math.min(...bs.map(b => b[1])) - 30, x1 = Math.max(...bs.map(b => b[2])) + 30, y1 = Math.max(...bs.map(b => b[3])) + 30;
    c.setAttribute('viewBox', `${x0} ${y0} ${x1 - x0} ${y1 - y0}`); c.setAttribute('width', (x1 - x0) * 2); c.setAttribute('height', (y1 - y0) * 2);
    return new XMLSerializer().serializeToString(c);
  }
  const telecharger = (url, nom) => { const a = document.createElement('a'); a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); };
  $('mt-png').addEventListener('click', () => {
    if (!scene.items.length) return; const s = svgExport(), im = new Image();
    im.onload = () => { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(im, 0, 0); telecharger(cv.toDataURL('image/png'), 'montage.png'); };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  });
  $('mt-svg').addEventListener('click', () => { if (scene.items.length) telecharger(URL.createObjectURL(new Blob([svgExport()], { type: 'image/svg+xml' })), 'montage.svg'); });
  $('mt-json').addEventListener('click', () => telecharger(URL.createObjectURL(new Blob([JSON.stringify(scene)], { type: 'application/json' })), 'montage.json'));
  $('mt-ouvrir').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { try { const s = JSON.parse(r.result); if (!Array.isArray(s.items)) throw 0; sauver(); scene = s; sel = null; vue(); cadrer(); } catch (err) { alert('Fichier de montage illisible.'); } };
    r.readAsText(f); e.target.value = '';
  });
  // ── démarrage : dernière session ou modèle reflux ──
  try { const s = JSON.parse(localStorage.getItem('montage-scene') || 'null'); if (s && s.items && s.items.length) scene = s; } catch (e) {}
  if (!scene.items.length) scene.items = Modeles.liste.reflux.f();
  choisirOutil('sel'); vue(); cadrer();
  new ResizeObserver(cadrer).observe(svg);
})();
