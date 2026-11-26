// assets/js/pages/expenses.js
import { App } from '../app.js';

let state = {
    page: 1,
    per_page: 15,
    category_id: '',
    project_id: '',
    search: '',
    start_date: '',
    end_date: ''
};

let categories = [];
let projects = [];
let bankAccounts = [];

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Beban & Pengeluaran Operasional</h1>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Pencatatan biaya server cloud, lisensi software, subkontraktor, dan project costing.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" id="btn-export-expenses-csv" class="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition">
                        <i class="ri-download-2-line text-emerald-600"></i>
                        <span>Ekspor CSV</span>
                    </button>
                    <button id="btn-add-expense" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm shadow-primary-500/20 transition">
                        <i class="ri-add-line text-base"></i>
                        <span>Catat Pengeluaran</span>
                    </button>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="expense-kpis">
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Beban Bulan Ini</span>
                    <div id="kpi-exp-month" class="text-xl font-black font-mono text-slate-900 dark:text-white mt-1.5">Rp 0</div>
                </div>
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Beban Tahun Berjalan</span>
                    <div id="kpi-exp-year" class="text-xl font-black font-mono text-slate-900 dark:text-white mt-1.5">Rp 0</div>
                </div>
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Beban Terfilter</span>
                    <div id="kpi-exp-filtered" class="text-xl font-black font-mono text-rose-600 mt-1.5">Rp 0</div>
                </div>
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
                    <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Transaksi</span>
                    <div id="kpi-exp-count" class="text-xl font-black font-mono text-primary-600 mt-1.5">0 Transaksi</div>
                </div>
            </div>

            <!-- Filter Toolbar -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                    <div class="relative w-full sm:w-64">
                        <i class="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                        <input type="text" id="filter-exp-search" placeholder="Cari nomor, judul, vendor..."
                               class="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                    </div>
                    <select id="filter-exp-cat" class="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        <option value="">Semua Kategori Beban</option>
                    </select>
                    <select id="filter-exp-project" class="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs max-w-[200px]">
                        <option value="">Semua Proyek</option>
                    </select>
                </div>
                <div class="flex items-center gap-2">
                    <input type="date" id="filter-exp-start" class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    <span class="text-xs text-slate-400">s/d</span>
                    <input type="date" id="filter-exp-end" class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                </div>
            </div>

            <!-- Table Container -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-50/70 dark:bg-slate-800/40 text-[10px] font-bold uppercase text-slate-500 font-mono border-b border-slate-200/80 dark:border-slate-800">
                                <th class="py-3 px-6">No. Transaksi</th>
                                <th class="py-3 px-4">Tanggal</th>
                                <th class="py-3 px-4">Kategori Beban</th>
                                <th class="py-3 px-4">Deskripsi & Penerima</th>
                                <th class="py-3 px-4">Alokasi Proyek</th>
                                <th class="py-3 px-4 text-right">Nominal (Rp)</th>
                                <th class="py-3 px-4 text-center">Status</th>
                                <th class="py-3 px-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="expense-tbody" class="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                            <tr><td colspan="8" class="py-12 text-center text-slate-400">Memuat data pengeluaran...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="expense-pagination" class="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500"></div>
            </div>
        </div>

        <!-- Expense Modal Form -->
        <div id="expense-modal" class="hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div class="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 animate-fadeIn border border-slate-100 dark:border-slate-800 my-auto">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 id="expense-modal-title" class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-hand-coin-line text-primary-600"></i> Catat Pengeluaran Operasional
                    </h3>
                    <button type="button" onclick="document.getElementById('expense-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1">
                        <i class="ri-close-line text-xl"></i>
                    </button>
                </div>
                <form id="expense-form" class="space-y-4 pt-4">
                    <input type="hidden" id="form-exp-id">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Tanggal *</label>
                            <input type="date" id="form-exp-date" required class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Kategori Beban *</label>
                            <select id="form-exp-cat" required class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"></select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Judul Pengeluaran *</label>
                        <input type="text" id="form-exp-judul" required placeholder="Contoh: Perpanjangan VPS DigitalOcean Production"
                               class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Nominal (Rp) *</label>
                            <input type="text" id="form-exp-jumlah" required placeholder="0" data-currency="idr"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Penerima / Vendor</label>
                            <input type="text" id="form-exp-penerima" placeholder="Contoh: DigitalOcean LLC, IDCloudHost"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Alokasi Proyek (Opsional)</label>
                            <select id="form-exp-project" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                <option value="">Beban Umum Kantor (Non-Proyek)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Sumber Rekening Kas/Bank</label>
                            <select id="form-exp-bank" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"></select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">PPN Masukan (IDR)</label>
                            <input type="text" id="form-exp-ppn" placeholder="0" data-currency="idr"
                                   class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">PPh 23 (%)</label>
                            <input type="number" id="form-exp-pph23" min="0" max="100" step="0.5" placeholder="0"
                                   class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">No. Faktur Pajak</label>
                            <input type="text" id="form-exp-fpajak" placeholder="Opsional"
                                   class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Keterangan Tambahan</label>
                        <textarea id="form-exp-deskripsi" rows="2" placeholder="Catatan transaksi atau spesifikasi beban"
                                  class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"></textarea>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Unggah Struk / Bukti Nota (Opsional)</label>
                        <input type="file" id="form-exp-file" accept="image/*,application/pdf" class="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100">
                    </div>

                    <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                        <button type="button" onclick="document.getElementById('expense-modal').classList.add('hidden')"
                                class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold">Batal</button>
                        <button type="submit" id="btn-save-expense"
                                class="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm">Simpan Pengeluaran</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Load master dependencies
    await Promise.all([loadMasterCategories(), loadMasterProjects(), loadMasterBanks()]);

    // Bind event listeners
    document.getElementById('btn-add-expense')?.addEventListener('click', () => openExpenseModal());
    document.getElementById('expense-form')?.addEventListener('submit', handleSaveExpense);

    let searchTimer;
    document.getElementById('filter-exp-search')?.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            state.search = e.target.value.trim();
            state.page = 1;
            loadExpenses();
        }, 300);
    });

    document.getElementById('filter-exp-cat')?.addEventListener('change', (e) => {
        state.category_id = e.target.value;
        state.page = 1;
        loadExpenses();
    });

    document.getElementById('filter-exp-project')?.addEventListener('change', (e) => {
        state.project_id = e.target.value;
        state.page = 1;
        loadExpenses();
    });

    document.getElementById('filter-exp-start')?.addEventListener('change', (e) => {
        state.start_date = e.target.value;
        state.page = 1;
        loadExpenses();
    });

    document.getElementById('filter-exp-end')?.addEventListener('change', (e) => {
        state.end_date = e.target.value;
        state.page = 1;
        loadExpenses();
    });

    // Initial load
    await Promise.all([loadExpenseSummary(), loadExpenses()]);
}

