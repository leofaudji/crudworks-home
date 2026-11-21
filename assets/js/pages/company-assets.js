// assets/js/pages/company-assets.js
// Modul Aset Internal & Langganan Cloud Pihak Luar (Company Assets & Cloud Subscriptions)
import { App } from '../app.js';

let state = {
    search: '',
    kategori: '',
    status: '',
    provider: '',
    expiring_soon: false,
    items: [],
    kpi: {},
    providers: [],
    users: [],
    projects: [],
    paymentMethods: [],
    isLoading: false
};

const KATEGORI_CONFIG = {
    cloud_vps: { label: 'Server & Cloud VPS', icon: 'ri-server-line', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60' },
    database_storage: { label: 'Database & Storage', icon: 'ri-database-2-line', color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60' },
    domain_dns: { label: 'Domain & DNS', icon: 'ri-global-line', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60' },
    saas_license: { label: 'Lisensi SaaS & Software', icon: 'ri-apps-2-line', color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60' },
    security_ssl: { label: 'SSL & Keamanan', icon: 'ri-shield-keyhole-line', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60' },
    email_smtp: { label: 'Email Bisnis & SMTP', icon: 'ri-mail-send-line', color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60' },
    network_cdn: { label: 'CDN & Akselerasi Jaringan', icon: 'ri-radar-line', color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/60' },
    hardware_it: { label: 'Perangkat & Hardware IT', icon: 'ri-computer-line', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' },
    lainnya: { label: 'Lainnya', icon: 'ri-more-line', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' }
};

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header Section -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                        <i class="ri-cloud-line text-primary-600 dark:text-primary-400"></i>
                        Aset & Langganan Cloud
                    </h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Pencatatan infrastruktur server VPS, cloud storage, nama domain, lisensi SaaS, dan jadwal perpanjangan ke pihak luar.
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-2.5">
                    <button id="btn-add-asset" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-xs transition inline-flex items-center gap-2">
                        <i class="ri-add-line text-sm"></i>
                        <span>Tambah Aset / Langganan</span>
                    </button>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="asset-kpi-container">
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs animate-pulse">
                    <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-3"></div>
                    <div class="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                </div>
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs animate-pulse">
                    <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-3"></div>
                    <div class="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                </div>
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs animate-pulse">
                    <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-3"></div>
                    <div class="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                </div>
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs animate-pulse">
                    <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-3"></div>
                    <div class="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                </div>
            </div>

            <!-- Filters Bar -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col lg:flex-row items-center gap-3 shadow-xs">
                <div class="relative flex-1 w-full">
                    <input type="text" id="asset-filter-search" placeholder="Cari nama aset, provider (AWS/DigitalOcean), IP address, atau domain..."
                           class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <i class="ri-search-line absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full lg:w-auto">
                    <select id="asset-filter-kategori" class="px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        <option value="">Semua Kategori</option>
                        <option value="cloud_vps">Server & Cloud VPS</option>
                        <option value="database_storage">Database & Storage</option>
                        <option value="domain_dns">Domain & DNS</option>
                        <option value="saas_license">Lisensi SaaS & Software</option>
                        <option value="security_ssl">SSL & Keamanan</option>
                        <option value="email_smtp">Email & SMTP</option>
                        <option value="network_cdn">CDN & Jaringan</option>
                        <option value="hardware_it">Perangkat IT</option>
                        <option value="lainnya">Lainnya</option>
                    </select>
                    <select id="asset-filter-status" class="px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        <option value="">Semua Status</option>
                        <option value="aktif">Aktif (Aman)</option>
                        <option value="segera_kadaluwarsa">Segera Kedaluwarsa (≤30 Hari)</option>
                        <option value="kadaluwarsa">Kedaluwarsa / Kritis</option>
                        <option value="ditangguhkan">Ditangguhkan</option>
                        <option value="dihentikan">Dihentikan</option>
                    </select>
                    <select id="asset-filter-provider" class="px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs col-span-2 sm:col-span-1">
                        <option value="">Semua Provider</option>
                    </select>
                </div>
            </div>

            <!-- Table Card -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <th class="py-3.5 px-6">Aset &amp; Provider</th>
                                <th class="py-3.5 px-6">Identifikasi &amp; Lokasi</th>
                                <th class="py-3.5 px-6 font-mono">Biaya &amp; Siklus</th>
                                <th class="py-3.5 px-6 font-mono">Jatuh Tempo Perpanjangan</th>
                                <th class="py-3.5 px-6">Status</th>
                                <th class="py-3.5 px-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="asset-tbody" class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                            <tr>
                                <td colspan="6" class="py-12 text-center text-slate-400">
                                    <i class="ri-loader-4-line text-2xl animate-spin mb-2 inline-block"></i>
                                    <p>Memuat daftar aset & langganan cloud...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- ============================================== -->
        <!-- MODAL 1: FORM TAMBAH / UBAH ASET               -->
        <!-- ============================================== -->
        <div id="modal-asset-form" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div class="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 animate-fadeIn my-8 max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                    <div>
                        <h3 id="modal-asset-title" class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-cloud-line text-primary-600"></i>
                            Tambah Aset &amp; Langganan Cloud
                        </h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Catat rincian server, cloud VPS, domain, atau lisensi software pihak ketiga.</p>
                    </div>
                    <button type="button" class="btn-close-asset-modal text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <i class="ri-close-line text-xl"></i>
                    </button>
                </div>

                <form id="form-asset" class="space-y-4">
                    <input type="hidden" id="form-asset-id" value="">

                    <!-- Baris 1: Nama Aset & Provider -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Nama Aset / Layanan *</label>
                            <input type="text" id="form-asset-nama" required placeholder="Contoh: Production Web Server VPS"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Provider / Vendor Luar *</label>
                            <input type="text" id="form-asset-provider" required placeholder="Contoh: DigitalOcean / AWS / Cloudflare"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500">
                        </div>
                    </div>

                    <!-- Baris 2: Kategori & Identifier -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Kategori Aset *</label>
                            <select id="form-asset-kategori" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                <option value="cloud_vps">Server & Cloud VPS</option>
                                <option value="database_storage">Database & Cloud Storage</option>
                                <option value="domain_dns">Domain & DNS Portofolio</option>
                                <option value="saas_license">Lisensi SaaS & Software</option>
                                <option value="security_ssl">Sertifikat SSL & Keamanan</option>
                                <option value="email_smtp">Email Bisnis & SMTP API</option>
                                <option value="network_cdn">CDN & Jaringan</option>
                                <option value="hardware_it">Perangkat IT / Hardware</option>
                                <option value="lainnya">Lainnya</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Identifier (IP / Domain / Hostname)</label>
                            <input type="text" id="form-asset-identifier" placeholder="Contoh: 128.199.201.88 / api.domain.com"
                                   class="w-full px-3.5 py-2.5 font-mono bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500">
                        </div>
                    </div>

                    <!-- Baris 3: Region & Spesifikasi -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Region / Lokasi Data Center</label>
                            <input type="text" id="form-asset-region" placeholder="Contoh: Singapore (SGP1) / Jakarta"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Portal Login Provider (URL)</label>
                            <input type="url" id="form-asset-url" placeholder="https://cloud.digitalocean.com"
                                   class="w-full px-3.5 py-2.5 font-mono bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Spesifikasi Teknis / Kapasitas Paket</label>
                        <textarea id="form-asset-spek" rows="2" placeholder="Contoh: 4 vCPU, 8GB RAM, 160GB NVMe SSD, OS Ubuntu 24.04 LTS"
                                  class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"></textarea>
                    </div>

                    <!-- Baris 4: Biaya & Mata Uang -->
                    <div class="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3">
                        <span class="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Skema Biaya &amp; Tarif Langganan</span>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label class="block text-[11px] font-bold text-slate-500 mb-1">Nominal Biaya *</label>
                                <input type="number" step="0.01" id="form-asset-biaya" required value="0"
                                       class="w-full px-3.5 py-2 font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-500 mb-1">Mata Uang</label>
                                <select id="form-asset-matauang" class="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">
                                    <option value="IDR">IDR (Rupiah)</option>
                                    <option value="USD" selected>USD (US Dollar)</option>
                                    <option value="EUR">EUR (Euro)</option>
                                    <option value="SGD">SGD (SG Dollar)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-500 mb-1">Kurs ke IDR</label>
                                <input type="number" step="1" id="form-asset-kurs" value="16200"
                                       class="w-full px-3.5 py-2 font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                            </div>
                        </div>
                        <div class="flex items-center justify-between text-xs pt-1">
                            <span class="text-slate-500">Estimasi Konversi IDR:</span>
                            <span id="form-asset-preview-idr" class="font-mono font-black text-primary-600 dark:text-primary-400 text-sm">Rp 0</span>
                        </div>
                    </div>

                    <!-- Baris 5: Siklus & Periode Langganan -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Siklus Pembayaran *</label>
                            <select id="form-asset-siklus" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                                <option value="bulanan">Bulanan</option>
                                <option value="triwulan">Triwulan (3 Bulan)</option>
                                <option value="semesteran">Semesteran (6 Bulan)</option>
                                <option value="tahunan">Tahunan</option>
                                <option value="dua_tahunan">Dua Tahunan</option>
                                <option value="one_time">Sekali Bayar (One-Time)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Tanggal Mulai *</label>
                            <input type="date" id="form-asset-tgl-mulai" required
                                   class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Jatuh Tempo Perpanjangan *</label>
                            <input type="date" id="form-asset-tgl-akhir" required
                                   class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        </div>
                    </div>

                    <!-- Baris 6: Metode Bayar & PIC -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Metode Bayar / Kartu</label>
                            <input type="text" id="form-asset-metode" placeholder="Contoh: Kartu Kredit BCA Visa / PayPal"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">PIC / Penanggung Jawab Internal</label>
                            <select id="form-asset-pic" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                <option value="">-- Pilih Staf Penanggung Jawab --</option>
                            </select>
                        </div>
                    </div>

                    <!-- Baris 7: Status & Auto Renew -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Status Layanan</label>
                            <select id="form-asset-status" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                <option value="aktif">Aktif</option>
                                <option value="segera_kadaluwarsa">Segera Kedaluwarsa</option>
                                <option value="kadaluwarsa">Kedaluwarsa</option>
                                <option value="ditangguhkan">Ditangguhkan</option>
                                <option value="dihentikan">Dihentikan</option>
                            </select>
                        </div>
                        <div class="pt-6">
                            <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <input type="checkbox" id="form-asset-autorenew" checked class="rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                                <span>Perpanjangan Otomatis (Auto-Renew Aktif)</span>
                            </label>
                        </div>
                    </div>

                    <!-- Catatan -->
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Catatan Tambahan</label>
                        <textarea id="form-asset-catatan" rows="2" placeholder="Catatan kegunaan, port aplikasi, atau informasi tagihan"
                                  class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"></textarea>
                    </div>

                    <!-- Actions -->
                    <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                        <button type="button" class="btn-close-asset-modal px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition">
                            Batal
                        </button>
                        <button type="submit" id="btn-save-asset" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-xs transition inline-flex items-center gap-2">
                            <i class="ri-save-line"></i>
                            Simpan Aset
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ============================================== -->
        <!-- MODAL 2: CATAT KE BEBAN PENGELUARAN (1-CLICK)  -->
        <!-- ============================================== -->
        <div id="modal-record-expense" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 animate-fadeIn">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                    <div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-hand-coin-line text-emerald-600"></i>
                            Catat Beban Pengeluaran
                        </h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Otomatisasi pembukuan beban operasional cloud.</p>
                    </div>
                    <button type="button" class="btn-close-expense-modal text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <i class="ri-close-line text-xl"></i>
                    </button>
                </div>

                <form id="form-record-expense" class="space-y-4">
                    <input type="hidden" id="exp-asset-id" value="">

                    <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aset Langganan</p>
                        <h4 id="exp-asset-name" class="font-bold text-slate-900 dark:text-white text-sm mt-0.5"></h4>
                        <span id="exp-asset-provider" class="text-xs text-primary-600 dark:text-primary-400 font-semibold"></span>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Tanggal Pembayaran *</label>
                        <input type="date" id="exp-tgl-bayar" required
                               class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Nominal Dibayar (IDR) *</label>
                        <input type="number" step="0.01" id="exp-jumlah-idr" required
                               class="w-full px-3.5 py-2.5 font-mono font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500">
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Kanal / Rekening Kasir</label>
                        <select id="exp-payment-method" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                            <option value="">-- Pilih Kanal Pembayaran --</option>
                        </select>
                    </div>

                    <!-- Pilihan Majukan Tanggal Jatuh Tempo -->
                    <div class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
                        <input type="checkbox" id="exp-auto-advance" checked class="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4">
                        <label for="exp-auto-advance" class="text-xs text-emerald-900 dark:text-emerald-200 cursor-pointer">
                            <span class="font-bold">Perpanjang Otomatis Jatuh Tempo (+1 Siklus)</span>
                            <p class="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                                Tanggal perpanjangan aset akan otomatis dimajukan ke periode berikutnya dan status dialihkan menjadi Aktif.
                            </p>
                        </label>
                    </div>

                    <!-- Actions -->
                    <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                        <button type="button" class="btn-close-expense-modal px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition">
                            Batal
                        </button>
                        <button type="submit" id="btn-submit-expense" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition inline-flex items-center gap-2">
                            <i class="ri-check-line"></i>
                            Catat Pengeluaran
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Bind Event Handlers
    bindEvents();

    // Load Initial Data
    await Promise.all([
        loadAssets(),
        loadAuxiliaryData()
    ]);
}

/**
 * Load Assets List & KPI from API
 */
async function loadAssets() {
    state.isLoading = true;
    const query = new URLSearchParams();
    if (state.search) query.append('search', state.search);
    if (state.kategori) query.append('kategori', state.kategori);
    if (state.status) query.append('status', state.status);
    if (state.provider) query.append('provider', state.provider);
    if (state.expiring_soon) query.append('expiring_soon', '1');

    try {
        const res = await App.api(`company-assets?${query.toString()}`);
        if (res && res.success) {
            state.items = res.data.items || [];
            state.kpi = res.data.kpi || {};
            state.providers = res.data.providers || [];

            renderKpi();
            renderTable();
            populateProviderFilter();
        } else {
            App.toast(res?.message || 'Gagal memuat data aset', 'error');
        }
    } catch (err) {
        App.toast(err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
        state.isLoading = false;
    }
}

/**
 * Load Auxiliary dropdowns (Users, Projects, Payment Methods)
 */
async function loadAuxiliaryData() {
    try {
        const [usersRes, pmRes] = await Promise.all([
            App.api('users'),
            App.api('bank-accounts')
        ]);

        if (usersRes && usersRes.success) {
            state.users = usersRes.data || [];
            populatePicDropdown();
        }

        if (pmRes && pmRes.success) {
            state.paymentMethods = pmRes.data || [];
            populatePaymentMethodDropdown();
        }
    } catch (e) {}
}

/**
 * Render KPI Cards
 */
function renderKpi() {
    const k = state.kpi;
    const container = document.getElementById('asset-kpi-container');
    if (!container) return;

    container.innerHTML = `
        <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Aset Dikelola</p>
                <h3 class="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">${k.total_assets || 0}</h3>
                <span class="text-[10px] text-slate-400 mt-0.5 inline-block">${k.safe_count || 0} layanan berstatus aman</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl flex-shrink-0">
                <i class="ri-server-line"></i>
            </div>
        </div>

        <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estimasi Biaya Bulanan</p>
                <h3 class="text-lg font-black text-slate-900 dark:text-white mt-1 font-mono">${App.formatRupiah(k.monthly_burn || 0)}</h3>
                <span class="text-[10px] text-slate-400 mt-0.5 inline-block font-mono">Tahunan: ${App.formatRupiah(k.yearly_burn || 0)}</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl flex-shrink-0">
                <i class="ri-money-dollar-circle-line"></i>
            </div>
        </div>

        <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
                <p class="text-[11px] font-bold uppercase tracking-wider text-amber-500">Segera Kedaluwarsa (≤30 Hari)</p>
                <h3 class="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">${k.soon_count || 0}</h3>
                <span class="text-[10px] text-slate-400 mt-0.5 inline-block">Memerlukan perhatian perpanjangan</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl flex-shrink-0">
                <i class="ri-time-line"></i>
            </div>
        </div>

        <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
                <p class="text-[11px] font-bold uppercase tracking-wider text-rose-500">Kedaluwarsa / Kritis</p>
                <h3 class="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">${k.expired_count || 0}</h3>
                <span class="text-[10px] text-slate-400 mt-0.5 inline-block">Layanan telah lewat jatuh tempo</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl flex-shrink-0">
                <i class="ri-alarm-warning-line"></i>
            </div>
        </div>
    `;
}

/**
 * Render Table Rows
 */
function renderTable() {
    const tbody = document.getElementById('asset-tbody');
    if (!tbody) return;

    if (state.items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-12 text-center text-slate-400">
                    <i class="ri-cloud-off-line text-3xl mb-2 text-slate-300 dark:text-slate-600 inline-block"></i>
                    <p class="text-sm font-medium">Tidak ada aset atau langganan cloud yang ditemukan.</p>
                    <button onclick="document.getElementById('btn-add-asset').click()" class="mt-3 px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-semibold">
                        Tambah Aset Pertama
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = state.items.map(a => {
        const catCfg = KATEGORI_CONFIG[a.kategori] || KATEGORI_CONFIG.lainnya;
        const sisaHari = parseInt(a.sisa_hari, 10);

        // Status Badge Styling
        let statusBadge = '';
        if (a.status === 'kadaluwarsa' || sisaHari < 0) {
            statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 inline-flex items-center gap-1">
                <i class="ri-close-circle-line"></i> Kedaluwarsa (${Math.abs(sisaHari)}h lalu)
            </span>`;
        } else if (a.status === 'segera_kadaluwarsa' || sisaHari <= 30) {
            statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 inline-flex items-center gap-1">
                <i class="ri-time-line"></i> Sisa ${sisaHari} Hari
            </span>`;
        } else if (a.status === 'aktif') {
            statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 inline-flex items-center gap-1">
                <i class="ri-checkbox-circle-line"></i> Aktif (${sisaHari}h lagi)
            </span>`;
        } else {
            statusBadge = `<span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                ${App.escapeHtml(a.status)}
            </span>`;
        }

        // Biaya formatting
        const formattedOri = a.mata_uang === 'IDR'
            ? App.formatRupiah(a.biaya)
            : `${a.mata_uang} ${parseFloat(a.biaya).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

        return `
            <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <!-- Aset & Provider -->
                <td class="py-4 px-6">
                    <div class="flex items-start gap-3">
                        <div class="w-9 h-9 rounded-xl border flex items-center justify-center text-base flex-shrink-0 ${catCfg.color}">
                            <i class="${catCfg.icon}"></i>
                        </div>
                        <div>
                            <div class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>${App.escapeHtml(a.nama_aset)}</span>
                                ${a.url_portal ? `<a href="${App.escapeHtml(a.url_portal)}" target="_blank" rel="noopener" class="text-slate-400 hover:text-primary-600 text-xs" title="Buka Portal Provider"><i class="ri-external-link-line"></i></a>` : ''}
                            </div>
                            <div class="flex flex-wrap items-center gap-1.5 mt-1">
                                <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-[10px] text-slate-700 dark:text-slate-300">
                                    ${App.escapeHtml(a.provider)}
                                </span>
                                <span class="text-[10px] text-slate-400">${catCfg.label}</span>
                            </div>
                        </div>
                    </div>
                </td>

                <!-- Identifikasi & Lokasi -->
                <td class="py-4 px-6 text-xs font-mono">
                    <div class="font-bold text-slate-800 dark:text-slate-200">
                        ${a.identifier ? App.escapeHtml(a.identifier) : '<span class="text-slate-400 font-sans">-</span>'}
                    </div>
                    <div class="text-[11px] text-slate-400 mt-0.5">
                        ${a.region ? `<i class="ri-map-pin-line text-[10px] mr-0.5"></i> ${App.escapeHtml(a.region)}` : ''}
                    </div>
                </td>

                <!-- Biaya & Siklus -->
                <td class="py-4 px-6 font-mono">
                    <div class="font-bold text-slate-900 dark:text-white">
                        ${App.formatRupiah(a.biaya_idr)}
                    </div>
                    <div class="text-[11px] text-slate-400">
                        ${a.mata_uang !== 'IDR' ? `(${formattedOri}) · ` : ''}
                        <span class="capitalize font-sans">${App.escapeHtml(a.siklus)}</span>
                    </div>
                </td>

                <!-- Tanggal Berakhir & Countdown -->
                <td class="py-4 px-6 font-mono text-xs">
                    <div class="font-bold text-slate-800 dark:text-slate-200">
                        ${App.formatDate(a.tanggal_berakhir)}
                    </div>
                    <div class="text-[10px] text-slate-400 mt-0.5 font-sans">
                        ${a.auto_renew == 1 ? '<i class="ri-refresh-line text-emerald-500"></i> Auto-Renew Aktif' : 'Manual Renew'}
                    </div>
                </td>

                <!-- Status -->
                <td class="py-4 px-6">
                    ${statusBadge}
                </td>

                <!-- Aksi -->
                <td class="py-4 px-6 text-right">
                    <div class="inline-flex items-center gap-1.5">
                        <button onclick="window.openRecordExpense(${a.id})" 
                                class="p-2 text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl transition inline-flex items-center gap-1 text-xs font-semibold"
                                title="Catat Biaya ke Pengeluaran Operasional (1-Click)">
                            <i class="ri-hand-coin-line text-sm"></i>
                            <span class="hidden sm:inline">Catat Beban</span>
                        </button>
                        <button onclick="window.editAsset(${a.id})" 
                                class="p-2 text-slate-600 hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400 bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-950/50 rounded-xl transition" 
                                title="Ubah Rincian Aset">
                            <i class="ri-edit-line text-sm"></i>
                        </button>
                        <button onclick="window.deleteAsset(${a.id}, '${App.escapeHtml(a.nama_aset)}')" 
                                class="p-2 text-red-600 hover:text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-xl transition" 
                                title="Hapus Aset">
                            <i class="ri-delete-bin-line text-sm"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Populate Provider Filter Options
 */
function populateProviderFilter() {
    const sel = document.getElementById('asset-filter-provider');
    if (!sel) return;
    const current = state.provider;
    sel.innerHTML = '<option value="">Semua Provider</option>' +
        state.providers.map(p => `<option value="${App.escapeHtml(p)}" ${current === p ? 'selected' : ''}>${App.escapeHtml(p)}</option>`).join('');
}

/**
 * Populate PIC dropdown in modal
 */
function populatePicDropdown() {
    const sel = document.getElementById('form-asset-pic');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Pilih Staf Penanggung Jawab --</option>' +
        state.users.map(u => `<option value="${u.id}">${App.escapeHtml(u.nama_lengkap)} (@${App.escapeHtml(u.username)})</option>`).join('');
}

/**
 * Populate Payment Method dropdown in expense modal
 */
function populatePaymentMethodDropdown() {
    const sel = document.getElementById('exp-payment-method');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Pilih Kanal Pembayaran --</option>' +
        state.paymentMethods.map(pm => `<option value="${pm.id}">${App.escapeHtml(pm.nama_metode)} (${App.escapeHtml(pm.nomor_rekening || '-')})</option>`).join('');
}

/**
 * Recalculate IDR Preview in Add/Edit modal
 */
function updateIdrPreview() {
    const biaya = parseFloat(document.getElementById('form-asset-biaya')?.value || 0);
    const mataUang = document.getElementById('form-asset-matauang')?.value || 'IDR';
    const kurs = parseFloat(document.getElementById('form-asset-kurs')?.value || 1);

    const total = mataUang === 'IDR' ? biaya : Math.round(biaya * kurs);
    const label = document.getElementById('form-asset-preview-idr');
    if (label) {
        label.textContent = App.formatRupiah(total);
    }
}

/**
 * Bind DOM Event Handlers
 */
function bindEvents() {
    // Filter Handlers
    document.getElementById('asset-filter-search')?.addEventListener('input', App.debounce((e) => {
        state.search = e.target.value.trim();
        loadAssets();
    }, 350));

    document.getElementById('asset-filter-kategori')?.addEventListener('change', (e) => {
        state.kategori = e.target.value;
        loadAssets();
    });

    document.getElementById('asset-filter-status')?.addEventListener('change', (e) => {
        state.status = e.target.value;
        loadAssets();
    });

    document.getElementById('asset-filter-provider')?.addEventListener('change', (e) => {
        state.provider = e.target.value;
        loadAssets();
    });

    // Modals Open/Close
    const modalForm = document.getElementById('modal-asset-form');
    document.getElementById('btn-add-asset')?.addEventListener('click', () => {
        openAssetModal();
    });
    document.querySelectorAll('.btn-close-asset-modal').forEach(b => {
        b.addEventListener('click', () => modalForm.classList.add('hidden'));
    });

    const modalExpense = document.getElementById('modal-record-expense');
    document.querySelectorAll('.btn-close-expense-modal').forEach(b => {
        b.addEventListener('click', () => modalExpense.classList.add('hidden'));
    });

    // Auto-compute IDR conversion on input changes
    document.getElementById('form-asset-biaya')?.addEventListener('input', updateIdrPreview);
    document.getElementById('form-asset-matauang')?.addEventListener('change', (e) => {
        const kursInput = document.getElementById('form-asset-kurs');
        if (e.target.value === 'IDR') {
            if (kursInput) kursInput.value = '1';
        } else if (e.target.value === 'USD') {
            if (kursInput && kursInput.value === '1') kursInput.value = '16200';
        } else if (e.target.value === 'EUR') {
            if (kursInput) kursInput.value = '17400';
        } else if (e.target.value === 'SGD') {
            if (kursInput) kursInput.value = '12200';
        }
        updateIdrPreview();
    });
    document.getElementById('form-asset-kurs')?.addEventListener('input', updateIdrPreview);

    // Save Asset Submit
    document.getElementById('form-asset')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('btn-save-asset');
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="ri-loader-4-line animate-spin"></i> Menyimpan...`;

        const id = document.getElementById('form-asset-id').value;
        const payload = {
            nama_aset: document.getElementById('form-asset-nama').value.trim(),
            provider: document.getElementById('form-asset-provider').value.trim(),
            kategori: document.getElementById('form-asset-kategori').value,
            identifier: document.getElementById('form-asset-identifier').value.trim(),
            region: document.getElementById('form-asset-region').value.trim(),
            url_portal: document.getElementById('form-asset-url').value.trim(),
            spesifikasi: document.getElementById('form-asset-spek').value.trim(),
            biaya: parseFloat(document.getElementById('form-asset-biaya').value || 0),
            mata_uang: document.getElementById('form-asset-matauang').value,
            kurs_estimasi: parseFloat(document.getElementById('form-asset-kurs').value || 1),
            siklus: document.getElementById('form-asset-siklus').value,
            tanggal_mulai: document.getElementById('form-asset-tgl-mulai').value,
            tanggal_berakhir: document.getElementById('form-asset-tgl-akhir').value,
            metode_bayar: document.getElementById('form-asset-metode').value.trim(),
            pic_user_id: document.getElementById('form-asset-pic').value || null,
            status: document.getElementById('form-asset-status').value,
            auto_renew: document.getElementById('form-asset-autorenew').checked ? 1 : 0,
            catatan: document.getElementById('form-asset-catatan').value.trim()
        };

        try {
            const res = id
                ? await App.api(`company-assets/${id}`, { method: 'PUT', body: payload })
                : await App.api('company-assets', { method: 'POST', body: payload });

            if (res && res.success) {
                App.toast(res.message || 'Data aset berhasil disimpan', 'success');
                modalForm.classList.add('hidden');
                await loadAssets();
            } else {
                App.toast(res?.message || 'Gagal menyimpan aset', 'error');
            }
        } catch (err) {
            App.toast(err.message || 'Terjadi kesalahan sistem', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="ri-save-line"></i> Simpan Aset`;
        }
    });

    // Record Expense Submit
    document.getElementById('form-record-expense')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-submit-expense');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="ri-loader-4-line animate-spin"></i> Menyimpan...`;

        const assetId = document.getElementById('exp-asset-id').value;
        const payload = {
            action: 'record-expense',
            tanggal_bayar: document.getElementById('exp-tgl-bayar').value,
            jumlah_idr: parseFloat(document.getElementById('exp-jumlah-idr').value || 0),
            payment_method_id: document.getElementById('exp-payment-method').value || null,
            auto_advance_renewal: document.getElementById('exp-auto-advance').checked
        };

        try {
            const res = await App.api(`company-assets/${assetId}/record-expense`, {
                method: 'POST',
                body: payload
            });

            if (res && res.success) {
                App.toast(res.message || 'Pengeluaran berhasil dicatat ke pembukuan beban operasional!', 'success');
                modalExpense.classList.add('hidden');
                await loadAssets();
            } else {
                App.toast(res?.message || 'Gagal mencatat pengeluaran', 'error');
            }
        } catch (err) {
            App.toast(err.message || 'Terjadi kesalahan sistem saat mencatat beban', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="ri-check-line"></i> Catat Pengeluaran`;
        }
    });

    // Window global handlers
    window.editAsset = (id) => {
        const a = state.items.find(x => x.id == id);
        if (a) openAssetModal(a);
    };

    window.openRecordExpense = (id) => {
        const a = state.items.find(x => x.id == id);
        if (!a) return;

        document.getElementById('exp-asset-id').value = a.id;
        document.getElementById('exp-asset-name').textContent = a.nama_aset;
        document.getElementById('exp-asset-provider').textContent = `${a.provider} · Siklus: ${a.siklus}`;
        document.getElementById('exp-tgl-bayar').value = new Date().toISOString().split('T')[0];
        document.getElementById('exp-jumlah-idr').value = a.biaya_idr;
        document.getElementById('exp-auto-advance').checked = true;

        modalExpense.classList.remove('hidden');
    };

    window.deleteAsset = async (id, name) => {
        const conf = await App.confirm(
            'Hapus Pencatatan Aset?',
            `Apakah Anda yakin ingin menghapus aset "${name}"? Tindakan ini tidak dapat dibatalkan.`
        );
        if (!conf) return;

        try {
            const res = await App.api(`company-assets/${id}`, { method: 'DELETE' });
            if (res && res.success) {
                App.toast('Aset berhasil dihapus', 'success');
                await loadAssets();
            } else {
                App.toast(res?.message || 'Gagal menghapus aset', 'error');
            }
        } catch (err) {
            App.toast(err.message || 'Terjadi kesalahan saat menghapus aset', 'error');
        }
    };
}

/**
 * Open Modal Form for Create or Edit
 */
function openAssetModal(asset = null) {
    const modal = document.getElementById('modal-asset-form');
    const title = document.getElementById('modal-asset-title');

    document.getElementById('form-asset-id').value = asset ? asset.id : '';
    document.getElementById('form-asset-nama').value = asset ? asset.nama_aset : '';
    document.getElementById('form-asset-provider').value = asset ? asset.provider : '';
    document.getElementById('form-asset-kategori').value = asset ? asset.kategori : 'cloud_vps';
    document.getElementById('form-asset-identifier').value = asset ? (asset.identifier || '') : '';
    document.getElementById('form-asset-region').value = asset ? (asset.region || '') : '';
    document.getElementById('form-asset-url').value = asset ? (asset.url_portal || '') : '';
    document.getElementById('form-asset-spek').value = asset ? (asset.spesifikasi || '') : '';
    document.getElementById('form-asset-biaya').value = asset ? asset.biaya : '0';
    document.getElementById('form-asset-matauang').value = asset ? asset.mata_uang : 'IDR';
    document.getElementById('form-asset-kurs').value = asset ? asset.kurs_estimasi : '1';
    document.getElementById('form-asset-siklus').value = asset ? asset.siklus : 'bulanan';
    document.getElementById('form-asset-tgl-mulai').value = asset ? asset.tanggal_mulai : new Date().toISOString().split('T')[0];
    
    // Default tanggal berakhir: 1 bulan dari sekarang jika baru
    if (asset) {
        document.getElementById('form-asset-tgl-akhir').value = asset.tanggal_berakhir;
    } else {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        document.getElementById('form-asset-tgl-akhir').value = d.toISOString().split('T')[0];
    }

    document.getElementById('form-asset-metode').value = asset ? (asset.metode_bayar || '') : '';
    document.getElementById('form-asset-pic').value = asset ? (asset.pic_user_id || '') : '';
    document.getElementById('form-asset-status').value = asset ? asset.status : 'aktif';
    document.getElementById('form-asset-autorenew').checked = asset ? (asset.auto_renew == 1) : true;
    document.getElementById('form-asset-catatan').value = asset ? (asset.catatan || '') : '';

    title.innerHTML = asset
        ? `<i class="ri-edit-line text-primary-600"></i> Ubah Aset / Langganan Cloud`
        : `<i class="ri-cloud-line text-primary-600"></i> Tambah Aset &amp; Langganan Cloud`;

    updateIdrPreview();
    modal.classList.remove('hidden');
}
