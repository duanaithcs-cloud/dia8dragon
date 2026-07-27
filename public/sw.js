const VERSION = '3.5.0.5-dia8';
const PREFIX = 'dia8-mobile';
const CACHES = {
  shell: `${PREFIX}-shell-${VERSION}`,
  quiz: `${PREFIX}-quiz-${VERSION}`,
  documents: `${PREFIX}-documents-${VERSION}`,
  images: `${PREFIX}-images-${VERSION}`
};

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/app-local.css',
  './mobile.css',
  './mobile-runtime.js',
  './data/topics/manifest.json',
  './data/quiz/topics/manifest.json',
  './documents/learning-library/catalog.json'
];

const LIMITS = {
  [CACHES.shell]: { entries: 80, maxBytes: 10 * 1024 * 1024 },
  [CACHES.quiz]: { entries: 80, maxBytes: 6 * 1024 * 1024 },
  [CACHES.documents]: { entries: 16, maxBytes: 16 * 1024 * 1024 },
  [CACHES.images]: { entries: 80, maxBytes: 4 * 1024 * 1024 }
};

const trimCache = async (cacheName, maxEntries) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maxEntries)).map(key => cache.delete(key)));
};

const responseSize = response => Number(response.headers.get('content-length') || 0);
const canStore = (cacheName, response) => {
  if (!response || response.status !== 200 || response.type === 'opaque') return false;
  const maxBytes = LIMITS[cacheName]?.maxBytes || 0;
  const bytes = responseSize(response);
  return !bytes || bytes <= maxBytes;
};

const store = async (cacheName, request, response) => {
  if (!canStore(cacheName, response)) return;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    await trimCache(cacheName, LIMITS[cacheName].entries);
  } catch (error) {
    if (error?.name !== 'QuotaExceededError') console.warn('PWA cache write failed', error);
  }
};

const cacheFirst = async (request, cacheName) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  await store(cacheName, request, response);
  return response;
};

const networkFirst = async (request, cacheName, fallback) => {
  try {
    const response = await fetch(request);
    await store(cacheName, request, response);
    return response;
  } catch {
    return (await caches.match(request)) || (fallback ? await caches.match(fallback) : Response.error());
  }
};

const staleWhileRevalidate = async (request, cacheName) => {
  const cached = await caches.match(request);
  const network = fetch(request).then(async response => {
    await store(cacheName, request, response);
    return response;
  }).catch(() => null);
  return cached || (await network) || Response.error();
};

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHES.shell);
    await Promise.allSettled(APP_SHELL.map(url => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const current = new Set(Object.values(CACHES));
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && !current.has(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, CACHES.shell, './index.html'));
    return;
  }

  const path = url.pathname.toLowerCase();
  if (path.endsWith('.pdf') || path.endsWith('.docx')) {
    event.respondWith(networkFirst(event.request, CACHES.documents));
    return;
  }
  if (path.includes('/data/quiz/') || path.endsWith('/quiz-evidence.json')) {
    event.respondWith(cacheFirst(event.request, CACHES.quiz));
    return;
  }
  if (/\.(?:png|jpe?g|webp|svg|gif)$/.test(path)) {
    event.respondWith(cacheFirst(event.request, CACHES.images));
    return;
  }
  if (path.includes('/data/topics/') || path.includes('/documents/') || /\.(?:js|css|json|webmanifest)$/.test(path)) {
    event.respondWith(staleWhileRevalidate(event.request, CACHES.shell));
  }
});
