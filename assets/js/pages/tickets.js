// assets/js/pages/tickets.js — Manajemen Tiket Gangguan & Bantuan Klien (Admin ERP)
import { App } from '../app.js';
import { renderEmailBody, renderEmailAttachments, initEmailComposer } from '../core/email-editor.js';

let state = { page: 1, perPage: 15, search: '', status: '' };

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

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Tiket Gangguan & Bantuan Klien</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Kelola laporan kendala teknis yang masuk langsung dari Portal Klien.</p>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div class="text-[10px] font-bold uppercase text-amber-600">Tiket Terbuka</div>
                    <div id="kpi-tkt-open" class="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">0</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div class="text-[10px] font-bold uppercase text-indigo-600">Sedang Diproses</div>
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
            </div>

            <!-- Filter Bar -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                <div class="relative flex-1 w-full">
                    <input type="text" id="tkt-search" placeholder="Cari nomor tiket, subjek, atau nama klien..."
                           class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <i class="ri-search-line absolute left-3.5 top-3 text-slate-400 text-sm"></i>
                </div>
                <select id="tkt-filter-status" class="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                    <option value="">Semua Status</option>
                    <option value="terbuka">Terbuka</option>
                    <option value="diproses">Diproses</option>
                    <option value="menunggu_klien">Menunggu Klien</option>
                    <option value="selesai">Selesai</option>
                    <option value="ditutup">Ditutup</option>
                </select>
            </div>

            <!-- Table -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th class="py-3.5 px-6">Tiket & Tanggal</th>
                                <th class="py-3.5 px-6">Pelanggan & Proyek</th>
                                <th class="py-3.5 px-6">Subjek Gangguan</th>
                                <th class="py-3.5 px-6 text-center">Prioritas</th>
                                <th class="py-3.5 px-6 text-center">Status</th>
                                <th class="py-3.5 px-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="tickets-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr><td colspan="6" class="py-12 text-center text-slate-400"><i class="ri-loader-4-line text-2xl animate-spin"></i></td></tr>
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

    await loadTickets();
}

async function loadTickets() {
    const tbody = document.getElementById('tickets-tbody');
    const pagEl = document.getElementById('tickets-pagination');
    let ep = `tickets?page=${state.page}&per_page=${state.perPage}`;
    if (state.search) ep += `&search=${encodeURIComponent(state.search)}`;
    if (state.status) ep += `&status=${encodeURIComponent(state.status)}`;

    const res = await App.api(ep);
    if (!res || !res.success) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-rose-500">Gagal memuat daftar tiket</td></tr>`;
        return;
    }

    const stats = res.stats || {};
    document.getElementById('kpi-tkt-open').textContent = stats.terbuka ?? 0;
    document.getElementById('kpi-tkt-prog').textContent = stats.diproses ?? 0;
    document.getElementById('kpi-tkt-wait').textContent = stats.menunggu_klien ?? 0;
    document.getElementById('kpi-tkt-done').textContent = stats.selesai ?? 0;

    const rows = res.data || [];
    const p = res.pagination || { page: 1, total: rows.length, total_pages: 1 };

    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-slate-400">Belum ada tiket gangguan dari klien</td></tr>`;
        pagEl.innerHTML = '';
        return;
    }

    tbody.innerHTML = rows.map((t) => `
        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
            <td class="py-4 px-6">
                <div class="font-mono font-bold text-xs text-primary-600">${App.escapeHtml(t.nomor_tiket)}</div>
                <div class="text-[11px] text-slate-400 mt-0.5">${App.formatDate(t.created_at)}</div>
            </td>
            <td class="py-4 px-6">
                <div class="font-bold text-slate-900 dark:text-white">${App.escapeHtml(t.client_nama)}</div>
                <div class="text-xs text-slate-500">${App.escapeHtml(t.nama_project || t.nama_aset || 'Umum')}</div>
            </td>
            <td class="py-4 px-6">
                <div class="font-semibold text-slate-800 dark:text-slate-200">${App.escapeHtml(t.judul)}</div>
                <div class="text-xs text-slate-400 truncate max-w-xs">${App.escapeHtml(t.deskripsi)}</div>
            </td>
            <td class="py-4 px-6 text-center">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${PRIO_BADGES[t.prioritas] || ''}">${App.escapeHtml(t.prioritas)}</span>
                ${t.sla_status === 'melewati_sla'
                    ? `<div class="mt-1 text-[10px] font-mono font-bold text-rose-600">SLA Lewat (${t.sla_elapsed_hours}j/${t.sla_hours}j)</div>`
                    : (t.sla_status === 'mendekati'
                        ? `<div class="mt-1 text-[10px] font-mono font-semibold text-amber-600">SLA ${t.sla_elapsed_hours}j/${t.sla_hours}j</div>`
                        : `<div class="mt-1 text-[10px] font-mono text-slate-400">SLA ${t.sla_elapsed_hours || 0}j/${t.sla_hours || 24}j</div>`)}
            </td>
            <td class="py-4 px-6 text-center">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_BADGES[t.status] || ''}">${App.escapeHtml(t.status.replace('_', ' '))}</span>
            </td>
            <td class="py-4 px-6 text-right">
                <button type="button" onclick="window.openAdminTicketModal(${t.id})" class="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition">
                    <i class="ri-chat-3-line"></i> Tangani (${t.reply_count || 0})
                </button>
            </td>
        </tr>
    `).join('');

    pagEl.innerHTML = `
        <div>Menampilkan hal <b>${p.page}</b> dari <b>${p.total}</b> tiket</div>
        <div class="flex items-center gap-2">
            <button ${p.page <= 1 ? 'disabled' : ''} onclick="window.changeTicketPage(${p.page - 1})" class="px-3 py-1.5 border rounded-lg disabled:opacity-40">Sebelumnya</button>
            <button ${p.page >= p.total_pages ? 'disabled' : ''} onclick="window.changeTicketPage(${p.page + 1})" class="px-3 py-1.5 border rounded-lg disabled:opacity-40">Berikutnya</button>
        </div>
    `;
}

