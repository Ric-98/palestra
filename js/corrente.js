// Allenamento in corso: viene salvato a ogni modifica, così si riprende anche se l'app si chiude.
import { store } from './store.js';
import { esercizio, espandiSerie } from './dati.js';
import { nuovoId } from './allenamenti.js';

const K = 'allenamentoInCorso';

export function inCorso() { return store.get(K, null); }
export function salvaInCorso(w) { store.set(K, w); }
export function azzeraInCorso() { store.remove(K); }

// Preferenze per esercizio decise dall'utente (riposo, nota) che restano tra un allenamento e l'altro
export function prefEsercizio(exId) { return (store.get('prefEsercizi', {}) || {})[exId] || {}; }
export function salvaPrefEsercizio(exId, patch) {
  const tutte = store.get('prefEsercizi', {}) || {};
  tutte[exId] = { ...(tutte[exId] || {}), ...patch };
  store.set('prefEsercizi', tutte);
}

// Da una voce della scheda ({ex, serie, superset, nota, avvicinamento}) a un esercizio del registro
export function esercizioDaPiano(voce) {
  const cat = esercizio(voce.ex) || { id: voce.ex, nome: voce.ex, gruppo: '', riposo: 120 };
  const pref = prefEsercizio(cat.id);
  const pianificate = espandiSerie(voce.serie || '3x10');
  const serie = [];
  if (voce.avvicinamento !== false) serie.push({ tipo: 'W', kg: '', reps: '', rpe: null, fatto: false, target: '' });
  for (const p of pianificate) serie.push({ tipo: 'N', kg: '', reps: '', rpe: null, fatto: false, target: p.reps || '', notaSet: p.nota || '' });
  return {
    exId: cat.id,
    nome: cat.nome,
    gruppo: cat.gruppo || '',
    superset: voce.superset || null,
    riposo: pref.riposo !== undefined ? pref.riposo : (cat.riposo || 120),
    nota: [voce.nota, pref.nota].filter(Boolean).join(' · '),
    serie,
  };
}

export function nuovoAllenamento({ titolo, schedaId = null, giornoId = null, voci = [] }) {
  return {
    id: nuovoId(),
    titolo,
    schedaId,
    giornoId,
    inizio: new Date().toISOString(),
    fine: null,
    note: '',
    esercizi: voci.map(esercizioDaPiano),
  };
}
