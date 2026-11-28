// assets/js/core/ui-dialogs.js — Dialog SweetAlert2/Fallback, Empty State & Skeleton UI
import { escapeHtml } from './utils.js';

function _showAppDialog({
    title,
    text = '',
    icon = 'warning',
    confirmBtnText = 'Ya, Lanjutkan',
    cancelBtnText = 'Batal',
    showCancel = true,
    input = null
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
                    ${input ? `
                        <div class="mt-4 text-left">
                            ${input.label ? `<label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">${escapeHtml(input.label)}</label>` : ''}
                            <input type="${escapeHtml(input.type || 'text')}" data-dialog-input
                                   value="${escapeHtml(input.value || '')}"
                                   placeholder="${escapeHtml(input.placeholder || '')}"
                                   ${input.autocomplete ? `autocomplete="${escapeHtml(input.autocomplete)}"` : ''}
                                   class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition">
                            <p data-dialog-input-err class="hidden mt-1.5 text-[11px] font-semibold text-rose-600"></p>
                        </div>
                    ` : ''}
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
                close(input ? null : false);
            }
        };

        const handleConfirm = () => {
            if (!input) {
                close(true);
                return;
            }
            const inputEl = overlay.querySelector('[data-dialog-input]');
            const errEl = overlay.querySelector('[data-dialog-input-err]');
            const val = inputEl ? inputEl.value : '';
            const trimmed = input.trim === false ? val : val.trim();
            let errMsg = '';
            if (input.required && !trimmed) {
                errMsg = input.requiredMessage || 'Kolom ini wajib diisi';
            } else if (input.minLength && trimmed.length < input.minLength) {
                errMsg = `Minimal ${input.minLength} karakter`;
            } else if (typeof input.validator === 'function') {
                errMsg = input.validator(trimmed) || '';
            }
            if (errMsg) {
                if (errEl) {
                    errEl.textContent = errMsg;
                    errEl.classList.remove('hidden');
                }
                inputEl?.focus();
                return;
            }
            close(trimmed);
        };

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close(input ? null : false);
        });
        overlay.querySelector('[data-dialog-confirm]')?.addEventListener('click', handleConfirm);
        overlay.querySelector('[data-dialog-cancel]')?.addEventListener('click', () => close(input ? null : false));
        overlay.querySelector('[data-dialog-input]')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            }
        });
        document.addEventListener('keydown', onKeyDown);

        document.body.appendChild(overlay);
        requestAnimationFrame(() => {
            overlay.classList.add('is-open');
            const inputEl = overlay.querySelector('[data-dialog-input]');
            if (inputEl) {
                inputEl.focus();
                inputEl.select?.();
                return;
            }
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
 * Custom Input Prompt Modal (replaces generic SweetAlert2 / window.prompt)
 */
export async function promptAction({
    title,
    text = '',
    icon = 'question',
    confirmBtnText = 'Simpan',
    cancelBtnText = 'Batal',
    type = 'text',
    label = '',
    placeholder = '',
    value = '',
    required = true,
    minLength = 0,
    trim = true,
    autocomplete = '',
    validator = null
} = {}) {
    return _showAppDialog({
        title,
        text,
        icon,
        confirmBtnText,
        cancelBtnText,
        showCancel: true,
        input: { type, label, placeholder, value, required, minLength, trim, autocomplete, validator }
    });
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
