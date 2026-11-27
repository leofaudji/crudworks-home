// ============================================
// PROJECTS SUB-MODULE: Health, Profitability & Milestones (Lazy-loaded)
// ============================================

export async function checkProjectHealth(id) {
    App.toast('Memeriksa kesehatan koneksi server & SSL...', 'info');
    const res = await App.api(`projects/${id}/health-check`, { method: 'POST' });
    if (res && res.success) {
        const d = res.data;
        Swal.fire({
            title: d.health_status === 'online' ? '✅ Server Aktif Normal' : '⚠️ Masalah Koneksi Server',
            html: `
                <div class="text-left space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <div><b>Target URL</b>: <a href="${d.target_url}" target="_blank" class="text-primary-600 underline font-mono">${d.target_url}</a></div>
                    <div><b>HTTP Status</b>: <span class="font-mono font-bold ${d.http_code >= 200 && d.http_code < 400 ? 'text-emerald-600' : 'text-rose-600'}">${d.http_code || 'N/A'}</span></div>
                    <div><b>Kecepatan Respons (Latency)</b>: <span class="font-mono font-bold">${d.latency_ms} ms</span></div>
                    <div><b>Masa Berlaku SSL</b>: <span class="font-mono font-bold ${d.ssl_days !== null && d.ssl_days < 30 ? 'text-rose-600' : 'text-emerald-600'}">${d.ssl_days !== null ? d.ssl_days + ' hari tersisa' : 'Tidak terdeteksi'}</span></div>
                    <div class="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-2">${d.status_message}</div>
                </div>
            `,
            icon: d.health_status === 'online' ? 'success' : 'warning',
            confirmButtonText: 'Tutup'
        });
        window._reloadProjectsList?.();
    }
}

