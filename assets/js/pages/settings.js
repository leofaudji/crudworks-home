// assets/js/pages/settings.js
import { App } from '../app.js';

let activeSection = 'company';
let paymentMethods = [];

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn max-w-4xl">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Pengaturan Sistem</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Kelola identitas instansi, konfigurasi penagihan, dan rekening bank.</p>
                </div>
            </div>

            <!-- Settings Nav Tabs -->
            <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button class="set-tab px-4 py-2 rounded-xl font-bold text-xs transition ${activeSection === 'company' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-sec="company">
                    <i class="ri-building-line mr-1"></i> Profil Instansi
                </button>
                <button class="set-tab px-4 py-2 rounded-xl font-bold text-xs transition ${activeSection === 'invoice' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-sec="invoice">
                    <i class="ri-file-settings-line mr-1"></i> Format Penagihan
                </button>
                <button class="set-tab px-4 py-2 rounded-xl font-bold text-xs transition ${activeSection === 'payment-methods' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-sec="payment-methods">
                    <i class="ri-bank-card-line mr-1"></i> Rekening Bank Penerima
                </button>
                <button class="set-tab px-4 py-2 rounded-xl font-bold text-xs transition ${activeSection === 'wa-templates' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}" data-sec="wa-templates">
                    <i class="ri-whatsapp-line mr-1"></i> Template WhatsApp
                </button>
            </div>

            <!-- Content Card -->
            <div id="settings-body" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
                <!-- Injected dynamically -->
            </div>
        </div>

        <!-- Add Payment Method Modal -->
        <div id="pm-modal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 animate-fadeIn">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                    <h3 class="text-base font-bold text-slate-900 dark:text-white">Tambah / Edit Rekening Bank</h3>
                    <button onclick="document.getElementById('pm-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                        <i class="ri-close-line text-xl"></i>
                    </button>
                </div>
                <form id="pm-form" class="space-y-3.5">
                    <input type="hidden" id="form-pm-id" value="">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Nama Bank / Metode *</label>
                        <input type="text" id="form-pm-nama" required placeholder="Contoh: Bank Central Asia (BCA)"
                               class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Nomor Rekening *</label>
                        <input type="text" id="form-pm-norek" required placeholder="8720192831"
                               class="w-full px-3.5 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Atas Nama (Pemilik) *</label>
                        <input type="text" id="form-pm-an" required placeholder="PT CRUDWorks Solution"
                               class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Status</label>
                        <select id="form-pm-status" class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                            <option value="aktif">Aktif</option>
                            <option value="nonaktif">Nonaktif</option>
                        </select>
                    </div>
                    <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                        <button type="button" onclick="document.getElementById('pm-modal').classList.add('hidden')" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-xl">Batal</button>
                        <button type="submit" class="px-4 py-2 bg-primary-600 text-white text-xs font-semibold rounded-xl">Simpan</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.querySelectorAll('.set-tab').forEach(b => {
        b.addEventListener('click', () => {
            document.querySelectorAll('.set-tab').forEach(x => {
                x.className = 'set-tab px-4 py-2 rounded-xl font-bold text-xs transition text-slate-500 hover:text-slate-900 dark:hover:text-white';
            });
            b.className = 'set-tab px-4 py-2 rounded-xl font-bold text-xs transition bg-primary-600 text-white shadow-sm';
            activeSection = b.getAttribute('data-sec');
            renderSection();
        });
    });

    const pmForm = document.getElementById('pm-form');
    if (pmForm) pmForm.addEventListener('submit', handleSavePaymentMethod);
    renderSection();
}

