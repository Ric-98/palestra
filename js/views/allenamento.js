// Tab Allenamento: allenamento in corso, scheda attiva con i giorni, ultimi allenamenti.
import { html, raw, icone, conferma, formattaData } from '../ui.js';
import { vai } from '../router.js';
import * as C from '../corrente.js';
import * as A from '../allenamenti.js';
import { schedaAttiva, tutteSchede, nomeEsercizio } from '../dati.js';

function anteprima(g) {
  return (g.esercizi || []).map((v) => nomeEsercizio(v.ex, v.ex)).join(', ');
}

export async function inizia({ titolo, schedaId, giornoId, voci }) {
  const corrente = C.inCorso();
  if (corrente) {
    const ok = await conferma({
      titolo: 'Hai già un allenamento in corso',
      testo: `"${corrente.titolo}" iniziato alle ${formattaData(new Date(corrente.inizio), { hour: '2-digit', minute: '2-digit' })}. Vuoi riprenderlo o scartarlo e iniziarne uno nuovo?`,
      ok: 'Riprendi quello in corso',
      annulla: 'Scarta e inizia nuovo',
    });
    if (ok) { vai('/allena'); return; }
    C.azzeraInCorso();
  }
  C.salvaInCorso(C.nuovoAllenamento({ titolo, schedaId, giornoId, voci }));
  vai('/allena');
}

function cardAllenamento(a) {
  const st = A.statistiche(a);
  const d = new Date(a.inizio);
  return html`
    <button type="button" class="card card-btn" data-storico="${a.id}">
      <p class="card-title">${a.titolo}</p>
      <p class="card-sub">${formattaData(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}${a.origine === 'hevy' ? ' · da Hevy' : ''}</p>
      <div class="mini-stats">
        <div><span>Durata</span><strong>${A.formattaDurata(st.durataSec)}</strong></div>
        <div><span>Volume</span><strong>${st.volume.toLocaleString('it-IT')} kg</strong></div>
        <div><span>Serie</span><strong>${st.serie}</strong></div>
      </div>
    </button>`;
}

export function renderAllenamento(el) {
  const corrente = C.inCorso();
  const s = schedaAttiva();
  const ultimi = A.tutti().slice(0, 3);
  const archivio = tutteSchede().filter((x) => !x.attiva);

  el.innerHTML = html`
    <header class="page-head">
      <h1 class="page-title">Allenamento</h1>
    </header>

    ${corrente ? html`
      <button type="button" class="card card-btn in-corso" id="btn-riprendi">
        <div class="row between">
          <div>
            <p class="card-title">Allenamento in corso</p>
            <p class="card-sub">${corrente.titolo} · iniziato alle ${formattaData(new Date(corrente.inizio), { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <span class="btn primary small">Riprendi</span>
        </div>
      </button>` : html`
      <button type="button" class="card card-btn" id="btn-libero">
        <div class="row">${raw(icone.piu)}<span>Inizia allenamento libero</span></div>
      </button>`}

    ${s ? html`
      <h2 class="section-title">${s.nome}</h2>
      ${s.note ? html`<p class="muted small" style="margin:-6px 4px 12px">${s.note}</p>` : ''}
      <div class="stack">
        ${(s.giorni || []).map((g) => html`
          <div class="card">
            <button type="button" class="card-link" data-giorno="${g.id}">
              <p class="card-title">${g.nome}</p>
              <p class="card-sub clamp-2">${anteprima(g)}</p>
            </button>
            <button type="button" class="btn primary block" data-inizia="${g.id}" style="margin-top:12px">Inizia allenamento</button>
          </div>`)}
        ${(s.extra || []).map((b) => {
          const volte = A.volteBloccoSettimana(b);
          return html`
          <div class="card">
            <button type="button" class="card-link" data-giorno="${b.id}">
              <div class="row between">
                <p class="card-title">${b.nome}</p>
                <span class="badge ${volte >= (b.voltePerSettimana || 0) ? 'ok' : ''}">${volte}/${b.voltePerSettimana || '-'} questa settimana</span>
              </div>
              <p class="card-sub clamp-2">${anteprima(b)}</p>
            </button>
            <p class="muted small" style="margin:8px 0 0">Si aggiunge a qualunque allenamento con "Aggiungi esercizio", oppure si fa da solo.</p>
            <button type="button" class="btn block" data-inizia="${b.id}" style="margin-top:12px">Inizia da solo</button>
          </div>`;
        })}
      </div>` : html`<div class="card"><div class="empty"><h3>Nessuna scheda</h3></div></div>`}

    ${archivio.length ? html`
      <h2 class="section-title">Schede precedenti</h2>
      <div class="list">${archivio.map((x) => html`<div class="list-item"><span class="li-body"><div class="li-title">${x.nome}</div><div class="li-sub">${x.dal || ''}${x.al ? ' → ' + x.al : ''}</div></span></div>`)}</div>` : ''}

    <div class="row between" style="margin-top:28px">
      <h2 class="section-title" style="margin:0">Ultimi allenamenti</h2>
      ${A.tutti().length > 3 ? html`<a href="#/storico" class="small">Vedi tutti</a>` : ''}
    </div>
    <div class="stack" style="margin-top:12px">
      ${ultimi.length ? ultimi.map(cardAllenamento) : html`<div class="card"><p class="card-sub">Ancora nessun allenamento registrato. Puoi importare lo storico di Hevy da Profilo → Dati.</p></div>`}
    </div>
  `.toString();

  const riprendi = el.querySelector('#btn-riprendi');
  if (riprendi) riprendi.onclick = () => vai('/allena');
  const libero = el.querySelector('#btn-libero');
  if (libero) libero.onclick = () => inizia({ titolo: 'Allenamento libero', voci: [] });

  el.querySelectorAll('[data-giorno]').forEach((b) => { b.onclick = () => vai(`/giorno/${s.id}/${b.dataset.giorno}`); });
  el.querySelectorAll('[data-inizia]').forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.inizia;
      const g = (s.giorni || []).find((x) => x.id === id) || (s.extra || []).find((x) => x.id === id);
      if (!g) return;
      inizia({ titolo: g.nome, schedaId: s.id, giornoId: g.id, voci: g.esercizi });
    };
  });
  el.querySelectorAll('[data-storico]').forEach((b) => { b.onclick = () => vai('/storico/' + b.dataset.storico); });
}
