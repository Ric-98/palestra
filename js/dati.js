// Dati statici dell'app: catalogo esercizi e schede (file JSON in data/).
let esercizi = null;   // array
let perId = new Map();
let perAlias = new Map();
let schede = null;

async function carica(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Impossibile caricare ' + url);
  return res.json();
}

export async function caricaDati() {
  if (esercizi && schede) return;
  const [e, s] = await Promise.all([carica('data/esercizi.json'), carica('data/schede.json')]);
  esercizi = e;
  schede = s;
  perId = new Map(e.map((x) => [x.id, x]));
  perAlias = new Map();
  for (const x of e) for (const a of x.alias || []) perAlias.set(a.toLowerCase(), x.id);
}

export function tuttiEsercizi() { return esercizi || []; }
export function esercizio(id) { return perId.get(id) || null; }
export function nomeEsercizio(id, fallback = '') { const e = perId.get(id); return e ? e.nome : fallback; }
export function idDaAlias(nome) { return perAlias.get(String(nome).toLowerCase()) || null; }

export function tutteSchede() { return schede || []; }
export function schedaAttiva() { return (schede || []).find((s) => s.attiva) || (schede || [])[0] || null; }
export function scheda(id) { return (schede || []).find((s) => s.id === id) || null; }
export function giorno(schedaId, giornoId) {
  const s = scheda(schedaId);
  if (!s) return null;
  return (s.giorni || []).find((g) => g.id === giornoId) || (s.extra || []).find((g) => g.id === giornoId) || null;
}

// "3x6-10" -> [{reps:"6-10"},...]; ["10","10",{reps:"20",nota:"..."}] -> oggetti
export function espandiSerie(serie) {
  if (typeof serie === 'string') {
    const m = serie.match(/^(\d+)\s*x\s*(.+)$/i);
    if (m) return Array.from({ length: Number(m[1]) }, () => ({ reps: m[2].trim() }));
    return [{ reps: serie.trim() }];
  }
  if (Array.isArray(serie)) {
    return serie.map((s) => (typeof s === 'string' ? { reps: s } : { reps: String(s.reps || ''), nota: s.nota || '' }));
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
