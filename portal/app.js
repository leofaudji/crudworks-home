// portal/app.js — Core Orchestrator Portal Klien (PWA)
import { $, esc, money, api, toast, openModal, closeModal, state, hooks } from './ctx.js';
import { renderLogin } from './pages/login.js';
import { renderProjects, previewBastPdf, openSignModal } from './pages/projects.js';
import { renderServices, revealPortalCredential } from './pages/services.js';
import { renderTickets, openNewTicketModal, openTicketDetailModal } from './pages/tickets.js';
import { renderInvoices, renderFilteredInvoiceList, previewInvoicePdf, openPayInvoiceModal, previewPaymentReceiptPdf } from './pages/invoices.js';
import { renderQuotations, previewQuotationPdf, openQuotationSignModal, openContractSignModal, previewContractPdf } from './pages/quotations.js';
import { openAccountModal } from './pages/account.js';

const SNAPSHOT_KEY = 'crudworks_portal_snapshot';
let deferredInstall = null;

const TABS = [
    { key: 'projects', label: 'Proyek & BAST', short: 'Proyek', icon: 'ri-kanban-view' },
    { key: 'services', label: 'Layanan', short: 'Layanan', icon: 'ri-apps-2-line' },
    { key: 'tickets', label: 'Tiket Gangguan', short: 'Tiket', icon: 'ri-customer-service-2-line' },
    { key: 'invoices', label: 'Faktur', short: 'Faktur', icon: 'ri-file-list-3-line' },
    { key: 'quotations', label: 'Penawaran', short: 'Penawaran', icon: 'ri-file-paper-2-line' }
];

const TAB_RENDERERS = {
    projects: renderProjects,
    services: renderServices,
    tickets: renderTickets,
    invoices: renderInvoices,
    quotations: renderQuotations
};

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const canOfferInstall = () => !isStandalone() && (!!deferredInstall || isIos());

async function installApp() {
    if (deferredInstall) {
        deferredInstall.prompt();
        try { await deferredInstall.userChoice; } catch (_) {}
        deferredInstall = null;
        document.querySelectorAll('[data-install]').forEach((b) => b.classList.add('hidden'));
    } else if (isIos()) {
        openModal(`
            <div class="p-6 space-y-3 text-sm">
                <h3 class="text-base font-bold">Pasang di iPhone / iPad</h3>
                <ol class="list-decimal pl-5 space-y-1.5 text-slate-600 dark:text-slate-300">
                    <li>Buka halaman ini di <b>Safari</b>.</li>
                    <li>Ketuk tombol <b>Bagikan</b> <i class="ri-share-box-line"></i>.</li>
                    <li>Pilih <b>Tambah ke Layar Utama</b>.</li>
                </ol>
                <button data-action="close-modal" class="w-full mt-2 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-sm">Mengerti</button>
            </div>`);
    }
}

function refreshInstallButtons() {
    document.querySelectorAll('[data-install]').forEach((b) => b.classList.toggle('hidden', !canOfferInstall()));
}

function saveSnapshot() {
    try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ client: state.client, data: state.data, at: Date.now() })); } catch (_) {}
}
function loadSnapshot() {
    try { return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || 'null'); } catch (_) { return null; }
}
function clearSession() {
    state.csrf = ''; state.client = null; state.data = null; state.offlineAt = null;
    try { localStorage.removeItem(SNAPSHOT_KEY); } catch (_) {}
}

function handleSessionExpired() {
    if (!state.client) return;
    clearSession();
    closeModal();
    renderLogin('Sesi Anda telah berakhir. Silakan masuk kembali.');
}

async function loadData({ silent = false } = {}) {
    if (state.loading) return;
    state.loading = true;
    const res = await api('portal-auth/data', { silent: true });
    state.loading = false;

    if (res.success) {
        state.data = res.data;
        state.client = { ...state.client, ...res.data.client };
        state.offlineAt = null;
        state.loadedAt = Date.now();
        saveSnapshot();
        if (!silent) toast('Data diperbarui', 'success');
    } else if (res.network_error) {
        const snap = loadSnapshot();
        if (snap?.data) {
            state.data = snap.data;
            state.offlineAt = snap.at;
        }
        if (!silent) toast('Offline — menampilkan data tersimpan', 'warning');
    }
    if (state.client && state.data) renderApp();
}

async function logout() {
    await api('portal-auth/logout', { method: 'POST', silent: true });
    clearSession();
    closeModal();
    renderLogin();
    toast('Anda telah keluar', 'info');
}

