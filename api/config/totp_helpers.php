<?php
declare(strict_types=1);

/**
 * Pure PHP RFC 6238 TOTP Helper (Zero external dependencies)
 */
function totpGenerateSecret(int $length = 16): string
{
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bytes = random_bytes($length);
    $secret = '';
    for ($i = 0; $i < $length; $i++) {
        $secret .= $chars[ord($bytes[$i]) & 31];
    }
    return $secret;
}

function totpBase32Decode(string $secret): string
{
    $secret = strtoupper(preg_replace('/[^A-Z2-7]/', '', $secret));
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bits = '';
    for ($i = 0, $len = strlen($secret); $i < $len; $i++) {
        $val = strpos($alphabet, $secret[$i]);
        if ($val === false) continue;
        $bits .= str_pad(decbin($val), 5, '0', STR_PAD_LEFT);
    }
    $binary = '';
    for ($i = 0, $len = strlen($bits); $i + 8 <= $len; $i += 8) {
        $binary .= chr(bindec(substr($bits, $i, 8)));
    }
    return $binary;
}

function totpGetCode(string $secret, ?int $timeSlice = null): string
{
    if ($timeSlice === null) {
        $timeSlice = (int)floor(time() / 30);
    }
    $key = totpBase32Decode($secret);
    $time = pack('N*', 0) . pack('N*', $timeSlice);
    $hm = hash_hmac('sha1', $time, $key, true);
    $offset = ord(substr($hm, -1)) & 0x0F;
    $hashPart = substr($hm, $offset, 4);
    $value = unpack('N', $hashPart)[1] & 0x7FFFFFFF;
    return str_pad((string)($value % 1000000), 6, '0', STR_PAD_LEFT);
}

function totpVerify(string $secret, string $code, int $discrepancy = 1): bool
{
    $cleanCode = preg_replace('/\D/', '', $code);
    if (strlen($cleanCode) !== 6 || $secret === '') {
        return false;
    }
    $currentSlice = (int)floor(time() / 30);
    for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
        if (hash_equals(totpGetCode($secret, $currentSlice + $i), $cleanCode)) {
            return true;
        }
    }
    return false;
}

function totpGetOtpAuthUri(string $issuer, string $account, string $secret): string
{
    $label = rawurlencode($issuer . ':' . $account);
    return sprintf(
        'otpauth://totp/%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30',
        $label,
        rawurlencode($secret),
        rawurlencode($issuer)
    );
}
