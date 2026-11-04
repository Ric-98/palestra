// Editor di un giorno della scheda: nome, esercizi, serie, note, avvicinamento, superserie, ordine.
import { html, raw, esc, icone, toast, conferma, mostraFoglio } from '../ui.js';
import { vai, indietro } from '../router.js';
import { scheda, giorno, esercizio, tuttiEsercizi, espandiSerie, salvaGiorno, rimuoviGiorno, ripristinaGiorno, giornoOriginale } from '../dati.js';

const SUPERSET = ['', 'A', 'B', 'C', 'D'];

export function renderModifica(el, params) {
  const s = scheda(params.scheda);
  const g = giorno(params.scheda, params.giorno);
  if (!s || !g) { vai('/allenamento', { sostituisci: true }); return; }
  const originale = giornoOriginale(params.scheda, params.giorno);

  // copia di lavoro
  let nome = g.nome;
  let voci = (g.esercizi || []).map((v) => ({
    ex: v.ex,
    serie: espandiSerie(v.serie).map((x) => ({ reps: x.reps || '', nota: x.nota || '' })),
    nota: v.nota || '',
    superset: v.superset || '',
    avvicinamento: v.avvicinamento !== false,
  }));

  function cardVoce(v, i) {
    const cat = esercizio(v.ex) || { nome: v.ex, gruppo: '' };
    return html`
      <section class="card ed-card" data-i="${i}">
        <div class="row between">
          <div style="min-width:0"><p class="card-title" style="color:var(--accent); margin:0">${cat.nome}</p><p class="card-sub">${cat.gruppo}</p></div>
          <div class="row" style="gap:4px; flex:none">
            <button type="button" class="icon-btn small" data-az="su" data-i="${i}" aria-label="Sposta su" ${i === 0 ? 'disabled' : ''}>${raw(icone.giu)}</button>
            <button type="button" class="icon-btn small" data-az="giu" data-i="${i}" aria-label="Sposta giù" ${i === voci.length - 1 ? 'disabled' : ''} style="transform:scaleY(-1)">${raw(icone.giu)}</button>
            <button type="button" class="icon-btn small rosso" data-az="rimuovi" data-i="${i}" aria-label="Rimuovi esercizio">${raw(icone.cestino)}</button>
          </div>
        </div>
        <div class="ed-serie">
          <div class="ed-set head"><span>Serie</span><span>Reps</span><span>Nota</span><span></span></div>
          ${v.serie.map((x, j) => html`
            <div class="ed-set">
              <span class="set-num" style="display:grid;place-items:center">${j + 1}</span>
              <input class="input piccolo" data-campo="reps" data-i="${i}" data-j="${j}" value="${x.reps}" placeholder="6-10" inputmode="numeric">
              <input class="input piccolo" data-campo="notaSet" data-i="${i}" data-j="${j}" value="${x.nota}" placeholder="es. 2'' di picco">
              <button type="button" class="icon-btn small" data-az="rimuovi-set" data-i="${i}" data-j="${j}" aria-label="Togli serie">✕</button>
            </div>`)}
          <button type="button" class="btn small" data-az="aggiungi-set" data-i="${i}" style="margin-top:6px">+ Serie</button>
        </div>
        <label class="campo" style="margin-top:10px"><span class="li-sub">Nota esercizio</span><input class="input piccolo" data-campo="nota" data-i="${i}" value="${v.nota}" placeholder="es. 1'' di picco su tutte"></label>
        <div class="row between" style="margin-top:10px">
          <button type="button" class="list-item" data-az="avv" data-i="${i}" style="padding:0; min-height:36px; border:0; flex:1">
            <span class="li-body"><div class="li-title" style="font-size:15px">Serie di avvicinamento</div></span>
            <span class="switch ${v.avvicinamento ? 'on' : ''}" aria-hidden="true"></span>
          </button>
        </div>
        <div class="row" style="margin-top:8px; gap:8px; align-items:center">
          <span class="li-sub">Superserie</span>
          <div class="chips">${SUPERSET.map((x) => html`<button type="button" class="chip ${v.superset === x ? 'on' : ''}" data-az="ss" data-i="${i}" data-v="${x}">${x || 'No'}</button>`)}</div>
        </div>
      </section>`;
  }

  function disegna() {
    const y = window.scrollY;
    el.innerHTML = html`
      <header class="page-head">
        <button type="button" class="btn ghost small" id="btn-annulla">Annulla</button>
        <div class="muted">Modifica giorno</div>
        <button type="button" class="btn primary small" id="btn-salva">Salva</button>
      </header>
      <label class="campo"><span class="li-sub">Nome del giorno</span><input class="input" id="in-nome" value="${nome}" placeholder="es. Gambe"></label>
      <h2 class="section-title">Esercizi</h2>
      <div id="voci">${voci.map(cardVoce)}</div>
      <button type="button" class="btn block" id="btn-add" style="margin-top:4px">+ Aggiungi esercizio</button>
      <div class="stack" style="margin-top:20px">
        ${originale && g.modificato ? html`<button type="button" class="btn block ghost" id="btn-ripristina">Ripristina la versione del coach</button>` : ''}
        <button type="button" class="btn block ghost rosso" id="btn-elimina">Elimina questo giorno</button>
      </div>
      <p class="muted small" style="margin:14px 4px 0">Le modifiche restano su questo dispositivo e vengono incluse nel backup. Quando arriva una scheda nuova, parte pulita.</p>
    `.toString();
    window.scrollTo(0, y);

    el.querySelector('#btn-annulla').onclick = () => indietro(`/giorno/${s.id}/${g.id}`);
    el.querySelector('#in-nome').oninput = (ev) => { nome = ev.target.value; };
    el.querySelector('#btn-salva').onclick = salva;
    el.querySelector('#btn-add').onclick = aggiungiEsercizio;
    const rip = el.querySelector('#btn-ripristina');
    if (rip) rip.onclick = async () => {
      const ok = await conferma({ titolo: 'Ripristinare la versione del coach?', testo: 'Le tue modifiche a questo giorno verranno eliminate.', ok: 'Ripristina', pericoloso: true });
      if (!ok) return;
      ripristinaGiorno(s.id, g.id);
      toast('Giorno ripristinato');
      vai(`/giorno/${s.id}/${g.id}`, { sostituisci: true });
    };
    el.querySelector('#btn-elimina').onclick = async () => {
      const ok = await conferma({ titolo: `Eliminare "${nome}"?`, testo: originale ? 'Il giorno sparisce dalla scheda. Potrai recuperarlo con "Ripristina scheda del coach".' : 'Il giorno verrà eliminato.', ok: 'Elimina', pericoloso: true });
      if (!ok) return;
      rimuoviGiorno(s.id, g.id);
      toast('Giorno eliminato');
      vai('/allenamento', { sostituisci: true });
    };

    el.querySelector('#voci').oninput = (ev) => {
      const inp = ev.target.closest('[data-campo]');
      if (!inp) return;
      const i = Number(inp.dataset.i), j = Number(inp.dataset.j);
      if (inp.dataset.campo === 'reps') voci[i].serie[j].reps = inp.value.trim();
      else if (inp.dataset.campo === 'notaSet') voci[i].serie[j].nota = inp.value.trim();
      else if (inp.dataset.campo === 'nota') voci[i].nota = inp.value.trim();
    };
    el.querySelector('#voci').onclick = (ev) => {
      const b = ev.target.closest('[data-az]');
      if (!b) return;
      const i = Number(b.dataset.i), j = Number(b.dataset.j);
      switch (b.dataset.az) {
        case 'su': if (i > 0) { [voci[i - 1], voci[i]] = [voci[i], voci[i - 1]]; disegna(); } break;
        case 'giu': if (i < voci.length - 1) { [voci[i + 1], voci[i]] = [voci[i], voci[i + 1]]; disegna(); } break;
        case 'rimuovi': voci.splice(i, 1); disegna(); break;
        case 'aggiungi-set': { const ult = voci[i].serie[voci[i].serie.length - 1]; voci[i].serie.push({ reps: ult ? ult.reps : '10', nota: '' }); disegna(); break; }
        case 'rimuovi-set': if (voci[i].serie.length > 1) { voci[i].serie.splice(j, 1); disegna(); } else toast('Serve almeno una serie'); break;
        case 'avv': voci[i].avvicinamento = !voci[i].avvicinamento; disegna(); break;
        case 'ss': voci[i].superset = b.dataset.v; disegna(); break;
        default: break;
      }
    };
  }

  function aggiungiEsercizio() {
    const gruppi = {};
    for (const e of tuttiEsercizi()) (gruppi[e.gruppo || 'Altro'] ||= []).push(e);
    const corpo = `
      <input class="input" id="cerca-ex" type="search" placeholder="Cerca esercizio" autocomplete="off" style="margin-bottom:12px">
      <div class="lista-ex">
        ${Object.keys(gruppi).sort().map((gr) => `<div class="lista-gruppo">${esc(gr)}</div>${gruppi[gr].sort((a, b) => a.nome.localeCompare(b.nome)).map((e) => `<button type="button" class="scelta" data-ex-id="${esc(e.id)}" data-nome="${esc(e.nome.toLowerCase())}">${esc(e.nome)}</button>`).join('')}`).join('')}
      </div>`;
    const chiudi = mostraFoglio({ titolo: 'Aggiungi esercizio', corpoHtml: corpo, chiudiTesto: 'Chiudi' });
    const foglio = document.querySelector('.sheet');
    foglio.classList.add('sheet-alta');
    const cerca = foglio.querySelector('#cerca-ex');
    cerca.oninput = () => {
      const q = cerca.value.trim().toLowerCase();
      foglio.querySelectorAll('[data-ex-id]').forEach((b) => { b.hidden = q && !b.dataset.nome.includes(q); });
      foglio.querySelectorAll('.lista-gruppo').forEach((x) => { x.hidden = !!q; });
    };
    foglio.querySelectorAll('[data-ex-id]').forEach((b) => {
      b.onclick = () => {
        chiudi();
        voci.push({ ex: b.dataset.exId, serie: [{ reps: '10', nota: '' }, { reps: '10', nota: '' }, { reps: '10', nota: '' }], nota: '', superset: '', avvicinamento: true });
        disegna();
        setTimeout(() => { const c = el.querySelectorAll('.ed-card'); c[c.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
      };
    });
  }

  function salva() {
    if (!nome.trim()) { toast('Dai un nome al giorno'); return; }
    if (!voci.length) { toast('Aggiungi almeno un esercizio'); return; }
    for (const v of voci) for (const x of v.serie) if (!x.reps) { toast('Ogni serie deve avere le reps'); return; }
    const esercizi = voci.map((v) => {
      const out = { ex: v.ex, serie: v.serie.map((x) => (x.nota ? { reps: x.reps, nota: x.nota } : x.reps)) };
      if (v.nota) out.nota = v.nota;
      if (v.superset) out.superset = v.superset;
      if (!v.avvicinamento) out.avvicinamento = false;
      return out;
    });
    salvaGiorno(s.id, g.id, { nome: nome.trim(), esercizi });
    toast('Giorno salvato');
    vai(`/giorno/${s.id}/${g.id}`, { sostituisci: true });
  }

  disegna();
}
