// Registro allenamento in corso (stile Hevy "Log Workout").
import { html, raw, esc, icone, toast, conferma, chiediTesto, mostraFoglio } from '../ui.js';
import { vai } from '../router.js';
import * as C from '../corrente.js';
import * as A from '../allenamenti.js';
import { tuttiEsercizi, schedaAttiva } from '../dati.js';
import * as T from '../timer.js';
import { bloccaAutoAggiornamento } from '../app.js';

let w = null;
let prevCache = {};
let recCache = {};
let orologio = null;
let salvaTimer = null;
let el = null;
let chiuso = false; // true dopo Termina/Annulla: la pagina non deve più salvare lo stato

const RIPOSI = [0, 60, 90, 120, 150, 180, 240, 300];
const RPE = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

function salva() {
  clearTimeout(salvaTimer);
  salvaTimer = setTimeout(() => C.salvaInCorso(w), 150);
}
function salvaSubito() { clearTimeout(salvaTimer); C.salvaInCorso(w); }

function calcolaCache() {
  for (const e of w.esercizi) {
    if (!(e.exId in prevCache)) prevCache[e.exId] = A.precedente(e.exId, w.id);
    if (!(e.exId in recCache)) recCache[e.exId] = A.record(e.exId, w.id);
  }
}

function fmtRiposo(sec) {
  if (!sec) return 'Off';
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}min ${s}s`;
}
function testoSet(s) {
  if (!s) return '—';
  const kg = s.kg === null || s.kg === '' || s.kg === undefined ? null : A.formattaKg(s.kg);
  if (kg === null) return `${s.reps} reps`;
  return `${kg}kg × ${s.reps}`;
}
function numeroSet(e, j) {
  if (e.serie[j].tipo === 'W') return 'W';
  let n = 0;
  for (let k = 0; k <= j; k++) if (e.serie[k].tipo !== 'W') n++;
  return String(n);
}
function indiceNelTipo(e, j) {
  const t = e.serie[j].tipo;
  let n = 0;
  for (let k = 0; k < j; k++) if (e.serie[k].tipo === t) n++;
  return n;
}
function primoDiSuperset(i) {
  const e = w.esercizi[i], n = w.esercizi[i + 1];
  return !!(e.superset && n && n.superset === e.superset);
}

function rigaSet(e, i, j) {
  const s = e.serie[j];
  const prev = A.setPrecedente(prevCache[e.exId], s.tipo, indiceNelTipo(e, j));
  const kgPh = prev && prev.kg !== null && prev.kg !== undefined ? A.formattaKg(prev.kg) : '';
  const repsPh = s.target || (prev ? String(prev.reps) : '');
  return html`
    <div class="set-row ${s.fatto ? 'done' : ''}" data-set="${j}">
      <button type="button" class="set-num ${s.tipo === 'W' ? 'w' : ''}" data-azione="tipo" data-ex="${i}" data-set="${j}">${numeroSet(e, j)}</button>
      <span class="set-prev">${testoSet(prev)}</span>
      <input class="set-in" type="text" inputmode="decimal" autocomplete="off" data-campo="kg" data-ex="${i}" data-set="${j}" value="${s.kg ?? ''}" placeholder="${kgPh}">
      <input class="set-in" type="text" inputmode="numeric" autocomplete="off" data-campo="reps" data-ex="${i}" data-set="${j}" value="${s.reps ?? ''}" placeholder="${repsPh}">
      <button type="button" class="set-rpe ${s.rpe ? 'on' : ''}" data-azione="rpe" data-ex="${i}" data-set="${j}">${s.rpe ? s.rpe : raw(icone.rpe)}</button>
      <button type="button" class="set-check ${s.fatto ? 'on' : ''}" data-azione="check" data-ex="${i}" data-set="${j}" aria-label="Completato">${s.pr ? raw(icone.trofeo) : raw(icone.check)}</button>
    </div>
    ${s.notaSet ? html`<div class="set-nota">${s.notaSet}</div>` : ''}`;
}

function cardEsercizio(i) {
  const e = w.esercizi[i];
  return html`
    <section class="ex-card" data-ex="${i}" id="ex-${i}">
      <div class="ex-head">
        <div class="ex-name">${e.nome}${e.superset ? html` <span class="tag-ss">Superserie ${e.superset}</span>` : ''}</div>
        <button type="button" class="icon-btn small" data-azione="menu-ex" data-ex="${i}" aria-label="Opzioni esercizio">${raw(icone.punti)}</button>
      </div>
      <div class="ex-tools">
        <button type="button" class="pill" data-azione="riposo" data-ex="${i}">${raw(icone.timer)} Riposo: ${fmtRiposo(e.riposo)}</button>
        <button type="button" class="pill" data-azione="nota" data-ex="${i}">${raw(icone.nota)} Nota</button>
      </div>
      ${e.nota ? html`<div class="ex-note">${e.nota}</div>` : ''}
      <div class="set-table">
        <div class="set-row head"><span>Set</span><span>Precedente</span><span>Kg</span><span>Reps</span><span>RPE</span><span>${raw(icone.check)}</span></div>
        ${e.serie.map((_, j) => rigaSet(e, i, j))}
      </div>
      <button type="button" class="btn block small" data-azione="add-set" data-ex="${i}">+ Aggiungi set</button>
    </section>`;
}

function layout() {
  return html`
    <header class="allena-head">
      <div class="allena-top">
        <button type="button" class="icon-btn" id="btn-min" aria-label="Riduci">${raw(icone.giu)}</button>
        <div class="allena-title">${w.modifica ? 'Modifica · ' : ''}${w.titolo}</div>
        <button type="button" class="btn primary small" id="btn-fine">${w.modifica ? 'Salva' : 'Termina'}</button>
      </div>
      <div class="allena-stats">
        <div><span>Durata</span><strong id="st-durata">0:00</strong></div>
        <div><span>Volume</span><strong id="st-volume">0 kg</strong></div>
        <div><span>Serie</span><strong id="st-serie">0</strong></div>
      </div>
    </header>
    <div id="esercizi">${w.esercizi.map((_, i) => cardEsercizio(i))}</div>
    <div class="stack" style="margin-top:16px">
      <button type="button" class="btn block" id="btn-add-ex">+ Aggiungi esercizio</button>
      <button type="button" class="btn block ghost rosso" id="btn-annulla">${w.modifica ? 'Annulla modifiche' : 'Annulla allenamento'}</button>
    </div>
    <div class="timer-bar" id="timer-bar" hidden>
      <div class="timer-progress"><div class="timer-progress-fill" id="timer-fill"></div></div>
      <button type="button" class="timer-btn" data-azione="t-meno">-15</button>
      <div class="timer-time" id="timer-time">0:00</div>
      <button type="button" class="timer-btn" data-azione="t-piu">+15</button>
      <button type="button" class="timer-btn salta" data-azione="t-salta">Salta</button>
    </div>`.toString();
}

function aggiornaStats() {
  const st = A.statistiche({ ...w, fine: new Date().toISOString() });
  el.querySelector('#st-volume').textContent = `${st.volume.toLocaleString('it-IT')} kg`;
  el.querySelector('#st-serie').textContent = String(st.serie);
}
function aggiornaDurata() {
  const d = el.querySelector('#st-durata');
  if (!d) return;
  const fine = w.modifica && w.fine ? new Date(w.fine) : Date.now();
  d.textContent = A.formattaOrologio((fine - new Date(w.inizio)) / 1000);
}
function aggiornaTimer() {
  const bar = el.querySelector('#timer-bar');
  if (!bar) return;
  const t = T.letto();
  bar.hidden = !t.attivo;
  if (!t.attivo) return;
  el.querySelector('#timer-time').textContent = A.formattaOrologio(t.restante);
  const perc = t.durata ? Math.max(0, Math.min(100, (t.restante / t.durata) * 100)) : 0;
  el.querySelector('#timer-fill').style.width = perc + '%';
}
function ridisegnaCard(i) {
  const vecchio = el.querySelector(`#ex-${i}`);
  if (!vecchio) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = cardEsercizio(i).toString();
  vecchio.replaceWith(tmp.firstElementChild);
}
function ridisegnaTutto() {
  el.querySelector('#esercizi').innerHTML = w.esercizi.map((_, i) => cardEsercizio(i)).join('');
  aggiornaStats();
}

