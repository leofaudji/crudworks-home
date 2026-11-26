// portal/pages/projects.js — Progres Proyek, Milestone & BAST Digital
import { generateBastPdf } from '../../assets/js/core/utils.js';
import { $, esc, money, fdate, badge, sectionTitle, panel, empty, api, toast, openModal, openPdfPreviewModal, closeModal, state, hooks } from '../ctx.js';

function renderWarrantyBadge(w) {
    if (!w || !w.days) return '';
    if (w.status === 'active') return badge(`Garansi Aktif · ${w.days_left} hr (s/d ${fdate(w.end)})`, 'green');
    if (w.status === 'expired') return badge(`Garansi Berakhir (${fdate(w.end)})`, 'slate');
    return badge(`Garansi ${w.days} Hari (Pasca-BAST)`, 'amber');
}

export function renderProjects(d) {
    const projects = d.projects || [];
    const basts = d.basts || [];

    const projectHtml = projects.length === 0
        ? empty('Belum ada proyek aktif untuk perusahaan Anda.')
        : panel(`<div class="divide-y divide-slate-200 dark:divide-slate-800">
            ${projects.map((p) => {
                const st = p.task_stats || { total: 0, done: 0, review: 0, in_progress: 0, todo: 0 };
                const pct = Number(p.progress_pct || 0);
                const done = pct >= 100;
                return `
                    <div class="p-4 sm:p-5 space-y-3.5">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="font-mono text-[11px] font-semibold text-slate-500">${esc(p.kode_project)}</span>
                                    ${badge(p.status, p.status === 'selesai' ? 'green' : 'indigo')}
                                    ${p.last_health_status === 'online' ? badge('Online', 'green') : ''}
                                    ${renderWarrantyBadge(p.warranty)}
                                </div>
                                <h3 class="text-sm font-bold text-slate-900 dark:text-white mt-1">${esc(p.nama_project)}</h3>
                                ${p.app_url ? `<a href="${esc(p.app_url)}" target="_blank" rel="noopener" class="text-xs font-mono text-primary-600 hover:underline inline-flex items-center gap-1 mt-0.5 break-all">${esc(p.app_url)} <i class="ri-external-link-line text-[11px]"></i></a>` : ''}
                            </div>
                            <div class="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2">
                                <div>
                                    <div class="text-xl font-bold font-mono tabular-nums ${done ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}">${pct}%</div>
                                    ${st.total > 0 ? `<div class="text-[11px] text-slate-500 font-mono tabular-nums">${st.done}/${st.total} tugas selesai</div>` : ''}
                                </div>
                                ${(p.documents?.basts?.length || p.documents?.contracts?.length) ? `
                                    <div class="flex flex-wrap items-center gap-1.5">
                                        ${(p.documents?.contracts || []).slice(0, 1).map((ct) => `
                                            <button type="button" data-action="contract-pdf" data-id="${ct.id}" class="px-2 py-1 rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-indigo-100">
                                                <i class="ri-file-shield-2-line"></i><span>SPK</span>
                                            </button>`).join('')}
                                        ${(p.documents?.basts || []).slice(0, 1).map((b) => `
                                            <button type="button" data-action="bast-pdf" data-id="${b.id}" class="px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1 hover:bg-emerald-100">
                                                <i class="ri-file-check-line"></i><span>BAST</span>
                                            </button>`).join('')}
                                    </div>` : ''}
                            </div>
                        </div>

                        <div class="space-y-2">
                            <div class="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                                ${st.total > 0 ? `
                                    <div class="h-full bg-emerald-500 transition-all" style="width:${(st.done / st.total) * 100}%"></div>
                                    <div class="h-full bg-amber-400 transition-all" style="width:${(st.review / st.total) * 100}%"></div>
                                    <div class="h-full bg-indigo-500 transition-all" style="width:${(st.in_progress / st.total) * 100}%"></div>
                                ` : `<div class="h-full ${done ? 'bg-emerald-500' : 'bg-indigo-600'}" style="width:${pct}%"></div>`}
                            </div>
                            ${st.total > 0 ? `
                                <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-slate-500 font-mono tabular-nums">
                                    ${st.todo > 0 ? `<span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></span>Antrean <b class="text-slate-700 dark:text-slate-300">${st.todo}</b></span>` : ''}
                                    ${st.in_progress > 0 ? `<span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-indigo-500"></span>Dikerjakan <b class="text-slate-700 dark:text-slate-300">${st.in_progress}</b></span>` : ''}
                                    ${st.review > 0 ? `<span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-400"></span>Uji/UAT <b class="text-slate-700 dark:text-slate-300">${st.review}</b></span>` : ''}
                                    <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>Selesai <b class="text-slate-700 dark:text-slate-300">${st.done}</b></span>
                                </div>` : ''}
                        </div>

                        ${(p.milestones || []).length ? `
                            <div class="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                ${p.milestones.map((m, i) => {
                                    const mp = Number(m.progress_pct || 0);
                                    const tone = m.status === 'lunas' ? 'green' : (m.status === 'ditagih' ? 'amber' : 'slate');
                                    const mLabel = m.status === 'lunas' ? 'Lunas' : (m.status === 'ditagih' ? 'Menunggu Tagihan' : (mp > 0 ? 'Berjalan' : 'Belum Mulai'));
                                    const mTotal = Number(m.task_stats?.total ?? 0);
                                    return `
                                        <div class="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3 space-y-1.5">
                                            <div class="flex items-center justify-between gap-2 text-xs">
                                                <span class="font-semibold text-slate-800 dark:text-slate-200 truncate">${i + 1}. ${esc(m.nama_milestone)}</span>
                                                <span class="font-mono font-bold tabular-nums text-slate-700 dark:text-slate-300">${mp}%</span>
                                            </div>
                                            <div class="h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"><div class="h-full ${mp >= 100 ? 'bg-emerald-500' : 'bg-slate-700 dark:bg-primary-500'}" style="width:${mp}%"></div></div>
                                            <div class="flex items-center justify-between text-[11px] text-slate-500">
                                                <span class="font-mono tabular-nums">Porsi ${esc(m.persentase)}%${mTotal > 0 ? ` · ${m.task_stats?.done ?? 0}/${mTotal}` : ''}</span>
                                                ${badge(mLabel, tone)}
                                            </div>
                                        </div>`;
                                }).join('')}
                            </div>` : ''}

                        ${(p.releases || []).length ? `
                            <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <i class="ri-git-commit-line text-indigo-500"></i><span>Pembaruan Rilis Terbaru</span>
                                </div>
                                <div class="space-y-1.5">
                                    ${p.releases.map((rel) => `
                                        <div class="flex items-baseline justify-between gap-3 text-xs">
                                            <div class="min-w-0 flex items-baseline gap-2">
                                                <span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">${esc(rel.hash)}</span>
                                                <span class="text-slate-700 dark:text-slate-300 truncate">${esc(rel.message)}</span>
                                            </div>
                                            <span class="font-mono text-[11px] text-slate-400 shrink-0">${esc(rel.date)}</span>
                                        </div>`).join('')}
                                </div>
                            </div>` : ''}

                        ${((p.documents?.quotations?.length || 0) + (p.documents?.contracts?.length || 0) + (p.documents?.basts?.length || 0)) > 0 ? `
                            <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <i class="ri-folder-zip-line text-primary-500"></i><span>Bundel Dokumen Proyek</span>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    ${(p.documents?.quotations || []).map((q) => `
                                        <button type="button" data-action="quo-pdf" data-token="${esc(q.public_token || q.nomor_penawaran)}" class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5">
                                            <i class="ri-file-paper-2-line text-amber-600"></i><span>SPH ${esc(q.nomor_penawaran)}</span>
                                        </button>`).join('')}
                                    ${(p.documents?.contracts || []).map((ct) => `
                                        <button type="button" data-action="contract-pdf" data-id="${ct.id}" class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5">
                                            <i class="ri-file-shield-2-line text-indigo-600"></i><span>SPK ${esc(ct.nomor_kontrak)}</span>
                                        </button>`).join('')}
                                    ${(p.documents?.basts || []).map((b) => `
                                        <button type="button" data-action="bast-pdf" data-id="${b.id}" class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5">
                                            <i class="ri-file-check-line text-emerald-600"></i><span>BAST ${esc(b.nomor_bast)}</span>
                                        </button>`).join('')}
                                </div>
                            </div>` : ''}

                        ${(p.change_requests || []).length ? `
                            <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <i class="ri-git-pull-request-line text-amber-500"></i><span>Adendum / Perubahan Lingkup</span>
                                </div>
                                <div class="space-y-1.5">
                                    ${p.change_requests.map((cr) => `
                                        <div class="flex flex-wrap items-center justify-between gap-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                                            <div class="min-w-0">
                                                <span class="font-mono font-bold text-slate-700 dark:text-slate-200">${esc(cr.nomor_adendum)}</span>
                                                <span class="text-slate-600 dark:text-slate-300 ml-1.5">${esc(cr.judul)}</span>
                                            </div>
                                            <div class="flex items-center gap-2 shrink-0">
                                                <span class="font-mono font-semibold text-slate-700 dark:text-slate-200">${money(cr.biaya)}</span>
                                                ${badge(cr.status, cr.status === 'selesai' || cr.status === 'disetujui' ? 'green' : 'amber')}
                                            </div>
                                        </div>`).join('')}
                                </div>
                            </div>` : ''}
                    </div>`;
            }).join('')}
        </div>`);

    const bastHtml = basts.length === 0
        ? empty('Belum ada Berita Acara Serah Terima (BAST).')
        : panel(`<div class="divide-y divide-slate-200 dark:divide-slate-800">
            ${basts.map((b) => {
                const signed = b.status === 'ditandatangani';
                return `
                    <div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="min-w-0 space-y-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-mono font-bold text-xs text-slate-900 dark:text-white">${esc(b.nomor_bast)}</span>
                                ${signed ? badge('Sah & Ditandatangani', 'green') : badge('Menunggu Pengesahan', 'amber')}
                            </div>
                            <div class="text-sm font-semibold text-slate-800 dark:text-slate-200">${esc(b.judul_pekerjaan)}</div>
                            <div class="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                                <span>${esc(b.nama_project)}${b.nama_milestone ? ' · ' + esc(b.nama_milestone) : ''}</span>
                                <span class="font-mono">${fdate(b.tanggal_bast)}</span>
                                ${signed && b.signed_at ? `<span class="text-emerald-600 font-medium">Disahkan ${esc(b.pihak_kedua_nama)} · ${fdate(b.signed_at)}</span>` : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <button data-action="bast-pdf" data-id="${b.id}" class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5">
                                <i class="ri-file-pdf-2-line text-rose-600"></i><span>PDF</span>
                            </button>
                            ${signed ? '' : `
                                <button data-action="bast-sign" data-id="${b.id}" class="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5">
                                    <i class="ri-quill-pen-line"></i><span>Uji & Tandatangani</span>
                                </button>`}
                        </div>
                    </div>`;
            }).join('')}
        </div>`);

    return `
        <div class="space-y-3">
            ${sectionTitle('Progres Proyek')}
            ${projectHtml}
        </div>
        <div class="space-y-3">
            ${sectionTitle('Berita Acara Serah Terima (BAST)')}
            ${bastHtml}
        </div>`;
}

const findBast = (id) => (state.data?.basts || []).find((b) => Number(b.id) === Number(id));

export async function previewBastPdf(id) {
    const bast = findBast(id);
    if (!bast) return;
    toast('Menyiapkan dokumen PDF…', 'info');
    try {
        const out = await generateBastPdf({ ...bast, company: state.data.company || {} }, 'bloburl');
        openPdfPreviewModal(bast.nomor_bast, out.blobUrl || out.url, out.filename);
    } catch (err) {
        toast(err?.message || 'Gagal membuat PDF BAST. Periksa koneksi internet.', 'error');
    }
}

export function openSignModal(id) {
    const bast = findBast(id);
    if (!bast) return;
    const items = String(bast.deskripsi_hasil || '').split('\n').map((l) => l.trim().replace(/^([•\-*]|\d+\.)\s+/, '')).filter(Boolean);

    openModal(`
        <div class="p-5 sm:p-6 space-y-4">
            <div class="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div class="min-w-0">
                    <div class="text-[11px] font-mono font-semibold text-slate-500">${esc(bast.nomor_bast)}</div>
                    <h3 class="text-base font-bold leading-snug mt-0.5">${esc(bast.judul_pekerjaan)}</h3>
                </div>
                <button data-action="close-modal" class="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0" aria-label="Tutup"><i class="ri-close-line text-xl"></i></button>
            </div>

            <div class="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2">
                <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Daftar Hasil Pekerjaan</div>
                <ul class="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    ${items.map((t) => `<li class="flex items-start gap-2"><i class="ri-check-line text-emerald-600 mt-0.5 shrink-0"></i><span>${esc(t)}</span></li>`).join('')}
                </ul>
                ${bast.catatan_revisi ? `<div class="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500"><b>Catatan:</b> ${esc(bast.catatan_revisi)}</div>` : ''}
            </div>

            <form id="sign-form" class="space-y-3.5 text-xs" novalidate>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Nama Penandatangan *</label>
                        <input id="sign-name" type="text" required value="${esc(bast.pihak_kedua_nama || state.client?.penanggung_jawab || '')}" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"></div>
                    <div><label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Jabatan *</label>
                        <input id="sign-pos" type="text" required value="${esc(bast.pihak_kedua_jabatan || 'Penanggung Jawab (PIC)')}" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"></div>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label class="font-semibold text-slate-600 dark:text-slate-300">Tanda Tangan *</label>
                        <button type="button" id="sign-clear" class="text-[11px] font-semibold text-rose-600 hover:underline">Bersihkan</button>
                    </div>
                    <div class="relative bg-white rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden touch-none h-40">
                        <canvas id="sign-canvas" class="w-full h-full block cursor-crosshair"></canvas>
                        <div id="sign-hint" class="absolute inset-0 flex items-center justify-center text-[11px] text-slate-400 pointer-events-none">Goreskan tanda tangan di sini</div>
                    </div>
                </div>
                <label class="flex items-start gap-2 text-[11px] text-slate-500 leading-snug">
                    <input id="sign-agree" type="checkbox" class="mt-0.5 rounded">
                    <span>Saya menyatakan telah memeriksa dan menerima hasil pekerjaan di atas sesuai spesifikasi yang disepakati.</span>
                </label>
                <button id="sign-submit" type="submit" class="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2">Sahkan & Tandatangani BAST</button>
            </form>
        </div>`);

    initSignaturePad(id);
}

function initSignaturePad(bastId) {
    const canvas = $('#sign-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const hint = $('#sign-hint');
    let drawing = false;
    let drawn = false;

    const setup = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.round(rect.width * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };
    requestAnimationFrame(setup);

    const pos = (ev) => {
        const r = canvas.getBoundingClientRect();
        return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    };
    canvas.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        canvas.setPointerCapture(ev.pointerId);
        drawing = true; drawn = true;
        hint?.classList.add('hidden');
        const p = pos(ev);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.1, p.y + 0.1); ctx.stroke();
    });
    canvas.addEventListener('pointermove', (ev) => {
        if (!drawing) return;
        ev.preventDefault();
        const p = pos(ev);
        ctx.lineTo(p.x, p.y); ctx.stroke();
    });
    const stop = () => { drawing = false; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);

    $('#sign-clear').addEventListener('click', () => {
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        drawn = false; hint?.classList.remove('hidden');
    });

    $('#sign-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = $('#sign-name').value.trim();
        const pos2 = $('#sign-pos').value.trim();
        if (!name || !pos2) { toast('Nama dan jabatan penandatangan wajib diisi', 'warning'); return; }
        if (!drawn) { toast('Bubuhkan tanda tangan Anda pada kotak yang tersedia', 'warning'); return; }
        if (!$('#sign-agree').checked) { toast('Centang pernyataan persetujuan terlebih dahulu', 'warning'); return; }

        const btn = $('#sign-submit');
        btn.disabled = true; btn.classList.add('opacity-70');
        btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i><span>Menyimpan…</span>';

        const res = await api('portal-auth/sign-bast', {
            method: 'POST',
            body: { bast_id: bastId, signed_by_name: name, signed_by_position: pos2, signature_data: canvas.toDataURL('image/png') }
        });

        if (res.success) {
            toast(res.message || 'BAST berhasil disahkan', 'success');
            closeModal();
            await hooks.reloadData({ silent: true });
        } else {
            btn.disabled = false; btn.classList.remove('opacity-70');
            btn.innerHTML = 'Sahkan & Tandatangani BAST';
        }
    });
}
