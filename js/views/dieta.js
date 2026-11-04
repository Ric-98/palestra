// Dieta completa: pasti con le opzioni da scegliere, pesi da cotto, integrazione, regole.
import { html, raw, icone, toast, formattaData } from '../ui.js';
import { vai, indietro } from '../router.js';
import { store } from '../store.js';
import { dieta, convertiPeso, alimentoConv } from '../dati.js';

function scelte() { return store.get('sceltePasti', {}) || {}; }
function sceltaDi(dietaId, pastoId, i) { return (((scelte()[dietaId] || {})[pastoId] || {})[i]); }
function salvaScelta(dietaId, pastoId, i, idx) {
  const s = scelte();
  s[dietaId] ||= {}; s[dietaId][pastoId] ||= {};
  if (idx === null) delete s[dietaId][pastoId][i]; else s[dietaId][pastoId][i] = idx;
  store.set('sceltePasti', s);
}
function prefCotto() { return store.get('vistaCotto', { attiva: false, metodo: 'bollito' }); }

function quantita(o) {
  if (o.g !== undefined) return `${o.g} g`;
  return o.q || '';
}
function testoCotto(o, pref) {
  if (!pref.attiva || !o.conv || o.g === undefined) return '';
  const r = convertiPeso(o.g, o.conv, pref.metodo);
  if (!r) return '';
  const a = alimentoConv(o.conv);
  return `≈ ${r.g} g da cotto${r.metodo !== pref.metodo ? ` (solo ${r.metodo})` : ''}${a && a.nome.toLowerCase() !== o.nome.toLowerCase() ? ` · come ${a.nome.toLowerCase()}` : ''}`;
}

function riga(d, p, r, i, pref) {
  const sel = sceltaDi(d.id, p.id, i);
  if (!r.scegli) {
    return html`
      <div class="riga-pasto">
        <div class="riga-tipo">${r.tipo}</div>
        ${r.opzioni.map((o) => html`
          <div class="voce"><span class="voce-q">${quantita(o)}</span> <span>${o.nome}</span>${o.nota ? html` <span class="muted">· ${o.nota}</span>` : ''}
            ${testoCotto(o, pref) ? html`<div class="voce-cotto">${testoCotto(o, pref)}</div>` : ''}</div>`)}
      </div>`;
  }
  const scelta = sel !== undefined ? r.opzioni[sel] : null;
  return html`
    <div class="riga-pasto">
      <div class="riga-tipo">${r.tipo} <span class="muted">· scegli uno</span></div>
      <div class="chips">
        ${r.opzioni.map((o, idx) => html`<button type="button" class="chip ${sel === idx ? 'on' : ''} ${sel !== undefined && sel !== idx ? 'dim' : ''}" data-pasto="${p.id}" data-riga="${i}" data-idx="${idx}"><b>${quantita(o)}</b> ${o.nome}</button>`)}
      </div>
      ${scelta && (scelta.nota || testoCotto(scelta, pref)) ? html`<div class="voce-cotto">${[scelta.nota, testoCotto(scelta, pref)].filter(Boolean).join(' · ')}</div>` : ''}
    </div>`;
}

export function renderDieta(el, params) {
  const d = dieta(params.id);
  if (!d) { vai('/alimentazione', { sostituisci: true }); return; }
  const pref = prefCotto();

  el.innerHTML = html`
    <header class="page-head">
      <button type="button" class="icon-btn" id="btn-back" aria-label="Indietro">${raw(icone.indietro)}</button>
      <div class="muted">Dieta</div>
      <span style="width:44px"></span>
    </header>
    <h1 class="page-title" style="font-size:26px">${d.nome}</h1>
    <p class="muted small" style="margin:4px 0 14px">Dal ${formattaData(new Date(d.dal))}. ${d.legenda || ''}</p>

    <div class="card" style="padding:12px 14px">
      <button type="button" class="list-item" id="btn-cotto" style="padding:4px 0; min-height:40px; border:0">
        <span class="li-body"><div class="li-title">Mostra i pesi da cotto</div><div class="li-sub">Dove la tabella ha il fattore</div></span>
        <span class="switch ${pref.attiva ? 'on' : ''}" aria-hidden="true"></span>
      </button>
      ${pref.attiva ? html`
      <div class="segmented" style="margin-top:10px">
        <button type="button" class="${pref.metodo === 'bollito' ? 'on' : ''}" data-metodo="bollito">Bollito</button>
        <button type="button" class="${pref.metodo === 'arrosto' ? 'on' : ''}" data-metodo="arrosto">Arrosto</button>
      </div>` : ''}
    </div>

    ${(d.pasti || []).map((p) => html`
      <section class="card pasto" id="pasto-${p.id}">
        <p class="card-title">${p.nome} <span class="muted" style="font-weight:400">· ${p.quando}</span></p>
        ${(p.righe || []).map((r, i) => riga(d, p, r, i, pref))}
        ${p.nota ? html`<div class="ex-note" style="margin-top:10px">${p.nota}</div>` : ''}
      </section>`)}

    <section class="card" id="pasto-integrazione">
      <p class="card-title">Integrazione</p>
      ${(d.integrazione || []).map((x) => html`<div class="voce">${x.q ? html`<span class="voce-q">${x.q}</span> ` : ''}<span>${x.nome}</span>${x.quando ? html` <span class="muted">· ${x.quando}</span>` : ''}</div>`)}
    </section>

    <section class="card" id="pasto-regole">
      <p class="card-title">Indicazioni generali</p>
      <ul class="steps" style="margin-top:6px">${(d.regole || []).map((x) => html`<li>${x}</li>`)}</ul>
    </section>
  `.toString();

  el.querySelector('#btn-back').onclick = () => indietro('/alimentazione');
  el.querySelector('#btn-cotto').onclick = () => { store.set('vistaCotto', { ...pref, attiva: !pref.attiva }); renderDieta(el, params); };
  el.querySelectorAll('[data-metodo]').forEach((b) => { b.onclick = () => { store.set('vistaCotto', { ...pref, metodo: b.dataset.metodo }); renderDieta(el, params); }; });
  el.querySelectorAll('.chip').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.idx), i = Number(b.dataset.riga), pastoId = b.dataset.pasto;
      const attuale = sceltaDi(d.id, pastoId, i);
      salvaScelta(d.id, pastoId, i, attuale === idx ? null : idx);
      const y = window.scrollY;
      renderDieta(el, params);
      window.scrollTo(0, y);
    };
  });

  if (params.pasto) {
    const target = el.querySelector('#pasto-' + params.pasto);
    if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }
}
