// assets/js/pages/reports.js
import { App } from '../app.js';

let activeTab = 'aging';
let clientsList = [];

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Laporan Finansial & Piutang</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Analisis umur piutang, realisasi pendapatan kas, dan rekening koran mutasi klien.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button id="btn-export-rep-pdf" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow">
                        <i class="ri-file-pdf-2-line text-rose-400 text-sm"></i>
                        <span>Pratinjau PDF</span>
                    </button>
                    <button id="btn-download-rep-pdf" class="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow">
                        <i class="ri-download-line text-sm"></i>
                        <span>Unduh PDF</span>
                    </button>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <div class="flex flex-wrap items-center gap-2">
                    <button class="rep-tab px-4 py-2 rounded-xl font-bold text-xs transition ${activeTab === 'aging' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-tab="aging">
                        <i class="ri-history-line mr-1"></i> Aging Piutang (Umur Tunggakan)
                    </button>
                    <button class="rep-tab px-4 py-2 rounded-xl font-bold text-xs transition ${activeTab === 'revenue' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-tab="revenue">
                        <i class="ri-funds-line mr-1"></i> Arus Kas Penerimaan
                    </button>
                    <button class="rep-tab px-4 py-2 rounded-xl font-bold text-xs transition ${activeTab === 'statement' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-tab="statement">
                        <i class="ri-file-list-3-line mr-1"></i> Rekening Koran Klien
                    </button>
                    <button class="rep-tab px-4 py-2 rounded-xl font-bold text-xs transition ${activeTab === 'cashflow-tax' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-tab="cashflow-tax">
                        <i class="ri-government-line mr-1"></i> Arus Kas & Pajak (PPN/PPh)
                    </button>
                </div>
                <a href="#/profit-loss" class="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/40 dark:hover:bg-primary-900/60 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/40 flex items-center gap-1.5 transition">
                    <i class="ri-scales-3-line text-sm"></i>
                    <span>Menu Laba Rugi & Profit</span>
                    <i class="ri-arrow-right-line text-xs"></i>
                </a>
            </div>

            <!-- Dynamic Tab Content -->
            <div id="report-tab-body"></div>
        </div>
    `;

    document.querySelectorAll('.rep-tab').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('.rep-tab').forEach(x => {
                x.className = 'rep-tab px-4 py-2 rounded-xl font-bold text-xs transition text-slate-500 hover:text-slate-900 dark:hover:text-white';
            });
            b.className = 'rep-tab px-4 py-2 rounded-xl font-bold text-xs transition bg-primary-600 text-white shadow-sm';
            activeTab = b.getAttribute('data-tab');
            renderTab();
        });
    });

    // Fetch clients for statement dropdown
    const cRes = await App.api('clients?all=1');
    if (cRes && cRes.success) clientsList = cRes.data;

    document.getElementById('btn-export-rep-pdf')?.addEventListener('click', () => exportCurrentReport('bloburl'));
    document.getElementById('btn-download-rep-pdf')?.addEventListener('click', () => exportCurrentReport('download'));

    renderTab();
}

function renderTab() {
    if (activeTab === 'profit-loss') {
        window.location.hash = '#/profit-loss';
        return;
    }
    const cont = document.getElementById('report-tab-body');
    if (activeTab === 'aging') renderAgingReport(cont);
    if (activeTab === 'revenue') renderRevenueReport(cont);
    if (activeTab === 'statement') renderStatementReport(cont);
    if (activeTab === 'cashflow-tax') renderCashflowTaxReport(cont);
}

async function renderCashflowTaxReport(container) {
    const tahun = new Date().getFullYear();
    container.innerHTML = `<div class="p-10 text-center text-xs text-slate-400">Memuat proyeksi arus kas & rekap pajak...</div>`;
    const res = await App.api(`reports/cashflow-tax?tahun=${tahun}`);
    if (!res?.success || !res.data) {
        container.innerHTML = `<div class="p-8 text-center text-xs text-rose-500">Gagal memuat laporan arus kas & pajak.</div>`;
        return;
    }
    const { ringkasan_pajak: rp, proyeksi_arus_kas: pk, pajak_bulanan: rows } = res.data;
    container.innerHTML = `
        <div class="space-y-6">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Proyeksi Kas Masuk ≤ 30 Hari</div>
                    <div class="text-xl font-extrabold font-mono text-emerald-600 mt-1">${App.formatIDR(pk.hari_30)}</div>
                    <div class="text-[11px] text-slate-500 mt-1">Termasuk est. recurring ${App.formatIDR(pk.estimasi_recurring_bulanan)}/bln</div>
                </div>
                <div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Proyeksi Kas 31–60 Hari</div>
                    <div class="text-xl font-extrabold font-mono text-indigo-600 mt-1">${App.formatIDR(pk.hari_60)}</div>
                </div>
                <div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Proyeksi Kas 61–90 Hari</div>
                    <div class="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">${App.formatIDR(pk.hari_90)}</div>
                </div>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 class="font-bold text-slate-900 dark:text-white text-base">Rekap Pajak Keluaran Tahun ${tahun}</h3>
                        <p class="text-xs text-slate-400">Akumulasi DPP, PPN Keluaran, dan estimasi potongan PPh 23 jasa (2%)</p>
                    </div>
                    <div class="flex flex-wrap gap-3 text-xs font-mono">
                        <span class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800">DPP: <b>${App.formatIDR(rp.total_dpp)}</b></span>
                        <span class="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">PPN: <b>${App.formatIDR(rp.total_ppn_keluaran)}</b></span>
                        <span class="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">Est. PPh 23: <b>${App.formatIDR(rp.estimasi_pph23_2persen)}</b></span>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-500 font-mono">
                                <th class="py-3 px-4">Bulan</th>
                                <th class="py-3 px-4 text-center">Jml Faktur</th>
                                <th class="py-3 px-4 text-right">DPP (Sebelum Pajak)</th>
                                <th class="py-3 px-4 text-right">PPN Keluaran</th>
                                <th class="py-3 px-4 text-right">Est. PPh 23 (2%)</th>
                                <th class="py-3 px-4 text-right font-black">Total Tagihan</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                            ${rows.length ? rows.map((r) => `
                                <tr>
                                    <td class="py-3 px-4 font-bold">${App.escapeHtml(r.bulan)}</td>
                                    <td class="py-3 px-4 text-center">${r.jumlah_faktur}</td>
                                    <td class="py-3 px-4 text-right">${App.formatIDR(r.dpp)}</td>
                                    <td class="py-3 px-4 text-right text-amber-600">${App.formatIDR(r.ppn_keluaran)}</td>
                                    <td class="py-3 px-4 text-right text-indigo-600">${App.formatIDR(r.est_pph23)}</td>
                                    <td class="py-3 px-4 text-right font-bold">${App.formatIDR(r.total_faktur)}</td>
                                </tr>`).join('') : `<tr><td colspan="6" class="py-8 text-center text-slate-400">Belum ada faktur terbit pada tahun ${tahun}</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// 1. Aging Report
async function renderAgingReport(container) {
    container.innerHTML = `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden p-6 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h3 class="font-bold text-slate-900 dark:text-white text-base">Klasifikasi Umur Piutang Berjalan</h3>
                    <p class="text-xs text-slate-400">Pengelompokan faktur belum lunas berdasarkan rentang hari keterlambatan</p>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="data-table w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-500 font-mono">
                            <th class="py-3 px-4">Nama Pelanggan</th>
                            <th class="py-3 px-4 text-right">Belum JT (Current)</th>
                            <th class="py-3 px-4 text-right">1 – 30 Hari</th>
                            <th class="py-3 px-4 text-right">31 – 60 Hari</th>
                            <th class="py-3 px-4 text-right">61 – 90 Hari</th>
                            <th class="py-3 px-4 text-right text-rose-600">> 90 Hari (Macet)</th>
                            <th class="py-3 px-4 text-right font-black">Total Piutang</th>
                        </tr>
                    </thead>
                    <tbody id="aging-tbody" class="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        <tr><td colspan="7" class="py-8 text-center text-slate-400">Memuat analisis aging...</td></tr>
                    </tbody>
                    <tfoot id="aging-tfoot" class="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-900 dark:border-slate-700 font-mono font-bold text-xs text-slate-900 dark:text-white"></tfoot>
                </table>
            </div>
        </div>
    `;

    const res = await App.api('reports/aging');
    if (!res || !res.success) return;

    const { items, totals } = res.data;
    const tbody = document.getElementById('aging-tbody');
    const tfoot = document.getElementById('aging-tfoot');

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">Tidak ada piutang tertunggak saat ini. Semua tagihan telah lunas.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(r => `
        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
            <td class="py-3 px-4 font-sans font-bold text-slate-800 dark:text-slate-200">
                ${r.nama_perusahaan}
                <div class="text-[10px] font-mono text-slate-400 font-normal">${r.kode_klien} | ${r.telepon}</div>
            </td>
            <td class="py-3 px-4 text-right">${App.formatIDR(r.current_amount)}</td>
            <td class="py-3 px-4 text-right ${Number(r.overdue_1_30) > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}">${App.formatIDR(r.overdue_1_30)}</td>
            <td class="py-3 px-4 text-right ${Number(r.overdue_31_60) > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'}">${App.formatIDR(r.overdue_31_60)}</td>
            <td class="py-3 px-4 text-right ${Number(r.overdue_61_90) > 0 ? 'text-rose-500 font-bold' : 'text-slate-400'}">${App.formatIDR(r.overdue_61_90)}</td>
            <td class="py-3 px-4 text-right ${Number(r.overdue_over_90) > 0 ? 'text-rose-600 font-black' : 'text-slate-400'}">${App.formatIDR(r.overdue_over_90)}</td>
            <td class="py-3 px-4 text-right font-black text-slate-900 dark:text-white">${App.formatIDR(r.total_piutang)}</td>
        </tr>
    `).join('');

    tfoot.innerHTML = `
        <tr>
            <td class="py-3.5 px-4 font-sans">TOTAL KESELURUHAN:</td>
            <td class="py-3.5 px-4 text-right">${App.formatIDR(totals.current_amount)}</td>
            <td class="py-3.5 px-4 text-right text-amber-600">${App.formatIDR(totals.overdue_1_30)}</td>
            <td class="py-3.5 px-4 text-right text-amber-700">${App.formatIDR(totals.overdue_31_60)}</td>
            <td class="py-3.5 px-4 text-right text-rose-500">${App.formatIDR(totals.overdue_61_90)}</td>
            <td class="py-3.5 px-4 text-right text-rose-600">${App.formatIDR(totals.overdue_over_90)}</td>
            <td class="py-3.5 px-4 text-right text-primary-600 font-black">${App.formatIDR(totals.total_piutang)}</td>
        </tr>
    `;
}

// 2. Revenue Report
async function renderRevenueReport(container) {
    const startDefault = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDefault = new Date().toISOString().split('T')[0];

    container.innerHTML = `
        <div class="space-y-6">
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center gap-4">
                <div class="flex items-center gap-2 text-xs">
                    <span class="font-bold text-slate-600 dark:text-slate-400">Dari:</span>
                    <input type="date" id="rep-rev-start" value="${startDefault}" class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono">
                </div>
                <div class="flex items-center gap-2 text-xs">
                    <span class="font-bold text-slate-600 dark:text-slate-400">Sampai:</span>
                    <input type="date" id="rep-rev-end" value="${endDefault}" class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono">
                </div>
                <button id="btn-filter-revenue" class="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-semibold">Terapkan Filter</button>
            </div>

            <!-- Revenue Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div class="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                    <span class="text-xs font-bold text-slate-500 uppercase">Total Realisasi Kas Masuk</span>
                    <div id="rev-total-amount" class="text-2xl font-black font-mono text-emerald-600 mt-2">Rp 0</div>
                </div>
                <div id="rev-methods-cards" class="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4"></div>
            </div>

            <!-- Transactions Table -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                <h4 class="font-bold text-sm text-slate-900 dark:text-white mb-4">Rincian Transaksi Pembayaran Masuk</h4>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th class="py-2.5 px-4">No. Kuitansi</th>
                                <th class="py-2.5 px-4">Tanggal</th>
                                <th class="py-2.5 px-4">Pelanggan</th>
                                <th class="py-2.5 px-4">Invoice</th>
                                <th class="py-2.5 px-4">Kanal / Bank</th>
                                <th class="py-2.5 px-4 text-right">Nominal</th>
                            </tr>
                        </thead>
                        <tbody id="rev-tbody" class="divide-y divide-slate-100 dark:divide-slate-800 font-mono"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-filter-revenue').addEventListener('click', () => loadRevenueData());
    loadRevenueData();
}

