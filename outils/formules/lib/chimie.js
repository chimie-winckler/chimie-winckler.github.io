/* Repris de « Formules des molécules » (Schématisation en physique-chimie), © 2026 Gaëtan PORTIER, licence MIT.
   https://forge.apps.education.fr/schemas-physique-chimie — fichier non modifié. */
// ═══════════════════════════════════════════════════════════════════
// Chimie : éléments, valences, hydrogènes implicites, doublets non liants,
// formule brute, masse molaire, lecture des SMILES. Aucun accès au DOM
// (testable sous Node).
//
// Une molécule (ou un ensemble de molécules) est un graphe :
//   { atomes: [{ id, el, charge, x, y }], liaisons: [{ id, a, b, ordre }] }
// a et b sont les id des atomes. Les H non dessinés sont « implicites » :
// ils complètent la valence de chaque atome.
// ═══════════════════════════════════════════════════════════════════

'use strict';

const Chimie = (() => {

  // 📌 ve : électrons de valence ; masse : g/mol
  const ELEMENTS = {
    H:  { ve: 1, masse: 1.008 },
    B:  { ve: 3, masse: 10.81 },
    C:  { ve: 4, masse: 12.011 },
    N:  { ve: 5, masse: 14.007 },
    O:  { ve: 6, masse: 15.999 },
    F:  { ve: 7, masse: 18.998 },
    Si: { ve: 4, masse: 28.085 },
    P:  { ve: 5, masse: 30.974 },
    S:  { ve: 6, masse: 32.06 },
    Cl: { ve: 7, masse: 35.45 },
    Br: { ve: 7, masse: 79.904 },
    I:  { ve: 7, masse: 126.904 }
  };
  // Éléments pouvant dépasser l'octet (valences 3, 5, 7 ou 4, 6)
  const HYPERVALENTS = new Set(['P', 'S', 'Cl', 'Br', 'I']);
  // Électronégativités (Pauling) : ordre des éléments dans les formules sans carbone
  const EN = { H: 2.20, B: 2.04, C: 2.55, N: 3.04, O: 3.44, F: 3.98, Si: 1.90, P: 2.19, S: 2.58, Cl: 3.16, Br: 2.96, I: 2.66 };

  // Valences possibles d'un atome selon sa charge (ex. N⁺ → 4, O⁻ → 1)
  function valences(el, charge) {
    const e = ELEMENTS[el];
    if (!e) return [0];
    const v = e.ve - (charge || 0);
    if (el === 'H') return v === 1 ? [1] : [0];
    if (v <= 0) return [0];
    if (v < 4) return [v];
    const base = 8 - v, liste = [base];
    if (HYPERVALENTS.has(el)) for (let k = base + 2; k <= v; k += 2) liste.push(k);
    return liste;
  }

  // ── Analyse d'un graphe : voisins, H implicites, erreurs, composantes ──
  function analyser(graphe) {
    const atomes = graphe.atomes, idx = new Map();
    atomes.forEach((a, i) => idx.set(a.id, i));
    const voisins = atomes.map(() => []);
    graphe.liaisons.forEach(l => {
      const i = idx.get(l.a), j = idx.get(l.b);
      if (i === undefined || j === undefined || i === j) return;
      voisins[i].push({ j, ordre: l.ordre, liaison: l });
      voisins[j].push({ j: i, ordre: l.ordre, liaison: l });
    });
    const somme = voisins.map(v => v.reduce((s, x) => s + x.ordre, 0));
    const H = [], erreur = [], valence = [];
    atomes.forEach((a, i) => {
      const vals = valences(a.el, a.charge);
      const v = vals.find(x => x >= somme[i]);
      if (v === undefined) { H.push(0); erreur.push(true); valence.push(somme[i]); }
      else { H.push(v - somme[i]); erreur.push(false); valence.push(v); }
    });
    // Doublets non liants : électrons restants / 2 (un électron seul = radical)
    const doublets = atomes.map((a, i) => {
      const e = (ELEMENTS[a.el] ? ELEMENTS[a.el].ve : 0) - (a.charge || 0) - somme[i] - H[i];
      return { paires: Math.max(0, Math.floor(e / 2)), seul: e > 0 ? e % 2 : 0 };
    });
    // Composantes connexes (une par molécule)
    const comp = new Array(atomes.length).fill(-1), composantes = [];
    atomes.forEach((_, i) => {
      if (comp[i] >= 0) return;
      const liste = [], pile = [i];
      comp[i] = composantes.length;
      while (pile.length) {
        const k = pile.pop(); liste.push(k);
        voisins[k].forEach(v => { if (comp[v.j] < 0) { comp[v.j] = composantes.length; pile.push(v.j); } });
      }
      composantes.push(liste.sort((x, y) => x - y));
    });
    return { atomes, idx, voisins, somme, H, erreur, valence, doublets, comp, composantes };
  }

  // Nombre total d'atomes de chaque élément d'une composante (H implicites compris)
  function compter(an, liste) {
    const n = {};
    let charge = 0;
    liste.forEach(i => {
      const a = an.atomes[i];
      n[a.el] = (n[a.el] || 0) + 1;
      if (an.H[i]) n.H = (n.H || 0) + an.H[i];
      charge += a.charge || 0;
    });
    return { n, charge };
  }

  // ── Formule brute : C, H, O, N puis ordre alphabétique (comme C4H9O2N) ;
  //    sans carbone : électronégativité croissante (H2O, HCl), sauf NH3, NH4+
  function formuleBrute(an, liste) {
    const { n, charge } = compter(an, liste);
    let ordre;
    if (n.C) {
      const tete = ['C', 'H', 'O', 'N'].filter(e => n[e]);
      ordre = tete.concat(Object.keys(n).filter(e => !tete.includes(e)).sort());
    } else {
      ordre = Object.keys(n).sort((a, b) => (EN[a] || 0) - (EN[b] || 0) || a.localeCompare(b));
      if (n.N && n.H && !n.O) ordre = ['N', 'H'].concat(ordre.filter(e => e !== 'N' && e !== 'H'));
    }
    const parties = ordre.map(e => [e, n[e]]);
    const texte = parties.map(([e, k]) => e + (k > 1 ? k : '')).join('') + texteCharge(charge);
    return { parties, charge, texte };
  }

  function texteCharge(q) {
    if (!q) return '';
    const s = q > 0 ? '+' : '−';
    return (Math.abs(q) > 1 ? Math.abs(q) : '') + s;
  }

  function masseMolaire(an, liste) {
    const { n } = compter(an, liste);
    return Object.keys(n).reduce((m, e) => m + (ELEMENTS[e] ? ELEMENTS[e].masse : 0) * n[e], 0);
  }

  // ── SMILES (sous-ensemble) → graphe sans coordonnées ───────────────
  //    atomes B C N O P S F Cl Br I, crochets [NH4+] [O-], branches ( ),
  //    liaisons - = #, cycles 1-9 et %nn, composantes séparées par « . »,
  //    aromatiques c n o s (écrits ensuite en liaisons alternées)
  function lireSmiles(s) {
    const atomes = [], liaisons = [];
    let i = 0, prec = -1, ordreSuivant = null, cycles = {};
    const pile = [];
    const ajouter = (el, charge, aro) => {
      const k = atomes.length;
      atomes.push({ id: 'a' + k, el, charge: charge || 0, aro: !!aro });
      if (prec >= 0) liaisons.push({ id: 'l' + liaisons.length, a: 'a' + prec, b: 'a' + k, ordre: ordreSuivant || (aro && atomes[prec].aro ? 1.5 : 1) });
      ordreSuivant = null; prec = k;
    };
    while (i < s.length) {
      const c = s[i];
      if (c === '(') { pile.push(prec); i++; continue; }
      if (c === ')') { prec = pile.pop(); i++; continue; }
      if (c === '.') { prec = -1; i++; continue; }
      if (c === '-') { ordreSuivant = 1; i++; continue; }
      if (c === '=') { ordreSuivant = 2; i++; continue; }
      if (c === '#') { ordreSuivant = 3; i++; continue; }
      if (/[0-9%]/.test(c)) {
        let num;
        if (c === '%') { num = s.substr(i + 1, 2); i += 3; } else { num = c; i++; }
        if (cycles[num]) {
          const [k, o] = cycles[num];
          const aro = atomes[k].aro && atomes[prec].aro;
          liaisons.push({ id: 'l' + liaisons.length, a: 'a' + k, b: 'a' + prec, ordre: ordreSuivant || o || (aro ? 1.5 : 1) });
          delete cycles[num]; ordreSuivant = null;
        } else { cycles[num] = [prec, ordreSuivant]; ordreSuivant = null; }
        continue;
      }
      if (c === '[') {
        const f = s.indexOf(']', i);
        if (f < 0) throw new Error('Crochet non fermé');
        const m = /^([A-Z][a-z]?|[cnosp])(H\d*)?([+-]+\d*)?$/.exec(s.slice(i + 1, f).replace(/^\d+/, ''));
        if (!m) throw new Error('Atome inconnu : ' + s.slice(i, f + 1));
        let q = 0;
        if (m[3]) {
          const d = /\d+/.exec(m[3]);
          q = (m[3][0] === '+' ? 1 : -1) * (d ? +d[0] : m[3].length);
        }
        const aro = /^[a-z]/.test(m[1]);
        ajouter(aro ? m[1].toUpperCase() : m[1], q, aro);
        if (aro && m[2]) atomes[prec].hAro = true;
        i = f + 1; continue;
      }
      const deux = s.substr(i, 2);
      if (deux === 'Cl' || deux === 'Br') { ajouter(deux); i += 2; continue; }
      if (/[BCNOPSFI]/.test(c)) { ajouter(c); i++; continue; }
      if (/[cnosp]/.test(c)) { ajouter(c.toUpperCase(), 0, true); i++; continue; }
      throw new Error('Caractère inattendu : ' + c);
    }
    if (Object.keys(cycles).length) throw new Error('Cycle non fermé');
    kekuliser(atomes, liaisons);
    return { atomes: atomes.map(a => ({ id: a.id, el: a.el, charge: a.charge })), liaisons };
  }

  // Liaisons aromatiques (1,5) → simples et doubles alternées
  function kekuliser(atomes, liaisons) {
    const aro = liaisons.filter(l => l.ordre === 1.5);
    if (!aro.length) return;
    aro.forEach(l => { l.ordre = 1; });
    const num = id => +id.slice(1);
    // atomes aromatiques qui ont besoin d'une double liaison
    const besoin = new Set();
    atomes.forEach((a, k) => {
      if (!a.aro || a.hAro) return;
      if (a.el === 'O' || a.el === 'S') return;
      const autres = liaisons.filter(l => (num(l.a) === k || num(l.b) === k) && l.ordre >= 2);
      if (!autres.length) besoin.add(k);
    });
    const libre = new Set(besoin);
    const essayer = liste => {
      const k = liste.find(x => libre.has(x));
      if (k === undefined) return true;
      for (const l of aro) {
        const a = num(l.a), b = num(l.b);
        if (a !== k && b !== k) continue;
        const autre = a === k ? b : a;
        if (!libre.has(autre)) continue;
        l.ordre = 2; libre.delete(k); libre.delete(autre);
        if (essayer(liste)) return true;
        l.ordre = 1; libre.add(k); libre.add(autre);
      }
      return false;
    };
    if (!essayer([...besoin])) throw new Error('Cycle aromatique impossible à écrire');
  }

  return { ELEMENTS, valences, analyser, compter, formuleBrute, texteCharge, masseMolaire, lireSmiles };
})();

if (typeof module !== 'undefined') module.exports = Chimie;
