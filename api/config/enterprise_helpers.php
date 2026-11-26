<?php
declare(strict_types=1);

/**
 * Buat notifikasi in-app untuk tampil di lonceng topbar.
 */
function createNotification(string $judul, string $pesan, ?string $tautan = null, string $tipe = 'info'): int
{
    try {
        $db = Database::getInstance();
        $validTipe = in_array($tipe, ['info', 'sukses', 'peringatan', 'bahaya'], true) ? $tipe : 'info';
        return (int)$db->insert(
            "INSERT INTO notifications (judul, pesan, tautan, tipe) VALUES (?, ?, ?, ?)",
            [mb_substr($judul, 0, 150), $pesan, $tautan, $validTipe]
        );
    } catch (\Throwable $e) {
        return 0;
    }
}

/**
 * Hitung target SLA respons pertama dan penyelesaian tiket berdasarkan prioritas.
 * Return: ['sla_response_due' => 'Y-m-d H:i:s', 'sla_resolve_due' => 'Y-m-d H:i:s']
 */
function computeTicketSlaDates(string $prioritas, ?string $createdAt = null): array
{
    $baseTs = $createdAt ? strtotime($createdAt) : time();
    if (!$baseTs) $baseTs = time();

    $map = [
        'kritis' => [1, 4],
        'tinggi' => [2, 12],
        'sedang' => [4, 24],
        'rendah' => [8, 48],
    ];
    [$respH, $resH] = $map[$prioritas] ?? [4, 24];

    return [
        'sla_response_due' => date('Y-m-d H:i:s', $baseTs + ($respH * 3600)),
        'sla_resolve_due'  => date('Y-m-d H:i:s', $baseTs + ($resH * 3600)),
    ];
}

/**
 * Kirim event webhook keluar ke semua endpoint aktif yang berlangganan event tersebut.
 * Mengirim header X-CRUDWorks-Event dan X-CRUDWorks-Signature (HMAC-SHA256).
 */
function dispatchWebhook(string $eventName, array $payload): void
{
    try {
        $db = Database::getInstance();
        $hooks = $db->fetchAll("SELECT * FROM webhooks WHERE is_active = 1");
        if (empty($hooks)) return;

        $body = json_encode([
            'event' => $eventName,
            'timestamp' => date('c'),
            'data' => $payload,
        ], JSON_UNESCAPED_UNICODE);

        foreach ($hooks as $hook) {
            $subscribed = array_filter(array_map('trim', explode(',', (string)$hook['events'])));
            if (!empty($subscribed) && !in_array('*', $subscribed, true) && !in_array($eventName, $subscribed, true)) {
                continue;
            }

            $sig = hash_hmac('sha256', $body, (string)$hook['secret']);
            $code = 0;
            $respBody = '';

            if (function_exists('curl_init')) {
                $ch = curl_init($hook['target_url']);
                curl_setopt_array($ch, [
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => $body,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 4,
                    CURLOPT_CONNECTTIMEOUT => 2,
                    CURLOPT_HTTPHEADER => [
                        'Content-Type: application/json',
                        'X-CRUDWorks-Event: ' . $eventName,
                        'X-CRUDWorks-Signature: sha256=' . $sig,
                    ],
                ]);
                $res = curl_exec($ch);
                $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $respBody = is_string($res) ? mb_substr($res, 0, 500) : curl_error($ch);
                curl_close($ch);
            } else {
                $ctx = stream_context_create([
                    'http' => [
                        'method' => 'POST',
                        'timeout' => 4,
                        'ignore_errors' => true,
                        'header' => "Content-Type: application/json\r\nX-CRUDWorks-Event: {$eventName}\r\nX-CRUDWorks-Signature: sha256={$sig}\r\n",
                        'content' => $body,
                    ],
                ]);
                $res = @file_get_contents($hook['target_url'], false, $ctx);
                $respBody = is_string($res) ? mb_substr($res, 0, 500) : 'Request failed';
                if (!empty($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
                    $code = (int)$m[1];
                }
            }

            $status = ($code >= 200 && $code < 300) ? 'success' : 'failed';
            $db->insert(
                "INSERT INTO webhook_logs (webhook_id, event_name, payload_json, response_code, response_body, status) VALUES (?, ?, ?, ?, ?, ?)",
                [(int)$hook['id'], $eventName, $body, $code ?: null, $respBody, $status]
            );
        }
    } catch (\Throwable $e) {
        // Jangan gagalkan transaksi utama bila webhook gagal
    }
}
