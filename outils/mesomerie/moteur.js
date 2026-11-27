/* Mésomérie — modèle électronique : doublets non liants, électrons de liaison, flèches (2 e⁻) et demi-flèches (1 e⁻) */
const Meso = (() => {
  const V = { H: 1, C: 4, N: 5, O: 6, S: 6, P: 5, Cl: 7, Br: 7, F: 7 };
  const CHI = { H: 2.20, C: 2.55, N: 3.04, O: 3.44, S: 2.58, P: 2.19, Cl: 3.16, Br: 2.96, F: 3.98 };
  const PERIODE2 = new Set(['C', 'N', 'O', 'F']);
  const cle = (i, j) => (i < j ? i + '-' + j : j + '-' + i);

  // molécule : { atomes:[{el,x,y,h,ne}], liaisons:[[i,j,ordre]] } → forme de base
  function formeBase(m) {
    const e = {};
    m.liaisons.forEach(([i, j, o]) => { e[cle(i, j)] = 2 * o; });
    return { ne: m.atomes.map(a => a.ne || 0), e };
  }
  const copie = f => ({ ne: f.ne.slice(), e: { ...f.e } });
  const memeForme = (f, g) => f.ne.every((x, i) => x === g.ne[i]) && Object.keys(f.e).every(k => f.e[k] === g.e[k]);

  // grandeurs dérivées d'une forme
  function analyser(m, f) {
    const n = m.atomes.length, liees = Array(n).fill(0);
    Object.entries(f.e).forEach(([k, x]) => { const [i, j] = k.split('-').map(Number); liees[i] += x; liees[j] += x; });
    const at = m.atomes.map((a, i) => {
      const h = a.h || 0, q = V[a.el] - f.ne[i] - h - liees[i] / 2, tour = f.ne[i] + 2 * h + liees[i];
      return { q, tour, paires: Math.floor(f.ne[i] / 2), radical: f.ne[i] % 2, lacune: a.el !== 'H' && PERIODE2.has(a.el) && tour <= 6 && tour % 2 === 0 ? 1 : 0 };
    });
    // critères de représentativité (cours : octet, minimum de charges, accord avec l'électronégativité)
    const lourds = m.atomes.map((a, i) => i).filter(i => m.atomes[i].el !== 'H');
    const chis = lourds.map(i => CHI[m.atomes[i].el]), cmax = Math.max(...chis), cmin = Math.min(...chis);
    const defaut = lourds.filter(i => ['C', 'N', 'O'].includes(m.atomes[i].el) && at[i].tour < 8);
    const depasse = lourds.filter(i => PERIODE2.has(m.atomes[i].el) && at[i].tour > 8);
    const charges = at.reduce((s, a) => s + Math.abs(a.q), 0);
    let elec = 0; const malPlacees = [];
    at.forEach((a, i) => {
      if (!a.q) return; const c = CHI[m.atomes[i].el];
      const ec = a.q < 0 ? cmax - c : c - cmin;
      // une charge est « mal placée » s'il existe un atome plus approprié pour la porter
      if (ec > 1e-6 && lourds.length > 1) { elec += ec * Math.abs(a.q); malPlacees.push(i); }
    });
    const radicaux = at.reduce((s, a) => s + a.radical, 0);
    return { at, defaut, depasse, charges, elec, malPlacees, radicaux, interdite: depasse.length > 0, chargeTotale: at.reduce((s, a) => s + a.q, 0) };
  }

  // lecture d'une flèche écrite « S>T » : S, T = « i » (atome) ou « i-j » (liaison) ; « ~ » demi-flèche, « ! » courbure inversée
  function lireFleche(t) {
    let n = 2, s = 0; t = t.trim();
    if (t[0] === '~') { n = 1; t = t.slice(1); }
    if (t.endsWith('!')) { s = -1; t = t.slice(0, -1); }
    const [a, b] = t.split('>');
    const site = x => (x.includes('-') ? { l: x.split('-').map(Number) } : { a: Number(x) });
    return { de: site(a), vers: site(b), n, s };
  }
  const lireEtape = t => (t ? t.split(/\s+/).filter(Boolean).map(lireFleche) : []);

  // applique une série de flèches ; renvoie { forme } ou { erreur }
  function appliquer(m, f, fleches) {
    const g = copie(f), noms = i => nomAtome(m, i);
    if (!fleches.length) return { erreur: 'Place au moins une flèche courbe.' };
    for (const fl of fleches) {
      const { de, vers, n } = fl;
      // départ
      if (de.a !== undefined) {
        if (g.ne[de.a] === 0) return { erreur: `${noms(de.a)} ne porte ni doublet non liant ni électron célibataire.` };
        if (n === 2 && g.ne[de.a] === 1) return { erreur: `${noms(de.a)} ne porte qu’un électron célibataire : utilise une demi-flèche (1 électron).` };
        if (vers.a !== undefined) return { erreur: 'Une flèche partant d’un doublet (ou d’un électron célibataire) arrive sur une liaison voisine, pas sur un atome.' };
        if (!vers.l.includes(de.a)) return { erreur: `La flèche partant de ${noms(de.a)} doit arriver sur une liaison de cet atome.` };
        g.ne[de.a] -= n;
      } else {
        const k = cle(...de.l);
        if (f.e[k] === undefined) return { erreur: 'Départ invalide.' };
        if (g.e[k] - n < 2) return { erreur: 'Cette liaison est simple : ses électrons ne peuvent pas être déplacés, sinon le squelette serait modifié (interdit en mésomérie).' };
        if (vers.a !== undefined && !de.l.includes(vers.a)) return { erreur: 'Les électrons d’une liaison ne peuvent aller que sur l’un de ses deux atomes, ou sur une liaison voisine.' };
        if (vers.l && cle(...vers.l) === k) return { erreur: 'La flèche doit arriver sur une autre liaison.' };
        if (vers.l && !vers.l.some(x => de.l.includes(x))) return { erreur: 'La liaison d’arrivée doit être voisine de la liaison de départ (atome commun).' };
        g.e[k] -= n;
      }
      // arrivée
      if (vers.a !== undefined) g.ne[vers.a] += n;
      else {
        const k = cle(...vers.l);
        if (f.e[k] === undefined) return { erreur: 'Il n’y a pas de liaison à cet endroit : en mésomérie, le squelette ne change pas.' };
        g.e[k] += n;
      }
    }
    if (g.ne.some(x => x < 0)) return { erreur: 'Un atome ne peut pas donner plus d’électrons qu’il n’en possède.' };
    for (const [k, x] of Object.entries(g.e)) {
      if (x < 2) return { erreur: 'Une liaison simple a été rompue : le squelette doit rester intact.' };
      if (x % 2) return { erreur: 'Une liaison contiendrait un nombre impair d’électrons : les demi-flèches doivent se compléter (une demi-flèche vers une liaison doit être accompagnée d’une seconde).' };
    }
    if (memeForme(f, g)) return { erreur: 'Ces flèches redonnent la même formule.' };
    return { forme: g };
  }

  function nomAtome(m, i) {
    const a = m.atomes[i], el = a.el;
    const art = /^[AEIOUYH]/.test(el) && el !== 'H' ? 'l’' : 'le ';
    const noms = { C: 'carbone', N: 'azote', O: 'oxygène', S: 'soufre', P: 'phosphore', H: 'hydrogène' };
    return (noms[el] ? (el === 'O' || el === 'N' || el === 'H' ? 'l’' : 'le ') + noms[el] : art + el) + (a.num ? ' ' + a.num : '');
  }

  // génère la chaîne de formules d'une molécule de la bibliothèque
  function chaine(m) {
    let f = formeBase(m); const formes = [f], fleches = [];
    (m.suite || []).forEach(t => {
      const fl = lireEtape(t), r = appliquer(m, f, fl);
      if (r.erreur) throw new Error(m.id + ' : ' + t + ' → ' + r.erreur);
      fleches.push(fl); f = r.forme; formes.push(f);
    });
    fleches.push([]);
    const interdites = (m.interdites || []).map(t => { const fl = lireEtape(t), r = appliquer(m, formes[0], fl); if (r.erreur) throw new Error(m.id + ' interdite : ' + r.erreur); return { forme: r.forme, fleches: fl }; });
    return { formes, fleches, interdites };
  }

  // représentativité relative d'un ensemble de formes
  const score = a => [a.defaut.length, a.charges, Math.round(a.elec * 100)];
  const cmp = (x, y) => { for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
  function classer(m, formes) {
    const an = formes.map(f => analyser(m, f)), sc = an.map(score);
    const valides = sc.filter((s, i) => !an[i].interdite);
    const best = valides.reduce((b, s) => (!b || cmp(s, b) < 0 ? s : b), null);
    const nbBest = valides.filter(s => cmp(s, best) === 0).length;
    return an.map((a, i) => {
      if (a.interdite) return { a, rang: 'interdite', texte: 'interdite', raison: `${nomAtome(m, a.depasse[0])} aurait ${a.at[a.depasse[0]].tour} électrons : un élément de la 2ᵉ période ne dépasse jamais l’octet.` };
      const s = sc[i];
      if (cmp(s, best) === 0) return { a, rang: 'max', texte: 'la plus représentative', egalite: nbBest > 1 };
      let raison;
      if (s[0] > best[0]) raison = 'octet non respecté';
      else if (s[1] > best[1]) raison = 'plus de charges formelles';
      else raison = 'charges en désaccord avec l’électronégativité';
      return { a, rang: s[0] > best[0] ? 'faible' : 'moins', texte: s[0] > best[0] ? 'négligeable' : 'moins représentative', raison };
    });
  }

  return { V, CHI, cle, formeBase, copie, memeForme, analyser, lireFleche, lireEtape, appliquer, chaine, classer, nomAtome };
})();
if (typeof module !== 'undefined') module.exports = Meso;
