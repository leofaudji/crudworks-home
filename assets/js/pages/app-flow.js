// assets/js/pages/app-flow.js — Visualisasi Alur Bisnis & Arsitektur 3D Interaktif CRUDWorks ERP
import { App } from '../app.js';

const DOMAINS = [
    { id: 'all', label: 'Semua Alur', color: '#4f46e5' },
    { id: 'crm', label: '1. Penjualan & CRM', color: '#0ea5e9' },
    { id: 'project', label: '2. Proyek & GitOps', color: '#8b5cf6' },
    { id: 'ops', label: '3. Operasional & Portal', color: '#14b8a6' },
    { id: 'finance', label: '4. Keuangan & Pajak', color: '#f59e0b' },
    { id: 'accounting', label: '5. Akuntansi (COA)', color: '#10b981' }
];

const NODES = [
    // Layer 1: CRM & Sales
    { id: 'clients', domain: 'crm', x: 70, y: 58, z: 24, title: 'Pelanggan & Prospek', tag: 'Master CRM', icon: 'ri-building-4-line', route: '#/clients', desc: 'Master data klien, PIC, NPWP, kontak, dan saldo deposit.' },
    { id: 'services', domain: 'crm', x: 335, y: 58, z: 18, title: 'Katalog Layanan', tag: 'Paket & Tarif', icon: 'ri-price-tag-3-line', route: '#/services', desc: 'Daftar paket hosting, development & tarif standar.' },
    { id: 'quotations', domain: 'crm', x: 605, y: 58, z: 36, title: 'Surat Penawaran (SPH)', tag: 'E-Sign & SMTP', icon: 'ri-file-paper-2-line', route: '#/quotations', desc: 'Penawaran resmi, E-Sign publik & kirim via Email SMTP / WA.' },
    { id: 'contracts', domain: 'crm', x: 890, y: 58, z: 28, title: 'Kontrak & SPK', tag: 'Legal Digital', icon: 'ri-file-shield-2-line', route: '#/contracts', desc: 'Surat Perjanjian Kerja digital & masa berlaku kontrak.' },

    // Layer 2: Proyek & Produksi
    { id: 'projects', domain: 'project', x: 110, y: 222, z: 44, title: 'Manajemen Proyek', tag: 'Kanban & Termin', icon: 'ri-git-branch-line', route: '#/projects', desc: 'Kanban tugas, milestone, garansi & profitabilitas proyek.' },
    { id: 'gitops', domain: 'project', x: 390, y: 222, z: 58, title: 'GitOps & app-git', tag: 'Auto Deploy', icon: 'ri-terminal-box-line', route: '#/projects', desc: 'Cek commit, .env & trigger git pull deploy langsung ke server.' },
    { id: 'timesheets', domain: 'project', x: 665, y: 222, z: 30, title: 'Log Jam Kerja', tag: 'Timesheet Tim', icon: 'ri-time-line', route: '#/timesheets', desc: 'Pencatatan jam kerja tim developer & biaya produksi.' },
    { id: 'basts', domain: 'project', x: 925, y: 222, z: 34, title: 'Berita Acara (BAST)', tag: 'Serah Terima', icon: 'ri-award-line', route: '#/projects', desc: 'Serah terima hasil pekerjaan resmi untuk penagihan termin.' },

    // Layer 3: Operasional & Portal
    { id: 'portal', domain: 'ops', x: 70, y: 386, z: 32, title: 'Portal Klien Mandiri', tag: 'Self-Service', icon: 'ri-global-line', route: '#/client-portal', desc: 'Akses mandiri klien untuk faktur, SPH & pelaporan gangguan.' },
    { id: 'tickets', domain: 'ops', x: 345, y: 386, z: 48, title: 'Tiket & SLA', tag: 'Respon Terukur', icon: 'ri-customer-service-2-line', route: '#/tickets', desc: 'Penanganan tiket klien dengan target SLA & konversi ke Kanban.' },
    { id: 'maintenance', domain: 'ops', x: 625, y: 386, z: 34, title: 'SLA & Domain', tag: 'Uptime & SSL', icon: 'ri-shield-check-line', route: '#/maintenance', desc: 'Pemantau uptime, SSL & jadwal perpanjangan layanan.' },
    { id: 'credentials', domain: 'ops', x: 900, y: 386, z: 24, title: 'Brankas & Aset Cloud', tag: 'AES-256 Vault', icon: 'ri-key-2-line', route: '#/credentials', desc: 'Penyimpanan kredensial terenkripsi AES-256 & langganan cloud.' },

    // Layer 4: Keuangan & Penagihan
    { id: 'recurring', domain: 'finance', x: 55, y: 550, z: 28, title: 'Tagihan Berulang', tag: 'Jadwal Berkala', icon: 'ri-repeat-line', route: '#/recurring', desc: 'Template & jadwal penagihan langganan berkala.' },
    { id: 'invoices', domain: 'finance', x: 290, y: 550, z: 60, title: 'Tagihan & Faktur', tag: 'PPN & SMTP', icon: 'ri-file-list-3-line', route: '#/invoices', desc: 'Faktur penjualan, PPN, kirim Email SMTP/WA & portal publik.' },
    { id: 'gateway', domain: 'finance', x: 525, y: 550, z: 52, title: 'Payment Gateway', tag: 'QRIS & VA', icon: 'ri-qr-code-line', route: '#/public-invoice', desc: 'Pembayaran instan QRIS / Virtual Account + Webhook otomatis.' },
    { id: 'payments', domain: 'finance', x: 755, y: 550, z: 48, title: 'Pembayaran & Bank', tag: 'Rekonsiliasi CSV', icon: 'ri-bank-card-line', route: '#/bank-accounts', desc: 'Pelunasan masuk, verifikasi bukti & rekonsiliasi mutasi CSV.' },
    { id: 'expenses', domain: 'finance', x: 970, y: 550, z: 34, title: 'Beban & Pajak', tag: 'PPN & PPh 23', icon: 'ri-hand-coin-line', route: '#/expenses', desc: 'Pengeluaran operasional, PPN Masukan & pemotongan PPh 23.' },

    // Layer 5: Akuntansi Double-Entry & Kontrol
    { id: 'coa', domain: 'accounting', x: 95, y: 714, z: 38, title: 'Master COA', tag: 'Bagan Akun', icon: 'ri-book-2-line', route: '#/coa', desc: 'Bagan akun standar & pemetaan akun otomatis di Pengaturan.' },
    { id: 'journals', domain: 'accounting', x: 360, y: 714, z: 64, title: 'Jurnal & Buku Besar', tag: 'Auto Double-Entry', icon: 'ri-file-list-2-line', route: '#/journals', desc: 'Auto-jurnal double-entry dari Faktur, Pembayaran & Beban.' },
    { id: 'statements', domain: 'accounting', x: 645, y: 714, z: 52, title: 'Laporan PSAK', tag: 'Neraca T & Laba Rugi', icon: 'ri-scales-line', route: '#/balance-sheet', desc: 'Neraca T, Laba Rugi (COA), Neraca Saldo, Arus Kas & Ekuitas.' },
    { id: 'closing', domain: 'accounting', x: 920, y: 714, z: 36, title: 'Tutup Buku & Webhook', tag: 'Audit & Lock', icon: 'ri-lock-2-line', route: '#/period-closing', desc: 'Kunci periode akuntansi, Jurnal Penutup, Notifikasi & Webhook.' }
];

