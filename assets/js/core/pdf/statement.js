// assets/js/core/pdf/statement.js
import { _ensurePdfLibs, _drawDocumentWordmark, _applyDocumentWatermark, _safeFormatDate, _safeFormatIDR, terbilang } from "./shared.js";

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

