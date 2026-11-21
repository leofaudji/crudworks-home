// assets/js/pages/services.js
import { App } from '../app.js';

let state = {
    page: 1,
    perPage: 10,
    search: '',
    kategori: ''
};

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Katalog Layanan & Tarif</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Daftar paket hosting, domain, maintenance, dan tarif pengembangan standar.</p>
                </div>
                <button id="btn-add-service" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-primary-500/20 flex items-center gap-2 transition">
                    <i class="ri-add-line"></i>
                    <span>Tambah Layanan</span>
                </button>
            </div>

            <!-- Filters -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                <div class="relative flex-1 w-full">
                    <input type="text" id="service-search" placeholder="Cari nama atau kode layanan..."
                           class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <i class="ri-search-line absolute left-3.5 top-3 text-slate-400 text-sm"></i>
                </div>
                <div class="flex items-center gap-3 w-full sm:w-auto">
                    <select id="service-filter-kategori" class="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="">Semua Kategori</option>
                        <option value="hosting">Hosting</option>
                        <option value="domain">Domain</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="development">Development</option>
                        <option value="konsultasi">Konsultasi</option>
                    </select>
                </div>
            </div>

            <!-- Table Card -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th class="py-3.5 px-6">Kode & Nama Layanan</th>
                                <th class="py-3.5 px-6">Kategori</th>
                                <th class="py-3.5 px-6">Tarif Standar</th>
                                <th class="py-3.5 px-6">Siklus Tagihan</th>
                                <th class="py-3.5 px-6">Status</th>
                                <th class="py-3.5 px-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="services-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr>
                                <td colspan="6" class="py-12 text-center text-slate-400">
                                    <i class="ri-loader-4-line text-2xl animate-spin mb-2 inline-block"></i>
                                    <div>Memuat katalog layanan...</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div id="services-pagination" class="px-7 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500"></div>
            </div>
        </div>

        <!-- Service Modal -->
        <div id="service-modal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-fadeIn">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                    <h3 id="service-modal-title" class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-server-line text-primary-600"></i>
                        <span>Tambah Layanan Baru</span>
                    </h3>
                    <button id="btn-close-service-modal" class="text-slate-400 hover:text-slate-600">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <form id="service-form" class="space-y-4">
                    <input type="hidden" id="form-service-id" value="">

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Nama Layanan / Paket *</label>
                        <input type="text" id="form-service-nama" required placeholder="Contoh: Cloud VPS 4GB RAM"
                               class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Kategori</label>
                            <select id="form-service-kategori" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="hosting">Hosting</option>
                                <option value="domain">Domain</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="development">Development</option>
                                <option value="konsultasi">Konsultasi</option>
                                <option value="lainnya">Lainnya</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Siklus Tagihan</label>
                            <select id="form-service-siklus" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="bulanan">Bulanan</option>
                                <option value="triwulan">Triwulan (3 Bulan)</option>
                                <option value="semester">Semester (6 Bulan)</option>
                                <option value="tahunan">Tahunan</option>
                                <option value="one_time">Sekali Bayar (One-time)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Tarif Standar (IDR) *</label>
                            <input type="number" id="form-service-harga" required min="0" step="any" placeholder="0"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Status Layanan</label>
                            <select id="form-service-status" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="aktif">Aktif</option>
                                <option value="nonaktif">Nonaktif</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Spesifikasi / Deskripsi</label>
                        <textarea id="form-service-deskripsi" rows="2" placeholder="Detail spesifikasi paket"
                                  class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"></textarea>
                    </div>

                    <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                        <button type="button" id="btn-cancel-service" class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold">Batal</button>
                        <button type="submit" id="btn-save-service" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/20">Simpan Layanan</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Bindings
    document.getElementById('btn-add-service').addEventListener('click', () => openServiceModal());
    document.getElementById('btn-close-service-modal').addEventListener('click', () => closeServiceModal());
    document.getElementById('btn-cancel-service').addEventListener('click', () => closeServiceModal());
    document.getElementById('service-form').addEventListener('submit', handleSaveService);

    const searchInput = document.getElementById('service-search');
    let timer;
    searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            state.search = searchInput.value.trim();
            state.page = 1;
            loadServices();
        }, 300);
    });

    document.getElementById('service-filter-kategori').addEventListener('change', (e) => {
        state.kategori = e.target.value;
        state.page = 1;
        loadServices();
    });

    loadServices();
}

