// assets/js/core/quotation-actions.js — Aksi status, PDF, Word, email, WA, & konversi SPH
import { App } from '../app.js';

export function registerQuotationActions({ getOpenEditor, getLoadQuotations, getState }) {
window.editQuotation = async (id) => {
    const res = await App.api(`quotations/${id}`);
    if (res && res.success && res.data) {
        getOpenEditor()(res.data);
    }
};

window.updateQuotationStatus = async (id, status) => {
    const res = await App.api(`quotations/${id}/status`, {
        method: 'POST',
        body: { status }
    });
    if (res && res.success) {
        App.toast(res.message, 'success');
        await getLoadQuotations()();
    }
};

window.printQuotationPdf = async (id, output = 'bloburl') => {
    try {
        const res = await App.api(`quotations/${id}`);
        if (!res || !res.success) {
            App.toast('Gagal memuat penawaran harga', 'error');
            return;
        }
        const quo = res.data;
        const pdfRes = await App.generateQuotationPdf(quo, output);
        if (output === 'bloburl' && pdfRes?.blobUrl) {
            App.openPdfModal({
                title: `Surat Penawaran — ${quo.nomor_penawaran}`,
                filename: pdfRes.filename,
                blobUrl: pdfRes.blobUrl,
                onEdit: quo.status !== 'dikonversi' ? () => window.editQuotation(quo.id) : null,
                editLabel: 'Edit Naskah & Nilai',
                downloadWordFn: () => App.downloadQuotationWord(quo),
                wordLabel: 'Unduh Format Word (.doc / Editable)'
            });
        } else if (output === 'download') {
            App.toast('Dokumen PDF penawaran berhasil diunduh', 'success');
        }
    } catch (err) {
        App.toast(err?.message || 'Gagal membuat dokumen penawaran PDF', 'error');
    }
};

window.downloadQuotationWordDoc = async (id) => {
    try {
        const res = await App.api(`quotations/${id}`);
        if (res && res.success && res.data) {
            App.downloadQuotationWord(res.data);
        } else {
            App.toast('Gagal memuat data penawaran', 'error');
        }
    } catch (err) {
        App.toast(err?.message || 'Gagal mengunduh dokumen Word', 'error');
    }
};

window.sendQuotationWA = async (id) => {
    const res = await App.api(`quotations/${id}`);
    if (res && res.success) {
        App.openWhatsAppQuotation(res.data);
    }
};

window.sendQuotationEmail = async (id) => {
    const detailRes = await App.api(`quotations/${id}`);
    const quoData = detailRes?.success ? detailRes.data : null;
    const { promptSendEmail } = await import('../core/email-sender.js');
    await promptSendEmail({
        title: `Kirim Penawaran ${quoData?.nomor_penawaran || ''} via Email?`,
        text: 'Surat penawaran PDF beserta tautan E-Sign akan dikirimkan ke email klien via SMTP.',
        defaultCc: quoData?.client_cc_email || '',
        endpoint: `quotations/${id}/send-email`,
        buildPdf: () => (quoData && typeof App.generateQuotationPdf === 'function') ? App.generateQuotationPdf(quoData, 'bloburl') : null,
        onSuccess: () => getLoadQuotations()()
    });
};

window.convertQuotationToInvoice = async (id, no) => {
    const conf = await App.confirm(
        'Konversi Penawaran ke Faktur',
        `Apakah Anda yakin ingin mengonversi penawaran "${no}" menjadi Faktur Tagihan resmi? Faktur baru akan otomatis diterbitkan.`
    );
    if (!conf) return;

    const res = await App.api(`quotations/${id}/convert`, { method: 'POST' });
    if (res && res.success) {
        const ok = await App.confirm(
            'Faktur Berhasil Diterbitkan!',
            `${res.message}\nNomor Faktur: ${res.data.nomor_invoice}. Apakah Anda ingin langsung melihat daftar Faktur Tagihan?`
        );
        if (ok) window.location.hash = '#/invoices';
        else await getLoadQuotations()();
    }
};

window.deleteQuotation = async (id, no) => {
    const conf = await App.confirm('Hapus Penawaran', `Apakah Anda yakin ingin menghapus surat penawaran "${no}"?`);
    if (!conf) return;

    const res = await App.api(`quotations/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        await getLoadQuotations()();
    }
};

window.changeQuoPage = (p) => {
    getState().page = p;
    getLoadQuotations()();
};

window.openPublicQuotation = (token) => {
    window.open(`#/public-quotation?token=${encodeURIComponent(token)}`, '_blank');
};

window.copyPublicQuotationLink = (token) => {
    const baseUrl = window.location.href.split('#')[0];
    const fullUrl = `${baseUrl}#/public-quotation?token=${encodeURIComponent(token)}`;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(fullUrl).then(() => {
            App.toast('Tautan persetujuan & e-sign berhasil disalin ke clipboard!', 'success');
        });
    } else {
        App.toast('Tautan: ' + fullUrl, 'info');
    }
};

window.createContractFromQuotation = async (quotationId) => {
    const ok = await App.confirmAction('Buat SPK Digital?', 'Sistem akan membuat dokumen Kontrak Kerja (SPK) dengan pasal standar dan mengirimkannya ke Portal Klien.');
    if (!ok) return;
    const res = await App.api('contracts/from-quotation', {
        method: 'POST',
        body: { quotation_id: quotationId }
    });
    if (res?.success) {
        App.toast(res.message || 'SPK berhasil dibuat', 'success');
    }
};

}
