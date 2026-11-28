// assets/js/pages/quotations.js
import { App } from '../app.js';
import { registerQuotationActions } from '../core/quotation-actions.js';
import { fetchDocumentTemplates, resolveTemplateVariables } from '../core/template-library.js';
import {
    DEFAULT_SALAM_PEMBUKA,
    DEFAULT_RUANG_LINGKUP_FITUR,
    DEFAULT_TIMELINE_PENGERJAAN,
    DEFAULT_PASAL_HAK_KEWAJIBAN,
    DEFAULT_SYARAT_KETENTUAN
} from '../core/quotation-defaults.js';

let sphTemplates = [];

let state = {
    page: 1,
    per_page: 15,
    status: '',
    client_id: '',
    search: ''
};

let clients = [];
let projects = [];
let services = [];

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Surat Penawaran Harga (Quotations)</h1>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Penerbitan proposal penawaran, persetujuan klien, dan konversi 1-klik ke faktur tagihan.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button id="btn-create-quotation" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm shadow-primary-500/20 transition">
                        <i class="ri-add-line text-base"></i>
                        <span>Buat Penawaran Baru</span>
                    </button>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4" id="quo-kpi-cards">
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Draft Disiapkan</span>
                    <div id="kpi-quo-draft" class="text-xl font-black font-mono text-slate-700 dark:text-slate-200 mt-1">0</div>
                </div>
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Terkirim ke Klien</span>
                    <div id="kpi-quo-sent" class="text-xl font-black font-mono text-primary-600 mt-1">0</div>
                </div>
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disetujui Klien</span>
                    <div id="kpi-quo-approved" class="text-xl font-black font-mono text-emerald-600 mt-1">0</div>
                </div>
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telah Jadi Faktur</span>
                    <div id="kpi-quo-converted" class="text-xl font-black font-mono text-indigo-600 mt-1">0</div>
                </div>
            </div>

            <!-- Status Tabs & Filter Toolbar -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button class="quo-tab px-3 py-1.5 rounded-xl text-xs font-bold transition bg-primary-600 text-white shadow-xs" data-status="">Semua</button>
                    <button class="quo-tab px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" data-status="draft">Draft</button>
                    <button class="quo-tab px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" data-status="terkirim">Terkirim</button>
                    <button class="quo-tab px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" data-status="disetujui">Disetujui</button>
                    <button class="quo-tab px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" data-status="dikonversi">Dikonversi</button>
                </div>
                <div class="flex items-center gap-2">
                    <div class="relative w-48 sm:w-64">
                        <i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input type="text" id="filter-quo-search" placeholder="Cari penawaran, klien..."
                               class="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                    </div>
                </div>
            </div>

            <!-- Table Container -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-50/70 dark:bg-slate-800/40 text-[10px] font-bold uppercase text-slate-500 font-mono border-b border-slate-200/80 dark:border-slate-800">
                                <th class="py-3 px-6">No. Penawaran</th>
                                <th class="py-3 px-4">Tanggal</th>
                                <th class="py-3 px-4">Berlaku s/d</th>
                                <th class="py-3 px-4">Calon Klien & Proyek</th>
                                <th class="py-3 px-4 text-right">Nilai Estimasi (Rp)</th>
                                <th class="py-3 px-4 text-center">Status</th>
                                <th class="py-3 px-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="quotation-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr><td colspan="7" class="py-12 text-center text-slate-400">Memuat data penawaran...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="quotation-pagination" class="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500"></div>
            </div>
        </div>

        <!-- Create/Edit Quotation Modal Form (Tabbed Interactive Editor) -->
        <div id="quotation-modal" class="hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div class="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 animate-fadeIn border border-slate-100 dark:border-slate-800 my-auto max-h-[92vh] flex flex-col">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div>
                        <h3 id="quo-modal-title" class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-file-paper-2-line text-primary-600"></i> Buat Surat Penawaran Harga Baru
                        </h3>
                        <p class="text-[11px] text-slate-400 mt-0.5">Lengkapi setiap tab secara berurutan atau lompat langsung ke bagian yang ingin diubah.</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <select id="quo-template-select" class="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-200 max-w-[180px]" title="Terapkan template dari Pustaka Template">
                            <option value="">-- Pilih Template SPH --</option>
                        </select>
                        <button type="button" id="btn-fill-quo-template" class="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-primary-600 dark:text-primary-400 rounded-xl text-[11px] font-bold flex items-center gap-1 transition" title="Isi ulang naskah dengan template standar">
                            <i class="ri-magic-line"></i> <span class="hidden sm:inline">Template Standar</span>
                        </button>
                        <button type="button" onclick="document.getElementById('quotation-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1">
                            <i class="ri-close-line text-xl"></i>
                        </button>
                    </div>
                </div>

                <!-- Interactive Step Tabs -->
                <div id="quo-editor-tabs" class="grid grid-cols-2 sm:grid-cols-5 gap-2 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <button type="button" data-quo-tab="klien" class="quo-editor-tab px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition bg-primary-600 text-white shadow-xs">
                        <i class="ri-user-3-line"></i>
                        <span>1. Klien &amp; Pengantar</span>
                    </button>
                    <button type="button" data-quo-tab="fitur" class="quo-editor-tab px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200">
                        <i class="ri-list-check-2"></i>
                        <span>2. Fitur Digarap</span>
                    </button>
                    <button type="button" data-quo-tab="timeline" class="quo-editor-tab px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200">
                        <i class="ri-calendar-todo-line"></i>
                        <span>3. Timeline Kerja</span>
                    </button>
                    <button type="button" data-quo-tab="biaya" class="quo-editor-tab px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200">
                        <i class="ri-money-dollar-circle-line"></i>
                        <span>4. Rincian Biaya</span>
                    </button>
                    <button type="button" data-quo-tab="pasal" class="quo-editor-tab px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200">
                        <i class="ri-scales-3-line"></i>
                        <span>5. Ketentuan &amp; Hak</span>
                    </button>
                </div>

                <form id="quotation-form" novalidate class="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                    <input type="hidden" id="form-quo-id">

                    <!-- TAB 1: Klien & Salam Pengantar -->
                    <div data-quo-panel="klien" class="quo-editor-panel space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Calon Pelanggan / Klien *</label>
                                    <span class="text-[10px] text-slate-400">Termasuk Calon Pelanggan (Prospek)</span>
                                </div>
                                <select id="form-quo-client" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"></select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Rencana Proyek (Opsional)</label>
                                <select id="form-quo-project" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                    <option value="">Tanpa Proyek Tertentu</option>
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Tanggal Penawaran *</label>
                                <input type="date" id="form-quo-date" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                            </div>
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Berlaku Hingga *</label>
                                <input type="date" id="form-quo-expiry" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Salam Pembuka &amp; Pengantar Proposal</label>
                            <textarea id="form-quo-salam" rows="6" placeholder="Dengan hormat, bersama surat ini kami mengajukan penawaran..."
                                      class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs leading-relaxed"></textarea>
                        </div>
                    </div>

                    <!-- TAB 2: Fitur yang Digarap -->
                    <div data-quo-panel="fitur" class="quo-editor-panel hidden space-y-3">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Daftar Fitur &amp; Modul yang Digarap</label>
                                <p class="text-[11px] text-slate-400">Jelaskan ruang lingkup fitur, modul aplikasi, dan deliverable yang akan dikerjakan.</p>
                            </div>
                        </div>

                        <div class="flex flex-wrap items-center gap-1.5">
                            <span class="text-[10px] font-bold uppercase text-slate-400 mr-1">Sisipkan Cepat:</span>
                            <button type="button" data-append-feature="Modul Autentikasi &amp; Hak Akses (RBAC) — Manajemen pengguna, peran, dan audit aktivitas." class="btn-feature-chip px-2.5 py-1 bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-primary-700 rounded-lg text-[11px] font-semibold transition">+ Autentikasi &amp; RBAC</button>
                            <button type="button" data-append-feature="Modul Dashboard &amp; Analitik — Ringkasan KPI, grafik tren real-time, dan ekspor laporan PDF/Excel." class="btn-feature-chip px-2.5 py-1 bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-primary-700 rounded-lg text-[11px] font-semibold transition">+ Dashboard &amp; Laporan</button>
                            <button type="button" data-append-feature="Integrasi Notifikasi WhatsApp &amp; Email SMTP — Pengingat otomatis dan pengiriman dokumen ke klien." class="btn-feature-chip px-2.5 py-1 bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-primary-700 rounded-lg text-[11px] font-semibold transition">+ Integrasi WA &amp; Email</button>
                            <button type="button" data-append-feature="Pengujian UAT, Pelatihan Admin &amp; Deployment Produksi — Uji coba bersama tim klien serta setup server." class="btn-feature-chip px-2.5 py-1 bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-primary-700 rounded-lg text-[11px] font-semibold transition">+ UAT &amp; Deployment</button>
                        </div>

                        <textarea id="form-quo-fitur" rows="11" placeholder="1. Modul ...\n2. Modul ..."
                                  class="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs leading-relaxed font-sans"></textarea>
                    </div>

                    <!-- TAB 3: Timeline Pengerjaan -->
                    <div data-quo-panel="timeline" class="quo-editor-panel hidden space-y-3">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Rencana Tahapan &amp; Timeline Waktu Pengerjaan</label>
                                <p class="text-[11px] text-slate-400">Jelaskan estimasi durasi (minggu), deliverable per tahap pengerjaan, hingga masa garansi sistem.</p>
                            </div>
                        </div>

                        <!-- Live Visual Roadmap Diagram Preview -->
                        <div class="p-3 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                    <i class="ri-calendar-schedule-line text-amber-500"></i> Diagram Matriks Jadwal Kerja &amp; Linimasa (Gantt Chart)
                                </span>
                                <span class="text-[10px] text-slate-400 font-medium">Tampil otomatis pada PDF &amp; Portal Klien</span>
                            </div>
                            <div id="quo-timeline-diagram-preview" class="transition-all overflow-x-auto"></div>
                        </div>

                        <div class="flex flex-wrap items-center gap-1.5">
                            <span class="text-[10px] font-bold uppercase text-slate-400 mr-1">Sisipkan Cepat:</span>
                            <button type="button" data-append-timeline="1. Instalasi, penyesuaian, sosialisasi (Minggu 1)&#10;2. Pendampingan dan penggunaan aplikasi (Minggu 2 – 4)" class="btn-timeline-chip px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-lg text-[11px] font-semibold transition border border-amber-200/80 dark:border-amber-800/50">+ Format Matriks: Minggu 1 &amp; 2–4</button>
                            <button type="button" data-append-timeline="1. Analisis Kebutuhan &amp; Perancangan Desain (Minggu 1)&#10;- Wawancara proses bisnis dan penyusunan prototipe wireframe UI/UX." class="btn-timeline-chip px-2.5 py-1 bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-primary-700 rounded-lg text-[11px] font-semibold transition">+ Minggu 1: Desain &amp; Analisis</button>
                            <button type="button" data-append-timeline="2. Pengembangan Inti Sistem &amp; Integrasi Modul (Minggu 2 – 3)&#10;- Pengkodean modul utama, logika bisnis dan hak akses RBAC." class="btn-timeline-chip px-2.5 py-1 bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-primary-700 rounded-lg text-[11px] font-semibold transition">+ Minggu 2–3: Development</button>
                            <button type="button" data-append-timeline="3. Pengujian Bersama, UAT &amp; Pelatihan Staf (Minggu 4)&#10;- User Acceptance Testing bersama klien dan pelatihan operasional." class="btn-timeline-chip px-2.5 py-1 bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-primary-700 rounded-lg text-[11px] font-semibold transition">+ Minggu 4: UAT &amp; Go-Live</button>
                            <button type="button" data-append-timeline="4. Pendampingan, Garansi &amp; Pemeliharaan (Minggu 5 – 6)&#10;- Pendampingan teknis dan perbaikan kendala gratis selama garansi." class="btn-timeline-chip px-2.5 py-1 bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-primary-700 rounded-lg text-[11px] font-semibold transition">+ Minggu 5–6: Pendampingan</button>
                        </div>

                        <textarea id="form-quo-timeline" rows="7" placeholder="1. Instalasi, penyesuaian, sosialisasi (Minggu 1)&#10;2. Pendampingan dan penggunaan aplikasi (Minggu 2 – 4)"
                                  class="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs leading-relaxed font-sans font-mono"></textarea>
                    </div>

                    <!-- TAB 4: Rincian Biaya -->
                    <div data-quo-panel="biaya" class="quo-editor-panel hidden space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <label class="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Rincian Item Layanan &amp; Estimasi Biaya</label>
                                <p class="text-[11px] text-slate-400">Pilih dari katalog layanan atau ketik deskripsi item penawaran secara manual.</p>
                            </div>
                            <button type="button" id="btn-add-quo-item" class="px-3.5 py-1.5 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition">
                                <i class="ri-add-line text-sm"></i> <span>Tambah Baris</span>
                            </button>
                        </div>

                        <datalist id="quotation-services-datalist"></datalist>

                        <div class="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
                            <table class="w-full text-xs text-left">
                                <thead class="bg-slate-50 dark:bg-slate-800/60 font-mono text-[10px] text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th class="py-2.5 px-3">Deskripsi Layanan / Item</th>
                                        <th class="py-2.5 px-2 w-20 text-center">Qty</th>
                                        <th class="py-2.5 px-2 w-24">Satuan</th>
                                        <th class="py-2.5 px-3 w-36 text-right">Harga Satuan (Rp)</th>
                                        <th class="py-2.5 px-3 w-36 text-right">Total Subtotal</th>
                                        <th class="py-2.5 px-2 w-10 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody id="quo-items-tbody" class="divide-y divide-slate-100 dark:divide-slate-800"></tbody>
                            </table>
                        </div>

                        <div class="flex justify-end">
                            <div class="w-full sm:w-96 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
                                <div class="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Subtotal Nilai:</span>
                                    <span id="quo-calc-subtotal" class="font-mono font-bold text-slate-900 dark:text-white">Rp 0</span>
                                </div>
                                <div class="flex items-center justify-between gap-2">
                                    <span class="text-slate-600 dark:text-slate-400">Potongan Diskon:</span>
                                    <div class="flex items-center gap-1.5">
                                        <select id="form-quo-diskon-tipe" class="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono">
                                            <option value="nominal">Rp</option>
                                            <option value="persen">%</option>
                                        </select>
                                        <input type="number" id="form-quo-diskon-val" value="0" min="0" class="w-28 px-2 py-1 text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs">
                                    </div>
                                </div>
                                <div class="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                    <div class="flex items-center gap-1.5">
                                        <span>PPN (%):</span>
                                        <input type="number" id="form-quo-pajak-persen" min="0" step="any" value="0" placeholder="0"
                                               class="w-16 px-2 py-1 text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs focus:ring-1 focus:ring-primary-500"
                                               title="Persentase PPN (isi 0 atau kosongkan jika tanpa pajak)">
                                    </div>
                                    <span id="quo-calc-pajak" class="font-mono text-slate-900 dark:text-white">Rp 0</span>
                                </div>
                                <div class="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-black text-slate-900 dark:text-white">
                                    <span>Total Estimasi Penawaran:</span>
                                    <span id="quo-calc-total" class="font-mono text-indigo-600 dark:text-indigo-400">Rp 0</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 4: Pasal Hak & Kewajiban + Syarat Ketentuan -->
                    <div data-quo-panel="pasal" class="quo-editor-panel hidden space-y-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Pasal-Pasal Hak &amp; Kewajiban Para Pihak</label>
                            <textarea id="form-quo-pasal" rows="7" placeholder="PASAL 1 - HAK DAN KEWAJIBAN PIHAK PERTAMA..."
                                      class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs leading-relaxed text-slate-700 dark:text-slate-200"></textarea>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Syarat &amp; Ketentuan Pembayaran</label>
                                <textarea id="form-quo-syarat" rows="4" class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-sans text-slate-600 dark:text-slate-300"></textarea>
                            </div>
                            <div>
                                <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Catatan Klien (Opsional)</label>
                                <textarea id="form-quo-catatan" rows="4" placeholder="Catatan tambahan atau lampiran penawaran"
                                          class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs"></textarea>
                            </div>
                        </div>
                    </div>
                </form>

                <!-- Modal Footer with Step Navigation & Save -->
                <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div class="flex items-center gap-3">
                        <button type="button" id="btn-quo-prev-tab" class="hidden px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold items-center gap-1 transition">
                            <i class="ri-arrow-left-s-line"></i> Sebelumnya
                        </button>
                        <div class="text-xs font-semibold text-slate-500">
                            Estimasi: <span id="quo-footer-total" class="font-mono font-black text-indigo-600 dark:text-indigo-400">Rp 0</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button" onclick="document.getElementById('quotation-modal').classList.add('hidden')"
                                class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold">Batal</button>
                        <button type="button" id="btn-quo-next-tab" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 transition">
                            <span>Lanjut</span> <i class="ri-arrow-right-s-line"></i>
                        </button>
                        <button type="submit" form="quotation-form" id="btn-save-quo"
                                class="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5">
                            <i class="ri-save-3-line"></i>
                            <span>Simpan Penawaran</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Load master data
    await Promise.all([loadMasterClients(), loadMasterProjects(), loadMasterServices()]);

    // Bindings
    const btnCreateQuo = document.getElementById('btn-create-quotation');
    if (btnCreateQuo) {
        btnCreateQuo.onclick = () => openQuotationEditor();
    }

    const btnAddQuo = document.getElementById('btn-add-quo-item');
    if (btnAddQuo) {
        let isAddingQuo = false;
        btnAddQuo.onclick = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (isAddingQuo) return;
            isAddingQuo = true;
            setTimeout(() => { isAddingQuo = false; }, 300);
            addQuoItemRow();
        };
    }
    document.getElementById('quotation-form')?.addEventListener('submit', handleSaveQuotation);
    document.getElementById('btn-fill-quo-template')?.addEventListener('click', () => {
        document.getElementById('form-quo-salam').value = DEFAULT_SALAM_PEMBUKA;
        document.getElementById('form-quo-fitur').value = DEFAULT_RUANG_LINGKUP_FITUR;
        document.getElementById('form-quo-timeline').value = DEFAULT_TIMELINE_PENGERJAAN;
        document.getElementById('form-quo-pasal').value = DEFAULT_PASAL_HAK_KEWAJIBAN;
        document.getElementById('form-quo-syarat').value = DEFAULT_SYARAT_KETENTUAN;
        updateQuoTimelineDiagramPreview();
        App.toast('Template naskah proposal standar berhasil dimuat', 'info', 1800);
    });

    const quoTplSelect = document.getElementById('quo-template-select');
    fetchDocumentTemplates('sph').then((list) => {
        sphTemplates = list;
        if (quoTplSelect && list.length) {
            quoTplSelect.innerHTML = '<option value="">-- Pilih Template SPH --</option>' +
                list.map((t) => `<option value="${t.id}">${App.escapeHtml(t.nama_template)}</option>`).join('');
        }
    });
    quoTplSelect?.addEventListener('change', (e) => {
        const tpl = sphTemplates.find((t) => Number(t.id) === Number(e.target.value));
        if (!tpl) return;
        const clientText = document.getElementById('form-quo-client')?.selectedOptions?.[0]?.textContent?.trim() || 'Klien';
        const projSel = document.getElementById('form-quo-project');
        const projText = (projSel && projSel.value) ? (projSel.selectedOptions?.[0]?.textContent?.trim() || 'Proyek') : 'Proyek';
        const totalText = document.getElementById('quo-calc-total')?.textContent?.trim() || App.formatIDR(0);
        const tglText = document.getElementById('form-quo-tanggal')?.value || '-';
        const vars = {
            nama_perusahaan: clientText.startsWith('--') ? 'Klien' : clientText,
            nama_project: projText.startsWith('--') ? 'Proyek' : projText,
            nilai_penawaran: totalText,
            tanggal_penawaran: tglText
        };
        if (tpl.salam_pembuka) document.getElementById('form-quo-salam').value = resolveTemplateVariables(tpl.salam_pembuka, vars);
        if (tpl.ruang_lingkup_fitur) document.getElementById('form-quo-fitur').value = resolveTemplateVariables(tpl.ruang_lingkup_fitur, vars);
        if (tpl.timeline_pengerjaan) document.getElementById('form-quo-timeline').value = resolveTemplateVariables(tpl.timeline_pengerjaan, vars);
        if (tpl.isi_pasal) document.getElementById('form-quo-pasal').value = resolveTemplateVariables(tpl.isi_pasal, vars);
        updateQuoTimelineDiagramPreview();
        App.toast(`Template "${tpl.nama_template}" diterapkan`, 'success', 1800);
    });

    // Interactive Editor Tabs
    document.querySelectorAll('.quo-editor-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            switchQuoEditorTab(btn.getAttribute('data-quo-tab'));
        });
    });

    const tabOrder = ['klien', 'fitur', 'timeline', 'biaya', 'pasal'];
    document.getElementById('btn-quo-prev-tab')?.addEventListener('click', () => {
        const cur = document.querySelector('.quo-editor-panel:not(.hidden)')?.getAttribute('data-quo-panel') || 'klien';
        const idx = tabOrder.indexOf(cur);
        if (idx > 0) switchQuoEditorTab(tabOrder[idx - 1]);
    });
    document.getElementById('btn-quo-next-tab')?.addEventListener('click', () => {
        const cur = document.querySelector('.quo-editor-panel:not(.hidden)')?.getAttribute('data-quo-panel') || 'klien';
        const idx = tabOrder.indexOf(cur);
        if (idx < tabOrder.length - 1) switchQuoEditorTab(tabOrder[idx + 1]);
    });

    // Quick-insert feature chips
    document.querySelectorAll('.btn-feature-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const ta = document.getElementById('form-quo-fitur');
            if (!ta) return;
            const snippet = chip.getAttribute('data-append-feature') || '';
            const current = ta.value.trim();
            const nextNum = current ? (current.split('\n').filter(l => /^\d+\./.test(l.trim())).length + 1) : 1;
            ta.value = current ? `${current}\n${nextNum}. ${snippet}` : `${nextNum}. ${snippet}`;
            ta.focus();
        });
    });

    // Quick-insert timeline chips & live diagram preview sync
    document.querySelectorAll('.btn-timeline-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const ta = document.getElementById('form-quo-timeline');
            if (!ta) return;
            const snippet = chip.getAttribute('data-append-timeline') || '';
            const current = ta.value.trim();
            ta.value = current ? `${current}\n\n${snippet}` : snippet;
            ta.focus();
            updateQuoTimelineDiagramPreview();
        });
    });

    const timelineInput = document.getElementById('form-quo-timeline');
    if (timelineInput) {
        timelineInput.addEventListener('input', () => updateQuoTimelineDiagramPreview());
        timelineInput.addEventListener('change', () => updateQuoTimelineDiagramPreview());
    }

    document.querySelectorAll('.quo-tab').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('.quo-tab').forEach(x => {
                x.className = 'quo-tab px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800';
            });
            b.className = 'quo-tab px-3 py-1.5 rounded-xl text-xs font-bold transition bg-primary-600 text-white shadow-xs';
            state.status = b.getAttribute('data-status');
            state.page = 1;
            loadQuotations();
        });
    });

    let sTimer;
    document.getElementById('filter-quo-search')?.addEventListener('input', (e) => {
        clearTimeout(sTimer);
        sTimer = setTimeout(() => {
            state.search = e.target.value.trim();
            state.page = 1;
            loadQuotations();
        }, 300);
    });

    document.getElementById('form-quo-diskon-tipe')?.addEventListener('change', calculateQuoTotals);
    document.getElementById('form-quo-diskon-val')?.addEventListener('input', calculateQuoTotals);
    document.getElementById('form-quo-pajak-persen')?.addEventListener('input', calculateQuoTotals);

    await loadQuotations();
}

