<?php
declare(strict_types=1);

require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../middleware/rbac.php';

$db = Database::getInstance();
authCheck();

// 1. Detail Tiket + Riwayat Balasan
if ($method === 'GET' && $id && is_numeric($id)) {
    checkPermission('maintenance.view');
    $ticket = $db->fetch(
        "SELECT t.*, c.nama_perusahaan as client_nama, c.kode_klien, c.telepon as client_telepon,
                p.nama_project, p.kode_project, ms.nama_aset, ms.domain_name
         FROM client_tickets t
         JOIN clients c ON t.client_id = c.id
         LEFT JOIN projects p ON t.project_id = p.id
         LEFT JOIN maintenance_sla ms ON t.maintenance_id = ms.id
         WHERE t.id = ?",
        [(int)$id]
    );
    if (!$ticket) errorResponse('Tiket gangguan tidak ditemukan', 404);

    $replies = $db->fetchAll(
        "SELECT id, sender_type, sender_name, user_id, pesan, lampiran_json, created_at
         FROM client_ticket_replies
         WHERE ticket_id = ?
         ORDER BY id ASC",
        [(int)$id]
    );

    successResponse(['ticket' => $ticket, 'replies' => $replies]);
}

// 2. Balas Tiket oleh Tim Admin/Teknis
if ($method === 'POST' && $id && is_numeric($id) && $action === 'reply') {
    checkPermission('maintenance.manage');
    $pesan = trim((string)($params['pesan'] ?? ''));
    $nextStatus = trim((string)($params['status'] ?? 'menunggu_klien'));
    $savedImgs = portalSaveTicketImages(is_array($params['lampiran'] ?? null) ? $params['lampiran'] : []);
    $lampiranJson = !empty($savedImgs) ? json_encode($savedImgs, JSON_UNESCAPED_UNICODE) : null;
    if ($pesan === '' && empty($savedImgs)) errorResponse('Pesan balasan atau lampiran gambar wajib diisi', 422);

    $ticket = $db->fetch("SELECT * FROM client_tickets WHERE id = ?", [(int)$id]);
    if (!$ticket) errorResponse('Tiket tidak ditemukan', 404);

    $validSt = ['terbuka', 'diproses', 'menunggu_klien', 'selesai', 'ditutup'];
    if (!in_array($nextStatus, $validSt, true)) $nextStatus = 'menunggu_klien';

    $senderName = $_SESSION['nama_lengkap'] ?? 'Tim Teknis CRUDWorks';
    $userId = (int)($_SESSION['user_id'] ?? 0) ?: null;

    $db->insert(
        "INSERT INTO client_ticket_replies (ticket_id, sender_type, sender_name, user_id, pesan, lampiran_json) VALUES (?, 'admin', ?, ?, ?, ?)",
        [(int)$id, $senderName, $userId, $pesan, $lampiranJson]
    );

    $resolvedSql = in_array($nextStatus, ['selesai', 'ditutup'], true) ? ", resolved_at = COALESCE(resolved_at, NOW())" : ", resolved_at = NULL";
    $db->execute("UPDATE client_tickets SET status = ? {$resolvedSql} WHERE id = ?", [$nextStatus, (int)$id]);

    logActivity('ticket.reply', 'client_tickets', (int)$id, null, ['keterangan' => "Membalas tiket {$ticket['nomor_tiket']} ({$nextStatus})"]);
    successResponse(null, 'Balasan tiket berhasil dikirim ke klien');
}

// 3. Ubah Status Tiket Cepat
if ($method === 'POST' && $id && is_numeric($id) && $action === 'status') {
    checkPermission('maintenance.manage');
    $nextStatus = trim((string)($params['status'] ?? ''));
    $validSt = ['terbuka', 'diproses', 'menunggu_klien', 'selesai', 'ditutup'];
    if (!in_array($nextStatus, $validSt, true)) errorResponse('Status tiket tidak valid', 422);

    $ticket = $db->fetch("SELECT * FROM client_tickets WHERE id = ?", [(int)$id]);
    if (!$ticket) errorResponse('Tiket tidak ditemukan', 404);

    $resolvedSql = in_array($nextStatus, ['selesai', 'ditutup'], true) ? ", resolved_at = COALESCE(resolved_at, NOW())" : ", resolved_at = NULL";
    $db->execute("UPDATE client_tickets SET status = ? {$resolvedSql} WHERE id = ?", [$nextStatus, (int)$id]);
    logActivity('ticket.status', 'client_tickets', (int)$id, null, ['keterangan' => "Mengubah status tiket {$ticket['nomor_tiket']} menjadi {$nextStatus}"]);

    successResponse(null, 'Status tiket diperbarui');
}

