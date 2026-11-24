// assets/js/core/pdf/bast.js — Pembuat PDF Berita Acara Serah Terima (BAST)
import { _ensurePdfLibs, _drawDocumentWordmark, _applyDocumentWatermark, _safeFormatDate, createMinimalProseRenderer } from "./shared.js";

/**
 * High-fidelity BAST (Berita Acara Serah Terima) PDF builder using jsPDF & AutoTable
 * Standardized to match Surat Penawaran & Proposal executive layout
 */
export async function generateBastPdf(bast, output = 'bloburl') {
    const jsPDF = await _ensurePdfLibs();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    const c = bast.company || {};

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

    let rY = 12;
    const bStatusVal = String(bast.status || 'draft').toLowerCase();
    const isSigned = bStatusVal === 'ditandatangani';
    const bStatusText = isSigned ? 'SAH & DITANDATANGANI' : (bStatusVal === 'ditolak' ? 'BAST DITOLAK' : 'DRAFT BERITA ACARA');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    const badgeW = doc.getTextWidth(bStatusText) + 7;
    const badgeH = 4.4;
    const badgeX = pageWidth - margin - badgeW;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(badgeX, rY, badgeW, badgeH, 1.0, 1.0, 'FD');
    doc.setTextColor(isSigned ? 15 : 71, isSigned ? 23 : 85, isSigned ? 42 : 105);
    doc.text(bStatusText, badgeX + 3.5, rY + 3.1);

    rY += badgeH + 4.4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('BERITA ACARA SERAH TERIMA', pageWidth - margin, rY, { align: 'right' });

    rY += 4.4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(30, 41, 59);
    doc.text(String(bast.nomor_bast || 'BAST-DRAFT'), pageWidth - margin, rY, { align: 'right' });

    rY += 3.8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.0);
    doc.setTextColor(100, 116, 139);
    doc.text(`Tanggal Terbit: ${_safeFormatDate(bast.tanggal_bast)}`, pageWidth - margin, rY, { align: 'right' });

    rY += 3.4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isSigned ? 4 : 71, isSigned ? 120 : 85, isSigned ? 87 : 105);
    doc.text(bast.kode_project ? `Kode Proyek: ${bast.kode_project}` : 'Dokumen Pengesahan Resmi', pageWidth - margin, rY, { align: 'right' });

    y = Math.max(leftEndY, rY) + 4;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.35);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6.0;

    // 1. Komparisi Formal Berita Acara Serah Terima (Seragam dengan SPK)
    const refDate = new Date(bast.tanggal_bast || bast.created_at || Date.now());
    const hariNama = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][refDate.getDay()] || 'Senin';
    const bulanNama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][refDate.getMonth()] || 'Januari';
    const tglPanjang = `${refDate.getDate()} ${bulanNama} ${refDate.getFullYear()}`;
    const p1RepName = String(bast.pihak_pertama_nama || 'Lead Project Manager');
    const p1RepPos = String(bast.pihak_pertama_jabatan || 'Project Manager');
    const p2Company = String(bast.client_nama || 'Perusahaan Klien');
    const p2RepName = String(bast.pihak_kedua_nama || '-');
    const p2RepPos = String(bast.pihak_kedua_jabatan || 'Penanggung Jawab (PIC)');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(30, 41, 59);
    const introTxt = `Pada hari ini, ${hariNama}, tanggal ${tglPanjang}, telah dilaksanakan pemeriksaan teknis, pengujian fungsionalitas (UAT), dan serah terima hasil pekerjaan oleh dan antara pihak-pihak yang bertanda tangan di bawah ini:`;
    const introLines = doc.splitTextToSize(introTxt, contentWidth);
    doc.text(introTxt, margin, y + 3.5, { maxWidth: contentWidth, align: 'justify', lineHeightFactor: 1.45 });
    y += (introLines.length * 4.8) + 4.5;

    const renderPartyBlock = (romanLabel, rows, footerRole) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.2);
        doc.setTextColor(15, 23, 42);
        doc.text(romanLabel, margin, y + 3.5);
        y += 6.2;

        const labelX = margin + 4;
        const colonX = margin + 30;
        const valX = margin + 34;
        const valW = contentWidth - 34;

        rows.forEach(([lbl, val]) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9.0);
            doc.setTextColor(71, 85, 105);
            doc.text(lbl, labelX, y + 3.2);
            doc.text(':', colonX, y + 3.2);

            doc.setFont('helvetica', lbl === 'Nama' ? 'bold' : 'normal');
            doc.setTextColor(15, 23, 42);
            const wrappedVal = doc.splitTextToSize(String(val || '-'), valW);
            wrappedVal.forEach((wv) => {
                doc.text(wv, valX, y + 3.2);
                y += 5.2;
            });
        });

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.6);
        doc.setTextColor(71, 85, 105);
        const footerTxt = `Dalam hal ini bertindak untuk dan atas nama ${footerRole}.`;
        const footerLines = doc.splitTextToSize(footerTxt, contentWidth - 4);
        footerLines.forEach((fl) => {
            doc.text(fl, labelX, y + 3.2);
            y += 4.6;
        });
        y += 5.5;
    };

    renderPartyBlock('I. PIHAK PERTAMA', [
        ['Nama', p1RepName],
        ['Jabatan', p1RepPos],
        ['Perusahaan', companyInfo.name],
        ['Alamat', companyInfo.address]
    ], `${companyInfo.name}, yang selanjutnya disebut sebagai PIHAK PERTAMA`);

    renderPartyBlock('II. PIHAK KEDUA', [
        ['Nama', p2RepName],
        ['Jabatan', p2RepPos],
        ['Perusahaan', p2Company],
        ['Proyek', `${bast.nama_project || '-'}${bast.nama_milestone ? ' · ' + bast.nama_milestone : ''}`]
    ], `${p2Company}, yang selanjutnya disebut sebagai PIHAK KEDUA`);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(30, 41, 59);
    const openingText = `PIHAK PERTAMA menyerahkan hasil pekerjaan "${bast.judul_pekerjaan || bast.nama_project || '-'}" kepada PIHAK KEDUA, dan PIHAK KEDUA menyatakan telah melakukan pengujian serta menerima hasil pekerjaan tersebut sesuai rincian pada halaman-halaman berikut.`;
    const openLines = doc.splitTextToSize(openingText, contentWidth);
    doc.text(openingText, margin, y + 3.5, { maxWidth: contentWidth, align: 'justify', lineHeightFactor: 1.48 });
    y += (openLines.length * 4.8) + 6.0;

    if (typeof doc.autoTable === 'function') {
        doc.autoTable({
            startY: y,
            head: [['POKOK BERITA ACARA SERAH TERIMA', 'KETERANGAN']],
            body: [
                ['Nomor Dokumen BAST', String(bast.nomor_bast || '-')],
                ['Tanggal Serah Terima', _safeFormatDate(bast.tanggal_bast)],
                ['Proyek / Tahapan', `${bast.nama_project || '-'}${bast.nama_milestone ? ' (' + bast.nama_milestone + ')' : ''}`],
                ['Judul Hasil Pekerjaan', String(bast.judul_pekerjaan || '-')],
                ['Status Pengesahan', bStatusText]
            ],
            theme: 'grid',
            margin: { left: margin, right: margin, bottom: 18 },
            styles: {
                font: 'helvetica',
                fontSize: 8.5,
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
                fontSize: 8.0
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { cellWidth: 56, fontStyle: 'bold', textColor: [71, 85, 105] },
                1: { cellWidth: 'auto', fontStyle: 'normal' }
            }
        });
        y = (doc.lastAutoTable?.finalY || y) + 6.0;
    }

    const addRunningPage = () => {
        doc.addPage();
        y = 18;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`${companyInfo.name} · Berita Acara Serah Terima ${bast.nomor_bast || ''}`, margin, 11);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, 13, pageWidth - margin, 13);
    };

    const ensureBastSpace = (needH = 22) => {
        if (y + needH > pageHeight - 18) {
            addRunningPage();
        }
    };

    // Minimalist Editorial Section Header (Halaman baru default, seragam dengan SPK)
    const renderSectionBanner = (numStr, titleStr, startNewPage = true) => {
        if (startNewPage) {
            addRunningPage();
        } else {
            y += 4.0;
            ensureBastSpace(42);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${numStr}. ${titleStr}`, pageWidth / 2, y + 4.0, { align: 'center' });
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.35);
        doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);
        y += 13.0;
    };

    // Helper: Formatted prose & pasal (Shared with SPK)
    const renderProse = createMinimalProseRenderer(doc, {
        margin,
        contentWidth,
        pageWidth,
        getY: () => y,
        setY: (nv) => { y = nv; },
        ensureSpace: ensureBastSpace
    });

    let babNum = 1;

    // Bab 01: Rincian Hasil Pekerjaan & Deliverables
    renderSectionBanner(String(babNum++).padStart(2, '0'), 'RINCIAN HASIL PEKERJAAN & DELIVERABLES (UAT)');
    renderProse(`Berikut adalah daftar modul, fitur, dan hasil pekerjaan pada proyek "${bast.nama_project || bast.judul_pekerjaan || '-'}" yang telah diserahkan oleh PIHAK PERTAMA dan diperiksa bersama oleh PIHAK KEDUA:`);

    const rawDeliverables = String(bast.deskripsi_hasil || '')
        .split('\n')
        .map(l => l.trim()
            .replace(/^([•\-\*]|\d+\.)\s+/, '')
            .replace(/Penyerahan repositori kode sumber dan deployment aplikasi di server produksi/gi, 'Deployment aplikasi di server produksi serta penyerahan akses pengguna akhir (End-User Access)'))
        .filter(Boolean);

    const tableBody = rawDeliverables.map((item, idx) => [
        idx + 1,
        item,
        isSigned ? 'Diterima & Sesuai' : 'Siap Uji / UAT'
    ]);

    doc.autoTable({
        startY: y,
        head: [['No', 'Rincian Deliverable / Modul yang Diserahkan', 'Status Verifikasi']],
        body: tableBody.length ? tableBody : [['1', bast.judul_pekerjaan || 'Penyerahan Hasil Pekerjaan Sistem', 'Sesuai Spesifikasi']],
        theme: 'grid',
        margin: { left: margin, right: margin, bottom: 20 },
        styles: {
            font: 'helvetica',
            fontSize: 9.0,
            cellPadding: { top: 3.5, right: 3.0, bottom: 3.5, left: 3.0 },
            textColor: [30, 41, 59],
            lineColor: [226, 232, 240],
            lineWidth: 0.18,
            valign: 'middle'
        },
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 38, halign: 'center', fontStyle: 'bold', textColor: isSigned ? [15, 23, 42] : [71, 85, 105] }
        }
    });

    y = (doc.lastAutoTable?.finalY || y) + 6.0;

    // Bab 02 (Opsional): Catatan Penyempurnaan & Pemeliharaan
    if (bast.catatan_revisi && bast.catatan_revisi.trim()) {
        renderSectionBanner(String(babNum++).padStart(2, '0'), 'CATATAN TAMBAHAN & PEMELIHARAAN', false);
        renderProse(bast.catatan_revisi.trim());
    }

    // Bab 03: Klausul Kesepakatan & Pengesahan Dua Belah Pihak
    renderSectionBanner(String(babNum++).padStart(2, '0'), 'KESEPAKATAN & PENGESAHAN DUA BELAH PIHAK', false);
    const clausesText = [
        '1. PIHAK KEDUA menyatakan telah memeriksa, menguji, dan menerima seluruh hasil pekerjaan yang diserahkan oleh PIHAK PERTAMA dalam kondisi baik, lengkap, serta sesuai dengan spesifikasi yang disepakati bersama.',
        '2. Berita Acara Serah Terima (BAST) ini berlaku sebagai bukti penyelesaian pekerjaan yang sah dan mengikat kedua belah pihak sebagai dasar pemenuhan hak dan kewajiban penagihan/pembayaran termin proyek.',
        '3. Dukungan pemeliharaan sistem dan perbaikan kendala teknis selanjutnya dilaksanakan sesuai paket maintenance & support yang disepakati dalam perjanjian kerja terkait.'
    ].join('\n');
    renderProse(clausesText);

    // Signature Block (Seragam persis dengan Surat Penawaran)
    ensureBastSpace(40);
    y += 4.0;
    const sigW = 68;

    // Left: Pihak Kedua (Klien / Penerima)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.0);
    doc.setTextColor(100, 116, 139);
    doc.text('Diterima & Disetujui oleh (Pihak Kedua),', margin, y);
    if (bast.signature_data && String(bast.signature_data).startsWith('data:image')) {
        try {
            doc.addImage(bast.signature_data, 'PNG', margin + 4, y + 1, 40, 14);
        } catch (_) {}
    }
    doc.line(margin, y + 17, margin + sigW, y + 17);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(bast.pihak_kedua_nama || 'Perwakilan Klien'), margin, y + 21.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text(String(bast.pihak_kedua_jabatan || bast.client_nama || 'Penanggung Jawab Klien'), margin, y + 25.5);

    // Right: Pihak Pertama (Penyedia Jasa)
    const rSigX = pageWidth - margin - sigW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.0);
    doc.setTextColor(100, 116, 139);
    doc.text('Diserahkan secara Sah oleh (Pihak Pertama),', rSigX, y);
    doc.line(rSigX, y + 17, pageWidth - margin, y + 17);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(bast.pihak_pertama_nama || companyInfo.name), rSigX, y + 21.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text(String(bast.pihak_pertama_jabatan || 'Lead Project Manager'), rSigX, y + 25.5);

    // Apply Document Watermark across all pages
    _applyDocumentWatermark(doc, bast.status, 'bast');

    // Multi-page Running Footer (Seragam dengan Surat Penawaran)
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`${companyInfo.name} · Dokumen Berita Acara Serah Terima Resmi ${bast.nomor_bast}`, margin, pageHeight - 6.5);
        doc.text(`Halaman ${p} dari ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
    }

    const safeFilename = `bast_${String(bast.nomor_bast || 'BAST').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    if (output === 'bloburl') {
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        return { blob, blobUrl, url: blobUrl, filename: safeFilename };
    } else if (output === 'blob') {
        return doc.output('blob');
    }
    doc.save(safeFilename);
    return { filename: safeFilename };
}

/**
 * High-fidelity Quotation PDF builder using jsPDF & AutoTable
 * Incorporates Typographic CRUDWORKS Wordmark & Status Watermarks
 */
