// assets/js/pages/timesheets.js
import { App } from '../app.js';

let state = {
    page: 1,
    perPage: 15,
    search: '',
    projectId: '',
    status: '',
    isBillable: '',
    selectedIds: new Set()
};

let masterProjects = [];
let masterUsers = [];

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header Section -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Log Jam Kerja (Timesheet)</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Pantau jam kerja tim teknis, kalkulasi billing rate per jam, dan konversi ke faktur klien dengan satu klik.</p>
                </div>
                <div class="flex items-center gap-2.5">
                    <button id="btn-bill-selected" disabled
                            class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:hover:bg-primary-600 text-white font-semibold rounded-xl text-sm shadow-md shadow-primary-500/20 flex items-center gap-2 transition">
                        <i class="ri-receipt-line text-base"></i>
                        <span>Tagihkan ke Faktur (<span id="selected-count">0</span>)</span>
                    </button>
                    <button id="btn-add-timesheet" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-500/20 flex items-center gap-2 transition">
                        <i class="ri-time-line text-base"></i>
                        <span>Catat Jam Kerja</span>
                    </button>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-600 flex items-center justify-center text-2xl font-bold">
                        <i class="ri-timer-2-line"></i>
                    </div>
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Jam Tercatat</span>
                        <div id="kpi-total-jam" class="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">0 Jam</div>
                    </div>
                </div>

                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-2xl font-bold">
                        <i class="ri-money-dollar-circle-line"></i>
                    </div>
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Jam Dapat Ditagih</span>
                        <div id="kpi-billable-jam" class="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">0 Jam</div>
                    </div>
                </div>

                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-2xl font-bold">
                        <i class="ri-wallet-3-line"></i>
                    </div>
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Estimasi Belum Ditagih</span>
                        <div id="kpi-unbilled-amount" class="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">Rp 0</div>
                    </div>
                </div>

                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-slate-500/10 text-slate-600 flex items-center justify-center text-2xl font-bold">
                        <i class="ri-draft-line"></i>
                    </div>
                    <div>
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Entri Draf / Perlu Review</span>
                        <div id="kpi-draft-count" class="text-xl font-black font-mono text-slate-700 dark:text-slate-300 mt-0.5">0 Sesi</div>
                    </div>
                </div>
            </div>

            <!-- Filters Bar -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div class="relative flex-1 min-w-[240px]">
                    <input type="text" id="ts-search" placeholder="Cari uraian tugas, nama proyek, nama pengembang..."
                           class="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <i class="ri-search-line absolute left-3 top-2.5 text-slate-400 text-sm"></i>
                </div>

                <div class="flex flex-wrap items-center gap-2.5 text-xs">
                    <select id="filter-ts-project" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <option value="">Semua Proyek...</option>
                    </select>

                    <select id="filter-ts-status" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <option value="">Semua Status</option>
                        <option value="draft">Draf</option>
                        <option value="disetujui">Disetujui (Siap Tagih)</option>
                        <option value="sudah_ditagih">Sudah Ditagih</option>
                    </select>

                    <select id="filter-ts-billable" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <option value="">Semua Tipe Billing</option>
                        <option value="1">Hanya Dapat Ditagih (Billable)</option>
                        <option value="0">Non-Billable (Internal)</option>
                    </select>
                </div>
            </div>

            <!-- Timesheet Data Table Card -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th class="py-3.5 px-4 text-center w-12">
                                    <input type="checkbox" id="check-all-ts" class="rounded border-slate-300 text-primary-600 focus:ring-primary-500">
                                </th>
                                <th class="py-3.5 px-4">Tanggal & Waktu</th>
                                <th class="py-3.5 px-4">Pengembang</th>
                                <th class="py-3.5 px-6">Proyek & Klien</th>
                                <th class="py-3.5 px-6">Uraian Tugas</th>
                                <th class="py-3.5 px-4 text-center">Durasi</th>
                                <th class="py-3.5 px-6 text-right">Rate & Nilai</th>
                                <th class="py-3.5 px-4 text-center">Status</th>
                                <th class="py-3.5 px-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="timesheet-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr>
                                <td colspan="9" class="py-12 text-center text-slate-400">
                                    <i class="ri-loader-4-line text-2xl animate-spin mb-2 inline-block"></i>
                                    <div>Memuat data timesheet...</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div id="timesheet-pagination" class="px-7 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500"></div>
            </div>
        </div>

        <!-- Modal Catat / Edit Timesheet -->
        <div id="ts-modal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-fadeIn max-h-[92vh] overflow-y-auto">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                    <h3 id="ts-modal-title" class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-time-line text-emerald-600"></i>
                        <span>Catat Log Jam Kerja</span>
                    </h3>
                    <button onclick="document.getElementById('ts-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <form id="ts-form" class="space-y-4">
                    <input type="hidden" id="form-ts-id">

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Pilih Proyek Klien *</label>
                        <select id="form-ts-project" required
                                class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="">Pilih Proyek...</option>
                        </select>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Pengembang / Tim *</label>
                            <select id="form-ts-user" required
                                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Tanggal Pengerjaan *</label>
                            <input type="date" id="form-ts-tanggal" required
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>
                    </div>

                    <div class="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <span class="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Kalkulator Durasi Kerja</span>
                        <div class="grid grid-cols-3 gap-3">
                            <div>
                                <label class="block text-[11px] text-slate-400 mb-1">Jam Mulai</label>
                                <input type="time" id="form-ts-mulai" class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                            </div>
                            <div>
                                <label class="block text-[11px] text-slate-400 mb-1">Jam Selesai</label>
                                <input type="time" id="form-ts-selesai" class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                            </div>
                            <div>
                                <label class="block text-[11px] text-slate-400 mb-1">Total Menit *</label>
                                <input type="number" id="form-ts-durasi" required min="5" step="5" placeholder="60"
                                       class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-primary-600">
                            </div>
                        </div>
                        <div id="ts-calc-hint" class="text-[11px] text-slate-500 font-mono">Total durasi: 1 jam 0 menit</div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Tarif per Jam (IDR / Jam)</label>
                            <input type="number" id="form-ts-rate" min="0" step="5000" placeholder="150000"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Status Entri</label>
                            <select id="form-ts-status"
                                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="disetujui">Disetujui (Siap Ditagih)</option>
                                <option value="draft">Draf (Perlu Review)</option>
                            </select>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 pt-1">
                        <input type="checkbox" id="form-ts-billable" checked class="w-4 h-4 rounded text-primary-600 border-slate-300 focus:ring-primary-500">
                        <label for="form-ts-billable" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Dapat ditagihkan ke klien (Billable)</label>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Uraian Tugas / Pekerjaan Selesai *</label>
                        <textarea id="form-ts-deskripsi" rows="3" required placeholder="Contoh: Implementasi modul autentikasi JWT dan middleware RBAC"
                                  class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"></textarea>
                    </div>

                    <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                        <button type="button" onclick="document.getElementById('ts-modal').classList.add('hidden')"
                                class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold">Batal</button>
                        <button type="submit" id="btn-save-ts"
                                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-500/20">Simpan Jam Kerja</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Load master references
    await Promise.all([loadMasterProjects(), loadMasterUsers()]);

    // Bindings
    document.getElementById('btn-add-timesheet').addEventListener('click', () => openTimesheetModal());
    document.getElementById('ts-form').addEventListener('submit', handleSaveTimesheet);
    document.getElementById('btn-bill-selected').addEventListener('click', handleBillSelected);

    // Auto calculate duration on time changes
    const timeMulai = document.getElementById('form-ts-mulai');
    const timeSelesai = document.getElementById('form-ts-selesai');
    const inputDurasi = document.getElementById('form-ts-durasi');

    const updateCalc = () => {
        const m = timeMulai.value;
        const s = timeSelesai.value;
        if (m && s) {
            const t1 = new Date(`2000-01-01T${m}:00`);
            const t2 = new Date(`2000-01-01T${s}:00`);
            if (t2 > t1) {
                const diffMin = Math.round((t2 - t1) / 60000);
                inputDurasi.value = diffMin;
            }
        }
        updateDurationHint();
    };

    timeMulai.addEventListener('change', updateCalc);
    timeSelesai.addEventListener('change', updateCalc);
    inputDurasi.addEventListener('input', updateDurationHint);

    // Search & Filters
    const searchInput = document.getElementById('ts-search');
    let timer;
    searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            state.search = searchInput.value.trim();
            state.page = 1;
            loadTimesheets();
        }, 300);
    });

    document.getElementById('filter-ts-project').addEventListener('change', (e) => {
        state.projectId = e.target.value;
        state.page = 1;
        loadTimesheets();
    });

    document.getElementById('filter-ts-status').addEventListener('change', (e) => {
        state.status = e.target.value;
        state.page = 1;
        loadTimesheets();
    });

    document.getElementById('filter-ts-billable').addEventListener('change', (e) => {
        state.isBillable = e.target.value;
        state.page = 1;
        loadTimesheets();
    });

    document.getElementById('check-all-ts').addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.querySelectorAll('.ts-row-check:not(:disabled)').forEach(cb => {
            cb.checked = checked;
            const id = parseInt(cb.getAttribute('data-id'));
            if (checked) state.selectedIds.add(id);
            else state.selectedIds.delete(id);
        });
        updateSelectedUI();
    });

    loadTimesheets();
}

