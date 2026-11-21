// assets/js/core/table-menu.js — Floating Table Action Menu with Left Hover Flyout Submenus
import { escapeHtml } from "./utils.js";

let _tableActionMenuBound = false;
let _activeTableMenu = null;
let _activeTableSubmenu = null;

export function closeTableActionMenu() {
    if (_activeTableSubmenu) {
        _activeTableSubmenu.remove();
        _activeTableSubmenu = null;
    }
    if (_activeTableMenu) {
        _activeTableMenu.remove();
        _activeTableMenu = null;
    }
}

function _bindTableActionMenuGlobalEvents() {
    if (_tableActionMenuBound || typeof document === 'undefined') return;
    _tableActionMenuBound = true;
    document.addEventListener('click', (e) => {
        if (!e.target.closest('[data-table-action-menu]') && !e.target.closest('[data-table-action-submenu]') && !e.target.closest('[data-table-action-trigger]')) {
            closeTableActionMenu();
        }
    });
    window.addEventListener('scroll', () => closeTableActionMenu(), true);
    window.addEventListener('resize', () => closeTableActionMenu());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeTableActionMenu();
    });
}

/**
 * Open a floating action dropdown menu anchored to a table action button.
 * Supports flat items, section headers, dividers, callback `fn`, legacy `action` string,
 * and `children` (hover flyout to the left).
 */
