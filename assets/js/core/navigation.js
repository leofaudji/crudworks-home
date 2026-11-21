// ============================================
// CORE NAVIGATION - Cloudflare Sidebar, Windows Taskbar/Start Menu, Preferences & OmniSearch
// ============================================
import { api } from './api.js';
import { AuthState } from './auth.js';
import { escapeHtml, formatDate, formatRupiah, toast } from './utils.js';

export class NavigationManager {
    constructor(options = {}) {
        this.onRouteRefresh = options.onRouteRefresh || null;
        this.onOpenCalculator = options.onOpenCalculator || null;
        this.onOpenAbout = options.onOpenAbout || null;

        this.currentRoute = '#/dashboard';
        this.isCompactSidebar = false;
        this.navLayout = 'sidebar';
        this.windowsSubmenuStyle = 'panel';
        this.activeStartPanelId = null;

        this._flatMenuItems = [];
        this.openedWindowsTabs = null;
        this._clockInterval = null;

        this._omniResults = [];
        this._omniActiveIdx = 0;
        this._cachedMitraSearch = null;
    }

    initAll() {
        this.initCompactSidebar();
        this.initPreferences();
        this.initNavLayout();
        this.initOutsideClickHandlers();
        this.initOmniSearch();
    }

    // ===== Outside Click Closers =====
    initOutsideClickHandlers() {
        document.addEventListener('click', (e) => {
            if (!e.target || typeof e.target.closest !== 'function' || !e.target.isConnected) return;

            if (!e.target.closest('#topbar-layout-wrapper') && !e.target.closest('#topbar-layout-btn') && !e.target.closest('[onclick*="toggleNavLayoutPicker"]') && !e.target.closest('#nav-layout-dropdown')) {
                const dd = document.getElementById('nav-layout-dropdown');
                if (dd && !dd.classList.contains('hidden')) dd.classList.add('hidden');
            }

            if (!e.target.closest('#topbar-user-menu-wrapper') && !e.target.closest('#topbar-user-dropdown')) {
                const ud = document.getElementById('topbar-user-dropdown');
                if (ud && !ud.classList.contains('hidden')) ud.classList.add('hidden');
            }

            if (!e.target.closest('#windows-start-menu') && !e.target.closest('#taskbar-start-btn')) {
                const sm = document.getElementById('windows-start-menu');
                if (sm && !sm.classList.contains('hidden')) sm.classList.add('hidden');
            }

            if (!e.target.closest('#taskbar-flyout') && !e.target.closest('[data-taskbar-group]')) {
                const fl = document.getElementById('taskbar-flyout');
                if (fl && !fl.classList.contains('hidden')) {
                    fl.classList.add('hidden');
                    fl.dataset.activeGroup = '';
                }
            }
        });
    }

    // ===== Mobile Sidebar Drawer =====
    toggleSidebar(forceState = null) {
        const sb = document.getElementById('sidebar');
        const ov = document.getElementById('sidebar-overlay');
        if (!sb) return;

        const isClosed = sb.classList.contains('-translate-x-full');
        const open = forceState !== null ? forceState : isClosed;

        if (open) {
            sb.classList.remove('-translate-x-full');
            if (ov) ov.classList.remove('hidden');
        } else {
            sb.classList.add('-translate-x-full');
            if (ov) ov.classList.add('hidden');
        }
    }

    // ===== Compact Dock Sidebar =====
    initCompactSidebar() {
        try {
            this.isCompactSidebar = localStorage.getItem('sidebar_compact_mode') === 'true';
        } catch (_) {
            this.isCompactSidebar = false;
        }
        this.applyCompactSidebarState();
    }

    toggleCompactSidebar() {
        this.isCompactSidebar = !this.isCompactSidebar;
        try {
            localStorage.setItem('sidebar_compact_mode', this.isCompactSidebar ? 'true' : 'false');
        } catch (_) {}
        this.applyCompactSidebarState();
    }

    applyCompactSidebarState() {
        const sb = document.getElementById('sidebar');
        const icon = document.getElementById('icon-toggle-compact');
        const btn = document.getElementById('btn-toggle-compact');
        const topbarIcon = document.getElementById('topbar-compact-icon');
        if (!sb) return;

        if (this.isCompactSidebar && window.innerWidth >= 1024) {
            sb.classList.add('compact');
            if (icon) icon.className = 'ri-sidebar-unfold-line text-sm';
            if (btn) btn.title = 'Perluas Sidebar';
            if (topbarIcon) {
                topbarIcon.className = 'ri-layout-left-line text-lg text-primary-600';
                if (topbarIcon.parentElement) topbarIcon.parentElement.title = 'Perluas Sidebar';
            }
        } else {
            sb.classList.remove('compact');
            if (icon) icon.className = 'ri-sidebar-fold-line text-sm';
            if (btn) btn.title = 'Lipat Sidebar (Mode Ramping)';
            if (topbarIcon) {
                topbarIcon.className = 'ri-layout-left-line text-lg text-gray-500';
                if (topbarIcon.parentElement) topbarIcon.parentElement.title = 'Lipat Sidebar (Mode Ramping)';
            }
        }
    }

