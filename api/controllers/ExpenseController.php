<?php
declare(strict_types=1);

require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../middleware/rbac.php';

$db = Database::getInstance();

// 1. Get Categories List
if ($method === 'GET' && ($id === 'categories' || $action === 'categories')) {
    authCheck();
    checkPermission('expense.view');
    $categories = $db->fetchAll("SELECT * FROM expense_categories ORDER BY id ASC");
    successResponse($categories);
}

// 2. Get Expense Summary KPI
if ($method === 'GET' && ($id === 'summary' || $action === 'summary')) {
    authCheck();
    checkPermission('expense.view');

    $thisMonth = date('Y-m');
    $thisYear = date('Y');

    $totalAll = $db->fetch("SELECT COALESCE(SUM(jumlah), 0) as total FROM expenses WHERE status = 'lunas'")['total'] ?? 0;
    $totalMonth = $db->fetch("SELECT COALESCE(SUM(jumlah), 0) as total FROM expenses WHERE status = 'lunas' AND DATE_FORMAT(tanggal, '%Y-%m') = ?", [$thisMonth])['total'] ?? 0;
    $totalYear = $db->fetch("SELECT COALESCE(SUM(jumlah), 0) as total FROM expenses WHERE status = 'lunas' AND DATE_FORMAT(tanggal, '%Y') = ?", [$thisYear])['total'] ?? 0;

    $byCategory = $db->fetchAll(
        "SELECT ec.nama_kategori, ec.warna, COALESCE(SUM(e.jumlah), 0) as total
         FROM expense_categories ec
         LEFT JOIN expenses e ON ec.id = e.expense_category_id AND e.status = 'lunas'
         GROUP BY ec.id, ec.nama_kategori, ec.warna
         ORDER BY total DESC"
    );

    successResponse([
        'total_all' => (float)$totalAll,
        'total_month' => (float)$totalMonth,
        'total_year' => (float)$totalYear,
        'by_category' => $byCategory
    ]);
}

// 3. Get Single Expense Detail
if ($method === 'GET' && $id && is_numeric($id)) {
    authCheck();
    checkPermission('expense.view');

    $expense = $db->fetch(
        "SELECT e.*, ec.nama_kategori, ec.warna as kategori_warna,
                p.nama_project, c.nama_perusahaan as client_nama,
                pm.nama_bank, pm.nomor_rekening as akun_bayar,
                u.nama_lengkap as pembuat_nama
         FROM expenses e
         JOIN expense_categories ec ON e.expense_category_id = ec.id
         LEFT JOIN projects p ON e.project_id = p.id
         LEFT JOIN clients c ON p.client_id = c.id
         LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
         LEFT JOIN users u ON e.created_by = u.id
         WHERE e.id = ?",
        [(int)$id]
    );

    if (!$expense) {
        errorResponse('Data pengeluaran tidak ditemukan', 404);
    }

    successResponse($expense);
}

// 4. List Expenses (Paginated & Filtered)
if ($method === 'GET') {
    authCheck();
    checkPermission('expense.view');

    $page = max(1, (int)($params['page'] ?? 1));
    $perPage = max(1, min(100, (int)($params['per_page'] ?? PER_PAGE)));
    $offset = ($page - 1) * $perPage;

    $where = ["1=1"];
    $binds = [];

    if (!empty($params['category_id'])) {
        $where[] = "e.expense_category_id = ?";
        $binds[] = (int)$params['category_id'];
    }
    if (!empty($params['project_id'])) {
        $where[] = "e.project_id = ?";
        $binds[] = (int)$params['project_id'];
    }
    if (!empty($params['status'])) {
        $where[] = "e.status = ?";
        $binds[] = $params['status'];
    }
    if (!empty($params['start_date'])) {
        $where[] = "e.tanggal >= ?";
        $binds[] = $params['start_date'];
    }
    if (!empty($params['end_date'])) {
        $where[] = "e.tanggal <= ?";
        $binds[] = $params['end_date'];
    }
    if (!empty($params['search'])) {
        $where[] = "(e.nomor_pengeluaran LIKE ? OR e.judul LIKE ? OR e.penerima LIKE ?)";
        $term = "%{$params['search']}%";
        $binds[] = $term;
        $binds[] = $term;
        $binds[] = $term;
    }

    $whereSql = implode(' AND ', $where);

    $countRow = $db->fetch("SELECT COUNT(*) as total, COALESCE(SUM(e.jumlah), 0) as total_nominal FROM expenses e WHERE {$whereSql}", $binds);
    $total = (int)($countRow['total'] ?? 0);
    $totalNominal = (float)($countRow['total_nominal'] ?? 0);

    $sql = "SELECT e.*, ec.nama_kategori, ec.warna as kategori_warna,
                   p.nama_project, c.nama_perusahaan as client_nama,
                   pm.nama_bank, pm.nomor_rekening as akun_bayar,
                   u.nama_lengkap as pembuat_nama
            FROM expenses e
            JOIN expense_categories ec ON e.expense_category_id = ec.id
            LEFT JOIN projects p ON e.project_id = p.id
            LEFT JOIN clients c ON p.client_id = c.id
            LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
            LEFT JOIN users u ON e.created_by = u.id
            WHERE {$whereSql}
            ORDER BY e.tanggal DESC, e.id DESC
            LIMIT {$perPage} OFFSET {$offset}";

    $items = $db->fetchAll($sql, $binds);

    paginatedResponse($items, $total, $page, $perPage, [
        'filtered_total_nominal' => $totalNominal
    ]);
}

