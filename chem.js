/* ===== Chem : dessin de molécules (SVG) et règles CIP pour les exercices ===== */
var Chem = (function () {
  var NS = 'http://www.w3.org/2000/svg';
  var ZN = { H: 1, C: 6, N: 7, O: 8, F: 9, P: 15, S: 16, Cl: 17, Br: 35, I: 53 };
  var VAL = { H: 1, C: 4, N: 3, O: 2, F: 1, P: 3, S: 2, Cl: 1, Br: 1, I: 1 };
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  /* Texte avec indices : « CH3 » → CH<tspan>3</tspan> ; « ⊕ » en exposant si précédé de ^ */
  function txt(x, y, label, o) {
    o = o || {};
    var anchor = o.anchor || 'middle', fs = o.size || 15, col = o.color || '#1f2a30';
    var parts = String(label).split(/(\d+|\^[+−-]|\^⊕|\^⊖)/).filter(function (p) { return p !== ''; });
    var inner = parts.map(function (p) {
      if (/^\d+$/.test(p) && !o.nosub) return '<tspan baseline-shift="-30%" font-size="' + Math.round(fs * 0.72) + '">' + p + '</tspan>';
      if (/^\^/.test(p)) return '<tspan baseline-shift="45%" font-size="' + Math.round(fs * 0.72) + '">' + esc(p.slice(1)) + '</tspan>';
      return esc(p);
    }).join('');
    return '<text x="' + x.toFixed(1) + '" y="' + (y + fs * 0.35).toFixed(1) + '" text-anchor="' + anchor + '" font-size="' + fs + '" fill="' + col + '" font-family="Arial, Helvetica, sans-serif"' + (o.weight ? ' font-weight="' + o.weight + '"' : '') + '>' + inner + '</text>';
  }
  function labelBox(x, y, label, fs) {
    var w = String(label).replace(/\d/g, '').length * fs * 0.62 + String(label).replace(/\D/g, '').length * fs * 0.45 + 4;
    return '<rect x="' + (x - w / 2).toFixed(1) + '" y="' + (y - fs * 0.62).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (fs * 1.24).toFixed(1) + '" fill="#fff"/>';
  }
  function svgWrap(body, minx, miny, maxx, maxy, cls) {
    var pad = 18, w = maxx - minx + 2 * pad, h = maxy - miny + 2 * pad;
    return '<svg class="mol ' + (cls || '') + '" xmlns="' + NS + '" viewBox="' + (minx - pad).toFixed(1) + ' ' + (miny - pad).toFixed(1) + ' ' + w.toFixed(1) + ' ' + h.toFixed(1) + '" width="' + Math.round(w) + '" height="' + Math.round(h) + '" role="img">' + body + '</svg>';
  }
  function line(x1, y1, x2, y2, o) { o = o || {}; return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + (o.color || '#1f2a30') + '" stroke-width="' + (o.w || 2) + '" stroke-linecap="round"/>'; }

  /* ---------- Formule topologique (chaîne en zigzag + ramifications) ----------
     spec = { chain: ['C','C','C','OH'], dbl: [i,...] (liaison i–i+1 double), tri: [...],
              br: [{ at: i, side: 'o'|'i', atoms: ['C','C'], dbl: false }] } */
  function topo(spec, o) {
    o = o || {};
    var L = o.L || 42, fs = o.size || 15, A = [], B = [];
    var n = spec.chain.length;
    for (var i = 0; i < n; i++) A.push({ x: i * L * 0.866, y: (i % 2 ? -L * 0.5 : 0), lab: spec.chain[i] });
    for (i = 0; i < n - 1; i++) B.push({ a: i, b: i + 1, o: (spec.dbl || []).indexOf(i) >= 0 ? 2 : (spec.tri || []).indexOf(i) >= 0 ? 3 : 1 });
    (spec.br || []).forEach(function (br) {
      var base = A[br.at], up = (br.at % 2 === 1), dir = (br.side === 'i') ? (up ? 1 : -1) : (up ? -1 : 1);
      if (n === 1) dir = br.side === 'i' ? 1 : -1;
      var prev = br.at, px = base.x, py = base.y;
      br.atoms.forEach(function (lab, k) {
        var nx, ny;
        if (k === 0) { nx = px; ny = py + dir * L; }
        else { nx = px + L * 0.866; ny = py + (k % 2 ? dir * L * 0.5 : -dir * L * 0.5); }
        A.push({ x: nx, y: ny, lab: lab });
        B.push({ a: prev, b: A.length - 1, o: (k === 0 && br.dbl) ? 2 : 1 });
        prev = A.length - 1; px = nx; py = ny;
      });
    });
    var cx = 0, cy = 0; A.forEach(function (a) { cx += a.x; cy += a.y; }); cx /= A.length; cy /= A.length;
    var body = '';
    B.forEach(function (b) {
      var p = A[b.a], q = A[b.b];
      body += line(p.x, p.y, q.x, q.y);
      if (b.o >= 2) {
        var dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
        var mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2; if ((cx - mx) * nx + (cy - my) * ny < 0) { nx = -nx; ny = -ny; }
        var off = 6, sh = 0.14;
        if (b.o === 3) { body += line(p.x + nx * off, p.y + ny * off, q.x + nx * off, q.y + ny * off) + line(p.x - nx * off, p.y - ny * off, q.x - nx * off, q.y - ny * off); }
        else body += line(p.x + nx * off + dx * sh, p.y + ny * off + dy * sh, q.x + nx * off - dx * sh, q.y + ny * off - dy * sh);
      }
    });
    A.forEach(function (a) { if (a.lab !== 'C') body += labelBox(a.x, a.y, a.lab, fs) + txt(a.x, a.y, a.lab, { size: fs }); });
    var xs = A.map(function (a) { return a.x; }), ys = A.map(function (a) { return a.y; });
    return svgWrap(body, Math.min.apply(null, xs) - 10, Math.min.apply(null, ys) - 8, Math.max.apply(null, xs) + 10, Math.max.apply(null, ys) + 8, o.cls);
  }

  /* ---------- Mini-SMILES (acyclique) → graphe ---------- */
  function parse(sm) {
    var atoms = [], bonds = [], stack = [], prev = -1, ord = 1, i = 0;
    while (i < sm.length) {
      var c = sm[i];
      if (c === '(') { stack.push(prev); i++; continue; }
      if (c === ')') { prev = stack.pop(); i++; continue; }
      if (c === '=') { ord = 2; i++; continue; }
      if (c === '#') { ord = 3; i++; continue; }
      var el;
      if (c === '[') { var j = sm.indexOf(']', i); el = sm.slice(i + 1, j); i = j + 1; }
      else if (sm.substr(i, 2) === 'Cl' || sm.substr(i, 2) === 'Br') { el = sm.substr(i, 2); i += 2; }
      else { el = c; i++; }
      atoms.push({ el: el, nb: [] });
      var k = atoms.length - 1;
      if (prev >= 0) { atoms[prev].nb.push([k, ord]); atoms[k].nb.push([prev, ord]); }
      prev = k; ord = 1;
    }
    return atoms;
  }
  /* Arbre CIP d’un groupe : racine = atome 0 du SMILES, rattaché au centre par une liaison simple */
  function tree(sm) {
    var at = parse(sm);
    function node(k, parent, parentBondExtra) {
      var a = at[k], kids = [], used = parentBondExtra;
      a.nb.forEach(function (e) {
        if (e[0] === parent) return;
        kids.push(node(e[0], k, e[1] - 1));
        for (var d = 1; d < e[1]; d++) kids.push({ Z: ZN[at[e[0]].el], kids: [{ Z: 0, kids: [] }, { Z: 0, kids: [] }, { Z: 0, kids: [] }] });
      });
      // duplicata de l’atome parent pour une liaison multiple vers le parent
      for (var d2 = 0; d2 < parentBondExtra; d2++) kids.push({ Z: ZN[at[parent].el], kids: [{ Z: 0, kids: [] }, { Z: 0, kids: [] }, { Z: 0, kids: [] }] });
      var bondsUsed = a.nb.reduce(function (s, e) { return s + e[1]; }, 0) + (parent === -2 ? 1 : 0);
      var nH = Math.max(0, (VAL[a.el] || 0) - bondsUsed);
      for (var h = 0; h < nH; h++) kids.push({ Z: 1, kids: [] });
      return { Z: ZN[a.el], kids: kids, el: a.el };
    }
    return node(0, -2, 0);
  }
  /* Comparaison hiérarchique (règle 1 avec exploration par sphères) */
  function sortKids(n) { n.kids.sort(function (a, b) { return cmp(b, a); }); return n.kids; }
  function cmp(a, b) {
    if (a.Z !== b.Z) return a.Z - b.Z;
    var la = [a], lb = [b];
    for (var depth = 0; depth < 8; depth++) {
      var ga = la.map(function (n) { return sortKids(n).map(function (k) { return k.Z; }); });
      var gb = lb.map(function (n) { return sortKids(n).map(function (k) { return k.Z; }); });
      for (var g = 0; g < Math.max(ga.length, gb.length); g++) {
        var x = ga[g] || [], y = gb[g] || [];
        for (var t = 0; t < Math.max(x.length, y.length); t++) { var d = (x[t] || 0) - (y[t] || 0); if (d) return d; }
      }
      la = [].concat.apply([], la.map(function (n) { return n.kids; }));
      lb = [].concat.apply([], lb.map(function (n) { return n.kids; }));
      if (!la.length && !lb.length) break;
    }
    return 0;
  }
  var SYM = { 0: 'fantôme', 1: 'H', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 15: 'P', 16: 'S', 17: 'Cl', 35: 'Br', 53: 'I' };
  /* Explication de la comparaison de deux groupes */
  function sl(l) { return String(l).replace(/(\d+)/g, '<sub>$1</sub>'); }
  function why(ga, gb) { // explication : ga est prioritaire sur gb
    var a = tree(ga.sm), b = tree(gb.sm), dup = /[=#]/.test(ga.sm + gb.sm) ? ' (liaisons multiples dédoublées, règle 4)' : '';
    if (a.Z !== b.Z) return sl(ga.lab) + ' > ' + sl(gb.lab) + ' : atomes de 1<sup>er</sup> rang ' + SYM[a.Z] + ' (Z = ' + a.Z + ') > ' + SYM[b.Z] + ' (Z = ' + b.Z + ') (règle 1).';
    var la = [a], lb = [b];
    for (var d = 2; d < 8; d++) {
      var ga2 = la.map(function (n) { return sortKids(n).map(function (k) { return k.Z; }); });
      var gb2 = lb.map(function (n) { return sortKids(n).map(function (k) { return k.Z; }); });
      var f = function (g) { return g.map(function (x) { return '(' + x.map(function (z) { return SYM[z]; }).join(', ') + ')'; }).join(' ; '); };
      if (JSON.stringify(ga2) !== JSON.stringify(gb2)) {
        var g = 0; while (g < ga2.length && JSON.stringify(ga2[g]) === JSON.stringify(gb2[g])) g++;
        return sl(ga.lab) + ' > ' + sl(gb.lab) + ' : même atome de 1<sup>er</sup> rang (' + SYM[a.Z] + ')' + (d > 2 ? ', égalité jusqu’au rang ' + (d - 1) : '') + ' ; au rang ' + d + (d > 2 ? ', en suivant la branche prioritaire' : '') + ' : ' + f([ga2[g] || []]) + ' > ' + f([gb2[g] || []]) + ' (règle ' + (d > 2 ? '3' : '2') + ')' + dup + '.';
      }
      la = [].concat.apply([], la.map(function (n) { return n.kids; }));
      lb = [].concat.apply([], lb.map(function (n) { return n.kids; }));
    }
    return sl(ga.lab) + ' > ' + sl(gb.lab) + '.';
  }
  function rank(groups) { // groups: [{lab, sm}] → indices du plus prioritaire au moins prioritaire
    var t = groups.map(function (g) { return tree(g.sm); });
    var idx = groups.map(function (g, i) { return i; });
    idx.sort(function (i, j) { return cmp(t[j], t[i]); });
    for (var k = 0; k < idx.length - 1; k++) if (cmp(t[idx[k]], t[idx[k + 1]]) === 0) return null; // égalité : pas de stéréocentre
    return idx;
  }

  /* ---------- Représentation de Cram d’un carbone asymétrique ---------- */
  var POS = [{ x: 0, y: -1, z: 0, t: 'p' }, { x: -0.9, y: 0.5, z: 0, t: 'p' }, { x: 0.95, y: -0.12, z: -0.75, t: 'h' }, { x: 0.55, y: 0.85, z: 0.75, t: 'w' }];
  function cramGeom(rot) {
    var c = Math.cos(rot), s = Math.sin(rot);
    return POS.map(function (p) { return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z, t: p.t }; });
  }
  /* groups[k] placé en position k ; renvoie 'R' ou 'S' */
  function rs(groups, rot) {
    var r = rank(groups); if (!r) return null;
    var g = cramGeom(rot || 0), v = r.map(function (k) { return g[k]; });
    var a = v[0], b = v[1], c = v[2], d = v[3];
    var A1 = [a.x - d.x, a.y - d.y, a.z - d.z], B1 = [b.x - d.x, b.y - d.y, b.z - d.z], C1 = [c.x - d.x, c.y - d.y, c.z - d.z];
    // repère écran : y vers le bas → on inverse y pour un repère direct
    A1[1] = -A1[1]; B1[1] = -B1[1]; C1[1] = -C1[1];
    var cr = [A1[1] * B1[2] - A1[2] * B1[1], A1[2] * B1[0] - A1[0] * B1[2], A1[0] * B1[1] - A1[1] * B1[0]];
    var det = cr[0] * C1[0] + cr[1] * C1[1] + cr[2] * C1[2];
    return det < 0 ? 'R' : 'S';
  }
  function cram(groups, rot, o) {
    o = o || {};
    var k0 = o.center ? 0.24 : 0, L = 46, fs = o.size || 15, g = cramGeom(rot || 0), body = '', minx = 0, maxx = 0, miny = 0, maxy = 0;
    g.forEach(function (p, k) {
      var x = p.x * L, y = p.y * L;
      var sx = x * k0, sy = y * k0;
      if (p.t === 'p') body += line(sx, sy, x * 0.78, y * 0.78);
      else if (p.t === 'w') { var nx = -p.y, ny = p.x, len = Math.hypot(nx, ny); nx /= len; ny /= len; body += '<polygon points="' + sx.toFixed(1) + ',' + sy.toFixed(1) + ' ' + (x * 0.78 + nx * 5).toFixed(1) + ',' + (y * 0.78 + ny * 5).toFixed(1) + ' ' + (x * 0.78 - nx * 5).toFixed(1) + ',' + (y * 0.78 - ny * 5).toFixed(1) + '" fill="#1f2a30"/>'; }
      else { var mx = -p.y, my = p.x, l2 = Math.hypot(mx, my); mx /= l2; my /= l2; for (var s = 1; s <= 6; s++) { var f = (k0 + (0.78 - k0) * s / 6.2) / 0.78, hw = 5.5 * f; body += line(x * 0.78 * f + mx * hw, y * 0.78 * f + my * hw, x * 0.78 * f - mx * hw, y * 0.78 * f - my * hw, { w: 1.6 }); } }
      var lab = groups[k].lab, anchor = Math.abs(p.x) < 0.3 ? 'middle' : (p.x > 0 ? 'start' : 'end');
      var lx = x + (anchor === 'start' ? 3 : anchor === 'end' ? -3 : 0), ly = y + (p.y < -0.5 ? -4 : p.y > 0.5 ? 6 : 0);
      body += txt(lx, ly, lab, { size: fs, anchor: anchor });
      var w = String(lab).length * fs * 0.6;
      minx = Math.min(minx, anchor === 'end' ? lx - w : anchor === 'middle' ? lx - w / 2 : lx); maxx = Math.max(maxx, anchor === 'start' ? lx + w : anchor === 'middle' ? lx + w / 2 : lx);
      miny = Math.min(miny, ly - fs); maxy = Math.max(maxy, ly + fs);
    });
    body += txt(0, 0, o.center || '', { size: fs });
    return svgWrap(body, minx, miny, maxx, maxy, o.cls);
  }

  /* ---------- Alcène : C=C horizontale, 4 substituants ---------- */
  function alkene(s, o) { // s = [hautGauche, basGauche, hautDroite, basDroite] {lab, sm}
    o = o || {};
    var fs = o.size || 15, L = 40, body = '';
    var C1 = [-L * 0.5, 0], C2 = [L * 0.5, 0];
    body += line(C1[0], 0, C2[0], 0) + line(C1[0] + 5, 6, C2[0] - 5, 6);
    var P = [[C1[0] - L * 0.5, -L * 0.87, 'end'], [C1[0] - L * 0.5, L * 0.87, 'end'], [C2[0] + L * 0.5, -L * 0.87, 'start'], [C2[0] + L * 0.5, L * 0.87, 'start']];
    P.forEach(function (p, k) {
      var base = k < 2 ? C1 : C2;
      body += line(base[0], base[1], p[0] * 0.92 + base[0] * 0.08, p[1] * 0.92);
      body += txt(p[0] + (p[2] === 'end' ? -2 : 2), p[1] + (p[1] < 0 ? -6 : 8), s[k].lab, { size: fs, anchor: p[2] });
    });
    var wl = Math.max(String(s[0].lab).length, String(s[1].lab).length) * fs * 0.6, wr = Math.max(String(s[2].lab).length, String(s[3].lab).length) * fs * 0.6;
    return svgWrap(body, C1[0] - L * 0.5 - wl - 4, -L * 0.87 - fs - 8, C2[0] + L * 0.5 + wr + 4, L * 0.87 + fs + 8, o.cls);
  }
  function ze(s) { // renvoie 'Z', 'E' ou null (pas de stéréoisomérie)
    var l = rank([s[0], s[1]]), r = rank([s[2], s[3]]);
    if (!l || !r) return null;
    return (l[0] === r[0]) ? 'Z' : 'E'; // indice 0 = haut, 1 = bas de chaque côté
  }

  /* ---------- Mécanismes : atomes placés, doublets, charges, flèches courbes ----------
     m = { atoms: [{id, x, y, lab, lp:[angles en degrés], q:'+'|'−', dq:'δ+'}], bonds: [[id1,id2,ordre]],
           plus: [[x,y]], arrows: [{from:{atom,lp}|{bond:[a,b]}, to:{atom}|{between:[a,b]}, bend}] } */
  function mech(m, arrows, o) {
    o = o || {};
    var fs = o.size || 17, P = {}, body = '', S = 1;
    m.atoms.forEach(function (a) { P[a.id] = a; });
    m.bonds.forEach(function (b) {
      var p = P[b[0]], q = P[b[1]], dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      var r1 = p.lab ? (p.r || 11) : 0, r2 = q.lab ? (q.r || 11) : 0, x1 = p.x + ux * r1, y1 = p.y + uy * r1, x2 = q.x - ux * r2, y2 = q.y - uy * r2;
      if (b[2] === 3) { body += line(x1, y1, x2, y2) + line(x1 - uy * 4.5, y1 + ux * 4.5, x2 - uy * 4.5, y2 + ux * 4.5) + line(x1 + uy * 4.5, y1 - ux * 4.5, x2 + uy * 4.5, y2 - ux * 4.5); }
      else if (b[2] === 2) { body += line(x1 - uy * 3.5, y1 + ux * 3.5, x2 - uy * 3.5, y2 + ux * 3.5) + line(x1 + uy * 3.5, y1 - ux * 3.5, x2 + uy * 3.5, y2 - ux * 3.5); }
      else if (b[2] === 'dash') body += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#1f2a30" stroke-width="2" stroke-dasharray="4 4"/>';
      else body += line(x1, y1, x2, y2);
    });
    m.atoms.forEach(function (a) {
      if (a.lab) body += labelBox(a.x, a.y, a.lab, fs * 0.9) + txt(a.x, a.y, a.lab, { size: fs, nosub: false });
      (a.lp || []).forEach(function (ang) { var r = ang * Math.PI / 180, cx = a.x + Math.cos(r) * 14, cy = a.y + Math.sin(r) * 14, tx = -Math.sin(r) * 6, ty = Math.cos(r) * 6; body += line(cx - tx, cy - ty, cx + tx, cy + ty, { w: 2 }); });
      if (a.q) body += '<circle cx="' + (a.x + (a.qx || 13)) + '" cy="' + (a.y + (a.qy || -13)) + '" r="7" fill="#fff" stroke="#1f2a30" stroke-width="1.3"/>' + txt(a.x + (a.qx || 13), a.y + (a.qy || -13) - 0.5, a.q === '+' ? '+' : '−', { size: 12 });
      if (a.dq) body += txt(a.x + (a.dqx || 0), a.y + (a.dqy || -20), a.dq, { size: 12, color: '#c0392b' });
    });
    (m.plus || []).forEach(function (p) { body += txt(p[0], p[1], '+', { size: 20 }); });
    (m.text || []).forEach(function (t) { body += txt(t[0], t[1], t[2], { size: t[3] || 14 }); });
    function pt(e) {
      if (e.atom && e.lp !== undefined) { var a = P[e.atom], r = e.lp * Math.PI / 180; return [a.x + Math.cos(r) * 15, a.y + Math.sin(r) * 15]; }
      if (e.bond) { var p = P[e.bond[0]], q = P[e.bond[1]]; return [(p.x + q.x) / 2 + (e.dx || 0), (p.y + q.y) / 2 + (e.dy || 0)]; }
      if (e.between) { var p2 = P[e.between[0]], q2 = P[e.between[1]]; return [p2.x * 0.6 + q2.x * 0.4, p2.y * 0.6 + q2.y * 0.4]; }
      var t = P[e.atom]; return [t.x + (e.dx || 0), t.y + (e.dy || 0)];
    }
    var col = o.arrowColor || '#c0392b', mid = 'ah' + Math.random().toString(36).slice(2, 8);
    body = '<defs><marker id="' + mid + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + col + '"/></marker></defs>' + body;
    (arrows || []).forEach(function (ar) {
      var s0 = pt(ar.from), e0 = pt(ar.to), dx = e0[0] - s0[0], dy = e0[1] - s0[1], len = Math.hypot(dx, dy) || 1, bend = ar.bend === undefined ? 0.45 : ar.bend;
      var nx = -dy / len * len * bend, ny = dx / len * len * bend;
      var c1 = [s0[0] + dx * 0.15 + nx, s0[1] + dy * 0.15 + ny], c2 = [s0[0] + dx * 0.85 + nx, s0[1] + dy * 0.85 + ny];
      var short = 0.9, ex = s0[0] + dx * short + (1 - short) * 0, ey = s0[1] + dy * short;
      body += '<path d="M' + s0[0].toFixed(1) + ',' + s0[1].toFixed(1) + ' C' + c1[0].toFixed(1) + ',' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ',' + c2[1].toFixed(1) + ' ' + ex.toFixed(1) + ',' + ey.toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="2" marker-end="url(#' + mid + ')"/>';
    });
    var xs = m.atoms.map(function (a) { return a.x - String(a.lab || '').replace(/\d/g, '').length * fs * 0.3; }), xs2 = m.atoms.map(function (a) { return a.x + String(a.lab || '').replace(/\d/g, '').length * fs * 0.3; }), ys = m.atoms.map(function (a) { return a.y; });
    return svgWrap(body, Math.min.apply(null, xs) - 22, Math.min.apply(null, ys) - 45, Math.max.apply(null, xs2) + 22, Math.max.apply(null, ys) + 45, o.cls);
  }


  /* ---------- Carbone asymétrique en 3D, à faire tourner (souris ou doigt) ---------- */
  var TET = [[0, 1, 0], [0.943, -0.333, 0], [-0.471, -0.333, 0.816], [-0.471, -0.333, -0.816]];
  var COUL = { H: '#f4f4f4', C: '#3b4248', N: '#3b6fd8', O: '#e0412f', S: '#e6c229', Cl: '#2fae4a', Br: '#9b3a26', I: '#7a3d9b', F: '#8fd16a', P: '#f08a24' };
  function rs3d(groups) { // groups placés sur TET[0..3]
    var r = rank(groups); if (!r) return null;
    var v = r.map(function (k) { return TET[k]; }), d = v[3];
    var A1 = [0, 1, 2].map(function (i) { return v[0][i] - d[i]; }), B1 = [0, 1, 2].map(function (i) { return v[1][i] - d[i]; }), C1 = [0, 1, 2].map(function (i) { return v[2][i] - d[i]; });
    var det = A1[0] * (B1[1] * C1[2] - B1[2] * C1[1]) - A1[1] * (B1[0] * C1[2] - B1[2] * C1[0]) + A1[2] * (B1[0] * C1[1] - B1[1] * C1[0]);
    return det < 0 ? 'R' : 'S';
  }
  function mul(A, B) { var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) for (var k = 0; k < 3; k++) C[i][j] += A[i][k] * B[k][j]; return C; }
  function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; }
  function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }
  function vue3d(el, groups, o) {
    o = o || {};
    var W = 300, H = 260, L = 88, R0 = mul(rotX(Math.random() * 6.28), rotY(Math.random() * 6.28)), R = R0, num = false, rk = rank(groups) || [];
    var els = groups.map(function (g) { return tree(g.sm).el; });
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="vue3d-svg" role="img" aria-label="Modèle 3D du carbone asymétrique"></svg>' +
      '<div class="vue3d-outils"><button type="button" class="bouton petit" data-a="num">Aide : numéros CIP</button> <button type="button" class="bouton petit" data-a="reset">Réinitialiser</button></div>' +
      '<p class="exo-aide">Faites glisser la molécule (souris ou doigt) pour la faire tourner.</p>';
    var svg = el.querySelector('svg');
    function dessiner() {
      var cx = W / 2, cy = H / 2, it = TET.map(function (v, k) {
        var p = [0, 1, 2].map(function (i) { return R[i][0] * v[0] + R[i][1] * v[1] + R[i][2] * v[2]; });
        return { k: k, x: cx + p[0] * L, y: cy - p[1] * L, z: p[2] };
      });
      var b = '';
      it.forEach(function (p) { var w = 7 + 3 * p.z; b += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p.x.toFixed(1) + '" y2="' + p.y.toFixed(1) + '" stroke="#8a949b" stroke-width="' + w.toFixed(1) + '" stroke-linecap="round" opacity="' + (0.55 + 0.45 * (p.z + 1) / 2).toFixed(2) + '"/>'; });
      var liste = it.concat([{ k: -1, x: cx, y: cy, z: 0 }]).sort(function (a, c) { return a.z - c.z; });
      liste.forEach(function (p) {
        if (p.k < 0) { b += '<circle cx="' + cx + '" cy="' + cy + '" r="17" fill="url(#g3dC)" stroke="#222" stroke-width="1"/><text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle" font-size="14" fill="#fff" font-weight="bold">C*</text>'; return; }
        var e = els[p.k], r = (e === 'H' ? 15 : 20) * (1 + 0.35 * p.z), op = (0.4 + 0.6 * (p.z + 1) / 2).toFixed(2), col = COUL[e] || '#777';
        b += '<g opacity="' + op + '"><circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + col + '" stroke="#222" stroke-width="1"/>';
        b += '<circle cx="' + (p.x - r * 0.35).toFixed(1) + '" cy="' + (p.y - r * 0.35).toFixed(1) + '" r="' + (r * 0.28).toFixed(1) + '" fill="#fff" opacity="0.45"/>';
        var dx = p.x - cx, dy = p.y - cy, n = Math.hypot(dx, dy) || 1, lx = p.x + dx / n * (r + 6), ly = p.y + dy / n * (r + 6);
        b += txt(lx, ly, groups[p.k].lab, { size: 15, anchor: dx > 8 ? 'start' : dx < -8 ? 'end' : 'middle', weight: 'bold' });
        if (num) b += '<text x="' + p.x.toFixed(1) + '" y="' + (p.y + 5).toFixed(1) + '" text-anchor="middle" font-size="15" font-weight="bold" fill="' + (e === 'H' || e === 'S' ? '#000' : '#fff') + '">' + (rk.indexOf(p.k) + 1) + '</text>';
        b += '</g>';
      });
      svg.innerHTML = '<defs><radialGradient id="g3dC" cx="35%" cy="35%"><stop offset="0" stop-color="#7d868c"/><stop offset="1" stop-color="#2a2f33"/></radialGradient></defs><rect width="' + W + '" height="' + H + '" fill="#fff"/>' + b;
    }
    var x0 = null, y0 = null;
    svg.addEventListener('pointerdown', function (e) { x0 = e.clientX; y0 = e.clientY; svg.setPointerCapture(e.pointerId); e.preventDefault(); });
    svg.addEventListener('pointermove', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0, dy = e.clientY - y0; x0 = e.clientX; y0 = e.clientY;
      R = mul(rotX(dy * 0.012), mul(rotY(dx * 0.012), R)); dessiner();
    });
    function fin() { x0 = null; }
    svg.addEventListener('pointerup', fin); svg.addEventListener('pointercancel', fin);
    el.querySelector('[data-a="num"]').addEventListener('click', function () { num = !num; dessiner(); });
    el.querySelector('[data-a="reset"]').addEventListener('click', function () { R = R0; dessiner(); });
    dessiner();
    return { rs: rs3d(groups) };
  }

  /* ---------- Molécules réelles : graphe 2D (cycles), wedges, C* et R/S ----------
     spec.at : [id, élément, idDépart, angle(°), ordre, stéréo]  (stéréo 'w' ou 'h' : pointe fine côté idDépart)
     spec.cy : [[id1, id2, ordre]] fermetures de cycles */
  function molGraphe(spec) {
    var A = [], idx = {}, B = [];
    spec.at.forEach(function (t) {
      var a = { id: t[0], el: t[1], x: 0, y: 0, nb: [] };
      if (t[2] !== undefined && t[2] !== null) { var p = A[idx[t[2]]], r = t[3] * Math.PI / 180; a.x = p.x + Math.cos(r); a.y = p.y + Math.sin(r); }
      idx[t[0]] = A.length; A.push(a);
      if (t[2] !== undefined && t[2] !== null) B.push({ a: idx[t[2]], b: idx[t[0]], o: t[4] || 1, st: t[5] || null });
    });
    (spec.cy || []).forEach(function (c) { B.push({ a: idx[c[0]], b: idx[c[1]], o: c[2] || 1, st: null }); });
    B.forEach(function (b, k) { A[b.a].nb.push([b.b, b.o, k]); A[b.b].nb.push([b.a, b.o, k]); });
    A.forEach(function (a) { var v = a.nb.reduce(function (s, e) { return s + e[1]; }, 0); a.h = a.el === 'Ph' ? 0 : Math.max(0, (VAL[a.el] || 0) - v); });
    return { A: A, B: B, idx: idx };
  }
  function ph() { return { Z: 0, kids: [] }; }
  function brancheG(g, k, parent, path, prof) {
    var a = g.A[k];
    if (a.el === 'Ph') return { Z: 6, kids: [0, 1, 2].map(function () { return { Z: 6, kids: [ph(), ph(), ph()] }; }) };
    var kids = [];
    if (prof < 7) a.nb.forEach(function (e) {
      if (e[0] === parent) { for (var d = 1; d < e[1]; d++) kids.push({ Z: ZN[g.A[parent].el], kids: [ph(), ph(), ph()] }); return; }
      if (path.indexOf(e[0]) >= 0) kids.push({ Z: ZN[g.A[e[0]].el] || 6, kids: [ph(), ph(), ph()] });
      else kids.push(brancheG(g, e[0], k, path.concat([k]), prof + 1));
      for (var d2 = 1; d2 < e[1]; d2++) kids.push({ Z: ZN[g.A[e[0]].el] || 6, kids: [ph(), ph(), ph()] });
    });
    for (var i = 0; i < a.h; i++) kids.push({ Z: 1, kids: [] });
    return { Z: ZN[a.el], kids: kids };
  }
  function centres(g) {
    var res = [];
    g.A.forEach(function (a, k) {
      if (a.el !== 'C' || a.h > 1 || a.nb.length + a.h !== 4 || a.nb.some(function (e) { return e[1] > 1; })) return;
      var br = a.nb.map(function (e) { return { n: e[0], t: brancheG(g, e[0], k, [k], 0) }; });
      if (a.h) br.push({ n: -1, t: { Z: 1, kids: [] } });
      for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) if (cmp(br[i].t, br[j].t) === 0) return;
      br.sort(function (p, q) { return cmp(q.t, p.t); });
      // vecteurs 3D (y vers le haut)
      var vec = {};
      a.nb.forEach(function (e) {
        var b = g.B[e[2]], o = g.A[e[0]], v = [o.x - a.x, o.y - a.y, 0];
        if (b.st && b.a === k) v[2] = b.st === 'w' ? 0.85 : -0.85;
        var n = Math.hypot(v[0], v[1], v[2]); vec[e[0]] = [v[0] / n, v[1] / n, v[2] / n];
      });
      if (a.h) { var sx = 0, sy = 0, sz = 0; a.nb.forEach(function (e) { sx += vec[e[0]][0]; sy += vec[e[0]][1]; sz += vec[e[0]][2]; }); vec[-1] = [-sx, -sy, -sz]; }
      var V = br.map(function (x) { return vec[x.n]; }), d = V[3];
      var P = [0, 1, 2].map(function (i) { return [V[i][0] - d[0], V[i][1] - d[1], V[i][2] - d[2]]; });
      var det = P[0][0] * (P[1][1] * P[2][2] - P[1][2] * P[2][1]) - P[0][1] * (P[1][0] * P[2][2] - P[1][2] * P[2][0]) + P[0][2] * (P[1][0] * P[2][1] - P[1][1] * P[2][0]);
      var stereo = a.nb.some(function (e) { var b = g.B[e[2]]; return b.st && b.a === k; });
      res.push({ k: k, id: a.id, rs: stereo && Math.abs(det) > 1e-6 ? (det < 0 ? 'R' : 'S') : null, prio: br.map(function (x) { return x.n; }), arbres: br.map(function (x) { return x.t; }) });
    });
    return res;
  }
  function descBranche(g, c, x, t) { // libellé d’une branche : « O (H) », « C (O, O, O) »…
    if (x === -1) return 'H';
    var el = g.A[x].el === 'Ph' ? 'C' : g.A[x].el;
    var ks = t.kids.slice().sort(function (p, q) { return cmp(q, p); }).map(function (k) { return SYM[k.Z]; });
    return el + (ks.length ? ' (' + ks.join(', ') + ')' : '');
  }
  var LH = { O: 'O', N: 'N', S: 'S', Cl: 'Cl', Br: 'Br', F: 'F', I: 'I' };
  function molSvg(g, o) {
    o = o || {};
    var S = 34, body = '', A = g.A, cxs = A.map(function (a) { return a.x * S; }), cys = A.map(function (a) { return -a.y * S; });
    function lab(a) { if (a.el === 'C') return ''; if (a.el === 'Ph') return 'C6H5'; var hh = a.h ? 'H' + (a.h > 1 ? a.h : '') : ''; var gauche = a.nb.length === 1 && A[a.nb[0][0]].x > a.x + 0.3; return gauche && hh ? hh + a.el : a.el + hh; }
    (o.cercles || []).forEach(function (k) { body += '<circle cx="' + cxs[k].toFixed(1) + '" cy="' + cys[k].toFixed(1) + '" r="13" fill="#f6c343" opacity="0.55"/>'; });
    g.B.forEach(function (b) {
      var p = [cxs[b.a], cys[b.a]], q = [cxs[b.b], cys[b.b]], dx = q[0] - p[0], dy = q[1] - p[1], L2 = Math.hypot(dx, dy), ux = dx / L2, uy = dy / L2;
      var la = lab(A[b.a]), lb = lab(A[b.b]), r1 = la ? 9 : 0, r2 = lb ? 9 : 0;
      var x1 = p[0] + ux * r1, y1 = p[1] + uy * r1, x2 = q[0] - ux * r2, y2 = q[1] - uy * r2;
      if (b.st === 'w') body += '<polygon points="' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' ' + (x2 - uy * 4.5).toFixed(1) + ',' + (y2 + ux * 4.5).toFixed(1) + ' ' + (x2 + uy * 4.5).toFixed(1) + ',' + (y2 - ux * 4.5).toFixed(1) + '" fill="#1f2a30"/>';
      else if (b.st === 'h') { for (var s2 = 1; s2 <= 7; s2++) { var f = s2 / 7.5, hw = 4.8 * f, xx = x1 + (x2 - x1) * f, yy = y1 + (y2 - y1) * f; body += line(xx - uy * hw, yy + ux * hw, xx + uy * hw, yy - ux * hw, { w: 1.4 }); } }
      else body += line(x1, y1, x2, y2);
      if (b.o === 2) {
        var voisins = A[b.a].nb.concat(A[b.b].nb).filter(function (e) { return e[0] !== b.a && e[0] !== b.b; });
        var nx = -uy, ny = ux, side = 0;
        voisins.forEach(function (e) { side += (cxs[e[0]] - (p[0] + q[0]) / 2) * nx + (cys[e[0]] - (p[1] + q[1]) / 2) * ny; });
        if (side < 0) { nx = -nx; ny = -ny; }
        if (!voisins.length || Math.abs(side) < 1e-6 || la || lb) { body += line(x1 + nx * 5, y1 + ny * 5, x2 + nx * 5, y2 + ny * 5); }
        else { var sh = 0.16; body += line(x1 + nx * 6 + dx * sh, y1 + ny * 6 + dy * sh, x2 + nx * 6 - dx * sh, y2 + ny * 6 - dy * sh); }
      }
    });
    A.forEach(function (a, k) {
      var t = lab(a); if (t) body += labelBox(cxs[k], cys[k], t, 14) + txt(cxs[k], cys[k], t, { size: 15 });
    });
    (o.etoiles || []).forEach(function (k) { body += txt(cxs[k] + 9, cys[k] - 11, '*', { size: 18, color: '#c0392b', weight: 'bold' }); });
    var w = 14;
    return svgWrap(body, Math.min.apply(null, cxs) - w, Math.min.apply(null, cys) - w, Math.max.apply(null, cxs) + w, Math.max.apply(null, cys) + w, o.cls);
  }
  function inverser(spec) { return { at: spec.at.map(function (t) { var u = t.slice(); if (u[5] === 'w') u[5] = 'h'; else if (u[5] === 'h') u[5] = 'w'; return u; }), cy: spec.cy }; }
  var MA = { H: 1, C: 12, N: 14, O: 16, F: 19, P: 31, S: 32, Cl: 35.5, Br: 79.9, I: 126.9 };
  function masse(sm) { var at = parse(sm), m = 0; at.forEach(function (a, i) { var b = a.nb.reduce(function (s, e) { return s + e[1]; }, 0) + (i === 0 ? 1 : 0); m += MA[a.el] + Math.max(0, (VAL[a.el] || 0) - b) * MA.H; }); return m; }
  return { molGraphe: molGraphe, centres: centres, descBranche: descBranche, molSvg: molSvg, inverser: inverser, vue3d: vue3d, rs3d: rs3d, masse: masse, topo: topo, tree: tree, cmp: cmp, rank: rank, why: why, rs: rs, cram: cram, alkene: alkene, ze: ze, mech: mech, txt: txt };
})();
