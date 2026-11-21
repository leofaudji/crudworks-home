// portal/pages/login.js — Halaman Login Mandiri Portal Klien
import { $, esc, api, state, hooks } from '../ctx.js';

const LAST_ID_KEY = 'crudworks_portal_last_id';

export function renderLogin(notice = '') {
    const lastId = (() => { try { return localStorage.getItem(LAST_ID_KEY) || ''; } catch (_) { return ''; } })();
    $('#app').innerHTML = `
        <div class="min-h-screen bg-slate-50 dark:bg-slate-950 bg-dot-grid flex flex-col items-center justify-center px-4 py-10">
            <div class="w-full max-w-[380px] space-y-5 fade-in">
                <div class="flex items-center gap-3">
                    <img src="../assets/images/logo.png" alt="CRUDWorks" class="h-8 w-auto object-contain" onerror="this.style.display='none'">
                    <div class="h-5 w-px bg-slate-200 dark:bg-slate-800"></div>
                    <span class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Portal Klien</span>
                </div>

                <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-[0_8px_30px_rgba(15,23,42,0.06)] p-6 sm:p-7 space-y-5">
                    <div>
                        <h1 class="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Masuk ke Akun Anda</h1>
                        <p class="text-xs text-slate-500 mt-1 leading-relaxed">Akses progres proyek, tiket gangguan, pengesahan BAST, layanan, dan faktur tagihan.</p>
                    </div>

                    <form id="login-form" class="space-y-4" novalidate>
                        <div id="login-error" class="${notice ? '' : 'hidden'} flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium">
                            <i class="ri-error-warning-line text-sm shrink-0 mt-0.5"></i><span id="login-error-text">${esc(notice)}</span>
                        </div>
                        <div class="space-y-1.5">
                            <label for="login-id" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Kode Klien atau Email</label>
                            <input id="login-id" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" required value="${esc(lastId)}" placeholder="CLI-0001 atau email@perusahaan.com"
                                class="w-full px-3.5 py-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition">
                        </div>
                        <div class="space-y-1.5">
                            <label for="login-pw" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Kata Sandi</label>
                            <div class="relative">
                                <input id="login-pw" type="password" autocomplete="current-password" required placeholder="••••••••"
                                    class="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition">
                                <button type="button" data-action="toggle-pw" data-target="login-pw" class="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md text-slate-400 hover:text-slate-600" aria-label="Tampilkan kata sandi"><i class="ri-eye-line"></i></button>
                            </div>
                        </div>
                        <button id="login-submit" type="submit" class="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-sm">
                            <span>Masuk ke Portal</span>
                            <i class="ri-arrow-right-line text-sm"></i>
                        </button>
                    </form>
                </div>

                <div class="flex flex-col gap-2">
                    <button type="button" data-install data-action="install" class="${hooks.canOfferInstall() ? '' : 'hidden'} w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs">
                        <i class="ri-install-line"></i> Pasang Aplikasi di Perangkat
                    </button>
                    <p class="text-[11px] text-center text-slate-400">Belum memiliki kata sandi? Hubungi tim admin CRUDWorks untuk aktivasi.</p>
                </div>
            </div>
        </div>`;

    $('#login-form').addEventListener('submit', onLoginSubmit);
    (lastId ? $('#login-pw') : $('#login-id'))?.focus();
}

async function onLoginSubmit(e) {
    e.preventDefault();
    const idEl = $('#login-id');
    const pwEl = $('#login-pw');
    const btn = $('#login-submit');
    const errBox = $('#login-error');
    const errText = $('#login-error-text');
    const fail = (msg) => { errText.textContent = msg; errBox.classList.remove('hidden'); };

    errBox.classList.add('hidden');
    if (!idEl.value.trim() || !pwEl.value) { fail('Kode klien/email dan kata sandi wajib diisi'); return; }

    btn.disabled = true;
    btn.classList.add('opacity-70');
    btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i><span>Memeriksa…</span>';

    const res = await api('portal-auth/login', { method: 'POST', body: { identifier: idEl.value.trim(), password: pwEl.value }, silent: true });

    if (res.success) {
        try { localStorage.setItem(LAST_ID_KEY, idEl.value.trim()); } catch (_) {}
        state.csrf = res.data.csrf_token;
        state.client = res.data.client;
        state.data = null;
        state.tab = 'projects';
        $('#app').innerHTML = '<div class="min-h-screen flex items-center justify-center"><i class="ri-loader-4-line text-3xl text-slate-500 animate-spin"></i></div>';
        await hooks.reloadData({ silent: true });
        if (!state.data) renderLogin('Login berhasil, tetapi data gagal dimuat. Coba lagi.');
        return;
    }

    btn.disabled = false;
    btn.classList.remove('opacity-70');
    btn.innerHTML = '<span>Masuk ke Portal</span><i class="ri-arrow-right-line text-sm"></i>';
    pwEl.value = '';
    pwEl.focus();
    fail(res.network_error ? 'Tidak dapat terhubung ke server. Periksa koneksi Anda.' : (res.message || 'Login gagal'));
}
