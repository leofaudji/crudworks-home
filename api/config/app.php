<?php
// Set default timezone
date_default_timezone_set("Asia/Jakarta");

// Application Configuration
define('APP_NAME', getenv('APP_NAME') ?: 'CRUDWorks ERP');
define('APP_VERSION', '1.8.16');
define('APP_URL', getenv('APP_URL') ?: 'http://crudworks-home.test');

// Session
define('SESSION_NAME', getenv('SESSION_NAME') ?: 'CRUDWORKS_SESSID');
define('SESSION_LIFETIME', (int)(getenv('SESSION_LIFETIME') ?: 86400)); // 24 hours

// Pagination default
define('PER_PAGE', 15);

// Redis Configuration
define('REDIS_HOST', getenv('REDIS_HOST') ?: '127.0.0.1');
define('REDIS_PORT', (int)(getenv('REDIS_PORT') ?: 6379));
define('REDIS_PASS', getenv('REDIS_PASS') ?: null);
define('REDIS_DB', (int)(getenv('REDIS_DB') ?: 0));
define('REDIS_PREFIX', getenv('REDIS_PREFIX') ?: 'crudworks_');

// Path Integrasi app-git
define('APP_GIT_PATH', getenv('APP_GIT_PATH') ?: 'd:/laragon/www/app-git');

/**
 * Bangun URL publik aplikasi (tahan reverse-proxy / Cloudflare & tidak jatuh ke localhost di produksi).
 */
function buildPublicAppUrl(string $hashPath = ''): string
{
    $isLocal = static function (string $h): bool {
        return $h === '' || (bool)preg_match('/^(localhost|127\.0\.0\.1)(:\d+)?$/i', trim($h));
    };

    $xfProto = trim((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));
    $scheme = (
        ($xfProto !== '' && strtolower(explode(',', $xfProto)[0]) === 'https') ||
        (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
        ((string)($_SERVER['SERVER_PORT'] ?? '') === '443')
    ) ? 'https' : 'http';

    $base = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/index.php')), '/\\');
    if ($base === '.' || $base === '/') {
        $base = '';
    }

    $xfHost = trim(explode(',', (string)($_SERVER['HTTP_X_FORWARDED_HOST'] ?? ''))[0]);
    $httpHost = trim((string)($_SERVER['HTTP_HOST'] ?? ''));
    $host = '';

    if (!$isLocal($xfHost)) {
        $host = $xfHost;
    } elseif (!$isLocal($httpHost)) {
        $host = $httpHost;
    } else {
        foreach (['HTTP_ORIGIN', 'HTTP_REFERER'] as $hdr) {
            $raw = trim((string)($_SERVER[$hdr] ?? ''));
            if ($raw !== '') {
                $parts = @parse_url($raw);
                $h = (string)($parts['host'] ?? '');
                if (!$isLocal($h)) {
                    $host = $h . (!empty($parts['port']) ? ':' . $parts['port'] : '');
                    if (!empty($parts['scheme'])) {
                        $scheme = $parts['scheme'];
                    }
                    break;
                }
            }
        }
    }

    if ($host === '') {
        $appParts = @parse_url((string)APP_URL);
        $appHost = (string)($appParts['host'] ?? '');
        if (!$isLocal($appHost) && $appHost !== 'crudworks-home.test') {
            $baseUrl = rtrim((string)APP_URL, '/');
            return $baseUrl . '/' . ltrim($hashPath, '/');
        }
        $host = $httpHost !== '' ? $httpHost : 'localhost';
    }

    return "{$scheme}://{$host}{$base}/" . ltrim($hashPath, '/');
}

/**
 * Kirim HTTP Security Headers standar produksi untuk mencegah clickjacking, MIME sniffing, dan kebocoran referrer.
 */
function emitSecurityHeaders(): void
{
    if (headers_sent()) {
        return;
    }
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

    $xfProto = trim((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));
    $isHttps = ($xfProto !== '' && strtolower(explode(',', $xfProto)[0]) === 'https')
        || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ((string)($_SERVER['SERVER_PORT'] ?? '') === '443');
    if ($isHttps) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}
define('APP_GIT_URL', getenv('APP_GIT_URL') ?: 'http://app-git.test');
