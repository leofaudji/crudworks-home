<?php
// SettingsController.php

$db = Database::getInstance();

if ($id === 'system-health' && $method === 'GET') {
    authCheck();
    checkPermission('settings.edit');
    $redis = RedisManager::getInstance();
    $dbRow = $db->fetch(
        "SELECT DATABASE() as db_name,
                VERSION() as mysql_version,
                COUNT(*) as table_count,
                ROUND(COALESCE(SUM(data_length + index_length), 0) / 1024 / 1024, 2) as db_size_mb
         FROM information_schema.tables
         WHERE table_schema = DATABASE()"
    );
    $lastBackup = null;
    $backupDirs = [__DIR__ . '/../../backups', __DIR__ . '/../../storage/backups'];
    foreach ($backupDirs as $dir) {
        if (is_dir($dir)) {
            $files = glob($dir . '/*.sql*') ?: [];
            foreach ($files as $f) {
                $mtime = @filemtime($f) ?: 0;
                if (!$lastBackup || $mtime > $lastBackup['ts']) {
                    $lastBackup = ['file' => basename($f), 'ts' => $mtime, 'date' => date('Y-m-d H:i:s', $mtime)];
                }
            }
        }
    }
    successResponse([
        'redis_connected' => $redis->isConnected(),
        'php_version' => PHP_VERSION,
        'mysql_version' => $dbRow['mysql_version'] ?? '-',
        'db_name' => $dbRow['db_name'] ?? '-',
        'table_count' => (int)($dbRow['table_count'] ?? 0),
        'db_size_mb' => (float)($dbRow['db_size_mb'] ?? 0),
        'last_backup' => $lastBackup
    ]);
}

if ($id === 'clear-cache' && $method === 'POST') {
    authCheck();
    checkPermission('settings.edit');
    clearCache(['reports', 'accounting', 'clients', 'invoices', 'payments', 'expenses', 'services', 'settings']);
    logActivity('settings.clear_cache', 'system', 0, null, ['keterangan' => 'Membersihkan seluruh cache laporan & sistem Redis']);
    successResponse(null, 'Seluruh cache laporan & sistem berhasil dibersihkan');
}

if ($id === 'test-email' && $method === 'POST') {
    authCheck();
    checkPermission('settings.edit');
    $to = trim((string)($params['to_email'] ?? ''));
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        errorResponse('Alamat email tujuan tidak valid', 422);
    }
    $cfg = getAppSettingsMap();
    $comp = htmlspecialchars((string)($cfg['company_name'] ?? 'CRUDWorks ERP'));
    $res = sendErpEmail($to, '', "Test Konfigurasi SMTP - {$comp}", "<p>Halo,</p><p>Ini adalah email uji coba dari <b>{$comp}</b>. Konfigurasi SMTP Anda berfungsi dengan baik.</p>", 'test', null);
    if (empty($res['success'])) {
        errorResponse($res['message'] ?? 'Gagal mengirim email uji coba', 500);
    }
    successResponse(null, $res['message']);
}

if ($id === 'email-logs' && $method === 'GET') {
    authCheck();
    checkPermission(['settings.edit', 'audit.view', 'invoice.view', 'quotation.view']);

    $page = max(1, (int)($params['page'] ?? 1));
    $perPage = min(100, max(5, (int)($params['per_page'] ?? 15)));
    $offset = ($page - 1) * $perPage;
    $status = trim((string)($params['status'] ?? ''));
    $entityType = trim((string)($params['entity_type'] ?? ''));
    $search = trim((string)($params['search'] ?? ''));

    $where = [];
    $bind = [];
    if (in_array($status, ['sent', 'failed'], true)) {
        $where[] = "el.status = ?";
        $bind[] = $status;
    }
    if ($entityType !== '') {
        $where[] = "el.entity_type = ?";
        $bind[] = $entityType;
    }
    if ($search !== '') {
        $like = "%{$search}%";
        $where[] = "(el.recipient_email LIKE ? OR el.subject LIKE ? OR el.error_message LIKE ? OR COALESCE(inv.nomor_invoice, q.nomor_penawaran, py.nomor_pembayaran, '') LIKE ? OR COALESCE(u.nama_lengkap, '') LIKE ?)";
        array_push($bind, $like, $like, $like, $like, $like);
    }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
    $joins = "LEFT JOIN users u ON el.sent_by = u.id
              LEFT JOIN invoices inv ON el.entity_type = 'invoice' AND el.entity_id = inv.id
              LEFT JOIN quotations q ON el.entity_type = 'quotation' AND el.entity_id = q.id
              LEFT JOIN payments py ON el.entity_type = 'payment' AND el.entity_id = py.id";

    $total = (int)$db->count("SELECT COUNT(*) FROM email_logs el {$joins} {$whereSql}", $bind);
    $rows = $db->fetchAll(
        "SELECT el.*, u.nama_lengkap as sent_by_name,
                COALESCE(inv.nomor_invoice, q.nomor_penawaran, py.nomor_pembayaran, '') as doc_number
         FROM email_logs el
         {$joins}
         {$whereSql}
         ORDER BY el.id DESC
         LIMIT {$perPage} OFFSET {$offset}",
        $bind
    );

    paginatedResponse($rows, $total, $page, $perPage);
}

