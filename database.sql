-- ============================================================
-- CRUDWorks ERP — Database Schema & Initial Seed Data
-- ============================================================

CREATE DATABASE IF NOT EXISTS `crudworks_erp` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `crudworks_erp`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Roles
CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `label` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Permissions
CREATE TABLE IF NOT EXISTS `permissions` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `kode` VARCHAR(100) NOT NULL UNIQUE,
    `nama` VARCHAR(100) NOT NULL,
    `kategori` VARCHAR(50) NOT NULL,
    `keterangan` VARCHAR(255) NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Role Permissions
CREATE TABLE IF NOT EXISTS `role_permissions` (
    `role_id` INT UNSIGNED NOT NULL,
    `permission_id` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`role_id`, `permission_id`),
    CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rp_perm` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Users
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `role_id` INT UNSIGNED NOT NULL,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `nama_lengkap` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `telepon` VARCHAR(30) NULL,
    `avatar` VARCHAR(255) NULL,
    `status` ENUM('aktif', 'nonaktif') DEFAULT 'aktif',
    `totp_secret` VARCHAR(64) NULL,
    `totp_enabled` TINYINT(1) NOT NULL DEFAULT 0,
    `preferences_json` TEXT NULL,
    `last_login` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Clients
CREATE TABLE IF NOT EXISTS `clients` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `kode_klien` VARCHAR(30) NOT NULL UNIQUE,
    `nama_perusahaan` VARCHAR(150) NOT NULL,
    `penanggung_jawab` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `telepon` VARCHAR(30) NOT NULL,
    `alamat` TEXT NULL,
    `kota` VARCHAR(100) NULL,
    `npwp` VARCHAR(50) NULL,
    `catatan` TEXT NULL,
    `status` ENUM('aktif', 'prospek', 'nonaktif') DEFAULT 'aktif',
    `prospect_stage` ENUM('leads_baru', 'kontak_awal', 'proposal_penawaran', 'negosiasi', 'deal_menang', 'batal_lost') DEFAULT 'leads_baru',
    `deal_value` DECIMAL(15, 2) DEFAULT 0.00,
    `expected_close_date` DATE NULL,
    `last_contact_at` DATETIME NULL,
    `lost_reason` VARCHAR(255) NULL,
    `portal_token` VARCHAR(64) NULL,
    `portal_password` VARCHAR(255) NULL,
    `portal_last_login_at` DATETIME NULL,
    `portal_failed_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `portal_locked_until` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_clients_status` (`status`),
    INDEX `idx_clients_nama` (`nama_perusahaan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Projects (terhubung ke app-git)
CREATE TABLE IF NOT EXISTS `projects` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `client_id` INT UNSIGNED NOT NULL,
    `kode_project` VARCHAR(30) NOT NULL UNIQUE,
    `nama_project` VARCHAR(150) NOT NULL,
    `deskripsi` TEXT NULL,
    `git_repo_url` VARCHAR(255) NULL,
    `git_branch` VARCHAR(50) DEFAULT 'main',
    `deploy_path` VARCHAR(255) NULL,
    `app_url` VARCHAR(255) NULL,
    `last_deploy_status` ENUM('idle', 'success', 'failed', 'running') DEFAULT 'idle',
    `last_deploy_at` DATETIME NULL,
    `golive_checklist_json` TEXT NULL,
    `tanggal_mulai` DATE NULL,
    `tanggal_selesai` DATE NULL,
    `nilai_project` DECIMAL(15,2) DEFAULT 0.00,
    `status` ENUM('perencanaan', 'aktif', 'maintenance', 'selesai', 'dibatalkan') DEFAULT 'aktif',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_projects_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
    INDEX `idx_projects_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6b. Project Milestones & Termin Penagihan
CREATE TABLE IF NOT EXISTS `project_milestones` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `project_id` INT UNSIGNED NOT NULL,
    `nama_milestone` VARCHAR(150) NOT NULL,
    `persentase` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `nominal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `tanggal_target` DATE NULL,
    `invoice_id` INT UNSIGNED NULL,
    `status` ENUM('rencana','ditagih','lunas') DEFAULT 'rencana',
    `catatan` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pmilestones_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
    INDEX `idx_pmilestones_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6c. Project Tasks (Papan Kanban Tugas Ringan per Milestone)
CREATE TABLE IF NOT EXISTS `project_tasks` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `project_id` INT UNSIGNED NOT NULL,
    `milestone_id` INT UNSIGNED NULL,
    `judul_tugas` VARCHAR(200) NOT NULL,
    `deskripsi` TEXT NULL,
    `prioritas` ENUM('rendah', 'sedang', 'tinggi', 'mendesak') DEFAULT 'sedang',
    `status` ENUM('todo', 'in_progress', 'review', 'done') DEFAULT 'todo',
    `assigned_to` INT UNSIGNED NULL,
    `estimasi_jam` DECIMAL(6,2) DEFAULT 0.00,
    `deadline` DATE NULL,
    `urutan` INT DEFAULT 0,
    `created_by` INT UNSIGNED NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ptasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ptasks_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `project_milestones` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_ptasks_user` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_ptasks_status` (`status`),
    INDEX `idx_ptasks_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6d. Project BAST (Berita Acara Serah Terima Pekerjaan Digital)
CREATE TABLE IF NOT EXISTS `project_basts` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nomor_bast` VARCHAR(50) NOT NULL UNIQUE,
    `project_id` INT UNSIGNED NOT NULL,
    `milestone_id` INT UNSIGNED NULL,
    `client_id` INT UNSIGNED NOT NULL,
    `tanggal_bast` DATE NOT NULL,
    `judul_pekerjaan` VARCHAR(200) NOT NULL,
    `deskripsi_hasil` TEXT NOT NULL,
    `catatan_revisi` TEXT NULL,
    `status` ENUM('draft', 'ditandatangani', 'dibatalkan') DEFAULT 'draft',
    `pihak_pertama_nama` VARCHAR(100) NOT NULL,
    `pihak_pertama_jabatan` VARCHAR(100) NOT NULL,
    `pihak_kedua_nama` VARCHAR(100) NOT NULL,
    `pihak_kedua_jabatan` VARCHAR(100) NOT NULL,
    `signature_data` LONGTEXT NULL,
    `signed_at` DATETIME NULL,
    `signed_ip` VARCHAR(45) NULL,
    `created_by` INT UNSIGNED NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pbasts_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pbasts_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `project_milestones` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_pbasts_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
    INDEX `idx_pbasts_project` (`project_id`),
    INDEX `idx_pbasts_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6e. Client Tickets (Manajemen Tiket Gangguan Portal Klien)
