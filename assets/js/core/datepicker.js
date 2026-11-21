// ============================================
// CUSTOM DATE PICKER - Universal Enhancement for input[type="date"]
// Automatically upgrades native date inputs across all pages & modals
// ============================================

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_FULL = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const nativeValueDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

let _activeInput = null;
let _popoverEl = null;
let _viewYear = new Date().getFullYear();
let _viewMonth = new Date().getMonth();
let _viewMode = 'days'; // 'days' | 'months'
let _observer = null;
let _globalBound = false;

function parseYmd(str) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || '').trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
    return { y, m: mo, d };
}

function toYmd(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatDisplay(ymd, placeholder) {
    const p = parseYmd(ymd);
    if (!p) return placeholder || 'Pilih tanggal';
    return `${p.d} ${MONTHS_SHORT[p.m]} ${p.y}`;
}

function syncTriggerDisplay(input) {
    const wrap = input._cdpWrap;
    if (!wrap) return;
    const val = nativeValueDesc.get.call(input);
    const labelEl = wrap.querySelector('.cdp-label');
    const clearBtn = wrap.querySelector('.cdp-clear');
    const triggerBtn = wrap.querySelector('.cdp-trigger');

    const hasVal = !!parseYmd(val);
    if (labelEl) {
        labelEl.textContent = formatDisplay(val, input.getAttribute('title') || 'Pilih tanggal');
        labelEl.classList.toggle('is-placeholder', !hasVal);
    }
    if (clearBtn) {
        clearBtn.classList.toggle('hidden', !hasVal || input.required || input.disabled);
    }
    if (triggerBtn) {
        triggerBtn.disabled = !!input.disabled;
        triggerBtn.classList.toggle('is-disabled', !!input.disabled);
        triggerBtn.title = val ? `${formatDisplay(val)} (${val})` : (input.getAttribute('title') || 'Pilih tanggal');
    }
}

function ensurePopover() {
    if (_popoverEl && document.body.contains(_popoverEl)) return _popoverEl;
    _popoverEl = document.createElement('div');
    _popoverEl.id = 'cdp-global-popover';
    _popoverEl.className = 'cdp-popover hidden';
    _popoverEl.setAttribute('role', 'dialog');
    _popoverEl.setAttribute('aria-label', 'Pemilih Tanggal');
    _popoverEl.addEventListener('mousedown', (e) => e.stopPropagation());
    _popoverEl.addEventListener('click', (e) => e.stopPropagation());
    document.body.appendChild(_popoverEl);
    return _popoverEl;
}

function positionPopover(trigger) {
    const pop = ensurePopover();
    const rect = trigger.getBoundingClientRect();
    const popW = Math.min(288, window.innerWidth - 16);
    const estH = 310;

    let left = rect.left;
    if (left + popW > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - popW - 8);
    }
    let top = rect.bottom + 6;
    if (top + estH > window.innerHeight - 8 && rect.top - estH - 6 > 8) {
        top = rect.top - estH - 6;
    }

    pop.style.width = `${popW}px`;
    pop.style.left = `${Math.max(8, left)}px`;
    pop.style.top = `${Math.max(8, top)}px`;
}

