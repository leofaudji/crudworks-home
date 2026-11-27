<?php
// InvoiceController.php

authCheck();
$db = Database::getInstance();

if ($id && is_numeric($id)) {
    $invoiceId = (int)$id;

    // Action: Change Status
    if ($action === 'status') {
        if ($method !== 'POST') errorResponse('Method not allowed', 405);
        checkPermission('invoice.edit');

        $newStatus = trim($params['status'] ?? '');
        if (!in_array($newStatus, ['draft', 'dikirim', 'sebagian', 'lunas', 'jatuh_tempo', 'batal'])) {
            errorResponse('Status tagihan tidak valid');
        }

        $inv = $db->fetch("SELECT * FROM invoices WHERE id = ?", [$invoiceId]);
        if (!$inv) errorResponse('Invoice tidak ditemukan', 404);

        $db->execute("UPDATE invoices SET status = ? WHERE id = ?", [$newStatus, $invoiceId]);
        clearCache(['invoices']);
        logActivity('status_change', 'invoices', $invoiceId, ['status' => $inv['status']], ['status' => $newStatus]);

        successResponse(['id' => $invoiceId, 'status' => $newStatus], "Status invoice berhasil diubah menjadi $newStatus");
    }

    // Action: Send Email
    if ($action === 'send-email') {
        if ($method !== 'POST') errorResponse('Method not allowed', 405);
        checkPermission('invoice.send');

        $inv = $db->fetch(
            "SELECT i.*, c.nama_perusahaan, c.email as client_email, c.penanggung_jawab 
             FROM invoices i 
             JOIN clients c ON i.client_id = c.id 
             WHERE i.id = ?",
            [$invoiceId]
        );
        if (!$inv) errorResponse('Invoice tidak ditemukan', 404);

        if (empty($inv['client_email'])) {
            errorResponse('Email klien belum diatur');
        }

        $cfg = getAppSettingsMap();
        $token = $inv['public_token'] ?: bin2hex(random_bytes(24));
        if (empty($inv['public_token'])) {
            $db->execute("UPDATE invoices SET public_token = ? WHERE id = ?", [$token, $invoiceId]);
        }
        $portalUrl = buildPublicAppUrl('#/public-invoice?token=' . urlencode($token));

        $attachments = extractPdfAttachmentFromParams($params, "faktur_{$inv['nomor_invoice']}.pdf");
        $hasLogo = resolveCompanyEmailLogoPath($cfg) !== null;
        $subject = "Faktur Tagihan {$inv['nomor_invoice']} - " . ($cfg['company_name'] ?? 'CRUDWorks ERP');
        $html = buildInvoiceEmailHtml($inv, $cfg, $portalUrl, $hasLogo, !empty($attachments));
        $mailRes = sendErpEmail((string)$inv['client_email'], (string)($inv['penanggung_jawab'] ?: $inv['nama_perusahaan']), $subject, $html, 'invoice', $invoiceId, $attachments);
        if (empty($mailRes['success'])) {
            errorResponse($mailRes['message'] ?? 'Gagal mengirim email faktur', 500);
        }

        // Tandai email terkirim & ubah status ke 'dikirim' jika masih draft
        $updateSql = "UPDATE invoices SET email_terkirim_at = NOW(), last_sent_at = NOW(), last_sent_via = 'email'";
        if ($inv['status'] === 'draft') {
            $updateSql .= ", status = 'dikirim'";
        }
        $updateSql .= " WHERE id = ?";
        $db->execute($updateSql, [$invoiceId]);

        clearCache(['invoices']);
        postJournalForInvoice((int)$invoiceId);
        logActivity('send_email', 'invoices', $invoiceId, null, ['sent_to' => $inv['client_email']]);

        successResponse([
            'invoice_id' => $invoiceId,
            'sent_to' => $inv['client_email'],
            'sent_at' => date('Y-m-d H:i:s')
        ], 'Faktur tagihan berhasil dikirim ke email ' . $inv['client_email']);
    }

    // Action: Log Send / Reminder (WhatsApp / Manual)
    if ($action === 'log-send') {
        if ($method !== 'POST') errorResponse('Method not allowed', 405);
        checkPermission('invoice.view');
        $via = validateEnum((string)($params['via'] ?? ''), ['whatsapp', 'email', 'portal'], 'whatsapp');

        $inv = $db->fetch("SELECT id, nomor_invoice, status FROM invoices WHERE id = ?", [$invoiceId]);
        if (!$inv) errorResponse('Invoice tidak ditemukan', 404);

        $db->execute("UPDATE invoices SET last_sent_at = NOW(), last_sent_via = ? WHERE id = ?", [$via, $invoiceId]);
        logActivity('invoice.send_' . $via, 'invoices', $invoiceId, null, ['via' => $via]);
        successResponse(['last_sent_at' => date('Y-m-d H:i:s'), 'last_sent_via' => $via], 'Riwayat pengiriman dicatat');
    }

    // Single Invoice Detail
    if ($method === 'GET') {
        checkPermission('invoice.view');

        $invoice = $db->fetch(
            "SELECT i.*, 
                    c.nama_perusahaan, c.penanggung_jawab, c.email as client_email, 
                    c.telepon as client_telepon, c.alamat as client_alamat, c.kota as client_kota, c.npwp as client_npwp,
                    p.nama_project, p.kode_project,
                    u.nama_lengkap as pembuat_nama
             FROM invoices i
             JOIN clients c ON i.client_id = c.id
             LEFT JOIN projects p ON i.project_id = p.id
             JOIN users u ON i.created_by = u.id
             WHERE i.id = ?",
            [$invoiceId]
        );

        if (!$invoice) errorResponse('Invoice tidak ditemukan', 404);

        // Ambil item tagihan
        $items = $db->fetchAll(
            "SELECT it.*, s.nama_layanan, s.kode_layanan 
             FROM invoice_items it 
             LEFT JOIN services s ON it.service_id = s.id 
             WHERE it.invoice_id = ? 
             ORDER BY it.id ASC",
            [$invoiceId]
        );

        // Ambil riwayat pembayaran
        $payments = $db->fetchAll(
            "SELECT py.*, pm.nama_metode, pm.nomor_rekening, pm.atas_nama, u.nama_lengkap as verifikator_nama
             FROM payments py
             JOIN payment_methods pm ON py.payment_method_id = pm.id
             JOIN users u ON py.verified_by = u.id
             WHERE py.invoice_id = ?
             ORDER BY py.id DESC",
            [$invoiceId]
        );

        // Ambil info perusahaan & rekening untuk cetak lembar invoice
        $settingsRows = $db->fetchAll("SELECT kunci, nilai FROM app_settings");
        $company = [];
        foreach ($settingsRows as $row) {
            $company[$row['kunci']] = $row['nilai'];
        }

        $paymentMethods = $db->fetchAll("SELECT * FROM payment_methods WHERE status = 'aktif' ORDER BY is_default DESC, id ASC");

        $invoice['items'] = $items;
        $invoice['payments'] = $payments;
        $invoice['company'] = $company;
        $invoice['payment_methods'] = $paymentMethods;

        successResponse($invoice);
    }

    // Update Invoice
    if ($method === 'PUT') {
        checkPermission('invoice.edit');

        $inv = $db->fetch("SELECT * FROM invoices WHERE id = ?", [$invoiceId]);
        if (!$inv) errorResponse('Invoice tidak ditemukan', 404);

        if (in_array($inv['status'], ['lunas', 'batal'])) {
            errorResponse('Invoice dengan status lunas atau batal tidak dapat diedit');
        }

        $clientId = (int)($params['client_id'] ?? $inv['client_id']);
        $projectId = !empty($params['project_id']) ? (int)$params['project_id'] : null;
        $tanggalInvoice = trim($params['tanggal_invoice'] ?? $inv['tanggal_invoice']);
        $tanggalJatuhTempo = trim($params['tanggal_jatuh_tempo'] ?? $inv['tanggal_jatuh_tempo']);
        $diskonTipe = in_array($params['diskon_tipe'] ?? '', ['nominal', 'persen']) ? $params['diskon_tipe'] : 'nominal';
        $diskonNilai = (float)($params['diskon_nilai'] ?? 0);
        $pajakPersen = isset($params['pajak_persen']) ? ($params['pajak_persen'] === '' ? 0.0 : max(0, (float)$params['pajak_persen'])) : getDefaultTaxPercent();
        $catatanKlien = trim($params['catatan_klien'] ?? '');
        $catatanInternal = trim($params['catatan_internal'] ?? '');

        $items = $params['items'] ?? [];
        if (!is_array($items) || empty($items)) {
            errorResponse('Item tagihan minimal harus berisi 1 baris layanan');
        }

        // Kalkulasi ulang subtotal & total
        $calc = calculateInvoiceTotals($items, $diskonTipe, $diskonNilai, $pajakPersen);
        $subtotal = $calc['subtotal'];
        $diskonNominal = $calc['diskon'];
        $pajakNominal = $calc['pajak_nominal'];
        $totalTagihan = $calc['total'];

        $totalDibayar = (float)$inv['total_dibayar'];
        $sisaTagihan = max(0, $totalTagihan - $totalDibayar);

        $pdo = $db->getPdo();
        $pdo->beginTransaction();

        try {
            // Update invoice header
            $stmt = $pdo->prepare(
                "UPDATE invoices SET client_id = ?, project_id = ?, tanggal_invoice = ?, tanggal_jatuh_tempo = ?, 
                        subtotal = ?, diskon_tipe = ?, diskon_nilai = ?, pajak_persen = ?, pajak_nominal = ?, 
                        total_tagihan = ?, sisa_tagihan = ?, catatan_klien = ?, catatan_internal = ? 
                 WHERE id = ?"
            );
            $stmt->execute([
                $clientId, $projectId, $tanggalInvoice, $tanggalJatuhTempo,
                $subtotal, $diskonTipe, $diskonNilai, $pajakPersen, $pajakNominal,
                $totalTagihan, $sisaTagihan, $catatanKlien, $catatanInternal,
                $invoiceId
            ]);

            // Hapus item lama dan ganti dengan item baru
            $pdo->prepare("DELETE FROM invoice_items WHERE invoice_id = ?")->execute([$invoiceId]);

            $stmtItem = $pdo->prepare(
                "INSERT INTO invoice_items (invoice_id, service_id, deskripsi, kuantitas, harga_satuan, total_harga) 
                 VALUES (?, ?, ?, ?, ?, ?)"
            );

            foreach ($items as $it) {
                $serviceId = !empty($it['service_id']) ? (int)$it['service_id'] : null;
                $deskripsi = trim($it['deskripsi'] ?? 'Layanan');
                $qty = (float)($it['kuantitas'] ?? 1);
                $price = (float)($it['harga_satuan'] ?? 0);
                $totalItem = $qty * $price;

                $stmtItem->execute([$invoiceId, $serviceId, $deskripsi, $qty, $price, $totalItem]);
            }

            $pdo->commit();
            clearCache(['invoices']);
            postJournalForInvoice((int)$invoiceId);
            logActivity('update', 'invoices', $invoiceId, $inv, $params);

            successResponse(['id' => $invoiceId], 'Invoice berhasil diperbarui');
        } catch (\Throwable $e) {
            $pdo->rollBack();
            errorResponse('Gagal memperbarui invoice: ' . $e->getMessage(), 500);
        }
    }

    // Delete or Cancel Invoice
    if ($method === 'DELETE') {
        checkPermission('invoice.delete');

        $inv = $db->fetch("SELECT * FROM invoices WHERE id = ?", [$invoiceId]);
        if (!$inv) errorResponse('Invoice tidak ditemukan', 404);

        if ($inv['status'] === 'lunas' || (float)$inv['total_dibayar'] > 0) {
            errorResponse('Invoice yang telah lunas atau memiliki riwayat pembayaran tidak dapat dihapus. Silakan batalkan transaksi pembayaran terlebih dahulu.', 422);
        }

        $db->execute("DELETE FROM invoices WHERE id = ?", [$invoiceId]);
        clearCache(['invoices']);
        logActivity('delete', 'invoices', $invoiceId, $inv);

        successResponse(null, 'Invoice berhasil dihapus');
    }

    errorResponse('Metode tidak didukung', 405);
}

