// portal/pages/quotations.js — Daftar Surat Penawaran & Pengesahan Digital In-App
import { generateQuotationPdf, generateContractPdf } from '../../assets/js/core/utils.js';
import { $, esc, money, fdate, badge, sectionTitle, panel, empty, api, toast, openModal, closeModal, openPdfPreviewModal, state, hooks } from '../ctx.js';

export function renderQuotations(d) {
    const list = d.quotations || [];
    const contracts = d.contracts || [];
    const body = list.length === 0
        ? empty('Belum ada surat penawaran.')
        : panel(`<div class="divide-y divide-slate-200 dark:divide-slate-800">
            ${list.map((q) => {
                const ok = q.status === 'disetujui' || q.status === 'dikonversi';
                const rejected = q.status === 'ditolak';
                return `
                    <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="min-w-0 space-y-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-mono font-bold text-xs text-slate-900 dark:text-white">${esc(q.nomor_penawaran)}</span>
                                ${ok ? badge('Disetujui', 'green') : (rejected ? badge('Ditolak', 'red') : badge('Menunggu', 'amber'))}
                            </div>
                            <div class="text-sm font-bold text-slate-800 dark:text-slate-200">${esc(q.nama_project || 'Pengembangan Sistem')}</div>
                            <div class="text-xs text-slate-500 font-mono">
                                Berlaku s/d ${fdate(q.berlaku_hingga)}
                                ${ok && q.signed_by_name ? ` · Disahkan ${esc(q.signed_by_name)}` : ''}
                            </div>
                        </div>
                        <div class="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 flex-wrap">
                            <div class="font-mono tabular-nums font-bold text-sm text-slate-900 dark:text-white mr-1">${money(q.total_penawaran)}</div>
                            <button type="button" data-action="quo-pdf" data-token="${esc(q.public_token || q.nomor_penawaran)}" class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5">
                                <i class="ri-file-pdf-2-line text-rose-600"></i><span>PDF</span>
                            </button>
                            ${!ok && !rejected ? `
                                <button type="button" data-action="quo-sign" data-id="${q.id}" class="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition">
                                    <i class="ri-quill-pen-line"></i><span>Tinjau & Setujui</span>
                                </button>` : ''}
                        </div>
                    </div>`;
            }).join('')}
        </div>`);

    const contractBody = contracts.length === 0 ? '' : `
        <div class="space-y-3">
            ${sectionTitle('Kontrak Kerja / SPK Digital', `<span class="text-[11px] font-mono text-slate-400">${contracts.length} dokumen</span>`)}
            ${panel(`<div class="divide-y divide-slate-200 dark:divide-slate-800">
                ${contracts.map((k) => {
                    const signed = k.status === 'ditandatangani';
                    return `
                        <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div class="min-w-0 space-y-1">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="font-mono font-bold text-xs text-slate-900 dark:text-white">${esc(k.nomor_kontrak)}</span>
                                    ${signed ? badge('Sah & Ditandatangani', 'green') : badge('Menunggu TTD', 'amber')}
                                </div>
                                <div class="text-sm font-bold text-slate-800 dark:text-slate-200">${esc(k.judul_kontrak)}</div>
                                <div class="text-xs text-slate-500 font-mono">
                                    Garansi ${esc(k.garansi_hari)} hari${k.nama_project ? ' · ' + esc(k.nama_project) : ''}
                                    ${signed && k.signed_by_name ? ` · Disahkan ${esc(k.signed_by_name)}` : ''}
                                </div>
                            </div>
                            <div class="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 flex-wrap">
                                <div class="font-mono tabular-nums font-bold text-sm text-slate-900 dark:text-white mr-1">${money(k.nilai_kontrak)}</div>
                                <button type="button" data-action="contract-pdf" data-id="${k.id}" class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5">
                                    <i class="ri-file-pdf-2-line text-rose-600"></i><span>PDF</span>
                                </button>
                                <button type="button" data-action="contract-sign" data-id="${k.id}" class="px-3.5 py-2 rounded-lg ${signed ? 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} text-xs font-semibold flex items-center gap-1.5 transition">
                                    <i class="${signed ? 'ri-eye-line' : 'ri-quill-pen-line'}"></i><span>${signed ? 'Lihat SPK' : 'Baca & Tandatangani'}</span>
                                </button>
                            </div>
                        </div>`;
                }).join('')}
            </div>`)}
        </div>`;

    return `
        <div class="space-y-3">
            ${sectionTitle('Surat Penawaran & Proposal', `<span class="text-[11px] font-mono text-slate-400">${list.length} dokumen</span>`)}
            ${body}
        </div>
        ${contractBody}`;
}