CREATE TABLE IF NOT EXISTS `client_tickets` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nomor_tiket` VARCHAR(30) NOT NULL UNIQUE,
    `client_id` INT UNSIGNED NOT NULL,
    `project_id` INT UNSIGNED NULL,
    `maintenance_id` INT UNSIGNED NULL,
    `kategori` ENUM('gangguan_sistem', 'domain_ssl', 'perbaikan_bug', 'permintaan_fitur', 'billing', 'lainnya') DEFAULT 'gangguan_sistem',
    `prioritas` ENUM('rendah', 'sedang', 'tinggi', 'kritis') DEFAULT 'sedang',
    `judul` VARCHAR(200) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `lampiran_json` TEXT NULL,
    `status` ENUM('terbuka', 'diproses', 'menunggu_klien', 'selesai', 'ditutup') DEFAULT 'terbuka',
    `pelapor_nama` VARCHAR(100) NOT NULL,
    `sumber_laporan` ENUM('portal', 'whatsapp', 'telepon', 'email', 'internal') NOT NULL DEFAULT 'portal',
    `cakupan_biaya` ENUM('sla_gratis', 'garansi', 'berbayar') NOT NULL DEFAULT 'sla_gratis',
    `total_durasi_menit` INT UNSIGNED NOT NULL DEFAULT 0,
    `quotation_id` INT UNSIGNED NULL,
    `invoice_id` INT UNSIGNED NULL,
    `assigned_to` INT UNSIGNED NULL,
    `resolved_at` DATETIME NULL,
    `first_response_at` DATETIME NULL,
    `sla_response_due` DATETIME NULL,
    `sla_resolve_due` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ctickets_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ctickets_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
    INDEX `idx_ctickets_client` (`client_id`),
    INDEX `idx_ctickets_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `client_ticket_replies` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `ticket_id` INT UNSIGNED NOT NULL,
    `sender_type` ENUM('client', 'admin') NOT NULL DEFAULT 'client',
    `sender_name` VARCHAR(100) NOT NULL,
    `user_id` INT UNSIGNED NULL,
    `pesan` TEXT NOT NULL,
    `lampiran_json` TEXT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ctreplies_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `client_tickets` (`id`) ON DELETE CASCADE,
    INDEX `idx_ctreplies_ticket` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `client_ticket_logs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `ticket_id` INT UNSIGNED NOT NULL,
    `user_id` INT UNSIGNED NULL,
    `actor_name` VARCHAR(100) NOT NULL,
    `tipe_aktivitas` ENUM('investigasi', 'perbaikan', 'komunikasi', 'deploy', 'konversi', 'lainnya') NOT NULL DEFAULT 'investigasi',
    `durasi_menit` INT UNSIGNED NOT NULL DEFAULT 0,
    `is_billable` TINYINT(1) NOT NULL DEFAULT 0,
    `ringkasan` TEXT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ctlogs_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `client_tickets` (`id`) ON DELETE CASCADE,
    INDEX `idx_ctlogs_ticket` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Services (Katalog Layanan Standar)
CREATE TABLE IF NOT EXISTS `services` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `kode_layanan` VARCHAR(30) NOT NULL UNIQUE,
    `nama_layanan` VARCHAR(100) NOT NULL,
    `kategori` ENUM('hosting', 'domain', 'maintenance', 'development', 'konsultasi', 'lainnya') DEFAULT 'hosting',
    `deskripsi` TEXT NULL,
    `harga_standar` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `siklus_tagihan` ENUM('one_time', 'bulanan', 'triwulan', 'semester', 'tahunan') DEFAULT 'bulanan',
    `status` ENUM('aktif', 'nonaktif') DEFAULT 'aktif',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Invoices (Faktur Tagihan)
CREATE TABLE IF NOT EXISTS `invoices` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nomor_invoice` VARCHAR(50) NOT NULL UNIQUE,
    `client_id` INT UNSIGNED NOT NULL,
    `project_id` INT UNSIGNED NULL,
    `tanggal_invoice` DATE NOT NULL,
    `tanggal_jatuh_tempo` DATE NOT NULL,
    `subtotal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `diskon_tipe` ENUM('nominal', 'persen') DEFAULT 'nominal',
    `diskon_nilai` DECIMAL(15,2) DEFAULT 0.00,
    `pajak_persen` DECIMAL(5,2) DEFAULT 0.00,
    `pajak_nominal` DECIMAL(15,2) DEFAULT 0.00,
    `total_tagihan` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_dibayar` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `sisa_tagihan` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `status` ENUM('draft', 'dikirim', 'sebagian', 'lunas', 'jatuh_tempo', 'batal') DEFAULT 'draft',
    `catatan_klien` TEXT NULL,
    `catatan_internal` TEXT NULL,
    `email_terkirim_at` DATETIME NULL,
    `created_by` INT UNSIGNED NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_invoices_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_invoices_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_invoices_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
    INDEX `idx_invoices_status` (`status`),
    INDEX `idx_invoices_jatuh_tempo` (`tanggal_jatuh_tempo`),
    INDEX `idx_invoices_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Invoice Items
CREATE TABLE IF NOT EXISTS `invoice_items` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `invoice_id` INT UNSIGNED NOT NULL,
    `service_id` INT UNSIGNED NULL,
    `deskripsi` VARCHAR(255) NOT NULL,
    `kuantitas` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    `satuan` VARCHAR(30) DEFAULT 'unit',
    `harga_satuan` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_harga` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `urutan` INT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_items_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_items_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Payment Methods (Rekening Bank Resmi Perusahaan)
