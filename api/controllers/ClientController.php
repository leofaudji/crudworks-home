<?php
// ClientController.php

authCheck();
$db = Database::getInstance();

// If ID is numeric
if ($id && is_numeric($id)) {
    $clientId = (int)$id;

    $client = $db->fetch("SELECT * FROM clients WHERE id = ?", [$clientId]);
    if (!$client) errorResponse('Pelanggan tidak ditemukan', 404);

    // Sub-Action: Riwayat Follow-Up Interaksi Prospek/Klien
    if ($action === 'followups') {
        if ($method === 'GET') {
            checkPermission('client.view');
            $followups = $db->fetchAll(
                "SELECT f.*, u.nama_lengkap as author_name 
                 FROM client_followups f 
                 JOIN users u ON f.user_id = u.id 
                 WHERE f.client_id = ? 
                 ORDER BY f.tanggal DESC, f.id DESC",
                [$clientId]
            );
            successResponse($followups);
        }

        if ($method === 'POST') {
            checkPermission('client.edit');
            $tipe = in_array($params['tipe'] ?? '', ['whatsapp', 'telepon', 'email', 'meeting_online', 'meeting_offline', 'catatan'])
                ? $params['tipe']
                : 'whatsapp';
            $catatan = trim($params['catatan'] ?? '');
            $tanggal = !empty($params['tanggal']) ? $params['tanggal'] : date('Y-m-d H:i:s');
            $nextDate = !empty($params['next_followup_date']) ? $params['next_followup_date'] : null;
            $userId = (int)($_SESSION['user_id'] ?? 1);

            if (empty($catatan)) {
                errorResponse('Catatan interaksi / follow-up wajib diisi', 422);
            }

            $newFid = (int)$db->insert(
                "INSERT INTO client_followups (client_id, user_id, tipe, tanggal, catatan, next_followup_date, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())",
                [$clientId, $userId, $tipe, $tanggal, $catatan, $nextDate]
            );

            $db->execute("UPDATE clients SET last_contact_at = NOW() WHERE id = ?", [$clientId]);

            logActivity('client.followup', "Menambahkan catatan interaksi [{$tipe}] untuk {$client['nama_perusahaan']}");
            successResponse(['id' => $newFid], 'Catatan interaksi berhasil dicatat');
        }
    }

    // Sub-Action: Rekening Koran / Statement of Account Klien
    if ($action === 'statement' && $method === 'GET') {
        checkPermission('client.view');

        $projects = $db->fetchAll(
            "SELECT p.id, p.kode_project, p.nama_project, p.status,
                    COALESCE((SELECT SUM(k.nilai_kontrak) FROM contracts k WHERE k.project_id = p.id AND k.status != 'dibatalkan'), 0) as nilai_kontrak
             FROM projects p
             WHERE p.client_id = ?
             ORDER BY p.id DESC",
            [$clientId]
        );

        $invoices = $db->fetchAll(
            "SELECT id, nomor_invoice, tanggal_invoice, tanggal_jatuh_tempo, total_tagihan, total_dibayar, sisa_tagihan, status
             FROM invoices
             WHERE client_id = ? AND status != 'batal'
             ORDER BY tanggal_invoice DESC, id DESC",
            [$clientId]
        );

        $payments = $db->fetchAll(
            "SELECT py.id, py.nomor_pembayaran, py.tanggal_bayar, py.jumlah_bayar, py.nomor_referensi,
                    i.nomor_invoice, pm.nama_metode, pm.nama_bank
             FROM payments py
             JOIN invoices i ON py.invoice_id = i.id
             LEFT JOIN payment_methods pm ON py.payment_method_id = pm.id
             WHERE i.client_id = ?
             ORDER BY py.tanggal_bayar DESC, py.id DESC",
            [$clientId]
        );

        $totalInvoiced = 0.0;
        $totalPaid = 0.0;
        $totalOutstanding = 0.0;
        foreach ($invoices as $inv) {
            $totalInvoiced += (float)$inv['total_tagihan'];
            $totalPaid += (float)$inv['total_dibayar'];
            $totalOutstanding += (float)$inv['sisa_tagihan'];
        }

        $settingsRows = $db->fetchAll(
            "SELECT kunci, nilai FROM app_settings WHERE kunci IN ('company_name', 'company_address', 'company_phone', 'company_email', 'company_npwp')"
        );
        $company = [];
        foreach ($settingsRows as $sr) {
            $company[$sr['kunci']] = $sr['nilai'];
        }

        successResponse([
            'client' => $client,
            'company' => $company,
            'projects' => $projects,
            'invoices' => $invoices,
            'payments' => $payments,
            'summary' => [
                'total_invoiced' => $totalInvoiced,
                'total_paid' => $totalPaid,
                'total_outstanding' => $totalOutstanding,
                'saldo_deposit' => (float)($client['saldo_deposit'] ?? 0),
                'invoice_count' => count($invoices),
                'payment_count' => count($payments),
                'project_count' => count($projects)
            ]
        ]);
    }

    // Sub-Action: Update Stage CRM Prospek
    if ($action === 'stage' && $method === 'POST') {
        checkPermission('client.edit');
        $newStage = in_array($params['prospect_stage'] ?? '', ['leads_baru', 'kontak_awal', 'proposal_penawaran', 'negosiasi', 'deal_menang', 'batal_lost'])
            ? $params['prospect_stage']
            : 'leads_baru';
        $dealValue = isset($params['deal_value']) ? (float)$params['deal_value'] : (float)($client['deal_value'] ?? 0);
        $closeDate = !empty($params['expected_close_date']) ? $params['expected_close_date'] : $client['expected_close_date'];
        $lostReason = !empty($params['lost_reason']) ? trim($params['lost_reason']) : null;

        $newStatus = $client['status'];
        if ($newStage === 'deal_menang') {
            $newStatus = 'aktif'; // Otomatis aktifkan pelanggan bila deal menang
        }

        $db->execute(
            "UPDATE clients 
             SET prospect_stage = ?, deal_value = ?, expected_close_date = ?, lost_reason = ?, status = ?, last_contact_at = NOW()
             WHERE id = ?",
            [$newStage, $dealValue, $closeDate, $lostReason, $newStatus, $clientId]
        );

        clearCache(['clients']);
        logActivity('client.stage', "Memindahkan tahapan CRM {$client['nama_perusahaan']} ke {$newStage}");

        successResponse([
            'id' => $clientId,
            'prospect_stage' => $newStage,
            'status' => $newStatus
        ], "Tahapan prospek berhasil diperbarui ke " . ucfirst(str_replace('_', ' ', $newStage)));
    }

    // Sub-Action: Saldo Deposit / Retainer Klien
    if ($action === 'deposit') {
        if ($method === 'GET') {
            checkPermission('client.view');
            $logs = $db->fetchAll(
                "SELECT d.*, i.nomor_invoice, u.nama_lengkap as author_name
                 FROM client_deposit_logs d
                 LEFT JOIN invoices i ON d.invoice_id = i.id
                 LEFT JOIN users u ON d.created_by = u.id
                 WHERE d.client_id = ?
                 ORDER BY d.id DESC LIMIT 30",
                [$clientId]
            );
            successResponse([
                'saldo_deposit' => (float)($client['saldo_deposit'] ?? 0),
                'logs' => $logs
            ]);
        }

        if ($method === 'POST') {
            checkPermission('payment.create');
            $tipe = in_array($params['tipe'] ?? '', ['topup', 'refund'], true) ? $params['tipe'] : 'topup';
            $nominal = (float)($params['nominal'] ?? 0);
            $catatan = trim((string)($params['catatan'] ?? ''));
            $userId = (int)($_SESSION['user_id'] ?? 1);

            if ($nominal <= 0) errorResponse('Nominal deposit harus lebih dari 0', 422);

            $pdo = $db->getPdo();
            $pdo->beginTransaction();
            try {
                $curRow = $db->fetch("SELECT saldo_deposit FROM clients WHERE id = ? FOR UPDATE", [$clientId]);
                $curSaldo = (float)($curRow['saldo_deposit'] ?? 0);
                if ($tipe === 'refund' && $nominal > $curSaldo) {
                    $pdo->rollBack();
                    errorResponse('Nominal pengembalian melebihi saldo deposit saat ini', 422);
                }
                $newSaldo = $tipe === 'topup' ? ($curSaldo + $nominal) : ($curSaldo - $nominal);
                $pdo->prepare("UPDATE clients SET saldo_deposit = ? WHERE id = ?")->execute([$newSaldo, $clientId]);
                $pdo->prepare(
                    "INSERT INTO client_deposit_logs (client_id, tipe, nominal, saldo_setelah, catatan, created_by) VALUES (?, ?, ?, ?, ?, ?)"
                )->execute([$clientId, $tipe, $nominal, $newSaldo, $catatan ?: ($tipe === 'topup' ? 'Topup saldo deposit' : 'Pengembalian deposit'), $userId]);
                $pdo->commit();
                clearCache(['clients']);
                logActivity('client.deposit', 'clients', $clientId, null, ['keterangan' => "{$tipe} deposit " . formatIDR($nominal) . " untuk {$client['nama_perusahaan']}"]);
                successResponse(['saldo_deposit' => $newSaldo], 'Saldo deposit berhasil diperbarui');
            } catch (\Throwable $e) {
                $pdo->rollBack();
                errorResponse('Gagal memproses deposit: ' . $e->getMessage(), 500);
            }
        }
    }

    // Sub-Action: Kelola akses login Portal Klien mandiri (PWA /portal)
    if ($action === 'portal-access' && $method === 'POST') {
        checkPermission('client.edit');
        $mode = trim((string)($params['mode'] ?? 'generate'));

        if ($mode === 'revoke') {
            $db->execute(
                "UPDATE clients SET portal_password = NULL, portal_failed_attempts = 0, portal_locked_until = NULL WHERE id = ?",
                [$clientId]
            );
            logActivity('client.portal', 'clients', $clientId, null, ['keterangan' => "Mencabut akses login portal {$client['nama_perusahaan']}"]);
            successResponse(['revoked' => true], 'Akses login portal klien dicabut');
        }

        $custom = (string)($params['password'] ?? '');
        if ($custom !== '' && strlen($custom) < 8) {
            errorResponse('Kata sandi kustom minimal 8 karakter', 422);
        }
        $plain = $custom;
        if ($plain === '') {
            $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
            for ($i = 0; $i < 10; $i++) {
                $plain .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
        }

        $db->execute(
            "UPDATE clients SET portal_password = ?, portal_failed_attempts = 0, portal_locked_until = NULL WHERE id = ?",
            [password_hash($plain, PASSWORD_DEFAULT), $clientId]
        );
        logActivity('client.portal', 'clients', $clientId, null, ['keterangan' => "Membuat/mereset kata sandi login portal {$client['nama_perusahaan']}"]);

        successResponse([
            'nama_perusahaan' => $client['nama_perusahaan'],
            'penanggung_jawab' => $client['penanggung_jawab'],
            'telepon' => $client['telepon'],
            'login_id' => $client['kode_klien'],
            'email' => $client['email'],
            'password' => $plain,
            'portal_url' => rtrim(APP_URL, '/') . '/portal/'
        ], 'Akses login portal klien berhasil dibuat');
    }

    // Sub-Action: Dapatkan / Buat Tautan Portal Klien
    if ($action === 'portal-link') {
        checkPermission('client.view');
        $token = $client['portal_token'];
        if (empty($token)) {
            $token = bin2hex(random_bytes(24));
            $db->execute("UPDATE clients SET portal_token = ? WHERE id = ?", [$token, $clientId]);
        }
        $url = APP_URL . "/#/client-portal?token={$token}";
        successResponse([
            'token' => $token,
            'portal_url' => $url,
            'nama_perusahaan' => $client['nama_perusahaan']
        ]);
    }

    if ($method === 'GET') {
        checkPermission('client.view');

        // Sub-Action: Ambil layanan aktif yang digunakan pelanggan
        if ($action === 'active-services' || $action === 'services') {
            $servicesList = [];

            // 1. Cek dari SLA & Kontrak Layanan Aktif (maintenance_sla)
            try {
                $slaRows = $db->fetchAll(
                    "SELECT ms.*, p.nama_project 
                     FROM maintenance_sla ms 
                     LEFT JOIN projects p ON ms.project_id = p.id 
                     WHERE ms.client_id = ? AND ms.status IN ('aktif', 'segera_kadaluwarsa') 
                     ORDER BY ms.tanggal_berakhir ASC",
                    [$clientId]
                );

                if (!empty($slaRows)) {
                    foreach ($slaRows as $sla) {
                        $matchedService = $db->fetch(
                            "SELECT id, harga_standar, siklus_tagihan FROM services WHERE nama_layanan = ? OR nama_layanan LIKE ? LIMIT 1",
                            [$sla['nama_aset'], "%{$sla['nama_aset']}%"]
                        );

                        $desc = $sla['nama_aset'];
                        if (!empty($sla['domain_name'])) {
                            $desc .= " ({$sla['domain_name']})";
                        }
                        if (!empty($sla['siklus'])) {
                            $desc .= " - Periode " . ucfirst(str_replace('_', ' ', $sla['siklus']));
                        }

                        $price = (float)$sla['biaya_perpanjangan'];
                        if ($price <= 0 && $matchedService) {
                            $price = (float)$matchedService['harga_standar'];
                        }

                        $servicesList[] = [
                            'service_id' => $matchedService ? (int)$matchedService['id'] : null,
                            'deskripsi' => $desc,
                            'kuantitas' => 1,
                            'harga_satuan' => $price,
                            'satuan' => $sla['siklus'] ?: 'paket',
                            'source' => 'Kontrak SLA Aktif (' . ucfirst($sla['jenis']) . ')'
                        ];
                    }
                }
            } catch (\Throwable $e) {}

            // 2. Cek dari Tagihan Berulang (recurring_invoices) jika ada
            if (empty($servicesList)) {
                try {
                    $recurring = $db->fetch(
                        "SELECT * FROM recurring_invoices WHERE client_id = ? AND status = 'aktif' ORDER BY id DESC LIMIT 1",
                        [$clientId]
                    );
                    if ($recurring && !empty($recurring['data_items_json'])) {
                        $rItems = json_decode($recurring['data_items_json'], true);
                        if (is_array($rItems)) {
                            foreach ($rItems as $it) {
                                $servicesList[] = [
                                    'service_id' => !empty($it['service_id']) ? (int)$it['service_id'] : null,
                                    'deskripsi' => $it['deskripsi'] ?? 'Layanan Berlangganan',
                                    'kuantitas' => (float)($it['kuantitas'] ?? 1),
                                    'harga_satuan' => (float)($it['harga_satuan'] ?? 0),
                                    'satuan' => $it['satuan'] ?? 'unit',
                                    'source' => 'Template Tagihan Berulang (' . ucfirst($recurring['frekuensi']) . ')'
                                ];
                            }
                        }
                    }
                } catch (\Throwable $e) {}
            }

            // 3. Cek dari Surat Penawaran yang Disetujui (quotations) yang belum ditagihkan
            if (empty($servicesList)) {
                try {
                    $quoRows = $db->fetchAll(
                        "SELECT q.id as quotation_id, q.nomor_penawaran, qi.* 
                         FROM quotations q 
                         JOIN quotation_items qi ON q.id = qi.quotation_id 
                         WHERE q.client_id = ? AND q.status = 'disetujui' AND (q.converted_invoice_id IS NULL OR q.converted_invoice_id = 0)
                         ORDER BY q.id DESC",
                        [$clientId]
                    );
                    if (!empty($quoRows)) {
                        foreach ($quoRows as $qi) {
                            $servicesList[] = [
                                'service_id' => !empty($qi['service_id']) ? (int)$qi['service_id'] : null,
                                'deskripsi' => $qi['deskripsi'],
                                'kuantitas' => (float)($qi['kuantitas'] ?? 1),
                                'harga_satuan' => (float)($qi['harga_satuan'] ?? 0),
                                'satuan' => $qi['satuan'] ?? 'paket',
                                'source' => 'Penawaran Disetujui (' . $qi['nomor_penawaran'] . ')'
                            ];
                        }
                    }
                } catch (\Throwable $e) {}
            }

            // 4. Fallback: Ambil dari Riwayat Faktur Terakhir (invoices & invoice_items)
            if (empty($servicesList)) {
                try {
                    $lastInv = $db->fetch(
                        "SELECT id, nomor_invoice FROM invoices WHERE client_id = ? AND status != 'batal' ORDER BY id DESC LIMIT 1",
                        [$clientId]
                    );
                    if ($lastInv) {
                        $invItems = $db->fetchAll(
                            "SELECT ii.* FROM invoice_items ii WHERE ii.invoice_id = ? ORDER BY ii.id ASC",
                            [$lastInv['id']]
                        );
                        foreach ($invItems as $it) {
                            $servicesList[] = [
                                'service_id' => !empty($it['service_id']) ? (int)$it['service_id'] : null,
                                'deskripsi' => $it['deskripsi'],
                                'kuantitas' => (float)($it['kuantitas'] ?? 1),
                                'harga_satuan' => (float)($it['harga_satuan'] ?? 0),
                                'satuan' => $it['satuan'] ?? 'unit',
                                'source' => 'Riwayat Faktur Terakhir (' . $lastInv['nomor_invoice'] . ')'
                            ];
                        }
                    }
                } catch (\Throwable $e) {}
            }

            successResponse($servicesList);
            return;
        }

        // Ambil project klien
        $projects = $db->fetchAll(
            "SELECT id, kode_project, nama_project, git_repo_url, git_branch, last_deploy_status, status, nilai_project 
             FROM projects WHERE client_id = ? ORDER BY id DESC",
            [$clientId]
        );

        // Ambil ringkasan invoice
        $invoices = $db->fetchAll(
            "SELECT id, nomor_invoice, tanggal_invoice, tanggal_jatuh_tempo, total_tagihan, total_dibayar, sisa_tagihan, status 
             FROM invoices WHERE client_id = ? ORDER BY id DESC LIMIT 10",
            [$clientId]
        );

        // Piutang klien
        $piutangRow = $db->fetch(
            "SELECT COALESCE(SUM(sisa_tagihan), 0) as total_piutang 
             FROM invoices WHERE client_id = ? AND status IN ('dikirim', 'sebagian', 'jatuh_tempo')",
            [$clientId]
        );

        $client['projects'] = $projects;
        $client['invoices'] = $invoices;
        $client['total_piutang'] = (float)($piutangRow['total_piutang'] ?? 0);

        successResponse($client);
    }

    if ($method === 'PUT') {
        checkPermission('client.edit');
        $client = $db->fetch("SELECT * FROM clients WHERE id = ?", [$clientId]);
        if (!$client) errorResponse('Pelanggan tidak ditemukan', 404);

        $namaPerusahaan = trim($params['nama_perusahaan'] ?? $client['nama_perusahaan']);
        $penanggungJawab = trim($params['penanggung_jawab'] ?? $client['penanggung_jawab']);
        $email = trim($params['email'] ?? $client['email']);
        $telepon = trim($params['telepon'] ?? $client['telepon'] ?? '');
        $alamat = trim($params['alamat'] ?? $client['alamat'] ?? '');
        $kota = trim($params['kota'] ?? $client['kota'] ?? '');
        $npwp = trim($params['npwp'] ?? $client['npwp'] ?? '');
        $catatan = trim($params['catatan'] ?? $client['catatan'] ?? '');
        $status = in_array($params['status'] ?? '', ['aktif', 'prospek', 'nonaktif']) ? $params['status'] : ($client['status'] ?? 'aktif');

        if (empty($namaPerusahaan) || empty($email) || empty($penanggungJawab)) {
            errorResponse('Nama perusahaan, penanggung jawab, dan email wajib diisi');
        }

        $prospectStage = in_array($params['prospect_stage'] ?? '', ['leads_baru', 'kontak_awal', 'proposal_penawaran', 'negosiasi', 'deal_menang', 'batal_lost'])
            ? $params['prospect_stage']
            : ($client['prospect_stage'] ?? 'leads_baru');
        $dealValue = isset($params['deal_value']) ? (float)$params['deal_value'] : (float)($client['deal_value'] ?? 0);

        $db->execute(
            "UPDATE clients SET nama_perusahaan = ?, penanggung_jawab = ?, email = ?, telepon = ?, 
                    alamat = ?, kota = ?, npwp = ?, catatan = ?, status = ?, prospect_stage = ?, deal_value = ? 
             WHERE id = ?",
            [$namaPerusahaan, $penanggungJawab, $email, $telepon, $alamat, $kota, $npwp, $catatan, $status, $prospectStage, $dealValue, $clientId]
        );

        clearCache(['clients']);
        logActivity('update', 'clients', $clientId, $client, $params);

        successResponse(['id' => $clientId, 'status' => $status], 'Data pelanggan berhasil diperbarui');
    }

    if ($method === 'DELETE') {
        checkPermission('client.delete');
        $client = $db->fetch("SELECT * FROM clients WHERE id = ?", [$clientId]);
        if (!$client) errorResponse('Pelanggan tidak ditemukan', 404);

        $safeCount = function ($sql, $params = []) use ($db) {
            try {
                return (int)$db->count($sql, $params);
            } catch (\Throwable $e) {
                return 0;
            }
        };

        $invCount = $safeCount("SELECT COUNT(*) FROM invoices WHERE client_id = ?", [$clientId]);
        $quoCount = $safeCount("SELECT COUNT(*) FROM quotations WHERE client_id = ?", [$clientId]);
        $projCount = $safeCount("SELECT COUNT(*) FROM projects WHERE client_id = ?", [$clientId]);
        $recCount = $safeCount("SELECT COUNT(*) FROM recurring_invoices WHERE client_id = ?", [$clientId]);
        $slaCount = $safeCount("SELECT COUNT(*) FROM maintenance_sla WHERE client_id = ?", [$clientId]);
        $tsCount = $safeCount("SELECT COUNT(*) FROM timesheets WHERE client_id = ?", [$clientId]);

        $relMessages = [];
        if ($invCount > 0) $relMessages[] = "$invCount Faktur Tagihan";
        if ($quoCount > 0) $relMessages[] = "$quoCount Dokumen Penawaran";
        if ($projCount > 0) $relMessages[] = "$projCount Proyek";
        if ($recCount > 0) $relMessages[] = "$recCount Tagihan Berulang";
        if ($slaCount > 0) $relMessages[] = "$slaCount Pemantauan Layanan / SLA";
        if ($tsCount > 0) $relMessages[] = "$tsCount Entri Timesheet";

        // Jika terdapat faktur tagihan resmi, blokir mutlak untuk integritas keuangan
        if ($invCount > 0) {
            jsonResponse([
                'success' => false,
                'code' => 400,
                'has_invoices' => true,
                'can_force' => false,
                'message' => "Pelanggan \"{$client['nama_perusahaan']}\" tidak dapat dihapus permanen karena memiliki $invCount faktur tagihan resmi. Silakan ubah status pelanggan menjadi \"Nonaktif\" untuk menjaga integritas pembukuan akuntansi."
            ], 400);
        }

        // Jika ada relasi lain (misal hanya penawaran/proyek tanpa faktur)
        $force = isset($params['force']) && ($params['force'] === '1' || $params['force'] === 'true' || $params['force'] === 1);
        if (!empty($relMessages)) {
            if (!$force) {
                $detail = implode(', ', $relMessages);
                jsonResponse([
                    'success' => false,
                    'code' => 400,
                    'has_invoices' => false,
                    'can_force' => true,
                    'rel_detail' => $detail,
                    'message' => "Pelanggan \"{$client['nama_perusahaan']}\" terhubung dengan {$detail}. Anda dapat mengubah statusnya menjadi \"Nonaktif\", atau menghapus paksa pelanggan beserta data terkait."
                ], 400);
            }

            // Eksekusi penghapusan kaskade aman dalam transaksi PDO
            $pdo = $db->getConnection();
            $pdo->beginTransaction();
            try {
                if ($tsCount > 0) {
                    try {
                        $pdo->prepare("DELETE FROM timesheets WHERE client_id = ?")->execute([$clientId]);
                    } catch (\Throwable $e) {}
                }
                if ($slaCount > 0) {
                    try {
                        $pdo->prepare("DELETE FROM maintenance_sla WHERE client_id = ?")->execute([$clientId]);
                    } catch (\Throwable $e) {}
                }
                if ($recCount > 0) {
                    try {
                        $pdo->prepare("DELETE FROM recurring_invoices WHERE client_id = ?")->execute([$clientId]);
                    } catch (\Throwable $e) {}
                }
                if ($quoCount > 0) {
                    try {
                        $pdo->prepare("DELETE FROM quotations WHERE client_id = ?")->execute([$clientId]);
                    } catch (\Throwable $e) {}
                }
                if ($projCount > 0) {
                    try {
                        $pdo->prepare("DELETE FROM projects WHERE client_id = ?")->execute([$clientId]);
                    } catch (\Throwable $e) {}
                }
                $pdo->prepare("DELETE FROM clients WHERE id = ?")->execute([$clientId]);
                $pdo->commit();

                clearCache(['clients', 'quotations', 'projects', 'dashboard']);
                logActivity('delete', 'clients', $clientId, $client);

                successResponse(null, "Pelanggan \"{$client['nama_perusahaan']}\" dan data terkait berhasil dihapus");
            } catch (\Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                errorResponse('Gagal menghapus data pelanggan: ' . $e->getMessage(), 500);
            }
        }

        $db->execute("DELETE FROM clients WHERE id = ?", [$clientId]);
        clearCache(['clients']);
        logActivity('delete', 'clients', $clientId, $client);

        successResponse(null, 'Pelanggan berhasil dihapus');
    }

    errorResponse('Metode tidak didukung', 405);
}

// Kanban CRM Board: /api/clients/kanban
if ($method === 'GET' && ($id === 'kanban' || ($params['action'] ?? '') === 'kanban')) {
    checkPermission('client.view');

    $stages = [
        'leads_baru' => ['label' => 'Leads Masuk', 'color' => '#64748b', 'items' => [], 'total_value' => 0],
        'kontak_awal' => ['label' => 'Kontak Awal', 'color' => '#3b82f6', 'items' => [], 'total_value' => 0],
        'proposal_penawaran' => ['label' => 'Proposal SPH', 'color' => '#8b5cf6', 'items' => [], 'total_value' => 0],
        'negosiasi' => ['label' => 'Negosiasi', 'color' => '#f59e0b', 'items' => [], 'total_value' => 0],
        'deal_menang' => ['label' => 'Deal Menang (Won)', 'color' => '#10b981', 'items' => [], 'total_value' => 0],
        'batal_lost' => ['label' => 'Batal / Kalah (Lost)', 'color' => '#ef4444', 'items' => [], 'total_value' => 0]
    ];

    $prospects = $db->fetchAll(
        "SELECT c.id, c.kode_klien, c.nama_perusahaan, c.penanggung_jawab, c.email, c.telepon, c.kota,
                c.status, c.prospect_stage, c.deal_value, c.expected_close_date, c.last_contact_at, c.lost_reason,
                c.portal_token, (c.portal_password IS NOT NULL) AS portal_access_active, c.created_at,
                (SELECT f.catatan FROM client_followups f WHERE f.client_id = c.id ORDER BY f.tanggal DESC, f.id DESC LIMIT 1) as latest_followup,
                (SELECT f.tipe FROM client_followups f WHERE f.client_id = c.id ORDER BY f.tanggal DESC, f.id DESC LIMIT 1) as latest_followup_type,
                (SELECT f.tanggal FROM client_followups f WHERE f.client_id = c.id ORDER BY f.tanggal DESC, f.id DESC LIMIT 1) as latest_followup_date,
                (SELECT COUNT(*) FROM quotations q WHERE q.client_id = c.id) as total_quotations
         FROM clients c
         WHERE c.status = 'prospek' OR c.prospect_stage = 'deal_menang'
         ORDER BY c.last_contact_at DESC, c.id DESC"
    );

    $grandTotalPipeline = 0;
    foreach ($prospects as $p) {
        $st = $p['prospect_stage'] ?: 'leads_baru';
        if (!isset($stages[$st])) $st = 'leads_baru';
        $val = (float)($p['deal_value'] ?? 0);
        $stages[$st]['items'][] = $p;
        $stages[$st]['total_value'] += $val;
        if ($st !== 'batal_lost') {
            $grandTotalPipeline += $val;
        }
    }

    successResponse([
        'stages' => $stages,
        'total_prospects' => count($prospects),
        'grand_total_pipeline' => $grandTotalPipeline
    ]);
}

// Collection level: /api/clients
if ($method === 'GET') {
    checkPermission('client.view');

    // Jika minta list sederhana tanpa paginasi (untuk dropdown)
    if (isset($params['all']) && $params['all'] == '1') {
        $statusParam = trim($params['status'] ?? '');
        $includeProspects = !empty($params['include_prospects']) && ($params['include_prospects'] === '1' || $params['include_prospects'] === 'true' || $params['include_prospects'] === true);

        // Jika ada filter status eksplisit (misal: status=aktif atau status=prospek atau status=aktif,prospek)
        if ($statusParam !== '') {
            $statuses = array_filter(array_map('trim', explode(',', $statusParam)));
            if (!empty($statuses)) {
                $inSql = implode(',', array_fill(0, count($statuses), '?'));
                $clients = $db->fetchAll(
                    "SELECT id, kode_klien, nama_perusahaan, penanggung_jawab, email, status 
                     FROM clients 
                     WHERE status IN ($inSql) 
                     ORDER BY CASE WHEN status = 'prospek' THEN 1 ELSE 2 END, nama_perusahaan ASC",
                    $statuses
                );
                successResponse($clients);
            }
        }

        // Secara default untuk dropdown umum, sertakan pelanggan aktif dan calon pelanggan (prospek)
        // Agar calon pelanggan dapat langsung dipilih pada formulir pembuatan penawaran harga
        $clients = $db->fetchAll(
            "SELECT id, kode_klien, nama_perusahaan, penanggung_jawab, email, status 
             FROM clients 
             WHERE status IN ('aktif', 'prospek') 
             ORDER BY CASE WHEN status = 'prospek' THEN 1 ELSE 2 END, nama_perusahaan ASC"
        );
        successResponse($clients);
    }

    $page = (int)($params['page'] ?? 1);
    $perPage = (int)($params['per_page'] ?? PER_PAGE);
    $search = trim($params['search'] ?? '');
    $status = trim($params['status'] ?? '');

    $where = [];
    $bindings = [];

    if (!empty($search)) {
        $where[] = "(nama_perusahaan LIKE ? OR penanggung_jawab LIKE ? OR email LIKE ? OR kode_klien LIKE ?)";
        $searchPattern = "%$search%";
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
    }

    if (!empty($status)) {
        $where[] = "status = ?";
        $bindings[] = $status;
    }

    $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $countQuery = "SELECT COUNT(*) FROM clients $whereSql";
    $query = "SELECT c.id, c.kode_klien, c.nama_perusahaan, c.penanggung_jawab, c.email, c.telepon,
                     c.alamat, c.kota, c.npwp, c.catatan, c.status, c.prospect_stage, c.deal_value,
                     c.expected_close_date, c.last_contact_at, c.lost_reason, c.portal_token,
                     (c.portal_password IS NOT NULL) AS portal_access_active,
                     c.portal_last_login_at, c.created_at, c.updated_at,
                     (SELECT COUNT(*) FROM projects WHERE client_id = c.id) as total_projects,
                     (SELECT COALESCE(SUM(sisa_tagihan), 0) FROM invoices WHERE client_id = c.id AND status IN ('dikirim', 'sebagian', 'jatuh_tempo')) as total_piutang
              FROM clients c 
              $whereSql 
              ORDER BY c.id DESC";

    paginatedResponse($query, $countQuery, $bindings, $page, $perPage);
}

if ($method === 'POST') {
    checkPermission('client.create');

    $namaPerusahaan = trim($params['nama_perusahaan'] ?? '');
    $penanggungJawab = trim($params['penanggung_jawab'] ?? '');
    $email = trim($params['email'] ?? '');
    $telepon = trim($params['telepon'] ?? '');
    $alamat = trim($params['alamat'] ?? '');
    $kota = trim($params['kota'] ?? '');
    $npwp = trim($params['npwp'] ?? '');
    $catatan = trim($params['catatan'] ?? '');
    $status = in_array($params['status'] ?? '', ['aktif', 'prospek', 'nonaktif']) ? $params['status'] : 'aktif';

    if (empty($namaPerusahaan) || empty($email) || empty($penanggungJawab)) {
        errorResponse('Nama perusahaan, penanggung jawab, dan email wajib diisi');
    }

    // Generate kode klien otomatis (CLI-0001)
    $lastClient = $db->fetch("SELECT kode_klien FROM clients WHERE kode_klien LIKE 'CLI-%' ORDER BY id DESC LIMIT 1");
    if ($lastClient && !empty($lastClient['kode_klien'])) {
        $lastNum = (int)str_replace('CLI-', '', $lastClient['kode_klien']);
        $nextNum = $lastNum + 1;
    } else {
        $nextNum = 1;
    }
    $kodeKlien = 'CLI-' . str_pad((string)$nextNum, 4, '0', STR_PAD_LEFT);

    $portalToken = bin2hex(random_bytes(24));

    $prospectStage = in_array($params['prospect_stage'] ?? '', ['leads_baru', 'kontak_awal', 'proposal_penawaran', 'negosiasi', 'deal_menang', 'batal_lost'])
        ? $params['prospect_stage']
        : 'leads_baru';
    $dealValue = (float)($params['deal_value'] ?? 0);

    $newId = $db->insert(
        "INSERT INTO clients (kode_klien, nama_perusahaan, penanggung_jawab, email, telepon, alamat, kota, npwp, catatan, status, prospect_stage, deal_value, portal_token) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [$kodeKlien, $namaPerusahaan, $penanggungJawab, $email, $telepon, $alamat, $kota, $npwp, $catatan, $status, $prospectStage, $dealValue, $portalToken]
    );

    clearCache(['clients']);
    logActivity('create', 'clients', $newId, null, $params);

    successResponse(['id' => $newId, 'kode_klien' => $kodeKlien], 'Pelanggan berhasil ditambahkan');
}

errorResponse('Metode tidak didukung', 405);
