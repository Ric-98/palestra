// Timer di riposo, suono di fine riposo, schermo sempre acceso, timer iPhone via Comando rapido.
import { impostazioni } from './store.js';

// ---- Audio ----
let ctx = null;
function contesto() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}
// Da chiamare dentro un gesto dell'utente (tocco), sblocca l'audio su iPhone
export function sbloccaAudio() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'ambient'; // non ferma la musica
    const c = contesto();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b; s.connect(c.destination); s.start(0);
  } catch (e) { /* ignora */ }
}

function tono(c, freq, inizio, durata, volume = 0.25) {
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

// Segnale corto: due note, ripetute due volte (circa 1 secondo)
export function suonaFineRiposo() {
  try {
    const c = contesto();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    const t = c.currentTime + 0.02;
    tono(c, 880, t, 0.14);
    tono(c, 1174.7, t + 0.17, 0.2);
    tono(c, 880, t + 0.55, 0.14);
    tono(c, 1174.7, t + 0.72, 0.26);
  } catch (e) { /* ignora */ }
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
