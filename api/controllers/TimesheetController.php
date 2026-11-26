<?php
declare(strict_types=1);

require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../middleware/rbac.php';

$db = Database::getInstance();

// 1. Get Single Timesheet Detail
if ($method === 'GET' && $id && is_numeric($id)) {
    authCheck();
    checkPermission('timesheet.view');

    $ts = $db->fetch(
        "SELECT t.*, u.nama_lengkap as user_nama,
                p.nama_project, c.nama_perusahaan as client_nama,
                inv.nomor_invoice
         FROM timesheets t
         JOIN users u ON t.user_id = u.id
         JOIN projects p ON t.project_id = p.id
         JOIN clients c ON t.client_id = c.id
         LEFT JOIN invoices inv ON t.invoice_id = inv.id
         WHERE t.id = ?",
        [(int)$id]
    );

    if (!$ts) {
        errorResponse('Data timesheet tidak ditemukan', 404);
    }

    successResponse($ts);
}

// 2. List Timesheets (Filtered with Total Hours & Billable Calculations)
if ($method === 'GET') {
    authCheck();
    checkPermission('timesheet.view');

    $page = max(1, (int)($params['page'] ?? 1));
    $perPage = max(1, min(100, (int)($params['per_page'] ?? PER_PAGE)));
    $offset = ($page - 1) * $perPage;

    $where = ["1=1"];
    $binds = [];

    if (!empty($params['user_id'])) {
        $where[] = "t.user_id = ?";
        $binds[] = (int)$params['user_id'];
    }
    if (!empty($params['project_id'])) {
        $where[] = "t.project_id = ?";
        $binds[] = (int)$params['project_id'];
    }
    if (!empty($params['client_id'])) {
        $where[] = "t.client_id = ?";
        $binds[] = (int)$params['client_id'];
    }
    if (!empty($params['status'])) {
        $where[] = "t.status = ?";
        $binds[] = $params['status'];
    }
    if (isset($params['is_billable']) && $params['is_billable'] !== '') {
        $where[] = "t.is_billable = ?";
        $binds[] = (int)$params['is_billable'];
    }
    if (!empty($params['start_date'])) {
        $where[] = "t.tanggal >= ?";
        $binds[] = $params['start_date'];
    }
    if (!empty($params['end_date'])) {
        $where[] = "t.tanggal <= ?";
        $binds[] = $params['end_date'];
    }
    if (!empty($params['search'])) {
        $where[] = "(t.deskripsi_tugas LIKE ? OR p.nama_project LIKE ? OR u.nama_lengkap LIKE ?)";
        $term = "%{$params['search']}%";
        $binds[] = $term;
        $binds[] = $term;
        $binds[] = $term;
    }

    $whereSql = implode(' AND ', $where);

    $countRow = $db->fetch("SELECT COUNT(*) as total FROM timesheets t JOIN projects p ON t.project_id = p.id JOIN users u ON t.user_id = u.id WHERE {$whereSql}", $binds);
    $total = (int)($countRow['total'] ?? 0);

    $sql = "SELECT t.*, u.nama_lengkap as user_nama,
                   p.nama_project, c.nama_perusahaan as client_nama,
                   inv.nomor_invoice,
                   ROUND(t.durasi_menit / 60, 2) as durasi_jam,
                   ROUND((t.durasi_menit / 60) * t.billing_rate_per_jam, 2) as nilai_billing
            FROM timesheets t
            JOIN users u ON t.user_id = u.id
            JOIN projects p ON t.project_id = p.id
            JOIN clients c ON t.client_id = c.id
            LEFT JOIN invoices inv ON t.invoice_id = inv.id
            WHERE {$whereSql}
            ORDER BY t.tanggal DESC, t.id DESC
            LIMIT {$perPage} OFFSET {$offset}";

    $items = $db->fetchAll($sql, $binds);

    // Summary calculations
    $kpiRow = $db->fetch(
        "SELECT 
            COALESCE(SUM(durasi_menit), 0) as total_menit,
            COALESCE(SUM(CASE WHEN is_billable = 1 THEN durasi_menit ELSE 0 END), 0) as total_billable_menit,
            COALESCE(SUM(CASE WHEN is_billable = 1 AND status != 'sudah_ditagih' THEN (durasi_menit / 60) * billing_rate_per_jam ELSE 0 END), 0) as unbilled_amount,
            COUNT(CASE WHEN status = 'draft' THEN 1 END) as count_draft
         FROM timesheets t
         WHERE {$whereSql}",
        $binds
    );

    $totalJam = round(((int)($kpiRow['total_menit'] ?? 0)) / 60, 1);
    $billableJam = round(((int)($kpiRow['total_billable_menit'] ?? 0)) / 60, 1);
    $unbilledAmt = (float)($kpiRow['unbilled_amount'] ?? 0);

    paginatedResponse($items, $total, $page, $perPage, [
        'kpi' => [
            'total_jam' => $totalJam,
            'billable_jam' => $billableJam,
            'unbilled_amount' => $unbilledAmt,
            'count_draft' => (int)($kpiRow['count_draft'] ?? 0)
        ]
    ]);
}