function updateDurationHint() {
    const mins = parseInt(document.getElementById('form-ts-durasi').value) || 0;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    const hint = document.getElementById('ts-calc-hint');
    if (hint) {
        hint.textContent = `Total durasi: ${hours} jam ${remMins} menit (${(mins / 60).toFixed(2)} jam)`;
    }
}

async function loadMasterProjects() {
    const res = await App.api('projects?all=1');
    if (res && res.success) {
        masterProjects = res.data;
        const selFilter = document.getElementById('filter-ts-project');
        const selForm = document.getElementById('form-ts-project');
        const optionsHtml = masterProjects.map(p => `
            <option value="${p.id}">${p.nama_project} (${p.nama_perusahaan || 'Klien'})</option>
        `).join('');

        if (selFilter) selFilter.innerHTML = '<option value="">Semua Proyek...</option>' + optionsHtml;
        if (selForm) selForm.innerHTML = '<option value="">Pilih Proyek...</option>' + optionsHtml;
    }
}

async function loadMasterUsers() {
    const res = await App.api('users?all=1');
    if (res && res.success) {
        masterUsers = res.data;
        const selForm = document.getElementById('form-ts-user');
        if (selForm) {
            selForm.innerHTML = masterUsers.map(u => `
                <option value="${u.id}">${u.nama_lengkap} (${u.role_name || 'Staff'})</option>
            `).join('');
        }
    }
}

