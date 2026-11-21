// assets/js/core/pdf/quotation.js — Pembuat PDF & Word Surat Penawaran Harga (SPH)
import { _ensurePdfLibs, _drawDocumentWordmark, _applyDocumentWatermark, _safeFormatDate, _safeFormatIDR, terbilang, escapeHtml, createMinimalProseRenderer } from "./shared.js";
import { parseTimelineGantt, parseTimelineStages, _drawTimelineDiagramPdf } from "../utils.js";

export async function generateQuotationPdf(quo, output = 'bloburl') {
    const jsPDF = await _ensurePdfLibs();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    const c = quo.company || {};

    const companyInfo = {
        name: c.company_name || window.App?.getSetting?.('company_name', 'PT CRUDWorks Media Tama') || 'PT CRUDWorks Media Tama',
        address: c.company_address || window.App?.getSetting?.('company_address', 'Jl. Rasuna Said Kav. B4, Jakarta Selatan, 12920') || 'Jl. Rasuna Said Kav. B4, Jakarta Selatan, 12920',
        phone: c.company_phone || window.App?.getSetting?.('company_phone', '(021) 555-0199') || '(021) 555-0199',
        email: c.company_email || window.App?.getSetting?.('company_email', 'billing@crudworks.com') || 'billing@crudworks.com',
        npwp: c.company_npwp || window.App?.getSetting?.('company_npwp', '01.234.567.8-012.000') || ''
    };

    // Single crisp dark top rule (Minimalist Executive)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 2.2, 'F');

    let y = 12;
    const leftEndY = _drawDocumentWordmark(doc, margin, y, companyInfo, contentWidth);

    // Right: Minimalist Proposal Meta Badge & Info
    let rY = 12;
    const qStatusVal = String(quo.status || 'draft').toLowerCase();
    const qStatusText = qStatusVal === 'disetujui' ? 'PENAWARAN DISETUJUI' : (qStatusVal === 'ditolak' ? 'PENAWARAN DITOLAK' : (qStatusVal === 'dikirim' ? 'PENAWARAN TERKIRIM' : 'DRAFT PENAWARAN'));

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    const badgeW = doc.getTextWidth(qStatusText) + 7;
    const badgeH = 4.4;
    const badgeX = pageWidth - margin - badgeW;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(badgeX, rY, badgeW, badgeH, 1.0, 1.0, 'FD');
    doc.setTextColor(qStatusVal === 'disetujui' ? 15 : 71, qStatusVal === 'disetujui' ? 23 : 85, qStatusVal === 'disetujui' ? 42 : 105);
    doc.text(qStatusText, badgeX + 3.5, rY + 3.1);

    rY += badgeH + 3.8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('SURAT PENAWARAN HARGA', pageWidth - margin, rY, { align: 'right' });

    rY += 4.4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(51, 65, 85);
    doc.text(String(quo.nomor_penawaran || 'QUO-DRAFT'), pageWidth - margin, rY, { align: 'right' });

    rY += 3.8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(`Tanggal Terbit: ${_safeFormatDate(quo.tanggal_penawaran)} · Berlaku s/d: ${_safeFormatDate(quo.berlaku_hingga)}`, pageWidth - margin, rY, { align: 'right' });

    y = Math.max(leftEndY, rY) + 4;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.35);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4.5;

    // Executive Recipient Box (Calon Klien & Proyek - Symmetrical, Well-Padded & Overflow-Free)
    const colGap = 6.0;
    const halfW = (contentWidth - colGap) / 2;
    const leftTextX = margin + 5.0;
    const leftTextW = halfW - 9.0;
    const dividerX = margin + halfW + (colGap / 2);
    const rightBoxX = dividerX + (colGap / 2);
    const rightTextX = rightBoxX + 2.0;
    const rightTextW = halfW - 9.0;

    const quoClientName = String(quo.nama_perusahaan || '-');
    const quoPicStr = `UP / PIC: ${quo.penanggung_jawab || '-'} · Kontak: ${quo.client_telepon || quo.client_email || '-'}`;
    const quoClientAddr = quo.client_alamat ? `${quo.client_alamat}${quo.client_kota ? ' · ' + quo.client_kota : ''}` : 'Alamat terdaftar di sistem';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    const quoClientLines = doc.splitTextToSize(quoClientName, leftTextW);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    const quoPicLines = doc.splitTextToSize(quoPicStr, leftTextW);

    doc.setFontSize(7.8);
    const quoAddrLines = doc.splitTextToSize(quoClientAddr, leftTextW);

    const neededLeftH = 5.5 + 4.5 + (quoClientLines.length * 4.6) + 1.4 + (quoPicLines.length * 3.9) + 1.0 + (quoAddrLines.length * 3.7) + 3.5;

    const projTitle = quo.nama_project ? `Proyek: ${quo.nama_project}` : 'Pengembangan Sistem & Layanan IT';
    const estimasiStr = `Total Estimasi: ${_safeFormatIDR(quo.total_penawaran || 0)}`;
    const statusStr = `Status Dokumen: ${String(quo.status || 'Draft').toUpperCase()}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    const projLines = doc.splitTextToSize(projTitle, rightTextW);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    const estimasiLines = doc.splitTextToSize(estimasiStr, rightTextW);

    doc.setFontSize(7.8);
    const statusLines = doc.splitTextToSize(statusStr, rightTextW);

    const neededRightH = 5.5 + 4.5 + (projLines.length * 4.6) + 1.4 + (estimasiLines.length * 3.9) + 1.0 + (statusLines.length * 3.7) + 3.5;
    const clientBoxH = Math.max(24, neededLeftH, neededRightH);

    // Box Container monokrom (seragam dengan SPK)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, y, contentWidth, clientBoxH, 1.5, 1.5, 'FD');

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(dividerX, y + 4, dividerX, y + clientBoxH - 4);

    // Left inside client box
    let lCurY = y + 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('DITUJUKAN KEPADA (CALON KLIEN):', leftTextX, lCurY);
    lCurY += 4.8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    quoClientLines.forEach(cl => {
        doc.text(cl, leftTextX, lCurY, { maxWidth: leftTextW });
        lCurY += 4.8;
    });
    lCurY += 1.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(71, 85, 105);
    quoPicLines.forEach(pl => {
        doc.text(pl, leftTextX, lCurY, { maxWidth: leftTextW });
        lCurY += 4.0;
    });
    lCurY += 1.2;

    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    quoAddrLines.forEach(al => {
        doc.text(al, leftTextX, lCurY, { maxWidth: leftTextW });
        lCurY += 3.8;
    });

    // Right inside client box
    let rCurY = y + 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('INFORMASI PROYEK & ANGGARAN:', rightTextX, rCurY);
    rCurY += 4.8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.8);
    doc.setTextColor(15, 23, 42);
    projLines.forEach(pl => {
        doc.text(pl, rightTextX, rCurY, { maxWidth: rightTextW });
        rCurY += 4.6;
    });
    rCurY += 1.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(71, 85, 105);
    estimasiLines.forEach(el => {
        doc.text(el, rightTextX, rCurY, { maxWidth: rightTextW });
        rCurY += 4.0;
    });
    rCurY += 1.2;

    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    statusLines.forEach(sl => {
        doc.text(sl, rightTextX, rCurY, { maxWidth: rightTextW });
        rCurY += 3.8;
    });

    y += clientBoxH + 7.0;

    const ensureQuoSpace = (needH = 22) => {
        if (y + needH > pageHeight - 16) {
            doc.addPage();
            y = 16;
            // Running header for subsequent pages
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text(`${companyInfo.name} · Dokumen Penawaran ${quo.nomor_penawaran}`, margin, 10);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.line(margin, 12, pageWidth - margin, 12);
        }
    };

    // Minimalist Editorial Section Header (Centered + bottom hairline, seragam dengan SPK)
    const renderSectionBanner = (numStr, titleStr) => {
        ensureQuoSpace(28);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${numStr}. ${titleStr}`, pageWidth / 2, y + 4.0, { align: 'center' });
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.35);
        doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);
        y += 12.0;
    };

    // Helper: Render formatted prose & pasal (Shared with SPK)
    const renderProse = createMinimalProseRenderer(doc, {
        margin,
        contentWidth,
        pageWidth,
        getY: () => y,
        setY: (nv) => { y = nv; },
        ensureSpace: ensureQuoSpace
    });

    // 1. Salam Pembuka (Pengantar)
    if (quo.salam_pembuka) {
        renderProse(quo.salam_pembuka);
    }

    // 2. Bab Penomoran Dinamis
    let babNum = 1;

    if (quo.ruang_lingkup_fitur) {
        renderSectionBanner(String(babNum++).padStart(2, '0'), 'RUANG LINGKUP & DAFTAR FITUR YANG DIGARAP');
        renderProse(quo.ruang_lingkup_fitur);
    }

    // Bab: Rencana & Timeline Waktu Pengerjaan
    if (quo.timeline_pengerjaan) {
        renderSectionBanner(String(babNum++).padStart(2, '0'), 'RENCANA & TIMELINE WAKTU PENGERJAAN');
        y = _drawTimelineDiagramPdf(doc, margin, y, contentWidth, quo.timeline_pengerjaan, ensureQuoSpace);
        renderProse(quo.timeline_pengerjaan);
    }

    // Bab: Rincian Investasi & Penawaran Harga
    renderSectionBanner(String(babNum++).padStart(2, '0'), 'RINCIAN INVESTASI & PENAWARAN HARGA');

    const _cleanSatuan = (raw) => {
        if (!raw) return 'Paket';
        const s = String(raw).trim();
        const lower = s.toLowerCase();
        if (lower === 'one_time' || lower === 'onetime' || lower === 'one-time') return 'One Time';
        if (lower === 'monthly' || lower === 'bulan' || lower === 'per_bulan') return 'Bulan';
        if (lower === 'annually' || lower === 'tahun' || lower === 'per_tahun') return 'Tahun';
        if (lower === 'daily' || lower === 'hari') return 'Hari';
        if (lower === 'jam' || lower === 'hourly') return 'Jam';
        if (lower === 'paket') return 'Paket';
        return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const items = quo.items || [];
    const tableBody = items.map((it, idx) => {
        const qNum = Number(it.kuantitas || 1);
        const qLabel = Number.isInteger(qNum) ? String(qNum) : String(qNum);
        return [
            idx + 1,
            it.deskripsi || '-',
            qLabel,
            _cleanSatuan(it.satuan),
            _safeFormatIDR(it.harga_satuan || 0),
            _safeFormatIDR(it.total_harga || 0)
        ];
    });

    doc.autoTable({
        startY: y,
        head: [['No', 'Ruang Lingkup / Layanan', 'Qty', 'Satuan', 'Biaya Satuan', 'Subtotal Biaya']],
        body: tableBody.length ? tableBody : [['1', 'Estimasi Layanan Sistem', '1', 'Paket', _safeFormatIDR(quo.total_penawaran), _safeFormatIDR(quo.total_penawaran)]],
        theme: 'grid',
        margin: { left: margin, right: margin, bottom: 20 },
        styles: {
            font: 'helvetica',
            fontSize: 8.6,
            cellPadding: { top: 3.6, right: 2.8, bottom: 3.6, left: 2.8 },
            textColor: [30, 41, 59],
            lineColor: [203, 213, 225],
            lineWidth: 0.2,
            valign: 'middle'
        },
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.2
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 15, halign: 'center' },
            3: { cellWidth: 24, halign: 'center' },
            4: { cellWidth: 32, halign: 'right' },
            5: { cellWidth: 34, halign: 'right', fontStyle: 'bold' }
        }
    });

    y = (doc.lastAutoTable?.finalY || y) + 6.0;

    // Summary calculation card (Monokrom & terlindungi dari tabrakan footer)
    const summaryW = 84;
    const summaryX = pageWidth - margin - summaryW;
    const calcRows = [
        ['Subtotal Investasi:', _safeFormatIDR(quo.subtotal || 0)]
    ];
    if (Number(quo.diskon_nilai) > 0) {
        calcRows.push(['Potongan Khusus:', `-${_safeFormatIDR(quo.diskon_nilai)}`]);
    }
    const quoTaxPct = (quo.pajak_persen !== null && quo.pajak_persen !== undefined && quo.pajak_persen !== '') ? Number(quo.pajak_persen) : 0;
    if (Number(quo.pajak_nominal || 0) > 0 || quoTaxPct > 0) {
        calcRows.push([`PPN (${quoTaxPct}%):`, _safeFormatIDR(quo.pajak_nominal || 0)]);
    }
    calcRows.push(['Total Estimasi Biaya:', _safeFormatIDR(quo.total_penawaran || 0)]);

    const summaryBoxH = 8 + calcRows.length * 6.2;
    ensureQuoSpace(summaryBoxH + 14);
    const startSummaryY = y;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(summaryX, startSummaryY, summaryW, summaryBoxH, 1.5, 1.5, 'FD');

    let sumRowY = startSummaryY + 5.5;
    calcRows.forEach(([lbl, val]) => {
        const isGrand = lbl === 'Total Estimasi Biaya:';
        if (isGrand) {
            doc.setFillColor(241, 245, 249);
            doc.rect(summaryX + 1.5, sumRowY - 4.2, summaryW - 3, 6.2, 'F');
        }
        doc.setFont('helvetica', isGrand ? 'bold' : 'normal');
        doc.setFontSize(isGrand ? 9.5 : 8.5);
        doc.setTextColor(isGrand ? 15 : 71, isGrand ? 23 : 85, isGrand ? 42 : 105);
        doc.text(lbl, summaryX + 4.0, sumRowY);
        doc.text(val, summaryX + summaryW - 4.0, sumRowY, { align: 'right' });
        sumRowY += 6.2;
    });

    // Left of Summary: Terbilang Box
    const terbilangW = contentWidth - summaryW - 4;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, startSummaryY, terbilangW, summaryBoxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('NILAI TERBILANG INVESTASI:', margin + 4.0, startSummaryY + 5.5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.0);
    doc.setTextColor(15, 23, 42);
    const terbilangStr = `${terbilang(quo.total_penawaran || 0)} Rupiah`;
    const terbilangLines = doc.splitTextToSize(terbilangStr, terbilangW - 8);
    doc.text(terbilangLines, margin + 4.0, startSummaryY + 11.5);

    y = startSummaryY + summaryBoxH + 6.5;

    // ========================================================
    // HALAMAN 2: PASAL-PASAL LEGALITAS, PEMBAYARAN & PENGESAHAN
    // ========================================================
    doc.addPage();
    y = 16;
    // Running header resmi halaman kedua
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`${companyInfo.name} · Dokumen Penawaran Resmi ${quo.nomor_penawaran}`, margin, 10);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, 12, pageWidth - margin, 12);

    // 4. Bab 03: Pasal-Pasal Hak & Kewajiban Para Pihak (Lisensi Pemakai Akhir & Tanpa Source Code)
    let rawPasal = quo.pasal_hak_kewajiban || '';
    if (!rawPasal.trim() || rawPasal.includes('source code/akses sistem sesuai kesepakatan')) {
        rawPasal = `PASAL 1 — HAK DAN KEWAJIBAN PIHAK PERTAMA (PENYEDIA JASA)
1. Pihak Pertama berkewajiban menyelesaikan pengembangan dan implementasi fitur sistem sesuai ruang lingkup yang disepakati dalam surat penawaran ini secara tepat waktu dan profesional.
2. Pihak Pertama berkewajiban menjaga kerahasiaan seluruh data, informasi bisnis, dan kredensial server milik Pihak Kedua dengan standar keamanan terbaik.
3. Pihak Pertama berhak menerima pembayaran penuh secara tepat waktu sesuai termin dan tahapan yang tercantum pada syarat pembayaran penawaran ini.

PASAL 2 — LISENSI PEMAKAI AKHIR & KETENTUAN KODE SUMBER (SOURCE CODE)
1. Pihak Kedua berhak memperoleh hak akses penggunaan sistem aplikasi semata-mata sebagai Pemakai Akhir (End-User License / Hak Pakai Operasional) untuk kebutuhan operasional bisnis internal Pihak Kedua.
2. Pihak Kedua TIDAK MENERIMA dan TIDAK MEMILIKI hak kepemilikan atas Source Code (Kode Sumber), hak kekayaan intelektual (HAKI), algoritma, arsitektur, maupun kerangka dasar sistem perangkat lunak yang dibangun oleh Pihak Pertama.
3. Seluruh Source Code, hak cipta, dan hak milik industri tetap menjadi hak milik mutlak dan eksklusif Pihak Pertama. Pihak Kedua dilarang keras menyalin, membongkar (reverse engineer), mendekompilasi, memodifikasi kode sumber tanpa izin tertulis, mendistribusikan ulang, menyewakan, atau menjual kembali aplikasi maupun bagian dari kode sistem kepada pihak ketiga mana pun.
4. Pihak Kedua berkewajiban menunjuk perwakilan PIC resmi untuk koordinasi teknis, memberikan data/materi yang diperlukan tepat waktu, serta melakukan pengujian serah terima (UAT).
5. Permintaan penambahan fitur di luar daftar ruang lingkup penawaran ini akan dicatat sebagai pekerjaan tambahan (Change Request) dengan estimasi biaya dan waktu terpisah.

PASAL 3 — GARANSI SISTEM & DUKUNGAN PEMELIHARAAN
1. Pihak Pertama memberikan garansi perbaikan kerusakan teknis (bug/error) secara cuma-cuma selama masa pemeliharaan terhitung sejak tanggal serah terima sistem (BAST), selama tidak terjadi perubahan alur atau modifikasi dari pihak luar.`;
    } else if (rawPasal.includes('source code') && !rawPasal.includes('TIDAK MENERIMA dan TIDAK MEMILIKI hak kepemilikan atas Source Code')) {
        rawPasal = rawPasal.replace(
            /Pihak Kedua berhak menerima hasil serah terima sistem.*?source code\/akses sistem[^\n]*/gi,
            'Pihak Kedua berhak memperoleh hak akses penggunaan sistem aplikasi semata-mata sebagai Pemakai Akhir (End-User License) untuk operasional bisnis internal dan TIDAK MENERIMA penyerahan atau kepemilikan Source Code sistem'
        );
    }

    renderSectionBanner(String(babNum++).padStart(2, '0'), 'PASAL-PASAL HAK & KEWAJIBAN PARA PIHAK');
    renderProse(rawPasal);

    // Bab: Syarat & Ketentuan Pembayaran
    if (quo.syarat_ketentuan) {
        renderSectionBanner(String(babNum++).padStart(2, '0'), 'SYARAT & KETENTUAN PEMBAYARAN');
        renderProse(quo.syarat_ketentuan);
    }

    // Bab: Catatan Tambahan (jika ada)
    if (quo.catatan_klien) {
        renderSectionBanner(String(babNum++).padStart(2, '0'), 'CATATAN KHUSUS & KETERANGAN TAMBAHAN');
        renderProse(quo.catatan_klien);
    }

    // 7. Pengesahan & Tanda Tangan Dua Belah Pihak
    ensureQuoSpace(35);
    const sigW = 62;
    // Left: Client approval
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.0);
    doc.setTextColor(100, 116, 139);
    doc.text('Disetujui & Diterima oleh (Pihak Pertama),', margin, y);
    if (quo.signature_data && typeof doc.addImage === 'function') {
        try {
            doc.addImage(quo.signature_data, 'PNG', margin + 4, y + 1, 40, 14);
        } catch (_) {}
    }
    doc.line(margin, y + 17, margin + sigW, y + 17);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(quo.signed_by_name || quo.penanggung_jawab || 'Pelanggan / Klien'), margin, y + 21.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text(String(quo.signed_by_position || quo.nama_perusahaan || 'Calon Klien'), margin, y + 25.5);

    // Right: Authorized Provider
    const rSigX = pageWidth - margin - sigW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.0);
    doc.setTextColor(100, 116, 139);
    doc.text('Diterbitkan secara Sah oleh (Pihak Kedua),', rSigX, y);
    doc.line(rSigX, y + 17, pageWidth - margin, y + 17);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(companyInfo.name), rSigX, y + 21.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Tim Operasional & Komersial', rSigX, y + 25.5);

    // Apply Document Watermark across all pages (DISETUJUI / DITOLAK / DRAFT / DIBATALKAN / KADALUARSA)
    _applyDocumentWatermark(doc, quo.status, 'quotation');

    // Multi-page Running Footer
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`${companyInfo.name} · Dokumen Penawaran Resmi ${quo.nomor_penawaran}`, margin, pageHeight - 6.5);
        doc.text(`Halaman ${p} dari ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
    }

    const safeFilename = `penawaran_${String(quo.nomor_penawaran || 'quotation').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    if (output === 'bloburl') {
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        return { blob, blobUrl, filename: safeFilename };
    }
    doc.save(safeFilename);
    return { filename: safeFilename };
}

function _fillWhatsAppTemplate(templateStr, data) {
    if (!templateStr) return '';
    return templateStr.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
        return data[key] !== undefined ? String(data[key]) : match;
    });
}

