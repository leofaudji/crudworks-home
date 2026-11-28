// ============================================
// APP ENTRY MODULE - CRUDWorks ERP SPA Orchestrator
// ============================================
import { api, apiClient, cachedApi, clearApiCache } from './core/api.js';
import { AuthState, checkSession, hasPerm, login as authLogin, logout as authLogout, setCsrfToken, setUserSession } from './core/auth.js';
import { enhanceDataTables, initDataTableObserver, refreshDataTables } from './core/datatable.js';
import { enhanceCurrencyInputs, initCurrencyObserver } from './core/currency.js';
import { enhanceDateInputs, initDatePickerObserver } from './core/datepicker.js';
import { enhanceSelects, initSelectObserver } from './core/select.js';
import { Router } from './core/router.js';
import { profileModalMethods } from './core/profile-modal.js';
import {
    btnLoading,
    closeAllAutocompletes,
    closeDrawer,
    closeModal,
    closeReportExportMenus,
    closeReportPreview,
    closeTableActionMenu,
    compressImageFile,
    confirmAction,
    promptAction,
    debounce,
    escapeHtml,
    exportCsv,
    exportPdf,
    formatDate,
    formatDateTime,
    formatNumber,
    formatPercent,
    formatRupiah,
    formatIDR,
    initAutocompletes,
    openDrawer,
    openModal,
    openPdfModal,
    generateInvoicePdf,
    generatePaymentReceiptPdf,
    generateClientStatementPdf,
    generateQuotationPdf,
    generateBastPdf,
    downloadQuotationWord,
    parseTimelineStages,
    parseTimelineGantt,
    renderTimelineDiagramHtml,
    renderStatusBadge,
    formatWhatsAppPhone,
    openWhatsApp,
    renderPagination,
    openWhatsAppInvoiceReminder,
    openWhatsAppQuotation,
    openReportCsvPreview,
    openReportPdfPreview,
    getDefaultPerPage,
    quickDateChipsHtml,
    refreshAutocomplete,
    reportExportDropdownHtml,
    resolveDatePreset,
    setRefreshing,
    swapSmooth,
    tableActionBtnHtml,
    terbilang,
    toast,
    toggleReportExportMenu,
    toggleTableActionMenu
} from './core/utils.js';

const APP_VERSION = (typeof window !== 'undefined' && window.APP_VERSION && !window.APP_VERSION.includes('{{')) ? window.APP_VERSION : '1.1.0';
const APP_CACHE_BUST = (typeof window !== 'undefined' && window.APP_CACHE_BUST && !window.APP_CACHE_BUST.includes('{{')) ? window.APP_CACHE_BUST : APP_VERSION;
const { NavigationManager } = await import(`./core/navigation.js?v=${encodeURIComponent(APP_CACHE_BUST)}`);

const router = new Router({ version: APP_CACHE_BUST });
const nav = new NavigationManager({
    onRouteRefresh: () => router.handleRoute(),
    onOpenCalculator: (open) => App.toggleCalculator(open),
    onOpenAbout: () => App.showAboutModal('info')
});

router.onRouteChange = (parsed) => {
    nav.setActiveMenu(parsed.baseHash);
    nav.addOpenedWindowsTab(parsed.baseHash);
};

let deferredInstallPrompt = null;

