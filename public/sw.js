const CACHE_NAME = 'motu-static-v1';
const APP_SHELL = ['/', '/icons/android-icon-192x192.png', '/icons/favicon.ico'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

// Network-first for same-origin GETs only — leaves the backend API
// (different origin) and Supabase Realtime (WebSocket, never hits fetch)
// completely untouched. Cache is just an offline fallback.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const { title = 'Motu', body = '', url = '/', tag } = data;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: '/icons/android-icon-192x192.png',
      badge: '/icons/android-icon-96x96.png',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.navigate(url).then(() => existing.focus());
      return self.clients.openWindow(url);
    })
  );
});
