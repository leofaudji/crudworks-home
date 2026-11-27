// assets/js/pages/audit.js
import { App } from '../app.js';

let state = {
    page: 1,
    perPage: 15,
    search: '',
    tabel: ''
};

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Jejak Audit & Log Sistem</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Rekam mutasi data kritis, aktivitas operator, dan riwayat pengiriman email.</p>
                </div>
                <div class="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold self-start">
                    <button type="button" data-audit-tab="audit" class="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs transition">Log Aktivitas</button>
                    <button type="button" data-audit-tab="email" class="px-3.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition">Riwayat Email</button>
                    <button type="button" data-audit-tab="rate-limit" class="px-3.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition">Rate Limit Login</button>
                </div>
            </div>

            <div id="audit-tab-panel" class="space-y-6">
            <!-- Filters -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                <div class="relative flex-1 w-full">
                    <input type="text" id="audit-search" placeholder="Cari aksi, tabel, atau nama operator..."
                           class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <i class="ri-search-line absolute left-3.5 top-3 text-slate-400 text-sm"></i>
                </div>
                <div class="w-full sm:w-auto">
                    <select id="audit-filter-tabel" class="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="">Semua Modul Tabel</option>
                        <option value="invoices">invoices</option>
                        <option value="payments">payments</option>
                        <option value="clients">clients</option>
                        <option value="projects">projects</option>
                        <option value="users">users</option>
                        <option value="roles">roles</option>
                        <option value="services">services</option>
                    </select>
                </div>
            </div>

            <!-- Table Card -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th class="py-3.5 px-6">Waktu Eksekusi</th>
                                <th class="py-3.5 px-6">Operator</th>
                                <th class="py-3.5 px-6">Aksi & Modul</th>
                                <th class="py-3.5 px-6">Record ID</th>
                                <th class="py-3.5 px-6">IP Address & Agent</th>
                                <th class="py-3.5 px-6 text-right">Detail Data</th>
                            </tr>
                        </thead>
                        <tbody id="audit-tbody" class="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
                            <tr>
                                <td colspan="6" class="py-12 text-center text-slate-400 font-sans">
                                    <i class="ri-loader-4-line text-2xl animate-spin mb-2 inline-block"></i>
                                    <div>Memuat log audit trail...</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div id="audit-pagination" class="px-7 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500"></div>
            </div>
            </div>

            <div id="audit-email-panel" class="hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm p-6"></div>
            <div id="audit-rate-limit-panel" class="hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm p-6"></div>
        </div>

        <!-- Detail Payload Modal -->
        <div id="audit-detail-modal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-fadeIn max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                    <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-code-box-line text-primary-600"></i>
                        <span>Inspeksi Perubahan Data (Payload Diff)</span>
                    </h3>
                    <button onclick="document.getElementById('audit-detail-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <div class="space-y-4">
                    <div>
                        <div class="text-xs font-bold uppercase text-slate-400 mb-1">Data Lama (Sebelum Mutasi):</div>
                        <pre id="audit-old-data" class="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-mono text-slate-800 dark:text-slate-200 overflow-x-auto max-h-48"></pre>
                    </div>
                    <div>
                        <div class="text-xs font-bold uppercase text-slate-400 mb-1">Data Baru (Setelah Mutasi):</div>
                        <pre id="audit-new-data" class="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-mono text-emerald-600 dark:text-emerald-400 overflow-x-auto max-h-48"></pre>
                    </div>
                </div>
            </div>
        </div>
    `;

    const searchInput = document.getElementById('audit-search');
    let timer;
    searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            state.search = searchInput.value.trim();
            state.page = 1;
            loadAuditLogs();
        }, 300);
    });

    document.getElementById('audit-filter-tabel').addEventListener('change', (e) => {
        state.tabel = e.target.value;
        state.page = 1;
        loadAuditLogs();
    });

    let emailLogsMounted = false;
    let rateLimitMounted = false;
    container.querySelectorAll('[data-audit-tab]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const tab = btn.dataset.auditTab;
            container.querySelectorAll('[data-audit-tab]').forEach(b => {
                const active = b.dataset.auditTab === tab;
                b.className = active
                    ? 'px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs transition'
                    : 'px-3.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition';
            });
            document.getElementById('audit-tab-panel')?.classList.toggle('hidden', tab !== 'audit');
            const emailPanel = document.getElementById('audit-email-panel');
            const rlPanel = document.getElementById('audit-rate-limit-panel');
            emailPanel?.classList.toggle('hidden', tab !== 'email');
            rlPanel?.classList.toggle('hidden', tab !== 'rate-limit');
            if (tab === 'email' && !emailLogsMounted && emailPanel) {
                emailLogsMounted = true;
                const { mountEmailLogsPanel } = await import('../core/email-logs-panel.js');
                mountEmailLogsPanel(emailPanel, { perPage: 15 });
            }
            if (tab === 'rate-limit' && !rateLimitMounted && rlPanel) {
                rateLimitMounted = true;
                const { mountRateLimitPanel } = await import('../core/rate-limit-panel.js');
                mountRateLimitPanel(rlPanel);
            }
        });
    });

    loadAuditLogs();
}

async function loadAuditLogs() {
    const tbody = document.getElementById('audit-tbody');
    const paginationEl = document.getElementById('audit-pagination');

    let ep = `audit?page=${state.page}&per_page=${state.perPage}`;
    if (state.search) ep += `&search=${encodeURIComponent(state.search)}`;
    if (state.tabel) ep += `&tabel=${encodeURIComponent(state.tabel)}`;

    const res = await App.api(ep);
    if (!res || !res.success) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-rose-500 font-sans">Gagal memuat log audit</td></tr>`;
        return;
    }

    const { data: logs, pagination } = res;

    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-slate-400 font-sans">Belum ada jejak audit tercatat</td></tr>`;
        paginationEl.innerHTML = '';
        return;
    }

    tbody.innerHTML = logs.map(l => {
        const actionBadges = {
            'create': '<span class="badge-status badge-status-success"><span class="status-dot"></span><span>CREATE</span></span>',
            'update': '<span class="badge-status badge-status-info"><span class="status-dot"></span><span>UPDATE</span></span>',
            'delete': '<span class="badge-status badge-status-danger"><span class="status-dot"></span><span>DELETE</span></span>',
            'login': '<span class="badge-status badge-status-warning"><span class="status-dot"></span><span>LOGIN</span></span>',
            'logout': '<span class="badge-status badge-status-neutral"><span class="status-dot"></span><span>LOGOUT</span></span>'
        };

        return `
            <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <td class="py-3.5 px-6 align-middle text-slate-400 whitespace-nowrap">
                    ${new Date(l.created_at).toLocaleString('id-ID')}
                </td>
                <td class="py-3.5 px-6 align-middle font-sans max-w-[180px]">
                    <div class="font-bold text-slate-800 dark:text-slate-200 truncate" title="${App.escapeHtml(l.user_nama)}">${App.escapeHtml(l.user_nama)}</div>
                    <div class="text-[10px] text-slate-400 font-mono truncate">@${App.escapeHtml(l.user_uname)}</div>
                </td>
                <td class="py-3.5 px-6 align-middle whitespace-nowrap">
                    <div class="flex items-center gap-2">
                        ${actionBadges[l.aksi] || `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 whitespace-nowrap">${App.escapeHtml(l.aksi)}</span>`}
                        <span class="font-bold text-slate-700 dark:text-slate-300">${App.escapeHtml(l.tabel)}</span>
                    </div>
                </td>
                <td class="py-3.5 px-6 align-middle font-bold text-primary-600 whitespace-nowrap">
                    #${l.record_id || '-'}
                </td>
                <td class="py-3.5 px-6 align-middle text-slate-400 text-[10px] truncate max-w-[150px]" title="${App.escapeHtml(l.user_agent || '')}">
                    <div>${App.escapeHtml(l.ip_address || '127.0.0.1')}</div>
                </td>
                <td class="py-3.5 px-6 align-middle text-right font-sans whitespace-nowrap">
                    ${(l.data_lama || l.data_baru) ? `
                        <button onclick="window.viewAuditPayload(${l.id})" class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold">
                            Lihat JSON
                        </button>
                    ` : `<span class="text-slate-300 text-xs">-</span>`}
                </td>
            </tr>
        `;
    }).join('');

    // Store log data in window for payload inspection
    window._cachedLogs = logs;

    App.renderPagination(paginationEl, pagination, (p) => { state.page = p; loadAudit(); }, 'baris log');
}

window.viewAuditPayload = (logId) => {
    const log = (window._cachedLogs || []).find(x => x.id === logId);
    if (!log) return;

    const oldEl = document.getElementById('audit-old-data');
    const newEl = document.getElementById('audit-new-data');

    try {
        oldEl.textContent = log.data_lama ? JSON.stringify(JSON.parse(log.data_lama), null, 2) : '(Kosong)';
    } catch (_) {
        oldEl.textContent = log.data_lama || '(Kosong)';
    }

    try {
        newEl.textContent = log.data_baru ? JSON.stringify(JSON.parse(log.data_baru), null, 2) : '(Kosong)';
    } catch (_) {
        newEl.textContent = log.data_baru || '(Kosong)';
    }

    document.getElementById('audit-detail-modal').classList.remove('hidden');
};

window.changeAuditPage = (p) => {
    state.page = p;
    loadAuditLogs();
};
