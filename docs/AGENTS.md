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
