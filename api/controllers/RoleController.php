<?php
// RoleController.php

authCheck();
checkPermission('role.manage');
$db = Database::getInstance();

if ($id === 'permissions') {
    // List all permissions grouped by kategori
    $perms = $db->fetchAll("SELECT * FROM permissions ORDER BY kategori ASC, id ASC");
    $grouped = [];
    foreach ($perms as $p) {
        $kat = $p['kategori'];
        if (!isset($grouped[$kat])) $grouped[$kat] = [];
        $grouped[$kat][] = $p;
    }
    successResponse($grouped);
}

if ($id && is_numeric($id)) {
    $roleId = (int)$id;

    if ($method === 'GET') {
        $role = $db->fetch("SELECT * FROM roles WHERE id = ?", [$roleId]);
        if (!$role) errorResponse('Role tidak ditemukan', 404);

        $assignedPerms = $db->fetchAll(
            "SELECT p.kode FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = ?",
            [$roleId]
        );
        $role['permissions'] = array_column($assignedPerms, 'kode');

        successResponse($role);
    }

    if ($method === 'PUT') {
        if ($roleId === 1) {
            errorResponse('Peran Super Administrator utama (ID 1) tidak dapat diubah izinnya.');
        }

        $role = $db->fetch("SELECT * FROM roles WHERE id = ?", [$roleId]);
        if (!$role) errorResponse('Role tidak ditemukan', 404);

        $label = trim($params['label'] ?? '');
        $description = trim($params['description'] ?? '');
        $perms = $params['permissions'] ?? [];

        if (empty($label)) {
            errorResponse('Nama label peran wajib diisi');
        }

        $pdo = $db->getPdo();
        $pdo->beginTransaction();

        try {
            $stmt = $pdo->prepare("UPDATE roles SET label = ?, description = ? WHERE id = ?");
            $stmt->execute([$label, $description, $roleId]);

            // Hapus izin lama
            $pdo->prepare("DELETE FROM role_permissions WHERE role_id = ?")->execute([$roleId]);

            // Pasang izin baru
            if (is_array($perms) && !empty($perms)) {
                $stmtInsert = $pdo->prepare(
                    "INSERT INTO role_permissions (role_id, permission_id) 
                     SELECT ?, id FROM permissions WHERE kode = ?"
                );
                foreach ($perms as $permCode) {
                    $stmtInsert->execute([$roleId, $permCode]);
                }
            }

            $pdo->commit();
            clearCache(['rbac' => $roleId]);
            logActivity('update', 'roles', $roleId, $role, $params);

            successResponse(['id' => $roleId], 'Izin peran berhasil diperbarui');
        } catch (\Throwable $e) {
            $pdo->rollBack();
            errorResponse('Gagal memperbarui izin peran: ' . $e->getMessage(), 500);
        }
    }

    errorResponse('Metode tidak didukung', 405);
}

// Collection level: /api/roles
if ($method === 'GET') {
    $roles = $db->fetchAll(
        "SELECT r.*, 
                (SELECT COUNT(*) FROM role_permissions WHERE role_id = r.id) as total_permissions,
                (SELECT COUNT(*) FROM users WHERE role_id = r.id) as total_users
         FROM roles r 
         ORDER BY r.id ASC"
    );
    successResponse($roles);
}

errorResponse('Metode tidak didukung', 405);