async function loadMasterClients() {
    const res = await App.api('clients?all=1&include_prospects=1');
    if (res && res.success && Array.isArray(res.data)) {
        clients = res.data;
        const sel = document.getElementById('form-quo-client');
        if (sel) {
            const prospects = clients.filter(c => c.status === 'prospek');
            const actives = clients.filter(c => c.status === 'aktif');
            const others = clients.filter(c => c.status !== 'prospek' && c.status !== 'aktif');

            let html = '<option value="">Pilih Calon Pelanggan / Klien...</option>';

            if (prospects.length > 0) {
                html += `<optgroup label="Calon Pelanggan / Prospek (${prospects.length})">` +
                    prospects.map(c => `
                        <option value="${c.id}">⭐ ${c.nama_perusahaan} (${c.kode_klien}) · [Calon Pelanggan / Prospek]</option>
                    `).join('') + `</optgroup>`;
            }

            if (actives.length > 0) {
                html += `<optgroup label="Pelanggan Tetap / Aktif (${actives.length})">` +
                    actives.map(c => `
                        <option value="${c.id}">${c.nama_perusahaan} (${c.kode_klien})</option>
                    `).join('') + `</optgroup>`;
            }

            if (others.length > 0) {
                html += `<optgroup label="Lainnya">` +
                    others.map(c => `
                        <option value="${c.id}">${c.nama_perusahaan} (${c.kode_klien})</option>
                    `).join('') + `</optgroup>`;
            }

            sel.innerHTML = html;
        }
    }
}

