// Dettaglio di un giorno della scheda (stile "Routine" di Hevy).
import { html, raw, icone, formattaData } from '../ui.js';
import { vai, indietro } from '../router.js';
import { scheda, giorno, esercizio, espandiSerie } from '../dati.js';
import * as A from '../allenamenti.js';
import { inizia } from './allenamento.js';

export function renderGiorno(el, params) {
  const s = scheda(params.scheda);
  const g = giorno(params.scheda, params.giorno);
  if (!s || !g) { vai('/allenamento', { sostituisci: true }); return; }

  el.innerHTML = html`
    <header class="page-head">
      <button type="button" class="icon-btn" id="btn-back" aria-label="Indietro">${raw(icone.indietro)}</button>
      <div class="muted">Giorno</div>
      <button type="button" class="btn ghost small" id="btn-modifica">Modifica</button>
    </header>
    <h1 class="page-title" style="font-size:26px">${g.nome}${g.modificato || g.aggiunto ? html` <span class="tag-mod">${g.aggiunto ? 'tuo' : 'modificato'}</span>` : ''}</h1>
    <p class="muted small" style="margin:4px 0 16px">${s.nome}${g.voltePerSettimana ? ` · ${g.voltePerSettimana} volte a settimana` : ''}</p>
    <button type="button" class="btn primary block" id="btn-inizia">Inizia allenamento</button>

    <h2 class="section-title">Esercizi</h2>
    <div class="stack">
      ${(g.esercizi || []).map((v) => {
        const cat = esercizio(v.ex) || { nome: v.ex, gruppo: '' };
        const serie = espandiSerie(v.serie);
        const prev = A.precedente(v.ex);
        const migliore = prev ? prev.serie.filter((x) => x.tipo !== 'W').reduce((m, x) => (!m || (x.kg || 0) > (m.kg || 0) ? x : m), null) : null;
        return html`
          <div class="card">
            <div class="row between">
              <div>
                <p class="card-title" style="color:var(--accent)">${cat.nome}</p>
                <p class="card-sub">${cat.gruppo}${v.superset ? ` · Superserie ${v.superset}` : ''}${v.avvicinamento === false ? '' : ' · + 1 avvicinamento'}</p>
              </div>
            </div>
            ${v.nota ? html`<div class="ex-note" style="margin-top:8px">${v.nota}</div>` : ''}
            <div class="plan-table">
              <div class="plan-row head"><span>Set</span><span>Reps</span><span>Nota</span></div>
              ${serie.map((x, i) => html`<div class="plan-row"><span>${i + 1}</span><span>${x.reps}</span><span class="muted">${x.nota || ''}</span></div>`)}
            </div>
            ${prev ? html`<p class="muted small" style="margin:10px 0 0">Ultima volta: ${formattaData(new Date(prev.data))}${migliore ? ` · ${migliore.kg !== null && migliore.kg !== undefined ? A.formattaKg(migliore.kg) + ' kg × ' : ''}${migliore.reps}${migliore.kg === null || migliore.kg === undefined ? ' reps' : ''}` : ''}</p>` : ''}
          </div>`;
      })}
    </div>
  `.toString();

  el.querySelector('#btn-back').onclick = () => indietro('/allenamento');
  el.querySelector('#btn-modifica').onclick = () => vai(`/modifica/${s.id}/${g.id}`);
  el.querySelector('#btn-inizia').onclick = () => inizia({ titolo: g.nome, schedaId: s.id, giornoId: g.id, voci: g.esercizi });
}
