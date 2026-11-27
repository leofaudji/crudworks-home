// assets/js/pages/email-logs.js — Halaman Riwayat & Log Pengiriman Email
import { mountEmailLogsPanel } from '../core/email-logs-panel.js';

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Riwayat Pengiriman Email</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Pantau status pengiriman email faktur, surat penawaran (SPH), dan uji coba SMTP.</p>
                </div>
            </div>
            <div id="email-logs-page-panel" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm p-6"></div>
        </div>
    `;

    mountEmailLogsPanel(document.getElementById('email-logs-page-panel'), {
        perPage: 15,
        title: 'Log Pengiriman Email SMTP'
    });
}
