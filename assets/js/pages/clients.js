// assets/js/pages/clients.js â€” Manajemen Pelanggan & Pipeline CRM Prospek
import { App } from '../app.js';
import { loadKanban, registerCrmHandlers } from '../core/clients-crm.js';

let activeView = 'table'; // 'table' | 'kanban'
let state = {
    page: 1,
    perPage: 10,
    search: '',
    status: ''
};
const handleSaveFollowup = registerCrmHandlers(() => activeView);

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Manajemen Pelanggan &amp; CRM</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Daftar klien korporat, pipeline prospek penjualan, dan brankas kredensial.</p>
                </div>

                <div class="flex items-center gap-2.5 flex-wrap">
                    <!-- View Mode Toggle -->
                    <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <button id="btn-view-table" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${activeView === 'table' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}">
                            <i class="ri-table-line mr-1"></i> Data Tabel
                        </button>
                        <button id="btn-view-kanban" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${activeView === 'kanban' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}">
                            <i class="ri-kanban-view mr-1"></i> Pipeline Prospek (CRM)
                        </button>
                    </div>

                    <button id="btn-add-client" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-xs shadow-sm shadow-primary-500/20 flex items-center gap-1.5 transition">
                        <i class="ri-user-add-line text-sm"></i>
                        <span>Tambah Pelanggan</span>
                    </button>
                </div>
            </div>

            <!-- View 1: Data Table View -->
            <div id="clients-table-view" class="${activeView === 'table' ? '' : 'hidden'} space-y-4">
                <!-- Filters & Search -->
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                    <div class="relative flex-1 w-full">
                        <input type="text" id="client-search" placeholder="Cari nama perusahaan, penanggung jawab, email, kode..."
                               class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <i class="ri-search-line absolute left-3.5 top-3 text-slate-400 text-sm"></i>
                    </div>
                    <div class="flex items-center gap-3 w-full sm:w-auto">
                        <select id="client-filter-status" class="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="">Semua Status</option>
                            <option value="aktif">Aktif</option>
                            <option value="prospek">Prospek</option>
                            <option value="nonaktif">Nonaktif</option>
                        </select>
                    </div>
                </div>

                <!-- Data Table Card -->
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="data-table w-full text-left text-sm border-collapse">
                            <thead>
                                <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <th class="py-3.5 px-6">Kode &amp; Perusahaan</th>
                                    <th class="py-3.5 px-6">Penanggung Jawab</th>
                                    <th class="py-3.5 px-6">Kontak</th>
                                    <th class="py-3.5 px-6">Proyek</th>
                                    <th class="py-3.5 px-6">Piutang Berjalan</th>
                                    <th class="py-3.5 px-6">Status</th>
                                    <th class="py-3.5 px-6 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="clients-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                                <tr>
                                    <td colspan="7" class="py-12 text-center text-slate-400">
                                        <i class="ri-loader-4-line text-2xl animate-spin mb-2 inline-block"></i>
                                        <div>Memuat data pelanggan...</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination Footer -->
                    <div id="clients-pagination" class="px-7 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500"></div>
                </div>
            </div>

            <!-- View 2: Kanban CRM Pipeline View -->
            <div id="clients-kanban-view" class="${activeView === 'kanban' ? '' : 'hidden'} space-y-4">
                <!-- Pipeline Summary KPI Banner -->
                <div class="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div class="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Total Potensi Nilai Pipeline Prospek</div>
                        <div id="kanban-pipeline-value" class="text-2xl font-black font-mono text-white mt-1">Rp 0</div>
                        <div id="kanban-pipeline-sub" class="text-xs text-indigo-200 mt-0.5">Memuat pipeline penjualan...</div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="btn-refresh-kanban" class="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition">
                            <i class="ri-refresh-line"></i> Segarkan Pipeline
                        </button>
                    </div>
                </div>

                <!-- 6 Kanban Columns Viewport -->
                <div class="overflow-x-auto pb-4">
                    <div id="kanban-board-container" class="flex gap-4 min-w-[1280px]">
                        <div class="text-center py-16 text-slate-400 text-xs w-full">Memuat papan pipeline prospek...</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Client Form Modal -->
        <div id="client-modal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-fadeIn max-h-[90vh] flex flex-col overflow-hidden">
                <div class="flex items-center justify-between px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <h3 id="client-modal-title" class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-building-line text-primary-600"></i>
                        <span>Tambah Pelanggan Baru</span>
                    </h3>
                    <button type="button" id="btn-close-client-modal" class="text-slate-400 hover:text-slate-600 p-1" aria-label="Tutup">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <form id="client-form" class="flex flex-col flex-1 min-h-0">
                    <div class="p-6 sm:px-8 space-y-4 overflow-y-auto flex-1">
                    <input type="hidden" id="form-client-id" value="">

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="sm:col-span-2">
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Nama Perusahaan / Instansi *</label>
                            <input type="text" id="form-client-perusahaan" required placeholder="Contoh: PT Sukses Mandiri"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Penanggung Jawab (PIC) *</label>
                            <input type="text" id="form-client-pic" required placeholder="Nama PIC"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Email Penagihan *</label>
                            <input type="email" id="form-client-email" required placeholder="billing@perusahaan.com"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">CC Email (Opsional)</label>
                            <input type="text" id="form-client-cc-email" placeholder="finance@klien.com, pic@klien.com"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Telepon / WhatsApp</label>
                            <input type="text" id="form-client-telepon" placeholder="0812xxxx"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">NPWP</label>
                            <input type="text" id="form-client-npwp" placeholder="00.000.000.0-000.000"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Kota</label>
                            <input type="text" id="form-client-kota" placeholder="Jakarta"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Status Pelanggan</label>
                            <select id="form-client-status" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="aktif">Aktif</option>
                                <option value="prospek">Prospek</option>
                                <option value="nonaktif">Nonaktif</option>
                            </select>
                        </div>

                        <!-- Extra CRM Fields when status is Prospek -->
                        <div id="form-prospect-extra-box" class="sm:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                            <div class="text-[11px] font-bold uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                <i class="ri-kanban-view text-sm"></i>
                                <span>Informasi Pipeline CRM Prospek</span>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Tahapan Pipeline</label>
                                    <select id="form-client-stage" class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                                        <option value="leads_baru">1. Leads Masuk</option>
                                        <option value="kontak_awal">2. Kontak Awal</option>
                                        <option value="proposal_penawaran">3. Proposal SPH</option>
                                        <option value="negosiasi">4. Negosiasi Final</option>
                                        <option value="deal_menang">5. Deal Menang (Won)</option>
                                        <option value="batal_lost">6. Batal / Kalah (Lost)</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Estimasi Nilai Proyek (Deal Rp)</label>
                                    <input type="number" id="form-client-deal-value" min="0" step="1000" placeholder="0"
                                           class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold">
                                </div>
                            </div>
                        </div>

                        <div class="sm:col-span-2">
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Alamat Lengkap</label>
                            <textarea id="form-client-alamat" rows="2" placeholder="Alamat penagihan pada faktur"
                                      class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"></textarea>
                        </div>
                    </div>

                    </div>

                    <div class="px-6 sm:px-8 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3 shrink-0">
                        <button type="button" id="btn-cancel-client" class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold">Batal</button>
                        <button type="submit" id="btn-save-client" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/20">Simpan Data</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Client Follow-Up CRM Modal -->
        <div id="client-followup-modal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 animate-fadeIn max-h-[90vh] overflow-y-auto space-y-5">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-chat-history-line text-primary-600"></i>
                            <span>Catatan Interaksi &amp; Follow-Up CRM</span>
                        </h3>
                        <p id="followup-client-name" class="text-xs text-slate-500 font-bold mt-0.5">-</p>
                    </div>
                    <button id="btn-close-followup-modal" class="text-slate-400 hover:text-slate-600">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <!-- Form Add Follow-up -->
                <form id="form-add-followup" class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-3">
                    <div class="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <i class="ri-add-circle-line text-primary-600"></i>
                        <span>Tambah Catatan Interaksi Baru</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Media Interaksi</label>
                            <select id="form-fu-tipe" class="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                                <option value="whatsapp">WhatsApp Chat / Call</option>
                                <option value="telepon">Telepon Langsung</option>
                                <option value="meeting_online">Meeting Online (Zoom / GMeet)</option>
                                <option value="meeting_offline">Meeting Tatap Muka</option>
                                <option value="email">Email Penawaran</option>
                                <option value="catatan">Catatan Internal</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Rencana Kontak Berikutnya (Opsional)</label>
                            <input type="date" id="form-fu-next-date" class="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>
                    </div>

                    <div>
                        <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Rangkuman Hasil Pembicaraan *</label>
                        <textarea id="form-fu-catatan" required rows="2" placeholder="Contoh: Klien berminat paket development portal web, menunggu revisi SPH penyesuaian termin..."
                                  class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"></textarea>
                    </div>

                    <div class="flex justify-end">
                        <button type="submit" class="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-xs">
                            Simpan Catatan
                        </button>
                    </div>
                </form>

                <!-- History Timeline -->
                <div class="space-y-3">
                    <h4 class="text-xs font-bold uppercase text-slate-400 tracking-wider">Riwayat Interaksi Terdahulu</h4>
                    <div id="followup-timeline-list" class="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                        <div class="text-center py-6 text-slate-400 text-xs">Memuat riwayat interaksi...</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // View Switcher Events
    document.getElementById('btn-view-table')?.addEventListener('click', () => switchView('table'));
    document.getElementById('btn-view-kanban')?.addEventListener('click', () => switchView('kanban'));
    document.getElementById('btn-refresh-kanban')?.addEventListener('click', () => loadKanban());

    // Event Bindings
    document.getElementById('btn-add-client').addEventListener('click', () => openClientModal());
    document.getElementById('btn-close-client-modal').addEventListener('click', () => closeClientModal());
    document.getElementById('btn-cancel-client').addEventListener('click', () => closeClientModal());
    document.getElementById('client-form').addEventListener('submit', handleSaveClient);

    // Dynamic Prospect Stage field toggle
    const statusSelect = document.getElementById('form-client-status');
    const extraBox = document.getElementById('form-prospect-extra-box');
    statusSelect?.addEventListener('change', () => {
        if (statusSelect.value === 'prospek') {
            extraBox?.classList.remove('hidden');
        } else {
            extraBox?.classList.add('hidden');
        }
    });

    // Follow-up modal close
    document.getElementById('btn-close-followup-modal')?.addEventListener('click', () => {
        document.getElementById('client-followup-modal')?.classList.add('hidden');
    });
    document.getElementById('form-add-followup')?.addEventListener('submit', handleSaveFollowup);

    // Search & Filter
    const searchInput = document.getElementById('client-search');
    let searchTimer;
    searchInput?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            state.search = searchInput.value.trim();
            state.page = 1;
            loadClients();
        }, 300);
    });

    document.getElementById('client-filter-status')?.addEventListener('change', (e) => {
        state.status = e.target.value;
        state.page = 1;
        loadClients();
    });

    loadClients();
}

