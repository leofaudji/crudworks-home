// assets/js/pages/payments.js
import { App } from '../app.js';

let state = {
    page: 1,
    perPage: 10,
    search: '',
    invoiceId: '',
    activeTab: 'history' // 'history' | 'verifications'
};

let unpaidInvoices = [];
let paymentMethods = [];
let pendingVerificationsCount = 0;

export async function init(container) {
    // Read query params from hash if any
    const hash = window.location.hash;
    let preselectedInvoiceId = '';
    let preselectedAmount = '';
    if (hash.includes('?')) {
        const urlParams = new URLSearchParams(hash.split('?')[1]);
        if (urlParams.get('invoice_id')) preselectedInvoiceId = urlParams.get('invoice_id');
        if (urlParams.get('amount')) preselectedAmount = urlParams.get('amount');
        if (urlParams.get('tab') === 'verifications') state.activeTab = 'verifications';
    }

    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Pencatatan Pembayaran</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Kelola riwayat pelunasan invoice, verifikasi bukti transfer pelanggan, dan cetak kuitansi resmi.</p>
                </div>
                <button id="btn-add-payment" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-500/20 flex items-center gap-2 transition">
                    <i class="ri-money-dollar-circle-line text-base"></i>
                    <span>Catat Pembayaran Masuk</span>
                </button>
            </div>

            <!-- Tab Navigation -->
            <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button class="pay-tab px-4 py-2 rounded-xl font-bold text-xs transition ${state.activeTab === 'history' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-tab="history">
                    <i class="ri-history-line mr-1"></i> Riwayat Pembayaran Resmi
                </button>
                <button class="pay-tab px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${state.activeTab === 'verifications' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-tab="verifications">
                    <i class="ri-shield-check-line"></i>
                    <span>Verifikasi Bukti Transfer Klien</span>
                    <span id="badge-verif-count" class="hidden px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white">0</span>
                </button>
            </div>

            <!-- Tab Content Container -->
            <div id="pay-tab-body"></div>
        </div>

        <!-- 1. Record Payment Modal -->
        <div id="payment-modal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-fadeIn max-h-[92vh] overflow-y-auto">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-money-dollar-circle-line text-emerald-600"></i>
                        <span>Catat Pembayaran Masuk</span>
                    </h3>
                    <button onclick="document.getElementById('payment-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <form id="payment-form" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Pilih Faktur Tagihan *</label>
                        <select id="form-pay-invoice" required
                                class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="">Pilih Invoice yang Belum Lunas...</option>
                        </select>
                        <div id="invoice-balance-hint" class="text-xs text-slate-400 mt-1.5 hidden"></div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Jumlah Bayar (IDR) *</label>
                            <input type="number" id="form-pay-jumlah" required min="1" step="any" placeholder="0"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Tanggal Pembayaran *</label>
                            <input type="date" id="form-pay-tanggal" required
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Metode / Bank Penerima *</label>
                            <select id="form-pay-method" required
                                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Nomor Referensi Bank</label>
                            <input type="text" id="form-pay-ref" placeholder="Contoh: BCA-TRX-091283"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Catatan Tambahan</label>
                        <textarea id="form-pay-catatan" rows="2" placeholder="Keterangan transfer / catatan kasir"
                                  class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"></textarea>
                    </div>

                    <label class="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900 cursor-pointer text-xs">
                        <input type="checkbox" id="form-pay-use-deposit" class="w-4 h-4 rounded text-indigo-600">
                        <span class="font-semibold text-indigo-900 dark:text-indigo-200">Potong dari Saldo Deposit / Retainer Klien</span>
                    </label>

                    <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                        <button type="button" onclick="document.getElementById('payment-modal').classList.add('hidden')"
                                class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold">Batal</button>
                        <button type="submit" id="btn-save-payment"
                                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-500/20">Simpan Pembayaran</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- 2. Verify Transfer Proof Modal -->
        <div id="verify-modal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-fadeIn max-h-[92vh] overflow-y-auto">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-shield-check-line text-emerald-600"></i>
                        <span>Setujui & Terbitkan Kuitansi</span>
                    </h3>
                    <button onclick="document.getElementById('verify-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <form id="verify-form" class="space-y-4">
                    <input type="hidden" id="form-verif-invoice-id">

                    <div class="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                        <div class="text-slate-400">Nomor Faktur: <b id="verif-info-invoice" class="font-mono text-slate-800 dark:text-slate-200">INV-...</b></div>
                        <div class="text-slate-400">Pelanggan: <b id="verif-info-client" class="text-slate-800 dark:text-slate-200">-</b></div>
                        <div class="text-slate-400">Sisa Tagihan: <b id="verif-info-sisa" class="font-mono text-emerald-600">Rp 0</b></div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Jumlah Diterima (IDR) *</label>
                            <input type="number" id="form-verif-jumlah" required min="1" step="any"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Kanal / Rekening Bank *</label>
                            <select id="form-verif-method" required
                                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Nomor Referensi Mutasi</label>
                        <input type="text" id="form-verif-ref" placeholder="Contoh: BCA-MUTASI-98124"
                               class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500">
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Catatan Verifikator</label>
                        <textarea id="form-verif-catatan" rows="2" placeholder="Telah diverifikasi sesuai mutasi rekening koran bank"
                                  class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"></textarea>
                    </div>

                    <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                        <button type="button" onclick="document.getElementById('verify-modal').classList.add('hidden')"
                                class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold">Batal</button>
                        <button type="submit" id="btn-submit-verify"
                                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-500/20">Konfirmasi & Terbitkan</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- 3. Proof Preview Modal -->
        <div id="proof-image-modal" class="hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl">
                <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                    <h3 class="text-sm font-bold text-slate-900 dark:text-white">Lampiran Bukti Transfer Klien</h3>
                    <button onclick="document.getElementById('proof-image-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>
                <div class="flex justify-center items-center max-h-[75vh] overflow-hidden rounded-2xl bg-slate-950">
                    <img id="proof-modal-img" src="" alt="Bukti Transfer" class="max-h-[75vh] max-w-full object-contain">
                </div>
            </div>
        </div>

        <!-- 4. Payment Receipt Modal (Kuitansi Resmi) -->
        <div id="receipt-modal" class="hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-xl bg-white text-slate-900 rounded-3xl shadow-2xl p-8 sm:p-10 animate-fadeIn printable-invoice">
                <div class="no-print flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
                    <div class="flex flex-wrap items-center gap-2">
                        <button id="btn-receipt-preview-pdf" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow">
                            <i class="ri-file-pdf-2-line text-rose-400"></i> Pratinjau Dokumen PDF
                        </button>
                        <button id="btn-receipt-download-pdf" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow">
                            <i class="ri-download-line"></i> Unduh PDF
                        </button>
                    </div>
                    <button onclick="document.getElementById('receipt-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>
                <div id="receipt-content"></div>
            </div>
        </div>
    `;

    // Load master references
    await Promise.all([loadUnpaidInvoices(), loadPaymentMethods(), checkPendingVerifications()]);

    // Bindings
    document.getElementById('btn-add-payment').addEventListener('click', () => openPaymentModal());
    document.getElementById('payment-form').addEventListener('submit', handleSavePayment);
    document.getElementById('verify-form').addEventListener('submit', handleConfirmVerify);

    // Tab bindings
    document.querySelectorAll('.pay-tab').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('.pay-tab').forEach(x => {
                x.className = 'pay-tab px-4 py-2 rounded-xl font-bold text-xs transition text-slate-500 hover:text-slate-900 dark:hover:text-white';
            });
            b.className = 'pay-tab px-4 py-2 rounded-xl font-bold text-xs transition bg-primary-600 text-white shadow-sm';
            state.activeTab = b.getAttribute('data-tab');
            renderActiveTab();
        });
    });

    // Check preselected invoice from hash
    if (preselectedInvoiceId) {
        setTimeout(() => {
            openPaymentModal(preselectedInvoiceId, preselectedAmount);
        }, 100);
    }

    renderActiveTab();
}

async function checkPendingVerifications() {
    const res = await App.api('payments/verifications');
    if (res && res.success) {
        pendingVerificationsCount = res.data.length;
        const badge = document.getElementById('badge-verif-count');
        if (badge) {
            badge.textContent = pendingVerificationsCount;
            if (pendingVerificationsCount > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }
}

function renderActiveTab() {
    const cont = document.getElementById('pay-tab-body');
    if (state.activeTab === 'history') {
        renderHistoryTab(cont);
    } else {
        renderVerificationsTab(cont);
    }
}

function renderHistoryTab(container) {
    container.innerHTML = `
        <div class="space-y-6">
            <!-- Search -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-4">
                <div class="relative flex-1">
                    <input type="text" id="payment-search" placeholder="Cari nomor kuitansi (PAY-...), invoice (INV-...), nama klien, referensi..."
                           class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <i class="ri-search-line absolute left-3.5 top-3 text-slate-400 text-sm"></i>
                </div>
            </div>

            <!-- Payments Table Card -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th class="py-3.5 px-6">Nomor Kuitansi</th>
                                <th class="py-3.5 px-6">Faktur Tagihan</th>
                                <th class="py-3.5 px-6">Pelanggan</th>
                                <th class="py-3.5 px-6">Tanggal Bayar</th>
                                <th class="py-3.5 px-6">Metode & Referensi</th>
                                <th class="py-3.5 px-6">Jumlah Bayar</th>
                                <th class="py-3.5 px-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="payments-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr>
                                <td colspan="7" class="py-12 text-center text-slate-400">
                                    <i class="ri-loader-4-line text-2xl animate-spin mb-2 inline-block"></i>
                                    <div>Memuat data pembayaran...</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div id="payments-pagination" class="px-7 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500"></div>
            </div>
        </div>
    `;

    const searchInput = document.getElementById('payment-search');
    let timer;
    searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            state.search = searchInput.value.trim();
            state.page = 1;
            loadPayments();
        }, 300);
    });

    loadPayments();
}

async function renderVerificationsTab(container) {
    container.innerHTML = `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                    <h3 class="text-base font-bold text-slate-900 dark:text-white">Daftar Bukti Transfer Menunggu Konfirmasi</h3>
                    <p class="text-xs text-slate-400">Verifikasi tanda terima transfer yang diunggah oleh klien melalui portal publik.</p>
                </div>
                <button onclick="window.reloadVerifications()" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-200">
                    <i class="ri-refresh-line mr-1"></i> Muat Ulang
                </button>
            </div>

            <div class="overflow-x-auto">
                <table class="data-table w-full text-left text-sm border-collapse">
                    <thead>
                        <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <th class="py-3.5 px-6">Waktu Upload</th>
                            <th class="py-3.5 px-6">Nomor Faktur</th>
                            <th class="py-3.5 px-6">Pelanggan & Kontak</th>
                            <th class="py-3.5 px-6">Tagihan & Sisa</th>
                            <th class="py-3.5 px-6 text-center">Bukti Transfer</th>
                            <th class="py-3.5 px-6">Catatan Klien</th>
                            <th class="py-3.5 px-6 text-right">Aksi Verifikasi</th>
                        </tr>
                    </thead>
                    <tbody id="verif-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                        <tr>
                            <td colspan="7" class="py-12 text-center text-slate-400">
                                <i class="ri-loader-4-line text-2xl animate-spin mb-2 inline-block"></i>
                                <div>Memeriksa bukti transfer baru...</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    loadVerifications();
}

