<?php
declare(strict_types=1);

require_once __DIR__ . '/project_helpers.php';

// portal_helpers.php - Logika bersama Portal Klien (akses via token tautan & login mandiri PWA)

/**
 * Menyusun seluruh data dashboard portal untuk satu klien.
 */
function portalBuildData(Database $db, array $client): array
{
    $clientId = (int)$client['id'];

    $invoices = $db->fetchAll(
        "SELECT id, nomor_invoice, public_token, tanggal_invoice, tanggal_jatuh_tempo,
                subtotal, diskon_nilai, pajak_nominal, total_tagihan, total_dibayar, sisa_tagihan, status,
                payment_verification_status, bukti_transfer, bukti_transfer_at,
                created_at
         FROM invoices
         WHERE client_id = ?
         ORDER BY tanggal_invoice DESC, id DESC",
        [$clientId]
    );

    $payments = $db->fetchAll(
        "SELECT p.id, p.nomor_pembayaran, p.invoice_id, p.tanggal_bayar, p.jumlah_bayar,
                p.nomor_referensi, p.catatan,
                inv.nomor_invoice, inv.total_tagihan, inv.sisa_tagihan as current_sisa, inv.public_token as invoice_token,
                pm.nama_metode, pm.nama_bank, pm.nomor_rekening, pm.atas_nama,
                cl.nama_perusahaan as client_nama, cl.penanggung_jawab as client_pic,
                cl.telepon as client_telepon, cl.email as client_email,
                cl.alamat as client_alamat, cl.kota as client_kota
         FROM payments p
         JOIN invoices inv ON p.invoice_id = inv.id
         JOIN clients cl ON inv.client_id = cl.id
         LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
         WHERE inv.client_id = ?
         ORDER BY p.tanggal_bayar DESC, p.id DESC",
        [$clientId]
    );

    $quotations = $db->fetchAll(
        "SELECT q.id, q.nomor_penawaran, q.public_token, q.tanggal_penawaran, q.berlaku_hingga,
                q.total_penawaran, q.status, q.signed_at, q.signed_by_name, p.nama_project
         FROM quotations q
         LEFT JOIN projects p ON q.project_id = p.id
         WHERE q.client_id = ?
         ORDER BY q.tanggal_penawaran DESC, q.id DESC",
        [$clientId]
    );

    $maintenance = $db->fetchAll(
        "SELECT id, jenis, nama_aset, provider, domain_name, ip_address, siklus,
                tanggal_mulai, tanggal_berakhir, status, biaya_perpanjangan,
                uptime_status, http_status_code, response_time_ms, ssl_valid_until, ssl_days_left, ssl_issuer, last_check_at,
                DATEDIFF(tanggal_berakhir, CURDATE()) as sisa_hari
         FROM maintenance_sla
         WHERE client_id = ?
         ORDER BY tanggal_berakhir ASC",
        [$clientId]
    );

    $projects = $db->fetchAll(
        "SELECT id, kode_project, nama_project, deskripsi, app_url, deploy_path, status,
                last_health_status, last_latency_ms, last_ssl_days,
                tanggal_mulai, tanggal_selesai, nilai_project
         FROM projects
         WHERE client_id = ? AND status != 'dibatalkan'
         ORDER BY id DESC",
        [$clientId]
    );

    if (!empty($projects)) {
        $projIds = array_column($projects, 'id');
        $inSql = implode(',', array_fill(0, count($projIds), '?'));

        $milestones = $db->fetchAll(
            "SELECT pm.id, pm.project_id, pm.nama_milestone, pm.persentase, pm.nominal,
                    pm.tanggal_target, pm.status, pm.invoice_id,
                    inv.nomor_invoice, inv.status as invoice_status
             FROM project_milestones pm
             LEFT JOIN invoices inv ON pm.invoice_id = inv.id
             WHERE pm.project_id IN ($inSql)
             ORDER BY pm.id ASC",
            $projIds
        );

        $tasksSummary = $db->fetchAll(
            "SELECT project_id, milestone_id,
                    COUNT(*) as total_tasks,
                    SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_tasks,
                    SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) as review_tasks,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as progress_tasks,
                    SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo_tasks
             FROM project_tasks
             WHERE project_id IN ($inSql)
             GROUP BY project_id, milestone_id",
            $projIds
        );

        $projStats = [];
        $msStats = [];
        foreach ($tasksSummary as $ts) {
            $pid = (int)$ts['project_id'];
            if (!isset($projStats[$pid])) {
                $projStats[$pid] = ['total' => 0, 'done' => 0, 'review' => 0, 'in_progress' => 0, 'todo' => 0];
            }
            $projStats[$pid]['total'] += (int)$ts['total_tasks'];
            $projStats[$pid]['done'] += (int)$ts['done_tasks'];
            $projStats[$pid]['review'] += (int)$ts['review_tasks'];
            $projStats[$pid]['in_progress'] += (int)$ts['progress_tasks'];
            $projStats[$pid]['todo'] += (int)$ts['todo_tasks'];

            if (!empty($ts['milestone_id'])) {
                $mid = (int)$ts['milestone_id'];
                $msStats[$mid] = [
                    'total' => (int)$ts['total_tasks'],
                    'done' => (int)$ts['done_tasks'],
                    'review' => (int)$ts['review_tasks'],
                    'in_progress' => (int)$ts['progress_tasks'],
                    'todo' => (int)$ts['todo_tasks']
                ];
            }
        }

        $msByProject = [];
        foreach ($milestones as $m) {
            $pid = (int)$m['project_id'];
            $mid = (int)$m['id'];
            $st = $msStats[$mid] ?? ['total' => 0, 'done' => 0, 'review' => 0, 'in_progress' => 0, 'todo' => 0];
            $m['task_stats'] = $st;
            $m['progress_pct'] = $st['total'] > 0
                ? (int)round(($st['done'] / $st['total']) * 100)
                : ($m['status'] === 'lunas' ? 100 : 0);
            $msByProject[$pid][] = $m;
        }

        $bastsAllForProjects = $db->fetchAll(
            "SELECT id, project_id, nomor_bast, judul_pekerjaan, status, tanggal_bast, signed_at
             FROM project_basts
             WHERE project_id IN ($inSql) AND status != 'dibatalkan'
             ORDER BY id DESC",
            $projIds
        );
        $contractsAllForProjects = $db->fetchAll(
            "SELECT id, project_id, nomor_kontrak, judul_kontrak, status, garansi_hari
             FROM contracts
             WHERE project_id IN ($inSql) AND status != 'dibatalkan'
             ORDER BY id DESC",
            $projIds
        );
        $quotationsAllForProjects = $db->fetchAll(
            "SELECT id, project_id, nomor_penawaran, public_token, status, total_penawaran
             FROM quotations
             WHERE project_id IN ($inSql) AND status != 'dibatalkan'
             ORDER BY id DESC",
            $projIds
        );
        $changeRequestsAll = $db->fetchAll(
            "SELECT cr.id, cr.project_id, cr.nomor_adendum, cr.judul, cr.biaya, cr.estimasi_hari, cr.status, cr.invoice_id, i.nomor_invoice
             FROM project_change_requests cr
             LEFT JOIN invoices i ON cr.invoice_id = i.id
             WHERE cr.project_id IN ($inSql) AND cr.status != 'ditolak'
             ORDER BY cr.id DESC",
            $projIds
        );

        $bastsByProj = [];
        $warrantyStartByProj = [];
        foreach ($bastsAllForProjects as $bp) {
            $pid = (int)$bp['project_id'];
            $bastsByProj[$pid][] = $bp;
            if ($bp['status'] === 'ditandatangani') {
                $dt = !empty($bp['signed_at']) ? substr((string)$bp['signed_at'], 0, 10) : ($bp['tanggal_bast'] ?? null);
                if ($dt && (!isset($warrantyStartByProj[$pid]) || $dt > $warrantyStartByProj[$pid])) {
                    $warrantyStartByProj[$pid] = $dt;
                }
            }
        }
        $contractsByProj = [];
        $warrantyDaysByProj = [];
        foreach ($contractsAllForProjects as $cp) {
            $pid = (int)$cp['project_id'];
            $contractsByProj[$pid][] = $cp;
            $gd = (int)($cp['garansi_hari'] ?? 0);
            if ($gd > ($warrantyDaysByProj[$pid] ?? 0)) $warrantyDaysByProj[$pid] = $gd;
        }
        $quosByProj = [];
        foreach ($quotationsAllForProjects as $qp) {
            $quosByProj[(int)$qp['project_id']][] = $qp;
        }
        $crByProj = [];
        foreach ($changeRequestsAll as $crp) {
            $crByProj[(int)$crp['project_id']][] = $crp;
        }

        foreach ($projects as &$proj) {
            $pid = (int)$proj['id'];
            $st = $projStats[$pid] ?? ['total' => 0, 'done' => 0, 'review' => 0, 'in_progress' => 0, 'todo' => 0];
            $proj['task_stats'] = $st;
            $proj['progress_pct'] = $st['total'] > 0
                ? (int)round(($st['done'] / $st['total']) * 100)
                : ($proj['status'] === 'selesai' ? 100 : 0);
            $proj['milestones'] = $msByProject[$pid] ?? [];
            $proj['releases'] = portalGetGitReleases($proj['deploy_path'] ?? null, 5);
            $proj['warranty'] = computeProjectWarranty($warrantyDaysByProj[$pid] ?? 0, $warrantyStartByProj[$pid] ?? null);
            $proj['documents'] = [
                'quotations' => $quosByProj[$pid] ?? [],
                'contracts' => $contractsByProj[$pid] ?? [],
                'basts' => $bastsByProj[$pid] ?? []
            ];
            $proj['change_requests'] = $crByProj[$pid] ?? [];
            unset($proj['deploy_path']);
        }
        unset($proj);
    }

    $basts = $db->fetchAll(
        "SELECT b.*, p.nama_project, p.kode_project,
                c.nama_perusahaan as client_nama,
                pm.nama_milestone
         FROM project_basts b
         JOIN projects p ON b.project_id = p.id
         JOIN clients c ON b.client_id = c.id
         LEFT JOIN project_milestones pm ON b.milestone_id = pm.id
         WHERE b.client_id = ? AND b.status != 'dibatalkan'
         ORDER BY b.tanggal_bast DESC, b.id DESC",
        [$clientId]
    );

    // Layanan aktif yang digunakan klien (gabungan langganan berulang & SLA)
    $activeServices = [];
    foreach ($maintenance as $m) {
        $activeServices[] = [
            'sumber' => 'sla',
            'nama_layanan' => $m['nama_aset'],
            'detail' => $m['domain_name'] ?: ($m['provider'] ?: strtoupper((string)$m['jenis'])),
            'siklus' => $m['siklus'],
            'biaya' => (float)$m['biaya_perpanjangan'],
            'status' => $m['status'],
            'uptime_status' => $m['uptime_status'],
            'berakhir' => $m['tanggal_berakhir'],
            'sisa_hari' => (int)$m['sisa_hari']
        ];
    }

    $recurringRows = $db->fetchAll(
        "SELECT id, judul, frekuensi, tanggal_mulai, berikutnya_dibuat_at, status, data_items_json
         FROM recurring_invoices
         WHERE client_id = ? AND status IN ('aktif', 'dijeda')
         ORDER BY id DESC",
        [$clientId]
    );
    foreach ($recurringRows as $rec) {
        $items = json_decode((string)$rec['data_items_json'], true);
        $totalRec = 0.0;
        $names = [];
        if (is_array($items)) {
            foreach ($items as $it) {
                $qty = (float)($it['kuantitas'] ?? 1);
                $prc = (float)($it['harga_satuan'] ?? 0);
                $totalRec += ($qty * $prc);
                if (!empty($it['deskripsi'])) $names[] = $it['deskripsi'];
            }
        }
        $activeServices[] = [
            'sumber' => 'langganan',
            'nama_layanan' => $rec['judul'],
            'detail' => !empty($names) ? implode(', ', array_slice($names, 0, 2)) : 'Tagihan Berulang',
            'siklus' => $rec['frekuensi'],
            'biaya' => $totalRec,
            'status' => $rec['status'],
            'uptime_status' => null,
            'berakhir' => $rec['berikutnya_dibuat_at'],
            'sisa_hari' => null
        ];
    }

    // Tiket Gangguan Klien
    $tickets = $db->fetchAll(
        "SELECT t.*, p.nama_project, p.kode_project, ms.nama_aset, ms.domain_name,
                (SELECT COUNT(*) FROM client_ticket_replies r WHERE r.ticket_id = t.id) as reply_count
         FROM client_tickets t
         LEFT JOIN projects p ON t.project_id = p.id
         LEFT JOIN maintenance_sla ms ON t.maintenance_id = ms.id
         WHERE t.client_id = ?
         ORDER BY FIELD(t.status, 'menunggu_klien', 'terbuka', 'diproses', 'selesai', 'ditutup'), t.id DESC",
        [$clientId]
    );

    $openTickets = 0;
    $waitingTickets = 0;
    foreach ($tickets as $t) {
        if (in_array($t['status'], ['terbuka', 'diproses', 'menunggu_klien'], true)) {
            $openTickets++;
        }
        if ($t['status'] === 'menunggu_klien') {
            $waitingTickets++;
        }
    }

    $sharedCredentials = $db->fetchAll(
        "SELECT c.id, c.project_id, c.judul, c.tipe, c.host_url, c.port, c.username, c.catatan,
                p.nama_project
         FROM client_credentials c
         LEFT JOIN projects p ON c.project_id = p.id
         WHERE c.client_id = ? AND c.show_in_portal = 1
         ORDER BY c.id DESC",
        [$clientId]
    );

    $expiringAssets = 0;
    foreach ($maintenance as $m) {
        if (($m['status'] ?? '') !== 'nonaktif' && (int)($m['sisa_hari'] ?? 999) <= 30) {
            $expiringAssets++;
        }
    }

    $pendingQuotations = 0;
    foreach ($quotations as $q) {
        if (!in_array($q['status'] ?? '', ['disetujui', 'dikonversi', 'ditolak'], true)) {
            $pendingQuotations++;
        }
    }

    $contracts = $db->fetchAll(
        "SELECT k.id, k.nomor_kontrak, k.public_token, k.quotation_id, k.project_id,
                k.judul_kontrak, k.pihak_pertama_nama, k.pihak_pertama_jabatan, k.tanggal_mulai, k.tanggal_selesai, k.nilai_kontrak,
                k.garansi_hari, k.isi_pasal, k.status, k.signed_by_name, k.signed_by_position, k.signature_data, k.signed_at, k.signed_ip,
                q.nomor_penawaran, q.ruang_lingkup_fitur, q.pasal_hak_kewajiban, q.syarat_ketentuan, q.timeline_pengerjaan,
                q.subtotal as quo_subtotal, q.diskon_nilai as quo_diskon, q.pajak_persen as quo_pajak_persen, q.pajak_nominal as quo_pajak_nominal, q.total_penawaran as quo_total,
                p.nama_project
         FROM contracts k
         LEFT JOIN quotations q ON k.quotation_id = q.id
         LEFT JOIN projects p ON k.project_id = p.id
         WHERE k.client_id = ? AND k.status != 'dibatalkan'
         ORDER BY k.id DESC",
        [$clientId]
    );
    $quoIds = array_values(array_unique(array_filter(array_column($contracts, 'quotation_id'))));
    $quoItemsMap = [];
    if (!empty($quoIds)) {
        $qIn = implode(',', array_fill(0, count($quoIds), '?'));
        $qItems = $db->fetchAll("SELECT quotation_id, deskripsi, kuantitas, satuan, harga_satuan, total_harga FROM quotation_items WHERE quotation_id IN ($qIn) ORDER BY id ASC", $quoIds);
        foreach ($qItems as $qi) {
            $quoItemsMap[(int)$qi['quotation_id']][] = $qi;
        }
    }
    $pendingContracts = 0;
    foreach ($contracts as &$ct) {
        $ct['quotation_items'] = !empty($ct['quotation_id']) ? ($quoItemsMap[(int)$ct['quotation_id']] ?? []) : [];
        if (in_array($ct['status'] ?? '', ['draft', 'terkirim'], true)) {
            $pendingContracts++;
        }
    }
    unset($ct);

    $knowledgeBase = $db->fetchAll(
        "SELECT kb.id, kb.kategori, kb.judul, kb.konten, kb.updated_at, p.nama_project
         FROM knowledge_base kb
         LEFT JOIN projects p ON kb.project_id = p.id
         WHERE kb.is_published = 1 AND (kb.client_id IS NULL OR kb.client_id = ?)
         ORDER BY kb.updated_at DESC, kb.id DESC",
        [$clientId]
    );

    $depRow = $db->fetch("SELECT saldo_deposit FROM clients WHERE id = ?", [$clientId]);
    $client['saldo_deposit'] = (float)($depRow['saldo_deposit'] ?? 0);

    $settingsRows = $db->fetchAll("SELECT kunci, nilai FROM app_settings WHERE grup IN ('company', 'invoice')");
    $company = [];
    foreach ($settingsRows as $row) {
        $company[$row['kunci']] = $row['nilai'];
    }

    $bankAccounts = $db->fetchAll("SELECT * FROM payment_methods WHERE status = 'aktif' ORDER BY is_default DESC, id ASC");

    $totalPaid = 0.0;
    $totalUnpaid = 0.0;
    $unpaidCount = 0;
    $overdueCount = 0;
    $todayStr = date('Y-m-d');
    foreach ($invoices as $inv) {
        $totalPaid += (float)$inv['total_dibayar'];
        $totalUnpaid += (float)$inv['sisa_tagihan'];
        if ((float)$inv['sisa_tagihan'] > 0 && $inv['status'] !== 'dibatalkan') {
            $unpaidCount++;
            if (!empty($inv['tanggal_jatuh_tempo']) && $inv['tanggal_jatuh_tempo'] < $todayStr) {
                $overdueCount++;
            }
        }
    }

    $pendingBasts = 0;
    foreach ($basts as $b) {
        if ($b['status'] === 'draft') $pendingBasts++;
    }

    return [
        'client' => $client,
        'projects' => $projects,
        'basts' => $basts,
        'contracts' => $contracts,
        'knowledge_base' => $knowledgeBase,
        'invoices' => $invoices,
        'payments' => $payments,
        'quotations' => $quotations,
        'maintenance' => $maintenance,
        'active_services' => $activeServices,
        'credentials' => $sharedCredentials,
        'tickets' => $tickets,
        'company' => $company,
        'payment_methods' => $bankAccounts,
        'reminders' => [
            'pending_basts' => $pendingBasts,
            'pending_contracts' => $pendingContracts,
            'waiting_tickets' => $waitingTickets,
            'due_invoices' => $unpaidCount,
            'overdue_invoices' => $overdueCount,
            'expiring_assets' => $expiringAssets,
            'pending_quotations' => $pendingQuotations
        ],
        'kpi' => [
            'total_projects' => count($projects),
            'pending_basts' => $pendingBasts,
            'open_tickets' => $openTickets,
            'total_invoices' => count($invoices),
            'unpaid_invoices' => $unpaidCount,
            'total_paid' => $totalPaid,
            'total_unpaid' => $totalUnpaid,
            'total_quotations' => count($quotations),
            'total_assets' => count($maintenance),
            'total_services' => count($activeServices)
        ],
        'server_time' => date('c')
    ];
}