const App = {
    version: APP_VERSION,
    settings: {},
    _aboutActiveTab: 'info',
    _cachedChangelog: null,

    // Reactive getters bound to AuthState
    get user() { return AuthState.user; },
    get menus() { return AuthState.menus; },
    get permissions() { return AuthState.permissions; },
    get csrfToken() { return AuthState.csrfToken; },
    get currentRoute() { return router.currentRoute; },
    get API_BASE() { return apiClient.API_BASE; },
    get isCompactSidebar() { return nav.isCompactSidebar; },

    // Core Utilities exposed for inline handlers & page ES modules
    api,
    cachedApi,
    clearApiCache,
    hasPerm,
    setCsrfToken,
    formatRupiah,
    formatIDR: formatRupiah,
    formatNumber,
    formatPercent,
    formatDate,
    formatDateTime,
    escapeHtml,
    debounce,
    toast,
    openModal,
    openPdfModal,
    generateInvoicePdf,
    generatePaymentReceiptPdf,
    generateClientStatementPdf,
    generateQuotationPdf,
    generateBastPdf,
    downloadQuotationWord,
    parseTimelineStages,
    parseTimelineGantt,
    renderTimelineDiagramHtml,
    renderStatusBadge,
    formatWhatsAppPhone,
    openWhatsApp,
    renderPagination,
    openWhatsAppInvoiceReminder,
    openWhatsAppQuotation,
    closeModal,
    openDrawer,
    closeDrawer,
    initAutocompletes,
    refreshAutocomplete,
    closeAllAutocompletes,
    confirm: confirmAction,
    confirmAction,
    prompt: promptAction,
    promptAction,
    terbilang,
    btnLoading,
    exportCsv,
    exportPdf,
    reportExportDropdownHtml,
    toggleReportExportMenu,
    closeReportExportMenus,
    openReportPdfPreview,
    openReportCsvPreview,
    closeReportPreview,
    getDefaultPerPage,
    setRefreshing,
    swapSmooth,
    resolveDatePreset,
    quickDateChipsHtml,
    compressImageFile,
    enhanceTables: enhanceDataTables,
    refreshTables: refreshDataTables,
    enhanceCurrencyInputs,
    enhanceDateInputs,
    enhanceSelects,
    parseTimelineStages,
    parseTimelineGantt,
    renderTimelineDiagramHtml,

    // Navigation & Preferences delegates
    toggleSidebar: (force) => nav.toggleSidebar(force),
    toggleCompactSidebar: () => nav.toggleCompactSidebar(),
    toggleSection: (key) => nav.toggleSection(key),
    toggleSubmenu: (btn) => nav.toggleSubmenu(btn),
    toggleFavorite: (url, e) => nav.toggleFavorite(url, e),
    filterMenu: (q) => nav.filterMenu(q),
    setNavLayout: (mode) => nav.setNavLayout(mode),
    toggleNavLayoutPicker: (e) => nav.toggleNavLayoutPicker(e),
    setWindowsSubmenuStyle: (style, show) => nav.setWindowsSubmenuStyle(style, show),
    toggleStartMenu: (e) => nav.toggleStartMenu(e),
    selectStartPanelCat: (id, e) => nav.selectStartPanelCat(id, e),
    showStartPanelCategories: () => nav.showStartPanelCategories(),
    filterStartMenu: (v) => nav.filterStartMenu(v),
    closeTaskbarFlyout: () => nav.closeTaskbarFlyout(),
    closeWindowsTab: (url, e) => nav.closeWindowsTab(url, e),
    toggleTableDensity: () => nav.toggleTableDensity(),
    renderDensityToggle: () => nav.renderDensityToggle(),
    applyTableDensity: (m, n) => nav.applyTableDensity(m, n),
    applyTableGridStyle: (s, n) => nav.applyTableGridStyle(s, n),
    applyFontSize: (s, n) => nav.applyFontSize(s, n),
    applyReducedMotion: (e, n) => nav.applyReducedMotion(e, n),
    applyDarkMode: (m, n) => nav.applyDarkMode(m, n),
    toggleDarkMode: () => nav.toggleDarkMode(),
    setFormatPref: (k, v) => nav.setFormatPref(k, v),
    openPreferencesModal: () => nav.openPreferencesModal(),
    closePreferencesModal: () => nav.closePreferencesModal(),
    renderPreferencesModalContent: () => nav.renderPreferencesModalContent(),
    resetPreferences: () => nav.resetPreferences(),
    toggleSearch: (open) => nav.toggleSearch(open),
    refreshRoute: () => router.handleRoute(),
    openDailyBriefModal: () => App.openDailyBriefModal(),
    closeDailyBriefModal: () => App.closeDailyBriefModal(),
    refreshDailyBriefData: () => App.refreshDailyBriefData(),
    copyDailyBriefWhatsApp: () => App.copyDailyBriefWhatsApp(),
    sendDailyBriefWhatsApp: () => App.sendDailyBriefWhatsApp(),
    createMilestoneInvoiceFromBrief: (mId, pId) => App.createMilestoneInvoiceFromBrief(mId, pId),

    // ===== Settings & Branding =====
    getSetting(key, def = '') {
        if (!this.settings || this.settings[key] === undefined || this.settings[key] === null || this.settings[key] === '') {
            return def;
        }
        const item = this.settings[key];
        if (typeof item === 'object' && item !== null) {
            return (item.value !== undefined && item.value !== null && item.value !== '') ? item.value : def;
        }
        return item;
    },

    async refreshBranding() {
        const res = await api('settings', { cache: false, silent: true });
        if (res && res.success && res.data) {
            this.settings = { ...this.settings, ...res.data };
            this.applyBranding();
        }
    },

    applyBranding() {
        const appName = this.getSetting('app_name', 'CRUDWorks ERP');
        const companyName = this.getSetting('company_name', 'Billing & Project Management');
        const logoUrl = this.getSetting('logo_url', 'assets/icons/icon.svg');

        document.title = appName;
        const loginAppName = document.getElementById('login-app-name');
        const sidebarAppName = document.getElementById('sidebar-app-name');
        const sidebarCompanyName = document.getElementById('sidebar-company-name');

        if (loginAppName) loginAppName.textContent = appName;
        if (sidebarAppName) sidebarAppName.textContent = appName;
        if (sidebarCompanyName) sidebarCompanyName.textContent = companyName;

        document.querySelectorAll('.app-brand-logo').forEach((img) => {
            img.src = logoUrl;
        });
    },

    // ===== Initialization =====
    async init() {
        apiClient.setUnauthorizedHandler(() => this.showLogin());

        document.querySelectorAll('.copyright-year').forEach((el) => {
            el.textContent = new Date().getFullYear();
        });

        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
            import('./core/login-enhancements.js').then(({ initLoginEnhancements }) => initLoginEnhancements());
        }

        // Bind navigation, observers, and prefetching
        nav.initAll();
        initDataTableObserver();
        initCurrencyObserver();
        initDatePickerObserver();
        initSelectObserver();
        router.enableHoverPrefetch();
        this._bindGlobalEvents();
        this._registerServiceWorker();
        this._initPwaInstall();

        // Load public settings
        const pubRes = await api('settings', { cache: false, silent: true });
        if (pubRes && pubRes.success && pubRes.data) {
            this.settings = pubRes.data;
            this.applyBranding();
        }

        // Check active session
        const currentHash = window.location.hash || '';
        const isResetPass = currentHash.startsWith('#/reset-password');
        const isPublicPortal = currentHash.startsWith('#/public-invoice') || currentHash.startsWith('#/public-quotation') || currentHash.startsWith('#/client-portal') || currentHash.startsWith('#/status');
        const session = isResetPass ? { authenticated: false } : await checkSession();
        if (session.authenticated || isPublicPortal) {
            if (session.authenticated) await this.refreshBranding();
            this.showApp(isPublicPortal && !session.authenticated);
        } else {
            this.showLogin();
        }

        window.addEventListener('hashchange', () => {
            closeAllAutocompletes();
            const ch = window.location.hash || '';
            const isReset = ch.startsWith('#/reset-password');
            const isPublic = ch.startsWith('#/public-invoice') || ch.startsWith('#/public-quotation') || ch.startsWith('#/client-portal') || ch.startsWith('#/status');
            if (isReset) {
                this.showLogin();
                import('./core/login-enhancements.js').then(({ checkResetPasswordHash }) => checkResetPasswordHash());
            } else if (AuthState.user) {
                this._setPublicLayoutMode(false);
                router.handleRoute();
            } else if (isPublic) {
                this.showApp(true);
            } else {
                this.showLogin();
            }
        });
        window.addEventListener('resize', () => nav.applyCompactSidebarState());

        // Hide splash screen smoothly
        setTimeout(() => this.hideSplash(), 500);
    },

    _setPublicLayoutMode(isPublic) {
        const sidebar = document.getElementById('sidebar');
        const taskbar = document.getElementById('windows-taskbar');
        const header = document.querySelector('header');
        const bcBar = document.getElementById('page-breadcrumb-bar');

        if (isPublic) {
            if (sidebar) sidebar.style.display = 'none';
            if (taskbar) taskbar.style.display = 'none';
            if (header) header.style.display = 'none';
            if (bcBar) bcBar.classList.add('hidden');
        } else {
            if (sidebar) sidebar.style.display = '';
            if (taskbar) taskbar.style.display = '';
            if (header) header.style.display = '';
        }
    },

    hideSplash() {
        const splash = document.getElementById('splash-screen');
        if (splash && !splash.classList.contains('hidden')) {
            splash.classList.add('opacity-0', 'invisible');
            setTimeout(() => splash.classList.add('hidden'), 450);
        }
    },

    // ===== Authentication Views =====
    async login() {
        const userEl = document.getElementById('login-username');
        const passEl = document.getElementById('login-password');
        const totpGroup = document.getElementById('login-2fa-group');
        const totpEl = document.getElementById('login-totp');
        const errEl = document.getElementById('login-error');
        const errSpan = errEl?.querySelector('span');
        const btn = document.getElementById('login-btn');

        const username = (userEl?.value || '').trim();
        const password = passEl?.value || '';
        const totpCode = totpGroup && !totpGroup.classList.contains('hidden') ? (totpEl?.value || '').trim() : '';

        if (errEl) errEl.classList.add('hidden');
        btnLoading(btn, true, 'Memverifikasi...');

        const result = await authLogin(username, password, totpCode);
        btnLoading(btn, false);

        if (result.success) {
            if (totpGroup) totpGroup.classList.add('hidden');
            if (totpEl) totpEl.value = '';
            await this.refreshBranding();
            this.showApp();
            toast(`Selamat datang, ${AuthState.user.nama_lengkap || AuthState.user.username}`, 'success');
        } else if (result.requires_2fa) {
            if (totpGroup) totpGroup.classList.remove('hidden');
            if (totpEl) {
                totpEl.value = '';
                setTimeout(() => totpEl.focus(), 50);
            }
            toast(result.message || 'Masukkan kode 2FA Authenticator', 'info');
        } else {
            if (errEl) {
                if (errSpan) errSpan.textContent = result.message;
                else errEl.textContent = result.message;
                errEl.classList.remove('hidden');
            }
        }
    },

    async logout() {
        await authLogout(() => {
            this.showLogin();
        });
    },

    showLogin() {
        const h = window.location.hash || '';
        if (h.startsWith('#/public-invoice') || h.startsWith('#/public-quotation') || h.startsWith('#/client-portal') || h.startsWith('#/status')) {
            this.showApp(true);
            return;
        }
        const loginPage = document.getElementById('login-page');
        const appLayout = document.getElementById('app-layout');
        if (loginPage) loginPage.classList.remove('hidden');
        if (appLayout) appLayout.classList.add('hidden');

        const userField = document.getElementById('login-username');
        const passField = document.getElementById('login-password');
        const totpGroup = document.getElementById('login-2fa-group');
        const totpField = document.getElementById('login-totp');
        if (passField) passField.value = '';
        if (totpField) totpField.value = '';
        if (totpGroup) totpGroup.classList.add('hidden');
        if (userField) setTimeout(() => userField.focus(), 80);
    },

    showApp(isPublic = false) {
        const loginPage = document.getElementById('login-page');
        const appLayout = document.getElementById('app-layout');
        if (loginPage) loginPage.classList.add('hidden');
        if (appLayout) appLayout.classList.remove('hidden');

        this._setPublicLayoutMode(isPublic);

        if (!isPublic && AuthState.user) {
            this._syncUserUI();
            nav.renderMenu(AuthState.menus);
            nav.syncUserToTaskbar();
            this.loadNotifications();
            this.loadDailyBriefBadge();
            if (!this._notifTimer) {
                this._notifTimer = setInterval(() => {
                    if (document.visibilityState === 'visible' && AuthState.user) {
                        this.loadNotifications(true);
                    }
                }, 60000);
            }
        }

        if (!window.location.hash || !window.location.hash.startsWith('#/')) {
            const startPage = localStorage.getItem('pref_start_page') || '#/dashboard';
            window.location.hash = startPage.startsWith('#/') ? startPage : '#/dashboard';
        } else {
            router.handleRoute();
        }
    },

    _syncUserUI() {
        const u = AuthState.user;
        if (!u) return;
        if (u.preferences && typeof u.preferences === 'object') {
            const syncKey = `pref_hydrated_u_${u.id}`;
            if (!sessionStorage.getItem(syncKey)) {
                Object.entries(u.preferences).forEach(([k, v]) => {
                    try { localStorage.setItem(k, String(v)); } catch (_) {}
                });
                try { sessionStorage.setItem(syncKey, '1'); } catch (_) {}
                nav.initPreferences();
            }
        }
        const name = u.nama_lengkap || u.username || 'User';
        const role = u.role || '-';
        const initial = name.charAt(0).toUpperCase();

        const uName = document.getElementById('user-name');
        const uRole = document.getElementById('user-role');
        const uAvatar = document.getElementById('user-avatar');
        const verEl = document.getElementById('sidebar-version-text');

        if (uName) uName.textContent = name;
        if (uRole) uRole.textContent = role;
        if (uAvatar) uAvatar.textContent = initial;
        if (verEl) verEl.textContent = `v${this.version}`;

        const tbAvatar = document.getElementById('topbar-user-avatar');
        const tbName = document.getElementById('topbar-user-name');
        const tbDropdownAvatar = document.getElementById('topbar-dropdown-avatar');
        const tbDropdownName = document.getElementById('topbar-dropdown-name');
        const tbDropdownRole = document.getElementById('topbar-dropdown-role');

        if (tbAvatar) tbAvatar.textContent = initial;
        if (tbName) tbName.textContent = name;
        if (tbDropdownAvatar) tbDropdownAvatar.textContent = initial;
        if (tbDropdownName) tbDropdownName.textContent = name;
        if (tbDropdownRole) tbDropdownRole.textContent = role;
    },

    ...profileModalMethods,
    _bindGlobalEvents() {
        // Tactile ripple feedback on buttons
        document.addEventListener('pointerdown', (e) => {
            if (!e.target || typeof e.target.closest !== 'function') return;
            const btn = e.target.closest('button, .btn-ripple, .menu-item');
            if (!btn || btn.disabled) return;

            const rect = btn.getBoundingClientRect();
            const diameter = Math.max(rect.width, rect.height);
            const radius = diameter / 2;

            const ripple = document.createElement('span');
            ripple.className = 'ripple-wave';
            ripple.style.width = ripple.style.height = `${diameter}px`;
            ripple.style.left = `${e.clientX - rect.left - radius}px`;
            ripple.style.top = `${e.clientY - rect.top - radius}px`;

            btn.querySelector('.ripple-wave')?.remove();
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                if (AuthState.user) {
                    e.preventDefault();
                    nav.toggleSearch();
                }
            }
            if ((e.altKey && (e.key === 'c' || e.key === 'C')) || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'c' || e.key === 'C'))) {
                if (AuthState.user) {
                    e.preventDefault();
                    this.toggleCalculator();
                }
            }
            if (e.key === 'Escape') {
                if (document.querySelector('.ac-dropdown')) {
                    closeAllAutocompletes();
                    return;
                }
                const prefModal = document.getElementById('preferences-modal');
                if (prefModal && !prefModal.classList.contains('hidden')) {
                    nav.closePreferencesModal();
                    return;
                }
                const dailyBriefModal = document.getElementById('daily-brief-modal');
                if (dailyBriefModal && !dailyBriefModal.classList.contains('hidden')) {
                    this.closeDailyBriefModal();
                    return;
                }
                const aboutModal = document.getElementById('about-modal');
                if (aboutModal && !aboutModal.classList.contains('hidden')) {
                    this.closeAboutModal();
                    return;
                }
                const calcModal = document.getElementById('calculator-modal');
                if (calcModal && !calcModal.classList.contains('hidden')) {
                    this.toggleCalculator(false);
                    return;
                }
                const searchModal = document.getElementById('omni-search-modal');
                if (searchModal && !searchModal.classList.contains('hidden')) {
                    nav.toggleSearch(false);
                    return;
                }
                const modalContainer = document.getElementById('modal-container');
                if (modalContainer && !modalContainer.classList.contains('hidden')) {
                    closeModal();
                    return;
                }
                const drawerContainer = document.getElementById('drawer-container');
                if (drawerContainer && !drawerContainer.classList.contains('hidden')) {
                    closeDrawer();
                    return;
                }
            }
        });
    },

    // ===== Quick Billing / Invoice Calculator Modal (Lazy-loaded) =====
    async toggleCalculator(forceOpen = null) {
        return (await import('./core/calculator-modal.js')).toggleCalculator(forceOpen);
    },

    async computeQuickInvoiceCalc() {
        return (await import('./core/calculator-modal.js')).computeQuickInvoiceCalc();
    },

    // ===== About & Changelog Modal (Lazy-loaded) =====
    async showAboutModal(tab = 'info') {
        return (await import('./core/about-modal.js')).showAboutModal(tab, { version: this.version, navLayout: nav.navLayout });
    },

    async closeAboutModal() {
        return (await import('./core/about-modal.js')).closeAboutModal();
    },

    async switchAboutTab(tab = 'info') {
        return (await import('./core/about-modal.js')).switchAboutTab(tab, { version: this.version, navLayout: nav.navLayout });
    },

    async renderAboutModalContent() {
        return (await import('./core/about-modal.js')).renderAboutModalContent({ version: this.version, navLayout: nav.navLayout });
    },

    // ===== Action Board Pagi Hari & Rekap Penagihan Otomatis (Lazy-loaded via core/daily-brief.js) =====
    async _dailyBriefMod() {
        return import('./core/daily-brief.js');
    },

    async loadDailyBriefBadge() {
        return (await this._dailyBriefMod()).loadDailyBriefBadge();
    },

    async openDailyBriefModal() {
        return (await this._dailyBriefMod()).openDailyBriefModal();
    },

    async closeDailyBriefModal() {
        return (await this._dailyBriefMod()).closeDailyBriefModal();
    },

    async switchDailyBriefTab(tabKey) {
        return (await this._dailyBriefMod()).switchDailyBriefTab(tabKey);
    },

    async refreshDailyBriefData() {
        return (await this._dailyBriefMod()).refreshDailyBriefData();
    },

    async copyDailyBriefWhatsApp() {
        return (await this._dailyBriefMod()).copyDailyBriefWhatsApp();
    },

    async sendDailyBriefWhatsApp() {
        return (await this._dailyBriefMod()).sendDailyBriefWhatsApp();
    },

    async createMilestoneInvoiceFromBrief(milestoneId, projectId) {
        return (await this._dailyBriefMod()).createMilestoneInvoiceFromBrief(milestoneId, projectId);
    },

    // ===== PWA Service Worker & Install Prompt =====
    _registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        const hadController = Boolean(navigator.serviceWorker.controller);
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!hadController || refreshing) return;
            refreshing = true;
            window.location.reload();
        });
        window.addEventListener('load', () => {
            navigator.serviceWorker.register(`${apiClient.ROOT_BASE}sw.js`, { updateViaCache: 'none' }).then((reg) => {
                if (reg.waiting && navigator.serviceWorker.controller) {
                    reg.waiting.postMessage('SKIP_WAITING');
                }
                reg.update().catch(() => {});
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                newWorker.postMessage('SKIP_WAITING');
                            }
                        });
                    }
                });
            }).catch(() => {});
        });
    },

    _initPwaInstall() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        const topbarBtn = document.getElementById('topbar-install-btn');
        const banner = document.getElementById('pwa-install-banner');

        if (isStandalone) {
            if (topbarBtn) topbarBtn.classList.add('hidden');
            if (banner) banner.classList.add('hidden');
            return;
        }

        // Tampilkan tombol di topbar agar selalu dapat diakses oleh pengguna
        if (topbarBtn) {
            topbarBtn.classList.remove('hidden');
            topbarBtn.classList.add('inline-flex');
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredInstallPrompt = e;
            if (banner && !sessionStorage.getItem('pwa_banner_dismissed')) {
                banner.classList.remove('hidden');
            }
            if (topbarBtn) {
                topbarBtn.classList.remove('hidden');
                topbarBtn.classList.add('inline-flex');
            }
        });

        window.addEventListener('appinstalled', () => {
            deferredInstallPrompt = null;
            document.getElementById('pwa-install-banner')?.classList.add('hidden');
            document.getElementById('topbar-install-btn')?.classList.add('hidden');
            toast('Aplikasi CRUDWorks ERP berhasil dipasang di perangkat Anda', 'success');
        });
    },

    async promptPwaInstall() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (isStandalone) {
            toast('Aplikasi sudah terpasang di perangkat Anda.', 'info');
            return;
        }

        if (deferredInstallPrompt) {
            try {
                deferredInstallPrompt.prompt();
                const { outcome } = await deferredInstallPrompt.userChoice;
                if (outcome === 'accepted') {
                    document.getElementById('pwa-install-banner')?.classList.add('hidden');
                    document.getElementById('topbar-install-btn')?.classList.add('hidden');
                    toast('Pemasangan aplikasi sedang diproses...', 'success');
                }
                deferredInstallPrompt = null;
                return;
            } catch (err) {
                console.warn('[PWA] Prompt error, falling back to guide modal:', err);
            }
        }

        // Fallback: Tampilkan modal panduan instalasi visual yang interaktif
        this.showPwaInstallGuideModal();
    },

    showPwaInstallGuideModal() {
        const ua = navigator.userAgent || '';
        const isIos = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        const isAndroid = /Android/.test(ua);
        const isEdge = /Edg\//.test(ua);
        const isChrome = /Chrome\//.test(ua) && !isEdge;
        const isSafari = /Safari\//.test(ua) && !isChrome && !isEdge;

        let guideHtml = '';
        if (isIos) {
            guideHtml = `
                <div class="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                    <div class="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-apple-line text-lg text-slate-800 dark:text-slate-200"></i> Panduan Pasang di iPhone / iPad (Safari)
                    </div>
                    <ol class="list-decimal list-inside space-y-2 leading-relaxed">
                        <li>Ketuk ikon <strong>Bagikan (Share)</strong> <i class="ri-share-box-line text-primary-600 font-bold"></i> pada bilah menu di bawah layar Safari.</li>
                        <li>Gulir daftar menu ke bawah, lalu pilih <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.</li>
                        <li>Ketuk <strong>"Tambah"</strong> di pojok kanan atas. Ikon aplikasi akan muncul di layar utama perangkat Anda.</li>
                    </ol>
                </div>
            `;
        } else if (isAndroid) {
            guideHtml = `
                <div class="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                    <div class="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-android-line text-lg text-emerald-600"></i> Panduan Pasang di Android (Chrome)
                    </div>
                    <ol class="list-decimal list-inside space-y-2 leading-relaxed">
                        <li>Ketuk tombol menu <strong>titik tiga (⋮)</strong> di pojok kanan atas peramban Chrome.</li>
                        <li>Pilih opsi <strong>"Pasang aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</li>
                        <li>Konfirmasi pemasangan. Aplikasi dapat dibuka langsung layaknya aplikasi native.</li>
                    </ol>
                </div>
            `;
        } else {
            guideHtml = `
                <div class="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                    <div class="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-computer-line text-lg text-primary-600"></i> Panduan Pasang di Komputer / Laptop (Chrome / Edge)
                    </div>
                    <div class="space-y-2 leading-relaxed">
                        <div class="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-start gap-2.5">
                            <span class="w-5 h-5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                            <div>
                                <strong>Lewat Bilah Alamat (Omnibox):</strong>
                                <p class="text-slate-500 mt-0.5">Periksa sisi kanan kolom URL browser Anda di bagian atas. Klik ikon <i class="ri-download-cloud-line text-primary-600 font-bold"></i> <strong>"Pasang aplikasi"</strong> atau ikon komputer kecil, lalu klik <strong>Pasang (Install)</strong>.</p>
                            </div>
                        </div>
                        <div class="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-start gap-2.5">
                            <span class="w-5 h-5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                            <div>
                                <strong>Lewat Menu Browser:</strong>
                                <p class="text-slate-500 mt-0.5">Klik menu titik tiga <strong>(⋮)</strong> di pojok kanan atas browser &rarr; pilih <strong>"Simpan dan bagikan"</strong> atau <strong>"Aplikasi"</strong> &rarr; klik <strong>"Pasang CRUDWorks ERP..."</strong>.</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        openModal(`
            <div class="p-6 space-y-5">
                <div class="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-sm shadow-primary-500/30">
                            <i class="ri-install-line text-xl"></i>
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-slate-900 dark:text-white">Pasang Aplikasi CRUDWorks ERP</h3>
                            <p class="text-xs text-slate-500">Akses cepat, tanpa navigasi browser, dan performa lebih responsif.</p>
                        </div>
                    </div>
                    <button type="button" onclick="App.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500">
                        <i class="ri-close-line text-lg"></i>
                    </button>
                </div>

                ${guideHtml}

                <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <i class="ri-information-line text-base shrink-0 mt-0.5"></i>
                    <div class="leading-relaxed">
                        <strong>Catatan Lingkungan Lokal:</strong> Jika Anda mengakses via HTTP virtual host lokal (misal: <code>crudworks-home.test</code>), peramban Chromium mungkin menonaktifkan dialog otomatis <em>prompt</em> native karena standar keamanan HTTPS. Mengikuti langkah di atas akan tetap memasang ERP sebagai aplikasi desktop mandiri.
                    </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button type="button" onclick="navigator.clipboard.writeText(window.location.origin + window.location.pathname); App.toast('Tautan aplikasi berhasil disalin', 'success');"
                            class="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition">
                        <i class="ri-file-copy-line"></i> Salin URL Aplikasi
                    </button>
                    <button type="button" onclick="App.closeModal()"
                            class="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-xs">
                        Tutup
                    </button>
                </div>
            </div>
        `);
    },

    dismissPwaBanner() {
        sessionStorage.setItem('pwa_banner_dismissed', '1');
        document.getElementById('pwa-install-banner')?.classList.add('hidden');
    },

    // ===== Notification Bell Popover (Lazy-loaded) =====
    async loadNotifications() {
        return (await import('./core/notifications.js')).loadNotifications();
    },

    async markNotifRead(id) {
        return (await import('./core/notifications.js')).markNotifRead(id);
    },

    async markAllNotifRead() {
        return (await import('./core/notifications.js')).markAllNotifRead();
    },

    async toggleNotifications(e) {
        return (await import('./core/notifications.js')).toggleNotifications(e);
    },

    toggleUserMenu(e) {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        const dd = document.getElementById('topbar-user-dropdown');
        if (!dd) return;
        if (e === false) {
            dd.classList.add('hidden');
            return;
        }
        const isOpening = dd.classList.contains('hidden');
        if (isOpening) {
            this.closeNotifications();
        }
        dd.classList.toggle('hidden');
    },

    closeUserMenu() {
        document.getElementById('topbar-user-dropdown')?.classList.add('hidden');
    },

    closeNotifications() {
        document.getElementById('topbar-notif-popover')?.classList.add('hidden');
    },

    exportCsv(filename, headers, rows) {
        const escCell = (val) => {
            const str = val === null || val === undefined ? '' : String(val);
            return '"' + str.replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
        };
        const lines = [
            headers.map(escCell).join(','),
            ...(rows || []).map((r) => r.map(escCell).join(','))
        ];
        const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    toggleTableActionMenu,
    closeTableActionMenu,
    tableActionBtnHtml
};

// Expose globally for HTML onclick handlers & page modules
window.App = App;

// Boot SPA
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}

export { App };
export default App;
