// ============================================
// OMNISEARCH (Ctrl+K) MODULE (Lazy-loaded)
// ============================================
import { api } from './api.js';
import { escapeHtml } from './utils.js';

let _omniBound = false;

export function bindOmniSearchEvents(navCtx) {
    if (_omniBound) return;
    _omniBound = true;
    const input = document.getElementById('omni-search-input');
    if (!input) return;

    input.addEventListener('input', () => {
        renderOmniSearchResults(navCtx, input.value);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (navCtx._omniResults.length > 0) {
                navCtx._omniActiveIdx = (navCtx._omniActiveIdx + 1) % navCtx._omniResults.length;
                _highlightOmniItem(navCtx);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (navCtx._omniResults.length > 0) {
                navCtx._omniActiveIdx = (navCtx._omniActiveIdx - 1 + navCtx._omniResults.length) % navCtx._omniResults.length;
                _highlightOmniItem(navCtx);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const picked = navCtx._omniResults[navCtx._omniActiveIdx];
            if (picked) _executeOmniItem(navCtx, picked);
        }
    });
}

export function toggleSearch(navCtx, forceOpen = null) {
    bindOmniSearchEvents(navCtx);
    const modal = document.getElementById('omni-search-modal');
    const content = document.getElementById('omni-search-content');
    const input = document.getElementById('omni-search-input');
    if (!modal) return;

    const isHidden = modal.classList.contains('hidden');
    const open = forceOpen !== null ? forceOpen : isHidden;

    if (open) {
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            content?.classList.remove('scale-95');
        });
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 50);
        }
        renderOmniSearchResults(navCtx, '');
        if (!navCtx._cachedClientSearch) {
            api('clients?limit=50', { silent: true }).then((res) => {
                if (res && res.success && Array.isArray(res.data)) {
                    navCtx._cachedClientSearch = res.data;
                    if (!modal.classList.contains('hidden') && input && input.value) {
                        renderOmniSearchResults(navCtx, input.value);
                    }
                }
            });
        }
    } else {
        modal.classList.add('opacity-0');
        content?.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 200);
    }
}

export function renderOmniSearchResults(navCtx, query = '') {
    const container = document.getElementById('omni-search-results');
    if (!container) return;

    const q = (query || '').trim().toLowerCase();
    const items = [];

    navCtx._flatMenuItems.forEach((m) => {
        if (!q || m.nama.toLowerCase().includes(q) || m.section.toLowerCase().includes(q)) {
            items.push({
                type: 'menu',
                title: m.nama,
                subtitle: m.section || 'Navigasi Halaman',
                icon: m.icon,
                url: m.url
            });
        }
    });

    const quickActions = [
        { title: '+ Buat Tagihan / Faktur Baru', subtitle: 'Penerbitan invoice tagihan pelanggan', icon: 'ri-file-add-line', action: 'new_inv' },
        { title: '+ Catat Pembayaran Tagihan', subtitle: 'Pencatatan pembayaran & bukti transfer', icon: 'ri-money-dollar-circle-line', action: 'new_pay' },
        { title: '+ Tambah Pelanggan Baru', subtitle: 'Pendaftaran klien & PIC kontak', icon: 'ri-user-add-line', action: 'new_client' },
        { title: '+ Tambah Proyek Baru', subtitle: 'Hubungkan aplikasi app-git ke pelanggan', icon: 'ri-git-branch-line', action: 'new_project' },
        { title: 'Preferensi Tampilan', subtitle: 'Atur tata letak, tema, format tanggal & angka', icon: 'ri-equalizer-line', action: 'pref' },
        { title: 'Tentang Sistem & Catatan Rilis', subtitle: 'Lihat versi aplikasi dan changelog', icon: 'ri-information-line', action: 'about' }
    ];
    quickActions.forEach((act) => {
        if (!q || act.title.toLowerCase().includes(q) || act.subtitle.toLowerCase().includes(q)) {
            items.push({ type: 'action', ...act });
        }
    });

    if (q && Array.isArray(navCtx._cachedClientSearch)) {
        navCtx._cachedClientSearch.forEach((cl) => {
            const label = `${cl.kode || ''} ${cl.nama || ''} ${cl.perusahaan || ''}`.toLowerCase();
            if (label.includes(q)) {
                items.push({
                    type: 'menu',
                    title: `Pelanggan: ${cl.nama}`,
                    subtitle: `${cl.kode || ''} • ${cl.perusahaan || 'Individu'} • ${cl.telepon || ''}`,
                    icon: 'ri-building-line',
                    url: '#/clients'
                });
            }
        });
    }

    navCtx._omniResults = items.slice(0, 12);
    navCtx._omniActiveIdx = 0;

    if (navCtx._omniResults.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-slate-400">
                <i class="ri-search-eye-line text-3xl mb-2 block opacity-40"></i>
                <p class="text-xs font-medium">Tidak ada hasil untuk "<strong>${escapeHtml(query)}</strong>"</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="space-y-1">
            ${navCtx._omniResults.map((item, i) => `
                <button type="button" data-omni-idx="${i}"
                    class="omni-item w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition ${i === 0 ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'}">
                    <div class="w-8 h-8 rounded-lg ${i === 0 ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500'} flex items-center justify-center flex-shrink-0">
                        <i class="${escapeHtml(item.icon)} text-base"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-xs font-bold truncate">${escapeHtml(item.title)}</div>
                        <div class="text-[11px] text-slate-400 truncate">${escapeHtml(item.subtitle)}</div>
                    </div>
                    <span class="text-[10px] font-bold uppercase text-slate-400 px-2 py-0.5 rounded bg-white border border-slate-200/70">
                        ${item.type === 'action' ? 'Aksi' : 'Buka'}
                    </span>
                </button>
            `).join('')}
        </div>
    `;

    container.querySelectorAll('[data-omni-idx]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-omni-idx'), 10);
            const picked = navCtx._omniResults[idx];
            if (picked) _executeOmniItem(navCtx, picked);
        });
    });
}

function _highlightOmniItem(navCtx) {
    document.querySelectorAll('#omni-search-results [data-omni-idx]').forEach((btn, idx) => {
        const active = idx === navCtx._omniActiveIdx;
        btn.className = `omni-item w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition ${active ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'}`;
        if (active) btn.scrollIntoView({ block: 'nearest' });
    });
}

function _executeOmniItem(navCtx, item) {
    toggleSearch(navCtx, false);
    if (item.type === 'menu' && item.url) {
        window.location.hash = item.url;
    } else if (item.action === 'new_inv') {
        window.location.hash = '#/invoices';
        setTimeout(() => window.InvoicesPage?.openForm?.(), 220);
    } else if (item.action === 'new_pay') {
        window.location.hash = '#/payments';
        setTimeout(() => window.PaymentsPage?.openForm?.(), 220);
    } else if (item.action === 'new_client') {
        window.location.hash = '#/clients';
        setTimeout(() => window.ClientsPage?.openForm?.(), 220);
    } else if (item.action === 'new_project') {
        window.location.hash = '#/projects';
        setTimeout(() => window.ProjectsPage?.openForm?.(), 220);
    } else if (item.action === 'calc' && typeof navCtx.onOpenCalculator === 'function') {
        navCtx.onOpenCalculator(true);
    } else if (item.action === 'pref') {
        navCtx.openPreferencesModal();
    } else if (item.action === 'about' && typeof navCtx.onOpenAbout === 'function') {
        navCtx.onOpenAbout();
    }
}
