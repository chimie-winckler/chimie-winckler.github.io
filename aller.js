/* Menu déroulant « Aller à » : accès rapide aux parties d'une page. */
(function () {
  function slug(t) { return 'p-' + t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function cible(el, label) { if (!el.id) { var id = slug(label), n = 2, b = id; while (document.getElementById(id)) id = b + '-' + n++; el.id = id; } return el.id; }
  function libellePartie(a) {
    var num = txt(a.querySelector('.partie-num')), h = txt(a.querySelector('h3'));
    a.querySelectorAll('.doc').forEach(function (d) {
      var c = d.cloneNode(true); c.querySelectorAll('.doc-ico,.nbp').forEach(function (x) { x.remove(); });
      var t = txt(c); if (/^Énoncé\s*-/.test(t) && num) h = t.replace(/^Énoncé\s*-\s*/, '');
    });
    return num ? num.split('·')[0].trim() + ' – ' + h : h;
  }
  window.construireAller = function (racine) {
    if (!racine || racine.querySelector('.aller')) return;
    var sel = document.createElement('select'); sel.setAttribute('aria-label', 'Aller à une partie');
    var o0 = document.createElement('option'); o0.textContent = 'Choisir une partie…'; o0.value = ''; sel.appendChild(o0);
    var n = 0;
    racine.querySelectorAll('section').forEach(function (s) {
      var h2 = s.querySelector('h2'); if (!h2) return;
      var parties = s.querySelectorAll('article.partie');
      if (parties.length > 1) {
        var g = document.createElement('optgroup'); g.label = txt(h2);
        parties.forEach(function (a) { var l = libellePartie(a), o = document.createElement('option'); o.textContent = l; o.value = cible(a, l); g.appendChild(o); n++; });
        sel.appendChild(g);
      } else {
        var o = document.createElement('option'); o.textContent = txt(h2); o.value = cible(s, txt(h2)); sel.appendChild(o); n++;
      }
    });
    if (n < 3) return;
    var box = document.createElement('div'); box.className = 'aller';
    var lab = document.createElement('span'); lab.textContent = 'Aller à :'; box.appendChild(lab); box.appendChild(sel);
    racine.insertBefore(box, racine.firstChild);
    sel.addEventListener('change', function () {
      var c = sel.value && document.getElementById(sel.value);
      if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'start' }); try { history.replaceState(null, '', '#' + sel.value); } catch (e) {} }
      sel.value = '';
    });
  };
  var m = document.querySelector('main[data-aller]');
  if (m && !document.getElementById('coffre')) window.construireAller(m);
})();
