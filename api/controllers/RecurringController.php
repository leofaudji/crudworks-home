<?php
// RecurringController.php

authCheck();
checkPermission('recurring.manage');
$db = Database::getInstance();

if ($id && is_numeric($id)) {
    $recurId = (int)$id;

    // Trigger generate invoice now
    if ($action === 'generate') {
        if ($method !== 'POST') errorResponse('Method not allowed', 405);

        $recur = $db->fetch("SELECT * FROM recurring_invoices WHERE id = ?", [$recurId]);
        if (!$recur) errorResponse('Data recurring tidak ditemukan', 404);

        $items = json_decode($recur['data_items_json'], true);
        if (!is_array($items) || empty($items)) {
            errorResponse('Item template tidak valid');
        }

        $pajakPersen = getDefaultTaxPercent();
        $calc = calculateInvoiceTotals($items, 'nominal', 0, $pajakPersen);
        $nomorInvoice = generateInvoiceNo('INV-');
        $today = date('Y-m-d');
        $dueDate = date('Y-m-d', strtotime('+14 days'));
        $userId = $_SESSION['user_id'] ?? 1;

        $pdo = $db->getPdo();
        $pdo->beginTransaction();

        try {
            $stmt = $pdo->prepare(
                "INSERT INTO invoices (nomor_invoice, client_id, project_id, tanggal_invoice, tanggal_jatuh_tempo, 
                         subtotal, diskon_tipe, diskon_nilai, pajak_persen, pajak_nominal, total_tagihan, total_dibayar, 
                         sisa_tagihan, status, catatan_klien, created_by) 
                 VALUES (?, ?, ?, ?, ?, ?, 'nominal', 0.00, ?, ?, ?, 0.00, ?, 'draft', ?, ?)"
            );
            $stmt->execute([
                $nomorInvoice, $recur['client_id'], $recur['project_id'], $today, $dueDate,
                $calc['subtotal'], $pajakPersen, $calc['pajak_nominal'], $calc['total'], $calc['total'],
                'Tagihan otomatis dari template: ' . $recur['judul'], $userId
            ]);
            $newInvId = $pdo->lastInsertId();

            $stmtItem = $pdo->prepare(
                "INSERT INTO invoice_items (invoice_id, service_id, deskripsi, kuantitas, harga_satuan, total_harga) 
                 VALUES (?, ?, ?, ?, ?, ?)"
            );
            foreach ($items as $it) {
                $serviceId = !empty($it['service_id']) ? (int)$it['service_id'] : null;
                $deskripsi = trim($it['deskripsi'] ?? 'Layanan Berulang');
                $qty = (float)($it['kuantitas'] ?? 1);
                $price = (float)($it['harga_satuan'] ?? 0);
                $totalItem = $qty * $price;
                $stmtItem->execute([$newInvId, $serviceId, $deskripsi, $qty, $price, $totalItem]);
            }

            // Hitung tanggal berikutnya
            $nextDate = date('Y-m-d', strtotime('+1 month'));
            if ($recur['frekuensi'] === 'triwulan') $nextDate = date('Y-m-d', strtotime('+3 months'));
            if ($recur['frekuensi'] === 'semester') $nextDate = date('Y-m-d', strtotime('+6 months'));
            if ($recur['frekuensi'] === 'tahunan') $nextDate = date('Y-m-d', strtotime('+1 year'));

            $pdo->prepare(
                "UPDATE recurring_invoices SET terakhir_dibuat_at = ?, berikutnya_dibuat_at = ? WHERE id = ?"
            )->execute([$today, $nextDate, $recurId]);

            $pdo->commit();
            clearCache(['invoices']);
            logActivity('recurring_generate', 'invoices', $newInvId, null, ['nomor_invoice' => $nomorInvoice, 'from_recur_id' => $recurId]);

            successResponse([
                'invoice_id' => $newInvId,
                'nomor_invoice' => $nomorInvoice,
                'berikutnya_dibuat_at' => $nextDate
            ], "Faktur tagihan $nomorInvoice berhasil di-generate");
        } catch (\Throwable $e) {
            $pdo->rollBack();
            errorResponse('Gagal membuat tagihan berulang: ' . $e->getMessage(), 500);
        }
    }

    if ($method === 'GET') {
        $recur = $db->fetch(
            "SELECT r.*, c.nama_perusahaan as client_nama, p.nama_project 
             FROM recurring_invoices r 
             JOIN clients c ON r.client_id = c.id 
             LEFT JOIN projects p ON r.project_id = p.id 
             WHERE r.id = ?",
            [$recurId]
        );
        if (!$recur) errorResponse('Template tagihan tidak ditemukan', 404);
        $recur['items'] = json_decode($recur['data_items_json'], true) ?: [];
        successResponse($recur);
    }

    if ($method === 'PUT') {
        $recur = $db->fetch("SELECT * FROM recurring_invoices WHERE id = ?", [$recurId]);
        if (!$recur) errorResponse('Template tagihan tidak ditemukan', 404);

        $clientId = (int)($params['client_id'] ?? $recur['client_id']);
        $projectId = !empty($params['project_id']) ? (int)$params['project_id'] : null;
        $judul = trim($params['judul'] ?? '');
        $frekuensi = in_array($params['frekuensi'] ?? '', ['bulanan', 'triwulan', 'semester', 'tahunan']) ? $params['frekuensi'] : 'bulanan';
        $hariTagihan = max(1, min(28, (int)($params['hari_tagihan'] ?? 1)));
        $tanggalMulai = trim($params['tanggal_mulai'] ?? date('Y-m-d'));
        $tanggalBerakhir = !empty($params['tanggal_berakhir']) ? $params['tanggal_berakhir'] : null;
        $status = in_array($params['status'] ?? '', ['aktif', 'jeda', 'berakhir']) ? $params['status'] : 'aktif';
        $items = $params['items'] ?? [];

        if (empty($judul) || empty($items)) {
            errorResponse('Judul dan minimal 1 item layanan wajib diisi');
        }

        $itemsJson = json_encode($items, JSON_UNESCAPED_UNICODE);

        $db->execute(
            "UPDATE recurring_invoices SET client_id = ?, project_id = ?, judul = ?, frekuensi = ?, 
                    hari_tagihan = ?, tanggal_mulai = ?, tanggal_berakhir = ?, data_items_json = ?, status = ? 
             WHERE id = ?",
            [$clientId, $projectId, $judul, $frekuensi, $hariTagihan, $tanggalMulai, $tanggalBerakhir, $itemsJson, $status, $recurId]
        );

        logActivity('update', 'recurring_invoices', $recurId, $recur, $params);
        successResponse(['id' => $recurId], 'Template tagihan berulang berhasil diperbarui');
    }

    if ($method === 'DELETE') {
        $recur = $db->fetch("SELECT * FROM recurring_invoices WHERE id = ?", [$recurId]);
        if (!$recur) errorResponse('Template tagihan tidak ditemukan', 404);

        $db->execute("DELETE FROM recurring_invoices WHERE id = ?", [$recurId]);
        logActivity('delete', 'recurring_invoices', $recurId, $recur);
        successResponse(null, 'Template tagihan berhasil dihapus');
    }

    errorResponse('Metode tidak didukung', 405);
}

