/* Formules des molécules — dessins SVG des représentations (brute, semi-développée, développée, Lewis, topologique, 3D) */
const Rendu = (() => {
  const RAD = Math.PI / 180;
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  // texte chimique : chiffres en indice, charges en exposant
  function tx(x, y, t, opt = {}) {
    const parts = String(t).split(/(\d+|[⁺⁻]|\^[+−-]\d*)/).filter(Boolean).map(p => {
      if (/^\d+$/.test(p)) return `<tspan class="ind" baseline-shift="sub">${p}</tspan>`;
      if (/^\^/.test(p)) return `<tspan class="ind" baseline-shift="super">${esc(p.slice(1))}</tspan>`;
      return esc(p);
    }).join('');
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${opt.anc || 'middle'}" dominant-baseline="central"${opt.cls ? ` class="${opt.cls}"` : ''}${opt.k !== undefined ? ` data-k="${opt.k}"` : ''}>${parts}</text>`;
  }
  const larg = t => String(t).replace(/\^.*$/, '').replace(/\d/g, '').length * 9.4 + (String(t).match(/\d/g) || []).length * 6;
  const L = (a, b, cls) => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"${cls ? ` class="${cls}"` : ''}/>`;
  function rayon(t, dx, dy) {
    if (!t) return 0; const w = larg(t) / 2 + 3, h = 10, n = Math.hypot(dx, dy) || 1;
    return Math.min(Math.abs(w * n / (dx || 1e-9)), Math.abs(h * n / (dy || 1e-9)));
  }
  function raccourcir(a, b, ra, rb) {
    const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1;
    return [[a[0] + dx / n * ra, a[1] + dy / n * ra], [b[0] - dx / n * rb, b[1] - dy / n * rb]];
  }
  // liaison simple / double / triple entre deux points (déjà raccourcis) ; cote : décalage d'un seul côté (topologique)
  function liaison(a, b, ordre, cote) {
    if (ordre === 1) return L(a, b);
    const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1, nx = -dy / n, ny = dx / n;
    if (ordre === 2) {
      if (cote) {   // second trait à l'intérieur, raccourci
        const e = 6 * cote, r = 0.14;
        return L(a, b) + L([a[0] + dx * r + nx * e, a[1] + dy * r + ny * e], [b[0] - dx * r + nx * e, b[1] - dy * r + ny * e]);
      }
      return L([a[0] + nx * 3, a[1] + ny * 3], [b[0] + nx * 3, b[1] + ny * 3]) + L([a[0] - nx * 3, a[1] - ny * 3], [b[0] - nx * 3, b[1] - ny * 3]);
    }
    return L(a, b) + L([a[0] + nx * 4.5, a[1] + ny * 4.5], [b[0] + nx * 4.5, b[1] + ny * 4.5]) + L([a[0] - nx * 4.5, a[1] - ny * 4.5], [b[0] - nx * 4.5, b[1] - ny * 4.5]);
  }
  function svg(contenu, pts, titre, pad = 22, zoom = 1.15) {
    if (!pts.length) pts = [[0, 0]];
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, w = Math.max(...xs) - x0 + pad, h = Math.max(...ys) - y0 + pad;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="fm-svg" viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" style="max-width:${Math.round(w * zoom)}px" role="img" aria-label="${esc(titre)}">${contenu}</svg>`;
  }
  const hTexte = n => (n ? 'H' + (n > 1 ? n : '') : '');
  const chargeTexte = q => (!q ? '' : '^' + (Math.abs(q) > 1 ? Math.abs(q) : '') + (q > 0 ? '+' : '−'));

  // étiquette d'un atome lourd avec ses H (H à droite, ou à gauche si les liaisons partent vers la droite)
  function etiquette(an, k, gauche, toujoursC) {
    const a = an.atomes[k], h = an.H[k];
    if (a.el === 'C' && !toujoursC) return '';
    const hs = hTexte(h);
    return (gauche ? hs + a.el : a.el + hs) + chargeTexte(a.charge);
  }
  const versDroite = (an, k, P) => { const p = P(k); const v = an.voisins[k].map(x => P(x.j)).filter(Boolean); return v.length && v.every(q => q[0] > p[0] + 0.01); };

  function angleCharge(occ) {
    let best = -45, score = -1;
    for (let a = -180; a < 180; a += 15) {
      const m = occ.length ? Math.min(...occ.map(o => Math.abs(((a - o + 540) % 360) - 180))) : 180;
      const sc = m + (a > -90 && a < 0 ? 8 : 0);
      if (sc > score) { score = sc; best = a; }
    }
    return best;
  }
  // directions des doublets non liants, réparties symétriquement autour des liaisons
  function directionsDoublets(occ, n) {
    if (!n) return [];
    const nm = a => ((a % 360) + 540) % 360 - 180;
    if (!occ.length) return [0, 180, -90, 90].slice(0, n);
    if (occ.length === 1) {
      const b = occ[0];
      if (n === 1) return [nm(b + 180)];
      if (n === 2) return [nm(b + 90), nm(b - 90)];
      return [nm(b + 180), nm(b + 90), nm(b - 90), nm(b)].slice(0, n);
    }
    if (occ.length === 2 && Math.abs(Math.abs(nm(occ[0] - occ[1])) - 180) < 10) {   // liaisons opposées
      const b = occ[0]; return [nm(b + 90), nm(b - 90), nm(b + 45), nm(b - 135)].slice(0, n);
    }
    // plus grand secteur libre : directions centrées sur sa bissectrice
    const t = occ.map(x => (x + 360) % 360).sort((x, y) => x - y);
    let deb = 0, larg = -1; t.forEach((x, i) => { const y = i + 1 < t.length ? t[i + 1] : t[0] + 360; if (y - x > larg) { larg = y - x; deb = x; } });
    const m = deb + larg / 2, pas = Math.min(90, larg / (n + 0.6));
    return [...Array(n)].map((_, i) => nm(m + (i - (n - 1) / 2) * pas));
  }
  // ───────── formule brute ─────────
  function brute(an, comp) {
    const f = Chimie.formuleBrute(an, comp);
    let t = '';
    f.parties.forEach(([e, n]) => { t += esc(e) + (n > 1 ? `<tspan class="ind" baseline-shift="sub">${n}</tspan>` : ''); });
    if (f.charge) t += `<tspan class="ind" baseline-shift="super">${esc(Chimie.texteCharge(f.charge))}</tspan>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="fm-svg fm-brute" viewBox="0 0 ${Math.max(120, larg(f.texte) * 2.1 + 30)} 70"><text x="50%" y="38" text-anchor="middle" dominant-baseline="central">${t}</text></svg>`;
  }

  // ───────── topologique ─────────
  function topologique(an, comp, chaine, opt = {}) {
    const lourds = comp.filter(k => !(an.atomes[k].el === 'H' && an.voisins[k].length === 1 && an.atomes[an.voisins[k][0].j].el === 'C'));
    const pos = Disposition.zigzag(an, lourds, chaine);
    if (!pos) return null;
    const U = opt.U || 44, P = k => { const p = pos.get(k); return p ? [p[0] * U, p[1] * U] : null; };
    const lab = new Map(), out = [], pts = [];
    lourds.forEach(k => {
      const a = an.atomes[k], nv = an.voisins[k].filter(v => lourds.includes(v.j)).length;
      let t = '';
      if (a.el !== 'C' || a.charge || nv === 0) t = etiquette(an, k, versDroite(an, k, P), true);
      lab.set(k, t);
    });
    const vu = new Set();
    lourds.forEach(k => an.voisins[k].forEach(v => {
      if (!lourds.includes(v.j)) return;
      const id = v.liaison.id; if (vu.has(id)) return; vu.add(id);
      const p = P(k), q = P(v.j);
      const [a, b] = raccourcir(p, q, rayon(lab.get(k), q[0] - p[0], q[1] - p[1]), rayon(lab.get(v.j), p[0] - q[0], p[1] - q[1]));
      let cote = 0;
      if (v.ordre === 2 && !lab.get(k) && !lab.get(v.j)) {
        // côté du second trait : vers les autres voisins (intérieur du zigzag ou du cycle)
        const autres = an.voisins[k].concat(an.voisins[v.j]).filter(x => x.j !== k && x.j !== v.j && lourds.includes(x.j)).map(x => P(x.j));
        const dx = q[0] - p[0], dy = q[1] - p[1], n = Math.hypot(dx, dy), nx = -dy / n, ny = dx / n;
        const s = autres.reduce((t, r) => t + ((r[0] - p[0]) * nx + (r[1] - p[1]) * ny), 0);
        cote = s >= 0 ? 1 : -1;
      }
      out.push(liaison(a, b, v.ordre, cote));
    }));
    lourds.forEach(k => { const p = P(k); pts.push(p); const t = lab.get(k); if (t) { out.push(tx(p[0], p[1], t, { k })); pts.push([p[0] - larg(t) / 2, p[1] - 10], [p[0] + larg(t) / 2, p[1] + 10]); } });
    return svg(`<g class="fm-l">${out.filter(s => s.startsWith('<line')).join('')}</g>${out.filter(s => !s.startsWith('<line')).join('')}`, pts, 'Représentation topologique');
  }

  // ───────── développée / Lewis / semi-développée (disposition en croix) ─────────
  function croix(an, comp) {
    const lourds = comp.filter(k => an.atomes[k].el !== 'H' || !an.voisins[k].some(v => an.atomes[v.j].el !== 'H'));
    const nH = new Map(lourds.map(k => [k, an.H[k] + an.voisins[k].filter(v => an.atomes[v.j].el === 'H' && !lourds.includes(v.j)).length]));
    const r = Disposition.croix(an, lourds, nH, { horizontal: true });
    return r ? { r, lourds, nH } : null;
  }
  function developpee(an, comp, opt = {}) {
    const c = croix(an, comp); if (!c) return null;
    const { r, lourds } = c, U = opt.U || 58, P = k => { const p = r.pos.get(k); return [p[0] * U, p[1] * U]; };
    const lewis = !!opt.lewis, out = [], pts = [], liens = [];
    const vu = new Set();
    lourds.forEach(k => an.voisins[k].forEach(v => {
      if (!lourds.includes(v.j)) return;
      const id = v.liaison.id; if (vu.has(id)) return; vu.add(id);
      const p = P(k), q = P(v.j), [a, b] = raccourcir(p, q, 11, 11);
      out.push(liaison(a, b, v.ordre));
    }));
    lourds.forEach(k => {
      const p = P(k), a = an.atomes[k], occ = [];
      an.voisins[k].forEach(v => { if (lourds.includes(v.j)) { const q = P(v.j); occ.push(Math.atan2(q[1] - p[1], q[0] - p[0]) / RAD); } });
      (r.h.get(k) || []).forEach(hq => {
        const q = [hq[0] * U, hq[1] * U], [s, e] = raccourcir(p, q, 11, 9);
        out.push(L(s, e)); out.push(tx(q[0], q[1], 'H')); pts.push(q);
        occ.push(Math.atan2(q[1] - p[1], q[0] - p[0]) / RAD);
      });
      out.push(tx(p[0], p[1], a.el, { k })); pts.push(p);
      if (lewis) {
        const d = an.doublets[k];
        const angs = directionsDoublets(occ, d.paires + d.seul);
        angs.slice(0, d.paires).forEach(an0 => {
          const ux = Math.cos(an0 * RAD), uy = Math.sin(an0 * RAD), c0 = [p[0] + ux * 14, p[1] + uy * 14];
          out.push(L([c0[0] - uy * 6, c0[1] + ux * 6], [c0[0] + uy * 6, c0[1] - ux * 6], 'doublet'));
          pts.push(c0);
        });
        if (d.seul) { const an0 = angs[d.paires] || 0; out.push(`<circle class="point" cx="${p[0] + Math.cos(an0 * RAD) * 14}" cy="${p[1] + Math.sin(an0 * RAD) * 14}" r="2.2"/>`); }
        if (a.charge) {
          const an0 = angleCharge(occ.concat(angs.slice(0, d.paires + d.seul)));
          const cx = p[0] + Math.cos(an0 * RAD) * 21, cy = p[1] + Math.sin(an0 * RAD) * 21;
          out.push(`<circle class="charge" cx="${cx}" cy="${cy}" r="6.5"/>`, L([cx - 3.5, cy], [cx + 3.5, cy], 'fin'));
          if (a.charge > 0) out.push(L([cx, cy - 3.5], [cx, cy + 3.5], 'fin'));
          pts.push([cx, cy]);
        }
      } else if (a.charge) { out.push(tx(p[0] + 9, p[1] - 9, chargeTexte(a.charge).replace('^', ''), { cls: 'exp' })); }
    });
    return svg(`<g class="fm-l">${out.filter(s => s.startsWith('<line')).join('')}</g>${out.filter(s => !s.startsWith('<line')).join('')}`, pts, lewis ? 'Formule de Lewis' : 'Formule développée');
  }
  function semi(an, comp, opt = {}) {
    const c = croix(an, comp); if (!c) return null;
    const { r, lourds, nH } = c, U = opt.U || 64, P = k => { const p = r.pos.get(k); return [p[0] * U, p[1] * U]; };
    const out = [], pts = [], lab = new Map();
    lourds.forEach(k => {
      const a = an.atomes[k], h = nH.get(k);
      const gauche = versDroite(an, k, P) && an.voisins[k].filter(v => lourds.includes(v.j)).length === 1;
      lab.set(k, (gauche ? hTexte(h) + a.el : a.el + hTexte(h)) + chargeTexte(a.charge));
    });
    if (lourds.length === 1) { const f = Chimie.formuleBrute(an, comp); lab.set(lourds[0], f.texte.replace(/([+−])$/, m => '^' + m)); }
    const vu = new Set();
    lourds.forEach(k => an.voisins[k].forEach(v => {
      if (!lourds.includes(v.j)) return;
      const id = v.liaison.id; if (vu.has(id)) return; vu.add(id);
      const p = P(k), q = P(v.j);
      const [a, b] = raccourcir(p, q, rayon(lab.get(k), q[0] - p[0], q[1] - p[1]) + 2, rayon(lab.get(v.j), p[0] - q[0], p[1] - q[1]) + 2);
      out.push(liaison(a, b, v.ordre));
    }));
    lourds.forEach(k => { const p = P(k), t = lab.get(k); out.push(tx(p[0], p[1], t, { k })); pts.push([p[0] - larg(t) / 2, p[1] - 10], [p[0] + larg(t) / 2, p[1] + 10]); });
    return svg(`<g class="fm-l">${out.filter(s => s.startsWith('<line')).join('')}</g>${out.filter(s => !s.startsWith('<line')).join('')}`, pts, 'Formule semi-développée');
  }

  // ───────── modèle 3D (boules et bâtons, ou compact) ─────────
  const COUL = { H: '#f4f4f4', C: '#3a3a3a', N: '#3050f8', O: '#e8202a', F: '#78d64a', Cl: '#1fbf1f', Br: '#a52a2a', I: '#7b2fbf', S: '#f2d22e', P: '#ff8000', B: '#ffb5b5', Si: '#d8b090' };
  const RAY = { H: 0.30, C: 0.42, N: 0.40, O: 0.40, F: 0.38, Cl: 0.50, Br: 0.56, I: 0.62, S: 0.52, P: 0.52 };
  function modele3d(an, comp, vue = {}) {
    const g = Geometrie3D.calculer(an, comp);
    if (!g || !g.ok) return null;
    const ry = (vue.ry || 0) * RAD, rx = (vue.rx || 0) * RAD, compact = !!vue.compact, U = 62;
    const tr = p => { let [x, y, z] = p; const x1 = x * Math.cos(ry) + z * Math.sin(ry), z1 = -x * Math.sin(ry) + z * Math.cos(ry); const y2 = y * Math.cos(rx) - z1 * Math.sin(rx), z2 = y * Math.sin(rx) + z1 * Math.cos(rx); return [x1 * U, -y2 * U, z2]; };
    const Q = g.atomes.map(a => tr(a.p));
    const items = [];
    if (!compact) g.liaisons.forEach(l => { const a = Q[l.a], b = Q[l.b]; items.push({ z: (a[2] + b[2]) / 2 - 0.01, s: `<line class="baton" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"/>` }); });
    const defs = new Set();
    g.atomes.forEach((a, i) => {
      const r = (compact ? (Geometrie3D.RVDW[a.el] || 1.6) * 0.62 : (RAY[a.el] || 0.45)) * U * 0.62, q = Q[i];
      defs.add(a.el);
      items.push({ z: q[2], s: `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${r.toFixed(1)}" fill="url(#b-${a.el})" stroke="rgba(0,0,0,.35)" stroke-width="0.8"/>`, r, q });
    });
    items.sort((a, b) => a.z - b.z);
    const grad = [...defs].map(e => `<radialGradient id="b-${e}" cx="35%" cy="32%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset=".18" stop-color="${COUL[e] || '#999'}"/><stop offset="1" stop-color="${COUL[e] || '#999'}" stop-opacity=".9"/></radialGradient>`).join('');
    const pts = []; items.forEach(it => { if (it.q) pts.push([it.q[0] - it.r, it.q[1] - it.r], [it.q[0] + it.r, it.q[1] + it.r]); });
    return svg(`<defs>${grad}</defs>${items.map(i => i.s).join('')}`, pts, 'Modèle moléculaire', 12);
  }

  // ───────── mécanisme : semi-développée avec doublets (H des hétéroatomes écrits), ancres pour les flèches ─────────
  function explicite(G) {              // ajoute les H des hétéroatomes comme atomes
    const g = JSON.parse(JSON.stringify(G)), an = Chimie.analyser(g);
    g.atomes.forEach((a, i) => { a.src = a.id; });
    an.atomes.forEach((a, i) => {
      if (a.el === 'C' || a.el === 'H') return;
      for (let q = 0; q < an.H[i]; q++) { const h = { id: a.id + '_h' + q, el: 'H', charge: 0, hDe: a.id }; g.atomes.push(h); g.liaisons.push({ id: a.id + '_hl' + q, a: a.id, b: h.id, ordre: 1, hDe: a.id }); }
    });
    return g;
  }
  function mecanisme(G, fleches, etat = {}) {
    const g = explicite(G), an = Chimie.analyser(g), U = 62;
    const out = [], pts = [], ancres = [], txt = [];
    let dx = 0;
    const comps = an.composantes.filter(c => !(c.length === 1 && an.atomes[c[0]].el === 'H' && !an.atomes[c[0]].charge && !an.atomes[c[0]].hDe));
    comps.forEach((c, ci) => {
      const lourds = c.filter(k => an.atomes[k].el !== 'H' || !an.voisins[k].some(v => an.atomes[v.j].el === 'C'));
      const r = Disposition.croix(an, lourds, new Map(lourds.map(k => [k, an.atomes[k].el === 'C' ? an.H[k] : 0])), { horizontal: true });
      if (!r) return;
      const xs = lourds.map(k => r.pos.get(k)[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
      if (ci) { txt.push(tx(dx - U * 0.55, 0, '+', { cls: 'plus' })); }
      // espèce placée à gauche d'une autre : son atome réactif (chargé, ou portant le plus de doublets) tourné vers la droite
      // ion (atome chargé) : on le tourne vers l'espèce voisine (à droite s'il est avant, à gauche s'il est après)
      let miroir = false;
      if (x1 > x0 && comps.length > 1) {
        const reac = lourds.find(k => an.atomes[k].charge && an.atomes[k].el !== 'C');
        if (reac !== undefined) { const gauche = r.pos.get(reac)[0] < (x0 + x1) / 2; miroir = ci < comps.length - 1 ? gauche : !gauche; }
      }
      const P = k => { const p = r.pos.get(k); return [((miroir ? x0 + x1 - p[0] : p[0]) - x0) * U + dx, p[1] * U]; };
      const lab = new Map();
      lourds.forEach(k => { const a = an.atomes[k]; lab.set(k, a.el === 'C' ? 'C' + hTexte(an.H[k]) : a.el); });
      const vu = new Set();
      lourds.forEach(k => an.voisins[k].forEach(v => {
        if (!lourds.includes(v.j)) return; const id = v.liaison.id; if (vu.has(id)) return; vu.add(id);
        const p = P(k), q = P(v.j);
        const [a, b] = raccourcir(p, q, rayon(lab.get(k), q[0] - p[0], q[1] - p[1]) + 1, rayon(lab.get(v.j), p[0] - q[0], p[1] - q[1]) + 1);
        out.push(liaison(a, b, v.ordre));
        ancres.push({ type: 'liaison', id, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, a: an.atomes[k].src || an.atomes[k].id, b: an.atomes[v.j].src || an.atomes[v.j].id, ordre: v.ordre });
      }));
      lourds.forEach(k => {
        const p = P(k), a = an.atomes[k], t = lab.get(k);
        txt.push(tx(p[0], p[1], t)); pts.push([p[0] - larg(t) / 2 - 4, p[1] - 14], [p[0] + larg(t) / 2 + 4, p[1] + 14]);
        ancres.push({ type: 'atome', id: a.src || a.id, x: p[0], y: p[1], r: Math.max(10, larg(t) / 2 + 2), el: a.el });
        if (a.el === 'C' || a.el === 'H') {
          if (a.charge) { const cx = p[0] + larg(t) / 2 + 6, cy = p[1] - 12; txt.push(`<circle class="charge" cx="${cx}" cy="${cy}" r="6.5"/>`, L([cx - 3.5, cy], [cx + 3.5, cy], 'fin')); if (a.charge > 0) txt.push(L([cx, cy - 3.5], [cx, cy + 3.5], 'fin')); }
          return;
        }
        const occ = an.voisins[k].filter(v => lourds.includes(v.j)).map(v => { const q = P(v.j); return Math.atan2(q[1] - p[1], q[0] - p[0]) / RAD; });
        const d = an.doublets[k], angs = directionsDoublets(occ, d.paires);
        const angCharge = a.charge ? angleCharge(occ.concat(angs)) : null;
        let n = 0;
        angs.forEach(an0 => {
          if (an0 === angCharge) return; if (n >= d.paires) return;
          const ux = Math.cos(an0 * RAD), uy = Math.sin(an0 * RAD), dd = rayon(t, ux, uy) + 4, c0 = [p[0] + ux * dd, p[1] + uy * dd];
          out.push(L([c0[0] - uy * 6, c0[1] + ux * 6], [c0[0] + uy * 6, c0[1] - ux * 6], 'doublet'));
          ancres.push({ type: 'doublet', id: (a.src || a.id) + ':' + n, atome: a.src || a.id, x: c0[0], y: c0[1] });
          pts.push(c0); n++;
        });
        if (a.charge) {
          const dc = rayon(t, Math.cos(angCharge * RAD), Math.sin(angCharge * RAD)) + 10, cx = p[0] + Math.cos(angCharge * RAD) * dc, cy = p[1] + Math.sin(angCharge * RAD) * dc;
          txt.push(`<circle class="charge" cx="${cx}" cy="${cy}" r="6.5"/>`, L([cx - 3.5, cy], [cx + 3.5, cy], 'fin')); if (a.charge > 0) txt.push(L([cx, cy - 3.5], [cx, cy + 3.5], 'fin'));
        }
      });
      dx += (x1 - x0) * U + U * 1.25;
    });
    // flèches courbes
    const A = id => ancres.find(x => x.id === id && x.type !== 'atome') || ancres.find(x => x.id === id);
    const fl = [];
    (fleches || []).forEach((f, i) => {
      const s = ancres.find(x => x.type === f.de.type && x.id === f.de.id), e = ancres.find(x => x.type === f.vers.type && x.id === f.vers.id);
      if (!s || !e) return;
      let ex = e.x, ey = e.y;
      const dx0 = ex - s.x, dy0 = ey - s.y, n = Math.hypot(dx0, dy0) || 1;
      if (e.type === 'atome') { ex -= dx0 / n * (e.r + 3); ey -= dy0 / n * (e.r + 3); }
      const sens = f.sens || 1, k = Math.min(60, Math.max(13, n * 0.42)) * sens;
      const cx = (s.x + ex) / 2 - dy0 / n * k, cy = (s.y + ey) / 2 + dx0 / n * k;
      // pointe : tangente en fin de courbe
      const tx0 = ex - cx, ty0 = ey - cy, tn = Math.hypot(tx0, ty0) || 1, ux = tx0 / tn, uy = ty0 / tn;
      const p1 = [ex - ux * 9 - uy * 4.5, ey - uy * 9 + ux * 4.5], p2 = [ex - ux * 9 + uy * 4.5, ey - uy * 9 - ux * 4.5];
      fl.push(`<g class="fleche${etat.choisie === i ? ' sel' : ''}" data-f="${i}"><path class="fl-zone" d="M${s.x.toFixed(1)},${s.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}"/><path d="M${s.x.toFixed(1)},${s.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${(ex - ux * 6).toFixed(1)},${(ey - uy * 6).toFixed(1)}"/><polygon points="${ex.toFixed(1)},${ey.toFixed(1)} ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}"/></g>`);
      pts.push([cx, cy]);
    });
    // départ en cours : point d'origine marqué
    let marques = '';
    if (etat.depart) { const s = ancres.find(x => x.type === etat.depart.type && x.id === etat.depart.id); if (s) marques = `<circle class="depart" cx="${s.x}" cy="${s.y}" r="7"/>`; }
    const cibles = ancres.map((a, i) => `<circle class="cible c-${a.type}" cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="${a.type === 'atome' ? a.r : a.type === 'doublet' ? 7 : 8}" data-a="${i}"/>`).join('');
    const svgTxt = svg(`<g class="fm-l">${out.join('')}</g>${txt.join('')}${fl.join('')}${marques}<g class="cibles">${cibles}</g>`, pts, 'Mécanisme', 30, 1.7);
    return { svg: svgTxt, ancres };
  }

  return { brute, topologique, developpee, semi, modele3d, mecanisme, tx, larg };
})();
