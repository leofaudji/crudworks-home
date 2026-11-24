// assets/js/core/pdf/contract.js — Pembuat PDF Surat Perjanjian Kerja (Minimalist Legal Executive)
import { _ensurePdfLibs, _drawDocumentWordmark, _safeFormatDate, _safeFormatIDR, terbilang } from "./shared.js";

/**
 * High-fidelity Contract / SPK PDF builder using jsPDF
 * Desain Minimalis Legal Korporat: Monokrom (Slate & Ink), Hairline Rules, Tipografi Lapang
 */
export async function generateContractPdf(k, output = 'bloburl') {
    const jsPDF = await _ensurePdfLibs();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    const c = k.company || {};

    const companyInfo = {
        name: c.company_name || window.App?.getSetting?.('company_name', 'PT CRUDWorks Media Tama') || 'PT CRUDWorks Media Tama',
        address: c.company_address || window.App?.getSetting?.('company_address', 'Jl. Rasuna Said Kav. B4, Jakarta Selatan, 12920') || 'Jl. Rasuna Said Kav. B4, Jakarta Selatan, 12920',
        phone: c.company_phone || window.App?.getSetting?.('company_phone', '(021) 555-0199') || '(021) 555-0199',
        email: c.company_email || window.App?.getSetting?.('company_email', 'billing@crudworks.com') || 'billing@crudworks.com',
        tagline: c.company_tagline || window.App?.getSetting?.('company_tagline', '') || ''
    };

    // Single crisp dark top rule (minimalist legal style)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 2.2, 'F');

    let y = 12;
    const leftEndY = _drawDocumentWordmark(doc, margin, y, companyInfo, contentWidth);

    // Right: Minimalist Document Title & Meta
    let rY = 12;
    const statusVal = String(k.status || 'draft').toLowerCase();
    const badgeTxt = statusVal === 'ditandatangani'
        ? 'SAH & DITANDATANGANI'
        : (statusVal === 'terkirim' ? 'MENUNGGU PENGESAHAN' : (statusVal === 'dibatalkan' ? 'DIBATALKAN' : 'DRAFT KONTRAK'));

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    const badgeW = doc.getTextWidth(badgeTxt) + 7;
    const badgeH = 4.4;
    const badgeX = pageWidth - margin - badgeW;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(badgeX, rY, badgeW, badgeH, 1.0, 1.0, 'FD');
    doc.setTextColor(statusVal === 'ditandatangani' ? 15 : 71, statusVal === 'ditandatangani' ? 23 : 85, statusVal === 'ditandatangani' ? 42 : 105);
    doc.text(badgeTxt, badgeX + 3.5, rY + 3.1);

    rY += badgeH + 4.8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('SURAT PERJANJIAN KERJA', pageWidth - margin, rY, { align: 'right' });

    rY += 4.6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(51, 65, 85);
    doc.text(String(k.nomor_kontrak || 'SPK-DRAFT'), pageWidth - margin, rY, { align: 'right' });

    rY += 4.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    const dateTxt = k.tanggal_mulai
        ? `Mulai: ${_safeFormatDate(k.tanggal_mulai)}${k.tanggal_selesai ? ' · Selesai: ' + _safeFormatDate(k.tanggal_selesai) : ''}`
        : `Terbit: ${_safeFormatDate(k.created_at || new Date())}`;
    doc.text(dateTxt, pageWidth - margin, rY, { align: 'right' });

    y = Math.max(leftEndY, rY) + 4;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.35);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // 1. Komparisi Formal Surat Perjanjian Kerja (Halaman 1)
    const refDate = new Date(k.tanggal_mulai || k.created_at || Date.now());
    const hariNama = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][refDate.getDay()] || 'Senin';
    const bulanNama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][refDate.getMonth()] || 'Januari';
    const tglPanjang = `${refDate.getDate()} ${bulanNama} ${refDate.getFullYear()}`;
    const p2Name = String(k.client_nama || '-');
    const p2RepName = String(k.signed_by_name || k.client_pic || '-');
    const p2RepPos = String(k.signed_by_position || 'Penanggung Jawab (PIC)');
    const nilaiNum = Number(k.nilai_kontrak || 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(30, 41, 59);
    const introTxt = `Pada hari ini, ${hariNama}, tanggal ${tglPanjang}, telah dibuat dan disepakati Surat Perjanjian Kerja (SPK) oleh dan antara pihak-pihak yang bertanda tangan di bawah ini:`;
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

    const p1RepName = String(k.pihak_pertama_nama || 'Manajemen / Direksi');
    const p1RepPos = String(k.pihak_pertama_jabatan || `Perwakilan Resmi ${companyInfo.name}`);

    renderPartyBlock('I. PIHAK PERTAMA', [
        ['Nama', p1RepName],
        ['Jabatan', p1RepPos],
        ['Perusahaan', companyInfo.name],
        ['Alamat', companyInfo.address]
    ], `${companyInfo.name}, yang selanjutnya disebut sebagai PIHAK PERTAMA`);

    renderPartyBlock('II. PIHAK KEDUA', [
        ['Nama', p2RepName],
        ['Jabatan', p2RepPos],
        ['Perusahaan', p2Name],
        ['Kontak', k.client_telepon || k.client_email || '-']
    ], `${p2Name}, yang selanjutnya disebut sebagai PIHAK KEDUA`);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(30, 41, 59);
    const agreeTxt = `PIHAK PERTAMA dan PIHAK KEDUA secara bersama-sama disebut sebagai PARA PIHAK, dengan ini sepakat untuk mengikatkan diri dalam perjanjian kerja pelaksanaan "${k.judul_kontrak || '-'}"${k.nomor_penawaran ? ` (Referensi Penawaran: ${k.nomor_penawaran})` : ''} dengan total nilai kontrak sebesar ${_safeFormatIDR(nilaiNum)} (${terbilang(nilaiNum)} Rupiah) serta masa garansi pemeliharaan selama ${k.garansi_hari || 0} hari kalender, sesuai ketentuan pada halaman-halaman berikut.`;
    const agreeLines = doc.splitTextToSize(agreeTxt, contentWidth);
    doc.text(agreeTxt, margin, y + 3.5, { maxWidth: contentWidth, align: 'justify', lineHeightFactor: 1.48 });
    y += (agreeLines.length * 4.8) + 6.0;

    // Tabel Ringkasan Pokok Perjanjian pada Halaman 1
    if (typeof doc.autoTable === 'function') {
        const periodeLabel = k.tanggal_mulai
            ? `${_safeFormatDate(k.tanggal_mulai)}${k.tanggal_selesai ? ' s/d ' + _safeFormatDate(k.tanggal_selesai) : ''}`
            : 'Sesuai jadwal kesepakatan proyek';
        doc.autoTable({
            startY: y,
            head: [['POKOK PERJANJIAN KERJA', 'KETERANGAN']],
            body: [
                ['Nomor Kontrak / SPK', String(k.nomor_kontrak || '-')],
                ['Referensi Penawaran', String(k.nomor_penawaran || '-')],
                ['Judul / Objek Pekerjaan', String(k.judul_kontrak || '-')],
                ['Jangka Waktu Pelaksanaan', periodeLabel],
                ['Total Nilai Kontrak', `${_safeFormatIDR(nilaiNum)} (${terbilang(nilaiNum)} Rupiah)`],
                ['Masa Garansi Implementasi', `${k.garansi_hari || 0} Hari Kalender pasca-BAST`]
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

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const unityTxt = 'Seluruh bagian dalam dokumen ini—meliputi Ruang Lingkup & Daftar Fitur, Rincian Investasi, Rekening Pembayaran Resmi, Hak & Kewajiban, serta Pasal-Pasal Perjanjian Kerja—merupakan satu kesatuan hukum yang mengikat dan tidak terpisahkan bagi PARA PIHAK.';
    doc.text(unityTxt, margin, y + 3.0, { maxWidth: contentWidth, align: 'justify', lineHeightFactor: 1.45 });
    y += 14;

    const addRunningPage = () => {
        doc.addPage();
        y = 18;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`${companyInfo.name} · Surat Perjanjian Kerja ${k.nomor_kontrak || ''}`, margin, 11);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, 13, pageWidth - margin, 13);
    };

    const ensureSpkSpace = (needH = 22) => {
        if (y + needH > pageHeight - 18) {
            addRunningPage();
        }
    };

    // Minimalist Editorial Section Header (Halaman baru default, atau lanjut di halaman yang sama jika startNewPage=false)
    const renderSectionHeading = (numStr, titleStr, startNewPage = true) => {
        if (startNewPage) {
            addRunningPage();
        } else {
            y += 4.0;
            ensureSpkSpace(42);
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

    const renderProse = (text, options = {}) => {
        if (!text || !String(text).trim()) return;
        const fontSize = options.fontSize || 9.0;
        const lineHeight = options.lineHeight || 5.1;
        const factor = options.factor || 1.52;
        const lines = String(text).trim().split('\n');

        lines.forEach((line) => {
            const raw = line.trim().replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
            if (!raw) {
                y += 2.2;
                return;
            }

            const isTitle = /^(PASAL\s+\d+|BAB\s+[IVXLC]+)/i.test(raw) || /^[A-Z0-9\s.&()/—-]{4,}:$/.test(raw);
            const numMatch = raw.match(/^(\d+\.|\([a-z0-9]+\))\s+(.*)/s);
            const bulletMatch = raw.match(/^([•\-\*–])\s+(.*)/s);

            if (isTitle) {
                const pasalMatch = raw.match(/^(PASAL\s+\d+)\s*[—–-]\s*(.+)$/i);
                ensureSpkSpace(pasalMatch ? 32 : lineHeight + 14);
                y += 4.0;
                doc.setTextColor(15, 23, 42);
                if (pasalMatch) {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(fontSize + 0.8);
                    doc.text(pasalMatch[1].toUpperCase(), pageWidth / 2, y + 3.4, { align: 'center' });
                    y += lineHeight + 0.4;

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(fontSize + 0.2);
                    const subLines = doc.splitTextToSize(pasalMatch[2].trim(), contentWidth);
                    subLines.forEach((sl) => {
                        ensureSpkSpace(lineHeight + 1.5);
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(fontSize + 0.2);
                        doc.text(sl, pageWidth / 2, y + 3.4, { align: 'center' });
                        y += lineHeight + 0.4;
                    });
                } else {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(fontSize + 0.6);
                    const titleLines = doc.splitTextToSize(raw, contentWidth);
                    titleLines.forEach((tl) => {
                        ensureSpkSpace(lineHeight + 1.5);
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(fontSize + 0.6);
                        doc.text(tl, pageWidth / 2, y + 3.4, { align: 'center' });
                        y += lineHeight + 0.5;
                    });
                }
                y += 2.4;
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
                ensureQuoSafeSpace(Math.min(blockHeight + 3.0, 26));

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(fontSize);
                doc.setTextColor(15, 23, 42);
                doc.text(prefix, margin, y + 3.4);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(fontSize);
                doc.setTextColor(30, 41, 59);
                doc.text(bodyText, bodyX, y + 3.4, { maxWidth: targetW, align: 'justify', lineHeightFactor: factor });

                y += blockHeight + 1.8;
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
                ensureQuoSafeSpace(Math.min(blockHeight + 3.0, 26));

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(fontSize);
                doc.setTextColor(100, 116, 139);
                doc.text('–', indentX, y + 3.4);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(fontSize);
                doc.setTextColor(51, 65, 85);
                doc.text(bodyText, bodyX, y + 3.4, { maxWidth: targetW, align: 'justify', lineHeightFactor: factor });

                y += blockHeight + 2.4;
            } else {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(fontSize);
                doc.setTextColor(30, 41, 59);
                const wrappedLine = doc.splitTextToSize(raw, contentWidth);
                const blockHeight = wrappedLine.length * lineHeight;
                ensureQuoSafeSpace(Math.min(blockHeight + 3.5, 26));

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(fontSize);
                doc.setTextColor(30, 41, 59);
                doc.text(raw, margin, y + 3.4, { maxWidth: contentWidth, align: 'justify', lineHeightFactor: factor });
                y += blockHeight + 3.0;
            }
        });
        y += 4.5;
    };

    const ensureQuoSafeSpace = ensureSpkSpace;

    let babNum = 1;
    const nextBab = () => String(babNum++).padStart(2, '0');

    // 01. Ruang Lingkup & Daftar Fitur + Timeline & Prosedur UAT
    if (k.ruang_lingkup_fitur && String(k.ruang_lingkup_fitur).trim()) {
        renderSectionHeading(nextBab(), 'RUANG LINGKUP & DAFTAR FITUR YANG DIGARAP');
        renderProse(`PIHAK PERTAMA berkewajiban merancang, mengembangkan, menguji, dan mengimplementasikan sistem aplikasi "${k.judul_kontrak || '-'}" sesuai spesifikasi teknis, alur kerja, serta daftar modul dan fitur di bawah ini. Seluruh hasil pekerjaan akan diuji bersama (User Acceptance Testing / UAT) sebelum serah terima resmi:`);
        renderProse(k.ruang_lingkup_fitur);

        if (k.timeline_pengerjaan && String(k.timeline_pengerjaan).trim()) {
            renderProse(`RENCANA & TIMELINE PENGERJAAN:\n${k.timeline_pengerjaan}`);
        }

        renderProse(
            `PROSEDUR PENGUJIAN (UAT) & SERAH TERIMA (BAST):\n`
            + `1. Setelah seluruh modul pada daftar di atas selesai dikembangkan, PIHAK PERTAMA menyerahkan akses staging/produksi kepada PIHAK KEDUA untuk dilakukan User Acceptance Testing (UAT).\n`
            + `2. PIHAK KEDUA diberikan waktu maksimal 7 (tujuh) hari kerja untuk memeriksa kesesuaian fungsi dan menyampaikan daftar catatan revisi (apabila ada).\n`
            + `3. Setelah hasil UAT dinyatakan sesuai atau melewati batas waktu konfirmasi tanpa catatan keberatan, PARA PIHAK menandatangani Berita Acara Serah Terima (BAST) secara digital melalui Portal Klien.`
        );
    }

    // 02. Rincian Investasi & Penawaran Harga
    const qItems = Array.isArray(k.quotation_items) ? k.quotation_items : [];
    if (qItems.length > 0 && typeof doc.autoTable === 'function') {
        renderSectionHeading(nextBab(), 'RINCIAN INVESTASI & PENAWARAN HARGA');
        renderProse('Sebagai imbalan atas pelaksanaan pekerjaan sebagaimana dimaksud pada bagian Ruang Lingkup di atas, PIHAK KEDUA menyepakati nilai investasi serta komponen biaya layanan yang dirinci pada tabel berikut. Seluruh nominal dinyatakan dalam mata uang Rupiah (IDR) dan berlaku sesuai ketentuan penagihan pada perjanjian ini:');
        const bodyRows = qItems.map((it, idx) => {
            const qtyNum = Number(it.kuantitas || 1);
            const qtyLabel = Number.isInteger(qtyNum) ? String(qtyNum) : String(qtyNum);
            return [
                idx + 1,
                it.deskripsi || '-',
                qtyLabel,
                String(it.satuan || 'Paket').replace(/_/g, ' '),
                _safeFormatIDR(it.harga_satuan || 0),
                _safeFormatIDR(it.total_harga || 0)
            ];
        });
        doc.autoTable({
            startY: y,
            head: [['No', 'Ruang Lingkup / Layanan', 'Qty', 'Satuan', 'Biaya Satuan', 'Subtotal']],
            body: bodyRows,
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
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 15, halign: 'center' },
                3: { cellWidth: 24, halign: 'center' },
                4: { cellWidth: 32, halign: 'right' },
                5: { cellWidth: 34, halign: 'right', fontStyle: 'bold' }
            }
        });
        y = (doc.lastAutoTable?.finalY || y) + 4.5;

        const sumRows = [
            ['Subtotal Investasi:', _safeFormatIDR(k.quo_subtotal ?? nilaiNum)]
        ];
        if (Number(k.quo_diskon || 0) > 0) {
            sumRows.push(['Potongan Khusus:', `-${_safeFormatIDR(k.quo_diskon)}`]);
        }
        if (Number(k.quo_pajak_nominal || 0) > 0) {
            sumRows.push([`PPN (${Number(k.quo_pajak_persen || 0)}%):`, _safeFormatIDR(k.quo_pajak_nominal)]);
        }
        sumRows.push(['Total Nilai Kontrak:', _safeFormatIDR(nilaiNum)]);
        ensureSpkSpace(sumRows.length * 5.5 + 4);
        const sumX = pageWidth - margin - 76;
        sumRows.forEach(([lbl, val], idx) => {
            const isLast = idx === sumRows.length - 1;
            doc.setFont('helvetica', isLast ? 'bold' : 'normal');
            doc.setFontSize(isLast ? 9.2 : 8.2);
            doc.setTextColor(isLast ? 15 : 71, isLast ? 23 : 85, isLast ? 42 : 105);
            doc.text(lbl, sumX, y);
            doc.text(val, pageWidth - margin, y, { align: 'right' });
            y += 5.2;
        });
        y += 3.5;
    }

    // 03. Rekening Pembayaran Resmi (ditempatkan pada halaman yang sama dengan Rincian Investasi bila ada)
    const banks = Array.isArray(k.bank_accounts) ? k.bank_accounts : [];
    if (banks.length > 0) {
        renderSectionHeading(nextBab(), 'REKENING PEMBAYARAN RESMI', qItems.length === 0);
        renderProse('Seluruh pembayaran nilai kontrak wajib ditransfer ke rekening resmi Pihak Pertama di bawah ini dengan mencantumkan nomor SPK atau nomor faktur pada berita transfer, serta mengunggah bukti pembayaran melalui Portal Klien untuk proses verifikasi:');
        banks.forEach((b, idx) => {
            ensureSpkSpace(12);
            doc.setFillColor(15, 23, 42);
            doc.rect(margin, y, 1.4, 7.6, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.6);
            doc.setTextColor(15, 23, 42);
            doc.text(`${b.nama_bank || b.nama_metode || 'Bank Transfer'}${b.cabang ? ' · ' + b.cabang : ''}`, margin + 4.2, y + 3.2);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.8);
            doc.setTextColor(100, 116, 139);
            doc.text(`a.n ${b.atas_nama || '-'}`, margin + 4.2, y + 7.2);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.2);
            doc.setTextColor(15, 23, 42);
            doc.text(String(b.nomor_rekening || '-'), pageWidth - margin, y + 5.2, { align: 'right' });

            y += 9.5;
            if (idx < banks.length - 1) {
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.2);
                doc.line(margin, y, pageWidth - margin, y);
                y += 2.8;
            }
        });
        y += 4.5;

        const paymentTerms = (k.syarat_ketentuan && String(k.syarat_ketentuan).trim())
            ? String(k.syarat_ketentuan).trim()
            : '1. Pembayaran dilakukan sesuai jadwal termin pada faktur resmi yang diterbitkan oleh PIHAK PERTAMA.\n2. Pelunasan faktur dilakukan selambat-lambatnya 7 (tujuh) hari kerja setelah tanggal faktur diterima.\n3. Kuitansi pembayaran resmi diterbitkan secara otomatis di Portal Klien setelah mutasi diverifikasi.';
        renderProse(`SYARAT & KETENTUAN PEMBAYARAN:\n${paymentTerms}`);
    }

    // Normalisasi redaksi garansi & HAKI agar selaras dengan kebijakan lisensi pengguna akhir & biaya maintenance
    const normalizeSpkClauses = (txt) => String(txt || '')
        .replace(/secara cuma-cuma selama masa pemeliharaan[^.\n]*/gi, 'sesuai paket biaya maintenance & dukungan pemeliharaan yang disepakati dalam perjanjian ini')
        .replace(/Hak penggunaan aplikasi dan source code proyek diserahkan sepenuhnya kepada Pihak Kedua[^.\n]*/gi, 'Seluruh Hak Kekayaan Intelektual (HAKI), hak cipta, dan Source Code aplikasi sepenuhnya merupakan hak milik mutlak Pihak Pertama, sedangkan Pihak Kedua hanya memperoleh Hak Pakai / Lisensi Pemakai Akhir (End-User License)');

    // 04. Hak & Kewajiban Para Pihak
    if (k.pasal_hak_kewajiban && String(k.pasal_hak_kewajiban).trim()) {
        renderSectionHeading(nextBab(), 'HAK & KEWAJIBAN PARA PIHAK');
        renderProse(normalizeSpkClauses(k.pasal_hak_kewajiban));
    }

    // 05. Ketentuan & Pasal-Pasal Perjanjian Kerja
    renderSectionHeading(nextBab(), 'KETENTUAN & PASAL-PASAL PERJANJIAN KERJA');
    renderProse(normalizeSpkClauses(k.isi_pasal || ''));

    // Pengesahan & Tanda Tangan Para Pihak (tanpa judul bab bernomor)
    ensureSpkSpace(50);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;

    const sigColW = (contentWidth - 10) / 2;
    const sigLeftX = margin;
    const sigRightX = margin + sigColW + 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(15, 23, 42);
    doc.text('PIHAK PERTAMA (PENYEDIA JASA)', sigLeftX, y + 3);
    doc.text('PIHAK KEDUA (PEMBERI KERJA / KLIEN)', sigRightX, y + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(71, 85, 105);
    doc.text(companyInfo.name, sigLeftX, y + 8);
    doc.text(p2Name, sigRightX, y + 8);

    if (k.signature_data && String(k.signature_data).startsWith('data:image/')) {
        try {
            doc.addImage(k.signature_data, 'PNG', sigRightX, y + 10, 44, 18);
        } catch (_) {}
    }

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.25);
    doc.line(sigLeftX, y + 30, sigLeftX + 58, y + 30);
    doc.line(sigRightX, y + 30, sigRightX + 58, y + 30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(p1RepName, sigLeftX, y + 34.5);
    doc.text(String(k.signed_by_name || k.client_pic || 'Penanggung Jawab Klien'), sigRightX, y + 34.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(p1RepPos, sigLeftX, y + 38.5);
    const sigMeta = [k.signed_by_position, k.signed_at ? `Disahkan ${_safeFormatDate(k.signed_at)}` : ''].filter(Boolean).join(' · ');
    if (sigMeta) doc.text(sigMeta, sigRightX, y + 38.5);

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Dokumen Kontrak Digital ${k.nomor_kontrak || ''} · Halaman ${i} dari ${totalPages}`, pageWidth / 2, pageHeight - 9, { align: 'center' });
    }

    const safeNo = String(k.nomor_kontrak || 'SPK').replace(/[\/\\:*?"<>|]/g, '-');
    const filename = `SPK-${safeNo}.pdf`;
    if (output === 'download') {
        doc.save(filename);
        return { filename };
    }
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    return { blobUrl, url: blobUrl, filename };
}