async function loadRevenueData() {
    const s = document.getElementById('rep-rev-start').value;
    const e = document.getElementById('rep-rev-end').value;

    const res = await App.api(`reports/revenue?start_date=${s}&end_date=${e}`);
    if (!res || !res.success) return;

    const d = res.data;
    document.getElementById('rev-total-amount').textContent = App.formatIDR(d.total_revenue);

    const methodsCont = document.getElementById('rev-methods-cards');
    methodsCont.innerHTML = Object.keys(d.by_method).map(k => `
        <div class="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div class="text-[11px] font-bold text-slate-500">${k}</div>
            <div class="text-base font-extrabold font-mono text-slate-900 dark:text-white mt-1">${App.formatIDR(d.by_method[k])}</div>
        </div>
    `).join('');

    const tbody = document.getElementById('rev-tbody');
    if (d.transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">Tidak ada transaksi dalam rentang tanggal ini</td></tr>`;
        return;
    }

    tbody.innerHTML = d.transactions.map(t => `
        <tr class="hover:bg-slate-50/50">
            <td class="py-2.5 px-4 font-bold text-slate-900 dark:text-white">${t.nomor_pembayaran}</td>
            <td class="py-2.5 px-4 text-slate-500">${App.formatDate(t.tanggal_bayar)}</td>
            <td class="py-2.5 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">${t.client_nama}</td>
            <td class="py-2.5 px-4 text-primary-600">${t.nomor_invoice}</td>
            <td class="py-2.5 px-4 text-slate-500">${t.nama_metode}</td>
            <td class="py-2.5 px-4 text-right font-bold text-emerald-600">${App.formatIDR(t.jumlah_bayar)}</td>
        </tr>
    `).join('');
}

