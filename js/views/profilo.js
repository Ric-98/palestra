import { html, raw, icone, toast, conferma, chiediTesto, mostraFoglio, isIOS, isStandalone, formattaBytes, formattaData } from '../ui.js';
import { store, impostazioni, salvaImpostazioni, esportaBackup, leggiBackup, applicaBackup, riassuntoBackup } from '../store.js';
import { APP_VERSION } from '../version.js';
import { controllaAggiornamenti } from '../app.js';
import * as A from '../allenamenti.js';
import { analizzaCsv, convertiHevy } from '../hevy.js';
import { sbloccaAudio, suonaFineRiposo, avviaTimerIphone } from '../timer.js';
import { vai } from '../router.js';
import { bloccoGraficoSettimanale, collegaGraficoSettimanale } from './statistiche.js';

function statistiche() {
  const allenamenti = A.tutti();
  const inizioSettimana = new Date();
  const giorno = (inizioSettimana.getDay() + 6) % 7; // lunedì = 0
  inizioSettimana.setHours(0, 0, 0, 0);
  inizioSettimana.setDate(inizioSettimana.getDate() - giorno);
  let secondiSettimana = 0;
  let serie = 0;
  for (const a of allenamenti) {
    if (a.inizio && a.fine && new Date(a.inizio) >= inizioSettimana) {
      secondiSettimana += (new Date(a.fine) - new Date(a.inizio)) / 1000;
    }
    for (const e of a.esercizi || []) serie += (e.serie || []).filter((s) => s.fatto).length;
  }
  const ore = secondiSettimana / 3600;
  return {
    allenamenti: allenamenti.length,
    oreSettimana: ore >= 10 ? Math.round(ore) : Math.round(ore * 10) / 10,
    serie,
  };
}

