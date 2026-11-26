// ============================================
// PREFERENCES MODAL RENDERER & RESET (2-Column Enterprise Layout)
// ============================================
import { api } from './api.js';
import { escapeHtml, formatDate, formatRupiah, toast } from './utils.js';

let activePrefSection = 'appearance';

const PREF_KEYS = [
    'app_nav_layout', 'app_windows_submenu_style', 'app_theme', 'app_dark_mode',
    'pref_font_size', 'keuangan_table_density', 'pref_table_grid_style',
    'pref_date_format', 'pref_num_separator', 'pref_num_decimals',
    'pref_num_currency_symbol', 'pref_start_page', 'pref_per_page', 'pref_reduced_motion'
];

const PREF_SECTIONS = [
    { id: 'appearance', label: 'Tampilan & Tema', desc: 'Mode terang/gelap & warna', icon: 'ri-palette-line', color: 'text-primary-600' },
    { id: 'navigation', label: 'Navigasi & Tata Letak', desc: 'Sidebar, taskbar & submenu', icon: 'ri-layout-4-line', color: 'text-indigo-600' },
    { id: 'table', label: 'Tabel & Tipografi', desc: 'Kerapatan, garis & huruf', icon: 'ri-table-line', color: 'text-emerald-600' },
    { id: 'format', label: 'Format Angka & Tanggal', desc: 'Mata uang, ribuan & tanggal', icon: 'ri-calendar-2-line', color: 'text-amber-600' },
    { id: 'productivity', label: 'Produktivitas & Profil', desc: 'Start page, animasi & sinkron', icon: 'ri-flashlight-line', color: 'text-rose-600' }
];

function _collectPrefsFromStorage() {
    const out = {};
    PREF_KEYS.forEach((k) => {
        const val = localStorage.getItem(k);
        if (val !== null) out[k] = val;
    });
    return out;
}

