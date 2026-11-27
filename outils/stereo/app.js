/* Représentations spatiales — interface */
(function () {
  const S = Stereo, V = Vues;
  const $ = id => document.getElementById(id);
  const etat = { mol: null, nom: '', vue: 'cram', gauche: 'cram', droite: 'fischer', phi: 0, liaison: null, cycle: null, anomere: 'alpha', anim: null };
  const opt = () => ({ rs: $('o-rs').checked, num: $('o-num').checked, ecrireC: $('o-c').checked, serie: $('o-serie').checked });
  const NOMS = { cram: 'Cram', newman: 'Newman', fischer: 'Fischer', haworth: 'Haworth' };
  let LIB = [];

  function remplirListe() {
    const sel = $('mol');
    LIB.forEach(([g, ms]) => {
      const og = document.createElement('optgroup'); og.label = g;
      ms.forEach(([n, s]) => { const o = document.createElement('option'); o.value = s; o.textContent = n; og.appendChild(o); });
      sel.appendChild(og);
    });
  }
  function charger(smiles, nom) {
    try {
      const m = S.lireSmiles(smiles); S.completerCentres(m);
      etat.mol = m; etat.nom = nom || ''; etat.phi = 0; etat.liaison = null; etat.cycle = null;
      $('err').hidden = true;
      if (!nom) $('mol').value = '';
      $('smiles').value = smiles;
      // vue par défaut adaptée
      if (V.haworthPossible(m) && etat.vue === 'newman') etat.vue = 'haworth';
      rendre();
    } catch (e) { $('err').textContent = 'SMILES non reconnu : ' + e.message; $('err').hidden = false; }
  }
  function infos() {
    const m = etat.mol, cs = Object.keys(m.chir).map(Number);
    const lourd = m.at.map((a, i) => i).find(i => m.at[i].el !== 'H');
    $('brute').innerHTML = S.formuleBrute(m, lourd, -1).replace(/(\d+)/g, '<sub>$1</sub>');
    const ch = S.chainePrincipale(m);
    cs.sort((a, b) => ch.indexOf(a) - ch.indexOf(b));
    const numero = c => { const q = ch ? ch.indexOf(c) : -1; return q >= 0 ? 'C' + (q + 1) : 'C'; };
    $('centres').innerHTML = cs.length ? cs.map(c => `<li><span>${numero(c)}</span>${$('o-rs').checked ? `<b>${S.descripteur(m, c)}</b>` : ''}<button type="button" class="st-mini" data-inv="${c}">Inverser</button></li>`).join('')
      : '<li class="st-aucun">Aucun atome de carbone asymétrique.</li>';
    $('nbc').textContent = cs.length ? `${cs.length} atome${cs.length > 1 ? 's' : ''} de carbone asymétrique${cs.length > 1 ? 's' : ''} : ${Math.pow(2, cs.length)} stéréoisomères de configuration au plus.` : '';
  }
  function dessin(vue) {
    const m = etat.mol, o = opt();
    if (vue === 'cram') return V.cram(m, o);
    if (vue === 'fischer') return V.fischer(m, o);
    if (vue === 'newman') return V.newman(m, Object.assign(o, { phi: etat.phi, liaison: etat.liaison }));
    if (vue === 'haworth') return V.haworth(m, Object.assign(o, { cycle: etat.cycle, anomere: etat.anomere }));
  }
  function panneau(vue, cible) {
    const r = dessin(vue);
    cible.innerHTML = r.erreur ? `<p class="st-msg">${r.erreur}</p>` : r.svg;
    return r;
  }
  function rendre() {
    if (!etat.mol) return;
    infos();
    document.querySelectorAll('.st-onglets button').forEach(b => b.classList.toggle('actif', b.dataset.vue === etat.vue));
    const cote = etat.vue === 'cote';
    $('zone-1').className = 'st-zone' + (cote ? ' demi' : '');
    $('zone-2').hidden = !cote; $('choix-cote').hidden = !cote;
    const v1 = cote ? etat.gauche : etat.vue;
    const r1 = panneau(v1, $('dessin-1'));
    $('titre-1').textContent = cote ? NOMS[v1] : '';
    let r2 = null;
    if (cote) { r2 = panneau(etat.droite, $('dessin-2')); $('titre-2').textContent = NOMS[etat.droite]; }
    const vues = cote ? [etat.gauche, etat.droite] : [etat.vue];
    // commandes Newman
    const rn = vues.includes('newman') ? (v1 === 'newman' ? r1 : r2) : null;
    $('cmd-newman').hidden = !rn || !!rn.erreur;
    if (rn && !rn.erreur) {
      const sel = $('liaison');
      sel.innerHTML = rn.liste.map(l => `<option value="${l.q}"${l.q === rn.liaison.q ? ' selected' : ''}>${l.nom}</option>`).join('');
      $('phi').value = etat.phi; $('phi-val').textContent = Math.round(etat.phi) + '°';
      $('conf').textContent = 'Conformation ' + rn.conf;
    }
    const rh = vues.includes('haworth') ? (v1 === 'haworth' ? r1 : r2) : null;
    $('cmd-haworth').hidden = !rh || !!rh.erreur;
    if (rh && !rh.erreur) {
      $('cycle').value = rh.cycle; $('anomere').value = etat.anomere;
      $('haw-info').textContent = `${rh.anomere}-${rh.serie || ''}-${(etat.nom || 'ose').toLowerCase()} (forme ${rh.cycle})`.replace('--', '-');
    }
  }
  // ── événements ──
  $('mol').addEventListener('change', e => { const o = e.target.selectedOptions[0]; if (o && o.value) charger(o.value, o.textContent); });
  $('construire').addEventListener('click', () => charger($('smiles').value, ''));
  $('smiles').addEventListener('keydown', e => { if (e.key === 'Enter') charger($('smiles').value, ''); });
  document.querySelectorAll('.st-onglets button').forEach(b => b.addEventListener('click', () => { etat.vue = b.dataset.vue; arreter(); rendre(); }));
  ['o-rs', 'o-num', 'o-c', 'o-serie'].forEach(id => $(id).addEventListener('change', rendre));
  $('v-gauche').addEventListener('change', e => { etat.gauche = e.target.value; rendre(); });
  $('v-droite').addEventListener('change', e => { etat.droite = e.target.value; rendre(); });
  $('liaison').addEventListener('change', e => { etat.liaison = +e.target.value; etat.phi = 0; rendre(); });
  $('phi').addEventListener('input', e => { etat.phi = +e.target.value; rendre(); });
  document.querySelectorAll('[data-phi]').forEach(b => b.addEventListener('click', () => { arreter(); etat.phi = +b.dataset.phi; rendre(); }));
  $('cycle').addEventListener('change', e => { etat.cycle = e.target.value; rendre(); });
  $('anomere').addEventListener('change', e => { etat.anomere = e.target.value; rendre(); });
  function arreter() { if (etat.anim) { clearInterval(etat.anim); etat.anim = null; $('tourner').textContent = '▶ Faire tourner'; } }
  $('tourner').addEventListener('click', () => {
    if (etat.anim) return arreter();
    $('tourner').textContent = '■ Arrêter';
    etat.anim = setInterval(() => { etat.phi = (etat.phi + 2) % 360; rendre(); }, 40);
  });
  // inverser un centre (liste ou clic sur le dessin)
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-inv]'), c = e.target.closest('[data-c]');
    const k = b ? b.dataset.inv : c && c.dataset.c;
    if (k === undefined || k === null || k === '') return;
    S.inverser(etat.mol, +k); etat.nom = ''; $('mol').value = ''; rendre();
  });
  // export
  function svgCourant(n) {
    const s = $('dessin-' + n).querySelector('svg'); if (!s) return null;
    const c = s.cloneNode(true);
    const st = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    st.textContent = 'text{font:16px Arial,sans-serif;fill:#000}.ind{font-size:11px}.num{font-size:11px;fill:#777}.rs{font-size:12px;fill:#b00}.serie{font-size:13px;fill:#555}line{stroke:#000;stroke-width:1.6}.epais{stroke-width:5}.hach{stroke-width:1.2}.coin,.point{fill:#000}.arriere{fill:none;stroke:#000;stroke-width:1.6}.cible{fill:transparent}';
    c.insertBefore(st, c.firstChild);
    const vb = c.viewBox.baseVal; c.setAttribute('width', vb.width * 2); c.setAttribute('height', vb.height * 2);
    return new XMLSerializer().serializeToString(c);
  }
  $('png').addEventListener('click', () => {
    const t = svgCourant(1); if (!t) return;
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(img, 0, 0);
      const a = document.createElement('a'); a.download = (etat.nom || 'molecule') + '-' + (etat.vue === 'cote' ? etat.gauche : etat.vue) + '.png'; a.href = cv.toDataURL('image/png'); a.click();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(t);
  });
  window.StereoApp = { etat, rendre };
  fetch('outils/stereo/molecules.json').then(r => r.json()).then(d => {
    LIB = d; remplirListe();
    const p = new URLSearchParams(location.search).get('smiles');
    if (p) charger(p, ''); else { $('mol').value = LIB[0][1][0][1]; charger(LIB[0][1][0][1], LIB[0][1][0][0]); }
  });
})();
