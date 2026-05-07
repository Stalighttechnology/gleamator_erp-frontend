// Service Worker for handling navigation fallback
const CACHE_NAME = 'neuro-frontend-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle navigation requests for SPA fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If server responded OK, return it
          if (response && response.ok) return response;
          // Otherwise try to return cached index.html as SPA fallback
          return caches.match('/index.html') || fetch('/index.html');
        })
        .catch(() => {
          return caches.match('/index.html') || fetch('/index.html');
        })
    );
    return;
  }

  // For other requests, try cache first, then network as usual
  event.respondWith(
    caches.match(request)
      .then((response) => response || fetch(request))
  );
});