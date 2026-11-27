<?php
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Jalankan migrasi SQL pending di folder /scratch (1x per file, dicatat di schema_migrations)
if (file_exists(__DIR__ . '/api/config/migration_runner.php')) {
    require_once __DIR__ . '/api/config/migration_runner.php';
    runScratchMigrations();
}

// Ambil versi terbaru dari CHANGELOG.md
$version = '1.0.0';
$changelogPath = __DIR__ . '/CHANGELOG.md';
if (file_exists($changelogPath)) {
    $changelogContent = file_get_contents($changelogPath);
    if (preg_match('/##\s*\[v?([\d.]+)\]/', $changelogContent, $matches)) {
        $version = $matches[1];
    }
}

$indexPath = __DIR__ . '/index.html';
if (!file_exists($indexPath)) {
    http_response_code(500);
    echo 'index.html tidak ditemukan.';
    exit;
}

$html = file_get_contents($indexPath);

// Inject dynamic version cache-buster based on newest JS/CSS asset
$maxTime = 0;
$assetDirs = [
    __DIR__ . '/assets/css',
    __DIR__ . '/assets/js',
    __DIR__ . '/assets/js/core',
    __DIR__ . '/assets/js/pages',
];
foreach ($assetDirs as $dir) {
    if (is_dir($dir)) {
        foreach (glob($dir . '/*.{js,css}', GLOB_BRACE) as $assetFile) {
            $mtime = filemtime($assetFile);
            if ($mtime > $maxTime) {
                $maxTime = $mtime;
            }
        }
    }
}
$jsTime = $maxTime > 0 ? $maxTime : time();
$versionCache = $version . '.' . $jsTime;

$html = str_replace('{{APP_VERSION_CACHE}}', $versionCache, $html);
$html = str_replace('{{APP_VERSION}}', $version, $html);

if (file_exists(__DIR__ . '/minify_html.php')) {
    require_once __DIR__ . '/minify_html.php';
    if (function_exists('minify_html')) {
        $html = minify_html($html);
    }
}

header('Content-Type: text/html; charset=UTF-8');
if (file_exists(__DIR__ . '/api/config/app.php')) {
    require_once __DIR__ . '/api/config/app.php';
    emitSecurityHeaders();
} else {
    header('X-Content-Type-Options: nosniff');
}
echo $html;
