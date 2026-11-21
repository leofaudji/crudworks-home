<?php
// api/cron/daily_brief.php
// CLI & Cron Runner untuk Action Board Pagi Hari & Rekap Penagihan Otomatis (Executive Daily Brief)

declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../config/database.php';

$isCli = (php_sapi_name() === 'cli' || defined('STDIN'));

if (!$isCli) {
    // Proteksi via token jika dipanggil melalui HTTP URL
    $token = $_GET['token'] ?? '';
    $cronSecret = getenv('CRON_SECRET') ?: 'crudworks_daily_secret_2026';
    if ($token !== $cronSecret) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Akses ditolak: token tidak valid']);
        exit;
    }
}

$db = Database::getInstance();

// 1. Tagihan Jatuh Tempo & Overdue
$invoices = $db->fetchAll(
    "SELECT i.id, i.nomor_invoice, i.tanggal_invoice, i.tanggal_jatuh_tempo, 
            i.total_tagihan, i.sisa_tagihan, i.status,
            c.nama_perusahaan, c.penanggung_jawab, c.telepon as client_telepon,
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

// 2. SLA Domain, Hosting & Maintenance Expired <= 14 hari
$maintenances = $db->fetchAll(
    "SELECT m.id, m.nama_aset, m.jenis, m.tanggal_berakhir, m.biaya_perpanjangan,
            c.nama_perusahaan, c.penanggung_jawab, c.telepon as client_telepon,
            p.nama_project,
            DATEDIFF(m.tanggal_berakhir, CURDATE()) as sisa_hari
     FROM maintenance_sla m
     JOIN clients c ON m.client_id = c.id
     LEFT JOIN projects p ON m.project_id = p.id
     WHERE m.status IN ('aktif', 'segera_kadaluwarsa') AND m.tanggal_berakhir <= DATE_ADD(CURDATE(), INTERVAL 14 DAY)
     ORDER BY m.tanggal_berakhir ASC"
);

// 3. Milestone Proyek Siap Ditagih
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

// 4. Insiden Server Uptime & SSL
$incidents = $db->fetchAll(
    "SELECT p.id, p.kode_project, p.nama_project, p.app_url, p.last_health_status, 
            p.last_latency_ms, p.last_ssl_days, p.last_checked_at,
            c.nama_perusahaan
     FROM projects p
     JOIN clients c ON p.client_id = c.id
     WHERE (p.last_health_status = 'down' OR (p.last_ssl_days IS NOT NULL AND p.last_ssl_days <= 7))
     ORDER BY p.id ASC"
);

$hariIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][date('w')];
$bulanIndo = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][(int)date('n')];
$formattedDate = $hariIndo . ', ' . date('j') . ' ' . $bulanIndo . ' ' . date('Y');

$companyName = $db->fetch("SELECT nilai FROM app_settings WHERE kunci = 'company_name'")['nilai'] ?? 'CRUDWorks ERP';

// Susun ringkasan teks WhatsApp
$waLines = [];
$waLines[] = "☀️ *EXECUTIVE DAILY BRIEF - " . strtoupper($companyName) . "*";
$waLines[] = "📅 {$formattedDate}";
$waLines[] = "----------------------------------------";

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
$waLines[] = "⚡ Akses dashboard: " . (getenv('APP_URL') ?: 'http://localhost/crudworks-home');

$textBrief = implode("\n", $waLines);

if ($isCli) {
    echo PHP_EOL . "========================================" . PHP_EOL;
    echo "  CRUDWorks ERP — Executive Daily Brief  " . PHP_EOL;
    echo "========================================" . PHP_EOL . PHP_EOL;
    echo $textBrief . PHP_EOL . PHP_EOL;
    exit(0);
} else {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => true,
        'date' => $formattedDate,
        'stats' => [
            'invoices_count' => $countInv,
            'total_piutang_mendesak' => $totalNominalMendesak,
            'milestones_count' => $countMs,
            'maintenances_count' => $countMaint,
            'incidents_count' => $countInc,
            'total_critical_items' => $countInv + $countMs + $countMaint + $countInc
        ],
        'whatsapp_text' => $textBrief
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit(0);
}
