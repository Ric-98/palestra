// Storico allenamenti: salvataggio, statistiche, "precedente" e record.
import { store } from './store.js';
import { esercizio } from './dati.js';

const CHIAVE = 'allenamenti';

export function tutti() {
  const arr = store.get(CHIAVE, []);
  return arr.slice().sort((a, b) => new Date(b.inizio) - new Date(a.inizio));
}
export function perId(id) { return store.get(CHIAVE, []).find((a) => a.id === id) || null; }
export function salva(a) {
  const arr = store.get(CHIAVE, []);
  const i = arr.findIndex((x) => x.id === a.id);
  if (i >= 0) arr[i] = a; else arr.push(a);
  return store.set(CHIAVE, arr);
}
export function salvaMolti(nuovi) {
  const arr = store.get(CHIAVE, []);
  const ids = new Set(arr.map((a) => a.id));
  let aggiunti = 0;
  for (const a of nuovi) if (!ids.has(a.id)) { arr.push(a); ids.add(a.id); aggiunti++; }
  store.set(CHIAVE, arr);
  return aggiunti;
}
export function elimina(id) {
  store.set(CHIAVE, store.get(CHIAVE, []).filter((a) => a.id !== id));
}
export function eliminaOrigine(origine) {
  const arr = store.get(CHIAVE, []);
  const resto = arr.filter((a) => a.origine !== origine);
  store.set(CHIAVE, resto);
  return arr.length - resto.length;
}

export const nuovoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function oneRm(kg, reps) {
  if (!kg || !reps) return 0;
  if (reps === 1) return kg;
  return kg * (1 + reps / 30); // formula di Epley
}

export function statistiche(a) {
  let volume = 0, serie = 0, allenanti = 0;
  for (const e of a.esercizi || []) {
    for (const s of e.serie || []) {
      if (!s.fatto) continue;
      serie++;
      if (s.tipo !== 'W') allenanti++;
      if (s.kg && s.reps) volume += Number(s.kg) * Number(s.reps);
    }
  }
  const durataSec = a.inizio && a.fine ? Math.max(0, Math.round((new Date(a.fine) - new Date(a.inizio)) / 1000)) : 0;
  return { volume: Math.round(volume), serie, allenanti, durataSec };
}

