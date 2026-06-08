const CACHE_NAME = 'oc-dinosaur-ar-v3';
const CORE_ASSETS = [
  './',
  './index.html',
  './ar.html',
  './collection.html',
  './game.html',
  './css/common.css',
  './css/ar.css',
  './js/dinosaurs.js',
  './js/collection.js',
  './js/preload.js',
  './js/ar-main.js',
  './js/collection-page.js',
  './js/game.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      });
    })
  );
});