if ($id === 'payment-methods') {
    authCheck();
    if ($method === 'GET') {
        $methods = $db->fetchAll(
            "SELECT pm.*, coa.kode_akun as coa_kode, coa.nama_akun as coa_nama
             FROM payment_methods pm
             LEFT JOIN chart_of_accounts coa ON pm.coa_id = coa.id
             ORDER BY pm.id ASC"
        );
        successResponse($methods);
    }

    if ($method === 'POST') {
        checkPermission('settings.edit');
        $namaMetode = trim($params['nama_metode'] ?? '');
        $nomorRekening = trim($params['nomor_rekening'] ?? '');
        $atasNama = trim($params['atas_nama'] ?? '');
        $instruksi = trim($params['instruksi'] ?? '');
        $status = in_array($params['status'] ?? '', ['aktif', 'nonaktif']) ? $params['status'] : 'aktif';
        $coaId = !empty($params['coa_id']) ? (int)$params['coa_id'] : null;

        if (empty($namaMetode)) errorResponse('Nama metode pembayaran wajib diisi');

        $methodId = !empty($params['id']) ? (int)$params['id'] : null;

        if ($methodId) {
            $db->execute(
                "UPDATE payment_methods SET nama_metode = ?, nomor_rekening = ?, atas_nama = ?, instruksi = ?, status = ?, coa_id = ? WHERE id = ?",
                [$namaMetode, $nomorRekening, $atasNama, $instruksi, $status, $coaId, $methodId]
            );
            successResponse(['id' => $methodId], 'Metode pembayaran berhasil diperbarui');
        } else {
            $newId = $db->insert(
                "INSERT INTO payment_methods (nama_metode, nomor_rekening, atas_nama, instruksi, status, coa_id) VALUES (?, ?, ?, ?, ?, ?)",
                [$namaMetode, $nomorRekening, $atasNama, $instruksi, $status, $coaId]
            );
            successResponse(['id' => $newId], 'Metode pembayaran berhasil ditambahkan');
        }
    }
    errorResponse('Metode tidak didukung', 405);
}

// General Settings
if ($method === 'GET') {
    $rows = $db->fetchAll("SELECT kunci, nilai, grup, keterangan FROM app_settings");
    $flat = [];
    foreach ($rows as $r) {
        $flat[$r['kunci']] = $r['nilai'];
    }
    successResponse($flat);
}

if ($method === 'POST') {
    authCheck();
    checkPermission('settings.edit');

    $settings = $params['settings'] ?? [];
    if (!is_array($settings)) errorResponse('Data pengaturan tidak valid');

    $stmt = $db->getPdo()->prepare(
        "INSERT INTO app_settings (kunci, nilai) VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE nilai = VALUES(nilai)"
    );

    foreach ($settings as $k => $v) {
        $stmt->execute([$k, (string)$v]);
    }

    clearCache(['settings']);
    logActivity('update', 'app_settings', 0, null, $settings);

    successResponse(null, 'Pengaturan sistem berhasil disimpan');
}

errorResponse('Metode tidak didukung', 405);