const EDGES = [
    { from: 'clients', to: 'quotations', label: 'Buat SPH' },
    { from: 'services', to: 'quotations', label: 'Item Paket' },
    { from: 'quotations', to: 'contracts', label: 'Deal Kontrak' },
    { from: 'contracts', to: 'projects', label: 'Kickoff Proyek' },
    { from: 'quotations', to: 'invoices', label: 'Konversi Faktur' },
    { from: 'projects', to: 'gitops', label: 'Deploy Repo' },
    { from: 'projects', to: 'timesheets', label: 'Log Jam' },
    { from: 'projects', to: 'basts', label: 'Serah Terima' },
    { from: 'basts', to: 'invoices', label: 'Tagih Termin' },
    { from: 'portal', to: 'tickets', label: 'Lapor Tiket' },
    { from: 'tickets', to: 'projects', label: 'Konversi Task' },
    { from: 'maintenance', to: 'credentials', label: 'Akses Aset' },
    { from: 'recurring', to: 'invoices', label: 'Generate Faktur' },
    { from: 'invoices', to: 'gateway', label: 'Bayar QRIS/VA' },
    { from: 'gateway', to: 'payments', label: 'Webhook Lunas' },
    { from: 'invoices', to: 'journals', label: 'Jurnal Piutang' },
    { from: 'payments', to: 'journals', label: 'Jurnal Kas' },
    { from: 'expenses', to: 'journals', label: 'Jurnal Beban' },
    { from: 'coa', to: 'journals', label: 'Mapping Akun' },
    { from: 'journals', to: 'statements', label: 'Neraca & Laba Rugi' },
    { from: 'statements', to: 'closing', label: 'Tutup Buku' }
];

