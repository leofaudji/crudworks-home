// portal/pages/tickets.js — Manajemen Tiket Gangguan & Dukungan Klien
import { renderEmailBody, renderEmailAttachments, initEmailComposer } from '../../assets/js/core/email-editor.js';
import { $, esc, fdate, badge, sectionTitle, panel, empty, api, toast, openModal, closeModal, state, hooks } from '../ctx.js';

const KAT_LABELS = {
    gangguan_sistem: 'Gangguan Sistem',
    domain_ssl: 'Domain / Hosting / SSL',
    perbaikan_bug: 'Perbaikan Bug',
    permintaan_fitur: 'Permintaan Fitur',
    billing: 'Penagihan & Faktur',
    lainnya: 'Lainnya'
};

const STATUS_META = {
    terbuka: { label: 'Terbuka', tone: 'amber' },
    diproses: { label: 'Diproses', tone: 'indigo' },
    menunggu_klien: { label: 'Menunggu Balasan Anda', tone: 'red' },
    selesai: { label: 'Selesai', tone: 'green' },
    ditutup: { label: 'Ditutup', tone: 'slate' }
};

const PRIO_META = {
    kritis: { label: 'Kritis', tone: 'red' },
    tinggi: { label: 'Tinggi', tone: 'amber' },
    sedang: { label: 'Sedang', tone: 'slate' },
    rendah: { label: 'Rendah', tone: 'slate' }
};

