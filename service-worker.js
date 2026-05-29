/* Hebrew Quiz PWA — offline cache.
   Bump CACHE_VERSION whenever you ship updated assets so old clients refresh. */
const CACHE_VERSION = 'hq-v1';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './hebrew-zero.html',
  './hebrew-everyday.html',
  './hebrew-health.html',
  './hebrew-shopping.html',
  './hebrew-home.html',
  './hebrew-city.html',
  './hebrew-people.html',
  './hebrew-engineer.html',
  './hebrew-b2-quiz.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/favicon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c =>
    // Add what we can, ignore single failures (e.g. ones the host hasn't deployed yet)
    Promise.all(CORE.map(u => c.add(u).catch(() => null)))
  ));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== CACHE_VERSION).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

/* Stale-while-revalidate:
   - serve from cache if we have it (fast, works offline)
   - fetch in the background to refresh the cache
   - on a cache miss, go to network, then cache the result
   GET requests only. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle same-origin requests; let cross-origin (e.g. Web Speech voices) pass through.
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(req, { ignoreSearch: true });
    const networkPromise = fetch(req).then(resp => {
      if (resp && resp.ok && resp.type === 'basic') {
        cache.put(req, resp.clone()).catch(() => {});
      }
      return resp;
    }).catch(() => null);
    return cached || (await networkPromise) || new Response('Offline', { status: 503 });
  })());
});