export function toggleTableActionMenu(btn, event, items = []) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    _bindTableActionMenuGlobalEvents();

    if (_activeTableMenu && _activeTableMenu._triggerBtn === btn) {
        closeTableActionMenu();
        return;
    }
    closeTableActionMenu();

    if (!Array.isArray(items) || items.length === 0) return;

    const menu = document.createElement('div');
    menu.className = 'fixed z-50 min-w-[215px] max-w-[275px] max-h-[78vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-1.5 text-xs text-slate-700 dark:text-slate-200 transition-opacity duration-150 backdrop-blur-md bg-white/95 dark:bg-slate-900/95';
    menu.setAttribute('data-table-action-menu', 'true');
    menu._triggerBtn = btn;

    const leafCallbacks = [];
    const renderLeafItem = (item) => {
        const isDanger = Boolean(item.danger);
        const iconColor = item.iconColor || (isDanger ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400');
        const textClass = isDanger
            ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800';

        if (typeof item.fn === 'function') {
            const cbIdx = leafCallbacks.length;
            leafCallbacks.push(item.fn);
            return `
                <button type="button" data-menu-leaf-cb="${cbIdx}"
                        class="w-full px-3.5 py-2 text-left flex items-center gap-2.5 font-medium transition rounded-lg ${textClass}">
                    ${item.icon ? `<i class="${item.icon} text-base ${iconColor} shrink-0"></i>` : ''}
                    <span class="truncate">${escapeHtml(item.label)}</span>
                </button>
            `;
        }

        return `
            <button type="button" onclick="App.closeTableActionMenu(); ${item.action || ''}"
                    class="w-full px-3.5 py-2 text-left flex items-center gap-2.5 font-medium transition rounded-lg ${textClass}">
                ${item.icon ? `<i class="${item.icon} text-base ${iconColor} shrink-0"></i>` : ''}
                <span class="truncate">${escapeHtml(item.label)}</span>
            </button>
        `;
    };

    const bindLeafCallbacks = (rootEl) => {
        rootEl.querySelectorAll('[data-menu-leaf-cb]').forEach((el) => {
            el.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const fn = leafCallbacks[Number(el.dataset.menuLeafCb)];
                closeTableActionMenu();
                if (typeof fn === 'function') fn();
            });
        });
    };

    let html = '';
    const groupChildrenMap = [];
    items.forEach((item) => {
        if (!item) return;
        if (item.divider) {
            html += `<div class="my-1 border-t border-slate-100 dark:border-slate-800"></div>`;
            return;
        }
        if (item.header) {
            html += `<div class="px-3.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">${escapeHtml(item.header)}</div>`;
            return;
        }
        if (Array.isArray(item.children) && item.children.length > 0) {
            const iconColor = item.iconColor || 'text-slate-500 dark:text-slate-400';
            const gIdx = groupChildrenMap.length;
            groupChildrenMap.push(item.children.filter(Boolean));
            html += `
                <div class="px-1">
                    <button type="button" data-menu-group-toggle="${gIdx}" aria-expanded="false" aria-haspopup="true"
                            class="w-full px-2.5 py-2 text-left flex items-center justify-between gap-2 font-semibold transition rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <span class="flex items-center gap-2.5 min-w-0">
                            ${item.icon ? `<i class="${item.icon} text-base ${iconColor} shrink-0"></i>` : ''}
                            <span class="truncate">${escapeHtml(item.label)}</span>
                        </span>
                        <i class="ri-arrow-right-s-line text-slate-400 text-sm shrink-0"></i>
                    </button>
                </div>
            `;
            return;
        }
        html += `<div class="px-1" data-menu-leaf-wrap="1">${renderLeafItem(item)}</div>`;
    });
    menu.innerHTML = html;
    document.body.appendChild(menu);
    bindLeafCallbacks(menu);

    const positionMenu = () => {
        const rect = btn.getBoundingClientRect();
        const menuWidth = Math.max(215, menu.offsetWidth || 215);
        let left = rect.right - menuWidth;
        if (left < 10) left = 10;
        if (left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;

        const menuHeight = menu.offsetHeight || (items.length * 36 + 12);
        const spaceBelow = window.innerHeight - rect.bottom - 8;
        const spaceAbove = rect.top - 8;

        if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
            menu.style.top = `${Math.max(8, rect.top - menuHeight - 4)}px`;
        } else {
            menu.style.top = `${rect.bottom + 4}px`;
        }
        menu.style.left = `${left}px`;
    };

    let closeSubTimer = null;
    const cancelSubClose = () => {
        if (closeSubTimer) {
            clearTimeout(closeSubTimer);
            closeSubTimer = null;
        }
    };
    const closeSubmenu = () => {
        cancelSubClose();
        if (_activeTableSubmenu) {
            _activeTableSubmenu.remove();
            _activeTableSubmenu = null;
        }
        menu.querySelectorAll('[data-menu-group-toggle]').forEach((b) => {
            b.setAttribute('aria-expanded', 'false');
            b.classList.remove('bg-slate-100', 'dark:bg-slate-800');
        });
    };
    const scheduleSubClose = () => {
        cancelSubClose();
        closeSubTimer = setTimeout(closeSubmenu, 140);
    };

    const openSubmenuFor = (toggleBtn) => {
        cancelSubClose();
        const gIdx = Number(toggleBtn.dataset.menuGroupToggle);
        const children = groupChildrenMap[gIdx] || [];
        if (!children.length) return;

        if (_activeTableSubmenu && _activeTableSubmenu._groupBtn === toggleBtn) {
            return;
        }
        closeSubmenu();

        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.classList.add('bg-slate-100', 'dark:bg-slate-800');

        const sub = document.createElement('div');
        sub.className = 'fixed z-[55] min-w-[215px] max-w-[270px] max-h-[75vh] overflow-y-auto bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-1.5 text-xs text-slate-700 dark:text-slate-200 backdrop-blur-md space-y-0.5';
        sub.setAttribute('data-table-action-submenu', 'true');
        sub._groupBtn = toggleBtn;
        sub.innerHTML = children.map(renderLeafItem).join('');
        document.body.appendChild(sub);
        bindLeafCallbacks(sub);
        _activeTableSubmenu = sub;

        const menuRect = menu.getBoundingClientRect();
        const rowRect = toggleBtn.getBoundingClientRect();
        const subW = sub.offsetWidth || 225;
        const subH = sub.offsetHeight || (children.length * 36 + 12);

        let subLeft = menuRect.left - subW - 6;
        if (subLeft < 8) {
            subLeft = menuRect.right + 6;
            if (subLeft + subW > window.innerWidth - 8) {
                subLeft = Math.max(8, window.innerWidth - subW - 8);
            }
        }
        let subTop = rowRect.top - 4;
        if (subTop + subH > window.innerHeight - 8) {
            subTop = Math.max(8, window.innerHeight - subH - 8);
        }

        sub.style.left = `${subLeft}px`;
        sub.style.top = `${subTop}px`;

        sub.addEventListener('mouseenter', cancelSubClose);
        sub.addEventListener('mouseleave', scheduleSubClose);
    };

    menu.querySelectorAll('[data-menu-group-toggle]').forEach((toggleBtn) => {
        toggleBtn.addEventListener('mouseenter', () => openSubmenuFor(toggleBtn));
        toggleBtn.addEventListener('mouseleave', scheduleSubClose);
        toggleBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            if (_activeTableSubmenu && _activeTableSubmenu._groupBtn === toggleBtn) {
                closeSubmenu();
            } else {
                openSubmenuFor(toggleBtn);
            }
        });
    });

    menu.querySelectorAll('[data-menu-leaf-wrap]').forEach((leaf) => {
        leaf.addEventListener('mouseenter', closeSubmenu);
    });

    positionMenu();
    _activeTableMenu = menu;
}

export function tableActionBtnHtml(itemsJsonString, label = 'Aksi') {
    return `
        <button type="button" data-table-action-trigger onclick="App.toggleTableActionMenu(this, event, ${itemsJsonString})"
                class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition" title="Menu Aksi">
            <span>${escapeHtml(label)}</span>
            <i class="ri-more-2-fill text-slate-400"></i>
        </button>
    `;
}
