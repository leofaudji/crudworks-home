<?php
// PaymentController.php

authCheck();
$db = Database::getInstance();

if ($id && is_numeric($id)) {
    $paymentId = (int)$id;

    if ($method === 'GET') {
        checkPermission('payment.view');

        $payment = $db->fetch(
            "SELECT py.*, 
                    i.nomor_invoice, i.tanggal_invoice, i.total_tagihan, i.sisa_tagihan as current_sisa,
                    c.nama_perusahaan as client_nama, c.penanggung_jawab as client_pic,
                    c.telepon as client_telepon, c.email as client_email,
                    c.alamat as client_alamat, c.kota as client_kota,
                    pm.nama_metode, pm.nama_bank, pm.cabang, pm.nomor_rekening, pm.atas_nama,
                    u.nama_lengkap as verifikator_nama
             FROM payments py
             JOIN invoices i ON py.invoice_id = i.id
             JOIN clients c ON i.client_id = c.id
             JOIN payment_methods pm ON py.payment_method_id = pm.id
             JOIN users u ON py.verified_by = u.id
             WHERE py.id = ?",
            [$paymentId]
        );

        if (!$payment) errorResponse('Data pembayaran tidak ditemukan', 404);
        successResponse($payment);
    }

    if ($method === 'DELETE') {
        checkPermission('payment.create'); // Hanya role yang bisa catat bayar yang bisa batalkan

        $payment = $db->fetch("SELECT * FROM payments WHERE id = ?", [$paymentId]);
        if (!$payment) errorResponse('Data pembayaran tidak ditemukan', 404);

        $invoiceId = (int)$payment['invoice_id'];
        $jumlahBayar = (float)$payment['jumlah_bayar'];

        $inv = $db->fetch("SELECT * FROM invoices WHERE id = ?", [$invoiceId]);
        if (!$inv) errorResponse('Invoice terkait tidak ditemukan', 404);

        $pdo = $db->getPdo();
        $pdo->beginTransaction();

        try {
            // Hapus record pembayaran
            $pdo->prepare("DELETE FROM payments WHERE id = ?")->execute([$paymentId]);

            // Kembalikan saldo invoice
            $newTotalDibayar = max(0, (float)$inv['total_dibayar'] - $jumlahBayar);
            $newSisaTagihan = (float)$inv['total_tagihan'] - $newTotalDibayar;

            // Update status invoice
            $newStatus = 'dikirim';
            if ($newTotalDibayar > 0) {
                $newStatus = 'sebagian';
            }
            if ($newSisaTagihan > 0 && strtotime($inv['tanggal_jatuh_tempo']) < time()) {
                $newStatus = 'jatuh_tempo';
            }

            $stmt = $pdo->prepare("UPDATE invoices SET total_dibayar = ?, sisa_tagihan = ?, status = ? WHERE id = ?");
            $stmt->execute([$newTotalDibayar, $newSisaTagihan, $newStatus, $invoiceId]);

            $pdo->commit();
            clearCache(['invoices', 'payments']);
            logActivity('delete', 'payments', $paymentId, $payment);

            successResponse(null, 'Pembayaran berhasil dibatalkan dan saldo invoice dikembalikan');
        } catch (\Throwable $e) {
            $pdo->rollBack();
            errorResponse('Gagal membatalkan pembayaran: ' . $e->getMessage(), 500);
        }
    }

    errorResponse('Metode tidak didukung', 405);
}

// Verification endpoints for uploaded proof of transfer
if ($method === 'GET' && ($id === 'verifications' || ($params['tab'] ?? '') === 'verifications')) {
    checkPermission('payment.view');
    $verifications = $db->fetchAll(
        "SELECT i.id as invoice_id, i.nomor_invoice, i.tanggal_invoice, i.total_tagihan, i.sisa_tagihan,
                i.bukti_transfer, i.bukti_transfer_catatan, i.bukti_transfer_at, i.payment_verification_status,
                c.nama_perusahaan as client_nama, c.penanggung_jawab as client_pic, c.telepon as client_telepon
         FROM invoices i
         JOIN clients c ON i.client_id = c.id
         WHERE i.payment_verification_status = 'pending'
         ORDER BY i.bukti_transfer_at DESC"
    );
    successResponse($verifications);
}