export function openContractSignModal(id) {
    const k = (state.data?.contracts || []).find((x) => Number(x.id) === Number(id));
    if (!k) return;
    const signed = k.status === 'ditandatangani';
    const defaultName = state.client?.penanggung_jawab || '';

    openModal(`
        <div class="p-5 sm:p-6 space-y-4">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <div class="text-[11px] font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">Surat Perjanjian Kerja (SPK)</div>
                    <h3 class="text-base font-bold text-slate-900 dark:text-white mt-0.5">${esc(k.nomor_kontrak)} — ${esc(k.judul_kontrak)}</h3>
                    <p class="text-xs text-slate-500 mt-0.5">Nilai Kontrak ${money(k.nilai_kontrak)} · Garansi ${esc(k.garansi_hari)} hari</p>
                </div>
                <button type="button" data-action="close-modal" class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 flex items-center justify-center"><i class="ri-close-line"></i></button>
            </div>

            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto">${esc(k.isi_pasal)}</div>

            ${signed ? `
                <div class="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 text-xs text-emerald-800 dark:text-emerald-300">
                    Dokumen ini telah ditandatangani secara digital oleh <b>${esc(k.signed_by_name)}</b> (${esc(k.signed_by_position || '-')}) pada ${fdate(k.signed_at)}.
                </div>` : `
                <form id="portal-contract-sign-form" class="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Penandatangan *</label>
                            <input id="spk-sign-name" type="text" required value="${esc(defaultName)}" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Jabatan (Opsional)</label>
                            <input id="spk-sign-pos" type="text" placeholder="Direktur / Manajer" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs">
                        </div>
                    </div>
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Tanda Tangan Digital *</label>
                            <button type="button" id="spk-sign-clear" class="text-[11px] font-semibold text-rose-600 hover:underline">Hapus Ulang</button>
                        </div>
                        <canvas id="spk-sign-canvas" class="w-full h-36 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white touch-none cursor-crosshair"></canvas>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" data-action="close-modal" class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">Batal</button>
                        <button id="spk-sign-submit" type="submit" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">Tandatangani SPK</button>
                    </div>
                </form>`}
        </div>
    `, { sheet: true, wide: true });

    if (signed) return;
    const canvas = $('#spk-sign-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let cssW = 300;
    let cssH = 144;
    const setupCanvas = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cssW = Math.max(200, canvas.clientWidth || 300);
        cssH = Math.max(120, canvas.clientHeight || 144);
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0f172a';
    };
    requestAnimationFrame(setupCanvas);
    let drawing = false;
    let hasStroke = false;
    const pt = (e) => {
        const r = canvas.getBoundingClientRect();
        return {
            x: ((e.clientX - r.left) / (r.width || 1)) * cssW,
            y: ((e.clientY - r.top) / (r.height || 1)) * cssH
        };
    };
    canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); drawing = true; hasStroke = true; canvas.setPointerCapture(e.pointerId); const { x, y } = pt(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke(); });
    canvas.addEventListener('pointermove', (e) => { if (!drawing) return; const { x, y } = pt(e); ctx.lineTo(x, y); ctx.stroke(); });
    const stop = () => { drawing = false; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    $('#spk-sign-clear')?.addEventListener('click', () => { ctx.clearRect(0, 0, cssW, cssH); hasStroke = false; });

    $('#portal-contract-sign-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = $('#spk-sign-name')?.value?.trim() || '';
        if (!name || !hasStroke) { toast('Nama dan tanda tangan digital wajib diisi', 'error'); return; }
        const btn = $('#spk-sign-submit');
        if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan…'; }
        const res = await api('portal-auth/sign-contract', {
            method: 'POST',
            body: {
                contract_id: k.id,
                signed_by_name: name,
                signed_by_position: $('#spk-sign-pos')?.value?.trim() || '',
                signature_data: canvas.toDataURL('image/png')
            }
        });
        if (res?.success) {
            toast(res.message || 'SPK berhasil ditandatangani', 'success');
            closeModal();
            hooks.reloadData({ silent: true });
        } else if (btn) {
            btn.disabled = false;
            btn.textContent = 'Tandatangani SPK';
        }
    });
}

