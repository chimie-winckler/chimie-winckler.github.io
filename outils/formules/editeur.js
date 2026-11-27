/* Formules des molécules — éditeur de construction (dessin à la souris ou au doigt) */
const Editeur = (() => {
  const U = 42;                                    // pixels par longueur de liaison
  function creer(svgEl, surChange) {
    let G = { atomes: [], liaisons: [] }, n = 0;
    const histo = [], refaire = [];
    const st = { outil: 'atome', el: 'C', ordre: 1, cycle: 6, ecrireC: false, survol: null, glisse: null, selection: new Set() };
    const id = p => p + (n++);
    const sauver = () => { histo.push(JSON.stringify(G)); if (histo.length > 100) histo.shift(); refaire.length = 0; };
    const A = i => G.atomes.find(a => a.id === i);
    const voisins = a => G.liaisons.filter(l => l.a === a.id || l.b === a.id).map(l => A(l.a === a.id ? l.b : l.a));
    function ecran(e) { const r = svgEl.getBoundingClientRect(), vb = svgEl.viewBox.baseVal; return [(e.clientX - r.left) / r.width * vb.width + vb.x, (e.clientY - r.top) / r.height * vb.height + vb.y].map(v => v / U); }
    function atomeSous(p, sauf) { let m = null, d0 = 0.32; G.atomes.forEach(a => { if (a === sauf) return; const d = Math.hypot(a.x - p[0], a.y - p[1]); if (d < d0) { d0 = d; m = a; } }); return m; }
    function liaisonSous(p) {
      let m = null, d0 = 0.22;
      G.liaisons.forEach(l => { const a = A(l.a), b = A(l.b), dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p[0] - a.x) * dx + (p[1] - a.y) * dy) / (dx * dx + dy * dy))); const d = Math.hypot(a.x + dx * t - p[0], a.y + dy * t - p[1]); if (d < d0 && t > 0.15 && t < 0.85) { d0 = d; m = l; } });
      return m;
    }
    // direction libre pour faire pousser une liaison depuis un atome (zigzag à 120°)
    function directionLibre(a) {
      const v = voisins(a);
      if (!v.length) return -30;
      const angs = v.map(b => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI);
      if (v.length === 1) {
        const b = v[0], vb = voisins(b).filter(c => c !== a);
        const c1 = angs[0] + 120, c2 = angs[0] - 120;
        if (vb.length) { // zigzag : opposé au voisin du voisin
          const ref = Math.atan2(vb[0].y - b.y, vb[0].x - b.x) * 180 / Math.PI;
          const d = x => Math.abs(((x - ref + 540) % 360) - 180);
          return d(c1) < d(c2) ? c1 : c2;
        }
        return Math.cos(c1 * Math.PI / 180) >= Math.cos(c2 * Math.PI / 180) ? c1 : c2;
      }
      const tri = angs.map(x => (x + 360) % 360).sort((x, y) => x - y);
      let best = 0, deb = 0; tri.forEach((x, i) => { const y = i + 1 < tri.length ? tri[i + 1] : tri[0] + 360; if (y - x > best) { best = y - x; deb = x; } });
      return deb + best / 2;
    }
    function ajouterAtome(el, x, y) { const a = { id: id('a'), el, charge: 0, x, y }; G.atomes.push(a); return a; }
    function lier(a, b, ordre) {
      if (a === b) return;
      const l = G.liaisons.find(l => (l.a === a.id && l.b === b.id) || (l.a === b.id && l.b === a.id));
      if (l) { l.ordre = ordre; return l; }
      const m = { id: id('l'), a: a.id, b: b.id, ordre }; G.liaisons.push(m); return m;
    }
    function pousser(a, el, ordre) {
      const an = directionLibre(a) * Math.PI / 180, x = a.x + Math.cos(an), y = a.y + Math.sin(an);
      const ex = atomeSous([x, y], a); const b = ex || ajouterAtome(el, x, y); lier(a, b, ordre); return b;
    }
    function supprimerAtome(a) { G.liaisons = G.liaisons.filter(l => l.a !== a.id && l.b !== a.id); G.atomes = G.atomes.filter(x => x !== a); }
    function cycle(nb, aromatique, p, surAtome, surLiaison) {
      const R = 1 / (2 * Math.sin(Math.PI / nb));
      let pts;
      if (surLiaison) {                          // cycle accolé à une liaison
        const a = A(surLiaison.a), b = A(surLiaison.b), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        let nx = -(b.y - a.y), ny = b.x - a.x; const nn = Math.hypot(nx, ny); nx /= nn; ny /= nn;
        // côté le moins encombré
        const enc = s => G.atomes.filter(c => c !== a && c !== b && ((c.x - mx) * nx + (c.y - my) * ny) * s > 0).length;
        if (enc(1) > enc(-1)) { nx = -nx; ny = -ny; }
        const ap = R * Math.cos(Math.PI / nb), cx = mx + nx * ap, cy = my + ny * ap;
        const a0 = Math.atan2(a.y - cy, a.x - cx), sens = ((b.x - cx) * (a.y - cy) - (b.y - cy) * (a.x - cx)) > 0 ? -1 : 1;
        pts = []; for (let k = 0; k < nb; k++) pts.push([cx + R * Math.cos(a0 + sens * 2 * Math.PI * k / nb), cy + R * Math.sin(a0 + sens * 2 * Math.PI * k / nb)]);
      } else if (surAtome) {
        const an = directionLibre(surAtome) * Math.PI / 180, cx = surAtome.x + Math.cos(an) * R, cy = surAtome.y + Math.sin(an) * R;
        pts = []; for (let k = 0; k < nb; k++) { const t = an + Math.PI + 2 * Math.PI * k / nb; pts.push([cx + R * Math.cos(t), cy + R * Math.sin(t)]); }
      } else {
        pts = []; for (let k = 0; k < nb; k++) { const t = -Math.PI / 2 + Math.PI / nb + 2 * Math.PI * k / nb; pts.push([p[0] + R * Math.cos(t), p[1] + R * Math.sin(t)]); }
      }
      const at = pts.map(q => atomeSous(q) || ajouterAtome('C', q[0], q[1]));
      for (let k = 0; k < nb; k++) {
        const a = at[k], b = at[(k + 1) % nb];
        const ex = G.liaisons.find(l => (l.a === a.id && l.b === b.id) || (l.a === b.id && l.b === a.id));
        if (!ex) lier(a, b, aromatique && k % 2 === 0 ? 2 : 1);
      }
    }
    function dessiner() {
      const an = G.atomes.length ? Chimie.analyser(G) : null;
      const out = [], X = v => (v * U).toFixed(1);
      G.liaisons.forEach(l => {
        const a = A(l.a), b = A(l.b); let p = [a.x * U, a.y * U], q = [b.x * U, b.y * U];
        const ra = lab(a, an) ? 11 : 0, rb = lab(b, an) ? 11 : 0, dx = q[0] - p[0], dy = q[1] - p[1], nn = Math.hypot(dx, dy) || 1;
        p = [p[0] + dx / nn * ra, p[1] + dy / nn * ra]; q = [q[0] - dx / nn * rb, q[1] - dy / nn * rb];
        const nx = -dy / nn, ny = dx / nn, cls = st.survol === l ? ' class="sv"' : '';
        const seg = (e) => `<line${cls} x1="${(p[0] + nx * e).toFixed(1)}" y1="${(p[1] + ny * e).toFixed(1)}" x2="${(q[0] + nx * e).toFixed(1)}" y2="${(q[1] + ny * e).toFixed(1)}"/>`;
        if (l.ordre === 1) out.push(seg(0)); else if (l.ordre === 2) out.push(seg(3), seg(-3)); else out.push(seg(0), seg(4.5), seg(-4.5));
      });
      G.atomes.forEach((a, i) => {
        const t = lab(a, an), sv = st.survol === a, err = an && an.erreur[i];
        if (sv) out.push(`<circle class="sv-c" cx="${X(a.x)}" cy="${X(a.y)}" r="13"/>`);
        if (st.selection.has(a.id)) out.push(`<circle class="sel-c" cx="${X(a.x)}" cy="${X(a.y)}" r="11"/>`);
        if (t) out.push(Rendu.tx(a.x * U, a.y * U, t, { cls: err ? 'err' : '' }));
        else if (!voisins(a).length) out.push(`<circle class="pt" cx="${X(a.x)}" cy="${X(a.y)}" r="3"/>`);
      });
      if (st.glisse && st.glisse.rect) { const [q0, q1] = st.glisse.rect; out.push(`<rect class="cadre-sel" x="${X(Math.min(q0[0], q1[0]))}" y="${X(Math.min(q0[1], q1[1]))}" width="${X(Math.abs(q1[0] - q0[0]))}" height="${X(Math.abs(q1[1] - q0[1]))}"/>`); }
      if (st.glisse && st.glisse.fin) { const a = st.glisse.depart, f = st.glisse.fin; out.push(`<line class="fantome" x1="${X(a.x)}" y1="${X(a.y)}" x2="${X(f[0])}" y2="${X(f[1])}"/>`); }
      svgEl.innerHTML = out.join('') || `<text x="0" y="0" text-anchor="middle" class="vide">Clique pour poser un atome de carbone, glisse pour tracer une liaison.</text>`;
      if (!G.atomes.length || horsVue()) cadrer();
    }
    function lab(a, an) {
      const i = G.atomes.indexOf(a), h = an ? an.H[i] : 0, hs = h ? 'H' + (h > 1 ? h : '') : '', q = a.charge ? '^' + (Math.abs(a.charge) > 1 ? Math.abs(a.charge) : '') + (a.charge > 0 ? '+' : '−') : '';
      if (a.el === 'C' && !st.ecrireC && !a.charge && voisins(a).length) return '';
      const gauche = voisins(a).length && voisins(a).every(b => b.x > a.x + 0.05);
      return (gauche ? hs + a.el : a.el + hs) + q;
    }
    function horsVue() {
      const vb = svgEl.viewBox.baseVal; if (!vb || !vb.width) return true;
      return G.atomes.some(a => a.x * U < vb.x + 15 || a.x * U > vb.x + vb.width - 15 || a.y * U < vb.y + 12 || a.y * U > vb.y + vb.height - 12);
    }
    let vbFixe = null;
    function cadrer() {
      const w = svgEl.clientWidth || 600, h = svgEl.clientHeight || 340;
      if (!G.atomes.length) { svgEl.setAttribute('viewBox', `${-w / 2} ${-h / 2} ${w} ${h}`); vbFixe = null; return; }
      if (st.glisse) return;                       // pas de recadrage pendant un geste
      const xs = G.atomes.map(a => a.x * U), ys = G.atomes.map(a => a.y * U);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const s = Math.max(1, (Math.max(...xs) - Math.min(...xs) + 120) / w, (Math.max(...ys) - Math.min(...ys) + 100) / h);
      svgEl.setAttribute('viewBox', `${cx - w * s / 2} ${cy - h * s / 2} ${w * s} ${h * s}`);
    }
    function change() { dessiner(); surChange && surChange(G); }
    // ── gestes ──
    svgEl.addEventListener('pointerdown', e => {
      e.preventDefault(); svgEl.setPointerCapture(e.pointerId);
      const p = ecran(e), a = atomeSous(p), l = a ? null : liaisonSous(p);
      if (st.outil === 'deplacer') {
        if (a || l) {
          const ids = a ? [a.id] : [l.a, l.b];
          if (!ids.every(i => st.selection.has(i))) st.selection = new Set(ids);
          sauver();
          st.glisse = { mode: 'move', p0: p, orig: new Map([...st.selection].map(i => { const x = A(i); return [i, [x.x, x.y]]; })) };
        } else st.glisse = { mode: 'rect', p0: p, rect: [p, p] };
        return;
      }
      st.glisse = { depart: a, liaison: l, p0: p, bouge: false };
    });
    svgEl.addEventListener('pointermove', e => {
      const p = ecran(e);
      if (st.glisse && st.glisse.mode === 'move') {
        const g = st.glisse, dx = p[0] - g.p0[0], dy = p[1] - g.p0[1];
        g.orig.forEach((o, i) => { const x = A(i); if (x) { x.x = o[0] + dx; x.y = o[1] + dy; } });
        // un seul atome lié à un seul voisin : il tourne autour de ce voisin (liaison de longueur fixe, angles multiples de 30°)
        if (g.orig.size === 1) {
          const x = A([...g.orig.keys()][0]), v = voisins(x);
          if (v.length === 1) { const c = v[0]; let an = Math.atan2(x.y - c.y, x.x - c.x); an = Math.round(an / (Math.PI / 6)) * (Math.PI / 6); x.x = c.x + Math.cos(an); x.y = c.y + Math.sin(an); }
        }
        dessiner(); return;
      }
      if (st.glisse && st.glisse.mode === 'rect') { st.glisse.rect = [st.glisse.p0, p]; dessiner(); return; }
      if (st.glisse) {
        const g = st.glisse;
        if (g.depart && Math.hypot(p[0] - g.p0[0], p[1] - g.p0[1]) > 0.3 && ['atome', 'liaison'].includes(st.outil)) { g.bouge = true; g.fin = p; dessiner(); }
        return;
      }
      const a = atomeSous(p), s = a || liaisonSous(p);
      if (s !== st.survol) { st.survol = s; dessiner(); }
    });
    svgEl.addEventListener('pointerup', e => {
      const g = st.glisse; if (!g) return; st.glisse = null;
      const p = ecran(e);
      if (g.mode === 'move') { if (Math.hypot(p[0] - g.p0[0], p[1] - g.p0[1]) < 0.05) histo.pop(); return change(); }
      if (g.mode === 'rect') {
        const [q0, q1] = g.rect, x0 = Math.min(q0[0], q1[0]), x1 = Math.max(q0[0], q1[0]), y0 = Math.min(q0[1], q1[1]), y1 = Math.max(q0[1], q1[1]);
        st.selection = new Set(G.atomes.filter(a => a.x >= x0 && a.x <= x1 && a.y >= y0 && a.y <= y1).map(a => a.id));
        return dessiner();
      }
      sauver();
      if (g.bouge && g.depart) {                  // glisser : nouvelle liaison
        let cible = atomeSous(p, g.depart);
        if (!cible) {                              // longueur fixée, angle arrondi à 30°
          let an = Math.atan2(p[1] - g.depart.y, p[0] - g.depart.x); an = Math.round(an / (Math.PI / 6)) * (Math.PI / 6);
          cible = atomeSous([g.depart.x + Math.cos(an), g.depart.y + Math.sin(an)], g.depart) || ajouterAtome(st.outil === 'atome' ? st.el : 'C', g.depart.x + Math.cos(an), g.depart.y + Math.sin(an));
        }
        lier(g.depart, cible, st.outil === 'liaison' ? st.ordre : 1);
        return change();
      }
      const a = g.depart, l = g.liaison;
      switch (st.outil) {
        case 'atome':
          if (a) { if (a.el !== st.el) { a.el = st.el; a.charge = 0; } else pousser(a, st.el, 1); }
          else if (l) l.ordre = l.ordre % 3 + 1;
          else ajouterAtome(st.el, p[0], p[1]);
          break;
        case 'liaison':
          if (l) l.ordre = l.ordre === st.ordre && st.ordre === 1 ? 2 : st.ordre;
          else if (a) pousser(a, 'C', st.ordre);
          else { const b = ajouterAtome('C', p[0] - 0.43, p[1] + 0.25); const c = ajouterAtome('C', p[0] + 0.43, p[1] - 0.25); lier(b, c, st.ordre); }
          break;
        case 'cycle': cycle(st.cycle === 'benzene' ? 6 : st.cycle, st.cycle === 'benzene', p, a, l); break;
        case 'gomme': if (a) supprimerAtome(a); else if (l) G.liaisons = G.liaisons.filter(x => x !== l); else histo.pop(); break;
        case 'plus': if (a) a.charge = Math.min(2, (a.charge || 0) + 1); break;
        case 'moins': if (a) a.charge = Math.max(-2, (a.charge || 0) - 1); break;
      }
      change();
    });
    svgEl.addEventListener('pointerleave', () => { if (st.survol) { st.survol = null; dessiner(); } });
    new ResizeObserver(() => { dessiner(); cadrer(); }).observe(svgEl);
    return {
      st,
      supprimerSelection() { if (!st.selection.size) return; sauver(); st.selection.forEach(i => { const a = A(i); if (a) supprimerAtome(a); }); st.selection.clear(); change(); },
      outil(o, v) { if (o !== 'deplacer') st.selection.clear(); st.outil = o; svgEl.dataset.outil = o; dessiner(); if (o === 'atome') st.el = v; if (o === 'liaison') st.ordre = v; if (o === 'cycle') st.cycle = v; },
      graphe: () => G,
      charger(g, sansHisto) { if (!sansHisto) sauver(); G = JSON.parse(JSON.stringify(g)); n = G.atomes.length + G.liaisons.length + 1000; dessiner(); cadrer(); surChange && surChange(G); },
      vider() { sauver(); G = { atomes: [], liaisons: [] }; change(); },
      annuler() { if (!histo.length) return; refaire.push(JSON.stringify(G)); G = JSON.parse(histo.pop()); change(); },
      retablir() { if (!refaire.length) return; histo.push(JSON.stringify(G)); G = JSON.parse(refaire.pop()); change(); },
      dessiner
    };
  }
  return { creer };
})();
