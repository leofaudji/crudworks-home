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

function _showAppDialog({
    title,
    text = '',
    icon = 'warning',
    confirmBtnText = 'Ya, Lanjutkan',
    cancelBtnText = 'Batal',
    showCancel = true
}) {
    return new Promise((resolve) => {
        const existing = document.getElementById('app-dialog-overlay');
        if (existing) existing.remove();

        const variants = {
            warning: {
                cls: 'app-dialog--warning',
                glyph: 'ri-alert-line'
            },
            error: {
                cls: 'app-dialog--error',
                glyph: 'ri-error-warning-line'
            },
            danger: {
                cls: 'app-dialog--error',
                glyph: 'ri-delete-bin-6-line'
            },
            success: {
                cls: 'app-dialog--success',
                glyph: 'ri-checkbox-circle-line'
            },
            question: {
                cls: 'app-dialog--info',
                glyph: 'ri-question-line'
            },
            info: {
                cls: 'app-dialog--info',
                glyph: 'ri-information-line'
            }
        };

        const v = variants[icon] || variants.warning;
        const isDanger = icon === 'error' || icon === 'danger' || icon === 'warning';

        const overlay = document.createElement('div');
        overlay.id = 'app-dialog-overlay';
        overlay.className = 'app-dialog-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = `
            <div class="app-dialog-card ${v.cls}">
                <div class="app-dialog-strip"></div>
                <div class="app-dialog-content">
                    <div class="app-dialog-icon-wrap">
                        <div class="app-dialog-icon">
                            <i class="${v.glyph}"></i>
                        </div>
                    </div>
                    <h3 class="app-dialog-title">${escapeHtml(title)}</h3>
                    ${text ? `<p class="app-dialog-text">${escapeHtml(text)}</p>` : ''}
                </div>
                <div class="app-dialog-actions">
                    ${showCancel ? `<button type="button" data-dialog-cancel class="app-dialog-btn app-dialog-btn-cancel">${escapeHtml(cancelBtnText)}</button>` : ''}
                    <button type="button" data-dialog-confirm class="app-dialog-btn app-dialog-btn-confirm">${escapeHtml(confirmBtnText)}</button>
                </div>
            </div>
        `;

        let settled = false;
        const close = (result) => {
            if (settled) return;
            settled = true;
            document.removeEventListener('keydown', onKeyDown);
            overlay.classList.add('is-closing');
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 180);
        };

        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                close(false);
            }
        };

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close(false);
        });
        overlay.querySelector('[data-dialog-confirm]')?.addEventListener('click', () => close(true));
        overlay.querySelector('[data-dialog-cancel]')?.addEventListener('click', () => close(false));
        document.addEventListener('keydown', onKeyDown);

        document.body.appendChild(overlay);
        requestAnimationFrame(() => {
            overlay.classList.add('is-open');
            const focusTarget = isDanger && showCancel
                ? overlay.querySelector('[data-dialog-cancel]')
                : overlay.querySelector('[data-dialog-confirm]');
            focusTarget?.focus();
        });
    });
}

/**
 * Custom Alert Dialog (single OK button)
 */
export async function alertAction(title, text = '', icon = 'info', confirmBtnText = 'Mengerti') {
    return _showAppDialog({ title, text, icon, confirmBtnText, showCancel: false });
}

/**
 * Custom Confirmation Modal (replaces generic SweetAlert2 / window.confirm)
 */
export async function confirmAction(
    title,
    text = '',
    icon = 'warning',
    confirmBtnText = 'Ya, Lanjutkan',
    cancelBtnText = 'Batal'
) {
    return _showAppDialog({ title, text, icon, confirmBtnText, cancelBtnText, showCancel: true });
}

/**
 * Reusable Illustrative Empty State HTML
 */
export function emptyStateHtml({
    icon = 'ri-inbox-2-line',
    title = 'Belum ada data',
    subtitle = 'Data yang Anda cari belum tersedia atau filter tidak menemukan hasil.',
    actionHtml = '',
    compact = false
} = {}) {
    return `
        <div class="app-empty-state ${compact ? 'is-compact' : ''}">
            <div class="app-empty-icon">
                <i class="${escapeHtml(icon)}"></i>
            </div>
            <h4 class="app-empty-title">${escapeHtml(title)}</h4>
            ${subtitle ? `<p class="app-empty-sub">${escapeHtml(subtitle)}</p>` : ''}
            ${actionHtml ? `<div class="app-empty-actions">${actionHtml}</div>` : ''}
        </div>
    `;
}

/**
 * Reusable Skeleton KPI Cards & Table Shimmer HTML
 */
export function skeletonCardsHtml(count = 4) {
    return `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(4, Math.max(1, count))} gap-4">
            ${Array.from({ length: count }).map(() => `
                <div class="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="skeleton h-3 w-24 rounded-full"></div>
                        <div class="skeleton h-8 w-8 rounded-xl"></div>
                    </div>
                    <div class="skeleton h-6 w-36 rounded-lg"></div>
                    <div class="skeleton h-2.5 w-20 rounded-full"></div>
                </div>
            `).join('')}
        </div>
    `;
}

export function skeletonTableHtml(rows = 5, cols = 5) {
    return `
        <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                <div class="skeleton h-4 w-40 rounded-full"></div>
                <div class="skeleton h-7 w-28 rounded-lg"></div>
            </div>
            <div class="p-4 space-y-3">
                ${Array.from({ length: rows }).map(() => `
                    <div class="grid gap-3" style="grid-template-columns: repeat(${cols}, minmax(0, 1fr))">
                        ${Array.from({ length: cols }).map((_, idx) => `
                            <div class="skeleton h-3.5 ${idx === 0 ? 'w-3/4' : 'w-full'} rounded-full"></div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Toggle button loading spinner state
 */
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

// ============================================
// TABLE ROW ACTION FLOATING DROPDOWN
// ============================================
let _tableActionMenuBound = false;
let _activeTableMenu = null;

export function closeTableActionMenu() {
    if (_activeTableMenu) {
        _activeTableMenu.remove();
        _activeTableMenu = null;
    }
}

function _bindTableActionMenuGlobalEvents() {
    if (_tableActionMenuBound || typeof document === 'undefined') return;
    _tableActionMenuBound = true;
    document.addEventListener('click', (e) => {
        if (!e.target.closest('[data-table-action-menu]') && !e.target.closest('[data-table-action-trigger]')) {
            closeTableActionMenu();
        }
    });
    window.addEventListener('scroll', () => closeTableActionMenu(), true);
    window.addEventListener('resize', () => closeTableActionMenu());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeTableActionMenu();
    });
}

/**
 * Open a floating action dropdown menu anchored to a table action button.
 * Uses fixed positioning to prevent clipping by table overflow-x-auto.
 *
 * @param {HTMLElement} btn - The trigger button element
 * @param {Event} event - Mouse click event
 * @param {Array<{label: string, icon?: string, iconColor?: string, action: string, danger?: boolean, divider?: boolean}>} items
 */
export function toggleTableActionMenu(btn, event, items = []) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    _bindTableActionMenuGlobalEvents();

    if (_activeTableMenu && _activeTableMenu._triggerBtn === btn) {
        closeTableActionMenu();
        return;
    }
    closeTableActionMenu();

    if (!Array.isArray(items) || items.length === 0) return;

    const menu = document.createElement('div');
    menu.className = 'fixed z-50 min-w-[190px] max-w-[260px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-1.5 text-xs text-slate-700 dark:text-slate-200 transition-all duration-150 backdrop-blur-md bg-white/95 dark:bg-slate-900/95';
    menu.setAttribute('data-table-action-menu', 'true');
    menu._triggerBtn = btn;

    let html = '';
    items.forEach((item) => {
        if (!item) return;
        if (item.divider) {
            html += `<div class="my-1 border-t border-slate-100 dark:border-slate-800"></div>`;
            return;
        }
        const isDanger = Boolean(item.danger);
        const iconColor = item.iconColor || (isDanger ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400');
        const textClass = isDanger
            ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800';

        html += `
            <button type="button" onclick="App.closeTableActionMenu(); ${item.action}"
                    class="w-full px-3.5 py-2 text-left flex items-center gap-2.5 font-medium transition rounded-lg ${textClass}">
                ${item.icon ? `<i class="${item.icon} text-base ${iconColor} shrink-0"></i>` : ''}
                <span class="truncate">${escapeHtml(item.label)}</span>
            </button>
        `;
    });
    menu.innerHTML = html;
    document.body.appendChild(menu);

    // Coordinate calculation
    const rect = btn.getBoundingClientRect();
    const menuWidth = 200;
    let left = rect.right - menuWidth;
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;

    const menuHeight = menu.offsetHeight || (items.length * 36 + 12);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;

    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        menu.style.top = `${Math.max(8, rect.top - menuHeight - 4)}px`;
    } else {
        menu.style.top = `${rect.bottom + 4}px`;
    }
    menu.style.left = `${left}px`;

    _activeTableMenu = menu;
}

/**
 * Universal HTML snippet for a table row action dropdown button
 */
export function tableActionBtnHtml(itemsJsonString, label = 'Aksi') {
    return `
        <button type="button" data-table-action-trigger onclick="App.toggleTableActionMenu(this, event, ${itemsJsonString})"
                class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition" title="Menu Aksi">
            <span>${escapeHtml(label)}</span>
            <i class="ri-more-2-fill text-slate-400"></i>
        </button>
    `;
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

// ============================================
// SEARCHABLE AUTOCOMPLETE SELECT ENHANCER
// ============================================
let _activeAc = null;
let _acGlobalBound = false;

function _bindAcGlobalEvents() {
    if (_acGlobalBound || typeof document === 'undefined') return;
    _acGlobalBound = true;

    document.addEventListener('mousedown', (e) => {
        if (!_activeAc) return;
        const { dropdown, trigger } = _activeAc;
        if (dropdown.contains(e.target) || trigger.contains(e.target)) return;
        closeAllAutocompletes();
    });

    window.addEventListener('resize', () => closeAllAutocompletes());
    document.addEventListener('scroll', (e) => {
        if (!_activeAc) return;
        if (_activeAc.dropdown.contains(e.target)) return;
        closeAllAutocompletes();
    }, true);
}

/**
 * Close any open floating autocomplete dropdown
 */
export function closeAllAutocompletes() {
    if (!_activeAc) return;
    const { dropdown, trigger } = _activeAc;
    dropdown.remove();
    trigger?.classList.remove('ac-open');
    trigger?.setAttribute('aria-expanded', 'false');
    _activeAc = null;
}

function _getSelectOptions(selectEl) {
    return Array.from(selectEl.options || []).map((opt) => ({
        value: opt.value,
        label: (opt.textContent || '').trim(),
        keywords: (opt.dataset?.keywords || '').trim(),
        disabled: Boolean(opt.disabled)
    }));
}

function _syncAcTrigger(selectEl) {
    const trigger = selectEl._acTrigger;
    if (!trigger) return;

    const options = _getSelectOptions(selectEl);
    const selected = options.find((o) => o.value === selectEl.value) || options[0];
    const hasEmptyOpt = options.some((o) => o.value === '');
    const placeholder = selectEl.dataset?.placeholder || 'Pilih...';

    const labelEl = trigger.querySelector('.ac-label');
    const clearEl = trigger.querySelector('.ac-clear');
    const isEmptyVal = !selected || selected.value === '';

    if (labelEl) {
        labelEl.textContent = selected ? selected.label : placeholder;
        labelEl.className = `ac-label truncate flex-1 ${isEmptyVal ? 'text-slate-400' : 'text-slate-800 font-medium'}`;
    }
    if (clearEl) {
        const showClear = hasEmptyOpt && !isEmptyVal && !selectEl.disabled;
        clearEl.classList.toggle('hidden', !showClear);
    }
    trigger.disabled = Boolean(selectEl.disabled);
}

function _openAcDropdown(selectEl, trigger, initialQuery = '') {
    if (selectEl.disabled) return;
    _bindAcGlobalEvents();

    if (_activeAc && _activeAc.selectEl === selectEl) {
        closeAllAutocompletes();
        return;
    }
    closeAllAutocompletes();

    const options = _getSelectOptions(selectEl);
    const searchPlaceholder = selectEl.dataset?.searchPlaceholder || 'Ketik untuk mencari...';
    const emptyText = selectEl.dataset?.emptyText || 'Data tidak ditemukan';

    const dropdown = document.createElement('div');
    dropdown.className = 'ac-dropdown';
    dropdown.innerHTML = `
        <div class="p-2 border-b border-slate-100 bg-slate-50/70">
            <div class="relative flex items-center">
                <i class="ri-search-line absolute left-2.5 text-slate-400 text-xs pointer-events-none"></i>
                <input type="text" class="ac-search w-full pl-7 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary-500"
                       placeholder="${escapeHtml(searchPlaceholder)}" value="${escapeHtml(initialQuery)}">
                <button type="button" class="ac-search-clear hidden absolute right-2 text-slate-400 hover:text-slate-600 text-xs" title="Bersihkan pencarian">
                    <i class="ri-close-circle-line"></i>
                </button>
            </div>
        </div>
        <div class="ac-list max-h-60 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin"></div>
    `;

    dropdown.addEventListener('mousedown', (e) => e.stopPropagation());
    dropdown.addEventListener('click', (e) => e.stopPropagation());
    document.body.appendChild(dropdown);

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(window.innerWidth - 16, Math.max(rect.width, 250));
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    dropdown.style.width = `${width}px`;
    dropdown.style.left = `${left}px`;

    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    if (spaceBelow < 220 && spaceAbove > spaceBelow) {
        dropdown.style.bottom = `${window.innerHeight - rect.top + 4}px`;
    } else {
        dropdown.style.top = `${rect.bottom + 4}px`;
    }

    trigger.classList.add('ac-open');
    trigger.setAttribute('aria-expanded', 'true');

    const state = { selectEl, trigger, dropdown, filtered: [], highlightIdx: 0 };
    _activeAc = state;

    const searchInput = dropdown.querySelector('.ac-search');
    const searchClear = dropdown.querySelector('.ac-search-clear');
    const listEl = dropdown.querySelector('.ac-list');

    const pickOption = (val) => {
        const changed = selectEl.value !== val;
        selectEl.value = val;
        _syncAcTrigger(selectEl);
        closeAllAutocompletes();
        trigger.focus();
        if (changed) {
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    const renderList = (query) => {
        const q = (query || '').trim().toLowerCase();
        searchClear.classList.toggle('hidden', !q);

        state.filtered = options.filter((o) => {
            if (!q) return true;
            const hay = `${o.label} ${o.keywords}`.toLowerCase();
            return hay.includes(q);
        });

        const selectedIdx = state.filtered.findIndex((o) => o.value === selectEl.value);
        state.highlightIdx = selectedIdx >= 0 ? selectedIdx : 0;

        if (state.filtered.length === 0) {
            listEl.innerHTML = `<div class="py-5 px-3 text-center text-xs text-slate-400">${escapeHtml(emptyText)}</div>`;
            return;
        }

        listEl.innerHTML = state.filtered.map((o, idx) => {
            const isSel = o.value === selectEl.value;
            const isHi = idx === state.highlightIdx;
            return `
                <button type="button" data-ac-idx="${idx}" ${o.disabled ? 'disabled' : ''}
                    class="ac-option ${isSel ? 'ac-selected' : ''} ${isHi ? 'ac-highlighted' : ''} ${o.disabled ? 'opacity-50 cursor-not-allowed' : ''}">
                    <span class="truncate">${escapeHtml(o.label)}</span>
                    ${isSel ? '<i class="ri-check-line text-primary-600 text-sm shrink-0"></i>' : ''}
                </button>
            `;
        }).join('');

        listEl.querySelectorAll('[data-ac-idx]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-ac-idx'), 10);
                const picked = state.filtered[idx];
                if (picked && !picked.disabled) pickOption(picked.value);
            });
        });
    };

    const updateHighlight = () => {
        const btns = listEl.querySelectorAll('[data-ac-idx]');
        btns.forEach((b, i) => {
            b.classList.toggle('ac-highlighted', i === state.highlightIdx);
            if (i === state.highlightIdx) b.scrollIntoView({ block: 'nearest' });
        });
    };

    searchInput.addEventListener('input', () => renderList(searchInput.value));
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        renderList('');
        searchInput.focus();
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (state.filtered.length > 0) {
                state.highlightIdx = (state.highlightIdx + 1) % state.filtered.length;
                updateHighlight();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (state.filtered.length > 0) {
                state.highlightIdx = (state.highlightIdx - 1 + state.filtered.length) % state.filtered.length;
                updateHighlight();
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const picked = state.filtered[state.highlightIdx];
            if (picked && !picked.disabled) pickOption(picked.value);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            closeAllAutocompletes();
            trigger.focus();
        }
    });

    renderList(initialQuery);
    requestAnimationFrame(() => {
        searchInput.focus();
        if (initialQuery) searchInput.setSelectionRange(initialQuery.length, initialQuery.length);
    });
}

