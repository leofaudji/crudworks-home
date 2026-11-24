<?php
// Authentication Middleware

function authCheck()
{
    if (session_status() === PHP_SESSION_NONE) {
        session_name(SESSION_NAME);
        session_start();
    }

    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized. Sesi Anda telah berakhir, silakan login kembali.',
            'code' => 401
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Validasi apakah sesi belum dicabut oleh Manajemen Sesi Aktif
    try {
        $sid = session_id();
        if ($sid && class_exists('Database')) {
            $db = Database::getInstance();
            $sessRow = $db->fetch("SELECT is_revoked FROM user_sessions WHERE session_id = ? LIMIT 1", [$sid]);
            if ($sessRow && (int)$sessRow['is_revoked'] === 1) {
                $_SESSION = [];
                session_destroy();
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'message' => 'Sesi Anda telah dicabut dari perangkat lain. Silakan login kembali.',
                    'code' => 401
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            if ($sessRow) {
                $db->execute("UPDATE user_sessions SET last_activity = NOW() WHERE session_id = ?", [$sid]);
            }
        }
    } catch (\Throwable $e) {
        // Abaikan bila tabel user_sessions belum dimigrasi
    }

    return $_SESSION;
}

function getCurrentUser()
{
    if (session_status() === PHP_SESSION_NONE) {
        session_name(SESSION_NAME);
        session_start();
    }
    return [
        'id' => $_SESSION['user_id'] ?? null,
        'username' => $_SESSION['username'] ?? null,
        'nama_lengkap' => $_SESSION['nama_lengkap'] ?? null,
        'role_id' => $_SESSION['role_id'] ?? null,
        'role_name' => $_SESSION['role_name'] ?? null,
    ];
}

function isLoggedIn()
{
    if (session_status() === PHP_SESSION_NONE) {
        session_name(SESSION_NAME);
        session_start();
    }
    return isset($_SESSION['user_id']);
}
