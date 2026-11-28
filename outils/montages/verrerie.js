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
      // fiole à vide à col et olive latérale, cône en caoutchouc dans le col, Büchner dont la tige descend sous l'olive
      dessin: () => P('M-13,-117 L-13,-80 L-46,-4 Q-47,0 -42,0 L42,0 Q47,0 46,-4 L13,-80 L13,-117 M-13,-117 L-16,-120 M13,-117 L16,-120', 'trait')
        + P('M13,-108 L30,-108 L33,-110 L33,-108 L37,-110 L37,-108 L41,-110 L41,-98 L37,-100 L37,-98 L33,-100 L33,-98 L30,-100 L13,-100', 'trait')
        + `<g class="vide"><path d="M47,-104 L76,-104 M70,-109 L76,-104 L70,-99"/><text x="62" y="-112" class="petit" text-anchor="middle">vide</text></g>`
        + P('M-4,-150 L-4,-92 L4,-88 L4,-150', 'trait')
        + P('M-17,-131 L17,-131 L11.5,-109 L-11.5,-109 Z', 'caoutchouc')
        + P('M-4,-131 L-4,-150 L-38,-166 L-38,-208 M4,-131 L4,-150 L38,-166 L38,-208', 'trait') + Ln(-37, -170, 37, -170, 'fritte'),
      interieur: () => 'M-13,-117 L-13,-80 L-46,-4 Q-47,0 -42,0 L42,0 Q47,0 46,-4 L13,-80 L13,-117 Z', interieur2: () => 'M-38,-208 L38,-208 L38,-170 L-38,-170 Z', haut: -117, bas: 0, joints: { bas: [0, 0, 90], haut: [0, -208, -90] } },
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
      // tube collecteur gradué à gauche (réfrigérant au-dessus), bras de retour à droite (vers le ballon)
      dessin: () => P('M-88,-210 L-88,-32 L-84,-22 L-84,-14 M-72,-210 L-72,-160 M-72,-144 L-72,-32 L-76,-22 L-76,-14', 'trait')
        + P('M-72,-160 L6,-124 L6,0 M-72,-144 L-6,-113 L-6,0', 'trait')
        + robinet(-80, -8) + P('M-82,-2 L-81,12 L-79,12 L-78,-2', 'trait')
        + grads(-88, -115, -40, 10, 6)
        + Ln(-89.5, -204, -89.5, -210, 'rodage') + Ln(-70.5, -204, -70.5, -210, 'rodage') + Ln(-7.5, -6, -7.5, 0, 'rodage') + Ln(7.5, -6, 7.5, 0, 'rodage'),
      interieur: () => 'M-88,-146 L-88,-32 L-84,-22 L-76,-22 L-72,-32 L-72,-146 Z', haut: -146, bas: -22,
      joints: { bas: [0, 0, 90], haut: [-80, -210, -90] } },
    soxhlet: { nom: 'Extracteur de Soxhlet', cat: 'Réfrigérants et distillation',
      // corps (cartouche), tube d'admission des vapeurs à droite, siphon à gauche
      dessin: () => P('M-7,-215 L-7,-200 L-26,-186 L-26,-74 M-26,-66 L-26,-60 L-7,-24 L-7,-22 M-7,-12 L-7,0', 'trait')
        + P('M7,-215 L7,-200 L26,-186 L26,-180 M26,-168 L26,-60 L7,-24 L7,-22 M7,-10 L7,0', 'trait')
        + P('M26,-180 L44,-180 L44,-30 L7,-10 M26,-168 L36,-168 L36,-36 L7,-22', 'trait')
        + P('M-26,-74 L-30,-74 L-30,-130 A12,12 0 0 0 -54,-130 L-54,-34 L-7,-12 M-26,-66 L-36,-66 L-36,-130 A6,6 0 0 0 -48,-130 L-48,-38 L-7,-22', 'trait')
        + R(-16, -170, 32, 92, 'cartouche', 3) + (() => { let g = ''; for (let y = -160; y < -84; y += 10) for (let x = -10; x <= 10; x += 10) g += C(x + (y % 20 ? 5 : 0), y, 2.2, 'grain'); return g; })()
        + Ln(-8.5, -209, -8.5, -215, 'rodage') + Ln(8.5, -209, 8.5, -215, 'rodage') + Ln(-8.5, -6, -8.5, 0, 'rodage') + Ln(8.5, -6, 8.5, 0, 'rodage'),
      interieur: () => 'M-26,-186 L-26,-60 L-7,-24 L7,-24 L26,-60 L26,-186 Z', haut: -186, bas: -24,
      joints: { bas: [0, 0, 90], haut: [0, -215, -90] } },
    // ───── ajout, séparation ─────
    ampoule_coulee: { nom: 'Ampoule de coulée isobare', cat: 'Ajout et séparation',
      dessin: () => P('M-7,-120 L-7,-104 L-24,-84 L-24,-10 L-5,12 L-5,40 M7,-120 L7,-104 L24,-84 L24,-10 L5,12 L5,40', 'trait') + P('M7,-108 L34,-108 L34,30 L5,34', 'trait') + robinet(0, 18) + P('M-11,-120 L11,-120 L9,-132 L-9,-132 Z', 'bouchon') + Ln(-6.5, 34, -6.5, 40, 'rodage') + Ln(6.5, 34, 6.5, 40, 'rodage'),
      interieur: () => 'M-24,-84 L-24,-10 L-5,12 L5,12 L24,-10 L24,-84 Z', haut: -84, bas: 12, joints: { bas: [0, 40, 90], haut: [0, -132, -90] } },
    ampoule_decanter: { nom: 'Ampoule à décanter', cat: 'Ajout et séparation',
      // boule sphérique, col court, longue tige à robinet (comme les schémas du site)
      dessin: () => P('M-7,-150 L-7,-124.4 A40,40 0 0 0 -12,-46.8 L-5,-30 L-5,60 M7,-150 L7,-124.4 A40,40 0 0 1 12,-46.8 L5,-30 L5,60', 'trait') + robinet(0, 24) + P('M-11,-150 L11,-150 L9,-162 L-9,-162 Z', 'bouchon'),
      interieur: () => 'M-7,-124.4 A40,40 0 0 0 -12,-46.8 L-5,-30 L5,-30 L12,-46.8 A40,40 0 0 0 7,-124.4 Z', haut: -124, bas: -30, deuxPhases: true, joints: { bas: [0, 60, 90], haut: [0, -162, -90], anneau: [0, -60, 0] } },
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
    chauffe_ballon_agit: { nom: 'Chauffe-ballon agitateur', cat: 'Chauffage et support',
      dessin: () => P('M-58,-30 A58,58 0 0 0 58,-30 L58,0 L-58,0 Z', 'appareil') + P('M-46,-30 A46,46 0 0 0 46,-30', 'trait') + R(-66, 0, 132, 42, 'appareil', 5) + R(-56, 8, 22, 7, 'bouton', 2) + C(-32, 28, 7, 'bouton') + C(32, 28, 7, 'bouton') + T(-32, 16, '≈', 'petit') + T(32, 16, '°C', 'petit'),
      joints: { nid: [0, 4, -90], bas: [0, 42, 90] } },
    agitateur_chauffant: { nom: 'Agitateur magnétique chauffant', cat: 'Chauffage et support',
      dessin: () => R(-70, -10, 140, 10, 'plaque') + R(-62, 0, 124, 34, 'appareil', 4) + C(-38, 17, 7, 'bouton') + C(38, 17, 7, 'bouton') + T(0, 22, '≈ ⊕', 'petit'),
      joints: { dessus: [0, -10, -90], bas: [0, 34, 90] } },
    elevateur: { nom: 'Support élévateur', cat: 'Chauffage et support',
      dessin: () => R(-55, -6, 110, 6, 'appareil') + R(-55, 54, 110, 6, 'appareil') + P('M-45,0 L45,54 M-45,54 L45,0 M-20,15 L20,15 M-20,39 L20,39', 'trait') + C(0, 27, 4, 'bouton'),
      joints: { dessus: [0, -6, -90], bas: [0, 60, 90] } },
    potence: { nom: 'Potence', cat: 'Chauffage et support',
      dessin: it => R(-60, -8, 120, 8, 'appareil', 2) + R(-36, -((it && it.h) || 420), 6, ((it && it.h) || 420) - 8, 'tige'), haut: -420, joints: { bas: [0, 0, 90] } },
    pince: { nom: 'Pince et noix', cat: 'Chauffage et support',
      // bras = distance de la noix à l'axe du tube serré ; ouv = demi-largeur du tube serré (les deux mors l'enserrent)
      dessin: it => { const L = (it && it.bras) || 62, o = (it && it.ouv) || 9; return R(-8, -8, 16, 16, 'noix', 2) + R(8, -3, Math.max(2, L - o - 13), 6, 'tige') + R(L - o - 6, -10, 5, 20, 'noix', 1.5) + R(L + o + 1, -10, 5, 20, 'noix', 1.5) + Ln(L - o - 4, -10, L + o + 4, -10, 'trait'); },
      joints: { tige: [0, 0, 180] } },
    olive: { nom: 'Olive aimantée', cat: 'Chauffage et support', dessin: () => R(-9, -4, 18, 8, 'olive', 4), joints: { bas: [0, 4, 90] } },
    support_ampoule: { nom: 'Anneau (support d’ampoule)', cat: 'Chauffage et support', dessin: it => { const o = (it && it.ouv) || 26, br = Math.max(o + 4, (it && it.bras) || 60);
      return P(`M${-o},0 A${o},8 0 1 0 ${o},0 A${o},8 0 1 0 ${-o},0 M${-o + 4.5},0 A${o - 4.5},5.5 0 1 0 ${o - 4.5},0 A${o - 4.5},5.5 0 1 0 ${-o + 4.5},0 M${-o},0 L${-br},0`, 'pince'); }, joints: { centre: [0, 0, -90] } },
    // ───── chromatographie ─────
    cuve_ccm: { nom: 'Cuve et plaque de CCM', cat: 'Chromatographie',
      dessin: () => P('M-50,-120 L-50,0 L50,0 L50,-120') + R(-56, -128, 112, 8, 'bouchon', 2) + P('M-26,-112 L-6,-112 L26,-8 L6,-8 Z', 'plaque-ccm') + Ln(-14, -30, 24, -30, 'grad') + C(4, -44, 3, 'tache') + C(-6, -70, 3, 'tache'),
      interieur: () => 'M-50,-120 L-50,0 L50,0 L50,-120 Z', haut: -120, bas: 0, joints: { bas: [0, 0, 90] } }
  };
  Object.keys(pieces).forEach(k => { pieces[k].id = k; });
  const categories = [...new Set(Object.values(pieces).map(p => p.cat))];
  return { pieces, categories };
})();
