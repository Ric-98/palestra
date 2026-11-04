// Convertitore crudo <-> cotto: tabella del coach più i fattori ufficiali SINU/LARN 2024.
import { html, raw, esc, icone, mostraFoglio } from '../ui.js';
import { indietro } from '../router.js';
import { store } from '../store.js';
import { tabellaConversioni, alimentoConv, convertiPeso, METODI, fonteConv } from '../dati.js';

function stato() { return store.get('convertitore', { alimento: 'riso', metodo: 'bollito', verso: 'crudo-cotto', grammi: '100', personalizzato: '' }); }
function salva(patch) { store.set('convertitore', { ...stato(), ...patch }); }
const fmt = (n) => String(Math.round(n * 100) / 100).replace('.', ',');

function fattoriTesto(x, metodi) {
  return METODI.filter((m) => x[m]).map((m) => `${(metodi[m] || m).toLowerCase()} ${fmt(x[m])}`).join(' · ');
}

export function renderConvertitore(el, params) {
  if (params && params.alimento && alimentoConv(params.alimento)) salva({ alimento: params.alimento, grammi: params.g || stato().grammi, verso: 'crudo-cotto' });
  const s = stato();
  const tab = tabellaConversioni();
  const metodi = tab.metodi || {};
  const a = alimentoConv(s.alimento) || tab.alimenti[0];
  const fattorePers = s.personalizzato ? Number(String(s.personalizzato).replace(',', '.')) : null;
  const usaPers = fattorePers && fattorePers > 0 ? fattorePers : null;
  const daCotto = s.verso === 'cotto-crudo';
  const fonte = fonteConv(a.fonte);

  const categorie = {};
  for (const x of tab.alimenti) (categorie[x.categoria] ||= []).push(x);
  const ordineCat = ['Cereali e derivati', 'Carne', 'Pesce fresco', 'Pesce surgelato', 'Legumi secchi', 'Legumi freschi', 'Verdure e ortaggi'];
  const cats = Object.keys(categorie).sort((x, y) => (ordineCat.indexOf(x) + 100) % 100 - (ordineCat.indexOf(y) + 100) % 100);

  function risultatoHtml() {
    const st = stato();
    const fp = st.personalizzato ? Number(String(st.personalizzato).replace(',', '.')) : null;
    const g = String(st.grammi).replace(',', '.');
    const rr = convertiPeso(g, a.id, st.metodo, st.verso, fp && fp > 0 ? fp : null);
    if (!rr) return '<div class="muted">Inserisci i grammi</div>';
    const metodoTesto = fp ? 'fattore personalizzato' : (metodi[rr.metodo] || rr.metodo).toLowerCase();
    let extra = '';
    if (!fp && rr.metodo !== st.metodo) extra = `<div class="muted small">Per questo alimento non c'è il valore "${esc((metodi[st.metodo] || st.metodo).toLowerCase())}": uso ${esc(metodoTesto)}.</div>`;
    return `<div class="risultato-g">≈ ${rr.g} g</div><div class="muted">${daCotto ? 'da crudo' : 'da cotto'} · ${esc(fmt(Number(g)))} g ${daCotto ? '÷' : '×'} ${esc(fmt(rr.fattore))} (${esc(metodoTesto)})</div>${extra}`;
  }

  el.innerHTML = html`
    <header class="page-head">
      <button type="button" class="icon-btn" id="btn-back" aria-label="Indietro">${raw(icone.indietro)}</button>
      <div class="muted">Convertitore</div>
      <span style="width:44px"></span>
    </header>
    <h1 class="page-title" style="font-size:26px">Crudo ↔ cotto</h1>

    <div class="card" style="margin-top:12px">
      <div class="segmented">
        <button type="button" class="${!daCotto ? 'on' : ''}" data-verso="crudo-cotto">Da crudo a cotto</button>
        <button type="button" class="${daCotto ? 'on' : ''}" data-verso="cotto-crudo">Da cotto a crudo</button>
      </div>

      <button type="button" class="list-item" id="btn-alimento" style="margin-top:12px; border:0; padding:10px 0">
        <span class="li-body"><div class="li-sub">Alimento</div><div class="li-title" style="color:var(--accent); font-weight:600">${a.nome}</div><div class="li-sub">${a.categoria}${fonte ? ' · ' + fonte.nome : ''}</div></span>
        <span class="li-right">${raw(icone.chevron)}</span>
      </button>

      <div class="chips" style="margin-top:6px">
        ${METODI.filter((m) => a[m]).map((m) => html`<button type="button" class="chip ${s.metodo === m ? 'on' : ''}" data-metodo="${m}">${metodi[m] || m} <span class="muted">× ${fmt(a[m])}</span></button>`)}
      </div>

      <label class="campo" style="margin-top:14px">
        <span class="li-sub">${daCotto ? 'Peso da cotto (g)' : 'Peso da crudo (g)'}</span>
        <input class="input grande" id="in-grammi" type="text" inputmode="decimal" value="${s.grammi}" placeholder="100">
      </label>

      <div class="risultato">${raw(risultatoHtml())}</div>

      <details ${s.personalizzato ? 'open' : ''}>
        <summary class="muted small">Fattore personalizzato (se a casa hai misurato un valore diverso)</summary>
        <input class="input" id="in-pers" type="text" inputmode="decimal" value="${s.personalizzato}" placeholder="es. 2,3" style="margin-top:8px">
      </details>
    </div>

    <p class="muted small" style="margin:12px 4px">${tab.nota || ''}</p>
    <p class="muted small" style="margin:0 4px 4px">Fonti: ${raw(Object.values(tab.fonti || {}).map((f) => f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nome)}</a>` : esc(f.nome)).join(' · '))}.</p>

    <h2 class="section-title">Tabella completa</h2>
    ${cats.map((c) => html`
      <div class="card" style="padding:10px 14px">
        <p class="card-sub" style="font-weight:600; color:var(--text); margin-bottom:4px">${c}</p>
        ${categorie[c].map((x) => html`<button type="button" class="tab-riga ${x.id === a.id ? 'on' : ''}" data-alimento="${x.id}"><span class="tab-nome">${x.nome}</span><span class="tab-fattori">${fattoriTesto(x, metodi)}${x.fonte === 'larn2024' ? ' · LARN' : ''}</span></button>`)}
      </div>`)}
  `.toString();

  const ridisegna = () => { const y = window.scrollY; renderConvertitore(el); window.scrollTo(0, y); };
  el.querySelector('#btn-back').onclick = () => indietro('/alimentazione');
  el.querySelectorAll('[data-verso]').forEach((b) => { b.onclick = () => { salva({ verso: b.dataset.verso }); ridisegna(); }; });
  el.querySelectorAll('[data-metodo]').forEach((b) => { b.onclick = () => { salva({ metodo: b.dataset.metodo }); ridisegna(); }; });
  el.querySelectorAll('[data-alimento]').forEach((b) => { b.onclick = () => { salva({ alimento: b.dataset.alimento }); renderConvertitore(el); }; });

  const aggiornaRisultato = () => { el.querySelector('.risultato').innerHTML = risultatoHtml(); };
  el.querySelector('#in-grammi').oninput = (ev) => { salva({ grammi: ev.target.value.trim() }); aggiornaRisultato(); };
  el.querySelector('#in-pers').oninput = (ev) => { salva({ personalizzato: ev.target.value.trim() }); aggiornaRisultato(); };

  el.querySelector('#btn-alimento').onclick = () => {
    const corpo = `
      <input class="input" id="cerca-al" type="search" placeholder="Cerca alimento" autocomplete="off" style="margin-bottom:12px">
      <div class="lista-ex">
        ${cats.map((c) => `<div class="lista-gruppo">${esc(c)}</div>${categorie[c].map((x) => `<button type="button" class="scelta ${x.id === a.id ? 'on' : ''}" data-id="${esc(x.id)}" data-nome="${esc(x.nome.toLowerCase())}">${esc(x.nome)}<span class="muted small" style="display:block">${esc(fattoriTesto(x, metodi))}</span></button>`).join('')}`).join('')}
      </div>`;
    const chiudi = mostraFoglio({ titolo: 'Scegli l\'alimento', corpoHtml: corpo, chiudiTesto: 'Chiudi' });
    const foglio = document.querySelector('.sheet');
    foglio.classList.add('sheet-alta');
    const cerca = foglio.querySelector('#cerca-al');
    cerca.oninput = () => {
      const q = cerca.value.trim().toLowerCase();
      foglio.querySelectorAll('[data-id]').forEach((b) => { b.hidden = q && !b.dataset.nome.includes(q); });
      foglio.querySelectorAll('.lista-gruppo').forEach((g) => { g.hidden = !!q; });
    };
    foglio.querySelectorAll('[data-id]').forEach((b) => { b.onclick = () => { chiudi(); salva({ alimento: b.dataset.id }); renderConvertitore(el); }; });
  };
}
