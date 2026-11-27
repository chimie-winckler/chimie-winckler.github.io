/* Représentations spatiales — lecteur d'animations et export vidéo */
(function () {
  const $ = id => document.getElementById(id);
  const L = { etapes: null, box: null, T: 0, total: 0, lecture: false, dernier: 0, debuts: [] };
  function preparer() {
    const app = window.StereoApp, e = app.etat;
    if (!e.mol) return false;
    const type = $('anim-type').value;
    const r = Anim[type](e.mol, { liaison: e.liaison, cycle: e.cycle, anomere: e.anomere });
    $('anim-msg').hidden = true;
    if (r.erreur) { pause(); $('anim-msg').textContent = r.erreur; $('anim-msg').hidden = false; L.etapes = null; $('anim-dessin').innerHTML = ''; $('anim-legende').textContent = ''; $('anim-etape').textContent = ''; return false; }
    L.etapes = r.etapes; L.box = Anim.boiteGlobale(r.etapes);
    L.debuts = []; let t = 0; r.etapes.forEach(x => { L.debuts.push(t); t += x.duree; }); L.total = t;
    L.T = 0; return true;
  }
  function position(T) {
    let i = L.debuts.length - 1; while (i > 0 && L.debuts[i] > T) i--;
    return { i, t: Math.min(1, Math.max(0, (T - L.debuts[i]) / L.etapes[i].duree)) };
  }
  function afficher() {
    if (!L.etapes) return;
    const { i, t } = position(L.T), e = L.etapes[i];
    $('anim-dessin').innerHTML = Anim.dessiner(e.f(t), L.box);
    $('anim-etape').textContent = `Étape ${i + 1}/${L.etapes.length}.`;
    $('anim-legende').textContent = e.legende;
    $('anim-prog').style.width = (100 * L.T / L.total).toFixed(1) + '%';
  }
  function boucle(ts) {
    if (!L.lecture || !L.etapes) return;
    const dt = Math.min(0.1, (ts - (L.dernier || ts)) / 1000) * +$('anim-vitesse').value; L.dernier = ts;
    const avant = position(L.T).i;
    L.T += dt;
    const apres = position(Math.min(L.T, L.total)).i;
    if ($('anim-pas').checked && apres !== avant) { L.T = L.debuts[apres]; pause(); }
    if (L.T >= L.total) { L.T = L.total; pause(); }
    afficher();
    if (L.lecture) requestAnimationFrame(boucle);
  }
  function lire() { if (!L.etapes) return; if (L.T >= L.total) L.T = 0; L.lecture = true; L.dernier = 0; $('anim-lecture').textContent = '⏸ Pause'; requestAnimationFrame(boucle); }
  function pause() { L.lecture = false; $('anim-lecture').textContent = '⏵ Lecture'; }
  function ouvrir() {
    $('anim').hidden = false; document.querySelector('.st-dessins').hidden = true;
    ['cmd-newman', 'cmd-haworth'].forEach(id => $(id).classList.add('st-masque'));
    if (preparer()) { afficher(); lire(); }
  }
  function fermer() {
    pause(); $('anim').hidden = true; document.querySelector('.st-dessins').hidden = false;
    ['cmd-newman', 'cmd-haworth'].forEach(id => $(id).classList.remove('st-masque'));
  }
  $('anim-go').addEventListener('click', ouvrir);
  $('anim-type').addEventListener('change', () => { if (!$('anim').hidden) ouvrir(); });
  $('anim-fermer').addEventListener('click', fermer);
  $('anim-lecture').addEventListener('click', () => (L.lecture ? pause() : lire()));
  $('anim-debut').addEventListener('click', () => { L.T = 0; afficher(); });
  $('anim-prec').addEventListener('click', () => { pause(); const { i, t } = position(L.T); L.T = L.debuts[t < 0.05 && i > 0 ? i - 1 : i]; afficher(); });
  $('anim-suiv').addEventListener('click', () => { pause(); const { i } = position(L.T); L.T = i + 1 < L.debuts.length ? L.debuts[i + 1] : L.total; afficher(); });
  // relancer si la molécule change pendant que le lecteur est ouvert
  document.addEventListener('click', e => { if (e.target.closest('[data-inv]') && !$('anim').hidden) setTimeout(ouvrir, 0); });
  $('mol').addEventListener('change', () => { if (!$('anim').hidden) setTimeout(ouvrir, 0); });

  // ── export vidéo (WebM) ──
  const STYLE = 'text{font:16px Arial,sans-serif;fill:#111}.ind{font-size:11px}line{stroke:#111;stroke-width:1.6;stroke-linecap:round}.epais{stroke-width:5}.hach{stroke-width:1.2}.coin,.point{fill:#111}.arriere{fill:none;stroke:#111;stroke-width:1.6}';
  function image(svg, w, h) {
    return new Promise((ok, ko) => {
      const s = svg.replace('<svg ', `<svg width="${w}" height="${h}" `).replace(/(<svg[^>]*>)/, `$1<style>${STYLE}</style>`);
      const im = new Image(); im.onload = () => ok(im); im.onerror = ko;
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    });
  }
  function lignes(ctx, txt, max) {
    const mots = txt.split(' '), out = []; let l = '';
    mots.forEach(m => { const t = l ? l + ' ' + m : m; if (ctx.measureText(t).width > max && l) { out.push(l); l = m; } else l = t; });
    if (l) out.push(l); return out;
  }
  $('anim-video').addEventListener('click', async () => {
    if (!L.etapes) return;
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { $('anim-msg').textContent = 'Ce navigateur ne permet pas d’enregistrer la vidéo (essaie Chrome, Edge ou Firefox).'; $('anim-msg').hidden = false; return; }
    pause();
    const b = $('anim-video'); b.disabled = true; b.textContent = 'Enregistrement…';
    const [x0, y0, x1, y1] = L.box, k = 2, W = Math.round(Math.max(640, (x1 - x0) * k)), Hd = Math.round((y1 - y0) * k * W / ((x1 - x0) * k)), H = Hd + 110;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H + (H % 2); const ctx = cv.getContext('2d');
    const fps = 30, flux = cv.captureStream(fps);
    const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(flux, type ? { mimeType: type, videoBitsPerSecond: 4e6 } : {}), morceaux = [];
    rec.ondataavailable = e => { if (e.data.size) morceaux.push(e.data); };
    const fini = new Promise(r => { rec.onstop = r; });
    rec.start();
    const n = Math.round(L.total * fps) + fps;
    for (let f = 0; f <= n; f++) {
      const T = Math.min(L.total, f / fps), { i, t } = position(T), e = L.etapes[i];
      const im = await image(Anim.dessiner(e.f(t), L.box), W, Hd);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(im, 0, 0, W, Hd);
      ctx.fillStyle = '#1a7f84'; ctx.font = 'bold 22px Arial'; ctx.fillText(`Étape ${i + 1}/${L.etapes.length}`, 24, Hd + 32);
      ctx.fillStyle = '#222'; ctx.font = '20px Arial';
      lignes(ctx, e.legende, W - 48).slice(0, 3).forEach((l, q) => ctx.fillText(l, 24, Hd + 60 + q * 24));
      $('anim-prog').style.width = (100 * T / L.total).toFixed(1) + '%';
      await new Promise(r => setTimeout(r, 1000 / fps));
    }
    rec.stop(); await fini;
    const blob = new Blob(morceaux, { type: 'video/webm' }), a = document.createElement('a');
    const nom = ((window.StereoApp.etat.nom || 'molecule') + '-' + $('anim-type').selectedOptions[0].textContent).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    a.href = URL.createObjectURL(blob); a.download = nom + '.webm'; document.body.appendChild(a); a.click(); a.remove();
    b.disabled = false; b.textContent = 'Enregistrer la vidéo';
  });
})();