function switchView(view) {
    activeView = view;
    const btnTable = document.getElementById('btn-view-table');
    const btnKanban = document.getElementById('btn-view-kanban');
    const tableView = document.getElementById('clients-table-view');
    const kanbanView = document.getElementById('clients-kanban-view');

    if (view === 'table') {
        btnTable.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs';
        btnKanban.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition text-slate-500 hover:text-slate-900 dark:hover:text-white';
        tableView.classList.remove('hidden');
        kanbanView.classList.add('hidden');
        loadClients();
    } else {
        btnKanban.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs';
        btnTable.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition text-slate-500 hover:text-slate-900 dark:hover:text-white';
        kanbanView.classList.remove('hidden');
        tableView.classList.add('hidden');
        loadKanban();
    }
}

async function loadClients() {
    const tbody = document.getElementById('clients-tbody');
    const paginationEl = document.getElementById('clients-pagination');

    let endpoint = `clients?page=${state.page}&per_page=${state.perPage}`;
    if (state.search) endpoint += `&search=${encodeURIComponent(state.search)}`;
    if (state.status) endpoint += `&status=${encodeURIComponent(state.status)}`;

    const res = await App.api(endpoint);
    if (!res || !res.success) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-rose-500 font-semibold">Gagal memuat data pelanggan</td></tr>`;
        return;
    }

    const { data: clients, pagination } = res;

    if (clients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-12 text-center text-slate-400">
                    <i class="ri-user-search-line text-3xl mb-2 inline-block"></i>
                    <div>Tidak ada pelanggan yang cocok dengan pencarian</div>
                </td>
            </tr>
        `;
        paginationEl.innerHTML = '';
        return;
    }

    const clientsById = new Map();
    clients.forEach((c) => clientsById.set(Number(c.id), c));

    if (!tbody.dataset.menuBound) {
        tbody.dataset.menuBound = '1';
        tbody.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-client-menu]');
            if (!trigger) return;
            const c = clientsById.get(Number(trigger.dataset.clientMenu));
            if (!c) return;
            App.toggleTableActionMenu(trigger, e, [
                { label: 'Edit Profil Klien', icon: 'ri-edit-line', iconColor: 'text-primary-600', fn: () => window.editClient(c.id) },
                { label: 'Catatan Follow-Up CRM', icon: 'ri-chat-history-line', iconColor: 'text-sky-600', fn: () => window.openClientFollowups(c.id, c.nama_perusahaan) },
                {
                    label: 'Portal & Kredensial',
                    icon: 'ri-global-line',
                    iconColor: 'text-indigo-600',
                    children: [
                        { label: 'Buka Portal Klien', icon: 'ri-external-link-line', iconColor: 'text-sky-600', fn: () => window.openClientPortal(c.portal_token || '') },
                        { label: 'Salin Tautan Portal', icon: 'ri-file-copy-line', iconColor: 'text-indigo-600', fn: () => window.copyClientPortalLink(c.portal_token || '') },
                        { label: 'Portal Mandiri (PWA)', icon: 'ri-smartphone-line', iconColor: 'text-teal-600', fn: () => window.openClientPortalPwa() },
                        { label: c.portal_access_active == 1 ? 'Reset / Cabut Akses Login' : 'Aktifkan Akses Login Portal', icon: 'ri-key-2-line', iconColor: 'text-amber-600', fn: () => window.manageClientPortalAccess(c.id, c.nama_perusahaan, c.portal_access_active == 1 ? 1 : 0) },
                        { label: 'Kirim Portal via WA', icon: 'ri-whatsapp-line', iconColor: 'text-emerald-600', fn: () => window.sendClientPortalWhatsApp(c.portal_token || '', c.nama_perusahaan, c.telepon || '', c.penanggung_jawab || '') },
                        { label: 'Brankas Kredensial', icon: 'ri-lock-password-line', iconColor: 'text-amber-500', fn: () => { window.location.hash = `#/credentials?client_id=${c.id}`; } }
                    ]
                },
                {
                    label: 'Keuangan & Dokumen',
                    icon: 'ri-file-list-3-line',
                    iconColor: 'text-emerald-600',
                    children: [
                        { label: 'Rekening Koran (PDF)', icon: 'ri-file-chart-line', iconColor: 'text-indigo-600', fn: () => window.printClientStatement(c.id) },
                        { label: 'Kelola Deposit / Retainer', icon: 'ri-wallet-3-line', iconColor: 'text-amber-600', fn: () => window.openClientDepositModal(c.id, c.nama_perusahaan) },
                        { label: 'Buat Faktur Baru', icon: 'ri-file-add-line', iconColor: 'text-indigo-600', fn: () => { window.location.hash = '#/invoices'; } },
                        { label: 'Buat Penawaran Baru', icon: 'ri-draft-line', iconColor: 'text-emerald-600', fn: () => { window.location.hash = '#/quotations'; } }
                    ]
                },
                { divider: true },
                { label: 'Hapus Klien', icon: 'ri-delete-bin-line', danger: true, fn: () => window.deleteClient(c.id, c.nama_perusahaan) }
            ]);
        });
    }

    tbody.innerHTML = clients.map(c => {
        const piutangClass = Number(c.total_piutang) > 0 ? 'text-amber-600 font-bold font-mono' : 'text-slate-400 font-mono';

        return `
            <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <td class="py-3.5 px-6 align-middle max-w-[240px]">
                    <div class="font-bold text-slate-900 dark:text-white truncate" title="${App.escapeHtml(c.nama_perusahaan)}">${App.escapeHtml(c.nama_perusahaan)}</div>
                    <div class="text-xs font-mono text-primary-600 dark:text-primary-400 whitespace-nowrap">${App.escapeHtml(c.kode_klien)}</div>
                </td>
                <td class="py-3.5 px-6 align-middle max-w-[180px]">
                    <div class="font-medium text-slate-800 dark:text-slate-200 truncate" title="${App.escapeHtml(c.penanggung_jawab)}">${App.escapeHtml(c.penanggung_jawab)}</div>
                    <div class="text-xs text-slate-400 truncate">${App.escapeHtml(c.kota || '-')}</div>
                </td>
                <td class="py-3.5 px-6 align-middle max-w-[200px]">
                    <div class="text-xs text-slate-600 dark:text-slate-300 truncate" title="${App.escapeHtml(c.email)}">${App.escapeHtml(c.email)}</div>
                    <div class="text-xs text-slate-400 font-mono whitespace-nowrap">${App.escapeHtml(c.telepon || '-')}</div>
                </td>
                <td class="py-3.5 px-6 align-middle whitespace-nowrap">
                    <span class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        ${c.total_projects} Proyek
                    </span>
                </td>
                <td class="py-3.5 px-6 align-middle whitespace-nowrap ${piutangClass}">
                    ${App.formatIDR(c.total_piutang)}
                </td>
                <td class="py-3.5 px-6 align-middle whitespace-nowrap">
                    ${App.renderStatusBadge(c.status, 'client')}
                </td>
                <td class="py-3.5 px-6 align-middle text-right whitespace-nowrap">
                    <button type="button" data-table-action-trigger data-client-menu="${c.id}" class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition" title="Menu Aksi">
                        <span>Aksi</span>
                        <i class="ri-more-2-fill text-slate-400"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Pagination
    App.renderPagination(paginationEl, pagination, (p) => { state.page = p; loadClients(); }, 'klien');
}

window.openClientDepositModal = async (clientId, clientName) => {
    const res = await App.api(`clients/${clientId}/deposit`);
    if (!res?.success) return;
    const { saldo_deposit: saldo, logs = [] } = res.data;

    App.openModal(`
        <div class="p-6 space-y-5">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <div class="text-[11px] font-mono font-bold uppercase text-amber-600">Deposit & Retainer Klien</div>
                    <h3 class="text-lg font-extrabold text-slate-900 dark:text-white">${App.escapeHtml(clientName)}</h3>
                </div>
                <div class="text-right">
                    <div class="text-[10px] uppercase text-slate-400 font-bold">Saldo Saat Ini</div>
                    <div class="text-lg font-black font-mono text-emerald-600">${App.formatIDR(saldo)}</div>
                </div>
            </div>

            <form id="client-deposit-form" class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Aksi</label>
                    <select id="dep-tipe" class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold">
                        <option value="topup">Topup / Tambah Deposit</option>
                        <option value="refund">Refund / Kurangi</option>
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Nominal (Rp) *</label>
                    <input id="dep-nominal" type="number" min="1000" required placeholder="1000000" class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono">
                </div>
                <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Catatan</label>
                    <input id="dep-catatan" type="text" placeholder="Transfer retainer..." class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                </div>
                <div class="sm:col-span-3 flex justify-end">
                    <button type="submit" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold">Simpan Transaksi Deposit</button>
                </div>
            </form>

            <div class="space-y-2">
                <div class="text-xs font-bold uppercase text-slate-500">Riwayat Mutasi Deposit</div>
                <div class="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
                    ${logs.length ? logs.map((l) => `
                        <div class="px-4 py-2.5 flex items-center justify-between gap-2">
                            <div>
                                <div class="font-semibold text-slate-800 dark:text-slate-200">${App.escapeHtml(l.catatan || l.tipe)}</div>
                                <div class="text-[10px] text-slate-400 font-mono">${App.formatDateTime(l.created_at)}</div>
                            </div>
                            <div class="text-right font-mono">
                                <div class="font-bold ${l.tipe === 'topup' ? 'text-emerald-600' : 'text-rose-600'}">${l.tipe === 'topup' ? '+' : '-'}${App.formatIDR(l.nominal)}</div>
                                <div class="text-[10px] text-slate-400">Saldo: ${App.formatIDR(l.saldo_setelah)}</div>
                            </div>
                        </div>`).join('') : `<div class="p-6 text-center text-slate-400">Belum ada mutasi deposit.</div>`}
                </div>
            </div>
        </div>
    `, { size: 'lg' });

    document.getElementById('client-deposit-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const r = await App.api(`clients/${clientId}/deposit`, {
            method: 'POST',
            body: {
                tipe: document.getElementById('dep-tipe').value,
                nominal: document.getElementById('dep-nominal').value,
                catatan: document.getElementById('dep-catatan').value.trim()
            }
        });
        if (r?.success) {
            App.toast(r.message || 'Saldo deposit diperbarui', 'success');
            App.closeModal();
            window.openClientDepositModal(clientId, clientName);
        }
    });
};

// Kanban CRM Board Loader

function openClientModal(client = null) {
    const modal = document.getElementById('client-modal');
    const title = document.getElementById('client-modal-title');
    const form = document.getElementById('client-form');
    const extraBox = document.getElementById('form-prospect-extra-box');
    form.reset();

    if (client) {
        title.innerHTML = `<i class="ri-edit-line text-primary-600"></i><span>Edit Data Pelanggan</span>`;
        document.getElementById('form-client-id').value = client.id;
        document.getElementById('form-client-perusahaan').value = client.nama_perusahaan;
        document.getElementById('form-client-pic').value = client.penanggung_jawab;
        document.getElementById('form-client-email').value = client.email;
        const ccEl = document.getElementById('form-client-cc-email');
        if (ccEl) ccEl.value = client.cc_email || '';
        document.getElementById('form-client-telepon').value = client.telepon || '';
        document.getElementById('form-client-npwp').value = client.npwp || '';
        document.getElementById('form-client-kota').value = client.kota || '';
        document.getElementById('form-client-alamat').value = client.alamat || '';
        document.getElementById('form-client-status').value = client.status;
        document.getElementById('form-client-stage').value = client.prospect_stage || 'leads_baru';
        document.getElementById('form-client-deal-value').value = client.deal_value || '';

        if (client.status === 'prospek') {
            extraBox.classList.remove('hidden');
        } else {
            extraBox.classList.add('hidden');
        }
    } else {
        title.innerHTML = `<i class="ri-building-line text-primary-600"></i><span>Tambah Pelanggan Baru</span>`;
        document.getElementById('form-client-id').value = '';
        extraBox.classList.add('hidden');
    }

    modal.classList.remove('hidden');
}

function closeClientModal() {
    document.getElementById('client-modal').classList.add('hidden');
}

async function handleSaveClient(e) {
    e.preventDefault();
    const id = document.getElementById('form-client-id').value;
    const body = {
        nama_perusahaan: document.getElementById('form-client-perusahaan').value.trim(),
        penanggung_jawab: document.getElementById('form-client-pic').value.trim(),
        email: document.getElementById('form-client-email').value.trim(),
        cc_email: document.getElementById('form-client-cc-email')?.value.trim() || '',
        telepon: document.getElementById('form-client-telepon').value.trim(),
        npwp: document.getElementById('form-client-npwp').value.trim(),
        kota: document.getElementById('form-client-kota').value.trim(),
        alamat: document.getElementById('form-client-alamat').value.trim(),
        status: document.getElementById('form-client-status').value,
        prospect_stage: document.getElementById('form-client-stage').value,
        deal_value: document.getElementById('form-client-deal-value').value || 0
    };

    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `clients/${id}` : 'clients';

    const res = await App.api(endpoint, {
        method,
        body: JSON.stringify(body)
    });

    if (res && res.success) {
        App.toast(res.message, 'success');
        closeClientModal();
        if (activeView === 'kanban') loadKanban();
        else loadClients();
    } else {
        App.toast(res?.message || 'Gagal menyimpan data', 'error');
    }
}

window.editClient = async (id) => {
    const res = await App.api(`clients/${id}`);
    if (res && res.success) {
        openClientModal(res.data);
    }
};

window.changeClientPage = (page) => {
    state.page = page;
    loadClients();
};

window.deleteClient = async (id, name) => {
    const res = await App.api(`clients/${id}`, { method: 'DELETE' });

    if (res && res.success) {
        App.toast(res.message, 'success');
        loadClients();
        return;
    }

    if (res && res.can_force) {
        const result = await Swal.fire({
            title: 'Pelanggan Memiliki Data Terkait',
            html: `<p class="text-sm text-slate-600 dark:text-slate-300 mb-4">${res.message}</p>
                   <p class="text-xs text-slate-400">Pilih tindakan yang diinginkan:</p>`,
            icon: 'warning',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: '<i class="ri-forbid-line"></i> Nonaktifkan Saja (Disarankan)',
            denyButtonText: '<i class="ri-delete-bin-7-line"></i> Hapus Paksa & Penawarannya',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#4f46e5',
            denyButtonColor: '#e11d48'
        });

        if (result.isConfirmed) {
            const updateRes = await App.api(`clients/${id}`, {
                method: 'PUT',
                body: { status: 'nonaktif' }
            });
            if (updateRes && updateRes.success) {
                App.toast(`Status pelanggan "${name}" berhasil diubah menjadi Nonaktif`, 'success');
                loadClients();
            }
        } else if (result.isDenied) {
            const forceRes = await App.api(`clients/${id}?force=1`, { method: 'DELETE' });
            if (forceRes && forceRes.success) {
                App.toast(forceRes.message, 'success');
                loadClients();
            }
        }
        return;
    }

    if (res && res.has_invoices) {
        const result = await Swal.fire({
            title: 'Tidak Dapat Dihapus Permanen',
            text: res.message,
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'Ubah Status Jadi Nonaktif',
            cancelButtonText: 'Tutup',
            confirmButtonColor: '#4f46e5'
        });
        if (result.isConfirmed) {
            const updateRes = await App.api(`clients/${id}`, {
                method: 'PUT',
                body: { status: 'nonaktif' }
            });
            if (updateRes && updateRes.success) {
                App.toast(`Status pelanggan "${name}" berhasil diubah menjadi Nonaktif`, 'success');
                loadClients();
            }
        }
        return;
    }

    App.toast(res?.message || 'Gagal menghapus data pelanggan', 'error');
};

window.openClientPortal = (token) => {
    if (!token) {
        App.toast('Token portal klien belum digenerate', 'warning');
        return;
    }
    const portalUrl = `${window.location.origin}${window.location.pathname}#/client-portal?token=${encodeURIComponent(token)}`;
    window.open(portalUrl, '_blank');
};

window.copyClientPortalLink = (token) => {
    if (!token) {
        App.toast('Token portal klien belum digenerate', 'warning');
        return;
    }
    const portalUrl = `${window.location.origin}${window.location.pathname}#/client-portal?token=${encodeURIComponent(token)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(portalUrl).then(() => {
            App.toast('Tautan portal klien berhasil disalin ke clipboard', 'success');
        }).catch(() => {
            window.prompt('Salin tautan portal klien berikut:', portalUrl);
        });
    } else {
        window.prompt('Salin tautan portal klien berikut:', portalUrl);
    }
};

window.sendClientPortalWhatsApp = (token, company, phone, pic) => {
    if (!token) {
        App.toast('Token portal klien belum digenerate', 'warning');
        return;
    }
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    let waPhone = cleanPhone;
    if (waPhone.startsWith('0')) {
        waPhone = '62' + waPhone.substring(1);
    }

    const portalUrl = `${window.location.origin}${window.location.pathname}#/client-portal?token=${encodeURIComponent(token)}`;
    const greeting = pic ? `Halo Bpk/Ibu ${pic}` : `Halo Rekan`;
    const msg = `${greeting} (${company}),\n\nBerikut kami lampirkan tautan resmi Portal Klien CRUDWorks untuk memantau status faktur, proposal penawaran, dan SLA layanan Anda secara real-time:\n\n${portalUrl}\n\nTerima kasih atas kerja samanya.`;

    App.openWhatsApp(telepon, msg);
};

window.openClientPortalPwa = () => {
    const url = new URL('portal/', window.location.origin + window.location.pathname).href;
    window.open(url, '_blank');
};

window.manageClientPortalAccess = async (id, name, active = 0) => {
    const intro = active
        ? `Klien <b>${App.escapeHtml(name)}</b> sudah memiliki akses login. Buat kata sandi baru (akses lama langsung tidak berlaku) atau cabut akses sepenuhnya.`
        : `Buat akses login Portal Klien (PWA) untuk <b>${App.escapeHtml(name)}</b>. Kata sandi acak akan dibuat dan hanya ditampilkan satu kali.`;
    const first = await Swal.fire({
        title: 'Akses Login Portal Klien',
        html: `<div class="text-left text-xs text-slate-600 leading-relaxed">${intro}</div>`,
        icon: 'info',
        showCancelButton: true,
        showDenyButton: !!active,
        confirmButtonText: active ? 'Reset Kata Sandi' : 'Buat Akses',
        denyButtonText: 'Cabut Akses',
        cancelButtonText: 'Tutup'
    });

    if (first.isDenied) {
        const res = await App.api(`clients/${id}/portal-access`, { method: 'POST', body: { mode: 'revoke' } });
        if (res && res.success) {
            App.toast(res.message, 'success');
            if (typeof loadClients === 'function') loadClients();
        }
        return;
    }
    if (!first.isConfirmed) return;

    const res = await App.api(`clients/${id}/portal-access`, { method: 'POST', body: { mode: 'generate' } });
    if (!res || !res.success) return;
    const d = res.data;
    if (typeof loadClients === 'function') loadClients();

    const shareText = `Halo ${d.penanggung_jawab || 'Rekan'} (${d.nama_perusahaan}),\n\nAkses Portal Klien CRUDWorks Anda sudah aktif. Pantau progres proyek, tanda tangani BAST, dan lihat tagihan lewat aplikasi berikut:\n\n${d.portal_url}\n\nKode Klien: ${d.login_id}\nEmail: ${d.email}\nKata sandi: ${d.password}\n\nDisarankan mengganti kata sandi setelah login pertama dan memasang aplikasi ke layar utama.`;

    const second = await Swal.fire({
        title: 'Akses Portal Siap',
        html: `
            <div class="text-left text-xs space-y-2">
                <div class="p-3 rounded-xl bg-slate-100 font-mono leading-relaxed break-all">
                    <div><b>URL</b>: ${App.escapeHtml(d.portal_url)}</div>
                    <div><b>Kode Klien</b>: ${App.escapeHtml(d.login_id)}</div>
                    <div><b>Email</b>: ${App.escapeHtml(d.email)}</div>
                    <div><b>Kata sandi</b>: <span class="font-extrabold text-primary-700">${App.escapeHtml(d.password)}</span></div>
                </div>
                <div class="text-[11px] text-amber-700">Kata sandi hanya tampil sekali. Salin atau kirim sekarang.</div>
            </div>`,
        icon: 'success',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Salin Kredensial',
        denyButtonText: 'Kirim via WA',
        cancelButtonText: 'Selesai'
    });

    if (second.isConfirmed) {
        try { await navigator.clipboard.writeText(shareText); App.toast('Kredensial portal disalin', 'success'); }
        catch (_) { window.prompt('Salin kredensial portal:', shareText); }
    } else if (second.isDenied) {
        App.openWhatsApp(d.telepon, shareText);
    }
};

window.printClientStatement = async (clientId) => {
    try {
        App.toast('Menyiapkan Rekening Koran PDF...', 'info');
        const res = await App.api(`clients/${clientId}/statement`);
        if (!res?.success || !res.data) {
            App.toast(res?.message || 'Gagal memuat data rekening koran', 'error');
            return;
        }
        const pdfRes = await App.generateClientStatementPdf(res.data, 'bloburl');
        if (pdfRes?.blobUrl) {
            App.openPdfModal({
                title: `Rekening Koran â€” ${res.data.client?.nama_perusahaan || ''}`,
                filename: pdfRes.filename,
                blobUrl: pdfRes.blobUrl
            });
        }
    } catch (err) {
        App.toast(err?.message || 'Gagal membuat PDF rekening koran', 'error');
    }
};
