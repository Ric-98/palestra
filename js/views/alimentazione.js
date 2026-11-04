// Tab Alimentazione: convertitore, dieta attuale, archivio.
import { html, raw, icone, formattaData } from '../ui.js';
import { vai } from '../router.js';
import { dietaAttiva, tutteDiete } from '../dati.js';

export function renderAlimentazione(el) {
  const d = dietaAttiva();
  const archivio = tutteDiete().filter((x) => !x.attiva);
  el.innerHTML = html`
    <header class="page-head">
      <h1 class="page-title">Alimentazione</h1>
    </header>

    <button type="button" class="card card-btn" id="btn-conv">
      <div class="row">${raw(icone.bilancia)}<span><span class="card-title" style="display:block">Convertitore crudo / cotto</span><span class="card-sub">Quanto pesa da cotto, o quanto era da crudo</span></span></div>
    </button>

    ${d ? html`
      <h2 class="section-title">${d.nome}</h2>
      <p class="muted small" style="margin:-6px 4px 12px">Dal ${formattaData(new Date(d.dal))}</p>
      <div class="list">
        ${(d.pasti || []).map((p) => html`
          <button type="button" class="list-item" data-pasto="${p.id}">
            <span class="li-body"><div class="li-title">${p.nome}</div><div class="li-sub">${p.quando}${p.righe ? ' · ' + p.righe.map((r) => r.tipo.toLowerCase()).join(', ') : ''}</div></span>
            <span class="li-right">${raw(icone.chevron)}</span>
          </button>`)}
        <button type="button" class="list-item" data-pasto="integrazione">
          <span class="li-body"><div class="li-title">Integrazione</div><div class="li-sub">${(d.integrazione || []).length} voci</div></span>
          <span class="li-right">${raw(icone.chevron)}</span>
        </button>
        <button type="button" class="list-item" data-pasto="regole">
          <span class="li-body"><div class="li-title">Indicazioni generali</div><div class="li-sub">${(d.regole || []).length} regole del coach</div></span>
          <span class="li-right">${raw(icone.chevron)}</span>
        </button>
      </div>
      <button type="button" class="btn primary block" id="btn-dieta" style="margin-top:12px">Apri la dieta completa</button>
    ` : html`<div class="card"><div class="empty"><h3>Nessuna dieta</h3></div></div>`}

    ${archivio.length ? html`
      <h2 class="section-title">Diete precedenti</h2>
      <div class="list">${archivio.map((x) => html`<button type="button" class="list-item" data-dieta="${x.id}"><span class="li-body"><div class="li-title">${x.nome}</div><div class="li-sub">${x.dal || ''}${x.al ? ' → ' + x.al : ''}</div></span><span class="li-right">${raw(icone.chevron)}</span></button>`)}</div>` : ''}
  `.toString();

  el.querySelector('#btn-conv').onclick = () => vai('/convertitore');
  if (d) {
    el.querySelector('#btn-dieta').onclick = () => vai('/dieta/' + d.id);
    el.querySelectorAll('[data-pasto]').forEach((b) => { b.onclick = () => vai(`/dieta/${d.id}/${b.dataset.pasto}`); });
  }
  el.querySelectorAll('[data-dieta]').forEach((b) => { b.onclick = () => vai('/dieta/' + b.dataset.dieta); });
}
