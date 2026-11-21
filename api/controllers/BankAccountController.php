<?php
// BankAccountController.php - Master Rekening Bank Resmi Perusahaan

authCheck();
$db = Database::getInstance();

if ($method === 'GET') {
    if ($id && is_numeric($id)) {
        checkPermission(['bank.view', 'invoice.view', 'settings.edit']);
        $row = $db->fetch("SELECT * FROM payment_methods WHERE id = ?", [$id]);
        if (!$row) errorResponse('Rekening bank tidak ditemukan', 404);
        successResponse($row);
    }

    checkPermission(['bank.view', 'invoice.view', 'settings.edit', 'payment.view']);
    $search = trim($params['search'] ?? '');
    $status = trim($params['status'] ?? '');
    $tipe = trim($params['tipe'] ?? '');

    $where = ["1=1"];
    $args = [];

    if ($search !== '') {
        $where[] = "(nama_metode LIKE ? OR nama_bank LIKE ? OR nomor_rekening LIKE ? OR atas_nama LIKE ?)";
        $s = "%$search%";
        $args[] = $s; $args[] = $s; $args[] = $s; $args[] = $s;
    }

    if ($status !== '') {
        $where[] = "status = ?";
        $args[] = $status;
    }

    if ($tipe !== '') {
        $where[] = "tipe = ?";
        $args[] = $tipe;
    }

    $sql = "SELECT pm.*, 
            (SELECT COUNT(*) FROM payments py WHERE py.payment_method_id = pm.id) AS total_transaksi
            FROM payment_methods pm 
            WHERE " . implode(' AND ', $where) . " 
            ORDER BY pm.is_default DESC, pm.id ASC";

    $rows = $db->fetchAll($sql, $args);
    successResponse($rows);
}

if ($method === 'POST') {
    checkPermission(['bank.manage', 'settings.edit']);

    // Sub-action: Toggle default bank account
    if ($action === 'set-default' || ($params['action'] ?? '') === 'set-default') {
        if (!$id || !is_numeric($id)) errorResponse('ID Rekening tidak valid', 400);

        $pdo = $db->getPdo();
        $pdo->beginTransaction();
        try {
            $pdo->exec("UPDATE payment_methods SET is_default = 0");
            $stmt = $pdo->prepare("UPDATE payment_methods SET is_default = 1, status = 'aktif' WHERE id = ?");
            $stmt->execute([$id]);
            $pdo->commit();

            logActivity('UPDATE', 'bank_accounts', (int)$id, ['action' => 'set_default']);
            clearCache(['invoices']);
            successResponse(['id' => (int)$id], 'Rekening utama berhasil diperbarui');
        } catch (\Throwable $e) {
            $pdo->rollBack();
            errorResponse('Gagal memperbarui rekening utama: ' . $e->getMessage(), 500);
        }
    }

    // Create new bank account
    $namaMetode = trim($params['nama_metode'] ?? '');
    $namaBank = trim($params['nama_bank'] ?? '');
    $nomorRekening = trim($params['nomor_rekening'] ?? '');
    $atasNama = trim($params['atas_nama'] ?? '');
    $cabang = trim($params['cabang'] ?? '');
    $kodeBank = trim($params['kode_bank'] ?? '');
    $swiftCode = trim($params['swift_code'] ?? '');
    $tipe = in_array($params['tipe'] ?? '', ['bank', 'ewallet', 'tunai']) ? $params['tipe'] : 'bank';
    $isDefault = !empty($params['is_default']) ? 1 : 0;
    $instruksi = trim($params['instruksi'] ?? '');
    $status = in_array($params['status'] ?? '', ['aktif', 'nonaktif']) ? $params['status'] : 'aktif';

    if (empty($namaBank)) {
        $namaBank = $namaMetode;
    }
    if (empty($namaMetode)) {
        $namaMetode = $namaBank . ($nomorRekening ? ' - ' . $nomorRekening : '');
    }

    if (empty($namaBank) && empty($namaMetode)) {
        errorResponse('Nama Bank / Metode Pembayaran wajib diisi');
    }
    if ($tipe === 'bank' && empty($nomorRekening)) {
        errorResponse('Nomor Rekening wajib diisi untuk rekening bank');
    }
    if ($tipe === 'bank' && empty($atasNama)) {
        errorResponse('Nama Pemilik Rekening (Atas Nama) wajib diisi');
    }

    $pdo = $db->getPdo();
    $pdo->beginTransaction();
    try {
        if ($isDefault === 1) {
            $pdo->exec("UPDATE payment_methods SET is_default = 0");
        }

        $stmt = $pdo->prepare("INSERT INTO payment_methods 
            (nama_metode, nama_bank, nomor_rekening, atas_nama, cabang, kode_bank, swift_code, tipe, is_default, instruksi, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $namaMetode, $namaBank, $nomorRekening, $atasNama, $cabang, $kodeBank, $swiftCode, $tipe, $isDefault, $instruksi, $status
        ]);
        $newId = (int)$pdo->lastInsertId();
        $pdo->commit();

        logActivity('INSERT', 'bank_accounts', $newId, [
            'nama_bank' => $namaBank,
            'nomor_rekening' => $nomorRekening,
            'atas_nama' => $atasNama
        ]);
        clearCache(['invoices']);
        successResponse(['id' => $newId], 'Rekening bank resmi berhasil ditambahkan', 201);
    } catch (\Throwable $e) {
        $pdo->rollBack();
        errorResponse('Gagal menambahkan rekening bank: ' . $e->getMessage(), 500);
    }
}

