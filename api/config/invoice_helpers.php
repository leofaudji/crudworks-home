<?php
/**
 * Invoice & Financial Helper Functions
 */

function formatIDR($number)
{
    return 'Rp ' . number_format((float)$number, 0, ',', '.');
}

function formatDateIndo($date)
{
    if (!$date || $date === '0000-00-00') return '-';
    $months = [
        1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    $ts = strtotime($date);
    $d = date('j', $ts);
    $m = $months[(int)date('n', $ts)];
    $y = date('Y', $ts);
    return "$d $m $y";
}

function generateDocNumber(string $table, string $column, string $prefix, int $pad = 4, bool $withYearMonth = true, string $separator = '-'): string
{
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $table) || !preg_match('/^[a-zA-Z0-9_]+$/', $column)) {
        throw new \InvalidArgumentException('Invalid table or column name');
    }
    $db = Database::getInstance();
    $basePrefix = $withYearMonth ? ($prefix . date('Ym') . $separator) : $prefix;
    $last = $db->fetch(
        "SELECT `{$column}` AS doc_no FROM `{$table}` WHERE `{$column}` LIKE ? ORDER BY id DESC LIMIT 1",
        [$basePrefix . '%']
    );

    $nextSeq = 1;
    if ($last && !empty($last['doc_no']) && preg_match('/(\d+)$/', (string)$last['doc_no'], $m)) {
        $nextSeq = (int)$m[1] + 1;
    }

    return $basePrefix . str_pad((string)$nextSeq, $pad, '0', STR_PAD_LEFT);
}

function generateInvoiceNo($prefix = 'INV-')
{
    return generateDocNumber('invoices', 'nomor_invoice', $prefix, 4, true, '-');
}

function generatePaymentNo($prefix = 'PAY-')
{
    return generateDocNumber('payments', 'nomor_pembayaran', $prefix, 4, true, '-');
}

function getDefaultTaxPercent()
{
    static $defaultTax = null;
    if ($defaultTax !== null) {
        return $defaultTax;
    }

    try {
        $db = Database::getInstance();
        $row = $db->fetch("SELECT nilai FROM app_settings WHERE kunci = 'invoice_tax_percent' LIMIT 1");
        if ($row && isset($row['nilai']) && $row['nilai'] !== '') {
            $defaultTax = max(0, (float)$row['nilai']);
            return $defaultTax;
        }
    } catch (\Throwable $e) {
        // Fallback if table not ready
    }

    $defaultTax = 0.00;
    return $defaultTax;
}

function calculateInvoiceTotals($items, $diskonTipe = 'nominal', $diskonNilai = 0, $pajakPersen = 0)
{
    $subtotal = 0;
    foreach ($items as $item) {
        $qty = (float)($item['kuantitas'] ?? 1);
        $price = (float)($item['harga_satuan'] ?? 0);
        $subtotal += ($qty * $price);
    }

    $diskon = 0;
    if ($diskonTipe === 'persen') {
        $diskon = $subtotal * ((float)$diskonNilai / 100);
    } else {
        $diskon = (float)$diskonNilai;
    }
    if ($diskon > $subtotal) $diskon = $subtotal;

    $afterDiscount = $subtotal - $diskon;
    $pajakNominal = $afterDiscount * ((float)$pajakPersen / 100);
    $total = $afterDiscount + $pajakNominal;

    return [
        'subtotal' => round($subtotal, 2),
        'diskon' => round($diskon, 2),
        'after_discount' => round($afterDiscount, 2),
        'pajak_nominal' => round($pajakNominal, 2),
        'total' => round($total, 2)
    ];
}
