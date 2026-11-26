<?php
// BankAccountController.php - Master Rekening Bank Resmi Perusahaan

authCheck();
$db = Database::getInstance();

// ===== REKONSILIASI MUTASI BANK (Poin 4) =====
if ($id === 'mutations') {
    if ($method === 'GET') {
        checkPermission(['bank.view', 'invoice.view', 'settings.edit', 'payment.view']);
        $pmId = (int)($params['payment_method_id'] ?? 0);
        $status = trim((string)($params['status'] ?? ''));

        $where = ["1=1"];
        $args = [];
        if ($pmId > 0) {
            $where[] = "bm.payment_method_id = ?";
            $args[] = $pmId;
        }
        if (in_array($status, ['unmatched', 'matched', 'ignored'], true)) {
            $where[] = "bm.status = ?";
            $args[] = $status;
        }

        $rows = $db->fetchAll(
            "SELECT bm.*, pm.nama_bank, pm.nomor_rekening,
                    CASE
                        WHEN bm.matched_type = 'invoice' THEN (SELECT nomor_invoice FROM invoices WHERE id = bm.matched_id)
                        WHEN bm.matched_type = 'expense' THEN (SELECT deskripsi FROM expenses WHERE id = bm.matched_id)
                        WHEN bm.matched_type = 'payment' THEN (SELECT nomor_pembayaran FROM payments WHERE id = bm.matched_id)
                        ELSE NULL
                    END as matched_label
             FROM bank_mutations bm
             JOIN payment_methods pm ON bm.payment_method_id = pm.id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY bm.tanggal_transaksi DESC, bm.id DESC
             LIMIT 200",
            $args
        );
        successResponse($rows);
    }

    if ($method === 'POST') {
        checkPermission(['bank.manage', 'settings.edit']);

        // Import mutasi (array rows hasil parse CSV atau input manual)
        if ($action === 'import') {
            $pmId = (int)($params['payment_method_id'] ?? 0);
            $rows = $params['rows'] ?? [];
            if ($pmId <= 0 || !is_array($rows) || empty($rows)) {
                errorResponse('Rekening tujuan dan minimal 1 baris mutasi wajib diisi', 422);
            }

            $userId = (int)($_SESSION['user_id'] ?? 0) ?: null;
            $inserted = 0;
            $stmt = $db->getPdo()->prepare(
                "INSERT INTO bank_mutations (payment_method_id, tanggal_transaksi, deskripsi, referensi, tipe, nominal, saldo, imported_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            );
            foreach ($rows as $r) {
                $tgl = trim((string)($r['tanggal_transaksi'] ?? date('Y-m-d')));
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $tgl)) $tgl = date('Y-m-d');
                $desc = trim((string)($r['deskripsi'] ?? 'Mutasi Bank'));
                $ref = trim((string)($r['referensi'] ?? ''));
                $tipe = strtolower(trim((string)($r['tipe'] ?? 'kredit'))) === 'debit' ? 'debit' : 'kredit';
                $nom = abs((float)($r['nominal'] ?? 0));
                $saldo = isset($r['saldo']) && $r['saldo'] !== '' ? (float)$r['saldo'] : null;
                if ($nom <= 0) continue;

                $stmt->execute([$pmId, $tgl, mb_substr($desc, 0, 255), $ref ?: null, $tipe, $nom, $saldo, $userId]);
                $inserted++;
            }
            logActivity('mutation_import', 'bank_mutations', $pmId, null, ['inserted' => $inserted]);
            successResponse(['inserted' => $inserted], "$inserted baris mutasi berhasil diimpor");
        }

        // Auto-match mutasi unmatched dengan invoices / payments / expenses
        if ($action === 'auto-match') {
            $pmId = (int)($params['payment_method_id'] ?? 0);
            $where = $pmId > 0 ? "AND payment_method_id = ?" : "";
            $args = $pmId > 0 ? [$pmId] : [];
            $unmatched = $db->fetchAll("SELECT * FROM bank_mutations WHERE status = 'unmatched' $where", $args);

            $matchedCount = 0;
            foreach ($unmatched as $m) {
                $nom = (float)$m['nominal'];
                $desc = strtoupper((string)$m['deskripsi'] . ' ' . (string)$m['referensi']);

                if ($m['tipe'] === 'kredit') {
                    // 1. Cek invoice dengan nomor di deskripsi atau sisa_tagihan / total_tagihan cocok
                    $inv = $db->fetch(
                        "SELECT id, nomor_invoice FROM invoices
                         WHERE status IN ('dikirim','sebagian','jatuh_tempo')
                           AND (ABS(sisa_tagihan - ?) < 1 OR ABS(total_tagihan - ?) < 1)
                         ORDER BY id DESC LIMIT 1",
                        [$nom, $nom]
                    );
                    if ($inv) {
                        $db->execute("UPDATE bank_mutations SET status = 'matched', matched_type = 'invoice', matched_id = ? WHERE id = ?", [(int)$inv['id'], (int)$m['id']]);
                        $matchedCount++;
                        continue;
                    }
                    // 2. Cek payment yang sudah tercatat dengan nominal sama
                    $pay = $db->fetch(
                        "SELECT id FROM payments WHERE ABS(jumlah_bayar - ?) < 1 AND ABS(DATEDIFF(tanggal_bayar, ?)) <= 5 ORDER BY id DESC LIMIT 1",
                        [$nom, $m['tanggal_transaksi']]
                    );
                    if ($pay) {
                        $db->execute("UPDATE bank_mutations SET status = 'matched', matched_type = 'payment', matched_id = ? WHERE id = ?", [(int)$pay['id'], (int)$m['id']]);
                        $matchedCount++;
                        continue;
                    }
                } else {
                    // Debit: cocokkan dengan expenses
                    $exp = $db->fetch(
                        "SELECT id FROM expenses WHERE ABS(jumlah - ?) < 1 AND ABS(DATEDIFF(tanggal, ?)) <= 5 ORDER BY id DESC LIMIT 1",
                        [$nom, $m['tanggal_transaksi']]
                    );
                    if ($exp) {
                        $db->execute("UPDATE bank_mutations SET status = 'matched', matched_type = 'expense', matched_id = ? WHERE id = ?", [(int)$exp['id'], (int)$m['id']]);
                        $matchedCount++;
                    }
                }
            }

            successResponse(['matched' => $matchedCount, 'checked' => count($unmatched)], "$matchedCount mutasi berhasil dicocokkan otomatis");
        }

        // Rekonsiliasi manual atau abaikan mutasi
        if ($action === 'reconcile') {
            $mutId = (int)($params['id'] ?? 0);
            $newStatus = in_array($params['status'] ?? '', ['matched', 'ignored', 'unmatched'], true) ? $params['status'] : 'matched';
            $mType = in_array($params['matched_type'] ?? '', ['invoice', 'expense', 'payment'], true) ? $params['matched_type'] : null;
            $mId = !empty($params['matched_id']) ? (int)$params['matched_id'] : null;
            if ($mutId <= 0) errorResponse('ID mutasi tidak valid', 422);

            $db->execute(
                "UPDATE bank_mutations SET status = ?, matched_type = ?, matched_id = ? WHERE id = ?",
                [$newStatus, $mType, $mId, $mutId]
            );
            successResponse(['id' => $mutId], 'Status rekonsiliasi mutasi diperbarui');
        }
    }

    errorResponse('Aksi mutasi bank tidak valid', 400);
}

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