function commitValue(input, ymd) {
    const prev = nativeValueDesc.get.call(input);
    nativeValueDesc.set.call(input, ymd);
    syncTriggerDisplay(input);
    if (input._cdpTrigger) {
        input._cdpTrigger.classList.remove('is-invalid');
    }
    if (prev !== ymd) {
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function renderPopoverContent() {
    if (!_activeInput) return;
    const pop = ensurePopover();
    const curVal = nativeValueDesc.get.call(_activeInput);
    const parsedCur = parseYmd(curVal);
    const today = new Date();
    const todayYmd = toYmd(today.getFullYear(), today.getMonth(), today.getDate());
    const minYmd = _activeInput.getAttribute('min') || '';
    const maxYmd = _activeInput.getAttribute('max') || '';

    if (_viewMode === 'months') {
        pop.innerHTML = `
            <div class="cdp-header">
                <button type="button" class="cdp-nav-btn" data-cdp-act="prev-year" title="Tahun Sebelumnya">
                    <i class="ri-arrow-left-s-line"></i>
                </button>
                <button type="button" class="cdp-title-btn" data-cdp-act="back-days">
                    <span>${_viewYear}</span>
                    <i class="ri-arrow-up-s-line text-xs"></i>
                </button>
                <button type="button" class="cdp-nav-btn" data-cdp-act="next-year" title="Tahun Berikutnya">
                    <i class="ri-arrow-right-s-line"></i>
                </button>
            </div>
            <div class="cdp-months-grid">
                ${MONTHS_SHORT.map((nm, idx) => {
                    const isCur = idx === _viewMonth;
                    const isNow = _viewYear === today.getFullYear() && idx === today.getMonth();
                    return `<button type="button" class="cdp-month-btn ${isCur ? 'is-selected' : ''} ${isNow ? 'is-today' : ''}" data-cdp-month="${idx}">${nm}</button>`;
                }).join('')}
            </div>
            <div class="cdp-footer">
                <button type="button" class="cdp-foot-btn is-primary" data-cdp-act="today">Hari Ini</button>
                <button type="button" class="cdp-foot-btn" data-cdp-act="close">Tutup</button>
            </div>`;
    } else {
        const firstDay = new Date(_viewYear, _viewMonth, 1).getDay();
        const daysInMonth = new Date(_viewYear, _viewMonth + 1, 0).getDate();
        const prevMonthDays = new Date(_viewYear, _viewMonth, 0).getDate();
        const cells = [];

        for (let i = firstDay - 1; i >= 0; i--) {
            const dNum = prevMonthDays - i;
            const prevDate = new Date(_viewYear, _viewMonth - 1, dNum);
            cells.push({
                y: prevDate.getFullYear(),
                m: prevDate.getMonth(),
                d: prevDate.getDate(),
                outside: true
            });
        }
        for (let d = 1; d <= daysInMonth; d++) {
            cells.push({ y: _viewYear, m: _viewMonth, d, outside: false });
        }
        while (cells.length < 42) {
            const nextIdx = cells.length - (firstDay + daysInMonth) + 1;
            const nextDate = new Date(_viewYear, _viewMonth + 1, nextIdx);
            cells.push({
                y: nextDate.getFullYear(),
                m: nextDate.getMonth(),
                d: nextDate.getDate(),
                outside: true
            });
        }

        pop.innerHTML = `
            <div class="cdp-header">
                <button type="button" class="cdp-nav-btn" data-cdp-act="prev-month" title="Bulan Sebelumnya">
                    <i class="ri-arrow-left-s-line"></i>
                </button>
                <button type="button" class="cdp-title-btn" data-cdp-act="pick-month" title="Pilih Bulan &amp; Tahun">
                    <span>${MONTHS_FULL[_viewMonth]} ${_viewYear}</span>
                    <i class="ri-arrow-down-s-line text-xs"></i>
                </button>
                <button type="button" class="cdp-nav-btn" data-cdp-act="next-month" title="Bulan Berikutnya">
                    <i class="ri-arrow-right-s-line"></i>
                </button>
            </div>
            <div class="cdp-weekdays">
                ${DAYS_SHORT.map(d => `<span>${d}</span>`).join('')}
            </div>
            <div class="cdp-days-grid">
                ${cells.map(c => {
                    const ymd = toYmd(c.y, c.m, c.d);
                    const isSelected = parsedCur && curVal === ymd;
                    const isToday = ymd === todayYmd;
                    const isDisabled = (minYmd && ymd < minYmd) || (maxYmd && ymd > maxYmd);
                    return `<button type="button"
                        ${isDisabled ? 'disabled' : ''}
                        data-cdp-date="${ymd}"
                        class="cdp-day ${c.outside ? 'is-outside' : ''} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}">
                        ${c.d}
                    </button>`;
                }).join('')}
            </div>
            <div class="cdp-footer">
                <button type="button" class="cdp-foot-btn is-primary" data-cdp-act="today">Hari Ini</button>
                <div class="flex items-center gap-1">
                    ${!_activeInput.required ? '<button type="button" class="cdp-foot-btn text-rose-600" data-cdp-act="clear">Hapus</button>' : ''}
                    <button type="button" class="cdp-foot-btn" data-cdp-act="close">Tutup</button>
                </div>
            </div>`;
    }

    pop.querySelectorAll('[data-cdp-date]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const ymd = btn.getAttribute('data-cdp-date');
            if (!_activeInput || !ymd) return;
            const target = _activeInput;
            closeDatePopover();
            commitValue(target, ymd);
        });
    });

    pop.querySelectorAll('[data-cdp-month]').forEach((btn) => {
        btn.addEventListener('click', () => {
            _viewMonth = Number(btn.getAttribute('data-cdp-month'));
            _viewMode = 'days';
            renderPopoverContent();
        });
    });

    pop.querySelectorAll('[data-cdp-act]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const act = btn.getAttribute('data-cdp-act');
            if (act === 'prev-month') {
                _viewMonth--;
                if (_viewMonth < 0) { _viewMonth = 11; _viewYear--; }
                renderPopoverContent();
            } else if (act === 'next-month') {
                _viewMonth++;
                if (_viewMonth > 11) { _viewMonth = 0; _viewYear++; }
                renderPopoverContent();
            } else if (act === 'prev-year') {
                _viewYear--;
                renderPopoverContent();
            } else if (act === 'next-year') {
                _viewYear++;
                renderPopoverContent();
            } else if (act === 'pick-month') {
                _viewMode = 'months';
                renderPopoverContent();
            } else if (act === 'back-days') {
                _viewMode = 'days';
                renderPopoverContent();
            } else if (act === 'today') {
                if (_activeInput) {
                    const target = _activeInput;
                    const minYmd2 = target.getAttribute('min') || '';
                    const maxYmd2 = target.getAttribute('max') || '';
                    if ((minYmd2 && todayYmd < minYmd2) || (maxYmd2 && todayYmd > maxYmd2)) return;
                    closeDatePopover();
                    commitValue(target, todayYmd);
                }
            } else if (act === 'clear') {
                if (_activeInput) {
                    const target = _activeInput;
                    closeDatePopover();
                    commitValue(target, '');
                }
            } else if (act === 'close') {
                closeDatePopover();
            }
        });
    });
}