// 3. Create Timesheet Entry
if ($method === 'POST' && !$action) {
    authCheck();
    checkPermission('timesheet.manage');

    $projectId = (int)($params['project_id'] ?? 0);
    $tanggal = trim($params['tanggal'] ?? date('Y-m-d'));
    $jamMulai = !empty($params['jam_mulai']) ? trim($params['jam_mulai']) : null;
    $jamSelesai = !empty($params['jam_selesai']) ? trim($params['jam_selesai']) : null;
    $durasiMenit = (int)($params['durasi_menit'] ?? 0);
    $deskripsi = trim($params['deskripsi_tugas'] ?? '');
    $rate = (float)($params['billing_rate_per_jam'] ?? 0);
    $isBillable = isset($params['is_billable']) ? (int)(bool)$params['is_billable'] : 1;
    $status = in_array($params['status'] ?? '', ['draft', 'disetujui']) ? $params['status'] : 'disetujui';

    // Auto-calculate duration from start & end time if provided and duration is 0
    if ($durasiMenit <= 0 && $jamMulai && $jamSelesai) {
        $t1 = strtotime("2000-01-01 $jamMulai");
        $t2 = strtotime("2000-01-01 $jamSelesai");
        if ($t2 > $t1) {
            $durasiMenit = (int)round(($t2 - $t1) / 60);
        }
    }

    if (!$projectId || empty($deskripsi) || $durasiMenit <= 0) {
        errorResponse('Proyek, deskripsi tugas, dan durasi kerja wajib diisi valid', 422);
    }

    // Resolve client from project
    $project = $db->fetch("SELECT * FROM projects WHERE id = ?", [$projectId]);
    if (!$project) {
        errorResponse('Proyek tidak ditemukan', 404);
    }
    $clientId = (int)$project['client_id'];

    $userId = !empty($params['user_id']) ? (int)$params['user_id'] : ($_SESSION['user_id'] ?? 1);

    $stmt = $db->getPdo()->prepare(
        "INSERT INTO timesheets (`user_id`, `project_id`, `client_id`, `tanggal`, `jam_mulai`, `jam_selesai`, `durasi_menit`, `deskripsi_tugas`, `billing_rate_per_jam`, `is_billable`, `status`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $userId, $projectId, $clientId, $tanggal, $jamMulai, $jamSelesai,
        $durasiMenit, $deskripsi, $rate, $isBillable, $status
    ]);
    $newId = (int)$db->getPdo()->lastInsertId();

    logActivity('timesheet.create', "Mencatat jam kerja: {$deskripsi} ({$durasiMenit} menit) pada proyek {$project['nama_project']}");
    clearCache(['timesheets']);

    successResponse(['id' => $newId], 'Log jam kerja berhasil dicatat', 201);
}

