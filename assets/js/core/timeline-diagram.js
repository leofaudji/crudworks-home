// ============================================
// TIMELINE GANTT PARSER & RENDERER (HTML + PDF)
// ============================================
import { escapeHtml } from './utils.js';

export function parseTimelineGantt(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    const isWeek = /\b(?:minggu|week|mgg|w)\b/i.test(rawText) && !/\b(?:bulan|month|bln)\b/i.test(rawText);
    const unitLabel = isWeek ? 'MINGGU' : 'BULAN';

    const rows = [];
    let currentRow = null;
    let fallbackCounter = 1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const headerMatch = line.match(/^(?:Tahap\s*(\d+)[\s:—–-]+|(\d+)\.[\s:—–-]+|(\d+)\s+)(.*?)(?:\((.*?)\))?$/i);
        const hasNumberLead = /^(?:Tahap\s*\d+|\d+\.|\d+\s)/i.test(line);

        if (headerMatch && (hasNumberLead || !currentRow)) {
            if (currentRow) rows.push(currentRow);

            const rowNo = headerMatch[1] || headerMatch[2] || headerMatch[3] || String(fallbackCounter++);
            let title = (headerMatch[4] || '').trim();
            let rawPeriod = (headerMatch[5] || '').trim();

            if (!rawPeriod) {
                const pMatch = title.match(/\((.*?)\)/);
                if (pMatch) {
                    rawPeriod = pMatch[1].trim();
                    title = title.replace(/\(.*?\)/, '').trim();
                } else {
                    const colonMatch = title.match(/[:—–-]\s*(?:Bulan|Minggu)?\s*(\d+(?:\s*[-—–]\s*\d+)?)/i);
                    if (colonMatch) {
                        rawPeriod = colonMatch[1].trim();
                        title = title.replace(/[:—–-]\s*(?:Bulan|Minggu)?\s*(\d+(?:\s*[-—–]\s*\d+)?)/i, '').trim();
                    }
                }
            }

            title = title.replace(/^[—–:-]\s*/, '').trim();

            currentRow = {
                no: rowNo,
                title: title || `Aktivitas ${rowNo}`,
                rawPeriod: rawPeriod,
                deliverables: [],
                start: null,
                end: null
            };
        } else if (currentRow) {
            const cleaned = line.replace(/^[-*•]\s*/, '').trim();
            if (cleaned) {
                currentRow.deliverables.push(cleaned);
            }
        } else {
            currentRow = {
                no: String(fallbackCounter++),
                title: line.replace(/^[-*•]\s*/, '').trim(),
                rawPeriod: '',
                deliverables: [],
                start: null,
                end: null
            };
        }
    }

    if (currentRow) rows.push(currentRow);
    if (rows.length === 0) return null;

    let lastEnd = 0;
    rows.forEach(r => {
        const periodStr = r.rawPeriod || '';
        const rangeMatch = periodStr.match(/(\d+)\s*(?:[-—–s/d]|sampai|to)\s*(\d+)/i);
        const singleMatch = periodStr.match(/(\d+)/);

        if (rangeMatch) {
            r.start = parseInt(rangeMatch[1], 10);
            r.end = parseInt(rangeMatch[2], 10);
        } else if (singleMatch) {
            r.start = parseInt(singleMatch[1], 10);
            r.end = parseInt(singleMatch[1], 10);
        } else {
            r.start = lastEnd + 1;
            r.end = r.start + 1;
        }

        if (r.start > r.end) {
            const temp = r.start;
            r.start = r.end;
            r.end = temp;
        }

        lastEnd = Math.max(lastEnd, r.end);
    });

    let minPeriod = Infinity;
    let maxPeriod = -Infinity;

    rows.forEach(r => {
        if (r.start !== null && r.start < minPeriod) minPeriod = r.start;
        if (r.end !== null && r.end > maxPeriod) maxPeriod = r.end;
    });

    if (minPeriod === Infinity || maxPeriod === -Infinity || minPeriod > maxPeriod) {
        minPeriod = 1;
        maxPeriod = rows.length;
    }

    if (maxPeriod - minPeriod > 14) {
        maxPeriod = minPeriod + 14;
    }

    const periods = [];
    for (let p = minPeriod; p <= maxPeriod; p++) {
        periods.push(p);
    }

    return { unitLabel, periods, rows };
}

