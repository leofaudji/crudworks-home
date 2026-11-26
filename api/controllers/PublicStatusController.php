<?php
declare(strict_types=1);

// PublicStatusController.php — Status Page Layanan Publik (NO AUTH REQUIRED)
$db = Database::getInstance();

if ($method !== 'GET') {
    errorResponse('Metode tidak didukung', 405);
}

$settingsRows = $db->fetchAll("SELECT kunci, nilai FROM app_settings WHERE kunci IN ('company_name', 'company_tagline', 'app_name')");
$company = [];
foreach ($settingsRows as $r) {
    $company[$r['kunci']] = $r['nilai'];
}

$clientCode = trim((string)($params['client'] ?? ''));
$where = ["ms.status != 'dihentikan'"];
$binds = [];
if ($clientCode !== '') {
    $where[] = "UPPER(c.kode_klien) = UPPER(?)";
    $binds[] = $clientCode;
}

$services = $db->fetchAll(
    "SELECT ms.id, ms.nama_aset, ms.jenis, ms.domain_name, ms.uptime_status,
            ms.http_status_code, ms.response_time_ms, ms.ssl_valid_until, ms.ssl_days_left, ms.last_check_at
     FROM maintenance_sla ms
     JOIN clients c ON ms.client_id = c.id
     WHERE " . implode(' AND ', $where) . "
     ORDER BY FIELD(ms.uptime_status, 'down', 'warning', 'online', 'unknown'), ms.nama_aset ASC",
    $binds
);

$ids = array_map(fn($s) => (int)$s['id'], $services);
$logsByTarget = [];
if (!empty($ids)) {
    $ph = implode(',', array_fill(0, count($ids), '?'));
    $logs = $db->fetchAll(
        "SELECT target_id, uptime_status, response_time_ms, http_code, checked_at
         FROM uptime_health_logs
         WHERE target_type = 'sla' AND target_id IN ({$ph})
         ORDER BY id DESC
         LIMIT 500",
        $ids
    );
    foreach ($logs as $lg) {
        $tid = (int)$lg['target_id'];
        if (!isset($logsByTarget[$tid])) $logsByTarget[$tid] = [];
        if (count($logsByTarget[$tid]) < 24) {
            $logsByTarget[$tid][] = $lg;
        }
    }
}

$onlineCnt = 0; $warningCnt = 0; $downCnt = 0; $totalMs = 0; $msCnt = 0;
foreach ($services as &$s) {
    $sid = (int)$s['id'];
    $hist = array_reverse($logsByTarget[$sid] ?? []);
    $s['history'] = $hist;

    $okLogs = count(array_filter($hist, fn($h) => $h['uptime_status'] === 'online'));
    $s['uptime_pct'] = count($hist) > 0 ? round(($okLogs / count($hist)) * 100, 1) : ($s['uptime_status'] === 'online' ? 100.0 : null);

    if ($s['uptime_status'] === 'online') $onlineCnt++;
    elseif ($s['uptime_status'] === 'warning') $warningCnt++;
    elseif ($s['uptime_status'] === 'down') $downCnt++;

    if (!empty($s['response_time_ms'])) {
        $totalMs += (int)$s['response_time_ms'];
        $msCnt++;
    }
}
unset($s);

$overall = 'operational';
if ($downCnt > 0) $overall = 'outage';
elseif ($warningCnt > 0) $overall = 'degraded';

successResponse([
    'company' => $company,
    'overall_status' => $overall,
    'summary' => [
        'total' => count($services),
        'online' => $onlineCnt,
        'warning' => $warningCnt,
        'down' => $downCnt,
        'avg_response_ms' => $msCnt > 0 ? (int)round($totalMs / $msCnt) : 0,
    ],
    'services' => $services,
    'checked_at' => date('Y-m-d H:i:s'),
]);
