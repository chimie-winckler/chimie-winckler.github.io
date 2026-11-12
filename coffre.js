/* Rubriques protégées (Cours, S’entraîner, exercices) : déchiffrement AES-GCM dans le navigateur (clé PBKDF2 dérivée du mot de passe). */
(function () {
  var box = document.getElementById('coffre');
  if (!box) return;
  var form = document.getElementById('coffre-form'), mdp = document.getElementById('coffre-mdp'),
      msg = document.getElementById('coffre-msg'), garder = document.getElementById('coffre-garder'),
      ouvert = document.getElementById('coffre-ouvert'), attente = document.getElementById('coffre-attente');
  var NOM = 'coffre-cours';
  var SEP = '<!--coffre-scripts-->';
  function executer(html) {
    var t = document.createElement('div'); t.innerHTML = html;
    var liste = Array.prototype.slice.call(t.querySelectorAll('script'));
    (function suivant() {
      var s0 = liste.shift(); if (!s0) return;
      var s = document.createElement('script');
      for (var i = 0; i < s0.attributes.length; i++) s.setAttribute(s0.attributes[i].name, s0.attributes[i].value);
      if (s0.src) { s.onload = s.onerror = suivant; document.body.appendChild(s); }
      else { s.text = s0.textContent; document.body.appendChild(s); suivant(); }
    })();
  }
  function b64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function enB64(buf) { var u = new Uint8Array(buf), s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function lire(k) { try { return localStorage.getItem(k) || sessionStorage.getItem(k); } catch (e) { return null; } }
  function ecrire(k, v, durable) { try { (durable ? localStorage : sessionStorage).setItem(k, v); } catch (e) {} }
  function oublier(k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {} }
  if (!window.crypto || !crypto.subtle) { attente.textContent = 'Ton navigateur ne permet pas d’ouvrir cette rubrique. Mets-le à jour ou essaie un autre navigateur.'; return; }
  var sel = b64(box.getAttribute('data-sel')), iter = +box.getAttribute('data-iter');
  var donnees = b64(document.getElementById('coffre-donnees').textContent.trim());
  var cle = null;

  function deriver(motdepasse) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(motdepasse), 'PBKDF2', false, ['deriveBits'])
      .then(function (base) { return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: sel, iterations: iter, hash: 'SHA-256' }, base, 256); });
  }
  function dechiffrer(k, buf) {
    var u = new Uint8Array(buf);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, k, u.slice(12));
  }
  function ouvrir(bits) {
    return crypto.subtle.importKey('raw', bits, 'AES-GCM', false, ['decrypt']).then(function (k) {
      return dechiffrer(k, donnees).then(function (html) {
        cle = k;
        var parts = new TextDecoder().decode(html).split(SEP);
        ouvert.innerHTML = parts[0] +
          '<p class="coffre-verrou"><button type="button" id="coffre-fermer">🔒 Se déconnecter</button></p>';
        ouvert.hidden = false; form.hidden = true; attente.hidden = true;
        document.getElementById('coffre-fermer').addEventListener('click', function () { oublier(NOM); location.reload(); });
        if (parts[1]) executer(parts[1]);
        if (window.construireAller && box.closest('main[data-aller]')) window.construireAller(ouvert);
        if (location.hash) { var c = document.getElementById(location.hash.slice(1)); if (c) c.scrollIntoView(); }
      });
    });
  }
  function afficherForm() { attente.hidden = true; form.hidden = false; }

  var memo = lire(NOM);
  if (memo) ouvrir(b64(memo)).catch(function () { oublier(NOM); afficherForm(); });
  else afficherForm();

  form.addEventListener('submit', function (e) {
    e.preventDefault(); msg.textContent = 'Vérification…';
    var bitsGardes;
    deriver(mdp.value).then(function (bits) { bitsGardes = bits; return ouvrir(bits); })
      .then(function () { ecrire(NOM, enB64(bitsGardes), garder.checked); msg.textContent = ''; })
      .catch(function () { msg.textContent = 'Mot de passe incorrect.'; mdp.select(); });
  });

  /* Ouverture d’un PDF chiffré */
  ouvert.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-enc]');
    if (!a || !cle) return;
    e.preventDefault();
    var w = window.open('', '_blank');
    if (w) { try { w.document.write('<p style="font-family:sans-serif;padding:2em">Ouverture du document…</p>'); } catch (x) {} }
    a.classList.add('coffre-charge');
    fetch(a.getAttribute('data-enc')).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function (buf) { return dechiffrer(cle, buf); })
      .then(function (pdf) {
        var url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
        if (w) w.location.href = url; else location.href = url;
      })
      .catch(function () { if (w) w.close(); alert('Impossible d’ouvrir ce document. Réessaie dans un instant.'); })
      .then(function () { a.classList.remove('coffre-charge'); });
  });
})();
