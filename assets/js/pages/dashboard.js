// assets/js/pages/dashboard.js
import { App } from '../app.js';

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-8 animate-fadeIn">
            <!-- Header Section -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Ringkasan Finansial & Operasional</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Pantau performa piutang, realisasi penagihan, dan status proyek aktif.</p>
                </div>
                <div class="flex items-center gap-3">
                    <a href="#/invoices" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-primary-500/20 flex items-center gap-2 transition">
                        <i class="ri-add-line"></i>
                        <span>Buat Tagihan Baru</span>
                    </a>
                </div>
            </div>

            <!-- Action Board Pagi Hari (Executive Daily Brief Banner) -->
            <div id="dashboard-daily-brief-banner" class="bg-gradient-to-r from-amber-500/10 via-primary-500/10 to-indigo-500/10 dark:from-amber-950/30 dark:via-primary-950/30 dark:to-indigo-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-3xl p-5 sm:p-6 transition shadow-xs">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div class="flex items-start gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-amber-500/15 dark:bg-amber-400/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                            <i class="ri-sun-cloudy-line"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider">Executive Daily Brief</span>
                                <span id="dash-brief-date" class="text-xs text-slate-500 dark:text-slate-400 font-medium">Memuat agenda hari ini...</span>
                            </div>
                            <h3 id="dash-brief-title" class="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Memeriksa prioritas operasional & penagihan...</h3>
                            <p id="dash-brief-desc" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sistem sedang merangkum piutang jatuh tempo, milestone termin, dan SLA server untuk hari ini.</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 self-start lg:self-center shrink-0">
                        <button type="button" onclick="App.copyDailyBriefWhatsApp()" class="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs" title="Salin Ringkasan untuk WhatsApp">
                            <i class="ri-file-copy-line text-emerald-600"></i>
                            <span>Salin WA</span>
                        </button>
                        <button type="button" onclick="App.openDailyBriefModal()" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-primary-500/20 transition">
                            <i class="ri-layout-masonry-line"></i>
                            <span>Buka Action Board</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- KPI Cards Grid -->
            <div id="kpi-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div class="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Total Piutang Berjalan</span>
                        <div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl">
                            <i class="ri-hand-coin-line"></i>
                        </div>
                    </div>
                    <div id="kpi-piutang" class="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">Rp 0</div>
                    <div class="text-xs text-slate-400 mt-2">Seluruh tagihan belum lunas</div>
                </div>

                <div class="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Penerimaan Bulan Ini</span>
                        <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl">
                            <i class="ri-funds-box-line"></i>
                        </div>
                    </div>
                    <div id="kpi-bayar" class="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">Rp 0</div>
                    <div class="text-xs text-slate-400 mt-2">Total kas masuk bulan berjalan</div>
                </div>

                <div class="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Jatuh Tempo (Overdue)</span>
                        <div class="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center text-xl">
                            <i class="ri-alarm-warning-line"></i>
                        </div>
                    </div>
                    <div id="kpi-overdue" class="text-2xl font-extrabold font-mono text-rose-600 dark:text-rose-400">Rp 0</div>
                    <div id="kpi-overdue-count" class="text-xs text-rose-500 font-semibold mt-2">0 tagihan lewat tempo</div>
                </div>

                <div class="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Klien & Proyek</span>
                        <div class="w-10 h-10 rounded-2xl bg-primary-500/10 text-primary-600 flex items-center justify-center text-xl">
                            <i class="ri-building-line"></i>
                        </div>
                    </div>
                    <div id="kpi-clients" class="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">0 Klien</div>
                    <div id="kpi-projects" class="text-xs text-slate-400 mt-2">0 Proyek aktif</div>
                </div>
            </div>

            <!-- Widget Antrean Tindakan Hari Ini -->
            <div class="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-task-line text-primary-600"></i>
                            <span>Antrean Tindakan Hari Ini</span>
                        </h2>
                        <p class="text-xs text-slate-400">Item operasional yang menunggu verifikasi, balasan, BAST/termin, atau perpanjangan segera.</p>
                    </div>
                    <span id="action-queue-total-badge" class="self-start sm:self-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono font-bold">Memuat...</span>
                </div>
                <div id="action-queue-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="col-span-full py-6 text-center text-xs text-slate-400">Memeriksa antrean tindakan...</div>
                </div>
            </div>

            <!-- Two-Column Section: Chart & Urgent Invoices -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- 6-Month Chart Visualization -->
                <div class="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <h2 class="text-base font-bold text-slate-900 dark:text-white">Arus Penagihan vs Penerimaan (6 Bulan)</h2>
                            <p class="text-xs text-slate-400">Komparasi nilai faktur terbit dibanding realisasi kas diterima</p>
                        </div>
                        <div class="flex items-center gap-4 text-xs font-semibold">
                            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-primary-500"></span> Tagihan</span>
                            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-emerald-500"></span> Realisasi</span>
                        </div>
                    </div>
                    <div id="chart-container" class="h-64 flex items-end justify-between gap-4 pt-8"></div>
                </div>

                <!-- Urgent Overdue List -->
                <div class="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-base font-bold text-slate-900 dark:text-white">Tagihan Mendesak</h2>
                            <span class="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 rounded-full">Perlu Tindakan</span>
                        </div>
                        <div id="urgent-list" class="space-y-3">
                            <div class="text-xs text-slate-400 text-center py-8">Memuat data tagihan...</div>
                        </div>
                    </div>
                    <div class="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                        <a href="#/invoices?status=jatuh_tempo" class="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition">
                            <span>Lihat Semua Overdue</span>
                            <i class="ri-arrow-right-line"></i>
                        </a>
                    </div>
                </div>
            </div>

            <!-- Recent Activity Section -->
            <div class="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-base font-bold text-slate-900 dark:text-white">Aktivitas Sistem Terkini</h2>
                    <a href="#/audit" class="text-xs font-semibold text-primary-600 hover:text-primary-700">Lihat Audit Trail &rarr;</a>
                </div>
                <div id="recent-activity-list" class="divide-y divide-slate-100 dark:divide-slate-800">
                    <div class="text-xs text-slate-400 text-center py-6">Memuat log aktivitas...</div>
                </div>
            </div>
        </div>
    `;

    // Fetch Action Board Daily Brief
    const briefRes = await App.api('dashboard/daily_brief');
    if (briefRes && briefRes.success && briefRes.data) {
        const bd = briefRes.data;
        const dateEl = document.getElementById('dash-brief-date');
        const titleEl = document.getElementById('dash-brief-title');
        const descEl = document.getElementById('dash-brief-desc');

        if (dateEl) dateEl.textContent = bd.date_formatted;
        const total = bd.total_critical_items || 0;
        if (total === 0) {
            if (titleEl) titleEl.innerHTML = `🟢 Semua Agenda & Penagihan Terkendali Aman`;
            if (descEl) descEl.textContent = `Tidak ada tagihan yang melewati jatuh tempo, seluruh milestone dan server klien terpantau normal.`;
        } else {
            const nomStr = App.formatIDR(bd.total_nominal_mendesak);
            if (titleEl) titleEl.innerHTML = `Terdapat <b class="text-rose-600 dark:text-rose-400">${total} Agenda Prioritas Hari Ini</b> (${nomStr} Piutang Mendesak)`;
            const parts = [];
            if ((bd.invoices || []).length > 0) parts.push(`${bd.invoices.length} Faktur Overdue/Due`);
            if ((bd.milestones || []).length > 0) parts.push(`${bd.milestones.length} Termin Siap Ditagih`);
            if ((bd.maintenances || []).length > 0) parts.push(`${bd.maintenances.length} SLA Expired Segera`);
            if ((bd.incidents || []).length > 0) parts.push(`${bd.incidents.length} Insiden Server`);
            if (descEl) descEl.textContent = `Rincian: ${parts.join(' • ')}. Segera ambil tindakan penagihan atau perpanjangan.`;
        }
    }

    // Fetch and populate stats
    const statsRes = await App.api('dashboard/stats');
    if (statsRes && statsRes.success) {
        const d = statsRes.data;
        document.getElementById('kpi-piutang').textContent = App.formatIDR(d.total_piutang);
        document.getElementById('kpi-bayar').textContent = App.formatIDR(d.total_bayar_bulan_ini);
        document.getElementById('kpi-overdue').textContent = App.formatIDR(d.total_overdue);
        document.getElementById('kpi-overdue-count').textContent = `${d.count_overdue} tagihan melewati jatuh tempo`;
        document.getElementById('kpi-clients').textContent = `${d.total_klien_aktif} Klien`;
        document.getElementById('kpi-projects').textContent = `${d.total_proyek_aktif} Proyek Aktif`;
    }

    // Fetch chart data
    const chartRes = await App.api('dashboard/chart');
    if (chartRes && chartRes.success) {
        renderBarChart(chartRes.data);
    }

    // Fetch urgent list
    const urgentRes = await App.api('dashboard/urgent');
    if (urgentRes && urgentRes.success) {
        renderUrgentList(urgentRes.data);
    }

    // Fetch recent activity
    const actRes = await App.api('dashboard/recent_activity');
    if (actRes && actRes.success) {
        renderRecentActivity(actRes.data);
    }

    // Fetch Action Queue
    const queueRes = await App.api('dashboard/action_queue');
    if (queueRes && queueRes.success && queueRes.data) {
        renderActionQueue(queueRes.data);
    }
}

function renderActionQueue(q) {
    const grid = document.getElementById('action-queue-grid');
    const badgeEl = document.getElementById('action-queue-total-badge');
    if (!grid) return;

    const proofs = q.pending_proofs || [];
    const tickets = q.open_tickets || [];
    const projects = q.ready_projects || [];
    const domains = q.expiring_domains || [];
    const total = proofs.length + tickets.length + projects.length + domains.length;

    if (badgeEl) {
        badgeEl.textContent = total > 0 ? `${total} Perlu Tindakan` : 'Semua Aman';
        badgeEl.className = total > 0
            ? 'self-start sm:self-center px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-mono font-bold'
            : 'self-start sm:self-center px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-mono font-bold';
    }

    const renderBucket = (title, icon, toneCls, count, itemsHtml, emptyMsg, linkUrl, linkLabel) => `
        <div class="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex flex-col justify-between gap-3">
            <div class="space-y-2.5">
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <i class="${icon} ${toneCls} text-base"></i>
                        <span>${title}</span>
                    </div>
                    <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${count > 0 ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}">${count}</span>
                </div>
                <div class="space-y-1.5">
                    ${count === 0 ? `<div class="text-[11px] text-slate-400 py-2">${emptyMsg}</div>` : itemsHtml}
                </div>
            </div>
            <a href="${linkUrl}" class="text-[11px] font-semibold text-primary-600 hover:text-primary-700 flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                <span>${linkLabel}</span>
                <i class="ri-arrow-right-line"></i>
            </a>
        </div>
    `;

    const proofsHtml = proofs.slice(0, 3).map((x) => `
        <div class="text-[11px] leading-tight">
            <div class="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">${App.escapeHtml(x.nomor_invoice)}</div>
            <div class="text-slate-500 truncate">${App.escapeHtml(x.nama_perusahaan)} · ${App.formatIDR(x.sisa_tagihan)}</div>
        </div>
    `).join('');

    const ticketsHtml = tickets.slice(0, 3).map((t) => `
        <div class="text-[11px] leading-tight">
            <div class="font-semibold text-slate-800 dark:text-slate-200 truncate">${App.escapeHtml(t.nomor_tiket)} · ${App.escapeHtml(t.judul)}</div>
            <div class="text-slate-500 truncate">${App.escapeHtml(t.nama_perusahaan)} · <span class="uppercase font-bold">${App.escapeHtml(t.prioritas)}</span></div>
        </div>
    `).join('');

    const projectsHtml = projects.slice(0, 3).map((p) => {
        const reason = Number(p.bast_draft) > 0
            ? 'BAST menunggu TTD'
            : (Number(p.tasks_total) > 0 && Number(p.tasks_done) === Number(p.tasks_total) && Number(p.bast_signed) === 0 ? 'Siap buat BAST' : `${p.ms_unbilled} termin siap ditagih`);
        return `
            <div class="text-[11px] leading-tight">
                <div class="font-semibold text-slate-800 dark:text-slate-200 truncate">${App.escapeHtml(p.nama_project)}</div>
                <div class="text-slate-500 truncate">${App.escapeHtml(p.nama_perusahaan)} · ${reason}</div>
            </div>
        `;
    }).join('');

    const domainsHtml = domains.slice(0, 3).map((d) => {
        const sisa = Number(d.sisa_hari || 0);
        const sisaLbl = sisa < 0 ? `Lewat ${Math.abs(sisa)} hr` : `${sisa} hari lagi`;
        return `
            <div class="text-[11px] leading-tight">
                <div class="font-semibold text-slate-800 dark:text-slate-200 truncate">${App.escapeHtml(d.domain_name || d.nama_aset)}</div>
                <div class="text-slate-500 truncate">${App.escapeHtml(d.nama_perusahaan)} · <span class="text-rose-600 font-semibold">${sisaLbl}</span></div>
            </div>
        `;
    }).join('');

    grid.innerHTML = [
        renderBucket('Bukti Transfer', 'ri-bank-card-line', 'text-amber-600', proofs.length, proofsHtml, 'Tidak ada bukti transfer pending.', '#/invoices', 'Verifikasi di Faktur'),
        renderBucket('Tiket Gangguan', 'ri-customer-service-2-line', 'text-rose-600', tickets.length, ticketsHtml, 'Tidak ada tiket terbuka.', '#/tickets', 'Buka Tiket'),
        renderBucket('Proyek Siap BAST/Termin', 'ri-git-branch-line', 'text-indigo-600', projects.length, projectsHtml, 'Belum ada proyek siap BAST/termin.', '#/projects', 'Kelola Proyek'),
        renderBucket('Domain & SLA (≤14 Hr)', 'ri-shield-flash-line', 'text-emerald-600', domains.length, domainsHtml, 'Semua domain & SSL aman.', '#/maintenance', 'Pantau SLA')
    ].join('');
}

function renderBarChart(data) {
    const cont = document.getElementById('chart-container');
    if (!cont) return;

    if (!data || data.length === 0) {
        cont.innerHTML = `<div class="text-xs text-slate-400 m-auto">Belum ada data riwayat transaksi</div>`;
        return;
    }

    let maxVal = 1;
    data.forEach(d => {
        if (d.billed > maxVal) maxVal = d.billed;
        if (d.paid > maxVal) maxVal = d.paid;
    });

    let html = '';
    data.forEach(d => {
        const billedPct = Math.min(100, Math.max(8, (d.billed / maxVal) * 100));
        const paidPct = Math.min(100, Math.max(8, (d.paid / maxVal) * 100));

        html += `
            <div class="flex-1 flex flex-col items-center h-full justify-end group">
                <div class="w-full flex items-end justify-center gap-1.5 h-full pb-2">
                    <!-- Billed Bar -->
                    <div class="w-full max-w-[20px] bg-primary-500/80 group-hover:bg-primary-600 rounded-t-md transition-all relative"
                         style="height: ${billedPct}%"
                         title="Tagihan: ${App.formatIDR(d.billed)}">
                    </div>
                    <!-- Paid Bar -->
                    <div class="w-full max-w-[20px] bg-emerald-500/80 group-hover:bg-emerald-600 rounded-t-md transition-all relative"
                         style="height: ${paidPct}%"
                         title="Dibayar: ${App.formatIDR(d.paid)}">
                    </div>
                </div>
                <div class="text-[11px] font-semibold text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition">
                    ${d.label}
                </div>
            </div>
        `;
    });

    cont.innerHTML = html;
}

function renderUrgentList(items) {
    const cont = document.getElementById('urgent-list');
    if (!cont) return;

    if (!items || items.length === 0) {
        cont.innerHTML = `
            <div class="text-center py-8">
                <i class="ri-checkbox-circle-line text-emerald-500 text-3xl mb-1"></i>
                <div class="text-xs font-semibold text-slate-600 dark:text-slate-300">Semua Tagihan Tertib</div>
                <div class="text-[11px] text-slate-400">Tidak ada tagihan yang melewati jatuh tempo</div>
            </div>
        `;
        return;
    }

    cont.innerHTML = items.map(it => `
        <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div class="min-w-0 flex-1">
                <div class="text-xs font-bold text-slate-900 dark:text-white truncate">${it.nama_perusahaan}</div>
                <div class="text-[11px] font-mono text-slate-500">${it.nomor_invoice}</div>
                <div class="text-[10px] text-rose-500 font-semibold mt-0.5">Lewat ${it.hari_terlambat} hari</div>
            </div>
            <div class="text-right pl-3">
                <div class="text-xs font-bold font-mono text-slate-900 dark:text-white">${App.formatIDR(it.sisa_tagihan)}</div>
                <a href="#/invoices" class="text-[10px] font-semibold text-primary-600 hover:underline">Detail &rarr;</a>
            </div>
        </div>
    `).join('');
}

function renderRecentActivity(items) {
    const cont = document.getElementById('recent-activity-list');
    if (!cont) return;

    if (!items || items.length === 0) {
        cont.innerHTML = `<div class="text-xs text-slate-400 text-center py-4">Belum ada aktivitas tercatat</div>`;
        return;
    }

    cont.innerHTML = items.map(it => `
        <div class="py-3 flex items-center justify-between text-xs">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold">
                    ${it.user_nama.charAt(0)}
                </div>
                <div>
                    <span class="font-bold text-slate-900 dark:text-white">${it.user_nama}</span>
                    <span class="text-slate-500">melakukan aksi </span>
                    <span class="font-mono text-primary-600 dark:text-primary-400 font-semibold">${it.aksi}</span>
                    <span class="text-slate-500"> pada modul </span>
                    <span class="font-semibold text-slate-700 dark:text-slate-300">${it.tabel} #${it.record_id || '-'}</span>
                </div>
            </div>
            <div class="text-[11px] text-slate-400 font-mono">
                ${new Date(it.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    `).join('');
}
