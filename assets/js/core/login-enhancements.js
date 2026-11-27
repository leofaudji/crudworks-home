// assets/js/core/login-enhancements.js — Caps Lock, Remember Username, Lupa & Reset Password
import { api } from './api.js';
import { promptAction, toast } from './utils.js';

const SAVED_USER_KEY = 'crudworks_saved_username';

export function initLoginEnhancements() {
    const userEl = document.getElementById('login-username');
    const passEl = document.getElementById('login-password');
    const rememberEl = document.getElementById('login-remember-username');
    const capsWarn = document.getElementById('login-capslock-warn');
    const formEl = document.getElementById('login-form');
    const forgotBtn = document.getElementById('btn-forgot-password');

    // 1. Ingat Username
    const savedUser = localStorage.getItem(SAVED_USER_KEY) || '';
    if (savedUser && userEl && rememberEl) {
        userEl.value = savedUser;
        rememberEl.checked = true;
    }

    if (formEl && userEl && rememberEl) {
        formEl.addEventListener('submit', () => {
            if (rememberEl.checked && userEl.value.trim()) {
                localStorage.setItem(SAVED_USER_KEY, userEl.value.trim());
            } else {
                localStorage.removeItem(SAVED_USER_KEY);
            }
        });
    }

    // 2. Deteksi Caps Lock
    if (passEl && capsWarn) {
        const updateCaps = (e) => {
            if (typeof e.getModifierState === 'function') {
                capsWarn.classList.toggle('hidden', !e.getModifierState('CapsLock'));
            }
        };
        passEl.addEventListener('keydown', updateCaps);
        passEl.addEventListener('keyup', updateCaps);
        passEl.addEventListener('blur', () => capsWarn.classList.add('hidden'));
    }

    // 3. Lupa Password
    if (forgotBtn) {
        forgotBtn.addEventListener('click', async () => {
            const identifier = await promptAction({
                title: 'Lupa Kata Sandi?',
                text: 'Kami akan mengirimkan tautan atur ulang kata sandi ke email yang terdaftar pada akun Anda.',
                icon: 'question',
                label: 'Username atau Email',
                placeholder: 'username atau email@perusahaan.com',
                value: userEl?.value.trim() || '',
                confirmBtnText: 'Kirim Tautan Reset',
                cancelBtnText: 'Batal',
                required: true
            });
            if (!identifier) return;
            const res = await api('auth/forgot-password', {
                method: 'POST',
                body: { identifier }
            });
            if (res?.success) {
                toast(res.message, 'success');
            }
        });
    }

    // 4. Tangani hash #/reset-password?token=... setelah splash screen selesai
    setTimeout(() => checkResetPasswordHash(), 550);
    window.addEventListener('hashchange', () => checkResetPasswordHash());
}

export async function checkResetPasswordHash() {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#/reset-password')) return;
    const qIdx = hash.indexOf('?');
    const qs = qIdx !== -1 ? new URLSearchParams(hash.slice(qIdx + 1)) : new URLSearchParams();
    const token = qs.get('token') || '';
    if (!token) return;

    const newPassword = await promptAction({
        title: 'Atur Ulang Kata Sandi',
        text: 'Masukkan kata sandi baru untuk akun Anda (minimal 6 karakter).',
        icon: 'question',
        type: 'password',
        label: 'Kata Sandi Baru',
        placeholder: '••••••••',
        confirmBtnText: 'Simpan Kata Sandi',
        cancelBtnText: 'Batal',
        required: true,
        minLength: 6,
        trim: false,
        autocomplete: 'new-password'
    });

    if (newPassword) {
        const res = await api('auth/reset-password', {
            method: 'POST',
            body: { token, new_password: newPassword }
        });
        if (res?.success) {
            toast(res.message, 'success');
            history.replaceState(null, '', window.location.pathname);
        }
    }
}
