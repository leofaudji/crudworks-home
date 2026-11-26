// assets/js/pages/accounting/ledger-balance.js
import { App } from '../../app.js';
import { fetchCoa, exportDropdownHtml, bindExportDropdown } from './shared.js';

// ===== 3. BUKU BESAR =====
export async function renderLedger(cont) {
    const coas = await fetchCoa();
    const y = new Date().getFullYear();
    if (!document.getElementById('accounting-content')) return;

    cont.innerHTML = `
        <div class="space-y-4">
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2">
                    <select id="led-coa" class="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">
                        ${coas.length ? coas.map(c => `<option value="${c.id}">${App.escapeHtml(c.kode_akun)} â€” ${App.escapeHtml(c.nama_akun)}</option>`).join('') : '<option value="">Belum ada akun COA</option>'}
                    </select>
                    <input type="date" id="led-start" value="${y}-01-01" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    <span class="text-xs text-slate-400">s/d</span>
                    <input type="date" id="led-end" value="${new Date().toISOString().slice(0, 10)}" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    <button type="button" id="btn-led-filter" class="px-3.5 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold">Terapkan</button>
                </div>
                <div class="flex items-center gap-2">
                    ${exportDropdownHtml('led')}
                </div>
            </div>
            <div id="ledger-body"></div>
        </div>
    `;

    let lastLedgerData = null;
    const load = async () => {
        const coaEl = document.getElementById('led-coa');
        const startEl = document.getElementById('led-start');
        const endEl = document.getElementById('led-end');
        const body = document.getElementById('ledger-body');
        if (!coaEl || !startEl || !endEl || !body) return;
        if (!coaEl.value) {
            body.innerHTML = `<div class="p-8 text-center text-xs text-slate-400">Belum ada akun COA tersedia.</div>`;
            return;
        }
        const q = new URLSearchParams({
            coa_id: coaEl.value,
            start_date: startEl.value,
            end_date: endEl.value
        }).toString();
        const res = await App.api(`accounting/ledger?${q}`, { cache: false });
        if (!res?.success || !res.data) return;
        lastLedgerData = res.data;
        const d = res.data;
        body.innerHTML = `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                        <span class="font-mono font-bold text-primary-600">${App.escapeHtml(d.account.kode_akun)}</span>
                        <span class="font-bold text-base text-slate-900 dark:text-white ml-2">${App.escapeHtml(d.account.nama_akun)}</span>
                    </div>
                    <div class="flex flex-wrap gap-3 font-mono">
                        <span class="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800">Saldo Awal: <b>${App.formatIDR(d.opening_balance)}</b></span>
                        <span class="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700">Saldo Akhir: <b>${App.formatIDR(d.closing_balance)}</b></span>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500">
                                <th class="py-3 px-5">Tanggal</th>
                                <th class="py-3 px-5">No. Jurnal</th>
                                <th class="py-3 px-5">Keterangan</th>
                                <th class="py-3 px-5 text-right">Debit</th>
                                <th class="py-3 px-5 text-right">Kredit</th>
                                <th class="py-3 px-5 text-right">Saldo Berjalan</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                            ${d.entries.length ? d.entries.map(e => `
                                <tr>
                                    <td class="py-3 px-5">${App.formatDate(e.tanggal)}</td>
                                    <td class="py-3 px-5 font-bold text-primary-600">${App.escapeHtml(e.nomor_jurnal)}</td>
                                    <td class="py-3 px-5 font-sans text-slate-700 dark:text-slate-200">${App.escapeHtml(e.deskripsi)}</td>
                                    <td class="py-3 px-5 text-right text-emerald-600">${Number(e.debit) > 0 ? App.formatIDR(e.debit) : '-'}</td>
                                    <td class="py-3 px-5 text-right text-indigo-600">${Number(e.kredit) > 0 ? App.formatIDR(e.kredit) : '-'}</td>
                                    <td class="py-3 px-5 text-right font-bold">${App.formatIDR(e.saldo)}</td>
                                </tr>
                            `).join('') : `<tr><td colspan="6" class="py-8 text-center font-sans text-slate-400">Belum ada mutasi pada periode ini.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    ['led-coa', 'led-start', 'led-end'].forEach(id => document.getElementById(id)?.addEventListener('change', load));
    document.getElementById('btn-led-filter')?.addEventListener('click', load);
    const exportLedPdf = async (output = 'bloburl') => {
        if (!lastLedgerData) return;
        const d = lastLedgerData;
        const rows = [
            [App.formatDate(d.start_date), '-', 'SALDO AWAL PERIODE', '-', '-', App.formatIDR(d.opening_balance)],
            ...d.entries.map(e => [
                App.formatDate(e.tanggal),
                e.nomor_jurnal,
                e.deskripsi,
                Number(e.debit) > 0 ? App.formatIDR(e.debit) : '-',
                Number(e.kredit) > 0 ? App.formatIDR(e.kredit) : '-',
                App.formatIDR(e.saldo)
            ])
        ];
        const pdfRes = await App.exportPdf({
            filename: `buku_besar_${d.account.kode_akun}.pdf`,
            title: `BUKU BESAR: ${d.account.kode_akun} â€” ${d.account.nama_akun}`,
            subtitle: `Periode: ${App.formatDate(d.start_date)} s/d ${App.formatDate(d.end_date)} Â· Tipe: ${String(d.account.tipe_akun || '').toUpperCase()} (${String(d.account.saldo_normal || '').toUpperCase()})`,
            orientation: 'landscape',
            output,
            summaryCards: [
                { label: 'Saldo Awal', value: App.formatIDR(d.opening_balance), tone: 'default' },
                { label: 'Total Debit', value: App.formatIDR(d.total_debit), tone: 'default' },
                { label: 'Total Kredit', value: App.formatIDR(d.total_kredit), tone: 'default' },
                { label: 'Saldo Akhir', value: App.formatIDR(d.closing_balance), tone: 'default' }
            ],
            sections: [
                {
                    type: 'table',
                    heading: `Mutasi Akun ${d.account.kode_akun} â€” ${d.account.nama_akun}`,
                    head: ['Tanggal', 'No. Jurnal', 'Keterangan Transaksi', 'Debit', 'Kredit', 'Saldo Berjalan'],
                    body: rows,
                    foot: ['', '', 'TOTAL MUTASI & SALDO AKHIR', App.formatIDR(d.total_debit), App.formatIDR(d.total_kredit), App.formatIDR(d.closing_balance)],
                    columnStyles: {
                        0: { cellWidth: 28 },
                        1: { cellWidth: 36, fontStyle: 'bold' },
                        3: { cellWidth: 36, halign: 'right' },
                        4: { cellWidth: 36, halign: 'right' },
                        5: { cellWidth: 38, halign: 'right', fontStyle: 'bold' }
                    }
                }
            ]
        });
        if (output === 'bloburl' && pdfRes?.blobUrl) {
            App.openPdfModal({ title: `Pratinjau Buku Besar â€” ${d.account.kode_akun}`, filename: pdfRes.filename, blobUrl: pdfRes.blobUrl });
        }
    };
    bindExportDropdown('led', {
        onPreviewPdf: () => exportLedPdf('bloburl'),
        onDownloadPdf: () => exportLedPdf('download'),
        onCsv: () => {
            if (!lastLedgerData) return;
            App.exportCsv(
                `buku_besar_${lastLedgerData.account.kode_akun}.csv`,
                ['Tanggal', 'No Jurnal', 'Deskripsi', 'Debit', 'Kredit', 'Saldo'],
                lastLedgerData.entries.map(e => [e.tanggal, e.nomor_jurnal, e.deskripsi, e.debit, e.kredit, e.saldo])
            );
        }
    });
    await load();
}
export async function renderBalanceSheet(cont) {
    cont.innerHTML = `
        <div class="space-y-4">
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                    <label class="text-xs font-bold uppercase text-slate-500">Posisi Per Tanggal:</label>
                    <input type="date" id="bs-asof" value="${new Date().toISOString().slice(0, 10)}" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    <button type="button" id="btn-bs-filter" class="px-3.5 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold">Terapkan</button>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <div id="bs-status-badge"></div>
                    ${exportDropdownHtml('bs')}
                </div>
            </div>
            <div id="bs-body"></div>
        </div>
    `;

    let lastBsData = null;
    const load = async () => {
        const asOfEl = document.getElementById('bs-asof');
        const body = document.getElementById('bs-body');
        const badge = document.getElementById('bs-status-badge');
        if (!asOfEl || !body) return;
        const asOf = asOfEl.value;
        const res = await App.api(`accounting/balance-sheet?as_of=${asOf}`, { cache: false });
        if (!res?.success || !res.data) return;
        const d = res.data;
        lastBsData = d;
        if (badge) {
            badge.innerHTML = d.is_balanced
                ? `<span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold"><i class="ri-check-double-line"></i> NERACA SEIMBANG</span>`
                : `<span class="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">SELISIH: ${App.formatIDR(d.total_aset - d.total_kewajiban_ekuitas)}</span>`;
        }

        const renderRows = (arr) => arr.map(r => `
            <div class="py-2.5 flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span><span class="font-mono text-slate-400 mr-2">${App.escapeHtml(r.kode_akun)}</span><b>${App.escapeHtml(r.nama_akun)}</b></span>
                <span class="font-mono font-bold">${App.formatIDR(r.saldo)}</span>
            </div>
        `).join('');

        body.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <!-- AKTIVA / ASET -->
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between h-full">
                    <div class="space-y-4">
                        <h3 class="text-sm font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-400 pb-2 border-b border-slate-100 dark:border-slate-800">Aktiva (Aset)</h3>
                        <div>${renderRows(d.aset)}</div>
                    </div>
                    <div class="mt-6 pt-3 border-t-2 border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm font-extrabold">
                        <span>Total Aset</span>
                        <span class="font-mono text-sky-700 dark:text-sky-400">${App.formatIDR(d.total_aset)}</span>
                    </div>
                </div>

                <!-- PASIVA: KEWAJIBAN & EKUITAS -->
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between h-full">
                    <div class="space-y-5">
                        <div>
                            <h3 class="text-sm font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 pb-2 border-b border-slate-100 dark:border-slate-800">Kewajiban</h3>
                            <div>${renderRows(d.kewajiban)}</div>
                            <div class="pt-2 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                                <span>Subtotal Kewajiban</span>
                                <span class="font-mono">${App.formatIDR(d.total_kewajiban)}</span>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-sm font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 pb-2 border-b border-slate-100 dark:border-slate-800">Ekuitas</h3>
                            <div>${renderRows(d.ekuitas)}</div>
                            <div class="py-2.5 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800">
                                <span class="font-bold text-emerald-700 dark:text-emerald-400">Laba / (Rugi) Tahun Berjalan</span>
                                <span class="font-mono font-bold text-emerald-700 dark:text-emerald-400">${App.formatIDR(d.laba_berjalan)}</span>
                            </div>
                            <div class="pt-2 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                                <span>Subtotal Ekuitas</span>
                                <span class="font-mono">${App.formatIDR(d.total_ekuitas)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="mt-6 pt-3 border-t-2 border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm font-extrabold">
                        <span>Total Kewajiban &amp; Ekuitas</span>
                        <span class="font-mono text-indigo-700 dark:text-indigo-400">${App.formatIDR(d.total_kewajiban_ekuitas)}</span>
                    </div>
                </div>
            </div>
        `;
    };

    document.getElementById('bs-asof')?.addEventListener('change', load);
    document.getElementById('btn-bs-filter')?.addEventListener('click', load);
    const exportBsPdf = async (output = 'bloburl') => {
        if (!lastBsData) return;
        const d = lastBsData;

        const leftRows = d.aset.map(r => [r.kode_akun, r.nama_akun, App.formatIDR(r.saldo)]);
        const rightRows = [
            [{ content: 'KEWAJIBAN', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }],
            ...d.kewajiban.map(r => [r.kode_akun, r.nama_akun, App.formatIDR(r.saldo)]),
            [{ content: 'Subtotal Kewajiban', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: App.formatIDR(d.total_kewajiban), styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } }],
            [{ content: 'EKUITAS & LABA BERJALAN', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }],
            ...d.ekuitas.map(r => [r.kode_akun, r.nama_akun, App.formatIDR(r.saldo)]),
            ['-', 'Laba / (Rugi) Tahun Berjalan', App.formatIDR(d.laba_berjalan)],
            [{ content: 'Subtotal Ekuitas', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: App.formatIDR(d.total_ekuitas), styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } }]
        ];

        const maxLen = Math.max(leftRows.length, rightRows.length, 1);
        const tBody = [];
        for (let i = 0; i < maxLen; i++) {
            const L = leftRows[i] || ['', '', ''];
            const R = rightRows[i] || ['', '', ''];
            tBody.push([...L, ...R]);
        }

        const pdfRes = await App.exportPdf({
            filename: `neraca_T_${d.as_of}.pdf`,
            title: 'LAPORAN NERACA KEUANGAN (FORMAT T)',
            subtitle: `Posisi Keuangan Per Tanggal: ${App.formatDate(d.as_of)}`,
            orientation: 'landscape',
            output,
            summaryCards: [
                { label: 'Total Aktiva (Aset)', value: App.formatIDR(d.total_aset), tone: 'default' },
                { label: 'Total Kewajiban', value: App.formatIDR(d.total_kewajiban), tone: 'default' },
                { label: 'Total Ekuitas', value: App.formatIDR(d.total_ekuitas), tone: 'default' },
                { label: 'Status Neraca', value: d.is_balanced ? 'SEIMBANG' : 'SELISIH', tone: 'default' }
            ],
            sections: [
                {
                    type: 'table',
                    head: ['Kode', 'AKTIVA (ASET)', 'Saldo (Rp)', 'Kode', 'PASIVA (KEWAJIBAN & EKUITAS)', 'Saldo (Rp)'],
                    body: tBody,
                    foot: ['', 'TOTAL AKTIVA (ASET)', App.formatIDR(d.total_aset), '', 'TOTAL PASIVA (KEWAJIBAN + EKUITAS)', App.formatIDR(d.total_kewajiban_ekuitas)],
                    fontSize: 7.6,
                    columnStyles: {
                        0: { cellWidth: 18, fontStyle: 'bold' },
                        1: { cellWidth: 74 },
                        2: { cellWidth: 42, halign: 'right', fontStyle: 'bold' },
                        3: { cellWidth: 18, fontStyle: 'bold' },
                        4: { cellWidth: 75 },
                        5: { cellWidth: 42, halign: 'right', fontStyle: 'bold' }
                    }
                }
            ]
        });
        if (output === 'bloburl' && pdfRes?.blobUrl) {
            App.openPdfModal({ title: 'Pratinjau Neraca Keuangan', filename: pdfRes.filename, blobUrl: pdfRes.blobUrl });
        }
    };
    bindExportDropdown('bs', {
        onPreviewPdf: () => exportBsPdf('bloburl'),
        onDownloadPdf: () => exportBsPdf('download'),
        onCsv: () => {
            if (!lastBsData) return;
            const d = lastBsData;
            const rows = [
                ...d.aset.map(r => ['Aset', r.kode_akun, r.nama_akun, r.saldo]),
                ...d.kewajiban.map(r => ['Kewajiban', r.kode_akun, r.nama_akun, r.saldo]),
                ...d.ekuitas.map(r => ['Ekuitas', r.kode_akun, r.nama_akun, r.saldo]),
                ['Ekuitas', '-', 'Laba / (Rugi) Tahun Berjalan', d.laba_berjalan]
            ];
            App.exportCsv(`neraca_${d.as_of}.csv`, ['Kelompok', 'Kode Akun', 'Nama Akun', 'Saldo'], rows);
        }
    });
    await load();
}
