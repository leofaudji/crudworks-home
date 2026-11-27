<?php
declare(strict_types=1);

require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../middleware/rbac.php';

$db = Database::getInstance();

// 0. Kirim Surat Penawaran (SPH) via Email SMTP
if ($method === 'POST' && $id && is_numeric($id) && $action === 'send-email') {
    authCheck();
    checkPermission('quotation.view');

    $quo = $db->fetch(
        "SELECT q.*, c.nama_perusahaan, c.penanggung_jawab, c.email as client_email, c.cc_email as client_cc_email
         FROM quotations q
         JOIN clients c ON q.client_id = c.id
         WHERE q.id = ?",
        [(int)$id]
    );
    if (!$quo) errorResponse('Surat penawaran tidak ditemukan', 404);
    if (empty($quo['client_email'])) errorResponse('Email klien belum diatur pada data pelanggan', 422);

    $cfg = getAppSettingsMap();
    $token = $quo['public_token'] ?: bin2hex(random_bytes(24));
    if (empty($quo['public_token'])) {
        $db->execute("UPDATE quotations SET public_token = ? WHERE id = ?", [$token, (int)$id]);
    }
    $portalUrl = buildPublicAppUrl('#/public-quotation?token=' . urlencode($token));

    $attachments = extractPdfAttachmentFromParams($params, "penawaran_{$quo['nomor_penawaran']}.pdf");
    $hasLogo = resolveCompanyEmailLogoPath($cfg) !== null;
    $ccEmails = trim((string)($params['cc_email'] ?? $quo['client_cc_email'] ?? ''));
    $subject = "Surat Penawaran {$quo['nomor_penawaran']} - " . ($cfg['company_name'] ?? 'CRUDWorks ERP');
    $html = buildQuotationEmailHtml($quo, $cfg, $portalUrl, $hasLogo, !empty($attachments));
    $mailRes = sendErpEmail((string)$quo['client_email'], (string)($quo['penanggung_jawab'] ?: $quo['nama_perusahaan']), $subject, $html, 'quotation', (int)$id, $attachments, $ccEmails);
    if (empty($mailRes['success'])) {
        errorResponse($mailRes['message'] ?? 'Gagal mengirim email penawaran', 500);
    }

    if ($quo['status'] === 'draft') {
        $db->execute("UPDATE quotations SET status = 'terkirim', last_sent_at = NOW(), last_sent_via = 'email' WHERE id = ?", [(int)$id]);
    } else {
        $db->execute("UPDATE quotations SET last_sent_at = NOW(), last_sent_via = 'email' WHERE id = ?", [(int)$id]);
    }
    logActivity('quotation.send_email', 'quotations', (int)$id, null, ['sent_to' => $quo['client_email']]);
    successResponse(['sent_to' => $quo['client_email']], 'Surat penawaran berhasil dikirim via SMTP ke ' . $quo['client_email']);
}

// 0b. Catat Riwayat Pengiriman Penawaran (WhatsApp / Portal)
if ($method === 'POST' && $id && is_numeric($id) && $action === 'log-send') {
    authCheck();
    checkPermission('quotation.view');
    $via = validateEnum((string)($params['via'] ?? ''), ['whatsapp', 'email', 'portal'], 'whatsapp');
    $quo = $db->fetch("SELECT id, nomor_penawaran FROM quotations WHERE id = ?", [(int)$id]);
    if (!$quo) errorResponse('Surat penawaran tidak ditemukan', 404);
    $db->execute("UPDATE quotations SET last_sent_at = NOW(), last_sent_via = ? WHERE id = ?", [$via, (int)$id]);
    logActivity('quotation.send_' . $via, 'quotations', (int)$id, null, ['via' => $via]);
    successResponse(['last_sent_at' => date('Y-m-d H:i:s'), 'last_sent_via' => $via], 'Riwayat pengiriman dicatat');
}

