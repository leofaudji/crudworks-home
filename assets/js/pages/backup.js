// assets/js/pages/backup.js
// Modul Cadangan & Pemulihan Database (Backup & Restore)
import { App } from '../app.js';

let state = {
    activeTab: 'backups', // 'backups' | 'tables'
    overview: null,
    tables: [],
    backups: [],
    searchBackup: '',
    searchTable: '',
    isLoading: false
};

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header Section -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                        <i class="ri-database-2-line text-primary-600 dark:text-primary-400"></i>
                        Cadangan & Pemulihan Database
                    </h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Pencadangan berkala data MySQL, arsip berkas SQL terkompresi, dan pemulihan darurat sistem.
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-2.5">
                    <button id="btn-open-restore-modal" class="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold shadow-xs transition inline-flex items-center gap-2">
                        <i class="ri-upload-cloud-2-line text-amber-500 text-sm"></i>
                        Unggah & Pulihkan
                    </button>
                    <button id="btn-open-backup-modal" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-xs transition inline-flex items-center gap-2">
                        <i class="ri-save-3-line text-sm"></i>
                        Cadangkan Sekarang
                    </button>
                </div>
            </div>

            <!-- 2-Column Enterprise Layout (ala Pengaturan Sistem) -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <!-- Left Navigation -->
                <aside class="lg:col-span-4 xl:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-2.5 shadow-2xs space-y-1">
                    <button type="button" class="backup-tab w-full text-left px-3.5 py-3 rounded-2xl transition flex items-center gap-3 ${state.activeTab === 'backups' ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 ring-1 ring-primary-200/70 dark:ring-primary-800/60' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}" data-tab="backups">
                        <div class="w-9 h-9 rounded-xl ${state.activeTab === 'backups' ? 'bg-white dark:bg-slate-900 shadow-2xs' : 'bg-slate-100 dark:bg-slate-800'} flex items-center justify-center shrink-0">
                            <i class="ri-folder-zip-line text-base text-primary-600"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="text-xs font-bold truncate">Berkas Cadangan (<span id="count-badge-backups">0</span>)</div>
                            <div class="text-[11px] opacity-75 truncate">Arsip .sql &amp; .sql.gz</div>
                        </div>
                    </button>
                    <button type="button" class="backup-tab w-full text-left px-3.5 py-3 rounded-2xl transition flex items-center gap-3 ${state.activeTab === 'tables' ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 ring-1 ring-primary-200/70 dark:ring-primary-800/60' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}" data-tab="tables">
                        <div class="w-9 h-9 rounded-xl ${state.activeTab === 'tables' ? 'bg-white dark:bg-slate-900 shadow-2xs' : 'bg-slate-100 dark:bg-slate-800'} flex items-center justify-center shrink-0">
                            <i class="ri-table-line text-base text-emerald-600"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="text-xs font-bold truncate">Struktur Tabel (<span id="count-badge-tables">0</span>)</div>
                            <div class="text-[11px] opacity-75 truncate">Engine, baris &amp; ukuran</div>
                        </div>
                    </button>
                    <button type="button" class="backup-tab w-full text-left px-3.5 py-3 rounded-2xl transition flex items-center gap-3 ${state.activeTab === 'overview' ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 ring-1 ring-primary-200/70 dark:ring-primary-800/60' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}" data-tab="overview">
                        <div class="w-9 h-9 rounded-xl ${state.activeTab === 'overview' ? 'bg-white dark:bg-slate-900 shadow-2xs' : 'bg-slate-100 dark:bg-slate-800'} flex items-center justify-center shrink-0">
                            <i class="ri-hard-drive-2-line text-base text-indigo-600"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="text-xs font-bold truncate">Ringkasan Server DB</div>
                            <div class="text-[11px] opacity-75 truncate">Kapasitas &amp; cadangan akhir</div>
                        </div>
                    </button>
                </aside>

                <!-- Right Content Panel -->
                <div class="lg:col-span-8 xl:col-span-9 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xs overflow-hidden min-w-0">
                    <div id="backup-toolbar" class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 ${state.activeTab === 'overview' ? 'hidden' : ''}">
                        <div class="min-w-0">
                            <h2 id="backup-panel-title" class="text-sm font-bold text-slate-900 dark:text-white truncate">${state.activeTab === 'tables' ? 'Struktur Tabel Database' : 'Berkas Cadangan Tersimpan'}</h2>
                            <p id="backup-panel-sub" class="text-[11px] text-slate-400 truncate">${state.activeTab === 'tables' ? 'Daftar tabel, engine, jumlah baris & ukuran penyimpanan' : 'Unduh, pulihkan, atau hapus arsip SQL dari server'}</p>
                        </div>
                        <button id="btn-refresh-backup" class="px-3.5 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition shrink-0" title="Muat Ulang Data">
                            <i class="ri-refresh-line"></i><span>Segarkan</span>
                        </button>
                    </div>

                    <!-- Tab 1: Backups List Content -->
                    <div id="tab-content-backups" class="${state.activeTab === 'backups' ? '' : 'hidden'}">
                        <div class="overflow-x-auto">
                            <table class="data-table w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr class="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        <th class="py-3 pl-5 pr-3 whitespace-nowrap">Nama Berkas</th>
                                        <th class="py-3 px-3 whitespace-nowrap">Tipe</th>
                                        <th class="py-3 px-3 whitespace-nowrap">Ukuran</th>
                                        <th class="py-3 px-3 whitespace-nowrap">Dibuat</th>
                                        <th class="py-3 pl-3 pr-5 text-right whitespace-nowrap">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody id="backups-tbody" class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                    <tr>
                                        <td colspan="5" class="py-12 text-center text-slate-400">
                                            <i class="ri-loader-4-line text-2xl animate-spin mb-2 inline-block"></i>
                                            <p>Memuat daftar berkas cadangan...</p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Tab 2: Tables List Content -->
                    <div id="tab-content-tables" class="${state.activeTab === 'tables' ? '' : 'hidden'}">
                        <div class="overflow-x-auto">
                            <table class="data-table w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr class="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        <th class="py-3 pl-5 pr-3 whitespace-nowrap">Nama Tabel</th>
                                        <th class="py-3 px-3 whitespace-nowrap">Engine</th>
                                        <th class="py-3 px-3 font-mono whitespace-nowrap">Baris</th>
                                        <th class="py-3 px-3 font-mono whitespace-nowrap">Data</th>
                                        <th class="py-3 px-3 font-mono whitespace-nowrap">Indeks</th>
                                        <th class="py-3 pl-3 pr-5 font-mono whitespace-nowrap">Total</th>
                                    </tr>
                                </thead>
                                <tbody id="tables-tbody" class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                    <tr>
                                        <td colspan="6" class="py-12 text-center text-slate-400">
                                            <i class="ri-loader-4-line text-2xl animate-spin mb-2 inline-block"></i>
                                            <p>Memuat struktur tabel...</p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Tab 3: Server Overview Stats -->
                    <div id="tab-content-overview" class="p-6 ${state.activeTab === 'overview' ? '' : 'hidden'}">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4" id="backup-stats-container">
                            <div class="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse">
                                <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-3"></div>
                                <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                            </div>
                            <div class="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse">
                                <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-3"></div>
                                <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ============================================== -->
        <!-- MODAL 1: BUAT CADANGAN BARU                    -->
        <!-- ============================================== -->
        <div id="modal-create-backup" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 animate-fadeIn">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                    <div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-database-2-line text-primary-600"></i>
                            Cadangkan Database Baru
                        </h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ekspor skema dan seluruh baris data ke format SQL.</p>
                    </div>
                    <button type="button" class="btn-close-backup-modal text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <i class="ri-close-line text-xl"></i>
                    </button>
                </div>

                <form id="form-create-backup" class="space-y-4">
                    <!-- Pilihan Tipe Cadangan -->
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">Cakupan Cadangan *</label>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label class="relative flex flex-col p-3.5 border border-primary-500/80 bg-primary-50/50 dark:bg-primary-950/30 rounded-2xl cursor-pointer transition">
                                <input type="radio" name="backup_type" value="full" checked class="sr-only backup-type-radio">
                                <div class="flex items-center gap-2 font-bold text-xs text-primary-900 dark:text-primary-200">
                                    <i class="ri-stack-line text-base text-primary-600"></i>
                                    Penuh (Disarankan)
                                </div>
                                <span class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Struktur tabel dan seluruh baris transaksi.</span>
                            </label>
                            <label class="relative flex flex-col p-3.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 rounded-2xl cursor-pointer hover:border-slate-300 transition">
                                <input type="radio" name="backup_type" value="structure_only" class="sr-only backup-type-radio">
                                <div class="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200">
                                    <i class="ri-code-box-line text-base text-slate-500"></i>
                                    Struktur Saja (DDL)
                                </div>
                                <span class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Hanya skema tabel kosong tanpa data.</span>
                            </label>
                        </div>
                    </div>

                    <!-- Pilihan Kompresi Gzip -->
                    <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                        <input type="checkbox" id="backup-compress" checked class="mt-0.5 rounded text-primary-600 focus:ring-primary-500 h-4 w-4">
                        <label for="backup-compress" class="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                            <span class="font-bold">Kompresi Gzip (.sql.gz)</span>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Mengompresi berkas hingga 85% lebih hemat ruang penyimpanan disk server.</p>
                        </label>
                    </div>

                    <!-- Catatan Tambahan -->
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Catatan Cadangan (Opsional)</label>
                        <input type="text" id="backup-note" placeholder="Contoh: Sebelum migrasi modul finansial bulanan"
                               class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                    </div>

                    <!-- Actions -->
                    <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                        <button type="button" class="btn-close-backup-modal px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition">
                            Batal
                        </button>
                        <button type="submit" id="btn-submit-backup" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-xs transition inline-flex items-center gap-2">
                            <i class="ri-play-line"></i>
                            Mulai Cadangkan
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ============================================== -->
        <!-- MODAL 2: UNGGAH & PULIHKAN (RESTORE)           -->
        <!-- ============================================== -->
        <div id="modal-restore-backup" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 animate-fadeIn">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                    <div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-upload-cloud-2-line text-amber-500"></i>
                            Pulihkan Database (Restore)
                        </h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Unggah berkas .sql atau .sql.gz untuk mengembalikan data.</p>
                    </div>
                    <button type="button" class="btn-close-restore-modal text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <i class="ri-close-line text-xl"></i>
                    </button>
                </div>

                <!-- Peringatan Keamanan -->
                <div class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3 mb-4">
                    <i class="ri-error-warning-fill text-amber-500 text-lg mt-0.5 flex-shrink-0"></i>
                    <div class="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                        <span class="font-bold">PERINGATAN KRITIS:</span>
                        Pemulihan akan menimpa struktur dan isi tabel saat ini dengan data yang ada di dalam berkas cadangan. Pastikan Anda telah membuat cadangan terbaru sebelum melanjutkan.
                    </div>
                </div>

                <form id="form-restore-backup" class="space-y-4">
                    <!-- Dropzone File Upload -->
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">Pilih Berkas Cadangan (.sql / .sql.gz) *</label>
                        <div id="restore-dropzone" class="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 dark:bg-slate-800/40 transition">
                            <i class="ri-file-upload-line text-3xl text-slate-400 mb-2 inline-block"></i>
                            <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">Klik untuk memilih berkas atau seret ke sini</p>
                            <p class="text-[11px] text-slate-400 mt-1">Mendukung format SQL mentah (.sql) atau Gzip (.sql.gz)</p>
                            <div id="restore-file-info" class="hidden mt-3 p-2 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/50 rounded-xl text-xs font-mono text-primary-700 dark:text-primary-300"></div>
                            <input type="file" id="restore-file-input" accept=".sql,.gz" class="hidden">
                        </div>
                    </div>

                    <!-- Konfirmasi Checkbox -->
                    <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
                        <input type="checkbox" id="restore-agreement" required class="mt-0.5 rounded text-amber-600 focus:ring-amber-500 h-4 w-4">
                        <label for="restore-agreement" class="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                            Saya memahami konsekuensi pemulihan ini dan menyetujui penimpaan data aktif basis data.
                        </label>
                    </div>

                    <!-- Actions -->
                    <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                        <button type="button" class="btn-close-restore-modal px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition">
                            Batal
                        </button>
                        <button type="submit" id="btn-submit-restore" class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition inline-flex items-center gap-2">
                            <i class="ri-restart-line"></i>
                            Mulai Pemulihan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Bind Event Listeners
    bindEvents();

    // Initial Load Data
    await loadBackupData();
}