/**
 * Enhance a single <select> element into a searchable autocomplete combobox
 */
export function enhanceSelectAutocomplete(selectEl) {
    if (!selectEl || selectEl.tagName !== 'SELECT') return;
    if (selectEl._acTrigger) {
        _syncAcTrigger(selectEl);
        return;
    }

    const isFullWidth = selectEl.classList.contains('w-full');
    const isSmall = selectEl.classList.contains('text-xs');

    const wrapper = document.createElement('div');
    wrapper.className = `ac-wrapper ${isFullWidth ? 'ac-block' : ''}`;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = `ac-trigger ${isSmall ? 'ac-sm' : 'ac-md'}`;
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = `
        <span class="ac-label truncate flex-1"></span>
        <span class="flex items-center gap-1 shrink-0">
            <span role="button" tabindex="-1" class="ac-clear hidden text-slate-400 hover:text-rose-500 px-0.5" title="Reset pilihan">
                <i class="ri-close-line text-xs"></i>
            </span>
            <i class="ri-arrow-down-s-line text-slate-400 text-sm"></i>
        </span>
    `;

    selectEl.parentNode.insertBefore(wrapper, selectEl);
    wrapper.appendChild(selectEl);
    wrapper.appendChild(trigger);

    selectEl.classList.add('ac-native-select');
    selectEl.tabIndex = -1;
    selectEl._acTrigger = trigger;

    trigger.querySelector('.ac-clear').addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectEl.disabled) return;
        selectEl.value = '';
        _syncAcTrigger(selectEl);
        closeAllAutocompletes();
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    });

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        _openAcDropdown(selectEl, trigger);
    });

    trigger.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            _openAcDropdown(selectEl, trigger);
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            _openAcDropdown(selectEl, trigger, e.key);
        }
    });

    selectEl.addEventListener('invalid', () => {
        _openAcDropdown(selectEl, trigger);
    });

    _syncAcTrigger(selectEl);
}

