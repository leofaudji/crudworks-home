// assets/js/core/windows-taskbar.js — Windows Taskbar, Start Menu & Layout Modes
import { AuthState } from './auth.js';
import { escapeHtml, toast } from './utils.js';

class WindowsTaskbarMethods {
    initNavLayout() {
        const saved = localStorage.getItem('app_nav_layout') || 'sidebar';
        this.navLayout = ['sidebar', 'bottom', 'top'].includes(saved) ? saved : 'sidebar';
        this.windowsSubmenuStyle = localStorage.getItem('app_windows_submenu_style') || 'panel';
        this._applyNavLayout(this.navLayout);
        this._applyWindowsSubmenuStyle(this.windowsSubmenuStyle);
    }

    setNavLayout(mode) {
        if (!['sidebar', 'bottom', 'top'].includes(mode)) return;
        this.navLayout = mode;
        try { localStorage.setItem('app_nav_layout', mode); } catch (_) {}
        this._applyNavLayout(mode);

        const dd = document.getElementById('nav-layout-dropdown');
        if (dd) dd.classList.add('hidden');
        const sm = document.getElementById('windows-start-menu');
        if (sm) sm.classList.add('hidden');

        const labels = {
            sidebar: 'Sidebar Kiri',
            bottom: 'Taskbar Bawah (Windows)',
            top: 'Bilah Atas (Top Taskbar)'
        };
        toast(`Tata letak navigasi: ${labels[mode]}`, 'success', 2000);
    }

    _applyNavLayout(mode) {
        document.body.classList.remove('layout-sidebar', 'layout-bottom', 'layout-top');
        document.body.classList.add(`layout-${mode}`);

        const compactBtn = document.getElementById('topbar-compact-btn');
        if (compactBtn) compactBtn.style.display = mode === 'sidebar' ? '' : 'none';

        if (mode !== 'sidebar') {
            this.renderWindowsTaskbar();
            this.renderWindowsStartMenu();
            this._startTaskbarClock();
            this.syncUserToTaskbar();
        }
        this.updateLayoutDropdownChecks(mode);
    }

    syncUserToTaskbar() {
        const u = AuthState.user;
        if (!u) return;
        const name = u.nama_lengkap || u.username || 'User';
        const initials = name.charAt(0).toUpperCase();
        const ua = document.getElementById('taskbar-user-avatar');
        const sua = document.getElementById('start-user-avatar');
        const sun = document.getElementById('start-user-name');
        const sur = document.getElementById('start-user-role');
        if (ua) ua.textContent = initials;
        if (sua) sua.textContent = initials;
        if (sun) sun.textContent = name;
        if (sur) sur.textContent = u.role || '';
    }

    updateLayoutDropdownChecks(mode) {
        document.querySelectorAll('[data-layout-opt]').forEach((btn) => {
            const isMatch = btn.getAttribute('data-layout-opt') === mode;
            const icon = btn.querySelector('.check-icon');
            if (icon) icon.classList.toggle('hidden', !isMatch);
            btn.classList.toggle('font-bold', isMatch);
            btn.classList.toggle('text-primary-700', isMatch);
            btn.classList.toggle('dark:text-primary-400', isMatch);
            btn.classList.toggle('bg-primary-50/70', isMatch);
            btn.classList.toggle('dark:bg-primary-950/40', isMatch);
        });
    }

