<?php
declare(strict_types=1);

require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../middleware/rbac.php';
require_once __DIR__ . '/../middleware/csrf.php';

$db = Database::getInstance();

// 1. Get Single BAST Detail
if ($method === 'GET' && $id && is_numeric($id) && empty($action)) {
    authCheck();
    checkPermission('bast.view');

    $bast = $db->fetch(
        "SELECT b.*,
                p.nama_project, p.kode_project, p.nilai_project,
                c.nama_perusahaan as client_nama, c.email as client_email, c.telepon as client_telepon, c.alamat as client_alamat,
                pm.nama_milestone, pm.nominal as milestone_nominal, pm.persentase as milestone_persentase,
                u.nama_lengkap as pembuat_nama
         FROM project_basts b
         JOIN projects p ON b.project_id = p.id
         JOIN clients c ON b.client_id = c.id
         LEFT JOIN project_milestones pm ON b.milestone_id = pm.id
         LEFT JOIN users u ON b.created_by = u.id
         WHERE b.id = ?",
        [(int)$id]
    );

    if (!$bast) {
        errorResponse('Dokumen BAST tidak ditemukan', 404);
    }

    successResponse($bast);
}

// 2. Sign / Approve BAST (POST /api/basts/{id}/sign)
if ($method === 'POST' && $id && is_numeric($id) && $action === 'sign') {
    authCheck();
    checkPermission('bast.create');
    verifyCsrfToken();

    $bast = $db->fetch("SELECT * FROM project_basts WHERE id = ?", [(int)$id]);
    if (!$bast) {
        errorResponse('Dokumen BAST tidak ditemukan', 404);
    }

    $db->execute("UPDATE project_basts SET status = 'ditandatangani' WHERE id = ?", [(int)$id]);
    logActivity('update', 'project_basts', (int)$id, "Menyetujui & menandatangani BAST: '{$bast['nomor_bast']}'");

    successResponse(['id' => (int)$id, 'status' => 'ditandatangani'], 'Dokumen BAST berhasil ditandatangani secara sah');
}

// 3. List BASTs (Filtered)
if ($method === 'GET') {
    authCheck();
    checkPermission('bast.view');

    $where = ["1=1"];
    $binds = [];

    if (!empty($params['project_id'])) {
        $where[] = "b.project_id = ?";
        $binds[] = (int)$params['project_id'];
    }
    if (!empty($params['client_id'])) {
        $where[] = "b.client_id = ?";
        $binds[] = (int)$params['client_id'];
    }
    if (!empty($params['milestone_id'])) {
        $where[] = "b.milestone_id = ?";
        $binds[] = (int)$params['milestone_id'];
    }
    if (!empty($params['status'])) {
        $where[] = "b.status = ?";
        $binds[] = $params['status'];
    }
    if (!empty($params['search'])) {
        $where[] = "(b.nomor_bast LIKE ? OR b.judul_pekerjaan LIKE ? OR c.nama_perusahaan LIKE ? OR p.nama_project LIKE ?)";
        $term = '%' . trim($params['search']) . '%';
        $binds[] = $term;
        $binds[] = $term;
        $binds[] = $term;
        $binds[] = $term;
    }

    $whereClause = implode(" AND ", $where);

    $basts = $db->fetchAll(
        "SELECT b.*,
                p.nama_project, p.kode_project,
                c.nama_perusahaan as client_nama,
                pm.nama_milestone,
                u.nama_lengkap as pembuat_nama
         FROM project_basts b
         JOIN projects p ON b.project_id = p.id
         JOIN clients c ON b.client_id = c.id
         LEFT JOIN project_milestones pm ON b.milestone_id = pm.id
         LEFT JOIN users u ON b.created_by = u.id
         WHERE $whereClause
         ORDER BY b.tanggal_bast DESC, b.id DESC",
        $binds
    );

    successResponse($basts);
}

