// Salvataggio dati: tutto in localStorage con prefisso, più backup/ripristino.
const PREFIX = 'palestra:';
export const SCHEMA = 1;

const key = (k) => PREFIX + k;

export const store = {
  get(k, fallback = null) {
    try {
      const raw = localStorage.getItem(key(k));
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.warn('store.get', k, e);
      return fallback;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(key(k), JSON.stringify(v));
      return true;
    } catch (e) {
      console.error('store.set', k, e);
      return false;
    }
  },
  remove(k) {
    try { localStorage.removeItem(key(k)); } catch (e) { /* ignora */ }
  },
  keys() {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
      }
    } catch (e) { /* ignora */ }
    return out;
  },
  clear() { this.keys().forEach((k) => this.remove(k)); },
  bytes() {
    let n = 0;
    try {
      for (const k of this.keys()) n += (localStorage.getItem(key(k)) || '').length * 2;
    } catch (e) { /* ignora */ }
    return n;
  },
};

// Impostazioni generali (nome, preferenze)
export function impostazioni() {
  return store.get('impostazioni', {});
}
export function salvaImpostazioni(patch) {
  const next = { ...impostazioni(), ...patch };
  store.set('impostazioni', next);
  return next;
}

// Chiede al browser di non cancellare i dati per liberare spazio
export async function richiediPersistenza() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const gia = await navigator.storage.persisted();
      if (!gia) await navigator.storage.persist();
    }
  } catch (e) { /* non supportato */ }
}

// ---- Backup ----
export function creaBackup() {
  const dati = {};
  for (const k of store.keys()) dati[k] = store.get(k);
  return {
    app: 'palestra',
    schema: SCHEMA,
    creato: new Date().toISOString(),
    dati,
  };
}

function nomeFileBackup() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `palestra-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.json`;
}

// Esporta: su iPhone apre il foglio di condivisione (Salva su File, AirDrop...),
// altrove scarica il file.
export async function esportaBackup() {
  const json = JSON.stringify(creaBackup(), null, 2);
  const nome = nomeFileBackup();
  try {
    const file = new File([json], nome, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Backup Palestra' });
      return 'condiviso';
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'annullato';
    // altrimenti si passa al download
  }
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'scaricato';
}

export function leggiBackup(testo) {
  let obj;
  try { obj = JSON.parse(testo); } catch (e) { throw new Error('Il file non è un backup valido (JSON non leggibile).'); }
  if (!obj || obj.app !== 'palestra' || typeof obj.dati !== 'object') {
    throw new Error('Il file non è un backup di questa app.');
  }
  if (typeof obj.schema === 'number' && obj.schema > SCHEMA) {
    throw new Error('Il backup viene da una versione più nuova dell\'app. Aggiorna prima l\'app.');
  }
  return obj;
}

export function applicaBackup(obj) {
  store.clear();
  for (const [k, v] of Object.entries(obj.dati)) store.set(k, v);
}

export function riassuntoBackup(obj) {
  const d = obj.dati || {};
  const n = (k) => (Array.isArray(d[k]) ? d[k].length : 0);
  return {
    creato: obj.creato ? new Date(obj.creato) : null,
    allenamenti: n('allenamenti'),
    misure: n('misure'),
    chiavi: Object.keys(d).length,
  };
}
