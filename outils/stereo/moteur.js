/* Représentations spatiales — moteur (sans DOM)
   Lecture SMILES (sous-ensemble), H explicites, stéréocentres, priorités CIP, R/S,
   placement des substituants dans une géométrie imposée en respectant la configuration. */
const Stereo = (() => {
  const Z = { H: 1, B: 5, C: 6, N: 7, O: 8, F: 9, P: 15, S: 16, Cl: 17, Br: 35, I: 53 };
  const VAL = { B: 3, C: 4, N: 3, O: 2, P: 3, S: 2, F: 1, Cl: 1, Br: 1, I: 1 };

  // ── SMILES → molécule { at:[{el,ch}], li:[{a,b,o}], chir:{i:{ordre:[...],s:±1}} } ──
  function lireSmiles(src) {
    const s = src.trim(); if (!s) throw new Error('SMILES vide');
    const at = [], li = [], ordreV = [], hCrochet = [], chir = {}, cycles = {};
    let i = 0, prec = -1, ordreLiaison = 1;
    const pile = [];
    function lier(a, b, o) {
      li.push({ a, b, o });
      ordreV[a].push(b); ordreV[b].push(a);
    }
    function ajouter(el, opts) {
      const k = at.length; at.push({ el, ch: opts.ch || 0, arom: !!opts.arom, hx: opts.h, crochet: !!opts.crochet });
      ordreV.push([]); hCrochet.push(opts.h || 0);
      if (prec >= 0) lier(prec, k, ordreLiaison);
      if (opts.h && opts.crochet && opts.chir) ordreV[k].push('H');   // H implicite juste après l'atome précédent
      if (opts.chir) chir[k] = { s: opts.chir };
      prec = k; ordreLiaison = 1;
    }
    while (i < s.length) {
      const c = s[i];
      if (c === '(') { pile.push(prec); i++; continue; }
      if (c === ')') { prec = pile.pop(); i++; continue; }
      if (c === '-') { ordreLiaison = 1; i++; continue; }
      if (c === '=') { ordreLiaison = 2; i++; continue; }
      if (c === '#') { ordreLiaison = 3; i++; continue; }
      if (c === '/' || c === '\\' || c === '.') { i++; continue; }
      if (/[0-9%]/.test(c)) {
        let n; if (c === '%') { n = s.slice(i + 1, i + 3); i += 3; } else { n = c; i++; }
        if (cycles[n]) {
          const { a, o, pos } = cycles[n]; delete cycles[n];
          const ob = Math.max(o, ordreLiaison);
          li.push({ a, b: prec, o: ob });
          ordreV[a][pos] = prec; ordreV[prec].push(a);
        } else {
          cycles[n] = { a: prec, o: ordreLiaison, pos: ordreV[prec].length }; ordreV[prec].push(null);
        }
        ordreLiaison = 1; continue;
      }
      if (c === '[') {
        const j = s.indexOf(']', i); if (j < 0) throw new Error('crochet non fermé');
        const m = s.slice(i + 1, j).match(/^(\d*)([A-Z][a-z]?|[cnos])(@@|@)?(H\d*)?([+-]\d*)?$/);
        if (!m) throw new Error('atome illisible : [' + s.slice(i + 1, j) + ']');
        let el = m[2], arom = false; if (/^[cnos]$/.test(el)) { arom = true; el = el.toUpperCase(); }
        const h = m[4] ? (m[4].length > 1 ? +m[4].slice(1) : 1) : 0;
        let ch = 0; if (m[5]) ch = (m[5][0] === '+' ? 1 : -1) * (m[5].length > 1 ? +m[5].slice(1) : 1);
        ajouter(el, { h, ch, arom, crochet: true, chir: m[3] ? (m[3] === '@' ? 1 : -1) : 0 });
        i = j + 1; continue;
      }
      const two = s.slice(i, i + 2);
      if (two === 'Cl' || two === 'Br') { ajouter(two, {}); i += 2; continue; }
      if (/[BCNOPSFI]/.test(c)) { ajouter(c, {}); i++; continue; }
      if (/[cnops]/.test(c)) { ajouter(c.toUpperCase(), { arom: true }); i++; continue; }
      throw new Error('caractère inattendu : ' + c);
    }
    if (Object.keys(cycles).length) throw new Error('cycle non fermé');
    // aromatiques : liaisons alternées simples pour le comptage des H (1,5 → on compte 1 H par c aromatique avec 2 voisins)
    const mol = { at, li, chir: {} };
    // H explicites
    const n0 = at.length;
    for (let k = 0; k < n0; k++) {
      const a = at[k]; let nh;
      if (a.crochet) nh = hCrochet[k];
      else {
        const somme = li.filter(l => l.a === k || l.b === k).reduce((t, l) => t + l.o, 0);
        nh = Math.max(0, (VAL[a.el] || 0) - somme - (a.arom ? 1 : 0));
      }
      const ids = [];
      for (let q = 0; q < nh; q++) { const h = at.length; at.push({ el: 'H', ch: 0 }); li.push({ a: k, b: h, o: 1 }); ids.push(h); }
      if (chir[k]) {
        const ordre = ordreV[k].map(v => (v === 'H' ? ids[0] : v));
        if (ordre.length === 4 && ordre.every(v => v !== null && v !== undefined)) mol.chir[k] = { ordre, s: chir[k].s };
      }
    }
    preparer(mol);
    return mol;
  }

  function preparer(mol) {
    mol.v = mol.at.map(() => []);
    mol.li.forEach((l, k) => { mol.v[l.a].push({ j: l.b, o: l.o, k }); mol.v[l.b].push({ j: l.a, o: l.o, k }); });
  }
  const voisins = (mol, i) => mol.v[i].map(x => x.j);
  const ordreLiaison = (mol, a, b) => { const x = mol.v[a].find(y => y.j === b); return x ? x.o : 0; };

  // ── Priorités CIP (arbre hiérarchique, atomes dupliqués pour les liaisons multiples) ──
  function enfants(mol, noeud) {
    if (noeud.dup) return [];
    const r = [];
    mol.v[noeud.i].forEach(x => {
      if (x.j === noeud.p) { for (let q = 1; q < x.o; q++) r.push({ i: x.j, p: noeud.i, dup: true }); return; }
      r.push({ i: x.j, p: noeud.i, chemin: (noeud.chemin || []).concat(noeud.i) });
      for (let q = 1; q < x.o; q++) r.push({ i: x.j, p: noeud.i, dup: true });
    });
    return r.map(n => (n.chemin && n.chemin.includes(n.i)) ? { i: n.i, p: n.p, dup: true } : n);
  }
  const zN = (mol, n) => Z[mol.at[n.i].el] || 0;
  // compare deux branches issues du centre ; >0 si a prioritaire
  function comparer(mol, a, b) {
    const d = zN(mol, a) - zN(mol, b); if (d) return d;
    return comparerSuite(mol, [a], [b], 1);
  }
  function comparerSuite(mol, A, B, sph) {
    if (sph > 14) return 0;
    const suiv = L => {
      const out = [];
      L.forEach(n => { const g = enfants(mol, n).sort((x, y) => zN(mol, y) - zN(mol, x)); out.push(...g); for (let q = g.length; q < 3; q++) out.push(null); });
      return out;
    };
    const nA = suiv(A), nB = suiv(B);
    const fa = nA.map(n => (n ? zN(mol, n) : 0)), fb = nB.map(n => (n ? zN(mol, n) : 0));
    for (let q = 0; q < Math.max(fa.length, fb.length); q++) { const d = (fa[q] || 0) - (fb[q] || 0); if (d) return d; }
    const A2 = nA.filter(Boolean), B2 = nB.filter(Boolean);
    if (!A2.length && !B2.length) return 0;
    return comparerSuite(mol, A2, B2, sph + 1);
  }
  // voisins de c triés par priorité décroissante ; égalités signalées
  function priorites(mol, c) {
    const br = voisins(mol, c).map(j => ({ i: j, p: c, chemin: [c] }));
    const tri = br.slice().sort((x, y) => -comparer(mol, x, y));
    const egal = tri.some((x, q) => q && comparer(mol, tri[q - 1], x) === 0);
    return { ordre: tri.map(n => n.i), egal };
  }
  const estStereocentre = (mol, c) => mol.at[c].el === 'C' && mol.v[c].length === 4 && mol.v[c].every(x => x.o === 1) && !priorites(mol, c).egal;

  // ── parité ──
  function parite(perm) { // perm : tableau de 4 indices distincts (positions)
    let n = 0; const p = perm.slice();
    for (let a = 0; a < p.length; a++) for (let b = a + 1; b < p.length; b++) if (p[a] > p[b]) n++;
    return n % 2 ? -1 : 1;
  }
  // signe de la configuration pour un ordre donné de voisins (convention SMILES : @ = +1)
  function signePour(mol, c, ordre) {
    const ch = mol.chir[c]; if (!ch) return 0;
    return ch.s * parite(ordre.map(v => ch.ordre.indexOf(v)));
  }
  const det = (a, b, d) => a[0] * (b[1] * d[2] - b[2] * d[1]) - a[1] * (b[0] * d[2] - b[2] * d[0]) + a[2] * (b[0] * d[1] - b[1] * d[0]);
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  function signeGeo(v) { return Math.sign(det(sub(v[1], v[0]), sub(v[2], v[0]), sub(v[3], v[0]))); }
  // étalonnage : @ = depuis le premier voisin, les trois autres dans le sens trigonométrique
  const K = (() => {
    const t = [[0, 0, 1]], h = -1 / 3;
    [0, 120, 240].forEach(a => t.push([Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180), h]));
    return signeGeo(t);
  })();

  /* Place les voisins de c dans des positions 3D.
     fixes : Map voisin → vecteur ; libres : voisins restants ; places : vecteurs restants (même nombre).
     Renvoie Map voisin → vecteur respectant la configuration (si c est stéréogène). */
  function placer(mol, c, fixes, libres, places) {
    const perms = libres.length === 2 ? [[0, 1], [1, 0]] : libres.length === 1 ? [[0]] : libres.length === 3 ? [[0, 1, 2], [0, 2, 1]] : [[]];
    let choix = null;
    for (const p of perms) {
      const m = new Map(fixes); p.forEach((q, r) => m.set(libres[r], places[q]));
      if (!mol.chir[c] || m.size < 4) { choix = choix || m; if (!mol.chir[c]) break; continue; }
      const ordre = mol.chir[c].ordre;
      if (signeGeo(ordre.map(v => m.get(v))) * K === mol.chir[c].s) { choix = m; break; }
    }
    return choix;
  }

  // R/S d'un centre
  function descripteur(mol, c) {
    if (!mol.chir[c]) return '';
    const p = priorites(mol, c); if (p.egal) return '';
    const [a, b, d, e] = p.ordre;               // a > b > d > e
    return signePour(mol, c, [e, a, b, d]) === 1 ? 'R' : 'S';
  }
  function inverser(mol, c) { if (mol.chir[c]) mol.chir[c].s *= -1; }

  // centres stéréogènes : ceux marqués dans le SMILES + ceux détectés (on leur donne une configuration)
  function completerCentres(mol) {
    mol.at.forEach((a, c) => {
      if (a.el === 'H') return;
      const st = estStereocentre(mol, c);
      if (st && !mol.chir[c]) mol.chir[c] = { ordre: voisins(mol, c).slice(), s: 1 };
      if (!st && mol.chir[c]) delete mol.chir[c];
    });
  }

  // ── étiquettes condensées ──
  function formuleBrute(mol, debut, depuis) {
    const n = {}; const vu = new Set([depuis]);
    (function f(i) { if (vu.has(i)) return; vu.add(i); n[mol.at[i].el] = (n[mol.at[i].el] || 0) + 1; voisins(mol, i).forEach(f); })(debut);
    const ord = ['C', 'H'].concat(Object.keys(n).filter(e => e !== 'C' && e !== 'H').sort());
    return ord.filter(e => n[e]).map(e => e + (n[e] > 1 ? n[e] : '')).join('');
  }
  function nbH(mol, i) { return mol.v[i].filter(x => mol.at[x.j].el === 'H').length; }
  function lourds(mol, i, sauf) { return mol.v[i].filter(x => mol.at[x.j].el !== 'H' && x.j !== sauf); }
  function etiquette(mol, i, depuis) {
    const el = mol.at[i].el, h = nbH(mol, i), L = lourds(mol, i, depuis);
    const hs = h ? 'H' + (h > 1 ? h : '') : '';
    if (el === 'H') return 'H';
    if (!L.length) return el + hs;
    if (el === 'O' || el === 'S' || el === 'N') {
      if (L.length === 1 && mol.at[L[0].j].el === 'C' && lourds(mol, L[0].j, i).length === 0) return el + hs + 'CH' + nbH(mol, L[0].j);
      return el + hs + (L.length === 1 ? groupe(mol, L[0].j, i) : '');
    }
    if (el === 'C') {
      const o2 = L.find(x => x.o === 2 && mol.at[x.j].el === 'O'), n3 = L.find(x => x.o === 3 && mol.at[x.j].el === 'N');
      if (n3) return 'CN';
      if (o2) {
        const autres = L.filter(x => x !== o2);
        if (!autres.length) return h ? 'CHO' : 'CO';
        if (autres.length === 1) {
          const x = autres[0], ex = mol.at[x.j].el;
          if (ex === 'O' && nbH(mol, x.j) === 1) return 'COOH';
          if (ex === 'O') { const r = lourds(mol, x.j, i); return 'COO' + (r.length ? groupe(mol, r[0].j, x.j) : ''); }
          if (ex === 'N') return 'CONH' + (nbH(mol, x.j) > 1 ? 2 : '');
          if (ex === 'Cl') return 'COCl';
          return 'CO' + groupe(mol, x.j, i);
        }
      }
      // chaîne alkyle simple
      const sousArbre = formuleBrute(mol, i, depuis);
      if (/^C\d*H\d*$/.test(sousArbre) && estLineaire(mol, i, depuis)) {
        const nc = +(sousArbre.match(/^C(\d*)/)[1] || 1);
        if (nc === 1) return 'CH3';
        return 'C' + nc + 'H' + (2 * nc + 1);
      }
      if (L.length === 1 && L[0].o === 1) return 'C' + hs + groupe(mol, L[0].j, i);
      return sousArbre;
    }
    return formuleBrute(mol, i, depuis);
  }
  function groupe(mol, i, depuis) { const e = etiquette(mol, i, depuis); return /^(C\d*H\d*|CH3)$/.test(e) || /^[A-Z][a-z]?H?\d*$/.test(e) ? e : '(' + e + ')'; }
  function estLineaire(mol, i, depuis) {
    let p = depuis, c = i;
    for (;;) { const L = lourds(mol, c, p); if (L.some(x => x.o !== 1)) return false; if (!L.length) return true; if (L.length > 1) return false; p = c; c = L[0].j; }
  }
  // écriture « à gauche » : HO, H2N, H3C, HOOC…
  const INV = { OH: 'HO', NH2: 'H2N', CH3: 'H3C', COOH: 'HOOC', CHO: 'OHC', SH: 'HS', OCH3: 'H3CO', CN: 'NC', C2H5: 'H5C2', CH2OH: 'HOH2C', NHCH3: 'H3CHN', CH2SH: 'HSH2C', COCH3: 'H3COC', COOCH3: 'H3COOC', CH2Cl: 'ClH2C', CH2Br: 'BrH2C', CH2NH2: 'H2NH2C' };
  const aGauche = e => INV[e] || e;

  // ── chaîne principale (carbones) et orientation (le plus oxydé en haut) ──
  // atomes appartenant à un cycle (liaisons qui ne sont pas des ponts)
  function atomesCycle(mol) {
    const vrai = new Set();
    mol.li.forEach((l, k) => { if (estCyclique(mol, k)) { vrai.add(l.a); vrai.add(l.b); } });
    return vrai;
  }
  function estCyclique(mol, k) {          // la liaison k appartient-elle à un cycle ?
    const { a, b } = mol.li[k], vu = new Set([a]), file = [a];
    while (file.length) { const u = file.shift(); for (const x of mol.v[u]) { if (x.k === k || vu.has(x.j)) continue; if (x.j === b) return true; vu.add(x.j); file.push(x.j); } }
    return false;
  }
  function chainePrincipale(mol) {
    const cyc = atomesCycle(mol);
    const C = mol.at.map((a, i) => i).filter(i => mol.at[i].el === 'C' && !cyc.has(i));
    if (!C.length) return [];
    const adj = i => mol.v[i].filter(x => mol.at[x.j].el === 'C' && !cyc.has(x.j)).map(x => x.j);
    function plusLoin(d) {
      const dist = new Map([[d, 0]]), par = new Map(), file = [d];
      while (file.length) { const u = file.shift(); adj(u).forEach(w => { if (!dist.has(w)) { dist.set(w, dist.get(u) + 1); par.set(w, u); file.push(w); } }); }
      let m = d; dist.forEach((v, k) => { if (v > dist.get(m)) m = k; });
      const ch = [m]; while (par.has(ch[ch.length - 1])) ch.push(par.get(ch[ch.length - 1]));
      return ch;
    }
    // parmi les plus longues chaînes, préférer celle qui contient le plus de centres stéréogènes
    let best = null;
    C.forEach(d => { const ch = plusLoin(d); const sc = ch.length * 100 + ch.filter(k => mol.chir[k]).length; if (!best || sc > best.sc) best = { ch, sc }; });
    let ch = best.ch;
    const ox = i => mol.v[i].filter(x => !['C', 'H'].includes(mol.at[x.j].el)).reduce((t, x) => t + x.o, 0);
    const score = i => ox(i) * 10 + (mol.v[i].some(x => x.o === 2 && mol.at[x.j].el === 'O') ? 5 : 0);
    // comparer les extrémités puis, à égalité, l'atome suivant (règle du carbone le plus oxydé en haut)
    for (let q = 0; q < Math.floor(ch.length / 2); q++) {
      const a = score(ch[q]), b = score(ch[ch.length - 1 - q]);
      if (a !== b) { if (b > a) ch = ch.reverse(); break; }
    }
    return ch;
  }

  function cloner(mol) { const m = JSON.parse(JSON.stringify({ at: mol.at, li: mol.li, chir: mol.chir })); preparer(m); return m; }

  return { lireSmiles, voisins, ordreLiaison, priorites, descripteur, inverser, placer, estStereocentre, completerCentres,
           etiquette, aGauche, formuleBrute, chainePrincipale, nbH, lourds, cloner, K, signeGeo };
})();
if (typeof module !== 'undefined') module.exports = Stereo;
