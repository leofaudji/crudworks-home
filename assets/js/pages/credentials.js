// assets/js/pages/credentials.js — Brankas Kredensial Terenkripsi AES-256
import { App } from '../app.js';

let clientsList = [];
let projectsList = [];
let currentFilter = {
    search: '',
    client_id: '',
    tipe: ''
};

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div class="flex items-center gap-3">
                    <span class="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20">
                        <i class="ri-key-2-line text-2xl"></i>
                    </span>
                    <div>
                        <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Brankas Kredensial Server</h1>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Penyimpanan terenkripsi AES-256 untuk akses server VPS, cPanel, database, dan token API klien.</p>
                    </div>
                </div>
                <button id="btn-add-credential" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-sm shadow-primary-500/20 transition self-start sm:self-auto">
                    <i class="ri-add-line text-base"></i>
                    <span>Tambah Kredensial Baru</span>
                </button>
            </div>

            <!-- Security Notice Banner -->
            <div class="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl flex-shrink-0 border border-emerald-500/30">
                        <i class="ri-shield-check-line"></i>
                    </div>
                    <div>
                        <div class="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                            <span>Enkripsi AES-256 Aktif</span>
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        </div>
                        <p class="text-[11px] text-slate-300 mt-0.5">Seluruh kata sandi dan token rahasia dienkripsi pada sisi server. Setiap aksi pembukaan kata sandi dicatat secara permanen di Jejak Audit.</p>
                    </div>
                </div>
                <div class="text-right flex-shrink-0">
                    <span id="cred-total-count" class="px-3 py-1 bg-white/10 rounded-xl text-xs font-mono font-bold text-white">0 Kredensial</span>
                </div>
            </div>

            <!-- Filters -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center gap-3 shadow-xs">
                <div class="relative flex-1 min-w-[240px]">
                    <input type="text" id="cred-search" placeholder="Cari judul, username, host, atau nama klien..."
                           class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500">
                    <i class="ri-search-line absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                </div>
                <select id="cred-filter-client" class="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    <option value="">Semua Pelanggan</option>
                </select>
                <select id="cred-filter-tipe" class="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    <option value="">Semua Tipe Kredensial</option>
                    <option value="ssh_vps">SSH / Root VPS</option>
                    <option value="cpanel_hosting">cPanel / Web Hosting</option>
                    <option value="database">Database (MySQL / Postgres)</option>
                    <option value="wp_admin">Admin Website / CMS</option>
                    <option value="cloudflare_dns">Cloudflare / DNS</option>
                    <option value="api_key">API Key / Secret Token</option>
                    <option value="git_repo">Git Repo / Deploy Key</option>
                    <option value="lainnya">Lainnya</option>
                </select>
            </div>

            <!-- Credentials List -->
            <div id="credentials-container" class="space-y-3">
                <div class="text-center py-16 text-slate-400 text-xs">
                    <i class="ri-loader-4-line text-2xl animate-spin mb-2 inline-block"></i>
                    <div>Memuat brankas kredensial...</div>
                </div>
            </div>
        </div>

        <!-- Credential Form Modal -->
        <div id="credential-modal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 animate-fadeIn max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-5">
                    <h3 id="credential-modal-title" class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-key-2-line text-primary-600"></i>
                        <span>Tambah Kredensial Baru</span>
                    </h3>
                    <button id="btn-close-cred-modal" class="text-slate-400 hover:text-slate-600">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <form id="credential-form" class="space-y-4">
                    <input type="hidden" id="form-cred-id" value="">

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div class="sm:col-span-2">
                            <label class="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Pelanggan Klien *</label>
                            <select id="form-cred-client" required class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                                <option value="">-- Pilih Pelanggan --</option>
                            </select>
                        </div>

                        <div class="sm:col-span-2">
                            <label class="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Proyek Terkait (Opsional)</label>
                            <select id="form-cred-project" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                                <option value="">-- Tidak Terikat Proyek Spesifik --</option>
                            </select>
                        </div>

                        <div class="sm:col-span-2">
                            <label class="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Judul / Identifikasi Akses *</label>
                            <input type="text" id="form-cred-judul" required placeholder="Contoh: Server Production Ubuntu 22.04"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                        </div>

                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Tipe Akses</label>
                            <select id="form-cred-tipe" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                                <option value="ssh_vps">SSH / Root VPS</option>
                                <option value="cpanel_hosting">cPanel / Hosting</option>
                                <option value="database">Database Server</option>
                                <option value="wp_admin">Admin CMS / Web</option>
                                <option value="cloudflare_dns">Cloudflare DNS</option>
                                <option value="api_key">API Key / Token</option>
                                <option value="git_repo">Git Repository</option>
                                <option value="lainnya">Lainnya</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Port</label>
                            <input type="text" id="form-cred-port" placeholder="22, 3306, 2083..."
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>

                        <div class="sm:col-span-2">
                            <label class="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Host / IP / URL Login</label>
                            <input type="text" id="form-cred-host" placeholder="Contoh: 103.123.45.67 atau srv1.domain.com"
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>

                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Username / Akun</label>
                            <input type="text" id="form-cred-username" placeholder="root, admin, deployer..."
                                   class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                        </div>

                        <div>
                            <label class="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                                <span>Kata Sandi / Secret Token *</span>
                                <span id="form-cred-pw-hint" class="text-[9px] text-slate-400 font-normal lowercase hidden">(kosongkan jika tidak diubah)</span>
                            </label>
                            <div class="relative">
                                <input type="password" id="form-cred-password" placeholder="••••••••••••"
                                       class="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono">
                                <button type="button" id="btn-toggle-input-pw" class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                                    <i class="ri-eye-line text-sm"></i>
                                </button>
                            </div>
                        </div>

                        <div class="sm:col-span-2">
                            <label class="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Catatan Tambahan (Opsional)</label>
                            <textarea id="form-cred-catatan" rows="2" placeholder="Catatan konfigurasi, path private key, atau cara akses..."
                                      class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"></textarea>
                        </div>

                        <div class="sm:col-span-2">
                            <label class="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 cursor-pointer">
                                <input type="checkbox" id="form-cred-portal" class="w-4 h-4 rounded text-primary-600 focus:ring-primary-500">
                                <div>
                                    <span class="text-xs font-bold text-slate-800 dark:text-slate-200 block">Tampilkan di Portal Klien</span>
                                    <span class="text-[11px] text-slate-500 dark:text-slate-400">Klien dapat melihat dan menyalin kredensial ini dengan aman di tab Layanan Portal.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                        <button type="button" id="btn-cancel-cred" class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold">Batal</button>
                        <button type="submit" id="btn-save-cred" class="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-xs">Simpan ke Brankas</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Fetch clients & projects for dropdowns
    const [cRes, pRes] = await Promise.all([
        App.api('clients?all=1'),
        App.api('projects?all=1')
    ]);

    if (cRes?.success && Array.isArray(cRes.data)) {
        clientsList = cRes.data;
        populateClientDropdowns();
    }
    if (pRes?.success && Array.isArray(pRes.data)) {
        projectsList = pRes.data;
    }

    // Bind Filter Events
    document.getElementById('cred-search')?.addEventListener('input', (e) => {
        currentFilter.search = e.target.value;
        loadCredentials();
    });
    document.getElementById('cred-filter-client')?.addEventListener('change', (e) => {
        currentFilter.client_id = e.target.value;
        loadCredentials();
    });
    document.getElementById('cred-filter-tipe')?.addEventListener('change', (e) => {
        currentFilter.tipe = e.target.value;
        loadCredentials();
    });

    // Form Modal Events
    document.getElementById('btn-add-credential')?.addEventListener('click', () => openCredentialModal());
    document.getElementById('btn-close-cred-modal')?.addEventListener('click', () => closeCredentialModal());
    document.getElementById('btn-cancel-cred')?.addEventListener('click', () => closeCredentialModal());
    document.getElementById('credential-form')?.addEventListener('submit', (e) => handleSaveCredential(e));

    // Dynamic Project Filter based on Client in Form
    document.getElementById('form-cred-client')?.addEventListener('change', (e) => {
        const cId = e.target.value;
        populateProjectDropdown(cId);
    });

    // Toggle Input Password Visibility
    document.getElementById('btn-toggle-input-pw')?.addEventListener('click', () => {
        const inp = document.getElementById('form-cred-password');
        const icon = document.querySelector('#btn-toggle-input-pw i');
        if (inp.type === 'password') {
            inp.type = 'text';
            icon.className = 'ri-eye-off-line text-sm';
        } else {
            inp.type = 'password';
            icon.className = 'ri-eye-line text-sm';
        }
    });

    await loadCredentials();
}

