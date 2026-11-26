<?php
declare(strict_types=1);

// PaymentGatewayController.php — Online Payment Gateway & Webhook (Midtrans / Xendit / QRIS / Sandbox)
$db = Database::getInstance();

// Helper: load gateway settings from app_settings
$pgRows = $db->fetchAll("SELECT kunci, nilai FROM app_settings WHERE kunci LIKE 'pg_%'");
$pgCfg = [];
foreach ($pgRows as $r) {
    $pgCfg[$r['kunci']] = $r['nilai'];
}
$provider = $pgCfg['pg_provider'] ?? 'sandbox';

/**
 * Helper: Catat pelunasan invoice dari transaksi payment gateway dalam transaksi PDO.
 */
$recordGatewayPayment = function (array $tx, array $rawPayload = []) use ($db): array {
    $pdo = $db->getPdo();
    $pdo->beginTransaction();
    try {
        // Lock transaction row
        $stmtLock = $pdo->prepare("SELECT * FROM payment_gateway_transactions WHERE id = ? FOR UPDATE");
        $stmtLock->execute([(int)$tx['id']]);
        $lockedTx = $stmtLock->fetch(PDO::FETCH_ASSOC);
        if (!$lockedTx) {
            $pdo->rollBack();
            return ['already_paid' => false, 'error' => 'Transaksi tidak ditemukan'];
        }
        if ($lockedTx['status'] === 'paid') {
            $pdo->commit();
            return ['already_paid' => true, 'invoice_id' => (int)$lockedTx['invoice_id']];
        }

        $invStmt = $pdo->prepare("SELECT * FROM invoices WHERE id = ? FOR UPDATE");
        $invStmt->execute([(int)$lockedTx['invoice_id']]);
        $inv = $invStmt->fetch(PDO::FETCH_ASSOC);
        if (!$inv) {
            $pdo->rollBack();
            return ['already_paid' => false, 'error' => 'Faktur tidak ditemukan'];
        }

        // Cari metode pembayaran aktif (default atau yang pertama)
        $pm = $db->fetch("SELECT id FROM payment_methods WHERE status = 'aktif' ORDER BY is_default DESC, id ASC LIMIT 1");
        $pmId = $pm ? (int)$pm['id'] : 1;

        $amount = min((float)$lockedTx['amount'], (float)$inv['sisa_tagihan'] > 0 ? (float)$inv['sisa_tagihan'] : (float)$lockedTx['amount']);
        $payNo = 'PAY-PG-' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
        $today = date('Y-m-d');

        $pdo->prepare(
            "INSERT INTO payments (nomor_pembayaran, invoice_id, payment_method_id, tanggal_bayar, jumlah_bayar, referensi_transaksi, catatan, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, NULL)"
        )->execute([
            $payNo,
            (int)$inv['id'],
            $pmId,
            $today,
            $amount,
            $lockedTx['order_id'],
            'Pembayaran Online (' . strtoupper($lockedTx['provider']) . ' - ' . strtoupper($lockedTx['channel']) . ')'
        ]);
        $newPgPayId = (int)$pdo->lastInsertId();

        $newPaid = (float)$inv['total_dibayar'] + $amount;
        $newSisa = max(0.0, (float)$inv['total_tagihan'] - $newPaid);
        $newStatus = $newSisa <= 0.01 ? 'lunas' : 'sebagian';

        $pdo->prepare(
            "UPDATE invoices SET total_dibayar = ?, sisa_tagihan = ?, status = ?, payment_verification_status = 'verified' WHERE id = ?"
        )->execute([$newPaid, $newSisa, $newStatus, (int)$inv['id']]);

        $pdo->prepare(
            "UPDATE payment_gateway_transactions SET status = 'paid', paid_at = NOW(), raw_payload = ? WHERE id = ?"
        )->execute([json_encode($rawPayload, JSON_UNESCAPED_UNICODE), (int)$lockedTx['id']]);

        $pdo->commit();

        clearCache(['invoices', 'dashboard']);
        if (!empty($newPgPayId)) postJournalForPayment($newPgPayId);
        createNotification(
            'Pembayaran Online Diterima',
            "Faktur {$inv['nomor_invoice']} dibayar sebesar Rp " . number_format($amount, 0, ',', '.') . " via " . strtoupper($lockedTx['channel']),
            '#/invoices',
            'sukses'
        );
        dispatchWebhook('invoice.paid', [
            'invoice_id' => (int)$inv['id'],
            'nomor_invoice' => $inv['nomor_invoice'],
            'order_id' => $lockedTx['order_id'],
            'amount' => $amount,
            'channel' => $lockedTx['channel'],
            'status' => $newStatus,
        ]);

        return ['already_paid' => false, 'invoice_id' => (int)$inv['id'], 'nomor_pembayaran' => $payNo, 'status' => $newStatus];
    } catch (\Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        return ['already_paid' => false, 'error' => $e->getMessage()];
    }
};

