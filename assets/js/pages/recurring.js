// assets/js/pages/recurring.js
import { App } from '../app.js';

let state = {
    page: 1,
    perPage: 10,
    search: '',
    status: ''
};

let masterServices = [];
let masterClients = [];

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Tagihan Berulang (Recurring)</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Otomasi faktur berkala untuk langganan hosting, domain, dan kontrak maintenance.</p>
                </div>
                <button id="btn-add-recurring" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-primary-500/20 flex items-center gap-2 transition">
                    <i class="ri-repeat-line text-base"></i>
                    <span>Buat Jadwal Berulang</span>
                </button>
            </div>

            <!-- Search -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-4">
                <div class="relative flex-1">
                    <input type="text" id="recurring-search" placeholder="Cari judul jadwal atau nama pelanggan..."
                           class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <i class="ri-search-line absolute left-3.5 top-3 text-slate-400 text-sm"></i>
                </div>
            </div>

            <!-- Table Card -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th class="py-3.5 px-6">Judul Jadwal</th>
                                <th class="py-3.5 px-6">Pelanggan</th>
                                <th class="py-3.5 px-6">Frekuensi & Tgl Tagih</th>
                                <th class="py-3.5 px-6">Jadwal Berikutnya</th>
                                <th class="py-3.5 px-6">Status</th>
                                <th class="py-3.5 px-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="recurring-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr>
                                <td colspan="6" class="py-12 text-center text-slate-400">
                                    <i class="ri-loader-4-line text-2xl animate-spin mb-2 inline-block"></i>
                                    <div>Memuat jadwal tagihan...</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div id="recurring-pagination" class="px-7 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500"></div>
            </div>
        </div>

        <!-- Recurring Modal -->
        <div id="recurring-modal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-fadeIn max-h-[92vh] overflow-y-auto">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                    <h3 id="recurring-modal-title" class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-repeat-line text-primary-600"></i>
                        <span>Buat Template Tagihan Berulang</span>
                    </h3>
                    <button onclick="document.getElementById('recurring-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <form id="recurring-form" class="space-y-4">
                    <input type="hidden" id="form-rec-id" value="">

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="sm:col-span-2">
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Judul Tagihan Berulang *</label>
                            <input type="text" id="form-rec-judul" required placeholder="Contoh: Langganan Cloud VPS & Domain Tahunan"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Pelanggan *</label>
                            <select id="form-rec-client" required
                                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="">Pilih Pelanggan...</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Frekuensi Penagihan</label>
                            <select id="form-rec-frekuensi" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="bulanan">Setiap Bulan</option>
                                <option value="triwulan">Setiap 3 Bulan (Triwulan)</option>
                                <option value="semester">Setiap 6 Bulan (Semester)</option>
                                <option value="tahunan">Setiap 1 Tahun (Tahunan)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Tanggal Mulai Tagihan</label>
                            <input type="date" id="form-rec-mulai" required
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Hari Tagihan (Tanggal)</label>
                            <input type="number" id="form-rec-hari" min="1" max="28" value="1"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>
                    </div>

                    <!-- Line items container -->
                    <div class="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Rincian Item Faktur yang Di-generate</span>
                            <button type="button" id="btn-add-rec-item" class="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                                <i class="ri-add-circle-line"></i> Tambah Item
                            </button>
                        </div>
                        <div id="rec-items-container" class="space-y-2"></div>
                    </div>

                    <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                        <button type="button" onclick="document.getElementById('recurring-modal').classList.add('hidden')"
                                class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold">Batal</button>
                        <button type="submit" id="btn-save-recurring"
                                class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/20">Simpan Template</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    await Promise.all([loadMasterClients(), loadMasterServices()]);

    const btnAddRec = document.getElementById('btn-add-recurring');
    if (btnAddRec) btnAddRec.onclick = () => openRecurringModal();

    const btnAddRecItem = document.getElementById('btn-add-rec-item');
    if (btnAddRecItem) {
        let isAddingRec = false;
        btnAddRecItem.onclick = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (isAddingRec) return;
            isAddingRec = true;
            setTimeout(() => { isAddingRec = false; }, 300);
            addRecItemRow();
        };
    }
    document.getElementById('recurring-form').addEventListener('submit', handleSaveRecurring);

    const searchInput = document.getElementById('recurring-search');
    let timer;
    searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            state.search = searchInput.value.trim();
            state.page = 1;
            loadRecurring();
        }, 300);
    });

    loadRecurring();
}

async function loadMasterClients() {
    const res = await App.api('clients?all=1');
    if (res && res.success) {
        masterClients = res.data;
        const sel = document.getElementById('form-rec-client');
        if (sel) {
            sel.innerHTML = '<option value="">Pilih Pelanggan...</option>' + masterClients.map(c => `
                <option value="${c.id}">${c.nama_perusahaan} (${c.kode_klien})</option>
            `).join('');
        }
    }
}

async function loadMasterServices() {
    const res = await App.api('services?all=1');
    if (res && res.success) {
        masterServices = res.data;
    }
}

