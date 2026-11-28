// assets/js/core/status-badges.js — Pemetaan & Render Status Badge Terpusat
import { escapeHtml } from './utils.js';

export function renderStatusBadge(status, domain = 'general') {
    const s = String(status || '').toLowerCase().trim();

    let variant = 'neutral'; // 'success' | 'warning' | 'danger' | 'info' | 'neutral'
    let label = status || '-';
    let icon = '';
    let pulse = false;

    switch (s) {
        // Success states
        case 'lunas':
        case 'paid':
            variant = 'success';
            label = 'Lunas';
            icon = 'ri-checkbox-circle-fill';
            break;
        case 'aktif':
        case 'active':
            variant = 'success';
            label = 'Aktif';
            icon = 'ri-check-line';
            break;
        case 'disetujui':
        case 'approved':
            variant = 'success';
            label = 'Disetujui';
            icon = 'ri-checkbox-circle-fill';
            break;
        case 'selesai':
        case 'completed':
            variant = 'success';
            label = 'Selesai';
            icon = 'ri-check-double-line';
            break;
        case 'success':
        case 'deployed':
            variant = 'success';
            label = 'Deployed';
            icon = 'ri-checkbox-circle-fill';
            break;
        case 'verified':
        case 'terverifikasi':
            variant = 'success';
            label = 'Terverifikasi';
            icon = 'ri-shield-check-fill';
            break;

        // Warning states
        case 'sebagian':
        case 'partial':
            variant = 'warning';
            label = 'Bayar Sebagian';
            icon = 'ri-pie-chart-2-fill';
            break;
        case 'prospek':
        case 'lead':
            variant = 'warning';
            label = 'Prospek';
            icon = 'ri-user-star-line';
            break;
        case 'perencanaan':
        case 'planning':
            variant = 'warning';
            label = 'Perencanaan';
            icon = 'ri-compass-3-line';
            break;
        case 'pending':
        case 'menunggu':
            variant = 'warning';
            label = 'Menunggu';
            icon = 'ri-time-line';
            break;
        case 'kadaluarsa':
        case 'expired':
            variant = 'warning';
            label = 'Kadaluarsa';
            icon = 'ri-hourglass-2-line';
            break;

        // Danger states
        case 'jatuh_tempo':
        case 'overdue':
            variant = 'danger';
            label = 'Jatuh Tempo';
            icon = 'ri-alarm-warning-fill';
            pulse = true;
            break;
        case 'failed':
        case 'gagal':
            variant = 'danger';
            label = 'Gagal';
            icon = 'ri-close-circle-fill';
            break;
        case 'ditolak':
        case 'rejected':
            variant = 'danger';
            label = 'Ditolak';
            icon = 'ri-close-line';
            break;
        case 'dibatalkan':
        case 'batal':
        case 'cancelled':
            variant = 'danger';
            label = 'Dibatalkan';
            icon = 'ri-forbid-line';
            break;

        // Info / In-Progress states
        case 'dikirim':
        case 'sent':
            variant = 'info';
            label = 'Belum Bayar';
            icon = 'ri-send-plane-2-line';
            break;
        case 'running':
        case 'deploying':
            variant = 'info';
            label = 'Deploying...';
            icon = 'ri-loader-4-line';
            pulse = true;
            break;
        case 'maintenance':
            variant = 'info';
            label = 'Maintenance';
            icon = 'ri-tools-fill';
            break;
        case 'sudah_ditagih':
        case 'billed':
            variant = 'info';
            label = 'Ditagihkan';
            icon = 'ri-file-check-line';
            break;

        // Neutral states
        case 'draft':
        case 'draf':
            variant = 'neutral';
            label = 'Draf';
            icon = 'ri-edit-line';
            break;
        case 'nonaktif':
        case 'inactive':
            variant = 'neutral';
            label = 'Nonaktif';
            icon = 'ri-shut-down-line';
            break;
        case 'idle':
            variant = 'neutral';
            label = 'Idle';
            icon = 'ri-subtract-line';
            break;

        default:
            label = status ? (String(status).charAt(0).toUpperCase() + String(status).slice(1).replace(/_/g, ' ')) : '-';
            break;
    }

    const pulseClass = pulse ? 'animate-pulse' : '';
    const iconHtml = icon ? `<i class="${icon} text-[11px] shrink-0 ${icon.includes('spin') || icon.includes('loader') ? 'animate-spin' : ''}"></i>` : '';

    return `<span class="badge-status badge-status-${variant} ${pulseClass}"><span class="status-dot"></span>${iconHtml}<span>${escapeHtml(label)}</span></span>`;
}