function populateClientDropdowns() {
    const filterSelect = document.getElementById('cred-filter-client');
    const formSelect = document.getElementById('form-cred-client');

    if (filterSelect) {
        filterSelect.innerHTML = `<option value="">Semua Pelanggan</option>` +
            clientsList.map(c => `<option value="${c.id}">${c.nama_perusahaan} (${c.kode_klien})</option>`).join('');
    }
    if (formSelect) {
        formSelect.innerHTML = `<option value="">-- Pilih Pelanggan --</option>` +
            clientsList.map(c => `<option value="${c.id}">${c.nama_perusahaan} (${c.kode_klien})</option>`).join('');
    }
}

function populateProjectDropdown(clientId = null, selectedProjId = null) {
    const projSelect = document.getElementById('form-cred-project');
    if (!projSelect) return;

    let filtered = projectsList;
    if (clientId) {
        filtered = projectsList.filter(p => String(p.client_id) === String(clientId));
    }

    projSelect.innerHTML = `<option value="">-- Tidak Terikat Proyek Spesifik --</option>` +
        filtered.map(p => `<option value="${p.id}" ${selectedProjId && String(p.id) === String(selectedProjId) ? 'selected' : ''}>${p.nama_project}</option>`).join('');
}

async function loadCredentials() {
    const cont = document.getElementById('credentials-container');
    const countEl = document.getElementById('cred-total-count');

    let qs = [];
    if (currentFilter.search) qs.push(`search=${encodeURIComponent(currentFilter.search)}`);
    if (currentFilter.client_id) qs.push(`client_id=${encodeURIComponent(currentFilter.client_id)}`);
    if (currentFilter.tipe) qs.push(`tipe=${encodeURIComponent(currentFilter.tipe)}`);

    const res = await App.api(`credentials${qs.length ? '?' + qs.join('&') : ''}`);
    if (!res || !res.success) {
        cont.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">Gagal memuat kredensial</div>`;
        return;
    }

    const items = res.data || [];
    if (countEl) countEl.textContent = `${items.length} Kredensial`;

    if (items.length === 0) {
        cont.innerHTML = `
            <div class="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-3">
                <div class="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-2xl">
                    <i class="ri-key-line"></i>
                </div>
                <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">Belum Ada Kredensial Disimpan</h3>
                <p class="text-xs text-slate-400 max-w-sm mx-auto">Mulai simpan akses SSH, cPanel, database, atau token API klien di brankas terenkripsi.</p>
                <button onclick="document.getElementById('btn-add-credential').click()" class="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-semibold shadow-xs">
                    Tambah Sekarang
                </button>
            </div>
        `;
        return;
    }

    cont.innerHTML = items.map(c => renderCredentialCard(c)).join('');

    // Bind action buttons per card
    items.forEach(c => {
        // Copy Host
        document.getElementById(`btn-copy-host-${c.id}`)?.addEventListener('click', () => {
            if (c.host_url) {
                navigator.clipboard.writeText(c.host_url);
                App.toast('Host berhasil disalin ke clipboard', 'success');
            }
        });

        // Copy User
        document.getElementById(`btn-copy-user-${c.id}`)?.addEventListener('click', () => {
            if (c.username) {
                navigator.clipboard.writeText(c.username);
                App.toast('Username berhasil disalin ke clipboard', 'success');
            }
        });

        // Reveal Password
        document.getElementById(`btn-reveal-pw-${c.id}`)?.addEventListener('click', () => handleRevealPassword(c.id));

        // Edit
        document.getElementById(`btn-edit-cred-${c.id}`)?.addEventListener('click', () => openCredentialModal(c));

        // Delete
        document.getElementById(`btn-del-cred-${c.id}`)?.addEventListener('click', () => handleDeleteCredential(c.id, c.judul));
    });
}