const TOUR_SEQUENCE = ['clients', 'quotations', 'contracts', 'projects', 'gitops', 'basts', 'invoices', 'gateway', 'payments', 'journals', 'statements', 'closing'];

export async function init(container) {
    // Sudut default yang ergonomis: terasa kedalaman 3D tapi teks tetap tajam & mudah dibaca
    let rotX = 12;
    let rotY = -6;
    let zoom = 0.92;
    let panX = 0;
    let panY = -6;
    let activeDomain = 'all';
    let selectedId = 'invoices';
    let hoveredId = null;
    let animateFlow = true;
    let tourTimer = null;

    const domainColorMap = Object.fromEntries(DOMAINS.map(d => [d.id, d.color]));

    container.innerHTML = `
        <div class="space-y-4 animate-fadeIn">
            <!-- Header & Controls -->
            <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <div>
                    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                        <span class="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-sm"><i class="ri-node-tree"></i></span>
                        <span>Peta Alur Aplikasi 3D</span>
                    </h1>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Arahkan kursor atau klik modul untuk melihat aliran data. Seret kanvas untuk memutar sudut 3D.</p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <div class="relative">
                        <i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input type="text" id="flow-search" placeholder="Cari modul..." class="pl-8 pr-3 py-1.5 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/30 outline-none">
                    </div>
                    <button type="button" id="flow-tour-btn" class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition">
                        <i class="ri-play-circle-line"></i><span>Simulasi Alur</span>
                    </button>
                    <div class="inline-flex rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0.5">
                        <button type="button" data-cam="iso" class="cam-btn px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold">3D Ringan</button>
                        <button type="button" data-cam="tilt" class="cam-btn px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300">3D Miring</button>
                        <button type="button" data-cam="top" class="cam-btn px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300">2D Datar</button>
                    </div>
                    <div class="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <button type="button" id="flow-zoom-out" class="px-2.5 py-1.5 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800">-</button>
                        <span id="flow-zoom-lbl" class="px-2 text-[11px] font-mono font-bold">92%</span>
                        <button type="button" id="flow-zoom-in" class="px-2.5 py-1.5 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800">+</button>
                    </div>
                    <button type="button" id="flow-toggle-anim" class="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1" title="Animasi Aliran">
                        <i class="ri-pulse-line"></i>
                    </button>
                </div>
            </div>

            <!-- Domain Filter Pills -->
            <div class="flex flex-wrap items-center gap-1.5">
                ${DOMAINS.map(d => `
                    <button type="button" data-dom="${d.id}"
                        class="dom-pill px-3.5 py-1.5 rounded-full text-xs font-bold transition inline-flex items-center gap-1.5 ${d.id === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}">
                        <span class="w-2 h-2 rounded-full" style="background:${d.color}"></span>
                        <span>${d.label}</span>
                    </button>
                `).join('')}
            </div>

            <!-- Main 3D Viewport + Inspector -->
            <div class="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
                <!-- 3D Canvas -->
                <div id="flow-viewport"
                    class="xl:col-span-9 relative h-[70vh] min-h-[520px] rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-[#0f172a] to-[#1e1b4b] overflow-hidden select-none cursor-grab active:cursor-grabbing shadow-xl"
                    style="perspective: 1800px;">
                    <div class="absolute inset-0 opacity-20 pointer-events-none"
                         style="background-image: radial-gradient(#818cf8 1px, transparent 1px); background-size: 28px 28px;"></div>

                    <!-- 3D Transform Stage -->
                    <div id="flow-stage" class="absolute left-1/2 top-1/2 origin-center transition-transform duration-150 ease-out"
                         style="width: 1180px; height: 830px; margin-left: -590px; margin-top: -415px; transform-style: preserve-3d;">
                        <!-- Layer Floor Plates -->
                        ${[
                            { y: 18, h: 132, label: '1. PENJUALAN & CRM', color: 'rgba(14,165,233,0.10)', border: 'rgba(56,189,248,0.35)' },
                            { y: 182, h: 132, label: '2. PROYEK & GITOPS', color: 'rgba(139,92,246,0.10)', border: 'rgba(167,139,250,0.35)' },
                            { y: 346, h: 132, label: '3. OPERASIONAL & PORTAL KLIEN', color: 'rgba(20,184,166,0.10)', border: 'rgba(45,212,191,0.35)' },
                            { y: 510, h: 132, label: '4. KEUANGAN & PENAGIHAN', color: 'rgba(245,158,11,0.10)', border: 'rgba(251,191,36,0.35)' },
                            { y: 674, h: 132, label: '5. AKUNTANSI DOUBLE-ENTRY & KONTROL', color: 'rgba(16,185,129,0.10)', border: 'rgba(52,211,153,0.35)' }
                        ].map(lp => `
                            <div class="absolute left-5 right-5 rounded-2xl pointer-events-none"
                                 style="top:${lp.y}px; height:${lp.h}px; background:${lp.color}; border:1px solid ${lp.border}; transform: translateZ(-10px);">
                                <span class="absolute left-4 top-2 text-[11px] font-extrabold tracking-widest text-slate-200/90">${lp.label}</span>
                            </div>
                        `).join('')}

                        <!-- SVG Edges & Labels Layer -->
                        <svg id="flow-svg" viewBox="0 0 1180 830" class="absolute inset-0 w-full h-full pointer-events-none" style="transform: translateZ(14px);"></svg>

                        <!-- 3D Nodes -->
                        <div id="flow-nodes-layer" class="absolute inset-0" style="transform-style: preserve-3d;"></div>
                    </div>

                    <div class="absolute bottom-3 left-4 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-xs border border-slate-700/70 text-[11px] text-slate-200 pointer-events-none">
                        <i class="ri-drag-move-2-line text-indigo-400"></i> Drag: Putar 3D · Scroll: Zoom · Hover/Klik: Lacak Alur
                    </div>
                </div>

                <!-- Right Inspector -->
                <div id="flow-inspector" class="xl:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-sm"></div>
            </div>
        </div>
    `;

    const stage = document.getElementById('flow-stage');
    const viewport = document.getElementById('flow-viewport');
    const nodesLayer = document.getElementById('flow-nodes-layer');
    const svgEl = document.getElementById('flow-svg');

    const applyTransform = () => {
        if (!stage) return;
        stage.style.transform = `translate3d(${panX}px, ${panY}px, 0px) scale(${zoom}) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        const zl = document.getElementById('flow-zoom-lbl');
        if (zl) zl.textContent = `${Math.round(zoom * 100)}%`;
    };

    const renderGraph = () => {
        const focusId = hoveredId || selectedId;
        const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));
        const relatedIds = new Set([focusId]);
        EDGES.forEach(e => {
            if (e.from === focusId) relatedIds.add(e.to);
            if (e.to === focusId) relatedIds.add(e.from);
        });

        // Render SVG Curved Connections + Highlighted Edge Labels
        if (svgEl) {
            const labelPills = [];
            const pathsHtml = EDGES.map((e, idx) => {
                const a = nodeMap[e.from];
                const b = nodeMap[e.to];
                if (!a || !b) return '';
                const x1 = a.x + 98, y1 = a.y + 36;
                const x2 = b.x + 98, y2 = b.y + 36;
                const cx1 = x1, cy1 = (y1 + y2) / 2;
                const cx2 = x2, cy2 = (y1 + y2) / 2;
                const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
                const isHi = e.from === focusId || e.to === focusId;
                const domMatch = activeDomain === 'all' || a.domain === activeDomain || b.domain === activeDomain;
                const opacity = !domMatch ? 0.1 : (isHi ? 1 : 0.32);
                const stroke = isHi ? (e.from === focusId ? '#34d399' : '#38bdf8') : '#94a3b8';

                if (isHi && domMatch) {
                    const mx = (x1 + x2) / 2;
                    const my = (y1 + y2) / 2;
                    const w = Math.max(76, e.label.length * 6.5 + 18);
                    labelPills.push(`
                        <g transform="translate(${mx}, ${my})">
                            <rect x="${-w / 2}" y="-10" width="${w}" height="20" rx="10" fill="#0f172a" stroke="${stroke}" stroke-width="1.2" />
                            <text x="0" y="3.5" text-anchor="middle" fill="#f8fafc" font-size="10" font-weight="700" font-family="ui-sans-serif, system-ui">${App.escapeHtml(e.label)}</text>
                        </g>
                    `);
                }

                return `
                    <path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="${isHi ? 2.8 : 1.4}" stroke-opacity="${opacity}"
                          marker-end="url(#${isHi ? (e.from === focusId ? 'arrow-out' : 'arrow-in') : 'arrow-dim'})"
                          ${animateFlow ? `stroke-dasharray="${isHi ? '7 5' : '4 6'}"><animate attributeName="stroke-dashoffset" from="24" to="0" dur="${1.2 + (idx % 3) * 0.3}s" repeatCount="indefinite" /></path>` : '/>'}
                `;
            }).join('');

            svgEl.innerHTML = `
                <defs>
                    <marker id="arrow-dim" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M 0 1 L 10 5 L 0 9 z" fill="rgba(148,163,184,0.5)" />
                    </marker>
                    <marker id="arrow-in" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                    </marker>
                    <marker id="arrow-out" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1 L 10 5 L 0 9 z" fill="#34d399" />
                    </marker>
                </defs>
                ${pathsHtml}
                ${labelPills.join('')}
            `;
        }

        // Render 3D Cards (High Contrast & Legible)
        if (nodesLayer) {
            nodesLayer.innerHTML = NODES.map(n => {
                const color = domainColorMap[n.domain] || '#6366f1';
                const isSelected = n.id === selectedId;
                const isNeighbor = relatedIds.has(n.id);
                const domMatch = activeDomain === 'all' || n.domain === activeDomain;
                const zDepth = isSelected ? n.z + 34 : (isNeighbor ? n.z + 14 : n.z);
                const opacity = !domMatch ? 0.2 : (isNeighbor ? 1 : 0.72);

                return `
                    <button type="button" data-node="${n.id}"
                        class="flow-node absolute text-left rounded-2xl p-3 transition-all duration-200 cursor-pointer"
                        style="left:${n.x}px; top:${n.y}px; width:196px; opacity:${opacity};
                               background:${isSelected ? 'rgba(255, 255, 255, 0.98)' : 'rgba(15, 23, 42, 0.94)'};
                               border: 2px solid ${isSelected ? color : (isNeighbor ? color : 'rgba(148,163,184,0.3)')};
                               box-shadow: 0 ${isSelected ? 24 : 12}px ${isSelected ? 36 : 22}px -8px rgba(0,0,0,0.7), 0 0 ${isSelected ? 22 : 0}px ${color}66;
                               transform: translateZ(${zDepth}px) scale(${isSelected ? 1.07 : 1});">
                        <div class="flex items-center gap-2.5">
                            <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs" style="background:${color}">
                                <i class="${n.icon} text-base"></i>
                            </div>
                            <div class="min-w-0">
                                <div class="text-[12.5px] font-extrabold leading-tight truncate ${isSelected ? 'text-slate-900' : 'text-white'}">${App.escapeHtml(n.title)}</div>
                                <div class="text-[10px] font-semibold truncate mt-0.5 ${isSelected ? 'text-slate-500' : 'text-slate-300/80'}">${App.escapeHtml(n.tag)}</div>
                            </div>
                        </div>
                    </button>
                `;
            }).join('');

            nodesLayer.querySelectorAll('.flow-node').forEach(btn => {
                const nid = btn.getAttribute('data-node');
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectedId = nid;
                    renderGraph();
                    renderInspector();
                });
                btn.addEventListener('mouseenter', () => {
                    if (hoveredId !== nid) {
                        hoveredId = nid;
                        renderGraph();
                    }
                });
                btn.addEventListener('mouseleave', () => {
                    if (hoveredId === nid) {
                        hoveredId = null;
                        renderGraph();
                    }
                });
            });
        }
    };

    const renderInspector = () => {
        const insp = document.getElementById('flow-inspector');
        const n = NODES.find(x => x.id === selectedId);
        if (!insp || !n) return;
        const dom = DOMAINS.find(d => d.id === n.domain);
        const incoming = EDGES.filter(e => e.to === n.id).map(e => ({ ...e, node: NODES.find(x => x.id === e.from) }));
        const outgoing = EDGES.filter(e => e.from === n.id).map(e => ({ ...e, node: NODES.find(x => x.id === e.to) }));

        insp.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div class="w-11 h-11 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-xs" style="background:${dom?.color || '#4f46e5'}">
                        <i class="${n.icon} text-xl"></i>
                    </div>
                    <div class="min-w-0">
                        <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">${App.escapeHtml(dom?.label || '')}</span>
                        <h3 class="text-base font-bold text-slate-900 dark:text-white leading-snug">${App.escapeHtml(n.title)}</h3>
                        <span class="inline-block mt-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500">${App.escapeHtml(n.route)}</span>
                    </div>
                </div>

                <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${App.escapeHtml(n.desc)}</p>

                <div class="space-y-2">
                    <div class="text-[10px] font-bold uppercase tracking-wider text-sky-600 flex items-center gap-1">
                        <span class="w-2 h-2 rounded-full bg-sky-500"></span> Input Dari (${incoming.length})
                    </div>
                    ${incoming.length ? incoming.map(x => `
                        <button type="button" onclick="window.focusFlowNode('${x.from}')" class="w-full text-left px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-slate-800 text-xs flex items-center justify-between gap-2 transition">
                            <span class="font-semibold text-slate-700 dark:text-slate-200 truncate">${App.escapeHtml(x.node?.title || x.from)}</span>
                            <span class="text-[10px] font-mono text-sky-600 shrink-0">${App.escapeHtml(x.label)}</span>
                        </button>
                    `).join('') : '<div class="text-xs text-slate-400 italic">Titik awal alur (Input Master)</div>'}
                </div>

                <div class="space-y-2">
                    <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Output Ke (${outgoing.length})
                    </div>
                    ${outgoing.length ? outgoing.map(x => `
                        <button type="button" onclick="window.focusFlowNode('${x.to}')" class="w-full text-left px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-slate-800 text-xs flex items-center justify-between gap-2 transition">
                            <span class="font-semibold text-slate-700 dark:text-slate-200 truncate">${App.escapeHtml(x.node?.title || x.to)}</span>
                            <span class="text-[10px] font-mono text-emerald-600 shrink-0">${App.escapeHtml(x.label)}</span>
                        </button>
                    `).join('') : '<div class="text-xs text-slate-400 italic">Output akhir / arsip kontrol</div>'}
                </div>
            </div>

            <div class="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <a href="${App.escapeHtml(n.route)}" class="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition">
                    <span>Buka Modul Ini</span><i class="ri-arrow-right-line"></i>
                </a>
            </div>
        `;
    };

    window.focusFlowNode = (id) => {
        selectedId = id;
        renderGraph();
        renderInspector();
    };

    // Guided Tour Simulation
    const stopTour = () => {
        if (tourTimer) {
            clearInterval(tourTimer);
            tourTimer = null;
        }
        const tb = document.getElementById('flow-tour-btn');
        if (tb) tb.innerHTML = `<i class="ri-play-circle-line"></i><span>Simulasi Alur</span>`;
    };

    document.getElementById('flow-tour-btn')?.addEventListener('click', () => {
        if (tourTimer) { stopTour(); return; }
        let idx = 0;
        activeDomain = 'all';
        selectedId = TOUR_SEQUENCE[0];
        renderGraph();
        renderInspector();
        const tb = document.getElementById('flow-tour-btn');
        if (tb) tb.innerHTML = `<i class="ri-stop-circle-line"></i><span>Hentikan Simulasi</span>`;
        tourTimer = setInterval(() => {
            if (!document.getElementById('flow-stage')) { stopTour(); return; }
            idx = (idx + 1) % TOUR_SEQUENCE.length;
            selectedId = TOUR_SEQUENCE[idx];
            renderGraph();
            renderInspector();
        }, 1600);
    });

    // Quick Search
    document.getElementById('flow-search')?.addEventListener('input', (e) => {
        const q = String(e.target.value || '').trim().toLowerCase();
        if (!q) return;
        const found = NODES.find(n => n.title.toLowerCase().includes(q) || n.tag.toLowerCase().includes(q));
        if (found) {
            selectedId = found.id;
            renderGraph();
            renderInspector();
        }
    });

    // Drag to Orbit 3D
    let dragging = false;
    let lastX = 0, lastY = 0;
    viewport?.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.flow-node')) return;
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
    });
    window.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        rotY = Math.max(-45, Math.min(45, rotY + dx * 0.25));
        rotX = Math.max(0, Math.min(50, rotX - dy * 0.22));
        applyTransform();
    });
    window.addEventListener('pointerup', () => { dragging = false; });

    viewport?.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoom = Math.max(0.55, Math.min(1.45, zoom + (e.deltaY < 0 ? 0.06 : -0.06)));
        applyTransform();
    }, { passive: false });

    document.getElementById('flow-zoom-in')?.addEventListener('click', () => { zoom = Math.min(1.45, zoom + 0.1); applyTransform(); });
    document.getElementById('flow-zoom-out')?.addEventListener('click', () => { zoom = Math.max(0.55, zoom - 0.1); applyTransform(); });
    document.getElementById('flow-toggle-anim')?.addEventListener('click', (e) => {
        animateFlow = !animateFlow;
        e.currentTarget.classList.toggle('opacity-50', !animateFlow);
        renderGraph();
    });

    document.querySelectorAll('.cam-btn').forEach(b => {
        b.addEventListener('click', () => {
            const mode = b.getAttribute('data-cam');
            if (mode === 'iso') { rotX = 12; rotY = -6; zoom = 0.92; }
            else if (mode === 'tilt') { rotX = 30; rotY = -12; zoom = 0.86; }
            else { rotX = 0; rotY = 0; zoom = 0.92; }
            document.querySelectorAll('.cam-btn').forEach(x => {
                const act = x.getAttribute('data-cam') === mode;
                x.className = act
                    ? 'cam-btn px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold'
                    : 'cam-btn px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300';
            });
            applyTransform();
        });
    });

    document.querySelectorAll('.dom-pill').forEach(p => {
        p.addEventListener('click', () => {
            activeDomain = p.getAttribute('data-dom');
            document.querySelectorAll('.dom-pill').forEach(x => {
                const act = x.getAttribute('data-dom') === activeDomain;
                x.className = act
                    ? 'dom-pill px-3.5 py-1.5 rounded-full text-xs font-bold transition inline-flex items-center gap-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'dom-pill px-3.5 py-1.5 rounded-full text-xs font-bold transition inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50';
            });
            renderGraph();
        });
    });

    applyTransform();
    renderGraph();
    renderInspector();
}
