// assets/js/core/template-library.js — Pustaka Template SPH, SPK & Klausul Dinamis
import { App } from '../app.js';

export const TEMPLATE_VARIABLES = [
    { tag: '{{nama_perusahaan}}', desc: 'Nama perusahaan klien' },
    { tag: '{{penanggung_jawab}}', desc: 'PIC / Penanggung jawab klien' },
    { tag: '{{nama_project}}', desc: 'Nama proyek terkait' },
    { tag: '{{judul_kontrak}}', desc: 'Judul SPK / kontrak' },
    { tag: '{{nilai_penawaran}}', desc: 'Total nilai penawaran (IDR)' },
    { tag: '{{nilai_kontrak}}', desc: 'Total nilai kontrak (IDR)' },
    { tag: '{{tanggal_penawaran}}', desc: 'Tanggal terbit SPH' },
    { tag: '{{tanggal_mulai}}', desc: 'Tanggal mulai pengerjaan' },
    { tag: '{{tanggal_selesai}}', desc: 'Tanggal target selesai' },
    { tag: '{{garansi_hari}}', desc: 'Masa garansi (hari)' },
    { tag: '{{nama_instansi}}', desc: 'Nama perusahaan penyedia jasa' }
];

/**
 * Ganti placeholder {{variabel}} pada teks template dengan data aktual.
 */
export function resolveTemplateVariables(text, vars = {}) {
    if (!text) return '';
    const map = {
        nama_perusahaan: vars.nama_perusahaan || 'Klien',
        penanggung_jawab: vars.penanggung_jawab || 'Bapak/Ibu Pimpinan',
        nama_project: vars.nama_project || 'Proyek',
        judul_kontrak: vars.judul_kontrak || vars.nama_project || 'Perjanjian Kerja',
        nilai_penawaran: vars.nilai_penawaran || App.formatIDR(0),
        nilai_kontrak: vars.nilai_kontrak || App.formatIDR(0),
        tanggal_penawaran: vars.tanggal_penawaran || '-',
        tanggal_mulai: vars.tanggal_mulai || '-',
        tanggal_selesai: vars.tanggal_selesai || '-',
        garansi_hari: String(vars.garansi_hari ?? 30),
        nama_instansi: vars.nama_instansi || App.getSetting('company_name', 'CRUDWorks')
    };
    return String(text).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, key) => {
        const k = String(key).toLowerCase();
        return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : m;
    });
}

export async function fetchDocumentTemplates(jenis = '') {
    const qs = jenis ? `?jenis=${encodeURIComponent(jenis)}&status=aktif` : '?status=aktif';
    const res = await App.api(`templates${qs}`, { cache: false, silent: true });
    return (res && res.success && Array.isArray(res.data)) ? res.data : [];
}

function renderFormattedTextarea(id, label, rows, placeholder, extraClass = '') {
    return `
        <div>
            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">${label}</label>
            <div class="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-600/20 focus-within:border-indigo-600 transition">
                <div class="flex flex-wrap items-center justify-between gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                    <div class="flex flex-wrap items-center gap-0.5">
                        <button type="button" data-fmt="upper" data-target="${id}" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Judul / Huruf Kapital"><i class="ri-heading text-sm"></i></button>
                        <button type="button" data-fmt="bold" data-target="${id}" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Tebal (**teks**)"><i class="ri-bold text-sm"></i></button>
                        <button type="button" data-fmt="italic" data-target="${id}" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Miring (_teks_)"><i class="ri-italic text-sm"></i></button>
                        <span class="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></span>
                        <button type="button" data-fmt="ul" data-target="${id}" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Daftar Poin (•)"><i class="ri-list-unordered text-sm"></i></button>
                        <button type="button" data-fmt="ol" data-target="${id}" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Daftar Bernomor (1. 2. 3.)"><i class="ri-list-ordered text-sm"></i></button>
                        <button type="button" data-fmt="hr" data-target="${id}" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Garis Pemisah"><i class="ri-separator text-sm"></i></button>
                        <span class="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></span>
                        <button type="button" data-fmt="clean" data-target="${id}" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Rapikan Spasi & Baris"><i class="ri-format-clear text-sm"></i></button>
                    </div>
                    <span id="${id}-counter" class="text-[10px] font-mono text-slate-400 px-1.5">0 baris · 0 kar</span>
                </div>
                <textarea id="${id}" rows="${rows}" placeholder="${App.escapeHtml(placeholder)}"
                    class="tpl-var-target w-full px-3.5 py-2.5 bg-transparent text-xs leading-relaxed focus:outline-none resize-y ${extraClass}"></textarea>
            </div>
        </div>
    `;
}