Object.assign(hooks, {
    onUnauthorized: handleSessionExpired,
    reloadData: loadData,
    renderApp,
    switchTab: (tab) => { state.tab = tab; renderNav(); renderTab(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    logout,
    installApp,
    canOfferInstall
});

function tabBadge(key) {
    const k = state.data?.kpi || {};
    const r = state.data?.reminders || {};
    if (key === 'projects' && k.pending_basts > 0) return k.pending_basts;
    if (key === 'tickets' && k.open_tickets > 0) return k.open_tickets;
    if (key === 'invoices' && k.unpaid_invoices > 0) return k.unpaid_invoices;
    if (key === 'quotations' && ((r.pending_quotations || 0) + (r.pending_contracts || 0)) > 0) return (r.pending_quotations || 0) + (r.pending_contracts || 0);
    return 0;
}

function renderReminders(r = {}) {
    const pills = [];
    if (r.pending_basts > 0) {
        pills.push({ tab: 'projects', tone: 'amber', icon: 'ri-quill-pen-line', text: `${r.pending_basts} BAST menunggu pengesahan` });
    }
    if (r.waiting_tickets > 0) {
        pills.push({ tab: 'tickets', tone: 'indigo', icon: 'ri-mail-unread-line', text: `${r.waiting_tickets} tiket menunggu balasan Anda` });
    }
    if (r.due_invoices > 0) {
        pills.push({ tab: 'invoices', tone: r.overdue_invoices > 0 ? 'rose' : 'amber', icon: 'ri-file-warning-line', text: r.overdue_invoices > 0 ? `${r.overdue_invoices} faktur melewati jatuh tempo` : `${r.due_invoices} faktur belum lunas` });
    }
    if (r.expiring_assets > 0) {
        pills.push({ tab: 'services', tone: 'rose', icon: 'ri-shield-flash-line', text: `${r.expiring_assets} domain/SSL segera kedaluwarsa` });
    }
    if (r.pending_quotations > 0) {
        pills.push({ tab: 'quotations', tone: 'indigo', icon: 'ri-file-paper-2-line', text: `${r.pending_quotations} penawaran menunggu persetujuan` });
    }
    if (r.pending_contracts > 0) {
        pills.push({ tab: 'quotations', tone: 'amber', icon: 'ri-file-shield-2-line', text: `${r.pending_contracts} kontrak/SPK menunggu tanda tangan` });
    }
    if (!pills.length) return '';

    const styles = {
        amber: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100',
        rose: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 hover:bg-rose-100',
        indigo: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100'
    };

    return `
        <div class="flex flex-wrap gap-2">
            ${pills.map((p) => `
                <button type="button" data-action="tab" data-tab="${p.tab}" class="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${styles[p.tone]}">
                    <i class="${p.icon}"></i>
                    <span>${esc(p.text)}</span>
                    <i class="ri-arrow-right-s-line"></i>
                </button>`).join('')}
        </div>`;
}

function renderApp() {
    const { client, data } = state;
    if (!client || !data) return;
    const company = data.company || {};
    const kpi = data.kpi || {};
    const remindersHtml = renderReminders(data.reminders || {});
    const initials = (client.penanggung_jawab || client.nama_perusahaan || '?').trim().charAt(0).toUpperCase();

    $('#app').innerHTML = `
        <div class="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 md:pb-12">
            <!-- Top Navigation Bar -->
            <header class="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200/90 dark:border-slate-800 pt-[env(safe-area-inset-top)]">
                <div class="max-w-5xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4" style="height: 3.75rem;">
                    <div class="flex items-center gap-3 min-w-0">
                        <img src="../assets/images/logo.png" alt="CRUDWorks" class="h-6 w-auto object-contain shrink-0" onerror="this.style.display='none'">
                        <div class="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                        <div class="min-w-0 leading-tight">
                            <div class="text-xs font-bold truncate text-slate-900 dark:text-white">${esc(client.nama_perusahaan)}</div>
                            <div class="text-[10px] font-mono text-slate-400 hidden sm:block">${esc(client.kode_klien)}</div>
                        </div>
                    </div>

                    <nav id="desktop-nav" class="hidden md:flex items-center gap-1 h-full"></nav>

                    <div class="flex items-center gap-2 shrink-0">
                        <button data-action="ticket-new" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-xs">
                            <i class="ri-add-line"></i><span class="hidden sm:inline">Lapor Gangguan</span><span class="sm:hidden">Tiket</span>
                        </button>
                        <button data-action="refresh" class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition" aria-label="Segarkan data" title="Segarkan">
                            <i id="refresh-icon" class="ri-refresh-line text-sm"></i>
                        </button>
                        <button data-action="account" class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center transition hover:bg-indigo-100" aria-label="Akun">
                            ${esc(initials)}
                        </button>
                    </div>
                </div>
            </header>

            <div id="offline-banner" class="${state.offlineAt || !navigator.onLine ? '' : 'hidden'} bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-[11px] font-medium text-center px-4 py-1.5">
                Mode offline — menampilkan data tersimpan${state.offlineAt ? ` (${esc(new Date(state.offlineAt).toLocaleString('id-ID'))})` : ''}
            </div>

            <main class="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                <!-- Executive Header & 4-Cell Metric Strip -->
                <section class="space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                        <div>
                            <div class="text-xs font-medium text-slate-500">Selamat datang kembali, <span class="text-slate-800 dark:text-slate-200 font-semibold">${esc(client.penanggung_jawab || client.nama_perusahaan)}</span></div>
                            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">${esc(client.nama_perusahaan)}</h1>
                        </div>
                    </div>
                    ${remindersHtml}

                    <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)] grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-slate-200/80 dark:divide-slate-800">
                        <button type="button" data-action="tab" data-tab="projects" class="p-4 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition rounded-tl-xl">
                            <div class="text-[11px] font-medium text-slate-500 flex items-center justify-between">
                                <span>Proyek & BAST</span>
                                <i class="ri-kanban-view text-slate-400"></i>
                            </div>
                            <div class="mt-1.5 flex items-baseline gap-2">
                                <span class="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">${kpi.total_projects || 0}</span>
                                <span class="text-[11px] text-slate-500">proyek · ${data.basts?.length || 0} BAST</span>
                            </div>
                        </button>
                        <button type="button" data-action="tab" data-tab="tickets" class="p-4 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition">
                            <div class="text-[11px] font-medium text-slate-500 flex items-center justify-between">
                                <span>Tiket & Layanan</span>
                                <i class="ri-customer-service-2-line text-slate-400"></i>
                            </div>
                            <div class="mt-1.5 flex items-baseline gap-2">
                                <span class="text-lg font-bold font-mono tabular-nums ${(kpi.open_tickets || 0) > 0 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}">${kpi.open_tickets || 0}</span>
                                <span class="text-[11px] text-slate-500">tiket aktif · ${kpi.total_services || 0} layanan</span>
                            </div>
                        </button>
                        <button type="button" data-action="tab" data-tab="invoices" class="p-4 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition">
                            <div class="text-[11px] font-medium text-slate-500 flex items-center justify-between">
                                <span>Total Terbayar</span>
                                <i class="ri-checkbox-circle-line text-emerald-500"></i>
                            </div>
                            <div class="mt-1.5 text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 truncate">${money(kpi.total_paid)}</div>
                        </button>
                        <button type="button" data-action="tab" data-tab="invoices" class="p-4 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition rounded-br-xl">
                            <div class="text-[11px] font-medium text-slate-500 flex items-center justify-between">
                                <span>Sisa Tagihan</span>
                                <i class="ri-file-list-3-line ${(kpi.total_unpaid || 0) > 0 ? 'text-rose-500' : 'text-slate-400'}"></i>
                            </div>
                            <div class="mt-1.5 text-lg font-bold font-mono tabular-nums ${(kpi.total_unpaid || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'} truncate">${money(kpi.total_unpaid)}</div>
                        </button>
                    </div>
                </section>

                <div id="tab-content" class="space-y-6"></div>

                <footer class="pt-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>${esc(company.company_name || 'CRUDWorks')}</span>
                    <span>${esc(company.company_phone || '')}${company.company_email ? ' · ' + esc(company.company_email) : ''}</span>
                </footer>
            </main>

            <!-- Bottom Nav (Mobile Only) -->
            <nav class="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
                <div id="bottom-nav" class="grid grid-cols-5"></div>
            </nav>
        </div>`;

    renderNav();
    renderTab();
    refreshInstallButtons();
}

function renderNav() {
    const desk = $('#desktop-nav');
    if (desk) {
        desk.innerHTML = TABS.map((t) => {
            const active = state.tab === t.key;
            const n = tabBadge(t.key);
            return `
                <button data-action="tab" data-tab="${t.key}" class="relative h-full px-3 flex items-center gap-1.5 text-xs font-semibold border-b-2 transition ${active ? 'border-indigo-600 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}">
                    <span>${t.label}</span>
                    ${n ? `<span class="min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-mono flex items-center justify-center">${n}</span>` : ''}
                </button>`;
        }).join('');
    }

    const mob = $('#bottom-nav');
    if (mob) {
        mob.innerHTML = TABS.map((t) => {
            const active = state.tab === t.key;
            const n = tabBadge(t.key);
            return `
                <button data-action="tab" data-tab="${t.key}" class="relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}">
                    <i class="${t.icon} text-lg"></i><span>${t.short}</span>
                    ${n ? `<span class="absolute top-1.5 left-1/2 ml-2 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-mono flex items-center justify-center">${n}</span>` : ''}
                    ${active ? '<span class="absolute top-0 inset-x-4 h-0.5 bg-indigo-600 dark:bg-indigo-400"></span>' : ''}
                </button>`;
        }).join('');
    }
}

function renderTab() {
    const el = $('#tab-content');
    if (!el || !state.data) return;
    const renderer = TAB_RENDERERS[state.tab] || renderProjects;
    el.innerHTML = `<div class="fade-in space-y-6">${renderer(state.data)}</div>`;
}

function bindGlobalEvents() {
    document.addEventListener('click', async (e) => {
        const el = e.target.closest('[data-action]');
        if (!el) return;
        const action = el.dataset.action;

        if (action === 'modal-backdrop') { if (e.target === el) closeModal(); return; }

        switch (action) {
            case 'tab': hooks.switchTab(el.dataset.tab); break;
            case 'refresh': {
                const icon = $('#refresh-icon');
                icon?.classList.add('animate-spin');
                await loadData();
                $('#refresh-icon')?.classList.remove('animate-spin');
                break;
            }
            case 'account': openAccountModal(); break;
            case 'logout': logout(); break;
            case 'install': installApp(); break;
            case 'close-modal': closeModal(); break;
            case 'bast-pdf': previewBastPdf(el.dataset.id); break;
            case 'bast-sign': openSignModal(el.dataset.id); break;
            case 'inv-pdf': previewInvoicePdf(el.dataset.token); break;
            case 'inv-pay': openPayInvoiceModal(el.dataset.id); break;
            case 'pay-receipt': previewPaymentReceiptPdf(el.dataset.id); break;
            case 'quo-pdf': previewQuotationPdf(el.dataset.token); break;
            case 'quo-sign': openQuotationSignModal(el.dataset.id); break;
            case 'contract-sign': openContractSignModal(el.dataset.id); break;
            case 'contract-pdf': previewContractPdf(el.dataset.id); break;
            case 'cred-reveal': revealPortalCredential(el.dataset.id); break;
            case 'ticket-new': openNewTicketModal(); break;
            case 'ticket-detail': openTicketDetailModal(el.dataset.id); break;
            case 'ticket-filter': state.ticketFilter = el.dataset.val || ''; renderTab(); break;
            case 'invoice-subtab': state.invoiceSubTab = el.dataset.val || 'invoices'; renderTab(); break;
            case 'invoice-filter': state.invoiceFilter = el.dataset.val || ''; renderTab(); break;
            case 'copy':
                try { await navigator.clipboard.writeText(el.dataset.text || ''); toast('Nomor rekening disalin', 'success'); }
                catch (_) { toast(el.dataset.text || '', 'info'); }
                break;
            case 'toggle-pw': {
                const input = document.getElementById(el.dataset.target);
                if (input) {
                    const show = input.type === 'password';
                    input.type = show ? 'text' : 'password';
                    el.innerHTML = `<i class="${show ? 'ri-eye-off-line' : 'ri-eye-line'}"></i>`;
                }
                break;
            }
        }
    });

    document.addEventListener('input', (e) => {
        if (e.target && e.target.id === 'portal-invoice-search') {
            state.invoiceSearch = e.target.value || '';
            const wrap = $('#portal-invoice-list-wrap');
            if (wrap && state.data) {
                wrap.innerHTML = renderFilteredInvoiceList(state.data.invoices || []);
            }
        }
    });

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstall = e;
        refreshInstallButtons();
    });
    window.addEventListener('appinstalled', () => { deferredInstall = null; refreshInstallButtons(); toast('Aplikasi berhasil dipasang', 'success'); });

    window.addEventListener('online', () => { toast('Koneksi tersambung kembali', 'success'); if (state.client) loadData({ silent: true }); });
    window.addEventListener('offline', () => { $('#offline-banner')?.classList.remove('hidden'); });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && state.client && Date.now() - state.loadedAt > 120000) loadData({ silent: true });
    });
}

async function boot() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js', { scope: './' }).catch((err) => console.warn('[Portal] SW gagal didaftarkan:', err));
    }
    bindGlobalEvents();

    const me = await api('portal-auth/me', { silent: true });
    if (me.success) {
        state.csrf = me.data.csrf_token;
        state.client = me.data.client;
        const snap = loadSnapshot();
        if (snap?.data) { state.data = snap.data; renderApp(); }
        await loadData({ silent: true });
        if (!state.data) renderLogin();
    } else if (me.network_error) {
        const snap = loadSnapshot();
        if (snap?.client && snap?.data) {
            state.client = snap.client; state.data = snap.data; state.offlineAt = snap.at;
            renderApp();
        } else {
            renderLogin('Tidak ada koneksi internet. Sambungkan perangkat lalu coba lagi.');
        }
    } else {
        renderLogin();
    }
}

boot();