    // ===== Favorites & Collapsed Sections =====
    getFavoriteMenus() {
        try {
            const arr = JSON.parse(localStorage.getItem('sidebar_favorite_menus') || '[]');
            return Array.isArray(arr) ? arr : [];
        } catch (_) {
            return [];
        }
    }

    toggleFavorite(url, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        let favs = this.getFavoriteMenus();
        if (favs.includes(url)) {
            favs = favs.filter((u) => u !== url);
        } else {
            favs.push(url);
        }
        try {
            localStorage.setItem('sidebar_favorite_menus', JSON.stringify(favs));
        } catch (_) {}
        this.renderMenu();
        this.setActiveMenu(this.currentRoute);
    }

    getCollapsedSections() {
        try {
            const obj = JSON.parse(localStorage.getItem('sidebar_collapsed_sections') || '{}');
            return obj && typeof obj === 'object' ? obj : {};
        } catch (_) {
            return {};
        }
    }

    toggleSection(sectionKey) {
        const content = document.getElementById(`sec-content-${sectionKey}`);
        const chevron = document.getElementById(`sec-chev-${sectionKey}`);
        if (!content) return;

        const isCollapsed = content.classList.toggle('collapsed');
        if (chevron) chevron.classList.toggle('collapsed', isCollapsed);

        const state = this.getCollapsedSections();
        state[sectionKey] = isCollapsed;
        try {
            localStorage.setItem('sidebar_collapsed_sections', JSON.stringify(state));
        } catch (_) {}
    }

    toggleSubmenu(btnEl) {
        if (!btnEl) return;
        const sub = btnEl.nextElementSibling;
        const arrow = btnEl.querySelector('.menu-arrow');
        if (!sub) return;
        const isOpen = sub.classList.toggle('open');
        if (arrow) arrow.style.transform = isOpen ? 'rotate(90deg)' : '';
    }

    // ===== Flatten Menus for Search & Tabs =====
    _buildFlatMenuItems(menus) {
        const list = [];
        const walk = (nodes, sectionName = '') => {
            (nodes || []).forEach((node) => {
                if (node.is_header) {
                    walk(node.children || [], node.nama || '');
                } else if (node.children && node.children.length > 0) {
                    walk(node.children, sectionName || node.nama || '');
                } else if (node.url) {
                    list.push({
                        id: node.id,
                        nama: node.nama,
                        icon: node.icon || 'ri-circle-line',
                        url: node.url,
                        section: sectionName
                    });
                }
            });
        };
        walk(menus);
        this._flatMenuItems = list;
        return list;
    }

    // ===== Cloudflare Sidebar Menu Renderer =====
    renderMenu(menus = AuthState.menus) {
        const nav = document.getElementById('sidebar-menu');
        if (!nav) return;

        const menuList = Array.isArray(menus) ? menus : [];
        const flat = this._buildFlatMenuItems(menuList);
        const favs = this.getFavoriteMenus();
        const collapsedState = this.getCollapsedSections();

        let html = '';

        // 1. Favorites Section
        const favItems = flat.filter((item) => favs.includes(item.url));
        if (favItems.length > 0) {
            html += `
                <div class="sidebar-section sidebar-favorites-section">
                    <div class="sidebar-section-header">
                        <span class="sidebar-section-title text-amber-600 flex items-center gap-1">
                            <i class="ri-star-fill text-[10px]"></i> FAVORIT
                        </span>
                    </div>
                    <div class="sidebar-section-content">
                        ${favItems.map((item) => this._renderLeafItem(item, true, false)).join('')}
                    </div>
                </div>
            `;
        }

        // 2. Dynamic RBAC Sections
        menuList.forEach((section, idx) => {
            if (section.is_header) {
                const secKey = `sec-${idx}`;
                const isCollapsed = Boolean(collapsedState[secKey]);
                const children = section.children || [];
                if (children.length === 0) return;

                html += `
                    <div class="sidebar-section" data-section-idx="${idx}">
                        <button type="button" onclick="App.toggleSection('${secKey}')" class="sidebar-section-header">
                            <span class="sidebar-section-title">${escapeHtml(section.nama)}</span>
                            <i id="sec-chev-${secKey}" class="ri-arrow-down-s-line section-chevron ${isCollapsed ? 'collapsed' : ''}"></i>
                        </button>
                        <div id="sec-content-${secKey}" class="sidebar-section-content ${isCollapsed ? 'collapsed' : ''}">
                            ${this._renderNodes(children, favs)}
                        </div>
                    </div>
                `;
            } else {
                html += this._renderNodes([section], favs);
            }
        });

        // 3. Always add Changelog quick link at bottom of sidebar if menus loaded
        if (menuList.length > 0 && !flat.some((m) => m.url === '#/changelog')) {
            html += `
                <div class="sidebar-section mt-1">
                    ${this._renderLeafItem({
                        nama: 'Catatan Rilis',
                        icon: 'ri-history-line',
                        url: '#/changelog'
                    }, favs.includes('#/changelog'), false)}
                </div>
            `;
        }

        nav.innerHTML = html;
        this.setActiveMenu(this.currentRoute);

        if (this.navLayout !== 'sidebar') {
            this.renderWindowsStartMenu();
            this.renderWindowsTaskbar();
        }
    }