export function parseTimelineStages(rawText) {
    const gantt = parseTimelineGantt(rawText);
    if (!gantt) {
        return [
            { step: '01', title: 'Instalasi & Penyesuaian', duration: 'Bulan 4', deliverables: ['Instalasi sistem, konfigurasi awal, dan sosialisasi pengguna'] },
            { step: '02', title: 'Pendampingan & Penggunaan', duration: 'Bulan 5 – 9', deliverables: ['Pendampingan operasional berkala dan pengawalan aplikasi'] }
        ];
    }
    return gantt.rows.map(r => ({
        step: String(r.no).padStart(2, '0'),
        title: r.title,
        duration: r.rawPeriod ? `${gantt.unitLabel === 'BULAN' ? 'Bulan' : 'Minggu'} ${r.rawPeriod}` : `${gantt.unitLabel} ${r.start}–${r.end}`,
        deliverables: r.deliverables || []
    }));
}

export function _drawTimelineDiagramPdf(doc, margin, startY, contentWidth, timelineText, ensureQuoSpace) {
    const data = parseTimelineGantt(timelineText);
    if (!data || !data.rows || data.rows.length === 0) return startY;

    const { unitLabel, periods, rows } = data;
    const numPeriods = Math.min(Math.max(periods.length, 1), 14);

    const wNo = 12.0;
    const maxPeriodColW = 14.0;
    const minPeriodColW = 7.0;
    const wCol = Math.max(minPeriodColW, Math.min(maxPeriodColW, (contentWidth - wNo - 68.0) / numPeriods));
    const totalPeriodsW = wCol * numPeriods;
    const wKet = contentWidth - wNo - totalPeriodsW;

    const hHeaderTop = 5.2;
    const hHeaderSub = 5.0;
    const hHeader = hHeaderTop + hHeaderSub;

    ensureQuoSpace(hHeader + 16.0);

    let curY = startY;

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.rect(margin, curY, wNo, hHeader, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text('NO', margin + (wNo / 2), curY + (hHeader / 2) + 1.0, { align: 'center' });

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin + wNo, curY, wKet, hHeader, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text('KETERANGAN', margin + wNo + (wKet / 2), curY + (hHeader / 2) + 1.0, { align: 'center' });

    const periodStartX = margin + wNo + wKet;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(periodStartX, curY, totalPeriodsW, hHeaderTop, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(unitLabel, periodStartX + (totalPeriodsW / 2), curY + 3.5, { align: 'center' });

    const subY = curY + hHeaderTop;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.0);
    periods.forEach((p, idx) => {
        const colX = periodStartX + (idx * wCol);
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.rect(colX, subY, wCol, hHeaderSub, 'FD');

        doc.setTextColor(15, 23, 42);
        doc.text(String(p), colX + (wCol / 2), subY + 3.4, { align: 'center' });
    });

    curY += hHeader;

    rows.forEach(r => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        const titleLines = doc.splitTextToSize(r.title, wKet - 6.0);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.0);
        const delivLines = (r.deliverables || []).flatMap(d => doc.splitTextToSize('- ' + d, wKet - 8.0));

        const textH = (titleLines.length * 3.0) + (delivLines.length * 2.4);
        const rowH = Math.max(7.5, textH + 3.5);

        ensureQuoSpace(rowH + 2.0);

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.25);
        doc.rect(margin, curY, wNo, rowH, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(30, 41, 59);
        doc.text(String(r.no), margin + (wNo / 2), curY + (rowH / 2) + 1.0, { align: 'center' });

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.rect(margin + wNo, curY, wKet, rowH, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(15, 23, 42);
        let tY = curY + 3.8;
        titleLines.forEach(tl => {
            doc.text(tl, margin + wNo + 3.0, tY);
            tY += 3.0;
        });

        if (delivLines.length > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.0);
            doc.setTextColor(100, 116, 139);
            delivLines.forEach(dl => {
                doc.text(dl, margin + wNo + 4.5, tY);
                tY += 2.4;
            });
        }

        periods.forEach((p, idx) => {
            const colX = periodStartX + (idx * wCol);
            const isActive = (p >= r.start && p <= r.end);
            if (isActive) {
                doc.setFillColor(253, 230, 138);
            } else {
                doc.setFillColor(255, 255, 255);
            }
            doc.setDrawColor(203, 213, 225);
            doc.rect(colX, curY, wCol, rowH, 'FD');
        });

        curY += rowH;
    });

    return curY + 4.0;
}

