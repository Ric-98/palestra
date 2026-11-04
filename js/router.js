// Router minimale basato sull'hash: #/allenamento, #/profilo, #/scheda/:id ...
const routes = [];

function compila(pattern) {
  const keys = [];
  const src = pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; });
  return { keys, regex: new RegExp('^' + src + '/?$') };
}

export function route(pattern, handler) {
  routes.push({ pattern, handler, ...compila(pattern) });
}

export function percorsoCorrente() {
  const h = location.hash.replace(/^#/, '');
  return h || '/';
}

export function vai(path, { sostituisci = false } = {}) {
  if (sostituisci) location.replace('#' + path);
  else location.hash = path;
}

export function indietro(fallback) {
  if (history.length > 1) history.back();
  else vai(fallback, { sostituisci: true });
}

export function avviaRouter(defaultPath, onChange) {
  function render() {
    const path = percorsoCorrente();
    if (path === '/') { vai(defaultPath, { sostituisci: true }); return; }
    for (const r of routes) {
      const m = path.match(r.regex);
      if (m) {
        const params = {};
        r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
        onChange(path, r, params);
        return;
      }
    }
    vai(defaultPath, { sostituisci: true });
  }
  window.addEventListener('hashchange', render);
  render();
}