function spunta(i, j) {
  const e = w.esercizi[i], s = e.serie[j];
  T.sbloccaAudio();
  if (s.fatto) {
    s.fatto = false; s.pr = false;
    salva(); ridisegnaCard(i); aggiornaStats();
    return;
  }
  const prev = A.setPrecedente(prevCache[e.exId], s.tipo, indiceNelTipo(e, j));
  if (s.kg === '' || s.kg === null || s.kg === undefined) {
    if (prev && prev.kg !== null && prev.kg !== undefined) s.kg = String(A.formattaKg(prev.kg)).replace(',', '.');
  }
  if (!s.reps) {
    if (prev && prev.reps) s.reps = String(prev.reps);
    else { const t = parseInt(s.target, 10); if (t) s.reps = String(t); }
  }
  if (!s.reps || !(Number(String(s.reps).replace(',', '.')) > 0)) { toast('Inserisci le ripetizioni'); return; }
  s.fatto = true;
  s.pr = false;
  const kg = Number(String(s.kg).replace(',', '.'));
  const reps = Number(String(s.reps).replace(',', '.'));
  if (s.tipo !== 'W' && kg > 0) {
    const rec = recCache[e.exId] || { kgMax: 0, rmMax: 0 };
    const rm = A.oneRm(kg, reps);
    if ((rec.kgMax > 0 || rec.rmMax > 0) && (kg > rec.kgMax + 0.001 || rm > rec.rmMax + 0.001)) s.pr = true;
    rec.kgMax = Math.max(rec.kgMax, kg); rec.rmMax = Math.max(rec.rmMax, rm);
    recCache[e.exId] = rec;
  }
  salva();
  if (!w.modifica && e.riposo > 0 && !primoDiSuperset(i)) T.avviaRiposo(e.riposo);
  ridisegnaCard(i); aggiornaStats();
  if (s.pr) toast('Nuovo record personale!');
}

