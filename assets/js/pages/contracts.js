// assets/js/pages/contracts.js — Manajemen Kontrak Kerja & SPK Digital (Seragam dengan Editor Penawaran)
import { App } from '../app.js';
import { generateContractPdf } from '../core/utils.js';
import { fetchDocumentTemplates, resolveTemplateVariables } from '../core/template-library.js';

let contracts = [];
let clientsList = [];
let projectsList = [];
let quotationsList = [];

const STATUS_BADGES = {
    draft: '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Draft</span>',
    terkirim: '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">Menunggu TTD</span>',
    ditandatangani: '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Sah & Ditandatangani</span>',
    dibatalkan: '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">Dibatalkan</span>'
};

function buildStandardSpkText(judul = 'Pengembangan Sistem Informasi', nilai = 0, garansi = 30) {
    const nilaiFmt = new Intl.NumberFormat('id-ID').format(Number(nilai || 0));
    return `PASAL 1 — PARA PIHAK & DASAR PERJANJIAN
Perjanjian Kerja ini dibuat dan disepakati oleh Pihak Pertama (Penyedia Jasa) dan Pihak Kedua (Klien/Pemberi Kerja) yang masing-masing diwakili oleh penanggung jawab yang sah, berdasarkan Surat Penawaran Harga yang telah disetujui.

PASAL 2 — RUANG LINGKUP PEKERJAAN & DELIVERABLES
Pihak Pertama berkewajiban melaksanakan pekerjaan "${judul || 'Pengembangan Sistem Informasi'}" meliputi perancangan, pengembangan sistem, pengujian (UAT), hingga serah terima hasil pekerjaan sesuai spesifikasi teknis pada Surat Penawaran terkait.

PASAL 3 — JANGKA WAKTU PELAKSANAAN & SERAH TERIMA
Pekerjaan dilaksanakan sesuai jadwal yang disepakati bersama sejak tanggal mulai kontrak. Setelah pengujian UAT disetujui, kedua belah pihak menandatangani Berita Acara Serah Terima (BAST) sebagai bukti penyelesaian resmi.

PASAL 4 — NILAI KONTRAK, PAJAK & TATA CARA PEMBAYARAN
Total nilai kontrak pekerjaan ini adalah sebesar Rp ${nilaiFmt}. Pembayaran dilakukan melalui transfer ke rekening resmi Pihak Pertama sesuai termin pada faktur tagihan. Ketentuan pajak (PPN/PPh) mengikuti peraturan perpajakan yang berlaku.

PASAL 5 — HAK & KEWAJIBAN PARA PIHAK
1. Pihak Pertama berhak menerima pembayaran tepat waktu serta memperoleh data, materi, dan akses infrastruktur yang dibutuhkan untuk pengerjaan proyek.
2. Pihak Kedua berhak memantau progres pekerjaan, melakukan uji coba UAT, serta menerima dokumentasi dan hasil kerja sesuai ruang lingkup.
3. Pihak Kedua wajib memberikan umpan balik dan persetujuan tepat waktu agar jadwal proyek tidak terhambat.

PASAL 6 — GARANSI SISTEM, PEMELIHARAAN & CHANGE REQUEST
Dukungan pemeliharaan sistem dan perbaikan teknis dilaksanakan sesuai paket biaya maintenance & support yang disepakati pada rincian kontrak ini (masa garansi awal implementasi ${Number(garansi ?? 30)} hari kalender pasca-BAST untuk error bawaan ruang lingkup). Permintaan penambahan fitur atau perubahan desain di luar ruang lingkup awal diatur sebagai Change Request dengan estimasi biaya dan waktu terpisah.

PASAL 7 — HAK KEKAYAAN INTELEKTUAL & KERAHASIAAN
Seluruh Hak Kekayaan Intelektual (HAKI), hak cipta, arsitektur sistem, dan Source Code aplikasi sepenuhnya merupakan hak milik mutlak dan eksklusif Pihak Pertama. Pihak Kedua hanya memperoleh hak akses penggunaan aplikasi sebagai Pemakai Akhir (End-User License) untuk operasional internal dan dilarang menyalin, membongkar (reverse engineer), memodifikasi, atau mendistribusikan kode sumber kepada pihak ketiga. Kedua belah pihak wajib menjaga kerahasiaan data bisnis dan kredensial akses.

PASAL 8 — KEADAAN KAHAR (FORCE MAJEURE) & PENYELESAIAN PERSELISIHAN
Keterlambatan akibat bencana alam, gangguan jaringan nasional, atau kebijakan pemerintah di luar kendali wajar kedua pihak tidak dianggap wanprestasi. Segala perselisihan yang timbul akan diselesaikan terlebih dahulu secara musyawarah untuk mufakat.`;
}

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Kontrak & SPK Digital</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Kelola Surat Perjanjian Kerja (SPK/PKS) dan pengesahan tanda tangan digital klien via Portal.</p>
                </div>
                <button id="btn-add-contract" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm self-start sm:self-auto">
                    <i class="ri-add-line text-sm"></i><span>Buat SPK Baru</span>
                </button>
            </div>

            <!-- KPI Strip -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Total SPK</div>
                    <div id="kpi-spk-total" class="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">0</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Draft</div>
                    <div id="kpi-spk-draft" class="text-2xl font-black font-mono text-slate-600 dark:text-slate-300 mt-1">0</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Menunggu TTD</div>
                    <div id="kpi-spk-sent" class="text-2xl font-black font-mono text-amber-600 mt-1">0</div>
                </div>
                <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div class="text-[11px] font-bold uppercase text-slate-400">Ditandatangani</div>
                    <div id="kpi-spk-signed" class="text-2xl font-black font-mono text-emerald-600 mt-1">0</div>
                </div>
            </div>

            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-wrap items-center gap-3">
                <input id="contract-search" type="text" placeholder="Cari nomor SPK, judul, atau nama klien..."
                       class="flex-1 min-w-[220px] px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                <select id="contract-filter-status" class="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                    <option value="">Semua Status</option>
                    <option value="draft">Draft</option>
                    <option value="terkirim">Menunggu TTD</option>
                    <option value="ditandatangani">Ditandatangani</option>
                </select>
            </div>

            <div id="contracts-table-wrap" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden"></div>
        </div>
    `;

    const [cRes, pRes, qRes] = await Promise.all([
        App.api('clients?all=1'),
        App.api('projects?all=1'),
        App.api('quotations?per_page=100')
    ]);
    clientsList = cRes?.success && Array.isArray(cRes.data) ? cRes.data : [];
    projectsList = pRes?.success && Array.isArray(pRes.data) ? pRes.data : [];
    quotationsList = qRes?.success ? (Array.isArray(qRes.data) ? qRes.data : (qRes.data?.items || [])) : [];

    document.getElementById('btn-add-contract')?.addEventListener('click', () => openContractModal());
    document.getElementById('contract-search')?.addEventListener('input', App.debounce(loadContracts, 250));
    document.getElementById('contract-filter-status')?.addEventListener('change', loadContracts);

    await loadContracts();
}

async function loadContracts() {
    const search = document.getElementById('contract-search')?.value?.trim() || '';
    const status = document.getElementById('contract-filter-status')?.value || '';
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    if (status) qs.set('status', status);

    const res = await App.api(`contracts?${qs.toString()}`);
    contracts = res?.success && Array.isArray(res.data) ? res.data : [];

    const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setEl('kpi-spk-total', contracts.length);
    setEl('kpi-spk-draft', contracts.filter((x) => x.status === 'draft').length);
    setEl('kpi-spk-sent', contracts.filter((x) => x.status === 'terkirim').length);
    setEl('kpi-spk-signed', contracts.filter((x) => x.status === 'ditandatangani').length);

    renderContractsTable();
}

function renderContractsTable() {
    const wrap = document.getElementById('contracts-table-wrap');
    if (!wrap) return;

    if (!contracts.length) {
        wrap.innerHTML = `<div class="p-12 text-center text-xs text-slate-400">Belum ada dokumen SPK / Kontrak. Buat baru atau konversi langsung dari Surat Penawaran.</div>`;
        return;
    }

    wrap.innerHTML = `
        <div class="overflow-x-auto">
            <table class="data-table w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 bg-slate-50/70 dark:bg-slate-800/40">
                        <th class="py-3.5 px-7">Nomor & Judul SPK</th>
                        <th class="py-3.5 px-4">Klien & Proyek</th>
                        <th class="py-3.5 px-4 text-right">Nilai Kontrak</th>
                        <th class="py-3.5 px-4">Status</th>
                        <th class="py-3.5 px-7 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    ${contracts.map((k) => `
                        <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition">
                            <td class="py-3.5 px-7 align-middle max-w-[260px]">
                                <div class="font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">${App.escapeHtml(k.nomor_kontrak)}</div>
                                <div class="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 truncate" title="${App.escapeHtml(k.judul_kontrak)}">${App.escapeHtml(k.judul_kontrak)}</div>
                                <div class="text-[11px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">Garansi ${k.garansi_hari} hari${k.tanggal_mulai ? ' · Mulai ' + App.formatDate(k.tanggal_mulai) : ''}</div>
                            </td>
                            <td class="py-3.5 px-4 align-middle max-w-[200px]">
                                <div class="font-bold text-slate-800 dark:text-slate-200 truncate" title="${App.escapeHtml(k.client_nama)}">${App.escapeHtml(k.client_nama)}</div>
                                ${k.nama_project ? `<div class="text-[11px] text-slate-500 truncate" title="${App.escapeHtml(k.nama_project)}">${App.escapeHtml(k.nama_project)}</div>` : ''}
                                ${k.nomor_penawaran ? `<div class="text-[10px] font-mono text-indigo-600 whitespace-nowrap">${App.escapeHtml(k.nomor_penawaran)}</div>` : ''}
                            </td>
                            <td class="py-3.5 px-4 align-middle text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">${App.formatIDR(k.nilai_kontrak)}</td>
                            <td class="py-3.5 px-4 align-middle whitespace-nowrap">
                                ${STATUS_BADGES[k.status] || k.status}
                                ${k.signed_at ? `<div class="text-[10px] text-emerald-600 mt-1 truncate max-w-[140px]">${App.escapeHtml(k.signed_by_name || '')}</div>` : ''}
                            </td>
                            <td class="py-3.5 px-7 align-middle text-right whitespace-nowrap">
                                <div class="inline-flex items-center gap-1.5">
                                    <button data-pdf="${k.id}" class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600" title="Pratinjau PDF SPK">
                                        <i class="ri-file-pdf-2-line"></i>
                                    </button>
                                    <button data-email="${k.id}" class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600" title="Kirim Email SPK + PDF">
                                        <i class="ri-mail-send-line"></i>
                                    </button>
                                    <button data-view="${k.id}" class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300" title="Lihat Detail & Pasal">
                                        <i class="ri-eye-line"></i>
                                    </button>
                                    ${k.status === 'draft' ? `
                                        <button data-send="${k.id}" class="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold" title="Kirim ke Portal Klien">
                                            Kirim Portal
                                        </button>` : ''}
                                    ${k.status !== 'ditandatangani' ? `
                                        <button data-edit="${k.id}" class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600" title="Edit">
                                            <i class="ri-edit-line"></i>
                                        </button>
                                        <button data-del="${k.id}" class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 text-rose-600" title="Hapus">
                                            <i class="ri-delete-bin-line"></i>
                                        </button>` : ''}
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>
    `;

    wrap.querySelectorAll('[data-pdf]').forEach((btn) => btn.addEventListener('click', () => previewContractPdf(btn.dataset.pdf)));
    wrap.querySelectorAll('[data-email]').forEach((btn) => btn.addEventListener('click', () => sendContractEmail(btn.dataset.email)));
    wrap.querySelectorAll('[data-view]').forEach((btn) => btn.addEventListener('click', () => viewContractDetail(btn.dataset.view)));
    wrap.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => openContractModal(btn.dataset.edit)));
    wrap.querySelectorAll('[data-send]').forEach((btn) => btn.addEventListener('click', () => sendContract(btn.dataset.send)));
    wrap.querySelectorAll('[data-del]').forEach((btn) => btn.addEventListener('click', () => deleteContract(btn.dataset.del)));
}

async function sendContractEmail(id) {
    const res = await App.api(`contracts/${id}`);
    if (!res?.success || !res.data) return;
    const { promptSendEmail } = await import('../core/email-sender.js');
    await promptSendEmail({
        title: `Kirim SPK ${res.data.nomor_kontrak || ''} via Email?`,
        text: 'Dokumen PDF Kontrak / SPK Digital beserta tautan Portal Klien akan dikirimkan via SMTP.',
        defaultCc: res.data.client_cc_email || '',
        endpoint: `contracts/${id}/send-email`,
        buildPdf: () => generateContractPdf(res.data, 'bloburl'),
        onSuccess: () => loadContracts()
    });
}

async function previewContractPdf(id, mode = 'bloburl') {
    const res = await App.api(`contracts/${id}`);
    if (!res?.success || !res.data) return;
    try {
        const out = await generateContractPdf(res.data, mode);
        if (mode !== 'download' && out?.blobUrl) {
            App.openPdfModal({
                title: `Surat Perjanjian Kerja — ${res.data.nomor_kontrak || 'SPK'}`,
                filename: out.filename,
                blobUrl: out.blobUrl
            });
        }
    } catch (err) {
        App.toast(err?.message || 'Gagal membuat PDF SPK', 'error');
    }
}

async function viewContractDetail(id) {
    const res = await App.api(`contracts/${id}`);
    if (!res?.success || !res.data) return;
    const k = res.data;
    App.openModal(`
        <div class="p-6 space-y-4">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <div class="text-xs font-mono font-bold text-primary-600">${App.escapeHtml(k.nomor_kontrak)}</div>
                    <h3 class="text-lg font-extrabold text-slate-900 dark:text-white">${App.escapeHtml(k.judul_kontrak)}</h3>
                    <div class="text-xs text-slate-500 mt-0.5">${App.escapeHtml(k.client_nama)} · Nilai ${App.formatIDR(k.nilai_kontrak)}</div>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" id="btn-detail-spk-pdf" class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5">
                        <i class="ri-file-pdf-2-line text-rose-400"></i><span>Pratinjau PDF</span>
                    </button>
                    ${STATUS_BADGES[k.status] || ''}
                </div>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs whitespace-pre-line leading-relaxed max-h-80 overflow-y-auto">${App.escapeHtml(k.isi_pasal)}</div>
            ${k.signature_data ? `
                <div class="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between gap-4">
                    <div class="text-xs">
                        <div class="font-bold text-emerald-800 dark:text-emerald-300">Disahkan oleh ${App.escapeHtml(k.signed_by_name)}</div>
                        <div class="text-[11px] text-slate-500">${App.escapeHtml(k.signed_by_position || '-')} · ${App.formatDateTime(k.signed_at)}</div>
                    </div>
                    <img src="${k.signature_data}" alt="TTD" class="h-14 bg-white rounded-lg border border-slate-200 p-1">
                </div>` : ''}
        </div>
    `, { size: 'lg' });
    document.getElementById('btn-detail-spk-pdf')?.addEventListener('click', () => previewContractPdf(k.id, 'bloburl'));
}

async function openContractModal(editId = null) {
    let k = null;
    if (editId) {
        const res = await App.api(`contracts/${editId}`);
        if (!res?.success) return;
        k = res.data;
    }

    const defaultPasal = k?.isi_pasal || buildStandardSpkText('', 0, 30);

    App.openModal(`
        <div class="p-6 sm:p-8 flex flex-col max-h-[88vh]">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div>
                    <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-file-shield-2-line text-primary-600"></i>
                        <span>${k ? `Edit SPK (${App.escapeHtml(k.nomor_kontrak)})` : 'Buat Kontrak / SPK Digital Baru'}</span>
                    </h3>
                    <p class="text-[11px] text-slate-400 mt-0.5">Lengkapi setiap tab secara berurutan atau lompat langsung ke bagian yang ingin diubah.</p>
                </div>
                <div class="flex items-center gap-2">
                    <select id="spk-template-select" class="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-200 max-w-[180px]" title="Terapkan template dari Pustaka Template">
                        <option value="">-- Pilih Template SPK --</option>
                    </select>
                    <button type="button" id="btn-fill-spk-template" class="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-primary-600 dark:text-primary-400 rounded-xl text-[11px] font-bold flex items-center gap-1 transition">
                        <i class="ri-magic-line"></i> <span class="hidden sm:inline">Template Standar</span>
                    </button>
                    <button type="button" onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600 p-1"><i class="ri-close-line text-xl"></i></button>
                </div>
            </div>

            <div id="spk-editor-tabs" class="grid grid-cols-3 gap-2 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <button type="button" data-spk-tab="klien" class="spk-editor-tab px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition bg-primary-600 text-white shadow-xs">
                    <i class="ri-user-3-line"></i><span>1. Klien &amp; Lingkup</span>
                </button>
                <button type="button" data-spk-tab="nilai" class="spk-editor-tab px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200">
                    <i class="ri-money-dollar-circle-line"></i><span>2. Nilai &amp; Garansi</span>
                </button>
                <button type="button" data-spk-tab="pasal" class="spk-editor-tab px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200">
                    <i class="ri-scales-3-line"></i><span>3. Pasal &amp; Ketentuan</span>
                </button>
            </div>

            <form id="contract-form" class="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs">
                <!-- TAB 1: Klien & Lingkup -->
                <div data-spk-panel="klien" class="spk-editor-panel space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Pelanggan / Klien *</label>
                            <select id="spk-client" required class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                                <option value="">-- Pilih Klien --</option>
                                ${clientsList.map((c) => `<option value="${c.id}" ${Number(k?.client_id) === Number(c.id) ? 'selected' : ''}>${App.escapeHtml(c.nama_perusahaan)}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Referensi Penawaran (SPH)</label>
                            <select id="spk-quotation" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                                <option value="">-- Tanpa Penawaran --</option>
                                ${quotationsList.map((q) => `<option value="${q.id}" data-client="${q.client_id}" data-project="${q.project_id || ''}" data-total="${q.total_penawaran}" data-title="${App.escapeHtml(q.nama_project || q.nomor_penawaran)}" ${Number(k?.quotation_id) === Number(q.id) ? 'selected' : ''}>${App.escapeHtml(q.nomor_penawaran)} — ${App.escapeHtml(q.nama_perusahaan || '')}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Proyek Terkait (Opsional)</label>
                            <select id="spk-project" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                                <option value="">-- Tanpa Proyek Tertentu --</option>
                                ${projectsList.map((p) => `<option value="${p.id}" ${Number(k?.project_id) === Number(p.id) ? 'selected' : ''}>${App.escapeHtml(p.nama_project)}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Status Dokumen</label>
                            <select id="spk-status" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                                <option value="draft" ${k?.status === 'draft' ? 'selected' : ''}>Draft Internal</option>
                                <option value="terkirim" ${(!k || k?.status === 'terkirim') ? 'selected' : ''}>Kirim ke Portal Klien</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Judul Kontrak / Pekerjaan *</label>
                        <input id="spk-judul" type="text" required value="${App.escapeHtml(k?.judul_kontrak || '')}" placeholder="SPK Pengembangan Sistem ERP..."
                               class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Perwakilan Pihak Pertama</label>
                            <input id="spk-p1-nama" type="text" value="${App.escapeHtml(k?.pihak_pertama_nama || App.user?.nama_lengkap || '')}" placeholder="Nama direktur / penandatangan internal"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        </div>
                        <div>
                            <label class="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Jabatan Pihak Pertama</label>
                            <input id="spk-p1-jabatan" type="text" value="${App.escapeHtml(k?.pihak_pertama_jabatan || 'Direktur / Pimpinan')}" placeholder="Direktur / Project Manager"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Tanggal Mulai Kerja</label>
                            <input id="spk-mulai" type="date" value="${k?.tanggal_mulai || new Date().toISOString().slice(0, 10)}"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono">
                        </div>
                        <div>
                            <label class="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Estimasi Selesai</label>
                            <input id="spk-selesai" type="date" value="${k?.tanggal_selesai || ''}"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono">
                        </div>
                    </div>
                </div>

                <!-- TAB 2: Nilai & Garansi -->
                <div data-spk-panel="nilai" class="spk-editor-panel hidden space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Nilai Kontrak (Rp)</label>
                            <input id="spk-nilai" type="number" min="0" value="${Number(k?.nilai_kontrak || 0)}"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm font-bold">
                        </div>
                        <div>
                            <label class="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Masa Garansi Bug (Hari Kalender)</label>
                            <input id="spk-garansi" type="number" min="0" value="${Number(k?.garansi_hari ?? 30)}"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm font-bold">
                        </div>
                    </div>
                    <div class="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200 leading-relaxed">
                        <div class="font-bold mb-1 flex items-center gap-1.5"><i class="ri-information-line"></i> Catatan Penagihan & Garansi</div>
                        Nilai kontrak dan durasi garansi ini akan muncul pada naskah perjanjian di Portal Klien dan menjadi acuan serah terima BAST.
                    </div>
                </div>

                <!-- TAB 3: Pasal & Ketentuan -->
                <div data-spk-panel="pasal" class="spk-editor-panel hidden space-y-3">
                    <div class="flex flex-wrap items-center gap-1.5">
                        <span class="text-[10px] font-bold uppercase text-slate-400 mr-1">Sisipkan Cepat:</span>
                        <button type="button" data-append-pasal="PASAL TAMBAHAN — FORCE MAJEURE&#10;Keterlambatan akibat bencana alam, gangguan jaringan nasional, atau kebijakan pemerintah di luar kendali kedua pihak tidak dikenakan denda." class="btn-spk-chip px-2.5 py-1 bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold">+ Force Majeure</button>
                        <button type="button" data-append-pasal="PASAL TAMBAHAN — REVISI & PERUBAHAN LINGKUP&#10;Penambahan fitur di luar spesifikasi penawaran awal akan dihitung sebagai pekerjaan tambahan (Change Request) dengan estimasi biaya terpisah." class="btn-spk-chip px-2.5 py-1 bg-slate-100 hover:bg-primary-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold">+ Change Request</button>
                    </div>
                    <textarea id="spk-pasal" rows="11" class="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl leading-relaxed">${App.escapeHtml(defaultPasal)}</textarea>
                </div>

                <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onclick="App.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">Batal</button>
                    <button type="submit" class="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold">Simpan Kontrak / SPK</button>
                </div>
            </form>
        </div>
    `, { size: 'xl' });

    const switchTab = (tabName) => {
        document.querySelectorAll('.spk-editor-tab').forEach((b) => {
            const active = b.dataset.spkTab === tabName;
            b.className = `spk-editor-tab px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition ${active ? 'font-bold bg-primary-600 text-white shadow-xs' : 'font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`;
        });
        document.querySelectorAll('.spk-editor-panel').forEach((p) => {
            p.classList.toggle('hidden', p.dataset.spkPanel !== tabName);
        });
    };

    document.querySelectorAll('.spk-editor-tab').forEach((b) => {
        b.addEventListener('click', () => switchTab(b.dataset.spkTab));
    });

    let pasalManuallyEdited = !!k?.isi_pasal;
    const pasalEl = document.getElementById('spk-pasal');
    const syncAutoPasal = () => {
        if (pasalManuallyEdited || !pasalEl) return;
        const judul = document.getElementById('spk-judul').value.trim() || 'Pengembangan Sistem Informasi';
        const nilai = document.getElementById('spk-nilai').value || 0;
        const garansi = document.getElementById('spk-garansi').value || 30;
        pasalEl.value = buildStandardSpkText(judul, nilai, garansi);
    };

    pasalEl?.addEventListener('input', () => { pasalManuallyEdited = true; });
    ['spk-judul', 'spk-nilai', 'spk-garansi'].forEach((fid) => {
        document.getElementById(fid)?.addEventListener('input', syncAutoPasal);
    });

    document.getElementById('spk-quotation')?.addEventListener('change', (e) => {
        const opt = e.target.selectedOptions?.[0];
        if (!opt || !opt.value) return;
        if (opt.dataset.client) document.getElementById('spk-client').value = opt.dataset.client;
        if (opt.dataset.project) document.getElementById('spk-project').value = opt.dataset.project;
        if (opt.dataset.total) document.getElementById('spk-nilai').value = opt.dataset.total;
        if (opt.dataset.title) {
            document.getElementById('spk-judul').value = `SPK ${opt.dataset.title}`;
        }
        pasalManuallyEdited = false;
        syncAutoPasal();
    });

    document.getElementById('btn-fill-spk-template')?.addEventListener('click', () => {
        const judul = document.getElementById('spk-judul').value.trim() || 'Pengembangan Sistem Informasi';
        const nilai = document.getElementById('spk-nilai').value || 0;
        const garansi = document.getElementById('spk-garansi').value || 30;
        document.getElementById('spk-pasal').value = buildStandardSpkText(judul, nilai, garansi);
        App.toast('Template pasal standar SPK diterapkan', 'info');
        switchTab('pasal');
    });

    const spkTplSelect = document.getElementById('spk-template-select');
    let spkTemplates = [];
    fetchDocumentTemplates('spk').then((list) => {
        spkTemplates = list;
        if (spkTplSelect && list.length) {
            spkTplSelect.innerHTML = '<option value="">-- Pilih Template SPK --</option>' +
                list.map((t) => `<option value="${t.id}">${App.escapeHtml(t.nama_template)}</option>`).join('');
            const defSpk = !k ? list.find((t) => Number(t.is_default) === 1) : null;
            if (defSpk) {
                spkTplSelect.value = String(defSpk.id);
                const defVars = {
                    nama_perusahaan: 'Klien',
                    penanggung_jawab: 'Bapak/Ibu Pimpinan',
                    nilai_kontrak: App.formatIDR(document.getElementById('spk-nilai')?.value || 0),
                    tanggal_mulai: document.getElementById('spk-mulai')?.value || '-',
                    tanggal_selesai: document.getElementById('spk-selesai')?.value || '-',
                    garansi_hari: Number(defSpk.garansi_hari ?? 30),
                    judul_kontrak: document.getElementById('spk-judul')?.value.trim() || 'Perjanjian Kerja'
                };
                if (defSpk.judul_default && !document.getElementById('spk-judul').value.trim()) {
                    document.getElementById('spk-judul').value = resolveTemplateVariables(defSpk.judul_default, defVars);
                }
                if (defSpk.isi_pasal) {
                    document.getElementById('spk-pasal').value = resolveTemplateVariables(defSpk.isi_pasal, defVars);
                    pasalManuallyEdited = true;
                }
            }
        }
    });
    spkTplSelect?.addEventListener('change', (e) => {
        const tpl = spkTemplates.find((t) => Number(t.id) === Number(e.target.value));
        if (!tpl) return;
        const clientId = document.getElementById('spk-client')?.value;
        const clientObj = clientsList.find((c) => String(c.id) === String(clientId));
        const clientName = clientObj?.nama_perusahaan || 'Klien';
        const picName = clientObj?.penanggung_jawab || 'Bapak/Ibu Pimpinan';
        const garansiVal = Number(tpl.garansi_hari ?? document.getElementById('spk-garansi')?.value ?? 30);
        if (document.getElementById('spk-garansi')) document.getElementById('spk-garansi').value = garansiVal;

        const baseVars = {
            nama_perusahaan: clientName,
            penanggung_jawab: picName,
            nilai_kontrak: App.formatIDR(document.getElementById('spk-nilai')?.value || 0),
            tanggal_mulai: document.getElementById('spk-mulai')?.value || '-',
            tanggal_selesai: document.getElementById('spk-selesai')?.value || '-',
            garansi_hari: garansiVal
        };
        if (tpl.judul_default && !document.getElementById('spk-judul').value.trim()) {
            document.getElementById('spk-judul').value = resolveTemplateVariables(tpl.judul_default, baseVars);
        }
        baseVars.judul_kontrak = document.getElementById('spk-judul')?.value.trim() || 'Perjanjian Kerja';
        if (tpl.isi_pasal) {
            document.getElementById('spk-pasal').value = resolveTemplateVariables(tpl.isi_pasal, baseVars);
            pasalManuallyEdited = true;
        }
        App.toast(`Template "${tpl.nama_template}" diterapkan`, 'success', 1800);
        switchTab('pasal');
    });

    document.querySelectorAll('.btn-spk-chip').forEach((btn) => {
        btn.addEventListener('click', () => {
            const ta = document.getElementById('spk-pasal');
            const add = btn.dataset.appendPasal || '';
            ta.value = ta.value.trim() ? `${ta.value.trim()}\n\n${add}` : add;
        });
    });

    document.getElementById('contract-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            id: k?.id || undefined,
            client_id: document.getElementById('spk-client').value,
            quotation_id: document.getElementById('spk-quotation').value || null,
            project_id: document.getElementById('spk-project').value || null,
            judul_kontrak: document.getElementById('spk-judul').value.trim(),
            pihak_pertama_nama: document.getElementById('spk-p1-nama').value.trim(),
            pihak_pertama_jabatan: document.getElementById('spk-p1-jabatan').value.trim(),
            nilai_kontrak: document.getElementById('spk-nilai').value,
            garansi_hari: document.getElementById('spk-garansi').value,
            tanggal_mulai: document.getElementById('spk-mulai').value || null,
            tanggal_selesai: document.getElementById('spk-selesai').value || null,
            status: document.getElementById('spk-status').value,
            isi_pasal: document.getElementById('spk-pasal').value.trim()
        };
        const res = await App.api('contracts', { method: 'POST', body: payload });
        if (res?.success) {
            App.toast(res.message || 'SPK berhasil disimpan', 'success');
            App.closeModal();
            await loadContracts();
        }
    });
}

async function sendContract(id) {
    const res = await App.api(`contracts/${id}/send`, { method: 'POST' });
    if (res?.success) {
        App.toast(res.message || 'SPK dikirim ke Portal Klien', 'success');
        await loadContracts();
    }
}

async function deleteContract(id) {
    const ok = await App.confirmAction('Hapus SPK?', 'Dokumen kontrak ini akan dihapus permanen.');
    if (!ok) return;
    const res = await App.api(`contracts/${id}`, { method: 'DELETE' });
    if (res?.success) {
        App.toast('SPK dihapus', 'success');
        await loadContracts();
    }
}
