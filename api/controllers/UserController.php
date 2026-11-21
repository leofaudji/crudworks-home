<?php
// UserController.php

authCheck();
checkPermission('user.manage');
$db = Database::getInstance();

if ($id && is_numeric($id)) {
    $userId = (int)$id;

    if ($method === 'GET') {
        $user = $db->fetch(
            "SELECT u.id, u.role_id, u.username, u.nama_lengkap, u.email, u.telepon, u.status, u.last_login, u.created_at, r.name as role_name, r.label as role_label 
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.id = ?",
            [$userId]
        );
        if (!$user) errorResponse('Pengguna tidak ditemukan', 404);
        successResponse($user);
    }

    if ($method === 'PUT') {
        $user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);
        if (!$user) errorResponse('Pengguna tidak ditemukan', 404);

        $namaLengkap = trim($params['nama_lengkap'] ?? '');
        $email = trim($params['email'] ?? '');
        $telepon = trim($params['telepon'] ?? '');
        $roleId = (int)($params['role_id'] ?? $user['role_id']);
        $status = in_array($params['status'] ?? '', ['aktif', 'nonaktif']) ? $params['status'] : 'aktif';

        if (empty($namaLengkap) || empty($email) || !$roleId) {
            errorResponse('Nama lengkap, email, dan peran wajib diisi');
        }

        // Cek email ganda
        $dup = $db->fetch("SELECT id FROM users WHERE email = ? AND id != ?", [$email, $userId]);
        if ($dup) errorResponse('Email sudah digunakan oleh pengguna lain');

        $updates = [
            "nama_lengkap = ?",
            "email = ?",
            "telepon = ?",
            "role_id = ?",
            "status = ?"
        ];
        $binds = [$namaLengkap, $email, $telepon, $roleId, $status];

        // Jika ada password baru
        if (!empty($params['password'])) {
            $updates[] = "password = ?";
            $binds[] = password_hash($params['password'], PASSWORD_BCRYPT);
        }

        $binds[] = $userId;
        $db->execute("UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?", $binds);

        logActivity('update', 'users', $userId, $user, $params);
        successResponse(['id' => $userId], 'Pengguna berhasil diperbarui');
    }

    if ($method === 'DELETE') {
        if ($userId === 1) {
            errorResponse('Pengguna Super Administrator utama (ID 1) tidak dapat dihapus');
        }

        $user = $db->fetch("SELECT * FROM users WHERE id = ?", [$userId]);
        if (!$user) errorResponse('Pengguna tidak ditemukan', 404);

        $db->execute("DELETE FROM users WHERE id = ?", [$userId]);
        logActivity('delete', 'users', $userId, $user);
        successResponse(null, 'Pengguna berhasil dihapus');
    }

    errorResponse('Metode tidak didukung', 405);
}

// Collection level: /api/users
if ($method === 'GET') {
    $page = (int)($params['page'] ?? 1);
    $perPage = (int)($params['per_page'] ?? PER_PAGE);
    $search = trim($params['search'] ?? '');

    $where = [];
    $bindings = [];

    if (!empty($search)) {
        $where[] = "(u.username LIKE ? OR u.nama_lengkap LIKE ? OR u.email LIKE ?)";
        $searchPattern = "%$search%";
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
        $bindings[] = $searchPattern;
    }

    $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $countQuery = "SELECT COUNT(*) FROM users u $whereSql";
    $query = "SELECT u.id, u.role_id, u.username, u.nama_lengkap, u.email, u.telepon, u.status, u.last_login, u.created_at, 
                     r.name as role_name, r.label as role_label
              FROM users u 
              JOIN roles r ON u.role_id = r.id 
              $whereSql 
              ORDER BY u.id ASC";

    paginatedResponse($query, $countQuery, $bindings, $page, $perPage);
}

if ($method === 'POST') {
    $username = trim($params['username'] ?? '');
    $password = trim($params['password'] ?? '');
    $namaLengkap = trim($params['nama_lengkap'] ?? '');
    $email = trim($params['email'] ?? '');
    $telepon = trim($params['telepon'] ?? '');
    $roleId = (int)($params['role_id'] ?? 2);
    $status = in_array($params['status'] ?? '', ['aktif', 'nonaktif']) ? $params['status'] : 'aktif';

    if (empty($username) || empty($password) || empty($namaLengkap) || empty($email)) {
        errorResponse('Username, kata sandi, nama lengkap, dan email wajib diisi');
    }

    $dup = $db->fetch("SELECT id FROM users WHERE username = ? OR email = ?", [$username, $email]);
    if ($dup) errorResponse('Username atau email sudah terdaftar dalam sistem');

    $hash = password_hash($password, PASSWORD_BCRYPT);

    $newId = $db->insert(
        "INSERT INTO users (role_id, username, password, nama_lengkap, email, telepon, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        [$roleId, $username, $hash, $namaLengkap, $email, $telepon, $status]
    );

    logActivity('create', 'users', $newId, null, ['username' => $username, 'email' => $email]);
    successResponse(['id' => $newId], 'Pengguna baru berhasil didaftarkan');
}

errorResponse('Metode tidak didukung', 405);
