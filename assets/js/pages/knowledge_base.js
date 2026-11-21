// assets/js/pages/knowledge_base.js — Panduan Penggunaan & SOP Portal Klien
import { App } from '../app.js';

let articles = [];
let clientsList = [];
let projectsList = [];

const KAT_LABELS = { panduan: 'Panduan', faq: 'FAQ', sop: 'SOP', video: 'Video / Tutorial' };

export async function init(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Knowledge Base & Panduan</h1>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Artikel panduan penggunaan aplikasi untuk klien di Portal Klien.</p>
                </div>
                <button id="btn-add-kb" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm self-start sm:self-auto">
                    <i class="ri-add-line text-sm"></i><span>Tambah Panduan</span>
                </button>
            </div>

            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-wrap items-center gap-3">
                <input id="kb-search" type="text" placeholder="Cari judul atau isi panduan..."
                       class="flex-1 min-w-[220px] px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                <select id="kb-filter-kat" class="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
                    <option value="">Semua Kategori</option>
                    <option value="panduan">Panduan</option>
                    <option value="faq">FAQ</option>
                    <option value="sop">SOP</option>
                    <option value="video">Video / Tutorial</option>
                </select>
            </div>

            <div id="kb-list-wrap" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
        </div>
    `;

    const [cRes, pRes] = await Promise.all([App.api('clients?all=1'), App.api('projects?all=1')]);
    clientsList = cRes?.success && Array.isArray(cRes.data) ? cRes.data : [];
    projectsList = pRes?.success && Array.isArray(pRes.data) ? pRes.data : [];

    document.getElementById('btn-add-kb')?.addEventListener('click', () => openKbModal());
    document.getElementById('kb-search')?.addEventListener('input', App.debounce(loadKb, 250));
    document.getElementById('kb-filter-kat')?.addEventListener('change', loadKb);

    await loadKb();
}

async function loadKb() {
    const search = document.getElementById('kb-search')?.value?.trim() || '';
    const kategori = document.getElementById('kb-filter-kat')?.value || '';
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    if (kategori) qs.set('kategori', kategori);

    const res = await App.api(`knowledge-base?${qs.toString()}`);
    articles = res?.success && Array.isArray(res.data) ? res.data : [];
    renderKbList();
}

function renderKbList() {
    const wrap = document.getElementById('kb-list-wrap');
    if (!wrap) return;
    if (!articles.length) {
        wrap.innerHTML = `<div class="md:col-span-2 p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400">Belum ada artikel panduan.</div>`;
        return;
    }

    wrap.innerHTML = articles.map((a) => `
        <div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-3">
            <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">${KAT_LABELS[a.kategori] || a.kategori}</span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${Number(a.is_published) === 1 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'}">${Number(a.is_published) === 1 ? 'Tayang di Portal' : 'Draft'}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <button data-edit="${a.id}" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600"><i class="ri-edit-line"></i></button>
                        <button data-del="${a.id}" class="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"><i class="ri-delete-bin-line"></i></button>
                    </div>
                </div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">${App.escapeHtml(a.judul)}</h3>
                <p class="text-xs text-slate-500 line-clamp-3 whitespace-pre-line">${App.escapeHtml(a.konten)}</p>
            </div>
            <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>${a.client_nama ? App.escapeHtml(a.client_nama) : 'Semua Klien'}${a.nama_project ? ' · ' + App.escapeHtml(a.nama_project) : ''}</span>
                <span class="font-mono">${App.formatDate(a.updated_at)}</span>
            </div>
        </div>
    `).join('');

    wrap.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => {
        const item = articles.find((x) => Number(x.id) === Number(b.dataset.edit));
        if (item) openKbModal(item);
    }));
    wrap.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => deleteKb(b.dataset.del)));
}

function openKbModal(item = null) {
    App.openModal(`
        <form id="kb-form" class="p-6 space-y-4">
            <h3 class="text-lg font-extrabold text-slate-900 dark:text-white">${item ? 'Edit Panduan' : 'Tambah Panduan Baru'}</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div class="sm:col-span-2">
                    <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Judul Panduan *</label>
                    <input id="kb-judul" type="text" required value="${App.escapeHtml(item?.judul || '')}" placeholder="Cara Login & Export Laporan..."
                           class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                </div>
                <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Kategori</label>
                    <select id="kb-kategori" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <option value="panduan" ${item?.kategori === 'panduan' ? 'selected' : ''}>Panduan</option>
                        <option value="faq" ${item?.kategori === 'faq' ? 'selected' : ''}>FAQ</option>
                        <option value="sop" ${item?.kategori === 'sop' ? 'selected' : ''}>SOP</option>
                        <option value="video" ${item?.kategori === 'video' ? 'selected' : ''}>Video / Tutorial</option>
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Target Klien</label>
                    <select id="kb-client" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <option value="">Semua Klien (Umum)</option>
                        ${clientsList.map((c) => `<option value="${c.id}" ${Number(item?.client_id) === Number(c.id) ? 'selected' : ''}>${App.escapeHtml(c.nama_perusahaan)}</option>`).join('')}
                    </select>
                </div>
                <div class="sm:col-span-2">
                    <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Proyek Terkait (Opsional)</label>
                    <select id="kb-project" class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <option value="">-- Umum --</option>
                        ${projectsList.map((p) => `<option value="${p.id}" ${Number(item?.project_id) === Number(p.id) ? 'selected' : ''}>${App.escapeHtml(p.nama_project)}</option>`).join('')}
                    </select>
                </div>
                <div class="sm:col-span-2">
                    <label class="block font-bold text-slate-600 dark:text-slate-400 mb-1">Isi Panduan / Langkah-langkah *</label>
                    <textarea id="kb-konten" rows="6" required class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl leading-relaxed">${App.escapeHtml(item?.konten || '')}</textarea>
                </div>
                <div class="sm:col-span-2">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input id="kb-published" type="checkbox" ${(!item || Number(item.is_published) === 1) ? 'checked' : ''} class="w-4 h-4 rounded text-primary-600">
                        <span class="font-semibold text-slate-700 dark:text-slate-300">Tayangkan di Portal Klien</span>
                    </label>
                </div>
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onclick="App.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">Batal</button>
                <button type="submit" class="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold">Simpan</button>
            </div>
        </form>
    `, { size: 'lg' });

    document.getElementById('kb-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await App.api('knowledge-base', {
            method: 'POST',
            body: {
                id: item?.id || undefined,
                judul: document.getElementById('kb-judul').value.trim(),
                kategori: document.getElementById('kb-kategori').value,
                client_id: document.getElementById('kb-client').value || null,
                project_id: document.getElementById('kb-project').value || null,
                konten: document.getElementById('kb-konten').value.trim(),
                is_published: document.getElementById('kb-published').checked ? 1 : 0
            }
        });
        if (res?.success) {
            App.toast(res.message || 'Panduan disimpan', 'success');
            App.closeModal();
            await loadKb();
        }
    });
}

async function deleteKb(id) {
    const ok = await App.confirmAction('Hapus Panduan?', 'Artikel ini akan dihapus dari Knowledge Base.');
    if (!ok) return;
    const res = await App.api(`knowledge-base/${id}`, { method: 'DELETE' });
    if (res?.success) {
        App.toast('Panduan dihapus', 'success');
        await loadKb();
    }
}
