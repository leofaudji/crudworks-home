// assets/js/core/profile-modal.js — Modal Profil Pengguna, Ganti Password, 2FA & Sesi Aktif
import { api } from './api.js';
import { AuthState } from './auth.js';
import { btnLoading, closeModal, confirmAction, escapeHtml, openModal, toast } from './utils.js';

export const profileModalMethods = {
    openProfileModal(activeTab = 'profile') {
        const u = AuthState.user || {};
        const tab = ['profile', 'password', 'security'].includes(activeTab) ? activeTab : 'profile';
        const initials = (u.nama_lengkap || u.username || 'U').trim().charAt(0).toUpperCase();
        const is2faOn = Number(u.totp_enabled) === 1;

        openModal(`
            <div class="overflow-hidden">
                <!-- Header Profil -->
                <div class="px-6 pt-6 pb-4 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 border-b border-slate-100 dark:border-slate-800">
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex items-center gap-3.5 min-w-0">
                            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-sm shrink-0">
                                ${escapeHtml(initials)}
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="text-base font-bold text-slate-900 dark:text-white truncate">${escapeHtml(u.nama_lengkap || u.username || 'Pengguna')}</h3>
                                    <button type="button" onclick="App.switchProfileTab('security')"
                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${is2faOn ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'}"
                                        title="Klik untuk kelola keamanan 2FA">
                                        <i class="${is2faOn ? 'ri-shield-check-fill' : 'ri-shield-line'}"></i>
                                        <span>${is2faOn ? '2FA Aktif' : '2FA Nonaktif'}</span>
                                    </button>
                                </div>
                                <p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">@${escapeHtml(u.username || '-')} · ${escapeHtml(u.role || '-')}</p>
                            </div>
                        </div>
                        <button type="button" onclick="App.closeModal()" class="w-8 h-8 rounded-full bg-white/90 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700 flex items-center justify-center text-slate-500 shrink-0 transition" title="Tutup">
                            <i class="ri-close-line text-lg"></i>
                        </button>
                    </div>

                    <!-- Navigasi 3 Tab -->
                    <div class="grid grid-cols-3 gap-1.5 p-1 mt-4 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-800">
                        <button type="button" onclick="App.switchProfileTab('profile')" id="prof-tab-profile"
                            class="py-2 px-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${tab === 'profile' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
                            <i class="ri-user-3-line"></i><span>Profil</span>
                        </button>
                        <button type="button" onclick="App.switchProfileTab('password')" id="prof-tab-password"
                            class="py-2 px-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${tab === 'password' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
                            <i class="ri-lock-password-line"></i><span>Password</span>
                        </button>
                        <button type="button" onclick="App.switchProfileTab('security')" id="prof-tab-security"
                            class="py-2 px-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${tab === 'security' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
                            <i class="ri-shield-keyhole-line text-indigo-600 dark:text-indigo-400"></i><span>Keamanan</span>
                        </button>
                    </div>
                </div>

                <!-- Body Modal -->
                <div class="p-6 max-h-[70vh] overflow-y-auto">
                    <!-- Tab 1: Profil -->
                    <form id="prof-panel-profile" onsubmit="App.saveProfile(this, event)" class="${tab === 'profile' ? '' : 'hidden'} space-y-4">
                        <div class="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs">
                            <div>
                                <span class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Username</span>
                                <span class="font-mono font-bold text-slate-700 dark:text-slate-200">${escapeHtml(u.username || '-')}</span>
                            </div>
                            <div>
                                <span class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hak Akses</span>
                                <span class="font-semibold text-slate-700 dark:text-slate-200">${escapeHtml(u.role || '-')}</span>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Lengkap *</label>
                                <div class="relative">
                                    <i class="ri-user-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                    <input type="text" name="nama_lengkap" required value="${escapeHtml(u.nama_lengkap || '')}" placeholder="Nama lengkap Anda"
                                           class="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition">
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                                <div class="relative">
                                    <i class="ri-mail-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                    <input type="email" name="email" value="${escapeHtml(u.email || '')}" placeholder="nama@perusahaan.com"
                                           class="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition">
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span class="text-[11px] text-slate-400">Perubahan nama &amp; email langsung berlaku.</span>
                            <button type="submit" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition">
                                <i class="ri-save-3-line"></i><span>Simpan Profil</span>
                            </button>
                        </div>
                    </form>

                    <!-- Tab 2: Ganti Password -->
                    <form id="prof-panel-password" onsubmit="App.savePassword(this, event)" class="${tab === 'password' ? '' : 'hidden'} space-y-4">
                        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                            <i class="ri-information-line text-primary-600 text-base shrink-0"></i>
                            <span>Gunakan minimal 6 karakter kombinasi huruf dan angka agar akun lebih aman.</span>
                        </div>

                        <div class="space-y-3">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password Saat Ini *</label>
                                <div class="relative">
                                    <input type="password" name="current_password" required placeholder="Masukkan password saat ini"
                                           class="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition">
                                    <button type="button" onclick="App.toggleInputVisibility(this)" class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Lihat/Sembunyikan">
                                        <i class="ri-eye-line"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password Baru *</label>
                                    <div class="relative">
                                        <input type="password" name="new_password" id="prof-new-pw" required minlength="6" placeholder="Minimal 6 karakter" oninput="App._checkPasswordMatch()"
                                               class="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition">
                                        <button type="button" onclick="App.toggleInputVisibility(this)" class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Lihat/Sembunyikan">
                                            <i class="ri-eye-line"></i>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Ulangi Password Baru *</label>
                                    <div class="relative">
                                        <input type="password" name="confirm_password" id="prof-confirm-pw" required minlength="6" placeholder="Ketik ulang password baru" oninput="App._checkPasswordMatch()"
                                               class="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition">
                                        <button type="button" onclick="App.toggleInputVisibility(this)" class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Lihat/Sembunyikan">
                                            <i class="ri-eye-line"></i>
                                        </button>
                                    </div>
                                    <div id="prof-pw-match-hint" class="text-[11px] mt-1 min-h-[16px]"></div>
                                </div>
                            </div>
                        </div>

                        <div class="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button type="submit" class="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-primary-600 dark:hover:bg-primary-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition">
                                <i class="ri-key-2-line"></i><span>Perbarui Password</span>
                            </button>
                        </div>
                    </form>

                    <!-- Tab 3: Keamanan (2FA & Sesi) -->
                    <div id="prof-panel-security" class="${tab === 'security' ? '' : 'hidden'} space-y-5">
                        <!-- Kartu 2FA Authenticator (TOTP) -->
                        <div class="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3">
                            <div class="flex items-start justify-between gap-3">
                                <div class="flex items-start gap-2.5">
                                    <div class="w-9 h-9 rounded-xl ${is2faOn ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'} flex items-center justify-center shrink-0">
                                        <i class="ri-shield-keyhole-line text-lg"></i>
                                    </div>
                                    <div>
                                        <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100">Autentikasi Dua Faktor (2FA TOTP)</h4>
                                        <p class="text-[11px] text-slate-500 dark:text-slate-400">Verifikasi tambahan via Google Authenticator / Authy saat login</p>
                                    </div>
                                </div>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${is2faOn ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}">
                                    ${is2faOn ? 'AKTIF' : 'NONAKTIF'}
                                </span>
                            </div>

                            <div id="profile-2fa-box">
                                ${is2faOn ? `
                                    <div class="flex flex-col sm:flex-row gap-2 pt-1">
                                        <div class="relative flex-1">
                                            <input type="password" id="disable-2fa-pw" placeholder="Masukkan password akun untuk nonaktifkan 2FA"
                                                   onkeydown="if(event.key==='Enter'){event.preventDefault();App.disableTwoFactor();}"
                                                   class="w-full pl-3.5 pr-10 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:border-rose-400">
                                            <button type="button" onclick="App.toggleInputVisibility(this)" class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600" title="Lihat/Sembunyikan">
                                                <i class="ri-eye-line"></i>
                                            </button>
                                        </div>
                                        <button type="button" onclick="App.disableTwoFactor()" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold whitespace-nowrap transition">Nonaktifkan 2FA</button>
                                    </div>
                                ` : `
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                                        <span class="text-[11px] text-slate-500">Direkomendasikan untuk melindungi akses akun Anda.</span>
                                        <button type="button" onclick="App.setupTwoFactor()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 transition">
                                            <i class="ri-qr-code-line"></i><span>Aktifkan 2FA Authenticator</span>
                                        </button>
                                    </div>
                                `}
                            </div>
                        </div>

                        <!-- Kartu Manajemen Sesi Aktif -->
                        <div class="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-3">
                            <div class="flex items-center justify-between gap-2 flex-wrap">
                                <div class="flex items-center gap-2">
                                    <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100">Sesi Login Aktif</h4>
                                    <span id="profile-sessions-count" class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">0</span>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <button type="button" onclick="App.loadUserSessions()" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition" title="Muat ulang daftar sesi">
                                        <i class="ri-refresh-line text-xs"></i>
                                    </button>
                                    <button type="button" onclick="App.revokeOtherSessions()" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-300 rounded-lg text-[11px] font-semibold transition">
                                        Keluar Perangkat Lain
                                    </button>
                                </div>
                            </div>
                            <div id="profile-sessions-list" class="space-y-2 max-h-52 overflow-y-auto text-xs">
                                <div class="text-slate-400 text-center py-4">Memuat daftar sesi…</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `, 'max-w-2xl');
        if (tab === 'security') this.loadUserSessions();
    },

    switchProfileTab(tab) {
        const target = ['profile', 'password', 'security'].includes(tab) ? tab : 'profile';
        ['profile', 'password', 'security'].forEach((t) => {
            document.getElementById(`prof-panel-${t}`)?.classList.toggle('hidden', t !== target);
            const btn = document.getElementById(`prof-tab-${t}`);
            if (!btn) return;
            const active = t === target;
            ['bg-white', 'dark:bg-slate-900', 'text-slate-900', 'dark:text-white', 'shadow-xs'].forEach((c) => btn.classList.toggle(c, active));
            ['text-slate-600', 'dark:text-slate-400'].forEach((c) => btn.classList.toggle(c, !active));
        });
        if (target === 'security') this.loadUserSessions();
    },

    toggleInputVisibility(btn) {
        const input = btn?.parentElement?.querySelector('input');
        const icon = btn?.querySelector('i');
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        if (icon) icon.className = show ? 'ri-eye-off-line' : 'ri-eye-line';
    },

    _checkPasswordMatch() {
        const np = document.getElementById('prof-new-pw')?.value || '';
        const cp = document.getElementById('prof-confirm-pw')?.value || '';
        const hint = document.getElementById('prof-pw-match-hint');
        if (!hint) return;
        if (!cp) {
            hint.innerHTML = '';
            return;
        }
        if (np === cp) {
            hint.innerHTML = '<span class="text-emerald-600 dark:text-emerald-400 font-medium"><i class="ri-check-line"></i> Password cocok</span>';
        } else {
            hint.innerHTML = '<span class="text-rose-600 dark:text-rose-400 font-medium"><i class="ri-close-line"></i> Password belum cocok</span>';
        }
    },

    _parseDeviceLabel(ua = '') {
        const s = String(ua || '');
        const isMobile = /Android|iPhone|iPad|Mobile/i.test(s);
        let os = 'Perangkat';
        if (/Windows/i.test(s)) os = 'Windows';
        else if (/iPhone|iPad/i.test(s)) os = 'iOS';
        else if (/Android/i.test(s)) os = 'Android';
        else if (/Mac OS|Macintosh/i.test(s)) os = 'macOS';
        else if (/Linux/i.test(s)) os = 'Linux';

        let browser = 'Browser';
        if (/Edg\//i.test(s)) browser = 'Microsoft Edge';
        else if (/OPR\//i.test(s)) browser = 'Opera';
        else if (/Chrome\//i.test(s)) browser = 'Google Chrome';
        else if (/Firefox\//i.test(s)) browser = 'Firefox';
        else if (/Safari\//i.test(s)) browser = 'Safari';

        return {
            label: `${browser} · ${os}`,
            icon: isMobile ? 'ri-smartphone-line' : 'ri-computer-line'
        };
    },

    async copyTwoFactorSecret(secret, btn) {
        try {
            await navigator.clipboard.writeText(secret);
            if (btn) {
                const orig = btn.innerHTML;
                btn.innerHTML = '<i class="ri-check-line"></i><span>Tersalin</span>';
                setTimeout(() => { btn.innerHTML = orig; }, 1800);
            }
            toast('Kode rahasia 2FA disalin', 'success');
        } catch {
            toast('Gagal menyalin kode rahasia', 'error');
        }
    },

    async setupTwoFactor() {
        const res = await api('auth/2fa/setup', { method: 'POST' });
        if (!res?.success || !res.data) return;
        const box = document.getElementById('profile-2fa-box');
        if (!box) return;
        const secretEsc = escapeHtml(res.data.secret);
        box.innerHTML = `
            <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/60 space-y-4">
                <div class="flex flex-col sm:flex-row items-center gap-4">
                    <img src="${escapeHtml(res.data.qr_url)}" alt="QR Code 2FA" width="136" height="136" class="w-34 h-34 rounded-xl border border-slate-200 bg-white p-1.5 shrink-0">
                    <div class="space-y-2 text-xs min-w-0 w-full">
                        <div class="font-bold text-slate-800 dark:text-slate-100">Langkah 1 — Scan QR di Aplikasi Authenticator</div>
                        <p class="text-[11px] text-slate-500">Jika tidak bisa scan kamera, salin kunci manual berikut:</p>
                        <div class="flex items-center gap-2">
                            <code class="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-indigo-600 dark:text-indigo-400 select-all break-all">${secretEsc}</code>
                            <button type="button" onclick="App.copyTwoFactorSecret('${secretEsc}', this)" class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 transition">
                                <i class="ri-file-copy-line"></i><span>Salin</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div class="text-xs font-bold text-slate-800 dark:text-slate-100">Langkah 2 — Masukkan Kode 6 Digit</div>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <input type="text" id="enable-2fa-code" inputmode="numeric" maxlength="6" placeholder="000000"
                               oninput="this.value=this.value.replace(/\\D/g,'').slice(0,6)"
                               onkeydown="if(event.key==='Enter'){event.preventDefault();App.enableTwoFactor();}"
                               class="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-mono font-bold text-center tracking-[0.35em] outline-none focus:border-emerald-500">
                        <button type="button" onclick="App.enableTwoFactor()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold whitespace-nowrap transition">Verifikasi &amp; Aktifkan</button>
                        <button type="button" onclick="App.openProfileModal('security')" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition">Batal</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('enable-2fa-code')?.focus();
    },

    async enableTwoFactor() {
        const code = (document.getElementById('enable-2fa-code')?.value || '').trim();
        if (code.length !== 6) {
            toast('Masukkan 6 digit kode dari Authenticator', 'error');
            document.getElementById('enable-2fa-code')?.focus();
            return;
        }
        const res = await api('auth/2fa/enable', { method: 'POST', body: { totp_code: code } });
        if (res?.success) {
            AuthState.user = { ...AuthState.user, totp_enabled: 1 };
            toast('2FA Authenticator berhasil diaktifkan', 'success');
            this.openProfileModal('security');
        }
    },

    async disableTwoFactor() {
        const pwEl = document.getElementById('disable-2fa-pw');
        const pw = pwEl?.value || '';
        if (!pw) {
            toast('Masukkan password akun Anda terlebih dahulu', 'error');
            pwEl?.focus();
            return;
        }
        const res = await api('auth/2fa/disable', { method: 'POST', body: { password: pw } });
        if (res?.success) {
            AuthState.user = { ...AuthState.user, totp_enabled: 0 };
            toast('2FA Authenticator dinonaktifkan', 'info');
            this.openProfileModal('security');
        }
    },

    async loadUserSessions() {
        const el = document.getElementById('profile-sessions-list');
        const countEl = document.getElementById('profile-sessions-count');
        if (!el) return;
        const res = await api('auth/sessions', { cache: false, silent: true });
        if (!res?.success || !Array.isArray(res.data)) {
            el.innerHTML = `<div class="text-slate-400 text-center py-3">Gagal memuat daftar sesi</div>`;
            return;
        }
        if (countEl) countEl.textContent = String(res.data.length);
        if (res.data.length === 0) {
            el.innerHTML = `<div class="text-slate-400 text-center py-3">Belum ada sesi aktif tercatat</div>`;
            return;
        }
        el.innerHTML = res.data.map((s) => {
            const dev = this._parseDeviceLabel(s.user_agent);
            return `
                <div class="p-3 rounded-xl border ${s.is_current ? 'border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20' : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30'} flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-8 h-8 rounded-lg ${s.is_current ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-300'} flex items-center justify-center shrink-0">
                            <i class="${dev.icon} text-base"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-semibold text-slate-800 dark:text-slate-100">${escapeHtml(dev.label)}</span>
                                <span class="font-mono text-[11px] text-slate-500">${escapeHtml(s.ip_address || '-')}</span>
                                ${s.is_current ? '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-300 text-[10px] font-bold">Perangkat Ini</span>' : ''}
                            </div>
                            <div class="text-[11px] text-slate-400 truncate">Aktif terakhir: ${escapeHtml(s.last_activity || '-')}</div>
                        </div>
                    </div>
                    ${s.is_current ? '' : `<button type="button" onclick="App.revokeUserSession(${s.id})" class="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-300 font-semibold text-[11px] shrink-0 transition">Cabut</button>`}
                </div>
            `;
        }).join('');
    },

    async revokeUserSession(id) {
        const ok = await confirmAction('Cabut Sesi Perangkat?', 'Perangkat tersebut akan langsung keluar dan perlu login ulang.', 'Ya, Cabut');
        if (!ok) return;
        const res = await api('auth/sessions/revoke', { method: 'POST', body: { id } });
        if (res?.success) {
            toast('Sesi perangkat dicabut', 'success');
            this.loadUserSessions();
        }
    },

    async revokeOtherSessions() {
        const ok = await confirmAction('Keluar dari Semua Perangkat Lain?', 'Hanya sesi di perangkat ini yang akan tetap aktif.', 'Ya, Keluarkan');
        if (!ok) return;
        const res = await api('auth/sessions/revoke', { method: 'POST', body: { all_others: true } });
        if (res?.success) {
            toast('Semua sesi perangkat lain dicabut', 'success');
            this.loadUserSessions();
        }
    },

    async saveProfile(form, e) {
        if (e) e.preventDefault();
        const fd = new FormData(form);
        const btn = form.querySelector('button[type="submit"]');
        btnLoading(btn, true);
        const res = await api('auth/profile', {
            method: 'PUT',
            body: {
                nama_lengkap: fd.get('nama_lengkap'),
                email: fd.get('email')
            }
        });
        btnLoading(btn, false);
        if (res?.success) {
            AuthState.user = { ...AuthState.user, ...res.data };
            this._syncUserUI();
            nav.syncUserToTaskbar();
            toast('Profil berhasil diperbarui', 'success');
        }
    },

    async savePassword(form, e) {
        if (e) e.preventDefault();
        const fd = new FormData(form);
        const btn = form.querySelector('button[type="submit"]');
        btnLoading(btn, true);
        const res = await api('auth/password', {
            method: 'PUT',
            body: {
                current_password: fd.get('current_password'),
                new_password: fd.get('new_password'),
                confirm_password: fd.get('confirm_password')
            }
        });
        btnLoading(btn, false);
        if (res?.success) {
            form.reset();
            toast('Password berhasil diperbarui', 'success');
        }
    },

    // ===== Global Shortcuts & Ripple =====
};
