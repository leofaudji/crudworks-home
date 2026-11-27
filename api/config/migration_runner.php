<?php
declare(strict_types=1);

/**
 * Jalankan file migrasi SQL di folder /scratch satu kali saja saat aplikasi di-refresh.
 * File yang sudah dieksekusi dicatat pada tabel `schema_migrations`.
 */
function runScratchMigrations(): array
{
    $scratchDir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'scratch';
    if (!is_dir($scratchDir)) {
        return [];
    }

    $files = glob($scratchDir . DIRECTORY_SEPARATOR . '*.sql') ?: [];
    if (empty($files)) {
        return [];
    }
    sort($files, SORT_STRING);

    try {
        if (!class_exists('Database')) {
            require_once __DIR__ . '/env.php';
            require_once __DIR__ . '/app.php';
            require_once __DIR__ . '/database.php';
        }
        $db = Database::getInstance();
        $pdo = $db->getPdo();

        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS `schema_migrations` (
                `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                `filename` VARCHAR(191) NOT NULL UNIQUE,
                `checksum` CHAR(32) NOT NULL,
                `executed_at` DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );

        $executedRows = $db->fetchAll("SELECT filename FROM schema_migrations");
        $executedMap = [];
        foreach ($executedRows as $r) {
            $executedMap[$r['filename']] = true;
        }

        $ran = [];
        foreach ($files as $filePath) {
            $filename = basename($filePath);
            if (isset($executedMap[$filename])) {
                continue;
            }

            $sqlContent = @file_get_contents($filePath);
            if ($sqlContent === false || trim($sqlContent) === '') {
                continue;
            }

            $statements = _splitSqlStatements($sqlContent);
            foreach ($statements as $stmt) {
                try {
                    $pdo->exec($stmt);
                } catch (\PDOException $e) {
                    // Abaikan error idempotent: duplicate column (1060), duplicate key (1061), table exists (1050)
                    $driverCode = (int)($e->errorInfo[1] ?? 0);
                    if (!in_array($driverCode, [1050, 1060, 1061], true)) {
                        throw $e;
                    }
                }
            }

            $checksum = md5($sqlContent);
            $db->execute(
                "INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)",
                [$filename, $checksum]
            );
            $ran[] = $filename;
        }

        return $ran;
    } catch (\Throwable $e) {
        error_log('[CRUDWorks Migration] ' . $e->getMessage());
        return [];
    }
}

/**
 * Pecah isi file SQL menjadi statement individual dengan aman terhadap string literal dan komentar.
 */
function _splitSqlStatements(string $sql): array
{
    $sql = preg_replace('/^\xEF\xBB\xBF/', '', $sql);
    $lines = preg_split("/\r\n|\n|\r/", $sql) ?: [];
    $clean = [];
    foreach ($lines as $line) {
        $trimmed = ltrim($line);
        if (str_starts_with($trimmed, '--') || str_starts_with($trimmed, '#')) {
            continue;
        }
        $clean[] = $line;
    }
    $joined = implode("\n", $clean);
    $parts = preg_split('/;\s*(?:\r?\n|$)/', $joined) ?: [];
    return array_values(array_filter(array_map('trim', $parts), static fn($s) => $s !== ''));
}