/**
 * Enhance all <select data-autocomplete> elements inside a root container
 */
export function initAutocompletes(rootEl = document) {
    if (!rootEl || typeof rootEl.querySelectorAll !== 'function') return;
    rootEl.querySelectorAll('select[data-autocomplete]').forEach((sel) => {
        enhanceSelectAutocomplete(sel);
    });
}

/**
 * Refresh autocomplete options/display after underlying <select> options changed
 */
export function refreshAutocomplete(selectElOrId) {
    const sel = typeof selectElOrId === 'string'
        ? document.getElementById(selectElOrId)
        : selectElOrId;
    if (!sel) return;
    if (!sel._acTrigger) {
        enhanceSelectAutocomplete(sel);
    } else {
        _syncAcTrigger(sel);
    }
}

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


export function parseTimelineGantt(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    // Detect unit: BULAN vs MINGGU (default to BULAN)
    const isWeek = /\b(?:minggu|week|mgg|w)\b/i.test(rawText) && !/\b(?:bulan|month|bln)\b/i.test(rawText);
    const unitLabel = isWeek ? 'MINGGU' : 'BULAN';

    const rows = [];
    let currentRow = null;
    let fallbackCounter = 1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match row header: "1. Task (Bulan 4)" or "Tahap 1 — Task (Minggu 1 - 2)" or "1. Task: Bulan 4"
        const headerMatch = line.match(/^(?:Tahap\s*(\d+)[\s:—–-]+|(\d+)\.[\s:—–-]+|(\d+)\s+)(.*?)(?:\((.*?)\))?$/i);
        const hasNumberLead = /^(?:Tahap\s*\d+|\d+\.|\d+\s)/i.test(line);

        if (headerMatch && (hasNumberLead || !currentRow)) {
            if (currentRow) rows.push(currentRow);

            const rowNo = headerMatch[1] || headerMatch[2] || headerMatch[3] || String(fallbackCounter++);
            let title = (headerMatch[4] || '').trim();
            let rawPeriod = (headerMatch[5] || '').trim();

            if (!rawPeriod) {
                const pMatch = title.match(/\((.*?)\)/);
                if (pMatch) {
                    rawPeriod = pMatch[1].trim();
                    title = title.replace(/\(.*?\)/, '').trim();
                } else {
                    const colonMatch = title.match(/[:—–-]\s*(?:Bulan|Minggu)?\s*(\d+(?:\s*[-—–]\s*\d+)?)/i);
                    if (colonMatch) {
                        rawPeriod = colonMatch[1].trim();
                        title = title.replace(/[:—–-]\s*(?:Bulan|Minggu)?\s*(\d+(?:\s*[-—–]\s*\d+)?)/i, '').trim();
                    }
                }
            }

            title = title.replace(/^[—–:-]\s*/, '').trim();

            currentRow = {
                no: rowNo,
                title: title || `Aktivitas ${rowNo}`,
                rawPeriod: rawPeriod,
                deliverables: [],
                start: null,
                end: null
            };
        } else if (currentRow) {
            const cleaned = line.replace(/^[-*•]\s*/, '').trim();
            if (cleaned) {
                currentRow.deliverables.push(cleaned);
            }
        } else {
            currentRow = {
                no: String(fallbackCounter++),
                title: line.replace(/^[-*•]\s*/, '').trim(),
                rawPeriod: '',
                deliverables: [],
                start: null,
                end: null
            };
        }
    }

    if (currentRow) rows.push(currentRow);
    if (rows.length === 0) return null;

    let lastEnd = 0;
    rows.forEach(r => {
        const periodStr = r.rawPeriod || '';
        const rangeMatch = periodStr.match(/(\d+)\s*(?:[-—–s/d]|sampai|to)\s*(\d+)/i);
        const singleMatch = periodStr.match(/(\d+)/);

        if (rangeMatch) {
            r.start = parseInt(rangeMatch[1], 10);
            r.end = parseInt(rangeMatch[2], 10);
        } else if (singleMatch) {
            r.start = parseInt(singleMatch[1], 10);
            r.end = parseInt(singleMatch[1], 10);
        } else {
            r.start = lastEnd + 1;
            r.end = r.start + 1;
        }

        if (r.start > r.end) {
            const temp = r.start;
            r.start = r.end;
            r.end = temp;
        }

        lastEnd = Math.max(lastEnd, r.end);
    });

    let minPeriod = Infinity;
    let maxPeriod = -Infinity;

    rows.forEach(r => {
        if (r.start !== null && r.start < minPeriod) minPeriod = r.start;
        if (r.end !== null && r.end > maxPeriod) maxPeriod = r.end;
    });

    if (minPeriod === Infinity || maxPeriod === -Infinity || minPeriod > maxPeriod) {
        minPeriod = 1;
        maxPeriod = rows.length;
    }

    if (maxPeriod - minPeriod > 14) {
        maxPeriod = minPeriod + 14;
    }

    const periods = [];
    for (let p = minPeriod; p <= maxPeriod; p++) {
        periods.push(p);
    }

    return {
        unitLabel,
        periods,
        rows
    };
}

