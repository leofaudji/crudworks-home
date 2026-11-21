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

function generateInvoiceNo($prefix = 'INV-')
{
    $db = Database::getInstance();
    $yearMonth = date('Ym');
    $pattern = $prefix . $yearMonth . '-%';
    
    $last = $db->fetch(
        "SELECT nomor_invoice FROM invoices WHERE nomor_invoice LIKE ? ORDER BY id DESC LIMIT 1",
        [$pattern]
    );

    if ($last && !empty($last['nomor_invoice'])) {
        $parts = explode('-', $last['nomor_invoice']);
        $lastSeq = (int)end($parts);
        $nextSeq = $lastSeq + 1;
    } else {
        $nextSeq = 1;
    }

    return $prefix . $yearMonth . '-' . str_pad((string)$nextSeq, 4, '0', STR_PAD_LEFT);
}

function generatePaymentNo($prefix = 'PAY-')
{
    $db = Database::getInstance();
    $yearMonth = date('Ym');
    $pattern = $prefix . $yearMonth . '-%';

    $last = $db->fetch(
        "SELECT nomor_pembayaran FROM payments WHERE nomor_pembayaran LIKE ? ORDER BY id DESC LIMIT 1",
        [$pattern]
    );

    if ($last && !empty($last['nomor_pembayaran'])) {
        $parts = explode('-', $last['nomor_pembayaran']);
        $lastSeq = (int)end($parts);
        $nextSeq = $lastSeq + 1;
    } else {
        $nextSeq = 1;
    }

    return $prefix . $yearMonth . '-' . str_pad((string)$nextSeq, 4, '0', STR_PAD_LEFT);
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