export async function viewProjectProfitability(id) {
    const res = await App.api(`projects/${id}/profitability`);
    if (!res || !res.success) return;
    const { project: p, summary: s } = res.data;

    let modal = document.getElementById('project-profit-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'project-profit-modal';
        modal.className = 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-fadeIn max-h-[92vh] overflow-y-auto space-y-6">
            <div class="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-primary-600">Analisis Laba Rugi Proyek (P&L)</span>
                    <h2 class="text-xl font-black text-slate-900 dark:text-white mt-0.5">${p.nama_project}</h2>
                    <p class="text-xs text-slate-500">Klien: <b>${p.nama_perusahaan}</b> · Kode: <span class="font-mono">${p.kode_project}</span></p>
                </div>
                <button onclick="document.getElementById('project-profit-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1">
                    <i class="ri-close-line text-2xl"></i>
                </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div class="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                    <div class="text-[10px] font-bold text-slate-400 uppercase">Nilai Kontrak</div>
                    <div class="text-sm font-extrabold font-mono text-slate-900 dark:text-white mt-1">${App.formatIDR(s.nilai_kontrak)}</div>
                </div>
                <div class="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900">
                    <div class="text-[10px] font-bold text-emerald-600 uppercase">Terbayar Lunas</div>
                    <div class="text-sm font-extrabold font-mono text-emerald-700 dark:text-emerald-400 mt-1">${App.formatIDR(s.total_paid)}</div>
                </div>
                <div class="p-3.5 bg-rose-50/60 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900">
                    <div class="text-[10px] font-bold text-rose-600 uppercase">Beban Langsung</div>
                    <div class="text-sm font-extrabold font-mono text-rose-700 dark:text-rose-400 mt-1">${App.formatIDR(s.direct_expenses)}</div>
                </div>
                <div class="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900">
                    <div class="text-[10px] font-bold text-indigo-600 uppercase">Estimasi Jam Tim</div>
                    <div class="text-sm font-extrabold font-mono text-indigo-700 dark:text-indigo-400 mt-1">${s.total_hours} Jam</div>
                </div>
            </div>

            <div class="p-6 rounded-2xl border ${s.gross_profit >= 0 ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 border-rose-200'} flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div class="text-xs font-bold uppercase tracking-wider text-slate-500">Estimasi Laba Kotor (Gross Profit)</div>
                    <div class="text-3xl font-black font-mono ${s.gross_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'} mt-1">
                        ${App.formatIDR(s.gross_profit)}
                    </div>
                    <div class="text-xs text-slate-500 mt-1">Margin Profitabilitas: <b class="font-mono text-slate-800 dark:text-slate-200">${s.profit_margin_percent}%</b></div>
                </div>
                <div class="text-right">
                    <span class="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${s.gross_profit >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}">
                        ${s.status_profit === 'sangat_sehat' ? 'Margin Sangat Tinggi' : s.status_profit === 'sehat' ? 'Margin Sehat' : 'Defisit / Over Budget'}
                    </span>
                </div>
            </div>

            <div class="flex justify-end pt-2">
                <button type="button" onclick="document.getElementById('project-profit-modal').classList.add('hidden')" class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition">
                    Tutup
                </button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
}

export async function manageProjectMilestones(id) {
    const res = await App.api(`projects/${id}/profitability`);
    if (!res || !res.success) return;
    const { project: p, milestones: ms } = res.data;

    let modal = document.getElementById('project-milestone-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'project-milestone-modal';
        modal.className = 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-fadeIn max-h-[92vh] overflow-y-auto space-y-6">
            <div class="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-amber-500">Milestone & Termin Penagihan</span>
                    <h2 class="text-xl font-black text-slate-900 dark:text-white mt-0.5">${p.nama_project}</h2>
                    <p class="text-xs text-slate-500">Nilai Kontrak: <b class="font-mono text-primary-600">${App.formatIDR(p.nilai_project)}</b></p>
                </div>
                <button onclick="document.getElementById('project-milestone-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1">
                    <i class="ri-close-line text-2xl"></i>
                </button>
            </div>

            <div class="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Generate Cepat Pola Termin:</div>
                    <div class="text-[11px] text-slate-500">Bagi nilai kontrak menjadi termin otomatis</div>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="window.applyMilestonePattern(${id}, '30-40-30')" class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition">
                        Pola 30% - 40% - 30%
                    </button>
                    <button type="button" onclick="window.applyMilestonePattern(${id}, '50-50')" class="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold transition">
                        Pola 50% - 50%
                    </button>
                </div>
            </div>

            <div class="space-y-3">
                <div class="flex items-center justify-between gap-2">
                    <div class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Daftar Termin Proyek</div>
                    <button type="button" onclick="window.openMilestoneForm(${id}, null, ${Number(p.nilai_project || 0)})" class="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 transition shadow-sm">
                        <i class="ri-add-line"></i><span>Tambah Termin</span>
                    </button>
                </div>
                <div class="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    ${ms.length === 0 ? `
                        <div class="p-6 text-center text-slate-400">Belum ada termin milestone dibuat untuk proyek ini. Klik tombol pola di atas atau Tambah Termin.</div>
                    ` : ms.map((m, idx) => `
                        <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <div class="min-w-0 flex-1">
                                <div class="font-bold text-slate-900 dark:text-white flex items-start gap-2">
                                    <span class="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] flex items-center justify-center font-mono font-bold shrink-0 mt-0.5">${idx + 1}</span>
                                    <span class="leading-snug">${m.nama_milestone}</span>
                                </div>
                                <div class="text-xs text-slate-500 font-mono mt-1 pl-7">
                                    Porsi: <b>${m.persentase}%</b> · Nominal: <b class="text-slate-800 dark:text-slate-200 whitespace-nowrap">${App.formatIDR(m.nominal)}</b>${m.tanggal_target ? ` · Target: <span>${App.formatDate(m.tanggal_target)}</span>` : ''}
                                </div>
                                ${m.nomor_invoice ? `
                                    <div class="mt-1 pl-7 text-[11px] text-emerald-600 font-mono">
                                        <i class="ri-file-check-line"></i> Faktur: <b>${m.nomor_invoice}</b> (${m.invoice_status})
                                    </div>
                                ` : ''}
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap pl-7 sm:pl-0">
                                <button type="button" onclick="window.openProjectKanban(${id}, ${m.id})" class="whitespace-nowrap px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1 transition" title="Papan Tugas Termin Ini">
                                    <i class="ri-kanban-view text-primary-500"></i><span>Tugas</span>
                                </button>
                                <button type="button" onclick="window.openBastEditor(${id}, null, ${m.id}, '${App.escapeHtml(m.nama_milestone)}')" class="whitespace-nowrap px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold inline-flex items-center gap-1 transition" title="Terbitkan BAST untuk Termin Ini">
                                    <i class="ri-file-shield-2-line text-indigo-500"></i><span>BAST</span>
                                </button>
                                ${!m.invoice_id ? `
                                    <button type="button" onclick="window.createMilestoneInvoice(${id}, ${m.id}, '${App.escapeHtml(m.nama_milestone)}')" class="whitespace-nowrap px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition">
                                        <i class="ri-file-add-line"></i><span>Terbitkan Faktur</span>
                                    </button>
                                    <button type="button" onclick='window.openMilestoneForm(${id}, ${JSON.stringify({ id: m.id, nama_milestone: m.nama_milestone, persentase: m.persentase, nominal: m.nominal, tanggal_target: m.tanggal_target || '' }).replace(/'/g, "&#39;")}, ${Number(p.nilai_project || 0)})' class="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition" title="Edit Termin" aria-label="Edit Termin">
                                        <i class="ri-edit-line text-sm"></i>
                                    </button>
                                    <button type="button" onclick="window.deleteMilestone(${id}, ${m.id}, '${App.escapeHtml(m.nama_milestone)}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl transition" title="Hapus Termin" aria-label="Hapus Termin">
                                        <i class="ri-delete-bin-line text-sm"></i>
                                    </button>
                                ` : `
                                    <a href="#/invoices" onclick="document.getElementById('project-milestone-modal').classList.add('hidden')" class="whitespace-nowrap px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1">
                                        <i class="ri-external-link-line"></i><span>Buka Faktur</span>
                                    </a>
                                `}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="flex justify-end pt-2">
                <button type="button" onclick="document.getElementById('project-milestone-modal').classList.add('hidden')" class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition">
                    Tutup
                </button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
}

export async function applyMilestonePattern(projectId, pattern) {
    const res = await App.api(`projects/${projectId}/milestones`, {
        method: 'POST',
        body: { pattern }
    });
    if (res && res.success) {
        App.toast(res.message, 'success');
        manageProjectMilestones(projectId);
        window._reloadProjectsList?.();
    }
}

export function openMilestoneForm(projectId, milestone = null, projectValue = 0) {
    let modal = document.getElementById('project-milestone-form-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'project-milestone-form-modal';
        modal.className = 'fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4';
        document.body.appendChild(modal);
    }

    const isEdit = Boolean(milestone && milestone.id);
    modal.innerHTML = `
        <form id="milestone-edit-form" class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-fadeIn">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 class="text-base font-black text-slate-900 dark:text-white">${isEdit ? 'Edit Termin Proyek' : 'Tambah Termin Proyek'}</h3>
                <button type="button" onclick="document.getElementById('project-milestone-form-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1" aria-label="Tutup">
                    <i class="ri-close-line text-xl"></i>
                </button>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Nama Termin / Milestone *</label>
                <input type="text" id="ms-nama" required value="${App.escapeHtml(milestone?.nama_milestone || '')}" placeholder="Contoh: Termin 1 (DP 30%)" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm">
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Persentase (%)</label>
                    <input type="number" id="ms-persentase" step="0.01" min="0" max="100" value="${milestone?.persentase ?? ''}" placeholder="0" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Nominal (IDR) *</label>
                    <input type="number" id="ms-nominal" step="0.01" min="0" required value="${milestone?.nominal ?? ''}" placeholder="0" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono">
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">Tanggal Target (Opsional)</label>
                <input type="date" id="ms-target" value="${milestone?.tanggal_target || ''}" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm">
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button type="button" onclick="document.getElementById('project-milestone-form-modal').classList.add('hidden')" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold">Batal</button>
                <button type="submit" id="btn-save-ms" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold">${isEdit ? 'Simpan Perubahan' : 'Tambah Termin'}</button>
            </div>
        </form>
    `;

    const pctEl = modal.querySelector('#ms-persentase');
    const nomEl = modal.querySelector('#ms-nominal');
    if (projectValue > 0) {
        pctEl.addEventListener('input', () => {
            const pVal = parseFloat(pctEl.value);
            if (!Number.isNaN(pVal) && pVal >= 0) {
                nomEl.value = Math.round((pVal / 100) * projectValue);
            }
        });
        nomEl.addEventListener('input', () => {
            const nVal = parseFloat(nomEl.value);
            if (!Number.isNaN(nVal) && nVal >= 0) {
                pctEl.value = ((nVal / projectValue) * 100).toFixed(2);
            }
        });
    }

    modal.querySelector('#milestone-edit-form').addEventListener('submit', (e) => {
        saveMilestone(e, projectId, isEdit ? milestone.id : null);
    });
    modal.classList.remove('hidden');
}

export async function saveMilestone(e, projectId, milestoneId = null) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-ms');
    const payload = {
        milestone_id: milestoneId,
        nama_milestone: document.getElementById('ms-nama').value.trim(),
        persentase: parseFloat(document.getElementById('ms-persentase').value || '0'),
        nominal: parseFloat(document.getElementById('ms-nominal').value || '0'),
        tanggal_target: document.getElementById('ms-target').value || null
    };

    const done = App.btnLoading(btn, true, 'Menyimpan...');
    try {
        const res = await App.api(`projects/${projectId}/milestones`, {
            method: milestoneId ? 'PUT' : 'POST',
            body: payload
        });
        if (res && res.success) {
            App.toast(res.message, 'success');
            document.getElementById('project-milestone-form-modal')?.classList.add('hidden');
            manageProjectMilestones(projectId);
            window._reloadProjectsList?.();
        }
    } finally {
        done();
    }
}

export async function deleteMilestone(projectId, milestoneId, namaMilestone) {
    const conf = await App.confirm('Hapus Termin Proyek', `Yakin ingin menghapus termin "${namaMilestone}"?`);
    if (!conf) return;

    const res = await App.api(`projects/${projectId}/milestones?milestone_id=${milestoneId}`, {
        method: 'DELETE'
    });
    if (res && res.success) {
        App.toast(res.message, 'success');
        manageProjectMilestones(projectId);
        window._reloadProjectsList?.();
    }
}

export async function createMilestoneInvoice(projectId, milestoneId, namaMilestone) {
    const conf = await App.confirm('Terbitkan Faktur Termin', `Terbitkan faktur tagihan resmi untuk "${namaMilestone}"?`);
    if (!conf) return;

    const res = await App.api(`projects/${projectId}/create-milestone-invoice`, {
        method: 'POST',
        body: { milestone_id: milestoneId }
    });
    if (res && res.success) {
        App.toast(res.message, 'success');
        manageProjectMilestones(projectId);
        window._reloadProjectsList?.();
    }
}
