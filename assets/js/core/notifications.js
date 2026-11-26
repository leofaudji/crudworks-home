// ============================================
// NOTIFICATION BELL POPOVER MODULE (Lazy-loaded, Tabbed & Priority Accents)
// ============================================
import { api } from './api.js';
import { hasPerm } from './auth.js';
import { escapeHtml } from './utils.js';

let _notifOutsideBound = false;
let _notifTab = 'all'; // 'all' | 'activity' | 'alerts'
let _notifCache = { alerts: [], inAppItems: [], unreadCount: 0 };

function _renderNotifList() {
    const list = document.getElementById('topbar-notif-list');
    if (!list) return;

    const { alerts, inAppItems, unreadCount } = _notifCache;
    if (alerts.length === 0 && inAppItems.length === 0) {
        list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400"><i class="ri-checkbox-circle-line text-2xl text-emerald-500 block mb-1"></i>Semua terkendali, tidak ada notifikasi baru.</div>`;
        return;
    }

    const tabs = [
        { key: 'all', label: 'Semua', count: inAppItems.length + alerts.length },
        { key: 'activity', label: 'Aktivitas', count: inAppItems.length },
        { key: 'alerts', label: 'Peringatan', count: alerts.length }
    ];

    const tabsHtml = `
        <div class="px-3 py-2 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 sticky top-0 z-10">
            <div class="flex items-center gap-1">
                ${tabs.map(t => {
                    const isAct = _notifTab === t.key;
                    return `
                        <button type="button" data-notif-tab="${t.key}"
                                class="px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition ${isAct ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-700'}">
                            <span>${t.label}</span>
                            <span class="font-mono text-[10px] opacity-75">${t.count}</span>
                        </button>
                    `;
                }).join('')}
            </div>
            ${unreadCount > 0 ? `<button type="button" onclick="App.markAllNotifRead()" class="text-[11px] text-primary-600 dark:text-primary-400 hover:underline font-semibold whitespace-nowrap">Tandai dibaca</button>` : ''}
        </div>
    `;

    const showActivity = _notifTab === 'all' || _notifTab === 'activity';
    const showAlerts = _notifTab === 'all' || _notifTab === 'alerts';

    const inAppHtml = showActivity ? inAppItems.map((n) => {
        const unread = Number(n.is_read) === 0;
        const borderAccent = n.tipe === 'bahaya' ? 'border-l-4 border-l-rose-500'
            : (n.tipe === 'peringatan' ? 'border-l-4 border-l-amber-400' : '');
        const iconCls = n.tipe === 'bahaya' ? 'text-rose-600 dark:text-rose-400'
            : (n.tipe === 'peringatan' ? 'text-amber-600 dark:text-amber-400'
            : (n.tipe === 'sukses' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'));
        return `
            <a href="${escapeHtml(n.tautan || '#/dashboard')}" onclick="App.markNotifRead(${n.id}); App.closeNotifications();"
               class="flex items-start gap-3 p-3.5 ${borderAccent} hover:bg-slate-50 dark:hover:bg-slate-800/60 transition ${unread ? 'bg-slate-50/70 dark:bg-slate-800/30' : 'opacity-75'}">
                <div class="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 ${iconCls} flex items-center justify-center shrink-0 mt-0.5">
                    <i class="ri-notification-3-line text-sm"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                        <span class="text-xs font-bold text-slate-800 dark:text-white leading-snug truncate">${escapeHtml(n.judul)}</span>
                        ${unread ? '<span class="w-1.5 h-1.5 rounded-full bg-primary-600 shrink-0"></span>' : ''}
                    </div>
                    <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">${escapeHtml(n.pesan)}</div>
                </div>
            </a>
        `;
    }).join('') : '';

    const alertsHtml = showAlerts ? alerts.map((a) => {
        const borderAccent = a.type === 'danger' ? 'border-l-4 border-l-rose-500'
            : (a.type === 'warning' ? 'border-l-4 border-l-amber-400' : '');
        const iconCls = a.type === 'danger' ? 'text-rose-600 dark:text-rose-400'
            : (a.type === 'warning' ? 'text-amber-600 dark:text-amber-400'
            : (a.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'));
        return `
            <a href="${escapeHtml(a.url || '#/invoices')}" onclick="App.closeNotifications()" class="flex items-start gap-3 p-3.5 ${borderAccent} hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                <div class="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 ${iconCls} flex items-center justify-center shrink-0 mt-0.5">
                    <i class="${escapeHtml(a.icon || 'ri-file-warning-line')} text-sm"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <div class="text-xs font-bold text-slate-800 dark:text-white leading-snug">${escapeHtml(a.title)}</div>
                    <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">${escapeHtml(a.detail)}</div>
                </div>
                <i class="ri-arrow-right-s-line text-slate-300 mt-1"></i>
            </a>
        `;
    }).join('') : '';

    const bodyHtml = (inAppHtml + alertsHtml) || `<div class="p-6 text-center text-xs text-slate-400">Tidak ada item pada kategori ini.</div>`;
    list.innerHTML = tabsHtml + `<div class="divide-y divide-slate-100 dark:divide-slate-800">${bodyHtml}</div>`;

    list.querySelectorAll('[data-notif-tab]').forEach((btn) => {
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            _notifTab = btn.getAttribute('data-notif-tab') || 'all';
            _renderNotifList();
        });
    });
}

export async function loadNotifications() {
    if (!hasPerm('dashboard.view')) return;
    const badge = document.getElementById('topbar-notif-badge');
    const list = document.getElementById('topbar-notif-list');
    if (!badge || !list) return;

    const [dashRes, inAppRes] = await Promise.all([
        api('dashboard/notifications', { cache: false, silent: true }),
        api('notifications?limit=15', { cache: false, silent: true })
    ]);
    const dashData = dashRes?.success && dashRes.data ? dashRes.data : { total_badge: 0, alerts: [] };
    const inAppData = inAppRes?.success && inAppRes.data ? inAppRes.data : { unread_count: 0, items: [] };

    const totalBadge = (Number(dashData.total_badge) || 0) + (Number(inAppData.unread_count) || 0);
    if (totalBadge > 0) {
        badge.textContent = totalBadge > 99 ? '99+' : String(totalBadge);
        badge.classList.remove('hidden');
        badge.style.display = 'inline-flex';
    } else {
        badge.classList.add('hidden');
        badge.style.display = 'none';
    }

    _notifCache = {
        alerts: dashData.alerts || [],
        inAppItems: inAppData.items || [],
        unreadCount: Number(inAppData.unread_count) || 0
    };
    _renderNotifList();
}

export async function markNotifRead(id) {
    if (!id) return;
    await api('notifications/read', { method: 'POST', body: { id }, silent: true });
    await loadNotifications();
}

export async function markAllNotifRead() {
    await api('notifications/read', { method: 'POST', body: { all: true }, silent: true });
    await loadNotifications();
}

export function toggleNotifications(e) {
    if (e) e.stopPropagation();
    const pop = document.getElementById('topbar-notif-popover');
    if (!pop) return;
    const willOpen = pop.classList.contains('hidden');
    pop.classList.toggle('hidden');
    if (willOpen) {
        loadNotifications();
        if (!_notifOutsideBound) {
            _notifOutsideBound = true;
            document.addEventListener('click', (evt) => {
                const wrapper = document.getElementById('topbar-notif-wrapper');
                const p = document.getElementById('topbar-notif-popover');
                if (wrapper && p && !p.classList.contains('hidden') && !wrapper.contains(evt.target)) {
                    p.classList.add('hidden');
                }
            });
        }
    }
}
