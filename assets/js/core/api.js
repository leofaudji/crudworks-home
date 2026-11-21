// ============================================
// CORE API CLIENT - Fetch Wrapper, Cache, Promise Pooling & CSRF
// ============================================
import { toast } from './utils.js';

export class ApiClient {
    constructor() {
        this._apiCache = {};
        this._inFlight = {};
        this.csrfToken = '';
        this.onUnauthorized = null;

        this._masterDataEndpoints = [
            'clients',
            'services',
            'roles',
            'settings',
            'menus'
        ];

        // Resolve root path reliably from module URL: <root>assets/js/core/api.js
        let root = '/';
        try {
            const url = new URL(import.meta.url);
            const idx = url.pathname.indexOf('assets/js/core/api.js');
            if (idx !== -1) {
                root = url.pathname.substring(0, idx);
            }
        } catch (_) {
            const p = window.location.pathname;
            root = p.substring(0, p.lastIndexOf('/') + 1);
        }
        this.ROOT_BASE = root.endsWith('/') ? root : root + '/';
        this.API_BASE = this.ROOT_BASE + 'api';
    }

    setCsrfToken(token) {
        this.csrfToken = token || '';
    }

    setUnauthorizedHandler(fn) {
        this.onUnauthorized = fn;
    }

    /**
     * Clear in-memory API cache (full or by endpoint prefix)
     */
    clearCache(prefix = '') {
        if (!prefix) {
            this._apiCache = {};
            return;
        }
        Object.keys(this._apiCache).forEach((key) => {
            if (key === prefix || key.startsWith(prefix + '/') || key.startsWith(prefix + '?')) {
                delete this._apiCache[key];
            }
        });
    }

    /**
     * Cached GET request with custom TTL
     */
    async cachedApi(endpoint, ttlMs = 300000, options = {}) {
        return this.api(endpoint, { ...options, cache: true, ttl: ttlMs });
    }

    /**
     * Core AJAX helper with auto-cache, in-flight deduplication, CSRF & FormData support
     */
    async api(endpoint, options = {}, maybeBody = null) {
        // Polymorphic overload support: App.api(url, 'POST', payload) or App.api(url, 'DELETE')
        if (typeof options === 'string') {
            const method = options.toUpperCase();
            options = { method };
            if (maybeBody !== null && maybeBody !== undefined) {
                options.body = maybeBody;
            }
        }

        const cleanEp = String(endpoint || '').replace(/^\//, '');
        const method = (options.method || 'GET').toUpperCase();
        const isGet = method === 'GET';

        // 1. Master data cache check
        const isMasterData = isGet && (options.cache !== false) && (
            options.cache === true ||
            this._masterDataEndpoints.some((ep) => cleanEp === ep || cleanEp.startsWith(ep + '?'))
        );

        if (isMasterData && this._apiCache[cleanEp] && this._apiCache[cleanEp].exp > Date.now()) {
            return JSON.parse(JSON.stringify(this._apiCache[cleanEp].data));
        }

        // 2. In-flight promise pooling for GET requests
        if (isGet && this._inFlight[cleanEp]) {
            return this._inFlight[cleanEp];
        }

        const url = `${this.API_BASE}/${cleanEp}`;
        const headers = { ...(options.headers || {}) };
        const config = {
            method,
            headers,
            credentials: 'same-origin'
        };

        const reqBody = options.body !== undefined ? options.body : options.data;
        const isFormData = typeof FormData !== 'undefined' && reqBody instanceof FormData;
        if (!isFormData && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        // Attach CSRF token on mutating HTTP methods
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && this.csrfToken) {
            headers['X-CSRF-Token'] = this.csrfToken;
        }

        // Attach Idempotency-Key for sensitive transactional POST requests if not specified
        if (method === 'POST' && !headers['X-Idempotency-Key'] && (cleanEp.startsWith('transaksi') || cleanEp.startsWith('modal'))) {
            try {
                headers['X-Idempotency-Key'] = (typeof crypto !== 'undefined' && crypto.randomUUID)
                    ? crypto.randomUUID()
                    : (Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9));
            } catch (_) {}
        }

        if (reqBody !== undefined && reqBody !== null) {
            if (isFormData) {
                config.body = reqBody;
                delete headers['Content-Type'];
            } else if (typeof reqBody === 'string') {
                config.body = reqBody;
            } else {
                config.body = JSON.stringify(reqBody);
            }
        }

        const requestPromise = (async () => {
            try {
                const res = await fetch(url, config);
                let data = null;
                const contentType = res.headers.get('content-type') || '';

                if (contentType.includes('application/json')) {
                    data = await res.json();
                } else {
                    const rawText = await res.text();
                    try {
                        data = JSON.parse(rawText);
                    } catch (_) {
                        data = { success: res.ok, message: rawText || `HTTP ${res.status}` };
                    }
                }

                if (res.status === 401) {
                    const isPublicRoute = (typeof window !== 'undefined' && (window.location.hash || '').startsWith('#/public-invoice'));
                    if (!cleanEp.includes('auth/login') && !cleanEp.includes('auth/me') && !isPublicRoute) {
                        if (typeof this.onUnauthorized === 'function') {
                            this.onUnauthorized();
                        }
                    }
                    return data || { success: false, message: 'Username atau password salah' };
                }

                if (data && data.success === false && !options.silent) {
                    toast(data.message || `Permintaan gagal (HTTP ${res.status})`, 'error');
                }

                // Store in cache if master data GET succeeded
                if (isMasterData && data && data.success) {
                    this._apiCache[cleanEp] = {
                        data,
                        exp: Date.now() + (options.ttl || 300000)
                    };
                }

                // Invalidate related caches on mutations
                if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && data && data.success) {
                    const epBase = cleanEp.split('/')[0].split('?')[0];
                    this.clearCache(epBase);
                    if (epBase === 'modal' || epBase === 'bagi-hasil' || epBase === 'transaksi') {
                        this.clearCache('mitra');
                        this.clearCache('dashboard');
                    }
                    if (epBase === 'coa' || epBase === 'kategori') {
                        this.clearCache('coa');
                        this.clearCache('kategori');
                    }
                }

                return data;
            } catch (err) {
                console.error('[ApiClient] Network Error:', err);
                if (!options.silent) {
                    const errMsg = (err && err.message) ? err.message : '';
                    toast(`Gagal menghubungi server: ${errMsg || 'Periksa koneksi Anda.'}`, 'error');
                }
                return {
                    success: false,
                    network_error: true,
                    message: (err && err.message) ? err.message : 'Gagal menghubungi server. Periksa koneksi Anda.'
                };
            } finally {
                if (isGet) {
                    delete this._inFlight[cleanEp];
                }
            }
        })();

        if (isGet) {
            this._inFlight[cleanEp] = requestPromise;
        }

        return requestPromise;
    }
}

export const apiClient = new ApiClient();
export const api = (endpoint, options) => apiClient.api(endpoint, options);
export const cachedApi = (endpoint, ttlMs, options) => apiClient.cachedApi(endpoint, ttlMs, options);
export const clearApiCache = (prefix) => apiClient.clearCache(prefix);