/**
 * Pengesahan BAST secara digital oleh klien (kanvas tanda tangan).
 * Mengakhiri request dengan successResponse() / errorResponse().
 */
function portalSignBast(Database $db, array $client, array $params, string $sumber): void
{
    $clientId = (int)$client['id'];
    $bastId = (int)($params['bast_id'] ?? 0);
    $signedName = trim((string)($params['signed_by_name'] ?? ''));
    $signedPos = trim((string)($params['signed_by_position'] ?? '')) ?: 'Penanggung Jawab (PIC)';
    $signatureData = trim((string)($params['signature_data'] ?? ''));

    if ($bastId <= 0) {
        errorResponse('Dokumen BAST tidak valid', 422);
    }
    if ($signedName === '') {
        errorResponse('Nama lengkap penandatangan wajib diisi', 422);
    }
    if ($signatureData === '' || !preg_match('#^data:image/(png|jpeg);base64,#', $signatureData)) {
        errorResponse('Tanda tangan digital pada kanvas wajib diisi', 422);
    }
    if (strlen($signatureData) > 1500000) {
        errorResponse('Ukuran tanda tangan terlalu besar', 422);
    }

    $bast = $db->fetch("SELECT * FROM project_basts WHERE id = ? AND client_id = ?", [$bastId, $clientId]);
    if (!$bast) {
        errorResponse('Dokumen BAST tidak ditemukan untuk klien ini', 404);
    }
    if ($bast['status'] === 'ditandatangani') {
        errorResponse('Dokumen BAST ini sudah ditandatangani sebelumnya', 400);
    }

    $db->execute(
        "UPDATE project_basts
         SET status = 'ditandatangani',
             pihak_kedua_nama = ?,
             pihak_kedua_jabatan = ?,
             signature_data = ?,
             signed_at = NOW(),
             signed_ip = ?
         WHERE id = ? AND client_id = ?",
        [$signedName, $signedPos, $signatureData, $_SERVER['REMOTE_ADDR'] ?? null, $bastId, $clientId]
    );

    logActivity('update', 'project_basts', $bastId, null, [
        'keterangan' => "Klien menandatangani BAST {$bast['nomor_bast']} secara digital oleh {$signedName}",
        'sumber' => $sumber
    ]);

    successResponse([
        'id' => $bastId,
        'nomor_bast' => $bast['nomor_bast'],
        'status' => 'ditandatangani',
        'pihak_kedua_nama' => $signedName,
        'pihak_kedua_jabatan' => $signedPos,
        'signed_at' => date('Y-m-d H:i:s')
    ], 'Berita Acara Serah Terima (BAST) berhasil ditandatangani secara sah');
}

