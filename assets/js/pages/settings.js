// assets/js/pages/settings.js
import { App } from '../app.js';
import { renderSettingsTemplatesSection } from '../core/template-library.js';

let activeSection = 'company';
let activeWaTab = 'invoice';
let paymentMethods = [];
let coaList = [];

const SECTIONS = [
    { id: 'company', label: 'Profil Instansi', desc: 'Identitas & kontak resmi', icon: 'ri-building-4-line', color: 'text-primary-600' },
    { id: 'invoice', label: 'Penagihan & Pajak', desc: 'Jatuh tempo, PPN & footer', icon: 'ri-file-settings-line', color: 'text-amber-600' },
    { id: 'payment-methods', label: 'Rekening Bank', desc: 'Akun transfer & COA Kas', icon: 'ri-bank-card-line', color: 'text-emerald-600' },
    { id: 'coa-mapping', label: 'Integrasi Akuntansi (COA)', desc: 'Pemetaan akun otomatis ERP', icon: 'ri-book-2-line', color: 'text-sky-600' },
    { id: 'wa-templates', label: 'Template WhatsApp', desc: 'Pesan otomatis ke klien', icon: 'ri-whatsapp-line', color: 'text-green-600' },
    { id: 'doc-templates', label: 'Template SPH & SPK', desc: 'Klausul dinamis dokumen', icon: 'ri-file-copy-2-line', color: 'text-violet-600' },
    { id: 'integrations', label: 'Gateway, API & Webhook', desc: 'Pembayaran online & integrasi', icon: 'ri-webhook-line', color: 'text-indigo-600' },
    { id: 'system-health', label: 'Kesehatan Sistem & Cache', desc: 'Status Redis, DB & hapus cache', icon: 'ri-pulse-line', color: 'text-rose-600' }
];

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn max-w-6xl">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Pengaturan Sistem</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Kelola identitas perusahaan, aturan faktur, rekening penerima, template pesan, dan integrasi.</p>
                </div>
            </div>

            <!-- 2-Column Enterprise Layout -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <!-- Left Navigation -->
                <aside class="lg:col-span-4 xl:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-2.5 shadow-2xs space-y-1">
                    ${SECTIONS.map(sec => `
                        <button type="button" data-sec="${sec.id}"
                            class="set-tab w-full text-left px-3.5 py-3 rounded-2xl transition flex items-center gap-3 ${activeSection === sec.id ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 ring-1 ring-primary-200/70 dark:ring-primary-800/60' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}">
                            <div class="w-9 h-9 rounded-xl ${activeSection === sec.id ? 'bg-white dark:bg-slate-900 shadow-2xs' : 'bg-slate-100 dark:bg-slate-800'} flex items-center justify-center shrink-0">
                                <i class="${sec.icon} text-base ${sec.color}"></i>
                            </div>
                            <div class="min-w-0">
                                <div class="text-xs font-bold truncate">${sec.label}</div>
                                <div class="text-[11px] opacity-75 truncate">${sec.desc}</div>
                            </div>
                        </button>
                    `).join('')}
                </aside>

                <!-- Right Content Panel -->
                <div id="settings-body" class="lg:col-span-8 xl:col-span-9 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xs min-h-[420px]">
                    <div class="py-16 text-center text-xs text-slate-400">
                        <i class="ri-loader-4-line text-2xl animate-spin inline-block mb-2"></i>
                        <div>Memuat pengaturan...</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add / Edit Payment Method Modal -->
        <div id="pm-modal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 animate-fadeIn">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                    <h3 id="pm-modal-title" class="text-base font-bold text-slate-900 dark:text-white">Tambah Rekening Bank</h3>
                    <button type="button" onclick="document.getElementById('pm-modal').classList.add('hidden')" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center">
                        <i class="ri-close-line text-lg"></i>
                    </button>
                </div>
                <form id="pm-form" class="space-y-3.5">
                    <input type="hidden" id="form-pm-id" value="">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Nama Bank / Metode *</label>
                        <input type="text" id="form-pm-nama" required placeholder="Contoh: Bank Central Asia (BCA)"
                               class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Nomor Rekening *</label>
                        <input type="text" id="form-pm-norek" required placeholder="8720192831"
                               class="w-full px-3.5 py-2.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Atas Nama (Pemilik) *</label>
                        <input type="text" id="form-pm-an" required placeholder="PT CRUDWorks Solution"
                               class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Instruksi Tambahan</label>
                        <input type="text" id="form-pm-instruksi" placeholder="Opsional (mis. Cantumkan nomor invoice)"
                               class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Akun COA Kas / Bank (Jurnal Otomatis)</label>
                        <select id="form-pm-coa" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                            <option value="">-- Gunakan Akun Kas Default --</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Status</label>
                        <select id="form-pm-status" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                            <option value="aktif">Aktif</option>
                            <option value="nonaktif">Nonaktif</option>
                        </select>
                    </div>
                    <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                        <button type="button" onclick="document.getElementById('pm-modal').classList.add('hidden')" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-xl">Batal</button>
                        <button type="submit" id="btn-save-pm" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl">Simpan Rekening</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.querySelectorAll('.set-tab').forEach(b => {
        b.addEventListener('click', () => {
            activeSection = b.getAttribute('data-sec');
            document.querySelectorAll('.set-tab').forEach(x => {
                const isAct = x.getAttribute('data-sec') === activeSection;
                x.className = `set-tab w-full text-left px-3.5 py-3 rounded-2xl transition flex items-center gap-3 ${isAct ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 ring-1 ring-primary-200/70 dark:ring-primary-800/60' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`;
                const iconWrap = x.querySelector('div');
                if (iconWrap) {
                    iconWrap.className = `w-9 h-9 rounded-xl ${isAct ? 'bg-white dark:bg-slate-900 shadow-2xs' : 'bg-slate-100 dark:bg-slate-800'} flex items-center justify-center shrink-0`;
                }
            });
            renderSection();
        });
    });

    document.getElementById('pm-form')?.addEventListener('submit', handleSavePaymentMethod);
    renderSection();
}

