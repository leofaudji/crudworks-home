// CRUDWorks ERP — Service Worker
const CACHE_NAME = 'crudworks-erp-v1.8.82';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './assets/css/app.css',
    './assets/js/app.js',
    './assets/images/logo.png',
    './assets/icons/icon.svg',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('[SW] Caching failed for some static assets:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. Dynamic API requests are network-first (no cache fallback)
    if (url.pathname.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(JSON.stringify({
                    success: false,
                    message: 'Jaringan offline. Periksa koneksi internet Anda.',
                    offline: true
                }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 503
                });
            })
        );
        return;
    }

    // 2. Navigation & Code assets (HTML, JS, CSS): Network-First, fallback to cache when offline
    if (
        event.request.mode === 'navigate'
        || url.pathname.endsWith('.html')
        || url.pathname.endsWith('/')
        || url.pathname.endsWith('.js')
        || url.pathname.endsWith('.css')
    ) {
        event.respondWith(
            fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                return caches.match(event.request).then((cached) => {
                    return cached || caches.match('./index.html') || caches.match('./');
                });
            })
        );
        return;
    }

    // 3. Static assets: Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => cachedResponse);

            return cachedResponse || fetchPromise;
        })
    );
});
