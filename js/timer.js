// Timer di riposo, suono di fine riposo, schermo sempre acceso, timer iPhone via Comando rapido.
import { impostazioni } from './store.js';

// ---- Audio ----
// Su iPhone il motore audio della pagina viene sospeso quando un'altra app (es. Spotify)
// prende l'audio, e non riparte da solo: lo riattiviamo a ogni gesto e prima del beep,
// e se non riparte usiamo un <audio> di riserva con lo stesso suono.
let ctx = null;
let audioRiserva = null;
let riservaPronta = false;

function sessione(tipo) {
  try { if (navigator.audioSession) navigator.audioSession.type = tipo; } catch (e) { /* ignora */ }
}

function nuovoContesto() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { if (ctx && ctx.state !== 'closed') ctx.close(); } catch (e) { /* ignora */ }
  ctx = new AC();
  return ctx;
}
function contesto() {
  if (!ctx || ctx.state === 'closed') return nuovoContesto();
  return ctx;
}
async function riattiva(c) {
  if (!c) return false;
  if (c.state === 'running') return true;
  try { await c.resume(); } catch (e) { /* ignora */ }
  if (c.state === 'running') return true;
  // Safari segnala "interrupted" e a volte non riparte: si ricrea il contesto
  const n = nuovoContesto();
  if (!n) return false;
  try { await n.resume(); } catch (e) { /* ignora */ }
  return n.state === 'running';
}

// File WAV generato una volta sola con lo stesso segnale (due note, ripetute)
function wavBeep() {
  const sr = 22050, durata = 1.05;
  const n = Math.floor(sr * durata);
  const note = [[880, 0.00, 0.14], [1174.7, 0.17, 0.20], [880, 0.55, 0.14], [1174.7, 0.72, 0.26]];
  const campioni = new Float32Array(n);
  for (const [f, t0, d] of note) {
    const a = Math.floor(t0 * sr), b = Math.min(n, Math.floor((t0 + d) * sr));
    for (let i = a; i < b; i++) {
      const t = (i - a) / sr;
      const env = Math.min(1, t / 0.01, (b - i) / sr / 0.03);
      campioni[i] += 0.5 * env * Math.sin(2 * Math.PI * f * t);
    }
  }
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const scrivi = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  scrivi(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); scrivi(8, 'WAVE'); scrivi(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); scrivi(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, campioni[i])) * 32767, true);
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return 'data:audio/wav;base64,' + btoa(bin);
}
function riserva() {
  if (!audioRiserva) {
    audioRiserva = new Audio(wavBeep());
    audioRiserva.setAttribute('playsinline', '');
    audioRiserva.preload = 'auto';
  }
  return audioRiserva;
}

// Da chiamare dentro un gesto dell'utente (tocco): sblocca o riattiva l'audio su iPhone
export function sbloccaAudio() {
  sessione('ambient'); // non ferma la musica di altre app
  const c = contesto();
  if (c) {
    riattiva(c).then((ok) => {
      if (!ok) return;
      try {
        const b = c.createBuffer(1, 1, 22050);
        const s = c.createBufferSource();
        s.buffer = b; s.connect(c.destination); s.start(0);
      } catch (e) { /* ignora */ }
    });
  }
  if (!riservaPronta) {
    try {
      const r = riserva();
      r.muted = true;
      const p = r.play();
      if (p && p.then) p.then(() => { r.pause(); r.currentTime = 0; r.muted = false; riservaPronta = true; }).catch(() => { r.muted = false; });
      else { r.pause(); r.currentTime = 0; r.muted = false; riservaPronta = true; }
    } catch (e) { /* ignora */ }
  }
}

function tono(c, freq, inizio, durata, volume = 0.3) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, inizio);
  g.gain.linearRampToValueAtTime(volume, inizio + 0.01);
  g.gain.setValueAtTime(volume, inizio + durata - 0.03);
  g.gain.linearRampToValueAtTime(0, inizio + durata);
  o.connect(g); g.connect(c.destination);
  o.start(inizio); o.stop(inizio + durata + 0.02);
}

