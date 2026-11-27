// ============================================
// PROJECTS SUB-MODULE: BAST Digital (Lazy-loaded)
// ============================================

export async function openProjectBasts(projectId) {
    const [projRes, bastsRes] = await Promise.all([
        App.api(`projects/${projectId}/profitability`),
        App.api(`basts?project_id=${projectId}`)
    ]);

    if (!projRes || !projRes.success) {
        App.toast('Gagal memuat rincian proyek', 'error');
        return;
    }

    const { project: p } = projRes.data;
    const basts = bastsRes?.data || [];

    let modal = document.getElementById('project-bast-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'project-bast-modal';
        modal.className = 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] animate-fadeIn overflow-hidden">
            <div class="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4 shrink-0">
                <div class="space-y-1 min-w-0 flex-1">
                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Dokumen Hukum &amp; Legalitas Serah Terima</span>
                    <h2 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-file-shield-2-line text-emerald-600 shrink-0"></i>
                        <span>Berita Acara Serah Terima (BAST)</span>
                    </h2>
                    <p class="text-xs text-slate-500 leading-relaxed">Proyek: <b class="text-slate-800 dark:text-slate-200">${App.escapeHtml(p.nama_project)}</b> (${App.escapeHtml(p.kode_project)}) · Klien: <b class="text-slate-700 dark:text-slate-300">${App.escapeHtml(p.nama_perusahaan)}</b></p>
                </div>
                <div class="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    <button type="button" onclick="window.openBastEditor(${projectId})" class="whitespace-nowrap px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition">
                        <i class="ri-add-line text-sm"></i><span>Terbitkan BAST Baru</span>
                    </button>
                    <button type="button" onclick="document.getElementById('project-bast-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition" aria-label="Tutup">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>
            </div>

            <div class="p-6 sm:px-8 overflow-y-auto flex-1 space-y-3">
                <div class="flex items-center justify-between text-xs text-slate-500">
                    <span class="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Daftar Dokumen BAST Diterbitkan</span>
                    <span>Total Dokumen: <b class="text-slate-900 dark:text-white">${basts.length}</b></span>
                </div>

                <div class="space-y-3 text-xs">
                    ${basts.length === 0 ? `
                        <div class="p-8 text-center text-slate-400 space-y-2 border border-slate-200 dark:border-slate-800 rounded-2xl">
                            <i class="ri-file-shield-2-line text-3xl opacity-30"></i>
                            <div>Belum ada dokumen BAST diterbitkan untuk proyek ini.</div>
                            <div class="text-[11px] text-slate-500">Klik "Terbitkan BAST Baru" di atas atau melalui menu Termin &amp; Milestone.</div>
                        </div>
                    ` : basts.map(b => {
                        const isSigned = b.status === 'ditandatangani';
                        return `
                            <div class="p-4 sm:p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-800/20 hover:border-slate-300 dark:hover:border-slate-700 transition space-y-3.5">
                                <div class="flex items-start justify-between gap-3">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="font-mono font-bold text-sm text-slate-900 dark:text-white">${App.escapeHtml(b.nomor_bast)}</span>
                                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isSigned ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}">
                                            <i class="${isSigned ? 'ri-shield-check-line' : 'ri-edit-line'}"></i> ${isSigned ? 'Sah & Ditandatangani' : 'Draft BAST'}
                                        </span>
                                        ${b.nama_milestone ? `
                                            <span class="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                ${App.escapeHtml(b.nama_milestone)}
                                            </span>
                                        ` : ''}
                                    </div>
                                    <div class="flex items-center gap-1 shrink-0">
                                        <button type="button" onclick="window.openBastEditor(${projectId}, ${b.id})" class="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition" title="Edit Rincian BAST" aria-label="Edit Rincian BAST">
                                            <i class="ri-edit-line text-base"></i>
                                        </button>
                                        <button type="button" onclick="window.deleteBast(${projectId}, ${b.id})" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition" title="Hapus Dokumen BAST" aria-label="Hapus Dokumen BAST">
                                            <i class="ri-delete-bin-line text-base"></i>
                                        </button>
                                    </div>
                                </div>

                                <div class="font-bold text-slate-900 dark:text-white text-sm leading-snug">
                                    ${App.escapeHtml(b.judul_pekerjaan)}
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-slate-500 bg-white dark:bg-slate-900/70 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div class="min-w-0">
                                        <span class="text-[10px] uppercase tracking-wider text-slate-400 block">Tanggal BAST</span>
                                        <b class="text-slate-800 dark:text-slate-200 font-mono">${App.formatDate(b.tanggal_bast)}</b>
                                    </div>
                                    <div class="min-w-0">
                                        <span class="text-[10px] uppercase tracking-wider text-slate-400 block">Pihak Pertama</span>
                                        <b class="text-slate-800 dark:text-slate-200 truncate block">${App.escapeHtml(b.pihak_pertama_nama)}</b>
                                        <span class="text-[10px] text-slate-400 truncate block">${App.escapeHtml(b.pihak_pertama_jabatan)}</span>
                                    </div>
                                    <div class="min-w-0">
                                        <span class="text-[10px] uppercase tracking-wider text-slate-400 block">Pihak Kedua (Klien)</span>
                                        <b class="text-slate-800 dark:text-slate-200 truncate block">${App.escapeHtml(b.pihak_kedua_nama)}</b>
                                        <span class="text-[10px] text-slate-400 truncate block">${App.escapeHtml(b.pihak_kedua_jabatan)}</span>
                                    </div>
                                </div>

                                <div class="pt-2.5 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <button type="button" onclick="window.downloadBastPdf(${b.id})" class="whitespace-nowrap px-3.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition" title="Cetak atau Pratinjau Dokumen PDF">
                                            <i class="ri-file-pdf-2-line text-rose-600"></i><span>Cetak PDF</span>
                                        </button>
                                        <button type="button" onclick="window.sendBastEmail(${b.id})" class="whitespace-nowrap px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition" title="Kirim BAST + PDF via Email">
                                            <i class="ri-mail-send-line"></i><span>Kirim Email</span>
                                        </button>
                                    </div>
                                    ${!isSigned ? `
                                        <button type="button" onclick="window.signBast(${projectId}, ${b.id})" class="whitespace-nowrap px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition" title="Sahkan & Tandatangani">
                                            <i class="ri-quill-pen-line"></i><span>Sahkan BAST</span>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="px-6 sm:px-8 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0 bg-slate-50/50 dark:bg-slate-900">
                <button type="button" onclick="document.getElementById('project-bast-modal').classList.add('hidden')" class="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition">
                    Tutup
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

export async function openBastEditor(projectId, bastId = null, defaultMilestoneId = null, milestoneName = null) {
    const res = await App.api(`projects/${projectId}/profitability`);
    if (!res || !res.success) {
        App.toast('Gagal memuat data proyek', 'error');
        return;
    }

    const { project: p, milestones: ms } = res.data;

    let bast = null;
    if (bastId) {
        const bastRes = await App.api(`basts/${bastId}`);
        if (bastRes && bastRes.success) {
            bast = bastRes.data;
        }
    }

    let modal = document.getElementById('bast-editor-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'bast-editor-modal';
        modal.className = 'fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4';
        document.body.appendChild(modal);
    }

    const defaultTitle = milestoneName ? `Serah Terima Hasil Pekerjaan - ${milestoneName}` : (bast ? bast.judul_pekerjaan : `Serah Terima Hasil Pekerjaan Sistem ${p.nama_project}`);
    const defaultDeliverables = bast ? bast.deskripsi_hasil : [
        '- Deployment aplikasi di server produksi serta penyerahan akses pengguna akhir (End-User Access) & panduan operasional',
        '- Pengujian fungsionalitas fitur (User Acceptance Testing / UAT) bersama klien',
        '- Penyerahan kredensial administratif sistem dan dokumentasi operasional'
    ].join('\n');
    const defaultNotes = bast ? (bast.catatan_revisi || '') : 'Masa garansi pemeliharaan sistem (bug fixing) berlaku aktif selama 30 hari kalender terhitung sejak penandatanganan dokumen Berita Acara ini.';

    modal.innerHTML = `
        <div class="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-fadeIn max-h-[92vh] overflow-y-auto space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-file-shield-2-line text-emerald-600"></i>
                        <span>${bast ? `Edit BAST (${bast.nomor_bast})` : 'Penerbitan Dokumen BAST Baru'}</span>
                    </h3>
                    <p class="text-xs text-slate-500">Proyek: <b>${p.nama_project}</b> · Pelanggan: <b>${p.nama_perusahaan}</b></p>
                </div>
                <button type="button" onclick="document.getElementById('bast-editor-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                    <i class="ri-close-line text-2xl"></i>
                </button>
            </div>

            <form id="bast-form" onsubmit="window.saveBast(event, ${projectId}, ${bast ? bast.id : 'null'})" class="space-y-4 text-xs">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                        <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Tanggal Dokumen BAST *</label>
                        <input type="date" id="bast-form-tanggal" required value="${bast && bast.tanggal_bast ? bast.tanggal_bast.slice(0, 10) : new Date().toISOString().slice(0, 10)}"
                               class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    </div>

                    <div>
                        <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Terkait Termin / Milestone</label>
                        <select id="bast-form-milestone" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                            <option value="">-- Serah Terima Keseluruhan Proyek --</option>
                            ${ms.map(m => `
                                <option value="${m.id}" ${(bast && bast.milestone_id == m.id) || (!bast && defaultMilestoneId == m.id) ? 'selected' : ''}>
                                    ${m.nama_milestone} (${m.persentase}%)
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Judul Pekerjaan Serah Terima *</label>
                    <input type="text" id="bast-form-judul" required value="${App.escapeHtml(defaultTitle)}" placeholder="Contoh: Serah Terima Modul Utama & UAT Tahap 1"
                           class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                </div>

                <div class="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pihak Penandatangan Berita Acara</div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div class="space-y-2">
                            <span class="font-bold text-slate-700 dark:text-slate-300">Pihak Pertama (Penyedia Jasa)</span>
                            <input type="text" id="bast-form-p1-nama" required value="${bast ? App.escapeHtml(bast.pihak_pertama_nama) : (App.user?.nama_lengkap || 'Project Manager')}" placeholder="Nama Penanggung Jawab"
                                   class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                            <input type="text" id="bast-form-p1-jabatan" required value="${bast ? App.escapeHtml(bast.pihak_pertama_jabatan) : 'Lead Project Manager'}" placeholder="Jabatan"
                                   class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        </div>

                        <div class="space-y-2">
                            <span class="font-bold text-slate-700 dark:text-slate-300">Pihak Kedua (Klien / Pembeli)</span>
                            <input type="text" id="bast-form-p2-nama" required value="${bast ? App.escapeHtml(bast.pihak_kedua_nama) : (p.client_pic || p.nama_perusahaan)}" placeholder="Nama Perwakilan Klien"
                                   class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                            <input type="text" id="bast-form-p2-jabatan" required value="${bast ? App.escapeHtml(bast.pihak_kedua_jabatan) : 'Penanggung Jawab (PIC)'}" placeholder="Jabatan"
                                   class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Rincian Hasil Pekerjaan & Deliverable UAT (1 baris per item) *</label>
                    <textarea id="bast-form-hasil" rows="4" required class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs leading-relaxed font-mono" placeholder="Tuliskan daftar modul atau deliverable yang diserahkan...">${App.escapeHtml(defaultDeliverables)}</textarea>
                </div>

                <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Catatan Tambahan & Masa Garansi Pemeliharaan</label>
                    <textarea id="bast-form-catatan" rows="2" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs leading-relaxed" placeholder="Ketentuan garansi atau tindak lanjut...">${App.escapeHtml(defaultNotes)}</textarea>
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onclick="document.getElementById('bast-editor-modal').classList.add('hidden')" class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold">
                        Batal
                    </button>
                    <button type="submit" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5">
                        <i class="ri-check-line"></i> Simpan & Terbitkan BAST
                    </button>
                </div>
            </form>
        </div>
    `;

    modal.classList.remove('hidden');
}

export async function saveBast(e, projectId, bastId = null) {
    e.preventDefault();
    const body = {
        project_id: projectId,
        milestone_id: document.getElementById('bast-form-milestone').value || null,
        tanggal_bast: document.getElementById('bast-form-tanggal').value,
        judul_pekerjaan: document.getElementById('bast-form-judul').value.trim(),
        pihak_pertama_nama: document.getElementById('bast-form-p1-nama').value.trim(),
        pihak_pertama_jabatan: document.getElementById('bast-form-p1-jabatan').value.trim(),
        pihak_kedua_nama: document.getElementById('bast-form-p2-nama').value.trim(),
        pihak_kedua_jabatan: document.getElementById('bast-form-p2-jabatan').value.trim(),
        deskripsi_hasil: document.getElementById('bast-form-hasil').value.trim(),
        catatan_revisi: document.getElementById('bast-form-catatan').value.trim()
    };

    const method = bastId ? 'PUT' : 'POST';
    const ep = bastId ? `basts/${bastId}` : 'basts';

    const res = await App.api(ep, { method, body });
    if (res && res.success) {
        App.toast(res.message, 'success');
        document.getElementById('bast-editor-modal')?.classList.add('hidden');
        openProjectBasts(projectId);
    }
}

export async function signBast(projectId, bastId) {
    const conf = await App.confirm(
        'Pengesahan Dokumen BAST',
        'Tandatangani dokumen Berita Acara Serah Terima ini secara sah? Status akan berubah menjadi "ditandatangani".'
    );
    if (!conf) return;

    const res = await App.api(`basts/${bastId}/sign`, { method: 'POST' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        openProjectBasts(projectId);
    }
}

export async function deleteBast(projectId, bastId) {
    const conf = await App.confirm('Hapus Dokumen BAST', 'Yakin ingin menghapus dokumen Berita Acara ini?');
    if (!conf) return;

    const res = await App.api(`basts/${bastId}`, { method: 'DELETE' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        openProjectBasts(projectId);
    }
}

export async function sendBastEmail(bastId) {
    const res = await App.api(`basts/${bastId}`);
    if (!res || !res.success || !res.data) return;
    const { promptSendEmail } = await import('../../core/email-sender.js');
    const { generateBastPdf } = await import('../../core/pdf/bast.js');
    await promptSendEmail({
        title: `Kirim BAST ${res.data.nomor_bast || ''} via Email?`,
        text: 'Dokumen PDF Berita Acara Serah Terima beserta tautan Portal Klien akan dikirimkan via SMTP.',
        defaultCc: res.data.client_cc_email || '',
        endpoint: `basts/${bastId}/send-email`,
        buildPdf: () => generateBastPdf(res.data, 'bloburl')
    });
}

export async function downloadBastPdf(bastId, output = 'bloburl') {
    try {
        const res = await App.api(`basts/${bastId}`);
        if (!res || !res.success) {
            App.toast('Gagal memuat dokumen BAST', 'error');
            return;
        }
        const bast = res.data;
        const pdfRes = await App.generateBastPdf(bast, output);
        if (output === 'bloburl' && (pdfRes?.blobUrl || pdfRes?.url)) {
            App.openPdfModal({
                title: `Berita Acara Serah Terima (BAST) — ${bast.nomor_bast}`,
                filename: pdfRes.filename,
                blobUrl: pdfRes.blobUrl || pdfRes.url
            });
        } else {
            App.toast('Dokumen BAST berhasil diunduh', 'success');
        }
    } catch (err) {
        App.toast(err?.message || 'Gagal membuat dokumen PDF BAST', 'error');
    }
}
