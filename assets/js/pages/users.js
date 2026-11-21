// assets/js/pages/users.js
import { App } from '../app.js';

let state = {
    page: 1,
    perPage: 10,
    search: ''
};

let rolesList = [];

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Manajemen Pengguna</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Kelola akun staf operator, penugasan peran hak akses, dan status login.</p>
                </div>
                <button id="btn-add-user" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-primary-500/20 flex items-center gap-2 transition">
                    <i class="ri-user-add-line text-base"></i>
                    <span>Tambah Pengguna</span>
                </button>
            </div>

            <!-- Search -->
            <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-4">
                <div class="relative flex-1">
                    <input type="text" id="user-search" placeholder="Cari nama lengkap, username, atau email..."
                           class="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <i class="ri-search-line absolute left-3.5 top-3 text-slate-400 text-sm"></i>
                </div>
            </div>

            <!-- Table Card -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th class="py-3.5 px-6">Nama Pengguna</th>
                                <th class="py-3.5 px-6">Peran Akses (Role)</th>
                                <th class="py-3.5 px-6">Email & Kontak</th>
                                <th class="py-3.5 px-6">Login Terakhir</th>
                                <th class="py-3.5 px-6">Status</th>
                                <th class="py-3.5 px-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="users-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr>
                                <td colspan="6" class="py-12 text-center text-slate-400">
                                    <i class="ri-loader-4-line text-2xl animate-spin mb-2 inline-block"></i>
                                    <div>Memuat data pengguna...</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div id="users-pagination" class="px-7 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500"></div>
            </div>
        </div>

        <!-- User Modal -->
        <div id="user-modal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-fadeIn max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                    <h3 id="user-modal-title" class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="ri-user-settings-line text-primary-600"></i>
                        <span>Tambah Pengguna Baru</span>
                    </h3>
                    <button onclick="document.getElementById('user-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <form id="user-form" class="space-y-4">
                    <input type="hidden" id="form-user-id" value="">

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Nama Lengkap *</label>
                        <input type="text" id="form-user-nama" required placeholder="Nama lengkap staf"
                               class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Username *</label>
                            <input type="text" id="form-user-uname" required placeholder="username"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Peran Akses (Role) *</label>
                            <select id="form-user-role" required
                                    class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Email *</label>
                            <input type="email" id="form-user-email" required placeholder="user@crudworks.com"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Nomor Telepon</label>
                            <input type="text" id="form-user-telepon" placeholder="0812xxxx"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div class="sm:col-span-2">
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Kata Sandi</label>
                            <input type="password" id="form-user-password" placeholder="Kosongkan jika tidak ingin mengubah"
                                   class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Status Akun</label>
                            <select id="form-user-status" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="aktif">Aktif</option>
                                <option value="nonaktif">Nonaktif</option>
                            </select>
                        </div>
                    </div>

                    <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                        <button type="button" onclick="document.getElementById('user-modal').classList.add('hidden')"
                                class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold">Batal</button>
                        <button type="submit" id="btn-save-user"
                                class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/20">Simpan Pengguna</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Load roles
    const rRes = await App.api('roles');
    if (rRes && rRes.success) {
        rolesList = rRes.data;
        const sel = document.getElementById('form-user-role');
        if (sel) {
            sel.innerHTML = rolesList.map(r => `<option value="${r.id}">${r.label} (${r.name})</option>`).join('');
        }
    }

    document.getElementById('btn-add-user').addEventListener('click', () => openUserModal());
    document.getElementById('user-form').addEventListener('submit', handleSaveUser);

    const searchInput = document.getElementById('user-search');
    let timer;
    searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            state.search = searchInput.value.trim();
            state.page = 1;
            loadUsers();
        }, 300);
    });

    loadUsers();
}

