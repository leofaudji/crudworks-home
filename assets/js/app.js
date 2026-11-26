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
    formatWhatsAppPhone,
    openWhatsApp,
    renderPagination,
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
        const isPublicPortal = currentHash.startsWith('#/public-invoice') || currentHash.startsWith('#/public-quotation') || currentHash.startsWith('#/client-portal') || currentHash.startsWith('#/status');
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
            const isPublic = ch.startsWith('#/public-invoice') || ch.startsWith('#/public-quotation') || ch.startsWith('#/client-portal') || ch.startsWith('#/status');
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

    openProfileModal(activeTab = 'profile') {
        const u = AuthState.user || {};
        const tab = ['profile', 'password', 'security'].includes(activeTab) ? activeTab : 'profile';
        const initials = (u.nama_lengkap || u.username || 'U').trim().charAt(0).toUpperCase();
        const is2faOn = Number(u.totp_enabled) === 1;

        openModal(`
            <div class="overflow-hidden">
                <!-- Header Profil -->
                <div class="px-6 pt-6 pb-4 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 border-b border-slate-100 dark:border-slate-800">
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex items-center gap-3.5 min-w-0">
                            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-sm shrink-0">
                                ${escapeHtml(initials)}
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="text-base font-bold text-slate-900 dark:text-white truncate">${escapeHtml(u.nama_lengkap || u.username || 'Pengguna')}</h3>
                                    <button type="button" onclick="App.switchProfileTab('security')"
                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${is2faOn ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'}"
                                        title="Klik untuk kelola keamanan 2FA">
                                        <i class="${is2faOn ? 'ri-shield-check-fill' : 'ri-shield-line'}"></i>
                                        <span>${is2faOn ? '2FA Aktif' : '2FA Nonaktif'}</span>
                                    </button>
                                </div>
                                <p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">@${escapeHtml(u.username || '-')} · ${escapeHtml(u.role || '-')}</p>
                            </div>
                        </div>
                        <button type="button" onclick="App.closeModal()" class="w-8 h-8 rounded-full bg-white/90 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700 flex items-center justify-center text-slate-500 shrink-0 transition" title="Tutup">
                            <i class="ri-close-line text-lg"></i>
                        </button>
                    </div>

                    <!-- Navigasi 3 Tab -->
                    <div class="grid grid-cols-3 gap-1.5 p-1 mt-4 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-800">
                        <button type="button" onclick="App.switchProfileTab('profile')" id="prof-tab-profile"
                            class="py-2 px-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${tab === 'profile' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
                            <i class="ri-user-3-line"></i><span>Profil</span>
                        </button>
                        <button type="button" onclick="App.switchProfileTab('password')" id="prof-tab-password"
                            class="py-2 px-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${tab === 'password' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
                            <i class="ri-lock-password-line"></i><span>Password</span>
                        </button>
                        <button type="button" onclick="App.switchProfileTab('security')" id="prof-tab-security"
                            class="py-2 px-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${tab === 'security' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
                            <i class="ri-shield-keyhole-line text-indigo-600 dark:text-indigo-400"></i><span>Keamanan</span>
                        </button>
                    </div>
                </div>

                <!-- Body Modal -->
                <div class="p-6 max-h-[70vh] overflow-y-auto">
                    <!-- Tab 1: Profil -->
                    <form id="prof-panel-profile" onsubmit="App.saveProfile(this, event)" class="${tab === 'profile' ? '' : 'hidden'} space-y-4">
                        <div class="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs">
                            <div>
                                <span class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Username</span>
                                <span class="font-mono font-bold text-slate-700 dark:text-slate-200">${escapeHtml(u.username || '-')}</span>
                            </div>
                            <div>
                                <span class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hak Akses</span>
                                <span class="font-semibold text-slate-700 dark:text-slate-200">${escapeHtml(u.role || '-')}</span>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Lengkap *</label>
                                <div class="relative">
                                    <i class="ri-user-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                    <input type="text" name="nama_lengkap" required value="${escapeHtml(u.nama_lengkap || '')}" placeholder="Nama lengkap Anda"
                                           class="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition">
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                                <div class="relative">
                                    <i class="ri-mail-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                    <input type="email" name="email" value="${escapeHtml(u.email || '')}" placeholder="nama@perusahaan.com"
                                           class="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition">
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span class="text-[11px] text-slate-400">Perubahan nama &amp; email langsung berlaku.</span>
                            <button type="submit" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition">
                                <i class="ri-save-3-line"></i><span>Simpan Profil</span>
                            </button>
                        </div>
                    </form>

                    <!-- Tab 2: Ganti Password -->
                    <form id="prof-panel-password" onsubmit="App.savePassword(this, event)" class="${tab === 'password' ? '' : 'hidden'} space-y-4">
                        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                            <i class="ri-information-line text-primary-600 text-base shrink-0"></i>
                            <span>Gunakan minimal 6 karakter kombinasi huruf dan angka agar akun lebih aman.</span>
                        </div>

                        <div class="space-y-3">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password Saat Ini *</label>
                                <div class="relative">
                                    <input type="password" name="current_password" required placeholder="Masukkan password saat ini"
                                           class="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition">
                                    <button type="button" onclick="App.toggleInputVisibility(this)" class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Lihat/Sembunyikan">
                                        <i class="ri-eye-line"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password Baru *</label>
                                    <div class="relative">
                                        <input type="password" name="new_password" id="prof-new-pw" required minlength="6" placeholder="Minimal 6 karakter" oninput="App._checkPasswordMatch()"
                                               class="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition">
                                        <button type="button" onclick="App.toggleInputVisibility(this)" class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Lihat/Sembunyikan">
                                            <i class="ri-eye-line"></i>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Ulangi Password Baru *</label>
                                    <div class="relative">
                                        <input type="password" name="confirm_password" id="prof-confirm-pw" required minlength="6" placeholder="Ketik ulang password baru" oninput="App._checkPasswordMatch()"
                                               class="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition">
                                        <button type="button" onclick="App.toggleInputVisibility(this)" class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Lihat/Sembunyikan">
                                            <i class="ri-eye-line"></i>
                                        </button>
                                    </div>
                                    <div id="prof-pw-match-hint" class="text-[11px] mt-1 min-h-[16px]"></div>
                                </div>
                            </div>
                        </div>

                        <div class="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button type="submit" class="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-primary-600 dark:hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition">
                                <i class="ri-key-2-line"></i><span>Perbarui Password</span>
                            </button>
                        </div>
                    </form>

                    <!-- Tab 3: Keamanan (2FA & Sesi) -->
                    <div id="prof-panel-security" class="${tab === 'security' ? '' : 'hidden'} space-y-5">
                        <!-- Kartu 2FA Authenticator (TOTP) -->
                        <div class="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3">
                            <div class="flex items-start justify-between gap-3">
                                <div class="flex items-start gap-2.5">
                                    <div class="w-9 h-9 rounded-xl ${is2faOn ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'} flex items-center justify-center shrink-0">
                                        <i class="ri-shield-keyhole-line text-lg"></i>
                                    </div>
                                    <div>
                                        <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100">Autentikasi Dua Faktor (2FA TOTP)</h4>
                                        <p class="text-[11px] text-slate-500 dark:text-slate-400">Verifikasi tambahan via Google Authenticator / Authy saat login</p>
                                    </div>
                                </div>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${is2faOn ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">
                                    ${is2faOn ? 'AKTIF' : 'NONAKTIF'}
                                </span>
                            </div>

                            <div id="profile-2fa-box">
                                ${is2faOn ? `
                                    <div class="flex flex-col sm:flex-row gap-2 pt-1">
                                        <div class="relative flex-1">
                                            <input type="password" id="disable-2fa-pw" placeholder="Masukkan password akun untuk nonaktifkan 2FA"
                                                   onkeydown="if(event.key==='Enter'){event.preventDefault();App.disableTwoFactor();}"
                                                   class="w-full pl-3.5 pr-10 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:border-rose-400">
                                            <button type="button" onclick="App.toggleInputVisibility(this)" class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600" title="Lihat/Sembunyikan">
                                                <i class="ri-eye-line"></i>
                                            </button>
                                        </div>
                                        <button type="button" onclick="App.disableTwoFactor()" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold whitespace-nowrap transition">Nonaktifkan 2FA</button>
                                    </div>
                                ` : `
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                                        <span class="text-[11px] text-slate-500">Direkomendasikan untuk melindungi akses akun Anda.</span>
                                        <button type="button" onclick="App.setupTwoFactor()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 transition">
                                            <i class="ri-qr-code-line"></i><span>Aktifkan 2FA Authenticator</span>
                                        </button>
                                    </div>
                                `}
                            </div>
                        </div>

                        <!-- Kartu Manajemen Sesi Aktif -->
                        <div class="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-3">
                            <div class="flex items-center justify-between gap-2 flex-wrap">
                                <div class="flex items-center gap-2">
                                    <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100">Sesi Login Aktif</h4>
                                    <span id="profile-sessions-count" class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">0</span>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <button type="button" onclick="App.loadUserSessions()" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition" title="Muat ulang daftar sesi">
                                        <i class="ri-refresh-line text-xs"></i>
                                    </button>
                                    <button type="button" onclick="App.revokeOtherSessions()" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-300 rounded-lg text-[11px] font-semibold transition">
                                        Keluar Perangkat Lain
                                    </button>
                                </div>
                            </div>
                            <div id="profile-sessions-list" class="space-y-2 max-h-52 overflow-y-auto text-xs">
                                <div class="text-slate-400 text-center py-4">Memuat daftar sesi…</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `, 'max-w-2xl');
        if (tab === 'security') this.loadUserSessions();
    },

    switchProfileTab(tab) {
        const target = ['profile', 'password', 'security'].includes(tab) ? tab : 'profile';
        ['profile', 'password', 'security'].forEach((t) => {
            document.getElementById(`prof-panel-${t}`)?.classList.toggle('hidden', t !== target);
            const btn = document.getElementById(`prof-tab-${t}`);
            if (!btn) return;
            const active = t === target;
            ['bg-white', 'dark:bg-slate-900', 'text-slate-900', 'dark:text-white', 'shadow-xs'].forEach((c) => btn.classList.toggle(c, active));
            ['text-slate-600', 'dark:text-slate-400'].forEach((c) => btn.classList.toggle(c, !active));
        });
        if (target === 'security') this.loadUserSessions();
    },

    toggleInputVisibility(btn) {
        const input = btn?.parentElement?.querySelector('input');
        const icon = btn?.querySelector('i');
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        if (icon) icon.className = show ? 'ri-eye-off-line' : 'ri-eye-line';
    },

    _checkPasswordMatch() {
        const np = document.getElementById('prof-new-pw')?.value || '';
        const cp = document.getElementById('prof-confirm-pw')?.value || '';
        const hint = document.getElementById('prof-pw-match-hint');
        if (!hint) return;
        if (!cp) {
            hint.innerHTML = '';
            return;
        }
        if (np === cp) {
            hint.innerHTML = '<span class="text-emerald-600 dark:text-emerald-400 font-medium"><i class="ri-check-line"></i> Password cocok</span>';
        } else {
            hint.innerHTML = '<span class="text-rose-600 dark:text-rose-400 font-medium"><i class="ri-close-line"></i> Password belum cocok</span>';
        }
    },

    _parseDeviceLabel(ua = '') {
        const s = String(ua || '');
        const isMobile = /Android|iPhone|iPad|Mobile/i.test(s);
        let os = 'Perangkat';
        if (/Windows/i.test(s)) os = 'Windows';
        else if (/iPhone|iPad/i.test(s)) os = 'iOS';
        else if (/Android/i.test(s)) os = 'Android';
        else if (/Mac OS|Macintosh/i.test(s)) os = 'macOS';
        else if (/Linux/i.test(s)) os = 'Linux';

        let browser = 'Browser';
        if (/Edg\//i.test(s)) browser = 'Microsoft Edge';
        else if (/OPR\//i.test(s)) browser = 'Opera';
        else if (/Chrome\//i.test(s)) browser = 'Google Chrome';
        else if (/Firefox\//i.test(s)) browser = 'Firefox';
        else if (/Safari\//i.test(s)) browser = 'Safari';

        return {
            label: `${browser} · ${os}`,
            icon: isMobile ? 'ri-smartphone-line' : 'ri-computer-line'
        };
    },

    async copyTwoFactorSecret(secret, btn) {
        try {
            await navigator.clipboard.writeText(secret);
            if (btn) {
                const orig = btn.innerHTML;
                btn.innerHTML = '<i class="ri-check-line"></i><span>Tersalin</span>';
                setTimeout(() => { btn.innerHTML = orig; }, 1800);
            }
            toast('Kode rahasia 2FA disalin', 'success');
        } catch {
            toast('Gagal menyalin kode rahasia', 'error');
        }
    },

    async setupTwoFactor() {
        const res = await api('auth/2fa/setup', { method: 'POST' });
        if (!res?.success || !res.data) return;
        const box = document.getElementById('profile-2fa-box');
        if (!box) return;
        const secretEsc = escapeHtml(res.data.secret);
        box.innerHTML = `
            <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/60 space-y-4">
                <div class="flex flex-col sm:flex-row items-center gap-4">
                    <img src="${escapeHtml(res.data.qr_url)}" alt="QR Code 2FA" width="136" height="136" class="w-34 h-34 rounded-xl border border-slate-200 bg-white p-1.5 shrink-0">
                    <div class="space-y-2 text-xs min-w-0 w-full">
                        <div class="font-bold text-slate-800 dark:text-slate-100">Langkah 1 — Scan QR di Aplikasi Authenticator</div>
                        <p class="text-[11px] text-slate-500">Jika tidak bisa scan kamera, salin kunci manual berikut:</p>
                        <div class="flex items-center gap-2">
                            <code class="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-indigo-600 dark:text-indigo-400 select-all break-all">${secretEsc}</code>
                            <button type="button" onclick="App.copyTwoFactorSecret('${secretEsc}', this)" class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 transition">
                                <i class="ri-file-copy-line"></i><span>Salin</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div class="text-xs font-bold text-slate-800 dark:text-slate-100">Langkah 2 — Masukkan Kode 6 Digit</div>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <input type="text" id="enable-2fa-code" inputmode="numeric" maxlength="6" placeholder="000000"
                               oninput="this.value=this.value.replace(/\\D/g,'').slice(0,6)"
                               onkeydown="if(event.key==='Enter'){event.preventDefault();App.enableTwoFactor();}"
                               class="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-mono font-bold text-center tracking-[0.35em] outline-none focus:border-emerald-500">
                        <button type="button" onclick="App.enableTwoFactor()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold whitespace-nowrap transition">Verifikasi &amp; Aktifkan</button>
                        <button type="button" onclick="App.openProfileModal('security')" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition">Batal</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('enable-2fa-code')?.focus();
    },

    async enableTwoFactor() {
        const code = (document.getElementById('enable-2fa-code')?.value || '').trim();
        if (code.length !== 6) {
            toast('Masukkan 6 digit kode dari Authenticator', 'error');
            document.getElementById('enable-2fa-code')?.focus();
            return;
        }
        const res = await api('auth/2fa/enable', { method: 'POST', body: { totp_code: code } });
        if (res?.success) {
            AuthState.user = { ...AuthState.user, totp_enabled: 1 };
            toast('2FA Authenticator berhasil diaktifkan', 'success');
            this.openProfileModal('security');
        }
    },

    async disableTwoFactor() {
        const pwEl = document.getElementById('disable-2fa-pw');
        const pw = pwEl?.value || '';
        if (!pw) {
            toast('Masukkan password akun Anda terlebih dahulu', 'error');
            pwEl?.focus();
            return;
        }
        const res = await api('auth/2fa/disable', { method: 'POST', body: { password: pw } });
        if (res?.success) {
            AuthState.user = { ...AuthState.user, totp_enabled: 0 };
            toast('2FA Authenticator dinonaktifkan', 'info');
            this.openProfileModal('security');
        }
    },

    async loadUserSessions() {
        const el = document.getElementById('profile-sessions-list');
        const countEl = document.getElementById('profile-sessions-count');
        if (!el) return;
        const res = await api('auth/sessions', { cache: false, silent: true });
        if (!res?.success || !Array.isArray(res.data)) {
            el.innerHTML = `<div class="text-slate-400 text-center py-3">Gagal memuat daftar sesi</div>`;
            return;
        }
        if (countEl) countEl.textContent = String(res.data.length);
        if (res.data.length === 0) {
            el.innerHTML = `<div class="text-slate-400 text-center py-3">Belum ada sesi aktif tercatat</div>`;
            return;
        }
        el.innerHTML = res.data.map((s) => {
            const dev = this._parseDeviceLabel(s.user_agent);
            return `
                <div class="p-3 rounded-xl border ${s.is_current ? 'border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20' : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30'} flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-8 h-8 rounded-lg ${s.is_current ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-300'} flex items-center justify-center shrink-0">
                            <i class="${dev.icon} text-base"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-semibold text-slate-800 dark:text-slate-100">${escapeHtml(dev.label)}</span>
                                <span class="font-mono text-[11px] text-slate-500">${escapeHtml(s.ip_address || '-')}</span>
                                ${s.is_current ? '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-300 text-[10px] font-bold">Perangkat Ini</span>' : ''}
                            </div>
                            <div class="text-[11px] text-slate-400 truncate">Aktif terakhir: ${escapeHtml(s.last_activity || '-')}</div>
                        </div>
                    </div>
                    ${s.is_current ? '' : `<button type="button" onclick="App.revokeUserSession(${s.id})" class="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-300 font-semibold text-[11px] shrink-0 transition">Cabut</button>`}
                </div>
            `;
        }).join('');
    },

    async revokeUserSession(id) {
        const ok = await confirmAction('Cabut Sesi Perangkat?', 'Perangkat tersebut akan langsung keluar dan perlu login ulang.', 'Ya, Cabut');
        if (!ok) return;
        const res = await api('auth/sessions/revoke', { method: 'POST', body: { id } });
        if (res?.success) {
            toast('Sesi perangkat dicabut', 'success');
            this.loadUserSessions();
        }
    },

    async revokeOtherSessions() {
        const ok = await confirmAction('Keluar dari Semua Perangkat Lain?', 'Hanya sesi di perangkat ini yang akan tetap aktif.', 'Ya, Keluarkan');
        if (!ok) return;
        const res = await api('auth/sessions/revoke', { method: 'POST', body: { all_others: true } });
        if (res?.success) {
            toast('Semua sesi perangkat lain dicabut', 'success');
            this.loadUserSessions();
        }
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
                    <div class="flex items-center gap-3.5 p-4 bg-gradient-to-r from-primary-50 to-indigo-50/60 dark:from-primary-950/40 dark:to-indigo-950/20 rounded-2xl border border-primary-100 dark:border-primary-900/40">
                        <img src="assets/icons/icon.svg" class="w-12 h-12 rounded-xl app-brand-logo shrink-0" alt="Logo">
                        <div>
                            <h4 class="font-extrabold text-sm text-slate-900 dark:text-white">CRUDWorks ERP</h4>
                            <p class="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">Sistem manajemen proyek, penagihan, akuntansi &amp; layanan klien terpadu.</p>
                            <span class="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/60 font-mono text-[10px] font-bold text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/50">Versi Aktif: v${this.version}</span>
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
                        <span>Tata Letak: <strong class="text-slate-700 dark:text-slate-200 uppercase">${escapeHtml(nav.navLayout)}</strong></span>
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
                if (!this._cachedChangelog) {
                    const res = await fetch(`${apiClient.ROOT_BASE}CHANGELOG.md?_t=${Date.now()}`, { cache: 'no-cache' });
                    if (res.ok) this._cachedChangelog = await res.text();
                }
                if (!this._cachedChangelog) {
                    body.innerHTML = `
                        <div class="text-center py-8 space-y-2">
                            <i class="ri-file-warning-line text-3xl text-amber-500"></i>
                            <p class="text-xs text-slate-500">Catatan rilis belum dapat dimuat.</p>
                        </div>
                    `;
                    return;
                }

                // Format Markdown menjadi kartu rilis yang rapi & ramah pembaca
                const lines = this._cachedChangelog.split(/\r?\n/);
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

    // ===== Notification Bell Popover =====
    async loadNotifications(silentRefresh = false) {
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

        const alerts = dashData.alerts || [];
        const inAppItems = inAppData.items || [];
        const totalBadge = (Number(dashData.total_badge) || 0) + (Number(inAppData.unread_count) || 0);

        if (totalBadge > 0) {
            badge.textContent = totalBadge > 99 ? '99+' : String(totalBadge);
            badge.classList.remove('hidden');
            badge.style.display = 'inline-flex';
        } else {
            badge.classList.add('hidden');
            badge.style.display = 'none';
        }

        if (alerts.length === 0 && inAppItems.length === 0) {
            list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400"><i class="ri-checkbox-circle-line text-2xl text-emerald-400 block mb-1"></i>Semua terkendali, tidak ada notifikasi baru.</div>`;
            return;
        }

        const inAppHtml = inAppItems.length ? `
            <div class="px-3.5 py-2 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Aktivitas Real-Time</span>
                ${Number(inAppData.unread_count) > 0 ? `<button type="button" onclick="App.markAllNotifRead()" class="text-primary-600 hover:underline font-semibold">Tandai dibaca</button>` : ''}
            </div>
            ${inAppItems.map((n) => {
                const unread = Number(n.is_read) === 0;
                const badgeCls = n.tipe === 'bahaya' ? 'bg-rose-50 text-rose-600 border-rose-100'
                    : (n.tipe === 'peringatan' ? 'bg-amber-50 text-amber-600 border-amber-100'
                    : (n.tipe === 'sukses' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'));
                return `
                    <a href="${escapeHtml(n.tautan || '#/dashboard')}" onclick="App.markNotifRead(${n.id}); App.closeNotifications();"
                       class="flex items-start gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition ${unread ? 'bg-primary-50/30 dark:bg-primary-950/15' : 'opacity-75'}">
                        <div class="w-8 h-8 rounded-xl border ${badgeCls} flex items-center justify-center shrink-0 mt-0.5">
                            <i class="ri-notification-3-line"></i>
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
            }).join('')}
        ` : '';

        const alertsHtml = alerts.map((a) => {
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

        list.innerHTML = inAppHtml + alertsHtml;
    },

    async markNotifRead(id) {
        if (!id) return;
        await api('notifications/read', { method: 'POST', body: { id }, silent: true });
        this.loadNotifications(true);
    },

    async markAllNotifRead() {
        await api('notifications/read', { method: 'POST', body: { all: true }, silent: true });
        this.loadNotifications(true);
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