function renderCredentialCard(c) {
    const badge = getTipeBadge(c.tipe);

    return `
        <div class="p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <!-- Left: Title & Context -->
                <div class="space-y-1.5 flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge.bg} ${badge.text} flex items-center gap-1 font-mono uppercase">
                            <i class="${badge.icon}"></i>
                            <span>${badge.label}</span>
                        </span>
                        <h3 class="text-sm font-bold text-slate-900 dark:text-white truncate">${c.judul}</h3>
                        ${Number(c.show_in_portal) === 1 ? `<span class="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 font-semibold"><i class="ri-global-line mr-0.5"></i>Portal Klien</span>` : ''}
                        ${c.nama_project ? `<span class="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">${c.nama_project}</span>` : ''}
                    </div>

                    <div class="text-xs text-slate-500 flex items-center gap-2">
                        <span class="font-bold text-slate-700 dark:text-slate-300">${c.nama_perusahaan}</span>
                        <span>·</span>
                        <span class="font-mono text-[11px] text-slate-400">${c.kode_klien}</span>
                        ${c.port ? `<span>·</span><span class="font-mono text-[11px] text-sky-600">Port: ${c.port}</span>` : ''}
                    </div>

                    ${c.catatan ? `<p class="text-[11px] text-slate-400 italic line-clamp-1">${c.catatan}</p>` : ''}
                </div>

                <!-- Middle: Host & Username Pills -->
                <div class="flex flex-wrap items-center gap-2 text-xs font-mono">
                    ${c.host_url ? `
                        <div class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center gap-2">
                            <span class="text-[10px] uppercase text-slate-400 font-sans font-bold">Host:</span>
                            <span class="text-slate-800 dark:text-slate-200 truncate max-w-[160px]">${c.host_url}</span>
                            <button id="btn-copy-host-${c.id}" title="Salin Host" class="text-slate-400 hover:text-primary-600 transition">
                                <i class="ri-file-copy-line text-sm"></i>
                            </button>
                        </div>
                    ` : ''}

                    ${c.username ? `
                        <div class="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center gap-2">
                            <span class="text-[10px] uppercase text-slate-400 font-sans font-bold">User:</span>
                            <span class="text-slate-800 dark:text-slate-200">${c.username}</span>
                            <button id="btn-copy-user-${c.id}" title="Salin Username" class="text-slate-400 hover:text-primary-600 transition">
                                <i class="ri-file-copy-line text-sm"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>

                <!-- Right: Secret Reveal & Actions -->
                <div class="flex items-center gap-2 flex-shrink-0">
                    <div id="secret-box-${c.id}" class="flex items-center gap-1.5">
                        <button id="btn-reveal-pw-${c.id}" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition">
                            <i class="ri-eye-line text-emerald-400 text-sm"></i>
                            <span>Buka Kata Sandi</span>
                        </button>
                    </div>

                    <button id="btn-edit-cred-${c.id}" title="Edit Kredensial" class="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button id="btn-del-cred-${c.id}" title="Hapus Kredensial" class="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getTipeBadge(tipe) {
    const map = {
        ssh_vps: { label: 'SSH / VPS', icon: 'ri-terminal-box-line', bg: 'bg-slate-900 text-white dark:bg-slate-800 dark:text-emerald-400' },
        cpanel_hosting: { label: 'cPanel', icon: 'ri-server-line', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400' },
        database: { label: 'Database', icon: 'ri-database-2-line', bg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-400' },
        wp_admin: { label: 'Web Admin', icon: 'ri-admin-line', bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400' },
        cloudflare_dns: { label: 'Cloudflare', icon: 'ri-shield-flash-line', bg: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400' },
        api_key: { label: 'API Key', icon: 'ri-code-s-slash-line', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400' },
        git_repo: { label: 'Git Repo', icon: 'ri-git-branch-line', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400' },
        lainnya: { label: 'Lainnya', icon: 'ri-key-line', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' }
    };
    return map[tipe] || map.lainnya;
}

// Reveal Password Handler with auto-hide timer
async function handleRevealPassword(credId) {
    const box = document.getElementById(`secret-box-${credId}`);
    if (!box) return;

    box.innerHTML = `<span class="text-xs text-slate-400 font-mono"><i class="ri-loader-4-line animate-spin"></i> Membuka...</span>`;

    const res = await App.api('credentials/reveal', {
        method: 'POST',
        body: JSON.stringify({ id: credId })
    });

    if (!res || !res.success) {
        App.toast(res?.message || 'Gagal membuka kata sandi', 'error');
        box.innerHTML = `
            <button id="btn-reveal-pw-${credId}" class="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5">
                <i class="ri-eye-line text-emerald-400"></i> Buka Kata Sandi
            </button>
        `;
        document.getElementById(`btn-reveal-pw-${credId}`)?.addEventListener('click', () => handleRevealPassword(credId));
        return;
    }

    const secret = res.data.secret || '';
    let secondsLeft = 15;

    box.innerHTML = `
        <div class="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-3 py-1 rounded-xl">
            <span class="font-mono text-xs font-bold text-emerald-900 dark:text-emerald-300 select-all">${escapeHtml(secret)}</span>
            <button id="btn-copy-secret-${credId}" title="Salin Kata Sandi" class="p-1 text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 transition">
                <i class="ri-file-copy-line text-xs"></i>
            </button>
            <span id="countdown-${credId}" class="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold ml-1">(${secondsLeft}s)</span>
        </div>
    `;

    document.getElementById(`btn-copy-secret-${credId}`)?.addEventListener('click', () => {
        navigator.clipboard.writeText(secret);
        App.toast('Kata sandi berhasil disalin ke clipboard!', 'success');
    });

    // Auto-hide timer
    const interval = setInterval(() => {
        secondsLeft -= 1;
        const cntEl = document.getElementById(`countdown-${credId}`);
        if (cntEl) cntEl.textContent = `(${secondsLeft}s)`;

        if (secondsLeft <= 0) {
            clearInterval(interval);
            if (box) {
                box.innerHTML = `
                    <button id="btn-reveal-pw-${credId}" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition">
                        <i class="ri-eye-line text-emerald-400 text-sm"></i>
                        <span>Buka Kata Sandi</span>
                    </button>
                `;
                document.getElementById(`btn-reveal-pw-${credId}`)?.addEventListener('click', () => handleRevealPassword(credId));
            }
        }
    }, 1000);
}

function openCredentialModal(cred = null) {
    const modal = document.getElementById('credential-modal');
    const title = document.getElementById('credential-modal-title');
    const idInput = document.getElementById('form-cred-id');
    const clientSelect = document.getElementById('form-cred-client');
    const judulInput = document.getElementById('form-cred-judul');
    const tipeSelect = document.getElementById('form-cred-tipe');
    const hostInput = document.getElementById('form-cred-host');
    const portInput = document.getElementById('form-cred-port');
    const userInput = document.getElementById('form-cred-username');
    const pwInput = document.getElementById('form-cred-password');
    const pwHint = document.getElementById('form-cred-pw-hint');
    const catatanInput = document.getElementById('form-cred-catatan');
    const portalCheckbox = document.getElementById('form-cred-portal');

    if (cred) {
        title.innerHTML = `<i class="ri-edit-line text-primary-600"></i><span>Edit Kredensial</span>`;
        idInput.value = cred.id;
        clientSelect.value = cred.client_id;
        populateProjectDropdown(cred.client_id, cred.project_id);
        judulInput.value = cred.judul;
        tipeSelect.value = cred.tipe;
        hostInput.value = cred.host_url || '';
        portInput.value = cred.port || '';
        userInput.value = cred.username || '';
        pwInput.value = '';
        pwInput.required = false;
        pwHint.classList.remove('hidden');
        catatanInput.value = cred.catatan || '';
        if (portalCheckbox) portalCheckbox.checked = Number(cred.show_in_portal) === 1;
    } else {
        title.innerHTML = `<i class="ri-key-2-line text-primary-600"></i><span>Tambah Kredensial Baru</span>`;
        idInput.value = '';
        clientSelect.value = currentFilter.client_id || '';
        populateProjectDropdown(clientSelect.value);
        judulInput.value = '';
        tipeSelect.value = 'ssh_vps';
        hostInput.value = '';
        portInput.value = '';
        userInput.value = '';
        pwInput.value = '';
        pwInput.required = true;
        pwHint.classList.add('hidden');
        catatanInput.value = '';
        if (portalCheckbox) portalCheckbox.checked = false;
    }

    modal.classList.remove('hidden');
}

function closeCredentialModal() {
    document.getElementById('credential-modal')?.classList.add('hidden');
}

async function handleSaveCredential(e) {
    e.preventDefault();

    const id = document.getElementById('form-cred-id').value;
    const client_id = document.getElementById('form-cred-client').value;
    const project_id = document.getElementById('form-cred-project').value;
    const judul = document.getElementById('form-cred-judul').value;
    const tipe = document.getElementById('form-cred-tipe').value;
    const host_url = document.getElementById('form-cred-host').value;
    const port = document.getElementById('form-cred-port').value;
    const username = document.getElementById('form-cred-username').value;
    const password = document.getElementById('form-cred-password').value;
    const catatan = document.getElementById('form-cred-catatan').value;
    const show_in_portal = document.getElementById('form-cred-portal')?.checked ? 1 : 0;

    const payload = {
        client_id,
        project_id,
        judul,
        tipe,
        host_url,
        port,
        username,
        catatan,
        show_in_portal
    };
    if (id) payload.id = id;
    if (password) payload.password = password;

    const res = await App.api('credentials', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (res && res.success) {
        App.toast(res.message || 'Kredensial berhasil disimpan', 'success');
        closeCredentialModal();
        await loadCredentials();
    } else {
        App.toast(res?.message || 'Gagal menyimpan kredensial', 'error');
    }
}

async function handleDeleteCredential(id, judul) {
    if (!confirm(`Apakah Anda yakin ingin menghapus kredensial "${judul}" dari brankas?`)) return;

    const res = await App.api(`credentials/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        App.toast('Kredensial berhasil dihapus', 'success');
        await loadCredentials();
    } else {
        App.toast(res?.message || 'Gagal menghapus kredensial', 'error');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
