// assets/js/pages/public-quotation.js - Portal Publik Penawaran & Persetujuan Digital
import { App } from '../app.js';

export async function init(container) {
    let token = '';
    const hash = window.location.hash || '';
    if (hash.includes('?')) {
        const urlParams = new URLSearchParams(hash.split('?')[1]);
        token = urlParams.get('token') || '';
    }
    if (!token && hash.split('/')[2]) {
        token = hash.split('/')[2].split('?')[0];
    }

    container.innerHTML = `
        <div class="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-16">
            <div id="pub-quo-loading" class="text-center py-24 space-y-4">
                <i class="ri-loader-4-line text-4xl text-primary-600 animate-spin inline-block"></i>
                <div class="text-sm font-semibold text-slate-500">Memuat Surat Penawaran & Proposal Investasi...</div>
            </div>
            <div id="pub-quo-content" class="hidden space-y-8"></div>
        </div>
    `;

    if (!token) {
        document.getElementById('pub-quo-loading').innerHTML = `
            <div class="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div class="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl font-bold">
                    <i class="ri-error-warning-line"></i>
                </div>
                <h2 class="text-lg font-bold text-slate-900 dark:text-white">Token Penawaran Diperlukan</h2>
                <p class="text-xs text-slate-500">Mohon periksa kembali tautan surat penawaran resmi yang Anda terima.</p>
            </div>
        `;
        return;
    }

    const res = await App.api(`public-quotation?token=${encodeURIComponent(token)}`);
    const loadingEl = document.getElementById('pub-quo-loading');
    const contentEl = document.getElementById('pub-quo-content');

    if (!res || !res.success) {
        loadingEl.innerHTML = `
            <div class="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div class="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl font-bold">
                    <i class="ri-close-circle-line"></i>
                </div>
                <h2 class="text-lg font-bold text-slate-900 dark:text-white">Penawaran Tidak Ditemukan</h2>
                <p class="text-xs text-slate-500">${res?.message || 'Tautan penawaran ini tidak valid atau telah kedaluwarsa.'}</p>
            </div>
        `;
        return;
    }

    loadingEl.classList.add('hidden');
    contentEl.classList.remove('hidden');

    const quo = res.data;
    const c = quo.company || {};
    const isSigned = quo.status === 'disetujui' || quo.status === 'dikonversi';

    contentEl.innerHTML = `
        <!-- Top Toolbar -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <img src="assets/images/logo.png" alt="CRUDWorks Logo" class="h-9 w-auto object-contain" />
                <div class="hidden sm:block border-l border-slate-200 dark:border-slate-700 pl-4">
                    <h2 class="text-sm font-bold text-slate-900 dark:text-white">${c.company_name || 'CRUDWorks Media Tama'}</h2>
                    <p class="text-xs text-slate-500">${c.company_address || 'Jl. Rasuna Said Kav. B4, Jakarta Selatan'}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button id="btn-pub-quo-pdf" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition">
                    <i class="ri-file-pdf-2-line text-rose-400"></i>
                    <span>Pratinjau PDF</span>
                </button>
                <button id="btn-pub-quo-word" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition" title="Unduh format dokumen Microsoft Word yang dapat diedit bebas">
                    <i class="ri-file-word-2-line"></i>
                    <span>Unduh Word (.doc / Editable)</span>
                </button>
                <button id="btn-pub-quo-download" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition">
                    <i class="ri-download-line"></i>
                    <span>Unduh PDF</span>
                </button>
            </div>
        </div>

        <!-- Proposal Card -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
            <!-- Header Meta -->
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div class="space-y-1">
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">PROPOSAL INVESTASI & PENAWARAN HARGA</div>
                    <h1 class="text-2xl font-black font-mono text-slate-900 dark:text-white">${quo.nomor_penawaran}</h1>
                    <div class="text-xs text-slate-500">Tanggal: <b class="font-mono text-slate-700 dark:text-slate-300">${App.formatDate(quo.tanggal_penawaran)}</b> · Berlaku s/d: <b class="font-mono text-rose-600">${App.formatDate(quo.berlaku_hingga)}</b></div>
                </div>
                <div class="text-left sm:text-right">
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">STATUS PROPOSAL</div>
                    <div class="mt-1">
                        ${isSigned ? `
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 rounded-xl font-bold text-xs border border-emerald-200">
                                <i class="ri-checkbox-circle-fill"></i> PROPOSAL TELAH DISETUJUI
                            </span>
                        ` : `
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950/60 rounded-xl font-bold text-xs border border-amber-200">
                                <i class="ri-time-line"></i> MENUNGGU PERSETUJUAN KLIEN
                            </span>
                        `}
                    </div>
                </div>
            </div>

            <!-- Client & Project Info -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700">
                <div>
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Ditujukan Kepada:</div>
                    <div class="text-sm font-extrabold text-slate-900 dark:text-white">${quo.nama_perusahaan}</div>
                    <div class="text-slate-600 dark:text-slate-400 mt-0.5">UP: ${quo.penanggung_jawab || '-'}</div>
                    <div class="text-slate-500 mt-0.5">${quo.client_alamat || '-'} ${quo.client_kota ? `· ${quo.client_kota}` : ''}</div>
                    <div class="text-slate-500 mt-0.5">Email: ${quo.client_email || '-'} · Telp: ${quo.client_telepon || '-'}</div>
                </div>
                <div class="space-y-1 sm:text-right">
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Objek Penawaran & Proyek:</div>
                    <div class="font-bold text-primary-600 text-sm">${quo.nama_project || 'Pengembangan Sistem & Layanan Digital'}</div>
                    <div class="text-slate-500 font-mono text-[11px]">Kode Proyek: ${quo.kode_project || '-'}</div>
                    <div class="text-slate-400 text-[11px] mt-2">Dipersiapkan Oleh: <b>${quo.pembuat_nama || 'Tim Penjualan CRUDWorks'}</b></div>
                </div>
            </div>

            <!-- Scope of Work (Bab 01) -->
            ${quo.ruang_lingkup_fitur ? `
                <div class="space-y-2">
                    <div class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Bab 01 — Ruang Lingkup Pengerjaan &amp; Fitur Utama</div>
                    <div class="p-4 bg-slate-50/60 dark:bg-slate-800/20 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                        ${quo.ruang_lingkup_fitur}
                    </div>
                </div>
            ` : ''}

            <!-- Timeline (Bab 02) -->
            ${quo.timeline_pengerjaan ? `
                <div class="space-y-3">
                    <div class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Bab 02 — Rencana &amp; Timeline Waktu Pengerjaan</div>
                    ${App.renderTimelineDiagramHtml ? App.renderTimelineDiagramHtml(quo.timeline_pengerjaan) : ''}
                    <div class="p-4 bg-slate-50/60 dark:bg-slate-800/20 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                        ${quo.timeline_pengerjaan}
                    </div>
                </div>
            ` : ''}

            <!-- Items Table (Bab 03) -->
            <div class="space-y-2">
                <div class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Bab ${quo.timeline_pengerjaan ? '03' : '02'} — Rincian Investasi &amp; Paket Layanan</div>
                <div class="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                    <table class="w-full text-xs text-left">
                        <thead class="bg-slate-100 dark:bg-slate-800 font-mono text-[10px] uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th class="p-3 w-10 text-center">No</th>
                                <th class="p-3">Deskripsi Modul / Layanan</th>
                                <th class="p-3 text-center w-20">Volume</th>
                                <th class="p-3 text-right w-36">Harga Satuan</th>
                                <th class="p-3 text-right w-36">Total Investasi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                            ${(quo.items || []).map((it, idx) => `
                                <tr>
                                    <td class="p-3 text-center font-mono text-slate-400">${idx + 1}</td>
                                    <td class="p-3">
                                        <div class="font-bold text-slate-900 dark:text-white">${it.deskripsi}</div>
                                    </td>
                                    <td class="p-3 text-center font-mono text-slate-600 dark:text-slate-300">${it.kuantitas} ${it.satuan || ''}</td>
                                    <td class="p-3 text-right font-mono text-slate-600 dark:text-slate-300">${App.formatIDR(it.harga_satuan)}</td>
                                    <td class="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">${App.formatIDR(it.total_harga)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot class="bg-slate-50 dark:bg-slate-800/60 font-semibold border-t border-slate-200 dark:border-slate-700">
                            <tr>
                                <td colspan="4" class="p-3 text-right text-slate-500">Subtotal:</td>
                                <td class="p-3 text-right font-mono">${App.formatIDR(quo.subtotal)}</td>
                            </tr>
                            ${Number(quo.diskon_nilai) > 0 ? `
                                <tr>
                                    <td colspan="4" class="p-3 text-right text-slate-500">Diskon:</td>
                                    <td class="p-3 text-right font-mono text-rose-600">-${App.formatIDR(quo.diskon_nilai)}</td>
                                </tr>
                            ` : ''}
                            <tr>
                                <td colspan="4" class="p-3 text-right text-slate-500">PPN (${quo.pajak_persen}%):</td>
                                <td class="p-3 text-right font-mono">${App.formatIDR(quo.pajak_nominal)}</td>
                            </tr>
                            <tr class="text-sm font-black text-slate-900 dark:text-white border-t-2 border-slate-900 dark:border-slate-700">
                                <td colspan="4" class="p-3.5 text-right uppercase tracking-wider text-primary-600">Total Investasi Penawaran:</td>
                                <td class="p-3.5 text-right font-mono text-base text-primary-600">${App.formatIDR(quo.total_penawaran)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <!-- E-Signature Section (FITUR 2) -->
            <div id="section-e-signature" class="pt-6 border-t border-slate-200 dark:border-slate-800">
                ${isSigned ? `
                    <div class="p-6 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-3xl border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div class="space-y-1">
                            <span class="px-2.5 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-bold uppercase tracking-wider">Proposal Disetujui Secara Sah</span>
                            <h3 class="text-base font-extrabold text-slate-900 dark:text-white">Ditandatangani secara elektronik oleh:</h3>
                            <div class="text-sm font-bold text-slate-800 dark:text-slate-200">${quo.signed_by_name}</div>
                            <div class="text-xs text-slate-500">${quo.signed_by_position || 'Penanggung Jawab Klien'} · ${quo.nama_perusahaan}</div>
                            <div class="text-[11px] text-slate-400 font-mono mt-1">Waktu Persetujuan: ${App.formatDate(quo.signed_at)} · IP: ${quo.signed_ip || '-'}</div>
                        </div>
                        ${quo.signature_data ? `
                            <div class="p-3 bg-white rounded-2xl border border-emerald-100 shadow-xs flex flex-col items-center">
                                <img src="${quo.signature_data}" alt="Tanda Tangan Klien" class="h-16 w-auto object-contain" />
                                <span class="text-[9px] text-slate-400 font-mono mt-1">Digital Verified Signature</span>
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div class="p-6 sm:p-8 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-5">
                        <div>
                            <span class="text-[10px] font-bold uppercase tracking-wider text-primary-600">Persetujuan & Tanda Tangan Elektronik</span>
                            <h3 class="text-lg font-black text-slate-900 dark:text-white mt-0.5">Konfirmasi Persetujuan Proposal Proyek</h3>
                            <p class="text-xs text-slate-500">Dengan menandatangani proposal ini, Anda menyetujui seluruh ruang lingkup pengerjaan, nilai investasi, serta syarat dan ketentuan pembayaran yang tercantum.</p>
                        </div>

                        <form id="form-sign-quotation" class="space-y-4">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Nama Lengkap Penandatangan *</label>
                                    <input type="text" id="sign-name" required value="${quo.penanggung_jawab || ''}" placeholder="Contoh: Budi Santoso"
                                           class="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary-500">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Jabatan / Posisi *</label>
                                    <input type="text" id="sign-pos" required value="Direktur / Penanggung Jawab" placeholder="Contoh: Direktur Operasional"
                                           class="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500">
                                </div>
                            </div>

                            <!-- Canvas Signature Pad -->
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <label class="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">Bubuhkan Tanda Tangan Anda di Bawah Ini *</label>
                                    <button type="button" id="btn-clear-sig" class="text-[11px] font-bold text-rose-500 hover:text-rose-700">
                                        <i class="ri-eraser-line"></i> Bersihkan Kanvas
                                    </button>
                                </div>
                                <div class="relative bg-white rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden touch-none h-44">
                                    <canvas id="sig-canvas" class="w-full h-full cursor-crosshair"></canvas>
                                    <div id="sig-hint" class="absolute inset-0 flex items-center justify-center text-slate-300 pointer-events-none text-xs font-medium">
                                        Gunakan mouse atau sentuhan jari Anda untuk tanda tangan di sini
                                    </div>
                                </div>
                            </div>

                            <div class="flex justify-end pt-2">
                                <button type="submit" id="btn-submit-sign" class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-primary-500/20 transition">
                                    <i class="ri-check-double-line text-base"></i>
                                    <span>Setujui & Tandatangani Proposal Ini</span>
                                </button>
                            </div>
                        </form>
                    </div>
                `}
            </div>
        </div>
    `;

    // Bind PDF Actions
    document.getElementById('btn-pub-quo-pdf').onclick = async () => {
        const pdfRes = await App.generateQuotationPdf(quo, 'bloburl');
        App.openPdfModal({
            title: `Proposal ${quo.nomor_penawaran}`,
            filename: pdfRes.filename,
            blobUrl: pdfRes.blobUrl,
            downloadWordFn: () => App.downloadQuotationWord(quo),
            wordLabel: 'Unduh Format Word (.doc / Editable)'
        });
    };
    document.getElementById('btn-pub-quo-word').onclick = () => App.downloadQuotationWord(quo);
    document.getElementById('btn-pub-quo-download').onclick = () => App.generateQuotationPdf(quo, 'download');

    // Canvas Signature Logic
    const canvas = document.getElementById('sig-canvas');
    if (canvas && !isSigned) {
        initSignaturePad(canvas, token, quo);
    }
}

function initSignaturePad(canvas, token, quo) {
    const ctx = canvas.getContext('2d');
    const hint = document.getElementById('sig-hint');
    let isDrawing = false;
    let hasDrawn = false;

    // Set canvas dimensions
    const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDraw = (e) => {
        isDrawing = true;
        hasDrawn = true;
        if (hint) hint.classList.add('hidden');
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const stopDraw = () => {
        isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDraw);

    document.getElementById('btn-clear-sig').onclick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasDrawn = false;
        if (hint) hint.classList.remove('hidden');
    };

    document.getElementById('form-sign-quotation').onsubmit = async (e) => {
        e.preventDefault();
        if (!hasDrawn) {
            App.toast('Harap bubuhkan tanda tangan Anda pada kotak yang disediakan', 'warning');
            return;
        }

        const btn = document.getElementById('btn-submit-sign');
        btn.disabled = true;
        btn.innerHTML = `<i class="ri-loader-4-line animate-spin"></i> Menyimpan Persetujuan...`;

        const sigData = canvas.toDataURL('image/png');
        const body = {
            signed_by_name: document.getElementById('sign-name').value.trim(),
            signed_by_position: document.getElementById('sign-pos').value.trim(),
            signature_data: sigData
        };

        const res = await App.api(`public-quotation?token=${encodeURIComponent(token)}&action=sign`, {
            method: 'POST',
            body
        });

        btn.disabled = false;
        btn.innerHTML = `<i class="ri-check-double-line"></i> Setujui & Tandatangani Proposal Ini`;

        if (res && res.success) {
            Swal.fire({
                title: 'Proposal Berhasil Disetujui!',
                text: res.message,
                icon: 'success',
                confirmButtonText: 'Tutup'
            }).then(() => {
                window.location.reload();
            });
        }
    };
}