function sceltaLista({ titolo, voci, valore, griglia = false }) {
  return new Promise((resolve) => {
    const corpo = `<div class="scelte ${griglia ? 'griglia' : ''}">${voci.map((v) => `<button type="button" class="scelta ${v.valore === valore ? 'on' : ''} ${v.classe || ''}" data-v="${esc(String(v.valore))}">${esc(v.testo)}</button>`).join('')}</div>`;
    const chiudi = mostraFoglio({ titolo, corpoHtml: corpo, chiudiTesto: 'Annulla' });
    document.querySelectorAll('.sheet .scelta').forEach((b) => {
      b.onclick = () => { chiudi(); resolve(b.dataset.v); };
    });
    document.querySelector('.sheet [data-annulla]').addEventListener('click', () => resolve(null));
  });
}

async function menuEsercizio(i) {
  const e = w.esercizi[i];
  const v = await sceltaLista({ titolo: e.nome, voci: [
    { valore: 'nota', testo: 'Nota esercizio' },
    { valore: 'riposo', testo: 'Tempo di riposo' },
    { valore: 'su', testo: 'Sposta su' },
    { valore: 'giu', testo: 'Sposta giù' },
    { valore: 'rimuovi', testo: 'Rimuovi esercizio', classe: 'rosso' },
  ] });
  if (v === 'nota') return notaEsercizio(i);
  if (v === 'riposo') return riposoEsercizio(i);
  if (v === 'su' && i > 0) { [w.esercizi[i - 1], w.esercizi[i]] = [w.esercizi[i], w.esercizi[i - 1]]; salva(); ridisegnaTutto(); }
  if (v === 'giu' && i < w.esercizi.length - 1) { [w.esercizi[i + 1], w.esercizi[i]] = [w.esercizi[i], w.esercizi[i + 1]]; salva(); ridisegnaTutto(); }
  if (v === 'rimuovi') {
    const ok = await conferma({ titolo: 'Rimuovere ' + e.nome + '?', ok: 'Rimuovi', pericoloso: true });
    if (ok) { w.esercizi.splice(i, 1); salva(); ridisegnaTutto(); }
  }
}
async function notaEsercizio(i) {
  const e = w.esercizi[i];
  const v = await chiediTesto({ titolo: 'Nota per ' + e.nome, valore: e.nota || '', placeholder: 'es. sedile al 4, presa larga' });
  if (v === null) return;
  e.nota = v;
  C.salvaPrefEsercizio(e.exId, { nota: v });
  salva(); ridisegnaCard(i);
}
async function riposoEsercizio(i) {
  const e = w.esercizi[i];
  const v = await sceltaLista({ titolo: 'Riposo per ' + e.nome, valore: e.riposo, voci: RIPOSI.map((r) => ({ valore: r, testo: fmtRiposo(r) })) });
  if (v === null) return;
  e.riposo = Number(v);
  C.salvaPrefEsercizio(e.exId, { riposo: e.riposo });
  salva(); ridisegnaCard(i);
}
async function tipoSet(i, j) {
  const e = w.esercizi[i], s = e.serie[j];
  const v = await sceltaLista({ titolo: 'Set ' + numeroSet(e, j), valore: s.tipo, voci: [
    { valore: 'W', testo: 'Avvicinamento (W)' },
    { valore: 'N', testo: 'Allenante' },
    { valore: 'elimina', testo: 'Elimina set', classe: 'rosso' },
  ] });
  if (v === null) return;
  if (v === 'elimina') e.serie.splice(j, 1);
  else s.tipo = v;
  salva(); ridisegnaCard(i); aggiornaStats();
}
async function rpeSet(i, j) {
  const s = w.esercizi[i].serie[j];
  const v = await sceltaLista({ titolo: 'RPE: quanto è stato duro?', valore: s.rpe, griglia: true, voci: [
    ...RPE.map((r) => ({ valore: r, testo: String(r) })),
    { valore: 'nessuno', testo: 'Nessuno' },
  ] });
  if (v === null) return;
  s.rpe = v === 'nessuno' ? null : Number(v);
  salva(); ridisegnaCard(i);
}
function aggiungiSet(i) {
  const e = w.esercizi[i];
  const ultimo = e.serie[e.serie.length - 1];
  e.serie.push({ tipo: 'N', kg: '', reps: '', rpe: null, fatto: false, target: ultimo ? ultimo.target : '' });
  salva(); ridisegnaCard(i);
}