/**
 * Render halaman manajemen Pustaka Template Dokumen di Pengaturan.
 */
export async function renderSettingsTemplatesSection(container) {
    let filterJenis = 'all';
    let templates = [];
    let activeTextareaId = 'tpl-isi-pasal';

    const loadAndRender = async () => {
        const res = await App.api('templates', { cache: false });
        templates = (res && res.success && Array.isArray(res.data)) ? res.data : [];
        paint();
    };

    const paint = () => {
        const filtered = filterJenis === 'all' ? templates : templates.filter((t) => t.jenis === filterJenis);
        container.innerHTML = `
            <div class="space-y-5">
                <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 class="text-base font-bold text-slate-900 dark:text-white">Pustaka Template Dokumen (SPH &amp; SPK)</h2>
                        <p class="text-xs text-slate-500">Simpan template pembuka, ruang lingkup, timeline, dan pasal kontrak dengan variabel dinamis.</p>
                    </div>
                    <button type="button" id="btn-add-doc-tpl" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-sm transition">
                        <i class="ri-add-line"></i><span>Tambah Template</span>
                    </button>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    ${[
                        { id: 'all', label: `Semua (${templates.length})` },
                        { id: 'sph', label: `Penawaran / SPH (${templates.filter((t) => t.jenis === 'sph').length})` },
                        { id: 'spk', label: `Kontrak / SPK (${templates.filter((t) => t.jenis === 'spk').length})` }
                    ].map((tab) => `
                        <button type="button" data-tpl-filter="${tab.id}"
                            class="px-3 py-1.5 rounded-xl text-xs font-semibold transition ${filterJenis === tab.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}">
                            ${tab.label}
                        </button>
                    `).join('')}
                </div>

                <div class="space-y-2.5">
                    ${filtered.length ? filtered.map((t) => `
                        <div class="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-3">
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${t.jenis === 'sph' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'}">${t.jenis.toUpperCase()}</span>
                                    <span class="font-bold text-sm text-slate-900 dark:text-white">${App.escapeHtml(t.nama_template)}</span>
                                    ${Number(t.is_default) === 1 ? '<span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px] font-bold">Default</span>' : ''}
                                    ${t.status === 'nonaktif' ? '<span class="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">Nonaktif</span>' : ''}
                                </div>
                                <div class="text-xs text-slate-500 mt-1">
                                    Kategori: <b class="text-slate-700 dark:text-slate-300">${App.escapeHtml(t.kategori || 'Umum')}</b>
                                    ${t.jenis === 'spk' ? ` · Garansi <span class="font-mono">${Number(t.garansi_hari || 30)} hari</span>` : ''}
                                </div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <button type="button" data-tpl-edit="${t.id}" class="px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 text-[11px] font-bold transition" title="Edit Template" aria-label="Edit Template ${App.escapeHtml(t.nama_template)}">
                                    <i class="ri-edit-line"></i> Edit
                                </button>
                                <button type="button" data-tpl-del="${t.id}" class="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-[11px] font-bold transition" title="Hapus Template" aria-label="Hapus Template ${App.escapeHtml(t.nama_template)}">
                                    <i class="ri-delete-bin-line"></i>
                                </button>
                            </div>
                        </div>
                    `).join('') : '<div class="py-10 text-center text-xs text-slate-400">Belum ada template pada kategori ini.</div>'}
                </div>
            </div>

            <!-- Modal Tambah / Edit Template (akan dipindahkan ke document.body agar bebas dari transform/stacking context) -->
            <div id="doc-tpl-modal" class="hidden fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
                <div class="w-full max-w-3xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
                    <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <div>
                            <h3 id="doc-tpl-modal-title" class="text-base font-bold text-slate-900 dark:text-white">Tambah Template Dokumen</h3>
                            <p class="text-[11px] text-slate-400">Kelola info dasar, naskah ruang lingkup, pasal ketentuan, dan pratinjau variabel.</p>
                        </div>
                        <button type="button" id="doc-tpl-close" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center" aria-label="Tutup Modal">
                            <i class="ri-close-line text-lg"></i>
                        </button>
                    </div>

                    <!-- Tab Navigasi Editor Template -->
                    <div id="doc-tpl-tabs" class="px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
                        <button type="button" data-tpl-tab="info" class="tpl-tab-btn px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition bg-primary-600 text-white shadow-xs">
                            <i class="ri-settings-4-line"></i><span>1. Info Dasar</span>
                        </button>
                        <button type="button" data-tpl-tab="naskah" id="tpl-tab-btn-naskah" class="tpl-tab-btn px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100">
                            <i class="ri-file-text-line"></i><span>2. Naskah &amp; Fitur</span>
                        </button>
                        <button type="button" data-tpl-tab="pasal" class="tpl-tab-btn px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100">
                            <i class="ri-scales-3-line"></i><span>3. Pasal &amp; Klausul</span>
                        </button>
                        <button type="button" data-tpl-tab="preview" class="tpl-tab-btn px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100">
                            <i class="ri-eye-line"></i><span>4. Pratinjau</span>
                        </button>
                    </div>

                    <form id="doc-tpl-form" class="flex-1 overflow-y-auto p-6 space-y-4">
                        <input type="hidden" id="tpl-id" value="">

                        <!-- Chip Variabel Dinamis (Muncul di tab Naskah & Pasal) -->
                        <div id="tpl-var-bar" class="hidden p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 space-y-1.5">
                            <div class="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                                <i class="ri-magic-line"></i><span>Sisipkan Variabel Dinamis (klik pada kolom teks lalu klik chip):</span>
                            </div>
                            <div class="flex flex-wrap gap-1.5">
                                ${TEMPLATE_VARIABLES.map((v) => `
                                    <button type="button" data-insert-var="${v.tag}" title="${App.escapeHtml(v.desc)}"
                                        class="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-[10px] font-mono font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition">
                                        ${v.tag}
                                    </button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- TAB 1: Info Dasar -->
                        <div data-tpl-panel="info" class="tpl-tab-panel space-y-4">
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div class="sm:col-span-2">
                                    <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Nama Template *</label>
                                    <input type="text" id="tpl-nama" required placeholder="Contoh: SPK Aplikasi Custom"
                                        class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Jenis Dokumen *</label>
                                    <select id="tpl-jenis" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                                        <option value="sph">Surat Penawaran (SPH)</option>
                                        <option value="spk">Kontrak / SPK</option>
                                    </select>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Kategori Layanan</label>
                                    <input type="text" id="tpl-kategori" placeholder="Pengembangan Sistem"
                                        class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                </div>
                                <div id="tpl-garansi-wrap">
                                    <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Garansi Default (Hari)</label>
                                    <input type="number" id="tpl-garansi" min="0" value="30"
                                        class="w-full px-3.5 py-2.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Status</label>
                                    <select id="tpl-status" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                        <option value="aktif">Aktif</option>
                                        <option value="nonaktif">Nonaktif</option>
                                    </select>
                                </div>
                            </div>

                            <div id="tpl-spk-fields" class="hidden">
                                <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Judul Kontrak Default</label>
                                <input type="text" id="tpl-judul" placeholder="SPK Pengembangan Sistem — {{nama_perusahaan}}"
                                    class="tpl-var-target w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                            </div>

                            <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                                <input type="checkbox" id="tpl-default" class="w-4 h-4 rounded border-slate-300 text-primary-600">
                                <span>Jadikan template default untuk jenis dokumen ini</span>
                            </label>
                        </div>

                        <!-- TAB 2: Naskah & Ruang Lingkup (SPH) -->
                        <div data-tpl-panel="naskah" class="tpl-tab-panel hidden space-y-4">
                            <div id="tpl-sph-fields" class="space-y-4">
                                ${renderFormattedTextarea('tpl-salam', 'Salam Pembuka', 4, 'Dengan hormat, bersama surat ini kami sampaikan penawaran...')}
                                ${renderFormattedTextarea('tpl-fitur', 'Ruang Lingkup & Fitur', 5, '1. Modul Autentikasi & RBAC\n2. Dashboard & Laporan...')}
                                ${renderFormattedTextarea('tpl-timeline', 'Timeline Pengerjaan', 4, '1. Analisis & Desain (Minggu 1)\n2. Pengembangan Modul (Minggu 2 - 4)...')}
                            </div>
                        </div>

                        <!-- TAB 3: Pasal & Klausul -->
                        <div data-tpl-panel="pasal" class="tpl-tab-panel hidden space-y-3">
                            <div class="flex flex-wrap items-center gap-1.5">
                                <span class="text-[10px] font-bold uppercase text-slate-400 mr-1">Sisipkan Klausul Cepat:</span>
                                <button type="button" data-append-clause="PASAL TAMBAHAN — FORCE MAJEURE&#10;Keterlambatan akibat bencana alam, gangguan jaringan nasional, atau kebijakan pemerintah di luar kendali kedua pihak tidak dikenakan denda." class="btn-tpl-clause px-2.5 py-1 bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold">+ Force Majeure</button>
                                <button type="button" data-append-clause="PASAL TAMBAHAN — PERUBAHAN LINGKUP (CHANGE REQUEST)&#10;Penambahan fitur di luar ruang lingkup awal akan diatur melalui addendum dan estimasi biaya terpisah." class="btn-tpl-clause px-2.5 py-1 bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold">+ Change Request</button>
                                <button type="button" data-append-clause="PASAL TAMBAHAN — KERAHASIAAN DATA&#10;Kedua belah pihak wajib menjaga kerahasiaan data, kredensial, dan informasi bisnis selama maupun setelah perjanjian berakhir." class="btn-tpl-clause px-2.5 py-1 bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold">+ Kerahasiaan</button>
                            </div>
                            ${renderFormattedTextarea('tpl-isi-pasal', 'Isi Pasal / Syarat & Ketentuan', 10, 'Tuliskan pasal hak & kewajiban atau syarat & ketentuan...', 'font-mono')}
                        </div>

                        <!-- TAB 4: Pratinjau Simulasi Variabel -->
                        <div data-tpl-panel="preview" class="tpl-tab-panel hidden space-y-3">
                            <div class="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 text-[11px] text-emerald-800 dark:text-emerald-200">
                                Simulasi hasil akhir saat template diterapkan pada klien contoh (<b>PT Nusantara Digital</b>).
                            </div>
                            <div id="tpl-live-preview-box" class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-3 whitespace-pre-line leading-relaxed max-h-96 overflow-y-auto"></div>
                        </div>
                    </form>
                    <div class="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0 bg-slate-50/60 dark:bg-slate-900">
                        <button type="button" id="doc-tpl-cancel" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-xl">Batal</button>
                        <button type="submit" form="doc-tpl-form" id="btn-save-doc-tpl" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl">Simpan Template</button>
                    </div>
                </div>
            </div>
        `;

        let activeTplTab = 'info';
        const modalEl = container.querySelector('#doc-tpl-modal');
        if (modalEl) {
            document.querySelectorAll('body > #doc-tpl-modal').forEach((oldEl) => oldEl.remove());
            document.body.appendChild(modalEl);
        }

        const switchTplTab = (tabName) => {
            activeTplTab = tabName;
            modalEl?.querySelectorAll('.tpl-tab-btn').forEach((b) => {
                const act = b.dataset.tplTab === tabName;
                b.className = `tpl-tab-btn px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition ${act ? 'font-bold bg-primary-600 text-white shadow-xs' : 'font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'}`;
            });
            modalEl?.querySelectorAll('.tpl-tab-panel').forEach((p) => {
                p.classList.toggle('hidden', p.dataset.tplPanel !== tabName);
            });
            document.getElementById('tpl-var-bar')?.classList.toggle('hidden', !['naskah', 'pasal'].includes(tabName));
            if (tabName === 'naskah') activeTextareaId = 'tpl-salam';
            if (tabName === 'pasal') activeTextareaId = 'tpl-isi-pasal';
            if (tabName === 'preview') renderTemplatePreview();
        };

        const renderTemplatePreview = () => {
            const box = document.getElementById('tpl-live-preview-box');
            if (!box) return;
            const jenis = document.getElementById('tpl-jenis')?.value || 'sph';
            const sampleVars = {
                nama_perusahaan: 'PT Nusantara Digital',
                penanggung_jawab: 'Bpk. Hendra Wijaya',
                nama_project: 'Sistem ERP Terpadu',
                judul_kontrak: 'SPK Pengembangan Sistem ERP Terpadu',
                nilai_penawaran: App.formatIDR(35000000),
                nilai_kontrak: App.formatIDR(35000000),
                tanggal_penawaran: '28 Nov 2026',
                tanggal_mulai: '01 Des 2026',
                tanggal_selesai: '15 Jan 2027',
                garansi_hari: document.getElementById('tpl-garansi')?.value || 30
            };
            const sections = [];
            if (jenis === 'spk') {
                const jdl = resolveTemplateVariables(document.getElementById('tpl-judul')?.value, sampleVars);
                if (jdl) sections.push(`<div><div class="text-[10px] font-bold uppercase text-slate-400">Judul Kontrak</div><div class="font-bold text-slate-900 dark:text-white">${App.escapeHtml(jdl)}</div></div>`);
            } else {
                const salam = resolveTemplateVariables(document.getElementById('tpl-salam')?.value, sampleVars);
                const fitur = resolveTemplateVariables(document.getElementById('tpl-fitur')?.value, sampleVars);
                const tl = resolveTemplateVariables(document.getElementById('tpl-timeline')?.value, sampleVars);
                if (salam) sections.push(`<div><div class="text-[10px] font-bold uppercase text-slate-400">Salam Pembuka</div><div>${App.escapeHtml(salam)}</div></div>`);
                if (fitur) sections.push(`<div><div class="text-[10px] font-bold uppercase text-slate-400">Ruang Lingkup & Fitur</div><div>${App.escapeHtml(fitur)}</div></div>`);
                if (tl) sections.push(`<div><div class="text-[10px] font-bold uppercase text-slate-400">Timeline Pengerjaan</div><div>${App.escapeHtml(tl)}</div></div>`);
            }
            const pasal = resolveTemplateVariables(document.getElementById('tpl-isi-pasal')?.value, sampleVars);
            if (pasal) sections.push(`<div><div class="text-[10px] font-bold uppercase text-slate-400">Pasal & Ketentuan</div><div class="font-mono text-[11px]">${App.escapeHtml(pasal)}</div></div>`);
            box.innerHTML = sections.length ? sections.join('<hr class="border-slate-200 dark:border-slate-700">') : '<div class="text-slate-400 italic">Belum ada isi naskah atau pasal untuk dipratinjau.</div>';
        };

        const toggleKindFields = (jenis) => {
            document.getElementById('tpl-tab-btn-naskah')?.classList.toggle('hidden', jenis !== 'sph');
            document.getElementById('tpl-spk-fields')?.classList.toggle('hidden', jenis !== 'spk');
            document.getElementById('tpl-garansi-wrap')?.classList.toggle('hidden', jenis !== 'spk');
            if (jenis !== 'sph' && activeTplTab === 'naskah') switchTplTab('info');
        };

        const openModal = (tpl = null) => {
            document.getElementById('doc-tpl-modal-title').textContent = tpl ? 'Edit Template Dokumen' : 'Tambah Template Dokumen';
            document.getElementById('tpl-id').value = tpl ? tpl.id : '';
            document.getElementById('tpl-nama').value = tpl ? (tpl.nama_template || '') : '';
            document.getElementById('tpl-jenis').value = tpl ? (tpl.jenis || 'sph') : 'sph';
            document.getElementById('tpl-kategori').value = tpl ? (tpl.kategori || 'Umum') : 'Umum';
            document.getElementById('tpl-garansi').value = tpl ? (tpl.garansi_hari ?? 30) : 30;
            document.getElementById('tpl-status').value = tpl ? (tpl.status || 'aktif') : 'aktif';
            document.getElementById('tpl-judul').value = tpl ? (tpl.judul_default || '') : '';
            document.getElementById('tpl-salam').value = tpl ? (tpl.salam_pembuka || '') : '';
            document.getElementById('tpl-fitur').value = tpl ? (tpl.ruang_lingkup_fitur || '') : '';
            document.getElementById('tpl-timeline').value = tpl ? (tpl.timeline_pengerjaan || '') : '';
            document.getElementById('tpl-isi-pasal').value = tpl ? (tpl.isi_pasal || '') : '';
            document.getElementById('tpl-default').checked = tpl ? Number(tpl.is_default) === 1 : false;
            toggleKindFields(document.getElementById('tpl-jenis').value);
            switchTplTab('info');
            document.getElementById('doc-tpl-modal').classList.remove('hidden');
        };

        modalEl?.querySelectorAll('.tpl-tab-btn').forEach((btn) => {
            btn.addEventListener('click', () => switchTplTab(btn.dataset.tplTab));
        });

        modalEl?.querySelectorAll('.btn-tpl-clause').forEach((btn) => {
            btn.addEventListener('click', () => {
                const el = document.getElementById('tpl-isi-pasal');
                if (!el) return;
                const clause = btn.dataset.appendClause || '';
                el.value = (el.value.trim() ? el.value.trim() + '\n\n' : '') + clause;
                el.focus();
            });
        });

        container.querySelectorAll('[data-tpl-filter]').forEach((btn) => {
            btn.addEventListener('click', () => {
                filterJenis = btn.dataset.tplFilter;
                paint();
            });
        });

        document.getElementById('btn-add-doc-tpl')?.addEventListener('click', () => openModal(null));
        document.getElementById('doc-tpl-close')?.addEventListener('click', () => document.getElementById('doc-tpl-modal')?.classList.add('hidden'));
        document.getElementById('doc-tpl-cancel')?.addEventListener('click', () => document.getElementById('doc-tpl-modal')?.classList.add('hidden'));
        document.getElementById('tpl-jenis')?.addEventListener('change', (e) => toggleKindFields(e.target.value));

        modalEl?.querySelectorAll('.tpl-var-target').forEach((el) => {
            el.addEventListener('focus', () => { activeTextareaId = el.id; });
            el.addEventListener('input', () => updateTextareaCounter(el.id));
        });

        const updateTextareaCounter = (id) => {
            const el = document.getElementById(id);
            const counter = document.getElementById(`${id}-counter`);
            if (!el || !counter) return;
            const val = el.value || '';
            const lines = val ? val.split('\n').length : 0;
            counter.textContent = `${lines} baris · ${val.length} kar`;
        };
        const syncAllCounters = () => {
            ['tpl-salam', 'tpl-fitur', 'tpl-timeline', 'tpl-isi-pasal'].forEach(updateTextareaCounter);
        };

        modalEl?.querySelectorAll('[data-fmt]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.target);
                if (!target) return;
                const fmt = btn.dataset.fmt;
                const start = target.selectionStart ?? 0;
                const end = target.selectionEnd ?? 0;
                const val = target.value;
                const sel = val.slice(start, end);

                let replacement = sel;
                if (fmt === 'upper') {
                    replacement = sel ? sel.toUpperCase() : 'JUDUL BAGIAN';
                } else if (fmt === 'bold') {
                    replacement = sel ? `**${sel}**` : '**teks tebal**';
                } else if (fmt === 'italic') {
                    replacement = sel ? `_${sel}_` : '_teks miring_';
                } else if (fmt === 'ul') {
                    const lines = (sel || 'Poin baru').split('\n');
                    replacement = lines.map((l) => (l.trim().startsWith('•') ? l : `• ${l.trim()}`)).join('\n');
                } else if (fmt === 'ol') {
                    const lines = (sel || 'Langkah pertama').split('\n');
                    replacement = lines.map((l, i) => `${i + 1}. ${l.replace(/^\d+\.\s*/, '').trim()}`).join('\n');
                } else if (fmt === 'hr') {
                    replacement = '\n----------------------------------------\n';
                } else if (fmt === 'clean') {
                    target.value = val.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
                    updateTextareaCounter(target.id);
                    target.focus();
                    return;
                }

                target.value = val.slice(0, start) + replacement + val.slice(end);
                target.focus();
                target.selectionStart = start;
                target.selectionEnd = start + replacement.length;
                updateTextareaCounter(target.id);
            });
        });

        // Update counter when modal opens or clause inserted
        modalEl?.querySelectorAll('.btn-tpl-clause').forEach((btn) => {
            btn.addEventListener('click', () => updateTextareaCounter('tpl-isi-pasal'));
        });
        document.getElementById('btn-add-doc-tpl')?.addEventListener('click', syncAllCounters);
        container.querySelectorAll('[data-tpl-edit]').forEach((btn) => {
            btn.addEventListener('click', syncAllCounters);
        });
        modalEl?.querySelectorAll('[data-insert-var]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(activeTextareaId) || document.getElementById('tpl-isi-pasal');
                if (!target) return;
                const tag = btn.dataset.insertVar || '';
                const start = target.selectionStart ?? target.value.length;
                const end = target.selectionEnd ?? target.value.length;
                target.value = target.value.slice(0, start) + tag + target.value.slice(end);
                target.focus();
                target.selectionStart = target.selectionEnd = start + tag.length;
            });
        });

        container.querySelectorAll('[data-tpl-edit]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const found = templates.find((x) => Number(x.id) === Number(btn.dataset.tplEdit));
                if (found) openModal(found);
            });
        });

        container.querySelectorAll('[data-tpl-del]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const ok = await App.confirm('Hapus template dokumen ini?', 'Hapus Template');
                if (!ok) return;
                const res = await App.api(`templates/${btn.dataset.tplDel}`, { method: 'DELETE' });
                if (res && res.success) {
                    App.toast(res.message || 'Template dihapus', 'success');
                    loadAndRender();
                }
            });
        });

        document.getElementById('doc-tpl-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const tplId = document.getElementById('tpl-id').value;
            const saveBtn = document.getElementById('btn-save-doc-tpl');
            const payload = {
                nama_template: document.getElementById('tpl-nama').value.trim(),
                jenis: document.getElementById('tpl-jenis').value,
                kategori: document.getElementById('tpl-kategori').value.trim() || 'Umum',
                judul_default: document.getElementById('tpl-judul').value.trim(),
                salam_pembuka: document.getElementById('tpl-salam').value.trim(),
                ruang_lingkup_fitur: document.getElementById('tpl-fitur').value.trim(),
                timeline_pengerjaan: document.getElementById('tpl-timeline').value.trim(),
                isi_pasal: document.getElementById('tpl-isi-pasal').value.trim(),
                garansi_hari: Number(document.getElementById('tpl-garansi').value || 30),
                status: document.getElementById('tpl-status').value,
                is_default: document.getElementById('tpl-default').checked ? 1 : 0
            };
            App.btnLoading(saveBtn, true, 'Menyimpan...');
            const res = await App.api(tplId ? `templates/${tplId}` : 'templates', {
                method: tplId ? 'PUT' : 'POST',
                body: payload
            });
            App.btnLoading(saveBtn, false);
            if (res && res.success) {
                document.getElementById('doc-tpl-modal')?.classList.add('hidden');
                App.toast(res.message || 'Template berhasil disimpan', 'success');
                loadAndRender();
            }
        });
    };

    await loadAndRender();
}