if ($method === 'POST' && $action === 'verify-transfer' && $id) {
    checkPermission('payment.create');
    $invId = (int)$id;
    $inv = $db->fetch("SELECT * FROM invoices WHERE id = ?", [$invId]);
    if (!$inv) errorResponse('Invoice tidak ditemukan', 404);

    $jumlahBayar = !empty($params['jumlah_bayar']) ? (float)$params['jumlah_bayar'] : (float)$inv['sisa_tagihan'];
    $paymentMethodId = (int)($params['payment_method_id'] ?? 1);
    $nomorRef = trim($params['nomor_referensi'] ?? ('TF-ONLINE-' . date('dHis')));
    $catatan = trim($params['catatan'] ?? 'Verifikasi bukti transfer klien');
    $userId = $_SESSION['user_id'] ?? 1;

    // Generate nomor pembayaran
    $nomorPembayaran = generatePaymentNo('PAY-');

    $pdo = $db->getPdo();
    $pdo->beginTransaction();
    try {
        $stmtPay = $pdo->prepare(
            "INSERT INTO payments (`nomor_pembayaran`, `invoice_id`, `payment_method_id`, `tanggal_bayar`, `jumlah_bayar`, `nomor_referensi`, `catatan`, `verified_by`)
             VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?)"
        );
        $stmtPay->execute([$nomorPembayaran, $invId, $paymentMethodId, $jumlahBayar, $nomorRef, $catatan, $userId]);
        $payId = $pdo->lastInsertId();

        $newTotalDibayar = (float)$inv['total_dibayar'] + $jumlahBayar;
        $newSisaTagihan = max(0, (float)$inv['total_tagihan'] - $newTotalDibayar);
        $newStatus = ($newSisaTagihan <= 0.01) ? 'lunas' : 'sebagian';

        $pdo->prepare(
            "UPDATE invoices SET total_dibayar = ?, sisa_tagihan = ?, status = ?, payment_verification_status = 'verified' WHERE id = ?"
        )->execute([$newTotalDibayar, $newSisaTagihan, $newStatus, $invId]);

        $pdo->commit();
        clearCache(['invoices', 'payments', 'dashboard']);
        postJournalForPayment((int)$payId);
        logActivity('payment.verify', "Menyetujui bukti transfer faktur {$inv['nomor_invoice']} senilai Rp " . number_format($jumlahBayar, 0, ',', '.'));

        successResponse([
            'payment_id' => $payId,
            'nomor_pembayaran' => $nomorPembayaran,
            'invoice_status' => $newStatus
        ], "Bukti transfer berhasil diverifikasi dan pembayaran resmi {$nomorPembayaran} diterbitkan!");
    } catch (\Throwable $e) {
        $pdo->rollBack();
        errorResponse('Gagal memverifikasi bukti transfer: ' . $e->getMessage(), 500);
    }
}

if ($method === 'POST' && $action === 'reject-transfer' && $id) {
    checkPermission('payment.create');
    $invId = (int)$id;
    $inv = $db->fetch("SELECT * FROM invoices WHERE id = ?", [$invId]);
    if (!$inv) errorResponse('Invoice tidak ditemukan', 404);

    $alasan = trim($params['alasan_penolakan'] ?? 'Bukti transfer tidak terbaca atau mutasi rekening belum masuk');
    $db->execute("UPDATE invoices SET payment_verification_status = 'rejected', bukti_transfer_catatan = CONCAT(IFNULL(bukti_transfer_catatan, ''), ' [Ditolak: ', ?, ']') WHERE id = ?", [$alasan, $invId]);

    clearCache(['invoices', 'payments']);
    logActivity('payment.reject', "Menolak bukti transfer faktur {$inv['nomor_invoice']} dengan alasan: {$alasan}");

    successResponse(null, "Bukti transfer telah ditolak.");
}

// Collection level: /api/payments
if ($method === 'GET') {
    checkPermission('payment.view');

    $page = (int)($params['page'] ?? 1);
    $perPage = (int)($params['per_page'] ?? PER_PAGE);
    $search = trim($params['search'] ?? '');
    $invoiceId = (int)($params['invoice_id'] ?? 0);
    $paymentMethodId = (int)($params['payment_method_id'] ?? 0);

    $where = [];
    $bindings = [];

    if (!empty($search)) {
        $where[] = "(py.nomor_pembayaran LIKE ? OR i.nomor_invoice LIKE ? OR c.nama_perusahaan LIKE ? OR py.nomor_referensi LIKE ?)";
        $searchPattern = "%$search%";
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
    }

    if ($invoiceId > 0) {
        $where[] = "py.invoice_id = ?";
        $bindings[] = $invoiceId;
    }

    if ($paymentMethodId > 0) {
        $where[] = "py.payment_method_id = ?";
        $bindings[] = $paymentMethodId;
    }

    $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $countQuery = "SELECT COUNT(*) FROM payments py JOIN invoices i ON py.invoice_id = i.id JOIN clients c ON i.client_id = c.id $whereSql";
    $query = "SELECT py.*,
                     i.nomor_invoice, i.total_tagihan, i.sisa_tagihan as current_sisa,
                     c.nama_perusahaan as client_nama, c.penanggung_jawab as client_pic,
                     c.telepon as client_telepon, c.email as client_email,
                     c.alamat as client_alamat, c.kota as client_kota,
                     pm.nama_metode, pm.nama_bank, u.nama_lengkap as verifikator_nama
              FROM payments py
              JOIN invoices i ON py.invoice_id = i.id
              JOIN clients c ON i.client_id = c.id
              JOIN payment_methods pm ON py.payment_method_id = pm.id
              JOIN users u ON py.verified_by = u.id
              $whereSql
              ORDER BY py.id DESC";

    paginatedResponse($query, $countQuery, $bindings, $page, $perPage);
}

