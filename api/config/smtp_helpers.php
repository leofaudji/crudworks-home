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
 * Cari path lokal logo perusahaan untuk disematkan inline (CID) di email HTML.
 */
function resolveCompanyEmailLogoPath(array $cfg = []): ?string
{
    $rootDir = dirname(__DIR__, 2);
    $customLogo = trim((string)($cfg['company_logo'] ?? ''));
    if ($customLogo !== '' && !preg_match('#^https?://#i', $customLogo)) {
        $rel = ltrim(str_replace(['..', '\\'], ['', '/'], $customLogo), '/');
        $candidate = $rootDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
        if (is_file($candidate) && filesize($candidate) > 0 && filesize($candidate) <= 1048576) {
            return $candidate;
        }
    }
    $defaultLogo = $rootDir . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR . 'logo.png';
    return is_file($defaultLogo) ? $defaultLogo : null;
}

/**
 * Parse daftar alamat email dipisah koma/titik koma menjadi array email valid yang unik.
 */
function parseEmailList($raw): array
{
    if (is_array($raw)) {
        $items = $raw;
    } else {
        $items = preg_split('/[,;\s]+/', (string)$raw, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    }
    $valid = [];
    foreach ($items as $em) {
        $em = trim((string)$em);
        if ($em !== '' && filter_var($em, FILTER_VALIDATE_EMAIL)) {
            $valid[strtolower($em)] = $em;
        }
    }
    return array_values($valid);
}

/**
 * Render template teks email dari app_settings dengan substitusi variabel aman.
 */
function renderEmailTemplateText(string $settingKey, string $defaultTemplate, array $vars, array $cfg = []): string
{
    $tpl = trim((string)($cfg[$settingKey] ?? ''));
    if ($tpl === '') {
        $tpl = $defaultTemplate;
    }
    $safe = htmlspecialchars($tpl);
    foreach ($vars as $k => $v) {
        $safe = str_replace('{' . $k . '}', '<b>' . htmlspecialchars((string)$v) . '</b>', $safe);
    }
    return nl2br($safe);
}

/**
 * Kirim email HTML melalui SMTP (TLS/SSL/STARTTLS) dengan dukungan lampiran, CC & inline CID, lalu catat ke tabel email_logs.
 */
function sendErpEmail(string $toEmail, string $toName, string $subject, string $htmlBody, string $entityType = 'general', ?int $entityId = null, array $attachments = [], $ccEmails = []): array
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

    $ccList = array_values(array_filter(parseEmailList($ccEmails), fn($c) => strcasecmp($c, $toEmail) !== 0));
    foreach ($ccList as $ccAddr) {
        [$okCc, $cCc, $rCc] = _smtpCmd($fp, "RCPT TO:<{$ccAddr}>", [250, 251]);
        if (!$okCc) {
            fclose($fp);
            $err = "RCPT TO CC ({$ccAddr}) ditolak ({$cCc}): {$rCc}";
            $db->insert("INSERT INTO email_logs (entity_type, entity_id, recipient_email, subject, status, error_message, sent_by) VALUES (?, ?, ?, ?, 'failed', ?, ?)", [$entityType, $entityId, $toEmail, $subject, $err, $userId]);
            return ['success' => false, 'message' => $err];
        }
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
    $fromDomain = str_contains($fromEmail, '@') ? substr(strrchr($fromEmail, '@'), 1) : 'localhost';
    $messageId = '<' . bin2hex(random_bytes(12)) . '@' . $fromDomain . '>';

    $headers = [
        "Date: " . date('r'),
        "Message-ID: {$messageId}",
        "From: {$encFrom} <{$fromEmail}>",
        "Reply-To: {$encFrom} <{$fromEmail}>",
        "To: {$toHeader}",
        ...(!empty($ccList) ? ["Cc: " . implode(', ', $ccList)] : []),
        "Subject: {$encSubj}",
        "MIME-Version: 1.0",
        "X-Mailer: CRUDWorks-ERP",
    ];

    $inlineImages = [];
    if (str_contains($htmlBody, 'cid:company-logo')) {
        $logoPath = resolveCompanyEmailLogoPath($cfg);
        if ($logoPath) {
            $logoBin = @file_get_contents($logoPath);
            if ($logoBin !== false && $logoBin !== '') {
                $ext = strtolower(pathinfo($logoPath, PATHINFO_EXTENSION));
                $mime = match ($ext) {
                    'jpg', 'jpeg' => 'image/jpeg',
                    'gif' => 'image/gif',
                    'webp' => 'image/webp',
                    default => 'image/png',
                };
                $inlineImages[] = [
                    'cid' => 'company-logo',
                    'filename' => 'logo.' . ($ext ?: 'png'),
                    'mime' => $mime,
                    'content' => $logoBin,
                ];
            }
        }
    }

    $validAttachments = [];
    foreach ($attachments as $att) {
        if (!empty($att['content']) && !empty($att['filename'])) {
            $validAttachments[] = [
                'filename' => preg_replace('/[^a-zA-Z0-9._-]/', '_', (string)$att['filename']),
                'mime' => (string)($att['mime'] ?? 'application/pdf'),
                'content' => (string)$att['content'],
            ];
        }
    }

    $htmlPartHeaders = "Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($htmlBody));

    if (empty($inlineImages) && empty($validAttachments)) {
        $headers[] = "Content-Type: text/html; charset=UTF-8";
        $headers[] = "Content-Transfer-Encoding: base64";
        $body = chunk_split(base64_encode($htmlBody));
    } elseif (!empty($inlineImages) && empty($validAttachments)) {
        $relBoundary = '=_rel_' . bin2hex(random_bytes(12));
        $headers[] = "Content-Type: multipart/related; boundary=\"{$relBoundary}\"";
        $parts = ["--{$relBoundary}\r\n" . $htmlPartHeaders];
        foreach ($inlineImages as $img) {
            $parts[] = "--{$relBoundary}\r\n"
                . "Content-Type: {$img['mime']}; name=\"{$img['filename']}\"\r\n"
                . "Content-Transfer-Encoding: base64\r\n"
                . "Content-ID: <{$img['cid']}>\r\n"
                . "Content-Disposition: inline; filename=\"{$img['filename']}\"\r\n\r\n"
                . chunk_split(base64_encode($img['content']));
        }
        $parts[] = "--{$relBoundary}--";
        $body = implode("\r\n", $parts);
    } else {
        $mixBoundary = '=_mix_' . bin2hex(random_bytes(12));
        $headers[] = "Content-Type: multipart/mixed; boundary=\"{$mixBoundary}\"";
        $parts = [];

        if (!empty($inlineImages)) {
            $relBoundary = '=_rel_' . bin2hex(random_bytes(12));
            $relParts = ["--{$relBoundary}\r\n" . $htmlPartHeaders];
            foreach ($inlineImages as $img) {
                $relParts[] = "--{$relBoundary}\r\n"
                    . "Content-Type: {$img['mime']}; name=\"{$img['filename']}\"\r\n"
                    . "Content-Transfer-Encoding: base64\r\n"
                    . "Content-ID: <{$img['cid']}>\r\n"
                    . "Content-Disposition: inline; filename=\"{$img['filename']}\"\r\n\r\n"
                    . chunk_split(base64_encode($img['content']));
            }
            $relParts[] = "--{$relBoundary}--";
            $parts[] = "--{$mixBoundary}\r\nContent-Type: multipart/related; boundary=\"{$relBoundary}\"\r\n\r\n" . implode("\r\n", $relParts);
        } else {
            $parts[] = "--{$mixBoundary}\r\n" . $htmlPartHeaders;
        }

        foreach ($validAttachments as $att) {
            $parts[] = "--{$mixBoundary}\r\n"
                . "Content-Type: {$att['mime']}; name=\"{$att['filename']}\"\r\n"
                . "Content-Transfer-Encoding: base64\r\n"
                . "Content-Disposition: attachment; filename=\"{$att['filename']}\"\r\n\r\n"
                . chunk_split(base64_encode($att['content']));
        }
        $parts[] = "--{$mixBoundary}--";
        $body = implode("\r\n", $parts);
    }

    $msg = implode("\r\n", $headers) . "\r\n\r\n" . $body . "\r\n.";
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

/**
 * Ekstrak & validasi lampiran PDF base64 dari payload request API.
 */
function extractPdfAttachmentFromParams(array $params, string $defaultFilename = 'dokumen.pdf'): array
{
    $rawPdfB64 = trim((string)($params['pdf_base64'] ?? ''));
    if ($rawPdfB64 === '') {
        return [];
    }
    if (str_contains($rawPdfB64, ',')) {
        $rawPdfB64 = substr($rawPdfB64, strpos($rawPdfB64, ',') + 1);
    }
    $pdfBin = base64_decode($rawPdfB64, true);
    if ($pdfBin === false || !str_starts_with($pdfBin, '%PDF-')) {
        errorResponse('Lampiran PDF tidak valid', 422);
    }
    if (strlen($pdfBin) > 10 * 1024 * 1024) {
        errorResponse('Ukuran file PDF melebihi batas 10 MB', 422);
    }
    $safePdfName = preg_replace('/[^a-zA-Z0-9._-]/', '_', (string)($params['pdf_filename'] ?? $defaultFilename));
    if (!str_ends_with(strtolower($safePdfName), '.pdf')) {
        $safePdfName .= '.pdf';
    }
    return [[
        'filename' => $safePdfName,
        'mime' => 'application/pdf',
        'content' => $pdfBin,
    ]];
}

function buildInvoiceEmailHtml(array $inv, array $cfg, string $portalUrl, bool $hasLogo = false, bool $hasPdfAttachment = false): string
{
    $compName = htmlspecialchars((string)($cfg['company_name'] ?? 'CRUDWorks ERP'));
    $pic = htmlspecialchars((string)($inv['penanggung_jawab'] ?: $inv['nama_perusahaan']));
    $no = htmlspecialchars((string)$inv['nomor_invoice']);
    $total = 'Rp ' . number_format((float)$inv['total_tagihan'], 0, ',', '.');
    $sisa = 'Rp ' . number_format((float)$inv['sisa_tagihan'], 0, ',', '.');
    $due = htmlspecialchars((string)($inv['tanggal_jatuh_tempo'] ?? '-'));
    $url = htmlspecialchars($portalUrl);

    $logoHtml = $hasLogo
        ? "<div style='margin-bottom:12px'><img src='cid:company-logo' alt='{$compName}' style='max-height:36px;width:auto;display:inline-block;background:#ffffff;padding:6px 10px;border-radius:8px'></div>"
        : "<div style='font-size:12px;opacity:.8;margin-bottom:6px'>{$compName}</div>";

    $attachNote = $hasPdfAttachment
        ? "<p style='margin:0 0 16px;color:#334155'>Faktur tagihan resmi (<b>{$no}</b>) juga telah kami lampirkan dalam format <b>PDF</b> pada email ini.</p>"
        : '';

    $introHtml = renderEmailTemplateText(
        'email_tpl_invoice_intro',
        'Berikut kami kirimkan rincian tagihan untuk {nama_klien}:',
        [
            'nama_klien' => (string)($inv['nama_perusahaan'] ?? ''),
            'nomor_dokumen' => (string)($inv['nomor_invoice'] ?? ''),
            'jatuh_tempo' => (string)($inv['tanggal_jatuh_tempo'] ?? '-'),
            'nama_perusahaan' => (string)($cfg['company_name'] ?? 'CRUDWorks ERP'),
        ],
        $cfg
    );

    return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;color:#1e293b;background:#ffffff'>
        <div style='background:#0f172a;color:#fff;padding:24px'>
            {$logoHtml}
            <h2 style='margin:0;font-size:20px;line-height:1.3'>Faktur Tagihan {$no}</h2>
        </div>
        <div style='padding:24px;line-height:1.6;font-size:14px'>
            <p style='margin:0 0 12px'>Yth. <b>{$pic}</b>,</p>
            <p style='margin:0 0 14px'>{$introHtml}</p>
            <table style='width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0'>
                <tr><td style='padding:10px 14px;color:#64748b;border-bottom:1px solid #e2e8f0'>Nomor Faktur</td><td style='padding:10px 14px;text-align:right;font-weight:bold;border-bottom:1px solid #e2e8f0'>{$no}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b;border-bottom:1px solid #e2e8f0'>Total Tagihan</td><td style='padding:10px 14px;text-align:right;font-weight:bold;border-bottom:1px solid #e2e8f0'>{$total}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b;border-bottom:1px solid #e2e8f0'>Sisa Tagihan</td><td style='padding:10px 14px;text-align:right;font-weight:bold;color:#dc2626;border-bottom:1px solid #e2e8f0'>{$sisa}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b'>Jatuh Tempo</td><td style='padding:10px 14px;text-align:right;font-weight:bold'>{$due}</td></tr>
            </table>
            {$attachNote}
            <p style='text-align:center;margin:24px 0'>
                <a href='{$url}' style='display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:bold'>Lihat &amp; Bayar Faktur Online</a>
            </p>
            <p style='font-size:12px;color:#64748b;margin:16px 0 0'>Terima kasih atas kerja sama Anda.<br><b>{$compName}</b></p>
        </div>
    </div>";
}

function buildQuotationEmailHtml(array $quo, array $cfg, string $portalUrl, bool $hasLogo = false, bool $hasPdfAttachment = false): string
{
    $compName = htmlspecialchars((string)($cfg['company_name'] ?? 'CRUDWorks ERP'));
    $pic = htmlspecialchars((string)($quo['penanggung_jawab'] ?: $quo['nama_perusahaan']));
    $no = htmlspecialchars((string)$quo['nomor_penawaran']);
    $judul = htmlspecialchars((string)($quo['judul'] ?? 'Surat Penawaran Harga'));
    $valid = htmlspecialchars((string)($quo['berlaku_hingga'] ?? '-'));
    $url = htmlspecialchars($portalUrl);

    $logoHtml = $hasLogo
        ? "<div style='margin-bottom:12px'><img src='cid:company-logo' alt='{$compName}' style='max-height:36px;width:auto;display:inline-block;background:#ffffff;padding:6px 10px;border-radius:8px'></div>"
        : "<div style='font-size:12px;opacity:.8;margin-bottom:6px'>{$compName}</div>";

    $attachNote = $hasPdfAttachment
        ? "<p style='margin:0 0 16px;color:#334155'>Dokumen resmi <b>Surat Penawaran Harga ({$no})</b> telah kami lampirkan dalam format <b>PDF</b> pada email ini. Silakan buka lampiran PDF untuk membaca rincian ruang lingkup, jadwal pengerjaan, dan penawaran investasi secara lengkap.</p>"
        : "<p style='margin:0 0 16px;color:#334155'>Silakan tinjau rincian ruang lingkup, jadwal pengerjaan, dan penawaran investasi melalui tautan di bawah ini.</p>";

    $introHtml = renderEmailTemplateText(
        'email_tpl_quotation_intro',
        'Bersama ini kami kirimkan Surat Penawaran Harga (SPH) untuk {judul}.',
        [
            'nama_klien' => (string)($quo['nama_perusahaan'] ?? ''),
            'nomor_dokumen' => (string)($quo['nomor_penawaran'] ?? ''),
            'judul' => (string)($quo['judul'] ?? 'Surat Penawaran Harga'),
            'jatuh_tempo' => (string)($quo['berlaku_hingga'] ?? '-'),
            'nama_perusahaan' => (string)($cfg['company_name'] ?? 'CRUDWorks ERP'),
        ],
        $cfg
    );

    return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;color:#1e293b;background:#ffffff'>
        <div style='background:#1e1b4b;color:#fff;padding:24px'>
            {$logoHtml}
            <h2 style='margin:0;font-size:20px;line-height:1.3'>Surat Penawaran Harga {$no}</h2>
        </div>
        <div style='padding:24px;line-height:1.6;font-size:14px'>
            <p style='margin:0 0 12px'>Yth. <b>{$pic}</b>,</p>
            <p style='margin:0 0 14px'>{$introHtml}</p>
            <table style='width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0'>
                <tr><td style='padding:10px 14px;color:#64748b;border-bottom:1px solid #e2e8f0'>Nomor SPH</td><td style='padding:10px 14px;text-align:right;font-weight:bold;border-bottom:1px solid #e2e8f0'>{$no}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b;border-bottom:1px solid #e2e8f0'>Perihal</td><td style='padding:10px 14px;text-align:right;font-weight:bold;border-bottom:1px solid #e2e8f0'>{$judul}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b'>Berlaku Hingga</td><td style='padding:10px 14px;text-align:right;font-weight:bold'>{$valid}</td></tr>
            </table>
            {$attachNote}
            <p style='text-align:center;margin:24px 0'>
                <a href='{$url}' style='display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:bold'>Tinjau &amp; Setujui Penawaran (E-Sign)</a>
            </p>
            <p style='font-size:12px;color:#64748b;margin:16px 0 0'>Hormat kami,<br><b>{$compName}</b></p>
        </div>
    </div>";
}

function buildPaymentReceiptEmailHtml(array $p, array $cfg, string $portalUrl = '', bool $hasLogo = false, bool $hasPdfAttachment = false): string
{
    $compName = htmlspecialchars((string)($cfg['company_name'] ?? 'CRUDWorks ERP'));
    $pic = htmlspecialchars((string)($p['client_pic'] ?: $p['client_nama']));
    $no = htmlspecialchars((string)$p['nomor_pembayaran']);
    $invNo = htmlspecialchars((string)($p['nomor_invoice'] ?? '-'));
    $tgl = htmlspecialchars((string)($p['tanggal_bayar'] ?? '-'));
    $metode = htmlspecialchars(trim((string)($p['nama_bank'] ?: $p['nama_metode'] ?: 'Transfer')));
    $jumlah = 'Rp ' . number_format((float)($p['jumlah_bayar'] ?? 0), 0, ',', '.');
    $sisa = 'Rp ' . number_format((float)($p['current_sisa'] ?? 0), 0, ',', '.');

    $logoHtml = $hasLogo
        ? "<div style='margin-bottom:12px'><img src='cid:company-logo' alt='{$compName}' style='max-height:36px;width:auto;display:inline-block;background:#ffffff;padding:6px 10px;border-radius:8px'></div>"
        : "<div style='font-size:12px;opacity:.8;margin-bottom:6px'>{$compName}</div>";

    $attachNote = $hasPdfAttachment
        ? "<p style='margin:0 0 16px;color:#334155'>Kuitansi pembayaran resmi (<b>{$no}</b>) telah kami lampirkan dalam format <b>PDF</b> pada email ini sebagai bukti pelunasan yang sah.</p>"
        : '';

    $ctaHtml = $portalUrl !== ''
        ? "<p style='text-align:center;margin:24px 0'><a href='" . htmlspecialchars($portalUrl) . "' style='display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:bold'>Lihat Faktur &amp; Status Pembayaran</a></p>"
        : '';

    return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;color:#1e293b;background:#ffffff'>
        <div style='background:#064e3b;color:#fff;padding:24px'>
            {$logoHtml}
            <h2 style='margin:0;font-size:20px;line-height:1.3'>Kuitansi Pembayaran {$no}</h2>
        </div>
        <div style='padding:24px;line-height:1.6;font-size:14px'>
            <p style='margin:0 0 12px'>Yth. <b>{$pic}</b>,</p>
            <p style='margin:0 0 14px'>Terima kasih. Pembayaran dari <b>" . htmlspecialchars((string)$p['client_nama']) . "</b> telah kami terima dan verifikasi dengan rincian berikut:</p>
            <table style='width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0'>
                <tr><td style='padding:10px 14px;color:#64748b;border-bottom:1px solid #e2e8f0'>Nomor Kuitansi</td><td style='padding:10px 14px;text-align:right;font-weight:bold;border-bottom:1px solid #e2e8f0'>{$no}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b;border-bottom:1px solid #e2e8f0'>Nomor Faktur</td><td style='padding:10px 14px;text-align:right;font-weight:bold;border-bottom:1px solid #e2e8f0'>{$invNo}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b;border-bottom:1px solid #e2e8f0'>Tanggal Bayar</td><td style='padding:10px 14px;text-align:right;font-weight:bold;border-bottom:1px solid #e2e8f0'>{$tgl}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b;border-bottom:1px solid #e2e8f0'>Metode</td><td style='padding:10px 14px;text-align:right;font-weight:bold;border-bottom:1px solid #e2e8f0'>{$metode}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b;border-bottom:1px solid #e2e8f0'>Jumlah Diterima</td><td style='padding:10px 14px;text-align:right;font-weight:bold;color:#059669;border-bottom:1px solid #e2e8f0'>{$jumlah}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b'>Sisa Tagihan Faktur</td><td style='padding:10px 14px;text-align:right;font-weight:bold'>{$sisa}</td></tr>
            </table>
            {$attachNote}
            {$ctaHtml}
            <p style='font-size:12px;color:#64748b;margin:16px 0 0'>Hormat kami,<br><b>{$compName}</b></p>
        </div>
    </div>";
}

function buildContractEmailHtml(array $k, array $cfg, string $portalUrl = '', bool $hasLogo = false, bool $hasPdfAttachment = false): string
{
    $compName = htmlspecialchars((string)($cfg['company_name'] ?? 'CRUDWorks ERP'));
    $pic = htmlspecialchars((string)($k['penanggung_jawab'] ?: $k['nama_perusahaan']));
    $no = htmlspecialchars((string)$k['nomor_kontrak']);
    $judul = htmlspecialchars((string)($k['judul_kontrak'] ?? 'Surat Perjanjian Kerja'));
    $nilai = 'Rp ' . number_format((float)($k['nilai_kontrak'] ?? 0), 0, ',', '.');

    $logoHtml = $hasLogo
        ? "<div style='margin-bottom:12px'><img src='cid:company-logo' alt='{$compName}' style='max-height:36px;width:auto;display:inline-block;background:#ffffff;padding:6px 10px;border-radius:8px'></div>"
        : "<div style='font-size:12px;opacity:.8;margin-bottom:6px'>{$compName}</div>";

    $introHtml = renderEmailTemplateText(
        'email_tpl_contract_intro',
        'Bersama ini kami sampaikan Surat Perjanjian Kerja (SPK) {nomor_dokumen} untuk {judul}.',
        [
            'nama_klien' => (string)($k['nama_perusahaan'] ?? ''),
            'nomor_dokumen' => (string)($k['nomor_kontrak'] ?? ''),
            'judul' => (string)($k['judul_kontrak'] ?? ''),
            'nama_perusahaan' => (string)($cfg['company_name'] ?? 'CRUDWorks ERP'),
        ],
        $cfg
    );

    $attachNote = $hasPdfAttachment
        ? "<p style='margin:0 0 16px;color:#334155'>Dokumen resmi SPK (<b>{$no}</b>) telah kami lampirkan dalam format <b>PDF</b> pada email ini.</p>"
        : '';

    $ctaHtml = $portalUrl !== ''
        ? "<p style='text-align:center;margin:24px 0'><a href='" . htmlspecialchars($portalUrl) . "' style='display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:bold'>Buka Portal Klien &amp; Tanda Tangani SPK</a></p>"
        : '';

    return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;color:#1e293b;background:#ffffff'>
        <div style='background:#0c4a6e;color:#fff;padding:24px'>{$logoHtml}<h2 style='margin:0;font-size:20px;line-height:1.3'>Kontrak / SPK Digital {$no}</h2></div>
        <div style='padding:24px;line-height:1.6;font-size:14px'>
            <p style='margin:0 0 12px'>Yth. <b>{$pic}</b>,</p>
            <p style='margin:0 0 14px'>{$introHtml}</p>
            <table style='width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0'>
                <tr><td style='padding:10px 14px;color:#64748b;border-bottom:1px solid #e2e8f0'>Nomor SPK</td><td style='padding:10px 14px;text-align:right;font-weight:bold;border-bottom:1px solid #e2e8f0'>{$no}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b;border-bottom:1px solid #e2e8f0'>Perihal</td><td style='padding:10px 14px;text-align:right;font-weight:bold;border-bottom:1px solid #e2e8f0'>{$judul}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b'>Nilai Kontrak</td><td style='padding:10px 14px;text-align:right;font-weight:bold;color:#0284c7'>{$nilai}</td></tr>
            </table>
            {$attachNote}{$ctaHtml}
            <p style='font-size:12px;color:#64748b;margin:16px 0 0'>Hormat kami,<br><b>{$compName}</b></p>
        </div></div>";
}

function buildBastEmailHtml(array $b, array $cfg, string $portalUrl = '', bool $hasLogo = false, bool $hasPdfAttachment = false): string
{
    $compName = htmlspecialchars((string)($cfg['company_name'] ?? 'CRUDWorks ERP'));
    $pic = htmlspecialchars((string)($b['pihak_kedua_nama'] ?: $b['client_nama']));
    $no = htmlspecialchars((string)$b['nomor_bast']);
    $proj = htmlspecialchars((string)($b['nama_project'] ?? 'Proyek'));
    $tgl = htmlspecialchars((string)($b['tanggal_bast'] ?? '-'));

    $logoHtml = $hasLogo
        ? "<div style='margin-bottom:12px'><img src='cid:company-logo' alt='{$compName}' style='max-height:36px;width:auto;display:inline-block;background:#ffffff;padding:6px 10px;border-radius:8px'></div>"
        : "<div style='font-size:12px;opacity:.8;margin-bottom:6px'>{$compName}</div>";

    $introHtml = renderEmailTemplateText(
        'email_tpl_bast_intro',
        'Bersama ini kami sampaikan Berita Acara Serah Terima (BAST) {nomor_dokumen} untuk proyek {judul}.',
        [
            'nama_klien' => (string)($b['client_nama'] ?? ''),
            'nomor_dokumen' => (string)($b['nomor_bast'] ?? ''),
            'judul' => (string)($b['nama_project'] ?? ''),
            'nama_perusahaan' => (string)($cfg['company_name'] ?? 'CRUDWorks ERP'),
        ],
        $cfg
    );

    $attachNote = $hasPdfAttachment
        ? "<p style='margin:0 0 16px;color:#334155'>Dokumen resmi BAST (<b>{$no}</b>) telah kami lampirkan dalam format <b>PDF</b> pada email ini.</p>"
        : '';

    $ctaHtml = $portalUrl !== ''
        ? "<p style='text-align:center;margin:24px 0'><a href='" . htmlspecialchars($portalUrl) . "' style='display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:bold'>Tinjau &amp; Sahkan BAST di Portal Klien</a></p>"
        : '';

    return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;color:#1e293b;background:#ffffff'>
        <div style='background:#312e81;color:#fff;padding:24px'>{$logoHtml}<h2 style='margin:0;font-size:20px;line-height:1.3'>Berita Acara Serah Terima {$no}</h2></div>
        <div style='padding:24px;line-height:1.6;font-size:14px'>
            <p style='margin:0 0 12px'>Yth. <b>{$pic}</b>,</p>
            <p style='margin:0 0 14px'>{$introHtml}</p>
            <table style='width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0'>
                <tr><td style='padding:10px 14px;color:#64748b;border-bottom:1px solid #e2e8f0'>Nomor BAST</td><td style='padding:10px 14px;text-align:right;font-weight:bold;border-bottom:1px solid #e2e8f0'>{$no}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b;border-bottom:1px solid #e2e8f0'>Proyek</td><td style='padding:10px 14px;text-align:right;font-weight:bold;border-bottom:1px solid #e2e8f0'>{$proj}</td></tr>
                <tr><td style='padding:10px 14px;color:#64748b'>Tanggal BAST</td><td style='padding:10px 14px;text-align:right;font-weight:bold'>{$tgl}</td></tr>
            </table>
            {$attachNote}{$ctaHtml}
            <p style='font-size:12px;color:#64748b;margin:16px 0 0'>Hormat kami,<br><b>{$compName}</b></p>
        </div></div>";
}
