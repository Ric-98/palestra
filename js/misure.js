// Misure corporee: peso e circonferenze, salvate sul dispositivo.
import { store } from './store.js';
import { nuovoId } from './allenamenti.js';

export const CAMPI = [
  { id: 'peso', nome: 'Peso', unita: 'kg' },
  { id: 'vita', nome: 'Vita', unita: 'cm' },
  { id: 'petto', nome: 'Petto', unita: 'cm' },
  { id: 'fianchi', nome: 'Fianchi', unita: 'cm' },
  { id: 'braccio', nome: 'Braccio', unita: 'cm' },
  { id: 'coscia', nome: 'Coscia', unita: 'cm' },
];

export function tutte() {
  return (store.get('misure', []) || []).slice().sort((a, b) => new Date(b.data) - new Date(a.data));
}
export function salva(m) {
  const arr = store.get('misure', []) || [];
  const i = arr.findIndex((x) => x.id === m.id);
  if (i >= 0) arr[i] = m; else arr.push(m);
  store.set('misure', arr);
}
export function elimina(id) {
  store.set('misure', (store.get('misure', []) || []).filter((x) => x.id !== id));
}
export function nuova(valori, data) {
  return { id: nuovoId(), data: data || new Date().toISOString(), ...valori };
}
// Ultimo valore disponibile per campo
export function ultimi() {
  const out = {};
  for (const m of tutte()) for (const c of CAMPI) if (out[c.id] === undefined && m[c.id] !== undefined && m[c.id] !== null && m[c.id] !== '') out[c.id] = m[c.id];
  return out;
}
