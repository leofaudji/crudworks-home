<?php
// DashboardController.php

authCheck();
checkPermission('dashboard.view');
require_once __DIR__ . '/../config/project_helpers.php';

$db = Database::getInstance();

switch ($id) {
    case 'stats':
        // Cek cache Redis
        $redis = RedisManager::getInstance();
        $cached = $redis->get('dashboard_stats');
        if ($cached && is_array($cached)) {
            successResponse($cached);
        }

        // 1. Total Piutang Berjalan (Semua sisa tagihan dari invoice yang belum lunas/batal)
        $piutangRow = $db->fetch(
            "SELECT COALESCE(SUM(sisa_tagihan), 0) as total_piutang, COUNT(*) as count_piutang 
             FROM invoices 
             WHERE status IN ('dikirim', 'sebagian', 'jatuh_tempo')"
        );
        $totalPiutang = (float)($piutangRow['total_piutang'] ?? 0);

        // 2. Realisasi Pembayaran Bulan Ini
        $currentMonth = date('Y-m');
        $lunasRow = $db->fetch(
            "SELECT COALESCE(SUM(jumlah_bayar), 0) as total_bayar, COUNT(*) as count_transaksi 
             FROM payments 
             WHERE DATE_FORMAT(tanggal_bayar, '%Y-%m') = ?",
            [$currentMonth]
        );
        $totalBayarBulanIni = (float)($lunasRow['total_bayar'] ?? 0);

        // 3. Tagihan Jatuh Tempo (Overdue)
        $overdueRow = $db->fetch(
            "SELECT COALESCE(SUM(sisa_tagihan), 0) as total_overdue, COUNT(*) as count_overdue 
             FROM invoices 
             WHERE (status = 'jatuh_tempo' OR (status IN ('dikirim', 'sebagian') AND tanggal_jatuh_tempo < CURDATE())) 
               AND sisa_tagihan > 0"
        );
        $totalOverdue = (float)($overdueRow['total_overdue'] ?? 0);
        $countOverdue = (int)($overdueRow['count_overdue'] ?? 0);

        // 4. Klien Aktif
        $klienCount = (int)$db->count("SELECT COUNT(*) FROM clients WHERE status = 'aktif'");

        // 5. Total Proyek Aktif
        $projectCount = (int)$db->count("SELECT COUNT(*) FROM projects WHERE status = 'aktif'");

        // 6. Pengeluaran Operasional Bulan Ini
        $pengeluaranRow = $db->fetch(
            "SELECT COALESCE(SUM(jumlah), 0) as total_pengeluaran
             FROM expenses
             WHERE DATE_FORMAT(tanggal, '%Y-%m') = ? AND status != 'dibatalkan'",
            [$currentMonth]
        );
        $totalPengeluaranBulanIni = (float)($pengeluaranRow['total_pengeluaran'] ?? 0);
        $arusKasBersih = $totalBayarBulanIni - $totalPengeluaranBulanIni;

        $data = [
            'total_piutang' => $totalPiutang,
            'total_bayar_bulan_ini' => $totalBayarBulanIni,
            'total_pengeluaran_bulan_ini' => $totalPengeluaranBulanIni,
            'arus_kas_bersih_bulan_ini' => $arusKasBersih,
            'total_overdue' => $totalOverdue,
            'count_overdue' => $countOverdue,
            'total_klien_aktif' => $klienCount,
            'total_proyek_aktif' => $projectCount
        ];

        $redis->set('dashboard_stats', $data, 60);
        successResponse($data);
        break;

    case 'chart':
        // Ambil 6 bulan ke belakang
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $months[] = date('Y-m', strtotime("-$i months"));
        }

        $chartData = [];
        foreach ($months as $m) {
            $label = date('M Y', strtotime($m . '-01'));

            $billed = (float)$db->count(
                "SELECT COALESCE(SUM(total_tagihan), 0) FROM invoices WHERE DATE_FORMAT(tanggal_invoice, '%Y-%m') = ? AND status != 'batal'",
                [$m]
            );

            $paid = (float)$db->count(
                "SELECT COALESCE(SUM(jumlah_bayar), 0) FROM payments WHERE DATE_FORMAT(tanggal_bayar, '%Y-%m') = ?",
                [$m]
            );

            $chartData[] = [
                'period' => $m,
                'label' => $label,
                'billed' => $billed,
                'paid' => $paid
            ];
        }

        successResponse($chartData);
        break;

    case 'urgent':
        // Top 5 overdue invoices
        $urgentInvoices = $db->fetchAll(
            "SELECT i.id, i.nomor_invoice, i.tanggal_invoice, i.tanggal_jatuh_tempo, 
                    i.total_tagihan, i.sisa_tagihan, i.status,
                    c.nama_perusahaan, c.email as client_email, c.telepon as client_telepon,
                    DATEDIFF(CURDATE(), i.tanggal_jatuh_tempo) as hari_terlambat
             FROM invoices i
             JOIN clients c ON i.client_id = c.id
             WHERE (i.status = 'jatuh_tempo' OR (i.status IN ('dikirim', 'sebagian') AND i.tanggal_jatuh_tempo < CURDATE()))
               AND i.sisa_tagihan > 0
             ORDER BY i.tanggal_jatuh_tempo ASC
             LIMIT 5"
        );
        successResponse($urgentInvoices);
        break;

    case 'recent_activity':
        $activities = $db->fetchAll(
            "SELECT a.id, a.aksi, a.tabel, a.record_id, a.created_at, u.nama_lengkap as user_nama
             FROM audit_logs a
             JOIN users u ON a.user_id = u.id
             ORDER BY a.id DESC
             LIMIT 8"
        );
        successResponse($activities);
        break;

    case 'notifications':
        $alerts = [];

        // 1. Tiket Gangguan Baru / Update Terbaru dari Klien
        $openTickets = $db->fetchAll(
            "SELECT t.id, t.nomor_tiket, t.judul, t.prioritas, t.status, t.updated_at, c.nama_perusahaan
             FROM client_tickets t
             JOIN clients c ON t.client_id = c.id
             WHERE t.status IN ('terbuka', 'diproses')
             ORDER BY FIELD(t.prioritas, 'kritis', 'tinggi', 'sedang', 'rendah'), t.updated_at DESC
             LIMIT 6"
        );
        foreach ($openTickets as $t) {
            $isUrgent = in_array($t['prioritas'], ['kritis', 'tinggi'], true);
            $alerts[] = [
                'type' => $isUrgent ? 'danger' : 'warning',
                'title' => "Tiket {$t['nomor_tiket']}: {$t['judul']}",
                'detail' => "{$t['nama_perusahaan']} • " . strtoupper($t['status']) . " (" . strtoupper($t['prioritas']) . ")",
                'icon' => 'ri-customer-service-2-line',
                'url' => '#/tickets'
            ];
        }

        // 2. BAST Baru Ditandatangani Klien (7 hari terakhir)
        $signedBasts = $db->fetchAll(
            "SELECT b.id, b.nomor_bast, b.pihak_kedua_nama, b.signed_at, c.nama_perusahaan, p.nama_project
             FROM project_basts b
             JOIN clients c ON b.client_id = c.id
             JOIN projects p ON b.project_id = p.id
             WHERE b.status = 'ditandatangani'
               AND b.signed_at IS NOT NULL
               AND b.signed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY b.signed_at DESC
             LIMIT 5"
        );
        foreach ($signedBasts as $b) {
            $alerts[] = [
                'type' => 'success',
                'title' => "BAST {$b['nomor_bast']} Ditandatangani",
                'detail' => "{$b['nama_perusahaan']} ({$b['pihak_kedua_nama']}) • {$b['nama_project']}",
                'icon' => 'ri-file-shield-2-line',
                'url' => '#/projects'
            ];
        }

        // 3. Tagihan Jatuh Tempo / Overdue
        $urgentInvoices = $db->fetchAll(
            "SELECT i.id, i.nomor_invoice, i.tanggal_jatuh_tempo, i.sisa_tagihan,
                    c.nama_perusahaan, DATEDIFF(CURDATE(), i.tanggal_jatuh_tempo) as hari_terlambat
             FROM invoices i
             JOIN clients c ON i.client_id = c.id
             WHERE (i.status = 'jatuh_tempo' OR (i.status IN ('dikirim', 'sebagian') AND i.tanggal_jatuh_tempo < CURDATE()))
               AND i.sisa_tagihan > 0
             ORDER BY i.tanggal_jatuh_tempo ASC
             LIMIT 10"
        );
        foreach ($urgentInvoices as $inv) {
            $hari = (int)$inv['hari_terlambat'];
            $alerts[] = [
                'type' => $hari > 7 ? 'danger' : 'warning',
                'title' => "Tagihan {$inv['nomor_invoice']} Terlambat {$hari} Hari",
                'detail' => "{$inv['nama_perusahaan']} • Sisa: Rp " . number_format((float)$inv['sisa_tagihan'], 0, ',', '.'),
                'icon' => 'ri-error-warning-line',
                'url' => "#/invoices"
            ];
        }
        successResponse([
            'total_badge' => count($alerts),
            'alerts' => $alerts
        ]);
        break;

    case 'daily_brief':
        // Action Board Pagi Hari & Rekap Penagihan Otomatis (Executive Daily Brief)
        $today = date('Y-m-d');

        // 1. Tagihan Jatuh Tempo & Overdue
        $invoices = $db->fetchAll(
            "SELECT i.id, i.nomor_invoice, i.public_token, i.tanggal_invoice, i.tanggal_jatuh_tempo, 
                    i.total_tagihan, i.sisa_tagihan, i.status,
                    c.id as client_id, c.nama_perusahaan, c.penanggung_jawab, c.email as client_email, c.telepon as client_telepon,
                    DATEDIFF(CURDATE(), i.tanggal_jatuh_tempo) as hari_lewat
             FROM invoices i
             JOIN clients c ON i.client_id = c.id
             WHERE (i.status = 'jatuh_tempo' OR (i.status IN ('dikirim', 'sebagian') AND i.tanggal_jatuh_tempo <= CURDATE()))
               AND i.sisa_tagihan > 0
             ORDER BY i.tanggal_jatuh_tempo ASC"
        );

        $totalNominalMendesak = 0;
        foreach ($invoices as $inv) {
            $totalNominalMendesak += (float)$inv['sisa_tagihan'];
        }

        // 2. SLA Domain, Hosting, SSL & Maintenance yang expired <= 14 hari
        $maintenances = $db->fetchAll(
            "SELECT m.id, m.nama_aset, m.jenis, m.tanggal_berakhir, m.biaya_perpanjangan, m.status,
                    c.nama_perusahaan, c.penanggung_jawab, c.telepon as client_telepon,
                    p.nama_project,
                    DATEDIFF(m.tanggal_berakhir, CURDATE()) as sisa_hari
             FROM maintenance_sla m
             JOIN clients c ON m.client_id = c.id
             LEFT JOIN projects p ON m.project_id = p.id
             WHERE m.status IN ('aktif', 'segera_kadaluwarsa') AND m.tanggal_berakhir <= DATE_ADD(CURDATE(), INTERVAL 14 DAY)
             ORDER BY m.tanggal_berakhir ASC"
        );

        // 3. Milestone Proyek Siap Ditagihkan (Rencana dengan tanggal target <= hari ini atau tanpa tanggal target)
        $milestones = $db->fetchAll(
            "SELECT pm.id, pm.project_id, pm.nama_milestone, pm.persentase, pm.nominal, pm.tanggal_target,
                    p.nama_project, p.kode_project,
                    c.nama_perusahaan, c.penanggung_jawab, c.telepon as client_telepon
             FROM project_milestones pm
             JOIN projects p ON pm.project_id = p.id
             JOIN clients c ON p.client_id = c.id
             WHERE pm.status = 'rencana' AND (pm.tanggal_target IS NULL OR pm.tanggal_target <= CURDATE())
             ORDER BY pm.id ASC"
        );

        // 4. Insiden Uptime & Keamanan Server Klien (status 'down' atau SSL <= 7 hari)
        $incidents = $db->fetchAll(
            "SELECT p.id, p.kode_project, p.nama_project, p.app_url, p.last_health_status, 
                    p.last_latency_ms, p.last_ssl_days, p.last_checked_at,
                    c.nama_perusahaan
             FROM projects p
             JOIN clients c ON p.client_id = c.id
             WHERE (p.last_health_status = 'down' OR (p.last_ssl_days IS NOT NULL AND p.last_ssl_days <= 7))
             ORDER BY p.id ASC"
        );

        // Format Hari & Tanggal Indonesia
        $hariIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][date('w')];
        $bulanIndo = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][(int)date('n')];
        $formattedDate = $hariIndo . ', ' . date('j') . ' ' . $bulanIndo . ' ' . date('Y');

        $companyName = $db->fetch("SELECT nilai FROM app_settings WHERE kunci = 'company_name'")['nilai'] ?? 'CRUDWorks ERP';

        // Susun teks pesan WhatsApp Eksekutif (Executive Daily Brief)
        $waLines = [];
        $waLines[] = "☀️ *EXECUTIVE DAILY BRIEF - " . strtoupper($companyName) . "*";
        $waLines[] = "📅 {$formattedDate}";
        $waLines[] = "----------------------------------------";

        // Section 1: Invoices
        $countInv = count($invoices);
        $waLines[] = "💰 *TAGIHAN JATUH TEMPO & OVERDUE ({$countInv} Item)*";
        if ($countInv === 0) {
            $waLines[] = "• Seluruh tagihan aman terkendali, tidak ada tunggakan.";
        } else {
            foreach (array_slice($invoices, 0, 8) as $inv) {
                $hari = (int)$inv['hari_lewat'];
                $statusTag = $hari > 0 ? "OVERDUE {$hari} Hari" : "Jatuh Tempo Hari Ini";
                $nom = number_format((float)$inv['sisa_tagihan'], 0, ',', '.');
                $waLines[] = "• [{$statusTag}] {$inv['nomor_invoice']} - {$inv['nama_perusahaan']} (Rp {$nom})";
            }
            if ($countInv > 8) {
                $waLines[] = "• ...dan " . ($countInv - 8) . " tagihan lainnya";
            }
            $totNom = number_format($totalNominalMendesak, 0, ',', '.');
            $waLines[] = "👉 *Total Piutang Harus Ditagih: Rp {$totNom}*";
        }
        $waLines[] = "";

        // Section 2: Milestones
        $countMs = count($milestones);
        $waLines[] = "🚀 *TERMIN MILESTONE SIAP DITAGIH ({$countMs} Item)*";
        if ($countMs === 0) {
            $waLines[] = "• Belum ada termin baru yang siap ditagih hari ini.";
        } else {
            foreach (array_slice($milestones, 0, 5) as $ms) {
                $nomMs = number_format((float)$ms['nominal'], 0, ',', '.');
                $waLines[] = "• {$ms['nama_project']} - {$ms['nama_milestone']} (Rp {$nomMs})";
            }
        }
        $waLines[] = "";

        // Section 3: SLA Domain & Hosting
        $countMaint = count($maintenances);
        $waLines[] = "🌐 *SLA DOMAIN / HOSTING (< 14 HARI) ({$countMaint} Item)*";
        if ($countMaint === 0) {
            $waLines[] = "• Seluruh domain & server masa aktif aman.";
        } else {
            foreach (array_slice($maintenances, 0, 5) as $m) {
                $sisa = (int)$m['sisa_hari'];
                $sisaText = $sisa < 0 ? "KEDALUWARSA " . abs($sisa) . " hari lalu" : "Sisa {$sisa} hari";
                $waLines[] = "• {$m['nama_aset']} ({$m['nama_perusahaan']}) - {$sisaText}";
            }
        }
        $waLines[] = "";

        // Section 4: Server Health & Incidents
        $countInc = count($incidents);
        $waLines[] = "⚠️ *SERVER HEALTH & UPTIME MONITOR*";
        if ($countInc === 0) {
            $waLines[] = "• 🟢 Seluruh sistem proyek terpantau 100% ONLINE & SSL AMAN.";
        } else {
            foreach ($incidents as $inc) {
                $reason = $inc['last_health_status'] === 'down' ? 'SERVER DOWN' : "SSL Expired {$inc['last_ssl_days']} Hari";
                $waLines[] = "• 🔴 [{$reason}] {$inc['nama_project']} ({$inc['app_url']})";
            }
        }
        $waLines[] = "----------------------------------------";
        $waLines[] = "⚡ Tindak lanjuti langsung di ERP Dashboard.";

        $totalCriticalItems = $countInv + $countMaint + $countMs + $countInc;

        successResponse([
            'date_formatted' => $formattedDate,
            'total_critical_items' => $totalCriticalItems,
            'total_nominal_mendesak' => $totalNominalMendesak,
            'invoices' => $invoices,
            'maintenances' => $maintenances,
            'milestones' => $milestones,
            'incidents' => $incidents,
            'whatsapp_text' => implode("\n", $waLines)
        ]);
        break;

    case 'action_queue':
        $pendingProofs = $db->fetchAll(
            "SELECT i.id, i.nomor_invoice, i.sisa_tagihan, i.bukti_transfer_at, c.nama_perusahaan
             FROM invoices i
             JOIN clients c ON i.client_id = c.id
             WHERE i.payment_verification_status = 'pending'
             ORDER BY i.bukti_transfer_at DESC, i.id DESC
             LIMIT 5"
        );

        $openTickets = $db->fetchAll(
            "SELECT t.id, t.nomor_tiket, t.judul, t.prioritas, t.status, c.nama_perusahaan
             FROM client_tickets t
             JOIN clients c ON t.client_id = c.id
             WHERE t.status IN ('terbuka', 'diproses')
             ORDER BY FIELD(t.prioritas, 'kritis', 'tinggi', 'sedang', 'rendah'), t.updated_at DESC
             LIMIT 5"
        );

        $readyProjects = $db->fetchAll(
            "SELECT p.id, p.kode_project, p.nama_project, c.nama_perusahaan,
                    (SELECT COUNT(*) FROM project_basts b WHERE b.project_id = p.id AND b.status = 'draft') as bast_draft,
                    (SELECT COUNT(*) FROM project_basts b WHERE b.project_id = p.id AND b.status = 'ditandatangani') as bast_signed,
                    (SELECT COUNT(*) FROM project_tasks t WHERE t.project_id = p.id) as tasks_total,
                    (SELECT COUNT(*) FROM project_tasks t WHERE t.project_id = p.id AND t.status = 'selesai') as tasks_done,
                    (SELECT COUNT(*) FROM project_milestones pm WHERE pm.project_id = p.id AND pm.status = 'rencana') as ms_unbilled
             FROM projects p
             JOIN clients c ON p.client_id = c.id
             WHERE p.status = 'aktif'
             HAVING bast_draft > 0
                 OR (tasks_total > 0 AND tasks_done = tasks_total AND bast_signed = 0)
                 OR ((bast_signed > 0 OR (tasks_total > 0 AND tasks_done = tasks_total)) AND ms_unbilled > 0)
             ORDER BY p.id DESC
             LIMIT 5"
        );

        $expiringDomains = $db->fetchAll(
            "SELECT m.id, m.nama_aset, m.domain_name, m.tanggal_berakhir, c.nama_perusahaan,
                    DATEDIFF(m.tanggal_berakhir, CURDATE()) as sisa_hari
             FROM maintenance_sla m
             JOIN clients c ON m.client_id = c.id
             WHERE m.status IN ('aktif', 'segera_kadaluwarsa')
               AND m.tanggal_berakhir <= DATE_ADD(CURDATE(), INTERVAL 14 DAY)
             ORDER BY m.tanggal_berakhir ASC
             LIMIT 5"
        );

        successResponse([
            'pending_proofs' => $pendingProofs,
            'open_tickets' => $openTickets,
            'ready_projects' => $readyProjects,
            'expiring_domains' => $expiringDomains
        ]);
        break;

    case 'overview_extra':
        $lifecycleCols = projectLifecycleSubqueriesSql('p');
        $projRows = $db->fetchAll(
            "SELECT p.id, p.status,
                    $lifecycleCols
             FROM projects p
             WHERE p.status != 'dibatalkan'"
        );

        $pipeline = [
            'penawaran' => 0,
            'spk' => 0,
            'digarap' => 0,
            'belum_bast' => 0,
            'termin_bayar' => 0,
            'belum_dibayar' => 0,
            'selesai' => 0
        ];

        foreach ($projRows as $pr) {
            $phase = resolveProjectLifecyclePhase($pr);
            if (isset($pipeline[$phase])) {
                $pipeline[$phase]++;
            }
        }

        $topClients = $db->fetchAll(
            "SELECT c.id, c.kode_klien, c.nama_perusahaan,
                    COALESCE((SELECT SUM(py.jumlah_bayar) FROM payments py JOIN invoices inv ON py.invoice_id = inv.id WHERE inv.client_id = c.id), 0) as total_paid,
                    COALESCE((SELECT SUM(inv.sisa_tagihan) FROM invoices inv WHERE inv.client_id = c.id AND inv.status != 'batal'), 0) as total_unpaid,
                    (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id AND p.status = 'aktif') as active_projects
             FROM clients c
             WHERE c.status = 'aktif'
             ORDER BY total_paid DESC, active_projects DESC
             LIMIT 5"
        );

        $bankAccounts = $db->fetchAll(
            "SELECT pm.id, pm.nama_metode, pm.nama_bank, pm.nomor_rekening, pm.tipe, pm.is_default, pm.coa_id,
                    coa.kode_akun, coa.nama_akun,
                    COALESCE((SELECT SUM(ji.debit - ji.kredit) FROM journal_items ji WHERE ji.coa_id = pm.coa_id), 0) AS saldo_coa
             FROM payment_methods pm
             LEFT JOIN chart_of_accounts coa ON pm.coa_id = coa.id
             WHERE pm.status = 'aktif'
             ORDER BY pm.is_default DESC, pm.id ASC"
        );
        $seenCoaIds = [];
        $totalCashBalance = 0.0;
        foreach ($bankAccounts as &$ba) {
            $ba['saldo_coa'] = round((float)$ba['saldo_coa'], 2);
            $cid = (int)($ba['coa_id'] ?? 0);
            if ($cid > 0 && !isset($seenCoaIds[$cid])) {
                $seenCoaIds[$cid] = true;
                $totalCashBalance += $ba['saldo_coa'];
            }
        }
        unset($ba);
        if (empty($seenCoaIds)) {
            $fallbackRow = $db->fetch(
                "SELECT COALESCE(SUM(ji.debit - ji.kredit), 0) AS saldo
                 FROM chart_of_accounts coa
                 LEFT JOIN journal_items ji ON ji.coa_id = coa.id
                 WHERE coa.kode_akun = '1101'"
            );
            $totalCashBalance = round((float)($fallbackRow['saldo'] ?? 0), 2);
        }

        $pendingQuotations = $db->fetchAll(
            "SELECT q.id, q.nomor_penawaran, q.tanggal_penawaran, q.berlaku_hingga, q.total_penawaran,
                    q.last_sent_at, q.view_count,
                    DATEDIFF(CURDATE(), COALESCE(DATE(q.last_sent_at), q.tanggal_penawaran)) AS days_waiting,
                    c.nama_perusahaan, c.penanggung_jawab, c.telepon
             FROM quotations q
             JOIN clients c ON q.client_id = c.id
             WHERE q.status = 'terkirim'
             ORDER BY days_waiting DESC, q.total_penawaran DESC
             LIMIT 5"
        );
        $pendingQuotationSummary = $db->fetch(
            "SELECT COUNT(*) AS total_count, COALESCE(SUM(total_penawaran), 0) AS total_nilai
             FROM quotations
             WHERE status = 'terkirim'"
        );

        successResponse([
            'pipeline' => $pipeline,
            'total_projects' => count($projRows),
            'top_clients' => $topClients,
            'bank_balances' => [
                'total_cash' => round($totalCashBalance, 2),
                'accounts' => $bankAccounts
            ],
            'pending_quotations' => [
                'total_count' => (int)($pendingQuotationSummary['total_count'] ?? 0),
                'total_nilai' => round((float)($pendingQuotationSummary['total_nilai'] ?? 0), 2),
                'items' => $pendingQuotations
            ]
        ]);
        break;

    default:
        errorResponse('Sub-aksi dashboard tidak ditemukan', 404);
}