// 4. Create BAST
if ($method === 'POST') {
    authCheck();
    checkPermission('bast.create');
    verifyCsrfToken();

    $projectId = (int)($params['project_id'] ?? 0);
    $milestoneId = !empty($params['milestone_id']) ? (int)$params['milestone_id'] : null;
    $tanggalBast = !empty($params['tanggal_bast']) ? trim($params['tanggal_bast']) : date('Y-m-d');
    $judulPekerjaan = trim($params['judul_pekerjaan'] ?? '');
    $deskripsiHasil = trim($params['deskripsi_hasil'] ?? '');
    $catatanRevisi = trim($params['catatan_revisi'] ?? '');
    $status = trim($params['status'] ?? 'draft');

    $pihakPertamaNama = trim($params['pihak_pertama_nama'] ?? '');
    $pihakPertamaJabatan = trim($params['pihak_pertama_jabatan'] ?? 'Lead Project Manager');
    $pihakKeduaNama = trim($params['pihak_kedua_nama'] ?? '');
    $pihakKeduaJabatan = trim($params['pihak_kedua_jabatan'] ?? 'Perwakilan Klien (PIC)');

    if ($projectId <= 0) {
        errorResponse('Proyek wajib dipilih', 422);
    }
    if (empty($judulPekerjaan)) {
        errorResponse('Judul pekerjaan serah terima wajib diisi', 422);
    }
    if (empty($deskripsiHasil)) {
        errorResponse('Deskripsi hasil pekerjaan dan deliverable wajib diisi', 422);
    }
    if (empty($pihakPertamaNama) || empty($pihakKeduaNama)) {
        errorResponse('Nama penanggung jawab kedua belah pihak wajib diisi', 422);
    }

    $project = $db->fetch("SELECT * FROM projects WHERE id = ?", [$projectId]);
    if (!$project) {
        errorResponse('Proyek tidak ditemukan', 404);
    }
    $clientId = (int)$project['client_id'];

    // Auto-generate Nomor BAST: BAST-YYYYMM-XXXX
    $datePrefix = date('Ym', strtotime($tanggalBast));
    $lastBast = $db->fetch(
        "SELECT nomor_bast FROM project_basts WHERE nomor_bast LIKE ? ORDER BY id DESC LIMIT 1",
        ["BAST-{$datePrefix}-%"]
    );
    $nextNum = $lastBast ? ((int)substr($lastBast['nomor_bast'], -4) + 1) : 1;
    $nomorBast = sprintf("BAST-%s-%04d", $datePrefix, $nextNum);

    $currentUser = $_SESSION['user_id'] ?? null;

    $bastId = $db->insert(
        "INSERT INTO project_basts (
            nomor_bast, project_id, milestone_id, client_id, tanggal_bast,
            judul_pekerjaan, deskripsi_hasil, catatan_revisi, status,
            pihak_pertama_nama, pihak_pertama_jabatan,
            pihak_kedua_nama, pihak_kedua_jabatan, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            $nomorBast, $projectId, $milestoneId, $clientId, $tanggalBast,
            $judulPekerjaan, $deskripsiHasil, $catatanRevisi ?: null, $status,
            $pihakPertamaNama, $pihakPertamaJabatan,
            $pihakKeduaNama, $pihakKeduaJabatan, $currentUser
        ]
    );

    logActivity('create', 'project_basts', (int)$bastId, "Menerbitkan BAST baru: $nomorBast ($judulPekerjaan)");

    successResponse([
        'id' => (int)$bastId,
        'nomor_bast' => $nomorBast
    ], 'Berita Acara Serah Terima (BAST) berhasil diterbitkan', 201);
}

// 5. Update BAST
if ($method === 'PUT' && $id && is_numeric($id)) {
    authCheck();
    checkPermission('bast.create');
    verifyCsrfToken();

    $existing = $db->fetch("SELECT * FROM project_basts WHERE id = ?", [(int)$id]);
    if (!$existing) {
        errorResponse('Dokumen BAST tidak ditemukan', 404);
    }

    $tanggalBast = trim($params['tanggal_bast'] ?? $existing['tanggal_bast']);
    $judulPekerjaan = trim($params['judul_pekerjaan'] ?? $existing['judul_pekerjaan']);
    $deskripsiHasil = trim($params['deskripsi_hasil'] ?? $existing['deskripsi_hasil']);
    $catatanRevisi = array_key_exists('catatan_revisi', $params) ? trim($params['catatan_revisi'] ?? '') : $existing['catatan_revisi'];
    $status = trim($params['status'] ?? $existing['status']);
    $milestoneId = array_key_exists('milestone_id', $params) ? (!empty($params['milestone_id']) ? (int)$params['milestone_id'] : null) : $existing['milestone_id'];

    $pihakPertamaNama = trim($params['pihak_pertama_nama'] ?? $existing['pihak_pertama_nama']);
    $pihakPertamaJabatan = trim($params['pihak_pertama_jabatan'] ?? $existing['pihak_pertama_jabatan']);
    $pihakKeduaNama = trim($params['pihak_kedua_nama'] ?? $existing['pihak_kedua_nama']);
    $pihakKeduaJabatan = trim($params['pihak_kedua_jabatan'] ?? $existing['pihak_kedua_jabatan']);

    if (empty($judulPekerjaan)) {
        errorResponse('Judul pekerjaan serah terima wajib diisi', 422);
    }
    if (empty($deskripsiHasil)) {
        errorResponse('Deskripsi hasil pekerjaan wajib diisi', 422);
    }

    $db->execute(
        "UPDATE project_basts SET
            milestone_id = ?, tanggal_bast = ?, judul_pekerjaan = ?, deskripsi_hasil = ?,
            catatan_revisi = ?, status = ?,
            pihak_pertama_nama = ?, pihak_pertama_jabatan = ?,
            pihak_kedua_nama = ?, pihak_kedua_jabatan = ?
         WHERE id = ?",
        [
            $milestoneId, $tanggalBast, $judulPekerjaan, $deskripsiHasil,
            $catatanRevisi ?: null, $status,
            $pihakPertamaNama, $pihakPertamaJabatan,
            $pihakKeduaNama, $pihakKeduaJabatan, (int)$id
        ]
    );

    logActivity('update', 'project_basts', (int)$id, "Memperbarui BAST: '{$existing['nomor_bast']}'");

    successResponse(['id' => (int)$id], 'Dokumen BAST berhasil diperbarui');
}

// 6. Delete BAST
if ($method === 'DELETE' && $id && is_numeric($id)) {
    authCheck();
    checkPermission('bast.delete');
    verifyCsrfToken();

    $existing = $db->fetch("SELECT * FROM project_basts WHERE id = ?", [(int)$id]);
    if (!$existing) {
        errorResponse('Dokumen BAST tidak ditemukan', 404);
    }

    $db->execute("DELETE FROM project_basts WHERE id = ?", [(int)$id]);
    logActivity('delete', 'project_basts', (int)$id, "Menghapus BAST: '{$existing['nomor_bast']}'");

    successResponse(['id' => (int)$id], 'Dokumen BAST berhasil dihapus');
}

errorResponse('Metode tidak diizinkan', 405);
