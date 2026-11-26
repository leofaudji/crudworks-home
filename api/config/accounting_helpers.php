<?php
declare(strict_types=1);

/**
 * Ambil ID akun COA berdasarkan kode_akun.
 */
function getCoaIdByCode(string $kode): int
{
    $db = Database::getInstance();
    $row = $db->fetch("SELECT id FROM chart_of_accounts WHERE kode_akun = ?", [$kode]);
    return $row ? (int)$row['id'] : 0;
}

/**
 * Ambil ID akun COA dari konfigurasi app_settings, atau fallback ke kode akun default.
 */
function getMappedCoaId(string $settingKey, string $fallbackCode): int
{
    $db = Database::getInstance();
    $row = $db->fetch("SELECT nilai FROM app_settings WHERE kunci = ? LIMIT 1", [$settingKey]);
    if ($row && !empty($row['nilai']) && is_numeric($row['nilai'])) {
        $exist = $db->fetch("SELECT id FROM chart_of_accounts WHERE id = ?", [(int)$row['nilai']]);
        if ($exist) return (int)$exist['id'];
    }
    return getCoaIdByCode($fallbackCode);
}

/**
 * Ambil ID akun COA Kas/Bank dari rekening pembayaran (payment_methods.coa_id), atau fallback ke coa_kas_id / 1101.
 */
function getPaymentMethodCoaId(?int $paymentMethodId): int
{
    if ($paymentMethodId && $paymentMethodId > 0) {
        $db = Database::getInstance();
        $pm = $db->fetch("SELECT coa_id FROM payment_methods WHERE id = ? LIMIT 1", [$paymentMethodId]);
        if ($pm && !empty($pm['coa_id'])) {
            return (int)$pm['coa_id'];
        }
    }
    return getMappedCoaId('coa_kas_id', '1101');
}

/**
 * Cek apakah periode bulan (YYYY-MM) dari tanggal sudah ditutup buku.
 */
function isPeriodClosed(string $tanggal): bool
{
    $ym = date('Y-m', strtotime($tanggal) ?: time());
    $db = Database::getInstance();
    $row = $db->fetch("SELECT status FROM accounting_periods WHERE periode = ? LIMIT 1", [$ym]);
    return $row && $row['status'] === 'closed';
}

/**
 * Buat nomor jurnal unik: JRN-YYYYMM-XXXX
 */
function generateJournalNumber(string $tanggal): string
{
    $db = Database::getInstance();
    $ym = date('Ym', strtotime($tanggal) ?: time());
    $prefix = "JRN-{$ym}-";
    $last = $db->fetch("SELECT nomor_jurnal FROM journal_entries WHERE nomor_jurnal LIKE ? ORDER BY id DESC LIMIT 1", [$prefix . '%']);
    $seq = 1;
    if ($last && !empty($last['nomor_jurnal'])) {
        $parts = explode('-', (string)$last['nomor_jurnal']);
        $seq = (int)end($parts) + 1;
    }
    return $prefix . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);
}

/**
 * Posting / perbarui jurnal otomatis secara idempoten berdasarkan (sumber_tipe, sumber_id).
 * $lines: array of ['kode_akun' => '1101', 'debit' => 0, 'kredit' => 0, 'keterangan' => '...']
 */
