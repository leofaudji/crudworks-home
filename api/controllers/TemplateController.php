<?php
declare(strict_types=1);

// TemplateController.php - Pustaka Template Dokumen (SPH & SPK) & Klausul Dinamis
authCheck();
$db = Database::getInstance();

if ($method === 'GET') {
    checkPermission(['quotation.view', 'settings.edit']);

    $jenis = trim((string)($params['jenis'] ?? ''));
    $status = trim((string)($params['status'] ?? ''));
    $search = trim((string)($params['search'] ?? ''));

    $where = ['1=1'];
    $args = [];

    if (in_array($jenis, ['sph', 'spk'], true)) {
        $where[] = 'jenis = ?';
        $args[] = $jenis;
    }
    if (in_array($status, ['aktif', 'nonaktif'], true)) {
        $where[] = 'status = ?';
        $args[] = $status;
    }
    if ($search !== '') {
        $where[] = '(nama_template LIKE ? OR kategori LIKE ? OR judul_default LIKE ?)';
        $like = "%$search%";
        $args[] = $like;
        $args[] = $like;
        $args[] = $like;
    }

    $rows = $db->fetchAll(
        "SELECT * FROM document_templates
         WHERE " . implode(' AND ', $where) . "
         ORDER BY is_default DESC, jenis ASC, id ASC",
        $args
    );
    successResponse($rows);
}

if ($method === 'POST') {
    checkPermission('settings.edit');
    requireParams($params, ['nama_template', 'jenis']);

    $namaTemplate = trim((string)$params['nama_template']);
    $jenis = validateEnum($params['jenis'], ['sph', 'spk'], 'Jenis template');
    $kategori = trim((string)($params['kategori'] ?? 'Umum')) ?: 'Umum';
    $judulDefault = trim((string)($params['judul_default'] ?? '')) ?: null;
    $salamPembuka = trim((string)($params['salam_pembuka'] ?? '')) ?: null;
    $ruangLingkup = trim((string)($params['ruang_lingkup_fitur'] ?? '')) ?: null;
    $timeline = trim((string)($params['timeline_pengerjaan'] ?? '')) ?: null;
    $isiPasal = trim((string)($params['isi_pasal'] ?? '')) ?: null;
    $garansiHari = max(0, (int)($params['garansi_hari'] ?? 30));
    $isDefault = !empty($params['is_default']) ? 1 : 0;
    $status = validateEnum($params['status'] ?? 'aktif', ['aktif', 'nonaktif'], 'Status template');

    $pdo = $db->getPdo();
    $pdo->beginTransaction();
    try {
        if ($isDefault === 1) {
            $pdo->prepare("UPDATE document_templates SET is_default = 0 WHERE jenis = ?")->execute([$jenis]);
        }
        $stmt = $pdo->prepare(
            "INSERT INTO document_templates
             (nama_template, jenis, kategori, judul_default, salam_pembuka, ruang_lingkup_fitur, timeline_pengerjaan, isi_pasal, garansi_hari, is_default, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $namaTemplate, $jenis, $kategori, $judulDefault,
            $salamPembuka, $ruangLingkup, $timeline, $isiPasal,
            $garansiHari, $isDefault, $status
        ]);
        $newId = (int)$pdo->lastInsertId();
        $pdo->commit();

        clearCache(['templates']);
        logActivity('create', 'document_templates', $newId, null, ['nama_template' => $namaTemplate, 'jenis' => $jenis]);
        successResponse(['id' => $newId], 'Template dokumen berhasil ditambahkan', 201);
    } catch (\Throwable $e) {
        $pdo->rollBack();
        errorResponse('Gagal menyimpan template dokumen', 500);
    }
}

if ($method === 'PUT') {
    checkPermission('settings.edit');
    if (!$id || !is_numeric($id)) {
        errorResponse('ID template tidak valid', 400);
    }
    $tplId = (int)$id;
    $existing = $db->fetch("SELECT * FROM document_templates WHERE id = ? LIMIT 1", [$tplId]);
    if (!$existing) {
        errorResponse('Template dokumen tidak ditemukan', 404);
    }

    requireParams($params, ['nama_template', 'jenis']);
    $namaTemplate = trim((string)$params['nama_template']);
    $jenis = validateEnum($params['jenis'], ['sph', 'spk'], 'Jenis template');
    $kategori = trim((string)($params['kategori'] ?? 'Umum')) ?: 'Umum';
    $judulDefault = trim((string)($params['judul_default'] ?? '')) ?: null;
    $salamPembuka = trim((string)($params['salam_pembuka'] ?? '')) ?: null;
    $ruangLingkup = trim((string)($params['ruang_lingkup_fitur'] ?? '')) ?: null;
    $timeline = trim((string)($params['timeline_pengerjaan'] ?? '')) ?: null;
    $isiPasal = trim((string)($params['isi_pasal'] ?? '')) ?: null;
    $garansiHari = max(0, (int)($params['garansi_hari'] ?? 30));
    $isDefault = !empty($params['is_default']) ? 1 : 0;
    $status = validateEnum($params['status'] ?? 'aktif', ['aktif', 'nonaktif'], 'Status template');

    $pdo = $db->getPdo();
    $pdo->beginTransaction();
    try {
        if ($isDefault === 1) {
            $pdo->prepare("UPDATE document_templates SET is_default = 0 WHERE jenis = ? AND id != ?")->execute([$jenis, $tplId]);
        }
        $stmt = $pdo->prepare(
            "UPDATE document_templates
             SET nama_template = ?, jenis = ?, kategori = ?, judul_default = ?,
                 salam_pembuka = ?, ruang_lingkup_fitur = ?, timeline_pengerjaan = ?,
                 isi_pasal = ?, garansi_hari = ?, is_default = ?, status = ?
             WHERE id = ?"
        );
        $stmt->execute([
            $namaTemplate, $jenis, $kategori, $judulDefault,
            $salamPembuka, $ruangLingkup, $timeline, $isiPasal,
            $garansiHari, $isDefault, $status, $tplId
        ]);
        $pdo->commit();

        clearCache(['templates']);
        logActivity('update', 'document_templates', $tplId, null, ['nama_template' => $namaTemplate, 'jenis' => $jenis]);
        successResponse(['id' => $tplId], 'Template dokumen berhasil diperbarui');
    } catch (\Throwable $e) {
        $pdo->rollBack();
        errorResponse('Gagal memperbarui template dokumen', 500);
    }
}

if ($method === 'DELETE') {
    checkPermission('settings.edit');
    if (!$id || !is_numeric($id)) {
        errorResponse('ID template tidak valid', 400);
    }
    $tplId = (int)$id;
    $existing = $db->fetch("SELECT id, nama_template FROM document_templates WHERE id = ? LIMIT 1", [$tplId]);
    if (!$existing) {
        errorResponse('Template dokumen tidak ditemukan', 404);
    }

    $db->execute("DELETE FROM document_templates WHERE id = ?", [$tplId]);
    clearCache(['templates']);
    logActivity('delete', 'document_templates', $tplId, $existing, null);
    successResponse(null, 'Template dokumen berhasil dihapus');
}

errorResponse('Metode tidak didukung', 405);
