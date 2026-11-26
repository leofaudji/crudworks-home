<?php
declare(strict_types=1);

// IntegrationController.php — Manajemen API Key & Webhook Eksternal (Poin 7)
authCheck();
checkPermission('settings.edit');
$db = Database::getInstance();

if ($resource === 'api-keys') {
    if ($method === 'GET') {
        $keys = $db->fetchAll(
            "SELECT k.id, k.nama, k.key_prefix, k.scopes, k.is_active, k.last_used_at, k.created_at, u.nama_lengkap as created_by_name
             FROM api_keys k
             LEFT JOIN users u ON k.created_by = u.id
             ORDER BY k.id DESC"
        );
        successResponse($keys);
    }

    if ($method === 'POST') {
        $nama = trim((string)($params['nama'] ?? ''));
        $scopes = trim((string)($params['scopes'] ?? 'read,write')) ?: 'read';
        if ($nama === '') errorResponse('Nama API Key wajib diisi', 422);

        $rawKey = 'cw_live_' . bin2hex(random_bytes(20));
        $prefix = substr($rawKey, 0, 14) . '…';
        $hash = hash('sha256', $rawKey);
        $userId = (int)($_SESSION['user_id'] ?? 0) ?: null;

        $newId = $db->insert(
            "INSERT INTO api_keys (nama, key_prefix, key_hash, scopes, is_active, created_by) VALUES (?, ?, ?, ?, 1, ?)",
            [$nama, $prefix, $hash, $scopes, $userId]
        );

        logActivity('api_key.create', 'api_keys', (int)$newId, null, ['nama' => $nama]);
        successResponse([
            'id' => (int)$newId,
            'nama' => $nama,
            'key_prefix' => $prefix,
            'raw_key' => $rawKey,
        ], 'API Key baru berhasil dibuat. Salin sekarang karena hanya ditampilkan sekali.', 201);
    }

    if ($method === 'DELETE' && $id && is_numeric($id)) {
        $db->execute("DELETE FROM api_keys WHERE id = ?", [(int)$id]);
        logActivity('api_key.delete', 'api_keys', (int)$id);
        successResponse(null, 'API Key berhasil dicabut');
    }

    errorResponse('Metode API Key tidak didukung', 405);
}

if ($resource === 'webhooks') {
    if ($method === 'GET') {
        $hooks = $db->fetchAll("SELECT id, nama, target_url, events, is_active, created_at FROM webhooks ORDER BY id DESC");
        $logs = $db->fetchAll(
            "SELECT wl.*, w.nama as webhook_nama
             FROM webhook_logs wl
             JOIN webhooks w ON wl.webhook_id = w.id
             ORDER BY wl.id DESC
             LIMIT 25"
        );
        successResponse(['webhooks' => $hooks, 'logs' => $logs]);
    }

    if ($method === 'POST' && $id && is_numeric($id) && $action === 'test') {
        $hook = $db->fetch("SELECT * FROM webhooks WHERE id = ?", [(int)$id]);
        if (!$hook) errorResponse('Webhook tidak ditemukan', 404);
        dispatchWebhook('webhook.test', [
            'webhook_id' => (int)$hook['id'],
            'nama' => $hook['nama'],
            'message' => 'Test ping dari CRUDWorks ERP',
        ]);
        successResponse(null, 'Test ping webhook telah dikirim. Cek log pengiriman di bawah.');
    }

    if ($method === 'POST') {
        $nama = trim((string)($params['nama'] ?? ''));
        $targetUrl = trim((string)($params['target_url'] ?? ''));
        $events = trim((string)($params['events'] ?? 'invoice.paid,ticket.created,project.updated')) ?: '*';
        $secret = trim((string)($params['secret'] ?? '')) ?: bin2hex(random_bytes(16));
        $isActive = isset($params['is_active']) ? (!empty($params['is_active']) ? 1 : 0) : 1;

        if ($nama === '' || !filter_var($targetUrl, FILTER_VALIDATE_URL)) {
            errorResponse('Nama webhook dan URL target yang valid wajib diisi', 422);
        }

        $newId = $db->insert(
            "INSERT INTO webhooks (nama, target_url, secret, events, is_active) VALUES (?, ?, ?, ?, ?)",
            [$nama, $targetUrl, $secret, $events, $isActive]
        );
        logActivity('webhook.create', 'webhooks', (int)$newId, null, ['nama' => $nama, 'target_url' => $targetUrl]);
        successResponse(['id' => (int)$newId, 'secret' => $secret], 'Webhook berhasil ditambahkan', 201);
    }

    if ($method === 'DELETE' && $id && is_numeric($id)) {
        $db->execute("DELETE FROM webhooks WHERE id = ?", [(int)$id]);
        logActivity('webhook.delete', 'webhooks', (int)$id);
        successResponse(null, 'Webhook berhasil dihapus');
    }

    errorResponse('Metode Webhook tidak didukung', 405);
}