// 1. POST /api/payment-gateway/create
if ($method === 'POST' && $id === 'create') {
    $token = trim((string)($params['token'] ?? $params['nomor'] ?? ''));
    $channel = in_array($params['channel'] ?? '', ['qris', 'va_bca', 'va_mandiri', 'ewallet'], true) ? $params['channel'] : 'qris';

    if ($token === '') errorResponse('Token faktur wajib disertakan', 422);

    $inv = $db->fetch(
        "SELECT i.*, c.nama_perusahaan, c.email as client_email, c.telepon as client_telepon
         FROM invoices i JOIN clients c ON i.client_id = c.id
         WHERE i.public_token = ? OR UPPER(i.nomor_invoice) = UPPER(?)",
        [$token, $token]
    );
    if (!$inv) errorResponse('Faktur tidak ditemukan', 404);
    if ((float)$inv['sisa_tagihan'] <= 0 || $inv['status'] === 'lunas') {
        errorResponse('Faktur ini sudah lunas', 422);
    }

    $orderId = 'CW-' . $inv['id'] . '-' . time() . '-' . strtoupper(bin2hex(random_bytes(2)));
    $amount = (float)$inv['sisa_tagihan'];
    $vaNumber = null;
    $qrString = null;
    $paymentUrl = null;

    if ($channel === 'qris') {
        $qrString = '00020101021226580014ID.CO.CRUDWORKS0215' . str_pad((string)$inv['id'], 10, '0', STR_PAD_LEFT) . '52045999530336054' . strlen((string)(int)$amount) . (int)$amount . '5802ID5913CRUDWorks ERP6304ABCD';
    } elseif ($channel === 'va_bca') {
        $vaNumber = '88001' . str_pad((string)$inv['id'], 8, '0', STR_PAD_LEFT);
    } elseif ($channel === 'va_mandiri') {
        $vaNumber = '89022' . str_pad((string)$inv['id'], 8, '0', STR_PAD_LEFT);
    } else {
        $paymentUrl = '#/public-invoice?token=' . urlencode((string)$inv['public_token']);
    }

    $txId = $db->insert(
        "INSERT INTO payment_gateway_transactions (order_id, invoice_id, provider, channel, amount, status, payment_url, qr_string, va_number)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)",
        [$orderId, (int)$inv['id'], $provider, $channel, $amount, $paymentUrl, $qrString, $vaNumber]
    );

    successResponse([
        'id' => (int)$txId,
        'order_id' => $orderId,
        'provider' => $provider,
        'channel' => $channel,
        'amount' => $amount,
        'status' => 'pending',
        'va_number' => $vaNumber,
        'qr_string' => $qrString,
        'payment_url' => $paymentUrl,
    ], 'Sesi pembayaran online berhasil dibuat', 201);
}

