<?php
// ProjectController.php

authCheck();
$db = Database::getInstance();

if ($id && is_numeric($id)) {
    $projectId = (int)$id;

    if ($action === 'sync-git') {
        checkPermission('project.git_sync');
        $project = $db->fetch("SELECT * FROM projects WHERE id = ?", [$projectId]);
        if (!$project) errorResponse('Proyek tidak ditemukan', 404);

        $deployPath = $project['deploy_path'] ?? '';
        $status = 'idle';
        $commitHash = '-';
        $commitMsg = '-';

        if (!empty($deployPath) && file_exists($deployPath)) {
            // Cek git status jika folder adalah repository git
            if (is_dir($deployPath . '/.git')) {
                $status = 'success';
                // Baca branch & commit terakhir jika memungkinkan
                $headFile = $deployPath . '/.git/HEAD';
                if (file_exists($headFile)) {
                    $headContent = trim(file_get_contents($headFile));
                    if (str_starts_with($headContent, 'ref: ')) {
                        $refPath = $deployPath . '/.git/' . substr($headContent, 5);
                        if (file_exists($refPath)) {
                            $commitHash = substr(trim(file_get_contents($refPath)), 0, 7);
                        }
                    }
                }
            } else {
                $status = 'idle';
            }
        } else {
            $status = 'failed';
        }

        $db->execute(
            "UPDATE projects SET last_deploy_status = ?, last_deploy_at = NOW() WHERE id = ?",
            [$status, $projectId]
        );

        logActivity('git_sync', 'projects', $projectId, null, ['status' => $status, 'commit' => $commitHash]);

        successResponse([
            'project_id' => $projectId,
            'status' => $status,
            'commit_hash' => $commitHash,
            'synced_at' => date('Y-m-d H:i:s')
        ], 'Status deployment berhasil disinkronkan');
    }

    // Health & Uptime Checker (Poin 4)
    if ($action === 'health-check') {
        checkPermission('project.view');
        $project = $db->fetch("SELECT * FROM projects WHERE id = ?", [$projectId]);
        if (!$project) errorResponse('Proyek tidak ditemukan', 404);

        $targetUrl = trim($project['app_url'] ?? '');
        if (empty($targetUrl)) {
            // Cek apakah ada domain di maintenance_sla
            $sla = $db->fetch("SELECT domain_name FROM maintenance_sla WHERE project_id = ? AND domain_name IS NOT NULL LIMIT 1", [$projectId]);
            if (!empty($sla['domain_name'])) {
                $targetUrl = 'https://' . ltrim($sla['domain_name'], 'https://');
            }
        }

        if (empty($targetUrl)) {
            errorResponse('URL aplikasi atau domain proyek belum diisi pada pengaturan proyek', 422);
        }

        if (!str_starts_with($targetUrl, 'http://') && !str_starts_with($targetUrl, 'https://')) {
            $targetUrl = 'https://' . $targetUrl;
        }

        $httpCode = 0;
        $latencyMs = 0;
        $sslDays = null;
        $healthStatus = 'offline';
        $statusMessage = 'Gagal menghubungi server tujuan';

        $ch = curl_init($targetUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
        curl_setopt($ch, CURLOPT_USERAGENT, 'CRUDWorks-UptimeMonitor/1.5');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_CERTINFO, true);

        $start = microtime(true);
        $res = curl_exec($ch);
        $latencyMs = (int)round((microtime(true) - $start) * 1000);

        if (!curl_errno($ch)) {
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $certinfo = curl_getinfo($ch, CURLINFO_CERTINFO);
            if (!empty($certinfo) && isset($certinfo[0]['Expire date'])) {
                $expTs = strtotime($certinfo[0]['Expire date']);
                if ($expTs) {
                    $sslDays = (int)floor(($expTs - time()) / 86400);
                }
            }

            if ($httpCode >= 200 && $httpCode < 400) {
                $healthStatus = 'online';
                $statusMessage = "Website Aktif Normal (HTTP {$httpCode}, {$latencyMs}ms)";
            } elseif ($httpCode >= 400 && $httpCode < 500) {
                $healthStatus = 'degraded';
                $statusMessage = "Klien merespons peringatan (HTTP {$httpCode}, {$latencyMs}ms)";
            } else {
                $healthStatus = 'degraded';
                $statusMessage = "Server merespons galat (HTTP {$httpCode})";
            }
        } else {
            $statusMessage = 'Koneksi gagal: ' . curl_error($ch);
        }
        curl_close($ch);

        $db->execute(
            "UPDATE projects SET last_health_status = ?, last_latency_ms = ?, last_ssl_days = ?, last_checked_at = NOW() WHERE id = ?",
            [$healthStatus, $latencyMs, $sslDays, $projectId]
        );

        logActivity('health_check', 'projects', $projectId, null, ['status' => $healthStatus, 'code' => $httpCode, 'latency' => $latencyMs]);

        successResponse([
            'project_id' => $projectId,
            'target_url' => $targetUrl,
            'health_status' => $healthStatus,
            'http_code' => $httpCode,
            'latency_ms' => $latencyMs,
            'ssl_days' => $sslDays,
            'status_message' => $statusMessage,
            'checked_at' => date('Y-m-d H:i:s')
        ], $statusMessage);
    }

    // Profitability & P&L Insights (Poin 5)
    if ($action === 'profitability') {
        checkPermission('project.view');
        $project = $db->fetch(
            "SELECT p.*, c.nama_perusahaan, c.penanggung_jawab 
             FROM projects p JOIN clients c ON p.client_id = c.id 
             WHERE p.id = ?",
            [$projectId]
        );
        if (!$project) errorResponse('Proyek tidak ditemukan', 404);

        // 1. Revenue dari Invoices
        $invRow = $db->fetch(
            "SELECT 
                COUNT(*) as count_invoices,
                COALESCE(SUM(total_tagihan), 0) as total_invoiced,
                COALESCE(SUM(total_dibayar), 0) as total_paid,
                COALESCE(SUM(sisa_tagihan), 0) as total_unpaid
             FROM invoices 
             WHERE project_id = ? AND status != 'batal'",
            [$projectId]
        );

        // 2. Direct Expenses (Server, Hosting, Subkontrak, Lisensi)
        $expRow = $db->fetch(
            "SELECT 
                COUNT(*) as count_expenses,
                COALESCE(SUM(jumlah), 0) as total_direct_expenses
             FROM expenses 
             WHERE project_id = ?",
            [$projectId]
        );

        // 3. Internal Timesheet Hours & Dev Cost
        $tsRow = $db->fetch(
            "SELECT 
                COUNT(*) as count_timesheets,
                COALESCE(SUM(durasi_menit), 0) as total_menit,
                COALESCE(SUM((durasi_menit / 60) * billing_rate_per_jam), 0) as billable_value
             FROM timesheets 
             WHERE project_id = ?",
            [$projectId]
        );

        // Hitung estimasi internal cost per jam (default Rp 100.000/jam atau dari billing rate rata-rata / 2)
        $totalHours = round((int)($tsRow['total_menit'] ?? 0) / 60, 1);
        $internalHourlyRate = (float)($db->fetch("SELECT nilai FROM app_settings WHERE kunci = 'default_internal_hourly_cost'")['nilai'] ?? 100000);
        $totalLaborCost = round($totalHours * $internalHourlyRate, 2);

        $totalRevenue = (float)$project['nilai_project'] > 0 ? (float)$project['nilai_project'] : (float)$invRow['total_invoiced'];
        $totalDirectExpense = (float)$expRow['total_direct_expenses'];
        $totalCost = $totalDirectExpense + $totalLaborCost;
        $grossProfit = $totalRevenue - $totalCost;
        $profitMargin = $totalRevenue > 0 ? round(($grossProfit / $totalRevenue) * 100, 1) : 0.0;

        // Milestones
        $milestones = $db->fetchAll(
            "SELECT pm.*, inv.nomor_invoice, inv.status as invoice_status
             FROM project_milestones pm
             LEFT JOIN invoices inv ON pm.invoice_id = inv.id
             WHERE pm.project_id = ?
             ORDER BY pm.id ASC",
            [$projectId]
        );

        successResponse([
            'project' => $project,
            'summary' => [
                'nilai_kontrak' => (float)$project['nilai_project'],
                'total_invoiced' => (float)$invRow['total_invoiced'],
                'total_paid' => (float)$invRow['total_paid'],
                'total_unpaid' => (float)$invRow['total_unpaid'],
                'total_hours' => $totalHours,
                'labor_cost' => $totalLaborCost,
                'direct_expenses' => $totalDirectExpense,
                'total_cost' => $totalCost,
                'gross_profit' => $grossProfit,
                'profit_margin_percent' => $profitMargin,
                'status_profit' => $grossProfit > 0 ? ($profitMargin >= 40 ? 'sangat_sehat' : 'sehat') : 'defisit'
            ],
            'milestones' => $milestones
        ]);
    }

    // Milestones Management (Poin 3)
    if ($action === 'milestones') {
        if ($method === 'GET') {
            checkPermission('project.view');
            $rows = $db->fetchAll(
                "SELECT pm.*, inv.nomor_invoice, inv.status as invoice_status, inv.sisa_tagihan
                 FROM project_milestones pm
                 LEFT JOIN invoices inv ON pm.invoice_id = inv.id
                 WHERE pm.project_id = ?
                 ORDER BY pm.id ASC",
                [$projectId]
            );
            successResponse($rows);
        }

        if ($method === 'POST') {
            checkPermission('project.edit');
            $pattern = trim($params['pattern'] ?? '');
            $project = $db->fetch("SELECT * FROM projects WHERE id = ?", [$projectId]);
            if (!$project) errorResponse('Proyek tidak ditemukan', 404);

            $nilaiTotal = (float)($project['nilai_project'] ?? 0);

            // Batch generate pola termin (30-40-30 atau 50-50)
            if ($pattern === '30-40-30') {
                $db->execute("DELETE FROM project_milestones WHERE project_id = ? AND status = 'rencana'", [$projectId]);
                $items = [
                    ['nama' => 'Termin 1 (DP 30% - Kickoff & Perancangan)', 'pct' => 30.0],
                    ['nama' => 'Termin 2 (Progress 40% - Selesai UAT & Staging)', 'pct' => 40.0],
                    ['nama' => 'Termin 3 (Pelunasan 30% - Go-Live & Serah Terima)', 'pct' => 30.0]
                ];
                foreach ($items as $it) {
                    $nom = round(($it['pct'] / 100) * $nilaiTotal, 2);
                    $db->execute(
                        "INSERT INTO project_milestones (project_id, nama_milestone, persentase, nominal, status) VALUES (?, ?, ?, ?, 'rencana')",
                        [$projectId, $it['nama'], $it['pct'], $nom]
                    );
                }
                successResponse(null, 'Pola termin 30% - 40% - 30% berhasil diterapkan');
            } elseif ($pattern === '50-50') {
                $db->execute("DELETE FROM project_milestones WHERE project_id = ? AND status = 'rencana'", [$projectId]);
                $items = [
                    ['nama' => 'Termin 1 (DP 50% - Kickoff Proyek)', 'pct' => 50.0],
                    ['nama' => 'Termin 2 (Pelunasan 50% - Selesai Go-Live)', 'pct' => 50.0]
                ];
                foreach ($items as $it) {
                    $nom = round(($it['pct'] / 100) * $nilaiTotal, 2);
                    $db->execute(
                        "INSERT INTO project_milestones (project_id, nama_milestone, persentase, nominal, status) VALUES (?, ?, ?, ?, 'rencana')",
                        [$projectId, $it['nama'], $it['pct'], $nom]
                    );
                }
                successResponse(null, 'Pola termin 50% - 50% berhasil diterapkan');
            } else {
                // Single custom milestone
                $nama = trim($params['nama_milestone'] ?? '');
                $pct = (float)($params['persentase'] ?? 0);
                $nom = (float)($params['nominal'] ?? 0);
                $tgl = !empty($params['tanggal_target']) ? $params['tanggal_target'] : null;

                if (empty($nama)) errorResponse('Nama termin / milestone wajib diisi', 422);
                if ($nom <= 0 && $pct > 0 && $nilaiTotal > 0) {
                    $nom = round(($pct / 100) * $nilaiTotal, 2);
                }

                $newId = $db->insert(
                    "INSERT INTO project_milestones (project_id, nama_milestone, persentase, nominal, tanggal_target, status) VALUES (?, ?, ?, ?, ?, 'rencana')",
                    [$projectId, $nama, $pct, $nom, $tgl]
                );
                successResponse(['id' => $newId], 'Termin milestone baru berhasil ditambahkan');
            }
        }
    }

    // 1-Click Create Invoice from Milestone (Poin 3)
    if ($action === 'create-milestone-invoice') {
        checkPermission('invoice.create');
        $milestoneId = (int)($params['milestone_id'] ?? 0);
        $m = $db->fetch("SELECT * FROM project_milestones WHERE id = ? AND project_id = ?", [$milestoneId, $projectId]);
        if (!$m) errorResponse('Milestone tidak ditemukan', 404);
        if ($m['invoice_id']) errorResponse('Faktur tagihan untuk termin ini sudah pernah diterbitkan', 400);

        $project = $db->fetch("SELECT p.*, c.nama_perusahaan, c.penanggung_jawab FROM projects p JOIN clients c ON p.client_id = c.id WHERE p.id = ?", [$projectId]);
        
        $subtotal = (float)$m['nominal'];
        if ($subtotal <= 0) errorResponse('Nominal termin harus lebih besar dari 0', 422);

        $prefix = 'INV-' . date('Ym') . '-';
        $lastSeq = $db->fetch("SELECT nomor_invoice FROM invoices WHERE nomor_invoice LIKE ? ORDER BY id DESC LIMIT 1", [$prefix . '%']);
        $seq = 1;
        if ($lastSeq) {
            $parts = explode('-', $lastSeq['nomor_invoice']);
            $seq = (int)end($parts) + 1;
        }
        $nomorInvoice = $prefix . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);

        $dueDays = (int)($db->fetch("SELECT nilai FROM app_settings WHERE kunci = 'invoice_due_days'")['nilai'] ?? 14);
        $pajakPersen = getDefaultTaxPercent();
        $pajakNominal = $subtotal * ($pajakPersen / 100);
        $totalTagihan = $subtotal + $pajakNominal;
        $publicToken = bin2hex(random_bytes(24));
        $userId = $_SESSION['user_id'] ?? 1;

        $pdo = $db->getPdo();
        $pdo->beginTransaction();
        try {
            $stmtInv = $pdo->prepare(
                "INSERT INTO invoices (`nomor_invoice`, `public_token`, `client_id`, `project_id`, `tanggal_invoice`, `tanggal_jatuh_tempo`, `subtotal`, `diskon_tipe`, `diskon_nilai`, `pajak_persen`, `pajak_nominal`, `total_tagihan`, `total_dibayar`, `sisa_tagihan`, `status`, `catatan_klien`, `created_by`)
                 VALUES (?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), ?, 'nominal', 0.00, ?, ?, ?, 0.00, ?, 'dikirim', ?, ?)"
            );
            $catatanKlien = "Pembayaran {$m['nama_milestone']} untuk proyek {$project['nama_project']}";
            $stmtInv->execute([
                $nomorInvoice, $publicToken, $project['client_id'], $projectId,
                $dueDays, $subtotal, $pajakPersen, $pajakNominal, $totalTagihan, $totalTagihan,
                $catatanKlien, $userId
            ]);
            $newInvId = (int)$pdo->lastInsertId();

            $stmtItem = $pdo->prepare(
                "INSERT INTO invoice_items (`invoice_id`, `deskripsi`, `kuantitas`, `satuan`, `harga_satuan`, `total_harga`, `urutan`)
                 VALUES (?, ?, 1.00, 'termin', ?, ?, 1)"
            );
            $stmtItem->execute([$newInvId, "{$m['nama_milestone']} ({$project['nama_project']})", $subtotal, $subtotal]);

            $pdo->prepare("UPDATE project_milestones SET invoice_id = ?, status = 'ditagih' WHERE id = ?")->execute([$newInvId, $milestoneId]);

            $pdo->commit();
            clearCache(['invoices', 'projects', 'dashboard']);

            successResponse([
                'invoice_id' => $newInvId,
                'nomor_invoice' => $nomorInvoice,
                'public_token' => $publicToken
            ], "Faktur termin {$nomorInvoice} berhasil diterbitkan!");
        } catch (\Throwable $e) {
            $pdo->rollBack();
            errorResponse('Gagal menerbitkan faktur termin: ' . $e->getMessage(), 500);
        }
    }

    if ($method === 'GET') {
        checkPermission('project.view');
        $project = $db->fetch(
            "SELECT p.*, c.nama_perusahaan as client_nama, c.penanggung_jawab as client_pic 
             FROM projects p 
             JOIN clients c ON p.client_id = c.id 
             WHERE p.id = ?",
            [$projectId]
        );
        if (!$project) errorResponse('Proyek tidak ditemukan', 404);
        successResponse($project);
    }

    if ($method === 'PUT') {
        checkPermission('project.edit');
        $project = $db->fetch("SELECT * FROM projects WHERE id = ?", [$projectId]);
        if (!$project) errorResponse('Proyek tidak ditemukan', 404);

        $clientId = (int)($params['client_id'] ?? $project['client_id']);
        $namaProject = trim($params['nama_project'] ?? '');
        $deskripsi = trim($params['deskripsi'] ?? '');
        $gitRepoUrl = trim($params['git_repo_url'] ?? '');
        $gitBranch = trim($params['git_branch'] ?? 'main');
        $deployPath = trim($params['deploy_path'] ?? '');
        $appUrl = trim($params['app_url'] ?? '');
        $tanggalMulai = !empty($params['tanggal_mulai']) ? $params['tanggal_mulai'] : null;
        $tanggalSelesai = !empty($params['tanggal_selesai']) ? $params['tanggal_selesai'] : null;
        $nilaiProject = (float)($params['nilai_project'] ?? 0);
        $status = in_array($params['status'] ?? '', ['perencanaan', 'aktif', 'maintenance', 'selesai', 'dibatalkan']) ? $params['status'] : 'aktif';

        if (empty($namaProject) || !$clientId) {
            errorResponse('Nama proyek dan klien wajib diisi');
        }

        $db->execute(
            "UPDATE projects SET client_id = ?, nama_project = ?, deskripsi = ?, git_repo_url = ?, 
                    git_branch = ?, deploy_path = ?, app_url = ?, tanggal_mulai = ?, 
                    tanggal_selesai = ?, nilai_project = ?, status = ? 
             WHERE id = ?",
            [$clientId, $namaProject, $deskripsi, $gitRepoUrl, $gitBranch, $deployPath, $appUrl, $tanggalMulai, $tanggalSelesai, $nilaiProject, $status, $projectId]
        );

        logActivity('update', 'projects', $projectId, $project, $params);
        successResponse(['id' => $projectId], 'Data proyek berhasil diperbarui');
    }

    if ($method === 'DELETE') {
        checkPermission('project.edit');
        $project = $db->fetch("SELECT * FROM projects WHERE id = ?", [$projectId]);
        if (!$project) errorResponse('Proyek tidak ditemukan', 404);

        $db->execute("DELETE FROM projects WHERE id = ?", [$projectId]);
        logActivity('delete', 'projects', $projectId, $project);
        successResponse(null, 'Proyek berhasil dihapus');
    }

    errorResponse('Metode tidak didukung', 405);
}