window.changeTicketPage = (p) => { state.page = p; loadTickets(); };

window.openAdminTicketModal = async (id) => {
    const res = await App.api(`tickets/${id}`);
    if (!res || !res.success) return;
    const { ticket: t, replies = [] } = res.data;

    let modal = document.getElementById('admin-ticket-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'admin-ticket-modal';
        modal.className = 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4';
        document.body.appendChild(modal);
    }

    let adminReplyComposer = null;
    modal.innerHTML = `
        <div class="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 animate-fadeIn max-h-[92vh] overflow-y-auto space-y-5">
            <div class="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <span class="font-mono text-xs font-bold text-primary-600">${App.escapeHtml(t.nomor_tiket)} · ${App.escapeHtml(t.client_nama)}</span>
                    <h3 class="text-lg font-black text-slate-900 dark:text-white mt-0.5">${App.escapeHtml(t.judul)}</h3>
                    <div class="text-xs text-slate-500 mt-0.5">Pelapor: <b>${App.escapeHtml(t.pelapor_nama)}</b> · ${App.formatDate(t.created_at)}</div>
                </div>
                <div class="flex items-center gap-1.5">
                    <button type="button" onclick="window.convertTicketToTask(${t.id}, ${t.client_id}, ${t.project_id || 'null'}, '${App.escapeHtml(t.nomor_tiket)}', '${App.escapeHtml(t.judul)}')" class="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition" title="Buat Tugas di Papan Kanban Proyek">
                        <i class="ri-kanban-view"></i><span>+ Kanban</span>
                    </button>
                    <button type="button" onclick="window.convertTicketToInvoice(${t.id}, '${App.escapeHtml(t.nomor_tiket)}', '${App.escapeHtml(t.judul)}')" class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition" title="Terbitkan Faktur Tagihan Tambahan">
                        <i class="ri-file-add-line"></i><span>+ Faktur</span>
                    </button>
                    <button type="button" onclick="document.getElementById('admin-ticket-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1"><i class="ri-close-line text-2xl"></i></button>
                </div>
            </div>

            <!-- Email Thread -->
            <div class="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
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
    `;
    modal.classList.remove('hidden');

    adminReplyComposer = initEmailComposer(document.getElementById('adm-tkt-composer'), {
        placeholder: 'Tulis balasan email ke klien atau tempel screenshot dengan Ctrl+V…',
        minHeight: 180
    });

    document.getElementById('admin-ticket-reply-form').onsubmit = async (e) => {
        e.preventDefault();
        if (!adminReplyComposer || !adminReplyComposer.hasContent()) {
            App.toast('Tulis pesan balasan atau lampirkan gambar terlebih dahulu', 'warning');
            return;
        }
        const status = document.getElementById('adm-tkt-status').value;
        const res = await App.api(`tickets/${t.id}/reply`, {
            method: 'POST',
            body: { pesan: adminReplyComposer.getHtml(), status, lampiran: adminReplyComposer.getImages() }
        });
        if (res && res.success) {
            App.toast(res.message, 'success');
            window.openAdminTicketModal(t.id);
            loadTickets();
            App.loadNotifications?.(true);
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
        loadTickets();
        App.loadNotifications?.(true);
    }
};