    toggleNavLayoutPicker(event) {
        if (event && typeof event === 'object') {
            event.stopPropagation();
            event.preventDefault();
        }
        const dd = document.getElementById('nav-layout-dropdown');
        if (!dd) return;
        if (event === false) {
            dd.classList.add('hidden');
            return;
        }
        const sm = document.getElementById('windows-start-menu');
        if (sm) sm.classList.add('hidden');

        const willOpen = dd.classList.contains('hidden');
        dd.classList.toggle('hidden', !willOpen);

        if (willOpen) {
            this.updateLayoutDropdownChecks(this.navLayout);
            const trigger = event?.currentTarget || event?.target?.closest('button');
            if (trigger) {
                const rect = trigger.getBoundingClientRect();
                const ddWidth = 280;
                // If trigger is in the bottom half of the screen (e.g. taskbar bawah)
                if (rect.top > window.innerHeight / 2) {
                    dd.style.top = 'auto';
                    dd.style.bottom = `${Math.max(10, window.innerHeight - rect.top + 8)}px`;
                } else {
                    dd.style.top = `${rect.bottom + 8}px`;
                    dd.style.bottom = 'auto';
                }

                // Horizontal alignment
                if (rect.right > window.innerWidth - ddWidth) {
                    dd.style.left = 'auto';
                    dd.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`;
                } else {
                    dd.style.left = `${Math.max(12, rect.left)}px`;
                    dd.style.right = 'auto';
                }
            }
        }
    }

    // ===== Windows Submenu Style (Panel vs Cascading) =====
    setWindowsSubmenuStyle(style, showToastMsg = true) {
        this.windowsSubmenuStyle = style === 'cascading' ? 'cascading' : 'panel';
        try { localStorage.setItem('app_windows_submenu_style', this.windowsSubmenuStyle); } catch (_) {}
        this._applyWindowsSubmenuStyle(this.windowsSubmenuStyle);
        this.renderWindowsStartMenu();
        if (showToastMsg) {
            const label = this.windowsSubmenuStyle === 'panel' ? 'Gaya Panel (2 Kolom)' : 'Gaya Akordeon (Bertingkat)';
            toast(`Gaya Start Menu: ${label}`, 'success', 1500);
        }
    }

    _applyWindowsSubmenuStyle(style) {
        const sm = document.getElementById('windows-start-menu');
        if (!sm) return;
        sm.classList.remove('start-menu-panel-mode', 'start-menu-cascading-mode');
        sm.classList.add(style === 'panel' ? 'start-menu-panel-mode' : 'start-menu-cascading-mode');
    }

    toggleStartMenu(eventOrState) {
        if (eventOrState && typeof eventOrState === 'object') {
            eventOrState.stopPropagation();
        }
        const sm = document.getElementById('windows-start-menu');
        if (!sm) return;

        if (eventOrState === false) {
            sm.classList.add('hidden');
            return;
        }

        const dd = document.getElementById('nav-layout-dropdown');
        if (dd) dd.classList.add('hidden');

        const willOpen = sm.classList.contains('hidden');
        sm.classList.toggle('hidden', !willOpen);
        if (willOpen) {
            this.renderWindowsStartMenu();
            const si = document.getElementById('start-menu-search');
            if (si) {
                si.value = '';
                setTimeout(() => si.focus(), 40);
            }
        }
    }

    closeTaskbarFlyout() {
        const fl = document.getElementById('taskbar-flyout');
        if (fl) {
            fl.classList.add('hidden');
            fl.dataset.activeGroup = '';
        }
    }

    // ===== Windows Taskbar Opened Tabs =====
    _initOpenedWindowsTabs() {
        if (!this.openedWindowsTabs) {
            try {
                this.openedWindowsTabs = JSON.parse(sessionStorage.getItem('app_opened_tabs') || '[]');
            } catch (_) {
                this.openedWindowsTabs = [];
            }
        }
        if (!Array.isArray(this.openedWindowsTabs)) this.openedWindowsTabs = [];
        if (!this.openedWindowsTabs.some((t) => t.url === '#/dashboard')) {
            this.openedWindowsTabs.unshift({ url: '#/dashboard', nama: 'Dashboard', icon: 'ri-dashboard-line' });
        }
    }

    addOpenedWindowsTab(hash) {
        const baseHash = (hash || '#/dashboard').split('?')[0];
        this._initOpenedWindowsTabs();

        const existingIndex = this.openedWindowsTabs.findIndex((t) => t.url === baseHash);
        if (existingIndex === -1) {
            let meta = this._flatMenuItems.find((m) => m.url === baseHash);
            if (!meta) {
                const fallbackNames = {
                    '#/dashboard': { nama: 'Dashboard', icon: 'ri-dashboard-line' },
                    '#/changelog': { nama: 'Catatan Rilis', icon: 'ri-history-line' },
                    '#/pengaturan': { nama: 'Pengaturan', icon: 'ri-settings-3-line' }
                };
                meta = fallbackNames[baseHash] || {
                    nama: baseHash.replace('#/', '').replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
                    icon: 'ri-window-line'
                };
            }
            this.openedWindowsTabs.push({ url: baseHash, nama: meta.nama, icon: meta.icon });
            if (this.openedWindowsTabs.length > 8) {
                const rmIdx = this.openedWindowsTabs.findIndex((t) => t.url !== '#/dashboard' && t.url !== baseHash);
                if (rmIdx !== -1) this.openedWindowsTabs.splice(rmIdx, 1);
            }
        }

        try {
            sessionStorage.setItem('app_opened_tabs', JSON.stringify(this.openedWindowsTabs));
        } catch (_) {}

        if (this.navLayout !== 'sidebar') {
            this.renderWindowsTaskbar();
        }
    }

    closeWindowsTab(url, event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        if (url === '#/dashboard') return;
        this._initOpenedWindowsTabs();

        const idx = this.openedWindowsTabs.findIndex((t) => t.url === url);
        if (idx === -1) return;

        const wasActive = this.currentRoute === url;
        this.openedWindowsTabs.splice(idx, 1);
        try {
            sessionStorage.setItem('app_opened_tabs', JSON.stringify(this.openedWindowsTabs));
        } catch (_) {}

        if (wasActive) {
            const nextTab = this.openedWindowsTabs[Math.max(0, idx - 1)] || { url: '#/dashboard' };
            window.location.hash = nextTab.url;
        } else {
            this.renderWindowsTaskbar();
        }
    }

    renderWindowsTaskbar() {
        const container = document.getElementById('taskbar-pinned-apps');
        if (!container) return;
        this._initOpenedWindowsTabs();

        const cur = (this.currentRoute || '#/dashboard').split('?')[0];
        container.innerHTML = this.openedWindowsTabs.map((t) => {
            const isActive = cur === t.url;
            return `
                <div class="taskbar-app-tab ${isActive ? 'active' : ''}">
                    <a href="${escapeHtml(t.url)}" class="taskbar-app-btn ${isActive ? 'active' : ''}" title="${escapeHtml(t.nama)}">
                        <i class="${escapeHtml(t.icon || 'ri-window-line')} text-sm flex-shrink-0"></i>
                        <span class="hidden sm:inline max-w-[130px] truncate text-xs font-semibold">${escapeHtml(t.nama)}</span>
                    </a>
                    ${t.url !== '#/dashboard' ? `
                    <button type="button" onclick="App.closeWindowsTab('${escapeHtml(t.url)}', event)" class="taskbar-tab-close" title="Tutup ${escapeHtml(t.nama)}">
                        <i class="ri-close-line text-xs"></i>
                    </button>` : ''}
                </div>
            `;
        }).join('');
    }

    _startTaskbarClock() {
        const update = () => {
            const now = new Date();
            const tEl = document.getElementById('taskbar-clock-time');
            const dEl = document.getElementById('taskbar-clock-date');
            if (tEl) tEl.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            if (dEl) dEl.textContent = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };
        update();
        if (this._clockInterval) clearInterval(this._clockInterval);
        this._clockInterval = setInterval(update, 15000);
    }

    // ===== Windows Start Menu Renderer =====
    renderWindowsStartMenu(searchQuery = '') {
        const pinnedGrid = document.getElementById('start-menu-pinned-grid');
        const itemsContainer = document.getElementById('start-menu-items');
        if (!itemsContainer) return;

        // Pinned Apps
        if (pinnedGrid) {
            const pinnedTargets = ['#/dashboard', '#/transaksi', '#/modal', '#/bagi-hasil'];
            const pinnedItems = pinnedTargets
                .map((url) => this._flatMenuItems.find((m) => m.url === url))
                .filter(Boolean);

            pinnedGrid.innerHTML = pinnedItems.map((m) => `
                <a href="${escapeHtml(m.url)}" onclick="App.toggleStartMenu(false)" class="start-menu-pinned-item" title="${escapeHtml(m.nama)}" aria-label="${escapeHtml(m.nama)}">
                    <i class="${escapeHtml(m.icon)}"></i>
                </a>
            `).join('');
        }

        const recentContainer = document.getElementById('start-menu-recent');
        if (recentContainer) {
            this._initOpenedWindowsTabs();
            const recentItems = this.openedWindowsTabs
                .slice()
                .reverse()
                .filter((item) => item.url !== '#/dashboard')
                .slice(0, 3);
            recentContainer.classList.toggle('hidden', recentItems.length === 0);
            recentContainer.innerHTML = recentItems.length ? `
                <div class="start-menu-recent-heading">Terakhir dibuka</div>
                <div class="start-menu-recent-list">
                    ${recentItems.map((item) => `
                        <a href="${escapeHtml(item.url)}" data-url="${escapeHtml(item.url)}" onclick="App.toggleStartMenu(false)" class="start-menu-recent-item">
                            <i class="${escapeHtml(item.icon || 'ri-window-line')}"></i>
                            <span class="truncate">${escapeHtml(item.nama)}</span>
                        </a>
                    `).join('')}
                </div>
            ` : '';
        }

        const q = (searchQuery || '').trim().toLowerCase();
        const pinnedSection = document.getElementById('start-menu-pinned-section');
        if (pinnedSection) pinnedSection.classList.toggle('hidden', q.length > 0);
        if (recentContainer) recentContainer.classList.toggle('hidden', q.length > 0 || !recentContainer.textContent.trim());
        const menus = AuthState.menus || [];

        if (q) {
            const matched = this._flatMenuItems.filter((m) => m.nama.toLowerCase().includes(q) || m.section.toLowerCase().includes(q));
            itemsContainer.innerHTML = matched.length > 0
                ? `<div class="start-menu-main-items space-y-1">${matched.map((m) => `
                    <a href="${escapeHtml(m.url)}" data-url="${escapeHtml(m.url)}" onclick="App.toggleStartMenu(false)" class="start-menu-item ${this.currentRoute === m.url ? 'active' : ''}">
                        <span class="start-menu-icon"><i class="${escapeHtml(m.icon)}"></i></span>
                        <span class="flex-1 truncate">${escapeHtml(m.nama)}</span>
                        <span class="text-[10px] text-slate-400 uppercase font-mono">${escapeHtml(m.section)}</span>
                    </a>`).join('')}</div>`
                : `<div class="py-8 text-center text-xs text-slate-400">Tidak ditemukan modul untuk "${escapeHtml(searchQuery)}"</div>`;
            return;
        }

        if (this.windowsSubmenuStyle === 'panel') {
            this._renderStartMenuPanel(itemsContainer, menus);
        } else {
            this._renderStartMenuCascading(itemsContainer, menus);
        }
    }

    _startPanelCatContainsRoute(cat, route) {
        if (!route || !cat?.children) return false;
        return cat.children.some((item) =>
            item.url === route ||
            (Array.isArray(item.children) && item.children.some((sub) => sub.url === route))
        );
    }

    _buildStartPanelRightHtml(cat) {
        if (!cat || !Array.isArray(cat.children)) return '';
        let rightHtml = '';
        cat.children.forEach((item) => {
            if (item.children && item.children.length > 0) {
                rightHtml += `
                    <div class="start-menu-group">
                        <div class="start-menu-group-title">
                            <span>${escapeHtml(item.nama)}</span>
                        </div>
                        <div class="start-menu-subitems grid grid-cols-1 gap-1">
                            ${item.children.map((sub) => `
                                <a href="${escapeHtml(sub.url)}" data-url="${escapeHtml(sub.url)}" onclick="App.toggleStartMenu(false)"
                                   class="start-menu-subitem ${this.currentRoute === sub.url ? 'active' : ''}">
                                    <span class="start-submenu-icon"><i class="${escapeHtml(sub.icon || 'ri-arrow-right-s-line')}"></i></span>
                                    <span class="truncate">${escapeHtml(sub.nama)}</span>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else if (item.url) {
                rightHtml += `
                    <a href="${escapeHtml(item.url)}" data-url="${escapeHtml(item.url)}" onclick="App.toggleStartMenu(false)"
                       class="start-menu-item mb-1 ${this.currentRoute === item.url ? 'active' : ''}">
                        <span class="start-menu-icon"><i class="${escapeHtml(item.icon)}"></i></span>
                        <span class="truncate">${escapeHtml(item.nama)}</span>
                    </a>
                `;
            }
        });
        return `<div class="start-menu-main-items">${rightHtml}</div>`;
    }

    _renderStartMenuPanel(container, menus) {
        const categories = [];
        menus.forEach((sec, idx) => {
            if (sec.is_header && sec.children && sec.children.length > 0) {
                categories.push({ id: `cat-${idx}`, nama: sec.nama, children: sec.children });
            }
        });
        this._startPanelCategories = categories;

        if (categories.length === 0) {
            container.innerHTML = '<div class="py-6 text-center text-xs text-slate-400">Menu tidak tersedia</div>';
            return;
        }

        if (!this.activeStartPanelId || !categories.some((c) => c.id === this.activeStartPanelId)) {
            const matchedCat = categories.find((c) => this._startPanelCatContainsRoute(c, this.currentRoute));
            this.activeStartPanelId = matchedCat ? matchedCat.id : categories[0].id;
        }

        const activeCat = categories.find((c) => c.id === this.activeStartPanelId) || categories[0];

        const leftHtml = categories.map((cat) => `
            <button type="button" data-cat-id="${cat.id}"
                onmouseenter="App.selectStartPanelCat('${cat.id}', event)"
                onfocus="App.selectStartPanelCat('${cat.id}', event)"
                onclick="App.selectStartPanelCat('${cat.id}', event)"
                class="start-panel-cat-btn ${cat.id === activeCat.id ? 'active' : ''}">
                <span class="truncate">${escapeHtml(cat.nama)}</span>
                <i class="ri-arrow-right-s-line text-xs opacity-60"></i>
            </button>
        `).join('');

        const rightHtml = this._buildStartPanelRightHtml(activeCat);

        container.className = 'flex-1 overflow-hidden p-0';
        container.innerHTML = `
            <div class="start-panel-split" data-mobile-view="categories">
                <div class="start-panel-left p-2.5 space-y-1 scrollbar-thin">${leftHtml}</div>
                <div class="start-panel-right p-3 scrollbar-thin">
                    <button type="button" class="start-panel-mobile-back" onclick="App.showStartPanelCategories()">
                        <i class="ri-arrow-left-line"></i><span>Kategori</span>
                    </button>
                    ${rightHtml}
                </div>
            </div>
        `;
    }

    selectStartPanelCat(catId, event = null) {
        if (event && typeof event.stopPropagation === 'function') {
            event.stopPropagation();
        }
        const itemsContainer = document.getElementById('start-menu-items');
        const split = itemsContainer?.querySelector('.start-panel-split');
        if (this.activeStartPanelId === catId) {
            if (split && window.innerWidth <= 680) split.dataset.mobileView = 'detail';
            return;
        }
        this.activeStartPanelId = catId;

        const rightPane = itemsContainer?.querySelector('.start-panel-right');
        const activeCat = (this._startPanelCategories || []).find((c) => c.id === catId);
        if (itemsContainer && rightPane && activeCat) {
            itemsContainer.querySelectorAll('.start-panel-cat-btn').forEach((btn) => {
                btn.classList.toggle('active', btn.dataset.catId === catId);
            });
            rightPane.innerHTML = `
                <button type="button" class="start-panel-mobile-back" onclick="App.showStartPanelCategories()">
                    <i class="ri-arrow-left-line"></i><span>Kategori</span>
                </button>
                ${this._buildStartPanelRightHtml(activeCat)}
            `;
            if (split && window.innerWidth <= 680) split.dataset.mobileView = 'detail';
            rightPane.scrollTop = 0;
            return;
        }
        this.renderWindowsStartMenu();
    }

    showStartPanelCategories() {
        const split = document.querySelector('#start-menu-items .start-panel-split');
        if (split) split.dataset.mobileView = 'categories';
    }

    _renderStartMenuCascading(container, menus) {
        container.className = 'flex-1 overflow-y-auto max-h-[340px] p-3 space-y-2.5 scrollbar-thin';
        let html = '';
        menus.forEach((sec) => {
            if (!sec.is_header || !sec.children || sec.children.length === 0) return;
            html += `
                <div>
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">${escapeHtml(sec.nama)}</div>
                    <div class="start-menu-main-items space-y-0.5">
                        ${sec.children.map((item) => {
                            if (item.children && item.children.length > 0) {
                                return `
                                    <div class="mb-1">
                                        <button type="button" onclick="this.classList.toggle('open'); this.nextElementSibling.classList.toggle('hidden')"
                                            class="start-menu-item start-menu-parent-btn justify-between">
                                            <span class="flex items-center gap-2.5">
                                                <span class="start-menu-icon"><i class="${escapeHtml(item.icon)}"></i></span>
                                                <span>${escapeHtml(item.nama)}</span>
                                            </span>
                                            <i class="ri-arrow-down-s-line start-arrow text-slate-400 text-sm"></i>
                                        </button>
                                        <div class="start-submenu hidden">
                                            ${item.children.map((sub) => `
                                                <a href="${escapeHtml(sub.url)}" data-url="${escapeHtml(sub.url)}" onclick="App.toggleStartMenu(false)"
                                                   class="start-menu-subitem ${this.currentRoute === sub.url ? 'active' : ''}">
                                                    <span class="start-submenu-icon"><i class="${escapeHtml(sub.icon || 'ri-arrow-right-s-line')}"></i></span>
                                                    <span class="truncate">${escapeHtml(sub.nama)}</span>
                                                </a>
                                            `).join('')}
                                        </div>
                                    </div>
                                `;
                            }
                            return `
                                <a href="${escapeHtml(item.url)}" data-url="${escapeHtml(item.url)}" onclick="App.toggleStartMenu(false)"
                                   class="start-menu-item mb-0.5 ${this.currentRoute === item.url ? 'active' : ''}">
                                    <span class="start-menu-icon"><i class="${escapeHtml(item.icon)}"></i></span>
                                    <span>${escapeHtml(item.nama)}</span>
                                </a>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    filterStartMenu(val) {
        this.renderWindowsStartMenu(val);
    }

    // ===== Preferences (Density, Grid Style, Font Size, Date/Number Formats, Theme) =====
}

export function applyWindowsTaskbarMixin(NavigationManager) {
    Object.getOwnPropertyNames(WindowsTaskbarMethods.prototype)
        .filter((k) => k !== 'constructor')
        .forEach((k) => {
            NavigationManager.prototype[k] = WindowsTaskbarMethods.prototype[k];
        });
}
