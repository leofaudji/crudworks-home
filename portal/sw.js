// CRUDWorks Portal Klien — Service Worker (scope: /portal/)
const CACHE_NAME = 'crudworks-portal-v1.5.29';
const SHELL = [
    './',
    './index.html',
    './app.js',
    './ctx.js',
    './manifest.json',
    './pages/login.js',
    './pages/projects.js',
    './pages/services.js',
    './pages/tickets.js',
    './pages/invoices.js',
    './pages/quotations.js',
    './pages/account.js',
    '../assets/js/core/utils.js',
    '../assets/js/core/email-editor.js',
    '../assets/images/logo.png',
    '../assets/icons/icon.svg',
    '../assets/icons/icon-192.png',
    '../assets/icons/icon-512.png'
];
const CDN_HOSTS = ['cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            Promise.all(SHELL.map((url) => cache.add(url).catch(() => null)))
        ).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k.startsWith('crudworks-portal-') && k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Data klien tidak pernah disimpan oleh service worker
    if (url.origin === self.location.origin && url.pathname.includes('/api/')) return;

    if (url.origin === self.location.origin) {
        // Network-first: kode selalu terbaru, cache sebagai cadangan offline
        event.respondWith(
            fetch(req)
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
        );
        return;
    }

    if (CDN_HOSTS.includes(url.hostname)) {
        // Stale-while-revalidate untuk pustaka CDN
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) =>
                cache.match(req).then((hit) => {
                    const network = fetch(req)
                        .then((res) => {
                            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
                            return res;
                        })
                        .catch(() => hit);
                    return hit || network;
                })
            )
        );
    }
});