// Collection level: /api/projects
if ($method === 'GET') {
    checkPermission('project.view');

    if (isset($params['all']) && $params['all'] == '1') {
        $clientIdFilter = (int)($params['client_id'] ?? 0);
        $sql = "SELECT id, kode_project, nama_project, client_id, status FROM projects";
        $binds = [];
        if ($clientIdFilter > 0) {
            $sql .= " WHERE client_id = ?";
            $binds[] = $clientIdFilter;
        }
        $sql .= " ORDER BY nama_project ASC";
        $projects = $db->fetchAll($sql, $binds);
        successResponse($projects);
    }

    $page = (int)($params['page'] ?? 1);
    $perPage = (int)($params['per_page'] ?? PER_PAGE);
    $search = trim($params['search'] ?? '');
    $clientId = (int)($params['client_id'] ?? 0);
    $status = trim($params['status'] ?? '');
    $fase = trim($params['fase'] ?? '');

    $where = [];
    $bindings = [];

    if (!empty($search)) {
        $where[] = "(p.nama_project LIKE ? OR p.kode_project LIKE ? OR c.nama_perusahaan LIKE ?)";
        $searchPattern = "%$search%";
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
    }

    if ($clientId > 0) {
        $where[] = "p.client_id = ?";
        $bindings[] = $clientId;
    }

    if (!empty($status)) {
        $where[] = "p.status = ?";
        $bindings[] = $status;
    }

    if ($fase === 'penawaran') {
        $where[] = "(SELECT COUNT(*) FROM quotations q WHERE q.project_id = p.id AND q.status IN ('draft','terkirim')) > 0";
    } elseif ($fase === 'spk') {
        $where[] = "((SELECT COUNT(*) FROM contracts k WHERE k.project_id = p.id AND k.status IN ('draft','terkirim')) > 0 OR ((SELECT COUNT(*) FROM quotations q WHERE q.project_id = p.id AND q.status IN ('disetujui','dikonversi')) > 0 AND (SELECT COUNT(*) FROM contracts k WHERE k.project_id = p.id AND k.status = 'ditandatangani') = 0))";
    } elseif ($fase === 'digarap') {
        $where[] = "(SELECT COUNT(*) FROM project_tasks pt WHERE pt.project_id = p.id AND pt.status != 'done') > 0";
    } elseif ($fase === 'belum_bast') {
        $where[] = "((SELECT COUNT(*) FROM project_basts b WHERE b.project_id = p.id AND b.status = 'draft') > 0 OR ((SELECT COUNT(*) FROM project_tasks pt WHERE pt.project_id = p.id) > 0 AND (SELECT COUNT(*) FROM project_tasks pt WHERE pt.project_id = p.id AND pt.status != 'done') = 0 AND (SELECT COUNT(*) FROM project_basts b WHERE b.project_id = p.id AND b.status = 'ditandatangani') = 0))";
    } elseif ($fase === 'termin_bayar') {
        $where[] = "(SELECT COUNT(*) FROM project_milestones pm WHERE pm.project_id = p.id AND pm.status = 'rencana' AND pm.invoice_id IS NULL) > 0";
    } elseif ($fase === 'belum_dibayar') {
        $where[] = "(SELECT COUNT(*) FROM invoices i WHERE i.project_id = p.id AND i.sisa_tagihan > 0 AND i.status NOT IN ('batal','dibatalkan')) > 0";
    }

    $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $countQuery = "SELECT COUNT(*) FROM projects p JOIN clients c ON p.client_id = c.id $whereSql";
    $query = "SELECT p.*, c.nama_perusahaan as client_nama,
                     (SELECT COUNT(*) FROM invoices WHERE project_id = p.id) as total_invoices,
                     (SELECT COUNT(*) FROM quotations q WHERE q.project_id = p.id AND q.status IN ('draft','terkirim')) as quo_pending,
                     (SELECT COUNT(*) FROM quotations q WHERE q.project_id = p.id AND q.status IN ('disetujui','dikonversi')) as quo_approved,
                     (SELECT COUNT(*) FROM contracts k WHERE k.project_id = p.id AND k.status IN ('draft','terkirim')) as spk_pending,
                     (SELECT COUNT(*) FROM contracts k WHERE k.project_id = p.id AND k.status = 'ditandatangani') as spk_signed,
                     (SELECT COUNT(*) FROM project_tasks pt WHERE pt.project_id = p.id) as tasks_total,
                     (SELECT COUNT(*) FROM project_tasks pt WHERE pt.project_id = p.id AND pt.status = 'done') as tasks_done,
                     (SELECT COUNT(*) FROM project_basts b WHERE b.project_id = p.id AND b.status = 'draft') as bast_draft,
                     (SELECT COUNT(*) FROM project_basts b WHERE b.project_id = p.id AND b.status = 'ditandatangani') as bast_signed,
                     (SELECT COUNT(*) FROM project_milestones pm WHERE pm.project_id = p.id AND pm.status = 'rencana' AND pm.invoice_id IS NULL) as ms_unbilled,
                     (SELECT COUNT(*) FROM invoices i WHERE i.project_id = p.id AND i.sisa_tagihan > 0 AND i.status NOT IN ('batal','dibatalkan')) as inv_unpaid,
                     (SELECT COALESCE(SUM(i.sisa_tagihan),0) FROM invoices i WHERE i.project_id = p.id AND i.sisa_tagihan > 0 AND i.status NOT IN ('batal','dibatalkan')) as inv_unpaid_amount
              FROM projects p 
              JOIN clients c ON p.client_id = c.id 
              $whereSql 
              ORDER BY p.id DESC";

    paginatedResponse($query, $countQuery, $bindings, $page, $perPage);
}