export function formattaDurata(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}h ${String(m).padStart(2, '0')}min`;
  if (m) return `${m}min${s ? ' ' + s + 's' : ''}`;
  return `${s}s`;
}
export function formattaOrologio(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0');
}
export function formattaKg(n) {
  const v = Number(n);
  if (!isFinite(v)) return '';
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100).replace('.', ',');
}

// Ultima volta che l'esercizio è stato fatto (escluso l'allenamento con id escludiId)
export function precedente(exId, escludiId = null) {
  for (const a of tutti()) {
    if (a.id === escludiId) continue;
    const e = (a.esercizi || []).find((x) => x.exId === exId);
    if (e && (e.serie || []).some((s) => s.fatto)) {
      return { data: a.inizio, serie: e.serie.filter((s) => s.fatto), nota: e.nota || '' };
    }
  }
  return null;
}

// Set precedente corrispondente: stesso tipo, stesso indice dentro il tipo
export function setPrecedente(prev, tipo, indiceNelTipo) {
  if (!prev) return null;
  const stessi = prev.serie.filter((s) => (s.tipo || 'N') === tipo);
  return stessi[indiceNelTipo] || stessi[stessi.length - 1] || null;
}

// Record personali su tutte le serie allenanti fatte (kg massimo e 1RM stimato)
export function record(exId, escludiId = null) {
  let kgMax = 0, rmMax = 0, volumeSetMax = 0;
  for (const a of tutti()) {
    if (a.id === escludiId) continue;
    for (const e of a.esercizi || []) {
      if (e.exId !== exId) continue;
      for (const s of e.serie || []) {
        if (!s.fatto || s.tipo === 'W' || !s.kg) continue;
        const kg = Number(s.kg), reps = Number(s.reps) || 0;
        if (kg > kgMax) kgMax = kg;
        const rm = oneRm(kg, reps);
        if (rm > rmMax) rmMax = rm;
        if (kg * reps > volumeSetMax) volumeSetMax = kg * reps;
      }
    }
  }
  return { kgMax, rmMax, volumeSetMax };
}

export function inizioSettimana(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // lunedì
  return x;
}

export function allenamentiSettimana() {
  const da = inizioSettimana();
  return tutti().filter((a) => new Date(a.inizio) >= da);
}

// Quante volte questa settimana è stato fatto almeno un esercizio del blocco
export function volteBloccoSettimana(blocco) {
  const ids = new Set((blocco.esercizi || []).map((e) => e.ex));
  return allenamentiSettimana().filter((a) => (a.esercizi || []).some((e) => ids.has(e.exId) && (e.serie || []).some((s) => s.fatto))).length;
}

export function nomeEsercizioLog(e) {
  const cat = esercizio(e.exId);
  return cat ? cat.nome : (e.nome || e.exId);
}

// ---- Aggregazioni per statistiche ----
export function repsTotali(a) {
  let n = 0;
  for (const e of a.esercizi || []) for (const s of e.serie || []) if (s.fatto) n += Number(s.reps) || 0;
  return n;
}

// Ultime n settimane (lunedì-domenica), dalla più vecchia alla corrente
export function perSettimana(nSettimane) {
  const inizio = inizioSettimana();
  inizio.setDate(inizio.getDate() - 7 * (nSettimane - 1));
  const settimane = Array.from({ length: nSettimane }, (_, i) => {
    const da = new Date(inizio); da.setDate(da.getDate() + 7 * i);
    return { da, durataSec: 0, volume: 0, reps: 0, allenamenti: 0 };
  });
  for (const a of tutti()) {
    const d = new Date(a.inizio);
    if (d < inizio) continue;
    const i = Math.floor((d - inizio) / (7 * 86400000));
    if (i < 0 || i >= nSettimane) continue;
    const st = statistiche(a);
    settimane[i].durataSec += st.durataSec;
    settimane[i].volume += st.volume;
    settimane[i].reps += repsTotali(a);
    settimane[i].allenamenti += 1;
  }
  return settimane;
}

export function perMese(nMesi) {
  const oggi = new Date();
  const mesi = [];
  for (let i = nMesi - 1; i >= 0; i--) {
    const d = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1);
    mesi.push({ anno: d.getFullYear(), mese: d.getMonth(), allenamenti: 0, durataSec: 0, volume: 0 });
  }
  for (const a of tutti()) {
    const d = new Date(a.inizio);
    const m = mesi.find((x) => x.anno === d.getFullYear() && x.mese === d.getMonth());
    if (!m) continue;
    const st = statistiche(a);
    m.allenamenti++; m.durataSec += st.durataSec; m.volume += st.volume;
  }
  return mesi;
}

export function totali() {
  let durataSec = 0, volume = 0, serie = 0, reps = 0;
  const arr = tutti();
  for (const a of arr) { const st = statistiche(a); durataSec += st.durataSec; volume += st.volume; serie += st.serie; reps += repsTotali(a); }
  return { allenamenti: arr.length, durataSec, volume, serie, reps };
}

// Storico per esercizio: una voce per allenamento, dal più recente
export function storicoEsercizio(exId) {
  const out = [];
  for (const a of tutti()) {
    const e = (a.esercizi || []).find((x) => x.exId === exId);
    if (!e) continue;
    const fatte = (e.serie || []).filter((s) => s.fatto);
    if (!fatte.length) continue;
    const allenanti = fatte.filter((s) => s.tipo !== 'W' && s.kg);
    const kgMax = allenanti.reduce((m, s) => Math.max(m, Number(s.kg)), 0);
    const rmMax = allenanti.reduce((m, s) => Math.max(m, oneRm(Number(s.kg), Number(s.reps) || 0)), 0);
    const volume = fatte.reduce((m, s) => m + (Number(s.kg) || 0) * (Number(s.reps) || 0), 0);
    out.push({ id: a.id, titolo: a.titolo, data: a.inizio, serie: fatte, kgMax, rmMax, volume });
  }
  return out;
}

// Riepilogo di tutti gli esercizi fatti almeno una volta
export function riepilogoEsercizi() {
  const mappa = new Map();
  for (const a of tutti()) {
    for (const e of a.esercizi || []) {
      const fatte = (e.serie || []).filter((s) => s.fatto);
      if (!fatte.length) continue;
      if (!mappa.has(e.exId)) mappa.set(e.exId, { exId: e.exId, nome: nomeEsercizioLog(e), sessioni: 0, ultima: a.inizio, kgMax: 0 });
      const r = mappa.get(e.exId);
      r.sessioni++;
      if (new Date(a.inizio) > new Date(r.ultima)) r.ultima = a.inizio;
      for (const s of fatte) if (s.tipo !== 'W' && s.kg) r.kgMax = Math.max(r.kgMax, Number(s.kg));
    }
  }
  return Array.from(mappa.values()).sort((x, y) => new Date(y.ultima) - new Date(x.ultima));
}

export function allenamentiDelGiorno(d) {
  const k = chiaveGiorno(d);
  return tutti().filter((a) => chiaveGiorno(new Date(a.inizio)) === k);
}
export function chiaveGiorno(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function giorniAllenati() {
  const set = new Map();
  for (const a of tutti()) { const k = chiaveGiorno(new Date(a.inizio)); set.set(k, (set.get(k) || 0) + 1); }
  return set;
}
