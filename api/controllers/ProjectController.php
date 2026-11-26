<?php
// ProjectController.php

authCheck();
require_once __DIR__ . '/../config/project_helpers.php';
$db = Database::getInstance();

if ($id && is_numeric($id)) {
    $projectId = (int)$id;

    if ($action === 'golive-checklist') {
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

        $db->execute("UPDATE projects SET last_deploy_status = ?, last_deploy_at = NOW() WHERE id = ?", [$status, $projectId]);

        logActivity('git_sync', 'projects', $projectId, null, ['status' => $status, 'commit' => $commitHash]);

        successResponse([
            'project_id' => $projectId,
            'status' => $status,
            'commit_hash' => $commitHash,
            'synced_at' => date('Y-m-d H:i:s')
        ], 'Status deployment berhasil disinkronkan');
    }

    // Panel GitOps: Inspeksi detail repo lokal, .env, commit terakhir, & riwayat deploy
    if ($action === 'gitops') {
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

    // Trigger Deploy (git pull origin <branch> pada deploy_path)
    if ($action === 'deploy') {
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

    // Tracker Masa Garansi & Adendum / Change Request
    if ($action === 'change-requests') {
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

        $nomorInvoice = generateInvoiceNo('INV-');

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
    $lifecycleCols = projectLifecycleSubqueriesSql('p');
    $query = "SELECT p.*, c.nama_perusahaan as client_nama,
                     $lifecycleCols
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
    $kodeProject = generateDocNumber('projects', 'kode_project', 'PRJ-', 4, false, '');

    $newId = $db->insert(
        "INSERT INTO projects (client_id, kode_project, nama_project, deskripsi, git_repo_url, git_branch, deploy_path, app_url, tanggal_mulai, tanggal_selesai, nilai_project, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [$clientId, $kodeProject, $namaProject, $deskripsi, $gitRepoUrl, $gitBranch, $deployPath, $appUrl, $tanggalMulai, $tanggalSelesai, $nilaiProject, $status]
    );

    logActivity('create', 'projects', $newId, null, $params);
    successResponse(['id' => $newId, 'kode_project' => $kodeProject], 'Proyek berhasil dibuat');
}

errorResponse('Metode tidak didukung', 405);
