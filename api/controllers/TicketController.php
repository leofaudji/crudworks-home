<?php
declare(strict_types=1);

require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../middleware/rbac.php';

$db = Database::getInstance();
authCheck();

// 1. Detail Tiket + Riwayat Balasan + Log Aktivitas Support
if ($method === 'GET' && $id && is_numeric($id)) {
    checkPermission('maintenance.view');
    $ticket = $db->fetch(
        "SELECT t.*, c.nama_perusahaan as client_nama, c.kode_klien, c.telepon as client_telepon,
                p.nama_project, p.kode_project, ms.nama_aset, ms.domain_name,
                q.nomor_penawaran, inv.nomor_invoice
         FROM client_tickets t
         JOIN clients c ON t.client_id = c.id
         LEFT JOIN projects p ON t.project_id = p.id
         LEFT JOIN maintenance_sla ms ON t.maintenance_id = ms.id
         LEFT JOIN quotations q ON t.quotation_id = q.id
         LEFT JOIN invoices inv ON t.invoice_id = inv.id
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

    $logs = $db->fetchAll(
        "SELECT id, user_id, actor_name, tipe_aktivitas, durasi_menit, is_billable, ringkasan, created_at
         FROM client_ticket_logs
         WHERE ticket_id = ?
         ORDER BY id DESC",
        [(int)$id]
    );

    successResponse(['ticket' => $ticket, 'replies' => $replies, 'logs' => $logs]);
}

// 1b. Buat Tiket Baru dari Admin (WA / Telepon / Email / Internal)
if ($method === 'POST' && !$id) {
    checkPermission('maintenance.manage');
    $clientId = (int)($params['client_id'] ?? 0);
    $projectId = !empty($params['project_id']) ? (int)$params['project_id'] : null;
    $maintenanceId = !empty($params['maintenance_id']) ? (int)$params['maintenance_id'] : null;
    $judul = trim((string)($params['judul'] ?? ''));
    $deskripsi = trim((string)($params['deskripsi'] ?? ''));
    $kategori = trim((string)($params['kategori'] ?? 'gangguan_sistem'));
    $prioritas = trim((string)($params['prioritas'] ?? 'sedang'));
    $sumberLaporan = trim((string)($params['sumber_laporan'] ?? 'whatsapp'));
    $cakupanBiaya = trim((string)($params['cakupan_biaya'] ?? 'sla_gratis'));
    $pelaporNama = trim((string)($params['pelapor_nama'] ?? ''));
    $savedImgs = portalSaveTicketImages(is_array($params['lampiran'] ?? null) ? $params['lampiran'] : []);
    $lampiranJson = !empty($savedImgs) ? json_encode($savedImgs, JSON_UNESCAPED_UNICODE) : null;

    if ($clientId <= 0 || $judul === '') {
        errorResponse('Pelanggan dan subjek tiket wajib diisi', 422);
    }

    $client = $db->fetch("SELECT id, nama_perusahaan, nama_pic FROM clients WHERE id = ?", [$clientId]);
    if (!$client) errorResponse('Pelanggan tidak ditemukan', 404);

    $validKat = ['gangguan_sistem', 'domain_ssl', 'perbaikan_bug', 'permintaan_fitur', 'billing', 'lainnya'];
    if (!in_array($kategori, $validKat, true)) $kategori = 'gangguan_sistem';
    $validPrio = ['rendah', 'sedang', 'tinggi', 'kritis'];
    if (!in_array($prioritas, $validPrio, true)) $prioritas = 'sedang';
    $validSumber = ['portal', 'whatsapp', 'telepon', 'email', 'internal'];
    if (!in_array($sumberLaporan, $validSumber, true)) $sumberLaporan = 'whatsapp';
    $validScope = ['sla_gratis', 'garansi', 'berbayar'];
    if (!in_array($cakupanBiaya, $validScope, true)) $cakupanBiaya = 'sla_gratis';

    if ($pelaporNama === '') {
        $pelaporNama = $client['nama_pic'] ?: $client['nama_perusahaan'];
    }
    if ($deskripsi === '') {
        $deskripsi = $judul;
    }

    $nomorTiket = generateDocNumber('client_tickets', 'nomor_tiket', 'TKT-', 4, true, '-');

    $slaResolveMap = ['kritis' => 4, 'tinggi' => 12, 'sedang' => 24, 'rendah' => 48];
    $slaRespMap = ['kritis' => 1, 'tinggi' => 2, 'sedang' => 4, 'rendah' => 8];
    $resolveDue = date('Y-m-d H:i:s', strtotime('+' . ($slaResolveMap[$prioritas] ?? 24) . ' hours'));
    $respDue = date('Y-m-d H:i:s', strtotime('+' . ($slaRespMap[$prioritas] ?? 4) . ' hours'));
    $userId = (int)($_SESSION['user_id'] ?? 0) ?: null;
    $actorName = $_SESSION['nama_lengkap'] ?? 'Admin Support';

    $newId = (int)$db->insert(
        "INSERT INTO client_tickets (nomor_tiket, client_id, project_id, maintenance_id, kategori, prioritas, judul, deskripsi, lampiran_json, status, pelapor_nama, sumber_laporan, cakupan_biaya, assigned_to, sla_response_due, sla_resolve_due)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'terbuka', ?, ?, ?, ?, ?, ?)",
        [$nomorTiket, $clientId, $projectId, $maintenanceId, $kategori, $prioritas, mb_substr($judul, 0, 200), $deskripsi, $lampiranJson, mb_substr($pelaporNama, 0, 100), $sumberLaporan, $cakupanBiaya, $userId, $respDue, $resolveDue]
    );

    $db->insert(
        "INSERT INTO client_ticket_logs (ticket_id, user_id, actor_name, tipe_aktivitas, durasi_menit, is_billable, ringkasan)
         VALUES (?, ?, ?, 'komunikasi', 0, ?, ?)",
        [$newId, $userId, $actorName, $cakupanBiaya === 'berbayar' ? 1 : 0, "Tiket dicatat manual dari sumber {$sumberLaporan} (pelapor: {$pelaporNama})."]
    );

    logActivity('ticket.create', 'client_tickets', $newId, null, ['keterangan' => "Mencatat tiket {$nomorTiket} untuk {$client['nama_perusahaan']}"]);
    successResponse(['id' => $newId, 'nomor_tiket' => $nomorTiket], "Tiket {$nomorTiket} berhasil dicatat", 201);
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
    $db->execute("UPDATE client_tickets SET status = ?, first_response_at = COALESCE(first_response_at, NOW()) {$resolvedSql} WHERE id = ?", [$nextStatus, (int)$id]);

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
    $db->execute("UPDATE client_tickets SET status = ?, first_response_at = COALESCE(first_response_at, NOW()) {$resolvedSql} WHERE id = ?", [$nextStatus, (int)$id]);
    logActivity('ticket.status', 'client_tickets', (int)$id, null, ['keterangan' => "Mengubah status tiket {$ticket['nomor_tiket']} menjadi {$nextStatus}"]);

    successResponse(null, 'Status tiket diperbarui');
}

// 3a-2. Ubah Cakupan Biaya Tiket (SLA Gratis / Garansi / Berbayar)
if ($method === 'POST' && $id && is_numeric($id) && $action === 'scope') {
    checkPermission('maintenance.manage');
    $scope = trim((string)($params['cakupan_biaya'] ?? ''));
    if (!in_array($scope, ['sla_gratis', 'garansi', 'berbayar'], true)) {
        errorResponse('Cakupan biaya tidak valid', 422);
    }
    $ticket = $db->fetch("SELECT id, nomor_tiket, cakupan_biaya FROM client_tickets WHERE id = ?", [(int)$id]);
    if (!$ticket) errorResponse('Tiket tidak ditemukan', 404);

    $db->execute("UPDATE client_tickets SET cakupan_biaya = ? WHERE id = ?", [$scope, (int)$id]);
    $userId = (int)($_SESSION['user_id'] ?? 0) ?: null;
    $actorName = $_SESSION['nama_lengkap'] ?? 'Admin Support';
    $labelMap = ['sla_gratis' => 'Termasuk SLA (Gratis)', 'garansi' => 'Garansi Proyek', 'berbayar' => 'Pekerjaan Tambahan Berbayar'];
    $db->insert(
        "INSERT INTO client_ticket_logs (ticket_id, user_id, actor_name, tipe_aktivitas, durasi_menit, is_billable, ringkasan)
         VALUES (?, ?, ?, 'lainnya', 0, ?, ?)",
        [(int)$id, $userId, $actorName, $scope === 'berbayar' ? 1 : 0, 'Mengubah cakupan biaya menjadi: ' . ($labelMap[$scope] ?? $scope)]
    );
    logActivity('ticket.scope', 'client_tickets', (int)$id, null, ['keterangan' => "Mengubah cakupan tiket {$ticket['nomor_tiket']} ke {$scope}"]);
    successResponse(['cakupan_biaya' => $scope], 'Cakupan biaya tiket diperbarui');
}

// 3a-3. Tambah Log Aktivitas Support Internal & Durasi Penanganan
if ($method === 'POST' && $id && is_numeric($id) && $action === 'logs') {
    checkPermission('maintenance.manage');
    $ticket = $db->fetch("SELECT id, nomor_tiket, status, cakupan_biaya FROM client_tickets WHERE id = ?", [(int)$id]);
    if (!$ticket) errorResponse('Tiket tidak ditemukan', 404);

    $tipe = trim((string)($params['tipe_aktivitas'] ?? 'investigasi'));
    if (!in_array($tipe, ['investigasi', 'perbaikan', 'komunikasi', 'deploy', 'konversi', 'lainnya'], true)) {
        $tipe = 'investigasi';
    }
    $durasi = max(0, (int)($params['durasi_menit'] ?? 0));
    $isBillable = !empty($params['is_billable']) ? 1 : 0;
    $ringkasan = trim((string)($params['ringkasan'] ?? ''));
    if ($ringkasan === '') errorResponse('Ringkasan aktivitas support wajib diisi', 422);

    $userId = (int)($_SESSION['user_id'] ?? 0) ?: null;
    $actorName = $_SESSION['nama_lengkap'] ?? 'Tim Teknis CRUDWorks';

    $logId = (int)$db->insert(
        "INSERT INTO client_ticket_logs (ticket_id, user_id, actor_name, tipe_aktivitas, durasi_menit, is_billable, ringkasan)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        [(int)$id, $userId, $actorName, $tipe, $durasi, $isBillable, $ringkasan]
    );

    $totalMenit = (int)($db->fetch("SELECT COALESCE(SUM(durasi_menit), 0) as total FROM client_ticket_logs WHERE ticket_id = ?", [(int)$id])['total'] ?? 0);
    $extraSql = $isBillable ? ", cakupan_biaya = 'berbayar'" : "";
    if ($ticket['status'] === 'terbuka') {
        $extraSql .= ", status = 'diproses'";
    }
    $db->execute("UPDATE client_tickets SET total_durasi_menit = ?, first_response_at = COALESCE(first_response_at, NOW()){$extraSql} WHERE id = ?", [$totalMenit, (int)$id]);

    logActivity('ticket.log', 'client_ticket_logs', $logId, null, ['keterangan' => "Mencatat aktivitas {$tipe} ({$durasi} menit) pada tiket {$ticket['nomor_tiket']}"]);
    successResponse(['log_id' => $logId, 'total_durasi_menit' => $totalMenit], 'Log aktivitas support berhasil dicatat', 201);
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
    $db->execute("UPDATE client_tickets SET invoice_id = ?, cakupan_biaya = 'berbayar' WHERE id = ?", [$invoiceId, (int)$id]);
    $actorName = $_SESSION['nama_lengkap'] ?? 'Admin ERP';
    $db->insert(
        "INSERT INTO client_ticket_logs (ticket_id, user_id, actor_name, tipe_aktivitas, durasi_menit, is_billable, ringkasan)
         VALUES (?, ?, ?, 'konversi', 0, 1, ?)",
        [(int)$id, $userId, $actorName, "Dikonversi menjadi Faktur Tagihan {$nomorInvoice} senilai Rp " . number_format($nominal, 0, ',', '.')]
    );
    logActivity('ticket.convert_invoice', 'invoices', $invoiceId, null, [
        'keterangan' => "Mengonversi tiket {$ticket['nomor_tiket']} menjadi faktur tambahan {$nomorInvoice}"
    ]);

    successResponse(['invoice_id' => $invoiceId, 'nomor_invoice' => $nomorInvoice], "Faktur tambahan {$nomorInvoice} berhasil diterbitkan", 201);
}

// 3d. Konversi 1-Klik: Tiket -> Surat Penawaran Harga (SPH / Quotation)
if ($method === 'POST' && $id && is_numeric($id) && $action === 'convert-quotation') {
    checkPermission('quotation.create');
    $ticket = $db->fetch("SELECT * FROM client_tickets WHERE id = ?", [(int)$id]);
    if (!$ticket) errorResponse('Tiket tidak ditemukan', 404);

    $nominal = (float)($params['nominal'] ?? 0);
    $deskripsiItem = trim((string)($params['deskripsi'] ?? "[{$ticket['nomor_tiket']}] Pengembangan / Penyesuaian: {$ticket['judul']}"));
    $validDays = max(1, (int)($params['berlaku_hari'] ?? 14));

    if ($nominal <= 0) errorResponse('Estimasi nilai penawaran harus lebih dari 0', 422);
    if ($deskripsiItem === '') errorResponse('Deskripsi item penawaran wajib diisi', 422);

    $nomorSph = generateDocNumber('quotations', 'nomor_penawaran', 'SPH-', 4, true, '-');
    $publicToken = bin2hex(random_bytes(24));
    $tglSph = date('Y-m-d');
    $berlakuHingga = date('Y-m-d', strtotime("+{$validDays} days"));
    $clientId = (int)$ticket['client_id'];
    $projectId = !empty($ticket['project_id']) ? (int)$ticket['project_id'] : null;
    $userId = (int)($_SESSION['user_id'] ?? 1);

    $pdo = $db->getPdo();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO quotations (nomor_penawaran, tanggal_penawaran, berlaku_hingga, client_id, project_id,
                                     subtotal, diskon_tipe, diskon_nilai, pajak_persen, pajak_nominal, total_penawaran,
                                     status, public_token, catatan_klien, created_by)
             VALUES (?, ?, ?, ?, ?, ?, 'nominal', 0.00, 0.00, 0.00, ?, 'draft', ?, ?, ?)"
        );
        $stmt->execute([
            $nomorSph, $tglSph, $berlakuHingga, $clientId, $projectId,
            $nominal, $nominal, $publicToken,
            "Penawaran biaya pekerjaan tambahan berdasarkan tiket dukungan {$ticket['nomor_tiket']}.",
            $userId
        ]);
        $quotationId = (int)$pdo->lastInsertId();

        $pdo->prepare(
            "INSERT INTO quotation_items (quotation_id, service_id, deskripsi, kuantitas, satuan, harga_satuan, total_harga, urutan)
             VALUES (?, NULL, ?, 1, 'paket', ?, ?, 1)"
        )->execute([$quotationId, $deskripsiItem, $nominal, $nominal]);

        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        errorResponse('Gagal membuat penawaran (SPH): ' . $e->getMessage(), 500);
    }

    clearCache(['dashboard']);
    $db->execute("UPDATE client_tickets SET quotation_id = ?, cakupan_biaya = 'berbayar' WHERE id = ?", [$quotationId, (int)$id]);
    $actorName = $_SESSION['nama_lengkap'] ?? 'Admin ERP';
    $db->insert(
        "INSERT INTO client_ticket_logs (ticket_id, user_id, actor_name, tipe_aktivitas, durasi_menit, is_billable, ringkasan)
         VALUES (?, ?, ?, 'konversi', 0, 1, ?)",
        [(int)$id, $userId, $actorName, "Dikonversi menjadi Surat Penawaran {$nomorSph} senilai Rp " . number_format($nominal, 0, ',', '.')]
    );
    logActivity('ticket.convert_quotation', 'quotations', $quotationId, null, [
        'keterangan' => "Mengonversi tiket {$ticket['nomor_tiket']} menjadi SPH {$nomorSph}"
    ]);

    successResponse(['quotation_id' => $quotationId, 'nomor_penawaran' => $nomorSph], "Surat Penawaran {$nomorSph} berhasil dibuat (Draft)", 201);
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
    $kategori = trim((string)($params['kategori'] ?? ''));
    $cakupan = trim((string)($params['cakupan_biaya'] ?? ''));
    $search = trim((string)($params['search'] ?? ''));

    $where = ['1=1'];
    $binds = [];
    if ($status !== '') {
        $where[] = 't.status = ?';
        $binds[] = $status;
    }
    if ($kategori !== '') {
        $where[] = 't.kategori = ?';
        $binds[] = $kategori;
    }
    if ($cakupan !== '') {
        $where[] = 't.cakupan_biaya = ?';
        $binds[] = $cakupan;
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
                     q.nomor_penawaran, inv.nomor_invoice,
                     (SELECT COUNT(*) FROM client_ticket_replies r WHERE r.ticket_id = t.id) as reply_count,
                     (SELECT COUNT(*) FROM client_ticket_logs l WHERE l.ticket_id = t.id) as log_count
              FROM client_tickets t
              JOIN clients c ON t.client_id = c.id
              LEFT JOIN projects p ON t.project_id = p.id
              LEFT JOIN maintenance_sla ms ON t.maintenance_id = ms.id
              LEFT JOIN quotations q ON t.quotation_id = q.id
              LEFT JOIN invoices inv ON t.invoice_id = inv.id
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
                COUNT(CASE WHEN status IN ('selesai', 'ditutup') THEN 1 END) as selesai,
                COUNT(CASE WHEN cakupan_biaya = 'berbayar' THEN 1 END) as berbayar,
                COALESCE(SUM(total_durasi_menit), 0) as total_menit
         FROM client_tickets"
    );

    paginatedResponse($items, $total, $page, $perPage, ['stats' => $stats]);
}

errorResponse('Metode tidak didukung', 405);
