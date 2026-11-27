# Panduan Pengembang & Instruksi AI Agent (AGENTS.md)

Dokumen ini adalah acuan operasional bagi pengembang dan AI Agent yang bertugas memodifikasi, memperluas, atau memelihara basis kode **CRUDWorks ERP** di direktori `d:/laragon/www/crudworks-home`.

---

## 1. Filosofi & Batasan Rekayasa

1. **Native PHP & Vanilla JS**: Dilarang menginstal framework berbasis Node.js (React, Vue, Vite, Next.js) atau framework backend PHP (Laravel, Symfony, CodeIgniter). Seluruh arsitektur harus tetap mempertahankan struktur lightweight modular monolith tanpa build-step.
2. **Kepatuhan Terhadap 7 Skill Anti-Slop**:
   Seluruh AI Agent dan kontributor wajib tunduk pada standar rekayasa di [docs/SKILLS-AND-ANTI-SLOP.md](file:///d:/laragon/www/crudworks-home/docs/SKILLS-AND-ANTI-SLOP.md):
   - `taste-skill`: Desain visual berkelas, hierarki jelas, tipografi angka monospaced, navigasi dock + taskbar.
   - `anti-slop`: Bebas boilerplate dan komentar tanpa faedah teknis.
   - `impeccable`: Presisi tata letak, margin lega pada tabel (28px edge padding), micro-interactions responsif.
   - `humanizer`: Copywriting natural bahasa Indonesia istilah bisnis riil tanpa terjemahan kaku.
   - `stop-slop`: Komponen dan tombol memiliki aksi fungsional operasional ke database (bukan hiasan dummy).
   - `no-ai-slop`: Tanpa mock data palsu atau shortcut `TODO` yang ditinggalkan kosong.
   - `avoid-ai-writing`: Dokumentasi dan changelog ringkas, lugas, tanpa kalimat berbunga-bunga.
3. **Database Prepared Statements Only**:
   - Dilarang keras melakukan konkatenasi SQL: `SELECT * FROM table WHERE id = " . $id` (HARAM).
   - Selalu gunakan wrapper singleton: `Database::getInstance()->fetchAll($query, $params)` atau `execute($query, $params)`.
4. **Keamanan Sesi & CSRF**:
   - Seluruh mutasi state (`POST`, `PUT`, `DELETE`) wajib divalidasi dengan `verifyCsrfToken()`.
   - Seluruh pemanggilan mutasi dari frontend wajib menyertakan header `X-CSRF-Token: App.csrfToken`.

---

## 2. Struktur Proyek & Peta Modul

```
crudworks-home/
├── api/
│   ├── index.php             # Front controller tunggal API
│   ├── config/
│   │   ├── env.php           # Parser .env
│   │   ├── app.php           # Konstanta aplikasi & error reporting
│   │   ├── database.php      # Singleton PDO koneksi MySQL
│   │   ├── redis.php         # Singleton Redis & session handler
│   │   ├── menus.json        # Struktur menu RBAC & permission code
│   │   └── invoice_helpers.php # Format IDR, kalkulasi pajak, nomor tagihan
│   ├── middleware/
│   │   ├── auth.php          # authCheck()
│   │   ├── csrf.php          # verifyCsrfToken(), generateCsrfToken()
│   │   └── rbac.php          # checkPermission(), getUserMenus()
│   └── controllers/          # Business logic per domain
├── assets/
│   ├── css/
│   │   └── app.css           # Custom styling & layout
│   └── js/
│       ├── app.js            # Core SPA (Router, AJAX, State, Layout)
│       └── pages/            # ES Module per rute (#/clients, #/invoices, dll)
├── docs/                     # PRD dan panduan teknis
├── database.sql              # Skema DDL dan data awal
├── index.html                # Shell SPA
└── index.php                 # Dynamic version injection & HTML shell delivery
```

---

## 3. Tata Cara Menambahkan Modul Baru

Jika Anda diminta membuat modul baru (misal: `expenses` / pengeluaran):

### Langkah 1: Tambahkan Entitas Database di `database.sql`

Buat tabel dengan engine `InnoDB`, charset `utf8mb4_unicode_ci`, foreign key yang sesuai, dan indeks pada kolom filter/pencarian.

### Langkah 2: Daftarkan Permission & Menu di `api/config/menus.json`

Tambahkan entri ke `menus.json` dengan menyertakan `perm` (misal: `expense.view`). Tambahkan pula permission terkait ke tabel `permissions` dan hubungkan ke role di `role_permissions`.

### Langkah 3: Buat Controller Backend di `api/controllers/ExpenseController.php`

- Lakukan pengecekan autentikasi: `authCheck();`
- Lakukan verifikasi izin akses: `checkPermission('expense.view');` (atau `expense.create` untuk aksi penambahan).
- Tangani parameter `$method`, `$id`, dan `$action` yang dipersiapkan oleh `api/index.php`.
- Gunakan `jsonResponse()`, `successResponse()`, atau `paginatedResponse()`.
- Jika ada penambahan/perubahan/penghapusan, panggil `logActivity()` dan invalidasi cache terkait via `clearCache(['expenses'])`.

### Langkah 4: Daftarkan Route di `api/index.php`

Tambahkan klausa `case 'expenses':` ke blok switch di `api/index.php`.

### Langkah 5: Buat Page Module Frontend di `assets/js/pages/expenses.js`

Ekspor fungsi inisialisasi:

```javascript
export async function init(container) {
  container.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Pengeluaran Operasional</h1>
                <button id="btn-add-expense" class="px-4 py-2 bg-primary-600 text-white rounded-xl">Tambah</button>
            </div>
            <div id="expense-table-container"></div>
        </div>
    `;
  // Bind event handlers & load data via App.api()
}
```

### Langkah 6: Daftarkan Rute di Hash Router `assets/js/app.js`

Daftarkan path modul ke pemetaan rute di `app.js` agar modul di-load secara dinamis saat navigasi beralih ke `#/expenses`.