// 4. Update Timesheet Entry
if ($method === 'PUT' && $id && is_numeric($id)) {
    authCheck();
    checkPermission('timesheet.manage');

    $ts = $db->fetch("SELECT * FROM timesheets WHERE id = ?", [(int)$id]);
    if (!$ts) {
        errorResponse('Data timesheet tidak ditemukan', 404);
    }

    if ($ts['status'] === 'sudah_ditagih') {
        errorResponse('Timesheet yang sudah ditagihkan ke faktur tidak dapat diubah lagi', 400);
    }

    $projectId = (int)($params['project_id'] ?? $ts['project_id']);
    $tanggal = trim($params['tanggal'] ?? $ts['tanggal']);
    $jamMulai = isset($params['jam_mulai']) ? trim($params['jam_mulai']) : $ts['jam_mulai'];
    $jamSelesai = isset($params['jam_selesai']) ? trim($params['jam_selesai']) : $ts['jam_selesai'];
    $durasiMenit = isset($params['durasi_menit']) ? (int)$params['durasi_menit'] : $ts['durasi_menit'];
    $deskripsi = trim($params['deskripsi_tugas'] ?? $ts['deskripsi_tugas']);
    $rate = isset($params['billing_rate_per_jam']) ? (float)$params['billing_rate_per_jam'] : (float)$ts['billing_rate_per_jam'];
    $isBillable = isset($params['is_billable']) ? (int)(bool)$params['is_billable'] : $ts['is_billable'];
    $status = in_array($params['status'] ?? '', ['draft', 'disetujui']) ? $params['status'] : $ts['status'];

    $stmt = $db->getPdo()->prepare(
        "UPDATE timesheets 
         SET `project_id`=?, `tanggal`=?, `jam_mulai`=?, `jam_selesai`=?, `durasi_menit`=?, `deskripsi_tugas`=?, `billing_rate_per_jam`=?, `is_billable`=?, `status`=?
         WHERE id = ?"
    );
    $stmt->execute([
        $projectId, $tanggal, $jamMulai, $jamSelesai,
        $durasiMenit, $deskripsi, $rate, $isBillable, $status, (int)$id
    ]);

    logActivity('timesheet.edit', "Memperbarui log jam kerja #{$id}");
    clearCache(['timesheets']);

    successResponse(null, 'Log jam kerja berhasil diperbarui');
}

