const CACHE_NAME = 'crm-josefina-v1';
const ASSETS_TO_CACHE = [
  './',
  'login.html',
  'index.html',
  'dashboard.html',
  'prospectos.html',
  'mobile_prospecto.html',
  'mobile_bitacora.html',
  'mobile_mapa.html',
  'assets/css/styles.css',
  'assets/js/app.js',
  'assets/img/logo_santajosefina.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css'
];

// 1. Instalación: Guardar archivos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando App Shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// 2. Activación: Limpiar cachés viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
});

// 3. Interceptación de red (Estrategia: Network First para API, Cache First para Assets)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // A. Si es una llamada a la API (AppSheet), NO usar caché (siempre datos frescos)
  if (url.host.includes('api.appsheet.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // B. Si son archivos de la App (HTML, CSS, JS), usar caché primero
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en caché, devolverlo. Si no, ir a internet.
        return response || fetch(event.request);
      })
  );
});