    _renderNodes(nodes, favs) {
        return (nodes || []).map((node) => {
            if (node.children && node.children.length > 0) {
                return `
                    <div class="sidebar-group">
                        <button type="button" onclick="App.toggleSubmenu(this)" class="menu-item w-full justify-between" data-tooltip="${escapeHtml(node.nama)}">
                            <span class="flex items-center gap-2.5 min-w-0">
                                <span class="menu-icon"><i class="${escapeHtml(node.icon || 'ri-folder-line')}"></i></span>
                                <span class="menu-text truncate">${escapeHtml(node.nama)}</span>
                            </span>
                            <i class="ri-arrow-right-s-line menu-arrow"></i>
                        </button>
                        <div class="submenu">
                            ${node.children.map((sub) => this._renderSubItem(sub, favs.includes(sub.url))).join('')}
                        </div>
                    </div>
                `;
            }
            return this._renderLeafItem(node, favs.includes(node.url), true);
        }).join('');
    }

    _renderLeafItem(item, isFav, showStar = true) {
        const url = item.url || '#/dashboard';
        return `
            <a href="${escapeHtml(url)}" data-url="${escapeHtml(url)}" data-tooltip="${escapeHtml(item.nama)}"
               onclick="if(window.innerWidth<1024) App.toggleSidebar(false)"
               class="menu-item group justify-between">
                <span class="flex items-center gap-2.5 min-w-0">
                    <span class="menu-icon"><i class="${escapeHtml(item.icon || 'ri-circle-line')}"></i></span>
                    <span class="menu-text truncate">${escapeHtml(item.nama)}</span>
                </span>
                ${showStar ? `
                <button type="button" onclick="App.toggleFavorite('${escapeHtml(url)}', event)"
                    class="menu-star ${isFav ? 'text-amber-400 opacity-100' : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-amber-400'}"
                    title="${isFav ? 'Hapus dari Favorit' : 'Tambahkan ke Favorit'}">
                    <i class="${isFav ? 'ri-star-fill' : 'ri-star-line'} text-xs"></i>
                </button>` : ''}
            </a>
        `;
    }

    _renderSubItem(sub, isFav) {
        const url = sub.url || '#/dashboard';
        return `
            <a href="${escapeHtml(url)}" data-url="${escapeHtml(url)}" data-tooltip="${escapeHtml(sub.nama)}"
               onclick="if(window.innerWidth<1024) App.toggleSidebar(false)"
               class="submenu-item group">
                <span class="flex items-center gap-2 min-w-0">
                    <i class="${escapeHtml(sub.icon || 'ri-arrow-right-s-line')} text-xs opacity-70 flex-shrink-0"></i>
                    <span class="menu-text truncate">${escapeHtml(sub.nama)}</span>
                </span>
                <button type="button" onclick="App.toggleFavorite('${escapeHtml(url)}', event)"
                    class="menu-star ${isFav ? 'text-amber-400 opacity-100' : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-amber-400'}"
                    title="${isFav ? 'Hapus dari Favorit' : 'Tambahkan ke Favorit'}">
                    <i class="${isFav ? 'ri-star-fill' : 'ri-star-line'} text-[11px]"></i>
                </button>
            </a>
        `;
    }

    setActiveMenu(url) {
        const base = (url || '#/dashboard').split('?')[0];
        this.currentRoute = base;

        // Sidebar links
        document.querySelectorAll('#sidebar-menu [data-url]').forEach((el) => {
            const target = el.getAttribute('data-url');
            const isActive = target === base;
            el.classList.toggle('active', isActive);

            if (isActive && el.classList.contains('submenu-item')) {
                const sub = el.closest('.submenu');
                if (sub && !sub.classList.contains('open')) {
                    sub.classList.add('open');
                    const btn = sub.previousElementSibling;
                    const arrow = btn?.querySelector('.menu-arrow');
                    if (arrow) arrow.style.transform = 'rotate(90deg)';
                }
            }
        });

        // Windows taskbar & start menu
        if (this.navLayout !== 'sidebar') {
            this.renderWindowsTaskbar();
            document.querySelectorAll('#windows-start-menu [data-url]').forEach((el) => {
                el.classList.toggle('active', el.getAttribute('data-url') === base);
            });
        }
    }

    filterMenu(query) {
        const q = (query || '').trim().toLowerCase();
        const nav = document.getElementById('sidebar-menu');
        if (!nav) return;

        const sections = nav.querySelectorAll('.sidebar-section');
        sections.forEach((sec) => {
            const content = sec.querySelector('.sidebar-section-content');
            const items = sec.querySelectorAll('[data-url]');
            let visibleInSec = 0;

            items.forEach((link) => {
                const text = (link.textContent || '').trim().toLowerCase();
                const match = !q || text.includes(q);
                link.style.display = match ? '' : 'none';
                if (match) visibleInSec++;
            });

            // Handle submenu parent visibility
            sec.querySelectorAll('.sidebar-group').forEach((grp) => {
                const subLinks = grp.querySelectorAll('.submenu-item');
                const anyVisible = Array.from(subLinks).some((l) => l.style.display !== 'none');
                grp.style.display = anyVisible ? '' : 'none';
                const sub = grp.querySelector('.submenu');
                if (q && anyVisible && sub) {
                    sub.classList.add('open');
                }
            });

            if (q) {
                sec.style.display = visibleInSec > 0 ? '' : 'none';
                if (visibleInSec > 0 && content) content.classList.remove('collapsed');
            } else {
                sec.style.display = '';
            }
        });
    }

