/* Agenda de la page d'accueil : lit agenda.json (recopié de Google toutes les heures par .github/workflows/agenda.yml).
   Aucun appel à Google depuis le navigateur du visiteur. */
(function () {
  var JS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var vue = document.getElementById('ag-vue'), titre = document.getElementById('ag-titre');
  var mode = 'sem', ref = new Date(), E = [];
  try { mode = localStorage.getItem('agenda-mode') || 'sem'; } catch (e) {}

  function d0(x) { var d = new Date(x); d.setHours(0, 0, 0, 0); return d; }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function lundi(d) { d = d0(d); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; }
  function plus(d, n) { d = new Date(d); d.setDate(d.getDate() + n); return d; }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function hm(s) { return s.slice(11, 16).replace(':', 'h'); }

  // « SYNTHESE - [BTS2MCHP2] - <BTS2MCH> BTS2MCHP2 » → matière « Synthese », groupe « BTS2MCHP2 »
  function lire(e) {
    var t = e.t, st = '', m = t.match(/^(Cours annulé|Classe absente|Cours modifié|Prof\. absent|Remplacement|Changement de salle)\s*:\s*/i);
    if (m) { st = m[1]; t = t.slice(m[0].length); }
    var p = t.split(' - '), mat = p[0], grp = '';
    if (p.length > 1) { var g = p[p.length - 1].replace(/<[^>]*>|\[[^\]]*\]/g, ' ').trim().split(/\s+/); grp = g[g.length - 1] || ''; }
    return { mat: mat, grp: grp, st: st, barre: /annulé|absent/i.test(st) };
  }
  function jourEvts(d) {
    var k = iso(d);
    return E.filter(function (e) { return e.j ? (e.d <= k && k < e.f) : e.d.slice(0, 10) === k; })
      .sort(function (a, b) { return (b.j - a.j) || (a.d < b.d ? -1 : 1); });
  }
  function carte(e, court) {
    var r = lire(e), cls = 'ag-ev c' + e.c + (r.barre ? ' barre' : '') + (e.j ? ' jour' : '');
    var h = '<div class="' + cls + '">';
    if (!e.j) h += '<span class="ag-h">' + hm(e.d) + (court ? '' : '–' + hm(e.f)) + '</span>';
    h += '<span class="ag-t">' + esc(r.mat) + '</span>';
    if (!court) {
      var info = [r.grp, e.l].filter(Boolean).join(' · ');
      if (info) h += '<span class="ag-i">' + esc(info) + '</span>';
      if (r.st) h += '<span class="ag-st">' + esc(r.st) + '</span>';
    }
    return h + '</div>';
  }
  function rendre() {
    document.querySelectorAll('.agenda-modes button').forEach(function (b) { b.classList.toggle('actif', b.dataset.mode === mode); });
    var auj = iso(new Date()), h = '';
    if (mode === 'sem') {
      var L = lundi(ref), jours = [0, 1, 2, 3, 4, 5].map(function (i) { return plus(L, i); });
      if (!jourEvts(jours[5]).length) jours.pop();
      titre.textContent = 'Semaine du ' + L.getDate() + ' ' + MOIS[L.getMonth()] + ' ' + L.getFullYear();
      h = '<div class="ag-sem" style="--n:' + jours.length + '">';
      jours.forEach(function (d) {
        var ev = jourEvts(d);
        h += '<div class="ag-col' + (iso(d) === auj ? ' auj' : '') + '"><div class="ag-jour">' + JS[(d.getDay() + 6) % 7] + ' ' + d.getDate() + '</div>';
        h += ev.length ? ev.map(function (e) { return carte(e); }).join('') : '<p class="ag-rien">—</p>';
        h += '</div>';
      });
      h += '</div>';
    } else if (mode === 'liste') {
      var d1 = d0(ref), n = 0;
      titre.textContent = 'À partir du ' + d1.getDate() + ' ' + MOIS[d1.getMonth()];
      h = '<div class="ag-liste">';
      for (var i = 0; i < 28; i++) {
        var d = plus(d1, i), ev = jourEvts(d);
        if (!ev.length) continue; n++;
        h += '<div class="ag-ljour' + (iso(d) === auj ? ' auj' : '') + '"><div class="ag-jour">' + JS[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()] + '</div><div>' + ev.map(function (e) { return carte(e); }).join('') + '</div></div>';
      }
      h += n ? '</div>' : '<p class="ag-vide">Rien de prévu sur les quatre semaines qui viennent.</p></div>';
    } else {
      var p1 = new Date(ref.getFullYear(), ref.getMonth(), 1), L2 = lundi(p1);
      titre.textContent = MOIS[p1.getMonth()].replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + p1.getFullYear();
      h = '<div class="ag-mois"><div class="ag-mtete">' + JS.map(function (j) { return '<span>' + j.slice(0, 3) + '.</span>'; }).join('') + '</div><div class="ag-mgrille">';
      for (var k = 0; k < 42; k++) {
        var dm = plus(L2, k); if (k === 35 && dm.getMonth() !== p1.getMonth()) break;
        var em = jourEvts(dm);
        h += '<div class="ag-case' + (dm.getMonth() !== p1.getMonth() ? ' hors' : '') + (iso(dm) === auj ? ' auj' : '') + '"><span class="ag-num">' + dm.getDate() + '</span>';
        h += em.slice(0, 3).map(function (e) { return carte(e, true); }).join('');
        if (em.length > 3) h += '<span class="ag-plus">+' + (em.length - 3) + '</span>';
        h += '</div>';
      }
      h += '</div></div>';
    }
    vue.innerHTML = h;
  }
  function decaler(s) {
    if (mode === 'sem') ref = plus(ref, 7 * s);
    else if (mode === 'liste') ref = plus(ref, 28 * s);
    else ref = new Date(ref.getFullYear(), ref.getMonth() + s, 1);
    rendre();
  }
  document.getElementById('ag-prec').onclick = function () { decaler(-1); };
  document.getElementById('ag-suiv').onclick = function () { decaler(1); };
  document.getElementById('ag-auj').onclick = function () { ref = new Date(); rendre(); };
  document.querySelectorAll('.agenda-modes button').forEach(function (b) {
    b.onclick = function () { mode = b.dataset.mode; ref = new Date(); try { localStorage.setItem('agenda-mode', mode); } catch (e) {} rendre(); };
  });
  fetch('agenda.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) {
    E = d.evts || [];
    if (d.maj) { var m = new Date(d.maj); document.getElementById('ag-maj').textContent = 'Mis à jour le ' + m.getDate() + ' ' + MOIS[m.getMonth()] + ' à ' + d.maj.slice(11, 16).replace(':', 'h') + '.'; }
    // le samedi et le dimanche, la semaine affichée est la suivante
    if (mode === 'sem' && new Date().getDay() % 6 === 0 && !jourEvts(new Date()).length) ref = plus(lundi(new Date()), 7);
    rendre();
  }).catch(function () { vue.innerHTML = '<p class="ag-vide">L’agenda n’a pas pu être chargé. Réessaie dans un moment.</p>'; });
})();