/**
 * Backward-compatible helper for stages
 */
export function parseTimelineStages(rawText) {
    const gantt = parseTimelineGantt(rawText);
    if (!gantt) {
        return [
            { step: '01', title: 'Instalasi & Penyesuaian', duration: 'Bulan 4', deliverables: ['Instalasi sistem, konfigurasi awal, dan sosialisasi pengguna'] },
            { step: '02', title: 'Pendampingan & Penggunaan', duration: 'Bulan 5 – 9', deliverables: ['Pendampingan operasional berkala dan pengawalan aplikasi'] }
        ];
    }
    return gantt.rows.map(r => ({
        step: String(r.no).padStart(2, '0'),
        title: r.title,
        duration: r.rawPeriod ? `${gantt.unitLabel === 'BULAN' ? 'Bulan' : 'Minggu'} ${r.rawPeriod}` : `${gantt.unitLabel} ${r.start}–${r.end}`,
        deliverables: r.deliverables || []
    }));
}

/**
 * Render visual vector timeline Gantt matrix diagram in jsPDF
 * Perfectly matches Indonesian Tender/Proposal standards (NO | KETERANGAN | BULAN: 4, 5, 6, 7, 8, 9)
 */
export function _drawTimelineDiagramPdf(doc, margin, startY, contentWidth, timelineText, ensureQuoSpace) {
    const data = parseTimelineGantt(timelineText);
    if (!data || !data.rows || data.rows.length === 0) return startY;

    const { unitLabel, periods, rows } = data;
    const numPeriods = Math.min(Math.max(periods.length, 1), 14);

    const wNo = 12.0;
    const maxPeriodColW = 14.0;
    const minPeriodColW = 7.0;
    let wCol = Math.max(minPeriodColW, Math.min(maxPeriodColW, (contentWidth - wNo - 68.0) / numPeriods));
    const totalPeriodsW = wCol * numPeriods;
    const wKet = contentWidth - wNo - totalPeriodsW;

    const hHeaderTop = 5.2;
    const hHeaderSub = 5.0;
    const hHeader = hHeaderTop + hHeaderSub;

    ensureQuoSpace(hHeader + 16.0);

    let curY = startY;

    // --- 1. HEADER CELLS (All light neutral background #f1f5f9) ---
    // 1a. NO header cell
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.25);
    doc.rect(margin, curY, wNo, hHeader, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('NO', margin + (wNo / 2), curY + (hHeader / 2) + 1.0, { align: 'center' });

    // 1b. KETERANGAN header cell
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin + wNo, curY, wKet, hHeader, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text('KETERANGAN', margin + wNo + (wKet / 2), curY + (hHeader / 2) + 1.0, { align: 'center' });

    // 1c. BULAN / MINGGU cell (top header)
    const periodStartX = margin + wNo + wKet;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(periodStartX, curY, totalPeriodsW, hHeaderTop, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(unitLabel, periodStartX + (totalPeriodsW / 2), curY + 3.5, { align: 'center' });

    // 1d. Period sub-columns
    const subY = curY + hHeaderTop;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.0);
    periods.forEach((p, idx) => {
        const colX = periodStartX + (idx * wCol);
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.rect(colX, subY, wCol, hHeaderSub, 'FD');

        doc.setTextColor(15, 23, 42);
        doc.text(String(p), colX + (wCol / 2), subY + 3.4, { align: 'center' });
    });

    curY += hHeader;

    // --- 2. DATA ROWS (Pure white background for text, yellow for active period) ---
    rows.forEach(r => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        const titleLines = doc.splitTextToSize(r.title, wKet - 6.0);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.0);
        const delivLines = (r.deliverables || []).flatMap(d => doc.splitTextToSize('- ' + d, wKet - 8.0));

        const textH = (titleLines.length * 3.0) + (delivLines.length * 2.4);
        const rowH = Math.max(7.5, textH + 3.5);

        ensureQuoSpace(rowH + 2.0);

        // 2a. NO cell (White fill)
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.25);
        doc.rect(margin, curY, wNo, rowH, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(30, 41, 59);
        doc.text(String(r.no), margin + (wNo / 2), curY + (rowH / 2) + 1.0, { align: 'center' });

        // 2b. KETERANGAN cell (Explicit White fill to prevent text-color pollution)
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.rect(margin + wNo, curY, wKet, rowH, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(15, 23, 42); // Clear dark text on white background
        let tY = curY + 3.8;
        titleLines.forEach(tl => {
            doc.text(tl, margin + wNo + 3.0, tY);
            tY += 3.0;
        });

        if (delivLines.length > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.0);
            doc.setTextColor(100, 116, 139);
            delivLines.forEach(dl => {
                doc.text(dl, margin + wNo + 4.5, tY);
                tY += 2.4;
            });
        }

        // 2c. Period Cells
        periods.forEach((p, idx) => {
            const colX = periodStartX + (idx * wCol);
            const isActive = (p >= r.start && p <= r.end);

            if (isActive) {
                // Amber/yellow fill matching proposal specification (#fde68a / RGB 253, 230, 138)
                doc.setFillColor(253, 230, 138);
            } else {
                // Pure white fill
                doc.setFillColor(255, 255, 255);
            }
            doc.setDrawColor(203, 213, 225);
            doc.rect(colX, curY, wCol, rowH, 'FD');
        });

        curY += rowH;
    });

    return curY + 4.0;
}