/**
 * Ambil klien dari sesi login portal; hentikan dengan 401 bila sesi tidak sah.
 */
function portalCurrentClient(Database $db): array
{
    $clientId = (int)($_SESSION['portal_client_id'] ?? 0);
    $client = $clientId > 0 ? $db->fetch(
        "SELECT id, kode_klien, nama_perusahaan, penanggung_jawab, email, telepon, alamat, kota, status, portal_last_login_at
         FROM clients
         WHERE id = ? AND portal_password IS NOT NULL AND status IN ('aktif', 'prospek')",
        [$clientId]
    ) : null;

    if (!$client) {
        unset($_SESSION['portal_client_id'], $_SESSION['portal_csrf_token']);
        errorResponse('Sesi portal berakhir, silakan masuk kembali.', 401);
    }
    return $client;
}

function portalSaveTicketImages(array $images): array
{
    if (empty($images)) return [];
    $dir = __DIR__ . '/../../uploads/tickets';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }

    $saved = [];
    foreach (array_slice($images, 0, 5) as $img) {
        if (!is_array($img)) continue;
        $raw = (string)($img['data'] ?? '');
        $name = substr(preg_replace('/[^a-zA-Z0-9._-]/', '_', (string)($img['name'] ?? 'lampiran.png')), 0, 80);
        if (!preg_match('#^data:image/(png|jpe?g|webp|gif);base64,(.+)$#i', $raw, $m)) continue;

        $ext = strtolower($m[1]) === 'jpeg' ? 'jpg' : strtolower($m[1]);
        $bin = base64_decode($m[2], true);
        if ($bin === false || strlen($bin) > 3 * 1024 * 1024) continue;

        $fname = 'tkt_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        if (@file_put_contents($dir . '/' . $fname, $bin) !== false) {
            $saved[] = ['url' => 'uploads/tickets/' . $fname, 'name' => $name ?: $fname];
        }
    }
    return $saved;
}

