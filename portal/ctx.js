// portal/ctx.js — State bersama & helper UI untuk halaman modular Portal Klien
import { formatIDR, formatDate, escapeHtml as esc } from '../assets/js/core/utils.js';

export { esc };

export const API_BASE = new URL('../api/', location.href).pathname.replace(/\/$/, '');
export const ROOT_URL = new URL('../', location.href).href;

export const state = {
    csrf: '',
    client: null,
    data: null,
    tab: 'projects',
    offlineAt: null,
    loadedAt: 0,
    loading: false,
    ticketFilter: '',
    invoiceSubTab: 'invoices',
    invoiceFilter: '',
    invoiceSearch: ''
};

export const $ = (sel, root = document) => root.querySelector(sel);
export const money = (v) => formatIDR(Number(v || 0));
export const fdate = (v) => (v ? formatDate(v) : '-');

const DOT_TONES = {
    green: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900',
    red: 'text-rose-700 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-900',
    amber: 'text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900',
    indigo: 'text-indigo-700 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200/80 dark:border-indigo-900',
    slate: 'text-slate-600 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
};

const DOT_COLORS = {
    green: 'bg-emerald-500',
    red: 'bg-rose-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
    slate: 'bg-slate-400'
};

export const badge = (text, tone = 'slate') =>
    `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium ${DOT_TONES[tone] || DOT_TONES.slate}"><span class="w-1.5 h-1.5 rounded-full ${DOT_COLORS[tone] || DOT_COLORS.slate}"></span>${esc(text)}</span>`;

export const sectionTitle = (title, rightHtml = '') => `
    <div class="flex items-center justify-between gap-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">${title}</h2>
        ${rightHtml}
    </div>`;

export const panel = (inner, extra = '') =>
    `<div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 ${extra}">${inner}</div>`;

export const empty = (text) =>
    panel(`<div class="py-10 px-4 text-center text-xs text-slate-400">${text}</div>`);

export function toast(message, type = 'info') {
    const root = $('#toast-root');
    if (!root) return;
    const tone = { success: 'bg-emerald-700', error: 'bg-rose-700', warning: 'bg-amber-600', info: 'bg-slate-900' }[type] || 'bg-slate-900';
    const icon = { success: 'ri-check-line', error: 'ri-error-warning-line', warning: 'ri-alert-line', info: 'ri-information-line' }[type];
    const el = document.createElement('div');
    el.className = `fade-in pointer-events-auto max-w-sm w-full flex items-center gap-2.5 ${tone} text-white text-xs font-medium px-3.5 py-2.5 rounded-xl shadow-lg`;
    el.innerHTML = `<i class="${icon} text-base shrink-0"></i><span class="leading-snug">${esc(message)}</span>`;
    root.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .2s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 220); }, 3400);
}

let activeBlobUrl = null;
export function setActiveBlobUrl(url) {
    if (activeBlobUrl) URL.revokeObjectURL(activeBlobUrl);
    activeBlobUrl = url;
}

export function openModal(html, { sheet = true, wide = false, onClose = null } = {}) {
    closeModal();
    const root = $('#modal-root');
    const widthCls = wide ? 'sm:max-w-3xl' : 'sm:max-w-xl';
    root.innerHTML = `
        <div id="modal-overlay" class="fixed inset-0 z-[80] bg-slate-950/50 backdrop-blur-[2px] flex ${sheet ? 'items-end sm:items-center' : 'items-center'} justify-center sm:p-4" data-action="modal-backdrop">
            <div class="${sheet ? 'sheet-in' : 'fade-in'} w-full ${widthCls} max-h-[90vh] overflow-y-auto overscroll-contain bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-0" data-modal-body>
                ${html}
            </div>
        </div>`;
    document.body.style.overflow = 'hidden';
    root._onClose = onClose;
}

export function openPdfPreviewModal(title, url, filename) {
    openModal(`
        <div class="p-4 sm:p-5 space-y-3">
            <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-bold truncate font-mono text-slate-900 dark:text-white">${esc(title)}</h3>
                <button data-action="close-modal" class="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center" aria-label="Tutup"><i class="ri-close-line text-xl"></i></button>
            </div>
            <iframe src="${url}" title="${esc(title)}" class="block w-full h-[70vh] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100"></iframe>
            <div class="flex items-center justify-end gap-2">
                <button type="button" data-action="close-modal" class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold">Tutup</button>
                <a href="${url}" download="${esc(filename)}" class="px-4 py-2 rounded-lg bg-slate-900 dark:bg-primary-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"><i class="ri-download-2-line"></i>Unduh PDF</a>
            </div>
        </div>`, { sheet: false, wide: true });
    setActiveBlobUrl(url);
}

export function closeModal() {
    const root = $('#modal-root');
    if (!root) return;
    if (typeof root._onClose === 'function') { try { root._onClose(); } catch (_) {} }
    root._onClose = null;
    root.innerHTML = '';
    document.body.style.overflow = '';
    if (activeBlobUrl) { URL.revokeObjectURL(activeBlobUrl); activeBlobUrl = null; }
}

export const hooks = {
    onUnauthorized: () => {},
    reloadData: async () => {},
    renderApp: () => {},
    switchTab: () => {},
    logout: async () => {},
    installApp: async () => {},
    canOfferInstall: () => false
};

export async function api(endpoint, { method = 'GET', body = null, silent = false } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== null) headers['Content-Type'] = 'application/json';
    if (method !== 'GET' && state.csrf) headers['X-CSRF-Token'] = state.csrf;

    try {
        const res = await fetch(`${API_BASE}/${endpoint}`, {
            method,
            headers,
            credentials: 'same-origin',
            body: body !== null ? JSON.stringify(body) : undefined
        });
        let json = null;
        try { json = await res.json(); } catch (_) { json = { success: false, message: `HTTP ${res.status}` }; }

        if (res.status === 401 && endpoint !== 'portal-auth/login' && endpoint !== 'portal-auth/me') {
            hooks.onUnauthorized();
            return { success: false, message: json.message || 'Sesi berakhir', code: 401 };
        }
        if (json && json.success === false && !silent) toast(json.message || 'Permintaan gagal', 'error');
        return json;
    } catch (_) {
        if (!silent) toast('Tidak dapat terhubung ke server', 'error');
        return { success: false, network_error: true, message: 'Tidak dapat terhubung ke server' };
    }
}
