<?php
// api/controllers/BackupController.php
// Modul Cadangan & Pemulihan Database (Backup & Restore)

authCheck();
$db = Database::getInstance();
$pdo = $db->getPdo();
$backupDir = __DIR__ . '/../../storage/backups';

if (!is_dir($backupDir)) {
    @mkdir($backupDir, 0755, true);
}

// Helper: Format bytes to human readable format
function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= pow(1024, $pow);
    return round($bytes, $precision) . ' ' . $units[$pow];
}

// 1. GET: Informasi Statistik, Daftar Tabel, dan Berkas Cadangan
if ($method === 'GET') {
    // Sub-aksi: Download file cadangan langsung
    if ($action === 'download' || $id === 'download' || ($params['action'] ?? '') === 'download' || isset($_GET['download'])) {
        checkPermission('database.backup');
        $fileName = basename($params['file'] ?? $_GET['file'] ?? $id ?? '');
        if (!$fileName || !preg_match('/^[a-zA-Z0-9_\-\.]+\.(sql|sql\.gz|gz)$/', $fileName)) {
            errorResponse('Nama berkas cadangan tidak valid', 400);
        }

        $filePath = $backupDir . '/' . $fileName;
        if (!file_exists($filePath)) {
            errorResponse('Berkas cadangan tidak ditemukan di server', 404);
        }

        // Release session lock before file transfer
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

        $isGz = str_ends_with($fileName, '.gz');
        header('Content-Description: File Transfer');
        header('Content-Type: ' . ($isGz ? 'application/gzip' : 'application/sql'));
        header('Content-Disposition: attachment; filename="' . $fileName . '"');
        header('Content-Transfer-Encoding: binary');
        header('Expires: 0');
        header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
        header('Pragma: public');
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
        exit;
    }

    checkPermission(['database.backup', 'settings.edit']);

    // Info Mesin & Versi MySQL
    $versionRow = $db->fetch("SELECT VERSION() as v");
    $dbNameRow = $db->fetch("SELECT DATABASE() as db");
    $dbName = $dbNameRow['db'] ?? 'crudworks_erp';
    $dbVersion = $versionRow['v'] ?? 'MySQL';

    // Status Tabel & Ukuran Database
    $tableRows = $db->fetchAll(
        "SELECT TABLE_NAME as nama, ENGINE as engine, TABLE_ROWS as rows_approx, 
                DATA_LENGTH as data_bytes, INDEX_LENGTH as index_bytes,
                (DATA_LENGTH + INDEX_LENGTH) as total_bytes,
                TABLE_COMMENT as komentar
         FROM information_schema.TABLES 
         WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
         ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC",
        [$dbName]
    );

    $totalDbBytes = 0;
    $totalRecords = 0;
    $tablesData = [];

    foreach ($tableRows as $t) {
        $totalDbBytes += (int)$t['total_bytes'];
        $exactCount = (int)$db->count("SELECT COUNT(*) FROM `{$t['nama']}`");
        $totalRecords += $exactCount;

        $tablesData[] = [
            'name' => $t['nama'],
            'engine' => $t['engine'] ?? 'InnoDB',
            'records' => $exactCount,
            'data_size' => formatBytes((int)$t['data_bytes']),
            'index_size' => formatBytes((int)$t['index_bytes']),
            'total_size' => formatBytes((int)$t['total_bytes']),
            'total_bytes' => (int)$t['total_bytes']
        ];
    }

    // Pindai berkas cadangan di storage/backups/
    $backupFiles = [];
    $scanned = scandir($backupDir);
    if ($scanned) {
        foreach ($scanned as $f) {
            if ($f === '.' || $f === '..' || $f === '.htaccess') continue;
            if (preg_match('/^.+\.(sql|sql\.gz|gz)$/i', $f)) {
                $fPath = $backupDir . '/' . $f;
                $size = filesize($fPath);
                $mtime = filemtime($fPath);
                $isGz = str_ends_with(strtolower($f), '.gz');
                $isStruct = str_contains(strtolower($f), 'structure') || str_contains(strtolower($f), 'struct');

                $backupFiles[] = [
                    'filename' => $f,
                    'size_bytes' => $size,
                    'size' => formatBytes($size),
                    'created_at' => date('Y-m-d H:i:s', $mtime),
                    'timestamp' => $mtime,
                    'is_compressed' => $isGz,
                    'type' => $isStruct ? 'structure_only' : 'full',
                    'type_label' => $isStruct ? 'Struktur Saja' : 'Penuh (Struktur & Data)'
                ];
            }
        }
    }

    // Urutkan cadangan terbaru di atas
    usort($backupFiles, fn($a, $b) => $b['timestamp'] <=> $a['timestamp']);

    $lastBackup = !empty($backupFiles) ? $backupFiles[0]['created_at'] : null;

    successResponse([
        'overview' => [
            'database_name' => $dbName,
            'database_version' => $dbVersion,
            'table_count' => count($tablesData),
            'total_records' => $totalRecords,
            'total_size' => formatBytes($totalDbBytes),
            'total_bytes' => $totalDbBytes,
            'last_backup' => $lastBackup,
            'backup_count' => count($backupFiles),
            'storage_path' => 'storage/backups/'
        ],
        'tables' => $tablesData,
        'backups' => $backupFiles
    ]);
}

