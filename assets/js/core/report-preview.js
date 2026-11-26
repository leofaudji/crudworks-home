// ============================================
// REPORT EXPORT & PREVIEW (PDF / CSV)
// ============================================
import { btnLoading, escapeHtml, toast } from './utils.js';
import { exportPdf } from './pdf/reports.js';

let _reportMenuGlobalBound = false;
function _bindReportMenuGlobalEvents() {
    if (_reportMenuGlobalBound || typeof document === 'undefined') return;
    _reportMenuGlobalBound = true;
    document.addEventListener('click', (e) => {
        if (!e.target.closest('[data-report-export]')) {
            closeReportExportMenus();
        }
    });
}

export function closeReportExportMenus() {
    document.querySelectorAll('[data-report-export-menu]').forEach((el) => {
        el.classList.add('hidden');
    });
}

export function toggleReportExportMenu(btn, event) {
    if (event) event.stopPropagation();
    _bindReportMenuGlobalEvents();
    const wrap = btn?.closest('[data-report-export]');
    const menu = wrap?.querySelector('[data-report-export-menu]');
    if (!menu) return;
    const isHidden = menu.classList.contains('hidden');
    closeReportExportMenus();
    if (isHidden) {
        menu.classList.remove('hidden');
    }
}

export function reportExportDropdownHtml(pageVarName, label = 'Buka Laporan') {
    return `
    <div class="relative inline-block" data-report-export>
        <button type="button" data-report-export-trigger onclick="App.toggleReportExportMenu(this, event)"
                class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-primary-600 dark:hover:bg-primary-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition shadow-xs">
            <i class="ri-file-text-line"></i>
            <span>${escapeHtml(label)}</span>
            <i class="ri-arrow-down-s-line text-sm"></i>
        </button>
        <div class="hidden absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-40" data-report-export-menu>
            <button type="button" onclick="App.closeReportExportMenus(); ${pageVarName}.openPdf(this)"
                    class="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition">
                <i class="ri-file-pdf-2-line text-rose-600 text-base shrink-0"></i>
                <div>
                    <div class="leading-tight">Buka PDF</div>
                    <div class="text-[10px] font-normal text-slate-400">Preview dokumen di menu ini</div>
                </div>
            </button>
            <button type="button" onclick="App.closeReportExportMenus(); ${pageVarName}.openCsv(this)"
                    class="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition">
                <i class="ri-file-excel-2-line text-emerald-600 text-base shrink-0"></i>
                <div>
                    <div class="leading-tight">Buka CSV</div>
                    <div class="text-[10px] font-normal text-slate-400">Preview tabel &amp; data CSV</div>
                </div>
            </button>
        </div>
    </div>`;
}

function _resolveHostContainer(hostOrBtn) {
    if (!hostOrBtn) return null;
    if (hostOrBtn.querySelector?.('[data-report-preview]')) return hostOrBtn;
    return hostOrBtn.closest?.('[data-report-host]') || document.getElementById('page-content');
}

export function closeReportPreview(hostOrEl) {
    const host = _resolveHostContainer(hostOrEl);
    if (!host) return;
    if (host._reportPreviewUrl) {
        try { URL.revokeObjectURL(host._reportPreviewUrl); } catch (_) {}
        delete host._reportPreviewUrl;
    }
    const previewEl = host.querySelector('[data-report-preview]');
    const bodyEl = host.querySelector('[data-report-body]');
    if (previewEl) {
        previewEl.innerHTML = '';
        previewEl.classList.add('hidden');
    }
    if (bodyEl) {
        bodyEl.classList.remove('hidden');
    }
}