async function loadUsers() {
    const tbody = document.getElementById('users-tbody');
    const paginationEl = document.getElementById('users-pagination');

    let ep = `users?page=${state.page}&per_page=${state.perPage}`;
    if (state.search) ep += `&search=${encodeURIComponent(state.search)}`;

    const res = await App.api(ep);
    if (!res || !res.success) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-rose-500">Gagal memuat data pengguna</td></tr>`;
        return;
    }

    const { data: users, pagination } = res;

    tbody.innerHTML = users.map(u => `
        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
            <td class="py-4 px-6">
                <div class="font-bold text-slate-900 dark:text-white">${u.nama_lengkap}</div>
                <div class="text-xs font-mono text-slate-400">@${u.username}</div>
            </td>
            <td class="py-4 px-6">
                <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-500/10 text-primary-600 border border-primary-500/20">
                    ${u.role_label}
                </span>
            </td>
            <td class="py-4 px-6 text-xs text-slate-600 dark:text-slate-300">
                <div>${u.email}</div>
                <div class="text-slate-400 font-mono">${u.telepon || '-'}</div>
            </td>
            <td class="py-4 px-6 text-xs text-slate-400 font-mono">
                ${u.last_login ? App.formatDate(u.last_login) : 'Belum pernah login'}
            </td>
            <td class="py-4 px-6">
                ${App.renderStatusBadge(u.status, 'user')}
            </td>
            <td class="py-4 px-6 text-right">
                <button type="button" onclick="App.toggleTableActionMenu(this, event, [
                    { label: 'Edit Pengguna', icon: 'ri-edit-line', iconColor: 'text-primary-600', action: 'window.editUser(${u.id})' },
                    ${u.id !== 1 ? `
                        { divider: true },
                        { label: 'Hapus Pengguna', icon: 'ri-delete-bin-line', danger: true, action: 'window.deleteUser(${u.id}, \\'${App.escapeHtml(u.nama_lengkap)}\\')' }
                    ` : ''}
                ])" class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition" title="Menu Aksi">
                    <span>Aksi</span>
                    <i class="ri-more-2-fill text-slate-400"></i>
                </button>
            </td>
        </tr>
    `).join('');

    paginationEl.innerHTML = `
        <div>Menampilkan hal <b>${pagination.page}</b> dari <b>${pagination.total}</b> pengguna</div>
        <div class="flex items-center gap-2">
            <button ${pagination.page <= 1 ? 'disabled' : ''} onclick="window.changeUserPage(${pagination.page - 1})"
                    class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40">Sebelumnya</button>
            <button ${pagination.page >= pagination.total_pages ? 'disabled' : ''} onclick="window.changeUserPage(${pagination.page + 1})"
                    class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40">Berikutnya</button>
        </div>
    `;
}

function openUserModal(user = null) {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');
    form.reset();

    const passInput = document.getElementById('form-user-password');
    const unameInput = document.getElementById('form-user-uname');

    if (user) {
        title.innerHTML = `<i class="ri-edit-line text-primary-600"></i><span>Edit Pengguna</span>`;
        document.getElementById('form-user-id').value = user.id;
        document.getElementById('form-user-nama').value = user.nama_lengkap;
        unameInput.value = user.username;
        unameInput.disabled = true; // Username locked on edit
        document.getElementById('form-user-email').value = user.email;
        document.getElementById('form-user-telepon').value = user.telepon || '';
        document.getElementById('form-user-role').value = user.role_id;
        document.getElementById('form-user-status').value = user.status;
        passInput.required = false;
        passInput.placeholder = 'Kosongkan jika tidak ingin mengubah kata sandi';
    } else {
        title.innerHTML = `<i class="ri-user-add-line text-primary-600"></i><span>Tambah Pengguna Baru</span>`;
        document.getElementById('form-user-id').value = '';
        unameInput.disabled = false;
        passInput.required = true;
        passInput.placeholder = 'Kata sandi minimal 6 karakter';
    }

    modal.classList.remove('hidden');
}

async function handleSaveUser(e) {
    e.preventDefault();
    const id = document.getElementById('form-user-id').value;
    const body = {
        username: document.getElementById('form-user-uname').value.trim(),
        nama_lengkap: document.getElementById('form-user-nama').value.trim(),
        email: document.getElementById('form-user-email').value.trim(),
        telepon: document.getElementById('form-user-telepon').value.trim(),
        role_id: document.getElementById('form-user-role').value,
        status: document.getElementById('form-user-status').value
    };

    const pass = document.getElementById('form-user-password').value;
    if (pass) body.password = pass;

    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `users/${id}` : 'users';

    const res = await App.api(endpoint, { method, body });
    if (res && res.success) {
        App.toast(res.message, 'success');
        document.getElementById('user-modal').classList.add('hidden');
        loadUsers();
    }
}

window.editUser = async (id) => {
    const res = await App.api(`users/${id}`);
    if (res && res.success) openUserModal(res.data);
};

window.deleteUser = async (id, name) => {
    const conf = await App.confirm('Hapus Pengguna', `Yakin ingin menghapus akun pengguna "${name}"?`);
    if (!conf) return;

    const res = await App.api(`users/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        App.toast(res.message, 'success');
        loadUsers();
    }
};

window.changeUserPage = (p) => {
    state.page = p;
    loadUsers();
};
