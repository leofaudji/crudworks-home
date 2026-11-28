// ============================================
// CORE UTILITIES - Formatters, UI Helpers, Modals, Drawers
// ============================================

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Format currency / Rupiah respecting user preferences in localStorage
 */
export function formatRupiah(amount, prefixOverride = null) {
    const val = Number(amount);
    if (isNaN(val)) return 'Rp 0';

    const sepMode = localStorage.getItem('pref_num_separator') || 'id';
    const decimals = parseInt(localStorage.getItem('pref_num_decimals') || '0', 10);
    const savedPrefix = localStorage.getItem('pref_num_currency_symbol');
    const prefix = prefixOverride !== null
        ? prefixOverride
        : (savedPrefix !== null ? savedPrefix : 'Rp ');

    const isNeg = val < 0;
    const absVal = Math.abs(val);
    const fixed = absVal.toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');

    const thousandSep = sepMode === 'en' ? ',' : '.';
    const decimalSep = sepMode === 'en' ? '.' : ',';

    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
    const formattedNum = decimals > 0 ? `${formattedInt}${decimalSep}${decPart}` : formattedInt;

    return `${isNeg ? '-' : ''}${prefix}${formattedNum}`;
}

export const formatIDR = formatRupiah;

// Ensure globally accessible formatters
if (typeof window !== 'undefined') {
    window.formatDate = formatDate;
    window.formatIDR = formatIDR;
    window.formatRupiah = formatRupiah;
}

/**
 * Format plain number with thousand separator
 */
export function formatNumber(amount, decimals = 0) {
    return formatRupiah(amount, '').trim();
}

/**
 * Format percentage cleanly
 */
export function formatPercent(val, decimals = 2) {
    const num = Number(val);
    if (isNaN(num)) return '0%';
    const sepMode = localStorage.getItem('pref_num_separator') || 'id';
    const fixed = num.toFixed(decimals);
    const formatted = sepMode === 'id' ? fixed.replace('.', ',') : fixed;
    return `${formatted}%`;
}

/**
 * Format date string safely without timezone drift, respecting user preference
 */
