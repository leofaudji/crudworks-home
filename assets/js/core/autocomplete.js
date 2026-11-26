// ============================================
// SEARCHABLE AUTOCOMPLETE SELECT ENHANCER
// ============================================
import { escapeHtml } from './utils.js';

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

export function initAutocompletes(rootEl = document) {
    if (!rootEl || typeof rootEl.querySelectorAll !== 'function') return;
    rootEl.querySelectorAll('select[data-autocomplete]').forEach((sel) => {
        enhanceSelectAutocomplete(sel);
    });
}

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
