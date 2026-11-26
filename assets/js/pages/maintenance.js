// assets/js/pages/maintenance.js
import { App } from '../app.js';

let state = {
    page: 1,
    per_page: 15,
    jenis: '',
    status: '',
    expiring_soon: false,
    search: ''
};

let clients = [];
let projects = [];

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">SLA, Domain &amp; Kontrak Hosting</h1>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Pemantauan masa aktif nama domain, server VPS cloud, SSL, dan perpanjangan kontrak SLA klien.</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <a href="#/status" target="_blank" class="px-3.5 py-2 bg-white hover:bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition">
                        <i class="ri-external-link-line text-primary-600"></i>
                        <span>Status Page Publik</span>
                    </a>
                    <button id="btn-check-all-uptime" class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition">
                        <i class="ri-pulse-line text-emerald-400"></i>
                        <span>Uji Semua Uptime &amp; SSL</span>
                    </button>
                    <button id="btn-add-sla" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm shadow-primary-500/20 transition">
                        <i class="ri-add-line text-base"></i>
                        <span>Tambah Aset / Kontrak SLA</span>
                    </button>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4" id="sla-kpi-cards">
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aset Aman (>30 Hari)</span>
                    <div id="kpi-sla-safe" class="text-xl font-black font-mono text-emerald-600 mt-1">0</div>
                </div>
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Segera Kedaluwarsa (≤30 Hari)</span>
                    <div id="kpi-sla-soon" class="text-xl font-black font-mono text-amber-600 mt-1">0</div>
                </div>
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kedaluwarsa / Kritis</span>
                    <div id="kpi-sla-expired" class="text-xl font-black font-mono text-rose-600 mt-1">0</div>
                </div>
                <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Nilai Kontrak</span>
                    <div id="kpi-sla-value" class="text-xl font-black font-mono text-primary-600 mt-1">Rp 0</div>
                </div>
            </div>

            <!-- Filter Toolbar -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                    <div class="relative w-full sm:w-64">
                        <i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input type="text" id="filter-sla-search" placeholder="Cari domain, server, klien..."
                               class="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                    </div>
                    <select id="filter-sla-jenis" class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        <option value="">Semua Jenis Aset</option>
                        <option value="domain">Nama Domain</option>
                        <option value="hosting_vps">Server / VPS Cloud</option>
                        <option value="ssl_certificate">Sertifikat SSL</option>
                        <option value="maintenance_sla">Kontrak Maintenance SLA</option>
                        <option value="lisensi">Lisensi Pihak Ketiga</option>
                    </select>
                    <label class="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer ml-1">
                        <input type="checkbox" id="filter-sla-urgent" class="rounded text-primary-600">
                        <span>Hanya Segera Kedaluwarsa (≤30 Hari)</span>
                    </label>
                </div>
            </div>

            <!-- Table Container -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-50/70 dark:bg-slate-800/40 text-[10px] font-bold uppercase text-slate-500 font-mono border-b border-slate-200/80 dark:border-slate-800 whitespace-nowrap">
                                <th class="py-3.5 pl-6 pr-4 min-w-[200px]">Nama Aset / Layanan</th>
                                <th class="py-3.5 px-4 text-center">Jenis</th>
                                <th class="py-3.5 px-4 min-w-[190px]">Klien & Proyek</th>
                                <th class="py-3.5 px-4">Provider / Domain</th>
                                <th class="py-3.5 px-4 text-center">Uptime & SSL</th>
                                <th class="py-3.5 px-4 text-right">Biaya Perpanjangan</th>
                                <th class="py-3.5 px-4 text-center">Masa Aktif & Sisa Hari</th>
                                <th class="py-3.5 pl-4 pr-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="maintenance-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr><td colspan="8" class="py-12 text-center text-slate-400">Memuat data SLA dan aset...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="maintenance-pagination" class="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500"></div>
            </div>
        </div>

        <!-- Add/Edit Modal Form -->
        <div id="maintenance-modal" class="hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div class="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 animate-fadeIn border border-slate-100 dark:border-slate-800 my-auto">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 id="sla-modal-title" class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-shield-check-line text-primary-600"></i> Tambah Pemantauan SLA / Domain
                    </h3>
                    <button type="button" onclick="document.getElementById('maintenance-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1">
                        <i class="ri-close-line text-xl"></i>
                    </button>
                </div>
                <form id="maintenance-form" class="space-y-4 pt-4">
                    <input type="hidden" id="form-sla-id">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Jenis Aset / Kontrak *</label>
                            <select id="form-sla-jenis" required class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                <option value="domain">Nama Domain (.com, .id, dll)</option>
                                <option value="hosting_vps">Server VPS / Cloud Hosting</option>
                                <option value="ssl_certificate">Sertifikat SSL TLS</option>
                                <option value="maintenance_sla">Kontrak Maintenance SLA Bulanan</option>
                                <option value="lisensi">Lisensi Software Pihak Ketiga</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Pelanggan Terkait *</label>
                            <select id="form-sla-client" required class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"></select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Nama Aset / Label *</label>
                            <input type="text" id="form-sla-nama" required placeholder="Contoh: Domain crudworks.com"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Proyek Terkait (Opsional)</label>
                            <select id="form-sla-project" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                <option value="">Tanpa Proyek Khusus</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Provider / Registrar</label>
                            <input type="text" id="form-sla-provider" placeholder="Contoh: Niagahoster, DigitalOcean, Cloudflare"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Nama Domain / Hostname / IP</label>
                            <input type="text" id="form-sla-domain" placeholder="Contoh: api.klien.com / 103.28.12.9"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Biaya Perpanjangan (Rp)</label>
                            <input type="number" id="form-sla-biaya" required min="0" step="50000" placeholder="0"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Siklus</label>
                            <select id="form-sla-siklus" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                <option value="tahunan">Tahunan</option>
                                <option value="bulanan">Bulanan</option>
                                <option value="triwulan">Triwulan (3 Bulan)</option>
                                <option value="semesteran">Semesteran (6 Bulan)</option>
                                <option value="dua_tahunan">Dua Tahunan</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Tgl Berakhir Sewa *</label>
                            <input type="date" id="form-sla-end" required class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-rose-600 font-bold">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Catatan Teknis / Konfigurasi</label>
                        <textarea id="form-sla-catatan" rows="2" placeholder="Catatan login cPanel, ID server, atau SLA respon"
                                  class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"></textarea>
                    </div>

                    <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                        <button type="button" onclick="document.getElementById('maintenance-modal').classList.add('hidden')"
                                class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold">Batal</button>
                        <button type="submit" id="btn-save-sla"
                                class="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm">Simpan Data Aset</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Load master dependencies
    await Promise.all([loadMasterClients(), loadMasterProjects()]);

    // Bindings
    document.getElementById('btn-add-sla')?.addEventListener('click', () => openSlaModal());
    document.getElementById('btn-check-all-uptime')?.addEventListener('click', () => window.checkAllSlaHealth());
    document.getElementById('maintenance-form')?.addEventListener('submit', handleSaveSla);

    document.getElementById('filter-sla-jenis')?.addEventListener('change', (e) => {
        state.jenis = e.target.value;
        state.page = 1;
        loadMaintenanceList();
    });

    document.getElementById('filter-sla-urgent')?.addEventListener('change', (e) => {
        state.expiring_soon = e.target.checked;
        state.page = 1;
        loadMaintenanceList();
    });

    let sTimer;
    document.getElementById('filter-sla-search')?.addEventListener('input', (e) => {
        clearTimeout(sTimer);
        sTimer = setTimeout(() => {
            state.search = e.target.value.trim();
            state.page = 1;
            loadMaintenanceList();
        }, 300);
    });

    loadMaintenanceList();
}