    // ===== Navigation Layout Modes (Sidebar / Bottom Taskbar / Top Taskbar) =====
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
        if (existingIndex !== -1) {
            const [existing] = this.openedWindowsTabs.splice(existingIndex, 1);
            if (baseHash === '#/dashboard') this.openedWindowsTabs.unshift(existing);
            else this.openedWindowsTabs.push(existing);
        } else {
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
    initPreferences() {
        this.initDarkMode();
        this.initFontSize();
        this.initTableDensity();
        this.initTableGridStyle();

        const savedTheme = localStorage.getItem('app_theme') || 'orange';
        if (window.THEMES && window.THEMES[savedTheme] && typeof window.applyTheme === 'function') {
            window.applyTheme(savedTheme);
        }
    }

    initDarkMode() {
        const saved = localStorage.getItem('app_dark_mode') || 'light';
        this.applyDarkMode(saved, false);

        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                const cur = localStorage.getItem('app_dark_mode') || 'light';
                if (cur === 'system') {
                    this.applyDarkMode('system', false);
                }
            });
        }
    }

    applyDarkMode(mode, notify = true) {
        const valid = ['light', 'dark', 'system'].includes(mode) ? mode : 'light';
        let isDark = false;
        if (valid === 'dark') {
            isDark = true;
        } else if (valid === 'system') {
            isDark = Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        } else {
            isDark = false;
        }

        document.documentElement.classList.toggle('dark', isDark);
        if (document.body) document.body.classList.toggle('dark', isDark);
        try { localStorage.setItem('app_dark_mode', valid); } catch (_) {}

        const icon = document.getElementById('topbar-theme-icon');
        if (icon) {
            icon.className = isDark ? 'ri-sun-line text-xl text-amber-400' : 'ri-moon-line text-xl text-slate-500';
        }

        if (notify) {
            const labels = { light: 'Mode Terang (Light)', dark: 'Mode Gelap (Dark)', system: 'Otomatis (Ikuti Sistem)' };
            toast(`Tema: ${labels[valid]}`, 'success', 1500);
        }
    }

    toggleDarkMode() {
        const isDark = document.documentElement.classList.contains('dark');
        const next = isDark ? 'light' : 'dark';
        this.applyDarkMode(next, true);
        this.renderPreferencesModalContent();
    }

    initFontSize() {
        const size = localStorage.getItem('pref_font_size') || 'normal';
        this.applyFontSize(size, false);
    }

    applyFontSize(size, notify = true) {
        const map = { small: '13px', normal: '14px', large: '15px', xl: '16px' };
        const valid = map[size] ? size : 'normal';
        document.documentElement.style.fontSize = map[valid];
        document.documentElement.classList.remove('font-size-small', 'font-size-normal', 'font-size-large', 'font-size-xl');
        document.documentElement.classList.add(`font-size-${valid}`);
        try { localStorage.setItem('pref_font_size', valid); } catch (_) {}
        if (notify) toast('Ukuran huruf diperbarui', 'success', 1500);
    }

    renderDensityToggle() {
        const isCompact = (localStorage.getItem('keuangan_table_density') || 'comfortable') === 'compact';
        return `
            <button type="button" onclick="App.toggleTableDensity()" data-density-toggle="1"
                class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5 transition"
                title="Ubah Kerapatan Tabel (Padat / Nyaman)">
                <i class="${isCompact ? 'ri-table-fill text-primary-600' : 'ri-table-line'} text-sm"></i>
                <span class="hidden sm:inline">${isCompact ? 'Padat' : 'Nyaman'}</span>
            </button>
        `;
    }

    initTableDensity() {
        const density = localStorage.getItem('keuangan_table_density') || 'comfortable';
        this.applyTableDensity(density, false);
    }

    toggleTableDensity() {
        const cur = localStorage.getItem('keuangan_table_density') || 'comfortable';
        const next = cur === 'compact' ? 'comfortable' : 'compact';
        this.applyTableDensity(next, true);
    }

    applyTableDensity(mode, notify = false) {
        let targetMode = mode;
        if (!targetMode) {
            try { targetMode = localStorage.getItem('keuangan_table_density') || 'comfortable'; } catch (_) { targetMode = 'comfortable'; }
        }
        const valid = targetMode === 'compact' ? 'compact' : 'comfortable';
        document.body.classList.toggle('table-compact-mode', valid === 'compact');
        document.body.setAttribute('data-table-density', valid);
        try { localStorage.setItem('keuangan_table_density', valid); } catch (_) {}

        const icon = document.getElementById('topbar-density-icon');
        if (icon) {
            icon.className = valid === 'compact'
                ? 'ri-table-fill text-xl text-primary-600'
                : 'ri-table-line text-xl';
        }
        document.querySelectorAll('[data-density-toggle="1"]').forEach((btn) => {
            const i = btn.querySelector('i');
            const span = btn.querySelector('span');
            if (i) i.className = `${valid === 'compact' ? 'ri-table-fill text-primary-600' : 'ri-table-line'} text-sm`;
            if (span) span.textContent = valid === 'compact' ? 'Padat' : 'Nyaman';
        });
        if (notify) {
            toast(`Kerapatan tabel: ${valid === 'compact' ? 'Padat (Compact)' : 'Nyaman (Comfortable)'}`, 'info', 1500);
        }
    }

    initTableGridStyle() {
        const saved = localStorage.getItem('pref_table_grid_style') || 'zebra';
        this.applyTableGridStyle(saved, false);
    }

    applyTableGridStyle(style, notify = true) {
        const valid = ['zebra', 'bordered', 'minimal'].includes(style) ? style : 'zebra';
        document.body.classList.remove('table-grid-zebra', 'table-grid-bordered', 'table-grid-minimal');
        document.body.classList.add(`table-grid-${valid}`);
        document.body.setAttribute('data-table-grid', valid);
        try { localStorage.setItem('pref_table_grid_style', valid); } catch (_) {}
        if (notify) toast('Gaya garis tabel diperbarui', 'success', 1500);
    }

    setFormatPref(key, value) {
        try { localStorage.setItem(key, value); } catch (_) {}
        this.renderPreferencesModalContent();
        if (typeof this.onRouteRefresh === 'function') {
            this.onRouteRefresh();
        }
        toast('Format tampilan diperbarui', 'success', 1500);
    }

    openPreferencesModal() {
        const modal = document.getElementById('preferences-modal');
        if (!modal) return;
        this.renderPreferencesModalContent();
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.pref-dialog-card')?.classList.remove('scale-95');
        });
    }

    closePreferencesModal() {
        const modal = document.getElementById('preferences-modal');
        if (!modal) return;
        modal.classList.add('opacity-0');
        modal.querySelector('.pref-dialog-card')?.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 200);
    }

    renderPreferencesModalContent() {
        const body = document.getElementById('pref-modal-body');
        if (!body) return;

        const curLayout = this.navLayout;
        const curWinSub = this.windowsSubmenuStyle;
        const curTheme = localStorage.getItem('app_theme') || 'orange';
        const curDarkMode = localStorage.getItem('app_dark_mode') || 'light';
        const curFontSize = localStorage.getItem('pref_font_size') || 'normal';
        const curDensity = localStorage.getItem('keuangan_table_density') || 'comfortable';
        const curGridStyle = localStorage.getItem('pref_table_grid_style') || 'zebra';
        const curDateFormat = localStorage.getItem('pref_date_format') || 'dmy';
        const curSeparator = localStorage.getItem('pref_num_separator') || 'id';
        const curDecimals = localStorage.getItem('pref_num_decimals') || '0';
        const curSymbol = localStorage.getItem('pref_num_currency_symbol') !== null
            ? localStorage.getItem('pref_num_currency_symbol')
            : 'Rp ';

        const themes = window.THEMES || {};
        const sampleAmount = formatRupiah(15750000);
        const sampleDate = formatDate('2026-11-11');

        body.innerHTML = `
            <div class="space-y-6">
                <!-- Live Preview Strip -->
                <div class="p-4 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border border-slate-800">
                    <div>
                        <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Pratinjau Format Aktif</p>
                        <p class="text-sm font-bold mt-0.5 font-mono text-emerald-400">${escapeHtml(sampleAmount)}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Tanggal</p>
                        <p class="text-xs font-semibold mt-0.5 text-slate-200">${escapeHtml(sampleDate)}</p>
                    </div>
                </div>

                <!-- 1. Mode Tampilan (Light / Dark Mode) -->
                <div>
                    <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <i class="ri-contrast-2-line text-primary-600"></i> Mode Tampilan (Light / Dark Mode)
                    </h4>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        ${[
                            { id: 'light', name: 'Mode Terang (Light)', desc: 'Latar belakang putih cerah & bersih', icon: 'ri-sun-line', iconColor: 'text-amber-500' },
                            { id: 'dark', name: 'Mode Gelap (Dark)', desc: 'Latar gelap, nyaman untuk mata', icon: 'ri-moon-line', iconColor: 'text-indigo-400' },
                            { id: 'system', name: 'Otomatis (Sistem)', desc: 'Menyesuaikan tema perangkat OS', icon: 'ri-computer-line', iconColor: 'text-slate-400' }
                        ].map((m) => `
                            <button type="button" onclick="App.applyDarkMode('${m.id}', true); App.renderPreferencesModalContent();"
                                class="p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${curDarkMode === m.id ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/40 ring-2 ring-primary-500/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'}">
                                <i class="${m.icon} ${m.iconColor} text-lg mt-0.5"></i>
                                <div class="min-w-0 flex-1">
                                    <div class="text-xs font-bold text-slate-800 dark:text-slate-100">${m.name}</div>
                                    <div class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">${m.desc}</div>
                                </div>
                                ${curDarkMode === m.id ? '<i class="ri-check-line text-primary-600 font-bold shrink-0"></i>' : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- 2. Tata Letak Navigasi -->
                <div>
                    <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">Tata Letak Menu</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        ${[
                            { id: 'sidebar', name: 'Sidebar Kiri', desc: 'Navigasi klasik Cloudflare', icon: 'ri-layout-left-line' },
                            { id: 'bottom', name: 'Taskbar Bawah', desc: 'Windows bar & Start Menu', icon: 'ri-layout-bottom-line' },
                            { id: 'top', name: 'Bilah Atas', desc: 'Taskbar bar di bagian atas', icon: 'ri-layout-top-line' }
                        ].map((l) => `
                            <button type="button" onclick="App.setNavLayout('${l.id}'); App.renderPreferencesModalContent();"
                                class="p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${curLayout === l.id ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/40 ring-2 ring-primary-500/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'}">
                                <i class="${l.icon} text-lg ${curLayout === l.id ? 'text-primary-600' : 'text-slate-500'}"></i>
                                <div>
                                    <div class="text-xs font-bold text-slate-800 dark:text-slate-100">${l.name}</div>
                                    <div class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">${l.desc}</div>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- 3. Gaya Start Menu Windows -->
                <div>
                    <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">Gaya Submenu Start Menu (Mode Taskbar)</h4>
                    <div class="grid grid-cols-2 gap-2.5">
                        ${[
                            { id: 'panel', name: 'Gaya Panel (2 Kolom)', desc: 'Kategori di kiri, detail di kanan', icon: 'ri-layout-column-line' },
                            { id: 'cascading', name: 'Gaya Akordeon', desc: 'Daftar bertingkat vertikal', icon: 'ri-node-tree' }
                        ].map((s) => `
                            <button type="button" onclick="App.setWindowsSubmenuStyle('${s.id}'); App.renderPreferencesModalContent();"
                                class="p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${curWinSub === s.id ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/40 ring-2 ring-primary-500/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'}">
                                <i class="${s.icon} text-lg ${curWinSub === s.id ? 'text-primary-600' : 'text-slate-500'}"></i>
                                <div>
                                    <div class="text-xs font-bold text-slate-800 dark:text-slate-100">${s.name}</div>
                                    <div class="text-[10px] text-slate-500 dark:text-slate-400">${s.desc}</div>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- 4. Tema Warna -->
                <div>
                    <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">Tema Warna Aplikasi</h4>
                    <div class="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        ${Object.entries(themes).map(([key, th]) => `
                            <button type="button" onclick="window.applyTheme('${key}'); App.renderPreferencesModalContent();"
                                class="p-2 rounded-xl border flex flex-col items-center gap-1.5 transition ${curTheme === key ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 ring-2 ring-slate-900/15 dark:ring-white/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'}">
                                <span class="w-6 h-6 rounded-full shadow-xs border border-white dark:border-slate-900" style="background:${th.shade}"></span>
                                <span class="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate w-full text-center">${th.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- 5. Tabel: Kerapatan & Garis Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Kerapatan Baris Tabel</h4>
                        <div class="grid grid-cols-2 gap-2">
                            <button type="button" onclick="App.applyTableDensity('comfortable', true); App.renderPreferencesModalContent();"
                                class="px-3 py-2.5 rounded-xl border text-xs font-semibold transition ${curDensity === 'comfortable' ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}">
                                Nyaman (Standard)
                            </button>
                            <button type="button" onclick="App.applyTableDensity('compact', true); App.renderPreferencesModalContent();"
                                class="px-3 py-2.5 rounded-xl border text-xs font-semibold transition ${curDensity === 'compact' ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}">
                                Padat (Compact)
                            </button>
                        </div>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Gaya Garis Tabel</h4>
                        <div class="grid grid-cols-3 gap-2">
                            ${[
                                { id: 'zebra', label: 'Zebra' },
                                { id: 'bordered', label: 'Grid Penuh' },
                                { id: 'minimal', label: 'Minimalis' }
                            ].map((g) => `
                                <button type="button" onclick="App.applyTableGridStyle('${g.id}'); App.renderPreferencesModalContent();"
                                    class="px-2.5 py-2.5 rounded-xl border text-xs font-semibold transition ${curGridStyle === g.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}">
                                    ${g.label}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- 6. Format Tanggal, Angka & Ukuran Huruf -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Format Tanggal</h4>
                        <select onchange="App.setFormatPref('pref_date_format', this.value)"
                            class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl font-medium focus:outline-none focus:border-primary-500">
                            <option value="dmy" ${curDateFormat === 'dmy' ? 'selected' : ''}>DD/MM/YYYY (11/11/2026)</option>
                            <option value="ymd" ${curDateFormat === 'ymd' ? 'selected' : ''}>YYYY-MM-DD (2026-11-11)</option>
                            <option value="long" ${curDateFormat === 'long' ? 'selected' : ''}>11 Nov 2026</option>
                            <option value="full" ${curDateFormat === 'full' ? 'selected' : ''}>11 November 2026</option>
                        </select>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Ukuran Huruf</h4>
                        <div class="grid grid-cols-4 gap-1.5">
                            ${[
                                { id: 'small', label: 'Kecil' },
                                { id: 'normal', label: 'Normal' },
                                { id: 'large', label: 'Besar' },
                                { id: 'xl', label: 'XL' }
                            ].map((f) => `
                                <button type="button" onclick="App.applyFontSize('${f.id}'); App.renderPreferencesModalContent();"
                                    class="py-2 rounded-xl border text-xs font-semibold transition ${curFontSize === f.id ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600'}">
                                    ${f.label}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Pemisah Ribuan</h4>
                        <select onchange="App.setFormatPref('pref_num_separator', this.value)"
                            class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium">
                            <option value="id" ${curSeparator === 'id' ? 'selected' : ''}>Titik (1.000.000,00)</option>
                            <option value="en" ${curSeparator === 'en' ? 'selected' : ''}>Koma (1,000,000.00)</option>
                        </select>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Desimal</h4>
                        <select onchange="App.setFormatPref('pref_num_decimals', this.value)"
                            class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium">
                            <option value="0" ${curDecimals === '0' ? 'selected' : ''}>0 Desimal (Bulat)</option>
                            <option value="2" ${curDecimals === '2' ? 'selected' : ''}>2 Desimal (,00)</option>
                        </select>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Simbol Mata Uang</h4>
                        <select onchange="App.setFormatPref('pref_num_currency_symbol', this.value)"
                            class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium">
                            <option value="Rp " ${curSymbol === 'Rp ' ? 'selected' : ''}>Rp (Dengan Spasi)</option>
                            <option value="IDR " ${curSymbol === 'IDR ' ? 'selected' : ''}>IDR</option>
                            <option value="" ${curSymbol === '' ? 'selected' : ''}>Tanpa Simbol</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    resetPreferences() {
        try {
            [
                'app_nav_layout',
                'app_windows_submenu_style',
                'app_theme',
                'app_dark_mode',
                'pref_font_size',
                'keuangan_table_density',
                'pref_table_grid_style',
                'pref_date_format',
                'pref_num_separator',
                'pref_num_decimals',
                'pref_num_currency_symbol'
            ].forEach((k) => localStorage.removeItem(k));
        } catch (_) {}

        this.applyDarkMode('light', false);
        this.setNavLayout('sidebar');
        this.setWindowsSubmenuStyle('panel', false);
        if (typeof window.applyTheme === 'function') window.applyTheme('orange');
        this.applyFontSize('normal', false);
        this.applyTableDensity('comfortable', false);
        this.applyTableGridStyle('zebra', false);
        this.renderPreferencesModalContent();
        if (typeof this.onRouteRefresh === 'function') this.onRouteRefresh();
        toast('Preferensi dikembalikan ke setelan awal', 'success', 2000);
    }

    // ===== OmniSearch (Ctrl+K) =====
    initOmniSearch() {
        const input = document.getElementById('omni-search-input');
        if (!input) return;

        input.addEventListener('input', () => {
            this.renderOmniSearchResults(input.value);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this._omniResults.length > 0) {
                    this._omniActiveIdx = (this._omniActiveIdx + 1) % this._omniResults.length;
                    this._highlightOmniItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this._omniResults.length > 0) {
                    this._omniActiveIdx = (this._omniActiveIdx - 1 + this._omniResults.length) % this._omniResults.length;
                    this._highlightOmniItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const picked = this._omniResults[this._omniActiveIdx];
                if (picked) this._executeOmniItem(picked);
            }
        });
    }

    toggleSearch(forceOpen = null) {
        const modal = document.getElementById('omni-search-modal');
        const content = document.getElementById('omni-search-content');
        const input = document.getElementById('omni-search-input');
        if (!modal) return;

        const isHidden = modal.classList.contains('hidden');
        const open = forceOpen !== null ? forceOpen : isHidden;

        if (open) {
            modal.classList.remove('hidden');
            requestAnimationFrame(() => {
                modal.classList.remove('opacity-0');
                content?.classList.remove('scale-95');
            });
            if (input) {
                input.value = '';
                setTimeout(() => input.focus(), 50);
            }
            this.renderOmniSearchResults('');
            // Prefetch clients list softly for quick search
            if (!this._cachedClientSearch) {
                api('clients?limit=50', { silent: true }).then((res) => {
                    if (res && res.success && Array.isArray(res.data)) {
                        this._cachedClientSearch = res.data;
                        if (!modal.classList.contains('hidden') && input && input.value) {
                            this.renderOmniSearchResults(input.value);
                        }
                    }
                });
            }
        } else {
            modal.classList.add('opacity-0');
            content?.classList.add('scale-95');
            setTimeout(() => modal.classList.add('hidden'), 200);
        }
    }

    renderOmniSearchResults(query = '') {
        const container = document.getElementById('omni-search-results');
        if (!container) return;

        const q = (query || '').trim().toLowerCase();
        const items = [];

        // Menus
        this._flatMenuItems.forEach((m) => {
            if (!q || m.nama.toLowerCase().includes(q) || m.section.toLowerCase().includes(q)) {
                items.push({
                    type: 'menu',
                    title: m.nama,
                    subtitle: m.section || 'Navigasi Halaman',
                    icon: m.icon,
                    url: m.url
                });
            }
        });

        // Quick Actions
        const quickActions = [
            { title: '+ Buat Tagihan / Faktur Baru', subtitle: 'Penerbitan invoice tagihan pelanggan', icon: 'ri-file-add-line', action: 'new_inv' },
            { title: '+ Catat Pembayaran Tagihan', subtitle: 'Pencatatan pembayaran & bukti transfer', icon: 'ri-money-dollar-circle-line', action: 'new_pay' },
            { title: '+ Tambah Pelanggan Baru', subtitle: 'Pendaftaran klien & PIC kontak', icon: 'ri-user-add-line', action: 'new_client' },
            { title: '+ Tambah Proyek Baru', subtitle: 'Hubungkan aplikasi app-git ke pelanggan', icon: 'ri-git-branch-line', action: 'new_project' },
            { title: 'Preferensi Tampilan', subtitle: 'Atur tata letak, tema, format tanggal & angka', icon: 'ri-equalizer-line', action: 'pref' },
            { title: 'Tentang Sistem & Catatan Rilis', subtitle: 'Lihat versi aplikasi dan changelog', icon: 'ri-information-line', action: 'about' }
        ];
        quickActions.forEach((act) => {
            if (!q || act.title.toLowerCase().includes(q) || act.subtitle.toLowerCase().includes(q)) {
                items.push({ type: 'action', ...act });
            }
        });

        // Client matches
        if (q && Array.isArray(this._cachedClientSearch)) {
            this._cachedClientSearch.forEach((cl) => {
                const label = `${cl.kode || ''} ${cl.nama || ''} ${cl.perusahaan || ''}`.toLowerCase();
                if (label.includes(q)) {
                    items.push({
                        type: 'menu',
                        title: `Pelanggan: ${cl.nama}`,
                        subtitle: `${cl.kode || ''} • ${cl.perusahaan || 'Individu'} • ${cl.telepon || ''}`,
                        icon: 'ri-building-line',
                        url: '#/clients'
                    });
                }
            });
        }

        this._omniResults = items.slice(0, 12);
        this._omniActiveIdx = 0;

        if (this._omniResults.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center text-slate-400">
                    <i class="ri-search-eye-line text-3xl mb-2 block opacity-40"></i>
                    <p class="text-xs font-medium">Tidak ada hasil untuk "<strong>${escapeHtml(query)}</strong>"</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="space-y-1">
                ${this._omniResults.map((item, i) => `
                    <button type="button" data-omni-idx="${i}"
                        class="omni-item w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition ${i === 0 ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'}">
                        <div class="w-8 h-8 rounded-lg ${i === 0 ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500'} flex items-center justify-center flex-shrink-0">
                            <i class="${escapeHtml(item.icon)} text-base"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-xs font-bold truncate">${escapeHtml(item.title)}</div>
                            <div class="text-[11px] text-slate-400 truncate">${escapeHtml(item.subtitle)}</div>
                        </div>
                        <span class="text-[10px] font-bold uppercase text-slate-400 px-2 py-0.5 rounded bg-white border border-slate-200/70">
                            ${item.type === 'action' ? 'Aksi' : 'Buka'}
                        </span>
                    </button>
                `).join('')}
            </div>
        `;

        container.querySelectorAll('[data-omni-idx]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-omni-idx'), 10);
                const picked = this._omniResults[idx];
                if (picked) this._executeOmniItem(picked);
            });
        });
    }

    _highlightOmniItem() {
        document.querySelectorAll('#omni-search-results [data-omni-idx]').forEach((btn, idx) => {
            const active = idx === this._omniActiveIdx;
            btn.className = `omni-item w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition ${active ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'}`;
            if (active) btn.scrollIntoView({ block: 'nearest' });
        });
    }

    _executeOmniItem(item) {
        this.toggleSearch(false);
        if (item.type === 'menu' && item.url) {
            window.location.hash = item.url;
        } else if (item.action === 'new_inv') {
            window.location.hash = '#/invoices';
            setTimeout(() => window.InvoicesPage?.openForm?.(), 220);
        } else if (item.action === 'new_pay') {
            window.location.hash = '#/payments';
            setTimeout(() => window.PaymentsPage?.openForm?.(), 220);
        } else if (item.action === 'new_client') {
            window.location.hash = '#/clients';
            setTimeout(() => window.ClientsPage?.openForm?.(), 220);
        } else if (item.action === 'new_project') {
            window.location.hash = '#/projects';
            setTimeout(() => window.ProjectsPage?.openForm?.(), 220);
        } else if (item.action === 'calc' && typeof this.onOpenCalculator === 'function') {
            this.onOpenCalculator(true);
        } else if (item.action === 'pref') {
            this.openPreferencesModal();
        } else if (item.action === 'about' && typeof this.onOpenAbout === 'function') {
            this.onOpenAbout();
        }
    }
}
