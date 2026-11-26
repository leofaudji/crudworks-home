// assets/js/pages/accounting/financial-statements.js
import { App } from '../../app.js';
import { exportDropdownHtml, bindExportDropdown } from './shared.js';

// ===== 7. LAPORAN LABA RUGI BERBASIS COA (INCOME STATEMENT) =====
export async function renderIncomeStatement(cont) {
    const y = new Date().getFullYear();
    cont.innerHTML = `
        <div class="space-y-4">
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2">
                    <input type="date" id="is-start" value="${y}-01-01" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    <span class="text-xs text-slate-400">s/d</span>
                    <input type="date" id="is-end" value="${new Date().toISOString().slice(0, 10)}" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    <button type="button" id="btn-is-filter" class="px-3.5 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold">Terapkan</button>
                </div>
                <div class="flex items-center gap-2">
                    ${exportDropdownHtml('is')}
                </div>
            </div>
            <div id="is-body" class="space-y-4"></div>
        </div>
    `;

    let lastIsData = null;
    const load = async () => {
        const sEl = document.getElementById('is-start');
        const eEl = document.getElementById('is-end');
        const body = document.getElementById('is-body');
        if (!sEl || !eEl || !body) return;

        const res = await App.api(`accounting/income-statement?start_date=${sEl.value}&end_date=${eEl.value}`, { cache: false });
        if (!res?.success || !res.data) return;
        const d = res.data;
        lastIsData = d;

        const renderRows = (arr) => arr.map(r => `
            <div class="py-2.5 px-5 flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span><span class="font-mono text-slate-400 mr-2">${App.escapeHtml(r.kode_akun)}</span><b>${App.escapeHtml(r.nama_akun)}</b></span>
                <span class="font-mono font-bold">${App.formatIDR(r.saldo)}</span>
            </div>
        `).join('');

        body.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Total Pendapatan</div>
                    <div class="text-lg font-extrabold font-mono text-emerald-600 mt-1">${App.formatIDR(d.total_pendapatan)}</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Total Beban</div>
                    <div class="text-lg font-extrabold font-mono text-rose-600 mt-1">${App.formatIDR(d.total_beban)}</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Laba / (Rugi) Bersih</div>
                    <div class="text-lg font-extrabold font-mono ${Number(d.laba_bersih) >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'} mt-1">${App.formatIDR(d.laba_bersih)}</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Margin Laba</div>
                    <div class="text-lg font-extrabold font-mono text-indigo-600 mt-1">${d.margin_persen}%</div>
                </div>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div class="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    I. Pendapatan Usaha
                </div>
                <div>${renderRows(d.pendapatan)}</div>
                <div class="px-5 py-3 bg-slate-50/60 dark:bg-slate-800/30 border-y border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-extrabold">
                    <span>Total Pendapatan</span>
                    <span class="font-mono">${App.formatIDR(d.total_pendapatan)}</span>
                </div>

                <div class="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    II. Beban Operasional
                </div>
                <div>${renderRows(d.beban)}</div>
                <div class="px-5 py-3 bg-slate-50/60 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-extrabold">
                    <span>Total Beban</span>
                    <span class="font-mono">${App.formatIDR(d.total_beban)}</span>
                </div>

                <div class="px-5 py-4 bg-slate-900 text-white flex items-center justify-between text-sm font-extrabold">
                    <span>LABA / (RUGI) BERSIH PERIODE</span>
                    <span class="font-mono">${App.formatIDR(d.laba_bersih)}</span>
                </div>
            </div>
        `;
    };

    const exportIsPdf = async (output = 'bloburl') => {
        if (!lastIsData) return;
        const d = lastIsData;
        const bodyRows = [
            [{ content: 'I. PENDAPATAN USAHA', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }],
            ...d.pendapatan.map(r => [r.kode_akun, r.nama_akun, App.formatIDR(r.saldo)]),
            [{ content: 'Total Pendapatan', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: App.formatIDR(d.total_pendapatan), styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } }],
            [{ content: 'II. BEBAN OPERASIONAL', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }],
            ...d.beban.map(r => [r.kode_akun, r.nama_akun, App.formatIDR(r.saldo)]),
            [{ content: 'Total Beban', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: App.formatIDR(d.total_beban), styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } }]
        ];
        const pdfRes = await App.exportPdf({
            filename: `laba_rugi_coa_${d.start_date}_${d.end_date}.pdf`,
            title: 'LAPORAN LABA RUGI (INCOME STATEMENT)',
            subtitle: `Periode: ${App.formatDate(d.start_date)} s/d ${App.formatDate(d.end_date)}`,
            orientation: 'portrait',
            output,
            summaryCards: [
                { label: 'Total Pendapatan', value: App.formatIDR(d.total_pendapatan), tone: 'default' },
                { label: 'Total Beban', value: App.formatIDR(d.total_beban), tone: 'default' },
                { label: 'Laba / (Rugi) Bersih', value: App.formatIDR(d.laba_bersih), tone: 'default' },
                { label: 'Margin Laba', value: `${d.margin_persen}%`, tone: 'default' }
            ],
            sections: [{
                type: 'table',
                head: ['Kode Akun', 'Nama Akun', 'Saldo (Rp)'],
                body: bodyRows,
                foot: ['', 'LABA / (RUGI) BERSIH PERIODE', App.formatIDR(d.laba_bersih)],
                columnStyles: {
                    0: { cellWidth: 26, fontStyle: 'bold' },
                    2: { cellWidth: 48, halign: 'right', fontStyle: 'bold' }
                }
            }]
        });
        if (output === 'bloburl' && pdfRes?.blobUrl) {
            App.openPdfModal({ title: 'Pratinjau Laporan Laba Rugi (COA)', filename: pdfRes.filename, blobUrl: pdfRes.blobUrl });
        }
    };

    ['is-start', 'is-end'].forEach(id => document.getElementById(id)?.addEventListener('change', load));
    document.getElementById('btn-is-filter')?.addEventListener('click', load);
    bindExportDropdown('is', {
        onPreviewPdf: () => exportIsPdf('bloburl'),
        onDownloadPdf: () => exportIsPdf('download'),
        onCsv: () => {
            if (!lastIsData) return;
            const d = lastIsData;
            const rows = [
                ...d.pendapatan.map(r => ['Pendapatan', r.kode_akun, r.nama_akun, r.saldo]),
                ...d.beban.map(r => ['Beban', r.kode_akun, r.nama_akun, r.saldo]),
                ['Ringkasan', '-', 'Laba / (Rugi) Bersih', d.laba_bersih]
            ];
            App.exportCsv(`laba_rugi_coa_${d.start_date}_${d.end_date}.csv`, ['Kelompok', 'Kode Akun', 'Nama Akun', 'Saldo'], rows);
        }
    });
    await load();
}

// ===== 8. LAPORAN ARUS KAS RESMI (CASH FLOW STATEMENT) =====
export async function renderCashFlowStatement(cont) {
    const y = new Date().getFullYear();
    cont.innerHTML = `
        <div class="space-y-4">
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2">
                    <input type="date" id="cf-start" value="${y}-01-01" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    <span class="text-xs text-slate-400">s/d</span>
                    <input type="date" id="cf-end" value="${new Date().toISOString().slice(0, 10)}" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    <button type="button" id="btn-cf-filter" class="px-3.5 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold">Terapkan</button>
                </div>
                <div class="flex items-center gap-2">
                    <div class="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
                        <button type="button" data-cf-mode="summary" class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs transition">Ringkasan</button>
                        <button type="button" data-cf-mode="detail" class="px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition">Rincian Jurnal</button>
                    </div>
                    ${exportDropdownHtml('cf')}
                </div>
            </div>
            <div id="cf-body" class="space-y-4"></div>
        </div>
    `;

    let lastCfData = null;
    let cfMode = 'summary';

    const renderCfBody = () => {
        const body = document.getElementById('cf-body');
        if (!body || !lastCfData) return;
        const d = lastCfData;

        const renderSec = (title, sec) => {
            const sumList = Array.isArray(sec.summary) && sec.summary.length ? sec.summary : null;
            const rowsHtml = cfMode === 'summary' && sumList
                ? sumList.map(s => `
                    <div class="py-3 px-5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <div class="min-w-0 flex items-center gap-2.5">
                            ${s.kode_akun ? `<span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300 shrink-0">${App.escapeHtml(s.kode_akun)}</span>` : ''}
                            <span class="font-semibold text-slate-800 dark:text-slate-200 truncate">${App.escapeHtml(s.nama_akun)}</span>
                            <span class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500 shrink-0">${s.count} transaksi</span>
                        </div>
                        <span class="font-mono font-bold shrink-0 ${Number(s.nominal) >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${App.formatIDR(s.nominal)}</span>
                    </div>
                `).join('')
                : (sec.items.length ? sec.items.map(it => `
                    <div class="py-2.5 px-5 flex items-center justify-between gap-3 text-xs">
                        <div class="min-w-0">
                            <span class="font-mono text-slate-400 mr-2">${App.formatDate(it.tanggal)}</span>
                            <span class="font-mono font-semibold text-primary-600 mr-2">${App.escapeHtml(it.nomor_jurnal)}</span>
                            <span class="text-slate-700 dark:text-slate-200">${App.escapeHtml(it.deskripsi)}</span>
                        </div>
                        <span class="font-mono font-bold shrink-0 ${Number(it.nominal) >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${App.formatIDR(it.nominal)}</span>
                    </div>
                `).join('') : '');

            return `
                <div class="px-5 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800 text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center justify-between">
                    <span>${title}</span>
                    <span class="font-mono">${App.formatIDR(sec.total)}</span>
                </div>
                <div class="divide-y divide-slate-100 dark:divide-slate-800">
                    ${rowsHtml || '<div class="py-3 px-5 text-xs text-slate-400 italic">Tidak ada mutasi kas pada aktivitas ini.</div>'}
                </div>
            `;
        };

        body.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Saldo Kas Awal</div>
                    <div class="text-lg font-extrabold font-mono mt-1">${App.formatIDR(d.opening_cash)}</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Arus Kas Operasional</div>
                    <div class="text-lg font-extrabold font-mono mt-1">${App.formatIDR(d.operating.total)}</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Kenaikan / (Penurunan) Kas</div>
                    <div class="text-lg font-extrabold font-mono mt-1">${App.formatIDR(d.net_cash_flow)}</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Saldo Kas Akhir</div>
                    <div class="text-lg font-extrabold font-mono text-primary-600 mt-1">${App.formatIDR(d.closing_cash)}</div>
                </div>
            </div>
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                ${renderSec('I. Aktivitas Operasional', d.operating)}
                ${renderSec('II. Aktivitas Investasi', d.investing)}
                ${renderSec('III. Aktivitas Pendanaan', d.financing)}
                <div class="px-5 py-4 bg-slate-900 text-white flex items-center justify-between text-sm font-extrabold">
                    <span>SALDO KAS &amp; SETARA KAS AKHIR PERIODE</span>
                    <span class="font-mono">${App.formatIDR(d.closing_cash)}</span>
                </div>
            </div>
        `;
    };

    const load = async () => {
        const sEl = document.getElementById('cf-start');
        const eEl = document.getElementById('cf-end');
        if (!sEl || !eEl) return;
        const res = await App.api(`accounting/cash-flow?start_date=${sEl.value}&end_date=${eEl.value}`, { cache: false });
        if (!res?.success || !res.data) return;
        lastCfData = res.data;
        renderCfBody();
    };

    cont.querySelectorAll('[data-cf-mode]').forEach((btn) => {
        btn.addEventListener('click', () => {
            cfMode = btn.getAttribute('data-cf-mode') || 'summary';
            cont.querySelectorAll('[data-cf-mode]').forEach((b) => {
                const act = b.getAttribute('data-cf-mode') === cfMode;
                b.className = act
                    ? 'px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs transition'
                    : 'px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition';
            });
            renderCfBody();
        });
    });

    const exportCfPdf = async (output = 'bloburl') => {
        if (!lastCfData) return;
        const d = lastCfData;
        const pushSec = (label, sec, rows) => {
            rows.push([{ content: label, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }]);
            sec.items.forEach(it => rows.push([App.formatDate(it.tanggal), it.nomor_jurnal, it.deskripsi, App.formatIDR(it.nominal)]));
            rows.push([{ content: `Subtotal ${label}`, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: App.formatIDR(sec.total), styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } }]);
        };
        const bodyRows = [];
        pushSec('I. Aktivitas Operasional', d.operating, bodyRows);
        pushSec('II. Aktivitas Investasi', d.investing, bodyRows);
        pushSec('III. Aktivitas Pendanaan', d.financing, bodyRows);

        const pdfRes = await App.exportPdf({
            filename: `arus_kas_${d.start_date}_${d.end_date}.pdf`,
            title: 'LAPORAN ARUS KAS (CASH FLOW STATEMENT)',
            subtitle: `Periode: ${App.formatDate(d.start_date)} s/d ${App.formatDate(d.end_date)}`,
            orientation: 'portrait',
            output,
            summaryCards: [
                { label: 'Saldo Kas Awal', value: App.formatIDR(d.opening_cash), tone: 'default' },
                { label: 'Arus Kas Bersih', value: App.formatIDR(d.net_cash_flow), tone: 'default' },
                { label: 'Saldo Kas Akhir', value: App.formatIDR(d.closing_cash), tone: 'default' }
            ],
            sections: [{
                type: 'table',
                head: ['Tanggal', 'No. Jurnal', 'Uraian Aktivitas', 'Arus Kas (Rp)'],
                body: bodyRows,
                foot: ['', '', 'SALDO KAS AKHIR PERIODE', App.formatIDR(d.closing_cash)],
                columnStyles: {
                    0: { cellWidth: 24 },
                    1: { cellWidth: 32, fontStyle: 'bold' },
                    3: { cellWidth: 38, halign: 'right', fontStyle: 'bold' }
                }
            }]
        });
        if (output === 'bloburl' && pdfRes?.blobUrl) {
            App.openPdfModal({ title: 'Pratinjau Laporan Arus Kas', filename: pdfRes.filename, blobUrl: pdfRes.blobUrl });
        }
    };

    ['cf-start', 'cf-end'].forEach(id => document.getElementById(id)?.addEventListener('change', load));
    document.getElementById('btn-cf-filter')?.addEventListener('click', load);
    bindExportDropdown('cf', {
        onPreviewPdf: () => exportCfPdf('bloburl'),
        onDownloadPdf: () => exportCfPdf('download'),
        onCsv: () => {
            if (!lastCfData) return;
            const d = lastCfData;
            const rows = [
                ...d.operating.items.map(i => ['Operasional', i.tanggal, i.nomor_jurnal, i.deskripsi, i.nominal]),
                ...d.investing.items.map(i => ['Investasi', i.tanggal, i.nomor_jurnal, i.deskripsi, i.nominal]),
                ...d.financing.items.map(i => ['Pendanaan', i.tanggal, i.nomor_jurnal, i.deskripsi, i.nominal])
            ];
            App.exportCsv(`arus_kas_${d.start_date}_${d.end_date}.csv`, ['Aktivitas', 'Tanggal', 'No Jurnal', 'Deskripsi', 'Nominal'], rows);
        }
    });
    await load();
}

