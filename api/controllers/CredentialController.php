<?php
declare(strict_types=1);

// api/controllers/CredentialController.php — Brankas Kredensial Terenkripsi (AES-256 Vault)

require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../middleware/rbac.php';
require_once __DIR__ . '/../config/vault_helpers.php';

authCheck();
$db = Database::getInstance();
$userId = (int)($_SESSION['user_id'] ?? 1);

// 1. Reveal Password (Decryption Endpoint with Audit Trail)
if ($method === 'POST' && ($action === 'reveal' || ($params['action'] ?? '') === 'reveal')) {
    checkPermission('credential.view');

    $targetId = (int)($params['id'] ?? $id);
    if (!$targetId) {
        errorResponse('ID Kredensial tidak valid', 400);
    }

    $cred = $db->fetch(
        "SELECT c.*, cl.nama_perusahaan, cl.kode_klien, p.nama_project 
         FROM client_credentials c
         JOIN clients cl ON c.client_id = cl.id
         LEFT JOIN projects p ON c.project_id = p.id
         WHERE c.id = ?",
        [$targetId]
    );

    if (!$cred) {
        errorResponse('Data kredensial tidak ditemukan', 404);
    }

    $decrypted = decryptSecret($cred['encrypted_secret'] ?? '');

    // Rekam Jejak Audit Akses Sensitif
    logActivity(
        'credential.reveal',
        "Membuka kata sandi brankas [{$cred['tipe']}]: {$cred['judul']} (Klien: {$cred['nama_perusahaan']})"
    );

    successResponse([
        'id' => $cred['id'],
        'judul' => $cred['judul'],
        'tipe' => $cred['tipe'],
        'host_url' => $cred['host_url'],
        'port' => $cred['port'],
        'username' => $cred['username'],
        'secret' => $decrypted,
        'catatan' => $cred['catatan'],
        'nama_perusahaan' => $cred['nama_perusahaan'],
        'nama_project' => $cred['nama_project']
    ], 'Kredensial berhasil dibuka');
}

// 2. Single Detail (Masked)
if ($method === 'GET' && $id && is_numeric($id)) {
    checkPermission('credential.view');

    $cred = $db->fetch(
        "SELECT c.id, c.client_id, c.project_id, c.judul, c.tipe, c.host_url, c.port, c.username, c.catatan, c.show_in_portal,
                c.created_at, c.updated_at,
                cl.nama_perusahaan, cl.kode_klien, p.nama_project, u.nama_lengkap as pembuat
         FROM client_credentials c
         JOIN clients cl ON c.client_id = cl.id
         LEFT JOIN projects p ON c.project_id = p.id
         JOIN users u ON c.created_by = u.id
         WHERE c.id = ?",
        [(int)$id]
    );

    if (!$cred) {
        errorResponse('Kredensial tidak ditemukan', 404);
    }

    $cred['secret_masked'] = '••••••••••••';
    successResponse($cred);
}

// 3. List Credentials (Masked)
if ($method === 'GET') {
    checkPermission('credential.view');

    $where = ["1=1"];
    $binds = [];

    if (!empty($params['client_id'])) {
        $where[] = "c.client_id = ?";
        $binds[] = (int)$params['client_id'];
    }
    if (!empty($params['project_id'])) {
        $where[] = "c.project_id = ?";
        $binds[] = (int)$params['project_id'];
    }
    if (!empty($params['tipe'])) {
        $where[] = "c.tipe = ?";
        $binds[] = $params['tipe'];
    }
    if (!empty($params['search'])) {
        $where[] = "(c.judul LIKE ? OR c.username LIKE ? OR c.host_url LIKE ? OR cl.nama_perusahaan LIKE ?)";
        $s = '%' . trim($params['search']) . '%';
        $binds[] = $s;
        $binds[] = $s;
        $binds[] = $s;
        $binds[] = $s;
    }

    $whereSql = implode(' AND ', $where);

    $items = $db->fetchAll(
        "SELECT c.id, c.client_id, c.project_id, c.judul, c.tipe, c.host_url, c.port, c.username, c.catatan, c.show_in_portal,
                c.created_at, c.updated_at,
                cl.nama_perusahaan, cl.kode_klien, p.nama_project, u.nama_lengkap as pembuat
         FROM client_credentials c
         JOIN clients cl ON c.client_id = cl.id
         LEFT JOIN projects p ON c.project_id = p.id
         JOIN users u ON c.created_by = u.id
         WHERE $whereSql
         ORDER BY c.id DESC",
        $binds
    );

    foreach ($items as &$item) {
        $item['secret_masked'] = '••••••••••••';
    }

    successResponse($items);
}