async function loadMasterCategories() {
    const res = await App.api('expenses/categories');
    if (res && res.success && res.data) {
        categories = res.data;
        const filterSelect = document.getElementById('filter-exp-cat');
        const formSelect = document.getElementById('form-exp-cat');

        const opts = categories.map(c => `<option value="${c.id}">${c.nama_kategori}</option>`).join('');
        if (filterSelect) filterSelect.innerHTML = `<option value="">Semua Kategori Beban</option>${opts}`;
        if (formSelect) formSelect.innerHTML = `<option value="">Pilih Kategori...</option>${opts}`;
    }
}

async function loadMasterProjects() {
    const res = await App.api('projects?all=1');
    if (res && res.success && res.data) {
        projects = res.data;
        const filterSelect = document.getElementById('filter-exp-project');
        const formSelect = document.getElementById('form-exp-project');

        const opts = projects.map(p => `<option value="${p.id}">${p.nama_project} (${p.client_nama || ''})</option>`).join('');
        if (filterSelect) filterSelect.innerHTML = `<option value="">Semua Proyek</option>${opts}`;
        if (formSelect) formSelect.innerHTML = `<option value="">Beban Umum Kantor (Non-Proyek)</option>${opts}`;
    }
}

async function loadMasterBanks() {
    const res = await App.api('bank-accounts');
    if (res && res.success && res.data) {
        bankAccounts = res.data;
        const formSelect = document.getElementById('form-exp-bank');
        if (formSelect) {
            formSelect.innerHTML = bankAccounts.map(b => `
                <option value="${b.id}" ${b.is_default ? 'selected' : ''}>${b.nama_bank || b.nama_metode} - ${b.nomor_rekening || 'Kas'}</option>
            `).join('');
        }
    }
}

async function loadExpenseSummary() {
    const res = await App.api('expenses/summary');
    if (res && res.success && res.data) {
        const d = res.data;
        const mEl = document.getElementById('kpi-exp-month');
        const yEl = document.getElementById('kpi-exp-year');
        if (mEl) mEl.textContent = App.formatIDR(d.total_month || 0);
        if (yEl) yEl.textContent = App.formatIDR(d.total_year || 0);
    }
}

