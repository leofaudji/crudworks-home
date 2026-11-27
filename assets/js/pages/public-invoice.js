// assets/js/pages/public-invoice.js
import { App } from '../app.js';

export async function init(container, param, query) {
    const token = (query?.token || query?.nomor || param || '').trim();

    if (!token) {
        await renderLookupPortal(container);
        return;
    }

    container.innerHTML = `
        <div class="max-w-4xl mx-auto py-4 space-y-6 animate-fadeIn">
            <div id="public-inv-loading" class="text-center py-24 text-slate-400">
                <i class="ri-loader-4-line text-3xl animate-spin text-primary-600"></i>
                <div class="text-xs mt-3 font-semibold">Memuat rincian faktur resmi...</div>
            </div>
            <div id="public-inv-content" class="hidden space-y-6"></div>
        </div>
    `;

    await loadPublicInvoice(token);
}

async function renderLookupPortal(container) {
    container.innerHTML = `
        <div class="max-w-3xl mx-auto py-8 space-y-6 animate-fadeIn">
            <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                <div class="flex items-start justify-between gap-4">
                    <div class="flex items-center gap-3.5">
                        <div class="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center text-2xl font-black shadow-md">
                            <i class="ri-file-search-line"></i>
                        </div>
                        <div>
                            <h1 class="text-xl font-black text-slate-900 dark:text-white tracking-tight">Portal Tagihan Klien Publik</h1>
                            <p class="text-xs text-slate-500 mt-0.5">Cek rincian tagihan resmi, unduh PDF faktur, dan unggah konfirmasi bukti transfer bank.</p>
                        </div>
                    </div>
                    ${App.user ? `
                        <a href="#/invoices" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition">
                            <i class="ri-arrow-left-line"></i> Kembali ke Faktur
                        </a>
                    ` : ''}
                </div>

                <form id="public-lookup-form" class="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row gap-3">
                    <div class="relative flex-1">
                        <i class="ri-hashtag absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input type="text" id="public-lookup-input" required
                               placeholder="Masukkan Nomor Faktur (contoh: INV-202611-0001) atau Token Akses..."
                               class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500">
                    </div>
                    <button type="submit" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-sm transition">
                        <i class="ri-search-eye-line"></i>
                        <span>Buka Faktur Tagihan</span>
                    </button>
                </form>

                <div id="public-recent-list" class="space-y-3 hidden">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pilih Cepat Faktur Tagihan Aktif</span>
                    </div>
                    <div id="public-recent-items" class="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden"></div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('public-lookup-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = document.getElementById('public-lookup-input')?.value.trim();
        if (val) {
            window.location.hash = `#/public-invoice?token=${encodeURIComponent(val)}`;
        }
    });

    // If staff/admin is logged in, load recent invoices for 1-click preview
    const res = await App.api('public-invoice?action=list-recent', { silent: true });
    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const listWrap = document.getElementById('public-recent-list');
        const itemsEl = document.getElementById('public-recent-items');
        if (listWrap && itemsEl) {
            listWrap.classList.remove('hidden');
            itemsEl.innerHTML = res.data.map(inv => `
                <div class="p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3 transition">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-mono font-bold text-xs text-slate-900 dark:text-white">${inv.nomor_invoice}</span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${inv.status === 'lunas' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">${inv.status}</span>
                        </div>
                        <div class="text-xs text-slate-500 mt-0.5">${inv.nama_perusahaan} ${inv.nama_project ? `· ${inv.nama_project}` : ''}</div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="text-right font-mono">
                            <div class="text-xs font-bold text-slate-900 dark:text-white">${App.formatIDR(inv.total_tagihan)}</div>
                            <div class="text-[10px] text-slate-400">Jatuh Tempo: ${App.formatDate(inv.tanggal_jatuh_tempo)}</div>
                        </div>
                        <a href="#/public-invoice?token=${encodeURIComponent(inv.public_token)}"
                           class="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition">
                            <i class="ri-external-link-line"></i> Buka Portal
                        </a>
                    </div>
                </div>
            `).join('');
        }
    }
}