// 1. Get Single Quotation Detail
if ($method === 'GET' && $id && is_numeric($id)) {
    authCheck();
    checkPermission('quotation.view');

    $quo = $db->fetch(
        "SELECT q.*, c.nama_perusahaan, c.kode_klien, c.penanggung_jawab, c.email as client_email,
                c.telepon as client_telepon, c.alamat as client_alamat, c.kota as client_kota, c.npwp as client_npwp,
                p.nama_project, u.nama_lengkap as pembuat_nama,
                inv.nomor_invoice as converted_invoice_no
         FROM quotations q
         JOIN clients c ON q.client_id = c.id
         LEFT JOIN projects p ON q.project_id = p.id
         LEFT JOIN users u ON q.created_by = u.id
         LEFT JOIN invoices inv ON q.converted_invoice_id = inv.id
         WHERE q.id = ?",
        [(int)$id]
    );

    if (!$quo) {
        errorResponse('Surat penawaran tidak ditemukan', 404);
    }

    $items = $db->fetchAll(
        "SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY urutan ASC, id ASC",
        [(int)$id]
    );

    $settingsRows = $db->fetchAll("SELECT kunci, nilai FROM app_settings WHERE grup IN ('company', 'invoice')");
    $company = [];
    foreach ($settingsRows as $row) {
        $company[$row['kunci']] = $row['nilai'];
    }

    $bankAccounts = $db->fetchAll("SELECT * FROM payment_methods WHERE status = 'aktif' ORDER BY is_default DESC, id ASC");

    $quo['items'] = $items;
    $quo['company'] = $company;
    $quo['payment_methods'] = $bankAccounts;

    successResponse($quo);
}

// 2. List Quotations (Paginated with Status Filter & KPI)
if ($method === 'GET') {
    authCheck();
    checkPermission('quotation.view');

    $page = max(1, (int)($params['page'] ?? 1));
    $perPage = max(1, min(100, (int)($params['per_page'] ?? PER_PAGE)));
    $offset = ($page - 1) * $perPage;

    $where = ["1=1"];
    $binds = [];

    if (!empty($params['status'])) {
        $where[] = "q.status = ?";
        $binds[] = $params['status'];
    }
    if (!empty($params['client_id'])) {
        $where[] = "q.client_id = ?";
        $binds[] = (int)$params['client_id'];
    }
    if (!empty($params['search'])) {
        $where[] = "(q.nomor_penawaran LIKE ? OR c.nama_perusahaan LIKE ? OR p.nama_project LIKE ?)";
        $term = "%{$params['search']}%";
        $binds[] = $term;
        $binds[] = $term;
        $binds[] = $term;
    }

    $whereSql = implode(' AND ', $where);

    $countRow = $db->fetch("SELECT COUNT(*) as total FROM quotations q JOIN clients c ON q.client_id = c.id LEFT JOIN projects p ON q.project_id = p.id WHERE {$whereSql}", $binds);
    $total = (int)($countRow['total'] ?? 0);

    $sql = "SELECT q.*, c.nama_perusahaan, c.kode_klien, c.penanggung_jawab,
                   p.nama_project, u.nama_lengkap as pembuat_nama,
                   inv.nomor_invoice as converted_invoice_no
            FROM quotations q
            JOIN clients c ON q.client_id = c.id
            LEFT JOIN projects p ON q.project_id = p.id
            LEFT JOIN users u ON q.created_by = u.id
            LEFT JOIN invoices inv ON q.converted_invoice_id = inv.id
            WHERE {$whereSql}
            ORDER BY q.tanggal_penawaran DESC, q.id DESC
            LIMIT {$perPage} OFFSET {$offset}";

    $items = $db->fetchAll($sql, $binds);

    // Summary stats
    $kpis = $db->fetch(
        "SELECT 
            COUNT(CASE WHEN status = 'draft' THEN 1 END) as count_draft,
            COUNT(CASE WHEN status = 'terkirim' THEN 1 END) as count_terkirim,
            COUNT(CASE WHEN status = 'disetujui' THEN 1 END) as count_disetujui,
            COUNT(CASE WHEN status = 'dikonversi' THEN 1 END) as count_dikonversi,
            COALESCE(SUM(total_penawaran), 0) as total_pipeline
         FROM quotations"
    );

    paginatedResponse($items, $total, $page, $perPage, [
        'kpi' => [
            'count_draft' => (int)($kpis['count_draft'] ?? 0),
            'count_terkirim' => (int)($kpis['count_terkirim'] ?? 0),
            'count_disetujui' => (int)($kpis['count_disetujui'] ?? 0),
            'count_dikonversi' => (int)($kpis['count_dikonversi'] ?? 0),
            'total_pipeline' => (float)($kpis['total_pipeline'] ?? 0)
        ]
    ]);
}

