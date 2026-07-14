// Paji Service Worker: native push only, zero app/media/API caching.
const clearEveryCache = async () => {
  if (!self.caches) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
};

self.addEventListener('install', event => {
  event.waitUntil(clearEveryCache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(clearEveryCache().then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'CLEAR_CACHES') {
    event.waitUntil(clearEveryCache());
  }
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith((async () => {
    try {
      return await fetch(new Request(request, { cache: 'no-store' }));
    } catch {
      return fetch(request);
    }
  })());
});
