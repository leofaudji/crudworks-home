// assets/js/core/email-editor.js — Editor Email bergaya Gmail + Upload Gambar + Sanitasi HTML Aman
import { escapeHtml } from './utils.js';

const ALLOWED_TAGS = new Set([
    'b', 'strong', 'i', 'em', 'u', 's', 'strike',
    'p', 'div', 'br', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'span'
]);

/**
 * Sanitasi HTML email agar aman dari XSS sebelum dirender ke DOM.
 */
export function sanitizeEmailHtml(raw) {
    const str = String(raw ?? '').trim();
    if (!str) return '';

    const doc = new DOMParser().parseFromString(str, 'text/html');
    const walk = (node) => {
        const out = [];
        node.childNodes.forEach((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
                out.push(escapeHtml(child.textContent || ''));
                return;
            }
            if (child.nodeType !== Node.ELEMENT_NODE) return;

            const tag = child.tagName.toLowerCase();
            if (!ALLOWED_TAGS.has(tag)) {
                if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object') return;
                out.push(walk(child));
                return;
            }

            if (tag === 'br') {
                out.push('<br>');
                return;
            }

            let attrs = '';
            if (tag === 'a') {
                const href = (child.getAttribute('href') || '').trim();
                if (/^(https?:\/\/|mailto:)/i.test(href)) {
                    attrs = ` href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 underline"`;
                }
            } else if (tag === 'blockquote') {
                attrs = ' class="border-l-2 border-slate-300 dark:border-slate-600 pl-3 my-1.5 text-slate-600 dark:text-slate-400 italic"';
            } else if (tag === 'pre' || tag === 'code') {
                attrs = ' class="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"';
            } else if (tag === 'ul') {
                attrs = ' class="list-disc pl-5 my-1 space-y-0.5"';
            } else if (tag === 'ol') {
                attrs = ' class="list-decimal pl-5 my-1 space-y-0.5"';
            }

            out.push(`<${tag}${attrs}>${walk(child)}</${tag}>`);
        });
        return out.join('');
    };

    return walk(doc.body);
}

export function renderEmailBody(raw) {
    const str = String(raw ?? '').trim();
    if (!str) return '';
    if (/<[a-z][\s\S]*>/i.test(str)) {
        return sanitizeEmailHtml(str);
    }
    return escapeHtml(str).replace(/\r?\n/g, '<br>');
}

export function renderEmailAttachments(lampiranJson, basePrefix = '') {
    let list = [];
    if (Array.isArray(lampiranJson)) {
        list = lampiranJson;
    } else if (typeof lampiranJson === 'string' && lampiranJson.trim()) {
        try { list = JSON.parse(lampiranJson); } catch (_) { list = []; }
    }
    if (!Array.isArray(list) || list.length === 0) return '';

    return `
        <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
            ${list.map((it) => {
                const src = basePrefix + String(it.url || '').replace(/^\/+/, '');
                const name = escapeHtml(it.name || 'Lampiran');
                return `
                    <a href="${escapeHtml(src)}" target="_blank" rel="noopener" class="group relative block w-24 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 hover:border-indigo-400 transition" title="${name}">
                        <img src="${escapeHtml(src)}" alt="${name}" class="w-24 h-16 object-cover">
                        <div class="px-1.5 py-1 text-[10px] text-slate-600 dark:text-slate-300 truncate">${name}</div>
                    </a>`;
            }).join('')}
        </div>`;
}

/**
 * Inisialisasi Rich Text Email Composer bergaya Gmail + Upload/Paste Gambar.
 */
