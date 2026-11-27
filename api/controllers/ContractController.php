<?php
declare(strict_types=1);

// ContractController.php — Modul Kontrak Kerja / SPK Digital

require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../middleware/rbac.php';

authCheck();
$db = Database::getInstance();
$userId = (int)($_SESSION['user_id'] ?? 1);

function defaultSpkClauses(array $data): string
{
    $judul = $data['judul_kontrak'] ?? 'Pengembangan Sistem Informasi';
    $nilai = number_format((float)($data['nilai_kontrak'] ?? 0), 0, ',', '.');
    $garansi = (int)($data['garansi_hari'] ?? 30);

    return "PASAL 1 — PARA PIHAK & DASAR PERJANJIAN\n"
        . "Perjanjian Kerja ini dibuat dan disepakati oleh Pihak Pertama (Penyedia Jasa) dan Pihak Kedua (Klien/Pemberi Kerja) yang masing-masing diwakili oleh penanggung jawab yang sah, berdasarkan Surat Penawaran Harga yang telah disetujui.\n\n"
        . "PASAL 2 — RUANG LINGKUP PEKERJAAN & DELIVERABLES\n"
        . "Pihak Pertama berkewajiban melaksanakan pekerjaan \"{$judul}\" meliputi perancangan, pengembangan sistem, pengujian (UAT), hingga serah terima hasil pekerjaan sesuai spesifikasi teknis pada Surat Penawaran terkait.\n\n"
        . "PASAL 3 — JANGKA WAKTU PELAKSANAAN & SERAH TERIMA\n"
        . "Pekerjaan dilaksanakan sesuai jadwal yang disepakati bersama sejak tanggal mulai kontrak. Setelah pengujian UAT disetujui, kedua belah pihak menandatangani Berita Acara Serah Terima (BAST) sebagai bukti penyelesaian resmi.\n\n"
        . "PASAL 4 — NILAI KONTRAK, PAJAK & TATA CARA PEMBAYARAN\n"
        . "Total nilai kontrak pekerjaan ini adalah sebesar Rp {$nilai}. Pembayaran dilakukan melalui transfer ke rekening resmi Pihak Pertama sesuai termin pada faktur tagihan. Ketentuan pajak (PPN/PPh) mengikuti peraturan perpajakan yang berlaku.\n\n"
        . "PASAL 5 — HAK & KEWAJIBAN PARA PIHAK\n"
        . "1. Pihak Pertama berhak menerima pembayaran tepat waktu serta memperoleh data, materi, dan akses infrastruktur yang dibutuhkan untuk pengerjaan proyek.\n"
        . "2. Pihak Kedua berhak memantau progres pekerjaan, melakukan uji coba UAT, serta menerima dokumentasi dan hasil kerja sesuai ruang lingkup.\n"
        . "3. Pihak Kedua wajib memberikan umpan balik dan persetujuan tepat waktu agar jadwal proyek tidak terhambat.\n\n"
        . "PASAL 6 — GARANSI SISTEM, PEMELIHARAAN & CHANGE REQUEST\n"
        . "Dukungan pemeliharaan sistem dan perbaikan teknis dilaksanakan sesuai paket biaya maintenance & support yang disepakati pada rincian kontrak ini (masa garansi awal implementasi {$garansi} hari kalender pasca-BAST untuk error bawaan ruang lingkup). Permintaan penambahan fitur atau perubahan desain di luar ruang lingkup awal diatur sebagai Change Request dengan estimasi biaya dan waktu terpisah.\n\n"
        . "PASAL 7 — HAK KEKAYAAN INTELEKTUAL & KERAHASIAAN\n"
        . "Seluruh Hak Kekayaan Intelektual (HAKI), hak cipta, arsitektur sistem, dan Source Code aplikasi sepenuhnya merupakan hak milik mutlak dan eksklusif Pihak Pertama. Pihak Kedua hanya memperoleh hak akses penggunaan aplikasi sebagai Pemakai Akhir (End-User License) untuk operasional internal dan dilarang menyalin, membongkar (reverse engineer), memodifikasi, atau mendistribusikan kode sumber kepada pihak ketiga. Kedua belah pihak wajib menjaga kerahasiaan data bisnis dan kredensial akses.\n\n"
        . "PASAL 8 — KEADAAN KAHAR (FORCE MAJEURE) & PENYELESAIAN PERSELISIHAN\n"
        . "Keterlambatan akibat bencana alam, gangguan jaringan nasional, atau kebijakan pemerintah di luar kendali wajar kedua pihak tidak dianggap wanprestasi. Segala perselisihan yang timbul akan diselesaikan terlebih dahulu secara musyawarah untuk mufakat.";
}

