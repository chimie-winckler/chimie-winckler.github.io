/* Repris de « Formules des molécules » (Schématisation en physique-chimie), © 2026 Gaëtan PORTIER, licence MIT.
   https://forge.apps.education.fr/schemas-physique-chimie — fichier non modifié. */
// ═══════════════════════════════════════════════════════════════════
// Équation de réaction : ajustement des nombres stœchiométriques par
// conservation des éléments et de la charge. Aucun accès au DOM.
//   Equation.ajuster(reactifs, produits) → { coefs: [r…, p…] } ou { erreur }
//   reactifs / produits : [{ n: { C: 3, H: 8 }, charge: 0 }, …]
// ═══════════════════════════════════════════════════════════════════

'use strict';

const Equation = (() => {
  const pgcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const ppcm = (a, b) => a / pgcd(a, b) * b;
  // Fractions exactes [numérateur, dénominateur]
  const fr = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = pgcd(n, d) || 1; return [n / g, d / g]; };
  const mul = (a, b) => fr(a[0] * b[0], a[1] * b[1]);
  const sub = (a, b) => fr(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
  const div = (a, b) => fr(a[0] * b[1], a[1] * b[0]);

  function ajuster(reactifs, produits) {
    const especes = reactifs.map(e => ({ e, s: 1 })).concat(produits.map(e => ({ e, s: -1 })));
    const n = especes.length;
    if (!reactifs.length || !produits.length) return { erreur: 'il faut au moins un réactif et un produit' };
    // Une ligne par élément, plus la charge
    const elements = [...new Set(especes.flatMap(({ e }) => Object.keys(e.n)))];
    const M = elements.map(el => especes.map(({ e, s }) => fr(s * (e.n[el] || 0))));
    if (especes.some(({ e }) => e.charge)) M.push(especes.map(({ e, s }) => fr(s * (e.charge || 0))));
    // Forme échelonnée réduite
    const pivots = [];
    let ligne = 0;
    for (let col = 0; col < n && ligne < M.length; col++) {
      const p = M.findIndex((r, i) => i >= ligne && r[col][0] !== 0);
      if (p < 0) continue;
      [M[ligne], M[p]] = [M[p], M[ligne]];
      const piv = M[ligne][col];
      M[ligne] = M[ligne].map(x => div(x, piv));
      M.forEach((r, i) => {
        if (i === ligne || r[col][0] === 0) return;
        const f = r[col];
        M[i] = r.map((x, j) => sub(x, mul(f, M[ligne][j])));
      });
      pivots.push(col); ligne++;
    }
    const libres = [...Array(n).keys()].filter(c => !pivots.includes(c));
    if (!libres.length) return { erreur: 'impossible d\'ajuster : vérifiez les réactifs et les produits' };
    if (libres.length > 1) return { erreur: 'plusieurs ajustements possibles : il s\'agit de plusieurs réactions' };
    const f = libres[0];
    const x = new Array(n).fill(null);
    x[f] = fr(1);
    pivots.forEach((c, i) => { x[c] = fr(-M[i][f][0], M[i][f][1]); });
    const d = x.reduce((m, v) => ppcm(m, v[1]), 1);
    let coefs = x.map(v => v[0] * d / v[1]);
    const g = coefs.reduce((m, v) => pgcd(m, v), 0) || 1;
    coefs = coefs.map(v => v / g);
    if (coefs.every(v => v <= 0)) coefs = coefs.map(v => -v);
    if (coefs.some(v => v <= 0)) return { erreur: 'impossible d\'ajuster : une espèce ne peut pas intervenir' };
    return { coefs };
  }

  return { ajuster };
})();

if (typeof module !== 'undefined') module.exports = Equation;
