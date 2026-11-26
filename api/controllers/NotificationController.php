<?php
declare(strict_types=1);

// NotificationController.php — Pusat Notifikasi In-App
authCheck();
$db = Database::getInstance();

if ($method === 'GET') {
    $limit = max(5, min(50, (int)($params['limit'] ?? 20)));
    $items = $db->fetchAll(
        "SELECT id, judul, pesan, tautan, tipe, is_read, created_at
         FROM notifications
         ORDER BY is_read ASC, id DESC
         LIMIT {$limit}"
    );
    $unread = (int)($db->fetch("SELECT COUNT(*) as cnt FROM notifications WHERE is_read = 0")['cnt'] ?? 0);
    successResponse([
        'items' => $items,
        'unread_count' => $unread,
    ]);
}

if ($method === 'POST' && $id === 'read') {
    if (!empty($params['all'])) {
        $db->execute("UPDATE notifications SET is_read = 1 WHERE is_read = 0");
        successResponse(null, 'Semua notifikasi ditandai sudah dibaca');
    }
    $notifId = (int)($params['id'] ?? 0);
    if ($notifId > 0) {
        $db->execute("UPDATE notifications SET is_read = 1 WHERE id = ?", [$notifId]);
        successResponse(null, 'Notifikasi ditandai sudah dibaca');
    }
    errorResponse('ID notifikasi tidak valid', 422);
}

if ($method === 'DELETE' && $id && is_numeric($id)) {
    $db->execute("DELETE FROM notifications WHERE id = ?", [(int)$id]);
    successResponse(null, 'Notifikasi dihapus');
}

errorResponse('Metode tidak didukung', 405);
