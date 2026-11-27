// assets/js/core/pdf/shared.js — Helper bersama untuk pembuat dokumen PDF
import { formatDate, formatRupiah, terbilang, escapeHtml } from "../utils.js";
export { terbilang, escapeHtml };

const _PDF_SCRIPT_URLS = {
    jspdf: 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
    autotable: 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js'
};

function _loadExternalScript(src) {
    return new Promise((resolve, reject) => {
        const existing = Array.from(document.scripts).find((s) => s.src === src);
        if (existing) {
            if (existing.dataset.loaded === '1') {
                resolve();
                return;
            }
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error(`Gagal memuat ${src}`)), { once: true });
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => {
            script.dataset.loaded = '1';
            resolve();
        };
        script.onerror = () => reject(new Error(`Gagal memuat ${src}`));
        document.head.appendChild(script);
    });
}

export async function _ensurePdfLibs() {
    if (!window.jspdf?.jsPDF) {
        await _loadExternalScript(_PDF_SCRIPT_URLS.jspdf);
    }
    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) {
        throw new Error('Library jsPDF gagal dimuat');
    }
    if (typeof jsPDF.API?.autoTable !== 'function') {
        await _loadExternalScript(_PDF_SCRIPT_URLS.autotable);
    }
    await _preloadCompanyLogo();
    return jsPDF;
}

let _customLogoCache = { url: '', dataUrl: '', width: 0, height: 0 };

export function _invalidateCompanyLogoCache() {
    _customLogoCache = { url: '', dataUrl: '', width: 0, height: 0 };
}

export async function _preloadCompanyLogo() {
    const logoPath = String(window.App?.getSetting?.('company_logo', '') || '').trim();
    if (!logoPath) {
        _invalidateCompanyLogoCache();
        return null;
    }
    if (_customLogoCache.url === logoPath && _customLogoCache.dataUrl) {
        return _customLogoCache;
    }
    try {
        const data = await new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const w = img.naturalWidth || img.width || 0;
                const h = img.naturalHeight || img.height || 0;
                if (!w || !h) return reject(new Error('Dimensi logo tidak valid'));
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve({ url: logoPath, dataUrl: canvas.toDataURL('image/png'), width: w, height: h });
            };
            img.onerror = () => reject(new Error('Gagal memuat logo kustom'));
            img.src = logoPath + (logoPath.includes('?') ? '&' : '?') + 'v=' + Date.now();
        });
        _customLogoCache = data;
        return data;
    } catch (e) {
        console.warn('Fallback ke logo default PDF:', e);
        return null;
    }
}

export function _drawCompanyLogo(doc, x, y, maxW = 46, maxH = 13, fallbackText = 'CRUDWORKS') {
    const logoPath = String(window.App?.getSetting?.('company_logo', '') || '').trim();
    if (logoPath && _customLogoCache.url === logoPath && _customLogoCache.dataUrl && _customLogoCache.width > 0 && _customLogoCache.height > 0) {
        try {
            const ratio = _customLogoCache.width / _customLogoCache.height;
            let drawW = maxW;
            let drawH = drawW / ratio;
            if (drawH > maxH) {
                drawH = maxH;
                drawW = drawH * ratio;
            }
            doc.addImage(_customLogoCache.dataUrl, 'PNG', x, y, drawW, drawH);
            return drawH;
        } catch (e) {
            console.warn('Gagal menyisipkan logo kustom ke PDF:', e);
        }
    }

    const defaultW = 46;
    const defaultH = 46 / 5.04; // 9.12mm (matches official logo.png 499x99 aspect ratio)
    try {
        doc.addImage(_CRUDWORKS_OFFICIAL_LOGO_BASE64, 'PNG', x, y, defaultW, defaultH);
        return defaultH;
    } catch (e) {
        console.warn('Could not add official logo to PDF:', e);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text(fallbackText, x, y + 6);
        return 9.12;
    }
}

export const _CRUDWORKS_OFFICIAL_LOGO_BASE64 = 'data:image/png;base64,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';

export const _PDF_TONES = {
    default: { bg: [248, 250, 252], border: [226, 232, 240], text: [15, 23, 42] },
    success: { bg: [236, 253, 245], border: [167, 243, 208], text: [4, 120, 87] },
    danger:  { bg: [255, 241, 242], border: [254, 205, 211], text: [190, 18, 60] },
    warning: { bg: [255, 251, 235], border: [253, 230, 138], text: [180, 83, 9] },
    info:    { bg: [239, 246, 255], border: [191, 219, 254], text: [29, 78, 216] },
    primary: { bg: [238, 242, 255], border: [199, 210, 254], text: [67, 56, 202] },
    dark:    { bg: [15, 23, 42],    border: [15, 23, 42],    text: [255, 255, 255] }
};

