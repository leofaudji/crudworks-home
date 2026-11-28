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

    const itemLabels = Array.from(new Set(
        (inv.items || [])
            .map((it) => String(it.nama_layanan || it.deskripsi || '').trim())
            .filter(Boolean)
    ));
    let projTitle = 'Tagihan Layanan';
    if (inv.nama_project) {
        projTitle = `Proyek: ${inv.nama_project}`;
    } else if (itemLabels.length === 1) {
        projTitle = itemLabels[0];
    } else if (itemLabels.length > 1) {
        projTitle = `${itemLabels[0]} (+${itemLabels.length - 1} layanan lainnya)`;
    }
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

    // Electronic Authorization Note (tanpa kolom paraf/tanda tangan basah)
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
    doc.text(`Diterbitkan secara elektronik oleh ${String(companyInfo.name)} — Bagian Keuangan & Billing`, margin + 4, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    doc.setTextColor(100, 116, 139);
    doc.text('Dokumen tagihan ini sah secara komputerisasi tanpa memerlukan tanda tangan basah atau paraf.', margin + 4, y + 10.2);

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


export { generatePaymentReceiptPdf } from "./receipt.js";
export { generateClientStatementPdf } from "./statement.js";