export function formatDate(dateStr, formatOverride = null) {
    if (!dateStr) return '-';
    const raw = String(dateStr).trim();
    const dateOnly = raw.split(' ')[0].split('T')[0];
    const parts = dateOnly.split('-');

    let d, m, y;
    if (parts.length === 3 && parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
    } else {
        const parsed = new Date(raw);
        if (isNaN(parsed.getTime())) return raw;
        y = parsed.getFullYear();
        m = parsed.getMonth() + 1;
        d = parsed.getDate();
    }

    const fmt = formatOverride || localStorage.getItem('pref_date_format') || 'dmy';
    const dd = String(d).padStart(2, '0');
    const mm = String(m).padStart(2, '0');

    if (fmt === 'ymd') return `${y}-${mm}-${dd}`;
    if (fmt === 'long') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${d} ${months[m - 1] || mm} ${y}`;
    }
    if (fmt === 'full') {
        const monthsFull = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return `${d} ${monthsFull[m - 1] || mm} ${y}`;
    }
    return `${dd}/${mm}/${y}`;
}

/**
 * Format datetime string (date + HH:mm)
 */
export function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const raw = String(dateStr).trim();
    const dateFormatted = formatDate(raw);
    const timeMatch = raw.match(/(\d{2}:\d{2})/);
    return timeMatch ? `${dateFormatted} ${timeMatch[1]}` : dateFormatted;
}

/**
 * Debounce function calls
 */
export function debounce(fn, wait = 300) {
    let timer = null;
    return function (...args) {
        const ctx = this;
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(ctx, args), wait);
    };
}

/**
 * Show custom modern toast notification with progress bar & pause-on-hover
 */
export function toast(message, type = 'info', duration = 3800) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const variants = {
        success: {
            label: 'Berhasil',
            icon: 'ri-checkbox-circle-fill',
            cls: 'app-toast--success'
        },
        error: {
            label: 'Gagal',
            icon: 'ri-error-warning-fill',
            cls: 'app-toast--error'
        },
        warning: {
            label: 'Peringatan',
            icon: 'ri-alert-fill',
            cls: 'app-toast--warning'
        },
        info: {
            label: 'Informasi',
            icon: 'ri-information-fill',
            cls: 'app-toast--info'
        }
    };

    const v = variants[type] || variants.info;

    // Batasi maksimal 4 toast tampil bersamaan agar layar tetap rapi
    while (container.children.length >= 4) {
        container.firstElementChild?.remove();
    }

    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.className = `app-toast ${v.cls} toast-enter pointer-events-auto`;
    el.innerHTML = `
        <div class="app-toast-accent"></div>
        <div class="app-toast-icon">
            <i class="${v.icon}"></i>
        </div>
        <div class="app-toast-body">
            <div class="app-toast-title">${v.label}</div>
            <div class="app-toast-msg">${escapeHtml(message)}</div>
        </div>
        <button type="button" class="app-toast-close" aria-label="Tutup">
            <i class="ri-close-line"></i>
        </button>
        ${duration > 0 ? `<div class="app-toast-progress" style="animation-duration: ${duration}ms"></div>` : ''}
    `;

    let dismissed = false;
    let remaining = duration;
    let startedAt = Date.now();
    let timerId = null;

    const dismiss = () => {
        if (dismissed) return;
        dismissed = true;
        if (timerId) clearTimeout(timerId);
        el.classList.remove('toast-enter');
        el.classList.add('toast-leave');
        setTimeout(() => el.remove(), 240);
    };

    const startTimer = () => {
        if (duration <= 0 || dismissed) return;
        startedAt = Date.now();
        timerId = setTimeout(dismiss, remaining);
    };

    const pauseTimer = () => {
        if (duration <= 0 || dismissed || !timerId) return;
        clearTimeout(timerId);
        timerId = null;
        remaining = Math.max(200, remaining - (Date.now() - startedAt));
    };

    el.querySelector('.app-toast-close').addEventListener('click', dismiss);
    el.addEventListener('mouseenter', pauseTimer);
    el.addEventListener('mouseleave', startTimer);

    container.appendChild(el);
    startTimer();
}

/**
 * Open standard Modal Dialog
 */
export function openModal(htmlContent, maxWidthClass = 'max-w-2xl') {
    const container = document.getElementById('modal-container');
    const contentEl = document.getElementById('modal-content');
    if (!container || !contentEl) return;

    closeAllAutocompletes();
    contentEl.className = `modal-card bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-auto w-full ${maxWidthClass} transform transition-all border border-slate-100 pointer-events-auto`;
    contentEl.innerHTML = htmlContent;
    container.classList.remove('hidden');
    initAutocompletes(contentEl);
}

/**
 * Close standard Modal Dialog
 */
export function closeModal() {
    const container = document.getElementById('modal-container');
    const contentEl = document.getElementById('modal-content');
    if (!container) return;
    closeAllAutocompletes();
    container.classList.add('hidden');
    if (contentEl) contentEl.innerHTML = '';
}

let _drawerCloseTimer = null;

/**
 * Open Slide-Over Inspection Drawer
 */
export function openDrawer(title, bodyHtml, footerHtml = '', badgeHtml = '') {
    const container = document.getElementById('drawer-container');
    const headerLeft = document.getElementById('drawer-header-left');
    const headerRight = document.getElementById('drawer-header-right');
    const contentEl = document.getElementById('drawer-content');
    const footerEl = document.getElementById('drawer-footer');
    if (!container || !contentEl) return;

    if (_drawerCloseTimer) {
        clearTimeout(_drawerCloseTimer);
        _drawerCloseTimer = null;
    }

    if (headerLeft) {
        headerLeft.innerHTML = `
            <h3 class="text-base font-bold text-slate-800 dark:text-white truncate">${escapeHtml(title)}</h3>
            ${badgeHtml || ''}
        `;
    }
    if (headerRight) {
        headerRight.innerHTML = `
            <button type="button" onclick="App.closeDrawer()"
                class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition flex items-center justify-center"
                title="Tutup Panel (Esc)">
                <i class="ri-close-line text-lg"></i>
            </button>
        `;
    }

    contentEl.innerHTML = bodyHtml;

    if (footerEl) {
        if (footerHtml) {
            footerEl.innerHTML = footerHtml;
            footerEl.classList.remove('hidden');
        } else {
            footerEl.innerHTML = '';
            footerEl.classList.add('hidden');
        }
    }

    container.classList.remove('hidden');
    requestAnimationFrame(() => {
        container.classList.add('drawer-open');
    });
}

/**
 * Close Slide-Over Inspection Drawer
 */
export function closeDrawer() {
    const container = document.getElementById('drawer-container');
    if (!container) return;
    container.classList.remove('drawer-open');
    if (_drawerCloseTimer) clearTimeout(_drawerCloseTimer);
    _drawerCloseTimer = setTimeout(() => {
        _drawerCloseTimer = null;
        container.classList.add('hidden');
        const contentEl = document.getElementById('drawer-content');
        if (contentEl) contentEl.innerHTML = '';
    }, 280);
}

export { alertAction, confirmAction, promptAction, emptyStateHtml, skeletonCardsHtml, skeletonTableHtml } from './ui-dialogs.js';
export function btnLoading(btn, isLoading = true, loadingText = null) {
    if (!btn) return;
    if (isLoading) {
        if (!btn.dataset.origHtml) {
            btn.dataset.origHtml = btn.innerHTML;
        }
        btn.disabled = true;
        btn.classList.add('opacity-75', 'cursor-not-allowed');
        const label = loadingText || 'Memproses...';
        btn.innerHTML = `<span class="btn-spinner mr-1.5"></span><span>${escapeHtml(label)}</span>`;
    } else {
        btn.disabled = false;
        btn.classList.remove('opacity-75', 'cursor-not-allowed');
        if (btn.dataset.origHtml) {
            btn.innerHTML = btn.dataset.origHtml;
            delete btn.dataset.origHtml;
        }
    }
}

/**
 * Convert number to Indonesian words (Terbilang)
 */
export function terbilang(angka) {
    const n = Math.floor(Math.abs(Number(angka) || 0));
    if (n === 0) return 'Nol';

    const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
    const convert = (num) => {
        if (num < 12) return satuan[num];
        if (num < 20) return convert(num - 10) + ' Belas';
        if (num < 100) return convert(Math.floor(num / 10)) + ' Puluh' + (num % 10 ? ' ' + convert(num % 10) : '');
        if (num < 200) return 'Seratus' + (num - 100 ? ' ' + convert(num - 100) : '');
        if (num < 1000) return convert(Math.floor(num / 100)) + ' Ratus' + (num % 100 ? ' ' + convert(num % 100) : '');
        if (num < 2000) return 'Seribu' + (num - 1000 ? ' ' + convert(num - 1000) : '');
        if (num < 1000000) return convert(Math.floor(num / 1000)) + ' Ribu' + (num % 1000 ? ' ' + convert(num % 1000) : '');
        if (num < 1000000000) return convert(Math.floor(num / 1000000)) + ' Juta' + (num % 1000000 ? ' ' + convert(num % 1000000) : '');
        if (num < 1000000000000) return convert(Math.floor(num / 1000000000)) + ' Miliar' + (num % 1000000000 ? ' ' + convert(num % 1000000000) : '');
        return convert(Math.floor(num / 1000000000000)) + ' Triliun' + (num % 1000000000000 ? ' ' + convert(num % 1000000000000) : '');
    };

    const prefix = Number(angka) < 0 ? 'Minus ' : '';
    return prefix + convert(n).trim();
}

/**
 * Download array data as UTF-8 CSV file with Excel BOM
 */
export function exportCsv(filename, headers, rows) {
    const csvEscape = (v) => {
        const s = String(v === null || v === undefined ? '' : v);
        return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [headers.map(csvEscape).join(',')];
    rows.forEach((row) => {
        lines.push(row.map(csvEscape).join(','));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


// Re-export modular document builders
export { exportPdf } from "./pdf/reports.js";
export { generateInvoicePdf, generatePaymentReceiptPdf, generateClientStatementPdf } from "./pdf/invoice.js";
export { generateBastPdf } from "./pdf/bast.js";
export { generateQuotationPdf, downloadQuotationWord } from "./pdf/quotation.js";
export { generateContractPdf } from "./pdf/contract.js";

// ============================================
// REPORT EXPORT & PREVIEW (Modularized in ./report-preview.js)
// ============================================
export {
    closeReportExportMenus,
    toggleReportExportMenu,
    reportExportDropdownHtml,
    closeReportPreview,
    openReportPdfPreview,
    openReportCsvPreview
} from "./report-preview.js";

// ============================================
// TABLE ROW ACTION FLOATING DROPDOWN
// ============================================
export { closeTableActionMenu, toggleTableActionMenu, tableActionBtnHtml } from "./table-menu.js";

// ============================================
// SEARCHABLE AUTOCOMPLETE SELECT ENHANCER (Modularized in ./autocomplete.js)
// ============================================
import {
    closeAllAutocompletes,
    enhanceSelectAutocomplete,
    initAutocompletes,
    refreshAutocomplete
} from "./autocomplete.js";

export {
    closeAllAutocompletes,
    enhanceSelectAutocomplete,
    initAutocompletes,
    refreshAutocomplete
};

export function setRefreshing(el, isRefreshing = true) {
    if (!el) return;
    el.classList.add('smooth-content');
    el.classList.toggle('is-refreshing', Boolean(isRefreshing));
}

export function swapSmooth(el, html) {
    if (!el) return;
    el.classList.add('smooth-content');
    el.innerHTML = html;
    el.classList.remove('is-refreshing');
    if (typeof window !== 'undefined') {
        window.App?.refreshTables?.(el);
    }
}

export function resolveDatePreset(preset) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const y = now.getFullYear();
    const m = now.getMonth();

    if (preset === 'last_month') {
        return {
            tglMulai: fmt(new Date(y, m - 1, 1)),
            tglSelesai: fmt(new Date(y, m, 0))
        };
    }
    if (preset === 'this_quarter') {
        const qStartMonth = Math.floor(m / 3) * 3;
        return {
            tglMulai: fmt(new Date(y, qStartMonth, 1)),
            tglSelesai: fmt(now)
        };
    }
    if (preset === 'ytd') {
        return {
            tglMulai: `${y}-01-01`,
            tglSelesai: fmt(now)
        };
    }
    // Default: this_month
    return {
        tglMulai: `${y}-${pad(m + 1)}-01`,
        tglSelesai: fmt(now)
    };
}

export function quickDateChipsHtml(callbackExprPrefix) {
    const chips = [
        ['this_month', 'Bulan Ini'],
        ['last_month', 'Bulan Lalu'],
        ['this_quarter', 'Kuartal Ini'],
        ['ytd', 'Tahun Ini']
    ];
    return `<div class="inline-flex flex-wrap items-center gap-1">${chips.map(([k, lbl]) =>
        `<button type="button" onclick="${callbackExprPrefix}('${k}')" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition">${lbl}</button>`
    ).join('')}</div>`;
}

export function compressImageFile(file, maxWidth = 1280, quality = 0.78) {
    return new Promise((resolve) => {
        if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.size <= 220 * 1024) {
            resolve(file);
            return;
        }
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(file); return; }
            ctx.drawImage(img, 0, 0, width, height);
            const targetMime = file.type === 'image/png' ? 'image/jpeg' : file.type;
            canvas.toBlob((blob) => {
                if (!blob || blob.size >= file.size) {
                    resolve(file);
                    return;
                }
                const outName = file.name.replace(/\.[^.]+$/, '') + (targetMime === 'image/webp' ? '.webp' : '.jpg');
                resolve(new File([blob], outName, { type: targetMime, lastModified: Date.now() }));
            }, targetMime, quality);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file);
        };
        img.src = url;
    });
}

/**
 * Open high-fidelity PDF preview in universal modal with download action
 */
export function openPdfModal({
    title = 'Pratinjau Dokumen PDF',
    filename = 'dokumen.pdf',
    blobUrl,
    onEdit = null,
    editLabel = 'Edit Naskah / Nilai',
    downloadWordFn = null,
    wordLabel = 'Unduh Format Word (.doc)'
}) {
    if (!blobUrl) return;
    openModal(`
        <div class="p-6 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                        <i class="ri-file-pdf-2-line text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white">${escapeHtml(title)}</h3>
                        <p class="text-xs text-slate-400 font-mono">${escapeHtml(filename)}</p>
                    </div>
                </div>
                <button type="button" onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg">
                    <i class="ri-close-line text-2xl"></i>
                </button>
            </div>
            <div class="bg-slate-100 dark:bg-slate-950 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
                <iframe src="${blobUrl}#view=FitH" class="w-full h-[72vh] min-h-[500px] rounded-xl border-0 bg-white" title="${escapeHtml(title)}"></iframe>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div class="flex items-center gap-2">
                    <button type="button" onclick="App.closeModal()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold">
                        Tutup
                    </button>
                    ${onEdit ? `
                        <button type="button" id="btn-modal-pdf-edit" class="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition">
                            <i class="ri-edit-line text-sm"></i>
                            <span>${escapeHtml(editLabel)}</span>
                        </button>
                    ` : ''}
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    ${downloadWordFn ? `
                        <button type="button" id="btn-modal-pdf-word" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition">
                            <i class="ri-file-word-2-line text-sm"></i>
                            <span>${escapeHtml(wordLabel)}</span>
                        </button>
                    ` : ''}
                    <a href="${blobUrl}" target="_blank" class="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition">
                        <i class="ri-external-link-line"></i>
                        <span>Buka Penuh</span>
                    </a>
                    <a href="${blobUrl}" download="${escapeHtml(filename)}" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-primary-500/20">
                        <i class="ri-download-line text-sm"></i>
                        <span>Unduh Dokumen PDF</span>
                    </a>
                </div>
            </div>
        </div>
    `, 'max-w-5xl');

    if (onEdit) {
        document.getElementById('btn-modal-pdf-edit')?.addEventListener('click', () => {
            closeModal();
            try { onEdit(); } catch (e) { console.error(e); }
        });
    }
    if (downloadWordFn) {
        document.getElementById('btn-modal-pdf-word')?.addEventListener('click', () => {
            try { downloadWordFn(); } catch (e) { console.error(e); }
        });
    }
}

/**
 * High-fidelity Invoice PDF builder using jsPDF & AutoTable
 * Incorporates Official Company Bank Accounts from Master Data
 */


export {
    parseTimelineGantt,
    parseTimelineStages,
    _drawTimelineDiagramPdf,
    renderTimelineDiagramHtml
} from "./timeline-diagram.js";


import {
    formatWhatsAppPhone,
    openWhatsApp,
    openWhatsAppInvoiceReminder,
    openWhatsAppReceipt,
    openWhatsAppQuotation
} from "./whatsapp.js";

export {
    formatWhatsAppPhone,
    openWhatsApp,
    openWhatsAppInvoiceReminder,
    openWhatsAppReceipt,
    openWhatsAppQuotation
};

export function renderPagination(containerEl, pagination, onPageChange, itemLabel = 'data') {
    if (!containerEl) return;
    const p = pagination || { page: 1, total: 0, total_pages: 1 };
    const page = Number(p.page || 1);
    const total = Number(p.total || 0);
    const totalPages = Math.max(1, Number(p.total_pages || 1));

    containerEl.innerHTML = `
        <div>Menampilkan hal <b>${page}</b> dari <b>${total}</b> ${escapeHtml(itemLabel)}</div>
        <div class="flex items-center gap-2">
            <button type="button" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}
                    class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Sebelumnya</button>
            <button type="button" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}
                    class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Berikutnya</button>
        </div>
    `;
    containerEl.querySelectorAll('button[data-page]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = parseInt(btn.getAttribute('data-page'), 10);
            if (target >= 1 && target <= totalPages && typeof onPageChange === 'function') {
                onPageChange(target);
            }
        });
    });
}

function _resolveCompanyInfo(sourceObj = null) {
    const c = sourceObj?.company || {};
    return {
        name: c.company_name || window.App?.getSetting?.('company_name', 'PT CRUDWorks Media Tama') || 'PT CRUDWorks Media Tama',
        address: c.company_address || window.App?.getSetting?.('company_address', 'Jl. Rasuna Said Kav. B4, Jakarta Selatan 12920') || 'Jl. Rasuna Said Kav. B4, Jakarta Selatan 12920',
        phone: c.company_phone || window.App?.getSetting?.('company_phone', '(021) 5892-1002') || '(021) 5892-1002',
        email: c.company_email || window.App?.getSetting?.('company_email', 'billing@crudworks.id') || 'billing@crudworks.id',
        npwp: c.company_npwp || window.App?.getSetting?.('company_npwp', '') || ''
    };
}

/**
 * Export quotation as fully editable Microsoft Word document (.doc)
 * Opens seamlessly in MS Word, Google Docs, WPS, and LibreOffice with complete formatting
 */

export { renderStatusBadge } from './status-badges.js';
export function getDefaultPerPage(fallback = 15) {
    try {
        const v = parseInt(localStorage.getItem('pref_per_page') || '', 10);
        if ([10, 15, 25, 50].includes(v)) return v;
    } catch (_) {}
    return fallback;
}

if (typeof window !== 'undefined') {
    window.openWhatsAppReceipt = openWhatsAppReceipt;
    window.openWhatsAppInvoiceReminder = openWhatsAppInvoiceReminder;
    window.openWhatsAppQuotation = openWhatsAppQuotation;
    if (window.App) window.App.renderStatusBadge = renderStatusBadge;
}

