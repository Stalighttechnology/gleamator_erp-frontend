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
  const url = new URL(request.url);

  // Skip caching for API routes (localhost or any /api/ requests)
  if (url.pathname.startsWith('/api/') || 
      url.hostname === 'localhost' || 
      url.hostname === '127.0.0.1') {
    console.log("[SW] Skipping cache for API route:", request.url);
    event.respondWith(fetch(request));
    return;
  }

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
          console.error("[SW] Navigation fetch failed, returning cached index.html");
          return caches.match('/index.html') || fetch('/index.html');
        })
    );
    return;
  }

  // For other requests (non-API, non-navigate)
  // Only cache successful GET requests
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            console.log("[SW] Cache hit for:", request.url);
            return response;
          }
          
          return fetch(request).then((networkResponse) => {
            // Only cache successful responses
            if (!networkResponse || !networkResponse.ok) {
              console.warn("[SW] Not caching failed response for:", request.url, networkResponse?.status);
              return networkResponse;
            }
            
            // Cache successful response
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
              console.log("[SW] Cached:", request.url);
            });
            
            return networkResponse;
          }).catch((error) => {
            console.error("[SW] Network request failed for:", request.url, error);
            // Fall back to cached version if available
            return caches.match(request) || fetch(request);
          });
        })
    );
    return;
  }

  // For non-GET requests (POST, PUT, DELETE, etc.), never cache
  console.log("[SW] Not caching non-GET request:", request.method, request.url);
  event.respondWith(fetch(request).catch((error) => {
    console.error("[SW] Request failed:", request.method, request.url, error);
    throw error;
  }));
});
