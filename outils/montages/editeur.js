/* Schémas de montages — scène, rendu, gestes, accrochage des rodages */
const Montage = (() => {
  const V = Verrerie.pieces, RAD = Math.PI / 180;
  let n = 0; const nid = () => 'i' + Date.now().toString(36) + (n++);
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // ── géométrie ──
  function monde(it, p) {               // point local → scène
    const s = it.sc || 1, f = it.flip ? -1 : 1, a = (it.rot || 0) * RAD;
    const x = p[0] * s * f, y = p[1] * s;
    return [it.x + x * Math.cos(a) - y * Math.sin(a), it.y + x * Math.sin(a) + y * Math.cos(a)];
  }
  function local(it, q) {
    const s = it.sc || 1, f = it.flip ? -1 : 1, a = -(it.rot || 0) * RAD, dx = q[0] - it.x, dy = q[1] - it.y;
    return [(dx * Math.cos(a) - dy * Math.sin(a)) / s / f, (dx * Math.sin(a) + dy * Math.cos(a)) / s];
  }
  const joints = it => (it.t === 'piece' && V[it.p] ? Object.entries(V[it.p].joints || {}).map(([k, j]) => ({ it, k, p: monde(it, j) })) : []);
  // place l'objet `it` pour que son joint jn coïncide avec le joint jc de `cible`
  function attacher(it, jn, cible, jc, dx = 0, dy = 0) {
    const q = monde(cible, V[cible.p].joints[jc]);
    const tmp = Object.assign({}, it, { x: 0, y: 0 }), o = monde(tmp, V[it.p].joints[jn]);
    it.x = q[0] - o[0] + dx; it.y = q[1] - o[1] + dy; return it;
  }
  const piece = (p, x = 0, y = 0, o = {}) => Object.assign({ id: nid(), t: 'piece', p, x, y, rot: 0, sc: 1, flip: false }, o);

  // ── rendu ──
  function dessinPiece(it, sel, mode) {
    const d = V[it.p]; if (!d) return '';
    const illu = mode === 'illu';
    const s = it.sc || 1, tr = `translate(${it.x.toFixed(1)} ${it.y.toFixed(1)}) rotate(${it.rot || 0}) scale(${(it.flip ? -s : s).toFixed(3)} ${s.toFixed(3)})`;
    let liq = '';
    if (d.interieur && it.liq && it.liq.niv > 0) {
      const h0 = d.haut, h1 = d.bas, cid = 'cl-' + it.id;
      const yN = h1 - (h1 - h0) * it.liq.niv;
      liq = `<clipPath id="${cid}"><path d="${d.interieur()}"/></clipPath><g clip-path="url(#${cid})"><rect class="liquide" x="-200" y="${yN}" width="400" height="${h1 - yN + 60}" style="fill:${it.liq.coul || '#9fd3f2'}"/>`;
      if (illu) liq += `<path class="liq-ombre" d="${d.interieur()}" clip-path="url(#${cid}-n)"/><clipPath id="${cid}-n"><rect x="-200" y="${yN}" width="400" height="${h1 - yN + 60}"/></clipPath><line class="surface" x1="-200" y1="${yN + 0.8}" x2="200" y2="${yN + 0.8}"/>`;
      if (d.deuxPhases && it.liq.niv2 > 0) { const y2 = h1 - (h1 - h0) * Math.min(it.liq.niv2, it.liq.niv); liq += `<rect class="liquide" x="-200" y="${y2}" width="400" height="${h1 - y2 + 60}" style="fill:${it.liq.coul2 || '#f3d27a'}"/>`; }
      if (it.liq.solide) liq += `<g class="solide">${[...Array(14)].map((_, k) => `<circle cx="${-25 + (k * 37) % 50}" cy="${h1 - 6 - (k * 13) % 14}" r="2.4"/>`).join('')}</g>`;
      liq += '</g>';
    }
    if (d.interieur2 && it.liq && it.liq.niv > 0) liq += `<path class="liquide" d="${d.interieur2()}" style="fill:${it.liq.coul2 || '#e8d9b5'}"/>`;
    let eau = '';
    if (it.eau && d.eau) {
      const [xe, ye] = d.joints.eau_entree, [xs, ys] = d.joints.eau_sortie;
      eau = `<g class="eau"><path d="M${xe + 26},${ye} L${xe + 2},${ye} M${xe + 8},${ye - 5} L${xe + 2},${ye} L${xe + 8},${ye + 5}"/><path d="M${xs + 2},${ys} L${xs + 26},${ys} M${xs + 20},${ys - 5} L${xs + 26},${ys} L${xs + 20},${ys + 5}"/><text x="${xe + 30}" y="${ye + 4}" class="petit g" transform="${it.flip ? `scale(-1 1) translate(${-2 * (xe + 30)} 0)` : ''}">eau</text><text x="${xs + 30}" y="${ys + 4}" class="petit g">eau</text></g>`;
    }
    // teinte du verre dessinée SOUS le liquide (sinon le remplissage du verre masque le liquide)
    const fond = d.interieur ? `<path class="verre-fond" d="${d.interieur()}"/>` : '';
    const reflet = illu && d.interieur ? `<path class="reflet" d="${d.interieur()}"/>` : '';
    const corps = illu && d.illu ? d.illu(it) : d.dessin(it);
    return `<g class="obj${sel ? ' sel' : ''}${d.interieur ? ' int' : ''}" data-id="${it.id}" transform="${tr}">${fond}${liq}${corps}${reflet}${eau}</g>`;
  }
  function dessinLegende(it, sel, mode) {
    const ali = it.x2 >= it.x1 ? 'start' : 'end', dx = it.x2 >= it.x1 ? 6 : -6;
    if (mode === 'illu') {   // style illustré : texte posé sur le trait de rappel, qui le souligne
      const w = longueur(it.texte), sens = it.x2 >= it.x1 ? 1 : -1, xf = it.x2 + sens * (w + 4);
      return `<g class="obj leg${sel ? ' sel' : ''}" data-id="${it.id}"><polyline class="leg-trait" fill="none" points="${it.x1},${it.y1} ${it.x2},${it.y2} ${xf},${it.y2}"/><circle class="leg-pt" cx="${it.x1}" cy="${it.y1}" r="1.8"/><text class="leg-txt" x="${it.x2 + sens * 2}" y="${it.y2 - 4}" text-anchor="${ali}">${esc(it.texte)}</text><circle class="poignee" data-p="1" cx="${it.x1}" cy="${it.y1}" r="6"/><circle class="poignee" data-p="2" cx="${it.x2}" cy="${it.y2}" r="6"/></g>`;
    }
    return `<g class="obj leg${sel ? ' sel' : ''}" data-id="${it.id}"><line class="leg-trait" x1="${it.x1}" y1="${it.y1}" x2="${it.x2}" y2="${it.y2}"/><circle class="leg-pt" cx="${it.x1}" cy="${it.y1}" r="1.8"/><text class="leg-txt" x="${it.x2 + dx}" y="${it.y2 + 4}" text-anchor="${ali}">${esc(it.texte)}</text><circle class="poignee" data-p="1" cx="${it.x1}" cy="${it.y1}" r="6"/><circle class="poignee" data-p="2" cx="${it.x2}" cy="${it.y2}" r="6"/></g>`;
  }
  const dessinTexte = (it, sel) => `<g class="obj${sel ? ' sel' : ''}" data-id="${it.id}"><text class="txt-libre" x="${it.x}" y="${it.y}" style="font-size:${it.taille || 14}px">${esc(it.texte)}</text></g>`;
  const longueur = t => { let w = 0; for (const c of String(t)) w += /[ilj.,;:'’ ()]/.test(c) ? 3.6 : /[mwMW]/.test(c) ? 11.5 : /[A-Z]/.test(c) ? 9.3 : 7.4; return w; };
  const modeDe = scene => scene.style || (scene.nb ? 'nb' : 'couleur');
  function rendre(scene, selId) {
    const mode = modeDe(scene);
    const fond = scene.items.filter(i => i.t === 'piece').map(i => dessinPiece(i, i.id === selId, mode)).join('');
    const legs = scene.items.filter(i => i.t !== 'piece').map(i => (i.t === 'legende' ? dessinLegende(i, i.id === selId, mode) : dessinTexte(i, i.id === selId))).join('');
    return (mode === 'illu' ? window.MONTAGE_DEFS_ILLU : '') + fond + legs;
  }
  // boîte englobante approximative d'une pièce (pour la sélection et le cadrage)
  function boite(it) {
    if (it.t === 'legende') return [Math.min(it.x1, it.x2) - (it.x2 < it.x1 ? 8 * it.texte.length : 0), Math.min(it.y1, it.y2) - 10, Math.max(it.x1, it.x2) + (it.x2 >= it.x1 ? 8 * it.texte.length : 0), Math.max(it.y1, it.y2) + 10];
    if (it.t === 'texte') return [it.x, it.y - 14, it.x + 8 * it.texte.length, it.y + 4];
    const d = V[it.p], js = Object.values(d.joints || {}).map(j => monde(it, j));
    const pts = js.concat([monde(it, [-50, d.haut || -60]), monde(it, [50, d.bas || 20])]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  return { monde, local, joints, attacher, piece, rendre, boite, nid, modeDe };
})();
