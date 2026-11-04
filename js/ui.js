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
  const chiudi = () => back.remove();
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
};
