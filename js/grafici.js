// Grafici SVG minimi (barre e linee), senza librerie.
import { esc } from './ui.js';

function scalaBella(max, passiDesiderati = 4) {
  if (max <= 0) return { passo: 1, top: 1 };
  const grezzo = max / passiDesiderati;
  const pot = Math.pow(10, Math.floor(Math.log10(grezzo)));
  const candidati = [1, 2, 2.5, 5, 10].map((c) => c * pot);
  const passo = candidati.find((c) => c >= grezzo) || candidati[candidati.length - 1];
  return { passo, top: Math.ceil(max / passo) * passo };
}

export function formattaCompatto(v) {
  if (v >= 10000) return Math.round(v / 1000) + 'k';
  if (v >= 1000) return (Math.round(v / 100) / 10).toString().replace('.', ',') + 'k';
  if (Number.isInteger(v)) return String(v);
  return (Math.round(v * 10) / 10).toString().replace('.', ',');
}

// serie: [{ etichetta, valore, evidenzia? }]
export function graficoBarre({ serie, formatoY = formattaCompatto, ogniEtichetta = 2, altezza = 200, larghezza = 360 }) {
  const padL = 46, padR = 6, padT = 12, padB = 26;
  const w = larghezza, h = altezza;
  const n = Math.max(1, serie.length);
  const max = Math.max(0, ...serie.map((s) => s.valore || 0));
  const { passo, top } = scalaBella(max);
  const areaH = h - padT - padB, areaW = w - padL - padR;
  const y = (v) => padT + areaH - (top ? (v / top) * areaH : 0);
  const slot = areaW / n;
  const bw = Math.max(3, Math.min(28, slot * 0.62));
  let out = `<svg class="grafico" viewBox="0 0 ${w} ${h}" role="img">`;
  for (let v = 0; v <= top + 1e-9; v += passo) {
    const yy = y(v);
    out += `<line x1="${padL}" x2="${w - padR}" y1="${yy}" y2="${yy}" class="g-griglia"/>`;
    out += `<text x="${padL - 8}" y="${yy + 4}" class="g-asse" text-anchor="end">${esc(formatoY(v))}</text>`;
  }
  serie.forEach((s, i) => {
    const x = padL + slot * i + (slot - bw) / 2;
    const yy = y(s.valore || 0);
    const hh = Math.max(0, padT + areaH - yy);
    out += `<rect x="${x}" y="${yy}" width="${bw}" height="${hh}" rx="3" class="g-barra ${s.evidenzia ? 'on' : ''}"><title>${esc(s.etichetta)}: ${esc(formatoY(s.valore || 0))}</title></rect>`;
    if (i % ogniEtichetta === 0) out += `<text x="${x + bw / 2}" y="${h - 8}" class="g-asse" text-anchor="middle">${esc(s.etichetta)}</text>`;
  });
  return out + '</svg>';
}

// punti: [{ etichetta, valore }] in ordine temporale
export function graficoLinea({ punti, formatoY = formattaCompatto, altezza = 200, larghezza = 360, maxEtichette = 5 }) {
  const padL = 46, padR = 12, padT = 14, padB = 26;
  const w = larghezza, h = altezza;
  const n = punti.length;
  if (!n) return `<svg class="grafico" viewBox="0 0 ${w} ${h}"><text x="${w / 2}" y="${h / 2}" class="g-asse" text-anchor="middle">Nessun dato</text></svg>`;
  const vals = punti.map((p) => p.valore);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min = min * 0.9; max = max * 1.1 || 1; }
  const margine = (max - min) * 0.15;
  const { passo } = scalaBella(max - min + 2 * margine, 4);
  const basso = Math.floor((min - margine) / passo) * passo;
  const alto = Math.ceil((max + margine) / passo) * passo;
  const areaH = h - padT - padB, areaW = w - padL - padR;
  const x = (i) => padL + (n === 1 ? areaW / 2 : (areaW * i) / (n - 1));
  const y = (v) => padT + areaH - ((v - basso) / (alto - basso)) * areaH;
  let out = `<svg class="grafico" viewBox="0 0 ${w} ${h}" role="img">`;
  for (let v = basso; v <= alto + 1e-9; v += passo) {
    out += `<line x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}" class="g-griglia"/>`;
    out += `<text x="${padL - 8}" y="${y(v) + 4}" class="g-asse" text-anchor="end">${esc(formatoY(v))}</text>`;
  }
  const d = punti.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valore).toFixed(1)}`).join(' ');
  out += `<path d="${d}" class="g-linea"/>`;
  punti.forEach((p, i) => { out += `<circle cx="${x(i)}" cy="${y(p.valore)}" r="3.5" class="g-punto"><title>${esc(p.etichetta)}: ${esc(formatoY(p.valore))}</title></circle>`; });
  const ogni = Math.max(1, Math.ceil(n / maxEtichette));
  punti.forEach((p, i) => {
    const vicinoAllaFine = i !== n - 1 && (n - 1 - i) < ogni * 0.6;
    if ((i % ogni === 0 && !vicinoAllaFine) || i === n - 1) out += `<text x="${x(i)}" y="${h - 8}" class="g-asse" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${esc(p.etichetta)}</text>`;
  });
  return out + '</svg>';
}
