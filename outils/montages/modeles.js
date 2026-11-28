/* Schémas de montages — modèles prêts à l'emploi (calqués sur les montages du site) */
const Modeles = (() => {
  const M = Montage, pc = M.piece, at = M.attacher;
  const EAU = '#bfe3f7', HUILE = '#f3dc93', MILIEU = '#cde9c9', ORGA = '#f6e3a8';
  // légendes : colonne à droite (ou à gauche), espacées
  function legendes(items, liste, cote = 'droite') {
    const b = items.filter(i => i.t === 'piece').map(M.boite), xMax = Math.max(...b.map(x => x[2])), xMin = Math.min(...b.map(x => x[0]));
    const L = liste.map(([p, t, c]) => ({ p, t, c: c || cote })).sort((a, b) => a.p[1] - b.p[1]);
    ['droite', 'gauche'].forEach(c => {
      let yPrec = -1e9;
      L.filter(l => l.c === c).forEach(l => {
        const y = Math.max(l.p[1], yPrec + 24); yPrec = y;
        items.push({ id: M.nid(), t: 'legende', x1: l.p[0], y1: l.p[1], x2: c === 'droite' ? xMax + 40 : xMin - 40, y2: y, texte: l.t });
      });
    });
    return items;
  }
  const J = (it, k, dx = 0, dy = 0) => { const p = M.monde(it, Verrerie.pieces[it.p].joints[k]); return [p[0] + dx, p[1] + dy]; };
  // relie le câble (ou le tube) d'une pièce à un point de la scène
  const relier = (it, q) => { const l = M.local(it, q); it.cx = Math.round(l[0]); it.cy = Math.round(l[1]); return it; };
  // poste de titrage commun : agitateur, bécher, barreau, électrode tenue par une pince sur une potence à droite
  function poste(it, sonde, liq) {
    const ag = pc('agitateur', 0, -34), be = at(pc('becher', 0, 0, { liq }), 'bas', ag, 'dessus'), ol = at(pc('olive'), 'bas', be, 'bas', 0, -3);
    const el = pc(sonde, 15, be.y - 16);
    return { ag, be, ol, el };
  }
  // potence + pinces (pinces serrées sur les points donnés)
  function support(items, xTige, serrages) {
    const pot = pc('potence', xTige + 33, 0); items.unshift(pot);
    serrages.forEach(([x, y, o]) => { const p = pc('pince', xTige, y); p.bras = Math.max(20, x - xTige); p.ouv = o || 9; items.splice(1, 0, p); });
    const yMin = Math.min(...items.filter(i => i.t === 'piece' && i !== pot).map(i => M.boite(i)[1]));
    pot.h = Math.max(260, Math.min(-yMin - 20, ...serrages.map(s => -s[1] + 60)) );
    pot.h = Math.max(pot.h, ...serrages.map(s => -s[1] + 40));
    // anneaux : bras jusqu'à la tige
    items.filter(i => i.p === 'support_ampoule').forEach(a => { a.bras = a.x - xTige; pot.h = Math.max(pot.h, -a.y + 40); });
    return pot;
  }
  // base chauffante : élévateur + agitateur + bain (ou chauffe-ballon) ; renvoie le ballon posé dedans
  function chauffage(items, type, ballonType = 'ballon', liq = { niv: 0.45, coul: MILIEU }) {
    const elev = pc('elevateur', 0, -60); items.push(elev);
    let b;
    if (type === 'bain') {
      const ag = at(pc('agitateur_chauffant'), 'bas', elev, 'dessus'); const bain = at(pc('cristallisoir', 0, 0, { liq: { niv: 0.62, coul: HUILE } }), 'bas', ag, 'dessus');
      items.push(ag, bain);
      b = at(pc(ballonType, 0, 0, { liq }), 'bas', bain, 'bas', 0, -10);
      items.push(b, at(pc('olive'), 'bas', b, 'bas', 0, -5));
      return { b, bain, ag, elev };
    }
    const cb = at(pc('chauffe_ballon_agit'), 'bas', elev, 'dessus'); items.push(cb);
    b = at(pc(ballonType, 0, 0, { liq }), 'bas', cb, 'nid', 0, 0); items.push(b, at(pc('olive'), 'bas', b, 'bas', 0, -5));
    return { b, cb, elev };
  }

  const liste = {
    reflux: { nom: 'Chauffage à reflux', f() {
      const it = [], { b, bain, ag, elev } = chauffage(it, 'bain');
      const r = at(pc('refrigerant_boules', 0, 0, { eau: true }), 'bas', b, 'haut'); it.push(r);
      support(it, b.x - 80, [[b.x, J(b, 'haut')[1] + 14], [r.x, r.y + 10, 19]]);
      return legendes(it, [[J(r, 'haut', 0, 60), 'réfrigérant à boules'], [J(b, 'haut', 7, 20), 'ballon'], [[b.x + 18, b.y + 25], 'milieu réactionnel'], [[b.x - 4, b.y + 35], 'olive aimantée', 'gauche'], [[bain.x + 60, bain.y - 10], 'bain d’huile'], [[ag.x + 50, ag.y + 15], 'agitateur magnétique chauffant'], [[elev.x + 50, elev.y + 30], 'support élévateur']]);
    } },
    reflux_controle: { nom: 'Reflux contrôlé (ampoule de coulée, thermomètre)', f() {
      const it = [], { b, cb, elev } = chauffage(it, 'chauffe', 'tricol');
      const r = at(pc('refrigerant_droit', 0, 0, { eau: true }), 'bas', b, 'haut'); it.push(r);
      const a = at(pc('ampoule_coulee', 0, 0, { rot: -37, liq: { niv: 0.6, coul: ORGA } }), 'bas', b, 'gauche'); it.push(a);
      const tq = M.monde(b, Verrerie.pieces.tricol.joints.droite), dir = [Math.cos(-53 * Math.PI / 180), Math.sin(-53 * Math.PI / 180)];
      const t = pc('thermometre', tq[0] - dir[0] * 50, tq[1] - dir[1] * 50, { rot: 37, sc: 0.8 }); it.push(t);
      support(it, b.x - 120, [[b.x, J(b, 'haut')[1] + 14], [r.x, r.y + 20, 15]]);
      return legendes(it, [[J(r, 'haut', 0, 50), 'réfrigérant droit'], [[a.x - 10, a.y], 'ampoule de coulée isobare', 'gauche'], [[t.x + 70, t.y - 100], 'thermomètre'], [[b.x + 25, b.y + 15], 'ballon tricol'], [[cb.x + 55, cb.y + 20], 'chauffe-ballon agitateur'], [[elev.x + 50, elev.y + 30], 'support élévateur']]);
    } },
    distillation: { nom: 'Distillation simple', f() { return distillation(false); } },
    distillation_fractionnee: { nom: 'Distillation fractionnée', f() { return distillation(true); } },
    hydrodistillation: { nom: 'Hydrodistillation', f() { return distillation(false, true); } },
    entrainement: { nom: 'Entraînement à la vapeur d’eau', f() {
      const it = [];
      const e1 = pc('elevateur', -260, -60), cb1 = at(pc('chauffe_ballon'), 'bas', e1, 'dessus'), g = at(pc('ballon', 0, 0, { liq: { niv: 0.55, coul: EAU } }), 'bas', cb1, 'nid');
      it.push(e1, cb1, g);
      const { b, cb, elev } = chauffage(it, 'chauffe', 'bicol', { niv: 0.45, coul: MILIEU, solide: true });
      const tete = at(pc('tete_distillation'), 'bas', b, 'haut'); it.push(tete);
      const r = at(pc('refrigerant_droit', 0, 0, { rot: -60, eau: true }), 'haut', tete, 'cote'); it.push(r);
      const al = at(pc('allonge', 0, 0, { rot: -60 }), 'haut', r, 'bas'); it.push(al);
      const er = at(pc('erlen', 0, 0, { liq: { niv: 0.2, coul: EAU } }), 'haut', al, 'bas', 0, 18); it.push(er);
      const tu = pc('tuyau'); const p0 = J(g, 'haut'), p1 = J(b, 'cote'); tu.x = p0[0]; tu.y = p0[1]; tu.sc = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 116; tu.rot = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180 / Math.PI - 31; it.push(tu);
      return legendes(it, [[[g.x, g.y + 10], 'générateur de vapeur (eau)', 'gauche'], [[b.x + 15, b.y + 20], 'mélange à entraîner'], [J(r, 'haut', 40, 20), 'réfrigérant droit'], [J(er, 'haut', 10, 60), 'distillat']]);
    } },
    dean_stark: { nom: 'Montage de Dean-Stark', f() {
      const it = [], { b, bain, ag, elev } = chauffage(it, 'bain');
      const d = at(pc('dean_stark', 0, 0, { liq: { niv: 0.45, coul: EAU } }), 'bas', b, 'haut'); it.push(d);
      const r = at(pc('refrigerant_boules', 0, 0, { eau: true }), 'bas', d, 'haut'); it.push(r);
      support(it, r.x - 90, [[r.x, r.y + 10, 19], [d.x - 80, J(d, 'haut')[1] + 70, 9], [b.x, J(b, 'haut')[1] + 30, 9]]);
      return legendes(it, [[J(r, 'haut', 18, 60), 'réfrigérant à eau'], [[J(d, 'haut')[0] - 8, J(d, 'haut')[1] + 110], 'appareil de Dean-Stark (eau recueillie)', 'gauche'], [[b.x + 18, b.y + 25], 'milieu réactionnel'], [[bain.x + 60, bain.y - 10], 'bain d’huile'], [[ag.x + 50, ag.y + 15], 'agitateur magnétique chauffant'], [[elev.x + 50, elev.y + 30], 'support élévateur']]);
    } },
    soxhlet: { nom: 'Extraction au Soxhlet', f() {
      const it = [], { b, cb, elev } = chauffage(it, 'chauffe', 'ballon', { niv: 0.5, coul: ORGA });
      const s = at(pc('soxhlet', 0, 0, { liq: { niv: 0.35, coul: ORGA } }), 'bas', b, 'haut'); it.push(s);
      const r = at(pc('refrigerant_boules', 0, 0, { eau: true }), 'bas', s, 'haut'); it.push(r);
      support(it, b.x - 90, [[b.x, J(b, 'haut')[1] + 14], [r.x, r.y + 10, 19]]);
      return legendes(it, [[J(r, 'haut', 0, 60), 'réfrigérant à eau'], [[s.x + 16, s.y - 130], 'cartouche poreuse (solide)'], [[s.x + 44, s.y - 100], 'tube d’admission des vapeurs'], [[s.x - 54, s.y - 90], 'siphon', 'gauche'], [[b.x + 18, b.y + 20], 'solvant'], [[cb.x + 55, cb.y + 20], 'chauffe-ballon agitateur']]);
    } },
    filtration: { nom: 'Filtration par gravité', f() {
      const it = [];
      const er = pc('erlen', 0, 0, { liq: { niv: 0.18, coul: EAU } }); it.push(er);
      const en = at(pc('entonnoir'), 'bas', er, 'haut', 0, 30); it.push(en);
      const fi = at(pc('filtre'), 'bas', en, 'bas', 0, -42); fi.sc = 1; it.push(fi);
      const an = pc('support_ampoule', en.x, en.y - 30); it.push(an);
      support(it, en.x - 110, []);
      return legendes(it, [[[en.x + 30, en.y - 40], 'entonnoir'], [[fi.x + 18, fi.y - 30], 'papier filtre'], [[er.x + 25, er.y - 20], 'filtrat']]);
    } },
    filtration_vide: { nom: 'Filtration sous vide (Büchner)', f() {
      const it = [], f = pc('fiole_vide', 0, 0, { liq: { niv: 0.15, coul: EAU, solide: false } }); it.push(f);
      support(it, -140, [[0, -88, 14]]);
      return legendes(it, [[[30, -192], 'entonnoir Büchner'], [[0, -172], 'papier filtre'], [[13, -121], 'cône en caoutchouc'], [[30, -40], 'fiole à vide']]);
    } },
    titrage_colorimetrique: { nom: 'Titrage colorimétrique (burette)', f() {
      const it = [], ag = pc('agitateur', 0, -34);
      const er = at(pc('erlen', 0, 0, { liq: { niv: 0.42, coul: '#f2d84b' } }), 'bas', ag, 'dessus');
      const ol = at(pc('olive'), 'bas', er, 'bas', 0, -3);
      const bu = at(pc('burette', 0, 0, { liq: { niv: 0.8, coul: '#cfe8f6' } }), 'bas', er, 'haut', 0, 12);
      // potence derrière, à droite, comme sur les schémas de titrage usuels
      const xT = 150, p1 = pc('pince', xT, bu.y - 175, { flip: true, bras: xT, ouv: 7 }), p2 = pc('pince', xT, er.y - 92, { flip: true, bras: xT, ouv: 10 });
      const pot = pc('potence', xT - 33, 0, { flip: true, h: -p1.y + 90 });
      it.push(pot, ag, p2, er, ol, p1, bu);
      return legendes(it, [[[bu.x - 6, bu.y - 255], 'burette'], [[bu.x - 3, bu.y - 120], 'solution titrante'], [[er.x - 9, er.y - 100], 'erlenmeyer'], [[er.x - 18, er.y - 22], 'solution titrée'], [[ol.x - 5, ol.y - 1], 'barreau aimanté'], [[ag.x - 50, ag.y + 24], 'agitateur magnétique']], 'gauche');
    } },
    titrage_ph: { nom: 'Titrage pH-métrique', f() {
      const it = [], { ag, be, ol, el } = poste(it, 'sonde_ph', { niv: 0.45, coul: '#d9eef9' });
      const bu = at(pc('burette', 0, 0, { liq: { niv: 0.8, coul: '#f6d2df' } }), 'bas', be, 'haut', -12, 12);
      const xT = 150, p1 = pc('pince', xT, bu.y - 175, { flip: true, bras: xT + 12, ouv: 7 }), p2 = pc('pince', xT, el.y - 120, { flip: true, bras: xT - 15, ouv: 7 });
      const pot = pc('potence', xT - 33, 0, { flip: true, h: -p1.y + 90 }), ph = pc('phmetre', 300, 0);
      relier(el, J(ph, 'prise'));
      it.push(pot, ag, be, ol, p2, el, p1, bu, ph);
      return legendes(it, [[[bu.x - 6, bu.y - 250], 'burette'], [[bu.x - 3, bu.y - 110], 'solution titrante'], [[be.x - 34, be.y - 85], 'bécher'], [[be.x - 20, be.y - 25], 'solution titrée'], [[ol.x - 6, ol.y - 1], 'barreau aimanté'], [[ag.x - 50, ag.y + 24], 'agitateur magnétique'], [[el.x + 4, el.y - 80], 'électrode de pH combinée', 'droite'], [[ph.x + 30, ph.y - 30], 'pH-mètre', 'droite']], 'gauche');
    } },
    titrage_conducto: { nom: 'Titrage conductimétrique', f() {
      const it = [], { ag, be, ol, el } = poste(it, 'cellule_cond', { niv: 0.62, coul: '#d9eef9' });
      const bu = at(pc('burette', 0, 0, { liq: { niv: 0.8, coul: '#e8e8e8' } }), 'bas', be, 'haut', -12, 12);
      const xT = 150, p1 = pc('pince', xT, bu.y - 175, { flip: true, bras: xT + 12, ouv: 7 }), p2 = pc('pince', xT, el.y - 120, { flip: true, bras: xT - 15, ouv: 7 });
      const pot = pc('potence', xT - 33, 0, { flip: true, h: -p1.y + 90 }), co = pc('conductimetre', 300, 0);
      relier(el, J(co, 'prise'));
      it.push(pot, ag, be, ol, p2, el, p1, bu, co);
      return legendes(it, [[[bu.x - 6, bu.y - 250], 'burette'], [[bu.x - 3, bu.y - 110], 'solution titrante'], [[be.x - 34, be.y - 85], 'bécher'], [[be.x - 20, be.y - 25], 'solution titrée + eau distillée'], [[ol.x - 6, ol.y - 1], 'barreau aimanté'], [[ag.x - 50, ag.y + 24], 'agitateur magnétique'], [[el.x + 5, el.y - 80], 'cellule conductimétrique', 'droite'], [[co.x + 30, co.y - 30], 'conductimètre', 'droite']], 'gauche');
    } },
    titrage_burette_auto: { nom: 'Titrage à la burette automatique', f() {
      const it = [], { ag, be, ol, el } = poste(it, 'sonde_ph', { niv: 0.45, coul: '#d9eef9' });
      const ba = pc('burette_auto', -150, 0), fl = pc('flacon_reactif', -225, 0, { liq: { niv: 0.6, coul: '#f6d2df' } });
      relier(ba, [-14, be.y - 70]);
      const xT = 150, p2 = pc('pince', xT, el.y - 120, { flip: true, bras: xT - 15, ouv: 7 });
      const pot = pc('potence', xT - 33, 0, { flip: true, h: -p2.y + 80 }), ph = pc('phmetre', 300, 0);
      relier(el, J(ph, 'prise'));
      it.push(pot, ag, be, ol, p2, el, ba, fl, ph);
      return legendes(it, [[[ba.x - 20, ba.y - 120], 'burette automatique'], [[ba.x - 10, ba.y - 190], 'réserve de solution titrante'], [[fl.x - 12, fl.y - 30], 'flacon de solution titrante'], [[be.x + 20, be.y - 25], 'solution titrée', 'droite'], [[el.x + 4, el.y - 80], 'électrode de pH combinée', 'droite'], [[ph.x + 30, ph.y - 30], 'pH-mètre', 'droite']], 'gauche');
    } },
    titrage_titrateur: { nom: 'Titrage au titrateur automatique', f() {
      const it = [], ti = pc('titrateur', -150, 0), po = pc('poste_titrage', 0, 0);
      const be = at(pc('becher', 0, 0, { sc: 0.72, liq: { niv: 0.5, coul: '#bfe6f2' } }), 'bas', po, 'dessus');
      const el = pc('sonde_ph', 9, be.y - 10);
      relier(ti, [-10, be.y - 45]); relier(el, J(ti, 'prise'));
      it.push(ti, po, be, el);
      return legendes(it, [[[ti.x - 30, ti.y - 60], 'titrateur automatique'], [[ti.x - 15, ti.y - 230], 'flacon de solution titrante'], [[ti.x + 49, ti.y - 280], 'garde (dessiccant)'], [[ti.x, ti.y - 150], 'unité de dosage (piston)'], [[po.x + 29, po.y - 206], 'support d’électrodes', 'droite'], [[el.x + 3, el.y - 150], 'électrode de pH combinée', 'droite'], [[be.x + 18, be.y - 20], 'solution titrée', 'droite'], [[po.x + 25, po.y - 30], 'agitateur', 'droite']], 'gauche');
    } },
    recristallisation: { nom: 'Recristallisation (dissolution à chaud)', f() {
      const it = [], { b, bain, ag } = chauffage(it, 'bain', 'ballon', { niv: 0.35, coul: '#e9f3fb', solide: true });
      const r = at(pc('refrigerant_droit', 0, 0, { eau: true }), 'bas', b, 'haut'); it.push(r);
      support(it, b.x - 80, [[b.x, J(b, 'haut')[1] + 14], [r.x, r.y + 10, 15]]);
      return legendes(it, [[J(r, 'haut', 0, 50), 'réfrigérant droit'], [[b.x + 18, b.y + 22], 'solide + solvant de recristallisation'], [[bain.x + 60, bain.y - 10], 'bain-marie'], [[ag.x + 50, ag.y + 15], 'agitateur magnétique chauffant']]);
    } },
    extraction: { nom: 'Extraction liquide-liquide / lavage', f() {
      const it = [], bc = pc('becher', 0, 0, { liq: { niv: 0.2, coul: EAU } }); it.push(bc);
      const a = pc('ampoule_decanter', 0, -170, { liq: { niv: 0.82, coul: ORGA, niv2: 0.53, coul2: EAU } }); it.push(a);
      it.push(pc('support_ampoule', 0, -230, { ouv: 38 })); support(it, -110, []);
      return legendes(it, [[[a.x + 30, a.y - 100], 'phase organique (moins dense)'], [[a.x + 20, a.y - 45], 'phase aqueuse (plus dense)'], [[a.x + 12, a.y + 24], 'robinet'], [[bc.x + 30, bc.y - 15], 'bécher']]);
    } }
  };
  function distillation(fract, hydro) {
    const it = [], { b, cb, elev } = chauffage(it, 'chauffe', 'ballon', hydro ? { niv: 0.5, coul: EAU, solide: true } : { niv: 0.4, coul: MILIEU });
    let bas = b;
    let vg = null; if (fract) { vg = at(pc('vigreux'), 'bas', b, 'haut'); it.push(vg); bas = vg; }
    const tete = at(pc('tete_distillation'), 'bas', bas, 'haut'); it.push(tete);
    const th = pc('thermometre'); const tq = J(tete, 'cote'); th.x = tete.x; th.y = J(tete, 'cote')[1] - 2; it.push(th);
    const r = at(pc('refrigerant_droit', 0, 0, { rot: -60, eau: true }), 'haut', tete, 'cote'); it.push(r);
    const al = at(pc('allonge', 0, 0, { rot: -60 }), 'haut', r, 'bas'); it.push(al);
    const er = at(pc('erlen', 0, 0, { liq: { niv: 0.2, coul: hydro ? '#e7f1d6' : MILIEU } }), 'haut', al, 'bas', 0, 18); it.push(er);
    const elev2 = at(pc('elevateur'), 'dessus', er, 'bas'); it.push(elev2);
    support(it, b.x - 80, [[b.x, J(b, 'haut')[1] + 14]]);
    const L = [[[th.x + 4, th.y - 150], 'thermomètre'], [J(tete, 'haut', 7, 30), 'tête de distillation'], [J(r, 'haut', 60, 40), 'réfrigérant droit'], [J(al, 'haut', 10, 20), 'allonge'], [J(er, 'haut', 10, 70), hydro ? 'distillat (hydrolat + huile essentielle)' : 'distillat'],
      [[b.x - 20, b.y + 10], hydro ? 'eau + matière végétale' : 'mélange à distiller', 'gauche'], [[cb.x - 55, cb.y + 20], 'chauffe-ballon agitateur', 'gauche'], [[elev.x - 50, elev.y + 30], 'support élévateur', 'gauche']];
    if (vg) L.push([[vg.x - 9, vg.y], 'colonne de Vigreux', 'gauche']);
    return legendes(it, L);
  }
  return { liste };
})();
