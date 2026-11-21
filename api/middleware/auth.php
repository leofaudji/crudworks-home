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
