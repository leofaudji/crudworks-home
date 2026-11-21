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
    openWhatsAppInvoiceReminder,
    openWhatsAppQuotation,
    openReportCsvPreview,
    openReportPdfPreview,
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
        const isPublicPortal = currentHash.startsWith('#/public-invoice') || currentHash.startsWith('#/public-quotation') || currentHash.startsWith('#/client-portal');
        const session = await checkSession();
        if (session.authenticated || isPublicPortal) {
            if (session.authenticated) await this.refreshBranding();
            this.showApp(isPublicPortal && !session.authenticated);
        } else {
            this.showLogin();
        }

        window.addEventListener('hashchange', () => {
            closeAllAutocompletes();
            const ch = window.location.hash || '';
            const isPublic = ch.startsWith('#/public-invoice') || ch.startsWith('#/public-quotation') || ch.startsWith('#/client-portal');
            if (AuthState.user) {
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
        const errEl = document.getElementById('login-error');
        const errSpan = errEl?.querySelector('span');
        const btn = document.getElementById('login-btn');

        const username = (userEl?.value || '').trim();
        const password = passEl?.value || '';

        if (errEl) errEl.classList.add('hidden');
        btnLoading(btn, true, 'Memverifikasi...');

        const result = await authLogin(username, password);
        btnLoading(btn, false);

        if (result.success) {
            await this.refreshBranding();
            this.showApp();
            toast(`Selamat datang, ${AuthState.user.nama_lengkap || AuthState.user.username}`, 'success');
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
        if (h.startsWith('#/public-invoice') || h.startsWith('#/public-quotation') || h.startsWith('#/client-portal')) {
            this.showApp(true);
            return;
        }
        const loginPage = document.getElementById('login-page');
        const appLayout = document.getElementById('app-layout');
        if (loginPage) loginPage.classList.remove('hidden');
        if (appLayout) appLayout.classList.add('hidden');

        const userField = document.getElementById('login-username');
        const passField = document.getElementById('login-password');
        if (passField) passField.value = '';
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
            window.location.hash = '#/dashboard';
        } else {
            router.handleRoute();
        }
    },

    _syncUserUI() {
        const u = AuthState.user;
        if (!u) return;
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

    openProfileModal() {
        const u = AuthState.user || {};
        openModal(`
            <div class="p-6 space-y-5">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white">Profil Akun &amp; Keamanan</h3>
                        <p class="text-xs text-slate-500">${escapeHtml(u.username || '')} · ${escapeHtml(u.role || '-')}</p>
                    </div>
                    <button type="button" onclick="App.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500">
                        <i class="ri-close-line text-lg"></i>
                    </button>
                </div>

                <form onsubmit="App.saveProfile(this, event)" class="space-y-3">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Informasi Profil</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Nama Lengkap *</label>
                            <input type="text" name="nama_lengkap" required value="${escapeHtml(u.nama_lengkap || '')}"
                                   class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Email</label>
                            <input type="email" name="email" value="${escapeHtml(u.email || '')}"
                                   class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs">
                        </div>
                    </div>
                    <div class="flex justify-end">
                        <button type="submit" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold">Simpan Profil</button>
                    </div>
                </form>

                <form onsubmit="App.savePassword(this, event)" class="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Ganti Password</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Password Saat Ini *</label>
                            <input type="password" name="current_password" required
                                   class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Password Baru *</label>
                            <input type="password" name="new_password" required minlength="6"
                                   class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Ulangi Password *</label>
                            <input type="password" name="confirm_password" required minlength="6"
                                   class="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs">
                        </div>
                    </div>
                    <div class="flex justify-end">
                        <button type="submit" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold">Perbarui Password</button>
                    </div>
                </form>
            </div>
        `, 'max-w-xl');
    },

    async saveProfile(form, e) {
        if (e) e.preventDefault();
        const fd = new FormData(form);
        const btn = form.querySelector('button[type="submit"]');
        btnLoading(btn, true);
        const res = await api('auth/profile', {
            method: 'PUT',
            body: {
                nama_lengkap: fd.get('nama_lengkap'),
                email: fd.get('email')
            }
        });
        btnLoading(btn, false);
        if (res?.success) {
            AuthState.user = { ...AuthState.user, ...res.data };
            this._syncUserUI();
            nav.syncUserToTaskbar();
            toast('Profil berhasil diperbarui', 'success');
        }
    },

    async savePassword(form, e) {
        if (e) e.preventDefault();
        const fd = new FormData(form);
        const btn = form.querySelector('button[type="submit"]');
        btnLoading(btn, true);
        const res = await api('auth/password', {
            method: 'PUT',
            body: {
                current_password: fd.get('current_password'),
                new_password: fd.get('new_password'),
                confirm_password: fd.get('confirm_password')
            }
        });
        btnLoading(btn, false);
        if (res?.success) {
            form.reset();
            toast('Password berhasil diperbarui', 'success');
        }
    },

    // ===== Global Shortcuts & Ripple =====
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

    // ===== Quick Billing / Invoice Calculator Modal =====
    async toggleCalculator(forceOpen = null) {
        const modal = document.getElementById('calculator-modal');
        const content = document.getElementById('calculator-content');
        if (!modal) return;

        const isHidden = modal.classList.contains('hidden');
        const open = forceOpen !== null ? forceOpen : isHidden;

        if (open) {
            modal.classList.remove('hidden');
            requestAnimationFrame(() => {
                modal.classList.remove('opacity-0');
                content?.classList.remove('scale-95');
            });
            this.computeQuickInvoiceCalc();
        } else {
            modal.classList.add('opacity-0');
            content?.classList.add('scale-95');
            setTimeout(() => modal.classList.add('hidden'), 200);
        }
    },

    computeQuickInvoiceCalc() {
        const subtotalInput = document.getElementById('qcalc-subtotal');
        const diskonInput = document.getElementById('qcalc-diskon');
        const ppnInput = document.getElementById('qcalc-ppn');
        const ppnAmountEl = document.getElementById('qcalc-ppn-amount');
        const grandTotalEl = document.getElementById('qcalc-grand-total');

        if (!subtotalInput) return;

        const subtotal = Math.max(0, parseFloat(subtotalInput.value) || 0);
        const diskon = Math.max(0, parseFloat(diskonInput?.value) || 0);
        const ppnPct = Math.max(0, parseFloat(ppnInput?.value) || 0);

        const dpp = Math.max(0, subtotal - diskon);
        const ppnAmount = Math.round(dpp * (ppnPct / 100));
        const grandTotal = dpp + ppnAmount;

        if (ppnAmountEl) ppnAmountEl.textContent = formatRupiah(ppnAmount);
        if (grandTotalEl) grandTotalEl.textContent = formatRupiah(grandTotal);
    },

    // ===== About & Changelog Modal =====
    showAboutModal(tab = 'info') {
        const modal = document.getElementById('about-modal');
        if (!modal) return;
        this.switchAboutTab(tab);
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.about-dialog-card')?.classList.remove('scale-95');
        });
    },

    closeAboutModal() {
        const modal = document.getElementById('about-modal');
        if (!modal) return;
        modal.classList.add('opacity-0');
        modal.querySelector('.about-dialog-card')?.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 200);
    },

    switchAboutTab(tab = 'info') {
        this._aboutActiveTab = tab;
        const btnInfo = document.getElementById('btn-about-tab-info');
        const btnChangelog = document.getElementById('btn-about-tab-changelog');
        if (btnInfo && btnChangelog) {
            const activeCls = 'px-4 py-2 border-b-2 font-bold text-xs transition-all border-primary-600 text-primary-600 dark:text-primary-400';
            const idleCls = 'px-4 py-2 border-b-2 font-medium text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border-transparent transition-all';
            btnInfo.className = tab === 'info' ? activeCls : idleCls;
            btnChangelog.className = tab === 'changelog' ? activeCls : idleCls;
        }
        this.renderAboutModalContent();
    },

    async renderAboutModalContent() {
        const body = document.getElementById('about-modal-body');
        if (!body) return;

        if (this._aboutActiveTab === 'info') {
            const userName = AuthState.user?.nama_lengkap || AuthState.user?.username || 'Guest';
            const userRole = AuthState.user?.role || '-';

            body.innerHTML = `
                <div class="space-y-4 text-xs">
                    <div class="flex items-center gap-3 p-4 bg-primary-50 dark:bg-primary-950/30 rounded-2xl border border-primary-100 dark:border-primary-900/40">
                        <img src="assets/icons/icon.svg" class="w-12 h-12 rounded-xl app-brand-logo" alt="Logo">
                        <div>
                            <h4 class="font-extrabold text-sm text-slate-800 dark:text-white">CRUDWorks ERP &amp; Project Management</h4>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400">Platform billing terintegrasi git deployer, invoice printing &amp; financial tracking</p>
                            <span class="inline-block mt-1 font-mono text-[10px] font-bold text-primary-700 dark:text-primary-300">Versi Terpasang: v${this.version}</span>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2.5">
                        <div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-2.5">
                            <i class="ri-git-branch-line text-primary-600 dark:text-primary-400 text-base"></i>
                            <div>
                                <div class="font-bold text-slate-800 dark:text-slate-100">Integrasi app-git</div>
                                <div class="text-slate-400 text-[11px]">Deployer status &amp; sync</div>
                            </div>
                        </div>
                        <div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-2.5">
                            <i class="ri-printer-line text-emerald-600 dark:text-emerald-400 text-base"></i>
                            <div>
                                <div class="font-bold text-slate-800 dark:text-slate-100">Invoice Engine A4</div>
                                <div class="text-slate-400 text-[11px]">Cetak faktur &amp; QR receipt</div>
                            </div>
                        </div>
                    </div>
                    <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                        <span>User Login: <strong class="text-slate-700 dark:text-slate-200">${escapeHtml(userName)} (${escapeHtml(userRole)})</strong></span>
                        <span>Mode Layout: <strong class="text-slate-700 dark:text-slate-200 uppercase">${escapeHtml(nav.navLayout)}</strong></span>
                    </div>
                </div>
            `;
        } else {
            body.innerHTML = `
                <div class="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                    <i class="ri-loader-4-line text-2xl animate-spin text-primary-600"></i>
                    <span>Memuat catatan rilis dari CHANGELOG.md...</span>
                </div>
            `;
            try {
                if (!this._cachedChangelog) {
                    const res = await fetch(`${apiClient.ROOT_BASE}CHANGELOG.md?_t=${Date.now()}`);
                    if (res.ok) this._cachedChangelog = await res.text();
                }
                if (!this._cachedChangelog) {
                    body.innerHTML = `
                        <div class="text-center py-8 space-y-2">
                            <i class="ri-file-warning-line text-3xl text-amber-500"></i>
                            <p class="text-xs text-slate-500">Berkas CHANGELOG.md tidak dapat diakses.</p>
                        </div>
                    `;
                    return;
                }

                body.innerHTML = `
                    <div class="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <pre class="font-mono text-xs whitespace-pre-wrap text-slate-700 dark:text-slate-300 max-h-96 overflow-y-auto">${escapeHtml(this._cachedChangelog)}</pre>
                    </div>
                `;
            } catch (err) {
                body.innerHTML = `<p class="text-center text-xs text-rose-500 py-6">Gagal memuat: ${escapeHtml(err.message)}</p>`;
            }
        }
    },

    // ===== Action Board Pagi Hari & Rekap Penagihan Otomatis (Executive Daily Brief) =====
    _dailyBriefData: null,

    async loadDailyBriefBadge() {
        const badge = document.getElementById('topbar-daily-brief-badge');
        if (!badge || !AuthState.user) return;
        try {
            const res = await api('dashboard/daily_brief', { silent: true });
            if (res && res.success && res.data) {
                this._dailyBriefData = res.data;
                const total = res.data.total_critical_items || 0;
                if (total > 0) {
                    badge.textContent = total > 99 ? '99+' : total;
                    badge.classList.remove('hidden');
                    badge.style.display = 'inline-flex';
                } else {
                    badge.classList.add('hidden');
                    badge.style.display = 'none';
                }
            }
        } catch (_) {}
    },

    async openDailyBriefModal() {
        const modal = document.getElementById('daily-brief-modal');
        const content = document.getElementById('daily-brief-content');
        if (!modal) return;

        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            content?.classList.remove('scale-95');
        });

        await this.refreshDailyBriefData();
    },

    closeDailyBriefModal() {
        const modal = document.getElementById('daily-brief-modal');
        const content = document.getElementById('daily-brief-content');
        if (!modal) return;

        modal.classList.add('opacity-0');
        content?.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 200);
    },

    async refreshDailyBriefData() {
        const bodyEl = document.getElementById('daily-brief-body');
        const dateEl = document.getElementById('daily-brief-date');
        const badge = document.getElementById('topbar-daily-brief-badge');
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
        this._dailyBriefData = d;

        if (dateEl) dateEl.textContent = d.date_formatted || 'Hari ini';
        if (badge) {
            const total = d.total_critical_items || 0;
            if (total > 0) {
                badge.textContent = total > 99 ? '99+' : total;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        const kpiNom = document.getElementById('brief-kpi-nominal');
        const kpiInv = document.getElementById('brief-kpi-inv-count');
        const kpiMs = document.getElementById('brief-kpi-ms-count');
        const kpiSla = document.getElementById('brief-kpi-sla-count');

        if (kpiNom) kpiNom.textContent = formatRupiah(d.total_nominal_mendesak);
        if (kpiInv) kpiInv.textContent = `${(d.invoices || []).length} Faktur`;
        if (kpiMs) kpiMs.textContent = `${(d.milestones || []).length} Termin`;
        if (kpiSla) kpiSla.textContent = `${(d.maintenances || []).length + (d.incidents || []).length} Item`;

        this.renderDailyBriefBody(d);
    },

    renderDailyBriefBody(d) {
        const bodyEl = document.getElementById('daily-brief-body');
        if (!bodyEl) return;

        const invs = d.invoices || [];
        const mss = d.milestones || [];
        const slas = d.maintenances || [];
        const incs = d.incidents || [];

        let html = '';

        // 1. Invoices Overdue & Due Today
        html += `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div class="px-5 py-3.5 bg-rose-50/50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <span class="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-sm">
                            <i class="ri-hand-coin-line text-lg"></i>
                        </span>
                        <div>
                            <h4 class="text-sm font-bold text-slate-900 dark:text-white">Tagihan Jatuh Tempo & Overdue (${invs.length})</h4>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400">Prioritas penagihan hari ini untuk mengamankan arus kas</p>
                        </div>
                    </div>
                    <span class="font-mono text-sm font-extrabold text-rose-600 dark:text-rose-400">${formatRupiah(d.total_nominal_mendesak)}</span>
                </div>
                <div class="divide-y divide-slate-100 dark:divide-slate-800">
        `;

        if (invs.length === 0) {
            html += `<div class="p-5 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5"><i class="ri-checkbox-circle-line text-emerald-500 text-sm"></i> Tidak ada tagihan menunggak atau jatuh tempo hari ini.</div>`;
        } else {
            html += invs.map(inv => {
                const hari = Number(inv.hari_lewat) || 0;
                const statusBadge = hari > 0 
                    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Overdue ${hari} hari</span>`
                    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Jatuh Tempo Hari Ini</span>`;

                return `
                    <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-bold text-sm text-slate-900 dark:text-white">${escapeHtml(inv.nomor_invoice)}</span>
                                ${statusBadge}
                            </div>
                            <div class="text-xs text-slate-600 dark:text-slate-300 font-semibold">${escapeHtml(inv.nama_perusahaan)}</div>
                            <div class="text-[11px] text-slate-400 font-mono mt-0.5">Sisa Tagihan: <b class="text-rose-600 font-bold">${formatRupiah(inv.sisa_tagihan)}</b> dari ${formatRupiah(inv.total_tagihan)}</div>
                        </div>
                        <div class="flex items-center gap-2 self-end sm:self-center">
                            <button type="button" onclick="App.openWhatsAppInvoiceReminder(${inv.id})" class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-1 transition">
                                <i class="ri-whatsapp-line"></i> Kirim WA
                            </button>
                            <a href="#/invoices" onclick="App.closeDailyBriefModal()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition">
                                <i class="ri-eye-line"></i> Rincian
                            </a>
                        </div>
                    </div>
                `;
            }).join('');
        }
        html += `</div></div>`;

        // 2. Milestones Ready to Bill
        html += `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div class="px-5 py-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <span class="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-sm">
                            <i class="ri-flag-2-line text-lg"></i>
                        </span>
                        <div>
                            <h4 class="text-sm font-bold text-slate-900 dark:text-white">Termin Proyek Siap Ditagihkan (${mss.length})</h4>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400">Milestone berstatus rencana yang siap diterbitkan faktur</p>
                        </div>
                    </div>
                </div>
                <div class="divide-y divide-slate-100 dark:divide-slate-800">
        `;

        if (mss.length === 0) {
            html += `<div class="p-5 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5"><i class="ri-checkbox-circle-line text-emerald-500 text-sm"></i> Belum ada termin baru yang siap ditagihkan hari ini.</div>`;
        } else {
            html += mss.map(ms => {
                return `
                    <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <div>
                            <div class="font-bold text-sm text-slate-900 dark:text-white mb-0.5">${escapeHtml(ms.nama_milestone)}</div>
                            <div class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(ms.nama_project)} • <span class="font-medium text-slate-700 dark:text-slate-300">${escapeHtml(ms.nama_perusahaan)}</span></div>
                            <div class="text-[11px] font-mono text-primary-600 font-bold mt-1">Termin ${ms.persentase}%: ${formatRupiah(ms.nominal)}</div>
                        </div>
                        <div class="flex items-center gap-2 self-end sm:self-center">
                            <button type="button" onclick="App.createMilestoneInvoiceFromBrief(${ms.id}, ${ms.project_id})" class="px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition">
                                <i class="ri-file-add-line"></i> 1-Klik Terbitkan Faktur
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        html += `</div></div>`;

        // 3. SLA Domain & Hosting Expiring
        html += `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div class="px-5 py-3.5 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <span class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
                            <i class="ri-global-line text-lg"></i>
                        </span>
                        <div>
                            <h4 class="text-sm font-bold text-slate-900 dark:text-white">SLA Domain, Hosting & SSL (< 14 Hari) (${slas.length})</h4>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400">Peringatan perpanjangan lisensi agar tidak suspend</p>
                        </div>
                    </div>
                </div>
                <div class="divide-y divide-slate-100 dark:divide-slate-800">
        `;

        if (slas.length === 0) {
            html += `<div class="p-5 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5"><i class="ri-checkbox-circle-line text-emerald-500 text-sm"></i> Seluruh masa aktif domain, hosting, dan SSL klien dalam kondisi aman.</div>`;
        } else {
            html += slas.map(s => {
                const sisa = Number(s.sisa_hari) || 0;
                const badge = sisa <= 3 
                    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700">Sisa ${sisa} hari!</span>`
                    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700">Sisa ${sisa} hari</span>`;

                return `
                    <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <div>
                            <div class="flex items-center gap-2 mb-0.5">
                                <span class="font-bold text-sm text-slate-900 dark:text-white">${escapeHtml(s.nama_aset)}</span>
                                ${badge}
                            </div>
                            <div class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(s.nama_perusahaan)} • Jatuh Tempo: ${formatDate(s.tanggal_berakhir)}</div>
                            <div class="text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-1">Biaya: <b>${formatRupiah(s.biaya_perpanjangan)}</b></div>
                        </div>
                        <div class="flex items-center gap-2 self-end sm:self-center">
                            <a href="#/maintenance" onclick="App.closeDailyBriefModal()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition">
                                Kelola SLA
                            </a>
                        </div>
                    </div>
                `;
            }).join('');
        }
        html += `</div></div>`;

        // 4. Server & Uptime Incidents
        html += `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div class="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <span class="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm">
                            <i class="ri-server-line text-lg"></i>
                        </span>
                        <div>
                            <h4 class="text-sm font-bold text-slate-900 dark:text-white">Status Kesehatan Server & Uptime (${incs.length})</h4>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400">Pemantau insiden live HTTP status dan sertifikat SSL</p>
                        </div>
                    </div>
                </div>
                <div class="divide-y divide-slate-100 dark:divide-slate-800">
        `;

        if (incs.length === 0) {
            html += `<div class="p-5 text-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-2"><i class="ri-checkbox-circle-fill text-base"></i> 🟢 Seluruh sistem proyek klien terpantau 100% ONLINE & SSL AMAN.</div>`;
        } else {
            html += incs.map(inc => {
                const isDown = inc.last_health_status === 'down';
                const badge = isDown
                    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white">DOWN</span>`
                    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white">SSL Expired</span>`;

                return `
                    <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <div>
                            <div class="flex items-center gap-2 mb-0.5">
                                <span class="font-bold text-sm text-slate-900 dark:text-white">${escapeHtml(inc.nama_project)}</span>
                                ${badge}
                            </div>
                            <div class="text-xs text-slate-400 font-mono">${escapeHtml(inc.app_url || '-')}</div>
                            <div class="text-[11px] text-rose-500 font-medium mt-1">Status: ${isDown ? 'Server tidak merespons HTTP' : `SSL tersisa ${inc.last_ssl_days} hari`}</div>
                        </div>
                        <div class="flex items-center gap-2 self-end sm:self-center">
                            <a href="#/projects" onclick="App.closeDailyBriefModal()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition">
                                Cek Proyek
                            </a>
                        </div>
                    </div>
                `;
            }).join('');
        }
        html += `</div></div>`;

        bodyEl.innerHTML = html;
    },

    copyDailyBriefWhatsApp() {
        if (!this._dailyBriefData || !this._dailyBriefData.whatsapp_text) {
            toast('Data brief belum siap disalin', 'warning');
            return;
        }
        const text = this._dailyBriefData.whatsapp_text;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                toast('Ringkasan Executive Brief berhasil disalin ke clipboard!', 'success');
            }).catch(() => {
                window.prompt('Salin teks brief berikut:', text);
            });
        } else {
            window.prompt('Salin teks brief berikut:', text);
        }
    },

    sendDailyBriefWhatsApp() {
        if (!this._dailyBriefData || !this._dailyBriefData.whatsapp_text) {
            toast('Data brief belum siap dikirim', 'warning');
            return;
        }
        const text = encodeURIComponent(this._dailyBriefData.whatsapp_text);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    },

    async createMilestoneInvoiceFromBrief(milestoneId, projectId) {
        const conf = await confirmAction('Terbitkan Faktur Termin', 'Apakah Anda yakin ingin langsung menerbitkan faktur resmi dari termin ini?');
        if (!conf) return;

        const res = await api(`projects/${projectId}?action=create-milestone-invoice`, {
            method: 'POST',
            body: { milestone_id: milestoneId }
        });

        if (res && res.success) {
            toast(res.message, 'success');
            await this.refreshDailyBriefData();
        }
    },

    // ===== PWA Service Worker & Install Prompt =====
    _registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        // Bersihkan cache lama agar perubahan CSS / UI langsung aktif tanpa tertahan cache lawas
        if ('caches' in window) {
            caches.keys().then((keys) => {
                keys.forEach((key) => {
                    if (key !== 'crudworks-erp-v1.7.4') {
                        caches.delete(key);
                    }
                });
            }).catch(() => {});
        }
        window.addEventListener('load', () => {
            navigator.serviceWorker.register(`${apiClient.ROOT_BASE}sw.js`).then((reg) => {
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

    // ===== Notification Bell Popover =====
    async loadNotifications(silentRefresh = false) {
        if (!hasPerm('dashboard.view')) return;
        const badge = document.getElementById('topbar-notif-badge');
        const list = document.getElementById('topbar-notif-list');
        if (!badge || !list) return;

        const res = await api('dashboard/notifications', { cache: false, silent: true });
        if (!res || !res.success || !res.data) return;

        const { total_badge = 0, alerts = [] } = res.data;
        if (total_badge > 0) {
            badge.textContent = total_badge > 99 ? '99+' : String(total_badge);
            badge.classList.remove('hidden');
            badge.style.display = 'inline-flex';
        } else {
            badge.classList.add('hidden');
            badge.style.display = 'none';
        }

        if (alerts.length === 0) {
            list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400"><i class="ri-checkbox-circle-line text-2xl text-emerald-400 block mb-1"></i>Semua terkendali, tidak ada notifikasi baru.</div>`;
        } else {
            list.innerHTML = alerts.map((a) => {
                const badgeCls = a.type === 'danger' ? 'bg-rose-50 text-rose-600 border-rose-100'
                    : (a.type === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-100'
                    : (a.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-sky-50 text-sky-600 border-sky-100'));
                return `
                    <a href="${escapeHtml(a.url || '#/invoices')}" onclick="App.closeNotifications()" class="flex items-start gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                        <div class="w-8 h-8 rounded-xl border ${badgeCls} flex items-center justify-center shrink-0 mt-0.5">
                            <i class="${escapeHtml(a.icon || 'ri-file-warning-line')}"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="text-xs font-bold text-slate-800 dark:text-white leading-snug">${escapeHtml(a.title)}</div>
                            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">${escapeHtml(a.detail)}</div>
                        </div>
                        <i class="ri-arrow-right-s-line text-slate-300 mt-1"></i>
                    </a>
                `;
            }).join('');
        }
    },

    toggleNotifications(e) {
        if (e) e.stopPropagation();
        const pop = document.getElementById('topbar-notif-popover');
        if (!pop) return;
        const willOpen = pop.classList.contains('hidden');
        pop.classList.toggle('hidden');
        if (willOpen) {
            this.loadNotifications();
            if (!this._notifOutsideBound) {
                this._notifOutsideBound = true;
                document.addEventListener('click', (evt) => {
                    const wrapper = document.getElementById('topbar-notif-wrapper');
                    const p = document.getElementById('topbar-notif-popover');
                    if (wrapper && p && !p.classList.contains('hidden') && !wrapper.contains(evt.target)) {
                        p.classList.add('hidden');
                    }
                });
            }
        }
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
