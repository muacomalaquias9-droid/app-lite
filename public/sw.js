// Blynk Service Worker: native push only, zero app/media/API caching.
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

// Push notification handling
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Blynk';
  
  const options = {
    body: data.body || 'Nova notificação',
    icon: data.icon || '/logo-192.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    tag: data.tag || `notification-${Date.now()}`,
    data: {
      url: data.url || '/',
      ...data
    },
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Fechar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus().then(() => {
              client.postMessage({ type: 'NAVIGATE', url: urlToOpen });
            });
          }
        }
        return clients.openWindow(urlToOpen);
      })
  );
});

// Background sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  const allClients = await clients.matchAll({ includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage({ type: 'SYNC_DATA' });
  }
}

// Periodic background sync (if supported) — no prefetch/cache.
self.addEventListener('periodicsync', event => {
  if (event.tag === 'content-sync') {
    event.waitUntil(syncPendingData());
  }
});