async function loadTimesheets() {
    const tbody = document.getElementById('timesheet-tbody');
    const paginationEl = document.getElementById('timesheet-pagination');

    let ep = `timesheets?page=${state.page}&per_page=${state.perPage}`;
    if (state.search) ep += `&search=${encodeURIComponent(state.search)}`;
    if (state.projectId) ep += `&project_id=${encodeURIComponent(state.projectId)}`;
    if (state.status) ep += `&status=${encodeURIComponent(state.status)}`;
    if (state.isBillable !== '') ep += `&is_billable=${encodeURIComponent(state.isBillable)}`;

    const res = await App.api(ep);
    if (!res || !res.success) {
        tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-rose-500">Gagal memuat log timesheet</td></tr>`;
        return;
    }

    const { data: timesheets, pagination, kpi } = res;

    // Update KPI
    if (kpi) {
        document.getElementById('kpi-total-jam').textContent = `${kpi.total_jam} Jam`;
        document.getElementById('kpi-billable-jam').textContent = `${kpi.billable_jam} Jam`;
        document.getElementById('kpi-unbilled-amount').textContent = App.formatIDR(kpi.unbilled_amount);
        document.getElementById('kpi-draft-count').textContent = `${kpi.count_draft} Sesi`;
    }

    if (timesheets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="py-12 text-center text-slate-400">Belum ada log jam kerja tercatat</td></tr>`;
        paginationEl.innerHTML = '';
        return;
    }

    tbody.innerHTML = timesheets.map(t => {
        const isBilled = t.status === 'sudah_ditagih';
        const isSelected = state.selectedIds.has(t.id);
        const canSelect = !isBilled && Boolean(Number(t.is_billable));

        const hours = Math.floor(t.durasi_menit / 60);
        const mins = t.durasi_menit % 60;
        const durasiStr = `${hours}j ${mins}m`;

        return `
            <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <td class="py-4 px-4 text-center">
                    <input type="checkbox" class="ts-row-check rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                           data-id="${t.id}" ${canSelect ? '' : 'disabled'} ${isSelected ? 'checked' : ''}>
                </td>
                <td class="py-4 px-4 text-xs font-mono">
                    <div class="font-bold text-slate-800 dark:text-slate-200">${App.formatDate(t.tanggal)}</div>
                    ${t.jam_mulai && t.jam_selesai ? `<div class="text-[11px] text-slate-400">${t.jam_mulai} - ${t.jam_selesai}</div>` : ''}
                </td>
                <td class="py-4 px-4">
                    <div class="font-semibold text-xs text-slate-900 dark:text-white">${t.user_nama}</div>
                </td>
                <td class="py-4 px-6">
                    <div class="font-bold text-xs text-slate-900 dark:text-white">${t.nama_project}</div>
                    <div class="text-[11px] text-slate-400">${t.client_nama}</div>
                </td>
                <td class="py-4 px-6 max-w-xs">
                    <div class="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2">${t.deskripsi_tugas}</div>
                    ${Number(t.is_billable) ? '<span class="inline-block mt-1 text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">BILLABLE</span>' : '<span class="inline-block mt-1 text-[10px] bg-slate-100 text-slate-500 dark:bg-slate-800 font-semibold px-1.5 py-0.2 rounded">NON-BILLABLE</span>'}
                </td>
                <td class="py-4 px-4 text-center">
                    <div class="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">${durasiStr}</div>
                    <div class="text-[10px] text-slate-400 font-mono">(${t.durasi_jam} jam)</div>
                </td>
                <td class="py-4 px-6 text-right font-mono">
                    <div class="font-bold text-xs text-slate-900 dark:text-white">${App.formatIDR(t.nilai_billing)}</div>
                    <div class="text-[10px] text-slate-400">${App.formatIDR(t.billing_rate_per_jam)} / jam</div>
                </td>
                <td class="py-4 px-4 text-center">
                    ${App.renderStatusBadge(t.status, 'timesheet')}
                    ${t.nomor_invoice ? `<div class="mt-1"><a href="#/invoices" class="font-mono text-[10px] font-bold text-primary-600 hover:underline">${t.nomor_invoice}</a></div>` : ''}
                </td>
                <td class="py-4 px-6 text-right">
                    ${!isBilled ? `
                        <button type="button" onclick="App.toggleTableActionMenu(this, event, [
                            { label: 'Edit Log Kerja', icon: 'ri-edit-line', iconColor: 'text-primary-600', action: 'window.editTimesheet(${t.id})' },
                            { divider: true },
                            { label: 'Hapus Log Kerja', icon: 'ri-delete-bin-line', danger: true, action: 'window.deleteTimesheet(${t.id})' }
                        ])" class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition" title="Menu Aksi">
                            <span>Aksi</span>
                            <i class="ri-more-2-fill text-slate-400"></i>
                        </button>
                    ` : `
                        <span class="text-xs text-slate-400 italic px-2">Terkunci</span>
                    `}
                </td>
            </tr>
        `;
    }).join('');

    // Re-bind row checkboxes
    document.querySelectorAll('.ts-row-check:not(:disabled)').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = parseInt(e.target.getAttribute('data-id'));
            if (e.target.checked) state.selectedIds.add(id);
            else state.selectedIds.delete(id);
            updateSelectedUI();
        });
    });

    App.renderPagination(paginationEl, pagination, (p) => { state.page = p; loadTimesheets(); }, 'entri timesheet');

    updateSelectedUI();
}

function updateSelectedUI() {
    const btn = document.getElementById('btn-bill-selected');
    const cnt = document.getElementById('selected-count');
    const count = state.selectedIds.size;
    if (cnt) cnt.textContent = count;
    if (btn) btn.disabled = count === 0;
}

function openTimesheetModal(ts = null) {
    const modal = document.getElementById('ts-modal');
    const form = document.getElementById('ts-form');
    form.reset();

    if (ts) {
        document.getElementById('ts-modal-title').innerHTML = `<i class="ri-edit-line text-primary-600"></i><span>Edit Log Jam Kerja</span>`;
        document.getElementById('form-ts-id').value = ts.id;
        document.getElementById('form-ts-project').value = ts.project_id;
        document.getElementById('form-ts-user').value = ts.user_id;
        document.getElementById('form-ts-tanggal').value = ts.tanggal;
        document.getElementById('form-ts-mulai').value = ts.jam_mulai || '';
        document.getElementById('form-ts-selesai').value = ts.jam_selesai || '';
        document.getElementById('form-ts-durasi').value = ts.durasi_menit;
        document.getElementById('form-ts-rate').value = ts.billing_rate_per_jam;
        document.getElementById('form-ts-status').value = ts.status;
        document.getElementById('form-ts-billable').checked = Boolean(Number(ts.is_billable));
        document.getElementById('form-ts-deskripsi').value = ts.deskripsi_tugas;
    } else {
        document.getElementById('ts-modal-title').innerHTML = `<i class="ri-time-line text-emerald-600"></i><span>Catat Log Jam Kerja</span>`;
        document.getElementById('form-ts-id').value = '';
        document.getElementById('form-ts-tanggal').value = new Date().toISOString().split('T')[0];
        document.getElementById('form-ts-durasi').value = 60;
        document.getElementById('form-ts-rate').value = 150000;
        document.getElementById('form-ts-billable').checked = true;
        document.getElementById('form-ts-status').value = 'disetujui';
    }

    updateDurationHint();
    modal.classList.remove('hidden');
}

async function handleSaveTimesheet(e) {
    e.preventDefault();
    const id = document.getElementById('form-ts-id').value;
    const body = {
        project_id: document.getElementById('form-ts-project').value,
        user_id: document.getElementById('form-ts-user').value,
        tanggal: document.getElementById('form-ts-tanggal').value,
        jam_mulai: document.getElementById('form-ts-mulai').value || null,
        jam_selesai: document.getElementById('form-ts-selesai').value || null,
        durasi_menit: parseInt(document.getElementById('form-ts-durasi').value) || 0,
        billing_rate_per_jam: parseFloat(document.getElementById('form-ts-rate').value) || 0,
        status: document.getElementById('form-ts-status').value,
        is_billable: document.getElementById('form-ts-billable').checked ? 1 : 0,
        deskripsi_tugas: document.getElementById('form-ts-deskripsi').value.trim()
    };

    let res;
    if (id) {
        res = await App.api(`timesheets/${id}`, { method: 'PUT', body });
    } else {
        res = await App.api('timesheets', { method: 'POST', body });
    }

    if (res && res.success) {
        App.toast(res.message, 'success');
        document.getElementById('ts-modal').classList.add('hidden');
        loadTimesheets();
    }
}

async function handleBillSelected() {
    const ids = Array.from(state.selectedIds);
    if (ids.length === 0) return;

    const conf = await App.confirm(
        'Terbitkan Faktur Tagihan',
        `Apakah Anda ingin mengonversi ${ids.length} entri jam kerja terpilih menjadi faktur tagihan resmi untuk klien?`
    );
    if (!conf) return;

    const res = await App.api('timesheets/generate-invoice', {
        method: 'POST',
        body: { timesheet_ids: ids }
    });

    if (res && res.success) {
        App.toast(res.message, 'success');
        state.selectedIds.clear();
        await loadTimesheets();

        const openInv = await App.confirm(
            'Faktur Diterbitkan!',
            `Faktur ${res.data.nomor_invoice} berhasil dibuat. Buka halaman faktur sekarang?`
        );
        if (openInv) {
            window.location.hash = '#/invoices';
        }
    }
}

window.editTimesheet = async (id) => {
    const res = await App.api(`timesheets/${id}`);
    if (res && res.success) {
        openTimesheetModal(res.data);
    }
};

window.deleteTimesheet = async (id) => {
    const conf = await App.confirm('Hapus Log Jam Kerja', 'Apakah Anda yakin ingin menghapus catatan jam kerja ini?');
    if (!conf) return;

    const res = await App.api(`timesheets/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        state.selectedIds.delete(id);
        loadTimesheets();
    }
};

window.changeTimesheetPage = (p) => {
    state.page = p;
    loadTimesheets();
};
