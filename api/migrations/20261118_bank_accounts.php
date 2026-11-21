<?php
require_once __DIR__ . '/../config/database.php';

$db = Database::getInstance();
$pdo = $db->getPdo();

$columns = [
    'nama_bank' => "ALTER TABLE `payment_methods` ADD COLUMN `nama_bank` VARCHAR(60) NOT NULL DEFAULT '' AFTER `nama_metode`",
    'cabang' => "ALTER TABLE `payment_methods` ADD COLUMN `cabang` VARCHAR(100) NULL AFTER `atas_nama`",
    'kode_bank' => "ALTER TABLE `payment_methods` ADD COLUMN `kode_bank` VARCHAR(20) NULL AFTER `cabang`",
    'swift_code' => "ALTER TABLE `payment_methods` ADD COLUMN `swift_code` VARCHAR(20) NULL AFTER `kode_bank`",
    'tipe' => "ALTER TABLE `payment_methods` ADD COLUMN `tipe` ENUM('bank', 'ewallet', 'tunai') DEFAULT 'bank' AFTER `swift_code`",
    'is_default' => "ALTER TABLE `payment_methods` ADD COLUMN `is_default` TINYINT(1) DEFAULT 0 AFTER `tipe`",
    'updated_at' => "ALTER TABLE `payment_methods` ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`"
];

foreach ($columns as $col => $sql) {
    try {
        $pdo->exec($sql);
        echo "Column added: {$col}\n";
    } catch (\Throwable $e) {
        echo "Column exists or error: {$col} ({$e->getMessage()})\n";
    }
}

// Add permissions for bank account management
$permissions = [
    ['bank.view', 'Melihat Rekening Bank', 'Master Data', 'Melihat daftar rekening bank resmi perusahaan'],
    ['bank.manage', 'Mengelola Rekening Bank', 'Master Data', 'Menambah, mengubah, dan menghapus rekening bank resmi perusahaan']
];

foreach ($permissions as $p) {
    try {
        $pdo->prepare("INSERT INTO `permissions` (`kode`, `nama`, `kategori`, `keterangan`) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE `nama`=VALUES(`nama`)")
            ->execute($p);
        echo "Permission added: {$p[0]}\n";
    } catch (\Throwable $e) {
        echo "Permission error: {$p[0]} ({$e->getMessage()})\n";
    }
}

// Assign to Super Admin (1) & Finance Staff (2)
$pdo->exec("INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) SELECT 1, `id` FROM `permissions` WHERE `kode` IN ('bank.view', 'bank.manage')");
$pdo->exec("INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) SELECT 2, `id` FROM `permissions` WHERE `kode` IN ('bank.view', 'bank.manage')");

// Populate initial data
$pdo->exec("UPDATE `payment_methods` SET `nama_bank` = 'BCA', `cabang` = 'KCU Sudirman Jakarta', `kode_bank` = '014', `swift_code` = 'CENAIDJA', `is_default` = 1 WHERE `id` = 1");
$pdo->exec("UPDATE `payment_methods` SET `nama_bank` = 'Bank Mandiri', `cabang` = 'KCP Thamrin Jakarta', `kode_bank` = '008', `swift_code` = 'BMRIIDJA', `is_default` = 0 WHERE `id` = 2");
$pdo->exec("UPDATE `payment_methods` SET `nama_bank` = 'Kas Tunai', `tipe` = 'tunai', `is_default` = 0 WHERE `id` = 3");

// Add BNI as extra bank account
try {
    $stmt = $pdo->prepare("INSERT INTO `payment_methods` (`nama_metode`, `nama_bank`, `nomor_rekening`, `atas_nama`, `cabang`, `kode_bank`, `swift_code`, `instruksi`, `tipe`, `is_default`, `status`) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `nomor_rekening`=VALUES(`nomor_rekening`)");
    $stmt->execute([
        'Bank BNI', 'BNI', '0238192849', 'PT CRUDWorks Media Tama', 'KCU Jakarta Pusat', '009', 'BNINIDJA',
        'Transfer antardaerah atau melalui virtual account BNI.', 'bank', 0, 'aktif'
    ]);
    echo "Added BNI official bank account.\n";
} catch (\Throwable $e) {
    echo "BNI insert note: {$e->getMessage()}\n";
}

echo "Migration finished successfully.\n";
