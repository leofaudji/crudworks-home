<?php
declare(strict_types=1);

// PUBLIC INVOICE PORTAL (NO AUTH REQUIRED — TOKEN OR INVOICE NUMBER ACCESS)
$db = Database::getInstance();

// Optional helper for logged-in admin/staff to list recent invoices when opening #/public-invoice without a token
if ($method === 'GET' && (($params['action'] ?? '') === 'list-recent' || $id === 'list-recent')) {
    if (!empty($_SESSION['user_id'])) {
        $recent = $db->fetchAll(
            "SELECT i.id, i.nomor_invoice, i.public_token, i.tanggal_invoice, i.tanggal_jatuh_tempo,
                    i.total_tagihan, i.sisa_tagihan, i.status, i.payment_verification_status,
                    c.nama_perusahaan, p.nama_project
             FROM invoices i
             JOIN clients c ON i.client_id = c.id
             LEFT JOIN projects p ON i.project_id = p.id
             ORDER BY i.id DESC
             LIMIT 20"
        );
        foreach ($recent as &$r) {
            if (empty($r['public_token'])) {
                $newTok = bin2hex(random_bytes(24));
                $db->execute("UPDATE invoices SET public_token = ? WHERE id = ?", [$newTok, $r['id']]);
                $r['public_token'] = $newTok;
            }
        }
        successResponse($recent);
    }
    successResponse([]);
}

$token = trim((string)($params['token'] ?? $params['nomor'] ?? ($id ?: '')));
if (empty($token)) {
    errorResponse('Token atau nomor faktur belum disertakan', 400);
}

// 1. Fetch Invoice by public_token OR nomor_invoice
$inv = $db->fetch(
    "SELECT i.*, 
            c.nama_perusahaan, c.kode_klien, c.penanggung_jawab, c.email as client_email,
            c.telepon as client_telepon, c.alamat as client_alamat, c.kota as client_kota, c.npwp as client_npwp,
            p.nama_project
     FROM invoices i
     JOIN clients c ON i.client_id = c.id
     LEFT JOIN projects p ON i.project_id = p.id
     WHERE i.public_token = ? OR UPPER(i.nomor_invoice) = UPPER(?)",
    [$token, $token]
);

if (!$inv) {
    errorResponse('Faktur tagihan tidak ditemukan atau tautan akses tidak valid', 404);
}

// Ensure public_token exists on this invoice
if (empty($inv['public_token'])) {
    $newTok = bin2hex(random_bytes(24));
    $db->execute("UPDATE invoices SET public_token = ? WHERE id = ?", [$newTok, $inv['id']]);
    $inv['public_token'] = $newTok;
}

// GET: Return public invoice details
if ($method === 'GET') {
    $items = $db->fetchAll(
        "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC",
        [$inv['id']]
    );

    $payments = $db->fetchAll(
        "SELECT py.nomor_pembayaran, py.tanggal_bayar, py.jumlah_bayar, pm.nama_metode, pm.nama_bank
         FROM payments py
         JOIN payment_methods pm ON py.payment_method_id = pm.id
         WHERE py.invoice_id = ?
         ORDER BY py.id DESC",
        [$inv['id']]
    );

    $settingsRows = $db->fetchAll("SELECT kunci, nilai FROM app_settings");
    $company = [];
    foreach ($settingsRows as $row) {
        $company[$row['kunci']] = $row['nilai'];
    }

    $bankAccounts = $db->fetchAll("SELECT * FROM payment_methods WHERE status = 'aktif' ORDER BY is_default DESC, id ASC");

    $inv['items'] = $items;
    $inv['payments'] = $payments;
    $inv['company'] = $company;
    $inv['payment_methods'] = $bankAccounts;

    successResponse($inv);
}

// POST: Upload Proof of Transfer (Bukti Transfer)
if ($method === 'POST') {
    $catatan = trim((string)($params['catatan'] ?? ''));
    $base64 = trim((string)($params['bukti_transfer_base64'] ?? ''));

    if (empty($base64)) {
        errorResponse('Berkas gambar atau foto bukti transfer wajib diunggah', 422);
    }

    $buktiPath = null;
    if (preg_match('/^data:(image\/[\w+.-]+|application\/pdf);base64,/', $base64, $type)) {
        $data = substr($base64, strpos($base64, ',') + 1);
        $data = base64_decode($data);
        if ($data !== false) {
            $mime = strtolower($type[1]);
            $ext = ($mime === 'application/pdf') ? 'pdf' : str_replace('image/', '', $mime);
            if ($ext === 'jpeg') $ext = 'jpg';
            $ext = preg_replace('/[^a-z0-9]/', '', $ext) ?: 'jpg';

            $proofDir = __DIR__ . '/../../uploads/proofs';
            if (!is_dir($proofDir)) {
                @mkdir($proofDir, 0775, true);
            }

            $filename = 'bukti_' . $inv['id'] . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
            $fullPath = $proofDir . '/' . $filename;
            if (file_put_contents($fullPath, $data) !== false) {
                $buktiPath = 'uploads/proofs/' . $filename;
            }
        }
    }

    if (!$buktiPath) {
        errorResponse('Format berkas bukti transfer tidak didukung. Harap unggah format JPG, PNG, atau PDF.', 422);
    }

    // Update invoice record
    $db->execute(
        "UPDATE invoices 
         SET bukti_transfer = ?, 
             bukti_transfer_catatan = ?, 
             bukti_transfer_at = NOW(), 
             payment_verification_status = 'pending' 
         WHERE id = ?",
        [$buktiPath, $catatan, $inv['id']]
    );

    // Insert alert notification for finance team
    try {
        $db->execute(
            "INSERT INTO notifications (`judul`, `pesan`, `tautan`, `tipe`)
             VALUES (?, ?, ?, 'peringatan')",
            [
                "Bukti Pembayaran Baru: {$inv['nomor_invoice']}",
                "Pelanggan {$inv['nama_perusahaan']} mengunggah bukti transfer untuk faktur {$inv['nomor_invoice']} senilai Rp " . number_format((float)$inv['total_tagihan'], 0, ',', '.') . ". Mohon verifikasi kasir.",
                "#/payments?tab=verifications"
            ]
        );
    } catch (\Throwable $e) {
        // Ignore notification table issues
    }

    clearCache(['invoices', 'payments']);

    successResponse([
        'bukti_transfer' => $buktiPath,
        'verification_status' => 'pending'
    ], 'Bukti transfer berhasil diunggah! Bagian Keuangan CRUDWorks akan segera memverifikasi transaksi Anda.');
}
