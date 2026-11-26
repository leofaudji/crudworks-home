// ============================================
// PROJECTS SUB-MODULE: Kanban Board & Tasks (Lazy-loaded)
// ============================================

export async function openProjectKanban(projectId, milestoneFilter = '') {
    const [projRes, tasksRes] = await Promise.all([
        App.api(`projects/${projectId}/profitability`),
        App.api(`project-tasks?project_id=${projectId}${milestoneFilter ? `&milestone_id=${milestoneFilter}` : ''}`)
    ]);

    if (!projRes || !projRes.success) {
        App.toast('Gagal memuat rincian proyek', 'error');
        return;
    }

    const { project: p, milestones: ms } = projRes.data;
    const tasks = tasksRes?.data?.tasks || [];
    const stats = tasksRes?.data?.stats || { total: 0, todo: 0, in_progress: 0, review: 0, done: 0, total_hours: 0 };

    let modal = document.getElementById('project-kanban-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'project-kanban-modal';
        modal.className = 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4';
        document.body.appendChild(modal);
    }

    const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

    const kanbanCols = [
        { key: 'todo', label: 'Antrean (To-Do)', icon: 'ri-inbox-line', theme: 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40', badge: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
        { key: 'in_progress', label: 'Dikerjakan', icon: 'ri-loader-4-line', theme: 'border-indigo-100 dark:border-indigo-950/50 bg-indigo-50/30 dark:bg-indigo-950/20', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
        { key: 'review', label: 'UAT & Review', icon: 'ri-eye-line', theme: 'border-amber-100 dark:border-amber-950/50 bg-amber-50/30 dark:bg-amber-950/20', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
        { key: 'done', label: 'Selesai & Sah', icon: 'ri-checkbox-circle-line', theme: 'border-emerald-100 dark:border-emerald-950/50 bg-emerald-50/30 dark:bg-emerald-950/20', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' }
    ];

    modal.innerHTML = `
        <div class="w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 animate-fadeIn max-h-[94vh] flex flex-col space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div class="space-y-0.5">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                            Papan Tugas Proyek Ringan
                        </span>
                        <span class="text-xs font-mono font-bold text-slate-500">${p.kode_project}</span>
                    </div>
                    <h2 class="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <i class="ri-kanban-view text-primary-600"></i>
                        <span>${p.nama_project}</span>
                    </h2>
                    <p class="text-xs text-slate-500">Pelanggan: <b class="text-slate-700 dark:text-slate-300">${p.nama_perusahaan}</b> · Kontrak: <span class="font-mono font-semibold">${App.formatIDR(p.nilai_project)}</span></p>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="window.openTaskModal(${projectId}, null, '${milestoneFilter || ''}')" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition">
                        <i class="ri-add-line text-sm"></i> Tambah Tugas
                    </button>
                    <button type="button" onclick="document.getElementById('project-kanban-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>
            </div>

            <div class="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div class="flex items-center gap-4 text-xs">
                    <div class="flex items-center gap-2">
                        <div class="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div class="h-full bg-emerald-500 transition-all duration-500" style="width: ${completionRate}%"></div>
                        </div>
                        <span class="font-mono font-bold text-slate-700 dark:text-slate-300">${completionRate}% Selesai</span>
                    </div>
                    <div class="hidden sm:flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                        <span>Total: <b>${stats.total}</b></span>
                        <span>·</span>
                        <span>Estimasi: <b>${stats.total_hours} Jam</b></span>
                    </div>
                </div>

                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <label class="text-[11px] font-bold uppercase text-slate-500 shrink-0">Filter Termin:</label>
                    <select onchange="window.openProjectKanban(${projectId}, this.value)" class="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="">Semua Milestone Termin (${ms.length})</option>
                        ${ms.map(m => `
                            <option value="${m.id}" ${String(milestoneFilter) === String(m.id) ? 'selected' : ''}>
                                ${m.nama_milestone} (${m.persentase}%)
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 overflow-y-auto flex-1 min-h-[420px] pb-2">
                ${kanbanCols.map(col => {
                    const colTasks = tasks.filter(t => t.status === col.key);
                    return `
                        <div class="flex flex-col rounded-2xl border ${col.theme} p-3 min-h-[380px]">
                            <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/60 dark:border-slate-700/60">
                                <div class="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                                    <i class="${col.icon} text-slate-500"></i>
                                    <span>${col.label}</span>
                                </div>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${col.badge}">
                                    ${colTasks.length}
                                </span>
                            </div>

                            <div class="space-y-2.5 overflow-y-auto flex-1 pr-0.5">
                                ${colTasks.length === 0 ? `
                                    <div class="h-32 flex flex-col items-center justify-center text-slate-400 text-center p-3">
                                        <i class="ri-drag-drop-line text-2xl mb-1 opacity-40"></i>
                                        <span class="text-[11px]">Kosong</span>
                                    </div>
                                ` : colTasks.map(t => {
                                    let prioClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                                    let prioLabel = 'Sedang';
                                    if (t.prioritas === 'mendesak') {
                                        prioClass = 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
                                        prioLabel = 'Mendesak';
                                    } else if (t.prioritas === 'tinggi') {
                                        prioClass = 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
                                        prioLabel = 'Tinggi';
                                    } else if (t.prioritas === 'rendah') {
                                        prioClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
                                        prioLabel = 'Rendah';
                                    }

                                    return `
                                        <div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition space-y-2 group">
                                            <div class="flex items-center justify-between gap-1.5">
                                                <span class="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${prioClass}">
                                                    ${prioLabel}
                                                </span>
                                                ${t.nama_milestone ? `
                                                    <span class="text-[9px] font-semibold text-slate-500 truncate max-w-[120px]" title="${App.escapeHtml(t.nama_milestone)}">
                                                        <i class="ri-flag-line text-[8px] text-amber-500"></i> ${App.escapeHtml(t.nama_milestone)}
                                                    </span>
                                                ` : ''}
                                            </div>

                                            <div class="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                                                ${App.escapeHtml(t.judul_tugas)}
                                            </div>

                                            ${t.deskripsi ? `
                                                <p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                                    ${App.escapeHtml(t.deskripsi)}
                                                </p>
                                            ` : ''}

                                            <div class="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                                                <div class="flex items-center gap-1.5 text-slate-500">
                                                    ${t.assigned_nama ? `
                                                        <span class="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 dark:text-slate-300" title="Ditugaskan kepada ${App.escapeHtml(t.assigned_nama)}">
                                                            <i class="ri-user-smile-line text-primary-500"></i> ${App.escapeHtml(t.assigned_nama.split(' ')[0])}
                                                        </span>
                                                    ` : ''}
                                                    ${t.estimasi_jam > 0 ? `
                                                        <span class="font-mono text-[10px]" title="Estimasi pengerjaan">
                                                            <i class="ri-time-line text-slate-400"></i> ${t.estimasi_jam}j
                                                        </span>
                                                    ` : ''}
                                                </div>

                                                <div class="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                                                    ${col.key !== 'todo' ? `
                                                        <button type="button" onclick="window.moveTaskStatus(${projectId}, ${t.id}, '${col.key === 'done' ? 'review' : col.key === 'review' ? 'in_progress' : 'todo'}', '${milestoneFilter || ''}')"
                                                                class="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" title="Kembalikan status">
                                                            <i class="ri-arrow-left-s-line text-xs"></i>
                                                        </button>
                                                    ` : ''}

                                                    <button type="button" onclick="window.logTaskTimesheet(${projectId}, ${t.id}, '${App.escapeHtml(t.judul_tugas)}', ${t.estimasi_jam})"
                                                            class="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded transition" title="Catat Waktu ke Timesheet">
                                                        <i class="ri-timer-line text-xs"></i>
                                                    </button>

                                                    <button type="button" onclick="window.openTaskModal(${projectId}, ${t.id}, '${milestoneFilter || ''}')"
                                                            class="p-1 text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" title="Edit Rincian Tugas">
                                                        <i class="ri-edit-line text-xs"></i>
                                                    </button>

                                                    ${col.key !== 'done' ? `
                                                        <button type="button" onclick="window.moveTaskStatus(${projectId}, ${t.id}, '${col.key === 'todo' ? 'in_progress' : col.key === 'in_progress' ? 'review' : 'done'}', '${milestoneFilter || ''}')"
                                                                class="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" title="Majukan status">
                                                            <i class="ri-arrow-right-s-line text-xs"></i>
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

export async function openTaskModal(projectId, taskId = null, defaultMilestoneId = '') {
    const [projRes, usersRes] = await Promise.all([
        App.api(`projects/${projectId}/profitability`),
        App.api('users?all=1')
    ]);

    const milestones = projRes?.data?.milestones || [];
    const users = usersRes?.data || [];

    let task = null;
    if (taskId) {
        const taskRes = await App.api(`project-tasks/${taskId}`);
        if (taskRes && taskRes.success) {
            task = taskRes.data;
        }
    }

    let modal = document.getElementById('project-task-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'project-task-modal';
        modal.className = 'fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 animate-fadeIn space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <i class="ri-checkbox-circle-line text-primary-600"></i>
                    <span>${task ? 'Edit Tugas Proyek' : 'Tambah Tugas Baru'}</span>
                </h3>
                <button type="button" onclick="document.getElementById('project-task-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                    <i class="ri-close-line text-xl"></i>
                </button>
            </div>

            <form id="project-task-form" onsubmit="window.saveProjectTask(event, ${projectId}, ${task ? task.id : 'null'}, '${defaultMilestoneId || ''}')" class="space-y-3.5 text-xs">
                <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Judul Tugas *</label>
                    <input type="text" id="task-form-judul" required value="${task ? App.escapeHtml(task.judul_tugas) : ''}" placeholder="Contoh: Desain Schema Database & Migrasi"
                           class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Terkait Milestone Termin</label>
                        <select id="task-form-milestone" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="">-- Umum / Tanpa Termin --</option>
                            ${milestones.map(m => `
                                <option value="${m.id}" ${(task && task.milestone_id == m.id) || (!task && defaultMilestoneId == m.id) ? 'selected' : ''}>
                                    ${m.nama_milestone} (${m.persentase}%)
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div>
                        <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Ditugaskan Kepada</label>
                        <select id="task-form-assignee" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="">-- Belum Ditugaskan --</option>
                            ${users.map(u => `
                                <option value="${u.id}" ${task && task.assigned_to == u.id ? 'selected' : ''}>
                                    ${u.nama_lengkap} (${u.role || 'Staff'})
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div>
                        <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Tingkat Prioritas</label>
                        <select id="task-form-prioritas" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="sedang" ${task && task.prioritas === 'sedang' ? 'selected' : ''}>Sedang (Normal)</option>
                            <option value="tinggi" ${task && task.prioritas === 'tinggi' ? 'selected' : ''}>Tinggi (High)</option>
                            <option value="mendesak" ${task && task.prioritas === 'mendesak' ? 'selected' : ''}>Mendesak (Urgent)</option>
                            <option value="rendah" ${task && task.prioritas === 'rendah' ? 'selected' : ''}>Rendah (Low)</option>
                        </select>
                    </div>

                    <div>
                        <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Status Pengerjaan</label>
                        <select id="task-form-status" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="todo" ${task && task.status === 'todo' ? 'selected' : ''}>Antrean (To-Do)</option>
                            <option value="in_progress" ${task && task.status === 'in_progress' ? 'selected' : ''}>Sedang Dikerjakan</option>
                            <option value="review" ${task && task.status === 'review' ? 'selected' : ''}>UAT & Review</option>
                            <option value="done" ${task && task.status === 'done' ? 'selected' : ''}>Selesai & Sah</option>
                        </select>
                    </div>

                    <div>
                        <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Estimasi Jam (Hours)</label>
                        <input type="number" id="task-form-jam" min="0" step="0.5" value="${task ? (task.estimasi_jam || 0) : 2}"
                               class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                    </div>

                    <div>
                        <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Target Tenggat (Deadline)</label>
                        <input type="date" id="task-form-deadline" value="${task && task.deadline ? task.deadline.slice(0, 10) : ''}"
                               class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    </div>
                </div>

                <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Deskripsi & Catatan Teknis</label>
                    <textarea id="task-form-deskripsi" rows="2.5" placeholder="Rincian implementasi tugas atau kriteria penerimaan..."
                              class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">${task ? App.escapeHtml(task.deskripsi || '') : ''}</textarea>
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div>
                        ${task ? `
                            <button type="button" onclick="window.deleteProjectTask(${projectId}, ${task.id}, '${defaultMilestoneId || ''}')" class="text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center gap-1">
                                <i class="ri-delete-bin-line"></i> Hapus Tugas
                            </button>
                        ` : ''}
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button" onclick="document.getElementById('project-task-modal').classList.add('hidden')" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold">
                            Batal
                        </button>
                        <button type="submit" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition">
                            Simpan Tugas
                        </button>
                    </div>
                </div>
            </form>
        </div>
    `;

    modal.classList.remove('hidden');
}

export async function saveProjectTask(e, projectId, taskId = null, milestoneFilter = '') {
    e.preventDefault();
    const body = {
        project_id: projectId,
        judul_tugas: document.getElementById('task-form-judul').value.trim(),
        milestone_id: document.getElementById('task-form-milestone').value || null,
        assigned_to: document.getElementById('task-form-assignee').value || null,
        prioritas: document.getElementById('task-form-prioritas').value,
        status: document.getElementById('task-form-status').value,
        estimasi_jam: document.getElementById('task-form-jam').value || 0,
        deadline: document.getElementById('task-form-deadline').value || null,
        deskripsi: document.getElementById('task-form-deskripsi').value.trim()
    };

    const method = taskId ? 'PUT' : 'POST';
    const ep = taskId ? `project-tasks/${taskId}` : 'project-tasks';

    const res = await App.api(ep, { method, body });
    if (res && res.success) {
        App.toast(res.message, 'success');
        document.getElementById('project-task-modal')?.classList.add('hidden');
        openProjectKanban(projectId, milestoneFilter);
    }
}

export async function moveTaskStatus(projectId, taskId, newStatus, milestoneFilter = '') {
    const res = await App.api(`project-tasks/${taskId}/status`, {
        method: 'POST',
        body: { status: newStatus }
    });
    if (res && res.success) {
        App.toast(res.message, 'success');
        openProjectKanban(projectId, milestoneFilter);
    }
}

export async function deleteProjectTask(projectId, taskId, milestoneFilter = '') {
    const conf = await App.confirm('Hapus Tugas Proyek', 'Yakin ingin menghapus tugas ini dari papan proyek?');
    if (!conf) return;

    const res = await App.api(`project-tasks/${taskId}`, { method: 'DELETE' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        document.getElementById('project-task-modal')?.classList.add('hidden');
        openProjectKanban(projectId, milestoneFilter);
    }
}

export async function logTaskTimesheet(projectId, taskId, taskTitle, defaultHours = 1) {
    const defaultMins = Math.max(15, Math.round((defaultHours || 1) * 60));
    const today = new Date().toISOString().slice(0, 10);

    const { value: formValues } = await Swal.fire({
        title: 'Catat ke Timesheet',
        html: `
            <div class="text-left space-y-3 text-xs">
                <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Tugas Terkait</label>
                    <input type="text" value="${App.escapeHtml(taskTitle)}" disabled class="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Durasi Kerja (Menit) *</label>
                        <input id="swal-ts-durasi" type="number" min="15" step="15" value="${defaultMins}" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl font-mono">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Tanggal Pengerjaan *</label>
                        <input id="swal-ts-tanggal" type="date" value="${today}" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    </div>
                </div>
                <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Aktivitas / Catatan Hasil</label>
                    <textarea id="swal-ts-desc" rows="2" class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl" placeholder="Keterangan pengerjaan...">${App.escapeHtml(taskTitle)}</textarea>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan ke Timesheet',
        cancelButtonText: 'Batal',
        preConfirm: () => {
            const durasi = parseInt(document.getElementById('swal-ts-durasi').value);
            const tanggal = document.getElementById('swal-ts-tanggal').value;
            const desc = document.getElementById('swal-ts-desc').value.trim();
            if (!durasi || durasi <= 0) {
                Swal.showValidationMessage('Durasi kerja wajib diisi angka positif (menit)');
                return false;
            }
            return { durasi, tanggal, desc };
        }
    });

    if (formValues) {
        const res = await App.api('timesheets', {
            method: 'POST',
            body: {
                project_id: projectId,
                tanggal: formValues.tanggal,
                durasi_menit: formValues.durasi,
                deskripsi_tugas: formValues.desc,
                is_billable: 1,
                status: 'disetujui'
            }
        });
        if (res && res.success) {
            App.toast('Jam kerja berhasil dicatat ke sistem Timesheet & Profitabilitas', 'success');
        }
    }
}