async function loadVerifications() {
    const tbody = document.getElementById('verif-tbody');
    if (!tbody) return;

    const res = await App.api('payments/verifications');
    if (!res || !res.success) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-rose-500">Gagal memuat bukti transfer</td></tr>`;
        return;
    }

    const items = res.data;
    pendingVerificationsCount = items.length;
    const badge = document.getElementById('badge-verif-count');
    if (badge) {
        badge.textContent = pendingVerificationsCount;
        if (pendingVerificationsCount > 0) badge.classList.remove('hidden');
        else badge.classList.add('hidden');
    }

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-16 text-center text-slate-400">
                    <i class="ri-checkbox-circle-line text-3xl text-emerald-500 mb-2 inline-block"></i>
                    <div class="font-bold text-slate-700 dark:text-slate-300">Semua Bukti Transfer Selesai Diverifikasi</div>
                    <div class="text-xs text-slate-400 mt-1">Tidak ada unggahan konfirmasi transfer yang tertunda saat ini.</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map(v => {
        const imgUrl = v.bukti_transfer.startsWith('http') ? v.bukti_transfer : `${App.baseUrl || ''}${v.bukti_transfer}`;
        return `
            <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <td class="py-4 px-6 text-xs font-mono text-slate-500">
                    <div>${App.formatDate(v.bukti_transfer_at)}</div>
                    <div class="text-[11px] text-slate-400">${new Date(v.bukti_transfer_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</div>
                </td>
                <td class="py-4 px-6">
                    <a href="#/invoices" class="font-mono text-primary-600 dark:text-primary-400 hover:underline font-bold text-xs">
                        ${v.nomor_invoice}
                    </a>
                </td>
                <td class="py-4 px-6">
                    <div class="font-bold text-xs text-slate-900 dark:text-white">${v.client_nama}</div>
                    <div class="text-[11px] text-slate-400">${v.client_pic} · ${v.client_telepon}</div>
                </td>
                <td class="py-4 px-6 font-mono text-xs">
                    <div class="font-bold text-slate-900 dark:text-white">${App.formatIDR(v.total_tagihan)}</div>
                    <div class="text-rose-600 font-bold">Sisa: ${App.formatIDR(v.sisa_tagihan)}</div>
                </td>
                <td class="py-4 px-6 text-center">
                    <button onclick="window.previewProofImage('${imgUrl}')" class="group relative inline-block rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                        <img src="${imgUrl}" alt="Bukti" class="w-14 h-14 object-cover group-hover:scale-105 transition duration-200">
                        <div class="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <i class="ri-zoom-in-line text-white text-base"></i>
                        </div>
                    </button>
                </td>
                <td class="py-4 px-6 max-w-xs text-xs text-slate-600 dark:text-slate-300">
                    ${v.bukti_transfer_catatan || '<span class="text-slate-400 italic">Tidak ada catatan</span>'}
                </td>
                <td class="py-4 px-6 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button onclick="window.openVerifyModal(${v.invoice_id}, '${v.nomor_invoice}', '${v.client_nama}', ${v.sisa_tagihan})"
                                class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1 transition">
                            <i class="ri-check-line text-sm"></i>
                            <span>Verifikasi</span>
                        </button>
                        <button onclick="window.rejectTransferProof(${v.invoice_id}, '${v.nomor_invoice}')"
                                class="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900 transition"
                                title="Tolak Bukti">
                            <i class="ri-close-line text-sm"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.reloadVerifications = loadVerifications;

window.previewProofImage = (url) => {
    document.getElementById('proof-modal-img').src = url;
    document.getElementById('proof-image-modal').classList.remove('hidden');
};

window.openVerifyModal = (invoiceId, nomorInvoice, clientNama, sisa) => {
    document.getElementById('verify-form').reset();
    document.getElementById('form-verif-invoice-id').value = invoiceId;
    document.getElementById('verif-info-invoice').textContent = nomorInvoice;
    document.getElementById('verif-info-client').textContent = clientNama;
    document.getElementById('verif-info-sisa').textContent = App.formatIDR(sisa);

    const sisaNum = Math.round(parseFloat(sisa) || 0);
    const verifJumlah = document.getElementById('form-verif-jumlah');
    verifJumlah.value = sisaNum;
    verifJumlah.max = Math.ceil(sisaNum);
    verifJumlah.dispatchEvent(new Event('input', { bubbles: true }));

    document.getElementById('form-verif-ref').value = `TRF-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const selMethod = document.getElementById('form-verif-method');
    if (selMethod && paymentMethods.length > 0) {
        selMethod.innerHTML = paymentMethods.map(m => `
            <option value="${m.id}">${m.nama_metode} (${m.nomor_rekening})</option>
        `).join('');
    }

    document.getElementById('verify-modal').classList.remove('hidden');
};

async function handleConfirmVerify(e) {
    e.preventDefault();
    const invId = document.getElementById('form-verif-invoice-id').value;
    const body = {
        jumlah_bayar: parseFloat(document.getElementById('form-verif-jumlah').value) || 0,
        payment_method_id: document.getElementById('form-verif-method').value,
        nomor_referensi: document.getElementById('form-verif-ref').value.trim(),
        catatan: document.getElementById('form-verif-catatan').value.trim()
    };

    const res = await App.api(`payments/${invId}/verify-transfer`, { method: 'POST', body });
    if (res && res.success) {
        App.toast(res.message, 'success');
        document.getElementById('verify-modal').classList.add('hidden');
        await loadVerifications();
        await loadUnpaidInvoices();
    }
}

window.rejectTransferProof = async (invId, nomorInvoice) => {
    const conf = await App.confirm(
        'Tolak Bukti Transfer',
        `Apakah Anda yakin ingin menolak bukti transfer untuk tagihan "${nomorInvoice}"? Klien dapat mengunggah bukti ulang di portal publik.`
    );
    if (!conf) return;

    const res = await App.api(`payments/${invId}/reject-transfer`, {
        method: 'POST',
        body: { alasan_penolakan: 'Bukti transfer tidak dapat diverifikasi pada mutasi rekening bank' }
    });

    if (res && res.success) {
        App.toast(res.message, 'success');
        await loadVerifications();
    }
};

async function loadUnpaidInvoices() {
    const res = await App.api('invoices?per_page=150');
    if (res && res.success) {
        unpaidInvoices = res.data.filter(inv => ['draft', 'dikirim', 'sebagian', 'jatuh_tempo'].includes(inv.status) && Number(inv.sisa_tagihan) > 0);
        const sel = document.getElementById('form-pay-invoice');
        if (sel) {
            sel.innerHTML = '<option value="">Pilih Invoice yang Belum Lunas...</option>' + unpaidInvoices.map(inv => `
                <option value="${inv.id}" data-sisa="${inv.sisa_tagihan}">
                    ${inv.nomor_invoice} — ${inv.client_nama} (Sisa: ${App.formatIDR(inv.sisa_tagihan)})
                </option>
            `).join('');

            sel.onchange = () => {
                const opt = sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex] : null;
                const hint = document.getElementById('invoice-balance-hint');
                const jumlahInput = document.getElementById('form-pay-jumlah');
                if (opt && opt.value) {
                    const sisa = parseFloat(opt.getAttribute('data-sisa')) || 0;
                    hint.textContent = `Sisa tagihan yang harus dibayar: ${App.formatIDR(sisa)}`;
                    hint.classList.remove('hidden');
                    jumlahInput.value = Math.round(sisa);
                    jumlahInput.max = Math.ceil(sisa);
                    jumlahInput.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    hint.classList.add('hidden');
                }
            };
        }
    }
}

