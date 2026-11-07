// Storico allenamenti: elenco e dettaglio.
import { html, raw, icone, toast, conferma, mostraFoglio, formattaData } from '../ui.js';
import { vai, indietro } from '../router.js';
import * as A from '../allenamenti.js';
import * as C from '../corrente.js';
import { esercizio } from '../dati.js';
import { inizia } from './allenamento.js';

function riga(a) {
  const st = A.statistiche(a);
  return html`
    <button type="button" class="list-item" data-id="${a.id}">
      <span class="li-body">
        <div class="li-title">${a.titolo}</div>
        <div class="li-sub">${formattaData(new Date(a.inizio), { weekday: 'short', day: 'numeric', month: 'short' })} · ${A.formattaDurata(st.durataSec)} · ${st.volume.toLocaleString('it-IT')} kg · ${st.serie} serie</div>
      </span>
      <span class="li-right">${raw(icone.chevron)}</span>
    </button>`;
}

export function renderStorico(el) {
  const tutti = A.tutti();
  const mesi = new Map();
  for (const a of tutti) {
    const d = new Date(a.inizio);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!mesi.has(k)) mesi.set(k, { titolo: formattaData(d, { month: 'long', year: 'numeric' }), voci: [] });
    mesi.get(k).voci.push(a);
  }
  el.innerHTML = html`
    <header class="page-head">
      <button type="button" class="icon-btn" id="btn-back" aria-label="Indietro">${raw(icone.indietro)}</button>
      <h1 class="page-title" style="font-size:24px">Storico</h1>
      <span style="width:44px"></span>
    </header>
    <p class="muted small" style="margin:0 4px 12px">${tutti.length} allenamenti</p>
    ${tutti.length ? Array.from(mesi.values()).map((m) => html`
      <h2 class="section-title" style="text-transform:capitalize">${m.titolo} <span class="muted small" style="font-weight:400">· ${m.voci.length}</span></h2>
      <div class="list">${m.voci.map(riga)}</div>`) : html`<div class="card"><div class="empty"><h3>Nessun allenamento</h3><p>Inizia dalla scheda o importa lo storico di Hevy dal Profilo.</p></div></div>`}
  `.toString();
  el.querySelector('#btn-back').onclick = () => indietro('/allenamento');
  el.querySelectorAll('[data-id]').forEach((b) => { b.onclick = () => vai('/storico/' + b.dataset.id); });
}

export function renderDettaglio(el, params) {
  const a = A.perId(params.id);
  if (!a) { vai('/storico', { sostituisci: true }); return; }
  const st = A.statistiche(a);
  const d = new Date(a.inizio);
  el.innerHTML = html`
    <header class="page-head">
      <button type="button" class="icon-btn" id="btn-back" aria-label="Indietro">${raw(icone.indietro)}</button>
      <div class="muted">Allenamento</div>
      <button type="button" class="icon-btn" id="btn-menu" aria-label="Opzioni">${raw(icone.punti)}</button>
    </header>
    <h1 class="page-title" style="font-size:26px">${a.titolo}</h1>
    <p class="muted" style="margin:4px 0 16px">${formattaData(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${formattaData(d, { hour: '2-digit', minute: '2-digit' })}${a.origine === 'hevy' ? ' · importato da Hevy' : ''}</p>
    <div class="allena-stats" style="margin:0 0 16px">
      <div><span>Durata</span><strong>${A.formattaDurata(st.durataSec)}</strong></div>
      <div><span>Volume</span><strong>${st.volume.toLocaleString('it-IT')} kg</strong></div>
      <div><span>Serie</span><strong>${st.serie}</strong></div>
    </div>
    ${a.stimatoSec || a.sforamentoSec ? html`<p class="muted small" style="margin:-8px 4px 14px">${a.stimatoSec ? `Durata stimata ${A.formattaDurata(a.stimatoSec)} · effettiva ${A.formattaDurata(st.durataSec)}` : ''}${a.sforamentoSec ? ` · riposi sforati ${A.formattaDurata(Math.round(a.sforamentoSec))}` : ''}</p>` : ''}
    ${a.note ? html`<div class="ex-note" style="margin-bottom:12px">${a.note}</div>` : ''}
    <div class="stack">
      ${(a.esercizi || []).map((e) => html`
        <div class="card">
          <p class="card-title" style="color:var(--accent)">${A.nomeEsercizioLog(e)}</p>
          ${e.nota ? html`<p class="card-sub">${e.nota}</p>` : ''}
          <div class="plan-table" style="margin-top:8px">
            ${(() => { let n = 0; return (e.serie || []).map((s) => {
              const num = s.tipo === 'W' ? 'W' : String(++n);
              const kg = s.kg === null || s.kg === undefined ? null : A.formattaKg(s.kg);
              return html`<div class="plan-row"><span class="${s.tipo === 'W' ? 'w' : ''}">${num}</span><span>${kg === null ? `${s.reps} reps` : `${kg} kg × ${s.reps}`}${s.pr ? raw(' <span class="trofeo">' + icone.trofeo + '</span>') : ''}</span><span class="muted">${s.rpe ? 'RPE ' + s.rpe : ''}</span></div>`;
            }); })()}
          </div>
        </div>`)}
    </div>
  `.toString();
  el.querySelector('#btn-back').onclick = () => indietro('/allenamento');
  el.querySelector('#btn-menu').onclick = () => {
    const chiudi = mostraFoglio({ titolo: a.titolo, corpoHtml: '<div class="scelte"><button type="button" class="scelta" id="sc-ripeti">Ripeti allenamento</button><button type="button" class="scelta" id="sc-modifica">Modifica allenamento</button><button type="button" class="scelta rosso" id="sc-elimina">Elimina allenamento</button></div>' });
    document.getElementById('sc-ripeti').onclick = () => {
      chiudi();
      const voci = (a.esercizi || []).map((e) => ({ ex: e.exId, superset: e.superset || null, avvicinamento: false, serie: (e.serie || []).map((x) => ({ reps: String(x.reps || ''), tipo: x.tipo || 'N' })) }));
      inizia({ titolo: a.titolo, schedaId: a.schedaId || null, giornoId: a.giornoId || null, voci });
    };
    document.getElementById('sc-modifica').onclick = () => {
      chiudi();
      if (C.inCorso()) { toast('Termina prima l\'allenamento in corso'); return; }
      const w = {
        ...a,
        modifica: true,
        esercizi: (a.esercizi || []).map((e) => ({
          exId: e.exId, nome: A.nomeEsercizioLog(e), gruppo: (esercizio(e.exId) || {}).gruppo || '', superset: e.superset || null, riposo: e.riposo || 0, nota: e.nota || '',
          serie: (e.serie || []).map((x) => ({ tipo: x.tipo || 'N', kg: x.kg === null || x.kg === undefined ? '' : String(x.kg), reps: String(x.reps ?? ''), rpe: x.rpe ?? null, fatto: true, pr: !!x.pr, target: x.target || '', notaSet: '' })),
        })),
      };
      C.salvaInCorso(w);
      vai('/allena');
    };
    document.getElementById('sc-elimina').onclick = async () => {
      chiudi();
      const ok = await conferma({ titolo: 'Eliminare questo allenamento?', testo: 'Non si può annullare.', ok: 'Elimina', pericoloso: true });
      if (!ok) return;
      A.elimina(a.id);
      toast('Allenamento eliminato');
      vai('/allenamento', { sostituisci: true });
    };
  };
}
