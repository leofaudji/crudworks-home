// assets/js/pages/profit-loss.js
import { App } from '../app.js';

let activeSubTab = 'bulanan'; // 'bulanan' | 'tahunan' | 'proyek' | 'aset-beban'
let plCurrentData = null;

export async function init(container) {
    const currentYear = new Date().getFullYear();
    const startDefault = `${currentYear}-01-01`;
    const endDefault = new Date().toISOString().split('T')[0];

    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header & Filter Bar -->
            <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-2">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="p-2 rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
                            <i class="ri-scales-3-line text-xl"></i>
                        </span>
                        <div>
                            <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Laba Rugi & Profitabilitas</h1>
                            <p class="text-xs text-slate-500 dark:text-slate-400">Analisis laba bersih, efisiensi beban server/cloud, dan margin keuntungan proyek.</p>
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <!-- Export Actions -->
                    <button id="btn-export-pl-pdf" class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition">
                        <i class="ri-file-pdf-2-line text-rose-400 text-sm"></i>
                        <span>Pratinjau PDF</span>
                    </button>
                    <button id="btn-download-pl-pdf" class="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition">
                        <i class="ri-download-line text-sm"></i>
                        <span>Unduh PDF</span>
                    </button>
                    <button id="btn-export-pl-csv" class="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition">
                        <i class="ri-file-excel-2-line text-sm"></i>
                        <span>Ekspor Excel/CSV</span>
                    </button>
                </div>
            </div>

            <!-- Filter Controls Bar -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div class="flex flex-wrap items-center gap-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold uppercase text-slate-500">Mode Analisis:</span>
                        <select id="pl-filter-mode" class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary-500">
                            <option value="bulanan" selected>Tahun Berjalan (12 Bulan)</option>
                            <option value="tahunan">Multi-Tahun (Komparasi)</option>
                            <option value="kustom">Rentang Tanggal Kustom</option>
                        </select>
                    </div>

                    <div id="pl-year-select-box" class="flex items-center gap-2">
                        <span class="text-xs font-bold uppercase text-slate-500">Tahun:</span>
                        <select id="pl-filter-year" class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary-500">
                            <option value="${currentYear + 1}">${currentYear + 1}</option>
                            <option value="${currentYear}" selected>${currentYear}</option>
                            <option value="${currentYear - 1}">${currentYear - 1}</option>
                            <option value="${currentYear - 2}">${currentYear - 2}</option>
                            <option value="${currentYear - 3}">${currentYear - 3}</option>
                        </select>
                    </div>

                    <div id="pl-custom-dates-box" class="hidden flex items-center gap-2">
                        <input type="date" id="pl-filter-start" value="${startDefault}" class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-200">
                        <span class="text-xs text-slate-400">s/d</span>
                        <input type="date" id="pl-filter-end" value="${endDefault}" class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-200">
                    </div>

                    <button id="btn-refresh-pl" class="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5">
                        <i class="ri-refresh-line text-sm"></i>
                        <span>Muat Data</span>
                    </button>
                </div>

                <div class="flex items-center gap-2">
                    <span id="pl-active-period-badge" class="px-3 py-1 rounded-xl text-xs font-bold bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/40 font-mono">
                        Tahun ${currentYear}
                    </span>
                </div>
            </div>

            <!-- Top KPI Cards Overview (5 cards) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <!-- KPI 1: Realisasi Kas Masuk -->
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        <span>Pendapatan Kas Masuk</span>
                        <i class="ri-arrow-down-circle-line text-emerald-500 text-base"></i>
                    </div>
                    <div id="pl-kpi-rev" class="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">Rp 0</div>
                    <div id="pl-sub-rev" class="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-mono truncate">
                        Tagihan Terbit: Rp 0
                    </div>
                </div>

                <!-- KPI 2: Beban Operasional Riil -->
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        <span>Beban Operasional</span>
                        <i class="ri-arrow-up-circle-line text-rose-500 text-base"></i>
                    </div>
                    <div id="pl-kpi-exp" class="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">Rp 0</div>
                    <div id="pl-sub-exp" class="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-mono truncate">
                        Server & Cloud: Rp 0
                    </div>
                </div>

                <!-- KPI 3: Estimasi Biaya Aset & Cloud -->
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        <span>Estimasi Biaya Aset</span>
                        <i class="ri-cloud-line text-sky-500 text-base"></i>
                    </div>
                    <div id="pl-kpi-asset" class="text-2xl font-black font-mono text-sky-600 dark:text-sky-400">Rp 0</div>
                    <div id="pl-sub-asset" class="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-mono truncate">
                        Setahun: Rp 0 (0 aset)
                    </div>
                </div>

                <!-- KPI 4: Laba Bersih Operasional -->
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        <span>Laba Bersih</span>
                        <span id="pl-badge-status" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 uppercase">SURPLUS</span>
                    </div>
                    <div id="pl-kpi-net" class="text-2xl font-black font-mono text-slate-900 dark:text-white">Rp 0</div>
                    <div id="pl-sub-net" class="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-mono truncate">
                        Kas Masuk - Beban
                    </div>
                </div>

                <!-- KPI 5: Margin Keuntungan Bersih -->
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        <span>Net Profit Margin</span>
                        <i class="ri-percent-line text-primary-500 text-base"></i>
                    </div>
                    <div id="pl-kpi-margin" class="text-2xl font-black font-mono text-primary-600 dark:text-primary-400">0%</div>
                    <div id="pl-sub-margin" class="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-mono truncate">
                        Rasio Laba thd Kas Masuk
                    </div>
                </div>
            </div>

            <!-- Banner Rasio Beban Cloud vs Kas Masuk -->
            <div class="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl shadow-md border border-slate-800 relative overflow-hidden">
                <div class="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div>
                        <div class="text-xs uppercase font-bold tracking-wider text-indigo-300">Rasio Beban Infrastruktur Cloud</div>
                        <div id="pl-banner-ratio" class="text-3xl font-black font-mono mt-1 text-white">0%</div>
                        <div id="pl-banner-status" class="text-xs text-indigo-200 mt-1">
                            Memuat analisis beban aset...
                        </div>
                    </div>
                    <div class="md:col-span-2 space-y-2">
                        <div class="flex justify-between text-xs font-mono text-indigo-200">
                            <span>Estimasi Beban Aset Setahun: <b id="pl-banner-asset-yearly" class="text-white">Rp 0</b></span>
                            <span>Pendapatan Kas Masuk: <b id="pl-banner-rev" class="text-emerald-400">Rp 0</b></span>
                        </div>
                        <div class="w-full bg-slate-800/80 rounded-full h-3.5 overflow-hidden flex border border-indigo-500/30">
                            <div id="pl-bar-asset" class="bg-sky-500 h-full transition-all duration-500" style="width: 0%" title="Estimasi Aset/Cloud"></div>
                            <div id="pl-bar-exp" class="bg-rose-500 h-full transition-all duration-500" style="width: 0%" title="Beban Operasional Lain"></div>
                            <div id="pl-bar-net" class="bg-emerald-500 h-full transition-all duration-500" style="width: 0%" title="Laba Bersih"></div>
                        </div>
                        <div class="flex items-center gap-4 text-[11px] text-indigo-200">
                            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span> Biaya Aset/Cloud</span>
                            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Beban Lainnya</span>
                            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Laba Bersih</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sub-Tab Navigation (Ramping & Tanpa Perlu Scroll Jauh ke Bawah) -->
            <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button class="sub-tab-btn px-4 py-2 rounded-xl font-bold text-xs transition ${activeSubTab === 'bulanan' ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-subtab="bulanan">
                    <i class="ri-calendar-event-line mr-1"></i> Rincian 12 Bulan (Jan – Des)
                </button>
                <button class="sub-tab-btn px-4 py-2 rounded-xl font-bold text-xs transition ${activeSubTab === 'tahunan' ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-subtab="tahunan">
                    <i class="ri-line-chart-line mr-1"></i> Tren Tahunan (Multi-Year)
                </button>
                <button class="sub-tab-btn px-4 py-2 rounded-xl font-bold text-xs transition ${activeSubTab === 'proyek' ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-subtab="proyek">
                    <i class="ri-briefcase-line mr-1"></i> Profitabilitas Proyek
                </button>
                <button class="sub-tab-btn px-4 py-2 rounded-xl font-bold text-xs transition ${activeSubTab === 'aset-beban' ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-subtab="aset-beban">
                    <i class="ri-server-line mr-1"></i> Beban & Komitmen Aset Cloud
                </button>
            </div>

            <!-- Sub-Tab Content Viewport (Semua Pas 1 Layar, Mudah Dibaca) -->
            <div id="pl-subtab-container"></div>
        </div>
    `;

    // Bind Filter Controls
    const modeSelect = document.getElementById('pl-filter-mode');
    const yearBox = document.getElementById('pl-year-select-box');
    const customDates = document.getElementById('pl-custom-dates-box');

    modeSelect.addEventListener('change', () => {
        const val = modeSelect.value;
        if (val === 'bulanan') {
            yearBox.classList.remove('hidden');
            customDates.classList.add('hidden');
            switchSubTab('bulanan');
        } else if (val === 'tahunan') {
            yearBox.classList.remove('hidden');
            customDates.classList.add('hidden');
            switchSubTab('tahunan');
        } else if (val === 'kustom') {
            yearBox.classList.add('hidden');
            customDates.classList.remove('hidden');
            switchSubTab('bulanan');
        }
    });

    document.getElementById('btn-refresh-pl').addEventListener('click', () => loadProfitLossData());
    document.getElementById('pl-filter-year').addEventListener('change', () => loadProfitLossData());

    // Sub-tab buttons click
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabKey = btn.getAttribute('data-subtab');
            switchSubTab(tabKey);
        });
    });

    // Bind Export Buttons
    document.getElementById('btn-export-pl-pdf')?.addEventListener('click', () => exportProfitLossPdf('bloburl'));
    document.getElementById('btn-download-pl-pdf')?.addEventListener('click', () => exportProfitLossPdf('download'));
    document.getElementById('btn-export-pl-csv')?.addEventListener('click', () => exportProfitLossCsv());

    // Initial Load
    await loadProfitLossData();
}

function switchSubTab(tabKey) {
    activeSubTab = tabKey;
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        const matches = btn.getAttribute('data-subtab') === tabKey;
        btn.className = `sub-tab-btn px-4 py-2 rounded-xl font-bold text-xs transition ${matches ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`;
    });
    renderActiveSubTab();
}

async function loadProfitLossData() {
    const mode = document.getElementById('pl-filter-mode')?.value || 'bulanan';
    const tahun = document.getElementById('pl-filter-year')?.value || new Date().getFullYear();
    const s = document.getElementById('pl-filter-start')?.value || `${tahun}-01-01`;
    const e = document.getElementById('pl-filter-end')?.value || `${tahun}-12-31`;

    let ep = `reports/profit-loss?tahun=${tahun}`;
    if (mode === 'kustom') {
        ep = `reports/profit-loss?start_date=${s}&end_date=${e}`;
    }

    const badgeEl = document.getElementById('pl-active-period-badge');
    if (badgeEl) {
        badgeEl.textContent = (mode === 'kustom') ? `${App.formatDate(s)} s/d ${App.formatDate(e)}` : `Tahun ${tahun}`;
    }

    const res = await App.api(ep);
    if (!res || !res.success) return;

    plCurrentData = res.data;
    const { ringkasan } = res.data;

    // 1. KPI Cards
    document.getElementById('pl-kpi-rev').textContent = App.formatIDR(ringkasan.total_pendapatan);
    document.getElementById('pl-sub-rev').textContent = `Tagihan Terbit: ${App.formatIDR(ringkasan.total_tagihan)} (${ringkasan.jml_faktur || 0} faktur)`;

    document.getElementById('pl-kpi-exp').textContent = App.formatIDR(ringkasan.total_beban);
    document.getElementById('pl-sub-exp').textContent = `Server & Cloud: ${App.formatIDR(ringkasan.total_server_cloud)} (${ringkasan.jml_pengeluaran || 0} beban)`;

    const assetBurnMonth = ringkasan.estimasi_aset?.est_monthly_burn || 0;
    const assetBurnYear = ringkasan.estimasi_aset?.est_yearly_burn || 0;
    const assetActiveCount = ringkasan.estimasi_aset?.active_count || 0;
    document.getElementById('pl-kpi-asset').textContent = `${App.formatIDR(assetBurnMonth)} / bln`;
    document.getElementById('pl-sub-asset').textContent = `Setahun: ${App.formatIDR(assetBurnYear)} (${assetActiveCount} aset aktif)`;

    const netEl = document.getElementById('pl-kpi-net');
    netEl.textContent = App.formatIDR(ringkasan.laba_bersih);
    netEl.className = `text-2xl font-black font-mono ${ringkasan.laba_bersih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`;

    const statusBadge = document.getElementById('pl-badge-status');
    if (statusBadge) {
        statusBadge.textContent = ringkasan.laba_bersih >= 0 ? 'SURPLUS' : 'DEFISIT';
        statusBadge.className = `px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ringkasan.laba_bersih >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'}`;
    }

    document.getElementById('pl-kpi-margin').textContent = `${ringkasan.profit_margin_persen}%`;

    // 2. Banner Ratio & Progress Bar
    const ratio = ringkasan.estimasi_aset?.ratio_thd_pendapatan_persen || 0;
    document.getElementById('pl-banner-ratio').textContent = `${ratio}%`;
    document.getElementById('pl-banner-asset-yearly').textContent = App.formatIDR(assetBurnYear);
    document.getElementById('pl-banner-rev').textContent = App.formatIDR(ringkasan.total_pendapatan);

    const bannerStatusEl = document.getElementById('pl-banner-status');
    if (ratio === 0 && ringkasan.total_pendapatan === 0) {
        bannerStatusEl.textContent = 'Belum ada pendapatan kas masuk tercatat pada periode ini.';
    } else if (ratio < 15) {
        bannerStatusEl.innerHTML = `<span class="text-emerald-300 font-bold">Infrastruktur Sangat Efisien:</span> Biaya server & cloud hanya menyerap ${ratio}% dari total pendapatan.`;
    } else if (ratio <= 35) {
        bannerStatusEl.innerHTML = `<span class="text-sky-300 font-bold">Infrastruktur Proporsional:</span> Biaya cloud berada dalam batas wajar industri IT (${ratio}% dari omset).`;
    } else {
        bannerStatusEl.innerHTML = `<span class="text-amber-300 font-bold">Perlu Optimalisasi:</span> Biaya cloud menyerap ${ratio}% dari kas masuk. Periksa pemanfaatan server & langganan.`;
    }

    // Progress Bar segments
    const totalRev = Math.max(1, ringkasan.total_pendapatan);
    const assetPct = Math.min(100, Math.round((assetBurnYear / totalRev) * 100));
    const otherExpPct = Math.min(100 - assetPct, Math.round((ringkasan.total_beban_lain / totalRev) * 100));
    const netPct = Math.max(0, 100 - assetPct - otherExpPct);

    document.getElementById('pl-bar-asset').style.width = `${assetPct}%`;
    document.getElementById('pl-bar-exp').style.width = `${otherExpPct}%`;
    document.getElementById('pl-bar-net').style.width = `${netPct}%`;

    // 3. Render Active SubTab
    renderActiveSubTab();
}

function renderActiveSubTab() {
    const cont = document.getElementById('pl-subtab-container');
    if (!cont || !plCurrentData) return;

    if (activeSubTab === 'bulanan') renderMonthlySubTab(cont);
    else if (activeSubTab === 'tahunan') renderYearlySubTab(cont);
    else if (activeSubTab === 'proyek') renderProjectsSubTab(cont);
    else if (activeSubTab === 'aset-beban') renderAssetsExpensesSubTab(cont);
}

// 1. Sub-Tab: Rincian 12 Bulan (Jan - Des)
function renderMonthlySubTab(container) {
    const tahun = document.getElementById('pl-filter-year')?.value || new Date().getFullYear();
    const { analisis_bulanan } = plCurrentData;

    container.innerHTML = `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-calendar-event-line text-primary-600"></i>
                        <span>Rincian Laba / Rugi Bulanan (Januari – Desember)</span>
                    </h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Perbandingan kas penerimaan tagihan, realisasi beban operasional, dan surplus/defisit bersih setiap bulan.
                    </p>
                </div>
                <span class="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                    Tahun ${tahun}
                </span>
            </div>

            <div class="overflow-x-auto">
                <table class="data-table w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800">
                            <th class="py-3 px-4">Bulan</th>
                            <th class="py-3 px-4 text-right">Kas Masuk (Rp)</th>
                            <th class="py-3 px-4 text-right">Tagihan Terbit (Rp)</th>
                            <th class="py-3 px-4 text-right text-sky-600">Beban Server/Cloud</th>
                            <th class="py-3 px-4 text-right">Beban Operasional Lain</th>
                            <th class="py-3 px-4 text-right text-rose-600">Total Beban</th>
                            <th class="py-3 px-4 text-right font-black">Laba / Rugi Bersih</th>
                            <th class="py-3 px-4 text-center">Margin %</th>
                            <th class="py-3 px-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        ${generateMonthlyRows(analisis_bulanan)}
                    </tbody>
                    <tfoot class="bg-slate-50 dark:bg-slate-800/60 font-mono font-bold border-t-2 border-slate-200 dark:border-slate-700">
                        ${generateMonthlyFooter(analisis_bulanan, tahun)}
                    </tfoot>
                </table>
            </div>
        </div>
    `;
}

function generateMonthlyRows(analisis_bulanan) {
    if (!Array.isArray(analisis_bulanan) || analisis_bulanan.length === 0) {
        return `<tr><td colspan="9" class="py-8 text-center text-slate-400">Tidak ada rincian data bulanan pada periode ini</td></tr>`;
    }

    return analisis_bulanan.map(b => `
        <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
            <td class="py-2.5 px-4 font-sans font-bold text-slate-800 dark:text-slate-200">
                ${b.bulan_nama}
            </td>
            <td class="py-2.5 px-4 text-right text-emerald-600 font-bold">${App.formatIDR(b.pendapatan_kas)}</td>
            <td class="py-2.5 px-4 text-right text-slate-500">${App.formatIDR(b.tagihan_terbit)}</td>
            <td class="py-2.5 px-4 text-right text-sky-600">${App.formatIDR(b.beban_server_cloud)}</td>
            <td class="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400">${App.formatIDR(b.beban_operasional_lain)}</td>
            <td class="py-2.5 px-4 text-right text-rose-600 font-bold">${App.formatIDR(b.beban_operasional)}</td>
            <td class="py-2.5 px-4 text-right font-black ${b.laba_bersih >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}">
                ${App.formatIDR(b.laba_bersih)}
            </td>
            <td class="py-2.5 px-4 text-center">
                <span class="font-bold ${b.margin_persen >= 30 ? 'text-emerald-600' : (b.margin_persen >= 0 ? 'text-amber-600' : 'text-rose-600')}">
                    ${b.margin_persen}%
                </span>
            </td>
            <td class="py-2.5 px-4 text-center">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${b.status === 'surplus' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'} uppercase">
                    ${b.status}
                </span>
            </td>
        </tr>
    `).join('');
}

function generateMonthlyFooter(analisis_bulanan, tahun) {
    if (!Array.isArray(analisis_bulanan) || analisis_bulanan.length === 0) return '';

    let totRev = 0, totInv = 0, totCloud = 0, totOther = 0, totExp = 0, totNet = 0;
    analisis_bulanan.forEach(b => {
        totRev += b.pendapatan_kas;
        totInv += b.tagihan_terbit;
        totCloud += b.beban_server_cloud;
        totOther += b.beban_operasional_lain;
        totExp += b.beban_operasional;
        totNet += b.laba_bersih;
    });

    const totMargin = totRev > 0 ? Math.round((totNet / totRev) * 1000) / 10 : 0;

    return `
        <tr>
            <td class="py-3 px-4 font-sans uppercase">TOTAL ${tahun}:</td>
            <td class="py-3 px-4 text-right text-emerald-600 font-black">${App.formatIDR(totRev)}</td>
            <td class="py-3 px-4 text-right text-slate-600 dark:text-slate-300">${App.formatIDR(totInv)}</td>
            <td class="py-3 px-4 text-right text-sky-600">${App.formatIDR(totCloud)}</td>
            <td class="py-3 px-4 text-right text-slate-600 dark:text-slate-300">${App.formatIDR(totOther)}</td>
            <td class="py-3 px-4 text-right text-rose-600 font-black">${App.formatIDR(totExp)}</td>
            <td class="py-3 px-4 text-right font-black ${totNet >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}">${App.formatIDR(totNet)}</td>
            <td class="py-3 px-4 text-center font-bold">${totMargin}%</td>
            <td class="py-3 px-4 text-center">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${totNet >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'} uppercase">
                    ${totNet >= 0 ? 'SURPLUS' : 'DEFISIT'}
                </span>
            </td>
        </tr>
    `;
}

// 2. Sub-Tab: Tren Multi-Tahun
function renderYearlySubTab(container) {
    const activeYear = document.getElementById('pl-filter-year')?.value || new Date().getFullYear();
    const { analisis_tahunan } = plCurrentData;

    container.innerHTML = `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-line-chart-line text-emerald-600"></i>
                        <span>Komparasi Kinerja Finansial Multi-Tahun (Year-over-Year)</span>
                    </h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Perbandingan performa laba bersih, realisasi kas masuk, serta efisiensi beban dari tahun ke tahun.
                    </p>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="data-table w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800">
                            <th class="py-3 px-4">Tahun Buku</th>
                            <th class="py-3 px-4 text-right">Realisasi Kas Masuk</th>
                            <th class="py-3 px-4 text-right">Total Tagihan Terbit</th>
                            <th class="py-3 px-4 text-right">Total Beban Operasional</th>
                            <th class="py-3 px-4 text-right text-sky-600">Est. Biaya Aset / Thn</th>
                            <th class="py-3 px-4 text-right font-black">Laba Bersih</th>
                            <th class="py-3 px-4 text-center">Net Margin</th>
                            <th class="py-3 px-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        ${generateYearlyRows(analisis_tahunan, activeYear)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function generateYearlyRows(analisis_tahunan, activeYear) {
    if (!Array.isArray(analisis_tahunan) || analisis_tahunan.length === 0) {
        return `<tr><td colspan="8" class="py-8 text-center text-slate-400">Tidak ada riwayat data tahunan</td></tr>`;
    }

    return analisis_tahunan.map(y => `
        <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 ${y.tahun == activeYear ? 'bg-primary-50/40 dark:bg-primary-950/25 font-bold' : ''}">
            <td class="py-3 px-4 font-sans text-slate-900 dark:text-white flex items-center gap-1.5">
                <span class="font-bold text-sm">${y.tahun}</span>
                ${y.tahun == activeYear ? '<span class="px-2 py-0.5 text-[9px] bg-primary-600 text-white rounded-lg font-sans uppercase">Dipilih</span>' : ''}
            </td>
            <td class="py-3 px-4 text-right text-emerald-600 font-bold">${App.formatIDR(y.pendapatan_kas)}</td>
            <td class="py-3 px-4 text-right text-slate-500">${App.formatIDR(y.tagihan_terbit)}</td>
            <td class="py-3 px-4 text-right text-rose-600 font-bold">${App.formatIDR(y.beban_operasional)}</td>
            <td class="py-3 px-4 text-right text-sky-600">${App.formatIDR(y.estimasi_biaya_aset)}</td>
            <td class="py-3 px-4 text-right font-black ${y.laba_bersih >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}">
                ${App.formatIDR(y.laba_bersih)}
            </td>
            <td class="py-3 px-4 text-center font-bold ${y.margin_persen >= 30 ? 'text-emerald-600' : (y.margin_persen >= 0 ? 'text-amber-600' : 'text-rose-600')}">
                ${y.margin_persen}%
            </td>
            <td class="py-3 px-4 text-center">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${y.status === 'surplus' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'} uppercase">
                    ${y.status}
                </span>
            </td>
        </tr>
    `).join('');
}

// 3. Sub-Tab: Profitabilitas Proyek
function renderProjectsSubTab(container) {
    const { profitabilitas_proyek } = plCurrentData;

    container.innerHTML = `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-briefcase-line text-emerald-600"></i>
                        <span>Analisis Margin Keuntungan per Proyek</span>
                    </h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Rasio laba bersih dan tingkat pengembalian (ROI) per proyek berdasarkan realisasi penagihan vs biaya proyek.
                    </p>
                </div>
                <a href="#/projects" class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition">
                    <span>Buka Modul Proyek</span>
                    <i class="ri-arrow-right-line"></i>
                </a>
            </div>

            <div class="overflow-x-auto">
                <table class="data-table w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800">
                            <th class="py-3 px-4">Nama Proyek & Klien</th>
                            <th class="py-3 px-4 text-right">Pendapatan Proyek</th>
                            <th class="py-3 px-4 text-right text-rose-500">Beban / Biaya Terkait</th>
                            <th class="py-3 px-4 text-right font-black">Margin Bersih</th>
                            <th class="py-3 px-4 text-center">ROI / Margin %</th>
                            <th class="py-3 px-4 text-center">Kesehatan Margin</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        ${generateProjectsRows(profitabilitas_proyek)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function generateProjectsRows(profitabilitas_proyek) {
    if (!Array.isArray(profitabilitas_proyek) || profitabilitas_proyek.length === 0) {
        return `<tr><td colspan="6" class="py-8 text-center text-slate-400">Tidak ada proyek aktif atau berpenghasilan ditemukan</td></tr>`;
    }

    return profitabilitas_proyek.map(p => `
        <tr class="hover:bg-slate-50/50">
            <td class="py-3 px-4 font-sans font-bold text-slate-800 dark:text-slate-200">
                ${p.nama_project}
                <div class="text-[10px] text-slate-400 font-normal">${p.nama_perusahaan}</div>
            </td>
            <td class="py-3 px-4 text-right text-emerald-600 font-bold">${App.formatIDR(p.pendapatan_proyek)}</td>
            <td class="py-3 px-4 text-right text-rose-500 font-bold">${App.formatIDR(p.beban_proyek)}</td>
            <td class="py-3 px-4 text-right font-black ${p.margin_bersih >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}">
                ${App.formatIDR(p.margin_bersih)}
            </td>
            <td class="py-3 px-4 text-center">
                <span class="font-bold ${p.margin_persen >= 30 ? 'text-emerald-600' : (p.margin_persen >= 0 ? 'text-amber-600' : 'text-rose-600')}">
                    ${p.margin_persen}%
                </span>
            </td>
            <td class="py-3 px-4 text-center">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${p.margin_persen >= 30 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : (p.margin_persen >= 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400')}">
                    ${p.margin_persen >= 30 ? 'Sangat Sehat' : (p.margin_persen >= 0 ? 'Moderat' : 'Defisit')}
                </span>
            </td>
        </tr>
    `).join('');
}

// 4. Sub-Tab: Beban & Komitmen Aset Cloud
function renderAssetsExpensesSubTab(container) {
    const { beban_per_kategori, aset_aktif } = plCurrentData;

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left: Breakdown Beban Berdasarkan Kategori -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-pie-chart-line text-indigo-500"></i>
                        <span>Beban Berdasarkan Kategori</span>
                    </h3>
                    <a href="#/expenses" class="text-xs text-primary-600 hover:underline">Kelola Beban</a>
                </div>

                <div class="space-y-3 font-mono text-xs">
                    ${generateCategoriesList(beban_per_kategori)}
                </div>
            </div>

            <!-- Right: Komitmen Aset & Langganan Cloud Aktif -->
            <div class="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-server-line text-sky-600"></i>
                            <span>Komitmen Biaya Server & Aset Cloud Aktif</span>
                        </h3>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Burn rate bulanan dan tahunan untuk server, VPS, domain, dan lisensi SaaS pihak luar.
                        </p>
                    </div>
                    <a href="#/company-assets" class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition">
                        <span>Kelola Master Aset</span>
                        <i class="ri-arrow-right-line"></i>
                    </a>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800">
                                <th class="py-2.5 px-4">Nama Layanan & Provider</th>
                                <th class="py-2.5 px-4">Kategori & Siklus</th>
                                <th class="py-2.5 px-4 text-right">Biaya Asli</th>
                                <th class="py-2.5 px-4 text-right text-sky-600">Burn Bulanan</th>
                                <th class="py-2.5 px-4 text-right text-indigo-600">Burn Tahunan</th>
                                <th class="py-2.5 px-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                            ${generateAssetsRows(aset_aktif)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function generateCategoriesList(beban_per_kategori) {
    if (!Array.isArray(beban_per_kategori) || beban_per_kategori.length === 0) {
        return `<div class="text-slate-400 text-center py-6">Belum ada transaksi beban pada periode ini.</div>`;
    }

    return beban_per_kategori.map(c => `
        <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${c.warna || '#64748b'}"></span>
                <span class="font-bold text-slate-800 dark:text-slate-200 font-sans">${c.nama_kategori}</span>
            </div>
            <div class="text-right">
                <div class="font-bold text-slate-900 dark:text-white">${App.formatIDR(c.total)}</div>
                <div class="text-[10px] text-slate-400 font-sans">${c.count} transaksi</div>
            </div>
        </div>
    `).join('');
}

function generateAssetsRows(aset_aktif) {
    if (!Array.isArray(aset_aktif) || aset_aktif.length === 0) {
        return `<tr><td colspan="6" class="py-8 text-center text-slate-400">Belum ada aset / langganan cloud aktif. Tambahkan di menu Aset & Langganan Cloud.</td></tr>`;
    }

    return aset_aktif.map(a => `
        <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
            <td class="py-2.5 px-4 font-sans font-bold text-slate-800 dark:text-slate-200">
                ${a.nama_aset}
                <div class="text-[10px] text-slate-400 font-normal">${a.provider || 'Provider Eksternal'}</div>
            </td>
            <td class="py-2.5 px-4 font-sans">
                <span class="capitalize text-slate-600 dark:text-slate-300 font-medium">${a.kategori}</span>
                <span class="text-[10px] text-slate-400 block capitalize">Siklus: ${a.siklus}</span>
            </td>
            <td class="py-2.5 px-4 text-right text-slate-600 dark:text-slate-300">
                ${a.mata_uang !== 'IDR' ? `${a.mata_uang} ${Number(a.biaya).toLocaleString()} (~${App.formatIDR(a.biaya_idr)})` : App.formatIDR(a.biaya_idr)}
            </td>
            <td class="py-2.5 px-4 text-right text-sky-600 font-bold">${App.formatIDR(a.burn_bulanan)}</td>
            <td class="py-2.5 px-4 text-right text-indigo-600 font-bold">${App.formatIDR(a.burn_tahunan)}</td>
            <td class="py-2.5 px-4 text-center">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${a.status === 'aktif' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'} capitalize">
                    ${a.status}
                </span>
            </td>
        </tr>
    `).join('');
}

// Export to PDF
async function exportProfitLossPdf(output = 'bloburl') {
    if (!plCurrentData) {
        App.toast('Data laba rugi belum dimuat', 'warning');
        return;
    }

    try {
        const mode = document.getElementById('pl-filter-mode')?.value || 'bulanan';
        const tahun = document.getElementById('pl-filter-year')?.value || new Date().getFullYear();
        const s = document.getElementById('pl-filter-start')?.value || `${tahun}-01-01`;
        const e = document.getElementById('pl-filter-end')?.value || `${tahun}-12-31`;

        const { ringkasan, analisis_bulanan, analisis_tahunan, profitabilitas_proyek } = plCurrentData;
        const sections = [];

        // 1. Tabel Bulanan
        if (Array.isArray(analisis_bulanan) && analisis_bulanan.length > 0) {
            const mBody = analisis_bulanan.map(b => [
                b.bulan_nama,
                App.formatIDR(b.pendapatan_kas),
                App.formatIDR(b.beban_server_cloud),
                App.formatIDR(b.beban_operasional_lain),
                App.formatIDR(b.beban_operasional),
                App.formatIDR(b.laba_bersih),
                `${b.margin_persen}%`,
                b.status.toUpperCase()
            ]);

            sections.push({
                type: 'table',
                heading: `Rincian Laba / Rugi Bulanan — Tahun ${tahun}`,
                head: ['Bulan', 'Kas Masuk', 'Server/Cloud', 'Beban Lain', 'Total Beban', 'Laba Bersih', 'Margin', 'Status'],
                body: mBody,
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    1: { halign: 'right', textColor: [4, 120, 87] },
                    2: { halign: 'right', textColor: [2, 132, 199] },
                    3: { halign: 'right' },
                    4: { halign: 'right', textColor: [225, 29, 72] },
                    5: { halign: 'right', fontStyle: 'bold' },
                    6: { halign: 'center' },
                    7: { halign: 'center', fontStyle: 'bold' }
                }
            });
        }

        // 2. Komparasi Tahunan
        if (Array.isArray(analisis_tahunan) && analisis_tahunan.length > 0) {
            const yBody = analisis_tahunan.map(y => [
                String(y.tahun),
                App.formatIDR(y.pendapatan_kas),
                App.formatIDR(y.tagihan_terbit),
                App.formatIDR(y.beban_operasional),
                App.formatIDR(y.estimasi_biaya_aset),
                App.formatIDR(y.laba_bersih),
                `${y.margin_persen}%`,
                y.status.toUpperCase()
            ]);

            sections.push({
                type: 'table',
                heading: 'Komparasi Kinerja Finansial Multi-Tahun',
                head: ['Tahun', 'Kas Masuk', 'Tagihan Terbit', 'Beban Operasional', 'Est. Aset/Thn', 'Laba Bersih', 'Margin', 'Status'],
                body: yBody,
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    1: { halign: 'right', textColor: [4, 120, 87] },
                    2: { halign: 'right' },
                    3: { halign: 'right', textColor: [225, 29, 72] },
                    4: { halign: 'right', textColor: [2, 132, 199] },
                    5: { halign: 'right', fontStyle: 'bold' },
                    6: { halign: 'center' },
                    7: { halign: 'center', fontStyle: 'bold' }
                }
            });
        }

        // 3. Profitabilitas Proyek
        if (Array.isArray(profitabilitas_proyek) && profitabilitas_proyek.length > 0) {
            const pBody = profitabilitas_proyek.map(p => [
                `${p.nama_project}\n(${p.nama_perusahaan})`,
                App.formatIDR(p.pendapatan_proyek),
                App.formatIDR(p.beban_proyek),
                App.formatIDR(p.margin_bersih),
                `${p.margin_persen}%`
            ]);
            sections.push({
                type: 'table',
                heading: 'Rincian Profitabilitas per Proyek',
                head: ['Proyek & Klien', 'Pendapatan', 'Beban', 'Margin Bersih', 'ROI %'],
                body: pBody,
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    1: { halign: 'right', textColor: [4, 120, 87] },
                    2: { halign: 'right', textColor: [225, 29, 72] },
                    3: { halign: 'right', fontStyle: 'bold' },
                    4: { halign: 'center', fontStyle: 'bold' }
                }
            });
        }

        const assetBurnYear = ringkasan.estimasi_aset?.est_yearly_burn || 0;

        const pdfRes = await App.exportPdf({
            filename: `laporan_laba_rugi_${mode === 'kustom' ? `${s}_sd_${e}` : `tahun_${tahun}`}.pdf`,
            title: 'LAPORAN LABA RUGI OPERASIONAL & PROFITABILITAS',
            subtitle: mode === 'kustom' ? `Periode: ${App.formatDate(s)} s/d ${App.formatDate(e)}` : `Tahun Buku: ${tahun}`,
            orientation: 'landscape',
            output,
            summaryCards: [
                { label: 'Realisasi Kas Masuk', value: App.formatIDR(ringkasan.total_pendapatan), tone: 'success' },
                { label: 'Total Beban Riil', value: App.formatIDR(ringkasan.total_beban), tone: 'danger' },
                { label: 'Est. Biaya Aset Setahun', value: App.formatIDR(assetBurnYear), tone: 'warning' },
                { label: 'Laba Bersih Operasional', value: App.formatIDR(ringkasan.laba_bersih), tone: ringkasan.laba_bersih >= 0 ? 'primary' : 'danger' },
                { label: 'Net Profit Margin', value: `${ringkasan.profit_margin_persen}%`, tone: 'warning' }
            ],
            sections
        });

        if (output === 'bloburl' && pdfRes?.blobUrl) {
            App.openPdfModal({
                title: 'Laporan Laba Rugi & Profitabilitas',
                filename: pdfRes.filename,
                blobUrl: pdfRes.blobUrl
            });
        } else {
            App.toast('Laporan PDF berhasil diunduh', 'success');
        }
    } catch (err) {
        App.toast(err?.message || 'Gagal membuat dokumen PDF laporan', 'error');
    }
}

// Export to CSV
function exportProfitLossCsv() {
    if (!plCurrentData) {
        App.toast('Data laba rugi belum dimuat', 'warning');
        return;
    }

    const tahun = document.getElementById('pl-filter-year')?.value || new Date().getFullYear();

    if (activeSubTab === 'bulanan') {
        const { analisis_bulanan } = plCurrentData;
        const headers = ['Bulan', 'Kas Masuk', 'Tagihan Terbit', 'Beban Server Cloud', 'Beban Operasional Lain', 'Total Beban', 'Laba Bersih', 'Margin (%)', 'Status'];
        const rows = (analisis_bulanan || []).map(b => [
            b.bulan_nama,
            b.pendapatan_kas,
            b.tagihan_terbit,
            b.beban_server_cloud,
            b.beban_operasional_lain,
            b.beban_operasional,
            b.laba_bersih,
            b.margin_persen,
            b.status
        ]);
        App.exportCsv(`laba_rugi_bulanan_${tahun}.csv`, headers, rows);
        App.toast('Berhasil mengunduh CSV Laba Rugi Bulanan', 'success');
    } else if (activeSubTab === 'tahunan') {
        const { analisis_tahunan } = plCurrentData;
        const headers = ['Tahun', 'Kas Masuk', 'Tagihan Terbit', 'Beban Operasional', 'Est Biaya Aset', 'Laba Bersih', 'Margin (%)', 'Status'];
        const rows = (analisis_tahunan || []).map(y => [
            y.tahun,
            y.pendapatan_kas,
            y.tagihan_terbit,
            y.beban_operasional,
            y.estimasi_biaya_aset,
            y.laba_bersih,
            y.margin_persen,
            y.status
        ]);
        App.exportCsv(`laba_rugi_tahunan.csv`, headers, rows);
        App.toast('Berhasil mengunduh CSV Laba Rugi Multi-Tahun', 'success');
    } else if (activeSubTab === 'proyek') {
        const { profitabilitas_proyek } = plCurrentData;
        const headers = ['Nama Proyek', 'Klien', 'Pendapatan Proyek', 'Beban Proyek', 'Margin Bersih', 'ROI Margin (%)'];
        const rows = (profitabilitas_proyek || []).map(p => [
            p.nama_project,
            p.nama_perusahaan,
            p.pendapatan_proyek,
            p.beban_proyek,
            p.margin_bersih,
            p.margin_persen
        ]);
        App.exportCsv(`profitabilitas_proyek_${tahun}.csv`, headers, rows);
        App.toast('Berhasil mengunduh CSV Profitabilitas Proyek', 'success');
    } else if (activeSubTab === 'aset-beban') {
        const { aset_aktif } = plCurrentData;
        const headers = ['Nama Aset', 'Provider', 'Kategori', 'Siklus', 'Mata Uang', 'Biaya Asli', 'Biaya IDR', 'Burn Bulanan', 'Burn Tahunan', 'Status'];
        const rows = (aset_aktif || []).map(a => [
            a.nama_aset,
            a.provider,
            a.kategori,
            a.siklus,
            a.mata_uang,
            a.biaya,
            a.biaya_idr,
            a.burn_bulanan,
            a.burn_tahunan,
            a.status
        ]);
        App.exportCsv(`komitmen_aset_cloud_${tahun}.csv`, headers, rows);
        App.toast('Berhasil mengunduh CSV Komitmen Aset Cloud', 'success');
    }
}
