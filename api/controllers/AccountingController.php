<?php
declare(strict_types=1);

// AccountingController.php — Master COA, Jurnal Umum, Buku Besar, dan Neraca Keuangan
authCheck();
checkPermission('report.view');
$db = Database::getInstance();

$accRespond = initReportCache(
    'accounting',
    (string)$id,
    $params,
    ['start_date', 'end_date', 'as_of', 'coa_id', 'search', 'sumber'],
    $method === 'GET'
);

// 1. MASTER COA (/api/accounting/coa)
if ($id === 'coa') {
    if ($method === 'GET') {
        $rows = $db->fetchAll(
            "SELECT coa.*,
                    COALESCE((SELECT SUM(ji.debit) FROM journal_items ji WHERE ji.coa_id = coa.id), 0) as total_debit,
                    COALESCE((SELECT SUM(ji.kredit) FROM journal_items ji WHERE ji.coa_id = coa.id), 0) as total_kredit
             FROM chart_of_accounts coa
             ORDER BY coa.kode_akun ASC"
        );
        foreach ($rows as &$r) {
            $d = (float)$r['total_debit'];
            $k = (float)$r['total_kredit'];
            $r['saldo'] = ($r['saldo_normal'] === 'debit') ? ($d - $k) : ($k - $d);
        }
        unset($r);
        $accRespond($rows);
    }

    if ($method === 'POST') {
        $kode = strtoupper(trim((string)($params['kode_akun'] ?? '')));
        $nama = trim((string)($params['nama_akun'] ?? ''));
        $tipe = in_array($params['tipe_akun'] ?? '', ['aset', 'kewajiban', 'ekuitas', 'pendapatan', 'beban'], true) ? $params['tipe_akun'] : 'aset';
        $normal = in_array($params['saldo_normal'] ?? '', ['debit', 'kredit'], true)
            ? $params['saldo_normal']
            : (in_array($tipe, ['aset', 'beban'], true) ? 'debit' : 'kredit');
        $status = in_array($params['status'] ?? '', ['aktif', 'nonaktif'], true) ? $params['status'] : 'aktif';
        $ket = trim((string)($params['keterangan'] ?? '')) ?: null;

        if ($kode === '' || $nama === '') errorResponse('Kode akun dan nama akun wajib diisi', 422);

        $coaId = !empty($params['id']) ? (int)$params['id'] : 0;
        if ($coaId > 0) {
            $db->execute(
                "UPDATE chart_of_accounts SET kode_akun = ?, nama_akun = ?, tipe_akun = ?, saldo_normal = ?, status = ?, keterangan = ? WHERE id = ?",
                [$kode, $nama, $tipe, $normal, $status, $ket, $coaId]
            );
            clearCache(['accounting', 'reports', 'dashboard']);
            logActivity('coa.update', 'chart_of_accounts', $coaId, null, ['kode' => $kode, 'nama' => $nama]);
            successResponse(['id' => $coaId], 'Akun COA berhasil diperbarui');
        } else {
            $newId = $db->insert(
                "INSERT INTO chart_of_accounts (kode_akun, nama_akun, tipe_akun, saldo_normal, is_system, status, keterangan) VALUES (?, ?, ?, ?, 0, ?, ?)",
                [$kode, $nama, $tipe, $normal, $status, $ket]
            );
            clearCache(['accounting', 'reports', 'dashboard']);
            logActivity('coa.create', 'chart_of_accounts', (int)$newId, null, ['kode' => $kode, 'nama' => $nama]);
            successResponse(['id' => (int)$newId], 'Akun COA baru berhasil ditambahkan', 201);
        }
    }

    if ($method === 'DELETE' && $action && is_numeric($action)) {
        $coaId = (int)$action;
        $coa = $db->fetch("SELECT * FROM chart_of_accounts WHERE id = ?", [$coaId]);
        if (!$coa) errorResponse('Akun COA tidak ditemukan', 404);
        if ((int)$coa['is_system'] === 1) errorResponse('Akun sistem bawaan tidak dapat dihapus', 422);
        $used = (int)$db->count("SELECT COUNT(*) FROM journal_items WHERE coa_id = ?", [$coaId]);
        if ($used > 0) errorResponse('Akun sudah memiliki transaksi di jurnal dan tidak bisa dihapus', 422);

        $db->execute("DELETE FROM chart_of_accounts WHERE id = ?", [$coaId]);
        clearCache(['accounting', 'reports', 'dashboard']);
        successResponse(null, 'Akun COA berhasil dihapus');
    }

    errorResponse('Metode COA tidak didukung', 405);
}

// 2. SINKRONKAN TRANSAKSI EXISTING KE JURNAL (/api/accounting/sync-existing)
if ($id === 'sync-existing' && $method === 'POST') {
    $res = syncAllExistingTransactionsToJournals();
    clearCache(['accounting', 'reports', 'dashboard']);
    logActivity('accounting.sync', 'journal_entries', 0, null, $res);
    successResponse($res, "Sinkronisasi selesai: {$res['invoices']} faktur, {$res['payments']} pembayaran, {$res['expenses']} pengeluaran.");
}

