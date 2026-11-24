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
            <div class="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-fadeIn max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                    <h3 id="project-modal-title" class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-git-branch-line text-primary-600"></i>
                        <span>Tambah Proyek Baru</span>
                    </h3>
                    <button id="btn-close-project-modal" class="text-slate-400 hover:text-slate-600">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <form id="project-form" class="space-y-4">
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

                    <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
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
            { label: 'Termin & Milestone', icon: 'ri-calendar-todo-line', iconColor: 'text-amber-500', fn: () => window.manageProjectMilestones(p.id) },
            { label: 'Berita Acara (BAST)', icon: 'ri-file-shield-2-line', iconColor: 'text-emerald-600', fn: () => window.openProjectBasts(p.id) },
            { label: 'Garansi & Adendum', icon: 'ri-shield-star-line', iconColor: 'text-teal-600', fn: () => window.openProjectChangeRequests(p.id) },
            {
                label: 'Teknis & Analisis',
                icon: 'ri-settings-4-line',
                iconColor: 'text-indigo-600',
                children: [
                    { label: 'Cek Uptime & SSL', icon: 'ri-pulse-line', iconColor: 'text-rose-500', fn: () => window.checkProjectHealth(p.id) },
                    { label: 'Analisis Profitabilitas (P&L)', icon: 'ri-pie-chart-2-line', iconColor: 'text-indigo-600', fn: () => window.viewProjectProfitability(p.id) },
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

    paginationEl.innerHTML = `
        <div>Menampilkan hal <b>${pagination.page}</b> dari <b>${pagination.total}</b> proyek</div>
        <div class="flex items-center gap-2">
            <button ${pagination.page <= 1 ? 'disabled' : ''} onclick="window.changeProjectPage(${pagination.page - 1})"
                    class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40">Sebelumnya</button>
            <button ${pagination.page >= pagination.total_pages ? 'disabled' : ''} onclick="window.changeProjectPage(${pagination.page + 1})"
                    class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40">Berikutnya</button>
        </div>
    `;
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

// ===== FITUR 4: Live Health & Uptime Checker =====
window.checkProjectHealth = async (id) => {
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
        loadProjects();
    }
};

// ===== FITUR 5: Profitability & P&L Insight =====
window.viewProjectProfitability = async (id) => {
    const res = await App.api(`projects/${id}/profitability`);
    if (!res || !res.success) return;
    const { project: p, summary: s, milestones: ms } = res.data;

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

            <!-- KPI Cards -->
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

            <!-- Net Gross Profit Hero Card -->
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
};

// ===== FITUR 3: Milestone & Termin Generator =====
window.manageProjectMilestones = async (id) => {
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

            <!-- Quick Pattern Generator -->
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

            <!-- Milestones List Table -->
            <div class="space-y-3">
                <div class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Daftar Termin Proyek</div>
                <div class="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    ${ms.length === 0 ? `
                        <div class="p-6 text-center text-slate-400">Belum ada termin milestone dibuat untuk proyek ini. Klik tombol pola di atas.</div>
                    ` : ms.map((m, idx) => `
                        <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <div class="min-w-0 flex-1">
                                <div class="font-bold text-slate-900 dark:text-white flex items-start gap-2">
                                    <span class="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] flex items-center justify-center font-mono font-bold shrink-0 mt-0.5">${idx + 1}</span>
                                    <span class="leading-snug">${m.nama_milestone}</span>
                                </div>
                                <div class="text-xs text-slate-500 font-mono mt-1 pl-7">
                                    Porsi: <b>${m.persentase}%</b> · Nominal: <b class="text-slate-800 dark:text-slate-200 whitespace-nowrap">${App.formatIDR(m.nominal)}</b>
                                </div>
                                ${m.nomor_invoice ? `
                                    <div class="mt-1 pl-7 text-[11px] text-emerald-600 font-mono">
                                        <i class="ri-file-check-line"></i> Faktur: <b>${m.nomor_invoice}</b> (${m.invoice_status})
                                    </div>
                                ` : ''}
                            </div>
                            <div class="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap pl-7 sm:pl-0">
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
};

window.applyMilestonePattern = async (projectId, pattern) => {
    const res = await App.api(`projects/${projectId}/milestones`, {
        method: 'POST',
        body: { pattern }
    });
    if (res && res.success) {
        App.toast(res.message, 'success');
        window.manageProjectMilestones(projectId);
    }
};

window.createMilestoneInvoice = async (projectId, milestoneId, namaMilestone) => {
    const conf = await App.confirm('Terbitkan Faktur Termin', `Terbitkan faktur tagihan resmi untuk "${namaMilestone}"?`);
    if (!conf) return;

    const res = await App.api(`projects/${projectId}/create-milestone-invoice`, {
        method: 'POST',
        body: { milestone_id: milestoneId }
    });
    if (res && res.success) {
        App.toast(res.message, 'success');
        window.manageProjectMilestones(projectId);
        loadProjects();
    }
};

// ===== FITUR 6: Papan Tugas Proyek Ringan (Lightweight Kanban per Milestone) =====
window.openProjectKanban = async (projectId, milestoneFilter = '') => {
    // Fetch project details, milestones, and tasks
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
            <!-- Modal Header -->
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

            <!-- Stats & Filter Bar -->
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

            <!-- 4-Column Kanban Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 overflow-y-auto flex-1 min-h-[420px] pb-2">
                ${kanbanCols.map(col => {
                    const colTasks = tasks.filter(t => t.status === col.key);
                    return `
                        <div class="flex flex-col rounded-2xl border ${col.theme} p-3 min-h-[380px]">
                            <!-- Column Header -->
                            <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/60 dark:border-slate-700/60">
                                <div class="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                                    <i class="${col.icon} text-slate-500"></i>
                                    <span>${col.label}</span>
                                </div>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${col.badge}">
                                    ${colTasks.length}
                                </span>
                            </div>

                            <!-- Cards List -->
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

                                            <!-- Metadata & Footer Controls -->
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

                                                <!-- Quick Actions -->
                                                <div class="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                                                    <!-- Shift Left -->
                                                    ${col.key !== 'todo' ? `
                                                        <button type="button" onclick="window.moveTaskStatus(${projectId}, ${t.id}, '${col.key === 'done' ? 'review' : col.key === 'review' ? 'in_progress' : 'todo'}', '${milestoneFilter || ''}')"
                                                                class="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" title="Kembalikan status">
                                                            <i class="ri-arrow-left-s-line text-xs"></i>
                                                        </button>
                                                    ` : ''}

                                                    <!-- 1-Click Timesheet -->
                                                    <button type="button" onclick="window.logTaskTimesheet(${projectId}, ${t.id}, '${App.escapeHtml(t.judul_tugas)}', ${t.estimasi_jam})"
                                                            class="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded transition" title="Catat Waktu ke Timesheet">
                                                        <i class="ri-timer-line text-xs"></i>
                                                    </button>

                                                    <!-- Edit Task -->
                                                    <button type="button" onclick="window.openTaskModal(${projectId}, ${t.id}, '${milestoneFilter || ''}')"
                                                            class="p-1 text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" title="Edit Rincian Tugas">
                                                        <i class="ri-edit-line text-xs"></i>
                                                    </button>

                                                    <!-- Shift Right -->
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
};

window.openTaskModal = async (projectId, taskId = null, defaultMilestoneId = '') => {
    // Fetch project milestones and team users
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
};

window.saveProjectTask = async (e, projectId, taskId = null, milestoneFilter = '') => {
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
        window.openProjectKanban(projectId, milestoneFilter);
    }
};

window.moveTaskStatus = async (projectId, taskId, newStatus, milestoneFilter = '') => {
    const res = await App.api(`project-tasks/${taskId}/status`, {
        method: 'POST',
        body: { status: newStatus }
    });
    if (res && res.success) {
        App.toast(res.message, 'success');
        window.openProjectKanban(projectId, milestoneFilter);
    }
};

window.deleteProjectTask = async (projectId, taskId, milestoneFilter = '') => {
    const conf = await App.confirm('Hapus Tugas Proyek', 'Yakin ingin menghapus tugas ini dari papan proyek?');
    if (!conf) return;

    const res = await App.api(`project-tasks/${taskId}`, { method: 'DELETE' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        document.getElementById('project-task-modal')?.classList.add('hidden');
        window.openProjectKanban(projectId, milestoneFilter);
    }
};

window.logTaskTimesheet = async (projectId, taskId, taskTitle, defaultHours = 1) => {
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
};

// ===== FITUR 7: Generator BAST Digital (Berita Acara Serah Terima) =====
window.openProjectBasts = async (projectId) => {
    const [projRes, bastsRes] = await Promise.all([
        App.api(`projects/${projectId}/profitability`),
        App.api(`basts?project_id=${projectId}`)
    ]);

    if (!projRes || !projRes.success) {
        App.toast('Gagal memuat rincian proyek', 'error');
        return;
    }

    const { project: p, milestones: ms } = projRes.data;
    const basts = bastsRes?.data || [];

    let modal = document.getElementById('project-bast-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'project-bast-modal';
        modal.className = 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-fadeIn max-h-[92vh] overflow-y-auto space-y-6">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div class="space-y-1 min-w-0 flex-1">
                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Dokumen Hukum & Legalitas Serah Terima</span>
                    <h2 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-file-shield-2-line text-emerald-600 shrink-0"></i>
                        <span>Berita Acara Serah Terima (BAST)</span>
                    </h2>
                    <p class="text-xs text-slate-500 leading-relaxed">Proyek: <b class="text-slate-800 dark:text-slate-200">${p.nama_project}</b> (${p.kode_project}) · Klien: <b>${p.nama_perusahaan}</b></p>
                </div>
                <div class="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    <button type="button" onclick="window.openBastEditor(${projectId})" class="whitespace-nowrap px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition">
                        <i class="ri-add-line text-sm"></i><span>Terbitkan BAST Baru</span>
                    </button>
                    <button type="button" onclick="document.getElementById('project-bast-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>
            </div>

            <!-- BAST Documents List -->
            <div class="space-y-3">
                <div class="flex items-center justify-between text-xs text-slate-500">
                    <span class="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Daftar Dokumen BAST Diterbitkan</span>
                    <span>Total Dokumen: <b>${basts.length}</b></span>
                </div>

                <div class="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    ${basts.length === 0 ? `
                        <div class="p-8 text-center text-slate-400 space-y-2">
                            <i class="ri-file-shield-2-line text-3xl opacity-30"></i>
                            <div>Belum ada dokumen BAST diterbitkan untuk proyek ini.</div>
                            <div class="text-[11px] text-slate-500">Klik "Terbitkan BAST Baru" di atas atau melalui menu Termin & Milestone.</div>
                        </div>
                    ` : basts.map(b => {
                        const isSigned = b.status === 'ditandatangani';
                        return `
                            <div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                <div class="space-y-1.5 min-w-0 flex-1">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="font-mono font-bold text-sm text-slate-900 dark:text-white">${b.nomor_bast}</span>
                                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isSigned ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}">
                                            <i class="${isSigned ? 'ri-shield-check-line' : 'ri-edit-line'}"></i> ${isSigned ? 'Sah & Ditandatangani' : 'Draft BAST'}
                                        </span>
                                        ${b.nama_milestone ? `
                                            <span class="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                ${App.escapeHtml(b.nama_milestone)}
                                            </span>
                                        ` : ''}
                                    </div>

                                    <div class="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                        ${App.escapeHtml(b.judul_pekerjaan)}
                                    </div>

                                    <div class="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                                        <span><i class="ri-calendar-line"></i> Tanggal: <b>${App.formatDate(b.tanggal_bast)}</b></span>
                                        <span><i class="ri-user-star-line"></i> Pihak 1: <b>${App.escapeHtml(b.pihak_pertama_nama)}</b> (${App.escapeHtml(b.pihak_pertama_jabatan)})</span>
                                        <span><i class="ri-user-shared-line"></i> Pihak 2: <b>${App.escapeHtml(b.pihak_kedua_nama)}</b> (${App.escapeHtml(b.pihak_kedua_jabatan)})</span>
                                    </div>
                                </div>

                                <div class="flex items-center gap-2 shrink-0">
                                    <button type="button" onclick="window.downloadBastPdf(${b.id})" class="whitespace-nowrap px-3 py-1.5 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition" title="Cetak atau Pratinjau Dokumen PDF">
                                        <i class="ri-file-pdf-2-line"></i><span>Cetak PDF</span>
                                    </button>

                                    ${!isSigned ? `
                                        <button type="button" onclick="window.signBast(${projectId}, ${b.id})" class="whitespace-nowrap px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 shadow-sm transition" title="Sahkan & Tandatangani">
                                            <i class="ri-quill-pen-line"></i><span>Sahkan</span>
                                        </button>
                                    ` : ''}

                                    <button type="button" onclick="window.openBastEditor(${projectId}, ${b.id})" class="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition" title="Edit Rincian BAST">
                                        <i class="ri-edit-line text-base"></i>
                                    </button>

                                    <button type="button" onclick="window.deleteBast(${projectId}, ${b.id})" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition" title="Hapus Dokumen BAST">
                                        <i class="ri-delete-bin-line text-base"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="flex justify-end pt-2">
                <button type="button" onclick="document.getElementById('project-bast-modal').classList.add('hidden')" class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition">
                    Tutup
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
};

window.openBastEditor = async (projectId, bastId = null, defaultMilestoneId = null, milestoneName = null) => {
    // Fetch project profitability (milestones & client info)
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

                <!-- Penandatangan Kedua Belah Pihak -->
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
};

window.saveBast = async (e, projectId, bastId = null) => {
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
        window.openProjectBasts(projectId);
    }
};

window.signBast = async (projectId, bastId) => {
    const conf = await App.confirm(
        'Pengesahan Dokumen BAST',
        'Tandatangani dokumen Berita Acara Serah Terima ini secara sah? Status akan berubah menjadi "ditandatangani".'
    );
    if (!conf) return;

    const res = await App.api(`basts/${bastId}/sign`, { method: 'POST' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        window.openProjectBasts(projectId);
    }
};

window.deleteBast = async (projectId, bastId) => {
    const conf = await App.confirm('Hapus Dokumen BAST', 'Yakin ingin menghapus dokumen Berita Acara ini?');
    if (!conf) return;

    const res = await App.api(`basts/${bastId}`, { method: 'DELETE' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        window.openProjectBasts(projectId);
    }
};

window.downloadBastPdf = async (bastId, output = 'bloburl') => {
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
};

window.openProjectChangeRequests = async (projectId) => {
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
            window.openProjectChangeRequests(projectId);
            loadProjects();
        }
    });

    modal.classList.remove('hidden');
};

window.updateCrStatus = async (projectId, crId, status) => {
    const r = await App.api(`projects/${projectId}/change-requests/${crId}`, { method: 'PUT', body: { status } });
    if (r?.success) {
        App.toast('Status adendum diperbarui', 'success');
        window.openProjectChangeRequests(projectId);
    }
};

window.createCrInvoice = async (projectId, crId) => {
    const ok = await App.confirm('Terbitkan Faktur Adendum', 'Terbitkan faktur tagihan resmi untuk adendum ini?');
    if (!ok) return;
    const r = await App.api(`projects/${projectId}/change-requests/${crId}/invoice`, { method: 'POST' });
    if (r?.success) {
        App.toast(r.message || 'Faktur adendum diterbitkan', 'success');
        window.openProjectChangeRequests(projectId);
        loadProjects();
    }
};

window.deleteCr = async (projectId, crId) => {
    const ok = await App.confirm('Hapus Adendum', 'Hapus adendum ini?', 'warning');
    if (!ok) return;
    const r = await App.api(`projects/${projectId}/change-requests/${crId}`, { method: 'DELETE' });
    if (r?.success) {
        App.toast('Adendum dihapus', 'success');
        window.openProjectChangeRequests(projectId);
        loadProjects();
    }
};

