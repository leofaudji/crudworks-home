// =========================================================================
// CHANGELOG PAGE - Catatan Rilis Dinamis Berbasis Berkas CHANGELOG.md
// =========================================================================
const ChangelogPage = {
    _rawMarkdown: '',
    _cachedReleases: null,
    _lastUpdated: '',
    _selectedVersion: 'all',
    _searchQuery: '',
    _showRawMarkdown: false,
    _isLoading: false,
    _collapsedVersions: new Set(),
    _initializedCollapsed: false,

    colorClasses: {
        emerald: {
            title: 'text-emerald-700 dark:text-emerald-400',
            dot: 'bg-emerald-500',
            bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30'
        },
        blue: {
            title: 'text-blue-700 dark:text-blue-400',
            dot: 'bg-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30'
        },
        violet: {
            title: 'text-violet-700 dark:text-violet-400',
            dot: 'bg-violet-500',
            bg: 'bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/30'
        },
        red: {
            title: 'text-red-700 dark:text-red-400',
            dot: 'bg-red-500',
            bg: 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30'
        },
        amber: {
            title: 'text-amber-700 dark:text-amber-400',
            dot: 'bg-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30'
        },
        rose: {
            title: 'text-rose-700 dark:text-rose-400',
            dot: 'bg-rose-500',
            bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30'
        }
    },

    groupMeta: {
        'added': { title: 'Fitur Baru', color: 'emerald', icon: 'ri-sparkling-line' },
        'changed': { title: 'Peningkatan', color: 'blue', icon: 'ri-arrow-up-circle-line' },
        'fixed': { title: 'Perbaikan', color: 'violet', icon: 'ri-tools-line' },
        'security': { title: 'Keamanan', color: 'red', icon: 'ri-shield-check-line' },
        'deprecated': { title: 'Penyesuaian', color: 'amber', icon: 'ri-alert-line' },
        'removed': { title: 'Dihapus', color: 'rose', icon: 'ri-delete-bin-line' }
    },

    /**
     * Escape and format inline Markdown syntax into sanitized HTML
     */
    formatInline(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-primary-600 dark:text-primary-400 font-mono text-[11px] font-medium">$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-800 dark:text-slate-100">$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em class="italic text-slate-700 dark:text-slate-300">$1</em>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary-600 hover:text-primary-700 dark:text-primary-400 underline underline-offset-2 font-medium">$1</a>');
    },

    /**
     * Convert YYYY-MM-DD to standard Indonesian date string
     */
    formatDate(raw) {
        if (!raw) return '';
        const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
            const months = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const day = parseInt(match[3], 10);
            const m = parseInt(match[2], 10);
            const y = match[1];
            return `${day} ${months[m]} ${y}`;
        }
        return raw;
    },

    /**
     * Robust Keep a Changelog Markdown Parser
     */
    parseChangelog(md) {
        if (!md || typeof md !== 'string') return [];
        const lines = md.split(/\r?\n/);
        const releases = [];
        let currentRelease = null;
        let currentGroup = null;
        let currentItem = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Match release header: ## [1.4.0] - 2026-11-13 or ## [v1.4.0] - 2026-11-13 or ## 1.4.0 - 2026-11-13
            const vMatch = line.match(/^##\s+\[?v?([0-9A-Za-z.\-]+)\]?\s*(?:-\s*(.*))?$/);
            if (vMatch) {
                const ver = vMatch[1];
                const rawDate = (vMatch[2] || '').trim();
                currentRelease = {
                    version: ver.startsWith('v') ? ver : 'v' + ver,
                    rawVersion: ver,
                    rawDate: rawDate,
                    date: this.formatDate(rawDate),
                    summary: '',
                    groups: []
                };
                releases.push(currentRelease);
                currentGroup = null;
                currentItem = null;
                continue;
            }

            if (!currentRelease) continue;

            // Match section header: ### Added / ### Changed / etc.
            const gMatch = line.match(/^###\s+(.+)$/);
            if (gMatch) {
                const rawTitle = gMatch[1].trim();
                const key = rawTitle.toLowerCase();
                const meta = this.groupMeta[key] || {
                    title: rawTitle,
                    color: 'blue',
                    icon: 'ri-information-line'
                };
                currentGroup = {
                    key: key,
                    rawTitle: rawTitle,
                    title: meta.title,
                    color: meta.color,
                    icon: meta.icon,
                    items: []
                };
                currentRelease.groups.push(currentGroup);
                currentItem = null;
                continue;
            }

            // If we are before any ### group, lines can be release summary prose
            if (!currentGroup) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('---') && !trimmed.startsWith('#')) {
                    if (currentRelease.summary) {
                        currentRelease.summary += ' ' + this.formatInline(trimmed);
                    } else {
                        currentRelease.summary = this.formatInline(trimmed);
                    }
                }
                continue;
            }

            // Sub-item: "  - Text" or "    - Text" or "\t- Text"
            const subMatch = line.match(/^(?:\s{2,4}|\t)[-*+]\s+(.*)$/);
            if (subMatch && currentItem) {
                currentItem.children = currentItem.children || [];
                currentItem.children.push(this.formatInline(subMatch[1].trim()));
                continue;
            }

            // Top-level item: "- Text" or "* Text"
            const itemMatch = line.match(/^[-*+]\s+(.*)$/);
            if (itemMatch) {
                currentItem = {
                    text: this.formatInline(itemMatch[1].trim()),
                    children: []
                };
                currentGroup.items.push(currentItem);
                continue;
            }

            // Multiline continuation
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
                if (currentItem) {
                    if (currentItem.children && currentItem.children.length > 0) {
                        currentItem.children[currentItem.children.length - 1] += ' ' + this.formatInline(trimmed);
                    } else {
                        currentItem.text += ' ' + this.formatInline(trimmed);
                    }
                }
            }
        }

        // Auto-generate summary for releases without one
        releases.forEach((rel) => {
            if (!rel.summary) {
                const totalItems = rel.groups.reduce((acc, g) => acc + g.items.length, 0);
                const groupNames = rel.groups.map(g => g.rawTitle || g.title).join(', ');
                rel.summary = `Rilis ${rel.version} mencakup ${totalItems} poin pembaruan terverifikasi pada kategori: ${groupNames || 'Pembaruan Sistem'}.`;
            }
        });

        return releases;
    },

    /**
     * Fetch CHANGELOG.md directly from web root or via API fallback
     */
    async fetchMarkdown(forceRefresh = false) {
        if (!forceRefresh && this._rawMarkdown) {
            return this._rawMarkdown;
        }

        this._isLoading = true;
        let md = '';

        // 1. First priority: Direct HTTP Fetch from root CHANGELOG.md
        try {
            const root = window.App?.apiClient?.ROOT_BASE || './';
            const changelogUrl = `${root}CHANGELOG.md?_t=${Date.now()}`;
            const res = await fetch(changelogUrl, { cache: 'no-cache' });
            if (res.ok) {
                md = await res.text();
            }
        } catch (e) {
            console.warn('[ChangelogPage] Direct fetch CHANGELOG.md failed, trying API fallback...', e);
        }

        // 2. Fallback priority: GET /api/changelog
        if (!md && window.App?.api) {
            try {
                const apiRes = await window.App.api('changelog');
                if (apiRes && apiRes.success && apiRes.data?.content) {
                    md = apiRes.data.content;
                    if (apiRes.data.updated_at) {
                        this._lastUpdated = apiRes.data.updated_at;
                    }
                }
            } catch (e) {
                console.error('[ChangelogPage] API changelog fallback failed:', e);
            }
        }

        this._isLoading = false;
        if (md) {
            this._rawMarkdown = md;
            this._cachedReleases = this.parseChangelog(md);
        }
        return md;
    },

    /**
     * Main render entrypoint
     */
    async render(container) {
        this.container = container;
        this.renderSkeleton(container);

        try {
            const md = await this.fetchMarkdown();
            if (!md || !this._cachedReleases || this._cachedReleases.length === 0) {
                this.renderError(container, 'Tidak dapat memuat atau mem-parsing berkas CHANGELOG.md.');
                return;
            }
            this.renderContent();
        } catch (err) {
            console.error('[ChangelogPage] Render error:', err);
            this.renderError(container, err.message || 'Terjadi kesalahan saat memuat data changelog.');
        }
    },

    /**
     * Render skeleton while fetching
     */
    renderSkeleton(container) {
        container.innerHTML = `
        <div class="max-w-5xl mx-auto space-y-6 animate-pulse">
            <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div class="space-y-2">
                    <div class="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div class="h-6 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div class="h-3 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
                <div class="h-9 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            </div>
            <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div class="h-6 w-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div class="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div class="h-24 w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
            </div>
        </div>`;
    },

    /**
     * Render error fallback state
     */
    renderError(container, message) {
        container.innerHTML = `
        <div class="max-w-xl mx-auto py-12 text-center space-y-4">
            <div class="w-16 h-16 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 flex items-center justify-center text-3xl">
                <i class="ri-error-warning-line"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100">Gagal Memuat Changelog</h3>
            <p class="text-sm text-slate-500">${message}</p>
            <div class="pt-2 flex items-center justify-center gap-3">
                <button id="btn-retry-changelog" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2">
                    <i class="ri-refresh-line"></i> Coba Muat Ulang
                </button>
                <a href="#/dashboard" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold">
                    Kembali ke Dashboard
                </a>
            </div>
        </div>`;

        container.querySelector('#btn-retry-changelog')?.addEventListener('click', () => {
            this.render(container);
        });
    },

    /**
     * Filter releases according to selected version and search query
     */
    getFilteredReleases() {
        let list = this._cachedReleases || [];
        if (this._selectedVersion !== 'all') {
            list = list.filter(r => r.version === this._selectedVersion);
        }
        if (this._searchQuery.trim()) {
            const q = this._searchQuery.toLowerCase();
            list = list.filter(r => {
                if (r.version.toLowerCase().includes(q) || r.date.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q)) {
                    return true;
                }
                return r.groups.some(g =>
                    g.title.toLowerCase().includes(q) ||
                    g.items.some(it => it.text.toLowerCase().includes(q) || (it.children && it.children.some(c => c.toLowerCase().includes(q))))
                );
            });
        }
        return list;
    },

    /**
     * Render the main Changelog UI
     */
    renderContent() {
        if (!this.container) return;

        const releases = this._cachedReleases || [];
        const filtered = this.getFilteredReleases();
        const installedVersion = (window.App?.version || '1.4.0').replace(/^v?/, 'v');
        const latestRelease = releases[0] || {};
        const totalItemsCount = releases.reduce((sum, r) => sum + r.groups.reduce((gSum, g) => gSum + g.items.length, 0), 0);

        // Default: Keep latest release expanded, collapse older releases
        if (!this._initializedCollapsed && releases.length > 1) {
            this._collapsedVersions = new Set(releases.slice(1).map(r => r.version));
            this._initializedCollapsed = true;
        }

        // When actively searching, auto-expand matching releases
        if (this._searchQuery.trim()) {
            filtered.forEach(r => this._collapsedVersions.delete(r.version));
        }

        this.container.innerHTML = `
        <div class="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
            <!-- Hero Header -->
            <div class="bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/60 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div class="space-y-2">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/60">
                            Pembaruan Produk
                        </span>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            Versi Aktif ${installedVersion}
                        </span>
                    </div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Catatan Rilis &amp; Pembaruan
                    </h1>
                    <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                        Ringkasan fitur baru, penyempurnaan alur kerja, dan peningkatan keamanan terbaru untuk mendukung operasional bisnis Anda.
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-2 shrink-0">
                    <button id="btn-refresh-changelog" title="Muat ulang catatan rilis" class="px-3.5 py-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 shadow-2xs">
                        <i class="ri-refresh-line ${this._isLoading ? 'animate-spin' : ''}"></i>
                        <span>Segarkan</span>
                    </button>
                    <a href="#/dashboard" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-primary-600 dark:hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition">
                        <i class="ri-arrow-left-line"></i><span>Dashboard</span>
                    </a>
                </div>
            </div>

            <!-- Filter & Search Bar -->
            <div class="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
                <div class="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
                    <button data-ver="all" class="changelog-ver-chip px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${this._selectedVersion === 'all' ? 'bg-slate-900 text-white dark:bg-primary-600 shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
                        Semua (${releases.length})
                    </button>
                    ${releases.map(r => `
                    <button data-ver="${r.version}" class="changelog-ver-chip shrink-0 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${this._selectedVersion === r.version ? 'bg-slate-900 text-white dark:bg-primary-600 shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
                        ${r.version}
                    </button>`).join('')}
                </div>

                <div class="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                    <div class="flex items-center gap-1">
                        <button type="button" id="btn-page-expand-all" class="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1" title="Buka semua versi">
                            <i class="ri-expand-up-down-line"></i> <span class="hidden sm:inline">Buka Semua</span>
                        </button>
                        <button type="button" id="btn-page-collapse-all" class="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1" title="Tutup semua versi">
                            <i class="ri-collapse-diagonal-line"></i> <span class="hidden sm:inline">Tutup Semua</span>
                        </button>
                    </div>
                    <div class="relative w-full md:w-56 shrink-0">
                        <i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input type="text" id="changelog-search" value="${this._searchQuery}" placeholder="Cari fitur atau pembaruan..." class="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                    </div>
                </div>
            </div>

            <!-- TIMELINE RELEASE LIST -->
            ${filtered.length === 0 ? `
                <div class="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <i class="ri-search-line text-3xl text-slate-400"></i>
                    <h4 class="text-sm font-bold text-slate-700 dark:text-slate-200">Tidak ada pembaruan yang cocok</h4>
                    <p class="text-xs text-slate-500">Coba kata kunci lain atau pilih filter "Semua".</p>
                </div>
            ` : `
                <div class="relative pl-6 sm:pl-8 space-y-5 before:content-[''] before:absolute before:left-2.5 sm:before:left-3 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    ${filtered.map((rel) => {
                        const isLatest = rel.version === latestRelease.version;
                        const isInstalled = rel.version === installedVersion;
                        const isCollapsed = this._collapsedVersions.has(rel.version);

                        return `
                    <div class="relative bg-white dark:bg-slate-900 rounded-3xl border ${isLatest ? 'border-primary-300/80 dark:border-primary-700/50 shadow-sm' : 'border-slate-200/80 dark:border-slate-800 shadow-2xs'} transition-all changelog-page-card" data-ver="${rel.version}">
                        <!-- Timeline Dot -->
                        <span class="absolute -left-[22px] sm:-left-[27px] top-7 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-950 ${isLatest ? 'bg-primary-600 ring-4 ring-primary-500/20' : 'bg-slate-300 dark:bg-slate-700'}"></span>

                        <button type="button" class="w-full text-left p-5 sm:p-6 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 rounded-3xl transition-colors changelog-page-accordion-btn" aria-expanded="${!isCollapsed}">
                            <div class="flex items-center gap-3.5">
                                <span class="px-3 py-1 rounded-xl ${isLatest ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'} font-mono text-xs font-extrabold">
                                    ${rel.version}
                                </span>
                                <div>
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <h3 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                            Pembaruan Versi ${rel.version}
                                        </h3>
                                        ${isLatest ? `
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 inline-flex items-center gap-1">
                                                <i class="ri-sparkling-line"></i> Terbaru
                                            </span>` : ''}
                                        ${isInstalled ? `
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800">
                                                Aktif
                                            </span>` : ''}
                                    </div>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                        <i class="ri-calendar-line text-[11px]"></i>
                                        <span>${rel.date || rel.rawDate}</span>
                                    </p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2.5">
                                <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg bg-slate-100/80 dark:bg-slate-800">
                                    ${rel.groups.reduce((acc, g) => acc + g.items.length, 0)} Pembaruan
                                </span>
                                <i class="ri-arrow-down-s-line text-xl text-slate-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'} changelog-chevron"></i>
                            </div>
                        </button>

                        <div class="changelog-page-card-body px-5 sm:px-6 pb-6 pt-1 space-y-4 border-t border-slate-100 dark:border-slate-800/80 ${isCollapsed ? 'hidden' : ''}">
                            <div class="space-y-3.5 pt-3">
                                ${rel.groups.map(g => {
                                    const cls = this.colorClasses[g.color] || this.colorClasses.blue;
                                    return `
                                <div class="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 space-y-2.5">
                                    <div class="flex items-center justify-between">
                                        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${cls.bg} ${cls.title} border">
                                            <i class="${g.icon}"></i>
                                            <span>${g.title}</span>
                                        </span>
                                        <span class="text-[11px] font-medium text-slate-400">${g.items.length} poin</span>
                                    </div>
                                    <ul class="space-y-2 text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                        ${g.items.map(it => `
                                        <li class="flex items-start gap-2.5">
                                            <span class="w-1.5 h-1.5 rounded-full ${cls.dot} mt-2 shrink-0"></span>
                                            <div class="flex-1 space-y-1">
                                                <div>${it.text}</div>
                                                ${it.children && it.children.length > 0 ? `
                                                <ul class="space-y-1 mt-1.5 ml-1 pl-3 border-l-2 border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                                                    ${it.children.map(ch => `
                                                    <li class="flex items-start gap-1.5">
                                                        <span class="text-slate-400 font-bold shrink-0">•</span>
                                                        <span>${ch}</span>
                                                    </li>`).join('')}
                                                </ul>` : ''}
                                            </div>
                                        </li>`).join('')}
                                    </ul>
                                </div>`;
                                }).join('')}
                            </div>
                        </div>
                    </div>`;
                    }).join('')}
                </div>
            `}

            <!-- Footer Meta -->
            <div class="text-center text-xs text-slate-400 dark:text-slate-500 pt-2">
                Menampilkan <strong>${releases.length}</strong> rilis dengan total <strong>${totalItemsCount}</strong> pembaruan sistem.
            </div>
        </div>`;

        this.bindEvents();
    },

    /**
     * Escape pre tags
     */
    escapePre(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    /**
     * Bind UI event listeners
     */
    bindEvents() {
        if (!this.container) return;

        // Sync Re-fetch Button
        const btnRefresh = this.container.querySelector('#btn-refresh-changelog');
        btnRefresh?.addEventListener('click', async () => {
            const icon = btnRefresh.querySelector('i');
            icon?.classList.add('animate-spin');
            await this.fetchMarkdown(true);
            icon?.classList.remove('animate-spin');
            if (window.App?.toast) {
                window.App.toast('CHANGELOG.md berhasil disinkronkan ulang', 'success');
            }
            this.renderContent();
        });

        // Toggle Raw MD View
        const btnToggleRaw = this.container.querySelector('#btn-toggle-raw');
        btnToggleRaw?.addEventListener('click', () => {
            this._showRawMarkdown = !this._showRawMarkdown;
            this.renderContent();
        });

        // Copy Raw MD to clipboard
        const btnCopyRaw = this.container.querySelector('#btn-copy-raw-md');
        btnCopyRaw?.addEventListener('click', () => {
            navigator.clipboard.writeText(this._rawMarkdown).then(() => {
                if (window.App?.toast) window.App.toast('Konten CHANGELOG.md disalin ke clipboard', 'success');
            });
        });

        // Version Chip Filter
        const verChips = this.container.querySelectorAll('.changelog-ver-chip');
        verChips.forEach(chip => {
            chip.addEventListener('click', () => {
                this._selectedVersion = chip.dataset.ver || 'all';
                this.renderContent();
            });
        });

        // Expand All / Collapse All Buttons
        const btnExpandAll = this.container.querySelector('#btn-page-expand-all');
        btnExpandAll?.addEventListener('click', () => {
            this._collapsedVersions.clear();
            this.container.querySelectorAll('.changelog-page-card-body').forEach(el => el.classList.remove('hidden'));
            this.container.querySelectorAll('.changelog-chevron').forEach(el => el.classList.add('rotate-180'));
            this.container.querySelectorAll('.changelog-page-accordion-btn').forEach(btn => btn.setAttribute('aria-expanded', 'true'));
        });

        const btnCollapseAll = this.container.querySelector('#btn-page-collapse-all');
        btnCollapseAll?.addEventListener('click', () => {
            (this._cachedReleases || []).forEach(r => this._collapsedVersions.add(r.version));
            this.container.querySelectorAll('.changelog-page-card-body').forEach(el => el.classList.add('hidden'));
            this.container.querySelectorAll('.changelog-chevron').forEach(el => el.classList.remove('rotate-180'));
            this.container.querySelectorAll('.changelog-page-accordion-btn').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
        });

        // Individual Card Accordion Toggle
        const accordionBtns = this.container.querySelectorAll('.changelog-page-accordion-btn');
        accordionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const card = btn.closest('.changelog-page-card');
                const ver = card?.dataset?.ver;
                const body = card?.querySelector('.changelog-page-card-body');
                const chevron = btn.querySelector('.changelog-chevron');
                if (!body) return;

                const isHidden = body.classList.toggle('hidden');
                chevron?.classList.toggle('rotate-180', !isHidden);
                btn.setAttribute('aria-expanded', !isHidden);

                if (ver) {
                    if (isHidden) {
                        this._collapsedVersions.add(ver);
                    } else {
                        this._collapsedVersions.delete(ver);
                    }
                }
            });
        });

        // Search Input
        const searchInput = this.container.querySelector('#changelog-search');
        if (searchInput) {
            searchInput.focus();
            // Preserve cursor at end
            const val = searchInput.value;
            searchInput.value = '';
            searchInput.value = val;

            let debounceTimer = null;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this._searchQuery = e.target.value;
                    this.renderContent();
                }, 200);
            });
        }
    }
};

window.ChangelogPage = ChangelogPage;
export default ChangelogPage;
