<?php
// SettingsController.php

$db = Database::getInstance();

if ($id === 'payment-methods') {
    authCheck();
    if ($method === 'GET') {
        $methods = $db->fetchAll("SELECT * FROM payment_methods ORDER BY id ASC");
        successResponse($methods);
    }

    if ($method === 'POST') {
        checkPermission('settings.edit');
        $namaMetode = trim($params['nama_metode'] ?? '');
        $nomorRekening = trim($params['nomor_rekening'] ?? '');
        $atasNama = trim($params['atas_nama'] ?? '');
        $instruksi = trim($params['instruksi'] ?? '');
        $status = in_array($params['status'] ?? '', ['aktif', 'nonaktif']) ? $params['status'] : 'aktif';

        if (empty($namaMetode)) errorResponse('Nama metode pembayaran wajib diisi');

        $methodId = !empty($params['id']) ? (int)$params['id'] : null;

        if ($methodId) {
            $db->execute(
                "UPDATE payment_methods SET nama_metode = ?, nomor_rekening = ?, atas_nama = ?, instruksi = ?, status = ? WHERE id = ?",
                [$namaMetode, $nomorRekening, $atasNama, $instruksi, $status, $methodId]
            );
            successResponse(['id' => $methodId], 'Metode pembayaran berhasil diperbarui');
        } else {
            $newId = $db->insert(
                "INSERT INTO payment_methods (nama_metode, nomor_rekening, atas_nama, instruksi, status) VALUES (?, ?, ?, ?, ?)",
                [$namaMetode, $nomorRekening, $atasNama, $instruksi, $status]
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
