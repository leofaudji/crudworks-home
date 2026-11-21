// ============================================
// UNIVERSAL DATATABLE ENGINE
// Crisp Financial Table UX: Quick Search, Column Click Sort,
// Drag-to-Reorder Columns, Column Resize, Show/Hide & Order Popover,
// Row Focus & Cell Copy
// ============================================
import { escapeHtml, toast } from './utils.js';

const STORAGE_PREFIX = 'keuangan_dt_v1_';
const _sessionSearch = new Map();
const _sessionSort = new Map();
let _observerBound = false;

function _normalizeText(str) {
    return String(str || '').replace(/\s+/g, ' ').trim();
}

function _isActionHeader(label) {
    const l = label.toLowerCase();
    return l === 'aksi' || l === 'action' || l === 'actions' || l === 'tindak lanjut' || l === '';
}

function _parseCellSortValue(cell, headerText = '') {
    if (!cell) return { kind: 'str', val: '' };
    const raw = _normalizeText(cell.dataset.sortValue ?? cell.textContent);
    if (!raw || raw === '-' || raw === '—') {
        return { kind: 'empty', val: '' };
    }

    // ISO / Indonesian dates (e.g. 2026-11-12, 12 Nov 2026, 12/11/2026, 12-11-2026)
    const isoMatch = raw.match(/\b(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (isoMatch) {
        const ts = Date.parse(isoMatch[0].replace(' ', 'T'));
        if (!Number.isNaN(ts)) return { kind: 'num', val: ts };
    }
    const dmyMatch = raw.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
    if (dmyMatch) {
        const d = Number(dmyMatch[1]);
        const m = Number(dmyMatch[2]) - 1;
        const y = Number(dmyMatch[3]);
        return { kind: 'num', val: Date.UTC(y, m, d) };
    }
    const idMonthMap = { jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11 };
    const idDate = raw.match(/^(\d{1,2})\s+([a-zA-Z]{3,})\s+(\d{4})/);
    if (idDate) {
        const mKey = idDate[2].slice(0, 3).toLowerCase();
        if (idMonthMap[mKey] !== undefined) {
            return { kind: 'num', val: Date.UTC(Number(idDate[3]), idMonthMap[mKey], Number(idDate[1])) };
        }
    }

    // Percentage
    if (raw.endsWith('%')) {
        const numPct = Number(raw.slice(0, -1).replace(/[^0-9.,-]/g, '').replace(',', '.'));
        if (!Number.isNaN(numPct)) return { kind: 'num', val: numPct };
    }

    // Indonesian Rupiah / formatted currency / pure numbers
    const firstLine = raw.split(/\s*·\s*|\n/)[0].trim();
    if (/^[+\-(]*\s*Rp\s*/i.test(firstLine) || /^[+\-]?\d[\d.,]*$/.test(firstLine)) {
        const isParenNeg = firstLine.startsWith('(') && firstLine.endsWith(')');
        const isSignNeg = firstLine.startsWith('-');
        let cleaned = firstLine.replace(/rp/gi, '').replace(/[^0-9.,-]/g, '');
        // Indonesian thousand dot, decimal comma
        if (/,\d{1,2}$/.test(cleaned)) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
            cleaned = cleaned.replace(/\./g, '').replace(/,/g, '');
        }
        const n = Number(cleaned);
        if (!Number.isNaN(n) && cleaned !== '') {
            const signed = (isParenNeg || (isSignNeg && n > 0)) ? -Math.abs(n) : n;
            return { kind: 'num', val: signed };
        }
    }

    // Umur "+15 hr"
    const hrMatch = raw.match(/^([+\-]?\d+)\s*hr\b/i);
    if (hrMatch && /umur|telat|lambat/i.test(headerText)) {
        return { kind: 'num', val: Number(hrMatch[1]) };
    }

    return { kind: 'str', val: raw.toLowerCase() };
}

function _compareSortVals(a, b, dir = 'asc') {
    if (a.kind === 'empty' && b.kind === 'empty') return 0;
    if (a.kind === 'empty') return 1;
    if (b.kind === 'empty') return -1;

    let cmp = 0;
    if (a.kind === 'num' && b.kind === 'num') {
        cmp = a.val - b.val;
    } else {
        cmp = String(a.val).localeCompare(String(b.val), 'id', { numeric: true, sensitivity: 'base' });
    }
    return dir === 'desc' ? -cmp : cmp;
}

function _buildTableKey(table) {
    const custom = table.dataset.dtKey;
    const route = (window.location.hash || '#/dashboard').split('?')[0];
    if (custom) return `${route}::${custom}`;
    const thTexts = Array.from(table.querySelectorAll('thead tr:first-child th'))
        .map(th => _normalizeText(th.textContent).slice(0, 18))
        .join('|');
    return `${route}::${thTexts}`;
}

function _loadPrefs(key, colCount) {
    try {
        const raw = localStorage.getItem(STORAGE_PREFIX + key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.order) || parsed.order.length !== colCount) return null;
        const validSet = new Set(parsed.order);
        if (validSet.size !== colCount) return null;
        return {
            order: parsed.order,
            hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
            widths: parsed.widths && typeof parsed.widths === 'object' ? parsed.widths : {}
        };
    } catch {
        return null;
    }
}

function _savePrefs(key, prefs) {
    try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(prefs));
    } catch (_) {}
}

