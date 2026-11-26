// ============================================
// PROJECTS SUB-MODULE: Warranty, Change Requests & Go-Live Checklist (Lazy-loaded)
// ============================================

export async function openProjectChangeRequests(projectId) {
    const res = await App.api(`projects/${projectId}/change-requests`);
    if (!res?.success || !res.data) {
        App.toast(res?.message || 'Gagal memuat data garansi & adendum', 'error');
        return;
    }

    const { project: p, warranty: w, items } = res.data;
    let modal = document.getElementById('project-cr-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'project-cr-modal';
        modal.className = 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4';
        document.body.appendChild(modal);
    }

    const wSummary = w?.status === 'active'
        ? `<span class="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">Garansi Aktif · ${w.days_left} hari tersisa (s/d ${App.formatDate(w.end)})</span>`
        : w?.status === 'expired'
            ? `<span class="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold">Masa Garansi Berakhir (${App.formatDate(w.end)})</span>`
            : w?.days > 0
                ? `<span class="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">Garansi ${w.days} Hari (Menunggu BAST Sah)</span>`
                : `<span class="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">Belum ada masa garansi di kontrak</span>`;

    modal.innerHTML = `
        <div class="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-fadeIn max-h-[92vh] overflow-y-auto space-y-5">
            <div class="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div class="space-y-1 min-w-0 flex-1">
                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-teal-600">Tracker Garansi &amp; Adendum SPK</span>
                    <h2 class="text-xl font-black text-slate-900 dark:text-white">${App.escapeHtml(p.nama_project)}</h2>
                    <div class="pt-1">${wSummary}</div>
                </div>
                <button type="button" onclick="document.getElementById('project-cr-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
                    <i class="ri-close-line text-2xl"></i>
                </button>
            </div>

            <form id="cr-add-form" class="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div class="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Tambah Adendum / Change Request Baru</div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="sm:col-span-2">
                        <input id="cr-judul" type="text" required placeholder="Judul fitur / perubahan tambahan..." class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <input id="cr-biaya" type="number" min="0" step="1000" placeholder="Biaya (Rp)" class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        <input id="cr-hari" type="number" min="0" placeholder="+ Hari" class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input id="cr-deskripsi" type="text" placeholder="Catatan ruang lingkup adendum (opsional)" class="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    <button type="submit" class="whitespace-nowrap px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold">Tambah Adendum</button>
                </div>
            </form>

            <div class="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                ${items.length === 0 ? `
                    <div class="p-8 text-center text-slate-400">Belum ada adendum / change request untuk proyek ini.</div>
                ` : items.map((cr) => `
                    <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="min-w-0 flex-1 space-y-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-mono font-bold text-slate-900 dark:text-white">${App.escapeHtml(cr.nomor_adendum)}</span>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">${App.escapeHtml(cr.status)}</span>
                                ${cr.nomor_invoice ? `<span class="text-[11px] font-mono text-emerald-600 font-bold">Faktur: ${App.escapeHtml(cr.nomor_invoice)}</span>` : ''}
                            </div>
                            <div class="font-bold text-slate-800 dark:text-slate-200">${App.escapeHtml(cr.judul)}</div>
                            <div class="text-[11px] text-slate-500 font-mono">Biaya: <b>${App.formatIDR(cr.biaya)}</b> · Estimasi: +${cr.estimasi_hari || 0} hari</div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            ${cr.status === 'draft' ? `<button type="button" onclick="window.updateCrStatus(${projectId}, ${cr.id}, 'disetujui')" class="whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 font-semibold">Setujui</button>` : ''}
                            ${!cr.invoice_id && Number(cr.biaya) > 0 ? `<button type="button" onclick="window.createCrInvoice(${projectId}, ${cr.id})" class="whitespace-nowrap px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Terbitkan Faktur</button>` : ''}
                            ${!cr.invoice_id ? `<button type="button" onclick="window.deleteCr(${projectId}, ${cr.id})" class="p-1.5 text-slate-400 hover:text-rose-600"><i class="ri-delete-bin-line text-base"></i></button>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.getElementById('cr-add-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const r = await App.api(`projects/${projectId}/change-requests`, {
            method: 'POST',
            body: {
                judul: document.getElementById('cr-judul').value.trim(),
                biaya: Number(document.getElementById('cr-biaya').value || 0),
                estimasi_hari: Number(document.getElementById('cr-hari').value || 0),
                deskripsi: document.getElementById('cr-deskripsi').value.trim()
            }
        });
        if (r?.success) {
            App.toast(r.message || 'Adendum ditambahkan', 'success');
            openProjectChangeRequests(projectId);
            window._reloadProjectsList?.();
        }
    });

    modal.classList.remove('hidden');
}

export async function updateCrStatus(projectId, crId, status) {
    const r = await App.api(`projects/${projectId}/change-requests/${crId}`, { method: 'PUT', body: { status } });
    if (r?.success) {
        App.toast('Status adendum diperbarui', 'success');
        openProjectChangeRequests(projectId);
    }
}

export async function createCrInvoice(projectId, crId) {
    const ok = await App.confirm('Terbitkan Faktur Adendum', 'Terbitkan faktur tagihan resmi untuk adendum ini?');
    if (!ok) return;
    const r = await App.api(`projects/${projectId}/change-requests/${crId}/invoice`, { method: 'POST' });
    if (r?.success) {
        App.toast(r.message || 'Faktur adendum diterbitkan', 'success');
        openProjectChangeRequests(projectId);
        window._reloadProjectsList?.();
    }
}

export async function deleteCr(projectId, crId) {
    const ok = await App.confirm('Hapus Adendum', 'Hapus adendum ini?', 'warning');
    if (!ok) return;
    const r = await App.api(`projects/${projectId}/change-requests/${crId}`, { method: 'DELETE' });
    if (r?.success) {
        App.toast('Adendum dihapus', 'success');
        openProjectChangeRequests(projectId);
        window._reloadProjectsList?.();
    }
}

export async function openProjectGoliveChecklist(projectId) {
    const res = await App.api(`projects/${projectId}/golive-checklist`, { cache: false });
    if (!res || !res.success || !res.data) return;

    const { project: proj, items = [], summary = {} } = res.data;
    const pct = Number(summary.ready_pct || 0);
    const isReady = !!summary.is_ready;
    const autoItems = items.filter((i) => i.category === 'otomatis');
    const manualItems = items.filter((i) => i.category === 'manual');

    let modal = document.getElementById('golive-checklist-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'golive-checklist-modal';
        modal.className = 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fadeIn max-h-[92vh] flex flex-col">
            <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-start justify-between gap-4 shrink-0">
                <div class="flex items-center gap-3.5 min-w-0">
                    <div class="w-11 h-11 rounded-2xl ${isReady ? 'bg-emerald-600' : 'bg-primary-600'} text-white flex items-center justify-center shrink-0 shadow-sm">
                        <i class="ri-rocket-2-line text-xl"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="text-[11px] font-mono font-bold text-primary-600">${App.escapeHtml(proj.kode_project)} · ${App.escapeHtml(proj.nama_perusahaan)}</div>
                        <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">Checklist Kesiapan Go-Live</h3>
                        <div class="text-xs text-slate-500 dark:text-slate-400 truncate">${App.escapeHtml(proj.nama_project)}</div>
                    </div>
                </div>
                <button type="button" onclick="document.getElementById('golive-checklist-modal').classList.add('hidden')" class="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-800" aria-label="Tutup">
                    <i class="ri-close-line text-xl"></i>
                </button>
            </div>

            <div class="p-6 overflow-y-auto space-y-5 text-xs">
                <div class="p-4 rounded-2xl border ${isReady ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/30'} space-y-2">
                    <div class="flex items-center justify-between gap-2">
                        <span class="font-bold text-slate-800 dark:text-slate-200">
                            ${isReady ? 'Proyek Siap Serah Terima (Go-Live)' : 'Progres Kesiapan Serah Terima'}
                        </span>
                        <span class="font-mono font-black ${isReady ? 'text-emerald-600' : 'text-primary-600'}">${summary.passed_count || 0}/${summary.total_count || 0} (${pct}%)</span>
                    </div>
                    <div class="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div class="h-full transition-all ${isReady ? 'bg-emerald-500' : 'bg-primary-600'}" style="width:${pct}%"></div>
                    </div>
                </div>

                <div class="space-y-2.5">
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pemeriksaan Otomatis Sistem</div>
                    <div class="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                        ${autoItems.map((it) => `
                            <div class="p-3.5 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                                <div class="flex items-start gap-2.5 min-w-0">
                                    <i class="${it.passed ? 'ri-checkbox-circle-fill text-emerald-500' : 'ri-error-warning-fill text-amber-500'} text-base shrink-0 mt-0.5"></i>
                                    <div class="min-w-0">
                                        <div class="font-bold text-slate-800 dark:text-slate-200">${App.escapeHtml(it.label)}</div>
                                        <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">${App.escapeHtml(it.detail || '')}</div>
                                    </div>
                                </div>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${it.passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'}">
                                    ${it.passed ? 'Terpenuhi' : 'Belum'}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="space-y-2.5">
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verifikasi Manual Tim</div>
                    <div class="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                        ${manualItems.map((it) => `
                            <label class="p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 flex items-center justify-between gap-3 cursor-pointer transition">
                                <div class="flex items-start gap-3 min-w-0">
                                    <input type="checkbox" class="golive-manual-chk w-4 h-4 mt-0.5 rounded text-emerald-600" data-key="${App.escapeHtml(it.key)}" ${it.passed ? 'checked' : ''}>
                                    <div class="min-w-0">
                                        <div class="font-bold text-slate-800 dark:text-slate-200">${App.escapeHtml(it.label)}</div>
                                        <div class="text-[11px] text-slate-500 dark:text-slate-400">${App.escapeHtml(it.detail || '')}</div>
                                    </div>
                                </div>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${it.passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}">
                                    ${it.passed ? 'Selesai' : 'Menunggu'}
                                </span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
                <button type="button" onclick="document.getElementById('golive-checklist-modal').classList.add('hidden')" class="px-5 py-2 bg-slate-900 dark:bg-primary-600 text-white rounded-xl text-xs font-bold">Tutup</button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');

    modal.querySelectorAll('.golive-manual-chk').forEach((chk) => {
        chk.addEventListener('change', async () => {
            const key = chk.getAttribute('data-key');
            const checked = chk.checked;
            chk.disabled = true;
            const r = await App.api(`projects/${projectId}/golive-checklist`, {
                method: 'POST',
                body: { key, checked }
            });
            if (r?.success) {
                App.toast(r.message, 'success');
                openProjectGoliveChecklist(projectId);
            } else {
                chk.disabled = false;
                chk.checked = !checked;
            }
        });
    });
}