async function loadExpenses() {
    const tbody = document.getElementById('expense-tbody');
    const fKpi = document.getElementById('kpi-exp-filtered');
    const cKpi = document.getElementById('kpi-exp-count');

    let q = `expenses?page=${state.page}&per_page=${state.per_page}`;
    if (state.category_id) q += `&category_id=${state.category_id}`;
    if (state.project_id) q += `&project_id=${state.project_id}`;
    if (state.start_date) q += `&start_date=${state.start_date}`;
    if (state.end_date) q += `&end_date=${state.end_date}`;
    if (state.search) q += `&search=${encodeURIComponent(state.search)}`;

    const res = await App.api(q);
    if (!res || !res.success) {
        tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-rose-500">Gagal memuat data pengeluaran</td></tr>`;
        return;
    }

    const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
    const pagination = res.pagination || res.data?.pagination || { page: 1, total_pages: 1, total: items.length };
    const extra = res.extra || res.data?.extra || res;

    if (fKpi) fKpi.textContent = App.formatIDR(extra?.filtered_total_nominal || 0);
    if (cKpi) cKpi.textContent = `${pagination.total || 0} Transaksi`;

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="py-12 text-center text-slate-400">Tidak ada data pengeluaran yang sesuai filter</td></tr>`;
        renderPagination(pagination);
        return;
    }

    tbody.innerHTML = items.map(exp => `
        <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
            <td class="py-3.5 px-6 font-mono font-bold text-slate-900 dark:text-white">
                ${exp.nomor_pengeluaran}
            </td>
            <td class="py-3.5 px-4 font-mono text-slate-500">
                ${App.formatDate(exp.tanggal)}
            </td>
            <td class="py-3.5 px-4">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold" style="background-color: ${exp.kategori_warna}18; color: ${exp.kategori_warna}">
                    <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${exp.kategori_warna}"></span>
                    ${exp.nama_kategori}
                </span>
            </td>
            <td class="py-3.5 px-4">
                <div class="font-bold text-slate-900 dark:text-white">${exp.judul}</div>
                <div class="text-[11px] text-slate-400">${exp.penerima ? `Penerima: ${exp.penerima}` : (exp.deskripsi || '-')}</div>
            </td>
            <td class="py-3.5 px-4 font-sans">
                ${exp.nama_project ? `
                    <div class="font-bold text-primary-600">${exp.nama_project}</div>
                    <div class="text-[10px] text-slate-400">${exp.client_nama || ''}</div>
                ` : `<span class="text-slate-400 italic">Beban Umum</span>`}
            </td>
            <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                ${App.formatIDR(exp.jumlah)}
            </td>
            <td class="py-3.5 px-4 text-center">
                ${App.renderStatusBadge(exp.status, 'expense')}
            </td>
            <td class="py-3.5 px-6 text-right">
                <button type="button" onclick="App.toggleTableActionMenu(this, event, [
                    ${exp.bukti_lampiran ? `{ label: 'Lihat Bukti / Struk', icon: 'ri-attachment-line', iconColor: 'text-sky-600', action: 'window.open(\\'${exp.bukti_lampiran}\\', \\'_blank\\')' },` : ''}
                    { label: 'Edit Pengeluaran', icon: 'ri-edit-line', iconColor: 'text-primary-600', action: 'window.editExpense(${exp.id})' },
                    { divider: true },
                    { label: 'Hapus Pengeluaran', icon: 'ri-delete-bin-line', danger: true, action: 'window.deleteExpense(${exp.id}, \\'${exp.nomor_pengeluaran}\\')' }
                ])" class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition" title="Menu Aksi">
                    <span>Aksi</span>
                    <i class="ri-more-2-fill text-slate-400"></i>
                </button>
            </td>
        </tr>
    `).join('');

    renderPagination(pagination);
}

function renderPagination(p) {
    const cont = document.getElementById('expense-pagination');
    if (!cont) return;
    if (p.total_pages <= 1) {
        cont.innerHTML = `<span>Menampilkan ${p.total} data</span>`;
        return;
    }
    App.renderPagination(cont, p, (page) => { state.page = page; loadExpenses(); }, 'transaksi');
}

function openExpenseModal(exp = null) {
    const modal = document.getElementById('expense-modal');
    const title = document.getElementById('expense-modal-title');
    document.getElementById('form-exp-id').value = exp ? exp.id : '';
    document.getElementById('form-exp-date').value = exp ? exp.tanggal : new Date().toISOString().slice(0, 10);
    document.getElementById('form-exp-cat').value = exp ? exp.expense_category_id : '';
    document.getElementById('form-exp-judul').value = exp ? exp.judul : '';
    document.getElementById('form-exp-jumlah').value = exp ? App.formatNumber(exp.jumlah) : '';
    document.getElementById('form-exp-penerima').value = exp ? (exp.penerima || '') : '';
    document.getElementById('form-exp-project').value = exp ? (exp.project_id || '') : '';
    document.getElementById('form-exp-bank').value = exp ? (exp.payment_method_id || '') : '';
    document.getElementById('form-exp-ppn').value = exp && Number(exp.ppn_masukan) > 0 ? App.formatNumber(exp.ppn_masukan) : '';
    document.getElementById('form-exp-pph23').value = exp && Number(exp.pph23_persen) > 0 ? exp.pph23_persen : '';
    document.getElementById('form-exp-fpajak').value = exp ? (exp.nomor_faktur_pajak || '') : '';
    document.getElementById('form-exp-deskripsi').value = exp ? (exp.deskripsi || '') : '';
    document.getElementById('form-exp-file').value = '';

    title.innerHTML = exp ? `<i class="ri-edit-line text-primary-600"></i> Edit Pengeluaran ${exp.nomor_pengeluaran}` : `<i class="ri-hand-coin-line text-primary-600"></i> Catat Pengeluaran Operasional`;
    modal.classList.remove('hidden');
}

async function handleSaveExpense(e) {
    e.preventDefault();
    const id = document.getElementById('form-exp-id').value;
    const btn = document.getElementById('btn-save-expense');

    const rawJumlah = document.getElementById('form-exp-jumlah').value.replace(/[^0-9]/g, '');
    const jumlah = parseFloat(rawJumlah) || 0;
    const rawPpn = (document.getElementById('form-exp-ppn')?.value || '').replace(/[^0-9]/g, '');
    const ppnMasukan = parseFloat(rawPpn) || 0;
    const pph23Persen = parseFloat(document.getElementById('form-exp-pph23')?.value) || 0;

    const payload = {
        tanggal: document.getElementById('form-exp-date').value,
        expense_category_id: document.getElementById('form-exp-cat').value,
        judul: document.getElementById('form-exp-judul').value.trim(),
        jumlah,
        ppn_masukan: ppnMasukan,
        pph23_persen: pph23Persen,
        nomor_faktur_pajak: document.getElementById('form-exp-fpajak')?.value.trim() || '',
        penerima: document.getElementById('form-exp-penerima').value.trim(),
        project_id: document.getElementById('form-exp-project').value || null,
        payment_method_id: document.getElementById('form-exp-bank').value || null,
        deskripsi: document.getElementById('form-exp-deskripsi').value.trim()
    };

    const fileInput = document.getElementById('form-exp-file');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async () => {
            payload.bukti_lampiran_base64 = reader.result;
            await submitExpense(id, payload, btn);
        };
        reader.readAsDataURL(file);
    } else {
        await submitExpense(id, payload, btn);
    }
}

async function submitExpense(id, payload, btn) {
    App.btnLoading(btn, true, 'Menyimpan...');
    try {
        const url = id ? `expenses/${id}` : 'expenses';
        const method = id ? 'PUT' : 'POST';
        const res = await App.api(url, { method, data: payload });

        if (res && res.success) {
            App.toast(res.message, 'success');
            document.getElementById('expense-modal').classList.add('hidden');
            await Promise.all([loadExpenseSummary(), loadExpenses()]);
        }
    } finally {
        App.btnLoading(btn, false);
    }
}

window.editExpense = async (id) => {
    const res = await App.api(`expenses/${id}`);
    if (res && res.success && res.data) {
        openExpenseModal(res.data);
    }
};

window.deleteExpense = async (id, no) => {
    const conf = await App.confirm('Hapus Pengeluaran', `Apakah Anda yakin ingin menghapus data pengeluaran "${no}"?`);
    if (!conf) return;

    const res = await App.api(`expenses/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        await Promise.all([loadExpenseSummary(), loadExpenses()]);
    }
};