/**
 * Open pre-formatted WhatsApp billing reminder for invoice
 */

export function downloadQuotationWord(quo) {
    if (!quo) return;
    const companyInfo = _resolveCompanyInfo(quo);
    const safeFilename = `penawaran_${String(quo.nomor_penawaran || 'quotation').replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;

    const clientName = quo.nama_perusahaan || quo.penanggung_jawab || 'Calon Klien';
    const picStr = `UP / PIC: ${quo.penanggung_jawab || '-'} · Kontak: ${quo.client_telepon || quo.client_email || '-'}`;
    const clientAddr = quo.client_alamat ? `${quo.client_alamat}${quo.client_kota ? ' · ' + quo.client_kota : ''}` : 'Alamat terdaftar di sistem';

    const projTitle = quo.nama_project ? `Proyek: ${quo.nama_project}` : 'Pengembangan Sistem & Layanan IT';
    const totalPenawaran = _safeFormatIDR(quo.total_penawaran || 0);

    const _cleanSat = (raw) => {
        if (!raw) return 'Paket';
        const s = String(raw).trim();
        const lower = s.toLowerCase();
        if (lower === 'one_time' || lower === 'onetime' || lower === 'one-time') return 'One Time';
        if (lower === 'monthly' || lower === 'bulan') return 'Bulan';
        if (lower === 'annually' || lower === 'tahun') return 'Tahun';
        return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const items = quo.items || [];
    const itemRowsHtml = items.map((it, idx) => `
        <tr>
            <td style="text-align:center; padding:6pt 4pt; border:1pt solid #cbd5e1;">${idx + 1}</td>
            <td style="padding:6pt 8pt; border:1pt solid #cbd5e1;"><strong>${escapeHtml(it.deskripsi || '-')}</strong></td>
            <td style="text-align:center; padding:6pt 4pt; border:1pt solid #cbd5e1;">${it.kuantitas || 1}</td>
            <td style="text-align:center; padding:6pt 4pt; border:1pt solid #cbd5e1; white-space:nowrap;">${escapeHtml(_cleanSat(it.satuan))}</td>
            <td style="text-align:right; padding:6pt 8pt; border:1pt solid #cbd5e1; font-family:Consolas, monospace;">${_safeFormatIDR(it.harga_satuan || 0)}</td>
            <td style="text-align:right; padding:6pt 8pt; border:1pt solid #cbd5e1; font-family:Consolas, monospace; font-weight:bold;">${_safeFormatIDR(it.total_harga || 0)}</td>
        </tr>
    `).join('');

    const calcRows = [
        `<tr><td style="border:none; text-align:right; padding:4pt 8pt;"><strong>Subtotal Investasi:</strong></td><td style="border:none; text-align:right; padding:4pt 8pt; font-family:Consolas, monospace;">${_safeFormatIDR(quo.subtotal || 0)}</td></tr>`
    ];
    if (Number(quo.diskon_nilai) > 0) {
        calcRows.push(`<tr><td style="border:none; text-align:right; padding:4pt 8pt; color:#dc2626;"><strong>Potongan Khusus:</strong></td><td style="border:none; text-align:right; padding:4pt 8pt; font-family:Consolas, monospace; color:#dc2626;">-${_safeFormatIDR(quo.diskon_nilai)}</td></tr>`);
    }
    const quoPrintTaxPct = (quo.pajak_persen !== null && quo.pajak_persen !== undefined && quo.pajak_persen !== '') ? Number(quo.pajak_persen) : 0;
    calcRows.push(`<tr><td style="border:none; text-align:right; padding:4pt 8pt;"><strong>PPN (${quoPrintTaxPct}%):</strong></td><td style="border:none; text-align:right; padding:4pt 8pt; font-family:Consolas, monospace;">${_safeFormatIDR(quo.pajak_nominal || 0)}</td></tr>`);
    calcRows.push(`<tr style="background:#e0e7ff;"><td style="border:1pt solid #c7d2fe; text-align:right; padding:6pt 8pt; font-size:11pt; color:#3730a3;"><strong>TOTAL ESTIMASI BIAYA:</strong></td><td style="border:1pt solid #c7d2fe; text-align:right; padding:6pt 8pt; font-size:11pt; font-weight:bold; font-family:Consolas, monospace; color:#3730a3;">${totalPenawaran}</td></tr>`);

    const formatProseHtml = (txt) => {
        if (!txt) return '';
        return txt.split('\n').map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '<br>';
            if (/^(PASAL\s+\d+|BAB\s+[IVXLC]+|[A-Z0-9\s.—]{4,}:)/i.test(trimmed)) {
                return `<h4 style="color:#0f172a; margin-top:12pt; margin-bottom:4pt;">${escapeHtml(trimmed)}</h4>`;
            }
            if (/^(\d+\.|\([a-z0-9]+\))\s+/i.test(trimmed)) {
                return `<p style="margin:4pt 0 4pt 18pt; text-indent:-18pt; text-align:justify; line-height:1.45;">${escapeHtml(trimmed)}</p>`;
            }
            if (/^([•\-\*])\s+/i.test(trimmed)) {
                return `<p style="margin:3pt 0 3pt 32pt; text-indent:-14pt; text-align:justify; line-height:1.45;">${escapeHtml(trimmed)}</p>`;
            }
            return `<p style="margin:6pt 0; text-align:justify; line-height:1.45;">${escapeHtml(trimmed)}</p>`;
        }).join('');
    };

    let rawPasal = quo.pasal_hak_kewajiban || '';
    if (!rawPasal.trim() || rawPasal.includes('source code/akses sistem sesuai kesepakatan')) {
        rawPasal = `PASAL 1 — HAK DAN KEWAJIBAN PIHAK PERTAMA (PENYEDIA JASA)
1. Pihak Pertama berkewajiban menyelesaikan pengembangan dan implementasi fitur sistem sesuai ruang lingkup yang disepakati dalam surat penawaran ini secara tepat waktu dan profesional.
2. Pihak Pertama berkewajiban menjaga kerahasiaan seluruh data, informasi bisnis, dan kredensial server milik Pihak Kedua dengan standar keamanan terbaik.
3. Pihak Pertama berhak menerima pembayaran penuh secara tepat waktu sesuai termin dan tahapan yang tercantum pada syarat pembayaran penawaran ini.

PASAL 2 — LISENSI PEMAKAI AKHIR & KETENTUAN KODE SUMBER (SOURCE CODE)
1. Pihak Kedua berhak memperoleh hak akses penggunaan sistem aplikasi semata-mata sebagai Pemakai Akhir (End-User License / Hak Pakai Operasional) untuk kebutuhan operasional bisnis internal Pihak Kedua.
2. Pihak Kedua TIDAK MENERIMA dan TIDAK MEMILIKI hak kepemilikan atas Source Code (Kode Sumber), hak kekayaan intelektual (HAKI), algoritma, arsitektur, maupun kerangka dasar sistem perangkat lunak yang dibangun oleh Pihak Pertama.
3. Seluruh Source Code, hak cipta, dan hak milik industri tetap menjadi hak milik mutlak dan eksklusif Pihak Pertama. Pihak Kedua dilarang keras menyalin, membongkar (reverse engineer), mendekompilasi, memodifikasi kode sumber tanpa izin tertulis, mendistribusikan ulang, menyewakan, atau menjual kembali aplikasi maupun bagian dari kode sistem kepada pihak ketiga mana pun.
4. Pihak Kedua berkewajiban menunjuk perwakilan PIC resmi untuk koordinasi teknis, memberikan data/materi yang diperlukan tepat waktu, serta melakukan pengujian serah terima (UAT).
5. Permintaan penambahan fitur di luar daftar ruang lingkup penawaran ini akan dicatat sebagai pekerjaan tambahan (Change Request) dengan estimasi biaya dan waktu terpisah.

PASAL 3 — GARANSI SISTEM & DUKUNGAN PEMELIHARAAN
1. Pihak Pertama memberikan garansi perbaikan kerusakan teknis (bug/error) secara cuma-cuma selama masa pemeliharaan terhitung sejak tanggal serah terima sistem (BAST), selama tidak terjadi perubahan alur atau modifikasi dari pihak luar.`;
    }

    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Surat Penawaran - ${escapeHtml(quo.nomor_penawaran)}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page {
    size: 21.0cm 29.7cm;
    margin: 2.0cm 2.0cm 2.0cm 2.0cm;
    mso-page-orientation: portrait;
}
body {
    font-family: 'Segoe UI', Calibri, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.45;
    color: #1e293b;
    background: #ffffff;
}
.header-table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; }
.header-table td { border: none; padding: 2pt 0; vertical-align: top; }
.banner {
    background-color: #f1f5f9;
    border-left: 4pt solid #4f46e5;
    padding: 6pt 10pt;
    font-weight: bold;
    font-size: 10.5pt;
    color: #0f172a;
    margin-top: 14pt;
    margin-bottom: 8pt;
}
.card-table {
    width: 100%;
    border-collapse: collapse;
    background-color: #f8fafc;
    border: 1pt solid #e2e8f0;
    margin-bottom: 14pt;
}
.card-table td {
    padding: 8pt 10pt;
    border: none;
    vertical-align: top;
}
.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8pt;
    margin-bottom: 8pt;
}
.data-table th {
    background-color: #0f172a;
    color: #ffffff;
    font-size: 9pt;
    font-weight: bold;
    padding: 6pt 8pt;
    border: 1pt solid #0f172a;
}
.data-table td {
    border: 1pt solid #cbd5e1;
    padding: 5pt 8pt;
    font-size: 9.5pt;
    vertical-align: middle;
}
.summary-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6pt;
}
.summary-table td {
    padding: 4pt 8pt;
}
.terbilang-box {
    background-color: #f8fafc;
    border: 1pt solid #e2e8f0;
    padding: 8pt 10pt;
    font-style: italic;
    color: #0f172a;
    font-size: 9.5pt;
}
.sig-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 24pt;
}
.sig-table td {
    border: none;
    padding: 4pt 10pt;
    vertical-align: top;
    width: 50%;
}
</style>
</head>
<body>

<table class="header-table">
    <tr>
        <td style="width:55%;">
            <div style="font-size:18pt; font-weight:bold; color:#0f172a; letter-spacing:-0.5pt;">${escapeHtml(companyInfo.name)}</div>
            <div style="font-size:8.5pt; color:#64748b; margin-top:2pt;">Enterprise Software Development & Digital Transformation</div>
            <div style="font-size:8.5pt; color:#64748b; margin-top:2pt;">${escapeHtml(companyInfo.address)}</div>
            <div style="font-size:8.5pt; color:#64748b;">Kontak: ${escapeHtml(companyInfo.phone)} · Email: ${escapeHtml(companyInfo.email)}</div>
        </td>
        <td style="width:45%; text-align:right;">
            <div style="display:inline-block; background:#e0e7ff; color:#3730a3; padding:2pt 6pt; border-radius:3pt; font-weight:bold; font-size:6.8pt;">${escapeHtml(String(quo.status || 'DRAFT').toUpperCase())}</div>
            <div style="font-size:10.5pt; font-weight:bold; color:#4f46e5; margin-top:2.5pt;">SURAT PENAWARAN HARGA</div>
            <div style="font-size:8.8pt; font-weight:bold; color:#1e293b; margin-top:1.5pt;">${escapeHtml(quo.nomor_penawaran || 'QUO-DRAFT')}</div>
            <div style="font-size:6.8pt; color:#64748b; margin-top:1.5pt;">Tanggal Terbit: ${_safeFormatDate(quo.tanggal_penawaran)}</div>
            <div style="font-size:6.8pt; color:#be123c; font-weight:bold; margin-top:1pt;">Masa Berlaku s/d: ${_safeFormatDate(quo.berlaku_hingga)}</div>
        </td>
    </tr>
</table>

<hr style="border:none; border-top:1.5pt solid #cbd5e1; margin:8pt 0 12pt 0;">

<table class="card-table">
    <tr>
        <td style="width:50%; border-right:1pt solid #e2e8f0;">
            <div style="font-size:8pt; font-weight:bold; color:#64748b;">DITUJUKAN KEPADA (CALON KLIEN):</div>
            <div style="font-size:12pt; font-weight:bold; color:#0f172a; margin-top:3pt;">${escapeHtml(clientName)}</div>
            <div style="font-size:9pt; color:#475569; margin-top:2pt;">${escapeHtml(picStr)}</div>
            <div style="font-size:8.5pt; color:#64748b; margin-top:2pt;">${escapeHtml(clientAddr)}</div>
        </td>
        <td style="width:50%;">
            <div style="font-size:8pt; font-weight:bold; color:#64748b;">INFORMASI PROYEK & ANGGARAN:</div>
            <div style="font-size:11pt; font-weight:bold; color:#4f46e5; margin-top:3pt;">${escapeHtml(projTitle)}</div>
            <div style="font-size:9.5pt; color:#475569; margin-top:2pt;">Total Estimasi: <strong>${totalPenawaran}</strong></div>
            <div style="font-size:8.5pt; color:#64748b; margin-top:2pt;">Status Dokumen: ${escapeHtml(String(quo.status || 'Draft').toUpperCase())}</div>
        </td>
    </tr>
</table>

${quo.salam_pembuka ? formatProseHtml(quo.salam_pembuka) : ''}

${quo.ruang_lingkup_fitur ? `
    <div class="banner">01. RUANG LINGKUP & DAFTAR FITUR YANG DIGARAP</div>
    ${formatProseHtml(quo.ruang_lingkup_fitur)}
` : ''}

${quo.timeline_pengerjaan ? `
    <div class="banner">${quo.ruang_lingkup_fitur ? '02' : '01'}. RENCANA & TIMELINE WAKTU PENGERJAAN</div>
    ${renderTimelineDiagramHtml(quo.timeline_pengerjaan)}
    ${formatProseHtml(quo.timeline_pengerjaan)}
` : ''}

<div class="banner">${(quo.ruang_lingkup_fitur && quo.timeline_pengerjaan) ? '03' : ((quo.ruang_lingkup_fitur || quo.timeline_pengerjaan) ? '02' : '01')}. RINCIAN INVESTASI & PENAWARAN HARGA</div>

<table class="data-table">
    <thead>
        <tr>
            <th style="width:6%; text-align:center;">No</th>
            <th style="width:44%;">Ruang Lingkup / Layanan</th>
            <th style="width:8%; text-align:center;">Qty</th>
            <th style="width:14%; text-align:center;">Satuan</th>
            <th style="width:14%; text-align:right;">Estimasi Biaya Satuan</th>
            <th style="width:14%; text-align:right;">Subtotal Biaya</th>
        </tr>
    </thead>
    <tbody>
        ${itemRowsHtml || '<tr><td colspan="6" style="text-align:center;">Layanan Sistem</td></tr>'}
    </tbody>
</table>

<table style="width:100%; border-collapse:collapse; margin-top:6pt;">
    <tr>
        <td style="width:52%; vertical-align:top; border:none; padding-right:10pt;">
            <div class="terbilang-box">
                <div style="font-size:7.5pt; font-weight:bold; color:#64748b; text-transform:uppercase;">Nilai Terbilang Investasi:</div>
                <div style="font-size:10pt; font-weight:bold; color:#0f172a; margin-top:4pt;">### ${escapeHtml(terbilang(quo.total_penawaran || 0))} Rupiah ###</div>
            </div>
        </td>
        <td style="width:48%; vertical-align:top; border:none;">
            <table class="summary-table">
                ${calcRows.join('')}
            </table>
        </td>
    </tr>
</table>

<br style="page-break-before:always;">

<div class="banner">03. PASAL-PASAL HAK & KEWAJIBAN PARA PIHAK</div>
${formatProseHtml(rawPasal)}

${quo.syarat_ketentuan ? `
    <div class="banner">04. SYARAT & KETENTUAN PEMBAYARAN</div>
    ${formatProseHtml(quo.syarat_ketentuan)}
` : ''}

${quo.catatan_klien ? `
    <div class="banner">05. CATATAN KHUSUS & KETERANGAN TAMBAHAN</div>
    ${formatProseHtml(quo.catatan_klien)}
` : ''}

<table class="sig-table">
    <tr>
        <td>
            <div style="font-size:8.5pt; color:#64748b;">Disetujui & Diterima oleh (Pihak Pertama),</div>
            <div style="height:60pt;"></div>
            <div style="border-top:1pt solid #0f172a; width:75%; padding-top:4pt;">
                <strong>${escapeHtml(quo.signed_by_name || quo.penanggung_jawab || 'Pelanggan / Klien')}</strong><br>
                <span style="font-size:8.5pt; color:#64748b;">${escapeHtml(quo.signed_by_position || quo.nama_perusahaan || 'Calon Klien')}</span>
            </div>
        </td>
        <td style="text-align:right;">
            <div style="font-size:8.5pt; color:#64748b;">Diterbitkan secara Sah oleh (Pihak Kedua),</div>
            <div style="height:60pt;"></div>
            <div style="border-top:1pt solid #0f172a; width:75%; margin-left:auto; padding-top:4pt; text-align:right;">
                <strong>${escapeHtml(companyInfo.name)}</strong><br>
                <span style="font-size:8.5pt; color:#64748b;">Tim Operasional & Komersial</span>
            </div>
        </td>
    </tr>
</table>

</body>
</html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (typeof window !== 'undefined' && window.App?.toast) {
        window.App.toast('Dokumen Word penawaran berhasil diunduh (dapat diedit bebas di Word/Docs)', 'success');
    }
}

/**
 * Universal Status Badge Builder (Linear / Stripe Grade)
 * Menghasilkan HTML badge status berkelas dengan solid indicator dot, translucent tint, dan typography rapi
 */