async function loadServices() {
    const tbody = document.getElementById('services-tbody');
    const paginationEl = document.getElementById('services-pagination');

    let ep = `services?page=${state.page}&per_page=${state.perPage}`;
    if (state.search) ep += `&search=${encodeURIComponent(state.search)}`;
    if (state.kategori) ep += `&kategori=${encodeURIComponent(state.kategori)}`;

    const res = await App.api(ep);
    if (!res || !res.success) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-rose-500">Gagal memuat katalog layanan</td></tr>`;
        return;
    }

    const { data: services, pagination } = res;

    if (services.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-slate-400">Tidak ada layanan ditemukan</td></tr>`;
        paginationEl.innerHTML = '';
        return;
    }

    tbody.innerHTML = services.map(s => {
        const catBadges = {
            'hosting': '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">Hosting</span>',
            'domain': '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">Domain</span>',
            'maintenance': '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">Maintenance</span>',
            'development': '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 border border-purple-500/20">Development</span>',
            'konsultasi': '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">Konsultasi</span>'
        };

        return `
            <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <td class="py-4 px-6">
                    <div class="font-bold text-slate-900 dark:text-white">${s.nama_layanan}</div>
                    <div class="text-xs font-mono text-primary-600 dark:text-primary-400">${s.kode_layanan}</div>
                </td>
                <td class="py-4 px-6">
                    ${catBadges[s.kategori] || s.kategori}
                </td>
                <td class="py-4 px-6 font-mono font-bold text-slate-900 dark:text-white">
                    ${App.formatIDR(s.harga_standar)}
                </td>
                <td class="py-4 px-6 text-xs text-slate-600 dark:text-slate-300 capitalize">
                    ${s.siklus_tagihan.replace('_', ' ')}
                </td>
                <td class="py-4 px-6">
                    ${App.renderStatusBadge(s.status, 'service')}
                </td>
                <td class="py-4 px-6 text-right">
                    <button type="button" onclick="App.toggleTableActionMenu(this, event, [
                        { label: 'Edit Layanan', icon: 'ri-edit-line', iconColor: 'text-primary-600', action: 'window.editService(${s.id})' },
                        { divider: true },
                        { label: 'Hapus Layanan', icon: 'ri-delete-bin-line', danger: true, action: 'window.deleteService(${s.id}, \\'${App.escapeHtml(s.nama_layanan)}\\')' }
                    ])" class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition" title="Menu Aksi">
                        <span>Aksi</span>
                        <i class="ri-more-2-fill text-slate-400"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    paginationEl.innerHTML = `
        <div>Menampilkan hal <b>${pagination.page}</b> dari <b>${pagination.total}</b> layanan</div>
        <div class="flex items-center gap-2">
            <button ${pagination.page <= 1 ? 'disabled' : ''} onclick="window.changeServicePage(${pagination.page - 1})"
                    class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40">Sebelumnya</button>
            <button ${pagination.page >= pagination.total_pages ? 'disabled' : ''} onclick="window.changeServicePage(${pagination.page + 1})"
                    class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40">Berikutnya</button>
        </div>
    `;
}

function openServiceModal(service = null) {
    const modal = document.getElementById('service-modal');
    const title = document.getElementById('service-modal-title');
    const form = document.getElementById('service-form');
    form.reset();

    if (service) {
        title.innerHTML = `<i class="ri-edit-line text-primary-600"></i><span>Edit Data Layanan</span>`;
        document.getElementById('form-service-id').value = service.id;
        document.getElementById('form-service-nama').value = service.nama_layanan;
        document.getElementById('form-service-kategori').value = service.kategori;
        document.getElementById('form-service-siklus').value = service.siklus_tagihan;
        document.getElementById('form-service-harga').value = service.harga_standar;
        document.getElementById('form-service-status').value = service.status;
        document.getElementById('form-service-deskripsi').value = service.deskripsi || '';
    } else {
        title.innerHTML = `<i class="ri-server-line text-primary-600"></i><span>Tambah Layanan Baru</span>`;
        document.getElementById('form-service-id').value = '';
    }

    modal.classList.remove('hidden');
}

function closeServiceModal() {
    document.getElementById('service-modal').classList.add('hidden');
}

async function handleSaveService(e) {
    e.preventDefault();
    const id = document.getElementById('form-service-id').value;
    const body = {
        nama_layanan: document.getElementById('form-service-nama').value.trim(),
        kategori: document.getElementById('form-service-kategori').value,
        siklus_tagihan: document.getElementById('form-service-siklus').value,
        harga_standar: document.getElementById('form-service-harga').value,
        status: document.getElementById('form-service-status').value,
        deskripsi: document.getElementById('form-service-deskripsi').value.trim()
    };

    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `services/${id}` : 'services';

    const res = await App.api(endpoint, { method, body });
    if (res && res.success) {
        App.toast(res.message, 'success');
        closeServiceModal();
        loadServices();
    }
}

window.changeServicePage = (p) => {
    state.page = p;
    loadServices();
};

window.editService = async (id) => {
    const res = await App.api(`services/${id}`);
    if (res && res.success) {
        openServiceModal(res.data);
    }
};

window.deleteService = async (id, name) => {
    const conf = await App.confirm('Hapus Layanan', `Yakin ingin menghapus layanan "${name}"?`);
    if (!conf) return;

    const res = await App.api(`services/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        loadServices();
    }
};
