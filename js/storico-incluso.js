// Storico pubblicato insieme all'app (data/storico-hevy.json): viene caricato
// nella memoria del dispositivo una volta per versione del file.
import { store } from './store.js';
import { salvaMolti } from './allenamenti.js';

export async function caricaStoricoIncluso() {
  try {
    const res = await fetch('data/storico-hevy.json');
    if (!res.ok) return 0;
    const dati = await res.json();
    const versione = String(dati.versione || '');
    if (store.get('storicoInclusoVersione', '') === versione) return 0;
    const n = salvaMolti(dati.allenamenti || []);
    store.set('storicoInclusoVersione', versione);
    return n;
  } catch (e) {
    console.warn('storico incluso', e);
    return 0;
  }
}
