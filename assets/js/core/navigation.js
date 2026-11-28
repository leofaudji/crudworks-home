// ============================================
// CORE NAVIGATION - Cloudflare Sidebar, Windows Taskbar/Start Menu, Preferences & OmniSearch
// ============================================
import { api } from './api.js';
import { AuthState } from './auth.js';
import { escapeHtml, formatDate, formatRupiah, toast } from './utils.js';
import { applyWindowsTaskbarMixin } from './windows-taskbar.js';

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
        this.refreshNavBadges();
    }

    async refreshNavBadges() {
        if (!this.user || typeof this.api !== 'function') return;
        const now = Date.now();
        if (this._lastNavBadgeFetch && (now - this._lastNavBadgeFetch) < 30000) {
            this._applyNavBadges(this._lastNavBadgeCounts || {});
            return;
        }
        this._lastNavBadgeFetch = now;
        try {
            const res = await this.api('dashboard/action_queue', { cache: false, silent: true });
            if (res && res.success && res.data) {
                const q = res.data;
                this._lastNavBadgeCounts = {
                    '#/invoices': (q.pending_proofs || []).length,
                    '#/tickets': (q.open_tickets || []).length
                };
                this._applyNavBadges(this._lastNavBadgeCounts);
            }
        } catch (_) {}
    }

    _applyNavBadges(counts) {
        Object.entries(counts).forEach(([url, count]) => {
            document.querySelectorAll(`[data-url="${url}"]`).forEach((link) => {
                let badge = link.querySelector('.nav-action-badge');
                if (count > 0) {
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'nav-action-badge ml-auto px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold leading-none shrink-0';
                        link.appendChild(badge);
                    }
                    badge.textContent = String(count);
                } else if (badge) {
                    badge.remove();
                }
            });
        });
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
    initPreferences() {
        this.initDarkMode();
        this.initFontSize();
        this.initTableDensity();
        this.initTableGridStyle();
        this.initReducedMotion();

        const savedTheme = localStorage.getItem('app_theme') || 'orange';
        if (window.THEMES && window.THEMES[savedTheme] && typeof window.applyTheme === 'function') {
            window.applyTheme(savedTheme);
        }
    }

    initReducedMotion() {
        const enabled = localStorage.getItem('pref_reduced_motion') === '1';
        this.applyReducedMotion(enabled, false);
    }

    applyReducedMotion(enabled, notify = true) {
        const isOn = enabled === true || enabled === '1';
        document.documentElement.classList.toggle('reduce-motion', isOn);
        try { localStorage.setItem('pref_reduced_motion', isOn ? '1' : '0'); } catch (_) {}
        if (notify) toast(isOn ? 'Mode instan (animasi diminimalkan) aktif' : 'Animasi standar diaktifkan', 'success', 1500);
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

    async renderPreferencesModalContent() {
        const mod = await import('./preferences-modal.js');
        mod.renderPreferencesModalContent(this);
    }

    async resetPreferences() {
        const mod = await import('./preferences-modal.js');
        mod.resetPreferences(this);
    }

    // ===== OmniSearch (Ctrl+K, Lazy-loaded) =====
    initOmniSearch() {
        // Bound lazily on first toggleSearch
    }

    async toggleSearch(forceOpen = null) {
        const mod = await import('./omnisearch.js');
        mod.toggleSearch(this, forceOpen);
    }

    async renderOmniSearchResults(query = '') {
        const mod = await import('./omnisearch.js');
        mod.renderOmniSearchResults(this, query);
    }
}


applyWindowsTaskbarMixin(NavigationManager);
