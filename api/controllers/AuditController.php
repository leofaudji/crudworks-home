<?php
// AuditController.php

authCheck();
checkPermission('audit.view');
$db = Database::getInstance();

if ($id === 'login-attempts' && $method === 'GET') {
    $page = max(1, (int)($params['page'] ?? 1));
    $perPage = min(100, max(5, (int)($params['per_page'] ?? PER_PAGE)));
    $search = trim((string)($params['search'] ?? ''));

    $where = [];
    $bindings = [];
    if ($search !== '') {
        $like = "%{$search}%";
        $where[] = "(username LIKE ? OR ip_address LIKE ?)";
        array_push($bindings, $like, $like);
    }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $countQuery = "SELECT COUNT(*) FROM (SELECT username, ip_address FROM login_attempts {$whereSql} GROUP BY username, ip_address) t";
    $query = "SELECT username, ip_address,
                     COUNT(*) as total_attempts,
                     SUM(CASE WHEN attempted_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE) THEN 1 ELSE 0 END) as active_attempts,
                     MAX(attempted_at) as last_attempt_at
              FROM login_attempts
              {$whereSql}
              GROUP BY username, ip_address
              ORDER BY last_attempt_at DESC";

    paginatedResponse($query, $countQuery, $bindings, $page, $perPage);
}

if ($id === 'unlock-login' && $method === 'POST') {
    checkPermission(['user.manage', 'settings.edit', 'audit.view']);
    $clearAll = !empty($params['clear_all']);
    if ($clearAll) {
        $db->execute("DELETE FROM login_attempts");
        logActivity('unlock_login_all', 'login_attempts', 0);
        successResponse(null, 'Seluruh catatan rate limit login berhasil dibersihkan');
    }

    $username = trim((string)($params['username'] ?? ''));
    $ip = trim((string)($params['ip_address'] ?? ''));
    if ($username === '' || $ip === '') {
        errorResponse('Username dan IP address wajib disertakan', 422);
    }
    $db->execute("DELETE FROM login_attempts WHERE username = ? AND ip_address = ?", [$username, $ip]);
    logActivity('unlock_login', 'login_attempts', 0, null, ['username' => $username, 'ip_address' => $ip]);
    successResponse(null, "Blokir login untuk {$username} ({$ip}) berhasil dibuka");
}

if ($method === 'GET') {
    $page = (int)($params['page'] ?? 1);
    $perPage = (int)($params['per_page'] ?? PER_PAGE);
    $search = trim($params['search'] ?? '');
    $tabel = trim($params['tabel'] ?? '');

    $where = [];
    $bindings = [];

    if (!empty($search)) {
        $where[] = "(a.aksi LIKE ? OR a.tabel LIKE ? OR u.nama_lengkap LIKE ? OR u.username LIKE ?)";
        $searchPattern = "%$search%";
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
    }

    if (!empty($tabel)) {
        $where[] = "a.tabel = ?";
        $bindings[] = $tabel;
    }

    $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $countQuery = "SELECT COUNT(*) FROM audit_logs a JOIN users u ON a.user_id = u.id $whereSql";
    $query = "SELECT a.*, u.nama_lengkap as user_nama, u.username as user_uname
              FROM audit_logs a 
              JOIN users u ON a.user_id = u.id 
              $whereSql 
              ORDER BY a.id DESC";

    paginatedResponse($query, $countQuery, $bindings, $page, $perPage);
}

errorResponse('Metode tidak didukung', 405);