/**
 * Load overview, tables, and backups from API
 */
async function loadBackupData() {
    state.isLoading = true;
    try {
        const res = await App.api('backup');
        if (res && res.success) {
            state.overview = res.data.overview;
            state.tables = res.data.tables || [];
            state.backups = res.data.backups || [];

            renderOverview();
            renderBackupsTable();
            renderTablesTable();
        } else {
            App.toast(res?.message || 'Gagal memuat data cadangan', 'error');
        }
    } catch (err) {
        App.toast(err.message || 'Terjadi kesalahan sistem saat memuat cadangan', 'error');
    } finally {
        state.isLoading = false;
    }
}

/**
 * Render Stat Cards
 */
function renderOverview() {
    const o = state.overview;
    if (!o) return;

    document.getElementById('count-badge-backups').textContent = state.backups.length;
    document.getElementById('count-badge-tables').textContent = state.tables.length;

    const container = document.getElementById('backup-stats-container');
    container.innerHTML = `
        <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nama Basis Data</p>
                <h3 class="text-lg font-black text-slate-900 dark:text-white mt-1 font-mono">${App.escapeHtml(o.database_name)}</h3>
                <span class="text-[10px] text-slate-400 mt-0.5 inline-block font-mono">Engine ${App.escapeHtml(o.database_version)}</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl flex-shrink-0">
                <i class="ri-database-line"></i>
            </div>
        </div>

        <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Ukuran Data</p>
                <h3 class="text-lg font-black text-slate-900 dark:text-white mt-1 font-mono">${App.escapeHtml(o.total_size)}</h3>
                <span class="text-[10px] text-slate-400 mt-0.5 inline-block">${o.table_count} Tabel Master & Transaksi</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl flex-shrink-0">
                <i class="ri-hard-drive-2-line"></i>
            </div>
        </div>

        <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Rekam Baris</p>
                <h3 class="text-lg font-black text-slate-900 dark:text-white mt-1 font-mono">${App.formatNumber(o.total_records)}</h3>
                <span class="text-[10px] text-slate-400 mt-0.5 inline-block">Seluruh entitas database</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl flex-shrink-0">
                <i class="ri-file-list-3-line"></i>
            </div>
        </div>

        <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cadangan Terakhir</p>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white mt-1 font-mono">
                    ${o.last_backup ? App.formatDateTime(o.last_backup) : 'Belum Pernah'}
                </h3>
                <span class="text-[10px] text-slate-400 mt-0.5 inline-block">${o.backup_count} berkas tersimpan di server</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl flex-shrink-0">
                <i class="ri-history-line"></i>
            </div>
        </div>
    `;
}

