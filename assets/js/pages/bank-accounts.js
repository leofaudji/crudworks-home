// bank-accounts.js - Master Rekening Bank Resmi Perusahaan

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                        <span class="w-10 h-10 rounded-2xl bg-primary-500/10 text-primary-600 flex items-center justify-center text-xl">
                            <i class="ri-bank-card-line"></i>
                        </span>
                        <span>Rekening Bank Resmi</span>
                    </h1>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Daftar rekening bank perusahaan untuk instruksi pembayaran resmi pelanggan pada faktur tagihan dan kuitansi.
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <button id="btn-open-reconcile" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-sm transition">
                        <i class="ri-exchange-funds-line text-sm"></i>
                        <span>Rekonsiliasi Mutasi</span>
                    </button>
                    <button id="btn-add-bank" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-sm transition">
                        <i class="ri-add-line text-sm"></i>
                        <span>Tambah Rekening</span>
                    </button>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4" id="bank-kpi-container">
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
                    <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Rekening Aktif</div>
                    <div id="kpi-bank-total" class="text-2xl font-black text-slate-900 dark:text-white font-mono">-</div>
                    <div class="text-[11px] text-slate-400 mt-1">Siap tampil di faktur tagihan</div>
                </div>
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
                    <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Rekening Utama (Default)</div>
                    <div id="kpi-bank-default" class="text-base font-bold text-primary-600 truncate mt-1.5">-</div>
                    <div id="kpi-bank-default-no" class="text-[11px] text-slate-400 font-mono mt-0.5">-</div>
                </div>
                <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
                    <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Mutasi Pembayaran</div>
                    <div id="kpi-bank-trx" class="text-2xl font-black text-emerald-600 font-mono">-</div>
                    <div class="text-[11px] text-slate-400 mt-1">Transaksi pelunasan tercatat</div>
                </div>
            </div>

            <!-- Filter & Search Toolbar -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div class="relative flex-1 min-w-[240px]">
                    <input type="text" id="bank-search" placeholder="Cari nama bank, nomor rekening, atau nama penerima..."
                           class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <i class="ri-search-line absolute left-3.5 top-3 text-slate-400 text-sm"></i>
                </div>
                <div class="flex items-center gap-2">
                    <select id="bank-filter-status" class="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <option value="">Semua Status</option>
                        <option value="aktif" selected>Hanya Aktif</option>
                        <option value="nonaktif">Nonaktif</option>
                    </select>
                </div>
            </div>

            <!-- Table Card -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th class="py-3.5 px-6">Bank &amp; Jenis</th>
                                <th class="py-3.5 px-6">Nomor Rekening</th>
                                <th class="py-3.5 px-6">Atas Nama &amp; Cabang</th>
                                <th class="py-3.5 px-6">Kode &amp; SWIFT</th>
                                <th class="py-3.5 px-6 text-center">Riwayat Transaksi</th>
                                <th class="py-3.5 px-6">Status</th>
                                <th class="py-3.5 px-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="bank-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr>
                                <td colspan="7" class="py-12 text-center text-slate-400">
                                    <i class="ri-loader-4-line text-2xl animate-spin mb-2 inline-block"></i>
                                    <div>Memuat data rekening bank resmi...</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Bank Account Form Modal -->
        <div id="bank-modal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-fadeIn max-h-[92vh] overflow-y-auto">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                    <h3 id="bank-modal-title" class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-bank-line text-primary-600"></i>
                        <span>Tambah Rekening Bank</span>
                    </h3>
                    <button id="btn-close-bank-modal" class="text-slate-400 hover:text-slate-600">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <form id="bank-form" class="space-y-4">
                    <input type="hidden" id="form-bank-id" value="">

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Nama Bank / Institusi *</label>
                            <input type="text" id="form-bank-nama" required placeholder="Contoh: BCA / Bank Mandiri"
                                   list="bank-suggestions"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <datalist id="bank-suggestions">
                                <option value="BCA">Bank Central Asia</option>
                                <option value="Bank Mandiri">Bank Mandiri</option>
                                <option value="BNI">Bank Negara Indonesia</option>
                                <option value="BRI">Bank Rakyat Indonesia</option>
                                <option value="BSI">Bank Syariah Indonesia</option>
                                <option value="CIMB Niaga">Bank CIMB Niaga</option>
                                <option value="Permata Bank">Permata Bank</option>
                                <option value="Bank Danamon">Bank Danamon</option>
                            </datalist>
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Tipe Akun</label>
                            <select id="form-bank-tipe" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="bank">Rekening Bank</option>
                                <option value="ewallet">E-Wallet / QRIS</option>
                                <option value="tunai">Kas Tunai Kantor</option>
                            </select>
                        </div>

                        <div class="sm:col-span-2">
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Nomor Rekening / Virtual Account *</label>
                            <input type="text" id="form-bank-rekening" required placeholder="Contoh: 8720192831"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div class="sm:col-span-2">
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Atas Nama Rekening (Beneficiary Name) *</label>
                            <input type="text" id="form-bank-atas-nama" required placeholder="Contoh: PT CRUDWorks Media Tama"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Kantor Cabang</label>
                            <input type="text" id="form-bank-cabang" placeholder="Contoh: KCU Sudirman Jakarta"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Kode Bank / Kliring</label>
                            <input type="text" id="form-bank-kode" placeholder="Contoh: 014"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">SWIFT / BIC Code</label>
                            <input type="text" id="form-bank-swift" placeholder="Contoh: CENAIDJA"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Status Rekening</label>
                            <select id="form-bank-status" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="aktif">Aktif</option>
                                <option value="nonaktif">Nonaktif</option>
                            </select>
                        </div>

                        <div class="sm:col-span-2">
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Instruksi Transfer untuk Klien</label>
                            <textarea id="form-bank-instruksi" rows="2" placeholder="Contoh: Mohon sertakan nomor invoice pada berita transfer saat melakukan pembayaran..."
                                      class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"></textarea>
                        </div>

                        <div class="sm:col-span-2">
                            <label class="flex items-center gap-2.5 cursor-pointer p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                                <input type="checkbox" id="form-bank-default" class="w-4 h-4 rounded text-primary-600 focus:ring-primary-500">
                                <div>
                                    <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Tetapkan Sebagai Rekening Utama (Default)</div>
                                    <div class="text-[11px] text-slate-400">Rekening ini otomatis dicantumkan di lembar faktur tagihan pelanggan.</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                        <button type="button" id="btn-cancel-bank-modal" class="px-5 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition">
                            Batal
                        </button>
                        <button type="submit" id="btn-save-bank" class="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl text-sm shadow-sm transition">
                            Simpan Rekening
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    let allBanks = [];

    async function loadBankAccounts() {
        const tbody = document.getElementById('bank-tbody');
        const q = (document.getElementById('bank-search')?.value || '').trim();
        const statusFilter = document.getElementById('bank-filter-status')?.value || '';

        let url = 'bank-accounts';
        const params = [];
        if (q) params.push(`search=${encodeURIComponent(q)}`);
        if (statusFilter) params.push(`status=${encodeURIComponent(statusFilter)}`);
        if (params.length) url += `?${params.join('&')}`;

        const res = await App.api(url);
        if (!res || !res.success) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-rose-500">Gagal memuat daftar rekening bank.</td></tr>`;
            return;
        }

        allBanks = res.data || [];

        // Update KPIs
        const activeCount = allBanks.filter(b => b.status === 'aktif').length;
        const defaultBank = allBanks.find(b => Number(b.is_default) === 1);
        const totalTrx = allBanks.reduce((acc, b) => acc + Number(b.total_transaksi || 0), 0);

        document.getElementById('kpi-bank-total').textContent = `${activeCount} Bank`;
        if (defaultBank) {
            document.getElementById('kpi-bank-default').textContent = defaultBank.nama_bank;
            document.getElementById('kpi-bank-default-no').textContent = `${defaultBank.nomor_rekening} a.n ${defaultBank.atas_nama}`;
        } else {
            document.getElementById('kpi-bank-default').textContent = 'Belum Ada';
            document.getElementById('kpi-bank-default-no').textContent = 'Pilih salah satu sebagai default';
        }
        document.getElementById('kpi-bank-trx').textContent = `${totalTrx} Kali`;

        if (allBanks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="py-12 text-center text-slate-400">
                        <i class="ri-bank-card-line text-4xl block mb-2 opacity-40"></i>
                        <div>Belum ada rekening bank resmi yang didaftarkan.</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = allBanks.map(b => {
            const isDef = Number(b.is_default) === 1;
            const isAktif = b.status === 'aktif';
            const iconBank = b.tipe === 'tunai' ? 'ri-money-dollar-box-line' : (b.tipe === 'ewallet' ? 'ri-qr-code-line' : 'ri-bank-line');

            return `
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td class="py-4 px-6">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-xl ${isDef ? 'bg-primary-500/10 text-primary-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'} flex items-center justify-center text-lg shrink-0">
                                <i class="${iconBank}"></i>
                            </div>
                            <div>
                                <div class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>${App.escapeHtml(b.nama_bank)}</span>
                                    ${isDef ? '<span class="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-400 rounded-full">Utama</span>' : ''}
                                </div>
                                <div class="text-[11px] text-slate-400">${App.escapeHtml(b.nama_metode)}</div>
                            </div>
                        </div>
                    </td>
                    <td class="py-4 px-6 font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                        <div class="flex items-center gap-2">
                            <span>${App.escapeHtml(b.nomor_rekening || '-')}</span>
                            ${b.nomor_rekening && b.nomor_rekening !== '-' ? `
                                <button type="button" onclick="navigator.clipboard.writeText('${b.nomor_rekening}'); App.toast('Nomor rekening disalin!', 'success')"
                                        class="text-slate-400 hover:text-primary-600 text-xs" title="Salin nomor rekening">
                                    <i class="ri-file-copy-line"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                    <td class="py-4 px-6">
                        <div class="font-semibold text-slate-800 dark:text-slate-200 text-xs">${App.escapeHtml(b.atas_nama || '-')}</div>
                        <div class="text-[11px] text-slate-400">${App.escapeHtml(b.cabang || '-')}</div>
                    </td>
                    <td class="py-4 px-6 font-mono text-xs">
                        <div class="text-slate-700 dark:text-slate-300">Kode: <span class="font-bold">${App.escapeHtml(b.kode_bank || '-')}</span></div>
                        <div class="text-[11px] text-slate-400">SWIFT: ${App.escapeHtml(b.swift_code || '-')}</div>
                    </td>
                    <td class="py-4 px-6 text-center font-mono text-xs font-bold ${Number(b.total_transaksi) > 0 ? 'text-emerald-600' : 'text-slate-400'}">
                        ${b.total_transaksi || 0} Trx
                    </td>
                    <td class="py-4 px-6">
                        ${App.renderStatusBadge(b.status, 'bank_account')}
                    </td>
                    <td class="py-4 px-6 text-right">
                        <button type="button" onclick="App.toggleTableActionMenu(this, event, [
                            ${!isDef && isAktif ? `{ label: 'Tetapkan Rekening Utama', icon: 'ri-star-line', iconColor: 'text-amber-500', action: 'window.setDefaultBank(${b.id})' },` : ''}
                            { label: 'Ubah Data Rekening', icon: 'ri-edit-line', iconColor: 'text-primary-600', action: 'window.editBank(${b.id})' },
                            { divider: true },
                            { label: 'Hapus / Nonaktifkan', icon: 'ri-delete-bin-line', danger: true, action: 'window.deleteBank(${b.id}, \\'${App.escapeHtml(b.nama_bank)}\\', ${b.total_transaksi || 0})' }
                        ])" class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition" title="Menu Aksi">
                            <span>Aksi</span>
                            <i class="ri-more-2-fill text-slate-400"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        if (typeof App.enhanceTables === 'function') {
            App.enhanceTables(container);
        }
    }

    // Modal Control
    const modal = document.getElementById('bank-modal');
    const form = document.getElementById('bank-form');

    function openModal(bank = null) {
        form.reset();
        if (bank) {
            document.getElementById('bank-modal-title').innerHTML = `<i class="ri-edit-line text-primary-600"></i><span>Ubah Rekening Bank</span>`;
            document.getElementById('form-bank-id').value = bank.id;
            document.getElementById('form-bank-nama').value = bank.nama_bank || bank.nama_metode;
            document.getElementById('form-bank-tipe').value = bank.tipe || 'bank';
            document.getElementById('form-bank-rekening').value = bank.nomor_rekening || '';
            document.getElementById('form-bank-atas-nama').value = bank.atas_nama || '';
            document.getElementById('form-bank-cabang').value = bank.cabang || '';
            document.getElementById('form-bank-kode').value = bank.kode_bank || '';
            document.getElementById('form-bank-swift').value = bank.swift_code || '';
            document.getElementById('form-bank-instruksi').value = bank.instruksi || '';
            document.getElementById('form-bank-status').value = bank.status || 'aktif';
            document.getElementById('form-bank-default').checked = Number(bank.is_default) === 1;
        } else {
            document.getElementById('bank-modal-title').innerHTML = `<i class="ri-bank-line text-primary-600"></i><span>Tambah Rekening Bank</span>`;
            document.getElementById('form-bank-id').value = '';
            document.getElementById('form-bank-tipe').value = 'bank';
            document.getElementById('form-bank-status').value = 'aktif';
            document.getElementById('form-bank-default').checked = false;
        }
        modal.classList.remove('hidden');
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    document.getElementById('btn-add-bank')?.addEventListener('click', () => openModal(null));
    document.getElementById('btn-open-reconcile')?.addEventListener('click', () => openReconcileModal());
    document.getElementById('btn-close-bank-modal')?.addEventListener('click', closeModal);
    document.getElementById('btn-cancel-bank-modal')?.addEventListener('click', closeModal);

    // Save Bank Account
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bankId = document.getElementById('form-bank-id').value;
        const namaBank = document.getElementById('form-bank-nama').value.trim();
        const tipe = document.getElementById('form-bank-tipe').value;
        const nomorRekening = document.getElementById('form-bank-rekening').value.trim();
        const atasNama = document.getElementById('form-bank-atas-nama').value.trim();
        const cabang = document.getElementById('form-bank-cabang').value.trim();
        const kodeBank = document.getElementById('form-bank-kode').value.trim();
        const swiftCode = document.getElementById('form-bank-swift').value.trim();
        const instruksi = document.getElementById('form-bank-instruksi').value.trim();
        const status = document.getElementById('form-bank-status').value;
        const isDefault = document.getElementById('form-bank-default').checked ? 1 : 0;

        const payload = {
            nama_metode: namaBank + (nomorRekening ? ' - ' + nomorRekening : ''),
            nama_bank: namaBank,
            tipe,
            nomor_rekening: nomorRekening,
            atas_nama: atasNama,
            cabang,
            kode_bank: kodeBank,
            swift_code: swiftCode,
            instruksi,
            status,
            is_default: isDefault
        };

        const saveBtn = document.getElementById('btn-save-bank');
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="ri-loader-4-line animate-spin"></i> Menyimpan...`;

        try {
            const res = bankId 
                ? await App.api(`bank-accounts/${bankId}`, { method: 'PUT', body: payload })
                : await App.api('bank-accounts', { method: 'POST', body: payload });

            if (res && res.success) {
                App.toast(res.message || 'Rekening bank berhasil disimpan', 'success');
                closeModal();
                loadBankAccounts();
            } else {
                App.toast(res?.message || 'Gagal menyimpan rekening bank', 'error');
            }
        } catch (err) {
            App.toast(err.message || 'Terjadi kesalahan sistem', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `Simpan Rekening`;
        }
    });

    // Window helper functions for inline actions
    window.editBank = (id) => {
        const b = allBanks.find(x => Number(x.id) === Number(id));
        if (b) openModal(b);
    };

    window.setDefaultBank = async (id) => {
        const conf = await App.confirm('Jadikan Rekening Utama?', 'Rekening ini akan otomatis ditampilkan pada lembar faktur tagihan pelanggan.');
        if (!conf) return;

        const res = await App.api(`bank-accounts/${id}/set-default`, { method: 'POST', body: { action: 'set-default' } });
        if (res && res.success) {
            App.toast('Rekening utama berhasil diperbarui', 'success');
            loadBankAccounts();
        } else {
            App.toast(res?.message || 'Gagal mengatur rekening utama', 'error');
        }
    };

    window.deleteBank = async (id, name, trxCount) => {
        const msg = trxCount > 0 
            ? `Rekening "${name}" memiliki ${trxCount} riwayat pembayaran. Rekening ini akan dinonaktifkan agar data pembukuan tetap terjaga.`
            : `Apakah Anda yakin ingin menghapus rekening "${name}" secara permanen?`;

        const conf = await App.confirm('Konfirmasi Hapus Rekening', msg);
        if (!conf) return;

        const res = await App.api(`bank-accounts/${id}`, { method: 'DELETE' });
        if (res && res.success) {
            App.toast(res.message || 'Rekening berhasil diproses', 'success');
            loadBankAccounts();
        } else {
            App.toast(res?.message || 'Gagal menghapus rekening', 'error');
        }
    };

    // Filter listeners
    document.getElementById('bank-search')?.addEventListener('input', App.debounce(loadBankAccounts, 350));
    document.getElementById('bank-filter-status')?.addEventListener('change', loadBankAccounts);

    // Initial load
    await loadBankAccounts();

    async function openReconcileModal() {
        const bankRes = await App.api('bank-accounts?status=aktif');
        const banks = bankRes?.success ? (bankRes.data || []) : [];
        const bankOpts = banks.map(b => `<option value="${b.id}">${App.escapeHtml(b.nama_bank)} (${App.escapeHtml(b.nomor_rekening || '-')})</option>`).join('');

        App.openModal(`
            <div class="p-6 space-y-5">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-exchange-funds-line text-emerald-600"></i> Rekonsiliasi Mutasi Bank
                        </h3>
                        <p class="text-xs text-slate-500">Impor mutasi CSV rekening &amp; cocokkan otomatis dengan Faktur / Pembayaran / Pengeluaran.</p>
                    </div>
                    <button type="button" onclick="App.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        <i class="ri-close-line text-lg"></i>
                    </button>
                </div>

                <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Rekening Bank</label>
                            <select id="rec-bank-id" class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">${bankOpts}</select>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">Unggah CSV (tgl,deskripsi,tipe,nominal)</label>
                            <input type="file" id="rec-csv-file" accept=".csv,text/csv" class="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 file:font-semibold">
                        </div>
                    </div>
                    <textarea id="rec-csv-paste" rows="3" placeholder="Atau tempel baris CSV: 2026-11-25,TRSF INV-001,kredit,1500000"
                              class="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"></textarea>
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <button type="button" id="btn-rec-import" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold">Impor Mutasi</button>
                        <button type="button" id="btn-rec-automatch" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5">
                            <i class="ri-magic-line"></i><span>Auto-Match Otomatis</span>
                        </button>
                    </div>
                </div>

                <div id="rec-mutations-list" class="space-y-2 max-h-72 overflow-y-auto text-xs">
                    <div class="text-center text-slate-400 py-4">Memuat mutasi...</div>
                </div>
            </div>
        `, 'max-w-3xl');

        const parseCsvText = (txt) => txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(line => {
            const cols = line.split(/[,;]/).map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 4 || isNaN(parseFloat(cols[3].replace(/[^0-9.-]/g, '')))) return null;
            return {
                tanggal_transaksi: cols[0],
                deskripsi: cols[1],
                tipe: cols[2].toLowerCase().includes('deb') ? 'debit' : 'kredit',
                nominal: Math.abs(parseFloat(cols[3].replace(/[^0-9.-]/g, '')) || 0),
                referensi: cols[4] || ''
            };
        }).filter(Boolean);

        const loadMutations = async () => {
            const pmId = document.getElementById('rec-bank-id')?.value || '';
            const res = await App.api(`bank-accounts/mutations?payment_method_id=${pmId}`, { cache: false });
            const el = document.getElementById('rec-mutations-list');
            if (!el) return;
            const rows = res?.success ? (res.data || []) : [];
            if (!rows.length) {
                el.innerHTML = `<div class="text-center text-slate-400 py-4">Belum ada data mutasi untuk rekening ini.</div>`;
                return;
            }
            el.innerHTML = rows.map(m => {
                const badge = m.status === 'matched'
                    ? `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">COCOK (${App.escapeHtml(m.matched_type || '')}: ${App.escapeHtml(m.matched_label || '#' + m.matched_id)})</span>`
                    : (m.status === 'ignored'
                        ? `<span class="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">DIABAIKAN</span>`
                        : `<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">BELUM COCOK</span>`);
                return `
                    <div class="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-mono text-[11px] text-slate-500">${App.escapeHtml(m.tanggal_transaksi)}</span>
                                <span class="font-bold text-slate-800 dark:text-slate-100">${App.escapeHtml(m.deskripsi)}</span>
                                ${badge}
                            </div>
                            <div class="font-mono text-xs mt-0.5 ${m.tipe === 'kredit' ? 'text-emerald-600' : 'text-rose-600'} font-bold">
                                ${m.tipe === 'kredit' ? '+' : '-'} ${App.formatIDR(m.nominal)}
                            </div>
                        </div>
                        ${m.status === 'unmatched' ? `
                            <div class="flex items-center gap-1.5">
                                <button type="button" onclick="window.reconcileMutation(${m.id}, 'matched')" class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-[11px]">Tandai Cocok</button>
                                <button type="button" onclick="window.reconcileMutation(${m.id}, 'ignored')" class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold text-[11px]">Abaikan</button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        };

        window.reconcileMutation = async (id, status) => {
            const r = await App.api('bank-accounts/mutations/reconcile', { method: 'POST', body: { id, status } });
            if (r?.success) { App.toast(r.message, 'success'); loadMutations(); }
        };

        document.getElementById('rec-bank-id')?.addEventListener('change', loadMutations);
        document.getElementById('rec-csv-file')?.addEventListener('change', (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => { document.getElementById('rec-csv-paste').value = String(reader.result || ''); };
            reader.readAsText(f);
        });
        document.getElementById('btn-rec-import')?.addEventListener('click', async () => {
            const pmId = document.getElementById('rec-bank-id')?.value;
            const rows = parseCsvText(document.getElementById('rec-csv-paste')?.value || '');
            const r = await App.api('bank-accounts/mutations/import', { method: 'POST', body: { payment_method_id: pmId, rows } });
            if (r?.success) { App.toast(r.message, 'success'); loadMutations(); }
        });
        document.getElementById('btn-rec-automatch')?.addEventListener('click', async () => {
            const pmId = document.getElementById('rec-bank-id')?.value;
            const r = await App.api('bank-accounts/mutations/auto-match', { method: 'POST', body: { payment_method_id: pmId } });
            if (r?.success) { App.toast(r.message, 'success'); loadMutations(); }
        });

        loadMutations();
    }
}
