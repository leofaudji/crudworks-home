// portal/pages/invoices.js — Daftar Faktur Tagihan, Pembayaran In-App & Kuitansi PDF
import { generateInvoicePdf, generatePaymentReceiptPdf } from '../../assets/js/core/utils.js';
import { $, esc, money, fdate, badge, sectionTitle, panel, empty, api, toast, openModal, closeModal, openPdfPreviewModal, state, hooks } from '../ctx.js';

export function renderFilteredInvoiceList(invoices = []) {
    const filter = state.invoiceFilter || '';
    const q = (state.invoiceSearch || '').trim().toLowerCase();
    const tone = { lunas: 'green', sebagian: 'amber', jatuh_tempo: 'red', dibatalkan: 'slate', draft: 'slate' };

    const filtered = invoices.filter((inv) => {
        const sisa = Number(inv.sisa_tagihan || 0);
        if (filter === 'unpaid' && sisa <= 0) return false;
        if (filter === 'paid' && sisa > 0) return false;
        if (q) {
            const hay = `${inv.nomor_invoice || ''} ${inv.status || ''} ${fdate(inv.tanggal_invoice)}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        return empty(filter || q ? 'Tidak ada faktur yang sesuai dengan filter atau pencarian.' : 'Belum ada faktur tagihan.');
    }

    return panel(`<div class="max-h-[55vh] sm:max-h-[62vh] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
        ${filtered.map((inv) => {
            const sisa = Number(inv.sisa_tagihan || 0);
            const pendingVerif = inv.payment_verification_status === 'pending';
            return `
                <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-mono font-bold text-xs text-slate-900 dark:text-white">${esc(inv.nomor_invoice)}</span>
                            ${badge(String(inv.status).replace(/_/g, ' '), tone[inv.status] || 'indigo')}
                            ${pendingVerif ? badge('Menunggu Verifikasi', 'amber') : ''}
                        </div>
                        <div class="text-xs text-slate-500 font-mono">
                            Terbit ${fdate(inv.tanggal_invoice)} · Jatuh tempo <span class="${sisa > 0 ? 'text-rose-600 font-semibold' : ''}">${fdate(inv.tanggal_jatuh_tempo)}</span>
                        </div>
                    </div>
                    <div class="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap">
                        <div class="sm:text-right font-mono tabular-nums mr-1">
                            <div class="text-sm font-bold text-slate-900 dark:text-white">${money(inv.total_tagihan)}</div>
                            <div class="text-[11px] ${sisa > 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600'}">${sisa > 0 ? 'Sisa ' + money(sisa) : 'Lunas'}</div>
                        </div>
                        <button type="button" data-action="inv-pdf" data-token="${esc(inv.public_token || inv.nomor_invoice)}" class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shrink-0">
                            <i class="ri-file-pdf-2-line text-rose-600"></i><span>PDF</span>
                        </button>
                        ${sisa > 0 ? `
                            <button type="button" data-action="inv-pay" data-id="${inv.id}" class="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-primary-600 dark:hover:bg-primary-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition">
                                <i class="ri-bank-card-line"></i>
                                <span>${pendingVerif ? 'Kirim Ulang Bukti' : 'Bayar'}</span>
                            </button>` : ''}
                    </div>
                </div>`;
        }).join('')}
    </div>`);
}

export function renderInvoices(d) {
    const invoices = d.invoices || [];
    const payments = d.payments || [];
    const subTab = state.invoiceSubTab === 'payments' ? 'payments' : 'invoices';
    const filter = state.invoiceFilter || '';
    const unpaidCount = invoices.filter((i) => Number(i.sisa_tagihan || 0) > 0).length;
    const paidCount = invoices.length - unpaidCount;

    const list = renderFilteredInvoiceList(invoices);

    const paymentsHtml = payments.length === 0
        ? empty('Belum ada riwayat pembayaran terverifikasi.')
        : panel(`<div class="max-h-[55vh] sm:max-h-[62vh] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
            ${payments.map((p) => `
                <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="space-y-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-mono font-bold text-xs text-slate-900 dark:text-white">${esc(p.nomor_pembayaran)}</span>
                            ${badge('Terverifikasi', 'green')}
                            ${p.nomor_invoice ? `<span class="text-[11px] font-mono text-slate-500">${esc(p.nomor_invoice)}</span>` : ''}
                        </div>
                        <div class="text-xs text-slate-500">
                            <span class="font-mono">${fdate(p.tanggal_bayar)}</span> · ${esc(p.nama_bank || p.nama_metode || 'Transfer Bank')}
                            ${p.nomor_referensi ? ` · Ref <span class="font-mono">${esc(p.nomor_referensi)}</span>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span class="font-mono tabular-nums font-bold text-sm text-emerald-600 dark:text-emerald-400">${money(p.jumlah_bayar)}</span>
                        <button type="button" data-action="pay-receipt" data-id="${p.id}" class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5">
                            <i class="ri-receipt-line text-emerald-600"></i><span>Kuitansi PDF</span>
                        </button>
                    </div>
                </div>`).join('')}
        </div>`);

    const banks = (d.payment_methods || []).map((b) => `
        <div class="p-4 sm:px-5 flex items-center justify-between gap-3 text-xs">
            <div class="min-w-0">
                <div class="font-bold text-slate-900 dark:text-white truncate">${esc(b.nama_bank || b.nama_metode)}</div>
                <div class="text-[11px] text-slate-500">a.n ${esc(b.atas_nama)}</div>
            </div>
            <button data-action="copy" data-text="${esc(b.nomor_rekening)}" class="shrink-0 font-mono font-bold text-slate-900 dark:text-white hover:text-primary-600 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <span>${esc(b.nomor_rekening)}</span><i class="ri-file-copy-line text-slate-400"></i>
            </button>
        </div>`).join('');

    const deposit = Number(d.client?.saldo_deposit || 0);
    const depositBanner = deposit > 0 ? `
        <div class="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-4 flex items-center justify-between gap-3">
            <div class="text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <i class="ri-wallet-3-line text-base"></i><span>Saldo Deposit / Retainer Perusahaan Anda</span>
            </div>
            <span class="text-base font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300">${money(deposit)}</span>
        </div>` : '';

    return `
        ${depositBanner}
        <div class="grid grid-cols-2 sm:inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800">
            <button type="button" data-action="invoice-subtab" data-val="invoices"
                    class="px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition min-w-0 ${subTab === 'invoices' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
                <i class="ri-file-list-3-line shrink-0"></i>
                <span class="truncate">Faktur Tagihan</span>
                <span class="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-mono ${subTab === 'invoices' ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200' : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400'}">${invoices.length}</span>
            </button>
            <button type="button" data-action="invoice-subtab" data-val="payments"
                    class="px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition min-w-0 ${subTab === 'payments' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
                <i class="ri-receipt-line shrink-0"></i>
                <span class="truncate sm:hidden">Riwayat & Kuitansi</span>
                <span class="hidden sm:inline truncate">Riwayat Pembayaran & Kuitansi Resmi</span>
                <span class="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-mono ${subTab === 'payments' ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200' : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400'}">${payments.length}</span>
            </button>
        </div>

        ${subTab === 'invoices' ? `
            <div class="space-y-3">
                ${sectionTitle('Faktur Tagihan', `<span class="text-[11px] font-mono text-slate-400">${invoices.length} dokumen</span>`)}
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        ${[
                            { k: '', l: `Semua (${invoices.length})` },
                            { k: 'unpaid', l: `Belum Lunas (${unpaidCount})` },
                            { k: 'paid', l: `Lunas (${paidCount})` }
                        ].map((f) => `
                            <button type="button" data-action="invoice-filter" data-val="${f.k}" class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === f.k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}">
                                ${f.l}
                            </button>`).join('')}
                    </div>
                    <div class="relative w-full sm:w-60">
                        <i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input type="text" id="portal-invoice-search" value="${esc(state.invoiceSearch || '')}" placeholder="Cari nomor faktur..."
                               class="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600">
                    </div>
                </div>
                <div id="portal-invoice-list-wrap">${list}</div>
            </div>
            ${banks ? `<div class="space-y-3">${sectionTitle('Rekening Pembayaran Resmi')}${panel(`<div class="divide-y divide-slate-200 dark:divide-slate-800">${banks}</div>`)}</div>` : ''}
        ` : `
            <div class="space-y-3">
                ${sectionTitle('Riwayat Pembayaran & Kuitansi Resmi', `<span class="text-[11px] font-mono text-slate-400">${payments.length} transaksi</span>`)}
                ${paymentsHtml}
            </div>
        `}`;
}

export async function openPayInvoiceModal(id) {
    const inv = (state.data?.invoices || []).find((x) => Number(x.id) === Number(id));
    if (!inv) return;

    const banks = state.data?.payment_methods || [];
    let items = [];
    if (inv.public_token || inv.nomor_invoice) {
        const res = await api(`public-invoice?token=${encodeURIComponent(inv.public_token || inv.nomor_invoice)}`, { silent: true });
        if (res?.success && Array.isArray(res.data?.items)) items = res.data.items;
    }

    let proofBase64 = '';

    openModal(`
        <div class="p-5 sm:p-6 space-y-5">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <div class="text-[11px] font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">Pembayaran Faktur</div>
                    <h3 class="text-base font-bold text-slate-900 dark:text-white mt-0.5">${esc(inv.nomor_invoice)}</h3>
                    <p class="text-xs text-slate-500 mt-0.5">Jatuh tempo ${fdate(inv.tanggal_jatuh_tempo)}</p>
                </div>
                <button type="button" data-action="close-modal" class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 flex items-center justify-center">
                    <i class="ri-close-line"></i>
                </button>
            </div>

            <div class="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 p-4 flex items-center justify-between gap-3">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">Sisa yang harus dibayar</span>
                <span class="text-lg font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">${money(inv.sisa_tagihan)}</span>
            </div>

            ${items.length ? `
                <div class="space-y-1.5">
                    <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rincian Tagihan</div>
                    <div class="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-xs max-h-40 overflow-y-auto">
                        ${items.map((it) => `
                            <div class="px-3.5 py-2.5 flex items-center justify-between gap-2">
                                <div class="min-w-0">
                                    <div class="font-medium text-slate-800 dark:text-slate-200 truncate">${esc(it.deskripsi)}</div>
                                    <div class="text-[11px] text-slate-400 font-mono">${esc(it.kuantitas)} ${esc(it.satuan || 'unit')} × ${money(it.harga_satuan)}</div>
                                </div>
                                <div class="font-mono font-semibold text-slate-900 dark:text-white shrink-0">${money(it.subtotal)}</div>
                            </div>`).join('')}
                    </div>
                </div>` : ''}

            ${banks.length ? `
                <div class="space-y-1.5">
                    <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Transfer ke Rekening Resmi</div>
                    <div class="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
                        ${banks.map((b) => `
                            <div class="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                                <div class="min-w-0">
                                    <div class="font-bold text-slate-900 dark:text-white truncate">${esc(b.nama_bank || b.nama_metode)}</div>
                                    <div class="text-[11px] text-slate-500">a.n ${esc(b.atas_nama)}</div>
                                </div>
                                <button type="button" data-action="copy" data-text="${esc(b.nomor_rekening)}" class="font-mono font-bold text-primary-600 hover:underline flex items-center gap-1 shrink-0">
                                    <span>${esc(b.nomor_rekening)}</span><i class="ri-file-copy-line"></i>
                                </button>
                            </div>`).join('')}
                    </div>
                </div>` : ''}

            <form id="portal-proof-form" class="space-y-3 pt-1 border-t border-slate-200 dark:border-slate-800">
                <div>
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Unggah Bukti Transfer (JPG, PNG, PDF · Maks 5 MB)</label>
                    <input id="proof-file-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required
                           class="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 dark:file:bg-primary-600 cursor-pointer border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 bg-white dark:bg-slate-900">
                    <div id="proof-preview-box" class="hidden mt-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"></div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan Pembayaran (Opsional)</label>
                    <input id="proof-note-input" type="text" placeholder="Contoh: Transfer BCA a.n Budi tanggal hari ini"
                           class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs">
                </div>
                <div class="flex items-center justify-end gap-2 pt-2">
                    <button type="button" data-action="close-modal" class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">Batal</button>
                    <button id="proof-submit-btn" type="submit" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5">
                        <i class="ri-upload-cloud-2-line"></i><span>Kirim Bukti Pembayaran</span>
                    </button>
                </div>
            </form>
        </div>
    `, { sheet: true, wide: true });

    $('#proof-file-input')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        const previewBox = $('#proof-preview-box');
        if (!file) { proofBase64 = ''; previewBox?.classList.add('hidden'); return; }
        if (file.size > 5 * 1024 * 1024) {
            toast('Ukuran file maksimal 5 MB', 'error');
            e.target.value = '';
            proofBase64 = '';
            previewBox?.classList.add('hidden');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            proofBase64 = String(reader.result || '');
            if (previewBox) {
                previewBox.classList.remove('hidden');
                previewBox.innerHTML = file.type === 'application/pdf'
                    ? `<div class="flex items-center gap-2 font-medium"><i class="ri-file-pdf-2-line text-rose-600 text-base"></i><span>${esc(file.name)} (${Math.round(file.size / 1024)} KB)</span></div>`
                    : `<img src="${proofBase64}" alt="Pratinjau bukti" class="max-h-40 rounded-lg object-contain mx-auto">`;
            }
        };
        reader.readAsDataURL(file);
    });

    $('#portal-proof-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!proofBase64) { toast('Pilih file bukti pembayaran terlebih dahulu', 'error'); return; }
        const btn = $('#proof-submit-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i><span>Mengirim…</span>'; }
        const res = await api('portal-auth/upload-proof', {
            method: 'POST',
            body: {
                invoice_id: inv.id,
                bukti_base64: proofBase64,
                catatan: $('#proof-note-input')?.value?.trim() || ''
            }
        });
        if (res?.success) {
            toast(res.message || 'Bukti pembayaran berhasil dikirim', 'success');
            closeModal();
            hooks.reloadData({ silent: true });
        } else if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="ri-upload-cloud-2-line"></i><span>Kirim Bukti Pembayaran</span>';
        }
    });
}

export async function previewInvoicePdf(token) {
    if (!token) return;
    toast('Menyiapkan dokumen PDF…', 'info');
    const res = await api(`public-invoice?token=${encodeURIComponent(token)}`);
    if (!res?.success || !res.data) return;
    try {
        const inv = { ...res.data, company: res.data.company || state.data?.company || {} };
        const out = await generateInvoicePdf(inv, 'bloburl');
        openPdfPreviewModal(inv.nomor_invoice || 'Faktur', out.blobUrl || out.url, out.filename);
    } catch (err) {
        toast(err?.message || 'Gagal membuat PDF faktur', 'error');
    }
}

export async function previewPaymentReceiptPdf(id) {
    const p = (state.data?.payments || []).find((x) => Number(x.id) === Number(id));
    if (!p) return;
    toast('Menyiapkan kuitansi PDF…', 'info');
    try {
        const payload = { ...p, company: state.data?.company || {} };
        const out = await generatePaymentReceiptPdf(payload, 'bloburl');
        openPdfPreviewModal(p.nomor_pembayaran || 'Kuitansi', out.blobUrl || out.url, out.filename);
    } catch (err) {
        toast(err?.message || 'Gagal membuat PDF kuitansi', 'error');
    }
}