window.changeExpensePage = (p) => {
    state.page = p;
    loadExpenses();
};

document.addEventListener('click', async (e) => {
    const btn = e.target?.closest('#btn-export-expenses-csv');
    if (!btn) return;
    let ep = `expenses?page=1&per_page=100`;
    if (state.search) ep += `&search=${encodeURIComponent(state.search)}`;
    if (state.category_id) ep += `&category_id=${encodeURIComponent(state.category_id)}`;
    if (state.project_id) ep += `&project_id=${encodeURIComponent(state.project_id)}`;
    if (state.start_date) ep += `&start_date=${encodeURIComponent(state.start_date)}`;
    if (state.end_date) ep += `&end_date=${encodeURIComponent(state.end_date)}`;
    const res = await App.api(ep);
    const rows = res?.data || [];
    if (rows.length === 0) {
        App.toast('Tidak ada data pengeluaran untuk diekspor', 'warning');
        return;
    }
    App.exportCsv(
        `rekap-pengeluaran-${new Date().toISOString().slice(0, 10)}.csv`,
        ['No. Transaksi', 'Tanggal', 'Kategori', 'Judul / Deskripsi', 'Vendor / Penerima', 'Proyek', 'Nominal', 'Status'],
        rows.map((r) => [r.nomor_pengeluaran || r.id, r.tanggal, r.kategori_nama || '-', r.judul || r.deskripsi || '-', r.vendor || '-', r.nama_project || '-', r.jumlah, r.status || 'selesai'])
    );
    App.toast(`Berhasil mengekspor ${rows.length} pengeluaran ke CSV`, 'success');
});

export default { init };
