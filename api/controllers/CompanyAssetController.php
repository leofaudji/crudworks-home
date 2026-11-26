<?php
// api/controllers/CompanyAssetController.php
// Modul Pengelolaan Aset Internal & Langganan Cloud Pihak Luar (Company Assets & Cloud Subscriptions)

authCheck();
$db = Database::getInstance();
$pdo = $db->getPdo();

// Helper untuk menghitung tanggal perpanjangan berikutnya sesuai siklus
function calculateNextRenewalDate($currentEndDate, $siklus) {
    $date = new DateTime($currentEndDate);
    switch ($siklus) {
        case 'bulanan':
            $date->modify('+1 month');
            break;
        case 'triwulan':
            $date->modify('+3 months');
            break;
        case 'semesteran':
            $date->modify('+6 months');
            break;
        case 'tahunan':
            $date->modify('+1 year');
            break;
        case 'dua_tahunan':
            $date->modify('+2 years');
            break;
        default:
            $date->modify('+1 month');
            break;
    }
    return $date->format('Y-m-d');
}

// 1. GET: Ambil Daftar Aset atau Detail Single
if ($method === 'GET') {
    checkPermission(['asset.view', 'maintenance.view', 'settings.edit']);

    // Auto-update status kadaluwarsa secara berkala
    try {
        $db->execute("UPDATE company_assets 
            SET status = 'kadaluwarsa' 
            WHERE status != 'dihentikan' AND status != 'ditangguhkan' AND tanggal_berakhir < CURDATE()");

        $db->execute("UPDATE company_assets 
            SET status = 'segera_kadaluwarsa' 
            WHERE status != 'dihentikan' AND status != 'ditangguhkan' AND tanggal_berakhir >= CURDATE() AND DATEDIFF(tanggal_berakhir, CURDATE()) <= 30");

        $db->execute("UPDATE company_assets 
            SET status = 'aktif' 
            WHERE status != 'dihentikan' AND status != 'ditangguhkan' AND DATEDIFF(tanggal_berakhir, CURDATE()) > 30");
    } catch (\Throwable $e) {}

    // Detail single record
    if ($id && is_numeric($id)) {
        $sql = "SELECT ca.*, 
                       u.nama_lengkap as pic_nama, u.email as pic_email,
                       p.nama_project, p.kode_project,
                       DATEDIFF(ca.tanggal_berakhir, CURDATE()) as sisa_hari,
                       e.nomor_pengeluaran as last_expense_nomor
                FROM company_assets ca
                LEFT JOIN users u ON ca.pic_user_id = u.id
                LEFT JOIN projects p ON ca.project_id = p.id
                LEFT JOIN expenses e ON ca.last_expense_id = e.id
                WHERE ca.id = ?";
        $row = $db->fetch($sql, [(int)$id]);
        if (!$row) errorResponse('Aset perusahaan tidak ditemukan', 404);
        successResponse($row);
    }

    // Filter & Pencarian
    $search = trim($params['search'] ?? '');
    $kategori = trim($params['kategori'] ?? '');
    $status = trim($params['status'] ?? '');
    $provider = trim($params['provider'] ?? '');
    $expiringSoon = !empty($params['expiring_soon']) && ($params['expiring_soon'] === '1' || $params['expiring_soon'] === 'true' || $params['expiring_soon'] === true);

    $where = ["1=1"];
    $args = [];

    if ($search !== '') {
        $where[] = "(ca.nama_aset LIKE ? OR ca.provider LIKE ? OR ca.identifier LIKE ? OR ca.region LIKE ? OR ca.spesifikasi LIKE ? OR ca.akun_login LIKE ?)";
        $s = "%$search%";
        $args = array_merge($args, [$s, $s, $s, $s, $s, $s]);
    }

    if ($kategori !== '') {
        $where[] = "ca.kategori = ?";
        $args[] = $kategori;
    }

    if ($status !== '') {
        $where[] = "ca.status = ?";
        $args[] = $status;
    }

    if ($provider !== '') {
        $where[] = "ca.provider = ?";
        $args[] = $provider;
    }

    if ($expiringSoon) {
        $where[] = "ca.status != 'dihentikan' AND DATEDIFF(ca.tanggal_berakhir, CURDATE()) <= 30";
    }

    $whereSql = implode(' AND ', $where);

    // Ambil Metrik KPI Keseluruhan
    $kpiSql = "SELECT 
        COUNT(*) as total_assets,
        SUM(CASE WHEN status = 'aktif' AND DATEDIFF(tanggal_berakhir, CURDATE()) > 30 THEN 1 ELSE 0 END) as safe_count,
        SUM(CASE WHEN status = 'segera_kadaluwarsa' OR (status != 'dihentikan' AND DATEDIFF(tanggal_berakhir, CURDATE()) BETWEEN 0 AND 30) THEN 1 ELSE 0 END) as soon_count,
        SUM(CASE WHEN status = 'kadaluwarsa' OR (status != 'dihentikan' AND tanggal_berakhir < CURDATE()) THEN 1 ELSE 0 END) as expired_count,
        SUM(CASE 
            WHEN status != 'dihentikan' AND siklus = 'bulanan' THEN biaya_idr
            WHEN status != 'dihentikan' AND siklus = 'triwulan' THEN (biaya_idr / 3)
            WHEN status != 'dihentikan' AND siklus = 'semesteran' THEN (biaya_idr / 6)
            WHEN status != 'dihentikan' AND siklus = 'tahunan' THEN (biaya_idr / 12)
            WHEN status != 'dihentikan' AND siklus = 'dua_tahunan' THEN (biaya_idr / 24)
            ELSE 0 
        END) as est_monthly_burn
    FROM company_assets";
    $kpi = $db->fetch($kpiSql) ?: [
        'total_assets' => 0, 'safe_count' => 0, 'soon_count' => 0, 'expired_count' => 0, 'est_monthly_burn' => 0
    ];

    // Query Data Aset
    $sql = "SELECT ca.*, 
                   u.nama_lengkap as pic_nama,
                   p.nama_project,
                   DATEDIFF(ca.tanggal_berakhir, CURDATE()) as sisa_hari
            FROM company_assets ca
            LEFT JOIN users u ON ca.pic_user_id = u.id
            LEFT JOIN projects p ON ca.project_id = p.id
            WHERE {$whereSql}
            ORDER BY 
                CASE 
                    WHEN ca.status = 'kadaluwarsa' THEN 1
                    WHEN ca.status = 'segera_kadaluwarsa' THEN 2
                    WHEN ca.status = 'aktif' THEN 3
                    ELSE 4 
                END ASC,
                ca.tanggal_berakhir ASC";

    $items = $db->fetchAll($sql, $args);

    // Daftar unik provider untuk opsi filter dropdown
    $providers = $db->fetchAll("SELECT DISTINCT provider FROM company_assets WHERE provider IS NOT NULL AND provider != '' ORDER BY provider ASC");

    successResponse([
        'items' => $items,
        'kpi' => [
            'total_assets' => (int)($kpi['total_assets'] ?? 0),
            'safe_count' => (int)($kpi['safe_count'] ?? 0),
            'soon_count' => (int)($kpi['soon_count'] ?? 0),
            'expired_count' => (int)($kpi['expired_count'] ?? 0),
            'monthly_burn' => (float)($kpi['est_monthly_burn'] ?? 0),
            'yearly_burn' => (float)($kpi['est_monthly_burn'] ?? 0) * 12
        ],
        'providers' => array_column($providers, 'provider')
    ]);
}

// 2. POST: Tambah Aset Baru ATAU Sub-aksi (Catat Beban, dsb)
if ($method === 'POST') {
    // ==========================================
    // SUB-AKSI: CATAT KE BEBAN PENGELUARAN (1-CLICK EXPENSE)
    // ==========================================
    if ($action === 'record-expense' || ($params['action'] ?? '') === 'record-expense') {
        checkPermission(['asset.edit', 'expense.create', 'settings.edit']);
        if (!$id || !is_numeric($id)) errorResponse('ID Aset tidak valid', 400);

        $asset = $db->fetch("SELECT * FROM company_assets WHERE id = ?", [(int)$id]);
        if (!$asset) errorResponse('Aset tidak ditemukan', 404);

        // Petakan kategori aset ke kategori pengeluaran operasional
        $kategoriMapping = [
            'cloud_vps' => 'SERVER_CLOUD',
            'database_storage' => 'SERVER_CLOUD',
            'network_cdn' => 'SERVER_CLOUD',
            'domain_dns' => 'DOMAIN_SSL',
            'security_ssl' => 'DOMAIN_SSL',
            'saas_license' => 'LISENSI_SOFTWARE',
            'email_smtp' => 'LISENSI_SOFTWARE',
            'hardware_it' => 'OPERASIONAL_KANTOR',
            'lainnya' => 'BEBAN_LAINNYA'
        ];

        $targetKode = $kategoriMapping[$asset['kategori']] ?? 'SERVER_CLOUD';
        $expCat = $db->fetch("SELECT id FROM expense_categories WHERE kode = ?", [$targetKode]);
        $catId = $expCat ? (int)$expCat['id'] : 1;

        // Nomor Pengeluaran Unik EXP-YYYYMM-XXXX
        $ym = date('Ym');
        $nomorPengeluaran = generateDocNumber('expenses', 'nomor_pengeluaran', 'EXP-', 4, true, '-');

        $tglBayar = !empty($params['tanggal_bayar']) ? $params['tanggal_bayar'] : date('Y-m-d');
        $jumlahIdr = !empty($params['jumlah_idr']) ? (float)$params['jumlah_idr'] : (float)$asset['biaya_idr'];
        $paymentMethodId = !empty($params['payment_method_id']) ? (int)$params['payment_method_id'] : null;
        $autoAdvance = !empty($params['auto_advance_renewal']) && ($params['auto_advance_renewal'] === true || $params['auto_advance_renewal'] === '1');

        $judul = "Perpanjangan {$asset['provider']}: {$asset['nama_aset']} (" . ucfirst($asset['siklus']) . ")";
        $deskripsi = "Pencatatan beban otomatis dari modul Aset & Langganan Cloud.\nIdentifier: " . ($asset['identifier'] ?: '-') . "\nMata Uang Asli: {$asset['mata_uang']} " . number_format($asset['biaya'], 2);

        $pdo->beginTransaction();
        try {
            // 1. Masukkan ke tabel expenses
            $stmtExp = $pdo->prepare("INSERT INTO expenses 
                (nomor_pengeluaran, tanggal, expense_category_id, project_id, payment_method_id, judul, jumlah, penerima, deskripsi, status, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'lunas', ?)");
            $stmtExp->execute([
                $nomorPengeluaran,
                $tglBayar,
                $catId,
                $asset['project_id'],
                $paymentMethodId,
                $judul,
                $jumlahIdr,
                $asset['provider'],
                $deskripsi,
                $_SESSION['user_id'] ?? 1
            ]);
            $newExpenseId = (int)$pdo->lastInsertId();

            // 2. Perbarui aset dengan ID pengeluaran terakhir
            // Jika dicentang auto_advance, mundurkan tanggal_berakhir ke periode berikutnya
            if ($autoAdvance) {
                $nextDate = calculateNextRenewalDate($asset['tanggal_berakhir'], $asset['siklus']);
                $stmtAsset = $pdo->prepare("UPDATE company_assets 
                    SET last_expense_id = ?, tanggal_berakhir = ?, status = 'aktif' 
                    WHERE id = ?");
                $stmtAsset->execute([$newExpenseId, $nextDate, $asset['id']]);
            } else {
                $stmtAsset = $pdo->prepare("UPDATE company_assets SET last_expense_id = ? WHERE id = ?");
                $stmtAsset->execute([$newExpenseId, $asset['id']]);
            }

            $pdo->commit();

            clearCache(['expenses', 'dashboard', 'reports']);
            logActivity('INSERT', 'expenses', $newExpenseId, [
                'nomor_pengeluaran' => $nomorPengeluaran,
                'source_asset_id' => $asset['id'],
                'nama_aset' => $asset['nama_aset']
            ]);

            successResponse([
                'expense_id' => $newExpenseId,
                'nomor_pengeluaran' => $nomorPengeluaran,
                'new_renewal_date' => $autoAdvance ? $nextDate : $asset['tanggal_berakhir']
            ], "Pengeluaran {$nomorPengeluaran} berhasil dicatat ke pembukuan beban operasional");
        } catch (\Throwable $e) {
            $pdo->rollBack();
            errorResponse('Gagal mencatat pengeluaran: ' . $e->getMessage(), 500);
        }
    }

    // ==========================================
    // TAMBAH ASET BARU (CREATE)
    // ==========================================
    checkPermission(['asset.create', 'settings.edit']);

    $namaAset = trim($params['nama_aset'] ?? '');
    $provider = trim($params['provider'] ?? '');
    $kategori = trim($params['kategori'] ?? 'cloud_vps');
    $identifier = trim($params['identifier'] ?? '');
    $region = trim($params['region'] ?? '');
    $spesifikasi = trim($params['spesifikasi'] ?? '');
    $urlPortal = trim($params['url_portal'] ?? '');
    $akunLogin = trim($params['akun_login'] ?? '');
    $biaya = max(0, (float)($params['biaya'] ?? 0));
    $mataUang = strtoupper(trim($params['mata_uang'] ?? 'IDR'));
    $kursEstimasi = max(1, (float)($params['kurs_estimasi'] ?? 1));
    $siklus = trim($params['siklus'] ?? 'bulanan');
    $metodeBayar = trim($params['metode_bayar'] ?? '');
    $tanggalMulai = trim($params['tanggal_mulai'] ?? date('Y-m-d'));
    $tanggalBerakhir = trim($params['tanggal_berakhir'] ?? date('Y-m-d', strtotime('+1 month')));
    $autoRenew = !empty($params['auto_renew']) ? 1 : 0;
    $status = in_array($params['status'] ?? '', ['aktif', 'segera_kadaluwarsa', 'kadaluwarsa', 'ditangguhkan', 'dihentikan']) ? $params['status'] : 'aktif';
    $picUserId = !empty($params['pic_user_id']) ? (int)$params['pic_user_id'] : null;
    $projectId = !empty($params['project_id']) ? (int)$params['project_id'] : null;
    $catatan = trim($params['catatan'] ?? '');

    if (empty($namaAset)) errorResponse('Nama Aset wajib diisi');
    if (empty($provider)) errorResponse('Nama Provider / Vendor penyedia wajib diisi');
    if (empty($tanggalMulai) || empty($tanggalBerakhir)) errorResponse('Tanggal mulai dan tanggal jatuh tempo perpanjangan wajib ditentukan');

    // Kalkulasi nilai estimasi dalam IDR
    $biayaIdr = $mataUang === 'IDR' ? $biaya : round($biaya * $kursEstimasi, 2);

    $sql = "INSERT INTO company_assets 
        (nama_aset, kategori, provider, identifier, region, spesifikasi, url_portal, akun_login,
         biaya, mata_uang, kurs_estimasi, biaya_idr, siklus, metode_bayar, tanggal_mulai, tanggal_berakhir,
         auto_renew, status, pic_user_id, project_id, catatan)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $namaAset, $kategori, $provider, $identifier, $region, $spesifikasi, $urlPortal, $akunLogin,
            $biaya, $mataUang, $kursEstimasi, $biayaIdr, $siklus, $metodeBayar, $tanggalMulai, $tanggalBerakhir,
            $autoRenew, $status, $picUserId, $projectId, $catatan
        ]);
        $newId = (int)$pdo->lastInsertId();

        logActivity('INSERT', 'company_assets', $newId, [
            'nama_aset' => $namaAset,
            'provider' => $provider,
            'biaya_idr' => $biayaIdr
        ]);

        successResponse(['id' => $newId], 'Aset / Langganan cloud berhasil dicatat', 201);
    } catch (\Throwable $e) {
        errorResponse('Gagal menambahkan aset: ' . $e->getMessage(), 500);
    }
}

// 3. PUT: Perbarui Aset (Update)
if ($method === 'PUT') {
    checkPermission(['asset.edit', 'settings.edit']);
    if (!$id || !is_numeric($id)) errorResponse('ID Aset tidak valid', 400);

    $exist = $db->fetch("SELECT * FROM company_assets WHERE id = ?", [(int)$id]);
    if (!$exist) errorResponse('Aset tidak ditemukan', 404);

    $namaAset = trim($params['nama_aset'] ?? $exist['nama_aset']);
    $provider = trim($params['provider'] ?? $exist['provider']);
    $kategori = trim($params['kategori'] ?? $exist['kategori']);
    $identifier = trim($params['identifier'] ?? $exist['identifier']);
    $region = trim($params['region'] ?? $exist['region']);
    $spesifikasi = trim($params['spesifikasi'] ?? $exist['spesifikasi']);
    $urlPortal = trim($params['url_portal'] ?? $exist['url_portal']);
    $akunLogin = trim($params['akun_login'] ?? $exist['akun_login']);
    $biaya = isset($params['biaya']) ? max(0, (float)$params['biaya']) : (float)$exist['biaya'];
    $mataUang = isset($params['mata_uang']) ? strtoupper(trim($params['mata_uang'])) : $exist['mata_uang'];
    $kursEstimasi = isset($params['kurs_estimasi']) ? max(1, (float)$params['kurs_estimasi']) : (float)$exist['kurs_estimasi'];
    $siklus = trim($params['siklus'] ?? $exist['siklus']);
    $metodeBayar = trim($params['metode_bayar'] ?? $exist['metode_bayar']);
    $tanggalMulai = trim($params['tanggal_mulai'] ?? $exist['tanggal_mulai']);
    $tanggalBerakhir = trim($params['tanggal_berakhir'] ?? $exist['tanggal_berakhir']);
    $autoRenew = isset($params['auto_renew']) ? ($params['auto_renew'] ? 1 : 0) : $exist['auto_renew'];
    $status = in_array($params['status'] ?? '', ['aktif', 'segera_kadaluwarsa', 'kadaluwarsa', 'ditangguhkan', 'dihentikan']) ? $params['status'] : $exist['status'];
    $picUserId = isset($params['pic_user_id']) ? ($params['pic_user_id'] ? (int)$params['pic_user_id'] : null) : $exist['pic_user_id'];
    $projectId = isset($params['project_id']) ? ($params['project_id'] ? (int)$params['project_id'] : null) : $exist['project_id'];
    $catatan = trim($params['catatan'] ?? $exist['catatan']);

    $biayaIdr = $mataUang === 'IDR' ? $biaya : round($biaya * $kursEstimasi, 2);

    $sql = "UPDATE company_assets SET 
        nama_aset = ?, kategori = ?, provider = ?, identifier = ?, region = ?, spesifikasi = ?, url_portal = ?, akun_login = ?,
        biaya = ?, mata_uang = ?, kurs_estimasi = ?, biaya_idr = ?, siklus = ?, metode_bayar = ?, tanggal_mulai = ?, tanggal_berakhir = ?,
        auto_renew = ?, status = ?, pic_user_id = ?, project_id = ?, catatan = ?
        WHERE id = ?";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $namaAset, $kategori, $provider, $identifier, $region, $spesifikasi, $urlPortal, $akunLogin,
            $biaya, $mataUang, $kursEstimasi, $biayaIdr, $siklus, $metodeBayar, $tanggalMulai, $tanggalBerakhir,
            $autoRenew, $status, $picUserId, $projectId, $catatan, (int)$id
        ]);

        logActivity('UPDATE', 'company_assets', (int)$id, [
            'nama_aset' => $namaAset,
            'provider' => $provider,
            'biaya_idr' => $biayaIdr
        ]);

        successResponse(['id' => (int)$id], 'Data aset berhasil diperbarui');
    } catch (\Throwable $e) {
        errorResponse('Gagal memperbarui aset: ' . $e->getMessage(), 500);
    }
}

// 4. DELETE: Hapus Aset
if ($method === 'DELETE') {
    checkPermission(['asset.delete', 'settings.edit']);
    if (!$id || !is_numeric($id)) errorResponse('ID Aset tidak valid', 400);

    $exist = $db->fetch("SELECT * FROM company_assets WHERE id = ?", [(int)$id]);
    if (!$exist) errorResponse('Aset tidak ditemukan', 404);

    try {
        $db->execute("DELETE FROM company_assets WHERE id = ?", [(int)$id]);
        logActivity('DELETE', 'company_assets', (int)$id, ['nama_aset' => $exist['nama_aset']]);
        successResponse(['id' => (int)$id], 'Aset berhasil dihapus');
    } catch (\Throwable $e) {
        errorResponse('Gagal menghapus aset: ' . $e->getMessage(), 500);
    }
}

errorResponse('Metode HTTP tidak didukung', 405);
