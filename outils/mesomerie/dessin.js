/* Mésomérie — dessin SVG des formules de Lewis, des flèches de délocalisation et des transitions animées
   Le SVG produit porte ses propres attributs (couleur, police) : il s'affiche et s'exporte en vidéo à l'identique. */
const MesoDessin = (() => {
  const U = 54, RAD = Math.PI / 180, BLEU = '#1565c0';
  const f1 = v => (+v).toFixed(1);
  const nm = a => ((a % 360) + 540) % 360 - 180;
  const ecartAng = (a, b) => Math.abs(nm(a - b));

  function directions(occ, n) {             // directions des doublets, réparties autour des liaisons (« toit » sur O terminal)
    if (!n) return [];
    if (!occ.length) return [0, 180, -90, 90].slice(0, n);
    if (occ.length === 1) {
      const b = occ[0];
      if (n === 1) return [nm(b + 180)];
      if (n === 2) return [nm(b + 180 + 38), nm(b + 180 - 38)];
      return [nm(b + 180), nm(b + 90), nm(b - 90), nm(b)].slice(0, n);
    }
    if (occ.length === 2 && Math.abs(ecartAng(occ[0], occ[1]) - 180) < 10) { const b = occ[0]; return [nm(b - 90), nm(b + 90), nm(b + 45), nm(b - 135)].slice(0, n); }
    const t = occ.map(x => (x + 360) % 360).sort((x, y) => x - y);
    let deb = 0, larg = -1; t.forEach((x, i) => { const y = i + 1 < t.length ? t[i + 1] : t[0] + 360; if (y - x > larg) { larg = y - x; deb = x; } });
    const m = deb + larg / 2, pas = Math.min(80, larg / (n + 0.6));
    return [...Array(n)].map((_, i) => nm(m + (i - (n - 1) / 2) * pas));
  }
  function angleLibre(occ, pref = -45) {
    let best = pref, sc = -1;
    for (let a = -180; a < 180; a += 15) {
      const m = occ.length ? Math.min(...occ.map(o => ecartAng(a, o))) : 180, s = m + (ecartAng(a, pref) < 50 ? 6 : 0);
      if (s > sc) { sc = s; best = a; }
    }
    return best;
  }

  // ───────── géométrie d'une forme ─────────
  function geometrie(m, f, opt = {}) {
    const an = Meso.analyser(m, f), n = m.atomes.length;
    const P = m.atomes.map(a => [a.x * U, a.y * U]);
    const vois = m.atomes.map(() => []);
    m.liaisons.forEach(([i, j]) => { vois[i].push(j); vois[j].push(i); });
    const cycleDe = new Map(); (m.cycles || []).forEach((c, ci) => c.forEach(i => cycleDe.set(i, ci)));
    const centres = (m.cycles || []).map(c => [c.reduce((s, i) => s + P[i][0], 0) / c.length, c.reduce((s, i) => s + P[i][1], 0) / c.length]);
    const lourds = m.atomes.map((a, i) => i).filter(i => m.atomes[i].el !== 'H');
    const centroide = [lourds.reduce((s, i) => s + P[i][0], 0) / lourds.length, lourds.reduce((s, i) => s + P[i][1], 0) / lourds.length];
    const atomes = m.atomes.map((a, i) => {
      const vis = !a.cache, angs = vois[i].map(j => Math.atan2(P[j][1] - P[i][1], P[j][0] - P[i][0]) / RAD);
      const sx = vois[i].reduce((s, j) => s + Math.sign(P[j][0] - P[i][0]) * (Math.abs(P[j][0] - P[i][0]) > 1 ? 1 : 0), 0);
      const h = a.h || 0, hVis = vis && h > 0, prefixe = hVis && sx > 0 && vois[i].length === 1;
      const occ = angs.concat(hVis ? [prefixe ? 180 : 0] : []);
      const A = an.at[i], slots = [];
      const nb = A.paires + A.radical + A.lacune, dirs = directions(occ, nb);
      // électron célibataire / lacune : au milieu de la série
      const types = Array(A.paires).fill('p');
      const mil = Math.floor(types.length / 2);
      if (A.radical) types.splice(mil, 0, 'r');
      if (A.lacune) types.splice(mil, 0, 'l');
      dirs.forEach((d, k) => slots.push({ type: types[k], ang: d }));
      const angQ = A.q ? angleLibre(occ.concat(dirs), -45) : null;
      return { i, vis, el: a.el, h, hVis, prefixe, p: P[i], occ, slots, q: A.q, angQ };
    });
    const liaisons = m.liaisons.map(([i, j]) => {
      const k = Meso.cle(i, j), ordre = (opt.ordres ? opt.ordres[k] : f.e[k] / 2);
      const cyc = cycleDe.has(i) && cycleDe.has(j) && cycleDe.get(i) === cycleDe.get(j) ? centres[cycleDe.get(i)] : null;
      return { i, j, k, ordre, centre: cyc };
    });
    return { m, f, an, atomes, liaisons, P, centres, centroide, cycleDe };
  }

  // rayon d'encombrement de l'étiquette d'un atome dans une direction (degrés)
  function rayon(at, ang) {
    if (!at.vis) return 0;
    const c = Math.cos(ang * RAD), s = Math.sin(ang * RAD), we = at.el.length > 1 ? 9.5 : 6.5, wH = at.hVis ? (at.h > 1 ? 16 : 10.5) : 0;
    const gauche = we + (at.prefixe ? wH : 0), droite = we + (at.hVis && !at.prefixe ? wH : 0), ry = 9.5;
    const tx = c > 1e-6 ? droite / c : c < -1e-6 ? gauche / -c : 1e9, ty = Math.abs(s) > 1e-6 ? ry / Math.abs(s) : 1e9;
    return Math.min(tx, ty);
  }
  const dirU = a => [Math.cos(a * RAD), Math.sin(a * RAD)];
  const posSlot = (at, sl, plus = 0) => { const d = (at.vis ? rayon(at, sl.ang) + 3.5 : 10) + plus; return [at.p[0] + Math.cos(sl.ang * RAD) * d, at.p[1] + Math.sin(sl.ang * RAD) * d]; };
  const posCharge = (at, ang) => { const d = at.vis ? rayon(at, ang) + 9.5 : 15; return [at.p[0] + Math.cos(ang * RAD) * d, at.p[1] + Math.sin(ang * RAD) * d]; };

  // ───────── primitives ─────────
  const ligne = (a, b, op = 1, ep = 1.7, tir) => (op <= 0.01 ? '' : `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="currentColor" stroke-width="${ep}" stroke-linecap="round"${op < 1 ? ` opacity="${op.toFixed(2)}"` : ''}${tir ? ' stroke-dasharray="4 3.5"' : ''}/>`);
  function etiquette(at, police, op = 1) {
    if (!at.vis) return '';
    const [x, y] = at.p, yb = y + 6, o = op < 1 ? ` opacity="${op.toFixed(2)}"` : '';
    let s = `<text x="${f1(x)}" y="${f1(yb)}" text-anchor="middle" font-size="17" font-family="${police}" fill="currentColor"${o}>${at.el}</text>`;
    if (at.hVis) {
      const hs = 'H' + (at.h > 1 ? `<tspan font-size="11" dy="4">${at.h}</tspan>` : '');
      const w = at.el.length > 1 ? 9 : 6;
      s += at.prefixe ? `<text x="${f1(x - w)}" y="${f1(yb)}" text-anchor="end" font-size="17" font-family="${police}" fill="currentColor"${o}>${hs}</text>`
        : `<text x="${f1(x + w)}" y="${f1(yb)}" text-anchor="start" font-size="17" font-family="${police}" fill="currentColor"${o}>${hs}</text>`;
    }
    return s;
  }
  function doublet(c, ang, op) {
    const ux = Math.cos(ang * RAD), uy = Math.sin(ang * RAD);
    return ligne([c[0] - uy * 6, c[1] + ux * 6], [c[0] + uy * 6, c[1] - ux * 6], op, 2.2);
  }
  function lacune(c, ang, op) {
    const ux = Math.cos(ang * RAD), uy = Math.sin(ang * RAD), w = 6, h = 2.6;
    const pts = [[-w, -h], [w, -h], [w, h], [-w, h]].map(([a, b]) => [c[0] - uy * a + ux * b, c[1] + ux * a + uy * b]);
    return op <= 0.01 ? '' : `<polygon points="${pts.map(p => f1(p[0]) + ',' + f1(p[1])).join(' ')}" fill="none" stroke="currentColor" stroke-width="1.2"${op < 1 ? ` opacity="${op.toFixed(2)}"` : ''}/>`;
  }
  const point = (c, op, r = 2.4, coul = 'currentColor') => (op <= 0.01 ? '' : `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${r}" fill="${coul}"${op < 1 ? ` opacity="${op.toFixed(2)}"` : ''}/>`);
  function charge(c, q, op, police, u) {
    if (op <= 0.01 || !q) return '';
    const o = op < 1 ? ` opacity="${op.toFixed(2)}"` : '';
    let s = `<g${o}><circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="6.5" fill="none" stroke="currentColor" stroke-width="1.2"/>` + ligne([c[0] - 3.5, c[1]], [c[0] + 3.5, c[1]], 1, 1.2);
    if (q > 0) s += ligne([c[0], c[1] - 3.5], [c[0], c[1] + 3.5], 1, 1.2);
    if (Math.abs(q) > 1) s += `<text x="${f1(c[0] + (u ? u[0] : -1) * 12)}" y="${f1(c[1] + (u ? u[1] : 0) * 12 + 4.5)}" text-anchor="middle" font-size="12" font-family="${police}" fill="currentColor">${Math.abs(q)}</text>`;
    return s + '</g>';
  }
  function delta(c, q, police) {
    return `<text x="${f1(c[0])}" y="${f1(c[1] + 4)}" text-anchor="middle" font-size="13" font-style="italic" font-family="${police}" fill="currentColor">δ${q > 0 ? '+' : '−'}</text>`;
  }

  // traits d'une liaison (ordre éventuellement interpolé)
  function traitsLiaison(G, L, ordreA, ordreB, t, hyb) {
    const a0 = G.atomes[L.i], b0 = G.atomes[L.j];
    const ang = Math.atan2(b0.p[1] - a0.p[1], b0.p[0] - a0.p[0]) / RAD;
    const ra = rayon(a0, ang) + (a0.vis ? 2.5 : 0), rb = rayon(b0, ang + 180) + (b0.vis ? 2.5 : 0);
    const ux = Math.cos(ang * RAD), uy = Math.sin(ang * RAD), nx = -uy, ny = ux;
    const a = [a0.p[0] + ux * ra, a0.p[1] + uy * ra], b = [b0.p[0] - ux * rb, b0.p[1] - uy * rb];
    const lerp = (x, y) => x + (y - x) * t;
    if (L.centre) {   // liaison d'un cycle : second trait à l'intérieur
      let s = ligne(a, b);
      const cx = L.centre[0] - (a[0] + b[0]) / 2, cy = L.centre[1] - (a[1] + b[1]) / 2, sg = cx * nx + cy * ny > 0 ? 1 : -1;
      const e = 6 * sg, rr = (b0.vis || a0.vis) ? 0.1 : 0.15, dx = b[0] - a[0], dy = b[1] - a[1];
      const p = [a[0] + dx * rr + nx * e, a[1] + dy * rr + ny * e], q = [b[0] - dx * rr + nx * e, b[1] - dy * rr + ny * e];
      if (hyb) return s + (ordreA % 1 ? ligne(p, q, 1, 1.7, true) : (ordreA === 2 ? ligne(p, q) : ''));
      const op = lerp(ordreA >= 2 ? 1 : 0, ordreB >= 2 ? 1 : 0);
      return s + ligne(p, q, op);
    }
    const slots = o => (o >= 3 ? [[-4.5, 1], [4.5, 1], [0, 1]] : o >= 2 ? [[-3.2, 1], [3.2, 1], [0, 0]] : [[0, 1], [0, 1], [0, 0]]);
    if (hyb && ordreA % 1) {
      const lo = Math.floor(ordreA);
      return (lo >= 2 ? ligne([a[0] - nx * 4.5, a[1] - ny * 4.5], [b[0] - nx * 4.5, b[1] - ny * 4.5]) + ligne(a, b) : ligne([a[0] - nx * 2.4, a[1] - ny * 2.4], [b[0] - nx * 2.4, b[1] - ny * 2.4]))
        + ligne([a[0] + nx * (lo >= 2 ? 4.5 : 2.4), a[1] + ny * (lo >= 2 ? 4.5 : 2.4)], [b[0] + nx * (lo >= 2 ? 4.5 : 2.4), b[1] + ny * (lo >= 2 ? 4.5 : 2.4)], 1, 1.7, true);
    }
    const A = slots(ordreA), B = slots(ordreB);
    return A.map((s, k) => { const off = lerp(s[0], B[k][0]), op = lerp(s[1], B[k][1]); return ligne([a[0] + nx * off, a[1] + ny * off], [b[0] + nx * off, b[1] + ny * off], op); }).join('');
  }

  // appariement des doublets / électrons / lacunes de deux formes d'un même atome
  function apparier(SA, SB) {
    const paires = [], libresB = new Set(SB.map((_, k) => k)), seulsA = [];
    SA.forEach(sa => {
      let best = -1, d = 1e9;
      libresB.forEach(k => { if (SB[k].type !== sa.type) return; const e = ecartAng(sa.ang, SB[k].ang); if (e < d) { d = e; best = k; } });
      if (best >= 0) { paires.push([sa, SB[best]]); libresB.delete(best); } else seulsA.push(sa);
    });
    return { paires, seulsA, seulsB: [...libresB].map(k => SB[k]) };
  }
  function dessinSlot(at, sl, ang, op) {
    const c = posSlot(at, { ang }, sl.type === 'p' ? 0 : 1);
    return sl.type === 'p' ? doublet(c, ang, op) : sl.type === 'r' ? point(c, op) : lacune(c, ang, op);
  }

  // ───────── flèches courbes ─────────
  function slotDepart(G, i, cible, n, k) {
    const at = G.atomes[i], cand = at.slots.map((s, q) => ({ s, q })).filter(o => (n === 1 && at.slots.some(x => x.type === 'r') ? o.s.type === 'r' : o.s.type === 'p'));
    if (k !== undefined && at.slots[k]) return at.slots[k];
    const angC = Math.atan2(cible[1] - at.p[1], cible[0] - at.p[0]) / RAD;
    cand.sort((x, y) => ecartAng(x.s.ang, angC) - ecartAng(y.s.ang, angC));
    return cand.length ? cand[0].s : null;
  }
  const milieu = (G, l) => { const a = G.P[l[0]], b = G.P[l[1]]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  function geomFleche(G, fl) {
    const cibleBrute = fl.vers.a !== undefined ? G.P[fl.vers.a] : milieu(G, fl.vers.l);
    let s0, dep = null;
    if (fl.de.a !== undefined) { dep = slotDepart(G, fl.de.a, cibleBrute, fl.n, fl.k); s0 = dep ? posSlot(G.atomes[fl.de.a], dep, dep.type === 'r' ? 1 : 0) : G.P[fl.de.a]; }
    else s0 = milieu(G, fl.de.l);
    let e0 = cibleBrute;
    const dx = e0[0] - s0[0], dy = e0[1] - s0[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const k = Math.min(34, Math.max(13, len * 0.5)), mid = [(s0[0] + e0[0]) / 2, (s0[1] + e0[1]) / 2];
    const c1 = [mid[0] + nx * k, mid[1] + ny * k], c2 = [mid[0] - nx * k, mid[1] - ny * k];
    // côté de la courbure : vers l'intérieur d'un cycle si départ et arrivée y sont, sinon vers l'extérieur de la molécule
    const dansCycle = x => (x.l ? G.cycleDe.has(x.l[0]) && G.cycleDe.has(x.l[1]) && G.cycleDe.get(x.l[0]) === G.cycleDe.get(x.l[1]) ? G.cycleDe.get(x.l[0]) : null : null);
    const cy1 = dansCycle(fl.de), cy2 = dansCycle(fl.vers);
    const d2 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    let sg;
    if (cy1 !== null && cy1 === cy2) { const C = G.centres[cy1]; sg = d2(c1, C) < d2(c2, C) ? 1 : -1; }
    else { const C = G.centroide, e = d2(c1, C) - d2(c2, C); sg = Math.abs(e) < 1 ? (c1[1] < c2[1] ? 1 : -1) : (e > 0 ? 1 : -1); }
    if (fl.s === -1) sg = -sg;
    // départ d'une liaison multiple : sur le trait π, côté courbure ; arrivée sur un atome : arrêt avant l'étiquette
    if (fl.de.l) { s0 = [s0[0] + nx * sg * 3.5, s0[1] + ny * sg * 3.5]; }
    let ctrl = [mid[0] + nx * k * sg, mid[1] + ny * k * sg];
    if (fl.vers.a !== undefined) {
      const at = G.atomes[fl.vers.a], vx = e0[0] - ctrl[0], vy = e0[1] - ctrl[1], vn = Math.hypot(vx, vy) || 1, ang = Math.atan2(-vy, -vx) / RAD;
      const r = (at.vis ? rayon(at, ang) : 0) + 5;
      e0 = [e0[0] - vx / vn * r, e0[1] - vy / vn * r];
    } else e0 = [e0[0] + nx * sg * 2.5, e0[1] + ny * sg * 2.5];
    ctrl = [(s0[0] + e0[0]) / 2 + nx * k * sg, (s0[1] + e0[1]) / 2 + ny * k * sg];
    return { s: s0, c: ctrl, e: e0, sg, n: fl.n };
  }
  function svgFleche(g, op = 1, coul = BLEU, attrs = '') {
    const tx = g.e[0] - g.c[0], ty = g.e[1] - g.c[1], tn = Math.hypot(tx, ty) || 1, ux = tx / tn, uy = ty / tn;
    const p1 = [g.e[0] - ux * 9 - uy * 4.5, g.e[1] - uy * 9 + ux * 4.5], p2 = [g.e[0] - ux * 9 + uy * 4.5, g.e[1] - uy * 9 - ux * 4.5];
    // demi-flèche : une seule barbe, du côté extérieur de la courbe
    const ext = ((g.c[0] - (g.s[0] + g.e[0]) / 2) * (p1[0] - g.e[0]) + (g.c[1] - (g.s[1] + g.e[1]) / 2) * (p1[1] - g.e[1])) > 0 ? p1 : p2;
    const pointe = g.n === 1 ? `<polygon points="${f1(g.e[0])},${f1(g.e[1])} ${f1(ext[0])},${f1(ext[1])} ${f1(g.e[0] - ux * 7)},${f1(g.e[1] - uy * 7)}" fill="${coul}"/>`
      : `<polygon points="${f1(g.e[0])},${f1(g.e[1])} ${f1(p1[0])},${f1(p1[1])} ${f1(p2[0])},${f1(p2[1])}" fill="${coul}"/>`;
    const fin = [g.e[0] - ux * 6, g.e[1] - uy * 6];
    return `<g${op < 1 ? ` opacity="${op.toFixed(2)}"` : ''}${attrs}><path d="M${f1(g.s[0])},${f1(g.s[1])} Q${f1(g.c[0])},${f1(g.c[1])} ${f1(fin[0])},${f1(fin[1])}" fill="none" stroke="${coul}" stroke-width="1.8"/>${pointe}</g>`;
  }
  const bez = (g, u) => [(1 - u) * (1 - u) * g.s[0] + 2 * (1 - u) * u * g.c[0] + u * u * g.e[0], (1 - u) * (1 - u) * g.s[1] + 2 * (1 - u) * u * g.c[1] + u * u * g.e[1]];

  // ───────── composition ─────────
  // A : géométrie de départ ; B : géométrie d'arrivée (ou null) ; t : avancement du morphing (0 → 1)
  function corps(A, B, t, opt) {
    const police = opt.police || 'Arial, Helvetica, sans-serif', out = [];
    A.liaisons.forEach((L, k) => out.push(traitsLiaison(A, L, L.ordre, B ? B.liaisons[k].ordre : L.ordre, B ? t : 0, opt.hybride)));
    if (opt.cercle) A.centres.forEach(c => out.push(`<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(U * 0.58)}" fill="none" stroke="currentColor" stroke-width="1.7"/>`));
    A.atomes.forEach((at, i) => {
      out.push(etiquette(at, police));
      if (opt.sansElectrons) return;
      const bt = B ? B.atomes[i] : null;
      if (!bt || (t <= 0 && !opt.tf)) at.slots.forEach(sl => out.push(dessinSlot(at, sl, sl.ang, 1)));
      else {
        const ap = apparier(at.slots, bt.slots);
        const fa = opt.tf !== undefined ? 1 - opt.tf : Math.max(0, 1 - t * 2.2), fb = Math.min(1, Math.max(0, (t - 0.35) / 0.65));
        ap.paires.forEach(([sa, sb]) => out.push(dessinSlot(at, sa, sa.ang + nm(sb.ang - sa.ang) * t, 1)));
        ap.seulsA.forEach(sa => out.push(dessinSlot(at, sa, sa.ang, fa)));
        ap.seulsB.forEach(sb => out.push(dessinSlot(bt, sb, sb.ang, fb)));
      }
      // charges
      if (opt.hybride) return;
      if (!bt || t <= 0) { if (at.q) out.push(charge(posCharge(at, at.angQ), at.q, 1, police, dirU(at.angQ))); }
      else if (at.q && at.q === bt.q) { const a1 = at.angQ + nm(bt.angQ - at.angQ) * t; out.push(charge(posCharge(at, a1), at.q, 1, police, dirU(a1))); }
      else {
        if (at.q) out.push(charge(posCharge(at, at.angQ), at.q, Math.max(0, 1 - t * 2), police, dirU(at.angQ)));
        if (bt.q) out.push(charge(posCharge(bt, bt.angQ), bt.q, Math.min(1, Math.max(0, (t - 0.4) / 0.6)), police, dirU(bt.angQ)));
      }
    });
    return out.join('');
  }
  function boite(Gs, fl = []) {
    const pts = [];
    Gs.forEach(G => G.atomes.forEach(at => {
      const w = at.vis ? (at.hVis ? 26 : 10) : 4;
      pts.push([at.p[0] - (at.prefixe ? w + 10 : 10), at.p[1] - 22], [at.p[0] + (at.prefixe ? 10 : w + 6), at.p[1] + 22]);
    }));
    fl.forEach(g => pts.push(g.c));
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), pad = 8;
    return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
  }
  function envelopper(contenu, bx, opt = {}) {
    const [x0, y0, x1, y1] = bx, w = x1 - x0, h = y1 - y0, z = opt.zoom || 1;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f1(x0)} ${f1(y0)} ${f1(w)} ${f1(h)}" width="${Math.round(w * z)}" height="${Math.round(h * z)}" style="color:${opt.couleur || 'currentColor'};max-width:100%;height:auto"${opt.classe ? ` class="${opt.classe}"` : ''} role="img" aria-label="${opt.titre || 'formule mésomère'}">${opt.fond ? `<rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(w)}" height="${f1(h)}" fill="${opt.fond}"/>` : ''}${contenu}</svg>`;
  }

  // une forme, avec ses flèches éventuelles et (option) les zones cliquables
  function forme(m, f, opt = {}) {
    const G = geometrie(m, f), fl = (opt.fleches || []).map(x => geomFleche(G, x));
    let c = corps(G, null, 0, opt);
    c += fl.map((g, i) => svgFleche(g, 1, BLEU, opt.cibles ? ` data-f="${i}" class="ms-fl${opt.choisie === i ? ' sel' : ''}"` : '')).join('');
    if (opt.depart) c += marqueDepart(G, opt.depart);
    if (opt.cibles) c += cibles(G);
    if (opt.barre) {
      const b = opt.boite || boite([G], fl), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, r = Math.min(b[2] - b[0], b[3] - b[1]) * 0.42;
      c += `<g stroke="#c62828" stroke-width="3" fill="none" opacity=".85"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}"/><line x1="${f1(cx - r * 0.7)}" y1="${f1(cy + r * 0.7)}" x2="${f1(cx + r * 0.7)}" y2="${f1(cy - r * 0.7)}"/></g>`;
    }
    return envelopper(c, opt.boite || boite([G], fl), opt);
  }
  function marqueDepart(G, d) {
    let p;
    if (d.t === 'p') { const at = G.atomes[d.i], sl = at.slots[d.k]; p = sl ? posSlot(at, sl, sl.type === 'r' ? 1 : 0) : at.p; }
    else p = milieu(G, d.l);
    return `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="7" fill="rgba(46,160,67,.35)" stroke="#2e7d32"/>`;
  }
  function cibles(G) {
    const z = [];
    G.liaisons.forEach(L => { const p = milieu(G, [L.i, L.j]); z.push(`<circle class="ms-c c-l" cx="${f1(p[0])}" cy="${f1(p[1])}" r="8" data-t="l" data-l="${L.i}-${L.j}"/>`); });
    G.atomes.forEach(at => {
      if (at.el === 'H') return;
      z.push(`<circle class="ms-c c-a" cx="${f1(at.p[0])}" cy="${f1(at.p[1])}" r="${at.vis ? 11 : 8}" data-t="a" data-i="${at.i}"/>`);
      at.slots.forEach((sl, k) => { if (sl.type === 'l') return; const p = posSlot(at, sl, sl.type === 'r' ? 1 : 0); z.push(`<circle class="ms-c c-p" cx="${f1(p[0])}" cy="${f1(p[1])}" r="6.5" data-t="p" data-i="${at.i}" data-k="${k}"/>`); });
    });
    return `<g fill="transparent">${z.join('')}</g>`;
  }

  // image d'une transition : phase 0→0.5 électrons en mouvement le long des flèches, 0.4→1 morphing vers la forme suivante
  function transition(m, fA, fB, fleches, T, opt = {}) {
    const A = geometrie(m, fA), B = geometrie(m, fB), fl = fleches.map(x => geomFleche(A, x));
    const tm = Math.min(1, Math.max(0, (T - 0.42) / 0.58)), tm2 = tm * tm * (3 - 2 * tm);
    let c = corps(A, B, tm2, { ...opt, tf: Math.min(1, T / 0.12) });
    const opF = T < 0.5 ? 1 : Math.max(0, 1 - (T - 0.5) / 0.2);
    c += fl.map(g => svgFleche(g, opF)).join('');
    if (T > 0 && T < 0.62) {
      const u = Math.min(1, T / 0.5), ue = u * u * (3 - 2 * u), op = T < 0.5 ? 1 : 1 - (T - 0.5) / 0.12;
      fl.forEach(g => {
        const p = bez(g, ue), q = bez(g, Math.min(1, ue + 0.02)), dx = q[0] - p[0], dy = q[1] - p[1], dn = Math.hypot(dx, dy) || 1, nx = -dy / dn * 3, ny = dx / dn * 3;
        if (g.n === 2) c += point([p[0] + nx, p[1] + ny], op, 2.9, BLEU) + point([p[0] - nx, p[1] - ny], op, 2.9, BLEU);
        else c += point(p, op, 3.1, BLEU);
      });
    }
    return envelopper(c, opt.boite || boite([A, B], fl), opt);
  }

  // hybride de résonance des formes données (ordres moyens, charges partielles δ)
  function hybride(m, formes, opt = {}) {
    const ordres = {};
    m.liaisons.forEach(([i, j]) => { const k = Meso.cle(i, j); ordres[k] = formes.reduce((s, f) => s + f.e[k] / 2, 0) / formes.length; });
    const ans = formes.map(f => Meso.analyser(m, f));
    const ne = m.atomes.map((a, i) => Math.min(...formes.map(f => f.ne[i])));
    const G = geometrie(m, { ne, e: formes[0].e }, { ordres });
    G.atomes.forEach(at => { at.slots = at.slots.filter(sl => sl.type === 'p'); });
    G.liaisons.forEach(L => { L.ordre = Math.abs(ordres[L.k] - Math.round(ordres[L.k])) < 1e-6 ? Math.round(ordres[L.k]) : ordres[L.k]; });
    const police = opt.police || 'Arial, Helvetica, sans-serif';
    let c;
    if (m.cercle) {
      G.liaisons.forEach(L => { if (L.centre) L.ordre = 1; });
      c = corps(G, null, 0, { ...opt, cercle: true, hybride: false });
    } else c = corps(G, null, 0, { ...opt, hybride: true });
    m.atomes.forEach((a, i) => {
      const qs = ans.map(x => x.at[i].q), moy = qs.reduce((s, q) => s + q, 0) / qs.length;
      if (Math.abs(moy) < 1e-6) return;
      const at = G.atomes[i];
      if (qs.every(q => q === qs[0])) { c += charge(posCharge(at, at.angQ ?? angleLibre(at.occ.concat(at.slots.map(s => s.ang)))), qs[0], 1, police); return; }
      const ang = angleLibre(at.occ.concat(at.slots.map(s => s.ang)), -60);
      c += delta(posCharge(at, ang), moy, police);
    });
    return envelopper(c, opt.boite || boite([G]), opt);
  }

  function boiteChaine(m, formes, fleches) {
    const Gs = formes.map(f => geometrie(m, f));
    const fl = []; (fleches || []).forEach((l, i) => (l || []).forEach(x => fl.push(geomFleche(Gs[i], x))));
    return boite(Gs, fl);
  }

  return { forme, transition, hybride, boiteChaine, geometrie, BLEU };
})();
