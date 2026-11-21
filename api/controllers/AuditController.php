<?php
// AuditController.php

authCheck();
checkPermission('audit.view');
$db = Database::getInstance();

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
