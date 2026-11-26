// ============================================
// WHATSAPP MESSAGING & TEMPLATE HELPERS
// ============================================
import { formatDate, formatRupiah } from './utils.js';

function _safeFormatIDR(val) {
    return formatRupiah(val);
}

function _safeFormatDate(val) {
    return formatDate(val);
}

function _fillWhatsAppTemplate(template, vars) {
    let out = String(template || '');
    Object.entries(vars || {}).forEach(([k, v]) => {
        out = out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi'), v ?? '');
    });
    return out;
}

export function formatWhatsAppPhone(phone) {
    let waPhone = String(phone || '').replace(/[^0-9]/g, '');
    if (waPhone.startsWith('0')) {
        waPhone = '62' + waPhone.slice(1);
    }
    return waPhone;
}

export function openWhatsApp(phone, message = '') {
    const waPhone = formatWhatsAppPhone(phone);
    const query = message ? `?text=${encodeURIComponent(message)}` : '';
    const url = waPhone ? `https://wa.me/${waPhone}${query}` : `https://wa.me/${query}`;
    window.open(url, '_blank', 'noopener');
}

export function openWhatsAppInvoiceReminder(inv) {
    const companyName = window.App?.getSetting?.('company_name', 'PT CRUDWorks Media Tama') || 'PT CRUDWorks Media Tama';
    const invoiceNo = inv.nomor_invoice || 'Invoice';
    const totalTagihan = _safeFormatIDR(inv.sisa_tagihan || inv.total_tagihan || 0);
    const jatuhTempo = _safeFormatDate(inv.tanggal_jatuh_tempo);
    const baseUrl = window.location.href.split('#')[0];
    const publicUrl = `${baseUrl}#/public-invoice?token=${encodeURIComponent(inv.public_token || inv.nomor_invoice || '')}`;

    const bank = (inv.payment_methods || []).find(b => b.is_default) || (inv.payment_methods || [])[0] || {};
    const bankInfo = bank.nama_bank ? `${bank.nama_bank} No. Rek: ${bank.nomor_rekening} a.n ${bank.atas_nama}` : 'BCA No. Rek: 8720192831 a.n PT CRUDWorks Media Tama';

    const customTmpl = window.App?.settings?.wa_template_invoice;
    let text = '';
    if (customTmpl && customTmpl.trim()) {
        text = _fillWhatsAppTemplate(customTmpl, {
            nama_pic: inv.penanggung_jawab || inv.client_pic || 'Pelanggan',
            nama_perusahaan: inv.nama_perusahaan || '',
            nomor_invoice: invoiceNo,
            nama_proyek: inv.nama_project || 'Layanan TI & Solusi Perangkat Lunak',
            total_tagihan: totalTagihan,
            jatuh_tempo: jatuhTempo,
            info_bank: bankInfo,
            tautan_faktur: publicUrl,
            nama_instansi: companyName
        });
    } else {
        text = `Halo Bapak/Ibu ${inv.penanggung_jawab || inv.client_pic || 'Pelanggan'} (${inv.nama_perusahaan || ''}),\n\n`
            + `Semoga Bapak/Ibu dalam keadaan sehat. Kami dari bagian Keuangan *${companyName}* menginformasikan mengenai faktur tagihan berikut:\n\n`
            + `📄 *No. Faktur*: ${invoiceNo}\n`
            + `💼 *Proyek*: ${inv.nama_project || 'Pengembangan Perangkat Lunak'}\n`
            + `💰 *Total Kewajiban*: *${totalTagihan}*\n`
            + `📅 *Jatuh Tempo*: ${jatuhTempo}\n\n`
            + `Pembayaran dapat ditransfer ke rekening resmi kami:\n`
            + `🏦 *${bankInfo}*\n\n`
            + `Rincian lengkap dan konfirmasi bukti transfer dapat diakses melalui tautan resmi:\n`
            + `🔗 ${publicUrl}\n\n`
            + `Jika pembayaran telah dilakukan, mohon abaikan pesan ini. Terima kasih atas kerja sama yang baik.\n\n`
            + `Salam hormat,\n*Bagian Billing & Finansial ${companyName}*`;
    }

    openWhatsApp(inv.client_telepon || inv.telepon || '', text);
}

