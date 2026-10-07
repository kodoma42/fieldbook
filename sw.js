'use strict';
const CACHE = 'fieldbook-1.5.4'; // bei jeder neuen Version anpassen, sonst kommt das Update nicht an
const FILES = ['./', 'index.html', 'crypto.js', 'app.js', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];

// Updates kommen nur als Ganzes: Der Browser prüft bei jedem Start, ob sich sw.js geändert hat.
// Wenn ja, werden alle Dateien zusammen neu geladen (klappt eine nicht, bleibt die alte Version
// komplett erhalten). So laufen nie Dateien aus zwei verschiedenen Versionen gemischt.
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
  const c = await caches.open(CACHE);
  const hit = await c.match(req, { ignoreSearch: true });
  if (hit) return hit;
  if (req.mode === 'navigate') return c.match('./');
  return undefined;
}

// Cache zuerst: Die App startet sofort aus dem Speicher, auch ohne Netz oder bei schwachem Empfang.
// Nur was nicht im Speicher liegt, wird aus dem Netz geholt.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fromCache(req).then((cached) => cached || fetch(req).catch(() => Response.error())));
});