// 3. Create Quotation
if ($method === 'POST' && !$action) {
    authCheck();
    checkPermission('quotation.manage');

    $clientId = (int)($params['client_id'] ?? 0);
    $projectId = !empty($params['project_id']) ? (int)$params['project_id'] : null;
    $tanggalPenawaran = trim($params['tanggal_penawaran'] ?? date('Y-m-d'));
    $berlakuHingga = trim($params['berlaku_hingga'] ?? date('Y-m-d', strtotime('+14 days')));
    $catatanKlien = trim($params['catatan_klien'] ?? '');
    $salamPembuka = trim($params['salam_pembuka'] ?? '');
    $ruangLingkupFitur = trim($params['ruang_lingkup_fitur'] ?? '');
    $timelinePengerjaan = trim($params['timeline_pengerjaan'] ?? '');
    $pasalHakKewajiban = trim($params['pasal_hak_kewajiban'] ?? '');
    $syaratKetentuan = trim($params['syarat_ketentuan'] ?? "1. Penawaran harga ini berlaku hingga tanggal yang tertera.\n2. Pembayaran uang muka (DP) minimal 50% setelah surat penawaran disetujui.\n3. Waktu pengerjaan dimulai setelah penandatanganan SPK / PO resmi.");
    $items = $params['items'] ?? [];

    if (!$clientId || empty($items) || !is_array($items)) {
        errorResponse('Pelanggan dan rincian layanan penawaran wajib diisi', 422);
    }

    // Auto-generate nomor penawaran: QUO-YYYYMM-XXXX
    $nomorPenawaran = generateDocNumber('quotations', 'nomor_penawaran', 'QUO-', 4, true, '-');

    // Calculate subtotal
    $subtotal = 0;
    $validItems = [];
    foreach ($items as $idx => $it) {
        $deskripsi = trim($it['deskripsi'] ?? '');
        $qty = max(0.01, (float)($it['kuantitas'] ?? 1));
        $satuan = trim($it['satuan'] ?? 'paket');
        $harga = max(0, (float)($it['harga_satuan'] ?? 0));
        $totalHarga = $qty * $harga;
        if (!empty($deskripsi)) {
            $subtotal += $totalHarga;
            $validItems[] = [
                'service_id' => !empty($it['service_id']) ? (int)$it['service_id'] : null,
                'deskripsi' => $deskripsi,
                'kuantitas' => $qty,
                'satuan' => $satuan,
                'harga_satuan' => $harga,
                'total_harga' => $totalHarga,
                'urutan' => $idx + 1
            ];
        }
    }

    if (empty($validItems)) {
        errorResponse('Minimal ada satu baris layanan yang valid', 422);
    }

    // Discounts & Taxes
    $diskonTipe = in_array($params['diskon_tipe'] ?? '', ['persen', 'nominal']) ? $params['diskon_tipe'] : 'nominal';
    $diskonInput = (float)($params['diskon_nilai'] ?? 0);
    $diskonNilai = $diskonTipe === 'persen' ? ($subtotal * ($diskonInput / 100)) : $diskonInput;
    $diskonNilai = min($diskonNilai, $subtotal);

    $dpp = $subtotal - $diskonNilai;
    $pajakPersen = isset($params['pajak_persen']) ? ($params['pajak_persen'] === '' ? 0.00 : max(0, (float)$params['pajak_persen'])) : getDefaultTaxPercent();
    $pajakNominal = $dpp * ($pajakPersen / 100);
    $totalPenawaran = $dpp + $pajakNominal;

    $userId = $_SESSION['user_id'] ?? 1;

    $pdo = $db->getPdo();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO quotations (`nomor_penawaran`, `tanggal_penawaran`, `berlaku_hingga`, `client_id`, `project_id`, `subtotal`, `diskon_tipe`, `diskon_nilai`, `pajak_persen`, `pajak_nominal`, `total_penawaran`, `status`, `catatan_klien`, `salam_pembuka`, `ruang_lingkup_fitur`, `timeline_pengerjaan`, `pasal_hak_kewajiban`, `syarat_ketentuan`, `created_by`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $nomorPenawaran, $tanggalPenawaran, $berlakuHingga, $clientId, $projectId,
            $subtotal, $diskonTipe, $diskonNilai, $pajakPersen, $pajakNominal, $totalPenawaran,
            $catatanKlien, $salamPembuka, $ruangLingkupFitur, $timelinePengerjaan, $pasalHakKewajiban, $syaratKetentuan, $userId
        ]);
        $quotationId = (int)$pdo->lastInsertId();

        $itemStmt = $pdo->prepare(
            "INSERT INTO quotation_items (`quotation_id`, `service_id`, `deskripsi`, `kuantitas`, `satuan`, `harga_satuan`, `total_harga`, `urutan`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        foreach ($validItems as $v) {
            $itemStmt->execute([
                $quotationId, $v['service_id'], $v['deskripsi'], $v['kuantitas'], $v['satuan'], $v['harga_satuan'], $v['total_harga'], $v['urutan']
            ]);
        }

        $pdo->commit();

        logActivity('quotation.create', "Membuat penawaran harga {$nomorPenawaran} sebesar Rp " . number_format($totalPenawaran, 0, ',', '.'));
        clearCache(['quotations']);

        successResponse(['id' => $quotationId, 'nomor_penawaran' => $nomorPenawaran], 'Surat penawaran harga berhasil dibuat', 201);
    } catch (\Throwable $e) {
        $pdo->rollBack();
        errorResponse('Gagal menyimpan penawaran harga: ' . $e->getMessage(), 500);
    }
}