async function renderSection() {
    const cont = document.getElementById('settings-body');
    if (!cont) return;
    const res = await App.api('settings');
    const s = (res && res.success) ? res.data : {};

    if (activeSection === 'company') {
        cont.innerHTML = `
            <form id="company-form" class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Nama Instansi / Perusahaan *</label>
                        <input type="text" name="company_name" required value="${s.company_name || ''}"
                               class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Tagline Resmi</label>
                        <input type="text" name="company_tagline" value="${s.company_tagline || ''}"
                               class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Email Billing / Keuangan</label>
                        <input type="email" name="company_email" value="${s.company_email || ''}"
                               class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Nomor Telepon Kantor</label>
                        <input type="text" name="company_phone" value="${s.company_phone || ''}"
                               class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Alamat Kantor Resmi</label>
                        <textarea name="company_address" rows="3"
                                  class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm">${s.company_address || ''}</textarea>
                    </div>
                </div>
                <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button type="submit" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md">Simpan Perubahan</button>
                </div>
            </form>
        `;
        const compForm = document.getElementById('company-form');
        if (compForm) compForm.addEventListener('submit', (e) => saveGenericSettings(e, 'company-form'));
    }

    if (activeSection === 'invoice') {
        cont.innerHTML = `
            <form id="invoice-settings-form" class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Jangka Waktu Jatuh Tempo Standar (Hari)</label>
                        <input type="number" name="invoice_due_days" min="1" value="${s.invoice_due_days || '14'}"
                               class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Tarif PPN Standar (%)</label>
                        <input type="number" name="invoice_tax_percent" min="0" step="any" value="${s.invoice_tax_percent !== undefined && s.invoice_tax_percent !== null ? s.invoice_tax_percent : '0'}"
                               class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Catatan Formal Kaki Faktur (Footer Notes)</label>
                        <textarea name="invoice_footer_notes" rows="3"
                                  class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm">${s.invoice_footer_notes || ''}</textarea>
                    </div>
                </div>
                <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button type="submit" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md">Simpan Pengaturan</button>
                </div>
            </form>
        `;
        const invForm = document.getElementById('invoice-settings-form');
        if (invForm) invForm.addEventListener('submit', (e) => saveGenericSettings(e, 'invoice-settings-form'));
    }

    if (activeSection === 'payment-methods') {
        const pmRes = await App.api('settings/payment-methods');
        paymentMethods = (pmRes && pmRes.success) ? pmRes.data : [];

        cont.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span class="text-xs font-bold text-slate-500 uppercase">Daftar Rekening Bank Resmi</span>
                    <button onclick="window.openAddPaymentMethodModal()" class="px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1">
                        <i class="ri-add-line"></i> Tambah Rekening
                    </button>
                </div>
                <div class="divide-y divide-slate-100 dark:divide-slate-800">
                    ${paymentMethods.map(pm => `
                        <div class="py-3.5 flex items-center justify-between">
                            <div>
                                <div class="font-bold text-sm text-slate-900 dark:text-white">${pm.nama_metode}</div>
                                <div class="text-xs text-slate-500 font-mono">Rekening: <b>${pm.nomor_rekening}</b> a.n ${pm.atas_nama}</div>
                            </div>
                            <div class="flex items-center gap-3">
                                ${App.renderStatusBadge(pm.status, 'payment_method')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    if (activeSection === 'wa-templates') {
        cont.innerHTML = `
            <form id="wa-templates-form" class="space-y-6">
                <div>
                    <h2 class="text-base font-bold text-slate-900 dark:text-white">Format & Template Pesan WhatsApp</h2>
                    <p class="text-xs text-slate-500">Gunakan tag variabel dinamis seperti <code class="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-primary-600 rounded font-mono">{nama_pic}</code>, <code class="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-primary-600 rounded font-mono">{nomor_invoice}</code>, dll.</p>
                </div>

                <!-- Template 1: Invoice Reminder -->
                <div class="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">1. Pesan Penagihan / Pengingat Faktur</label>
                        <span class="text-[10px] text-slate-400 font-mono">wa_template_invoice</span>
                    </div>
                    <div class="flex flex-wrap gap-1 text-[11px] text-slate-500 mb-1">
                        Variabel: 
                        <button type="button" onclick="window.insertWaVar('wa_template_invoice', '{nama_pic}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{nama_pic}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_invoice', '{nama_perusahaan}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{nama_perusahaan}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_invoice', '{nomor_invoice}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{nomor_invoice}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_invoice', '{nama_proyek}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{nama_proyek}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_invoice', '{total_tagihan}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{total_tagihan}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_invoice', '{jatuh_tempo}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{jatuh_tempo}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_invoice', '{info_bank}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{info_bank}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_invoice', '{tautan_faktur}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{tautan_faktur}</button>
                    </div>
                    <textarea id="field-wa_template_invoice" name="wa_template_invoice" rows="6"
                              class="w-full p-3 font-mono text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed">${s.wa_template_invoice || ''}</textarea>
                </div>

                <!-- Template 2: Quotation -->
                <div class="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">2. Pesan Pengiriman Surat Penawaran</label>
                        <span class="text-[10px] text-slate-400 font-mono">wa_template_quotation</span>
                    </div>
                    <div class="flex flex-wrap gap-1 text-[11px] text-slate-500 mb-1">
                        Variabel: 
                        <button type="button" onclick="window.insertWaVar('wa_template_quotation', '{nama_pic}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{nama_pic}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_quotation', '{nama_perusahaan}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{nama_perusahaan}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_quotation', '{nomor_penawaran}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{nomor_penawaran}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_quotation', '{nama_proyek}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{nama_proyek}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_quotation', '{total_penawaran}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{total_penawaran}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_quotation', '{berlaku_hingga}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{berlaku_hingga}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_quotation', '{tautan_penawaran}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{tautan_penawaran}</button>
                    </div>
                    <textarea id="field-wa_template_quotation" name="wa_template_quotation" rows="6"
                              class="w-full p-3 font-mono text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed">${s.wa_template_quotation || ''}</textarea>
                </div>

                <!-- Template 3: Payment Receipt -->
                <div class="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">3. Pesan Kuitansi Pelunasan Tagihan</label>
                        <span class="text-[10px] text-slate-400 font-mono">wa_template_receipt</span>
                    </div>
                    <div class="flex flex-wrap gap-1 text-[11px] text-slate-500 mb-1">
                        Variabel: 
                        <button type="button" onclick="window.insertWaVar('wa_template_receipt', '{nama_pic}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{nama_pic}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_receipt', '{nomor_invoice}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{nomor_invoice}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_receipt', '{nomor_kuitansi}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{nomor_kuitansi}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_receipt', '{nominal_bayar}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{nominal_bayar}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_receipt', '{tanggal_bayar}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{tanggal_bayar}</button>
                        <button type="button" onclick="window.insertWaVar('wa_template_receipt', '{tautan_kuitansi}')" class="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded hover:text-primary-600 font-mono text-[10px]">{tautan_kuitansi}</button>
                    </div>
                    <textarea id="field-wa_template_receipt" name="wa_template_receipt" rows="6"
                              class="w-full p-3 font-mono text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed">${s.wa_template_receipt || ''}</textarea>
                </div>

                <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button type="submit" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md">Simpan Seluruh Template</button>
                </div>
            </form>
        `;
        const waForm = document.getElementById('wa-templates-form');
        if (waForm) waForm.addEventListener('submit', (e) => saveGenericSettings(e, 'wa-templates-form'));
    }
}

async function saveGenericSettings(e, formId) {
    e.preventDefault();
    const form = document.getElementById(formId);
    const formData = new FormData(form);
    const settings = {};
    for (let [k, v] of formData.entries()) {
        settings[k] = v.trim();
    }

    const res = await App.api('settings', { method: 'POST', body: { settings } });
    if (res && res.success) {
        App.toast(res.message, 'success');
        if (window.App) {
            window.App.settings = Object.assign(window.App.settings || {}, settings);
        }
    }
}

window.openAddPaymentMethodModal = () => {
    document.getElementById('pm-form').reset();
    document.getElementById('form-pm-id').value = '';
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
};

async function handleSavePaymentMethod(e) {
    e.preventDefault();
    const body = {
        id: document.getElementById('form-pm-id').value || null,
        nama_metode: document.getElementById('form-pm-nama').value.trim(),
        nomor_rekening: document.getElementById('form-pm-norek').value.trim(),
        atas_nama: document.getElementById('form-pm-an').value.trim(),
        status: document.getElementById('form-pm-status').value
    };

    const res = await App.api('settings/payment-methods', { method: 'POST', body });
    if (res && res.success) {
        App.toast(res.message, 'success');
        document.getElementById('pm-modal').classList.add('hidden');
        renderSection();
    }
}