export function _safeFormatDate(d, fmt = null) {
    if (!d) return '-';
    try {
        if (typeof formatDate === 'function') return formatDate(d, fmt);
        if (typeof window !== 'undefined' && typeof window.App?.formatDate === 'function') {
            return window.App.formatDate(d, fmt);
        }
    } catch (_) {}
    const raw = String(d).trim().split(' ')[0].split('T')[0];
    const parts = raw.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return raw;
}

export function _safeFormatIDR(val) {
    try {
        if (typeof formatIDR === 'function') return formatIDR(val);
        if (typeof formatRupiah === 'function') return formatRupiah(val);
        if (typeof window !== 'undefined' && typeof window.App?.formatIDR === 'function') {
            return window.App.formatIDR(val);
        }
    } catch (_) {}
    const num = Number(val) || 0;
    return 'Rp ' + num.toLocaleString('id-ID');
}

/**
 * Render Modern Typographic CRUDWORKS Wordmark (No blurry round image)
 */
export function _drawDocumentWordmark(doc, margin, y, companyInfo, contentWidth) {
    const logoH = _drawCompanyLogo(doc, margin, y, 46, 13, String(companyInfo?.name || 'CRUDWORKS').toUpperCase());

    const tagline = String(companyInfo.tagline || window.App?.getSetting?.('company_tagline', '') || '').trim();
    let compY = y + logoH + 3.2;
    if (tagline) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(71, 85, 105);
        const tagLines = doc.splitTextToSize(tagline, contentWidth * 0.52);
        tagLines.forEach((tl) => {
            doc.text(tl, margin, compY);
            compY += 3.5;
        });
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    doc.setTextColor(100, 116, 139);
    doc.text(companyInfo.address, margin, compY, { maxWidth: contentWidth * 0.52 });

    compY += 3.8;
    doc.setFontSize(7.0);
    doc.text(`Email: ${companyInfo.email} · Telp: ${companyInfo.phone}`, margin, compY);

    return compY + 2.5;
}

/**
 * Apply Executive Watermark Across All Pages (Lunas / Dibatalkan / Draft / Disetujui / Ditolak)
 */
export function _applyDocumentWatermark(doc, statusKey, type = 'invoice') {
    let wm = null;
    const s = String(statusKey || '').toLowerCase();

    if (type === 'invoice') {
        if (s === 'lunas') wm = { text: 'LUNAS', color: [16, 185, 129], opacity: 0.12 };
        else if (s === 'sebagian') wm = { text: 'BAYAR SEBAGIAN', color: [245, 158, 11], opacity: 0.12 };
        else if (s === 'dibatalkan' || s === 'batal') wm = { text: 'DIBATALKAN', color: [239, 68, 68], opacity: 0.14 };
        else if (s === 'draft') wm = { text: 'DRAFT', color: [148, 163, 184], opacity: 0.11 };
        else if (s === 'jatuh_tempo') wm = { text: 'JATUH TEMPO', color: [225, 29, 72], opacity: 0.13 };
    } else {
        if (s === 'disetujui') wm = { text: 'DISETUJUI', color: [16, 185, 129], opacity: 0.12 };
        else if (s === 'ditandatangani') wm = { text: 'DITANDATANGANI', color: [16, 185, 129], opacity: 0.12 };
        else if (s === 'ditolak') wm = { text: 'DITOLAK', color: [239, 68, 68], opacity: 0.14 };
        else if (s === 'dibatalkan' || s === 'batal') wm = { text: 'DIBATALKAN', color: [239, 68, 68], opacity: 0.14 };
        else if (s === 'draft') wm = { text: 'DRAFT', color: [148, 163, 184], opacity: 0.11 };
        else if (s === 'kadaluarsa') wm = { text: 'KADALUARSA', color: [245, 158, 11], opacity: 0.13 };
    }

    if (!wm) return;

    const totalPages = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;

    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.saveGraphicsState();
        if (typeof doc.GState === 'function') {
            doc.setGState(new doc.GState({ opacity: wm.opacity }));
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(52);
        doc.setTextColor(wm.color[0], wm.color[1], wm.color[2]);
        doc.text(wm.text, centerX, centerY, { align: 'center', angle: 45 });
        doc.restoreGraphicsState();
    }
}

/**
 * Shared Minimalist Editorial Prose & Pasal Renderer (Seragam SPK, Penawaran & BAST)
 */
