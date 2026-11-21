<?php
declare(strict_types=1);

// PublicQuotationController.php - Portal Publik Penawaran & Persetujuan Digital (E-Signature)
$db = Database::getInstance();

$token = trim($id ?? ($params['token'] ?? ''));
if (empty($token)) {
    errorResponse('Token surat penawaran tidak valid', 400);
}

// 1. Ambil Data Penawaran Publik via Token / Nomor Penawaran
$quo = $db->fetch(
    "SELECT q.*, c.nama_perusahaan, c.kode_klien, c.penanggung_jawab, c.email as client_email,
            c.telepon as client_telepon, c.alamat as client_alamat, c.kota as client_kota, c.npwp as client_npwp,
            p.nama_project, p.kode_project, u.nama_lengkap as pembuat_nama,
            inv.nomor_invoice as converted_invoice_no
     FROM quotations q
     JOIN clients c ON q.client_id = c.id
     LEFT JOIN projects p ON q.project_id = p.id
     LEFT JOIN users u ON q.created_by = u.id
     LEFT JOIN invoices inv ON q.converted_invoice_id = inv.id
     WHERE q.public_token = ? OR q.nomor_penawaran = ?",
    [$token, $token]
);

if (!$quo) {
    errorResponse('Surat penawaran tidak ditemukan atau tautan telah kedaluwarsa', 404);
}

$quoId = (int)$quo['id'];

if ($method === 'GET') {
    $items = $db->fetchAll(
        "SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY urutan ASC, id ASC",
        [$quoId]
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

// 2. Persetujuan & Tanda Tangan Digital Klien (E-Signature)
if ($method === 'POST') {
    $actionName = $action ?? ($params['action'] ?? 'sign');

    if ($actionName === 'sign') {
        if ($quo['status'] === 'disetujui' || $quo['status'] === 'dikonversi') {
            errorResponse('Surat penawaran ini sudah disetujui sebelumnya', 400);
        }
        if ($quo['status'] === 'ditolak') {
            errorResponse('Surat penawaran ini telah berstatus ditolak', 400);
        }

        $namaPenandatangan = trim($params['signed_by_name'] ?? '');
        $jabatanPenandatangan = trim($params['signed_by_position'] ?? 'Penanggung Jawab Klien');
        $signatureData = trim($params['signature_data'] ?? '');

        if (empty($namaPenandatangan)) {
            errorResponse('Nama penandatangan wajib diisi', 422);
        }
        if (empty($signatureData) || !str_starts_with($signatureData, 'data:image/')) {
            errorResponse('Bidikan tanda tangan digital wajib dibubuhkan', 422);
        }

        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

        $db->execute(
            "UPDATE quotations 
             SET `status` = 'disetujui',
                 `signed_by_name` = ?,
                 `signed_by_position` = ?,
                 `signature_data` = ?,
                 `signed_at` = NOW(),
                 `signed_ip` = ?
             WHERE id = ?",
            [$namaPenandatangan, $jabatanPenandatangan, $signatureData, $ip, $quoId]
        );

        logActivity('quotation.signed', "Penawaran {$quo['nomor_penawaran']} disetujui secara digital oleh {$namaPenandatangan}");
        clearCache(['quotations', 'dashboard']);

        successResponse([
            'quotation_id' => $quoId,
            'nomor_penawaran' => $quo['nomor_penawaran'],
            'signed_by' => $namaPenandatangan,
            'signed_at' => date('Y-m-d H:i:s')
        ], 'Persetujuan proposal dan tanda tangan digital berhasil disimpan. Tim kami akan segera menghubungi Anda!');
    }

    errorResponse('Aksi tidak didukung', 405);
}

errorResponse('Metode tidak didukung', 405);
