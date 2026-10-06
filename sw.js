'use strict';
const CACHE = 'fieldbook-v7';
const FILES = ['./', 'index.html', 'crypto.js', 'app.js', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  // cache: 'reload' umgeht den HTTP-Cache, damit wirklich die neue Version gespeichert wird.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

async function fromCache(req) {
  const hit = await caches.match(req, { ignoreSearch: true });
  if (hit) return hit;
  if (req.mode === 'navigate') return caches.match('./');
  return undefined;
}

// Cache zuerst: Die App startet sofort aus dem Speicher, auch ohne Netz oder bei schwachem Empfang.
// Im Hintergrund wird die Datei aus dem Netz geholt und für den nächsten Start gespeichert.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // no-cache: beim Server nachfragen, ob es eine neuere Version gibt (sonst bis zu 10 Min. alter HTTP-Cache).
  const network = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
    if (res && res.ok && !res.redirected) {
      const copy = res.clone();
      return caches.open(CACHE).then((c) => c.put(req, copy)).then(() => res);
    }
    return res;
  });

  e.waitUntil(network.then(() => {}, () => {}));
  e.respondWith(
    fromCache(req).then((cached) => {
      if (cached) return cached;
      return network.catch(() => fromCache(req).then((r) => r || Response.error()));
    }));
});
