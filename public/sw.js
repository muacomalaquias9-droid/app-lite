// Enhanced Service Worker for PWA with Aggressive Caching and Offline Support
const CACHE_NAME = 'paji-v3';
const STATIC_CACHE = 'paji-static-v3';
const DYNAMIC_CACHE = 'paji-dynamic-v3';
const MEDIA_CACHE = 'paji-media-v3';

const STATIC_ASSETS = [
  '/',
  '/favicon.png',
  '/logo-192.png',
  '/logo-512.png',
  '/sounds/notification.mp3',
  '/sounds/calling.mp3',
  '/sounds/connect.mp3',
  '/sounds/hangup.mp3',
  '/sounds/ringing.mp3',
  '/sounds/like.mp3'
];

// Cache limits
const DYNAMIC_CACHE_LIMIT = 100;
const MEDIA_CACHE_LIMIT = 50;

// Install - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => 
          key !== STATIC_CACHE && 
          key !== DYNAMIC_CACHE && 
          key !== MEDIA_CACHE
        ).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Limit cache size
const limitCacheSize = (cacheName, maxItems) => {
  caches.open(cacheName).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(() => limitCacheSize(cacheName, maxItems));
      }
    });
  });
};

// Fetch handler with advanced caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle different resource types
  if (isMediaRequest(request)) {
    event.respondWith(cacheFirstWithNetwork(request, MEDIA_CACHE));
  } else if (isApiRequest(request)) {
    event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
  } else if (isStaticAsset(request)) {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
  } else {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  }
});

// Check if request is for media (images/videos)
function isMediaRequest(request) {
  const url = request.url;
  return url.includes('supabase.co/storage') || 
         url.match(/\.(jpg|jpeg|png|gif|webp|mp4|webm|mp3)(\?|$)/i);
}

// Check if request is for API
function isApiRequest(request) {
  return request.url.includes('supabase.co') && 
         !request.url.includes('/storage/');
}

// Check if request is for static asset
function isStaticAsset(request) {
  const url = request.url;
  return url.match(/\.(js|css|woff2?|ttf|eot)(\?|$)/i) ||
         STATIC_ASSETS.some(asset => url.endsWith(asset));
}

// Cache-first strategy with network fallback
async function cacheFirstWithNetwork(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Refresh cache in background
    refreshCache(request, cacheName);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      limitCacheSize(cacheName, cacheName === MEDIA_CACHE ? MEDIA_CACHE_LIMIT : DYNAMIC_CACHE_LIMIT);
    }
    return networkResponse;
  } catch (error) {
    // Return offline placeholder for images
    if (request.url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#eee" width="100%" height="100%"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999" font-size="10">Offline</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    throw error;
  }
}

// Network-first strategy with cache fallback
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request, { 
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      limitCacheSize(cacheName, DYNAMIC_CACHE_LIMIT);
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      caches.open(cacheName).then(cache => {
        cache.put(request, networkResponse.clone());
        limitCacheSize(cacheName, DYNAMIC_CACHE_LIMIT);
      });
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// Refresh cache in background
async function refreshCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silent fail - we have cached version
  }
}

// Push notification handling
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Paji';
  
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

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'content-sync') {
    event.waitUntil(prefetchContent());
  }
});

async function prefetchContent() {
  // Prefetch common API endpoints
  const prefetchUrls = [
    '/api/feed',
    '/api/notifications'
  ];
  
  for (const url of prefetchUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(url, response);
      }
    } catch (error) {
      // Silent fail
    }
  }
}