/**
 * Render Backups Table
 */
function renderBackupsTable() {
    const tbody = document.getElementById('backups-tbody');
    let list = state.backups;

    if (state.searchBackup.trim()) {
        const q = state.searchBackup.toLowerCase();
        list = list.filter(b => b.filename.toLowerCase().includes(q) || b.created_at.includes(q));
    }

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-12 text-center text-slate-400">
                    <i class="ri-folder-zip-line text-3xl mb-2 text-slate-300 dark:text-slate-600 inline-block"></i>
                    <p class="text-sm font-medium">Belum ada berkas cadangan database yang tersimpan.</p>
                    <button onclick="document.getElementById('btn-open-backup-modal').click()" class="mt-3 px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-semibold">
                        Buat Cadangan Pertama Sekarang
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map(b => {
        const isGz = b.is_compressed;
        const iconColor = isGz ? 'text-amber-500' : 'text-blue-500';
        const fileIcon = isGz ? 'ri-file-zip-line' : 'ri-file-code-line';

        return `
            <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <td class="py-3.5 pl-5 pr-3 align-middle max-w-[230px]">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <i class="${fileIcon} ${iconColor} text-base shrink-0"></i>
                        <div class="min-w-0">
                            <span class="block font-mono font-medium text-slate-800 dark:text-slate-100 truncate" title="${App.escapeHtml(b.filename)}">${App.escapeHtml(b.filename)}</span>
                            ${isGz ? '<span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-semibold">Terkompresi Gzip</span>' : ''}
                        </div>
                    </div>
                </td>
                <td class="py-3.5 px-3 align-middle whitespace-nowrap">
                    <span class="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap ${b.type === 'full' ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/60' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}">
                        ${App.escapeHtml(b.type_label)}
                    </span>
                </td>
                <td class="py-3.5 px-3 align-middle font-mono font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    ${App.escapeHtml(b.size)}
                </td>
                <td class="py-3.5 px-3 align-middle font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    ${App.formatDateTime(b.created_at)}
                </td>
                <td class="py-3.5 pl-3 pr-5 align-middle text-right whitespace-nowrap">
                    <div class="inline-flex items-center gap-1">
                        <a href="api/backup?action=download&file=${encodeURIComponent(b.filename)}" 
                           class="w-8 h-8 text-slate-600 hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400 bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-950/50 rounded-xl transition inline-flex items-center justify-center" 
                           title="Unduh Berkas SQL" aria-label="Unduh Berkas SQL">
                            <i class="ri-download-2-line text-sm"></i>
                        </a>
                        <button type="button" onclick="window.restoreFromServer('${App.escapeHtml(b.filename)}')" 
                                class="w-8 h-8 text-amber-600 hover:text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl transition inline-flex items-center justify-center" 
                                title="Pulihkan Database dari Berkas Ini" aria-label="Pulihkan Database">
                            <i class="ri-restart-line text-sm"></i>
                        </button>
                        <button type="button" onclick="window.deleteBackup('${App.escapeHtml(b.filename)}')" 
                                class="w-8 h-8 text-red-600 hover:text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-xl transition inline-flex items-center justify-center" 
                                title="Hapus Berkas Cadangan" aria-label="Hapus Berkas Cadangan">
                            <i class="ri-delete-bin-line text-sm"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Render Tables Structure Table
 */
function renderTablesTable() {
    const tbody = document.getElementById('tables-tbody');
    let list = state.tables;

    if (state.searchTable.trim()) {
        const q = state.searchTable.toLowerCase();
        list = list.filter(t => t.name.toLowerCase().includes(q));
    }

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-12 text-center text-slate-400">
                    Tidak ditemukan tabel dengan kata kunci "${App.escapeHtml(state.searchTable)}"
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map(t => `
        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
            <td class="py-3.5 pl-5 pr-3 align-middle font-mono font-bold text-slate-800 dark:text-slate-100 max-w-[220px] truncate" title="${App.escapeHtml(t.name)}">
                <i class="ri-table-line text-slate-400 mr-1.5"></i>${App.escapeHtml(t.name)}
            </td>
            <td class="py-3.5 px-3 align-middle font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                ${App.escapeHtml(t.engine)}
            </td>
            <td class="py-3.5 px-3 align-middle font-mono font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                ${App.formatNumber(t.records)}
            </td>
            <td class="py-3.5 px-3 align-middle font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                ${App.escapeHtml(t.data_size)}
            </td>
            <td class="py-3.5 px-3 align-middle font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                ${App.escapeHtml(t.index_size)}
            </td>
            <td class="py-3.5 pl-3 pr-5 align-middle font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                ${App.escapeHtml(t.total_size)}
            </td>
        </tr>
    `).join('');
}

/**
 * Bind DOM Listeners & Actions
 */
function bindEvents() {
    // Tab switching
    document.querySelectorAll('.backup-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            state.activeTab = tab;

            document.querySelectorAll('.backup-tab').forEach(b => {
                const isAct = b.dataset.tab === tab;
                b.className = `backup-tab w-full text-left px-3.5 py-3 rounded-2xl transition flex items-center gap-3 ${isAct ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 ring-1 ring-primary-200/70 dark:ring-primary-800/60' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`;
                const iconBox = b.querySelector('div:first-child');
                if (iconBox) {
                    iconBox.className = `w-9 h-9 rounded-xl ${isAct ? 'bg-white dark:bg-slate-900 shadow-2xs' : 'bg-slate-100 dark:bg-slate-800'} flex items-center justify-center shrink-0`;
                }
            });

            document.getElementById('backup-toolbar')?.classList.toggle('hidden', tab === 'overview');
            const titleEl = document.getElementById('backup-panel-title');
            const subEl = document.getElementById('backup-panel-sub');
            if (titleEl && subEl) {
                titleEl.textContent = tab === 'tables' ? 'Struktur Tabel Database' : 'Berkas Cadangan Tersimpan';
                subEl.textContent = tab === 'tables' ? 'Daftar tabel, engine, jumlah baris & ukuran penyimpanan' : 'Unduh, pulihkan, atau hapus arsip SQL dari server';
            }
            document.getElementById('tab-content-backups')?.classList.toggle('hidden', tab !== 'backups');
            document.getElementById('tab-content-tables')?.classList.toggle('hidden', tab !== 'tables');
            document.getElementById('tab-content-overview')?.classList.toggle('hidden', tab !== 'overview');
        });
    });

    // Search filter
    document.getElementById('backup-search')?.addEventListener('input', (e) => {
        const val = e.target.value;
        if (state.activeTab === 'backups') {
            state.searchBackup = val;
            renderBackupsTable();
        } else {
            state.searchTable = val;
            renderTablesTable();
        }
    });

    // Refresh button
    document.getElementById('btn-refresh-backup')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-refresh-backup');
        btn.innerHTML = `<i class="ri-loader-4-line animate-spin"></i>`;
        await loadBackupData();
        btn.innerHTML = `<i class="ri-refresh-line"></i>`;
        App.toast('Data cadangan berhasil diperbarui', 'info');
    });

    // Open/Close Backup Modal
    const modalBackup = document.getElementById('modal-create-backup');
    document.getElementById('btn-open-backup-modal')?.addEventListener('click', () => {
        modalBackup.classList.remove('hidden');
    });
    document.querySelectorAll('.btn-close-backup-modal').forEach(b => {
        b.addEventListener('click', () => modalBackup.classList.add('hidden'));
    });

    // Radio backup type visual style toggle
    document.querySelectorAll('.backup-type-radio').forEach(r => {
        r.addEventListener('change', () => {
            document.querySelectorAll('.backup-type-radio').forEach(input => {
                const label = input.closest('label');
                if (input.checked) {
                    label.className = 'relative flex flex-col p-3.5 border border-primary-500/80 bg-primary-50/50 dark:bg-primary-950/30 rounded-2xl cursor-pointer transition';
                } else {
                    label.className = 'relative flex flex-col p-3.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 rounded-2xl cursor-pointer hover:border-slate-300 transition';
                }
            });
        });
    });

    // Handle Create Backup Submit
    document.getElementById('form-create-backup')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-backup');
        btn.disabled = true;
        btn.innerHTML = `<i class="ri-loader-4-line animate-spin"></i> Menyiapkan Cadangan...`;

        const typeInput = document.querySelector('input[name="backup_type"]:checked');
        const compressInput = document.getElementById('backup-compress');
        const noteInput = document.getElementById('backup-note');

        const payload = {
            tipe: typeInput ? typeInput.value : 'full',
            compress: compressInput ? compressInput.checked : true,
            catatan: noteInput ? noteInput.value.trim() : ''
        };

        try {
            const res = await App.api('backup', { method: 'POST', body: payload });
            if (res && res.success) {
                App.toast('Cadangan database berhasil dibuat dengan sukses!', 'success');
                modalBackup.classList.add('hidden');
                await loadBackupData();
            } else {
                App.toast(res?.message || 'Gagal membuat cadangan database', 'error');
            }
        } catch (err) {
            App.toast(err.message || 'Terjadi kesalahan sistem saat mencadangkan', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="ri-play-line"></i> Mulai Cadangkan`;
        }
    });

    // Open/Close Restore Modal
    const modalRestore = document.getElementById('modal-restore-backup');
    document.getElementById('btn-open-restore-modal')?.addEventListener('click', () => {
        modalRestore.classList.remove('hidden');
    });
    document.querySelectorAll('.btn-close-restore-modal').forEach(b => {
        b.addEventListener('click', () => modalRestore.classList.add('hidden'));
    });

    // Restore Dropzone & File Input Handling
    const dropzone = document.getElementById('restore-dropzone');
    const fileInput = document.getElementById('restore-file-input');
    const fileInfo = document.getElementById('restore-file-info');

    dropzone?.addEventListener('click', () => fileInput.click());
    dropzone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-primary-500', 'bg-primary-50/30');
    });
    dropzone?.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-primary-500', 'bg-primary-50/30');
    });
    dropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-primary-500', 'bg-primary-50/30');
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect(fileInput.files[0]);
        }
    });

    fileInput?.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFileSelect(fileInput.files[0]);
        }
    });

    function handleFileSelect(file) {
        if (!file) return;
        const isSql = file.name.endsWith('.sql') || file.name.endsWith('.gz');
        if (!isSql) {
            App.toast('Hanya berkas berekstensi .sql atau .sql.gz yang diperbolehkan', 'error');
            fileInput.value = '';
            fileInfo.classList.add('hidden');
            return;
        }

        const sizeFormatted = (file.size / 1024 / 1024).toFixed(2) + ' MB';
        fileInfo.innerHTML = `
            <div class="flex items-center justify-between">
                <span><i class="ri-file-check-line mr-1 text-emerald-500"></i> ${App.escapeHtml(file.name)}</span>
                <span class="font-bold">${sizeFormatted}</span>
            </div>
        `;
        fileInfo.classList.remove('hidden');
    }

    // Handle Restore Submit
    document.getElementById('form-restore-backup')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const agreement = document.getElementById('restore-agreement');
        if (!agreement || !agreement.checked) {
            App.toast('Anda wajib mencentang persetujuan pemulihan', 'warning');
            return;
        }

        if (!fileInput.files || fileInput.files.length === 0) {
            App.toast('Silakan pilih berkas cadangan SQL yang ingin dipulihkan', 'warning');
            return;
        }

        const conf = await App.confirm(
            'Konfirmasi Pemulihan Database',
            'Tindakan ini akan menimpa data aktif saat ini dengan isi berkas cadangan. Apakah Anda yakin ingin melanjutkan?'
        );
        if (!conf) return;

        const btn = document.getElementById('btn-submit-restore');
        btn.disabled = true;
        btn.innerHTML = `<i class="ri-loader-4-line animate-spin"></i> Mengeksekusi SQL...`;

        const formData = new FormData();
        formData.append('backup_file', fileInput.files[0]);
        formData.append('action', 'restore');

        try {
            const res = await App.api('backup/restore', {
                method: 'POST',
                body: formData
            });

            if (res && res.success) {
                App.toast('Database berhasil dipulihkan secara menyeluruh!', 'success');
                modalRestore.classList.add('hidden');
                fileInput.value = '';
                fileInfo.classList.add('hidden');
                agreement.checked = false;
                await loadBackupData();
            } else {
                App.toast(res?.message || 'Gagal memulihkan database', 'error');
            }
        } catch (err) {
            App.toast(err.message || 'Terjadi kesalahan sistem saat pemulihan', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="ri-restart-line"></i> Mulai Pemulihan`;
        }
    });

    // Window global action: Pulihkan dari arsip server yang sudah ada
    window.restoreFromServer = async (fileName) => {
        const conf = await App.confirm(
            'Konfirmasi Pemulihan Database',
            `Apakah Anda yakin ingin memulihkan database dari berkas arsip "${fileName}"? Seluruh data aktif akan ditimpa sesuai isi arsip ini.`
        );
        if (!conf) return;

        App.toast('Sedang memulihkan database, mohon tunggu...', 'info');

        try {
            const res = await App.api('backup/restore', {
                method: 'POST',
                body: {
                    action: 'restore',
                    filename: fileName
                }
            });

            if (res && res.success) {
                App.toast(res.message || 'Database berhasil dipulihkan dari arsip!', 'success');
                await loadBackupData();
            } else {
                App.toast(res?.message || 'Gagal memulihkan database', 'error');
            }
        } catch (err) {
            App.toast(err.message || 'Terjadi kesalahan saat memulihkan database', 'error');
        }
    };

    // Window global action: Hapus berkas cadangan
    window.deleteBackup = async (fileName) => {
        const conf = await App.confirm(
            'Hapus Berkas Cadangan?',
            `Berkas cadangan "${fileName}" akan dihapus permanen dari direktori server.`
        );
        if (!conf) return;

        try {
            const res = await App.api(`backup/${encodeURIComponent(fileName)}`, { method: 'DELETE' });
            if (res && res.success) {
                App.toast('Berkas cadangan berhasil dihapus', 'success');
                await loadBackupData();
            } else {
                App.toast(res?.message || 'Gagal menghapus berkas cadangan', 'error');
            }
        } catch (err) {
            App.toast(err.message || 'Terjadi kesalahan saat menghapus cadangan', 'error');
        }
    };
}
