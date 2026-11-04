import { html, raw, icone } from '../ui.js';

export function renderAlimentazione(el) {
  el.innerHTML = html`
    <header class="page-head">
      <h1 class="page-title">Alimentazione</h1>
    </header>
    <div class="card">
      <div class="empty" style="padding:28px 8px">
        ${raw(icone.mela)}
        <h3>Niente ancora qui</h3>
        <p>Dieta, integrazione e convertitore crudo/cotto arrivano nello step 3.</p>
      </div>
    </div>
  `.toString();
}