// 2. GET /api/payment-gateway/status?order_id=...
if ($method === 'GET' && $id === 'status') {
    $orderId = trim((string)($params['order_id'] ?? ''));
    if ($orderId === '') errorResponse('order_id wajib diisi', 422);
    $tx = $db->fetch("SELECT id, order_id, invoice_id, provider, channel, amount, status, va_number, qr_string, paid_at, created_at FROM payment_gateway_transactions WHERE order_id = ?", [$orderId]);
    if (!$tx) errorResponse('Transaksi tidak ditemukan', 404);
    successResponse($tx);
}

// 3. POST /api/payment-gateway/simulate-pay (Sandbox 1-click confirmation)
if ($method === 'POST' && $id === 'simulate-pay') {
    if ($provider !== 'sandbox' && empty($_SESSION['user_id'])) {
        errorResponse('Simulasi hanya tersedia pada mode Sandbox', 403);
    }
    $orderId = trim((string)($params['order_id'] ?? ''));
    if ($orderId === '') errorResponse('order_id wajib diisi', 422);
    $tx = $db->fetch("SELECT * FROM payment_gateway_transactions WHERE order_id = ?", [$orderId]);
    if (!$tx) errorResponse('Transaksi tidak ditemukan', 404);

    $res = $recordGatewayPayment($tx, ['source' => 'sandbox_simulate', 'order_id' => $orderId]);
    if (!empty($res['error'])) errorResponse($res['error'], 500);
    successResponse($res, 'Pembayaran berhasil dikonfirmasi dan faktur telah dilunasi');
}

// 4. POST /api/payment-gateway/webhook (Callback Midtrans / Xendit / Eksternal)
if ($method === 'POST' && $id === 'webhook') {
    $orderId = trim((string)($params['order_id'] ?? $params['external_id'] ?? ''));
    $txStatus = strtolower(trim((string)($params['transaction_status'] ?? $params['status'] ?? '')));

    if ($orderId === '') errorResponse('order_id / external_id wajib ada', 422);

    // Validasi signature opsional jika secret diset
    $webhookSecret = trim((string)($pgCfg['pg_webhook_secret'] ?? ''));
    if ($webhookSecret !== '') {
        $hdrToken = $_SERVER['HTTP_X_CALLBACK_TOKEN'] ?? $_SERVER['HTTP_X_WEBHOOK_SECRET'] ?? '';
        $midtransSig = (string)($params['signature_key'] ?? '');
        $valid = false;
        if ($hdrToken !== '' && hash_equals($webhookSecret, $hdrToken)) {
            $valid = true;
        } elseif ($midtransSig !== '' && !empty($pgCfg['pg_server_key'])) {
            $expected = hash('sha512', $orderId . ($params['status_code'] ?? '200') . ($params['gross_amount'] ?? '') . $pgCfg['pg_server_key']);
            $valid = hash_equals($expected, $midtransSig);
        }
        if (!$valid) errorResponse('Signature webhook tidak valid', 401);
    }

    $tx = $db->fetch("SELECT * FROM payment_gateway_transactions WHERE order_id = ?", [$orderId]);
    if (!$tx) errorResponse('Order tidak ditemukan', 404);

    if (in_array($txStatus, ['settlement', 'capture', 'paid', 'succeeded'], true)) {
        $res = $recordGatewayPayment($tx, $params);
        if (!empty($res['error'])) errorResponse($res['error'], 500);
        successResponse($res, 'Webhook pembayaran diproses');
    } elseif (in_array($txStatus, ['expire', 'expired', 'cancel', 'deny', 'failed'], true)) {
        $newSt = in_array($txStatus, ['expire', 'expired'], true) ? 'expired' : 'failed';
        $db->execute("UPDATE payment_gateway_transactions SET status = ?, raw_payload = ? WHERE id = ?", [$newSt, json_encode($params), (int)$tx['id']]);
        successResponse(['order_id' => $orderId, 'status' => $newSt], 'Status transaksi diperbarui');
    }

    successResponse(['order_id' => $orderId, 'status' => $tx['status']], 'Webhook diterima');
}

errorResponse('Endpoint payment gateway tidak ditemukan', 404);
