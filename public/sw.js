const CACHE_NAME = 'fsm-attendance-cache-v1';
const ASSETS_TO_CACHE = [
  '/auth/teacher-login',
  '/teacher/attendance',
  '/FSM.png',
  '/favicon.ico',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching files');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Solo procesar peticiones GET
  if (event.request.method !== 'GET') {
    return;
  }

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  // NUNCA interceptar panel administrativo, APIs, ni Server Actions de Next.js
  if (
    url.pathname.startsWith('/admin') || 
    url.pathname.startsWith('/api') || 
    event.request.headers.get('next-action')
  ) {
    return;
  }

  // Interceptar únicamente rutas de la PWA Docente y assets cacheados
  const isPwaRoute = url.pathname.startsWith('/teacher') || url.pathname.startsWith('/auth/teacher-login');
  const isAsset = ASSETS_TO_CACHE.includes(url.pathname);

  if (!isPwaRoute && !isAsset) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Devolver caché y revalidar en segundo plano
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response);
            });
          }
        }).catch(() => {/* Silenciar fallos offline */});
        
        return cachedResponse;
      }
      return fetch(event.request).catch((err) => {
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    }).catch(() => {
      return fetch(event.request).catch(() => new Response('Offline', { status: 503 }));
    })
  );
});