async function loadMasterProjects() {
    const res = await App.api('projects?all=1');
    if (res && res.success && Array.isArray(res.data)) {
        projects = res.data;
        const sel = document.getElementById('form-quo-project');
        if (sel) {
            sel.innerHTML = `<option value="">Tanpa Proyek Tertentu</option>` + projects.map(p => `
                <option value="${p.id}">${p.nama_project} (${p.client_nama || p.nama_perusahaan || ''})</option>
            `).join('');
        }
    }
}

async function loadMasterServices() {
    const res = await App.api('services?all=1');
    if (res && res.success && Array.isArray(res.data)) {
        services = res.data;
        renderQuoServicesDatalist();
    }
}

function renderQuoServicesDatalist() {
    const dl = document.getElementById('quotation-services-datalist');
    if (dl && Array.isArray(services)) {
        dl.innerHTML = services.map(s => `
            <option value="${App.escapeHtml(s.nama_layanan)}">${App.formatIDR(s.harga_standar)}</option>
        `).join('');
    }
}

async function loadQuotations() {
    const tbody = document.getElementById('quotation-tbody');
    if (!tbody) return;

    let q = `quotations?page=${state.page}&per_page=${state.per_page}`;
    if (state.status) q += `&status=${encodeURIComponent(state.status)}`;
    if (state.search) q += `&search=${encodeURIComponent(state.search)}`;

    const res = await App.api(q);
    if (!res || !res.success) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-rose-500">Gagal memuat surat penawaran</td></tr>`;
        return;
    }

    const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
    const pagination = res.pagination || res.data?.pagination || { page: 1, total_pages: 1, total: items.length };
    const kpi = res.kpi || res.extra?.kpi || res.data?.extra?.kpi;

    // Update KPI cards
    if (kpi) {
        const dEl = document.getElementById('kpi-quo-draft');
        const sEl = document.getElementById('kpi-quo-sent');
        const aEl = document.getElementById('kpi-quo-approved');
        const cEl = document.getElementById('kpi-quo-converted');
        if (dEl) dEl.textContent = kpi.count_draft || 0;
        if (sEl) sEl.textContent = kpi.count_terkirim || 0;
        if (aEl) aEl.textContent = kpi.count_disetujui || 0;
        if (cEl) cEl.textContent = kpi.count_dikonversi || 0;
    }

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400">Belum ada surat penawaran ditemukan</td></tr>`;
        renderPagination(pagination);
        return;
    }

    tbody.innerHTML = items.map(q => `
        <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
            <td class="py-3.5 px-6 align-middle font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                ${App.escapeHtml(q.nomor_penawaran)}
                ${q.converted_invoice_no ? `<div class="text-[10px] text-indigo-600 font-sans">Faktur: <a href="#/invoices" class="hover:underline">${App.escapeHtml(q.converted_invoice_no)}</a></div>` : ''}
                ${Number(q.view_count || 0) > 0 ? `<div class="text-[10px] text-sky-600 dark:text-sky-400 font-mono flex items-center gap-1 mt-0.5" title="Terakhir dilihat klien: ${q.last_viewed_at ? App.formatDateTime(q.last_viewed_at) : '-'}"><i class="ri-eye-line"></i><span>Dilihat ${q.view_count}x</span></div>` : ''}
            </td>
            <td class="py-3.5 px-4 align-middle font-mono text-slate-500 whitespace-nowrap">
                ${App.formatDate(q.tanggal_penawaran)}
            </td>
            <td class="py-3.5 px-4 align-middle font-mono text-rose-600 whitespace-nowrap">
                ${App.formatDate(q.berlaku_hingga)}
            </td>
            <td class="py-3.5 px-4 align-middle font-sans max-w-[240px]">
                <div class="font-bold text-slate-900 dark:text-white truncate" title="${App.escapeHtml(q.nama_perusahaan)}">${App.escapeHtml(q.nama_perusahaan)}</div>
                <div class="text-[11px] text-slate-400 truncate">UP: ${App.escapeHtml(q.penanggung_jawab || '-')} ${q.nama_project ? `· Proyek: ${App.escapeHtml(q.nama_project)}` : ''}</div>
            </td>
            <td class="py-3.5 px-4 align-middle text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                ${App.formatIDR(q.total_penawaran)}
            </td>
            <td class="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                ${App.renderStatusBadge(q.status, 'quotation')}
            </td>
            <td class="py-3.5 px-6 align-middle text-right whitespace-nowrap">
                <button type="button" onclick="App.toggleTableActionMenu(this, event, [
                    ${q.status !== 'dikonversi' ? `{ label: 'Edit Naskah & Rincian', icon: 'ri-edit-line', iconColor: 'text-primary-600', action: 'window.editQuotation(${q.id})' },` : ''}
                    {
                        label: 'Dokumen & Ekspor',
                        icon: 'ri-file-pdf-2-line',
                        iconColor: 'text-rose-600',
                        children: [
                            { label: 'Pratinjau PDF', icon: 'ri-file-pdf-2-line', iconColor: 'text-rose-600', action: 'window.printQuotationPdf(${q.id}, \\'bloburl\\')' },
                            { label: 'Unduh PDF', icon: 'ri-download-line', iconColor: 'text-emerald-600', action: 'window.printQuotationPdf(${q.id}, \\'download\\')' },
                            { label: 'Unduh Format Word (.doc)', icon: 'ri-file-word-2-line', iconColor: 'text-blue-600', action: 'window.downloadQuotationWordDoc(${q.id})' }
                        ]
                    },
                    {
                        label: 'Bagikan & E-Sign',
                        icon: 'ri-share-forward-line',
                        iconColor: 'text-indigo-600',
                        children: [
                            { label: 'Buka Portal E-Sign', icon: 'ri-external-link-line', iconColor: 'text-indigo-600', action: 'window.openPublicQuotation(\\'${q.public_token || q.nomor_penawaran}\\')' },
                            { label: 'Salin Tautan E-Sign Klien', icon: 'ri-share-line', iconColor: 'text-sky-600', action: 'window.copyPublicQuotationLink(\\'${q.public_token || q.nomor_penawaran}\\')' },
                            { label: 'Kirim Email (SMTP)', icon: 'ri-mail-send-line', iconColor: 'text-sky-600', action: 'window.sendQuotationEmail(${q.id})' },
                            { label: 'Kirim WhatsApp', icon: 'ri-whatsapp-line', iconColor: 'text-emerald-500', action: 'window.sendQuotationWA(${q.id})' }
                        ]
                    },
                    {
                        label: 'Status & Konversi',
                        icon: 'ri-arrow-left-right-line',
                        iconColor: 'text-emerald-600',
                        children: [
                            ${q.status === 'draft' ? `{ label: 'Tandai Terkirim', icon: 'ri-send-plane-line', iconColor: 'text-sky-600', action: 'window.updateQuotationStatus(${q.id}, \\'terkirim\\')' },` : ''}
                            ${['draft', 'terkirim'].includes(q.status) ? `{ label: 'Tandai Disetujui', icon: 'ri-check-line', iconColor: 'text-emerald-600', action: 'window.updateQuotationStatus(${q.id}, \\'disetujui\\')' },` : ''}
                            ${q.status !== 'dikonversi' ? `{ label: 'Jadikan Faktur', icon: 'ri-arrow-right-circle-line', iconColor: 'text-indigo-600', action: 'window.convertQuotationToInvoice(${q.id}, \\'${App.escapeHtml(q.nomor_penawaran)}\\')' },` : ''}
                            ${['disetujui', 'dikonversi'].includes(q.status) ? `{ label: 'Buat SPK / Kontrak Digital', icon: 'ri-file-shield-2-line', iconColor: 'text-emerald-600', action: 'window.createContractFromQuotation(${q.id})' },` : ''}
                            null
                        ].filter(Boolean)
                    },
                    { divider: true },
                    { label: 'Hapus Penawaran', icon: 'ri-delete-bin-line', danger: true, action: 'window.deleteQuotation(${q.id}, \\'${App.escapeHtml(q.nomor_penawaran)}\\')' }
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
    const cont = document.getElementById('quotation-pagination');
    if (!cont || !p) return;
    if (p.total_pages <= 1) {
        cont.innerHTML = `<span>Menampilkan ${p.total || 0} data</span>`;
        return;
    }
    App.renderPagination(cont, p, (page) => { state.page = page; loadQuotations(); }, 'penawaran');
}

function updateQuoTimelineDiagramPreview() {
    const previewEl = document.getElementById('quo-timeline-diagram-preview');
    if (!previewEl) return;
    const text = document.getElementById('form-quo-timeline')?.value || '';
    if (window.App && typeof window.App.renderTimelineDiagramHtml === 'function') {
        previewEl.innerHTML = window.App.renderTimelineDiagramHtml(text);
    }
}

function switchQuoEditorTab(tabName) {
    const tabOrder = ['klien', 'fitur', 'timeline', 'biaya', 'pasal'];
    const target = tabOrder.includes(tabName) ? tabName : 'klien';

    document.querySelectorAll('.quo-editor-tab').forEach(btn => {
        const isMatch = btn.getAttribute('data-quo-tab') === target;
        btn.className = isMatch
            ? 'quo-editor-tab px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition bg-primary-600 text-white shadow-xs'
            : 'quo-editor-tab px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200';
    });

    document.querySelectorAll('.quo-editor-panel').forEach(panel => {
        panel.classList.toggle('hidden', panel.getAttribute('data-quo-panel') !== target);
    });

    if (target === 'timeline') {
        updateQuoTimelineDiagramPreview();
    }

    const idx = tabOrder.indexOf(target);
    const prevBtn = document.getElementById('btn-quo-prev-tab');
    const nextBtn = document.getElementById('btn-quo-next-tab');
    if (prevBtn) {
        prevBtn.classList.toggle('hidden', idx <= 0);
        prevBtn.classList.toggle('inline-flex', idx > 0);
    }
    if (nextBtn) {
        nextBtn.classList.toggle('hidden', idx >= tabOrder.length - 1);
        nextBtn.classList.toggle('inline-flex', idx < tabOrder.length - 1);
    }
}

function openQuotationEditor(quo = null) {
    const modal = document.getElementById('quotation-modal');
    const titleEl = document.getElementById('quo-modal-title');
    document.getElementById('form-quo-id').value = quo ? quo.id : '';
    document.getElementById('form-quo-client').value = quo ? quo.client_id : '';
    document.getElementById('form-quo-project').value = quo ? (quo.project_id || '') : '';
    document.getElementById('form-quo-date').value = quo ? quo.tanggal_penawaran : new Date().toISOString().slice(0, 10);
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 14);
    document.getElementById('form-quo-expiry').value = quo ? quo.berlaku_hingga : expDate.toISOString().slice(0, 10);

    document.getElementById('form-quo-salam').value = quo ? (quo.salam_pembuka || DEFAULT_SALAM_PEMBUKA) : DEFAULT_SALAM_PEMBUKA;
    document.getElementById('form-quo-fitur').value = quo ? (quo.ruang_lingkup_fitur || DEFAULT_RUANG_LINGKUP_FITUR) : DEFAULT_RUANG_LINGKUP_FITUR;
    document.getElementById('form-quo-timeline').value = quo ? (quo.timeline_pengerjaan || DEFAULT_TIMELINE_PENGERJAAN) : DEFAULT_TIMELINE_PENGERJAAN;
    document.getElementById('form-quo-pasal').value = quo ? (quo.pasal_hak_kewajiban || DEFAULT_PASAL_HAK_KEWAJIBAN) : DEFAULT_PASAL_HAK_KEWAJIBAN;
    document.getElementById('form-quo-catatan').value = quo ? (quo.catatan_klien || '') : '';
    document.getElementById('form-quo-syarat').value = quo ? (quo.syarat_ketentuan || DEFAULT_SYARAT_KETENTUAN) : DEFAULT_SYARAT_KETENTUAN;

    const quoTplSel = document.getElementById('quo-template-select');
    if (quoTplSel) {
        const defSph = !quo ? sphTemplates.find((t) => Number(t.is_default) === 1) : null;
        quoTplSel.value = defSph ? String(defSph.id) : '';
        if (defSph) {
            const vars = {
                nama_perusahaan: 'Klien',
                nama_project: 'Proyek',
                nilai_penawaran: App.formatIDR(0),
                tanggal_penawaran: document.getElementById('form-quo-date')?.value || '-'
            };
            if (defSph.salam_pembuka) document.getElementById('form-quo-salam').value = resolveTemplateVariables(defSph.salam_pembuka, vars);
            if (defSph.ruang_lingkup_fitur) document.getElementById('form-quo-fitur').value = resolveTemplateVariables(defSph.ruang_lingkup_fitur, vars);
            if (defSph.timeline_pengerjaan) document.getElementById('form-quo-timeline').value = resolveTemplateVariables(defSph.timeline_pengerjaan, vars);
            if (defSph.isi_pasal) document.getElementById('form-quo-pasal').value = resolveTemplateVariables(defSph.isi_pasal, vars);
        }
    }

    const diskonTipe = quo ? (quo.diskon_tipe || 'nominal') : 'nominal';
    document.getElementById('form-quo-diskon-tipe').value = diskonTipe;
    if (quo && diskonTipe === 'persen' && Number(quo.subtotal) > 0) {
        document.getElementById('form-quo-diskon-val').value = Math.round((Number(quo.diskon_nilai) / Number(quo.subtotal)) * 100);
    } else {
        document.getElementById('form-quo-diskon-val').value = quo ? (quo.diskon_nilai || 0) : '0';
    }

    const pajakPersenInput = document.getElementById('form-quo-pajak-persen');
    if (pajakPersenInput) {
        if (quo) {
            const pVal = (quo.pajak_persen !== null && quo.pajak_persen !== undefined && quo.pajak_persen !== '') ? parseFloat(quo.pajak_persen) : 0;
            pajakPersenInput.value = isNaN(pVal) ? '' : pVal;
        } else {
            const defaultTax = (window.App?.settings && window.App.settings.invoice_tax_percent !== undefined && window.App.settings.invoice_tax_percent !== '') 
                ? window.App.settings.invoice_tax_percent 
                : '0';
            pajakPersenInput.value = defaultTax;
        }
    }

    if (titleEl) {
        titleEl.innerHTML = quo
            ? `<i class="ri-edit-line text-primary-600"></i> Edit Surat Penawaran ${quo.nomor_penawaran}`
            : `<i class="ri-file-paper-2-line text-primary-600"></i> Buat Surat Penawaran Harga Baru`;
    }

    // Refresh datalist
    renderQuoServicesDatalist();

    const tbody = document.getElementById('quo-items-tbody');
    tbody.innerHTML = '';
    if (quo && Array.isArray(quo.items) && quo.items.length > 0) {
        quo.items.forEach(it => addQuoItemRow(it));
    } else {
        addQuoItemRow();
    }
    calculateQuoTotals();
    updateQuoTimelineDiagramPreview();
    switchQuoEditorTab('klien');

    modal.classList.remove('hidden');
}

function addQuoItemRow(item = null) {
    const tbody = document.getElementById('quo-items-tbody');
    const tr = document.createElement('tr');
    tr.className = 'quo-item-row hover:bg-slate-50/50 dark:hover:bg-slate-800/20';

    let deskripsi = item ? (item.deskripsi || '') : '';
    let serviceId = item ? (item.service_id || '') : '';
    let qty = item ? item.kuantitas : '1';
    let rawU = item ? item.satuan : 'Paket';
    let cleanU = (rawU === 'one_time' || rawU === 'onetime') ? 'One Time' : (rawU ? rawU.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Paket');
    let price = item ? item.harga_satuan : '0';

    // If serviceId is provided without description, lookup from services catalog
    if (serviceId && !deskripsi && Array.isArray(services)) {
        const s = services.find(x => x.id == serviceId);
        if (s) {
            deskripsi = s.nama_layanan;
            if (!price || price == 0) price = s.harga_standar;
            const u = s.siklus_tagihan || 'paket';
            cleanU = (u === 'one_time' || u === 'onetime') ? 'One Time' : u.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    }

    tr.innerHTML = `
        <td class="py-2.5 px-3">
            <input type="text" list="quotation-services-datalist" class="quo-item-desc w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500" required placeholder="Pilih katalog atau ketik deskripsi modul / paket..." value="${App.escapeHtml(deskripsi)}">
            <input type="hidden" class="quo-item-service" value="${serviceId || ''}">
        </td>
        <td class="py-2.5 px-2 text-center align-middle">
            <input type="number" class="quo-item-qty w-16 px-2 py-2 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono" min="0.1" step="0.1" value="${qty}">
        </td>
        <td class="py-2.5 px-2 align-middle">
            <input type="text" class="quo-item-unit w-24 px-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-center" value="${App.escapeHtml(cleanU)}">
        </td>
        <td class="py-2.5 px-3 text-right align-middle">
            <input type="number" class="quo-item-price w-36 px-3 py-2 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono" min="0" step="any" placeholder="0" value="${price}">
        </td>
        <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200 quo-item-total align-middle">
            Rp 0
        </td>
        <td class="py-2.5 px-2 text-center align-middle">
            <button type="button" onclick="this.closest('tr').remove(); window.calculateQuoTotals();" class="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition" title="Hapus Baris">
                <i class="ri-delete-bin-line text-sm"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);

    const descInput = tr.querySelector('.quo-item-desc');
    const serviceIdInput = tr.querySelector('.quo-item-service');
    const priceInput = tr.querySelector('.quo-item-price');
    const unitInput = tr.querySelector('.quo-item-unit');

    descInput.addEventListener('input', () => {
        const val = descInput.value.trim().toLowerCase();
        if (Array.isArray(services)) {
            const matched = services.find(s => s.nama_layanan.toLowerCase() === val);
            if (matched) {
                serviceIdInput.value = matched.id;
                priceInput.value = matched.harga_standar;
                const rawU = matched.siklus_tagihan || 'paket';
                const cleanU = (rawU === 'one_time' || rawU === 'onetime') ? 'One Time' : (rawU.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
                unitInput.value = cleanU;
            } else {
                serviceIdInput.value = '';
            }
        }
        calculateQuoTotals();
    });

    tr.querySelector('.quo-item-qty')?.addEventListener('input', calculateQuoTotals);
    tr.querySelector('.quo-item-price')?.addEventListener('input', calculateQuoTotals);
    calculateQuoTotals();
}