function _clearPrefs(key) {
    try {
        localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (_) {}
}

function _tagOriginalColumns(table, colCount) {
    const theadRow = table.querySelector('thead tr:first-child');
    if (theadRow) {
        // Tag TH hanya jika belum pernah ditag, agar indeks kolom asli tidak tertimpa saat reorder
        Array.from(theadRow.children).forEach((th, idx) => {
            if (th.dataset.dtOrigCol === undefined) {
                th.dataset.dtOrigCol = String(idx);
            }
        });
    }
    table.querySelectorAll('tbody tr, tfoot tr').forEach((tr) => {
        if (tr.children.length === colCount && !tr.querySelector('[colspan]')) {
            const cells = Array.from(tr.children);
            // Tandai sel data baru yang belum memiliki data-dt-orig-col
            const alreadyTagged = cells.every(td => td.dataset.dtOrigCol !== undefined);
            if (!alreadyTagged) {
                cells.forEach((td, idx) => {
                    td.dataset.dtOrigCol = String(idx);
                });
            }
        }
    });
}

function _expandTfootSpans(table, colCount) {
    table.querySelectorAll('tfoot tr').forEach((tr) => {
        if (tr.children.length === colCount && !tr.querySelector('[colspan]')) return;
        const cells = Array.from(tr.children);
        const totalSpan = cells.reduce((s, c) => s + Math.max(1, Number(c.getAttribute('colspan') || 1)), 0);
        if (totalSpan !== colCount) return;

        const frag = document.createDocumentFragment();
        let colCursor = 0;
        cells.forEach((cell) => {
            const span = Math.max(1, Number(cell.getAttribute('colspan') || 1));
            cell.removeAttribute('colspan');
            cell.dataset.dtOrigCol = String(colCursor);
            frag.appendChild(cell);
            colCursor++;
            for (let i = 1; i < span; i++) {
                const spacer = document.createElement(cell.tagName.toLowerCase());
                spacer.className = cell.className;
                spacer.dataset.dtOrigCol = String(colCursor);
                frag.appendChild(spacer);
                colCursor++;
            }
        });
        tr.innerHTML = '';
        tr.appendChild(frag);
    });
}

function _applyColumnLayout(table, state) {
    const colCount = state.columns.length;
    const isDefaultOrder = state.order.every((origIdx, pos) => origIdx === pos);
    if (!isDefaultOrder) {
        _expandTfootSpans(table, colCount);
    }

    const reorderRow = (tr) => {
        const cells = Array.from(tr.children);
        if (cells.length !== colCount) return;
        const byOrig = new Map();
        cells.forEach((c) => {
            if (c.dataset.dtOrigCol !== undefined) byOrig.set(Number(c.dataset.dtOrigCol), c);
        });
        if (byOrig.size !== colCount) return;
        state.order.forEach((origIdx) => {
            const cell = byOrig.get(origIdx);
            if (cell) tr.appendChild(cell);
        });
    };

    const headRow = table.querySelector('thead tr:first-child');
    if (headRow) reorderRow(headRow);
    table.querySelectorAll('tbody tr').forEach((tr) => {
        if (tr.dataset.dtEmptyRow === '1') {
            const td = tr.querySelector('td[colspan]');
            if (td) td.setAttribute('colspan', String(Math.max(1, colCount - state.hidden.length)));
            return;
        }
        reorderRow(tr);
    });
    table.querySelectorAll('tfoot tr').forEach(reorderRow);

    // Visibility & Widths
    const hiddenSet = new Set(state.hidden);
    const applyCellsVisWidth = (tr) => {
        const cells = Array.from(tr.children);
        if (cells.length !== colCount) {
            if (cells.length === 1 && cells[0].hasAttribute('colspan')) {
                cells[0].setAttribute('colspan', String(Math.max(1, colCount - state.hidden.length)));
            }
            return;
        }
        cells.forEach((c) => {
            const origIdx = Number(c.dataset.dtOrigCol);
            const hide = hiddenSet.has(origIdx);
            c.classList.toggle('dt-col-hidden', hide);
            const w = state.widths[origIdx];
            if (w && c.tagName === 'TH') {
                c.style.width = `${w}px`;
                c.style.minWidth = `${w}px`;
            } else if (c.tagName === 'TH') {
                c.style.width = '';
                c.style.minWidth = '';
            }
        });
    };

    if (headRow) applyCellsVisWidth(headRow);
    table.querySelectorAll('tbody tr, tfoot tr').forEach(applyCellsVisWidth);
}

function _applySort(table, state) {
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    const colCount = state.columns.length;
    const allRows = Array.from(tbody.children).filter(r => r.dataset.dtEmptyRow !== '1');
    const sortableRows = allRows.filter(r => r.children.length === colCount && !r.querySelector('[colspan]'));
    const pinnedRows = allRows.filter(r => !sortableRows.includes(r));

    // Store initial DOM index once so sort reset restores original order
    sortableRows.forEach((r, idx) => {
        if (r.dataset.dtOrigRow === undefined) r.dataset.dtOrigRow = String(idx);
    });

    if (!state.sort || state.sort.origCol === null || !state.sort.dir) {
        sortableRows.sort((a, b) => Number(a.dataset.dtOrigRow) - Number(b.dataset.dtOrigRow));
    } else {
        const { origCol, dir } = state.sort;
        const headerText = state.columns[origCol]?.label || '';
        sortableRows.sort((a, b) => {
            const cellA = Array.from(a.children).find(c => Number(c.dataset.dtOrigCol) === origCol);
            const cellB = Array.from(b.children).find(c => Number(c.dataset.dtOrigCol) === origCol);
            const cmp = _compareSortVals(_parseCellSortValue(cellA, headerText), _parseCellSortValue(cellB, headerText), dir);
            return cmp !== 0 ? cmp : (Number(a.dataset.dtOrigRow) - Number(b.dataset.dtOrigRow));
        });
    }

    // Re-append pinned top rows (if they were before sortable rows), then sorted rows
    const frag = document.createDocumentFragment();
    pinnedRows.forEach(r => frag.appendChild(r));
    sortableRows.forEach(r => frag.appendChild(r));
    const noMatchRow = tbody.querySelector('tr[data-dt-empty-row="1"]');
    if (noMatchRow) frag.appendChild(noMatchRow);

    table._isInternalSorting = true;
    try {
        tbody.appendChild(frag);
    } finally {
        setTimeout(() => { table._isInternalSorting = false; }, 80);
    }

    // Update header sort indicators
    table.querySelectorAll('thead tr:first-child th').forEach((th) => {
        const origIdx = Number(th.dataset.dtOrigCol);
        const icon = th.querySelector('.dt-sort-icon');
        const active = state.sort && state.sort.origCol === origIdx && state.sort.dir;
        th.classList.toggle('dt-th-sorted', Boolean(active));
        if (icon) {
            icon.className = active
                ? `dt-sort-icon ${state.sort.dir === 'asc' ? 'ri-arrow-up-s-fill' : 'ri-arrow-down-s-fill'}`
                : 'dt-sort-icon ri-arrow-up-down-line';
        }
    });
}

function _applySearchFilter(table, state, statusEl) {
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    const q = (state.search || '').trim().toLowerCase();
    const colCount = state.columns.length;
    const rows = Array.from(tbody.children).filter(r => r.dataset.dtEmptyRow !== '1');
    const dataRows = rows.filter(r => !(r.children.length === 1 && r.children[0].hasAttribute('colspan')));

    let visibleCount = 0;
    dataRows.forEach((tr) => {
        if (!q) {
            tr.classList.remove('dt-row-hidden');
            visibleCount++;
            return;
        }
        const hay = tr.textContent.toLowerCase();
        const hit = hay.includes(q);
        tr.classList.toggle('dt-row-hidden', !hit);
        if (hit) visibleCount++;
    });

    // Placeholder when local search matches 0 rows
    let emptyRow = tbody.querySelector('tr[data-dt-empty-row="1"]');
    if (q && dataRows.length > 0 && visibleCount === 0) {
        if (!emptyRow) {
            emptyRow = document.createElement('tr');
            emptyRow.dataset.dtEmptyRow = '1';
            const visCols = Math.max(1, colCount - state.hidden.length);
            emptyRow.innerHTML = `
                <td colspan="${visCols}" class="p-0">
                    <div class="app-empty-state is-compact">
                        <div class="app-empty-icon"><i class="ri-search-eye-line"></i></div>
                        <h4 class="app-empty-title">Tidak ada baris yang cocok</h4>
                        <p class="app-empty-sub">Pencarian <strong>"${escapeHtml(state.search)}"</strong> tidak menemukan hasil pada tabel ini.</p>
                    </div>
                </td>
            `;
            tbody.appendChild(emptyRow);
        }
    } else if (emptyRow) {
        emptyRow.remove();
    }

    if (statusEl) {
        if (dataRows.length === 0) {
            statusEl.textContent = '0 baris';
        } else if (q) {
            statusEl.textContent = `${visibleCount} dari ${dataRows.length} baris`;
        } else {
            statusEl.textContent = `${dataRows.length} baris`;
        }
    }
}

function _buildToolbar(wrapper, table, state, tableKey) {
    const hasCustom = !state.order.every((o, i) => o === i) || state.hidden.length > 0 || Object.keys(state.widths).length > 0 || Boolean(state.sort?.dir);
    const bar = document.createElement('div');
    bar.className = 'dt-toolbar no-print';
    bar.dataset.dtToolbarFor = tableKey;
    bar.innerHTML = `
        <div class="dt-search-wrap">
            <i class="ri-search-line dt-search-icon"></i>
            <input type="text" class="dt-search-input" value="${escapeHtml(state.search)}" placeholder="Cari cepat di tabel...">
            <button type="button" class="dt-search-clear ${state.search ? '' : 'hidden'}" title="Hapus pencarian">
                <i class="ri-close-line"></i>
            </button>
        </div>
        <div class="dt-tools-right">
            <span class="dt-count-badge"></span>
            <button type="button" class="dt-sort-pill ${state.sort?.dir ? '' : 'hidden'}" title="Klik untuk hapus pengurutan">
                <i class="ri-sort-asc"></i> <span class="dt-sort-pill-label"></span> <i class="ri-close-line ml-0.5"></i>
            </button>
            <div class="dt-col-menu-wrap relative">
                <button type="button" class="dt-tool-btn dt-col-menu-btn" title="Atur Urutan & Visibilitas Kolom">
                    <i class="ri-layout-column-line"></i>
                    <span>Atur Kolom</span>
                    <i class="ri-arrow-down-s-line text-[13px] opacity-60"></i>
                </button>
                <div class="dt-col-popover hidden"></div>
            </div>
            <button type="button" class="dt-tool-btn dt-reset-btn ${hasCustom ? '' : 'hidden'}" title="Kembalikan urutan, lebar & visibilitas kolom default">
                <i class="ri-refresh-line"></i> <span>Reset</span>
            </button>
        </div>
    `;

    const searchInput = bar.querySelector('.dt-search-input');
    const clearBtn = bar.querySelector('.dt-search-clear');
    const countBadge = bar.querySelector('.dt-count-badge');
    const sortPill = bar.querySelector('.dt-sort-pill');
    const sortPillLabel = bar.querySelector('.dt-sort-pill-label');
    const colBtn = bar.querySelector('.dt-col-menu-btn');
    const popover = bar.querySelector('.dt-col-popover');
    const resetBtn = bar.querySelector('.dt-reset-btn');

    const syncChrome = () => {
        const customized = !state.order.every((o, i) => o === i) || state.hidden.length > 0 || Object.keys(state.widths).length > 0;
        resetBtn.classList.toggle('hidden', !customized && !state.sort?.dir);
        if (state.sort?.dir && state.columns[state.sort.origCol]) {
            sortPill.classList.remove('hidden');
            sortPillLabel.textContent = `${state.columns[state.sort.origCol].label} (${state.sort.dir.toUpperCase()})`;
        } else {
            sortPill.classList.add('hidden');
        }
    };

    const renderPopover = () => {
        const visibleCount = state.columns.length - state.hidden.length;
        const hiddenSet = new Set(state.hidden);
        popover.innerHTML = `
            <div class="dt-popover-head">
                <div>
                    <div class="font-bold text-slate-800 dark:text-slate-100 text-xs">Atur Kolom Tabel</div>
                    <div class="text-[10px] text-slate-400">Seret header kolom atau gunakan panah ↑↓</div>
                </div>
            </div>
            <div class="dt-popover-list scrollbar-thin">
                ${state.order.map((origIdx, pos) => {
                    const col = state.columns[origIdx];
                    const isHidden = hiddenSet.has(origIdx);
                    const disableHide = !isHidden && visibleCount <= 1;
                    return `
                    <div class="dt-popover-item">
                        <label class="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                            <input type="checkbox" data-dt-toggle="${origIdx}" ${isHidden ? '' : 'checked'} ${disableHide ? 'disabled' : ''} class="rounded text-primary-600">
                            <span class="truncate text-xs ${isHidden ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200 font-medium'}">${escapeHtml(col.label)}</span>
                        </label>
                        <div class="flex items-center gap-0.5 shrink-0">
                            <button type="button" data-dt-move="${pos}:-1" ${pos === 0 ? 'disabled' : ''} class="dt-ord-btn" title="Geser ke Kiri"><i class="ri-arrow-up-s-line"></i></button>
                            <button type="button" data-dt-move="${pos}:1" ${pos === state.order.length - 1 ? 'disabled' : ''} class="dt-ord-btn" title="Geser ke Kanan"><i class="ri-arrow-down-s-line"></i></button>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;

        popover.querySelectorAll('[data-dt-toggle]').forEach((cb) => {
            cb.addEventListener('change', () => {
                const idx = Number(cb.dataset.dtToggle);
                if (cb.checked) {
                    state.hidden = state.hidden.filter(x => x !== idx);
                } else if (state.columns.length - state.hidden.length > 1 && !state.hidden.includes(idx)) {
                    state.hidden.push(idx);
                }
                _savePrefs(tableKey, { order: state.order, hidden: state.hidden, widths: state.widths });
                _applyColumnLayout(table, state);
                _applySearchFilter(table, state, countBadge);
                syncChrome();
                renderPopover();
            });
        });

        popover.querySelectorAll('[data-dt-move]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const [posStr, deltaStr] = btn.dataset.dtMove.split(':');
                const pos = Number(posStr);
                const nextPos = pos + Number(deltaStr);
                if (nextPos < 0 || nextPos >= state.order.length) return;
                const copy = [...state.order];
                const [moved] = copy.splice(pos, 1);
                copy.splice(nextPos, 0, moved);
                state.order = copy;
                _savePrefs(tableKey, { order: state.order, hidden: state.hidden, widths: state.widths });
                _applyColumnLayout(table, state);
                syncChrome();
                renderPopover();
            });
        });
    };

    searchInput.addEventListener('input', () => {
        state.search = searchInput.value;
        _sessionSearch.set(tableKey, state.search);
        clearBtn.classList.toggle('hidden', !state.search);
        _applySearchFilter(table, state, countBadge);
    });

    clearBtn.addEventListener('click', () => {
        state.search = '';
        searchInput.value = '';
        _sessionSearch.delete(tableKey);
        clearBtn.classList.add('hidden');
        _applySearchFilter(table, state, countBadge);
        searchInput.focus();
    });

    sortPill.addEventListener('click', () => {
        state.sort = { origCol: null, dir: '' };
        _sessionSort.delete(tableKey);
        _applySort(table, state);
        _applySearchFilter(table, state, countBadge);
        syncChrome();
    });

    colBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = popover.classList.contains('hidden');
        document.querySelectorAll('.dt-col-popover').forEach(p => p.classList.add('hidden'));
        if (willOpen) {
            renderPopover();
            popover.classList.remove('hidden');
        }
    });

    popover.addEventListener('click', (e) => e.stopPropagation());

    resetBtn.addEventListener('click', () => {
        state.order = state.columns.map((_, i) => i);
        state.hidden = [];
        state.widths = {};
        state.sort = { origCol: null, dir: '' };
        _sessionSort.delete(tableKey);
        _clearPrefs(tableKey);
        _applyColumnLayout(table, state);
        _applySort(table, state);
        _applySearchFilter(table, state, countBadge);
        syncChrome();
        popover.classList.add('hidden');
        toast('Tata letak kolom tabel dikembalikan ke default', 'info');
    });

    // Remove previous toolbar tied to this wrapper before inserting
    if (wrapper.previousElementSibling && wrapper.previousElementSibling.classList?.contains('dt-toolbar')) {
        wrapper.previousElementSibling.remove();
    }
    wrapper.parentNode.insertBefore(bar, wrapper);

    return { countBadge, syncChrome };
}