// 3b. Konversi 1-Klik: Tiket -> Tugas Kanban Proyek
if ($method === 'POST' && $id && is_numeric($id) && $action === 'convert-task') {
    checkPermission('project.edit');
    $ticket = $db->fetch("SELECT * FROM client_tickets WHERE id = ?", [(int)$id]);
    if (!$ticket) errorResponse('Tiket tidak ditemukan', 404);

    $projectId = (int)($params['project_id'] ?? $ticket['project_id'] ?? 0);
    if ($projectId <= 0) errorResponse('Proyek target wajib dipilih untuk membuat tugas Kanban', 422);

    $project = $db->fetch("SELECT id, nama_project FROM projects WHERE id = ?", [$projectId]);
    if (!$project) errorResponse('Proyek tidak ditemukan', 404);

    $prioMap = ['kritis' => 'mendesak', 'tinggi' => 'tinggi', 'sedang' => 'sedang', 'rendah' => 'rendah'];
    $taskPrio = $prioMap[$ticket['prioritas']] ?? 'sedang';
    $estimasiJam = max(0.5, (float)($params['estimasi_jam'] ?? 2));
    $judulTugas = "[{$ticket['nomor_tiket']}] {$ticket['judul']}";
    $deskPlain = trim(html_entity_decode(strip_tags(str_replace(['<br>', '<br/>', '</p>'], "\n", (string)$ticket['deskripsi']))));
    $userId = (int)($_SESSION['user_id'] ?? 0) ?: null;

    $taskId = $db->insert(
        "INSERT INTO project_tasks (project_id, judul_tugas, deskripsi, prioritas, status, estimasi_jam, created_by)
         VALUES (?, ?, ?, ?, 'todo', ?, ?)",
        [$projectId, mb_substr($judulTugas, 0, 200), $deskPlain ?: null, $taskPrio, $estimasiJam, $userId]
    );

    if ($ticket['status'] === 'terbuka') {
        $db->execute("UPDATE client_tickets SET status = 'diproses', project_id = COALESCE(project_id, ?) WHERE id = ?", [$projectId, (int)$id]);
    }

    logActivity('ticket.convert_task', 'project_tasks', (int)$taskId, null, [
        'keterangan' => "Mengonversi tiket {$ticket['nomor_tiket']} menjadi tugas Kanban pada {$project['nama_project']}"
    ]);

    successResponse(['task_id' => (int)$taskId, 'project_id' => $projectId, 'nama_project' => $project['nama_project']], "Tiket berhasil dimasukkan ke Papan Kanban ({$project['nama_project']})", 201);
}

// 3c. Konversi 1-Klik: Tiket -> Faktur Tagihan Tambahan
if ($method === 'POST' && $id && is_numeric($id) && $action === 'convert-invoice') {
    checkPermission('invoice.create');
    $ticket = $db->fetch("SELECT * FROM client_tickets WHERE id = ?", [(int)$id]);
    if (!$ticket) errorResponse('Tiket tidak ditemukan', 404);

    $nominal = (float)($params['nominal'] ?? 0);
    $deskripsiItem = trim((string)($params['deskripsi'] ?? "[{$ticket['nomor_tiket']}] Penanganan / Fitur Tambahan: {$ticket['judul']}"));
    $dueDays = max(1, (int)($params['jatuh_tempo_hari'] ?? 14));

    if ($nominal <= 0) errorResponse('Nominal tagihan tambahan harus lebih dari 0', 422);
    if ($deskripsiItem === '') errorResponse('Deskripsi item faktur wajib diisi', 422);

    $nomorInvoice = generateInvoiceNo('INV-');
    $publicToken = bin2hex(random_bytes(24));
    $tanggalInv = date('Y-m-d');
    $tanggalTempo = date('Y-m-d', strtotime("+{$dueDays} days"));
    $clientId = (int)$ticket['client_id'];
    $projectId = !empty($ticket['project_id']) ? (int)$ticket['project_id'] : null;
    $userId = (int)($_SESSION['user_id'] ?? 1);

    $pdo = $db->getPdo();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO invoices (nomor_invoice, public_token, client_id, project_id, tanggal_invoice, tanggal_jatuh_tempo,
                                   subtotal, diskon_tipe, diskon_nilai, pajak_persen, pajak_nominal, total_tagihan, total_dibayar,
                                   sisa_tagihan, status, catatan_klien, catatan_internal, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'nominal', 0.00, 0.00, 0.00, ?, 0.00, ?, 'dikirim', ?, ?, ?)"
        );
        $stmt->execute([
            $nomorInvoice, $publicToken, $clientId, $projectId, $tanggalInv, $tanggalTempo,
            $nominal, $nominal, $nominal,
            "Tagihan tambahan dari tiket dukungan {$ticket['nomor_tiket']}.",
            "Dikonversi dari tiket {$ticket['nomor_tiket']}",
            $userId
        ]);
        $invoiceId = (int)$pdo->lastInsertId();

        $pdo->prepare(
            "INSERT INTO invoice_items (invoice_id, service_id, deskripsi, kuantitas, harga_satuan, total_harga)
             VALUES (?, NULL, ?, 1, ?, ?)"
        )->execute([$invoiceId, $deskripsiItem, $nominal, $nominal]);

        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        errorResponse('Gagal membuat faktur tambahan: ' . $e->getMessage(), 500);
    }

    clearCache(['invoices', 'dashboard']);
    logActivity('ticket.convert_invoice', 'invoices', $invoiceId, null, [
        'keterangan' => "Mengonversi tiket {$ticket['nomor_tiket']} menjadi faktur tambahan {$nomorInvoice}"
    ]);

    successResponse(['invoice_id' => $invoiceId, 'nomor_invoice' => $nomorInvoice], "Faktur tambahan {$nomorInvoice} berhasil diterbitkan", 201);
}

