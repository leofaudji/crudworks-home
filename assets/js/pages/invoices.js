// assets/js/pages/invoices.js
import { App } from '../app.js';
import { registerInvoiceActions } from '../core/invoice-actions.js';

let state = {
    page: 1,
    perPage: 10,
    search: '',
    status: '',
    clientId: ''
};

let masterServices = [];
let masterClients = [];

export async function init(container) {
    // Read query params from hash if any
    const hash = window.location.hash;
    if (hash.includes('?')) {
        const urlParams = new URLSearchParams(hash.split('?')[1]);
        if (urlParams.get('status')) state.status = urlParams.get('status');
        if (urlParams.get('client_id')) state.clientId = urlParams.get('client_id');
    }

    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Faktur & Tagihan Pelanggan</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Pantau status pembayaran, cetak faktur resmi, dan kelola piutang klien.</p>
                </div>
                <div class="flex items-center gap-2.5">
                    <button type="button" id="btn-export-invoices-csv" class="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition">
                        <i class="ri-download-2-line text-emerald-600"></i>
                        <span>Ekspor CSV</span>
                    </button>
                    <button id="btn-create-invoice" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-primary-500/20 flex items-center gap-2 transition">
                        <i class="ri-file-add-line text-base"></i>
                        <span>Buat Faktur Baru</span>
                    </button>
                </div>
            </div>

            <!-- Status Quick Filter Pills -->
            <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
                <button class="status-pill px-4 py-2 rounded-xl border transition ${state.status === '' ? 'bg-primary-600 text-white border-primary-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'}" data-status="">
                    Semua
                </button>
                <button class="status-pill px-4 py-2 rounded-xl border transition ${state.status === 'jatuh_tempo' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-rose-600 border-slate-200 dark:border-slate-800'}" data-status="jatuh_tempo">
                    <i class="ri-alarm-warning-line"></i> Jatuh Tempo
                </button>
                <button class="status-pill px-4 py-2 rounded-xl border transition ${state.status === 'dikirim' ? 'bg-primary-600 text-white border-primary-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-primary-600 border-slate-200 dark:border-slate-800'}" data-status="dikirim">
                    Belum Lunas / Dikirim
                </button>
                <button class="status-pill px-4 py-2 rounded-xl border transition ${state.status === 'sebagian' ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-amber-600 border-slate-200 dark:border-slate-800'}" data-status="sebagian">
                    Dibayar Sebagian
                </button>
                <button class="status-pill px-4 py-2 rounded-xl border transition ${state.status === 'lunas' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-emerald-600 border-slate-200 dark:border-slate-800'}" data-status="lunas">
                    Lunas
                </button>
                <button class="status-pill px-4 py-2 rounded-xl border transition ${state.status === 'draft' ? 'bg-slate-700 text-white border-slate-700 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'}" data-status="draft">
                    Draf
                </button>
            </div>

            <!-- Search Bar -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-4">
                <div class="relative flex-1">
                    <input type="text" id="invoice-search" placeholder="Cari nomor invoice (INV-...), nama pelanggan, atau nama proyek..."
                           class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <i class="ri-search-line absolute left-3.5 top-3 text-slate-400 text-sm"></i>
                </div>
            </div>

            <!-- Invoices Table Card -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th class="py-3.5 px-6">Nomor & Tanggal</th>
                                <th class="py-3.5 px-6">Pelanggan</th>
                                <th class="py-3.5 px-6">Jatuh Tempo</th>
                                <th class="py-3.5 px-6">Total Tagihan</th>
                                <th class="py-3.5 px-6">Sisa Tagihan</th>
                                <th class="py-3.5 px-6">Status Bayar</th>
                                <th class="py-3.5 px-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="invoices-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr>
                                <td colspan="7" class="py-12 text-center text-slate-400">
                                    <i class="ri-loader-4-line text-2xl animate-spin mb-2 inline-block"></i>
                                    <div>Memuat data faktur...</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div id="invoices-pagination" class="px-7 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500"></div>
            </div>
        </div>

        <!-- 1. Invoice Editor Modal (Create / Edit) -->
        <div id="invoice-editor-modal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-fadeIn max-h-[90vh] flex flex-col overflow-hidden">
                <div class="flex items-center justify-between px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <h3 id="invoice-modal-title" class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-file-add-line text-primary-600"></i>
                        <span>Buat Faktur Tagihan Baru</span>
                    </h3>
                    <button type="button" onclick="document.getElementById('invoice-editor-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1" aria-label="Tutup">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <form id="invoice-form" class="flex flex-col flex-1 min-h-0">
                    <div class="p-6 sm:px-8 space-y-6 overflow-y-auto flex-1">
                    <input type="hidden" id="form-inv-id" value="">

                    <!-- Client & Project Row -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div class="sm:col-span-2">
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Pelanggan Ditagih *</label>
                            <select id="form-inv-client" required
                                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="">Pilih Pelanggan...</option>
                            </select>
                            <div id="inv-client-services-hint" class="mt-2"></div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Tanggal Faktur</label>
                            <input type="date" id="form-inv-tanggal" required
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Jatuh Tempo</label>
                            <input type="date" id="form-inv-tempo" required
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono">
                        </div>
                    </div>

                    <!-- Dynamic Line Items Section -->
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Rincian Layanan / Barang</span>
                            <button type="button" id="btn-add-line-item" class="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-950/40 rounded-xl transition">
                                <i class="ri-add-circle-line text-sm"></i>
                                <span>Tambah Baris</span>
                            </button>
                        </div>

                        <datalist id="invoice-services-datalist"></datalist>

                        <div class="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                            <table class="w-full text-left text-sm">
                                <thead class="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th class="py-2.5 px-4 w-5/12">Deskripsi / Katalog Layanan</th>
                                        <th class="py-2.5 px-4 w-24 text-center">Kuantitas</th>
                                        <th class="py-2.5 px-4 w-36 text-right">Harga Satuan</th>
                                        <th class="py-2.5 px-4 w-36 text-right">Total</th>
                                        <th class="py-2.5 px-4 w-12 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody id="invoice-items-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                                    <!-- Dynamic rows inserted here -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Totals Calculation Block -->
                    <div class="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-3">
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Catatan Klien (Tercetak di Invoice)</label>
                                <textarea id="form-inv-catatan-klien" rows="3" placeholder="Instruksi transfer atau rincian termin"
                                          class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"></textarea>
                            </div>
                        </div>

                        <div class="space-y-2 text-sm font-semibold">
                            <div class="flex justify-between text-slate-500">
                                <span>Subtotal:</span>
                                <span id="calc-subtotal" class="font-mono text-slate-800 dark:text-slate-200">Rp 0</span>
                            </div>

                            <div class="flex items-center justify-between gap-3 text-slate-500">
                                <span class="flex items-center gap-1.5">
                                    <span>Diskon:</span>
                                    <select id="form-inv-diskon-tipe" class="text-xs p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                                        <option value="nominal">Nominal (Rp)</option>
                                        <option value="persen">Persen (%)</option>
                                    </select>
                                </span>
                                <input type="number" id="form-inv-diskon-nilai" min="0" value="0"
                                       class="w-32 px-2.5 py-1 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs">
                            </div>

                            <div class="flex items-center justify-between text-slate-500">
                                <span class="flex items-center gap-1.5">
                                    <span>PPN (%):</span>
                                    <input type="number" id="form-inv-pajak-persen" min="0" step="any" value="0" placeholder="0"
                                           class="w-16 px-2 py-1 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs focus:ring-1 focus:ring-primary-500">
                                </span>
                                <span id="calc-pajak" class="font-mono text-slate-800 dark:text-slate-200">Rp 0</span>
                            </div>

                            <div class="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-base font-extrabold text-slate-900 dark:text-white">
                                <span>Total Tagihan:</span>
                                <span id="calc-total" class="font-mono text-primary-600 dark:text-primary-400">Rp 0</span>
                            </div>
                        </div>
                    </div>

                    </div>

                    <div class="px-6 sm:px-8 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3 shrink-0">
                        <button type="button" onclick="document.getElementById('invoice-editor-modal').classList.add('hidden')"
                                class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold">Batal</button>
                        <button type="submit" id="btn-save-invoice"
                                class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/20">Simpan Faktur</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- 2. Invoice View & Print Modal (Printable Sheet A4) -->
        <div id="invoice-view-modal" class="hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div class="w-full max-w-4xl bg-white text-slate-900 rounded-3xl shadow-2xl p-8 sm:p-12 animate-fadeIn my-auto max-h-[95vh] overflow-y-auto printable-invoice">
                <!-- Toolbar no-print -->
                <div class="no-print flex items-center justify-between pb-6 mb-8 border-b border-slate-100">
                    <div class="flex flex-wrap items-center gap-2">
                        <button id="btn-view-preview-pdf" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow">
                            <i class="ri-file-pdf-2-line text-rose-400 text-sm"></i>
                            <span>Pratinjau Dokumen PDF</span>
                        </button>
                        <button id="btn-view-download-pdf" class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow">
                            <i class="ri-download-line text-sm"></i>
                            <span>Unduh PDF</span>
                        </button>
                        <button id="btn-view-send-email" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow">
                            <i class="ri-mail-send-line text-sm"></i>
                            <span>Kirim ke Email Klien</span>
                        </button>
                        <button id="btn-view-send-wa" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow">
                            <i class="ri-whatsapp-line text-sm"></i>
                            <span>Kirim WA</span>
                        </button>
                        <button id="btn-view-open-portal" class="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-sky-200">
                            <i class="ri-external-link-line text-sm"></i>
                            <span>Buka Portal Publik</span>
                        </button>
                        <button id="btn-view-copy-link" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-slate-200">
                            <i class="ri-share-line text-sm"></i>
                            <span>Salin Link Publik</span>
                        </button>
                    </div>
                    <button onclick="document.getElementById('invoice-view-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <!-- Printable Sheet Content -->
                <div id="invoice-sheet-content">
                    <!-- Populated dynamically via viewInvoice() -->
                </div>
            </div>
        </div>
    `;

    // Load master references
    await Promise.all([loadMasterClients(), loadMasterServices()]);

    // Bindings
    const btnCreate = document.getElementById('btn-create-invoice');
    if (btnCreate) {
        btnCreate.onclick = () => openInvoiceEditor();
    }

    const btnAddLine = document.getElementById('btn-add-line-item');
    if (btnAddLine) {
        let isAddingLine = false;
        btnAddLine.onclick = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (isAddingLine) return;
            isAddingLine = true;
            setTimeout(() => { isAddingLine = false; }, 300);
            addLineItemRow();
        };
    }
    document.getElementById('invoice-form').addEventListener('submit', handleSaveInvoice);

    // Auto-detect and generate active services when client is selected
    document.getElementById('form-inv-client').addEventListener('change', async (e) => {
        const clientId = e.target.value;
        const hintEl = document.getElementById('inv-client-services-hint');
        if (!clientId) {
            if (hintEl) hintEl.innerHTML = '';
            return;
        }

        // Only auto-fill if this is a new invoice (not editing an existing saved invoice)
        const isNewInvoice = !document.getElementById('form-inv-id').value;
        if (!isNewInvoice) return;

        if (hintEl) {
            hintEl.innerHTML = `
                <div class="p-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-500 flex items-center gap-2 font-sans">
                    <i class="ri-loader-4-line animate-spin text-primary-600"></i>
                    <span>Memeriksa layanan aktif yang digunakan pelanggan...</span>
                </div>
            `;
        }

        try {
            const res = await App.api(`clients/${clientId}/active-services`);
            if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
                const servicesFound = res.data;
                const tbody = document.getElementById('invoice-items-tbody');
                tbody.innerHTML = '';
                servicesFound.forEach(s => {
                    addLineItemRow(s.service_id, s.deskripsi, s.kuantitas, s.harga_satuan);
                });
                calculateFormTotals();

                if (hintEl) {
                    const firstSource = servicesFound[0]?.source || 'Riwayat Langganan';
                    hintEl.innerHTML = `
                        <div class="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-xs">
                            <span class="flex items-center gap-1.5 font-medium">
                                <i class="ri-magic-line text-emerald-600 text-sm"></i>
                                <span>Otomatis menambahkan <b>${servicesFound.length} item layanan</b> yang aktif digunakan pelanggan (${firstSource}).</span>
                            </span>
                            <button type="button" onclick="this.parentElement.remove()" class="text-emerald-600 hover:text-emerald-800 p-0.5">
                                <i class="ri-close-line"></i>
                            </button>
                        </div>
                    `;
                }
                App.toast(`Otomatis memuat ${servicesFound.length} layanan aktif pelanggan`, 'info', 2500);
            } else {
                if (hintEl) hintEl.innerHTML = '';
            }
        } catch (err) {
            if (hintEl) hintEl.innerHTML = '';
        }
    });

    // Filter status pills
    document.querySelectorAll('.status-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.status-pill').forEach(b => {
                b.className = 'status-pill px-4 py-2 rounded-xl border transition bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800';
            });
            btn.className = 'status-pill px-4 py-2 rounded-xl border transition bg-primary-600 text-white border-primary-600 shadow-sm';
            state.status = btn.getAttribute('data-status');
            state.page = 1;
            loadInvoices();
        });
    });

    const searchInput = document.getElementById('invoice-search');
    let timer;
    searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            state.search = searchInput.value.trim();
            state.page = 1;
            loadInvoices();
        }, 300);
    });

    // Recalculate bindings on form changes
    ['form-inv-diskon-tipe', 'form-inv-diskon-nilai', 'form-inv-pajak-persen'].forEach(id => {
        document.getElementById(id).addEventListener('input', calculateFormTotals);
    });

    loadInvoices();
}

async function loadMasterClients() {
    const res = await App.api('clients?all=1');
    if (res && res.success) {
        masterClients = res.data;
        const sel = document.getElementById('form-inv-client');
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
        renderServicesDatalist();
    }
}

function renderServicesDatalist() {
    const dl = document.getElementById('invoice-services-datalist');
    if (dl && Array.isArray(masterServices)) {
        dl.innerHTML = masterServices.map(s => `
            <option value="${s.nama_layanan}">${App.formatIDR(s.harga_standar)}</option>
        `).join('');
    }
}

async function loadInvoices() {
    const tbody = document.getElementById('invoices-tbody');
    const paginationEl = document.getElementById('invoices-pagination');

    let ep = `invoices?page=${state.page}&per_page=${state.perPage}`;
    if (state.search) ep += `&search=${encodeURIComponent(state.search)}`;
    if (state.status) ep += `&status=${encodeURIComponent(state.status)}`;
    if (state.clientId) ep += `&client_id=${encodeURIComponent(state.clientId)}`;

    const res = await App.api(ep);
    if (!res || !res.success) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-rose-500">Gagal memuat daftar tagihan</td></tr>`;
        return;
    }

    const { data: invoices, pagination } = res;

    if (invoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400">Tidak ada faktur tagihan ditemukan</td></tr>`;
        paginationEl.innerHTML = '';
        return;
    }

    tbody.innerHTML = invoices.map(inv => {
        const isOverdue = (inv.status === 'jatuh_tempo' || (['dikirim', 'sebagian'].includes(inv.status) && Number(inv.hari_terlambat) > 0));
        const dueTextClass = isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500';

        return `
            <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <td class="py-4 px-6">
                    <div class="font-bold font-mono text-slate-900 dark:text-white">${inv.nomor_invoice}</div>
                    <div class="text-xs text-slate-400">${App.formatDate(inv.tanggal_invoice)}</div>
                </td>
                <td class="py-4 px-6">
                    <div class="font-medium text-slate-800 dark:text-slate-200">${inv.client_nama}</div>
                    ${inv.nama_project ? `<div class="text-xs text-slate-400 flex items-center gap-1"><i class="ri-git-branch-line"></i> ${inv.nama_project}</div>` : ''}
                </td>
                <td class="py-4 px-6 ${dueTextClass} text-xs font-mono">
                    <div>${App.formatDate(inv.tanggal_jatuh_tempo)}</div>
                    ${isOverdue ? `<span class="text-[10px] text-rose-500 font-bold">Lewat ${inv.hari_terlambat} hari</span>` : ''}
                </td>
                <td class="py-4 px-6 font-mono font-bold text-slate-900 dark:text-white">
                    ${App.formatIDR(inv.total_tagihan)}
                </td>
                <td class="py-4 px-6 font-mono font-bold ${Number(inv.sisa_tagihan) > 0 ? 'text-rose-600' : 'text-emerald-600'}">
                    ${App.formatIDR(inv.sisa_tagihan)}
                </td>
                <td class="py-4 px-6 whitespace-nowrap">
                    ${App.renderStatusBadge(isOverdue && inv.status !== 'lunas' ? 'jatuh_tempo' : inv.status, 'invoice')}
                    ${inv.payment_verification_status === 'pending' ? `
                        <div class="mt-1">${App.renderStatusBadge('pending', 'general')}</div>
                    ` : ''}
                    ${inv.last_sent_at ? `
                        <div class="mt-1 text-[10px] text-slate-400 font-mono flex items-center gap-1" title="Terakhir dikirim ke klien">
                            <i class="${inv.last_sent_via === 'email' ? 'ri-mail-check-line text-indigo-500' : 'ri-whatsapp-line text-emerald-500'}"></i>
                            <span>${String(inv.last_sent_via || 'wa').toUpperCase()} · ${App.formatDate(inv.last_sent_at)}</span>
                        </div>
                    ` : ''}
                    ${Number(inv.view_count || 0) > 0 ? `
                        <div class="mt-0.5 text-[10px] text-sky-600 dark:text-sky-400 font-mono flex items-center gap-1" title="Terakhir dibuka klien di Portal: ${inv.last_viewed_at ? App.formatDateTime(inv.last_viewed_at) : '-'}">
                            <i class="ri-eye-line"></i>
                            <span>Dilihat ${inv.view_count}x</span>
                        </div>
                    ` : ''}
                </td>
                <td class="py-4 px-6 text-right">
                    <button type="button" onclick="App.toggleTableActionMenu(this, event, [
                        { label: 'Rincian Lembar Faktur', icon: 'ri-file-list-3-line', iconColor: 'text-primary-600', action: 'window.viewInvoiceSheet(${inv.id})' },
                        ${Number(inv.sisa_tagihan) > 0 ? `{ label: 'Catat Pembayaran', icon: 'ri-money-dollar-circle-line', iconColor: 'text-emerald-600', action: 'window.recordPaymentDirect(${inv.id}, \\'${inv.nomor_invoice}\\', ${inv.sisa_tagihan})' },` : ''}
                        {
                            label: 'Dokumen & Portal',
                            icon: 'ri-file-pdf-2-line',
                            iconColor: 'text-rose-600',
                            children: [
                                { label: 'Cetak / Unduh PDF', icon: 'ri-file-pdf-2-line', iconColor: 'text-rose-600', action: 'window.printInvoicePdf(${inv.id})' },
                                { label: 'Buka Portal Publik', icon: 'ri-external-link-line', iconColor: 'text-indigo-600', action: 'window.openPublicPortal(\\'${inv.public_token || inv.nomor_invoice}\\')' },
                                { label: 'Salin Tautan Portal', icon: 'ri-share-line', iconColor: 'text-sky-600', action: 'window.copyPublicPortalLink(\\'${inv.public_token || inv.nomor_invoice}\\')' }
                            ]
                        },
                        { label: 'Kirim via Email', icon: 'ri-mail-send-line', iconColor: 'text-indigo-600', action: 'window.sendInvoiceEmail(${inv.id})' },
                        { label: 'Kirim Pengingat WA', icon: 'ri-whatsapp-line', iconColor: 'text-emerald-500', action: 'window.sendInvoiceWA(${inv.id})' },
                        { divider: true },
                        { label: 'Hapus Faktur', icon: 'ri-delete-bin-line', danger: true, action: 'window.deleteInvoice(${inv.id}, \\'${inv.nomor_invoice}\\')' }
                    ])" class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition" title="Menu Aksi">
                        <span>Aksi</span>
                        <i class="ri-more-2-fill text-slate-400"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    App.renderPagination(paginationEl, pagination, (p) => { state.page = p; loadInvoices(); }, 'faktur');
}

function openInvoiceEditor() {
    const modal = document.getElementById('invoice-editor-modal');
    document.getElementById('invoice-form').reset();
    document.getElementById('form-inv-id').value = '';

    const hintEl = document.getElementById('inv-client-services-hint');
    if (hintEl) hintEl.innerHTML = '';

    // Make sure catalog datalist is populated
    renderServicesDatalist();

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    document.getElementById('form-inv-tanggal').value = today;
    document.getElementById('form-inv-tempo').value = dueDate;

    // Set default tax from settings
    const taxInput = document.getElementById('form-inv-pajak-persen');
    if (taxInput) {
        const defaultTax = (window.App?.settings && window.App.settings.invoice_tax_percent !== undefined && window.App.settings.invoice_tax_percent !== '') 
            ? window.App.settings.invoice_tax_percent 
            : '0';
        taxInput.value = defaultTax;
    }

    // Reset items tbody - start with exactly 1 row
    const tbody = document.getElementById('invoice-items-tbody');
    tbody.innerHTML = '';
    addLineItemRow();

    calculateFormTotals();
    modal.classList.remove('hidden');
}

function addLineItemRow(serviceId = '', deskripsi = '', qty = 1, price = 0) {
    const tbody = document.getElementById('invoice-items-tbody');
    const rowId = 'row-' + Math.random().toString(36).substr(2, 6);

    // If serviceId is provided and deskripsi is empty, auto-fill from catalog
    if (serviceId && !deskripsi && Array.isArray(masterServices)) {
        const s = masterServices.find(x => x.id == serviceId);
        if (s) {
            deskripsi = s.nama_layanan;
            if (!price) price = s.harga_standar;
        }
    }

    const tr = document.createElement('tr');
    tr.id = rowId;
    tr.className = 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20';
    tr.innerHTML = `
        <td class="p-3">
            <input type="text" list="invoice-services-datalist" required placeholder="Pilih katalog atau ketik deskripsi item..." value="${deskripsi}"
                   class="item-desc w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500">
            <input type="hidden" class="item-service-id" value="${serviceId || ''}">
        </td>
        <td class="p-3">
            <input type="number" min="0.1" step="any" required value="${qty}"
                   class="item-qty w-full px-2 py-2 text-center font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
        </td>
        <td class="p-3">
            <input type="number" min="0" step="any" required value="${price}"
                   class="item-price w-full px-3 py-2 text-right font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
        </td>
        <td class="p-3 font-mono font-bold text-right text-xs text-slate-800 dark:text-slate-200 item-subtotal">
            Rp 0
        </td>
        <td class="p-3 text-center">
            <button type="button" onclick="document.getElementById('${rowId}').remove(); window.calcTotals();"
                    class="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition" title="Hapus Baris">
                <i class="ri-delete-bin-line text-sm"></i>
            </button>
        </td>
    `;

    tbody.appendChild(tr);

    // Bind item service catalog autocomplete & auto-pricing
    const descInput = tr.querySelector('.item-desc');
    const serviceIdInput = tr.querySelector('.item-service-id');
    const priceInput = tr.querySelector('.item-price');
    const qtyInput = tr.querySelector('.item-qty');

    descInput.addEventListener('input', () => {
        const val = descInput.value.trim().toLowerCase();
        if (Array.isArray(masterServices)) {
            const matched = masterServices.find(s => s.nama_layanan.toLowerCase() === val);
            if (matched) {
                serviceIdInput.value = matched.id;
                priceInput.value = matched.harga_standar;
            } else {
                serviceIdInput.value = '';
            }
        }
        calculateFormTotals();
    });

    qtyInput.addEventListener('input', calculateFormTotals);
    priceInput.addEventListener('input', calculateFormTotals);

    calculateFormTotals();
}

function calculateFormTotals() {
    const rows = document.querySelectorAll('#invoice-items-tbody tr');
    let subtotal = 0;

    rows.forEach(tr => {
        const qty = parseFloat(tr.querySelector('.item-qty').value) || 0;
        const price = parseFloat(tr.querySelector('.item-price').value) || 0;
        const total = qty * price;
        tr.querySelector('.item-subtotal').textContent = App.formatIDR(total);
        subtotal += total;
    });

    const diskonTipe = document.getElementById('form-inv-diskon-tipe').value;
    const diskonNilai = parseFloat(document.getElementById('form-inv-diskon-nilai').value) || 0;
    let diskonNominal = (diskonTipe === 'persen') ? (subtotal * (diskonNilai / 100)) : diskonNilai;
    if (diskonNominal > subtotal) diskonNominal = subtotal;

    const afterDiscount = subtotal - diskonNominal;
    const pajakPersen = parseFloat(document.getElementById('form-inv-pajak-persen').value) || 0;
    const pajakNominal = afterDiscount * (pajakPersen / 100);
    const netTotal = afterDiscount + pajakNominal;

    document.getElementById('calc-subtotal').textContent = App.formatIDR(subtotal);
    document.getElementById('calc-pajak').textContent = App.formatIDR(pajakNominal);
    document.getElementById('calc-total').textContent = App.formatIDR(netTotal);
}

window.calcTotals = calculateFormTotals;

async function handleSaveInvoice(e) {
    e.preventDefault();
    const rows = document.querySelectorAll('#invoice-items-tbody tr');
    if (rows.length === 0) {
        App.toast('Item tagihan minimal harus berisi 1 baris', 'warning');
        return;
    }

    const items = [];
    rows.forEach(tr => {
        items.push({
            service_id: tr.querySelector('.item-service-id')?.value || null,
            deskripsi: tr.querySelector('.item-desc').value.trim(),
            kuantitas: parseFloat(tr.querySelector('.item-qty').value) || 1,
            harga_satuan: parseFloat(tr.querySelector('.item-price').value) || 0
        });
    });

    const body = {
        client_id: document.getElementById('form-inv-client').value,
        tanggal_invoice: document.getElementById('form-inv-tanggal').value,
        tanggal_jatuh_tempo: document.getElementById('form-inv-tempo').value,
        diskon_tipe: document.getElementById('form-inv-diskon-tipe').value,
        diskon_nilai: document.getElementById('form-inv-diskon-nilai').value,
        pajak_persen: document.getElementById('form-inv-pajak-persen').value,
        catatan_klien: document.getElementById('form-inv-catatan-klien').value.trim(),
        items
    };

    const res = await App.api('invoices', { method: 'POST', body });
    if (res && res.success) {
        App.toast(res.message, 'success');
        document.getElementById('invoice-editor-modal').classList.add('hidden');
        loadInvoices();
    }
}

// ===== Printable A4 Sheet Renderer =====

registerInvoiceActions({ getLoadInvoices: () => loadInvoices, getState: () => state });
