// ============================================
// QUICK BILLING / INVOICE CALCULATOR MODAL
// ============================================
import { formatRupiah } from './utils.js';

export function toggleCalculator(forceOpen = null) {
    const modal = document.getElementById('calculator-modal');
    const content = document.getElementById('calculator-content');
    if (!modal) return;

    const isHidden = modal.classList.contains('hidden');
    const open = forceOpen !== null ? forceOpen : isHidden;

    if (open) {
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            content?.classList.remove('scale-95');
        });
        computeQuickInvoiceCalc();
    } else {
        modal.classList.add('opacity-0');
        content?.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 200);
    }
}

export function computeQuickInvoiceCalc() {
    const subtotalInput = document.getElementById('qcalc-subtotal');
    const diskonInput = document.getElementById('qcalc-diskon');
    const ppnInput = document.getElementById('qcalc-ppn');
    const ppnAmountEl = document.getElementById('qcalc-ppn-amount');
    const grandTotalEl = document.getElementById('qcalc-grand-total');

    if (!subtotalInput) return;

    const subtotal = Math.max(0, parseFloat(subtotalInput.value) || 0);
    const diskon = Math.max(0, parseFloat(diskonInput?.value) || 0);
    const ppnPct = Math.max(0, parseFloat(ppnInput?.value) || 0);

    const dpp = Math.max(0, subtotal - diskon);
    const ppnAmount = Math.round(dpp * (ppnPct / 100));
    const grandTotal = dpp + ppnAmount;

    if (ppnAmountEl) ppnAmountEl.textContent = formatRupiah(ppnAmount);
    if (grandTotalEl) grandTotalEl.textContent = formatRupiah(grandTotal);
}