// 2. POST: Buat Cadangan Baru ATAU Pulihkan Database
if ($method === 'POST') {
    // ==========================================
    // AKSI 1: PULIHKAN DATABASE (RESTORE)
    // ==========================================
    if ($action === 'restore' || $id === 'restore' || ($params['action'] ?? '') === 'restore') {
        checkPermission(['database.restore', 'settings.edit']);
        @set_time_limit(600);
        @ini_set('memory_limit', '512M');

        $sqlContent = null;
        $sourceName = '';

        // Kasus A: Upload file langsung via FormData
        if (!empty($_FILES['backup_file']['tmp_name'])) {
            $upload = $_FILES['backup_file'];
            if ($upload['error'] !== UPLOAD_ERR_OK) {
                errorResponse('Gagal mengunggah berkas cadangan (Kode: ' . $upload['error'] . ')', 400);
            }

            $sourceName = basename($upload['name']);
            $tmpPath = $upload['tmp_name'];
            $isGz = str_ends_with(strtolower($sourceName), '.gz');

            if ($isGz) {
                if (!function_exists('gzdecode')) {
                    errorResponse('Ekstensi zlib tidak aktif di PHP untuk dekompresi gzip', 500);
                }
                $raw = file_get_contents($tmpPath);
                $sqlContent = @gzdecode($raw);
                if ($sqlContent === false) {
                    errorResponse('Berkas cadangan Gzip rusak atau tidak dapat didekompresi', 400);
                }
            } else {
                $sqlContent = file_get_contents($tmpPath);
            }
        } 
        // Kasus B: Pilih dari berkas arsip yang sudah ada di server
        elseif (!empty($params['filename'])) {
            $fName = basename($params['filename']);
            $fPath = $backupDir . '/' . $fName;
            if (!file_exists($fPath)) {
                errorResponse('Berkas cadangan "' . $fName . '" tidak ditemukan di server', 404);
            }

            $sourceName = $fName;
            $isGz = str_ends_with(strtolower($fName), '.gz');
            if ($isGz) {
                $raw = file_get_contents($fPath);
                $sqlContent = @gzdecode($raw);
                if ($sqlContent === false) {
                    errorResponse('Berkas cadangan Gzip rusak atau tidak dapat didekompresi', 400);
                }
            } else {
                $sqlContent = file_get_contents($fPath);
            }
        } else {
            errorResponse('Silakan pilih berkas cadangan dari server atau unggah file .sql/.sql.gz', 400);
        }

        if (empty($sqlContent) || strlen(trim($sqlContent)) < 10) {
            errorResponse('Isi berkas cadangan SQL kosong atau tidak valid', 400);
        }

        // Eksekusi Pemulihan Database
        try {
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
            $pdo->exec("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';");

            // Parser SQL cerdas: Pisahkan berdasarkan statement semicolon dengan memperhatikan kutip string
            $queries = [];
            $len = strlen($sqlContent);
            $query = '';
            $inString = false;
            $stringChar = '';
            $inComment = false;

            for ($i = 0; $i < $len; $i++) {
                $char = $sqlContent[$i];
                $nextChar = ($i + 1 < $len) ? $sqlContent[$i + 1] : '';

                // Tangani komentar baris (-- atau #)
                if (!$inString && !$inComment && (($char === '-' && $nextChar === '-') || $char === '#')) {
                    $eol = strpos($sqlContent, "\n", $i);
                    if ($eol === false) break;
                    $i = $eol;
                    continue;
                }

                // Tangani komentar blok (/* ... */)
                if (!$inString && !$inComment && $char === '/' && $nextChar === '*') {
                    $endComment = strpos($sqlContent, '*/', $i + 2);
                    if ($endComment === false) break;
                    $i = $endComment + 1;
                    continue;
                }

                // Tangani kutip string tunggal / ganda
                if (($char === "'" || $char === '"') && ($i === 0 || $sqlContent[$i - 1] !== '\\')) {
                    if (!$inString) {
                        $inString = true;
                        $stringChar = $char;
                    } elseif ($stringChar === $char) {
                        $inString = false;
                    }
                }

                // Akhir statement semicolon di luar string
                if ($char === ';' && !$inString) {
                    $trimmed = trim($query);
                    if ($trimmed !== '') {
                        $queries[] = $trimmed;
                    }
                    $query = '';
                    continue;
                }

                $query .= $char;
            }

            $trimmed = trim($query);
            if ($trimmed !== '') {
                $queries[] = $trimmed;
            }

            // Jalankan setiap statement SQL
            $executedCount = 0;
            foreach ($queries as $q) {
                // Lewati komentar atau baris kosong
                if ($q === '' || str_starts_with($q, '--') || str_starts_with($q, '/*')) continue;
                $pdo->exec($q);
                $executedCount++;
            }

            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

            // Bersihkan semua cache sistem
            clearCache(['invoices', 'quotations', 'clients', 'projects', 'reports', 'settings', 'dashboard', 'bank-accounts']);

            logActivity('RESTORE', 'system_database', null, [
                'source' => $sourceName,
                'queries_executed' => $executedCount
            ]);

            successResponse([
                'source' => $sourceName,
                'queries_executed' => $executedCount,
                'message' => "Pemulihan database berhasil dieksekusi ($executedCount perintah SQL dijalankan)"
            ], 'Basis data berhasil dipulihkan secara menyeluruh');
        } catch (\Throwable $e) {
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
            errorResponse('Gagal memulihkan database: ' . $e->getMessage(), 500);
        }
    }

    // ==========================================
    // AKSI 2: BUAT CADANGAN BARU (BACKUP)
    // ==========================================
    checkPermission(['database.backup', 'settings.edit']);
    @set_time_limit(600);
    @ini_set('memory_limit', '512M');

    $type = ($params['tipe'] ?? 'full') === 'structure_only' ? 'structure_only' : 'full';
    $compress = !empty($params['compress']) && ($params['compress'] === '1' || $params['compress'] === true || $params['compress'] === 'true');
    $customNote = trim($params['catatan'] ?? '');

    $dbNameRow = $db->fetch("SELECT DATABASE() as db");
    $dbName = $dbNameRow['db'] ?? 'crudworks_erp';

    // Ambil semua tabel dasar
    $tables = $db->fetchAll("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
    if (empty($tables)) {
        errorResponse('Tidak ada tabel yang ditemukan di database untuk dicadangkan', 400);
    }

    $timestamp = date('Y-m-d H:i:s');
    $fileSuffix = date('Ymd_His') . '_' . ($type === 'structure_only' ? 'struct' : 'full');
    $baseFileName = "crudworks_backup_{$fileSuffix}.sql";

    // Header Dump SQL Standar
    $dump = "-- ============================================================\n";
    $dump .= "-- CRUDWorks ERP - Arsip Cadangan Database Resmi\n";
    $dump .= "-- Waktu Pembuatan : {$timestamp}\n";
    $dump .= "-- Basis Data      : `{$dbName}`\n";
    $dump .= "-- Mode Cadangan   : " . ($type === 'structure_only' ? 'Hanya Struktur Skema (DDL)' : 'Penuh (Struktur & Seluruh Data)') . "\n";
    $dump .= "-- ============================================================\n\n";
    $dump .= "SET NAMES utf8mb4;\n";
    $dump .= "SET FOREIGN_KEY_CHECKS = 0;\n";
    $dump .= "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n";
    $dump .= "SET AUTOCOMMIT = 0;\n";
    $dump .= "START TRANSACTION;\n\n";

    $totalDumpedRows = 0;

    foreach ($tables as $tRow) {
        $table = array_values($tRow)[0];

        $dump .= "-- ------------------------------------------------------------\n";
        $dump .= "-- Struktur Tabel untuk `{$table}`\n";
        $dump .= "-- ------------------------------------------------------------\n";
        $dump .= "DROP TABLE IF EXISTS `{$table}`;\n";

        $createRow = $db->fetch("SHOW CREATE TABLE `{$table}`");
        $createSql = $createRow['Create Table'] ?? '';
        $dump .= $createSql . ";\n\n";

        // Dump data jika mode full
        if ($type === 'full') {
            $totalRows = (int)$db->count("SELECT COUNT(*) FROM `{$table}`");
            if ($totalRows > 0) {
                $dump .= "-- Memasukkan Data untuk `{$table}` ({$totalRows} baris)\n";
                $chunkSize = 250;
                $offset = 0;

                while ($offset < $totalRows) {
                    $rows = $db->fetchAll("SELECT * FROM `{$table}` LIMIT {$chunkSize} OFFSET {$offset}");
                    if (empty($rows)) break;

                    $columns = array_keys($rows[0]);
                    $colList = implode('`, `', $columns);

                    $dump .= "INSERT INTO `{$table}` (`{$colList}`) VALUES\n";
                    $valueLines = [];

                    foreach ($rows as $row) {
                        $escapedVals = [];
                        foreach ($columns as $col) {
                            $val = $row[$col];
                            if ($val === null) {
                                $escapedVals[] = "NULL";
                            } elseif (is_numeric($val) && !is_string($val)) {
                                $escapedVals[] = $val;
                            } else {
                                $escapedVals[] = $pdo->quote((string)$val);
                            }
                        }
                        $valueLines[] = "(" . implode(', ', $escapedVals) . ")";
                        $totalDumpedRows++;
                    }

                    $dump .= implode(",\n", $valueLines) . ";\n";
                    $offset += $chunkSize;
                }
                $dump .= "\n";
            }
        }
    }

    $dump .= "COMMIT;\n";
    $dump .= "SET FOREIGN_KEY_CHECKS = 1;\n";
    $dump .= "-- Selesai Pembuatan Cadangan Database CRUDWorks ERP --\n";

    // Simpan ke storage
    $finalFileName = $baseFileName;
    $fileData = $dump;

    if ($compress) {
        if (!function_exists('gzencode')) {
            errorResponse('Fungsi kompresi gzencode tidak tersedia pada lingkungan PHP server', 500);
        }
        $finalFileName .= '.gz';
        $fileData = gzencode($dump, 9);
    }

    $targetPath = $backupDir . '/' . $finalFileName;
    $written = file_put_contents($targetPath, $fileData);

    if ($written === false) {
        errorResponse('Gagal menulis berkas cadangan ke direktori penyimpanan server', 500);
    }

    $fileSize = filesize($targetPath);

    // Rekam ke backup_logs
    try {
        $db->execute(
            "INSERT INTO backup_logs (user_id, filename, filesize, tipe, format, status, catatan) 
             VALUES (?, ?, ?, ?, ?, 'success', ?)",
            [
                $_SESSION['user_id'] ?? null,
                $finalFileName,
                $fileSize,
                $type,
                $compress ? 'sql.gz' : 'sql',
                $customNote ?: 'Cadangan otomatis dibuat oleh staf ' . ($_SESSION['username'] ?? 'admin')
            ]
        );
    } catch (\Throwable $e) {
        error_log("Gagal merekam backup_log: " . $e->getMessage());
    }

    logActivity('BACKUP', 'system_database', null, [
        'filename' => $finalFileName,
        'filesize' => $fileSize,
        'tipe' => $type,
        'rows_dumped' => $totalDumpedRows
    ]);

    successResponse([
        'filename' => $finalFileName,
        'filesize' => $fileSize,
        'filesize_formatted' => formatBytes($fileSize),
        'tipe' => $type,
        'rows_dumped' => $totalDumpedRows,
        'created_at' => date('Y-m-d H:i:s'),
        'download_url' => "api/backup?action=download&file=" . urlencode($finalFileName)
    ], 'Cadangan database berhasil dibuat dengan sukses', 201);
}

// 3. DELETE: Hapus Berkas Cadangan dari Server
if ($method === 'DELETE') {
    checkPermission(['database.backup', 'settings.edit']);

    $fileName = basename($id ?? $params['file'] ?? '');
    if (!$fileName || !preg_match('/^[a-zA-Z0-9_\-\.]+\.(sql|sql\.gz|gz)$/', $fileName)) {
        errorResponse('Nama berkas cadangan tidak valid', 400);
    }

    $filePath = $backupDir . '/' . $fileName;
    if (!file_exists($filePath)) {
        errorResponse('Berkas cadangan tidak ditemukan di server', 404);
    }

    if (!@unlink($filePath)) {
        errorResponse('Gagal menghapus berkas cadangan dari server (masalah izin file)', 500);
    }

    try {
        $db->execute("DELETE FROM backup_logs WHERE filename = ?", [$fileName]);
    } catch (\Throwable $e) {}

    logActivity('DELETE', 'system_database', null, ['filename' => $fileName]);

    successResponse(['filename' => $fileName], 'Berkas cadangan berhasil dihapus');
}

errorResponse('Metode HTTP tidak didukung', 405);
