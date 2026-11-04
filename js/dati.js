// Dati statici dell'app: catalogo esercizi e schede (file JSON in data/).
// Le schede possono avere modifiche fatte dall'utente, salvate sul dispositivo.
import { store } from './store.js';
let esercizi = null;   // array
let perId = new Map();
let perAlias = new Map();
let schede = null;
let diete = null;
let conversioni = null;
let convPerId = new Map();

async function carica(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Impossibile caricare ' + url);
  return res.json();
}

export async function caricaDati() {
  if (esercizi && schede && diete && conversioni) return;
  const [e, s, d, c] = await Promise.all([carica('data/esercizi.json'), carica('data/schede.json'), carica('data/diete.json'), carica('data/conversioni.json')]);
  esercizi = e;
  schede = s;
  diete = d;
  conversioni = c;
  convPerId = new Map((c.alimenti || []).map((a) => [a.id, a]));
  perId = new Map(e.map((x) => [x.id, x]));
  perAlias = new Map();
  for (const x of e) for (const a of x.alias || []) perAlias.set(a.toLowerCase(), x.id);
}

export function tuttiEsercizi() { return esercizi || []; }
export function esercizio(id) { return perId.get(id) || null; }
export function nomeEsercizio(id, fallback = '') { const e = perId.get(id); return e ? e.nome : fallback; }
export function idDaAlias(nome) { return perAlias.get(String(nome).toLowerCase()) || null; }

// ---- Schede e modifiche dell'utente ----
function tutteModifiche() { return store.get('schedeModifiche', {}) || {}; }
export function modificheScheda(id) { return tutteModifiche()[id] || { giorni: {}, aggiunti: [], rimossi: [] }; }
function salvaModifiche(id, m) { const t = tutteModifiche(); t[id] = m; store.set('schedeModifiche', t); }

function applicaModifiche(s) {
  const m = tutteModifiche()[s.id];
  if (!m) return s;
  const rimossi = new Set(m.rimossi || []);
  const sovr = (g) => (m.giorni && m.giorni[g.id] ? { ...g, ...m.giorni[g.id], modificato: true } : g);
  const giorni = (s.giorni || []).filter((g) => !rimossi.has(g.id)).map(sovr);
  const aggiunti = (m.aggiunti || []).filter((g) => !rimossi.has(g.id)).map((g) => ({ ...sovr(g), aggiunto: true }));
  const extra = (s.extra || []).filter((g) => !rimossi.has(g.id)).map(sovr);
  return { ...s, nome: m.nome || s.nome, giorni: [...giorni, ...aggiunti], extra, modificata: true };
}
export function tutteSchede() { return (schede || []).map(applicaModifiche); }
export function schedaAttiva() { const s = (schede || []).find((x) => x.attiva) || (schede || [])[0] || null; return s ? applicaModifiche(s) : null; }
export function scheda(id) { const s = (schede || []).find((x) => x.id === id) || null; return s ? applicaModifiche(s) : null; }
export function schedaOriginale(id) { return (schede || []).find((x) => x.id === id) || null; }
export function giorno(schedaId, giornoId) {
  const s = scheda(schedaId);
  if (!s) return null;
  return (s.giorni || []).find((g) => g.id === giornoId) || (s.extra || []).find((g) => g.id === giornoId) || null;
}
export function giornoOriginale(schedaId, giornoId) {
  const s = schedaOriginale(schedaId);
  if (!s) return null;
  return (s.giorni || []).find((g) => g.id === giornoId) || (s.extra || []).find((g) => g.id === giornoId) || null;
}
export function haModifiche(schedaId) {
  const m = tutteModifiche()[schedaId];
  return !!(m && (Object.keys(m.giorni || {}).length || (m.aggiunti || []).length || (m.rimossi || []).length || m.nome));
}
// Salva la versione modificata di un giorno (nome + esercizi)
export function salvaGiorno(schedaId, giornoId, dati) {
  const m = modificheScheda(schedaId);
  m.giorni = m.giorni || {};
  m.giorni[giornoId] = { nome: dati.nome, esercizi: dati.esercizi };
  salvaModifiche(schedaId, m);
}
export function aggiungiGiorno(schedaId, nome) {
  const m = modificheScheda(schedaId);
  const id = 'g-' + Date.now().toString(36);
  m.aggiunti = [...(m.aggiunti || []), { id, nome, esercizi: [] }];
  salvaModifiche(schedaId, m);
  return id;
}
export function rimuoviGiorno(schedaId, giornoId) {
  const m = modificheScheda(schedaId);
  m.rimossi = Array.from(new Set([...(m.rimossi || []), giornoId]));
  if (m.giorni) delete m.giorni[giornoId];
  m.aggiunti = (m.aggiunti || []).filter((g) => g.id !== giornoId);
  salvaModifiche(schedaId, m);
}
export function ripristinaGiorno(schedaId, giornoId) {
  const m = modificheScheda(schedaId);
  if (m.giorni) delete m.giorni[giornoId];
  m.rimossi = (m.rimossi || []).filter((x) => x !== giornoId);
  salvaModifiche(schedaId, m);
}
export function ripristinaScheda(schedaId) {
  const t = tutteModifiche();
  delete t[schedaId];
  store.set('schedeModifiche', t);
}

