# Changelog

Semua perubahan penting pada proyek **CRUDWorks ERP** didokumentasikan di dalam file ini.
Format penulisan berpedoman pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan mengikuti standar [Semantic Versioning](https://semver.org/lang/id/).

---

## [1.7.42] - 2026-11-21

### Ditambahkan (Added)

- **Modul Kontrak Kerja / SPK Digital ([api/controllers/ContractController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ContractController.php), [assets/js/pages/contracts.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/contracts.js), [portal/pages/quotations.js](file:///d:/laragon/www/crudworks-home/portal/pages/quotations.js))**:
  - Menambahkan tabel `contracts`, menu `#/contracts`, tombol 1-klik **Buat SPK / Kontrak Digital** pada penawaran (`POST contracts/from-quotation`), serta penandatanganan digital SPK langsung di Portal Klien (`POST portal-auth/sign-contract`).
- **Otomasi Penagihan, Deposit Klien & Pajak ([api/controllers/ClientController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ClientController.php), [api/controllers/PaymentController.php](file:///d:/laragon/www/crudworks-home/api/controllers/PaymentController.php), [api/controllers/ReportController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ReportController.php), [assets/js/pages/reports.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/reports.js), [assets/js/pages/maintenance.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/maintenance.js))**:
  - Menambahkan pengingat WhatsApp 1-klik perpanjangan domain/SSL pada `#/maintenance`.
  - Menambahkan tab **Arus Kas & Pajak (PPN/PPh)** di `#/reports` (`GET reports/cashflow-tax`) untuk rekap PPN Keluaran, estimasi PPh 23 (2%), dan proyeksi kas masuk 30/60/90 hari.
  - Menambahkan manajemen saldo deposit/retainer klien (`clients.saldo_deposit`, `client_deposit_logs`, `POST clients/{id}/deposit`) dan opsi **Potong dari Saldo Deposit** saat mencatat pembayaran faktur.
- **Knowledge Base & SLA Timer Tiket ([api/controllers/KnowledgeBaseController.php](file:///d:/laragon/www/crudworks-home/api/controllers/KnowledgeBaseController.php), [assets/js/pages/knowledge_base.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/knowledge_base.js), [api/controllers/TicketController.php](file:///d:/laragon/www/crudworks-home/api/controllers/TicketController.php), [assets/js/pages/tickets.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/tickets.js))**:
  - Menambahkan modul `#/knowledge-base` untuk panduan/SOP klien yang tampil di tab Layanan Portal Klien ([portal/pages/services.js](file:///d:/laragon/www/crudworks-home/portal/pages/services.js)).
  - Menambahkan penghitungan target & status SLA otomatis pada daftar tiket (`kritis` 4j, `tinggi` 12j, `sedang` 24j, `rendah` 48j).
- Memperbarui cache Service Worker ke `crudworks-erp-v1.7.42` ([sw.js](file:///d:/laragon/www/crudworks-home/sw.js)) dan `crudworks-portal-v1.5.0` ([portal/sw.js](file:///d:/laragon/www/crudworks-home/portal/sw.js)).

---

## [1.7.41] - 2026-11-20

### Ditambahkan (Added)

- **6 Fitur Kelengkapan Portal Klien (`/portal/`)**:
  - **Pembayaran Faktur & Unggah Bukti In-App ([portal/pages/invoices.js](file:///d:/laragon/www/crudworks-home/portal/pages/invoices.js), [api/config/portal_helpers.php](file:///d:/laragon/www/crudworks-home/api/config/portal_helpers.php))**: Klien dapat melihat rincian faktur, menyalin nomor rekening, dan mengunggah bukti transfer (JPG/PNG/WebP/PDF) langsung dari modal di dalam Portal (`POST portal-auth/upload-proof`) tanpa membuka tab baru.
  - **Tinjauan & Tanda Tangan Digital Penawaran In-App ([portal/pages/quotations.js](file:///d:/laragon/www/crudworks-home/portal/pages/quotations.js))**: Klien dapat meninjau item penawaran dan menandatangani persetujuan menggunakan kanvas HTML5 langsung di dalam Portal (`POST portal-auth/sign-quotation`).
  - **Riwayat Pembayaran & Kuitansi PDF Resmi ([portal/pages/invoices.js](file:///d:/laragon/www/crudworks-home/portal/pages/invoices.js))**: Daftar transaksi pembayaran terverifikasi dilengkapi tombol pratinjau/unduh **Kuitansi PDF** (`generatePaymentReceiptPdf`).
  - **Berbagi Brankas Kredensial ke Portal ([database.sql](file:///d:/laragon/www/crudworks-home/database.sql), [api/controllers/CredentialController.php](file:///d:/laragon/www/crudworks-home/api/controllers/CredentialController.php), [assets/js/pages/credentials.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/credentials.js), [portal/pages/services.js](file:///d:/laragon/www/crudworks-home/portal/pages/services.js))**: Menambahkan kolom `show_in_portal` pada `client_credentials` agar admin dapat membagikan kredensial tertentu secara aman ke tab Layanan Portal dengan tombol **Lihat Sandi** (`POST portal-auth/reveal-credential`, otomatis tersembunyi setelah 30 detik).
  - **Log Rilis / Changelog Git Proyek ([api/config/portal_helpers.php](file:///d:/laragon/www/crudworks-home/api/config/portal_helpers.php), [portal/pages/projects.js](file:///d:/laragon/www/crudworks-home/portal/pages/projects.js))**: Membaca 5 commit terbaru dari `deploy_path` proyek (jika memiliki `.git`) untuk ditampilkan sebagai **Pembaruan Rilis Terbaru** pada kartu proyek Portal.
  - **Banner Pengingat Otomatis Portal ([portal/app.js](file:///d:/laragon/www/crudworks-home/portal/app.js))**: Menampilkan pengingat interaktif untuk BAST menunggu pengesahan, tiket menunggu balasan klien, faktur belum lunas/jatuh tempo, domain/SSL mendekati kedaluwarsa (≤30 hari), dan penawaran menunggu persetujuan.
- Memperbarui cache Service Worker Portal ke `crudworks-portal-v1.4.0` ([portal/sw.js](file:///d:/laragon/www/crudworks-home/portal/sw.js)) dan ERP utama ke `crudworks-erp-v1.7.41` ([sw.js](file:///d:/laragon/www/crudworks-home/sw.js)).

---

## [1.7.40] - 2026-11-20

### Ditambahkan (Added)

- **Konversi 1-Klik Tiket → Tugas Kanban atau Faktur Tambahan ([api/controllers/TicketController.php](file:///d:/laragon/www/crudworks-home/api/controllers/TicketController.php), [assets/js/pages/tickets.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/tickets.js))**:
  - Menambahkan endpoint `POST /api/tickets/{id}/convert-task` untuk memasukkan laporan tiket klien langsung ke kolom *To-Do* Papan Kanban proyek terkait (`project_tasks`).
  - Menambahkan endpoint `POST /api/tickets/{id}/convert-invoice` untuk menerbitkan faktur tagihan tambahan (`invoices` + `invoice_items`) langsung dari tiket klien dalam transaksi PDO.
  - Menambahkan tombol **`+ Kanban`** dan **`+ Faktur`** pada modal penanganan tiket admin (`#/tickets`).
- **Notifikasi Lonceng Admin untuk BAST Ditandatangani & Tiket Baru/Update ([api/controllers/DashboardController.php](file:///d:/laragon/www/crudworks-home/api/controllers/DashboardController.php), [assets/js/app.js](file:///d:/laragon/www/crudworks-home/assets/js/app.js))**:
  - Memperluas endpoint `dashboard/notifications` agar menampilkan tiket gangguan aktif (`terbuka`/`diproses`) dan dokumen BAST yang ditandatangani klien dalam 7 hari terakhir, lengkap dengan *auto-refresh* setiap 60 detik saat tab aktif.
  - Memperbarui cache Service Worker utama ke `crudworks-erp-v1.7.40` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.39] - 2026-11-20

### Ditambahkan & Disempurnakan (Added & Changed)

- **Utas Email Tiket + Editor Kaya bergaya Gmail & Lampiran Gambar ([assets/js/core/email-editor.js](file:///d:/laragon/www/crudworks-home/assets/js/core/email-editor.js), [portal/pages/tickets.js](file:///d:/laragon/www/crudworks-home/portal/pages/tickets.js), [assets/js/pages/tickets.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/tickets.js), [api/config/portal_helpers.php](file:///d:/laragon/www/crudworks-home/api/config/portal_helpers.php), [api/controllers/TicketController.php](file:///d:/laragon/www/crudworks-home/api/controllers/TicketController.php), [database.sql](file:///d:/laragon/www/crudworks-home/database.sql))**:
  - **Tampilan Utas Email (*Email Thread*)**: Mengubah percakapan tiket dari gelembung chat menjadi kartu pesan email bertumpuk lengkap dengan avatar pengirim, alamat tujuan, dan timestamp.
  - **Editor Kaya bergaya Gmail**: Area tulis besar (`min-height` 170–220px, dapat di-resize) dengan toolbar lengkap (*Undo/Redo, Bold, Italic, Underline, Strikethrough, Bullet List, Numbered List, Blockquote, Code Block, Insert Link, Clear Format*, serta tombol **Gambar**).
  - **Upload, Drag-and-Drop & Paste Screenshot (`Ctrl+V`)**: Klien dan tim teknis dapat mengunggah hingga 5 gambar (maks. 3 MB/file) ke `uploads/tickets/` lengkap dengan pratinjau thumbnail dan sanitasi HTML anti-XSS (`sanitizeEmailHtml`).
  - Memperbarui Service Worker portal ke `crudworks-portal-v1.3.2` ([portal/sw.js](file:///d:/laragon/www/crudworks-home/portal/sw.js)) dan Service Worker utama ke `crudworks-erp-v1.7.39` ([sw.js](file:///d:/laragon/www/crudworks-home/sw.js)).

---

## [1.7.37] - 2026-11-20

### Ditambahkan & Disempurnakan (Added & Changed)

- **Modularisasi Halaman Portal Klien PWA + Manajemen Tiket Gangguan & Layanan Aktif ([portal/app.js](file:///d:/laragon/www/crudworks-home/portal/app.js), [portal/ctx.js](file:///d:/laragon/www/crudworks-home/portal/ctx.js), `portal/pages/*.js`)**:
  - **Pemisahan File JS per Halaman**: Memecah seluruh tampilan Portal Klien dari `portal/app.js` menjadi modul terpisah yang rapi: [portal/pages/login.js](file:///d:/laragon/www/crudworks-home/portal/pages/login.js), [portal/pages/projects.js](file:///d:/laragon/www/crudworks-home/portal/pages/projects.js), [portal/pages/services.js](file:///d:/laragon/www/crudworks-home/portal/pages/services.js), [portal/pages/tickets.js](file:///d:/laragon/www/crudworks-home/portal/pages/tickets.js), [portal/pages/invoices.js](file:///d:/laragon/www/crudworks-home/portal/pages/invoices.js), [portal/pages/quotations.js](file:///d:/laragon/www/crudworks-home/portal/pages/quotations.js), dan [portal/pages/account.js](file:///d:/laragon/www/crudworks-home/portal/pages/account.js).
  - **Manajemen Tiket Gangguan Klien ([database.sql](file:///d:/laragon/www/crudworks-home/database.sql), [api/config/portal_helpers.php](file:///d:/laragon/www/crudworks-home/api/config/portal_helpers.php), [api/controllers/PortalAuthController.php](file:///d:/laragon/www/crudworks-home/api/controllers/PortalAuthController.php), [api/controllers/TicketController.php](file:///d:/laragon/www/crudworks-home/api/controllers/TicketController.php), [assets/js/pages/tickets.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/tickets.js))**:
    - Klien dapat membuat tiket gangguan baru (`TKT-YYYYMM-XXXX`), memilih kategori, prioritas, serta proyek/layanan terkait, melihat riwayat percakapan, membalas, dan menandai tiket selesai.
    - Ditambahkan pula menu **Tiket Gangguan Klien** (`#/tickets`) di panel admin ERP agar tim teknis dapat membalas dan mengubah status tiket secara langsung.
  - **Layanan yang Digunakan & Status Layanan Real-Time ([portal/pages/services.js](file:///d:/laragon/www/crudworks-home/portal/pages/services.js))**: Menampilkan status uptime aplikasi/server live, daftar langganan berulang & SLA yang digunakan klien, serta pemantauan domain, HTTP status, latensi, dan masa berlaku SSL.
  - Memperbarui Service Worker portal ke `crudworks-portal-v1.1.0` ([portal/sw.js](file:///d:/laragon/www/crudworks-home/portal/sw.js)) dan Service Worker utama ke `crudworks-erp-v1.7.37` ([sw.js](file:///d:/laragon/www/crudworks-home/sw.js)).

---

## [1.7.36] - 2026-11-20

### Ditambahkan (Added)

- **Portal Klien Mandiri Berbentuk PWA di Folder Khusus `portal/` ([portal/index.html](file:///d:/laragon/www/crudworks-home/portal/index.html), [portal/app.js](file:///d:/laragon/www/crudworks-home/portal/app.js), [portal/manifest.json](file:///d:/laragon/www/crudworks-home/portal/manifest.json), [portal/sw.js](file:///d:/laragon/www/crudworks-home/portal/sw.js), [portal/.htaccess](file:///d:/laragon/www/crudworks-home/portal/.htaccess))**:
  - **Aplikasi PWA Mandiri (`/portal/`)**: Memiliki `manifest.json` dan Service Worker (`portal/sw.js`) terpisah sehingga klien dapat menginstal Portal Klien langsung ke layar utama (*Add to Home Screen*) dengan tampilan aplikasi mandiri (*standalone*) dan dukungan snapshot offline.
  - **Sistem Autentikasi Terisolasi ([api/controllers/PortalAuthController.php](file:///d:/laragon/www/crudworks-home/api/controllers/PortalAuthController.php), [api/config/portal_helpers.php](file:///d:/laragon/www/crudworks-home/api/config/portal_helpers.php), [api/middleware/csrf.php](file:///d:/laragon/www/crudworks-home/api/middleware/csrf.php))**:
    - Klien login menggunakan **Kode Klien atau Email** beserta **Kata Sandi** (`password_hash`/`password_verify`) dengan proteksi *rate-limit/lockout* (maks. 5 kali gagal, kunci 15 menit), token CSRF terpisah (`portal_csrf_token`), dan sesi terisolasi (`portal_client_id`) yang tidak memiliki akses ke API admin ERP.
    - Fitur ganti kata sandi mandiri oleh klien (`POST /api/portal-auth/change-password`).
  - **Manajemen Akses Login di Modul Pelanggan ([api/controllers/ClientController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ClientController.php), [assets/js/pages/clients.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/clients.js), [database.sql](file:///d:/laragon/www/crudworks-home/database.sql))**:
    - Menambahkan kolom `portal_password`, `portal_last_login_at`, `portal_failed_attempts`, dan `portal_locked_until` pada tabel `clients`.
    - Menambahkan aksi **Portal Mandiri (PWA)** dan **Aktifkan / Reset / Cabut Akses Login Portal** pada menu aksi tiap pelanggan, lengkap dengan generator kata sandi acak serta tombol salin & kirim kredensial via WhatsApp.
  - **Fitur Lengkap di Dalam Portal PWA**: Navigasi tab mobile-first (*Proyek & BAST*, *Faktur*, *Penawaran*, *Layanan/SLA*), pratinjau/unduh PDF BAST, dan tanda tangan BAST digital via kanvas HTML5.
  - Memperbarui cache Service Worker utama ke `crudworks-erp-v1.7.36` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.35] - 2026-11-20

### Ditambahkan & Diperbaiki (Added & Fixed)

- **Live Project Tracker & Tanda Tangan BAST Digital di Portal Klien ([api/controllers/ClientPortalController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ClientPortalController.php), [assets/js/pages/client-portal.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/client-portal.js), [assets/js/core/utils.js](file:///d:/laragon/www/crudworks-home/assets/js/core/utils.js), [api/middleware/csrf.php](file:///d:/laragon/www/crudworks-home/api/middleware/csrf.php), [database.sql](file:///d:/laragon/www/crudworks-home/database.sql))**:
  - **Perbaikan Query Portal Klien**: Memperbaiki kolom query `last_http_code` menjadi `http_status_code` pada tabel `maintenance_sla` dan `target_tanggal` menjadi `tanggal_target` pada `project_milestones`.
  - **Live Project Tracker**: Menambahkan tab **Progres Proyek & BAST** di Portal Klien yang menampilkan persentase progres penyelesaian tugas Kanban (`project_tasks`) secara keseluruhan maupun per tahapan milestone termin, lengkap dengan status uptime aplikasi.
  - **Tanda Tangan BAST Digital via HTML5 Canvas**: Menambahkan kolom `signature_data`, `signed_at`, dan `signed_ip` pada tabel `project_basts`, endpoint `POST client-portal?token=...&action=sign-bast` (dengan pengecualian CSRF berbasis token portal), modal uji & tanda tangan kanvas interaktif di portal klien, serta penyisipan gambar tanda tangan digital klien ke dalam PDF BAST (`generateBastPdf`).
  - Memperbarui cache Service Worker ke `crudworks-erp-v1.7.35` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.34] - 2026-11-20

### Diperbaiki (Fixed)

- **Sinkronisasi Reset Form pada Komponen Custom DatePicker ([assets/js/core/datepicker.js](file:///d:/laragon/www/crudworks-home/assets/js/core/datepicker.js))**:
  - Menambahkan event listener `reset` pada `<form>` induk di `datepicker.js` agar tampilan tombol pemilih tanggal (`.cdp-trigger`) ikut tersinkron secara otomatis ketika `form.reset()` dipanggil pada pembukaan modal.
  - Memperbarui cache Service Worker ke `crudworks-erp-v1.7.34` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.33] - 2026-11-20

### Diperbaiki (Fixed)

- **Sinkronisasi Otomatis Komponen Custom Select pada Seluruh Form Edit ([assets/js/core/select.js](file:///d:/laragon/www/crudworks-home/assets/js/core/select.js), [assets/js/pages/projects.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/projects.js))**:
  - **Intersepsi Setter `.value` & `.selectedIndex`**: Memperbaiki bug di mana penetapan nilai `<select>` secara programatis (`selectEl.value = ...` saat membuka modal Edit) tidak memicu event `change`, sehingga tampilan label tombol *custom dropdown* (`.csel-trigger`) tetap tertahan pada teks *placeholder* kosong. Kini setiap mutasi `.value`, `.selectedIndex`, atribut `selected`, maupun `form.reset()` otomatis menyinkronkan tampilan dropdown di seluruh menu.
  - **Sinkronisasi Awal Dropdown Proyek**: Memastikan `populateClientOptions()` ditunggu (`await Promise.all`) saat inisialisasi modul proyek.
  - Memperbarui cache Service Worker ke `crudworks-erp-v1.7.33` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.32] - 2026-11-20

### Disempurnakan (Changed)

- **Penyeragaman Tata Letak PDF BAST dengan Format Surat Penawaran ([assets/js/core/utils.js](file:///d:/laragon/www/crudworks-home/assets/js/core/utils.js))**:
  - **Identitas Visual & Warna Seragam**: Menyamakan aksen bar atas (`slate-900` + `indigo-600`), margin `14mm`, tipografi judul (`10.5pt` Indigo-600), dan penataan pill status di sisi kanan atas agar identik dengan *Surat Penawaran Harga*.
  - **Kartu Identitas Simetris Terpadu**: Menggabungkan blok informasi **Pihak Pertama** dan **Pihak Kedua** dalam satu kartu berbingkai halus dengan pembagi vertikal tengah persis seperti blok penerima pada Surat Penawaran.
  - **Tabel Deliverable AutoTable**: Menyajikan rincian hasil pekerjaan & UAT menggunakan tabel grid `autoTable` berheader `slate-900`, baris zebra, serta kolom status verifikasi.
  - **Banner Seksi, Watermark & Multi-Page Running Footer**: Menambahkan banner bab standar (`8.5mm`, aksen kiri `indigo-600`), dukungan watermark status (`DITANDATANGANI` / `DRAFT` / `DITOLAK`), blok tanda tangan seragam (`68mm`), serta *running header/footer* multi-halaman.
  - Memperbarui cache Service Worker ke `crudworks-erp-v1.7.32` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.31] - 2026-11-20

### Ditambahkan (Added)

- **Generator BAST Digital (Berita Acara Serah Terima) ([database.sql](file:///d:/laragon/www/crudworks-home/database.sql), [api/controllers/BastController.php](file:///d:/laragon/www/crudworks-home/api/controllers/BastController.php), [assets/js/core/utils.js](file:///d:/laragon/www/crudworks-home/assets/js/core/utils.js), [assets/js/pages/projects.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/projects.js))**:
  - **Entitas Database `project_basts`**: Tabel database relasional lengkap dengan nomor BAST unik per periode (`BAST-YYYYMM-XXXX`), relasi ke `projects`, `clients`, `project_milestones`, status pengesahan (`draft`, `ditandatangani`, `ditolak`), nama & jabatan penandatangan kedua belah pihak, serta catatan garansi pemeliharaan.
  - **Backend REST Controller `BastController.php`**: Endpoint lengkap untuk daftar BAST terfilter, detail, pembuatan, pembaruan, pengesahan digital (`POST /api/basts/{id}/sign`), dan penghapusan dengan audit aktivitas sistem (`logActivity`) serta validasi CSRF.
  - **Penyusun PDF Dokumen Hukum Sah (`generateBastPdf`)**: Menghasilkan lembar Berita Acara Serah Terima eksekutif menggunakan jsPDF dengan kop perusahaan, kartu identitas komparatif Pihak Pertama (Penyedia Jasa) dan Pihak Kedua (Klien), daftar deliverable serah terima hasil pekerjaan & UAT, klausul hukum formal, serta blok tanda tangan basah/digital.
  - **Antarmuka Manajemen BAST**: Modal daftar dokumen BAST pada rute `#projects`, editor penerbitan BAST per termin proyek, pengesahan 1-klik, dan pratinjau/unduh dokumen PDF resmi via `App.openPdfModal`.

- **Papan Tugas Proyek Ringan / Lightweight Kanban per Milestone ([database.sql](file:///d:/laragon/www/crudworks-home/database.sql), [api/controllers/ProjectTaskController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ProjectTaskController.php), [assets/js/pages/projects.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/projects.js))**:
  - **Entitas Database `project_tasks`**: Tabel tugas terhubung ke proyek, milestone termin, prioritas (`rendah`, `sedang`, `tinggi`, `mendesak`), status 4 tahap (`todo`, `in_progress`, `review`, `done`), estimasi jam kerja, tenggat waktu, dan penugasan staf (`assigned_to`).
  - **Backend Controller `ProjectTaskController.php`**: Endpoint pengambilan tugas dengan kalkulasi statistik instan (progres penyelesaian, total jam tim), mutasi cepat status tugas (`PUT /api/project-tasks/{id}/status`), serta CRUD tugas proyek.
  - **Papan Kanban Interaktif 4 Kolom**: Tampilan workspace Kanban modern dengan pemfilteran berbasis milestone termin, bilah progres persentase, kartu tugas dengan tag prioritas dan estimasi jam, tombol geser status cepat (`<-` / `->`), serta integrasi 1-klik pencatatan jam kerja langsung ke Timesheet dan modul Profitabilitas Proyek (P&L).
  - Memperbarui cache Service Worker ke `crudworks-erp-v1.7.31` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.30] - 2026-11-20

### Diperbaiki (Fixed)

- **Perbaikan Warna Latar Belakang Sel Tabel Matriks Linimasa PDF ([assets/js/core/utils.js](file:///d:/laragon/www/crudworks-home/assets/js/core/utils.js))**:
  - **Pencegahan Polusi Warna Non-Stroking jsPDF**: Memperbaiki masalah di mana perintah `doc.setTextColor(...)` menimpa warna non-stroking (fill color) pada operator PDF sebelum pemanggilan `doc.rect(..., 'FD')`.
  - **Latar Belakang Bersih & Terang**: Memastikan setiap sel header diisi warna abu-abu terang `#f1f5f9`, seluruh sel baris keterangan diisi warna putih bersih `#ffffff`, dan sel periode aktif diisi warna kuning amber `#fde68a`, sehingga teks keterangan terbaca dengan kontras tajam tanpa warna gelap/hitam.
  - Memperbarui cache Service Worker ke `crudworks-erp-v1.7.30` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.29] - 2026-11-20

### Ditambahkan & Disempurnakan (Added & Enhanced)

- **Diagram Matriks Jadwal Kerja & Linimasa Proyek (Gantt Chart Table) ([assets/js/core/utils.js](file:///d:/laragon/www/crudworks-home/assets/js/core/utils.js), [assets/js/app.js](file:///d:/laragon/www/crudworks-home/assets/js/app.js), [assets/js/pages/quotations.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/quotations.js), [assets/js/pages/public-quotation.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/public-quotation.js))**:
  - **Tabel Matriks Sesuai Standar Proposal Pengadaan (NO | KETERANGAN | BULAN / MINGGU)**:
    - Mengganti model diagram sebelumnya menjadi tabel matriks jadwal kerja berformat Gantt chart formal Indonesia, persis sesuai spesifikasi lampiran pengguna.
    - Header ganda: Kolom `NO` (rowspan 2), `KETERANGAN` (rowspan 2), dan `BULAN` (atau `MINGGU`) yang membentang di atas nomor periode (misal: `4`, `5`, `6`, `7`, `8`, `9`).
    - Blok aktif diwarnai kuning/amber lembut (`#fde68a` / RGB 253, 230, 138) pada kolom jadwal yang sesuai, sementara sel tidak aktif tetap bersih dengan garis kisi rapi.
  - **Dukungan Penuh Format PDF Cetak Resmi (`_drawTimelineDiagramPdf`)**:
    - Dirender secara vektor murni jsPDF dengan garis pembatas halus `#cbd5e1`, latar belakang abu-abu header `#f1f5f9`, dan blok kuning solid berpresisi tinggi.
  - **Dukungan Pratinjau Web, Portal Klien & Cetak HTML (`renderTimelineDiagramHtml`)**:
    - Tabel matriks responsif dengan *horizontal scroll*, styling CSS murni (tampil konsisten di layar gelap/terang serta saat dicetak ke printer fisik), dan kompatibel dengan naskah deliverable rincian tugas.
  - **Parser Cerdas Otomatis (`parseTimelineGantt`)**:
    - Otomatis mendeteksi unit waktu (`BULAN` atau `MINGGU`) serta rentang awal dan akhir periode dari teks naskah (contoh: `1. Instalasi, penyesuaian, sosialisasi (Bulan 4)` dan `2. Pendampingan dan penggunaan aplikasi (Bulan 5 – 9)`).
  - **Tombol Penyisip Cepat & Pratinjau Langsung pada Modal Editor**:
    - Menghadirkan tombol chip matriks instan pada Tab 3 modal penawaran harga dengan pembaruan pratinjau langsung secara *real-time*.
  - Memperbarui cache Service Worker ke `crudworks-erp-v1.7.29` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.28] - 2026-11-20

### Ditambahkan & Disempurnakan (Added & Enhanced)

- **Diagram Visual Roadmap Linimasa Pengerjaan & Penyelarasan Proporsi Dokumen ([assets/js/core/utils.js](file:///d:/laragon/www/crudworks-home/assets/js/core/utils.js), [assets/js/app.js](file:///d:/laragon/www/crudworks-home/assets/js/app.js), [assets/js/pages/quotations.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/quotations.js), [assets/js/pages/public-quotation.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/public-quotation.js))**:
  - **Diagram Vektor Roadmap pada PDF (`generateQuotationPdf`)**:
    - Menggambar diagram roadmap bertahap (*milestone rail*) berbasis vektor murni jsPDF: garis rel penghubung abu-abu halus, badge lingkaran fase nomor `[01]` s/d `[05]` bergradasi indigo, pil estimasi durasi waktu, judul tahapan, dan poin ringkasan deliverable.
    - Resolusi gambar vektor tajam tanpa pikselasi atau ketergantungan pustaka eksternal.
  - **Komponen Diagram Visual Responsif Web & Portal Klien (`renderTimelineDiagramHtml`)**:
    - Merender diagram kartu bertahap responsif beraksen modern dengan ikon visual RemixIcon (analisis & desain, koding inti, integrasi UAT, deployment server, garansi sistem) dan garis alur terintegrasi.
    - Ditampilkan pada portal persetujuan penawaran klien (`#/public-quotation`) dan berkas pratinjau HTML cetak penawaran (`generateQuotationHtml`).
  - **Pratinjau Diagram Interaktif Langsung pada Editor Penawaran (`assets/js/pages/quotations.js`)**:
    - Menghadirkan kotak pratinjau diagram `#quo-timeline-diagram-preview` pada tab *3. Timeline Kerja* modal penawaran.
    - Diagram otomatis ter-update secara *real-time* saat pengguna mengetik naskah tahapan, mengklik tombol chip penyisip cepat, atau memuat template proposal.
  - **Penyelarasan Proporsi Tipografi Header Dokumen Resmi**:
    - Memastikan keseragaman visual antara Kuitansi Pembayaran, Faktur Tagihan, dan Surat Penawaran Harga dengan judul ringkas proporsional (`10.5pt`), nomor dokumen (`8.8pt`), dan lencana status ramping (`6.5pt`).
  - Memperbarui cache Service Worker ke `crudworks-erp-v1.7.28` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.27] - 2026-11-20

### Ditambahkan & Disempurnakan (Added & Enhanced)

- **Fitur Timeline Pengerjaan Proyek pada Surat Penawaran Harga ([database.sql](file:///d:/laragon/www/crudworks-home/database.sql), [api/controllers/QuotationController.php](file:///d:/laragon/www/crudworks-home/api/controllers/QuotationController.php), [assets/js/pages/quotations.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/quotations.js), [assets/js/core/utils.js](file:///d:/laragon/www/crudworks-home/assets/js/core/utils.js), [assets/js/pages/public-quotation.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/public-quotation.js))**:
  - **Skema Basis Data & API**: Menambahkan kolom `timeline_pengerjaan` (TEXT) pada tabel `quotations` untuk menyimpan estimasi waktu, pembagian fase sprint/minggu, dan deliverable proyek secara terstruktur.
  - **Editor Interaktif 5 Tab**: Menambahkan tab baru `3. Timeline Kerja` pada modal pembuatan dan pengeditan penawaran harga lengkap dengan tombol chip penyisip instan (Tahap Analisis W1-2, Development W3-6, UAT W7-8, Go-Live W9, dan Garansi 30 Hari).
  - **Dukungan Dokumen PDF & HTML**: Menghadirkan bab khusus `RENCANA & TIMELINE WAKTU PENGERJAAN` pada cetak berkas PDF (`generateQuotationPdf`) dan pratinjau HTML (`generateQuotationHtml`) dengan penomoran bab yang otomatis dinamis.
  - **Tampilan Portal Penawaran Publik**: Menampilkan rincian linimasa pengerjaan di portal persetujuan penawaran online klien (`#/public-quotation`).
  - Memperbarui cache Service Worker ke `crudworks-erp-v1.7.27` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.26] - 2026-11-20

### Disederhanakan & Diringkas (Subtle, Clean & Proportional Typography)

- **Penyederhanaan Tipografi Header Dokumen (*Anti-Busy Layout*) ([assets/js/core/utils.js](file:///d:/laragon/www/crudworks-home/assets/js/core/utils.js))**:
  - **Pengecilan Ukuran Judul Dokumen**:
    - Menurunkan ukuran font judul dokumen resmi (*Faktur Tagihan*, *Kuitansi Pembayaran*, dan *Surat Penawaran Harga*) ke skala yang lebih tenang dan elegan: **`10.5pt`** bold (turun dari 12–14pt).
    - Menghilangkan kesan "ramai" dan mencolok (*shouting text*) pada sisi kanan atas dokumen sehingga seimbang dengan logo dan kop perusahaan di sisi kiri.
  - **Pengecilan Nomor Dokumen**:
    - Menurunkan ukuran nomor dokumen (`INV-...`, `PAY-...`, `QUO-...`) ke **`8.8pt`** bold dengan warna slate-800 (`#1e293b`).
  - **Pengecilan & Perampingan Lencana Status (*Status Badge*)**:
    - Menurunkan font lencana status ke **`6.5pt`** bold dengan tinggi badge lebih ramping `4.2mm` (turun dari 5.2mm) dan border halus `0.2mm`.
  - **Pengecilan Tanggal & Baris Status**:
    - Menurunkan ukuran tanggal terbit dan baris status/jatuh tempo ke **`6.8pt`** dengan jarak vertikal yang lebih lega dan rapi (*breathing room*).
  - **Penyelarasan Pratinjau HTML**: Menyesuaikan skala tipografi pada fungsi `generateQuotationHtml` agar selaras dengan versi PDF.
  - Memperbarui cache Service Worker ke `crudworks-erp-v1.7.26` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.25] - 2026-11-20

### Disempurnakan & Disesuaikan (Refined & Balanced)

- **Standardisasi Skala Tipografi & Keselarasan Visual Header Dokumen Resmi ([assets/js/core/utils.js](file:///d:/laragon/www/crudworks-home/assets/js/core/utils.js))**:
  - **Penyelarasan Proporsi Judul Dokumen**:
    - Menyeragamkan bobot optik antara ketiga dokumen resmi (*Faktur Tagihan*, *Kuitansi Pembayaran*, dan *Surat Penawaran Harga*).
    - Memperbaiki judul penawaran menjadi **`SURAT PENAWARAN HARGA`** dengan ukuran `12.0pt` (sebelumnya `SURAT PENAWARAN & PROPOSAL` berukuran `13.5pt` yang terlalu panjang dan melebar 75mm ke kiri).
    - Menyesuaikan `FAKTUR TAGIHAN` ke `12.5pt` dan `KUITANSI PEMBAYARAN` ke `12.0pt` sehingga ketiganya memiliki lebar visual seimbang (~42mm - 48mm).
  - **Kerapian Lencana Status (*Status Badge*)**:
    - Memangkas teks badge kuitansi dari `BUKTI PEMBAYARAN SAH (OFFICIAL RECEIPT)` (39 karakter yang memanjang berlebihan) menjadi `BUKTI PEMBAYARAN SAH` (20 karakter) dengan ukuran seragam `7.2pt` bold dan tinggi `5.0mm`.
  - **Presisi Nomor Dokumen & Subtitle**:
    - Menyeragamkan nomor dokumen (`INV-...`, `PAY-...`, `QUO-...`) pada ukuran `9.8pt` bold.
    - Menyeragamkan ukuran tanggal terbit (`7.5pt` normal, slate-500) dan baris status jatuh tempo/masa berlaku (`7.5pt` bold, rose/emerald).
  - **Keselarasan Irama Vertikal (*Vertical Baseline Rhythm*)**:
    - Menyeragamkan seluruh jarak vertikal antar-elemen header (`+4.2mm`, `+4.8mm`, `+4.0mm`, `+3.6mm`) dan garis pemisah (`+3.8mm`) di ketiga fungsi generator PDF (`generateInvoicePdf`, `generateReceiptPdf`, `generateQuotationPdf`) serta pratinjau HTML penawaran.
  - Memperbarui cache Service Worker ke `crudworks-erp-v1.7.25` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.24] - 2026-11-20

### Ditata Ulang & Disempurnakan (Refactored & Enhanced)

- **Rekonstruksi & Penyelarasan Fungsional Struktur Menu Navigasi ([api/config/menus.json](file:///d:/laragon/www/crudworks-home/api/config/menus.json), [assets/js/core/router.js](file:///d:/laragon/www/crudworks-home/assets/js/core/router.js))**:
  - **Pemisahan Klaster Berdasarkan Alur Kerja Bisnis Nyata**: Menata ulang 21 modul ke dalam **7 kelompok fungsional** yang seimbang, ergonomis, dan intuitif:
    1. **NAVIGASI UTAMA**: *Dashboard* (pusat ringkasan KPI eksekutif).
    2. **PENJUALAN & CRM**: *Pelanggan & Prospek* (database klien & papan Kanban leads), *Surat Penawaran (SPH)* (proposal penawaran harga), dan *Katalog Layanan* (daftar paket & tarif standar).
    3. **PROYEK & PRODUKSI**: *Manajemen Proyek* (pengembangan software, integrasi git & repo klien) dan *Log Jam Kerja (Timesheet)* (pencatatan waktu kerja tim).
    4. **OPERASIONAL & INFRASTRUKTUR**: *SLA & Pemantau Domain* (kesehatan uptime & sertifikat SSL), *Brankas Kredensial* (vault terenkripsi AES-256), dan *Aset & Langganan Cloud* (manajemen VPS, lisensi SaaS kantor).
    5. **KEUANGAN & PENAGIHAN**: *Tagihan & Faktur* (penerbitan piutang resmi), *Tagihan Berulang* (otomasi invoice periodik), *Pembayaran Masuk* (verifikasi pelunasan), *Beban & Pengeluaran* (biaya operasional & beban server), serta *Rekening Bank Resmi* (master akun transfer).
    6. **LAPORAN & ANALISIS**: *Laba Rugi & Profit* (P&L 12 bulan & margin proyek) dan *Laporan Finansial* (aging piutang AR, arus kas & rekening koran).
    7. **SISTEM & PENGATURAN**: *Manajemen Pengguna*, *Hak Akses (RBAC)*, *Pengaturan Sistem*, *Jejak Audit*, dan *Cadangan Database*.
  - **Optimalisasi Peran & Hak Akses (RBAC)**: Pengelompokan ini mempermudah pembatasan visibilitas menu sesuai divisi kerja (Sales, Engineering/Dev, DevOps/Sysadmin, Finance, Manajerial, dan Superadmin).
  - **Sinkronisasi Breadcrumbs & Metadata Rute**: Memperbarui metadata pada `ROUTE_META` agar teks judul halaman, subjudul, dan rekam jejak (*breadcrumb trail*) konsisten dengan nama menu baru.
  - Memperbarui cache Service Worker ke `crudworks-erp-v1.7.24` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.23] - 2026-11-20

### Ditambahkan & Disempurnakan (Added & Enhanced)

- **Operasional Teknis & Infrastruktur: Pemantau Uptime & Status SSL Otomatis ([api/config/vault_helpers.php](file:///d:/laragon/www/crudworks-home/api/config/vault_helpers.php), [api/controllers/MaintenanceController.php](file:///d:/laragon/www/crudworks-home/api/controllers/MaintenanceController.php), [assets/js/pages/maintenance.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/maintenance.js))**:
  - **Uji Kesehatan HTTP/HTTPS & Latensi**: Fitur pengecekan status server klien secara instan (kode status HTTP 200/301/404/500, latensi respons dalam milidetik, dan status ketersediaan *Online / Warning / Down*).
  - **Inspeksi Masa Berlaku Sertifikat SSL**: Ekstraksi sertifikat X.509 untuk menghitung sisa hari aktif SSL (*days remaining*), tanggal kedaluwarsa, dan penerbit (*SSL Issuer*), dengan peringatan dini bila SSL < 30 hari.
  - **Pengujian Massal (*Batch Health Check*)**: Tombol "Uji Semua Uptime & SSL" di header halaman SLA & Pemeliharaan untuk memeriksa semua domain dan server aktif sekaligus tanpa reload halaman.
  - **Pencatatan Riwayat (*Health Logs*)**: Setiap hasil uji tersimpan pada tabel `uptime_health_logs` untuk audit jejak ketersediaan SLA klien.

- **Operasional Teknis & Infrastruktur: Brankas Kredensial Terenkripsi AES-256 ([api/controllers/CredentialController.php](file:///d:/laragon/www/crudworks-home/api/controllers/CredentialController.php), [assets/js/pages/credentials.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/credentials.js), [api/config/menus.json](file:///d:/laragon/www/crudworks-home/api/config/menus.json))**:
  - **Enkripsi Kuat AES-256-CBC**: Seluruh kata sandi server, cPanel, SSH, Database, WordPress, Cloudflare, dan API Key klien disimpan terenkripsi menggunakan kunci rahasia aplikasi dengan *Initialization Vector* (IV) unik.
  - **Menu Baru "Brankas Kredensial"**: Ditempatkan pada navigasi utama di bawah kelompok *OPERASIONAL* dengan pembatasan hak akses (*RBAC*) `credential.view` dan `credential.manage`.
  - **Keamanan Tampilan & Auto-Masking**: Kredensial default ditampilkan tertutup (`••••••••`). Tombol intip sandi dilengkapi pengatur waktu mundur (*timer*) 15 detik yang otomatis menutup kembali sandi.
  - **Penyalinan Sekali Klik & Jejak Audit**: Tombol salin aman langsung ke *clipboard* dan pencatatan audit log setiap kali kata sandi dibuka oleh staf berwenang.

- **Penjualan & CRM: Papan Kanban Pipeline Prospek (*Deals Stage*) ([api/controllers/ClientController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ClientController.php), [assets/js/pages/clients.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/clients.js))**:
  - **Tampilan Fleksibel (Tabel vs Kanban)**: Tombol pengalih tampilan di halaman Pelanggan untuk beralih antara tabel data reguler dan papan Kanban interaktif.
  - **6 Tahapan Pipeline Prospek**: *Leads Masuk*, *Kontak Awal*, *Proposal SPH*, *Negosiasi*, *Deal Menang (Won)*, dan *Batal / Kalah (Lost)* lengkap dengan kartu metrik total estimasi nilai deal (*pipeline value*).
  - **Pencatatan Interaksi & Follow-Up**: Modal khusus untuk mencatat histori komunikasi (WhatsApp, Telepon, Email, Meeting Online/Offline) beserta penjadwalan tindak lanjut berikutnya.
  - **Aktivasi Otomatis & Konversi**: Memindahkan prospek ke tahap *Deal Menang* secara otomatis mengaktifkan status klien (`status = 'aktif'`) dan menawarkan pembuatan Surat Penawaran Harga atau Faktur baru.

- **Penjualan & CRM: Portal Klien Mandiri Terpadu (*Client Unified Self-Service Extranet*) ([api/controllers/ClientPortalController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ClientPortalController.php), [assets/js/pages/client-portal.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/client-portal.js))**:
  - **Indikator Langsung Uptime & SSL**: Klien kini dapat melihat status live server, latensi respons, dan sisa hari masa aktif SSL domain mereka pada tab SLA & Domain.
  - **Tautan Token Sekali Klik**: Tombol salin dan bagikan via WhatsApp tautan portal klien langsung dari kartu Kanban atau detail klien.
  - Memperbarui Service Worker ke `crudworks-erp-v1.7.23` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.22] - 2026-11-20

### Ditambahkan & Disempurnakan (Added & Enhanced)

- **Menu Khusus Mandiri "Laba Rugi & Profit" ([api/config/menus.json](file:///d:/laragon/www/crudworks-home/api/config/menus.json), [assets/js/pages/profit-loss.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/profit-loss.js), [assets/js/core/router.js](file:///d:/laragon/www/crudworks-home/assets/js/core/router.js))**:
  - **Pemisahan Menu**: Menjadikan laporan Laba Rugi, Komparasi Tahunan, dan Profitabilitas Proyek ke dalam **menu mandiri tersendiri** (`#/profit-loss`) pada bilah navigasi utama di bawah kelompok *LAPORAN*, sehingga pengguna tidak lagi harus menggulir (*scrolling*) panjang ke bawah saat membaca laporan keuangan.
  - **Arsitektur Tampilan Berbasis Sub-Tab Modular (Anti-Scroll Overload)**:
    - **Tab 1: Rincian 12 Bulan (Januari – Desember)**: Rincian per bulan arus kas masuk, tagihan terbit, beban server/cloud, beban operasional lain, total beban, laba bersih bulanan, margin %, dan badge status surplus/defisit.
    - **Tab 2: Tren Tahunan (Multi-Year)**: Tabel komparasi multi-tahun (*Year-over-Year*) untuk menganalisis pertumbuhan laba bersih, kas masuk, dan efisiensi biaya tahun ke tahun dengan penanda visual tahun aktif.
    - **Tab 3: Profitabilitas Proyek**: Evaluasi margin keuntungan riil per proyek klien (Pendapatan vs Beban Proyek, Margin Bersih, persentase ROI/Margin, dan status kesehatan margin).
    - **Tab 4: Beban & Komitmen Aset Cloud**: Visualisasi dua kolom memuat rincian kategori pengeluaran dan daftar langganan server VPS/Cloud eksternal aktif beserta kalkulasi *burn rate* bulanan dan tahunan.
  - **Fitur Ekspor Lengkap**:
    - **Pratinjau & Unduh PDF (Landscape)**: Dokumen PDF komprehensif terformat lanskap dengan kop identitas bisnis resmi, kartu ringkasan KPI, dan tabel terperinci.
    - **Ekspor Excel / CSV**: Ekspor instan berkas CSV dengan *UTF-8 Excel BOM* per sub-tab aktif (bulanan, tahunan, proyek, atau aset cloud).
  - **Penyelarasan Halaman Laporan Finansial ([assets/js/pages/reports.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/reports.js))**:
    - Menyederhanakan halaman `reports.js` agar terfokus pada Aging Piutang, Arus Kas Penerimaan, dan Rekening Koran Klien, serta menyediakan tautan cepat ke menu baru `#/profit-loss`.
    - Otomatis mengarahkan navigasi (*redirect*) ke `#/profit-loss` bila terdapat tautan lama yang mengakses tab laba rugi.
  - Memperbarui Service Worker ke `crudworks-erp-v1.7.22` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.21] - 2026-11-20

### Diperbaiki (Fixed)

- **Sinkronisasi Pengaturan Tarif Pajak Default (`invoice_tax_percent`) pada Seluruh Fitur Generate Tagihan**:
  - **Penyebab**: Fitur *generate invoice* otomatis (pada kontrak SLA/Aset Cloud, Tagihan Berulang, Proyek Milestone, dan Timesheet) serta modal form pembuatan faktur sebelumnya menggunakan nilai `11.00%` yang di-*hardcode*, sehingga perubahan persentase PPN di Pengaturan Sistem (`app_settings.invoice_tax_percent = 0`) tidak diterapkan.
  - **Helper Sentral Backend ([api/config/invoice_helpers.php](file:///d:/laragon/www/crudworks-home/api/config/invoice_helpers.php))**:
    - Membuat fungsi pembantu `getDefaultTaxPercent()` yang secara dinamis mengambil konfigurasi `invoice_tax_percent` dari tabel `app_settings` (dengan fallback aman ke `0.00%`).
  - **Pembaruan Controller Generator Tagihan**:
    - [api/controllers/MaintenanceController.php](file:///d:/laragon/www/crudworks-home/api/controllers/MaintenanceController.php): Generate tagihan kontrak SLA dan aset cloud kini mematuhi `getDefaultTaxPercent()`.
    - [api/controllers/RecurringController.php](file:///d:/laragon/www/crudworks-home/api/controllers/RecurringController.php): Pembuatan faktur berkala otomatis kini menggunakan `getDefaultTaxPercent()`.
    - [api/controllers/ProjectController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ProjectController.php): Generate invoice milestone proyek menggunakan `getDefaultTaxPercent()`.
    - [api/controllers/TimesheetController.php](file:///d:/laragon/www/crudworks-home/api/controllers/TimesheetController.php): Generate invoice log jam kerja karyawan menggunakan `getDefaultTaxPercent()`.
    - [api/controllers/InvoiceController.php](file:///d:/laragon/www/crudworks-home/api/controllers/InvoiceController.php) & [api/controllers/QuotationController.php](file:///d:/laragon/www/crudworks-home/api/controllers/QuotationController.php): Menggunakan `getDefaultTaxPercent()` saat persentase pajak tidak disertakan.
  - **Integrasi Antarmuka Frontend ([assets/js/pages/invoices.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/invoices.js), [assets/js/pages/quotations.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/quotations.js), [assets/js/pages/settings.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/settings.js))**:
    - Modal *Buat Faktur Tagihan Baru* dan *Surat Penawaran Baru* kini otomatis menginisialisasi nilai input PPN dari `App.settings.invoice_tax_percent` (jika diatur 0, maka terisi 0).
    - Memperbarui `saveGenericSettings()` agar segera menyinkronkan memori state `App.settings` saat pengguna menekan tombol *Simpan Pengaturan*.
  - Memperbarui Service Worker ke `crudworks-erp-v1.7.21` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.20] - 2026-11-20

### Diperbaiki (Fixed)

- **Pencegahan Penambahan Baris Ganda pada Tombol Tambah Baris Faktur Tagihan ([assets/js/pages/invoices.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/invoices.js))**:
  - Mengganti binding `addEventListener('click')` menjadi setter property tunggal `btnAddLine.onclick` dengan mekanisme proteksi *debounce* 300ms.
  - Memastikan tombol *"Tambah Baris"* hanya menambahkan tepat 1 baris item layanan pada tabel faktur per klik serta kebal terhadap penekanan ganda (*double click*) atau *multiple event bubbling*.
  - Menerapkan pengamanan dan debouncing yang sama pada tombol tambah baris penawaran harga ([quotations.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/quotations.js)) dan tagihan berulang ([recurring.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/recurring.js)).
  - Memperbarui Service Worker ke `crudworks-erp-v1.7.20` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.19] - 2026-11-20

### Ditambahkan & Disempurnakan (Added & Enhanced)

- **Input Fleksibel Pajak PPN pada Surat Penawaran Harga ([assets/js/pages/quotations.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/quotations.js) & [api/controllers/QuotationController.php](file:///d:/laragon/www/crudworks-home/api/controllers/QuotationController.php))**:
  - Mengubah rincian biaya PPN yang sebelumnya berupa teks statis persentase kaku (11%) menjadi **field input angka dinamis** (`#form-quo-pajak-persen`).
  - Pengguna kini leluasa mengubah persentase PPN (misal 11%, 12%, 10%, 5%), mengisinya dengan angka `0`, atau **mengosongkannya secara langsung** untuk penawaran non-PPN / bebas pajak.
  - Perhitungan subtotal, DPP, nilai nominal pajak, dan total estimasi penawaran harga dihitung ulang secara instan (*real-time*).
  - Ketika formulir disimpan, persentase pajak dikirimkan ke backend dan disimpan ke kolom `pajak_persen` & `pajak_nominal` pada database.
  - Memperbarui kalkulasi dan cetak PDF proposal di [assets/js/core/utils.js](file:///d:/laragon/www/crudworks-home/assets/js/core/utils.js) agar menampilkan persentase pajak yang sesuai (misal `PPN (0%): Rp 0` saat tanpa pajak, atau persentase kustom).
  - Memperbarui Service Worker ke `crudworks-erp-v1.7.19` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.18] - 2026-11-20

### Diperbaiki (Fixed)

- **Perbaikan Masalah Macet pada Filter & Input Nominal Pembayaran ([assets/js/pages/payments.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/payments.js) & [assets/js/core/currency.js](file:///d:/laragon/www/crudworks-home/assets/js/core/currency.js))**:
  - **Inklusi Faktur Berstatus `draft` pada Pilihan Pembayaran**:
    - Memperbaiki filter `loadUnpaidInvoices()` agar faktur yang berstatus `draft` dapat dipilih untuk pencatatan pembayaran (sebelumnya hanya `dikirim`, `sebagian`, dan `jatuh_tempo`).
    - Mengatasi galat JavaScript unhandled `TypeError: Cannot read properties of undefined (reading 'value')` yang terjadi saat sistem mencoba memilih faktur `draft` dari tautan `#/payments?invoice_id=...&amount=...` yang menyebabkan modal pembayaran macet/tidak merespons.
  - **Eliminasi Batasan `stepMismatch` Validasi HTML5**:
    - Mengganti atribut kaku `min="1000" step="1000"` menjadi `min="1" step="any"` pada input `#form-pay-jumlah` dan `#form-verif-jumlah`.
    - Menghilangkan kegagalan validasi HTML5 internal peramban ketika pengguna memasukkan angka ganjil, ratusan perak, atau nominal hasil pajak PPN 11% (seperti Rp 3.607.500 atau Rp 1.164.500).
    - Memperbaiki penanganan event `invalid` pada [assets/js/core/currency.js](file:///d:/laragon/www/crudworks-home/assets/js/core/currency.js) agar memberikan notifikasi toast informatif kepada pengguna alih-alih menghentikan pengiriman formulir secara senyap.
  - **Sinkronisasi Otomatis Masking Mata Uang Rupiah**:
    - Menambahkan listener event `reset` formulir pada `currency.js` agar display input berpemisah ribuan (`.cur-display`) selalu sinkron saat form pembayaran di-reset atau dibatalkan.
    - Menghindari nilai desimal mentah (`.00`) dari database pada atribut `max` dan memastikan event `input` selalu dipicu saat nilai diisi secara terprogram.
  - **Toleransi Floating-Point Backend & Status Otomatis ([api/controllers/PaymentController.php](file:///d:/laragon/www/crudworks-home/api/controllers/PaymentController.php))**:
    - Memperbarui verifikasi nominal bayar terhadap sisa tagihan dengan pembulatan 2 desimal plus margin toleransi 0.5 perak (`round($jumlahBayar, 2) > round($sisaTagihan, 2) + 0.5`) guna mencegah pembatalan transaksi akibat ketidaktepatan presisi float PHP.
    - Menjamin transisi status faktur dari `draft` ke `sebagian` atau `lunas` secara mulus saat pembayaran pertama kali dicatat.
  - **Pencegahan Kendala `stepMismatch` pada Modul Lain**:
    - Mengganti `step="1000"` menjadi `step="any"` pada [invoices.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/invoices.js), [quotations.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/quotations.js), [services.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/services.js), dan [projects.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/projects.js).
  - Memperbarui Service Worker ke `crudworks-erp-v1.7.18` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.17] - 2026-11-20

### Ditambahkan & Disempurnakan (Added & Enhanced)

- **Penyederhanaan Input Layanan Penawaran Harga ([assets/js/pages/quotations.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/quotations.js))**:
  - Menggabungkan elemen pilihan katalog layanan dan teks deskripsi menjadi **1 field input pintar tunggal** berbasis `<datalist id="quotation-services-datalist">`, menyelaraskan UX pembuatan penawaran dengan form faktur tagihan.
  - Menghilangkan penumpukan dropdown dan input teks yang sebelumnya tampak seperti 2 baris vertikal dalam satu baris item.
  - Memastikan tombol *"Tambah Baris"* menambah tepat 1 baris item baru secara terisolasi tanpa duplikasi baris.
  - Dilengkapi fitur autokomplit dari katalog standar yang otomatis mengisi harga standar satuan, siklus/satuan, dan ID layanan saat opsi katalog dipilih, sekaligus tetap mendukung pengetikan deskripsi khusus secara bebas.

- **Otomatisasi Pendeteksian & Pembuatan Item Layanan Pelanggan pada Faktur Tagihan ([api/controllers/ClientController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ClientController.php) & [assets/js/pages/invoices.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/invoices.js))**:
  - **Endpoint Backend Baru (`GET /api/clients/{id}/active-services`)**:
    - Mendeteksi layanan aktif yang digunakan oleh pelanggan melalui 4 sumber berjenjang (*multi-tiered resolver*):
      1. **Kontrak SLA & Maintenance Aktif (`maintenance_sla`)**: Mengambil aset aktif (Cloud VPS, SLA bulanan, perpanjangan domain, sertifikat SSL) beserta biaya kontrak perpanjangannya.
      2. **Template Tagihan Berulang (`recurring_invoices`)**: Mengambil item layanan rutin dari template faktur berkala aktif klien.
      3. **Surat Penawaran Disetujui (`quotations`)**: Mengambil item deliverable dari proposal yang telah disetujui klien namun belum dikonversi ke faktur.
      4. **Riwayat Faktur Terakhir (`invoices` & `invoice_items`)**: Mengambil layanan langganan yang pernah ditagihkan pada faktur non-batal terakhir klien.
  - **Integrasi Otomatis pada Form Faktur Baru**:
    - Saat pengguna memilih pelanggan pada dropdown *"Pelanggan Ditagih"*, sistem secara otomatis memanggil API `active-services`.
    - Jika ditemukan layanan aktif atau riwayat langganan, tabel rincian layanan langsung terisi otomatis (*auto-generated*) lengkap dengan deskripsi, kuantitas, dan tarif harga standarnya.
    - Menampilkan lencana notifikasi cerdas berwarna emerald di bawah dropdown pelanggan yang menginformasikan jumlah item yang otomatis dimuat beserta sumber datanya.
    - Total tagihan langsung terkalkulasi otomatis secara *real-time*.
  - Memperbarui Service Worker ke `crudworks-erp-v1.7.17` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.16] - 2026-11-20

### Ditambahkan & Disempurnakan (Added & Enhanced)

- **Fitur Analisis Laba / Rugi Perusahaan Bulanan, Tahunan & Komparasi Biaya Aset/Cloud**:
  - **Latar Belakang**: Memenuhi kebutuhan pimpinan untuk mengetahui performa laba/rugi bersih riil perusahaan secara bulanan maupun tahunan, dengan membandingkan penerimaan tagihan kas masuk terhadap estimasi komitmen biaya aset (seperti langganan server VPS, cloud, database, domain, lisensi SaaS) dan beban operasional umum.
  - **Penyempurnaan Backend API ([api/controllers/ReportController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ReportController.php))**:
    - Menghitung realisasi kas masuk dari tabel `payments`, total nilai faktur diterbitkan dari tabel `invoices` (`status != 'batal'`), realisasi kas beban dari `expenses` (`status = 'lunas'`), dan estimasi biaya bakar (*burn rate*) bulanan dan tahunan dari tabel `company_assets`.
    - Menyediakan analisis bulanan terperinci untuk 12 bulan (Januari s.d. Desember) dalam tahun yang dipilih, mencakup: kas masuk, tagihan terbit, beban server/cloud, beban operasional lain, total beban bulan berjalan, laba/rugi bersih, net margin %, dan status (Surplus / Defisit).
    - Menyediakan komparasi performa multi-tahun (*Year-over-Year*) untuk melihat tren pertumbuhan pendapatan dan efisiensi pengeluaran.
    - Menghitung rasio beban infrastruktur aset/cloud terhadap total pendapatan kas.
  - **Tampilan Interaktif SPA Finansial ([assets/js/pages/reports.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/reports.js))**:
    - **Bilah Kontrol & Mode Analisis**: Memungkinkan peralihan mudah antara Tampilan Bulanan (12 Bulan), Tampilan Tahunan (Multi-Tahun), dan Filter Rentang Tanggal Kustom.
    - **5 Kartu KPI Utama**: Realisasi Kas Masuk (Tagihan Terbayar), Beban Operasional Riil, Estimasi Biaya Aset & Cloud (Bulanan & Tahunan), Laba Bersih Operasional (Surplus/Defisit), dan Net Profit Margin %.
    - **Banner Komparasi Tagihan Masuk vs Biaya Aset**: Menampilkan persentase beban infrastruktur cloud terhadap omset kas masuk beserta indikator visual status efisiensi (Sangat Efisien, Proporsional, atau Perlu Optimalisasi).
    - **Tabel Analisis Bulanan (12 Bulan)**: Rincian baris per bulan lengkap dengan total kalkulasi tahunan di baris footer.
    - **Tabel Komparasi Multi-Tahun**: Membandingkan kinerja keuangan dari tahun ke tahun.
    - **Daftar Komponen Langganan Server & Cloud Aktif**: Memperlihatkan rincian layanan eksternal yang sedang berjalan beserta konversi beban bulanan dan tahunannya.
    - **Ekspor Dokumen PDF Komprehensif**: Mendukung pratinjau dan unduh PDF berformat landscape yang mencakup ringkasan eksekutif, tabel laba/rugi bulanan, komparasi tahunan, dan profitabilitas proyek.

- **Penyederhanaan & Perbaikan Form Faktur Tagihan Baru ([assets/js/pages/invoices.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/invoices.js))**:
  - **Penyatuan Field Katalog & Deskripsi Layanan**:
    - Mengeliminasi penumpukan elemen `<select>` katalog dan `<input>` deskripsi yang sebelumnya memakan 2 baris vertikal dalam satu sel tabel.
    - Menggabungkan keduanya menjadi **1 field cerdas tunggal** menggunakan `<input list="invoice-services-datalist">`.
    - Pengguna dapat langsung mengetik deskripsi khusus atau memilih layanan dari katalog standar.
    - Otomatis mengisi harga standar satuan dan mengaitkan ID layanan ke database saat opsi katalog dipilih.
  - **Perbaikan Aksi Tambah Baris**:
    - Mengisolasi penanganan klik tombol "Tambah Baris" dengan `preventDefault()` dan `stopPropagation()` untuk memastikan hanya 1 baris item baru yang ditambahkan setiap kali tombol diklik.
  - Memperbarui versi cache Service Worker ke `crudworks-erp-v1.7.16` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.15] - 2026-11-20

### Diperbaiki & Disempurnakan (Fixed & Enhanced)

- **Dukungan Calon Pelanggan (Prospek) pada Input Surat Penawaran Harga**:
  - **Penyelesaian Masalah**: Memperbaiki pemfilteran dropdown klien pada saat membuat dan mengubah Surat Penawaran Harga (`#/quotations`). Sebelumnya, calon pelanggan dengan status `prospek` tidak muncul karena query API di [api/controllers/ClientController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ClientController.php) dibatasi hanya `status = 'aktif'`.
  - **Dukungan Status Multi-Kategori di API**:
    - Memperbarui endpoint `GET /api/clients?all=1` di [api/controllers/ClientController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ClientController.php) agar secara default menyertakan pelanggan dengan status `aktif` maupun `prospek` (calon pelanggan), serta mendukung parameter filter status jamak `status=aktif,prospek` atau `include_prospects=1`.
  - **Pengelompokan Dropdown Interaktif (Optgroup UI)**:
    - Di sisi frontend [assets/js/pages/quotations.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/quotations.js), daftar pemilih calon pelanggan kini dikelompokkan secara visual menggunakan elemen `<optgroup>`:
      1. **Calon Pelanggan / Prospek**: Ditandai dengan lencana bintang ⭐ dan label status `[Calon Pelanggan / Prospek]`.
      2. **Pelanggan Tetap / Aktif**: Pelanggan yang telah aktif.
  - **Otomatisasi Konversi Prospek Menjadi Klien Aktif**:
    - Pada [api/controllers/QuotationController.php](file:///d:/laragon/www/crudworks-home/api/controllers/QuotationController.php), saat penawaran harga dikonversi menjadi faktur tagihan resmi (1-Click Convert to Invoice), sistem secara otomatis memperbarui status pelanggan dari `prospek` menjadi `aktif`.
  - Memperbarui Service Worker ke `crudworks-erp-v1.7.15` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.14] - 2026-11-20

### Ditambahkan (Added)

- **Modul Manajemen Aset Internal & Langganan Cloud Pihak Luar (`#/company-assets`)**:
  - **Tujuan Modul**: Mengakomodasi kebutuhan pengelolaan inventaris server VPS, database cloud, portofolio domain, lisensi software/SaaS, dan layanan pihak ketiga (seperti AWS, DigitalOcean, Hetzner, Google Cloud, Cloudflare, Namecheap) yang dilanggani perusahaan.
  - **Tabel Database & Entitas (`company_assets`)**:
    - Dibuat pada skema [database.sql](file:///d:/laragon/www/crudworks-home/database.sql) dengan metadata komprehensif: nama aset, kategori (`cloud_vps`, `database_storage`, `domain_dns`, `saas_license`, `security_ssl`, `email_smtp`, `network_cdn`, `hardware_it`), nama vendor/provider, IP/domain identifier, lokasi data center/region, spesifikasi teknis, URL portal login, skema biaya multicurrency (IDR, USD, EUR, SGD) dan konversi kurs estimasi, siklus bayar, PIC staf teknis, jadwal perpanjangan, dan status layanan.
  - **Otomatisasi Status Kedaluwarsa & Metrik Biaya (KPI)**:
    - Penentuan status otomatis: `aktif` (>30 hari), `segera_kadaluwarsa` (≤30 hari), dan `kadaluwarsa` (<0 hari).
    - Metrik KPI finansial real-time: Total Aset Dikelola, Estimasi Biaya Bulanan (*Monthly Burn* dalam IDR), Estimasi Biaya Tahunan (*Yearly Burn*), dan jumlah layanan kritis.
  - **Integrasi 1-Klik ke Beban Pengeluaran (`expenses`)**:
    - Tombol **Catat Beban**: Secara instan membuat entri pencatatan beban operasional pada modul Keuangan & Beban (`expenses`) dengan kategori yang dipetakan otomatis (`SERVER_CLOUD`, `DOMAIN_SSL`, atau `LISENSI_SOFTWARE`).
    - Dilengkapi opsi cerdas *Auto-Advance Renewal* yang otomatis memajukan tanggal jatuh tempo aset ke periode siklus berikutnya dan mengembalikan status ke Aktif saat pembayaran dicatat.
  - **Frontend SPA Berkelas ([assets/js/pages/company-assets.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/company-assets.js))**:
    - Terdaftar pada navigasi utama **OPERASIONAL &rarr; Aset & Langganan Cloud** (`#/company-assets`) di [api/config/menus.json](file:///d:/laragon/www/crudworks-home/api/config/menus.json) dan router [assets/js/core/router.js](file:///d:/laragon/www/crudworks-home/assets/js/core/router.js).
    - Dilengkapi bilah filter multi-kriteria (pencarian nama/IP/domain, kategori aset, status kadaluwarsa, dan dropdown provider unik).
    - Modal interaktif tambah/ubah dengan kalkulasi kurs instan, serta modal catat beban 1-klik yang mudah digunakan.
  - **Perizinan RBAC**:
    - Mendaftarkan permission `asset.view`, `asset.create`, `asset.edit`, dan `asset.delete` untuk peran Super Administrator, Staf Keuangan, dan Project Manager.
    - Memperbarui Service Worker ke `crudworks-erp-v1.7.14` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.13] - 2026-11-20

### Ditambahkan (Added)

- **Modul Cadangan & Pemulihan Database (Backup & Restore)**:
  - **Arsitektur Pembuangan Mandiri (Native PHP & MySQL)**:
    - Menghadirkan controller backend [api/controllers/BackupController.php](file:///d:/laragon/www/crudworks-home/api/controllers/BackupController.php) yang mampu membuat dump basis data MySQL secara native tanpa bergantung pada konfigurasi command line eksternal.
    - Mendukung dua mode pencadangan: **Penuh (Struktur Skema + Data Transaksi)** dan **Struktur DDL Saja** (tanpa data).
    - Mendukung kompresi otomatis **Gzip (.sql.gz)** yang menghemat hingga 85% ruang disk server atau ekspor standar **Plain SQL (.sql)**.
  - **Pemulihan Database Terpadu (Database Restore)**:
    - Mendukung pemulihan langsung dari daftar berkas arsip yang tersimpan di server (`storage/backups/`).
    - Mendukung pemulihan melalui unggah berkas (`.sql` atau `.sql.gz`) dari perangkat lokal dengan drag-and-drop dropzone.
    - Dilengkapi pemisah statement cerdas berbasis parser SQL, penonaktifan sementara `FOREIGN_KEY_CHECKS` dan `SQL_MODE`, serta transaksi aman untuk menjamin integritas relasi.
    - Pembersihan otomatis cache aplikasi (`clearCache`) setelah pemulihan sukses.
  - **Antarmuka Pengguna Berkelas (Frontend SPA)**:
    - Menambahkan modul SPA [assets/js/pages/backup.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/backup.js) dengan rute `#/backup`.
    - Kartu ringkasan database: Nama Basis Data, Versi Mesin MySQL, Total Ukuran Data, Total Entri/Baris Rekam, dan Tanggal Cadangan Terakhir.
    - Tab ganda: **Berkas Cadangan Tersimpan** (unduh, pulihkan, hapus) dan **Struktur Tabel Database** (pencarian nama tabel, jumlah baris, ukuran data, dan indeks).
    - Dialog konfirmasi berlapis dan peringatan keamanan sebelum eksekusi pemulihan dilakukan.
  - **Keamanan & Perizinan (RBAC)**:
    - Mendaftarkan permission `database.backup` dan `database.restore` pada [database.sql](file:///d:/laragon/www/crudworks-home/database.sql) dan menghubungkannya dengan menu navigasi sistem di [api/config/menus.json](file:///d:/laragon/www/crudworks-home/api/config/menus.json).
    - Memasang perlindungan `.htaccess` pada folder `storage/backups/` untuk mencegah pengunduhan langsung via URL publik tanpa sesi dan otorisasi.
    - Memperbarui Service Worker ke `crudworks-erp-v1.7.13` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.12] - 2026-11-20

### Diperbaiki (Fixed)

- **Perbaikan Galat Database Tabel SLA Saat Pengecekan Relasi Hapus Pelanggan**:
  - Mengatasi error `SQLSTATE[42S02]: Base table or view not found: 1146 Table 'crudworks_erp.sla_contracts' doesn't exist` pada [api/controllers/ClientController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ClientController.php).
  - Menyelaraskan nama tabel kontrak pemeliharaan/SLA yang benar sesuai skema database, yaitu `maintenance_sla` (bukan `sla_contracts`).
  - Membungkus seluruh pengecekan tabel relasi dan proses penghapusan berantai dengan fungsi pelindung defensif (`$safeCount` & `try-catch`) agar tidak menyebabkan fatal error 500 jika ada tabel opsional yang tidak terpasang.

- **Perbaikan Pembaruan & Penghapusan Rekening Bank Resmi Perusahaan**:
  - **Resolusi Masalah Utama**: Memperbaiki fungsi simpan perubahan (update/edit) dan hapus (delete) pada modul Master Rekening Bank Resmi (`#/bank-accounts`).
  - **Normalisasi Pemanggilan API (`App.api`)**:
    - Memperbaiki ketidakcocokan tanda tangan pemanggilan di [assets/js/pages/bank-accounts.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/bank-accounts.js) yang sebelumnya meneruskan metode HTTP sebagai string argumen posisi (`App.api(url, 'PUT', payload)` / `App.api(url, 'DELETE')`) alih-alih opsi objek (`{ method: 'PUT', body: payload }`). Hal tersebut menyebabkan peramban keliru mengirim request sebagai `GET` sehingga perubahan dan penghapusan tidak pernah tersimpan di database.
    - Menjadikan [assets/js/core/api.js](file:///d:/laragon/www/crudworks-home/assets/js/core/api.js) polimorfik sehingga otomatis menoleransi pemanggilan dengan metode string posisi maupun objek opsi untuk mencegah galat serupa di masa depan.
  - **Dukungan Array Izin RBAC**:
    - Memperbarui `checkPermission()` di [api/middleware/rbac.php](file:///d:/laragon/www/crudworks-home/api/middleware/rbac.php) agar mendukung validasi izin array (`WHERE rp.role_id = ? AND p.kode IN (...)`) secara native tanpa menyebabkan kegagalan konversi tipe PDO pada peran staf non-superadmin.
  - **Penyelarasan Cache & Integritas Dokumen**:
    - Menambahkan pembersihan cache tagihan (`clearCache(['invoices'])`) saat penghapusan rekening dilakukan di [api/controllers/BankAccountController.php](file:///d:/laragon/www/crudworks-home/api/controllers/BankAccountController.php).
    - Memperbarui skema DDL [database.sql](file:///d:/laragon/www/crudworks-home/database.sql) dengan mendaftarkan permission `bank.view` dan `bank.manage` ke dalam katalog perizinan standar.
    - Memutakhirkan cache versi Service Worker ke `crudworks-erp-v1.7.12` di [sw.js](file:///d:/laragon/www/crudworks-home/sw.js).

---

## [1.7.11] - 2026-11-20

### Diperbaiki & Disempurnakan (Fixed & Enhanced)

- **Pencegahan Error Foreign Key Constraint (1451) Saat Menghapus Pelanggan**:
  - Mengatasi error MySQL `SQLSTATE[23000]: Integrity constraint violation: 1451` yang muncul ketika menghapus pelanggan yang masih memiliki relasi data (khususnya dokumen penawaran harga pada tabel `quotations`).
  - Menambahkan pengecekan relasi menyeluruh di [api/controllers/ClientController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ClientController.php) yang mencakup: Faktur Tagihan (`invoices`), Surat Penawaran (`quotations`), Proyek (`projects`), Tagihan Berulang (`recurring_invoices`), Kontrak SLA (`sla_contracts`), dan Timesheet (`timesheets`).
  - **Integritas Keuangan Terjaga**: Jika pelanggan memiliki faktur tagihan resmi, penghapusan permanen diblokir mutlak untuk menjaga jejak audit akuntansi, dan sistem mengarahkan pengubahan status menjadi `Nonaktif`.
  - **Opsi Penghapusan Cerdas & Nonaktifkan (SweetAlert2)**:
    - Di sisi frontend [assets/js/pages/clients.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/clients.js), jika pelanggan memiliki data penawaran/proyek (tanpa faktur), pengguna disajikan dialog interaktif yang elegan:
      1. *Nonaktifkan Saja (Disarankan)*: Mengubah status pelanggan menjadi nonaktif tanpa merusak data riwayat.
      2. *Hapus Paksa & Penawarannya*: Menghapus pelanggan beserta penawaran terkait secara kaskade aman dalam transaksi database (`beginTransaction`/`commit`).
      3. *Batal*: Membatalkan aksi dengan aman.
  - **Penanganan Global Error Foreign Key di API**: Memutakhirkan blok `catch (PDOException $e)` di [api/index.php](file:///d:/laragon/www/crudworks-home/api/index.php) agar kesalahan relasi (error code 23000 / 1451) ditransformasikan menjadi pesan bisnis yang ramah alih-alih mengekspos detail teknis MySQL mentah.

---

## [1.7.10] - 2026-11-20

### Diperbaiki (Fixed)

- **Perbaikan Referensi Fungsi `_resolveCompanyInfo` pada Ekspor Dokumen Word Penawaran**:
  - Menambahkan implementasi fungsi pembantu `_resolveCompanyInfo(sourceObj)` pada [assets/js/core/utils.js](file:///d:/laragon/www/crudworks-home/assets/js/core/utils.js) yang sebelumnya belum terdefinisi secara independen saat dipanggil oleh `downloadQuotationWord`.
  - Fungsi ini secara aman membaca profil instansi/perusahaan resmi (nama, alamat, kontak, email, NPWP) dari payload penawaran atau fallback ke pengaturan aplikasi (`window.App.getSetting`).
  - Telah diverifikasi eksekusinya berjalan mulus tanpa error.

---

## [1.7.9] - 2026-11-20

### Diperbaiki & Disempurnakan (Fixed & Enhanced)

- **Perapian Kolom Satuan `one_time` pada Tabel PDF Penawaran (Bebas Turun Baris)**:
  - Mengatasi masalah teks satuan `one_time` yang terlipat/turun ke baris bawah (*text wrapping*).
  - Menambahkan pembersih format satuan otomatis (`_cleanSatuan`): teks mentah seperti `one_time` / `onetime` dikonversi menjadi `One Time`, `monthly` menjadi `Bulan`, `annually` menjadi `Tahun`, dan karakter garis bawah diganti spasi rapi (*Title Case*).
  - Menyesuaikan lebar kolom `Satuan` pada `autoTable` dari 20 mm menjadi **25 mm** dengan *cellPadding* seimbang (3 mm kiri/kanan), sehingga teks seperti `One Time` muat sempurna dalam satu baris tanpa terlipat ke bawah.
  - Memutakhirkan form input item dan pemilih katalog layanan pada modal editor agar otomatis mengisi `One Time` alih-alih `one_time`.
- **Fitur Pengeditan Naskah Penawaran Langsung & Ekspor Dokumen Word (.doc / Editable)**:
  - Menyediakan tombol **Edit Naskah & Nilai** langsung di dalam jendela pratinjau PDF (*PDF Preview Modal*): pengguna dapat langsung beralih ke editor interaktif untuk merevisi pasal, ruang lingkup, rincian biaya, atau catatan atas permintaan klien tanpa harus menutup pratinjau dan mencari tombol aksi manual.
  - Menghadirkan fitur ekspor **Unduh Format Word (.doc / Editable)** (`App.downloadQuotationWord`): menghasilkan dokumen Microsoft Word resmi yang memuat kop surat lengkap, kotak data klien, pasal hak & kewajiban, serta tabel biaya terformat rapi. File dapat diedit secara bebas oleh pengguna maupun klien di Microsoft Word, Google Docs, WPS, atau LibreOffice untuk kebutuhan negosiasi klausul atau telaah internal.
  - Menambahkan tombol ekspor Word di menu baris tabel penawaran (`#/quotations`) dan toolbar portal tanda tangan digital publik klien (`#/public-quotation`).

---

## [1.7.8] - 2026-11-20

### Diperbaiki & Disempurnakan (Fixed & Enhanced)

- **Eliminasi Banner Berlebih & Pencegahan Tembus Status Dokumen pada PDF Kuitansi**:
  - Menghapus banner teks `01. RINCIAN ALOKASI PEMBAYARAN & KANAL PERBANKAN` agar tabel pembayaran langsung tersambung rapi di bawah kotak penerima (*Executive Recipient Box*), menyuguhkan tampilan kuitansi yang lebih bersih, ringkas, dan profesional.
  - Memperbaiki kotak **CATATAN HUKUM & KEABSAHAN TRANSAKSI** di mana teks status dokumen (*STATUS DOKUMEN: TERVERIFIKASI SAH SISTEM KOMPUTERISASI*) sebelumnya bertabrakan / tembus dengan baris teks disclaimer di atasnya. Kini ketinggian baris disclaimer dihitung secara dinamis (`discLines.length * discLineH`), teks disclaimer dicetak secara sekuensial, dan status dokumen diletakkan tepat di bawahnya dengan jarak bantalan vertikal aman (2mm).
- **Perbaikan Kolom Informasi Proyek & Anggaran Tembus ke Samping (Quotation PDF)**:
  - Mengatasi masalah teks keterangan proyek yang tembus ke samping / keluar batas bingkai ketika teks nama proyek panjang.
  - Menyusun geometri dua kolom yang simetris (`halfW`, `leftTextW`, `rightTextW`), menempatkan garis pemisah (*divider*) tepat di tengah secara presisi dengan jarak aman 3mm di kedua sisi.
  - Menyetel jenis dan ukuran font (*font family & font size*) secara spesifik **sebelum** perhitungan pemecahan baris (`splitTextToSize`), serta mengaplikasikan parameter pembatasan `{ maxWidth: rightTextW }` dan `{ maxWidth: leftTextW }` pada setiap panggilan pencetakan teks. Teks dijamin 100% tidak akan pernah meluap menembus batas samping maupun garis divider.
- **Penyempurnaan Alinea & Tipografi Naskah Proposal (Quotation PDF)**:
  - Menyederhanakan kedalaman indentasi alinea gantung (*hanging indent gutter width*) dari 8.5mm menjadi 5.2mm yang proporsional, menghilangkan rongga kosong (*gap*) berlebih antara angka nomor dan kalimat isi.
  - Menyelaraskan faktor kelipatan jarak baris (`lineHeightFactor = 1.44`) dengan tinggi baris riil (`lineHeight = 4.6mm`), melenyapkan ruang kosong semu (*phantom whitespace*) di bawah setiap butir paragraf yang sebelumnya membuat naskah terasa "terlalu banyak alinea".
  - Menambahkan dukungan sub-butir bertanda hubung (`-` / `•`) yang terindentasi rapi secara hierarkis (gutter 8.8mm) di bawah butir bernomor utama.
  - Mengatur spasi antar-paragraf menjadi lebih seimbang dan nyaman dibaca selayaknya dokumen bisnis dan proposal korporat kelas atas.

---

## [1.7.7] - 2026-11-20

### Diperbaiki & Disempurnakan (Fixed & Enhanced)

- **Penyederhanaan Tabel & Eliminasi Bagian Pengesahan Berlebih pada PDF Kuitansi**:
  - Menghapus kolom *Rekening & Kanal Bank Kasir* dan *No. Referensi Bank* pada tabel rincian pembayaran kuitansi, menyederhanakannya menjadi 3 kolom esensial yang bersih dan tegas: `No`, `Uraian / Tujuan Pembayaran`, dan `Jumlah Diterima (IDR)`.
  - Menghapus banner `02. PENGESAHAN & KEABSAHAN TRANSAKSI PEMBAYARAN` beserta kotak teller display nominal, stempel bulat, dan kolom tanda tangan ganda yang berlebih.
  - Mempertahankan dan mempercantik kompartemen **CATATAN HUKUM & KEABSAHAN TRANSAKSI** di bawah ringkasan saldo tagihan dan kotak terbilang dengan aksen bar emerald, tipografi legal proporsional, serta penegasan status keabsahan dokumen komputerisasi.
- **Pemberantasan Masalah Tembus Teks pada Kotak INFORMASI PROYEK & ANGGARAN (Quotation PDF)**:
  - Memperbaiki kalkulasi ketinggian dinamis kotak penerima (*Executive Recipient Box*) pada [assets/js/core/utils.js](file:///d:/laragon/www/crudworks-home/assets/js/core/utils.js) berdasarkan penghitungan riil jumlah baris teks (`projLines`, `estimasiLines`, `statusLines`) ditambah padding aman 8mm, mencegah teks judul proyek dan estimasi anggaran meluap (*bleed through*) menembus batas bawah garis bingkai.
  - Menerapkan iterasi baris presisi pada kolom kiri dan kanan agar posisi vertikal setiap label dan isian terkendali sempurna.
- **Penerapan Alinea Gantung (*Hanging Indent*) Rata Kanan-Kiri pada Baris Berpenomoran (Quotation PDF)**:
  - Memperbarui fungsi tata letak naskah proposal (`renderProse`) dengan fitur **Alinea Gantung (Hanging Indent)**: setiap butir berpenomoran (*numbered lists*, misalnya `1.`, `2.`, `3.`) menempatkan angka pada margin kiri tersendiri (*gutter width 8.5mm*).
  - Seluruh baris teks isi berikutnya (*baris selanjutnya*) otomatis terindentasi sejajar (*hanging*) dengan awal kalimat baris pertama dan diratakan secara penuh (*justify*), menghasilkan tampilan dokumen legal dan proposal bisnis yang sangat rapi, simetris, dan terstruktur standar notaris/korporat.

---

## [1.7.6] - 2026-11-20

### Diperbarui & Disempurnakan (Improved & Enhanced)

- **Penyelarasan Format PDF Kuitansi Pembayaran Seragam dengan PDF Penawaran (A4 Portrait Executive)**:
  - Mengubah format Kuitansi Pembayaran (`generatePaymentReceiptPdf`) menjadi format **A4 Portrait** yang selaras dan seragam dengan tata letak Surat Penawaran Harga (*Quotation*) dan Faktur Tagihan.
  - Menerapkan arsitektur visual konsisten:
    1. *Top Dual-Accent Bar*: `slate-900` tebal (4mm) & `emerald-600` aksen finansial (1.5mm).
    2. *Kop Typographic CRUDWORKS*: Wordmark resmi di kiri atas dan identitas kuitansi resmi (badge, nomor kuitansi, tanggal terbit, status lunas) di kanan atas.
    3. *Executive Recipient & Transaction Box*: Kotak penerima dua kolom berlatar lembut (`slate-50`) dengan border `slate-200` dan divider vertikal halus; memuat data lengkap Pembayar/Klien (UP PIC, kontak, alamat) di kiri serta rincian faktur terkait dan metode di kanan.
    4. *Bab 01 (Banner Banner)*: `01. RINCIAN ALOKASI PEMBAYARAN & KANAL PERBANKAN` dengan aksen bar vertikal emerald.
    5. *Tabel Alokasi Pembayaran AutoTable*: Header gelap `slate-900`, teks tajam, dan cell padding lega (4.0mm).
    6. *Rekonsiliasi Saldo & Callout Terbilang*: Kotak terbilang berlatar emerald muda di kiri berdampingan dengan kartu kalkulasi ringkasan tagihan, jumlah diterima, dan sisa saldo di kanan.
    7. *Bab 02 (Banner Banner)*: `02. PENGESAHAN & KEABSAHAN TRANSAKSI PEMBAYARAN`.
    8. *Pengesahan Finansial Tiga Pilar*: Kotak nominal besar gaya *Bank Teller Voucher* (`Rp ...,-` tebal kontras tinggi), stempel bulat digital ganda resmi (*PT CRUDWORKS MEDIA TAMA · LUNAS / SAH · VERIFIED SYSTEM*), dan kolom tanda tangan resmi Kasir Keuangan lengkap dengan tanggal domisili kota.
    9. *Catatan Hukum & Keabsahan Transaksi*: Box catatan legal di bagian bawah dokumen.
    10. *Watermark Lunas & Running Footer*: Watermark halus di belakang dokumen serta penomoran halaman footer seragam.
- **Peningkatan Ukuran Font & Padding Surat Penawaran (Quotation PDF)**:
  - Membesarkan ukuran teks tubuh (*body font size*) dari `8.2pt` menjadi **`9.2pt`** dan tinggi baris (*line height*) dari `4.5mm` menjadi **`5.5mm`** (`lineHeightFactor: 1.32`) sehingga naskah penawaran jauh lebih jelas, nyaman, dan mudah dibaca tanpa melelahkan mata.
  - Membesarkan judul pasal dan bab kontrak (*Pasal 1 s/d 3*) menjadi **`10.5pt - 11pt bold`** dengan jarak vertikal yang lebih lega.
  - Menambah padding pada tabel rincian investasi (*autoTable*): `cellPadding` ditingkatkan dari `2.8mm - 3.0mm` menjadi **`4.0mm`**, font tabel dari `8.0pt` menjadi **`9.0pt`**, dan font header tabel dari `7.6pt` menjadi **`8.5pt bold`**.
  - Menambah padding dan tinggi kartu ringkasan biaya (*summary card*) dan kotak nominal terbilang menjadi **`21mm - 26mm`** dengan font total estimasi yang lebih menonjol (**`10.5pt bold`**).
  - Meningkatkan tinggi dan padding banner bab (*Section Banner*) dari `7.5mm` menjadi **`9.0mm`** dengan font `9.8pt bold` dan aksen bar vertikal lebih tegas.
  - Memperluas area tanda tangan (*signatures area*) dengan garis pengesahan yang lebih lebar (**`62mm`**) dan jarak ruang tanda tangan yang lebih lega (**`35mm`**).

---

## [1.7.5] - 2026-11-20

### Diperbarui & Disempurnakan (Improved & Enhanced)

- **Desain Baru Format PDF Kuitansi Pembayaran Resmi Indonesia (Landscape A5 Voucher)**:
  - Mengubah orientasi dan format dokumen Kuitansi Pembayaran menjadi **Landscape A5 (210mm × 148mm)**, standar emas kuitansi perbankan dan kas kantor korporat Indonesia.
  - Menghilangkan ruang kosong vertikal yang canggung pada format lama, kini pas satu halaman penuh dan langsung nyaman dilihat di modal pratinjau maupun dicetak setengah A4.
  - **Double Security Frame & Brand Accent Bar**:
    - Bingkai luar elegan bergaris halus (`slate-300`) dengan bingkai dalam aksen emerald (`#10b981`).
    - Top dual-accent stripe korporat (`slate-900` & `emerald-600`).
  - **Struktur Kompartemen Kuitansi Klasik Resmi**:
    - *Kop Perusahaan & Logo Resmi*: Nama PT, alamat legal, kontak, dan nomor NPWP.
    - *Judul Besar*: **K U I T A N S I** disertai badge resmi *BUKTI PEMBAYARAN SAH (OFFICIAL RECEIPT)*, nomor kuitansi, dan tanggal transaksi.
    - *Baris Formulir Voucher*:
      1. **Telah Diterima Dari**: Nama instansi/klien bold dengan keterangan UP (PIC).
      2. **Uang Sejumlah (Terbilang)**: Box callout prestisius berlatar emerald muda (*### ... Rupiah ###*).
      3. **Untuk Pembayaran**: Nomor faktur tagihan dan catatan alokasi proyek.
      4. **Tabel Parameter Rekonsiliasi 4-Kolom**: Rekening/Kanal Kasir Tujuan, Nomor Referensi Bank, Total Tagihan Faktur, dan Sisa Saldo Faktur (*LUNAS / NIHIL*).
    - *Kotak Nominal Besar Teller Voucher*: Display nominal tebal `Rp ...,-` berlatar gelap kontras tinggi di sudut kiri bawah.
    - *Stempel Bulat Digital Resmi*: Stempel autentikasi ganda *PT CRUDWORKS MEDIA TAMA · LUNAS / SAH · VERIFIED SYSTEM* di tengah.
    - *Kolom Tanda Tangan Kasir*: Pengesahan resmi kota, tanggal, dan nama kasir/verifikator keuangan.
- **Penyempurnaan Klausul Hak & Kewajiban Serta Perataan Rata Kanan-Kiri (Justify) pada PDF Penawaran**:
  - **Perataan Paragraf Justify**: Memperbarui mesin tata letak teks narasi/prose proposal (`renderProse`) pada `generateQuotationPdf()` agar paragraf dijajarkan secara rata kanan-kiri (*justify*), memberikan tampilan naskah kontrak legal yang rapi, simetris, dan berwibawa.
  - **Penegasan Lisensi Pemakai Akhir & Tanpa Source Code**:
    - Menetapkan klausul baku Pasal 2 secara tegas bahwa Klien hanya memperoleh Hak Akses Penggunaan sebagai **Pemakai Akhir (End-User License)** untuk operasional bisnis internal.
    - Menegaskan secara eksplisit bahwa Klien **TIDAK MENERIMA dan TIDAK MEMILIKI hak kepemilikan atas Source Code (Kode Sumber)**, algoritma, arsitektur, maupun kerangka sistem, di mana seluruh hak cipta dan kekayaan intelektual tetap menjadi hak milik mutlak penyedia jasa.
    - Menambahkan filter sanitasi otomatis pada generator PDF sehingga proposal lama yang tersimpan di basis data otomatis dimutakhirkan ke klausul lisensi pemakai akhir tanpa source code saat dicetak atau diunduh.

---

## [1.7.4] - 2026-11-20

### Diperbaiki (Fixed)

- **Pemulihan Ekspor Modul `openWhatsAppQuotation` & `openWhatsAppReceipt`**:
  - Memulihkan fungsi ekspor `openWhatsAppQuotation` dan `openWhatsAppReceipt` pada [assets/js/core/utils.js](file:///d:/laragon/www/crudworks-home/assets/js/core/utils.js) yang sebelumnya terpotong saat pembersihan duplikasi.
  - Memvalidasi seluruh relasi ekspor-impor pada 21 modul halaman dan seluruh modul core (`api.js`, `auth.js`, `datatable.js`, `currency.js`, `datepicker.js`, `select.js`, `router.js`, `utils.js`) dengan hasil 100% valid tanpa kesalahan modul.

---

## [1.7.3] - 2026-11-20

### Ditambahkan & Diperbarui (Added & Improved)

- **Desain Baru Format PDF Kuitansi Pembayaran Resmi (Corporate Executive Receipt)**:
  - Merombak total fungsi `generatePaymentReceiptPdf()` menjadi format dokumen sertifikat kuitansi finansial korporat yang mewah dan presisi.
  - Menghadirkan **Security Frame Double-Border** dengan aksen sudut finansial, dual-accent top bar (`slate-900` & `emerald-600`), dan watermark autentikasi *LUNAS*.
  - Kompartemen kuitansi resmi Indonesia:
    1. *Telah Diterima Dari* dengan nama instansi/klien bold dan UP PIC.
    2. *Uang Sejumlah (Terbilang)* dalam box prestisius berlatar emerald muda dengan tanda pagar kutip formal (*### ... Rupiah ###*).
    3. *Untuk Pembayaran* disertai nomor tagihan faktur dan rincian alokasi.
    4. *Tabel Rekonsiliasi Finansial 4-Kolom*: Total Tagihan Asli, Jumlah Diterima, Sisa Saldo Tagihan Faktur, Kanal Bank & Nomor Referensi.
    5. *Voucher Callout Box*: Tampilan nominal tebal besar `Rp ...` bergaya teller perbankan berstempel digital resmi bulat *LUNAS / VERIFIED SYSTEM*.
    6. *Pengesahan Sah*: Kolom tanda tangan Penyetor & Kasir Keuangan berstempel digital komputerisasi.
- **Standarisasi Universal Kolom Status Tabel di Seluruh Modul (*Taste-Skill Grade*)**:
  - Mengimplementasikan sistem badge status seragam berbasis indikator dot bercahaya solid (*halo-ring dot*) dan *translucent tint* berkelas di semua modul (`invoices`, `clients`, `projects`, `quotations`, `expenses`, `recurring`, `services`, `users`, `timesheets`, `bank-accounts`, `maintenance`, `settings`, `audit`).
  - Menghilangkan styling status kaku dan inkonsisten; kini semua status memiliki hierarki warna tegas (Success, Warning, Danger, Info, Neutral) dengan micro-icon dan copywriting profesional bahasa Indonesia.
- **Penyederhanaan Header Toolbar**:
  - Menghapus tombol *Ubah Tata Letak* dan *Kalkulator Cepat* dari toolbar header karena fungsinya telah tersedia lengkap di Windows Start Menu / Taskbar Bawah dan menu profil pengguna, menjadikan header jauh lebih bersih dan ringkas.

---

## [1.7.2] - 2026-11-20

### Diperbaiki (Fixed)

- **Perbaikan Menyeluruh Badge Angka Header & Eliminasi Efek Tembus (Zero Bleed-Through)**:
  - Menerapkan **Solid Cutout Ring** 2px (putih solid di mode terang, `#0f172a` di mode gelap) pada `#topbar-daily-brief-badge` dan `#topbar-notif-badge`, memutus garis vektor font icon di bawahnya sehingga angka badge tidak lagi tembus atau berbayang garis icon.
  - Menetapkan styling inline 100% solid (`opacity: 1 !important`, `background-color`, `border`, `z-index: 30`) langsung pada elemen HTML sehingga langsung aktif seketika tanpa terhambat latensi CDN atau cache browser.
  - Menyesuaikan geometri tombol dan jarak kapsul toolbar (`px-2 py-1 gap-2`) serta koordinat badge (`top: -2px; right: -2px; overflow: visible`) agar badge angka tidak menembus batas tombol atau menabrak icon di sebelahnya.
- **Strategi Cache-Busting & Pembaruan Service Worker Otomatis**:
  - Mengubah strategi navigasi Service Worker (`sw.js`) menjadi **Network-First** untuk dokumen HTML root, memastikan pengguna selalu memuat versi terbaru tanpa tertahan cache statis lama.
  - Menambahkan auto-purge cache usang pada aktivasi Service Worker dan saat inisialisasi aplikasi (`_registerServiceWorker`).
  - Menaikkan versi cache ke `crudworks-erp-v1.7.2` untuk memaksa browser merefresh seluruh aset statis secara bersih.

---

## [1.7.1] - 2026-11-20

### Diperbaiki (Fixed)

- **Perbaikan Fungsi Ubah Tata Letak Menu (*Navigation Layout Picker*)**:
  - Mengembalikan elemen popup modal dropdown `#nav-layout-dropdown` yang sebelumnya tidak terdefinisi di DOM sehingga event klik pada tombol *Ubah Tata Letak Menu* (`App.toggleNavLayoutPicker`) kini berfungsi aktif 100%.
  - Menyediakan 3 opsi tata letak dengan status checkmark aktif dan pergantian dinamis:
    1. **Sidebar Kiri (Klasik)**: Tata letak sidebar navigasi desktop penuh.
    2. **Taskbar Bawah (Windows)**: Dock modern di bagian bawah dengan Windows Start Menu.
    3. **Bilah Atas (Modern)**: Taskbar di bagian atas dengan akses menu ringkas.
  - Penempatan posisi popover dropdown adaptif otomatis berdasarkan koordinat tombol pemicu (baik diklik dari taskbar bawah, bilah atas, maupun header).

### Diubah & Diringkas (Changed)

- **Penyederhanaan & Perapian Ikon Bilah Navigasi Atas (*Header Toolbar Modernization*)**:
  - Mengelompokkan seluruh tombol utilitas yang sebelumnya tersebar lepas menjadi satu kapsul toolbar terpadu (*Segmented Capsule Toolbar*) berdesain rapi, simetris, dan proporsional:
    - *Action Board Pagi Hari* (`#topbar-daily-brief-btn`) dengan live counter badge.
    - *Notifikasi & Jatuh Tempo* (`#topbar-notif-btn`) dengan live counter badge.
    - Micro-divider pemisah visual.
    - *Ubah Tata Letak Menu* (`#topbar-layout-btn`) untuk beralih layout langsung dari header.
    - *Kalkulator Cepat Tagihan & PPN* (`#topbar-calc-btn`).
    - *Mode Gelap / Terang* (`#topbar-theme-btn`).
  - Menambahkan menu pintasan *Tata Letak Menu Navigasi* dan *Kalkulator Tagihan* langsung di dalam dropdown menu profil pengguna (`#topbar-user-dropdown`).
  - Tampilan header kini jauh lebih ringkas, tidak memadati layar, dan bebas dari ikon lepas yang berantakan.

---

## [1.7.0] - 2026-11-19

### Ditambahkan (Added)

- **Action Board Pagi Hari & Rekap Penagihan Otomatis (Executive Daily Brief)**:
  - **Panel Modal Eksekutif Penuh (`App.openDailyBriefModal()`)**:
    - Agregasi instan 4 agenda kritis operasional harian:
      1. **Tagihan & Piutang Jatuh Tempo / Overdue**: Menampilkan nomor faktur, nama klien, sisa piutang, hari keterlambatan, tombol *Kirim WA Penagihan* instan, dan tombol rincian faktur.
      2. **Termin Milestone Siap Ditagih**: Daftar termin proyek berstatus 'rencana' yang targetnya hari ini dengan tombol *1-Klik Terbitkan Faktur* langsung ke sistem billing.
      3. **SLA Domain, Hosting & SSL (< 14 Hari)**: Peringatan dini masa berlaku lisensi aset sebelum disuspend provider.
      4. **Pemantau Kesehatan Server & Insiden Uptime**: Deteksi otomatis proyek dengan status *down* atau SSL < 7 hari.
  - **Tombol Cepat Topbar & Indikator Badge Live**:
    - Tombol ikon mentari (`#topbar-daily-brief-btn`) di samping kalkulator cepat pada header sistem dengan badge penghitung agenda kritis (*live counter*).
  - **Banner Widget Harian di Dashboard Utama**:
    - Banner selamat pagi adaptif di [assets/js/pages/dashboard.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/dashboard.js) yang langsung merangkum status seluruh operasional setiap kali dashboard dibuka.
  - **Generator Pesan WhatsApp Eksekutif (Salin & Kirim 1-Klik)**:
    - Fungsi `App.copyDailyBriefWhatsApp()` dan `App.sendDailyBriefWhatsApp()` menyusun format laporan pagi rapi untuk dikirimkan ke manajemen atau grup WhatsApp direktur dalam satu sentuhan.
  - **CLI & Cron Runner Mandiri ([api/cron/daily_brief.php](file:///d:/laragon/www/crudworks-home/api/cron/daily_brief.php))**:
    - Script CLI native yang dapat dieksekusi berkala melalui Laragon atau Windows Task Scheduler (`php api/cron/daily_brief.php`) untuk briefing harian otomatis.

---

## [1.6.0] - 2026-11-19

### Ditambahkan (Added)

- **Poin 1: Portal Klien Terpadu (Client Extranet Hub)**:
  - Halaman portal eksternal mandiri (`#/client-portal?token=...`) tanpa login bagi pelanggan untuk memeriksa riwayat tagihan, status pembayaran, berkas proposal penawaran, status SLA server/domain, dan nomor rekening penagihan resmi.
  - Endpoint backend terisolasi [api/controllers/ClientPortalController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ClientPortalController.php) dengan proteksi sanitasi token unik (`clients.portal_token`).
  - Integrasi menu pada tabel pelanggan: *Buka Portal Klien*, *Salin Tautan Portal*, dan *Kirim Akses Portal via WhatsApp*.
- **Poin 2: Persetujuan Penawaran & Tanda Tangan Digital Klien (E-Sign Approval)**:
  - Portal persetujuan proposal penawaran publik (`#/public-quotation?token=...`) dilengkapi canvas signature pad responsif untuk tanda tangan digital klien via touch screen atau mouse.
  - Endpoint [api/controllers/PublicQuotationController.php](file:///d:/laragon/www/crudworks-home/api/controllers/PublicQuotationController.php) untuk validasi token, penandatanganan legal, pencatatan nama penandatangan, jabatan, timestamp, dan IP address.
  - Penyematan otomatis gambar tanda tangan digital klien pada lembar ke-2 dokumen PDF Penawaran resmi (`generateQuotationPdf`).
- **Poin 3: Generator Faktur Termin Bertahap (Milestone Billing)**:
  - Pengelolaan termin pembayaran proyek berbasis milestone pada [api/controllers/ProjectController.php](file:///d:/laragon/www/crudworks-home/api/controllers/ProjectController.php) dan antarmuka [assets/js/pages/projects.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/projects.js).
  - Skema pembagian termin fleksibel: template instan 30-40-30, 50-50, atau kustomisasi persentase & tanggal target per milestone.
  - Pembuatan faktur otomatis satu klik (*1-Click Invoice Generation*) langsung dari termin yang belum ditagih ke sistem penagihan utama.
- **Poin 4: Pemantau Status & Uptime Aplikasi Klien (Live Health & SSL Checker)**:
  - Pemeriksaan uptime HTTP/HTTPS, latensi respons server (ms), dan masa berlaku sertifikat SSL (sisa hari) secara riil via cURL backend.
  - Indikator visual status langsung pada tabel proyek dengan badge hijau (*Online & ms*) / merah (*Down*) dan alert peringatan SSL jika kedaluwarsa dalam < 30 hari.
- **Poin 5: Kalkulator Margin & Profitabilitas Riil Proyek (Project P&L Insight)**:
  - Analisis laba rugi riil per proyek: membandingkan nilai kontrak, pembayaran diterima, beban pengeluaran operasional proyek (*expenses*), jam kerja tim riil (*timesheets*), estimasi biaya tenaga kerja (*labor cost*), laba kotor (*gross profit*), dan persentase margin laba.
  - Modal analisis eksekutif interaktif pada dashboard proyek.
- **Poin 6: Kustomisasi Template Pesan WhatsApp & Notifikasi di Pengaturan Sistem**:
  - Konfigurasi template pesan WhatsApp dinamis di menu Pengaturan Sistem ([assets/js/pages/settings.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/settings.js)) untuk Reminder Faktur, Pengiriman Proposal Penawaran, dan Konfirmasi Kuitansi Pembayaran.
  - Dukungan variabel cerdas `{nama_pic}`, `{nama_perusahaan}`, `{nomor_invoice}`, `{total_tagihan}`, `{jatuh_tempo}`, `{tautan_portal}`, `{rekening_tujuan}`, dll.
  - Eksekusi instan langsung membuka WhatsApp Web / Desktop dengan pesan terformat rapi.

---

## [1.5.0] - 2026-11-19

### Diperbaiki (Fixed)

- **Perbaikan Penuh Fitur Order (Sort), Drag-to-Reorder, dan Atur Kolom pada Seluruh Tabel Data**:
  - **Akar Masalah**: Saat halaman pertama kali diinisialisasi, `table.data-table` hanya berisi baris loader (`colspan`). Ketika data dari API selesai diunduh secara asinkron (`tbody.innerHTML = ...`), seluruh sel `<td>` baru tidak memiliki atribut `data-dt-orig-col`, sehingga sorting kolom tidak mengenali nilai sel (`null`), penataan urutan drag kolom gagal (`byOrig.size === 0`), dan sembunyikan/tampilkan kolom tidak dapat diaplikasikan pada baris data.
  - **Solusi**:
    1. Memasang **MutationObserver** otomatis pada setiap `tbody` tabel `data-table` untuk mendeteksi injeksi data asinkron dan langsung menjalankan penandaan atribut kolom serta layout posisi secara reaktif.
    2. Menjaga indeks asli header `<th>` pada `_tagOriginalColumns` agar tidak tertimpa saat penataan ulang kolom.
    3. Menambahkan pelindung flag `table._isInternalSorting` dan jeda debouncing agar operasi sort tidak memicu rekursi mutasi tak berujung.
    4. Menyempurnakan pemilah tanggal format `DD/MM/YYYY` pada `_parseCellSortValue` untuk akurasi pengurutan kronologis.
    5. Menghindari trigger event `click` sorting yang tidak disengaja setelah aksi drag kolom selesai.
    6. Mengubah label tombol toolbar menjadi **"Atur Kolom"** agar lebih jelas dan intuitif bagi pengguna.

---

## [1.4.9] - 2026-11-19

### Diperbaiki & Diubah (Fixed & Changed)

- **Penyematan Logo Resmi CRUDWorks pada Rincian Lembar Faktur & Portal Publik**:
  - Mengganti ikon placeholder koper (`ri-briefcase-4-line`) pada modal **Rincian Lembar Faktur** (`viewInvoiceSheet`) di [assets/js/pages/invoices.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/invoices.js#L617-L627) dengan logo resmi [assets/images/logo.png](file:///d:/laragon/www/crudworks-home/assets/images/logo.png).
  - Memperbarui header portal publik faktur di [assets/js/pages/public-invoice.js](file:///d:/laragon/www/crudworks-home/assets/js/pages/public-invoice.js#L144-L154) dengan logo resmi CRUDWorks resolusi proporsional.
  - Memperbarui Service Worker cache ke `crudworks-erp-v1.4.9` serta mendaftarkan aset `assets/images/logo.png` ke dalam cache offline.

---

## [1.4.8] - 2026-11-19

### Diubah (Changed)

- **Standardisasi Logo Resmi CRUDWorks di Seluruh Laporan PDF**:
  - Menyeragamkan header seluruh dokumen dan laporan PDF menggunakan logo resmi yang sama (`D:\laragon\www\crudworks\css\logo.png` / [assets/images/logo.png](file:///d:/laragon/www/crudworks-home/assets/images/logo.png)):
    - **Laporan Keuangan & Akuntansi (`exportPdf`)**: Laporan Laba Rugi, Rekening Koran Pelanggan, Analisis Umur Piutang (Aging), Arus Kas Pendapatan, dan laporan rekapitulasi data lainnya.
    - **Faktur Tagihan Penjualan (`generateInvoicePdf`)**: Cetak Faktur Admin & Portal Tagihan Publik Klien.
    - **Surat Penawaran & Proposal Proyek (`generateQuotationPdf`)**: Proposal 2 Halaman Eksekutif.
    - **Kuitansi Pembayaran Sah (`generatePaymentReceiptPdf`)**: Bukti Pembayaran Resmi Pelanggan.
  - Seluruh dokumen kini memiliki bahasa visual identik: Dual-tone accent bars atas (Slate-900 4mm + Indigo-600 1.5mm), logo horizontal resmi beresolusi tajam (46mm x 9.12mm), identitas legal perusahaan, capsule pill badge status, dan penomoran halaman footer seragam.

---

## [1.4.7] - 2026-11-19

### Diperbaiki & Diubah (Fixed & Changed)

- **Penyempurnaan Spasi Header Kanan Penawaran (Bebas Tembus/Tabrakan)**:
  - Memperbaiki jarak vertikal antara lencana status (`DRAFT PENAWARAN`) dan judul dokumen (`SURAT PENAWARAN & PROPOSAL`).
  - Lencana status digambar dengan koordinat baseline tersendiri dan diberi jarak aman `9.7mm` sebelum judul dokumen (13pt), mencegah tabrakan vertikal antar teks.
- **Format 2 Halaman Eksekutif Surat Penawaran (`generateQuotationPdf`)**:
  - Menata dokumen penawaran menjadi **2 Halaman Eksekutif** yang rapi, proporsional, dan nyaman dibaca:
    - **Halaman 1 (Executive Summary & Investasi)**: Logo resmi CRUDWorks, header & status badge, kotak penerima (klien & proyek), salam pembuka, Bab 01 Ruang Lingkup Fitur, Bab 02 Rincian Investasi (AutoTable), kotak ringkasan biaya, dan nilai terbilang rupiah.
    - **Halaman 2 (Legalitas & Pengesahan)**: Running header resmi halaman kedua, Bab 03 Pasal-Pasal Hak & Kewajiban Para Pihak, Bab 04 Syarat & Ketentuan Pembayaran, Bab 05 Catatan Tambahan, serta Blok Pengesahan Tanda Tangan Dua Belah Pihak (Klien dan CRUDWorks) dengan stempel digital komputerisasi.

---

## [1.4.6] - 2026-11-19

### Diperbaiki (Fixed)

- **Perbaikan ReferenceError `_applyDocumentWatermark is not defined`**:
  - Mengoreksi penutupan blok komentar JSDoc di atas fungsi `_applyDocumentWatermark` di [assets/js/core/utils.js](file:///d:/laragon/www/crudworks-home/assets/js/core/utils.js#L1868-L1873).
  - Memastikan fungsi watermark kini aktif secara mandiri dan dapat dipanggil dengan lancar saat pembuatan Faktur Tagihan, Surat Penawaran, dan Kuitansi Pembayaran.

---

## [1.4.5] - 2026-11-19

### Diubah (Changed)

- **Penyematan Logo Resmi `logo.png` pada Header Seluruh Laporan PDF**:
  - Menggantikan logo teks sementara dengan file logo resmi CRUDWorks dari `D:\laragon\www\crudworks\css\logo.png` (disalin lokal ke [assets/images/logo.png](file:///d:/laragon/www/crudworks-home/assets/images/logo.png)).
  - Mengintegrasikan logo horizontal beresolusi tinggi (499x99 px, aspect ratio 5.04:1) secara proporsional ke:
    - **Faktur Tagihan** (`generateInvoicePdf`)
    - **Surat Penawaran** (`generateQuotationPdf`)
    - **Kuitansi Pembayaran** (`generatePaymentReceiptPdf`)
    - **Laporan Akuntansi & Rekapitulasi Umum** (`exportPdf`)
  - Identitas perusahaan, alamat kantor, email, telepon, dan NPWP kini tersusun rapi dan presisi di bawah logo resmi tanpa saling menimpa.

---

## [1.4.4] - 2026-11-19

### Diperbaiki (Fixed)

- **Perbaikan Overlapping Teks "Proyek" pada Kotak Recipient PDF**:
  - Mengatasi masalah teks nama proyek yang bertumpukan / tembus ke label "Total Estimasi" dan "Status Dokumen" ketika nama proyek memiliki panjang lebih dari satu baris.
  - Menerapkan kalkulasi tinggi kotak dinamis (`clientBoxH`) yang otomatis menyesuaikan panjang nama perusahaan klien, alamat, serta judul proyek.
  - Menerapkan penataan vertikal linier (`rCurY` dan `lCurY`) dengan spasi baris otomatis antar elemen, sehingga seluruh teks tersusun rapi tanpa saling menimpa.
  - Menambahkan garis pemisah vertikal halus (*subtle column divider*) di antara informasi entitas klien dan informasi proyek/anggaran.

---

## [1.4.3] - 2026-11-19

### Diperbaiki (Fixed)

- **Perbaikan SyntaxError Export `openWhatsAppInvoiceReminder` di utils.js**:
  - Mengoreksi penutupan blok komentar JSDoc yang sebelumnya sempat membungkus deklarasi `export function openWhatsAppInvoiceReminder`.
  - Memperbarui helper di dalam `openWhatsAppInvoiceReminder` dan `openWhatsAppQuotation` agar menggunakan format tanggal & mata uang terlindungi (`_safeFormatDate` dan `_safeFormatIDR`).
  - Memastikan seluruh modul ES (`app.js`, `invoices.js`, `quotations.js`) dapat mengimpor `openWhatsAppInvoiceReminder` secara lancar tanpa hambatan `SyntaxError`.

---

## [1.4.2] - 2026-11-19

### Diperbaiki (Fixed)

- **Perbaikan ReferenceError formatDate pada Builder PDF**:
  - Mengatasi `ReferenceError: formatDate is not defined` di `generateInvoicePdf` dan `generateQuotationPdf`.
  - Mengimplementasikan helper internal `_safeFormatDate` dan `_safeFormatIDR` dengan proteksi fallback berjenjang ke `App.formatDate` dan standar ISO.
  - Memastikan `window.formatDate`, `window.formatIDR`, dan `window.formatRupiah` terpasang secara global pada scope runtime browser.

### Ditambahkan & Diubah (Added & Changed)

- **Logo Tulisan Teks Typographic CRUDWORKS (Modern Wordmark)**:
  - Menggantikan logo gambar bulat bitmap menjadi **Typographic Vector Brand Wordmark**: Monogram box rounded "CW" berlatar Indigo-600 bersanding dengan tipografi tebal `CRUD` (Slate-900) dan `WORKS` (Indigo-600) beresolusi tajam tanpa blur pada seluruh dokumen PDF (Tagihan, Penawaran, Kuitansi).
  - Dilengkapi tagline korporat `ENTERPRISE DIGITAL PLATFORM & IT CONSULTING` dan identitas kontak resmi.
- **Watermark Status Profesional Multi-Halaman**:
  - Menambahkan watermark latar belakang diagonal (45°) beropasitas halus di setiap halaman dokumen:
    - **Faktur Tagihan**: Watermark `LUNAS` (emerald), `BAYAR SEBAGIAN` (amber), `DIBATALKAN` (rose), `DRAFT` (slate), `JATUH TEMPO` (rose-600).
    - **Surat Penawaran**: Watermark `DISETUJUI` (emerald), `DITOLAK` (rose), `DRAFT` (slate), `DIBATALKAN` (rose), `KADALUARSA` (amber).
    - **Kuitansi Pembayaran**: Watermark `LUNAS` (emerald).
- **Keseragaman Desain 100%**:
  - Bahasa visual identik antara menu Tagihan, Penawaran, dan Kuitansi: Dual-tone accent bars atas (Slate-900 4mm + Indigo-600 1.5mm), header pill badge, kartu recipient simetris, AutoTable styling, terbilang miring, kartu grand total dengan highlight Indigo-50, serta blok pengesahan resmi.

---

## [1.4.1] - 2026-11-19

### Diubah (Changed)

- **Standardisasi & Penyeragaman Desain PDF Tagihan & Penawaran**:
  - **Penyematan Logo Resmi CRUDWorks**: Header PDF pada modul Faktur Tagihan (`generateInvoicePdf`) dan Surat Penawaran (`generateQuotationPdf`) kini menyematkan logo resmi CRUDWorks resolusi tinggi (14mm x 14mm) di sisi kiri atas secara sinkron via jsPDF Base64.
  - **Identitas Perusahaan Seragam & Profesional**: Nama perusahaan berhuruf tebal, dilengkapi tagline aksen warna Indigo-600 (`ENTERPRISE DIGITAL PLATFORM & IT CONSULTING`), alamat kantor lengkap, email, telepon, dan NPWP dengan tata letak presisi di samping logo.
  - **Status Pill Capsule & Header Kanan Selaras**: Tipe dokumen, nomor resmi, tanggal terbit, dan tanggal jatuh tempo/masa berlaku berformat seragam dengan lencana status kapsul rounded modern (hijau emerald, amber, rose, atau indigo).
  - **Kotak Informasi Klien & Proyek Simetris**: Kotak penerima berlatar `#f8fafc` dengan radius 2.2mm, memisahkan data entitas klien di sisi kiri dan informasi nama proyek serta anggaran di sisi kanan.
  - **AutoTable & Summary Card Harmonis**: Desain tabel rincian item, kotak terbilang nilai rupiah miring, kartu ringkasan grand total ber-highlight `#eef2ff`, instruksi transfer bank, serta blok tanda tangan digital komputerisasi dua belah pihak seragam 100%.

---

## [1.4.0] - 2026-11-19

### Ditambahkan (Added)

- **Komponen Universal Floating Table Action Dropdown ("Aksi" •••)**:
  - Menyediakan utilitas popover mengambang `toggleTableActionMenu()` dan `closeTableActionMenu()` di `assets/js/core/utils.js` yang diekspos melalui `App.toggleTableActionMenu`.
  - Berbasis *fixed portal positioning* di layer teratas (`z-50`) dengan koordinat otomatis terhadap tombol pemicu. Kebal dari masalah *clipping* atau terpotong oleh `overflow-x-auto` pada container tabel dan otomatis menyesuaikan orientasi vertikal saat berada di dekat batas bawah layar.
  - Mengubah seluruh baris tabel yang sebelumnya dipenuhi rentetan tombol berjejer horizontal (hingga 6-8 tombol) menjadi satu tombol dropdown "Aksi" yang ringkas dan elegan, menghemat lebar kolom aksi dari 250px menjadi hanya 65px di modul:
    - `quotations.js` (Pratinjau PDF, Unduh PDF, Kirim WA, Edit Naskah & Rincian, Tandai Terkirim, Tandai Disetujui, Jadikan Faktur, Hapus).
    - `invoices.js` (Cetak/Unduh PDF, Rincian Lembar Faktur, Kirim WA, Buka Portal Publik, Salin Tautan, Catat Pembayaran, Hapus).
    - `payments.js` (Cetak/Unduh Kuitansi PDF, Rincian Kuitansi Resmi, Batalkan Pembayaran).
    - `expenses.js` (Lihat Bukti/Struk, Edit Pengeluaran, Hapus).
    - `maintenance.js` (Terbitkan Faktur Perpanjangan, Edit Layanan SLA/Domain, Hapus).
    - `timesheets.js` (Edit Log Kerja, Hapus).
    - `clients.js` (Edit Profil Klien, Buat Faktur Baru, Buat Penawaran Baru, Hapus).
    - `projects.js` (Sinkronkan Status Git, Edit Rincian Proyek, Hapus).
    - `services.js` (Edit Layanan, Hapus).
    - `recurring.js` (Generate Faktur Sekarang, Hapus Template).
    - `bank-accounts.js` (Tetapkan Rekening Utama, Ubah Data Rekening, Hapus/Nonaktifkan).
    - `users.js` (Edit Pengguna, Hapus Pengguna).

- **Penyempurnaan PWA (Progressive Web App) & Dialog Panduan Instalasi**:
  - Dibuatkan file fisik ikon PNG standar PWA: `assets/icons/icon-192.png` (192x192) dan `assets/icons/icon-512.png` (512x512) berdesain monogram resmi CRUDWorks ERP dengan lencana verifikasi.
  - Ditambahkan ke daftar pre-caching `sw.js` dan manifest `manifest.json` agar 100% memenuhi kriteria *PWA Installability* browser Chromium.
  - Memperbaiki alur tombol pasang aplikasi di topbar (`#topbar-install-btn`): Tombol tetap tersedia dan dapat diakses jika aplikasi belum berjalan dalam mode standalone.
  - Ditambahkan fallback cerdas `App.showPwaInstallGuideModal()` yang menyajikan panduan instalasi visual langkah-demi-langkah sesuai peramban pengguna (Chrome/Edge Desktop, iOS Safari, Android Chrome) ketika event `beforeinstallprompt` dibatasi oleh kebijakan keamanan HTTP lokal atau browser.

- **Redesign Format Dokumen Laporan & Faktur PDF Modern Profesional**:
  - **Palet Warna & Header Minimalis**: Mengadopsi aksen bar dual-tone (Slate-900 `#0f172a` dan Modern Indigo-600 `#4f46e5`), kop surat berjarak tipografi proporsional, dan penomoran resmi yang tegas.
  - **Status Pill Badge**: Tampilan status faktur dan penawaran kini menggunakan capsule berlatar belakang pastel lembut (Lunas hijau `#ecfdf5`, Bayar Sebagian amber `#fef3c7`, Belum Bayar rose `#fff1f2`).
  - **AutoTable Modern**: Cell padding vertikal diperlebar menjadi 2.6mm - 2.8mm, garis pembatas sel diperhalus (`0.15mm`), serta striping alternate row `#f8fafc` yang nyaman dibaca dan tidak sesak.
  - **Kotak Total Tagihan & Terbilang**: Grand total berlatar belakang kartu highlight lembut `#eef2ff` dengan font bold berukuran 10.5pt, serta teks nominal terbilang dalam kotak pastel miring.
  - **Rekening Bank Resmi Perusahaan**: Kotak instruksi transfer tujuan dengan nomor rekening tebal dan jelas dari data master perbankan resmi perusahaan.
  - **Running Header & Footer**: Format footer formal bergaris tipis di setiap halaman memuat nama dokumen resmi dan penomoran `Halaman X dari Y`.

---

## [1.3.0] - 2026-11-18

### Ditambahkan (Added)

- **Modul Beban & Pengeluaran Operasional (OPEX & Project Costing)** (`#/expenses`):
  - Skema database tabel `expense_categories` (disediakan 6 kategori baku: Cloud VPS/Server, Domain & SSL, Lisensi Software & API, Honor Subkontraktor, Operasional & Utilitas, Pemasaran & Sales) dan tabel `expenses` dengan relasi foreign key ke `projects`.
  - Backend controller `ExpenseController.php` dengan fitur CRUD beban operasional, unggah bukti nota/kuitansi (`/uploads/receipts/`), KPI ringkasan finansial pengeluaran bulanan/tahunan, dan filter berbasis proyek klien.
  - Laporan Laba Rugi Operasional & Margin Proyek (`reports/profit-loss`) di `ReportController.php` dan tab khusus di `reports.js` yang menghitung Net P&L (Realisasi Kas Masuk dikurangi Beban Operasional Lunas), persentase marjin laba bersih, serta ekspor PDF ringkasan laba rugi.
  - Halaman antarmuka frontend `assets/js/pages/expenses.js` dengan kartu KPI real-time, filter kategori/proyek, dan dialog pencatatan pengeluaran.

- **Modul Surat Penawaran Harga (Quotations / Proforma Invoice)** (`#/quotations`):
  - Skema database tabel `quotations` dan `quotation_items` dengan status siklus hidup penawaran (`draft`, `dikirim`, `disetujui`, `ditolak`, `dikonversi`, `kadaluwarsa`).
  - Backend controller `QuotationController.php` yang mendukung penomoran otomatis `QUO-YYYYMM-XXXX`, pencatatan item layanan dinamis, diskon, PPN 11%, syarat ketentuan penawaran, serta aksi 1-klik konversi menjadi faktur tagihan resmi (`POST /quotations/{id}/convert`).
  - Generator PDF Surat Penawaran Resmi `App.generateQuotationPdf()` dengan layout kop instansi, masa berlaku penawaran, tabel rincian harga, kotak catatan penawaran, dan kolom tanda tangan ganda.
  - Halaman antarmuka frontend `assets/js/pages/quotations.js` dengan fitur konversi instan ke invoice, pratinjau lembar A4, dan ekspor dokumen PDF.

- **Portal Tagihan Klien Publik & Verifikasi Bukti Transfer Klien** (`#/public-invoice`):
  - Token rahasia acak 48-karakter (`invoices.public_token`) dan kolom verifikasi pembayaran (`bukti_transfer`, `bukti_transfer_catatan`, `bukti_transfer_at`, `payment_verification_status`).
  - Endpoint publik mandiri `PublicInvoiceController.php` tanpa kewajiban autentikasi sesi, dikecualikan dari CSRF token session di `csrf.php` untuk memfasilitasi unggah struk transfer oleh klien eksternal.
  - Frontend portal publik `assets/js/pages/public-invoice.js` yang menyajikan status faktur, rincian biaya, tombol unduh invoice PDF vektor, kartu nomor rekening bank resmi perusahaan dengan tombol salin cepat, dan formulir unggah struk bukti transfer.
  - Alur verifikasi bukti transfer di `assets/js/pages/payments.js` (tab "Verifikasi Bukti Transfer Klien") dengan pratinjau gambar struk, aksi persetujuan 1-klik yang otomatis menerbitkan kuitansi pembayaran resmi `PAY-...` serta memperbarui status pelunasan invoice, dan aksi penolakan disertai catatan.

- **Otomasi Pengingat Tagihan & Penawaran WhatsApp Cepat**:
  - Utilitas pembuatan tautan pesan WhatsApp deep-link (`https://wa.me/{phone}?text=...`) dengan konversi otomatis nomor lokal Indonesia (`08...` menjadi `628...`) di `assets/js/core/utils.js`:
    - `App.openWhatsAppInvoiceReminder(inv)`: Menyusun format pesan penagihan sopan berstruktur jelas berisi nomor faktur, nama klien, rincian tagihan, tanggal jatuh tempo, rekening bank tujuan transfer resmi, dan tautan langsung ke portal publik invoice.
    - `App.openWhatsAppQuotation(quo)`: Menyusun pesan tindak lanjut pengiriman surat penawaran harga.
  - Tombol aksi WhatsApp langsung pada tabel faktur dan modal lembar faktur di `invoices.js`, serta pada tabel penawaran di `quotations.js`.

- **Modul Pemantauan SLA, Kontrak Maintenance & Kadaluwarsa Domain/Hosting/SSL** (`#/maintenance`):
  - Skema database tabel `maintenance_sla` yang mencakup aset digital (`domain`, `hosting_vps`, `ssl_certificate`, `maintenance_app`, `retainer_sprint`), tanggal mulai/kadaluwarsa, siklus penagihan, biaya perpanjangan, dan penanggung jawab teknis.
  - Backend controller `MaintenanceController.php` dengan kalkulasi sisa hari aktif otomatis, filter aset kritis (kadaluwarsa dalam <= 30 hari atau <= 7 hari), dan aksi 1-klik pembuatan faktur perpanjangan periodik (`POST /maintenance/{id}/create-invoice`).
  - Halaman antarmuka frontend `assets/js/pages/maintenance.js` dengan badge urgensi visual (Normal, Mendekati Kadaluwarsa, Kritis, Kadaluwarsa) dan tombol cepat pembuatan invoice tagihan perpanjangan.

- **Pencatatan Jam Kerja & Billing Berbasis Jam (Timesheets & Hourly Rates)** (`#/timesheets`):
  - Skema database tabel `timesheets` dengan pencatatan durasi kerja (menit/jam), jam mulai & selesai, deskripsi pekerjaan, billing rate per jam, flag billable, dan relasi ke pengembang, proyek, serta faktur.
  - Backend controller `TimesheetController.php` dengan metrik KPI (Total Jam, Jam Billable, Estimasi Unbilled Amount, Sesi Draft) dan endpoint konsolidasi faktur (`POST /timesheets/generate-invoice`).
  - Halaman antarmuka frontend `assets/js/pages/timesheets.js` dengan kalkulator durasi waktu kerja otomatis, filter proyek/pengembang/status billing, seleksi multi-baris jam kerja (*checkbox batch*), dan tombol 1-klik untuk menerbitkan faktur tagihan resmi terperinci ke klien.

---

## [1.2.0] - 2026-11-18

### Ditambahkan (Added)
- **Master Data Rekening Bank Resmi Perusahaan (`#/bank-accounts`)**:
  - Skema database tabel `payment_methods` diperluas dengan kolom `nama_bank`, `cabang`, `kode_bank`, `swift_code`, `tipe` (bank, ewallet, tunai), `is_default`, dan `updated_at`.
  - Migrasi database otomatis `api/migrations/20261118_bank_accounts.php` dan pembaruan `database.sql`.
  - Backend controller `BankAccountController.php` dengan kapabilitas CRUD lengkap, pencarian/filter status, aksi instan penetapan rekening utama (`action=set-default`), dan penghapusan pintar (*safe deactivation* jika rekening telah memiliki riwayat transaksi).
  - Pendaftaran hak akses RBAC (`bank.view` dan `bank.manage`) untuk peran `admin` dan `billing_staff`.
  - Pendaftaran menu navigasi di `api/config/menus.json` (ID 13, URL `#/bank-accounts`, Ikon `ri-bank-card-line`) pada kelompok menu "BILLING & KEUANGAN".
  - Modul frontend `assets/js/pages/bank-accounts.js` dengan kartu metrik ringkasan (Rekening Aktif, Rekening Utama, Total Transaksi), tombol salin nomor rekening satu-klik (*copy-to-clipboard*), filter pencarian real-time, dan modal formulir responsif.
  - Integrasi daftar rekening bank resmi ke dalam lembar faktur dan instruksi pembayaran klien.

- **Peniadaan Penuh `window.print()` & Penggantian dengan Mesin PDF Vektor Berstandar `app-keuangan`**:
  - Menghapus seluruh pemanggilan `window.print()` peramban di seluruh basis kode (`invoices.js`, `payments.js`, `reports.js`).
  - Mengadopsi library `jsPDF` (v2.5.2) dan `jspdf-autotable` (v3.8.4) tanpa build-step untuk pencetakan dokumen PDF vektor presisi tinggi.
  - Implementasi modal pratinjau universal `App.openPdfModal`: Modal dialog pratinjau PDF berukuran lapang (`max-w-5xl`) dengan iframe (`#view=FitH`), tombol penutup bersih, dan tombol langsung unduh file PDF.
  - Implementasi `generateInvoicePdf`: Generator PDF Faktur Penjualan resmi standar A4 yang memuat kop instansi, status pembayaran, rincian klien dan proyek git, AutoTable baris tagihan, rincian kalkulasi (subtotal, diskon, PPN 11%, sisa tagihan), terbilang rupiah, **kotak instruksi transfer rekening bank resmi aktif**, kolom pengesahan tanda tangan, dan penomoran halaman otomatis.
  - Implementasi `generatePaymentReceiptPdf`: Generator PDF Kuitansi Resmi Pembayaran dengan kop instansi, kartu ringkasan nominal berlatar hijau, tabel rincian transaksi, nilai terbilang rupiah, kanal/rekening bank penerima, sisa kewajiban faktur, serta tanda tangan penyetor & kasir finansial.
  - Implementasi ekspor dan pratinjau PDF pada seluruh jenis laporan di modul `reports.js` (Laporan Aging Piutang Klasifikasi Umur Tunggakan, Laporan Arus Kas Penerimaan, dan Laporan Rekening Koran / Kartu Piutang Klien).

---

## [1.1.0] - 2026-11-18

### Ditambahkan (Added)
- Integrasi sistem komponen CSS termutakhir dari `app-keuangan`:
  - **Compact Dock Sidebar**: Mode samping ramping 64px dengan ikon responsif, tooltip, dan flyout submenu.
  - **Organic Tree Lines**: Garis percabangan kurva organik pada navigasi submenu bertingkat.
  - **Windows 11 Taskbar & Start Menu**: Bilah tugas bawah modern dengan tombol Mulai, pinned apps, kartu akses cepat, dan jam sistem.
  - **Universal Datatable Engine**: Auto quick search, column-click sorting numerik/tanggal/rupiah, dan kerapatan baris adaptif (`dense` / `spacious`).
  - **8-Palette Dynamic Theme Engine**: Pemilih tema langsung dengan 8 varian warna (Indigo, Oranye, Violet, Biru, Cyan, Hijau, Merah, Slate).
  - **OmniSearch Command Palette (Ctrl+K)**: Pencarian universal instan untuk modul, data pelanggan, dan aksi cepat penagihan.
  - **Kalkulator Cepat Faktur (Alt+C)**: Simulasi instan kalkulasi subtotal tagihan, potongan diskon, PPN 11%, dan grand total.
  - **Modal Preferensi & Tentang Sistem**: Dialog penyesuaian format angka/tanggal, layout navigasi, dan pembaca changelog interaktif.

### Diubah (Changed)
- Memperbarui acuan komponen visual dari `app-koperasi` ke `app-keuangan` sesuai instruksi pengguna karena komponen CSS di `app-keuangan` adalah versi paling mutakhir.
- Merestrukturisasi algoritma JavaScript frontend ke dalam arsitektur modular `assets/js/core/` (`api.js`, `auth.js`, `currency.js`, `datatable.js`, `datepicker.js`, `navigation.js`, `router.js`, `select.js`, `utils.js`).
- **Penyempurnaan Spasi & Margin Tabel (Table Breathing Room)**:
  - Memperbaiki jarak tepi (margin & padding) tabel di seluruh menu agar tidak mepet dengan garis batas card (`th`/`td` pertama dan terakhir kini memiliki ruang lega 28px pada mode nyaman dan 24px pada mode padat).
  - Menghapus duplikasi border bersarang (*nested double border*) dan batasan tinggi kaku (*max-height clamp*) pada `.table-wrapper` saat berada di dalam kontainer card.
  - Menyelaraskan padding bilah pencarian/filter kolom (`.dt-toolbar`) dan bilah paginasi kartu dengan batas margin kolom tabel.

---

## [1.0.0] - 2026-11-18

### Ditambahkan (Added)

#### Fondasi & Arsitektur Sistem
- Arsitektur berbasis **Lightweight Modular Monolith** menggunakan Native PHP 8.1+ dan Vanilla JavaScript (ES6+ Modules) tanpa ketergantungan framework runtime berat.
- Front Controller terpusat (`api/index.php`) dengan skema perutean RESTful dan konvensi envelope respons JSON terstandarisasi.
- Single Page Application (SPA) shell (`index.html`) dengan hash-based router (`assets/js/app.js`), lazy-loaded page modules, in-memory client caching, dan promise pooling untuk deduplikasi permintaan simultan.
- Ekstraksi nomor versi dinamis dari `CHANGELOG.md` pada `index.php` untuk cache-busting otomatis pada aset klien.
- Optimasi konkurensi PHP melalui pelepasan dini lock sesi (`session_write_close()`) pada seluruh permintaan HTTP `GET`.

#### Keamanan & Manajemen Sesi
- Integrasi sesi pengguna berbasis **Redis** (`tcp://127.0.0.1:6379`) dengan cookie terlindungi (`HttpOnly`, `SameSite=Lax`).
- Sistem pertahanan **Cross-Site Request Forgery (CSRF)** berbasis token kriptografis 64-karakter dengan verifikasi timing-safe comparison pada metode mutasi state (`POST`, `PUT`, `DELETE`).
- Sistem otorisasi **Role-Based Access Control (RBAC)** dinamis dengan hierarki peran (`roles`, `permissions`, `role_permissions`) dan caching terarah di Redis.
- Filter navigasi otomatis berbasis izin akses pada `api/config/menus.json`.
- Modul pencatatan jejak audit aktivitas (`audit_logs`) untuk forensik mutasi data sensitif.

#### Modul Bisnis & Operasional
- **Dashboard Finansial**: Kartu ringkasan KPI (Total Piutang, Penerimaan Bulan Berjalan, Tagihan Jatuh Tempo, Klien Aktif), diagram tren pendapatan 6 bulan, dan daftar invoice mendesak.
- **Master Pelanggan (Clients)**: Manajemen data klien korporat/perorangan, pencarian cepat, filter status, pencatatan NPWP dan kontak penanggung jawab, serta profil histori piutang.
- **Manajemen Project**: Pencatatan proyek per klien dan jembatan integrasi ke sistem deployment `app-git` (`git_repo_url`, `git_branch`, `deploy_path`, `app_url`, status sinkronisasi).
- **Katalog Layanan**: Manajemen paket produk berulang dan sekali bayar (hosting, domain, maintenance, sprint dev).
- **Tagihan & Invoice**:
  - Penomoran faktur otomatis berbasis format sequential (`INV-YYYYMM-XXXX`).
  - Form pembuatan tagihan dengan penambahan baris layanan dinamis, diskon flat/persen, dan kalkulasi PPN otomatis.
  - State machine siklus tagihan: `draft` -> `dikirim` -> `sebagian` -> `lunas` / `jatuh_tempo` / `batal`.
  - Mesin cetak invoice format A4 standar resmi dan export cetak peramban.
  - Integrasi pengiriman invoice melalui protokol SMTP email.
- **Pencatatan Pembayaran**: Registrasi pelunasan faktur, kalkulasi otomatis sisa kewajiban, multi-metode bayar, dan penerbitan kuitansi resmi.
- **Tagihan Berulang (Recurring Invoices)**: Template faktur periodik (bulanan, triwulan, semesteran, tahunan) dengan otomasi generasi terjadwal via cron.
- **Laporan Finansial**: Laporan aging piutang (klasifikasi umur tunggakan), ringkasan arus kas pendapatan, dan mutasi kartu piutang (client statement).

#### Antarmuka Pengguna (UI/UX) & PWA
- Desain antarmuka berprinsip Anti-AI Slop dengan tipografi presisi kombinasi **Inter** dan **IBM Plex Mono** (angka monospaced).
- Navigasi sidebar dock gelap ala **Cloudflare** dengan sub-menu akordeon dan penanda rute aktif vertikal.
- Fitur preferensi multi-tata letak: Sidebar Dock (Default), Windows Bottom Taskbar, dan Windows Top Taskbar.
- Dukungan **Dark Mode** terpadu yang tersimpan di preferensi lokal peramban.
- Kapabilitas **Progressive Web App (PWA)** dengan konfigurasi `manifest.json` dan caching shell aplikasi via `sw.js` untuk instalasi pada perangkat seluler dan desktop.