export function renderProfilo(el) {
  const imp = impostazioni();
  const nome = imp.nome || 'Il mio profilo';
  const iniziale = (imp.nome || 'P').trim().charAt(0);
  const st = statistiche();
  const standalone = isStandalone();
  const nHevy = A.tutti().filter((a) => a.origine === 'hevy').length;

  el.innerHTML = html`
    <header class="page-head">
      <h1 class="page-title">Profilo</h1>
      <button type="button" class="icon-btn" id="btn-nome" aria-label="Modifica nome">${raw(icone.matita)}</button>
    </header>

    <div class="profile-head">
      <div class="avatar">${iniziale}</div>
      <div>
        <p class="profile-name">${nome}</p>
        <div class="profile-stats">
          <div><strong>${st.allenamenti}</strong>Allenamenti</div>
          <div><strong>${st.oreSettimana} h</strong>Questa settimana</div>
          <div><strong>${st.serie}</strong>Serie</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:4px">${bloccoGraficoSettimanale(el, { compatto: true })}</div>

    <h2 class="section-title">Dashboard</h2>
    <div class="grid-2">
      <button type="button" class="tile" data-vai="/statistiche">${raw(icone.statistiche)}Statistiche</button>
      <button type="button" class="tile" data-vai="/esercizi">${raw(icone.esercizi)}Esercizi</button>
      <button type="button" class="tile" data-vai="/misure">${raw(icone.misure)}Misure</button>
      <button type="button" class="tile" data-vai="/calendario">${raw(icone.calendario)}Calendario</button>
    </div>

    <h2 class="section-title">Dati</h2>
    <div class="list">
      <button type="button" class="list-item" id="btn-esporta">
        <span class="li-icon">${raw(icone.backup)}</span>
        <span class="li-body"><div class="li-title">Esporta backup</div><div class="li-sub">Salva tutti i dati in un file</div></span>
        <span class="li-right">${raw(icone.chevron)}</span>
      </button>
      <button type="button" class="list-item" id="btn-importa">
        <span class="li-icon">${raw(icone.ripristina)}</span>
        <span class="li-body"><div class="li-title">Ripristina da backup</div><div class="li-sub">Sostituisce i dati con quelli del file</div></span>
        <span class="li-right">${raw(icone.chevron)}</span>
      </button>
      <input type="file" id="file-importa" accept=".json,application/json" hidden>
      <button type="button" class="list-item" id="btn-hevy">
        <span class="li-icon">${raw(icone.ripristina)}</span>
        <span class="li-body"><div class="li-title">Importa da Hevy</div><div class="li-sub">${nHevy ? `${nHevy} allenamenti importati` : 'File CSV esportato da Hevy'}</div></span>
        <span class="li-right">${raw(icone.chevron)}</span>
      </button>
      <input type="file" id="file-hevy" accept=".csv,text/csv,text/plain" hidden>
      <div class="list-item">
        <span class="li-icon">${raw(icone.info)}</span>
        <span class="li-body"><div class="li-title">Spazio usato</div><div class="li-sub">${formattaBytes(store.bytes())} sul dispositivo</div></span>
      </div>
      <button type="button" class="list-item danger" id="btn-reset">
        <span class="li-icon">${raw(icone.cestino)}</span>
        <span class="li-body"><div class="li-title">Cancella tutti i dati</div></span>
      </button>
    </div>

    <h2 class="section-title">Timer di riposo</h2>
    <div class="list">
      <button type="button" class="list-item" id="btn-timer-iphone">
        <span class="li-icon">${raw(icone.timer)}</span>
        <span class="li-body"><div class="li-title">Timer anche sull'iPhone</div><div class="li-sub">Avvia il Comando rapido "${imp.nomeComando || 'Riposo'}" a ogni riposo</div></span>
        <span class="switch ${imp.timerIphone ? 'on' : ''}" aria-hidden="true"></span>
      </button>
      <button type="button" class="list-item" id="btn-nome-comando">
        <span class="li-icon">${raw(icone.matita)}</span>
        <span class="li-body"><div class="li-title">Nome del Comando rapido</div><div class="li-sub">${imp.nomeComando || 'Riposo'}</div></span>
      </button>
      <button type="button" class="list-item" id="btn-prova-suono">
        <span class="li-icon">${raw(icone.play)}</span>
        <span class="li-body"><div class="li-title">Prova il suono</div><div class="li-sub">Il segnale di fine riposo, sopra la musica</div></span>
      </button>
      <button type="button" class="list-item" id="btn-prova-comando">
        <span class="li-icon">${raw(icone.play)}</span>
        <span class="li-body"><div class="li-title">Prova il Comando rapido</div><div class="li-sub">Avvia un timer di 10 secondi sull'iPhone</div></span>
      </button>
    </div>

    <h2 class="section-title">App</h2>
    <div class="list">
      ${standalone ? '' : html`
      <button type="button" class="list-item" id="btn-installa">
        <span class="li-icon">${raw(icone.telefono)}</span>
        <span class="li-body"><div class="li-title">Installa sull'iPhone</div><div class="li-sub">Aggiungi alla schermata Home</div></span>
        <span class="li-right">${raw(icone.chevron)}</span>
      </button>`}
      <button type="button" class="list-item" id="btn-aggiorna">
        <span class="li-icon">${raw(icone.aggiorna)}</span>
        <span class="li-body"><div class="li-title">Controlla aggiornamenti</div><div class="li-sub">Versione ${APP_VERSION}${standalone ? ' · installata' : ''}</div></span>
        <span class="li-right">${raw(icone.chevron)}</span>
      </button>
    </div>
  `.toString();

  // --- eventi ---
  collegaGraficoSettimanale(el, () => { const y = window.scrollY; renderProfilo(el); window.scrollTo(0, y); });
  el.querySelectorAll('[data-vai]').forEach((b) => { b.onclick = () => vai(b.dataset.vai); });
  el.querySelector('#btn-nome').onclick = async () => {
    const v = await chiediTesto({ titolo: 'Il tuo nome', valore: imp.nome || '', placeholder: 'es. rico' });
    if (v === null) return;
    salvaImpostazioni({ nome: v });
    renderProfilo(el);
  };

  el.querySelector('#btn-esporta').onclick = async () => {
    try {
      const esito = await esportaBackup();
      if (esito === 'scaricato') toast('Backup scaricato');
      else if (esito === 'condiviso') toast('Backup esportato');
    } catch (e) {
      toast('Esportazione non riuscita');
      console.error(e);
    }
  };

  const fileInput = el.querySelector('#file-importa');
  el.querySelector('#btn-importa').onclick = () => { fileInput.value = ''; fileInput.click(); };
  fileInput.onchange = async () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    let obj;
    try {
      obj = leggiBackup(await f.text());
    } catch (e) {
      toast(e.message, 3500);
      return;
    }
    const r = riassuntoBackup(obj);
    const quando = r.creato ? formattaData(r.creato, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'data sconosciuta';
    const ok = await conferma({
      titolo: 'Ripristinare questo backup?',
      testo: `Backup del ${quando}: ${r.allenamenti} allenamenti, ${r.misure} misure. I dati attuali sul dispositivo verranno sostituiti.`,
      ok: 'Ripristina',
      pericoloso: true,
    });
    if (!ok) return;
    applicaBackup(obj);
    toast('Backup ripristinato');
    setTimeout(() => location.reload(), 600);
  };

  const fileHevy = el.querySelector('#file-hevy');
  el.querySelector('#btn-hevy').onclick = () => { fileHevy.value = ''; fileHevy.click(); };
  fileHevy.onchange = async () => {
    const f = fileHevy.files && fileHevy.files[0];
    if (!f) return;
    let esito;
    try {
      const righe = analizzaCsv(await f.text());
      if (!righe.length || !('exercise_title' in righe[0])) throw new Error('Il file non sembra un export di Hevy (manca la colonna exercise_title).');
      esito = convertiHevy(righe);
    } catch (e) {
      toast(e.message, 4000);
      return;
    }
    const ok = await conferma({
      titolo: 'Importare lo storico di Hevy?',
      testo: `${esito.allenamenti.length} allenamenti trovati nel file. Quelli già importati vengono saltati.${esito.nonCollegati.length ? ` ${esito.nonCollegati.length} esercizi non corrispondono al catalogo e restano con il nome di Hevy.` : ''}`,
      ok: 'Importa',
    });
    if (!ok) return;
    const n = A.salvaMolti(esito.allenamenti);
    toast(n ? `Importati ${n} allenamenti` : 'Niente di nuovo da importare', 3000);
    renderProfilo(el);
  };

  el.querySelector('#btn-timer-iphone').onclick = () => {
    salvaImpostazioni({ timerIphone: !imp.timerIphone });
    renderProfilo(el);
  };
  el.querySelector('#btn-nome-comando').onclick = async () => {
    const v = await chiediTesto({ titolo: 'Nome del Comando rapido', valore: imp.nomeComando || 'Riposo', placeholder: 'Riposo' });
    if (v === null) return;
    salvaImpostazioni({ nomeComando: v || 'Riposo' });
    renderProfilo(el);
  };
  el.querySelector('#btn-prova-suono').onclick = () => { sbloccaAudio(); setTimeout(suonaFineRiposo, 80); };
  el.querySelector('#btn-prova-comando').onclick = () => {
    if (!imp.timerIphone) { toast('Prima attiva "Timer anche sull\'iPhone"'); return; }
    avviaTimerIphone(10);
  };

  el.querySelector('#btn-reset').onclick = async () => {
    const ok = await conferma({
      titolo: 'Cancellare tutti i dati?',
      testo: 'Allenamenti, misure e impostazioni salvati su questo dispositivo verranno eliminati. Fai prima un backup se vuoi conservarli.',
      ok: 'Cancella tutto',
      pericoloso: true,
    });
    if (!ok) return;
    store.clear();
    toast('Dati cancellati');
    renderProfilo(el);
  };

  const btnInstalla = el.querySelector('#btn-installa');
  if (btnInstalla) {
    btnInstalla.onclick = () => {
      const ios = isIOS();
      mostraFoglio({
        titolo: 'Installa sull\'iPhone',
        corpoHtml: ios
          ? `<ol class="steps">
              <li>Apri questa pagina in <b>Safari</b> (non da Chrome o da un'altra app).</li>
              <li>Tocca il pulsante <b>Condividi</b> in basso (il quadrato con la freccia).</li>
              <li>Scorri e tocca <b>Aggiungi alla schermata Home</b>.</li>
              <li>Tocca <b>Aggiungi</b>. Da ora apri l'app dall'icona sulla Home.</li>
            </ol>`
          : `<p class="muted">Sull'iPhone apri questo stesso indirizzo in Safari, tocca <b>Condividi</b> e poi <b>Aggiungi alla schermata Home</b>.</p>`,
      });
    };
  }

  el.querySelector('#btn-aggiorna').onclick = async () => {
    toast('Controllo...');
    const esito = await controllaAggiornamenti();
    if (esito === 'trovato') toast('Nuova versione trovata, arriva tra un attimo');
    else if (esito === 'aggiornato') toast('Sei già alla versione più recente');
    else toast('Aggiornamenti non disponibili in questa modalità');
  };
}
