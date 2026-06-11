const CACHE = 'kal-counter-v1';

const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js',
];

// Installation — mise en cache des assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activation — suppression des anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache d'abord, réseau en fallback
self.addEventListener('fetch', e => {
  // Ne pas intercepter les appels API (Anthropic, OpenAI, Gemini, OpenFoodFacts)
  const url = e.request.url;
  if (
    url.includes('anthropic.com') ||
    url.includes('openai.com') ||
    url.includes('googleapis.com/v1beta') ||
    url.includes('openfoodfacts.org')
  ) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Mettre en cache les nouvelles ressources statiques
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Hors ligne : retourner index.html pour la navigation
      if (e.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