export function createMinimalProseRenderer(doc, { margin, contentWidth, pageWidth, getY, setY, ensureSpace }) {
    return function renderProse(text, options = {}) {
        if (!text || !String(text).trim()) return;
        const fontSize = options.fontSize || 9.0;
        const lineHeight = options.lineHeight || 5.1;
        const factor = options.factor || 1.52;
        const lines = String(text).trim().split('\n');

        lines.forEach((line) => {
            const raw = line.trim().replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
            if (!raw) {
                setY(getY() + 2.2);
                return;
            }

            const isTitle = /^(PASAL\s+\d+|BAB\s+[IVXLC]+)/i.test(raw) || /^[A-Z0-9\s.&()/—-]{4,}:$/.test(raw);
            const numMatch = raw.match(/^(\d+\.|\([a-z0-9]+\))\s+(.*)/s);
            const bulletMatch = raw.match(/^([•\-\*–])\s+(.*)/s);

            if (isTitle) {
                const pasalMatch = raw.match(/^(PASAL\s+\d+)\s*[—–-]\s*(.+)$/i);
                ensureSpace(pasalMatch ? 32 : lineHeight + 14);
                setY(getY() + 4.0);
                doc.setTextColor(15, 23, 42);
                if (pasalMatch) {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(fontSize + 0.8);
                    doc.text(pasalMatch[1].toUpperCase(), pageWidth / 2, getY() + 3.4, { align: 'center' });
                    setY(getY() + lineHeight + 0.4);

                    const subLines = doc.splitTextToSize(pasalMatch[2].trim(), contentWidth);
                    subLines.forEach((sl) => {
                        ensureSpace(lineHeight + 1.5);
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(fontSize + 0.2);
                        doc.text(sl, pageWidth / 2, getY() + 3.4, { align: 'center' });
                        setY(getY() + lineHeight + 0.4);
                    });
                } else {
                    const titleLines = doc.splitTextToSize(raw, contentWidth);
                    titleLines.forEach((tl) => {
                        ensureSpace(lineHeight + 1.5);
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(fontSize + 0.6);
                        doc.text(tl, pageWidth / 2, getY() + 3.4, { align: 'center' });
                        setY(getY() + lineHeight + 0.5);
                    });
                }
                setY(getY() + 2.4);
            } else if (numMatch) {
                const prefix = numMatch[1];
                const bodyText = numMatch[2].trim();
                const gutterW = 6.0;
                const bodyX = margin + gutterW;
                const targetW = contentWidth - gutterW;

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(fontSize);
                const wrappedBody = doc.splitTextToSize(bodyText, targetW);
                const blockHeight = wrappedBody.length * lineHeight;
                ensureSpace(Math.min(blockHeight + 3.0, 26));

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(fontSize);
                doc.setTextColor(15, 23, 42);
                doc.text(prefix, margin, getY() + 3.4);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(fontSize);
                doc.setTextColor(30, 41, 59);
                doc.text(bodyText, bodyX, getY() + 3.4, { maxWidth: targetW, align: 'justify', lineHeightFactor: factor });

                setY(getY() + blockHeight + 1.8);
            } else if (bulletMatch) {
                const bodyText = bulletMatch[2].trim();
                const indentX = margin + 6.0;
                const gutterW = 4.5;
                const bodyX = indentX + gutterW;
                const targetW = contentWidth - 6.0 - gutterW;

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(fontSize);
                const wrappedBody = doc.splitTextToSize(bodyText, targetW);
                const blockHeight = wrappedBody.length * lineHeight;
                ensureSpace(Math.min(blockHeight + 3.0, 26));

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(fontSize);
                doc.setTextColor(100, 116, 139);
                doc.text('–', indentX, getY() + 3.4);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(fontSize);
                doc.setTextColor(51, 65, 85);
                doc.text(bodyText, bodyX, getY() + 3.4, { maxWidth: targetW, align: 'justify', lineHeightFactor: factor });

                setY(getY() + blockHeight + 2.4);
            } else {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(fontSize);
                doc.setTextColor(30, 41, 59);
                const wrappedLine = doc.splitTextToSize(raw, contentWidth);
                const blockHeight = wrappedLine.length * lineHeight;
                ensureSpace(Math.min(blockHeight + 3.5, 26));

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(fontSize);
                doc.setTextColor(30, 41, 59);
                doc.text(raw, margin, getY() + 3.4, { maxWidth: contentWidth, align: 'justify', lineHeightFactor: factor });
                setY(getY() + blockHeight + 3.0);
            }
        });
        setY(getY() + 4.5);
    };
}
