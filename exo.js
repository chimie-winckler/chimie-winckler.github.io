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
  function nettoyer(ex) { var elider = function (t) { return fleches(elider2(t)); };
    ex.contexte = elider(ajouterEq(ex.contexte));
    ex.etapes.forEach(function (e) {
      e.q = elider(/exo-eq-chimique|⟶|→|⇄/.test(ex.contexte) && eqs.some(function (x) { return x[0].test(sansBalise(ex.contexte)); }) ? e.q : ajouterEq(e.q)); e.corr = structurer(elider(e.corr), e.type);
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
        h += '<button type="button" class="bouton exo-valider">Valider</button><div class="exo-retour" aria-live="polite"></div>';
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
  return { structurer: structurer, ajuster: ajuster, eqs: eqs, ch: ch, fleches: fleches, gens: gens, alea: alea, choisir: choisir, melanger: melanger, cs: cs, nb: nb, lire: lire, regression: regression, graphique: graphique, lancer: lancer };
})();