// Collection level: /api/recurring
if ($method === 'GET') {
    $page = (int)($params['page'] ?? 1);
    $perPage = (int)($params['per_page'] ?? PER_PAGE);
    $search = trim($params['search'] ?? '');
    $status = trim($params['status'] ?? '');

    $where = [];
    $bindings = [];

    if (!empty($search)) {
        $where[] = "(r.judul LIKE ? OR c.nama_perusahaan LIKE ?)";
        $searchPattern = "%$search%";
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
    }

    if (!empty($status)) {
        $where[] = "r.status = ?";
        $bindings[] = $status;
    }

    $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $countQuery = "SELECT COUNT(*) FROM recurring_invoices r JOIN clients c ON r.client_id = c.id $whereSql";
    $query = "SELECT r.*, c.nama_perusahaan as client_nama, p.nama_project
              FROM recurring_invoices r 
              JOIN clients c ON r.client_id = c.id 
              LEFT JOIN projects p ON r.project_id = p.id
              $whereSql 
              ORDER BY r.id DESC";

    paginatedResponse($query, $countQuery, $bindings, $page, $perPage);
}

if ($method === 'POST') {
    $clientId = (int)($params['client_id'] ?? 0);
    $projectId = !empty($params['project_id']) ? (int)$params['project_id'] : null;
    $judul = trim($params['judul'] ?? '');
    $frekuensi = in_array($params['frekuensi'] ?? '', ['bulanan', 'triwulan', 'semester', 'tahunan']) ? $params['frekuensi'] : 'bulanan';
    $hariTagihan = max(1, min(28, (int)($params['hari_tagihan'] ?? 1)));
    $tanggalMulai = trim($params['tanggal_mulai'] ?? date('Y-m-d'));
    $tanggalBerakhir = !empty($params['tanggal_berakhir']) ? $params['tanggal_berakhir'] : null;
    $status = 'aktif';
    $items = $params['items'] ?? [];

    if (!$clientId || empty($judul) || empty($items)) {
        errorResponse('Pelanggan, judul, dan minimal 1 item layanan wajib diisi');
    }

    $berikutnya = $tanggalMulai;
    $itemsJson = json_encode($items, JSON_UNESCAPED_UNICODE);

    $newId = $db->insert(
        "INSERT INTO recurring_invoices (client_id, project_id, judul, frekuensi, hari_tagihan, tanggal_mulai, tanggal_berakhir, berikutnya_dibuat_at, data_items_json, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [$clientId, $projectId, $judul, $frekuensi, $hariTagihan, $tanggalMulai, $tanggalBerakhir, $berikutnya, $itemsJson, $status]
    );

    logActivity('create', 'recurring_invoices', $newId, null, $params);
    successResponse(['id' => $newId], 'Template tagihan berulang berhasil dibuat');
}

errorResponse('Metode tidak didukung', 405);
