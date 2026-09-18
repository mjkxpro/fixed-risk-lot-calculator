const CACHE = 'fixed-risk-calculator-v1';
const ASSETS = ['./','./index.html','./styles.css','./manifest.json','./src/app.js','./src/calculator.js','./src/instruments.js','./src/rates.js','./src/storage.js','./icons/icon.svg'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (event) => event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => { if (event.request.method === 'GET' && response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, copy)); } return response; }).catch(() => caches.match('./index.html')))));
