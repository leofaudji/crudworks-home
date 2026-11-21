// ============================================
// CUSTOM SELECT - Universal Modern Dropdown for <select>
// ============================================

let _observerBound = false;
let _activeMenu = null;

function _closeActiveMenu(restoreFocus = false) {
    if (!_activeMenu) return;
    const { menu, trigger, wrap, onDocClick, onKeyDown, onResizeOrScroll } = _activeMenu;
    document.removeEventListener('pointerdown', onDocClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('resize', onResizeOrScroll);
    window.removeEventListener('scroll', onResizeOrScroll, true);

    wrap.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    menu.remove();
    _activeMenu = null;

    if (restoreFocus) {
        try { trigger.focus({ preventScroll: true }); } catch (_) {}
    }
}

function _getSelectedOption(selectEl) {
    if (!selectEl || selectEl.options.length === 0) return null;
    if (selectEl.selectedIndex >= 0 && selectEl.options[selectEl.selectedIndex]) {
        return selectEl.options[selectEl.selectedIndex];
    }
    return selectEl.options[0] || null;
}

function _syncTrigger(selectEl, trigger, labelEl) {
    const opt = _getSelectedOption(selectEl);
    const text = opt ? (opt.textContent || '').trim() : 'Pilih...';
    const isPlaceholder = !opt || opt.value === '';
    labelEl.textContent = text || 'Pilih...';
    labelEl.classList.toggle('is-placeholder', isPlaceholder);

    const disabled = Boolean(selectEl.disabled);
    trigger.disabled = disabled;
    trigger.classList.toggle('is-disabled', disabled);
}

function _positionMenu(trigger, menu) {
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const minW = Math.max(rect.width, 168);
    const maxW = Math.min(Math.max(minW, 320), vw - 16);

    menu.style.minWidth = `${minW}px`;
    menu.style.maxWidth = `${maxW}px`;

    const menuH = Math.min(menu.scrollHeight || 260, 290);
    const spaceBelow = vh - rect.bottom - 10;
    const spaceAbove = rect.top - 10;
    const openUp = spaceBelow < Math.min(menuH, 190) && spaceAbove > spaceBelow;

    let left = rect.left;
    if (left + minW > vw - 8) {
        left = Math.max(8, vw - minW - 8);
    }

    menu.style.left = `${Math.round(left)}px`;
    if (openUp) {
        menu.style.top = 'auto';
        menu.style.bottom = `${Math.round(vh - rect.top + 6)}px`;
        menu.classList.add('is-up');
    } else {
        menu.style.bottom = 'auto';
        menu.style.top = `${Math.round(rect.bottom + 6)}px`;
        menu.classList.remove('is-up');
    }
}

function _buildMenuItems(selectEl, listEl, query = '') {
    const q = query.trim().toLowerCase();
    listEl.innerHTML = '';
    const options = Array.from(selectEl.options || []);
    let visibleCount = 0;

    options.forEach((opt, idx) => {
        const label = (opt.textContent || '').trim();
        if (q && !label.toLowerCase().includes(q)) return;
        visibleCount++;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'csel-option';
        btn.dataset.optIndex = String(idx);
        if (idx === selectEl.selectedIndex) btn.classList.add('is-selected');
        if (opt.disabled) btn.disabled = true;

        const span = document.createElement('span');
        span.className = 'csel-option-text';
        span.textContent = label || '(Kosong)';

        const check = document.createElement('i');
        check.className = 'ri-check-line csel-option-check';

        btn.appendChild(span);
        btn.appendChild(check);
        listEl.appendChild(btn);
    });

    if (visibleCount === 0) {
        const empty = document.createElement('div');
        empty.className = 'csel-empty';
        empty.textContent = 'Tidak ada pilihan cocok';
        listEl.appendChild(empty);
    }
}

function _openMenu(selectEl, wrap, trigger, labelEl) {
    if (selectEl.disabled) return;
    if (_activeMenu && _activeMenu.selectEl === selectEl) {
        _closeActiveMenu(false);
        return;
    }
    _closeActiveMenu(false);

    const menu = document.createElement('div');
    menu.className = 'csel-menu';
    menu.setAttribute('role', 'listbox');

    let searchInput = null;
    if ((selectEl.options?.length || 0) >= 7) {
        const searchWrap = document.createElement('div');
        searchWrap.className = 'csel-search-wrap';
        searchWrap.innerHTML = `<i class="ri-search-line csel-search-icon"></i>`;
        searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'csel-search-input';
        searchInput.placeholder = 'Cari pilihan...';
        searchInput.autocomplete = 'off';
        searchWrap.appendChild(searchInput);
        menu.appendChild(searchWrap);
    }

    const listEl = document.createElement('div');
    listEl.className = 'csel-list scrollbar-thin';
    menu.appendChild(listEl);

    _buildMenuItems(selectEl, listEl, '');

    listEl.addEventListener('click', (e) => {
        const btn = e.target?.closest?.('.csel-option');
        if (!btn || btn.disabled) return;
        const idx = Number(btn.dataset.optIndex);
        if (!Number.isNaN(idx) && selectEl.options[idx]) {
            const changed = selectEl.selectedIndex !== idx;
            selectEl.selectedIndex = idx;
            _syncTrigger(selectEl, trigger, labelEl);
            _closeActiveMenu(true);
            if (changed) {
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    });

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            _buildMenuItems(selectEl, listEl, searchInput.value);
        });
    }

    document.body.appendChild(menu);
    wrap.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    _positionMenu(trigger, menu);

    const selectedItem = listEl.querySelector('.csel-option.is-selected');
    if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
    }
    if (searchInput) {
        requestAnimationFrame(() => searchInput.focus({ preventScroll: true }));
    }

    const onDocClick = (e) => {
        if (!menu.contains(e.target) && !wrap.contains(e.target)) {
            _closeActiveMenu(false);
        }
    };

    const onKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            _closeActiveMenu(true);
        }
    };

    const onResizeOrScroll = (e) => {
        if (e && e.target && menu.contains(e.target)) return;
        _closeActiveMenu(false);
    };

    document.addEventListener('pointerdown', onDocClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', onResizeOrScroll);
    window.addEventListener('scroll', onResizeOrScroll, true);

    _activeMenu = { selectEl, menu, trigger, wrap, onDocClick, onKeyDown, onResizeOrScroll };
}

