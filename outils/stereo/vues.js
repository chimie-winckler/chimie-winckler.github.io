/* Représentations spatiales — dessins SVG (Cram, Newman, Fischer, Haworth) */
const Vues = (() => {
  const S = Stereo, RAD = Math.PI / 180;
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  // texte chimique : chiffres en indice
  function txt(x, y, t, opt = {}) {
    const anc = opt.anc || 'middle', cls = opt.cls ? ` class="${opt.cls}"` : '', data = opt.c !== undefined ? ` data-c="${opt.c}"` : '';
    const parts = String(t).split(/(\d+)/).map((p, k) => (k % 2 ? `<tspan class="ind" baseline-shift="sub">${p}</tspan>` : esc(p))).join('');
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anc}" dominant-baseline="central"${cls}${data}>${parts}</text>`;
  }
  // largeur approximative d'une étiquette (pour raccourcir les liaisons)
  const larg = t => String(t).replace(/\d/g, '').length * 9.2 + String(t).replace(/\D/g, '').length * 6;
  const ligne = (a, b, cls = '') => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"${cls ? ` class="${cls}"` : ''}/>`;
  function coin(a, b) {                       // coin plein de a (centre) vers b
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L * 4.2, ny = dx / L * 4.2;
    return `<polygon class="coin" points="${a[0]},${a[1]} ${b[0] + nx},${b[1] + ny} ${b[0] - nx},${b[1] - ny}"/>`;
  }
  function hachures(a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), n = Math.max(5, Math.round(L / 4.5));
    let s = '';
    for (let q = 1; q <= n; q++) {
      const t = q / n, w = 4.4 * t, cx = a[0] + dx * t, cy = a[1] + dy * t, nx = -dy / L * w, ny = dx / L * w;
      s += ligne([cx + nx, cy + ny], [cx - nx, cy - ny], 'hach');
    }
    return s;
  }
  // raccourcit le segment a→b pour ne pas toucher les étiquettes
  function rac(a, b, ra, rb) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    return [[a[0] + dx / L * ra, a[1] + dy / L * ra], [b[0] - dx / L * rb, b[1] - dy / L * rb]];
  }
  const rayon = (t, dx, dy) => { // demi-taille de l'étiquette dans la direction (dx,dy)
    if (!t) return 0; const w = larg(t) / 2 + 3, h = 10, L = Math.hypot(dx, dy) || 1;
    return Math.min(Math.abs(w * L / (dx || 1e-9)), Math.abs(h * L / (dy || 1e-9)));
  };
  function cadre(contenu, box, titre) {
    const [x0, y0, x1, y1] = box, pad = 22;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="stereo-svg" viewBox="${x0 - pad} ${y0 - pad} ${x1 - x0 + 2 * pad} ${y1 - y0 + 2 * pad}" role="img" aria-label="${esc(titre)}">${contenu}</svg>`;
  }
  function boite(pts) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  const lab = (mol, i, depuis, gauche) => { const e = S.etiquette(mol, i, depuis); return gauche ? S.aGauche(e) : e; };
  const rs = (mol, c, opt) => (opt.rs && mol.chir[c] ? S.descripteur(mol, c) : '');

  // chaîne étendue : si une extrémité est stéréogène, on prolonge par son substituant prioritaire
  function chaine(mol) {
    let ch = S.chainePrincipale(mol);
    if (!ch.length) return ch;
    const ext = (bout, voisin) => {
      const pr = S.priorites(mol, bout).ordre.filter(j => j !== voisin && mol.at[j].el !== 'H');
      return pr[0];
    };
    if (ch.length === 1) {
      const c = ch[0]; if (!mol.chir[c]) return ch;
      const pr = S.priorites(mol, c).ordre.filter(j => mol.at[j].el !== 'H');
      return [pr[0], c, pr[1]];
    }
    if (mol.chir[ch[0]]) ch = [ext(ch[0], ch[1])].concat(ch);
    if (mol.chir[ch[ch.length - 1]]) ch = ch.concat([ext(ch[ch.length - 1], ch[ch.length - 2])]);
    return ch.filter(v => v !== undefined);
  }

  // ───────── Fischer ─────────
  function fischer(mol, opt = {}) {
    const ch = chaine(mol);
    const alk = (k, d) => /^(CH3|C\d+H\d+)$/.test(S.etiquette(mol, k, d));
    if (Object.keys(mol.chir).length) {
      while (ch.length > 3 && !mol.chir[ch[ch.length - 2]] && alk(ch[ch.length - 2], ch[ch.length - 3])) ch.pop();
      while (ch.length > 3 && !mol.chir[ch[1]] && alk(ch[1], ch[2])) ch.shift();
    }
    const centres = Object.keys(mol.chir).map(Number);
    if (ch.length < 3) return { erreur: 'La projection de Fischer demande au moins un atome de carbone entre deux atomes de la chaîne.' };
    const hors = centres.filter(c => !ch.slice(1, -1).includes(c));
    if (hors.length) return { erreur: 'Un atome de carbone asymétrique n’est pas sur la chaîne carbonée principale : la projection de Fischer n’est pas adaptée à cette molécule.' };
    const dy = 62, bras = 52, el = [], pts = [], lignes = [];
    let y = 0;
    const haut = S.etiquette(mol, ch[0], ch[1]);
    el.push(txt(0, y, haut)); pts.push([-larg(haut) / 2, y - 12], [larg(haut) / 2, y + 12]);
    const cotes = [], cretes = [];
    for (let q = 1; q < ch.length - 1; q++) {
      const c = ch[q], yc = q * dy;
      const autres = S.voisins(mol, c).filter(v => v !== ch[q - 1] && v !== ch[q + 1]);
      if (autres.length === 1) {                 // C=O dans la chaîne (cétose)
        const e = lab(mol, autres[0], c, false), o = S.ordreLiaison(mol, c, autres[0]);
        lignes.push(ligne([0, yc - dy + 13], [0, yc - 11]));
        if (q === ch.length - 2) lignes.push(ligne([0, yc + 11], [0, yc + dy - 13]));
        el.push(txt(0, yc, 'C'));
        lignes.push(ligne([8, yc - (o > 1 ? 3 : 0)], [30, yc - (o > 1 ? 3 : 0)]));
        if (o > 1) lignes.push(ligne([8, yc + 3], [30, yc + 3]));
        el.push(txt(34, yc, e, { anc: 'start' })); pts.push([40 + larg(e), yc]);
        if (q < ch.length - 2) lignes.push(ligne([0, yc + 11], [0, yc + 11]));
        cretes.push(q);
        continue;
      }
      const m = S.placer(mol, c, new Map([[ch[q - 1], [0, 1, -1]], [ch[q + 1], [0, -1, -1]]]), autres, [[-1, 0, 1], [1, 0, 1]]);
      let g, d; m.forEach((v, k) => { if (k !== ch[q - 1] && k !== ch[q + 1]) { if (v[0] < 0) g = k; else d = k; } });
      const eg = lab(mol, g, c, true), ed = lab(mol, d, c, false);
      cotes.push({ c, g, d });
      lignes.push(ligne([0, yc - dy + 13], [0, yc]), ligne([-bras, yc], [bras, yc]));
      if (q === ch.length - 2) lignes.push(ligne([0, yc], [0, yc + dy - 13]));
      el.push(txt(-bras - 5, yc, eg, { anc: 'end' }), txt(bras + 5, yc, ed, { anc: 'start' }));
      pts.push([-bras - 8 - larg(eg), yc], [bras + 8 + larg(ed), yc]);
      el.push(`<circle class="cible${mol.chir[c] ? ' asym' : ''}" cx="0" cy="${yc}" r="9" data-c="${mol.chir[c] ? c : ''}"/>`);
      if (opt.num) { const nn = S.chainePrincipale(mol).indexOf(c); if (nn >= 0) el.push(txt(-9, yc - 11, String(nn + 1), { anc: 'end', cls: 'num' })); }
      const r = rs(mol, c, opt); if (r) el.push(txt(12, yc - 13, '(' + r + ')', { anc: 'start', cls: 'rs' }));
    }
    y = (ch.length - 1) * dy;
    const bas = S.etiquette(mol, ch[ch.length - 1], ch[ch.length - 2]);
    el.push(txt(0, y, bas)); pts.push([-larg(bas) / 2, y + 12]);
    
    // série D/L (sucres et acides α-aminés)
    let serie = '';
    const estC = k => mol.at[k].el === 'C';
    const nh2 = cotes.find(x => x.c === ch[1] && [x.g, x.d].some(k => S.etiquette(mol, k, x.c) === 'NH2'));
    if (nh2 && S.etiquette(mol, ch[0], ch[1]) === 'COOH') serie = S.etiquette(mol, nh2.g, nh2.c) === 'NH2' ? 'L' : 'D';
    else if (/^(CHO|CH2OH)$/.test(haut) && bas === 'CH2OH' && cotes.length && cotes.every(x => [x.g, x.d].some(k => S.etiquette(mol, k, x.c) === 'OH'))) {
      const der = cotes.filter(x => mol.chir[x.c]).pop();
      if (der) serie = S.etiquette(mol, der.d, der.c) === 'OH' ? 'D' : 'L';
    }
    if (estC && opt.serie && serie) el.push(txt(0, y + 34, 'Série ' + serie, { cls: 'serie' }));
    if (serie) pts.push([0, y + 44]);
    return { svg: cadre(`<g class="liaisons">${lignes.join('')}</g>${el.join('')}`, boite(pts), 'Projection de Fischer'), serie, cotes, chaine: ch };
  }

  // ───────── Cram (chaîne en zigzag dans le plan) ─────────
  function cram(mol, opt = {}) {
    const ch = chaine(mol);
    if (ch.length < 2) return { erreur: 'Cette représentation est prévue pour les molécules à chaîne carbonée ouverte (non cyclique) d’au moins deux atomes de carbone.' };
    const dx = 66, h = 38, P = ch.map((k, q) => [q * dx, q % 2 ? -h : 0]);
    const lignes = [], el = [], pts = P.slice(), lbl = {};
    const ecrireC = opt.ecrireC !== false;
    // étiquettes de la chaîne
    ch.forEach((k, q) => {
      let t;
      if (q === 0) t = lab(mol, k, ch[1], true);
      else if (q === ch.length - 1) t = lab(mol, k, ch[q - 1], false);
      else if (mol.chir[k]) t = ecrireC ? 'C' : '';
      else {
        const hs = S.nbH(mol, k); t = mol.at[k].el + (hs ? 'H' + (hs > 1 ? hs : '') : '');
        if (mol.at[k].el === 'C' && !ecrireC && hs === 2) t = '';
      }
      lbl[k] = t;
    });
    for (let q = 0; q + 1 < ch.length; q++) {
      const [a, b] = rac(P[q], P[q + 1], rayon(lbl[ch[q]], P[q + 1][0] - P[q][0], P[q + 1][1] - P[q][1]), rayon(lbl[ch[q + 1]], P[q][0] - P[q + 1][0], P[q][1] - P[q + 1][1]));
      const o = S.ordreLiaison(mol, ch[q], ch[q + 1]);
      lignes.push(ligne(a, b));
      if (o >= 2) { const n = [-(b[1] - a[1]), b[0] - a[0]], L = Math.hypot(...n); lignes.push(ligne([a[0] + n[0] / L * 4, a[1] + n[1] / L * 4], [b[0] + n[0] / L * 4, b[1] + n[1] / L * 4])); }
    }
    ch.forEach((k, q) => {
      const p = P[q];
      if (lbl[k]) el.push(txt(p[0], p[1], lbl[k], { anc: q === 0 ? 'end' : q === ch.length - 1 ? 'start' : 'middle', c: mol.chir[k] ? k : undefined }));
      if (q === 0 || q === ch.length - 1) {
        if (q === 0) { const w = larg(lbl[k]); pts.push([p[0] - w, p[1]]); } else pts.push([p[0] + larg(lbl[k]), p[1]]);
        return;
      }
      const up = q % 2 === 1, ouv = [0, up ? -1 : 1];                // direction écran du côté libre
      const autres = S.voisins(mol, k).filter(v => v !== ch[q - 1] && v !== ch[q + 1]);
      const est = mol.chir[k] || autres.filter(v => mol.at[v].el !== 'H').length === 2;
      if (!mol.chir[k] && !est) {
        // substituant lourd éventuel dans le plan
        const lourd = autres.filter(v => mol.at[v].el !== 'H');
        lourd.forEach(v => {
          const e = lab(mol, v, k, false), q2 = [p[0], p[1] + ouv[1] * 48];
          const [a, b] = rac(p, q2, rayon(lbl[k], 0, ouv[1]), 12);
          if (S.ordreLiaison(mol, k, v) > 1) lignes.push(ligne([a[0] - 3, a[1]], [b[0] - 3, b[1]]), ligne([a[0] + 3, a[1]], [b[0] + 3, b[1]])); else lignes.push(ligne(a, b)); el.push(txt(q2[0], q2[1], e)); pts.push([q2[0] - larg(e) / 2, q2[1]], [q2[0] + larg(e) / 2, q2[1] + ouv[1] * 10]);
        });
        return;
      }
      // 3D : chaîne dans le plan (z = 0), les deux autres de part et d'autre du plan, côté libre (y écran inversé)
      const v3 = (x, y, z) => [x, -y, z];
      const fixes = new Map([[ch[q - 1], v3(-1, (P[q - 1][1] - p[1]) / h, 0)], [ch[q + 1], v3(1, (P[q + 1][1] - p[1]) / h, 0)]]);
      const m = S.placer(mol, k, fixes, autres, [v3(0, ouv[1] * 0.6, 0.8), v3(0, ouv[1] * 0.6, -0.8)]);
      m.forEach((v, j) => {
        if (fixes.has(j)) return;
        const avant = v[2] > 0, ang = (up ? -90 : 90) + (avant ? 28 : -28);
        const q2 = [p[0] + Math.cos(ang * RAD) * 50, p[1] + Math.sin(ang * RAD) * 50];
        const gauche = q2[0] < p[0] - 2, e = lab(mol, j, k, gauche);
        const [a, b] = rac(p, q2, ecrireC || lbl[k] ? 8 : 0, rayon(e, p[0] - q2[0], p[1] - q2[1]));
        lignes.push(avant ? coin(a, b) : hachures(a, b));
        el.push(txt(q2[0], q2[1], e, { anc: 'middle' }));
        pts.push([q2[0] - larg(e) / 2 - 2, q2[1] - 12], [q2[0] + larg(e) / 2 + 2, q2[1] + 12]);
      });
      if (mol.chir[k]) {
        el.push(`<circle class="cible asym" cx="${p[0]}" cy="${p[1]}" r="10" data-c="${k}"/>`);
        const r = rs(mol, k, opt); if (r) el.push(txt(p[0] + (up ? 0 : 0), p[1] + (up ? 15 : -15), '(' + r + ')', { cls: 'rs' }));
      }
      if (opt.num) el.push(txt(p[0], p[1] + (up ? -14 : 14) * -1, String(q + 1), { cls: 'num' }));
    });
    return { svg: cadre(`<g class="liaisons">${lignes.join('')}</g>${el.join('')}`, boite(pts), 'Représentation de Cram'), chaine: ch };
  }

  // ───────── Newman ─────────
  function liaisonsNewman(mol) {
    const ch = chaine(mol), r = [];
    for (let q = 0; q + 1 < ch.length; q++) {
      const a = ch[q], b = ch[q + 1];
      if (S.ordreLiaison(mol, a, b) !== 1 || mol.v[a].length < 2 || mol.v[b].length < 2) continue;
      if (S.voisins(mol, a).length < 4 && S.voisins(mol, b).length < 4) continue;
      r.push({ a, b, q, nom: `C${q + 1}–C${q + 2}`, score: (mol.chir[a] ? 1 : 0) + (mol.chir[b] ? 1 : 0) + (q > 0 && q + 2 < ch.length ? 1.5 : 0) + (S.voisins(mol, a).length === 4 && S.voisins(mol, b).length === 4 ? 0.5 : 0) });
    }
    return { liste: r, chaine: ch };
  }
  function newman(mol, opt = {}) {
    const { liste, chaine: ch } = liaisonsNewman(mol);
    if (!liste.length) return { erreur: 'Aucune liaison simple C–C ne se prête à une représentation de Newman.' };
    const L = liste.find(x => x.q === opt.liaison) || liste.slice().sort((x, y) => y.score - x.score)[0];
    const A = L.a, B = L.b, phi = opt.phi || 0;
    const ref = (c, exclu, chaineVoisin) => {
      if (chaineVoisin !== undefined) return chaineVoisin;
      const pr = S.priorites(mol, c).ordre.filter(j => j !== exclu); return pr[0];
    };
    const refA = ref(A, B, ch[L.q - 1]), refB = ref(B, A, ch[L.q + 2]);
    const vec = (ang, z) => [Math.cos(ang * RAD), Math.sin(ang * RAD), z];
    const autA = S.voisins(mol, A).filter(v => v !== B && v !== refA), autB = S.voisins(mol, B).filter(v => v !== A && v !== refB);
    const mA = S.placer(mol, A, new Map([[B, [0, 0, -1]], [refA, vec(90, 1 / 3)]]), autA, [vec(210, 1 / 3), vec(330, 1 / 3)]);
    const a0 = 270 + phi;
    const mB = S.placer(mol, B, new Map([[A, [0, 0, 1]], [refB, vec(a0, -1 / 3)]]), autB, [vec(a0 + 120, -1 / 3), vec(a0 + 240, -1 / 3)]);
    const R = 34, Lb = 72, el = [], lignes = [], pts = [[-Lb - 30, -Lb - 14], [Lb + 30, Lb + 14]];
    const angle = v => Math.atan2(v[1], v[0]) / RAD;
    const angsA = [];
    mA.forEach((v, j) => { if (j !== B) angsA.push(angle(v)); });
    // carbone arrière : cercle, liaisons depuis le bord
    lignes.push(`<circle class="arriere" cx="0" cy="0" r="${R}"/>`);
    mB.forEach((v, j) => {
      if (j === A) return;
      let an = angle(v);
      if (angsA.some(x => Math.abs(((an - x + 540) % 360) - 180) < 6)) an += 9;   // éclipsée : léger décalage pour la lisibilité
      const p1 = [Math.cos(an * RAD) * R, -Math.sin(an * RAD) * R], p2 = [Math.cos(an * RAD) * Lb, -Math.sin(an * RAD) * Lb];
      lignes.push(ligne(p1, p2));
      const e = lab(mol, j, B, p2[0] < -4);
      el.push(txt(p2[0] + Math.cos(an * RAD) * 6, p2[1] - Math.sin(an * RAD) * 8, e, { anc: p2[0] < -4 ? 'end' : p2[0] > 4 ? 'start' : 'middle' }));
      pts.push([p2[0] + (p2[0] < 0 ? -larg(e) - 10 : larg(e) + 10), p2[1]]);
    });
    mA.forEach((v, j) => {
      if (j === B) return;
      const an = angle(v), p2 = [Math.cos(an * RAD) * (Lb - 6), -Math.sin(an * RAD) * (Lb - 6)];
      lignes.push(ligne([0, 0], p2, 'avant'));
      const e = lab(mol, j, A, p2[0] < -4);
      el.push(txt(p2[0] + Math.cos(an * RAD) * 7, p2[1] - Math.sin(an * RAD) * 9, e, { anc: p2[0] < -4 ? 'end' : p2[0] > 4 ? 'start' : 'middle' }));
      pts.push([p2[0] + (p2[0] < 0 ? -larg(e) - 10 : larg(e) + 10), p2[1]]);
    });
    el.push(`<circle class="point" cx="0" cy="0" r="3.2"/>`);
    // nom de la conformation (groupes de référence : suite de la chaîne, sinon substituants prioritaires)
    const d = ((180 + phi) % 360 + 360) % 360, m120 = ((d % 120) + 120) % 120;
    let conf = 'quelconque';
    if (Math.abs(m120 - 60) < 1) conf = Math.abs(d - 180) < 1 ? 'décalée anti' : 'décalée gauche';
    else if (m120 < 1 || m120 > 119) conf = d < 1 || d > 359 ? 'éclipsée (groupes de référence éclipsés)' : 'éclipsée';
    const infoA = mol.chir[A] ? A : null, infoB = mol.chir[B] ? B : null;
    return { svg: cadre(`<g class="liaisons">${lignes.join('')}</g>${el.join('')}`, boite(pts), 'Représentation de Newman'), conf, liaison: L, liste, avant: A, arriere: B, refs: [refA, refB], chir: [infoA, infoB] };
  }

  // ───────── Haworth (oses) ─────────
  function haworthPossible(mol) {
    const f = fischer(mol, {}); if (f.erreur) return null;
    const ch = f.chaine, n = ch.length;
    const et = q => S.etiquette(mol, ch[q], ch[q === 0 ? 1 : q - 1]);
    const cotes = f.cotes;
    const tousOH = cotes.every(x => [x.g, x.d].some(k => S.etiquette(mol, k, x.c) === 'OH') && [x.g, x.d].some(k => mol.at[k].el === 'H'));
    if (S.etiquette(mol, ch[0], ch[1]) === 'CHO' && et(n - 1) === 'CH2OH' && tousOH && n >= 5) return { type: 'aldose', f };
    const c2 = ch[1];
    if (S.etiquette(mol, ch[0], ch[1]) === 'CH2OH' && et(n - 1) === 'CH2OH' && n >= 5 && mol.v[c2].some(x => x.o === 2 && mol.at[x.j].el === 'O')) {
      // cétose : C2 = O (non dessiné comme croix dans fischer())
      return { type: 'cetose', f };
    }
    return null;
  }
  function haworth(mol, opt = {}) {
    const hp = haworthPossible(mol);
    if (!hp) return { erreur: 'La représentation de Haworth concerne les oses (aldoses et cétoses) à au moins cinq atomes de carbone, par exemple le glucose, le ribose ou le fructose.' };
    const { f, type } = hp, ch = f.chaine, n = ch.length;
    const anom = type === 'aldose' ? 0 : 1;
    const cycle = opt.cycle || (type === 'aldose' && n >= 6 ? 'pyranose' : 'furanose');
    const ferm = anom + (cycle === 'pyranose' ? 4 : 3);
    if (ferm > n - 1) return { erreur: 'Ce cycle n’est pas possible pour cet ose.' };
    const cote = q => { const x = f.cotes.find(y => y.c === ch[q]); if (!x) return null; return S.etiquette(mol, x.d, x.c) === 'OH' ? 'd' : 'g'; };
    // atomes du cycle dans l'ordre : anomère, …, fermeture, O
    const ringC = []; for (let q = anom; q <= ferm; q++) ringC.push(q);
    const G = (cycle === 'pyranose'
      ? [[330, 190], [250, 250], [120, 250], [40, 190], [120, 120], [250, 120]]
      : [[315, 190], [245, 255], [125, 255], [55, 190], [185, 128]]);
    const pos = q => G[ringC.indexOf(q)], posO = G[G.length - 1];
    const lignes = [], el = [], pts = G.slice();
    // liaisons du cycle (bord avant épais)
    const tour = ringC.map(pos).concat([posO]);
    for (let k = 0; k < tour.length; k++) {
      const a = tour[k], b = tour[(k + 1) % tour.length];
      const avant = a[1] >= 185 && b[1] >= 185 && (a[1] > 220 || b[1] > 220);
      let [p, q] = [a, b];
      if (b === posO) [p, q] = rac(a, b, 0, 12); else if (a === posO) [p, q] = rac(a, b, 12, 0);
      lignes.push(ligne(p, q, avant ? 'epais' : ''));
    }
    el.push(txt(posO[0], posO[1], 'O'));
    const refHaut = cote(ferm) === 'd';            // D : groupe exocyclique du carbone de fermeture vers le haut
    const sub = (p, haut, e, opts = {}) => {
      // vers l'intérieur du cycle (arrière vers le bas, avant vers le haut) : liaison courte
      const interieur = (p[1] < 160 && !haut) || (p[1] > 220 && haut);
      const L = interieur ? 30 : 46, q2 = [p[0], p[1] + (haut ? -L : L)];
      lignes.push(ligne(p, [q2[0], q2[1] + (haut ? 10 : -10)]));
      el.push(txt(q2[0], q2[1] + (haut ? -1 : 2), e, { cls: interieur ? 'int' : '' }));
      pts.push([q2[0] - larg(e) / 2 - 4, q2[1] + (haut ? -12 : 12)], [q2[0] + larg(e) / 2 + 4, q2[1]]);
    };
    ringC.forEach(q => {
      const p = pos(q);
      if (q === anom) {
        const ohHaut = opt.anomere === 'beta' ? refHaut : !refHaut;
        const autre = type === 'aldose' ? 'H' : 'CH2OH';
        sub(p, ohHaut, 'OH'); sub(p, !ohHaut, autre);
        if (opt.num) el.push(txt(p[0] + 10, p[1] - 10, String(q + 1), { anc: 'start', cls: 'num' }));
        return;
      }
      if (q === ferm) {
        const exo = ferm < n - 1 ? (ferm + 1 === n - 1 ? 'CH2OH' : 'CHOH–CH2OH') : 'H';
        if (exo === 'H') { sub(p, true, 'H'); sub(p, false, 'H'); }
        else { sub(p, refHaut, exo, { anc: exo.length > 5 ? 'middle' : 'middle' }); sub(p, !refHaut, 'H'); }
      } else {
        const d = cote(q) === 'd';
        sub(p, !d, 'OH'); sub(p, d, 'H');                // droite en Fischer → bas en Haworth
      }
      if (opt.num) el.push(txt(p[0] - 8, p[1] - 10, String(q + 1), { anc: 'end', cls: 'num' }));
    });
    const nomA = (opt.anomere === 'beta' ? 'β' : 'α');
    return { svg: cadre(`<g class="liaisons">${lignes.join('')}</g>${el.join('')}`, boite(pts), 'Représentation de Haworth'), cycle, anomere: nomA, serie: f.serie, type };
  }

  return { fischer, cram, newman, liaisonsNewman, haworth, haworthPossible };
})();
if (typeof module !== 'undefined') module.exports = Vues;
