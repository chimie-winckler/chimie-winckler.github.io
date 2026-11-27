/* Repris de « Formules des molécules » (Schématisation en physique-chimie), © 2026 Gaëtan PORTIER, licence MIT.
   https://forge.apps.education.fr/schemas-physique-chimie — fichier non modifié. */
// ═══════════════════════════════════════════════════════════════════
// Géométrie 3D : forme d'une molécule, en Å, H compris. VSEPR pour placer
// les H implicites, puis relaxation par ressorts (longueurs, angles,
// planéité, encombrement). Aucun accès au DOM (testable sous Node, voir
// outils/test-geometrie3d.js).
//   · Geometrie3D.calculer(an, comp) → { ok, atomes, liaisons, rayon }
//                                      ou { ok: false, raison }
//   · Geometrie3D.vsepr(an, k)       → { n, m, S, angle }
//   · Geometrie3D.pivoter(R, ax, ay) → nouvelle orientation après un glissement
//
// an : résultat de Chimie.analyser, dont les atomes ont les x, y du dessin
// (en longueurs de liaison) ; comp : un élément de an.composantes.
// atomes : [{ el, k, porteur, p: [x, y, z] }] ; k : indice dans an.atomes,
// null pour un H implicite ; porteur : indice dans atomes de l'atome qui
// porte ce H. liaisons : [{ a, b, ordre, plan }] ; plan : pour une liaison
// multiple, vecteur unitaire perpendiculaire à la liaison, dans le plan des
// substituants. Repère : centré sur la molécule, x à droite, y en bas
// (comme le dessin), z vers l'observateur.
// ═══════════════════════════════════════════════════════════════════

'use strict';

