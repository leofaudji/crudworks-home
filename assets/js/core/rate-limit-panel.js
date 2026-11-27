// assets/js/core/rate-limit-panel.js — Panel Monitoring & Buka Blokir Rate Limit Login
import { App } from '../app.js';

export function mountRateLimitPanel(containerEl) {
    if (!containerEl) return { reload: () => {} };

    const state = { page: 1, perPage: 15, search: '' };

    containerEl.innerHTML = `
        <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-shield-keyhole-line text-rose-600"></i> Log Percobaan Login &amp; Rate Limiting
                    </h4>
                    <p class="text-xs text-slate-400">Akun/IP otomatis terblokir sementara 15 menit setelah 5x gagal login berturut-turut.</p>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" data-rl-clear-all class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition">
                        <i class="ri-lock-unlock-line"></i><span>Reset Semua</span>
                    </button>
                    <button type="button" data-rl-refresh class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition">
                        <i class="ri-refresh-line"></i><span>Segarkan</span>
                    </button>
                </div>
            </div>

            <div class="relative">
                <input type="text" data-rl-search placeholder="Cari username atau IP address..."
                       class="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500">
                <i class="ri-search-line absolute left-3 top-2.5 text-slate-400 text-xs"></i>
            </div>

            <div class="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <th class="py-3 px-4">Username</th>
                                <th class="py-3 px-4 whitespace-nowrap">IP Address</th>
                                <th class="py-3 px-4 whitespace-nowrap text-center">Gagal (15 Menit)</th>
                                <th class="py-3 px-4 whitespace-nowrap">Percobaan Terakhir</th>
                                <th class="py-3 px-4 whitespace-nowrap">Status</th>
                                <th class="py-3 px-4 whitespace-nowrap text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody data-rl-tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr><td colspan="6" class="py-10 text-center text-slate-400">Memuat data rate limit...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div data-rl-pagination class="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500"></div>
            </div>
        </div>
    `;

    const tbody = containerEl.querySelector('[data-rl-tbody]');
    const pagEl = containerEl.querySelector('[data-rl-pagination]');

    async function load() {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-slate-400"><i class="ri-loader-4-line animate-spin inline-block mr-1"></i> Memuat data rate limit...</td></tr>`;
        const qs = new URLSearchParams({
            page: state.page,
            per_page: state.perPage,
            ...(state.search ? { search: state.search } : {})
        });
        const res = await App.api(`audit/login-attempts?${qs.toString()}`);
        if (!res || !res.success) {
            tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-rose-500">Gagal memuat log rate limit.</td></tr>`;
            return;
        }
        const rows = res.data || [];
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-slate-400">Tidak ada catatan percobaan login gagal.</td></tr>`;
        } else {
            tbody.innerHTML = rows.map(r => {
                const active = Number(r.active_attempts || 0);
                const blocked = active >= 5;
                const badge = blocked
                    ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"><i class="ri-spam-2-line"></i>Terblokir</span>`
                    : (active > 0
                        ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><i class="ri-error-warning-line"></i>Pantauan</span>`
                        : `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Kedaluwarsa</span>`);

                return `
                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                        <td class="py-3 px-4 font-bold text-slate-900 dark:text-white font-mono">${App.escapeHtml(r.username)}</td>
                        <td class="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">${App.escapeHtml(r.ip_address)}</td>
                        <td class="py-3 px-4 text-center font-mono font-bold whitespace-nowrap ${blocked ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}">${active} / 5 <span class="text-[10px] font-normal text-slate-400">(total ${r.total_attempts})</span></td>
                        <td class="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">${App.formatDateTime(r.last_attempt_at)}</td>
                        <td class="py-3 px-4 whitespace-nowrap">${badge}</td>
                        <td class="py-3 px-4 whitespace-nowrap text-right">
                            <button type="button" data-rl-unlock-user="${App.escapeHtml(r.username)}" data-rl-unlock-ip="${App.escapeHtml(r.ip_address)}"
                                    class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition">
                                <i class="ri-lock-unlock-line"></i><span>Buka Blokir</span>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        if (res.pagination) {
            App.renderPagination(pagEl, res.pagination, (p) => {
                state.page = p;
                load();
            }, 'entri');
        }
    }

    containerEl.addEventListener('click', async (e) => {
        const unlockBtn = e.target.closest('[data-rl-unlock-user]');
        if (unlockBtn) {
            const username = unlockBtn.dataset.rlUnlockUser;
            const ip_address = unlockBtn.dataset.rlUnlockIp;
            if (!await App.confirm('Buka Blokir Login?', `Hapus catatan gagal login untuk "${username}" (${ip_address})?`)) return;
            const res = await App.api('audit/unlock-login', { method: 'POST', body: { username, ip_address } });
            if (res?.success) {
                App.toast(res.message, 'success');
                load();
            }
        }
    });

    containerEl.querySelector('[data-rl-search]')?.addEventListener('input', App.debounce((e) => {
        state.search = e.target.value.trim();
        state.page = 1;
        load();
    }, 300));
    containerEl.querySelector('[data-rl-refresh]')?.addEventListener('click', load);
    containerEl.querySelector('[data-rl-clear-all]')?.addEventListener('click', async () => {
        if (!await App.confirm('Reset Semua Rate Limit?', 'Hapus seluruh riwayat percobaan login gagal dari tabel?')) return;
        const res = await App.api('audit/unlock-login', { method: 'POST', body: { clear_all: true } });
        if (res?.success) {
            App.toast(res.message, 'success');
            load();
        }
    });

    load();
    return { reload: load };
}
