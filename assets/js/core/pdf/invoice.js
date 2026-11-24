// assets/js/core/pdf/invoice.js — Pembuat PDF Faktur Tagihan & Kuitansi Pembayaran
import { _ensurePdfLibs, _drawDocumentWordmark, _applyDocumentWatermark, _safeFormatDate, _safeFormatIDR, terbilang } from "./shared.js";

/**
 * High-fidelity Invoice PDF builder using jsPDF & AutoTable
 * Incorporates Typographic CRUDWORKS Wordmark & Status Watermarks
 */
export async function generateInvoicePdf(inv, output = 'bloburl') {
    const jsPDF = await _ensurePdfLibs();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    const c = inv.company || {};

    const companyInfo = {
        name: c.company_name || window.App?.getSetting?.('company_name', 'PT CRUDWorks Media Tama') || 'PT CRUDWorks Media Tama',
        address: c.company_address || window.App?.getSetting?.('company_address', 'Jl. Rasuna Said Kav. B4, Jakarta Selatan, 12920') || 'Jl. Rasuna Said Kav. B4, Jakarta Selatan, 12920',
        phone: c.company_phone || window.App?.getSetting?.('company_phone', '(021) 555-0199') || '(021) 555-0199',
        email: c.company_email || window.App?.getSetting?.('company_email', 'billing@crudworks.com') || 'billing@crudworks.com',
        tagline: c.company_tagline || window.App?.getSetting?.('company_tagline', '') || ''
    };

    // Single crisp dark top rule (Minimalist Executive)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 2.2, 'F');

    let y = 12;
    const leftEndY = _drawDocumentWordmark(doc, margin, y, companyInfo, contentWidth);

    // Right: Minimalist Invoice Title & Meta
    let rY = 12;
    const statusVal = String(inv.status || 'belum_bayar').toLowerCase();
    const statusText = statusVal === 'lunas' ? 'LUNAS / SELESAI' : (statusVal === 'sebagian' ? 'TERBAYAR SEBAGIAN' : (statusVal === 'dibatalkan' ? 'DIBATALKAN' : 'MENUNGGU PEMBAYARAN'));

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    const badgeW = doc.getTextWidth(statusText) + 7;
    const badgeH = 4.4;
    const badgeX = pageWidth - margin - badgeW;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(badgeX, rY, badgeW, badgeH, 1.0, 1.0, 'FD');
    doc.setTextColor(statusVal === 'lunas' ? 15 : 71, statusVal === 'lunas' ? 23 : 85, statusVal === 'lunas' ? 42 : 105);
    doc.text(statusText, badgeX + 3.5, rY + 3.1);

    rY += badgeH + 4.4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('FAKTUR TAGIHAN', pageWidth - margin, rY, { align: 'right' });

    rY += 4.4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(30, 41, 59);
    doc.text(String(inv.nomor_invoice || ''), pageWidth - margin, rY, { align: 'right' });

    rY += 3.8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.0);
    doc.setTextColor(100, 116, 139);
    doc.text(`Tanggal Terbit: ${_safeFormatDate(inv.tanggal_invoice)}`, pageWidth - margin, rY, { align: 'right' });

    rY += 3.4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(190, 18, 60);
    doc.text(`Jatuh Tempo: ${_safeFormatDate(inv.tanggal_jatuh_tempo)}`, pageWidth - margin, rY, { align: 'right' });

    y = Math.max(leftEndY, rY) + 4;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.35);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5.0;

    // Symmetrical 50/50 Info Box (Ditagihkan Kepada & Informasi Proyek)
    const halfW = contentWidth / 2;
    const dividerX = margin + halfW;
    const padX = 5.0;
    const leftTextX = margin + padX;
    const rightTextX = dividerX + padX;
    const colTextW = halfW - (padX * 2);

    const clientName = String(inv.nama_perusahaan || inv.client_nama || '-');
    const picStr = `UP / PIC: ${inv.penanggung_jawab || inv.client_pic || '-'} · Kontak: ${inv.client_telepon || inv.client_email || '-'}`;
    const clientAddr = inv.client_alamat
        ? `${inv.client_alamat}${inv.client_kota ? ' · ' + inv.client_kota : ''}`
        : '';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    const clientLines = doc.splitTextToSize(clientName, colTextW);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    const picLines = doc.splitTextToSize(picStr, colTextW);

    doc.setFontSize(7.5);
    const addrLines = clientAddr ? doc.splitTextToSize(clientAddr, colTextW) : [];

    const neededLeftH = 5.5 + 4.4 + (clientLines.length * 4.4) + 1.2 + (picLines.length * 3.8)
        + (addrLines.length ? 1.0 + (addrLines.length * 3.6) : 0) + 4.5;

    const projTitle = inv.nama_project ? `Proyek: ${inv.nama_project}` : 'Layanan Sistem Informasi & Software';
    const totalTagihanStr = `Total Tagihan: ${_safeFormatIDR(inv.total_tagihan || 0)}`;
    const sisaTagihanStr = `Sisa Pembayaran: ${_safeFormatIDR(inv.sisa_tagihan ?? inv.total_tagihan)}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    const projLines = doc.splitTextToSize(projTitle, colTextW);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    const totalTagihanLines = doc.splitTextToSize(totalTagihanStr, colTextW);
    const sisaTagihanLines = doc.splitTextToSize(sisaTagihanStr, colTextW);

    const neededRightH = 5.5 + 4.4 + (projLines.length * 4.4) + 1.2 + (totalTagihanLines.length * 3.8) + 1.0 + (sisaTagihanLines.length * 3.8) + 4.5;
    const clientBoxH = Math.max(25, neededLeftH, neededRightH);

    // Monochrome Minimalist Container
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, y, contentWidth, clientBoxH, 1.5, 1.5, 'FD');

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(dividerX, y + 4.0, dividerX, y + clientBoxH - 4.0);

    // Left Column
    let lCurY = y + 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(100, 116, 139);
    doc.text('DITAGIHKAN KEPADA:', leftTextX, lCurY);
    lCurY += 4.4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    doc.setTextColor(15, 23, 42);
    clientLines.forEach((cl) => {
        doc.text(cl, leftTextX, lCurY);
        lCurY += 4.4;
    });
    lCurY += 1.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(71, 85, 105);
    picLines.forEach((pl) => {
        doc.text(pl, leftTextX, lCurY);
        lCurY += 3.8;
    });

    if (addrLines.length) {
        lCurY += 1.0;
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        addrLines.forEach((al) => {
            doc.text(al, leftTextX, lCurY);
            lCurY += 3.6;
        });
    }

    // Right Column
    let rCurY = y + 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(100, 116, 139);
    doc.text('INFORMASI PROYEK & TAGIHAN:', rightTextX, rCurY);
    rCurY += 4.4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    projLines.forEach((pl) => {
        doc.text(pl, rightTextX, rCurY);
        rCurY += 4.4;
    });
    rCurY += 1.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(71, 85, 105);
    totalTagihanLines.forEach((tl) => {
        doc.text(tl, rightTextX, rCurY);
        rCurY += 3.8;
    });
    rCurY += 1.0;
    sisaTagihanLines.forEach((sl) => {
        doc.text(sl, rightTextX, rCurY);
        rCurY += 3.8;
    });

    y += clientBoxH + 5.5;

    // Items Table using AutoTable (SPK-matched grid & padding)
    const items = inv.items || [];
    const tableBody = items.map((it, idx) => [
        idx + 1,
        it.deskripsi || '-',
        it.kuantitas || 1,
        it.satuan || 'unit',
        _safeFormatIDR(it.harga_satuan || 0),
        _safeFormatIDR(it.total_harga || 0)
    ]);

    doc.autoTable({
        startY: y,
        head: [['No', 'Deskripsi Layanan / Pekerjaan', 'Qty', 'Satuan', 'Harga Satuan', 'Subtotal']],
        body: tableBody.length ? tableBody : [['1', 'Layanan standar', '1', 'unit', _safeFormatIDR(inv.total_tagihan), _safeFormatIDR(inv.total_tagihan)]],
        theme: 'grid',
        margin: { left: margin, right: margin, bottom: 20 },
        styles: {
            font: 'helvetica',
            fontSize: 8.2,
            cellPadding: { top: 3.2, right: 3.5, bottom: 3.2, left: 3.5 },
            textColor: [30, 41, 59],
            lineColor: [203, 213, 225],
            lineWidth: 0.2,
            valign: 'middle'
        },
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7.8
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: {
            0: { cellWidth: 11, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 14, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 33, halign: 'right' },
            5: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
        }
    });

    y = (doc.lastAutoTable?.finalY || y) + 5.5;

    // Calculation Summary (Subtotal, Diskon, Pajak, Grand Total, Sisa)
    const summaryW = 78;
    const summaryX = pageWidth - margin - summaryW;
    const calcRows = [
        ['Subtotal:', _safeFormatIDR(inv.subtotal || 0)]
    ];
    if (Number(inv.diskon_nilai) > 0) {
        calcRows.push(['Diskon Khusus:', `-${_safeFormatIDR(inv.diskon_nilai)}`]);
    }
    const invTaxPct = (inv.pajak_persen !== null && inv.pajak_persen !== undefined && inv.pajak_persen !== '') ? Number(inv.pajak_persen) : 0;
    calcRows.push([`PPN (${invTaxPct}%):`, _safeFormatIDR(inv.pajak_nominal || 0)]);
    calcRows.push(['Total Tagihan:', _safeFormatIDR(inv.total_tagihan || 0)]);
    if (Number(inv.total_dibayar) > 0) {
        calcRows.push(['Telah Dibayar:', _safeFormatIDR(inv.total_dibayar)]);
    }
    calcRows.push(['Sisa Kewajiban:', _safeFormatIDR(inv.sisa_tagihan ?? inv.total_tagihan)]);

    const terbilangW = contentWidth - summaryW - 8;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.4);
    const terbilangStr = `${terbilang(inv.total_tagihan || 0)} Rupiah`;
    const terbilangLines = doc.splitTextToSize(terbilangStr, terbilangW);
    const terbilangBlockH = 5.5 + (terbilangLines.length * 4.4) + 2.0;

    const notesText = inv.catatan_klien || c.invoice_footer_notes || '';
    let nLines = [];
    let notesBlockH = 0;
    if (notesText) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.6);
        nLines = doc.splitTextToSize(notesText, terbilangW);
        notesBlockH = 5.5 + (nLines.length * 4.0) + 1.5;
    }

    const summaryBoxH = 6.5 + calcRows.length * 5.6;
    const leftSideH = terbilangBlockH + (notesBlockH > 0 ? 3.5 + notesBlockH : 0);
    const sectionBlockH = Math.max(summaryBoxH, leftSideH);

    if (y + sectionBlockH + 20 > pageHeight - 16) {
        doc.addPage();
        y = 16;
    }

    const startSummaryY = y;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(summaryX, startSummaryY, summaryW, summaryBoxH, 1.5, 1.5, 'FD');

    let sumRowY = startSummaryY + 5.2;
    calcRows.forEach(([lbl, val]) => {
        const isGrand = lbl === 'Total Tagihan:';
        const isSisa = lbl === 'Sisa Kewajiban:';

        if (isGrand) {
            doc.setFillColor(241, 245, 249);
            doc.rect(summaryX + 1.5, sumRowY - 4.0, summaryW - 3, 5.6, 'F');
        }

        doc.setFont('helvetica', (isGrand || isSisa) ? 'bold' : 'normal');
        doc.setFontSize((isGrand || isSisa) ? 8.8 : 7.8);
        if (isGrand) {
            doc.setTextColor(15, 23, 42);
        } else if (isSisa && Number(inv.sisa_tagihan) > 0) {
            doc.setTextColor(190, 18, 60);
        } else if (isSisa) {
            doc.setTextColor(4, 120, 87);
        } else {
            doc.setTextColor(71, 85, 105);
        }
        doc.text(lbl, summaryX + 4.0, sumRowY);
        doc.text(val, summaryX + summaryW - 4.0, sumRowY, { align: 'right' });
        sumRowY += 5.6;
    });

    // Left of Summary: Terbilang (Borderless Editorial)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(100, 116, 139);
    doc.text('TERBILANG NILAI TAGIHAN:', margin, startSummaryY + 4.2);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.4);
    doc.setTextColor(15, 23, 42);
    let tbY = startSummaryY + 8.8;
    terbilangLines.forEach((tl) => {
        doc.text(tl, margin, tbY);
        tbY += 4.4;
    });

    // Left of Summary below Terbilang: Notes (Borderless Editorial)
    if (notesBlockH > 0) {
        const notesY = startSummaryY + terbilangBlockH + 3.5;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.line(margin, notesY - 1.5, margin + terbilangW, notesY - 1.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.0);
        doc.setTextColor(100, 116, 139);
        doc.text('CATATAN:', margin, notesY + 2.8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.6);
        doc.setTextColor(71, 85, 105);
        let nY = notesY + 7.0;
        nLines.forEach((nl) => {
            doc.text(nl, margin, nY);
            nY += 4.0;
        });
    }

    y = startSummaryY + sectionBlockH + 7.0;

    // Bank Accounts Section (Borderless Minimalist Legal)
    const bankList = inv.payment_methods || [];
    const bankLines = bankList.length === 0
        ? [`BCA: 8720192831 a.n ${companyInfo.name} (KCU Sudirman)`]
        : bankList.slice(0, 4).map((pm) => {
            const defTag = pm.is_default ? '[Utama] ' : '';
            const bankName = pm.nama_bank || pm.nama_metode;
            const rekNo = pm.nomor_rekening || '-';
            const an = pm.atas_nama || companyInfo.name;
            const cab = pm.cabang ? `(${pm.cabang})` : '';
            return `${defTag}${bankName}: ${rekNo} a.n ${an} ${cab}`.trim();
        });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.0);
    const wrappedBankLines = bankLines.flatMap((line, idx) =>
        doc.splitTextToSize(line, contentWidth).map((wl, wi) => ({
            text: wl,
            bold: idx === 0 && Boolean(bankList[0]?.is_default) && wi === 0
        }))
    );

    const bankSectionH = 9.0 + (wrappedBankLines.length * 4.5);
    if (y + bankSectionH + 30 > pageHeight - 16) {
        doc.addPage();
        y = 16;
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(15, 23, 42);
    doc.text('REKENING BANK RESMI PEMBAYARAN (TRANSFER TUJUAN):', margin, y + 5.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Mohon mencantumkan Nomor Invoice pada berita transfer', pageWidth - margin, y + 5.2, { align: 'right' });

    let bankRowY = y + 10.2;
    wrappedBankLines.forEach((item) => {
        doc.setFont('helvetica', item.bold ? 'bold' : 'normal');
        doc.setFontSize(8.0);
        doc.setTextColor(30, 41, 59);
        doc.text(item.text, margin, bankRowY);
        bankRowY += 4.5;
    });

    y = bankRowY + 6.0;

    // Signature Block
    if (y + 30 > pageHeight - 16) {
        doc.addPage();
        y = 16;
    }

    const sigW = 62;
    // Left Sig: Ditagihkan Kepada (Client PIC)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Diterima oleh,', margin, y);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.25);
    doc.line(margin, y + 16, margin + sigW, y + 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(15, 23, 42);
    doc.text(String(inv.penanggung_jawab || inv.client_pic || 'Pelanggan'), margin, y + 20.5, { maxWidth: sigW });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(100, 116, 139);
    doc.text(String(inv.nama_perusahaan || 'Klien'), margin, y + 24.5, { maxWidth: sigW });

    // Right Sig: Authorized Finance
    const rSigX = pageWidth - margin - sigW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Bagian Keuangan & Billing,', rSigX, y);
    doc.line(rSigX, y + 16, pageWidth - margin, y + 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(15, 23, 42);
    doc.text(String(companyInfo.name), rSigX, y + 20.5, { maxWidth: sigW });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(100, 116, 139);
    doc.text('Dokumen Resmi Sah Komputerisasi', rSigX, y + 24.5, { maxWidth: sigW });

    // Apply Document Watermark across all pages (LUNAS / SEBAGIAN / DIBATALKAN / DRAFT)
    _applyDocumentWatermark(doc, inv.status, 'invoice');

    // Multi-page Running Footer
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(148, 163, 184);
        doc.text(`${companyInfo.name} · Faktur Tagihan ${inv.nomor_invoice}`, margin, pageHeight - 6.5);
        doc.text(`Halaman ${p} dari ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
    }

    const safeFilename = `faktur_${String(inv.nomor_invoice || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    if (output === 'bloburl') {
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        return { blob, blobUrl, filename: safeFilename };
    }
    doc.save(safeFilename);
    return { filename: safeFilename };
}

/**
 * High-fidelity Payment Receipt (Kwitansi) PDF builder
 * Desain Kuitansi Resmi Korporat Eksekutif (Zero-Slop, Double Security Frame, Voucher Callout & Digital Stamp)
 */
export async function generatePaymentReceiptPdf(p, output = 'bloburl') {
    const jsPDF = await _ensurePdfLibs();
    // A4 Portrait (210mm x 297mm): Seragam & Selaras dengan Format Proposal Penawaran & Faktur
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;

    const companyInfo = {
        name: window.App?.getSetting?.('company_name', 'PT CRUDWorks Media Tama') || 'PT CRUDWorks Media Tama',
        address: window.App?.getSetting?.('company_address', 'Jl. Rasuna Said Kav. B4, Jakarta Selatan, 12920') || 'Jl. Rasuna Said Kav. B4, Jakarta Selatan, 12920',
        phone: window.App?.getSetting?.('company_phone', '(021) 555-0199') || '(021) 555-0199',
        email: window.App?.getSetting?.('company_email', 'billing@crudworks.com') || 'billing@crudworks.com',
        tagline: (p.company?.company_tagline) || window.App?.getSetting?.('company_tagline', '') || ''
    };

    // Single crisp dark top rule (Minimalist Executive)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 2.2, 'F');

    let y = 12;
    const leftEndY = _drawDocumentWordmark(doc, margin, y, companyInfo, contentWidth);

    let rY = 12;
    const receiptBadgeText = 'BUKTI PEMBAYARAN SAH';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    const badgeW = doc.getTextWidth(receiptBadgeText) + 7;
    const badgeH = 4.4;
    const badgeX = pageWidth - margin - badgeW;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(badgeX, rY, badgeW, badgeH, 1.0, 1.0, 'FD');
    doc.setTextColor(15, 23, 42);
    doc.text(receiptBadgeText, badgeX + 3.5, rY + 3.1);

    rY += badgeH + 4.4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('KUITANSI PEMBAYARAN', pageWidth - margin, rY, { align: 'right' });

    rY += 4.4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(30, 41, 59);
    doc.text(String(p.nomor_pembayaran || 'KWT-DRAFT'), pageWidth - margin, rY, { align: 'right' });

    rY += 3.8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.0);
    doc.setTextColor(100, 116, 139);
    doc.text(`Tanggal Terbit: ${_safeFormatDate(p.tanggal_bayar)}`, pageWidth - margin, rY, { align: 'right' });

    rY += 3.4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(4, 120, 87);
    doc.text('Status: Terverifikasi Sah & Lunas', pageWidth - margin, rY, { align: 'right' });

    y = Math.max(leftEndY, rY) + 4;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.35);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5.0;

    // 2. Symmetrical 50/50 Recipient & Transaction Box
    const halfW = contentWidth / 2;
    const dividerX = margin + halfW;
    const padX = 5.0;
    const leftTextX = margin + padX;
    const rightTextX = dividerX + padX;
    const colTextW = halfW - (padX * 2);

    const clientName = String(p.client_nama || '-');
    const picStr = `UP / PIC: ${p.client_pic || '-'} · Kontak: ${p.client_telepon || p.client_email || '-'}`;
    const clientAddr = p.client_alamat
        ? `${p.client_alamat}${p.client_kota ? ' · ' + p.client_kota : ''}`
        : '';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    const clientLines = doc.splitTextToSize(clientName, colTextW);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    const picLines = doc.splitTextToSize(picStr, colTextW);

    doc.setFontSize(7.5);
    const clientAddrLines = clientAddr ? doc.splitTextToSize(clientAddr, colTextW) : [];

    const neededLeftH = 5.5 + 4.4 + (clientLines.length * 4.4) + 1.2 + (picLines.length * 3.8)
        + (clientAddrLines.length ? 1.0 + (clientAddrLines.length * 3.6) : 0) + 4.5;

    const invTitle = p.nomor_invoice ? `Faktur Tagihan: ${p.nomor_invoice}` : 'Pembayaran Tagihan Layanan';
    const tagihanStr = `Total Tagihan Asli: ${_safeFormatIDR(p.total_tagihan || 0)}`;
    const metodeStr = `Metode Transaksi: ${p.nama_bank || p.nama_metode || 'Bank Transfer'}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    const invLines = doc.splitTextToSize(invTitle, colTextW);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    const tagihanLines = doc.splitTextToSize(tagihanStr, colTextW);
    const metodeLines = doc.splitTextToSize(metodeStr, colTextW);

    const neededRightH = 5.5 + 4.4 + (invLines.length * 4.4) + 1.2 + (tagihanLines.length * 3.8) + 1.0 + (metodeLines.length * 3.8) + 4.5;
    const clientBoxH = Math.max(25, neededLeftH, neededRightH);

    // Monochrome Minimalist Container
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, y, contentWidth, clientBoxH, 1.5, 1.5, 'FD');

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(dividerX, y + 4.0, dividerX, y + clientBoxH - 4.0);

    // Left Column
    let lCurY = y + 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(100, 116, 139);
    doc.text('DITERIMA DARI (PEMBAYAR / KLIEN):', leftTextX, lCurY);
    lCurY += 4.4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    doc.setTextColor(15, 23, 42);
    clientLines.forEach((cl) => {
        doc.text(cl, leftTextX, lCurY);
        lCurY += 4.4;
    });
    lCurY += 1.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(71, 85, 105);
    picLines.forEach((pl) => {
        doc.text(pl, leftTextX, lCurY);
        lCurY += 3.8;
    });

    if (clientAddrLines.length) {
        lCurY += 1.0;
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        clientAddrLines.forEach((al) => {
            doc.text(al, leftTextX, lCurY);
            lCurY += 3.6;
        });
    }

    // Right Column
    let rCurY = y + 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(100, 116, 139);
    doc.text('RINCIAN TAGIHAN & FAKTUR TERKAIT:', rightTextX, rCurY);
    rCurY += 4.4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    invLines.forEach((il) => {
        doc.text(il, rightTextX, rCurY);
        rCurY += 4.4;
    });
    rCurY += 1.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(71, 85, 105);
    tagihanLines.forEach((tl) => {
        doc.text(tl, rightTextX, rCurY);
        rCurY += 3.8;
    });
    rCurY += 1.0;
    metodeLines.forEach((ml) => {
        doc.text(ml, rightTextX, rCurY);
        rCurY += 3.8;
    });

    y += clientBoxH + 5.5;

    const receiptTableBody = [
        [
            '1',
            `Pembayaran Tagihan Faktur No. ${p.nomor_invoice || '-'}\n${p.catatan ? p.catatan : 'Pelunasan / pembayaran tagihan resmi sistem'}`.trim(),
            _safeFormatIDR(p.jumlah_bayar)
        ]
    ];

    doc.autoTable({
        startY: y,
        head: [['No', 'Uraian / Tujuan Pembayaran', 'Jumlah Diterima (IDR)']],
        body: receiptTableBody,
        theme: 'grid',
        margin: { left: margin, right: margin, bottom: 20 },
        styles: {
            font: 'helvetica',
            fontSize: 8.5,
            cellPadding: { top: 3.6, right: 3.8, bottom: 3.6, left: 3.8 },
            textColor: [30, 41, 59],
            lineColor: [203, 213, 225],
            lineWidth: 0.2,
            valign: 'middle'
        },
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.0
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 48, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
        }
    });

    y = (doc.lastAutoTable?.finalY || y) + 5.5;

    // 4. Rekonsiliasi Saldo & Kotak Terbilang (Monochrome Legal Executive, Dynamic Height)
    const summaryW = 84;
    const summaryX = pageWidth - margin - summaryW;
    const sisaNum = Number(p.current_sisa ?? 0);
    const isLunas = sisaNum <= 0;
    const sisaText = isLunas ? 'LUNAS (NIHIL)' : _safeFormatIDR(sisaNum);

    const calcRows = [
        ['Total Tagihan Faktur:', _safeFormatIDR(p.total_tagihan || 0)],
        ['Diterima Transaksi Ini:', _safeFormatIDR(p.jumlah_bayar)],
        ['Sisa Saldo Tagihan:', sisaText]
    ];

    const terbilangW = contentWidth - summaryW - 8;
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(8.8);
    const terbilangStr = `### ${terbilang(p.jumlah_bayar)} Rupiah ###`;
    const terbilangLines = doc.splitTextToSize(terbilangStr, terbilangW);

    const rawSummaryH = 7.0 + calcRows.length * 6.0;
    const rawTerbilangH = 6.5 + (terbilangLines.length * 4.5) + 2.0;
    const unifiedBoxH = Math.max(rawSummaryH, rawTerbilangH);

    const startSummaryY = y;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(summaryX, startSummaryY, summaryW, unifiedBoxH, 1.5, 1.5, 'FD');

    let sumRowY = startSummaryY + 5.6;
    calcRows.forEach(([lbl, val], idx) => {
        const isHighlight = idx === 1;
        const isSisaRow = idx === 2;
        if (isHighlight) {
            doc.setFillColor(241, 245, 249);
            doc.rect(summaryX + 1.5, sumRowY - 4.2, summaryW - 3, 6.0, 'F');
        }
        doc.setFont('helvetica', isHighlight || isSisaRow ? 'bold' : 'normal');
        doc.setFontSize(isHighlight ? 8.8 : 8.0);
        if (isHighlight) {
            doc.setTextColor(15, 23, 42);
        } else if (isSisaRow && isLunas) {
            doc.setTextColor(4, 120, 87);
        } else if (isSisaRow) {
            doc.setTextColor(190, 18, 60);
        } else {
            doc.setTextColor(71, 85, 105);
        }
        doc.text(lbl, summaryX + 4.0, sumRowY);
        doc.text(val, summaryX + summaryW - 4.0, sumRowY, { align: 'right' });
        sumRowY += 6.0;
    });

    // Left of Summary: Terbilang (Borderless Editorial)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(100, 116, 139);
    doc.text('JUMLAH TERBILANG (RUPIAH):', margin, startSummaryY + 4.6);

    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    let tbY = startSummaryY + 9.8;
    terbilangLines.forEach((tl) => {
        doc.text(tl, margin, tbY);
        tbY += 4.5;
    });

    y = startSummaryY + unifiedBoxH + 7.5;

    // 5. Catatan Hukum & Keabsahan Transaksi (Borderless Editorial)
    const disclaimer = 'Kuitansi ini diterbitkan secara sah oleh sistem komputerisasi CRUDWorks ERP berdasarkan mutasi dana yang telah tervalidasi pada rekening bank resmi. Dokumen ini merupakan bukti pembayaran yang sah, mengikat secara hukum, dan diakui sebagai tanda bukti pelunasan transaksi.';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    const discLines = doc.splitTextToSize(disclaimer, contentWidth);
    const discLineH = 4.0;
    const discTotalH = discLines.length * discLineH;

    const disclaimerSectionH = 6.0 + 4.5 + discTotalH + 2.5 + 4.5;
    if (y + disclaimerSectionH + 30 > pageHeight - 16) {
        doc.addPage();
        y = 16;
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);

    let dCurY = y + 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text('CATATAN HUKUM & KEABSAHAN TRANSAKSI:', margin, dCurY);
    dCurY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(71, 85, 105);
    discLines.forEach((dl) => {
        doc.text(dl, margin, dCurY);
        dCurY += discLineH;
    });
    dCurY += 2.0;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(4, 120, 87);
    doc.text('STATUS DOKUMEN: TERVERIFIKASI SAH SISTEM KOMPUTERISASI', margin, dCurY);

    y = dCurY + 8.0;

    // 6. Signature Block (Seragam dengan Faktur Tagihan & SPK)
    if (y + 28 > pageHeight - 16) {
        doc.addPage();
        y = 16;
    }

    const sigW = 62;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Penyetor / Pembayar,', margin, y);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.25);
    doc.line(margin, y + 16, margin + sigW, y + 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(15, 23, 42);
    doc.text(String(p.client_pic || p.client_nama || 'Klien'), margin, y + 20.5, { maxWidth: sigW });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(100, 116, 139);
    doc.text(String(p.client_nama || 'Klien'), margin, y + 24.5, { maxWidth: sigW });

    const rSigX = pageWidth - margin - sigW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Diterima & Diverifikasi oleh,', rSigX, y);
    doc.line(rSigX, y + 16, pageWidth - margin, y + 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(15, 23, 42);
    doc.text(String(companyInfo.name), rSigX, y + 20.5, { maxWidth: sigW });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(100, 116, 139);
    doc.text('Bagian Keuangan & Billing', rSigX, y + 24.5, { maxWidth: sigW });

    // Apply Subtle Watermark LUNAS
    _applyDocumentWatermark(doc, 'lunas', 'invoice');

    // Running Footer
    const totalPages = doc.getNumberOfPages();
    for (let pg = 1; pg <= totalPages; pg++) {
        doc.setPage(pg);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(148, 163, 184);
        doc.text(`${companyInfo.name} · Kuitansi Resmi ${p.nomor_pembayaran}`, margin, pageHeight - 6.5);
        doc.text(`Halaman ${pg} dari ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
    }

    const safeFilename = `kuitansi_${String(p.nomor_pembayaran || 'receipt').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    if (output === 'bloburl') {
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        return { blob, blobUrl, filename: safeFilename };
    }
    doc.save(safeFilename);
    return { filename: safeFilename };
}

/**
 * Rekening Koran / Laporan Akun Klien (Statement of Account PDF)
 * Gaya Minimalist Legal Executive (seragam dengan SPK, Faktur, Kuitansi)
 */
export async function generateClientStatementPdf(data, output = 'bloburl') {
    const jsPDF = await _ensurePdfLibs();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;

    const cl = data.client || {};
    const c = data.company || {};
    const sum = data.summary || {};
    const invoices = data.invoices || [];
    const payments = data.payments || [];

    const companyInfo = {
        name: c.company_name || window.App?.getSetting?.('company_name', 'PT CRUDWorks Media Tama') || 'PT CRUDWorks Media Tama',
        address: c.company_address || window.App?.getSetting?.('company_address', 'Jl. Rasuna Said Kav. B4, Jakarta Selatan, 12920') || 'Jl. Rasuna Said Kav. B4, Jakarta Selatan, 12920',
        phone: c.company_phone || window.App?.getSetting?.('company_phone', '(021) 555-0199') || '(021) 555-0199',
        email: c.company_email || window.App?.getSetting?.('company_email', 'billing@crudworks.com') || 'billing@crudworks.com',
        tagline: c.company_tagline || window.App?.getSetting?.('company_tagline', '') || ''
    };

    // Dark top rule
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 2.2, 'F');

    let y = 12;
    const leftEndY = _drawDocumentWordmark(doc, margin, y, companyInfo, contentWidth);

    // Right: Document Title & Meta
    let rY = 12;
    const badgeTxt = 'REKENING KORAN RESMI';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    const badgeW = doc.getTextWidth(badgeTxt) + 7;
    const badgeH = 4.4;
    const badgeX = pageWidth - margin - badgeW;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(badgeX, rY, badgeW, badgeH, 1.0, 1.0, 'FD');
    doc.setTextColor(15, 23, 42);
    doc.text(badgeTxt, badgeX + 3.5, rY + 3.1);

    rY += badgeH + 4.8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('LAPORAN AKUN KLIEN', pageWidth - margin, rY, { align: 'right' });

    rY += 4.6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(51, 65, 85);
    doc.text(String(cl.kode_klien || 'KLIEN'), pageWidth - margin, rY, { align: 'right' });

    rY += 4.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(`Dicetak: ${_safeFormatDate(new Date().toISOString().slice(0, 10))}`, pageWidth - margin, rY, { align: 'right' });

    y = Math.max(leftEndY, rY) + 4;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.35);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5.0;

    // Symmetrical 50/50 Client & Summary Block
    const halfW = contentWidth / 2;
    const dividerX = margin + halfW;
    const padX = 5.0;
    const leftTextX = margin + padX;
    const rightTextX = dividerX + padX;
    const colTextW = halfW - (padX * 2);

    const clientName = String(cl.nama_perusahaan || '-');
    const picStr = `UP / PIC: ${cl.penanggung_jawab || '-'} · Kontak: ${cl.telepon || cl.email || '-'}`;
    const clientAddr = cl.alamat ? `${cl.alamat}${cl.kota ? ' · ' + cl.kota : ''}` : '';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    const clientLines = doc.splitTextToSize(clientName, colTextW);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    const picLines = doc.splitTextToSize(picStr, colTextW);
    doc.setFontSize(7.5);
    const addrLines = clientAddr ? doc.splitTextToSize(clientAddr, colTextW) : [];

    const neededLeftH = 5.5 + 4.4 + (clientLines.length * 4.4) + 1.2 + (picLines.length * 3.8)
        + (addrLines.length ? 1.0 + (addrLines.length * 3.6) : 0) + 4.5;

    const summaryLines = [
        `Total Ditagihkan: ${_safeFormatIDR(sum.total_invoiced || 0)} (${sum.invoice_count || 0} faktur)`,
        `Total Terbayar: ${_safeFormatIDR(sum.total_paid || 0)} (${sum.payment_count || 0} transaksi)`,
        `Sisa Kewajiban: ${_safeFormatIDR(sum.total_outstanding || 0)}`,
        `Saldo Deposit: ${_safeFormatIDR(sum.saldo_deposit || 0)}`
    ];
    const neededRightH = 5.5 + 4.4 + (summaryLines.length * 4.3) + 4.5;
    const boxH = Math.max(26, neededLeftH, neededRightH);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, y, contentWidth, boxH, 1.5, 1.5, 'FD');
    doc.setDrawColor(226, 232, 240);
    doc.line(dividerX, y + 4.0, dividerX, y + boxH - 4.0);

    let lCurY = y + 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(100, 116, 139);
    doc.text('INFORMASI KLIEN:', leftTextX, lCurY);
    lCurY += 4.4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    doc.setTextColor(15, 23, 42);
    clientLines.forEach((line) => { doc.text(line, leftTextX, lCurY); lCurY += 4.4; });
    lCurY += 1.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(71, 85, 105);
    picLines.forEach((line) => { doc.text(line, leftTextX, lCurY); lCurY += 3.8; });
    if (addrLines.length) {
        lCurY += 1.0;
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        addrLines.forEach((line) => { doc.text(line, leftTextX, lCurY); lCurY += 3.6; });
    }

    let rCurY = y + 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(100, 116, 139);
    doc.text('IKHTISAR AKUN KLIEN:', rightTextX, rCurY);
    rCurY += 4.6;
    summaryLines.forEach((line, idx) => {
        doc.setFont('helvetica', idx === 2 ? 'bold' : 'normal');
        doc.setFontSize(8.0);
        if (idx === 2 && Number(sum.total_outstanding) > 0) doc.setTextColor(190, 18, 60);
        else if (idx === 2) doc.setTextColor(4, 120, 87);
        else doc.setTextColor(30, 41, 59);
        doc.text(line, rightTextX, rCurY, { maxWidth: colTextW });
        rCurY += 4.3;
    });

    y += boxH + 6.5;

    // Section 1: Daftar Faktur Tagihan
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('I. RINCIAN FAKTUR TAGIHAN', margin, y);
    y += 2.5;

    doc.autoTable({
        startY: y,
        head: [['No', 'Nomor Faktur', 'Tanggal', 'Jatuh Tempo', 'Total', 'Terbayar', 'Sisa', 'Status']],
        body: invoices.length ? invoices.map((inv, idx) => [
            idx + 1,
            inv.nomor_invoice || '-',
            _safeFormatDate(inv.tanggal_invoice),
            _safeFormatDate(inv.tanggal_jatuh_tempo),
            _safeFormatIDR(inv.total_tagihan || 0),
            _safeFormatIDR(inv.total_dibayar || 0),
            _safeFormatIDR(inv.sisa_tagihan || 0),
            String(inv.status || '-').toUpperCase()
        ]) : [['-', 'Belum ada faktur tagihan', '-', '-', '-', '-', '-', '-']],
        theme: 'grid',
        margin: { left: margin, right: margin, bottom: 18 },
        styles: {
            font: 'helvetica',
            fontSize: 7.5,
            cellPadding: { top: 2.6, right: 2.5, bottom: 2.6, left: 2.5 },
            textColor: [30, 41, 59],
            lineColor: [203, 213, 225],
            lineWidth: 0.2,
            valign: 'middle'
        },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 9, halign: 'center' },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right', fontStyle: 'bold' },
            7: { cellWidth: 20, halign: 'center' }
        }
    });

    y = (doc.lastAutoTable?.finalY || y) + 7.5;
    if (y + 30 > pageHeight - 16) {
        doc.addPage();
        y = 16;
    }

    // Section 2: Riwayat Pembayaran Terverifikasi
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('II. RIWAYAT PEMBAYARAN TERVERIFIKASI', margin, y);
    y += 2.5;

    doc.autoTable({
        startY: y,
        head: [['No', 'No. Kuitansi', 'Tanggal', 'Faktur Terkait', 'Metode / Bank', 'Jumlah Bayar']],
        body: payments.length ? payments.map((p, idx) => [
            idx + 1,
            p.nomor_pembayaran || '-',
            _safeFormatDate(p.tanggal_bayar),
            p.nomor_invoice || '-',
            p.nama_bank || p.nama_metode || '-',
            _safeFormatIDR(p.jumlah_bayar || 0)
        ]) : [['-', 'Belum ada pembayaran tercatat', '-', '-', '-', '-']],
        theme: 'grid',
        margin: { left: margin, right: margin, bottom: 18 },
        styles: {
            font: 'helvetica',
            fontSize: 7.5,
            cellPadding: { top: 2.6, right: 2.5, bottom: 2.6, left: 2.5 },
            textColor: [30, 41, 59],
            lineColor: [203, 213, 225],
            lineWidth: 0.2,
            valign: 'middle'
        },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 9, halign: 'center' },
            5: { halign: 'right', fontStyle: 'bold' }
        }
    });

    // Running Footer
    const totalPages = doc.getNumberOfPages();
    for (let pg = 1; pg <= totalPages; pg++) {
        doc.setPage(pg);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(148, 163, 184);
        doc.text(`${companyInfo.name} · Rekening Koran ${cl.nama_perusahaan || ''}`, margin, pageHeight - 6.5);
        doc.text(`Halaman ${pg} dari ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
    }

    const safeFilename = `rekening_koran_${String(cl.kode_klien || 'klien').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    if (output === 'bloburl') {
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        return { blob, blobUrl, filename: safeFilename };
    }
    doc.save(safeFilename);
    return { filename: safeFilename };
}

/**
 * Parse structured timeline text into Gantt matrix data
 * Supports formats like:
 * 1. Instalasi, penyesuaian, sosialisasi (Bulan 4)
 * 2. Pendampingan dan penggunaan aplikasi (Bulan 5 - 9)
 * or:
 * Tahap 1 — Analisis Kebutuhan & Desain (Minggu 1 – 2)
 */
