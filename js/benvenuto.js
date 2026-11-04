// Saluto animato alla prima apertura del giorno.
import { store, impostazioni } from './store.js';
import { chiaveGiorno } from './allenamenti.js';

const FIGURA = `<div class="bb-alone"></div><img class="bb-corpo" src="icons/bodybuilder.svg" alt="">`;

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