// 3b. Update Quotation
if ($method === 'PUT' && $id && is_numeric($id)) {
    authCheck();
    checkPermission('quotation.manage');

    $quo = $db->fetch("SELECT * FROM quotations WHERE id = ?", [(int)$id]);
    if (!$quo) {
        errorResponse('Surat penawaran tidak ditemukan', 404);
    }
    if ($quo['status'] === 'dikonversi') {
        errorResponse('Penawaran yang sudah dikonversi menjadi faktur tidak dapat diubah', 400);
    }

    $clientId = (int)($params['client_id'] ?? $quo['client_id']);
    $projectId = array_key_exists('project_id', $params) ? (!empty($params['project_id']) ? (int)$params['project_id'] : null) : $quo['project_id'];
    $tanggalPenawaran = trim($params['tanggal_penawaran'] ?? $quo['tanggal_penawaran']);
    $berlakuHingga = trim($params['berlaku_hingga'] ?? $quo['berlaku_hingga']);
    $catatanKlien = trim($params['catatan_klien'] ?? ($quo['catatan_klien'] ?? ''));
    $salamPembuka = trim($params['salam_pembuka'] ?? ($quo['salam_pembuka'] ?? ''));
    $ruangLingkupFitur = trim($params['ruang_lingkup_fitur'] ?? ($quo['ruang_lingkup_fitur'] ?? ''));
    $timelinePengerjaan = trim($params['timeline_pengerjaan'] ?? ($quo['timeline_pengerjaan'] ?? ''));
    $pasalHakKewajiban = trim($params['pasal_hak_kewajiban'] ?? ($quo['pasal_hak_kewajiban'] ?? ''));
    $syaratKetentuan = trim($params['syarat_ketentuan'] ?? ($quo['syarat_ketentuan'] ?? ''));
    $items = $params['items'] ?? [];

    if (!$clientId || empty($items) || !is_array($items)) {
        errorResponse('Pelanggan dan rincian layanan penawaran wajib diisi', 422);
    }

    $subtotal = 0;
    $validItems = [];
    foreach ($items as $idx => $it) {
        $deskripsi = trim($it['deskripsi'] ?? '');
        $qty = max(0.01, (float)($it['kuantitas'] ?? 1));
        $satuan = trim($it['satuan'] ?? 'paket');
        $harga = max(0, (float)($it['harga_satuan'] ?? 0));
        $totalHarga = $qty * $harga;
        if (!empty($deskripsi)) {
            $subtotal += $totalHarga;
            $validItems[] = [
                'service_id' => !empty($it['service_id']) ? (int)$it['service_id'] : null,
                'deskripsi' => $deskripsi,
                'kuantitas' => $qty,
                'satuan' => $satuan,
                'harga_satuan' => $harga,
                'total_harga' => $totalHarga,
                'urutan' => $idx + 1
            ];
        }
    }

    if (empty($validItems)) {
        errorResponse('Minimal ada satu baris layanan yang valid', 422);
    }

    $diskonTipe = in_array($params['diskon_tipe'] ?? '', ['persen', 'nominal']) ? $params['diskon_tipe'] : 'nominal';
    $diskonInput = (float)($params['diskon_nilai'] ?? 0);
    $diskonNilai = $diskonTipe === 'persen' ? ($subtotal * ($diskonInput / 100)) : $diskonInput;
    $diskonNilai = min($diskonNilai, $subtotal);

    $dpp = $subtotal - $diskonNilai;
    $pajakPersen = isset($params['pajak_persen']) ? ($params['pajak_persen'] === '' ? 0.00 : max(0, (float)$params['pajak_persen'])) : (float)$quo['pajak_persen'];
    $pajakNominal = $dpp * ($pajakPersen / 100);
    $totalPenawaran = $dpp + $pajakNominal;

    $pdo = $db->getPdo();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            "UPDATE quotations 
             SET `tanggal_penawaran`=?, `berlaku_hingga`=?, `client_id`=?, `project_id`=?, `subtotal`=?, `diskon_tipe`=?, `diskon_nilai`=?, `pajak_persen`=?, `pajak_nominal`=?, `total_penawaran`=?, `catatan_klien`=?, `salam_pembuka`=?, `ruang_lingkup_fitur`=?, `timeline_pengerjaan`=?, `pasal_hak_kewajiban`=?, `syarat_ketentuan`=?
             WHERE id = ?"
        );
        $stmt->execute([
            $tanggalPenawaran, $berlakuHingga, $clientId, $projectId,
            $subtotal, $diskonTipe, $diskonNilai, $pajakPersen, $pajakNominal, $totalPenawaran,
            $catatanKlien, $salamPembuka, $ruangLingkupFitur, $timelinePengerjaan, $pasalHakKewajiban, $syaratKetentuan, (int)$id
        ]);

        $pdo->prepare("DELETE FROM quotation_items WHERE quotation_id = ?")->execute([(int)$id]);

        $itemStmt = $pdo->prepare(
            "INSERT INTO quotation_items (`quotation_id`, `service_id`, `deskripsi`, `kuantitas`, `satuan`, `harga_satuan`, `total_harga`, `urutan`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        foreach ($validItems as $v) {
            $itemStmt->execute([
                (int)$id, $v['service_id'], $v['deskripsi'], $v['kuantitas'], $v['satuan'], $v['harga_satuan'], $v['total_harga'], $v['urutan']
            ]);
        }

        $pdo->commit();
        logActivity('quotation.edit', "Memperbarui penawaran harga {$quo['nomor_penawaran']}");
        clearCache(['quotations']);

        successResponse(['id' => (int)$id], 'Surat penawaran harga berhasil diperbarui');
    } catch (\Throwable $e) {
        $pdo->rollBack();
        errorResponse('Gagal memperbarui penawaran harga: ' . $e->getMessage(), 500);
    }
}

