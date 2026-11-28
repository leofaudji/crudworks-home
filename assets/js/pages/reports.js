// assets/js/pages/reports.js
import { App } from '../app.js';
import { exportReportPdf } from '../core/reports/export-pdf.js';

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

    document.getElementById('btn-export-rep-pdf')?.addEventListener('click', () => exportReportPdf(activeTab, 'bloburl'));
    document.getElementById('btn-download-rep-pdf')?.addEventListener('click', () => exportReportPdf(activeTab, 'download'));

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

async function renderCashflowTaxReport(container, selectedYear = null) {
    const curY = new Date().getFullYear();
    const tahun = selectedYear || curY;
    container.classList.add('opacity-60', 'pointer-events-none', 'transition-opacity', 'duration-150');
    const res = await App.api(`reports/cashflow-tax?tahun=${tahun}`);
    container.classList.remove('opacity-60', 'pointer-events-none');
    if (!res?.success || !res.data) {
        container.innerHTML = `<div class="p-8 text-center text-xs text-rose-500">Gagal memuat laporan arus kas & pajak.</div>`;
        return;
    }
    const { ringkasan_pajak: rp, proyeksi_arus_kas: pk, pajak_bulanan: rows } = res.data;
    container.innerHTML = `
        <div class="space-y-6">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Proyeksi Kas Masuk â‰¤ 30 Hari</div>
                    <div class="text-xl font-extrabold font-mono text-emerald-600 mt-1">${App.formatIDR(pk.hari_30)}</div>
                    <div class="text-[11px] text-slate-500 mt-1">Termasuk est. recurring ${App.formatIDR(pk.estimasi_recurring_bulanan)}/bln</div>
                </div>
                <div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Proyeksi Kas 31â€“60 Hari</div>
                    <div class="text-xl font-extrabold font-mono text-indigo-600 mt-1">${App.formatIDR(pk.hari_60)}</div>
                </div>
                <div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Proyeksi Kas 61â€“90 Hari</div>
                    <div class="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">${App.formatIDR(pk.hari_90)}</div>
                </div>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 class="font-bold text-slate-900 dark:text-white text-base">Rekap Pajak Keluaran Tahun ${tahun}</h3>
                        <p class="text-xs text-slate-400">Akumulasi DPP, PPN Keluaran, dan estimasi potongan PPh 23 jasa (2%)</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 text-xs font-mono">
                        <select id="rep-tax-year" class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-sans font-bold text-xs">
                            ${[curY, curY - 1, curY - 2].map(y => `<option value="${y}" ${Number(y) === Number(tahun) ? 'selected' : ''}>Tahun ${y}</option>`).join('')}
                        </select>
                        <span class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800">DPP: <b>${App.formatIDR(rp.total_dpp)}</b></span>
                        <span class="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">PPN Keluaran: <b>${App.formatIDR(rp.total_ppn_keluaran)}</b></span>
                        <span class="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">PPN Masukan: <b>${App.formatIDR(rp.total_ppn_masukan || 0)}</b></span>
                        <span class="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">PPN Kurang Bayar: <b>${App.formatIDR(rp.ppn_kurang_bayar ?? rp.total_ppn_keluaran)}</b></span>
                        <span class="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">PPh 23 Terpotong: <b>${App.formatIDR(rp.total_pph23_terpotong || 0)}</b></span>
                        <div class="relative inline-block font-sans" id="rep-tax-exp-wrap">
                            <button type="button" id="rep-tax-exp-btn" class="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-primary-600 text-white font-bold text-xs inline-flex items-center gap-1">
                                <i class="ri-download-2-line"></i><span>Ekspor</span><i class="ri-arrow-down-s-line"></i>
                            </button>
                            <div id="rep-tax-exp-menu" class="hidden absolute right-0 mt-1.5 w-44 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-40">
                                <button type="button" id="btn-tax-preview-pdf" class="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"><i class="ri-eye-line text-primary-600"></i><span>Pratinjau PDF</span></button>
                                <button type="button" id="btn-tax-download-pdf" class="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"><i class="ri-file-pdf-2-line text-rose-600"></i><span>Unduh PDF</span></button>
                                <button type="button" id="btn-export-tax-csv" class="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"><i class="ri-file-excel-2-line text-emerald-600"></i><span>Unduh CSV</span></button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-500 font-mono">
                                <th class="py-3 px-4">Bulan</th>
                                <th class="py-3 px-4 text-center">Jml Faktur</th>
                                <th class="py-3 px-4 text-right">DPP</th>
                                <th class="py-3 px-4 text-right">PPN Keluaran</th>
                                <th class="py-3 px-4 text-right">PPN Masukan</th>
                                <th class="py-3 px-4 text-right">PPN Kurang Bayar</th>
                                <th class="py-3 px-4 text-right">Est. PPh 23 (2%)</th>
                                <th class="py-3 px-4 text-right">PPh 23 Beban</th>
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
                                    <td class="py-3 px-4 text-right text-emerald-600">${App.formatIDR(r.ppn_masukan || 0)}</td>
                                    <td class="py-3 px-4 text-right font-bold text-rose-600">${App.formatIDR(r.ppn_kurang_bayar ?? r.ppn_keluaran)}</td>
                                    <td class="py-3 px-4 text-right text-indigo-600">${App.formatIDR(r.est_pph23)}</td>
                                    <td class="py-3 px-4 text-right text-slate-600">${App.formatIDR(r.pph23_terpotong || 0)}</td>
                                    <td class="py-3 px-4 text-right font-bold">${App.formatIDR(r.total_faktur)}</td>
                                </tr>`).join('') : `<tr><td colspan="9" class="py-8 text-center text-slate-400">Belum ada faktur terbit pada tahun ${tahun}</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.getElementById('rep-tax-year')?.addEventListener('change', (e) => {
        renderCashflowTaxReport(container, e.target.value);
    });
    const taxBtn = document.getElementById('rep-tax-exp-btn');
    const taxMenu = document.getElementById('rep-tax-exp-menu');
    const taxWrap = document.getElementById('rep-tax-exp-wrap');
    taxBtn?.addEventListener('click', (e) => { e.stopPropagation(); taxMenu?.classList.toggle('hidden'); });
    document.addEventListener('click', (e) => { if (taxWrap && !taxWrap.contains(e.target)) taxMenu?.classList.add('hidden'); });

    const exportTaxPdf = async (output = 'bloburl') => {
        taxMenu?.classList.add('hidden');
        const pdfRes = await App.exportPdf({
            filename: `rekap_pajak_${tahun}.pdf`,
            title: `REKAPITULASI PAJAK TAHUN ${tahun}`,
            subtitle: 'PPN Keluaran, PPN Masukan, PPN Kurang Bayar & PPh 23',
            orientation: 'landscape',
            output,
            summaryCards: [
                { label: 'Total DPP', value: App.formatIDR(rp.total_dpp), tone: 'default' },
                { label: 'PPN Keluaran', value: App.formatIDR(rp.total_ppn_keluaran), tone: 'default' },
                { label: 'PPN Masukan', value: App.formatIDR(rp.total_ppn_masukan || 0), tone: 'default' },
                { label: 'PPN Kurang Bayar', value: App.formatIDR(rp.ppn_kurang_bayar ?? rp.total_ppn_keluaran), tone: 'default' }
            ],
            sections: [
                {
                    type: 'table',
                    heading: `Rekapitulasi Pajak Masa â€” Tahun ${tahun}`,
                    head: ['Bulan', 'Faktur', 'DPP', 'PPN Keluaran', 'PPN Masukan', 'PPN Kurang Bayar', 'Est. PPh 23 (2%)', 'Total Tagihan'],
                    body: rows.map((r) => [r.bulan, String(r.jumlah_faktur), App.formatIDR(r.dpp), App.formatIDR(r.ppn_keluaran), App.formatIDR(r.ppn_masukan || 0), App.formatIDR(r.ppn_kurang_bayar ?? r.ppn_keluaran), App.formatIDR(r.est_pph23), App.formatIDR(r.total_faktur)]),
                    foot: ['TOTAL', String(rows.reduce((a, b) => a + Number(b.jumlah_faktur || 0), 0)), App.formatIDR(rp.total_dpp), App.formatIDR(rp.total_ppn_keluaran), App.formatIDR(rp.total_ppn_masukan || 0), App.formatIDR(rp.ppn_kurang_bayar ?? rp.total_ppn_keluaran), App.formatIDR(rp.estimasi_pph23_2persen || 0), App.formatIDR(rows.reduce((a, b) => a + Number(b.total_faktur || 0), 0))],
                    columnStyles: {
                        0: { fontStyle: 'bold' },
                        1: { halign: 'center' },
                        2: { halign: 'right' },
                        3: { halign: 'right' },
                        4: { halign: 'right' },
                        5: { halign: 'right', fontStyle: 'bold' },
                        6: { halign: 'right' },
                        7: { halign: 'right', fontStyle: 'bold' }
                    }
                }
            ]
        });
        if (output === 'bloburl' && pdfRes?.blobUrl) {
            App.openPdfModal({ title: `Pratinjau Rekap Pajak ${tahun}`, filename: pdfRes.filename, blobUrl: pdfRes.blobUrl });
        }
    };
    document.getElementById('btn-tax-preview-pdf')?.addEventListener('click', () => exportTaxPdf('bloburl'));
    document.getElementById('btn-tax-download-pdf')?.addEventListener('click', () => exportTaxPdf('download'));
    document.getElementById('btn-export-tax-csv')?.addEventListener('click', () => {
        taxMenu?.classList.add('hidden');
        App.exportCsv(
            `rekap_pajak_${tahun}.csv`,
            ['Bulan', 'Jumlah Faktur', 'DPP', 'PPN Keluaran', 'PPN Masukan', 'PPN Kurang Bayar', 'Est PPh 23', 'PPh 23 Beban', 'Total Tagihan'],
            rows.map((r) => [r.bulan, r.jumlah_faktur, r.dpp, r.ppn_keluaran, r.ppn_masukan || 0, r.ppn_kurang_bayar ?? r.ppn_keluaran, r.est_pph23, r.pph23_terpotong || 0, r.total_faktur])
        );
    });
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
                            <th class="py-3 px-4 text-right">1 â€“ 30 Hari</th>
                            <th class="py-3 px-4 text-right">31 â€“ 60 Hari</th>
                            <th class="py-3 px-4 text-right">61 â€“ 90 Hari</th>
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