function calculateQuoTotals() {
    let subtotal = 0;
    document.querySelectorAll('.quo-item-row').forEach(tr => {
        const qty = parseFloat(tr.querySelector('.quo-item-qty')?.value) || 0;
        const price = parseFloat(tr.querySelector('.quo-item-price')?.value) || 0;
        const total = qty * price;
        subtotal += total;
        const totCell = tr.querySelector('.quo-item-total');
        if (totCell) totCell.textContent = App.formatIDR(total);
    });

    const diskonTipe = document.getElementById('form-quo-diskon-tipe')?.value || 'nominal';
    const diskonVal = parseFloat(document.getElementById('form-quo-diskon-val')?.value) || 0;
    const diskonNominal = diskonTipe === 'persen' ? (subtotal * (diskonVal / 100)) : diskonVal;
    const dpp = Math.max(0, subtotal - diskonNominal);

    const pajInput = document.getElementById('form-quo-pajak-persen');
    const pajRaw = pajInput ? pajInput.value.trim() : '';
    const pajakPersen = pajRaw === '' ? 0 : (parseFloat(pajRaw) || 0);
    const pajak = dpp * (pajakPersen / 100);
    const grandTotal = dpp + pajak;

    const subEl = document.getElementById('quo-calc-subtotal');
    const pajEl = document.getElementById('quo-calc-pajak');
    const totEl = document.getElementById('quo-calc-total');
    const footTotEl = document.getElementById('quo-footer-total');

    if (subEl) subEl.textContent = App.formatIDR(subtotal);
    if (pajEl) pajEl.textContent = App.formatIDR(pajak);
    if (totEl) totEl.textContent = App.formatIDR(grandTotal);
    if (footTotEl) footTotEl.textContent = App.formatIDR(grandTotal);
}

