// assets/js/core/pdf/reports.js — Ekspor PDF Laporan Finansial
import { _ensurePdfLibs, _PDF_TONES, _CRUDWORKS_OFFICIAL_LOGO_BASE64, _safeFormatDate } from "./shared.js";

/**
 * Generate structured accounting PDF report using jsPDF + AutoTable (download or inline bloburl)
 */
export async function exportPdf({
    filename = 'laporan.pdf',
    title = 'Laporan Keuangan',
    subtitle = '',
    orientation = 'portrait',
    output = 'download',
    showSignature = true,
    summaryCards = [],
    sections = []
} = {}) {
    const jsPDF = await _ensurePdfLibs();
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    const bottomLimit = pageHeight - 16;

    const appName = window.App?.getSetting?.('app_name', 'CRUDWorks ERP') || 'CRUDWorks ERP';
    const companyName = window.App?.getSetting?.('company_name', 'PT CRUDWorks Media Tama') || 'PT CRUDWorks Media Tama';
    const companyAddress = window.App?.getSetting?.('company_address', 'Jl. Rasuna Said Kav. B4, Jakarta Selatan, 12920') || 'Jl. Rasuna Said Kav. B4, Jakarta Selatan, 12920';
    const companyPhone = window.App?.getSetting?.('company_phone', '(021) 555-0199') || '(021) 555-0199';
    const companyNpwp = window.App?.getSetting?.('company_npwp', '01.234.567.8-012.000') || '01.234.567.8-012.000';
    const companyLeader = window.App?.getSetting?.('company_leader', 'Direktur Operasional') || 'Direktur Operasional';
    const companyLeaderTitle = window.App?.getSetting?.('company_leader_title', 'Finance & Operation') || 'Finance & Operation';
    const printedBy = window.App?.user?.nama_lengkap || window.App?.user?.username || 'Sistem';
    const printedAt = formatDateTime(new Date().toISOString().slice(0, 16).replace('T', ' '));

    // Top primary dual-accent bars (Seragam di semua dokumen)
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 4, 'F');
    doc.setFillColor(79, 70, 229); // modern indigo-600
    doc.rect(0, 4, pageWidth, 1.5, 'F');

    let y = 11.5;
    const logoW = 46;
    const logoH = 46 / 5.04; // 9.12mm (Rasio aspek resmi logo.png)

    // Left: Official CRUDWorks Brand Logo
    try {
        doc.addImage(_CRUDWORKS_OFFICIAL_LOGO_BASE64, 'PNG', margin, y, logoW, logoH);
    } catch (e) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text(String(companyName).toUpperCase(), margin, y + 6);
    }

    // Right: Document Badge & Meta Info
    let rY = 11;
    const badgeText = 'DOKUMEN LAPORAN RESMI';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    const badgeW = doc.getTextWidth(badgeText) + 8;
    const badgeH = 5.2;
    const badgeX = pageWidth - margin - badgeW;
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.setLineWidth(0.25);
    doc.roundedRect(badgeX, rY, badgeW, badgeH, 1.6, 1.6, 'FD');
    doc.setTextColor(67, 56, 202);
    doc.text(badgeText, badgeX + 4, rY + 3.6);

    rY += badgeH + 4.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Dicetak: ${printedAt}`, pageWidth - margin, rY, { align: 'right' });

    rY += 3.8;
    doc.text(`${appName} · Oleh: ${printedBy}`, pageWidth - margin, rY, { align: 'right' });

    // Left: Company Address & Contact below logo
    let compY = y + logoH + 3.5;
    const contactParts = [];
    if (companyAddress) contactParts.push(companyAddress);
    if (companyPhone) contactParts.push(`Telp: ${companyPhone}`);
    if (companyNpwp) contactParts.push(`NPWP: ${companyNpwp}`);
    if (contactParts.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(100, 116, 139);
        doc.text(contactParts.join(' · '), margin, compY, { maxWidth: contentWidth * 0.58 });
        compY += 4.0;
    }

    y = Math.max(compY, rY) + 3.5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.35);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5.5;

    // Report Title & Subtitle Banner
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(String(title), margin, y);

    if (subtitle) {
        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.2);
        doc.setTextColor(79, 70, 229); // indigo-600 subtitle
        const subLines = doc.splitTextToSize(String(subtitle), contentWidth);
        doc.text(subLines, margin, y);
        y += (subLines.length - 1) * 4;
    }
    y += 4;

    const ensureSpace = (needed = 18) => {
        if (y + needed > bottomLimit) {
            doc.addPage();
            y = 14;
        }
    };

    // Summary KPI cards
    if (Array.isArray(summaryCards) && summaryCards.length > 0) {
        const cols = Math.min(summaryCards.length, 4);
        const gap = 3;
        const cardW = (contentWidth - gap * (cols - 1)) / cols;
        const cardH = 15.5;

        for (let i = 0; i < summaryCards.length; i += cols) {
            ensureSpace(cardH + 3);
            const rowCards = summaryCards.slice(i, i + cols);
            rowCards.forEach((card, idx) => {
                const t = _PDF_TONES[card.tone] || _PDF_TONES.default;
                const x = margin + idx * (cardW + gap);
                doc.setFillColor(...t.bg);
                doc.setDrawColor(...t.border);
                doc.setLineWidth(0.25);
                doc.roundedRect(x, y, cardW, cardH, 1.8, 1.8, 'FD');

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(100, 116, 139);
                doc.text(String(card.label || ''), x + 2.8, y + 5, { maxWidth: cardW - 5.6 });

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9.5);
                doc.setTextColor(...t.text);
                doc.text(String(card.value ?? '-'), x + 2.8, y + 11.5, { maxWidth: cardW - 5.6 });
            });
            y += cardH + 3.5;
        }
        y += 1.5;
    }

    // Content sections
    for (const sec of sections) {
        const type = sec.type || 'table';

        if (type === 'sectionTitle') {
            ensureSpace(11);
            const t = _PDF_TONES[sec.tone] || _PDF_TONES.info;
            doc.setFillColor(...t.bg);
            doc.setDrawColor(...t.border);
            doc.roundedRect(margin, y, contentWidth, 7.5, 1.5, 1.5, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(...t.text);
            doc.text(String(sec.heading || ''), margin + 3, y + 5);
            if (sec.rightText) {
                doc.text(String(sec.rightText), pageWidth - margin - 3, y + 5, { align: 'right' });
            }
            y += 10;
            continue;
        }

        if (type === 'banner') {
            const hasSub = Boolean(sec.sublabel);
            const bannerH = hasSub ? 14 : 10;
            ensureSpace(bannerH + 3);
            const t = _PDF_TONES[sec.tone] || _PDF_TONES.dark;
            doc.setFillColor(...t.bg);
            doc.setDrawColor(...t.border);
            doc.setLineWidth(0.35);
            doc.roundedRect(margin, y, contentWidth, bannerH, 1.8, 1.8, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(...t.text);
            doc.text(String(sec.label || ''), margin + 3.5, y + (hasSub ? 5.5 : 6.5));

            if (hasSub) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.2);
                if (sec.tone === 'dark') {
                    doc.setTextColor(203, 213, 225);
                } else {
                    doc.setTextColor(71, 85, 105);
                }
                doc.text(String(sec.sublabel), margin + 3.5, y + 10.5, { maxWidth: contentWidth * 0.64 });
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(...t.text);
            doc.text(String(sec.value ?? ''), pageWidth - margin - 3.5, y + (hasSub ? 8 : 6.6), { align: 'right' });

            y += bannerH + 5;
            continue;
        }

        if (type === 'keyValueGrid') {
            const items = sec.items || [];
            const boxH = 8 + items.length * 6.2 + 2;
            ensureSpace(boxH + 3);
            const startBoxY = y;
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.25);
            doc.roundedRect(margin, startBoxY, contentWidth, boxH, 1.8, 1.8, 'FD');

            let rowY = startBoxY + 5.5;
            if (sec.heading) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.2);
                doc.setTextColor(51, 65, 85);
                doc.text(String(sec.heading), margin + 3.5, rowY);
                rowY += 3;
                doc.setDrawColor(226, 232, 240);
                doc.line(margin + 3.5, rowY - 1.2, pageWidth - margin - 3.5, rowY - 1.2);
                rowY += 3.5;
            }

            items.forEach((it) => {
                if (it.dividerTop) {
                    doc.setDrawColor(203, 213, 225);
                    doc.line(margin + 3.5, rowY - 3.6, pageWidth - margin - 3.5, rowY - 3.6);
                }
                const tone = _PDF_TONES[it.tone] || _PDF_TONES.default;
                doc.setFont('helvetica', it.bold ? 'bold' : 'normal');
                doc.setFontSize(8);
                doc.setTextColor(it.bold ? 15 : 71, it.bold ? 23 : 85, it.bold ? 42 : 105);
                doc.text(String(it.label || ''), margin + 3.5, rowY, { maxWidth: contentWidth * 0.65 });

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...tone.text);
                doc.text(String(it.value ?? '-'), pageWidth - margin - 3.5, rowY, { align: 'right' });
                rowY += 6;
            });

            y = startBoxY + boxH + 4.5;
            continue;
        }

        // Default: table section
        if (sec.heading) {
            ensureSpace(16);
            const headingTone = _PDF_TONES[sec.tone] || _PDF_TONES.default;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...headingTone.text);
            doc.text(String(sec.heading), margin, y + 1);
            y += 4;
        } else {
            ensureSpace(14);
        }

        const headFill = sec.headFill || [15, 23, 42];
        const headText = sec.headText || [255, 255, 255];
        const footFill = sec.footFill || [241, 245, 249];
        const footText = sec.footText || [15, 23, 42];
        const bodyRows = (sec.body && sec.body.length > 0)
            ? sec.body
            : [[{ content: sec.emptyText || 'Tidak ada data.', colSpan: (sec.head?.[0]?.length || sec.head?.length || 1), styles: { halign: 'center', textColor: [148, 163, 184], fontStyle: 'italic' } }]];

        doc.autoTable({
            startY: y,
            head: sec.head ? (Array.isArray(sec.head[0]) ? sec.head : [sec.head]) : undefined,
            body: bodyRows,
            foot: sec.foot ? (Array.isArray(sec.foot[0]) ? sec.foot : [sec.foot]) : undefined,
            theme: 'grid',
            showHead: 'everyPage',
            showFoot: 'lastPage',
            margin: { left: margin, right: margin, top: 14, bottom: 16 },
            styles: {
                font: 'helvetica',
                fontSize: sec.fontSize || 7.8,
                cellPadding: { top: 2.5, right: 2.8, bottom: 2.5, left: 2.8 },
                textColor: [30, 41, 59],
                lineColor: [226, 232, 240],
                lineWidth: 0.15,
                valign: 'middle'
            },
            headStyles: {
                fillColor: headFill,
                textColor: headText,
                fontStyle: 'bold',
                fontSize: 7.5
            },
            footStyles: {
                fillColor: footFill,
                textColor: footText,
                fontStyle: 'bold',
                fontSize: sec.fontSize || 7.8
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            columnStyles: sec.columnStyles || {}
        });

        y = (doc.lastAutoTable?.finalY || y) + 5;
    }

    // Optional signature block at bottom of last section if companyLeader configured
    if (companyLeader && showSignature) {
        ensureSpace(26);
        const sigX = pageWidth - margin - 52;
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Disahkan oleh,', sigX, y);
        y += 13;
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.25);
        doc.line(sigX, y, pageWidth - margin, y);
        y += 3.8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.2);
        doc.setTextColor(15, 23, 42);
        doc.text(String(companyLeader), sigX, y);
        y += 3.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(100, 116, 139);
        doc.text(String(companyLeaderTitle), sigX, y);
    }

    // Footer with page numbers across all pages
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.line(margin, pageHeight - 11.5, pageWidth - margin, pageHeight - 11.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(100, 116, 139);
        doc.text(`${companyName} · ${title}`, margin, pageHeight - 7);
        doc.text(`Halaman ${p} dari ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    }

    const outName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    if (output === 'bloburl') {
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        return { blob, blobUrl, filename: outName };
    }
    doc.save(outName);
    return { filename: outName };
}

// ============================================
// REPORT DROPDOWN MENU & INLINE PDF/CSV VIEWER
// ============================================
let _reportMenuBound = false;

function _bindReportMenuGlobalEvents() {
    if (_reportMenuBound || typeof document === 'undefined') return;
    _reportMenuBound = true;
    document.addEventListener('click', (e) => {
        if (!e.target.closest('[data-report-export]')) {
            closeReportExportMenus();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeReportExportMenus();
    });
}