function portalCreateTicket(Database $db, array $client, array $params): void
{
    $clientId = (int)$client['id'];
    $judul = trim((string)($params['judul'] ?? ''));
    $deskripsi = trim((string)($params['deskripsi'] ?? ''));
    $kategori = trim((string)($params['kategori'] ?? 'gangguan_sistem'));
    $prioritas = trim((string)($params['prioritas'] ?? 'sedang'));
    $projectId = !empty($params['project_id']) ? (int)$params['project_id'] : null;
    $maintenanceId = !empty($params['maintenance_id']) ? (int)$params['maintenance_id'] : null;
    $pelaporNama = trim((string)($params['pelapor_nama'] ?? '')) ?: ($client['penanggung_jawab'] ?: $client['nama_perusahaan']);
    $savedImgs = portalSaveTicketImages(is_array($params['lampiran'] ?? null) ? $params['lampiran'] : []);
    $lampiranJson = !empty($savedImgs) ? json_encode($savedImgs, JSON_UNESCAPED_UNICODE) : null;

    if ($judul === '' || ($deskripsi === '' && empty($savedImgs))) {
        errorResponse('Judul dan deskripsi gangguan wajib diisi', 422);
    }

    $validKat = ['gangguan_sistem', 'domain_ssl', 'perbaikan_bug', 'permintaan_fitur', 'billing', 'lainnya'];
    if (!in_array($kategori, $validKat, true)) $kategori = 'gangguan_sistem';

    $validPrio = ['rendah', 'sedang', 'tinggi', 'kritis'];
    if (!in_array($prioritas, $validPrio, true)) $prioritas = 'sedang';

    if ($projectId !== null) {
        $own = $db->fetch("SELECT id FROM projects WHERE id = ? AND client_id = ?", [$projectId, $clientId]);
        if (!$own) $projectId = null;
    }
    if ($maintenanceId !== null) {
        $ownM = $db->fetch("SELECT id FROM maintenance_sla WHERE id = ? AND client_id = ?", [$maintenanceId, $clientId]);
        if (!$ownM) $maintenanceId = null;
    }

    $prefix = 'TKT-' . date('Ym') . '-';
    $last = $db->fetch("SELECT nomor_tiket FROM client_tickets WHERE nomor_tiket LIKE ? ORDER BY id DESC LIMIT 1", [$prefix . '%']);
    $nextNum = $last ? ((int)substr($last['nomor_tiket'], -4) + 1) : 1;
    $nomorTiket = sprintf('%s%04d', $prefix, $nextNum);

    $ticketId = $db->insert(
        "INSERT INTO client_tickets (nomor_tiket, client_id, project_id, maintenance_id, kategori, prioritas, judul, deskripsi, lampiran_json, status, pelapor_nama)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'terbuka', ?)",
        [$nomorTiket, $clientId, $projectId, $maintenanceId, $kategori, $prioritas, $judul, $deskripsi, $lampiranJson, $pelaporNama]
    );

    logActivity('portal.ticket', 'client_tickets', (int)$ticketId, null, [
        'keterangan' => "Klien {$client['nama_perusahaan']} membuat tiket {$nomorTiket}: {$judul}"
    ]);

    successResponse(['id' => (int)$ticketId, 'nomor_tiket' => $nomorTiket], "Tiket {$nomorTiket} berhasil dikirim", 201);
}