function generateNomorKontrak(Database $db): string
{
    return generateDocNumber('contracts', 'nomor_kontrak', 'SPK/' . date('Y/m') . '/', 4, false, '');
}

// 1. Detail Kontrak
if ($method === 'GET' && $id && is_numeric($id)) {
    checkPermission('quotation.view');
    $row = $db->fetch(
        "SELECT k.*, c.nama_perusahaan as client_nama, c.penanggung_jawab as client_pic, c.telepon as client_telepon, c.email as client_email,
                q.nomor_penawaran, q.ruang_lingkup_fitur, q.pasal_hak_kewajiban, q.syarat_ketentuan, q.timeline_pengerjaan,
                q.subtotal as quo_subtotal, q.diskon_nilai as quo_diskon, q.pajak_persen as quo_pajak_persen, q.pajak_nominal as quo_pajak_nominal, q.total_penawaran as quo_total,
                p.nama_project, u.nama_lengkap as pembuat
         FROM contracts k
         JOIN clients c ON k.client_id = c.id
         LEFT JOIN quotations q ON k.quotation_id = q.id
         LEFT JOIN projects p ON k.project_id = p.id
         LEFT JOIN users u ON k.created_by = u.id
         WHERE k.id = ?",
        [(int)$id]
    );
    if (!$row) errorResponse('Dokumen kontrak tidak ditemukan', 404);
    $row['quotation_items'] = !empty($row['quotation_id'])
        ? $db->fetchAll("SELECT deskripsi, kuantitas, satuan, harga_satuan, total_harga FROM quotation_items WHERE quotation_id = ? ORDER BY id ASC", [(int)$row['quotation_id']])
        : [];
    $row['bank_accounts'] = $db->fetchAll(
        "SELECT nama_metode, nama_bank, cabang, nomor_rekening, atas_nama FROM payment_methods WHERE status = 'aktif' ORDER BY is_default DESC, id ASC"
    );
    successResponse($row);
}

// 2. Daftar Kontrak
if ($method === 'GET') {
    checkPermission('quotation.view');
    $where = ['1=1'];
    $binds = [];
    if (!empty($params['status'])) {
        $where[] = 'k.status = ?';
        $binds[] = $params['status'];
    }
    if (!empty($params['client_id'])) {
        $where[] = 'k.client_id = ?';
        $binds[] = (int)$params['client_id'];
    }
    if (!empty($params['search'])) {
        $s = '%' . trim((string)$params['search']) . '%';
        $where[] = '(k.nomor_kontrak LIKE ? OR k.judul_kontrak LIKE ? OR c.nama_perusahaan LIKE ?)';
        array_push($binds, $s, $s, $s);
    }

    $rows = $db->fetchAll(
        "SELECT k.id, k.nomor_kontrak, k.public_token, k.client_id, k.quotation_id, k.project_id,
                k.judul_kontrak, k.tanggal_mulai, k.tanggal_selesai, k.nilai_kontrak, k.garansi_hari,
                k.status, k.signed_by_name, k.signed_at, k.created_at,
                c.nama_perusahaan as client_nama, c.kode_klien, c.telepon as client_telepon,
                q.nomor_penawaran, p.nama_project
         FROM contracts k
         JOIN clients c ON k.client_id = c.id
         LEFT JOIN quotations q ON k.quotation_id = q.id
         LEFT JOIN projects p ON k.project_id = p.id
         WHERE " . implode(' AND ', $where) . "
         ORDER BY k.id DESC",
        $binds
    );
    successResponse($rows);
}

