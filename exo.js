/* ===== Moteur des exercices d'entraînement (S'entraîner) =====
   Chaque exercice fournit une fonction generer() qui renvoie
   { contexte: html, etapes: [ ... ] }.
   Étape « choix »  : { type:'choix', q, options:[{t, ok, pourquoi}], corr }
   Étape « nombre » : { type:'nombre', q, rep, unite, tol, pieges:[{v, msg}], corr }
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
  function lancer(id, generer) {
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
        } else {
          h += '<div class="exo-saisie"><input type="text" inputmode="decimal" autocomplete="off" placeholder="valeur" aria-label="Réponse"> <span class="exo-unite">' + (et.unite || '') + '</span></div>';
        }
        h += '<button type="button" class="bouton exo-valider">Valider</button><div class="exo-retour" aria-live="polite"></div>';
        li.innerHTML = h;
        liste.appendChild(li);
        li.querySelector('.exo-valider').addEventListener('click', function () { valider(li, et, i, ex); });
        var inp = li.querySelector('input[type=text]');
        if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') valider(li, et, i, ex); });
      });
      if (ex.apres) ex.apres(racine);
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
      } else {
        var inp = li.querySelector('input[type=text]'), v = lire(inp.value);
        if (isNaN(v)) { retour.className = 'exo-retour attention'; retour.innerHTML = 'Entrez un nombre (virgule acceptée ; puissances de 10 : 1,2e-3).'; return; }
        ok = proche(v, et.rep, et.tol || 0.03);
        if (!ok) {
          (et.pieges || []).some(function (p) { if (proche(v, p.v, et.tol || 0.03)) { msg = p.msg; return true; } });
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
  return { alea: alea, choisir: choisir, melanger: melanger, cs: cs, nb: nb, lire: lire, regression: regression, graphique: graphique, lancer: lancer };
})();