function portalGetTicketDetail(Database $db, array $client, int $ticketId): void
{
    $clientId = (int)$client['id'];
    $ticket = $db->fetch(
        "SELECT t.*, p.nama_project, p.kode_project, ms.nama_aset, ms.domain_name
         FROM client_tickets t
         LEFT JOIN projects p ON t.project_id = p.id
         LEFT JOIN maintenance_sla ms ON t.maintenance_id = ms.id
         WHERE t.id = ? AND t.client_id = ?",
        [$ticketId, $clientId]
    );
    if (!$ticket) {
        errorResponse('Tiket tidak ditemukan', 404);
    }

    $replies = $db->fetchAll(
        "SELECT id, sender_type, sender_name, pesan, lampiran_json, created_at
         FROM client_ticket_replies
         WHERE ticket_id = ?
         ORDER BY id ASC",
        [$ticketId]
    );

    successResponse(['ticket' => $ticket, 'replies' => $replies]);
}

function portalReplyTicket(Database $db, array $client, array $params): void
{
    $clientId = (int)$client['id'];
    $ticketId = (int)($params['ticket_id'] ?? 0);
    $pesan = trim((string)($params['pesan'] ?? ''));
    $savedImgs = portalSaveTicketImages(is_array($params['lampiran'] ?? null) ? $params['lampiran'] : []);
    $lampiranJson = !empty($savedImgs) ? json_encode($savedImgs, JSON_UNESCAPED_UNICODE) : null;

    if ($ticketId <= 0 || ($pesan === '' && empty($savedImgs))) {
        errorResponse('Pesan balasan atau lampiran gambar wajib diisi', 422);
    }

    $ticket = $db->fetch("SELECT * FROM client_tickets WHERE id = ? AND client_id = ?", [$ticketId, $clientId]);
    if (!$ticket) {
        errorResponse('Tiket tidak ditemukan', 404);
    }

    $senderName = trim((string)($client['penanggung_jawab'] ?? '')) ?: $client['nama_perusahaan'];
    $db->insert(
        "INSERT INTO client_ticket_replies (ticket_id, sender_type, sender_name, pesan, lampiran_json) VALUES (?, 'client', ?, ?, ?)",
        [$ticketId, $senderName, $pesan, $lampiranJson]
    );

    if (in_array($ticket['status'], ['menunggu_klien', 'selesai', 'ditutup'], true)) {
        $db->execute("UPDATE client_tickets SET status = 'terbuka', resolved_at = NULL WHERE id = ?", [$ticketId]);
    }

    successResponse(null, 'Balasan tiket berhasil dikirim');
}

