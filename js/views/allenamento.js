import { html, raw, icone } from '../ui.js';

export function renderAllenamento(el) {
  el.innerHTML = html`
    <header class="page-head">
      <h1 class="page-title">Allenamento</h1>
    </header>
    <h2 class="section-title" style="margin-top:8px">Schede</h2>
    <div class="card">
      <div class="empty" style="padding:28px 8px">
        ${raw(icone.bilanciere)}
        <h3>Nessuna scheda ancora</h3>
        <p>La scheda del coach e il registro allenamenti arrivano nello step 2.</p>
      </div>
    </div>
  `.toString();
}
