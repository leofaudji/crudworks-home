<?php
declare(strict_types=1);

// PortalAuthController.php - Login mandiri Portal Klien (PWA /portal)
// Sesi memakai kunci terpisah (portal_client_id) sehingga tidak pernah memberi akses ke panel admin.
$db = Database::getInstance();
$sub = (string)($id ?? '');

$maxAttempts = 5;
$lockMinutes = 15;

if ($method === 'POST' && $sub === 'login') {
    $identifier = trim((string)($params['identifier'] ?? ''));
    $password = (string)($params['password'] ?? '');
    if ($identifier === '' || $password === '') {
        errorResponse('Kode klien/email dan kata sandi wajib diisi', 422);
    }

    $generic = 'Kode klien/email atau kata sandi tidak sesuai';
    $candidates = $db->fetchAll(
        "SELECT id, kode_klien, nama_perusahaan, penanggung_jawab, email, telepon, portal_password,
                portal_failed_attempts, (portal_locked_until IS NOT NULL AND portal_locked_until > NOW()) AS is_locked
         FROM clients
         WHERE (kode_klien = ? OR email = ?) AND portal_password IS NOT NULL AND status IN ('aktif', 'prospek')
         LIMIT 5",
        [$identifier, $identifier]
    );

    if (empty($candidates)) {
        password_verify($password, password_hash('dummy-timing', PASSWORD_DEFAULT));
        errorResponse($generic, 401);
    }

    $matched = null;
    $lockedCount = 0;
    foreach ($candidates as $cand) {
        if ((int)$cand['is_locked'] === 1) {
            $lockedCount++;
            continue;
        }
        if (password_verify($password, $cand['portal_password'])) {
            $matched = $cand;
            break;
        }
    }

    if (!$matched) {
        if ($lockedCount === count($candidates)) {
            errorResponse("Terlalu banyak percobaan gagal. Coba lagi dalam {$lockMinutes} menit.", 429);
        }
        foreach ($candidates as $cand) {
            if ((int)$cand['is_locked'] === 1) continue;
            $attempts = (int)$cand['portal_failed_attempts'] + 1;
            if ($attempts >= $maxAttempts) {
                $db->execute(
                    "UPDATE clients SET portal_failed_attempts = 0, portal_locked_until = DATE_ADD(NOW(), INTERVAL {$lockMinutes} MINUTE) WHERE id = ?",
                    [(int)$cand['id']]
                );
            } else {
                $db->execute("UPDATE clients SET portal_failed_attempts = ? WHERE id = ?", [$attempts, (int)$cand['id']]);
            }
        }
        errorResponse($generic, 401);
    }

    if (password_needs_rehash($matched['portal_password'], PASSWORD_DEFAULT)) {
        $db->execute("UPDATE clients SET portal_password = ? WHERE id = ?", [password_hash($password, PASSWORD_DEFAULT), (int)$matched['id']]);
    }
    $db->execute(
        "UPDATE clients SET portal_failed_attempts = 0, portal_locked_until = NULL, portal_last_login_at = NOW() WHERE id = ?",
        [(int)$matched['id']]
    );

    session_regenerate_id(true);
    $_SESSION['portal_client_id'] = (int)$matched['id'];
    $_SESSION['portal_csrf_token'] = bin2hex(random_bytes(32));

    logActivity('portal.login', 'clients', (int)$matched['id'], null, [
        'keterangan' => "Login Portal Klien: {$matched['nama_perusahaan']}",
        'sumber' => 'portal_pwa'
    ]);

    successResponse([
        'client' => [
            'id' => (int)$matched['id'],
            'kode_klien' => $matched['kode_klien'],
            'nama_perusahaan' => $matched['nama_perusahaan'],
            'penanggung_jawab' => $matched['penanggung_jawab'],
            'email' => $matched['email'],
            'telepon' => $matched['telepon']
        ],
        'csrf_token' => $_SESSION['portal_csrf_token']
    ], 'Login berhasil');
}

if ($method === 'POST' && $sub === 'logout') {
    unset($_SESSION['portal_client_id'], $_SESSION['portal_csrf_token']);
    successResponse(null, 'Berhasil keluar');
}

if ($method === 'GET' && $sub === 'me') {
    $client = portalCurrentClient($db);
    if (empty($_SESSION['portal_csrf_token'])) {
        $_SESSION['portal_csrf_token'] = bin2hex(random_bytes(32));
    }
    successResponse(['client' => $client, 'csrf_token' => $_SESSION['portal_csrf_token']]);
}

if ($method === 'GET' && $sub === 'data') {
    $client = portalCurrentClient($db);
    successResponse(portalBuildData($db, $client));
}

if ($method === 'POST' && $sub === 'sign-bast') {
    $client = portalCurrentClient($db);
    portalSignBast($db, $client, $params, 'portal_pwa');
}

if ($method === 'POST' && $sub === 'create-ticket') {
    $client = portalCurrentClient($db);
    portalCreateTicket($db, $client, $params);
}

if ($method === 'GET' && $sub === 'ticket-detail') {
    $client = portalCurrentClient($db);
    portalGetTicketDetail($db, $client, (int)($params['id'] ?? 0));
}

if ($method === 'POST' && $sub === 'reply-ticket') {
    $client = portalCurrentClient($db);
    portalReplyTicket($db, $client, $params);
}

if ($method === 'POST' && $sub === 'close-ticket') {
    $client = portalCurrentClient($db);
    portalCloseTicket($db, $client, (int)($params['ticket_id'] ?? 0));
}

if ($method === 'POST' && $sub === 'upload-proof') {
    $client = portalCurrentClient($db);
    portalUploadProof($db, $client, $params);
}

if ($method === 'POST' && $sub === 'sign-quotation') {
    $client = portalCurrentClient($db);
    portalSignQuotation($db, $client, $params);
}

if ($method === 'POST' && $sub === 'sign-contract') {
    $client = portalCurrentClient($db);
    portalSignContract($db, $client, $params);
}

if ($method === 'POST' && $sub === 'reveal-credential') {
    $client = portalCurrentClient($db);
    portalRevealCredential($db, $client, (int)($params['id'] ?? 0));
}

if ($method === 'POST' && $sub === 'change-password') {
    $client = portalCurrentClient($db);
    $current = (string)($params['current_password'] ?? '');
    $new = (string)($params['new_password'] ?? '');

    if (strlen($new) < 8) {
        errorResponse('Kata sandi baru minimal 8 karakter', 422);
    }
    $row = $db->fetch("SELECT portal_password FROM clients WHERE id = ?", [(int)$client['id']]);
    if (!$row || !password_verify($current, (string)$row['portal_password'])) {
        errorResponse('Kata sandi saat ini tidak sesuai', 422);
    }
    if (hash_equals($current, $new)) {
        errorResponse('Kata sandi baru harus berbeda dari kata sandi saat ini', 422);
    }

    $db->execute("UPDATE clients SET portal_password = ? WHERE id = ?", [password_hash($new, PASSWORD_DEFAULT), (int)$client['id']]);
    logActivity('portal.password', 'clients', (int)$client['id'], null, [
        'keterangan' => "Klien {$client['nama_perusahaan']} mengganti kata sandi portal",
        'sumber' => 'portal_pwa'
    ]);
    successResponse(null, 'Kata sandi berhasil diperbarui');
}

errorResponse('Endpoint portal tidak ditemukan', 404);