// 3. Buat SPK 1-Klik dari Surat Penawaran
if ($method === 'POST' && $id === 'from-quotation') {
    checkPermission('quotation.create');
    $quoId = (int)($params['quotation_id'] ?? 0);
    if ($quoId <= 0) errorResponse('ID Penawaran tidak valid', 422);

    $quo = $db->fetch(
        "SELECT q.*, p.nama_project FROM quotations q LEFT JOIN projects p ON q.project_id = p.id WHERE q.id = ?",
        [$quoId]
    );
    if (!$quo) errorResponse('Surat penawaran tidak ditemukan', 404);

    $existing = $db->fetch("SELECT id, nomor_kontrak FROM contracts WHERE quotation_id = ? AND status != 'dibatalkan'", [$quoId]);
    if ($existing) {
        errorResponse("Penawaran ini sudah memiliki SPK aktif ({$existing['nomor_kontrak']})", 422);
    }

    $judul = $quo['nama_project'] ? "SPK {$quo['nama_project']}" : "SPK Penawaran {$quo['nomor_penawaran']}";
    $nomor = generateNomorKontrak($db);
    $token = bin2hex(random_bytes(24));
    $pasal = defaultSpkClauses([
        'judul_kontrak' => $judul,
        'nilai_kontrak' => $quo['total_penawaran'],
        'garansi_hari' => 30
    ]);

    $newId = (int)$db->insert(
        "INSERT INTO contracts (nomor_kontrak, public_token, client_id, quotation_id, project_id, judul_kontrak, tanggal_mulai, nilai_kontrak, garansi_hari, isi_pasal, status, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, 30, ?, 'terkirim', ?, NOW())",
        [$nomor, $token, (int)$quo['client_id'], $quoId, $quo['project_id'] ?: null, $judul, (float)$quo['total_penawaran'], $pasal, $userId]
    );

    logActivity('contract.create_from_quotation', 'contracts', $newId, null, [
        'keterangan' => "Membuat SPK {$nomor} dari Penawaran {$quo['nomor_penawaran']}"
    ]);
    successResponse(['id' => $newId, 'nomor_kontrak' => $nomor], "SPK {$nomor} berhasil dibuat dan dikirim ke Portal Klien");
}

// 4. Kirim SPK ke Portal Klien
if ($method === 'POST' && $id && is_numeric($id) && $action === 'send') {
    checkPermission('quotation.create');
    $contract = $db->fetch("SELECT * FROM contracts WHERE id = ?", [(int)$id]);
    if (!$contract) errorResponse('Kontrak tidak ditemukan', 404);
    if ($contract['status'] === 'ditandatangani') errorResponse('Kontrak sudah ditandatangani', 422);

    $db->execute("UPDATE contracts SET status = 'terkirim', updated_at = NOW() WHERE id = ?", [(int)$id]);
    logActivity('contract.send', 'contracts', (int)$id, null, ['keterangan' => "Mengirim SPK {$contract['nomor_kontrak']} ke Portal Klien"]);
    successResponse(null, 'Kontrak berhasil dikirim ke Portal Klien');
}

// 4b. Kirim SPK via Email SMTP + Lampiran PDF
if ($method === 'POST' && $id && is_numeric($id) && $action === 'send-email') {
    checkPermission('quotation.create');
    $k = $db->fetch(
        "SELECT k.*, c.id as client_id, c.nama_perusahaan, c.penanggung_jawab, c.email as client_email, c.cc_email as client_cc_email, c.portal_token
         FROM contracts k
         JOIN clients c ON k.client_id = c.id
         WHERE k.id = ?",
        [(int)$id]
    );
    if (!$k) errorResponse('Kontrak tidak ditemukan', 404);
    if (empty($k['client_email'])) errorResponse('Email klien belum diatur pada data pelanggan', 422);

    $cfg = getAppSettingsMap();
    $portalToken = trim((string)($k['portal_token'] ?? ''));
    if ($portalToken === '') {
        $portalToken = bin2hex(random_bytes(24));
        $db->execute("UPDATE clients SET portal_token = ? WHERE id = ?", [$portalToken, (int)$k['client_id']]);
    }
    $portalUrl = buildPublicAppUrl('#/client-portal?token=' . urlencode($portalToken));
    $attachments = extractPdfAttachmentFromParams($params, "SPK-{$k['nomor_kontrak']}.pdf");
    $hasLogo = resolveCompanyEmailLogoPath($cfg) !== null;
    $ccEmails = trim((string)($params['cc_email'] ?? $k['client_cc_email'] ?? ''));
    $subject = "Kontrak / SPK Digital {$k['nomor_kontrak']} - " . ($cfg['company_name'] ?? 'CRUDWorks ERP');
    $html = buildContractEmailHtml($k, $cfg, $portalUrl, $hasLogo, !empty($attachments));
    $mailRes = sendErpEmail((string)$k['client_email'], (string)($k['penanggung_jawab'] ?: $k['nama_perusahaan']), $subject, $html, 'contract', (int)$id, $attachments, $ccEmails);
    if (empty($mailRes['success'])) {
        errorResponse($mailRes['message'] ?? 'Gagal mengirim email kontrak', 500);
    }

    if ($k['status'] === 'draft') {
        $db->execute("UPDATE contracts SET status = 'terkirim', updated_at = NOW() WHERE id = ?", [(int)$id]);
    }
    logActivity('contract.send_email', 'contracts', (int)$id, null, ['sent_to' => $k['client_email']]);
    successResponse(['sent_to' => $k['client_email']], 'Kontrak / SPK berhasil dikirim via SMTP ke ' . $k['client_email']);
}

