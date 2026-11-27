/* Mésomérie — molécules du cours (Partie 2, chap. 2, cours 4.1) et des exercices (cours 4.2)
   atomes : [el, x, y, H portés, électrons non liants, options] ; liaisons : [i, j, ordre]
   suite : flèches menant d'une formule à la suivante — « S>T » (S, T = atome i ou liaison i-j), « ~ » demi-flèche */
const MesoMolecules = (() => {
  const A = (el, x, y, h = 0, ne = 0, o = {}) => ({ el, x, y, h, ne, ...o });
  const C = (x, y, h, ne = 0) => A('C', x, y, h, ne, { cache: true });           // carbone du squelette (topologique)
  const r3 = Math.sqrt(3) / 2;
  const hexa = (cx, cy, hs, a0 = 0) => [...Array(6)].map((_, k) => { const t = (a0 + 60 * k) * Math.PI / 180; return C(cx + Math.cos(t), cy + Math.sin(t), hs[k]); });
  const kekule = [[0, 1, 2], [1, 2, 1], [2, 3, 2], [3, 4, 1], [4, 5, 2], [5, 0, 1]];
  const simples = [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1], [5, 0, 1]];

  const benzeneH = (() => {
    const at = [], li = [];
    for (let k = 0; k < 6; k++) { const t = (-90 + 60 * k) * Math.PI / 180; at.push(A('C', Math.cos(t), Math.sin(t), 0, 0)); }
    for (let k = 0; k < 6; k++) { const t = (-90 + 60 * k) * Math.PI / 180; at.push(A('H', 1.95 * Math.cos(t), 1.95 * Math.sin(t))); li.push([k, k + 6, 1]); }
    return { at, li: kekule.concat(li) };
  })();

  const liste = [
    // ───── cours ─────
    { id: 'no', groupe: 'cours', titre: 'NO⁺', nom: 'ion NO⁺',
      atomes: [A('N', 0, 0, 0, 2), A('O', 1.05, 0, 0, 4)], liaisons: [[0, 1, 2]],
      suite: ['1>0-1'] },
    { id: 'so2', groupe: 'cours', titre: 'SO₂', nom: 'dioxyde de soufre',
      atomes: [A('S', 0, 0, 0, 2), A('O', -r3 * 1.1, 0.55, 0, 6), A('O', r3 * 1.1, 0.55, 0, 4)], liaisons: [[0, 1, 1], [0, 2, 2]],
      suite: ['1>0-1', '0-2>2'],
      note: 'Le soufre (3ᵉ période) peut dépasser l’octet : la formule du milieu ne porte aucune charge.' },
    { id: 'ocn', groupe: 'cours', titre: 'OCN⁻', nom: 'ion cyanate',
      atomes: [A('N', 0, 0, 0, 4), A('C', 1, 0), A('O', 2, 0, 0, 4)], liaisons: [[0, 1, 2], [1, 2, 2]],
      suite: ['0>0-1 1-2>2'] },
    { id: 'no3', hybride: true, groupe: 'cours', titre: 'NO₃⁻', nom: 'ion nitrate',
      atomes: [A('N', 0, 0), A('O', 0, -1.05, 0, 4), A('O', -r3 * 1.05, 0.525, 0, 6), A('O', r3 * 1.05, 0.525, 0, 6)], liaisons: [[0, 1, 2], [0, 2, 1], [0, 3, 1]],
      suite: ['2>0-2 0-1>1', '3>0-3 0-2>2', '0-3>3'], interdites: ['2>0-2'],
      note: 'L’azote (2ᵉ période) ne peut jamais dépasser l’octet.' },
    { id: 'po3', groupe: 'cours', titre: 'PO₃⁻', nom: 'ion PO₃⁻',
      atomes: [A('P', 0, 0), A('O', 0, -1.1, 0, 6), A('O', -r3 * 1.1, 0.55, 0, 6), A('O', r3 * 1.1, 0.55, 0, 6)], liaisons: [[0, 1, 1], [0, 2, 1], [0, 3, 1]],
      suite: ['1>0-1', '2>0-2', '3>0-3'],
      note: 'Le phosphore (3ᵉ période) peut dépasser l’octet. Les formules obtenues en « tournant » les liaisons doubles sont équivalentes.' },
    { id: 'benzene', hybride: true, groupe: 'cours', titre: 'C₆H₆', nom: 'benzène', cercle: true,
      atomes: benzeneH.at, liaisons: benzeneH.li, cycles: [[0, 1, 2, 3, 4, 5]],
      suite: ['0-1>1-2 2-3>3-4 4-5>5-0'],
      note: 'Les 6 liaisons carbone–carbone sont équivalentes, intermédiaires entre simple et double liaison.' },
    // ───── exercices (cours 4.2) ─────
    { id: 'ethanoate', hybride: true, groupe: 'exo', titre: 'CH₃–COO⁻', nom: 'ion éthanoate',
      atomes: [A('C', -1.15, 0, 3), A('C', 0, 0), A('O', 0.55, -0.95, 0, 4), A('O', 0.55, 0.95, 0, 6)], liaisons: [[0, 1, 1], [1, 2, 2], [1, 3, 1]],
      suite: ['3>1-3 1-2>2'] },
    { id: 'ethanamide', groupe: 'exo', titre: 'CH₃–CO–NH₂', nom: 'éthanamide',
      atomes: [A('C', -1.15, 0, 3), A('C', 0, 0), A('O', 0.55, -0.95, 0, 4), A('N', 0.55, 0.95, 2, 2)], liaisons: [[0, 1, 1], [1, 2, 2], [1, 3, 1]],
      suite: ['3>1-3 1-2>2'] },
    { id: 'nitromethane', hybride: true, groupe: 'exo', titre: 'CH₃–NO₂', nom: 'nitrométhane',
      atomes: [A('C', -1.15, 0, 3), A('N', 0, 0), A('O', 0.55, -0.95, 0, 4), A('O', 0.55, 0.95, 0, 6)], liaisons: [[0, 1, 1], [1, 2, 2], [1, 3, 1]],
      suite: ['3>1-3 1-2>2'] },
    { id: 'enamine1', groupe: 'exo', titre: 'CH₃–CH=CH–NH₂', nom: 'prop-1-én-1-amine',
      atomes: [A('C', 0, 0, 3), A('C', 1.3, 0, 1), A('C', 2.6, 0, 1), A('N', 3.9, 0, 2, 2)], liaisons: [[0, 1, 1], [1, 2, 2], [2, 3, 1]],
      suite: ['3>2-3 1-2>1'] },
    { id: 'phenolate', groupe: 'exo', titre: 'C₆H₅–O⁻', nom: 'ion phénolate',
      atomes: hexa(0, 0, [0, 1, 1, 1, 1, 1]).concat([A('O', 2.1, 0, 0, 6)]), liaisons: kekule.concat([[0, 6, 1]]), cycles: [[0, 1, 2, 3, 4, 5]],
      suite: ['6>6-0 0-1>1', '1>1-2 2-3>3', '3>3-4 4-5>5'] },
    { id: 'allyle', groupe: 'exo', titre: 'CH₃–CH=CH–CH₂•', nom: 'radical but-2-én-1-yle',
      atomes: [A('C', 0, 0, 3), A('C', 1.3, 0, 1), A('C', 2.6, 0, 1), A('C', 3.9, 0, 2, 1)], liaisons: [[0, 1, 1], [1, 2, 2], [2, 3, 1]],
      suite: ['~3>2-3 ~1-2>2-3 ~1-2>1'] },
    { id: 'benzyle', groupe: 'exo', titre: 'C₆H₅–CH₂•', nom: 'radical benzyle',
      atomes: hexa(0, 0, [0, 1, 1, 1, 1, 1]).concat([A('C', 2.2, 0, 2, 1)]), liaisons: kekule.concat([[0, 6, 1]]), cycles: [[0, 1, 2, 3, 4, 5]],
      suite: ['~6>6-0 ~0-1>6-0 ~0-1>1', '~1>1-2 ~2-3>1-2 ~2-3>3', '~3>3-4 ~4-5>3-4 ~4-5>5'] },
    { id: 'enol', groupe: 'exo', titre: 'cyclohexénol', nom: 'cyclohex-1-én-1-ol',
      atomes: hexa(0, 0, [0, 1, 2, 2, 2, 2]).concat([A('O', 2.1, 0, 1, 4)]), liaisons: [[0, 1, 2], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1], [5, 0, 1], [0, 6, 1]], cycles: [[0, 1, 2, 3, 4, 5]],
      suite: ['6>6-0 0-1>1'] },
    { id: 'enamine2', groupe: 'exo', titre: 'énamine cyclique', nom: 'N,N-diméthylcyclohex-1-én-1-amine',
      atomes: hexa(0, 0, [0, 1, 2, 2, 2, 2]).concat([A('N', 2.1, 0, 0, 2), A('C', 2.7, -0.95, 3), A('C', 2.7, 0.95, 3)]), liaisons: [[0, 1, 2], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1], [5, 0, 1], [0, 6, 1], [6, 7, 1], [6, 8, 1]], cycles: [[0, 1, 2, 3, 4, 5]],
      suite: ['6>6-0 0-1>1'] },
    { id: 'butenone', groupe: 'exo', titre: 'CH₂=CH–CO–CH₃', nom: 'but-3-én-2-one',
      atomes: [A('C', 0, 0, 2), A('C', 1.3, 0, 1), A('C', 2.6, 0), A('O', 3.2, -0.95, 0, 4), A('C', 3.2, 0.95, 3)], liaisons: [[0, 1, 2], [1, 2, 1], [2, 3, 2], [2, 4, 1]],
      suite: ['2-3>3', '0-1>1-2'] },
    { id: 'enolate', groupe: 'exo', titre: '⁻CH₂–CO–CH₃', nom: 'ion énolate de la propanone',
      atomes: [A('C', 0, 0, 2, 2), A('C', 1.3, 0), A('O', 1.9, -0.95, 0, 4), A('C', 1.9, 0.95, 3)], liaisons: [[0, 1, 1], [1, 2, 2], [1, 3, 1]],
      suite: ['0>0-1 1-2>2'] },
    { id: 'pentadiene', groupe: 'exo', titre: 'CH₃–CH=CH–CH=CH₂', nom: 'penta-1,3-diène', depart: 1,
      atomes: [A('C', 0, 0, 3), A('C', 1.3, 0, 1), A('C', 2.6, 0, 1), A('C', 3.9, 0, 1), A('C', 5.2, 0, 2, 2)], liaisons: [[0, 1, 1], [1, 2, 1], [2, 3, 2], [3, 4, 1]],
      suite: ['4>3-4 2-3>1-2', '3-4>2-3 1-2>1'] },
    { id: 'cation', groupe: 'exo', titre: 'C₆H₅–CH⁺–CH=CH₂', nom: 'carbocation allylique et benzylique', depart: 1,
      atomes: hexa(0, 0, [0, 1, 1, 1, 1, 1]).concat([A('C', 2.2, 0, 1), A('C', 3.5, 0, 1), A('C', 4.8, 0, 2)]), liaisons: kekule.concat([[0, 6, 1], [6, 7, 2], [7, 8, 1]]), cycles: [[0, 1, 2, 3, 4, 5]],
      suite: ['6-7>7-8', '0-1>0-6', '2-3>1-2', '4-5>3-4'] },
  ];
  return { liste, simples };
})();
if (typeof module !== 'undefined') module.exports = MesoMolecules;
