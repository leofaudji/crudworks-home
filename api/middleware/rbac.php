<?php
// Role-Based Access Control Middleware

function checkPermission($permissionCode)
{
    $session = authCheck();
    $roleId = (int)($session['role_id'] ?? 0);

    // Super Admin (Role ID = 1) bypasses all permission checks
    if ($roleId === 1) {
        return true;
    }

    $db = Database::getInstance();

    if (is_array($permissionCode)) {
        if (empty($permissionCode)) return true;
        $inPlaceholders = implode(',', array_fill(0, count($permissionCode), '?'));
        $params = array_merge([$roleId], array_values($permissionCode));
        $count = $db->count(
            "SELECT COUNT(*) FROM role_permissions rp 
             JOIN permissions p ON rp.permission_id = p.id 
             WHERE rp.role_id = ? AND p.kode IN ($inPlaceholders)",
            $params
        );

        if ($count == 0) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Akses ditolak. Peran Anda tidak memiliki izin untuk fitur ini: ' . implode(', ', $permissionCode),
                'code' => 403
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        return true;
    }

    $count = $db->count(
        "SELECT COUNT(*) FROM role_permissions rp 
         JOIN permissions p ON rp.permission_id = p.id 
         WHERE rp.role_id = ? AND p.kode = ?",
        [$roleId, $permissionCode]
    );

    if ($count == 0) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Akses ditolak. Peran Anda tidak memiliki izin untuk fitur ini: ' . $permissionCode,
            'code' => 403
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    return true;
}

function getUserPermissions($roleId)
{
    $roleId = (int)$roleId;
    $redis = RedisManager::getInstance();
    $cacheKey = "rbac_perms_{$roleId}";
    $cached = $redis->get($cacheKey);
    if ($cached) return $cached;

    $db = Database::getInstance();
    $perms = $db->fetchAll(
        "SELECT p.kode FROM role_permissions rp 
         JOIN permissions p ON rp.permission_id = p.id 
         WHERE rp.role_id = ?",
        [$roleId]
    );
    
    $redis->set($cacheKey, $perms, 3600);
    return $perms;
}

function getUserMenus($roleId)
{
    $roleId = (int)$roleId;
    $redis = RedisManager::getInstance();
    $cacheKey = "rbac_menus_{$roleId}";
    $cached = $redis->get($cacheKey);
    if ($cached && is_array($cached)) return $cached;

    $jsonPath = __DIR__ . '/../config/menus.json';
    if (!file_exists($jsonPath)) return [];

    $allMenus = json_decode(file_get_contents($jsonPath), true);
    if (!is_array($allMenus)) return [];

    $permissions = [];
    if ($roleId !== 1) {
        $userPerms = getUserPermissions($roleId);
        $permissions = array_column($userPerms, 'kode');
    }

    $filter = function ($items) use (&$filter, $roleId, $permissions) {
        $result = [];
        foreach ($items as $m) {
            $hasPerm = ($roleId === 1) || empty($m['perm']) || in_array($m['perm'], $permissions);

            if (!empty($m['children'])) {
                $visibleChildren = $filter($m['children']);
                if (!empty($visibleChildren)) {
                    $m['children'] = $visibleChildren;
                    $result[] = $m;
                }
            } elseif ($hasPerm) {
                $result[] = $m;
            }
        }
        return $result;
    };

    $filteredMenus = $filter($allMenus);
    $redis->set($cacheKey, $filteredMenus, 3600);
    return $filteredMenus;
}
