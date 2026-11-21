// portal/pages/account.js — Profil Akun Klien, Ganti Kata Sandi & Pengaturan PWA
import { $, esc, api, toast, openModal, closeModal, state, hooks } from '../ctx.js';

export function openAccountModal() {
    const c = state.client || {};
    openModal(`
        <div class="p-5 sm:p-6 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 class="text-base font-bold">Akun Saya</h3>
                <button data-action="close-modal" class="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Tutup"><i class="ri-close-line text-xl"></i></button>
            </div>
            <div class="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 p-3.5 text-xs space-y-1">
                <div class="font-bold text-sm text-slate-900 dark:text-white">${esc(c.nama_perusahaan)}</div>
                <div class="text-slate-500">UP: <b>${esc(c.penanggung_jawab || '-')}</b> · <span class="font-mono">${esc(c.kode_klien || '')}</span></div>
                <div class="text-slate-500">${esc(c.email || '')}${c.telepon ? ' · ' + esc(c.telepon) : ''}</div>
                ${c.portal_last_login_at ? `<div class="text-[11px] text-slate-400 font-mono">Login sebelumnya: ${esc(new Date(String(c.portal_last_login_at).replace(' ', 'T')).toLocaleString('id-ID'))}</div>` : ''}
            </div>

            <form id="pw-form" class="space-y-3" novalidate>
                <div class="text-xs font-bold uppercase tracking-wider text-slate-500">Ganti Kata Sandi</div>
                <input id="pw-current" type="password" autocomplete="current-password" placeholder="Kata sandi saat ini" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-primary-500">
                <input id="pw-new" type="password" autocomplete="new-password" placeholder="Kata sandi baru (min. 8 karakter)" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-primary-500">
                <input id="pw-confirm" type="password" autocomplete="new-password" placeholder="Ulangi kata sandi baru" class="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-primary-500">
                <button id="pw-submit" type="submit" class="w-full py-2.5 rounded-lg bg-slate-900 dark:bg-primary-600 text-white text-sm font-semibold">Simpan Kata Sandi</button>
            </form>

            <button type="button" data-install data-action="install" class="${hooks.canOfferInstall() ? '' : 'hidden'} w-full py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2"><i class="ri-install-line"></i> Pasang di Layar Utama</button>
            <button type="button" data-action="logout" class="w-full py-2.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm font-semibold flex items-center justify-center gap-2"><i class="ri-logout-box-r-line"></i> Keluar</button>
        </div>`);

    $('#pw-form').addEventListener('submit', submitPassword);
}

async function submitPassword(e) {
    e.preventDefault();
    const cur = $('#pw-current').value;
    const nw = $('#pw-new').value;
    const cf = $('#pw-confirm').value;
    if (!cur || !nw) { toast('Lengkapi seluruh isian kata sandi', 'warning'); return; }
    if (nw.length < 8) { toast('Kata sandi baru minimal 8 karakter', 'warning'); return; }
    if (nw !== cf) { toast('Konfirmasi kata sandi tidak sama', 'warning'); return; }

    const btn = $('#pw-submit');
    btn.disabled = true; btn.classList.add('opacity-70');
    const res = await api('portal-auth/change-password', { method: 'POST', body: { current_password: cur, new_password: nw } });
    btn.disabled = false; btn.classList.remove('opacity-70');
    if (res.success) { toast('Kata sandi berhasil diperbarui', 'success'); closeModal(); }
}