// 5. 1-Click Generate Consolidated Invoice from Timesheets
if ($method === 'POST' && $action === 'generate-invoice') {
    authCheck();
    checkPermission('invoice.create');

    $timesheetIds = $params['timesheet_ids'] ?? [];
    if (empty($timesheetIds) || !is_array($timesheetIds)) {
        errorResponse('Pilih minimal satu baris timesheet untuk ditagihkan', 422);
    }

    $inPlaceholders = implode(',', array_fill(0, count($timesheetIds), '?'));
    $timesheets = $db->fetchAll(
        "SELECT t.*, p.nama_project, c.nama_perusahaan 
         FROM timesheets t 
         JOIN projects p ON t.project_id = p.id
         JOIN clients c ON t.client_id = c.id
         WHERE t.id IN ({$inPlaceholders}) AND t.is_billable = 1 AND t.status != 'sudah_ditagih'",
        $timesheetIds
    );

    if (empty($timesheets)) {
        errorResponse('Tidak ada timesheet terpilih yang memenuhi syarat penagihan', 400);
    }

    $clientId = $timesheets[0]['client_id'];
    $projectId = $timesheets[0]['project_id'];

    // Auto-generate invoice number: INV-YYYYMM-XXXX
    $nomorInvoice = generateInvoiceNo('INV-');

    $tanggalInvoice = date('Y-m-d');
    $dueDays = (int)($db->fetch("SELECT nilai FROM app_settings WHERE kunci = 'invoice_due_days'")['nilai'] ?? 14);
    $tanggalJatuhTempo = date('Y-m-d', strtotime("+{$dueDays} days"));
    $publicToken = bin2hex(random_bytes(24));
    $userId = $_SESSION['user_id'] ?? 1;

    // Calculate subtotal from timesheets
    $subtotal = 0;
    $itemsData = [];
    foreach ($timesheets as $idx => $t) {
        $jam = round($t['durasi_menit'] / 60, 2);
        $totalHarga = round($jam * (float)$t['billing_rate_per_jam'], 2);
        $subtotal += $totalHarga;

        $itemsData[] = [
            'deskripsi' => "Pengembangan {$t['nama_project']}: {$t['deskripsi_tugas']} (" . date('d/m/Y', strtotime($t['tanggal'])) . ")",
            'kuantitas' => $jam,
            'satuan' => 'jam',
            'harga_satuan' => (float)$t['billing_rate_per_jam'],
            'total_harga' => $totalHarga,
            'urutan' => $idx + 1
        ];
    }

    $pajakPersen = getDefaultTaxPercent();
    $pajakNominal = $subtotal * ($pajakPersen / 100);
    $totalTagihan = $subtotal + $pajakNominal;

    $pdo = $db->getPdo();
    $pdo->beginTransaction();
    try {
        $stmtInv = $pdo->prepare(
            "INSERT INTO invoices (`nomor_invoice`, `public_token`, `client_id`, `project_id`, `tanggal_invoice`, `tanggal_jatuh_tempo`, `subtotal`, `diskon_tipe`, `diskon_nilai`, `pajak_persen`, `pajak_nominal`, `total_tagihan`, `total_dibayar`, `sisa_tagihan`, `status`, `catatan_klien`, `created_by`)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'nominal', 0.00, ?, ?, ?, 0.00, ?, 'dikirim', ?, ?)"
        );
        $catatanKlien = "Penagihan Jam Kerja Proyek {$timesheets[0]['nama_project']} (" . count($timesheets) . " sesi kerja tercatat)";
        $stmtInv->execute([
            $nomorInvoice, $publicToken, $clientId, $projectId,
            $tanggalInvoice, $tanggalJatuhTempo,
            $subtotal, $pajakPersen, $pajakNominal, $totalTagihan, $totalTagihan,
            $catatanKlien, $userId
        ]);
        $newInvId = (int)$pdo->lastInsertId();

        // Insert items
        $stmtItem = $pdo->prepare(
            "INSERT INTO invoice_items (`invoice_id`, `deskripsi`, `kuantitas`, `satuan`, `harga_satuan`, `total_harga`, `urutan`)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        foreach ($itemsData as $it) {
            $stmtItem->execute([
                $newInvId, $it['deskripsi'], $it['kuantitas'], $it['satuan'], $it['harga_satuan'], $it['total_harga'], $it['urutan']
            ]);
        }

        // Update timesheets as invoiced
        $matchedIds = array_column($timesheets, 'id');
        $inMatched = implode(',', array_fill(0, count($matchedIds), '?'));
        $stmtUpdateTs = $pdo->prepare(
            "UPDATE timesheets SET `status` = 'sudah_ditagih', `invoice_id` = ? WHERE id IN ({$inMatched})"
        );
        $stmtUpdateTs->execute(array_merge([$newInvId], $matchedIds));

        $pdo->commit();

        logActivity('timesheet.invoice', "Menerbitkan faktur jam kerja {$nomorInvoice} dari " . count($timesheets) . " entri timesheet");
        clearCache(['timesheets', 'invoices', 'dashboard']);

        successResponse([
            'invoice_id' => $newInvId,
            'nomor_invoice' => $nomorInvoice,
            'public_token' => $publicToken
        ], "Faktur penagihan jam kerja {$nomorInvoice} berhasil diterbitkan!");
    } catch (\Throwable $e) {
        $pdo->rollBack();
        errorResponse('Gagal membuat faktur dari jam kerja: ' . $e->getMessage(), 500);
    }
}

// 6. Delete Timesheet Entry
if ($method === 'DELETE' && $id && is_numeric($id)) {
    authCheck();
    checkPermission('timesheet.manage');

    $ts = $db->fetch("SELECT * FROM timesheets WHERE id = ?", [(int)$id]);
    if (!$ts) {
        errorResponse('Data timesheet tidak ditemukan', 404);
    }

    if ($ts['status'] === 'sudah_ditagih') {
        errorResponse('Timesheet yang sudah ditagihkan ke faktur tidak dapat dihapus', 400);
    }

    $db->execute("DELETE FROM timesheets WHERE id = ?", [(int)$id]);

    logActivity('timesheet.delete', "Menghapus log jam kerja #{$id}");
    clearCache(['timesheets']);

    successResponse(null, 'Log jam kerja berhasil dihapus');
}
