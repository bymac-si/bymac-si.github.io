// ============================================================================
// Service worker del CRM Santa Josefina
//
// Estrategia:
//  - Páginas, scripts, estilos y header/footer: RED PRIMERO. Siempre se baja la versión nueva;
//    la copia guardada solo se usa sin conexión o si la red tarda demasiado. Así una corrección
//    llega a todos en la siguiente carga y nunca queda un app.js viejo atrapado en la caché.
//  - Imágenes y fuentes propias: caché primero (casi nunca cambian).
//  - Librerías de CDN (Bootstrap, Font Awesome, Chart.js, fuentes): caché y actualización en segundo plano.
//  - NUNCA se guardan ni se interceptan los datos: Apps Script (script.google.com) y cualquier
//    otra API externa pasan directo a la red, igual que todo lo que no sea GET.
// ============================================================================

const CACHE_PREFIX = 'crm-josefina-';
const CACHE_NAME = CACHE_PREFIX + 'v4'; // al subir de versión se borran las cachés anteriores (v3 incluía app.js con AppSheet)
const ESPERA_RED_MS = 3500;             // con copia guardada, si la red tarda más se muestra la copia

// Nunca interceptar: aquí viajan los datos del CRM.
const SIN_INTERCEPTAR = ['script.google.com', 'script.googleusercontent.com'];
// Los únicos sitios externos que se guardan (librerías y fuentes públicas).
const CDN_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

// Se guardan al instalar. Si alguna no existe (404) se omite y la instalación continúa.
const ASSETS_PROPIOS = [
  './',
  'login.html',
  'cambiar_clave.html',
  'index.html',
  'dashboard.html',
  'mobile_dashboard.html',
  'prospectos.html',
  'mobile_prospecto.html',
  'mobile_bitacora.html',
  'mobile_mapa.html',
  'header.html',
  'footer.html',
  'manifest.json',
  'assets/css/styles.css',
  'assets/js/api_cliente.js',
  'assets/js/app.js',
  'assets/img/logo_santajosefina.png',
];
const ASSETS_CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
];

// Las copias de páginas con parámetros (?id=...) se guardan sin ellos: el HTML es el mismo.
function llave(req) {
  const u = new URL(req.url);
  return new Request(u.origin + u.pathname);
}

async function guardarPropio(cache, ruta) {
  const resp = await fetch(new Request(ruta, { cache: 'reload' })); // sin pasar por la caché HTTP del navegador
  if (!resp.ok) throw new Error('No disponible: ' + ruta);
  await cache.put(new Request(ruta), resp);
}

async function guardarCdn(cache, url) {
  const resp = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (resp.ok) await cache.put(url, resp);
}

function sinConexion() {
  return new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Sin conexión</title><body style="font-family:sans-serif;text-align:center;padding:48px;color:#1e293b">' +
    '<h1>Sin conexión</h1><p>No se pudo cargar esta página. Revisa tu conexión e inténtalo de nuevo.</p>' +
    '<p><a href="login.html">Volver al inicio</a></p></body>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// 1. Instalación
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled([
      ...ASSETS_PROPIOS.map(a => guardarPropio(cache, a)),
      ...ASSETS_CDN.map(u => guardarCdn(cache, u)),
    ]);
    await self.skipWaiting();
  })());
});

// 2. Activación: borra solo las cachés antiguas de ESTE CRM.
// (GitHub Pages comparte el origen con otros sitios de la misma cuenta; no se toca nada ajeno.)
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(
      claves.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// --- Estrategias ---
async function redPrimero(req) {
  const cache = await caches.open(CACHE_NAME);
  const key = llave(req);
  const copia = await cache.match(key);
  // 'no-cache': siempre revalida con el servidor (barato si no cambió).
  const red = fetch(new Request(req, { cache: 'no-cache' })).then(resp => {
    if (resp.ok) cache.put(key, resp.clone());
    return resp;
  });
  if (!copia) {
    return red.catch(() => (req.mode === 'navigate' ? sinConexion() : Response.error()));
  }
  const limite = new Promise(resolve => setTimeout(() => resolve(copia), ESPERA_RED_MS));
  return Promise.race([red, limite]).catch(() => copia);
}

async function cachePrimero(req) {
  const cache = await caches.open(CACHE_NAME);
  const key = llave(req);
  const copia = await cache.match(key);
  if (copia) return copia;
  const resp = await fetch(req);
  if (resp.ok) cache.put(key, resp.clone());
  return resp;
}

async function cacheYActualizar(req) {
  const cache = await caches.open(CACHE_NAME);
  const copia = await cache.match(req.url);
  // Se pide en modo CORS para poder guardar la respuesta (las "opacas" no se guardan).
  const red = fetch(req.url, { mode: 'cors', credentials: 'omit' })
    .catch(() => fetch(req))
    .then(resp => {
      if (resp.ok && resp.type !== 'opaque') cache.put(req.url, resp.clone());
      return resp;
    });
  if (copia) { red.catch(() => {}); return copia; }
  return red;
}

// 3. Interceptación de red
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;                       // escrituras y datos: directo a la red
  const url = new URL(req.url);
  if (SIN_INTERCEPTAR.includes(url.hostname)) return;     // Apps Script: directo a la red

  if (url.origin === self.location.origin) {
    if (req.destination === 'image' || req.destination === 'font') event.respondWith(cachePrimero(req));
    else event.respondWith(redPrimero(req));
    return;
  }
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheYActualizar(req));
    return;
  }
  // Cualquier otro sitio externo (por ejemplo la API de la UTM): directo a la red, sin guardar nada.
});