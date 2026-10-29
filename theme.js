(function () {
  var root = document.documentElement;
  var btn = document.getElementById('theme-btn');
  if (!btn) return;
  function actuel() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function icone() { btn.textContent = actuel() === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'; btn.title = actuel() === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'; }
  btn.addEventListener('click', function () {
    var n = actuel() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', n);
    try { localStorage.setItem('theme', n); } catch (e) {}
    icone();
  });
  icone();
})();
