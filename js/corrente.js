// Allenamento in corso: viene salvato a ogni modifica, così si riprende anche se l'app si chiude.
import { store } from './store.js';
import { esercizio, espandiSerie } from './dati.js';
import { nuovoId, tutti, statistiche } from './allenamenti.js';

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
  if (voce.avvicinamento === true) serie.push({ tipo: 'W', kg: '', reps: '', rpe: null, fatto: false, target: '' });
  for (const p of pianificate) serie.push({ tipo: p.tipo === 'W' ? 'W' : 'N', kg: '', reps: '', rpe: null, fatto: false, target: p.reps || '', notaSet: p.nota || '' });
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

// Stima della durata: 40 secondi di lavoro per ogni set più il riposo dopo ogni set
// (nelle superserie il riposo conta solo dopo il secondo esercizio della coppia).
export const SECONDI_PER_SET = 40;

// La formula "teorica" (40 s per set + riposo) sottostima: non conta cambi macchina,
// preparazione e serie non registrate. Il fattore di ritmo la corregge con la mediana di
// durata reale / durata teorica sugli ultimi allenamenti (preferendo quelli fatti con l'app).
let cacheFattore = { n: -1, valore: 1.9 };
function teoricoFatto(a) {
  let sec = 0;
  (a.esercizi || []).forEach((e, i) => {
    const n = (e.serie || []).filter((s) => s.fatto).length;
    const cat = esercizio(e.exId);
    const riposo = e.riposo !== undefined && e.riposo !== null ? e.riposo : (cat ? cat.riposo : 120);
    const next = (a.esercizi || [])[i + 1];
    const primoDiSuperset = !!(e.superset && next && next.superset === e.superset);
    sec += n * (SECONDI_PER_SET + (primoDiSuperset ? 0 : (riposo || 0)));
  });
  return sec;
}
export function fattoreRitmo() {
  const lista = tutti();
  if (cacheFattore.n === lista.length) return cacheFattore.valore;
  const rapporti = (arr) => arr.map((a) => {
    const st = statistiche(a);
    const teorico = teoricoFatto(a);
    if (st.durataSec < 600 || st.serie < 5 || !teorico) return null;
    return st.durataSec / teorico;
  }).filter((x) => x !== null);
  let r = rapporti(lista.filter((a) => a.origine !== 'hevy').slice(0, 10));
  if (r.length < 3) r = rapporti(lista.slice(0, 20));
  let valore = 1.9;
  if (r.length) {
    r.sort((x, y) => x - y);
    valore = r.length % 2 ? r[(r.length - 1) / 2] : (r[r.length / 2 - 1] + r[r.length / 2]) / 2;
    valore = Math.max(1, Math.min(3, valore));
  }
  cacheFattore = { n: lista.length, valore };
  return valore;
}

export function stimaDurataSec(esercizi) {
  let sec = 0;
  esercizi.forEach((e, i) => {
    const n = (e.serie || []).length;
    const next = esercizi[i + 1];
    const primoDiSuperset = !!(e.superset && next && next.superset === e.superset);
    sec += n * (SECONDI_PER_SET + (primoDiSuperset ? 0 : (e.riposo || 0)));
  });
  return Math.round(sec * fattoreRitmo());
}
export function stimaDurataVoci(voci) {
  return stimaDurataSec((voci || []).map(esercizioDaPiano));
}

export function nuovoAllenamento({ titolo, schedaId = null, giornoId = null, voci = [] }) {
  const esercizi = voci.map(esercizioDaPiano);
  return {
    id: nuovoId(),
    titolo,
    schedaId,
    giornoId,
    inizio: new Date().toISOString(),
    fine: null,
    note: '',
    stimatoSec: stimaDurataSec(esercizi),
    sforamentoSec: 0,
    esercizi,
  };
}
