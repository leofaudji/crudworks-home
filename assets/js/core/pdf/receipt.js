// assets/js/core/pdf/receipt.js
import { _ensurePdfLibs, _drawDocumentWordmark, _applyDocumentWatermark, _safeFormatDate, _safeFormatIDR, terbilang } from "./shared.js";

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

    // 6. Electronic Verification Note (tanpa kolom paraf penyetor/penerima)
    if (y + 18 > pageHeight - 16) {
        doc.addPage();
        y = 16;
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text(`Diverifikasi & diterbitkan secara elektronik oleh ${String(companyInfo.name)} — Bagian Keuangan & Billing`, margin + 4, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    doc.setTextColor(100, 116, 139);
    doc.text('Kuitansi pembayaran ini sah secara komputerisasi tanpa memerlukan paraf penyetor maupun tanda tangan basah.', margin + 4, y + 10.2);

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
