// assets/js/pages/roles.js
import { App } from '../app.js';

let allPermissions = {};

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Hak Akses & Peran (RBAC)</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Atur matriks izin hak akses modul untuk setiap tingkatan operator sistem.</p>
                </div>
            </div>

            <!-- Table Card -->
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="data-table w-full text-left text-sm border-collapse">
                        <thead>
                            <tr class="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th class="py-3.5 px-6">Nama Peran (Role)</th>
                                <th class="py-3.5 px-6">Identifier Kode</th>
                                <th class="py-3.5 px-6">Deskripsi</th>
                                <th class="py-3.5 px-6">Pengguna Terdaftar</th>
                                <th class="py-3.5 px-6">Izin Akses Aktif</th>
                                <th class="py-3.5 px-6 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="roles-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr>
                                <td colspan="6" class="py-12 text-center text-slate-400">
                                    <i class="ri-loader-4-line text-2xl animate-spin mb-2 inline-block"></i>
                                    <div>Memuat data peran...</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Role Permissions Matrix Modal -->
        <div id="role-perm-modal" class="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-fadeIn max-h-[92vh] overflow-y-auto">
                <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                    <div>
                        <h3 id="role-perm-title" class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="ri-shield-user-line text-primary-600"></i>
                            <span>Atur Hak Akses Peran</span>
                        </h3>
                        <p id="role-perm-desc" class="text-xs text-slate-400 mt-1"></p>
                    </div>
                    <button onclick="document.getElementById('role-perm-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <form id="role-perm-form" class="space-y-6">
                    <input type="hidden" id="form-role-id" value="">

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1.5">Nama Label Peran *</label>
                        <input type="text" id="form-role-label" required
                               class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    </div>

                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Matriks Izin Akses (Permissions)</span>
                            <div class="flex gap-2">
                                <button type="button" onclick="window.toggleAllPerms(true)" class="text-[11px] font-bold text-primary-600 hover:underline">Pilih Semua</button>
                                <span class="text-slate-300">|</span>
                                <button type="button" onclick="window.toggleAllPerms(false)" class="text-[11px] font-bold text-slate-500 hover:underline">Batal Semua</button>
                            </div>
                        </div>

                        <div id="permissions-matrix" class="space-y-4 max-h-96 overflow-y-auto pr-1">
                            <!-- Populated dynamically -->
                        </div>
                    </div>

                    <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                        <button type="button" onclick="document.getElementById('role-perm-modal').classList.add('hidden')"
                                class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold">Batal</button>
                        <button type="submit" id="btn-save-role-perms"
                                class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/20">Simpan Izin Akses</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Fetch all available permissions
    const pRes = await App.api('roles/permissions');
    if (pRes && pRes.success) allPermissions = pRes.data;

    document.getElementById('role-perm-form').addEventListener('submit', handleSaveRolePermissions);
    loadRoles();
}

async function loadRoles() {
    const tbody = document.getElementById('roles-tbody');
    const res = await App.api('roles');
    if (!res || !res.success) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-rose-500">Gagal memuat peran</td></tr>`;
        return;
    }

    tbody.innerHTML = res.data.map(r => `
        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
            <td class="py-4 px-6 font-bold text-slate-900 dark:text-white">
                ${r.label}
            </td>
            <td class="py-4 px-6 font-mono text-xs text-primary-600 dark:text-primary-400">
                ${r.name}
            </td>
            <td class="py-4 px-6 text-xs text-slate-500">
                ${r.description || '-'}
            </td>
            <td class="py-4 px-6">
                <span class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                    ${r.total_users} Pengguna
                </span>
            </td>
            <td class="py-4 px-6">
                <span class="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg text-xs font-bold font-mono">
                    ${r.id == 1 ? 'Akses Penuh (Bypass)' : `${r.total_permissions} Izin`}
                </span>
            </td>
            <td class="py-4 px-6 text-right">
                ${r.id !== 1 ? `
                    <button onclick="window.editRolePermissions(${r.id})" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition">
                        <i class="ri-settings-4-line mr-1"></i> Atur Izin
                    </button>
                ` : `<span class="text-xs text-slate-400 italic">Super Admin Tetap</span>`}
            </td>
        </tr>
    `).join('');
}

window.editRolePermissions = async (roleId) => {
    const res = await App.api(`roles/${roleId}`);
    if (!res || !res.success) return;

    const role = res.data;
    document.getElementById('form-role-id').value = role.id;
    document.getElementById('form-role-label').value = role.label;
    document.getElementById('role-perm-title').innerHTML = `<i class="ri-shield-user-line text-primary-600"></i><span>Atur Izin: ${role.label}</span>`;
    document.getElementById('role-perm-desc').textContent = `Ubah hak akses fitur untuk pengguna dengan peran ${role.name}.`;

    const matrixCont = document.getElementById('permissions-matrix');
    const assigned = role.permissions || [];

    matrixCont.innerHTML = Object.keys(allPermissions).map(cat => `
        <div class="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div class="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-primary-500"></span>
                <span>Modul ${cat}</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                ${allPermissions[cat].map(p => `
                    <label class="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-900 cursor-pointer transition">
                        <input type="checkbox" name="role_perms" value="${p.kode}" ${assigned.includes(p.kode) ? 'checked' : ''}
                               class="perm-checkbox text-primary-600 rounded focus:ring-primary-500">
                        <div>
                            <div class="font-semibold text-slate-800 dark:text-slate-200">${p.nama}</div>
                            <div class="text-[10px] font-mono text-slate-400">${p.kode}</div>
                        </div>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');

    document.getElementById('role-perm-modal').classList.remove('hidden');
};

window.toggleAllPerms = (check) => {
    document.querySelectorAll('.perm-checkbox').forEach(cb => {
        cb.checked = check;
    });
};

async function handleSaveRolePermissions(e) {
    e.preventDefault();
    const roleId = document.getElementById('form-role-id').value;
    const label = document.getElementById('form-role-label').value.trim();

    const checkedPerms = [];
    document.querySelectorAll('.perm-checkbox:checked').forEach(cb => {
        checkedPerms.push(cb.value);
    });

    const body = {
        label,
        permissions: checkedPerms
    };

    const res = await App.api(`roles/${roleId}`, { method: 'PUT', body });
    if (res && res.success) {
        App.toast(res.message, 'success');
        document.getElementById('role-perm-modal').classList.add('hidden');
        loadRoles();
    }
}