export async function openReportPdfPreview(hostContainer, pdfConfig, actionBtn = null) {
    const host = _resolveHostContainer(hostContainer);
    if (!host) return;
    const previewEl = host.querySelector('[data-report-preview]');
    const bodyEl = host.querySelector('[data-report-body]');
    if (!previewEl) return;

    const triggerBtn = host.querySelector('[data-report-export-trigger]') || actionBtn;
    btnLoading(triggerBtn, true, 'Memuat PDF...');
    try {
        const result = await exportPdf({ ...pdfConfig, output: 'bloburl' });
        if (host._reportPreviewUrl) {
            try { URL.revokeObjectURL(host._reportPreviewUrl); } catch (_) {}
        }
        host._reportPreviewUrl = result.blobUrl;

        if (bodyEl) bodyEl.classList.add('hidden');
        previewEl.classList.remove('hidden');
        previewEl.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden animate-fadeIn">
                <div class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/50">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                            <i class="ri-file-pdf-2-line text-lg"></i>
                        </div>
                        <div class="min-w-0">
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white truncate">${escapeHtml(pdfConfig.title || 'Preview PDF')}</h3>
                            <p class="text-[11px] text-slate-500 font-mono truncate">${escapeHtml(result.filename)}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button" data-action="close-preview"
                                class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition">
                            <i class="ri-close-line text-sm"></i> Tutup Preview
                        </button>
                    </div>
                </div>
                <div class="p-3 bg-slate-100 dark:bg-slate-950">
                    <iframe src="${result.blobUrl}#view=FitH"
                            class="w-full h-[76vh] min-h-[540px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
                            title="${escapeHtml(pdfConfig.title || 'Preview PDF')}"></iframe>
                </div>
            </div>
        `;
        previewEl.querySelector('[data-action="close-preview"]')?.addEventListener('click', () => {
            closeReportPreview(host);
        });
    } catch (err) {
        toast(err?.message || 'Gagal membuka preview PDF', 'error');
    } finally {
        btnLoading(triggerBtn, false);
    }
}

export function openReportCsvPreview(hostContainer, { filename = 'laporan.csv', title = 'Preview CSV', subtitle = '', headers = [], rows = [] } = {}) {
    const host = _resolveHostContainer(hostContainer);
    if (!host) return;
    if (!rows || rows.length === 0) {
        toast('Tidak ada data untuk ditampilkan', 'warning');
        return;
    }

    const previewEl = host.querySelector('[data-report-preview]');
    const bodyEl = host.querySelector('[data-report-body]');
    if (!previewEl) return;

    if (host._reportPreviewUrl) {
        try { URL.revokeObjectURL(host._reportPreviewUrl); } catch (_) {}
        delete host._reportPreviewUrl;
    }

    const csvEscape = (v) => `"${String(v === null || v === undefined ? '' : v).replace(/"/g, '""')}"`;
    const csvLines = [headers.map(csvEscape).join(','), ...rows.map((r) => r.map(csvEscape).join(','))];
    const csvText = csvLines.join('\n');

    if (bodyEl) bodyEl.classList.add('hidden');
    previewEl.classList.remove('hidden');
    previewEl.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden animate-fadeIn">
            <div class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/50">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                        <i class="ri-file-excel-2-line text-lg"></i>
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white truncate">${escapeHtml(title)} (CSV · ${rows.length} baris)</h3>
                        <p class="text-[11px] text-slate-500 truncate">${escapeHtml(subtitle || filename)}</p>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <div class="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-0.5 text-[11px] font-semibold">
                        <button type="button" data-csv-tab="table" class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs">Tabel</button>
                        <button type="button" data-csv-tab="raw" class="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800">Teks CSV</button>
                    </div>
                    <button type="button" data-action="copy-csv"
                            class="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition">
                        <i class="ri-file-copy-line"></i> Salin CSV
                    </button>
                    <button type="button" data-action="close-preview"
                            class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition">
                        <i class="ri-close-line text-sm"></i> Tutup Preview
                    </button>
                </div>
            </div>
            <div data-csv-view="table" class="p-4 overflow-x-auto max-h-[72vh] overflow-y-auto">
                <table class="data-table w-full text-xs">
                    <thead>
                        <tr class="bg-slate-50 dark:bg-slate-800/70 uppercase text-slate-500">
                            <th class="px-3 py-2 text-center w-10">#</th>
                            ${headers.map((h) => `<th class="px-3 py-2 text-left whitespace-nowrap">${escapeHtml(h)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        ${rows.map((r, i) => `
                        <tr>
                            <td class="px-3 py-2 text-center font-mono text-slate-400">${i + 1}</td>
                            ${r.map((cell) => `<td class="px-3 py-2 whitespace-nowrap font-mono text-[11px]">${escapeHtml(cell ?? '')}</td>`).join('')}
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
            <div data-csv-view="raw" class="hidden p-4 bg-slate-950 text-slate-100 max-h-[72vh] overflow-auto">
                <pre class="text-[11px] font-mono leading-relaxed whitespace-pre">${escapeHtml(csvText)}</pre>
            </div>
        </div>
    `;

    const tabTable = previewEl.querySelector('[data-csv-tab="table"]');
    const tabRaw = previewEl.querySelector('[data-csv-tab="raw"]');
    const viewTable = previewEl.querySelector('[data-csv-view="table"]');
    const viewRaw = previewEl.querySelector('[data-csv-view="raw"]');
    const switchTab = (mode) => {
        const isTable = mode === 'table';
        viewTable?.classList.toggle('hidden', !isTable);
        viewRaw?.classList.toggle('hidden', isTable);
        if (tabTable && tabRaw) {
            tabTable.className = isTable
                ? 'px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800';
            tabRaw.className = !isTable
                ? 'px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800';
        }
    };
    tabTable?.addEventListener('click', () => switchTab('table'));
    tabRaw?.addEventListener('click', () => switchTab('raw'));
    previewEl.querySelector('[data-action="copy-csv"]')?.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(csvText);
            toast('Data CSV disalin ke clipboard', 'success');
        } catch (_) {
            toast('Gagal menyalin ke clipboard', 'error');
        }
    });
    previewEl.querySelector('[data-action="close-preview"]')?.addEventListener('click', () => {
        closeReportPreview(host);
    });
}