// Collection Level: /api/invoices
if ($method === 'GET') {
    checkPermission('invoice.view');

    $page = (int)($params['page'] ?? 1);
    $perPage = (int)($params['per_page'] ?? PER_PAGE);
    $search = trim($params['search'] ?? '');
    $status = trim($params['status'] ?? '');
    $clientId = (int)($params['client_id'] ?? 0);
    $projectId = (int)($params['project_id'] ?? 0);

    $where = [];
    $bindings = [];

    if (!empty($search)) {
        $where[] = "(i.nomor_invoice LIKE ? OR c.nama_perusahaan LIKE ? OR p.nama_project LIKE ?)";
        $searchPattern = "%$search%";
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
    }

    if (!empty($status)) {
        if ($status === 'jatuh_tempo') {
            $where[] = "(i.status = 'jatuh_tempo' OR (i.status IN ('dikirim', 'sebagian') AND i.tanggal_jatuh_tempo < CURDATE())) AND i.sisa_tagihan > 0";
        } else {
            $where[] = "i.status = ?";
            $bindings[] = $status;
        }
    }

    if ($clientId > 0) {
        $where[] = "i.client_id = ?";
        $bindings[] = $clientId;
    }

    if ($projectId > 0) {
        $where[] = "i.project_id = ?";
        $bindings[] = $projectId;
    }

    $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $countQuery = "SELECT COUNT(*) FROM invoices i JOIN clients c ON i.client_id = c.id LEFT JOIN projects p ON i.project_id = p.id $whereSql";
    $query = "SELECT i.*, c.nama_perusahaan as client_nama, c.email as client_email, p.nama_project,
                     DATEDIFF(CURDATE(), i.tanggal_jatuh_tempo) as hari_terlambat
              FROM invoices i 
              JOIN clients c ON i.client_id = c.id 
              LEFT JOIN projects p ON i.project_id = p.id
              $whereSql 
              ORDER BY i.id DESC";

    paginatedResponse($query, $countQuery, $bindings, $page, $perPage);
}

