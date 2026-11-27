// assets/js/core/email-logs-panel.js — Panel Riwayat & Log Pengiriman Email SMTP
import { App } from '../app.js';

const TYPE_META = {
    invoice: { label: 'Faktur', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300', route: '#/invoices' },
    quotation: { label: 'Penawaran', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300', route: '#/quotations' },
    payment: { label: 'Kuitansi', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', route: '#/payments' },
    contract: { label: 'Kontrak SPK', cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300', route: '#/contracts' },
    bast: { label: 'BAST', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', route: '#/projects' },
    maintenance: { label: 'SLA / Domain', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', route: '#/maintenance' },
    test: { label: 'Test SMTP', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', route: '#/settings' }
};

export function mountEmailLogsPanel(containerEl, { perPage = 10, title = 'Riwayat Pengiriman Email' } = {}) {
    if (!containerEl) return { reload: () => {} };

    const state = { page: 1, perPage, status: '', entity_type: '', search: '' };
    let rowsCache = [];

    containerEl.innerHTML = `
        <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-mail-check-line text-primary-600"></i> ${App.escapeHtml(title)}
                    </h4>
                    <p class="text-xs text-slate-400">Catatan pengiriman email faktur, penawaran, dan uji coba SMTP beserta detail error jika gagal.</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <button type="button" data-el-reminders class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition" title="Kirim pengingat faktur jatuh tempo & perpanjangan SLA sekarang">
                        <i class="ri-alarm-warning-line"></i><span>Jalankan Pengingat</span>
                    </button>
                    <button type="button" data-el-refresh class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition">
                        <i class="ri-refresh-line"></i><span>Segarkan</span>
                    </button>
                </div>
            </div>

            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div class="relative flex-1">
                    <input type="text" data-el-search placeholder="Cari email penerima, subjek, nomor dokumen, atau pesan error..."
                           class="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <i class="ri-search-line absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                </div>
                <select data-el-type class="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                    <option value="">Semua Tipe</option>
                    <option value="invoice">Faktur Tagihan</option>
                    <option value="quotation">Surat Penawaran</option>
                    <option value="payment">Kuitansi Pembayaran</option>
                    <option value="contract">Kontrak / SPK</option>
                    <option value="bast">BAST Proyek</option>
                    <option value="maintenance">SLA / Domain</option>
                    <option value="test">Test SMTP</option>
                </select>
                <select data-el-status class="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                    <option value="">Semua Status</option>
                    <option value="sent">Terkirim</option>
                    <option value="failed">Gagal</option>
                </select>
            </div>

            <div class="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <th class="py-3 px-4 whitespace-nowrap">Waktu</th>
                                <th class="py-3 px-4 whitespace-nowrap">Jenis</th>
                                <th class="py-3 px-4">Penerima</th>
                                <th class="py-3 px-4">Subjek &amp; Keterangan</th>
                                <th class="py-3 px-4 whitespace-nowrap">Operator</th>
                                <th class="py-3 px-4 whitespace-nowrap text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody data-el-tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr><td colspan="6" class="py-10 text-center text-slate-400">Memuat riwayat email...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div data-el-pagination class="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500"></div>
            </div>
        </div>
    `;

    const tbody = containerEl.querySelector('[data-el-tbody]');
    const pagEl = containerEl.querySelector('[data-el-pagination]');
    const searchEl = containerEl.querySelector('[data-el-search]');
    const typeEl = containerEl.querySelector('[data-el-type]');
    const statusEl = containerEl.querySelector('[data-el-status]');
    const refreshEl = containerEl.querySelector('[data-el-refresh]');

    async function load() {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-slate-400"><i class="ri-loader-4-line animate-spin text-lg inline-block mr-1"></i> Memuat riwayat email...</td></tr>`;
        const qs = new URLSearchParams({
            page: state.page,
            per_page: state.perPage,
            ...(state.status ? { status: state.status } : {}),
            ...(state.entity_type ? { entity_type: state.entity_type } : {}),
            ...(state.search ? { search: state.search } : {})
        });
        const res = await App.api(`settings/email-logs?${qs.toString()}`);
        if (!res || !res.success) {
            tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-rose-500">Gagal memuat riwayat pengiriman email.</td></tr>`;
            return;
        }
        rowsCache = res.data || [];
        if (rowsCache.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-slate-400">Belum ada riwayat pengiriman email.</td></tr>`;
        } else {
            tbody.innerHTML = rowsCache.map((row, idx) => {
                const tm = TYPE_META[row.entity_type] || { label: row.entity_type || 'Lainnya', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
                const isSent = row.status === 'sent';
                const statusBadge = isSent
                    ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><i class="ri-checkbox-circle-line"></i>Terkirim</span>`
                    : `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"><i class="ri-error-warning-line"></i>Gagal</span>`;
                const docTag = row.doc_number
                    ? `<div class="text-[10px] font-mono mt-0.5"><a href="${tm.route || '#/dashboard'}" class="text-primary-600 hover:underline inline-flex items-center gap-0.5">${App.escapeHtml(row.doc_number)} <i class="ri-external-link-line text-[9px]"></i></a></div>`
                    : '';
                const errLine = (!isSent && row.error_message)
                    ? `<div class="mt-1 text-[11px] text-rose-600 dark:text-rose-400 truncate max-w-md cursor-pointer hover:underline" data-el-err-idx="${idx}" title="Klik untuk melihat detail error">${App.escapeHtml(row.error_message)}</div>`
                    : '';

                return `
                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                        <td class="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">${App.formatDateTime(row.created_at)}</td>
                        <td class="py-3 px-4 whitespace-nowrap">
                            <span class="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${tm.cls}">${App.escapeHtml(tm.label)}</span>
                            ${docTag}
                        </td>
                        <td class="py-3 px-4 font-mono text-slate-700 dark:text-slate-200">${App.escapeHtml(row.recipient_email)}</td>
                        <td class="py-3 px-4">
                            <div class="font-semibold text-slate-900 dark:text-white leading-snug">${App.escapeHtml(row.subject)}</div>
                            ${errLine}
                        </td>
                        <td class="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">${App.escapeHtml(row.sent_by_name || 'Sistem')}</td>
                        <td class="py-3 px-4 whitespace-nowrap text-right">${statusBadge}</td>
                    </tr>
                `;
            }).join('');
        }

        if (res.pagination) {
            App.renderPagination(pagEl, res.pagination, (p) => {
                state.page = p;
                load();
            }, 'email');
        }
    }

    containerEl.addEventListener('click', (e) => {
        const errEl = e.target.closest('[data-el-err-idx]');
        if (!errEl) return;
        const row = rowsCache[Number(errEl.dataset.elErrIdx)];
        if (!row) return;
        App.modal({
            title: 'Detail Error Pengiriman Email',
            body: `
                <div class="space-y-3 text-xs">
                    <div class="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                        <div><span class="text-slate-400 block">Penerima</span><b class="font-mono">${App.escapeHtml(row.recipient_email)}</b></div>
                        <div><span class="text-slate-400 block">Waktu</span><b class="font-mono">${App.formatDateTime(row.created_at)}</b></div>
                    </div>
                    <div>
                        <span class="text-slate-400 block mb-1">Subjek</span>
                        <div class="font-semibold text-slate-900 dark:text-white">${App.escapeHtml(row.subject)}</div>
                    </div>
                    <div>
                        <span class="text-slate-400 block mb-1">Pesan Error SMTP</span>
                        <pre class="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-[11px] text-rose-700 dark:text-rose-300 whitespace-pre-wrap break-words font-mono">${App.escapeHtml(row.error_message || '-')}</pre>
                    </div>
                </div>
            `
        });
    });

    searchEl.addEventListener('input', App.debounce((e) => {
        state.search = e.target.value.trim();
        state.page = 1;
        load();
    }, 300));
    typeEl.addEventListener('change', (e) => {
        state.entity_type = e.target.value;
        state.page = 1;
        load();
    });
    statusEl.addEventListener('change', (e) => {
        state.status = e.target.value;
        state.page = 1;
        load();
    });
    refreshEl.addEventListener('click', load);
    containerEl.querySelector('[data-el-reminders]')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        if (!await App.confirm('Jalankan Pengingat Jatuh Tempo?', 'Sistem akan mengirim email pengingat untuk faktur H-3, Hari-H, atau tunggakan (>=7 hari) serta SLA/Domain H-30 yang belum diingatkan.')) return;
        const done = App.btnLoading(btn, true, 'Mengirim...');
        try {
            const res = await App.api('settings/run-reminders', { method: 'POST', body: {} });
            if (res && res.success) {
                App.toast(res.message, 'success');
                load();
            }
        } finally {
            done();
        }
    });

    load();
    return { reload: load };
}
