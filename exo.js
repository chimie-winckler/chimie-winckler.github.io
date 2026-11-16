/* ===== Moteur des exercices d'entraînement (S'entraîner) =====
   Chaque exercice fournit une fonction generer() qui renvoie
   { contexte: html, etapes: [ ... ] }.
   Étape « choix »  : { type:'choix', q, options:[{t, ok, pourquoi}], corr }
   Étape « nombre » : { type:'nombre', q, rep, unite, tol, pieges:[{v, msg}], corr }
   Étape « clic »   : { type:'clic', q, svg (zones : éléments .zone avec data-z), cibles:[ids], noms:{id: nom}, corr }
*/
var Exo = (function () {
  /* ---------- outils numériques ---------- */
  function alea(a, b) { return a + Math.random() * (b - a); }
  function choisir(t) { return t[Math.floor(Math.random() * t.length)]; }
  function melanger(t) { t = t.slice(); for (var i = t.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = t[i]; t[i] = t[j]; t[j] = x; } return t; }
  function cs(x, n) { // arrondi à n chiffres significatifs
    if (x === 0 || !isFinite(x)) return x;
    var p = Math.pow(10, n - 1 - Math.floor(Math.log10(Math.abs(x))));
    return Math.round(x * p) / p;
  }
  var SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function nb(x, n) { // écriture française, n chiffres significatifs, notation scientifique si besoin
    n = n || 3;
    if (!isFinite(x)) return '—';
    if (x === 0) return '0';
    var e = Math.floor(Math.log10(Math.abs(cs(x, n))));
    if (e >= -2 && e <= 3) {
      var d = Math.max(0, n - 1 - e);
      return cs(x, n).toFixed(d).replace('.', ',');
    }
    var m = cs(x, n) / Math.pow(10, e);
    return m.toFixed(n - 1).replace('.', ',') + ' × 10<sup>' + e + '</sup>';
  }
  function lire(s) { // accepte virgule, espaces, e-3, ×10^-3, .10-3
    if (s == null) return NaN;
    s = String(s).trim().replace(/\s/g, '').replace(/,/g, '.').replace(/−/g, '-');
    s = s.replace(/[x×*]10\^?\(?([+-]?\d+)\)?/i, 'e$1').replace(/\.10\^?([+-]\d+)$/, 'e$1');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return NaN;
    return parseFloat(s);
  }
  function proche(a, b, tol) { return isFinite(a) && isFinite(b) && Math.abs(a - b) <= Math.abs(b) * tol; }
  function regression(xs, ys) {
    var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    for (var i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; syy += ys[i] * ys[i]; }
    var a = (n * sxy - sx * sy) / (n * sxx - sx * sx), b = (sy - a * sx) / n;
    var r = (n * sxy - sx * sy) / Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
    return { a: a, b: b, r2: r * r };
  }

  /* ---------- graphique SVG ---------- */
  function graduations(min, max, n) {
    var pas = (max - min) / n, p = Math.pow(10, Math.floor(Math.log10(pas))), f = pas / p;
    pas = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
    var d = Math.floor(min / pas) * pas, t = [];
    for (var v = d; v <= max + pas * 0.001; v += pas) t.push(cs(v, 10));
    return { t: t, pas: pas };
  }
  function graphique(o) { // o: {xs, ys, xlab, ylab, droite:{a,b}}
    var W = 600, H = 340, g = 58, dr = 18, h = 16, b = 46;
    var xmin = Math.min(0, Math.min.apply(null, o.xs)), xmax = Math.max.apply(null, o.xs);
    var ymin = Math.min.apply(null, o.ys), ymax = Math.max.apply(null, o.ys);
    if (ymin > 0 && ymin < 0.5 * ymax) ymin = 0;
    var m = (ymax - ymin) * 0.08 || 1; ymin -= (ymin === 0 ? 0 : m); ymax += m;
    var gx = graduations(xmin, xmax, 8), gy = graduations(ymin, ymax, 6);
    function fmt(v, pas) { var d = Math.max(0, -Math.floor(Math.log10(pas) + 1e-9)); return (Math.abs(v) < pas / 1e6 ? 0 : v).toFixed(d).replace('.', ','); }
    xmin = gx.t[0]; xmax = gx.t[gx.t.length - 1]; ymin = gy.t[0]; ymax = Math.max(gy.t[gy.t.length - 1], ymax);
    function X(v) { return g + (v - xmin) / (xmax - xmin) * (W - g - dr); }
    function Y(v) { return H - b - (v - ymin) / (ymax - ymin) * (H - b - h); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="exo-svg" role="img" aria-label="' + o.ylab.replace(/<[^>]+>/g, '') + ' en fonction de t">';
    gy.t.forEach(function (v) { if (v < ymin - 1e-12 || v > ymax + 1e-12) return; s += '<line x1="' + g + '" x2="' + (W - dr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="grille"/><text x="' + (g - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + nb(v, 3).replace(/<\/?sup>/g, '') + '</text>'; });
    gx.t.forEach(function (v) { s += '<line y1="' + h + '" y2="' + (H - b) + '" x1="' + X(v) + '" x2="' + X(v) + '" class="grille"/><text x="' + X(v) + '" y="' + (H - b + 16) + '" text-anchor="middle">' + fmt(v, gx.pas) + '</text>'; });
    s += '<line x1="' + g + '" x2="' + (W - dr) + '" y1="' + (H - b) + '" y2="' + (H - b) + '" class="axe"/><line x1="' + g + '" x2="' + g + '" y1="' + h + '" y2="' + (H - b) + '" class="axe"/>';
    if (o.droite) { var a = o.droite.a, c = o.droite.b; s += '<line x1="' + X(xmin) + '" y1="' + Y(a * xmin + c) + '" x2="' + X(xmax) + '" y2="' + Y(a * xmax + c) + '" class="droite"/>'; }
    for (var i = 0; i < o.xs.length; i++) s += '<circle cx="' + X(o.xs[i]) + '" cy="' + Y(o.ys[i]) + '" r="4.5" class="point"/>';
    s += '<text x="' + ((W + g) / 2) + '" y="' + (H - 6) + '" text-anchor="middle" class="lab">' + o.xlab + '</text>';
    s += '<text x="' + (g + 6) + '" y="' + (h + 12) + '" class="lab">' + o.ylab + '</text></svg>';
    return s;
  }

  /* ---------- déroulé d'une série ---------- */
  /* élision automatique : « de éthanol » → « d’éthanol », « le acide » → « l’acide » (hors « -le avec ») */
  function elider(t) {
    if (typeof t !== 'string') return t;
    return t.replace(/(^|[\s>(])(de|De|le|Le|la|La) ([aeéèêiîoôuAEÉÈÊIÎOÔU])/g, function (m, a, w, v) {
      if (/^[A-Z]/.test(v) && !/^[ÉÈÊÎÔ]/.test(v) && !/^[AEIOU][a-zé]/.test(v + '')) return m;
      return a + (w.charAt(0) === 'D' ? 'D’' : w.charAt(0) === 'd' ? 'd’' : w.charAt(0) === 'L' ? 'L’' : 'l’') + v;
    });
  }
  var HMUET = /(^|[\s>(])(de|De|le|Le|la|La) (h(?:uile|exan|eptan|ydrog|ydrox|élium|ydrat|ydrocarbure|alog|ématite|umidité))/g;
  function elider2(t) { if (typeof t !== 'string') return t; return elider(t).replace(HMUET, function (m, a, w, v) { return a + (w.charAt(0) === 'D' ? 'D’' : w.charAt(0) === 'd' ? 'd’' : w.charAt(0) === 'L' ? 'L’' : 'l’') + v; }); }
  /* écriture chimique : « SO4^2- » → SO<sub>4</sub><sup>2−</sup> */
  function ch(t) {
    return t.split(/(<[^>]+>)/).map(function (x) {
      if (x.charAt(0) === '<') return x;
      return x.replace(/\^(\d*[+-])/g, function (m, c) { return '\u0001' + c.replace('-', '−') + '\u0002'; })
        .replace(/_([a-z0-9]+)/g, '<sub>$1</sub>').replace(/\]n\b/g, ']<sub>n</sub>').replace(/([A-Za-z\)\]])(\d+)/g, '$1<sub>$2</sub>').replace(/\u0001/g, '<sup>').replace(/\u0002/g, '</sup>');
    }).join('');
  }
  /* flèche avec conditions : « ⟶[HF] », « ⇄[H^+|Δ] » (au-dessus | au-dessous) */
  function fleches(t) {
    if (typeof t !== 'string' || !/(⟶|→|⇄)\[/.test(t)) return t;
    return t.replace(/(⟶|→|⇄)\[([^\]\[]*(?:\[[^\]]*\][^\]\[]*)*)\]/g, function (m, f, c) {
      var p = c.split('|');
      return '<span class="fl-c"><span class="fl-h">' + (p[0] || '&nbsp;') + '</span><span class="fl-a' + (f === '⇄' ? ' fl-eq' : '') + '" aria-label="' + (f === '⇄' ? 'équilibre' : 'donne') + '"></span><span class="fl-b">' + (p[1] || '&nbsp;') + '</span></span>';
    });
  }
  /* équations à afficher automatiquement : [expression régulière sur le texte, équation] */
  var eqs = [];
  function sansBalise(t) { return String(t || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' '); }
  function ajouterEq(t) {
    if (!t || /⟶|→|⇄|exo-eq-chimique/.test(t)) return t;
    var txt = sansBalise(t), aj = '';
    eqs.forEach(function (e) { if (e[0].test(txt) && aj.indexOf(e[1]) < 0) aj += '<p class="exo-eq-chimique">' + fleches(ch(e[1])) + '</p>'; });
    return t + aj;
  }

  /* ---------- corrections structurées : blocs « Calcul » (bleu) et « Exploitation » / « Raisonnement » (vert) ---------- */
  var MAJ = /^(\s+)(?=[A-ZÀ-ÖØ-ÞΑ-Ω«(<0-9−–\-ΔτσηξλμρΦφθ𝑤])/;
  function decouper(h, pointVirgule) { // phrases, coupées au niveau 0 des balises
    var out = [], cur = '', prof = 0, i = 0;
    while (i < h.length) {
      if (h.charAt(i) === '<') {
        var j = h.indexOf('>', i); if (j < 0) j = h.length - 1;
        var tag = h.slice(i, j + 1);
        if (/^<br\s*\/?>$/i.test(tag) && prof === 0) { if (cur.trim()) out.push(cur.trim()); cur = ''; i = j + 1; continue; }
        if (/^<\//.test(tag)) prof = Math.max(0, prof - 1); else if (!/\/>$/.test(tag) && !/^<(br|img|hr|input)\b/i.test(tag)) prof++;
        cur += tag; i = j + 1; continue;
      }
      var c = h.charAt(i); cur += c; i++;
      if (prof > 0) continue;
      if (c === '.' || c === '!' || c === '?') {
        var m = MAJ.exec(h.slice(i));
        if (m && !/\b(env|cf|ex|éq|etc)\.$/.test(cur)) { out.push(cur.trim()); cur = ''; i += m[1].length; }
      } else if (pointVirgule && c === ';' && /^\s/.test(h.slice(i))) { out.push(cur.trim()); cur = ''; i++; }
      else if (pointVirgule && c === ',' && /^\s+donc\s/.test(h.slice(i)) && /[=≈]/.test(cur.replace(/<[^>]+>/g, ''))) { out.push(cur.trim().replace(/,$/, '')); cur = ''; i++; }
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  /* conversion écrite en égalité (« 1,72 × 10⁵ W = 172 kW ») → « 1,72 × 10⁵ W, soit 172 kW » */
  var U1 = '[kmµMG]?(?:W|J|g|L|s|Pa|bar|mol|t|h|min|°C|K|m)(?:<sup>-?\\d</sup>)?', UN = '(?:' + U1 + '(?:[.·/]' + U1 + ')*)';
  var NB = '(?:<b>)?(?:[−-])?\\d[\\d,]*(?:\\s×\\s10<sup>[−-]?\\d+</sup>)?\\s+';
  var CONV = new RegExp('(=\\s)(' + NB + ')(' + UN + ')\\s=\\s(' + NB + ')(' + UN + ')(?![\\w])', 'g');
  function soit(l) { return l.replace(CONV, function (m, e, a, u, b, v) { return u === v ? m : e + a + u + ', soit ' + b + v; }); }
  function txt(t) { return t.replace(/<[^>]+>/g, ''); }
  function estCalcul(t) { t = txt(t); return /[=≈]/.test(t) && !/^(Vérification|Remarque)/.test(t); }
  function structurer(h, type) {
    if (typeof h !== 'string' || !h || /class="cc"/.test(h)) return h;
    if (/<(p|div|table|ul|ol|svg|figure)\b/i.test(h)) return '<div class="cc"><div class="cc-use"><span class="cc-t">' + (type === 'nombre' ? 'Correction' : 'Raisonnement') + '</span>' + h + '</div></div>';
    var ph = decouper(h, type === 'nombre').map(function (l) { return l.replace(/\s*;$/, ''); }), lignes = [];
    if (ph.length) ph[0] = ph[0].replace(/^([a-zàâéèêîôûç])/, function (x) { return x.toUpperCase(); });
    ph = ph.map(soit);
    if (!ph.length) return h;
    if (type !== 'nombre') return '<div class="cc"><div class="cc-use"><span class="cc-t">Raisonnement</span>' + ph.map(function (l) { return '<div class="cc-l">' + l + '</div>'; }).join('') + '</div></div>';
    ph.forEach(function (p) { // « calcul : conclusion » → deux lignes
      var k = p.lastIndexOf(' : ');
      if (k > 0 && estCalcul(p.slice(0, k)) && !/[=≈\d]/.test(txt(p.slice(k + 3)))) { lignes.push({ t: 'c', l: p.slice(0, k) }); lignes.push({ t: 'u', l: p.slice(k + 3).replace(/^./, function (x) { return x.toUpperCase(); }) }); }
      else lignes.push({ t: estCalcul(p) ? 'c' : 'u', l: p });
    });
    if (!lignes.some(function (x) { return x.t === 'c'; })) lignes.forEach(function (x) { x.t = 'r'; });
    var blocs = [];
    lignes.forEach(function (x) { if (blocs.length && blocs[blocs.length - 1].t === x.t) blocs[blocs.length - 1].l.push(x.l); else blocs.push({ t: x.t, l: [x.l] }); });
    var nom = { c: 'Calcul', u: 'Exploitation', r: 'Raisonnement' };
    return '<div class="cc">' + blocs.map(function (b) { return '<div class="' + (b.t === 'c' ? 'cc-calc' : 'cc-use') + '"><span class="cc-t">' + nom[b.t] + '</span>' + b.l.map(function (l) { return '<div class="cc-l">' + l + '</div>'; }).join('') + '</div>'; }).join('') + '</div>';
  }

  /* ---------- noms des espèces sous les formules, dans les équations (.exo-eq-chimique) ---------- */
  var NOMS = {"H2O": "eau", "H3O^+": "ion oxonium", "HO^-": "ion hydroxyde", "H^+": "ion hydrogène", "Cl^-": "ion chlorure", "Br^-": "ion bromure", "I^-": "ion iodure", "CN^-": "ion cyanure", "Na^+": "ion sodium", "HCN": "cyanure d’hydrogène", "HBr": "bromure d’hydrogène", "H-Br": "bromure d’hydrogène", "HCl": "chlorure d’hydrogène", "H-Cl": "chlorure d’hydrogène", "HF": "fluorure d’hydrogène", "Br2": "dibrome", "Cl2": "dichlore", "I2": "diiode", "H2": "dihydrogène", "O2": "dioxygène", "N2": "diazote", "CO": "monoxyde de carbone", "CO2": "dioxyde de carbone", "NO": "monoxyde d’azote", "NO2": "dioxyde d’azote", "N2O5": "pentaoxyde de diazote", "SO2": "dioxyde de soufre", "SO3": "trioxyde de soufre", "NH3": "ammoniac", "NH4^+": "ion ammonium", "H2O2": "peroxyde d’hydrogène", "HNO3": "acide nitrique", "H2SO4": "acide sulfurique", "MnO4^-": "ion permanganate", "Mn^2+": "ion manganèse(II)", "MnO2": "dioxyde de manganèse", "H2C2O4": "acide oxalique", "S2O8^2-": "ion peroxodisulfate", "SO4^2-": "ion sulfate", "HPO4^2-": "ion hydrogénophosphate", "NaBr": "bromure de sodium", "NaCl": "chlorure de sodium", "NaOH": "hydroxyde de sodium", "NH2OH": "hydroxylamine", "C2H5ONa": "éthanolate de sodium", "MgBr^+": "ion bromomagnésium", "ATP": "adénosine triphosphate", "ADP": "adénosine diphosphate", "CH4": "méthane", "CH3-CH3": "éthane", "CH3-CH2-CH3": "propane", "CH3-CH2-CH2-CH3": "butane", "CH2=CH2": "éthène", "CH2=CH-CH3": "propène", "CH3-CH=CH2": "propène", "CH3-CH=CH-CH3": "but-2-ène", "(E)-CH3-CH=CH-CH3": "(E)-but-2-ène", "(Z)-CH3-CH=CH-CH3": "(Z)-but-2-ène", "CH3-CH2-CH=CH2": "but-1-ène", "(CH3)2C=CH2": "2-méthylpropène", "(CH3)2C=CH-CH3": "2-méthylbut-2-ène", "CH3-CH2-CH2-CH=CH2": "pent-1-ène", "C6H6": "benzène", "C6H5-CH3": "méthylbenzène (toluène)", "C6H10": "cyclohexène", "C10H14": "isobutylbenzène", "(CH3)3C-Cl": "2-chloro-2-méthylpropane", "CH2=CH-CH2Br": "3-bromopropène", "CH2Br-CH2-CH3": "1-bromopropane", "CH3-CH2-CH2Br": "1-bromopropane", "CH3CH2CH2Br": "1-bromopropane", "C3H7Br": "1-bromopropane", "CH2Br-CH2Br": "1,2-dibromoéthane", "CH2Br-CHBr-CH3": "1,2-dibromopropane", "CH2Cl-CH2Cl": "1,2-dichloroéthane", "CH2Cl-CHCl-CH3": "1,2-dichloropropane", "CH3-CH2-Br": "bromoéthane", "CH3-CH2Br": "bromoéthane", "CH3-CH2-Cl": "chloroéthane", "CH3-CH2Cl": "chloroéthane", "CH3-CH2-CHBr-CH3": "2-bromobutane", "CH3-CH2-CHCl-CH3": "2-chlorobutane", "CH3-CHBr-CH3": "2-bromopropane", "CH3-CHCl-CH3": "2-chloropropane", "CH3-CHBr-CHBr-CH3": "2,3-dibromobutane", "CH3-CHCl-CHCl-CH3": "2,3-dichlorobutane", "CH3-Br": "bromométhane", "CH3-Cl": "chlorométhane", "CH3-I": "iodométhane", "C6H5-Br": "bromobenzène", "Ph-Br": "bromobenzène", "CH2=CHCl": "chloroéthène", "CH3-OH": "méthanol", "HO-CH3": "méthanol", "CH3OH": "méthanol", "CH3-CH2-OH": "éthanol", "C2H5-OH": "éthanol", "C2H5OH": "éthanol", "CH3-CH2-CH2-CH2-CH2-OH": "pentan-1-ol", "(CH3)3C-OH": "2-méthylpropan-2-ol", "C4H9OH": "butan-1-ol", "C5H11OH": "pentan-1-ol", "CH3-CHO": "éthanal", "H2C=O": "méthanal", "CH3-CO-CH3": "propanone", "(CH3)2C=O": "propanone", "CH3-COOH": "acide éthanoïque", "CH3COOH": "acide éthanoïque", "C2H4O2": "acide éthanoïque", "CH3-COO^-": "ion éthanoate", "CH3COO^-": "ion éthanoate", "CH3-CO-O-C2H5": "éthanoate d’éthyle", "CH3-COO-C2H5": "éthanoate d’éthyle", "CH3COOC2H5": "éthanoate d’éthyle", "CH3COOC4H9": "éthanoate de butyle", "CH3COOC5H11": "éthanoate de pentyle", "CH3-CH2-O^-": "ion éthanolate", "CH3-CH2-CN": "propanenitrile", "CH3-NH2": "méthanamine", "(CH3)2C(OH)-CN": "acétone-cyanhydrine", "C6H5-CHO": "benzaldéhyde", "O2N-C6H4-CH3": "nitrotoluène", "CH3-C6H4-OH": "4-méthylphénol", "C7H8O": "4-méthylphénol", "CH3-C6H4-O-CH2CH2CH3": "1-méthyl-4-propoxybenzène", "C10H14O": "1-méthyl-4-propoxybenzène", "C6H12O6": "glucose", "C6H11-OH": "cyclohexanol", "CH3-CO-CH2-COOCH3": "acétoacétate de méthyle", "CH3-CH(OH)-CH2-COOCH3": "3-hydroxybutanoate de méthyle", "C4H6O3": "anhydride éthanoïque", "C12H16O": "4-isobutylacétophénone", "C12H18O": "1-(4-isobutylphényl)éthanol", "C13H18O2": "ibuprofène", "C4H7ClO2": "chloroéthanoate d’éthyle", "C16H22O3": "ester glycidique", "C13H18O": "2-(4-isobutylphényl)propanal", "C13H19NO": "oxime", "C13H17N": "nitrile", "(CH3)2C=OH^+": "propanone protonée", "(CH3)2C(OH)-OH^+-CH3": "hémiacétal protoné", "(CH3)2C(OH)-O-CH3": "hémiacétal", "(CH3)2C(OH)-OH^+-C2H5": "hémiacétal protoné", "(CH3)2C(OH)-O-C2H5": "hémiacétal", "(CH3)2C(OH2^+)-O-C2H5": "hémiacétal protoné sur OH", "(CH3)2C^+-O-C2H5": "ion oxocarbénium", "(CH3)2C(O-C2H5)-OH^+-C2H5": "acétal protoné", "(CH3)2C(O-C2H5)2": "2,2-diéthoxypropane (acétal)", "C6H11-OH2^+": "ion cyclohexyloxonium", "C6H11^+": "carbocation cyclohexyle", "CH3-C^+H-CH3": "carbocation propan-2-yle", "CH3-C^+H-CH(CH3)2": "carbocation 3-méthylbutan-2-yle", "CH3-CH2-C^+(CH3)2": "carbocation 2-méthylbutan-2-yle", "(CH3)2C(CN)-O^-": "ion alcoolate", "(CH3)2C(O^-)-NH2^+-CH3": "zwitterion d’addition", "CH3-MgBr": "bromure de méthylmagnésium", "CH2=CH-CH2-MgBr": "bromure d’allylmagnésium", "C6H5-CH(O-MgBr)-CH2-CH=CH2": "alcoolate magnésien", "B^-": "base", "BH": "acide conjugué de la base", "Cl3C-C≡N": "trichloroacétonitrile", "CH3-CH2-O-C(CCl3)=N^-": "anion imidate", "CH3-CH2-O-C(CCl3)=NH": "trichloroacétimidate d’éthyle", "R-OH": "alcool", "R-O^-": "ion alcoolate", "R-OH2^+": "alcool protoné", "R'-Br": "bromoalcane", "R-O-R'": "étheroxyde", "R-CH=CH2": "alcène", "CH2=CH-R": "alcène", "CH2=CHR": "alcène", "R-CH2-CH3": "alcane", "CH3-CH2R": "alcane", "R-CH=CH-R'": "alcène", "R-CH(OH)-CH(OH)-R'": "diol", "R-C(CH3)=C(CH3)-R'": "alcène", "R-CH(CH3)-CH(CH3)-R'": "alcane", "R-COOH": "acide carboxylique", "R-CO3H": "peracide", "R-NH2": "amine", "R-NH-CO-O-CH2-C6H5": "amine protégée (groupe Cbz)", "Fmoc-NH-R": "amine protégée (groupe Fmoc)", "HO-CH2-CH(OH)-R": "diol", "HO-CH2-R-CH(OH)-R'": "diol", "TBDMS-Cl": "chlorure de tert-butyldiméthylsilyle", "TBDMS-O-CH2-R-CH(OH)-R'": "alcool primaire protégé", "(CH3)3Si-Cl": "chlorure de triméthylsilyle", "R-CO-R'-COOEt": "céto-ester", "R-CO-R'-C(OH)Ph2": "céto-alcool", "R1-CH(NH2)-COOH": "acide α-aminé", "H2N-CH(R2)-COOH": "acide α-aminé", "R1-CH(NH2)-CO-NH-CH(R2)-COOH": "dipeptide", "CH3-CO-O-R": "ester (donneur d’acyle)", "CH3-CO-O-(-)-menthyle": "éthanoate de (−)-menthyle", "-CH2-CH2-": "chaîne saturée", "C6H5-CH=CH-R": "alcène (produit de couplage)", "Ph-CH=CHR": "alcène (produit de couplage)", "Ph3P=CH-R": "ylure de phosphore", "Ph3P=O": "oxyde de triphénylphosphine", "PPh3": "triphénylphosphine", "Ar-CH=C(NHCOCH3)-COOH": "précurseur de la L-DOPA", "Ar-CH2-CH(NHCOCH3)-COOH": "L-DOPA protégée", "Ar-C(=CH2)-COOH": "précurseur du naproxène", "Ar-CH(CH3)-COOH": "naproxène", "LnM": "complexe métallique", "[LnM-Cl]": "complexe chloré", "[LnM(CH2=CHR)]^+": "complexe π de l’alcène", "LnM-CH2-CH2R": "complexe alkyle", "LnM(H)(CH2=CHR)": "complexe hydrure-alcène", "LnM(H)(CH2-CH2R)": "complexe hydrure-alkyle", "LnM(CO)-CH3": "complexe méthyle-carbonyle", "LnM-CO-CH3": "complexe acyle", "Pd(PPh3)2": "complexe du palladium(0)", "PhPdBr(PPh3)2": "complexe du palladium(II)", "L2Pd(Ph)(CH=CHR)": "complexe du palladium(II)", "PdL2": "complexe du palladium(0)", "[RhCl(PPh3)3]": "catalyseur de Wilkinson", "[RhCl(PPh3)2]": "complexe du rhodium"};   // clé : formule normalisée → nom
  var COMS = { 'Leu': 'leucine (Leu)', 'Gly': 'glycine (Gly)', 'Leu-Gly': 'dipeptide Leu-Gly' };
  var inconnus = {};
  function cle(h) { return h.replace(/<sub>(.*?)<\/sub>/g, '$1').replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(/′/g, "'"); }
  var ROLE = /majoritaire|minoritaire|intermédiaire|non transformé|catalyseur|les deux|arrivent|coloré/;
  function espece(tok) {
    var t = tok.trim(); if (!t || t === '?') return tok;
    var m = /^((?:\d+(?:\/\d+)?|½|n)\s+)(.+)$/.exec(t), coef = '', f = t;
    if (m && !/^\d+[.,]/.test(t)) { coef = m[1]; f = m[2]; }
    var com = '', mc = /^(.*?)\s+\(([^()]*(?:\([^()]*\)[^()]*)*)\)$/.exec(f);
    if (mc && !/^(g|l|s|aq)$/.test(mc[2])) { f = mc[1]; com = mc[2]; }
    var brut = f.replace(/<[^>]+>/g, '');
    var formule = /<su[bp]>/.test(f) || (/^[A-Z(\[]/.test(brut) && /[0-9–\-=≡]/.test(brut) && !/[a-zé]{4,}/.test(brut.replace(/(Cl|Br|Mg|Na|Ph|Pd|Rh|Ru|Ni|Pt|Si|OAc|COD|PPh|BINAP|DiPAMP|TBDMS|Fmoc|Leu|Gly)/g, '')));
    if (!formule && brut.length > 1 && /^(?:[A-Z][a-z]?\d*)+$/.test(brut)) formule = true;
    if (!formule) return tok;
    var nom = NOMS[cle(f).replace(/\((g|l|s|aq)\)$/, '')];
    if (com && !ROLE.test(com)) { nom = COMS[com] || com; com = ''; }
    if (!nom) { inconnus[cle(f)] = (inconnus[cle(f)] || 0) + 1; return tok; }
    return '<span class="esp-g">' + coef + '<span class="esp"><span class="esp-f">' + f + '</span><span class="esp-n">' + nom + '</span></span></span>' + (com ? ' (' + com + ')' : '');
  }
  function ligneEq(l) {
    var pre = '', mp = /^((?:<b>)?(?:Étape \d+|Bilan|Exemple|Voie enzymatique|Voie chimique|Transformation souhaitée|Formation d’une liaison peptidique)\s*:\s*(?:<\/b>\s*)?|\(\d\)\s*|\d\.\s+)/.exec(l);
    if (mp) { pre = mp[1]; l = l.slice(pre.length); }
    var suf = '', ks = l.indexOf(' ; '); if (ks >= 0) { suf = l.slice(ks); l = l.slice(0, ks); }
    var mv = /,\s+[a-zàâéèêîôûç][^<>]*$/.exec(l); if (mv) { suf = mv[0] + suf; l = l.slice(0, mv.index); }
    var morceaux = [], cur = '', prof = 0, i = 0;
    while (i < l.length) {
      if (l.substr(i, 18) === '<span class="fl-c"' && prof === 0) { // flèche avec conditions : bloc entier
        var j = i, d = 0;
        do { var o = l.indexOf('<span', j + 1), c = l.indexOf('</span>', j + 1); if (o >= 0 && o < c) { d++; j = o; } else { d--; j = c; } } while (d >= 0 && j >= 0);
        morceaux.push({ e: cur }); cur = ''; morceaux.push({ s: l.slice(i, j + 7) }); i = j + 7; continue;
      }
      var ma = /^<span[^>]*>\s*([→⟶⇄])\s*<\/span>/.exec(l.slice(i));
      if (ma && prof === 0) { morceaux.push({ e: cur }); morceaux.push({ s: ma[0] }); cur = ''; i += ma[0].length; continue; }
      if (l.charAt(i) === '<') { var k = l.indexOf('>', i); var tg = l.slice(i, k + 1); if (/^<\//.test(tg)) prof--; else if (!/\/>$/.test(tg)) prof++; cur += tg; i = k + 1; continue; }
      var sep = /^(\s+\+\s+|\s*[→⟶⇄]\s*)/.exec(l.slice(i));
      if (sep && prof === 0) { morceaux.push({ e: cur }); morceaux.push({ s: sep[1] }); cur = ''; i += sep[1].length; continue; }
      cur += l.charAt(i); i++;
    }
    morceaux.push({ e: cur });
    return pre + morceaux.map(function (m) { return m.s !== undefined ? m.s : m.e.replace(/^(\s*)(.*?)(\s*)$/, function (x, a, b, c) { return a + espece(b) + c; }); }).join('') + suf;
  }
  function nommer(h) {
    if (typeof h !== 'string' || h.indexOf('exo-eq-chimique') < 0) return h;
    return h.replace(/(<p class="exo-eq-chimique[^"]*")([^>]*>)([\s\S]*?)(<\/p>)/g, function (m, a, b, inner, fin) {
      if (/class="esp"/.test(inner) || !/fl-c|[→⟶⇄]/.test(inner)) return m;
      var res = inner.split(/(<br\s*\/?>)/).map(function (l) { return /^<br/.test(l) || !/fl-c|[→⟶⇄]/.test(l) ? l : ligneEq(l); }).join('');
      return a.replace(/"$/, ' noms"') + b + res + fin;
    });
  }
  function nettoyer(ex) { var elider = function (t) { return fleches(elider2(t)); };
    ex.contexte = nommer(elider(ajouterEq(ex.contexte)));
    ex.etapes.forEach(function (e) {
      e.q = nommer(elider(/exo-eq-chimique|⟶|→|⇄/.test(ex.contexte) && eqs.some(function (x) { return x[0].test(sansBalise(ex.contexte)); }) ? e.q : ajouterEq(e.q))); e.corr = structurer(elider(e.corr), e.type);
      (e.options || []).forEach(function (o) { o.t = elider(o.t); o.pourquoi = elider(o.pourquoi); });
      (e.pieges || []).forEach(function (p) { p.msg = elider(p.msg); });
    });
    return ex;
  }
  /* équations sur une seule ligne : on réduit la taille du texte jusqu’à ce qu’elle tienne (sinon défilement horizontal) */
  function ajuster(zone) {
    (zone || document).querySelectorAll('.exo-eq-chimique').forEach(function (e) {
      if (!e.offsetWidth) return;
      if (e.dataset.ta === undefined) e.dataset.ta = e.style.textAlign || '';
      e.style.whiteSpace = 'nowrap'; e.style.fontSize = ''; e.style.textAlign = e.dataset.ta;
      var t = parseFloat(getComputedStyle(e).fontSize), min = 12;
      while (e.scrollWidth > e.clientWidth + 1 && t > min) { t -= 0.5; e.style.fontSize = t + 'px'; }
      e.classList.toggle('defile', e.scrollWidth > e.clientWidth + 1);
      if (e.scrollWidth > e.clientWidth + 1) e.scrollLeft = 0;
    });
  }
  var minuteur = null;
  window.addEventListener('resize', function () { clearTimeout(minuteur); minuteur = setTimeout(function () { ajuster(); }, 150); });
  /* ---------- aides : coup de pouce et renvoi au cours, déclarés par chaque page avec Exo.aides() ---------- */
  var AIDES = { pdf: '', regles: [] };
  function aides(pdf, regles) { AIDES.pdf = pdf || AIDES.pdf; AIDES.regles = AIDES.regles.concat(regles || []); }
  function trouverAide(id, et) {
    if (et.aide) return et.aide;
    var t = sansBalise(et.q);
    for (var k = 0; k < AIDES.regles.length; k++) { var r = AIDES.regles[k]; if ((!r.ex || r.ex === id) && r.q.test(t)) return r; }
    return null;
  }
  function blocAide(a) {
    if (!a) return '';
    var h = '<div class="exo-aides">';
    if (a.i) h += '<details class="exo-indice"><summary>Coup de pouce</summary><div>' + fleches(elider2(a.i)) + '</div></details>';
    if (a.c) h += '<details class="exo-cours"><summary>Voir le cours</summary><div>' + a.c.t + (AIDES.pdf && a.c.p ? '<br><a href="#" data-enc="' + AIDES.pdf + '.enc" data-page="' + a.c.p + '">Ouvrir le cours à cette page</a>' : '') + '</div></details>';
    return h + '</div>';
  }
  var gens = {};
  function lancer(id, generer0) {
    var generer = function () { return nettoyer(generer0()); };
    gens[id] = generer;
    var racine = document.getElementById(id), score = { ok: 0, tot: 0 };
    function nouvelle() {
      var ex = generer(); score = { ok: 0, tot: 0 };
      racine.innerHTML = '<div class="exo-contexte">' + ex.contexte + '</div><ol class="exo-etapes"></ol><div class="exo-fin" hidden></div>';
      var liste = racine.querySelector('.exo-etapes');
      ex.etapes.forEach(function (et, i) {
        var li = document.createElement('li'); li.className = 'exo-etape';
        if (i > 0) li.hidden = true;
        var h = '<p class="exo-q">' + et.q + '</p>';
        if (et.type === 'choix') {
          h += '<div class="exo-options">';
          et._aff = melanger(et.options);
          et._aff.forEach(function (op, j) {
            h += '<label class="exo-option"><input type="radio" name="' + id + '-q' + i + '" value="' + j + '"> <span>' + op.t + '</span></label>';
          });
          h += '</div>';
        } else if (et.type === 'clic') {
          h += '<div class="exo-clic">' + et.svg + '</div><p class="exo-aide">Clique sur le schéma pour sélectionner (clique à nouveau pour désélectionner), puis valide.</p>';
        } else {
          h += '<div class="exo-saisie"><input type="text" inputmode="decimal" autocomplete="off" placeholder="valeur" aria-label="Réponse"> <span class="exo-unite">' + (et.unite || '') + '</span></div>';
        }
        h += blocAide(trouverAide(id, et)) + '<button type="button" class="bouton exo-valider">Valider</button><div class="exo-retour" aria-live="polite"></div>';
        li.innerHTML = h;
        liste.appendChild(li);
        li.querySelector('.exo-valider').addEventListener('click', function () { valider(li, et, i, ex); });
        li.querySelectorAll('.exo-clic .zone').forEach(function (z) {
          z.setAttribute('tabindex', '0'); z.setAttribute('role', 'button');
          function bascule() { if (!li.classList.contains('fait')) z.classList.toggle('sel'); }
          z.addEventListener('click', bascule);
          z.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bascule(); } });
        });
        var inp = li.querySelector('input[type=text]');
        if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') valider(li, et, i, ex); });
      });
      if (ex.apres) ex.apres(racine);
      ajuster(racine);
    }
    function valider(li, et, i, ex) {
      var retour = li.querySelector('.exo-retour'), ok = false, msg = '';
      if (et.type === 'choix') {
        var c = li.querySelector('input[type=radio]:checked');
        if (!c) { retour.className = 'exo-retour attention'; retour.innerHTML = 'Choisissez une réponse.'; return; }
        var op = et._aff[+c.value]; ok = op.ok;
        msg = ok ? '' : (op.pourquoi || '');
        li.querySelectorAll('.exo-option').forEach(function (lab, k) { if (et._aff[k].ok) lab.classList.add('juste'); else if (k === +c.value) lab.classList.add('faux'); });
        li.querySelectorAll('input[type=radio]').forEach(function (r) { r.disabled = true; });
      } else if (et.type === 'clic') {
        var zs = li.querySelectorAll('.exo-clic .zone'), choisis = [];
        zs.forEach(function (z) { if (z.classList.contains('sel') && choisis.indexOf(z.dataset.z) < 0) choisis.push(z.dataset.z); });
        if (!choisis.length) { retour.className = 'exo-retour attention'; retour.innerHTML = 'Clique sur au moins un élément du schéma.'; return; }
        var trop = choisis.filter(function (c) { return et.cibles.indexOf(c) < 0; }), manque = et.cibles.filter(function (c) { return choisis.indexOf(c) < 0; });
        ok = !trop.length && !manque.length;
        function nm(t) { return t.map(function (c) { return (et.noms && et.noms[c]) || c; }).join(', '); }
        if (!ok) msg = (trop.length ? 'En trop : ' + nm(trop) + '. ' : '') + (manque.length ? 'Oublié : ' + nm(manque) + '.' : '');
        zs.forEach(function (z) { var c = z.dataset.z; z.classList.remove('sel'); if (et.cibles.indexOf(c) >= 0) z.classList.add(choisis.indexOf(c) >= 0 ? 'juste' : 'manque'); else if (choisis.indexOf(c) >= 0) z.classList.add('faux'); });
        li.classList.add('fait');
      } else {
        var inp = li.querySelector('input[type=text]'), v = lire(inp.value);
        if (isNaN(v)) { retour.className = 'exo-retour attention'; retour.innerHTML = 'Entrez un nombre (virgule acceptée ; puissances de 10 : 1,2e-3).'; return; }
        ok = proche(v, et.rep, et.tol || 0.03);
        if (!ok) {
          (et.pieges || []).some(function (p) { if (proche(p.v, et.rep, 2 * (et.tol || 0.03))) return false; if (proche(v, p.v, et.tol || 0.03)) { msg = p.msg; return true; } });
          if (!msg && proche(v, -et.rep, et.tol || 0.03)) msg = 'Erreur de signe.';
          if (!msg) [1e3, 1e-3, 60, 1 / 60, 3600, 1 / 3600].some(function (f) { if (proche(v, et.rep * f, et.tol || 0.03)) { msg = 'L’ordre de grandeur est faux : vérifiez les unités et les conversions.'; return true; } });
        }
        inp.disabled = true; inp.classList.add(ok ? 'juste' : 'faux');
      }
      score.tot++; if (ok) score.ok++;
      li.querySelector('.exo-valider').remove();
      retour.className = 'exo-retour ' + (ok ? 'bien' : 'mal');
      retour.innerHTML = (ok ? '<b>Exact.</b> ' : '<b>Pas tout à fait.</b> ' + (msg ? '<span class="exo-piege">' + msg + '</span> ' : '')) + '<div class="exo-corr">' + et.corr + '</div>';
      var suiv = li.nextElementSibling;
      if (suiv) { suiv.hidden = false; }
      ajuster(li); if (suiv) ajuster(suiv);
      else {
        var fin = racine.querySelector('.exo-fin'); fin.hidden = false;
        fin.innerHTML = '<p class="exo-score">Score : <b>' + score.ok + ' / ' + score.tot + '</b></p><button type="button" class="bouton exo-nouveau">Nouvel exercice (nouvelles valeurs)</button>';
        fin.querySelector('.exo-nouveau').addEventListener('click', function () { nouvelle(); racine.scrollIntoView({ behavior: 'smooth' }); });
      }
    }
    nouvelle();
    var b = document.querySelector('[data-nouveau="' + id + '"]');
    if (b) b.addEventListener('click', nouvelle);
  }
  return { aides: aides, inconnus: inconnus, NOMS: NOMS, structurer: structurer, ajuster: ajuster, eqs: eqs, ch: ch, fleches: fleches, gens: gens, alea: alea, choisir: choisir, melanger: melanger, cs: cs, nb: nb, lire: lire, regression: regression, graphique: graphique, lancer: lancer };
})();