CREATE TABLE IF NOT EXISTS `payment_methods` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nama_metode` VARCHAR(50) NOT NULL,
    `nama_bank` VARCHAR(60) NOT NULL DEFAULT '',
    `nomor_rekening` VARCHAR(50) NULL,
    `atas_nama` VARCHAR(100) NULL,
    `cabang` VARCHAR(100) NULL,
    `kode_bank` VARCHAR(20) NULL,
    `swift_code` VARCHAR(20) NULL,
    `tipe` ENUM('bank', 'ewallet', 'tunai') DEFAULT 'bank',
    `is_default` TINYINT(1) DEFAULT 0,
    `instruksi` TEXT NULL,
    `status` ENUM('aktif', 'nonaktif') DEFAULT 'aktif',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Payments
CREATE TABLE IF NOT EXISTS `payments` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nomor_pembayaran` VARCHAR(50) NOT NULL UNIQUE,
    `invoice_id` INT UNSIGNED NOT NULL,
    `payment_method_id` INT UNSIGNED NOT NULL,
    `tanggal_bayar` DATE NOT NULL,
    `jumlah_bayar` DECIMAL(15,2) NOT NULL,
    `nomor_referensi` VARCHAR(100) NULL,
    `bukti_transfer` VARCHAR(255) NULL,
    `catatan` TEXT NULL,
    `verified_by` INT UNSIGNED NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_payments_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_payments_method` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_payments_user` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
    INDEX `idx_payments_tanggal` (`tanggal_bayar`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Recurring Invoices
CREATE TABLE IF NOT EXISTS `recurring_invoices` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `client_id` INT UNSIGNED NOT NULL,
    `project_id` INT UNSIGNED NULL,
    `judul` VARCHAR(150) NOT NULL,
    `frekuensi` ENUM('bulanan', 'triwulan', 'semester', 'tahunan') NOT NULL DEFAULT 'bulanan',
    `hari_tagihan` TINYINT NOT NULL DEFAULT 1,
    `tanggal_mulai` DATE NOT NULL,
    `tanggal_berakhir` DATE NULL,
    `terakhir_dibuat_at` DATE NULL,
    `berikutnya_dibuat_at` DATE NOT NULL,
    `data_items_json` JSON NOT NULL,
    `status` ENUM('aktif', 'jeda', 'berakhir') DEFAULT 'aktif',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_recur_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
    INDEX `idx_recur_next` (`berikutnya_dibuat_at`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Audit Logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `aksi` VARCHAR(50) NOT NULL,
    `tabel` VARCHAR(50) NOT NULL,
    `record_id` INT UNSIGNED NULL,
    `data_lama` JSON NULL,
    `data_baru` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_audit_tabel` (`tabel`, `record_id`),
    INDEX `idx_audit_waktu` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. App Settings
CREATE TABLE IF NOT EXISTS `app_settings` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `kunci` VARCHAR(50) NOT NULL UNIQUE,
    `nilai` TEXT NULL,
    `grup` VARCHAR(30) DEFAULT 'general',
    `keterangan` VARCHAR(255) NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Notifications
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `judul` VARCHAR(150) NOT NULL,
    `pesan` TEXT NOT NULL,
    `tautan` VARCHAR(255) NULL,
    `tipe` ENUM('info', 'sukses', 'peringatan', 'bahaya') DEFAULT 'info',
    `is_read` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_notif_unread` (`is_read`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- SEED DATA AWAL
-- ============================================================

-- Roles
INSERT INTO `roles` (`id`, `name`, `label`, `description`) VALUES
(1, 'super_admin', 'Super Administrator', 'Akses penuh ke seluruh modul dan konfigurasi sistem'),
(2, 'billing_staff', 'Staf Keuangan & Billing', 'Mengelola pelanggan, invoice, pembayaran, dan laporan keuangan'),
(3, 'project_manager', 'Manajer Proyek', 'Mengelola proyek klien dan sinkronisasi dengan app-git'),
(4, 'viewer', 'Pengamat (Viewer)', 'Akses hanya-lihat pada dashboard dan laporan')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Permissions
INSERT INTO `permissions` (`kode`, `nama`, `kategori`, `keterangan`) VALUES
('dashboard.view', 'Melihat Dashboard', 'Dashboard', 'Melihat statistik dan ringkasan keuangan'),
('client.view', 'Melihat Data Pelanggan', 'Pelanggan', 'Melihat daftar dan profil pelanggan'),
('client.create', 'Menambah Pelanggan', 'Pelanggan', 'Menambah data pelanggan baru'),
('client.edit', 'Mengubah Pelanggan', 'Pelanggan', 'Memperbarui informasi pelanggan'),
('client.delete', 'Menghapus Pelanggan', 'Pelanggan', 'Menghapus data pelanggan'),
('project.view', 'Melihat Proyek', 'Proyek', 'Melihat daftar proyek klien'),
('project.create', 'Menambah Proyek', 'Proyek', 'Membuat entri proyek baru'),
('project.edit', 'Mengubah Proyek', 'Proyek', 'Memperbarui data dan konfigurasi git proyek'),
('project.git_sync', 'Sinkronisasi Git', 'Proyek', 'Memeriksa status deployment dari app-git'),
('service.manage', 'Kelola Layanan', 'Layanan', 'Kelola katalog dan tarif standar layanan'),
('invoice.view', 'Melihat Tagihan', 'Tagihan', 'Melihat daftar faktur tagihan'),
('invoice.create', 'Membuat Tagihan', 'Tagihan', 'Membuat tagihan/faktur baru'),
('invoice.edit', 'Mengubah Tagihan', 'Tagihan', 'Mengubah draf tagihan'),
('invoice.delete', 'Membatalkan Tagihan', 'Tagihan', 'Membatalkan atau menghapus tagihan'),
('invoice.send', 'Kirim Tagihan Email', 'Tagihan', 'Mengirim tagihan resmi ke email klien'),
('payment.view', 'Melihat Pembayaran', 'Pembayaran', 'Melihat riwayat transaksi pembayaran'),
('payment.create', 'Mencatat Pembayaran', 'Pembayaran', 'Mencatat pembayaran tagihan masuk'),
('recurring.manage', 'Kelola Tagihan Berulang', 'Tagihan Berulang', 'Kelola template faktur berkala otomatis'),
('report.view', 'Melihat Laporan', 'Laporan', 'Mengakses laporan piutang, omset, dan kartu piutang'),
('user.manage', 'Manajemen Pengguna', 'Sistem', 'Kelola akun staf dan perannya'),
('role.manage', 'Manajemen Hak Akses', 'Sistem', 'Mengatur izin pada setiap peran'),
('settings.edit', 'Pengaturan Sistem', 'Sistem', 'Mengubah profil perusahaan, SMTP, dan konfigurasi'),
('bank.view', 'Melihat Rekening Bank', 'Master Data', 'Melihat daftar rekening bank resmi perusahaan'),
('bank.manage', 'Mengelola Rekening Bank', 'Master Data', 'Menambah, mengubah, dan menghapus rekening bank resmi perusahaan'),
('database.backup', 'Cadangkan Database', 'Sistem', 'Membuat dan mengunduh file cadangan database MySQL'),
('database.restore', 'Pulihkan Database', 'Sistem', 'Memulihkan basis data dari file cadangan SQL'),
('asset.view', 'Melihat Aset & Cloud', 'Operasional', 'Melihat daftar aset server, cloud, dan lisensi internal'),
('asset.create', 'Menambah Aset & Cloud', 'Operasional', 'Mencatat aset server atau langganan cloud pihak luar'),
('asset.edit', 'Mengubah Aset & Cloud', 'Operasional', 'Memperbarui rincian, tarif, atau jadwal perpanjangan aset'),
('asset.delete', 'Menghapus Aset & Cloud', 'Operasional', 'Menghapus data pencatatan aset server/cloud'),
('audit.view', 'Melihat Jejak Audit', 'Sistem', 'Melihat riwayat aktivitas pengguna')
ON DUPLICATE KEY UPDATE `nama`=VALUES(`nama`);

-- Role Permissions untuk billing_staff (Role ID 2)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 2, `id` FROM `permissions` WHERE `kode` IN (
    'dashboard.view', 'client.view', 'client.create', 'client.edit',
    'project.view', 'service.manage', 'invoice.view', 'invoice.create',
    'invoice.edit', 'invoice.send', 'payment.view', 'payment.create',
    'bank.view', 'bank.manage', 'asset.view', 'asset.create', 'asset.edit', 'recurring.manage', 'report.view'
);

-- Default Users (password: admin123, finance123, pm123)
INSERT INTO `users` (`id`, `role_id`, `username`, `password`, `nama_lengkap`, `email`, `telepon`, `status`) VALUES
(1, 1, 'admin', '$2y$10$nUaequsUvQTGtWO4HMCo7.BMJkkQy7.kX53B0lFAEDO.bmtZzqKVq', 'Administrator CRUDWorks', 'admin@crudworks.com', '081234567890', 'aktif'),
(2, 2, 'finance', '$2y$10$.ut2UXJBz8YHPq97hV0HMOk8mUhrcYwvqaQqQcdwW9yqmING2CBT.', 'Staf Keuangan', 'finance@crudworks.com', '081234567891', 'aktif'),
(3, 3, 'pm', '$2y$10$u0feYH9wGTv0PvMBIXYu.eehF91Z3E8jMd23mSGjyhMs598lzWlfa', 'Project Manager', 'pm@crudworks.com', '081234567892', 'aktif')
ON DUPLICATE KEY UPDATE `username`=VALUES(`username`);

-- Default Payment Methods (Rekening Bank Resmi)
INSERT INTO `payment_methods` (`id`, `nama_metode`, `nama_bank`, `nomor_rekening`, `atas_nama`, `cabang`, `kode_bank`, `swift_code`, `tipe`, `is_default`, `instruksi`, `status`) VALUES
(1, 'Bank Central Asia (BCA)', 'BCA', '8720192831', 'PT CRUDWorks Media Tama', 'KCU Sudirman Jakarta', '014', 'CENAIDJA', 'bank', 1, 'Transfer via ATM/M-Banking dengan mencantumkan nomor invoice pada berita transfer.', 'aktif'),
(2, 'Bank Mandiri', 'Bank Mandiri', '1370019283741', 'PT CRUDWorks Media Tama', 'KCP Thamrin Jakarta', '008', 'BMRIIDJA', 'bank', 0, 'Transfer antardepartemen atau RTGS.', 'aktif'),
(3, 'Bank BNI', 'BNI', '0238192849', 'PT CRUDWorks Media Tama', 'KCU Jakarta Pusat', '009', 'BNINIDJA', 'bank', 0, 'Transfer antardaerah atau melalui virtual account BNI.', 'aktif'),
(4, 'Tunai / Kas Langsung', 'Kas Tunai', '-', 'Kasir Finansial', NULL, NULL, NULL, 'tunai', 0, 'Pembayaran langsung di kantor pusat CRUDWorks.', 'aktif')
ON DUPLICATE KEY UPDATE `nama_metode`=VALUES(`nama_metode`), `nomor_rekening`=VALUES(`nomor_rekening`);

-- Default Services
INSERT INTO `services` (`id`, `kode_layanan`, `nama_layanan`, `kategori`, `deskripsi`, `harga_standar`, `siklus_tagihan`, `status`) VALUES
(1, 'SRV-HOST-PRO', 'Cloud VPS Hosting 4GB Pro', 'hosting', 'Cloud server NVMe 2 vCPU 4GB RAM + Free SSL & Daily Backup', 450000.00, 'bulanan', 'aktif'),
(2, 'SRV-DOM-ID', 'Pendaftaran Domain .co.id / .id', 'domain', 'Sewa domain resmi PANDI periode 1 tahun', 275000.00, 'tahunan', 'aktif'),
(3, 'SRV-MAINT-STD', 'SLA Maintenance & Support Bulanan', 'maintenance', 'Monitoring uptime, security patch OS, dan perbaikan minor bug 10 jam/bulan', 1500000.00, 'bulanan', 'aktif'),
(4, 'SRV-DEV-SPRINT', 'Dedicated Custom Dev Sprint (2 Minggu)', 'development', 'Pengembangan modul fitur custom aplikasi berbasis PHP & MySQL', 7500000.00, 'one_time', 'aktif')
ON DUPLICATE KEY UPDATE `kode_layanan`=VALUES(`kode_layanan`);

-- Default App Settings
INSERT INTO `app_settings` (`kunci`, `nilai`, `grup`, `keterangan`) VALUES
('company_name', 'CRUDWorks Solution', 'company', 'Nama resmi entitas instansi'),
('company_tagline', 'Enterprise Web Application & DevOps Deployment', 'company', 'Tagline resmi'),
('company_email', 'billing@crudworks.com', 'company', 'Email resmi bagian keuangan'),
('company_phone', '(021) 555-0199', 'company', 'Nomor telepon kantor'),
('company_address', 'Jl. Rasuna Said Kav. B4, Jakarta Selatan, 12920', 'company', 'Alamat kantor resmi'),
('invoice_due_days', '14', 'invoice', 'Jangka waktu jatuh tempo standar dalam hari'),
('invoice_tax_percent', '11.00', 'invoice', 'Tarif standar PPN dalam persen'),
('invoice_footer_notes', 'Terima kasih atas kerja sama Anda. Pembayaran harap ditransfer sebelum tanggal jatuh tempo.', 'invoice', 'Catatan formal pada lembar invoice'),
('smtp_host', 'smtp.gmail.com', 'mail', 'Host server SMTP pengirim'),
('smtp_port', '587', 'mail', 'Port SMTP (TLS: 587, SSL: 465)'),
('smtp_user', 'notification@crudworks.com', 'mail', 'User autentikasi SMTP'),
('smtp_pass', '', 'mail', 'Kata sandi aplikasi SMTP')
ON DUPLICATE KEY UPDATE `kunci`=VALUES(`kunci`);

-- Sample Initial Client (Contoh Klien Perdana)
INSERT INTO `clients` (`id`, `kode_klien`, `nama_perusahaan`, `penanggung_jawab`, `email`, `telepon`, `alamat`, `kota`, `status`) VALUES
(1, 'CLI-0001', 'Koperasi Sandya Raharja', 'Bpk. Hendra Gunawan', 'pengurus@koperasisandya.id', '081398765432', 'Jl. Merdeka No. 45', 'Bandung', 'aktif'),
(2, 'CLI-0002', 'PT Borneo Niaga Logistik', 'Ibu Ratna Dewi', 'finance@borneoniaga.com', '081255566778', 'Kawasan Industri Kariangau Blok C-2', 'Balikpapan', 'aktif'),
(3, 'CLI-0003', 'PT Cahaya Abadi Solusindo', 'Bpk. Dimas Pratama', 'dimas@cahayaabadi.co.id', '081299887766', 'Jl. Gatot Subroto No. 12', 'Jakarta Selatan', 'prospek')
ON DUPLICATE KEY UPDATE `kode_klien`=VALUES(`kode_klien`);

-- Sample Projects (Terhubung ke folder www/app-koperasi dan www/app-git)
INSERT INTO `projects` (`id`, `client_id`, `kode_project`, `nama_project`, `deskripsi`, `git_repo_url`, `git_branch`, `deploy_path`, `app_url`, `last_deploy_status`, `nilai_project`, `status`) VALUES
(1, 1, 'PRJ-KOP-01', 'Sistem Informasi Koperasi Simpan Pinjam', 'Aplikasi keuangan simpan pinjam dan portal anggota PWA', 'https://github.com/crudworks/app-koperasi.git', 'main', 'd:/laragon/www/app-koperasi', 'http://app-koperasi.test', 'success', 35000000.00, 'aktif'),
(2, 2, 'PRJ-BNL-01', 'Logistics Tracking & Fleet Manager', 'Sistem tracking armada dan ekspedisi kargo', 'https://github.com/borneoniaga/fleet-app.git', 'main', 'd:/laragon/www/fleet-app', 'http://fleet.borneoniaga.com', 'idle', 50000000.00, 'aktif')
ON DUPLICATE KEY UPDATE `kode_project`=VALUES(`kode_project`);

-- Sample Invoices (1 Lunas, 1 Sebagian, 1 Jatuh Tempo)
INSERT INTO `invoices` (`id`, `nomor_invoice`, `client_id`, `project_id`, `tanggal_invoice`, `tanggal_jatuh_tempo`, `subtotal`, `diskon_nilai`, `pajak_persen`, `pajak_nominal`, `total_tagihan`, `total_dibayar`, `sisa_tagihan`, `status`, `created_by`) VALUES
(1, 'INV-202610-0001', 1, 1, '2026-10-01', '2026-10-15', 1950000.00, 0.00, 11.00, 214500.00, 2164500.00, 2164500.00, 0.00, 'lunas', 1),
(2, 'INV-202611-0001', 1, 1, '2026-11-01', '2026-11-15', 1950000.00, 0.00, 11.00, 214500.00, 2164500.00, 1000000.00, 1164500.00, 'jatuh_tempo', 1),
(3, 'INV-202611-0002', 2, 2, '2026-11-10', '2026-11-24', 7500000.00, 500000.00, 11.00, 770000.00, 7770000.00, 0.00, 7770000.00, 'dikirim', 1)
ON DUPLICATE KEY UPDATE `nomor_invoice`=VALUES(`nomor_invoice`);

-- Sample Invoice Items
INSERT INTO `invoice_items` (`invoice_id`, `service_id`, `deskripsi`, `kuantitas`, `harga_satuan`, `total_harga`) VALUES
(1, 1, 'Cloud VPS Hosting 4GB Pro - Periode Okt 2026', 1.00, 450000.00, 450000.00),
(1, 3, 'SLA Maintenance & Support Bulanan - Periode Okt 2026', 1.00, 1500000.00, 1500000.00),
(2, 1, 'Cloud VPS Hosting 4GB Pro - Periode Nov 2026', 1.00, 450000.00, 450000.00),
(2, 3, 'SLA Maintenance & Support Bulanan - Periode Nov 2026', 1.00, 1500000.00, 1500000.00),
(3, 4, 'Dedicated Custom Dev Sprint: Integrasi GPS Fleet', 1.00, 7500000.00, 7500000.00)
ON DUPLICATE KEY UPDATE `deskripsi`=VALUES(`deskripsi`);

-- Sample Payments
INSERT INTO `payments` (`id`, `nomor_pembayaran`, `invoice_id`, `payment_method_id`, `tanggal_bayar`, `jumlah_bayar`, `nomor_referensi`, `verified_by`) VALUES
(1, 'PAY-202610-0001', 1, 1, '2026-10-10', 2164500.00, 'BCA-TRX-091283', 1),
(2, 'PAY-202611-0001', 2, 1, '2026-11-05', 1000000.00, 'BCA-TRX-104928', 1)
ON DUPLICATE KEY UPDATE `nomor_pembayaran`=VALUES(`nomor_pembayaran`);


-- ========================================================
-- MODUL ERP EKSTENSI (OPEX, QUOTATIONS, SLA, TIMESHEETS)
-- ========================================================

-- Kategori Beban & Pengeluaran
CREATE TABLE IF NOT EXISTS `expense_categories` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `kode` VARCHAR(30) NOT NULL UNIQUE,
    `nama_kategori` VARCHAR(100) NOT NULL,
    `deskripsi` VARCHAR(255) NULL,
    `warna` VARCHAR(20) DEFAULT '#64748b',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `expense_categories` (`id`, `kode`, `nama_kategori`, `deskripsi`, `warna`) VALUES
(1, 'SERVER_CLOUD', 'Server & Cloud VPS', 'AWS, DigitalOcean, Google Cloud, IDCloudHost', '#3b82f6'),
(2, 'DOMAIN_SSL', 'Domain & Sertifikat SSL', 'Perpanjangan nama domain dan SSL TLS resmi', '#10b981'),
(3, 'LISENSI_SOFTWARE', 'Lisensi Software & SaaS', 'Langganan JetBrains, GitHub Enterprise, Figma, Slack', '#8b5cf6'),
(4, 'FREELANCE_VENDOR', 'Subkontraktor & Fee Freelance', 'Pembayaran pihak ketiga untuk pengerjaan modul khusus', '#f59e0b'),
(5, 'OPERASIONAL_KANTOR', 'Operasional & Utilitas Kantor', 'Internet kantor, listrik, perlengkapan kerja tim', '#64748b'),
(6, 'BEBAN_LAINNYA', 'Beban Operasional Lainnya', 'Biaya administrasi bank dan pengeluaran rupa-rupa', '#94a3b8')
ON DUPLICATE KEY UPDATE `nama_kategori`=VALUES(`nama_kategori`);

-- Transaksi Pengeluaran Operasional
CREATE TABLE IF NOT EXISTS `expenses` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nomor_pengeluaran` VARCHAR(50) NOT NULL UNIQUE,
    `tanggal` DATE NOT NULL,
    `expense_category_id` INT UNSIGNED NOT NULL,
    `project_id` INT UNSIGNED NULL,
    `payment_method_id` INT UNSIGNED NULL,
    `judul` VARCHAR(200) NOT NULL,
    `jumlah` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `penerima` VARCHAR(150) NULL,
    `deskripsi` TEXT NULL,
    `bukti_lampiran` VARCHAR(255) NULL,
    `status` ENUM('lunas', 'menunggu_persetujuan', 'dibatalkan') DEFAULT 'lunas',
    `created_by` INT UNSIGNED NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_exp_category` (`expense_category_id`),
    INDEX `idx_exp_project` (`project_id`),
    INDEX `idx_exp_tanggal` (`tanggal`),
    FOREIGN KEY (`expense_category_id`) REFERENCES `expense_categories` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Surat Penawaran Harga (Quotations)
CREATE TABLE IF NOT EXISTS `quotations` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nomor_penawaran` VARCHAR(50) NOT NULL UNIQUE,
    `tanggal_penawaran` DATE NOT NULL,
    `berlaku_hingga` DATE NOT NULL,
    `client_id` INT UNSIGNED NOT NULL,
    `project_id` INT UNSIGNED NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `diskon_tipe` ENUM('persen', 'nominal') DEFAULT 'nominal',
    `diskon_nilai` DECIMAL(15, 2) DEFAULT 0.00,
    `pajak_persen` DECIMAL(5, 2) DEFAULT 11.00,
    `pajak_nominal` DECIMAL(15, 2) DEFAULT 0.00,
    `total_penawaran` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `status` ENUM('draft', 'terkirim', 'disetujui', 'ditolak', 'dikonversi') DEFAULT 'draft',
    `catatan_klien` TEXT NULL,
    `salam_pembuka` TEXT NULL,
    `ruang_lingkup_fitur` TEXT NULL,
    `timeline_pengerjaan` TEXT NULL,
    `pasal_hak_kewajiban` TEXT NULL,
    `syarat_ketentuan` TEXT NULL,
    `converted_invoice_id` INT UNSIGNED NULL,
    `created_by` INT UNSIGNED NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_quo_client` (`client_id`),
    INDEX `idx_quo_project` (`project_id`),
    INDEX `idx_quo_status` (`status`),
    FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quotation_items` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `quotation_id` INT UNSIGNED NOT NULL,
    `service_id` INT UNSIGNED NULL,
    `deskripsi` TEXT NOT NULL,
    `kuantitas` DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    `satuan` VARCHAR(20) DEFAULT 'paket',
    `harga_satuan` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `total_harga` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `urutan` INT DEFAULT 0,
    FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pemantauan SLA & Aset (Domain, Hosting, SSL)
CREATE TABLE IF NOT EXISTS `maintenance_sla` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `client_id` INT UNSIGNED NOT NULL,
    `project_id` INT UNSIGNED NULL,
    `jenis` ENUM('domain', 'hosting_vps', 'ssl_certificate', 'maintenance_sla', 'lisensi') NOT NULL,
    `nama_aset` VARCHAR(150) NOT NULL,
    `provider` VARCHAR(100) NULL,
    `domain_name` VARCHAR(150) NULL,
    `ip_address` VARCHAR(50) NULL,
    `biaya_perpanjangan` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `siklus` ENUM('bulanan', 'triwulan', 'semesteran', 'tahunan', 'dua_tahunan') DEFAULT 'tahunan',
    `tanggal_mulai` DATE NOT NULL,
    `tanggal_berakhir` DATE NOT NULL,
    `auto_renew` TINYINT(1) DEFAULT 1,
    `status` ENUM('aktif', 'segera_kadaluwarsa', 'kadaluwarsa', 'dihentikan') DEFAULT 'aktif',
    `catatan` TEXT NULL,
    `last_check_at` DATETIME NULL,
    `http_status_code` INT NULL,
    `response_time_ms` INT NULL,
    `uptime_status` ENUM('unknown', 'online', 'warning', 'down') DEFAULT 'unknown',
    `ssl_valid_until` DATE NULL,
    `ssl_days_left` INT NULL,
    `ssl_issuer` VARCHAR(150) NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_sla_client` (`client_id`),
    INDEX `idx_sla_project` (`project_id`),
    INDEX `idx_sla_berakhir` (`tanggal_berakhir`),
    FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Timesheets (Pencatatan Jam Kerja Proyek)
CREATE TABLE IF NOT EXISTS `timesheets` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `project_id` INT UNSIGNED NOT NULL,
    `client_id` INT UNSIGNED NOT NULL,
    `tanggal` DATE NOT NULL,
    `jam_mulai` TIME NULL,
    `jam_selesai` TIME NULL,
    `durasi_menit` INT NOT NULL DEFAULT 0,
    `deskripsi_tugas` TEXT NOT NULL,
    `billing_rate_per_jam` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `is_billable` TINYINT(1) DEFAULT 1,
    `invoice_id` INT UNSIGNED NULL,
    `status` ENUM('draft', 'disetujui', 'sudah_ditagih') DEFAULT 'draft',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_ts_user` (`user_id`),
    INDEX `idx_ts_project` (`project_id`),
    INDEX `idx_ts_client` (`client_id`),
    INDEX `idx_ts_tanggal` (`tanggal`),
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log Cadangan Database (Backup & Restore)
CREATE TABLE IF NOT EXISTS `backup_logs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NULL,
    `filename` VARCHAR(255) NOT NULL,
    `filesize` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `tipe` ENUM('full', 'structure_only') NOT NULL DEFAULT 'full',
    `format` ENUM('sql', 'sql.gz') NOT NULL DEFAULT 'sql',
    `status` ENUM('success', 'failed') NOT NULL DEFAULT 'success',
    `catatan` VARCHAR(255) NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_backup_created` (`created_at`),
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Aset Internal & Langganan Cloud Pihak Luar (Company Assets & Subscriptions)
CREATE TABLE IF NOT EXISTS `company_assets` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nama_aset` VARCHAR(150) NOT NULL,
    `kategori` ENUM('cloud_vps', 'database_storage', 'domain_dns', 'saas_license', 'security_ssl', 'email_smtp', 'network_cdn', 'hardware_it', 'lainnya') NOT NULL DEFAULT 'cloud_vps',
    `provider` VARCHAR(100) NOT NULL,
    `identifier` VARCHAR(150) NULL,
    `region` VARCHAR(80) NULL,
    `spesifikasi` TEXT NULL,
    `url_portal` VARCHAR(255) NULL,
    `akun_login` VARCHAR(150) NULL,
    `biaya` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `mata_uang` VARCHAR(5) NOT NULL DEFAULT 'IDR',
    `kurs_estimasi` DECIMAL(12, 2) NOT NULL DEFAULT 1.00,
    `biaya_idr` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `siklus` ENUM('bulanan', 'triwulan', 'semesteran', 'tahunan', 'dua_tahunan', 'one_time') NOT NULL DEFAULT 'bulanan',
    `metode_bayar` VARCHAR(100) NULL,
    `tanggal_mulai` DATE NOT NULL,
    `tanggal_berakhir` DATE NOT NULL,
    `auto_renew` TINYINT(1) NOT NULL DEFAULT 1,
    `status` ENUM('aktif', 'segera_kadaluwarsa', 'kadaluwarsa', 'ditangguhkan', 'dihentikan') NOT NULL DEFAULT 'aktif',
    `pic_user_id` INT UNSIGNED NULL,
    `project_id` INT UNSIGNED NULL,
    `catatan` TEXT NULL,
    `last_check_at` DATETIME NULL,
    `http_status_code` INT NULL,
    `response_time_ms` INT NULL,
    `uptime_status` ENUM('unknown', 'online', 'warning', 'down') DEFAULT 'unknown',
    `ssl_valid_until` DATE NULL,
    `ssl_days_left` INT NULL,
    `ssl_issuer` VARCHAR(150) NULL,
    `last_expense_id` INT UNSIGNED NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_asset_kategori` (`kategori`),
    INDEX `idx_asset_status` (`status`),
    INDEX `idx_asset_berakhir` (`tanggal_berakhir`),
    INDEX `idx_asset_pic` (`pic_user_id`),
    INDEX `idx_asset_project` (`project_id`),
    FOREIGN KEY (`pic_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Log Pemantau Uptime & Status SSL
CREATE TABLE IF NOT EXISTS `uptime_health_logs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `target_type` ENUM('sla', 'company_asset') NOT NULL,
    `target_id` INT UNSIGNED NOT NULL,
    `url` VARCHAR(255) NOT NULL,
    `http_code` INT NULL,
    `response_time_ms` INT NULL,
    `uptime_status` ENUM('online', 'warning', 'down') NOT NULL,
    `ssl_valid_until` DATE NULL,
    `ssl_days_left` INT NULL,
    `ssl_issuer` VARCHAR(150) NULL,
    `error_message` VARCHAR(255) NULL,
    `checked_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_uhl_target` (`target_type`, `target_id`),
    INDEX `idx_uhl_checked` (`checked_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Brankas Kredensial Klien Terenkripsi (Secret Vault)
CREATE TABLE IF NOT EXISTS `client_credentials` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `client_id` INT UNSIGNED NOT NULL,
    `project_id` INT UNSIGNED NULL,
    `judul` VARCHAR(150) NOT NULL,
    `tipe` ENUM('ssh_vps', 'cpanel_hosting', 'database', 'wp_admin', 'cloudflare_dns', 'api_key', 'git_repo', 'lainnya') NOT NULL DEFAULT 'ssh_vps',
    `host_url` VARCHAR(255) NULL,
    `port` VARCHAR(10) NULL,
    `username` VARCHAR(150) NULL,
    `encrypted_secret` TEXT NOT NULL,
    `catatan` TEXT NULL,
    `show_in_portal` TINYINT(1) NOT NULL DEFAULT 0,
    `created_by` INT UNSIGNED NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_cc_client` (`client_id`),
    INDEX `idx_cc_project` (`project_id`),
    CONSTRAINT `fk_cc_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cc_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_cc_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Riwayat Follow-Up & Catatan Interaksi Prospek CRM
CREATE TABLE IF NOT EXISTS `client_followups` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `client_id` INT UNSIGNED NOT NULL,
    `user_id` INT UNSIGNED NOT NULL,
    `tipe` ENUM('whatsapp', 'telepon', 'email', 'meeting_online', 'meeting_offline', 'catatan') NOT NULL DEFAULT 'whatsapp',
    `tanggal` DATETIME NOT NULL,
    `catatan` TEXT NOT NULL,
    `next_followup_date` DATE NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_cf_client` (`client_id`),
    INDEX `idx_cf_user` (`user_id`),
    CONSTRAINT `fk_cf_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cf_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- ============================================================
-- 17. Kontrak Kerja / SPK Digital, Deposit Klien & Knowledge Base
-- ============================================================

CREATE TABLE IF NOT EXISTS `contracts` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nomor_kontrak` VARCHAR(50) NOT NULL UNIQUE,
    `public_token` VARCHAR(64) NOT NULL UNIQUE,
    `client_id` INT UNSIGNED NOT NULL,
    `quotation_id` INT UNSIGNED NULL,
    `project_id` INT UNSIGNED NULL,
    `judul_kontrak` VARCHAR(200) NOT NULL,
    `pihak_pertama_nama` VARCHAR(150) NULL,
    `pihak_pertama_jabatan` VARCHAR(150) NULL,
    `tanggal_mulai` DATE NULL,
    `tanggal_selesai` DATE NULL,
    `nilai_kontrak` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `garansi_hari` INT NOT NULL DEFAULT 30,
    `isi_pasal` LONGTEXT NOT NULL,
    `status` ENUM('draft','terkirim','ditandatangani','dibatalkan') NOT NULL DEFAULT 'draft',
    `signed_by_name` VARCHAR(150) NULL,
    `signed_by_position` VARCHAR(150) NULL,
    `signature_data` LONGTEXT NULL,
    `signed_at` DATETIME NULL,
    `signed_ip` VARCHAR(45) NULL,
    `created_by` INT UNSIGNED NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_contracts_client` (`client_id`),
    INDEX `idx_contracts_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `client_deposit_logs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `client_id` INT UNSIGNED NOT NULL,
    `tipe` ENUM('topup','potong','refund') NOT NULL DEFAULT 'topup',
    `nominal` DECIMAL(15,2) NOT NULL,
    `saldo_setelah` DECIMAL(15,2) NOT NULL,
    `invoice_id` INT UNSIGNED NULL,
    `catatan` VARCHAR(255) NULL,
    `created_by` INT UNSIGNED NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_dep_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `knowledge_base` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `client_id` INT UNSIGNED NULL,
    `project_id` INT UNSIGNED NULL,
    `kategori` ENUM('panduan','faq','sop','video') NOT NULL DEFAULT 'panduan',
    `judul` VARCHAR(200) NOT NULL,
    `konten` LONGTEXT NOT NULL,
    `is_published` TINYINT(1) NOT NULL DEFAULT 1,
    `created_by` INT UNSIGNED NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_kb_client` (`client_id`),
    INDEX `idx_kb_pub` (`is_published`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Tabel Adendum / Change Request Proyek
CREATE TABLE IF NOT EXISTS `project_change_requests` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `project_id` INT UNSIGNED NOT NULL,
    `nomor_adendum` VARCHAR(50) NOT NULL,
    `judul` VARCHAR(200) NOT NULL,
    `deskripsi` TEXT NULL,
    `biaya` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `estimasi_hari` INT NOT NULL DEFAULT 0,
    `status` ENUM('draft', 'disetujui', 'dikerjakan', 'selesai', 'ditolak') NOT NULL DEFAULT 'draft',
    `invoice_id` INT UNSIGNED NULL,
    `created_by` INT UNSIGNED NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_pcr_project` (`project_id`),
    INDEX `idx_pcr_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel Manajemen Sesi Aktif Pengguna
CREATE TABLE IF NOT EXISTS `user_sessions` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `session_id` VARCHAR(128) NOT NULL UNIQUE,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    `is_revoked` TINYINT(1) NOT NULL DEFAULT 0,
    `last_activity` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_us_user` (`user_id`),
    INDEX `idx_us_revoked` (`is_revoked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transaksi Payment Gateway Online (Midtrans / Xendit / QRIS / Sandbox)
CREATE TABLE IF NOT EXISTS `payment_gateway_transactions` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `order_id` VARCHAR(64) NOT NULL UNIQUE,
    `invoice_id` INT UNSIGNED NOT NULL,
    `provider` VARCHAR(32) NOT NULL DEFAULT 'sandbox',
    `channel` VARCHAR(32) NOT NULL DEFAULT 'qris',
    `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `status` ENUM('pending', 'paid', 'expired', 'failed') NOT NULL DEFAULT 'pending',
    `payment_url` VARCHAR(500) NULL,
    `qr_string` TEXT NULL,
    `va_number` VARCHAR(64) NULL,
    `raw_payload` TEXT NULL,
    `paid_at` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pgt_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
    INDEX `idx_pgt_invoice` (`invoice_id`),
    INDEX `idx_pgt_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mutasi Rekening Bank (Rekonsiliasi Bank)
CREATE TABLE IF NOT EXISTS `bank_mutations` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `payment_method_id` INT UNSIGNED NOT NULL,
    `tanggal_transaksi` DATE NOT NULL,
    `deskripsi` VARCHAR(255) NOT NULL,
    `referensi` VARCHAR(100) NULL,
    `tipe` ENUM('kredit', 'debit') NOT NULL DEFAULT 'kredit',
    `nominal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `saldo` DECIMAL(15,2) NULL,
    `matched_type` ENUM('invoice', 'expense', 'payment') NULL,
    `matched_id` INT UNSIGNED NULL,
    `status` ENUM('unmatched', 'matched', 'ignored') NOT NULL DEFAULT 'unmatched',
    `imported_by` INT UNSIGNED NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_bm_pm` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`) ON DELETE CASCADE,
    INDEX `idx_bm_pm_status` (`payment_method_id`, `status`),
    INDEX `idx_bm_tanggal` (`tanggal_transaksi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API Keys Eksternal
CREATE TABLE IF NOT EXISTS `api_keys` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nama` VARCHAR(100) NOT NULL,
    `key_prefix` VARCHAR(16) NOT NULL,
    `key_hash` VARCHAR(64) NOT NULL UNIQUE,
    `scopes` VARCHAR(255) NOT NULL DEFAULT 'read',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `last_used_at` DATETIME NULL,
    `created_by` INT UNSIGNED NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Webhook Keluar
CREATE TABLE IF NOT EXISTS `webhooks` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nama` VARCHAR(100) NOT NULL,
    `target_url` VARCHAR(500) NOT NULL,
    `secret` VARCHAR(128) NOT NULL,
    `events` VARCHAR(255) NOT NULL DEFAULT 'invoice.paid,ticket.created,project.updated',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log Pengiriman Webhook
CREATE TABLE IF NOT EXISTS `webhook_logs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `webhook_id` INT UNSIGNED NOT NULL,
    `event_name` VARCHAR(64) NOT NULL,
    `payload_json` TEXT NOT NULL,
    `response_code` INT NULL,
    `response_body` TEXT NULL,
    `status` ENUM('success', 'failed') NOT NULL DEFAULT 'failed',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_wl_webhook` FOREIGN KEY (`webhook_id`) REFERENCES `webhooks` (`id`) ON DELETE CASCADE,
    INDEX `idx_wl_webhook` (`webhook_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log Deployment GitOps Proyek
CREATE TABLE IF NOT EXISTS `project_deploy_logs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `project_id` INT UNSIGNED NOT NULL,
    `branch` VARCHAR(100) NULL,
    `commit_hash` VARCHAR(40) NULL,
    `commit_message` VARCHAR(255) NULL,
    `action_type` ENUM('sync', 'deploy') NOT NULL DEFAULT 'deploy',
    `status` ENUM('success', 'failed') NOT NULL DEFAULT 'success',
    `output_log` TEXT NULL,
    `triggered_by` INT UNSIGNED NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pdl_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
    INDEX `idx_pdl_project` (`project_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Log Pengiriman Email SMTP
CREATE TABLE IF NOT EXISTS `email_logs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `entity_type` VARCHAR(32) NOT NULL DEFAULT 'invoice',
    `entity_id` INT UNSIGNED NULL,
    `recipient_email` VARCHAR(150) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `status` ENUM('sent', 'failed') NOT NULL DEFAULT 'sent',
    `error_message` TEXT NULL,
    `sent_by` INT UNSIGNED NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_el_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Master Bagan Akun (Chart of Accounts / COA)
CREATE TABLE IF NOT EXISTS `chart_of_accounts` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `kode_akun` VARCHAR(20) NOT NULL UNIQUE,
    `nama_akun` VARCHAR(150) NOT NULL,
    `tipe_akun` ENUM('aset', 'kewajiban', 'ekuitas', 'pendapatan', 'beban') NOT NULL,
    `saldo_normal` ENUM('debit', 'kredit') NOT NULL,
    `is_system` TINYINT(1) NOT NULL DEFAULT 0,
    `status` ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
    `keterangan` VARCHAR(255) NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_coa_tipe` (`tipe_akun`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Header Jurnal Umum (Double-Entry)
CREATE TABLE IF NOT EXISTS `journal_entries` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nomor_jurnal` VARCHAR(40) NOT NULL UNIQUE,
    `tanggal` DATE NOT NULL,
    `deskripsi` VARCHAR(255) NOT NULL,
    `sumber_tipe` ENUM('manual', 'invoice', 'payment', 'expense', 'closing') NOT NULL DEFAULT 'manual',
    `sumber_id` INT UNSIGNED NULL,
    `total_debit` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_kredit` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `created_by` INT UNSIGNED NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_je_tanggal` (`tanggal`),
    INDEX `idx_je_sumber` (`sumber_tipe`, `sumber_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Detail Baris Jurnal Umum
CREATE TABLE IF NOT EXISTS `journal_items` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `journal_id` INT UNSIGNED NOT NULL,
    `coa_id` INT UNSIGNED NOT NULL,
    `debit` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `kredit` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `keterangan` VARCHAR(255) NULL,
    CONSTRAINT `fk_ji_journal` FOREIGN KEY (`journal_id`) REFERENCES `journal_entries` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ji_coa` FOREIGN KEY (`coa_id`) REFERENCES `chart_of_accounts` (`id`) ON DELETE RESTRICT,
    INDEX `idx_ji_coa` (`coa_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tutup Buku & Penguncian Periode Akuntansi
CREATE TABLE IF NOT EXISTS `accounting_periods` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `periode` VARCHAR(7) NOT NULL UNIQUE,
    `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    `closing_journal_id` INT UNSIGNED NULL,
    `closed_by` INT UNSIGNED NULL,
    `closed_at` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
