'use strict';
(() => {
  const C = MPCrypto;
  const META_KEY = 'mp_meta_v1';
  const DATA_KEY = 'mp_data_v1';
  const APP_VERSION = '1.1';
  const root = document.getElementById('app');

  /* ------------------------------------------------------------------ */
  /* Helfer                                                              */
  /* ------------------------------------------------------------------ */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked') el.checked = !!v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  const ICONS = {
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  };
  function icon(name) {
    const s = document.createElement('span');
    s.className = 'ico';
    s.innerHTML = ICONS[name]; // statische, eigene Strings
    return s;
  }
  function iconBtn(name, label, onclick) {
    return h('button', { class: 'ibtn', type: 'button', 'aria-label': label, title: label, onclick }, icon(name));
  }

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  function uid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return Array.from(C.rand(16), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  const todayStr = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const fmtDur = (m) => {
    m = Math.max(0, Math.round(Number(m) || 0));
    return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  };
  const fmtDay = (iso) => {
    const d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) return iso || 'Ohne Datum';
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  let toastTimer = null;
  function toast(msg) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = h('div', { class: 'toast', role: 'status', text: msg });
    document.body.append(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), 3200);
  }

  function modal(build) {
    return new Promise((resolve) => {
      const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
      const overlay = h('div', { class: 'overlay', onclick: (e) => { if (e.target === overlay) close(null); } }, box);
      function close(v) { overlay.remove(); resolve(v); }
      build(box, close);
      document.body.append(overlay);
      const first = box.querySelector('input,button');
      if (first) first.focus();
    });
  }

  function askPassword(title, { confirm = false, text = '', ok = 'OK', minLen = 8 } = {}) {
    return modal((box, close) => {
      const p1 = h('input', { type: 'password', autocomplete: confirm ? 'new-password' : 'current-password', placeholder: 'Passwort' });
      const p2 = confirm ? h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Passwort wiederholen' }) : null;
      const err = h('div', { class: 'err' });
      const go = () => {
        if (!p1.value) { err.textContent = 'Bitte Passwort eingeben.'; return; }
        if (confirm) {
          if (p1.value.length < minLen) { err.textContent = `Mindestens ${minLen} Zeichen.`; return; }
          if (p1.value !== p2.value) { err.textContent = 'Die Passwörter stimmen nicht überein.'; return; }
        }
        close(p1.value);
      };
      [p1, p2].forEach((i) => i && i.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }));
      box.append(
        h('h3', { text: title }),
        text && h('p', { text }),
        h('div', { class: 'stack' }, p1, p2),
        err,
        h('div', { class: 'stack', style: 'margin-top:10px' },
          h('button', { class: 'btn', type: 'button', onclick: go, text: ok }),
          h('button', { class: 'btn link', type: 'button', onclick: () => close(null), text: 'Abbrechen' }))
      );
    });
  }

  function confirmDlg(title, text, ok = 'OK', danger = false) {
    return modal((box, close) => {
      box.append(
        h('h3', { text: title }),
        h('p', { text }),
        h('div', { class: 'stack' },
          h('button', { class: danger ? 'btn danger' : 'btn', type: 'button', onclick: () => close(true), text: ok }),
          h('button', { class: 'btn link', type: 'button', onclick: () => close(null), text: 'Abbrechen' }))
      );
    });
  }

  /* ------------------------------------------------------------------ */
  /* Zustand                                                             */
  /* ------------------------------------------------------------------ */
  const defaultSettings = () => ({
    lockMin: 2,
    backupDays: 7,
    lastBackup: null,
    snoozeUntil: 0,
    fields: Array.from({ length: 10 }, (_, i) => ({ name: 'Messwert ' + (i + 1), unit: '' })),
  });

  let meta = store.get(META_KEY); // { v, pw, pk, settings }
  let dataKey = null;
  let db = null; // { entries: [] }
  let view = meta ? 'lock' : 'setup';
  let editing = null; // { entry, isNew }
  let search = '';
  let lastActivity = Date.now();
  let hiddenAt = null;
  let suspendLock = 0;

  if (meta) {
    meta.settings = Object.assign(defaultSettings(), meta.settings || {});
    while (meta.settings.fields.length < 10) {
      meta.settings.fields.push({ name: 'Messwert ' + (meta.settings.fields.length + 1), unit: '' });
    }
  }

  const persistMeta = () => store.set(META_KEY, meta);
  async function persistData() { store.set(DATA_KEY, await C.encryptJSON(db, dataKey)); }
  // Speichert; schlägt das fehl (z. B. Speicher voll), wird der Stand im Speicher auf
  // "before" zurückgesetzt, damit die Anzeige nicht etwas zeigt, das gar nicht gesichert ist.
  async function save(before) {
    try { await persistData(); return true; } catch (e) {
      if (before && db) db.entries = before;
      const full = e && (e.name === 'QuotaExceededError' || e.code === 22);
      toast(full ? 'Speicher voll: nicht gespeichert. Bitte Backup erstellen.' : 'Speichern fehlgeschlagen: ' + (e.message || e));
      return false;
    }
  }
  async function loadDb() {
    const box = store.get(DATA_KEY);
    db = box ? await C.decryptJSON(box, dataKey) : { entries: [] };
    if (!Array.isArray(db.entries)) db.entries = [];
  }

  function lock() {
    dataKey = null; db = null; editing = null; search = '';
    view = 'lock';
    render();
  }
  function go(v) { view = v; render(); window.scrollTo(0, 0); }

  function afterUnlock() {
    view = 'list'; search = ''; lastActivity = Date.now();
    render();
  }

  /* Automatische Sperre */
  // 'input' fängt auch Diktieren und Autokorrektur ab (dabei gibt es oft kein keydown)
  ['pointerdown', 'keydown', 'touchstart', 'scroll', 'input', 'change'].forEach((ev) =>
    addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true, capture: true }));
  setInterval(() => {
    if (!dataKey || suspendLock) return;
    const min = meta.settings.lockMin;
    if (min > 0 && Date.now() - lastActivity > min * 60000) lock();
  }, 10000);
  document.addEventListener('visibilitychange', () => {
    if (!dataKey) return;
    const min = meta.settings.lockMin;
    if (document.hidden) {
      hiddenAt = Date.now();
      if (min === 0 && !suspendLock) lock();
    } else {
      if (hiddenAt && min > 0 && !suspendLock && Date.now() - hiddenAt > min * 60000) lock();
      hiddenAt = null;
      lastActivity = Date.now();
    }
  });

  /* ------------------------------------------------------------------ */
  /* Passkey (WebAuthn + PRF)                                            */
  /* ------------------------------------------------------------------ */
  async function prfGet(credId, prfSalt) {
    const a = await navigator.credentials.get({
      publicKey: {
        challenge: C.rand(32),
        allowCredentials: credId ? [{ type: 'public-key', id: credId }] : [],
        userVerification: 'required',
        extensions: { prf: { eval: { first: prfSalt } } },
      },
    });
    const r = a.getClientExtensionResults().prf;
    if (!r || !r.results || !r.results.first) {
      throw new Error('Dieser Passkey liefert keinen Schlüssel (PRF nicht unterstützt).');
    }
    return r.results.first;
  }

  // Während der Face-ID-Abfrage nicht automatisch sperren
  async function enablePasskey() {
    suspendLock++;
    try { return await enablePasskeyInner(); } finally {
      setTimeout(() => { suspendLock = Math.max(0, suspendLock - 1); lastActivity = Date.now(); }, 1000);
    }
  }

  async function enablePasskeyInner() {
    if (!window.PublicKeyCredential || !navigator.credentials) {
      throw new Error('Passkeys werden in diesem Browser nicht unterstützt.');
    }
    const prfSalt = C.rand(32);
    // Immer dieselbe Benutzer-ID: Richtet man den Passkey erneut ein, ersetzt iOS den alten,
    // statt einen weiteren Passkey im Schlüsselbund anzulegen.
    if (!meta.pkUser) { meta.pkUser = C.b64.enc(C.rand(16)); persistMeta(); }
    const cred = await navigator.credentials.create({
      publicKey: {
        rp: { name: 'Work Companion Fieldbook' },
        user: { id: C.b64.dec(meta.pkUser), name: 'fieldbook', displayName: 'Work Companion Fieldbook' },
        challenge: C.rand(32),
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' },
        // Manche Systeme liefern den Schlüssel schon beim Anlegen, dann reicht ein Face-ID-Schritt
        extensions: { prf: { eval: { first: prfSalt } } },
      },
    });
    const ext = cred.getClientExtensionResults();
    if (!ext.prf || (!ext.prf.enabled && !(ext.prf.results && ext.prf.results.first))) {
      throw new Error('Dieser Passkey unterstützt die Verschlüsselung (PRF) nicht. Du kannst weiter das Passwort benutzen.');
    }
    let out = ext.prf.results && ext.prf.results.first;
    if (!out) {
      try {
        out = await prfGet(cred.rawId, prfSalt);
      } catch (e) {
        // Safari verlangt für den zweiten Face-ID-Schritt evtl. einen neuen Fingertipp
        if (!e || e.name !== 'NotAllowedError') throw e;
        const again = await confirmDlg('Noch einmal bestätigen', 'Der Passkey wurde angelegt. Bitte einmal mit Face ID bestätigen, um ihn mit deinen Daten zu verbinden.', 'Mit Face ID bestätigen');
        if (!again) throw new Error('Passkey nicht eingerichtet (abgebrochen).');
        out = await prfGet(cred.rawId, prfSalt);
      }
    }
    if (!dataKey) throw new Error('App wurde inzwischen gesperrt. Bitte erneut versuchen.');
    const w = await C.wrapWithPrf(dataKey, out, prfSalt);
    meta.pk = { credId: C.b64.enc(cred.rawId), prfSalt: C.b64.enc(prfSalt), iv: w.iv, wk: w.wk };
    persistMeta();
  }

  async function unlockWithPasskey() {
    const out = await prfGet(C.b64.dec(meta.pk.credId), C.b64.dec(meta.pk.prfSalt));
    dataKey = await C.unwrapWithPrf(meta.pk, out);
    await loadDb();
  }

  /* ------------------------------------------------------------------ */
  /* Export / Import                                                     */
  /* ------------------------------------------------------------------ */
  async function deliver(filename, blob) {
    suspendLock++;
    try {
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: filename }); return true; } catch (e) {
          if (e && e.name === 'AbortError') return false;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: filename });
      document.body.append(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 4000);
      return true;
    } finally {
      setTimeout(() => { suspendLock = Math.max(0, suspendLock - 1); lastActivity = Date.now(); }, 1500);
    }
  }

  const csvEsc = (v) => {
    v = String(v ?? '');
    return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  };
  // Schutz vor Formel-Injection in Excel/Numbers
  const safeText = (v) => { v = String(v ?? ''); return /^[=+\-@\t\r]/.test(v) ? "'" + v : v; };
  const safeNum = (v) => {
    v = String(v ?? '');
    return /^[=+@\t\r]/.test(v) || /^-(?![\d.,])/.test(v) ? "'" + v : v;
  };

  function buildCsv() {
    const f = meta.settings.fields;
    const head = ['Datum', 'Kunde', 'Kunden-ID', 'Seriennummer', 'Fahrzeit (h:mm)', 'Arbeitszeit (h:mm)']
      .concat(f.map((x) => x.name + (x.unit ? ` [${x.unit}]` : '')), ['Notiz']);
    const rows = sortedEntries().map((e) => [
      e.date, safeText(e.customerName), safeText(e.customerId), safeText(e.serial),
      fmtDur(e.driveMin), fmtDur(e.workMin),
      ...f.map((_, i) => safeNum((e.values || [])[i])),
      safeText(e.note),
    ]);
    const lines = [head, ...rows].map((r) => r.map(csvEsc).join(';'));
    return '﻿' + lines.join('\r\n') + '\r\n';
  }

  async function exportCsv() {
    const blob = new Blob([buildCsv()], { type: 'text/csv;charset=utf-8' });
    await deliver(`fieldbook-${todayStr()}.csv`, blob);
  }

  async function exportBackup() {
    const backup = {
      format: 'messprotokoll-backup', v: 1, app: 'Work Companion Fieldbook', appVersion: APP_VERSION, // Formatname bleibt für alte Backups
      created: new Date().toISOString(),
      pw: meta.pw, settings: meta.settings, data: await C.encryptJSON(db, dataKey),
    };
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const done = await deliver(`fieldbook-backup-${todayStr()}.json`, blob);
    if (done) {
      meta.settings.lastBackup = Date.now();
      meta.settings.snoozeUntil = 0;
      persistMeta();
      toast('Backup erstellt.');
      if (view === 'list' || view === 'settings') render();
    }
  }

  // Backup-Erinnerung: erscheint beim Öffnen der App, wenn das letzte Backup zu alt ist
  function backupDue() {
    const s = meta.settings;
    if (!s.backupDays || !db || !db.entries.length) return null;
    if (s.snoozeUntil && Date.now() < s.snoozeUntil) return null;
    const ref = s.lastBackup || Math.min(...db.entries.map((e) => e.createdAt || Date.now()));
    const days = Math.floor((Date.now() - ref) / 86400000);
    return days >= s.backupDays ? { days, never: !s.lastBackup } : null;
  }

  function backupBanner() {
    const due = backupDue();
    if (!due) return null;
    return h('div', { class: 'banner', role: 'alert' },
      h('div', { text: due.never ? 'Du hast noch kein Backup erstellt.' : `Dein letztes Backup ist ${due.days} ${due.days === 1 ? 'Tag' : 'Tage'} alt.` }),
      h('div', { class: 'row', style: 'margin-top:10px' },
        h('button', { class: 'btn', type: 'button', style: 'font-size:15px;padding:12px 8px', text: 'Jetzt sichern', onclick: () => exportBackup().catch((e) => toast(e.message || String(e))) }),
        h('button', {
          class: 'btn sec', type: 'button', style: 'font-size:15px;padding:12px 8px', text: 'Morgen erinnern',
          onclick: () => { meta.settings.snoozeUntil = Date.now() + 86400000; persistMeta(); render(); },
        })));
  }

  async function openBackup(file, password) {
    let b;
    try { b = JSON.parse(await file.text()); } catch { throw new Error('Die Datei ist kein gültiges Backup.'); }
    if (!b || b.format !== 'messprotokoll-backup' || !b.pw || !b.data) throw new Error('Die Datei ist kein Backup dieser App.');
    let key;
    try { key = await C.unwrapWithPassword(b.pw, password); } catch { throw new Error('Falsches Passwort für dieses Backup.'); }
    let d;
    try { d = await C.decryptJSON(b.data, key); } catch { throw new Error('Backup beschädigt (lässt sich nicht entschlüsseln).'); }
    if (!d || !Array.isArray(d.entries)) throw new Error('Backup beschädigt.');
    return { b, key, d };
  }

  // Öffnet ein Backup mit dem aktuellen Datenschlüssel (ohne Passwort). null, wenn das nicht passt.
  async function openWithCurrentKey(file) {
    if (!dataKey) return null;
    let b;
    try { b = JSON.parse(await file.text()); } catch { throw new Error('Die Datei ist kein gültiges Backup.'); }
    if (!b || b.format !== 'messprotokoll-backup' || !b.data) throw new Error('Die Datei ist kein Backup dieser App.');
    try {
      const d = await C.decryptJSON(b.data, dataKey);
      return d && Array.isArray(d.entries) ? d : null;
    } catch { return null; }
  }

  function pickFile() {
    suspendLock++;
    return new Promise((resolve) => {
      const inp = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
      // Die Sperr-Pause wird genau einmal aufgehoben: bei Auswahl, bei Abbruch oder spätestens nach
      // 60 Sekunden. Vorher blieb die automatische Sperre nach "Abbrechen" im Dateidialog dauerhaft aus.
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        clearTimeout(safety);
        setTimeout(() => { suspendLock = Math.max(0, suspendLock - 1); lastActivity = Date.now(); }, 1000);
      };
      const safety = setTimeout(release, 60000);
      const finish = (file) => { release(); inp.remove(); resolve(file); };
      inp.addEventListener('change', () => finish(inp.files && inp.files[0] || null));
      inp.addEventListener('cancel', () => finish(null));
      document.body.append(inp);
      inp.click();
    });
  }

  async function mergeBackup(preselected) {
    const file = preselected || await pickFile();
    if (!file) return;
    try {
      // Erst mit dem eigenen Datenschlüssel versuchen: Er bleibt beim Passwortwechsel gleich, daher
      // lassen sich alle Backups dieser Installation ohne das damalige Passwort öffnen.
      let d = await openWithCurrentKey(file);
      if (!d) {
        const pw = await askPassword('Passwort des Backups', { text: 'Dieses Backup stammt von einer anderen Einrichtung der App. Bitte das Passwort eingeben, das beim Erstellen des Backups galt.', ok: 'Hinzufügen' });
        if (!pw) return;
        ({ d } = await openBackup(file, pw));
      }
      if (!db) return; // inzwischen gesperrt
      const before = db.entries.slice();
      const next = db.entries.map((e) => Object.assign({}, e));
      const byId = new Map(next.map((e) => [e.id, e]));
      let added = 0, updated = 0;
      for (const e of d.entries) {
        if (!e || !e.id) continue;
        const cur = byId.get(e.id);
        if (!cur) { next.push(e); byId.set(e.id, e); added++; } else if ((e.updatedAt || 0) > (cur.updatedAt || 0)) {
          Object.assign(cur, e); updated++;
        }
      }
      db.entries = next;
      if (await save(before)) toast(`${added} neu, ${updated} aktualisiert.`);
      render();
    } catch (e) { toast(e.message || String(e)); }
  }

  // Sperrbildschirm: Backup hinzufügen (bestehende Daten bleiben) oder alles ersetzen
  async function restoreOrAdd(errEl) {
    const choice = await modal((box, close) => {
      box.append(
        h('h3', { text: 'Backup einspielen' }),
        h('p', { text: 'Hinzufügen: Deine bestehenden Einträge und dein Passwort bleiben, die Einträge aus dem Backup kommen dazu. Ersetzen: Alles auf diesem Gerät wird durch das Backup ersetzt, danach gilt das Passwort des Backups.' }),
        h('div', { class: 'stack' },
          h('button', { class: 'btn', type: 'button', onclick: () => close('add'), text: 'Hinzufügen (Daten bleiben)' }),
          h('button', { class: 'btn danger', type: 'button', onclick: () => close('replace'), text: 'Alles ersetzen' }),
          h('button', { class: 'btn link', type: 'button', onclick: () => close(null), text: 'Abbrechen' })));
    });
    if (choice === 'replace') return restoreFromBackup(errEl);
    if (choice !== 'add') return;
    const file = await pickFile(); // direkt nach dem Fingertipp, sonst blockiert iOS den Dateidialog
    if (!file) return;
    const cur = await askPassword('Aktuelles Passwort', { text: 'Dein jetziges App-Passwort, damit die bestehenden Daten geöffnet werden können.', ok: 'Weiter' });
    if (!cur) return;
    try {
      dataKey = await C.unwrapWithPassword(meta.pw, cur);
    } catch { dataKey = null; if (errEl) errEl.textContent = 'Falsches Passwort.'; return; }
    try { await loadDb(); } catch {
      dataKey = null; if (errEl) errEl.textContent = 'Bestehende Daten konnten nicht gelesen werden.'; return;
    }
    afterUnlock();
    await mergeBackup(file);
  }

  async function restoreFromBackup(errEl) {
    const file = await pickFile();
    if (!file) return;
    if (meta) {
      const ok = await confirmDlg('Daten ersetzen?', 'Alle Daten auf diesem Gerät werden durch das Backup ersetzt.', 'Ersetzen', true);
      if (!ok) return;
    }
    const pw = await askPassword('Passwort des Backups', { ok: 'Wiederherstellen' });
    if (!pw) return;
    try {
      const { b, key, d } = await openBackup(file, pw);
      const hadPasskey = !!(meta && meta.pk);
      const settings = Object.assign(defaultSettings(), b.settings || {});
      if (!Array.isArray(settings.fields)) settings.fields = defaultSettings().fields;
      while (settings.fields.length < 10) settings.fields.push({ name: 'Messwert ' + (settings.fields.length + 1), unit: '' });
      // Beide Teile (Schlüssel-Infos und Daten) müssen zusammenpassen. Klappt das Schreiben nicht
      // (z. B. Speicher voll), wird der alte Stand zurückgeschrieben, damit nichts unlesbar wird.
      const oldMeta = localStorage.getItem(META_KEY);
      const oldData = localStorage.getItem(DATA_KEY);
      const newMeta = { v: 1, pw: b.pw, pk: null, settings };
      try {
        localStorage.setItem(DATA_KEY, JSON.stringify(await C.encryptJSON(d, key)));
        localStorage.setItem(META_KEY, JSON.stringify(newMeta));
      } catch (e) {
        try {
          if (oldData == null) localStorage.removeItem(DATA_KEY); else localStorage.setItem(DATA_KEY, oldData);
          if (oldMeta == null) localStorage.removeItem(META_KEY); else localStorage.setItem(META_KEY, oldMeta);
        } catch { /* ignore */ }
        throw new Error('Wiederherstellen fehlgeschlagen (Speicher voll?). Die bisherigen Daten sind unverändert.');
      }
      meta = newMeta;
      dataKey = key; db = d;
      afterUnlock();
      toast(hadPasskey
        ? 'Backup wiederhergestellt. Face ID bitte in den Einstellungen neu einrichten.'
        : 'Backup wiederhergestellt. Passwort ist jetzt das des Backups.');
    } catch (e) {
      if (errEl) errEl.textContent = e.message || String(e);
      else toast(e.message || String(e));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Daten                                                               */
  /* ------------------------------------------------------------------ */
  const sortedEntries = () => db.entries.slice().sort((a, b) =>
    (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));

  const newEntry = () => ({
    id: uid(), date: todayStr(), customerName: '', customerId: '', serial: '',
    driveMin: 0, workMin: 0, values: Array(10).fill(''), note: '',
    createdAt: Date.now(), updatedAt: Date.now(),
  });

  /* ------------------------------------------------------------------ */
  /* Ansichten                                                           */
  /* ------------------------------------------------------------------ */
  function render() {
    root.replaceChildren();
    document.querySelectorAll('.overlay').forEach((o) => o.remove());
    const fn = { setup: renderSetup, lock: renderLock, list: renderList, edit: renderEdit, settings: renderSettings }[view];
    (fn || renderLock)();
  }

  const isStandalone = () => navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
  function installHint() {
    if (isStandalone() || !isIOS()) return null;
    return h('div', { class: 'hint', text: 'Tipp: In Safari auf „Teilen“ und dann „Zum Home-Bildschirm“ tippen. Nur so bleiben die Daten dauerhaft zuverlässig gespeichert und die App funktioniert offline.' });
  }

  function renderSetup() {
    const p1 = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Passwort (mind. 8 Zeichen)' });
    const p2 = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Passwort wiederholen' });
    const err = h('div', { class: 'err' });
    const btn = h('button', { class: 'btn', type: 'button', text: 'App einrichten' });
    const submit = async () => {
      err.textContent = '';
      if (p1.value.length < 8) { err.textContent = 'Bitte mindestens 8 Zeichen.'; return; }
      if (p1.value !== p2.value) { err.textContent = 'Die Passwörter stimmen nicht überein.'; return; }
      btn.disabled = true; btn.textContent = 'Bitte warten …';
      try {
        dataKey = await C.newDataKey();
        meta = { v: 1, pw: await C.wrapWithPassword(dataKey, p1.value), pk: null, settings: defaultSettings() };
        db = { entries: [] };
        persistMeta();
        await persistData();
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
        afterUnlock();
        const want = await confirmDlg('Mit Face ID entsperren?',
          'Du kannst die App zusätzlich mit einem Passkey (Face ID / Touch ID) öffnen. Das Passwort bleibt als Reserve erhalten.', 'Jetzt einrichten');
        if (want) {
          try { await enablePasskey(); toast('Passkey eingerichtet.'); } catch (e) { toast(e.message || String(e)); }
        }
      } catch (e) {
        err.textContent = 'Fehler: ' + (e.message || e);
        btn.disabled = false; btn.textContent = 'App einrichten';
      }
    };
    btn.addEventListener('click', submit);
    p2.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    const restoreErr = h('div', { class: 'err' });
    root.append(h('div', { class: 'center' },
      h('img', { class: 'logo', src: 'icon-180.png', alt: '' }),
      h('h1', { text: 'Work Companion Fieldbook' }),
      h('p', { class: 'muted', text: 'Lege ein Passwort fest. Alle Daten werden damit verschlüsselt und bleiben nur auf diesem Gerät.' }),
      h('div', { class: 'stack' }, p1, p2, btn),
      err,
      h('div', { class: 'hint', text: 'Wichtig: Es gibt keine Passwort-Wiederherstellung. Wer das Passwort (und den Passkey) verliert, verliert die Daten. Erstelle deshalb regelmäßig ein verschlüsseltes Backup.' }),
      h('button', { class: 'btn link', type: 'button', onclick: () => restoreFromBackup(restoreErr), text: 'Aus Backup wiederherstellen' }),
      restoreErr,
      installHint(),
      versionLine()));
  }

  function renderLock() {
    const pw = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Passwort' });
    const err = h('div', { class: 'err' });
    const btn = h('button', { class: 'btn', type: 'button', text: 'Entsperren' });
    const submit = async () => {
      if (!pw.value) return;
      err.textContent = ''; btn.disabled = true; btn.textContent = 'Bitte warten …';
      try {
        try { dataKey = await C.unwrapWithPassword(meta.pw, pw.value); } catch { dataKey = null; err.textContent = 'Falsches Passwort.'; return; }
        try { await loadDb(); } catch { dataKey = null; err.textContent = 'Daten konnten nicht gelesen werden (beschädigt?). Spiele ein Backup ein.'; return; }
        afterUnlock();
      } finally {
        if (btn.isConnected) { btn.disabled = false; btn.textContent = 'Entsperren'; }
      }
    };
    btn.addEventListener('click', submit);
    pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    const kids = [
      h('img', { class: 'logo', src: 'icon-180.png', alt: '' }),
      h('div', { class: 'brand', text: 'Work Companion Fieldbook' }),
      h('h1', { text: 'Gesperrt' }),
      h('p', { class: 'muted', text: 'Entsperre die App, um deine Einträge zu sehen.' }),
    ];
    if (meta.pk) {
      kids.push(h('button', {
        class: 'btn', type: 'button', style: 'margin-bottom:12px', text: 'Mit Face ID / Passkey entsperren',
        onclick: async (e) => {
          const b = e.currentTarget; b.disabled = true; err.textContent = '';
          try { await unlockWithPasskey(); afterUnlock(); } catch (ex) {
            dataKey = null;
            err.textContent = (ex && ex.name === 'NotAllowedError') ? 'Abgebrochen. Nutze das Passwort oder versuche es erneut.' : (ex.message || String(ex));
          } finally { if (b.isConnected) b.disabled = false; }
        },
      }));
    }
    kids.push(h('div', { class: 'stack' }, pw, meta.pk ? h('button', { class: 'btn sec', type: 'button', onclick: submit, text: 'Mit Passwort entsperren' }) : btn), err);
    // Ein Button genügt: bei Passkey-Variante den eigentlichen Button nicht doppelt anzeigen
    kids.push(h('button', { class: 'btn link', type: 'button', onclick: () => restoreOrAdd(err), text: 'Backup einspielen' }));
    kids.push(versionLine());
    root.append(h('div', { class: 'center' }, kids));
  }

  function versionLine() {
    return h('div', { class: 'version', text: 'Version ' + APP_VERSION });
  }

  function header(title, left, right) {
    return h('div', { class: 'bar' }, left, h('h1', { text: title }), right);
  }

  function renderList() {
    const bodyEl = h('div');
    const sumEl = h('div', { class: 'summary' });
    const input = h('input', {
      type: 'search', class: 'search', placeholder: 'Suchen: Kunde, ID, Seriennummer …', value: search,
      autocomplete: 'off', oninput: (e) => { search = e.target.value; fill(); },
    });

    function fill() {
      const q = search.trim().toLowerCase();
      const list = sortedEntries().filter((e) => !q ||
        [e.customerName, e.customerId, e.serial, e.note].some((x) => String(x || '').toLowerCase().includes(q)));
      const drive = list.reduce((s, e) => s + (e.driveMin || 0), 0);
      const work = list.reduce((s, e) => s + (e.workMin || 0), 0);
      sumEl.replaceChildren(
        h('span', { text: `${list.length} Einträge` }), '·',
        h('span', { text: `Fahrt ${fmtDur(drive)} h` }), '·',
        h('span', { text: `Arbeit ${fmtDur(work)} h` }));
      bodyEl.replaceChildren();
      if (!list.length) {
        bodyEl.append(h('div', { class: 'empty', text: db.entries.length ? 'Keine Treffer.' : 'Noch keine Einträge. Tippe unten auf „Neu“.' }));
        return;
      }
      let day = null;
      for (const e of list) {
        if (e.date !== day) { day = e.date; bodyEl.append(h('div', { class: 'day', text: fmtDay(day) })); }
        const filled = (e.values || []).filter((v) => String(v).trim() !== '').length;
        bodyEl.append(h('button', {
          class: 'card', type: 'button',
          onclick: () => { editing = { entry: JSON.parse(JSON.stringify(e)), isNew: false }; go('edit'); },
        },
          h('div', { class: 'card-top' },
            h('strong', { text: e.customerName || '(ohne Name)' }),
            e.customerId && h('span', { class: 'tag', text: e.customerId })),
          e.serial && h('div', { class: 'muted small', text: 'SN ' + e.serial }),
          h('div', { class: 'chips' },
            h('span', { class: 'chip' }, 'Fahrt ', h('b', { text: fmtDur(e.driveMin) })),
            h('span', { class: 'chip' }, 'Arbeit ', h('b', { text: fmtDur(e.workMin) })),
            filled > 0 && h('span', { class: 'chip' }, 'Messwerte ', h('b', { text: `${filled}/10` })))));
      }
    }

    root.append(
      header('Fieldbook', null, h('div', { style: 'display:flex' },
        iconBtn('settings', 'Einstellungen', () => go('settings')),
        iconBtn('lock', 'Sperren', lock))),
      h('main', { class: 'wrap' }, backupBanner(), input, sumEl, bodyEl),
      h('button', {
        class: 'fab', type: 'button', 'aria-label': 'Neuer Eintrag',
        onclick: () => { editing = { entry: newEntry(), isNew: true }; go('edit'); },
      }, icon('plus'), 'Neu'));
    fill();
  }

  function durationField(label, minutes) {
    const hh = h('input', { type: 'number', inputmode: 'numeric', min: '0', placeholder: '0', value: minutes ? Math.floor(minutes / 60) : '' });
    const mm = h('input', { type: 'number', inputmode: 'numeric', min: '0', placeholder: '0', value: minutes ? minutes % 60 : '' });
    return {
      el: h('label', { class: 'f' }, h('span', { text: label }),
        h('div', { class: 'dur' }, hh, h('em', { text: 'Std' }), mm, h('em', { text: 'Min' }))),
      get: () => Math.max(0, Math.round((Number(hh.value) || 0) * 60 + (Number(mm.value) || 0))),
    };
  }

  function textField(label, attrs) {
    const input = h('input', Object.assign({ type: 'text', autocomplete: 'off' }, attrs));
    return { input, el: h('label', { class: 'f' }, h('span', { text: label }), input) };
  }

  function renderEdit() {
    const { entry, isNew } = editing;
    const fields = meta.settings.fields;
    const names = [...new Set(db.entries.map((e) => e.customerName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
    const dl = h('datalist', { id: 'customers' }, names.map((n) => h('option', { value: n })));

    const date = textField('Datum', { type: 'date', value: entry.date });
    const name = textField('Kundenname', { value: entry.customerName, list: 'customers', autocapitalize: 'words', placeholder: 'z. B. Müller GmbH' });
    const cid = textField('Kunden-ID', { value: entry.customerId, autocapitalize: 'characters' });
    const serial = textField('Seriennummer Gerät', { value: entry.serial, autocapitalize: 'characters' });
    const drive = durationField('Fahrzeit', entry.driveMin);
    const work = durationField('Arbeitszeit', entry.workMin);
    const note = h('textarea', { placeholder: 'Optional', value: entry.note || '' });

    // Kunden-ID und Name gegenseitig ergänzen
    const sorted = sortedEntries();
    name.input.addEventListener('change', () => {
      const m = sorted.find((e) => e.customerName === name.input.value.trim() && e.customerId);
      if (m && !cid.input.value.trim()) cid.input.value = m.customerId;
    });
    cid.input.addEventListener('change', () => {
      const m = sorted.find((e) => e.customerId && e.customerId === cid.input.value.trim() && e.customerName);
      if (m && !name.input.value.trim()) name.input.value = m.customerName;
    });

    const measInputs = fields.map((f, i) => {
      const inp = h('input', {
        type: 'text', inputmode: 'decimal', autocomplete: 'off', enterkeyhint: 'next',
        value: (entry.values || [])[i] || '',
      });
      return { inp, el: h('label', { class: 'f' }, h('span', {}, f.name || 'Messwert ' + (i + 1), f.unit && h('span', { class: 'unit', text: ' [' + f.unit + ']' })), inp) };
    });

    const err = h('div', { class: 'err' });
    async function onSave() {
      if (!name.input.value.trim()) { err.textContent = 'Bitte einen Kundennamen eingeben.'; name.input.focus(); return; }
      if (!date.input.value) { err.textContent = 'Bitte ein Datum wählen.'; return; }
      const out = Object.assign({}, entry, {
        date: date.input.value, customerName: name.input.value.trim(), customerId: cid.input.value.trim(),
        serial: serial.input.value.trim(), driveMin: drive.get(), workMin: work.get(),
        values: measInputs.map((m) => m.inp.value.trim()), note: note.value.trim(), updatedAt: Date.now(),
      });
      const before = db.entries.slice();
      const i = db.entries.findIndex((e) => e.id === out.id);
      if (i >= 0) db.entries[i] = out; else db.entries.push(out);
      if (await save(before)) { editing = null; go('list'); toast('Gespeichert.'); }
    }
    async function onDelete() {
      if (!await confirmDlg('Eintrag löschen?', 'Das kann nicht rückgängig gemacht werden.', 'Löschen', true)) return;
      if (!db) return; // inzwischen gesperrt
      const before = db.entries.slice();
      db.entries = db.entries.filter((e) => e.id !== entry.id);
      if (await save(before)) { editing = null; go('list'); }
    }
    function onCopy() {
      const c = newEntry();
      Object.assign(c, { customerName: name.input.value.trim(), customerId: cid.input.value.trim(), serial: serial.input.value.trim() });
      editing = { entry: c, isNew: true };
      go('edit');
      toast('Kopie mit Kundendaten angelegt.');
    }

    root.append(
      header(isNew ? 'Neuer Eintrag' : 'Eintrag bearbeiten',
        h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Zurück', onclick: () => { editing = null; go('list'); } }, icon('back')), null),
      h('main', { class: 'wrap' },
        dl,
        h('div', { class: 'sect' }, h('h2', { text: 'Auftrag' }), date.el, name.el, h('div', { class: 'row' }, cid.el, serial.el)),
        h('div', { class: 'sect' }, h('h2', { text: 'Zeiten' }), h('div', { class: 'row' }, drive.el, work.el)),
        h('div', { class: 'sect' }, h('h2', { text: 'Messwerte' }), h('div', { class: 'meas' }, measInputs.map((m) => m.el))),
        h('div', { class: 'sect' }, h('h2', { text: 'Notiz' }), note),
        err,
        h('div', { class: 'footer-actions stack' },
          h('button', { class: 'btn', type: 'button', onclick: onSave, text: 'Speichern' }),
          !isNew && h('div', { class: 'row' },
            h('button', { class: 'btn sec', type: 'button', onclick: onCopy, text: 'Kopie anlegen' }),
            h('button', { class: 'btn danger', type: 'button', onclick: onDelete, text: 'Löschen' })))));
  }

  function renderSettings() {
    const s = meta.settings;

    const lockSel = h('select', {
      onchange: (e) => { s.lockMin = Number(e.target.value); persistMeta(); toast('Gespeichert.'); },
    }, [[0, 'Sofort beim Verlassen'], [1, 'Nach 1 Minute'], [2, 'Nach 2 Minuten'], [5, 'Nach 5 Minuten'], [15, 'Nach 15 Minuten']]
      .map(([v, t]) => h('option', { value: String(v), text: t, selected: v === s.lockMin })));

    const backupSel = h('select', {
      onchange: (e) => { s.backupDays = Number(e.target.value); s.snoozeUntil = 0; persistMeta(); toast('Gespeichert.'); },
    }, [[0, 'Aus'], [1, 'Täglich'], [3, 'Alle 3 Tage'], [7, 'Wöchentlich'], [14, 'Alle 2 Wochen'], [30, 'Monatlich']]
      .map(([v, t]) => h('option', { value: String(v), text: t, selected: v === s.backupDays })));

    const pkRow = h('div', { class: 'setrow' },
      h('div', {}, h('div', { text: 'Face ID / Passkey' }),
        h('div', { class: 'muted small', text: meta.pk ? 'Aktiv. Das Passwort bleibt als Reserve.' : 'Nicht eingerichtet.' })),
      meta.pk
        ? h('button', {
          class: 'btn sec', style: 'width:auto', type: 'button', text: 'Entfernen',
          onclick: async () => {
            if (!await confirmDlg('Passkey entfernen?', 'Die App lässt sich danach nur noch mit dem Passwort öffnen. Den Passkey selbst kannst du in den iOS-Einstellungen unter „Passwörter“ löschen.', 'Entfernen', true)) return;
            meta.pk = null; persistMeta(); render();
          },
        })
        : h('button', {
          class: 'btn', style: 'width:auto', type: 'button', text: 'Einrichten',
          onclick: async () => {
            try { await enablePasskey(); toast('Passkey eingerichtet.'); render(); } catch (e) { toast(e.message || String(e)); }
          },
        }));

    const fieldRows = s.fields.map((f, i) => h('div', { class: 'fieldrow' },
      h('input', {
        type: 'text', value: f.name, placeholder: 'Name', 'aria-label': `Name Messwert ${i + 1}`, maxlength: '40',
        onchange: (e) => { f.name = e.target.value.trim() || 'Messwert ' + (i + 1); persistMeta(); },
      }),
      h('input', {
        type: 'text', value: f.unit, placeholder: 'Einheit', 'aria-label': `Einheit Messwert ${i + 1}`, maxlength: '12',
        onchange: (e) => { f.unit = e.target.value.trim(); persistMeta(); },
      })));

    root.append(
      header('Einstellungen',
        h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Zurück', onclick: () => go('list') }, icon('back')), null),
      h('main', { class: 'wrap' },
        h('div', { class: 'sect' }, h('h2', { text: 'Sicherheit' }),
          h('label', { class: 'f' }, h('span', { text: 'Automatisch sperren' }), lockSel),
          pkRow,
          h('div', { class: 'stack', style: 'margin-top:8px' },
            h('button', {
              class: 'btn sec', type: 'button', text: 'Passwort ändern',
              onclick: async () => {
                // Erst das aktuelle Passwort abfragen: Sonst könnte jemand mit dem entsperrten
                // iPhone das Passwort ändern und dich aussperren.
                const cur = await askPassword('Aktuelles Passwort', { ok: 'Weiter' });
                if (!cur) return;
                try { await C.unwrapWithPassword(meta.pw, cur); } catch { toast('Falsches Passwort.'); return; }
                if (!dataKey) return; // inzwischen gesperrt
                const pw = await askPassword('Neues Passwort', { confirm: true, ok: 'Ändern', text: 'Die Daten bleiben erhalten. Alte Backups kannst du in dieser App weiter ohne das alte Passwort hinzufügen. Auf einem neuen Gerät brauchst du für alte Backups das damalige Passwort, mache deshalb nach dem Ändern ein neues Backup.' });
                if (!pw || !dataKey) return;
                try { meta.pw = await C.wrapWithPassword(dataKey, pw); persistMeta(); toast('Passwort geändert.'); } catch (e) { toast(e.message || String(e)); }
              },
            }))),
        h('div', { class: 'sect' }, h('h2', { text: 'Messfelder (10)' }),
          h('p', { class: 'muted small', style: 'margin-top:0', text: 'Name und Einheit für die zehn Messwerte. Änderungen gelten sofort für alle Einträge.' }),
          fieldRows),
        h('div', { class: 'sect' }, h('h2', { text: 'Daten' }),
          h('div', { class: 'stack' },
            h('button', { class: 'btn', type: 'button', onclick: () => exportCsv().catch((e) => toast(e.message || String(e))), text: 'Als CSV exportieren (unverschlüsselt)' }),
            h('button', { class: 'btn sec', type: 'button', onclick: () => exportBackup().catch((e) => toast(e.message || String(e))), text: 'Verschlüsseltes Backup erstellen' }),
            h('button', { class: 'btn sec', type: 'button', onclick: () => mergeBackup(), text: 'Backup hinzufügen (bestehende Daten bleiben)' })),
          h('label', { class: 'f', style: 'margin-top:14px' }, h('span', { text: 'Backup-Erinnerung' }), backupSel),
          h('p', {
            class: 'muted small', style: 'margin-top:-4px',
            text: 'Letztes Backup: ' + (s.lastBackup ? new Date(s.lastBackup).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : 'noch nie') +
              '. Die Erinnerung erscheint beim Öffnen der App.',
          }),
          h('p', { class: 'muted small', text: 'Achtung: Die CSV-Datei enthält Klartext. Das Backup ist verschlüsselt. In dieser App lässt es sich ohne Passwort hinzufügen; auf einem neuen Gerät brauchst du das Passwort, das beim Erstellen galt.' })),
        h('div', { class: 'sect' }, h('h2', { text: 'Gefahrenzone' }),
          h('button', {
            class: 'btn danger', type: 'button', text: 'Alle Daten auf diesem Gerät löschen',
            onclick: async () => {
              if (!await confirmDlg('Wirklich alles löschen?', 'Alle Einträge, das Passwort und der Passkey-Bezug werden von diesem Gerät entfernt. Ohne Backup sind die Daten verloren.', 'Alles löschen', true)) return;
              store.del(META_KEY); store.del(DATA_KEY);
              meta = null; dataKey = null; db = null; editing = null;
              view = 'setup'; render();
            },
          })),
        h('p', { class: 'muted small', style: 'text-align:center', text: 'Work Companion Fieldbook ' + APP_VERSION + ' · Daten bleiben lokal auf diesem Gerät' })));
  }

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  render();
})();
