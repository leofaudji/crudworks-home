// assets/js/pages/projects.js
import { App } from '../app.js';

let state = {
    page: 1,
    perPage: 10,
    search: '',
    status: '',
    fase: '',
    clientId: ''
};

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Proyek & Integrasi app-git</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Hubungkan proyek klien ke repositori Git dan sistem deployment server.</p>
                </div>
                <div class="flex items-center gap-2.5">
                    <a href="http://app-git.test" target="_blank" class="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm border border-slate-700 flex items-center gap-2 transition">
                        <i class="ri-external-link-line"></i>
                        <span>Buka app-git</span>
                    </a>
                    <button id="btn-add-project" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-primary-500/20 flex items-center gap-2 transition">
                        <i class="ri-add-line"></i>
                        <span>Tambah Proyek</span>
                    </button>
                </div>
            </div>

            <!-- Search & Filters -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                <div class="relative flex-1 w-full">
                    <input type="text" id="project-search" placeholder="Cari nama proyek, kode, klien, repo..."
                           class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <i class="ri-search-line absolute left-3.5 top-3 text-slate-400 text-sm"></i>
                </div>
                <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <select id="project-filter-fase" class="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="">Semua Fase Siklus</option>
                        <option value="penawaran">Fase Penawaran (SPH)</option>
                        <option value="spk">Menunggu SPK / TTD</option>
                        <option value="digarap">Sedang Digarap</option>
                        <option value="belum_bast">Belum Berita Acara (BAST)</option>
                        <option value="termin_bayar">Waktunya Termin Bayar</option>
                        <option value="belum_dibayar">Belum Dibayar</option>
                    </select>
                    <select id="project-filter-status" class="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="">Semua Status</option>
                        <option value="aktif">Aktif</option>
                        <option value="perencanaan">Perencanaan</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="selesai">Selesai</option>
                    </select>
                </div>
            </div>

            <!-- Table Card -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th class="py-3.5 px-4">Kode & Proyek</th>
                                <th class="py-3.5 px-4">Pelanggan</th>
                                <th class="py-3.5 px-4">Git Repository & Branch</th>
                                <th class="py-3.5 px-4">Status Deploy</th>
                                <th class="py-3.5 px-4">Kesehatan Uptime & SSL</th>
                                <th class="py-3.5 px-4">Fase Siklus & Status</th>
                                <th class="py-3.5 px-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="projects-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr>
                                <td colspan="7" class="py-12 text-center text-slate-400">
                                    <i class="ri-loader-4-line text-2xl animate-spin mb-2 inline-block"></i>
                                    <div>Memuat data proyek...</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div id="projects-pagination" class="px-7 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500"></div>
            </div>
        </div>

        <!-- Project Modal -->
        <div id="project-modal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-fadeIn max-h-[90vh] flex flex-col overflow-hidden">
                <div class="flex items-center justify-between px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <h3 id="project-modal-title" class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-git-branch-line text-primary-600"></i>
                        <span>Tambah Proyek Baru</span>
                    </h3>
                    <button type="button" id="btn-close-project-modal" class="text-slate-400 hover:text-slate-600 p-1" aria-label="Tutup">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <form id="project-form" class="flex flex-col flex-1 min-h-0">
                    <div class="p-6 sm:px-8 space-y-4 overflow-y-auto flex-1">
                    <input type="hidden" id="form-project-id" value="">

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Pelanggan Pemilik *</label>
                        <select id="form-project-client" required
                                class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="">Pilih Pelanggan...</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Nama Proyek *</label>
                        <input type="text" id="form-project-nama" required placeholder="Contoh: Portal Koperasi Anggota"
                               class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Git Repo URL</label>
                            <input type="text" id="form-project-git-repo" placeholder="https://github.com/..."
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Git Branch Target</label>
                            <input type="text" id="form-project-git-branch" placeholder="main" value="main"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Deploy Path (Server)</label>
                            <input type="text" id="form-project-deploy-path" placeholder="d:/laragon/www/nama-proyek"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Live App URL</label>
                            <input type="text" id="form-project-app-url" placeholder="http://klien.local"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Nilai Proyek (IDR)</label>
                            <input type="number" id="form-project-nilai" placeholder="0" min="0" step="any"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Status Proyek</label>
                            <select id="form-project-status" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="aktif">Aktif</option>
                                <option value="perencanaan">Perencanaan</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="selesai">Selesai</option>
                                <option value="dibatalkan">Dibatalkan</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Deskripsi Singkat</label>
                        <textarea id="form-project-deskripsi" rows="2" placeholder="Keterangan lingkup pengerjaan proyek"
                                  class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"></textarea>
                    </div>

                    </div>

                    <div class="px-6 sm:px-8 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3 shrink-0">
                        <button type="button" id="btn-cancel-project" class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold">Batal</button>
                        <button type="submit" id="btn-save-project" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/20">Simpan Proyek</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Bindings
    document.getElementById('btn-add-project').addEventListener('click', () => openProjectModal());
    document.getElementById('btn-close-project-modal').addEventListener('click', () => closeProjectModal());
    document.getElementById('btn-cancel-project').addEventListener('click', () => closeProjectModal());
    document.getElementById('project-form').addEventListener('submit', handleSaveProject);

    const searchInput = document.getElementById('project-search');
    let timer;
    searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            state.search = searchInput.value.trim();
            state.page = 1;
            loadProjects();
        }, 300);
    });

    // Deep-link filter from Dashboard (#/projects?fase=... or ?status=...)
    const hashQuery = (window.location.hash.split('?')[1] || '');
    const hashParams = new URLSearchParams(hashQuery);
    state.fase = hashParams.get('fase') || '';
    state.status = hashParams.get('status') || '';
    const statusSel = document.getElementById('project-filter-status');
    const faseSel = document.getElementById('project-filter-fase');
    if (statusSel) statusSel.value = state.status;
    if (faseSel) faseSel.value = state.fase;

    document.getElementById('project-filter-status').addEventListener('change', (e) => {
        state.status = e.target.value;
        state.page = 1;
        loadProjects();
    });

    document.getElementById('project-filter-fase')?.addEventListener('change', (e) => {
        state.fase = e.target.value;
        state.page = 1;
        loadProjects();
    });

    document.getElementById('projects-tbody')?.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-project-menu]');
        if (!trigger) return;
        const p = projectsById.get(Number(trigger.dataset.projectMenu));
        if (!p) return;
        App.toggleTableActionMenu(trigger, e, [
            { label: 'Papan Kanban Tugas', icon: 'ri-kanban-view', iconColor: 'text-primary-600', fn: () => window.openProjectKanban(p.id) },
            {
                label: 'Dokumen & Serah Terima',
                icon: 'ri-folder-check-line',
                iconColor: 'text-emerald-600',
                children: [
                    { label: 'Termin & Milestone', icon: 'ri-calendar-todo-line', iconColor: 'text-amber-500', fn: () => window.manageProjectMilestones(p.id) },
                    { label: 'Berita Acara (BAST)', icon: 'ri-file-shield-2-line', iconColor: 'text-emerald-600', fn: () => window.openProjectBasts(p.id) },
                    { label: 'Checklist Go-Live', icon: 'ri-rocket-2-line', iconColor: 'text-rose-500', fn: () => window.openProjectGoliveChecklist(p.id) },
                    { label: 'Garansi & Adendum', icon: 'ri-shield-star-line', iconColor: 'text-teal-600', fn: () => window.openProjectChangeRequests(p.id) }
                ]
            },
            {
                label: 'Teknis & Analisis',
                icon: 'ri-settings-4-line',
                iconColor: 'text-indigo-600',
                children: [
                    { label: 'Cek Uptime & SSL', icon: 'ri-pulse-line', iconColor: 'text-rose-500', fn: () => window.checkProjectHealth(p.id) },
                    { label: 'Analisis Profitabilitas (P&L)', icon: 'ri-pie-chart-2-line', iconColor: 'text-indigo-600', fn: () => window.viewProjectProfitability(p.id) },
                    { label: 'Panel GitOps & Deploy', icon: 'ri-terminal-box-line', iconColor: 'text-indigo-600', fn: () => window.openProjectGitOps(p.id) },
                    { label: 'Sinkronkan Status Git', icon: 'ri-refresh-line', iconColor: 'text-emerald-600', fn: () => window.syncGitProject(p.id) }
                ]
            },
            { label: 'Edit Rincian Proyek', icon: 'ri-edit-line', iconColor: 'text-primary-600', fn: () => window.editProject(p.id) },
            { divider: true },
            { label: 'Hapus Proyek', icon: 'ri-delete-bin-line', danger: true, fn: () => window.deleteProject(p.id, p.nama_project) }
        ]);
    });

    // Populate clients in modal select
    await Promise.all([populateClientOptions(), loadProjects()]);
}

