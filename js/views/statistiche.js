// Grafico settimanale (profilo e pagina statistiche) e totali.
import { html, raw, icone, formattaData } from '../ui.js';
import { indietro, vai } from '../router.js';
import { store } from '../store.js';
import * as A from '../allenamenti.js';
import { graficoBarre, formattaCompatto } from '../grafici.js';

const INTERVALLI = [{ id: '3m', nome: 'Ultimi 3 mesi', settimane: 13 }, { id: '6m', nome: 'Ultimi 6 mesi', settimane: 26 }, { id: '1a', nome: 'Ultimo anno', settimane: 52 }];
const METRICHE = [{ id: 'durata', nome: 'Durata' }, { id: 'volume', nome: 'Volume' }, { id: 'reps', nome: 'Reps' }];

function pref() { return store.get('prefStatistiche', { intervallo: '3m', metrica: 'durata' }); }

export function valoreMetrica(s, metrica) {
  if (metrica === 'durata') return Math.round((s.durataSec / 3600) * 10) / 10;
  if (metrica === 'volume') return s.volume;
  return s.reps;
}
function formatoMetrica(metrica) {
  if (metrica === 'durata') return (v) => `${formattaCompatto(v)} h`;
  if (metrica === 'volume') return (v) => `${formattaCompatto(v)} kg`;
  return (v) => formattaCompatto(v);
}

// Blocco riutilizzabile: titolo settimana corrente, selettore intervallo, grafico, pillole metrica
export function bloccoGraficoSettimanale(el, { compatto = false } = {}) {
  const p = pref();
  const intervallo = INTERVALLI.find((i) => i.id === p.intervallo) || INTERVALLI[0];
  const settimane = A.perSettimana(intervallo.settimane);
  const corrente = settimane[settimane.length - 1];
  const serie = settimane.map((s, i) => ({ etichetta: formattaData(s.da, { day: 'numeric', month: 'short' }), valore: valoreMetrica(s, p.metrica), evidenzia: i === settimane.length - 1 }));
  const ogni = Math.max(1, Math.round(settimane.length / 6));
  const testoCorrente = p.metrica === 'durata' ? `${formattaCompatto(valoreMetrica(corrente, 'durata'))} ore` : p.metrica === 'volume' ? `${corrente.volume.toLocaleString('it-IT')} kg` : `${corrente.reps} reps`;
  return html`
    <div class="row between" style="margin:4px 0 8px">
      <div><strong style="font-size:20px">${testoCorrente}</strong> <span class="muted">questa settimana</span></div>
      <select class="select" id="sel-intervallo" aria-label="Intervallo">
        ${INTERVALLI.map((i) => html`<option value="${i.id}" ${i.id === p.intervallo ? 'selected' : ''}>${i.nome}</option>`)}
      </select>
    </div>
    ${raw(graficoBarre({ serie, formatoY: formatoMetrica(p.metrica), ogniEtichetta: ogni, altezza: compatto ? 190 : 220 }))}
    <div class="chips" style="margin-top:10px">
      ${METRICHE.map((m) => html`<button type="button" class="chip ${p.metrica === m.id ? 'on' : ''}" data-metrica="${m.id}">${m.nome}</button>`)}
    </div>`;
}
export function collegaGraficoSettimanale(el, ridisegna) {
  const sel = el.querySelector('#sel-intervallo');
  if (sel) sel.onchange = () => { store.set('prefStatistiche', { ...pref(), intervallo: sel.value }); ridisegna(); };
  el.querySelectorAll('[data-metrica]').forEach((b) => { b.onclick = () => { store.set('prefStatistiche', { ...pref(), metrica: b.dataset.metrica }); ridisegna(); }; });
}

export function renderStatistiche(el) {
  const t = A.totali();
  const mesi = A.perMese(12);
  const serieMesi = mesi.map((m) => ({ etichetta: formattaData(new Date(m.anno, m.mese, 1), { month: 'short' }), valore: m.allenamenti }));
  const sett = A.allenamentiSettimana();
  function disegna() {
    const y = window.scrollY;
    el.innerHTML = html`
      <header class="page-head">
        <button type="button" class="icon-btn" id="btn-back" aria-label="Indietro">${raw(icone.indietro)}</button>
        <h1 class="page-title" style="font-size:24px">Statistiche</h1>
        <span style="width:44px"></span>
      </header>
      <div class="grid-2">
        <div class="card stat"><span>Allenamenti</span><strong>${t.allenamenti}</strong></div>
        <div class="card stat"><span>Ore totali</span><strong>${Math.round(t.durataSec / 3600)}</strong></div>
        <div class="card stat"><span>Volume totale</span><strong>${formattaCompatto(t.volume)} kg</strong></div>
        <div class="card stat"><span>Serie totali</span><strong>${t.serie.toLocaleString('it-IT')}</strong></div>
      </div>
      <h2 class="section-title">Per settimana</h2>
      <div class="card">${bloccoGraficoSettimanale(el)}</div>
      <h2 class="section-title">Allenamenti al mese</h2>
      <div class="card">
        <p class="card-sub" style="margin-bottom:6px">${sett.length} questa settimana · ${mesi[mesi.length - 1].allenamenti} questo mese</p>
        ${raw(graficoBarre({ serie: serieMesi, ogniEtichetta: 2, altezza: 180 }))}
      </div>
    `.toString();
    el.querySelector('#btn-back').onclick = () => indietro('/profilo');
    collegaGraficoSettimanale(el, disegna);
    window.scrollTo(0, y);
  }
  disegna();
}
