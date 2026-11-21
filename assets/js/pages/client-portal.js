// assets/js/pages/client-portal.js - Portal Eksekutif Terpadu Klien (Extranet Hub)
import { App } from '../app.js';

let portalToken = '';
let portalData = null;

export async function init(container) {
    let token = '';
    const hash = window.location.hash || '';
    if (hash.includes('?')) {
        const urlParams = new URLSearchParams(hash.split('?')[1]);
        token = urlParams.get('token') || '';
    }
    if (!token && hash.split('/')[2]) {
        token = hash.split('/')[2].split('?')[0];
    }
    portalToken = token;

    container.innerHTML = `
        <div class="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-16">
            <div id="portal-loading" class="text-center py-24 space-y-4">
                <i class="ri-loader-4-line text-4xl text-primary-600 animate-spin inline-block"></i>
                <div class="text-sm font-semibold text-slate-500">Memuat Portal Layanan Klien...</div>
            </div>
            <div id="portal-content" class="hidden space-y-8"></div>
        </div>
    `;

    if (!token) {
        document.getElementById('portal-loading').innerHTML = `
            <div class="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div class="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl font-bold">
                    <i class="ri-shield-keyhole-line"></i>
                </div>
                <h2 class="text-lg font-bold text-slate-900 dark:text-white">Tautan Akses Klien Diperlukan</h2>
                <p class="text-xs text-slate-500">Silakan gunakan tautan portal khusus yang dikirimkan oleh tim CRUDWorks kepada perusahaan Anda.</p>
            </div>
        `;
        return;
    }

    await loadAndRenderPortal();
}

