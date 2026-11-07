// Utility di interfaccia: template sicuri, toast, fogli di conferma, icone.

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(s);

// html`...` fa l'escape di tutti i valori, tranne quelli passati con raw() o altri html``
export function html(strings, ...vals) {
  let out = '';
  strings.forEach((str, i) => {
    out += str;
    if (i < vals.length) {
      const v = vals[i];
      if (v instanceof Raw) out += v.s;
      else if (Array.isArray(v)) out += v.map((x) => (x instanceof Raw ? x.s : esc(x ?? ''))).join('');
      else if (v === null || v === undefined || v === false) out += '';
      else out += esc(v);
    }
  });
  return new Raw(out);
}

let toastTimer = null;
export function toast(msg, ms = 2200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

function apriFoglio(contenuto) {
  const back = document.createElement('div');
  back.className = 'sheet-backdrop';
  back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${contenuto}</div>`;
  document.body.appendChild(back);
  let chiuso = false;
  const chiudi = () => {
    if (chiuso) return;
    chiuso = true;
    back.classList.add('via');
    setTimeout(() => back.remove(), 220);
  };
  back.addEventListener('click', (e) => { if (e.target === back) { chiudi(); back.dispatchEvent(new CustomEvent('annulla')); } });
  return { back, chiudi };
}

export function conferma({ titolo, testo = '', ok = 'OK', annulla = 'Annulla', pericoloso = false }) {
  return new Promise((resolve) => {
    const { back, chiudi } = apriFoglio(`
      <h3>${esc(titolo)}</h3>
      ${testo ? `<p>${esc(testo)}</p>` : ''}
      <div class="actions">
        <button type="button" class="btn ${pericoloso ? 'danger' : 'primary'}" data-ok>${esc(ok)}</button>
        <button type="button" class="btn" data-annulla>${esc(annulla)}</button>
      </div>`);
    back.querySelector('[data-ok]').onclick = () => { chiudi(); resolve(true); };
    back.querySelector('[data-annulla]').onclick = () => { chiudi(); resolve(false); };
    back.addEventListener('annulla', () => resolve(false));
  });
}

export function chiediTesto({ titolo, valore = '', placeholder = '', ok = 'Salva' }) {
  return new Promise((resolve) => {
    const { back, chiudi } = apriFoglio(`
      <h3>${esc(titolo)}</h3>
      <input class="input" type="text" value="${esc(valore)}" placeholder="${esc(placeholder)}" autocapitalize="none" autocomplete="off" style="margin-bottom:16px">
      <div class="actions">
        <button type="button" class="btn primary" data-ok>${esc(ok)}</button>
        <button type="button" class="btn" data-annulla>Annulla</button>
      </div>`);
    const input = back.querySelector('input');
    setTimeout(() => input.focus(), 50);
    const fine = () => { chiudi(); resolve(input.value.trim()); };
    back.querySelector('[data-ok]').onclick = fine;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') fine(); });
    back.querySelector('[data-annulla]').onclick = () => { chiudi(); resolve(null); };
    back.addEventListener('annulla', () => resolve(null));
  });
}

export function mostraFoglio({ titolo, corpoHtml, chiudiTesto = 'Chiudi' }) {
  const { back, chiudi } = apriFoglio(`
    <h3>${esc(titolo)}</h3>
    ${corpoHtml}
    <div class="actions" style="margin-top:16px">
      <button type="button" class="btn" data-annulla>${esc(chiudiTesto)}</button>
    </div>`);
  back.querySelector('[data-annulla]').onclick = chiudi;
  return chiudi;
}

export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

export function formattaBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function formattaData(d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Intl.DateTimeFormat('it-IT', opts).format(d);
}

const svg = (p, vb = '0 0 24 24') => `<svg viewBox="${vb}" aria-hidden="true">${p}</svg>`;
export const icone = {
  bilanciere: svg('<path d="M3 10h2v4H3zM19 10h2v4h-2zM6 7h2v10H6zM16 7h2v10h-2zM8 11h8v2H8z"/>'),
  mela: svg('<path d="M12 6c1.5-2 4-2.5 5.5-1.5C19.5 5.5 20 8 19.5 10.5c-.6 3.5-2 7-4 8.5-1 .8-2 .5-3.5 0-1.5.5-2.5.8-3.5 0-2-1.5-3.4-5-4-8.5C4 8 4.5 5.5 6.5 4.5 8 3.5 10.5 4 12 6zm0-1c0-2 1.5-3.5 3-3.5 0 2-1.5 3.5-3 3.5z"/>'),
  statistiche: svg('<path d="M3 17l5-5 4 4 8-8 1.5 1.5L12 19l-4-4-3.5 3.5zM3 3h2v16h14v2H3z"/>'),
  esercizi: svg('<path d="M3 10h2v4H3zM19 10h2v4h-2zM6 7h2v10H6zM16 7h2v10h-2zM8 11h8v2H8z"/>'),
  misure: svg('<path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM9 7h6l3 6-1.7 1-1.8-3.5V22h-2v-6h-1v6H9.5v-11.5L7.7 14 6 13z"/>'),
  calendario: svg('<path d="M7 2h2v2h6V2h2v2h3v18H4V4h3zm-1 7v11h12V9zm2 2h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zM8 15h2v2H8zm4 0h2v2h-2z"/>'),
  backup: svg('<path d="M12 3l4 4h-3v7h-2V7H8zM5 14h2v4h10v-4h2v6H5z"/>'),
  ripristina: svg('<path d="M12 15l-4-4h3V4h2v7h3zM5 14h2v4h10v-4h2v6H5z"/>'),
  telefono: svg('<path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 3v13h10V5zm3 15h4v1h-4z"/>'),
  info: svg('<path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-1 6h2v7h-2zm0-3h2v2h-2z"/>'),
  cestino: svg('<path d="M9 3h6l1 2h4v2H4V5h4zM6 8h12l-1 13H7z"/>'),
  matita: svg('<path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75zm17.7-10.2a1 1 0 0 0 0-1.4l-2.35-2.35a1 1 0 0 0-1.4 0l-1.84 1.84 3.75 3.75z"/>'),
  aggiorna: svg('<path d="M12 4V1L8 5l4 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/>'),
  chevron: svg('<path d="M9 6l6 6-6 6-1.4-1.4L12.2 12 7.6 7.4z"/>'),
  condividi: svg('<path d="M12 2l5 5h-3.5v8h-3V7H7zM5 14h2v5h10v-5h2v7H5z"/>'),
  check: svg('<path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.4-1.4z"/>'),
  trofeo: svg('<path d="M6 2h12v2h3v4a4 4 0 0 1-4 4h-.3A6 6 0 0 1 13 15.9V18h3v2H8v-2h3v-2.1A6 6 0 0 1 7.3 12H7a4 4 0 0 1-4-4V4h3zm0 4H5v2a2 2 0 0 0 2 2zm12 0v4a2 2 0 0 0 2-2V6z"/>'),
  rpe: svg('<path d="M12 4a9 9 0 0 0-9 9c0 2.4.9 4.6 2.5 6.2l1.4-1.4A7 7 0 1 1 19 13h2a9 9 0 0 0-9-9zm3.5 4.1L11 13a1.5 1.5 0 1 0 2 2l3.9-4.5z"/>'),
  punti: svg('<path d="M12 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>'),
  timer: svg('<path d="M9 1h6v2H9zm3 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm-1 2h2v5h-2z"/>'),
  nota: svg('<path d="M6 2h9l5 5v15H6zm8 1.5V8h4.5zM8 11h8v2H8zm0 4h8v2H8z"/>'),
  giu: svg('<path d="M12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8 18 9.4z"/>'),
  piu: svg('<path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/>'),
  indietro: svg('<path d="M15.4 7.4L10.8 12l4.6 4.6L14 18l-6-6 6-6z"/>'),
  play: svg('<path d="M8 5v14l11-7z"/>'),
  bilancia: svg('<path d="M12 3a2 2 0 0 1 2 2h5v2h-2.3l3.3 7a4 4 0 0 1-8 0h.1l3.2-7H13v9h4v2H7v-2h4V7H9.7l3.2 7H13a4 4 0 0 1-8 0l3.3-7H5V5h5a2 2 0 0 1 2-2zm7 8.3L17.4 14h3.2zM7 11.3 5.4 14h3.2z"/>'),
};