export async function openQuotationSignModal(id) {
    const q = (state.data?.quotations || []).find((x) => Number(x.id) === Number(id));
    if (!q) return;

    let detail = q;
    let items = [];
    if (q.public_token || q.nomor_penawaran) {
        const res = await api(`public-quotation?token=${encodeURIComponent(q.public_token || q.nomor_penawaran)}`, { silent: true });
        if (res?.success && res.data) {
            detail = { ...q, ...res.data };
            items = Array.isArray(res.data.items) ? res.data.items : [];
        }
    }

    const defaultName = state.client?.penanggung_jawab || '';

    openModal(`
        <div class="p-5 sm:p-6 space-y-5">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <div class="text-[11px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">Pengesahan Penawaran</div>
                    <h3 class="text-base font-bold text-slate-900 dark:text-white mt-0.5">${esc(detail.nomor_penawaran)}</h3>
                    <p class="text-xs text-slate-500 mt-0.5">${esc(detail.nama_project || 'Pengembangan Sistem')} · Berlaku s/d ${fdate(detail.berlaku_hingga)}</p>
                </div>
                <button type="button" data-action="close-modal" class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 flex items-center justify-center">
                    <i class="ri-close-line"></i>
                </button>
            </div>

            ${items.length ? `
                <div class="space-y-1.5">
                    <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rincian Lingkup & Biaya</div>
                    <div class="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-xs max-h-44 overflow-y-auto">
                        ${items.map((it) => `
                            <div class="px-3.5 py-2.5 flex items-center justify-between gap-2">
                                <div class="min-w-0">
                                    <div class="font-medium text-slate-800 dark:text-slate-200">${esc(it.deskripsi)}</div>
                                    <div class="text-[11px] text-slate-400 font-mono">${esc(it.kuantitas)} ${esc(it.satuan || 'unit')} × ${money(it.harga_satuan)}</div>
                                </div>
                                <div class="font-mono font-semibold text-slate-900 dark:text-white shrink-0">${money(it.subtotal)}</div>
                            </div>`).join('')}
                    </div>
                </div>` : ''}

            <div class="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 p-4 flex items-center justify-between gap-3">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300">Total Nilai Penawaran</span>
                <span class="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">${money(detail.total_penawaran)}</span>
            </div>

            <form id="portal-quo-sign-form" class="space-y-3 pt-1 border-t border-slate-200 dark:border-slate-800">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Penandatangan *</label>
                        <input id="quo-sign-name" type="text" required value="${esc(defaultName)}" placeholder="Nama lengkap PIC"
                               class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Jabatan (Opsional)</label>
                        <input id="quo-sign-pos" type="text" placeholder="Direktur / Manajer IT"
                               class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs">
                    </div>
                </div>

                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Tanda Tangan Digital *</label>
                        <button type="button" id="quo-sign-clear" class="text-[11px] font-semibold text-rose-600 hover:underline">Hapus Ulang</button>
                    </div>
                    <canvas id="quo-sign-canvas" class="w-full h-36 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white touch-none cursor-crosshair"></canvas>
                </div>

                <div class="flex items-center justify-end gap-2 pt-2">
                    <button type="button" data-action="close-modal" class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">Batal</button>
                    <button id="quo-sign-submit" type="submit" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5">
                        <i class="ri-check-double-line"></i><span>Setujui Penawaran</span>
                    </button>
                </div>
            </form>
        </div>
    `, { sheet: true, wide: true });

    const canvas = $('#quo-sign-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let cssW = 300;
    let cssH = 144;
    const setupCanvas = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cssW = Math.max(200, canvas.clientWidth || 300);
        cssH = Math.max(120, canvas.clientHeight || 144);
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0f172a';
    };
    requestAnimationFrame(setupCanvas);

    let drawing = false;
    let hasStroke = false;
    const pt = (e) => {
        const r = canvas.getBoundingClientRect();
        return {
            x: ((e.clientX - r.left) / (r.width || 1)) * cssW,
            y: ((e.clientY - r.top) / (r.height || 1)) * cssH
        };
    };

    canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        drawing = true;
        hasStroke = true;
        canvas.setPointerCapture(e.pointerId);
        const { x, y } = pt(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 0.1, y + 0.1);
        ctx.stroke();
    });
    canvas.addEventListener('pointermove', (e) => {
        if (!drawing) return;
        const { x, y } = pt(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    });
    const stop = () => { drawing = false; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);

    $('#quo-sign-clear')?.addEventListener('click', () => {
        ctx.clearRect(0, 0, cssW, cssH);
        hasStroke = false;
    });

    $('#portal-quo-sign-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = $('#quo-sign-name')?.value?.trim() || '';
        if (!name || !hasStroke) {
            toast('Nama dan tanda tangan digital wajib diisi', 'error');
            return;
        }
        const btn = $('#quo-sign-submit');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i><span>Menyimpan…</span>'; }
        const res = await api('portal-auth/sign-quotation', {
            method: 'POST',
            body: {
                quotation_id: q.id,
                signed_by_name: name,
                signed_by_position: $('#quo-sign-pos')?.value?.trim() || '',
                signature_data: canvas.toDataURL('image/png')
            }
        });
        if (res?.success) {
            toast(res.message || 'Penawaran berhasil disetujui', 'success');
            closeModal();
            hooks.reloadData({ silent: true });
        } else if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="ri-check-double-line"></i><span>Setujui Penawaran</span>';
        }
    });
}