async function loadAndRenderPortal(activeTab = 'projects') {
    const res = await App.api(`client-portal?token=${encodeURIComponent(portalToken)}`);
    const loadingEl = document.getElementById('portal-loading');
    const contentEl = document.getElementById('portal-content');

    if (!res || !res.success) {
        loadingEl.classList.remove('hidden');
        contentEl.classList.add('hidden');
        loadingEl.innerHTML = `
            <div class="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div class="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl font-bold">
                    <i class="ri-close-circle-line"></i>
                </div>
                <h2 class="text-lg font-bold text-slate-900 dark:text-white">Akses Portal Tidak Ditemukan</h2>
                <p class="text-xs text-slate-500">${res?.message || 'Tautan ini tidak valid atau telah diperbarui.'}</p>
            </div>
        `;
        return;
    }

    loadingEl.classList.add('hidden');
    contentEl.classList.remove('hidden');

    portalData = res.data;
    const {
        client,
        projects = [],
        basts = [],
        invoices = [],
        quotations = [],
        maintenance = [],
        company: c = {},
        payment_methods: bankAccounts = [],
        kpi = {}
    } = portalData;

    const pendingBastCount = basts.filter(b => b.status === 'draft').length;

    contentEl.innerHTML = `
        <!-- Top Brand Header -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div class="flex items-center gap-4">
                <img src="assets/images/logo.png" alt="CRUDWorks Logo" class="h-10 w-auto object-contain" />
                <div class="border-l border-slate-200 dark:border-slate-700 pl-4">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-primary-600">Portal Layanan Terpadu Klien</span>
                    <h1 class="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">${App.escapeHtml(client.nama_perusahaan)}</h1>
                    <div class="text-xs text-slate-500">UP: <b>${App.escapeHtml(client.penanggung_jawab || '-')}</b> · Kode: <span class="font-mono">${App.escapeHtml(client.kode_klien)}</span></div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                ${pendingBastCount > 0 ? `
                    <span class="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <i class="ri-quill-pen-line"></i> ${pendingBastCount} BAST Menunggu TTD
                    </span>
                ` : ''}
                <button type="button" onclick="window.location.reload()" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition">
                    <i class="ri-refresh-line"></i> Segarkan Data
                </button>
            </div>
        </div>

        <!-- Metric Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Proyek & BAST</div>
                <div class="text-lg font-black font-mono text-primary-600 dark:text-primary-400 mt-1">${projects.length} Proyek · ${basts.length} BAST</div>
            </div>
            <div class="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Investasi Terbayar</div>
                <div class="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">${App.formatIDR(kpi.total_paid || 0)}</div>
            </div>
            <div class="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tagihan Belum Lunas</div>
                <div class="text-lg font-black font-mono ${(kpi.total_unpaid || 0) > 0 ? 'text-rose-600' : 'text-slate-400'} mt-1">${App.formatIDR(kpi.total_unpaid || 0)}</div>
            </div>
            <div class="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Aset Domain & SLA</div>
                <div class="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">${kpi.total_assets || 0} Layanan</div>
            </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button type="button" class="portal-tab px-4 py-2 rounded-xl font-bold text-xs transition ${activeTab === 'projects' ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-tab="projects">
                <i class="ri-kanban-view mr-1"></i> Progres Proyek & BAST (${projects.length})
            </button>
            <button type="button" class="portal-tab px-4 py-2 rounded-xl font-bold text-xs transition ${activeTab === 'invoices' ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-tab="invoices">
                <i class="ri-file-list-3-line mr-1"></i> Faktur Tagihan (${invoices.length})
            </button>
            <button type="button" class="portal-tab px-4 py-2 rounded-xl font-bold text-xs transition ${activeTab === 'quotations' ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-tab="quotations">
                <i class="ri-file-paper-2-line mr-1"></i> Proposal & Penawaran (${quotations.length})
            </button>
            <button type="button" class="portal-tab px-4 py-2 rounded-xl font-bold text-xs transition ${activeTab === 'maintenance' ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-tab="maintenance">
                <i class="ri-shield-check-line mr-1"></i> SLA & Domain Hosting (${maintenance.length})
            </button>
        </div>

        <!-- Tab 1: Live Project Tracker & BAST Digital -->
        <div id="panel-projects" class="portal-panel ${activeTab === 'projects' ? '' : 'hidden'} space-y-6">
            <!-- Live Project Tracker -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-5">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-pulse-line text-primary-600"></i>
                            <span>Live Project Tracker & Progres Milestone</span>
                        </h3>
                        <p class="text-[11px] text-slate-500 mt-0.5">Pantau perkembangan pengerjaan sistem dan pencapaian termin secara real-time.</p>
                    </div>
                </div>

                ${projects.length === 0 ? `
                    <div class="py-10 text-center text-xs text-slate-400">Belum ada proyek aktif yang terdaftar untuk perusahaan Anda.</div>
                ` : `
                    <div class="space-y-5">
                        ${projects.map(p => {
                            const st = p.task_stats || { total: 0, done: 0, review: 0, in_progress: 0, todo: 0 };
                            const pct = Number(p.progress_pct || 0);
                            const milestones = p.milestones || [];
                            return `
                                <div class="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 space-y-4">
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <div class="flex items-center gap-2 flex-wrap">
                                                <span class="font-mono text-[11px] font-bold text-primary-600 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-md">${App.escapeHtml(p.kode_project)}</span>
                                                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${p.status === 'selesai' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}">${App.escapeHtml(p.status)}</span>
                                                ${p.last_health_status === 'online' ? `
                                                    <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-mono font-bold">
                                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online ${p.last_latency_ms ? `(${p.last_latency_ms}ms)` : ''}
                                                    </span>
                                                ` : ''}
                                            </div>
                                            <h4 class="text-base font-extrabold text-slate-900 dark:text-white mt-1.5">${App.escapeHtml(p.nama_project)}</h4>
                                            ${p.app_url ? `
                                                <a href="${App.escapeHtml(p.app_url)}" target="_blank" class="text-xs text-primary-600 hover:underline inline-flex items-center gap-1 font-mono mt-0.5">
                                                    <i class="ri-global-line"></i> ${App.escapeHtml(p.app_url)} <i class="ri-external-link-line text-[10px]"></i>
                                                </a>
                                            ` : ''}
                                        </div>

                                        <div class="sm:text-right shrink-0">
                                            <div class="text-2xl font-black font-mono ${pct >= 100 ? 'text-emerald-600' : 'text-primary-600'}">${pct}%</div>
                                            <div class="text-[11px] text-slate-500 font-mono">${st.done}/${st.total} Tugas Selesai</div>
                                        </div>
                                    </div>

                                    <!-- Overall Progress Bar -->
                                    <div class="space-y-2">
                                        <div class="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div class="h-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-primary-600'} transition-all duration-500 rounded-full" style="width: ${pct}%"></div>
                                        </div>
                                        <div class="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-500">
                                            <span><i class="ri-inbox-line"></i> Antrean: <b>${st.todo}</b></span>
                                            <span><i class="ri-loader-4-line text-indigo-500"></i> Dikerjakan: <b>${st.in_progress}</b></span>
                                            <span><i class="ri-eye-line text-amber-500"></i> Uji Coba / UAT: <b>${st.review}</b></span>
                                            <span><i class="ri-checkbox-circle-line text-emerald-500"></i> Selesai: <b>${st.done}</b></span>
                                        </div>
                                    </div>

                                    <!-- Milestones Breakdown -->
                                    ${milestones.length > 0 ? `
                                        <div class="pt-3 border-t border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
                                            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rincian Tahapan & Termin</div>
                                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                ${milestones.map((m, idx) => {
                                                    const mPct = Number(m.progress_pct || 0);
                                                    const mst = m.task_stats || { total: 0, done: 0 };
                                                    return `
                                                        <div class="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
                                                            <div class="flex items-center justify-between gap-2">
                                                                <span class="font-bold text-slate-800 dark:text-slate-200 truncate">
                                                                    ${idx + 1}. ${App.escapeHtml(m.nama_milestone)}
                                                                </span>
                                                                <span class="font-mono font-bold text-[11px] ${mPct >= 100 ? 'text-emerald-600' : 'text-primary-600'}">${mPct}%</span>
                                                            </div>
                                                            <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                <div class="h-full ${mPct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}" style="width: ${mPct}%"></div>
                                                            </div>
                                                            <div class="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                                                                <span>Porsi ${m.persentase}% · ${mst.done}/${mst.total} tugas</span>
                                                                <span class="uppercase font-bold ${m.status === 'lunas' ? 'text-emerald-600' : (m.status === 'ditagih' ? 'text-amber-600' : 'text-slate-400')}">${m.status}</span>
                                                            </div>
                                                        </div>
                                                    `;
                                                }).join('')}
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>

            <!-- Berita Acara Serah Terima (BAST) Digital -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-file-shield-2-line text-emerald-600"></i>
                            <span>Berita Acara Serah Terima (BAST) & Pengesahan UAT</span>
                        </h3>
                        <p class="text-[11px] text-slate-500 mt-0.5">Tinjau hasil pekerjaan yang diserahkan dan bubuhkan tanda tangan digital Anda untuk pengesahan resmi.</p>
                    </div>
                </div>

                ${basts.length === 0 ? `
                    <div class="py-8 text-center text-xs text-slate-400">Belum ada dokumen Berita Acara Serah Terima (BAST) yang diterbitkan.</div>
                ` : `
                    <div class="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                        ${basts.map(b => {
                            const isSigned = b.status === 'ditandatangani';
                            return `
                                <div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                    <div class="space-y-1.5">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <span class="font-mono font-bold text-sm text-slate-900 dark:text-white">${App.escapeHtml(b.nomor_bast)}</span>
                                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isSigned ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800'}">
                                                <i class="${isSigned ? 'ri-shield-check-line' : 'ri-quill-pen-line'}"></i> ${isSigned ? 'Sah & Ditandatangani' : 'Menunggu Pengesahan Anda'}
                                            </span>
                                            ${b.nama_milestone ? `
                                                <span class="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                                                    ${App.escapeHtml(b.nama_milestone)}
                                                </span>
                                            ` : ''}
                                        </div>
                                        <div class="font-bold text-sm text-slate-800 dark:text-slate-200">${App.escapeHtml(b.judul_pekerjaan)}</div>
                                        <div class="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                                            <span><i class="ri-folder-line"></i> Proyek: <b>${App.escapeHtml(b.nama_project)}</b></span>
                                            <span><i class="ri-calendar-line"></i> Tanggal: <b>${App.formatDate(b.tanggal_bast)}</b></span>
                                            ${isSigned && b.signed_at ? `<span class="text-emerald-600 font-semibold"><i class="ri-check-double-line"></i> Disahkan oleh ${App.escapeHtml(b.pihak_kedua_nama)} (${App.formatDate(b.signed_at)})</span>` : ''}
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-2 shrink-0">
                                        <button type="button" onclick="window.previewPortalBastPdf(${b.id})" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition">
                                            <i class="ri-file-pdf-2-line text-rose-500"></i> Lihat PDF
                                        </button>
                                        ${!isSigned ? `
                                            <button type="button" onclick="window.openPortalBastSignModal(${b.id})" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition">
                                                <i class="ri-quill-pen-line"></i> Uji & Tandatangani
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        </div>

        <!-- Tab 2: Invoices Panel -->
        <div id="panel-invoices" class="portal-panel ${activeTab === 'invoices' ? '' : 'hidden'} bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Daftar Faktur Tagihan & Pembayaran</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-xs text-left">
                    <thead class="bg-slate-50 dark:bg-slate-800 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th class="p-3">Nomor Faktur</th>
                            <th class="p-3">Tanggal</th>
                            <th class="p-3">Jatuh Tempo</th>
                            <th class="p-3 text-right">Total Tagihan</th>
                            <th class="p-3 text-right">Sisa Kewajiban</th>
                            <th class="p-3 text-center">Status</th>
                            <th class="p-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        ${invoices.length === 0 ? `
                            <tr><td colspan="7" class="py-8 text-center text-slate-400">Belum ada faktur tagihan untuk perusahaan Anda.</td></tr>
                        ` : invoices.map(inv => `
                            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td class="p-3 font-mono font-bold text-slate-900 dark:text-white">${inv.nomor_invoice}</td>
                                <td class="p-3 font-mono text-slate-500">${App.formatDate(inv.tanggal_invoice)}</td>
                                <td class="p-3 font-mono text-rose-600">${App.formatDate(inv.tanggal_jatuh_tempo)}</td>
                                <td class="p-3 text-right font-mono font-bold">${App.formatIDR(inv.total_tagihan)}</td>
                                <td class="p-3 text-right font-mono font-bold ${Number(inv.sisa_tagihan) > 0 ? 'text-rose-600' : 'text-emerald-600'}">
                                    ${App.formatIDR(inv.sisa_tagihan)}
                                </td>
                                <td class="p-3 text-center">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${inv.status === 'lunas' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">
                                        ${inv.status}
                                    </span>
                                </td>
                                <td class="p-3 text-right">
                                    <a href="#/public-invoice?token=${encodeURIComponent(inv.public_token || inv.nomor_invoice)}" class="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg text-xs inline-flex items-center gap-1 transition">
                                        <span>Rincian & Bayar</span>
                                        <i class="ri-arrow-right-line text-[11px]"></i>
                                    </a>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Tab 3: Quotations Panel -->
        <div id="panel-quotations" class="portal-panel ${activeTab === 'quotations' ? '' : 'hidden'} bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Surat Penawaran & Proposal Investasi</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-xs text-left">
                    <thead class="bg-slate-50 dark:bg-slate-800 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th class="p-3">Nomor Penawaran</th>
                            <th class="p-3">Objek Proyek</th>
                            <th class="p-3">Tanggal</th>
                            <th class="p-3">Berlaku Hingga</th>
                            <th class="p-3 text-right">Nilai Investasi</th>
                            <th class="p-3 text-center">Persetujuan</th>
                            <th class="p-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        ${quotations.length === 0 ? `
                            <tr><td colspan="7" class="py-8 text-center text-slate-400">Belum ada dokumen penawaran harga.</td></tr>
                        ` : quotations.map(q => `
                            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td class="p-3 font-mono font-bold text-slate-900 dark:text-white">${q.nomor_penawaran}</td>
                                <td class="p-3 font-medium text-primary-600">${q.nama_project || 'Pengembangan Sistem'}</td>
                                <td class="p-3 font-mono text-slate-500">${App.formatDate(q.tanggal_penawaran)}</td>
                                <td class="p-3 font-mono text-slate-500">${App.formatDate(q.berlaku_hingga)}</td>
                                <td class="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">${App.formatIDR(q.total_penawaran)}</td>
                                <td class="p-3 text-center">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${q.status === 'disetujui' || q.status === 'dikonversi' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}">
                                        ${q.status === 'disetujui' || q.status === 'dikonversi' ? 'Disetujui' : 'Menunggu E-Sign'}
                                    </span>
                                </td>
                                <td class="p-3 text-right">
                                    <a href="#/public-quotation?token=${encodeURIComponent(q.public_token || q.nomor_penawaran)}" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs inline-flex items-center gap-1 transition">
                                        <span>Buka Dokumen</span>
                                        <i class="ri-external-link-line text-[11px]"></i>
                                    </a>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Tab 4: Maintenance & SLA Panel -->
        <div id="panel-maintenance" class="portal-panel ${activeTab === 'maintenance' ? '' : 'hidden'} bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Pemantauan Layanan SLA, Domain & Hosting</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-xs text-left">
                    <thead class="bg-slate-50 dark:bg-slate-800 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th class="p-3">Nama Aset / Layanan</th>
                            <th class="p-3">Domain / Host</th>
                            <th class="p-3 text-center">Status Uptime & SSL</th>
                            <th class="p-3">Siklus</th>
                            <th class="p-3">Berakhir Pada</th>
                            <th class="p-3 text-center">Sisa Masa Aktif</th>
                            <th class="p-3 text-right">Biaya Perpanjangan</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        ${maintenance.length === 0 ? `
                            <tr><td colspan="7" class="py-8 text-center text-slate-400">Tidak ada domain atau SLA terdaftar.</td></tr>
                        ` : maintenance.map(m => `
                            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td class="p-3 font-bold text-slate-900 dark:text-white">${m.nama_aset}</td>
                                <td class="p-3 font-mono text-primary-600">${m.domain_name || '-'}</td>
                                <td class="p-3 text-center">
                                    ${m.uptime_status === 'online' ? `
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-mono inline-flex items-center gap-1">
                                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> ONLINE (${m.response_time_ms || 0}ms)
                                        </span>
                                    ` : (m.uptime_status === 'down' ? `
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 font-mono">DOWN</span>
                                    ` : `<span class="text-[10px] text-slate-400 font-mono">Aktif</span>`)}
                                    ${m.ssl_days_left !== null && m.ssl_days_left !== undefined ? `
                                        <div class="text-[10px] text-slate-400 font-mono mt-0.5"><i class="ri-shield-check-line text-emerald-500"></i> SSL: ${m.ssl_days_left} hari</div>
                                    ` : ''}
                                </td>
                                <td class="p-3 uppercase text-[10px] text-slate-500">${m.siklus}</td>
                                <td class="p-3 font-mono text-slate-700 dark:text-slate-300">${App.formatDate(m.tanggal_berakhir)}</td>
                                <td class="p-3 text-center">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${m.sisa_hari <= 30 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}">
                                        ${m.sisa_hari > 0 ? m.sisa_hari + ' Hari Lagi' : 'Kedaluwarsa'}
                                    </span>
                                </td>
                                <td class="p-3 text-right font-mono font-bold">${App.formatIDR(m.biaya_perpanjangan)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Official Bank Accounts Footer -->
        <div class="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div class="text-xs font-bold uppercase tracking-wider text-slate-500">Rekening Resmi Pembayaran ${c.company_name || 'CRUDWorks Media Tama'}</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${bankAccounts.map(b => `
                    <div class="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div>
                            <div class="font-bold text-slate-900 dark:text-white">${b.nama_bank || b.nama_metode}</div>
                            <div class="text-slate-400 text-[11px]">a.n ${b.atas_nama}</div>
                        </div>
                        <div class="text-right font-mono font-extrabold text-primary-600">
                            ${b.nomor_rekening}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Tab Switching
    document.querySelectorAll('.portal-tab').forEach(b => {
        b.addEventListener('click', () => {
            const target = b.getAttribute('data-tab');
            document.querySelectorAll('.portal-tab').forEach(x => {
                x.className = 'portal-tab px-4 py-2 rounded-xl font-bold text-xs transition text-slate-500 hover:text-slate-900 dark:hover:text-white';
            });
            b.className = 'portal-tab px-4 py-2 rounded-xl font-bold text-xs transition bg-primary-600 text-white shadow-xs';

            document.querySelectorAll('.portal-panel').forEach(p => p.classList.add('hidden'));
            const p = document.getElementById('panel-' + target);
            if (p) p.classList.remove('hidden');
        });
    });
}

window.previewPortalBastPdf = async (bastId) => {
    const bast = portalData?.basts?.find(b => Number(b.id) === Number(bastId));
    if (!bast) return;
    try {
        const pdfRes = await App.generateBastPdf({ ...bast, company: portalData?.company || {} }, 'bloburl');
        if (pdfRes?.blobUrl || pdfRes?.url) {
            App.openPdfModal({
                title: `Berita Acara Serah Terima — ${bast.nomor_bast}`,
                filename: pdfRes.filename,
                blobUrl: pdfRes.blobUrl || pdfRes.url
            });
        }
    } catch (err) {
        App.toast(err?.message || 'Gagal membuka PDF BAST', 'error');
    }
};

window.openPortalBastSignModal = (bastId) => {
    const bast = portalData?.basts?.find(b => Number(b.id) === Number(bastId));
    if (!bast) return;

    let modal = document.getElementById('portal-bast-sign-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'portal-bast-sign-modal';
        modal.className = 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4';
        document.body.appendChild(modal);
    }

    const deliverables = String(bast.deskripsi_hasil || '').split('\n').map(l => l.trim()).filter(Boolean);

    modal.innerHTML = `
        <div class="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-fadeIn max-h-[92vh] overflow-y-auto space-y-5">
            <div class="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Pengesahan UAT & BAST Digital</span>
                    <h3 class="text-lg font-black text-slate-900 dark:text-white mt-0.5">${App.escapeHtml(bast.nomor_bast)}</h3>
                    <p class="text-xs text-slate-500">${App.escapeHtml(bast.judul_pekerjaan)}</p>
                </div>
                <button type="button" onclick="document.getElementById('portal-bast-sign-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1">
                    <i class="ri-close-line text-2xl"></i>
                </button>
            </div>

            <!-- Deliverables Checklist -->
            <div class="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Daftar Hasil Pekerjaan yang Diserahkan:</div>
                <ul class="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    ${deliverables.map(d => `
                        <li class="flex items-start gap-2">
                            <i class="ri-checkbox-circle-fill text-emerald-500 mt-0.5 shrink-0"></i>
                            <span>${App.escapeHtml(d.replace(/^([•\-\*]|\d+\.)\s+/, ''))}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <form id="form-portal-sign-bast" class="space-y-4 text-xs">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Nama Penandatangan *</label>
                        <input type="text" id="bast-sign-name" required value="${App.escapeHtml(bast.pihak_kedua_nama || portalData?.client?.penanggung_jawab || '')}"
                               class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Jabatan *</label>
                        <input type="text" id="bast-sign-pos" required value="${App.escapeHtml(bast.pihak_kedua_jabatan || 'Penanggung Jawab (PIC)')}"
                               class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                    </div>
                </div>

                <!-- Signature Pad -->
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="font-bold uppercase text-slate-600 dark:text-slate-400">Bubuhkan Tanda Tangan Anda *</label>
                        <button type="button" id="btn-clear-bast-sig" class="text-[11px] font-bold text-rose-500 hover:text-rose-700">
                            <i class="ri-eraser-line"></i> Bersihkan Kanvas
                        </button>
                    </div>
                    <div class="relative bg-white rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden touch-none h-40">
                        <canvas id="bast-sig-canvas" class="w-full h-full cursor-crosshair block"></canvas>
                        <div id="bast-sig-hint" class="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-slate-400">
                            Tanda tangan di sini menggunakan mouse atau sentuhan jari
                        </div>
                    </div>
                </div>

                <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onclick="document.getElementById('portal-bast-sign-modal').classList.add('hidden')" class="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-semibold">
                        Batal
                    </button>
                    <button type="submit" id="btn-submit-bast-sign" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition">
                        <i class="ri-shield-check-line"></i> Sahkan & Tandatangani BAST
                    </button>
                </div>
            </form>
        </div>
    `;

    modal.classList.remove('hidden');
    _initBastSignaturePad(bastId);
};

function _initBastSignaturePad(bastId) {
    const canvas = document.getElementById('bast-sig-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const hint = document.getElementById('bast-sig-hint');
    let isDrawing = false;
    let hasDrawn = false;

    const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width || 460;
        canvas.height = rect.height || 160;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };
    requestAnimationFrame(resizeCanvas);

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDraw = (e) => {
        if (e.cancelable) e.preventDefault();
        isDrawing = true;
        hasDrawn = true;
        if (hint) hint.classList.add('hidden');
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        if (e.cancelable) e.preventDefault();
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const stopDraw = () => {
        if (!isDrawing) return;
        isDrawing = false;
        ctx.closePath();
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDraw);

    document.getElementById('btn-clear-bast-sig').onclick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasDrawn = false;
        if (hint) hint.classList.remove('hidden');
    };

    document.getElementById('form-portal-sign-bast').onsubmit = async (e) => {
        e.preventDefault();
        if (!hasDrawn) {
            App.toast('Harap bubuhkan tanda tangan Anda pada kotak yang disediakan', 'warning');
            return;
        }
        const btn = document.getElementById('btn-submit-bast-sign');
        btn.disabled = true;
        btn.innerHTML = `<i class="ri-loader-4-line animate-spin"></i> Menyimpan Pengesahan...`;

        const res = await App.api(`client-portal?token=${encodeURIComponent(portalToken)}&action=sign-bast`, {
            method: 'POST',
            body: {
                bast_id: bastId,
                signed_by_name: document.getElementById('bast-sign-name').value.trim(),
                signed_by_position: document.getElementById('bast-sign-pos').value.trim(),
                signature_data: canvas.toDataURL('image/png')
            }
        });

        btn.disabled = false;
        btn.innerHTML = `<i class="ri-shield-check-line"></i> Sahkan & Tandatangani BAST`;

        if (res && res.success) {
            App.toast(res.message, 'success');
            document.getElementById('portal-bast-sign-modal')?.classList.add('hidden');
            await loadAndRenderPortal('projects');
        }
    };
}