export function renderTimelineDiagramHtml(timelineText) {
    const data = parseTimelineGantt(timelineText);
    if (!data || !data.rows || data.rows.length === 0) return '';

    const { unitLabel, periods, rows } = data;

    return `
        <div class="my-4 overflow-hidden rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs" style="min-width: 520px; border-collapse: collapse; border: 1px solid #cbd5e1;">
                    <thead>
                        <tr class="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700" style="background-color: #f1f5f9;">
                            <th rowspan="2" class="py-2.5 px-3 text-center font-bold uppercase tracking-wider border-r border-slate-300 dark:border-slate-700 w-14" style="border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #0f172a; text-align: center;">
                                NO
                            </th>
                            <th rowspan="2" class="py-2.5 px-4 text-center font-bold uppercase tracking-wider border-r border-slate-300 dark:border-slate-700" style="border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #0f172a; text-align: center;">
                                KETERANGAN
                            </th>
                            <th colspan="${periods.length}" class="py-2 px-3 text-center font-bold uppercase tracking-widest border-b border-slate-300 dark:border-slate-700" style="border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #0f172a; text-align: center;">
                                ${escapeHtml(unitLabel)}
                            </th>
                        </tr>
                        <tr class="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700" style="background-color: #f1f5f9;">
                            ${periods.map(p => `
                                <th class="py-1.5 px-2 text-center font-bold font-mono border-r border-slate-300 dark:border-slate-700 last:border-r-0 min-w-[36px]" style="border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #0f172a; text-align: center;">
                                    ${p}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                        ${rows.map(r => `
                            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                <td class="py-2.5 px-3 text-center font-semibold font-mono text-slate-700 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700 align-middle" style="border: 1px solid #cbd5e1; text-align: center;">
                                    ${escapeHtml(String(r.no))}
                                </td>
                                <td class="py-2.5 px-4 border-r border-slate-300 dark:border-slate-700 align-middle" style="border: 1px solid #cbd5e1;">
                                    <div class="font-normal text-slate-900 dark:text-slate-100 leading-snug">
                                        ${escapeHtml(r.title)}
                                    </div>
                                    ${r.deliverables && r.deliverables.length > 0 ? `
                                        <ul class="mt-1 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 list-disc list-inside">
                                            ${r.deliverables.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
                                        </ul>
                                    ` : ''}
                                </td>
                                ${periods.map(p => {
                                    const isActive = (p >= r.start && p <= r.end);
                                    return `
                                        <td class="p-0 border-r border-slate-300 dark:border-slate-700 last:border-r-0 text-center align-middle h-9 ${isActive ? 'bg-amber-200 dark:bg-amber-400/80' : 'bg-white dark:bg-slate-900'}" style="border: 1px solid #cbd5e1; ${isActive ? 'background-color: #fde68a !important;' : 'background-color: #ffffff;'}">
                                            ${isActive ? '<span class="sr-only">Aktif</span>' : ''}
                                        </td>
                                    `;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