export function renderTickets(d) {
    const all = d.tickets || [];
    const filter = state.ticketFilter || '';
    const list = filter ? all.filter((t) => t.status === filter) : all;

    const listHtml = list.length === 0
        ? empty(filter ? 'Tidak ada tiket dengan status ini.' : 'Belum ada tiket gangguan.')
        : panel(`<div class="max-h-[62vh] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
            ${list.map((t) => {
                const st = STATUS_META[t.status] || { label: t.status, tone: 'slate' };
                const pr = PRIO_META[t.prioritas] || { label: t.prioritas, tone: 'slate' };
                return `
                    <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                        <div class="min-w-0 space-y-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-mono font-bold text-xs text-slate-900 dark:text-white">${esc(t.nomor_tiket)}</span>
                                ${badge(st.label, st.tone)}
                                ${t.prioritas === 'kritis' || t.prioritas === 'tinggi' ? badge(pr.label, pr.tone) : `<span class="text-[11px] text-slate-400 font-medium">${esc(pr.label)}</span>`}
                            </div>
                            <div class="text-sm font-bold text-slate-900 dark:text-white leading-snug">${esc(t.judul)}</div>
                            <div class="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                                <span>${esc(KAT_LABELS[t.kategori] || t.kategori)}</span>
                                ${t.nama_project ? `<span>${esc(t.nama_project)}</span>` : ''}
                                <span class="font-mono">${fdate(t.created_at)}</span>
                            </div>
                        </div>
                        <button data-action="ticket-detail" data-id="${t.id}" class="shrink-0 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5">
                            <i class="ri-mail-open-line text-slate-500"></i>
                            <span>Buka Utas${Number(t.reply_count) > 0 ? ` (${t.reply_count})` : ''}</span>
                        </button>
                    </div>`;
            }).join('')}
        </div>`);

    return `
        <div class="space-y-3">
            ${sectionTitle('Tiket Gangguan', `<button data-action="ticket-new" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-primary-600 dark:hover:bg-primary-700 text-white text-xs font-semibold flex items-center gap-1.5"><i class="ri-add-line"></i><span>Buat Tiket</span></button>`)}

            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                ${[
                    { k: '', l: `Semua (${all.length})` },
                    { k: 'terbuka', l: 'Terbuka' },
                    { k: 'diproses', l: 'Diproses' },
                    { k: 'menunggu_klien', l: 'Menunggu Balasan' },
                    { k: 'selesai', l: 'Selesai' }
                ].map((f) => `
                    <button data-action="ticket-filter" data-val="${f.k}" class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === f.k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}">
                        ${f.l}
                    </button>`).join('')}
            </div>

            ${listHtml}
        </div>`;
}

export function openNewTicketModal() {
    const projects = state.data?.projects || [];
    const assets = state.data?.maintenance || [];

    openModal(`
        <div class="p-5 sm:p-6 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 class="text-base font-bold">Buat Tiket Gangguan</h3>
                <button data-action="close-modal" class="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Tutup"><i class="ri-close-line text-xl"></i></button>
            </div>

            <form id="ticket-new-form" class="space-y-3.5 text-xs" novalidate>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Kategori *</label>
                        <select id="tkt-kategori" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm">
                            ${Object.entries(KAT_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Prioritas *</label>
                        <select id="tkt-prioritas" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm">
                            <option value="sedang">Sedang (Normal)</option>
                            <option value="tinggi">Tinggi (Mengganggu Operasional)</option>
                            <option value="kritis">Kritis (Sistem Down)</option>
                            <option value="rendah">Rendah (Pertanyaan Umum)</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    ${projects.length ? `
                        <div>
                            <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Proyek Terkait</label>
                            <select id="tkt-project" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm">
                                <option value="">Umum / Semua Proyek</option>
                                ${projects.map((p) => `<option value="${p.id}">${esc(p.nama_project)} (${esc(p.kode_project)})</option>`).join('')}
                            </select>
                        </div>` : '<input type="hidden" id="tkt-project" value="">'}

                    ${assets.length ? `
                        <div>
                            <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Domain / Layanan Terkait</label>
                            <select id="tkt-asset" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm">
                                <option value="">Tidak Spesifik</option>
                                ${assets.map((m) => `<option value="${m.id}">${esc(m.nama_aset)}${m.domain_name ? ' (' + esc(m.domain_name) + ')' : ''}</option>`).join('')}
                            </select>
                        </div>` : '<input type="hidden" id="tkt-asset" value="">'}
                </div>

                <div>
                    <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Subjek Kendala *</label>
                    <input id="tkt-judul" type="text" required placeholder="Contoh: Halaman laporan PDF gagal dibuka"
                           class="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600">
                </div>

                <div>
                    <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Detail & Kronologi *</label>
                    <div id="tkt-new-composer"></div>
                </div>

                <button id="tkt-submit" type="submit" class="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2">
                    <i class="ri-send-plane-line"></i><span>Kirim Tiket</span>
                </button>
            </form>
        </div>`, { wide: true });

    const composer = initEmailComposer($('#tkt-new-composer'), {
        placeholder: 'Jelaskan langkah kejadian, pesan error, atau tempel screenshot langsung dengan Ctrl+V…',
        minHeight: 220,
        onNotify: toast
    });

    $('#ticket-new-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const judul = $('#tkt-judul').value.trim();
        if (!judul || !composer.hasContent()) { toast('Subjek dan detail/lampiran kendala wajib diisi', 'warning'); return; }

        const btn = $('#tkt-submit');
        btn.disabled = true; btn.classList.add('opacity-70');
        const res = await api('portal-auth/create-ticket', {
            method: 'POST',
            body: {
                kategori: $('#tkt-kategori').value,
                prioritas: $('#tkt-prioritas').value,
                project_id: $('#tkt-project').value || null,
                maintenance_id: $('#tkt-asset').value || null,
                judul,
                deskripsi: composer.getHtml(),
                lampiran: composer.getImages()
            }
        });
        if (res.success) {
            toast(res.message || 'Tiket berhasil dikirim', 'success');
            closeModal();
            await hooks.reloadData({ silent: true });
        } else {
            btn.disabled = false; btn.classList.remove('opacity-70');
        }
    });
}

export async function openTicketDetailModal(ticketId) {
    openModal(`<div class="p-10 text-center"><i class="ri-loader-4-line text-2xl text-slate-500 animate-spin"></i></div>`);
    const res = await api(`portal-auth/ticket-detail?id=${encodeURIComponent(ticketId)}`);
    if (!res.success) { closeModal(); return; }

    const { ticket: t, replies = [] } = res.data;
    const st = STATUS_META[t.status] || { label: t.status, tone: 'slate' };
    const isClosed = ['selesai', 'ditutup'].includes(t.status);

    openModal(`
        <div class="p-5 sm:p-6 space-y-4">
            <div class="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-mono font-bold text-xs text-slate-500">${esc(t.nomor_tiket)}</span>
                        ${badge(st.label, st.tone)}
                    </div>
                    <h3 class="text-base font-bold mt-1 leading-snug text-slate-900 dark:text-white">${esc(t.judul)}</h3>
                    <div class="text-[11px] text-slate-500 mt-0.5">${esc(KAT_LABELS[t.kategori] || t.kategori)} · ${fdate(t.created_at)}${t.nama_project ? ' · ' + esc(t.nama_project) : ''}</div>
                </div>
                <button data-action="close-modal" class="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0" aria-label="Tutup"><i class="ri-close-line text-xl"></i></button>
            </div>

            <!-- Email Thread -->
            <div class="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
                <article class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                    <div class="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <span class="w-7 h-7 rounded-full bg-slate-900 dark:bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">${esc((t.pelapor_nama || 'K').trim().charAt(0).toUpperCase())}</span>
                            <div class="min-w-0 leading-tight">
                                <div class="text-xs font-bold text-slate-900 dark:text-white truncate">${esc(t.pelapor_nama || 'Klien')} <span class="font-normal text-slate-500">(Anda)</span></div>
                                <div class="text-[10px] text-slate-500 truncate">Kepada: Tim Dukungan CRUDWorks</div>
                            </div>
                        </div>
                        <span class="text-[10px] font-mono text-slate-400 shrink-0">${fdate(t.created_at)}</span>
                    </div>
                    <div class="p-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        ${renderEmailBody(t.deskripsi)}
                        ${renderEmailAttachments(t.lampiran_json, '../')}
                    </div>
                </article>

                ${replies.map((r) => {
                    const isClient = r.sender_type === 'client';
                    const initial = (r.sender_name || (isClient ? 'K' : 'T')).trim().charAt(0).toUpperCase();
                    return `
                        <article class="rounded-xl border ${isClient ? 'border-slate-200 dark:border-slate-800' : 'border-indigo-200/80 dark:border-indigo-900/70'} bg-white dark:bg-slate-900 overflow-hidden">
                            <div class="px-4 py-2.5 ${isClient ? 'bg-slate-50/80 dark:bg-slate-800/40' : 'bg-indigo-50/60 dark:bg-indigo-950/30'} border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                                <div class="flex items-center gap-2.5 min-w-0">
                                    <span class="w-7 h-7 rounded-full ${isClient ? 'bg-slate-900 dark:bg-slate-700 text-white' : 'bg-indigo-600 text-white'} text-[11px] font-bold flex items-center justify-center shrink-0">${esc(initial)}</span>
                                    <div class="min-w-0 leading-tight">
                                        <div class="text-xs font-bold text-slate-900 dark:text-white truncate">${esc(r.sender_name)} <span class="font-normal text-slate-500">${isClient ? '(Anda)' : '· Tim Teknis'}</span></div>
                                        <div class="text-[10px] text-slate-500 truncate">Kepada: ${isClient ? 'Tim Dukungan CRUDWorks' : esc(t.pelapor_nama || 'Anda')}</div>
                                    </div>
                                </div>
                                <span class="text-[10px] font-mono text-slate-400 shrink-0">${fdate(r.created_at)}</span>
                            </div>
                            <div class="p-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                ${renderEmailBody(r.pesan)}
                                ${renderEmailAttachments(r.lampiran_json, '../')}
                            </div>
                        </article>`;
                }).join('')}
            </div>

            <!-- Email Reply Composer ala Gmail -->
            <form id="ticket-reply-form" class="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div class="text-[11px] text-slate-500 flex items-center justify-between gap-2">
                    <span class="truncate"><b>Balas ke:</b> Tim Dukungan CRUDWorks · <span class="font-mono">Re: [${esc(t.nomor_tiket)}]</span></span>
                </div>
                <div id="tkt-reply-composer"></div>
                <div class="flex items-center justify-between gap-2">
                    ${isClosed ? '<span></span>' : `<button type="button" id="tkt-close-btn" class="px-3.5 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">Tandai Selesai</button>`}
                    <button id="tkt-reply-btn" type="submit" class="px-4 py-2 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"><i class="ri-send-plane-line"></i><span>Kirim Balasan</span></button>
                </div>
            </form>
        </div>`, { wide: true });

    const replyComposer = initEmailComposer($('#tkt-reply-composer'), {
        placeholder: 'Tulis balasan email atau tempel screenshot dengan Ctrl+V…',
        minHeight: 170,
        onNotify: toast
    });

    $('#ticket-reply-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!replyComposer.hasContent()) { toast('Tulis pesan atau lampirkan gambar terlebih dahulu', 'warning'); return; }
        const btn = $('#tkt-reply-btn');
        btn.disabled = true;
        const r = await api('portal-auth/reply-ticket', {
            method: 'POST',
            body: { ticket_id: t.id, pesan: replyComposer.getHtml(), lampiran: replyComposer.getImages() }
        });
        if (r.success) {
            toast('Balasan terkirim', 'success');
            await hooks.reloadData({ silent: true });
            openTicketDetailModal(t.id);
        } else {
            btn.disabled = false;
        }
    });

    const closeBtn = $('#tkt-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', async () => {
            closeBtn.disabled = true;
            const r = await api('portal-auth/close-ticket', { method: 'POST', body: { ticket_id: t.id } });
            if (r.success) {
                toast('Tiket ditandai selesai', 'success');
                closeModal();
                await hooks.reloadData({ silent: true });
            } else {
                closeBtn.disabled = false;
            }
        });
    }
}