// 4. Hapus Tiket
if ($method === 'DELETE' && $id && is_numeric($id)) {
    checkPermission('maintenance.manage');
    $ticket = $db->fetch("SELECT nomor_tiket FROM client_tickets WHERE id = ?", [(int)$id]);
    if (!$ticket) errorResponse('Tiket tidak ditemukan', 404);
    $db->execute("DELETE FROM client_tickets WHERE id = ?", [(int)$id]);
    logActivity('delete', 'client_tickets', (int)$id, $ticket);
    successResponse(null, 'Tiket berhasil dihapus');
}

// 5. Daftar Tiket Gangguan (Admin ERP)
if ($method === 'GET') {
    checkPermission('maintenance.view');
    $page = max(1, (int)($params['page'] ?? 1));
    $perPage = max(1, min(100, (int)($params['per_page'] ?? PER_PAGE)));
    $status = trim((string)($params['status'] ?? ''));
    $search = trim((string)($params['search'] ?? ''));

    $where = ['1=1'];
    $binds = [];
    if ($status !== '') {
        $where[] = 't.status = ?';
        $binds[] = $status;
    }
    if ($search !== '') {
        $where[] = '(t.nomor_tiket LIKE ? OR t.judul LIKE ? OR c.nama_perusahaan LIKE ?)';
        $term = '%' . $search . '%';
        array_push($binds, $term, $term, $term);
    }

    $whereSql = implode(' AND ', $where);
    $countQuery = "SELECT COUNT(*) FROM client_tickets t JOIN clients c ON t.client_id = c.id WHERE {$whereSql}";
    $query = "SELECT t.*, c.nama_perusahaan as client_nama, c.kode_klien,
                     p.nama_project, ms.nama_aset,
                     (SELECT COUNT(*) FROM client_ticket_replies r WHERE r.ticket_id = t.id) as reply_count
              FROM client_tickets t
              JOIN clients c ON t.client_id = c.id
              LEFT JOIN projects p ON t.project_id = p.id
              LEFT JOIN maintenance_sla ms ON t.maintenance_id = ms.id
              WHERE {$whereSql}
              ORDER BY FIELD(t.status, 'terbuka', 'diproses', 'menunggu_klien', 'selesai', 'ditutup'), FIELD(t.prioritas, 'kritis', 'tinggi', 'sedang', 'rendah'), t.id DESC";

    $offset = ($page - 1) * $perPage;
    $total = (int)$db->count($countQuery, $binds);
    $items = $db->fetchAll($query . " LIMIT {$perPage} OFFSET {$offset}", $binds);

    $slaTarget = ['kritis' => 4, 'tinggi' => 12, 'sedang' => 24, 'rendah' => 48];
    $nowTs = time();
    foreach ($items as &$item) {
        $targetH = $slaTarget[$item['prioritas']] ?? 24;
        $createdTs = strtotime((string)($item['created_at'] ?? 'now')) ?: $nowTs;
        $endTs = !empty($item['resolved_at']) ? (strtotime((string)$item['resolved_at']) ?: $nowTs) : $nowTs;
        $elapsedH = round(max(0, ($endTs - $createdTs) / 3600), 1);
        $isClosed = in_array($item['status'], ['selesai', 'ditutup'], true);
        $slaStatus = $elapsedH > $targetH
            ? 'melewati_sla'
            : (!$isClosed && $elapsedH >= ($targetH * 0.75) ? 'mendekati' : 'aman');
        $item['sla_hours'] = $targetH;
        $item['sla_elapsed_hours'] = $elapsedH;
        $item['sla_status'] = $slaStatus;
    }
    unset($item);

    $stats = $db->fetch(
        "SELECT COUNT(CASE WHEN status = 'terbuka' THEN 1 END) as terbuka,
                COUNT(CASE WHEN status = 'diproses' THEN 1 END) as diproses,
                COUNT(CASE WHEN status = 'menunggu_klien' THEN 1 END) as menunggu_klien,
                COUNT(CASE WHEN status IN ('selesai', 'ditutup') THEN 1 END) as selesai
         FROM client_tickets"
    );

    paginatedResponse($items, $total, $page, $perPage, ['stats' => $stats]);
}

errorResponse('Metode tidak didukung', 405);