/**
 * Render visual Gantt chart table HTML for Quotation Timeline
 * Replicates the clean procurement matrix table (NO | KETERANGAN | BULAN)
 */
export function renderTimelineDiagramHtml(timelineText) {
    const data = parseTimelineGantt(timelineText);
    if (!data || !data.rows || data.rows.length === 0) return '';

    const { unitLabel, periods, rows } = data;

    return `
        <div class="my-4 overflow-hidden rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs" style="min-width: 520px; border-collapse: collapse; border: 1px solid #cbd5e1;">
                    <thead>
                        <tr class="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700" style="background-color: #f1f5f9;">
                            <th rowspan="2" class="py-2.5 px-3 text-center font-bold uppercase tracking-wider border-r border-slate-300 dark:border-slate-700 w-14" style="border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #0f172a; text-align: center;">
                                NO
                            </th>
                            <th rowspan="2" class="py-2.5 px-4 text-center font-bold uppercase tracking-wider border-r border-slate-300 dark:border-slate-700" style="border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #0f172a; text-align: center;">
                                KETERANGAN
                            </th>
                            <th colspan="${periods.length}" class="py-2 px-3 text-center font-bold uppercase tracking-widest border-b border-slate-300 dark:border-slate-700" style="border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #0f172a; text-align: center;">
                                ${escapeHtml(unitLabel)}
                            </th>
                        </tr>
                        <tr class="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700" style="background-color: #f1f5f9;">
                            ${periods.map(p => `
                                <th class="py-1.5 px-2 text-center font-bold font-mono border-r border-slate-300 dark:border-slate-700 last:border-r-0 min-w-[36px]" style="border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #0f172a; text-align: center;">
                                    ${p}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                        ${rows.map(r => `
                            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                <td class="py-2.5 px-3 text-center font-semibold font-mono text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700 align-middle" style="border: 1px solid #cbd5e1; text-align: center;">
                                    ${escapeHtml(String(r.no))}
                                </td>
                                <td class="py-2.5 px-4 border-r border-slate-300 dark:border-slate-700 align-middle" style="border: 1px solid #cbd5e1;">
                                    <div class="font-normal text-slate-900 dark:text-slate-100 leading-snug">
                                        ${escapeHtml(r.title)}
                                    </div>
                                    ${r.deliverables && r.deliverables.length > 0 ? `
                                        <ul class="mt-1 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 list-disc list-inside">
                                            ${r.deliverables.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
                                        </ul>
                                    ` : ''}
                                </td>
                                ${periods.map(p => {
                                    const isActive = (p >= r.start && p <= r.end);
                                    return `
                                        <td class="p-0 border-r border-slate-300 dark:border-slate-700 last:border-r-0 text-center align-middle h-9 ${isActive ? 'bg-amber-200 dark:bg-amber-400/80' : 'bg-white dark:bg-slate-900'}" style="border: 1px solid #cbd5e1; ${isActive ? 'background-color: #fde68a !important;' : 'background-color: #ffffff;'}">
                                            ${isActive ? '<span class="sr-only">Aktif</span>' : ''}
                                        </td>
                                    `;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}


export function openWhatsAppInvoiceReminder(inv) {
    const phone = (inv.client_telepon || '').replace(/[^0-9]/g, '');
    let waPhone = phone;
    if (waPhone.startsWith('0')) {
        waPhone = '62' + waPhone.slice(1);
    }
    const companyName = window.App?.getSetting?.('company_name', 'PT CRUDWorks Media Tama') || 'PT CRUDWorks Media Tama';
    const invoiceNo = inv.nomor_invoice || 'Invoice';
    const totalTagihan = _safeFormatIDR(inv.sisa_tagihan || inv.total_tagihan || 0);
    const jatuhTempo = _safeFormatDate(inv.tanggal_jatuh_tempo);
    const baseUrl = window.location.href.split('#')[0];
    const publicUrl = `${baseUrl}#/public-invoice?token=${encodeURIComponent(inv.public_token || inv.nomor_invoice || '')}`;

    const bank = (inv.payment_methods || []).find(b => b.is_default) || (inv.payment_methods || [])[0] || {};
    const bankInfo = bank.nama_bank ? `${bank.nama_bank} No. Rek: ${bank.nomor_rekening} a.n ${bank.atas_nama}` : 'BCA No. Rek: 8720192831 a.n PT CRUDWorks Media Tama';

    const customTmpl = window.App?.settings?.wa_template_invoice;
    let text = '';
    if (customTmpl && customTmpl.trim()) {
        text = _fillWhatsAppTemplate(customTmpl, {
            nama_pic: inv.penanggung_jawab || inv.client_pic || 'Pelanggan',
            nama_perusahaan: inv.nama_perusahaan || '',
            nomor_invoice: invoiceNo,
            nama_proyek: inv.nama_project || 'Layanan TI & Solusi Perangkat Lunak',
            total_tagihan: totalTagihan,
            jatuh_tempo: jatuhTempo,
            info_bank: bankInfo,
            tautan_faktur: publicUrl,
            nama_instansi: companyName
        });
    } else {
        text = `Halo Bapak/Ibu ${inv.penanggung_jawab || inv.client_pic || 'Pelanggan'} (${inv.nama_perusahaan || ''}),\n\n`
            + `Semoga Bapak/Ibu dalam keadaan sehat. Kami dari bagian Keuangan *${companyName}* menginformasikan mengenai faktur tagihan berikut:\n\n`
            + `📄 *No. Faktur*: ${invoiceNo}\n`
            + `💼 *Proyek*: ${inv.nama_project || 'Pengembangan Perangkat Lunak'}\n`
            + `💰 *Total Kewajiban*: *${totalTagihan}*\n`
            + `📅 *Jatuh Tempo*: ${jatuhTempo}\n\n`
            + `Pembayaran dapat ditransfer ke rekening resmi kami:\n`
            + `🏦 *${bankInfo}*\n\n`
            + `Rincian lengkap dan konfirmasi bukti transfer dapat diakses melalui tautan resmi:\n`
            + `🔗 ${publicUrl}\n\n`
            + `Jika pembayaran telah dilakukan, mohon abaikan pesan ini. Terima kasih atas kerja sama yang baik.\n\n`
            + `Salam hormat,\n*Bagian Billing & Finansial ${companyName}*`;
    }

    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
}

/**
 * Open pre-formatted WhatsApp message for payment receipt
 */
export function openWhatsAppReceipt(pay, inv) {
    const phone = (inv?.client_telepon || pay?.client_telepon || '').replace(/[^0-9]/g, '');
    let waPhone = phone;
    if (waPhone.startsWith('0')) {
        waPhone = '62' + waPhone.slice(1);
    }
    const companyName = window.App?.getSetting?.('company_name', 'PT CRUDWorks Media Tama') || 'PT CRUDWorks Media Tama';
    const invoiceNo = inv?.nomor_invoice || pay?.nomor_invoice || 'Invoice';
    const receiptNo = pay?.nomor_kuitansi || pay?.nomor_transaksi || pay?.nomor_pembayaran || `KW-${pay?.id || '001'}`;
    const nominal = _safeFormatIDR(pay?.jumlah_bayar || 0);
    const tanggalBayar = _safeFormatDate(pay?.tanggal_bayar || new Date().toISOString());
    const baseUrl = window.location.href.split('#')[0];
    const publicUrl = `${baseUrl}#/public-invoice?token=${encodeURIComponent(inv?.public_token || invoiceNo)}`;

    const customTmpl = window.App?.settings?.wa_template_receipt;
    let text = '';
    if (customTmpl && customTmpl.trim()) {
        text = _fillWhatsAppTemplate(customTmpl, {
            nama_pic: inv?.penanggung_jawab || 'Pelanggan',
            nama_perusahaan: inv?.nama_perusahaan || '',
            nomor_invoice: invoiceNo,
            nomor_kuitansi: receiptNo,
            nominal_bayar: nominal,
            tanggal_bayar: tanggalBayar,
            nama_proyek: inv?.nama_project || 'Layanan Digital',
            tautan_kuitansi: publicUrl,
            nama_instansi: companyName
        });
    } else {
        text = `Halo Bapak/Ibu ${inv?.penanggung_jawab || 'Pelanggan'} (${inv?.nama_perusahaan || ''}),\n\n`
            + `Kuitansi Pembayaran Sah: Pembayaran tagihan *${invoiceNo}* sebesar *${nominal}* telah kami terima dan diverifikasi lunas.\n\n`
            + `📄 *No. Kuitansi*: ${receiptNo}\n`
            + `📅 *Tanggal Terima*: ${tanggalBayar}\n`
            + `💼 *Proyek*: ${inv?.nama_project || 'Pengembangan Sistem'}\n\n`
            + `🔗 *Akses Kuitansi Resmi & Riwayat Faktur*:\n${publicUrl}\n\n`
            + `Terima kasih atas kerja sama dan pembayaran tepat waktu. Sukses selalu untuk bisnis Bapak/Ibu!\n\n`
            + `Salam hormat,\n*Kasir Finansial ${companyName}*`;
    }

    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
}

/**
 * Open pre-formatted WhatsApp message for quotation
 */
export function openWhatsAppQuotation(quo) {
    const phone = (quo.client_telepon || quo.telepon || '').replace(/[^0-9]/g, '');
    let waPhone = phone;
    if (waPhone.startsWith('0')) {
        waPhone = '62' + waPhone.slice(1);
    }
    const companyName = window.App?.getSetting?.('company_name', 'PT CRUDWorks Media Tama') || 'PT CRUDWorks Media Tama';
    const quoNo = quo.nomor_penawaran || 'Penawaran';
    const total = _safeFormatIDR(quo.total_penawaran || 0);
    const berlakuHingga = _safeFormatDate(quo.berlaku_hingga);
    const baseUrl = window.location.href.split('#')[0];
    const publicUrl = `${baseUrl}#/public-quotation?token=${encodeURIComponent(quo.public_token || quo.nomor_penawaran || '')}`;

    const customTmpl = window.App?.settings?.wa_template_quotation;
    let text = '';
    if (customTmpl && customTmpl.trim()) {
        text = _fillWhatsAppTemplate(customTmpl, {
            nama_pic: quo.penanggung_jawab || 'Bapak/Ibu',
            nama_perusahaan: quo.nama_perusahaan || '',
            nomor_penawaran: quoNo,
            nama_proyek: quo.nama_project || 'Solusi Sistem Digital',
            total_penawaran: total,
            berlaku_hingga: berlakuHingga,
            tautan_penawaran: publicUrl,
            nama_instansi: companyName
        });
    } else {
        text = `Halo Bapak/Ibu ${quo.penanggung_jawab || 'Bapak/Ibu'} (${quo.nama_perusahaan || ''}),\n\n`
            + `Terima kasih atas minat dan kepercayaan Anda kepada *${companyName}*. Kami telah menerbitkan Surat Penawaran Harga resmi berikut:\n\n`
            + `📄 *No. Penawaran*: ${quoNo}\n`
            + `💼 *Proyek*: ${quo.nama_project || 'Pengembangan Solusi Digital'}\n`
            + `💰 *Total Investasi*: *${total}*\n`
            + `📅 *Berlaku Hingga*: ${berlakuHingga}\n\n`
            + `Rincian spesifikasi, terms & conditions, serta persetujuan e-sign dapat diakses melalui portal resmi kami:\n`
            + `🔗 ${publicUrl}\n\n`
            + `Silakan hubungi kami apabila ada rincian yang perlu didiskusikan lebih lanjut.\n\n`
            + `Salam hangat,\n*Tim Bisnis & Legal ${companyName}*`;
    }

    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
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

export function renderStatusBadge(status, domain = 'general') {
    const s = String(status || '').toLowerCase().trim();

    let variant = 'neutral'; // 'success' | 'warning' | 'danger' | 'info' | 'neutral'
    let label = status || '-';
    let icon = '';
    let pulse = false;

    switch (s) {
        // Success states
        case 'lunas':
        case 'paid':
            variant = 'success';
            label = 'Lunas';
            icon = 'ri-checkbox-circle-fill';
            break;
        case 'aktif':
        case 'active':
            variant = 'success';
            label = 'Aktif';
            icon = 'ri-check-line';
            break;
        case 'disetujui':
        case 'approved':
            variant = 'success';
            label = 'Disetujui';
            icon = 'ri-checkbox-circle-fill';
            break;
        case 'selesai':
        case 'completed':
            variant = 'success';
            label = 'Selesai';
            icon = 'ri-check-double-line';
            break;
        case 'success':
        case 'deployed':
            variant = 'success';
            label = 'Deployed';
            icon = 'ri-checkbox-circle-fill';
            break;
        case 'verified':
        case 'terverifikasi':
            variant = 'success';
            label = 'Terverifikasi';
            icon = 'ri-shield-check-fill';
            break;

        // Warning states
        case 'sebagian':
        case 'partial':
            variant = 'warning';
            label = 'Bayar Sebagian';
            icon = 'ri-pie-chart-2-fill';
            break;
        case 'prospek':
        case 'lead':
            variant = 'warning';
            label = 'Prospek';
            icon = 'ri-user-star-line';
            break;
        case 'perencanaan':
        case 'planning':
            variant = 'warning';
            label = 'Perencanaan';
            icon = 'ri-compass-3-line';
            break;
        case 'pending':
        case 'menunggu':
            variant = 'warning';
            label = 'Menunggu';
            icon = 'ri-time-line';
            break;
        case 'kadaluarsa':
        case 'expired':
            variant = 'warning';
            label = 'Kadaluarsa';
            icon = 'ri-hourglass-2-line';
            break;

        // Danger states
        case 'jatuh_tempo':
        case 'overdue':
            variant = 'danger';
            label = 'Jatuh Tempo';
            icon = 'ri-alarm-warning-fill';
            pulse = true;
            break;
        case 'failed':
        case 'gagal':
            variant = 'danger';
            label = 'Gagal';
            icon = 'ri-close-circle-fill';
            break;
        case 'ditolak':
        case 'rejected':
            variant = 'danger';
            label = 'Ditolak';
            icon = 'ri-close-line';
            break;
        case 'dibatalkan':
        case 'batal':
        case 'cancelled':
            variant = 'danger';
            label = 'Dibatalkan';
            icon = 'ri-forbid-line';
            break;

        // Info / In-Progress states
        case 'dikirim':
        case 'sent':
            variant = 'info';
            label = 'Belum Bayar';
            icon = 'ri-send-plane-2-line';
            break;
        case 'running':
        case 'deploying':
            variant = 'info';
            label = 'Deploying...';
            icon = 'ri-loader-4-line';
            pulse = true;
            break;
        case 'maintenance':
            variant = 'info';
            label = 'Maintenance';
            icon = 'ri-tools-fill';
            break;
        case 'sudah_ditagih':
        case 'billed':
            variant = 'info';
            label = 'Ditagihkan';
            icon = 'ri-file-check-line';
            break;

        // Neutral states
        case 'draft':
        case 'draf':
            variant = 'neutral';
            label = 'Draf';
            icon = 'ri-edit-line';
            break;
        case 'nonaktif':
        case 'inactive':
            variant = 'neutral';
            label = 'Nonaktif';
            icon = 'ri-shut-down-line';
            break;
        case 'idle':
            variant = 'neutral';
            label = 'Idle';
            icon = 'ri-subtract-line';
            break;

        default:
            label = status ? (String(status).charAt(0).toUpperCase() + String(status).slice(1).replace(/_/g, ' ')) : '-';
            break;
    }

    const pulseClass = pulse ? 'animate-pulse' : '';
    const iconHtml = icon ? `<i class="${icon} text-[11px] shrink-0 ${icon.includes('spin') || icon.includes('loader') ? 'animate-spin' : ''}"></i>` : '';

    return `<span class="badge-status badge-status-${variant} ${pulseClass}"><span class="status-dot"></span>${iconHtml}<span>${escapeHtml(label)}</span></span>`;
}


if (typeof window !== 'undefined') {
    window.openWhatsAppReceipt = openWhatsAppReceipt;
    window.openWhatsAppInvoiceReminder = openWhatsAppInvoiceReminder;
    window.openWhatsAppQuotation = openWhatsAppQuotation;
    if (window.App) window.App.renderStatusBadge = renderStatusBadge;
}

