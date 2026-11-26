// assets/js/pages/accounting/coa-journals.js
import { App } from '../../app.js';
import { fetchCoa, exportDropdownHtml, bindExportDropdown } from './shared.js';

// ===== 1. MASTER COA =====
export async function renderCoa(cont) {
    const list = await fetchCoa();

    const tipeColors = {
        aset: 'bg-sky-50 text-sky-700 border-sky-200',
        kewajiban: 'bg-amber-50 text-amber-700 border-amber-200',
        ekuitas: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        pendapatan: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        beban: 'bg-rose-50 text-rose-700 border-rose-200'
    };

    cont.innerHTML = `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            <div class="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 class="text-base font-bold text-slate-900 dark:text-white">Daftar Bagan Akun (Chart of Accounts)</h2>
                    <p class="text-xs text-slate-500">Saldo dihitung real-time dari seluruh entri Jurnal Umum.</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <input type="text" id="coa-search" placeholder="Cari kode / nama akun..." class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    <select id="coa-filter-tipe" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                        <option value="">Semua Tipe</option>
                        <option value="aset">Aset</option>
                        <option value="kewajiban">Kewajiban</option>
                        <option value="ekuitas">Ekuitas</option>
                        <option value="pendapatan">Pendapatan</option>
                        <option value="beban">Beban</option>
                    </select>
                    <button type="button" id="btn-add-coa" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5">
                        <i class="ri-add-line"></i><span>Tambah Akun COA</span>
                    </button>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="data-table w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500">
                            <th class="py-3.5 px-6">Kode Akun</th>
                            <th class="py-3.5 px-6">Nama Akun</th>
                            <th class="py-3.5 px-6">Tipe</th>
                            <th class="py-3.5 px-6">Saldo Normal</th>
                            <th class="py-3.5 px-6 text-right">Saldo Saat Ini</th>
                            <th class="py-3.5 px-6 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="coa-tbody" class="divide-y divide-slate-100 dark:divide-slate-800"></tbody>
                </table>
            </div>
        </div>
    `;

    const renderCoaRows = () => {
        const tbody = document.getElementById('coa-tbody');
        if (!tbody) return;
        const q = (document.getElementById('coa-search')?.value || '').trim().toLowerCase();
        const tipe = document.getElementById('coa-filter-tipe')?.value || '';
        const filtered = list.filter(c => {
            const matchQ = !q || String(c.kode_akun).toLowerCase().includes(q) || String(c.nama_akun).toLowerCase().includes(q);
            const matchT = !tipe || c.tipe_akun === tipe;
            return matchQ && matchT;
        });
        tbody.innerHTML = filtered.length ? filtered.map(c => `
            <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td class="py-3.5 px-6 font-mono font-bold text-slate-800 dark:text-slate-100">${App.escapeHtml(c.kode_akun)}</td>
                <td class="py-3.5 px-6">
                    <div class="font-bold text-slate-900 dark:text-white">${App.escapeHtml(c.nama_akun)}</div>
                    ${c.keterangan ? `<div class="text-[11px] text-slate-400">${App.escapeHtml(c.keterangan)}</div>` : ''}
                </td>
                <td class="py-3.5 px-6">
                    <span class="px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${tipeColors[c.tipe_akun] || ''}">${App.escapeHtml(c.tipe_akun)}</span>
                </td>
                <td class="py-3.5 px-6 uppercase font-mono text-[11px] text-slate-500">${App.escapeHtml(c.saldo_normal)}</td>
                <td class="py-3.5 px-6 text-right font-mono font-bold ${Number(c.saldo) < 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}">${App.formatIDR(c.saldo)}</td>
                <td class="py-3.5 px-6 text-right whitespace-nowrap">
                    <button type="button" onclick="window.editCoa(${c.id})" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-[11px]">Edit</button>
                    ${Number(c.is_system) === 0 ? `<button type="button" onclick="window.deleteCoa(${c.id})" class="ml-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-[11px]">Hapus</button>` : ''}
                </td>
            </tr>
        `).join('') : `<tr><td colspan="6" class="py-8 text-center text-slate-400">Tidak ada akun COA yang sesuai filter.</td></tr>`;
    };
    renderCoaRows();
    document.getElementById('coa-search')?.addEventListener('input', renderCoaRows);
    document.getElementById('coa-filter-tipe')?.addEventListener('change', renderCoaRows);

    const openCoaModal = (coa = null) => {
        App.openModal(`
            <div class="p-6 space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 class="text-base font-bold text-slate-900 dark:text-white">${coa ? 'Edit Akun COA' : 'Tambah Akun COA'}</h3>
                    <button type="button" onclick="App.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><i class="ri-close-line"></i></button>
                </div>
                <form id="coa-form" class="space-y-3.5">
                    <input type="hidden" id="coa-id" value="${coa ? coa.id : ''}">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Kode Akun *</label>
                            <input type="text" id="coa-kode" required value="${coa ? App.escapeHtml(coa.kode_akun) : ''}" placeholder="1104" class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Tipe Akun *</label>
                            <select id="coa-tipe" class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                ${['aset', 'kewajiban', 'ekuitas', 'pendapatan', 'beban'].map(t => `<option value="${t}" ${coa?.tipe_akun === t ? 'selected' : ''}>${t.toUpperCase()}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Nama Akun *</label>
                        <input type="text" id="coa-nama" required value="${coa ? App.escapeHtml(coa.nama_akun) : ''}" placeholder="Contoh: Bank Mandiri Operasional" class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Saldo Normal</label>
                            <select id="coa-normal" class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                <option value="debit" ${coa?.saldo_normal === 'debit' ? 'selected' : ''}>Debit</option>
                                <option value="kredit" ${coa?.saldo_normal === 'kredit' ? 'selected' : ''}>Kredit</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Status</label>
                            <select id="coa-status" class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                <option value="aktif" ${coa?.status !== 'nonaktif' ? 'selected' : ''}>Aktif</option>
                                <option value="nonaktif" ${coa?.status === 'nonaktif' ? 'selected' : ''}>Nonaktif</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Keterangan</label>
                        <input type="text" id="coa-ket" value="${coa ? App.escapeHtml(coa.keterangan || '') : ''}" class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    </div>
                    <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                        <button type="button" onclick="App.closeModal()" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">Batal</button>
                        <button type="submit" class="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold">Simpan Akun</button>
                    </div>
                </form>
            </div>
        `, 'max-w-lg');

        document.getElementById('coa-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const r = await App.api('accounting/coa', {
                method: 'POST',
                body: {
                    id: document.getElementById('coa-id').value || null,
                    kode_akun: document.getElementById('coa-kode').value.trim(),
                    nama_akun: document.getElementById('coa-nama').value.trim(),
                    tipe_akun: document.getElementById('coa-tipe').value,
                    saldo_normal: document.getElementById('coa-normal').value,
                    status: document.getElementById('coa-status').value,
                    keterangan: document.getElementById('coa-ket').value.trim()
                }
            });
            if (r?.success) {
                App.toast(r.message, 'success');
                App.closeModal();
                renderCoa(cont);
            }
        });
    };

    document.getElementById('btn-add-coa')?.addEventListener('click', () => openCoaModal(null));
    window.editCoa = (id) => openCoaModal(list.find(x => Number(x.id) === Number(id)));
    window.deleteCoa = async (id) => {
        if (!await App.confirm('Hapus Akun COA?', 'Akun yang belum memiliki transaksi akan dihapus permanen.')) return;
        const r = await App.api(`accounting/coa/${id}`, { method: 'DELETE' });
        if (r?.success) { App.toast(r.message, 'success'); renderCoa(cont); }
    };
}

// ===== 2. JURNAL UMUM =====
export async function renderJournals(cont) {
    await fetchCoa();
    cont.innerHTML = `
        <div class="space-y-4">
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2">
                    <input type="text" id="jrn-search" placeholder="Cari no. jurnal / akun / ket..." class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    <input type="date" id="jrn-start" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    <span class="text-xs text-slate-400">s/d</span>
                    <input type="date" id="jrn-end" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    <select id="jrn-sumber" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                        <option value="">Semua Sumber</option>
                        <option value="invoice">Otomatis: Faktur</option>
                        <option value="payment">Otomatis: Pembayaran</option>
                        <option value="expense">Otomatis: Pengeluaran</option>
                        <option value="manual">Jurnal Manual</option>
                    </select>
                    <button type="button" id="btn-jrn-filter" class="px-3.5 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold">Terapkan</button>
                    <button type="button" id="btn-jrn-reset" class="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold">Reset</button>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    ${exportDropdownHtml('jrn')}
                    <button type="button" id="btn-add-journal" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5">
                        <i class="ri-add-line"></i><span>Buat Jurnal Manual</span>
                    </button>
                </div>
            </div>
            <div id="journals-list" class="space-y-3 max-h-[64vh] overflow-y-auto pr-1"></div>
        </div>
    `;

    let lastJournals = [];
    const loadList = async () => {
        const q = new URLSearchParams({
            search: document.getElementById('jrn-search')?.value.trim() || '',
            start_date: document.getElementById('jrn-start')?.value || '',
            end_date: document.getElementById('jrn-end')?.value || '',
            sumber_tipe: document.getElementById('jrn-sumber')?.value || ''
        }).toString();
        const res = await App.api(`accounting/journals?${q}`, { cache: false });
        const listEl = document.getElementById('journals-list');
        if (!listEl) return;
        const rows = res?.success ? (res.data || []) : [];
        lastJournals = rows;
        if (!rows.length) {
            listEl.innerHTML = `<div class="p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center text-xs text-slate-400">Belum ada entri jurnal. Klik <b>Sinkronkan Transaksi ERP</b> untuk menarik data faktur, pembayaran &amp; pengeluaran.</div>`;
            return;
        }
        listEl.innerHTML = rows.map(j => `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                <div class="px-5 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div class="flex items-center gap-2.5 flex-wrap">
                        <span class="font-mono font-bold text-primary-600">${App.escapeHtml(j.nomor_jurnal)}</span>
                        <span class="font-mono text-slate-500">${App.formatDate(j.tanggal)}</span>
                        <span class="px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-[10px] font-bold uppercase">${App.escapeHtml(j.sumber_tipe)}</span>
                        <span class="font-semibold text-slate-800 dark:text-slate-100">${App.escapeHtml(j.deskripsi)}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-mono font-bold text-slate-700 dark:text-slate-200">${App.formatIDR(j.total_debit)}</span>
                        ${j.sumber_tipe === 'manual' ? `<button type="button" onclick="window.deleteManualJournal(${j.id})" class="px-2 py-1 rounded-lg bg-rose-50 text-rose-600 text-[11px] font-semibold">Hapus</button>` : ''}
                    </div>
                </div>
                <table class="w-full text-xs">
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        ${(j.items || []).map(it => `
                            <tr>
                                <td class="py-2 px-5 font-mono text-slate-500 w-24">${App.escapeHtml(it.kode_akun)}</td>
                                <td class="py-2 px-3 ${Number(it.kredit) > 0 ? 'pl-8 text-slate-600 dark:text-slate-300' : 'font-semibold text-slate-800 dark:text-slate-100'}">${App.escapeHtml(it.nama_akun)}</td>
                                <td class="py-2 px-5 text-right font-mono w-36 ${Number(it.debit) > 0 ? 'text-emerald-600 font-bold' : 'text-slate-300'}">${Number(it.debit) > 0 ? App.formatIDR(it.debit) : '-'}</td>
                                <td class="py-2 px-5 text-right font-mono w-36 ${Number(it.kredit) > 0 ? 'text-indigo-600 font-bold' : 'text-slate-300'}">${Number(it.kredit) > 0 ? App.formatIDR(it.kredit) : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('');
    };

    window.deleteManualJournal = async (id) => {
        if (!await App.confirm('Hapus Jurnal Manual?', 'Entri jurnal ini akan dihapus permanen.')) return;
        const r = await App.api(`accounting/journals/${id}`, { method: 'DELETE' });
        if (r?.success) { App.toast(r.message, 'success'); loadList(); }
    };

    ['jrn-start', 'jrn-end', 'jrn-sumber'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', loadList);
    });
    document.getElementById('jrn-search')?.addEventListener('input', App.debounce(loadList, 300));
    document.getElementById('btn-jrn-filter')?.addEventListener('click', loadList);
    document.getElementById('btn-jrn-reset')?.addEventListener('click', () => {
        ['jrn-search', 'jrn-start', 'jrn-end', 'jrn-sumber'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        loadList();
    });

    const exportJrnPdf = async (output = 'bloburl') => {
        if (!lastJournals.length) return App.toast('Belum ada data jurnal untuk diekspor', 'warning');
        const bodyRows = [];
        let totD = 0;
        let totK = 0;
        lastJournals.forEach(j => {
            totD += Number(j.total_debit || 0);
            totK += Number(j.total_kredit || 0);
            (j.items || []).forEach((it, idx) => {
                bodyRows.push([
                    idx === 0 ? App.formatDate(j.tanggal) : '',
                    idx === 0 ? j.nomor_jurnal : '',
                    idx === 0 ? String(j.sumber_tipe || '').toUpperCase() : '',
                    `${it.kode_akun} â€” ${it.nama_akun}` + (idx === 0 && j.deskripsi ? `\n(${j.deskripsi})` : ''),
                    Number(it.debit) > 0 ? App.formatIDR(it.debit) : '-',
                    Number(it.kredit) > 0 ? App.formatIDR(it.kredit) : '-'
                ]);
            });
        });
        const pdfRes = await App.exportPdf({
            filename: `jurnal_umum_${new Date().toISOString().slice(0, 10)}.pdf`,
            title: 'LAPORAN JURNAL UMUM (GENERAL JOURNAL)',
            subtitle: `Dicetak pada ${App.formatDate(new Date().toISOString().slice(0, 10))} Â· Total ${lastJournals.length} transaksi`,
            orientation: 'landscape',
            output,
            summaryCards: [
                { label: 'Jumlah Entri Jurnal', value: `${lastJournals.length} Transaksi`, tone: 'default' },
                { label: 'Total Mutasi Debit', value: App.formatIDR(totD), tone: 'default' },
                { label: 'Total Mutasi Kredit', value: App.formatIDR(totK), tone: 'default' },
                { label: 'Status', value: Math.abs(totD - totK) < 0.05 ? 'BALANCE' : 'SELISIH', tone: 'default' }
            ],
            sections: [
                {
                    type: 'table',
                    heading: 'Rincian Entri Jurnal Umum',
                    head: ['Tanggal', 'No. Jurnal', 'Sumber', 'Akun & Keterangan', 'Debit', 'Kredit'],
                    body: bodyRows,
                    foot: ['', '', '', 'TOTAL MUTASI JURNAL', App.formatIDR(totD), App.formatIDR(totK)],
                    columnStyles: {
                        0: { cellWidth: 26 },
                        1: { cellWidth: 34, fontStyle: 'bold' },
                        2: { cellWidth: 22, halign: 'center' },
                        4: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
                        5: { cellWidth: 36, halign: 'right', fontStyle: 'bold' }
                    }
                }
            ]
        });
        if (output === 'bloburl' && pdfRes?.blobUrl) {
            App.openPdfModal({ title: 'Pratinjau Laporan Jurnal Umum', filename: pdfRes.filename, blobUrl: pdfRes.blobUrl });
        }
    };

    bindExportDropdown('jrn', {
        onPreviewPdf: () => exportJrnPdf('bloburl'),
        onDownloadPdf: () => exportJrnPdf('download'),
        onCsv: () => {
            if (!lastJournals.length) return App.toast('Belum ada data jurnal untuk diekspor', 'warning');
            const flat = [];
            lastJournals.forEach(j => (j.items || []).forEach(it => {
                flat.push([j.tanggal, j.nomor_jurnal, j.sumber_tipe, j.deskripsi, it.kode_akun, it.nama_akun, it.debit, it.kredit]);
            }));
            App.exportCsv('jurnal_umum.csv', ['Tanggal', 'No Jurnal', 'Sumber', 'Deskripsi', 'Kode Akun', 'Nama Akun', 'Debit', 'Kredit'], flat);
        }
    });

    document.getElementById('btn-add-journal')?.addEventListener('click', () => {
        const coaOpts = coaCache.filter(c => c.status === 'aktif').map(c => `<option value="${c.id}">${App.escapeHtml(c.kode_akun)} - ${App.escapeHtml(c.nama_akun)}</option>`).join('');
        App.openModal(`
            <div class="p-6 space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 class="text-base font-bold text-slate-900 dark:text-white">Buat Jurnal Manual (Double-Entry)</h3>
                    <button type="button" onclick="App.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><i class="ri-close-line"></i></button>
                </div>
                <form id="jrn-manual-form" class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Tanggal *</label>
                            <input type="date" id="jm-tgl" required value="${new Date().toISOString().slice(0, 10)}" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>
                        <div class="sm:col-span-2">
                            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Deskripsi Transaksi *</label>
                            <input type="text" id="jm-desc" required placeholder="Contoh: Setoran modal awal pemilik" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        </div>
                    </div>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase text-slate-500">Baris Akun (Debit &amp; Kredit harus seimbang)</span>
                            <button type="button" id="btn-jm-add-row" class="text-xs font-bold text-primary-600">+ Tambah Baris</button>
                        </div>
                        <div id="jm-rows" class="space-y-2"></div>
                        <div id="jm-balance-bar" class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs font-mono"></div>
                    </div>
                    <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                        <button type="button" onclick="App.closeModal()" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">Batal</button>
                        <button type="submit" class="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold">Simpan Jurnal</button>
                    </div>
                </form>
            </div>
        `, 'max-w-2xl');

        const recalc = () => {
            let td = 0, tk = 0;
            document.querySelectorAll('.jm-row').forEach(r => {
                td += parseFloat(r.querySelector('.jm-d').value) || 0;
                tk += parseFloat(r.querySelector('.jm-k').value) || 0;
            });
            const bal = Math.abs(td - tk) < 0.01 && td > 0;
            document.getElementById('jm-balance-bar').innerHTML = `
                <span>Total Debit: <b>${App.formatIDR(td)}</b> Â· Total Kredit: <b>${App.formatIDR(tk)}</b></span>
                <span class="font-sans font-bold ${bal ? 'text-emerald-600' : 'text-rose-600'}">${bal ? 'BALANCE' : 'BELUM SEIMBANG'}</span>
            `;
        };
        const addRow = () => {
            const div = document.createElement('div');
            div.className = 'grid grid-cols-12 gap-2 jm-row items-center';
            div.innerHTML = `
                <select class="jm-coa col-span-5 px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">${coaOpts}</select>
                <input type="number" min="0" step="any" placeholder="Debit" value="0" class="jm-d col-span-3 px-2.5 py-2 text-right font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                <input type="number" min="0" step="any" placeholder="Kredit" value="0" class="jm-k col-span-3 px-2.5 py-2 text-right font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                <button type="button" onclick="this.parentElement.remove()" class="col-span-1 text-slate-400 hover:text-rose-600"><i class="ri-delete-bin-line"></i></button>
            `;
            document.getElementById('jm-rows').appendChild(div);
            div.querySelectorAll('input').forEach(inp => inp.addEventListener('input', recalc));
            recalc();
        };
        addRow(); addRow();
        document.getElementById('btn-jm-add-row').onclick = addRow;
        document.getElementById('jrn-manual-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const items = [];
            document.querySelectorAll('.jm-row').forEach(r => {
                items.push({
                    coa_id: r.querySelector('.jm-coa').value,
                    debit: parseFloat(r.querySelector('.jm-d').value) || 0,
                    kredit: parseFloat(r.querySelector('.jm-k').value) || 0
                });
            });
            const res = await App.api('accounting/journals', {
                method: 'POST',
                body: { tanggal: document.getElementById('jm-tgl').value, deskripsi: document.getElementById('jm-desc').value.trim(), items }
            });
            if (res?.success) { App.toast(res.message, 'success'); App.closeModal(); loadList(); }
        });
    });

    await loadList();
}

