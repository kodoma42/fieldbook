'use strict';
(() => {
  const C = MPCrypto;
  const META_KEY = 'mp_meta_v1';
  const DATA_KEY = 'mp_data_v1';
  const DRAFT_KEY = 'mp_draft_v1'; // verschlüsselter Entwurf eines noch nicht gespeicherten Eintrags
  const APP_VERSION = '1.6';
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
    next: '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    users: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
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
  /* Wiederherstellung: Code und Sicherheitsfragen                       */
  /* ------------------------------------------------------------------ */
  const SECRET_NAMES = { pw: 'Passwort', rc: 'Wiederherstellungscode', sq: 'Sicherheitsfragen' };
  const SECRET_ERR = {
    pw: 'Falsches Passwort.',
    rc: 'Falscher Wiederherstellungscode.',
    sq: 'Mindestens eine Antwort stimmt nicht. Groß-/Kleinschreibung und Leerzeichen sind egal.',
  };

  // Öffnet die Schlüssel-Hülle src.pw / src.rc / src.sq mit dem passenden Geheimnis s.
  async function unwrapBySecret(src, s) {
    if (s.kind === 'rc' && C.normCode(s.value).length !== 20) {
      throw new Error('Der Code hat 20 Zeichen (5 Gruppen zu je 4).');
    }
    try {
      if (s.kind === 'pw') return await C.unwrapWithPassword(src.pw, s.value);
      if (s.kind === 'rc') return await C.unwrapWithPassword(src.rc, C.normCode(s.value));
      return await C.unwrapWithPassword(src.sq, C.answersSecret(s.answers));
    } catch { throw new Error(SECRET_ERR[s.kind]); }
  }

  // Fragt nach Passwort, Wiederherstellungscode oder Antworten auf die Sicherheitsfragen.
  // Mit verify(secret) wird direkt im Dialog geprüft (Fehler erscheinen dort, man kann es nochmal versuchen);
  // das Ergebnis von verify wird zurückgegeben. Abbrechen gibt null zurück.
  function askSecret({ title, text, ok = 'Weiter', pw = true, rc = false, sq = null, verify = null }) {
    const modes = [];
    if (pw) modes.push('pw');
    if (rc) modes.push('rc');
    if (sq && sq.questions && sq.questions.length) modes.push('sq');
    return modal((box, close) => {
      let mode = modes[0];
      let getSecret = () => null;
      const err = h('div', { class: 'err' });
      const area = h('div', { class: 'stack' });
      const switches = h('div', { class: 'stack', style: 'margin-top:4px' });
      const btn = h('button', { class: 'btn', type: 'button', text: ok });
      async function go() {
        const s = getSecret();
        if (!s) { err.textContent = mode === 'sq' ? 'Bitte alle Fragen beantworten.' : 'Bitte etwas eingeben.'; return; }
        if (!verify) { close(s); return; }
        btn.disabled = true; btn.textContent = 'Bitte warten …'; err.textContent = '';
        try { close(await verify(s)); } catch (e) {
          err.textContent = e.message || String(e);
          btn.disabled = false; btn.textContent = ok;
        }
      }
      function draw() {
        err.textContent = '';
        area.replaceChildren();
        if (mode === 'pw') {
          const i = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Passwort' });
          i.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
          area.append(i);
          getSecret = () => (i.value ? { kind: 'pw', value: i.value } : null);
        } else if (mode === 'rc') {
          const i = h('input', {
            type: 'text', class: 'code-in', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false',
            placeholder: 'XXXX-XXXX-XXXX-XXXX-XXXX',
          });
          i.addEventListener('input', () => { i.value = C.formatCode(i.value).slice(0, 24); });
          i.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
          area.append(i);
          getSecret = () => (C.normCode(i.value) ? { kind: 'rc', value: i.value } : null);
        } else {
          const labels = sq.questions.map((q) => h('label', { class: 'f' },
            h('span', { text: q }),
            h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' })));
          area.append(...labels);
          getSecret = () => {
            const a = labels.map((l) => l.querySelector('input').value);
            return a.every((x) => x.trim()) ? { kind: 'sq', answers: a } : null;
          };
        }
        switches.replaceChildren(...modes.filter((m) => m !== mode).map((m) => h('button', {
          class: 'btn link', type: 'button', text: 'Stattdessen: ' + SECRET_NAMES[m],
          onclick: () => { mode = m; draw(); },
        })));
        const first = area.querySelector('input'); if (first) first.focus();
      }
      btn.addEventListener('click', go);
      box.append(
        h('h3', { text: title }),
        text && h('p', { text }),
        area, err,
        h('div', { class: 'stack', style: 'margin-top:10px' }, btn, switches,
          h('button', { class: 'btn link', type: 'button', onclick: () => close(null), text: 'Abbrechen' })));
      draw();
    });
  }

  // Die automatische Sperre pausiert, solange ein Ablauf läuft (z. B. beim Abschreiben des Codes).
  async function noLock(fn) {
    suspendLock++;
    try { return await fn(); } finally {
      setTimeout(() => { suspendLock = Math.max(0, suspendLock - 1); lastActivity = Date.now(); }, 500);
    }
  }

  function recoverySheet(code) {
    return modal((box, close) => {
      const pretty = C.formatCode(code);
      const mail = 'mailto:?subject=' + encodeURIComponent('Fieldbook Wiederherstellungscode') +
        '&body=' + encodeURIComponent('Wiederherstellungscode für Work Companion Fieldbook:\n\n' + pretty + '\n\nDiese Mail danach löschen oder nur an einem sicheren Ort aufbewahren.');
      box.classList.add('sheet');
      box.append(
        h('h3', { text: 'Notfallblatt' }),
        h('div', { class: 'sheet-brand', text: 'Work Companion Fieldbook · Wiederherstellungscode' }),
        h('div', { class: 'code-big', text: pretty }),
        h('p', { class: 'sheet-date', text: 'Erstellt am ' + new Date().toLocaleDateString('de-DE') }),
        h('p', { text: 'Mit diesem Code öffnest du die App und legst ein neues Passwort fest, falls Passwort und Face ID verloren sind. Der Code wird nur jetzt angezeigt. Schreibe ihn ab oder drucke das Blatt und bewahre es zu Hause auf, nicht neben dem iPhone. Wer Code und Gerät (oder ein Backup) hat, kommt an die Daten.' }),
        h('div', { class: 'stack noprint' },
          h('button', { class: 'btn sec', type: 'button', onclick: () => { try { window.print(); } catch { toast('Drucken geht hier nicht. Bitte abschreiben.'); } }, text: 'Drucken / als PDF sichern' }),
          h('a', { class: 'btn sec', href: mail, text: 'Mail-Entwurf an mich selbst' }),
          h('button', { class: 'btn', type: 'button', onclick: () => close(true), text: 'Ich habe den Code notiert' }),
          h('button', { class: 'btn link', type: 'button', onclick: () => close(null), text: 'Abbrechen' })));
    });
  }

  function verifyCodeDlg(code) {
    const parts = C.formatCode(code).split('-');
    return modal((box, close) => {
      const mk = () => h('input', {
        type: 'text', class: 'code-in', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false',
        maxlength: '4', placeholder: '····',
      });
      const a = mk(); const b = mk();
      const err = h('div', { class: 'err' });
      const check = () => {
        if (C.normCode(a.value) === parts[1] && C.normCode(b.value) === parts[3]) close(true);
        else err.textContent = 'Das stimmt nicht. Bitte vergleiche mit deinem Notfallblatt.';
      };
      box.append(
        h('h3', { text: 'Kurze Kontrolle' }),
        h('p', { text: 'Tippe zur Kontrolle die 2. und die 4. Gruppe des Codes so ein, wie du sie notiert hast.' }),
        h('div', { class: 'row' },
          h('label', { class: 'f' }, h('span', { text: '2. Gruppe' }), a),
          h('label', { class: 'f' }, h('span', { text: '4. Gruppe' }), b)),
        err,
        h('div', { class: 'stack', style: 'margin-top:10px' },
          h('button', { class: 'btn', type: 'button', onclick: check, text: 'Prüfen' }),
          h('button', { class: 'btn link', type: 'button', onclick: () => close('back'), text: 'Zurück zum Code' })));
    });
  }

  // Erzeugt einen neuen Code. Er gilt erst, wenn die Kontrolle bestanden ist; ein alter Code bleibt bis dahin gültig.
  function createRecoveryCode() {
    return noLock(async () => {
      if (!dataKey) return false;
      const code = C.newRecoveryCode();
      const rc = await C.wrapWithPassword(dataKey, C.normCode(code));
      for (;;) {
        if (!await recoverySheet(code)) return false;
        const v = await verifyCodeDlg(code);
        if (v === true) break;
        if (v === null) return false;
      }
      if (!meta || !dataKey) return false;
      meta.rc = rc; persistMeta();
      return true;
    });
  }

  function questionsForm() {
    return modal((box, close) => {
      const qs = [0, 1, 2].map((i) => h('input', { type: 'text', maxlength: '80', autocomplete: 'off', placeholder: `Frage ${i + 1}${i === 2 ? ' (optional)' : ''}` }));
      const as = [0, 1, 2].map((i) => h('input', { type: 'text', maxlength: '80', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Antwort' }));
      const err = h('div', { class: 'err' });
      const next = () => {
        const pairs = [];
        for (let i = 0; i < 3; i++) {
          const q = qs[i].value.trim(); const a = as[i].value.trim();
          if (!q && !a) continue;
          if (!q || !a) { err.textContent = `Frage ${i + 1}: Bitte Frage und Antwort ausfüllen.`; return; }
          if (a.replace(/\s+/g, '').length < 3) { err.textContent = `Frage ${i + 1}: Die Antwort ist zu kurz (mind. 3 Zeichen).`; return; }
          pairs.push({ q, a });
        }
        if (pairs.length < 2) { err.textContent = 'Bitte mindestens zwei Fragen mit Antworten angeben.'; return; }
        close(pairs);
      };
      box.append(
        h('h3', { text: 'Sicherheitsfragen' }),
        h('p', { text: 'Wähle zwei bis drei eigene Fragen, deren Antworten nur du kennst und die nirgends online stehen. Beim Zurücksetzen werden alle Antworten gebraucht; Groß-/Kleinschreibung und Leerzeichen sind egal. Das ist schwächer als der Wiederherstellungscode, und die Fragen selbst sind in der App lesbar gespeichert.' }),
        h('div', { class: 'stack' }, qs[0], as[0], qs[1], as[1], qs[2], as[2]),
        err,
        h('div', { class: 'stack', style: 'margin-top:10px' },
          h('button', { class: 'btn', type: 'button', onclick: next, text: 'Weiter' }),
          h('button', { class: 'btn link', type: 'button', onclick: () => close(null), text: 'Abbrechen' })));
    });
  }

  function questionsCheck(pairs) {
    return modal((box, close) => {
      const ins = pairs.map(() => h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Antwort noch einmal' }));
      const err = h('div', { class: 'err' });
      const norm = (x) => C.answersSecret([x]);
      const check = () => {
        if (pairs.every((p, i) => norm(ins[i].value) === norm(p.a))) close(true);
        else err.textContent = 'Mindestens eine Antwort weicht ab. Bitte noch einmal eintippen.';
      };
      box.append(
        h('h3', { text: 'Antworten bestätigen' }),
        h('p', { text: 'Tippe die Antworten zur Kontrolle noch einmal ein, damit sich kein Tippfehler einschleicht.' }),
        h('div', { class: 'stack' }, pairs.map((p, i) => h('label', { class: 'f' }, h('span', { text: p.q }), ins[i]))),
        err,
        h('div', { class: 'stack', style: 'margin-top:10px' },
          h('button', { class: 'btn', type: 'button', onclick: check, text: 'Speichern' }),
          h('button', { class: 'btn link', type: 'button', onclick: () => close(null), text: 'Abbrechen' })));
    });
  }

  function setupQuestions() {
    return noLock(async () => {
      if (!dataKey) return false;
      const pairs = await questionsForm();
      if (!pairs) return false;
      if (!await questionsCheck(pairs)) return false;
      if (!meta || !dataKey) return false;
      const w = await C.wrapWithPassword(dataKey, C.answersSecret(pairs.map((p) => p.a)));
      meta.sq = Object.assign({ questions: pairs.map((p) => p.q) }, w);
      persistMeta();
      return true;
    });
  }

  // Schützt Änderungen an den Wiederherstellungswegen vor jemandem, der nur das entsperrte iPhone in der Hand hält
  async function requireCurrentPassword() {
    const cur = await askPassword('Aktuelles Passwort', { ok: 'Weiter' });
    if (!cur) return false;
    try { await C.unwrapWithPassword(meta.pw, cur); } catch { toast('Falsches Passwort.'); return false; }
    return !!dataKey;
  }

  /* ------------------------------------------------------------------ */
  /* Zustand                                                             */
  /* ------------------------------------------------------------------ */
  // Art des Einsatzes und Vorlagentexte für die Notiz (in den Einstellungen änderbar)
  const KINDS = [['installation', 'Installation'], ['wartung', 'Wartung'], ['reparatur', 'Reparatur']];
  const kindLabel = (k) => (KINDS.find((x) => x[0] === k) || [])[1] || '';
  const defaultTemplates = () => ({
    installation: 'Das Gerät wurde installiert, angeschlossen und in Betrieb genommen. Der Server wurde eingerichtet, die Verbindung zwischen Server und Gerät funktioniert. Die Funktionsprüfung war in Ordnung.',
    wartung: 'Die Wartung wurde durchgeführt. Das Gerät wurde geprüft und gereinigt. Die Funktionsprüfung war in Ordnung, es wurden keine Mängel festgestellt.',
    reparatur: 'Die Störung wurde behoben. Die Funktionsprüfung nach der Reparatur war in Ordnung.',
  });

  const defaultSettings = () => ({
    lockMin: 2,
    backupDays: 7,
    lastBackup: null,
    snoozeUntil: 0,
    spesenMin: 480, // Spesen-Hinweis ab mehr als 8 Stunden Fahr- + Arbeitszeit pro Tag (0 = aus)
    fontSize: 'normal', // 'normal' | 'big'
    autoPasskey: true, // Face ID beim Öffnen automatisch starten (wenn ein Passkey eingerichtet ist)
    company: '', // Firmenname: ersetzt den App-Namen in der Kopfzeile, steht auf dem Sperrbildschirm (unverschlüsselt)
    hiddenTabs: [], // ausgeblendete Reiter: 'customers' und/oder 'calendar'
    templates: defaultTemplates(),
    fields: Array.from({ length: 10 }, (_, i) => ({ name: 'Messwert ' + (i + 1), unit: '' })),
  });

  let meta = store.get(META_KEY); // { v, pw, pk, settings }
  let dataKey = null;
  let db = null; // { entries: [] }
  let view = meta ? 'lock' : 'setup';
  let editing = null; // { entry, isNew }
  let search = '';
  let filter = { from: '', to: '' }; // Datumsfilter der Eintragsliste
  let selCustomer = null; // Schlüssel des geöffneten Kunden
  let cal = { y: new Date().getFullYear(), m: new Date().getMonth() };
  let calDay = null;
  let lastActivity = Date.now();
  let hiddenAt = null;
  let suspendLock = 0;
  let autoTry = true; // Face ID automatisch starten: beim Öffnen der App, nicht nach manuellem Sperren
  let lockUI = null; // { btn, err } des aktuellen Sperrbildschirms

  if (meta) {
    meta.settings = Object.assign(defaultSettings(), meta.settings || {});
    fixFields(meta.settings);
    if (meta.settings.fontSize !== 'big') meta.settings.fontSize = 'normal';
    fixLook(meta.settings);
    applyFontSize();
  }

  const persistMeta = () => store.set(META_KEY, meta);

  // Messfelder: Liste in den Einstellungen, mindestens 1, höchstens MAX_FIELDS (beim Hinzufügen).
  // Einträge speichern ihre Werte nach Position (values[0] = erstes Messfeld).
  function applyFontSize() {
    const big = meta && meta.settings && meta.settings.fontSize === 'big';
    document.documentElement.setAttribute('data-fs', big ? 'big' : 'normal');
  }
  // Firmenname und ausgeblendete Reiter auf gültige Werte bringen (auch für Backups aus älteren Versionen)
  function fixLook(s) {
    s.company = Array.from(String(s.company || '').replace(/\s+/g, ' ').trim()).slice(0, 60).join('').trim(); // nach Zeichen kürzen, nicht mitten im Emoji
    s.hiddenTabs = Array.isArray(s.hiddenTabs) ? [...new Set(s.hiddenTabs.filter((t) => t === 'customers' || t === 'calendar'))] : [];
  }
  const companyName = () => (meta && meta.settings && meta.settings.company) || '';
  const tabHidden = (t) => !!(meta && meta.settings && meta.settings.hiddenTabs.includes(t));
  function fixFields(s) {
    if (!Array.isArray(s.fields)) s.fields = defaultSettings().fields;
    // Kaputte Einträge werden ersetzt, nicht entfernt: sonst rutschen Namen auf falsche Werte
    s.fields = s.fields.map((f) => (f && typeof f === 'object' ? f : {}))
      .map((f, i) => ({
        name: (typeof f.name === 'string' ? f.name.trim().slice(0, 40) : '') || 'Messwert ' + (i + 1),
        unit: typeof f.unit === 'string' ? f.unit.trim().slice(0, 12) : '',
      }));
    if (!s.fields.length) s.fields.push({ name: 'Messwert 1', unit: '' });
  }
  const lastFilled = (e) => {
    const v = e && Array.isArray(e.values) ? e.values : [];
    for (let i = v.length - 1; i >= 0; i--) if (String(v[i] ?? '').trim() !== '') return i;
    return -1;
  };
  // Gibt es Werte an Positionen ohne Messfeld (z. B. aus einem Backup mit mehr Feldern),
  // werden passende Felder angelegt, damit nichts unsichtbar wird. Liefert true bei Änderung.
  function ensureFieldsForData(s, entries) {
    let need = 0;
    for (const e of entries || []) need = Math.max(need, lastFilled(e) + 1);
    let changed = false;
    while (s.fields.length < need) { s.fields.push({ name: 'Messwert ' + (s.fields.length + 1), unit: '' }); changed = true; }
    return changed;
  }
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
    fixDb(db);
    if (ensureFieldsForData(meta.settings, db.entries)) persistMeta();
  }
  // Datenbestand auf gültige Form bringen (auch für Backups aus älteren Versionen ohne "deleted")
  function fixDb(d) {
    if (!Array.isArray(d.entries)) d.entries = [];
    // Gelöschte Einträge: { id, at }. Damit kommen sie beim Zusammenführen eines älteren Backups nicht zurück.
    d.deleted = Array.isArray(d.deleted) ? d.deleted.filter((t) => t && typeof t.id === 'string') : [];
    return d;
  }

  /* Entwurf: Solange ein Eintrag geändert, aber nicht gespeichert ist, wird sein Stand verschlüsselt
     (mit dem Datenschlüssel) mitgeschrieben. Sperrt sich die App oder beendet iOS sie im Hintergrund,
     geht nichts verloren: Nach dem Entsperren öffnet sich der Eintrag mit dem letzten Stand. */
  let draftCollect = null; // von der Eintragsansicht gesetzt: liefert den Stand oder null (keine Änderungen)
  let draftTimer = null;
  let draftSeq = 0;
  function stashDraft() {
    clearTimeout(draftTimer); draftTimer = null;
    if (!draftCollect || !dataKey || !editing || view !== 'edit') return;
    const e = draftCollect();
    const seq = ++draftSeq;
    if (!e) { store.del(DRAFT_KEY); return; }
    const d = { v: 1, entry: e, isNew: !!editing.isNew, back: editing.back || 'list', at: Date.now() };
    C.encryptJSON(d, dataKey).then((box) => {
      if (seq !== draftSeq) return; // inzwischen neuer Stand oder Entwurf verworfen
      try { store.set(DRAFT_KEY, box); } catch { /* Speicher voll: der Entwurf ist nur eine Absicherung */ }
    }).catch(() => {});
  }
  function scheduleDraft() { clearTimeout(draftTimer); draftTimer = setTimeout(stashDraft, 250); }
  function clearDraft() {
    clearTimeout(draftTimer); draftTimer = null; draftSeq++;
    draftCollect = null; store.del(DRAFT_KEY);
  }
  async function restoreDraft(note) {
    const box = store.get(DRAFT_KEY);
    if (!box || !dataKey || !db) return;
    let d = null;
    try { d = await C.decryptJSON(box, dataKey); } catch { d = null; }
    if (!d || !d.entry || typeof d.entry.id !== 'string') { store.del(DRAFT_KEY); return; }
    if (!db || view === 'edit') return; // inzwischen gesperrt oder schon in einem Eintrag
    const orig = db.entries.find((e) => e.id === d.entry.id);
    // Wurde der Eintrag inzwischen anders geändert oder gelöscht (z. B. durch "Backup hinzufügen"),
    // würde Speichern den neueren Stand überschreiben bzw. den gelöschten Eintrag zurückholen: erst fragen.
    const base = d.entry.updatedAt || 0;
    const tomb = db.deleted.find((t) => t.id === d.entry.id);
    const newer = !d.isNew && orig && (orig.updatedAt || 0) > base;
    const gone = !d.isNew && (!orig || (tomb && tomb.at >= base));
    if (newer || gone) {
      const ok = await modal((box, close) => {
        box.append(
          h('h3', { text: 'Nicht gespeicherte Eingaben' }),
          h('p', {
            text: (gone ? 'Der Eintrag wurde inzwischen gelöscht.' : 'Der Eintrag wurde inzwischen geändert (z. B. durch ein Backup).') +
              ' Öffnest du deine nicht gespeicherten Eingaben und speicherst sie, ' +
              (gone ? 'wird der Eintrag neu angelegt.' : 'ersetzen sie den neueren Stand.'),
          }),
          h('div', { class: 'stack' },
            h('button', { class: 'btn', type: 'button', onclick: () => close(true), text: 'Eingaben öffnen' }),
            h('button', { class: 'btn danger', type: 'button', onclick: () => close('drop'), text: 'Eingaben verwerfen' })));
      });
      if (ok === 'drop') { store.del(DRAFT_KEY); return; }
      if (ok !== true || !db || view === 'edit') return; // Dialog geschlossen oder gesperrt: Entwurf bleibt
    }
    editing = { entry: d.entry, isNew: !!d.isNew || !orig, back: d.back || 'list', restored: true };
    go('edit');
    toast((note ? note + ' ' : '') + 'Nicht gespeicherte Eingaben wiederhergestellt.');
  }

  function lock() {
    stashDraft(); // offenen Eintrag sichern, bevor alles aus dem Speicher genommen wird
    draftCollect = null;
    dataKey = null; db = null; editing = null; search = '';
    filter = { from: '', to: '' }; selCustomer = null; calDay = null;
    autoTry = false; // nach dem Sperren (von Hand oder automatisch) fragt Face ID nicht von selbst
    view = 'lock';
    render();
  }
  function go(v) { view = v; render(); window.scrollTo(0, 0); }

  function afterUnlock(skipDraft) {
    applyFontSize();
    view = 'list'; search = ''; lastActivity = Date.now();
    const now = new Date();
    cal = { y: now.getFullYear(), m: now.getMonth() }; calDay = todayStr();
    render();
    if (!skipDraft) restoreDraft().catch(() => {});
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
      stashDraft(); // iOS kann die App im Hintergrund jederzeit beenden
      hiddenAt = Date.now();
      if (min === 0 && !suspendLock) lock();
    } else {
      if (hiddenAt && min > 0 && !suspendLock && Date.now() - hiddenAt > min * 60000) lock();
      hiddenAt = null;
      lastActivity = Date.now();
    }
  });
  // Zurück in der App und gesperrt: Face ID wieder automatisch anbieten
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || dataKey || view !== 'lock') return;
    autoTry = true;
    setTimeout(maybeAutoPasskey, 400);
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
  // Reine Zahlen (auch negativ, mit Komma oder Punkt) bleiben unverändert, alles andere wie Text
  const safeNum = (v) => {
    v = String(v ?? '');
    return /^-?\d+([.,]\d+)?$/.test(v.trim()) ? v : safeText(v);
  };

  function buildCsv() {
    const f = meta.settings.fields;
    const totals = dayTotals();
    const head = ['Datum', 'Kunde', 'Kunden-ID', 'Seriennummer', 'Art des Einsatzes', 'Anfahrt (h:mm)', 'Abfahrt (h:mm)', 'Fahrzeit gesamt (h:mm)', 'Arbeitszeit (h:mm)', 'Spesentag']
      .concat(f.map((x) => safeText(x.name + (x.unit ? ` [${x.unit}]` : ''))), ['Notiz']);
    const rows = sortedEntries().map((e) => [
      e.date, safeText(e.customerName), safeText(e.customerId), safeText(e.serial), kindLabel(e.kind),
      e.driveToMin === undefined ? '' : fmtDur(e.driveToMin), e.driveBackMin === undefined ? '' : fmtDur(e.driveBackMin),
      fmtDur(e.driveMin), fmtDur(e.workMin), isSpesen(totals.get(e.date) || 0) ? 'ja' : '',
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
      pw: meta.pw, rc: meta.rc || null, sq: meta.sq || null,
      settings: meta.settings, data: await C.encryptJSON(db, dataKey),
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
        h('button', { class: 'btn', type: 'button', style: 'font-size:calc(15px*var(--fs));padding:12px 8px', text: 'Jetzt sichern', onclick: () => exportBackup().catch((e) => toast(e.message || String(e))) }),
        h('button', {
          class: 'btn sec', type: 'button', style: 'font-size:calc(15px*var(--fs));padding:12px 8px', text: 'Morgen erinnern',
          onclick: () => { meta.settings.snoozeUntil = Date.now() + 86400000; persistMeta(); render(); },
        })));
  }

  async function parseBackup(file) {
    let b;
    try { b = JSON.parse(await file.text()); } catch { throw new Error('Die Datei ist kein gültiges Backup.'); }
    if (!b || b.format !== 'messprotokoll-backup' || !b.pw || !b.data) throw new Error('Die Datei ist kein Backup dieser App.');
    return b;
  }

  // Öffnet ein Backup mit Passwort, Wiederherstellungscode oder Antworten (s, siehe askSecret)
  async function openBackupWith(b, s) {
    const key = await unwrapBySecret(b, s);
    let d;
    try { d = await C.decryptJSON(b.data, key); } catch { throw new Error('Backup beschädigt (lässt sich nicht entschlüsseln).'); }
    if (!d || !Array.isArray(d.entries)) throw new Error('Backup beschädigt.');
    return { b, key, d, s };
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
        const b = await parseBackup(file);
        const r = await askSecret({
          title: 'Passwort des Backups', ok: 'Hinzufügen', rc: !!b.rc, sq: b.sq,
          text: 'Dieses Backup stammt von einer anderen Einrichtung der App. Bitte das Passwort eingeben, das beim Erstellen des Backups galt.' +
            (b.rc || b.sq ? ' Alternativ geht der Wiederherstellungscode oder die Antworten auf die Sicherheitsfragen.' : ''),
          verify: (s) => openBackupWith(b, s),
        });
        if (!r) return;
        d = r.d;
      }
      if (!db) return; // inzwischen gesperrt
      const before = db.entries.slice();
      const beforeDel = db.deleted.slice();
      // Gelöschte Einträge aus beiden Beständen zusammenführen (je ID der späteste Zeitpunkt).
      // Ein Eintrag gilt als gelöscht, wenn er nach seiner letzten Änderung gelöscht wurde.
      const del = new Map();
      for (const t of [...db.deleted, ...(Array.isArray(d.deleted) ? d.deleted : [])]) {
        if (t && typeof t.id === 'string') del.set(t.id, Math.max(del.get(t.id) || 0, Number(t.at) || 0));
      }
      const isDeleted = (e) => del.has(e.id) && del.get(e.id) >= (e.updatedAt || 0);
      const next = db.entries.filter((e) => !isDeleted(e)).map((e) => Object.assign({}, e));
      const removed = db.entries.length - next.length;
      const idx = new Map(next.map((e, i) => [e.id, i]));
      let added = 0, updated = 0;
      for (const e of Array.isArray(d.entries) ? d.entries : []) {
        if (!e || !e.id) continue;
        if (isDeleted(e)) continue; // hier gelöscht: kommt nicht zurück
        const i = idx.get(e.id);
        if (i === undefined) { idx.set(e.id, next.length); next.push(e); added++; } else if ((e.updatedAt || 0) > (next[i].updatedAt || 0)) {
          // Der neuere Eintrag ersetzt den alten ganz. Felder mischen ergab z. B. Anfahrt/Abfahrt,
          // die nicht zur Gesamtfahrzeit passen (Eintrag aus 1.1 ohne Aufteilung).
          next[i] = e; updated++;
        }
      }
      db.entries = next;
      db.deleted = [...del].map(([id, at]) => ({ id, at }));
      if (await save(before)) {
        if (ensureFieldsForData(meta.settings, db.entries)) persistMeta();
        const msg = `${added} neu, ${updated} aktualisiert` + (removed ? `, ${removed} gelöscht` : '') + '.';
        toast(msg);
        render();
        return msg;
      } else db.deleted = beforeDel;
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
    const key = await askSecret({
      title: 'Aktuelles Passwort', ok: 'Weiter', rc: !!meta.rc, sq: meta.sq,
      text: 'Dein jetziges App-Passwort, damit die bestehenden Daten geöffnet werden können.',
      verify: (s) => unwrapBySecret(meta, s),
    });
    if (!key) return;
    dataKey = key;
    try { await loadDb(); } catch {
      dataKey = null; if (errEl) errEl.textContent = 'Bestehende Daten konnten nicht gelesen werden.'; return;
    }
    afterUnlock(true); // Entwurf erst nach dem Zusammenführen öffnen, sonst schließt er dessen Dialoge
    const msg = await mergeBackup(file);
    restoreDraft(msg).catch(() => {}); // Ergebnis des Zusammenführens bleibt in der Meldung sichtbar
  }

  // Nach "Alles ersetzen" gelten Code und Sicherheitsfragen aus dem Backup, nicht die zuletzt
  // auf dem Gerät eingerichteten. Das muss man wissen, sonst verlässt man sich auf einen Code,
  // der nicht mehr funktioniert.
  async function recoveryAfterRestore(b) {
    const when = b.created ? new Date(b.created).toLocaleDateString('de-DE') : 'dem Tag des Backups';
    const what = b.rc && b.sq ? 'der Wiederherstellungscode und die Sicherheitsfragen'
      : b.rc ? 'der Wiederherstellungscode' : b.sq ? 'die Sicherheitsfragen' : null;
    const text = (what
      ? `Ab jetzt gelten ${what} vom ${when} (aus dem Backup). Ein Code oder Antworten, die du danach eingerichtet hast, funktionieren nicht mehr.`
      : 'Im Backup war kein Wiederherstellungscode und keine Sicherheitsfrage eingerichtet. Der bisherige Code und die bisherigen Antworten funktionieren nicht mehr.') +
      ' Am sichersten: jetzt einen neuen Code erzeugen und den alten Zettel vernichten.';
    const ok = await modal((box, close) => {
      box.append(
        h('h3', { text: 'Wiederherstellungscode prüfen' }),
        h('p', { text }),
        h('div', { class: 'stack' },
          h('button', { class: 'btn', type: 'button', onclick: () => close(true), text: 'Neuen Code erzeugen' }),
          h('button', { class: 'btn link', type: 'button', onclick: () => close(null), text: 'Später' })));
    });
    if (ok && dataKey) {
      try { if (await createRecoveryCode()) { toast('Wiederherstellungscode eingerichtet.'); render(); } } catch (e) { toast(e.message || String(e)); }
    }
  }

  async function restoreFromBackup(errEl) {
    const file = await pickFile();
    if (!file) return;
    if (meta) {
      const ok = await confirmDlg('Daten ersetzen?', 'Alle Daten auf diesem Gerät werden durch das Backup ersetzt.', 'Ersetzen', true);
      if (!ok) return;
    }
    try {
      const b0 = await parseBackup(file);
      const r = await askSecret({
        title: 'Passwort des Backups', ok: 'Wiederherstellen', rc: !!b0.rc, sq: b0.sq,
        verify: (s) => openBackupWith(b0, s),
      });
      if (!r) return;
      const { b, key, d } = r;
      // Unbrauchbare Einträge (z. B. aus einer beschädigten Datei) nicht übernehmen
      if (!Array.isArray(d.entries)) d.entries = [];
      d.entries = d.entries.filter((e) => e && typeof e === 'object' && !Array.isArray(e));
      fixDb(d);
      // Wurde das Backup mit Code oder Antworten geöffnet, braucht die App ein neues Passwort
      let pwWrap = b.pw;
      if (r.s.kind !== 'pw') {
        const np = await askPassword('Neues Passwort festlegen', {
          confirm: true, ok: 'Speichern',
          text: 'Das Backup ließ sich öffnen. Lege jetzt ein neues Passwort für diese App fest.',
        });
        if (!np) return;
        pwWrap = await C.wrapWithPassword(key, np);
      }
      const hadPasskey = !!(meta && meta.pk);
      const same = (a, b2) => JSON.stringify(a || null) === JSON.stringify(b2 || null);
      const recoveryChanged = !!(meta && (meta.rc || meta.sq) && (!same(meta.rc, b.rc) || !same(meta.sq, b.sq)));
      const settings = Object.assign(defaultSettings(), b.settings || {});
      fixFields(settings);
      fixLook(settings);
      ensureFieldsForData(settings, d.entries);
      // Beide Teile (Schlüssel-Infos und Daten) müssen zusammenpassen. Klappt das Schreiben nicht
      // (z. B. Speicher voll), wird der alte Stand zurückgeschrieben, damit nichts unlesbar wird.
      const oldMeta = localStorage.getItem(META_KEY);
      const oldData = localStorage.getItem(DATA_KEY);
      const newMeta = { v: 1, pw: pwWrap, rc: b.rc || null, sq: b.sq || null, pk: null, settings };
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
      store.del(DRAFT_KEY); // ein Entwurf gehört zu den ersetzten Daten
      dataKey = key; db = d;
      afterUnlock();
      toast(hadPasskey
        ? 'Backup wiederhergestellt. Face ID bitte in den Einstellungen neu einrichten.'
        : r.s.kind === 'pw' ? 'Backup wiederhergestellt. Passwort ist jetzt das des Backups.'
          : 'Backup wiederhergestellt. Es gilt dein neues Passwort.');
      if (recoveryChanged) await recoveryAfterRestore(b);
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
    kind: '', driveToMin: 0, driveBackMin: 0, driveMin: 0, workMin: 0, values: [], note: '',
    createdAt: Date.now(), updatedAt: Date.now(),
  });

  /* ------------------------------------------------------------------ */
  /* Ansichten                                                           */
  /* ------------------------------------------------------------------ */
  function render() {
    // Ausgeblendeter Reiter (z. B. nach dem Einspielen eines Backups): zurück zu den Einträgen
    const tabView = view === 'customer' ? 'customers' : view;
    if ((tabView === 'customers' || tabView === 'calendar') && tabHidden(tabView)) view = 'list';
    root.replaceChildren();
    document.querySelectorAll('.overlay').forEach((o) => o.remove());
    const fn = {
      setup: renderSetup, lock: renderLock, list: renderList, edit: renderEdit, settings: renderSettings,
      customers: renderCustomers, customer: renderCustomer, calendar: renderCalendar,
    }[view];
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
        db = { entries: [], deleted: [] };
        persistMeta();
        await persistData();
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
        store.del(DRAFT_KEY); // neue Einrichtung: ein alter Entwurf passt nicht mehr
        afterUnlock(true);
        const want = await confirmDlg('Mit Face ID entsperren?',
          'Du kannst die App zusätzlich mit einem Passkey (Face ID / Touch ID) öffnen. Das Passwort bleibt als Reserve erhalten.', 'Jetzt einrichten');
        if (want) {
          try { await enablePasskey(); toast('Passkey eingerichtet.'); } catch (e) { toast(e.message || String(e)); }
        }
        const wantCode = await confirmDlg('Wiederherstellungscode erzeugen?',
          'Falls du Passwort und Face ID einmal verlierst, kommst du mit diesem Code wieder an deine Daten. Empfohlen: jetzt erzeugen und ausdrucken oder abschreiben. Du kannst es auch später in den Einstellungen tun.', 'Jetzt erzeugen');
        if (wantCode) {
          try { if (await createRecoveryCode()) { toast('Wiederherstellungscode eingerichtet.'); render(); } } catch (e) { toast(e.message || String(e)); }
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
      h('div', { class: 'hint', text: 'Wichtig: Es gibt keinen Server und kein Konto, bei dem man das Passwort zurücksetzen könnte. Wer Passwort, Passkey und Wiederherstellungscode verliert, verliert die Daten. Nach dem Einrichten kannst du einen Wiederherstellungscode erzeugen. Erstelle außerdem regelmäßig ein verschlüsseltes Backup.' }),
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
      h('div', { class: 'brand', text: companyName() || 'Work Companion Fieldbook' }),
      companyName() ? h('div', { class: 'brand-sub muted small', text: 'Work Companion Fieldbook' }) : null,
      h('h1', { text: 'Gesperrt' }),
      h('p', { class: 'muted', text: 'Entsperre die App, um deine Einträge zu sehen.' }),
    ];
    lockUI = null;
    if (meta.pk) {
      const pkBtn = h('button', {
        class: 'btn', type: 'button', style: 'margin-bottom:12px', text: 'Mit Face ID / Passkey entsperren',
        onclick: () => runPasskey(false),
      });
      // auto = true: von der App selbst gestartet. Lehnt iOS das ab (oft fehlt der Fingertipp), bleibt es still
      // und der Button wartet.
      async function runPasskey(auto) {
        if (!pkBtn.isConnected || pkBtn.disabled) return;
        pkBtn.disabled = true; err.textContent = '';
        try { await unlockWithPasskey(); afterUnlock(); } catch (ex) {
          dataKey = null;
          if (ex && ex.name === 'NotAllowedError') err.textContent = auto ? '' : 'Abgebrochen. Nutze das Passwort oder versuche es erneut.';
          else err.textContent = ex.message || String(ex);
        } finally { if (pkBtn.isConnected) pkBtn.disabled = false; }
      }
      lockUI = { run: runPasskey };
      kids.push(pkBtn);
    }
    kids.push(h('div', { class: 'stack' }, pw, meta.pk ? h('button', { class: 'btn sec', type: 'button', onclick: submit, text: 'Mit Passwort entsperren' }) : btn), err);
    // Ein Button genügt: bei Passkey-Variante den eigentlichen Button nicht doppelt anzeigen
    kids.push(h('div', { class: 'linkrow' },
      h('button', { class: 'btn link', type: 'button', onclick: () => forgotPassword(err), text: 'Passwort vergessen?' }),
      h('button', { class: 'btn link', type: 'button', onclick: () => restoreOrAdd(err), text: 'Backup einspielen' })));
    kids.push(versionLine());
    root.append(h('div', { class: 'center' }, kids));
    setTimeout(maybeAutoPasskey, 350);
  }

  // Face ID automatisch starten, wenn die App geöffnet wird (Einstellung, standardmäßig an)
  function maybeAutoPasskey() {
    if (!autoTry || view !== 'lock' || dataKey || !meta || !meta.pk || !lockUI) return;
    if (meta.settings.autoPasskey === false || !window.PublicKeyCredential) return;
    if (document.hidden || suspendLock || document.querySelector('.overlay')) return;
    autoTry = false;
    lockUI.run(true);
  }

  // Passwort vergessen: Öffnen mit Wiederherstellungscode oder Sicherheitsfragen, danach neues Passwort
  async function forgotPassword(errEl) {
    if (!meta.rc && !meta.sq) {
      const wantBackup = await modal((box, close) => {
        box.append(
          h('h3', { text: 'Kein Wiederherstellungsweg eingerichtet' }),
          h('p', { text: 'Ohne Passwort, Face ID oder Wiederherstellungscode lassen sich die Daten auf diesem Gerät nicht öffnen. Hast du ein Backup und kennst dessen Passwort, kannst du es einspielen.' }),
          h('div', { class: 'stack' },
            h('button', { class: 'btn', type: 'button', onclick: () => close(true), text: 'Backup einspielen' }),
            h('button', { class: 'btn link', type: 'button', onclick: () => close(null), text: 'Schließen' })));
      });
      if (wantBackup) restoreOrAdd(errEl);
      return;
    }
    const key = await askSecret({
      title: 'Passwort vergessen', ok: 'Weiter', pw: false, rc: !!meta.rc, sq: meta.sq,
      text: 'Öffne die App mit deinem Wiederherstellungscode oder den Antworten auf deine Sicherheitsfragen. Danach legst du ein neues Passwort fest. Deine Daten bleiben erhalten.',
      verify: (s) => unwrapBySecret(meta, s),
    });
    if (!key) return;
    const pw = await askPassword('Neues Passwort festlegen', {
      confirm: true, ok: 'Speichern',
      text: 'Das hat geklappt. Lege jetzt ein neues Passwort fest. Deine Daten bleiben erhalten.',
    });
    if (!pw) return;
    try {
      dataKey = key;
      await loadDb();
      meta.pw = await C.wrapWithPassword(key, pw);
      persistMeta();
    } catch (e) {
      dataKey = null; db = null;
      if (errEl) errEl.textContent = 'Das hat nicht geklappt: ' + (e.message || e);
      return;
    }
    afterUnlock();
    toast('Neues Passwort gespeichert.');
  }

  function versionLine() {
    return h('div', { class: 'version', text: 'Version ' + APP_VERSION });
  }

  function header(title, left, right, cls) {
    return h('div', { class: 'bar' }, left, h('h1', { text: title, class: cls || null }), right);
  }
  // Kopfzeile der Einträge: Firmenname, sonst der volle App-Name (etwas kleiner, darf umbrechen)
  const appHeader = (right) => companyName()
    ? header(companyName(), null, right, 'apptitle')
    : header('Work Companion Fieldbook', null, right, 'apptitle long');

  /* ------------------------------------------------------------------ */
  /* Reiterleiste, Datumsfilter, Kunden, Kalender                        */
  /* ------------------------------------------------------------------ */
  const TABS = [
    ['list', 'Einträge', 'list'], ['customers', 'Kunden', 'users'],
    ['calendar', 'Kalender', 'cal'], ['settings', 'Einstellungen', 'settings'],
  ];
  const tabOf = (v) => (v === 'customer' ? 'customers' : v);

  function tabbar() {
    const cur = tabOf(view);
    return h('nav', { class: 'tabs', 'aria-label': 'Hauptmenü' }, TABS.filter(([v]) => !tabHidden(v)).map(([v, label, ic]) => h('button', {
      class: 'tab', type: 'button', 'aria-current': v === cur ? 'page' : null,
      onclick: () => { if (v === 'customers') selCustomer = null; go(v); },
    }, icon(ic), h('span', { text: label }))));
  }

  const lockBtn = () => iconBtn('lock', 'Sperren', lock);

  // Gesamtzeit (Fahrt + Arbeit) pro Datum über alle Einträge: Grundlage für Spesen und Kalender
  function dayTotals() {
    const m = new Map();
    for (const e of db.entries) m.set(e.date, (m.get(e.date) || 0) + (e.driveMin || 0) + (e.workMin || 0));
    return m;
  }
  const spesenLimit = () => Number(meta.settings.spesenMin) || 0;
  const isSpesen = (min) => spesenLimit() > 0 && min > spesenLimit();

  function entryCard(e, backView, totals) {
    const filled = (Array.isArray(e.values) ? e.values : []).filter((v) => v != null && String(v).trim() !== '').length;
    return h('button', {
      class: 'card', type: 'button',
      onclick: () => { editing = { entry: JSON.parse(JSON.stringify(e)), isNew: false, back: backView }; go('edit'); },
    },
      h('div', { class: 'card-top' },
        h('strong', { text: e.customerName || '(ohne Name)' }),
        e.customerId && h('span', { class: 'tag', text: e.customerId })),
      e.serial && h('div', { class: 'muted small', text: 'SN ' + e.serial }),
      h('div', { class: 'chips' },
        e.kind && h('span', { class: 'chip kind k-' + e.kind, text: kindLabel(e.kind) }),
        h('span', { class: 'chip' }, 'Fahrt ', h('b', { text: fmtDur(e.driveMin) })),
        h('span', { class: 'chip' }, 'Arbeit ', h('b', { text: fmtDur(e.workMin) })),
        filled > 0 && h('span', { class: 'chip' }, 'Messwerte ', h('b', { text: String(filled) })),
        isSpesen(totals.get(e.date) || 0) && h('span', { class: 'chip warn', text: 'Spesen' })));
  }

  const pad2 = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const fmtDate = (iso) => { const p = String(iso || '').split('-'); return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : (iso || ''); };
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  function quickRange(kind) {
    const now = new Date();
    if (kind === 'week') {
      const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
      return { from: isoDate(mon), to: isoDate(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6)) };
    }
    if (kind === 'month') {
      return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
    }
    if (kind === 'last') {
      return { from: isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: isoDate(new Date(now.getFullYear(), now.getMonth(), 0)) };
    }
    return { from: '', to: '' };
  }

  function renderList() {
    const bodyEl = h('div');
    const sumEl = h('div', { class: 'summary' });
    const chipsEl = h('div', { class: 'qchips' });
    const input = h('input', {
      type: 'search', class: 'search', placeholder: 'Suchen: Kunde, ID, Seriennummer, Art …', value: search,
      autocomplete: 'off', oninput: (e) => { search = e.target.value; fill(); },
    });
    const from = h('input', { type: 'date', value: filter.from, 'aria-label': 'Von' });
    const to = h('input', { type: 'date', value: filter.to, 'aria-label': 'Bis' });
    const setRange = (r) => { filter = { from: r.from, to: r.to }; from.value = filter.from; to.value = filter.to; fill(); };
    from.addEventListener('change', () => { filter.from = from.value; fill(); });
    to.addEventListener('change', () => { filter.to = to.value; fill(); });

    function fill() {
      const totals = dayTotals();
      const q = search.trim().toLowerCase();
      const list = sortedEntries().filter((e) =>
        (!filter.from || (e.date || '') >= filter.from) && (!filter.to || (e.date || '') <= filter.to) &&
        (!q || [e.customerName, e.customerId, e.serial, e.note, kindLabel(e.kind)].some((x) => String(x || '').toLowerCase().includes(q))));
      const drive = list.reduce((s, e) => s + (e.driveMin || 0), 0);
      const work = list.reduce((s, e) => s + (e.workMin || 0), 0);
      const ranged = filter.from || filter.to;
      sumEl.replaceChildren(
        ranged && h('span', { class: 'rangetag', text: `${filter.from ? fmtDate(filter.from) : 'Anfang'} – ${filter.to ? fmtDate(filter.to) : 'heute und später'}` }),
        h('span', { text: `${list.length} Einträge` }), '·',
        h('span', { text: `Fahrt ${fmtDur(drive)} h` }), '·',
        h('span', { text: `Arbeit ${fmtDur(work)} h` }));
      chipsEl.replaceChildren(...[['', 'Alle'], ['week', 'Woche'], ['month', 'Monat'], ['last', 'Vormonat']].map(([k, label]) => {
        const r = quickRange(k);
        const on = r.from === filter.from && r.to === filter.to;
        return h('button', { class: 'qchip', type: 'button', 'aria-pressed': on ? 'true' : 'false', text: label, onclick: () => setRange(r) });
      }));
      bodyEl.replaceChildren();
      if (!list.length) {
        bodyEl.append(h('div', { class: 'empty', text: db.entries.length ? 'Keine Treffer.' : 'Noch keine Einträge. Tippe unten auf „Neu“.' }));
        return;
      }
      let day = null;
      for (const e of list) {
        if (e.date !== day) { day = e.date; bodyEl.append(h('div', { class: 'day', text: fmtDay(day) })); }
        bodyEl.append(entryCard(e, 'list', totals));
      }
    }

    root.append(
      appHeader(lockBtn()),
      h('main', { class: 'wrap' }, backupBanner(), input,
        h('div', { class: 'datefilter' },
          h('label', {}, h('span', { text: 'Von' }), from),
          h('label', {}, h('span', { text: 'Bis' }), to)),
        chipsEl, sumEl, bodyEl),
      h('button', {
        class: 'fab', type: 'button', 'aria-label': 'Neuer Eintrag',
        onclick: () => { editing = { entry: newEntry(), isNew: true, back: 'list' }; go('edit'); },
      }, icon('plus'), 'Neu'),
      tabbar());
    fill();
  }

  /* ---- Kunden ---- */
  // Kunden entstehen aus den Einträgen. Zusammengehörig sind gleiche Kunden-IDs; Einträge ohne ID
  // werden über den Namen einem Kunden mit ID zugeordnet, falls es den Namen dort gibt.
  function customerGroups() {
    const nameToId = new Map();
    const entries = sortedEntries(); // neueste zuerst
    for (const e of entries) {
      const n = (e.customerName || '').trim().toLowerCase();
      if (n && e.customerId && !nameToId.has(n)) nameToId.set(n, e.customerId);
    }
    const groups = new Map();
    for (const e of entries) {
      const n = (e.customerName || '').trim().toLowerCase();
      const id = e.customerId || nameToId.get(n) || '';
      const key = id ? 'id:' + id.toLowerCase() : 'n:' + n;
      let g = groups.get(key);
      if (!g) { g = { key, name: e.customerName || '(ohne Name)', id, entries: [], drive: 0, work: 0 }; groups.set(key, g); }
      g.entries.push(e);
      g.drive += e.driveMin || 0; g.work += e.workMin || 0;
    }
    for (const g of groups.values()) g.last = g.entries[0].date; // Einträge sind nach Datum absteigend
    return [...groups.values()];
  }

  function renderCustomers() {
    const bodyEl = h('div');
    const input = h('input', {
      type: 'search', class: 'search', placeholder: 'Kunde oder Kunden-ID suchen …', value: search,
      autocomplete: 'off', oninput: (e) => { search = e.target.value; fill(); },
    });
    function fill() {
      const q = search.trim().toLowerCase();
      const list = customerGroups()
        .filter((g) => !q || g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));
      bodyEl.replaceChildren();
      if (!list.length) {
        bodyEl.append(h('div', { class: 'empty', text: db.entries.length ? 'Keine Treffer.' : 'Noch keine Kunden. Sie entstehen automatisch aus deinen Einträgen.' }));
        return;
      }
      for (const g of list) {
        bodyEl.append(h('button', { class: 'card', type: 'button', onclick: () => { selCustomer = g.key; go('customer'); } },
          h('div', { class: 'card-top' },
            h('strong', { text: g.name }),
            g.id && h('span', { class: 'tag', text: g.id })),
          h('div', { class: 'chips' },
            h('span', { class: 'chip' }, h('b', { text: String(g.entries.length) }), g.entries.length === 1 ? ' Einsatz' : ' Einsätze'),
            h('span', { class: 'chip' }, 'zuletzt ', h('b', { text: fmtDate(g.last) })),
            h('span', { class: 'chip' }, 'Fahrt ', h('b', { text: fmtDur(g.drive) })),
            h('span', { class: 'chip' }, 'Arbeit ', h('b', { text: fmtDur(g.work) })))));
      }
    }
    root.append(
      header('Kunden', null, lockBtn()),
      h('main', { class: 'wrap' }, input, bodyEl),
      tabbar());
    fill();
  }

  const numVal = (s) => {
    s = String(s ?? '').trim();
    return /^-?\d+([.,]\d+)?$/.test(s) ? parseFloat(s.replace(',', '.')) : null;
  };

  // Kleiner Verlauf als Linie. Es werden nur Zahlen in den SVG-Text eingesetzt.
  function sparkline(points) {
    const W = 300, H = 90, P = 10;
    const ys = points.map((p) => p.y);
    const min = Math.min(...ys), max = Math.max(...ys), span = max - min || 1;
    const X = (i) => (points.length === 1 ? W / 2 : P + (i * (W - 2 * P)) / (points.length - 1));
    const Y = (v) => H - P - ((v - min) / span) * (H - 2 * P);
    const line = points.length > 1
      ? `<polyline points="${points.map((p, i) => `${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>` : '';
    const dots = points.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3.5" fill="currentColor"/>`).join('');
    const wrapEl = h('div', { class: 'spark' });
    wrapEl.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlauf des Messwerts">${line}${dots}</svg>`;
    return wrapEl;
  }

  function renderCustomer() {
    const g = customerGroups().find((x) => x.key === selCustomer);
    if (!g) { selCustomer = null; view = 'customers'; renderCustomers(); return; }
    const totals = dayTotals();
    const fields = meta.settings.fields;
    // nur Messwerte anbieten, zu denen dieser Kunde Einträge hat
    const usable = fields.map((f, i) => ({ f, i, n: g.entries.filter((e) => String((e.values || [])[i] ?? '').trim() !== '').length })).filter((x) => x.n > 0);
    const histEl = h('div');
    function drawHist(idx) {
      histEl.replaceChildren();
      const rows = g.entries.filter((e) => String((e.values || [])[idx] ?? '').trim() !== '').slice().reverse(); // älteste zuerst
      const f = fields[idx];
      const unit = f.unit ? ' ' + f.unit : '';
      const nums = rows.map((e) => ({ x: e.date, y: numVal(e.values[idx]) })).filter((p) => p.y !== null);
      if (nums.length >= 1) histEl.append(sparkline(nums));
      if (nums.length >= 2) {
        const ys = nums.map((p) => p.y);
        histEl.append(h('div', { class: 'muted small', text: `min ${Math.min(...ys)}${unit} · max ${Math.max(...ys)}${unit} · ${nums.length} Werte` }));
      }
      histEl.append(h('div', { class: 'hist' }, rows.slice().reverse().map((e) => h('div', { class: 'histrow' },
        h('span', { text: fmtDate(e.date) }), h('b', { text: String(e.values[idx]).trim() + unit })))));
    }
    const sel = usable.length ? h('select', {
      'aria-label': 'Messwert wählen',
      onchange: (e) => drawHist(Number(e.target.value)),
    }, usable.map((x) => h('option', { value: String(x.i), text: `${x.f.name || 'Messwert ' + (x.i + 1)} (${x.n})` }))) : null;

    root.append(
      header(g.name, h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Zurück', onclick: () => { selCustomer = null; go('customers'); } }, icon('back')), lockBtn()),
      h('main', { class: 'wrap' },
        h('div', { class: 'sect' },
          h('div', { class: 'kv' }, h('span', { text: 'Kunden-ID' }), h('b', { text: g.id || '–' })),
          h('div', { class: 'kv' }, h('span', { text: 'Einsätze' }), h('b', { text: String(g.entries.length) })),
          h('div', { class: 'kv' }, h('span', { text: 'Letzter Besuch' }), h('b', { text: fmtDate(g.last) })),
          h('div', { class: 'kv' }, h('span', { text: 'Fahrzeit gesamt' }), h('b', { text: fmtDur(g.drive) + ' h' })),
          h('div', { class: 'kv' }, h('span', { text: 'Arbeitszeit gesamt' }), h('b', { text: fmtDur(g.work) + ' h' }))),
        h('button', {
          class: 'btn', type: 'button', style: 'margin-bottom:18px', text: 'Neuer Eintrag für diesen Kunden',
          onclick: () => {
            const e = newEntry();
            e.customerName = g.entries[0].customerName || ''; e.customerId = g.id;
            editing = { entry: e, isNew: true, back: 'customer' }; go('edit');
          },
        }),
        usable.length ? h('div', { class: 'sect' }, h('h2', { text: 'Verlauf eines Messwerts' }), sel, histEl) : null,
        h('div', { class: 'day', text: 'Alle Einträge' }),
        g.entries.map((e) => entryCard(e, 'customer', totals))),
      tabbar());
    if (usable.length) drawHist(usable[0].i);
  }

  /* ---- Kalender ---- */
  const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  function renderCalendar() {
    const totals = dayTotals();
    const statEl = h('div', { class: 'calstat' });
    const gridEl = h('div', { class: 'calgrid' });
    const panelEl = h('div');
    const titleEl = h('div', { class: 'calmonth' });

    function paint() {
      const { y, m } = cal;
      titleEl.textContent = `${MONTHS[m]} ${y}`;
      const offset = (new Date(y, m, 1).getDay() + 6) % 7;
      const days = new Date(y, m + 1, 0).getDate();
      let spDays = 0; let count = 0; let drive = 0; let work = 0;
      const prefix = `${y}-${pad2(m + 1)}-`;
      const kindsOfDay = new Map(); // Datum -> Menge der Einsatzarten
      for (const e of db.entries) {
        if (!(e.date || '').startsWith(prefix)) continue;
        count++; drive += e.driveMin || 0; work += e.workMin || 0;
        if (KINDS.some((k) => k[0] === e.kind)) {
          if (!kindsOfDay.has(e.date)) kindsOfDay.set(e.date, new Set());
          kindsOfDay.get(e.date).add(e.kind);
        }
      }
      gridEl.replaceChildren(...WEEKDAYS.map((d) => h('div', { class: 'calwd', text: d })));
      for (let i = 0; i < offset; i++) gridEl.append(h('div'));
      for (let d = 1; d <= days; d++) {
        const iso = prefix + pad2(d);
        const tot = totals.get(iso) || 0;
        const sp = isSpesen(tot);
        if (sp) spDays++;
        // ein Punkt je vorkommender Einsatzart (höchstens drei), in fester Reihenfolge
        const dayKinds = KINDS.filter((k) => (kindsOfDay.get(iso) || new Set()).has(k[0]));
        gridEl.append(h('button', {
          class: 'calday' + (tot > 0 ? ' has' : '') + (sp ? ' sp' : '') + (iso === todayStr() ? ' today' : '') + (iso === calDay ? ' sel' : ''),
          type: 'button', 'aria-pressed': iso === calDay ? 'true' : 'false',
          'aria-label': `${fmtDay(iso)}${tot > 0 ? ', ' + fmtDur(tot) + ' Stunden' : ''}${dayKinds.length ? ', ' + dayKinds.map((k) => k[1]).join(', ') : ''}${sp ? ', Spesen' : ''}`,
          onclick: () => { calDay = iso; paint(); },
        }, dayKinds.length > 0 && h('span', { class: 'caldots', 'aria-hidden': 'true' }, dayKinds.map((k) => h('span', { class: 'caldot k-' + k[0] }))),
        h('span', { class: 'dn', text: String(d) }), tot > 0 && h('span', { class: 'dt', text: fmtDur(tot) })));
      }
      statEl.replaceChildren(
        spesenLimit() > 0
          ? h('div', { class: 'spesenbox' }, h('b', { text: String(spDays) }), spDays === 1 ? ' Spesentag' : ' Spesentage',
            h('span', { class: 'muted small', text: ` (mehr als ${String(spesenLimit() / 60).replace('.', ',')} Std. pro Tag)` }))
          : h('div', { class: 'muted small', text: 'Spesen-Hinweis ist in den Einstellungen ausgeschaltet.' }),
        h('div', { class: 'muted small', text: `${count} Einträge · Fahrt ${fmtDur(drive)} h · Arbeit ${fmtDur(work)} h` }));
      // Tagesansicht
      panelEl.replaceChildren();
      if (!calDay) {
        panelEl.append(h('div', { class: 'empty', style: 'padding:24px 12px', text: 'Tippe auf einen Tag, um die Einträge zu sehen.' }));
        return;
      }
      const dayEntries = sortedEntries().filter((e) => e.date === calDay).reverse();
      const tot = totals.get(calDay) || 0;
      panelEl.append(
        h('div', { class: 'day', text: fmtDay(calDay) }),
        h('div', { class: 'daysum' },
          h('span', { text: tot > 0 ? `Summe ${fmtDur(tot)} h` : 'Keine Einträge' }),
          isSpesen(tot) && h('span', { class: 'chip warn', text: 'Spesen fällig' })),
        ...dayEntries.map((e) => entryCard(e, 'calendar', totals)),
        h('button', {
          class: 'btn sec', type: 'button', text: 'Neuer Eintrag an diesem Tag',
          onclick: () => { const e = newEntry(); e.date = calDay; editing = { entry: e, isNew: true, back: 'calendar' }; go('edit'); },
        }));
    }

    const shift = (delta) => {
      const d = new Date(cal.y, cal.m + delta, 1);
      cal = { y: d.getFullYear(), m: d.getMonth() };
      paint();
    };
    root.append(
      header('Kalender', null, lockBtn()),
      h('main', { class: 'wrap' },
        h('div', { class: 'calnav' },
          h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Voriger Monat', onclick: () => shift(-1) }, icon('back')),
          titleEl,
          h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Nächster Monat', onclick: () => shift(1) }, icon('next'))),
        statEl, gridEl,
        h('div', { class: 'callegend small' }, KINDS.map((k) => h('span', {}, h('i', { class: 'caldot k-' + k[0], 'aria-hidden': 'true' }), ' ' + k[1]))),
        h('div', { class: 'muted small', style: 'margin:8px 2px 0', text: 'Violett hinterlegt: Tage, an denen Fahrzeit plus Arbeitszeit über der Spesen-Grenze liegt. Die Grenze stellst du in den Einstellungen ein. Die Punkte oben rechts zeigen die Einsatzarten des Tages.' }),
        panelEl),
      tabbar());
    paint();
  }

  function durationField(label, minutes, onInput) {
    const hh = h('input', { type: 'number', inputmode: 'numeric', min: '0', placeholder: '0', value: minutes ? Math.floor(minutes / 60) : '' });
    const mm = h('input', { type: 'number', inputmode: 'numeric', min: '0', placeholder: '0', value: minutes ? minutes % 60 : '' });
    if (onInput) { hh.addEventListener('input', onInput); mm.addEventListener('input', onInput); }
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

  const MAX_FIELDS = 50;
  // leere Werte am Ende weglassen, damit "bis zum letzten ausgefüllten" stimmt
  function trimValues(v) {
    const out = v.slice();
    while (out.length && out[out.length - 1] === '') out.pop();
    return out;
  }
  function newFieldDlg(n) {
    return modal((box, close) => {
      const nm = h('input', { type: 'text', value: 'Messwert ' + n, maxlength: '40', 'aria-label': 'Name', autocapitalize: 'sentences' });
      const un = h('input', { type: 'text', value: '', maxlength: '12', 'aria-label': 'Einheit', placeholder: 'z. B. bar' });
      const ok = () => close({ name: nm.value.trim() || 'Messwert ' + n, unit: un.value.trim() });
      const onEnter = (e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); } };
      nm.addEventListener('keydown', onEnter); un.addEventListener('keydown', onEnter);
      box.append(
        h('h3', { text: 'Neues Messfeld' }),
        h('p', { class: 'muted small', text: 'Das Feld kommt in die Liste der Messfelder (Einstellungen) und steht danach in jedem Eintrag zur Verfügung.' }),
        h('label', { class: 'f' }, h('span', { text: 'Name' }), nm),
        h('label', { class: 'f' }, h('span', { text: 'Einheit (optional)' }), un),
        h('div', { class: 'stack' },
          h('button', { class: 'btn', type: 'button', onclick: ok, text: 'Anlegen' }),
          h('button', { class: 'btn link', type: 'button', onclick: () => close(null), text: 'Abbrechen' })));
      setTimeout(() => { nm.focus(); nm.select(); }, 50);
    });
  }

  function renderEdit() {
    const { entry, isNew } = editing;
    const back = editing.back || 'list';
    const fields = meta.settings.fields;
    const names = [...new Set(db.entries.map((e) => e.customerName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
    const dl = h('datalist', { id: 'customers' }, names.map((n) => h('option', { value: n })));

    const date = textField('Datum', { type: 'date', value: entry.date });
    const name = textField('Kundenname', { value: entry.customerName, list: 'customers', autocapitalize: 'words', placeholder: 'z. B. Müller GmbH' });
    const cid = textField('Kunden-ID', { value: entry.customerId, autocapitalize: 'characters' });
    const serial = textField('Seriennummer Gerät', { value: entry.serial, autocapitalize: 'characters' });
    // Art des Einsatzes: Pflicht bei neuen Einträgen und bei Einträgen, die sie schon haben.
    // Ältere Einträge ohne Angabe bleiben gültig und lassen sich beim Bearbeiten ergänzen.
    const kindRequired = isNew || !!entry.kind;
    const kindSel = h('select', { 'aria-label': 'Art des Einsatzes' },
      h('option', { value: '', text: kindRequired ? 'Bitte wählen …' : '– nicht angegeben –' }),
      KINDS.map(([v, t]) => h('option', { value: v, text: t, selected: entry.kind === v })));
    const kindField = h('label', { class: 'f' }, h('span', { text: 'Art des Einsatzes' }), kindSel);
    const dayHint = h('div', { class: 'dayhint' });
    const others = new Map(); // Summe der anderen Einträge pro Datum (ohne diesen Eintrag)
    for (const e of db.entries) {
      if (e.id === entry.id) continue;
      others.set(e.date, (others.get(e.date) || 0) + (e.driveMin || 0) + (e.workMin || 0));
    }
    function updateDayHint() {
      driveSumVal.textContent = fmtDur(driveNow()) + ' h';
      const total = (others.get(date.input.value) || 0) + driveNow() + work.get();
      dayHint.replaceChildren();
      dayHint.classList.toggle('warn', isSpesen(total));
      if (!total) return;
      dayHint.append(isSpesen(total)
        ? h('span', { text: `Spesen fällig: Tagessumme ${fmtDur(total)} h (Fahrt + Arbeit aller Einträge dieses Tages)` })
        : h('span', { text: `Tagessumme ${fmtDur(total)} h (Fahrt + Arbeit aller Einträge dieses Tages)` }));
    }
    // Fahrzeit besteht aus Anfahrt und Abfahrt. Ältere Einträge haben nur eine Gesamt-Fahrzeit; sie bleibt
    // bestehen, solange Anfahrt und Abfahrt leer bleiben.
    const legacyDrive = entry.driveToMin === undefined && entry.driveBackMin === undefined && (entry.driveMin || 0) > 0;
    const driveTo = durationField('Anfahrt', entry.driveToMin || 0, () => updateDayHint());
    const driveBack = durationField('Abfahrt', entry.driveBackMin || 0, () => updateDayHint());
    const driveNow = () => { const t = driveTo.get() + driveBack.get(); return legacyDrive && t === 0 ? (entry.driveMin || 0) : t; };
    const driveSumVal = h('div', { class: 'sumval' });
    const legacyBox = legacyDrive ? h('div', { class: 'dayhint', style: 'margin:0 0 10px', text: `Bisher gespeicherte Fahrzeit: ${fmtDur(entry.driveMin)} h gesamt. Trage Anfahrt und Abfahrt ein, um sie aufzuteilen. Lässt du beide leer, bleibt der Gesamtwert bestehen.` }) : null;
    const work = durationField('Arbeitszeit', entry.workMin, () => updateDayHint());
    const note = h('textarea', { placeholder: 'Optional', value: entry.note || '' });

    // Vorlagentext: Wählt man die Art des Einsatzes, erscheint der passende Text in der Notiz, solange
    // die Notiz leer oder noch der unveränderte Vorlagentext ist. Eigener Text wird nie überschrieben.
    let lastKind = entry.kind || '';
    let autoNote = null;
    const tplOf = (k) => String(((meta.settings.templates || {})[k]) || '').trim();
    kindSel.addEventListener('change', () => {
      const k = kindSel.value;
      const cur = note.value.trim();
      const untouched = !cur || (lastKind && cur === tplOf(lastKind));
      lastKind = k;
      if (!untouched) return;
      const tpl = tplOf(k);
      note.value = tpl ? tpl + '\n\n' : '';
      autoNote = tpl ? note.value : null;
    });
    note.addEventListener('input', () => { if (note.value !== autoNote) autoNote = null; });
    // Beim Antippen springt der Cursor in die leere Zeile unter dem Vorlagentext
    note.addEventListener('focus', () => {
      if (autoNote && note.value === autoNote) setTimeout(() => { const L = note.value.length; note.setSelectionRange(L, L); }, 0);
    });

    date.input.addEventListener('change', updateDayHint);
    date.input.addEventListener('input', updateDayHint);

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

    // Messwerte schrittweise: neuer Eintrag mit einem Feld, beim Bearbeiten alle bis zum
    // letzten ausgefüllten. "Messwert hinzufügen" zeigt das nächste Feld aus den Einstellungen,
    // sind alle gezeigt, wird ein neues Messfeld angelegt.
    const measBox = h('div', { class: 'meas' });
    const measInputs = [];
    function addMeasInput(focus) {
      const i = measInputs.length;
      const f = fields[i];
      const inp = h('input', {
        type: 'text', inputmode: 'decimal', autocomplete: 'off', enterkeyhint: 'next',
        value: (entry.values || [])[i] ?? '',
      });
      const el = h('label', { class: 'f' }, h('span', {}, f.name || 'Messwert ' + (i + 1), f.unit && h('span', { class: 'unit', text: ' [' + f.unit + ']' })), inp);
      measInputs.push({ inp, el });
      measBox.append(el);
      if (focus) inp.focus();
    }
    const addMeasBtn = h('button', { class: 'btn sec', type: 'button' });
    function updateAddBtn() {
      if (measInputs.length < fields.length) {
        addMeasBtn.disabled = false;
        addMeasBtn.textContent = '+ Messwert hinzufügen (' + (fields[measInputs.length].name || 'Messwert ' + (measInputs.length + 1)) + ')';
      } else if (fields.length < MAX_FIELDS) {
        addMeasBtn.disabled = false;
        addMeasBtn.textContent = '+ Neues Messfeld anlegen';
      } else {
        addMeasBtn.disabled = true;
        addMeasBtn.textContent = `Höchstens ${MAX_FIELDS} Messwerte`;
      }
    }
    addMeasBtn.addEventListener('click', async () => {
      if (measInputs.length >= fields.length) {
        const nf = await newFieldDlg(fields.length + 1);
        if (!nf) { addMeasBtn.focus(); return; }
        if (!meta || view !== 'edit') return;
        fields.push(nf); persistMeta();
        toast('Messfeld angelegt. Es gilt ab jetzt für alle Einträge.');
      }
      addMeasInput(true);
      updateAddBtn();
    });
    // Neuer Eintrag: ein Feld. Bearbeiten oder wiederhergestellter Entwurf: alle bis zum letzten ausgefüllten.
    const showMeas = Math.max(1, lastFilled(entry) + 1);
    for (let i = 0; i < Math.min(showMeas, fields.length); i++) addMeasInput(false);
    updateAddBtn();

    const err = h('div', { class: 'err' });
    updateDayHint();

    // Aktueller Stand des Formulars als Eintrag (ohne Prüfung). Grundlage für Speichern, Entwurf und
    // die Frage "Gibt es ungespeicherte Änderungen?".
    function collect() {
      const to = driveTo.get(); const bk = driveBack.get();
      const driveOut = legacyDrive && to + bk === 0 ? {} : { driveToMin: to, driveBackMin: bk, driveMin: to + bk };
      return Object.assign({}, entry, {
        date: date.input.value, customerName: name.input.value.trim(), customerId: cid.input.value.trim(),
        serial: serial.input.value.trim(), kind: kindSel.value, workMin: work.get(),
        values: trimValues(measInputs.map((m) => m.inp.value.trim())), note: note.value.trim(),
      }, driveOut);
    }
    const SIG_KEYS = ['date', 'customerName', 'customerId', 'serial', 'kind', 'driveToMin', 'driveBackMin', 'driveMin', 'workMin', 'values', 'note'];
    const sig = (e) => JSON.stringify(SIG_KEYS.map((k) => (e[k] === undefined ? null : e[k])));
    // Vergleichsstand: wie der Eintrag beim Öffnen aussah. Ein wiederhergestellter Entwurf gilt immer als geändert.
    const baseSig = sig(collect());
    const isDirty = () => !!editing.restored || sig(collect()) !== baseSig;
    draftCollect = () => (isDirty() ? collect() : null);

    // Vor dem Verlassen: bei Änderungen nachfragen. Liefert true, wenn es weitergehen darf.
    async function confirmLeave(text) {
      if (!isDirty()) return true;
      const ok = await modal((box, close) => {
        box.append(
          h('h3', { text: 'Änderungen noch nicht gespeichert' }),
          h('p', { text }),
          h('div', { class: 'stack' },
            h('button', { class: 'btn', type: 'button', onclick: () => close(null), text: 'Weiter bearbeiten' }),
            h('button', { class: 'btn danger', type: 'button', onclick: () => close(true), text: 'Verwerfen' })));
      });
      return !!ok && !!db && view === 'edit'; // inzwischen gesperrt: nichts tun
    }
    async function onBack() {
      if (!await confirmLeave('Wirklich zurückgehen? Die Änderungen an diesem Eintrag gehen verloren.')) return;
      clearDraft(); editing = null; go(back);
    }

    async function onSave() {
      if (!name.input.value.trim()) { err.textContent = 'Bitte einen Kundennamen eingeben.'; name.input.focus(); return; }
      if (!date.input.value) { err.textContent = 'Bitte ein Datum wählen.'; return; }
      if (kindRequired && !kindSel.value) { err.textContent = 'Bitte die Art des Einsatzes wählen.'; kindSel.focus(); return; }
      const out = Object.assign(collect(), { updatedAt: Date.now() });
      const before = db.entries.slice();
      const i = db.entries.findIndex((e) => e.id === out.id);
      if (i >= 0) db.entries[i] = out; else db.entries.push(out);
      if (await save(before)) {
        clearDraft();
        if (!db) return; // inzwischen gesperrt: gespeichert ist es, nichts mehr anzeigen
        if (back === 'calendar') { const p = out.date.split('-'); cal = { y: Number(p[0]), m: Number(p[1]) - 1 }; calDay = out.date; }
        // Im Eintrag bleiben: Er gilt jetzt als gespeichert (Vergleichsstand neu), raus geht es mit dem Zurück-Pfeil.
        const y = window.scrollY;
        editing = { entry: out, isNew: false, back };
        render(); window.scrollTo(0, y);
        toast('Gespeichert.');
      }
    }
    async function onDelete() {
      if (!await confirmDlg('Eintrag löschen?', 'Das kann nicht rückgängig gemacht werden.', 'Löschen', true)) return;
      if (!db) return; // inzwischen gesperrt
      const before = db.entries.slice();
      const beforeDel = db.deleted.slice();
      db.entries = db.entries.filter((e) => e.id !== entry.id);
      // merken, damit der Eintrag beim Zusammenführen eines älteren Backups nicht zurückkommt
      db.deleted = db.deleted.filter((t) => t.id !== entry.id).concat({ id: entry.id, at: Math.max(Date.now(), (entry.updatedAt || 0) + 1) });
      if (await save(before)) { clearDraft(); editing = null; go(back); } else db.deleted = beforeDel;
    }
    async function onCopy() {
      if (!await confirmLeave('Die Kopie übernimmt nur Kundenname, Kunden-ID und Seriennummer. Die Änderungen an diesem Eintrag gehen verloren.')) return;
      const c = newEntry();
      Object.assign(c, { customerName: name.input.value.trim(), customerId: cid.input.value.trim(), serial: serial.input.value.trim() });
      clearDraft();
      editing = { entry: c, isNew: true, back };
      go('edit');
      toast('Kopie mit Kundendaten angelegt.');
    }

    const main = h('main', { class: 'wrap' },
      dl,
      h('div', { class: 'sect' }, h('h2', { text: 'Auftrag' }), date.el, name.el, h('div', { class: 'row' }, cid.el, serial.el), kindField),
      h('div', { class: 'sect' }, h('h2', { text: 'Zeiten' }),
        legacyBox,
        h('div', { class: 'row' }, driveTo.el, driveBack.el),
        h('div', { class: 'row' }, work.el, h('div', { class: 'sumbox' }, h('span', { text: 'Fahrzeit gesamt' }), driveSumVal)),
        dayHint),
      h('div', { class: 'sect' }, h('h2', { text: 'Messwerte' }), measBox, addMeasBtn),
      h('div', { class: 'sect' }, h('h2', { text: 'Notiz' }), note),
      err,
      h('div', { class: 'footer-actions' },
        h('button', { class: 'btn', type: 'button', onclick: onSave, text: 'Speichern' })),
      !isNew && h('div', { class: 'row sec-actions' },
        h('button', { class: 'btn sec', type: 'button', onclick: onCopy, text: 'Kopie anlegen' }),
        h('button', { class: 'btn danger', type: 'button', onclick: onDelete, text: 'Löschen' })));
    // Jede Eingabe (auch Diktieren und Auswahl) schreibt den Entwurf kurz danach mit
    main.addEventListener('input', scheduleDraft);
    main.addEventListener('change', scheduleDraft);

    root.append(
      header(isNew ? 'Neuer Eintrag' : 'Eintrag bearbeiten',
        h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Zurück', onclick: onBack }, icon('back')), null),
      main);
  }

  function renderSettings() {
    const s = meta.settings;

    const lockSel = h('select', {
      onchange: (e) => { s.lockMin = Number(e.target.value); persistMeta(); toast('Gespeichert.'); },
    }, [[0, 'Sofort beim Verlassen'], [1, 'Nach 1 Minute'], [2, 'Nach 2 Minuten'], [5, 'Nach 5 Minuten'], [15, 'Nach 15 Minuten']]
      .map(([v, t]) => h('option', { value: String(v), text: t, selected: v === s.lockMin })));

    const fsSel = h('select', {
      'aria-label': 'Schriftgröße',
      onchange: (e) => { s.fontSize = e.target.value === 'big' ? 'big' : 'normal'; persistMeta(); applyFontSize(); toast('Gespeichert.'); },
    }, [['normal', 'Normal'], ['big', 'Groß']]
      .map(([v, tx]) => h('option', { value: v, text: tx, selected: v === s.fontSize })));

    const backupSel = h('select', {
      onchange: (e) => { s.backupDays = Number(e.target.value); s.snoozeUntil = 0; persistMeta(); toast('Gespeichert.'); },
    }, [[0, 'Aus'], [1, 'Täglich'], [3, 'Alle 3 Tage'], [7, 'Wöchentlich'], [14, 'Alle 2 Wochen'], [30, 'Monatlich']]
      .map(([v, t]) => h('option', { value: String(v), text: t, selected: v === s.backupDays })));

    const spesenSel = h('select', {
      onchange: (e) => { s.spesenMin = Number(e.target.value); persistMeta(); toast('Gespeichert.'); },
    }, [[0, 'Aus'], [240, 'mehr als 4 Stunden'], [300, 'mehr als 5 Stunden'], [360, 'mehr als 6 Stunden'], [420, 'mehr als 7 Stunden'],
      [480, 'mehr als 8 Stunden'], [540, 'mehr als 9 Stunden'], [600, 'mehr als 10 Stunden'], [720, 'mehr als 12 Stunden']]
      .map(([v, t]) => h('option', { value: String(v), text: t, selected: v === (Number(s.spesenMin) || 0) })));

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

    const autoRow = meta.pk ? h('label', { class: 'setrow switchrow' },
      h('div', {}, h('div', { text: 'Face ID automatisch starten' }),
        h('div', { class: 'muted small', text: 'Beim Öffnen der App fragt Face ID sofort. Klappt das auf deinem iPhone nicht, einfach ausschalten und den Button auf dem Sperrbildschirm nutzen.' })),
      h('input', {
        type: 'checkbox', class: 'switch', checked: s.autoPasskey !== false, 'aria-label': 'Face ID automatisch starten',
        onchange: (e) => { s.autoPasskey = e.target.checked; persistMeta(); toast('Gespeichert.'); },
      })) : null;

    const companyIn = h('input', {
      type: 'text', value: s.company || '', maxlength: '60', placeholder: 'z. B. Muster GmbH', autocapitalize: 'words',
      autocomplete: 'organization', 'aria-label': 'Firmenname',
      onchange: (e) => { s.company = e.target.value; fixLook(s); e.target.value = s.company; persistMeta(); toast('Gespeichert.'); },
    });
    const tabRow = (key, label) => h('label', { class: 'setrow switchrow' },
      h('div', {}, h('div', { text: 'Reiter „' + label + '“ anzeigen' })),
      h('input', {
        type: 'checkbox', class: 'switch', checked: !s.hiddenTabs.includes(key), 'data-tab': key,
        onchange: (e) => {
          s.hiddenTabs = e.target.checked ? s.hiddenTabs.filter((t) => t !== key) : [...s.hiddenTabs, key];
          // Nur die Reiterleiste neu zeichnen, damit der Schalter (und der VoiceOver-Fokus) erhalten bleibt
          fixLook(s); persistMeta();
          const nav = document.querySelector('nav.tabs'); if (nav) nav.replaceWith(tabbar());
        },
      }));

    const tplArea = (key, label) => h('label', { class: 'f' }, h('span', { text: label }),
      h('textarea', {
        rows: '5', value: (s.templates || {})[key] || '', 'aria-label': 'Vorlagentext ' + label,
        onchange: (e) => { s.templates = Object.assign({}, s.templates, { [key]: e.target.value.trim() }); persistMeta(); toast('Gespeichert.'); },
      }));

    const recoveryRow = (title, info, setBtns) => h('div', { class: 'setrow wide' },
      h('div', {}, h('div', { text: title }), h('div', { class: 'muted small', text: info })),
      h('div', { class: 'btns' }, setBtns));
    const rcRow = recoveryRow('Wiederherstellungscode',
      meta.rc ? 'Eingerichtet. Wird nur beim Erzeugen angezeigt.' : 'Nicht eingerichtet.',
      [
        h('button', {
          class: meta.rc ? 'btn sec' : 'btn', style: 'width:auto', type: 'button', text: meta.rc ? 'Neu erzeugen' : 'Erzeugen',
          onclick: async () => {
            if (meta.rc && !await confirmDlg('Neuen Code erzeugen?', 'Der bisherige Code wird erst ungültig, wenn du den neuen bestätigt hast.', 'Weiter')) return;
            if (!await requireCurrentPassword()) return;
            try { if (await createRecoveryCode()) { toast('Wiederherstellungscode eingerichtet.'); render(); } } catch (e) { toast(e.message || String(e)); }
          },
        }),
        meta.rc && h('button', {
          class: 'btn sec', style: 'width:auto', type: 'button', text: 'Entfernen',
          onclick: async () => {
            if (!await confirmDlg('Code entfernen?', 'Der Wiederherstellungscode funktioniert danach nicht mehr.', 'Entfernen', true)) return;
            meta.rc = null; persistMeta(); render();
          },
        }),
      ]);
    const sqRow = recoveryRow('Sicherheitsfragen',
      meta.sq ? `Eingerichtet (${meta.sq.questions.length} Fragen). Schwächer als der Code.` : 'Nicht eingerichtet.',
      [
        h('button', {
          class: meta.sq ? 'btn sec' : 'btn', style: 'width:auto', type: 'button', text: meta.sq ? 'Ändern' : 'Einrichten',
          onclick: async () => {
            if (!await requireCurrentPassword()) return;
            try { if (await setupQuestions()) { toast('Sicherheitsfragen gespeichert.'); render(); } } catch (e) { toast(e.message || String(e)); }
          },
        }),
        meta.sq && h('button', {
          class: 'btn sec', style: 'width:auto', type: 'button', text: 'Entfernen',
          onclick: async () => {
            if (!await confirmDlg('Sicherheitsfragen entfernen?', 'Die Fragen funktionieren danach nicht mehr zum Zurücksetzen.', 'Entfernen', true)) return;
            meta.sq = null; persistMeta(); render();
          },
        }),
      ]);

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
      header('Einstellungen', null, lockBtn()),
      h('main', { class: 'wrap' },
        h('div', { class: 'sect' }, h('h2', { text: 'Darstellung' }),
          h('label', { class: 'f', style: 'margin:0' }, h('span', { text: 'Schriftgröße' }), fsSel),
          h('p', { class: 'muted small', style: 'margin:8px 0 0', text: 'Groß hilft draußen bei Sonne oder mit Handschuhen. Es gilt für die ganze App.' }),
          h('label', { class: 'f', style: 'margin:16px 0 0' }, h('span', { text: 'Firmenname (optional)' }), companyIn),
          h('p', { class: 'muted small', style: 'margin:8px 0 0', text: 'Steht dann oben statt „Work Companion Fieldbook“ und auf dem Sperrbildschirm. Er wird wie die übrigen Einstellungen unverschlüsselt gespeichert, auch im Backup. Leer lassen für den App-Namen.' }),
          h('div', { style: 'margin-top:12px' }, tabRow('customers', 'Kunden'), tabRow('calendar', 'Kalender')),
          h('p', { class: 'muted small', style: 'margin:8px 0 0', text: 'Ausgeblendete Reiter behalten ihre Daten. „Einträge“ und „Einstellungen“ bleiben immer sichtbar.' })),
        h('div', { class: 'sect' }, h('h2', { text: 'Sicherheit' }),
          h('label', { class: 'f' }, h('span', { text: 'Automatisch sperren' }), lockSel),
          pkRow,
          autoRow,
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
        h('div', { class: 'sect' }, h('h2', { text: 'Wiederherstellung' }),
          h('p', { class: 'muted small', style: 'margin-top:0', text: 'Für den Fall, dass Passwort und Face ID verloren sind. Es gibt keinen Server, der das Passwort zurücksetzen könnte, daher sind das zusätzliche Schlüssel für deine Daten. Beide Wege öffnen auch deine Backups.' }),
          rcRow, sqRow),
        h('div', { class: 'sect' }, h('h2', { text: 'Standardtexte für die Notiz' }),
          h('p', { class: 'muted small', style: 'margin-top:0', text: 'Wählst du im Eintrag die Art des Einsatzes, erscheint der passende Text in der Notiz. Eigener Text wird nie überschrieben. Ein leerer Text fügt nichts ein.' }),
          KINDS.map(([k, label]) => tplArea(k, label)),
          h('button', {
            class: 'btn sec', type: 'button', text: 'Auf Standard zurücksetzen',
            onclick: async () => {
              if (!await confirmDlg('Standardtexte zurücksetzen?', 'Die drei Texte werden durch die mitgelieferten ersetzt.', 'Zurücksetzen')) return;
              s.templates = defaultTemplates(); persistMeta(); render(); toast('Zurückgesetzt.');
            },
          })),
        h('div', { class: 'sect' }, h('h2', { text: 'Spesen' }),
          h('label', { class: 'f' }, h('span', { text: 'Spesen-Hinweis bei Tagessumme' }), spesenSel),
          h('p', { class: 'muted small', style: 'margin:0', text: 'Gerechnet wird pro Tag: Fahrzeit plus Arbeitszeit aller Einträge mit demselben Datum. Liegt die Summe über der Grenze, erscheint „Spesen“ am Eintrag und der Tag ist im Kalender farbig. Die Regeln und Pauschalen bitte mit deiner Abrechnung abgleichen; Pausen und Wartezeiten, die nicht eingetragen sind, fehlen in der Summe.' })),
        h('div', { class: 'sect' }, h('h2', { text: `Messfelder (${s.fields.length})` }),
          h('p', { class: 'muted small', style: 'margin-top:0', text: `Name und Einheit der Messwerte, höchstens ${MAX_FIELDS}. Änderungen gelten sofort für alle Einträge. Ein neuer Eintrag zeigt zuerst nur das erste Feld, weitere kommen mit „Messwert hinzufügen“.` }),
          fieldRows,
          h('div', { class: 'row', style: 'margin-top:8px' },
            h('button', {
              class: 'btn sec', type: 'button', text: '+ Messfeld', disabled: s.fields.length >= MAX_FIELDS,
              onclick: async () => {
                const nf = await newFieldDlg(s.fields.length + 1);
                if (!nf || !meta || s.fields.length >= MAX_FIELDS) return;
                s.fields.push(nf); persistMeta(); render();
                const rows = document.querySelectorAll('.fieldrow input'); if (rows.length >= 2) rows[rows.length - 2].focus();
              },
            }),
            h('button', {
              class: 'btn sec', type: 'button', text: 'Letztes entfernen', disabled: s.fields.length <= 1,
              onclick: async () => {
                const i = s.fields.length - 1;
                if (i < 1 || !db) return;
                const used = db.entries.filter((e) => String((e.values || [])[i] ?? '').trim() !== '').length;
                if (used) { toast(`„${s.fields[i].name}“ ist in ${used} ${used === 1 ? 'Eintrag' : 'Einträgen'} ausgefüllt und kann nicht entfernt werden.`); return; }
                if (!await confirmDlg('Messfeld entfernen?', `„${s.fields[i].name}“ wird aus der Liste entfernt. Es ist in keinem Eintrag ausgefüllt.`, 'Entfernen', true)) return;
                if (!meta || s.fields.length - 1 !== i) return;
                s.fields.pop(); persistMeta(); render();
                const rb = [...document.querySelectorAll('button')].find((b) => b.textContent === '+ Messfeld'); if (rb) rb.focus();
              },
            }))),
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
          h('p', { class: 'muted small', text: 'Achtung: Die CSV-Datei enthält Klartext. Das Backup ist verschlüsselt. In dieser App lässt es sich ohne Passwort hinzufügen; auf einem neuen Gerät brauchst du das Passwort, das beim Erstellen galt, oder (falls eingerichtet) den Wiederherstellungscode bzw. die Antworten auf die Sicherheitsfragen.' })),
        h('div', { class: 'sect' }, h('h2', { text: 'Gefahrenzone' }),
          h('button', {
            class: 'btn danger', type: 'button', text: 'Alle Daten auf diesem Gerät löschen',
            onclick: async () => {
              if (!await confirmDlg('Wirklich alles löschen?', 'Alle Einträge, das Passwort und der Passkey-Bezug werden von diesem Gerät entfernt. Ohne Backup sind die Daten verloren.', 'Alles löschen', true)) return;
              store.del(META_KEY); store.del(DATA_KEY); store.del(DRAFT_KEY);
              meta = null; dataKey = null; db = null; editing = null;
              applyFontSize();
              view = 'setup'; render();
            },
          })),
        h('p', { class: 'muted small', style: 'text-align:center', text: 'Work Companion Fieldbook ' + APP_VERSION + ' · Daten bleiben lokal auf diesem Gerät' })),
      tabbar());
  }

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  render();
})();
