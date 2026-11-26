# scripts/verify.ps1 — Gerbang Verifikasi Terpadu (PHP, JS, JSON, Line Budget)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "== 1. Validasi Sintaks PHP (php -l) ==" -ForegroundColor Cyan
$phpCmdObj = Get-Command php -ErrorAction SilentlyContinue
$phpCmd = if ($phpCmdObj) { $phpCmdObj.Source } else { $null }
if (-not $phpCmd) {
    $phpExe = Get-ChildItem "D:\laragon\bin\php\php*\php.exe","C:\laragon\bin\php\php*\php.exe" -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
    if ($phpExe) { $phpCmd = $phpExe.FullName }
}
$phpFiles = Get-ChildItem -Path "api" -Filter "*.php" -Recurse
if (-not $phpCmd) {
    Write-Host "WARNING: php.exe tidak ditemukan di PATH maupun Laragon, melewati php -l." -ForegroundColor Yellow
} else {
    $phpFailed = 0
    foreach ($f in $phpFiles) {
        $out = & $phpCmd -l $f.FullName 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "FAIL: $($f.FullName) -> $out" -ForegroundColor Red
            $phpFailed++
        }
    }
    Write-Host "PHP checked: $($phpFiles.Count) files, Failed: $phpFailed"
    if ($phpFailed -gt 0) { exit 1 }
}

Write-Host "`n== 2. Validasi Sintaks JS (node -c) ==" -ForegroundColor Cyan
$jsFiles = @()
$jsFiles += Get-ChildItem -Path "assets/js" -Filter "*.js" -Recurse
$jsFiles += Get-ChildItem -Path "portal" -Filter "*.js" -Recurse
$jsFiles += Get-Item "sw.js"
$jsFailed = 0
foreach ($f in $jsFiles) {
    $out = & node -c $f.FullName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL: $($f.FullName) -> $out" -ForegroundColor Red
        $jsFailed++
    }
}
Write-Host "JS checked: $($jsFiles.Count) files, Failed: $jsFailed"
if ($jsFailed -gt 0) { exit 1 }

Write-Host "`n== 3. Validasi JSON (api/config/menus.json) ==" -ForegroundColor Cyan
try {
    $null = Get-Content "api/config/menus.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    Write-Host "menus.json: VALID" -ForegroundColor Green
} catch {
    Write-Host "menus.json: INVALID -> $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n== 4. Audit Ukuran File (> 500 baris, info refactor bertahap) ==" -ForegroundColor Yellow
$oversized = @()
foreach ($f in ($phpFiles + $jsFiles)) {
    $lines = (Get-Content $f.FullName).Count
    if ($lines -gt 500) {
        $oversized += [PSCustomObject]@{
            File  = $f.FullName.Replace("$root\", "")
            Lines = $lines
        }
    }
}
if ($oversized.Count -gt 0) {
    $oversized | Sort-Object Lines -Descending | Format-Table -AutoSize
} else {
    Write-Host "Semua file <= 500 baris." -ForegroundColor Green
}

Write-Host "`nVerifikasi selesai dengan status LOLOS." -ForegroundColor Green
exit 0
