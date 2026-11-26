// assets/js/pages/public-status.js — Status Page Layanan Publik (Tanpa Login)
import { App } from '../app.js';

let refreshTimer = null;

export async function init(container) {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }

    const params = new URLSearchParams((window.location.hash.split('?')[1] || ''));
    const clientCode = params.get('client') || '';

    container.innerHTML = `
        <div class="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 sm:py-14 px-5 sm:px-8">
            <div class="max-w-5xl mx-auto animate-fadeIn">
                <div id="pub-status-root" class="space-y-7">
                    <div class="p-12 text-center text-xs text-slate-400">
                        <i class="ri-loader-4-line text-2xl animate-spin inline-block mb-2"></i>
                        <div>Memeriksa status layanan terkini...</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const loadStatus = async () => {
        const ep = clientCode ? `public-status?client=${encodeURIComponent(clientCode)}` : 'public-status';
        const res = await App.api(ep, { cache: false, silent: true });
        const root = document.getElementById('pub-status-root');
        if (!root) return;
        if (!res?.success || !res.data) {
            root.innerHTML = `<div class="p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center text-xs text-rose-500">Gagal memuat status layanan.</div>`;
            return;
        }

        const { company, overall_status, summary, services, checked_at } = res.data;
        const compName = company?.company_name || company?.app_name || 'CRUDWorks ERP';

        const bannerCfg = overall_status === 'outage'
            ? { cls: 'bg-rose-600 text-white', icon: 'ri-error-warning-fill', title: 'Sebagian Layanan Mengalami Gangguan', sub: `${summary.down} layanan sedang down.` }
            : (overall_status === 'degraded'
                ? { cls: 'bg-amber-500 text-white', icon: 'ri-alert-fill', title: 'Performa Sebagian Layanan Menurun', sub: `${summary.warning} layanan dalam status peringatan.` }
                : { cls: 'bg-emerald-600 text-white', icon: 'ri-checkbox-circle-fill', title: 'Semua Sistem Berjalan Normal', sub: 'Seluruh layanan aktif merespons dengan baik.' });

        root.innerHTML = `
            <!-- Brand & Overall Status -->
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div class="text-xs font-extrabold uppercase tracking-wider text-slate-400">${App.escapeHtml(compName)}</div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Status Layanan Publik</h1>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" id="btn-pub-status-refresh" class="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 inline-flex items-center gap-1.5 shadow-2xs">
                        <i class="ri-refresh-line"></i><span>Segarkan</span>
                    </button>
                </div>
            </div>

            <div class="p-6 sm:p-7 rounded-3xl ${bannerCfg.cls} shadow-lg flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <i class="${bannerCfg.icon} text-3xl shrink-0"></i>
                    <div>
                        <div class="text-base sm:text-lg font-extrabold">${bannerCfg.title}</div>
                        <div class="text-xs opacity-90 mt-0.5">${bannerCfg.sub}</div>
                    </div>
                </div>
                <div class="text-[11px] font-mono opacity-90">
                    Diperbarui: ${App.escapeHtml(checked_at)}
                </div>
            </div>

            <!-- Summary KPI -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div class="text-[10px] font-bold uppercase text-slate-400">Total Layanan</div>
                    <div class="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1.5">${summary.total}</div>
                </div>
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div class="text-[10px] font-bold uppercase text-slate-400">Online</div>
                    <div class="text-xl font-extrabold font-mono text-emerald-600 mt-1.5">${summary.online}</div>
                </div>
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div class="text-[10px] font-bold uppercase text-slate-400">Gangguan / Peringatan</div>
                    <div class="text-xl font-extrabold font-mono ${(summary.down + summary.warning) > 0 ? 'text-rose-600' : 'text-slate-400'} mt-1.5">${summary.down + summary.warning}</div>
                </div>
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div class="text-[10px] font-bold uppercase text-slate-400">Rata-Rata Latensi</div>
                    <div class="text-xl font-extrabold font-mono text-indigo-600 mt-1.5">${summary.avg_response_ms} ms</div>
                </div>
            </div>

            <!-- Service List -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
                ${services.length ? services.map(s => {
                    const stBadge = s.uptime_status === 'online'
                        ? '<span class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">OPERASIONAL</span>'
                        : (s.uptime_status === 'down'
                            ? '<span class="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">GANGGUAN (DOWN)</span>'
                            : (s.uptime_status === 'warning'
                                ? '<span class="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">PERINGATAN</span>'
                                : '<span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">BELUM DICEK</span>'));

                    const bars = [];
                    const hist = s.history || [];
                    for (let i = 0; i < 24; i++) {
                        const h = hist[i];
                        const barColor = !h ? 'bg-slate-200 dark:bg-slate-800'
                            : (h.uptime_status === 'online' ? 'bg-emerald-500' : (h.uptime_status === 'warning' ? 'bg-amber-400' : 'bg-rose-500'));
                        const tip = h ? `${h.checked_at} · ${h.uptime_status.toUpperCase()} (${h.response_time_ms || '-'} ms)` : 'Belum ada log';
                        bars.push(`<span class="flex-1 h-6 rounded-sm ${barColor}" title="${App.escapeHtml(tip)}"></span>`);
                    }

                    return `
                        <div class="p-5 space-y-3">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="font-bold text-sm text-slate-900 dark:text-white">${App.escapeHtml(s.nama_aset)}</span>
                                        ${s.domain_name ? `<span class="font-mono text-xs text-slate-400">${App.escapeHtml(s.domain_name)}</span>` : ''}
                                    </div>
                                    <div class="text-[11px] text-slate-500 flex flex-wrap items-center gap-3 mt-0.5 font-mono">
                                        ${s.response_time_ms ? `<span>Latensi: <b>${s.response_time_ms} ms</b></span>` : ''}
                                        ${s.ssl_days_left !== null && s.ssl_days_left !== undefined ? `<span>SSL: <b class="${Number(s.ssl_days_left) <= 14 ? 'text-amber-600' : 'text-emerald-600'}">${s.ssl_days_left} hari</b></span>` : ''}
                                        ${s.uptime_pct !== null ? `<span>Uptime: <b>${s.uptime_pct}%</b></span>` : ''}
                                    </div>
                                </div>
                                ${stBadge}
                            </div>
                            <div class="flex items-center gap-1" aria-label="Riwayat Uptime 24 Pemeriksaan Terakhir">
                                ${bars.join('')}
                            </div>
                        </div>
                    `;
                }).join('') : '<div class="p-10 text-center text-xs text-slate-400">Belum ada layanan yang dipantau.</div>'}
            </div>

            <div class="text-center text-[11px] text-slate-400">
                Pemantauan otomatis setiap 60 detik · Disediakan oleh ${App.escapeHtml(compName)}
            </div>
        `;

        document.getElementById('btn-pub-status-refresh')?.addEventListener('click', loadStatus);
    };

    await loadStatus();
    refreshTimer = setInterval(() => {
        if (!document.getElementById('pub-status-root')) {
            clearInterval(refreshTimer);
            refreshTimer = null;
            return;
        }
        loadStatus();
    }, 60000);
}
