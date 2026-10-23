'use strict';
(() => {
  const C = MPCrypto;
  const META_KEY = 'mp_meta_v1';
  const DATA_KEY = 'mp_data_v1';
  const DRAFT_KEY = 'mp_draft_v1'; // verschlüsselter Entwurf eines noch nicht gespeicherten Eintrags
  const APP_VERSION = '1.7';
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
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    map: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    building: '<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>',
    type: '<svg viewBox="0 0 24 24"><path d="M4 19l5-14 5 14M6 14h6M17 8h4M19 6v4"/></svg>',
    gauge: '<svg viewBox="0 0 24 24"><path d="M12 3v12"/><circle cx="12" cy="18" r="3"/><path d="M8 6h8M9 9h6"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>',
    data: '<svg viewBox="0 0 24 24"><path d="M12 4v10M8 10l4 4 4-4M5 19h14"/></svg>',
    layers: '<svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></svg>',
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
  const KINDS = [['installation', 'Installation'], ['wartung', 'Wartung'], ['reparatur', 'Reparatur'], ['sonstiges', 'Sonstiges']];
  // Eigene Einsatzarten (Einstellungen): IDs beginnen mit "c:"; sie erscheinen grau wie "Sonstiges"
  const isCustomKind = (k) => typeof k === 'string' && k.startsWith('c:');
  const customKind = (k) => (isCustomKind(k) && meta && meta.settings && meta.settings.customKinds.find((x) => x.id === k)) || null;
  const kindClass = (k) => (isCustomKind(k) ? 'sonstiges' : k);
  // Alle Einsatzarten zur Auswahl: die drei festen, die eigenen, zuletzt "Sonstiges"
  const allKinds = () => [...KINDS.slice(0, 3), ...((meta && meta.settings && meta.settings.customKinds) || []).map((c) => [c.id, c.name]), KINDS[3]];
  const kindLabel = (k) => (KINDS.find((x) => x[0] === k) || [])[1] || (customKind(k) || {}).name || '';
  // Bei "Sonstiges" steht der selbst eingetragene Text (z. B. "Inspektion") statt "Sonstiges"; bei einer eigenen Art,
  // die inzwischen gelöscht wurde, der Name vom Tag des Eintrags
  const entryKindLabel = (e) => (e.kind === 'sonstiges' && String(e.kindText || '').trim()) || kindLabel(e.kind) ||
    (isCustomKind(e.kind) && String(e.kindText || '').trim()) || '';
  // Welche Abschnitte ein Eintrag zeigt: Installation ohne Messwerte, Teile nur bei Reparatur, bei "Sonstiges"
  // entscheiden die Schalter im Eintrag. Ausgeblendete Angaben bleiben gespeichert.
  // Welche Abschnitte je Einsatzart erscheinen, stellt man in den Einstellungen ein (bei "Sonstiges" im Eintrag selbst)
  const defaultKindShow = () => ({ installation: { meas: false, parts: false }, wartung: { meas: true, parts: false }, reparatur: { meas: true, parts: true } });
  function sectionsOf(kind, show) {
    let sh;
    if (kind === 'sonstiges') sh = show && typeof show === 'object' ? show : {};
    else if (isCustomKind(kind)) sh = customKind(kind) || (show && typeof show === 'object' ? show : {});
    else if (kind === 'installation' || kind === 'wartung' || kind === 'reparatur') {
      const ks = meta && meta.settings && meta.settings.kindShow;
      sh = (ks && ks[kind]) || defaultKindShow()[kind];
    } else sh = { meas: true, parts: false }; // ältere Einträge ohne Art
    const meas = !!sh.meas;
    return { meas, parts: !!sh.parts, tools: meas };
  }
  const MAX_PARTS = 20;
  const defaultTemplates = () => ({
    installation: 'Das Gerät wurde installiert, angeschlossen und in Betrieb genommen. Der Server wurde eingerichtet, die Verbindung zwischen Server und Gerät funktioniert. Die Funktionsprüfung war in Ordnung.',
    wartung: 'Die Wartung wurde durchgeführt. Das Gerät wurde geprüft und gereinigt. Die Funktionsprüfung war in Ordnung, es wurden keine Mängel festgestellt.',
    reparatur: 'Die Störung wurde behoben. Die Funktionsprüfung nach der Reparatur war in Ordnung.',
    sonstiges: '', // von Haus aus leer, nur für spezielle Fälle
  });

  const defaultSettings = () => ({
    lockMin: 2,
    backupDays: 14, // Backup-Hinweis auf der Startseite ab so vielen Tagen (0 = aus)
    lastBackup: null,
    snoozeUntil: 0,
    spesenMin: 480, // Spesen-Hinweis ab mehr als 8 Stunden Fahr- + Arbeitszeit pro Tag (0 = aus)
    fontSize: 'normal', // 'normal' | 'big'
    autoPasskey: true, // Face ID beim Öffnen automatisch starten (wenn ein Passkey eingerichtet ist)
    company: '', // Firmenname: ersetzt den App-Namen in der Kopfzeile, steht auf dem Sperrbildschirm (unverschlüsselt)
    hiddenTabs: [], // ausgeblendete Reiter: 'customers' und/oder 'calendar'
    templates: defaultTemplates(),
    customKinds: [], // eigene Einsatzarten: { id: 'c:…', name, meas, parts, template }
    kindShow: defaultKindShow(), // je Einsatzart: Messwerte (mit Messgeräten) und ausgetauschte Teile zeigen?
    deviceTypes: [], // Gerätearten: { id, name, fields: [Index der Messfelder], limits: { Index: { min, max } } }
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
  let settingsSub = null; // geöffnetes Untermenü der Einstellungen
  let resume = null; // Stelle vor dem Sperren: dorthin geht es nach dem Entsperren zurück (nur solange die App offen ist)
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
    fixTypes(s);
    const seen = new Set();
    s.customKinds = (Array.isArray(s.customKinds) ? s.customKinds : []).filter((c) => c && typeof c === 'object' && isCustomKind(c.id) && !seen.has(c.id) && seen.add(c.id)).slice(0, 30)
      .map((c) => ({ id: c.id.slice(0, 60), name: (typeof c.name === 'string' ? c.name.trim().slice(0, 40) : '') || 'Eigene Art', meas: c.meas !== false, parts: !!c.parts, template: typeof c.template === 'string' ? c.template.slice(0, 2000) : '' }));
    const ks = s.kindShow && typeof s.kindShow === 'object' ? s.kindShow : {};
    const def = defaultKindShow();
    s.kindShow = {};
    for (const k of Object.keys(def)) {
      const x = ks[k] && typeof ks[k] === 'object' ? ks[k] : def[k];
      s.kindShow[k] = { meas: typeof x.meas === 'boolean' ? x.meas : def[k].meas, parts: typeof x.parts === 'boolean' ? x.parts : def[k].parts };
    }
  }
  // Gerätearten auf gültige Form bringen: nur vorhandene Messfelder, Grenzen nur als Zahlen
  function fixTypes(s) {
    const nf = s.fields.length;
    const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
    s.deviceTypes = (Array.isArray(s.deviceTypes) ? s.deviceTypes : []).filter((t) => t && typeof t === 'object' && typeof t.id === 'string').slice(0, 100)
      .map((t) => {
        const fields = [...new Set((Array.isArray(t.fields) ? t.fields : []).filter((i) => Number.isInteger(i) && i >= 0 && i < nf))].sort((a, b) => a - b);
        const limits = {};
        const L = t.limits && typeof t.limits === 'object' ? t.limits : {};
        for (const i of fields) {
          const x = L[i];
          if (!x || typeof x !== 'object') continue;
          const min = num(x.min); const max = num(x.max);
          if (min !== null || max !== null) limits[i] = { min, max };
        }
        return { id: t.id, name: (typeof t.name === 'string' ? t.name.trim().slice(0, 40) : '') || 'Geräteart', fields, limits };
      });
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
  const str = (v, max) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max);
  const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
  function fixDb(d) {
    if (!Array.isArray(d.entries)) d.entries = [];
    // Gelöschte Einträge: { id, at }. Damit kommen sie beim Zusammenführen eines älteren Backups nicht zurück.
    // Die Liste gilt auch für gelöschte Messgeräte (eigene IDs).
    d.deleted = Array.isArray(d.deleted) ? d.deleted.filter((t) => t && typeof t.id === 'string') : [];
    // Eigene Messgeräte (seit 1.7): { id, name, serial, calUntil, hidden, updatedAt }
    d.instruments = (Array.isArray(d.instruments) ? d.instruments : []).filter((x) => isObj(x) && typeof x.id === 'string')
      .map((x) => ({ id: x.id, name: str(x.name, 60), serial: str(x.serial, 60), calUntil: str(x.calUntil, 10), hidden: !!x.hidden, updatedAt: Number(x.updatedAt) || 0 }));
    // Kontaktdaten der Kunden (seit 1.7): { id, cid, name, address, contacts: [{ phone, person }], email, updatedAt }
    d.customers = (Array.isArray(d.customers) ? d.customers : []).filter((x) => isObj(x) && typeof x.id === 'string')
      .map((x) => ({
        id: x.id, cid: str(x.cid, 60), name: str(x.name, 120), address: str(x.address, 200), email: str(x.email, 120),
        contacts: (Array.isArray(x.contacts) ? x.contacts : []).filter(isObj).slice(0, 10).map((c) => ({ phone: str(c.phone, 40), person: str(c.person, 80) })),
        updatedAt: Number(x.updatedAt) || 0,
      }));
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
    const d = { v: 1, entry: e, isNew: !!editing.isNew, back: editing.back || 'list', open: editing.open || {}, at: Date.now() };
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
    editing = { entry: d.entry, isNew: !!d.isNew || !orig, back: d.back || 'list', open: isObj(d.open) ? d.open : {}, restored: true };
    go('edit');
    toast((note ? note + ' ' : '') + 'Nicht gespeicherte Eingaben wiederhergestellt.');
  }

  function lock() {
    stashDraft(); // offenen Eintrag sichern, bevor alles aus dem Speicher genommen wird
    // Stelle merken, damit das Entsperren dorthin zurückführt (nicht zur Startseite). Vom Eintrag nur die ID.
    if (dataKey && view !== 'lock' && view !== 'setup') {
      resume = {
        view, selCustomer, cal, calDay, settingsSub, search, filter,
        edit: view === 'edit' && editing ? { id: editing.entry.id, isNew: !!editing.isNew, back: editing.back || 'list', open: editing.open || {} } : null,
      };
    }
    draftCollect = null;
    dataKey = null; db = null; editing = null; search = '';
    filter = { from: '', to: '' }; selCustomer = null; calDay = null;
    autoTry = false; // nach dem Sperren (von Hand oder automatisch) fragt Face ID nicht von selbst
    view = 'lock';
    render();
  }
  function go(v) { view = v; render(); window.scrollTo(0, 0); }

  // Nach dem Entsperren: Beim Start der App kommt die Startseite. Wurde die offene App gesperrt (von Hand oder
  // automatisch), geht es an dieselbe Stelle zurück; ein Eintrag mit Änderungen kommt über den Entwurf zurück.
  function afterUnlock(skipDraft) {
    applyFontSize();
    lastActivity = Date.now();
    const now = new Date();
    cal = { y: now.getFullYear(), m: now.getMonth() }; calDay = todayStr();
    search = ''; filter = { from: '', to: '' }; selCustomer = null; settingsSub = null; editing = null;
    view = 'home';
    const r = resume; resume = null;
    if (r) {
      ({ selCustomer, cal, calDay, settingsSub, search, filter } = r);
      view = r.view;
      if (r.view === 'edit') {
        view = r.edit ? r.edit.back : 'list';
        // Kein Entwurf (nichts geändert): den gespeicherten Eintrag wieder öffnen
        const orig = r.edit && !r.edit.isNew && !store.get(DRAFT_KEY) && db.entries.find((e) => e.id === r.edit.id);
        if (orig) { editing = { entry: JSON.parse(JSON.stringify(orig)), isNew: false, back: r.edit.back, open: r.edit.open }; view = 'edit'; }
      }
    }
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
    const list = sortedEntries();
    const vis = new Map(list.map((e) => [e.id, visibleOf(e)]));
    const maxParts = Math.max(0, ...list.map((e) => vis.get(e.id).parts.length));
    const partHead = [];
    for (let i = 1; i <= maxParts; i++) {
      partHead.push(`Teil ${i} defekt Bezeichnung`, `Teil ${i} defekt Seriennummer`, `Teil ${i} neu Bezeichnung`, `Teil ${i} neu Seriennummer`);
    }
    const head = ['Datum', 'Kunde', 'Kunden-ID', 'Adresse', 'Ansprechpartner und Telefon', 'E-Mail', 'Seriennummer', 'Geräteart', 'Art des Einsatzes',
      'Anfahrt (h:mm)', 'Abfahrt (h:mm)', 'Fahrzeit gesamt (h:mm)', 'Arbeitszeit (h:mm)', 'Spesentag']
      .concat(f.map((x) => safeText(x.name + (x.unit ? ` [${x.unit}]` : ''))), ['außerhalb Grenzen'], partHead, ['Messgeräte', 'Notiz']);
    const rows = list.map((e) => {
      const v = vis.get(e.id);
      const c = custRecFor(e.customerName, e.customerId) || { address: '', contacts: [], email: '' };
      const parts = [];
      for (let i = 0; i < maxParts; i++) {
        const p = v.parts[i] || {};
        parts.push(safeText(p.oldName), safeText(p.oldSerial), safeText(p.newName), safeText(p.newSerial));
      }
      return [
        e.date, safeText(e.customerName), safeText(e.customerId), safeText(c.address),
        safeText(c.contacts.filter((k) => k.phone || k.person).map((k) => [k.person, k.phone].filter(Boolean).join(' ')).join(', ')),
        safeText(c.email), safeText(e.serial), safeText(e.deviceTypeName || ''), safeText(entryKindLabel(e)),
        e.driveToMin === undefined ? '' : fmtDur(e.driveToMin), e.driveBackMin === undefined ? '' : fmtDur(e.driveBackMin),
        fmtDur(e.driveMin), fmtDur(e.workMin), isSpesen(totals.get(e.date) || 0) ? 'ja' : '',
        ...f.map((_, i) => safeNum(v.values[i])),
        safeText(outOfRange(e, v.values).map((o) => `${(f[o.i] || {}).name || 'Messwert ' + (o.i + 1)} ${o.text}`).join(', ')),
        ...parts,
        safeText(v.tools.map((t) => t.name + (t.serial ? ` (SN ${t.serial}` + (t.calUntil ? `, kalibriert bis ${fmtDate(t.calUntil)})` : ')') : (t.calUntil ? ` (kalibriert bis ${fmtDate(t.calUntil)})` : ''))).join(', ')),
        safeText(e.note),
      ];
    });
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
      if (view === 'home' || view === 'settings') render();
    }
  }

  // Letztes Backup für die Startseite: wie lange her, und ob es hervorgehoben werden soll
  function backupInfo() {
    const st = meta.settings;
    const last = st.lastBackup || null;
    const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
    const limit = Number(st.backupDays) || 0;
    const due = limit > 0 && (days === null ? db.entries.length > 0 : days >= limit);
    return { last, days, limit, due };
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
      // Messgeräte und Kontaktdaten: je ID gewinnt der neuere Stand; gelöschte Messgeräte kommen nicht zurück
      const beforeInst = db.instruments; const beforeCust = db.customers;
      const dd = fixDb(Object.assign({}, d, { entries: [] }));
      const mergeById = (mine, theirs) => {
        const out = mine.filter((x) => !(del.has(x.id) && del.get(x.id) >= (x.updatedAt || 0))).map((x) => Object.assign({}, x));
        const at = new Map(out.map((x, i) => [x.id, i]));
        for (const x of theirs) {
          if (del.has(x.id) && del.get(x.id) >= (x.updatedAt || 0)) continue;
          const i = at.get(x.id);
          if (i === undefined) { at.set(x.id, out.length); out.push(x); } else if ((x.updatedAt || 0) > (out[i].updatedAt || 0)) out[i] = x;
        }
        return out;
      };
      db.instruments = mergeById(db.instruments, dd.instruments);
      db.customers = mergeById(db.customers, dd.customers);
      db.entries = next;
      db.deleted = [...del].map(([id, at]) => ({ id, at }));
      if (await save(before)) {
        if (ensureFieldsForData(meta.settings, db.entries)) persistMeta();
        const msg = `${added} neu, ${updated} aktualisiert` + (removed ? `, ${removed} gelöscht` : '') + '.';
        toast(msg);
        render();
        return msg;
      } else { db.deleted = beforeDel; db.instruments = beforeInst; db.customers = beforeCust; }
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
      resume = null;
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
    kind: '', kindText: '', show: { meas: false, parts: false },
    driveToMin: 0, driveBackMin: 0, driveMin: 0, workMin: 0, values: [], parts: [], tools: [], note: '',
    createdAt: Date.now(), updatedAt: Date.now(),
  });
  // Teile und Messgeräte eines Eintrags in gültiger Form (auch für ältere Einträge und fremde Backups)
  const partsOf = (e) => (Array.isArray(e && e.parts) ? e.parts : []).filter(isObj).slice(0, MAX_PARTS)
    .map((p) => ({ oldName: str(p.oldName, 80), oldSerial: str(p.oldSerial, 60), newName: str(p.newName, 80), newSerial: str(p.newSerial, 60) }));
  const toolsOf = (e) => (Array.isArray(e && e.tools) ? e.tools : []).filter((t) => isObj(t) && typeof t.id === 'string')
    .map((t) => ({ id: t.id, name: str(t.name, 60), serial: str(t.serial, 60), calUntil: str(t.calUntil, 10) }));
  const partFilled = (p) => !!(p.oldName || p.oldSerial || p.newName || p.newSerial);
  // Messwerte außerhalb der Grenzen, die der Eintrag beim Speichern festgehalten hat
  function outOfRange(e, values) {
    const L = isObj(e.limits) ? e.limits : {};
    const out = [];
    values.forEach((v, i) => {
      const n = numVal(v); const x = L[i];
      if (n === null || !isObj(x)) return;
      const min = typeof x.min === 'number' ? x.min : null; const max = typeof x.max === 'number' ? x.max : null;
      if (min !== null && n < min) out.push({ i, text: `unter Minimum (${String(min).replace('.', ',')})` });
      else if (max !== null && n > max) out.push({ i, text: `über Maximum (${String(max).replace('.', ',')})` });
    });
    return out;
  }
  // Sichtbare Messwerte, Teile und Messgeräte eines Eintrags (ausgeblendete zählen nirgends mit)
  function visibleOf(e) {
    const sec = sectionsOf(e.kind, e.show);
    return {
      values: sec.meas && Array.isArray(e.values) ? e.values : [],
      parts: sec.parts ? partsOf(e).filter(partFilled) : [],
      tools: sec.tools ? toolsOf(e) : [],
    };
  }

  /* ------------------------------------------------------------------ */
  /* Ansichten                                                           */
  /* ------------------------------------------------------------------ */
  function render() {
    // Ausgeblendeter Reiter (z. B. nach dem Einspielen eines Backups): zurück zu den Einträgen
    const tabView = view === 'customer' ? 'customers' : view;
    if ((tabView === 'customers' || tabView === 'calendar') && tabHidden(tabView)) view = 'home';
    root.replaceChildren();
    document.querySelectorAll('.overlay').forEach((o) => o.remove());
    const fn = {
      setup: renderSetup, lock: renderLock, home: renderHome, list: renderList, edit: renderEdit, settings: renderSettings,
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
        db = fixDb({ entries: [] });
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
      onclick: () => { if (v === 'customers') selCustomer = null; if (v === 'settings') settingsSub = null; go(v); },
    }, icon(ic), h('span', { text: label }))));
  }

  const lockBtn = () => iconBtn('lock', 'Sperren', lock);
  const goHome = () => { selCustomer = null; settingsSub = null; go('home'); };
  // Rechts in der Kopfzeile: Startseite und Sperren
  const topRight = (onHome) => [iconBtn('home', 'Startseite', onHome || goHome), lockBtn()];

  // Gesamtzeit (Fahrt + Arbeit) pro Datum über alle Einträge: Grundlage für Spesen und Kalender
  function dayTotals() {
    const m = new Map();
    for (const e of db.entries) m.set(e.date, (m.get(e.date) || 0) + (e.driveMin || 0) + (e.workMin || 0));
    return m;
  }
  const spesenLimit = () => Number(meta.settings.spesenMin) || 0;
  const isSpesen = (min) => spesenLimit() > 0 && min > spesenLimit();

  function entryCard(e, backView, totals) {
    const vis = visibleOf(e);
    const filled = vis.values.filter((v) => v != null && String(v).trim() !== '').length;
    return h('button', {
      class: 'card', type: 'button',
      onclick: () => { editing = { entry: JSON.parse(JSON.stringify(e)), isNew: false, back: backView }; go('edit'); },
    },
      h('div', { class: 'card-top' },
        h('strong', { text: e.customerName || '(ohne Name)' }),
        e.customerId && h('span', { class: 'tag', text: e.customerId })),
      (e.serial || e.deviceTypeName) && h('div', { class: 'muted small', text: [e.deviceTypeName, e.serial && 'SN ' + e.serial].filter(Boolean).join(' · ') }),
      h('div', { class: 'chips' },
        entryKindLabel(e) && h('span', { class: 'chip kind k-' + kindClass(e.kind), text: entryKindLabel(e) }),
        h('span', { class: 'chip' }, 'Fahrt ', h('b', { text: fmtDur(e.driveMin) })),
        h('span', { class: 'chip' }, 'Arbeit ', h('b', { text: fmtDur(e.workMin) })),
        filled > 0 && h('span', { class: 'chip' }, 'Messwerte ', h('b', { text: String(filled) })),
        isSpesen(totals.get(e.date) || 0) && h('span', { class: 'chip warn', text: 'Spesen' })),
      vis.parts.length > 0 && h('div', { class: 'cardline' }, 'Teile: ', vis.parts.map((p) => p.newName || p.oldName || p.newSerial || p.oldSerial).join(', ')),
      vis.tools.length > 0 && h('div', { class: 'cardline' }, icon('gauge'), 'Messgeräte: ' + vis.tools.map((t) => t.name || t.serial).join(', ')));
  }
  // Suchtext eines Eintrags: Kunde, ID, Seriennummern, Art, Notiz, sichtbare Teile
  const entryHay = (e) => [e.customerName, e.customerId, e.serial, e.note, entryKindLabel(e),
    ...visibleOf(e).parts.flatMap((p) => [p.oldName, p.oldSerial, p.newName, p.newSerial])].join('\n').toLowerCase();

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

  /* ---- Startseite ---- */
  const agoText = (days) => (days === 0 ? 'heute' : days === 1 ? 'gestern' : `vor ${days} Tagen`);
  function renderHome() {
    const now = new Date();
    const tile = (v, label, ic, wide) => h('button', {
      class: 'tile' + (wide ? ' wide' : ''), type: 'button',
      onclick: () => { if (v === 'customers') selCustomer = null; if (v === 'settings') settingsSub = null; go(v); },
    }, icon(ic), h('span', { text: label }));
    const b = backupInfo();
    const toBackup = () => { settingsSub = 'daten'; go('settings'); };
    const backupCard = b.due
      ? h('div', { class: 'homecard due', role: 'status' },
        h('div', {},
          h('div', { class: 'hc-title', text: b.last ? `Letztes Backup ${agoText(b.days)}` : 'Noch kein Backup' }),
          h('div', { class: 'hc-sub', text: `Hinweis ab ${b.limit} ${b.limit === 1 ? 'Tag' : 'Tagen'}` })),
        h('button', { class: 'btn', type: 'button', text: 'Zum Backup', onclick: toBackup }))
      : h('button', { class: 'homecard', type: 'button', onclick: toBackup },
        h('div', {},
          h('div', { class: 'hc-label', text: 'Letztes Backup' }),
          h('div', { class: 'hc-title', text: b.last ? `${agoText(b.days)} · ${new Date(b.last).toLocaleDateString('de-DE')}` : 'noch keins' })),
        icon('next'));
    root.append(
      appHeader([lockBtn()]),
      h('main', { class: 'wrap' },
        h('div', { class: 'today' },
          h('div', { class: 'today-label', text: 'Heute' }),
          h('div', { class: 'today-date', text: now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) })),
        h('nav', { class: 'tiles', 'aria-label': 'Bereiche' }, (() => {
          // Ausgeblendete Reiter erscheinen auch hier nicht; bleibt die letzte Kachel allein in der Reihe, wird sie breit
          const all = [['list', 'Einträge', 'list'], ['customers', 'Kunden', 'users'], ['calendar', 'Kalender', 'cal'], ['settings', 'Einstellungen', 'settings']].filter(([v]) => !tabHidden(v));
          return all.map(([v, l, ic], i) => tile(v, l, ic, all.length % 2 === 1 && i === all.length - 1));
        })()),
        backupCard),
      tabbar());
  }

  function renderList() {
    const bodyEl = h('div');
    const sumEl = h('div', { class: 'summary' });
    const chipsEl = h('div', { class: 'qchips' });
    const input = h('input', {
      type: 'search', class: 'search', placeholder: 'Suchen: Kunde, ID, Seriennummer, Teil …', value: search,
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
        (!q || entryHay(e).includes(q)));
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
      header('Einträge', null, topRight()),
      h('main', { class: 'wrap' }, input,
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

  // Kontaktdaten eines Kunden: zuerst über die Kunden-ID, sonst über den Namen (wenn eine Seite keine ID hat)
  function custRecFor(name, cid) {
    if (!db || !db.customers) return null;
    const n = String(name || '').trim().toLowerCase();
    const c = String(cid || '').trim().toLowerCase();
    if (c) { const r = db.customers.find((x) => x.cid && x.cid.toLowerCase() === c); if (r) return r; }
    if (n) { const r = db.customers.find((x) => (!x.cid || !c) && x.name.trim().toLowerCase() === n); if (r) return r; }
    return null;
  }
  const custHasInfo = (r) => !!(r && (r.address || r.email || r.contacts.some((k) => k.phone || k.person)));
  const telHref = (p) => 'tel:' + String(p).replace(/[^\d+]/g, '');
  // Anzeige mit Links: Adresse öffnet die Karten-App, Nummer den Anruf, E-Mail das Mail-Programm
  function contactLinks(r) {
    if (!custHasInfo(r)) return null;
    return h('div', { class: 'contact' },
      r.address && h('a', { class: 'clink', href: 'https://maps.apple.com/?q=' + encodeURIComponent(r.address), target: '_blank', rel: 'noopener', 'aria-label': 'Adresse in Karten öffnen: ' + r.address },
        icon('map'), h('span', { text: r.address })),
      r.contacts.filter((k) => k.phone || k.person).map((k) => k.phone
        ? h('a', { class: 'clink', href: telHref(k.phone), 'aria-label': 'Anrufen: ' + [k.person, k.phone].filter(Boolean).join(', ') },
          icon('phone'), h('span', {}, k.person && h('b', { text: k.person + ' ' }), k.phone))
        : h('div', { class: 'clink' }, icon('phone'), h('span', { text: k.person }))),
      r.email && h('a', { class: 'clink', href: 'mailto:' + encodeURIComponent(r.email).replace(/%40/g, '@'), 'aria-label': 'E-Mail schreiben: ' + r.email },
        icon('mail'), h('span', { text: r.email })));
  }
  // Kontaktdaten bearbeiten (Dialog). Liefert true, wenn gespeichert wurde.
  async function editContact(name, cid) {
    const old = custRecFor(name, cid);
    const r = old ? JSON.parse(JSON.stringify(old)) : { id: uid(), cid: '', name: '', address: '', contacts: [], email: '', updatedAt: 0 };
    if (!r.contacts.length) r.contacts.push({ phone: '', person: '' });
    const res = await modal((box, close) => {
      const addr = h('input', { type: 'text', value: r.address, maxlength: '200', autocomplete: 'off', placeholder: 'Straße, PLZ und Ort', autocapitalize: 'words' });
      const mail = h('input', { type: 'email', value: r.email, maxlength: '120', autocomplete: 'off', inputmode: 'email', placeholder: 'optional' });
      const rows = h('div');
      const rowEls = [];
      const addRow = (k, focus) => {
        const ph = h('input', { type: 'tel', value: k.phone, maxlength: '40', autocomplete: 'off', 'aria-label': 'Telefonnummer ' + (rowEls.length + 1), placeholder: 'Telefonnummer' });
        const pe = h('input', { type: 'text', value: k.person, maxlength: '80', autocomplete: 'off', 'aria-label': 'Ansprechpartner ' + (rowEls.length + 1), placeholder: 'Ansprechpartner', autocapitalize: 'words' });
        rowEls.push({ ph, pe });
        rows.append(h('div', { class: 'contactrow' }, pe, ph));
        if (focus) pe.focus();
        more.disabled = rowEls.length >= 10;
      };
      const more = h('button', { class: 'btn sec', type: 'button', text: '+ Weitere Telefonnummer hinzufügen', onclick: () => addRow({ phone: '', person: '' }, true) });
      r.contacts.forEach((k) => addRow(k, false));
      box.append(
        h('h3', { text: 'Kontaktdaten' }),
        h('p', { class: 'muted small', text: (name || cid || 'Kunde') + '. Gilt für alle Einträge dieses Kunden. Verschlüsselt gespeichert, im CSV-Export aber lesbar.' }),
        h('label', { class: 'f' }, h('span', { text: 'Adresse' }), addr),
        h('div', { class: 'f' }, h('span', { class: 'flabel', text: 'Ansprechpartner und Telefon' }), rows, more),
        h('label', { class: 'f', style: 'margin-top:12px' }, h('span', { text: 'E-Mail (optional)' }), mail),
        h('div', { class: 'stack' },
          h('button', {
            class: 'btn', type: 'button', text: 'Speichern',
            onclick: () => close({
              address: addr.value.replace(/\s+/g, ' ').trim(), email: mail.value.trim(),
              contacts: rowEls.map((x) => ({ phone: x.ph.value.trim(), person: x.pe.value.trim() })).filter((k) => k.phone || k.person),
            }),
          }),
          h('button', { class: 'btn link', type: 'button', onclick: () => close(null), text: 'Abbrechen' })));
    });
    if (!res || !db) return false;
    const before = db.customers;
    const rec = Object.assign(r, res, { cid: String(cid || '').trim(), name: String(name || '').trim(), updatedAt: Date.now() });
    db.customers = db.customers.filter((x) => x.id !== rec.id).concat(fixDb({ customers: [rec] }).customers);
    if (!await save(db.entries.slice())) { db.customers = before; return false; }
    toast('Kontaktdaten gespeichert.');
    return true;
  }

  function renderCustomers() {
    const bodyEl = h('div');
    const input = h('input', {
      type: 'search', class: 'search', placeholder: 'Kunde, ID, Adresse oder Telefon …', value: search,
      autocomplete: 'off', oninput: (e) => { search = e.target.value; fill(); },
    });
    function fill() {
      const q = search.trim().toLowerCase();
      const recOf = (g) => custRecFor(g.name, g.id);
      const hay = (g) => { const r = recOf(g); return [g.name, g.id, r && r.address, r && r.email, ...(r ? r.contacts.flatMap((k) => [k.person, k.phone]) : [])].join('\n').toLowerCase(); };
      const list = customerGroups()
        .filter((g) => !q || hay(g).includes(q))
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
          (() => {
            const r = recOf(g);
            if (!custHasInfo(r)) return null;
            const k = r.contacts.find((x) => x.phone || x.person);
            return h('div', { class: 'cardline' }, r.address ? [icon('map'), r.address] : [icon('phone'), [k && k.person, k && k.phone].filter(Boolean).join(' ') || r.email]);
          })(),
          h('div', { class: 'chips' },
            h('span', { class: 'chip' }, h('b', { text: String(g.entries.length) }), g.entries.length === 1 ? ' Einsatz' : ' Einsätze'),
            h('span', { class: 'chip' }, 'zuletzt ', h('b', { text: fmtDate(g.last) })),
            h('span', { class: 'chip' }, 'Fahrt ', h('b', { text: fmtDur(g.drive) })),
            h('span', { class: 'chip' }, 'Arbeit ', h('b', { text: fmtDur(g.work) })))));
      }
    }
    root.append(
      header('Kunden', null, topRight()),
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
    const rec = custRecFor(g.name, g.id);
    const totals = dayTotals();
    const fields = meta.settings.fields;
    // nur Messwerte anbieten, zu denen dieser Kunde Einträge hat
    // Messwerte aus ausgeblendeten Abschnitten (z. B. Installation) zählen nicht mit
    const valOf = (e, i) => String(visibleOf(e).values[i] ?? '').trim();
    const usable = fields.map((f, i) => ({ f, i, n: g.entries.filter((e) => valOf(e, i) !== '').length })).filter((x) => x.n > 0);
    const histEl = h('div');
    function drawHist(idx) {
      histEl.replaceChildren();
      const rows = g.entries.filter((e) => valOf(e, idx) !== '').slice().reverse(); // älteste zuerst
      const f = fields[idx];
      const unit = f.unit ? ' ' + f.unit : '';
      const nums = rows.map((e) => ({ x: e.date, y: numVal(valOf(e, idx)) })).filter((p) => p.y !== null);
      if (nums.length >= 1) histEl.append(sparkline(nums));
      if (nums.length >= 2) {
        const ys = nums.map((p) => p.y);
        histEl.append(h('div', { class: 'muted small', text: `min ${Math.min(...ys)}${unit} · max ${Math.max(...ys)}${unit} · ${nums.length} Werte` }));
      }
      histEl.append(h('div', { class: 'hist' }, rows.slice().reverse().map((e) => h('div', { class: 'histrow' },
        h('span', { text: fmtDate(e.date) }), h('b', { text: valOf(e, idx) + unit })))));
    }
    const sel = usable.length ? h('select', {
      'aria-label': 'Messwert wählen',
      onchange: (e) => drawHist(Number(e.target.value)),
    }, usable.map((x) => h('option', { value: String(x.i), text: `${x.f.name || 'Messwert ' + (x.i + 1)} (${x.n})` }))) : null;

    root.append(
      header(g.name, h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Zurück', onclick: () => { selCustomer = null; go('customers'); } }, icon('back')), topRight()),
      h('main', { class: 'wrap' },
        h('div', { class: 'sect' }, h('h2', { text: 'Kontakt' }),
          contactLinks(rec) || h('p', { class: 'muted small', style: 'margin:0 0 10px', text: 'Noch keine Adresse oder Telefonnummer hinterlegt.' }),
          h('button', {
            class: 'btn sec', type: 'button', style: 'margin-top:10px', text: custHasInfo(rec) ? 'Kontaktdaten bearbeiten' : 'Kontaktdaten hinzufügen',
            onclick: async () => { if (await editContact(g.name, g.id) && view === 'customer') render(); },
          })),
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
        const kc = kindClass(e.kind);
        if (KINDS.some((k) => k[0] === kc)) {
          if (!kindsOfDay.has(e.date)) kindsOfDay.set(e.date, new Set());
          kindsOfDay.get(e.date).add(kc);
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
      header('Kalender', null, topRight()),
      h('main', { class: 'wrap' },
        h('div', { class: 'calnav' },
          h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Voriger Monat', onclick: () => shift(-1) }, icon('back')),
          titleEl,
          h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Nächster Monat', onclick: () => shift(1) }, icon('next'))),
        statEl, gridEl,
        h('div', { class: 'callegend small' }, KINDS.map((k) => h('span', {}, h('i', { class: 'caldot k-' + k[0], 'aria-hidden': 'true' }),
          ' ' + (k[0] === 'sonstiges' && meta.settings.customKinds.length ? 'Sonstiges und eigene Arten' : k[1])))),
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
    // Aufklappbare Abschnitte: Jeder neue Eintrag beginnt zugeklappt. Der Zustand gehört zum Entwurf,
    // nach dem Sperren sind die Abschnitte so offen wie vorher.
    const open = editing.open = Object.assign({ parts: false, meas: false, tools: false }, isObj(editing.open) ? editing.open : {});
    const fields = meta.settings.fields;
    const names = [...new Set(db.entries.map((e) => e.customerName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
    const dl = h('datalist', { id: 'customers' }, names.map((n) => h('option', { value: n })));
    const kindTexts = [...new Set(db.entries.filter((e) => e.kind === 'sonstiges').map((e) => String(e.kindText || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
    const dlKind = h('datalist', { id: 'kindtexts' }, kindTexts.map((n) => h('option', { value: n })));

    const date = textField('Datum', { type: 'date', value: entry.date });
    const name = textField('Kundenname', { value: entry.customerName, list: 'customers', autocapitalize: 'words', placeholder: 'z. B. Müller GmbH' });
    const cid = textField('Kunden-ID', { value: entry.customerId, autocapitalize: 'characters' });
    const serial = textField('Seriennummer Gerät', { value: entry.serial, autocapitalize: 'characters' });
    // Kontaktdaten des Kunden (aus der Kundenansicht) direkt unter dem Namen
    const contactBox = h('div', { class: 'contactmini' });
    const updContact = () => { contactBox.replaceChildren(); const l = contactLinks(custRecFor(name.input.value, cid.input.value)); if (l) contactBox.append(l); };

    // Art des Einsatzes: Pflicht bei neuen Einträgen und bei Einträgen, die sie schon haben.
    // Ältere Einträge ohne Angabe bleiben gültig und lassen sich beim Bearbeiten ergänzen.
    const kindRequired = isNew || !!entry.kind;
    const kindSel = h('select', { 'aria-label': 'Art des Einsatzes' },
      h('option', { value: '', text: kindRequired ? 'Bitte wählen …' : '– nicht angegeben –' }),
      allKinds().map(([v, t]) => h('option', { value: v, text: t, selected: entry.kind === v })),
      isCustomKind(entry.kind) && !customKind(entry.kind) && h('option', { value: entry.kind, selected: true, text: (entry.kindText || 'Eigene Art') + ' (nicht mehr in der Liste)' }));
    const kindField = h('label', { class: 'f' }, h('span', { text: 'Art des Einsatzes' }), kindSel);

    // "Sonstiges": eigener Text und Schalter, welche Abschnitte dieser Eintrag zeigt
    const kindTextIn = h('input', { type: 'text', value: entry.kindText || '', maxlength: '40', list: 'kindtexts', autocomplete: 'off', autocapitalize: 'sentences', placeholder: 'z. B. Inspektion, Beratung, Umbau' });
    const kindTextHint = h('div', { class: 'fieldhint', text: 'Noch leer. Hier eintragen, was gemacht wurde.' });
    const updKindText = () => { const empty = !kindTextIn.value.trim(); kindTextIn.classList.toggle('empty', empty); kindTextHint.hidden = !empty; };
    kindTextIn.addEventListener('input', updKindText);
    const show0 = isObj(entry.show) ? entry.show : {};
    const sw = (label, on) => {
      const inp = h('input', { type: 'checkbox', class: 'switch', checked: !!on });
      return { inp, el: h('label', { class: 'setrow switchrow' }, h('div', { text: label }), inp) };
    };
    const swMeas = sw('Messwerte und Messgeräte', show0.meas);
    const swParts = sw('Ausgetauschte Teile', show0.parts);
    const sonstBox = h('div', { class: 'sonst' },
      h('label', { class: 'f' }, h('span', { text: 'Was für ein Einsatz? (eigener Text)' }), kindTextIn, kindTextHint),
      h('div', { class: 'muted small', text: 'Was soll dieser Eintrag zeigen?' }),
      swMeas.el, swParts.el);
    const curShow = () => ({ meas: swMeas.inp.checked, parts: swParts.inp.checked });

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
    const tplOf = (k) => String(isCustomKind(k) ? (customKind(k) || {}).template || '' : ((meta.settings.templates || {})[k]) || '').trim();
    kindSel.addEventListener('change', () => {
      const k = kindSel.value;
      const cur = note.value.trim();
      const untouched = !cur || (lastKind && cur === tplOf(lastKind));
      lastKind = k;
      applyKind();
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
      updContact();
    });
    cid.input.addEventListener('change', () => {
      const m = sorted.find((e) => e.customerId && e.customerId === cid.input.value.trim() && e.customerName);
      if (m && !name.input.value.trim()) name.input.value = m.customerName;
      updContact();
    });

    /* ---- Ausgetauschte Teile (Reparatur) ---- */
    const partsBox = h('div', { class: 'parts' });
    const partRows = [];
    const serialHint = () => h('div', { class: 'fieldhint', text: 'Noch leer. Freiwillig, aber für den Nachweis sinnvoll.' });
    function partInput(label, value, max, isSerial) {
      const inp = h('input', { type: 'text', value, maxlength: String(max), autocomplete: 'off', autocapitalize: isSerial ? 'characters' : 'sentences' });
      const hint = isSerial ? serialHint() : null;
      const upd = () => { if (!isSerial) return; const empty = !inp.value.trim(); inp.classList.toggle('empty', empty); hint.hidden = !empty; };
      inp.addEventListener('input', () => { upd(); refreshFolds(); });
      upd();
      return { inp, el: h('label', { class: 'f' }, h('span', { text: label }), inp, hint) };
    }
    function addPart(p, focus) {
      const row = {
        oldName: partInput('Bezeichnung', p.oldName, 80, false), oldSerial: partInput('Seriennummer', p.oldSerial, 60, true),
        newName: partInput('Bezeichnung', p.newName, 80, false), newSerial: partInput('Seriennummer', p.newSerial, 60, true),
      };
      const title = h('div', { class: 'part-title' });
      const rm = h('button', {
        class: 'btn link small-btn', type: 'button', text: 'Entfernen',
        onclick: () => {
          const i = partRows.indexOf(row);
          if (i < 0) return;
          partRows.splice(i, 1); row.el.remove();
          if (!partRows.length) addPart({}, false);
          renumber(); refreshFolds(); scheduleDraft();
        },
      });
      row.el = h('div', { class: 'part' },
        h('div', { class: 'part-head' }, title, rm),
        h('div', { class: 'part-sub', text: 'Defektes Teil' }), row.oldName.el, row.oldSerial.el,
        h('div', { class: 'part-sub', text: 'Neues Teil' }), row.newName.el, row.newSerial.el);
      row.title = title; row.rm = rm;
      partRows.push(row);
      partsBox.append(row.el);
      renumber();
      if (focus) row.oldName.inp.focus();
    }
    function renumber() {
      partRows.forEach((r, i) => { r.title.textContent = 'Teil ' + (i + 1); r.rm.hidden = partRows.length < 2; });
      addPartBtn.disabled = partRows.length >= MAX_PARTS;
    }
    const addPartBtn = h('button', {
      class: 'btn sec', type: 'button', text: '+ Weiteres Teil hinzufügen',
      onclick: () => { if (partRows.length < MAX_PARTS) { addPart({}, true); refreshFolds(); } },
    });
    const curParts = () => partRows.map((r) => ({
      oldName: r.oldName.inp.value.trim(), oldSerial: r.oldSerial.inp.value.trim(),
      newName: r.newName.inp.value.trim(), newSerial: r.newSerial.inp.value.trim(),
    })).filter(partFilled);
    const parts0 = partsOf(entry).filter(partFilled);
    (parts0.length ? parts0 : [{ oldName: '', oldSerial: '', newName: '', newSerial: '' }]).forEach((p) => addPart(p, false));

    /* ---- Geräteart und Messwerte ---- */
    // Mit Geräteart: deren Messfelder. Ohne (ältere Einträge oder noch keine Gerätearten angelegt): schrittweise wie bisher.
    // Ausgefüllte Werte anderer Felder bleiben immer sichtbar. Werte stehen nach Position der Messfelder im Eintrag.
    const types = meta.settings.deviceTypes;
    const typeById = new Map(types.map((t) => [t.id, t]));
    const typeRequired = types.length > 0 && (isNew || !!entry.deviceType);
    const typeSel = h('select', { 'aria-label': 'Geräteart' },
      h('option', { value: '', text: typeRequired ? 'Bitte wählen …' : '– keine –' }),
      types.map((t) => h('option', { value: t.id, text: t.name, selected: entry.deviceType === t.id })),
      entry.deviceType && !typeById.has(entry.deviceType) && h('option', { value: entry.deviceType, selected: true, text: (entry.deviceTypeName || 'Geräteart') + ' (nicht mehr in der Liste)' }));
    const typeField = types.length || entry.deviceType ? h('label', { class: 'f' }, h('span', { text: 'Geräteart' }), typeSel) : null;
    // Grenzen: Ein gespeicherter Eintrag behält die Grenzen vom Tag des Auftrags, solange die Geräteart gleich bleibt
    const limitsNow = () => {
      const v = typeSel.value;
      if (v && v === entry.deviceType && isObj(entry.limits)) return entry.limits;
      const t = typeById.get(v);
      return t ? t.limits : {};
    };
    const vals = Array.isArray(entry.values) ? entry.values.map((x) => String(x ?? '')) : [];
    const measBox = h('div', { class: 'meas' });
    let measInputs = [];
    let shown = [];
    const fmtNum = (n) => String(n).replace('.', ',');
    function limitText(i) {
      const n = numVal(vals[i]);
      const L = limitsNow()[i];
      if (n === null || !L) return null;
      if (L.min != null && n < L.min) return `unter Minimum (${fmtNum(L.min)})`;
      if (L.max != null && n > L.max) return `über Maximum (${fmtNum(L.max)})`;
      return null;
    }
    function addMeasInput(i, focus) {
      const f = fields[i];
      const t = typeById.get(typeSel.value);
      const inp = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', enterkeyhint: 'next', value: vals[i] ?? '' });
      const warn = h('div', { class: 'oor-text', role: 'status' });
      const L = limitsNow()[i];
      const range = L && (L.min != null || L.max != null)
        ? h('div', { class: 'muted small range', text: L.min != null && L.max != null ? `${fmtNum(L.min)} bis ${fmtNum(L.max)}` : L.min != null ? `ab ${fmtNum(L.min)}` : `bis ${fmtNum(L.max)}` }) : null;
      const upd = () => {
        const tx = limitText(i);
        inp.classList.toggle('oor', !!tx); warn.hidden = !tx;
        warn.replaceChildren(); if (tx) warn.append(h('span', { 'aria-hidden': 'true', text: '⚠ ' }), tx);
      };
      inp.addEventListener('input', () => { vals[i] = inp.value; upd(); refreshFolds(); });
      const el = h('label', { class: 'f' },
        h('span', {}, f.name || 'Messwert ' + (i + 1), f.unit && h('span', { class: 'unit', text: ' [' + f.unit + ']' }),
          t && !t.fields.includes(i) && h('span', { class: 'unit', text: ' (nicht in dieser Geräteart)' })),
        inp, range, warn);
      upd();
      measInputs.push({ i, inp, el });
      measBox.append(el);
      if (focus) inp.focus();
    }
    const nextHidden = () => { for (let i = 0; i < fields.length; i++) if (!shown.includes(i)) return i; return -1; };
    const addMeasBtn = h('button', { class: 'btn sec', type: 'button' });
    const measEmpty = h('p', { class: 'muted small', text: 'Diese Geräteart hat keine Messfelder. Weitere Felder kannst du unten hinzufügen.' });
    function updateAddBtn() {
      const nx = nextHidden();
      measEmpty.hidden = shown.length > 0;
      if (nx >= 0) {
        addMeasBtn.disabled = false;
        addMeasBtn.textContent = '+ Messwert hinzufügen (' + (fields[nx].name || 'Messwert ' + (nx + 1)) + ')';
      } else if (fields.length < MAX_FIELDS) {
        addMeasBtn.disabled = false;
        addMeasBtn.textContent = '+ Neues Messfeld anlegen';
      } else {
        addMeasBtn.disabled = true;
        addMeasBtn.textContent = `Höchstens ${MAX_FIELDS} Messwerte`;
      }
    }
    function buildMeas() {
      const t = typeById.get(typeSel.value);
      const filled = [];
      vals.forEach((v, i) => { if (String(v ?? '').trim() !== '') filled.push(i); });
      const base = t ? t.fields : Array.from({ length: Math.max(1, filled.length ? Math.max(...filled) + 1 : 1) }, (_, i) => i);
      shown = [...new Set([...base, ...filled])].filter((i) => i < fields.length).sort((a, b) => a - b);
      measBox.replaceChildren(); measInputs = [];
      shown.forEach((i) => addMeasInput(i, false));
      updateAddBtn();
    }
    addMeasBtn.addEventListener('click', async () => {
      let nx = nextHidden();
      if (nx < 0) {
        const nf = await newFieldDlg(fields.length + 1);
        if (!nf) { addMeasBtn.focus(); return; }
        if (!meta || view !== 'edit') return;
        fields.push(nf); persistMeta();
        toast('Messfeld angelegt. Es gilt ab jetzt für alle Einträge.');
        nx = fields.length - 1;
      }
      shown.push(nx);
      addMeasInput(nx, true);
      updateAddBtn();
    });
    typeSel.addEventListener('change', () => { buildMeas(); refreshFolds(); });
    const curValues = () => trimValues(Array.from({ length: vals.length }, (_, i) => String(vals[i] ?? '').trim()));
    const curLimits = () => {
      const L = limitsNow(); const out = {};
      for (const k of Object.keys(L)) if (L[k] && (L[k].min != null || L[k].max != null)) out[k] = { min: L[k].min ?? null, max: L[k].max ?? null };
      return out;
    };

    /* ---- Verwendete Messgeräte ---- */
    // Der Eintrag merkt sich Bezeichnung, Seriennummer und "Kalibrierung gültig bis" vom Zeitpunkt des Auftrags.
    const snap0 = new Map(toolsOf(entry).map((t) => [t.id, t]));
    const instById = new Map(db.instruments.map((x) => [x.id, x]));
    const toolOpts = [...snap0.values()].map((t) => ({ id: t.id, snap: t }))
      .concat(db.instruments.filter((x) => !x.hidden && !snap0.has(x.id)).map((x) => ({ id: x.id, snap: null })));
    const toolsBox = h('div', { class: 'tools' });
    const toolChecks = [];
    const snapOf = (x) => ({ id: x.id, name: x.name, serial: x.serial, calUntil: x.calUntil });
    for (const o of toolOpts) {
      const inst = instById.get(o.id);
      const shown = o.snap || snapOf(inst);
      const cb = h('input', { type: 'checkbox', class: 'check', checked: !!o.snap });
      const changed = o.snap && inst && (inst.name !== o.snap.name || inst.serial !== o.snap.serial || inst.calUntil !== o.snap.calUntil);
      const info = [shown.serial && 'SN ' + shown.serial, shown.calUntil && 'Kalibrierung gültig bis ' + fmtDate(shown.calUntil)].filter(Boolean).join(' · ');
      toolChecks.push({ cb, o });
      cb.addEventListener('change', () => refreshFolds());
      toolsBox.append(h('label', { class: 'toolrow' }, cb,
        h('div', {}, h('div', { class: 'toolname', text: shown.name || '(ohne Bezeichnung)' }),
          info && h('div', { class: 'muted small', text: info }),
          changed && h('div', { class: 'muted small', text: 'Stand beim Auftrag (das Gerät wurde inzwischen geändert)' }),
          !inst && o.snap && h('div', { class: 'muted small', text: 'Gerät nicht mehr in der Liste' }))));
    }
    // Ein schon gespeichertes Gerät behält seinen Stand vom Auftrag (auch nach Ab- und Anwählen), neu gewählte den heutigen
    const curTools = () => toolChecks.filter((t) => t.cb.checked).map(({ o }) => {
      const inst = instById.get(o.id);
      return o.snap && snap0.has(o.id) ? o.snap : inst ? snapOf(inst) : o.snap;
    }).filter(Boolean);
    const lastToolEntry = sortedEntries().find((e) => e.id !== entry.id && toolsOf(e).length > 0);
    const sameAsLast = lastToolEntry && toolChecks.length ? h('button', {
      class: 'btn sec', type: 'button', text: 'Wie beim letzten Eintrag',
      onclick: () => {
        const ids = new Set(toolsOf(lastToolEntry).map((t) => t.id));
        toolChecks.forEach((t) => { t.cb.checked = ids.has(t.o.id) && (!!t.o.snap || !!instById.get(t.o.id)); });
        refreshFolds(); scheduleDraft();
      },
    }) : null;
    const toolsHint = toolChecks.length
      ? h('p', { class: 'muted small', text: 'Mehrfachauswahl. Speichern geht auch ohne Messgerät.' })
      : h('p', { class: 'muted small', text: 'Noch keine Messgeräte angelegt. Das geht unter Einstellungen > Messgeräte.' });

    /* ---- Aufklappbare Abschnitte ---- */
    const folds = {};
    function fold(key, title, body) {
      const sum = h('div', { class: 'fold-sum' });
      const bodyEl = h('div', { class: 'fold-body', id: 'fold-' + key }, body);
      const btn = h('button', { class: 'fold-head', type: 'button', 'aria-controls': 'fold-' + key },
        h('div', { class: 'fold-text' }, h('div', { class: 'fold-title', text: title }), sum), icon('down'));
      const set = () => { btn.setAttribute('aria-expanded', open[key] ? 'true' : 'false'); bodyEl.hidden = !open[key]; };
      btn.addEventListener('click', () => { open[key] = !open[key]; set(); scheduleDraft(); });
      set();
      const el = h('section', { class: 'sect fold' }, btn, bodyEl);
      folds[key] = { el, sum };
      return el;
    }
    // Kurzinfo im zugeklappten Zustand
    function refreshFolds() {
      const ps = curParts();
      const missing = ps.some((p) => !p.oldSerial || !p.newSerial);
      folds.parts.sum.textContent = ps.length ? `${ps.length} ${ps.length === 1 ? 'Teil' : 'Teile'}${missing ? ' · Seriennummer fehlt noch' : ''}` : 'Noch keine Teile eingetragen';
      folds.parts.sum.classList.toggle('warn-text', ps.length > 0 && missing);
      const filledV = measInputs.map((m) => ({ v: m.inp.value.trim(), f: fields[m.i] })).filter((x) => x.v);
      folds.meas.sum.textContent = filledV.length
        ? `${filledV.length} ausgefüllt · ` + filledV.slice(0, 3).map((x) => x.v + (x.f.unit ? ' ' + x.f.unit : '')).join(' · ') + (filledV.length > 3 ? ' …' : '')
        : 'Noch keine Messwerte';
      const ts = toolChecks.filter((t) => t.cb.checked).map((t) => (t.o.snap || snapOf(instById.get(t.o.id))).name || '(ohne Bezeichnung)');
      folds.tools.sum.textContent = ts.length ? ts.join(', ') : 'Kein Messgerät gewählt';
    }
    const partsFold = fold('parts', 'Ausgetauschte Teile', [partsBox, addPartBtn]);
    const measFold = fold('meas', 'Messwerte', [measEmpty, measBox, addMeasBtn]);
    const toolsFold = fold('tools', 'Verwendete Messgeräte', [toolsBox, sameAsLast, toolsHint]);
    // Sichtbarkeit nach Einsatzart: ausgeblendete Angaben bleiben gespeichert
    function applyKind() {
      const k = kindSel.value;
      const sec = sectionsOf(k, curShow());
      sonstBox.hidden = k !== 'sonstiges';
      partsFold.hidden = !sec.parts; measFold.hidden = !sec.meas; toolsFold.hidden = !sec.tools;
    }
    swMeas.inp.addEventListener('change', applyKind);
    swParts.inp.addEventListener('change', applyKind);
    buildMeas(); updKindText(); applyKind(); refreshFolds(); updContact();

    const err = h('div', { class: 'err' });
    updateDayHint();

    // Aktueller Stand des Formulars als Eintrag (ohne Prüfung). Grundlage für Speichern, Entwurf und
    // die Frage "Gibt es ungespeicherte Änderungen?".
    function collect() {
      const to = driveTo.get(); const bk = driveBack.get();
      const driveOut = legacyDrive && to + bk === 0 ? {} : { driveToMin: to, driveBackMin: bk, driveMin: to + bk };
      return Object.assign({}, entry, {
        date: date.input.value, customerName: name.input.value.trim(), customerId: cid.input.value.trim(),
        serial: serial.input.value.trim(), kind: kindSel.value,
        // Eigene Art: Name und Schalter vom Tag des Eintrags festhalten (falls sie später gelöscht wird)
        kindText: isCustomKind(kindSel.value) ? (customKind(kindSel.value) || { name: entry.kindText || '' }).name : kindTextIn.value.trim(),
        show: isCustomKind(kindSel.value) && customKind(kindSel.value) ? { meas: customKind(kindSel.value).meas, parts: customKind(kindSel.value).parts } : curShow(),
        deviceType: typeSel.value,
        deviceTypeName: (typeById.get(typeSel.value) || {}).name || (typeSel.value && typeSel.value === entry.deviceType ? entry.deviceTypeName || '' : ''),
        limits: curLimits(),
        workMin: work.get(), values: curValues(), parts: curParts(), tools: curTools(), note: note.value.trim(),
      }, driveOut);
    }
    const SIG_KEYS = ['date', 'customerName', 'customerId', 'serial', 'deviceType', 'kind', 'kindText', 'show', 'driveToMin', 'driveBackMin', 'driveMin', 'workMin', 'values', 'parts', 'tools', 'note'];
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
    async function onHome() {
      if (!await confirmLeave('Wirklich zur Startseite? Die Änderungen an diesem Eintrag gehen verloren.')) return;
      clearDraft(); editing = null; goHome();
    }

    async function onSave() {
      if (!name.input.value.trim()) { err.textContent = 'Bitte einen Kundennamen eingeben.'; name.input.focus(); return; }
      if (!date.input.value) { err.textContent = 'Bitte ein Datum wählen.'; return; }
      if (typeRequired && !typeSel.value) { err.textContent = 'Bitte die Geräteart wählen.'; typeSel.focus(); return; }
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
        editing = { entry: out, isNew: false, back, open };
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
      if (!await confirmLeave('Die Kopie übernimmt nur Kundenname, Kunden-ID, Seriennummer und Geräteart. Die Änderungen an diesem Eintrag gehen verloren.')) return;
      const c = newEntry();
      Object.assign(c, { customerName: name.input.value.trim(), customerId: cid.input.value.trim(), serial: serial.input.value.trim(), deviceType: typeSel.value, deviceTypeName: (typeById.get(typeSel.value) || {}).name || '' });
      clearDraft();
      editing = { entry: c, isNew: true, back };
      go('edit');
      toast('Kopie mit Kundendaten angelegt.');
    }

    const main = h('main', { class: 'wrap' },
      dl, dlKind,
      h('div', { class: 'sect' }, h('h2', { text: 'Kunde und Gerät' }), name.el, contactBox, h('div', { class: 'row' }, cid.el, serial.el), typeField),
      h('div', { class: 'sect' }, h('h2', { text: 'Einsatz' }), date.el, kindField, sonstBox),
      h('div', { class: 'sect' }, h('h2', { text: 'Zeiten' }),
        legacyBox,
        h('div', { class: 'row' }, driveTo.el, driveBack.el),
        h('div', { class: 'row' }, work.el, h('div', { class: 'sumbox' }, h('span', { text: 'Fahrzeit gesamt' }), driveSumVal)),
        dayHint),
      partsFold, measFold, toolsFold,
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
        h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Zurück', onclick: onBack }, icon('back')), topRight(onHome)),
      main);
  }

  /* ---- Einstellungen: Übersicht mit Untermenüs ---- */
  const SUBS = [
    ['allgemein', 'Allgemein', 'building'], ['darstellung', 'Darstellung', 'type'], ['eintraege', 'Einträge', 'list'],
    ['geraetearten', 'Gerätearten', 'layers'], ['messgeraete', 'Messgeräte', 'gauge'], ['sicherheit', 'Sicherheit', 'shield'], ['daten', 'Daten', 'data'],
  ];
  const LOCK_OPTS = [[0, 'Sofort beim Verlassen'], [1, 'Nach 1 Minute'], [2, 'Nach 2 Minuten'], [5, 'Nach 5 Minuten'], [15, 'Nach 15 Minuten']];
  function subSummary(k) {
    const s = meta.settings;
    if (k === 'allgemein') return [s.company ? 'Firma: ' + s.company : 'Firmenname', 'Backup-Hinweis'].join(', ');
    if (k === 'darstellung') return `Schrift ${s.fontSize === 'big' ? 'groß' : 'normal'}, angezeigte Reiter`;
    if (k === 'eintraege') return `Einsatzarten, ${s.fields.length} Messfelder, Standardtexte, Spesen`;
    if (k === 'geraetearten') return s.deviceTypes.length ? `${s.deviceTypes.length} ${s.deviceTypes.length === 1 ? 'Geräteart' : 'Gerätearten'}, Messfelder und Grenzen` : 'Noch keine angelegt';
    if (k === 'messgeraete') { const n = db.instruments.filter((x) => !x.hidden).length; return n ? `${n} ${n === 1 ? 'Gerät' : 'Geräte'}, Kalibrierung` : 'Noch keine angelegt'; }
    if (k === 'sicherheit') return [(LOCK_OPTS.find((o) => o[0] === s.lockMin) || [0, ''])[1].replace('Nach ', 'Sperre nach ').replace('Sofort', 'Sperre sofort'), meta.pk ? 'Face ID an' : 'Face ID aus'].join(', ');
    if (k === 'daten') return 'Backup, CSV · letztes Backup ' + (s.lastBackup ? new Date(s.lastBackup).toLocaleDateString('de-DE') : 'noch keins');
    return '';
  }

  function renderSettings() {
    if (!SUBS.some((x) => x[0] === settingsSub)) settingsSub = null;
    if (!settingsSub) {
      root.append(
        header('Einstellungen', null, topRight()),
        h('main', { class: 'wrap' },
          h('nav', { class: 'submenu', 'aria-label': 'Bereiche der Einstellungen' }, SUBS.map(([k, label, ic]) => h('button', {
            class: 'subrow', type: 'button', onclick: () => { settingsSub = k; go('settings'); },
          }, h('span', { class: 'subico' }, icon(ic)),
          h('span', { class: 'subtext' }, h('span', { class: 'subtitle', text: label }), h('span', { class: 'muted small', text: subSummary(k) })),
          icon('next')))),
          h('p', { class: 'muted small', style: 'text-align:center;margin-top:18px', text: 'Work Companion Fieldbook ' + APP_VERSION + ' · Daten bleiben lokal auf diesem Gerät' })),
        tabbar());
      return;
    }
    const label = SUBS.find((x) => x[0] === settingsSub)[1];
    const body = {
      allgemein: setGeneral, darstellung: setLook, eintraege: setEntries, geraetearten: setTypes,
      messgeraete: setInstruments, sicherheit: setSecurity, daten: setData,
    }[settingsSub]();
    root.append(
      header(label, h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Zurück zu den Einstellungen', onclick: () => { settingsSub = null; go('settings'); } }, icon('back')), topRight()),
      h('main', { class: 'wrap' }, body),
      tabbar());
  }

  function setGeneral() {
    const s = meta.settings;
    const companyIn = h('input', {
      type: 'text', value: s.company || '', maxlength: '60', placeholder: 'z. B. Muster GmbH', autocapitalize: 'words',
      autocomplete: 'organization', 'aria-label': 'Firmenname',
      onchange: (e) => { s.company = e.target.value; fixLook(s); e.target.value = s.company; persistMeta(); toast('Gespeichert.'); },
    });
    const backupSel = h('select', {
      'aria-label': 'Backup-Hinweis',
      onchange: (e) => { s.backupDays = Number(e.target.value); persistMeta(); toast('Gespeichert.'); },
    }, [[0, 'Aus'], [1, 'nach 1 Tag'], [3, 'nach 3 Tagen'], [7, 'nach 7 Tagen'], [14, 'nach 14 Tagen'], [30, 'nach 30 Tagen']]
      .map(([v, t]) => h('option', { value: String(v), text: t, selected: v === s.backupDays })));
    return [
      h('div', { class: 'sect' }, h('h2', { text: 'Firma' }),
        h('label', { class: 'f', style: 'margin:0' }, h('span', { text: 'Firmenname (optional)' }), companyIn),
        h('p', { class: 'muted small', style: 'margin:8px 0 0', text: 'Steht dann auf der Startseite oben statt „Work Companion Fieldbook“ und auf dem Sperrbildschirm. Er wird wie die übrigen Einstellungen unverschlüsselt gespeichert, auch im Backup. Leer lassen für den App-Namen.' })),
      h('div', { class: 'sect' }, h('h2', { text: 'Hinweise auf der Startseite' }),
        h('label', { class: 'f', style: 'margin:0' }, h('span', { text: 'Backup hervorheben' }), backupSel),
        h('p', { class: 'muted small', style: 'margin:8px 0 0', text: 'Ist das letzte Backup älter, wird es auf der Startseite farbig hervorgehoben.' })),
    ];
  }

  function setLook() {
    const s = meta.settings;
    const fsSel = h('select', {
      'aria-label': 'Schriftgröße',
      onchange: (e) => { s.fontSize = e.target.value === 'big' ? 'big' : 'normal'; persistMeta(); applyFontSize(); toast('Gespeichert.'); },
    }, [['normal', 'Normal'], ['big', 'Groß']].map(([v, tx]) => h('option', { value: v, text: tx, selected: v === s.fontSize })));
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
    return [
      h('div', { class: 'sect' }, h('h2', { text: 'Schrift' }),
        h('label', { class: 'f', style: 'margin:0' }, h('span', { text: 'Schriftgröße' }), fsSel),
        h('p', { class: 'muted small', style: 'margin:8px 0 0', text: 'Groß hilft draußen bei Sonne oder mit Handschuhen. Es gilt für die ganze App.' })),
      h('div', { class: 'sect' }, h('h2', { text: 'Reiter' }),
        tabRow('customers', 'Kunden'), tabRow('calendar', 'Kalender'),
        h('p', { class: 'muted small', style: 'margin:8px 0 0', text: 'Ausgeblendete Reiter behalten ihre Daten und fehlen auch auf der Startseite. „Einträge“ und „Einstellungen“ bleiben immer sichtbar.' })),
    ];
  }

  function customKindDialog(c) {
    const s = meta.settings;
    return modal((box, close) => {
      const nm = h('input', { type: 'text', value: c ? c.name : '', maxlength: '40', autocomplete: 'off', autocapitalize: 'sentences', placeholder: 'z. B. Inspektion' });
      const mk = (label, on) => { const inp = h('input', { type: 'checkbox', class: 'switch', checked: on }); return { inp, el: h('label', { class: 'setrow switchrow' }, h('div', { text: label }), inp) }; };
      const swM = mk('Messwerte und Messgeräte', c ? c.meas : true);
      const swP = mk('Ausgetauschte Teile', c ? c.parts : false);
      const tpl = h('textarea', { rows: '4', value: c ? c.template : '', placeholder: 'Leer: kein Text in der Notiz', 'aria-label': 'Standardtext' });
      const err = h('div', { class: 'err' });
      const ok = () => {
        const name = nm.value.replace(/\s+/g, ' ').trim();
        if (!name) { err.textContent = 'Bitte einen Namen eingeben.'; nm.focus(); return; }
        const taken = KINDS.some((k) => k[1].toLowerCase() === name.toLowerCase()) ||
          s.customKinds.some((x) => (!c || x.id !== c.id) && x.name.toLowerCase() === name.toLowerCase());
        if (taken) { err.textContent = 'Diesen Namen gibt es schon.'; nm.focus(); return; }
        close({ id: c ? c.id : 'c:' + uid(), name, meas: swM.inp.checked, parts: swP.inp.checked, template: tpl.value.trim() });
      };
      box.append(
        h('h3', { text: c ? 'Einsatzart bearbeiten' : 'Neue Einsatzart' }),
        h('label', { class: 'f' }, h('span', { text: 'Name' }), nm),
        h('div', { class: 'muted small', text: 'Was zeigt der Eintrag bei dieser Art?' }),
        swM.el, swP.el,
        h('label', { class: 'f', style: 'margin-top:10px' }, h('span', { text: 'Standardtext für die Notiz' }), tpl),
        err,
        h('div', { class: 'stack', style: 'margin-top:6px' },
          h('button', { class: 'btn', type: 'button', onclick: ok, text: 'Speichern' }),
          c && h('button', { class: 'btn danger', type: 'button', onclick: () => close('delete'), text: 'Einsatzart löschen' }),
          h('button', { class: 'btn link', type: 'button', onclick: () => close(null), text: 'Abbrechen' })));
      if (!c) setTimeout(() => nm.focus(), 50);
    });
  }

  function setEntries() {
    const s = meta.settings;
    const spesenSel = h('select', {
      'aria-label': 'Spesen-Hinweis bei Tagessumme',
      onchange: (e) => { s.spesenMin = Number(e.target.value); persistMeta(); toast('Gespeichert.'); },
    }, [[0, 'Aus'], [240, 'mehr als 4 Stunden'], [300, 'mehr als 5 Stunden'], [360, 'mehr als 6 Stunden'], [420, 'mehr als 7 Stunden'],
      [480, 'mehr als 8 Stunden'], [540, 'mehr als 9 Stunden'], [600, 'mehr als 10 Stunden'], [720, 'mehr als 12 Stunden']]
      .map(([v, t]) => h('option', { value: String(v), text: t, selected: v === (Number(s.spesenMin) || 0) })));
    const tplArea = (key, label) => h('label', { class: 'f' }, h('span', { text: label }),
      h('textarea', {
        rows: '5', value: (s.templates || {})[key] || '', 'aria-label': 'Vorlagentext ' + label,
        placeholder: key === 'sonstiges' ? 'Leer: kein Text in der Notiz' : null,
        onchange: (e) => { s.templates = Object.assign({}, s.templates, { [key]: e.target.value.trim() }); persistMeta(); toast('Gespeichert.'); },
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
    const kindSw = (k, key, label) => h('label', { class: 'setrow switchrow' },
      h('div', { text: label }),
      h('input', {
        type: 'checkbox', class: 'switch', checked: !!s.kindShow[k][key], 'aria-label': `${kindLabel(k)}: ${label}`,
        onchange: (e) => { s.kindShow[k][key] = e.target.checked; persistMeta(); toast('Gespeichert.'); },
      }));
    const editKind = async (c) => {
      const r = await customKindDialog(c);
      if (!r || !meta) return;
      if (r === 'delete') {
        const used = db.entries.filter((e) => e.kind === c.id).length;
        if (!await confirmDlg('Einsatzart löschen?', `„${c.name}“ wird aus der Auswahl entfernt.` + (used ? ` ${used} ${used === 1 ? 'Eintrag behält' : 'Einträge behalten'} den Namen und die Abschnitte.` : ''), 'Löschen', true)) return;
        s.customKinds = s.customKinds.filter((x) => x.id !== c.id);
      } else {
        const i = s.customKinds.findIndex((x) => x.id === r.id);
        if (i >= 0) s.customKinds[i] = r; else s.customKinds.push(r);
      }
      fixFields(s); persistMeta(); render(); toast('Gespeichert.');
    };
    const sw2 = (on) => [on.meas && 'Messwerte', on.parts && 'Teile'].filter(Boolean).join(' und ') || 'nur Kunde, Zeiten und Notiz';
    return [
      h('div', { class: 'sect' }, h('h2', { text: 'Eigene Einsatzarten' }),
        h('p', { class: 'muted small', style: 'margin-top:0', text: 'Für Arten, die immer wieder vorkommen (z. B. Inspektion): fester Name, eigene Schalter und eigener Standardtext. Sie stehen im Eintrag vor „Sonstiges“ zur Auswahl und erscheinen grau. „Sonstiges“ bleibt für Einzelfälle.' }),
        s.customKinds.map((c) => h('button', { class: 'listrow', type: 'button', onclick: () => editKind(c) },
          h('span', { class: 'subtext' }, h('span', { class: 'subtitle', text: c.name }), h('span', { class: 'muted small', text: 'zeigt ' + sw2(c) + (c.template ? ' · mit Standardtext' : '') })),
          icon('next'))),
        h('button', { class: 'btn sec', type: 'button', style: 'margin-top:4px', text: '+ Neue Einsatzart', disabled: s.customKinds.length >= 30, onclick: () => editKind(null) })),
      h('div', { class: 'sect' }, h('h2', { text: 'Was zeigt welche Einsatzart?' }),
        h('p', { class: 'muted small', style: 'margin-top:0', text: 'Ausgeschaltete Abschnitte erscheinen im Eintrag nicht. Schon eingetragene Werte bleiben gespeichert und sind wieder da, wenn du den Schalter einschaltest. Bei „Sonstiges“ entscheidest du das in jedem Eintrag selbst.' }),
        ['installation', 'wartung', 'reparatur'].map((k) => h('div', { class: 'kindshow' },
          h('div', { class: 'kindshow-title', text: kindLabel(k) }),
          kindSw(k, 'meas', 'Messwerte und Messgeräte'),
          kindSw(k, 'parts', 'Ausgetauschte Teile')))),
      h('div', { class: 'sect' }, h('h2', { text: `Messfelder (${s.fields.length})` }),
        h('p', { class: 'muted small', style: 'margin-top:0', text: `Name und Einheit der Messwerte, höchstens ${MAX_FIELDS}. Änderungen gelten sofort für alle Einträge. Welche Felder eine Geräteart braucht und ihre Grenzen stellst du unter „Gerätearten“ ein.` }),
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
              const inTypes = s.deviceTypes.filter((t) => t.fields.includes(i)).length;
              if (!await confirmDlg('Messfeld entfernen?', `„${s.fields[i].name}“ wird aus der Liste entfernt. Es ist in keinem Eintrag ausgefüllt.` + (inTypes ? ` Es wird auch aus ${inTypes} ${inTypes === 1 ? 'Geräteart' : 'Gerätearten'} entfernt.` : ''), 'Entfernen', true)) return;
              if (!meta || s.fields.length - 1 !== i) return;
              s.fields.pop(); fixTypes(s); persistMeta(); render();
              const rb = [...document.querySelectorAll('button')].find((b) => b.textContent === '+ Messfeld'); if (rb) rb.focus();
            },
          }))),
      h('div', { class: 'sect' }, h('h2', { text: 'Standardtexte für die Notiz' }),
        h('p', { class: 'muted small', style: 'margin-top:0', text: 'Wählst du im Eintrag die Art des Einsatzes, erscheint der passende Text in der Notiz. Eigener Text wird nie überschrieben. Ein leerer Text fügt nichts ein.' }),
        KINDS.map(([k, l]) => tplArea(k, l)),
        h('button', {
          class: 'btn sec', type: 'button', text: 'Auf Standard zurücksetzen',
          onclick: async () => {
            if (!await confirmDlg('Standardtexte zurücksetzen?', 'Die Texte werden durch die mitgelieferten ersetzt (bei „Sonstiges“ leer).', 'Zurücksetzen')) return;
            s.templates = defaultTemplates(); persistMeta(); render(); toast('Zurückgesetzt.');
          },
        })),
      h('div', { class: 'sect' }, h('h2', { text: 'Spesen' }),
        h('label', { class: 'f' }, h('span', { text: 'Spesen-Hinweis bei Tagessumme' }), spesenSel),
        h('p', { class: 'muted small', style: 'margin:0', text: 'Gerechnet wird pro Tag: Fahrzeit plus Arbeitszeit aller Einträge mit demselben Datum. Liegt die Summe über der Grenze, erscheint „Spesen“ am Eintrag und der Tag ist im Kalender farbig. Die Regeln und Pauschalen bitte mit deiner Abrechnung abgleichen; Pausen und Wartezeiten, die nicht eingetragen sind, fehlen in der Summe.' })),
    ];
  }

  // Zahl aus einem Eingabefeld (Komma oder Punkt), leer = keine Grenze, ungültig = undefined
  const parseLimit = (v) => { v = String(v || '').trim(); if (!v) return null; const n = numVal(v); return n === null ? undefined : n; };
  function typeDialog(t) {
    const s = meta.settings;
    const isNewT = !t;
    const cur = t ? JSON.parse(JSON.stringify(t)) : { id: uid(), name: '', fields: [], limits: {} };
    return modal((box, close) => {
      const nm = h('input', { type: 'text', value: cur.name, maxlength: '40', autocomplete: 'off', placeholder: 'z. B. D, C, M oder S', autocapitalize: 'characters' });
      const err = h('div', { class: 'err' });
      const rows = s.fields.map((f, i) => {
        const L = cur.limits[i] || {};
        const cb = h('input', { type: 'checkbox', class: 'check', checked: cur.fields.includes(i), 'aria-label': (f.name || 'Messwert ' + (i + 1)) + ' verwenden' });
        const mi = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', value: L.min == null ? '' : String(L.min).replace('.', ','), placeholder: 'min', 'aria-label': 'Untergrenze ' + (f.name || '') });
        const ma = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', value: L.max == null ? '' : String(L.max).replace('.', ','), placeholder: 'max', 'aria-label': 'Obergrenze ' + (f.name || '') });
        const lim = h('div', { class: 'limrow' }, mi, h('span', { class: 'muted small', text: 'bis' }), ma, f.unit && h('span', { class: 'muted small', text: f.unit }));
        const upd = () => { lim.hidden = !cb.checked; };
        cb.addEventListener('change', upd); upd();
        return { i, f, cb, mi, ma, el: h('div', { class: 'typefield' }, h('label', { class: 'toolrow' }, cb, h('span', { class: 'toolname', text: f.name || 'Messwert ' + (i + 1) })), lim) };
      });
      const ok = () => {
        const name = nm.value.trim();
        if (!name) { err.textContent = 'Bitte einen Namen eingeben.'; nm.focus(); return; }
        if (s.deviceTypes.some((x) => x.id !== cur.id && x.name.toLowerCase() === name.toLowerCase())) { err.textContent = 'Diesen Namen gibt es schon.'; nm.focus(); return; }
        const fields = []; const limits = {};
        for (const r of rows) {
          if (!r.cb.checked) continue;
          fields.push(r.i);
          const min = parseLimit(r.mi.value); const max = parseLimit(r.ma.value);
          if (min === undefined || max === undefined) { err.textContent = `${r.f.name}: Grenzen bitte als Zahl eingeben (z. B. 2,5).`; return; }
          if (min !== null && max !== null && min > max) { err.textContent = `${r.f.name}: Die Untergrenze ist größer als die Obergrenze.`; return; }
          if (min !== null || max !== null) limits[r.i] = { min, max };
        }
        close({ id: cur.id, name, fields, limits });
      };
      box.append(
        h('h3', { text: isNewT ? 'Neue Geräteart' : 'Geräteart bearbeiten' }),
        h('label', { class: 'f' }, h('span', { text: 'Name' }), nm),
        h('p', { class: 'muted small', text: 'Welche Messfelder braucht diese Geräteart? Untergrenze und Obergrenze sind freiwillig. Liegt ein Wert außerhalb, wird er im Eintrag farbig markiert; gespeichert wird trotzdem.' }),
        h('div', { class: 'typefields' }, rows.map((r) => r.el)),
        err,
        h('div', { class: 'stack', style: 'margin-top:10px' },
          h('button', { class: 'btn', type: 'button', onclick: ok, text: 'Speichern' }),
          !isNewT && h('button', { class: 'btn danger', type: 'button', onclick: () => close('delete'), text: 'Geräteart löschen' }),
          h('button', { class: 'btn link', type: 'button', onclick: () => close(null), text: 'Abbrechen' })));
      if (isNewT) setTimeout(() => nm.focus(), 50);
    });
  }
  function setTypes() {
    const s = meta.settings;
    const edit = async (t) => {
      const r = await typeDialog(t);
      if (!r || !meta) return;
      if (r === 'delete') {
        const used = db.entries.filter((e) => e.deviceType === t.id).length;
        if (!await confirmDlg('Geräteart löschen?', `„${t.name}“ wird aus der Liste entfernt.` + (used ? ` ${used} ${used === 1 ? 'Eintrag behält' : 'Einträge behalten'} den Namen und die Grenzen vom Tag des Auftrags.` : ''), 'Löschen', true)) return;
        s.deviceTypes = s.deviceTypes.filter((x) => x.id !== t.id);
      } else {
        const i = s.deviceTypes.findIndex((x) => x.id === r.id);
        if (i >= 0) s.deviceTypes[i] = r; else s.deviceTypes.push(r);
      }
      fixTypes(s); persistMeta(); render(); toast('Gespeichert.');
    };
    const fmtL = (L) => (L.min != null && L.max != null ? `${String(L.min).replace('.', ',')}–${String(L.max).replace('.', ',')}` : L.min != null ? `ab ${String(L.min).replace('.', ',')}` : `bis ${String(L.max).replace('.', ',')}`);
    return [
      h('div', { class: 'sect' }, h('h2', { text: 'Gerätearten' }),
        h('p', { class: 'muted small', style: 'margin-top:0', text: 'Im Eintrag wählst du die Geräteart; dann erscheinen nur ihre Messfelder. Sobald es mindestens eine Geräteart gibt, ist sie bei neuen Einträgen Pflicht. Ein Eintrag merkt sich die Grenzen vom Tag des Auftrags.' }),
        s.deviceTypes.length ? s.deviceTypes.map((t) => h('button', { class: 'listrow', type: 'button', onclick: () => edit(t) },
          h('span', { class: 'subtext' }, h('span', { class: 'subtitle', text: t.name }),
            h('span', { class: 'muted small', text: t.fields.length ? t.fields.map((i) => (s.fields[i] || {}).name + (t.limits[i] ? ` (${fmtL(t.limits[i])})` : '')).join(', ') : 'Keine Messfelder' })),
          icon('next')))
          : h('p', { class: 'muted', text: 'Noch keine Geräteart angelegt.' }),
        h('button', { class: 'btn', type: 'button', style: 'margin-top:10px', text: '+ Neue Geräteart', onclick: () => edit(null) })),
    ];
  }

  function instrumentDialog(x) {
    return modal((box, close) => {
      const nm = h('input', { type: 'text', value: x ? x.name : '', maxlength: '60', autocomplete: 'off', placeholder: 'z. B. Manometer A', autocapitalize: 'sentences' });
      const sn = h('input', { type: 'text', value: x ? x.serial : '', maxlength: '60', autocomplete: 'off', autocapitalize: 'characters' });
      const cu = h('input', { type: 'date', value: x ? x.calUntil : '', 'aria-label': 'Kalibrierung gültig bis' });
      const err = h('div', { class: 'err' });
      const used = x ? db.entries.some((e) => toolsOf(e).some((t) => t.id === x.id)) : false;
      const ok = () => {
        if (!nm.value.trim()) { err.textContent = 'Bitte eine Bezeichnung eingeben.'; nm.focus(); return; }
        close({ name: nm.value.trim(), serial: sn.value.trim(), calUntil: /^\d{4}-\d{2}-\d{2}$/.test(cu.value) ? cu.value : '' });
      };
      box.append(
        h('h3', { text: x ? 'Messgerät bearbeiten' : 'Neues Messgerät' }),
        h('label', { class: 'f' }, h('span', { text: 'Bezeichnung' }), nm),
        h('label', { class: 'f' }, h('span', { text: 'Seriennummer' }), sn),
        h('label', { class: 'f' }, h('span', { text: 'Kalibrierung gültig bis' }), cu),
        x && h('p', { class: 'muted small', text: 'Einträge, in denen das Gerät schon steht, behalten die Angaben vom Tag des Auftrags.' }),
        err,
        h('div', { class: 'stack', style: 'margin-top:6px' },
          h('button', { class: 'btn', type: 'button', onclick: ok, text: 'Speichern' }),
          x && !x.hidden && h('button', { class: 'btn sec', type: 'button', onclick: () => close('hide'), text: 'Ausblenden' }),
          x && !used && h('button', { class: 'btn danger', type: 'button', onclick: () => close('delete'), text: 'Löschen' }),
          h('button', { class: 'btn link', type: 'button', onclick: () => close(null), text: 'Abbrechen' })));
      if (!x) setTimeout(() => nm.focus(), 50);
    });
  }
  async function saveInstruments(next, beforeDel) {
    const before = db.instruments;
    db.instruments = next;
    if (await save(db.entries.slice())) return true;
    db.instruments = before; if (beforeDel) db.deleted = beforeDel;
    return false;
  }
  function setInstruments() {
    const edit = async (x) => {
      const r = await instrumentDialog(x);
      if (!r || !db) return;
      const now = Date.now();
      if (r === 'hide' || r === 'show') {
        if (await saveInstruments(db.instruments.map((y) => (y.id === x.id ? Object.assign({}, y, { hidden: r === 'hide', updatedAt: now }) : y)))) { render(); toast(r === 'hide' ? 'Ausgeblendet.' : 'Eingeblendet.'); }
        return;
      }
      if (r === 'delete') {
        if (!await confirmDlg('Messgerät löschen?', `„${x.name}“ wird gelöscht. Es steht in keinem Eintrag.`, 'Löschen', true)) return;
        if (!db) return;
        const beforeDel = db.deleted.slice();
        db.deleted = db.deleted.filter((t) => t.id !== x.id).concat({ id: x.id, at: Math.max(now, (x.updatedAt || 0) + 1) });
        if (await saveInstruments(db.instruments.filter((y) => y.id !== x.id), beforeDel)) { render(); toast('Gelöscht.'); }
        return;
      }
      const rec = Object.assign({}, x || { id: uid(), hidden: false }, r, { updatedAt: now });
      const next = x ? db.instruments.map((y) => (y.id === x.id ? rec : y)) : db.instruments.concat(rec);
      if (await saveInstruments(next)) { render(); toast('Gespeichert.'); }
    };
    const row = (x) => h('button', { class: 'listrow', type: 'button', onclick: () => edit(x) },
      h('span', { class: 'subtext' }, h('span', { class: 'subtitle', text: x.name }),
        h('span', { class: 'muted small', text: [x.serial && 'Seriennummer ' + x.serial, x.calUntil ? 'Kalibrierung gültig bis ' + fmtDate(x.calUntil) : 'ohne Kalibrierdatum'].filter(Boolean).join(' · ') })),
      icon('next'));
    const vis = db.instruments.filter((x) => !x.hidden);
    const hid = db.instruments.filter((x) => x.hidden);
    return [
      h('div', { class: 'sect' }, h('h2', { text: 'Eigene Messgeräte' }),
        vis.length ? vis.map(row) : h('p', { class: 'muted', text: 'Noch keine Messgeräte angelegt.' }),
        h('button', { class: 'btn', type: 'button', style: 'margin-top:10px', text: '+ Neues Messgerät', onclick: () => edit(null) }),
        h('p', { class: 'muted small', text: 'Im Eintrag wählst du unter „Verwendete Messgeräte“ aus, welche du benutzt hast. Der Eintrag merkt sich Seriennummer und Kalibrierdatum vom Tag des Auftrags. Verwendete Geräte werden ausgeblendet statt gelöscht. Die Messgeräte sind verschlüsselt und im Backup.' })),
      hid.length ? h('div', { class: 'sect' }, h('h2', { text: 'Ausgeblendet' }),
        hid.map((x) => h('div', { class: 'setrow' },
          h('div', {}, h('div', { text: x.name }), h('div', { class: 'muted small', text: [x.serial && 'SN ' + x.serial, 'in älteren Einträgen verwendet'].filter(Boolean).join(' · ') })),
          h('button', {
            class: 'btn sec', style: 'width:auto', type: 'button', text: 'Einblenden',
            onclick: async () => { if (await saveInstruments(db.instruments.map((y) => (y.id === x.id ? Object.assign({}, y, { hidden: false, updatedAt: Date.now() }) : y)))) { render(); toast('Eingeblendet.'); } },
          })))) : null,
    ];
  }

  function setSecurity() {
    const s = meta.settings;
    const lockSel = h('select', {
      'aria-label': 'Automatisch sperren',
      onchange: (e) => { s.lockMin = Number(e.target.value); persistMeta(); toast('Gespeichert.'); },
    }, LOCK_OPTS.map(([v, t]) => h('option', { value: String(v), text: t, selected: v === s.lockMin })));
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
    return [
      h('div', { class: 'sect' }, h('h2', { text: 'Sperre' }),
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
    ];
  }

  function setData() {
    const s = meta.settings;
    return [
      h('div', { class: 'sect' }, h('h2', { text: 'Backup und Export' }),
        h('div', { class: 'stack' },
          h('button', { class: 'btn', type: 'button', onclick: () => exportBackup().catch((e) => toast(e.message || String(e))), text: 'Verschlüsseltes Backup erstellen' }),
          h('button', { class: 'btn sec', type: 'button', onclick: () => mergeBackup(), text: 'Backup hinzufügen (bestehende Daten bleiben)' }),
          h('button', { class: 'btn sec', type: 'button', onclick: () => exportCsv().catch((e) => toast(e.message || String(e))), text: 'Als CSV exportieren (unverschlüsselt)' })),
        h('p', {
          class: 'muted small', style: 'margin-top:12px',
          text: 'Letztes Backup: ' + (s.lastBackup ? new Date(s.lastBackup).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : 'noch nie') + '.',
        }),
        h('p', { class: 'muted small', text: 'Tipp: Kopiere ab und zu ein Backup auf einen zweiten Speicherort (Computer, USB-Stick). Das Backup ist verschlüsselt. In dieser App lässt es sich ohne Passwort hinzufügen; auf einem neuen Gerät brauchst du das Passwort, das beim Erstellen galt, oder (falls eingerichtet) den Wiederherstellungscode bzw. die Antworten auf die Sicherheitsfragen. Die CSV-Datei enthält Klartext, auch Adressen und Telefonnummern.' })),
      h('div', { class: 'sect' }, h('h2', { text: 'Gefahrenzone' }),
        h('button', {
          class: 'btn danger', type: 'button', text: 'Alle Daten auf diesem Gerät löschen',
          onclick: async () => {
            if (!await confirmDlg('Wirklich alles löschen?', 'Alle Einträge, Messgeräte, Kontaktdaten, das Passwort und der Passkey-Bezug werden von diesem Gerät entfernt. Ohne Backup sind die Daten verloren.', 'Alles löschen', true)) return;
            store.del(META_KEY); store.del(DATA_KEY); store.del(DRAFT_KEY);
            meta = null; dataKey = null; db = null; editing = null; resume = null; settingsSub = null;
            applyFontSize();
            view = 'setup'; render();
          },
        })),
    ];
  }

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  render();
})();
