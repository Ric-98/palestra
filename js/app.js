import { route, avviaRouter } from './router.js';
import { richiediPersistenza } from './store.js';
import { caricaDati } from './dati.js';
import { caricaStoricoIncluso } from './storico-incluso.js';
import { avviaBenvenuto } from './benvenuto.js';
import { renderAllenamento } from './views/allenamento.js';
import { renderGiorno } from './views/scheda.js';
import { renderModifica } from './views/modifica.js';
import { renderAllena } from './views/allena.js';
import { renderStorico, renderDettaglio } from './views/storico.js';
import { renderAlimentazione } from './views/alimentazione.js';
import { renderDieta } from './views/dieta.js';
import { renderConvertitore } from './views/convertitore.js';
import { renderProfilo } from './views/profilo.js';
import { renderStatistiche } from './views/statistiche.js';
import { renderEsercizi, renderEsercizio } from './views/esercizi.js';
import { renderMisure } from './views/misure.js';
import { renderCalendario } from './views/calendario.js';

const view = document.getElementById('view');
const tabs = Array.from(document.querySelectorAll('.tabbar .tab'));

route('/allenamento', renderAllenamento);
route('/giorno/:scheda/:giorno', renderGiorno);
route('/modifica/:scheda/:giorno', renderModifica);
route('/allena', renderAllena);
route('/storico', renderStorico);
route('/storico/:id', renderDettaglio);
route('/alimentazione', renderAlimentazione);
route('/dieta/:id', renderDieta);
route('/dieta/:id/:pasto', renderDieta);
route('/convertitore', renderConvertitore);
route('/convertitore/:alimento/:g', renderConvertitore);
route('/profilo', renderProfilo);
route('/statistiche', renderStatistiche);
route('/esercizi', renderEsercizi);
route('/esercizio/:id', renderEsercizio);
route('/misure', renderMisure);
route('/calendario', renderCalendario);

// Profondità delle schermate per decidere la direzione della transizione
const PROFONDITA = { allenamento: 0, alimentazione: 0, profilo: 0, allena: 2, esercizio: 2, modifica: 2 };
function profondita(path) {
  const segs = path.split('/').filter(Boolean);
  let d = PROFONDITA[segs[0]];
  if (d === undefined) d = 1;
  if (segs[0] === 'storico' && segs.length > 1) d = 2;
  return d;
}
let pathPrecedente = null;
const riduciMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const TAB_DI = { allenamento: 'allenamento', giorno: 'allenamento', modifica: 'allenamento', allena: 'allenamento', storico: 'allenamento', alimentazione: 'alimentazione', dieta: 'alimentazione', convertitore: 'alimentazione', profilo: 'profilo', statistiche: 'profilo', esercizi: 'profilo', esercizio: 'profilo', misure: 'profilo', calendario: 'profilo' };
let smonta = null;

async function avvia() {
  avviaBenvenuto(); // prima di tutto, così non si vede la schermata sotto
  try {
    await caricaDati();
    await caricaStoricoIncluso();
  } catch (e) {
    view.innerHTML = '<div class="empty"><h3>Dati non caricati</h3><p>Controlla la connessione e riapri l\'app.</p></div>';
    console.error(e);
    return;
  }
  avviaRouter('/allenamento', (path, r, params) => {
    const tab = TAB_DI[path.split('/')[1]] || '';
    for (const a of tabs) {
      if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    const disegna = () => {
      if (typeof smonta === 'function') { try { smonta(); } catch (e) { console.warn(e); } }
      smonta = null;
      view.innerHTML = '';
      const esito = r.handler(view, params);
      if (typeof esito === 'function') smonta = esito;
      window.scrollTo(0, 0);
    };
    const primaVolta = pathPrecedente === null;
    const dPrima = primaVolta ? 0 : profondita(pathPrecedente);
    const dDopo = profondita(path);
    document.documentElement.dataset.nav = dDopo > dPrima ? 'avanti' : dDopo < dPrima ? 'indietro' : 'tab';
    pathPrecedente = path;
    if (!primaVolta && !riduciMovimento && typeof document.startViewTransition === 'function') {
      document.startViewTransition(disegna);
    } else {
      disegna();
    }
  });
}

richiediPersistenza();
avvia();

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