const Geometrie3D = (() => {
  const RAD = Math.PI / 180;
  const ECHELLE = 1.5;                  // une liaison du dessin représente 1,5 Å
  const ITERATIONS = 1500, PAS = 0.1, PAS_MAX = 0.1;
  const REPULSION = 0.05;               // faible : décale les liaisons sans trop ouvrir les angles

  // 📌 Rayons covalents simples (Å), en repli si un couple manque dans LONGUEURS
  const RCOV = { H: 0.32, B: 0.85, C: 0.75, N: 0.71, O: 0.63, F: 0.64, Si: 1.16, P: 1.11, S: 1.03, Cl: 0.99, Br: 1.14, I: 1.33 };
  // 📌 Rayons de van der Waals (Å) : Bondi ; B : Mantina
  const RVDW = { H: 1.20, B: 1.92, C: 1.70, N: 1.55, O: 1.52, F: 1.47, Si: 2.10, P: 1.80, S: 1.80, Cl: 1.75, Br: 1.85, I: 1.98 };
  // 📌 Longueurs usuelles (Å) : éléments dans l'ordre alphabétique + ordre de liaison.
  //    Table de Wired Chemist (d'après Huheey), sauf S–O simple, qui n'y figure pas.
  const LONGUEURS = {
    'C-H1': 1.09, 'H-N1': 1.01, 'H-O1': 0.96, 'H-S1': 1.34, 'H-P1': 1.44, 'H-H1': 0.74, 'F-H1': 0.92,
    'Cl-H1': 1.27, 'Br-H1': 1.41, 'H-I1': 1.61, 'H-Si1': 1.48, 'B-H1': 1.19,
    'C-C1': 1.54, 'C-C2': 1.34, 'C-C3': 1.20, 'C-N1': 1.47, 'C-N2': 1.29, 'C-N3': 1.16, 'C-O1': 1.43, 'C-O2': 1.20,
    'C-F1': 1.35, 'C-Cl1': 1.77, 'Br-C1': 1.94, 'C-I1': 2.14, 'C-S1': 1.82, 'C-S2': 1.60, 'C-P1': 1.84, 'C-Si1': 1.85,
    'N-N1': 1.45, 'N-N2': 1.25, 'N-N3': 1.10, 'N-O1': 1.40, 'N-O2': 1.21, 'O-O1': 1.48, 'O-O2': 1.21,
    'O-S1': 1.57, 'O-S2': 1.43, 'O-P1': 1.63, 'O-P2': 1.50, 'Cl-Cl1': 1.99, 'Br-Br1': 2.28, 'I-I1': 2.67, 'F-F1': 1.42, 'S-S1': 2.05
  };

  // ── Vecteurs ───────────────────────────────────────────────────────
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const unit = a => mul(a, 1 / (len(a) || 1));
  // Perpendiculaire à u dans le plan du dessin (xy)
  const perpPlan = u => (Math.hypot(u[0], u[1]) > 1e-3 ? unit([-u[1], u[0], 0]) : [1, 0, 0]);
  // Petit décalage en z, pseudo-aléatoire mais toujours le même (forme reproductible)
  const bruit = i => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return (s - Math.floor(s) - 0.5) * 0.2; };
  const cle = (a, b) => (a < b ? a + '-' + b : b + '-' + a);

  // ── Type VSEPR : n voisins (H implicites compris), m doublets (paires + électron seul)
  function vsepr(an, k) {
    const n = an.voisins[k].length + an.H[k];
    const d = an.doublets[k];
    const m = n > 0 ? d.paires + d.seul : 0;
    const S = n + m;
    let angle = null;
    if (n >= 2) {
      if (S === 2) angle = 180;
      else if (S === 3) angle = 120;
      else if (S === 4) angle = m === 0 ? 109.47 : m === 1 ? 107 : 104.5;   // angles réels AX3E, AX2E2
    }
    return { n, m, S, angle };
  }

  function longueur(e1, e2, ordre, aro) {
    const c = [e1, e2].sort().join('-');
    if (aro) {
      if (c === 'C-C') return 1.39;
      const s = LONGUEURS[c + 1], d = LONGUEURS[c + 2];
      if (s && d) return (s + d) / 2;
    }
    return LONGUEURS[c + ordre] || (RCOV[e1] || 0.75) + (RCOV[e2] || 0.75) - (ordre - 1) * 0.12;
  }

  // Plus petit cycle passant par la liaison a–b (atomes dans l'ordre du cycle), ou null
  function cycleMin(vois, a, b, max) {
    const prec = new Map([[a, -1]]), file = [a];
    while (file.length) {
      const x = file.shift();
      for (const y of vois[x]) {
        if ((x === a && y === b) || prec.has(y)) continue;
        prec.set(y, x);
        if (y === b) {
          const c = [b];
          for (let z = x; z !== -1; z = prec.get(z)) c.push(z);
          return c.length <= max ? c : null;
        }
        file.push(y);
      }
    }
    return null;
  }
  function trouverCycles(vois, liaisons) {
    const vus = new Set(), cycles = [];
    liaisons.forEach(l => {
      const c = cycleMin(vois, l.a, l.b, 8);
      if (!c) return;
      const k = c.slice().sort((x, y) => x - y).join(',');
      if (!vus.has(k)) { vus.add(k); cycles.push(c); }
    });
    return cycles;
  }

  // Directions libres autour d'un atome de type t, dont les voisins déjà placés
  // sont dans les directions us ; anti : direction à éviter (conformation décalée)
  function directionsLibres(t, us, h, anti) {
    const e = us.length, S = t.S;
    let d = [];
    if (e === 0) {
      if (S === 4) {
        const c = 1 / 3, s = 2 * Math.SQRT2 / 3;
        const bas = [90, 210, 330].map(f => [s * Math.cos(f * RAD), c, s * Math.sin(f * RAD)]);
        if (t.n === 4) d = [[0, -1, 0]].concat(bas);              // CH4 : un H en haut, trois en bas
        else if (t.n === 3) d = bas;                              // NH3 : doublet en haut
        else if (t.n === 2) d = [[-0.8165, 0.5774, 0], [0.8165, 0.5774, 0]];   // H2O : dans le plan de l'écran
        else d = [[1, 0, 0]];
      } else if (S === 3) d = [-90, 30, 150].map(f => [Math.cos(f * RAD), Math.sin(f * RAD), 0]);
      else d = [[1, 0, 0], [-1, 0, 0]];
    } else if (e === 1) {
      const u = us[0];
      let p = perpPlan(u);
      if (anti && dot(p, anti) > 0) p = mul(p, -1);
      if (S === 4) {
        const q = cross(u, p), c = -1 / 3, s = 2 * Math.SQRT2 / 3;
        d = [0, 120, 240].map(f => add(mul(u, c), add(mul(p, s * Math.cos(f * RAD)), mul(q, s * Math.sin(f * RAD)))));
      } else if (S === 3) d = [120, 240].map(f => add(mul(u, Math.cos(f * RAD)), mul(p, Math.sin(f * RAD))));
      else d = [mul(u, -1)];
    } else if (e === 2) {
      const [u1, u2] = us, somme = add(u1, u2);
      const b = len(somme) > 0.1 ? unit(mul(somme, -1)) : perpPlan(u1);
      if (S === 4) {
        let n = cross(u1, u2);
        n = len(n) > 0.1 ? unit(n) : [0, 0, 1];
        if (n[2] < 0) n = mul(n, -1);
        const a = 54.74 * RAD;
        d = [add(mul(b, Math.cos(a)), mul(n, Math.sin(a))), add(mul(b, Math.cos(a)), mul(n, -Math.sin(a)))];
      } else d = [b];
    } else {
      const s = us.reduce(add, [0, 0, 0]);
      if (len(s) > 0.3) d = [unit(mul(s, -1))];
      else {
        let n = unit(cross(sub(us[0], us[1]), sub(us[0], us[2])));
        if (n[2] < 0) n = mul(n, -1);                            // vers l'observateur, comme un coin de Cram
        d = [n];
      }
    }
    return d.slice(0, h);
  }

  // ── Construction et relaxation ─────────────────────────────────────
  function construire(an, comp) {
    if (comp.some(k => an.erreur[k])) return { ok: false, raison: 'valence' };
    const types = new Map();
    for (const k of comp) {
      const t = vsepr(an, k);
      if (t.S > 4 && t.n >= 2) return { ok: false, raison: 'geometrie-5-6' };
      types.set(k, t);
    }
    // 1. Atomes du dessin à leur place ; z = 0 pour les atomes plans ou linéaires
    const atomes = [], type = [], ind = new Map();
    comp.forEach(k => {
      const a = an.atomes[k], t = types.get(k);
      ind.set(k, atomes.length);
      atomes.push({ el: a.el, k, porteur: null, p: [(a.x || 0) * ECHELLE, (a.y || 0) * ECHELLE, t.S === 2 || t.S === 3 ? 0 : bruit(atomes.length)] });
      type.push(t);
    });
    const liaisons = [];
    comp.forEach(k => an.voisins[k].forEach(v => { if (k < v.j) liaisons.push({ a: ind.get(k), b: ind.get(v.j), ordre: v.ordre }); }));
    const vois = atomes.map(() => []);
    liaisons.forEach(l => { vois[l.a].push(l.b); vois[l.b].push(l.a); });

    // 2. Cycles : graine de chaise (6 atomes tétraédriques), benzène écrit en Kekulé
    const cycles = trouverCycles(vois, liaisons);
    cycles.filter(c => c.length === 6 && c.every(i => type[i].S === 4))
      .forEach(c => c.forEach((i, r) => { atomes[i].p[2] = r % 2 ? 0.25 : -0.25; }));
    //   cycle aromatique : 6 atomes trigonaux, chacun doublement lié à un atome d'un tel cycle
    const liaison = (x, y) => liaisons.find(l => (l.a === x && l.b === y) || (l.a === y && l.b === x));
    const plans6 = cycles.filter(c => c.length === 6 && c.every(i => type[i].S === 3));
    const dansPlans6 = new Set([].concat(...plans6));
    const aro = new Set();
    plans6.forEach(c => {
      if (!c.every(x => vois[x].some(y => dansPlans6.has(y) && liaison(x, y).ordre === 2))) return;
      c.forEach((x, r) => aro.add(liaison(x, c[(r + 1) % 6])));
    });
    const memeCycle = new Set();
    cycles.forEach(c => c.forEach(a => c.forEach(b => memeCycle.add(cle(a, b)))));

    // 3. H implicites dans les directions libres du polyèdre VSEPR
    comp.forEach(k => {
      const h = an.H[k];
      if (!h) return;
      const i = ind.get(k), pi = atomes[i].p;
      const us = vois[i].map(j => unit(sub(atomes[j].p, pi)));
      let anti = null;
      if (vois[i].length === 1) {
        const j = vois[i][0], w = vois[j].find(x => x !== i);
        if (w !== undefined) anti = sub(atomes[w].p, atomes[j].p);
      }
      const dH = longueur(atomes[i].el, 'H', 1);
      directionsLibres(type[i], us, h, anti).forEach(d => {
        const n = atomes.length;
        atomes.push({ el: 'H', k: null, porteur: i, p: add(pi, mul(d, dH)) });
        type.push({ n: 1, m: 0, S: 1, angle: null });
        liaisons.push({ a: i, b: n, ordre: 1 });
        vois[i].push(n); vois.push([i]);
      });
    });

    // 4. Contraintes : [a, b, distance cible, raideur]
    const P = atomes.map(a => a.p);
    const ressorts = liaisons.map(l => [l.a, l.b, longueur(atomes[l.a].el, atomes[l.b].el, l.ordre, aro.has(l)), 1]);
    const d0 = new Map(ressorts.map(r => [cle(r[0], r[1]), r[2]]));
    const proches = new Set(d0.keys());
    atomes.forEach((_, i) => {
      const t = type[i], v = vois[i];
      if (t.angle === null || v.length < 2) return;
      for (let x = 0; x < v.length; x++) for (let y = x + 1; y < v.length; y++) {
        if (d0.has(cle(v[x], v[y]))) continue;                                   // cycle à 3 : déjà lié
        const carre = vois[v[x]].some(z => z !== i && vois[v[y]].includes(z));   // cycle à 4 : 90°
        const c = Math.cos((carre ? 90 : t.angle) * RAD);
        const a = d0.get(cle(i, v[x])), b = d0.get(cle(i, v[y]));
        ressorts.push([v[x], v[y], Math.sqrt(a * a + b * b - 2 * a * b * c), 1]);   // angle par la distance 1-3
        proches.add(cle(v[x], v[y]));
      }
    });
    const plans = [];                                   // atome trigonal dans le plan de ses 3 voisins
    atomes.forEach((_, i) => { if (type[i].S === 3 && vois[i].length === 3) plans.push([i].concat(vois[i])); });
    liaisons.forEach(l => {                             // entre deux atomes trigonaux : 6 atomes coplanaires (Z/E du dessin)
      if (type[l.a].S !== 3 || type[l.b].S !== 3) return;
      vois[l.a].filter(x => x !== l.b).forEach(X => vois[l.b].filter(y => y !== l.a).forEach(Y => plans.push([Y, X, l.a, l.b])));
    });
    const loin = [];                                    // encombrement : atomes séparés par 3 liaisons ou plus
    for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) {
      if (!proches.has(cle(a, b)) && !memeCycle.has(cle(a, b))) loin.push([a, b, (RVDW[atomes[a].el] || 1.7) + (RVDW[atomes[b].el] || 1.7)]);
    }

    // 5. Relaxation : descente de gradient à pas borné
    const F = P.map(() => [0, 0, 0]);
    const tirer = (a, b, cible, k) => {
      const v = sub(P[b], P[a]), d = len(v) || 1e-9, f = k * (d - cible) / d;
      for (let c = 0; c < 3; c++) { F[a][c] += v[c] * f; F[b][c] -= v[c] * f; }
    };
    const aplanir = (i, a, b, c) => {
      let n = cross(sub(P[b], P[a]), sub(P[c], P[a]));
      const ln = len(n);
      if (ln < 1e-6) return;
      n = mul(n, 1 / ln);
      const h = dot(sub(P[i], P[a]), n);
      for (let z = 0; z < 3; z++) { F[i][z] -= n[z] * h; F[a][z] += n[z] * h / 3; F[b][z] += n[z] * h / 3; F[c][z] += n[z] * h / 3; }
    };
    for (let it = 0; it < ITERATIONS; it++) {
      F.forEach(f => { f[0] = 0; f[1] = 0; f[2] = 0; });
      ressorts.forEach(r => tirer(r[0], r[1], r[2], r[3]));
      loin.forEach(r => { if (len(sub(P[r[1]], P[r[0]])) < r[2]) tirer(r[0], r[1], r[2], REPULSION); });
      plans.forEach(q => aplanir(q[0], q[1], q[2], q[3]));
      P.forEach((p, i) => {
        const n = len(F[i]) * PAS, s = n > PAS_MAX ? PAS_MAX / n : 1;
        for (let c = 0; c < 3; c++) p[c] += F[i][c] * PAS * s;
      });
    }

    // 6. Centrage ; « plan » des liaisons multiples (écart des bâtons parallèles)
    const g = mul(P.reduce(add, [0, 0, 0]), 1 / P.length);
    P.forEach(p => { p[0] -= g[0]; p[1] -= g[1]; p[2] -= g[2]; });
    liaisons.forEach(l => {
      if (l.ordre < 2) return;
      const ax = unit(sub(P[l.b], P[l.a]));
      let ref = null;
      for (const [i, j] of [[l.a, l.b], [l.b, l.a]]) {
        for (const x of vois[i]) {
          if (x === j) continue;
          const w = sub(P[x], P[i]), perp = sub(w, mul(ax, dot(w, ax)));
          if (len(perp) > 0.1) { ref = unit(perp); break; }
        }
        if (ref) break;
      }
      l.plan = ref || unit(cross(ax, Math.abs(ax[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
    });
    return { ok: true, atomes, liaisons, rayon: Math.max(...P.map(len)) };
  }

  // ── Rotation : matrices 3×3 en 9 nombres, repère de l'écran ────────
  const produit = (A, B) => [0, 1, 2].flatMap(i => [0, 1, 2].map(j => A[3 * i] * B[j] + A[3 * i + 1] * B[3 + j] + A[3 * i + 2] * B[6 + j]));
  const rotY = t => [Math.cos(t), 0, Math.sin(t), 0, 1, 0, -Math.sin(t), 0, Math.cos(t)];
  const rotX = t => [1, 0, 0, 0, Math.cos(t), Math.sin(t), 0, -Math.sin(t), Math.cos(t)];
  // Glisser de ax radians vers la droite et ay vers le bas à partir de l'orientation R :
  // l'avant de la molécule suit le geste
  const pivoter = (R, ax, ay) => produit(rotX(ay), produit(rotY(ax), R));

  // ── Cache : la rotation ne relance jamais le calcul ────────────────
  const cache = new Map();
  function calculer(an, comp) {
    const c = comp.map(k => {
      const a = an.atomes[k];
      return a.el + (a.charge || 0) + '@' + (a.x || 0).toFixed(2) + ',' + (a.y || 0).toFixed(2) + ':' + an.voisins[k].map(v => v.j + '/' + v.ordre).join(' ');
    }).join('|');
    if (!cache.has(c)) {
      if (cache.size > 200) cache.clear();
      cache.set(c, construire(an, comp));
    }
    return cache.get(c);
  }

  return { calculer, vsepr, pivoter, viderCache: () => cache.clear(), RVDW, ECHELLE };
})();

if (typeof module !== 'undefined') module.exports = Geometrie3D;
