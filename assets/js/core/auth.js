// ============================================
// CORE AUTHENTICATION - Session, Login, Logout & RBAC Permissions
// ============================================
import { api, apiClient, clearApiCache } from './api.js';
import { confirmAction, toast } from './utils.js';

export const AuthState = {
    user: null,
    menus: [],
    permissions: [],
    csrfToken: ''
};

export function setCsrfToken(token) {
    AuthState.csrfToken = token || '';
    apiClient.setCsrfToken(AuthState.csrfToken);
}

export function setUserSession(data) {
    if (!data || !data.user) return;
    AuthState.user = data.user;
    AuthState.menus = Array.isArray(data.menus) ? data.menus : [];
    AuthState.permissions = Array.isArray(data.permissions) ? data.permissions : [];
    if (data.csrf_token) {
        setCsrfToken(data.csrf_token);
    }
}

export function clearUserSession() {
    AuthState.user = null;
    AuthState.menus = [];
    AuthState.permissions = [];
    setCsrfToken('');
    clearApiCache();
}

/**
 * Check if current user holds a specific permission code
 */
export function hasPerm(code) {
    if (!AuthState.user) return false;
    if (Number(AuthState.user.role_id) === 1) return true; // Super Admin
    if (!code) return true;
    return AuthState.permissions.includes(code);
}

/**
 * Check active session via GET auth/me
 */
export async function checkSession() {
    const res = await api('auth/me', { cache: false, silent: true });
    if (res && res.success && res.data && res.data.user) {
        setUserSession(res.data);
        return { authenticated: true, data: res.data };
    }
    clearUserSession();
    return { authenticated: false, data: null };
}

/**
 * Authenticate user via POST auth/login
 */
export async function login(username, password, totpCode = '') {
    const payload = { username, password };
    if (totpCode) payload.totp_code = totpCode;

    const res = await api('auth/login', {
        method: 'POST',
        body: payload,
        silent: true // Supaya pesan error ditangani rapi di card form login, bukan dobel toast
    });

    if (res?.requires_2fa) {
        return {
            success: false,
            requires_2fa: true,
            message: res.message
        };
    }

    if (res && res.success && res.data && res.data.user) {
        setUserSession(res.data);
        return { success: true, data: res.data, message: res.message || 'Login berhasil' };
    }

    return {
        success: false,
        message: (res && res.message) ? res.message : 'Username atau password salah'
    };
}

/**
 * Log out current user with confirmation prompt
 */
export async function logout(onLoggedOut = null) {
    const confirmed = await confirmAction(
        'Keluar dari Sistem',
        'Apakah Anda yakin ingin mengakhiri sesi saat ini?',
        'warning',
        'Ya, Logout',
        'Batal'
    );
    if (!confirmed) return false;

    await api('auth/logout', { method: 'POST', silent: true });
    clearUserSession();
    try {
        sessionStorage.removeItem('app_opened_tabs');
    } catch (_) {}

    if (typeof onLoggedOut === 'function') {
        onLoggedOut();
    }
    toast('Anda telah keluar dari sistem', 'info', 2500);
    return true;
}