// Create New Invoice
if ($method === 'POST') {
    checkPermission('invoice.create');

    $clientId = (int)($params['client_id'] ?? 0);
    $projectId = !empty($params['project_id']) ? (int)$params['project_id'] : null;
    $tanggalInvoice = trim($params['tanggal_invoice'] ?? date('Y-m-d'));
    
    // Default jatuh tempo: 14 hari
    $defaultDueDays = 14;
    $dueSetting = $db->fetch("SELECT nilai FROM app_settings WHERE kunci = 'invoice_due_days'");
    if ($dueSetting && is_numeric($dueSetting['nilai'])) {
        $defaultDueDays = (int)$dueSetting['nilai'];
    }
    $tanggalJatuhTempo = trim($params['tanggal_jatuh_tempo'] ?? date('Y-m-d', strtotime("+$defaultDueDays days")));

    $diskonTipe = in_array($params['diskon_tipe'] ?? '', ['nominal', 'persen']) ? $params['diskon_tipe'] : 'nominal';
    $diskonNilai = (float)($params['diskon_nilai'] ?? 0);
    $pajakPersen = isset($params['pajak_persen']) ? ($params['pajak_persen'] === '' ? 0.0 : max(0, (float)$params['pajak_persen'])) : getDefaultTaxPercent();
    $catatanKlien = trim($params['catatan_klien'] ?? '');
    $catatanInternal = trim($params['catatan_internal'] ?? '');

    $items = $params['items'] ?? [];
    if (!$clientId) {
        errorResponse('Pelanggan wajib dipilih');
    }
    if (!is_array($items) || empty($items)) {
        errorResponse('Item tagihan minimal harus berisi 1 baris');
    }

    $calc = calculateInvoiceTotals($items, $diskonTipe, $diskonNilai, $pajakPersen);
    $subtotal = $calc['subtotal'];
    $diskonNominal = $calc['diskon'];
    $pajakNominal = $calc['pajak_nominal'];
    $totalTagihan = $calc['total'];
    $sisaTagihan = $totalTagihan;

    $nomorInvoice = generateInvoiceNo('INV-');
    $publicToken = bin2hex(random_bytes(24));
    $userId = $_SESSION['user_id'] ?? 1;

    $pdo = $db->getPdo();
    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO invoices (nomor_invoice, public_token, client_id, project_id, tanggal_invoice, tanggal_jatuh_tempo, 
                     subtotal, diskon_tipe, diskon_nilai, pajak_persen, pajak_nominal, total_tagihan, total_dibayar, 
                     sisa_tagihan, status, catatan_klien, catatan_internal, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'draft', ?, ?, ?)"
        );
        $stmt->execute([
            $nomorInvoice, $publicToken, $clientId, $projectId, $tanggalInvoice, $tanggalJatuhTempo,
            $subtotal, $diskonTipe, $diskonNilai, $pajakPersen, $pajakNominal, $totalTagihan,
            $sisaTagihan, $catatanKlien, $catatanInternal, $userId
        ]);
        $newInvoiceId = $pdo->lastInsertId();

        $stmtItem = $pdo->prepare(
            "INSERT INTO invoice_items (invoice_id, service_id, deskripsi, kuantitas, harga_satuan, total_harga) 
             VALUES (?, ?, ?, ?, ?, ?)"
        );

        foreach ($items as $it) {
            $serviceId = !empty($it['service_id']) ? (int)$it['service_id'] : null;
            $deskripsi = trim($it['deskripsi'] ?? 'Layanan');
            $qty = (float)($it['kuantitas'] ?? 1);
            $price = (float)($it['harga_satuan'] ?? 0);
            $totalItem = $qty * $price;

            $stmtItem->execute([$newInvoiceId, $serviceId, $deskripsi, $qty, $price, $totalItem]);
        }

        $pdo->commit();
        clearCache(['invoices']);
        postJournalForInvoice((int)$newInvoiceId);
        logActivity('create', 'invoices', $newInvoiceId, null, ['nomor_invoice' => $nomorInvoice, 'total' => $totalTagihan]);

        successResponse(['id' => $newInvoiceId, 'nomor_invoice' => $nomorInvoice], 'Invoice berhasil dibuat');
    } catch (\Throwable $e) {
        $pdo->rollBack();
        errorResponse('Gagal membuat invoice: ' . $e->getMessage(), 500);
    }
}

errorResponse('Metode tidak didukung', 405);