export function openWhatsAppReceipt(pay, inv) {
    const companyName = window.App?.getSetting?.('company_name', 'PT CRUDWorks Media Tama') || 'PT CRUDWorks Media Tama';
    const invoiceNo = inv?.nomor_invoice || pay?.nomor_invoice || 'Invoice';
    const receiptNo = pay?.nomor_kuitansi || pay?.nomor_transaksi || pay?.nomor_pembayaran || `KW-${pay?.id || '001'}`;
    const nominal = _safeFormatIDR(pay?.jumlah_bayar || 0);
    const tanggalBayar = _safeFormatDate(pay?.tanggal_bayar || new Date().toISOString());
    const baseUrl = window.location.href.split('#')[0];
    const publicUrl = `${baseUrl}#/public-invoice?token=${encodeURIComponent(inv?.public_token || invoiceNo)}`;

    const customTmpl = window.App?.settings?.wa_template_receipt;
    let text = '';
    if (customTmpl && customTmpl.trim()) {
        text = _fillWhatsAppTemplate(customTmpl, {
            nama_pic: inv?.penanggung_jawab || 'Pelanggan',
            nama_perusahaan: inv?.nama_perusahaan || '',
            nomor_invoice: invoiceNo,
            nomor_kuitansi: receiptNo,
            nominal_bayar: nominal,
            tanggal_bayar: tanggalBayar,
            nama_proyek: inv?.nama_project || 'Layanan Digital',
            tautan_kuitansi: publicUrl,
            nama_instansi: companyName
        });
    } else {
        text = `Halo Bapak/Ibu ${inv?.penanggung_jawab || 'Pelanggan'} (${inv?.nama_perusahaan || ''}),\n\n`
            + `Kuitansi Pembayaran Sah: Pembayaran tagihan *${invoiceNo}* sebesar *${nominal}* telah kami terima dan diverifikasi lunas.\n\n`
            + `📄 *No. Kuitansi*: ${receiptNo}\n`
            + `📅 *Tanggal Terima*: ${tanggalBayar}\n`
            + `💼 *Proyek*: ${inv?.nama_project || 'Pengembangan Sistem'}\n\n`
            + `🔗 *Akses Kuitansi Resmi & Riwayat Faktur*:\n${publicUrl}\n\n`
            + `Terima kasih atas kerja sama dan pembayaran tepat waktu. Sukses selalu untuk bisnis Bapak/Ibu!\n\n`
            + `Salam hormat,\n*Kasir Finansial ${companyName}*`;
    }

    openWhatsApp(inv?.client_telepon || pay?.client_telepon || '', text);
}

export function openWhatsAppQuotation(quo) {
    const companyName = window.App?.getSetting?.('company_name', 'PT CRUDWorks Media Tama') || 'PT CRUDWorks Media Tama';
    const quoNo = quo.nomor_penawaran || 'Penawaran';
    const total = _safeFormatIDR(quo.total_penawaran || 0);
    const berlakuHingga = _safeFormatDate(quo.berlaku_hingga);
    const baseUrl = window.location.href.split('#')[0];
    const publicUrl = `${baseUrl}#/public-quotation?token=${encodeURIComponent(quo.public_token || quo.nomor_penawaran || '')}`;

    const customTmpl = window.App?.settings?.wa_template_quotation;
    let text = '';
    if (customTmpl && customTmpl.trim()) {
        text = _fillWhatsAppTemplate(customTmpl, {
            nama_pic: quo.penanggung_jawab || 'Bapak/Ibu',
            nama_perusahaan: quo.nama_perusahaan || '',
            nomor_penawaran: quoNo,
            nama_proyek: quo.nama_project || 'Solusi Sistem Digital',
            total_penawaran: total,
            berlaku_hingga: berlakuHingga,
            tautan_penawaran: publicUrl,
            nama_instansi: companyName
        });
    } else {
        text = `Halo Bapak/Ibu ${quo.penanggung_jawab || 'Bapak/Ibu'} (${quo.nama_perusahaan || ''}),\n\n`
            + `Terima kasih atas minat dan kepercayaan Anda kepada *${companyName}*. Kami telah menerbitkan Surat Penawaran Harga resmi berikut:\n\n`
            + `📄 *No. Penawaran*: ${quoNo}\n`
            + `💼 *Proyek*: ${quo.nama_project || 'Pengembangan Solusi Digital'}\n`
            + `💰 *Total Investasi*: *${total}*\n`
            + `📅 *Berlaku Hingga*: ${berlakuHingga}\n\n`
            + `Rincian spesifikasi, terms & conditions, serta persetujuan e-sign dapat diakses melalui portal resmi kami:\n`
            + `🔗 ${publicUrl}\n\n`
            + `Silakan hubungi kami apabila ada rincian yang perlu didiskusikan lebih lanjut.\n\n`
            + `Salam hangat,\n*Tim Bisnis & Legal ${companyName}*`;
    }

    openWhatsApp(quo.client_telepon || quo.telepon || '', text);
}