async function loadPaymentMethods() {
    const res = await App.api('settings/payment-methods');
    if (res && res.success) {
        paymentMethods = res.data;
        const sel = document.getElementById('form-pay-method');
        if (sel) {
            sel.innerHTML = paymentMethods.map(m => `
                <option value="${m.id}">${m.nama_metode} (${m.nomor_rekening})</option>
            `).join('');
        }
    }
}

async function loadPayments() {
    const tbody = document.getElementById('payments-tbody');
    const paginationEl = document.getElementById('payments-pagination');
    if (!tbody) return;

    let ep = `payments?page=${state.page}&per_page=${state.perPage}`;
    if (state.search) ep += `&search=${encodeURIComponent(state.search)}`;

    const res = await App.api(ep);
    if (!res || !res.success) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-rose-500">Gagal memuat riwayat pembayaran</td></tr>`;
        return;
    }

    const { data: payments, pagination } = res;

    if (payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400">Belum ada transaksi pembayaran tercatat</td></tr>`;
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }

    tbody.innerHTML = payments.map(p => `
        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
            <td class="py-4 px-6 font-mono font-bold text-slate-900 dark:text-white">
                ${p.nomor_pembayaran}
            </td>
            <td class="py-4 px-6">
                <a href="#/invoices" class="font-mono text-primary-600 dark:text-primary-400 hover:underline font-bold text-xs">
                    ${p.nomor_invoice}
                </a>
            </td>
            <td class="py-4 px-6 font-medium text-slate-800 dark:text-slate-200">
                ${p.client_nama}
            </td>
            <td class="py-4 px-6 text-xs text-slate-500 font-mono">
                ${App.formatDate(p.tanggal_bayar)}
            </td>
            <td class="py-4 px-6">
                <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">${p.nama_metode}</div>
                <div class="text-[11px] font-mono text-slate-400">${p.nomor_referensi || '-'}</div>
            </td>
            <td class="py-4 px-6 font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                ${App.formatIDR(p.jumlah_bayar)}
            </td>
            <td class="py-4 px-6 text-right">
                <button type="button" onclick="App.toggleTableActionMenu(this, event, [
                    { label: 'Cetak / Unduh Kuitansi', icon: 'ri-file-pdf-2-line', iconColor: 'text-rose-600', action: 'window.printPaymentReceiptPdf(${p.id})' },
                    { label: 'Rincian Kuitansi Resmi', icon: 'ri-file-list-3-line', iconColor: 'text-primary-600', action: 'window.viewReceipt(${p.id})' },
                    { divider: true },
                    { label: 'Batalkan Pembayaran', icon: 'ri-close-circle-line', danger: true, action: 'window.cancelPayment(${p.id}, \\'${p.nomor_pembayaran}\\')' }
                ])" class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition" title="Menu Aksi">
                    <span>Aksi</span>
                    <i class="ri-more-2-fill text-slate-400"></i>
                </button>
            </td>
        </tr>
    `).join('');

    if (paginationEl) {
        paginationEl.innerHTML = `
            <div>Menampilkan hal <b>${pagination.page}</b> dari <b>${pagination.total}</b> transaksi</div>
            <div class="flex items-center gap-2">
                <button ${pagination.page <= 1 ? 'disabled' : ''} onclick="window.changePaymentPage(${pagination.page - 1})"
                        class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40">Sebelumnya</button>
                <button ${pagination.page >= pagination.total_pages ? 'disabled' : ''} onclick="window.changePaymentPage(${pagination.page + 1})"
                        class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40">Berikutnya</button>
            </div>
        `;
    }
}

