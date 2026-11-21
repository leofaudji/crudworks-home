<?php
// api/config/vault_helpers.php - Helpers for AES-256 Vault Encryption & HTTP/SSL Health Check

define('VAULT_CIPHER', 'aes-256-cbc');

function getVaultKey(): string
{
    $key = getenv('APP_KEY') ?: 'crudworks-secret-vault-key-2026-secure-salt';
    return hash('sha256', $key, true);
}

function encryptSecret(string $plainText): string
{
    if ($plainText === '') return '';
    $key = getVaultKey();
    $ivLength = openssl_cipher_iv_length(VAULT_CIPHER);
    $iv = openssl_random_pseudo_bytes($ivLength);
    $encrypted = openssl_encrypt($plainText, VAULT_CIPHER, $key, OPENSSL_RAW_DATA, $iv);
    return base64_encode($iv . $encrypted);
}

function decryptSecret(string $cipherText): string
{
    if ($cipherText === '') return '';
    $raw = base64_decode($cipherText, true);
    if ($raw === false) return '';
    $key = getVaultKey();
    $ivLength = openssl_cipher_iv_length(VAULT_CIPHER);
    if (strlen($raw) < $ivLength) return '';
    $iv = substr($raw, 0, $ivLength);
    $ciphertextRaw = substr($raw, $ivLength);
    $decrypted = openssl_decrypt($ciphertextRaw, VAULT_CIPHER, $key, OPENSSL_RAW_DATA, $iv);
    return $decrypted !== false ? $decrypted : '';
}

/**
 * Check HTTP/HTTPS status, response time, and SSL validity
 */
function checkUptimeAndSsl(string $rawUrl, int $timeout = 6): array
{
    $url = trim($rawUrl);
    if (!preg_match('~^https?://~i', $url)) {
        $url = 'https://' . $url;
    }

    $parsed = parse_url($url);
    $host = $parsed['host'] ?? '';
    $isHttps = strtolower($parsed['scheme'] ?? '') === 'https';

    $result = [
        'url' => $url,
        'host' => $host,
        'http_code' => 0,
        'http_status_code' => 0,
        'response_time_ms' => 0,
        'uptime_status' => 'down',
        'ssl_valid_until' => null,
        'ssl_days_left' => null,
        'ssl_issuer' => null,
        'error_message' => null
    ];

    if (empty($host)) {
        $result['error_message'] = 'Alamat URL / Host tidak valid';
        return $result;
    }

    // 1. Curl HTTP check
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_NOBODY => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_CONNECTTIMEOUT => $timeout,
        CURLOPT_USERAGENT => 'CRUDWorks-UptimeMonitor/1.0 (+http://crudworks-home.test)',
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0
    ]);

    $startTime = microtime(true);
    $response = curl_exec($ch);
    $endTime = microtime(true);
    $durationMs = (int)round(($endTime - $startTime) * 1000);
    $result['response_time_ms'] = $durationMs;

    if ($response === false) {
        $result['error_message'] = curl_error($ch) ?: 'Koneksi gagal atau timeout';
        $result['uptime_status'] = 'down';
        curl_close($ch);
    } else {
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $result['http_code'] = $httpCode;
        $result['http_status_code'] = $httpCode;
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 400) {
            $result['uptime_status'] = 'online';
        } elseif ($httpCode >= 400 && $httpCode < 500) {
            $result['uptime_status'] = 'warning';
        } else {
            $result['uptime_status'] = 'down';
        }
    }

    // 2. SSL certificate check if HTTPS
    if ($isHttps) {
        try {
            $g = stream_context_create([
                "ssl" => [
                    "capture_peer_cert" => true,
                    "verify_peer" => false,
                    "verify_peer_name" => false
                ]
            ]);
            $client = @stream_socket_client(
                "ssl://" . $host . ":443",
                $errno,
                $errstr,
                $timeout,
                STREAM_CLIENT_CONNECT,
                $g
            );
            if ($client) {
                $params = stream_context_get_params($client);
                if (isset($params["options"]["ssl"]["peer_certificate"])) {
                    $cert = openssl_x509_parse($params["options"]["ssl"]["peer_certificate"]);
                    if ($cert && isset($cert['validTo_time_t'])) {
                        $validTo = $cert['validTo_time_t'];
                        $now = time();
                        $daysLeft = (int)floor(($validTo - $now) / 86400);

                        $result['ssl_valid_until'] = date('Y-m-d', $validTo);
                        $result['ssl_days_left'] = $daysLeft;
                        $issuer = $cert['issuer']['O'] ?? ($cert['issuer']['CN'] ?? 'SSL Certificate Authority');
                        $result['ssl_issuer'] = substr($issuer, 0, 150);
                    }
                }
                fclose($client);
            }
        } catch (\Throwable $e) {
            // Non-critical SSL parse failure
        }
    }

    return $result;
}
