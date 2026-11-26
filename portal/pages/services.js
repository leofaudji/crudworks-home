// portal/pages/services.js — Layanan yang Digunakan, Status Real-Time & Brankas Kredensial
import { esc, money, fdate, badge, sectionTitle, panel, empty, api, toast } from '../ctx.js';

export function renderServices(d) {
    const projects = d.projects || [];
    const activeServices = d.active_services || [];
    const maintenance = d.maintenance || [];
    const credentials = d.credentials || [];
    const kb = d.knowledge_base || [];

    const liveApps = projects.filter((p) => p.app_url || p.last_health_status);
    const liveHtml = liveApps.length === 0 ? '' : `
        <div class="space-y-3">
            ${sectionTitle('Status Aplikasi & Server', `<a href="../#/status" target="_blank" rel="noopener" class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-primary-600 inline-flex items-center gap-1.5"><i class="ri-pulse-line"></i><span>Status Server Live</span><i class="ri-external-link-line text-[11px]"></i></a>`)}
            ${panel(`<div class="divide-y divide-slate-200 dark:divide-slate-800">
                ${liveApps.map((p) => {
                    const hs = p.last_health_status || 'unknown';
                    const stBadge = hs === 'online'
                        ? badge('Online', 'green')
                        : (hs === 'offline' ? badge('Offline', 'red') : (hs === 'degraded' ? badge('Melambat', 'amber') : badge('Terpantau', 'slate')));
                    return `
                        <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div class="min-w-0">
                                <div class="text-sm font-bold text-slate-900 dark:text-white truncate">${esc(p.nama_project)}</div>
                                ${p.app_url ? `<a href="${esc(p.app_url)}" target="_blank" rel="noopener" class="text-xs font-mono text-primary-600 hover:underline break-all">${esc(p.app_url)}</a>` : ''}
                            </div>
                            <div class="flex items-center gap-3 shrink-0 text-xs font-mono tabular-nums text-slate-500">
                                ${p.last_latency_ms ? `<span>${esc(p.last_latency_ms)} ms</span>` : ''}
                                ${p.last_ssl_days !== null && p.last_ssl_days !== undefined ? `<span>SSL ${esc(p.last_ssl_days)}h</span>` : ''}
                                ${stBadge}
                            </div>
                        </div>`;
                }).join('')}
            </div>`)}
        </div>`;

    const servicesHtml = activeServices.length === 0
        ? empty('Belum ada layanan atau langganan aktif terdaftar.')
        : panel(`<div class="divide-y divide-slate-200 dark:divide-slate-800">
            ${activeServices.map((s) => {
                const stTone = s.status === 'aktif' ? 'green' : (s.status === 'segera_kadaluwarsa' || s.status === 'dijeda' ? 'amber' : 'red');
                const matchedSla = maintenance.find((m) => m.nama_aset === s.nama_layanan || (m.domain_name && m.domain_name === s.detail));
                const uptimeBadge = matchedSla?.uptime_status === 'online'
                    ? badge('Online', 'green')
                    : (matchedSla?.uptime_status === 'down' ? badge('Down', 'red') : '');
                return `
                    <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div class="min-w-0 space-y-0.5">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-sm font-bold text-slate-900 dark:text-white">${esc(s.nama_layanan)}</span>
                                ${badge(String(s.status || 'aktif').replace(/_/g, ' '), stTone)}
                                ${uptimeBadge}
                            </div>
                            <div class="text-xs text-slate-500 break-all">
                                ${esc(s.detail || '-')} · <span class="uppercase font-mono text-[11px]">${esc(s.sumber === 'langganan' ? 'Langganan' : 'SLA')}</span>
                                ${s.berakhir ? ` · ${s.sumber === 'langganan' ? 'Tagihan' : 'Berakhir'} <span class="font-mono">${fdate(s.berakhir)}</span>` : ''}
                                ${matchedSla?.ssl_days_left !== null && matchedSla?.ssl_days_left !== undefined ? ` · <span class="font-mono">SSL ${esc(matchedSla.ssl_days_left)} hr</span>` : ''}
                            </div>
                        </div>
                        <div class="sm:text-right shrink-0">
                            <div class="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">${s.biaya > 0 ? money(s.biaya) : '-'}</div>
                            <div class="text-[11px] uppercase font-mono text-slate-400">${esc(s.siklus || 'bulanan')}</div>
                        </div>
                    </div>`;
            }).join('')}
        </div>`);

    const unmergedSla = maintenance.filter((m) => !activeServices.some((s) => s.nama_layanan === m.nama_aset || (m.domain_name && m.domain_name === s.detail)));
    const slaHtml = unmergedSla.length === 0 ? '' : `
        <div class="space-y-3">
            ${sectionTitle('Pemantauan Domain, SSL & Hosting')}
            ${panel(`<div class="divide-y divide-slate-200 dark:divide-slate-800">
                ${unmergedSla.map((m) => {
                    const sisa = Number(m.sisa_hari);
                    const soon = sisa <= 30;
                    return `
                        <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div class="min-w-0 space-y-0.5">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="text-sm font-bold text-slate-900 dark:text-white">${esc(m.nama_aset)}</span>
                                    ${m.uptime_status === 'online' ? badge('Online', 'green') : (m.uptime_status === 'down' ? badge('Down', 'red') : badge('Aktif', 'slate'))}
                                </div>
                                <div class="text-xs font-mono text-slate-500 break-all">
                                    ${esc(m.domain_name || m.ip_address || '-')}
                                    ${m.http_status_code ? ` · HTTP ${esc(m.http_status_code)}` : ''}
                                    ${m.response_time_ms ? ` · ${esc(m.response_time_ms)} ms` : ''}
                                    ${m.ssl_days_left !== null && m.ssl_days_left !== undefined ? ` · SSL ${esc(m.ssl_days_left)} hari` : ''}
                                </div>
                            </div>
                            <div class="sm:text-right shrink-0 text-xs font-mono tabular-nums">
                                <div class="text-slate-700 dark:text-slate-300 font-semibold">${fdate(m.tanggal_berakhir)}</div>
                                <div class="${soon ? 'text-rose-600 font-semibold' : 'text-emerald-600'}">${sisa > 0 ? sisa + ' hari lagi' : 'Kedaluwarsa'}</div>
                            </div>
                        </div>`;
                }).join('')}
            </div>`)}
        </div>`;

    const credsHtml = credentials.length === 0 ? '' : `
        <div class="space-y-3">
            ${sectionTitle('Brankas Kredensial Akses', `<span class="text-[11px] font-mono text-slate-400">${credentials.length} akses dibagikan</span>`)}
            ${panel(`<div class="divide-y divide-slate-200 dark:divide-slate-800">
                ${credentials.map((c) => `
                    <div class="p-4 sm:px-5 space-y-2.5">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="text-sm font-bold text-slate-900 dark:text-white">${esc(c.judul)}</span>
                                    ${badge(String(c.tipe || '').replace(/_/g, ' '), 'indigo')}
                                    ${c.nama_project ? `<span class="text-[11px] text-slate-500">${esc(c.nama_project)}</span>` : ''}
                                </div>
                                ${c.catatan ? `<p class="text-xs text-slate-500 mt-0.5">${esc(c.catatan)}</p>` : ''}
                            </div>
                            <div class="flex items-center gap-2 shrink-0 flex-wrap" id="portal-cred-secret-${c.id}">
                                <button type="button" data-action="cred-reveal" data-id="${c.id}" class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5">
                                    <i class="ri-eye-line text-indigo-600"></i><span>Lihat Sandi</span>
                                </button>
                            </div>
                        </div>
                        <div class="flex flex-wrap items-center gap-2 text-xs font-mono">
                            ${c.host_url ? `
                                <button type="button" data-action="copy" data-text="${esc(c.host_url)}" class="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:border-indigo-400">
                                    <span class="text-[10px] text-slate-400 font-sans font-bold uppercase">Host:</span>
                                    <span class="truncate max-w-[200px]">${esc(c.host_url)}${c.port ? ':' + esc(c.port) : ''}</span>
                                    <i class="ri-file-copy-line text-slate-400"></i>
                                </button>` : ''}
                            ${c.username ? `
                                <button type="button" data-action="copy" data-text="${esc(c.username)}" class="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:border-indigo-400">
                                    <span class="text-[10px] text-slate-400 font-sans font-bold uppercase">User:</span>
                                    <span>${esc(c.username)}</span>
                                    <i class="ri-file-copy-line text-slate-400"></i>
                                </button>` : ''}
                        </div>
                    </div>`).join('')}
            </div>`)}
        </div>`;

    const kbHtml = kb.length === 0 ? '' : `
        <div class="space-y-3">
            ${sectionTitle('Pusat Panduan & SOP', `<span class="text-[11px] font-mono text-slate-400">${kb.length} artikel</span>`)}
            ${panel(`<div class="divide-y divide-slate-200 dark:divide-slate-800">
                ${kb.map((a) => `
                    <details class="group p-4 sm:px-5">
                        <summary class="cursor-pointer list-none flex items-center justify-between gap-3">
                            <div class="min-w-0 flex items-center gap-2 flex-wrap">
                                ${badge(String(a.kategori || 'panduan').toUpperCase(), 'indigo')}
                                <span class="text-sm font-bold text-slate-900 dark:text-white group-open:text-primary-600">${esc(a.judul)}</span>
                                ${a.nama_project ? `<span class="text-[11px] text-slate-400">· ${esc(a.nama_project)}</span>` : ''}
                            </div>
                            <i class="ri-arrow-down-s-line text-slate-400 group-open:rotate-180 transition"></i>
                        </summary>
                        <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">${esc(a.konten)}</div>
                    </details>`).join('')}
            </div>`)}
        </div>`;

    return `
        ${liveHtml}
        <div class="space-y-3">
            ${sectionTitle('Layanan yang Digunakan', `<span class="text-[11px] font-mono text-slate-400">${activeServices.length} layanan</span>`)}
            ${servicesHtml}
        </div>
        ${slaHtml}
        ${credsHtml}
        ${kbHtml}`;
}

export async function revealPortalCredential(id) {
    const slot = document.getElementById(`portal-cred-secret-${id}`);
    if (!slot) return;
    const res = await api('portal-auth/reveal-credential', {
        method: 'POST',
        body: { id: Number(id) }
    });
    if (!res?.success) return;
    const secret = String(res.data?.secret || '');
    slot.innerHTML = `
        <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 font-mono text-xs text-slate-900 dark:text-white">
            <span class="select-all">${esc(secret)}</span>
            <button type="button" data-action="copy" data-text="${esc(secret)}" class="text-indigo-600 hover:text-indigo-800 ml-1" title="Salin">
                <i class="ri-file-copy-line"></i>
            </button>
        </div>`;
    setTimeout(() => {
        const el = document.getElementById(`portal-cred-secret-${id}`);
        if (el) {
            el.innerHTML = `
                <button type="button" data-action="cred-reveal" data-id="${id}" class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5">
                    <i class="ri-eye-line text-indigo-600"></i><span>Lihat Sandi</span>
                </button>`;
        }
    }, 30000);
    toast('Sandi dibuka (otomatis disembunyikan dalam 30 detik)', 'info');
}
