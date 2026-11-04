// Calendario mensile con i giorni allenati.
import { html, raw, icone, formattaData } from '../ui.js';
import { vai, indietro } from '../router.js';
import * as A from '../allenamenti.js';

let corrente = null; // { anno, mese }
let selezionato = null; // chiave giorno

export function renderCalendario(el) {
  const oggi = new Date();
  if (!corrente) corrente = { anno: oggi.getFullYear(), mese: oggi.getMonth() };
  if (!selezionato) selezionato = A.chiaveGiorno(oggi);
  const giorni = A.giorniAllenati();

  function disegna() {
    const primo = new Date(corrente.anno, corrente.mese, 1);
    const nGiorni = new Date(corrente.anno, corrente.mese + 1, 0).getDate();
    const offset = (primo.getDay() + 6) % 7; // lunedì = 0
    const celle = [];
    for (let i = 0; i < offset; i++) celle.push(null);
    for (let d = 1; d <= nGiorni; d++) celle.push(new Date(corrente.anno, corrente.mese, d));
    const nelMese = Array.from(giorni.keys()).filter((k) => k.startsWith(`${corrente.anno}-${String(corrente.mese + 1).padStart(2, '0')}`)).length;
    const delGiorno = A.allenamentiDelGiorno(new Date(selezionato + 'T12:00:00'));
    el.innerHTML = html`
      <header class="page-head">
        <button type="button" class="icon-btn" id="btn-back" aria-label="Indietro">${raw(icone.indietro)}</button>
        <h1 class="page-title" style="font-size:24px">Calendario</h1>
        <span style="width:44px"></span>
      </header>
      <div class="card">
        <div class="row between" style="margin-bottom:10px">
          <button type="button" class="icon-btn small" id="btn-prev" aria-label="Mese precedente">${raw(icone.indietro)}</button>
          <div style="text-align:center"><strong style="text-transform:capitalize">${formattaData(primo, { month: 'long', year: 'numeric' })}</strong><div class="muted small">${nelMese} giorni allenati</div></div>
          <button type="button" class="icon-btn small" id="btn-next" aria-label="Mese successivo" style="transform:scaleX(-1)">${raw(icone.indietro)}</button>
        </div>
        <div class="cal-griglia">
          ${['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((g) => html`<div class="cal-intest">${g}</div>`)}
          ${celle.map((d) => {
            if (!d) return html`<div></div>`;
            const k = A.chiaveGiorno(d);
            const n = giorni.get(k) || 0;
            const eOggi = k === A.chiaveGiorno(oggi);
            return html`<button type="button" class="cal-giorno ${n ? 'allenato' : ''} ${k === selezionato ? 'sel' : ''} ${eOggi ? 'oggi' : ''}" data-giorno="${k}"><span>${d.getDate()}</span>${n ? html`<i></i>` : ''}</button>`;
          })}
        </div>
      </div>
      <h2 class="section-title">${formattaData(new Date(selezionato + 'T12:00:00'), { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
      <div class="stack">
        ${delGiorno.length ? delGiorno.map((a) => { const st = A.statistiche(a); return html`
          <button type="button" class="card card-btn" data-id="${a.id}">
            <p class="card-title">${a.titolo}</p>
            <p class="card-sub">${formattaData(new Date(a.inizio), { hour: '2-digit', minute: '2-digit' })} · ${A.formattaDurata(st.durataSec)} · ${st.volume.toLocaleString('it-IT')} kg · ${st.serie} serie</p>
          </button>`; }) : html`<div class="card"><p class="card-sub">Nessun allenamento in questo giorno.</p></div>`}
      </div>
    `.toString();
    el.querySelector('#btn-back').onclick = () => indietro('/profilo');
    el.querySelector('#btn-prev').onclick = () => { corrente = { anno: corrente.mese === 0 ? corrente.anno - 1 : corrente.anno, mese: (corrente.mese + 11) % 12 }; disegna(); };
    el.querySelector('#btn-next').onclick = () => { corrente = { anno: corrente.mese === 11 ? corrente.anno + 1 : corrente.anno, mese: (corrente.mese + 1) % 12 }; disegna(); };
    el.querySelectorAll('[data-giorno]').forEach((b) => { b.onclick = () => { selezionato = b.dataset.giorno; disegna(); }; });
    el.querySelectorAll('[data-id]').forEach((b) => { b.onclick = () => vai('/storico/' + b.dataset.id); });
  }
  disegna();
}
