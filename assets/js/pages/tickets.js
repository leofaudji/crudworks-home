// assets/js/pages/tickets.js — Manajemen Tiket & Log Aktivitas Support Klien (Helpdesk Ringan)
import { App } from '../app.js';
import { renderEmailBody, renderEmailAttachments, initEmailComposer } from '../core/email-editor.js';

let state = { page: 1, perPage: 15, search: '', status: '', kategori: '', cakupan: '' };

const STATUS_BADGES = {
    terbuka: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    diproses: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    menunggu_klien: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    selesai: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    ditutup: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
};

const PRIO_BADGES = {
    kritis: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    tinggi: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    sedang: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
    rendah: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
};

const SCOPE_BADGES = {
    sla_gratis: { label: 'Cakupan SLA', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
    garansi: { label: 'Garansi', cls: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800' },
    berbayar: { label: 'Berbayar (Billable)', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800' }
};

const SOURCE_LABELS = {
    portal: { label: 'Portal', icon: 'ri-global-line' },
    whatsapp: { label: 'WhatsApp', icon: 'ri-whatsapp-line' },
    telepon: { label: 'Telepon', icon: 'ri-phone-line' },
    email: { label: 'Email', icon: 'ri-mail-line' },
    internal: { label: 'Internal', icon: 'ri-terminal-box-line' }
};

const LOG_TYPE_BADGES = {
    investigasi: { label: 'Investigasi', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' },
    perbaikan: { label: 'Perbaikan', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
    komunikasi: { label: 'Komunikasi', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' },
    deploy: { label: 'Deploy/Rilis', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' },
    konversi: { label: 'Konversi', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
    lainnya: { label: 'Lainnya', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' }
};

function formatDuration(minutes) {
    const m = parseInt(minutes || 0, 10);
    if (m <= 0) return '0m';
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return h > 0 ? (rem > 0 ? `${h}j ${rem}m` : `${h}j`) : `${m}m`;
}

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Tiket &amp; Log Aktivitas Support</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Kelola laporan kendala klien, catat log penanganan teknis, dan pisahkan layanan SLA vs pekerjaan berbayar.</p>
                </div>
                <div class="flex items-center gap-2 self-start sm:self-auto">
                    <button type="button" id="btn-export-tickets-csv" class="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition">
                        <i class="ri-download-2-line text-emerald-600"></i>
                        <span>Ekspor CSV</span>
                    </button>
                    <button type="button" id="btn-new-ticket" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm shadow-primary-500/20 transition">
                        <i class="ri-add-line text-base"></i>
                        <span>Catat Tiket / Laporan Baru</span>
                    </button>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div class="text-[10px] font-bold uppercase text-amber-600">Terbuka</div>
                    <div id="kpi-tkt-open" class="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">0</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div class="text-[10px] font-bold uppercase text-indigo-600">Diproses</div>
                    <div id="kpi-tkt-prog" class="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">0</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div class="text-[10px] font-bold uppercase text-rose-600">Menunggu Klien</div>
                    <div id="kpi-tkt-wait" class="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">0</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div class="text-[10px] font-bold uppercase text-emerald-600">Selesai</div>
                    <div id="kpi-tkt-done" class="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">0</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div class="text-[10px] font-bold uppercase text-amber-600">Tiket Berbayar</div>
                    <div id="kpi-tkt-bill" class="text-2xl font-black font-mono text-amber-600 mt-1">0</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div class="text-[10px] font-bold uppercase text-primary-600">Waktu Support</div>
                    <div id="kpi-tkt-mins" class="text-2xl font-black font-mono text-primary-600 mt-1">0m</div>
                </div>
            </div>

            <!-- Filter Bar -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center gap-3">
                <div class="relative flex-1 min-w-[220px]">
                    <input type="text" id="tkt-search" placeholder="Cari nomor tiket, subjek, atau nama klien..."
                           class="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <i class="ri-search-line absolute left-3.5 top-2.5 text-slate-400 text-sm"></i>
                </div>
                <select id="tkt-filter-status" class="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    <option value="">Semua Status</option>
                    <option value="terbuka">Terbuka</option>
                    <option value="diproses">Diproses</option>
                    <option value="menunggu_klien">Menunggu Klien</option>
                    <option value="selesai">Selesai</option>
                    <option value="ditutup">Ditutup</option>
                </select>
                <select id="tkt-filter-kategori" class="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    <option value="">Semua Kategori</option>
                    <option value="gangguan_sistem">Gangguan Sistem</option>
                    <option value="domain_ssl">Domain &amp; SSL</option>
                    <option value="perbaikan_bug">Perbaikan Bug</option>
                    <option value="permintaan_fitur">Permintaan Fitur</option>
                    <option value="billing">Penagihan</option>
                    <option value="lainnya">Lainnya</option>
                </select>
                <select id="tkt-filter-cakupan" class="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    <option value="">Semua Cakupan Biaya</option>
                    <option value="sla_gratis">Cakupan SLA (Gratis)</option>
                    <option value="garansi">Garansi Proyek</option>
                    <option value="berbayar">Berbayar (Billable)</option>
                </select>
            </div>

            <!-- Table -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono whitespace-nowrap">
                                <th class="py-3.5 pl-6 pr-4">Tiket &amp; Sumber</th>
                                <th class="py-3.5 px-4 min-w-[180px]">Pelanggan &amp; Proyek</th>
                                <th class="py-3.5 px-4 min-w-[230px]">Subjek &amp; Cakupan</th>
                                <th class="py-3.5 px-4 text-center">Prioritas &amp; SLA</th>
                                <th class="py-3.5 px-4 text-center">Log &amp; Durasi</th>
                                <th class="py-3.5 px-4 text-center">Status</th>
                                <th class="py-3.5 pl-4 pr-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="tickets-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr><td colspan="7" class="py-12 text-center text-slate-400"><i class="ri-loader-4-line text-2xl animate-spin"></i></td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="tickets-pagination" class="px-7 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500"></div>
            </div>
        </div>
    `;

    let timer;
    document.getElementById('tkt-search')?.addEventListener('input', (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => { state.search = e.target.value.trim(); state.page = 1; loadTickets(); }, 300);
    });
    document.getElementById('tkt-filter-status')?.addEventListener('change', (e) => {
        state.status = e.target.value; state.page = 1; loadTickets();
    });
    document.getElementById('tkt-filter-kategori')?.addEventListener('change', (e) => {
        state.kategori = e.target.value; state.page = 1; loadTickets();
    });
    document.getElementById('tkt-filter-cakupan')?.addEventListener('change', (e) => {
        state.cakupan = e.target.value; state.page = 1; loadTickets();
    });
    document.getElementById('btn-new-ticket')?.addEventListener('click', () => window.openNewTicketModal());

    await loadTickets();
}

async function loadTickets() {
    const tbody = document.getElementById('tickets-tbody');
    const pagEl = document.getElementById('tickets-pagination');
    let ep = `tickets?page=${state.page}&per_page=${state.perPage}`;
    if (state.search) ep += `&search=${encodeURIComponent(state.search)}`;
    if (state.status) ep += `&status=${encodeURIComponent(state.status)}`;
    if (state.kategori) ep += `&kategori=${encodeURIComponent(state.kategori)}`;
    if (state.cakupan) ep += `&cakupan_biaya=${encodeURIComponent(state.cakupan)}`;

    const res = await App.api(ep);
    if (!res || !res.success) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-rose-500">Gagal memuat daftar tiket</td></tr>`;
        return;
    }

    const stats = res.stats || {};
    document.getElementById('kpi-tkt-open').textContent = stats.terbuka ?? 0;
    document.getElementById('kpi-tkt-prog').textContent = stats.diproses ?? 0;
    document.getElementById('kpi-tkt-wait').textContent = stats.menunggu_klien ?? 0;
    document.getElementById('kpi-tkt-done').textContent = stats.selesai ?? 0;
    document.getElementById('kpi-tkt-bill').textContent = stats.berbayar ?? 0;
    document.getElementById('kpi-tkt-mins').textContent = formatDuration(stats.total_menit ?? 0);

    const rows = res.data || [];
    const p = res.pagination || { page: 1, total: rows.length, total_pages: 1 };

    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400">Belum ada tiket atau laporan support klien</td></tr>`;
        pagEl.innerHTML = '';
        return;
    }

    tbody.innerHTML = rows.map((t) => {
        const src = SOURCE_LABELS[t.sumber_laporan] || SOURCE_LABELS.portal;
        const scp = SCOPE_BADGES[t.cakupan_biaya] || SCOPE_BADGES.sla_gratis;
        const docBadges = [
            t.nomor_penawaran ? `<span class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-mono text-[10px] font-bold">${App.escapeHtml(t.nomor_penawaran)}</span>` : '',
            t.nomor_invoice ? `<span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono text-[10px] font-bold">${App.escapeHtml(t.nomor_invoice)}</span>` : ''
        ].filter(Boolean).join(' ');

        return `
        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
            <td class="py-3.5 pl-6 pr-4 align-middle whitespace-nowrap">
                <div class="font-mono font-bold text-xs text-primary-600">${App.escapeHtml(t.nomor_tiket)}</div>
                <div class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <i class="${src.icon}"></i><span>${src.label}</span> · <span>${App.formatDate(t.created_at)}</span>
                </div>
            </td>
            <td class="py-3.5 px-4 align-middle min-w-[180px] max-w-[230px]">
                <div class="font-bold text-slate-900 dark:text-white leading-snug">${App.escapeHtml(t.client_nama)}</div>
                <div class="text-[11px] text-slate-500 truncate mt-0.5">${App.escapeHtml(t.nama_project || t.nama_aset || 'Umum')}</div>
            </td>
            <td class="py-3.5 px-4 align-middle min-w-[230px] max-w-[310px]">
                <div class="font-semibold text-slate-800 dark:text-slate-200 leading-snug">${App.escapeHtml(t.judul)}</div>
                <div class="flex flex-wrap items-center gap-1.5 mt-1">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${scp.cls}">${scp.label}</span>
                    ${docBadges}
                </div>
            </td>
            <td class="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${PRIO_BADGES[t.prioritas] || ''}">${App.escapeHtml(t.prioritas)}</span>
                ${t.sla_status === 'melewati_sla'
                    ? `<div class="mt-1 text-[10px] font-mono font-bold text-rose-600">SLA Lewat (${t.sla_elapsed_hours}j/${t.sla_hours}j)</div>`
                    : (t.sla_status === 'mendekati'
                        ? `<div class="mt-1 text-[10px] font-mono font-semibold text-amber-600">SLA ${t.sla_elapsed_hours}j/${t.sla_hours}j</div>`
                        : `<div class="mt-1 text-[10px] font-mono text-slate-400">SLA ${t.sla_elapsed_hours || 0}j/${t.sla_hours || 24}j</div>`)}
            </td>
            <td class="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                <div class="font-mono font-bold text-slate-700 dark:text-slate-300">${formatDuration(t.total_durasi_menit)}</div>
                <div class="text-[10px] text-slate-400 mt-0.5">${t.log_count || 0} log · ${t.reply_count || 0} balas</div>
            </td>
            <td class="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border whitespace-nowrap ${STATUS_BADGES[t.status] || ''}">${App.escapeHtml(t.status.replace('_', ' '))}</span>
            </td>
            <td class="py-3.5 pl-4 pr-6 align-middle text-right whitespace-nowrap">
                <button type="button" onclick="window.openAdminTicketModal(${t.id})" class="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/50 dark:hover:bg-primary-900/60 text-primary-700 dark:text-primary-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition">
                    <i class="ri-customer-service-2-line"></i> Tangani
                </button>
            </td>
        </tr>`;
    }).join('');

    App.renderPagination(pagEl, p, (page) => { state.page = page; loadTickets(); }, 'tiket');
}

window.changeTicketPage = (p) => { state.page = p; loadTickets(); };

window.openNewTicketModal = async () => {
    const [cRes, pRes] = await Promise.all([
        App.api('clients?all=1'),
        App.api('projects?all=1')
    ]);
    const clients = cRes?.data || [];
    const projects = pRes?.data || [];
    if (clients.length === 0) {
        App.toast('Tambahkan pelanggan terlebih dahulu sebelum mencatat tiket', 'warning');
        return;
    }

    let modal = document.getElementById('new-ticket-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'new-ticket-modal';
        modal.className = 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fadeIn max-h-[92vh] flex flex-col">
            <!-- Header -->
            <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-4 shrink-0">
                <div class="flex items-center gap-3.5">
                    <div class="w-11 h-11 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-sm shadow-primary-500/30 shrink-0">
                        <i class="ri-customer-service-2-line text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-black text-slate-900 dark:text-white tracking-tight">Catat Tiket &amp; Laporan Support</h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Rekam laporan kendala atau permintaan klien dari WhatsApp, telepon, email, maupun internal.</p>
                    </div>
                </div>
                <button type="button" onclick="document.getElementById('new-ticket-modal').classList.add('hidden')" class="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition">
                    <i class="ri-close-line text-xl"></i>
                </button>
            </div>

            <!-- Body -->
            <form id="new-ticket-form" class="p-6 overflow-y-auto space-y-5 text-xs">
                <!-- Section 1: Klien & Proyek -->
                <div class="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-3.5">
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Informasi Pelanggan &amp; Pelapor</div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div>
                            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Pelanggan <span class="text-rose-500">*</span></label>
                            <select id="nt-client" class="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                                ${clients.map((c) => `<option value="${c.id}">${App.escapeHtml(c.nama_perusahaan)}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Proyek Terkait</label>
                            <select id="nt-project" class="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="">-- Umum / Tidak Spesifik --</option>
                            </select>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nama Pelapor (PIC)</label>
                            <input id="nt-pelapor" type="text" placeholder="Otomatis pakai PIC klien" class="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>
                    </div>
                </div>

                <!-- Section 2: Klasifikasi & SLA -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div>
                        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Sumber Laporan</label>
                        <select id="nt-sumber" class="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="whatsapp">WhatsApp</option>
                            <option value="telepon">Telepon</option>
                            <option value="email">Email</option>
                            <option value="portal">Portal Klien</option>
                            <option value="internal">Internal Tim</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Kategori</label>
                        <select id="nt-kategori" class="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="gangguan_sistem">Gangguan Sistem</option>
                            <option value="perbaikan_bug">Perbaikan Bug</option>
                            <option value="domain_ssl">Domain &amp; SSL</option>
                            <option value="permintaan_fitur">Permintaan Fitur</option>
                            <option value="billing">Penagihan</option>
                            <option value="lainnya">Lainnya</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Prioritas &amp; SLA</label>
                        <select id="nt-prioritas" class="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="sedang">Sedang (Target 24j)</option>
                            <option value="tinggi">Tinggi (Target 12j)</option>
                            <option value="kritis">Kritis (Target 4j)</option>
                            <option value="rendah">Rendah (Target 48j)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Cakupan Biaya</label>
                        <select id="nt-cakupan" class="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="sla_gratis">Cakupan SLA (Gratis)</option>
                            <option value="garansi">Garansi Proyek</option>
                            <option value="berbayar">Berbayar (Billable)</option>
                        </select>
                    </div>
                </div>

                <!-- Section 3: Subjek & Rich Text Composer -->
                <div class="space-y-3.5">
                    <div>
                        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Subjek Laporan <span class="text-rose-500">*</span></label>
                        <input id="nt-judul" type="text" required placeholder="Contoh: Gagal mencetak faktur PDF pada modul penjualan" class="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Detail Kronologi / Permintaan Klien</label>
                        <div id="nt-composer"></div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                    <button type="button" onclick="document.getElementById('new-ticket-modal').classList.add('hidden')" class="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 transition">Batal</button>
                    <button type="submit" id="btn-save-new-ticket" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold inline-flex items-center gap-1.5 shadow-sm shadow-primary-500/20 transition">
                        <i class="ri-save-line"></i><span>Simpan Tiket</span>
                    </button>
                </div>
            </form>
        </div>
    `;
    modal.classList.remove('hidden');

    const clientEl = document.getElementById('nt-client');
    const projEl = document.getElementById('nt-project');
    const syncProjects = () => {
        const cid = Number(clientEl.value);
        const filtered = projects.filter((p) => Number(p.client_id) === cid);
        projEl.innerHTML = `<option value="">-- Umum / Tidak Spesifik --</option>` +
            filtered.map((p) => `<option value="${p.id}">${App.escapeHtml(p.nama_project)}</option>`).join('');
    };
    clientEl.addEventListener('change', syncProjects);
    syncProjects();

    const newTicketComposer = initEmailComposer(document.getElementById('nt-composer'), {
        placeholder: 'Jelaskan kronologi kendala, langkah reproduksi, atau tempel screenshot langsung dengan Ctrl+V…',
        minHeight: 170
    });

    document.getElementById('new-ticket-form').onsubmit = async (e) => {
        e.preventDefault();
        const judul = document.getElementById('nt-judul').value.trim();
        if (!judul) {
            App.toast('Subjek laporan wajib diisi', 'warning');
            return;
        }
        const btn = document.getElementById('btn-save-new-ticket');
        const payload = {
            client_id: clientEl.value,
            project_id: projEl.value || null,
            sumber_laporan: document.getElementById('nt-sumber').value,
            kategori: document.getElementById('nt-kategori').value,
            prioritas: document.getElementById('nt-prioritas').value,
            cakupan_biaya: document.getElementById('nt-cakupan').value,
            pelapor_nama: document.getElementById('nt-pelapor').value.trim(),
            judul,
            deskripsi: newTicketComposer?.hasContent() ? newTicketComposer.getHtml() : App.escapeHtml(judul),
            lampiran: newTicketComposer ? newTicketComposer.getImages() : []
        };

        App.btnLoading(btn, true, 'Menyimpan...');
        try {
            const res = await App.api('tickets', { method: 'POST', body: payload });
            if (res && res.success) {
                App.toast(res.message, 'success');
                modal.classList.add('hidden');
                loadTickets();
            }
        } finally {
            App.btnLoading(btn, false);
        }
    };
};

window.openAdminTicketModal = async (id, activeTab = 'thread') => {
    const res = await App.api(`tickets/${id}`);
    if (!res || !res.success) return;
    const { ticket: t, replies = [], logs = [] } = res.data;

    let modal = document.getElementById('admin-ticket-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'admin-ticket-modal';
        modal.className = 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4';
        document.body.appendChild(modal);
    }

    const src = SOURCE_LABELS[t.sumber_laporan] || SOURCE_LABELS.portal;
    let adminReplyComposer = null;

    modal.innerHTML = `
        <div class="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 animate-fadeIn max-h-[92vh] overflow-y-auto space-y-5">
            <div class="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2 text-xs">
                        <span class="font-mono font-bold text-primary-600">${App.escapeHtml(t.nomor_tiket)}</span>
                        <span class="text-slate-400">·</span>
                        <span class="font-bold text-slate-700 dark:text-slate-200">${App.escapeHtml(t.client_nama)}</span>
                        <span class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold inline-flex items-center gap-1">
                            <i class="${src.icon}"></i>${src.label}
                        </span>
                        <span class="px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 font-mono text-[10px] font-bold">
                            Durasi: ${formatDuration(t.total_durasi_menit)}
                        </span>
                    </div>
                    <h3 class="text-lg font-black text-slate-900 dark:text-white mt-1">${App.escapeHtml(t.judul)}</h3>
                    <div class="text-xs text-slate-500 mt-0.5">
                        Pelapor: <b>${App.escapeHtml(t.pelapor_nama)}</b> · ${App.formatDate(t.created_at)}
                        ${t.nomor_penawaran ? ` · <span class="font-mono text-indigo-600 font-bold">SPH: ${App.escapeHtml(t.nomor_penawaran)}</span>` : ''}
                        ${t.nomor_invoice ? ` · <span class="font-mono text-emerald-600 font-bold">Faktur: ${App.escapeHtml(t.nomor_invoice)}</span>` : ''}
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                    <select id="adm-tkt-scope" class="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold">
                        <option value="sla_gratis" ${t.cakupan_biaya === 'sla_gratis' ? 'selected' : ''}>Cakupan: SLA Gratis</option>
                        <option value="garansi" ${t.cakupan_biaya === 'garansi' ? 'selected' : ''}>Cakupan: Garansi</option>
                        <option value="berbayar" ${t.cakupan_biaya === 'berbayar' ? 'selected' : ''}>Cakupan: Berbayar</option>
                    </select>
                    <button type="button" onclick="window.convertTicketToTask(${t.id}, ${t.client_id}, ${t.project_id || 'null'}, '${App.escapeHtml(t.nomor_tiket)}', '${App.escapeHtml(t.judul)}')" class="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition" title="Buat Tugas di Papan Kanban Proyek">
                        <i class="ri-kanban-view"></i><span>+ Kanban</span>
                    </button>
                    <button type="button" onclick="window.convertTicketToQuotation(${t.id}, '${App.escapeHtml(t.nomor_tiket)}', '${App.escapeHtml(t.judul)}')" class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition" title="Buat Surat Penawaran Harga (SPH)">
                        <i class="ri-file-paper-2-line"></i><span>+ SPH</span>
                    </button>
                    <button type="button" onclick="window.convertTicketToInvoice(${t.id}, '${App.escapeHtml(t.nomor_tiket)}', '${App.escapeHtml(t.judul)}')" class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition" title="Terbitkan Faktur Tagihan Tambahan">
                        <i class="ri-file-add-line"></i><span>+ Faktur</span>
                    </button>
                    <button type="button" onclick="window.sendTicketWA('${App.escapeHtml(t.nomor_tiket)}', '${App.escapeHtml(t.judul)}', '${App.escapeHtml(t.client_nama)}', '${App.escapeHtml(t.client_telepon || '')}', '${App.escapeHtml(t.status)}')" class="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition" title="Kirim Update via WhatsApp">
                        <i class="ri-whatsapp-line"></i>
                    </button>
                    <button type="button" onclick="document.getElementById('admin-ticket-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1"><i class="ri-close-line text-2xl"></i></button>
                </div>
            </div>

            <!-- Tabs -->
            <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <button type="button" id="tab-btn-thread" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${activeTab === 'thread' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                    <i class="ri-chat-3-line mr-1"></i>Percakapan Klien (${replies.length})
                </button>
                <button type="button" id="tab-btn-logs" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${activeTab === 'logs' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                    <i class="ri-history-line mr-1"></i>Log Aktivitas Support (${logs.length})
                </button>
            </div>

            <!-- Tab 1: Percakapan Klien -->
            <div id="tab-panel-thread" class="space-y-4 ${activeTab === 'thread' ? '' : 'hidden'}">
                <div class="space-y-3 max-h-[38vh] overflow-y-auto pr-1">
                    <article class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                        <div class="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <span class="w-7 h-7 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">${App.escapeHtml((t.pelapor_nama || 'K').trim().charAt(0).toUpperCase())}</span>
                                <div class="min-w-0 leading-tight">
                                    <div class="text-xs font-bold text-slate-900 dark:text-white truncate">${App.escapeHtml(t.pelapor_nama)} <span class="font-normal text-slate-500">· ${App.escapeHtml(t.client_nama)}</span></div>
                                    <div class="text-[10px] text-slate-500">Kepada: Tim Dukungan CRUDWorks</div>
                                </div>
                            </div>
                            <span class="text-[10px] font-mono text-slate-400 shrink-0">${App.formatDate(t.created_at)}</span>
                        </div>
                        <div class="p-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                            ${renderEmailBody(t.deskripsi)}
                            ${renderEmailAttachments(t.lampiran_json)}
                        </div>
                    </article>

                    ${replies.map((r) => {
                        const isAdmin = r.sender_type === 'admin';
                        const initial = (r.sender_name || (isAdmin ? 'T' : 'K')).trim().charAt(0).toUpperCase();
                        return `
                            <article class="rounded-2xl border ${isAdmin ? 'border-indigo-200/80 dark:border-indigo-900/70' : 'border-slate-200 dark:border-slate-800'} bg-white dark:bg-slate-900 overflow-hidden">
                                <div class="px-4 py-2.5 ${isAdmin ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : 'bg-slate-50 dark:bg-slate-800/50'} border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                                    <div class="flex items-center gap-2.5 min-w-0">
                                        <span class="w-7 h-7 rounded-full ${isAdmin ? 'bg-primary-600 text-white' : 'bg-slate-900 text-white'} text-[11px] font-bold flex items-center justify-center shrink-0">${App.escapeHtml(initial)}</span>
                                        <div class="min-w-0 leading-tight">
                                            <div class="text-xs font-bold text-slate-900 dark:text-white truncate">${App.escapeHtml(r.sender_name)} <span class="font-normal text-slate-500">${isAdmin ? '(Tim Teknis)' : '(Klien)'}</span></div>
                                            <div class="text-[10px] text-slate-500">Kepada: ${isAdmin ? App.escapeHtml(t.pelapor_nama) : 'Tim Dukungan CRUDWorks'}</div>
                                        </div>
                                    </div>
                                    <span class="text-[10px] font-mono text-slate-400 shrink-0">${App.formatDate(r.created_at)}</span>
                                </div>
                                <div class="p-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                    ${renderEmailBody(r.pesan)}
                                    ${renderEmailAttachments(r.lampiran_json)}
                                </div>
                            </article>`;
                    }).join('')}
                </div>

                <form id="admin-ticket-reply-form" class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3 text-xs">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <span class="text-[11px] text-slate-500"><b>Balas ke:</b> ${App.escapeHtml(t.pelapor_nama)} (${App.escapeHtml(t.client_nama)}) · <span class="font-mono">Re: [${App.escapeHtml(t.nomor_tiket)}]</span></span>
                        <select id="adm-tkt-status" class="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                            <option value="diproses" ${t.status === 'diproses' ? 'selected' : ''}>Status: Diproses</option>
                            <option value="menunggu_klien" ${t.status === 'menunggu_klien' ? 'selected' : ''}>Status: Menunggu Klien</option>
                            <option value="selesai" ${t.status === 'selesai' ? 'selected' : ''}>Status: Selesai</option>
                            <option value="ditutup" ${t.status === 'ditutup' ? 'selected' : ''}>Status: Ditutup</option>
                        </select>
                    </div>
                    <div id="adm-tkt-composer"></div>
                    <div class="flex justify-end gap-2">
                        <button type="button" onclick="document.getElementById('admin-ticket-modal').classList.add('hidden')" class="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold">Tutup</button>
                        <button type="submit" class="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold inline-flex items-center gap-1.5"><i class="ri-send-plane-line"></i> Kirim Balasan</button>
                    </div>
                </form>
            </div>

            <!-- Tab 2: Log Aktivitas Support Internal -->
            <div id="tab-panel-logs" class="space-y-4 ${activeTab === 'logs' ? '' : 'hidden'}">
                <form id="admin-ticket-log-form" class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3 text-xs">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Tipe Aktivitas</label>
                            <select id="log-tipe" class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                <option value="investigasi">Investigasi / Analisa</option>
                                <option value="perbaikan">Perbaikan / Bugfix</option>
                                <option value="komunikasi">Komunikasi Klien</option>
                                <option value="deploy">Deploy / Rilis Patch</option>
                                <option value="lainnya">Lainnya</option>
                            </select>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Durasi Penanganan (Menit)</label>
                            <input id="log-durasi" type="number" min="0" step="5" value="15" class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs">
                        </div>
                        <div class="flex items-end pb-2">
                            <label class="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                                <input id="log-billable" type="checkbox" class="rounded text-amber-600" ${t.cakupan_biaya === 'berbayar' ? 'checked' : ''}>
                                <span>Tandai Berbayar (Billable)</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label class="block font-bold text-slate-600 dark:text-slate-300 mb-1">Catatan Teknis / Tindakan Support *</label>
                        <textarea id="log-ringkasan" rows="2" placeholder="Contoh: Cek log Nginx & PHP-FPM, ditemukan timeout query laporan bulanan..." class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"></textarea>
                    </div>
                    <div class="flex justify-end">
                        <button type="submit" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-primary-600 dark:hover:bg-primary-700 text-white rounded-xl font-bold inline-flex items-center gap-1.5">
                            <i class="ri-add-circle-line"></i> Catat Log Aktivitas
                        </button>
                    </div>
                </form>

                <div class="space-y-2.5 max-h-[38vh] overflow-y-auto pr-1">
                    ${logs.length === 0 ? `<div class="py-8 text-center text-xs text-slate-400">Belum ada log aktivitas support internal untuk tiket ini.</div>` : logs.map((l) => {
                        const lt = LOG_TYPE_BADGES[l.tipe_aktivitas] || LOG_TYPE_BADGES.lainnya;
                        return `
                            <div class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-3">
                                <div class="space-y-1 min-w-0">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${lt.cls}">${lt.label}</span>
                                        <span class="font-bold text-xs text-slate-800 dark:text-slate-200">${App.escapeHtml(l.actor_name)}</span>
                                        ${Number(l.durasi_menit) > 0 ? `<span class="text-[10px] font-mono text-primary-600 font-bold"><i class="ri-time-line"></i> ${formatDuration(l.durasi_menit)}</span>` : ''}
                                        ${Number(l.is_billable) === 1 ? `<span class="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">Billable</span>` : ''}
                                    </div>
                                    <div class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${App.escapeHtml(l.ringkasan)}</div>
                                </div>
                                <span class="text-[10px] font-mono text-slate-400 shrink-0">${App.formatDate(l.created_at)}</span>
                            </div>`;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');

    const switchTab = (tab) => {
        const isThread = tab === 'thread';
        document.getElementById('tab-panel-thread').classList.toggle('hidden', !isThread);
        document.getElementById('tab-panel-logs').classList.toggle('hidden', isThread);
        document.getElementById('tab-btn-thread').className = `px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${isThread ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`;
        document.getElementById('tab-btn-logs').className = `px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${!isThread ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`;
    };
    document.getElementById('tab-btn-thread').onclick = () => switchTab('thread');
    document.getElementById('tab-btn-logs').onclick = () => switchTab('logs');

    document.getElementById('adm-tkt-scope').onchange = async (e) => {
        const resScope = await App.api(`tickets/${t.id}/scope`, {
            method: 'POST',
            body: { cakupan_biaya: e.target.value }
        });
        if (resScope && resScope.success) {
            App.toast(resScope.message, 'success');
            loadTickets();
        }
    };

    adminReplyComposer = initEmailComposer(document.getElementById('adm-tkt-composer'), {
        placeholder: 'Tulis balasan email ke klien atau tempel screenshot dengan Ctrl+V…',
        minHeight: 160
    });

    document.getElementById('admin-ticket-reply-form').onsubmit = async (e) => {
        e.preventDefault();
        if (!adminReplyComposer || !adminReplyComposer.hasContent()) {
            App.toast('Tulis pesan balasan atau lampirkan gambar terlebih dahulu', 'warning');
            return;
        }
        const status = document.getElementById('adm-tkt-status').value;
        const resReply = await App.api(`tickets/${t.id}/reply`, {
            method: 'POST',
            body: { pesan: adminReplyComposer.getHtml(), status, lampiran: adminReplyComposer.getImages() }
        });
        if (resReply && resReply.success) {
            App.toast(resReply.message, 'success');
            window.openAdminTicketModal(t.id, 'thread');
            loadTickets();
            App.loadNotifications?.(true);
        }
    };

    document.getElementById('admin-ticket-log-form').onsubmit = async (e) => {
        e.preventDefault();
        const ringkasan = document.getElementById('log-ringkasan').value.trim();
        if (!ringkasan) {
            App.toast('Catatan teknis aktivitas wajib diisi', 'warning');
            return;
        }
        const payload = {
            tipe_aktivitas: document.getElementById('log-tipe').value,
            durasi_menit: parseInt(document.getElementById('log-durasi').value || '0', 10),
            is_billable: document.getElementById('log-billable').checked ? 1 : 0,
            ringkasan
        };
        const resLog = await App.api(`tickets/${t.id}/logs`, { method: 'POST', body: payload });
        if (resLog && resLog.success) {
            App.toast(resLog.message, 'success');
            window.openAdminTicketModal(t.id, 'logs');
            loadTickets();
        }
    };
};

window.convertTicketToTask = async (ticketId, clientId, defaultProjectId, nomorTiket, judul) => {
    const pRes = await App.api('projects?all=1');
    const allProjs = pRes?.data || [];
    const clientProjs = allProjs.filter((p) => Number(p.client_id) === Number(clientId));
    const list = clientProjs.length > 0 ? clientProjs : allProjs;

    if (list.length === 0) {
        App.toast('Belum ada proyek terdaftar untuk membuat tugas Kanban', 'warning');
        return;
    }

    const { value: formVal } = await Swal.fire({
        title: `Masukkan ke Kanban`,
        html: `
            <div class="text-left space-y-3 text-xs">
                <div class="p-2.5 bg-slate-100 rounded-xl font-medium text-slate-700">[${App.escapeHtml(nomorTiket)}] ${App.escapeHtml(judul)}</div>
                <div>
                    <label class="block font-bold text-slate-600 mb-1">Proyek Target *</label>
                    <select id="swal-tkt-proj" class="w-full px-3 py-2 border rounded-xl text-xs">
                        ${list.map((p) => `<option value="${p.id}" ${Number(defaultProjectId) === Number(p.id) ? 'selected' : ''}>${App.escapeHtml(p.nama_project)} (${App.escapeHtml(p.kode_project)})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-slate-600 mb-1">Estimasi Jam Kerja</label>
                    <input id="swal-tkt-jam" type="number" min="0.5" step="0.5" value="2" class="w-full px-3 py-2 border rounded-xl font-mono text-xs">
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Buat Tugas Kanban',
        cancelButtonText: 'Batal',
        preConfirm: () => ({
            project_id: document.getElementById('swal-tkt-proj').value,
            estimasi_jam: document.getElementById('swal-tkt-jam').value || 2
        })
    });

    if (!formVal) return;
    const res = await App.api(`tickets/${ticketId}/convert-task`, { method: 'POST', body: formVal });
    if (res && res.success) {
        App.toast(res.message, 'success');
        loadTickets();
        App.loadNotifications?.(true);
    }
};

window.convertTicketToQuotation = async (ticketId, nomorTiket, judul) => {
    const { value: formVal } = await Swal.fire({
        title: 'Buat Surat Penawaran (SPH)',
        html: `
            <div class="text-left space-y-3 text-xs">
                <div>
                    <label class="block font-bold text-slate-600 mb-1">Deskripsi Item Penawaran *</label>
                    <input id="swal-sph-desc" type="text" value="[${App.escapeHtml(nomorTiket)}] Penyesuaian / Fitur: ${App.escapeHtml(judul)}" class="w-full px-3 py-2 border rounded-xl text-xs">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-bold text-slate-600 mb-1">Estimasi Nilai (IDR) *</label>
                        <input id="swal-sph-nom" type="number" min="1000" step="1000" placeholder="750000" class="w-full px-3 py-2 border rounded-xl font-mono text-xs">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-600 mb-1">Berlaku (Hari)</label>
                        <input id="swal-sph-due" type="number" min="1" value="14" class="w-full px-3 py-2 border rounded-xl font-mono text-xs">
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Buat Draft SPH',
        cancelButtonText: 'Batal',
        preConfirm: () => {
            const deskripsi = document.getElementById('swal-sph-desc').value.trim();
            const nominal = parseFloat(document.getElementById('swal-sph-nom').value);
            const berlaku_hari = parseInt(document.getElementById('swal-sph-due').value, 10) || 14;
            if (!deskripsi || !nominal || nominal <= 0) {
                Swal.showValidationMessage('Deskripsi dan estimasi nilai > 0 wajib diisi');
                return false;
            }
            return { deskripsi, nominal, berlaku_hari };
        }
    });

    if (!formVal) return;
    const res = await App.api(`tickets/${ticketId}/convert-quotation`, { method: 'POST', body: formVal });
    if (res && res.success) {
        App.toast(res.message, 'success');
        window.openAdminTicketModal(ticketId, 'logs');
        loadTickets();
    }
};

window.convertTicketToInvoice = async (ticketId, nomorTiket, judul) => {
    const { value: formVal } = await Swal.fire({
        title: 'Terbitkan Faktur Tambahan',
        html: `
            <div class="text-left space-y-3 text-xs">
                <div>
                    <label class="block font-bold text-slate-600 mb-1">Deskripsi Item Tagihan *</label>
                    <input id="swal-inv-desc" type="text" value="[${App.escapeHtml(nomorTiket)}] Fitur Tambahan: ${App.escapeHtml(judul)}" class="w-full px-3 py-2 border rounded-xl text-xs">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-bold text-slate-600 mb-1">Nominal (IDR) *</label>
                        <input id="swal-inv-nom" type="number" min="1000" step="1000" placeholder="500000" class="w-full px-3 py-2 border rounded-xl font-mono text-xs">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-600 mb-1">Jatuh Tempo (Hari)</label>
                        <input id="swal-inv-due" type="number" min="1" value="14" class="w-full px-3 py-2 border rounded-xl font-mono text-xs">
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Terbitkan Faktur',
        cancelButtonText: 'Batal',
        preConfirm: () => {
            const deskripsi = document.getElementById('swal-inv-desc').value.trim();
            const nominal = parseFloat(document.getElementById('swal-inv-nom').value);
            const jatuh_tempo_hari = parseInt(document.getElementById('swal-inv-due').value, 10) || 14;
            if (!deskripsi || !nominal || nominal <= 0) {
                Swal.showValidationMessage('Deskripsi dan nominal > 0 wajib diisi');
                return false;
            }
            return { deskripsi, nominal, jatuh_tempo_hari };
        }
    });

    if (!formVal) return;
    const res = await App.api(`tickets/${ticketId}/convert-invoice`, { method: 'POST', body: formVal });
    if (res && res.success) {
        App.toast(res.message, 'success');
        window.openAdminTicketModal(ticketId, 'logs');
        loadTickets();
        App.loadNotifications?.(true);
    }
};

window.sendTicketWA = (nomorTiket, judul, clientNama, telepon, status) => {
    const msg = `Halo tim ${clientNama},\n\nUpdate penanganan tiket *${nomorTiket}* (${judul}):\nStatus saat ini: *${String(status).replace('_', ' ').toUpperCase()}*.\n\nSilakan cek detail balasan di Portal Klien atau balas pesan ini jika ada informasi tambahan. Terima kasih.`;
    App.openWhatsApp(telepon, msg);
};

document.addEventListener('click', async (e) => {
    const btn = e.target?.closest('#btn-export-tickets-csv');
    if (!btn) return;
    let ep = `tickets?page=1&per_page=100`;
    if (state.search) ep += `&search=${encodeURIComponent(state.search)}`;
    if (state.status) ep += `&status=${encodeURIComponent(state.status)}`;
    if (state.kategori) ep += `&kategori=${encodeURIComponent(state.kategori)}`;
    if (state.cakupan) ep += `&cakupan_biaya=${encodeURIComponent(state.cakupan)}`;
    const res = await App.api(ep);
    const rows = res?.data || [];
    if (rows.length === 0) {
        App.toast('Tidak ada data tiket untuk diekspor', 'warning');
        return;
    }
    App.exportCsv(
        `rekap-tiket-support-${new Date().toISOString().slice(0, 10)}.csv`,
        ['No. Tiket', 'Tanggal', 'Pelanggan', 'Proyek', 'Subjek', 'Kategori', 'Prioritas', 'Cakupan Biaya', 'Durasi (Menit)', 'Status'],
        rows.map((r) => [r.nomor_tiket, r.created_at, r.client_nama, r.nama_project || '-', r.judul, r.kategori, r.prioritas, r.cakupan_biaya || 'sla_gratis', r.total_durasi_menit || 0, r.status])
    );
    App.toast(`Berhasil mengekspor ${rows.length} tiket ke CSV`, 'success');
});

export default { init };