async function loadMasterClients() {
    const res = await App.api('clients?all=1');
    if (res && res.success) {
        clients = res.data;
        const sel = document.getElementById('form-sla-client');
        if (sel) {
            sel.innerHTML = `<option value="">Pilih Pelanggan...</option>` + clients.map(c => `
                <option value="${c.id}">${c.nama_perusahaan} (${c.kode_klien})</option>
            `).join('');
        }
    }
}

async function loadMasterProjects() {
    const res = await App.api('projects?all=1');
    if (res && res.success) {
        projects = res.data;
        const sel = document.getElementById('form-sla-project');
        if (sel) {
            sel.innerHTML = `<option value="">Tanpa Proyek Khusus</option>` + projects.map(p => `
                <option value="${p.id}">${p.nama_project} (${p.client_nama || ''})</option>
            `).join('');
        }
    }
}

async function loadMaintenanceList() {
    const tbody = document.getElementById('maintenance-tbody');
    let q = `maintenance?page=${state.page}&per_page=${state.per_page}`;
    if (state.jenis) q += `&jenis=${state.jenis}`;
    if (state.expiring_soon) q += `&expiring_soon=1`;
    if (state.search) q += `&search=${encodeURIComponent(state.search)}`;

    const res = await App.api(q);
    if (!res || !res.success) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-rose-500">Gagal memuat daftar pemantauan SLA</td></tr>`;
        return;
    }

    const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
    const pagination = res.pagination || res.data?.pagination || { page: 1, total_pages: 1, total: items.length };
    const kpi = res.kpi || res.extra?.kpi || res.data?.extra?.kpi;

    // Update KPIs
    if (kpi) {
        document.getElementById('kpi-sla-safe').textContent = kpi.count_safe || 0;
        document.getElementById('kpi-sla-soon').textContent = kpi.count_expiring_soon || 0;
        document.getElementById('kpi-sla-expired').textContent = kpi.count_expired || 0;
        document.getElementById('kpi-sla-value').textContent = App.formatIDR(kpi.total_annual_value || 0);
    }

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400">Tidak ada aset atau kontrak SLA yang sesuai filter</td></tr>`;
        renderPagination(pagination);
        return;
    }

    const jenisMap = {
        'domain': { label: 'DOMAIN', bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60' },
        'hosting_vps': { label: 'VPS CLOUD', bg: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60' },
        'ssl_certificate': { label: 'SSL CERT', bg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60' },
        'maintenance_sla': { label: 'SLA SUPPORT', bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60' },
        'lisensi': { label: 'LISENSI', bg: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60' }
    };

    tbody.innerHTML = items.map(m => {
        const j = jenisMap[m.jenis] || { label: m.jenis, bg: 'bg-slate-100 text-slate-700' };
        const sisa = parseInt(m.sisa_hari) || 0;

        let sisaBadge;
        if (sisa < 0) {
            sisaBadge = `<span class="badge-status badge-status-danger"><span class="status-dot"></span><i class="ri-alarm-warning-line text-[11px]"></i><span>Lewat ${Math.abs(sisa)} Hari</span></span>`;
        } else if (sisa <= 7) {
            sisaBadge = `<span class="badge-status badge-status-danger animate-pulse"><span class="status-dot"></span><i class="ri-error-warning-line text-[11px]"></i><span>Kritis: ${sisa} Hari Lagi</span></span>`;
        } else if (sisa <= 30) {
            sisaBadge = `<span class="badge-status badge-status-warning"><span class="status-dot"></span><i class="ri-time-line text-[11px]"></i><span>${sisa} Hari Lagi</span></span>`;
        } else {
            sisaBadge = `<span class="badge-status badge-status-success"><span class="status-dot"></span><i class="ri-checkbox-circle-line text-[11px]"></i><span>${sisa} Hari Lagi</span></span>`;
        }

        let uptimeBadge = `<span class="text-[10px] text-slate-400 font-mono whitespace-nowrap">Belum Diuji</span>`;
        if (m.uptime_status === 'online') {
            uptimeBadge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 font-mono inline-flex items-center gap-1 whitespace-nowrap"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>ONLINE (${m.response_time_ms || 0}ms)</span>`;
        } else if (m.uptime_status === 'warning') {
            uptimeBadge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 font-mono inline-flex items-center gap-1 whitespace-nowrap"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>HTTP ${m.http_status_code || 400}</span>`;
        } else if (m.uptime_status === 'down') {
            uptimeBadge = `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 font-mono inline-flex items-center gap-1 whitespace-nowrap"><span class="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>DOWN</span>`;
        }

        let sslBadge = '';
        if (m.ssl_days_left !== null && m.ssl_days_left !== undefined) {
            const sslDays = parseInt(m.ssl_days_left);
            const isSslExpiring = sslDays <= 14;
            sslBadge = `<div class="text-[10px] font-mono mt-1 flex items-center justify-center gap-1 whitespace-nowrap ${isSslExpiring ? 'text-amber-600 font-bold' : 'text-slate-400'}"><i class="ri-shield-check-line text-emerald-500"></i> SSL: ${sslDays > 0 ? sslDays + ' hr' : 'Expired'}</div>`;
        }

        return `
            <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                <td class="py-3.5 pl-6 pr-4 align-middle min-w-[200px] max-w-[260px]">
                    <div class="font-bold text-slate-900 dark:text-white leading-snug">${m.nama_aset}</div>
                    ${m.domain_name ? `<div class="text-[11px] font-mono text-primary-600 truncate mt-0.5" title="${App.escapeHtml(m.domain_name)}">${m.domain_name}</div>` : ''}
                </td>
                <td class="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                    <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${j.bg}">${j.label}</span>
                </td>
                <td class="py-3.5 px-4 align-middle font-sans min-w-[190px] max-w-[250px]">
                    <div class="font-bold text-slate-800 dark:text-slate-200 leading-snug">${m.nama_perusahaan}</div>
                    ${m.nama_project ? `<div class="text-[10px] text-slate-400 mt-0.5 leading-snug">Proyek: ${m.nama_project}</div>` : ''}
                </td>
                <td class="py-3.5 px-4 align-middle whitespace-nowrap">
                    <div class="text-slate-700 dark:text-slate-300 font-semibold">${m.provider || '-'}</div>
                    ${m.ip_address ? `<div class="text-[10px] font-mono text-slate-400 mt-0.5">IP: ${m.ip_address}</div>` : ''}
                </td>
                <td class="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                    <div>${uptimeBadge}</div>
                    ${sslBadge}
                </td>
                <td class="py-3.5 px-4 align-middle text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    ${App.formatIDR(m.biaya_perpanjangan)}
                    <div class="text-[10px] text-slate-400 font-sans font-normal uppercase mt-0.5">/ ${m.siklus}</div>
                </td>
                <td class="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                    <div class="inline-flex justify-center">${sisaBadge}</div>
                    <div class="text-[10px] font-mono text-slate-400 mt-1">s/d ${App.formatDate(m.tanggal_berakhir)}</div>
                </td>
                <td class="py-3.5 pl-4 pr-6 align-middle text-right whitespace-nowrap">
                    <button type="button" onclick="App.toggleTableActionMenu(this, event, [
                        { label: 'Uji Uptime & SSL Sekarang', icon: 'ri-pulse-line', iconColor: 'text-emerald-600', action: 'window.checkSlaHealth(${m.id})' },
                        { label: 'Edit Kontrak SLA / Domain', icon: 'ri-edit-line', iconColor: 'text-primary-600', action: 'window.editSla(${m.id})' },
                        {
                            label: 'Penagihan & Pengingat',
                            icon: 'ri-bill-line',
                            iconColor: 'text-indigo-600',
                            children: [
                                { label: 'Terbitkan Faktur Perpanjangan', icon: 'ri-file-add-line', iconColor: 'text-indigo-600', action: 'window.createRenewalInvoice(${m.id}, \\'${App.escapeHtml(m.nama_aset)}\\')' },
                                { label: 'Kirim Pengingat WA Perpanjangan', icon: 'ri-whatsapp-line', iconColor: 'text-emerald-500', action: 'window.sendSlaReminderWA(\\'${App.escapeHtml(m.nama_aset)}\\', \\'${App.escapeHtml(m.nama_perusahaan)}\\', \\'${App.escapeHtml(m.telepon || '')}\\', ${sisa}, \\'${App.formatDate(m.tanggal_berakhir)}\\', ${Number(m.biaya_perpanjangan || 0)})' }
                            ]
                        },
                        { divider: true },
                        { label: 'Hapus Layanan', icon: 'ri-delete-bin-line', danger: true, action: 'window.deleteSla(${m.id}, \\'${App.escapeHtml(m.nama_aset)}\\')' }
                    ])" class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition" title="Menu Aksi">
                        <span>Aksi</span>
                        <i class="ri-more-2-fill text-slate-400"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    renderPagination(pagination);
}

function renderPagination(p) {
    const cont = document.getElementById('maintenance-pagination');
    if (!cont) return;
    if (p.total_pages <= 1) {
        cont.innerHTML = `<span>Menampilkan ${p.total} data</span>`;
        return;
    }
    App.renderPagination(cont, p, (page) => { state.page = page; loadMaintenanceList(); }, 'aset/SLA');
}

function openSlaModal(item = null) {
    const modal = document.getElementById('maintenance-modal');
    const title = document.getElementById('sla-modal-title');
    document.getElementById('form-sla-id').value = item ? item.id : '';
    document.getElementById('form-sla-jenis').value = item ? item.jenis : 'domain';
    document.getElementById('form-sla-client').value = item ? item.client_id : '';
    document.getElementById('form-sla-nama').value = item ? item.nama_aset : '';
    document.getElementById('form-sla-project').value = item ? (item.project_id || '') : '';
    document.getElementById('form-sla-provider').value = item ? (item.provider || '') : '';
    document.getElementById('form-sla-domain').value = item ? (item.domain_name || '') : '';
    document.getElementById('form-sla-biaya').value = item ? item.biaya_perpanjangan : '0';
    document.getElementById('form-sla-siklus').value = item ? item.siklus : 'tahunan';
    document.getElementById('form-sla-end').value = item ? item.tanggal_berakhir : new Date(Date.now() + 365*86400000).toISOString().slice(0, 10);
    document.getElementById('form-sla-catatan').value = item ? (item.catatan || '') : '';

    title.innerHTML = item ? `<i class="ri-edit-line text-primary-600"></i> Edit Aset ${item.nama_aset}` : `<i class="ri-shield-check-line text-primary-600"></i> Tambah Pemantauan SLA / Domain`;
    modal.classList.remove('hidden');
}

async function handleSaveSla(e) {
    e.preventDefault();
    const id = document.getElementById('form-sla-id').value;
    const btn = document.getElementById('btn-save-sla');

    const payload = {
        jenis: document.getElementById('form-sla-jenis').value,
        client_id: document.getElementById('form-sla-client').value,
        nama_aset: document.getElementById('form-sla-nama').value.trim(),
        project_id: document.getElementById('form-sla-project').value || null,
        provider: document.getElementById('form-sla-provider').value.trim(),
        domain_name: document.getElementById('form-sla-domain').value.trim(),
        biaya_perpanjangan: document.getElementById('form-sla-biaya').value,
        siklus: document.getElementById('form-sla-siklus').value,
        tanggal_berakhir: document.getElementById('form-sla-end').value,
        catatan: document.getElementById('form-sla-catatan').value.trim()
    };

    App.btnLoading(btn, true, 'Menyimpan...');
    try {
        const url = id ? `maintenance/${id}` : 'maintenance';
        const method = id ? 'PUT' : 'POST';
        const res = await App.api(url, { method, data: payload });

        if (res && res.success) {
            App.toast(res.message, 'success');
            document.getElementById('maintenance-modal').classList.add('hidden');
            loadMaintenanceList();
        }
    } finally {
        App.btnLoading(btn, false);
    }
}

window.createRenewalInvoice = async (id, nama) => {
    const conf = await App.confirm(
        'Terbitkan Faktur Perpanjangan',
        `Apakah Anda ingin menerbitkan Faktur Tagihan resmi untuk perpanjangan aset "${nama}"?`
    );
    if (!conf) return;

    const res = await App.api(`maintenance/${id}/create-invoice`, { method: 'POST' });
    if (res && res.success) {
        await App.confirm(
            'Faktur Perpanjangan Terbit!',
            `${res.message}\nNomor Faktur: ${res.data.nomor_invoice}. Lihat faktur sekarang?`
        ).then(ok => {
            if (ok) window.location.hash = '#/invoices';
            else loadMaintenanceList();
        });
    }
};

window.editSla = async (id) => {
    const res = await App.api(`maintenance/${id}`);
    if (res && res.success && res.data) {
        openSlaModal(res.data);
    }
};

window.deleteSla = async (id, nama) => {
    const conf = await App.confirm('Hapus Aset SLA', `Apakah Anda yakin ingin menghapus pemantauan aset "${nama}"?`);
    if (!conf) return;

    const res = await App.api(`maintenance/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        loadMaintenanceList();
    }
};

window.checkSlaHealth = async (id) => {
    App.toast('Menguji status koneksi & SSL...', 'info');
    const res = await App.api(`maintenance/check-health`, {
        method: 'POST',
        body: JSON.stringify({ id })
    });
    if (res && res.success) {
        const d = res.data;
        const msg = `Uptime: ${d.uptime_status.toUpperCase()} (${d.response_time_ms}ms)` +
                    (d.ssl_days_left !== null ? ` | SSL: ${d.ssl_days_left} hari (${d.ssl_issuer || ''})` : '');
        App.toast(msg, d.uptime_status === 'online' ? 'success' : 'warning');
        loadMaintenanceList();
    } else {
        App.toast(res?.message || 'Gagal memeriksa kesehatan domain/server', 'error');
    }
};

window.checkAllSlaHealth = async () => {
    const btn = document.getElementById('btn-check-all-uptime');
    if (btn) btn.disabled = true;
    App.toast('Sedang menguji semua domain & server aktif...', 'info');

    const res = await App.api('maintenance/check-all', { method: 'POST' });
    if (btn) btn.disabled = false;

    if (res && res.success) {
        App.toast(res.message || 'Pemeriksaan selesai!', 'success');
        loadMaintenanceList();
    } else {
        App.toast(res?.message || 'Gagal menguji domain', 'error');
    }
};

window.changeSlaPage = (p) => {
    state.page = p;
    loadMaintenanceList();
};

window.sendSlaReminderWA = (aset, clientNama, telepon, sisa, tglBerakhir, biaya) => {
    const statusText = sisa < 0
        ? `telah melewati masa berlaku (${Math.abs(sisa)} hari lalu pada ${tglBerakhir})`
        : `akan berakhir dalam ${sisa} hari (${tglBerakhir})`;
    const msg = `Halo Bapak/Ibu tim ${clientNama},\n\nKami menginformasikan bahwa layanan *${aset}* ${statusText} dengan estimasi biaya perpanjangan *${App.formatIDR(biaya)}*.\n\nSilakan konfirmasi jika ingin kami proses perpanjangannya atau cek detail di Portal Klien. Terima kasih.`;
    App.openWhatsApp(telepon, msg);
};

export default { init };
