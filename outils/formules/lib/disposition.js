/* Repris de « Formules des molécules » (Schématisation en physique-chimie), © 2026 Gaëtan PORTIER, licence MIT.
   https://forge.apps.education.fr/schemas-physique-chimie — fichier non modifié. */
// ═══════════════════════════════════════════════════════════════════
// Disposition des atomes (coordonnées en longueurs de liaison) :
//   · zigzag(an, noeuds, chaine)  : angles de 120°, cycles en polygones
//     réguliers (représentation topologique, molécule lue par son nom) ;
//   · croix(an, noeuds)           : quadrillage, chaîne principale à
//     l'horizontale, ramifications verticales, H tout autour (formules
//     développée et semi-développée « comme au tableau ») ;
//   · anglesLibres(...)           : directions libres autour d'un atome
//     (H d'une formule dessinée à la main, doublets non liants).
// Aucun accès au DOM.
// ═══════════════════════════════════════════════════════════════════

'use strict';

const Disposition = (() => {
  const RAD = Math.PI / 180;
  const norm = a => ((a % 360) + 540) % 360 - 180; // angle ramené dans ]-180 ; 180]
  const ecart = (a, b) => Math.abs(norm(a - b));

  // Cycles simples d'un sous-graphe (null si cycles accolés)
  function cycles(an, noeuds) {
    const dans = new Set(noeuds);
    const adj = k => an.voisins[k].filter(v => dans.has(v.j)).map(v => v.j);
    const relies = (a, b) => {
      const vu = new Set([a]), pile = [a];
      while (pile.length) {
        const k = pile.pop();
        for (const j of adj(k)) {
          if ((k === a && j === b)) continue;
          if (j === b) return true;
          if (!vu.has(j)) { vu.add(j); pile.push(j); }
        }
      }
      return false;
    };
    const aretes = new Map(noeuds.map(k => [k, []]));
    noeuds.forEach(a => adj(a).forEach(b => { if (b > a && relies(a, b)) { aretes.get(a).push(b); aretes.get(b).push(a); } }));
    const cycleDe = new Map(), liste = [];
    for (const a of noeuds) {
      if (!aretes.get(a).length || cycleDe.has(a)) continue;
      if (aretes.get(a).length !== 2) return null;
      const cy = [a];
      cycleDe.set(a, liste.length);
      let prec = a, cour = aretes.get(a)[0];
      while (cour !== a) {
        if (aretes.get(cour).length !== 2) return null;
        cy.push(cour); cycleDe.set(cour, liste.length);
        const s = aretes.get(cour);
        const suiv = s[0] === prec ? s[1] : s[0];
        prec = cour; cour = suiv;
      }
      liste.push(cy);
    }
    return { liste, cycleDe, adj };
  }

  // Plus long chemin d'un arbre (à égalité : le plus de carbones)
  function plusLongChemin(an, noeuds, adj) {
    let meilleur = [noeuds[0]], score = -1;
    noeuds.forEach(u => {
      const prec = new Map([[u, -1]]), file = [u];
      while (file.length) {
        const k = file.shift();
        adj(k).forEach(j => { if (!prec.has(j)) { prec.set(j, k); file.push(j); } });
      }
      prec.forEach((_, v) => {
        const ch = [];
        for (let k = v; k !== -1; k = prec.get(k)) ch.push(k);
        // à égalité : bouts portant des H (–OH plutôt que =O)
        const s = ch.length * 100 + ch.filter(k => an.atomes[k].el === 'C').length * 2 + (an.H[v] > 0 ? 1 : 0) + (an.H[u] > 0 ? 1 : 0);
        if (s > score) { score = s; meilleur = ch.reverse(); }
      });
    });
    return meilleur;
  }

  const lineaire = (an, k) => {
    const v = an.voisins[k];
    return v.some(x => x.ordre === 3) || v.filter(x => x.ordre === 2).length >= 2;
  };

  // ── Zigzag à 120° (+ cycles réguliers) ─────────────────────────────
  function zigzag(an, noeuds, chaine) {
    const cy = cycles(an, noeuds);
    if (!cy) return null;
    const { liste, cycleDe, adj } = cy;
    const pos = new Map();
    // Chaîne principale prolongée jusqu'aux atomes terminaux de ses deux bouts (OH, NH2, Cl…) :
    // ils font partie du zigzag, sinon le C de bout serait dans l'alignement et deviendrait invisible
    if (chaine && chaine.length && !liste.length) {
      chaine = chaine.slice();
      const prolonger = bout => {
        const libres = adj(bout).filter(j => !chaine.includes(j) && adj(j).length === 1);
        if (!libres.length) return null;
        // de préférence une liaison simple (–OH plutôt que =O)
        libres.sort((a, b) => ordre(bout, a) - ordre(bout, b));
        return libres[0];
      };
      const ordre = (a, b) => (an.voisins[a].find(v => v.j === b) || { ordre: 1 }).ordre;
      const debut = prolonger(chaine[0]);
      if (debut !== null) chaine.unshift(debut);
      if (chaine.length > 1) { const fin = prolonger(chaine[chaine.length - 1]); if (fin !== null) chaine.push(fin); }
    }
    const principal = new Set(chaine || []);
    let depart = chaine && chaine.length ? chaine[0] : null;
    if (depart === null) {
      // Bout du plus long chemin si la molécule est un arbre, sinon un atome de cycle
      depart = liste.length ? liste[0][0] : plusLongChemin(an, noeuds, adj)[0];
      if (!liste.length) plusLongChemin(an, noeuds, adj).forEach(k => principal.add(k));
    }
    const vec = a => [Math.cos(a * RAD), Math.sin(a * RAD)];

    function placerCycle(c, entree, angleEntree) {
      // le cycle s'étend dans la direction angleEntree depuis l'atome d'entrée
      const atomes = liste[c], n = atomes.length, i0 = atomes.indexOf(entree);
      const R = 1 / (2 * Math.sin(Math.PI / n));
      const p = pos.get(entree), [dx, dy] = vec(angleEntree);
      const centre = [p[0] + R * dx, p[1] + R * dy];
      const a0 = angleEntree + 180;
      for (let i = 1; i < n; i++) {
        const k = atomes[(i0 + i) % n];
        if (pos.has(k)) continue;
        const [cx, cy2] = vec(a0 + i * 360 / n);
        pos.set(k, [centre[0] + R * cx, centre[1] + R * cy2]);
      }
      atomes.forEach(k => {
        const q = pos.get(k);
        const radial = Math.atan2(q[1] - centre[1], q[0] - centre[0]) / RAD;
        branches(k, radial, 1, true);
      });
    }

    // Place les voisins non placés de k ; theta : direction d'arrivée sur k
    function branches(k, theta, s, depuisCycle) {
      const enfants = adj(k).filter(j => !pos.has(j));
      if (!enfants.length) return;
      enfants.sort((a, b) => (principal.has(b) ? 1 : 0) - (principal.has(a) ? 1 : 0));
      const occupes = adj(k).filter(j => pos.has(j)).map(j => {
        const q = pos.get(j), p = pos.get(k);
        return Math.atan2(q[1] - p[1], q[0] - p[0]) / RAD;
      });
      // atome de départ : la direction d'arrivée fictive compte comme occupée (angles de 120°)
      if (k === depart && !occupes.length) occupes.push(theta + 180);
      const angles = [];
      if (depuisCycle) {
        // substituants d'un atome de cycle : vers l'extérieur
        const m = enfants.length;
        enfants.forEach((_, i) => angles.push(theta + (i - (m - 1) / 2) * (m > 1 ? 60 : 0)));
      } else {
        const premier = lineaire(an, k) ? theta : theta + 60 * s;
        angles.push(premier);
        const reste = enfants.length - 1;
        if (reste > 0) {
          const occ = occupes.concat([premier]).map(norm).sort((a, b) => a - b);
          let deb = 0, taille = -1;
          occ.forEach((a, i) => {
            const b = i + 1 < occ.length ? occ[i + 1] : occ[0] + 360;
            if (b - a > taille) { taille = b - a; deb = a; }
          });
          for (let i = 1; i <= reste; i++) angles.push(deb + i * taille / (reste + 1));
        }
      }
      const p = pos.get(k);
      enfants.forEach((j, i) => {
        const a = angles[i];
        if (cycleDe.has(j) && !pos.has(j)) {
          const [dx, dy] = vec(a);
          pos.set(j, [p[0] + dx, p[1] + dy]);
          placerCycle(cycleDe.get(j), j, a);
          return;
        }
        const [dx, dy] = vec(a);
        pos.set(j, [p[0] + dx, p[1] + dy]);
        branches(j, a, i === 0 ? -s : (norm(a - theta) > 0 ? -1 : 1), false);
      });
    }

    pos.set(depart, [0, 0]);
    if (cycleDe.has(depart)) placerCycle(cycleDe.get(depart), depart, 0);
    else {
      // départ : comme si l'on arrivait par la direction 30° (premier enfant à −30°)
      branches(depart, 30, -1, false);
    }
    return pos;
  }

  // ── Disposition en croix (quadrillage) ─────────────────────────────
  // lourds : atomes autres que H ; hydrogenes : Map lourd → nombre de H
  // (implicites + explicites) ; renvoie { pos, h: Map lourd → [[x,y]…], mauvais }
  const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  const DIAG = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

  function croix(an, lourds, hydrogenes, options) {
    const cy = cycles(an, lourds);
    if (!cy || cy.liste.length) return null;
    const { adj } = cy;
    let meilleur = null;
    // Toutes les liaisons à la même longueur ; branches allongées seulement si les atomes se chevauchent
    for (const longueurBranche of [1, 2]) {
      const r = essaiCroix(an, lourds, adj, hydrogenes, longueurBranche, options || {});
      if (r && r.mauvais < 100 && (!meilleur || r.mauvais < meilleur.mauvais)) meilleur = r;
      if (meilleur) break;
    }
    return meilleur;
  }

  function essaiCroix(an, lourds, adj, hydrogenes, longueurBranche, options) {
    const chaine = plusLongChemin(an, lourds, adj);
    const pos = new Map(), occ = new Map(), dirArrivee = new Map();
    const cle = (x, y) => x + ',' + y;
    chaine.forEach((k, i) => { pos.set(k, [i, 0]); occ.set(cle(i, 0), k); });
    const surChaine = new Set(chaine);
    // Taille des sous-arbres : les grosses branches sont placées d'abord
    const taille = (k, depuis) => 1 + adj(k).filter(j => j !== depuis && !surChaine.has(j)).reduce((s, j) => s + taille(j, k), 0);
    const libre = (x, y) => !occ.has(cle(x, y));
    const file = chaine.slice();
    let compteHaut = 0;
    while (file.length) {
      const k = file.shift();
      const [x, y] = pos.get(k);
      const enfants = adj(k).filter(j => !pos.has(j)).sort((a, b) => taille(b, k) - taille(a, k));
      for (const j of enfants) {
        let dirs;
        if (surChaine.has(k)) {
          dirs = compteHaut % 2 === 0 ? [[0, -1], [0, 1]] : [[0, 1], [0, -1]];
          if (k === chaine[0]) dirs.push([-1, 0]);
          if (k === chaine[chaine.length - 1]) dirs.push([1, 0]);
        } else {
          const d = dirArrivee.get(k);
          dirs = [d, [d[1], d[0]], [-d[1], -d[0]]];
        }
        const longueurs = surChaine.has(k) ? (longueurBranche === 2 ? [2, 1, 3] : [1, 2, 3]) : [1, 2];
        let place = false;
        for (const L of longueurs) {
          for (const d of dirs) {
            let ok = true;
            for (let t = 1; t <= L; t++) if (!libre(x + d[0] * t, y + d[1] * t)) { ok = false; break; }
            if (!ok) continue;
            pos.set(j, [x + d[0] * L, y + d[1] * L]);
            for (let t = 1; t < L; t++) occ.set(cle(x + d[0] * t, y + d[1] * t), -1);
            occ.set(cle(x + d[0] * L, y + d[1] * L), j);
            dirArrivee.set(j, d);
            if (surChaine.has(k)) compteHaut++;
            place = true; break;
          }
          if (place) break;
        }
        if (!place) return null;
        file.push(j);
      }
    }
    // Hydrogènes
    const occ0 = new Map(occ);
    function placerH(classement) {
    const occ = new Map(occ0);
    const libre = (x, y) => !occ.has(cle(x, y));
    const h = new Map();
    let mauvais = 0;
    const points = [...pos.values()].map(p => p.slice());
    const loin = q => !points.some(p => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.7);
    const segments = [];
    lourds.forEach(k => adj(k).forEach(j => { if (j > k) segments.push([pos.get(k), pos.get(j)]); }));
    const distSegment = (q, u, v) => {
      const dx = v[0] - u[0], dy = v[1] - u[1], L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((q[0] - u[0]) * dx + (q[1] - u[1]) * dy) / L2));
      return Math.hypot(u[0] + t * dx - q[0], u[1] + t * dy - q[1]);
    };
    // Atome trigonal en bout de chaîne (=CH2, =NH) : H à 120° de la double liaison
    const trigonal = k => adj(k).length === 1 && (an.voisins[k].find(v => v.j === adj(k)[0]) || {}).ordre === 2 && (hydrogenes.get(k) || 0) > 0;
    const faits = new Set();
    classement.forEach(k => {
      faits.add(k);
      // places libres encore utiles aux atomes suivants : à éviter pour les H à 45°
      const reserves = [];
      lourds.forEach(j => {
        if (faits.has(j) || !(hydrogenes.get(j) || 0)) return;
        const [a, b] = pos.get(j);
        DIRS.forEach(d => { if (libre(a + d[0], b + d[1])) reserves.push([a + d[0], b + d[1]]); });
      });
      const n = hydrogenes.get(k) || 0, liste = [];
      if (!n) { h.set(k, liste); return; }
      const [x, y] = pos.get(k);
      if (trigonal(k)) {
        const [px, py] = pos.get(adj(k)[0]);
        const dos = Math.atan2(y - py, x - px);
        [-1, 1].forEach(sg => {
          if (liste.length >= n) return;
          const q = [x + Math.cos(dos + sg * Math.PI / 3), y + Math.sin(dos + sg * Math.PI / 3)];
          if (loin(q)) { liste.push(q); points.push(q); }
        });
        if (liste.length >= n) { h.set(k, liste); return; }
      }
      const d = dirArrivee.get(k);
      let ordre;
      if (d) ordre = [d, [d[1], d[0]], [-d[1], -d[0]]];
      else if (k === chaine[0] && chaine.length > 1) ordre = [[-1, 0], [0, -1], [0, 1]];
      else if (k === chaine[chaine.length - 1] && chaine.length > 1) ordre = [[1, 0], [0, -1], [0, 1]];
      else ordre = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      if (options.horizontal && chaine.length === 1) ordre = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      ordre = ordre.concat(DIRS);
      const vus = new Set();
      for (const dd of ordre) {
        if (liste.length >= n) break;
        const c = cle(x + dd[0], y + dd[1]);
        if (vus.has(c) || !libre(x + dd[0], y + dd[1]) || !loin([x + dd[0], y + dd[1]])) continue;
        vus.add(c);
        // le H ne doit pas couper une liaison longue
        liste.push([x + dd[0], y + dd[1]]); occ.set(c, -2); points.push([x + dd[0], y + dd[1]]);
      }
      // Place manquante : H à la même distance (liaison de longueur 1), dans la direction
      // la plus dégagée (pas de 15°), loin des autres atomes et des liaisons
      while (liste.length < n) {
        let best = null, score = -1;
        for (let a = 0; a < 360; a += 15) {
          const q = [x + Math.cos(a * Math.PI / 180), y + Math.sin(a * Math.PI / 180)];
          const dP = Math.min(...points.map(p => Math.hypot(p[0] - q[0], p[1] - q[1])));
          const dS = Math.min(Infinity, ...segments.map(([u, v]) => distSegment(q, u, v)));
          const dR = Math.min(Infinity, ...reserves.map(p => Math.hypot(p[0] - q[0], p[1] - q[1])));
          const sc = Math.min(dP, dS * 1.6, dR + 0.25) + (a % 45 === 0 ? 0.02 : 0);
          if (sc > score) { score = sc; best = q; }
        }
        liste.push(best); mauvais += score < 0.6 ? 100 : 1; // ≥ 100 : H trop serré (échec)
        points.push(best);
      }
      liste.forEach(q => segments.push([pos.get(k), q]));
      h.set(k, liste);
    });
    return { h, mauvais };
    }
    // Plusieurs ordres de placement des H ; on garde celui qui laisse le moins de H mal placés
    const trig = k => adj(k).length === 1 && (an.voisins[k].find(v => v.j === adj(k)[0]) || {}).ordre === 2;
    const nh = k => hydrogenes.get(k) || 0;
    const marge = k => { const [x, y] = pos.get(k); return DIRS.filter(d => !occ0.has(cle(x + d[0], y + d[1]))).length - nh(k); };
    const ordres = [
      lourds.slice().sort((a, b) => trig(b) - trig(a) || surChaine.has(b) - surChaine.has(a)),
      lourds.slice().sort((a, b) => trig(b) - trig(a) || surChaine.has(a) - surChaine.has(b) || nh(b) - nh(a)),
      lourds.slice().sort((a, b) => trig(b) - trig(a)),
      // les plus contraints d'abord : places libres autour moins H à placer
      lourds.slice().sort((a, b) => trig(b) - trig(a) || marge(a) - marge(b) || nh(a) - nh(b))
    ];
    let res = null;
    ordres.forEach(o => { const r = placerH(o); if (!res || r.mauvais < res.mauvais) res = r; });
    const { h, mauvais } = res;
    return { pos, h, mauvais: mauvais + (longueurBranche === 2 ? 0.5 : 0), chaine };
  }

  // ── Directions libres autour d'un atome ────────────────────────────
  // occupes : angles (degrés) déjà pris ; n : nombre de directions voulues
  function anglesLibres(occupes, n, options) {
    const opt = options || {};
    const pris = occupes.slice();
    const droit = pris.length > 0 && pris.every(a => Math.abs(norm(a) % 90) < 4 || Math.abs(Math.abs(norm(a) % 90) - 90) < 4);
    let cand;
    if (opt.candidats) cand = opt.candidats;
    else if (droit || !pris.length) cand = [-90, 90, 180, 0, -45, 45, -135, 135];
    else cand = Array.from({ length: 24 }, (_, i) => i * 15 - 180);
    const res = [];
    for (let i = 0; i < n; i++) {
      let best = null, bestD = -1;
      cand.forEach(a => {
        const d = pris.length ? Math.min(...pris.map(p => ecart(a, p))) : 180;
        if (d > bestD + 0.01) { bestD = d; best = a; }
      });
      if (best === null) break;
      res.push(best); pris.push(best);
    }
    return res;
  }

  // ── Disposition pour les mécanismes (semi-développées) ─────────────
  // Carbones trigonaux plans (double liaison, carbocation) : liaisons à 120° ;
  // les autres atomes en croix (90°). Départ : un carbone trigonal, sa double
  // liaison à l'horizontale vers la droite, ses autres voisins à ±120°.
  // Renvoie null s'il n'y a pas de carbone trigonal (la croix habituelle convient).
  function mecanisme(an, noeuds) {
    const cy = cycles(an, noeuds);
    if (!cy || cy.liste.length) return null;
    const dans = new Set(noeuds);
    const vois = k => an.voisins[k].filter(v => dans.has(v.j));
    const geometrie = k => {
      const v = vois(k);
      if (v.some(x => x.ordre === 3) || v.filter(x => x.ordre === 2).length >= 2) return 'lineaire';
      const a = an.atomes[k];
      if (a.el === 'C' && (v.some(x => x.ordre === 2) || (a.charge > 0 && an.somme[k] + an.H[k] === 3))) return 'trigonal';
      return 'croix';
    };
    const trig = noeuds.filter(k => geometrie(k) === 'trigonal' && an.atomes[k].el === 'C');
    if (!trig.length) return null;
    // départ : de préférence le carbone trigonal qui a le plus de voisins
    const depart = trig.slice().sort((a, b) => vois(b).length - vois(a).length)[0];
    const pos = new Map([[depart, [0, 0]]]);
    const placer = (k, enfants, angles) => {
      const p = pos.get(k);
      // tous les voisins d'abord, puis leurs branches (pour connaître la place prise)
      const dirs = enfants.map((v, i) => {
        const a = angles[i] !== undefined ? angles[i] : angles[angles.length - 1] + 45 * (i - angles.length + 1);
        pos.set(v.j, [p[0] + Math.cos(a * RAD), p[1] + Math.sin(a * RAD)]);
        return a;
      });
      enfants.forEach((v, i) => branche(v.j, dirs[i]));
    };
    function branche(k, theta) {
      const enfants = vois(k).filter(v => !pos.has(v.j));
      if (!enfants.length) return;
      const g = geometrie(k);
      let angles;
      if (g === 'lineaire') angles = [theta];
      else if (g === 'trigonal') {
        // un seul substituant : du côté le plus dégagé (zigzag, trans)
        angles = [theta - 60, theta + 60];
        if (enfants.length === 1) {
          const p = pos.get(k);
          // gêne = somme des 1/d² aux atomes déjà placés (sauf l'atome lui-même)
          const gene = a => [...pos].reduce((t, [j, q]) => j === k ? t : t + 1 / (Math.hypot(p[0] + Math.cos(a * RAD) - q[0], p[1] + Math.sin(a * RAD) - q[1]) ** 2 + 1e-6), 0);
          angles.sort((x, y) => gene(x) - gene(y));
        }
      } else {
        // croix : directions horizontales et verticales (la chaîne reprend l'horizontale)
        const dos = norm(theta + 180);
        const axes = [0, 180, -90, 90].filter(a => ecart(a, dos) > 46);
        axes.sort((a, b) => ecart(a, theta) - ecart(b, theta) || (Math.abs(a) === 90) - (Math.abs(b) === 90));
        angles = axes;
      }
      // la double liaison prend la première direction
      enfants.sort((x, y) => y.ordre - x.ordre);
      placer(k, enfants, angles);
    }
    const premiers = vois(depart).sort((x, y) => y.ordre - x.ordre);
    // C=O, C=N… en bout : l'hétéroatome vers le haut, les deux autres liaisons en bas à 120° ;
    // C=C : double liaison à l'horizontale, les deux autres à ±120°
    const terminalHetero = premiers.length && premiers[0].ordre === 2 && an.atomes[premiers[0].j].el !== 'C' && vois(premiers[0].j).length === 1;
    placer(depart, premiers, terminalHetero ? [-90, 150, 30] : [0, -120, 120]);
    return pos;
  }

  return { zigzag, croix, mecanisme, anglesLibres, cycles, plusLongChemin, norm, ecart };
})();

if (typeof module !== 'undefined') module.exports = Disposition;