// 5. Create Expense
if ($method === 'POST') {
    authCheck();
    checkPermission('expense.manage');

    $tanggal = trim($params['tanggal'] ?? date('Y-m-d'));
    $categoryId = (int)($params['expense_category_id'] ?? 0);
    $judul = trim($params['judul'] ?? '');
    $jumlah = (float)($params['jumlah'] ?? 0);
    $penerima = trim($params['penerima'] ?? '');
    $deskripsi = trim($params['deskripsi'] ?? '');
    $projectId = !empty($params['project_id']) ? (int)$params['project_id'] : null;
    $paymentMethodId = !empty($params['payment_method_id']) ? (int)$params['payment_method_id'] : null;
    $status = in_array($params['status'] ?? '', ['lunas', 'menunggu_persetujuan']) ? $params['status'] : 'lunas';

    if (!$categoryId || empty($judul) || $jumlah <= 0) {
        errorResponse('Kategori beban, judul pengeluaran, dan nominal wajib diisi valid', 422);
    }

    // Auto-generate nomor pengeluaran: EXP-YYYYMM-XXXX
    $nomorPengeluaran = generateDocNumber('expenses', 'nomor_pengeluaran', 'EXP-', 4, true, '-');

    // Handle receipt upload if attached
    $buktiLampiran = null;
    if (!empty($params['bukti_lampiran_base64'])) {
        $b64 = $params['bukti_lampiran_base64'];
        if (preg_match('/^data:image\/(\w+);base64,/', $b64, $type)) {
            $data = substr($b64, strpos($b64, ',') + 1);
            $data = base64_decode($data);
            if ($data !== false) {
                $ext = strtolower($type[1]);
                $receiptDir = __DIR__ . '/../../uploads/receipts';
                if (!is_dir($receiptDir)) {
                    @mkdir($receiptDir, 0775, true);
                }
                $filename = 'exp_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
                file_put_contents($receiptDir . '/' . $filename, $data);
                $buktiLampiran = 'uploads/receipts/' . $filename;
            }
        }
    }

    $userId = $_SESSION['user_id'] ?? 1;
    $ppnMasukan = max(0.0, (float)($params['ppn_masukan'] ?? 0));
    $pph23Persen = max(0.0, min(100.0, (float)($params['pph23_persen'] ?? 0)));
    $pph23Nominal = isset($params['pph23_nominal']) && $params['pph23_nominal'] !== ''
        ? max(0.0, (float)$params['pph23_nominal'])
        : round($jumlah * ($pph23Persen / 100), 2);
    $noFakturPajak = trim((string)($params['nomor_faktur_pajak'] ?? '')) ?: null;

    $stmt = $db->getPdo()->prepare(
        "INSERT INTO expenses (`nomor_pengeluaran`, `tanggal`, `expense_category_id`, `project_id`, `payment_method_id`, `judul`, `jumlah`, `ppn_masukan`, `pph23_persen`, `pph23_nominal`, `nomor_faktur_pajak`, `penerima`, `deskripsi`, `bukti_lampiran`, `status`, `created_by`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $nomorPengeluaran, $tanggal, $categoryId, $projectId, $paymentMethodId,
        $judul, $jumlah, $ppnMasukan, $pph23Persen, $pph23Nominal, $noFakturPajak, $penerima, $deskripsi, $buktiLampiran, $status, $userId
    ]);
    $newId = $db->getPdo()->lastInsertId();
    postJournalForExpense((int)$newId);

    logActivity('expense.create', "Mencatat beban pengeluaran {$nomorPengeluaran}: {$judul} sebesar Rp " . number_format($jumlah, 0, ',', '.'));
    clearCache(['expenses', 'reports', 'dashboard']);

    successResponse(['id' => $newId, 'nomor_pengeluaran' => $nomorPengeluaran], 'Pengeluaran operasional berhasil dicatat', 201);
}

