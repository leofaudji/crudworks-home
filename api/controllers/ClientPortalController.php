<?php
declare(strict_types=1);

// ClientPortalController.php - Portal Klien via tautan token (tanpa login)
$db = Database::getInstance();

$token = trim($id ?? ($params['token'] ?? ''));
if (empty($token)) {
    errorResponse('Token portal klien tidak valid', 400);
}

$client = $db->fetch(
    "SELECT id, kode_klien, nama_perusahaan, penanggung_jawab, email, telepon, alamat, kota, npwp, portal_token, status, created_at
     FROM clients
     WHERE portal_token = ? OR kode_klien = ?",
    [$token, $token]
);

if (!$client) {
    errorResponse('Portal klien tidak ditemukan atau tautan akses tidak sah', 404);
}

if ($method === 'POST' && (($action === 'sign-bast') || (($params['action'] ?? '') === 'sign-bast'))) {
    portalSignBast($db, $client, $params, 'portal_token');
}

if ($method === 'GET') {
    successResponse(portalBuildData($db, $client));
}

errorResponse('Metode tidak didukung', 405);
