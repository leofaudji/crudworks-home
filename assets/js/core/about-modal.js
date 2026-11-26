// ============================================
// ABOUT & CHANGELOG MODAL (Lazy-loaded)
// ============================================
import { apiClient } from './api.js';
import { AuthState } from './auth.js';
import { escapeHtml } from './utils.js';

let _aboutActiveTab = 'info';
let _cachedChangelog = null;

export function showAboutModal(tab = 'info', appCtx = {}) {
    const modal = document.getElementById('about-modal');
    if (!modal) return;
    switchAboutTab(tab, appCtx);
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.about-dialog-card')?.classList.remove('scale-95');
    });
}

export function closeAboutModal() {
    const modal = document.getElementById('about-modal');
    if (!modal) return;
    modal.classList.add('opacity-0');
    modal.querySelector('.about-dialog-card')?.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

export function switchAboutTab(tab = 'info', appCtx = {}) {
    _aboutActiveTab = tab;
    const btnInfo = document.getElementById('btn-about-tab-info');
    const btnChangelog = document.getElementById('btn-about-tab-changelog');
    if (btnInfo && btnChangelog) {
        const activeCls = 'px-4 py-2 border-b-2 font-bold text-xs transition-all border-primary-600 text-primary-600 dark:text-primary-400';
        const idleCls = 'px-4 py-2 border-b-2 font-medium text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border-transparent transition-all';
        btnInfo.className = tab === 'info' ? activeCls : idleCls;
        btnChangelog.className = tab === 'changelog' ? activeCls : idleCls;
    }
    renderAboutModalContent(appCtx);
}

export async function renderAboutModalContent(appCtx = {}) {
    const body = document.getElementById('about-modal-body');
    if (!body) return;

    if (_aboutActiveTab === 'info') {
        const userName = AuthState.user?.nama_lengkap || AuthState.user?.username || 'Guest';
        const userRole = AuthState.user?.role || '-';
        const version = appCtx.version || window.APP_VERSION || '1.0.0';
        const navLayout = appCtx.navLayout || 'sidebar';

        body.innerHTML = `
            <div class="space-y-4 text-xs">
                <div class="flex items-center gap-3.5 p-4 bg-gradient-to-r from-primary-50 to-indigo-50/60 dark:from-primary-950/40 dark:to-indigo-950/20 rounded-2xl border border-primary-100 dark:border-primary-900/40">
                    <img src="assets/icons/icon.svg" class="w-12 h-12 rounded-xl app-brand-logo shrink-0" alt="Logo">
                    <div>
                        <h4 class="font-extrabold text-sm text-slate-900 dark:text-white">CRUDWorks ERP</h4>
                        <p class="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">Sistem manajemen proyek, penagihan, akuntansi &amp; layanan klien terpadu.</p>
                        <span class="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/60 font-mono text-[10px] font-bold text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/50">Versi Aktif: v${escapeHtml(version)}</span>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-950/50 text-primary-600 flex items-center justify-center shrink-0"><i class="ri-file-list-3-line text-base"></i></div>
                        <div>
                            <div class="font-bold text-slate-800 dark:text-slate-100">Penagihan &amp; Pembayaran</div>
                            <div class="text-slate-400 text-[11px]">Faktur PDF, QRIS/VA &amp; Email</div>
                        </div>
                    </div>
                    <div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0"><i class="ri-scales-line text-base"></i></div>
                        <div>
                            <div class="font-bold text-slate-800 dark:text-slate-100">Akuntansi &amp; Pajak</div>
                            <div class="text-slate-400 text-[11px]">COA, Jurnal, Neraca &amp; Laba Rugi</div>
                        </div>
                    </div>
                    <div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center shrink-0"><i class="ri-git-branch-line text-base"></i></div>
                        <div>
                            <div class="font-bold text-slate-800 dark:text-slate-100">Proyek &amp; Portal Klien</div>
                            <div class="text-slate-400 text-[11px]">Progres tugas, BAST &amp; Tiket SLA</div>
                        </div>
                    </div>
                    <div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0"><i class="ri-shield-keyhole-line text-base"></i></div>
                        <div>
                            <div class="font-bold text-slate-800 dark:text-slate-100">Keamanan Enterprise</div>
                            <div class="text-slate-400 text-[11px]">2FA Authenticator &amp; Kontrol Sesi</div>
                        </div>
                    </div>
                </div>
                <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap justify-between gap-2">
                    <span>Pengguna: <strong class="text-slate-700 dark:text-slate-200">${escapeHtml(userName)} (${escapeHtml(userRole)})</strong></span>
                    <span>Tata Letak: <strong class="text-slate-700 dark:text-slate-200 uppercase">${escapeHtml(navLayout)}</strong></span>
                </div>
            </div>
        `;
    } else {
        body.innerHTML = `
            <div class="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <i class="ri-loader-4-line text-2xl animate-spin text-primary-600"></i>
                <span>Memuat catatan rilis...</span>
            </div>
        `;
        try {
            if (!_cachedChangelog) {
                const res = await fetch(`${apiClient.ROOT_BASE}CHANGELOG.md?_t=${Date.now()}`, { cache: 'no-cache' });
                if (res.ok) _cachedChangelog = await res.text();
            }
            if (!_cachedChangelog) {
                body.innerHTML = `
                    <div class="text-center py-8 space-y-2">
                        <i class="ri-file-warning-line text-3xl text-amber-500"></i>
                        <p class="text-xs text-slate-500">Catatan rilis belum dapat dimuat.</p>
                    </div>
                `;
                return;
            }

            const lines = _cachedChangelog.split(/\r?\n/);
            const cards = [];
            let cur = null;
            let curGroup = null;
            const fmtInline = (t) => escapeHtml(t)
                .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-800 dark:text-slate-100">$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>');

            for (const raw of lines) {
                const ln = raw.trim();
                const verM = ln.match(/^##\s+\[?([^\]\s]+)\]?\s*(?:-\s*(.+))?$/);
                if (verM) {
                    cur = { ver: verM[1], date: verM[2] || '', groups: [] };
                    curGroup = null;
                    cards.push(cur);
                    continue;
                }
                const grpM = ln.match(/^###\s+(.+)$/);
                if (grpM && cur) {
                    const rawG = grpM[1].toLowerCase();
                    const label = rawG.includes('ditambahkan') || rawG.includes('added') ? 'Fitur Baru'
                        : (rawG.includes('keamanan') || rawG.includes('security') ? 'Keamanan'
                        : (rawG.includes('diperbaiki') || rawG.includes('fixed') ? 'Perbaikan' : 'Peningkatan'));
                    const badgeCls = label === 'Fitur Baru' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : (label === 'Keamanan' ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : (label === 'Perbaikan' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-sky-50 text-sky-700 border-sky-200'));
                    curGroup = { label, badgeCls, items: [] };
                    cur.groups.push(curGroup);
                    continue;
                }
                if (/^[-*]\s+/.test(ln) && curGroup) {
                    curGroup.items.push(fmtInline(ln.replace(/^[-*]\s+/, '')));
                }
            }

            body.innerHTML = `
                <div class="space-y-4">
                    ${cards.slice(0, 6).map((c, idx) => `
                        <div class="p-4 rounded-2xl border ${idx === 0 ? 'border-primary-200 bg-primary-50/20 dark:border-primary-800/50 dark:bg-primary-950/10' : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900'} space-y-3">
                            <div class="flex items-center justify-between gap-2 flex-wrap">
                                <div class="flex items-center gap-2">
                                    <span class="px-2.5 py-0.5 rounded-lg ${idx === 0 ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'} font-mono text-xs font-bold">v${escapeHtml(c.ver)}</span>
                                    ${idx === 0 ? '<span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">Terbaru</span>' : ''}
                                </div>
                                <span class="text-[11px] text-slate-400">${escapeHtml(c.date)}</span>
                            </div>
                            ${c.groups.map(g => `
                                <div class="space-y-1.5">
                                    <span class="inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold ${g.badgeCls}">${g.label}</span>
                                    <ul class="space-y-1 text-xs text-slate-600 dark:text-slate-300 pl-1">
                                        ${g.items.map(it => `<li class="flex items-start gap-2"><span class="text-slate-400">•</span><span>${it}</span></li>`).join('')}
                                    </ul>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (err) {
            body.innerHTML = `<p class="text-center text-xs text-rose-500 py-6">Gagal memuat: ${escapeHtml(err.message)}</p>`;
        }
    }
}
