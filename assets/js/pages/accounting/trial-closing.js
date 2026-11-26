// assets/js/pages/accounting/trial-closing.js
import { App } from '../../app.js';
import { exportDropdownHtml, bindExportDropdown } from './shared.js';

export async function renderTrialBalance(cont) {
    const y = new Date().getFullYear();
    cont.innerHTML = `
        <div class="space-y-4">
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2">
                    <input type="date" id="tb-start" value="${y}-01-01" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    <span class="text-xs text-slate-400">s/d</span>
                    <input type="date" id="tb-end" value="${new Date().toISOString().slice(0, 10)}" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    <button type="button" id="btn-tb-filter" class="px-3.5 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold">Terapkan</button>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <div id="tb-status-badge"></div>
                    ${exportDropdownHtml('tb')}
                </div>
            </div>
            <div id="tb-body"></div>
        </div>
    `;

    let lastTbData = null;
    const load = async () => {
        const sEl = document.getElementById('tb-start');
        const eEl = document.getElementById('tb-end');
        const body = document.getElementById('tb-body');
        const badge = document.getElementById('tb-status-badge');
        if (!sEl || !eEl || !body) return;

        const res = await App.api(`accounting/trial-balance?start_date=${sEl.value}&end_date=${eEl.value}`, { cache: false });
        if (!res?.success || !res.data) return;
        const d = res.data;
        lastTbData = d;

        if (badge) {
            badge.innerHTML = d.is_balanced
                ? `<span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold"><i class="ri-check-double-line"></i> SEIMBANG</span>`
                : `<span class="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">TIDAK SEIMBANG</span>`;
        }

        body.innerHTML = `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-500">
                                <th class="py-3 px-4">Kode</th>
                                <th class="py-3 px-4">Nama Akun</th>
                                <th class="py-3 px-4 text-right">Awal (D)</th>
                                <th class="py-3 px-4 text-right">Awal (K)</th>
                                <th class="py-3 px-4 text-right">Mutasi (D)</th>
                                <th class="py-3 px-4 text-right">Mutasi (K)</th>
                                <th class="py-3 px-4 text-right">Akhir (D)</th>
                                <th class="py-3 px-4 text-right">Akhir (K)</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                            ${d.items.map(r => `
                                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                    <td class="py-2.5 px-4 font-bold">${App.escapeHtml(r.kode_akun)}</td>
                                    <td class="py-2.5 px-4 font-sans font-semibold text-slate-800 dark:text-slate-100">${App.escapeHtml(r.nama_akun)}</td>
                                    <td class="py-2.5 px-4 text-right">${App.formatIDR(r.opening_debit)}</td>
                                    <td class="py-2.5 px-4 text-right">${App.formatIDR(r.opening_kredit)}</td>
                                    <td class="py-2.5 px-4 text-right">${App.formatIDR(r.mutasi_debit)}</td>
                                    <td class="py-2.5 px-4 text-right">${App.formatIDR(r.mutasi_kredit)}</td>
                                    <td class="py-2.5 px-4 text-right font-bold">${App.formatIDR(r.ending_debit)}</td>
                                    <td class="py-2.5 px-4 text-right font-bold">${App.formatIDR(r.ending_kredit)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="bg-slate-100/80 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700 font-mono font-extrabold text-xs">
                                <td colspan="2" class="py-3 px-4 font-sans">TOTAL NERACA SALDO</td>
                                <td class="py-3 px-4 text-right">${App.formatIDR(d.totals.opening_debit)}</td>
                                <td class="py-3 px-4 text-right">${App.formatIDR(d.totals.opening_kredit)}</td>
                                <td class="py-3 px-4 text-right">${App.formatIDR(d.totals.mutasi_debit)}</td>
                                <td class="py-3 px-4 text-right">${App.formatIDR(d.totals.mutasi_kredit)}</td>
                                <td class="py-3 px-4 text-right">${App.formatIDR(d.totals.ending_debit)}</td>
                                <td class="py-3 px-4 text-right">${App.formatIDR(d.totals.ending_kredit)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    };

    const exportTbPdf = async (output = 'bloburl') => {
        if (!lastTbData) return;
        const d = lastTbData;
        const pdfRes = await App.exportPdf({
            filename: `neraca_saldo_${d.start_date}_${d.end_date}.pdf`,
            title: 'LAPORAN NERACA SALDO (TRIAL BALANCE)',
            subtitle: `Periode: ${App.formatDate(d.start_date)} s/d ${App.formatDate(d.end_date)}`,
            orientation: 'landscape',
            output,
            summaryCards: [
                { label: 'Total Mutasi Debit', value: App.formatIDR(d.totals.mutasi_debit), tone: 'default' },
                { label: 'Total Mutasi Kredit', value: App.formatIDR(d.totals.mutasi_kredit), tone: 'default' },
                { label: 'Saldo Akhir (D)', value: App.formatIDR(d.totals.ending_debit), tone: 'default' },
                { label: 'Saldo Akhir (K)', value: App.formatIDR(d.totals.ending_kredit), tone: 'default' }
            ],
            sections: [{
                type: 'table',
                head: ['Kode', 'Nama Akun', 'Awal (D)', 'Awal (K)', 'Mutasi (D)', 'Mutasi (K)', 'Akhir (D)', 'Akhir (K)'],
                body: d.items.map(r => [r.kode_akun, r.nama_akun, App.formatIDR(r.opening_debit), App.formatIDR(r.opening_kredit), App.formatIDR(r.mutasi_debit), App.formatIDR(r.mutasi_kredit), App.formatIDR(r.ending_debit), App.formatIDR(r.ending_kredit)]),
                foot: ['', 'TOTAL NERACA SALDO', App.formatIDR(d.totals.opening_debit), App.formatIDR(d.totals.opening_kredit), App.formatIDR(d.totals.mutasi_debit), App.formatIDR(d.totals.mutasi_kredit), App.formatIDR(d.totals.ending_debit), App.formatIDR(d.totals.ending_kredit)],
                fontSize: 7.2,
                columnStyles: {
                    0: { cellWidth: 16, fontStyle: 'bold' },
                    2: { halign: 'right' },
                    3: { halign: 'right' },
                    4: { halign: 'right' },
                    5: { halign: 'right' },
                    6: { halign: 'right', fontStyle: 'bold' },
                    7: { halign: 'right', fontStyle: 'bold' }
                }
            }]
        });
        if (output === 'bloburl' && pdfRes?.blobUrl) {
            App.openPdfModal({ title: 'Pratinjau Neraca Saldo', filename: pdfRes.filename, blobUrl: pdfRes.blobUrl });
        }
    };

    ['tb-start', 'tb-end'].forEach(id => document.getElementById(id)?.addEventListener('change', load));
    document.getElementById('btn-tb-filter')?.addEventListener('click', load);
    bindExportDropdown('tb', {
        onPreviewPdf: () => exportTbPdf('bloburl'),
        onDownloadPdf: () => exportTbPdf('download'),
        onCsv: () => {
            if (!lastTbData) return;
            App.exportCsv(
                `neraca_saldo_${lastTbData.start_date}_${lastTbData.end_date}.csv`,
                ['Kode', 'Nama Akun', 'Awal D', 'Awal K', 'Mutasi D', 'Mutasi K', 'Akhir D', 'Akhir K'],
                lastTbData.items.map(r => [r.kode_akun, r.nama_akun, r.opening_debit, r.opening_kredit, r.mutasi_debit, r.mutasi_kredit, r.ending_debit, r.ending_kredit])
            );
        }
    });
    await load();
}
export async function renderPeriodClosing(cont) {
    const curMonth = new Date().toISOString().slice(0, 7);
    cont.innerHTML = `
        <div class="space-y-5">
            <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 class="text-base font-bold text-slate-900 dark:text-white">Tutup Buku &amp; Penguncian Periode</h2>
                    <p class="text-xs text-slate-500">Menutup periode akan mengunci entri jurnal di bulan tersebut &amp; memindahkan saldo Pendapatan/Beban ke Laba Ditahan (3201).</p>
                </div>
                <div class="flex items-center gap-2">
                    <input type="month" id="pc-month" value="${curMonth}" class="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    <button type="button" id="btn-pc-close" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-primary-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5">
                        <i class="ri-lock-2-line"></i><span>Tutup Buku Periode</span>
                    </button>
                </div>
            </div>
            <div id="pc-list" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm"></div>
        </div>
    `;

    const load = async () => {
        const res = await App.api('accounting/periods', { cache: false });
        const listEl = document.getElementById('pc-list');
        if (!listEl) return;
        const rows = res?.success ? (res.data || []) : [];
        if (!rows.length) {
            listEl.innerHTML = `<div class="p-10 text-center text-xs text-slate-400">Belum ada periode yang ditutup buku.</div>`;
            return;
        }
        listEl.innerHTML = `
            <table class="data-table w-full text-left text-xs border-collapse">
                <thead>
                    <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500">
                        <th class="py-3.5 px-6">Periode</th>
                        <th class="py-3.5 px-6">Status</th>
                        <th class="py-3.5 px-6">Jurnal Penutup</th>
                        <th class="py-3.5 px-6">Ditutup Oleh</th>
                        <th class="py-3.5 px-6 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    ${rows.map(r => `
                        <tr>
                            <td class="py-3.5 px-6 font-mono font-bold text-slate-900 dark:text-white">${App.escapeHtml(r.periode)}</td>
                            <td class="py-3.5 px-6">
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${r.status === 'closed' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">${r.status === 'closed' ? 'TERKUNCI (CLOSED)' : 'TERBUKA (OPEN)'}</span>
                            </td>
                            <td class="py-3.5 px-6 font-mono text-primary-600">${App.escapeHtml(r.closing_journal_no || '-')}</td>
                            <td class="py-3.5 px-6 text-slate-500">${App.escapeHtml(r.closed_by_name || '-')} ${r.closed_at ? `Â· ${App.formatDateTime(r.closed_at)}` : ''}</td>
                            <td class="py-3.5 px-6 text-right">
                                ${r.status === 'closed' ? `<button type="button" onclick="window.reopenPeriod('${App.escapeHtml(r.periode)}')" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold">Buka Kembali</button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    };

    document.getElementById('btn-pc-close')?.addEventListener('click', async () => {
        const periode = document.getElementById('pc-month')?.value;
        if (!periode) return;
        if (!await App.confirm(`Tutup Buku Periode ${periode}?`, 'Transaksi pada periode ini akan dikunci dan jurnal penutup otomatis dibuat.')) return;
        const r = await App.api('accounting/periods/close', { method: 'POST', body: { periode } });
        if (r?.success) { App.toast(r.message, 'success'); load(); }
    });

    window.reopenPeriod = async (periode) => {
        if (!await App.confirm(`Buka Kembali Periode ${periode}?`, 'Jurnal penutup periode ini akan dihapus dan transaksi dapat diubah kembali.')) return;
        const r = await App.api('accounting/periods/reopen', { method: 'POST', body: { periode } });
        if (r?.success) { App.toast(r.message, 'success'); load(); }
    };

    await load();
}