function openPaymentModal(invoiceId = '', amount = '') {
    const modal = document.getElementById('payment-modal');
    document.getElementById('payment-form').reset();
    document.getElementById('form-pay-tanggal').value = new Date().toISOString().split('T')[0];

    const sel = document.getElementById('form-pay-invoice');
    const jumlahInput = document.getElementById('form-pay-jumlah');

    if (invoiceId && sel) {
        sel.value = invoiceId;
        if (typeof sel.onchange === 'function') {
            sel.onchange();
        } else {
            sel.dispatchEvent(new Event('change'));
        }
    }

    if (amount) {
        const cleanAmount = Math.round(parseFloat(amount) || 0);
        if (cleanAmount > 0) {
            jumlahInput.value = cleanAmount;
            jumlahInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    modal.classList.remove('hidden');
}

async function handleSavePayment(e) {
    e.preventDefault();
    const invoiceId = document.getElementById('form-pay-invoice').value;
    const jumlahBayar = parseFloat(document.getElementById('form-pay-jumlah').value) || 0;

    if (!invoiceId) {
        App.toast('Silakan pilih faktur tagihan terlebih dahulu', 'warning');
        return;
    }

    if (jumlahBayar <= 0) {
        App.toast('Jumlah pembayaran harus lebih dari Rp 0', 'warning');
        return;
    }

    const sel = document.getElementById('form-pay-invoice');
    const opt = sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex] : null;
    const sisa = opt ? (parseFloat(opt.getAttribute('data-sisa')) || 0) : 0;
    if (sisa > 0 && jumlahBayar > sisa + 0.5) {
        App.toast(`Jumlah pembayaran (${App.formatIDR(jumlahBayar)}) melebihi sisa tagihan (${App.formatIDR(sisa)})`, 'warning');
        return;
    }

    const btnSubmit = document.getElementById('btn-save-payment');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="ri-loader-4-line animate-spin mr-1"></i> Menyimpan...';
    }

    try {
        const body = {
            invoice_id: invoiceId,
            payment_method_id: document.getElementById('form-pay-method').value,
            tanggal_bayar: document.getElementById('form-pay-tanggal').value,
            jumlah_bayar: jumlahBayar,
            nomor_referensi: document.getElementById('form-pay-ref').value.trim(),
            catatan: document.getElementById('form-pay-catatan').value.trim(),
            use_deposit: document.getElementById('form-pay-use-deposit')?.checked ? 1 : 0
        };

        const res = await App.api('payments', { method: 'POST', body });
        if (res && res.success) {
            App.toast(res.message, 'success');
            document.getElementById('payment-modal').classList.add('hidden');
            await loadUnpaidInvoices();
            loadPayments();
        }
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Simpan Pembayaran';
        }
    }
}