function portalCloseTicket(Database $db, array $client, int $ticketId): void
{
    $clientId = (int)$client['id'];
    $ticket = $db->fetch("SELECT * FROM client_tickets WHERE id = ? AND client_id = ?", [$ticketId, $clientId]);
    if (!$ticket) {
        errorResponse('Tiket tidak ditemukan', 404);
    }
    $db->execute("UPDATE client_tickets SET status = 'selesai', resolved_at = COALESCE(resolved_at, NOW()) WHERE id = ?", [$ticketId]);
    successResponse(null, 'Tiket ditandai selesai');
}

/**
 * Mengambil riwayat rilis / commit terbaru dari repositori Git lokal di deploy_path.
 */
function portalGetGitReleases(?string $deployPath, int $limit = 5): array
{
    $path = trim((string)$deployPath);
    if ($path === '' || !is_dir($path . DIRECTORY_SEPARATOR . '.git') || !function_exists('exec')) {
        return [];
    }

    $nullDev = DIRECTORY_SEPARATOR === '\\' ? '2>NUL' : '2>/dev/null';
    $cmd = 'git -C ' . escapeshellarg($path)
        . ' log -n ' . max(1, min(10, $limit))
        . ' --pretty=format:%h%x09%ad%x09%s --date=short ' . $nullDev;

    $lines = [];
    $code = 0;
    @exec($cmd, $lines, $code);
    if ($code !== 0 || empty($lines)) {
        return [];
    }

    $releases = [];
    foreach ($lines as $line) {
        $parts = explode("\t", $line, 3);
        if (count($parts) < 3) continue;
        $releases[] = [
            'hash' => trim($parts[0]),
            'date' => trim($parts[1]),
            'message' => trim($parts[2])
        ];
    }
    return $releases;
}