export function initEmailComposer(containerEl, {
    placeholder = 'Tulis pesan Anda di sini… (bisa tempel screenshot langsung dengan Ctrl+V)',
    minHeight = 200,
    onNotify = null
} = {}) {
    if (!containerEl) return null;

    const notify = (msg, type = 'warning') => {
        if (typeof onNotify === 'function') onNotify(msg, type);
        else if (window.App?.toast) window.App.toast(msg, type);
    };

    const images = [];

    containerEl.innerHTML = `
        <div class="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-600/20 focus-within:border-indigo-600 transition">
            <!-- Toolbar Formatting ala Gmail -->
            <div class="flex flex-wrap items-center gap-0.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                <button type="button" data-cmd="undo" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Urungkan (Ctrl+Z)"><i class="ri-arrow-go-back-line text-sm"></i></button>
                <button type="button" data-cmd="redo" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Ulangi (Ctrl+Y)"><i class="ri-arrow-go-forward-line text-sm"></i></button>
                <span class="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></span>
                <button type="button" data-cmd="bold" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 font-bold" title="Tebal (Ctrl+B)"><i class="ri-bold text-sm"></i></button>
                <button type="button" data-cmd="italic" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Miring (Ctrl+I)"><i class="ri-italic text-sm"></i></button>
                <button type="button" data-cmd="underline" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Garis Bawah (Ctrl+U)"><i class="ri-underline text-sm"></i></button>
                <button type="button" data-cmd="strikeThrough" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Coret"><i class="ri-strikethrough text-sm"></i></button>
                <span class="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></span>
                <button type="button" data-cmd="insertUnorderedList" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Daftar Poin"><i class="ri-list-unordered text-sm"></i></button>
                <button type="button" data-cmd="insertOrderedList" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Daftar Bernomor"><i class="ri-list-ordered text-sm"></i></button>
                <button type="button" data-cmd="formatBlock" data-val="blockquote" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Kutipan"><i class="ri-double-quotes-l text-sm"></i></button>
                <button type="button" data-cmd="formatBlock" data-val="pre" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Blok Kode / Log Error"><i class="ri-code-s-slash-line text-sm"></i></button>
                <span class="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></span>
                <button type="button" data-action="link" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Sisipkan Tautan"><i class="ri-link text-sm"></i></button>
                <button type="button" data-cmd="removeFormat" class="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800" title="Hapus Format"><i class="ri-format-clear text-sm"></i></button>
                <span class="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></span>
                <button type="button" data-action="pick-image" class="px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold inline-flex items-center gap-1" title="Unggah Gambar / Screenshot">
                    <i class="ri-image-add-line text-sm"></i><span>Gambar</span>
                </button>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple class="hidden" data-file-input>
            </div>

            <!-- Area Tulis Besar -->
            <div class="relative">
                <div contenteditable="true" data-editor
                     class="w-full px-3.5 py-3 text-sm text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none overflow-y-auto resize-y"
                     style="min-height:${minHeight}px;max-height:420px;"></div>
                <div data-placeholder class="pointer-events-none absolute top-3 left-3.5 right-3.5 text-xs text-slate-400 select-none">${escapeHtml(placeholder)}</div>
            </div>

            <!-- Preview Lampiran Gambar -->
            <div data-attachments class="hidden px-3.5 py-2.5 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2"></div>
        </div>
    `;

    const editor = containerEl.querySelector('[data-editor]');
    const phEl = containerEl.querySelector('[data-placeholder]');
    const fileInput = containerEl.querySelector('[data-file-input]');
    const attBox = containerEl.querySelector('[data-attachments]');

    const syncPlaceholder = () => {
        const hasText = (editor.textContent || '').trim().length > 0 || editor.querySelector('ul,ol,blockquote,pre');
        phEl.classList.toggle('hidden', !!hasText);
    };

    const renderThumbs = () => {
        if (images.length === 0) {
            attBox.classList.add('hidden');
            attBox.innerHTML = '';
            return;
        }
        attBox.classList.remove('hidden');
        attBox.innerHTML = images.map((img, i) => `
            <div class="relative group w-24 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                <img src="${img.data}" alt="${escapeHtml(img.name)}" class="w-24 h-16 object-cover">
                <div class="px-1.5 py-1 text-[10px] text-slate-600 dark:text-slate-300 truncate">${escapeHtml(img.name)}</div>
                <button type="button" data-rm-img="${i}" class="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 text-white text-xs flex items-center justify-center hover:bg-rose-600" title="Hapus gambar">×</button>
            </div>
        `).join('');
    };

    const addFiles = (fileList) => {
        Array.from(fileList || []).forEach((file) => {
            if (!/^image\/(png|jpeg|webp|gif)$/i.test(file.type)) {
                notify('Format gambar harus PNG, JPG, WEBP, atau GIF', 'warning');
                return;
            }
            if (file.size > 3 * 1024 * 1024) {
                notify(`Ukuran "${file.name}" melebihi batas 3 MB`, 'warning');
                return;
            }
            if (images.length >= 5) {
                notify('Maksimal 5 lampiran gambar per pesan', 'warning');
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                if (images.length < 5) {
                    images.push({ name: file.name || `screenshot-${images.length + 1}.png`, data: String(reader.result || '') });
                    renderThumbs();
                }
            };
            reader.readAsDataURL(file);
        });
    };

    containerEl.addEventListener('click', (e) => {
        const rm = e.target.closest('[data-rm-img]');
        if (rm) {
            images.splice(Number(rm.dataset.rmImg), 1);
            renderThumbs();
            return;
        }

        const cmdBtn = e.target.closest('[data-cmd]');
        if (cmdBtn) {
            e.preventDefault();
            editor.focus();
            document.execCommand(cmdBtn.dataset.cmd, false, cmdBtn.dataset.val || null);
            syncPlaceholder();
            return;
        }

        const actBtn = e.target.closest('[data-action]');
        if (!actBtn) return;
        const act = actBtn.dataset.action;
        if (act === 'pick-image') {
            fileInput.click();
        } else if (act === 'link') {
            const url = window.prompt('Masukkan URL tautan (https://...):', 'https://');
            if (url && /^https?:\/\//i.test(url.trim())) {
                editor.focus();
                document.execCommand('createLink', false, url.trim());
                syncPlaceholder();
            }
        }
    });

    fileInput.addEventListener('change', () => {
        addFiles(fileInput.files);
        fileInput.value = '';
    });

    editor.addEventListener('input', syncPlaceholder);
    editor.addEventListener('paste', (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const imgFiles = [];
        for (const it of items) {
            if (it.kind === 'file' && it.type.startsWith('image/')) {
                const f = it.getAsFile();
                if (f) imgFiles.push(f);
            }
        }
        if (imgFiles.length > 0) {
            e.preventDefault();
            addFiles(imgFiles);
        }
    });

    editor.addEventListener('dragover', (e) => { e.preventDefault(); });
    editor.addEventListener('drop', (e) => {
        if (e.dataTransfer?.files?.length) {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
        }
    });

    return {
        getHtml: () => sanitizeEmailHtml(editor.innerHTML),
        getImages: () => images.slice(),
        hasContent: () => (editor.textContent || '').trim().length > 0 || images.length > 0,
        clear: () => {
            editor.innerHTML = '';
            images.length = 0;
            syncPlaceholder();
            renderThumbs();
        },
        focus: () => editor.focus()
    };
}