// 3. JURNAL UMUM (/api/accounting/journals)
if ($id === 'journals') {
    if ($method === 'GET') {
        $startDate = trim((string)($params['start_date'] ?? ''));
        $endDate = trim((string)($params['end_date'] ?? ''));
        $sumber = trim((string)($params['sumber_tipe'] ?? ''));
        $search = trim((string)($params['search'] ?? ''));

        $where = ['1=1'];
        $binds = [];
        if ($startDate !== '') {
            $where[] = 'je.tanggal >= ?';
            $binds[] = $startDate;
        }
        if ($endDate !== '') {
            $where[] = 'je.tanggal <= ?';
            $binds[] = $endDate;
        }
        if (in_array($sumber, ['manual', 'invoice', 'payment', 'expense'], true)) {
            $where[] = 'je.sumber_tipe = ?';
            $binds[] = $sumber;
        }
        if ($search !== '') {
            $term = "%{$search}%";
            $where[] = "(je.nomor_jurnal LIKE ? OR je.deskripsi LIKE ? OR EXISTS (SELECT 1 FROM journal_items ji2 JOIN chart_of_accounts c2 ON ji2.coa_id = c2.id WHERE ji2.journal_id = je.id AND (c2.kode_akun LIKE ? OR c2.nama_akun LIKE ?)))";
            array_push($binds, $term, $term, $term, $term);
        }

        $entries = $db->fetchAll(
            "SELECT je.* FROM journal_entries je WHERE " . implode(' AND ', $where) . " ORDER BY je.tanggal DESC, je.id DESC LIMIT 150",
            $binds
        );

        if (!empty($entries)) {
            $ids = array_map(fn($e) => (int)$e['id'], $entries);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $items = $db->fetchAll(
                "SELECT ji.*, coa.kode_akun, coa.nama_akun, coa.tipe_akun
                 FROM journal_items ji
                 JOIN chart_of_accounts coa ON ji.coa_id = coa.id
                 WHERE ji.journal_id IN ({$placeholders})
                 ORDER BY ji.id ASC",
                $ids
            );
            $byJournal = [];
            foreach ($items as $it) {
                $byJournal[(int)$it['journal_id']][] = $it;
            }
            foreach ($entries as &$e) {
                $e['items'] = $byJournal[(int)$e['id']] ?? [];
            }
            unset($e);
        }

        successResponse($entries);
    }

    if ($method === 'POST') {
        $tanggal = trim((string)($params['tanggal'] ?? date('Y-m-d')));
        if (isPeriodClosed($tanggal)) {
            errorResponse('Periode akuntansi untuk tanggal ini sudah ditutup buku (closed)', 422);
        }
        $deskripsi = trim((string)($params['deskripsi'] ?? ''));
        $items = $params['items'] ?? [];
        if ($deskripsi === '' || !is_array($items) || count($items) < 2) {
            errorResponse('Deskripsi dan minimal 2 baris jurnal (Debit & Kredit) wajib diisi', 422);
        }

        $totD = 0.0;
        $totK = 0.0;
        $clean = [];
        foreach ($items as $it) {
            $coaId = (int)($it['coa_id'] ?? 0);
            $d = round(max(0.0, (float)($it['debit'] ?? 0)), 2);
            $k = round(max(0.0, (float)($it['kredit'] ?? 0)), 2);
            if ($coaId <= 0 || ($d <= 0 && $k <= 0)) continue;
            $totD += $d;
            $totK += $k;
            $clean[] = [
                'coa_id' => $coaId,
                'debit' => $d,
                'kredit' => $k,
                'keterangan' => mb_substr(trim((string)($it['keterangan'] ?? '')), 0, 255) ?: null,
            ];
        }

        if (count($clean) < 2 || abs($totD - $totK) > 0.01 || $totD <= 0) {
            errorResponse('Total Debit dan Total Kredit harus seimbang (balance) dan lebih dari 0', 422);
        }

        $pdo = $db->getPdo();
        $pdo->beginTransaction();
        try {
            $no = generateJournalNumber($tanggal);
            $userId = !empty($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
            $pdo->prepare(
                "INSERT INTO journal_entries (nomor_jurnal, tanggal, deskripsi, sumber_tipe, total_debit, total_kredit, created_by)
                 VALUES (?, ?, ?, 'manual', ?, ?, ?)"
            )->execute([$no, $tanggal, $deskripsi, $totD, $totK, $userId]);
            $jId = (int)$pdo->lastInsertId();

            $stmtIt = $pdo->prepare("INSERT INTO journal_items (journal_id, coa_id, debit, kredit, keterangan) VALUES (?, ?, ?, ?, ?)");
            foreach ($clean as $cl) {
                $stmtIt->execute([$jId, $cl['coa_id'], $cl['debit'], $cl['kredit'], $cl['keterangan']]);
            }
            $pdo->commit();
            clearCache(['accounting', 'reports', 'dashboard']);
            logActivity('journal.create', 'journal_entries', $jId, null, ['nomor' => $no, 'total' => $totD]);
            successResponse(['id' => $jId, 'nomor_jurnal' => $no], 'Jurnal manual berhasil dicatat', 201);
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            errorResponse('Gagal menyimpan jurnal: ' . $e->getMessage(), 500);
        }
    }

    if ($method === 'DELETE' && $action && is_numeric($action)) {
        $jId = (int)$action;
        $je = $db->fetch("SELECT * FROM journal_entries WHERE id = ?", [$jId]);
        if (!$je) errorResponse('Jurnal tidak ditemukan', 404);
        if ($je['sumber_tipe'] !== 'manual') {
            errorResponse('Jurnal otomatis dari transaksi ERP tidak dapat dihapus langsung', 422);
        }
        $db->execute("DELETE FROM journal_entries WHERE id = ?", [$jId]);
        clearCache(['accounting', 'reports', 'dashboard']);
        successResponse(null, 'Jurnal manual berhasil dihapus');
    }

    errorResponse('Metode Jurnal tidak didukung', 405);
}

// 4. BUKU BESAR (/api/accounting/ledger?coa_id=...)
if ($id === 'ledger' && $method === 'GET') {
    $coaId = (int)($params['coa_id'] ?? 0);
    if ($coaId <= 0) {
        $first = $db->fetch("SELECT id FROM chart_of_accounts ORDER BY kode_akun ASC LIMIT 1");
        $coaId = $first ? (int)$first['id'] : 0;
    }
    $account = $db->fetch("SELECT * FROM chart_of_accounts WHERE id = ?", [$coaId]);
    if (!$account) errorResponse('Akun COA tidak ditemukan', 404);

    $startDate = trim((string)($params['start_date'] ?? date('Y-01-01')));
    $endDate = trim((string)($params['end_date'] ?? date('Y-m-d')));

    $openRow = $db->fetch(
        "SELECT COALESCE(SUM(ji.debit), 0) as d, COALESCE(SUM(ji.kredit), 0) as k
         FROM journal_items ji
         JOIN journal_entries je ON ji.journal_id = je.id
         WHERE ji.coa_id = ? AND je.tanggal < ?",
        [$coaId, $startDate]
    );
    $openD = (float)($openRow['d'] ?? 0);
    $openK = (float)($openRow['k'] ?? 0);
    $openingBalance = ($account['saldo_normal'] === 'debit') ? ($openD - $openK) : ($openK - $openD);

    $rows = $db->fetchAll(
        "SELECT je.tanggal, je.nomor_jurnal, je.deskripsi, je.sumber_tipe, ji.debit, ji.kredit, ji.keterangan
         FROM journal_items ji
         JOIN journal_entries je ON ji.journal_id = je.id
         WHERE ji.coa_id = ? AND je.tanggal BETWEEN ? AND ?
         ORDER BY je.tanggal ASC, je.id ASC, ji.id ASC",
        [$coaId, $startDate, $endDate]
    );

    $running = $openingBalance;
    $totD = 0.0;
    $totK = 0.0;
    foreach ($rows as &$r) {
        $d = (float)$r['debit'];
        $k = (float)$r['kredit'];
        $totD += $d;
        $totK += $k;
        $running += ($account['saldo_normal'] === 'debit') ? ($d - $k) : ($k - $d);
        $r['saldo'] = round($running, 2);
    }
    unset($r);

    $accRespond([
        'account' => $account,
        'start_date' => $startDate,
        'end_date' => $endDate,
        'opening_balance' => round($openingBalance, 2),
        'entries' => $rows,
        'total_debit' => round($totD, 2),
        'total_kredit' => round($totK, 2),
        'closing_balance' => round($running, 2),
    ]);
}

// 5. NERACA KEUANGAN / BALANCE SHEET (/api/accounting/balance-sheet?as_of=...)
if ($id === 'balance-sheet' && $method === 'GET') {
    $asOf = trim((string)($params['as_of'] ?? date('Y-m-d')));
    $rows = $db->fetchAll(
        "SELECT coa.id, coa.kode_akun, coa.nama_akun, coa.tipe_akun, coa.saldo_normal,
                COALESCE(SUM(CASE WHEN je.tanggal <= ? THEN ji.debit ELSE 0 END), 0) as sum_debit,
                COALESCE(SUM(CASE WHEN je.tanggal <= ? THEN ji.kredit ELSE 0 END), 0) as sum_kredit
         FROM chart_of_accounts coa
         LEFT JOIN journal_items ji ON ji.coa_id = coa.id
         LEFT JOIN journal_entries je ON ji.journal_id = je.id
         WHERE coa.status = 'aktif'
         GROUP BY coa.id, coa.kode_akun, coa.nama_akun, coa.tipe_akun, coa.saldo_normal
         ORDER BY coa.kode_akun ASC",
        [$asOf, $asOf]
    );

    $aset = [];
    $kewajiban = [];
    $ekuitas = [];
    $totAset = 0.0;
    $totKewajiban = 0.0;
    $totEkuitas = 0.0;
    $totPendapatan = 0.0;
    $totBeban = 0.0;

    foreach ($rows as $r) {
        $d = (float)$r['sum_debit'];
        $k = (float)$r['sum_kredit'];
        $saldo = ($r['saldo_normal'] === 'debit') ? ($d - $k) : ($k - $d);
        $saldo = round($saldo, 2);

        if ($r['tipe_akun'] === 'aset') {
            $aset[] = ['kode_akun' => $r['kode_akun'], 'nama_akun' => $r['nama_akun'], 'saldo' => $saldo];
            $totAset += $saldo;
        } elseif ($r['tipe_akun'] === 'kewajiban') {
            $kewajiban[] = ['kode_akun' => $r['kode_akun'], 'nama_akun' => $r['nama_akun'], 'saldo' => $saldo];
            $totKewajiban += $saldo;
        } elseif ($r['tipe_akun'] === 'ekuitas') {
            $ekuitas[] = ['kode_akun' => $r['kode_akun'], 'nama_akun' => $r['nama_akun'], 'saldo' => $saldo];
            $totEkuitas += $saldo;
        } elseif ($r['tipe_akun'] === 'pendapatan') {
            $totPendapatan += $saldo;
        } elseif ($r['tipe_akun'] === 'beban') {
            $totBeban += $saldo;
        }
    }

    $labaBerjalan = round($totPendapatan - $totBeban, 2);
    $totEkuitasPlusLaba = round($totEkuitas + $labaBerjalan, 2);
    $totPasiva = round($totKewajiban + $totEkuitasPlusLaba, 2);

    $accRespond([
        'as_of' => $asOf,
        'aset' => $aset,
        'kewajiban' => $kewajiban,
        'ekuitas' => $ekuitas,
        'laba_berjalan' => $labaBerjalan,
        'total_aset' => round($totAset, 2),
        'total_kewajiban' => round($totKewajiban, 2),
        'total_ekuitas' => $totEkuitasPlusLaba,
        'total_kewajiban_ekuitas' => $totPasiva,
        'is_balanced' => abs($totAset - $totPasiva) < 0.05,
    ]);
}

// 6. NERACA SALDO / TRIAL BALANCE (/api/accounting/trial-balance?start_date=...&end_date=...)
if ($id === 'trial-balance' && $method === 'GET') {
    $startDate = trim((string)($params['start_date'] ?? date('Y-01-01')));
    $endDate = trim((string)($params['end_date'] ?? date('Y-m-d')));

    $rows = $db->fetchAll(
        "SELECT coa.id, coa.kode_akun, coa.nama_akun, coa.tipe_akun, coa.saldo_normal,
                COALESCE(SUM(CASE WHEN je.tanggal < ? THEN ji.debit ELSE 0 END), 0) as open_d,
                COALESCE(SUM(CASE WHEN je.tanggal < ? THEN ji.kredit ELSE 0 END), 0) as open_k,
                COALESCE(SUM(CASE WHEN je.tanggal BETWEEN ? AND ? THEN ji.debit ELSE 0 END), 0) as mut_d,
                COALESCE(SUM(CASE WHEN je.tanggal BETWEEN ? AND ? THEN ji.kredit ELSE 0 END), 0) as mut_k
         FROM chart_of_accounts coa
         LEFT JOIN journal_items ji ON ji.coa_id = coa.id
         LEFT JOIN journal_entries je ON ji.journal_id = je.id
         WHERE coa.status = 'aktif'
         GROUP BY coa.id, coa.kode_akun, coa.nama_akun, coa.tipe_akun, coa.saldo_normal
         ORDER BY coa.kode_akun ASC",
        [$startDate, $startDate, $startDate, $endDate, $startDate, $endDate]
    );

    $items = [];
    $totOpenD = 0.0; $totOpenK = 0.0;
    $totMutD = 0.0; $totMutK = 0.0;
    $totEndD = 0.0; $totEndK = 0.0;

    foreach ($rows as $r) {
        $openNet = (float)$r['open_d'] - (float)$r['open_k'];
        $openD = $openNet >= 0 ? round($openNet, 2) : 0.0;
        $openK = $openNet < 0 ? round(abs($openNet), 2) : 0.0;

        $mutD = round((float)$r['mut_d'], 2);
        $mutK = round((float)$r['mut_k'], 2);

        $endNet = $openNet + ($mutD - $mutK);
        $endD = $endNet >= 0 ? round($endNet, 2) : 0.0;
        $endK = $endNet < 0 ? round(abs($endNet), 2) : 0.0;

        $totOpenD += $openD; $totOpenK += $openK;
        $totMutD += $mutD; $totMutK += $mutK;
        $totEndD += $endD; $totEndK += $endK;

        $items[] = [
            'kode_akun' => $r['kode_akun'],
            'nama_akun' => $r['nama_akun'],
            'tipe_akun' => $r['tipe_akun'],
            'opening_debit' => $openD,
            'opening_kredit' => $openK,
            'mutasi_debit' => $mutD,
            'mutasi_kredit' => $mutK,
            'ending_debit' => $endD,
            'ending_kredit' => $endK,
        ];
    }

    $accRespond([
        'start_date' => $startDate,
        'end_date' => $endDate,
        'items' => $items,
        'totals' => [
            'opening_debit' => round($totOpenD, 2),
            'opening_kredit' => round($totOpenK, 2),
            'mutasi_debit' => round($totMutD, 2),
            'mutasi_kredit' => round($totMutK, 2),
            'ending_debit' => round($totEndD, 2),
            'ending_kredit' => round($totEndK, 2),
        ],
        'is_balanced' => abs($totEndD - $totEndK) < 0.05,
    ]);
}

// 7. TUTUP BUKU & KUNCI PERIODE (/api/accounting/periods)
if ($id === 'periods') {
    if ($method === 'GET') {
        $rows = $db->fetchAll(
            "SELECT ap.*, je.nomor_jurnal as closing_journal_no, u.nama_lengkap as closed_by_name
             FROM accounting_periods ap
             LEFT JOIN journal_entries je ON ap.closing_journal_id = je.id
             LEFT JOIN users u ON ap.closed_by = u.id
             ORDER BY ap.periode DESC"
        );
        successResponse($rows);
    }

    if ($method === 'POST' && $action === 'close') {
        $periode = trim((string)($params['periode'] ?? date('Y-m')));
        if (!preg_match('/^\d{4}-\d{2}$/', $periode)) errorResponse('Format periode harus YYYY-MM', 422);

        $exist = $db->fetch("SELECT * FROM accounting_periods WHERE periode = ?", [$periode]);
        if ($exist && $exist['status'] === 'closed') {
            errorResponse("Periode {$periode} sudah ditutup buku", 422);
        }

        $startDate = "{$periode}-01";
        $endDate = date('Y-m-t', strtotime($startDate));
        $labaCoaId = getCoaIdByCode('3201');
        if ($labaCoaId <= 0) errorResponse('Akun Laba Ditahan (3201) tidak ditemukan', 422);

        // Hitung saldo Pendapatan & Beban pada periode tersebut (non-closing)
        $nominalRows = $db->fetchAll(
            "SELECT coa.id, coa.kode_akun, coa.nama_akun, coa.tipe_akun,
                    COALESCE(SUM(ji.debit), 0) as sum_d, COALESCE(SUM(ji.kredit), 0) as sum_k
             FROM chart_of_accounts coa
             JOIN journal_items ji ON ji.coa_id = coa.id
             JOIN journal_entries je ON ji.journal_id = je.id
             WHERE coa.tipe_akun IN ('pendapatan', 'beban')
               AND je.sumber_tipe != 'closing'
               AND je.tanggal BETWEEN ? AND ?
             GROUP BY coa.id, coa.kode_akun, coa.nama_akun, coa.tipe_akun",
            [$startDate, $endDate]
        );

        $lines = [];
        $netProfit = 0.0;
        foreach ($nominalRows as $nr) {
            $d = (float)$nr['sum_d'];
            $k = (float)$nr['sum_k'];
            if ($nr['tipe_akun'] === 'pendapatan') {
                $bal = round($k - $d, 2);
                if (abs($bal) < 0.01) continue;
                $netProfit += $bal;
                $lines[] = [
                    'coa_id' => (int)$nr['id'],
                    'debit' => $bal > 0 ? $bal : 0,
                    'kredit' => $bal < 0 ? abs($bal) : 0,
                    'keterangan' => "Tutup akun {$nr['kode_akun']}"
                ];
            } else {
                $bal = round($d - $k, 2);
                if (abs($bal) < 0.01) continue;
                $netProfit -= $bal;
                $lines[] = [
                    'coa_id' => (int)$nr['id'],
                    'debit' => $bal < 0 ? abs($bal) : 0,
                    'kredit' => $bal > 0 ? $bal : 0,
                    'keterangan' => "Tutup akun {$nr['kode_akun']}"
                ];
            }
        }

        $closingJournalId = null;
        $userId = !empty($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;

        $pdo = $db->getPdo();
        $pdo->beginTransaction();
        try {
            if (!empty($lines)) {
                $netProfit = round($netProfit, 2);
                if (abs($netProfit) >= 0.01) {
                    $lines[] = [
                        'coa_id' => $labaCoaId,
                        'debit' => $netProfit < 0 ? abs($netProfit) : 0,
                        'kredit' => $netProfit > 0 ? $netProfit : 0,
                        'keterangan' => "Laba/(Rugi) bersih periode {$periode}"
                    ];
                }
                $totD = array_sum(array_column($lines, 'debit'));
                $totK = array_sum(array_column($lines, 'kredit'));
                $no = generateJournalNumber($endDate);
                $pdo->prepare(
                    "INSERT INTO journal_entries (nomor_jurnal, tanggal, deskripsi, sumber_tipe, total_debit, total_kredit, created_by)
                     VALUES (?, ?, ?, 'closing', ?, ?, ?)"
                )->execute([$no, $endDate, "Jurnal Penutup Periode {$periode}", $totD, $totK, $userId]);
                $closingJournalId = (int)$pdo->lastInsertId();

                $stmtIt = $pdo->prepare("INSERT INTO journal_items (journal_id, coa_id, debit, kredit, keterangan) VALUES (?, ?, ?, ?, ?)");
                foreach ($lines as $cl) {
                    $stmtIt->execute([$closingJournalId, $cl['coa_id'], $cl['debit'], $cl['kredit'], $cl['keterangan']]);
                }
            }

            if ($exist) {
                $pdo->prepare("UPDATE accounting_periods SET status = 'closed', closing_journal_id = ?, closed_by = ?, closed_at = NOW() WHERE id = ?")
                    ->execute([$closingJournalId, $userId, (int)$exist['id']]);
            } else {
                $pdo->prepare("INSERT INTO accounting_periods (periode, status, closing_journal_id, closed_by, closed_at) VALUES (?, 'closed', ?, ?, NOW())")
                    ->execute([$periode, $closingJournalId, $userId]);
            }
            $pdo->commit();
            clearCache(['accounting', 'reports', 'dashboard']);
            logActivity('accounting.close_period', 'accounting_periods', 0, null, ['periode' => $periode, 'closing_journal_id' => $closingJournalId]);
            successResponse(['periode' => $periode, 'closing_journal_id' => $closingJournalId], "Periode {$periode} berhasil ditutup buku & dikunci");
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            errorResponse('Gagal menutup periode: ' . $e->getMessage(), 500);
        }
    }

    if ($method === 'POST' && $action === 'reopen') {
        $periode = trim((string)($params['periode'] ?? ''));
        $exist = $db->fetch("SELECT * FROM accounting_periods WHERE periode = ?", [$periode]);
        if (!$exist) errorResponse('Periode tidak ditemukan', 404);

        if (!empty($exist['closing_journal_id'])) {
            $db->execute("DELETE FROM journal_entries WHERE id = ?", [(int)$exist['closing_journal_id']]);
        }
        $db->execute("UPDATE accounting_periods SET status = 'open', closing_journal_id = NULL, closed_by = NULL, closed_at = NULL WHERE id = ?", [(int)$exist['id']]);
        clearCache(['accounting', 'reports', 'dashboard']);
        logActivity('accounting.reopen_period', 'accounting_periods', (int)$exist['id'], null, ['periode' => $periode]);
        successResponse(null, "Periode {$periode} dibuka kembali");
    }

    errorResponse('Aksi periode tidak valid', 400);
}

// 8. LAPORAN LABA RUGI BERBASIS COA (/api/accounting/income-statement?start_date=...&end_date=...)
if ($id === 'income-statement' && $method === 'GET') {
    $startDate = trim((string)($params['start_date'] ?? date('Y-01-01')));
    $endDate = trim((string)($params['end_date'] ?? date('Y-m-d')));

    $rows = $db->fetchAll(
        "SELECT coa.kode_akun, coa.nama_akun, coa.tipe_akun,
                COALESCE(SUM(CASE WHEN je.tanggal BETWEEN ? AND ? AND je.sumber_tipe != 'closing' THEN ji.debit ELSE 0 END), 0) as sum_d,
                COALESCE(SUM(CASE WHEN je.tanggal BETWEEN ? AND ? AND je.sumber_tipe != 'closing' THEN ji.kredit ELSE 0 END), 0) as sum_k
         FROM chart_of_accounts coa
         LEFT JOIN journal_items ji ON ji.coa_id = coa.id
         LEFT JOIN journal_entries je ON ji.journal_id = je.id
         WHERE coa.status = 'aktif' AND coa.tipe_akun IN ('pendapatan', 'beban')
         GROUP BY coa.id, coa.kode_akun, coa.nama_akun, coa.tipe_akun
         ORDER BY coa.kode_akun ASC",
        [$startDate, $endDate, $startDate, $endDate]
    );

    $pendapatan = [];
    $beban = [];
    $totPendapatan = 0.0;
    $totBeban = 0.0;

    foreach ($rows as $r) {
        $d = (float)$r['sum_d'];
        $k = (float)$r['sum_k'];
        if ($r['tipe_akun'] === 'pendapatan') {
            $saldo = round($k - $d, 2);
            $pendapatan[] = ['kode_akun' => $r['kode_akun'], 'nama_akun' => $r['nama_akun'], 'saldo' => $saldo];
            $totPendapatan += $saldo;
        } else {
            $saldo = round($d - $k, 2);
            $beban[] = ['kode_akun' => $r['kode_akun'], 'nama_akun' => $r['nama_akun'], 'saldo' => $saldo];
            $totBeban += $saldo;
        }
    }

    $totPendapatan = round($totPendapatan, 2);
    $totBeban = round($totBeban, 2);
    $labaBersih = round($totPendapatan - $totBeban, 2);
    $margin = $totPendapatan > 0 ? round(($labaBersih / $totPendapatan) * 100, 2) : 0.0;

    $accRespond([
        'start_date' => $startDate,
        'end_date' => $endDate,
        'pendapatan' => $pendapatan,
        'beban' => $beban,
        'total_pendapatan' => $totPendapatan,
        'total_beban' => $totBeban,
        'laba_bersih' => $labaBersih,
        'margin_persen' => $margin,
    ]);
}

// 9. LAPORAN ARUS KAS RESMI / CASH FLOW STATEMENT (/api/accounting/cash-flow?start_date=...&end_date=...)
if ($id === 'cash-flow' && $method === 'GET') {
    $startDate = trim((string)($params['start_date'] ?? date('Y-01-01')));
    $endDate = trim((string)($params['end_date'] ?? date('Y-m-d')));

    // Identifikasi semua akun Kas & Bank
    $pmCoas = $db->fetchAll("SELECT DISTINCT coa_id FROM payment_methods WHERE coa_id IS NOT NULL");
    $cashIds = array_map(fn($r) => (int)$r['coa_id'], $pmCoas);
    $mappedKas = getMappedCoaId('coa_kas_id', '1101');
    if ($mappedKas > 0) $cashIds[] = $mappedKas;
    $likeCash = $db->fetchAll("SELECT id FROM chart_of_accounts WHERE tipe_akun = 'aset' AND (kode_akun LIKE '1101%' OR LOWER(nama_akun) LIKE '%kas%' OR LOWER(nama_akun) LIKE '%bank%')");
    foreach ($likeCash as $lc) $cashIds[] = (int)$lc['id'];
    $cashIds = array_values(array_unique(array_filter($cashIds)));

    if (empty($cashIds)) {
        $accRespond([
            'start_date' => $startDate, 'end_date' => $endDate,
            'opening_cash' => 0, 'operating' => ['items' => [], 'total' => 0],
            'investing' => ['items' => [], 'total' => 0], 'financing' => ['items' => [], 'total' => 0],
            'net_cash_flow' => 0, 'closing_cash' => 0
        ]);
    }

    $ph = implode(',', array_fill(0, count($cashIds), '?'));
    $openRow = $db->fetch(
        "SELECT COALESCE(SUM(ji.debit - ji.kredit), 0) as bal
         FROM journal_items ji
         JOIN journal_entries je ON ji.journal_id = je.id
         WHERE ji.coa_id IN ({$ph}) AND je.tanggal < ?",
        array_merge($cashIds, [$startDate])
    );
    $openingCash = round((float)($openRow['bal'] ?? 0), 2);

    $cashJrnRows = $db->fetchAll(
        "SELECT je.id, je.tanggal, je.nomor_jurnal, je.deskripsi, je.sumber_tipe,
                SUM(ji.debit - ji.kredit) as net_cash
         FROM journal_entries je
         JOIN journal_items ji ON ji.journal_id = je.id
         WHERE ji.coa_id IN ({$ph}) AND je.tanggal BETWEEN ? AND ? AND je.sumber_tipe != 'closing'
         GROUP BY je.id, je.tanggal, je.nomor_jurnal, je.deskripsi, je.sumber_tipe
         HAVING ABS(net_cash) >= 0.01
         ORDER BY je.tanggal ASC, je.id ASC",
        array_merge($cashIds, [$startDate, $endDate])
    );

    $operating = []; $investing = []; $financing = [];
    $totOp = 0.0; $totInv = 0.0; $totFin = 0.0;

    foreach ($cashJrnRows as $jr) {
        $net = round((float)$jr['net_cash'], 2);
        // Cek akun lawan (counterpart) untuk menentukan kategori PSAK 2
        $counter = $db->fetch(
            "SELECT coa.kode_akun, coa.tipe_akun
             FROM journal_items ji
             JOIN chart_of_accounts coa ON ji.coa_id = coa.id
             WHERE ji.journal_id = ? AND ji.coa_id NOT IN ({$ph})
             ORDER BY ABS(ji.debit - ji.kredit) DESC LIMIT 1",
            array_merge([(int)$jr['id']], $cashIds)
        );
        $cType = $counter['tipe_akun'] ?? '';
        $cCode = (string)($counter['kode_akun'] ?? '');

        $item = [
            'tanggal' => $jr['tanggal'],
            'nomor_jurnal' => $jr['nomor_jurnal'],
            'deskripsi' => $jr['deskripsi'],
            'nominal' => $net,
        ];

        if ($cType === 'ekuitas' || str_starts_with($cCode, '22')) {
            $financing[] = $item;
            $totFin += $net;
        } elseif ($cType === 'aset' && !in_array($cCode, ['1102', '1103'], true) && !str_starts_with($cCode, '11')) {
            $investing[] = $item;
            $totInv += $net;
        } else {
            $operating[] = $item;
            $totOp += $net;
        }
    }

    $netFlow = round($totOp + $totInv + $totFin, 2);
    $closingCash = round($openingCash + $netFlow, 2);

    $accRespond([
        'start_date' => $startDate,
        'end_date' => $endDate,
        'opening_cash' => $openingCash,
        'operating' => ['items' => $operating, 'total' => round($totOp, 2)],
        'investing' => ['items' => $investing, 'total' => round($totInv, 2)],
        'financing' => ['items' => $financing, 'total' => round($totFin, 2)],
        'net_cash_flow' => $netFlow,
        'closing_cash' => $closingCash,
    ]);
}

// 10. LAPORAN PERUBAHAN EKUITAS (/api/accounting/equity-statement?start_date=...&end_date=...)
if ($id === 'equity-statement' && $method === 'GET') {
    $startDate = trim((string)($params['start_date'] ?? date('Y-01-01')));
    $endDate = trim((string)($params['end_date'] ?? date('Y-m-d')));

    $eqRows = $db->fetchAll(
        "SELECT coa.kode_akun, coa.nama_akun,
                COALESCE(SUM(CASE WHEN je.tanggal < ? THEN (ji.kredit - ji.debit) ELSE 0 END), 0) as open_bal,
                COALESCE(SUM(CASE WHEN je.tanggal BETWEEN ? AND ? AND je.sumber_tipe != 'closing' THEN (ji.kredit - ji.debit) ELSE 0 END), 0) as period_mut
         FROM chart_of_accounts coa
         LEFT JOIN journal_items ji ON ji.coa_id = coa.id
         LEFT JOIN journal_entries je ON ji.journal_id = je.id
         WHERE coa.status = 'aktif' AND coa.tipe_akun = 'ekuitas'
         GROUP BY coa.id, coa.kode_akun, coa.nama_akun
         ORDER BY coa.kode_akun ASC",
        [$startDate, $startDate, $endDate]
    );

    // Laba ditahan belum ditutup sebelum start_date
    $prevNom = $db->fetch(
        "SELECT
            COALESCE(SUM(CASE WHEN coa.tipe_akun = 'pendapatan' THEN (ji.kredit - ji.debit) ELSE 0 END), 0) as prev_rev,
            COALESCE(SUM(CASE WHEN coa.tipe_akun = 'beban' THEN (ji.debit - ji.kredit) ELSE 0 END), 0) as prev_exp
         FROM journal_items ji
         JOIN journal_entries je ON ji.journal_id = je.id
         JOIN chart_of_accounts coa ON ji.coa_id = coa.id
         WHERE je.tanggal < ? AND je.sumber_tipe != 'closing' AND coa.tipe_akun IN ('pendapatan', 'beban')",
        [$startDate]
    );
    $prevUnclosedProfit = round((float)($prevNom['prev_rev'] ?? 0) - (float)($prevNom['prev_exp'] ?? 0), 2);

    // Laba bersih periode berjalan
    $curNom = $db->fetch(
        "SELECT
            COALESCE(SUM(CASE WHEN coa.tipe_akun = 'pendapatan' THEN (ji.kredit - ji.debit) ELSE 0 END), 0) as cur_rev,
            COALESCE(SUM(CASE WHEN coa.tipe_akun = 'beban' THEN (ji.debit - ji.kredit) ELSE 0 END), 0) as cur_exp
         FROM journal_items ji
         JOIN journal_entries je ON ji.journal_id = je.id
         JOIN chart_of_accounts coa ON ji.coa_id = coa.id
         WHERE je.tanggal BETWEEN ? AND ? AND je.sumber_tipe != 'closing' AND coa.tipe_akun IN ('pendapatan', 'beban')",
        [$startDate, $endDate]
    );
    $labaPeriode = round((float)($curNom['cur_rev'] ?? 0) - (float)($curNom['cur_exp'] ?? 0), 2);

    $accounts = [];
    $totOpen = $prevUnclosedProfit;
    $totMut = 0.0;
    foreach ($eqRows as $er) {
        $ob = round((float)$er['open_bal'], 2);
        $pm = round((float)$er['period_mut'], 2);
        $totOpen += $ob;
        $totMut += $pm;
        $accounts[] = [
            'kode_akun' => $er['kode_akun'],
            'nama_akun' => $er['nama_akun'],
            'saldo_awal' => $ob,
            'mutasi' => $pm,
            'saldo_akhir' => round($ob + $pm, 2),
        ];
    }

    $endingEquity = round($totOpen + $totMut + $labaPeriode, 2);

    $accRespond([
        'start_date' => $startDate,
        'end_date' => $endDate,
        'accounts' => $accounts,
        'prev_unclosed_profit' => $prevUnclosedProfit,
        'opening_equity' => round($totOpen, 2),
        'period_capital_change' => round($totMut, 2),
        'net_profit_period' => $labaPeriode,
        'ending_equity' => $endingEquity,
    ]);
}

errorResponse('Sub-endpoint akuntansi tidak ditemukan', 404);