window.viewReceipt = async (id) => {
    const res = await App.api(`payments/${id}`);
    if (!res || !res.success) return;

    const p = res.data;
    const cont = document.getElementById('receipt-content');

    // Bind PDF buttons
    const prevPdfBtn = document.getElementById('btn-receipt-preview-pdf');
    if (prevPdfBtn) {
        prevPdfBtn.onclick = () => window.printPaymentReceiptPdf(id, 'bloburl');
    }
    const downPdfBtn = document.getElementById('btn-receipt-download-pdf');
    if (downPdfBtn) {
        downPdfBtn.onclick = () => window.printPaymentReceiptPdf(id, 'download');
    }

    cont.innerHTML = `
        <div class="space-y-6 text-slate-900 font-sans">
            <!-- Receipt Header -->
            <div class="flex items-center justify-between pb-6 border-b-2 border-slate-900">
                <div>
                    <h2 class="text-xl font-black text-slate-900 uppercase">KUITANSI PEMBAYARAN</h2>
                    <div class="text-xs text-slate-500 font-mono">No. ${p.nomor_pembayaran}</div>
                </div>
                <div class="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center text-xl font-bold">
                    <i class="ri-checkbox-circle-line"></i>
                </div>
            </div>

            <!-- Receipt Info Grid -->
            <div class="space-y-3 text-xs">
                <div class="flex justify-between py-2 border-b border-slate-100">
                    <span class="text-slate-400">Telah Diterima Dari:</span>
                    <span class="font-extrabold text-slate-900 text-sm">${p.client_nama} (${p.client_pic})</span>
                </div>
                <div class="flex justify-between py-2 border-b border-slate-100">
                    <span class="text-slate-400">Untuk Pembayaran:</span>
                    <span class="font-bold text-slate-800">Pelunasan Tagihan Faktur No. <code class="font-mono">${p.nomor_invoice}</code></span>
                </div>
                <div class="flex justify-between py-2 border-b border-slate-100">
                    <span class="text-slate-400">Tanggal Transaksi:</span>
                    <span class="font-mono text-slate-700">${App.formatDate(p.tanggal_bayar)}</span>
                </div>
                <div class="flex justify-between py-2 border-b border-slate-100">
                    <span class="text-slate-400">Rekening Tujuan / Kanal:</span>
                    <span class="font-semibold text-slate-800">${p.nama_bank || p.nama_metode} ${p.nomor_rekening ? `(${p.nomor_rekening})` : ''} ${p.atas_nama ? `a.n ${p.atas_nama}` : ''} ${p.nomor_referensi ? `· Ref: ${p.nomor_referensi}` : ''}</span>
                </div>
                <div class="flex justify-between py-3 bg-emerald-50 rounded-xl px-4 text-sm font-black text-emerald-800">
                    <span>JUMLAH DITERIMA:</span>
                    <span class="font-mono text-lg">${App.formatIDR(p.jumlah_bayar)}</span>
                </div>
                <div class="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    <span class="font-semibold text-slate-400 uppercase text-[9px] block">Terbilang:</span>
                    <span class="italic font-medium">${App.terbilang(p.jumlah_bayar)} Rupiah</span>
                </div>
                ${p.catatan ? `<div class="text-[11px] text-slate-500 italic">Catatan: ${p.catatan}</div>` : ''}
            </div>

            <!-- Signatures -->
            <div class="pt-8 flex justify-between text-xs text-center">
                <div>
                    <div class="text-slate-400 mb-12">Diserahkan oleh,</div>
                    <div class="font-bold text-slate-800 border-t border-slate-300 pt-1 w-40">${p.client_pic}</div>
                </div>
                <div>
                    <div class="text-slate-400 mb-12">Kasir / Verifikator,</div>
                    <div class="font-bold text-slate-800 border-t border-slate-300 pt-1 w-40">${p.verifikator_nama}</div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('receipt-modal').classList.remove('hidden');
};

window.printPaymentReceiptPdf = async (id, output = 'bloburl') => {
    try {
        const res = await App.api(`payments/${id}`);
        if (!res || !res.success) {
            App.toast('Gagal memuat data pembayaran untuk dicetak', 'error');
            return;
        }
        const p = res.data;
        const pdfRes = await App.generatePaymentReceiptPdf(p, output);
        if (output === 'bloburl' && pdfRes?.blobUrl) {
            App.openPdfModal({
                title: `Kuitansi Pembayaran — ${p.nomor_pembayaran}`,
                filename: pdfRes.filename,
                blobUrl: pdfRes.blobUrl
            });
        } else {
            App.toast('Dokumen PDF kuitansi berhasil diunduh', 'success');
        }
    } catch (err) {
        App.toast(err?.message || 'Gagal membuat dokumen PDF kuitansi', 'error');
    }
};

window.cancelPayment = async (id, no) => {
    const conf = await App.confirm('Batalkan Pembayaran', `Apakah Anda yakin ingin membatalkan transaksi "${no}"? Saldo invoice terkait akan dikembalikan.`);
    if (!conf) return;

    const res = await App.api(`payments/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        await loadUnpaidInvoices();
        loadPayments();
    }
};

window.changePaymentPage = (p) => {
    state.page = p;
    loadPayments();
};
