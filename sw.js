/* MR Follow-up offline support. Bump VERSION when index.html changes. */
const VERSION = 'mrfu-2026-10-28-1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon-32.png'];
const LIBS = ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(CORE);
    for (const u of LIBS) { try { await c.add(new Request(u, { mode: 'cors' })); } catch (err) { /* cached on first online use */ } }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin || req.mode === 'navigate') {
    // App files: network first so updates arrive, cache when offline.
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) { const c = await caches.open(VERSION); c.put(req, res.clone()); }
        return res;
      } catch (err) {
        return (await caches.match(req)) || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
      }
    })());
    return;
  }
  // Library and fonts: cache first.
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') { const c = await caches.open(VERSION); c.put(req, res.clone()); }
      return res;
    } catch (err) { return Response.error(); }
  })());
});
