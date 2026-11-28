/* Schémas de montages — styles du dessin (utilisés à l'écran et à l'export) */
window.MONTAGE_STYLE = function (nb) {
  const K = '#1d2329';
  const c = nb
    ? { verre: '#ffffff', env: '#ffffff', app: '#ffffff', plaque: '#e6e6e6', tige: '#ffffff', bouchon: '#ffffff', liq: 0.35, eau: K }
    : { verre: '#eef6fb', env: 'rgba(191,227,247,0.35)', app: '#d9dde3', plaque: '#aeb4bd', tige: '#a7adb5', bouchon: '#c9a27c', liq: 0.9, eau: '#1e88e5' };
  return `
  .verre{fill:${c.verre};stroke:${K};stroke-width:1.6;stroke-linejoin:round}
  .trait{fill:none;stroke:${K};stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
  .enveloppe{fill:${c.env};stroke:${K};stroke-width:1.4;stroke-linejoin:round}
  .rodage{stroke:${K};stroke-width:1}
  .grad{stroke:${K};stroke-width:.8}
  .robinet{fill:${nb ? '#fff' : '#e6e6e6'};stroke:${K};stroke-width:1.2}
  .bouchon{fill:${c.bouchon};stroke:${K};stroke-width:1.2}
  .appareil{fill:${c.app};stroke:${K};stroke-width:1.4}
  .plaque{fill:${c.plaque};stroke:${K};stroke-width:1.2}
  .bouton{fill:${nb ? '#fff' : '#4a4f56'};stroke:${K};stroke-width:1}
  .tige{fill:${c.tige};stroke:${K};stroke-width:1}
  .noix{fill:${nb ? '#fff' : '#5b6168'};stroke:${K};stroke-width:1}
  .pince{fill:none;stroke:${K};stroke-width:2.4}
  .olive{fill:#fff;stroke:${K};stroke-width:1.2}
  .mercure{stroke:${nb ? K : '#c62828'};stroke-width:2}
  .mercure-p{fill:${nb ? K : '#c62828'}}
  .cartouche{fill:${nb ? '#fff' : '#efe3c8'};stroke:${K};stroke-width:1;stroke-dasharray:3 2}
  .fritte{stroke:${K};stroke-width:2;stroke-dasharray:2 2}
  .filtre{fill:${nb ? '#fff' : '#fffaf0'};stroke:${K};stroke-width:1;stroke-dasharray:4 2}
  .tuyau{fill:none;stroke:${nb ? K : '#8d8d8d'};stroke-width:5;stroke-linecap:round}
  .grain{fill:#fff;stroke:${K};stroke-width:.6}
  .liquide{opacity:${c.liq}${nb ? ';fill:#cfcfcf !important' : ''}}
  .solide circle{fill:#fff;stroke:${K};stroke-width:.7}
  .plaque-ccm{fill:#fff;stroke:${K};stroke-width:1}
  .tache{fill:${nb ? K : '#6b5bd6'}}
  .caoutchouc{fill:${nb ? '#bdbdbd' : '#5f6368'};stroke:${K};stroke-width:1.2}
  .vide path{fill:none;stroke:${K};stroke-width:1.6}
  .vide text{fill:${K}}
  .eau path{fill:none;stroke:${c.eau};stroke-width:1.6}
  .eau text{fill:${c.eau}}
  .petit{font:11px Arial,sans-serif;fill:${K}}
  .leg-trait{stroke:${K};stroke-width:.9}
  .leg-pt{fill:${K}}
  .leg-txt,.txt-libre{font:15px Arial,sans-serif;fill:${K}}
  .poignee{fill:transparent}`;
};
(function () { const s = document.createElement('style'); s.id = 'mt-style'; s.textContent = window.MONTAGE_STYLE(false).replace(/^\s*\./gm, '.mt-dessin .').replace(/,\./g, ',.mt-dessin .'); document.head.appendChild(s);
  const n = document.createElement('style'); n.textContent = window.MONTAGE_STYLE(true).replace(/^\s*\./gm, 'body.mt-nb .mt-dessin .').replace(/,\./g, ',body.mt-nb .mt-dessin .'); document.head.appendChild(n); })();