// 4. Create / Update Credential (Encrypted)
if ($method === 'POST') {
    checkPermission('credential.manage');

    $editId = !empty($params['id']) && is_numeric($params['id']) ? (int)$params['id'] : null;
    $clientId = (int)($params['client_id'] ?? 0);
    $projectId = !empty($params['project_id']) && is_numeric($params['project_id']) ? (int)$params['project_id'] : null;
    $judul = trim($params['judul'] ?? '');
    $tipe = in_array($params['tipe'] ?? '', ['ssh_vps', 'cpanel_hosting', 'database', 'wp_admin', 'cloudflare_dns', 'api_key', 'git_repo', 'lainnya'])
        ? $params['tipe']
        : 'ssh_vps';
    $hostUrl = trim($params['host_url'] ?? '');
    $port = trim($params['port'] ?? '');
    $username = trim($params['username'] ?? '');
    $secretInput = trim($params['secret'] ?? ($params['password'] ?? ''));
    $catatan = trim($params['catatan'] ?? '');
    $showInPortal = !empty($params['show_in_portal']) ? 1 : 0;

    if ($clientId <= 0 || empty($judul)) {
        errorResponse('Pelanggan dan Judul Kredensial wajib diisi', 422);
    }

    $client = $db->fetch("SELECT nama_perusahaan FROM clients WHERE id = ?", [$clientId]);
    if (!$client) {
        errorResponse('Data Pelanggan tidak valid', 404);
    }

    if ($editId) {
        // UPDATE
        $existing = $db->fetch("SELECT * FROM client_credentials WHERE id = ?", [$editId]);
        if (!$existing) {
            errorResponse('Data kredensial tidak ditemukan', 404);
        }

        // Jika password diisi, enkripsi ulang; jika kosong, pertahankan yang lama
        $encryptedSecret = !empty($secretInput) ? encryptSecret($secretInput) : $existing['encrypted_secret'];

        $db->execute(
            "UPDATE client_credentials 
             SET client_id = ?, project_id = ?, judul = ?, tipe = ?, host_url = ?, port = ?, username = ?, encrypted_secret = ?, catatan = ?, show_in_portal = ?, updated_at = NOW()
             WHERE id = ?",
            [$clientId, $projectId, $judul, $tipe, $hostUrl, $port, $username, $encryptedSecret, $catatan, $showInPortal, $editId]
        );

        logActivity('credential.update', "Memperbarui kredensial ID {$editId}: {$judul} untuk {$client['nama_perusahaan']}");
        successResponse(['id' => $editId], 'Kredensial berhasil diperbarui');
    } else {
        // CREATE
        if (empty($secretInput)) {
            errorResponse('Kata Sandi / Token Rahasia wajib diisi', 422);
        }

        $encryptedSecret = encryptSecret($secretInput);

        $newId = (int)$db->insert(
            "INSERT INTO client_credentials (client_id, project_id, judul, tipe, host_url, port, username, encrypted_secret, catatan, show_in_portal, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
            [$clientId, $projectId, $judul, $tipe, $hostUrl, $port, $username, $encryptedSecret, $catatan, $showInPortal, $userId]
        );

        logActivity('credential.create', "Menambahkan kredensial baru: {$judul} untuk {$client['nama_perusahaan']}");
        successResponse(['id' => $newId], 'Kredensial berhasil disimpan di brankas terenkripsi');
    }
}

// 5. Delete Credential
if ($method === 'DELETE' && $id && is_numeric($id)) {
    checkPermission('credential.manage');

    $item = $db->fetch(
        "SELECT c.id, c.judul, cl.nama_perusahaan 
         FROM client_credentials c 
         JOIN clients cl ON c.client_id = cl.id 
         WHERE c.id = ?",
        [(int)$id]
    );

    if (!$item) {
        errorResponse('Kredensial tidak ditemukan', 404);
    }

    $db->execute("DELETE FROM client_credentials WHERE id = ?", [(int)$id]);
    logActivity('credential.delete', "Menghapus kredensial ID {$id}: {$item['judul']} (Klien: {$item['nama_perusahaan']})");

    successResponse(null, 'Kredensial berhasil dihapus dari brankas');
}

errorResponse('Metode tidak didukung', 405);
