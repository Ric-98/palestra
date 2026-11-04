// Importazione dello storico esportato da Hevy (file CSV "workout_data.csv").
import { idDaAlias } from './dati.js';

export function analizzaCsv(testo) {
  const righe = [];
  let riga = [], campo = '', inVirgolette = false;
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i];
    if (inVirgolette) {
      if (c === '"') {
        if (testo[i + 1] === '"') { campo += '"'; i++; }
        else inVirgolette = false;
      } else campo += c;
    } else if (c === '"') inVirgolette = true;
    else if (c === ',') { riga.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && testo[i + 1] === '\n') i++;
      riga.push(campo); campo = '';
      if (riga.some((x) => x !== '')) righe.push(riga);
      riga = [];
    } else campo += c;
  }
  if (campo !== '' || riga.length) { riga.push(campo); if (riga.some((x) => x !== '')) righe.push(riga); }
  if (!righe.length) return [];
  const intestazione = righe[0];
  return righe.slice(1).map((r) => Object.fromEntries(intestazione.map((h, i) => [h, r[i] ?? ''])));
}

const MESI = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
// "30 Oct 2026, 18:35" -> Date locale
export function analizzaDataHevy(s) {
  const m = String(s).trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4}),?\s+(\d{1,2}):(\d{2})$/);
  if (!m) { const d = new Date(s); return isNaN(d) ? null : d; }
  const mese = MESI[m[2].toLowerCase()];
  if (mese === undefined) return null;
  return new Date(Number(m[3]), mese, Number(m[1]), Number(m[4]), Number(m[5]));
}

function hashId(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const num = (v) => { if (v === '' || v === null || v === undefined) return null; const n = Number(String(v).replace(',', '.')); return isFinite(n) ? n : null; };

// Converte le righe del CSV in allenamenti dell'app. Gli esercizi noti vengono
// collegati al catalogo tramite gli alias, gli altri restano con il nome di Hevy.
export function convertiHevy(righe) {
  const gruppi = new Map();
  for (const r of righe) {
    const chiave = `${r.title}|${r.start_time}`;
    if (!gruppi.has(chiave)) gruppi.set(chiave, { righe: [] });
    gruppi.get(chiave).righe.push(r);
  }
  const allenamenti = [];
  let nonCollegati = new Set();
  for (const [chiave, g] of gruppi) {
    const prima = g.righe[0];
    const inizio = analizzaDataHevy(prima.start_time);
    const fine = analizzaDataHevy(prima.end_time);
    if (!inizio) continue;
    const esercizi = [];
    const perNome = new Map();
    for (const r of g.righe) {
      const nome = r.exercise_title;
      if (!perNome.has(nome)) {
        const exId = idDaAlias(nome) || 'hevy:' + nome.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (!idDaAlias(nome)) nonCollegati.add(nome);
        const e = { exId, nome, nota: r.exercise_notes || '', serie: [] };
        perNome.set(nome, e);
        esercizi.push(e);
      }
      const tipo = /warm/i.test(r.set_type) ? 'W' : 'N';
      perNome.get(nome).serie.push({
        tipo,
        kg: num(r.weight_kg),
        reps: num(r.reps),
        rpe: num(r.rpe),
        fatto: true,
        indice: num(r.set_index) ?? 0,
      });
    }
    for (const e of esercizi) e.serie.sort((a, b) => a.indice - b.indice).forEach((s) => delete s.indice);
    allenamenti.push({
      id: 'hevy-' + hashId(chiave),
      titolo: prima.title,
      origine: 'hevy',
      inizio: inizio.toISOString(),
      fine: fine ? fine.toISOString() : inizio.toISOString(),
      note: prima.description || '',
      esercizi,
    });
  }
  allenamenti.sort((a, b) => new Date(a.inizio) - new Date(b.inizio));
  return { allenamenti, nonCollegati: Array.from(nonCollegati) };
}
