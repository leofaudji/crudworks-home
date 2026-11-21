<?php
declare(strict_types=1);

// KnowledgeBaseController.php — Panduan Penggunaan & SOP untuk Klien

require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../middleware/rbac.php';

authCheck();
$db = Database::getInstance();
$userId = (int)($_SESSION['user_id'] ?? 1);

if ($method === 'GET' && $id && is_numeric($id)) {
    checkPermission('maintenance.view');
    $row = $db->fetch(
        "SELECT kb.*, c.nama_perusahaan as client_nama, p.nama_project
         FROM knowledge_base kb
         LEFT JOIN clients c ON kb.client_id = c.id
         LEFT JOIN projects p ON kb.project_id = p.id
         WHERE kb.id = ?",
        [(int)$id]
    );
    if (!$row) errorResponse('Artikel panduan tidak ditemukan', 404);
    successResponse($row);
}

if ($method === 'GET') {
    checkPermission('maintenance.view');
    $where = ['1=1'];
    $binds = [];
    if (!empty($params['kategori'])) {
        $where[] = 'kb.kategori = ?';
        $binds[] = $params['kategori'];
    }
    if (!empty($params['client_id'])) {
        $where[] = '(kb.client_id = ? OR kb.client_id IS NULL)';
        $binds[] = (int)$params['client_id'];
    }
    if (!empty($params['search'])) {
        $s = '%' . trim((string)$params['search']) . '%';
        $where[] = '(kb.judul LIKE ? OR kb.konten LIKE ?)';
        array_push($binds, $s, $s);
    }

    $rows = $db->fetchAll(
        "SELECT kb.*, c.nama_perusahaan as client_nama, p.nama_project, u.nama_lengkap as penulis
         FROM knowledge_base kb
         LEFT JOIN clients c ON kb.client_id = c.id
         LEFT JOIN projects p ON kb.project_id = p.id
         LEFT JOIN users u ON kb.created_by = u.id
         WHERE " . implode(' AND ', $where) . "
         ORDER BY kb.updated_at DESC, kb.id DESC",
        $binds
    );
    successResponse($rows);
}

if ($method === 'POST') {
    checkPermission('maintenance.manage');
    $editId = !empty($params['id']) && is_numeric($params['id']) ? (int)$params['id'] : null;
    $clientId = !empty($params['client_id']) && is_numeric($params['client_id']) ? (int)$params['client_id'] : null;
    $projectId = !empty($params['project_id']) && is_numeric($params['project_id']) ? (int)$params['project_id'] : null;
    $kategori = in_array($params['kategori'] ?? '', ['panduan', 'faq', 'sop', 'video'], true) ? $params['kategori'] : 'panduan';
    $judul = trim((string)($params['judul'] ?? ''));
    $konten = trim((string)($params['konten'] ?? ''));
    $isPublished = isset($params['is_published']) ? (!empty($params['is_published']) ? 1 : 0) : 1;

    if ($judul === '' || $konten === '') {
        errorResponse('Judul dan isi panduan wajib diisi', 422);
    }

    if ($editId) {
        $existing = $db->fetch("SELECT id FROM knowledge_base WHERE id = ?", [$editId]);
        if (!$existing) errorResponse('Artikel tidak ditemukan', 404);

        $db->execute(
            "UPDATE knowledge_base SET client_id = ?, project_id = ?, kategori = ?, judul = ?, konten = ?, is_published = ?, updated_at = NOW() WHERE id = ?",
            [$clientId, $projectId, $kategori, $judul, $konten, $isPublished, $editId]
        );
        logActivity('kb.update', 'knowledge_base', $editId, null, ['keterangan' => "Memperbarui panduan: {$judul}"]);
        successResponse(['id' => $editId], 'Panduan berhasil diperbarui');
    }

    $newId = (int)$db->insert(
        "INSERT INTO knowledge_base (client_id, project_id, kategori, judul, konten, is_published, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
        [$clientId, $projectId, $kategori, $judul, $konten, $isPublished, $userId]
    );
    logActivity('kb.create', 'knowledge_base', $newId, null, ['keterangan' => "Menambahkan panduan baru: {$judul}"]);
    successResponse(['id' => $newId], 'Panduan berhasil ditambahkan');
}

if ($method === 'DELETE' && $id && is_numeric($id)) {
    checkPermission('maintenance.manage');
    $existing = $db->fetch("SELECT id, judul FROM knowledge_base WHERE id = ?", [(int)$id]);
    if (!$existing) errorResponse('Artikel tidak ditemukan', 404);
    $db->execute("DELETE FROM knowledge_base WHERE id = ?", [(int)$id]);
    logActivity('kb.delete', 'knowledge_base', (int)$id, null, ['keterangan' => "Menghapus panduan: {$existing['judul']}"]);
    successResponse(null, 'Panduan berhasil dihapus');
}

errorResponse('Aksi tidak dikenali', 400);
