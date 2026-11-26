// ============================================
// CORE ROUTER - Hash SPA Router, Dynamic ES Module Loader & Prefetcher
// ============================================
import { apiClient } from './api.js';
import { AuthState } from './auth.js';
import { enhanceDataTables } from './datatable.js';
import { escapeHtml, skeletonCardsHtml, skeletonTableHtml } from './utils.js';

export const ROUTE_META = {
    'dashboard':  { file: 'dashboard',  title: 'Dashboard',             subtitle: 'Ikhtisar tagihan, pendapatan, dan proyek' },
    'app-flow':   { file: 'app-flow',   title: 'Alur Aplikasi 3D',      subtitle: 'Visualisasi interaktif arsitektur & alur bisnis end-to-end CRUDWorks ERP' },
    'clients':    { file: 'clients',    title: 'Pelanggan & Prospek',   subtitle: 'Pipeline prospek CRM, data kontak & riwayat penagihan' },
    'projects':   { file: 'projects',   title: 'Manajemen Proyek',      subtitle: 'Integrasi aplikasi app-git & penugasan pelanggan' },
    'services':   { file: 'services',   title: 'Katalog Layanan',       subtitle: 'Paket hosting, maintenance & software development' },
    'invoices':   { file: 'invoices',   title: 'Tagihan & Faktur',      subtitle: 'Penerbitan faktur resmi, cetak tagihan & status bayar' },
    'quotations': { file: 'quotations', title: 'Surat Penawaran (SPH)', subtitle: 'Manajemen penawaran resmi, persetujuan & konversi ke faktur' },
    'contracts':  { file: 'contracts',  title: 'Kontrak & SPK Digital', subtitle: 'Surat Perjanjian Kerja (SPK/PKS) & pengesahan digital klien' },
    'knowledge-base': { file: 'knowledge_base', title: 'Knowledge Base', subtitle: 'Panduan penggunaan, SOP & FAQ untuk Portal Klien' },
    'expenses':   { file: 'expenses',   title: 'Beban & Pengeluaran',   subtitle: 'Pencatatan beban operasional, server cloud & project costing' },
    'maintenance':{ file: 'maintenance',title: 'SLA & Pemantau Domain', subtitle: 'Pemantauan uptime live, sertifikat SSL & kontrak SLA' },
    'tickets':    { file: 'tickets',    title: 'Tiket Gangguan Klien',  subtitle: 'Penanganan laporan gangguan & dukungan teknis dari Portal Klien' },
    'company-assets': { file: 'company-assets', title: 'Aset & Langganan Cloud', subtitle: 'Pencatatan server, cloud VPS, domain & lisensi pihak ketiga' },
    'credentials':{ file: 'credentials',title: 'Brankas Kredensial',     subtitle: 'Penyimpanan terenkripsi AES-256 akses server, cPanel & database klien' },
    'timesheets': { file: 'timesheets', title: 'Log Jam Kerja (Timesheet)', subtitle: 'Pencatatan waktu kerja tim developer & penagihan berbasis jam' },
    'public-invoice': { file: 'public-invoice', title: 'Portal Faktur Pelanggan', subtitle: 'Pratinjau tagihan & konfirmasi bukti pembayaran online' },
    'public-quotation': { file: 'public-quotation', title: 'Portal Persetujuan Penawaran', subtitle: 'Pratinjau proposal penawaran & persetujuan tanda tangan digital' },
    'status':           { file: 'public-status',    title: 'Status Layanan Publik',        subtitle: 'Pemantauan uptime real-time & kesehatan sertifikat SSL' },
    'client-portal': { file: 'client-portal', title: 'Portal Layanan Klien Terpadu', subtitle: 'Pusat akses dokumen faktur, proposal penawaran & SLA aset' },
    'payments':   { file: 'payments',   title: 'Pembayaran Masuk',      subtitle: 'Pencatatan bukti bayar & verifikasi pelunasan' },
    'bank-accounts': { file: 'bank-accounts', title: 'Rekening Bank Resmi', subtitle: 'Master rekening bank resmi perusahaan untuk faktur & kwitansi' },
    'recurring':  { file: 'recurring',  title: 'Tagihan Berulang',      subtitle: 'Jadwal penagihan otomatis periodik' },
    'reports':    { file: 'reports',    title: 'Laporan Finansial',     subtitle: 'Rekapitulasi omzet, piutang & status penagihan' },
    'profit-loss':{ file: 'profit-loss',title: 'Laba Rugi & Profit',      subtitle: 'Analisis laba bersih, komparasi tahunan & profitabilitas proyek' },
    'coa':        { file: 'accounting', title: 'Master COA (Bagan Akun)', subtitle: 'Kelola daftar akun akuntansi (Aset, Kewajiban, Ekuitas, Pendapatan, Beban)' },
    'journals':   { file: 'accounting', title: 'Jurnal Umum',             subtitle: 'Pencatatan jurnal otomatis dari ERP & entri jurnal manual double-entry' },
    'ledger':     { file: 'accounting', title: 'Buku Besar (General Ledger)', subtitle: 'Mutasi debit/kredit dan saldo berjalan per akun COA' },
    'balance-sheet': { file: 'accounting', title: 'Neraca Keuangan',      subtitle: 'Posisi keuangan Aset, Kewajiban, Ekuitas & Laba Berjalan' },
    'trial-balance': { file: 'accounting', title: 'Neraca Saldo (Trial Balance)', subtitle: 'Saldo awal, mutasi debit/kredit & saldo akhir seluruh akun COA' },
    'income-statement': { file: 'accounting', title: 'Laba Rugi (COA)', subtitle: 'Laporan Laba Rugi berbasis akun Pendapatan & Beban dari Jurnal Umum' },
    'cash-flow':        { file: 'accounting', title: 'Laporan Arus Kas (PSAK)', subtitle: 'Aliran kas Operasional, Investasi & Pendanaan dari buku besar kas/bank' },
    'equity-statement': { file: 'accounting', title: 'Perubahan Ekuitas', subtitle: 'Mutasi modal disetor, laba ditahan & laba periode berjalan' },
    'period-closing':{ file: 'accounting', title: 'Tutup Buku Periode',   subtitle: 'Penguncian periode akuntansi & pembuatan jurnal penutup otomatis' },
    'users':      { file: 'users',      title: 'Manajemen Pengguna',    subtitle: 'Kelola akun staf, administrator & permission' },
    'roles':      { file: 'roles',      title: 'Hak Akses (RBAC)',      subtitle: 'Konfigurasi peran dan hak akses sistem' },
    'settings':   { file: 'settings',   title: 'Pengaturan Sistem',     subtitle: 'Identitas bisnis, bank, dan preferensi ERP' },
    'audit':      { file: 'audit',      title: 'Jejak Audit',           subtitle: 'Log aktivitas dan rekam jejak transaksi' },
    'backup':     { file: 'backup',     title: 'Cadangan & Pemulihan',  subtitle: 'Arsip pencadangan database MySQL, unduh berkas SQL & pemulihan data' },
    'changelog':  { file: 'changelog',  title: 'Catatan Rilis',         subtitle: 'Riwayat versi dan pembaruan sistem' }
};

