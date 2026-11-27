/* Schémas de montages — bibliothèque de verrerie et de matériel (dessins SVG en coordonnées locales).
   Chaque pièce : { nom, cat, dessin(o) → SVG, interieur(o) → chemin du volume intérieur (liquide), joints: { nom: [x, y, angle] } }
   angle = direction vers laquelle le joint s'ouvre (en degrés, 0 = droite, -90 = haut). */
const Verrerie = (() => {
  const P = (d, cls = 'verre') => `<path class="${cls}" d="${d}"/>`;
  const R = (x, y, w, h, cls = 'verre', rx = 0) => `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ''}/>`;
  const C = (x, y, r, cls = 'verre') => `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}"/>`;
  const Ln = (x1, y1, x2, y2, cls = 'trait') => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const T = (x, y, t, cls = 'petit') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="middle">${t}</text>`;
  const J = 7;          // demi-largeur d'un rodage normalisé
  // col rodé (de y0 à y1, centré en x)
  const col = (x, y0, y1, w = J) => P(`M${x - w},${y0} L${x - w},${y1} M${x + w},${y0} L${x + w},${y1}`, 'trait') + Ln(x - w - 1.5, y1 + 6, x - w - 1.5, y1, 'rodage') + Ln(x + w + 1.5, y1 + 6, x + w + 1.5, y1, 'rodage');
  // robinet (vu de face)
  const robinet = (x, y) => R(x - 9, y - 4, 18, 8, 'robinet', 2) + Ln(x + 9, y, x + 17, y, 'trait');
  const grads = (x, y0, y1, n, w = 6) => { let s = ''; for (let k = 0; k <= n; k++) { const y = y0 + (y1 - y0) * k / n; s += Ln(x, y, x + (k % 5 ? w * 0.6 : w), y, 'grad'); } return s; };

  const pieces = {
    // ───── récipients ─────
    ballon: { nom: 'Ballon monocol', cat: 'Récipients',
      dessin: () => P('M-7,-72 L-7,-38 A40,40 0 1 0 7,-38 L7,-72') + Ln(-8.5, -66, -8.5, -72, 'rodage') + Ln(8.5, -66, 8.5, -72, 'rodage'),
      interieur: () => 'M-7,-72 L-7,-38 A40,40 0 1 0 7,-38 L7,-72 Z', haut: -72, bas: 40,
      joints: { haut: [0, -72, -90], bas: [0, 40, 90] } },
    bicol: { nom: 'Ballon bicol', cat: 'Récipients',
      dessin: () => P('M-7,-74 L-7,-39 A40,40 0 0 0 -40,0 A40,40 0 1 0 31,-25 L52,-53 L41,-61 L20,-34 A40,40 0 0 0 7,-39 L7,-74'),
      interieur: () => 'M-7,-74 L-7,-39 A40,40 0 0 0 -40,0 A40,40 0 1 0 31,-25 L52,-53 L41,-61 L20,-34 A40,40 0 0 0 7,-39 L7,-74 Z', haut: -74, bas: 40,
      joints: { haut: [0, -74, -90], cote: [46.5, -57, -53], bas: [0, 40, 90] } },
    tricol: { nom: 'Ballon tricol', cat: 'Récipients',
      dessin: () => P('M-7,-76 L-7,-40 A40,40 0 0 0 -20,-34 L-41,-61 L-52,-53 L-31,-25 A40,40 0 1 0 31,-25 L52,-53 L41,-61 L20,-34 A40,40 0 0 0 7,-40 L7,-76'),
      interieur: () => 'M-7,-76 L-7,-40 A40,40 0 0 0 -20,-34 L-41,-61 L-52,-53 L-31,-25 A40,40 0 1 0 31,-25 L52,-53 L41,-61 L20,-34 A40,40 0 0 0 7,-40 L7,-76 Z', haut: -76, bas: 40,
      joints: { haut: [0, -76, -90], gauche: [-46.5, -57, -127], droite: [46.5, -57, -53], bas: [0, 40, 90] } },
    becher: { nom: 'Bécher', cat: 'Récipients',
      dessin: () => P('M-38,-100 L-34,-96 L-34,0 L34,0 L34,-100') + grads(-30, -80, -20, 6),
      interieur: () => 'M-34,-98 L-34,0 L34,0 L34,-98 Z', haut: -98, bas: 0, joints: { bas: [0, 0, 90], haut: [0, -100, -90] } },
    erlen: { nom: 'Erlenmeyer', cat: 'Récipients',
      dessin: () => P('M-9,-110 L-9,-70 L-42,0 L42,0 L9,-70 L9,-110'),
      interieur: () => 'M-9,-110 L-9,-70 L-42,0 L42,0 L9,-70 L9,-110 Z', haut: -110, bas: 0, joints: { haut: [0, -110, -90], bas: [0, 0, 90] } },
    tube: { nom: 'Tube à essais', cat: 'Récipients',
      dessin: () => P('M-10,-120 L-10,-10 A10,10 0 0 0 10,-10 L10,-120'),
      interieur: () => 'M-10,-120 L-10,-10 A10,10 0 0 0 10,-10 L10,-120 Z', haut: -120, bas: 0, joints: { haut: [0, -120, -90], bas: [0, 0, 90] } },
    cristallisoir: { nom: 'Cristallisoir', cat: 'Récipients',
      dessin: () => P('M-75,-42 L-75,0 L75,0 L75,-42'), interieur: () => 'M-75,-42 L-75,0 L75,0 L75,-42 Z', haut: -42, bas: 0, joints: { bas: [0, 0, 90], haut: [0, -42, -90] } },
    fiole_vide: { nom: 'Fiole à vide + Büchner', cat: 'Filtration',
      dessin: () => P('M-9,-112 L-9,-70 L-44,0 L44,0 L9,-70 L9,-112') + P('M9,-100 L32,-100 M9,-93 L32,-93', 'trait') + P('M-13,-112 L13,-112 L10,-124 L-10,-124 Z', 'bouchon') + P('M-40,-200 L40,-200 L40,-150 L6,-140 L6,-112 M-40,-200 L-40,-150 L-6,-140 L-6,-112') + Ln(-38, -160, 38, -160, 'fritte') + T(48, -94, '→ trompe', 'petit g'),
      interieur: () => 'M-9,-112 L-9,-70 L-44,0 L44,0 L9,-70 L9,-112 Z', interieur2: () => 'M-40,-200 L40,-200 L40,-160 L-40,-160 Z', haut: -112, bas: 0, joints: { bas: [0, 0, 90], haut: [0, -200, -90] } },
    // ───── mesure ─────
    eprouvette: { nom: 'Éprouvette graduée', cat: 'Mesure',
      dessin: () => P('M-14,-200 L-12,-196 L-12,0 L12,0 L12,-200') + P('M-26,0 L26,0 L22,8 L-22,8 Z', 'verre') + grads(-12, -180, -20, 16, 7),
      interieur: () => 'M-12,-198 L-12,0 L12,0 L12,-198 Z', haut: -198, bas: 0, joints: { bas: [0, 8, 90], haut: [0, -200, -90] } },
    fiole: { nom: 'Fiole jaugée', cat: 'Mesure',
      dessin: () => P('M-7,-150 L-7,-62 A34,34 0 1 0 7,-62 L7,-150') + Ln(-9, -110, 9, -110, 'grad'),
      interieur: () => 'M-7,-150 L-7,-62 A34,34 0 1 0 7,-62 L7,-150 Z', haut: -150, bas: 0, joints: { haut: [0, -150, -90], bas: [0, 0, 90] } },
    burette: { nom: 'Burette graduée', cat: 'Mesure',
      dessin: () => P('M-6,-300 L-6,-30 L-3,-22 L-3,-8 L-1,0 L1,0 L3,-8 L3,-22 L6,-30 L6,-300') + robinet(0, -24) + grads(-6, -280, -50, 23, 6),
      interieur: () => 'M-6,-298 L-6,-30 L-3,-22 L-3,-8 L3,-8 L3,-22 L6,-30 L6,-298 Z', haut: -298, bas: 0, joints: { bas: [0, 0, 90] } },
    pipette: { nom: 'Pipette jaugée', cat: 'Mesure',
      dessin: () => P('M-3,-240 L-3,-160 L-9,-145 L-9,-95 L-3,-80 L-3,-6 L-1,0 L1,0 L3,-6 L3,-80 L9,-95 L9,-145 L3,-160 L3,-240') + Ln(-5, -200, 5, -200, 'grad'),
      interieur: () => 'M-3,-240 L-3,-160 L-9,-145 L-9,-95 L-3,-80 L-3,-6 L3,-6 L3,-80 L9,-95 L9,-145 L3,-160 L3,-240 Z', haut: -240, bas: 0, joints: { bas: [0, 0, 90] } },
    thermometre: { nom: 'Thermomètre', cat: 'Mesure',
      dessin: () => R(-4, -200, 8, 192, 'verre', 4) + C(0, -6, 6, 'verre') + Ln(0, -12, 0, -120, 'mercure') + C(0, -6, 3.5, 'mercure-p') + grads(-4, -190, -40, 15, 4),
      joints: { bas: [0, 0, 90], haut: [0, -200, -90] } },
    // ───── réfrigérants, colonnes, distillation ─────
    refrigerant_droit: { nom: 'Réfrigérant droit', cat: 'Réfrigérants et distillation',
      dessin: () => P('M-6,-130 L-6,130 M6,-130 L6,130', 'trait') + P('M-14,-104 L-14,104 L-6,112 M14,-104 L14,104 L6,112 M-6,-112 L-14,-104 M6,-112 L14,-104', 'enveloppe') + P('M14,90 L26,90 M14,98 L26,98 M14,-98 L26,-98 M14,-90 L26,-90', 'trait') + Ln(-7.5, 124, -7.5, 130, 'rodage') + Ln(7.5, 124, 7.5, 130, 'rodage'),
      interieur: () => 'M-14,-104 L-14,104 L14,104 L14,-104 Z', eau: true, haut: -130, bas: 130,
      joints: { bas: [0, 130, 90], haut: [0, -130, -90], eau_entree: [26, 94, 0], eau_sortie: [26, -94, 0] } },
    refrigerant_boules: { nom: 'Réfrigérant à boules', cat: 'Réfrigérants et distillation',
      dessin: () => { let d = 'M-6,-130 L-6,-92'; for (let k = 0; k < 5; k++) d += ` A9,14 0 0 0 -6,${-92 + k * 34 + 28} L-6,${-92 + (k + 1) * 34}`; d += ' L-6,130 M6,-130 L6,-92'; for (let k = 0; k < 5; k++) d += ` A9,14 0 0 1 6,${-92 + k * 34 + 28} L6,${-92 + (k + 1) * 34}`; d += ' L6,130'; return P(d, 'trait') + P('M-18,-104 L-18,104 L-6,112 M18,-104 L18,104 L6,112 M-6,-112 L-18,-104 M6,-112 L18,-104', 'enveloppe') + P('M18,90 L30,90 M18,98 L30,98 M18,-98 L30,-98 M18,-90 L30,-90', 'trait') + Ln(-7.5, 124, -7.5, 130, 'rodage') + Ln(7.5, 124, 7.5, 130, 'rodage'); },
      interieur: () => 'M-18,-104 L-18,104 L18,104 L18,-104 Z', eau: true, haut: -130, bas: 130,
      joints: { bas: [0, 130, 90], haut: [0, -130, -90], eau_entree: [30, 94, 0], eau_sortie: [30, -94, 0] } },
    vigreux: { nom: 'Colonne de Vigreux', cat: 'Réfrigérants et distillation',
      dessin: () => { let s = P('M-9,-110 L-9,110 M9,-110 L9,110', 'trait'); for (let y = -90; y <= 90; y += 22) s += P(`M-9,${y} L-3,${y + 6} L-9,${y + 12} M9,${y + 11} L3,${y + 17} L9,${y + 23}`, 'trait'); return s + Ln(-10.5, 104, -10.5, 110, 'rodage') + Ln(10.5, 104, 10.5, 110, 'rodage'); },
      haut: -110, bas: 110, joints: { bas: [0, 110, 90], haut: [0, -110, -90] } },
    tete_distillation: { nom: 'Tête de distillation', cat: 'Réfrigérants et distillation',
      dessin: () => P('M-7,50 L-7,-40 M7,50 L7,-22 L58,8 M7,-40 L7,-36 L64,-3', 'trait') + col(0, -40, -50) + Ln(-8.5, 44, -8.5, 50, 'rodage') + Ln(8.5, 44, 8.5, 50, 'rodage'),
      haut: -50, bas: 50, joints: { bas: [0, 50, 90], haut: [0, -50, -90], cote: [61, 2.5, 30] } },
    allonge: { nom: 'Allonge coudée', cat: 'Réfrigérants et distillation',
      dessin: () => P('M-7,-30 L-7,2 L-32,40 M7,-30 L7,8 L-18,46 M5,-4 L20,-12', 'trait') + Ln(-8.5, -24, -8.5, -30, 'rodage') + Ln(8.5, -24, 8.5, -30, 'rodage'),
      joints: { haut: [0, -30, -90], bas: [-25, 43, 150] } },
    dean_stark: { nom: 'Dean-Stark', cat: 'Réfrigérants et distillation',
      dessin: () => P('M-7,90 L-7,-70 M7,90 L7,-30 L28,-42 M7,-70 L7,-50 L32,-64 M24,-62 L24,40 L30,52 L36,40 L36,-66', 'trait') + robinet(30, 44) + grads(24, -30, 30, 6, 5) + col(0, -70, -80) + Ln(-8.5, 84, -8.5, 90, 'rodage') + Ln(8.5, 84, 8.5, 90, 'rodage'),
      interieur: () => 'M24,-50 L24,40 L30,50 L36,40 L36,-50 Z', haut: -80, bas: 90, joints: { bas: [0, 90, 90], haut: [0, -80, -90] } },
    soxhlet: { nom: 'Extracteur de Soxhlet', cat: 'Réfrigérants et distillation',
      dessin: () => P('M-7,120 L-7,90 L-26,70 L-26,-80 L-7,-96 L-7,-110 M7,120 L7,90 L26,70 L26,-80 L7,-96 L7,-110', 'trait') + P('M-26,60 L-40,60 L-40,-60 L-34,-66 L-34,40 L-26,40 M26,-60 L40,-50 L40,96 L7,100', 'trait') + R(-16, -50, 32, 100, 'cartouche', 3) + Ln(-8.5, -104, -8.5, -110, 'rodage') + Ln(8.5, -104, 8.5, -110, 'rodage'),
      interieur: () => 'M-26,70 L-26,-80 L26,-80 L26,70 Z', haut: -110, bas: 120, joints: { bas: [0, 120, 90], haut: [0, -110, -90] } },
    // ───── ajout, séparation ─────
    ampoule_coulee: { nom: 'Ampoule de coulée isobare', cat: 'Ajout et séparation',
      dessin: () => P('M-7,-120 L-7,-104 L-24,-84 L-24,-10 L-5,12 L-5,40 M7,-120 L7,-104 L24,-84 L24,-10 L5,12 L5,40', 'trait') + P('M7,-108 L34,-108 L34,30 L5,34', 'trait') + robinet(0, 18) + P('M-11,-120 L11,-120 L9,-132 L-9,-132 Z', 'bouchon') + Ln(-6.5, 34, -6.5, 40, 'rodage') + Ln(6.5, 34, 6.5, 40, 'rodage'),
      interieur: () => 'M-24,-84 L-24,-10 L-5,12 L5,12 L24,-10 L24,-84 Z', haut: -84, bas: 12, joints: { bas: [0, 40, 90], haut: [0, -132, -90] } },
    ampoule_decanter: { nom: 'Ampoule à décanter', cat: 'Ajout et séparation',
      dessin: () => P('M-7,-150 L-7,-130 C-60,-60 -40,-10 -5,10 L-5,60 M7,-150 L7,-130 C60,-60 40,-10 5,10 L5,60', 'trait') + robinet(0, 24) + P('M-11,-150 L11,-150 L9,-162 L-9,-162 Z', 'bouchon'),
      interieur: () => 'M-7,-130 C-60,-60 -40,-10 -5,10 L5,10 C40,-10 60,-60 7,-130 Z', haut: -130, bas: 10, deuxPhases: true, joints: { bas: [0, 60, 90], haut: [0, -162, -90] } },
    entonnoir: { nom: 'Entonnoir', cat: 'Ajout et séparation',
      dessin: () => P('M-45,-60 L-4,-8 L-4,40 M45,-60 L4,-8 L4,40', 'trait'),
      interieur: () => 'M-45,-60 L-4,-8 L4,-8 L45,-60 Z', haut: -60, bas: -8, joints: { bas: [0, 40, 90], haut: [0, -60, -90] } },
    entonnoir_solide: { nom: 'Entonnoir à solide', cat: 'Ajout et séparation',
      dessin: () => P('M-45,-50 L-12,-10 L-12,25 M45,-50 L12,-10 L12,25', 'trait'),
      joints: { bas: [0, 25, 90], haut: [0, -50, -90] } },
    filtre: { nom: 'Filtre (papier)', cat: 'Ajout et séparation',
      dessin: () => P('M-40,-54 L0,-4 L40,-54', 'filtre'), joints: { bas: [0, 0, 90] } },
    bouchon: { nom: 'Bouchon', cat: 'Ajout et séparation', dessin: () => P('M-10,0 L10,0 L8,-14 L-8,-14 Z', 'bouchon'), joints: { bas: [0, 0, 90] } },
    garde_cacl2: { nom: 'Garde à chlorure de calcium', cat: 'Ajout et séparation',
      dessin: () => P('M-5,40 L-5,10 L-12,0 L-12,-60 L12,-60 L12,0 L5,10 L5,40', 'trait') + (() => { let s = ''; for (let y = -50; y < -5; y += 8) for (let x = -8; x <= 8; x += 8) s += C(x + (y % 16 ? 4 : 0), y, 2.6, 'grain'); return s; })() + Ln(-6.5, 34, -6.5, 40, 'rodage') + Ln(6.5, 34, 6.5, 40, 'rodage'),
      joints: { bas: [0, 40, 90] } },
    // ───── gaz ─────
    flacon_laveur: { nom: 'Flacon laveur (barboteur)', cat: 'Gaz',
      dessin: () => P('M-30,-70 L-30,0 L30,0 L30,-70 L18,-82 L-18,-82 Z') + P('M-8,-110 L-8,-12 M8,-110 L8,-60 M-8,-110 L-20,-110 M8,-110 L20,-110', 'trait'),
      interieur: () => 'M-30,-70 L-30,0 L30,0 L30,-70 Z', haut: -70, bas: 0, joints: { entree: [-20, -110, 180], sortie: [20, -110, 0] } },
    flacon_garde: { nom: 'Flacon de garde', cat: 'Gaz',
      dessin: () => P('M-30,-70 L-30,0 L30,0 L30,-70 L18,-82 L-18,-82 Z') + P('M-8,-110 L-8,-60 M8,-110 L8,-60 M-8,-110 L-20,-110 M8,-110 L20,-110', 'trait'),
      interieur: () => 'M-30,-70 L-30,0 L30,0 L30,-70 Z', haut: -70, bas: 0, joints: { entree: [-20, -110, 180], sortie: [20, -110, 0] } },
    tuyau: { nom: 'Tuyau', cat: 'Gaz', dessin: () => P('M0,0 C40,0 60,60 100,60', 'tuyau'), joints: { a: [0, 0, 180], b: [100, 60, 0] } },
    // ───── chauffage, agitation, support ─────
    chauffe_ballon: { nom: 'Chauffe-ballon', cat: 'Chauffage et support',
      dessin: () => P('M-58,-28 A58,58 0 0 0 58,-28 L58,30 L-58,30 Z', 'appareil') + P('M-46,-28 A46,46 0 0 0 46,-28', 'trait') + C(-30, 16, 5, 'bouton') + C(30, 16, 5, 'bouton'),
      joints: { nid: [0, 6, -90], bas: [0, 30, 90] } },
    agitateur_chauffant: { nom: 'Agitateur magnétique chauffant', cat: 'Chauffage et support',
      dessin: () => R(-70, -10, 140, 10, 'plaque') + R(-62, 0, 124, 34, 'appareil', 4) + C(-38, 17, 7, 'bouton') + C(38, 17, 7, 'bouton') + T(0, 22, '≈ ⊕', 'petit'),
      joints: { dessus: [0, -10, -90], bas: [0, 34, 90] } },
    elevateur: { nom: 'Support élévateur', cat: 'Chauffage et support',
      dessin: () => R(-55, -6, 110, 6, 'appareil') + R(-55, 54, 110, 6, 'appareil') + P('M-45,0 L45,54 M-45,54 L45,0 M-20,15 L20,15 M-20,39 L20,39', 'trait') + C(0, 27, 4, 'bouton'),
      joints: { dessus: [0, -6, -90], bas: [0, 60, 90] } },
    potence: { nom: 'Potence', cat: 'Chauffage et support',
      dessin: it => R(-60, -8, 120, 8, 'appareil', 2) + R(-36, -((it && it.h) || 420), 6, ((it && it.h) || 420) - 8, 'tige'), haut: -420, joints: { bas: [0, 0, 90] } },
    pince: { nom: 'Pince et noix', cat: 'Chauffage et support',
      dessin: it => { const L = (it && it.bras) || 44; return R(-8, -8, 16, 16, 'noix', 2) + R(8, -3, L, 6, 'tige') + P(`M${L + 8},-9 C${L + 18},-12 ${L + 22},-6 ${L + 22},0 C${L + 22},6 ${L + 18},12 ${L + 8},9`, 'pince'); }, joints: { tige: [0, 0, 180], serre: [62, 0, 0] } },
    olive: { nom: 'Olive aimantée', cat: 'Chauffage et support', dessin: () => R(-9, -4, 18, 8, 'olive', 4), joints: { bas: [0, 4, 90] } },
    support_ampoule: { nom: 'Anneau (support d’ampoule)', cat: 'Chauffage et support', dessin: it => P(`M-26,0 A26,6 0 1 0 26,0 A26,6 0 1 0 -26,0 M-26,0 L${-((it && it.bras) || 60)},0`, 'pince'), joints: { centre: [0, 0, -90] } },
    // ───── chromatographie ─────
    cuve_ccm: { nom: 'Cuve et plaque de CCM', cat: 'Chromatographie',
      dessin: () => P('M-50,-120 L-50,0 L50,0 L50,-120') + R(-56, -128, 112, 8, 'bouchon', 2) + P('M-26,-112 L-6,-112 L26,-8 L6,-8 Z', 'plaque-ccm') + Ln(-14, -30, 24, -30, 'grad') + C(4, -44, 3, 'tache') + C(-6, -70, 3, 'tache'),
      interieur: () => 'M-50,-120 L-50,0 L50,0 L50,-120 Z', haut: -120, bas: 0, joints: { bas: [0, 0, 90] } }
  };
  Object.keys(pieces).forEach(k => { pieces[k].id = k; });
  const categories = [...new Set(Object.values(pieces).map(p => p.cat))];
  return { pieces, categories };
})();