function _renderSectionBody(navCtx) {
    const curLayout = navCtx.navLayout;
    const curWinSub = navCtx.windowsSubmenuStyle;
    const curTheme = localStorage.getItem('app_theme') || 'orange';
    const curDarkMode = localStorage.getItem('app_dark_mode') || 'light';
    const curFontSize = localStorage.getItem('pref_font_size') || 'normal';
    const curDensity = localStorage.getItem('keuangan_table_density') || 'comfortable';
    const curGridStyle = localStorage.getItem('pref_table_grid_style') || 'zebra';
    const curDateFormat = localStorage.getItem('pref_date_format') || 'dmy';
    const curSeparator = localStorage.getItem('pref_num_separator') || 'id';
    const curDecimals = localStorage.getItem('pref_num_decimals') || '0';
    const curSymbol = localStorage.getItem('pref_num_currency_symbol') !== null
        ? localStorage.getItem('pref_num_currency_symbol')
        : 'Rp ';
    const curStartPage = localStorage.getItem('pref_start_page') || '#/dashboard';
    const curPerPage = localStorage.getItem('pref_per_page') || '15';
    const curReducedMotion = localStorage.getItem('pref_reduced_motion') === '1';
    const themes = window.THEMES || {};

    if (activePrefSection === 'appearance') {
        return `
            <div class="space-y-6">
                <div>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white">Mode Tampilan</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">Pilih mode pencahayaan antarmuka aplikasi.</p>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        ${[
                            { id: 'light', name: 'Mode Terang', desc: 'Latar cerah & bersih', icon: 'ri-sun-line', iconColor: 'text-amber-500' },
                            { id: 'dark', name: 'Mode Gelap', desc: 'Nyaman untuk mata', icon: 'ri-moon-line', iconColor: 'text-indigo-400' },
                            { id: 'system', name: 'Otomatis', desc: 'Ikuti tema perangkat', icon: 'ri-computer-line', iconColor: 'text-slate-400' }
                        ].map((m) => `
                            <button type="button" onclick="App.applyDarkMode('${m.id}', true); App.renderPreferencesModalContent();"
                                class="p-3.5 rounded-2xl border text-left transition flex items-start gap-2.5 ${curDarkMode === m.id ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/40 ring-1 ring-primary-500/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'}">
                                <i class="${m.icon} ${m.iconColor} text-lg mt-0.5 shrink-0"></i>
                                <div class="min-w-0 flex-1">
                                    <div class="text-xs font-bold text-slate-800 dark:text-slate-100">${m.name}</div>
                                    <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">${m.desc}</div>
                                </div>
                                ${curDarkMode === m.id ? '<i class="ri-check-line text-primary-600 font-bold shrink-0"></i>' : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="pt-5 border-t border-slate-100 dark:border-slate-800">
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white">Tema Warna Aksen</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">Warna utama untuk tombol, tautan, dan indikator aktif.</p>
                    <div class="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        ${Object.entries(themes).map(([key, th]) => `
                            <button type="button" onclick="window.applyTheme('${key}'); App.renderPreferencesModalContent();"
                                class="p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${curTheme === key ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-900/20 dark:ring-white/25' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'}">
                                <span class="w-6 h-6 rounded-full shadow-xs border border-white dark:border-slate-900" style="background:${th.shade}"></span>
                                <span class="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate w-full text-center">${th.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    if (activePrefSection === 'navigation') {
        return `
            <div class="space-y-6">
                <div>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white">Tata Letak Menu</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">Atur posisi bilah navigasi utama di seluruh halaman.</p>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        ${[
                            { id: 'sidebar', name: 'Sidebar Kiri', desc: 'Navigasi klasik di samping', icon: 'ri-layout-left-line' },
                            { id: 'bottom', name: 'Taskbar Bawah', desc: 'Bilah bawah & Start Menu', icon: 'ri-layout-bottom-line' },
                            { id: 'top', name: 'Bilah Atas', desc: 'Taskbar di bagian atas', icon: 'ri-layout-top-line' }
                        ].map((l) => `
                            <button type="button" onclick="App.setNavLayout('${l.id}'); App.renderPreferencesModalContent();"
                                class="p-3.5 rounded-2xl border text-left transition flex items-start gap-2.5 ${curLayout === l.id ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/40 ring-1 ring-primary-500/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'}">
                                <i class="${l.icon} text-lg ${curLayout === l.id ? 'text-primary-600' : 'text-slate-500'} shrink-0"></i>
                                <div>
                                    <div class="text-xs font-bold text-slate-800 dark:text-slate-100">${l.name}</div>
                                    <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">${l.desc}</div>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="pt-5 border-t border-slate-100 dark:border-slate-800">
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white">Gaya Submenu Start Menu</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">Berlaku saat menggunakan mode Taskbar Bawah atau Bilah Atas.</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        ${[
                            { id: 'panel', name: 'Gaya Panel (2 Kolom)', desc: 'Kategori di kiri, detail di kanan', icon: 'ri-layout-column-line' },
                            { id: 'cascading', name: 'Gaya Akordeon', desc: 'Daftar bertingkat vertikal', icon: 'ri-node-tree' }
                        ].map((s) => `
                            <button type="button" onclick="App.setWindowsSubmenuStyle('${s.id}'); App.renderPreferencesModalContent();"
                                class="p-3.5 rounded-2xl border text-left transition flex items-center gap-2.5 ${curWinSub === s.id ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/40 ring-1 ring-primary-500/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'}">
                                <i class="${s.icon} text-lg ${curWinSub === s.id ? 'text-primary-600' : 'text-slate-500'} shrink-0"></i>
                                <div>
                                    <div class="text-xs font-bold text-slate-800 dark:text-slate-100">${s.name}</div>
                                    <div class="text-[11px] text-slate-500 dark:text-slate-400">${s.desc}</div>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    if (activePrefSection === 'table') {
        return `
            <div class="space-y-6">
                <div>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white">Kerapatan Baris Tabel</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">Sesuaikan jarak antar baris data pada seluruh tabel.</p>
                    <div class="grid grid-cols-2 gap-2.5">
                        <button type="button" onclick="App.applyTableDensity('comfortable', true); App.renderPreferencesModalContent();"
                            class="px-3.5 py-3 rounded-xl border text-xs font-semibold transition ${curDensity === 'comfortable' ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}">
                            Nyaman (Standard)
                        </button>
                        <button type="button" onclick="App.applyTableDensity('compact', true); App.renderPreferencesModalContent();"
                            class="px-3.5 py-3 rounded-xl border text-xs font-semibold transition ${curDensity === 'compact' ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}">
                            Padat (Compact)
                        </button>
                    </div>
                </div>

                <div class="pt-5 border-t border-slate-100 dark:border-slate-800">
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white">Gaya Garis Tabel</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">Pilih tampilan pembatas baris dan kolom tabel.</p>
                    <div class="grid grid-cols-3 gap-2.5">
                        ${[
                            { id: 'zebra', label: 'Zebra' },
                            { id: 'bordered', label: 'Grid Penuh' },
                            { id: 'minimal', label: 'Minimalis' }
                        ].map((g) => `
                            <button type="button" onclick="App.applyTableGridStyle('${g.id}'); App.renderPreferencesModalContent();"
                                class="px-3 py-3 rounded-xl border text-xs font-semibold transition ${curGridStyle === g.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}">
                                ${g.label}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="pt-5 border-t border-slate-100 dark:border-slate-800">
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white">Ukuran Huruf</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">Skala teks antarmuka aplikasi.</p>
                    <div class="grid grid-cols-4 gap-2">
                        ${[
                            { id: 'small', label: 'Kecil' },
                            { id: 'normal', label: 'Normal' },
                            { id: 'large', label: 'Besar' },
                            { id: 'xl', label: 'XL' }
                        ].map((f) => `
                            <button type="button" onclick="App.applyFontSize('${f.id}'); App.renderPreferencesModalContent();"
                                class="py-2.5 rounded-xl border text-xs font-semibold transition ${curFontSize === f.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}">
                                ${f.label}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    if (activePrefSection === 'productivity') {
        return `
            <div class="space-y-6">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Halaman Awal Default</h4>
                        <select onchange="App.setFormatPref('pref_start_page', this.value)"
                            class="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl font-medium">
                            <option value="#/dashboard" ${curStartPage === '#/dashboard' ? 'selected' : ''}>Dashboard Utama</option>
                            <option value="#/projects" ${curStartPage === '#/projects' ? 'selected' : ''}>Manajemen Proyek</option>
                            <option value="#/invoices" ${curStartPage === '#/invoices' ? 'selected' : ''}>Faktur &amp; Tagihan</option>
                            <option value="#/tickets" ${curStartPage === '#/tickets' ? 'selected' : ''}>Tiket Support SLA</option>
                            <option value="#/clients" ${curStartPage === '#/clients' ? 'selected' : ''}>Daftar Pelanggan</option>
                        </select>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Baris Tabel Default</h4>
                        <select onchange="App.setFormatPref('pref_per_page', this.value)"
                            class="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl font-medium">
                            <option value="10" ${curPerPage === '10' ? 'selected' : ''}>10 baris / halaman</option>
                            <option value="15" ${curPerPage === '15' ? 'selected' : ''}>15 baris / halaman (Default)</option>
                            <option value="25" ${curPerPage === '25' ? 'selected' : ''}>25 baris / halaman</option>
                            <option value="50" ${curPerPage === '50' ? 'selected' : ''}>50 baris / halaman</option>
                        </select>
                    </div>
                </div>

                <label class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3 cursor-pointer">
                    <div>
                        <div class="text-xs font-bold text-slate-800 dark:text-slate-100">Mode Instan (Kurangi Animasi)</div>
                        <div class="text-[11px] text-slate-500 dark:text-slate-400">Matikan transisi &amp; animasi agar perpindahan layar terasa instan.</div>
                    </div>
                    <input type="checkbox" id="pref-reduced-motion-chk" ${curReducedMotion ? 'checked' : ''} class="w-4 h-4 rounded text-primary-600">
                </label>

                <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div>
                        <h4 class="text-sm font-bold text-slate-900 dark:text-white">Sinkronisasi Akun &amp; Profil JSON</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Simpan preferensi ke akun agar ikut saat login di perangkat lain, atau ekspor/impor berkas JSON.</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2.5">
                        <button type="button" id="btn-pref-sync-account" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition">
                            <i class="ri-cloud-line"></i><span>Simpan ke Akun</span>
                        </button>
                        <button type="button" id="btn-pref-export-json" class="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition">
                            <i class="ri-download-2-line"></i><span>Ekspor JSON</span>
                        </button>
                        <button type="button" id="btn-pref-import-json" class="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition">
                            <i class="ri-upload-2-line"></i><span>Impor JSON</span>
                        </button>
                        <input type="file" id="pref-import-file" accept=".json,application/json" class="hidden">
                    </div>
                </div>
            </div>
        `;
    }

    const sampleAmount = formatRupiah(15750000);
    const sampleDate = formatDate('2026-11-11');
    return `
        <div class="space-y-5">
            <div class="p-4 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border border-slate-800">
                <div>
                    <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Pratinjau Format Aktif</p>
                    <p class="text-sm font-bold mt-0.5 font-mono text-emerald-400">${escapeHtml(sampleAmount)}</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Tanggal</p>
                    <p class="text-xs font-semibold mt-0.5 text-slate-200">${escapeHtml(sampleDate)}</p>
                </div>
            </div>

            <div>
                <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Format Tanggal</h4>
                <select onchange="App.setFormatPref('pref_date_format', this.value)"
                    class="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl font-medium focus:outline-none focus:border-primary-500">
                    <option value="dmy" ${curDateFormat === 'dmy' ? 'selected' : ''}>DD/MM/YYYY (11/11/2026)</option>
                    <option value="ymd" ${curDateFormat === 'ymd' ? 'selected' : ''}>YYYY-MM-DD (2026-11-11)</option>
                    <option value="long" ${curDateFormat === 'long' ? 'selected' : ''}>11 Nov 2026</option>
                    <option value="full" ${curDateFormat === 'full' ? 'selected' : ''}>11 November 2026</option>
                </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Pemisah Ribuan</h4>
                    <select onchange="App.setFormatPref('pref_num_separator', this.value)"
                        class="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl font-medium">
                        <option value="id" ${curSeparator === 'id' ? 'selected' : ''}>Titik (1.000.000,00)</option>
                        <option value="en" ${curSeparator === 'en' ? 'selected' : ''}>Koma (1,000,000.00)</option>
                    </select>
                </div>
                <div>
                    <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Desimal</h4>
                    <select onchange="App.setFormatPref('pref_num_decimals', this.value)"
                        class="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl font-medium">
                        <option value="0" ${curDecimals === '0' ? 'selected' : ''}>0 Desimal (Bulat)</option>
                        <option value="2" ${curDecimals === '2' ? 'selected' : ''}>2 Desimal (,00)</option>
                    </select>
                </div>
                <div>
                    <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Simbol Mata Uang</h4>
                    <select onchange="App.setFormatPref('pref_num_currency_symbol', this.value)"
                        class="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl font-medium">
                        <option value="Rp " ${curSymbol === 'Rp ' ? 'selected' : ''}>Rp (Dengan Spasi)</option>
                        <option value="IDR " ${curSymbol === 'IDR ' ? 'selected' : ''}>IDR</option>
                        <option value="" ${curSymbol === '' ? 'selected' : ''}>Tanpa Simbol</option>
                    </select>
                </div>
            </div>
        </div>
    `;
}

export function renderPreferencesModalContent(navCtx) {
    const body = document.getElementById('pref-modal-body');
    if (!body) return;

    body.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            <aside class="md:col-span-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2 space-y-1">
                ${PREF_SECTIONS.map(sec => `
                    <button type="button" data-pref-sec="${sec.id}"
                        class="w-full text-left px-3 py-2.5 rounded-xl transition flex items-center gap-3 ${activePrefSection === sec.id ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 ring-1 ring-primary-200/70 dark:ring-primary-800/60' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800/60'}">
                        <div class="w-8 h-8 rounded-lg ${activePrefSection === sec.id ? 'bg-white dark:bg-slate-900 shadow-2xs' : 'bg-white/80 dark:bg-slate-800'} flex items-center justify-center shrink-0">
                            <i class="${sec.icon} text-base ${sec.color}"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="text-xs font-bold truncate">${sec.label}</div>
                            <div class="text-[11px] opacity-75 truncate">${sec.desc}</div>
                        </div>
                    </button>
                `).join('')}
            </aside>

            <div class="md:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
                ${_renderSectionBody(navCtx)}
            </div>
        </div>
    `;

    body.querySelectorAll('[data-pref-sec]').forEach((btn) => {
        btn.addEventListener('click', () => {
            activePrefSection = btn.getAttribute('data-pref-sec') || 'appearance';
            renderPreferencesModalContent(navCtx);
        });
    });

    body.querySelector('#pref-reduced-motion-chk')?.addEventListener('change', (e) => {
        navCtx.applyReducedMotion(e.target.checked, true);
    });

    body.querySelector('#btn-pref-sync-account')?.addEventListener('click', async () => {
        const res = await api('auth/preferences', {
            method: 'POST',
            body: { preferences: _collectPrefsFromStorage() }
        });
        if (res?.success) {
            toast(res.message || 'Preferensi disimpan ke akun', 'success');
        }
    });

    body.querySelector('#btn-pref-export-json')?.addEventListener('click', () => {
        const payload = JSON.stringify(_collectPrefsFromStorage(), null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'crudworks-preferences.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('Profil preferensi diekspor (JSON)', 'success');
    });

    const fileInput = body.querySelector('#pref-import-file');
    body.querySelector('#btn-pref-import-json')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const parsed = JSON.parse(await file.text());
            if (!parsed || typeof parsed !== 'object') throw new Error('Format JSON tidak valid');
            let applied = 0;
            PREF_KEYS.forEach((k) => {
                if (Object.prototype.hasOwnProperty.call(parsed, k) && parsed[k] !== null && parsed[k] !== undefined) {
                    localStorage.setItem(k, String(parsed[k]));
                    applied++;
                }
            });
            navCtx.initPreferences();
            if (typeof navCtx.onRouteRefresh === 'function') navCtx.onRouteRefresh();
            renderPreferencesModalContent(navCtx);
            toast(`${applied} setelan preferensi berhasil diimpor`, 'success');
        } catch (err) {
            toast(err?.message || 'Gagal mengimpor file preferensi', 'error');
        } finally {
            fileInput.value = '';
        }
    });
}

export function resetPreferences(navCtx) {
    try {
        PREF_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch (_) {}

    navCtx.applyDarkMode('light', false);
    navCtx.setNavLayout('sidebar');
    navCtx.setWindowsSubmenuStyle('panel', false);
    if (typeof window.applyTheme === 'function') window.applyTheme('orange');
    navCtx.applyFontSize('normal', false);
    navCtx.applyTableDensity('comfortable', false);
    navCtx.applyTableGridStyle('zebra', false);
    navCtx.applyReducedMotion(false, false);
    renderPreferencesModalContent(navCtx);
    if (typeof navCtx.onRouteRefresh === 'function') navCtx.onRouteRefresh();
    toast('Preferensi dikembalikan ke setelan awal', 'success', 2000);
}