async function populateClientOptions() {
    const sel = document.getElementById('form-project-client');
    const res = await App.api('clients?all=1');
    if (res && res.success && sel) {
        sel.innerHTML = '<option value="">Pilih Pelanggan...</option>' + res.data.map(c => `
            <option value="${c.id}">${c.nama_perusahaan} (${c.kode_klien})</option>
        `).join('');
    }
}

const projectsById = new Map();

async function loadProjects() {
    const tbody = document.getElementById('projects-tbody');
    const paginationEl = document.getElementById('projects-pagination');

    let ep = `projects?page=${state.page}&per_page=${state.perPage}`;
    if (state.search) ep += `&search=${encodeURIComponent(state.search)}`;
    if (state.status) ep += `&status=${encodeURIComponent(state.status)}`;
    if (state.fase) ep += `&fase=${encodeURIComponent(state.fase)}`;

    const res = await App.api(ep);
    if (!res || !res.success) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-rose-500">Gagal memuat daftar proyek</td></tr>`;
        return;
    }

    const { data: projects, pagination } = res;
    projectsById.clear();
    projects.forEach((p) => projectsById.set(Number(p.id), p));

    if (projects.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400">Tidak ada proyek yang terdaftar</td></tr>`;
        paginationEl.innerHTML = '';
        return;
    }

    tbody.innerHTML = projects.map(p => {
        const shortGit = p.git_repo_url ? String(p.git_repo_url).replace(/^https?:\/\/(github\.com|gitlab\.com|bitbucket\.org)\//i, '').replace(/\.git$/i, '') : '-';
        return `
            <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <td class="py-3.5 px-4">
                    <div class="font-bold text-slate-900 dark:text-white leading-snug">${p.nama_project}</div>
                    <div class="text-xs font-mono text-primary-600 dark:text-primary-400">${p.kode_project}</div>
                </td>
                <td class="py-3.5 px-4">
                    <div class="font-medium text-slate-800 dark:text-slate-200 leading-snug">${p.client_nama}</div>
                    ${p.app_url ? `<a href="${p.app_url}" target="_blank" class="text-xs text-primary-600 hover:underline inline-flex items-center gap-1 max-w-[190px]"><span class="truncate">${p.app_url}</span><i class="ri-external-link-line text-[10px] shrink-0"></i></a>` : ''}
                </td>
                <td class="py-3.5 px-4">
                    <div class="text-xs font-mono text-slate-600 dark:text-slate-300 truncate max-w-[155px]" title="${p.git_repo_url || '-'}">
                        ${App.escapeHtml(shortGit)}
                    </div>
                    <div class="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                        <i class="ri-git-branch-line"></i> ${p.git_branch || 'main'}
                    </div>
                </td>
                <td class="py-3.5 px-4 whitespace-nowrap">
                    ${App.renderStatusBadge(p.last_deploy_status, 'deploy')}
                </td>
                <td class="py-3.5 px-4 whitespace-nowrap">
                    ${p.last_health_status === 'online' ? `
                        <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Online ${p.last_latency_ms ? `(${p.last_latency_ms}ms)` : ''}</span>
                        </div>
                        ${p.last_ssl_days !== null ? `<div class="text-[10px] text-slate-400 mt-0.5 font-mono">SSL: ${p.last_ssl_days} hari</div>` : ''}
                    ` : p.last_health_status === 'degraded' ? `
                        <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold border border-amber-200">
                            <i class="ri-alert-line"></i> Peringatan
                        </div>
                    ` : p.last_health_status === 'offline' ? `
                        <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold border border-rose-200">
                            <i class="ri-close-circle-line"></i> Down
                        </div>
                    ` : `
                        <button type="button" onclick="window.checkProjectHealth(${p.id})" class="text-xs text-slate-400 hover:text-primary-600 flex items-center gap-1">
                            <i class="ri-pulse-line"></i> Cek Uptime
                        </button>
                    `}
                </td>
                <td class="py-3.5 px-4 whitespace-nowrap">
                    <div class="space-y-1.5">
                        ${renderProjectLifecycleBadge(p)}
                        <div class="flex items-center gap-1.5">
                            ${App.renderStatusBadge(p.status, 'project')}
                            ${renderProjectQuickAction(p)}
                        </div>
                    </div>
                </td>
                <td class="py-3.5 px-4 text-right whitespace-nowrap">
                    <button type="button" data-table-action-trigger data-project-menu="${p.id}" class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition" title="Menu Aksi">
                        <span>Aksi</span>
                        <i class="ri-more-2-fill text-slate-400"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    App.renderPagination(paginationEl, pagination, (p) => { state.page = p; loadProjects(); }, 'proyek');
}

function renderProjectLifecycleBadge(p) {
    const quoPending = Number(p.quo_pending || 0);
    const quoApproved = Number(p.quo_approved || 0);
    const spkPending = Number(p.spk_pending || 0);
    const spkSigned = Number(p.spk_signed || 0);
    const tasksTotal = Number(p.tasks_total || 0);
    const tasksDone = Number(p.tasks_done || 0);
    const bastDraft = Number(p.bast_draft || 0);
    const bastSigned = Number(p.bast_signed || 0);
    const msUnbilled = Number(p.ms_unbilled || 0);
    const invUnpaid = Number(p.inv_unpaid || 0);
    const invUnpaidAmt = Number(p.inv_unpaid_amount || 0);
    const totalInv = Number(p.total_invoices || 0);

    let label = 'Aktif';
    let detail = '';
    let cls = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

    if (invUnpaid > 0) {
        label = 'Belum Dibayar';
        detail = `${invUnpaid} faktur (${App.formatIDR(invUnpaidAmt)})`;
        cls = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900';
    } else if ((bastSigned > 0 || (tasksTotal > 0 && tasksDone === tasksTotal)) && msUnbilled > 0) {
        label = 'Waktunya Termin Bayar';
        detail = `${msUnbilled} termin siap ditagih`;
        cls = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900';
    } else if (bastDraft > 0 || (tasksTotal > 0 && tasksDone === tasksTotal && bastSigned === 0)) {
        label = 'Belum Berita Acara';
        detail = bastDraft > 0 ? `${bastDraft} BAST menunggu TTD` : 'Tugas 100%, buat BAST';
        cls = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900';
    } else if (tasksTotal > 0 && tasksDone < tasksTotal) {
        label = 'Sedang Digarap';
        detail = `${tasksDone}/${tasksTotal} tugas selesai`;
        cls = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900';
    } else if (spkPending > 0 || (quoApproved > 0 && spkSigned === 0 && tasksTotal === 0)) {
        label = 'Menunggu SPK / TTD';
        detail = spkPending > 0 ? 'SPK menunggu TTD klien' : 'SPH disetujui, buat SPK';
        cls = 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900';
    } else if (quoPending > 0 && tasksTotal === 0 && totalInv === 0) {
        label = 'Fase Penawaran';
        detail = `${quoPending} SPH aktif`;
        cls = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900';
    } else if (p.status === 'selesai' || (bastSigned > 0 && invUnpaid === 0 && totalInv > 0)) {
        label = 'Lunas & Selesai';
        detail = 'BAST sah & tagihan lunas';
        cls = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900';
    } else if (p.status === 'perencanaan') {
        label = 'Perencanaan';
        detail = 'Belum ada tugas / SPH';
    }

    let warrantyHtml = '';
    const wDays = Number(p.warranty_days || 0);
    if (wDays > 0 && p.warranty_start) {
        const startMs = new Date(p.warranty_start).getTime();
        if (!Number.isNaN(startMs)) {
            const endMs = startMs + wDays * 86400000;
            const left = Math.floor((endMs - Date.now()) / 86400000);
            warrantyHtml = left >= 0
                ? `<div class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Garansi aktif: ${left} hr lagi</div>`
                : `<div class="text-[10px] font-mono text-slate-400">Garansi berakhir</div>`;
        }
    }

    return `
        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${cls}">
            <span>${label}</span>
        </div>
        ${detail ? `<div class="text-[10px] text-slate-500 dark:text-slate-400 font-mono">${App.escapeHtml(detail)}</div>` : ''}
        ${warrantyHtml}
    `;
}

function renderProjectQuickAction(p) {
    const quoPending = Number(p.quo_pending || 0);
    const quoApproved = Number(p.quo_approved || 0);
    const spkPending = Number(p.spk_pending || 0);
    const spkSigned = Number(p.spk_signed || 0);
    const tasksTotal = Number(p.tasks_total || 0);
    const tasksDone = Number(p.tasks_done || 0);
    const bastDraft = Number(p.bast_draft || 0);
    const bastSigned = Number(p.bast_signed || 0);
    const msUnbilled = Number(p.ms_unbilled || 0);
    const invUnpaid = Number(p.inv_unpaid || 0);
    const totalInv = Number(p.total_invoices || 0);

    if (invUnpaid > 0) {
        return `<a href="#/invoices" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold transition"><i class="ri-file-list-3-line"></i><span>Buka Faktur</span></a>`;
    }
    if ((bastSigned > 0 || (tasksTotal > 0 && tasksDone === tasksTotal)) && msUnbilled > 0) {
        return `<button type="button" onclick="window.manageProjectMilestones(${p.id})" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-semibold transition"><i class="ri-bill-line"></i><span>Tagih Termin</span></button>`;
    }
    if (bastDraft > 0 || (tasksTotal > 0 && tasksDone === tasksTotal && bastSigned === 0)) {
        return `<button type="button" onclick="window.openProjectBasts(${p.id})" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold transition"><i class="ri-file-shield-2-line"></i><span>${bastDraft > 0 ? 'Cek BAST' : 'Buat BAST'}</span></button>`;
    }
    if (tasksTotal > 0 && tasksDone < tasksTotal) {
        return `<button type="button" onclick="window.openProjectKanban(${p.id})" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-semibold transition"><i class="ri-kanban-view"></i><span>Kanban</span></button>`;
    }
    if (spkPending > 0 || (quoApproved > 0 && spkSigned === 0 && tasksTotal === 0)) {
        return `<a href="#/contracts" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-semibold transition"><i class="ri-file-edit-line"></i><span>Cek SPK</span></a>`;
    }
    if (quoPending > 0 && tasksTotal === 0 && totalInv === 0) {
        return `<a href="#/quotations" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-semibold transition"><i class="ri-file-paper-2-line"></i><span>Lihat SPH</span></a>`;
    }
    return '';
}

function openProjectModal(project = null) {
    const modal = document.getElementById('project-modal');
    const title = document.getElementById('project-modal-title');
    const form = document.getElementById('project-form');
    form.reset();

    if (project) {
        title.innerHTML = `<i class="ri-edit-line text-primary-600"></i><span>Edit Data Proyek</span>`;
        document.getElementById('form-project-id').value = project.id;
        document.getElementById('form-project-client').value = project.client_id;
        document.getElementById('form-project-nama').value = project.nama_project;
        document.getElementById('form-project-git-repo').value = project.git_repo_url || '';
        document.getElementById('form-project-git-branch').value = project.git_branch || 'main';
        document.getElementById('form-project-deploy-path').value = project.deploy_path || '';
        document.getElementById('form-project-app-url').value = project.app_url || '';
        document.getElementById('form-project-nilai').value = project.nilai_project || 0;
        document.getElementById('form-project-status').value = project.status;
        document.getElementById('form-project-deskripsi').value = project.deskripsi || '';
    } else {
        title.innerHTML = `<i class="ri-git-branch-line text-primary-600"></i><span>Tambah Proyek Baru</span>`;
        document.getElementById('form-project-id').value = '';
    }

    modal.classList.remove('hidden');
}

function closeProjectModal() {
    document.getElementById('project-modal').classList.add('hidden');
}

async function handleSaveProject(e) {
    e.preventDefault();
    const id = document.getElementById('form-project-id').value;
    const body = {
        client_id: document.getElementById('form-project-client').value,
        nama_project: document.getElementById('form-project-nama').value.trim(),
        git_repo_url: document.getElementById('form-project-git-repo').value.trim(),
        git_branch: document.getElementById('form-project-git-branch').value.trim(),
        deploy_path: document.getElementById('form-project-deploy-path').value.trim(),
        app_url: document.getElementById('form-project-app-url').value.trim(),
        nilai_project: document.getElementById('form-project-nilai').value,
        status: document.getElementById('form-project-status').value,
        deskripsi: document.getElementById('form-project-deskripsi').value.trim()
    };

    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `projects/${id}` : 'projects';

    const res = await App.api(endpoint, { method, body });
    if (res && res.success) {
        App.toast(res.message, 'success');
        closeProjectModal();
        loadProjects();
    }
}

window.changeProjectPage = (p) => {
    state.page = p;
    loadProjects();
};

window.syncGitProject = async (id) => {
    App.toast('Menyinkronkan status deployment git...', 'info');
    const res = await App.api(`projects/${id}/sync-git`, { method: 'POST' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        loadProjects();
    }
};

window.openProjectGitOps = async (id) => {
    const res = await App.api(`projects/${id}/gitops`, { cache: false });
    if (!res?.success || !res.data) return;
    const d = res.data;

    const statusBadge = d.is_git_repo
        ? '<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">REPO GIT AKTIF</span>'
        : (d.path_exists
            ? '<span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">NON-GIT FOLDER</span>'
            : '<span class="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">PATH TIDAK DITEMUKAN</span>');

    App.openModal(`
        <div class="p-6 space-y-5">
            <div class="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-terminal-box-line text-indigo-600"></i> Panel GitOps &amp; Deploy
                        </h3>
                        ${statusBadge}
                    </div>
                    <p class="text-xs text-slate-500 mt-0.5">${App.escapeHtml(d.nama_project)} · Branch <code class="font-mono font-bold text-indigo-600">${App.escapeHtml(d.git_branch || 'main')}</code></p>
                </div>
                <button type="button" onclick="App.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    <i class="ri-close-line text-lg"></i>
                </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-1">
                    <div class="text-[10px] font-bold uppercase text-slate-400">Commit Terakhir</div>
                    <div class="font-mono font-bold text-slate-800 dark:text-slate-100">${App.escapeHtml(d.commit_hash)} · ${App.escapeHtml(d.commit_author)}</div>
                    <div class="text-[11px] text-slate-500 truncate">${App.escapeHtml(d.commit_message)}</div>
                </div>
                <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-1">
                    <div class="text-[10px] font-bold uppercase text-slate-400">Lingkungan &amp; Path</div>
                    <div class="font-mono text-[11px] text-slate-700 dark:text-slate-200 truncate">${App.escapeHtml(d.deploy_path || 'Belum diatur')}</div>
                    <div class="flex items-center gap-2 text-[11px] pt-0.5">
                        <span class="${d.has_env ? 'text-emerald-600' : 'text-amber-600'} font-semibold"><i class="${d.has_env ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'}"></i> .env ${d.has_env ? 'Tersedia' : 'Tidak Ada'}</span>
                        <span class="text-slate-400">· Dirty: <b>${d.dirty_files}</b></span>
                    </div>
                </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-2">
                    ${d.app_url ? `<a href="${App.escapeHtml(d.app_url)}" target="_blank" class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1"><i class="ri-external-link-line"></i> Buka App</a>` : ''}
                    ${d.app_git_installed ? `<a href="../app-git/" target="_blank" class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1"><i class="ri-git-repository-line"></i> Buka app-git</a>` : ''}
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" id="btn-gitops-sync" class="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800">Sinkronkan</button>
                    <button type="button" id="btn-gitops-deploy" ${d.is_git_repo ? '' : 'disabled'} class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm">
                        <i class="ri-rocket-line"></i><span>Trigger Deploy (git pull)</span>
                    </button>
                </div>
            </div>

            <div class="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div class="text-[11px] font-bold uppercase text-slate-400">Riwayat Deployment Terakhir</div>
                <div class="space-y-1.5 max-h-44 overflow-y-auto text-xs">
                    ${Array.isArray(d.logs) && d.logs.length ? d.logs.map(l => `
                        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2">
                            <div class="min-w-0">
                                <div class="font-mono font-bold text-slate-800 dark:text-slate-100">${App.escapeHtml(l.branch || '-')} · ${App.escapeHtml(l.commit_hash || '-')}</div>
                                <div class="text-[11px] text-slate-500 truncate">${App.escapeHtml(l.output_log || l.commit_message || '-')}</div>
                            </div>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${l.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">${String(l.status || '').toUpperCase()}</span>
                        </div>
                    `).join('') : '<div class="text-slate-400 text-center py-3">Belum ada riwayat deployment tercatat.</div>'}
                </div>
            </div>
        </div>
    `, 'max-w-2xl');

    document.getElementById('btn-gitops-sync')?.addEventListener('click', async () => {
        await window.syncGitProject(id);
        window.openProjectGitOps(id);
    });
    document.getElementById('btn-gitops-deploy')?.addEventListener('click', async () => {
        if (!await App.confirm('Jalankan Deploy Sekarang?', `Menjalankan git pull origin ${d.git_branch || 'main'} di ${d.deploy_path}.`)) return;
        const btn = document.getElementById('btn-gitops-deploy');
        App.btnLoading(btn, true, 'Deploying...');
        const depRes = await App.api(`projects/${id}/deploy`, { method: 'POST' });
        App.btnLoading(btn, false);
        if (depRes?.success) {
            App.toast(depRes.message, 'success');
            loadProjects();
            window.openProjectGitOps(id);
        }
    });
};

window.editProject = async (id) => {
    const res = await App.api(`projects/${id}`);
    if (res && res.success) {
        openProjectModal(res.data);
    }
};

window.deleteProject = async (id, name) => {
    const conf = await App.confirm('Hapus Proyek', `Yakin ingin menghapus proyek "${name}"?`);
    if (!conf) return;

    const res = await App.api(`projects/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        loadProjects();
    }
};

window._reloadProjectsList = loadProjects;

// ===== LAZY-LOADED SUB-MODUL PROYEK =====
window.checkProjectHealth = async (id) => (await import('./projects/insights.js')).checkProjectHealth(id);
window.viewProjectProfitability = async (id) => (await import('./projects/insights.js')).viewProjectProfitability(id);
window.manageProjectMilestones = async (id) => (await import('./projects/insights.js')).manageProjectMilestones(id);
window.applyMilestonePattern = async (id, pattern) => (await import('./projects/insights.js')).applyMilestonePattern(id, pattern);
window.openMilestoneForm = async (projectId, milestone = null, projectValue = 0) => (await import('./projects/insights.js')).openMilestoneForm(projectId, milestone, projectValue);
window.deleteMilestone = async (projectId, milestoneId, nama) => (await import('./projects/insights.js')).deleteMilestone(projectId, milestoneId, nama);
window.createMilestoneInvoice = async (projectId, milestoneId, nama) => (await import('./projects/insights.js')).createMilestoneInvoice(projectId, milestoneId, nama);

window.openProjectKanban = async (projectId, milestoneFilter = '') => (await import('./projects/kanban.js')).openProjectKanban(projectId, milestoneFilter);
window.openTaskModal = async (projectId, taskId = null, defaultMilestoneId = '') => (await import('./projects/kanban.js')).openTaskModal(projectId, taskId, defaultMilestoneId);
window.saveProjectTask = async (e, projectId, taskId = null, milestoneFilter = '') => (await import('./projects/kanban.js')).saveProjectTask(e, projectId, taskId, milestoneFilter);
window.moveTaskStatus = async (projectId, taskId, newStatus, milestoneFilter = '') => (await import('./projects/kanban.js')).moveTaskStatus(projectId, taskId, newStatus, milestoneFilter);
window.deleteProjectTask = async (projectId, taskId, milestoneFilter = '') => (await import('./projects/kanban.js')).deleteProjectTask(projectId, taskId, milestoneFilter);
window.logTaskTimesheet = async (projectId, taskId, taskTitle, defaultHours = 1) => (await import('./projects/kanban.js')).logTaskTimesheet(projectId, taskId, taskTitle, defaultHours);

window.openProjectBasts = async (projectId) => (await import('./projects/bast.js')).openProjectBasts(projectId);
window.openBastEditor = async (projectId, bastId = null, defaultMilestoneId = null, milestoneName = null) => (await import('./projects/bast.js')).openBastEditor(projectId, bastId, defaultMilestoneId, milestoneName);
window.saveBast = async (e, projectId, bastId = null) => (await import('./projects/bast.js')).saveBast(e, projectId, bastId);
window.signBast = async (projectId, bastId) => (await import('./projects/bast.js')).signBast(projectId, bastId);
window.deleteBast = async (projectId, bastId) => (await import('./projects/bast.js')).deleteBast(projectId, bastId);
window.downloadBastPdf = async (bastId, output = 'bloburl') => (await import('./projects/bast.js')).downloadBastPdf(bastId, output);

window.openProjectChangeRequests = async (projectId) => (await import('./projects/handover.js')).openProjectChangeRequests(projectId);
window.updateCrStatus = async (projectId, crId, status) => (await import('./projects/handover.js')).updateCrStatus(projectId, crId, status);
window.createCrInvoice = async (projectId, crId) => (await import('./projects/handover.js')).createCrInvoice(projectId, crId);
window.deleteCr = async (projectId, crId) => (await import('./projects/handover.js')).deleteCr(projectId, crId);
window.openProjectGoliveChecklist = async (projectId) => (await import('./projects/handover.js')).openProjectGoliveChecklist(projectId);

