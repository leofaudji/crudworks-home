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
    const ccResult = await App.prompt({
        title,
        text,
        icon: 'question',
        label: 'CC Email (Opsional, pisahkan dengan koma)',
        placeholder: 'finance@klien.com, pic@klien.com',
        value: defaultCc || '',
        required: false,
        confirmBtnText: 'Kirim Email',
        cancelBtnText: 'Batal'
    });
    if (ccResult === null) return false;
    const ccValue = ccResult;

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
