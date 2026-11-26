<?php
// api/config/project_ops_helpers.php — Lazy-loaded Project Ops Handlers (Go-Live, GitOps, Change Requests, Health Check)

function handleProjectGoliveChecklist(Database $db, int $projectId, string $method, array $params): void {
    $buildChecklist = static function (Database $db, int $pid): array {
        $proj = $db->fetch(
            "SELECT p.*, c.nama_perusahaan
             FROM projects p
             JOIN clients c ON p.client_id = c.id
             WHERE p.id = ?",
            [$pid]
        );
        if (!$proj) errorResponse('Proyek tidak ditemukan', 404);

        $slaRow = $db->fetch(
            "SELECT uptime_status, response_time_ms, ssl_days_left
             FROM maintenance_sla
             WHERE project_id = ?
             ORDER BY id DESC LIMIT 1",
            [$pid]
        );
        $credCount = (int)$db->count(
            "SELECT COUNT(*) FROM client_credentials WHERE project_id = ? OR client_id = ?",
            [$pid, (int)$proj['client_id']]
        );
        $taskStats = $db->fetch(
            "SELECT COUNT(*) as total,
                    SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_count
             FROM project_tasks WHERE project_id = ?",
            [$pid]
        );
        $contractRow = $db->fetch(
            "SELECT nomor_kontrak, status FROM contracts WHERE project_id = ? AND status != 'dibatalkan' ORDER BY id DESC LIMIT 1",
            [$pid]
        );
        $bastRow = $db->fetch(
            "SELECT nomor_bast, status FROM project_basts WHERE project_id = ? AND status != 'dibatalkan' ORDER BY id DESC LIMIT 1",
            [$pid]
        );

        $isOnline = (($proj['last_health_status'] ?? '') === 'online') || (($slaRow['uptime_status'] ?? '') === 'online');
        $sslDays = $proj['last_ssl_days'] ?? ($slaRow['ssl_days_left'] ?? null);
        $sslOk = $sslDays !== null && (int)$sslDays > 0;
        $totalTasks = (int)($taskStats['total'] ?? 0);
        $doneTasks = (int)($taskStats['done_count'] ?? 0);
        $tasksOk = $totalTasks > 0 && $doneTasks >= $totalTasks;
        $contractOk = $contractRow && in_array($contractRow['status'], ['ditandatangani', 'aktif', 'selesai'], true);
        $bastOk = $bastRow && $bastRow['status'] === 'ditandatangani';

        $savedManual = json_decode((string)($proj['golive_checklist_json'] ?? ''), true);
        if (!is_array($savedManual)) $savedManual = [];

        $manualDefs = [
            'backup_configured' => 'Backup database & file produksi sudah dijadwalkan',
            'uat_approved' => 'Uji coba UAT bersama tim klien selesai & disetujui',
            'training_done' => 'Pelatihan penggunaan aplikasi (user training) selesai',
            'monitoring_active' => 'Pemantauan uptime & kontak support darurat aktif'
        ];

        $items = [
            [
                'key' => 'url_online',
                'label' => 'URL Produksi Terpasang & Status Online',
                'category' => 'otomatis',
                'passed' => !empty($proj['app_url']) && $isOnline,
                'detail' => !empty($proj['app_url'])
                    ? ($isOnline ? "Online ({$proj['app_url']})" : "URL ada ({$proj['app_url']}), belum terdeteksi online")
                    : 'URL aplikasi produksi belum diisi'
            ],
            [
                'key' => 'ssl_valid',
                'label' => 'Sertifikat SSL / HTTPS Aktif',
                'category' => 'otomatis',
                'passed' => $sslOk,
                'detail' => $sslOk ? "SSL aktif (sisa {$sslDays} hari)" : 'SSL belum terdeteksi atau kedaluwarsa'
            ],
            [
                'key' => 'credentials_saved',
                'label' => 'Kredensial Server/Aplikasi Tersimpan di Brankas',
                'category' => 'otomatis',
                'passed' => $credCount > 0,
                'detail' => $credCount > 0 ? "{$credCount} kredensial tercatat" : 'Belum ada kredensial di Brankas Kredensial'
            ],
            [
                'key' => 'tasks_done',
                'label' => 'Seluruh Tugas Kanban Proyek Selesai',
                'category' => 'otomatis',
                'passed' => $tasksOk,
                'detail' => $totalTasks > 0 ? "{$doneTasks}/{$totalTasks} tugas selesai" : 'Belum ada tugas Kanban terdaftar'
            ],
            [
                'key' => 'contract_signed',
                'label' => 'Kontrak / SPK Digital Sudah Disahkan',
                'category' => 'otomatis',
                'passed' => (bool)$contractOk,
                'detail' => $contractRow ? "{$contractRow['nomor_kontrak']} ({$contractRow['status']})" : 'Belum ada kontrak/SPK terkait'
            ],
            [
                'key' => 'bast_signed',
                'label' => 'Berita Acara Serah Terima (BAST) Ditandatangani',
                'category' => 'otomatis',
                'passed' => (bool)$bastOk,
                'detail' => $bastRow ? "{$bastRow['nomor_bast']} ({$bastRow['status']})" : 'Belum ada BAST diterbitkan'
            ]
        ];

        foreach ($manualDefs as $mKey => $mLabel) {
            $entry = $savedManual[$mKey] ?? [];
            $checked = !empty($entry['checked']);
            $items[] = [
                'key' => $mKey,
                'label' => $mLabel,
                'category' => 'manual',
                'passed' => $checked,
                'detail' => $checked && !empty($entry['checked_by'])
                    ? "Diverifikasi oleh {$entry['checked_by']} (" . ($entry['checked_at'] ?? '') . ")"
                    : 'Menunggu konfirmasi tim',
                'checked_by' => $entry['checked_by'] ?? null,
                'checked_at' => $entry['checked_at'] ?? null
            ];
        }

        $totalCount = count($items);
        $passedCount = count(array_filter($items, static fn($it) => !empty($it['passed'])));
        $readyPct = $totalCount > 0 ? (int)round(($passedCount / $totalCount) * 100) : 0;

        return [
            'project' => [
                'id' => (int)$proj['id'],
                'kode_project' => $proj['kode_project'],
                'nama_project' => $proj['nama_project'],
                'nama_perusahaan' => $proj['nama_perusahaan']
            ],
            'items' => $items,
            'summary' => [
                'passed_count' => $passedCount,
                'total_count' => $totalCount,
                'ready_pct' => $readyPct,
                'is_ready' => $passedCount === $totalCount
            ]
        ];
    };

    if ($method === 'GET') {
        checkPermission('project.view');
        successResponse($buildChecklist($db, $projectId));
    }

    if ($method === 'POST') {
        checkPermission('project.edit');
        $proj = $db->fetch("SELECT id, nama_project, golive_checklist_json FROM projects WHERE id = ?", [$projectId]);
        if (!$proj) errorResponse('Proyek tidak ditemukan', 404);

        $key = validateEnum(
            (string)($params['key'] ?? ''),
            ['backup_configured', 'uat_approved', 'training_done', 'monitoring_active'],
            '',
            'Item checklist manual tidak valid'
        );
        $checked = !empty($params['checked']);
        $savedManual = json_decode((string)($proj['golive_checklist_json'] ?? ''), true);
        if (!is_array($savedManual)) $savedManual = [];

        $actor = $_SESSION['nama_lengkap'] ?? 'Admin ERP';
        $savedManual[$key] = [
            'checked' => $checked,
            'checked_by' => $checked ? $actor : null,
            'checked_at' => $checked ? date('Y-m-d H:i') : null
        ];

        $db->execute(
            "UPDATE projects SET golive_checklist_json = ? WHERE id = ?",
            [json_encode($savedManual, JSON_UNESCAPED_UNICODE), $projectId]
        );
        logActivity('project.golive_checklist', 'projects', $projectId, null, ['key' => $key, 'checked' => $checked]);
        successResponse($buildChecklist($db, $projectId), 'Checklist Go-Live diperbarui');
    }

    errorResponse('Metode tidak didukung', 405);
}