function _bindHeaderInteractions(table, state, tableKey, chromeHooks) {
    const ths = Array.from(table.querySelectorAll('thead tr:first-child th'));
    let dragSrcOrigCol = null;
    let resizingCol = null;
    let wasJustDragging = false;

    ths.forEach((th) => {
        const origIdx = Number(th.dataset.dtOrigCol);
        const colMeta = state.columns[origIdx];
        if (!colMeta) return;

        // Avoid double-wrapping inner content on already prepared headers
        if (!th.querySelector('.dt-th-inner')) {
            const inner = document.createElement('div');
            inner.className = 'dt-th-inner';
            if (th.classList.contains('text-right')) inner.classList.add('justify-end');
            else if (th.classList.contains('text-center')) inner.classList.add('justify-center');

            const grip = document.createElement('span');
            grip.className = 'dt-drag-grip';
            grip.innerHTML = '<i class="ri-draggable"></i>';
            grip.title = 'Seret untuk ubah urutan kolom';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'dt-th-label';
            while (th.firstChild) labelSpan.appendChild(th.firstChild);

            inner.appendChild(grip);
            inner.appendChild(labelSpan);

            if (colMeta.sortable) {
                const sortIcon = document.createElement('i');
                sortIcon.className = 'dt-sort-icon ri-arrow-up-down-line';
                inner.appendChild(sortIcon);
                th.classList.add('dt-sortable');
                th.title = `Klik untuk urutkan "${colMeta.label}" · Seret untuk pindah posisi kolom`;
            }

            const resizeHandle = document.createElement('span');
            resizeHandle.className = 'dt-resize-handle';
            resizeHandle.title = 'Seret untuk ubah lebar kolom';
            resizeHandle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                resizingCol = {
                    th,
                    origIdx,
                    startX: e.clientX,
                    startWidth: th.getBoundingClientRect().width
                };
                th.draggable = false;
                document.body.classList.add('dt-is-resizing');

                const onMove = (mv) => {
                    if (!resizingCol) return;
                    const nextW = Math.max(68, Math.round(resizingCol.startWidth + (mv.clientX - resizingCol.startX)));
                    resizingCol.th.style.width = `${nextW}px`;
                    resizingCol.th.style.minWidth = `${nextW}px`;
                    state.widths[origIdx] = nextW;
                };
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    document.body.classList.remove('dt-is-resizing');
                    if (resizingCol) {
                        resizingCol.th.draggable = true;
                        _savePrefs(tableKey, { order: state.order, hidden: state.hidden, widths: state.widths });
                        chromeHooks.syncChrome();
                        resizingCol = null;
                    }
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });

            th.appendChild(inner);
            th.appendChild(resizeHandle);
        }

        // Click column header to sort (ASC -> DESC -> NONE)
        th.addEventListener('click', (e) => {
            if (wasJustDragging) { wasJustDragging = false; return; }
            if (e.target.closest('.dt-resize-handle') || resizingCol) return;
            if (!colMeta.sortable) return;
            if (state.sort.origCol !== origIdx) {
                state.sort = { origCol: origIdx, dir: 'asc' };
            } else if (state.sort.dir === 'asc') {
                state.sort = { origCol: origIdx, dir: 'desc' };
            } else {
                state.sort = { origCol: null, dir: '' };
            }
            if (state.sort.dir) _sessionSort.set(tableKey, state.sort);
            else _sessionSort.delete(tableKey);

            _applySort(table, state);
            _applySearchFilter(table, state, chromeHooks.countBadge);
            chromeHooks.syncChrome();
        });

        // HTML5 Drag & Drop column reordering
        th.draggable = true;
        th.addEventListener('dragstart', (e) => {
            if (resizingCol) { e.preventDefault(); return; }
            wasJustDragging = true;
            dragSrcOrigCol = origIdx;
            th.classList.add('dt-th-dragging');
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(origIdx));
            }
        });

        th.addEventListener('dragover', (e) => {
            if (dragSrcOrigCol === null || dragSrcOrigCol === origIdx) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            const rect = th.getBoundingClientRect();
            const isRight = (e.clientX - rect.left) > (rect.width / 2);
            table.querySelectorAll('thead tr:first-child th').forEach(x => x.classList.remove('dt-drop-left', 'dt-drop-right'));
            th.classList.add(isRight ? 'dt-drop-right' : 'dt-drop-left');
        });

        th.addEventListener('dragleave', () => {
            th.classList.remove('dt-drop-left', 'dt-drop-right');
        });

        th.addEventListener('drop', (e) => {
            e.preventDefault();
            const dropRight = th.classList.contains('dt-drop-right');
            table.querySelectorAll('thead tr:first-child th').forEach(x => x.classList.remove('dt-drop-left', 'dt-drop-right', 'dt-th-dragging'));
            if (dragSrcOrigCol === null || dragSrcOrigCol === origIdx) return;

            const newOrder = state.order.filter(id => id !== dragSrcOrigCol);
            let targetPos = newOrder.indexOf(origIdx);
            if (targetPos === -1) return;
            if (dropRight) targetPos++;
            newOrder.splice(targetPos, 0, dragSrcOrigCol);

            state.order = newOrder;
            _savePrefs(tableKey, { order: state.order, hidden: state.hidden, widths: state.widths });
            _applyColumnLayout(table, state);
            chromeHooks.syncChrome();
            dragSrcOrigCol = null;
        });

        th.addEventListener('dragend', () => {
            dragSrcOrigCol = null;
            table.querySelectorAll('thead tr:first-child th').forEach(x => x.classList.remove('dt-drop-left', 'dt-drop-right', 'dt-th-dragging'));
            setTimeout(() => { wasJustDragging = false; }, 120);
        });
    });

    // Click row / cell selection & double-click copy cell text
    const tbody = table.querySelector('tbody');
    if (tbody) {
        tbody.addEventListener('click', (e) => {
            if (e.target.closest('button, a, input, select, textarea, label')) return;
            const tr = e.target.closest('tr');
            if (!tr || tr.dataset.dtEmptyRow === '1') return;
            if (tr.children.length === 1 && tr.children[0].hasAttribute('colspan')) return;
            const wasSelected = tr.classList.contains('dt-row-selected');
            tbody.querySelectorAll('tr.dt-row-selected').forEach(r => r.classList.remove('dt-row-selected'));
            tbody.querySelectorAll('td.dt-cell-selected').forEach(c => c.classList.remove('dt-cell-selected'));
            if (!wasSelected) {
                tr.classList.add('dt-row-selected');
                const td = e.target.closest('td');
                if (td) td.classList.add('dt-cell-selected');
            }
        });

        tbody.addEventListener('dblclick', (e) => {
            if (e.target.closest('button, a, input, select, textarea')) return;
            const td = e.target.closest('td');
            if (!td) return;
            const txt = _normalizeText(td.textContent);
            if (!txt || txt === '-' || txt.length > 140) return;
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                navigator.clipboard.writeText(txt).then(() => {
                    toast(`Teks disalin: "${txt.length > 42 ? txt.slice(0, 42) + '…' : txt}"`, 'info');
                }).catch(() => {});
            }
        });
    }
}

