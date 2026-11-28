/* Schémas de montages — styles du dessin (utilisés à l'écran et à l'export) */
window.MONTAGE_STYLE = function (mode) {
  if (mode === 'illu') return window.MONTAGE_STYLE_ILLU;
  const nb = mode === true || mode === 'nb';
  const K = '#1d2329';
  const c = nb
    ? { verre: '#ffffff', env: '#ffffff', app: '#ffffff', plaque: '#e6e6e6', tige: '#ffffff', bouchon: '#ffffff', liq: 0.35, eau: K }
    : { verre: '#eef6fb', env: 'rgba(191,227,247,0.35)', app: '#d9dde3', plaque: '#aeb4bd', tige: '#a7adb5', bouchon: '#c9a27c', liq: 0.9, eau: '#1e88e5' };
  return `
  .verre{fill:${c.verre};stroke:${K};stroke-width:1.6;stroke-linejoin:round}
  .verre-fond{fill:${c.verre}}
  .int .verre{fill:none}
  .reflet{display:none}
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
  .app-noir{fill:${nb ? '#fff' : '#5a6068'};stroke:${K};stroke-width:1.2} .app-noir-dessus{fill:${nb ? '#fff' : '#737a83'};stroke:${K};stroke-width:1.2}
  .app-blanc{fill:${nb ? '#fff' : '#eceef1'};stroke:${K};stroke-width:1.2} .app-blanc-dessus{fill:${nb ? '#fff' : '#f6f7f8'};stroke:${K};stroke-width:1.2}
  .app-creme{fill:${nb ? '#fff' : '#e3e0d8'};stroke:${K};stroke-width:1.2} .app-creme-ombre{fill:${nb ? '#fff' : '#d4d0c6'};stroke:${K};stroke-width:1}
  .app-sarcelle{fill:${nb ? '#fff' : '#9fc9c3'};stroke:${K};stroke-width:1}
  .ecran{fill:${nb ? '#fff' : '#cfdcc5'};stroke:${K};stroke-width:1} .ecran-cadre{fill:${nb ? '#fff' : '#7a7f86'};stroke:${K};stroke-width:1}
  .ecran-txt{font:bold 11px "Courier New",monospace;fill:${K}}
  .bouton-c{fill:${nb ? '#fff' : '#4a4f56'};stroke:${K};stroke-width:1} .graduation{stroke:${K};stroke-width:.7}
  .app-dessus{fill:${nb ? '#fff' : '#c9cdd3'};stroke:${K};stroke-width:1.2} .app-sombre{fill:${nb ? '#fff' : '#4a4f56'};stroke:${K};stroke-width:1}
  .flacon-brun{fill:${nb ? '#fff' : '#9a6b3f'};stroke:${K};stroke-width:1.2} .bouchon-bleu{fill:${nb ? '#fff' : '#3d6fd6'};stroke:${K};stroke-width:1} .bouchon-gris{fill:${nb ? '#fff' : '#c9ced6'};stroke:${K};stroke-width:1}
  .cable{fill:none;stroke:${K};stroke-width:2;stroke-linecap:round} .tube-fin{fill:none;stroke:${nb ? K : '#8fbfd6'};stroke-width:${nb ? 1.4 : 3};stroke-linecap:round}
  .sonde-verre{fill:${nb ? '#fff' : '#eef6fb'};stroke:${K};stroke-width:1.2} .sonde-tete{fill:${nb ? '#fff' : '#5a6068'};stroke:${K};stroke-width:1.2} .sonde-bague{fill:${nb ? '#fff' : '#9aa0a8'};stroke:${K};stroke-width:1}
  .plaque-pt{fill:${nb ? '#fff' : '#9e9e9e'};stroke:${K};stroke-width:.8} .pointe{fill:${nb ? '#fff' : '#eef6fb'};stroke:${K};stroke-width:1} .led{fill:${nb ? '#fff' : '#7cd67c'};stroke:${K};stroke-width:.6}
  .leg-trait{stroke:${K};stroke-width:.9}
  .leg-pt{fill:${K}}
  .leg-txt,.txt-libre{font:15px Arial,sans-serif;fill:${K}}
  .poignee{fill:transparent}`;
};
/* style « Illustré » : verre teinté avec reflets, métal en dégradé, appareils colorés en relief, légendes fines soulignées */
window.MONTAGE_DEFS_ILLU = `<defs>
  <linearGradient id="ill-verre" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#c9dbe8" stop-opacity=".75"/><stop offset=".18" stop-color="#eef5fa" stop-opacity=".35"/><stop offset=".55" stop-color="#f4f8fb" stop-opacity=".2"/><stop offset=".85" stop-color="#dbe7f0" stop-opacity=".45"/><stop offset="1" stop-color="#b9ccdb" stop-opacity=".8"/></linearGradient>
  <linearGradient id="ill-reflet" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".1" stop-color="#fff" stop-opacity="0"/><stop offset=".16" stop-color="#fff" stop-opacity=".85"/><stop offset=".24" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#fff" stop-opacity="0"/><stop offset=".86" stop-color="#fff" stop-opacity=".45"/><stop offset=".9" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="ill-liq" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset=".3" stop-color="#fff" stop-opacity=".12"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
  <linearGradient id="ill-metal" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#5d5a72"/><stop offset=".35" stop-color="#d9d6e6"/><stop offset=".55" stop-color="#a9a5bd"/><stop offset="1" stop-color="#4f4c63"/></linearGradient>
  <linearGradient id="ill-metal-h" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#5d5a72"/><stop offset=".35" stop-color="#d9d6e6"/><stop offset=".6" stop-color="#a9a5bd"/><stop offset="1" stop-color="#4f4c63"/></linearGradient>
  <linearGradient id="ill-noix" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#b3aec6"/><stop offset=".5" stop-color="#8f8aa6"/><stop offset="1" stop-color="#6c6884"/></linearGradient>
  <linearGradient id="ill-app" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7b6c9c"/><stop offset="1" stop-color="#5e5080"/></linearGradient>
  <linearGradient id="ill-app-dessus" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#9c90bd"/><stop offset="1" stop-color="#8a7dac"/></linearGradient>
  <linearGradient id="ill-sarcelle" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#4fc1b3"/><stop offset="1" stop-color="#1f8b80"/></linearGradient>
</defs>`;
window.MONTAGE_STYLE_ILLU = (() => {
  const K = '#3e3a52', T = '#2b2b33';
  return `
  .verre{fill:none;stroke:${K};stroke-width:1.2;stroke-linejoin:round}
  .verre-fond{fill:url(#ill-verre)}
  .reflet{display:inline;fill:url(#ill-reflet);pointer-events:none}
  .trait{fill:none;stroke:${K};stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}
  .enveloppe{fill:rgba(205,225,238,.35);stroke:${K};stroke-width:1.1}
  .rodage{stroke:${K};stroke-width:.8}
  .grad{stroke:${K};stroke-width:.7}
  .robinet{fill:url(#ill-noix);stroke:${K};stroke-width:1}
  .bouchon{fill:#c9a27c;stroke:${K};stroke-width:1}
  .appareil{fill:url(#ill-app);stroke:${K};stroke-width:1}
  .app-dessus{fill:url(#ill-app-dessus);stroke:${K};stroke-width:1}
  .app-sombre{fill:#3f355a;stroke:${K};stroke-width:1}
  .plaque{fill:url(#ill-app-dessus);stroke:${K};stroke-width:1}
  .bouton{fill:#6a5d8e;stroke:${K};stroke-width:1}
  .bouton-c{fill:url(#ill-noix);stroke:${K};stroke-width:1}
  .graduation{stroke:#d9d3ec;stroke-width:.8;fill:none}
  .petit-clair{font:5px Arial,sans-serif;fill:#e4def5}
  .tige{fill:url(#ill-metal);stroke:${K};stroke-width:.8}
  .tige-h{fill:url(#ill-metal-h);stroke:${K};stroke-width:.8}
  .noix{fill:url(#ill-noix);stroke:${K};stroke-width:1}
  .mors{fill:url(#ill-sarcelle);stroke:#1b5f58;stroke-width:1}
  .mors-l{fill:none;stroke:url(#ill-sarcelle);stroke-width:3.2;stroke-linecap:round}
  .pince{fill:none;stroke:#2a9d8f;stroke-width:2.6}
  .olive{fill:#4d4a5e;stroke:${K};stroke-width:1}
  .mercure{stroke:#c62828;stroke-width:2}
  .mercure-p{fill:#c62828}
  .cartouche{fill:#efe3c8;stroke:${K};stroke-width:1;stroke-dasharray:3 2}
  .fritte{stroke:${K};stroke-width:2;stroke-dasharray:2 2}
  .filtre{fill:#fffaf0;stroke:${K};stroke-width:1;stroke-dasharray:4 2}
  .tuyau{fill:none;stroke:#9fd8cf;stroke-width:5;stroke-linecap:round}
  .grain{fill:#fff;stroke:${K};stroke-width:.6}
  .liquide{opacity:.62}
  .liq-ombre{fill:url(#ill-liq)}
  .surface{fill:none;stroke:#fff;stroke-opacity:.7;stroke-width:1.2}
  .solide circle{fill:#fff;stroke:${K};stroke-width:.7}
  .plaque-ccm{fill:#fff;stroke:${K};stroke-width:1}
  .tache{fill:#6b5bd6}
  .caoutchouc{fill:#4d4a5e;stroke:${K};stroke-width:1}
  .vide path{fill:none;stroke:${T};stroke-width:1.4}
  .vide text{fill:${T}}
  .eau path{fill:none;stroke:#1e88e5;stroke-width:1.4}
  .eau text{fill:#1e88e5}
  .petit{font:11px "Segoe UI","Helvetica Neue",Arial,sans-serif;fill:${T}}
  .app-noir{fill:#2f2b3a;stroke:#1f1c28;stroke-width:1} .app-noir-dessus{fill:#4a4558;stroke:#1f1c28;stroke-width:1}
  .app-blanc{fill:#f3f4f3;stroke:#8d93a0;stroke-width:1} .app-blanc-dessus{fill:#fbfbfb;stroke:#8d93a0;stroke-width:1}
  .app-creme{fill:#efe7d6;stroke:#9c937f;stroke-width:1} .app-creme-ombre{fill:#e3d9c3;stroke:#9c937f;stroke-width:.8}
  .app-sarcelle{fill:url(#ill-sarcelle);stroke:#1b6f66;stroke-width:.8}
  .ecran{fill:#b9c7a8;stroke:#1f1c28;stroke-width:1} .ecran-cadre{fill:#6d2a4a;stroke:#3b1628;stroke-width:1}
  .ecran-txt{font:bold 11px "Courier New",monospace;fill:#2f3a26}
  .flacon-brun{fill:#5e331a;fill-opacity:.92;stroke:#2e1a0e;stroke-width:1} .bouchon-bleu{fill:#2f6ad8;stroke:#1d3f86;stroke-width:1} .bouchon-gris{fill:#d6d3cc;stroke:#8a8579;stroke-width:1}
  .cable{fill:none;stroke:#3a3346;stroke-width:2.2;stroke-linecap:round} .tube-fin{fill:none;stroke:#9fd8cf;stroke-opacity:.95;stroke-width:3.2;stroke-linecap:round}
  .sonde-verre{fill:rgba(215,232,243,.75);stroke:${K};stroke-width:1} .sonde-tete{fill:url(#ill-sarcelle);stroke:#1b5f58;stroke-width:1} .sonde-bague{fill:#2f2b3a;stroke:#1f1c28;stroke-width:.8}
  .plaque-pt{fill:#b0b0b0;stroke:${K};stroke-width:.6} .pointe{fill:rgba(215,232,243,.85);stroke:${K};stroke-width:.8} .led{fill:#c8f07a;stroke:#5b7a2a;stroke-width:.6}
  .leg-trait{stroke:${T};stroke-width:.8}
  .leg-pt{fill:${T}}
  .leg-txt,.txt-libre{font:300 15px "Segoe UI Light","Segoe UI","Helvetica Neue",Raleway,Arial,sans-serif;fill:${T}}
  .poignee{fill:transparent}`;
})();
(function () {
  // chaque règle (même plusieurs sur une ligne) est limitée aux dessins de l'outil
  const ajout = (css, pre) => { const s = document.createElement('style'); s.textContent = css.split('}').map(r => r.trim()).filter(Boolean).map(r => pre + ' ' + r.replace(/,\s*\./g, ',' + pre + ' .') + '}').join('\n'); document.head.appendChild(s); };
  ajout(window.MONTAGE_STYLE(false), '.mt-dessin');
  ajout(window.MONTAGE_STYLE(true), 'body.mt-nb .mt-dessin');
  ajout(window.MONTAGE_STYLE_ILLU, 'body.mt-illu .mt-dessin');
})();
