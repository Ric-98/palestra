// Dieta completa: pasti con le opzioni, pesi da cotto, integrazione, regole.
import { html, raw, icone, formattaData } from '../ui.js';
import { vai, indietro } from '../router.js';
import { store } from '../store.js';
import { dieta, convertiPeso, alimentoConv, tabellaConversioni } from '../dati.js';

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
  const metodi = tabellaConversioni().metodi || {};
  let s = `≈ ${r.g} g da cotto`;
  if (r.metodo !== pref.metodo) s += ` (solo ${(metodi[r.metodo] || r.metodo).toLowerCase()})`;
  if (a && a.nome.toLowerCase() !== o.nome.toLowerCase()) s += ` · come ${a.nome.split(' (')[0].toLowerCase()}`;
  return s;
}

function voce(o, pref) {
  const cotto = testoCotto(o, pref);
  return html`
    <div class="voce">
      <span class="voce-q">${quantita(o)}</span> <span>${o.nome}</span>${o.nota ? html` <span class="muted">· ${o.nota}</span>` : ''}
      ${cotto ? html`<div class="voce-cotto">${cotto}</div>` : ''}
    </div>`;
}

function riga(r, pref) {
  return html`
    <div class="riga-pasto">
      <div class="riga-tipo">${r.tipo}${r.scegli ? html` <span class="muted">· scegli uno</span>` : ''}</div>
      ${r.opzioni.map((o) => voce(o, pref))}
    </div>`;
}

export function renderDieta(el, params) {
  const d = dieta(params.id);
  if (!d) { vai('/alimentazione', { sostituisci: true }); return; }
  const metodi = tabellaConversioni().metodi || {};

  function disegna(scorriAlPasto) {
    const pref = prefCotto();
    el.innerHTML = html`
      <header class="page-head">
        <button type="button" class="icon-btn" id="btn-back" aria-label="Indietro">${raw(icone.indietro)}</button>
        <div class="muted">Dieta</div>
        <span style="width:44px"></span>
      </header>
      <h1 class="page-title" style="font-size:26px">${d.nome}</h1>
      <p class="muted small" style="margin:4px 0 14px">Dal ${formattaData(new Date(d.dal))}</p>

      <div class="card" style="padding:12px 14px">
        <button type="button" class="list-item" id="btn-cotto" style="padding:4px 0; min-height:40px; border:0">
          <span class="li-body"><div class="li-title">Mostra i pesi da cotto</div><div class="li-sub">Per gli alimenti che si cuociono</div></span>
          <span class="switch ${pref.attiva ? 'on' : ''}" aria-hidden="true"></span>
        </button>
        ${pref.attiva ? html`
        <div class="chips" style="margin-top:10px">
          ${Object.keys(metodi).map((m) => html`<button type="button" class="chip ${pref.metodo === m ? 'on' : ''}" data-metodo="${m}">${metodi[m]}</button>`)}
        </div>` : ''}
      </div>

      ${(d.pasti || []).map((p) => html`
        <section class="card pasto" id="pasto-${p.id}">
          <p class="card-title">${p.nome} <span class="muted" style="font-weight:400">· ${p.quando}</span></p>
          ${(p.righe || []).map((r) => riga(r, pref))}
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
    el.querySelector('#btn-cotto').onclick = () => {
      const y = window.scrollY;
      store.set('vistaCotto', { ...prefCotto(), attiva: !pref.attiva });
      disegna(false);
      window.scrollTo(0, y);
    };
    el.querySelectorAll('[data-metodo]').forEach((b) => {
      b.onclick = () => {
        const y = window.scrollY;
        store.set('vistaCotto', { ...prefCotto(), metodo: b.dataset.metodo });
        disegna(false);
        window.scrollTo(0, y);
      };
    });

    if (scorriAlPasto && params.pasto) {
      const target = el.querySelector('#pasto-' + params.pasto);
      if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }

  disegna(true);
}