window.calculateQuoTotals = calculateQuoTotals;

async function handleSaveQuotation(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-quo');

    const clientId = document.getElementById('form-quo-client')?.value;
    const tglPenawaran = document.getElementById('form-quo-date')?.value;
    const berlakuHingga = document.getElementById('form-quo-expiry')?.value;

    if (!clientId) {
        switchQuoEditorTab('klien');
        App.toast('Pilih calon pelanggan terlebih dahulu', 'warning');
        document.getElementById('form-quo-client')?.focus();
        return;
    }
    if (!tglPenawaran || !berlakuHingga) {
        switchQuoEditorTab('klien');
        App.toast('Tanggal penawaran dan masa berlaku wajib diisi', 'warning');
        return;
    }

    const items = [];

    document.querySelectorAll('.quo-item-row').forEach(tr => {
        const serviceId = tr.querySelector('.quo-item-service')?.value || null;
        const desc = tr.querySelector('.quo-item-desc')?.value.trim();
        const qty = parseFloat(tr.querySelector('.quo-item-qty')?.value) || 1;
        const unit = tr.querySelector('.quo-item-unit')?.value.trim() || 'paket';
        const price = parseFloat(tr.querySelector('.quo-item-price')?.value) || 0;
        if (desc) {
            items.push({ service_id: serviceId, deskripsi: desc, kuantitas: qty, satuan: unit, harga_satuan: price });
        }
    });

    if (items.length === 0) {
        switchQuoEditorTab('biaya');
        App.toast('Minimal cantumkan satu rincian layanan penawaran pada tab Rincian Biaya', 'warning');
        return;
    }

    const id = document.getElementById('form-quo-id').value;
    const pajInput = document.getElementById('form-quo-pajak-persen');
    const pajRaw = pajInput ? pajInput.value.trim() : '';
    const pajakPersen = pajRaw === '' ? 0 : (parseFloat(pajRaw) || 0);

    const payload = {
        client_id: document.getElementById('form-quo-client').value,
        project_id: document.getElementById('form-quo-project').value || null,
        tanggal_penawaran: document.getElementById('form-quo-date').value,
        berlaku_hingga: document.getElementById('form-quo-expiry').value,
        salam_pembuka: document.getElementById('form-quo-salam').value.trim(),
        ruang_lingkup_fitur: document.getElementById('form-quo-fitur').value.trim(),
        timeline_pengerjaan: document.getElementById('form-quo-timeline').value.trim(),
        pasal_hak_kewajiban: document.getElementById('form-quo-pasal').value.trim(),
        catatan_klien: document.getElementById('form-quo-catatan').value.trim(),
        syarat_ketentuan: document.getElementById('form-quo-syarat').value.trim(),
        diskon_tipe: document.getElementById('form-quo-diskon-tipe').value,
        diskon_nilai: document.getElementById('form-quo-diskon-val').value,
        pajak_persen: pajakPersen,
        items
    };

    App.btnLoading(btn, true, 'Menyimpan...');
    try {
        const url = id ? `quotations/${id}` : 'quotations';
        const method = id ? 'PUT' : 'POST';
        const res = await App.api(url, { method, body: payload });
        if (res && res.success) {
            App.toast(res.message, 'success');
            document.getElementById('quotation-modal').classList.add('hidden');
            await loadQuotations();
        }
    } finally {
        App.btnLoading(btn, false);
    }
}


registerQuotationActions({ getOpenEditor: () => openQuotationEditor, getLoadQuotations: () => loadQuotations, getState: () => state });

export default { init };