/**
 * Unggah bukti transfer pembayaran faktur langsung dari Portal Klien.
 */
function portalUploadProof(Database $db, array $client, array $params): void
{
    $clientId = (int)$client['id'];
    $invoiceId = (int)($params['invoice_id'] ?? 0);
    $buktiBase64 = (string)($params['bukti_base64'] ?? '');
    $catatan = trim((string)($params['catatan'] ?? ''));

    if ($invoiceId <= 0 || $buktiBase64 === '') {
        errorResponse('Faktur dan file bukti pembayaran wajib dipilih', 422);
    }

    $invoice = $db->fetch(
        "SELECT id, nomor_invoice, status, sisa_tagihan FROM invoices WHERE id = ? AND client_id = ?",
        [$invoiceId, $clientId]
    );
    if (!$invoice) {
        errorResponse('Faktur tidak ditemukan', 404);
    }
    if ((float)$invoice['sisa_tagihan'] <= 0 || $invoice['status'] === 'lunas') {
        errorResponse('Faktur ini sudah lunas', 422);
    }

    if (!preg_match('/^data:(image\/(?:jpeg|jpg|png|webp)|application\/pdf);base64,(.+)$/i', $buktiBase64, $matches)) {
        errorResponse('Format file harus berupa JPG, PNG, WebP, atau PDF', 422);
    }

    $mime = strtolower($matches[1]);
    $rawData = base64_decode($matches[2], true);
    if ($rawData === false || strlen($rawData) > 5 * 1024 * 1024) {
        errorResponse('Ukuran file maksimal 5 MB dan harus valid', 422);
    }

    $ext = $mime === 'application/pdf' ? 'pdf' : (str_contains($mime, 'png') ? 'png' : (str_contains($mime, 'webp') ? 'webp' : 'jpg'));
    $uploadDir = dirname(__DIR__, 2) . '/uploads/proofs';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $filename = 'proof_' . $invoice['id'] . '_' . time() . '.' . $ext;
    file_put_contents($uploadDir . '/' . $filename, $rawData);
    $relPath = 'uploads/proofs/' . $filename;

    $db->execute(
        "UPDATE invoices
         SET bukti_transfer = ?, bukti_transfer_catatan = ?, bukti_transfer_at = NOW(), payment_verification_status = 'pending'
         WHERE id = ?",
        [$relPath, $catatan, (int)$invoice['id']]
    );

    try {
        $db->insert(
            "INSERT INTO notifications (type, title, message, link, created_at) VALUES (?, ?, ?, ?, NOW())",
            [
                'payment_proof',
                'Bukti Pembayaran Portal',
                "Klien {$client['nama_perusahaan']} mengunggah bukti pembayaran untuk Faktur {$invoice['nomor_invoice']}",
                '#/invoices'
            ]
        );
    } catch (\Throwable $e) {
    }

    logActivity('portal.upload_proof', 'invoices', (int)$invoice['id'], null, [
        'keterangan' => "Klien mengunggah bukti pembayaran faktur {$invoice['nomor_invoice']} via portal",
        'sumber' => 'portal_pwa'
    ]);

    if (function_exists('clearCache')) {
        clearCache(['invoices', 'payments']);
    }

    successResponse(['bukti_transfer' => $relPath], 'Bukti pembayaran berhasil dikirim dan menunggu verifikasi tim kami');
}

/**
 * Pengesahan / tanda tangan digital Surat Penawaran langsung dari Portal Klien.
 */