export class Router {
    constructor(options = {}) {
        this._pageModules = {};
        this.currentRoute = '';
        this.version = options.version || '1.0.0';
        this.onRouteChange = options.onRouteChange || null;
        this._navCounter = 0;
    }

    setVersion(v) {
        if (v) this.version = v;
    }

    /**
     * Parse location.hash into { slug, param, query, fullHash }
     */
    parseHash(rawHash = window.location.hash) {
        let hash = rawHash || '#/dashboard';
        if (!hash.startsWith('#/')) {
            hash = '#/dashboard';
        }
        const [pathPart, queryPart] = hash.slice(2).split('?');
        const segments = (pathPart || 'dashboard').split('/').filter(Boolean);
        const slug = (segments[0] || 'dashboard').toLowerCase();
        const param = segments.slice(1).join('/') || null;

        const query = {};
        if (queryPart) {
            const usp = new URLSearchParams(queryPart);
            usp.forEach((v, k) => { query[k] = v; });
        }

        return {
            slug,
            param,
            query,
            baseHash: `#/${slug}`,
            fullHash: hash
        };
    }

    /**
     * Load page module from assets/js/pages/<file>.js with cache
     */
    async loadModule(slug) {
        const meta = ROUTE_META[slug];
        const fileName = meta ? meta.file : slug;

        if (!/^[a-z0-9_-]+$/i.test(fileName)) {
            throw new Error(`Invalid route slug: ${fileName}`);
        }

        if (this._pageModules[fileName]) {
            return this._pageModules[fileName];
        }

        const mod = await import(`../pages/${fileName}.js?v=${encodeURIComponent(this.version)}`);
        this._pageModules[fileName] = mod;
        return mod;
    }

    /**
     * Prefetch module cleanly on pointer hover
     */
    prefetch(hash) {
        if (!hash || !hash.startsWith('#/')) return;
        const { slug } = this.parseHash(hash);
        const meta = ROUTE_META[slug];
        if (!meta || this._pageModules[meta.file]) return;

        this.loadModule(slug).catch(() => {});
    }

    /**
     * Attach global pointerenter prefetch listener
     */
    enableHoverPrefetch() {
        document.addEventListener('pointerenter', (e) => {
            if (!e.target || typeof e.target.closest !== 'function') return;
            const link = e.target.closest('#sidebar-menu [data-url], a[href^="#/"]');
            if (!link) return;
            const hash = link.getAttribute('data-url') || link.getAttribute('href');
            if (hash) this.prefetch(hash);
        }, { capture: true, passive: true });
    }

