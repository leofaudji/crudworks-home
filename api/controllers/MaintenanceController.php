<?php
declare(strict_types=1);

require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../middleware/rbac.php';

$db = Database::getInstance();

// 1. Get Single SLA / Asset Detail
if ($method === 'GET' && $id && is_numeric($id)) {
    authCheck();
    checkPermission('maintenance.view');

    $item = $db->fetch(
        "SELECT m.*, 
                c.nama_perusahaan, c.kode_klien, c.penanggung_jawab, c.email as client_email, c.telepon as client_telepon,
                p.nama_project, p.deploy_path, p.git_repo_url, p.app_url,
                DATEDIFF(m.tanggal_berakhir, CURDATE()) as sisa_hari
         FROM maintenance_sla m
         JOIN clients c ON m.client_id = c.id
         LEFT JOIN projects p ON m.project_id = p.id
         WHERE m.id = ?",
        [(int)$id]
    );

    if (!$item) {
        errorResponse('Data SLA / Aset tidak ditemukan', 404);
    }

    successResponse($item);
}

// 2. List SLA / Assets (Filtered with Expiry Urgency Alert)
if ($method === 'GET') {
    authCheck();
    checkPermission('maintenance.view');

    $page = max(1, (int)($params['page'] ?? 1));
    $perPage = max(1, min(100, (int)($params['per_page'] ?? PER_PAGE)));
    $offset = ($page - 1) * $perPage;

    $where = ["1=1"];
    $binds = [];

    if (!empty($params['jenis'])) {
        $where[] = "m.jenis = ?";
        $binds[] = $params['jenis'];
    }
    if (!empty($params['client_id'])) {
        $where[] = "m.client_id = ?";
        $binds[] = (int)$params['client_id'];
    }
    if (!empty($params['status'])) {
        $where[] = "m.status = ?";
        $binds[] = $params['status'];
    }
    if (!empty($params['expiring_soon'])) {
        $where[] = "m.tanggal_berakhir BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)";
    }
    if (!empty($params['search'])) {
        $where[] = "(m.nama_aset LIKE ? OR m.domain_name LIKE ? OR m.provider LIKE ? OR c.nama_perusahaan LIKE ?)";
        $term = "%{$params['search']}%";
        $binds[] = $term;
        $binds[] = $term;
        $binds[] = $term;
        $binds[] = $term;
    }

    $whereSql = implode(' AND ', $where);

    $countRow = $db->fetch("SELECT COUNT(*) as total FROM maintenance_sla m JOIN clients c ON m.client_id = c.id WHERE {$whereSql}", $binds);
    $total = (int)($countRow['total'] ?? 0);

    $sql = "SELECT m.*, 
                   c.nama_perusahaan, c.kode_klien, c.penanggung_jawab,
                   p.nama_project, p.app_url,
                   DATEDIFF(m.tanggal_berakhir, CURDATE()) as sisa_hari
            FROM maintenance_sla m
            JOIN clients c ON m.client_id = c.id
            LEFT JOIN projects p ON m.project_id = p.id
            WHERE {$whereSql}
            ORDER BY m.tanggal_berakhir ASC, m.id DESC
            LIMIT {$perPage} OFFSET {$offset}";

    $items = $db->fetchAll($sql, $binds);

    // Summary KPIs
    $kpis = $db->fetch(
        "SELECT 
            COUNT(CASE WHEN status = 'aktif' AND tanggal_berakhir > DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as count_safe,
            COUNT(CASE WHEN status = 'aktif' AND tanggal_berakhir BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as count_expiring_soon,
            COUNT(CASE WHEN tanggal_berakhir < CURDATE() OR status = 'kadaluwarsa' THEN 1 END) as count_expired,
            COUNT(CASE WHEN uptime_status = 'online' THEN 1 END) as count_online,
            COUNT(CASE WHEN uptime_status = 'down' THEN 1 END) as count_down,
            COUNT(CASE WHEN ssl_days_left IS NOT NULL AND ssl_days_left <= 14 AND ssl_days_left >= 0 THEN 1 END) as count_ssl_expiring,
            COALESCE(SUM(biaya_perpanjangan), 0) as total_annual_value
         FROM maintenance_sla"
    );

    paginatedResponse($items, $total, $page, $perPage, [
        'kpi' => [
            'count_safe' => (int)($kpis['count_safe'] ?? 0),
            'count_expiring_soon' => (int)($kpis['count_expiring_soon'] ?? 0),
            'count_expired' => (int)($kpis['count_expired'] ?? 0),
            'count_online' => (int)($kpis['count_online'] ?? 0),
            'count_down' => (int)($kpis['count_down'] ?? 0),
            'count_ssl_expiring' => (int)($kpis['count_ssl_expiring'] ?? 0),
            'total_annual_value' => (float)($kpis['total_annual_value'] ?? 0)
        ]
    ]);
}

// 2b. Health Check Single Target
if ($method === 'POST' && ($action === 'check-health' || ($params['action'] ?? '') === 'check-health')) {
    authCheck();
    checkPermission('maintenance.view');

    $targetId = (int)($params['id'] ?? $id);
    $item = $db->fetch(
        "SELECT m.*, p.app_url FROM maintenance_sla m LEFT JOIN projects p ON m.project_id = p.id WHERE m.id = ?",
        [$targetId]
    );

    if (!$item) {
        errorResponse('Data SLA tidak ditemukan', 404);
    }

    $rawUrl = !empty($item['domain_name']) ? $item['domain_name'] : (!empty($item['app_url']) ? $item['app_url'] : $item['ip_address']);
    if (empty($rawUrl)) {
        errorResponse('Aset tidak memiliki domain, URL, atau IP yang dapat diuji', 422);
    }

    $check = checkUptimeAndSsl($rawUrl);

    $db->execute(
        "UPDATE maintenance_sla 
         SET last_check_at = NOW(),
             http_status_code = ?,
             response_time_ms = ?,
             uptime_status = ?,
             ssl_valid_until = ?,
             ssl_days_left = ?,
             ssl_issuer = ?
         WHERE id = ?",
        [
            $check['http_code'] ?: null,
            $check['response_time_ms'] ?: null,
            $check['uptime_status'],
            $check['ssl_valid_until'],
            $check['ssl_days_left'],
            $check['ssl_issuer'],
            $targetId
        ]
    );

    // Record health log
    $db->execute(
        "INSERT INTO uptime_health_logs (target_type, target_id, url, http_code, response_time_ms, uptime_status, ssl_valid_until, ssl_days_left, ssl_issuer, error_message, checked_at)
         VALUES ('sla', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
        [
            $targetId,
            $check['url'],
            $check['http_code'] ?: null,
            $check['response_time_ms'] ?: null,
            $check['uptime_status'],
            $check['ssl_valid_until'],
            $check['ssl_days_left'],
            $check['ssl_issuer'],
            $check['error_message']
        ]
    );

    successResponse($check, "Pemeriksaan uptime & SSL untuk {$rawUrl} selesai");
}

// 2c. Health Check All Active Domains
if ($method === 'POST' && ($action === 'check-all' || ($params['action'] ?? '') === 'check-all')) {
    authCheck();
    checkPermission('maintenance.manage');

    $targets = $db->fetchAll(
        "SELECT m.id, m.nama_aset, m.domain_name, m.ip_address, p.app_url 
         FROM maintenance_sla m
         LEFT JOIN projects p ON m.project_id = p.id
         WHERE m.status IN ('aktif', 'segera_kadaluwarsa') AND (m.domain_name IS NOT NULL AND m.domain_name != '')
         LIMIT 20"
    );

    $results = [];
    foreach ($targets as $t) {
        $rawUrl = $t['domain_name'] ?: ($t['app_url'] ?: $t['ip_address']);
        $chk = checkUptimeAndSsl($rawUrl, 4);
        $db->execute(
            "UPDATE maintenance_sla 
             SET last_check_at = NOW(),
                 http_status_code = ?,
                 response_time_ms = ?,
                 uptime_status = ?,
                 ssl_valid_until = ?,
                 ssl_days_left = ?,
                 ssl_issuer = ?
             WHERE id = ?",
            [
                $chk['http_code'] ?: null,
                $chk['response_time_ms'] ?: null,
                $chk['uptime_status'],
                $chk['ssl_valid_until'],
                $chk['ssl_days_left'],
                $chk['ssl_issuer'],
                $t['id']
            ]
        );
        $results[] = [
            'id' => $t['id'],
            'nama_aset' => $t['nama_aset'],
            'url' => $rawUrl,
            'status' => $chk['uptime_status'],
            'http_code' => $chk['http_code'],
            'response_time_ms' => $chk['response_time_ms'],
            'ssl_days_left' => $chk['ssl_days_left']
        ];
    }

    successResponse([
        'total_checked' => count($results),
        'results' => $results
    ], "Berhasil memeriksa " . count($results) . " domain/server.");
}

// 3. Create SLA / Asset
if ($method === 'POST' && !$action) {
    authCheck();
    checkPermission('maintenance.manage');

    $clientId = (int)($params['client_id'] ?? 0);
    $projectId = !empty($params['project_id']) ? (int)$params['project_id'] : null;
    $jenis = trim($params['jenis'] ?? 'domain');
    $namaAset = trim($params['nama_aset'] ?? '');
    $provider = trim($params['provider'] ?? '');
    $domainName = trim($params['domain_name'] ?? '');
    $ipAddress = trim($params['ip_address'] ?? '');
    $biaya = (float)($params['biaya_perpanjangan'] ?? 0);
    $siklus = in_array($params['siklus'] ?? '', ['bulanan', 'triwulan', 'semesteran', 'tahunan', 'dua_tahunan']) ? $params['siklus'] : 'tahunan';
    $tglMulai = trim($params['tanggal_mulai'] ?? date('Y-m-d'));
    $tglBerakhir = trim($params['tanggal_berakhir'] ?? date('Y-m-d', strtotime('+1 year')));
    $autoRenew = isset($params['auto_renew']) ? (int)(bool)$params['auto_renew'] : 1;
    $catatan = trim($params['catatan'] ?? '');

    if (!$clientId || empty($namaAset) || empty($tglBerakhir)) {
        errorResponse('Pelanggan, nama aset, dan tanggal berakhir sewa wajib diisi valid', 422);
    }

    $status = 'aktif';
    $days = (int)floor((strtotime($tglBerakhir) - time()) / 86400);
    if ($days < 0) {
        $status = 'kadaluwarsa';
    } elseif ($days <= 30) {
        $status = 'segera_kadaluwarsa';
    }

    $stmt = $db->getPdo()->prepare(
        "INSERT INTO maintenance_sla (`client_id`, `project_id`, `jenis`, `nama_aset`, `provider`, `domain_name`, `ip_address`, `biaya_perpanjangan`, `siklus`, `tanggal_mulai`, `tanggal_berakhir`, `auto_renew`, `status`, `catatan`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $clientId, $projectId, $jenis, $namaAset, $provider,
        $domainName, $ipAddress, $biaya, $siklus,
        $tglMulai, $tglBerakhir, $autoRenew, $status, $catatan
    ]);
    $newId = (int)$db->getPdo()->lastInsertId();

    logActivity('maintenance.create', "Menambahkan pemantauan aset/SLA {$namaAset} ({$jenis})");
    clearCache(['maintenance']);

    successResponse(['id' => $newId], 'Aset SLA / Domain berhasil ditambahkan', 201);
}

// 4. Update SLA / Asset
if ($method === 'PUT' && $id && is_numeric($id)) {
    authCheck();
    checkPermission('maintenance.manage');

    $item = $db->fetch("SELECT * FROM maintenance_sla WHERE id = ?", [(int)$id]);
    if (!$item) {
        errorResponse('Data SLA / Aset tidak ditemukan', 404);
    }

    $clientId = (int)($params['client_id'] ?? $item['client_id']);
    $projectId = isset($params['project_id']) ? ($params['project_id'] ? (int)$params['project_id'] : null) : $item['project_id'];
    $jenis = trim($params['jenis'] ?? $item['jenis']);
    $namaAset = trim($params['nama_aset'] ?? $item['nama_aset']);
    $provider = trim($params['provider'] ?? $item['provider']);
    $domainName = trim($params['domain_name'] ?? $item['domain_name']);
    $ipAddress = trim($params['ip_address'] ?? $item['ip_address']);
    $biaya = isset($params['biaya_perpanjangan']) ? (float)$params['biaya_perpanjangan'] : (float)$item['biaya_perpanjangan'];
    $siklus = in_array($params['siklus'] ?? '', ['bulanan', 'triwulan', 'semesteran', 'tahunan', 'dua_tahunan']) ? $params['siklus'] : $item['siklus'];
    $tglMulai = trim($params['tanggal_mulai'] ?? $item['tanggal_mulai']);
    $tglBerakhir = trim($params['tanggal_berakhir'] ?? $item['tanggal_berakhir']);
    $autoRenew = isset($params['auto_renew']) ? (int)(bool)$params['auto_renew'] : $item['auto_renew'];
    $status = in_array($params['status'] ?? '', ['aktif', 'segera_kadaluwarsa', 'kadaluwarsa', 'dihentikan']) ? $params['status'] : $item['status'];
    $catatan = trim($params['catatan'] ?? $item['catatan']);

    $stmt = $db->getPdo()->prepare(
        "UPDATE maintenance_sla 
         SET `client_id`=?, `project_id`=?, `jenis`=?, `nama_aset`=?, `provider`=?, `domain_name`=?, `ip_address`=?, `biaya_perpanjangan`=?, `siklus`=?, `tanggal_mulai`=?, `tanggal_berakhir`=?, `auto_renew`=?, `status`=?, `catatan`=?
         WHERE id = ?"
    );
    $stmt->execute([
        $clientId, $projectId, $jenis, $namaAset, $provider,
        $domainName, $ipAddress, $biaya, $siklus,
        $tglMulai, $tglBerakhir, $autoRenew, $status, $catatan, (int)$id
    ]);

    logActivity('maintenance.edit', "Memperbarui aset/SLA {$namaAset}");
    clearCache(['maintenance']);

    successResponse(null, 'Data SLA / Aset berhasil diperbarui');
}

// 5. 1-Click Create Renewal Invoice from SLA / Asset
if ($method === 'POST' && $id && is_numeric($id) && $action === 'create-invoice') {
    authCheck();
    checkPermission('invoice.create');

    $item = $db->fetch(
        "SELECT m.*, c.nama_perusahaan 
         FROM maintenance_sla m
         JOIN clients c ON m.client_id = c.id
         WHERE m.id = ?",
        [(int)$id]
    );

    if (!$item) {
        errorResponse('Data SLA / Aset tidak ditemukan', 404);
    }

    if ($item['biaya_perpanjangan'] <= 0) {
        errorResponse('Biaya perpanjangan aset harus lebih besar dari 0', 422);
    }

    // Auto-generate invoice number: INV-YYYYMM-XXXX
    $prefix = 'INV-' . date('Ym') . '-';
    $lastSeq = $db->fetch("SELECT nomor_invoice FROM invoices WHERE nomor_invoice LIKE ? ORDER BY id DESC LIMIT 1", [$prefix . '%']);
    $seq = 1;
    if ($lastSeq) {
        $parts = explode('-', $lastSeq['nomor_invoice']);
        $seq = (int)end($parts) + 1;
    }
    $nomorInvoice = $prefix . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);

    $tanggalInvoice = date('Y-m-d');
    $dueDays = (int)($db->fetch("SELECT nilai FROM app_settings WHERE kunci = 'invoice_due_days'")['nilai'] ?? 14);
    $tanggalJatuhTempo = date('Y-m-d', strtotime("+{$dueDays} days"));
    $publicToken = bin2hex(random_bytes(24));

    $subtotal = (float)$item['biaya_perpanjangan'];
    $pajakPersen = getDefaultTaxPercent();
    $pajakNominal = $subtotal * ($pajakPersen / 100);
    $totalTagihan = $subtotal + $pajakNominal;
    $userId = $_SESSION['user_id'] ?? 1;

    $pdo = $db->getPdo();
    $pdo->beginTransaction();
    try {
        $stmtInv = $pdo->prepare(
            "INSERT INTO invoices (`nomor_invoice`, `public_token`, `client_id`, `project_id`, `tanggal_invoice`, `tanggal_jatuh_tempo`, `subtotal`, `diskon_tipe`, `diskon_nilai`, `pajak_persen`, `pajak_nominal`, `total_tagihan`, `total_dibayar`, `sisa_tagihan`, `status`, `catatan_klien`, `created_by`)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'nominal', 0.00, ?, ?, ?, 0.00, ?, 'dikirim', ?, ?)"
        );
        $jenisLabel = strtoupper(str_replace('_', ' ', $item['jenis']));
        $catatanKlien = "Tagihan Perpanjangan {$jenisLabel}: {$item['nama_aset']} ({$item['siklus']}) — Masa aktif s/d " . date('d/m/Y', strtotime($item['tanggal_berakhir']));
        $stmtInv->execute([
            $nomorInvoice, $publicToken, $item['client_id'], $item['project_id'],
            $tanggalInvoice, $tanggalJatuhTempo,
            $subtotal, $pajakPersen, $pajakNominal, $totalTagihan, $totalTagihan,
            $catatanKlien, $userId
        ]);
        $newInvId = (int)$pdo->lastInsertId();

        $stmtItem = $pdo->prepare(
            "INSERT INTO invoice_items (`invoice_id`, `deskripsi`, `kuantitas`, `satuan`, `harga_satuan`, `total_harga`, `urutan`)
             VALUES (?, ?, 1.00, ?, ?, ?, 1)"
        );
        $stmtItem->execute([
            $newInvId,
            "Perpanjangan {$jenisLabel} - {$item['nama_aset']} (Siklus: {$item['siklus']})",
            $item['siklus'],
            $subtotal,
            $subtotal
        ]);

        $pdo->commit();

        logActivity('maintenance.invoice', "Menerbitkan faktur perpanjangan {$nomorInvoice} untuk aset {$item['nama_aset']}");
        clearCache(['invoices', 'dashboard']);

        successResponse([
            'invoice_id' => $newInvId,
            'nomor_invoice' => $nomorInvoice,
            'public_token' => $publicToken
        ], "Faktur perpanjangan {$nomorInvoice} berhasil diterbitkan!");
    } catch (\Throwable $e) {
        $pdo->rollBack();
        errorResponse('Gagal membuat faktur perpanjangan: ' . $e->getMessage(), 500);
    }
}

// 6. Delete SLA / Asset
if ($method === 'DELETE' && $id && is_numeric($id)) {
    authCheck();
    checkPermission('maintenance.manage');

    $item = $db->fetch("SELECT * FROM maintenance_sla WHERE id = ?", [(int)$id]);
    if (!$item) {
        errorResponse('Data SLA / Aset tidak ditemukan', 404);
    }

    $db->execute("DELETE FROM maintenance_sla WHERE id = ?", [(int)$id]);

    logActivity('maintenance.delete', "Menghapus aset/SLA {$item['nama_aset']}");
    clearCache(['maintenance']);

    successResponse(null, 'Data SLA / Aset berhasil dihapus');
}
