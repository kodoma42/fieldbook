'use strict';
/*
 * Krypto-Modul für die Work Companion Fieldbook App (früher "Messprotokoll").
 *
 * Aufbau (Envelope-Verschlüsselung):
 *  - Ein zufälliger 256-Bit-Datenschlüssel (AES-GCM) verschlüsselt alle Einträge.
 *  - Dieser Datenschlüssel wird mehrfach "eingepackt":
 *      1) mit einem Schlüssel aus dem Passwort (PBKDF2-SHA256, 600.000 Runden)
 *      2) optional mit einem Schlüssel aus dem Passkey (WebAuthn-PRF -> HKDF)
 *  - Man kann die App also mit Passwort ODER Passkey öffnen.
 */
const MPCrypto = (() => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const ITER = 600000;

  const b64 = {
    enc(buf) {
      const b = new Uint8Array(buf);
      let s = '';
      for (let i = 0; i < b.length; i += 0x8000) {
        s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      }
      return btoa(s);
    },
    dec(str) {
      const s = atob(str);
      const b = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
      return b;
    },
  };

  const rand = (n) => crypto.getRandomValues(new Uint8Array(n));

  async function pwKey(password, salt, iter) {
    const base = await crypto.subtle.importKey(
      'raw', enc.encode(String(password).normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  async function prfKey(prfOut, salt) {
    const base = await crypto.subtle.importKey('raw', prfOut, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('messprotokoll-kek-v1') },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  const newDataKey = () =>
    crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);

  async function wrap(dataKey, kek) {
    const raw = await crypto.subtle.exportKey('raw', dataKey);
    const iv = rand(12);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, raw);
    return { iv: b64.enc(iv), wk: b64.enc(ct) };
  }

  async function unwrap(w, kek) {
    const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.dec(w.iv) }, kek, b64.dec(w.wk));
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
  }

  async function wrapWithPassword(dataKey, password) {
    const salt = rand(16);
    const kek = await pwKey(password, salt, ITER);
    const w = await wrap(dataKey, kek);
    return { salt: b64.enc(salt), iter: ITER, iv: w.iv, wk: w.wk };
  }

  async function unwrapWithPassword(pw, password) {
    const kek = await pwKey(password, b64.dec(pw.salt), pw.iter);
    return unwrap(pw, kek);
  }

  async function wrapWithPrf(dataKey, prfOut, prfSalt) {
    const kek = await prfKey(prfOut, prfSalt);
    return wrap(dataKey, kek);
  }

  async function unwrapWithPrf(pk, prfOut) {
    const kek = await prfKey(prfOut, b64.dec(pk.prfSalt));
    return unwrap(pk, kek);
  }

  async function encryptJSON(obj, key) {
    const iv = rand(12);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
    return { iv: b64.enc(iv), ct: b64.enc(ct) };
  }

  async function decryptJSON(box, key) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.dec(box.iv) }, key, b64.dec(box.ct));
    return JSON.parse(dec.decode(pt));
  }

  return {
    b64, rand, newDataKey,
    wrapWithPassword, unwrapWithPassword,
    wrapWithPrf, unwrapWithPrf,
    encryptJSON, decryptJSON,
  };
})();

if (typeof module !== 'undefined') module.exports = MPCrypto;