    _formatSectionLabel(text) {
        if (!text) return '';
        if (text === text.toUpperCase() && text.length > 3) {
            return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
        }
        return text;
    }

    _findMenuTrail(nodes, targetHash, trail = []) {
        for (const node of nodes || []) {
            const label = this._formatSectionLabel(node.nama || '');
            if (node.url && node.url.split('?')[0] === targetHash) {
                return [...trail, label];
            }
            if (Array.isArray(node.children) && node.children.length > 0) {
                const found = this._findMenuTrail(node.children, targetHash, label ? [...trail, label] : trail);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * Navigate to current hash or specified hash
     */
    async handleRoute() {
        const container = document.getElementById('app-content');
        if (!container) return;

        const parsed = this.parseHash(window.location.hash);
        if (!window.location.hash || !window.location.hash.startsWith('#/')) {
            window.location.hash = '#/dashboard';
            return;
        }

        const navId = ++this._navCounter;
        this.currentRoute = parsed.baseHash;

        const meta = ROUTE_META[parsed.slug];
        const titleEl = document.getElementById('page-title');
        const subEl = document.getElementById('page-subtitle');

        if (titleEl) {
            titleEl.textContent = meta ? meta.title : parsed.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        }
        if (subEl) {
            if (meta && meta.subtitle) {
                subEl.textContent = meta.subtitle;
                subEl.classList.remove('hidden');
            } else {
                subEl.textContent = '';
                subEl.classList.add('hidden');
            }
        }

        // Update Breadcrumb trail from RBAC menu tree
        const bcBar = document.getElementById('page-breadcrumb-bar');
        const bcEl = document.getElementById('page-breadcrumb');
        if (bcEl && bcBar) {
            const trail = this._findMenuTrail(AuthState.menus || [], parsed.baseHash);
            if (trail && trail.length > 1) {
                bcEl.innerHTML = `<i class="ri-home-4-line text-slate-400 text-xs flex-shrink-0"></i>` + trail.map((label, idx) => {
                    const isLast = idx === trail.length - 1;
                    const cls = isLast ? 'text-primary-600 font-bold truncate' : 'text-slate-500 dark:text-slate-400 truncate';
                    return `<i class="ri-arrow-right-s-line text-slate-300 dark:text-slate-600 text-xs flex-shrink-0"></i><span class="${cls}">${escapeHtml(label)}</span>`;
                }).join('');
                bcBar.classList.remove('hidden');
            } else {
                bcEl.innerHTML = '';
                bcBar.classList.add('hidden');
            }
        }

        if (typeof this.onRouteChange === 'function') {
            this.onRouteChange(parsed, meta);
        }

        // Loading skeleton during initial dynamic import
        if (!meta || !this._pageModules[meta.file]) {
            container.innerHTML = `
                <div class="space-y-4 animate-fadeIn">
                    ${skeletonCardsHtml(4)}
                    ${skeletonTableHtml(5, 5)}
                </div>
            `;
        }

        try {
            if (!meta) {
                throw new Error('Halaman tidak ditemukan');
            }

            const mod = await this.loadModule(parsed.slug);
            if (navId !== this._navCounter) return; // Superseded by newer navigation

            const handler = mod.default || mod;
            container.innerHTML = '';
            container.classList.remove('page-enter');
            void container.offsetWidth;
            container.classList.add('page-enter');

            if (typeof handler.render === 'function') {
                await handler.render(container, parsed.param, parsed.query);
            } else if (typeof handler.init === 'function') {
                await handler.init(container, parsed.param, parsed.query);
            } else if (typeof handler === 'function') {
                await handler(container, parsed.param, parsed.query);
            } else {
                throw new Error('Format modul halaman tidak valid');
            }
            enhanceDataTables(container);
        } catch (err) {
            if (navId !== this._navCounter) return;
            console.error('[Router] Failed to load route:', parsed.slug, err);
            container.innerHTML = `
                <div class="max-w-lg mx-auto my-12 bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-sm animate-fadeIn">
                    <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-2xl border border-orange-100">
                        <i class="ri-compass-3-line"></i>
                    </div>
                    <h3 class="text-lg font-bold text-slate-900 mb-1">Halaman Tidak Tersedia</h3>
                    <p class="text-xs text-slate-500 mb-5 leading-relaxed">
                        Rute <code class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">${escapeHtml(parsed.fullHash)}</code>
                        belum tersedia atau gagal dimuat (${escapeHtml(err.message)}).
                    </p>
                    <a href="#/dashboard"
                        class="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm">
                        <i class="ri-dashboard-line"></i> Kembali ke Dashboard
                    </a>
                </div>
            `;
        }
    }
}