function postAutoJournal(string $sumberTipe, int $sumberId, string $tanggal, string $deskripsi, array $lines, ?int $userId = null): int
{
    if (isPeriodClosed($tanggal)) {
        return 0;
    }
    $db = Database::getInstance();
    $pdo = $db->getPdo();

    $cleanLines = [];
    $totD = 0.0;
    $totK = 0.0;
    foreach ($lines as $ln) {
        $coaId = !empty($ln['coa_id']) ? (int)$ln['coa_id'] : getCoaIdByCode((string)($ln['kode_akun'] ?? ''));
        $d = round(max(0.0, (float)($ln['debit'] ?? 0)), 2);
        $k = round(max(0.0, (float)($ln['kredit'] ?? 0)), 2);
        if ($coaId <= 0 || ($d <= 0 && $k <= 0)) continue;
        $totD += $d;
        $totK += $k;
        $cleanLines[] = [
            'coa_id' => $coaId,
            'debit' => $d,
            'kredit' => $k,
            'keterangan' => mb_substr(trim((string)($ln['keterangan'] ?? '')), 0, 255) ?: null,
        ];
    }

    if (empty($cleanLines) || abs($totD - $totK) > 0.05) {
        return 0;
    }

    $ownTx = !$pdo->inTransaction();
    if ($ownTx) $pdo->beginTransaction();
    try {
        $existing = $db->fetch(
            "SELECT id FROM journal_entries WHERE sumber_tipe = ? AND sumber_id = ? LIMIT 1",
            [$sumberTipe, $sumberId]
        );

        if ($existing) {
            $jId = (int)$existing['id'];
            $pdo->prepare(
                "UPDATE journal_entries SET tanggal = ?, deskripsi = ?, total_debit = ?, total_kredit = ? WHERE id = ?"
            )->execute([$tanggal, mb_substr($deskripsi, 0, 255), $totD, $totK, $jId]);
            $pdo->prepare("DELETE FROM journal_items WHERE journal_id = ?")->execute([$jId]);
        } else {
            $no = generateJournalNumber($tanggal);
            $pdo->prepare(
                "INSERT INTO journal_entries (nomor_jurnal, tanggal, deskripsi, sumber_tipe, sumber_id, total_debit, total_kredit, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            )->execute([$no, $tanggal, mb_substr($deskripsi, 0, 255), $sumberTipe, $sumberId, $totD, $totK, $userId]);
            $jId = (int)$pdo->lastInsertId();
        }

        $stmtItem = $pdo->prepare(
            "INSERT INTO journal_items (journal_id, coa_id, debit, kredit, keterangan) VALUES (?, ?, ?, ?, ?)"
        );
        foreach ($cleanLines as $cl) {
            $stmtItem->execute([$jId, $cl['coa_id'], $cl['debit'], $cl['kredit'], $cl['keterangan']]);
        }

        if ($ownTx) $pdo->commit();
        return $jId;
    } catch (\Throwable $e) {
        if ($ownTx && $pdo->inTransaction()) $pdo->rollBack();
        return 0;
    }
}

/**
 * Auto-jurnal Faktur Penjualan: Debit Piutang Usaha, Kredit Pendapatan & PPN Keluaran.
 */
function postJournalForInvoice(int $invoiceId): void
{
    try {
        $db = Database::getInstance();
        $inv = $db->fetch(
            "SELECT i.*, c.nama_perusahaan FROM invoices i JOIN clients c ON i.client_id = c.id WHERE i.id = ?",
            [$invoiceId]
        );
        if (!$inv) return;

        if (in_array($inv['status'], ['draft', 'batal', 'dibatalkan'], true)) {
            $db->execute("DELETE FROM journal_entries WHERE sumber_tipe = 'invoice' AND sumber_id = ?", [$invoiceId]);
            return;
        }

        $total = round((float)$inv['total_tagihan'], 2);
        $ppn = round((float)$inv['pajak_nominal'], 2);
        $dpp = round(max(0.0, $total - $ppn), 2);
        if ($total <= 0) return;

        $lines = [
            ['coa_id' => getMappedCoaId('coa_piutang_id', '1102'), 'debit' => $total, 'kredit' => 0, 'keterangan' => "Piutang {$inv['nomor_invoice']}"],
            ['coa_id' => getMappedCoaId('coa_pendapatan_id', '4101'), 'debit' => 0, 'kredit' => $dpp, 'keterangan' => "Pendapatan {$inv['nomor_invoice']}"],
        ];
        if ($ppn > 0) {
            $lines[] = ['coa_id' => getMappedCoaId('coa_ppn_keluaran_id', '2102'), 'debit' => 0, 'kredit' => $ppn, 'keterangan' => "PPN Keluaran {$inv['nomor_invoice']}"];
        }

        postAutoJournal(
            'invoice',
            $invoiceId,
            (string)($inv['tanggal_invoice'] ?: date('Y-m-d')),
            "Pengakuan Faktur {$inv['nomor_invoice']} - {$inv['nama_perusahaan']}",
            $lines,
            !empty($inv['created_by']) ? (int)$inv['created_by'] : null
        );
    } catch (\Throwable $e) {
    }
}

/**
 * Auto-jurnal Pembayaran Masuk: Debit Kas/Bank, Kredit Piutang Usaha.
 */
function postJournalForPayment(int $paymentId): void
{
    try {
        $db = Database::getInstance();
        $pay = $db->fetch(
            "SELECT py.*, i.nomor_invoice, c.nama_perusahaan
             FROM payments py
             JOIN invoices i ON py.invoice_id = i.id
             JOIN clients c ON i.client_id = c.id
             WHERE py.id = ?",
            [$paymentId]
        );
        if (!$pay || (float)$pay['jumlah_bayar'] <= 0) return;

        $amt = round((float)$pay['jumlah_bayar'], 2);
        $kasCoaId = getPaymentMethodCoaId(!empty($pay['payment_method_id']) ? (int)$pay['payment_method_id'] : null);
        $piutangCoaId = getMappedCoaId('coa_piutang_id', '1102');
        postAutoJournal(
            'payment',
            $paymentId,
            (string)($pay['tanggal_bayar'] ?: date('Y-m-d')),
            "Pelunasan {$pay['nomor_pembayaran']} ({$pay['nomor_invoice']}) - {$pay['nama_perusahaan']}",
            [
                ['coa_id' => $kasCoaId, 'debit' => $amt, 'kredit' => 0, 'keterangan' => "Kas masuk {$pay['nomor_pembayaran']}"],
                ['coa_id' => $piutangCoaId, 'debit' => 0, 'kredit' => $amt, 'keterangan' => "Pelunasan piutang {$pay['nomor_invoice']}"],
            ],
            !empty($pay['verified_by']) ? (int)$pay['verified_by'] : null
        );
    } catch (\Throwable $e) {
    }
}

/**
 * Auto-jurnal Beban & Pengeluaran: Debit Beban + PPN Masukan, Kredit Kas/Bank + Hutang PPh 23.
 */
function postJournalForExpense(int $expenseId): void
{
    try {
        $db = Database::getInstance();
        $exp = $db->fetch("SELECT * FROM expenses WHERE id = ?", [$expenseId]);
        if (!$exp) return;

        if ($exp['status'] !== 'lunas') {
            $db->execute("DELETE FROM journal_entries WHERE sumber_tipe = 'expense' AND sumber_id = ?", [$expenseId]);
            return;
        }

        $jumlah = round((float)$exp['jumlah'], 2);
        $ppnMas = round((float)($exp['ppn_masukan'] ?? 0), 2);
        $pph23 = round((float)($exp['pph23_nominal'] ?? 0), 2);
        $kasKeluar = round(max(0.0, $jumlah + $ppnMas - $pph23), 2);
        if ($jumlah <= 0) return;

        $kasCoaId = getPaymentMethodCoaId(!empty($exp['payment_method_id']) ? (int)$exp['payment_method_id'] : null);
        $lines = [
            ['coa_id' => getMappedCoaId('coa_beban_id', '5101'), 'debit' => $jumlah, 'kredit' => 0, 'keterangan' => $exp['judul']],
        ];
        if ($ppnMas > 0) {
            $lines[] = ['coa_id' => getMappedCoaId('coa_ppn_masukan_id', '1103'), 'debit' => $ppnMas, 'kredit' => 0, 'keterangan' => "PPN Masukan {$exp['nomor_pengeluaran']}"];
        }
        if ($kasKeluar > 0) {
            $lines[] = ['coa_id' => $kasCoaId, 'debit' => 0, 'kredit' => $kasKeluar, 'keterangan' => "Kas keluar {$exp['nomor_pengeluaran']}"];
        }
        if ($pph23 > 0) {
            $lines[] = ['coa_id' => getMappedCoaId('coa_hutang_pph23_id', '2101'), 'debit' => 0, 'kredit' => $pph23, 'keterangan' => "Potongan PPh 23 {$exp['nomor_pengeluaran']}"];
        }

        postAutoJournal(
            'expense',
            $expenseId,
            (string)($exp['tanggal'] ?: date('Y-m-d')),
            "Pengeluaran {$exp['nomor_pengeluaran']} - {$exp['judul']}",
            $lines,
            !empty($exp['created_by']) ? (int)$exp['created_by'] : null
        );
    } catch (\Throwable $e) {
    }
}

/**
 * Sinkronkan seluruh invoice, payment, dan expense yang sudah ada ke jurnal akuntansi.
 */
function syncAllExistingTransactionsToJournals(): array
{
    $db = Database::getInstance();
    $invRows = $db->fetchAll("SELECT id FROM invoices WHERE status NOT IN ('draft','batal','dibatalkan')");
    foreach ($invRows as $r) postJournalForInvoice((int)$r['id']);

    $payRows = $db->fetchAll("SELECT id FROM payments");
    foreach ($payRows as $r) postJournalForPayment((int)$r['id']);

    $expRows = $db->fetchAll("SELECT id FROM expenses WHERE status = 'lunas'");
    foreach ($expRows as $r) postJournalForExpense((int)$r['id']);

    return [
        'invoices' => count($invRows),
        'payments' => count($payRows),
        'expenses' => count($expRows),
    ];
}
