// Tab Allenamento: allenamento in corso, scheda attiva con i giorni, ultimi allenamenti.
import { html, raw, icone, conferma, chiediTesto, toast, formattaData, isIOS, isStandalone, mostraFoglio } from '../ui.js';
import { store } from '../store.js';
import { vai } from '../router.js';
import * as C from '../corrente.js';
import { stimaDurataVoci } from '../corrente.js';
import * as A from '../allenamenti.js';
import { schedaAttiva, tutteSchede, nomeEsercizio, haModifiche, ripristinaScheda, aggiungiGiorno } from '../dati.js';

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
  // prossimo giorno consigliato: quello dopo l'ultimo fatto, in ordine di scheda
  let prossimo = null;
  if (s && (s.giorni || []).length) prossimo = A.prossimoGiorno(s.id, s.giorni.map((g) => g.id));

  el.innerHTML = html`
    <header class="page-head">
      <h1 class="page-title">Allenamento</h1>
    </header>

    ${!isStandalone() && isIOS() && !store.get('nascondiHintHome', false) ? html`
      <div class="card hint">
        <p class="card-sub">Stai usando l'app da Safari. Dall'icona sulla Home è più fluida e a tutto schermo.</p>
        <div class="row" style="gap:8px; margin-top:8px">
          <button type="button" class="btn small" id="btn-hint-come">Come si fa</button>
          <button type="button" class="btn small ghost" id="btn-hint-no">Non mostrare più</button>
        </div>
      </div>` : ''}
    ${corrente ? html`
      <button type="button" class="card card-btn in-corso" id="btn-riprendi">
        <div class="row between">
          <div>
            <p class="card-title">Allenamento in corso</p>
            <p class="card-sub">${corrente.titolo} · iniziato alle ${formattaData(new Date(corrente.inizio), { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <span class="btn primary small">Riprendi</span>
        </div>
      </button>` : ''}

    ${s ? html`
      <h2 class="section-title">${s.nome}</h2>
      ${s.note ? html`<p class="muted small" style="margin:-6px 4px 12px">${s.note}</p>` : ''}
      <div class="stack">
        ${(s.giorni || []).map((g) => html`
          <div class="card ${g.id === prossimo ? 'prossimo' : ''}">
            <button type="button" class="card-link" data-giorno="${g.id}">
              <p class="card-title">${g.nome}${g.id === prossimo ? html` <span class="tag-mod blu">prossimo</span>` : ''}${g.modificato || g.aggiunto ? html` <span class="tag-mod">${g.aggiunto ? 'tuo' : 'modificato'}</span>` : ''}</p>
              <p class="card-sub clamp-2">${anteprima(g)}</p>
              <p class="card-sub" style="margin-top:4px">${(g.esercizi || []).length} esercizi · ≈ ${A.formattaDurata(stimaDurataVoci(g.esercizi))}</p>
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
        <button type="button" class="btn block ghost" id="btn-nuovo-giorno">+ Nuovo giorno</button>
        ${haModifiche(s.id) ? html`<button type="button" class="btn block ghost small" id="btn-ripristina-scheda">Scheda modificata · ripristina la versione del coach</button>` : ''}
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

  const hintCome = el.querySelector('#btn-hint-come');
  if (hintCome) hintCome.onclick = () => mostraFoglio({ titolo: 'Aggiungi alla Home', corpoHtml: `<ol class="steps"><li>Tocca <b>Condividi</b> in basso, il quadrato con la freccia.</li><li>Scorri e tocca <b>Aggiungi alla schermata Home</b>, poi <b>Aggiungi</b>.</li><li>Da ora apri l'app dall'icona dorata.</li></ol>` });
  const hintNo = el.querySelector('#btn-hint-no');
  if (hintNo) hintNo.onclick = () => { store.set('nascondiHintHome', true); renderAllenamento(el); };
  const riprendi = el.querySelector('#btn-riprendi');
  if (riprendi) riprendi.onclick = () => vai('/allena');
  const nuovo = el.querySelector('#btn-nuovo-giorno');
  if (nuovo) nuovo.onclick = async () => {
    const nome = await chiediTesto({ titolo: 'Nome del nuovo giorno', placeholder: 'es. Spalle extra' });
    if (!nome) return;
    const id = aggiungiGiorno(s.id, nome);
    vai(`/modifica/${s.id}/${id}`);
  };
  const rip = el.querySelector('#btn-ripristina-scheda');
  if (rip) rip.onclick = async () => {
    const ok = await conferma({ titolo: 'Ripristinare la scheda del coach?', testo: 'Tutte le modifiche ai giorni e i giorni aggiunti verranno eliminati.', ok: 'Ripristina', pericoloso: true });
    if (!ok) return;
    ripristinaScheda(s.id);
    toast('Scheda ripristinata');
    renderAllenamento(el);
  };

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
