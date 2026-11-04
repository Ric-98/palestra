import { route, avviaRouter } from './router.js';
import { richiediPersistenza } from './store.js';
import { renderAllenamento } from './views/allenamento.js';
import { renderAlimentazione } from './views/alimentazione.js';
import { renderProfilo } from './views/profilo.js';

const view = document.getElementById('view');
const tabs = Array.from(document.querySelectorAll('.tabbar .tab'));

route('/allenamento', renderAllenamento);
route('/alimentazione', renderAlimentazione);
route('/profilo', renderProfilo);

avviaRouter('/allenamento', (path, r, params) => {
  const tab = path.split('/')[1];
  for (const a of tabs) {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  view.innerHTML = '';
  r.handler(view, params);
  window.scrollTo(0, 0);
});

richiediPersistenza();

// ---- Aggiornamenti automatici (service worker) ----
let swReg = null;
let bloccoAutoAggiornamento = false; // lo step 2 lo alza durante un allenamento
let ricaricando = false;
let workerInAttesa = null;

export function bloccaAutoAggiornamento(valore) {
  bloccoAutoAggiornamento = !!valore;
  if (!bloccoAutoAggiornamento && workerInAttesa) applicaAggiornamento(workerInAttesa);
}

function applicaAggiornamento(worker) {
  worker.postMessage({ tipo: 'SKIP_WAITING' });
}

function nuovaVersionePronta(worker) {
  workerInAttesa = worker;
  if (!bloccoAutoAggiornamento) { applicaAggiornamento(worker); return; }
  const banner = document.getElementById('update-banner');
  banner.hidden = false;
  document.getElementById('update-btn').onclick = () => { banner.hidden = true; applicaAggiornamento(worker); };
}

async function registraServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  let avevaController = !!navigator.serviceWorker.controller;
  try {
    swReg = await navigator.serviceWorker.register('sw.js');
    if (swReg.waiting && avevaController) nuovaVersionePronta(swReg.waiting);
    swReg.addEventListener('updatefound', () => {
      const nuovo = swReg.installing;
      if (!nuovo) return;
      nuovo.addEventListener('statechange', () => {
        if (nuovo.state === 'installed' && navigator.serviceWorker.controller) nuovaVersionePronta(nuovo);
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!avevaController) { avevaController = true; return; } // prima installazione: niente ricarica
      if (ricaricando) return;
      ricaricando = true;
      location.reload();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') swReg.update().catch(() => {});
    });
  } catch (e) {
    console.warn('Service worker non registrato', e);
  }
}

export async function controllaAggiornamenti() {
  if (!swReg) return 'non-disponibile';
  try {
    await swReg.update();
  } catch (e) {
    return 'non-disponibile';
  }
  return (swReg.installing || swReg.waiting) ? 'trovato' : 'aggiornato';
}

registraServiceWorker();
