// assets/js/pages/accounting.js — Master COA, Jurnal Umum, Buku Besar & Neraca Keuangan
import { App } from '../app.js';

let coaCache = [];

function getActiveTabFromHash() {
    const hash = (window.location.hash || '').replace(/^#\//, '').split('?')[0];
    if (['coa', 'journals', 'ledger', 'trial-balance', 'income-statement', 'cash-flow', 'equity-statement', 'balance-sheet', 'period-closing'].includes(hash)) return hash;
    return 'coa';
}

export async function init(container) {
    let activeTab = getActiveTabFromHash();

    const tabs = [
        { id: 'coa', label: 'Master COA', icon: 'ri-book-2-line', hash: '#/coa' },
        { id: 'journals', label: 'Jurnal Umum', icon: 'ri-file-list-2-line', hash: '#/journals' },
        { id: 'ledger', label: 'Buku Besar', icon: 'ri-book-open-line', hash: '#/ledger' },
        { id: 'trial-balance', label: 'Neraca Saldo', icon: 'ri-scales-2-line', hash: '#/trial-balance' },
        { id: 'income-statement', label: 'Laba Rugi (COA)', icon: 'ri-funds-line', hash: '#/income-statement' },
        { id: 'cash-flow', label: 'Arus Kas', icon: 'ri-exchange-dollar-line', hash: '#/cash-flow' },
        { id: 'equity-statement', label: 'Perubahan Ekuitas', icon: 'ri-pie-chart-line', hash: '#/equity-statement' },
        { id: 'balance-sheet', label: 'Neraca Keuangan', icon: 'ri-scales-line', hash: '#/balance-sheet' },
        { id: 'period-closing', label: 'Tutup Buku', icon: 'ri-lock-2-line', hash: '#/period-closing' }
    ];

    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Akuntansi &amp; Laporan Keuangan</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Terintegrasi otomatis dengan Faktur, Pembayaran Masuk, dan Pengeluaran Operasional.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" id="btn-acc-sync" class="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition">
                        <i class="ri-refresh-line"></i><span>Sinkronkan Transaksi ERP</span>
                    </button>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-fit">
                ${tabs.map(t => `
                    <button type="button" data-acctab="${t.id}" data-hash="${t.hash}"
                       class="acc-tab px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition ${activeTab === t.id ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}">
                        <i class="${t.icon}"></i><span>${t.label}</span>
                    </button>
                `).join('')}
            </div>

            <div id="accounting-content" class="transition-opacity duration-150"></div>
        </div>
    `;

    document.querySelectorAll('.acc-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const nextTab = btn.getAttribute('data-acctab');
            const nextHash = btn.getAttribute('data-hash');
            if (!nextTab || nextTab === activeTab) return;
            activeTab = nextTab;
            document.querySelectorAll('.acc-tab').forEach(b => {
                const isAct = b.getAttribute('data-acctab') === activeTab;
                b.className = `acc-tab px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition ${isAct ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`;
            });
            if (nextHash && window.history?.replaceState) {
                window.history.replaceState(null, '', nextHash);
            }
            renderTab();
        });
    });

    document.getElementById('btn-acc-sync')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-acc-sync');
        App.btnLoading(btn, true, 'Menyinkronkan...');
        const res = await App.api('accounting/sync-existing', { method: 'POST' });
        App.btnLoading(btn, false);
        if (res?.success) {
            App.toast(res.message, 'success');
            renderTab();
        }
    });

    async function renderTab() {
        const cont = document.getElementById('accounting-content');
        if (!cont) return;
        cont.classList.add('opacity-60', 'pointer-events-none');
        try {
            if (activeTab === 'coa') await renderCoa(cont);
            else if (activeTab === 'journals') await renderJournals(cont);
            else if (activeTab === 'ledger') await renderLedger(cont);
            else if (activeTab === 'trial-balance') await renderTrialBalance(cont);
            else if (activeTab === 'income-statement') await renderIncomeStatement(cont);
            else if (activeTab === 'cash-flow') await renderCashFlowStatement(cont);
            else if (activeTab === 'equity-statement') await renderEquityStatement(cont);
            else if (activeTab === 'period-closing') await renderPeriodClosing(cont);
            else await renderBalanceSheet(cont);
        } finally {
            cont.classList.remove('opacity-60', 'pointer-events-none');
        }
    }

    await renderTab();
}

async function fetchCoa() {
    const res = await App.api('accounting/coa', { cache: false });
    coaCache = res?.success && Array.isArray(res.data) ? res.data : [];
    return coaCache;
}

function exportDropdownHtml(prefix) {
    return `
        <div class="relative inline-block" id="${prefix}-export-wrap">
            <button type="button" id="${prefix}-export-btn"
                class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-primary-600 dark:hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition">
                <i class="ri-download-2-line"></i><span>Ekspor</span><i class="ri-arrow-down-s-line"></i>
            </button>
            <div id="${prefix}-export-menu" class="hidden absolute right-0 mt-1.5 w-44 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 py-1.5 z-40">
                <button type="button" id="${prefix}-preview-pdf" class="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                    <i class="ri-eye-line text-primary-600"></i><span>Pratinjau PDF</span>
                </button>
                <button type="button" id="${prefix}-download-pdf" class="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                    <i class="ri-file-pdf-2-line text-rose-600"></i><span>Unduh PDF</span>
                </button>
                <button type="button" id="${prefix}-download-csv" class="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                    <i class="ri-file-excel-2-line text-emerald-600"></i><span>Unduh CSV</span>
                </button>
            </div>
        </div>
    `;
}

function bindExportDropdown(prefix, { onPreviewPdf, onDownloadPdf, onCsv }) {
    const btn = document.getElementById(`${prefix}-export-btn`);
    const menu = document.getElementById(`${prefix}-export-menu`);
    const wrap = document.getElementById(`${prefix}-export-wrap`);
    if (!btn || !menu) return;

    btn.onclick = (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
    };
    document.addEventListener('click', (e) => {
        if (wrap && !wrap.contains(e.target)) menu.classList.add('hidden');
    });

    document.getElementById(`${prefix}-preview-pdf`)?.addEventListener('click', () => { menu.classList.add('hidden'); onPreviewPdf(); });
    document.getElementById(`${prefix}-download-pdf`)?.addEventListener('click', () => { menu.classList.add('hidden'); onDownloadPdf(); });
    document.getElementById(`${prefix}-download-csv`)?.addEventListener('click', () => { menu.classList.add('hidden'); onCsv(); });
}

// ===== 1. MASTER COA =====
async function renderCoa(cont) {
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
async function renderJournals(cont) {
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
                    `${it.kode_akun} — ${it.nama_akun}` + (idx === 0 && j.deskripsi ? `\n(${j.deskripsi})` : ''),
                    Number(it.debit) > 0 ? App.formatIDR(it.debit) : '-',
                    Number(it.kredit) > 0 ? App.formatIDR(it.kredit) : '-'
                ]);
            });
        });
        const pdfRes = await App.exportPdf({
            filename: `jurnal_umum_${new Date().toISOString().slice(0, 10)}.pdf`,
            title: 'LAPORAN JURNAL UMUM (GENERAL JOURNAL)',
            subtitle: `Dicetak pada ${App.formatDate(new Date().toISOString().slice(0, 10))} · Total ${lastJournals.length} transaksi`,
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
                <span>Total Debit: <b>${App.formatIDR(td)}</b> · Total Kredit: <b>${App.formatIDR(tk)}</b></span>
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

// ===== 3. BUKU BESAR =====
async function renderLedger(cont) {
    const coas = await fetchCoa();
    const y = new Date().getFullYear();
    if (!document.getElementById('accounting-content')) return;

    cont.innerHTML = `
        <div class="space-y-4">
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2">
                    <select id="led-coa" class="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">
                        ${coas.length ? coas.map(c => `<option value="${c.id}">${App.escapeHtml(c.kode_akun)} — ${App.escapeHtml(c.nama_akun)}</option>`).join('') : '<option value="">Belum ada akun COA</option>'}
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
            title: `BUKU BESAR: ${d.account.kode_akun} — ${d.account.nama_akun}`,
            subtitle: `Periode: ${App.formatDate(d.start_date)} s/d ${App.formatDate(d.end_date)} · Tipe: ${String(d.account.tipe_akun || '').toUpperCase()} (${String(d.account.saldo_normal || '').toUpperCase()})`,
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
                    heading: `Mutasi Akun ${d.account.kode_akun} — ${d.account.nama_akun}`,
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
            App.openPdfModal({ title: `Pratinjau Buku Besar — ${d.account.kode_akun}`, filename: pdfRes.filename, blobUrl: pdfRes.blobUrl });
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
async function renderBalanceSheet(cont) {
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
async function renderTrialBalance(cont) {
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
async function renderPeriodClosing(cont) {
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
                            <td class="py-3.5 px-6 text-slate-500">${App.escapeHtml(r.closed_by_name || '-')} ${r.closed_at ? `· ${App.formatDateTime(r.closed_at)}` : ''}</td>
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

// ===== 7. LAPORAN LABA RUGI BERBASIS COA (INCOME STATEMENT) =====
async function renderIncomeStatement(cont) {
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
async function renderCashFlowStatement(cont) {
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
                    ${exportDropdownHtml('cf')}
                </div>
            </div>
            <div id="cf-body" class="space-y-4"></div>
        </div>
    `;

    let lastCfData = null;
    const load = async () => {
        const sEl = document.getElementById('cf-start');
        const eEl = document.getElementById('cf-end');
        const body = document.getElementById('cf-body');
        if (!sEl || !eEl || !body) return;
        const res = await App.api(`accounting/cash-flow?start_date=${sEl.value}&end_date=${eEl.value}`, { cache: false });
        if (!res?.success || !res.data) return;
        const d = res.data;
        lastCfData = d;

        const renderSec = (title, sec) => `
            <div class="px-5 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800 text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>${title}</span>
                <span class="font-mono">${App.formatIDR(sec.total)}</span>
            </div>
            <div class="divide-y divide-slate-100 dark:divide-slate-800">
                ${sec.items.length ? sec.items.map(it => `
                    <div class="py-2.5 px-5 flex items-center justify-between gap-3 text-xs">
                        <div class="min-w-0">
                            <span class="font-mono text-slate-400 mr-2">${App.formatDate(it.tanggal)}</span>
                            <span class="font-mono font-semibold text-primary-600 mr-2">${App.escapeHtml(it.nomor_jurnal)}</span>
                            <span class="text-slate-700 dark:text-slate-200">${App.escapeHtml(it.deskripsi)}</span>
                        </div>
                        <span class="font-mono font-bold shrink-0 ${Number(it.nominal) >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${App.formatIDR(it.nominal)}</span>
                    </div>
                `).join('') : '<div class="py-3 px-5 text-xs text-slate-400 italic">Tidak ada mutasi kas pada aktivitas ini.</div>'}
            </div>
        `;

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
async function renderEquityStatement(cont) {
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
