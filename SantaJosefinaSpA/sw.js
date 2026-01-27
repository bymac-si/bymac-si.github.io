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

// 1. Instalación
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// 2. Activación
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })
  );
});

// 3. Interceptación de red
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // EXCEPCIÓN CRÍTICA: Google Scripts y AppSheet pasan DIRECTO a la red
  if (url.includes('script.google.com') || url.includes('api.appsheet.com')) {
    return; // No interceptamos, el navegador maneja la petición
  }

  // Estrategia para Assets: Cache First
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});