async function loadPublicInvoice(token) {
    const loadingEl = document.getElementById('public-inv-loading');
    const contentEl = document.getElementById('public-inv-content');

    const res = await App.api(`public-invoice?token=${encodeURIComponent(token)}`, { silent: true });
    if (!res || !res.success || !res.data) {
        if (loadingEl) {
            loadingEl.innerHTML = `
                <div class="max-w-md mx-auto text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
                    <div class="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">
                        <i class="ri-file-damage-line"></i>
                    </div>
                    <h3 class="text-base font-bold text-slate-900 dark:text-white">Faktur Tidak Ditemukan</h3>
                    <p class="text-xs text-slate-500 mt-1 mb-5">${res?.message || 'Faktur tagihan tidak ditemukan atau tautan akses tidak valid.'}</p>
                    <a href="#/public-invoice" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5">
                        <i class="ri-search-line"></i> Cari Nomor Faktur Lain
                    </a>
                </div>
            `;
        }
        return;
    }

    const inv = res.data;
    const c = inv.company || {};

    if (loadingEl) loadingEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');

    const isLunas = inv.status === 'lunas' || Number(inv.sisa_tagihan) <= 0;
    const isPendingVerify = inv.payment_verification_status === 'pending';

    const bankList = (inv.payment_methods || []).filter(b => !b.tipe || b.tipe === 'bank' || b.nomor_rekening);

    contentEl.innerHTML = `
        <!-- Top Navigation / Status Header -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <img src="assets/images/logo.png" alt="CRUDWorks Logo" class="h-9 w-auto object-contain" />
                <div class="hidden sm:block border-l border-slate-200 dark:border-slate-700 pl-4">
                    <h2 class="text-sm font-bold text-slate-900 dark:text-white">${c.company_name || 'CRUDWorks Media Tama'}</h2>
                    <p class="text-xs text-slate-500">${c.company_address || 'Jl. Rasuna Said Kav. B4, Jakarta Selatan'} · Telp: ${c.company_phone || '(021) 555-0199'}</p>
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
                ${App.user ? `
                    <a href="#/invoices" class="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition">
                        <i class="ri-arrow-left-line"></i> Daftar Faktur
                    </a>
                ` : ''}
                <button id="btn-pub-copy-link" class="px-3.5 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition">
                    <i class="ri-share-line"></i>
                    <span>Salin Link Portal</span>
                </button>
                <button id="btn-pub-preview-pdf" class="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition">
                    <i class="ri-file-pdf-2-line text-rose-400 text-base"></i>
                    <span>Pratinjau PDF</span>
                </button>
                <button id="btn-pub-download-pdf" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition">
                    <i class="ri-download-line text-base"></i>
                    <span>Unduh PDF</span>
                </button>
            </div>
        </div>

        <!-- Invoice Details Sheet Card -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
            <!-- Header Meta -->
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div class="space-y-2">
                    <img src="assets/images/logo.png" alt="CRUDWorks Logo" class="h-8 w-auto object-contain sm:hidden" />
                    <div>
                        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">FAKTUR TAGIHAN RESMI</div>
                        <h1 class="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">${inv.nomor_invoice}</h1>
                        <div class="text-xs text-slate-500 mt-1">Tanggal Faktur: <b class="font-mono text-slate-700 dark:text-slate-300">${App.formatDate(inv.tanggal_invoice)}</b></div>
                    </div>
                </div>
                <div class="text-left sm:text-right">
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">STATUS PEMBAYARAN</div>
                    <div class="mt-1">
                        ${isLunas ? `
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 rounded-xl font-bold text-xs">
                                <i class="ri-checkbox-circle-line"></i> LUNAS TERBAYAR
                            </span>
                        ` : isPendingVerify ? `
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950/60 rounded-xl font-bold text-xs">
                                <i class="ri-time-line"></i> BUKTI TRANSFER MENUNGGU VERIFIKASI KASIR
                            </span>
                        ` : `
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 dark:bg-rose-950/60 rounded-xl font-bold text-xs">
                                <i class="ri-error-warning-line"></i> BELUM LUNAS (Jatuh Tempo: ${App.formatDate(inv.tanggal_jatuh_tempo)})
                            </span>
                        `}
                    </div>
                </div>
            </div>

            <!-- Client & Project Info -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700">
                <div>
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Ditagihkan Kepada:</div>
                    <div class="text-sm font-extrabold text-slate-900 dark:text-white">${inv.nama_perusahaan}</div>
                    <div class="text-slate-600 dark:text-slate-400 mt-0.5">UP: ${inv.penanggung_jawab || '-'}</div>
                    <div class="text-slate-500 mt-0.5">${inv.client_alamat || '-'} ${inv.client_kota ? `· ${inv.client_kota}` : ''}</div>
                    <div class="text-slate-500 mt-0.5">Email: ${inv.client_email || '-'} · Telp: ${inv.client_telepon || '-'}</div>
                </div>
                <div class="space-y-1 sm:text-right">
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Rincian Proyek & NPWP:</div>
                    ${inv.nama_project ? `<div class="font-bold text-primary-600 text-xs">Proyek: ${inv.nama_project}</div>` : ''}
                    ${inv.client_npwp ? `<div class="font-mono text-slate-500">NPWP Klien: ${inv.client_npwp}</div>` : ''}
                    <div class="text-slate-400 text-[11px] mt-2">Batas Akhir Pelunasan: <b class="text-rose-600">${App.formatDate(inv.tanggal_jatuh_tempo)}</b></div>
                </div>
            </div>

            <!-- Line Items Table -->
            <div class="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <table class="w-full text-xs text-left">
                    <thead class="bg-slate-100 dark:bg-slate-800 font-mono text-[10px] uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th class="py-3 px-4">Deskripsi Layanan / Item</th>
                            <th class="py-3 px-2 text-center w-20">Qty</th>
                            <th class="py-3 px-2 w-24">Satuan</th>
                            <th class="py-3 px-4 text-right w-36">Harga Satuan (Rp)</th>
                            <th class="py-3 px-4 text-right w-36">Total (Rp)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        ${(inv.items || []).map(it => `
                            <tr>
                                <td class="py-3 px-4 font-bold text-slate-900 dark:text-white">${it.deskripsi}</td>
                                <td class="py-3 px-2 text-center font-mono">${it.kuantitas}</td>
                                <td class="py-3 px-2 text-slate-500">${it.satuan || 'unit'}</td>
                                <td class="py-3 px-4 text-right font-mono">${App.formatIDR(it.harga_satuan)}</td>
                                <td class="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">${App.formatIDR(it.total_harga)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Totals & Sisa Kewajiban -->
            <div class="flex justify-end">
                <div class="w-full sm:w-80 space-y-2 text-xs font-semibold p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700">
                    <div class="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Subtotal:</span>
                        <span class="font-mono">${App.formatIDR(inv.subtotal)}</span>
                    </div>
                    ${Number(inv.diskon_nilai) > 0 ? `
                        <div class="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Diskon:</span>
                            <span class="font-mono text-emerald-600">-${App.formatIDR(inv.diskon_nilai)}</span>
                        </div>
                    ` : ''}
                    <div class="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>PPN (${inv.pajak_persen}%):</span>
                        <span class="font-mono">${App.formatIDR(inv.pajak_nominal)}</span>
                    </div>
                    <div class="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-black text-slate-900 dark:text-white">
                        <span>Total Tagihan:</span>
                        <span class="font-mono text-primary-600">${App.formatIDR(inv.total_tagihan)}</span>
                    </div>
                    ${Number(inv.total_dibayar) > 0 ? `
                        <div class="flex justify-between text-emerald-600 font-bold">
                            <span>Telah Dibayar:</span>
                            <span class="font-mono">${App.formatIDR(inv.total_dibayar)}</span>
                        </div>
                    ` : ''}
                    <div class="pt-1.5 border-t border-slate-300 dark:border-slate-600 flex justify-between text-sm font-black ${isLunas ? 'text-emerald-600' : 'text-rose-600'}">
                        <span>Sisa Kewajiban:</span>
                        <span class="font-mono">${App.formatIDR(inv.sisa_tagihan)}</span>
                    </div>
                </div>
            </div>

            <!-- Official Bank Transfer Instructions -->
            <div class="p-5 bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                    <div class="text-xs font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                        <i class="ri-bank-card-line text-base text-sky-600"></i> Rekening Resmi Tujuan Transfer
                    </div>
                    <span class="text-[10px] text-sky-700 dark:text-sky-400">Mohon sertakan no. faktur pada berita transfer</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    ${bankList.map(b => `
                        <div class="p-3 bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl flex items-center justify-between shadow-2xs">
                            <div>
                                <div class="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>${b.nama_bank || b.nama_metode}</span>
                                    ${b.is_default ? '<span class="text-[9px] bg-primary-100 text-primary-700 px-1.5 py-0.2 rounded font-bold">UTAMA</span>' : ''}
                                </div>
                                <div class="text-[11px] font-mono font-bold text-primary-600 mt-0.5">${b.nomor_rekening || '-'}</div>
                                <div class="text-[10px] text-slate-400">a.n ${b.atas_nama || '-'}</div>
                            </div>
                            ${b.nomor_rekening ? `
                                <button type="button" onclick="navigator.clipboard.writeText('${b.nomor_rekening}'); App.toast('Nomor rekening disalin!', 'success');"
                                        class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                                    <i class="ri-file-copy-line"></i> Salin
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>

            ${!isLunas ? `
                <!-- Online Payment Gateway (QRIS / Virtual Account) -->
                <div class="bg-indigo-50/70 dark:bg-indigo-950/20 rounded-3xl border border-indigo-200 dark:border-indigo-900/60 p-6 sm:p-8 space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-200/70 dark:border-indigo-900/60">
                        <div>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <i class="ri-qr-code-line text-indigo-600 text-base"></i> Pembayaran Online Instan (QRIS &amp; Virtual Account)
                            </h3>
                            <p class="text-xs text-slate-500 mt-0.5">Faktur otomatis terverifikasi lunas seketika setelah pembayaran berhasil.</p>
                        </div>
                        <span class="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 text-[10px] font-bold uppercase self-start">Otomatis</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <select id="pg-channel-select" class="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                            <option value="qris">QRIS (Semua E-Wallet &amp; Mobile Banking)</option>
                            <option value="va_bca">BCA Virtual Account</option>
                            <option value="va_mandiri">Mandiri Virtual Account</option>
                            <option value="ewallet">E-Wallet Instan</option>
                        </select>
                        <button type="button" id="btn-pg-pay-now" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm transition">
                            <i class="ri-secure-payment-line"></i><span>Bayar Online Sekarang</span>
                        </button>
                    </div>
                    <div id="pg-checkout-box" class="hidden"></div>
                </div>

                <!-- Upload Proof of Payment Box (Only if not fully paid) -->
                <div class="p-6 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 rounded-3xl space-y-4">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                        <div>
                            <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <i class="ri-upload-cloud-2-line text-emerald-600 text-base"></i> Konfirmasi &amp; Unggah Bukti Transfer
                            </h3>
                            <p class="text-xs text-slate-500 mt-0.5">Sudah melakukan transfer? Unggah foto/berkas bukti pembayaran Anda untuk verifikasi kasir.</p>
                        </div>
                    </div>

                    ${inv.bukti_transfer ? `
                        <div class="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0">
                                    <i class="ri-checkbox-circle-line"></i>
                                </div>
                                <div>
                                    <div class="text-xs font-bold text-emerald-900 dark:text-emerald-200">Bukti Transfer Berhasil Terkirim</div>
                                    <div class="text-[11px] text-emerald-700 dark:text-emerald-400">Diunggah: ${App.formatDateTime(inv.bukti_transfer_at)} — Status: <strong class="uppercase">${inv.payment_verification_status}</strong></div>
                                </div>
                            </div>
                            <a href="${inv.bukti_transfer}" target="_blank" class="px-3 py-1.5 bg-white dark:bg-slate-900 text-emerald-700 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold inline-flex items-center gap-1">
                                <i class="ri-eye-line"></i> Lihat Bukti
                            </a>
                        </div>
                    ` : ''}

                    <form id="public-upload-proof-form" class="space-y-3 pt-1">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Pilih Berkas Bukti Transfer (JPG, PNG, PDF)</label>
                            <input type="file" id="public-proof-file" required accept="image/*,application/pdf"
                                   class="w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Catatan Tambahan (Bank Pengirim / Nama Pemilik Rekening)</label>
                            <input type="text" id="public-proof-notes" placeholder="Contoh: Transfer dari Rekening BCA a.n Hendra Pratama"
                                   class="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                        </div>
                        <div class="pt-2 flex justify-end">
                            <button type="submit" id="btn-submit-proof" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm shadow-emerald-500/20">
                                <i class="ri-send-plane-fill"></i> Kirim Konfirmasi Pembayaran
                            </button>
                        </div>
                    </form>
                </div>
            ` : ''}
        </div>
    `;

    // Copy Portal Link binding
    document.getElementById('btn-pub-copy-link')?.addEventListener('click', () => {
        const baseUrl = window.location.href.split('#')[0];
        const url = `${baseUrl}#/public-invoice?token=${inv.public_token}`;
        navigator.clipboard.writeText(url).then(() => {
            App.toast('Tautan portal tagihan publik berhasil disalin!', 'success');
        });
    });

    // Preview PDF binding
    document.getElementById('btn-pub-preview-pdf')?.addEventListener('click', async () => {
        try {
            const pdfRes = await App.generateInvoicePdf(inv, 'bloburl');
            if (pdfRes?.blobUrl) {
                App.openPdfModal({
                    title: `Faktur Tagihan — ${inv.nomor_invoice}`,
                    filename: pdfRes.filename,
                    blobUrl: pdfRes.blobUrl
                });
            }
        } catch (err) {
            App.toast('Gagal menampilkan pratinjau PDF', 'error');
        }
    });

    // Download PDF binding
    document.getElementById('btn-pub-download-pdf')?.addEventListener('click', async () => {
        try {
            await App.generateInvoicePdf(inv, 'download');
            App.toast('Dokumen PDF faktur berhasil diunduh', 'success');
        } catch (err) {
            App.toast('Gagal mengunduh dokumen PDF', 'error');
        }
    });

    // Online Payment Gateway Checkout
    document.getElementById('btn-pg-pay-now')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-pg-pay-now');
        const channel = document.getElementById('pg-channel-select')?.value || 'qris';
        const box = document.getElementById('pg-checkout-box');
        if (!box) return;

        App.btnLoading(btn, true, 'Membuat Kode Bayar...');
        const res = await App.api('payment-gateway/create', {
            method: 'POST',
            body: { token: inv.public_token || token, channel }
        });
        App.btnLoading(btn, false);

        if (!res?.success || !res.data) return;
        const tx = res.data;
        box.classList.remove('hidden');
        box.innerHTML = `
            <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span class="font-mono font-bold text-slate-700 dark:text-slate-200">Order: ${App.escapeHtml(tx.order_id)}</span>
                    <span class="font-mono font-extrabold text-indigo-600">${App.formatIDR(tx.amount)}</span>
                </div>
                ${tx.va_number ? `
                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between gap-2">
                        <div>
                            <div class="text-[10px] uppercase font-bold text-slate-400">Nomor Virtual Account</div>
                            <div class="text-base font-mono font-black text-slate-900 dark:text-white tracking-wider">${App.escapeHtml(tx.va_number)}</div>
                        </div>
                        <button type="button" onclick="navigator.clipboard.writeText('${App.escapeHtml(tx.va_number)}');App.toast('Nomor VA disalin','success')" class="px-3 py-1.5 rounded-lg bg-slate-200/70 dark:bg-slate-700 text-xs font-semibold">Salin</button>
                    </div>
                ` : ''}
                ${tx.qr_string ? `
                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex flex-col sm:flex-row items-center gap-3">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(tx.qr_string)}" alt="QRIS" width="128" height="128" class="w-32 h-32 rounded-xl border border-slate-200 bg-white p-1 shrink-0">
                        <div class="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                            <div class="font-bold">Scan QRIS di atas dengan aplikasi pembayaran Anda</div>
                            <div class="text-[11px] text-slate-400">Mode saat ini: <b class="uppercase">${App.escapeHtml(tx.provider)}</b></div>
                        </div>
                    </div>
                ` : ''}
                ${tx.provider === 'sandbox' ? `
                    <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                        <span class="text-[11px] text-amber-600 dark:text-amber-400"><i class="ri-flask-line"></i> Mode Sandbox aktif — uji pelunasan otomatis via webhook:</span>
                        <button type="button" id="btn-pg-sim-pay" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition">
                            Simulasikan Pembayaran Sukses
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        document.getElementById('btn-pg-sim-pay')?.addEventListener('click', async () => {
            const simBtn = document.getElementById('btn-pg-sim-pay');
            App.btnLoading(simBtn, true, 'Memproses...');
            const simRes = await App.api('payment-gateway/simulate-pay', {
                method: 'POST',
                body: { order_id: tx.order_id }
            });
            App.btnLoading(simBtn, false);
            if (simRes?.success) {
                App.toast(simRes.message, 'success');
                await loadPublicInvoice(inv.public_token || token);
            }
        });
    });

    // Upload proof form handler
    document.getElementById('public-upload-proof-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('public-proof-file');
        const notesInput = document.getElementById('public-proof-notes');
        const submitBtn = document.getElementById('btn-submit-proof');

        if (!fileInput.files || !fileInput.files[0]) {
            App.toast('Silakan pilih berkas foto atau bukti transfer terlebih dahulu', 'warning');
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        App.btnLoading(submitBtn, true, 'Mengunggah Bukti...');
        reader.onload = async () => {
            try {
                const res = await App.api(`public-invoice?token=${encodeURIComponent(inv.public_token || token)}`, {
                    method: 'POST',
                    body: {
                        bukti_transfer_base64: reader.result,
                        catatan: notesInput?.value.trim() || ''
                    }
                });

                if (res && res.success) {
                    App.toast(res.message, 'success');
                    await loadPublicInvoice(inv.public_token || token);
                }
            } finally {
                App.btnLoading(submitBtn, false);
            }
        };
        reader.readAsDataURL(file);
    });
}

export default { init };
