// Misure corporee: inserimento, elenco e grafico del peso.
import { html, raw, esc, icone, toast, conferma, mostraFoglio, formattaData } from '../ui.js';
import { indietro } from '../router.js';
import { store } from '../store.js';
import * as M from '../misure.js';
import { graficoLinea } from '../grafici.js';

function fmt(v) { return v === undefined || v === null || v === '' ? '—' : String(v).replace('.', ','); }

export function renderMisure(el) {
  function disegna() {
    const lista = M.tutte();
    const ultimi = M.ultimi();
    const campo = store.get('prefMisura', 'peso');
    const c = M.CAMPI.find((x) => x.id === campo) || M.CAMPI[0];
    const punti = lista.slice().reverse().filter((m) => m[c.id] !== undefined && m[c.id] !== null && m[c.id] !== '').map((m) => ({ etichetta: formattaData(new Date(m.data), { day: 'numeric', month: 'short' }), valore: Number(m[c.id]) }));
    const y = window.scrollY;
    el.innerHTML = html`
      <header class="page-head">
        <button type="button" class="icon-btn" id="btn-back" aria-label="Indietro">${raw(icone.indietro)}</button>
        <h1 class="page-title" style="font-size:24px">Misure</h1>
        <button type="button" class="icon-btn" id="btn-add" aria-label="Aggiungi">${raw(icone.piu)}</button>
      </header>
      <div class="grid-2">
        ${M.CAMPI.map((x) => html`<button type="button" class="card stat ${campo === x.id ? 'on' : ''}" data-campo="${x.id}"><span>${x.nome}</span><strong>${fmt(ultimi[x.id])}${ultimi[x.id] !== undefined ? ' ' + x.unita : ''}</strong></button>`)}
      </div>
      <h2 class="section-title">${c.nome} nel tempo</h2>
      <div class="card">${raw(graficoLinea({ punti, formatoY: (v) => `${String(Math.round(v * 10) / 10).replace('.', ',')}` }))}</div>
      <button type="button" class="btn primary block" id="btn-add-2" style="margin-top:12px">+ Aggiungi misure</button>
      <h2 class="section-title">Storico</h2>
      <div class="list">
        ${lista.map((m) => html`
          <button type="button" class="list-item" data-id="${m.id}">
            <span class="li-body"><div class="li-title">${formattaData(new Date(m.data), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
              <div class="li-sub">${M.CAMPI.filter((x) => m[x.id] !== undefined && m[x.id] !== null && m[x.id] !== '').map((x) => `${x.nome} ${fmt(m[x.id])} ${x.unita}`).join(' · ')}${m.note ? ' · ' + m.note : ''}</div></span>
            <span class="li-right">${raw(icone.chevron)}</span>
          </button>`)}
        ${lista.length ? '' : html`<div class="list-item"><span class="li-body"><div class="li-sub">Nessuna misura ancora. Tocca + per inserire peso e circonferenze.</div></span></div>`}
      </div>
    `.toString();
    el.querySelector('#btn-back').onclick = () => indietro('/profilo');
    el.querySelector('#btn-add').onclick = () => modulo(null);
    el.querySelector('#btn-add-2').onclick = () => modulo(null);
    el.querySelectorAll('[data-campo]').forEach((b) => { b.onclick = () => { store.set('prefMisura', b.dataset.campo); disegna(); }; });
    el.querySelectorAll('[data-id]').forEach((b) => { b.onclick = () => modulo(lista.find((m) => m.id === b.dataset.id)); });
    window.scrollTo(0, y);
  }

  function modulo(m) {
    const oggi = new Date();
    const dataIso = (m ? new Date(m.data) : oggi);
    const dataVal = `${dataIso.getFullYear()}-${String(dataIso.getMonth() + 1).padStart(2, '0')}-${String(dataIso.getDate()).padStart(2, '0')}`;
    const corpo = `
      <label class="campo"><span class="li-sub">Data</span><input class="input" id="m-data" type="date" value="${dataVal}"></label>
      <div class="grid-2" style="margin-top:10px">
        ${M.CAMPI.map((c) => `<label class="campo"><span class="li-sub">${esc(c.nome)} (${esc(c.unita)})</span><input class="input" id="m-${c.id}" type="text" inputmode="decimal" value="${m && m[c.id] !== undefined && m[c.id] !== null ? esc(String(m[c.id]).replace('.', ',')) : ''}" placeholder="—"></label>`).join('')}
      </div>
      <label class="campo" style="margin-top:10px"><span class="li-sub">Note</span><input class="input" id="m-note" type="text" value="${m ? esc(m.note || '') : ''}" placeholder="facoltative"></label>
      <div class="actions" style="margin-top:14px">
        <button type="button" class="btn primary" id="m-salva">Salva</button>
        ${m ? '<button type="button" class="btn danger" id="m-elimina">Elimina</button>' : ''}
      </div>`;
    const chiudi = mostraFoglio({ titolo: m ? 'Modifica misure' : 'Nuove misure', corpoHtml: corpo, chiudiTesto: 'Annulla' });
    const foglio = document.querySelector('.sheet');
    foglio.classList.add('sheet-alta');
    foglio.querySelector('#m-salva').onclick = () => {
      const valori = {};
      let almenoUno = false;
      for (const c of M.CAMPI) {
        const v = foglio.querySelector('#m-' + c.id).value.trim().replace(',', '.');
        if (v === '') { valori[c.id] = null; continue; }
        const n = Number(v);
        if (!isFinite(n) || n <= 0) { toast(`Valore non valido per ${c.nome}`); return; }
        valori[c.id] = n; almenoUno = true;
      }
      if (!almenoUno) { toast('Inserisci almeno un valore'); return; }
      const d = foglio.querySelector('#m-data').value;
      const data = d ? new Date(d + 'T12:00:00') : new Date();
      valori.note = foglio.querySelector('#m-note').value.trim();
      if (m) M.salva({ ...m, ...valori, data: data.toISOString() });
      else M.salva(M.nuova(valori, data.toISOString()));
      chiudi();
      toast('Misure salvate');
      disegna();
    };
    const del = foglio.querySelector('#m-elimina');
    if (del) del.onclick = async () => {
      chiudi();
      const ok = await conferma({ titolo: 'Eliminare queste misure?', ok: 'Elimina', pericoloso: true });
      if (!ok) return;
      M.elimina(m.id);
      disegna();
    };
  }

  disegna();
}