// 5. Create / Update Kontrak
if ($method === 'POST') {
    checkPermission('quotation.create');
    $editId = !empty($params['id']) && is_numeric($params['id']) ? (int)$params['id'] : null;
    $clientId = (int)($params['client_id'] ?? 0);
    $projectId = !empty($params['project_id']) && is_numeric($params['project_id']) ? (int)$params['project_id'] : null;
    $quotationId = !empty($params['quotation_id']) && is_numeric($params['quotation_id']) ? (int)$params['quotation_id'] : null;
    $judul = trim((string)($params['judul_kontrak'] ?? ''));
    $p1Nama = trim((string)($params['pihak_pertama_nama'] ?? '')) ?: null;
    $p1Jabatan = trim((string)($params['pihak_pertama_jabatan'] ?? '')) ?: null;
    $mulai = !empty($params['tanggal_mulai']) ? $params['tanggal_mulai'] : null;
    $selesai = !empty($params['tanggal_selesai']) ? $params['tanggal_selesai'] : null;
    $nilai = (float)($params['nilai_kontrak'] ?? 0);
    $garansi = max(0, (int)($params['garansi_hari'] ?? 30));
    $status = in_array($params['status'] ?? '', ['draft', 'terkirim', 'dibatalkan'], true) ? $params['status'] : 'draft';
    $pasal = trim((string)($params['isi_pasal'] ?? ''));

    if ($clientId <= 0 || $judul === '') {
        errorResponse('Klien dan Judul Kontrak wajib diisi', 422);
    }
    if ($pasal === '') {
        $pasal = defaultSpkClauses(['judul_kontrak' => $judul, 'nilai_kontrak' => $nilai, 'garansi_hari' => $garansi]);
    }

    if ($editId) {
        $existing = $db->fetch("SELECT * FROM contracts WHERE id = ?", [$editId]);
        if (!$existing) errorResponse('Kontrak tidak ditemukan', 404);
        if ($existing['status'] === 'ditandatangani') errorResponse('Kontrak yang sudah ditandatangani tidak dapat diubah', 422);

        $db->execute(
            "UPDATE contracts SET client_id = ?, project_id = ?, quotation_id = ?, judul_kontrak = ?, pihak_pertama_nama = ?, pihak_pertama_jabatan = ?, tanggal_mulai = ?, tanggal_selesai = ?, nilai_kontrak = ?, garansi_hari = ?, isi_pasal = ?, status = ?, updated_at = NOW() WHERE id = ?",
            [$clientId, $projectId, $quotationId, $judul, $p1Nama, $p1Jabatan, $mulai, $selesai, $nilai, $garansi, $pasal, $status, $editId]
        );
        logActivity('contract.update', 'contracts', $editId, null, ['keterangan' => "Memperbarui SPK {$existing['nomor_kontrak']}"]);
        successResponse(['id' => $editId], 'Dokumen kontrak berhasil diperbarui');
    }

    $nomor = generateNomorKontrak($db);
    $token = bin2hex(random_bytes(24));
    $newId = (int)$db->insert(
        "INSERT INTO contracts (nomor_kontrak, public_token, client_id, quotation_id, project_id, judul_kontrak, pihak_pertama_nama, pihak_pertama_jabatan, tanggal_mulai, tanggal_selesai, nilai_kontrak, garansi_hari, isi_pasal, status, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
        [$nomor, $token, $clientId, $quotationId, $projectId, $judul, $p1Nama, $p1Jabatan, $mulai, $selesai, $nilai, $garansi, $pasal, $status, $userId]
    );
    logActivity('contract.create', 'contracts', $newId, null, ['keterangan' => "Membuat SPK baru {$nomor}"]);
    successResponse(['id' => $newId, 'nomor_kontrak' => $nomor], "Kontrak {$nomor} berhasil dibuat");
}

// 6. Hapus Kontrak
if ($method === 'DELETE' && $id && is_numeric($id)) {
    checkPermission('quotation.delete');
    $existing = $db->fetch("SELECT id, nomor_kontrak, status FROM contracts WHERE id = ?", [(int)$id]);
    if (!$existing) errorResponse('Kontrak tidak ditemukan', 404);
    if ($existing['status'] === 'ditandatangani') errorResponse('Kontrak yang sudah sah ditandatangani tidak dapat dihapus', 422);

    $db->execute("DELETE FROM contracts WHERE id = ?", [(int)$id]);
    logActivity('contract.delete', 'contracts', (int)$id, null, ['keterangan' => "Menghapus SPK {$existing['nomor_kontrak']}"]);
    successResponse(null, 'Dokumen kontrak dihapus');
}

errorResponse('Aksi tidak dikenali', 400);
