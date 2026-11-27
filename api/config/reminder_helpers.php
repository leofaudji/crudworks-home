<?php
declare(strict_types=1);

/**
 * Jalankan pengingat jatuh tempo faktur & perpanjangan SLA/domain secara aman (anti-duplikat).
 */
function runScheduledEmailReminders(bool $dryRun = false): array
{
    $db = Database::getInstance();
    $cfg = getAppSettingsMap();
    $hasLogo = resolveCompanyEmailLogoPath($cfg) !== null;

    $invoicesSent = 0;
    $maintenanceSent = 0;
    $failed = 0;
    $details = [];

    // 1. Faktur belum lunas: H-3, Hari-H (0), atau terlambat >= 7 hari, belum dikirim dalam 7 hari terakhir
    $dueInvoices = $db->fetchAll(
        "SELECT i.*, c.nama_perusahaan, c.email as client_email, c.cc_email as client_cc_email, c.penanggung_jawab,
                DATEDIFF(i.tanggal_jatuh_tempo, CURDATE()) as days_left
         FROM invoices i
         JOIN clients c ON i.client_id = c.id
         WHERE i.status IN ('dikirim', 'sebagian', 'jatuh_tempo')
           AND i.sisa_tagihan > 0.01
           AND c.email IS NOT NULL AND c.email <> ''
           AND (
               DATEDIFF(i.tanggal_jatuh_tempo, CURDATE()) IN (3, 0)
               OR DATEDIFF(i.tanggal_jatuh_tempo, CURDATE()) <= -7
           )
           AND (i.last_sent_at IS NULL OR i.last_sent_at < DATE_SUB(NOW(), INTERVAL 7 DAY))
         ORDER BY i.tanggal_jatuh_tempo ASC
         LIMIT 30"
    );

    foreach ($dueInvoices as $inv) {
        $daysLeft = (int)$inv['days_left'];
        $tag = $daysLeft > 0 ? "Pengingat H-{$daysLeft}" : ($daysLeft === 0 ? 'Jatuh Tempo Hari Ini' : 'Tunggakan Jatuh Tempo');
        if ($dryRun) {
            $details[] = "[DRY-RUN] Faktur {$inv['nomor_invoice']} ({$tag}) -> {$inv['client_email']}";
            $invoicesSent++;
            continue;
        }
        $token = $inv['public_token'] ?: bin2hex(random_bytes(24));
        if (empty($inv['public_token'])) {
            $db->execute("UPDATE invoices SET public_token = ? WHERE id = ?", [$token, (int)$inv['id']]);
        }
        $portalUrl = buildPublicAppUrl('#/public-invoice?token=' . urlencode($token));
        $subject = "{$tag}: Faktur {$inv['nomor_invoice']} - " . ($cfg['company_name'] ?? 'CRUDWorks ERP');
        $html = buildInvoiceEmailHtml($inv, $cfg, $portalUrl, $hasLogo, false);
        $res = sendErpEmail(
            (string)$inv['client_email'],
            (string)($inv['penanggung_jawab'] ?: $inv['nama_perusahaan']),
            $subject,
            $html,
            'invoice',
            (int)$inv['id'],
            [],
            (string)($inv['client_cc_email'] ?? '')
        );
        if (!empty($res['success'])) {
            $db->execute("UPDATE invoices SET last_sent_at = NOW(), last_sent_via = 'email' WHERE id = ?", [(int)$inv['id']]);
            $invoicesSent++;
            $details[] = "Faktur {$inv['nomor_invoice']} ({$tag}) -> {$inv['client_email']}";
        } else {
            $failed++;
            $details[] = "GAGAL Faktur {$inv['nomor_invoice']}: " . ($res['message'] ?? 'Unknown');
        }
    }

    // 2. Perpanjangan SLA / Domain <= 30 hari, belum diingatkan dalam 14 hari terakhir
    $expiringSla = $db->fetchAll(
        "SELECT m.*, c.nama_perusahaan, c.email as client_email, c.cc_email as client_cc_email, c.penanggung_jawab,
                DATEDIFF(m.tanggal_berakhir, CURDATE()) as days_left
         FROM maintenance_sla m
         JOIN clients c ON m.client_id = c.id
         WHERE m.status = 'aktif'
           AND m.tanggal_berakhir IS NOT NULL
           AND DATEDIFF(m.tanggal_berakhir, CURDATE()) BETWEEN 0 AND 30
           AND c.email IS NOT NULL AND c.email <> ''
           AND NOT EXISTS (
               SELECT 1 FROM email_logs el
               WHERE el.entity_type = 'maintenance' AND el.entity_id = m.id
                 AND el.status = 'sent' AND el.created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
           )
         ORDER BY m.tanggal_berakhir ASC
         LIMIT 30"
    );

    foreach ($expiringSla as $sla) {
        $daysLeft = (int)$sla['days_left'];
        if ($dryRun) {
            $details[] = "[DRY-RUN] SLA/Domain {$sla['nama_aset']} (H-{$daysLeft}) -> {$sla['client_email']}";
            $maintenanceSent++;
            continue;
        }
        $compName = htmlspecialchars((string)($cfg['company_name'] ?? 'CRUDWorks ERP'));
        $pic = htmlspecialchars((string)($sla['penanggung_jawab'] ?: $sla['nama_perusahaan']));
        $aset = htmlspecialchars((string)($sla['nama_aset'] ?: $sla['domain_name'] ?: 'Layanan'));
        $exp = htmlspecialchars((string)$sla['tanggal_berakhir']);
        $logoHtml = $hasLogo ? "<div style='margin-bottom:12px'><img src='cid:company-logo' alt='{$compName}' style='max-height:36px;width:auto;display:inline-block;background:#ffffff;padding:6px 10px;border-radius:8px'></div>" : '';
        $html = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;color:#1e293b;background:#ffffff'>
            <div style='background:#0f172a;color:#fff;padding:24px'>{$logoHtml}<h2 style='margin:0;font-size:20px'>Pengingat Perpanjangan Layanan &amp; Domain</h2></div>
            <div style='padding:24px;line-height:1.6;font-size:14px'>
                <p>Yth. <b>{$pic}</b>,</p>
                <p>Masa aktif layanan/domain <b>{$aset}</b> akan berakhir dalam <b>{$daysLeft} hari</b> (tanggal <b>{$exp}</b>). Mohon konfirmasi perpanjangan agar layanan tetap berjalan lancar.</p>
                <p style='font-size:12px;color:#64748b;margin-top:20px'>Hormat kami,<br><b>{$compName}</b></p>
            </div></div>";
        $subject = "Pengingat Perpanjangan {$sla['nama_aset']} (H-{$daysLeft}) - " . ($cfg['company_name'] ?? 'CRUDWorks ERP');
        $res = sendErpEmail(
            (string)$sla['client_email'],
            (string)($sla['penanggung_jawab'] ?: $sla['nama_perusahaan']),
            $subject,
            $html,
            'maintenance',
            (int)$sla['id'],
            [],
            (string)($sla['client_cc_email'] ?? '')
        );
        if (!empty($res['success'])) {
            $maintenanceSent++;
            $details[] = "SLA {$sla['nama_aset']} (H-{$daysLeft}) -> {$sla['client_email']}";
        } else {
            $failed++;
            $details[] = "GAGAL SLA {$sla['nama_aset']}: " . ($res['message'] ?? 'Unknown');
        }
    }

    return [
        'invoices_sent' => $invoicesSent,
        'maintenance_sent' => $maintenanceSent,
        'failed' => $failed,
        'details' => $details,
    ];
}