// Segnale corto: due note, ripetute due volte (circa 1 secondo), sopra la musica
export async function suonaFineRiposo() {
  sessione('transient'); // suono breve: abbassa la musica un attimo invece di fermarla
  let suonato = false;
  try {
    const c = contesto();
    if (c && (await riattiva(c))) {
      const t = c.currentTime + 0.02;
      tono(c, 880, t, 0.14);
      tono(c, 1174.7, t + 0.17, 0.2);
      tono(c, 880, t + 0.55, 0.14);
      tono(c, 1174.7, t + 0.72, 0.26);
      suonato = true;
    }
  } catch (e) { /* ignora */ }
  if (!suonato) {
    try {
      const r = riserva();
      r.currentTime = 0;
      await r.play();
      suonato = true;
    } catch (e) { /* ignora */ }
  }
  setTimeout(() => sessione('ambient'), 1600);
  return suonato;
}

// ---- Schermo acceso ----
let wakeLock = null;
export async function tieniSchermoAcceso() {
  try {
    if (!('wakeLock' in navigator)) return;
    if (wakeLock) return;
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) { wakeLock = null; }
}
export async function lasciaSchermo() {
  try { if (wakeLock) await wakeLock.release(); } catch (e) { /* ignora */ }
  wakeLock = null;
}
let attivoSchermo = false;
export function schermoAccesoDurante(attivo) {
  attivoSchermo = attivo;
  if (attivo) tieniSchermoAcceso(); else lasciaSchermo();
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && attivoSchermo) tieniSchermoAcceso();
});

// ---- Timer iPhone (Comando rapido "Riposo") ----
export function avviaTimerIphone(secondi) {
  const imp = impostazioni();
  if (!imp.timerIphone) return false;
  const nome = (imp.nomeComando || 'Riposo').trim();
  const url = `shortcuts://run-shortcut?name=${encodeURIComponent(nome)}&input=text&text=${encodeURIComponent(String(secondi))}`;
  try { window.location.href = url; return true; } catch (e) { return false; }
}

// ---- Timer di riposo ----
const stato = { fine: 0, durata: 0, attivo: false, suonato: false };
const ascoltatori = new Set();
let intervallo = null;

function notifica() { for (const f of ascoltatori) { try { f(letto()); } catch (e) { /* ignora */ } } }
function tick() {
  if (!stato.attivo) return;
  const r = restante();
  if (r <= 0 && !stato.suonato) {
    stato.suonato = true;
    suonaFineRiposo();
    stato.attivo = false;
    clearInterval(intervallo); intervallo = null;
    notifica();
    return;
  }
  notifica();
}
export function letto() { return { attivo: stato.attivo, restante: restante(), durata: stato.durata }; }
export function restante() { return stato.attivo ? Math.max(0, Math.ceil((stato.fine - Date.now()) / 1000)) : 0; }
export function avviaRiposo(secondi) {
  if (!secondi || secondi <= 0) return;
  stato.fine = Date.now() + secondi * 1000;
  stato.durata = secondi;
  stato.attivo = true;
  stato.suonato = false;
  clearInterval(intervallo);
  intervallo = setInterval(tick, 250);
  avviaTimerIphone(secondi);
  notifica();
}
export function aggiungiRiposo(secondi) {
  if (!stato.attivo) return;
  stato.fine += secondi * 1000;
  if (stato.fine < Date.now()) stato.fine = Date.now();
  stato.durata = Math.max(0, stato.durata + secondi);
  notifica();
}
export function fermaRiposo() {
  stato.attivo = false;
  clearInterval(intervallo); intervallo = null;
  notifica();
}
export function ascoltaRiposo(f) { ascoltatori.add(f); return () => ascoltatori.delete(f); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });
