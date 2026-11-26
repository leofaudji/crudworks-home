// assets/js/pages/accounting/shared.js
import { App } from '../../app.js';
let coaCache = [];

export async function fetchCoa() {
    const res = await App.api('accounting/coa', { cache: false });
    coaCache = res?.success && Array.isArray(res.data) ? res.data : [];
    return coaCache;
}

export function exportDropdownHtml(prefix) {
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

export function bindExportDropdown(prefix, { onPreviewPdf, onDownloadPdf, onCsv }) {
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

