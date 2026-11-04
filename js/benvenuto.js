// Saluto animato alla prima apertura del giorno.
import { store, impostazioni } from './store.js';
import { chiaveGiorno } from './allenamenti.js';

const FIGURA = `<svg viewBox="0 0 200 200" aria-hidden="true">
  <defs>
    <radialGradient id="bb-glow" cx="50%" cy="45%" r="55%">
      <stop offset="0" stop-color="#0a84ff" stop-opacity=".55"/>
      <stop offset="1" stop-color="#0a84ff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle class="bb-alone" cx="100" cy="95" r="95" fill="url(#bb-glow)"/>
  <g class="bb-corpo" fill="#f2f2f7">
    <circle cx="100" cy="36" r="15"/>
    <path d="M92 50h16l2 12H90z"/>
    <path d="M56 70q44-16 88 0l-7 58q-37 16-74 0z"/>
    <ellipse cx="58" cy="76" rx="18" ry="13"/>
    <ellipse cx="142" cy="76" rx="18" ry="13"/>
    <path d="M46 84q-16-10-14-34l14-4q2 22 14 36z"/>
    <path d="M154 84q16-10 14-34l-14-4q-2 22-14 36z"/>
    <ellipse cx="42" cy="60" rx="12" ry="16"/>
    <ellipse cx="158" cy="60" rx="12" ry="16"/>
    <path d="M30 50q6-24 34-26l6 12q-24 4-30 26z"/>
    <path d="M170 50q-6-24-34-26l-6 12q24 4 30 26z"/>
    <circle cx="66" cy="26" r="9"/>
    <circle cx="134" cy="26" r="9"/>
    <path d="M72 128l-6 58h18l12-54z"/>
    <path d="M128 128l6 58h-18l-12-54z"/>
  </g>
  <g class="bb-dettagli" fill="none" stroke="#0a84ff" stroke-width="2.5" stroke-linecap="round" opacity=".9">
    <path d="M100 84v38"/><path d="M86 94h28"/><path d="M87 106h26"/><path d="M89 118h22"/>
    <path d="M70 72q14 8 30 8t30-8"/>
  </g>
</svg>`;

export function mostraBenvenuto({ forza = false } = {}) {
  const oggi = chiaveGiorno(new Date());
  if (!forza && store.get('ultimoBenvenuto', '') === oggi) return false;
  if (document.getElementById('benvenuto')) return false;
  store.set('ultimoBenvenuto', oggi);
  const nome = (impostazioni().nome || 'Riccardo').trim();
  const el = document.createElement('div');
  el.id = 'benvenuto';
  el.className = 'benvenuto';
  el.innerHTML = `
    <div class="bv-figura">${FIGURA}</div>
    <div class="bv-testo">
      <p class="bv-riga bv-1">Ben arrivato in palestra, <b>${nome.replace(/[<>&]/g, '')}</b>.</p>
      <p class="bv-riga bv-2">Anche oggi si fotte il comfort.</p>
      <p class="bv-riga bv-3">Buon allenamento.</p>
    </div>
    <p class="bv-chiudi">tocca per continuare</p>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  let chiuso = false;
  const chiudi = () => {
    if (chiuso) return;
    chiuso = true;
    el.classList.add('via');
    setTimeout(() => el.remove(), 450);
  };
  el.addEventListener('click', chiudi);
  setTimeout(chiudi, 5200);
  return true;
}

// Alla prima apertura del giorno, anche se l'app era rimasta aperta in background
export function avviaBenvenuto() {
  mostraBenvenuto();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') mostraBenvenuto();
  });
}
