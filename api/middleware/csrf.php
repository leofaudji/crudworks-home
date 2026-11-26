<?php
// CSRF Protection Middleware

function generateCsrfToken()
{
    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $token;
    return $token;
}

function getCsrfToken()
{
    if (empty($_SESSION['csrf_token'])) {
        return generateCsrfToken();
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken()
{
    $method = $_SERVER['REQUEST_METHOD'];

    // Only validate state-changing requests
    if (!in_array($method, ['POST', 'PUT', 'DELETE'])) {
        return true;
    }

    // Skip CSRF for login endpoint, webhooks, and token-protected public portals
    $route = isset($_GET['route']) ? trim($_GET['route'], '/') : '';
    if (in_array($route, ['auth/login', 'auth/check', 'portal-auth/login']) || str_starts_with($route, 'public-invoice') || str_starts_with($route, 'public-quotation') || str_starts_with($route, 'client-portal') || str_starts_with($route, 'payment-gateway')) {
        return true;
    }

    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';

    // Portal Klien mandiri memakai token CSRF sendiri agar tidak bentrok dengan sesi admin
    if (str_starts_with($route, 'portal-auth')) {
        if (empty($token) || empty($_SESSION['portal_csrf_token']) || !hash_equals($_SESSION['portal_csrf_token'], $token)) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Sesi portal tidak valid atau telah kedaluwarsa. Silakan muat ulang halaman.',
                'code' => 403
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        return true;
    }

    if (empty($token) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'CSRF token tidak valid atau telah kedaluwarsa. Silakan refresh halaman.',
            'code' => 403
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    return true;
}
