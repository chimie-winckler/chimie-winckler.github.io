/* Représentations spatiales — animations (passage d'une représentation à une autre)
   Chaque animation est une suite d'étapes ; chaque étape fournit une image (frame) pour t ∈ [0, 1].
   Une image = { noeuds:[{x,y,t,op,cls,anc}], liaisons:[{a,b,style,op}], cercles:[{x,y,r,op}], points:[…] } (unités écran). */
const Anim = (() => {
  const S = Stereo, V = Vues, RAD = Math.PI / 180, SC = 62;   // 1 unité 3D = 62 px
  // ── vecteurs ──
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(...a) || 1; return mul(a, 1 / l); };
  const lerp = (a, b, t) => a + (b - a) * t, lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  // rotation d'un point p autour de l'axe (o, u) d'un angle a
  function rot(p, o, u, a) {
    const v = sub(p, o), c = Math.cos(a), s = Math.sin(a);
    return add(o, add(add(mul(v, c), mul(cross(u, v), s)), mul(u, dot(u, v) * (1 - c))));
  }
  // matrice (lignes = nouveaux axes) → axe-angle de la rotation
  function axeAngle(R) {
    const tr = R[0][0] + R[1][1] + R[2][2], ang = Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2)));
    if (ang < 1e-6) return { u: [0, 0, 1], a: 0 };
    let u = [R[2][1] - R[1][2], R[0][2] - R[2][0], R[1][0] - R[0][1]];
    if (Math.hypot(...u) < 1e-6) {          // angle = 180° : axe = colonne dominante de R + I
      const M = [[R[0][0] + 1, R[0][1], R[0][2]], [R[1][0], R[1][1] + 1, R[1][2]], [R[2][0], R[2][1], R[2][2] + 1]];
      const k = [0, 1, 2].sort((x, y) => Math.hypot(...M.map(r => r[y])) - Math.hypot(...M.map(r => r[x])))[0];
      u = M.map(r => r[k]);
    }
    return { u: norm(u), a: ang };
  }
  // repère cible (ex, ey, ez) → matrice R telle que R·p = (p·ex, p·ey, p·ez)
  const matrice = (ex, ey, ez) => [ex, ey, ez];

  // ── géométrie tétraédrique ──
  const A_TET = 54.7356 * RAD;
  function deuxAutres(u1, u2) {        // u1, u2 : directions de deux liaisons ; renvoie les deux autres directions
    const b = norm(mul(add(u1, u2), -1)), n = norm(cross(u1, u2));
    return [add(mul(b, Math.cos(A_TET)), mul(n, Math.sin(A_TET))), add(mul(b, Math.cos(A_TET)), mul(n, -Math.sin(A_TET)))];
  }

  // ── dessin d'une image ──
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function texte(x, y, t, anc, op, cls) {
    const parts = String(t).split(/(\d+)/).map((p, k) => (k % 2 ? `<tspan class="ind" baseline-shift="sub">${p}</tspan>` : esc(p))).join('');
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anc || 'middle'}" dominant-baseline="central"${op < 1 ? ` opacity="${op.toFixed(2)}"` : ''}${cls ? ` class="${cls}"` : ''}>${parts}</text>`;
  }
  const larg = t => String(t).replace(/\d/g, '').length * 9.2 + String(t).replace(/\D/g, '').length * 6;
  function rayonEtiq(t, dx, dy) { if (!t) return 0; const w = larg(t) / 2 + 3, h = 10, L = Math.hypot(dx, dy) || 1; return Math.min(Math.abs(w * L / (dx || 1e-9)), Math.abs(h * L / (dy || 1e-9))); }
  function segment(a, b, style, op) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    if (L < 2) return '';
    const o = op < 1 ? ` opacity="${op.toFixed(2)}"` : '';
    if (style === 'coin') { const nx = -dy / L * 4.2, ny = dx / L * 4.2; return `<polygon class="coin"${o} points="${a[0]},${a[1]} ${b[0] + nx},${b[1] + ny} ${b[0] - nx},${b[1] - ny}"/>`; }
    if (style === 'hach') {
      let s = ''; const n = Math.max(4, Math.round(L / 4.5));
      for (let q = 1; q <= n; q++) { const t = q / n, w = 4.4 * t, cx = a[0] + dx * t, cy = a[1] + dy * t, nx = -dy / L * w, ny = dx / L * w; s += `<line class="hach" x1="${(cx + nx).toFixed(1)}" y1="${(cy + ny).toFixed(1)}" x2="${(cx - nx).toFixed(1)}" y2="${(cy - ny).toFixed(1)}"/>`; }
      return o ? `<g${o}>${s}</g>` : s;
    }
    if (style === 'double') {
      const nx = -dy / L * 3, ny = dx / L * 3;
      return `<line x1="${a[0] + nx}" y1="${a[1] + ny}" x2="${b[0] + nx}" y2="${b[1] + ny}"${o}/><line x1="${a[0] - nx}" y1="${a[1] - ny}" x2="${b[0] - nx}" y2="${b[1] - ny}"${o}/>`;
    }
    return `<line${style === 'epais' ? ' class="epais"' : ''} x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"${o}/>`;
  }
  function dessiner(fr, box) {
    const N = fr.noeuds, out = [];
    (fr.cercles || []).forEach(c => { if (c.op > 0.01) out.push(`<circle class="arriere" cx="${c.x}" cy="${c.y}" r="${c.r}" opacity="${c.op.toFixed(2)}"/>`); });
    // liaisons triées par profondeur (les plus éloignées d'abord)
    fr.liaisons.slice().sort((a, b) => (a.z || 0) - (b.z || 0)).forEach(l => {
      if (l.op <= 0.01) return;
      const na = N[l.a], nb = N[l.b];
      let a = [na.x, na.y], b = [nb.x, nb.y];
      const ra = l.depA !== undefined ? l.depA : (na.op > 0.3 ? rayonEtiq(na.t, b[0] - a[0], b[1] - a[1]) : 0);
      const rb = nb.op > 0.3 ? rayonEtiq(nb.t, a[0] - b[0], a[1] - b[1]) : 0;
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      if (ra + rb < L - 2) { a = [a[0] + dx / L * ra, a[1] + dy / L * ra]; b = [b[0] - dx / L * rb, b[1] - dy / L * rb]; }
      out.push(segment(a, b, l.style, l.op));
    });
    (fr.points || []).forEach(p => { if (p.op > 0.01) out.push(`<circle class="point" cx="${p.x}" cy="${p.y}" r="3.2" opacity="${p.op.toFixed(2)}"/>`); });
    N.forEach(n => { if (n.op > 0.01 && n.t) out.push(texte(n.x, n.y, n.t, n.anc, n.op, n.cls)); });
    const [x0, y0, x1, y1] = box;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="stereo-svg anim-svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}">${out.join('')}</svg>`;
  }

  // ── modèle 3D générique : noeuds (atomes de la chaîne ou étiquettes) + liaisons ──
  // projection orthographique ; style des liaisons d'après la profondeur
  function projeter(M, P, opt = {}) {
    const noeuds = M.noeuds.map((n, k) => {
      const p = P[k], x = p[0] * SC, y = -p[1] * SC;
      let t = n.t, anc = 'middle';
      if (n.etiq) { const par = P[n.parent]; if (p[0] < par[0] - 0.15) { t = n.gauche; } }
      return { x, y, t, anc, op: n.op !== undefined ? n.op : 1, cls: n.cls, z: p[2] };
    });
    const liaisons = M.liaisons.map(l => {
      const a = P[l.a], b = P[l.b], d = sub(b, a), L = Math.hypot(...d) || 1, dz = d[2] / L;
      let style = 'ligne';
      if (l.ordre === 2) style = 'double';
      else if (!opt.plat && l.stereo !== false) { if (dz > 0.42) style = 'coin'; else if (dz < -0.42) style = 'hach'; }
      return { a: l.a, b: l.b, style, op: 1, z: (a[2] + b[2]) / 2 };
    });
    return { noeuds, liaisons };
  }
  function centrer(P) { const c = P.reduce((s, p) => add(s, p), [0, 0, 0]).map(v => v / P.length); return P.map(p => sub(p, c)); }

  /* Construit la molécule « Cram en zigzag » sur la chaîne ch :
     atomes internes de la chaîne = noeuds 'C', extrémités et substituants = étiquettes. */
  function modeleZigzag(mol, ch) {
    const n = ch.length, Lb = 1;
    const dirs = []; for (let q = 0; q < n - 1; q++) dirs.push([0.8165, q % 2 ? -0.5774 : 0.5774, 0]);
    const pos = [[0, 0, 0]]; for (let q = 0; q < n - 1; q++) pos.push(add(pos[q], dirs[q]));
    const noeuds = [], liaisons = [], P = [], idx = new Map();
    const ajout = (n0, p) => { noeuds.push(n0); P.push(p); return noeuds.length - 1; };
    ch.forEach((k, q) => {
      if (q === 0 || q === n - 1) {
        const voisin = ch[q === 0 ? 1 : q - 1], e = S.etiquette(mol, k, voisin);
        idx.set(k, ajout({ t: e, gauche: S.aGauche(e), etiq: true, parent: null, atome: k, chaine: q }, pos[q]));
      } else idx.set(k, ajout({ t: 'C', atome: k, chaine: q, carbone: true, asym: !!mol.chir[k] }, pos[q]));
    });
    // parent des extrémités (pour l'écriture à gauche)
    noeuds[idx.get(ch[0])].parent = idx.get(ch[1]); noeuds[idx.get(ch[n - 1])].parent = idx.get(ch[n - 2]);
    for (let q = 0; q + 1 < n; q++) liaisons.push({ a: idx.get(ch[q]), b: idx.get(ch[q + 1]), ordre: S.ordreLiaison(mol, ch[q], ch[q + 1]), stereo: false });
    for (let q = 1; q < n - 1; q++) {
      const k = ch[q], u1 = norm(sub(pos[q - 1], pos[q])), u2 = norm(sub(pos[q + 1], pos[q]));
      const autres = S.voisins(mol, k).filter(v => v !== ch[q - 1] && v !== ch[q + 1]);
      let places = deuxAutres(u1, u2);
      if (autres.length === 1) places = [norm(mul(add(u1, u2), -1))];
      const m = S.placer(mol, k, new Map([[ch[q - 1], u1], [ch[q + 1], u2]]), autres, places);
      autres.forEach(j => {
        const e = S.etiquette(mol, j, k), d = m.get(j), L = mol.at[j].el === 'H' ? 0.82 : 1;
        const id = ajout({ t: e, gauche: S.aGauche(e), etiq: true, parent: idx.get(k), atome: j, sub: true, chaine: q }, add(pos[q], mul(d, L)));
        liaisons.push({ a: idx.get(k), b: id, ordre: S.ordreLiaison(mol, k, j) });
      });
    }
    const Pc = centrer(P).map(p => rot(p, [0, 0, 0], [0, 1, 0], 24 * RAD));
    return { M: { noeuds, liaisons }, P: Pc, idx };
  }

  // ───────── Cram → Fischer ─────────
  function cramFischer(mol) {
    const f = V.fischer(mol, {});
    if (f.erreur) return { erreur: f.erreur };
    const ch = f.chaine, n = ch.length, num = c => S.chainePrincipale(mol).indexOf(c) + 1;
    const { M, P: P0, idx } = modeleZigzag(mol, ch);
    const etapes = [];
    let P = P0;
    const cote = q => ({ q, ids: M.noeuds.map((nd, k) => k).filter(k => M.noeuds[k].chaine >= q) });
    etapes.push({ legende: 'Représentation de Cram : la chaîne carbonée est en zigzag dans le plan de la feuille.', duree: 1.6, f: () => projeter(M, P0) });
    // torsions de 180° autour des liaisons internes (anti → éclipsée)
    for (let q = 1; q + 2 < n; q++) {
      const Pd = P, a = idx.get(ch[q]), b = idx.get(ch[q + 1]), o = Pd[a], u = norm(sub(Pd[b], o)), grp = cote(q + 1).ids.filter(k => k !== b);
      const Pf = Pd.map((p, k) => (grp.includes(k) ? rot(p, o, u, Math.PI) : p));
      etapes.push({
        legende: `Rotation de 180° autour de la liaison C${num(ch[q])}–C${num(ch[q + 1])} : les deux atomes de carbone passent en conformation éclipsée.`,
        duree: 2.2, f: t => projeter(M, Pd.map((p, k) => (grp.includes(k) ? rot(p, o, u, Math.PI * ease(t)) : p)))
      });
      P = Pf;
    }
    // orientation finale : chaîne verticale vers l'arrière, substituants vers l'observateur
    const Pe = P, top = Pe[idx.get(ch[0])], bot = Pe[idx.get(ch[n - 1])];
    const ey = norm(sub(top, bot));
    const internes = ch.slice(1, -1).map(k => Pe[idx.get(k)]);
    const cIn = internes.reduce((s, p) => add(s, p), [0, 0, 0]).map(v => v / internes.length);
    const mil = mul(add(top, bot), 0.5);
    let ez = sub(cIn, mil); ez = norm(sub(ez, mul(ey, dot(ez, ey))));
    const ex = cross(ey, ez);
    const R = matrice(ex, ey, ez), { u: axe, a: ang } = axeAngle(R);
    const cG = Pe.reduce((s, p) => add(s, p), [0, 0, 0]).map(v => v / Pe.length);
    const appliquer = (t) => Pe.map(p => add(cG, rot(sub(p, cG), [0, 0, 0], axe, ang * ease(t))));
    const Pr = appliquer(1);
    etapes.push({ legende: 'On fait pivoter la molécule : la chaîne carbonée devient verticale, dirigée vers l’arrière ; les substituants des atomes de carbone asymétriques pointent vers l’observateur.', duree: 2.6, f: t => projeter(M, appliquer(t)) });
    // projection : vers la croix de Fischer
    const dy = 1.05, bras = 0.95, cible = Pr.map((p, k) => {
      const nd = M.noeuds[k], q = nd.chaine;
      if (!nd.sub) return [cG[0], cG[1] + (n - 1) / 2 * dy - q * dy, 0];
      return [cG[0] + Math.sign(p[0] - cG[0]) * bras, cG[1] + (n - 1) / 2 * dy - q * dy, 0];
    });
    etapes.push({
      legende: 'Projection sur le plan de la feuille : liaisons horizontales vers l’observateur, liaisons verticales vers l’arrière.',
      duree: 2.2, f: t => {
        const e = ease(t), Pt = Pr.map((p, k) => lerp3(p, cible[k], e));
        const fr = projeter(M, Pt, { plat: e > 0.55 });
        fr.noeuds.forEach((nd, k) => { if (M.noeuds[k].carbone) nd.op = 1 - e; });
        return fr;
      }
    });
    etapes.push({
      legende: 'Projection de Fischer : chaîne carbonée verticale, atome de carbone le plus oxydé en haut.' + (f.serie ? ` Série ${f.serie}.` : ''),
      duree: 1.8, f: () => { const fr = projeter(M, cible, { plat: true }); fr.noeuds.forEach((nd, k) => { if (M.noeuds[k].carbone) nd.op = 0; }); return fr; }
    });
    // contrôle : côtés obtenus = côtés de la projection de Fischer calculée
    const ok = f.cotes.every(x => { const g = M.noeuds.findIndex(nd => nd.atome === x.g && nd.sub); return g < 0 || cible[g][0] < cG[0]; });
    return { etapes, ok };
  }

  // ───────── Cram → Newman ─────────
  function cramNewman(mol, opt = {}) {
    const nw = V.newman(mol, { liaison: opt.liaison, phi: 0 });
    if (nw.erreur) return { erreur: nw.erreur };
    const A = nw.avant, B = nw.arriere, [refA, refB] = nw.refs, num = c => S.chainePrincipale(mol).indexOf(c) + 1;
    const noeuds = [], liaisons = [], P = [];
    const ajout = (nd, p) => { noeuds.push(nd); P.push(p); return noeuds.length - 1; };
    const iA = ajout({ t: 'C', carbone: true, atome: A }, [0, 0, 0]), iB = ajout({ t: 'C', carbone: true, atome: B }, [1, 0, 0]);
    liaisons.push({ a: iA, b: iB, stereo: false });
    const r8 = Math.sqrt(8 / 9), tet = (sx, ang) => [sx / 3, r8 * Math.sin(ang * RAD), r8 * Math.cos(ang * RAD)];
    const subs = [];
    [[A, B, refA, -1, 90, [210, 330], iA, [0, 0, 0]], [B, A, refB, 1, 270, [30, 150], iB, [1, 0, 0]]].forEach(([c, autre, ref, sx, a0, as, ic, o]) => {
      const libres = S.voisins(mol, c).filter(v => v !== autre && v !== ref);
      const m = S.placer(mol, c, new Map([[autre, [-sx, 0, 0]], [ref, tet(sx, a0)]]), libres, as.map(a => tet(sx, a)));
      m.forEach((d, j) => {
        if (j === autre) return;
        const e = S.etiquette(mol, j, c), L = mol.at[j].el === 'H' ? 0.85 : 1;
        const id = ajout({ t: e, gauche: S.aGauche(e), etiq: true, parent: ic, atome: j }, add(o, mul(d, L)));
        liaisons.push({ a: ic, b: id, ordre: S.ordreLiaison(mol, c, j), arriere: c === B });
        subs.push(id);
      });
    });
    const M = { noeuds, liaisons }, Pb = centrer(P), TILT = 22 * RAD;
    const P0 = Pb.map(p => rot(p, [0, 0, 0], [0, 1, 0], TILT));      // léger pivot : coin et hachures ne se superposent pas
    const etapes = [];
    const nomL = `C${num(A)}–C${num(B)}`;
    etapes.push({ legende: `Représentation de Cram centrée sur la liaison ${nomL}.`, duree: 1.6, f: () => projeter(M, P0) });
    // rotation de 90° autour de l'axe vertical : on regarde dans l'axe B → A (A devant)
    const c0 = mul(add(P0[iA], P0[iB]), 0.5);
    const tourne = t => P0.map(p => rot(p, c0, [0, 1, 0], -(Math.PI / 2 + TILT) * ease(t)));
    etapes.push({ legende: `On fait tourner la molécule pour regarder dans l’axe de la liaison ${nomL} : l’atome C${num(A)} vient devant.`, duree: 2.4, f: t => projeter(M, tourne(t)) });
    const Pf = tourne(1), cx = Pf[iA][0] * SC, cy = -Pf[iA][1] * SC, R = 34;
    const newmanFrame = (t) => {
      const fr = projeter(M, Pf, { plat: true });
      fr.noeuds[iA].op = 1 - t; fr.noeuds[iB].op = 0;
      fr.liaisons.forEach(l => {
        if ((l.a === iA && l.b === iB) || (l.a === iB && l.b === iA)) { l.op = 0; return; }
        if (M.liaisons.find(x => x.a === l.a && x.b === l.b).arriere) { l.depA = R * t; l.z = -5; }
      });
      fr.cercles = [{ x: cx, y: cy, r: R, op: t }];
      fr.points = [{ x: cx, y: cy, op: t }];
      return fr;
    };
    etapes.push({ legende: 'L’atome de derrière est masqué : on le représente par un cercle. Représentation de Newman (conformation décalée anti).', duree: 2.0, f: t => newmanFrame(ease(t)) });
    // rotation autour de la liaison : conformations
    const iBsubs = subs.filter(id => M.liaisons.find(l => l.b === id).arriere);
    const axeV = norm(sub(Pf[iA], Pf[iB]));
    etapes.push({
      legende: 'Rotation autour de la liaison : on passe par les conformations éclipsées et décalées.',
      duree: 4.5, f: t => {
        const a = 2 * Math.PI * ease(t), Pt = Pf.map((p, k) => (iBsubs.includes(k) ? rot(p, Pf[iB], axeV, a) : p));
        const fr = projeter(M, Pt, { plat: true });
        fr.noeuds[iA].op = 0; fr.noeuds[iB].op = 0;
        fr.liaisons.forEach(l => {
          if ((l.a === iA && l.b === iB) || (l.a === iB && l.b === iA)) { l.op = 0; return; }
          if (M.liaisons.find(x => x.a === l.a && x.b === l.b).arriere) { l.depA = R; l.z = -5; }
        });
        fr.cercles = [{ x: cx, y: cy, r: R, op: 1 }]; fr.points = [{ x: cx, y: cy, op: 1 }];
        return fr;
      }
    });
    return { etapes, ok: true };
  }

  // ───────── Fischer → Haworth (oses) ─────────
  function fischerHaworth(mol, opt = {}) {
    const hp = V.haworthPossible(mol);
    if (!hp) return { erreur: 'Cette animation concerne les oses (glucose, galactose, mannose, ribose, fructose…).' };
    const { f, type } = hp, ch = f.chaine, n = ch.length, anom = type === 'aldose' ? 0 : 1;
    const cycle = opt.cycle || (type === 'aldose' && n >= 6 ? 'pyranose' : 'furanose');
    const ferm = anom + (cycle === 'pyranose' ? 4 : 3);
    if (ferm > n - 1) return { erreur: 'Ce cycle n’est pas possible pour cet ose.' };
    const beta = opt.anomere === 'beta';
    const cote = q => { const x = f.cotes.find(y => y.c === ch[q]); return x ? (S.etiquette(mol, x.d, x.c) === 'OH' ? 'd' : 'g') : null; };
    const D = cote(ferm) === 'd';
    // éléments : un noeud par atome de carbone de la chaîne + substituants
    const noeuds = [], liaisons = [], K = [];   // K[k] = positions [x,y] aux 5 images clés (unités px)
    const dy = 60, bras = 48;
    const fx = q => [0, q * dy];                                   // Fischer
    const rotC = p => [-p[1], p[0]];                                // rotation de 90° (sens horaire à l'écran)
    const G = cycle === 'pyranose'
      ? [[330, 190], [250, 250], [120, 250], [40, 190], [120, 120], [250, 120]]
      : [[315, 190], [245, 255], [125, 255], [55, 190], [185, 128]];
    const ringC = []; for (let q = anom; q <= ferm; q++) ringC.push(q);
    const hw = q => { const k = ringC.indexOf(q); return G[k].map((v, i) => v - (i ? 185 : 185)); };
    const posO = G[G.length - 1].map(v => v - 185);
    const ajout = (nd, kf) => { noeuds.push(nd); K.push(kf); return noeuds.length - 1; };
    const ids = {};
    // atomes de carbone de la chaîne
    ch.forEach((k, q) => {
      const p0 = fx(q), p1 = rotC(p0);
      let p2, p3;
      if (ringC.includes(q)) { p2 = hw(q); p3 = p2; }
      else if (q < anom) { const a = hw(anom); p2 = [a[0], a[1] + 46 * (beta ? 1 : -1) * -1]; p3 = p2; }     // C1 du cétose : substituant de l'anomère
      else { const c = hw(ferm); const haut = D; p2 = [c[0], c[1] - (haut ? 46 : -46)]; if (q > ferm + 1) p2 = [p2[0] - 40, p2[1]]; p3 = p2; }
      const term = q === 0 || q === n - 1;
      const t0 = term ? S.etiquette(mol, k, ch[q === 0 ? 1 : q - 1]) : '';
      ids['c' + q] = ajout({ q, t: [t0, t0, ringC.includes(q) && t0 === 'CHO' ? '' : t0, '', ''] }, [p0, p1, p2, p3, p3]);
    });
    // C1 de l'aldose : CHO → C (=O) → C–OH
    // substituants horizontaux (Fischer) des atomes internes
    for (let q = 1; q < n - 1; q++) {
      const x = f.cotes.find(y => y.c === ch[q]);
      if (!x) { // C=O du cétose
        const o = S.voisins(mol, ch[q]).find(v => v !== ch[q - 1] && v !== ch[q + 1]);
        const p0 = [bras * 0.8, q * dy], p1 = rotC(p0), a = hw(q), up = beta === D;    // OH de l'anomère
        const p3 = [a[0], a[1] + (up ? -46 : 46)];
        ids.oAnom = ajout({ t: ['O', 'O', 'O', 'O', 'OH'], double: true }, [p0, p1, [a[0] + 30, a[1] - 30], [a[0] + 30, a[1] - 30], p3]);
        liaisons.push({ a: ids['c' + q], b: ids.oAnom, kind: 'carbonyle' });
        continue;
      }
      [['g', -1], ['d', 1]].forEach(([s, sg]) => {
        const j = x[s], e = S.etiquette(mol, j, x.c);
        const p0 = [sg * bras, q * dy], p1 = rotC(p0);
        let p2, p3, t3 = e;
        if (q === ferm && e === 'OH') {     // OH du carbone de fermeture → atome O du cycle
          p2 = hw(q).map((v, i) => v + (i ? 46 : 0) * (sg > 0 ? 1 : -1));   // d'abord en bas (droite) ou en haut
          p3 = posO; t3 = 'O';
          ids.oCycle = ajout({ t: [e, e, e, 'O', 'O'] }, [p0, p1, p2, p3, p3]);
          liaisons.push({ a: ids['c' + q], b: ids.oCycle });
          return;
        }
        if (q === ferm) {                   // H du carbone de fermeture : d'abord de son côté Fischer, puis opposé au groupe exocyclique
          const c = hw(q); p2 = [c[0], c[1] + (s === 'd' ? 46 : -46)]; p3 = [c[0], c[1] + (D ? 30 : -46)];
        } else if (ringC.includes(q)) {
          const c = hw(q), bas = (s === 'd');            // droite → bas
          const interieur = (c[1] < -25 && !bas) || (c[1] > 35 && !bas ? false : (c[1] > 35 && !bas));
          const L = (c[1] > 35 && !bas) || (c[1] < -25 && bas) ? 30 : 46;
          p2 = [c[0], c[1] + (bas ? L : -L)]; p3 = p2;
        } else {                            // au-delà du cycle (C5 d'un hexose en furanose)
          const c = K[ids['c' + q]][2]; p2 = [c[0] + sg * 34, c[1]]; p3 = p2;
        }
        const id = ajout({ t: [e, e, e, e, e] }, [p0, p1, p2, p3, p3]);
        liaisons.push({ a: ids['c' + q], b: id });
      });
    }
    // aldose : O et H de l'aldéhyde (apparaissent à l'étape 3)
    if (type === 'aldose') {
      const a = hw(0), up = beta === D;
      ids.oAnom = ajout({ t: ['', '', 'O', 'O', 'OH'], double: true }, [[0, 0], [0, 0], [a[0] + 30, a[1] - 30], [a[0] + 30, a[1] - 30], [a[0], a[1] + (up ? -46 : 46)]]);
      ids.hAnom = ajout({ t: ['', '', 'H', 'H', 'H'] }, [[0, 0], [0, 0], [a[0] + 30, a[1] + 30], [a[0] + 30, a[1] + 30], [a[0], a[1] + (up ? 46 : -46)]]);
      liaisons.push({ a: ids.c0, b: ids.oAnom, kind: 'carbonyle', des: 2 }, { a: ids.c0, b: ids.hAnom, des: 2 });
    } else {
      // C1 (CH2OH) du cétose : substituant de l'anomère, opposé au OH
      const a = hw(anom), up = beta === D;
      K[ids.c0][2] = [a[0] + 34, a[1] + (up ? 30 : -30)]; K[ids.c0][3] = K[ids.c0][2]; K[ids.c0][4] = [a[0], a[1] + (up ? 46 : -46)];
      noeuds[ids.c0].t = ['CH2OH', 'CH2OH', 'CH2OH', 'CH2OH', 'CH2OH'];
    }
    // groupe exocyclique du carbone de fermeture
    if (ferm < n - 1) {
      const c = hw(ferm), haut = D, exo = ferm + 1 === n - 1 ? 'CH2OH' : 'CHOH–CH2OH';
      const id = ids['c' + (ferm + 1)];
      K[id][2] = [c[0] - 50, c[1]]; K[id][3] = [c[0], c[1] + (haut ? -46 : 46)]; K[id][4] = K[id][3];
      noeuds[id].t = [noeuds[id].t[0], noeuds[id].t[1], exo === 'CH2OH' ? 'HOH2C' : exo, exo, exo];
      // atomes au-delà : cachés après l'étape 2
      for (let q = ferm + 2; q < n; q++) { const j = ids['c' + q]; K[j][2] = K[id][2]; K[j][3] = K[j][4] = K[id][3]; noeuds[j].cache = 2; }
      // substituants des atomes au-delà du carbone de fermeture : cachés
      noeuds.forEach((nd, k) => { if (nd.q === undefined && liaisons.some(l => l.b === k && noeuds[l.a].q > ferm)) nd.cache = 2; });
    }
    // chaîne : liaisons entre atomes de carbone
    for (let q = 0; q + 1 < n; q++) liaisons.push({ a: ids['c' + q], b: ids['c' + (q + 1)], chaine: q });
    liaisons.push({ a: ids.oCycle, b: ids['c' + anom], fermeture: true });
    const nk = 5;
    const frame = (k0, t) => {
      const k1 = Math.min(nk - 1, k0 + 1), e = ease(t);
      const N = noeuds.map((nd, k) => {
        let a = K[k][k0], b = K[k][k1];
        if (k0 === 0 && k1 === 1) { const an = e * Math.PI / 2, p = K[k][0]; a = b = [p[0] * Math.cos(an) - p[1] * Math.sin(an), p[0] * Math.sin(an) + p[1] * Math.cos(an)]; }
        const txt = e < 0.5 ? nd.t[k0] : nd.t[k1];
        let op = 1; if (nd.cache !== undefined && k0 >= nd.cache) op = 0; else if (nd.cache !== undefined && k1 >= nd.cache) op = 1 - e;
        return { x: lerp(a[0], b[0], e), y: lerp(a[1], b[1], e), t: txt, op, anc: 'middle' };
      });
      const L = liaisons.map(l => {
        let op = 1, style = 'ligne';
        if (l.des !== undefined) op = k0 + (k1 > k0 ? e : 0) >= l.des ? Math.min(1, (k0 + e - l.des + 1)) : 0;
        if (l.des !== undefined && k0 >= l.des) op = 1;
        if (l.fermeture) op = k0 >= 4 ? 1 : (k1 === 4 ? e : 0);
        if (l.kind === 'carbonyle') style = (k0 >= 3 && k1 === 4 && e > 0.5) || k0 >= 4 ? 'ligne' : (k0 >= 1 || type === 'cetose' || true) ? 'double' : 'ligne';
        if (N[l.a].op < 0.05 || N[l.b].op < 0.05) op = Math.min(op, Math.min(N[l.a].op, N[l.b].op));
        // cycle en perspective : bord avant épais à la fin
        if (k0 >= 2 && l.chaine !== undefined) { const pa = K[l.a][2], pb = K[l.b][2]; if (pa[1] > 0 && pb[1] > 0 && (pa[1] > 40 || pb[1] > 40) && ringC.includes(l.chaine) && ringC.includes(l.chaine + 1)) style = 'epais'; }
        return { a: l.a, b: l.b, style, op };
      });
      // le C1 de l'aldose : 'CHO' en Fischer, puis atome de carbone implicite
      return { noeuds: N, liaisons: L };
    };
    const nomOse = cycle === 'pyranose' ? 'pyranose' : 'furanose';
    const etapes = [
      { legende: 'Projection de Fischer de l’ose (chaîne ouverte).', duree: 1.6, f: () => frame(0, 0) },
      { legende: 'On couche la chaîne vers la droite (rotation de 90°) : les groupes situés à droite en Fischer se retrouvent en bas.', duree: 2.4, f: t => frame(0, t) },
      { legende: 'On replie la chaîne en cycle, vu en perspective : les groupes du bas restent en bas, ceux du haut restent en haut.', duree: 2.6, f: t => frame(1, t) },
      { legende: `Rotation autour de la liaison C${ferm}–C${ferm + 1} : le groupe OH du C${ferm + 1} vient se placer dans le cycle, le groupe ${ferm < n - 1 ? (ferm + 1 === n - 1 ? 'CH2OH' : 'exocyclique') : 'H'} part vers le ${D ? 'haut' : 'bas'}.`, duree: 2.4, f: t => frame(2, t) },
      { legende: `L’atome d’oxygène du C${ferm + 1} se lie au C${anom + 1} (hémiacétal) : fermeture du cycle ${nomOse}. Le nouveau groupe OH du C${anom + 1} (anomère) est ${beta ? 'du même côté que' : 'du côté opposé au'} groupe ${ferm < n - 1 ? 'CH2OH' : ''} de référence : anomère ${beta ? 'β' : 'α'}.`, duree: 2.6, f: t => frame(3, t) },
      { legende: `Représentation de Haworth : ${beta ? 'β' : 'α'}-${f.serie || ''}-${type === 'aldose' ? 'aldose' : 'cétose'} en forme ${nomOse}.`.replace('--', '-'), duree: 1.8, f: () => frame(4, 0) }
    ];
    return { etapes, ok: true };
  }

  // boîte englobante de toutes les images (pour un cadre fixe)
  function boiteGlobale(etapes) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    etapes.forEach(e => { for (let k = 0; k <= 10; k++) { const fr = e.f(k / 10); fr.noeuds.forEach(nd => { if (nd.op < 0.05 || !nd.t) { if (nd.op < 0.05) return; } const w = larg(nd.t || '') / 2 + 6; x0 = Math.min(x0, nd.x - w); x1 = Math.max(x1, nd.x + w); y0 = Math.min(y0, nd.y - 14); y1 = Math.max(y1, nd.y + 14); }); (fr.cercles || []).forEach(c => { x0 = Math.min(x0, c.x - c.r); x1 = Math.max(x1, c.x + c.r); }); } });
    const pad = 16; return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
  }

  return { cramFischer, cramNewman, fischerHaworth, dessiner, boiteGlobale };
})();
if (typeof module !== 'undefined') module.exports = Anim;