// ===== 9. LAPORAN PERUBAHAN EKUITAS (STATEMENT OF CHANGES IN EQUITY) =====
export async function renderEquityStatement(cont) {
    const y = new Date().getFullYear();
    cont.innerHTML = `
        <div class="space-y-4">
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2">
                    <input type="date" id="eq-start" value="${y}-01-01" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    <span class="text-xs text-slate-400">s/d</span>
                    <input type="date" id="eq-end" value="${new Date().toISOString().slice(0, 10)}" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    <button type="button" id="btn-eq-filter" class="px-3.5 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold">Terapkan</button>
                </div>
                <div class="flex items-center gap-2">
                    ${exportDropdownHtml('eq')}
                </div>
            </div>
            <div id="eq-body" class="space-y-4"></div>
        </div>
    `;

    let lastEqData = null;
    const load = async () => {
        const sEl = document.getElementById('eq-start');
        const eEl = document.getElementById('eq-end');
        const body = document.getElementById('eq-body');
        if (!sEl || !eEl || !body) return;
        const res = await App.api(`accounting/equity-statement?start_date=${sEl.value}&end_date=${eEl.value}`, { cache: false });
        if (!res?.success || !res.data) return;
        const d = res.data;
        lastEqData = d;

        body.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Ekuitas Awal</div>
                    <div class="text-lg font-extrabold font-mono mt-1">${App.formatIDR(d.opening_equity)}</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Mutasi Modal / Ekuitas</div>
                    <div class="text-lg font-extrabold font-mono mt-1">${App.formatIDR(d.period_capital_change)}</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Laba / (Rugi) Periode</div>
                    <div class="text-lg font-extrabold font-mono text-emerald-600 mt-1">${App.formatIDR(d.net_profit_period)}</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Ekuitas Akhir</div>
                    <div class="text-lg font-extrabold font-mono text-primary-600 mt-1">${App.formatIDR(d.ending_equity)}</div>
                </div>
            </div>

            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <table class="data-table w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500">
                            <th class="py-3.5 px-6">Kode</th>
                            <th class="py-3.5 px-6">Komponen Ekuitas</th>
                            <th class="py-3.5 px-6 text-right">Saldo Awal</th>
                            <th class="py-3.5 px-6 text-right">Perubahan Periode</th>
                            <th class="py-3.5 px-6 text-right">Saldo Akhir</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        ${d.accounts.map(a => `
                            <tr>
                                <td class="py-3 px-6 font-bold">${App.escapeHtml(a.kode_akun)}</td>
                                <td class="py-3 px-6 font-sans font-semibold text-slate-800 dark:text-slate-100">${App.escapeHtml(a.nama_akun)}</td>
                                <td class="py-3 px-6 text-right">${App.formatIDR(a.saldo_awal)}</td>
                                <td class="py-3 px-6 text-right">${App.formatIDR(a.mutasi)}</td>
                                <td class="py-3 px-6 text-right font-bold">${App.formatIDR(a.saldo_akhir)}</td>
                            </tr>
                        `).join('')}
                        <tr>
                            <td class="py-3 px-6 font-bold">-</td>
                            <td class="py-3 px-6 font-sans font-semibold text-slate-800 dark:text-slate-100">Laba / (Rugi) Periode Berjalan</td>
                            <td class="py-3 px-6 text-right">${App.formatIDR(d.prev_unclosed_profit)}</td>
                            <td class="py-3 px-6 text-right">${App.formatIDR(d.net_profit_period)}</td>
                            <td class="py-3 px-6 text-right font-bold">${App.formatIDR(d.prev_unclosed_profit + d.net_profit_period)}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr class="bg-slate-900 text-white font-mono font-extrabold text-xs">
                            <td colspan="2" class="py-3.5 px-6 font-sans">TOTAL EKUITAS AKHIR PERIODE</td>
                            <td class="py-3.5 px-6 text-right">${App.formatIDR(d.opening_equity)}</td>
                            <td class="py-3.5 px-6 text-right">${App.formatIDR(d.period_capital_change + d.net_profit_period)}</td>
                            <td class="py-3.5 px-6 text-right">${App.formatIDR(d.ending_equity)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    };

    const exportEqPdf = async (output = 'bloburl') => {
        if (!lastEqData) return;
        const d = lastEqData;
        const rows = [
            ...d.accounts.map(a => [a.kode_akun, a.nama_akun, App.formatIDR(a.saldo_awal), App.formatIDR(a.mutasi), App.formatIDR(a.saldo_akhir)]),
            ['-', 'Laba / (Rugi) Periode Berjalan', App.formatIDR(d.prev_unclosed_profit), App.formatIDR(d.net_profit_period), App.formatIDR(d.prev_unclosed_profit + d.net_profit_period)]
        ];
        const pdfRes = await App.exportPdf({
            filename: `perubahan_ekuitas_${d.start_date}_${d.end_date}.pdf`,
            title: 'LAPORAN PERUBAHAN EKUITAS',
            subtitle: `Periode: ${App.formatDate(d.start_date)} s/d ${App.formatDate(d.end_date)}`,
            orientation: 'landscape',
            output,
            summaryCards: [
                { label: 'Ekuitas Awal', value: App.formatIDR(d.opening_equity), tone: 'default' },
                { label: 'Mutasi Modal', value: App.formatIDR(d.period_capital_change), tone: 'default' },
                { label: 'Laba / (Rugi) Periode', value: App.formatIDR(d.net_profit_period), tone: 'default' },
                { label: 'Ekuitas Akhir', value: App.formatIDR(d.ending_equity), tone: 'default' }
            ],
            sections: [{
                type: 'table',
                head: ['Kode', 'Komponen Ekuitas', 'Saldo Awal', 'Perubahan Periode', 'Saldo Akhir'],
                body: rows,
                foot: ['', 'TOTAL EKUITAS', App.formatIDR(d.opening_equity), App.formatIDR(d.period_capital_change + d.net_profit_period), App.formatIDR(d.ending_equity)],
                columnStyles: {
                    0: { cellWidth: 24, fontStyle: 'bold' },
                    2: { cellWidth: 42, halign: 'right' },
                    3: { cellWidth: 42, halign: 'right' },
                    4: { cellWidth: 42, halign: 'right', fontStyle: 'bold' }
                }
            }]
        });
        if (output === 'bloburl' && pdfRes?.blobUrl) {
            App.openPdfModal({ title: 'Pratinjau Perubahan Ekuitas', filename: pdfRes.filename, blobUrl: pdfRes.blobUrl });
        }
    };

    ['eq-start', 'eq-end'].forEach(id => document.getElementById(id)?.addEventListener('change', load));
    document.getElementById('btn-eq-filter')?.addEventListener('click', load);
    bindExportDropdown('eq', {
        onPreviewPdf: () => exportEqPdf('bloburl'),
        onDownloadPdf: () => exportEqPdf('download'),
        onCsv: () => {
            if (!lastEqData) return;
            const d = lastEqData;
            const rows = [
                ...d.accounts.map(a => [a.kode_akun, a.nama_akun, a.saldo_awal, a.mutasi, a.saldo_akhir]),
                ['-', 'Laba / (Rugi) Periode Berjalan', d.prev_unclosed_profit, d.net_profit_period, d.prev_unclosed_profit + d.net_profit_period]
            ];
            App.exportCsv(`perubahan_ekuitas_${d.start_date}_${d.end_date}.csv`, ['Kode', 'Komponen Ekuitas', 'Saldo Awal', 'Perubahan Periode', 'Saldo Akhir'], rows);
        }
    });
    await load();
}
