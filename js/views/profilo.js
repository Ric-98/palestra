import { html, raw, icone, toast, conferma, chiediTesto, mostraFoglio, isIOS, isStandalone, formattaBytes, formattaData } from '../ui.js';
import { store, impostazioni, salvaImpostazioni, esportaBackup, leggiBackup, applicaBackup, riassuntoBackup } from '../store.js';
import { APP_VERSION } from '../version.js';
import { controllaAggiornamenti } from '../app.js';

function statistiche() {
  const allenamenti = store.get('allenamenti', []);
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
    for (const e of a.esercizi || []) serie += (e.set || []).filter((s) => s.fatto).length;
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

    <h2 class="section-title">Dashboard</h2>
    <div class="grid-2">
      <button type="button" class="tile" disabled>${raw(icone.statistiche)}Statistiche</button>
      <button type="button" class="tile" disabled>${raw(icone.esercizi)}Esercizi</button>
      <button type="button" class="tile" disabled>${raw(icone.misure)}Misure</button>
      <button type="button" class="tile" disabled>${raw(icone.calendario)}Calendario</button>
    </div>
    <p class="muted small" style="margin:8px 4px 0">Si attivano nello step 4.</p>

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
      <div class="list-item">
        <span class="li-icon">${raw(icone.info)}</span>
        <span class="li-body"><div class="li-title">Spazio usato</div><div class="li-sub">${formattaBytes(store.bytes())} sul dispositivo</div></span>
      </div>
      <button type="button" class="list-item danger" id="btn-reset">
        <span class="li-icon">${raw(icone.cestino)}</span>
        <span class="li-body"><div class="li-title">Cancella tutti i dati</div></span>
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