export function refreshDataTables(rootEl = document) {
    if (!rootEl) return;
    const ownerTable = rootEl.closest?.('table.data-table');
    const tables = ownerTable
        ? [ownerTable]
        : (typeof rootEl.querySelectorAll === 'function' ? Array.from(rootEl.querySelectorAll('table.data-table')) : []);
    tables.forEach((table) => {
        if (table.dataset.dt === 'off') return;
        if (typeof table._dtRefresh === 'function') {
            table._dtRefresh();
        } else {
            enhanceTable(table);
        }
    });
}

export function enhanceTable(table) {
    if (!table || table.dataset.dtInit === '1' || table.dataset.dt === 'off') return;
    const headRow = table.querySelector('thead tr:first-child');
    if (!headRow) return;
    const headerCells = Array.from(headRow.children).filter(el => el.tagName === 'TH');
    if (headerCells.length < 2) return;
    if (headerCells.some(th => Number(th.getAttribute('colspan') || 1) > 1)) return;

    table.dataset.dtInit = '1';

    let wrapper = table.closest('.table-wrapper');
    if (!wrapper) {
        if (table.parentElement && table.parentElement.classList.contains('overflow-x-auto')) {
            wrapper = table.parentElement;
            wrapper.classList.add('table-wrapper');
        } else {
            wrapper = document.createElement('div');
            wrapper.className = 'table-wrapper overflow-x-auto';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
    }

    const colCount = headerCells.length;
    const tableKey = _buildTableKey(table);
    const saved = _loadPrefs(tableKey, colCount);

    const columns = headerCells.map((th, idx) => {
        const label = _normalizeText(th.textContent) || `Kolom ${idx + 1}`;
        return {
            origCol: idx,
            label,
            sortable: !_isActionHeader(label) && th.dataset.nosort !== '1'
        };
    });

    const state = {
        columns,
        order: saved ? [...saved.order] : columns.map((_, i) => i),
        hidden: saved ? [...saved.hidden] : [],
        widths: saved ? { ...saved.widths } : {},
        search: _sessionSearch.get(tableKey) || '',
        sort: _sessionSort.get(tableKey) || { origCol: null, dir: '' }
    };

    _tagOriginalColumns(table, colCount);
    const chromeHooks = _buildToolbar(wrapper, table, state, tableKey);
    _bindHeaderInteractions(table, state, tableKey, chromeHooks);

    const runLayoutAndFilter = () => {
        _tagOriginalColumns(table, colCount);
        _applyColumnLayout(table, state);
        if (state.sort?.dir) _applySort(table, state);
        _applySearchFilter(table, state, chromeHooks.countBadge);
        chromeHooks.syncChrome();
    };

    table._dtRefresh = runLayoutAndFilter;
    _applyColumnLayout(table, state);
    if (state.sort?.dir) _applySort(table, state);
    _applySearchFilter(table, state, chromeHooks.countBadge);
    chromeHooks.syncChrome();

    // Auto-detect dynamic AJAX/API row insertions on tbody (e.g. loadInvoices, loadClients)
    const tbody = table.querySelector('tbody');
    if (tbody && !table._dtTbodyObserver) {
        let isObserverActive = false;
        const tbodyObserver = new MutationObserver((mutations) => {
            if (isObserverActive || table._isInternalSorting) return;
            let hasChildChange = false;
            for (const m of mutations) {
                if (m.type === 'childList') {
                    hasChildChange = true;
                    break;
                }
            }
            if (hasChildChange) {
                isObserverActive = true;
                requestAnimationFrame(() => {
                    try {
                        runLayoutAndFilter();
                    } finally {
                        isObserverActive = false;
                    }
                });
            }
        });
        tbodyObserver.observe(tbody, { childList: true });
        table._dtTbodyObserver = tbodyObserver;
    }

    // Horizontal & vertical scroll shadow indicators for sticky/wide tables
    const syncScrollShadows = () => {
        const maxX = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
        wrapper.classList.toggle('is-scrollable-left', wrapper.scrollLeft > 4);
        wrapper.classList.toggle('is-scrollable-right', maxX - wrapper.scrollLeft > 4);
        wrapper.classList.toggle('is-scrolled-y', wrapper.scrollTop > 4);
    };
    if (wrapper.dataset.dtScrollBound !== '1') {
        wrapper.dataset.dtScrollBound = '1';
        wrapper.addEventListener('scroll', syncScrollShadows, { passive: true });
        window.addEventListener('resize', syncScrollShadows);
    }
    requestAnimationFrame(syncScrollShadows);
}

export function enhanceDataTables(rootEl = document) {
    if (!rootEl || typeof rootEl.querySelectorAll !== 'function') return;
    rootEl.querySelectorAll('table.data-table:not([data-dt="off"]):not([data-dt-init="1"])').forEach((table) => {
        enhanceTable(table);
    });
}

export function initDataTableObserver() {
    if (_observerBound || typeof MutationObserver === 'undefined') return;
    _observerBound = true;

    // Close column popovers on outside click
    document.addEventListener('click', (e) => {
        if (!e.target?.closest?.('.dt-col-menu-wrap')) {
            document.querySelectorAll('.dt-col-popover').forEach(p => p.classList.add('hidden'));
        }
    });

    let rafId = null;
    const pendingRoots = new Set();
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.nodeType !== 1) continue;
                if (
                    (node.matches && node.matches('table.data-table:not([data-dt-init="1"])')) ||
                    (node.querySelector && node.querySelector('table.data-table:not([data-dt-init="1"])'))
                ) {
                    pendingRoots.add(node.parentElement || node);
                }
            }
        }
        if (pendingRoots.size > 0 && !rafId) {
            rafId = requestAnimationFrame(() => {
                rafId = null;
                pendingRoots.forEach(r => enhanceDataTables(r));
                pendingRoots.clear();
            });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}
