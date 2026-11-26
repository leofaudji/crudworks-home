// ============================================
// DAILY BRIEF MODULE - Action Board Pagi Hari
// ============================================
import { api } from './api.js';
import { AuthState } from './auth.js';
import { confirmAction, escapeHtml, formatDate, formatRupiah, toast } from './utils.js';

let _dailyBriefData = null;
let _dailyBriefTab = null;

function _updateBadge(total) {
    const badge = document.getElementById('topbar-daily-brief-badge');
    if (!badge) return;
    const count = Number(total) || 0;
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
        badge.style.display = 'inline-flex';
    } else {
        badge.classList.add('hidden');
        badge.style.display = 'none';
    }
}

export async function loadDailyBriefBadge() {
    const badge = document.getElementById('topbar-daily-brief-badge');
    if (!badge || !AuthState.user) return;
    try {
        const res = await api('dashboard/daily_brief', { silent: true });
        if (res && res.success && res.data) {
            _dailyBriefData = res.data;
            _updateBadge(res.data.total_critical_items || 0);
        }
    } catch (_) {}
}

export async function openDailyBriefModal() {
    const modal = document.getElementById('daily-brief-modal');
    const content = document.getElementById('daily-brief-content');
    if (!modal) return;

    _dailyBriefTab = null;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        content?.classList.remove('scale-95');
    });

    await refreshDailyBriefData();
}

