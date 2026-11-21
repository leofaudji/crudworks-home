// ============================================
// CUSTOM CURRENCY INPUT - Automatic Thousand Separator (1.500.000)
// Enhances rupiah numeric inputs across all pages & modals transparently
// ============================================

const nativeInputValueDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
let _curObserver = null;

function isCurrencyInput(el) {
    if (!el || el.tagName !== 'INPUT') return false;
    if (el.dataset.curEnhanced === '1' || el.hasAttribute('data-no-currency')) return false;
    if (el.type !== 'number' && !el.hasAttribute('data-currency')) return false;

    const idName = `${el.id || ''} ${el.name || ''}`.toLowerCase();
    // Exclude non-currency numeric inputs (percentages, dates, counts)
    if (/(pct|persen|percent|umur|tahun|bulan|days|hari|rate|cadangan|fee-pct|residu_pct)/.test(idName)) {
        return false;
    }

    if (el.hasAttribute('data-currency') || el.hasAttribute('data-ang-nom')) return true;

    return /(jumlah|nominal|harga_perolehan|nilai_residu|akumulasi_penyusutan|saldo_awal|debit|kredit|pajak-nom|tf-dp|sim-laba|sim-modal|bayar)/.test(idName);
}

function sanitizeNumericString(raw, allowNegative = false) {
    let str = String(raw ?? '').trim();
    if (!str) return '';
    const isNeg = allowNegative && str.startsWith('-');
    // Remove thousand dots and anything except digits
    // Note: if raw came from JS float/decimal like "2500000.00", strip trailing .00 first
    if (/^-?\d+\.\d{1,2}$/.test(str)) {
        str = String(Math.round(parseFloat(str)));
    }
    const digits = str.replace(/[^\d]/g, '');
    if (!digits) return isNeg ? '-' : '';
    const cleaned = digits.replace(/^0+(?=\d)/, '');
    return (isNeg ? '-' : '') + cleaned;
}

function formatThousand(numStr) {
    if (!numStr || numStr === '-') return numStr || '';
    const isNeg = numStr.startsWith('-');
    const digits = isNeg ? numStr.slice(1) : numStr;
    if (!digits) return isNeg ? '-' : '';
    return (isNeg ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function syncDisplay(input) {
    const disp = input._curDisplay;
    if (!disp) return;
    const raw = nativeInputValueDesc.get.call(input);
    const allowNeg = input.min === '' || Number(input.min) < 0;
    const clean = sanitizeNumericString(raw, allowNeg);
    disp.value = formatThousand(clean);
    disp.disabled = !!input.disabled;
    disp.readOnly = !!input.readOnly;
}

function enhanceOneCurrencyInput(input) {
    if (!isCurrencyInput(input)) return;
    input.dataset.curEnhanced = '1';

    const allowNeg = input.min === '' || Number(input.min) < 0;
    const wrap = document.createElement('div');
    wrap.className = `cur-wrap ${input.classList.contains('w-full') ? 'w-full' : ''}`;

    const disp = document.createElement('input');
    disp.type = 'text';
    disp.inputMode = 'numeric';
    disp.autocomplete = 'off';
    disp.placeholder = input.placeholder || '';
    disp.disabled = !!input.disabled;
    disp.readOnly = !!input.readOnly;

    // Copy styling classes from original input
    const cls = Array.from(input.classList).filter(c => c !== 'cdp-native');
    disp.className = `${cls.join(' ')} cur-display`;

    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    wrap.appendChild(disp);

    input.classList.add('cdp-native');
    input.tabIndex = -1;
    input._curWrap = wrap;
    input._curDisplay = disp;

    // Normalize initial value (e.g. "2500000.00" -> "2500000")
    const initVal = nativeInputValueDesc.get.call(input);
    if (initVal !== '') {
        const cleanInit = sanitizeNumericString(initVal, allowNeg);
        if (cleanInit !== initVal) {
            nativeInputValueDesc.set.call(input, cleanInit);
        }
    }

    Object.defineProperty(input, 'value', {
        configurable: true,
        get() {
            return nativeInputValueDesc.get.call(this);
        },
        set(v) {
            const clean = sanitizeNumericString(v, allowNeg);
            nativeInputValueDesc.set.call(this, clean);
            syncDisplay(this);
        }
    });

    syncDisplay(input);

    disp.addEventListener('input', () => {
        const caretFromRight = disp.value.length - (disp.selectionStart || 0);
        const clean = sanitizeNumericString(disp.value, allowNeg);
        const formatted = formatThousand(clean);
        disp.value = formatted;

        const nextPos = Math.max(0, formatted.length - caretFromRight);
        try { disp.setSelectionRange(nextPos, nextPos); } catch (_) {}

        nativeInputValueDesc.set.call(input, clean);
        disp.classList.remove('border-rose-500');
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    disp.addEventListener('change', () => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    disp.addEventListener('focus', () => {
        if (disp.value === '0' && !input.hasAttribute('data-keep-zero')) {
            disp.select();
        }
    });

    // Sync display when parent form is reset
    if (input.form) {
        input.form.addEventListener('reset', () => {
            setTimeout(() => {
                syncDisplay(input);
            }, 0);
        });
    }

    input.addEventListener('invalid', (e) => {
        e.preventDefault();
        disp.classList.add('border-rose-500');
        disp.focus();

        let msg = 'Silakan periksa kembali isian nominal';
        if (input.validity.valueMissing) {
            msg = 'Nominal pembayaran / angka wajib diisi';
        } else if (input.validity.rangeUnderflow) {
            msg = `Nominal tidak boleh kurang dari ${input.min}`;
        } else if (input.validity.rangeOverflow) {
            msg = `Nominal tidak boleh melebihi ${input.max}`;
        } else if (input.validity.stepMismatch) {
            msg = 'Nominal harus sesuai kelipatan yang valid';
        }
        if (window.App && typeof window.App.toast === 'function') {
            window.App.toast(msg, 'warning');
        }
    });
}

export function enhanceCurrencyInputs(root = document) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches('input[type="number"], input[data-currency]')) {
        enhanceOneCurrencyInput(root);
    }
    root.querySelectorAll('input[type="number"]:not([data-cur-enhanced="1"]), input[data-currency]:not([data-cur-enhanced="1"])').forEach(enhanceOneCurrencyInput);
}

export function initCurrencyObserver() {
    enhanceCurrencyInputs(document);
    if (_curObserver) return;
    _curObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.type === 'childList') {
                m.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) enhanceCurrencyInputs(node);
                });
            } else if (m.type === 'attributes' && m.target?.nodeType === 1 && m.target.dataset?.curEnhanced === '1') {
                syncDisplay(m.target);
            }
        }
    });
    _curObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'readonly']
    });
}