export function closeDatePopover() {
    if (_activeInput?._cdpTrigger) {
        _activeInput._cdpTrigger.classList.remove('is-open');
    }
    _activeInput = null;
    if (_popoverEl) {
        _popoverEl.classList.add('hidden');
    }
}

function openDatePopover(input) {
    if (input.disabled) return;
    if (_activeInput === input && _popoverEl && !_popoverEl.classList.contains('hidden')) {
        closeDatePopover();
        return;
    }
    if (_activeInput?._cdpTrigger) {
        _activeInput._cdpTrigger.classList.remove('is-open');
    }

    _activeInput = input;
    const p = parseYmd(nativeValueDesc.get.call(input));
    const now = new Date();
    _viewYear = p ? p.y : now.getFullYear();
    _viewMonth = p ? p.m : now.getMonth();
    _viewMode = 'days';

    const pop = ensurePopover();
    renderPopoverContent();
    pop.classList.remove('hidden');
    positionPopover(input._cdpTrigger);
    input._cdpTrigger.classList.add('is-open');
}

function bindGlobalListeners() {
    if (_globalBound) return;
    _globalBound = true;

    document.addEventListener('mousedown', (e) => {
        if (!_activeInput) return;
        if (_popoverEl && _popoverEl.contains(e.target)) return;
        if (_activeInput._cdpWrap && _activeInput._cdpWrap.contains(e.target)) return;
        closeDatePopover();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && _activeInput) {
            closeDatePopover();
        }
    });

    window.addEventListener('resize', () => {
        if (_activeInput && _popoverEl && !_popoverEl.classList.contains('hidden')) {
            positionPopover(_activeInput._cdpTrigger);
        }
    });
}

function enhanceOneDateInput(input) {
    if (!input || input.dataset.cdpEnhanced === '1' || input.hasAttribute('data-native-date')) return;
    input.dataset.cdpEnhanced = '1';

    const isFullWidth = input.classList.contains('w-full');
    const isCompactText = input.classList.contains('text-xs');

    const wrap = document.createElement('div');
    wrap.className = `cdp-wrap ${isFullWidth ? 'is-full' : ''}`;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = `cdp-trigger ${isCompactText ? 'is-xs' : 'is-sm'} ${isFullWidth ? 'w-full' : ''}`;
    trigger.innerHTML = `
        <i class="ri-calendar-2-line cdp-icon"></i>
        <span class="cdp-label"></span>
        <span class="cdp-clear hidden" role="button" tabindex="-1" title="Kosongkan tanggal"><i class="ri-close-line"></i></span>
    `;

    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    wrap.appendChild(trigger);

    input.classList.add('cdp-native');
    input.tabIndex = -1;
    input._cdpWrap = wrap;
    input._cdpTrigger = trigger;

    // Intercept .value so programmatic changes (reset, presets) sync custom display
    Object.defineProperty(input, 'value', {
        configurable: true,
        get() {
            return nativeValueDesc.get.call(this);
        },
        set(v) {
            nativeValueDesc.set.call(this, v);
            syncTriggerDisplay(this);
        }
    });

    syncTriggerDisplay(input);

    trigger.addEventListener('click', (e) => {
        if (e.target.closest('.cdp-clear')) {
            e.stopPropagation();
            if (!input.disabled && !input.required) {
                commitValue(input, '');
                closeDatePopover();
            }
            return;
        }
        openDatePopover(input);
    });

    input.addEventListener('invalid', (e) => {
        e.preventDefault();
        trigger.classList.add('is-invalid');
        trigger.focus();
        openDatePopover(input);
    });

    input.addEventListener('change', () => syncTriggerDisplay(input));

    if (input.form && input.dataset.cdpResetBound !== '1') {
        input.dataset.cdpResetBound = '1';
        input.form.addEventListener('reset', () => {
            setTimeout(() => syncTriggerDisplay(input), 0);
        });
    }
}

export function enhanceDateInputs(root = document) {
    bindGlobalListeners();
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches('input[type="date"]')) {
        enhanceOneDateInput(root);
    }
    root.querySelectorAll('input[type="date"]:not([data-cdp-enhanced="1"])').forEach(enhanceOneDateInput);
}

export function initDatePickerObserver() {
    enhanceDateInputs(document);
    if (_observer) return;
    _observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.type === 'childList') {
                m.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) enhanceDateInputs(node);
                });
            } else if (m.type === 'attributes' && m.target?.nodeType === 1 && m.target.tagName === 'INPUT' && m.target.type === 'date') {
                syncTriggerDisplay(m.target);
            }
        }
    });
    _observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled']
    });
}