---

## 4. Panduan Penulisan Kode (Conventions)

### Wajib Fungsi Terpadu (_Unified Helpers First_)

- **Setiap kali membuat fungsi baru yang berpotensi dipakai di lebih dari satu tempat, wajib buat dalam bentuk fungsi terpadu (reusable helper)** — jangan menyalin-tempel blok logika yang sama di banyak controller atau halaman.
- Sebelum menulis fungsi utilitas baru, periksa dan gunakan helper terpadu yang sudah tersedia:
  - **PHP Backend**:
    - Penomoran dokumen otomatis: `generateDocNumber($table, $column, $prefix, $pad, $withYearMonth, $separator)` di `api/config/invoice_helpers.php` (serta `generateInvoiceNo()` & `generatePaymentNo()`).
    - Cache Redis laporan & invalidasi: `initReportCache()`, `cacheGet()`, `cacheSet()`, dan `clearCache()` di `api/index.php`.
    - Validasi input & enum: `requireParams()` dan `validateEnum()` di `api/index.php`.
    - Unggahan file aman terpusat: `saveUploadedFile()` di `api/index.php`.
    - Paginasi API standar: `paginatedResponse()` di `api/index.php`.
  - **JavaScript Frontend**:
    - Pagination tabel seragam: `App.renderPagination(containerEl, pagination, onPageChange, itemLabel)`.
    - Pengiriman & normalisasi WhatsApp: `App.openWhatsApp(phone, message)` dan `App.formatWhatsAppPhone(phone)`.
    - Ekspor CSV kompatibel Excel: `App.exportCsv(filename, headers, rows)`.
    - Status badge terpusat & pencarian: `App.renderStatusBadge(status, domain)` dan `App.debounce(fn, 300)`.
    - Format mata uang & tanggal: `App.formatIDR(value)` dan `App.formatDate(dateString)`.

### Aturan Kebersihan Kode & Anti-Duplikasi (Wajib 7 Poin)

1. **Satu Sumber Kebenaran Status**: Gunakan `App.renderStatusBadge()`, jangan mendefinisikan ulang objek warna/ikon badge di tiap halaman.
2. **Wajib `paginatedResponse()`**: Jangan menulis ulang `LIMIT`/`OFFSET` dan struktur JSON `pagination` secara manual.
3. **Validasi Terpadu**: Gunakan `requireParams()` dan `validateEnum()` untuk field wajib dan pengecekan `ENUM`.
4. **Event Binding & Debounce**: Pasang event listener di `container` (bukan menumpuk di `document` pada setiap `init()`), dan gunakan `App.debounce()` untuk input pencarian.
5. **Batas Ukuran File & Modularisasi Bertahap**: Modul/controller baru wajib dijaga di bawah `450` baris. Untuk berkas lama yang sudah melampaui `800` baris (seperti `app.js`, `utils.js`, `projects.js`), setiap penambahan fitur baru `> 100` baris wajib diekstrak ke sub-modul di `api/config/*_helpers.php` atau `assets/js/core/*.js` (dan di-lazy-load bila tidak dibutuhkan saat initial load).
6. **Sinkronisasi DB & PWA**: Setiap perubahan SQL wajib diperbarui di `database.sql` & `docs/prd/03-desain-database.md`; setiap perubahan JS/CSS wajib menaikkan `CACHE_NAME` di `sw.js` (atau `portal/sw.js`).
7. **Satu Pintu Dialog**: Dilarang memakai `alert()`, `confirm()`, `prompt()` bawaan browser; gunakan `SweetAlert2`, `App.confirm()`, atau `App.modal()`.

### Aturan Keamanan & Integritas Keuangan (Wajib 6 Poin)

