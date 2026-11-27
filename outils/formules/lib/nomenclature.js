/* Repris de « Formules des molécules » (Schématisation en physique-chimie), © 2026 Gaëtan PORTIER, licence MIT.
   https://forge.apps.education.fr/schemas-physique-chimie — fichier non modifié. */
// ═══════════════════════════════════════════════════════════════════
// Nomenclature IUPAC (recommandations 2013, en français) :
//   · Nomenclature.nommer(analyse, composante) → { nom, chaine, raison }
//   · Nomenclature.lire(nom)                  → graphe { atomes, liaisons }
// Domaine couvert : chaînes et cycles simples carbonés, liaisons multiples,
// acides, esters, halogénures d'acyle, amides, nitriles, aldéhydes,
// cétones, alcools, amines, éthers et halogènes ; benzène et ses noms
// conservés (phénol, aniline, acide benzoïque…) ; molécules usuelles.
// Aucun accès au DOM (testable sous Node avec chimie.js).
// ═══════════════════════════════════════════════════════════════════

'use strict';

const Nomenclature = (() => {
  const C_ = typeof Chimie !== 'undefined' ? Chimie : require('./chimie.js');

  const RACINES = ['', 'méth', 'éth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'déc',
    'undéc', 'dodéc', 'tridéc', 'tétradéc', 'pentadéc', 'hexadéc', 'heptadéc', 'octadéc', 'nonadéc', 'icos'];
  const MULT = ['', '', 'di', 'tri', 'tétra', 'penta', 'hexa', 'hepta', 'octa', 'nona', 'déca'];
  const MULTX = ['', '', 'bis', 'tris', 'tétrakis', 'pentakis', 'hexakis'];
  const HALO = { F: 'fluoro', Cl: 'chloro', Br: 'bromo', I: 'iodo' };
  const HALOGENURE = { F: 'fluorure', Cl: 'chlorure', Br: 'bromure', I: 'iodure' };
  // 📌 Ordre de priorité des groupes caractéristiques (suffixes)
  const RANG = { acide: 1, ester: 2, halogenure: 3, amide: 4, nitrile: 5, aldehyde: 6, cetone: 7, alcool: 8, amine: 9 };
  // Groupes portés par un carbone de bout de chaîne (locant 1 sous-entendu)
  const TERMINAUX = new Set(['acide', 'ester', 'halogenure', 'amide', 'nitrile', 'aldehyde']);
  const SUFFIXE_CHAINE = { acide: 'oïque', ester: 'oate', halogenure: 'oyle', amide: 'amide', nitrile: 'nitrile', aldehyde: 'al', cetone: 'one', alcool: 'ol', amine: 'amine' };
  const SUFFIXE_CYCLE = { acide: 'carboxylique', ester: 'carboxylate', halogenure: 'carbonyle', amide: 'carboxamide', nitrile: 'carbonitrile', aldehyde: 'carbaldéhyde' };

  // Molécules et ions usuels : formule brute → nom, et nom → SMILES
  const USUELS = [
    ['H2O', 'eau', 'O'], ['O2', 'dioxygène', 'O=O'], ['H2', 'dihydrogène', '[H][H]'], ['N2', 'diazote', 'N#N'],
    ['Cl2', 'dichlore', 'ClCl'], ['Br2', 'dibrome', 'BrBr'], ['I2', 'diiode', 'II'], ['F2', 'difluor', 'FF'],
    ['HCl', 'chlorure d\'hydrogène', 'Cl'], ['HBr', 'bromure d\'hydrogène', 'Br'], ['HF', 'fluorure d\'hydrogène', 'F'],
    ['HI', 'iodure d\'hydrogène', 'I'], ['NH3', 'ammoniac', 'N'], ['H2O2', 'peroxyde d\'hydrogène', 'OO'],
    ['CO2', 'dioxyde de carbone', 'O=C=O'], ['CO', 'monoxyde de carbone', '[C-]#[O+]'], ['H2S', 'sulfure d\'hydrogène', 'S'],
    ['SO2', 'dioxyde de soufre', 'O=S=O'], ['SO3', 'trioxyde de soufre', 'O=S(=O)=O'], ['CHN', 'cyanure d\'hydrogène', 'C#N'],
    ['O3', 'ozone', 'O=[O+][O-]'], ['H2SO4', 'acide sulfurique', 'OS(=O)(=O)O'], ['HNO3', 'acide nitrique', 'O[N+](=O)[O-]'],
    ['H3PO4', 'acide phosphorique', 'OP(=O)(O)O'], ['PH3', 'phosphine', 'P'],
    ['H3O+', 'ion oxonium', '[OH3+]'], ['HO−', 'ion hydroxyde', '[OH-]'], ['NH4+', 'ion ammonium', '[NH4+]'],
    ['H+', 'ion hydrogène', '[H+]'], ['F−', 'ion fluorure', '[F-]'], ['Cl−', 'ion chlorure', '[Cl-]'],
    ['Br−', 'ion bromure', '[Br-]'], ['I−', 'ion iodure', '[I-]'], ['O2−', 'ion oxyde', '[O-2]'], ['S2−', 'ion sulfure', '[S-2]']
  ];
  // Noms d'usage acceptés en entrée (→ SMILES)
  const ALIAS = {
    'acetone': 'CC(=O)C', 'acide acetique': 'CC(=O)O', 'acide formique': 'OC=O', 'ethylene': 'C=C', 'acetylene': 'C#C',
    'glycerol': 'OCC(O)CO', 'glycerine': 'OCC(O)CO', 'formaldehyde': 'C=O', 'acetaldehyde': 'CC=O', 'toluene': 'Cc1ccccc1',
    'uree': 'NC(=O)N', 'acide lactique': 'CC(O)C(=O)O', 'acide citrique': 'OC(=O)CC(O)(C(=O)O)CC(=O)O',
    'isopropanol': 'CC(C)O', 'alcool isopropylique': 'CC(C)O', 'acetate d\'ethyle': 'CC(=O)OCC', 'acetate de methyle': 'CC(=O)OC',
    'acetate d\'isoamyle': 'CC(=O)OCCC(C)C', 'acetate de linalyle': 'CC(=O)OC(C)(CCC=C(C)C)C=C',
    'paracetamol': 'CC(=O)Nc1ccc(O)cc1', 'aspirine': 'CC(=O)Oc1ccccc1C(=O)O', 'acide acetylsalicylique': 'CC(=O)Oc1ccccc1C(=O)O',
    'ibuprofene': 'CC(C)Cc1ccc(cc1)C(C)C(=O)O', 'acide salicylique': 'OC(=O)c1ccccc1O', 'styrene': 'C=Cc1ccccc1',
    'glycine': 'NCC(=O)O', 'alanine': 'CC(N)C(=O)O', 'acide oxalique': 'OC(=O)C(=O)O', 'chloroforme': 'ClC(Cl)Cl',
    'isooctane': 'CC(C)CC(C)(C)C', 'acide butyrique': 'CCCC(=O)O', 'acide propionique': 'CCC(=O)O',
    'acide acrylique': 'C=CC(=O)O', 'acrylonitrile': 'C=CC#N', 'propylene': 'CC=C', 'butadiene': 'C=CC=C', 'isoprene': 'CC(=C)C=C',
    'acide maleique': 'OC(=O)/C=C\\C(=O)O', 'acide fumarique': 'OC(=O)C=CC(=O)O', 'methylamine': 'CN', 'ethylamine': 'CCN',
    'dimethylamine': 'CNC', 'trimethylamine': 'CN(C)C', 'ether': 'CCOCC', 'ether diethylique': 'CCOCC'
  };

  const sansAccents = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const voyelle = c => /[aeiouyàâäéèêëïîôöùûü]/i.test(c || '');
  const cmpListes = (a, b) => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    }
    return a.length - b.length;
  };
  const trier = l => l.slice().sort((x, y) => x - y);
  class Erreur extends Error {}
  const nonPrisEnCharge = raison => { throw new Erreur(raison); };

  // ═════════════════════════ MOLÉCULE → NOM ═════════════════════════

  // Graphe des atomes « lourds » (autres que H) avec leur nombre de H
  function grapheLourd(an, liste) {
    const G = { el: [], h: [], charge: [], adj: [], orig: [] };
    const num = new Map();
    liste.forEach(i => {
      const a = an.atomes[i];
      if (a.el === 'H' && an.voisins[i].length === 1 && an.atomes[an.voisins[i][0].j].el !== 'H') return;
      num.set(i, G.el.length);
      G.el.push(a.el); G.h.push(an.H[i]); G.charge.push(a.charge || 0); G.adj.push([]); G.orig.push(i);
    });
    liste.forEach(i => {
      if (!num.has(i)) return;
      const k = num.get(i);
      an.voisins[i].forEach(v => {
        if (num.has(v.j)) G.adj[k].push({ j: num.get(v.j), o: v.ordre });
        else G.h[k]++; // H explicite
      });
    });
    G.n = G.el.length;
    return G;
  }

  const ordreLiaison = (G, a, b) => { const v = G.adj[a].find(x => x.j === b); return v ? v.o : 0; };

  // Cycles simples (un atome n'appartient qu'à un cycle) ; renvoie null si cycles accolés
  function trouverCycles(G) {
    const relies = (a, b) => { // a et b restent reliés sans la liaison a–b ?
      const vu = new Set([a]), pile = [a];
      while (pile.length) {
        const k = pile.pop();
        for (const v of G.adj[k]) {
          if ((k === a && v.j === b) || (k === b && v.j === a)) continue;
          if (v.j === b) return true;
          if (!vu.has(v.j)) { vu.add(v.j); pile.push(v.j); }
        }
      }
      return false;
    };
    const aretes = G.adj.map(() => []);
    for (let a = 0; a < G.n; a++) G.adj[a].forEach(v => { if (v.j > a && relies(a, v.j)) { aretes[a].push(v.j); aretes[v.j].push(a); } });
    const dansCycle = new Array(G.n).fill(-1), cycles = [];
    for (let a = 0; a < G.n; a++) {
      if (!aretes[a].length || dansCycle[a] >= 0) continue;
      const cycle = [a];
      dansCycle[a] = cycles.length;
      let prec = a, cour = aretes[a][0];
      while (cour !== a) {
        if (aretes[cour].length !== 2) return null;
        cycle.push(cour); dansCycle[cour] = cycles.length;
        const suiv = aretes[cour][0] === prec ? aretes[cour][1] : aretes[cour][0];
        prec = cour; cour = suiv;
      }
      if (aretes[a].length !== 2) return null;
      cycles.push(cycle);
    }
    return { cycles, dansCycle };
  }

  // Groupes caractéristiques de la molécule
  function percevoir(G, dansCycle) {
    const groupes = [], typeC = new Array(G.n).fill(null), role = new Array(G.n).fill(null);
    const deg = k => G.adj[k].length;
    for (let k = 0; k < G.n; k++) {
      const el = G.el[k];
      if (G.charge[k]) nonPrisEnCharge('atome chargé');
      if (!['C', 'O', 'N', 'F', 'Cl', 'Br', 'I'].includes(el)) nonPrisEnCharge('élément ' + el);
      if (HALO[el] && (deg(k) !== 1 || G.adj[k][0].o !== 1 || G.el[G.adj[k][0].j] !== 'C')) nonPrisEnCharge('halogène');
      if (el === 'O') {
        if (G.adj[k].some(v => G.el[v.j] !== 'C')) nonPrisEnCharge('liaison O–' + G.el[G.adj[k].find(v => G.el[v.j] !== 'C').j]);
        if (deg(k) === 0) nonPrisEnCharge('oxygène isolé');
      }
      if (el === 'N' && G.adj[k].some(v => G.el[v.j] !== 'C')) nonPrisEnCharge('liaison N–hétéroatome');
    }
    for (let c = 0; c < G.n; c++) {
      if (G.el[c] !== 'C') continue;
      const het = G.adj[c].filter(v => G.el[v.j] !== 'C');
      const nC = G.adj[c].length - het.length;
      const oxo = het.filter(v => G.el[v.j] === 'O' && v.o === 2);
      const oh = het.filter(v => G.el[v.j] === 'O' && v.o === 1 && deg(v.j) === 1);
      const oc = het.filter(v => G.el[v.j] === 'O' && v.o === 1 && deg(v.j) === 2);
      const nn = het.filter(v => G.el[v.j] === 'N');
      const hal = het.filter(v => HALO[G.el[v.j]]);
      if (nn.some(v => v.o === 2)) nonPrisEnCharge('imine C=N');
      if (oxo.length > 1) nonPrisEnCharge('carbone portant deux =O');
      const enCycle = dansCycle[c] >= 0;
      if (oxo.length === 1) {
        const autres = het.filter(v => v !== oxo[0]);
        role[oxo[0].j] = 'oxo';
        if (!autres.length) {
          if (nC <= 1 && !enCycle) { typeC[c] = 'aldehyde'; groupes.push({ type: 'aldehyde', c, het: [oxo[0].j] }); }
          else if (nC === 2) { typeC[c] = 'cetone'; groupes.push({ type: 'cetone', c, het: [oxo[0].j] }); }
          else nonPrisEnCharge('carbonyle');
        } else if (autres.length === 1 && nC <= 1 && !enCycle) {
          const x = autres[0];
          if (oh.includes(x)) { typeC[c] = 'acide'; groupes.push({ type: 'acide', c, het: [oxo[0].j, x.j] }); }
          else if (oc.includes(x)) {
            const alk = G.adj[x.j].find(v => v.j !== c).j;
            if (G.adj[alk].some(v => G.el[v.j] === 'O' && v.o === 2)) nonPrisEnCharge('anhydride');
            typeC[c] = 'ester'; role[x.j] = 'ester';
            groupes.push({ type: 'ester', c, het: [oxo[0].j, x.j], alkyle: alk });
          } else if (nn.includes(x) && x.o === 1) {
            if (role[x.j] === 'amide') nonPrisEnCharge('imide');
            typeC[c] = 'amide'; role[x.j] = 'amide';
            groupes.push({ type: 'amide', c, het: [oxo[0].j, x.j], n: x.j });
          } else if (hal.includes(x)) { typeC[c] = 'halogenure'; groupes.push({ type: 'halogenure', c, het: [oxo[0].j, x.j], x: x.j }); }
          else nonPrisEnCharge('groupe carbonyle');
        } else nonPrisEnCharge('groupe carbonyle');
      } else {
        const nitrile = nn.find(v => v.o === 3);
        if (nitrile) {
          if (nC > 1 || het.length > 1 || enCycle) nonPrisEnCharge('nitrile');
          typeC[c] = 'nitrile'; role[nitrile.j] = 'nitrile';
          groupes.push({ type: 'nitrile', c, het: [nitrile.j] });
        }
        oh.forEach(v => { role[v.j] = 'hydroxy'; groupes.push({ type: 'alcool', c, het: [v.j] }); });
      }
    }
    // Amines : N dont tous les voisins sont des carbones (liaisons simples), hors amides
    for (let k = 0; k < G.n; k++) {
      if (G.el[k] !== 'N' || role[k]) continue;
      if (G.adj[k].some(v => v.o !== 1)) nonPrisEnCharge('azote');
      if (G.adj[k].some(v => typeC[v.j] && typeC[v.j] !== 'cetone' && typeC[v.j] !== 'aldehyde')) nonPrisEnCharge('azote');
      if (G.adj[k].some(v => typeC[v.j] === 'amide')) nonPrisEnCharge('imide');
      role[k] = 'amine';
      groupes.push({ type: 'amine', n: k, carbones: G.adj[k].map(v => v.j) });
    }
    return { groupes, typeC, role };
  }

  function nommerGraphe(G) {
    const cyc = trouverCycles(G);
    if (!cyc) nonPrisEnCharge('cycles accolés');
    const { cycles, dansCycle } = cyc;
    cycles.forEach(cy => { if (cy.some(k => G.el[k] !== 'C')) nonPrisEnCharge('cycle contenant un hétéroatome'); });
    const { groupes, typeC } = percevoir(G, dansCycle);
    const principal = groupes.reduce((m, g) => (!m || RANG[g.type] < RANG[m] ? g.type : m), null);
    const gp = groupes.filter(g => g.type === principal);
    if (principal === 'ester' && gp.length > 1) nonPrisEnCharge('plusieurs esters');
    const estC = k => G.el[k] === 'C';
    // Carbones utilisables dans une chaîne : hors cycle, nitriles exclus sauf s'ils sont principaux
    const enChaine = k => estC(k) && dansCycle[k] < 0 && (typeC[k] !== 'nitrile' || principal === 'nitrile');
    const benzenique = cy => cy.length === 6 && cy.every((k, i) => {
      const o1 = ordreLiaison(G, k, cy[(i + 1) % 6]), o0 = ordreLiaison(G, k, cy[(i + 5) % 6]);
      return (o1 === 2) !== (o0 === 2) && o1 <= 2 && o0 <= 2;
    });
    const cache = new Map();

    // ── Nom d'un substituant rattaché par l'atome r à l'atome « depuis » ──
    function subst(r, depuis) {
      const cle = r + '|' + depuis;
      if (!cache.has(cle)) cache.set(cle, calculerSubst(r, depuis));
      return cache.get(cle);
    }
    function calculerSubst(r, depuis) {
      const el = G.el[r], o = ordreLiaison(G, r, depuis);
      if (HALO[el]) return simple(HALO[el]);
      if (el === 'O') {
        if (G.adj[r].length === 1) return simple(o === 2 ? 'oxo' : 'hydroxy');
        const q = G.adj[r].find(v => v.j !== depuis).j;
        return alcoxy(subst(q, r));
      }
      if (el === 'N') {
        if (o !== 1) nonPrisEnCharge('azote');
        const autres = G.adj[r].filter(v => v.j !== depuis).map(v => ({ loc: 'N', ...subst(v.j, r) }));
        if (!autres.length) return simple('amino');
        return complexe(textePrefixes(autres, false, true) + 'amino');
      }
      // Carbone
      if (dansCycle[r] >= 0) return substCycle(r, depuis);
      const t = typeC[r];
      if (estC(depuis) && o === 1) {
        if (t === 'acide') return simple('carboxy');
        if (t === 'nitrile') return simple('cyano');
        if (t === 'ester') {
          const g = groupes.find(x => x.c === r);
          return complexe(alcoxy(subst(g.alkyle, g.het[1])).nom + 'carbonyle');
        }
        if (t === 'amide') {
          const g = groupes.find(x => x.c === r);
          const autres = G.adj[g.n].filter(v => v.j !== r).map(v => ({ loc: 'N', ...subst(v.j, g.n) }));
          return autres.length ? complexe(textePrefixes(autres, false, true) + 'carbamoyl') : simple('carbamoyl');
        }
        if (t === 'halogenure') {
          const g = groupes.find(x => x.c === r);
          return complexe(HALO[G.el[g.x]] + 'carbonyl');
        }
      }
      return substChaine(r, depuis);
    }
    const simple = nom => ({ nom, complexe: false });
    const complexe = nom => ({ nom, complexe: true });
    function alcoxy(s) {
      const court = /(méth|éth|prop|but)yl$/;
      if (s.nom === 'phényl') return simple('phénoxy');
      if (!s.complexe && court.test(s.nom)) return simple(s.nom.replace(/yl$/, 'oxy'));
      return complexe(court.test(s.nom) ? s.nom.replace(/yl$/, 'oxy') : s.nom + 'oxy');
    }

    // Substituant à chaîne carbonée : chaîne la plus longue issue de r (r = 1)
    function substChaine(r, depuis) {
      const permis = k => k === r || (enChaine(k) && !['acide', 'ester', 'amide', 'halogenure', 'nitrile'].includes(typeC[k]));
      const chemins = [];
      const explorer = (k, chemin) => {
        chemins.push(chemin);
        G.adj[k].forEach(v => {
          if (v.j === depuis || chemin.includes(v.j) || !permis(v.j)) return;
          explorer(v.j, chemin.concat(v.j));
        });
      };
      explorer(r, [r]);
      const oxoRacine = G.adj[r].find(v => G.el[v.j] === 'O' && v.o === 2 && G.adj[v.j].length === 1);
      const acyle = !!oxoRacine;
      let meilleur = null;
      chemins.forEach(ch => {
        const ev = evaluerChaine(ch, false, acyle ? { exclure: new Map([[r, [oxoRacine.j, depuis]]]) } : { exclure: new Map([[r, [depuis]]]) });
        ev.cleTri = [-ev.long, -ev.nMult, -ev.nDouble, ev.locMult, ev.locDouble, -ev.prefixes.length, ev.locPref, ev.locAlpha];
        if (!meilleur || comparer(ev.cleTri, meilleur.cleTri) < 0) meilleur = ev;
      });
      const ev = meilleur, n = ev.long;
      const locs = n > 1;
      const pref = textePrefixes(ev.prefixes, locs);
      let nom;
      if (acyle && oxoRacine) {
        if (n === 1 && !pref) return simple('formyl');
        nom = elider(corps(n, false, false, ev.enes, ev.ynes, locs), 'oyl') + 'oyl';
      } else if (!ev.enes.length && !ev.ynes.length) {
        nom = RACINES[n] + (o2(r, depuis) === 2 ? 'ylidène' : 'yl');
      } else {
        nom = elider(corps(n, false, false, ev.enes, ev.ynes, n > 2), 'yl') + (n > 2 ? '-1-yl' : 'yl');
      }
      return { nom: pref + nom, complexe: !!pref || (n > 2 && (ev.enes.length + ev.ynes.length) > 0) };
    }
    const o2 = (a, b) => ordreLiaison(G, a, b);

    // Substituant cyclique : cyclohexyl, phényl, (4-méthylphényl)…
    function substCycle(r, depuis) {
      const cy = cycles[dansCycle[r]], n = cy.length, i0 = cy.indexOf(r);
      const benz = benzenique(cy);
      let meilleur = null;
      [1, -1].forEach(sens => {
        const seq = cy.map((_, i) => cy[(i0 + sens * i + n * 2) % n]);
        const ev = evaluerChaine(seq, true, { exclure: new Map([[r, [depuis]]]), benzene: benz });
        ev.cleTri = [ev.locMult, ev.locDouble, ev.locPref, ev.locAlpha];
        if (!meilleur || comparer(ev.cleTri, meilleur.cleTri) < 0) meilleur = ev;
      });
      const ev = meilleur;
      const pref = textePrefixes(ev.prefixes, true);
      let nom;
      if (benz) nom = 'phényl';
      else if (!ev.enes.length && !ev.ynes.length) nom = 'cyclo' + RACINES[n] + 'yl';
      else nom = elider(corps(n, true, false, ev.enes, ev.ynes, true), 'yl') + '-1-yl';
      return { nom: pref + nom, complexe: !!pref || (!benz && ev.enes.length + ev.ynes.length > 0) };
    }

    // ── Évaluation d'un parent numéroté (seq[0] = position 1) ──
    // options.exclure : Map atome → voisins à ignorer (rattachement, =O consommé…)
    // options.groupes : groupes principaux à reconnaître (parent principal)
    function evaluerChaine(seq, cycle, options) {
      const opt = options || {};
      const pos = new Map(seq.map((a, i) => [a, i + 1]));
      const n = seq.length, benz = !!opt.benzene;
      const enes = [], ynes = [];
      if (!benz) {
        const nb = cycle ? n : n - 1;
        for (let i = 0; i < nb; i++) {
          const o = ordreLiaison(G, seq[i], seq[(i + 1) % n]);
          if (o === 2) enes.push(i + 1); else if (o === 3) ynes.push(i + 1);
        }
      }
      const consommes = new Map(); // atome du parent → voisins déjà pris en compte
      const ajouterConso = (a, b) => { if (!consommes.has(a)) consommes.set(a, new Set()); consommes.get(a).add(b); };
      (opt.exclure || new Map()).forEach((l, a) => l.forEach(b => ajouterConso(a, b)));
      const gr = [], prefixes = [];
      (opt.groupes || []).forEach(g => {
        if (g.type === 'amine') {
          const c = g.carbones.filter(k => pos.has(k)).sort((x, y) => pos.get(x) - pos.get(y));
          if (!c.length) return;
          if (c.length > 1) nonPrisEnCharge('amine cyclique');
          gr.push({ g, loc: pos.get(c[0]) }); ajouterConso(c[0], g.n);
          G.adj[g.n].forEach(v => { if (v.j !== c[0]) prefixes.push({ loc: 'N', ...subst(v.j, g.n) }); });
          return;
        }
        if (pos.has(g.c)) {
          gr.push({ g, loc: pos.get(g.c) });
          g.het.forEach(h => ajouterConso(g.c, h));
          if (g.type === 'amide') G.adj[g.n].forEach(v => { if (v.j !== g.c) prefixes.push({ loc: 'N', ...subst(v.j, g.n) }); });
          return;
        }
        if (cycle && TERMINAUX.has(g.type)) {
          const v = G.adj[g.c].find(x => pos.has(x.j));
          if (!v) return;
          gr.push({ g, loc: pos.get(v.j), ext: true }); ajouterConso(v.j, g.c);
          if (g.type === 'amide') G.adj[g.n].forEach(x => { if (x.j !== g.c) prefixes.push({ loc: 'N', ...subst(x.j, g.n) }); });
        }
      });
      seq.forEach((a, i) => {
        G.adj[a].forEach(v => {
          if (pos.has(v.j)) return;
          if (consommes.has(a) && consommes.get(a).has(v.j)) return;
          prefixes.push({ loc: i + 1, ...subst(v.j, a) });
        });
      });
      const num = prefixes.filter(p => p.loc !== 'N');
      const alpha = num.slice().sort((x, y) => cleAlpha(x).localeCompare(cleAlpha(y)) || x.loc - y.loc);
      return {
        seq, cycle, benzene: benz, long: n, enes, ynes, groupes: gr, prefixes,
        nGroupes: gr.length, nMult: enes.length + ynes.length, nDouble: enes.length,
        locGroupes: trier(gr.map(x => x.loc)), locMult: trier(enes.concat(ynes)), locDouble: enes.slice(),
        locPref: trier(num.map(p => p.loc)), locAlpha: alpha.map(p => p.loc)
      };
    }

    // ── Parent principal : toutes les chaînes et tous les cycles ──
    const candidats = [];
    const essayer = (seq, cycle, benz) => {
      const ev = evaluerChaine(seq, cycle, { groupes: gp, benzene: benz,
        exclure: principal === 'ester' ? new Map() : undefined });
      if (gp.some(g => TERMINAUX.has(g.type) && !g.ext && seq.includes(g.c) && seq.length > 1 &&
          seq.indexOf(g.c) !== 0 && seq.indexOf(g.c) !== seq.length - 1)) return; // groupe terminal au milieu : impossible
      ev.cleTri = [-ev.nGroupes, cycle ? -1 : 0, -ev.long, -ev.nMult, -ev.nDouble, ev.locGroupes, ev.locMult, ev.locDouble,
        -ev.prefixes.length, ev.locPref, ev.locAlpha];
      candidats.push(ev);
    };
    // Chaînes : tous les chemins entre deux carbones d'un même arbre acyclique
    const chainables = [];
    for (let k = 0; k < G.n; k++) if (enChaine(k)) chainables.push(k);
    chainables.forEach(u => {
      const parent = new Map([[u, -1]]), file = [u];
      while (file.length) {
        const k = file.shift();
        G.adj[k].forEach(v => { if (enChaine(v.j) && !parent.has(v.j)) { parent.set(v.j, k); file.push(v.j); } });
      }
      parent.forEach((_, v) => {
        if (v < u) return;
        const chemin = [];
        for (let k = v; k !== -1; k = parent.get(k)) chemin.push(k);
        essayer(chemin, false); // de v vers u
        if (chemin.length > 1) essayer(chemin.slice().reverse(), false);
      });
    });
    cycles.forEach(cy => {
      if (cy.some(k => !estC(k))) return;
      const n = cy.length, benz = benzenique(cy);
      for (let s = 0; s < n; s++) [1, -1].forEach(sens => essayer(cy.map((_, i) => cy[(s + sens * i + 2 * n) % n]), true, benz));
    });
    if (!candidats.length) nonPrisEnCharge('aucune chaîne carbonée');
    candidats.forEach(ev => { ev.nom = assembler(ev, principal); });
    candidats.sort((a, b) => comparer(a.cleTri, b.cleTri) || a.nom.localeCompare(b.nom));
    const choix = candidats[0];
    return { nom: choix.nom, chaine: choix.seq.map(k => G.orig[k]), famille: famille(principal) };

    // Famille de la molécule (groupe caractéristique principal, sinon type d'hydrocarbure)
    function famille(type) {
      const F = { acide: 'acide carboxylique', ester: 'ester', halogenure: 'halogénure d\'acyle', amide: 'amide', nitrile: 'nitrile',
        aldehyde: 'aldéhyde', cetone: 'cétone', alcool: 'alcool', amine: 'amine' };
      if (type) return F[type];
      const tous = [...Array(G.n).keys()];
      if (tous.some(k => HALO[G.el[k]])) return 'dérivé halogéné';
      if (tous.some(k => G.el[k] === 'O')) return 'éther-oxyde';
      if (cycles.some(benzenique)) return 'hydrocarbure aromatique';
      const ordres = tous.flatMap(k => G.adj[k].map(v => v.o));
      if (ordres.includes(3)) return 'alcyne';
      if (ordres.includes(2)) return cycles.length ? 'cycloalcène' : 'alcène';
      return cycles.length ? 'cycloalcane' : 'alcane';
    }

    // ── Écriture du nom du parent principal ──
    function assembler(ev, type) {
      const { long: n, cycle, benzene: benz, enes, ynes, groupes: gr, prefixes } = ev;
      const k = gr.length, ext = gr.some(x => x.ext);
      const num = prefixes.filter(p => p.loc !== 'N');
      const conserve = benz && k === 1 && ['alcool', 'amine', 'acide', 'aldehyde', 'amide', 'nitrile', 'ester', 'halogenure'].includes(type);
      let locs;
      if (!cycle) {
        const traits = num.length + enes.length + ynes.length + (TERMINAUX.has(type) ? 0 : k);
        locs = !(n === 1 || (n === 2 && traits <= 1));
      } else if (conserve) locs = true;
      else locs = num.length + enes.length + ynes.length + k > 1;
      const pref = textePrefixes(prefixes, locs);
      // Ester : partie alkyle
      let alkyle = '';
      if (type === 'ester' && k) {
        const g = gr[0].g, s = subst(g.alkyle, g.het[1]);
        alkyle = (voyelle(sansAccents(s.nom)[0]) ? ' d\'' : ' de ') + s.nom + 'e';
      }
      if (conserve) {
        const g = gr[0].g;
        switch (type) {
          case 'alcool': return pref + 'phénol';
          case 'amine': return pref + 'aniline';
          case 'acide': return 'acide ' + pref + 'benzoïque';
          case 'aldehyde': return pref + 'benzaldéhyde';
          case 'amide': return pref + 'benzamide';
          case 'nitrile': return pref + 'benzonitrile';
          case 'ester': return pref + 'benzoate' + alkyle;
          case 'halogenure': { const h = HALOGENURE[G.el[g.x]]; return h + ' de ' + pref + 'benzoyle'; }
        }
      }
      let base = corps(n, cycle, benz, enes, ynes, locs);
      if (!type || !k) return pref + base;
      const suf = (ext ? SUFFIXE_CYCLE : SUFFIXE_CHAINE)[type];
      const locSuf = locs && !(TERMINAUX.has(type) && !ext) ? '-' + trier(gr.map(x => x.loc)).join(',') + '-' : '';
      const mot = (k > 1 ? MULT[k] : '') + suf;
      base = elider(base, mot) + locSuf + mot;
      switch (type) {
        case 'acide': return 'acide ' + pref + base;
        case 'ester': return pref + base + alkyle;
        case 'halogenure': {
          const h = HALOGENURE[G.el[gr[0].g.x]], nom = pref + base;
          return h + (voyelle(sansAccents(nom)[0]) ? ' d\'' : ' de ') + nom;
        }
        default: return pref + base;
      }
    }
  }

  function comparer(a, b) {
    for (let i = 0; i < a.length; i++) {
      const x = a[i], y = b[i];
      const c = Array.isArray(x) ? cmpListes(x, y) : (x < y ? -1 : x > y ? 1 : 0);
      if (c) return c;
    }
    return 0;
  }

  // Corps du nom : racine + insaturations (but-2-ène, buta-1,3-diène, cyclohexane…)
  function corps(n, cycle, benz, enes, ynes, locs) {
    if (benz) return 'benzène';
    let r = (cycle ? 'cyclo' : '') + RACINES[n];
    if (!enes.length && !ynes.length) return r + 'ane';
    if (enes.length > 1 || ynes.length > 1) r += 'a';
    const l = x => (locs ? '-' + x.join(',') + '-' : '');
    if (enes.length) r += l(enes) + MULT[enes.length] + 'ène';
    if (ynes.length) { if (enes.length) r = r.replace(/ène$/, 'én'); r += l(ynes) + MULT[ynes.length] + 'yne'; }
    return r;
  }
  // Élision du « e » final devant une voyelle (propan-2-ol, but-3-én-2-ol, propanenitrile)
  function elider(base, suite) {
    if (!voyelle(suite[0])) return base;
    if (/ène$/.test(base)) return base.replace(/ène$/, 'én');
    return base.replace(/e$/, '');
  }

  function cleAlpha(p) { return sansAccents(p.nom).replace(/[^a-z]/gi, '').toLowerCase(); }

  // Préfixes classés par ordre alphabétique : 3-éthyl-2,2-diméthyl, N,N-diméthyl…
  function textePrefixes(prefixes, locs, sansN) {
    const grp = new Map();
    prefixes.forEach(p => {
      const cle = (p.complexe ? '(' : '') + p.nom;
      if (!grp.has(cle)) grp.set(cle, { nom: p.nom, complexe: p.complexe, locs: [] });
      grp.get(cle).locs.push(p.loc);
    });
    const liste = [...grp.values()].sort((a, b) => cleAlpha(a).localeCompare(cleAlpha(b)));
    return liste.map(g => {
      const ls = g.locs.slice().sort((x, y) => (x === 'N' ? -1 : y === 'N' ? 1 : x - y));
      const avecN = ls.includes('N');
      const lt = (locs || avecN) && !sansN ? ls.join(',') + '-' : '';
      const k = ls.length;
      const m = k > 1 ? (g.complexe ? MULTX[k] : MULT[k]) : '';
      return lt + m + (g.complexe ? '(' + g.nom + ')' : g.nom);
    }).join('-');
  }

  // Point d'entrée : nom d'une composante de l'analyse (Chimie.analyser)
  function nommer(an, liste) {
    const f = C_.formuleBrute(an, liste);
    const cle = f.parties.map(([e, k]) => e + (k > 1 ? k : '')).join('') + C_.texteCharge(f.charge);
    const nC = f.parties.find(p => p[0] === 'C');
    if (liste.some(i => an.erreur[i])) return { nom: null, raison: 'valence dépassée' };
    const usuel = USUELS.find(u => u[0] === cle);
    if (usuel && (!nC || nC[1] === 1) && !(cle === 'CHN' && f.parties.length !== 3)) return { nom: usuel[1], usuel: true, chaine: [] };
    if (!nC) return { nom: null, raison: 'molécule sans carbone' };
    try {
      const G = grapheLourd(an, liste);
      if (G.el.includes('H')) return { nom: null, raison: 'hydrogène mal placé' };
      return nommerGraphe(G);
    } catch (e) {
      if (e instanceof Erreur) return { nom: null, raison: e.message };
      throw e;
    }
  }

  // ═════════════════════════ NOM → MOLÉCULE ═════════════════════════

  const RAC_SA = RACINES.map(sansAccents);
  const STEMS = RAC_SA.map((r, n) => [r, n]).filter(x => x[0]).sort((a, b) => b[0].length - a[0].length);
  const MULT_SA = { di: 2, tri: 3, tetra: 4, penta: 5, hexa: 6, hepta: 7, octa: 8, nona: 9, deca: 10, bis: 2, tris: 3, tetrakis: 4 };
  // Substituants simples (SMILES, premier atome = rattachement ; « = » : double liaison)
  const SUBST = {
    fluoro: 'F', chloro: 'Cl', bromo: 'Br', iodo: 'I', hydroxy: 'O', oxo: '=O', amino: 'N', cyano: 'C#N',
    carboxy: 'C(=O)O', formyl: 'C=O', carbamoyl: 'C(=O)N', methoxy: 'OC', ethoxy: 'OCC', propoxy: 'OCCC', butoxy: 'OCCCC',
    phenoxy: 'Oc1ccccc1', phenyl: 'c1ccccc1', benzyl: 'Cc1ccccc1', vinyl: 'C=C', ethenyl: 'C=C', ethynyl: 'C#C', allyl: 'CC=C',
    isopropyl: 'C(C)C', isobutyl: 'CC(C)C', 'sec-butyl': 'C(C)CC', 'tert-butyl': 'C(C)(C)C', acetyl: 'C(C)=O', ethanoyl: 'C(C)=O',
    methylidene: '=C', ethylidene: '=CC'
  };
  RACINES.forEach((r, n) => { if (n) SUBST[sansAccents(r) + 'yl'] = 'C'.repeat(n); });
  for (let n = 3; n <= 8; n++) SUBST['cyclo' + RAC_SA[n] + 'yl'] = 'C1' + 'C'.repeat(n - 1) + '1';
  const NOMS_SUBST = Object.keys(SUBST).sort((a, b) => b.length - a.length);
  const SUFFIXES = [
    ['carbaldehyde', 'aldehyde', true], ['carbonitrile', 'nitrile', true], ['carboxamide', 'amide', true],
    ['nitrile', 'nitrile'], ['amide', 'amide'], ['amine', 'amine'], ['one', 'cetone'], ['ol', 'alcool'], ['al', 'aldehyde']
  ];

  // Petit constructeur de graphe
  function Constructeur() {
    const atomes = [], liaisons = [];
    return {
      atomes, liaisons,
      atome(el, charge) { atomes.push({ id: 'a' + atomes.length, el, charge: charge || 0 }); return atomes.length - 1; },
      lier(a, b, o) {
        const l = liaisons.find(x => (x.a === 'a' + a && x.b === 'a' + b) || (x.a === 'a' + b && x.b === 'a' + a));
        if (l) l.ordre = o || 1; else liaisons.push({ id: 'l' + liaisons.length, a: 'a' + a, b: 'a' + b, ordre: o || 1 });
      },
      // Fragment SMILES rattaché à l'atome « sur » ; renvoie l'indice de son premier atome
      fragment(smiles, sur) {
        let o = 1;
        if (smiles[0] === '=') { o = 2; smiles = smiles.slice(1); }
        const g = C_.lireSmiles(smiles), dec = atomes.length;
        g.atomes.forEach(a => atomes.push({ id: 'a' + atomes.length, el: a.el, charge: a.charge }));
        g.liaisons.forEach(l => this.lier(+l.a.slice(1) + dec, +l.b.slice(1) + dec, l.ordre));
        if (sur !== undefined && sur !== null) this.lier(sur, dec, o);
        return dec;
      }
    };
  }

  const lireLocs = t => (t ? t.split(',').map(x => (x === 'n' ? 'N' : +x)) : null);

  // « 2-amino-2-methyl » → [{ locs:[2], mult:1, spec }, …]
  function lirePrefixes(txt) {
    const res = [];
    let i = 0;
    const essai = s => {
      if (s[0] === '(') {
        let p = 0, j = 0;
        for (; j < s.length; j++) { if (s[j] === '(') p++; if (s[j] === ')' && --p === 0) break; }
        if (j >= s.length) throw new Erreur('parenthèse non fermée');
        return { spec: { texte: s.slice(1, j) }, long: j + 1 };
      }
      const nom = NOMS_SUBST.find(x => s.startsWith(x));
      return nom ? { spec: { nom }, long: nom.length } : null;
    };
    while (i < txt.length) {
      if (txt[i] === '-') { i++; continue; }
      let locs = null;
      const m = /^([\dn][\dn',]*)-/.exec(txt.slice(i));
      if (m) { locs = lireLocs(m[1].replace(/'/g, '')); i += m[0].length; }
      const reste = txt.slice(i);
      let r = essai(reste), mult = 1;
      if (!r) {
        const mm = /^(tetrakis|tris|bis|tetra|penta|hexa|hepta|octa|di|tri)/.exec(reste);
        if (mm) { r = essai(reste.slice(mm[0].length)); if (r) { mult = MULT_SA[mm[0]]; r.long += mm[0].length; } }
      }
      if (!r) throw new Erreur('préfixe non reconnu « ' + reste + ' »');
      if (locs && locs.length !== mult) throw new Erreur('nombre de locants incorrect');
      res.push({ locs, mult, spec: r.spec });
      i += r.long;
    }
    return res;
  }

  // « 2-methylbut-3-en » → { prefixes, n, cycle, benzene, enes, ynes }
  function lireParent(txt) {
    let p = txt;
    if (/benzene?$/.test(p)) return { prefixes: lirePrefixes(p.replace(/benzene?$/, '')), n: 6, cycle: true, benzene: true, enes: [], ynes: [] };
    p = p.replace(/e$/, '');
    let enes = [], ynes = [], m, mult = false;
    if ((m = /^(.*?)(?:-([\d,]+)-)?(di|tri|tetra)?yn$/.exec(p)) && m[1]) {
      ynes = lireLocs(m[2]) || (m[3] ? null : [null]); mult = mult || !!m[3];
      if (!ynes) ynes = new Array(MULT_SA[m[3]]).fill(null);
      p = m[1];
    }
    if ((m = /^(.*?)(?:-([\d,]+)-)?(di|tri|tetra)?en$/.exec(p)) && m[1] && /(meth|eth|prop|but|pent|hex|hept|oct|non|dec|icos)a?$/.test(m[1])) {
      enes = lireLocs(m[2]) || new Array(m[3] ? MULT_SA[m[3]] : 1).fill(null); mult = mult || !!m[3];
      p = m[1];
    } else if (!ynes.length) {
      if (!/an$/.test(p)) throw new Erreur('terminaison « ane », « ène » ou « yne » attendue');
      p = p.slice(0, -2);
    }
    if (mult || /a$/.test(p)) p = p.replace(/a$/, '');
    const st = STEMS.find(([r]) => p.endsWith(r));
    if (!st) throw new Erreur('racine non reconnue « ' + p + ' »');
    p = p.slice(0, -st[0].length);
    let cycle = false;
    if (p.endsWith('cyclo')) { cycle = true; p = p.slice(0, -5); }
    return { prefixes: lirePrefixes(p), n: st[1], cycle, benzene: false, enes, ynes };
  }

  // Construit le parent et ses substituants ; renvoie les indices des positions 1…n
  function construireParent(b, P, options) {
    const opt = options || {};
    const pos = [];
    for (let i = 0; i < P.n; i++) { pos.push(b.atome('C')); if (i) b.lier(pos[i - 1], pos[i], 1); }
    if (P.cycle) { if (P.n < 3) throw new Erreur('cycle trop petit'); b.lier(pos[P.n - 1], pos[0], 1); }
    const at = l => {
      if (l < 1 || l > P.n) throw new Erreur('locant ' + l + ' hors de la chaîne');
      return pos[l - 1];
    };
    if (P.benzene) { b.lier(pos[0], pos[1], 2); b.lier(pos[2], pos[3], 2); b.lier(pos[4], pos[5], 2); }
    const lien = (l, o) => {
      const a = at(l), c = P.cycle && l === P.n ? pos[0] : at(l + 1);
      if (!P.cycle && l >= P.n) throw new Erreur('locant ' + l + ' hors de la chaîne');
      b.lier(a, c, o);
    };
    let libre = 1;
    P.enes.forEach(l => { lien(l || libre, 2); libre = (l || libre) + 2; });
    P.ynes.forEach(l => { lien(l || libre, 3); libre = (l || libre) + 2; });
    if (opt.groupes) opt.groupes(pos, at);
    P.prefixes.forEach(pr => {
      const locs = pr.locs || defautLocs(pr, P);
      locs.forEach(l => {
        if (l === 'N') {
          if (opt.azote === undefined) throw new Erreur('locant N sans azote');
          attacherSubst(b, pr.spec, opt.azote);
        } else attacherSubst(b, pr.spec, at(l));
      });
    });
    return pos;
  }

  function defautLocs(pr, P) {
    const carbone = pr.spec.nom ? /yl$/.test(pr.spec.nom) : true;
    if (P.cycle) return Array.from({ length: pr.mult }, (_, i) => i + 1);
    const l = carbone && P.n >= 3 ? 2 : 1;
    return new Array(pr.mult).fill(l);
  }

  // Substituant simple (table) ou complexe (entre parenthèses)
  function attacherSubst(b, spec, sur) {
    if (spec.nom) { b.fragment(SUBST[spec.nom], sur); return; }
    const t = spec.texte;
    let m;
    if ((m = /^(.*)oxycarbonyl$/.exec(t))) {
      const c = b.atome('C'); b.lier(sur, c, 1);
      const o = b.atome('O'); b.lier(c, o, 2);
      const o2 = b.atome('O'); b.lier(c, o2, 1);
      attacherSubst(b, versAlkyle(m[1]), o2); return;
    }
    if ((m = /^(.*)oxy$/.exec(t))) { const o = b.atome('O'); b.lier(sur, o, 1); attacherSubst(b, versAlkyle(m[1]), o); return; }
    if ((m = /^(.*)amino$/.exec(t))) {
      const n = b.atome('N'); b.lier(sur, n, 1);
      lirePrefixes(m[1]).forEach(pr => { for (let k = 0; k < pr.mult; k++) attacherSubst(b, pr.spec, n); });
      return;
    }
    if ((m = /^(.*)carbamoyl$/.exec(t))) {
      const c = b.atome('C'); b.lier(sur, c, 1);
      const o = b.atome('O'); b.lier(c, o, 2);
      const n = b.atome('N'); b.lier(c, n, 1);
      lirePrefixes(m[1]).forEach(pr => { for (let k = 0; k < pr.mult; k++) attacherSubst(b, pr.spec, n); });
      return;
    }
    if ((m = /^(.*)carbonyl$/.exec(t))) {
      const c = b.atome('C'); b.lier(sur, c, 1);
      const o = b.atome('O'); b.lier(c, o, 2);
      lirePrefixes(m[1]).forEach(pr => attacherSubst(b, pr.spec, c));
      return;
    }
    if (SUBST[t]) { b.fragment(SUBST[t], sur); return; }
    // Alkyle, acyle ou cycle : « 1-methylethyl », « propan-2-yl », « prop-2-en-1-yl », « 4-methylphenyl », « ethanoyl »
    if ((m = /^(.*)oyl$/.exec(t))) {
      const P = lireParent(/(an|en|yn)$/.test(m[1]) ? m[1] : m[1] + 'an');
      const pos = construireParent(b, P);
      const o = b.atome('O'); b.lier(pos[0], o, 2);
      b.lier(sur, pos[0], 1); return;
    }
    if ((m = /^(.*?)(?:-(\d+)-)?yl(idene)?$/.exec(t))) {
      let x = m[1], att = m[2] ? +m[2] : 1;
      let P;
      if (/phen$/.test(x)) P = { prefixes: lirePrefixes(x.slice(0, -4)), n: 6, cycle: true, benzene: true, enes: [], ynes: [] };
      else {
        try { P = lireParent(/(an|en|yn)$/.test(x) ? x : x + 'an'); }
        catch (e) { P = lireParent(x + 'an'); }
      }
      const pos = construireParent(b, P);
      if (att < 1 || att > pos.length) throw new Erreur('locant de rattachement');
      b.lier(sur, pos[att - 1], m[3] ? 2 : 1); return;
    }
    throw new Erreur('substituant non reconnu « ' + t + ' »');
  }
  function versAlkyle(base) {
    const t = /yl$/.test(base) ? base : base + 'yl';
    return SUBST[t] ? { nom: t } : { texte: t };
  }

  // Partie « alkyle » d'un ester ou d'un halogénure : « methyle », « 1-methylethyle »
  function attacherAlkyle(b, txt, sur) {
    const t = txt.replace(/e$/, '');
    attacherSubst(b, SUBST[t] ? { nom: t } : { texte: t }, sur);
  }

  function lire(nomSaisi) {
    let s = sansAccents(String(nomSaisi).toLowerCase()).replace(/[’`]/g, '\'').replace(/\s+/g, ' ').replace(/\s*-\s*/g, '-').trim();
    if (!s) throw new Erreur('nom vide');
    const usuel = USUELS.find(u => sansAccents(u[1]) === s);
    if (usuel) return C_.lireSmiles(usuel[2]);
    if (ALIAS[s]) return C_.lireSmiles(ALIAS[s]);
    const b = Constructeur();
    let m;
    // Groupes portés par le parent (type, locants, partie alkyle…)
    const groupe = (type, ext, locs, mult, extra) => (pos, at, P) => {
      const ls = locs || defautsSuffixe(type, mult, P, ext);
      ls.forEach(l => {
        let c = at(l);
        if (ext) { const e = b.atome('C'); b.lier(c, e, 1); c = e; }
        switch (type) {
          case 'acide': { const o = b.atome('O'); b.lier(c, o, 2); b.lier(c, b.atome('O'), 1); break; }
          case 'aldehyde': case 'cetone': b.lier(c, b.atome('O'), 2); break;
          case 'alcool': b.lier(c, b.atome('O'), 1); break;
          case 'amine': { const n = b.atome('N'); b.lier(c, n, 1); extra.azote = extra.azote === undefined ? n : extra.azote; break; }
          case 'amide': { b.lier(c, b.atome('O'), 2); const n = b.atome('N'); b.lier(c, n, 1); extra.azote = extra.azote === undefined ? n : extra.azote; break; }
          case 'nitrile': b.lier(c, b.atome('N'), 3); break;
          case 'ester': { b.lier(c, b.atome('O'), 2); const o = b.atome('O'); b.lier(c, o, 1); attacherAlkyle(b, extra.alkyle, o); break; }
          case 'halogenure': { b.lier(c, b.atome('O'), 2); const x = b.atome(extra.x); b.lier(c, x, 1); break; }
        }
      });
    };
    const finir = (P, type, ext, locs, mult, extra) => {
      extra = extra || {};
      const g = groupe(type, ext, locs, mult, extra);
      // L'azote (amine, amide) doit exister avant les préfixes N- : on construit en deux temps
      const prefixesN = P.prefixes.filter(pr => pr.locs && pr.locs.includes('N'));
      P.prefixes = P.prefixes.filter(pr => !prefixesN.includes(pr));
      construireParent(b, P, { groupes: (pos, at) => g(pos, at, P) });
      prefixesN.forEach(pr => pr.locs.forEach(() => {
        if (extra.azote === undefined) throw new Erreur('locant N sans azote');
        attacherSubst(b, pr.spec, extra.azote);
      }));
      return verifier(b);
    };
    const retenus = [
      [/^acide (.*)benzoique$/, 'acide'], [/^(.*)phenol$/, 'alcool'], [/^(.*)aniline$/, 'amine'], [/^(.*)benzaldehyde$/, 'aldehyde'],
      [/^(.*)benzamide$/, 'amide'], [/^(.*)benzonitrile$/, 'nitrile']
    ];
    for (const [re, type] of retenus) {
      if ((m = re.exec(s))) {
        const P = { prefixes: lirePrefixes(m[1]), n: 6, cycle: true, benzene: true, enes: [], ynes: [] };
        return finir(P, type, ['acide', 'aldehyde', 'amide', 'nitrile'].includes(type), [1], 1);
      }
    }
    if ((m = /^(.*)benzoate d(?:e |')(.+)$/.exec(s))) {
      const P = { prefixes: lirePrefixes(m[1]), n: 6, cycle: true, benzene: true, enes: [], ynes: [] };
      return finir(P, 'ester', true, [1], 1, { alkyle: m[2] });
    }
    if ((m = /^(fluorure|chlorure|bromure|iodure) d(?:e |')(.*)benzoyle$/.exec(s))) {
      const P = { prefixes: lirePrefixes(m[2]), n: 6, cycle: true, benzene: true, enes: [], ynes: [] };
      return finir(P, 'halogenure', true, [1], 1, { x: { fluorure: 'F', chlorure: 'Cl', bromure: 'Br', iodure: 'I' }[m[1]] });
    }
    // Acides
    if ((m = /^acide (.+)$/.exec(s))) {
      const r = m[1];
      if ((m = /^(.*?)(?:-([\d,]+)-)?(di|tri|tetra)?carboxylique$/.exec(r))) return finir(lireParent(m[1]), 'acide', true, lireLocs(m[2]), m[3] ? MULT_SA[m[3]] : 1);
      if ((m = /^(.*?)(di)?oique$/.exec(r))) return finir(lireParent(m[1]), 'acide', false, null, m[2] ? 2 : 1);
      throw new Erreur('nom d\'acide non reconnu');
    }
    // Esters
    if ((m = /^(.+?)(oate|carboxylate) d(?:e |')(.+)$/.exec(s))) {
      if (m[2] === 'oate') return finir(lireParent(m[1]), 'ester', false, null, 1, { alkyle: m[3] });
      const mm = /^(.*?)(?:-([\d,]+)-)?$/.exec(m[1]);
      return finir(lireParent(mm[1]), 'ester', true, lireLocs(mm[2]), 1, { alkyle: m[3] });
    }
    // Halogénures d'acyle
    if ((m = /^(fluorure|chlorure|bromure|iodure) d(?:e |')(.+?)(oyle|carbonyle)$/.exec(s))) {
      const x = { fluorure: 'F', chlorure: 'Cl', bromure: 'Br', iodure: 'I' }[m[1]];
      return finir(lireParent(m[2]), 'halogenure', m[3] === 'carbonyle', null, 1, { x });
    }
    // Suffixes (ol, one, al, amine…) ou hydrocarbure
    let derniere = null;
    for (const [txt, type, ext] of SUFFIXES) {
      const re = new RegExp('^(.*?)(?:-([\\d,]+)-)?(di|tri|tetra)?' + txt + '$');
      if (!(m = re.exec(s)) || !m[1]) continue;
      try {
        const P = lireParent(m[1]);
        return finir(P, type, !!ext, lireLocs(m[2]), m[3] ? MULT_SA[m[3]] : 1);
      } catch (e) { if (!(e instanceof Erreur)) throw e; derniere = e; }
    }
    try {
      const P = lireParent(s);
      construireParent(b, P);
      return verifier(b);
    } catch (e) { throw derniere && !/terminaison|racine/.test(derniere.message) ? derniere : e; }
  }

  function defautsSuffixe(type, mult, P, ext) {
    if (P.cycle) return Array.from({ length: mult }, (_, i) => 1 + i * (mult === 2 && P.n >= 4 ? 1 : 1));
    if (TERMINAUX.has(type)) return mult === 2 ? [1, P.n] : [1];
    if (type === 'cetone') return Array.from({ length: mult }, (_, i) => 2 + i);
    return Array.from({ length: mult }, (_, i) => 1 + i);
  }

  function verifier(b) {
    const g = { atomes: b.atomes, liaisons: b.liaisons };
    const an = C_.analyser(g);
    if (an.erreur.some(x => x)) throw new Erreur('ce nom conduit à un atome qui dépasse sa valence');
    return g;
  }

  // Lecture protégée : { graphe } ou { erreur }
  function lireNom(nom) {
    try { return { graphe: lire(nom) }; }
    catch (e) {
      if (e instanceof Erreur) return { erreur: e.message };
      return { erreur: e.message || 'nom non reconnu' };
    }
  }

  // Article devant le nom : « de l'éthanol », « du propane », « de la propanone »
  function avecDe(nom) {
    if (!nom) return '';
    if (voyelle(sansAccents(nom)[0])) return 'de l\'' + nom;
    const feminin = /(one|amine|ine)$/.test(nom.split(' ')[0]) || /^(eau|ozone|phosphine)$/.test(nom) || /^ion /.test(nom);
    return (feminin ? 'de la ' : 'du ') + nom;
  }

  // ═════════════════════ NOMS SIMPLIFIÉS ═════════════════════════════
  // Retire les locants qui ne lèvent aucune ambiguïté : propan-2-one → propanone,
  // 2-méthylpropane → méthylpropane, 2-méthylpropan-2-ol → méthylpropan-2-ol.
  // Méthode : on essaie toutes les autres valeurs des locants retirés ; si aucune
  // ne donne une autre molécule dont le nom s'écrirait pareil, le locant est inutile.

  // Groupes de locants hors parenthèses (et hors partie alkyle d'un ester)
  function groupesLocants(nom) {
    const fin = (/(oate|carboxylate) d/.exec(nom) || { index: nom.length }).index;
    const res = [];
    let prof = 0;
    for (let i = 0; i < fin; i++) {
      const c = nom[i];
      if (c === '(') prof++;
      else if (c === ')') prof--;
      else if (prof === 0 && /\d/.test(c) && !/[\d,]/.test(nom[i - 1] || '')) {
        const m = /^\d+(,\d+)*-/.exec(nom.slice(i));
        if (!m || /[a-zé]/i.test(nom[i - 1] || '') && nom[i - 1] !== '-') continue;
        res.push({ debut: i, fin: i + m[0].length - 1, locs: m[0].slice(0, -1).split(',').map(Number) });
        i += m[0].length - 1;
      }
    }
    return res;
  }
  // Nom où les groupes de l'ensemble « omis » sont retirés (ou remplacés par « valeurs »)
  function reecrire(nom, groupes, valeurs) {
    let s = '';
    let pos = 0;
    groupes.forEach((g, i) => {
      const v = valeurs[i];
      let deb = g.debut;
      if (v === null && nom[deb - 1] === '-') deb--; // « -2- » → rien ; « 2- » → rien
      s += nom.slice(pos, deb) + (v === null ? '' : v.join(','));
      pos = v === null ? g.fin + 1 : g.fin;
    });
    return s + nom.slice(pos);
  }
  const gabarit = nom => reecrire(nom, groupesLocants(nom), groupesLocants(nom).map(() => null));

  // Suites croissantes de k locants pris entre 1 et n
  function suites(k, n) {
    const res = [];
    const f = (deb, cour) => {
      if (cour.length === k) { res.push(cour.slice()); return; }
      for (let x = deb; x <= n; x++) { cour.push(x); f(x, cour); cour.pop(); }
    };
    f(1, []);
    return res;
  }

  const cacheCanon = new Map();
  function canonique(nom) {
    if (cacheCanon.has(nom)) return cacheCanon.get(nom);
    let r = null;
    try {
      const g = lire(nom), an = C_.analyser(g);
      if (an.composantes.length === 1) r = nommer(an, an.composantes[0]).nom;
    } catch (e) { r = null; }
    cacheCanon.set(nom, r);
    return r;
  }

  function simplifier(nom, nMax) {
    if (!nom) return nom;
    const groupes = groupesLocants(nom);
    if (!groupes.length || canonique(nom) !== nom) return nom;
    const n = Math.max(3, Math.min(12, nMax || 8));
    const modele = gabarit(nom);
    const omis = new Set();
    const ambigu = ensemble => {
      const listes = groupes.map((g, i) => (ensemble.has(i) ? suites(g.locs.length, n) : [g.locs]));
      const total = listes.reduce((p, l) => p * l.length, 1);
      if (total > 4000) return true;
      const idx = listes.map(() => 0);
      for (let t = 0; t < total; t++) {
        const essai = reecrire(nom, groupes, idx.map((j, i) => listes[i][j]));
        const c = essai === nom ? nom : canonique(essai);
        if (c && c !== nom && gabarit(c) === modele) {
          // même écriture une fois les locants omis retirés ?
          const gc = groupesLocants(c);
          if (gc.length === groupes.length && gc.every((g, i) => ensemble.has(i) || g.locs.join() === groupes[i].locs.join())) return true;
        }
        for (let i = 0; i < idx.length; i++) { if (++idx[i] < listes[i].length) break; idx[i] = 0; }
      }
      return false;
    };
    // Les locants des préfixes s'omettent tous ensemble (sinon « 2-aminométhyl… » se lirait mal)
    const prefixe = g => {
      const suite = sansAccents(nom.slice(g.fin + 1));
      return suite[0] === '(' || NOMS_SUBST.some(x => suite.startsWith(x)) ||
        /^(di|tri|tetra|penta|hexa|bis|tris)/.test(suite) && NOMS_SUBST.some(x => suite.replace(/^(di|tri|tetra|penta|hexa|bis|tris)/, '').startsWith(x));
    };
    const blocs = [];
    const iPref = groupes.map((g, i) => i).filter(i => prefixe(groupes[i]));
    if (iPref.length) blocs.push(iPref);
    groupes.forEach((g, i) => { if (!iPref.includes(i)) blocs.push([i]); });
    blocs.forEach(b => {
      const essai = new Set(omis); b.forEach(i => essai.add(i));
      if (!ambigu(essai)) b.forEach(i => omis.add(i));
    });
    if (!omis.size) return nom;
    return reecrire(nom, groupes, groupes.map((g, i) => (omis.has(i) ? null : g.locs)));
  }

  return { nommer, lireNom, avecDe, simplifier, USUELS, sansAccents };
})();

if (typeof module !== 'undefined') module.exports = Nomenclature;