async function loadRecurring() {
    const tbody = document.getElementById('recurring-tbody');
    const paginationEl = document.getElementById('recurring-pagination');

    let ep = `recurring?page=${state.page}&per_page=${state.perPage}`;
    if (state.search) ep += `&search=${encodeURIComponent(state.search)}`;

    const res = await App.api(ep);
    if (!res || !res.success) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-rose-500">Gagal memuat jadwal berulang</td></tr>`;
        return;
    }

    const { data: list, pagination } = res;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-slate-400">Belum ada template tagihan berulang</td></tr>`;
        paginationEl.innerHTML = '';
        return;
    }

    tbody.innerHTML = list.map(r => `
        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
            <td class="py-4 px-6">
                <div class="font-bold text-slate-900 dark:text-white">${r.judul}</div>
                ${r.nama_project ? `<div class="text-xs text-slate-400"><i class="ri-git-branch-line"></i> ${r.nama_project}</div>` : ''}
            </td>
            <td class="py-4 px-6 font-medium text-slate-800 dark:text-slate-200">
                ${r.client_nama}
            </td>
            <td class="py-4 px-6 text-xs text-slate-600 dark:text-slate-300 capitalize">
                <div>Setiap <b>${r.frekuensi}</b></div>
                <div class="text-slate-400">Tanggal ${r.hari_tagihan}</div>
            </td>
            <td class="py-4 px-6 font-mono text-xs text-primary-600 dark:text-primary-400 font-bold">
                ${App.formatDate(r.berikutnya_dibuat_at)}
            </td>
            <td class="py-4 px-6">
                ${App.renderStatusBadge(r.status, 'recurring')}
            </td>
            <td class="py-4 px-6 text-right">
                <button type="button" onclick="App.toggleTableActionMenu(this, event, [
                    { label: 'Generate Faktur Sekarang', icon: 'ri-play-circle-line', iconColor: 'text-emerald-600', action: 'window.triggerGenerateInvoice(${r.id})' },
                    { divider: true },
                    { label: 'Hapus Template', icon: 'ri-delete-bin-line', danger: true, action: 'window.deleteRecurring(${r.id})' }
                ])" class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition" title="Menu Aksi">
                    <span>Aksi</span>
                    <i class="ri-more-2-fill text-slate-400"></i>
                </button>
            </td>
        </tr>
    `).join('');

    paginationEl.innerHTML = `
        <div>Menampilkan hal <b>${pagination.page}</b> dari <b>${pagination.total}</b> template</div>
        <div class="flex items-center gap-2">
            <button ${pagination.page <= 1 ? 'disabled' : ''} onclick="window.changeRecurringPage(${pagination.page - 1})"
                    class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40">Sebelumnya</button>
            <button ${pagination.page >= pagination.total_pages ? 'disabled' : ''} onclick="window.changeRecurringPage(${pagination.page + 1})"
                    class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40">Berikutnya</button>
        </div>
    `;
}

function openRecurringModal() {
    const modal = document.getElementById('recurring-modal');
    document.getElementById('recurring-form').reset();
    document.getElementById('form-rec-id').value = '';
    document.getElementById('form-rec-mulai').value = new Date().toISOString().split('T')[0];

    const cont = document.getElementById('rec-items-container');
    cont.innerHTML = '';
    addRecItemRow();

    modal.classList.remove('hidden');
}

function addRecItemRow(desc = '', price = 0) {
    const cont = document.getElementById('rec-items-container');
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 rec-item-row';
    row.innerHTML = `
        <select class="rec-service-sel flex-1 text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
            <option value="">-- Pilih Layanan Katalog --</option>
            ${masterServices.map(s => `
                <option value="${s.id}" data-name="${s.nama_layanan}" data-price="${s.harga_standar}">
                    ${s.nama_layanan} (${App.formatIDR(s.harga_standar)})
                </option>
            `).join('')}
        </select>
        <input type="text" placeholder="Deskripsi item..." value="${desc}" class="rec-desc flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
        <input type="number" placeholder="Tarif (IDR)" value="${price}" class="rec-price w-32 px-3 py-2 text-right font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
        <button type="button" onclick="this.parentElement.remove()" class="p-2 text-slate-400 hover:text-rose-600">
            <i class="ri-delete-bin-line"></i>
        </button>
    `;
    cont.appendChild(row);

    const sel = row.querySelector('.rec-service-sel');
    sel.addEventListener('change', () => {
        const opt = sel.options[sel.selectedIndex];
        if (opt.value) {
            row.querySelector('.rec-desc').value = opt.getAttribute('data-name');
            row.querySelector('.rec-price').value = opt.getAttribute('data-price');
        }
    });
}

async function handleSaveRecurring(e) {
    e.preventDefault();
    const rows = document.querySelectorAll('.rec-item-row');
    if (rows.length === 0) {
        App.toast('Minimal harus berisi 1 baris item layanan', 'warning');
        return;
    }

    const items = [];
    rows.forEach(r => {
        items.push({
            service_id: r.querySelector('.rec-service-sel').value || null,
            deskripsi: r.querySelector('.rec-desc').value.trim(),
            kuantitas: 1,
            harga_satuan: parseFloat(r.querySelector('.rec-price').value) || 0
        });
    });

    const body = {
        judul: document.getElementById('form-rec-judul').value.trim(),
        client_id: document.getElementById('form-rec-client').value,
        frekuensi: document.getElementById('form-rec-frekuensi').value,
        tanggal_mulai: document.getElementById('form-rec-mulai').value,
        hari_tagihan: document.getElementById('form-rec-hari').value,
        items
    };

    const res = await App.api('recurring', { method: 'POST', body });
    if (res && res.success) {
        App.toast(res.message, 'success');
        document.getElementById('recurring-modal').classList.add('hidden');
        loadRecurring();
    }
}

window.triggerGenerateInvoice = async (id) => {
    const conf = await App.confirm('Generate Faktur Sekarang', 'Apakah Anda ingin men-generate faktur tagihan dari template ini sekarang?');
    if (!conf) return;

    const res = await App.api(`recurring/${id}/generate`, { method: 'POST' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        loadRecurring();
    }
};

window.deleteRecurring = async (id) => {
    const conf = await App.confirm('Hapus Template', 'Yakin ingin menghapus template tagihan berulang ini?');
    if (!conf) return;

    const res = await App.api(`recurring/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        loadRecurring();
    }
};

window.changeRecurringPage = (p) => {
    state.page = p;
    loadRecurring();
};