function portalSignQuotation(Database $db, array $client, array $params): void
{
    $clientId = (int)$client['id'];
    $quoId = (int)($params['quotation_id'] ?? 0);
    $signedByName = trim((string)($params['signed_by_name'] ?? ''));
    $signedByPosition = trim((string)($params['signed_by_position'] ?? ''));
    $signatureData = (string)($params['signature_data'] ?? '');

    if ($quoId <= 0 || $signedByName === '' || $signatureData === '') {
        errorResponse('Nama penandatangan dan tanda tangan digital wajib diisi', 422);
    }
    if (!preg_match('/^data:image\/(png|jpeg|svg\+xml);base64,/i', $signatureData)) {
        errorResponse('Format tanda tangan digital tidak valid', 422);
    }

    $quo = $db->fetch("SELECT * FROM quotations WHERE id = ? AND client_id = ?", [$quoId, $clientId]);
    if (!$quo) {
        errorResponse('Surat penawaran tidak ditemukan', 404);
    }
    if (in_array($quo['status'], ['disetujui', 'dikonversi', 'ditolak'], true)) {
        errorResponse('Penawaran ini sudah diproses sebelumnya', 422);
    }

    $clientIp = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $db->execute(
        "UPDATE quotations
         SET status = 'disetujui', signed_by_name = ?, signed_by_position = ?, signature_data = ?, signed_at = NOW(), signed_ip = ?
         WHERE id = ?",
        [$signedByName, $signedByPosition, $signatureData, $clientIp, $quoId]
    );

    try {
        $db->insert(
            "INSERT INTO notifications (type, title, message, link, created_at) VALUES (?, ?, ?, ?, NOW())",
            [
                'quotation_signed',
                'Penawaran Disetujui Klien',
                "Klien {$client['nama_perusahaan']} menyetujui & menandatangani penawaran {$quo['nomor_penawaran']}",
                '#/quotations'
            ]
        );
    } catch (\Throwable $e) {
    }

    logActivity('portal.sign_quotation', 'quotations', $quoId, null, [
        'keterangan' => "Penawaran {$quo['nomor_penawaran']} disetujui oleh {$signedByName} via portal",
        'sumber' => 'portal_pwa'
    ]);

    if (function_exists('clearCache')) {
        clearCache(['quotations']);
    }

    successResponse(null, 'Penawaran berhasil disetujui & ditandatangani');
}

/**
 * Membuka rahasia kredensial yang dibagikan ke portal klien (show_in_portal = 1).
 */
function portalRevealCredential(Database $db, array $client, int $credId): void
{
    $clientId = (int)$client['id'];
    if ($credId <= 0) {
        errorResponse('ID kredensial tidak valid', 422);
    }

    $cred = $db->fetch(
        "SELECT id, judul, tipe, encrypted_secret FROM client_credentials WHERE id = ? AND client_id = ? AND show_in_portal = 1",
        [$credId, $clientId]
    );
    if (!$cred) {
        errorResponse('Kredensial tidak ditemukan atau tidak dibagikan ke portal', 404);
    }

    require_once __DIR__ . '/vault_helpers.php';
    $secret = decryptSecret((string)($cred['encrypted_secret'] ?? ''));

    logActivity('portal.reveal_credential', 'client_credentials', $credId, null, [
        'keterangan' => "Klien {$client['nama_perusahaan']} membuka kredensial portal: {$cred['judul']}",
        'sumber' => 'portal_pwa'
    ]);

    successResponse(['id' => $credId, 'secret' => $secret]);
}

/**
 * Pengesahan / tanda tangan digital Kontrak Kerja / SPK langsung dari Portal Klien.
 */
function portalSignContract(Database $db, array $client, array $params): void
{
    $clientId = (int)$client['id'];
    $contractId = (int)($params['contract_id'] ?? 0);
    $signedByName = trim((string)($params['signed_by_name'] ?? ''));
    $signedByPosition = trim((string)($params['signed_by_position'] ?? ''));
    $signatureData = (string)($params['signature_data'] ?? '');

    if ($contractId <= 0 || $signedByName === '' || $signatureData === '') {
        errorResponse('Nama penandatangan dan tanda tangan digital wajib diisi', 422);
    }
    if (!preg_match('/^data:image\/(png|jpeg|svg\+xml);base64,/i', $signatureData)) {
        errorResponse('Format tanda tangan digital tidak valid', 422);
    }

    $contract = $db->fetch("SELECT * FROM contracts WHERE id = ? AND client_id = ?", [$contractId, $clientId]);
    if (!$contract) {
        errorResponse('Dokumen kontrak tidak ditemukan', 404);
    }
    if ($contract['status'] === 'ditandatangani' || $contract['status'] === 'dibatalkan') {
        errorResponse('Dokumen kontrak ini tidak dapat ditandatangani lagi', 422);
    }

    $clientIp = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $db->execute(
        "UPDATE contracts
         SET status = 'ditandatangani', signed_by_name = ?, signed_by_position = ?, signature_data = ?, signed_at = NOW(), signed_ip = ?, updated_at = NOW()
         WHERE id = ?",
        [$signedByName, $signedByPosition, $signatureData, $clientIp, $contractId]
    );

    try {
        $db->insert(
            "INSERT INTO notifications (type, title, message, link, created_at) VALUES (?, ?, ?, ?, NOW())",
            [
                'contract_signed',
                'SPK / Kontrak Ditandatangani',
                "Klien {$client['nama_perusahaan']} menandatangani kontrak {$contract['nomor_kontrak']}",
                '#/contracts'
            ]
        );
    } catch (\Throwable $e) {
    }

    logActivity('portal.sign_contract', 'contracts', $contractId, null, [
        'keterangan' => "Kontrak {$contract['nomor_kontrak']} ditandatangani oleh {$signedByName} via portal",
        'sumber' => 'portal_pwa'
    ]);

    successResponse(null, 'Kontrak / SPK berhasil ditandatangani');
}