// 4. Update Status (terkirim, disetujui, ditolak)
if ($method === 'POST' && $id && is_numeric($id) && $action === 'status') {
    authCheck();
    checkPermission('quotation.manage');

    $status = trim($params['status'] ?? '');
    if (!in_array($status, ['draft', 'terkirim', 'disetujui', 'ditolak'])) {
        errorResponse('Status penawaran tidak valid', 422);
    }

    $quo = $db->fetch("SELECT * FROM quotations WHERE id = ?", [(int)$id]);
    if (!$quo) {
        errorResponse('Surat penawaran tidak ditemukan', 404);
    }

    $db->execute("UPDATE quotations SET status = ? WHERE id = ?", [$status, (int)$id]);

    logActivity('quotation.status', "Mengubah status penawaran {$quo['nomor_penawaran']} menjadi {$status}");
    clearCache(['quotations']);

    successResponse(null, "Status penawaran berhasil diubah ke {$status}");
}

// 5. One-Click Convert Quotation to Invoice
if ($method === 'POST' && $id && is_numeric($id) && $action === 'convert') {
    authCheck();
    checkPermission('invoice.create');

    $quo = $db->fetch("SELECT * FROM quotations WHERE id = ?", [(int)$id]);
    if (!$quo) {
        errorResponse('Surat penawaran tidak ditemukan', 404);
    }

    if ($quo['status'] === 'dikonversi' && !empty($quo['converted_invoice_id'])) {
        errorResponse('Penawaran ini sudah pernah dikonversi ke faktur sebelumnya', 400);
    }

    $items = $db->fetchAll("SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY urutan ASC", [(int)$id]);
    if (empty($items)) {
        errorResponse('Penawaran tidak memiliki baris item untuk dikonversi', 422);
    }

    // Auto-generate invoice number: INV-YYYYMM-XXXX
    $nomorInvoice = generateInvoiceNo('INV-');

    $tanggalInvoice = date('Y-m-d');
    $dueDays = (int)($db->fetch("SELECT nilai FROM app_settings WHERE kunci = 'invoice_due_days'")['nilai'] ?? 14);
    $tanggalJatuhTempo = date('Y-m-d', strtotime("+{$dueDays} days"));
    $publicToken = bin2hex(random_bytes(24));
    $userId = $_SESSION['user_id'] ?? 1;

    $pdo = $db->getPdo();
    $pdo->beginTransaction();
    try {
        // Insert invoice
        $stmt = $pdo->prepare(
            "INSERT INTO invoices (`nomor_invoice`, `public_token`, `client_id`, `project_id`, `tanggal_invoice`, `tanggal_jatuh_tempo`, `subtotal`, `diskon_tipe`, `diskon_nilai`, `pajak_persen`, `pajak_nominal`, `total_tagihan`, `total_dibayar`, `sisa_tagihan`, `status`, `catatan_klien`, `created_by`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'dikirim', ?, ?)"
        );
        $stmt->execute([
            $nomorInvoice, $publicToken, $quo['client_id'], $quo['project_id'],
            $tanggalInvoice, $tanggalJatuhTempo,
            $quo['subtotal'], $quo['diskon_tipe'], $quo['diskon_nilai'],
            $quo['pajak_persen'], $quo['pajak_nominal'], $quo['total_penawaran'],
            $quo['total_penawaran'],
            "Berdasarkan Surat Penawaran Resmi " . $quo['nomor_penawaran'] . ($quo['catatan_klien'] ? " — " . $quo['catatan_klien'] : ""),
            $userId
        ]);
        $newInvoiceId = (int)$pdo->lastInsertId();

        // Copy items
        $itemStmt = $pdo->prepare(
            "INSERT INTO invoice_items (`invoice_id`, `service_id`, `deskripsi`, `kuantitas`, `satuan`, `harga_satuan`, `total_harga`, `urutan`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        foreach ($items as $it) {
            $itemStmt->execute([
                $newInvoiceId, $it['service_id'], $it['deskripsi'], $it['kuantitas'], $it['satuan'], $it['harga_satuan'], $it['total_harga'], $it['urutan']
            ]);
        }

        // Otomatis alihkan status calon pelanggan dari 'prospek' menjadi 'aktif' saat penawaran disetujui / dikonversi ke faktur
        $pdo->prepare("UPDATE clients SET `status` = 'aktif' WHERE id = ? AND `status` = 'prospek'")
            ->execute([$quo['client_id']]);

        // Update quotation as converted
        $pdo->prepare("UPDATE quotations SET `status` = 'dikonversi', `converted_invoice_id` = ? WHERE id = ?")
            ->execute([$newInvoiceId, (int)$id]);

        $pdo->commit();

        logActivity('quotation.convert', "Mengonversi penawaran {$quo['nomor_penawaran']} ke faktur tagihan {$nomorInvoice}");
        clearCache(['quotations', 'invoices', 'dashboard']);

        successResponse([
            'invoice_id' => $newInvoiceId,
            'nomor_invoice' => $nomorInvoice,
            'public_token' => $publicToken
        ], "Penawaran berhasil dikonversi menjadi Faktur {$nomorInvoice}!");
    } catch (\Throwable $e) {
        $pdo->rollBack();
        errorResponse('Gagal mengonversi penawaran ke faktur: ' . $e->getMessage(), 500);
    }
}

// 6. Delete Quotation
if ($method === 'DELETE' && $id && is_numeric($id)) {
    authCheck();
    checkPermission('quotation.manage');

    $quo = $db->fetch("SELECT * FROM quotations WHERE id = ?", [(int)$id]);
    if (!$quo) {
        errorResponse('Surat penawaran tidak ditemukan', 404);
    }

    $db->execute("DELETE FROM quotations WHERE id = ?", [(int)$id]);

    logActivity('quotation.delete', "Menghapus penawaran harga {$quo['nomor_penawaran']}");
    clearCache(['quotations']);

    successResponse(null, 'Surat penawaran berhasil dihapus');
}
