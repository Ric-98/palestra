// Elenco esercizi fatti e progressione del singolo esercizio.
import { html, raw, icone, formattaData } from '../ui.js';
import { vai, indietro } from '../router.js';
import { store } from '../store.js';
import * as A from '../allenamenti.js';
import { esercizio } from '../dati.js';
import { graficoLinea, formattaCompatto } from '../grafici.js';

export function renderEsercizi(el) {
  const lista = A.riepilogoEsercizi();
  el.innerHTML = html`
    <header class="page-head">
      <button type="button" class="icon-btn" id="btn-back" aria-label="Indietro">${raw(icone.indietro)}</button>
      <h1 class="page-title" style="font-size:24px">Esercizi</h1>
      <span style="width:44px"></span>
    </header>
    <input class="input" id="cerca" type="search" placeholder="Cerca esercizio" autocomplete="off" style="margin-bottom:12px">
    <div class="list" id="lista">
      ${lista.map((r) => html`
        <button type="button" class="list-item" data-ex="${r.exId}" data-nome="${r.nome.toLowerCase()}">
          <span class="li-body"><div class="li-title">${r.nome}</div><div class="li-sub">${r.sessioni} sessioni · ultima ${formattaData(new Date(r.ultima), { day: 'numeric', month: 'short' })}${r.kgMax ? ` · max ${A.formattaKg(r.kgMax)} kg` : ''}</div></span>
          <span class="li-right">${raw(icone.chevron)}</span>
        </button>`)}
      ${lista.length ? '' : html`<div class="list-item"><span class="li-body"><div class="li-sub">Nessun esercizio registrato ancora.</div></span></div>`}
    </div>
  `.toString();
  el.querySelector('#btn-back').onclick = () => indietro('/profilo');
  el.querySelector('#cerca').oninput = (ev) => {
    const q = ev.target.value.trim().toLowerCase();
    el.querySelectorAll('[data-ex]').forEach((b) => { b.hidden = q && !b.dataset.nome.includes(q); });
  };
  el.querySelectorAll('[data-ex]').forEach((b) => { b.onclick = () => vai('/esercizio/' + encodeURIComponent(b.dataset.ex)); });
}

const METRICHE = [{ id: 'kgMax', nome: 'Peso max' }, { id: 'rmMax', nome: '1RM stimato' }, { id: 'volume', nome: 'Volume' }];

export function renderEsercizio(el, params) {
  const exId = params.id;
  const cat = esercizio(exId);
  const storico = A.storicoEsercizio(exId);
  if (!storico.length && !cat) { vai('/esercizi', { sostituisci: true }); return; }
  const nome = cat ? cat.nome : (storico[0] ? A.nomeEsercizioLog({ exId, nome: exId }) : exId);
  const rec = A.record(exId);
  function disegna() {
    const metrica = store.get('prefEsercizio', 'kgMax');
    const punti = storico.slice().reverse().filter((s) => s[metrica] > 0).map((s) => ({ etichetta: formattaData(new Date(s.data), { day: 'numeric', month: 'short' }), valore: Math.round(s[metrica] * 10) / 10 }));
    const y = window.scrollY;
    el.innerHTML = html`
      <header class="page-head">
        <button type="button" class="icon-btn" id="btn-back" aria-label="Indietro">${raw(icone.indietro)}</button>
        <div class="muted">Esercizio</div>
        <span style="width:44px"></span>
      </header>
      <h1 class="page-title" style="font-size:24px">${nome}</h1>
      <p class="muted small" style="margin:4px 0 14px">${cat ? cat.gruppo + ' · ' : ''}${storico.length} sessioni</p>
      <div class="grid-2">
        <div class="card stat"><span>Peso massimo</span><strong>${rec.kgMax ? A.formattaKg(rec.kgMax) + ' kg' : '—'}</strong></div>
        <div class="card stat"><span>1RM stimato</span><strong>${rec.rmMax ? Math.round(rec.rmMax) + ' kg' : '—'}</strong></div>
        <div class="card stat"><span>Miglior set</span><strong>${rec.volumeSetMax ? formattaCompatto(rec.volumeSetMax) + ' kg' : '—'}</strong></div>
        <div class="card stat"><span>Ultima volta</span><strong>${storico[0] ? formattaData(new Date(storico[0].data), { day: 'numeric', month: 'short' }) : '—'}</strong></div>
      </div>
      <h2 class="section-title">Progressione</h2>
      <div class="card">
        ${raw(graficoLinea({ punti, formatoY: (v) => `${formattaCompatto(v)}${metrica === 'volume' ? '' : ' kg'}` }))}
        <div class="chips" style="margin-top:10px">${METRICHE.map((m) => html`<button type="button" class="chip ${metrica === m.id ? 'on' : ''}" data-metrica="${m.id}">${m.nome}</button>`)}</div>
      </div>
      <h2 class="section-title">Sessioni</h2>
      <div class="list">
        ${storico.map((s) => html`
          <button type="button" class="list-item" data-id="${s.id}">
            <span class="li-body"><div class="li-title">${formattaData(new Date(s.data), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
              <div class="li-sub">${s.serie.map((x) => `${x.tipo === 'W' ? 'W ' : ''}${x.kg !== null && x.kg !== undefined ? A.formattaKg(x.kg) + '×' : ''}${x.reps}`).join(' · ')}</div></span>
            <span class="li-right">${raw(icone.chevron)}</span>
          </button>`)}
      </div>
    `.toString();
    el.querySelector('#btn-back').onclick = () => indietro('/esercizi');
    el.querySelectorAll('[data-metrica]').forEach((b) => { b.onclick = () => { store.set('prefEsercizio', b.dataset.metrica); disegna(); }; });
    el.querySelectorAll('[data-id]').forEach((b) => { b.onclick = () => vai('/storico/' + b.dataset.id); });
    window.scrollTo(0, y);
  }
  disegna();
}