// "3x6-10" -> [{reps:"6-10"},...]; ["10","10",{reps:"20",nota:"..."}] -> oggetti
export function espandiSerie(serie) {
  if (typeof serie === 'string') {
    const m = serie.match(/^(\d+)\s*x\s*(.+)$/i);
    if (m) return Array.from({ length: Number(m[1]) }, () => ({ reps: m[2].trim() }));
    return [{ reps: serie.trim() }];
  }
  if (Array.isArray(serie)) {
    return serie.map((s) => (typeof s === 'string' ? { reps: s } : { reps: String(s.reps || ''), nota: s.nota || '', tipo: s.tipo || 'N' }));
  }
  return [];
}

// Riassunto tipo "2x6-10 · 1x12" per le liste
export function riassuntoSerie(serie) {
  const arr = espandiSerie(serie);
  const out = [];
  for (const s of arr) {
    const last = out[out.length - 1];
    if (last && last.reps === s.reps && !s.nota && !last.nota) last.n++;
    else out.push({ n: 1, reps: s.reps, nota: s.nota || '' });
  }
  return out.map((o) => `${o.n}x${o.reps}${o.nota ? ' ' + o.nota : ''}`).join(' · ');
}

// ---- Diete ----
export function tutteDiete() { return diete || []; }
export function dietaAttiva() { return (diete || []).find((d) => d.attiva) || (diete || [])[0] || null; }
export function dieta(id) { return (diete || []).find((d) => d.id === id) || null; }

// ---- Conversioni crudo/cotto ----
export function tabellaConversioni() { return conversioni || { alimenti: [], metodi: {} }; }
export function alimentoConv(id) { return convPerId.get(id) || null; }
export const METODI = ['bollito', 'vapore', 'padella', 'arrosto', 'microonde'];
export function fonteConv(id) { const f = (conversioni && conversioni.fonti) || {}; return f[id] || null; }

// Converte un peso. verso: 'crudo-cotto' (default) oppure 'cotto-crudo'.
// Se il metodo scelto non esiste per l'alimento usa l'altro e lo dice nel risultato.
export function convertiPeso(grammi, alimentoId, metodo = 'bollito', verso = 'crudo-cotto', fattorePersonalizzato = null) {
  const g = Number(grammi);
  if (!isFinite(g) || g <= 0) return null;
  let fattore = fattorePersonalizzato;
  let metodoUsato = metodo;
  if (!fattore) {
    const a = alimentoConv(alimentoId);
    if (!a) return null;
    if (a[metodo]) fattore = a[metodo];
    else {
      const altro = METODI.find((m) => a[m]);
      if (!altro) return null;
      fattore = a[altro];
      metodoUsato = altro;
    }
  }
  const risultato = verso === 'cotto-crudo' ? g / fattore : g * fattore;
  return { g: Math.round(risultato), esatto: risultato, fattore, metodo: metodoUsato, verso };
}