function handleProjectSyncGit(Database $db, int $projectId): void {
    checkPermission('project.git_sync');
    $project = $db->fetch("SELECT * FROM projects WHERE id = ?", [$projectId]);
    if (!$project) errorResponse('Proyek tidak ditemukan', 404);

    $deployPath = $project['deploy_path'] ?? '';
    $status = 'idle';
    $commitHash = '-';

    if (!empty($deployPath) && file_exists($deployPath)) {
        if (is_dir($deployPath . '/.git')) {
            $status = 'success';
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
        }
    } else {
        $status = 'failed';
    }

    $db->execute("UPDATE projects SET last_deploy_status = ?, last_deploy_at = NOW() WHERE id = ?", [$status, $projectId]);
    logActivity('git_sync', 'projects', $projectId, null, ['status' => $status, 'commit' => $commitHash]);

    successResponse([
        'project_id' => $projectId,
        'status' => $status,
        'commit_hash' => $commitHash,
        'synced_at' => date('Y-m-d H:i:s')
    ], 'Status deployment berhasil disinkronkan');
}

function handleProjectGitOps(Database $db, int $projectId): void {
    checkPermission('project.view');
    $project = $db->fetch("SELECT * FROM projects WHERE id = ?", [$projectId]);
    if (!$project) errorResponse('Proyek tidak ditemukan', 404);

    $deployPath = trim((string)($project['deploy_path'] ?? ''));
    $pathExists = $deployPath !== '' && is_dir($deployPath);
    $isGitRepo = $pathExists && is_dir($deployPath . '/.git');
    $hasEnv = $pathExists && file_exists($deployPath . '/.env');
    $appGitInstalled = is_dir('d:/laragon/www/app-git') || is_dir(__DIR__ . '/../../../app-git');

    $branch = (string)($project['git_branch'] ?: 'main');
    $commitHash = '-';
    $commitMsg = '-';
    $commitAuthor = '-';
    $commitDate = '-';
    $dirtyCount = 0;

    if ($isGitRepo && function_exists('shell_exec')) {
        $safePath = escapeshellarg($deployPath);
        $brOut = trim((string)@shell_exec("git -C {$safePath} rev-parse --abbrev-ref HEAD 2>&1"));
        if ($brOut !== '' && !str_contains($brOut, 'fatal:')) $branch = $brOut;

        $logOut = trim((string)@shell_exec("git -C {$safePath} log -1 --format=\"%h|%s|%an|%ci\" 2>&1"));
        if ($logOut !== '' && str_contains($logOut, '|')) {
            $parts = explode('|', $logOut, 4);
            $commitHash = $parts[0] ?? '-';
            $commitMsg = $parts[1] ?? '-';
            $commitAuthor = $parts[2] ?? '-';
            $commitDate = $parts[3] ?? '-';
        }

        $stOut = trim((string)@shell_exec("git -C {$safePath} status --porcelain 2>&1"));
        if ($stOut !== '' && !str_contains($stOut, 'fatal:')) {
            $dirtyCount = count(array_filter(explode("\n", $stOut)));
        }
    }

    $logs = $db->fetchAll(
        "SELECT l.*, u.nama_lengkap as triggered_by_name
         FROM project_deploy_logs l
         LEFT JOIN users u ON l.triggered_by = u.id
         WHERE l.project_id = ?
         ORDER BY l.id DESC LIMIT 10",
        [$projectId]
    );

    successResponse([
        'project_id' => $projectId,
        'nama_project' => $project['nama_project'],
        'git_repo_url' => $project['git_repo_url'],
        'git_branch' => $branch,
        'deploy_path' => $deployPath,
        'app_url' => $project['app_url'],
        'path_exists' => $pathExists,
        'is_git_repo' => $isGitRepo,
        'has_env' => $hasEnv,
        'app_git_installed' => $appGitInstalled,
        'commit_hash' => $commitHash,
        'commit_message' => $commitMsg,
        'commit_author' => $commitAuthor,
        'commit_date' => $commitDate,
        'dirty_files' => $dirtyCount,
        'last_deploy_status' => $project['last_deploy_status'],
        'last_deploy_at' => $project['last_deploy_at'],
        'logs' => $logs
    ]);
}