export function closeDailyBriefModal() {
    const modal = document.getElementById('daily-brief-modal');
    const content = document.getElementById('daily-brief-content');
    if (!modal) return;

    modal.classList.add('opacity-0');
    content?.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

export function switchDailyBriefTab(tabKey) {
    _dailyBriefTab = tabKey;
    if (_dailyBriefData) {
        renderDailyBriefBody(_dailyBriefData);
    }
}

export async function refreshDailyBriefData() {
    const bodyEl = document.getElementById('daily-brief-body');
    const dateEl = document.getElementById('daily-brief-date');
    if (bodyEl) {
        bodyEl.innerHTML = `
            <div class="py-12 text-center text-slate-400">
                <i class="ri-loader-4-line text-2xl animate-spin inline-block mb-2 text-primary-600"></i>
                <div>Menghimpun agenda operasional & data tagihan hari ini...</div>
            </div>
        `;
    }

    const res = await api('dashboard/daily_brief');
    if (!res || !res.success || !res.data) {
        if (bodyEl) bodyEl.innerHTML = `<div class="p-6 text-center text-rose-500 font-medium">Gagal memuat Action Board harian.</div>`;
        return;
    }

    const d = res.data;
    _dailyBriefData = d;

    if (dateEl) dateEl.textContent = d.date_formatted || 'Hari ini';
    _updateBadge(d.total_critical_items || 0);

    const kpiNom = document.getElementById('brief-kpi-nominal');
    const kpiInv = document.getElementById('brief-kpi-inv-count');
    const kpiMs = document.getElementById('brief-kpi-ms-count');
    const kpiSla = document.getElementById('brief-kpi-sla-count');

    const invCount = (d.invoices || []).length;
    const msCount = (d.milestones || []).length;
    const slaCount = (d.maintenances || []).length;
    const incCount = (d.incidents || []).length;

    if (kpiNom) {
        kpiNom.textContent = formatRupiah(d.total_nominal_mendesak);
        kpiNom.className = `text-base font-bold font-mono ${(Number(d.total_nominal_mendesak) || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`;
    }
    if (kpiInv) {
        kpiInv.textContent = `${invCount} Faktur`;
        kpiInv.className = `text-base font-bold font-mono ${invCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`;
    }
    if (kpiMs) {
        kpiMs.textContent = `${msCount} Termin`;
        kpiMs.className = `text-base font-bold font-mono ${msCount > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}`;
    }
    if (kpiSla) {
        kpiSla.textContent = `${slaCount + incCount} Item`;
        kpiSla.className = `text-base font-bold font-mono ${incCount > 0 ? 'text-rose-600 dark:text-rose-400' : (slaCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500')}`;
    }

    renderDailyBriefBody(d);
}

function _renderPanelHeader(icon, title, subtitle, rightHtml = '') {
    return `
        <div class="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-sm shrink-0">
                    <i class="${icon} text-base"></i>
                </span>
                <div>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white">${title}</h4>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400">${subtitle}</p>
                </div>
            </div>
            ${rightHtml}
        </div>
    `;
}

export function renderDailyBriefBody(d) {
    const bodyEl = document.getElementById('daily-brief-body');
    const tabsEl = document.getElementById('daily-brief-tabs');
    if (!bodyEl) return;

    const invs = d.invoices || [];
    const mss = d.milestones || [];
    const slas = d.maintenances || [];
    const incs = d.incidents || [];

    const tabs = [
        { key: 'invoices', label: 'Tagihan', count: invs.length, icon: 'ri-hand-coin-line', dotColor: invs.length > 0 ? 'bg-rose-500' : '' },
        { key: 'milestones', label: 'Termin Proyek', count: mss.length, icon: 'ri-flag-2-line', dotColor: mss.length > 0 ? 'bg-primary-500' : '' },
        { key: 'sla', label: 'SLA & Lisensi', count: slas.length, icon: 'ri-global-line', dotColor: slas.length > 0 ? 'bg-amber-500' : '' },
        { key: 'incidents', label: 'Server & Uptime', count: incs.length, icon: 'ri-server-line', dotColor: incs.length > 0 ? 'bg-rose-500' : '' }
    ];

    if (!_dailyBriefTab || !tabs.some(t => t.key === _dailyBriefTab)) {
        const firstWithItems = tabs.find(t => t.count > 0);
        _dailyBriefTab = firstWithItems ? firstWithItems.key : 'invoices';
    }
    const activeTab = _dailyBriefTab;

    document.querySelectorAll('[data-brief-kpi]').forEach((el) => {
        const isKpiActive = el.dataset.briefKpi === activeTab || (activeTab === 'incidents' && el.dataset.briefKpi === 'sla');
        el.classList.toggle('bg-white', isKpiActive);
        el.classList.toggle('dark:bg-slate-900', isKpiActive);
    });

    if (tabsEl) {
        tabsEl.innerHTML = tabs.map(t => {
            const isActive = t.key === activeTab;
            const btnCls = isActive
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800';
            const badgeCls = isActive
                ? 'bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
            const alertDot = t.dotColor ? `<span class="w-1.5 h-1.5 rounded-full ${t.dotColor} shrink-0"></span>` : '';
            return `
                <button type="button" role="tab" aria-selected="${isActive ? 'true' : 'false'}"
                        onclick="App.switchDailyBriefTab('${t.key}')"
                        class="px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap transition shrink-0 ${btnCls}">
                    <i class="${t.icon} text-sm opacity-80"></i>
                    <span>${t.label}</span>
                    ${alertDot}
                    <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${badgeCls}">${t.count}</span>
                </button>
            `;
        }).join('');
    }

    let html = '';

    if (activeTab === 'invoices') {
        const rows = invs.length === 0
            ? `<div class="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5"><i class="ri-checkbox-circle-line text-slate-500 text-sm"></i> Tidak ada tagihan menunggak atau jatuh tempo hari ini.</div>`
            : invs.map(inv => {
                const hari = Number(inv.hari_lewat) || 0;
                const rowAccent = hari > 0 ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-amber-400';
                const statusBadge = hari > 0
                    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50">Overdue ${hari} hari</span>`
                    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50">Jatuh Tempo Hari Ini</span>`;
                return `
                    <div class="p-4 ${rowAccent} flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-bold text-sm text-slate-900 dark:text-white">${escapeHtml(inv.nomor_invoice)}</span>
                                ${statusBadge}
                            </div>
                            <div class="text-xs text-slate-600 dark:text-slate-300 font-medium">${escapeHtml(inv.nama_perusahaan)}</div>
                            <div class="text-[11px] text-slate-500 font-mono mt-0.5">Sisa Tagihan: <b class="text-rose-600 dark:text-rose-400 font-semibold">${formatRupiah(inv.sisa_tagihan)}</b> dari ${formatRupiah(inv.total_tagihan)}</div>
                        </div>
                        <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button type="button" onclick="App.openWhatsAppInvoiceReminder(${inv.id})" class="px-3 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap">
                                <i class="ri-whatsapp-line text-emerald-600 dark:text-emerald-400"></i> Kirim WA
                            </button>
                            <a href="#/invoices" onclick="App.closeDailyBriefModal()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition whitespace-nowrap">
                                <i class="ri-eye-line"></i> Rincian
                            </a>
                        </div>
                    </div>
                `;
            }).join('');
        html += `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">${_renderPanelHeader('ri-hand-coin-line', `Tagihan Jatuh Tempo & Overdue (${invs.length})`, 'Prioritas penagihan hari ini untuk mengamankan arus kas', `<span class="font-mono text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">${formatRupiah(d.total_nominal_mendesak)}</span>`)}<div class="divide-y divide-slate-100 dark:divide-slate-800">${rows}</div></div>`;
    }

    if (activeTab === 'milestones') {
        const rows = mss.length === 0
            ? `<div class="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5"><i class="ri-checkbox-circle-line text-slate-500 text-sm"></i> Belum ada termin baru yang siap ditagihkan hari ini.</div>`
            : mss.map(ms => `
                <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <div>
                        <div class="font-bold text-sm text-slate-900 dark:text-white mb-0.5">${escapeHtml(ms.nama_milestone)}</div>
                        <div class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(ms.nama_project)} • <span class="font-medium text-slate-700 dark:text-slate-300">${escapeHtml(ms.nama_perusahaan)}</span></div>
                        <div class="text-[11px] font-mono text-primary-600 dark:text-primary-400 font-semibold mt-1">Termin ${ms.persentase}%: ${formatRupiah(ms.nominal)}</div>
                    </div>
                    <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button type="button" onclick="App.createMilestoneInvoiceFromBrief(${ms.id}, ${ms.project_id})" class="px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition whitespace-nowrap">
                            <i class="ri-file-add-line"></i> Terbitkan Faktur
                        </button>
                    </div>
                </div>
            `).join('');
        html += `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">${_renderPanelHeader('ri-flag-2-line', `Termin Proyek Siap Ditagihkan (${mss.length})`, 'Milestone berstatus rencana yang siap diterbitkan faktur')}<div class="divide-y divide-slate-100 dark:divide-slate-800">${rows}</div></div>`;
    }

    if (activeTab === 'sla') {
        const rows = slas.length === 0
            ? `<div class="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5"><i class="ri-checkbox-circle-line text-slate-500 text-sm"></i> Seluruh masa aktif domain, hosting, dan SSL klien dalam kondisi aman.</div>`
            : slas.map(s => {
                const sisa = Number(s.sisa_hari) || 0;
                const rowAccent = sisa <= 3 ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-amber-400';
                const badge = sisa <= 3
                    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300">Sisa ${sisa} hari</span>`
                    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300">Sisa ${sisa} hari</span>`;
                return `
                    <div class="p-4 ${rowAccent} flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <div>
                            <div class="flex items-center gap-2 mb-0.5">
                                <span class="font-bold text-sm text-slate-900 dark:text-white">${escapeHtml(s.nama_aset)}</span>
                                ${badge}
                            </div>
                            <div class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(s.nama_perusahaan)} • Jatuh Tempo: ${formatDate(s.tanggal_berakhir)}</div>
                            <div class="text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-1">Biaya: <b>${formatRupiah(s.biaya_perpanjangan)}</b></div>
                        </div>
                        <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <a href="#/maintenance" onclick="App.closeDailyBriefModal()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition whitespace-nowrap">
                                Kelola SLA
                            </a>
                        </div>
                    </div>
                `;
            }).join('');
        html += `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">${_renderPanelHeader('ri-global-line', `SLA Domain, Hosting & SSL (< 14 Hari) (${slas.length})`, 'Peringatan perpanjangan lisensi agar tidak suspend')}<div class="divide-y divide-slate-100 dark:divide-slate-800">${rows}</div></div>`;
    }

    if (activeTab === 'incidents') {
        const rows = incs.length === 0
            ? `<div class="p-6 text-center text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center gap-2"><i class="ri-checkbox-circle-line text-emerald-600 dark:text-emerald-400 text-base"></i> Seluruh sistem proyek klien terpantau 100% online & SSL aman.</div>`
            : incs.map(inc => {
                const isDown = inc.last_health_status === 'down';
                const rowAccent = isDown ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-amber-400';
                const badge = isDown
                    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300">DOWN</span>`
                    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300">SSL Segera Habis</span>`;
                return `
                    <div class="p-4 ${rowAccent} flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <div>
                            <div class="flex items-center gap-2 mb-0.5">
                                <span class="font-bold text-sm text-slate-900 dark:text-white">${escapeHtml(inc.nama_project)}</span>
                                ${badge}
                            </div>
                            <div class="text-xs text-slate-400 font-mono">${escapeHtml(inc.app_url || '-')}</div>
                            <div class="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">Status: ${isDown ? 'Server tidak merespons HTTP' : `SSL tersisa ${inc.last_ssl_days} hari`}</div>
                        </div>
                        <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <a href="#/projects" onclick="App.closeDailyBriefModal()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition whitespace-nowrap">
                                Cek Proyek
                            </a>
                        </div>
                    </div>
                `;
            }).join('');
        html += `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">${_renderPanelHeader('ri-server-line', `Status Kesehatan Server & Uptime (${incs.length})`, 'Pemantau insiden live HTTP status dan sertifikat SSL')}<div class="divide-y divide-slate-100 dark:divide-slate-800">${rows}</div></div>`;
    }

    bodyEl.innerHTML = html;
}

export function copyDailyBriefWhatsApp() {
    if (!_dailyBriefData || !_dailyBriefData.whatsapp_text) {
        toast('Data brief belum siap disalin', 'warning');
        return;
    }
    const text = _dailyBriefData.whatsapp_text;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            toast('Ringkasan Executive Brief berhasil disalin ke clipboard!', 'success');
        }).catch(() => {
            window.prompt('Salin teks brief berikut:', text);
        });
    } else {
        window.prompt('Salin teks brief berikut:', text);
    }
}

export function sendDailyBriefWhatsApp() {
    if (!_dailyBriefData || !_dailyBriefData.whatsapp_text) {
        toast('Data brief belum siap dikirim', 'warning');
        return;
    }
    const text = encodeURIComponent(_dailyBriefData.whatsapp_text);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

export async function createMilestoneInvoiceFromBrief(milestoneId, projectId) {
    const conf = await confirmAction('Terbitkan Faktur Termin', 'Apakah Anda yakin ingin langsung menerbitkan faktur resmi dari termin ini?');
    if (!conf) return;

    const res = await api(`projects/${projectId}?action=create-milestone-invoice`, {
        method: 'POST',
        body: { milestone_id: milestoneId }
    });

    if (res && res.success) {
        toast(res.message, 'success');
        await refreshDailyBriefData();
    }
}