if ($method === 'POST') {
    checkPermission('payment.create');

    $invoiceId = (int)($params['invoice_id'] ?? 0);
    $paymentMethodId = (int)($params['payment_method_id'] ?? 1);
    $tanggalBayar = trim($params['tanggal_bayar'] ?? date('Y-m-d'));
    $jumlahBayar = (float)($params['jumlah_bayar'] ?? 0);
    $nomorReferensi = trim($params['nomor_referensi'] ?? '');
    $catatan = trim($params['catatan'] ?? '');
    $buktiTransfer = trim($params['bukti_transfer'] ?? '');
    $useDeposit = !empty($params['use_deposit']);

    if (!$invoiceId || $jumlahBayar <= 0) {
        errorResponse('Invoice dan jumlah pembayaran valid wajib diisi');
    }

    $inv = $db->fetch("SELECT * FROM invoices WHERE id = ?", [$invoiceId]);
    if (!$inv) errorResponse('Invoice tidak ditemukan', 404);

    if (in_array($inv['status'], ['lunas', 'batal'])) {
        errorResponse('Invoice ini sudah lunas atau telah dibatalkan');
    }

    $sisaTagihan = (float)$inv['sisa_tagihan'];
    if (round($jumlahBayar, 2) > round($sisaTagihan, 2) + 0.5) {
        errorResponse('Jumlah pembayaran (' . formatIDR($jumlahBayar) . ') melebihi sisa tagihan (' . formatIDR($sisaTagihan) . ')');
    }

    $nomorPembayaran = generatePaymentNo('PAY-');
    $userId = $_SESSION['user_id'] ?? 1;

    $pdo = $db->getPdo();
    $pdo->beginTransaction();

    try {
        if ($useDeposit) {
            $clRow = $db->fetch("SELECT saldo_deposit FROM clients WHERE id = ? FOR UPDATE", [(int)$inv['client_id']]);
            $curDeposit = (float)($clRow['saldo_deposit'] ?? 0);
            if ($curDeposit + 0.01 < $jumlahBayar) {
                $pdo->rollBack();
                errorResponse('Saldo deposit klien (' . formatIDR($curDeposit) . ') tidak mencukupi untuk pembayaran ini', 422);
            }
            $newDeposit = max(0, $curDeposit - $jumlahBayar);
            $pdo->prepare("UPDATE clients SET saldo_deposit = ? WHERE id = ?")->execute([$newDeposit, (int)$inv['client_id']]);
            $pdo->prepare(
                "INSERT INTO client_deposit_logs (client_id, tipe, nominal, saldo_setelah, invoice_id, catatan, created_by) VALUES (?, 'potong', ?, ?, ?, ?, ?)"
            )->execute([(int)$inv['client_id'], $jumlahBayar, $newDeposit, $invoiceId, "Pembayaran Faktur {$inv['nomor_invoice']}", $userId]);
            if ($catatan === '') {
                $catatan = "Dibayar menggunakan saldo deposit klien ({$nomorPembayaran})";
            }
        }
        // Simpan transaksi pembayaran
        $stmtPay = $pdo->prepare(
            "INSERT INTO payments (nomor_pembayaran, invoice_id, payment_method_id, tanggal_bayar, jumlah_bayar, nomor_referensi, bukti_transfer, catatan, verified_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmtPay->execute([
            $nomorPembayaran, $invoiceId, $paymentMethodId, $tanggalBayar,
            $jumlahBayar, $nomorReferensi, $buktiTransfer, $catatan, $userId
        ]);
        $newPayId = $pdo->lastInsertId();

        // Hitung saldo baru invoice
        $newTotalDibayar = (float)$inv['total_dibayar'] + $jumlahBayar;
        $newSisaTagihan = max(0, (float)$inv['total_tagihan'] - $newTotalDibayar);

        $newStatus = ($newSisaTagihan <= 0.01) ? 'lunas' : 'sebagian';

        $stmtInv = $pdo->prepare(
            "UPDATE invoices SET total_dibayar = ?, sisa_tagihan = ?, status = ? WHERE id = ?"
        );
        $stmtInv->execute([$newTotalDibayar, $newSisaTagihan, $newStatus, $invoiceId]);

        $pdo->commit();
        clearCache(['invoices', 'payments']);
        postJournalForPayment((int)$newPayId);
        logActivity('create', 'payments', $newPayId, null, [
            'nomor_pembayaran' => $nomorPembayaran,
            'invoice_id' => $invoiceId,
            'jumlah_bayar' => $jumlahBayar,
            'status_invoice' => $newStatus
        ]);

        successResponse([
            'id' => $newPayId,
            'nomor_pembayaran' => $nomorPembayaran,
            'invoice_status' => $newStatus,
            'sisa_tagihan' => $newSisaTagihan
        ], 'Pembayaran berhasil dicatat. Status invoice kini: ' . strtoupper($newStatus));
    } catch (\Throwable $e) {
        $pdo->rollBack();
        errorResponse('Gagal mencatat pembayaran: ' . $e->getMessage(), 500);
    }
}

errorResponse('Metode tidak didukung', 405);
