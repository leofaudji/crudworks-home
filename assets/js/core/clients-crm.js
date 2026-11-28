// assets/js/core/clients-crm.js — Pipeline Kanban CRM & Riwayat Follow-up Klien
import { App } from '../app.js';

let currentFollowupClientId = null;

export async function loadKanban() {
    const cont = document.getElementById('kanban-board-container');
    const valEl = document.getElementById('kanban-pipeline-value');
    const subEl = document.getElementById('kanban-pipeline-sub');
    if (!cont) return;

    const res = await App.api('clients/kanban');
    if (!res || !res.success) {
        cont.innerHTML = `<div class="p-8 text-center text-rose-500 text-xs w-full">Gagal memuat papan pipeline CRM</div>`;
        return;
    }

    const { stages, total_prospects, grand_total_pipeline } = res.data;
    if (valEl) valEl.textContent = App.formatIDR(grand_total_pipeline);
    if (subEl) subEl.textContent = `${total_prospects} calon pelanggan dalam pipeline penjualan aktif`;

    cont.innerHTML = Object.keys(stages).map((k) => {
        const col = stages[k];
        const items = col.items || [];
        return `
            <div class="flex-1 min-w-[280px] max-w-[340px] bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700/80">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${col.color}"></span>
                        <h4 class="text-xs font-bold text-slate-900 dark:text-white uppercase font-mono tracking-wider">${col.label}</h4>
                    </div>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono shadow-xs border border-slate-200 dark:border-slate-700">
                        ${items.length}
                    </span>
                </div>
                <div class="text-[11px] font-mono font-bold text-slate-500 flex items-center justify-between px-1">
                    <span>Estimasi:</span>
                    <span class="text-slate-800 dark:text-slate-200 font-extrabold">${App.formatIDR(col.total_value)}</span>
                </div>
                <div class="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
                    ${items.length === 0 ? `
                        <div class="text-center py-8 text-[11px] text-slate-400 border border-dashed border-slate-200 dark:border-slate-700/80 rounded-2xl">Kosong</div>
                    ` : items.map((p) => renderKanbanCard(p, k)).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function renderKanbanCard(p, currentStage) {
    const dealVal = Number(p.deal_value || 0);
    const cleanPhone = App.formatWhatsAppPhone(p.telepon);
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

    return `
        <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-primary-400 dark:hover:border-primary-600 transition space-y-2.5">
            <div class="flex items-start justify-between gap-2">
                <div>
                    <h5 class="text-xs font-bold text-slate-900 dark:text-white leading-snug">${p.nama_perusahaan}</h5>
                    <div class="text-[10px] font-mono text-primary-600 dark:text-primary-400 mt-0.5">${p.kode_klien} · ${p.penanggung_jawab}</div>
                </div>
                ${waUrl ? `<a href="${waUrl}" target="_blank" title="Chat WhatsApp" class="text-emerald-500 hover:text-emerald-600 p-1"><i class="ri-whatsapp-line text-base"></i></a>` : ''}
            </div>
            <div class="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                <span class="text-[10px] uppercase font-bold text-slate-400">Potensi:</span>
                <span class="font-mono font-black ${dealVal > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}">${App.formatIDR(dealVal)}</span>
            </div>
            ${p.latest_followup ? `
                <div class="p-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl text-[10px] text-slate-500 border border-slate-100 dark:border-slate-800">
                    <div class="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-0.5">
                        <i class="ri-chat-1-line text-primary-500"></i>
                        <span class="capitalize">${p.latest_followup_type || 'Follow-Up'}:</span>
                    </div>
                    <div class="line-clamp-2">${p.latest_followup}</div>
                </div>
            ` : ''}
            <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] gap-2">
                <select onchange="window.moveProspectStage(${p.id}, this.value)" class="px-2 py-1 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-[10px] font-semibold text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-primary-500">
                    <option value="leads_baru" ${currentStage === 'leads_baru' ? 'selected' : ''}>Leads Masuk</option>
                    <option value="kontak_awal" ${currentStage === 'kontak_awal' ? 'selected' : ''}>Kontak Awal</option>
                    <option value="proposal_penawaran" ${currentStage === 'proposal_penawaran' ? 'selected' : ''}>Proposal SPH</option>
                    <option value="negosiasi" ${currentStage === 'negosiasi' ? 'selected' : ''}>Negosiasi</option>
                    <option value="deal_menang" ${currentStage === 'deal_menang' ? 'selected' : ''}>Deal Menang (Won)</option>
                    <option value="batal_lost" ${currentStage === 'batal_lost' ? 'selected' : ''}>Batal / Kalah</option>
                </select>
                <div class="flex items-center gap-1">
                    <button onclick="window.openClientFollowups(${p.id}, '${App.escapeHtml(p.nama_perusahaan)}')" title="Buka Catatan Follow-up" class="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
                        <i class="ri-chat-history-line text-sm"></i>
                    </button>
                    ${currentStage === 'deal_menang' ? `<button onclick="window.location.hash = '#/quotations'" title="Buat Penawaran" class="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"><i class="ri-draft-line text-sm"></i></button>` : ''}
                </div>
            </div>
        </div>
    `;
}

export function registerCrmHandlers(getActiveView) {
    window.moveProspectStage = async (clientId, newStage) => {
        const res = await App.api(`clients/${clientId}/stage`, {
            method: 'POST',
            body: JSON.stringify({ prospect_stage: newStage })
        });
        if (res && res.success) {
            App.toast(res.message || 'Tahapan prospek berhasil diperbarui', 'success');
            if (newStage === 'deal_menang') {
                await Swal.fire({
                    title: '🎉 Selamat! Deal Berhasil Dimasukkan',
                    text: 'Calon pelanggan otomatis diaktifkan menjadi Klien Resmi. Apakah Anda ingin langsung membuat Surat Penawaran Harga atau Faktur Tagihan?',
                    icon: 'success',
                    showCancelButton: true,
                    confirmButtonText: 'Buat Penawaran SPH',
                    cancelButtonText: 'Nanti Saja'
                }).then((ok) => {
                    if (ok.isConfirmed) window.location.hash = '#/quotations';
                });
            }
            loadKanban();
        } else {
            App.toast(res?.message || 'Gagal memindahkan tahapan', 'error');
        }
    };

    window.openClientFollowups = async (clientId, companyName) => {
        currentFollowupClientId = clientId;
        const modal = document.getElementById('client-followup-modal');
        const nameEl = document.getElementById('followup-client-name');
        const listEl = document.getElementById('followup-timeline-list');
        const form = document.getElementById('form-add-followup');

        if (nameEl) nameEl.textContent = companyName;
        if (form) form.reset();
        modal?.classList.remove('hidden');

        listEl.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs"><i class="ri-loader-4-line animate-spin"></i> Memuat...</div>`;
        const res = await App.api(`clients/${clientId}/followups`);
        if (!res || !res.success) {
            listEl.innerHTML = `<div class="text-center py-4 text-rose-500 text-xs">Gagal memuat riwayat follow-up</div>`;
            return;
        }
        const followups = res.data || [];
        if (followups.length === 0) {
            listEl.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs">Belum ada catatan interaksi untuk pelanggan ini.</div>`;
            return;
        }
        listEl.innerHTML = followups.map((f) => `
            <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-1 text-xs">
                <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span class="font-bold text-slate-700 dark:text-slate-300 capitalize font-sans">${f.tipe} · ${f.author_name}</span>
                    <span>${App.formatDate(f.tanggal)}</span>
                </div>
                <p class="text-slate-800 dark:text-slate-200 text-xs whitespace-pre-wrap">${f.catatan}</p>
                ${f.next_followup_date ? `<div class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 pt-0.5"><i class="ri-calendar-check-line"></i><span>Jadwal Kontak Berikutnya: ${App.formatDate(f.next_followup_date)}</span></div>` : ''}
            </div>
        `).join('');
    };

    return async function handleSaveFollowup(e) {
        e.preventDefault();
        if (!currentFollowupClientId) return;
        const tipe = document.getElementById('form-fu-tipe').value;
        const next_followup_date = document.getElementById('form-fu-next-date').value || null;
        const catatan = document.getElementById('form-fu-catatan').value.trim();
        if (!catatan) {
            App.toast('Catatan interaksi wajib diisi', 'warning');
            return;
        }
        const res = await App.api(`clients/${currentFollowupClientId}/followups`, {
            method: 'POST',
            body: JSON.stringify({ tipe, catatan, next_followup_date })
        });
        if (res && res.success) {
            App.toast('Catatan interaksi berhasil dicatat', 'success');
            document.getElementById('form-fu-catatan').value = '';
            const nameEl = document.getElementById('followup-client-name')?.textContent || '';
            window.openClientFollowups(currentFollowupClientId, nameEl);
            if (getActiveView() === 'kanban') loadKanban();
        } else {
            App.toast(res?.message || 'Gagal menyimpan catatan', 'error');
        }
    };
}