// 3. Statement of Account Report
async function renderStatementReport(container) {
    container.innerHTML = `
        <div class="space-y-6">
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-4">
                <div class="flex items-center gap-2 text-xs flex-1 max-w-md">
                    <span class="font-bold text-slate-600 dark:text-slate-400">Pilih Pelanggan:</span>
                    <select id="rep-stmt-client" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        <option value="">Pilih Pelanggan...</option>
                        ${clientsList.map(c => `<option value="${c.id}">${c.nama_perusahaan} (${c.kode_klien})</option>`).join('')}
                    </select>
                </div>
                <button id="btn-load-stmt" class="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-semibold">Tampilkan Rekening Koran</button>
            </div>

            <div id="stmt-results-container" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8">
                <div class="text-xs text-slate-400 text-center py-12">Silakan pilih pelanggan di atas untuk melihat mutasi kartu piutang.</div>
            </div>
        </div>
    `;

    document.getElementById('btn-load-stmt').addEventListener('click', () => {
        const cId = document.getElementById('rep-stmt-client').value;
        if (cId) loadClientStatement(cId);
    });
}

async function loadClientStatement(clientId) {
    const cont = document.getElementById('stmt-results-container');
    cont.innerHTML = `<div class="text-center py-8 text-slate-400"><i class="ri-loader-4-line text-2xl animate-spin"></i><div class="text-xs mt-2">Menyusun rekening koran...</div></div>`;

    const res = await App.api(`reports/statement?client_id=${clientId}`);
    if (!res || !res.success) {
        cont.innerHTML = `<div class="text-rose-500 text-xs text-center py-8">Gagal memuat mutasi klien</div>`;
        return;
    }

    const { client, ledger, final_balance } = res.data;

    cont.innerHTML = `
        <div class="space-y-6">
            <div class="flex items-start justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h3 class="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">KARTU PIUTANG & REKENING KORAN</h3>
                    <div class="text-xs font-bold text-primary-600 mt-1">${client.nama_perusahaan} (${client.kode_klien})</div>
                    <div class="text-xs text-slate-400">UP: ${client.penanggung_jawab} | ${client.telepon}</div>
                </div>
                <div class="text-right">
                    <div class="text-xs text-slate-400 uppercase font-bold">Saldo Kewajiban Saat Ini</div>
                    <div class="text-2xl font-black font-mono ${final_balance > 0 ? 'text-rose-600' : 'text-emerald-600'} mt-1">
                        ${App.formatIDR(final_balance)}
                    </div>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="data-table w-full text-left text-xs border-collapse">
                    <thead class="bg-slate-50 dark:bg-slate-800/50 font-mono text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th class="py-2.5 px-4">Tanggal</th>
                            <th class="py-2.5 px-4">No. Referensi</th>
                            <th class="py-2.5 px-4">Keterangan</th>
                            <th class="py-2.5 px-4 text-right">Debit (Tagihan)</th>
                            <th class="py-2.5 px-4 text-right">Kredit (Bayar)</th>
                            <th class="py-2.5 px-4 text-right font-black">Saldo Akhir</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        ${ledger.map(l => `
                            <tr class="hover:bg-slate-50/50">
                                <td class="py-2.5 px-4 text-slate-500">${App.formatDate(l.tanggal)}</td>
                                <td class="py-2.5 px-4 font-bold text-slate-900 dark:text-white">${l.ref}</td>
                                <td class="py-2.5 px-4 font-sans text-slate-700 dark:text-slate-300">${l.deskripsi}</td>
                                <td class="py-2.5 px-4 text-right ${Number(l.debit) > 0 ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-400'}">${App.formatIDR(l.debit)}</td>
                                <td class="py-2.5 px-4 text-right ${Number(l.kredit) > 0 ? 'font-bold text-emerald-600' : 'text-slate-400'}">${App.formatIDR(l.kredit)}</td>
                                <td class="py-2.5 px-4 text-right font-black ${l.saldo_berjalan > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}">${App.formatIDR(l.saldo_berjalan)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// 4. Profit & Loss Report (Laba / Rugi Bulanan, Tahunan & Komparasi Biaya Aset Cloud)
let plCurrentData = null;

async function renderProfitLossReport(container) {
    const currentYear = new Date().getFullYear();
    const startDefault = `${currentYear}-01-01`;
    const endDefault = new Date().toISOString().split('T')[0];

    container.innerHTML = `
        <div class="space-y-6">
            <!-- Filter & Mode Bar -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div class="flex flex-wrap items-center gap-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold uppercase text-slate-500">Mode Analisis:</span>
                        <select id="rep-pl-mode" class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary-500">
                            <option value="bulanan" selected>Tampilan Bulanan (12 Bulan)</option>
                            <option value="tahunan">Tampilan Tahunan (Multi-Tahun)</option>
                            <option value="kustom">Rentang Tanggal Kustom</option>
                        </select>
                    </div>

                    <div id="rep-pl-year-box" class="flex items-center gap-2">
                        <span class="text-xs font-bold uppercase text-slate-500">Tahun:</span>
                        <select id="rep-pl-year" class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary-500">
                            <option value="${currentYear}" selected>${currentYear}</option>
                            <option value="${currentYear - 1}">${currentYear - 1}</option>
                            <option value="${currentYear - 2}">${currentYear - 2}</option>
                            <option value="${currentYear - 3}">${currentYear - 3}</option>
                        </select>
                    </div>

                    <div id="rep-pl-custom-dates" class="hidden flex items-center gap-2">
                        <input type="date" id="rep-pl-start" value="${startDefault}" class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs">
                        <span class="text-xs text-slate-400">s/d</span>
                        <input type="date" id="rep-pl-end" value="${endDefault}" class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs">
                    </div>

                    <button id="btn-filter-pl" class="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5">
                        <i class="ri-refresh-line text-sm"></i>
                        <span>Muat Laporan</span>
                    </button>
                </div>

                <div class="flex items-center gap-2">
                    <span id="pl-period-badge" class="px-3 py-1 rounded-xl text-xs font-semibold bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/40 font-mono">
                        Tahun ${currentYear}
                    </span>
                </div>
            </div>

            <!-- KPI Cards Overview -->
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

            <!-- Komparasi Tagihan Masuk vs Beban Aset / Cloud Banner -->
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

            <!-- Section 1: Tabel Rincian Laba / Rugi Bulanan (12 Bulan) -->
            <div id="pl-monthly-section" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <h4 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-calendar-event-line text-primary-600"></i>
                            <span>Rincian Laba / Rugi Bulanan (Januari – Desember)</span>
                        </h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Perbandingan kas penerimaan tagihan, realisasi beban operasional, dan surplus/defisit bersih setiap bulan.
                        </p>
                    </div>
                    <span id="pl-monthly-year-tag" class="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        Tahun ${currentYear}
                    </span>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800">
                                <th class="py-3 px-4">Bulan</th>
                                <th class="py-3 px-4 text-right">Kas Masuk (Rp)</th>
                                <th class="py-3 px-4 text-right">Tagihan Terbit (Rp)</th>
                                <th class="py-3 px-4 text-right">Beban Server/Cloud</th>
                                <th class="py-3 px-4 text-right">Beban Operasional Lain</th>
                                <th class="py-3 px-4 text-right">Total Beban</th>
                                <th class="py-3 px-4 text-right">Laba / Rugi Bersih</th>
                                <th class="py-3 px-4 text-center">Margin %</th>
                                <th class="py-3 px-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody id="pl-monthly-tbody" class="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                            <tr><td colspan="9" class="py-8 text-center text-slate-400">Memuat analisis bulanan...</td></tr>
                        </tbody>
                        <tfoot id="pl-monthly-tfoot" class="bg-slate-50 dark:bg-slate-800/60 font-mono font-bold border-t-2 border-slate-200 dark:border-slate-700">
                            <!-- Populated dynamically -->
                        </tfoot>
                    </table>
                </div>
            </div>

            <!-- Section 2: Tabel Komparasi Multi-Tahun (Year-over-Year) -->
            <div id="pl-yearly-section" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <h4 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-line-chart-line text-emerald-600"></i>
                            <span>Komparasi Kinerja Finansial Multi-Tahun (Year-over-Year)</span>
                        </h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Perbandingan performa laba/rugi, realisasi kas masuk, serta efisiensi beban dari tahun ke tahun.
                        </p>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800">
                                <th class="py-3 px-4">Tahun</th>
                                <th class="py-3 px-4 text-right">Realisasi Kas Masuk</th>
                                <th class="py-3 px-4 text-right">Total Tagihan Terbit</th>
                                <th class="py-3 px-4 text-right">Total Beban Operasional</th>
                                <th class="py-3 px-4 text-right">Est. Biaya Aset / Thn</th>
                                <th class="py-3 px-4 text-right">Laba Bersih</th>
                                <th class="py-3 px-4 text-center">Net Margin</th>
                                <th class="py-3 px-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody id="pl-yearly-tbody" class="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                            <tr><td colspan="8" class="py-8 text-center text-slate-400">Memuat komparasi tahunan...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Section 3: Daftar Langganan Server, Cloud & Aset Eksternal Aktif -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <h4 class="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-server-line text-sky-600"></i>
                            <span>Komponen Biaya Aset & Langganan Cloud Aktif</span>
                        </h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Estimasi komitmen biaya bulanan dan tahunan untuk server, VPS, domain, dan lisensi SaaS pihak luar.
                        </p>
                    </div>
                    <a href="#/company-assets" class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition">
                        <span>Kelola Aset di Modul Aset</span>
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
                                <th class="py-2.5 px-4 text-right">Ekuivalen Bulanan</th>
                                <th class="py-2.5 px-4 text-right">Ekuivalen Tahunan</th>
                                <th class="py-2.5 px-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody id="pl-assets-tbody" class="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                            <tr><td colspan="6" class="py-6 text-center text-slate-400">Memuat rincian aset...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Section 4: Breakdown Kategori & Profitabilitas Proyek -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Breakdown Beban Kategori -->
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
                    <h4 class="font-bold text-sm text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <i class="ri-pie-chart-line text-indigo-500"></i>
                        <span>Beban Berdasarkan Kategori</span>
                    </h4>
                    <div id="pl-categories-cont" class="space-y-3 font-mono text-xs">
                        <div class="text-center py-6 text-slate-400">Memuat kategori...</div>
                    </div>
                </div>

                <!-- Profitabilitas per Proyek -->
                <div class="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
                    <h4 class="font-bold text-sm text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <i class="ri-briefcase-line text-emerald-500"></i>
                        <span>Analisis Profitabilitas per Proyek</span>
                    </h4>
                    <div class="overflow-x-auto">
                        <table class="data-table w-full text-left text-xs border-collapse">
                            <thead>
                                <tr class="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold uppercase text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800">
                                    <th class="py-2.5 px-4">Proyek & Klien</th>
                                    <th class="py-2.5 px-4 text-right">Pendapatan</th>
                                    <th class="py-2.5 px-4 text-right">Beban Proyek</th>
                                    <th class="py-2.5 px-4 text-right">Margin Bersih</th>
                                    <th class="py-2.5 px-4 text-center">ROI %</th>
                                </tr>
                            </thead>
                            <tbody id="pl-projects-tbody" class="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                                <tr><td colspan="5" class="py-6 text-center text-slate-400">Memuat data proyek...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Bind Mode Selector Change
    const modeSelect = document.getElementById('rep-pl-mode');
    const yearBox = document.getElementById('rep-pl-year-box');
    const customDates = document.getElementById('rep-pl-custom-dates');
    const monthlySec = document.getElementById('pl-monthly-section');
    const yearlySec = document.getElementById('pl-yearly-section');

    modeSelect.addEventListener('change', () => {
        const val = modeSelect.value;
        if (val === 'bulanan') {
            yearBox.classList.remove('hidden');
            customDates.classList.add('hidden');
            monthlySec.classList.remove('hidden');
            yearlySec.classList.remove('hidden');
        } else if (val === 'tahunan') {
            yearBox.classList.remove('hidden');
            customDates.classList.add('hidden');
            monthlySec.classList.add('hidden');
            yearlySec.classList.remove('hidden');
        } else if (val === 'kustom') {
            yearBox.classList.add('hidden');
            customDates.classList.remove('hidden');
            monthlySec.classList.remove('hidden');
            yearlySec.classList.add('hidden');
        }
    });

    document.getElementById('btn-filter-pl').addEventListener('click', () => loadProfitLossData());
    document.getElementById('rep-pl-year').addEventListener('change', () => loadProfitLossData());

    loadProfitLossData();
}

async function loadProfitLossData() {
    const mode = document.getElementById('rep-pl-mode')?.value || 'bulanan';
    const tahun = document.getElementById('rep-pl-year')?.value || new Date().getFullYear();
    const s = document.getElementById('rep-pl-start')?.value || `${tahun}-01-01`;
    const e = document.getElementById('rep-pl-end')?.value || `${tahun}-12-31`;

    let ep = `reports/profit-loss?tahun=${tahun}`;
    if (mode === 'kustom') {
        ep = `reports/profit-loss?start_date=${s}&end_date=${e}`;
    }

    const badgeEl = document.getElementById('pl-period-badge');
    if (badgeEl) {
        badgeEl.textContent = (mode === 'kustom') ? `${App.formatDate(s)} s/d ${App.formatDate(e)}` : `Tahun ${tahun}`;
    }

    const ymTag = document.getElementById('pl-monthly-year-tag');
    if (ymTag) ymTag.textContent = `Tahun ${tahun}`;

    const res = await App.api(ep);
    if (!res || !res.success) return;

    plCurrentData = res.data;
    const { ringkasan, analisis_bulanan, analisis_tahunan, aset_aktif, beban_per_kategori, profitabilitas_proyek } = res.data;

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
        bannerStatusEl.textContent = 'Belum ada pendapatan tercatat pada periode ini.';
    } else if (ratio < 15) {
        bannerStatusEl.innerHTML = `<span class="text-emerald-300 font-bold">Infrastruktur Sangat Efisien:</span> Biaya server & cloud menyerap ${ratio}% dari total pendapatan.`;
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

    // 3. Section 1: Monthly Table (Jan - Des)
    const mBody = document.getElementById('pl-monthly-tbody');
    const mFoot = document.getElementById('pl-monthly-tfoot');
    if (Array.isArray(analisis_bulanan) && analisis_bulanan.length > 0) {
        let totRev = 0, totInv = 0, totCloud = 0, totOther = 0, totExp = 0, totNet = 0;
        mBody.innerHTML = analisis_bulanan.map(b => {
            totRev += b.pendapatan_kas;
            totInv += b.tagihan_terbit;
            totCloud += b.beban_server_cloud;
            totOther += b.beban_operasional_lain;
            totExp += b.beban_operasional;
            totNet += b.laba_bersih;

            return `
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
            `;
        }).join('');

        const totMargin = totRev > 0 ? roundOne((totNet / totRev) * 100) : 0;
        mFoot.innerHTML = `
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
    } else {
        mBody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-slate-400">Tidak ada rincian data bulanan</td></tr>`;
        mFoot.innerHTML = '';
    }

    // 4. Section 2: Yearly Table
    const yBody = document.getElementById('pl-yearly-tbody');
    if (Array.isArray(analisis_tahunan) && analisis_tahunan.length > 0) {
        yBody.innerHTML = analisis_tahunan.map(y => `
            <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 ${y.tahun == tahun ? 'bg-primary-50/30 dark:bg-primary-950/20 font-bold' : ''}">
                <td class="py-2.5 px-4 font-sans text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>${y.tahun}</span>
                    ${y.tahun == tahun ? '<span class="px-1.5 py-0.5 text-[9px] bg-primary-600 text-white rounded font-sans uppercase">Aktif</span>' : ''}
                </td>
                <td class="py-2.5 px-4 text-right text-emerald-600 font-bold">${App.formatIDR(y.pendapatan_kas)}</td>
                <td class="py-2.5 px-4 text-right text-slate-500">${App.formatIDR(y.tagihan_terbit)}</td>
                <td class="py-2.5 px-4 text-right text-rose-600 font-bold">${App.formatIDR(y.beban_operasional)}</td>
                <td class="py-2.5 px-4 text-right text-sky-600">${App.formatIDR(y.estimasi_biaya_aset)}</td>
                <td class="py-2.5 px-4 text-right font-black ${y.laba_bersih >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}">
                    ${App.formatIDR(y.laba_bersih)}
                </td>
                <td class="py-2.5 px-4 text-center font-bold ${y.margin_persen >= 30 ? 'text-emerald-600' : (y.margin_persen >= 0 ? 'text-amber-600' : 'text-rose-600')}">
                    ${y.margin_persen}%
                </td>
                <td class="py-2.5 px-4 text-center">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${y.status === 'surplus' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'} uppercase">
                        ${y.status}
                    </span>
                </td>
            </tr>
        `).join('');
    } else {
        yBody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-slate-400">Tidak ada data tahunan</td></tr>`;
    }

    // 5. Section 3: Active Assets Component Table
    const aBody = document.getElementById('pl-assets-tbody');
    if (Array.isArray(aset_aktif) && aset_aktif.length > 0) {
        aBody.innerHTML = aset_aktif.map(a => `
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
    } else {
        aBody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400">Belum ada langganan aset / cloud tercatat. Tambahkan di menu Aset & Langganan Cloud.</td></tr>`;
    }

    // 6. Section 4: Expense Categories
    const catCont = document.getElementById('pl-categories-cont');
    if (!beban_per_kategori || beban_per_kategori.length === 0) {
        catCont.innerHTML = `<div class="text-slate-400 text-center py-4">Belum ada beban operasional tercatat pada periode ini.</div>`;
    } else {
        catCont.innerHTML = beban_per_kategori.map(c => `
            <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full" style="background-color: ${c.warna || '#64748b'}"></span>
                    <span class="font-bold text-slate-800 dark:text-slate-200 font-sans">${c.nama_kategori}</span>
                </div>
                <div class="text-right">
                    <div class="font-bold text-slate-900 dark:text-white">${App.formatIDR(c.total)}</div>
                    <div class="text-[10px] text-slate-400 font-sans">${c.count} transaksi</div>
                </div>
            </div>
        `).join('');
    }

    // 7. Section 5: Projects Profitability
    const pTbody = document.getElementById('pl-projects-tbody');
    if (!profitabilitas_proyek || profitabilitas_proyek.length === 0) {
        pTbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400">Tidak ada proyek aktif ditemukan</td></tr>`;
    } else {
        pTbody.innerHTML = profitabilitas_proyek.map(p => `
            <tr class="hover:bg-slate-50/50">
                <td class="py-2.5 px-4 font-sans font-bold text-slate-800 dark:text-slate-200">
                    ${p.nama_project}
                    <div class="text-[10px] text-slate-400 font-normal">${p.nama_perusahaan}</div>
                </td>
                <td class="py-2.5 px-4 text-right text-emerald-600 font-bold">${App.formatIDR(p.pendapatan_proyek)}</td>
                <td class="py-2.5 px-4 text-right text-rose-500 font-bold">${App.formatIDR(p.beban_proyek)}</td>
                <td class="py-2.5 px-4 text-right font-black ${p.margin_bersih >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}">${App.formatIDR(p.margin_bersih)}</td>
                <td class="py-2.5 px-4 text-center">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${p.margin_persen >= 30 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : (p.margin_persen >= 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400')}">
                        ${p.margin_persen}%
                    </span>
                </td>
            </tr>
        `).join('');
    }
}

function roundOne(n) {
    return Math.round(n * 10) / 10;
}

async function exportCurrentReport(output = 'bloburl') {
    try {
        if (activeTab === 'aging') {
            const res = await App.api('reports/aging');
            if (!res || !res.success) {
                App.toast('Gagal memuat data aging piutang', 'error');
                return;
            }
            const { items, totals } = res.data;
            const body = items.map(r => [
                `${r.nama_perusahaan}\n(${r.kode_klien})`,
                App.formatIDR(r.current_amount),
                App.formatIDR(r.overdue_1_30),
                App.formatIDR(r.overdue_31_60),
                App.formatIDR(r.overdue_61_90),
                App.formatIDR(r.overdue_over_90),
                App.formatIDR(r.total_piutang)
            ]);
            const foot = [
                ['TOTAL:', App.formatIDR(totals.current_amount), App.formatIDR(totals.overdue_1_30), App.formatIDR(totals.overdue_31_60), App.formatIDR(totals.overdue_61_90), App.formatIDR(totals.overdue_over_90), App.formatIDR(totals.total_piutang)]
            ];
            const pdfRes = await App.exportPdf({
                filename: `laporan_aging_piutang_${new Date().toISOString().slice(0, 10)}.pdf`,
                title: 'LAPORAN ANALISIS UMUR PIUTANG (AGING)',
                subtitle: `Per Tanggal: ${App.formatDate(new Date().toISOString().slice(0, 10))}`,
                orientation: 'landscape',
                output,
                summaryCards: [
                    { label: 'Belum Jatuh Tempo', value: App.formatIDR(totals.current_amount), tone: 'default' },
                    { label: 'Tunggakan 1-30 Hari', value: App.formatIDR(totals.overdue_1_30), tone: 'warning' },
                    { label: 'Tunggakan >90 Hari', value: App.formatIDR(totals.overdue_over_90), tone: 'danger' },
                    { label: 'Total Saldo Piutang', value: App.formatIDR(totals.total_piutang), tone: 'primary' }
                ],
                sections: [{
                    type: 'table',
                    heading: 'Klasifikasi Umur Piutang Klien',
                    head: ['Pelanggan', 'Current (Rp)', '1 – 30 Hari', '31 – 60 Hari', '61 – 90 Hari', '> 90 Hari (Macet)', 'Total Piutang'],
                    body,
                    foot,
                    columnStyles: {
                        0: { cellWidth: 55, fontStyle: 'bold' },
                        1: { halign: 'right' },
                        2: { halign: 'right' },
                        3: { halign: 'right' },
                        4: { halign: 'right' },
                        5: { halign: 'right', textColor: [190, 18, 60] },
                        6: { halign: 'right', fontStyle: 'bold', textColor: [2, 132, 199] }
                    }
                }]
            });
            if (output === 'bloburl' && pdfRes?.blobUrl) {
                App.openPdfModal({
                    title: 'Laporan Analisis Umur Piutang',
                    filename: pdfRes.filename,
                    blobUrl: pdfRes.blobUrl
                });
            } else {
                App.toast('Laporan PDF berhasil diunduh', 'success');
            }
        } else if (activeTab === 'revenue') {
            const s = document.getElementById('rep-rev-start')?.value || '';
            const e = document.getElementById('rep-rev-end')?.value || '';
            const res = await App.api(`reports/revenue?start_date=${s}&end_date=${e}`);
            if (!res || !res.success) {
                App.toast('Gagal memuat data arus kas pendapatan', 'error');
                return;
            }
            const d = res.data;
            const body = d.transactions.map(t => [
                t.nomor_pembayaran,
                App.formatDate(t.tanggal_bayar),
                t.client_nama,
                t.nomor_invoice,
                t.nama_metode,
                App.formatIDR(t.jumlah_bayar)
            ]);
            const foot = [
                ['TOTAL REALISASI:', '', '', '', '', App.formatIDR(d.total_revenue)]
            ];
            const pdfRes = await App.exportPdf({
                filename: `laporan_arus_kas_${s}_sd_${e}.pdf`,
                title: 'LAPORAN ARUS KAS PENERIMAAN PENDAPATAN',
                subtitle: `Rentang Tanggal: ${App.formatDate(s)} s/d ${App.formatDate(e)}`,
                orientation: 'portrait',
                output,
                summaryCards: [
                    { label: 'Total Realisasi Kas', value: App.formatIDR(d.total_revenue), tone: 'success' },
                    { label: 'Jumlah Transaksi', value: `${d.transactions.length} Transaksi`, tone: 'default' }
                ],
                sections: [{
                    type: 'table',
                    heading: 'Rincian Transaksi Pembayaran Masuk',
                    head: ['No. Kuitansi', 'Tanggal', 'Pelanggan', 'Faktur', 'Kanal / Bank', 'Nominal (Rp)'],
                    body,
                    foot,
                    columnStyles: {
                        0: { fontStyle: 'bold' },
                        1: { cellWidth: 26 },
                        5: { halign: 'right', fontStyle: 'bold', textColor: [4, 120, 87] }
                    }
                }]
            });
            if (output === 'bloburl' && pdfRes?.blobUrl) {
                App.openPdfModal({
                    title: 'Laporan Arus Kas Penerimaan',
                    filename: pdfRes.filename,
                    blobUrl: pdfRes.blobUrl
                });
            } else {
                App.toast('Laporan PDF berhasil diunduh', 'success');
            }
        } else if (activeTab === 'statement') {
            const clientId = document.getElementById('rep-stmt-client')?.value;
            if (!clientId) {
                App.toast('Pilih pelanggan terlebih dahulu untuk mencetak rekening koran', 'warning');
                return;
            }
            const res = await App.api(`reports/statement?client_id=${clientId}`);
            if (!res || !res.success) {
                App.toast('Gagal memuat mutasi kartu piutang', 'error');
                return;
            }
            const { client, ledger, final_balance } = res.data;
            const body = ledger.map(l => [
                App.formatDate(l.tanggal),
                l.ref,
                l.deskripsi,
                Number(l.debit) > 0 ? App.formatIDR(l.debit) : '-',
                Number(l.kredit) > 0 ? App.formatIDR(l.kredit) : '-',
                App.formatIDR(l.saldo_berjalan)
            ]);
            const pdfRes = await App.exportPdf({
                filename: `rekening_koran_${String(client.kode_klien || 'klien').toLowerCase()}.pdf`,
                title: 'KARTU PIUTANG & REKENING KORAN PELANGGAN',
                subtitle: `${client.nama_perusahaan} (${client.kode_klien}) · UP: ${client.penanggung_jawab || '-'} · Telp: ${client.telepon || '-'}`,
                orientation: 'portrait',
                output,
                summaryCards: [
                    { label: 'Pelanggan', value: client.nama_perusahaan, tone: 'default' },
                    { label: 'Saldo Kewajiban', value: App.formatIDR(final_balance), tone: final_balance > 0 ? 'danger' : 'success' }
                ],
                sections: [{
                    type: 'table',
                    heading: 'Mutasi Transaksi Tagihan & Pembayaran',
                    head: ['Tanggal', 'No. Referensi', 'Keterangan', 'Debit (Rp)', 'Kredit (Rp)', 'Saldo Akhir (Rp)'],
                    body,
                    columnStyles: {
                        0: { cellWidth: 26 },
                        1: { cellWidth: 32, fontStyle: 'bold' },
                        3: { halign: 'right' },
                        4: { halign: 'right', textColor: [4, 120, 87] },
                        5: { halign: 'right', fontStyle: 'bold' }
                    }
                }]
            });
            if (output === 'bloburl' && pdfRes?.blobUrl) {
                App.openPdfModal({
                    title: `Rekening Koran — ${client.nama_perusahaan}`,
                    filename: pdfRes.filename,
                    blobUrl: pdfRes.blobUrl
                });
            } else {
                App.toast('Laporan PDF berhasil diunduh', 'success');
            }
        } else if (activeTab === 'profit-loss') {
            const mode = document.getElementById('rep-pl-mode')?.value || 'bulanan';
            const tahun = document.getElementById('rep-pl-year')?.value || new Date().getFullYear();
            const s = document.getElementById('rep-pl-start')?.value || `${tahun}-01-01`;
            const e = document.getElementById('rep-pl-end')?.value || `${tahun}-12-31`;

            let ep = `reports/profit-loss?tahun=${tahun}`;
            if (mode === 'kustom') {
                ep = `reports/profit-loss?start_date=${s}&end_date=${e}`;
            }

            const res = await App.api(ep);
            if (!res || !res.success) {
                App.toast('Gagal memuat data laba rugi untuk PDF', 'error');
                return;
            }
            const { ringkasan, analisis_bulanan, analisis_tahunan, profitabilitas_proyek } = res.data;

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
                title: 'LAPORAN LABA RUGI OPERASIONAL & KOMPARASI BIAYA ASET',
                subtitle: mode === 'kustom' ? `Periode: ${App.formatDate(s)} s/d ${App.formatDate(e)}` : `Tahun Buku: ${tahun}`,
                orientation: 'landscape',
                output,
                summaryCards: [
                    { label: 'Realisasi Kas Masuk', value: App.formatIDR(ringkasan.total_pendapatan), tone: 'success' },
                    { label: 'Total Beban Riil', value: App.formatIDR(ringkasan.total_beban), tone: 'danger' },
                    { label: 'Est. Biaya Aset Setahun', value: App.formatIDR(assetBurnYear), tone: 'warning' },
                    { label: 'Laba Bersih Operasional', value: App.formatIDR(ringkasan.laba_bersih), tone: ringkasan.laba_bersih >= 0 ? 'primary' : 'danger' },
                    { label: 'Marjin Keuntungan', value: `${ringkasan.profit_margin_persen}%`, tone: 'warning' }
                ],
                sections
            });
            if (output === 'bloburl' && pdfRes?.blobUrl) {
                App.openPdfModal({
                    title: 'Laporan Laba Rugi & Komparasi Biaya Aset',
                    filename: pdfRes.filename,
                    blobUrl: pdfRes.blobUrl
                });
            } else {
                App.toast('Laporan PDF berhasil diunduh', 'success');
            }
        }
    } catch (err) {
        App.toast(err?.message || 'Gagal membuat dokumen PDF laporan', 'error');
    }
}
