// Service worker: cache versionata dell'app, aggiornamento automatico.
const VERSION = '2026-11-04.2136';
const CACHE = 'palestra-' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/router.js',
  './js/store.js',
  './js/ui.js',
  './js/version.js',
  './js/dati.js',
  './js/allenamenti.js',
  './js/corrente.js',
  './js/hevy.js',
  './js/storico-incluso.js',
  './js/benvenuto.js',
  './js/timer.js',
  './js/grafici.js',
  './js/misure.js',
  './js/views/allenamento.js',
  './js/views/scheda.js',
  './js/views/modifica.js',
  './js/views/allena.js',
  './js/views/storico.js',
  './js/views/alimentazione.js',
  './js/views/dieta.js',
  './js/views/convertitore.js',
  './js/views/profilo.js',
  './js/views/statistiche.js',
  './js/views/esercizi.js',
  './js/views/misure.js',
  './js/views/calendario.js',
  './data/esercizi.json',
  './data/storico-hevy.json',
  './data/schede.json',
  './data/diete.json',
  './data/conversioni.json',
  './icons/bodybuilder.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

const urlDi = (p) => new URL(p, self.location).href;
// In locale (sviluppo) si va sempre in rete, così le modifiche si vedono subito.
const SVILUPPO = ['localhost', '127.0.0.1'].includes(self.location.hostname);
const INDEX = urlDi('./index.html');

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async (p) => {
      const res = await fetch(new Request(urlDi(p), { cache: 'reload' }));
      if (!res.ok) throw new Error('Impossibile scaricare ' + p + ' (' + res.status + ')');
      await cache.put(urlDi(p), res);
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const chiavi = await caches.keys();
    await Promise.all(chiavi.filter((k) => k.startsWith('palestra-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.tipo === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || SVILUPPO) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isNav = req.mode === 'navigate';
    const cached = await cache.match(isNav ? INDEX : req.url, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res.ok && !isNav) cache.put(req, res.clone());
      return res;
    } catch (e) {
      if (isNav) {
        const idx = await cache.match(INDEX);
        if (idx) return idx;
      }
      return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
  })());
});