export async function previewContractPdf(id) {
    const k = (state.data?.contracts || []).find((x) => Number(x.id) === Number(id));
    if (!k) return;
    toast('Menyiapkan dokumen PDF SPK…', 'info');
    try {
        const payload = {
            ...k,
            client_nama: state.client?.nama_perusahaan || '-',
            client_pic: state.client?.penanggung_jawab || '-',
            client_telepon: state.client?.telepon || '',
            client_email: state.client?.email || '',
            bank_accounts: state.data?.payment_methods || [],
            company: state.data?.company || {}
        };
        const out = await generateContractPdf(payload, 'bloburl');
        openPdfPreviewModal(k.nomor_kontrak || 'SPK', out.blobUrl || out.url, out.filename);
    } catch (err) {
        toast(err?.message || 'Gagal membuat PDF SPK', 'error');
    }
}

export async function previewQuotationPdf(token) {
    if (!token) return;
    toast('Menyiapkan dokumen PDF…', 'info');
    const res = await api(`public-quotation?token=${encodeURIComponent(token)}`);
    if (!res?.success || !res.data) return;
    try {
        const quo = { ...res.data, company: res.data.company || state.data?.company || {} };
        const out = await generateQuotationPdf(quo, 'bloburl');
        openPdfPreviewModal(quo.nomor_penawaran || 'Penawaran', out.blobUrl || out.url, out.filename);
    } catch (err) {
        toast(err?.message || 'Gagal membuat PDF penawaran', 'error');
    }
}
