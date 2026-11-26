<?php
declare(strict_types=1);

/**
 * Ambil seluruh pengaturan app_settings sebagai associative array.
 */
function getAppSettingsMap(): array
{
    $db = Database::getInstance();
    $rows = $db->fetchAll("SELECT kunci, nilai FROM app_settings");
    $map = [];
    foreach ($rows as $r) {
        $map[$r['kunci']] = $r['nilai'];
    }
    return $map;
}

/**
 * Baca satu baris respons SMTP (mendukung multi-line 250- ... 250 ).
 */
function _smtpRead($fp): string
{
    $data = '';
    while (($line = fgets($fp, 515)) !== false) {
        $data .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    return $data;
}

/**
 * Kirim perintah SMTP dan pastikan kode balasan diawali salah satu kode yang diharapkan.
 */
function _smtpCmd($fp, string $cmd, array $expectCodes): array
{
    fwrite($fp, $cmd . "\r\n");
    $resp = _smtpRead($fp);
    $code = (int)substr(trim($resp), 0, 3);
    return [in_array($code, $expectCodes, true), $code, trim($resp)];
}

/**
 * Kirim email HTML melalui SMTP (TLS/SSL/STARTTLS) dan catat ke tabel email_logs.
 */
function sendErpEmail(string $toEmail, string $toName, string $subject, string $htmlBody, string $entityType = 'general', ?int $entityId = null): array
{
    $db = Database::getInstance();
    $cfg = getAppSettingsMap();

    $host = trim((string)($cfg['smtp_host'] ?? ''));
    $port = (int)($cfg['smtp_port'] ?? 587) ?: 587;
    $user = trim((string)($cfg['smtp_user'] ?? ''));
    $pass = (string)($cfg['smtp_pass'] ?? '');
    $enc  = strtolower(trim((string)($cfg['smtp_encryption'] ?? 'tls')));
    $fromEmail = trim((string)($cfg['smtp_from_email'] ?? $user ?: ($cfg['company_email'] ?? '')));
    $fromName  = trim((string)($cfg['smtp_from_name'] ?? ($cfg['company_name'] ?? 'CRUDWorks ERP')));
    $userId = !empty($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;

    if ($host === '') {
        $err = 'Server SMTP belum dikonfigurasi. Buka Pengaturan -> Email SMTP untuk mengatur host, port, dan akun pengirim.';
        $db->insert(
            "INSERT INTO email_logs (entity_type, entity_id, recipient_email, subject, status, error_message, sent_by) VALUES (?, ?, ?, ?, 'failed', ?, ?)",
            [$entityType, $entityId, $toEmail, $subject, $err, $userId]
        );
        return ['success' => false, 'message' => $err];
    }

    if ($fromEmail === '' || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
        $err = 'Email pengirim (From Email) belum valid di pengaturan SMTP.';
        $db->insert(
            "INSERT INTO email_logs (entity_type, entity_id, recipient_email, subject, status, error_message, sent_by) VALUES (?, ?, ?, ?, 'failed', ?, ?)",
            [$entityType, $entityId, $toEmail, $subject, $err, $userId]
        );
        return ['success' => false, 'message' => $err];
    }

    $remote = ($enc === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
    $errno = 0;
    $errstr = '';
    $ctx = stream_context_create([
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true,
        ],
    ]);

    $fp = @stream_socket_client($remote, $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) {
        $err = "Gagal terhubung ke SMTP {$host}:{$port} ({$errstr})";
        $db->insert(
            "INSERT INTO email_logs (entity_type, entity_id, recipient_email, subject, status, error_message, sent_by) VALUES (?, ?, ?, ?, 'failed', ?, ?)",
            [$entityType, $entityId, $toEmail, $subject, $err, $userId]
        );
        return ['success' => false, 'message' => $err];
    }

    stream_set_timeout($fp, 12);
    $greet = _smtpRead($fp);
    if ((int)substr(trim($greet), 0, 3) !== 220) {
        fclose($fp);
        $err = 'Respons awal SMTP tidak valid: ' . trim($greet);
        $db->insert(
            "INSERT INTO email_logs (entity_type, entity_id, recipient_email, subject, status, error_message, sent_by) VALUES (?, ?, ?, ?, 'failed', ?, ?)",
            [$entityType, $entityId, $toEmail, $subject, $err, $userId]
        );
        return ['success' => false, 'message' => $err];
    }

    $ehloHost = $_SERVER['HTTP_HOST'] ?? 'localhost';
    [$ok, $code, $resp] = _smtpCmd($fp, "EHLO {$ehloHost}", [250]);
    if (!$ok) {
        fclose($fp);
        $err = "EHLO gagal ({$code}): {$resp}";
        $db->insert(
            "INSERT INTO email_logs (entity_type, entity_id, recipient_email, subject, status, error_message, sent_by) VALUES (?, ?, ?, ?, 'failed', ?, ?)",
            [$entityType, $entityId, $toEmail, $subject, $err, $userId]
        );
        return ['success' => false, 'message' => $err];
    }

    if ($enc === 'tls') {
        [$okTls, $cTls, $rTls] = _smtpCmd($fp, 'STARTTLS', [220]);
        if (!$okTls) {
            fclose($fp);
            $err = "STARTTLS gagal ({$cTls}): {$rTls}";
            $db->insert(
                "INSERT INTO email_logs (entity_type, entity_id, recipient_email, subject, status, error_message, sent_by) VALUES (?, ?, ?, ?, 'failed', ?, ?)",
                [$entityType, $entityId, $toEmail, $subject, $err, $userId]
            );
            return ['success' => false, 'message' => $err];
        }
        if (!@stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            fclose($fp);
            $err = 'Negosiasi enkripsi TLS gagal';
            $db->insert(
                "INSERT INTO email_logs (entity_type, entity_id, recipient_email, subject, status, error_message, sent_by) VALUES (?, ?, ?, ?, 'failed', ?, ?)",
                [$entityType, $entityId, $toEmail, $subject, $err, $userId]
            );
            return ['success' => false, 'message' => $err];
        }
        _smtpCmd($fp, "EHLO {$ehloHost}", [250]);
    }

    if ($user !== '') {
        [$okAuth, $cAuth, $rAuth] = _smtpCmd($fp, 'AUTH LOGIN', [334]);
        if ($okAuth) {
            [$okU, $cU, $rU] = _smtpCmd($fp, base64_encode($user), [334]);
            if (!$okU) {
                fclose($fp);
                $err = "Username SMTP ditolak ({$cU}): {$rU}";
                $db->insert(
                    "INSERT INTO email_logs (entity_type, entity_id, recipient_email, subject, status, error_message, sent_by) VALUES (?, ?, ?, ?, 'failed', ?, ?)",
                    [$entityType, $entityId, $toEmail, $subject, $err, $userId]
                );
                return ['success' => false, 'message' => $err];
            }
            [$okP, $cP, $rP] = _smtpCmd($fp, base64_encode($pass), [235]);
            if (!$okP) {
                fclose($fp);
                $err = "Password SMTP ditolak ({$cP}): {$rP}";
                $db->insert(
                    "INSERT INTO email_logs (entity_type, entity_id, recipient_email, subject, status, error_message, sent_by) VALUES (?, ?, ?, ?, 'failed', ?, ?)",
                    [$entityType, $entityId, $toEmail, $subject, $err, $userId]
                );
                return ['success' => false, 'message' => $err];
            }
        } else {
            fclose($fp);
            $err = "AUTH LOGIN gagal ({$cAuth}): {$rAuth}";
            $db->insert(
                "INSERT INTO email_logs (entity_type, entity_id, recipient_email, subject, status, error_message, sent_by) VALUES (?, ?, ?, ?, 'failed', ?, ?)",
                [$entityType, $entityId, $toEmail, $subject, $err, $userId]
            );
            return ['success' => false, 'message' => $err];
        }
    }

    [$okFrom, $cFrom, $rFrom] = _smtpCmd($fp, "MAIL FROM:<{$fromEmail}>", [250]);
    if (!$okFrom) {
        fclose($fp);
        $err = "MAIL FROM ditolak ({$cFrom}): {$rFrom}";
        $db->insert("INSERT INTO email_logs (entity_type, entity_id, recipient_email, subject, status, error_message, sent_by) VALUES (?, ?, ?, ?, 'failed', ?, ?)", [$entityType, $entityId, $toEmail, $subject, $err, $userId]);
        return ['success' => false, 'message' => $err];
    }

    [$okTo, $cTo, $rTo] = _smtpCmd($fp, "RCPT TO:<{$toEmail}>", [250, 251]);
    if (!$okTo) {
        fclose($fp);
        $err = "RCPT TO ditolak ({$cTo}): {$rTo}";
        $db->insert("INSERT INTO email_logs (entity_type, entity_id, recipient_email, subject, status, error_message, sent_by) VALUES (?, ?, ?, ?, 'failed', ?, ?)", [$entityType, $entityId, $toEmail, $subject, $err, $userId]);
        return ['success' => false, 'message' => $err];
    }

    [$okData, $cData, $rData] = _smtpCmd($fp, 'DATA', [354]);
    if (!$okData) {
        fclose($fp);
        $err = "Perintah DATA ditolak ({$cData}): {$rData}";
        $db->insert("INSERT INTO email_logs (entity_type, entity_id, recipient_email, subject, status, error_message, sent_by) VALUES (?, ?, ?, ?, 'failed', ?, ?)", [$entityType, $entityId, $toEmail, $subject, $err, $userId]);
        return ['success' => false, 'message' => $err];
    }

    $encSubj = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $encFrom = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
    $toHeader = $toName !== '' ? '=?UTF-8?B?' . base64_encode($toName) . "?= <{$toEmail}>" : $toEmail;

    $headers = [
        "Date: " . date('r'),
        "From: {$encFrom} <{$fromEmail}>",
        "To: {$toHeader}",
        "Subject: {$encSubj}",
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
    ];
    $msg = implode("\r\n", $headers) . "\r\n\r\n" . chunk_split(base64_encode($htmlBody)) . "\r\n.";
    [$okSent, $cSent, $rSent] = _smtpCmd($fp, $msg, [250]);
    _smtpCmd($fp, 'QUIT', [221, 250]);
    fclose($fp);

    if (!$okSent) {
        $err = "Pengiriman isi email gagal ({$cSent}): {$rSent}";
        $db->insert("INSERT INTO email_logs (entity_type, entity_id, recipient_email, subject, status, error_message, sent_by) VALUES (?, ?, ?, ?, 'failed', ?, ?)", [$entityType, $entityId, $toEmail, $subject, $err, $userId]);
        return ['success' => false, 'message' => $err];
    }

    $db->insert(
        "INSERT INTO email_logs (entity_type, entity_id, recipient_email, subject, status, sent_by) VALUES (?, ?, ?, ?, 'sent', ?)",
        [$entityType, $entityId, $toEmail, $subject, $userId]
    );
    return ['success' => true, 'message' => "Email berhasil dikirim ke {$toEmail}"];
}

function buildInvoiceEmailHtml(array $inv, array $cfg, string $portalUrl): string
{
    $compName = htmlspecialchars((string)($cfg['company_name'] ?? 'CRUDWorks ERP'));
    $pic = htmlspecialchars((string)($inv['penanggung_jawab'] ?: $inv['nama_perusahaan']));
    $no = htmlspecialchars((string)$inv['nomor_invoice']);
    $total = 'Rp ' . number_format((float)$inv['total_tagihan'], 0, ',', '.');
    $sisa = 'Rp ' . number_format((float)$inv['sisa_tagihan'], 0, ',', '.');
    $due = htmlspecialchars((string)($inv['tanggal_jatuh_tempo'] ?? '-'));
    $url = htmlspecialchars($portalUrl);

    return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;color:#1e293b'>
        <div style='background:#0f172a;color:#fff;padding:24px'>
            <div style='font-size:12px;opacity:.75'>{$compName}</div>
            <h2 style='margin:6px 0 0;font-size:20px'>Faktur Tagihan {$no}</h2>
        </div>
        <div style='padding:24px;line-height:1.6;font-size:14px'>
            <p>Yth. <b>{$pic}</b>,</p>
            <p>Berikut kami kirimkan rincian tagihan untuk <b>" . htmlspecialchars((string)$inv['nama_perusahaan']) . "</b>:</p>
            <table style='width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:10px'>
                <tr><td style='padding:10px 14px;color:#64748b'>Nomor Faktur</td><td style='padding:10px 14px;text-align:right;font-weight:bold'>{$no}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b'>Total Tagihan</td><td style='padding:10px 14px;text-align:right;font-weight:bold'>{$total}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b'>Sisa Tagihan</td><td style='padding:10px 14px;text-align:right;font-weight:bold;color:#dc2626'>{$sisa}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b'>Jatuh Tempo</td><td style='padding:10px 14px;text-align:right;font-weight:bold'>{$due}</td></tr>
            </table>
            <p style='text-align:center;margin:24px 0'>
                <a href='{$url}' style='display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:bold'>Lihat &amp; Bayar Faktur Online</a>
            </p>
            <p style='font-size:12px;color:#64748b'>Terima kasih atas kerja sama Anda.<br>{$compName}</p>
        </div>
    </div>";
}

function buildQuotationEmailHtml(array $quo, array $cfg, string $portalUrl): string
{
    $compName = htmlspecialchars((string)($cfg['company_name'] ?? 'CRUDWorks ERP'));
    $pic = htmlspecialchars((string)($quo['penanggung_jawab'] ?: $quo['nama_perusahaan']));
    $no = htmlspecialchars((string)$quo['nomor_penawaran']);
    $judul = htmlspecialchars((string)($quo['judul'] ?? 'Surat Penawaran Harga'));
    $total = 'Rp ' . number_format((float)$quo['total_penawaran'], 0, ',', '.');
    $valid = htmlspecialchars((string)($quo['berlaku_hingga'] ?? '-'));
    $url = htmlspecialchars($portalUrl);

    return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;color:#1e293b'>
        <div style='background:#1e1b4b;color:#fff;padding:24px'>
            <div style='font-size:12px;opacity:.75'>{$compName}</div>
            <h2 style='margin:6px 0 0;font-size:20px'>Surat Penawaran Harga {$no}</h2>
        </div>
        <div style='padding:24px;line-height:1.6;font-size:14px'>
            <p>Yth. <b>{$pic}</b>,</p>
            <p>Bersama ini kami kirimkan Surat Penawaran Harga (SPH) untuk <b>{$judul}</b>:</p>
            <table style='width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:10px'>
                <tr><td style='padding:10px 14px;color:#64748b'>Nomor SPH</td><td style='padding:10px 14px;text-align:right;font-weight:bold'>{$no}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b'>Nilai Penawaran</td><td style='padding:10px 14px;text-align:right;font-weight:bold;color:#4f46e5'>{$total}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b'>Berlaku Hingga</td><td style='padding:10px 14px;text-align:right;font-weight:bold'>{$valid}</td></tr>
            </table>
            <p style='text-align:center;margin:24px 0'>
                <a href='{$url}' style='display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:bold'>Tinjau &amp; Setujui Penawaran (E-Sign)</a>
            </p>
            <p style='font-size:12px;color:#64748b'>Hormat kami,<br>{$compName}</p>
        </div>
    </div>";
}
