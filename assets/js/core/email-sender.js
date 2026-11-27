// assets/js/core/email-sender.js — Dialog & Helper Terpadu Kirim Email (dengan CC & Lampiran PDF)
import { App } from '../app.js';

export async function blobToBase64(blob) {
    if (!blob) return '';
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
        reader.onerror = () => reject(new Error('Gagal membaca blob PDF'));
        reader.readAsDataURL(blob);
    });
}

export async function promptSendEmail({
    title = 'Kirim via Email?',
    text = 'Dokumen PDF resmi akan dikirimkan ke email klien via SMTP.',
    defaultCc = '',
    endpoint = '',
    buildPdf = null,
    onSuccess = null
} = {}) {
    let ccValue = defaultCc || '';
    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title,
            html: `
                <p class="text-xs text-slate-500 mb-3">${App.escapeHtml(text)}</p>
                <div class="text-left">
                    <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">CC Email (Opsional, pisahkan dengan koma)</label>
                    <input id="swal-cc-email" type="text" value="${App.escapeHtml(defaultCc || '')}" placeholder="finance@klien.com, pic@klien.com"
                           class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Kirim Email',
            cancelButtonText: 'Batal',
            preConfirm: () => document.getElementById('swal-cc-email')?.value.trim() || ''
        });
        if (!result.isConfirmed) return false;
        ccValue = result.value || '';
    } else if (!await App.confirm(title, text)) {
        return false;
    }

    App.toast('Menyiapkan PDF & mengirim email...', 'info');
    let payload = {};
    if (typeof buildPdf === 'function') {
        try {
            const pdfRes = await buildPdf();
            if (pdfRes?.blob) {
                const pdfBase64 = await blobToBase64(pdfRes.blob);
                if (pdfRes.blobUrl) URL.revokeObjectURL(pdfRes.blobUrl);
                if (pdfBase64) {
                    payload.pdf_base64 = pdfBase64;
                    payload.pdf_filename = pdfRes.filename;
                }
            }
        } catch (err) {
            console.warn('Gagal menyiapkan lampiran PDF:', err);
        }
    }
    if (ccValue) payload.cc_email = ccValue;

    const res = await App.api(endpoint, { method: 'POST', body: payload });
    if (res && res.success) {
        App.toast(res.message, 'success');
        if (typeof onSuccess === 'function') onSuccess(res);
        return true;
    }
    return false;
}
