// assets/js/core/invoice-actions.js — Aksi drawer, cetak PDF, email, WA, & ekspor Faktur
import { App } from '../app.js';

export function registerInvoiceActions({ getLoadInvoices, getState }) {
window.viewInvoiceSheet = async (id) => {
    const res = await App.api(`invoices/${id}`);
    if (!res || !res.success) return;

    const inv = res.data;
    const c = inv.company || {};
    const content = document.getElementById('invoice-sheet-content');

    // Bind PDF buttons
    const prevPdfBtn = document.getElementById('btn-view-preview-pdf');
    if (prevPdfBtn) {
        prevPdfBtn.onclick = () => window.printInvoicePdf(id, 'bloburl');
    }
    const downPdfBtn = document.getElementById('btn-view-download-pdf');
    if (downPdfBtn) {
        downPdfBtn.onclick = () => window.printInvoicePdf(id, 'download');
    }

    // Bind send email button
    const sendBtn = document.getElementById('btn-view-send-email');
    if (sendBtn) {
        sendBtn.onclick = async () => {
            sendBtn.disabled = true;
            sendBtn.innerHTML = `<i class="ri-loader-4-line animate-spin"></i> Menyiapkan PDF...`;
            const payload = await buildInvoiceEmailPayload(inv);
            sendBtn.innerHTML = `<i class="ri-loader-4-line animate-spin"></i> Mengirimkan...`;
            const sRes = await App.api(`invoices/${id}/send-email`, { method: 'POST', body: payload });
            sendBtn.disabled = false;
            sendBtn.innerHTML = `<i class="ri-mail-send-line text-sm"></i><span>Kirim ke Email Klien</span>`;
            if (sRes && sRes.success) {
                App.toast(sRes.message, 'success');
                getLoadInvoices()();
            }
        };
    }

    // Bind WA reminder & Public Link
    const waBtn = document.getElementById('btn-view-send-wa');
    if (waBtn) {
        waBtn.onclick = () => App.openWhatsAppInvoiceReminder(inv);
    }
    const openPortalBtn = document.getElementById('btn-view-open-portal');
    if (openPortalBtn) {
        openPortalBtn.onclick = () => {
            document.getElementById('invoice-view-modal').classList.add('hidden');
            window.openPublicPortal(inv.public_token || inv.nomor_invoice);
        };
    }
    const copyLinkBtn = document.getElementById('btn-view-copy-link');
    if (copyLinkBtn) {
        copyLinkBtn.onclick = () => window.copyPublicPortalLink(inv.public_token || inv.nomor_invoice);
    }

    content.innerHTML = `
        <div class="space-y-8 text-slate-900 font-sans">
            <!-- Header: Company & Invoice Label -->
            <div class="flex items-start justify-between pb-8 border-b-2 border-slate-900">
                <div class="space-y-3">
                    <img src="assets/images/logo.png" alt="CRUDWorks Logo" class="h-10 w-auto object-contain" />
                    <div>
                        <h2 class="text-base font-extrabold tracking-tight text-slate-900">${c.company_name || 'CRUDWorks Media Tama'}</h2>
                        <div class="text-xs text-slate-500">${c.company_address || 'Jl. Rasuna Said Kav. B4, Jakarta Selatan'}</div>
                        <div class="text-xs text-slate-500">Email: ${c.company_email || 'billing@crudworks.com'} | Telp: ${c.company_phone || '(021) 555-0199'}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-3xl font-black tracking-tight uppercase text-primary-600">INVOICE</div>
                    <div class="text-sm font-bold font-mono text-slate-900 mt-1">${inv.nomor_invoice}</div>
                    <div class="text-xs text-slate-500 mt-1">Status: <span class="font-bold uppercase tracking-wider ${inv.status === 'lunas' ? 'text-emerald-600' : 'text-rose-600'}">${inv.status}</span></div>
                </div>
            </div>

            <!-- Client & Date Details -->
            <div class="grid grid-cols-2 gap-8 text-xs">
                <div>
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Ditagihkan Kepada:</div>
                    <div class="text-sm font-extrabold text-slate-900">${inv.nama_perusahaan}</div>
                    <div class="text-slate-600 font-medium">UP: ${inv.penanggung_jawab}</div>
                    <div class="text-slate-500">${inv.client_alamat || '-'}, ${inv.client_kota || ''}</div>
                    <div class="text-slate-500">Email: ${inv.client_email} | Telp: ${inv.client_telepon}</div>
                    ${inv.client_npwp ? `<div class="text-slate-500 font-mono mt-1">NPWP: ${inv.client_npwp}</div>` : ''}
                </div>
                <div class="text-right space-y-1.5 font-mono">
                    <div class="text-slate-500"><span class="text-slate-400">Tanggal Faktur:</span> <b>${App.formatDate(inv.tanggal_invoice)}</b></div>
                    <div class="text-slate-500"><span class="text-slate-400">Jatuh Tempo:</span> <b class="text-rose-600">${App.formatDate(inv.tanggal_jatuh_tempo)}</b></div>
                    ${inv.nama_project ? `<div class="text-slate-500"><span class="text-slate-400">Proyek:</span> <b>${inv.nama_project}</b></div>` : ''}
                </div>
            </div>

            <!-- Items Table -->
            <div class="border border-slate-200 rounded-2xl overflow-hidden">
                <table class="w-full text-left text-xs border-collapse">
                    <thead class="bg-slate-100 font-bold uppercase text-slate-600 border-b border-slate-200">
                        <tr>
                            <th class="py-3 px-4">Deskripsi Layanan</th>
                            <th class="py-3 px-4 text-center w-20">Qty</th>
                            <th class="py-3 px-4 text-right w-36">Harga Satuan</th>
                            <th class="py-3 px-4 text-right w-36">Total</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${inv.items.map(it => `
                            <tr>
                                <td class="py-3 px-4">
                                    <div class="font-bold text-slate-900">${it.deskripsi}</div>
                                </td>
                                <td class="py-3 px-4 text-center font-mono">${it.kuantitas}</td>
                                <td class="py-3 px-4 text-right font-mono">${App.formatIDR(it.harga_satuan)}</td>
                                <td class="py-3 px-4 text-right font-mono font-bold text-slate-900">${App.formatIDR(it.total_harga)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Calculation & Bank Instructions -->
            <div class="grid grid-cols-2 gap-8 pt-4">
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                    <div class="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Instruksi Pembayaran Bank</div>
                    <p class="text-slate-600 leading-relaxed">${inv.catatan_klien || c.invoice_footer_notes || 'Harap lakukan pembayaran penuh sebelum tanggal jatuh tempo.'}</p>
                    <div class="pt-2 border-t border-slate-200 space-y-1.5">
                        ${(inv.payment_methods || []).map(pm => `
                            <div class="text-slate-700 flex items-center justify-between text-[11px] py-1 border-b border-slate-200/60 last:border-0">
                                <div>
                                    <div class="font-bold flex items-center gap-1.5">
                                        <span>${pm.nama_bank || pm.nama_metode}</span>
                                        ${pm.is_default ? '<span class="text-[9px] bg-primary-100 text-primary-700 font-bold px-1.5 py-0.2 rounded">UTAMA</span>' : ''}
                                    </div>
                                    <div class="text-slate-500 text-[10px]">${pm.cabang ? `KCU/KCP ${pm.cabang}` : ''}</div>
                                </div>
                                <div class="text-right">
                                    <div class="font-mono font-bold text-slate-900">${pm.nomor_rekening || '-'}</div>
                                    <div class="text-slate-500 text-[10px]">a.n ${pm.atas_nama}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="space-y-2 text-xs font-semibold">
                    <div class="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span class="font-mono">${App.formatIDR(inv.subtotal)}</span>
                    </div>
                    ${Number(inv.diskon_nilai) > 0 ? `
                        <div class="flex justify-between text-slate-600">
                            <span>Diskon:</span>
                            <span class="font-mono">-${App.formatIDR(inv.diskon_nilai)}</span>
                        </div>
                    ` : ''}
                    <div class="flex justify-between text-slate-600">
                        <span>PPN (${inv.pajak_persen}%):</span>
                        <span class="font-mono">${App.formatIDR(inv.pajak_nominal)}</span>
                    </div>
                    <div class="pt-2 border-t-2 border-slate-900 flex justify-between text-sm font-black text-slate-900">
                        <span>Total Tagihan:</span>
                        <span class="font-mono text-primary-600">${App.formatIDR(inv.total_tagihan)}</span>
                    </div>
                    <div class="flex justify-between text-emerald-600">
                        <span>Total Dibayar:</span>
                        <span class="font-mono">${App.formatIDR(inv.total_dibayar)}</span>
                    </div>
                    <div class="pt-1 flex justify-between text-sm font-black ${Number(inv.sisa_tagihan) > 0 ? 'text-rose-600' : 'text-slate-900'}">
                        <span>Sisa Kewajiban:</span>
                        <span class="font-mono">${App.formatIDR(inv.sisa_tagihan)}</span>
                    </div>
                </div>
            </div>

            <!-- Electronic document footer -->
            <div class="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span>Diterbitkan secara elektronik oleh <strong class="text-slate-700">${c.company_name || 'CRUDWorks Media Tama'}</strong></span>
                <span class="italic">Sah secara komputerisasi tanpa tanda tangan basah / paraf.</span>
            </div>
        </div>
    `;

    document.getElementById('invoice-view-modal').classList.remove('hidden');
};

window.recordPaymentDirect = (invId, invNo, sisa) => {
    window.location.hash = `#/payments?invoice_id=${invId}&amount=${sisa}`;
};

window.deleteInvoice = async (id, no) => {
    const conf = await App.confirm('Batalkan / Hapus Faktur', `Apakah Anda yakin ingin membatalkan faktur "${no}"?`);
    if (!conf) return;

    const res = await App.api(`invoices/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        getLoadInvoices()();
    }
};

window.printInvoicePdf = async (id, output = 'bloburl') => {
    try {
        const res = await App.api(`invoices/${id}`);
        if (!res || !res.success) {
            App.toast('Gagal memuat data faktur untuk dicetak', 'error');
            return;
        }
        const inv = res.data;
        const pdfRes = await App.generateInvoicePdf(inv, output);
        if (output === 'bloburl' && pdfRes?.blobUrl) {
            App.openPdfModal({
                title: `Faktur Tagihan — ${inv.nomor_invoice}`,
                filename: pdfRes.filename,
                blobUrl: pdfRes.blobUrl
            });
        } else {
            App.toast('Dokumen PDF faktur berhasil diunduh', 'success');
        }
    } catch (err) {
        App.toast(err?.message || 'Gagal membuat dokumen PDF faktur', 'error');
    }
};

window.changeInvoicePage = (p) => {
    getState().page = p;
    getLoadInvoices()();
};

async function buildInvoiceEmailPayload(inv) {
    if (!inv || typeof App.generateInvoicePdf !== 'function') return {};
    try {
        const pdfRes = await App.generateInvoicePdf(inv, 'bloburl');
        if (!pdfRes?.blob) return {};
        const pdfBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
            reader.onerror = () => reject(new Error('Gagal membaca blob PDF'));
            reader.readAsDataURL(pdfRes.blob);
        });
        if (pdfRes.blobUrl) URL.revokeObjectURL(pdfRes.blobUrl);
        return pdfBase64 ? { pdf_base64: pdfBase64, pdf_filename: pdfRes.filename } : {};
    } catch (err) {
        console.warn('Gagal menyiapkan lampiran PDF faktur:', err);
        return {};
    }
}

window.sendInvoiceEmail = async (id) => {
    const detailRes = await App.api(`invoices/${id}`);
    const invData = detailRes?.success ? detailRes.data : null;
    const { promptSendEmail } = await import('../core/email-sender.js');
    await promptSendEmail({
        title: `Kirim Faktur ${invData?.nomor_invoice || ''} via Email?`,
        text: 'Faktur tagihan PDF beserta tautan pembayaran online akan dikirimkan ke email klien via SMTP.',
        defaultCc: invData?.client_cc_email || '',
        endpoint: `invoices/${id}/send-email`,
        buildPdf: () => (invData && typeof App.generateInvoicePdf === 'function') ? App.generateInvoicePdf(invData, 'bloburl') : null,
        onSuccess: () => getLoadInvoices()()
    });
};

window.sendInvoiceWA = async (id) => {
    try {
        const res = await App.api(`invoices/${id}`);
        if (!res || !res.success) {
            App.toast('Gagal memuat detail tagihan untuk WhatsApp', 'error');
            return;
        }
        App.openWhatsAppInvoiceReminder(res.data);
        App.api(`invoices/${id}/log-send`, { method: 'POST', body: { via: 'whatsapp' }, silent: true }).then(() => getLoadInvoices()());
    } catch (err) {
        App.toast('Gagal membuka WhatsApp: ' + err.message, 'error');
    }
};

document.addEventListener('click', async (e) => {
    const btn = e.target?.closest('#btn-export-invoices-csv');
    if (!btn) return;
    let ep = `invoices?page=1&per_page=100`;
    if (getState().search) ep += `&search=${encodeURIComponent(getState().search)}`;
    if (getState().status) ep += `&status=${encodeURIComponent(getState().status)}`;
    if (getState().clientId) ep += `&client_id=${encodeURIComponent(getState().clientId)}`;
    const res = await App.api(ep);
    const rows = res?.data || [];
    if (rows.length === 0) {
        App.toast('Tidak ada data faktur untuk diekspor', 'warning');
        return;
    }
    App.exportCsv(
        `rekap-faktur-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Nomor Faktur', 'Tanggal Terbit', 'Jatuh Tempo', 'Pelanggan', 'Proyek', 'Total Tagihan', 'Sisa Tagihan', 'Status', 'Terakhir Dikirim'],
        rows.map((r) => [r.nomor_invoice, r.tanggal_invoice, r.tanggal_jatuh_tempo, r.client_nama, r.nama_project || '-', r.total_tagihan, r.sisa_tagihan, r.status, r.last_sent_at ? `${r.last_sent_via} (${r.last_sent_at})` : '-'])
    );
    App.toast(`Berhasil mengekspor ${rows.length} faktur ke CSV`, 'success');
});

window.openPublicPortal = (token) => {
    if (!token) {
        App.toast('Token akses portal publik belum tersedia untuk faktur ini', 'warning');
        return;
    }
    window.location.hash = `#/public-invoice?token=${encodeURIComponent(token)}`;
};

window.copyPublicPortalLink = (token) => {
    if (!token) {
        App.toast('Token akses portal publik belum tersedia untuk faktur ini', 'warning');
        return;
    }
    const baseUrl = window.location.href.split('#')[0];
    const url = `${baseUrl}#/public-invoice?token=${encodeURIComponent(token)}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            App.toast('Tautan portal tagihan publik berhasil disalin ke clipboard!', 'success');
        }).catch(() => {
            prompt('Salin tautan portal publik pelanggan berikut:', url);
        });
    } else {
        prompt('Salin tautan portal publik pelanggan berikut:', url);
    }
};

}