function _enhanceSelect(selectEl) {
    if (!selectEl || selectEl.dataset.cselInit === '1') return;
    if (selectEl.multiple || Number(selectEl.size) > 1) return;
    if (selectEl.dataset.nativeSelect === 'true' || selectEl.classList.contains('no-custom-select')) return;
    // Jangan dobel dengan komponen Autocomplete (data-autocomplete="1") atau elemen tersembunyi
    if (selectEl.hasAttribute('data-autocomplete') || selectEl.classList.contains('ac-initialized') || selectEl.classList.contains('hidden')) return;
    if (selectEl.closest('.ac-wrap, .cdp-popover, .swal2-container')) return;
    if (typeof window.getComputedStyle === 'function' && window.getComputedStyle(selectEl).display === 'none') return;

    selectEl.dataset.cselInit = '1';

    const wrap = document.createElement('div');
    wrap.className = 'csel-wrap';

    // Preserve width, flex, and grid layout classes from original <select>
    const cls = selectEl.className || '';
    cls.split(/\s+/).forEach((token) => {
        if (!token) return;
        if (/^(?:(?:sm|md|lg|xl|2xl):)?(?:w-|min-w-|max-w-|flex-|shrink|grow|col-span-|self-)/.test(token)) {
            wrap.classList.add(token);
        }
    });

    const isCompact = /\btext-xs\b/.test(cls) || /\bpy-1(\.5)?\b/.test(cls) || /\bh-8\b|\bh-9\b/.test(cls);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = `csel-trigger ${isCompact ? 'csel-trigger--sm' : ''}`;
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const labelEl = document.createElement('span');
    labelEl.className = 'csel-label';

    const chevron = document.createElement('i');
    chevron.className = 'ri-arrow-down-s-line csel-chevron';

    trigger.appendChild(labelEl);
    trigger.appendChild(chevron);

    selectEl.parentNode.insertBefore(wrap, selectEl);
    wrap.appendChild(selectEl);
    wrap.appendChild(trigger);

    selectEl.classList.add('csel-native');
    selectEl.tabIndex = -1;

    _syncTrigger(selectEl, trigger, labelEl);

    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        _openMenu(selectEl, wrap, trigger, labelEl);
    });

    selectEl.addEventListener('change', () => {
        _syncTrigger(selectEl, trigger, labelEl);
    });

    // Sync custom trigger when page scripts programmatically set .value or .selectedIndex (e.g. Edit modals)
    const valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    if (valueDesc && valueDesc.configurable) {
        Object.defineProperty(selectEl, 'value', {
            configurable: true,
            get() {
                return valueDesc.get.call(this);
            },
            set(val) {
                valueDesc.set.call(this, val);
                _syncTrigger(selectEl, trigger, labelEl);
            }
        });
    }

    const idxDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');
    if (idxDesc && idxDesc.configurable) {
        Object.defineProperty(selectEl, 'selectedIndex', {
            configurable: true,
            get() {
                return idxDesc.get.call(this);
            },
            set(val) {
                idxDesc.set.call(this, val);
                _syncTrigger(selectEl, trigger, labelEl);
            }
        });
    }

    if (selectEl.form && selectEl.dataset.cselResetBound !== '1') {
        selectEl.dataset.cselResetBound = '1';
        selectEl.form.addEventListener('reset', () => {
            setTimeout(() => _syncTrigger(selectEl, trigger, labelEl), 0);
        });
    }

    // Keep synced when page scripts update <option>s, selected, or disabled state dynamically
    const optObserver = new MutationObserver(() => {
        _syncTrigger(selectEl, trigger, labelEl);
    });
    optObserver.observe(selectEl, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['disabled', 'selected']
    });
}

export function enhanceSelects(rootEl = document) {
    if (!rootEl || typeof rootEl.querySelectorAll !== 'function') return;
    if (rootEl.matches && rootEl.matches('select:not([data-csel-init="1"])')) {
        _enhanceSelect(rootEl);
    }
    rootEl.querySelectorAll('select:not([data-csel-init="1"])').forEach(_enhanceSelect);
}

export function initSelectObserver() {
    if (_observerBound || typeof MutationObserver === 'undefined') return;
    _observerBound = true;

    enhanceSelects(document);

    let rafId = null;
    const pendingRoots = new Set();

    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.nodeType !== 1) continue;
                if (
                    (node.matches && node.matches('select:not([data-csel-init="1"])')) ||
                    (node.querySelector && node.querySelector('select:not([data-csel-init="1"])'))
                ) {
                    pendingRoots.add(node);
                }
            }
        }
        if (pendingRoots.size > 0 && !rafId) {
            rafId = requestAnimationFrame(() => {
                rafId = null;
                pendingRoots.forEach((r) => enhanceSelects(r));
                pendingRoots.clear();
            });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