async function aggiungiEsercizio() {
  const s = schedaAttiva();
  const blocchi = (s && s.extra) || [];
  const gruppi = {};
  for (const e of tuttiEsercizi()) (gruppi[e.gruppo || 'Altro'] ||= []).push(e);
  const corpo = `
    <input class="input" id="cerca-ex" type="search" placeholder="Cerca esercizio" autocomplete="off" style="margin-bottom:12px">
    <div class="lista-ex">
      ${blocchi.map((b) => `<button type="button" class="scelta blocco" data-blocco="${esc(b.id)}">${esc(b.nome)} <span class="muted small">· ${b.esercizi.length} esercizi</span></button>`).join('')}
      ${Object.keys(gruppi).sort().map((g) => `<div class="lista-gruppo">${esc(g)}</div>${gruppi[g].sort((a, b) => a.nome.localeCompare(b.nome)).map((e) => `<button type="button" class="scelta" data-ex-id="${esc(e.id)}" data-nome="${esc(e.nome.toLowerCase())}">${esc(e.nome)}</button>`).join('')}`).join('')}
    </div>`;
  const chiudi = mostraFoglio({ titolo: 'Aggiungi esercizio', corpoHtml: corpo, chiudiTesto: 'Chiudi' });
  const foglio = document.querySelector('.sheet');
  foglio.classList.add('sheet-alta');
  const cerca = foglio.querySelector('#cerca-ex');
  cerca.oninput = () => {
    const q = cerca.value.trim().toLowerCase();
    foglio.querySelectorAll('[data-ex-id]').forEach((b) => { b.hidden = q && !b.dataset.nome.includes(q); });
    foglio.querySelectorAll('.lista-gruppo').forEach((g) => { g.hidden = !!q; });
  };
  foglio.querySelectorAll('[data-ex-id]').forEach((b) => {
    b.onclick = () => {
      chiudi();
      w.esercizi.push(C.esercizioDaPiano({ ex: b.dataset.exId, serie: '3x10' }));
      calcolaCache(); salva(); ridisegnaTutto();
      setTimeout(() => el.querySelector(`#ex-${w.esercizi.length - 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };
  });
  foglio.querySelectorAll('[data-blocco]').forEach((b) => {
    b.onclick = () => {
      chiudi();
      const blocco = blocchi.find((x) => x.id === b.dataset.blocco);
      for (const v of blocco.esercizi) w.esercizi.push(C.esercizioDaPiano(v));
      calcolaCache(); salva(); ridisegnaTutto();
      toast(blocco.nome + ' aggiunto');
    };
  });
}

async function termina() {
  const st = A.statistiche({ ...w, fine: new Date().toISOString() });
  if (st.serie === 0) {
    const ok = await conferma({ titolo: 'Nessun set completato', testo: 'Vuoi annullare questo allenamento?', ok: 'Annulla allenamento', annulla: 'Continua', pericoloso: true });
    if (ok) annulla(true);
    return;
  }
  let nonFatti = 0;
  for (const e of w.esercizi) for (const s of e.serie) if (!s.fatto) nonFatti++;
  const ok = await new Promise((resolve) => {
    const chiudi = mostraFoglio({
      titolo: w.modifica ? 'Salvare le modifiche?' : 'Terminare l\'allenamento?',
      corpoHtml: `<p class="muted" style="margin:0 0 10px">${st.serie} serie completate, ${st.volume.toLocaleString('it-IT')} kg di volume.${nonFatti ? ` I ${nonFatti} set non spuntati verranno scartati.` : ''}</p>
        <input class="input" id="nota-fine" placeholder="Nota (facoltativa): come è andata?" value="${esc(w.note || '')}">
        <div class="actions" style="margin-top:12px"><button type="button" class="btn primary" id="btn-ok-fine">${w.modifica ? 'Salva' : 'Termina'}</button></div>`,
      chiudiTesto: 'Continua',
    });
    document.getElementById('btn-ok-fine').onclick = () => { w.note = document.getElementById('nota-fine').value.trim(); chiudi(); resolve(true); };
    document.querySelector('.sheet [data-annulla]').addEventListener('click', () => resolve(false));
  });
  if (!ok) return;
  const finale = {
    ...w,
    fine: w.modifica && w.fine ? w.fine : new Date().toISOString(),
    esercizi: w.esercizi
      .map((e) => ({
        exId: e.exId, nome: e.nome, superset: e.superset || null, riposo: e.riposo, nota: e.nota || '',
        serie: e.serie.filter((s) => s.fatto).map((s) => ({
          tipo: s.tipo,
          kg: s.kg === '' || s.kg === null || s.kg === undefined ? null : Number(String(s.kg).replace(',', '.')),
          reps: Number(String(s.reps).replace(',', '.')),
          rpe: s.rpe ?? null,
          fatto: true,
          pr: !!s.pr,
          target: s.target || '',
        })),
      }))
      .filter((e) => e.serie.length),
  };
  delete finale.modifica;
  clearTimeout(salvaTimer);
  chiuso = true;
  A.salva(finale);
  C.azzeraInCorso();
  T.fermaRiposo();
  toast(w.modifica ? 'Modifiche salvate' : 'Allenamento salvato');
  vai('/storico/' + finale.id, { sostituisci: true });
}
async function annulla(giaConfermato = false) {
  if (w.modifica) {
    const ok = await conferma({ titolo: 'Annullare le modifiche?', testo: 'L\'allenamento resta com\'era.', ok: 'Annulla modifiche', annulla: 'Continua', pericoloso: true });
    if (!ok) return;
    clearTimeout(salvaTimer);
    chiuso = true;
    C.azzeraInCorso();
    vai('/storico/' + w.id, { sostituisci: true });
    return;
  }
  if (!giaConfermato) {
    const ok = await conferma({ titolo: 'Annullare l\'allenamento?', testo: 'I set inseriti andranno persi.', ok: 'Annulla allenamento', annulla: 'Continua', pericoloso: true });
    if (!ok) return;
  }
  clearTimeout(salvaTimer);
  chiuso = true;
  C.azzeraInCorso();
  T.fermaRiposo();
  vai('/allenamento', { sostituisci: true });
}

function bind() {
  const root = el.querySelector('#allena-root');
  el.querySelector('#btn-min').onclick = () => { salvaSubito(); vai('/allenamento'); };
  el.querySelector('#btn-fine').onclick = termina;
  el.querySelector('#btn-annulla').onclick = () => annulla(false);
  el.querySelector('#btn-add-ex').onclick = aggiungiEsercizio;

  // Gli ascoltatori stanno sul contenitore della pagina, che viene distrutto quando si cambia
  // schermata: così non si accumulano riaprendo il registro (ogni tocco veniva eseguito due volte).
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-azione]');
    if (!b) return;
    const i = Number(b.dataset.ex), j = Number(b.dataset.set);
    switch (b.dataset.azione) {
      case 'check': return spunta(i, j);
      case 'tipo': return tipoSet(i, j);
      case 'rpe': return rpeSet(i, j);
      case 'add-set': return aggiungiSet(i);
      case 'menu-ex': return menuEsercizio(i);
      case 'riposo': return riposoEsercizio(i);
      case 'nota': return notaEsercizio(i);
      case 't-meno': return T.aggiungiRiposo(-15);
      case 't-piu': return T.aggiungiRiposo(15);
      case 't-salta': return T.fermaRiposo();
      default: return undefined;
    }
  });
  root.addEventListener('input', (ev) => {
    const inp = ev.target.closest('.set-in');
    if (!inp) return;
    const s = w.esercizi[Number(inp.dataset.ex)].serie[Number(inp.dataset.set)];
    s[inp.dataset.campo] = inp.value.trim();
    salva();
  });
  root.addEventListener('focusin', (ev) => {
    const inp = ev.target.closest('.set-in');
    if (inp) setTimeout(() => inp.select(), 0);
  });
}

export function renderAllena(elemento) {
  el = elemento;
  w = C.inCorso();
  if (!w) { vai('/allenamento', { sostituisci: true }); return undefined; }
  prevCache = {}; recCache = {};
  chiuso = false;
  calcolaCache();
  document.body.classList.add('in-allenamento');
  bloccaAutoAggiornamento(true);
  T.schermoAccesoDurante(true);
  el.innerHTML = '<div id="allena-root">' + layout() + '</div>';
  bind();
  aggiornaStats();
  aggiornaDurata();
  orologio = setInterval(aggiornaDurata, 1000);
  const stop = T.ascoltaRiposo(aggiornaTimer);
  aggiornaTimer();
  return () => {
    clearInterval(orologio);
    stop();
    if (!chiuso) salvaSubito();
    document.body.classList.remove('in-allenamento');
    bloccaAutoAggiornamento(false);
    T.schermoAccesoDurante(false);
  };
}
