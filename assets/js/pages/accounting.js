// assets/js/pages/accounting.js — Master COA, Jurnal Umum, Buku Besar & Neraca Keuangan (Lazy-loaded Tabs)
import { App } from '../app.js';

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
            if (activeTab === 'coa') {
                await (await import('./accounting/coa-journals.js')).renderCoa(cont);
            } else if (activeTab === 'journals') {
                await (await import('./accounting/coa-journals.js')).renderJournals(cont);
            } else if (activeTab === 'ledger') {
                await (await import('./accounting/ledger-balance.js')).renderLedger(cont);
            } else if (activeTab === 'balance-sheet') {
                await (await import('./accounting/ledger-balance.js')).renderBalanceSheet(cont);
            } else if (activeTab === 'trial-balance') {
                await (await import('./accounting/trial-closing.js')).renderTrialBalance(cont);
            } else if (activeTab === 'period-closing') {
                await (await import('./accounting/trial-closing.js')).renderPeriodClosing(cont);
            } else if (activeTab === 'income-statement') {
                await (await import('./accounting/financial-statements.js')).renderIncomeStatement(cont);
            } else if (activeTab === 'cash-flow') {
                await (await import('./accounting/financial-statements.js')).renderCashFlowStatement(cont);
            } else if (activeTab === 'equity-statement') {
                await (await import('./accounting/financial-statements.js')).renderEquityStatement(cont);
            }
        } finally {
            cont.classList.remove('opacity-60', 'pointer-events-none');
        }
    }

    await renderTab();
}
