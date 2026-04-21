/**
 * TKHub - Service Worker
 * Provides offline support, caching, and CORS header injection
 */

const CACHE_NAME = 'tkhub-v1.2.1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/Games/snake.html',
  '/Games/tetris.html'
];

// URLs that need CORS headers for DevTools inspection
const corsEnabledPaths = [
  '/Games/',
  '/games/',
  '.html',
  '.js',
  '.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Check if request should have CORS headers injected
function shouldInjectCors(url) {
  const urlObj = new URL(url);
  return corsEnabledPaths.some(path => 
    urlObj.pathname.includes(path) || 
    urlObj.href.includes(path)
  );
}

// Inject CORS headers into response
function injectCorsHeaders(response) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    event.respondWith(
      new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      })
    );
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          if (shouldInjectCors(url)) {
            return injectCorsHeaders(cachedResponse);
          }
          return cachedResponse;
        }
        
        // Fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Clone response for caching
            const responseToCache = networkResponse.clone();
            
            // Cache successful GET requests
            if (request.method === 'GET' && networkResponse.status === 200) {
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(request, responseToCache));
            }
            
            // Inject CORS headers for game content
            if (shouldInjectCors(url)) {
              return injectCorsHeaders(networkResponse);
            }
            
            return networkResponse;
          })
          .catch((error) => {
            console.error('Fetch failed:', error);
            return new Response('Network error', { status: 503 });
          });
      })
  );
});
