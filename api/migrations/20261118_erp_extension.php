<?php
require_once __DIR__ . '/../config/database.php';

$db = Database::getInstance();
$pdo = $db->getPdo();

echo "Starting ERP Extensions migration (Points 1 - 6)...\n";

// 1. Table expense_categories & expenses
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `expense_categories` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `kode` VARCHAR(30) NOT NULL UNIQUE,
        `nama_kategori` VARCHAR(100) NOT NULL,
        `deskripsi` VARCHAR(255) NULL,
        `warna` VARCHAR(20) DEFAULT '#64748b',
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Table expense_categories checked/created.\n";
} catch (\Throwable $e) {
    echo "expense_categories error: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `expenses` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Table expenses checked/created.\n";
} catch (\Throwable $e) {
    echo "expenses error: " . $e->getMessage() . "\n";
}

// Seed expense categories
$expCats = [
    ['SERVER_CLOUD', 'Server & Cloud VPS', 'AWS, DigitalOcean, Google Cloud, IDCloudHost', '#3b82f6'],
    ['DOMAIN_SSL', 'Domain & Sertifikat SSL', 'Perpanjangan nama domain dan SSL TLS resmi', '#10b981'],
    ['LISENSI_SOFTWARE', 'Lisensi Software & SaaS', 'Langganan JetBrains, GitHub Enterprise, Figma, Slack', '#8b5cf6'],
    ['FREELANCE_VENDOR', 'Subkontraktor & Fee Freelance', 'Pembayaran pihak ketiga untuk pengerjaan modul khusus', '#f59e0b'],
    ['OPERASIONAL_KANTOR', 'Operasional & Utilitas Kantor', 'Internet kantor, listrik, perlengkapan kerja tim', '#64748b'],
    ['BEBAN_LAINNYA', 'Beban Operasional Lainnya', 'Biaya administrasi bank dan pengeluaran rupa-rupa', '#94a3b8']
];
foreach ($expCats as $c) {
    $stmt = $pdo->prepare("INSERT INTO `expense_categories` (`kode`, `nama_kategori`, `deskripsi`, `warna`) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE `nama_kategori`=VALUES(`nama_kategori`), `deskripsi`=VALUES(`deskripsi`), `warna`=VALUES(`warna`)");
    $stmt->execute($c);
}
echo "Expense categories seeded.\n";

// 2. Table quotations & quotation_items
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `quotations` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Table quotations checked/created.\n";
} catch (\Throwable $e) {
    echo "quotations error: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `quotation_items` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Table quotation_items checked/created.\n";
} catch (\Throwable $e) {
    echo "quotation_items error: " . $e->getMessage() . "\n";
}

// 3. Columns on invoices for public portal and payment proof upload
$invCols = [
    'public_token' => "ALTER TABLE `invoices` ADD COLUMN `public_token` VARCHAR(64) NULL UNIQUE AFTER `nomor_invoice`",
    'bukti_transfer' => "ALTER TABLE `invoices` ADD COLUMN `bukti_transfer` VARCHAR(255) NULL AFTER `catatan_klien`",
    'bukti_transfer_catatan' => "ALTER TABLE `invoices` ADD COLUMN `bukti_transfer_catatan` TEXT NULL AFTER `bukti_transfer`",
    'bukti_transfer_at' => "ALTER TABLE `invoices` ADD COLUMN `bukti_transfer_at` DATETIME NULL AFTER `bukti_transfer_catatan`",
    'payment_verification_status' => "ALTER TABLE `invoices` ADD COLUMN `payment_verification_status` ENUM('none', 'pending', 'verified', 'rejected') DEFAULT 'none' AFTER `bukti_transfer_at`"
];
foreach ($invCols as $col => $sql) {
    try {
        $pdo->exec($sql);
        echo "Invoice column added: {$col}\n";
    } catch (\Throwable $e) {
        echo "Invoice column exists or note: {$col}\n";
    }
}

// Generate tokens for existing invoices that don't have one
$emptyTokens = $pdo->query("SELECT id FROM `invoices` WHERE `public_token` IS NULL OR `public_token` = ''")->fetchAll(PDO::FETCH_ASSOC);
foreach ($emptyTokens as $row) {
    $token = bin2hex(random_bytes(24));
    $pdo->prepare("UPDATE `invoices` SET `public_token` = ? WHERE `id` = ?")->execute([$token, $row['id']]);
}
echo "Generated public tokens for " . count($emptyTokens) . " existing invoices.\n";

// 4. Table maintenance_sla (SLA, Kontrak Maintenance & Pemantauan Kadaluwarsa Domain/Hosting/SSL)
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `maintenance_sla` (
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
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_sla_client` (`client_id`),
        INDEX `idx_sla_project` (`project_id`),
        INDEX `idx_sla_berakhir` (`tanggal_berakhir`),
        FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE RESTRICT,
        FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Table maintenance_sla checked/created.\n";
} catch (\Throwable $e) {
    echo "maintenance_sla error: " . $e->getMessage() . "\n";
}

// 5. Table timesheets (Pencatatan Jam Kerja & Billing Berbasis Jam)
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `timesheets` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Table timesheets checked/created.\n";
} catch (\Throwable $e) {
    echo "timesheets error: " . $e->getMessage() . "\n";
}

// 6. Permissions for all new modules
$newPerms = [
    ['expense.view', 'Melihat Beban & Pengeluaran', 'Keuangan', 'Melihat daftar beban dan pengeluaran operasional'],
    ['expense.manage', 'Mengelola Pengeluaran', 'Keuangan', 'Mencatat, menyetujui, dan menghapus transaksi beban operasional'],
    ['quotation.view', 'Melihat Penawaran Harga', 'Billing', 'Melihat daftar surat penawaran harga klien'],
    ['quotation.manage', 'Mengelola Penawaran Harga', 'Billing', 'Membuat, mengubah, menyetujui, dan konversi penawaran ke faktur'],
    ['maintenance.view', 'Melihat SLA & Aset', 'Operasional', 'Melihat monitoring domain, server, dan SLA pemeliharaan'],
    ['maintenance.manage', 'Mengelola SLA & Aset', 'Operasional', 'Menambah dan memperbarui data domain, server, dan SLA'],
    ['timesheet.view', 'Melihat Timesheet', 'Proyek', 'Melihat log jam kerja dan timesheet proyek'],
    ['timesheet.manage', 'Mengelola Timesheet', 'Proyek', 'Mencatat jam kerja dan konversi timesheet ke penagihan faktur']
];
foreach ($newPerms as $p) {
    $stmt = $pdo->prepare("INSERT INTO `permissions` (`kode`, `nama`, `kategori`, `keterangan`) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE `nama`=VALUES(`nama`), `kategori`=VALUES(`kategori`), `keterangan`=VALUES(`keterangan`)");
    $stmt->execute($p);
}

// Grant to Admin (role_id 1) and Staff (role_id 2 & 3)
$permCodes = array_map(fn($p) => "'{$p[0]}'", $newPerms);
$permCodesStr = implode(',', $permCodes);
$pdo->exec("INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) SELECT 1, `id` FROM `permissions` WHERE `kode` IN ({$permCodesStr})");
$pdo->exec("INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) SELECT 2, `id` FROM `permissions` WHERE `kode` IN ({$permCodesStr})");
$pdo->exec("INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) SELECT 3, `id` FROM `permissions` WHERE `kode` IN ('timesheet.view', 'timesheet.manage', 'maintenance.view')");

echo "Permissions seeded and assigned to roles.\n";
echo "ERP Extensions migration completed successfully!\n";