if ($method === 'PUT') {
    checkPermission(['bank.manage', 'settings.edit']);
    if (!$id || !is_numeric($id)) errorResponse('ID Rekening tidak valid', 400);

    $exist = $db->fetch("SELECT * FROM payment_methods WHERE id = ?", [$id]);
    if (!$exist) errorResponse('Rekening bank tidak ditemukan', 404);

    $namaMetode = trim($params['nama_metode'] ?? $exist['nama_metode']);
    $namaBank = trim($params['nama_bank'] ?? $exist['nama_bank']);
    $nomorRekening = trim($params['nomor_rekening'] ?? $exist['nomor_rekening']);
    $atasNama = trim($params['atas_nama'] ?? $exist['atas_nama']);
    $cabang = trim($params['cabang'] ?? $exist['cabang']);
    $kodeBank = trim($params['kode_bank'] ?? $exist['kode_bank']);
    $swiftCode = trim($params['swift_code'] ?? $exist['swift_code']);
    $tipe = in_array($params['tipe'] ?? '', ['bank', 'ewallet', 'tunai']) ? $params['tipe'] : $exist['tipe'];
    $isDefault = isset($params['is_default']) ? ($params['is_default'] ? 1 : 0) : $exist['is_default'];
    $instruksi = trim($params['instruksi'] ?? $exist['instruksi']);
    $status = in_array($params['status'] ?? '', ['aktif', 'nonaktif']) ? $params['status'] : $exist['status'];

    if (empty($namaBank)) $namaBank = $namaMetode;
    if (empty($namaMetode)) $namaMetode = $namaBank . ($nomorRekening ? ' - ' . $nomorRekening : '');

    $pdo = $db->getPdo();
    $pdo->beginTransaction();
    try {
        if ($isDefault === 1) {
            $pdo->exec("UPDATE payment_methods SET is_default = 0");
        }

        $stmt = $pdo->prepare("UPDATE payment_methods SET 
            nama_metode = ?, nama_bank = ?, nomor_rekening = ?, atas_nama = ?, cabang = ?, 
            kode_bank = ?, swift_code = ?, tipe = ?, is_default = ?, instruksi = ?, status = ? 
            WHERE id = ?");
        $stmt->execute([
            $namaMetode, $namaBank, $nomorRekening, $atasNama, $cabang, $kodeBank, $swiftCode, $tipe, $isDefault, $instruksi, $status, $id
        ]);
        $pdo->commit();

        logActivity('UPDATE', 'bank_accounts', (int)$id, [
            'nama_bank' => $namaBank,
            'nomor_rekening' => $nomorRekening
        ]);
        clearCache(['invoices']);
        successResponse(['id' => (int)$id], 'Rekening bank berhasil diperbarui');
    } catch (\Throwable $e) {
        $pdo->rollBack();
        errorResponse('Gagal memperbarui rekening bank: ' . $e->getMessage(), 500);
    }
}

if ($method === 'DELETE') {
    checkPermission(['bank.manage', 'settings.edit']);
    if (!$id || !is_numeric($id)) errorResponse('ID Rekening tidak valid', 400);

    $exist = $db->fetch("SELECT * FROM payment_methods WHERE id = ?", [$id]);
    if (!$exist) errorResponse('Rekening bank tidak ditemukan', 404);

    // Cek apakah ada riwayat pembayaran yang terkait
    $usedCount = (int)$db->count("SELECT COUNT(*) FROM payments WHERE payment_method_id = ?", [$id]);

    if ($usedCount > 0) {
        // Soft delete / nonaktifkan agar integritas riwayat kuitansi tidak rusak
        $db->execute("UPDATE payment_methods SET status = 'nonaktif', is_default = 0 WHERE id = ?", [$id]);
        logActivity('UPDATE', 'bank_accounts', (int)$id, ['action' => 'deactivate_due_to_payments']);
        clearCache(['invoices']);
        successResponse(['id' => (int)$id], "Rekening memiliki $usedCount riwayat pembayaran. Status dialihkan ke Nonaktif agar integritas pembukuan tetap terjaga.");
    } else {
        $db->execute("DELETE FROM payment_methods WHERE id = ?", [$id]);
        logActivity('DELETE', 'bank_accounts', (int)$id, ['nama_bank' => $exist['nama_bank']]);
        clearCache(['invoices']);
        successResponse(['id' => (int)$id], 'Rekening bank berhasil dihapus permanen');
    }
}

errorResponse('Metode HTTP tidak didukung', 405);