// 6. Update Expense
if ($method === 'PUT' && $id && is_numeric($id)) {
    authCheck();
    checkPermission('expense.manage');

    $expense = $db->fetch("SELECT * FROM expenses WHERE id = ?", [(int)$id]);
    if (!$expense) {
        errorResponse('Data pengeluaran tidak ditemukan', 404);
    }

    $tanggal = trim($params['tanggal'] ?? $expense['tanggal']);
    $categoryId = (int)($params['expense_category_id'] ?? $expense['expense_category_id']);
    $judul = trim($params['judul'] ?? $expense['judul']);
    $jumlah = isset($params['jumlah']) ? (float)$params['jumlah'] : (float)$expense['jumlah'];
    $penerima = trim($params['penerima'] ?? $expense['penerima']);
    $deskripsi = trim($params['deskripsi'] ?? $expense['deskripsi']);
    $projectId = isset($params['project_id']) ? ($params['project_id'] ? (int)$params['project_id'] : null) : $expense['project_id'];
    $paymentMethodId = isset($params['payment_method_id']) ? ($params['payment_method_id'] ? (int)$params['payment_method_id'] : null) : $expense['payment_method_id'];
    $status = in_array($params['status'] ?? '', ['lunas', 'menunggu_persetujuan', 'dibatalkan']) ? $params['status'] : $expense['status'];

    if (!$categoryId || empty($judul) || $jumlah <= 0) {
        errorResponse('Kategori beban, judul pengeluaran, dan nominal wajib diisi valid', 422);
    }

    $ppnMasukan = isset($params['ppn_masukan']) ? max(0.0, (float)$params['ppn_masukan']) : (float)($expense['ppn_masukan'] ?? 0);
    $pph23Persen = isset($params['pph23_persen']) ? max(0.0, min(100.0, (float)$params['pph23_persen'])) : (float)($expense['pph23_persen'] ?? 0);
    $pph23Nominal = isset($params['pph23_nominal']) && $params['pph23_nominal'] !== ''
        ? max(0.0, (float)$params['pph23_nominal'])
        : round($jumlah * ($pph23Persen / 100), 2);
    $noFakturPajak = array_key_exists('nomor_faktur_pajak', $params) ? (trim((string)$params['nomor_faktur_pajak']) ?: null) : ($expense['nomor_faktur_pajak'] ?? null);

    $stmt = $db->getPdo()->prepare(
        "UPDATE expenses SET `tanggal`=?, `expense_category_id`=?, `project_id`=?, `payment_method_id`=?, `judul`=?, `jumlah`=?, `ppn_masukan`=?, `pph23_persen`=?, `pph23_nominal`=?, `nomor_faktur_pajak`=?, `penerima`=?, `deskripsi`=?, `status`=? WHERE id = ?"
    );
    $stmt->execute([
        $tanggal, $categoryId, $projectId, $paymentMethodId,
        $judul, $jumlah, $ppnMasukan, $pph23Persen, $pph23Nominal, $noFakturPajak, $penerima, $deskripsi, $status, (int)$id
    ]);
    postJournalForExpense((int)$id);

    logActivity('expense.edit', "Memperbarui beban pengeluaran {$expense['nomor_pengeluaran']}");
    clearCache(['expenses', 'reports', 'dashboard']);

    successResponse(null, 'Pengeluaran operasional berhasil diperbarui');
}

// 7. Delete Expense
if ($method === 'DELETE' && $id && is_numeric($id)) {
    authCheck();
    checkPermission('expense.manage');

    $expense = $db->fetch("SELECT * FROM expenses WHERE id = ?", [(int)$id]);
    if (!$expense) {
        errorResponse('Data pengeluaran tidak ditemukan', 404);
    }

    if (!empty($expense['bukti_lampiran'])) {
        $filePath = __DIR__ . '/../../' . $expense['bukti_lampiran'];
        if (file_exists($filePath)) {
            @unlink($filePath);
        }
    }

    $db->execute("DELETE FROM expenses WHERE id = ?", [(int)$id]);

    logActivity('expense.delete', "Menghapus beban pengeluaran {$expense['nomor_pengeluaran']}: {$expense['judul']}");
    clearCache(['expenses', 'reports', 'dashboard']);

    successResponse(null, 'Pengeluaran operasional berhasil dihapus');
}