if ($method === 'POST') {
    checkPermission('project.create');

    $clientId = (int)($params['client_id'] ?? 0);
    $namaProject = trim($params['nama_project'] ?? '');
    $deskripsi = trim($params['deskripsi'] ?? '');
    $gitRepoUrl = trim($params['git_repo_url'] ?? '');
    $gitBranch = trim($params['git_branch'] ?? 'main');
    $deployPath = trim($params['deploy_path'] ?? '');
    $appUrl = trim($params['app_url'] ?? '');
    $tanggalMulai = !empty($params['tanggal_mulai']) ? $params['tanggal_mulai'] : date('Y-m-d');
    $tanggalSelesai = !empty($params['tanggal_selesai']) ? $params['tanggal_selesai'] : null;
    $nilaiProject = (float)($params['nilai_project'] ?? 0);
    $status = in_array($params['status'] ?? '', ['perencanaan', 'aktif', 'maintenance', 'selesai', 'dibatalkan']) ? $params['status'] : 'aktif';

    if (empty($namaProject) || !$clientId) {
        errorResponse('Nama proyek dan klien wajib diisi');
    }

    // Generate kode proyek otomatis (PRJ-0001)
    $lastProject = $db->fetch("SELECT kode_project FROM projects WHERE kode_project LIKE 'PRJ-%' ORDER BY id DESC LIMIT 1");
    if ($lastProject && !empty($lastProject['kode_project'])) {
        $lastNum = (int)str_replace('PRJ-', '', $lastProject['kode_project']);
        $nextNum = $lastNum + 1;
    } else {
        $nextNum = 1;
    }
    $kodeProject = 'PRJ-' . str_pad((string)$nextNum, 4, '0', STR_PAD_LEFT);

    $newId = $db->insert(
        "INSERT INTO projects (client_id, kode_project, nama_project, deskripsi, git_repo_url, git_branch, deploy_path, app_url, tanggal_mulai, tanggal_selesai, nilai_project, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [$clientId, $kodeProject, $namaProject, $deskripsi, $gitRepoUrl, $gitBranch, $deployPath, $appUrl, $tanggalMulai, $tanggalSelesai, $nilaiProject, $status]
    );

    logActivity('create', 'projects', $newId, null, $params);
    successResponse(['id' => $newId, 'kode_project' => $kodeProject], 'Proyek berhasil dibuat');
}

errorResponse('Metode tidak didukung', 405);