function handleProjectDeploy(Database $db, int $projectId, string $method): void {
    if ($method !== 'POST') errorResponse('Method not allowed', 405);
    checkPermission('project.git_sync');
    $project = $db->fetch("SELECT * FROM projects WHERE id = ?", [$projectId]);
    if (!$project) errorResponse('Proyek tidak ditemukan', 404);

    $deployPath = trim((string)($project['deploy_path'] ?? ''));
    $branch = preg_replace('/[^a-zA-Z0-9._\/-]/', '', (string)($project['git_branch'] ?: 'main')) ?: 'main';
    if ($deployPath === '' || !is_dir($deployPath . '/.git')) {
        errorResponse('Folder deploy_path belum diatur atau bukan repositori Git valid', 422);
    }

    $safePath = escapeshellarg($deployPath);
    $safeBr = escapeshellarg($branch);
    $cmd = "git -C {$safePath} pull origin {$safeBr} 2>&1";
    $outLines = [];
    $exitCode = 1;
    if (function_exists('exec')) {
        @exec($cmd, $outLines, $exitCode);
    } else {
        $outLines[] = 'Fungsi exec() dinonaktifkan pada PHP server';
    }
    $outputText = trim(implode("\n", $outLines));
    $status = ($exitCode === 0) ? 'success' : 'failed';

    $commitHash = '-';
    $commitMsg = '-';
    $logOut = trim((string)@shell_exec("git -C {$safePath} log -1 --format=\"%h|%s\" 2>&1"));
    if ($logOut !== '' && str_contains($logOut, '|')) {
        [$commitHash, $commitMsg] = explode('|', $logOut, 2);
    }

    $userId = !empty($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
    $db->execute("UPDATE projects SET last_deploy_status = ?, last_deploy_at = NOW() WHERE id = ?", [$status, $projectId]);
    $db->insert(
        "INSERT INTO project_deploy_logs (project_id, branch, commit_hash, commit_message, action_type, status, output_log, triggered_by)
         VALUES (?, ?, ?, ?, 'deploy', ?, ?, ?)",
        [$projectId, $branch, $commitHash, mb_substr($commitMsg, 0, 255), $status, $outputText, $userId]
    );

    logActivity('git_deploy', 'projects', $projectId, null, ['status' => $status, 'branch' => $branch, 'commit' => $commitHash]);
    dispatchWebhook('project.updated', [
        'project_id' => $projectId,
        'nama_project' => $project['nama_project'],
        'action' => 'deploy',
        'branch' => $branch,
        'commit_hash' => $commitHash,
        'status' => $status
    ]);

    if ($status === 'failed') {
        createNotification('Deploy Proyek Gagal', "Deploy {$project['nama_project']} ({$branch}) gagal.", '#/projects', 'bahaya');
        errorResponse('Deploy gagal: ' . ($outputText ?: 'Exit code ' . $exitCode), 500);
    }

    createNotification('Deploy Proyek Sukses', "{$project['nama_project']} ({$branch} · {$commitHash}) berhasil dideploy.", '#/projects', 'sukses');
    successResponse([
        'status' => $status,
        'branch' => $branch,
        'commit_hash' => $commitHash,
        'commit_message' => $commitMsg,
        'output' => $outputText
    ], "Deploy branch {$branch} berhasil ({$commitHash})");
}

function handleProjectChangeRequests(Database $db, int $projectId, string $method, array $params, array $segments): void {
    $project = $db->fetch("SELECT * FROM projects WHERE id = ?", [$projectId]);
    if (!$project) errorResponse('Proyek tidak ditemukan', 404);

    $subId = isset($segments[3]) && is_numeric($segments[3]) ? (int)$segments[3] : 0;
    $subAction = $segments[4] ?? null;

    if ($method === 'GET') {
        checkPermission('project.view');
        $wRow = $db->fetch(
            "SELECT COALESCE((SELECT MAX(k.garansi_hari) FROM contracts k WHERE k.project_id = ? AND k.status != 'dibatalkan'), 0) as warranty_days,
                    (SELECT MAX(COALESCE(DATE(b.signed_at), b.tanggal_bast)) FROM project_basts b WHERE b.project_id = ? AND b.status = 'ditandatangani') as warranty_start",
            [$projectId, $projectId]
        );
        $warranty = computeProjectWarranty((int)($wRow['warranty_days'] ?? 0), $wRow['warranty_start'] ?? null);
        $items = $db->fetchAll(
            "SELECT cr.*, i.nomor_invoice, i.status as invoice_status
             FROM project_change_requests cr
             LEFT JOIN invoices i ON cr.invoice_id = i.id
             WHERE cr.project_id = ?
             ORDER BY cr.id DESC",
            [$projectId]
        );
        successResponse(['project' => $project, 'warranty' => $warranty, 'items' => $items]);
    }

    if ($method === 'POST' && $subId > 0 && $subAction === 'invoice') {
        checkPermission('invoice.create');
        $cr = $db->fetch("SELECT * FROM project_change_requests WHERE id = ? AND project_id = ?", [$subId, $projectId]);
        if (!$cr) errorResponse('Adendum tidak ditemukan', 404);
        if (!empty($cr['invoice_id'])) errorResponse('Adendum ini sudah diterbitkan fakturnya', 422);
        if ((float)$cr['biaya'] <= 0) errorResponse('Biaya adendum harus lebih dari Rp 0 untuk ditagihkan', 422);

        $userId = (int)($_SESSION['user_id'] ?? 1);
        $dueDays = (int)(($db->fetch("SELECT nilai FROM app_settings WHERE kunci = 'invoice_due_days'")['nilai'] ?? 14));
        $pajakPersen = (float)(($db->fetch("SELECT nilai FROM app_settings WHERE kunci = 'default_pajak_persen'")['nilai'] ?? 0));
        $subtotal = (float)$cr['biaya'];
        $pajakNominal = round($subtotal * ($pajakPersen / 100), 2);
        $totalTagihan = $subtotal + $pajakNominal;
        $nomorInvoice = generateInvoiceNumber();
        $publicToken = generatePublicToken();

        $pdo = $db->getPdo();
        $pdo->beginTransaction();
        try {
            $stmtInv = $pdo->prepare(
                "INSERT INTO invoices (`nomor_invoice`, `public_token`, `client_id`, `project_id`, `tanggal_invoice`, `tanggal_jatuh_tempo`, `subtotal`, `diskon_tipe`, `diskon_nilai`, `pajak_persen`, `pajak_nominal`, `total_tagihan`, `total_dibayar`, `sisa_tagihan`, `status`, `catatan_klien`, `created_by`)
                 VALUES (?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), ?, 'nominal', 0.00, ?, ?, ?, 0.00, ?, 'dikirim', ?, ?)"
            );
            $catatanKlien = "Pembayaran Adendum {$cr['nomor_adendum']}: {$cr['judul']} ({$project['nama_project']})";
            $stmtInv->execute([$nomorInvoice, $publicToken, $project['client_id'], $projectId, $dueDays, $subtotal, $pajakPersen, $pajakNominal, $totalTagihan, $totalTagihan, $catatanKlien, $userId]);
            $newInvId = (int)$pdo->lastInsertId();

            $pdo->prepare(
                "INSERT INTO invoice_items (`invoice_id`, `deskripsi`, `kuantitas`, `satuan`, `harga_satuan`, `total_harga`, `urutan`)
                 VALUES (?, ?, 1.00, 'adendum', ?, ?, 1)"
            )->execute([$newInvId, "Adendum {$cr['nomor_adendum']}: {$cr['judul']}", $subtotal, $subtotal]);

            $newStatus = $cr['status'] === 'draft' ? 'disetujui' : $cr['status'];
            $pdo->prepare("UPDATE project_change_requests SET invoice_id = ?, status = ? WHERE id = ?")
                ->execute([$newInvId, $newStatus, $subId]);

            $pdo->commit();
            clearCache(['invoices', 'projects', 'dashboard']);
            logActivity('create', 'invoices', $newInvId, null, ['nomor_invoice' => $nomorInvoice, 'change_request_id' => $subId]);
            successResponse(['invoice_id' => $newInvId, 'nomor_invoice' => $nomorInvoice], "Faktur Adendum {$nomorInvoice} berhasil diterbitkan", 201);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            errorResponse('Gagal menerbitkan faktur adendum: ' . $e->getMessage(), 500);
        }
    }

    if ($method === 'POST') {
        checkPermission('project.edit');
        $judul = trim($params['judul'] ?? '');
        $deskripsi = trim($params['deskripsi'] ?? '');
        $biaya = (float)($params['biaya'] ?? 0);
        $estimasiHari = (int)($params['estimasi_hari'] ?? 0);
        $status = in_array($params['status'] ?? '', ['draft', 'disetujui', 'dikerjakan', 'selesai', 'ditolak'], true) ? $params['status'] : 'draft';
        if ($judul === '') errorResponse('Judul adendum / change request wajib diisi', 422);

        $nomor = generateDocNumber('project_change_requests', 'nomor_adendum', 'ADD-', 4, true, '-');
        $userId = (int)($_SESSION['user_id'] ?? 1);

        $newCrId = (int)$db->insert(
            "INSERT INTO project_change_requests (project_id, nomor_adendum, judul, deskripsi, biaya, estimasi_hari, status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [$projectId, $nomor, $judul, $deskripsi ?: null, $biaya, $estimasiHari, $status, $userId]
        );
        clearCache(['projects']);
        successResponse(['id' => $newCrId, 'nomor_adendum' => $nomor], 'Adendum proyek berhasil ditambahkan', 201);
    }

    if ($method === 'PUT' && $subId > 0) {
        checkPermission('project.edit');
        $cr = $db->fetch("SELECT * FROM project_change_requests WHERE id = ? AND project_id = ?", [$subId, $projectId]);
        if (!$cr) errorResponse('Adendum tidak ditemukan', 404);
        $status = in_array($params['status'] ?? '', ['draft', 'disetujui', 'dikerjakan', 'selesai', 'ditolak'], true) ? $params['status'] : $cr['status'];
        $judul = isset($params['judul']) ? trim($params['judul']) : $cr['judul'];
        $deskripsi = array_key_exists('deskripsi', $params) ? trim((string)$params['deskripsi']) : $cr['deskripsi'];
        $biaya = isset($params['biaya']) ? (float)$params['biaya'] : (float)$cr['biaya'];
        $estimasiHari = isset($params['estimasi_hari']) ? (int)$params['estimasi_hari'] : (int)$cr['estimasi_hari'];

        $db->execute(
            "UPDATE project_change_requests SET judul = ?, deskripsi = ?, biaya = ?, estimasi_hari = ?, status = ? WHERE id = ?",
            [$judul, $deskripsi ?: null, $biaya, $estimasiHari, $status, $subId]
        );
        clearCache(['projects']);
        successResponse(null, 'Adendum proyek diperbarui');
    }

    if ($method === 'DELETE' && $subId > 0) {
        checkPermission('project.edit');
        $cr = $db->fetch("SELECT * FROM project_change_requests WHERE id = ? AND project_id = ?", [$subId, $projectId]);
        if (!$cr) errorResponse('Adendum tidak ditemukan', 404);
        if (!empty($cr['invoice_id'])) errorResponse('Adendum yang sudah ditagihkan tidak dapat dihapus', 422);
        $db->execute("DELETE FROM project_change_requests WHERE id = ?", [$subId]);
        clearCache(['projects']);
        successResponse(null, 'Adendum proyek dihapus');
    }
}

function handleProjectHealthCheck(Database $db, int $projectId): void {
    checkPermission('project.view');
    $project = $db->fetch("SELECT * FROM projects WHERE id = ?", [$projectId]);
    if (!$project) errorResponse('Proyek tidak ditemukan', 404);

    $targetUrl = trim($project['app_url'] ?? '');
    if (empty($targetUrl)) {
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
    curl_exec($ch);
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