async function renderSection() {
    const cont = document.getElementById('settings-body');
    if (!cont) return;

    if (activeSection === 'doc-templates') {
        await renderSettingsTemplatesSection(cont);
        return;
    }

    const res = await App.api('settings');
    const s = (res && res.success) ? res.data : {};

    if (activeSection === 'company') {
        const currentLogo = (s.company_logo || '').trim();
        const previewLogoSrc = currentLogo || 'assets/images/logo.png';
        cont.innerHTML = `
            <div class="space-y-6">
                <div class="pb-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 class="text-base font-bold text-slate-900 dark:text-white">Profil Instansi &amp; Kontak Resmi</h2>
                    <p class="text-xs text-slate-500">Informasi ini tampil pada kop faktur PDF, penawaran (SPH), kuitansi, laporan keuangan, dan email.</p>
                </div>

                <!-- Logo Perusahaan untuk PDF & Email -->
                <div class="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="flex items-center gap-4 min-w-0">
                        <div class="w-36 h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 shrink-0 overflow-hidden">
                            <img id="company-logo-preview" src="${App.escapeHtml(previewLogoSrc)}" alt="Logo Perusahaan" class="max-h-full max-w-full object-contain">
                        </div>
                        <div class="min-w-0">
                            <div class="text-xs font-bold text-slate-900 dark:text-white">Logo Kop Laporan PDF &amp; Email</div>
                            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                ${currentLogo ? 'Menggunakan logo kustom perusahaan.' : 'Menggunakan logo default (assets/images/logo.png).'} Format PNG/JPG/WEBP, maks. 2 MB.
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 shrink-0">
                        <input type="file" id="company-logo-input" accept="image/png,image/jpeg,image/webp" class="hidden">
                        <button type="button" id="btn-upload-logo" class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition">
                            <i class="ri-upload-2-line"></i><span>Ganti Logo</span>
                        </button>
                        ${currentLogo ? `
                            <button type="button" id="btn-reset-logo" class="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold inline-flex items-center gap-1 transition" title="Kembalikan ke logo default">
                                <i class="ri-refresh-line"></i><span>Reset Default</span>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <form id="company-form" class="space-y-5">

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Nama Instansi / Perusahaan *</label>
                        <div class="relative">
                            <i class="ri-building-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input type="text" name="company_name" required value="${App.escapeHtml(s.company_name || '')}"
                                   class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none">
                        </div>
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Tagline Resmi</label>
                        <input type="text" name="company_tagline" value="${App.escapeHtml(s.company_tagline || '')}" placeholder="Contoh: Solusi Digital & Sistem Enterprise"
                               class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Email Billing / Keuangan</label>
                        <div class="relative">
                            <i class="ri-mail-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input type="email" name="company_email" value="${App.escapeHtml(s.company_email || '')}"
                                   class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Nomor Telepon Kantor</label>
                        <div class="relative">
                            <i class="ri-phone-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input type="text" name="company_phone" value="${App.escapeHtml(s.company_phone || '')}"
                                   class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none">
                        </div>
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Alamat Kantor Resmi</label>
                        <textarea name="company_address" rows="3"
                                  class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none">${App.escapeHtml(s.company_address || '')}</textarea>
                    </div>
                </div>
                <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button type="submit" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition">
                        <i class="ri-save-3-line"></i><span>Simpan Profil Instansi</span>
                    </button>
                </div>
            </form>
            </div>
        `;
        document.getElementById('company-form')?.addEventListener('submit', (e) => saveGenericSettings(e, 'company-form'));
        bindCompanyLogoHandlers();
    }

    if (activeSection === 'invoice') {
        cont.innerHTML = `
            <form id="invoice-settings-form" class="space-y-5">
                <div class="pb-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 class="text-base font-bold text-slate-900 dark:text-white">Format Penagihan &amp; Pajak Default</h2>
                    <p class="text-xs text-slate-500">Nilai default saat membuat faktur baru atau men-generate faktur berulang.</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Jatuh Tempo Standar (Hari)</label>
                        <input type="number" name="invoice_due_days" min="1" value="${App.escapeHtml(s.invoice_due_days || '14')}"
                               class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Tarif PPN Standar (%)</label>
                        <input type="number" name="invoice_tax_percent" min="0" step="any" value="${s.invoice_tax_percent !== undefined && s.invoice_tax_percent !== null ? App.escapeHtml(s.invoice_tax_percent) : '0'}"
                               class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Catatan Kaki Faktur (Footer Notes)</label>
                        <textarea name="invoice_footer_notes" rows="4" placeholder="Contoh: Pembayaran dianggap sah setelah dana masuk ke rekening perusahaan."
                                  class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none">${App.escapeHtml(s.invoice_footer_notes || '')}</textarea>
                    </div>
                </div>
                <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button type="submit" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition">
                        <i class="ri-save-3-line"></i><span>Simpan Format Penagihan</span>
                    </button>
                </div>
            </form>
        `;
        document.getElementById('invoice-settings-form')?.addEventListener('submit', (e) => saveGenericSettings(e, 'invoice-settings-form'));
    }

    if (activeSection === 'payment-methods') {
        const [pmRes, coaRes] = await Promise.all([
            App.api('settings/payment-methods'),
            App.api('accounting/coa', { cache: false, silent: true })
        ]);
        paymentMethods = (pmRes && pmRes.success) ? pmRes.data : [];
        coaList = (coaRes && coaRes.success) ? coaRes.data : [];

        cont.innerHTML = `
            <div class="space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 class="text-base font-bold text-slate-900 dark:text-white">Rekening Bank Penerima</h2>
                        <p class="text-xs text-slate-500">Daftar rekening yang tampil pada faktur, pembayaran, dan terhubung ke akun COA Kas/Bank.</p>
                    </div>
                    <button type="button" onclick="window.openPaymentMethodModal()" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-sm transition">
                        <i class="ri-add-line"></i><span>Tambah Rekening</span>
                    </button>
                </div>

                <div class="space-y-2.5">
                    ${paymentMethods.length ? paymentMethods.map(pm => `
                        <div class="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-3">
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="font-bold text-sm text-slate-900 dark:text-white">${App.escapeHtml(pm.nama_metode)}</span>
                                    ${App.renderStatusBadge(pm.status, 'payment_method')}
                                    ${pm.coa_kode ? `<span class="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-mono font-bold">COA: ${App.escapeHtml(pm.coa_kode)} ${App.escapeHtml(pm.coa_nama || '')}</span>` : ''}
                                </div>
                                <div class="text-xs text-slate-500 font-mono mt-1">
                                    No. Rek: <b class="text-slate-700 dark:text-slate-200">${App.escapeHtml(pm.nomor_rekening || '-')}</b> · a.n ${App.escapeHtml(pm.atas_nama || '-')}
                                </div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                ${pm.nomor_rekening ? `
                                    <button type="button" onclick="navigator.clipboard.writeText('${App.escapeHtml(pm.nomor_rekening)}');App.toast('Nomor rekening disalin','success')"
                                            class="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-100 transition">
                                        <i class="ri-file-copy-line"></i> Salin
                                    </button>
                                ` : ''}
                                <button type="button" onclick="window.openPaymentMethodModal(${pm.id})"
                                        class="px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 text-[11px] font-bold transition">
                                    <i class="ri-edit-line"></i> Edit
                                </button>
                            </div>
                        </div>
                    `).join('') : '<div class="py-10 text-center text-xs text-slate-400">Belum ada rekening bank terdaftar.</div>'}
                </div>
            </div>
        `;
    }

    if (activeSection === 'coa-mapping') {
        const coaRes = await App.api('accounting/coa', { cache: false, silent: true });
        coaList = (coaRes && coaRes.success) ? coaRes.data : [];

        const makeCoaSelect = (name, label, hint, fallbackCode, tipeFilter = null) => {
            const cur = s[name] || '';
            const opts = coaList.filter(c => !tipeFilter || c.tipe_akun === tipeFilter).map(c => {
                const selected = cur ? (String(cur) === String(c.id)) : (c.kode_akun === fallbackCode);
                return `<option value="${c.id}" ${selected ? 'selected' : ''}>${App.escapeHtml(c.kode_akun)} — ${App.escapeHtml(c.nama_akun)}</option>`;
            }).join('');
            return `
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">${label}</label>
                    <select name="${name}" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                        ${opts}
                    </select>
                    <p class="text-[11px] text-slate-400 mt-1">${hint}</p>
                </div>
            `;
        };

        cont.innerHTML = `
            <form id="coa-mapping-form" class="space-y-5">
                <div class="pb-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 class="text-base font-bold text-slate-900 dark:text-white">Pemetaan Akun Otomatis (Integrasi Master COA)</h2>
                    <p class="text-xs text-slate-500">Tentukan akun COA default yang digunakan saat Faktur, Pembayaran, dan Pengeluaran membuat Jurnal Umum otomatis.</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    ${makeCoaSelect('coa_kas_id', 'Akun Kas / Bank Default', 'Dipakai bila rekening pembayaran belum dipetakan secara spesifik.', '1101', 'aset')}
                    ${makeCoaSelect('coa_piutang_id', 'Akun Piutang Usaha', 'Didebit saat faktur terbit & dikredit saat pembayaran masuk.', '1102', 'aset')}
                    ${makeCoaSelect('coa_pendapatan_id', 'Akun Pendapatan Jasa', 'Dikredit sebesar DPP setiap faktur penjualan diterbitkan.', '4101', 'pendapatan')}
                    ${makeCoaSelect('coa_beban_id', 'Akun Beban Operasional', 'Didebit setiap pencatatan beban & pengeluaran lunas.', '5101', 'beban')}
                    ${makeCoaSelect('coa_ppn_keluaran_id', 'Akun PPN Keluaran', 'Dikredit dari nominal pajak faktur penjualan.', '2102', 'kewajiban')}
                    ${makeCoaSelect('coa_ppn_masukan_id', 'Akun PPN Masukan', 'Didebit dari kolom PPN Masukan pada pengeluaran.', '1103', 'aset')}
                    ${makeCoaSelect('coa_hutang_pph23_id', 'Akun Hutang PPh 23', 'Dikredit dari pemotongan PPh 23 pada pengeluaran.', '2101', 'kewajiban')}
                </div>
                <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button type="submit" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition">
                        <i class="ri-save-3-line"></i><span>Simpan Pemetaan COA</span>
                    </button>
                </div>
            </form>
        `;
        document.getElementById('coa-mapping-form')?.addEventListener('submit', (e) => saveGenericSettings(e, 'coa-mapping-form'));
    }

    if (activeSection === 'wa-templates') {
        const waDefs = {
            invoice: {
                key: 'wa_template_invoice',
                title: 'Pesan Penagihan / Pengingat Faktur',
                vars: ['{nama_pic}', '{nama_perusahaan}', '{nomor_invoice}', '{nama_proyek}', '{total_tagihan}', '{jatuh_tempo}', '{info_bank}', '{tautan_faktur}']
            },
            quotation: {
                key: 'wa_template_quotation',
                title: 'Pesan Pengiriman Surat Penawaran',
                vars: ['{nama_pic}', '{nama_perusahaan}', '{nomor_penawaran}', '{nama_proyek}', '{total_penawaran}', '{berlaku_hingga}', '{tautan_penawaran}']
            },
            receipt: {
                key: 'wa_template_receipt',
                title: 'Pesan Kuitansi Pelunasan Tagihan',
                vars: ['{nama_pic}', '{nomor_invoice}', '{nomor_kuitansi}', '{nominal_bayar}', '{tanggal_bayar}', '{tautan_kuitansi}']
            }
        };

        cont.innerHTML = `
            <form id="wa-templates-form" class="space-y-5">
                <div class="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 class="text-base font-bold text-slate-900 dark:text-white">Template Pesan WhatsApp</h2>
                        <p class="text-xs text-slate-500">Pilih jenis pesan lalu klik variabel untuk menyisipkannya ke posisi kursor.</p>
                    </div>
                    <div class="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 gap-1">
                        <button type="button" data-watab="invoice" class="wa-subtab px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeWaTab === 'invoice' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'}">Faktur</button>
                        <button type="button" data-watab="quotation" class="wa-subtab px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeWaTab === 'quotation' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'}">Penawaran</button>
                        <button type="button" data-watab="receipt" class="wa-subtab px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeWaTab === 'receipt' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'}">Kuitansi</button>
                    </div>
                </div>

                ${Object.entries(waDefs).map(([tKey, def]) => `
                    <div class="wa-panel ${activeWaTab === tKey ? '' : 'hidden'} p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3" data-wapanel="${tKey}">
                        <div class="flex items-center justify-between">
                            <label class="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">${def.title}</label>
                            <span class="text-[10px] text-slate-400 font-mono">${def.key}</span>
                        </div>
                        <div class="flex flex-wrap gap-1.5">
                            ${def.vars.map(v => `
                                <button type="button" onclick="window.insertWaVar('${def.key}', '${v}')"
                                        class="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-primary-400 hover:text-primary-600 font-mono text-[11px] transition">${v}</button>
                            `).join('')}
                        </div>
                        <textarea id="field-${def.key}" name="${def.key}" rows="8"
                                  class="w-full p-3.5 font-mono text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none">${App.escapeHtml(s[def.key] || '')}</textarea>
                    </div>
                `).join('')}

                <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button type="submit" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition">
                        <i class="ri-save-3-line"></i><span>Simpan Seluruh Template</span>
                    </button>
                </div>
            </form>
        `;

        document.querySelectorAll('.wa-subtab').forEach(btn => {
            btn.addEventListener('click', () => {
                activeWaTab = btn.getAttribute('data-watab');
                document.querySelectorAll('.wa-subtab').forEach(b => {
                    const act = b.getAttribute('data-watab') === activeWaTab;
                    b.className = `wa-subtab px-3 py-1.5 rounded-lg text-xs font-bold transition ${act ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'}`;
                });
                document.querySelectorAll('.wa-panel').forEach(p => {
                    p.classList.toggle('hidden', p.getAttribute('data-wapanel') !== activeWaTab);
                });
            });
        });
        document.getElementById('wa-templates-form')?.addEventListener('submit', (e) => saveGenericSettings(e, 'wa-templates-form'));
    }

    if (activeSection === 'integrations') {
        const [keysRes, hooksRes] = await Promise.all([
            App.api('api-keys', { cache: false }),
            App.api('webhooks', { cache: false })
        ]);
        const keys = keysRes?.success ? (keysRes.data || []) : [];
        const hooks = hooksRes?.success ? (hooksRes.data?.webhooks || []) : [];
        const logs = hooksRes?.success ? (hooksRes.data?.logs || []) : [];
        const webhookUrl = `${window.location.origin}${window.location.pathname.replace(/index\.(html|php)$/i, '')}api/?route=payment-gateway/webhook`;

        cont.innerHTML = `
            <div class="space-y-8">
                <!-- 0. Email SMTP -->
                <form id="smtp-settings-form" class="space-y-4">
                    <div class="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <i class="ri-mail-send-line text-sky-600"></i> Server Email (SMTP)
                            </h3>
                            <p class="text-xs text-slate-400">Digunakan untuk mengirim Faktur &amp; Surat Penawaran langsung ke email klien.</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">SMTP Host</label>
                            <input type="text" name="smtp_host" value="${App.escapeHtml(s.smtp_host || '')}" placeholder="smtp.gmail.com"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Port</label>
                            <input type="number" name="smtp_port" value="${App.escapeHtml(s.smtp_port || '587')}" placeholder="587"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Enkripsi</label>
                            <select name="smtp_encryption" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                                <option value="tls" ${(s.smtp_encryption || 'tls') === 'tls' ? 'selected' : ''}>TLS / STARTTLS (587)</option>
                                <option value="ssl" ${s.smtp_encryption === 'ssl' ? 'selected' : ''}>SSL (465)</option>
                                <option value="none" ${s.smtp_encryption === 'none' ? 'selected' : ''}>Tanpa Enkripsi (25)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Username SMTP</label>
                            <input type="text" name="smtp_user" value="${App.escapeHtml(s.smtp_user || '')}" placeholder="billing@perusahaan.com"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Password / App Password</label>
                            <div class="relative">
                                <input type="password" name="smtp_pass" value="${App.escapeHtml(s.smtp_pass || '')}" placeholder="••••••••••••"
                                       class="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                                <button type="button" onclick="App.toggleInputVisibility(this)" class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                                    <i class="ri-eye-line"></i>
                                </button>
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Email Pengirim (From)</label>
                            <input type="email" name="smtp_from_email" value="${App.escapeHtml(s.smtp_from_email || s.company_email || '')}" placeholder="billing@perusahaan.com"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div class="flex items-center gap-2">
                            <input type="email" id="smtp-test-to" placeholder="Email tujuan uji coba..." class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                            <button type="button" id="btn-test-smtp" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold">Kirim Test</button>
                        </div>
                        <button type="submit" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5">
                            <i class="ri-save-3-line"></i><span>Simpan SMTP</span>
                        </button>
                    </div>
                </form>

                <!-- 0b. Editor Template Isi Email -->
                <form id="email-tpl-settings-form" class="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <div class="pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-file-text-line text-primary-600"></i> Template Teks Pembuka Email
                        </h3>
                        <p class="text-xs text-slate-400">Variabel tersedia: <code class="font-mono">{nama_klien}</code>, <code class="font-mono">{nomor_dokumen}</code>, <code class="font-mono">{judul}</code>, <code class="font-mono">{jatuh_tempo}</code>, <code class="font-mono">{nama_perusahaan}</code>.</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Faktur Tagihan</label>
                            <textarea name="email_tpl_invoice_intro" rows="2" placeholder="Berikut kami kirimkan rincian tagihan untuk {nama_klien}:" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">${App.escapeHtml(s.email_tpl_invoice_intro || '')}</textarea>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Surat Penawaran (SPH)</label>
                            <textarea name="email_tpl_quotation_intro" rows="2" placeholder="Bersama ini kami kirimkan Surat Penawaran Harga (SPH) untuk {judul}." class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">${App.escapeHtml(s.email_tpl_quotation_intro || '')}</textarea>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Kontrak / SPK Digital</label>
                            <textarea name="email_tpl_contract_intro" rows="2" placeholder="Bersama ini kami sampaikan Surat Perjanjian Kerja (SPK) {nomor_dokumen} untuk {judul}." class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">${App.escapeHtml(s.email_tpl_contract_intro || '')}</textarea>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Berita Acara (BAST)</label>
                            <textarea name="email_tpl_bast_intro" rows="2" placeholder="Bersama ini kami sampaikan Berita Acara Serah Terima (BAST) {nomor_dokumen} untuk proyek {judul}." class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">${App.escapeHtml(s.email_tpl_bast_intro || '')}</textarea>
                        </div>
                    </div>
                    <div class="flex justify-end">
                        <button type="submit" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5">
                            <i class="ri-save-3-line"></i><span>Simpan Template Email</span>
                        </button>
                    </div>
                </form>

                <!-- 1. Payment Gateway -->
                <form id="pg-settings-form" class="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <div class="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <i class="ri-secure-payment-line text-indigo-600"></i> Konfigurasi Payment Gateway
                            </h3>
                            <p class="text-xs text-slate-400">Aktifkan pembayaran otomatis QRIS / Virtual Account pada faktur publik.</p>
                        </div>
                        <button type="button" onclick="navigator.clipboard.writeText('${App.escapeHtml(webhookUrl)}');App.toast('URL Callback disalin','success')"
                                class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">
                            <i class="ri-link"></i><span>Salin URL Callback</span>
                        </button>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Provider Gateway</label>
                            <select name="pg_provider" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                                <option value="sandbox" ${(s.pg_provider || 'sandbox') === 'sandbox' ? 'selected' : ''}>Sandbox (Simulasi Lokal / QRIS Test)</option>
                                <option value="midtrans" ${s.pg_provider === 'midtrans' ? 'selected' : ''}>Midtrans (Snap / QRIS / VA)</option>
                                <option value="xendit" ${s.pg_provider === 'xendit' ? 'selected' : ''}>Xendit (Invoice / VA / QRIS)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Webhook Callback Secret</label>
                            <input type="text" name="pg_webhook_secret" value="${App.escapeHtml(s.pg_webhook_secret || '')}" placeholder="Opsional (X-Callback-Token)"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Server Key / Secret API Key</label>
                            <div class="relative">
                                <input type="password" name="pg_server_key" value="${App.escapeHtml(s.pg_server_key || '')}" placeholder="SB-Mid-server-..."
                                       class="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                                <button type="button" onclick="App.toggleInputVisibility(this)" class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                                    <i class="ri-eye-line"></i>
                                </button>
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Client Key / Public Key</label>
                            <input type="text" name="pg_client_key" value="${App.escapeHtml(s.pg_client_key || '')}" placeholder="SB-Mid-client-..."
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>
                    </div>
                    <div class="flex justify-end">
                        <button type="submit" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5">
                            <i class="ri-save-3-line"></i><span>Simpan Payment Gateway</span>
                        </button>
                    </div>
                </form>

                <!-- 2. API Keys Eksternal -->
                <div class="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><i class="ri-key-2-line text-amber-600"></i> API Key Eksternal</h3>
                            <p class="text-xs text-slate-400">Token autentikasi untuk integrasi aplikasi pihak ketiga.</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <input type="text" id="new-apikey-name" placeholder="Nama aplikasi (mis. ERP Sync)" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                            <button type="button" id="btn-create-apikey" class="px-3.5 py-2 bg-slate-900 dark:bg-primary-600 text-white rounded-xl text-xs font-bold">Buat API Key</button>
                        </div>
                    </div>
                    <div id="new-apikey-reveal" class="hidden p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex flex-wrap items-center justify-between gap-2"></div>
                    <div class="space-y-2">
                        ${keys.length ? keys.map(k => `
                            <div class="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                                <div>
                                    <span class="font-bold text-slate-800 dark:text-slate-100">${App.escapeHtml(k.nama)}</span>
                                    <span class="ml-2 font-mono text-slate-500">${App.escapeHtml(k.key_prefix)}</span>
                                </div>
                                <button type="button" onclick="window.deleteApiKey(${k.id})" class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-[11px]">Cabut</button>
                            </div>
                        `).join('') : '<div class="text-xs text-slate-400">Belum ada API Key terdaftar.</div>'}
                    </div>
                </div>

                <!-- 3. Webhook Keluar -->
                <div class="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <div>
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><i class="ri-webhook-line text-emerald-600"></i> Webhook Keluar</h3>
                        <p class="text-xs text-slate-400">Kirim event otomatis (<code class="font-mono">invoice.paid, ticket.created, project.updated</code>) dengan HMAC-SHA256.</p>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input type="text" id="new-hook-nama" placeholder="Nama Webhook (mis. Slack / app-git)" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        <input type="url" id="new-hook-url" placeholder="https://domain.anda/webhook" class="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        <div class="flex gap-2">
                            <input type="text" id="new-hook-events" value="invoice.paid,ticket.created,project.updated" class="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                            <button type="button" id="btn-create-hook" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0">Tambah</button>
                        </div>
                    </div>
                    <div class="space-y-2">
                        ${hooks.length ? hooks.map(h => `
                            <div class="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div class="min-w-0">
                                    <div class="font-bold text-slate-800 dark:text-slate-100">${App.escapeHtml(h.nama)}</div>
                                    <div class="font-mono text-[11px] text-slate-500 truncate">${App.escapeHtml(h.target_url)} · <span class="text-indigo-600">${App.escapeHtml(h.events)}</span></div>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <button type="button" onclick="window.testWebhook(${h.id})" class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold text-[11px]">Test Ping</button>
                                    <button type="button" onclick="window.deleteWebhook(${h.id})" class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-[11px]">Hapus</button>
                                </div>
                            </div>
                        `).join('') : '<div class="text-xs text-slate-400">Belum ada webhook keluar.</div>'}
                    </div>
                    ${logs.length ? `
                        <div class="pt-2">
                            <div class="text-[11px] font-bold uppercase text-slate-400 mb-2">Log Pengiriman Terakhir</div>
                            <div class="space-y-1 max-h-40 overflow-y-auto text-[11px] font-mono">
                                ${logs.map(l => `
                                    <div class="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2">
                                        <span>${App.escapeHtml(l.webhook_nama)} · <b>${App.escapeHtml(l.event_name)}</b></span>
                                        <span class="${l.status === 'success' ? 'text-emerald-600' : 'text-rose-600'} font-bold">${l.status.toUpperCase()} (${l.response_code || '-'})</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.getElementById('smtp-settings-form')?.addEventListener('submit', (e) => saveGenericSettings(e, 'smtp-settings-form'));
        document.getElementById('email-tpl-settings-form')?.addEventListener('submit', (e) => saveGenericSettings(e, 'email-tpl-settings-form'));
        document.getElementById('btn-test-smtp')?.addEventListener('click', async () => {
            const to_email = document.getElementById('smtp-test-to')?.value.trim();
            const btn = document.getElementById('btn-test-smtp');
            App.btnLoading(btn, true, 'Mengirim...');
            const r = await App.api('settings/test-email', { method: 'POST', body: { to_email } });
            App.btnLoading(btn, false);
            if (r?.success) App.toast(r.message, 'success');
        });
        document.getElementById('pg-settings-form')?.addEventListener('submit', (e) => saveGenericSettings(e, 'pg-settings-form'));
        document.getElementById('btn-create-apikey')?.addEventListener('click', async () => {
            const nama = document.getElementById('new-apikey-name')?.value.trim();
            const r = await App.api('api-keys', { method: 'POST', body: { nama } });
            if (r?.success && r.data) {
                const box = document.getElementById('new-apikey-reveal');
                if (box) {
                    const keyEsc = App.escapeHtml(r.data.raw_key);
                    box.classList.remove('hidden');
                    box.innerHTML = `<span><b>Salin API Key:</b> <code class="font-mono select-all px-2 py-0.5 bg-white dark:bg-slate-900 rounded">${keyEsc}</code></span>
                        <button type="button" onclick="navigator.clipboard.writeText('${keyEsc}');App.toast('API Key disalin','success')" class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border font-semibold">Salin</button>`;
                }
                App.toast(r.message, 'success');
            }
        });
        document.getElementById('btn-create-hook')?.addEventListener('click', async () => {
            const nama = document.getElementById('new-hook-nama')?.value.trim();
            const target_url = document.getElementById('new-hook-url')?.value.trim();
            const events = document.getElementById('new-hook-events')?.value.trim();
            const r = await App.api('webhooks', { method: 'POST', body: { nama, target_url, events } });
            if (r?.success) {
                App.toast(r.message, 'success');
                renderSection();
            }
        });
        window.deleteApiKey = async (id) => {
            if (!await App.confirm('Cabut API Key?', 'Aplikasi yang memakai key ini tidak akan bisa terhubung lagi.')) return;
            const r = await App.api(`api-keys/${id}`, { method: 'DELETE' });
            if (r?.success) { App.toast(r.message, 'success'); renderSection(); }
        };
        window.testWebhook = async (id) => {
            const r = await App.api(`webhooks/${id}/test`, { method: 'POST' });
            if (r?.success) { App.toast(r.message, 'success'); renderSection(); }
        };
        window.deleteWebhook = async (id) => {
            if (!await App.confirm('Hapus Webhook?', 'Pengiriman event ke endpoint ini akan dihentikan.')) return;
            const r = await App.api(`webhooks/${id}`, { method: 'DELETE' });
            if (r?.success) { App.toast(r.message, 'success'); renderSection(); }
        };
    }

    if (activeSection === 'system-health') {
        const hRes = await App.api('settings/system-health', { cache: false });
        const h = hRes?.data || {};
        const redisOk = !!h.redis_connected;
        cont.innerHTML = `
            <div class="space-y-6">
                <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-pulse-line text-rose-600"></i>
                            <span>Kesehatan Sistem &amp; Kontrol Cache</span>
                        </h3>
                        <p class="text-xs text-slate-400 mt-0.5">Pantau status cache Redis, database MySQL, dan bersihkan cache laporan secara instan.</p>
                    </div>
                    <button type="button" id="btn-clear-system-cache" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition">
                        <i class="ri-delete-bin-6-line"></i><span>Bersihkan Cache Laporan &amp; Sistem</span>
                    </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div class="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5">
                        <div class="text-[11px] font-bold uppercase text-slate-400">Status Redis Cache</div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${redisOk ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'}">
                                ${redisOk ? 'Aktif & Terhubung' : 'Fallback MySQL'}
                            </span>
                            ${h.redis_mode ? `<span class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">${App.escapeHtml(h.redis_mode)}</span>` : ''}
                        </div>
                        <div class="text-[11px] text-slate-500">${redisOk
                            ? `Terhubung ke <span class="font-mono">${App.escapeHtml(h.redis_target || '127.0.0.1:6379')}</span>`
                            : `Redis tidak aktif (${App.escapeHtml(h.redis_error || h.redis_target || 'koneksi gagal')}); query berjalan ke MySQL`
                        }</div>
                    </div>

                    <div class="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5">
                        <div class="text-[11px] font-bold uppercase text-slate-400">Database MySQL</div>
                        <div class="text-lg font-black font-mono text-slate-900 dark:text-white">${h.db_size_mb ?? 0} MB</div>
                        <div class="text-[11px] text-slate-500 font-mono">${App.escapeHtml(h.db_name || '-')} · ${h.table_count ?? 0} tabel · v${App.escapeHtml(h.mysql_version || '-')}</div>
                    </div>

                    <div class="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5">
                        <div class="text-[11px] font-bold uppercase text-slate-400">Runtime &amp; Cadangan</div>
                        <div class="text-lg font-black font-mono text-slate-900 dark:text-white">PHP ${App.escapeHtml(h.php_version || '-')}</div>
                        <div class="text-[11px] text-slate-500">${h.last_backup ? `Backup terakhir: ${App.formatDateTime(h.last_backup.date)}` : 'Belum ada file backup lokal'}</div>
                    </div>
                </div>

                ${h.prod_diag ? `
                    <div class="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                        <div class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                            <i class="ri-shield-check-line text-indigo-600"></i> Diagnostik Produksi &amp; DNS Email
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                            <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                                <div class="text-[10px] font-bold uppercase text-slate-400 mb-1">URL Publik Terdeteksi</div>
                                <div class="font-mono font-bold truncate ${h.prod_diag.is_local_url ? 'text-amber-600' : 'text-emerald-600'}" title="${App.escapeHtml(h.prod_diag.detected_url || '-')}">${App.escapeHtml(h.prod_diag.detected_url || '-')}</div>
                            </div>
                            <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                                <div class="text-[10px] font-bold uppercase text-slate-400 mb-1">Protokol HTTPS</div>
                                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${h.prod_diag.is_https ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${h.prod_diag.is_https ? 'HTTPS Aktif' : 'HTTP (Non-TLS)'}</span>
                            </div>
                            <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                                <div class="text-[10px] font-bold uppercase text-slate-400 mb-1">DNS SPF (${App.escapeHtml(h.prod_diag.smtp_domain || '-')})</div>
                                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${h.prod_diag.dns_spf === true ? 'bg-emerald-100 text-emerald-700' : (h.prod_diag.dns_spf === false ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600')}">${h.prod_diag.dns_spf === true ? 'SPF Valid' : (h.prod_diag.dns_spf === false ? 'SPF Tidak Ada' : 'Belum Dicek')}</span>
                            </div>
                            <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                                <div class="text-[10px] font-bold uppercase text-slate-400 mb-1">DNS DMARC</div>
                                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${h.prod_diag.dns_dmarc === true ? 'bg-emerald-100 text-emerald-700' : (h.prod_diag.dns_dmarc === false ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600')}">${h.prod_diag.dns_dmarc === true ? 'DMARC Valid' : (h.prod_diag.dns_dmarc === false ? 'DMARC Belum Ada' : 'Belum Dicek')}</span>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        document.getElementById('btn-clear-system-cache')?.addEventListener('click', async () => {
            const btn = document.getElementById('btn-clear-system-cache');
            App.btnLoading(btn, true, 'Membersihkan...');
            const r = await App.api('settings/clear-cache', { method: 'POST' });
            App.btnLoading(btn, false);
            if (r?.success) App.toast(r.message, 'success');
        });
    }
}

async function saveGenericSettings(e, formId) {
    e.preventDefault();
    const form = document.getElementById(formId);
    const btn = form?.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const settings = {};
    for (const [k, v] of formData.entries()) {
        settings[k] = String(v).trim();
    }

    if (btn) App.btnLoading(btn, true, 'Menyimpan...');
    const res = await App.api('settings', { method: 'POST', body: { settings } });
    if (btn) App.btnLoading(btn, false);
    if (res && res.success) {
        App.toast(res.message, 'success');
        if (window.App) {
            window.App.settings = Object.assign(window.App.settings || {}, settings);
        }
    }
}

function bindCompanyLogoHandlers() {
    const inputEl = document.getElementById('company-logo-input');
    const uploadBtn = document.getElementById('btn-upload-logo');
    const resetBtn = document.getElementById('btn-reset-logo');

    uploadBtn?.addEventListener('click', () => inputEl?.click());

    inputEl?.addEventListener('change', async () => {
        const file = inputEl.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('logo', file);

        App.btnLoading(uploadBtn, true, 'Mengunggah...');
        try {
            const resp = await fetch('api/settings/upload-logo', {
                method: 'POST',
                headers: { 'X-CSRF-Token': App.csrfToken },
                body: fd
            });
            const json = await resp.json();
            if (!resp.ok || !json.success) {
                App.toast(json.message || 'Gagal mengunggah logo', 'error');
                return;
            }
            const newLogo = json.data?.company_logo || '';
            if (window.App) {
                window.App.settings = Object.assign(window.App.settings || {}, { company_logo: newLogo });
            }
            const { _invalidateCompanyLogoCache } = await import('../core/pdf/shared.js');
            _invalidateCompanyLogoCache();
            App.toast(json.message || 'Logo perusahaan diperbarui', 'success');
            renderSection();
        } catch (err) {
            App.toast('Gagal menghubungi server saat mengunggah logo', 'error');
        } finally {
            App.btnLoading(uploadBtn, false);
        }
    });

    resetBtn?.addEventListener('click', async () => {
        const ok = await App.confirm('Kembalikan logo perusahaan ke default (assets/images/logo.png)?', 'Reset Logo');
        if (!ok) return;
        App.btnLoading(resetBtn, true, 'Mereset...');
        const res = await App.api('settings/reset-logo', { method: 'POST' });
        App.btnLoading(resetBtn, false);
        if (res && res.success) {
            if (window.App) {
                window.App.settings = Object.assign(window.App.settings || {}, { company_logo: '' });
            }
            const { _invalidateCompanyLogoCache } = await import('../core/pdf/shared.js');
            _invalidateCompanyLogoCache();
            App.toast(res.message || 'Logo dikembalikan ke default', 'success');
            renderSection();
        }
    });
}

window.openPaymentMethodModal = (pmId = null) => {
    const form = document.getElementById('pm-form');
    form.reset();
    const pm = pmId ? paymentMethods.find(x => Number(x.id) === Number(pmId)) : null;
    const coaSel = document.getElementById('form-pm-coa');
    if (coaSel) {
        const assetCoas = coaList.filter(c => c.tipe_akun === 'aset');
        coaSel.innerHTML = '<option value="">-- Gunakan Akun Kas Default --</option>' +
            assetCoas.map(c => `<option value="${c.id}">${App.escapeHtml(c.kode_akun)} — ${App.escapeHtml(c.nama_akun)}</option>`).join('');
        coaSel.value = pm && pm.coa_id ? String(pm.coa_id) : '';
    }
    document.getElementById('pm-modal-title').textContent = pm ? 'Edit Rekening Bank' : 'Tambah Rekening Bank';
    document.getElementById('form-pm-id').value = pm ? pm.id : '';
    document.getElementById('form-pm-nama').value = pm ? (pm.nama_metode || '') : '';
    document.getElementById('form-pm-norek').value = pm ? (pm.nomor_rekening || '') : '';
    document.getElementById('form-pm-an').value = pm ? (pm.atas_nama || '') : '';
    document.getElementById('form-pm-instruksi').value = pm ? (pm.instruksi || '') : '';
    document.getElementById('form-pm-status').value = pm ? (pm.status || 'aktif') : 'aktif';
    document.getElementById('pm-modal').classList.remove('hidden');
};

window.insertWaVar = (fieldName, varTag) => {
    const el = document.getElementById('field-' + fieldName);
    if (!el) return;
    const start = el.selectionStart || el.value.length;
    const end = el.selectionEnd || el.value.length;
    el.value = el.value.substring(0, start) + varTag + el.value.substring(end);
    el.focus();
    el.selectionStart = el.selectionEnd = start + varTag.length;
    App.toast(`Variabel ${varTag} disisipkan`, 'info', 1500);
};

async function handleSavePaymentMethod(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-pm');
    const body = {
        id: document.getElementById('form-pm-id').value || null,
        nama_metode: document.getElementById('form-pm-nama').value.trim(),
        nomor_rekening: document.getElementById('form-pm-norek').value.trim(),
        atas_nama: document.getElementById('form-pm-an').value.trim(),
        instruksi: document.getElementById('form-pm-instruksi').value.trim(),
        coa_id: document.getElementById('form-pm-coa')?.value || null,
        status: document.getElementById('form-pm-status').value
    };

    if (btn) App.btnLoading(btn, true, 'Menyimpan...');
    const res = await App.api('settings/payment-methods', { method: 'POST', body });
    if (btn) App.btnLoading(btn, false);
    if (res && res.success) {
        App.toast(res.message, 'success');
        document.getElementById('pm-modal').classList.add('hidden');
        renderSection();
    }
}