1. **Upload Terpusat**: Gunakan `saveUploadedFile()` untuk unggahan file (validasi MIME `finfo`, batas ukuran, nama acak).
2. **Anti Double-Submit**: Gunakan `App.btnLoading()` di tombol mutasi frontend dan cek idempotency di backend agar konversi/transaksi tidak dobel.
3. **Presisi Keuangan**: Gunakan `DECIMAL(15,2)` dan `round($val, 2)` dengan toleransi lunas `<= 0.01`.
4. **Isolasi Data Publik**: Endpoint publik & Portal Klien wajib _explicit `SELECT`_ tanpa `catatan_internal` atau data klien lain.
5. **Proteksi Hapus Transaksi**: Tolak `DELETE` permanen pada faktur `lunas`/berbayar, kontrak sah, atau jurnal tutup buku; gunakan status `batal`/`nonaktif`.
6. **Error Ramah Pengguna**: Kembalikan pesan bahasa Indonesia yang aman via `errorResponse()` tanpa membocorkan detail SQL/stack trace.

### Aturan Tata Kelola, Rilis & Definition of Done (Wajib 6 Poin)

1. **Migrasi Database Aman & Folder `scratch/`**: Kolom/tabel baru wajib _backward-compatible_ (`NULL` atau `DEFAULT` aman). Setiap perubahan database wajib dibuatkan file migrasi `.sql` bernomor urut di folder `scratch/` (mis. `scratch/20261127_01_nama.sql`) serta disinkronkan ke `database.sql` & `docs/prd/03-desain-database.md`. Saat aplikasi di-refresh di produksi (`index.php`), `migration_runner.php` akan menjalankan file di `scratch/` **1x saja** dan mencatatnya di tabel `schema_migrations` agar tidak dijalankan ulang pada refresh berikutnya.
2. **Standar Permission RBAC**: Gunakan pola `<domain>.view|create|edit|delete|manage` di `api/config/menus.json`, `permissions`, dan `role_permissions`.
3. **Transaksi & Urutan Cache**: Panggil `clearCache()` dan `logActivity()` **hanya setelah `$pdo->commit()` berhasil**, jangan di dalam transaksi sebelum commit.
4. **UI Responsif, Dark Mode & Aksesibel**: Komponen baru wajib mendukung `dark:*`, rapi di mobile-desktop, dan tombol ikon wajib punya `title`/`aria-label`.
5. **Proporsi Tabel, Taskbar Safe-Area & Modal**: Kontainer `#app-content` wajib menjaga `pb-24` (aman dari taskbar bawah), dropdown/popover mengambang wajib menghormati `safeBottom`, sel tabel status/angka/aksi wajib `whitespace-nowrap` (teks panjang pakai `truncate` + `title`), dan modal panjang wajib memakai header/footer _sticky_ (`flex flex-col` + `overflow-y-auto` di body).
6. **Gerbang Verifikasi (DoD)**: Wajib lulus `php -l` (PHP), `node -c` (JS), validasi JSON (`menus.json`), serta cek endpoint/halaman live (dapat dijalankan terpadu melalui `powershell -ExecutionPolicy Bypass -File scripts/verify.ps1`).
7. **Changelog Bahasa Pelanggan**: Catat rilis fitur baru di `CHANGELOG.md` dengan bahasa bisnis untuk pelanggan, bukan jargon teknis internal.

### PHP Backend

- Selalu gunakan strict typing bila memungkinkan (`declare(strict_types=1);`).
- Hindari `die()` atau `echo` mentah di dalam controller; gunakan `jsonResponse()`, `successResponse()`, atau `errorResponse()`.
- Setiap transaksi multi-tabel (misal: membuat invoice + menyisipkan item invoice) wajib dibungkus dalam blok transaksi PDO:
  ```php
  $db = Database::getInstance();
  $pdo = $db->getPdo();
  $pdo->beginTransaction();
  try {
      // Operasi 1: Insert invoice header
      // Operasi 2: Loop insert invoice_items
      $pdo->commit();
  } catch (\Throwable $e) {
      $pdo->rollBack();
      errorResponse('Gagal memproses invoice: ' . $e->getMessage(), 500);
  }
  ```

### JavaScript Frontend

- Gunakan sintaks modern: `const`/`let`, arrow functions, `async`/`await`, template literals, dan destructuring.
- Jangan gunakan `alert()`, `confirm()`, atau `prompt()` bawaan peramban; selalu gunakan `SweetAlert2` atau `App.modal()`.
- Format nilai mata uang menggunakan helper: `App.formatIDR(value)`.
- Format tanggal menggunakan helper: `App.formatDate(dateString)`.

---

## 5. Hubungan dengan Proyek `app-git`

Proyek `app-git` yang terletak di `d:/laragon/www/app-git` berfungsi sebagai pengelola deployment Git lokal. CRUDWorks ERP terhubung dengan menyimpan path repositori klien di tabel `projects` (`git_repo_url`, `git_branch`, `deploy_path`, `app_url`).

Ketika memeriksa status aplikasi pelanggan:

- Periksa keberadaan folder `deploy_path`.
- Baca file konfigurasi `.env` pada folder target jika diperlukan untuk sinkronisasi kredensial.
- Tampilkan indikator status deployment ("idle", "success", "failed") secara visual di dashboard project klien.
