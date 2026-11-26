<?php
// ReportController.php

authCheck();
checkPermission('report.view');
$db = Database::getInstance();

$reportRespond = initReportCache('report', (string)$id, $params, ['start_date', 'end_date', 'tahun', 'client_id']);

switch ($id) {
    case 'aging':
        // Laporan Aging Piutang per Klien
        // Bucket: Belum JT (Current), 1-30 hari, 31-60 hari, 61-90 hari, >90 hari
        $sql = "
            SELECT 
                c.id as client_id,
                c.kode_klien,
                c.nama_perusahaan,
                c.penanggung_jawab,
                c.telepon,
                COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), i.tanggal_jatuh_tempo) <= 0 THEN i.sisa_tagihan ELSE 0 END), 0) as current_amount,
                COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), i.tanggal_jatuh_tempo) BETWEEN 1 AND 30 THEN i.sisa_tagihan ELSE 0 END), 0) as overdue_1_30,
                COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), i.tanggal_jatuh_tempo) BETWEEN 31 AND 60 THEN i.sisa_tagihan ELSE 0 END), 0) as overdue_31_60,
                COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), i.tanggal_jatuh_tempo) BETWEEN 61 AND 90 THEN i.sisa_tagihan ELSE 0 END), 0) as overdue_61_90,
                COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), i.tanggal_jatuh_tempo) > 90 THEN i.sisa_tagihan ELSE 0 END), 0) as overdue_over_90,
                COALESCE(SUM(i.sisa_tagihan), 0) as total_piutang
            FROM clients c
            JOIN invoices i ON c.id = i.client_id
            WHERE i.status IN ('dikirim', 'sebagian', 'jatuh_tempo') AND i.sisa_tagihan > 0
            GROUP BY c.id, c.kode_klien, c.nama_perusahaan, c.penanggung_jawab, c.telepon
            HAVING total_piutang > 0
            ORDER BY total_piutang DESC
        ";

        $rows = $db->fetchAll($sql);

        $grandTotal = [
            'current_amount' => 0,
            'overdue_1_30' => 0,
            'overdue_31_60' => 0,
            'overdue_61_90' => 0,
            'overdue_over_90' => 0,
            'total_piutang' => 0
        ];

        foreach ($rows as $r) {
            $grandTotal['current_amount'] += (float)$r['current_amount'];
            $grandTotal['overdue_1_30'] += (float)$r['overdue_1_30'];
            $grandTotal['overdue_31_60'] += (float)$r['overdue_31_60'];
            $grandTotal['overdue_61_90'] += (float)$r['overdue_61_90'];
            $grandTotal['overdue_over_90'] += (float)$r['overdue_over_90'];
            $grandTotal['total_piutang'] += (float)$r['total_piutang'];
        }

        $reportRespond([
            'items' => $rows,
            'totals' => $grandTotal
        ]);
        break;

    case 'revenue':
        $startDate = trim($params['start_date'] ?? date('Y-m-01'));
        $endDate = trim($params['end_date'] ?? date('Y-m-d'));

        // Transaksi pembayaran dalam rentang tanggal
        $payments = $db->fetchAll(
            "SELECT py.*, i.nomor_invoice, c.nama_perusahaan as client_nama, pm.nama_metode 
             FROM payments py
             JOIN invoices i ON py.invoice_id = i.id
             JOIN clients c ON i.client_id = c.id
             JOIN payment_methods pm ON py.payment_method_id = pm.id
             WHERE py.tanggal_bayar BETWEEN ? AND ?
             ORDER BY py.tanggal_bayar DESC",
            [$startDate, $endDate]
        );

        $totalRevenue = 0;
        $byMethod = [];
        foreach ($payments as $p) {
            $amt = (float)$p['jumlah_bayar'];
            $totalRevenue += $amt;
            $mName = $p['nama_metode'];
            $byMethod[$mName] = ($byMethod[$mName] ?? 0) + $amt;
        }

        $reportRespond([
            'start_date' => $startDate,
            'end_date' => $endDate,
            'total_revenue' => $totalRevenue,
            'by_method' => $byMethod,
            'transactions' => $payments
        ]);
        break;

    case 'statement':
        $clientId = (int)($params['client_id'] ?? 0);
        if (!$clientId) errorResponse('Klien wajib dipilih');

        $client = $db->fetch("SELECT * FROM clients WHERE id = ?", [$clientId]);
        if (!$client) errorResponse('Klien tidak ditemukan', 404);

        // Ambil semua invoice klien
        $invoices = $db->fetchAll(
            "SELECT id, nomor_invoice as ref, tanggal_invoice as tanggal, 'Tagihan Diterbitkan' as deskripsi, 
                    total_tagihan as debit, 0.00 as kredit, status 
             FROM invoices 
             WHERE client_id = ? AND status != 'batal'",
            [$clientId]
        );

        // Ambil semua pembayaran klien
        $payments = $db->fetchAll(
            "SELECT py.id, py.nomor_pembayaran as ref, py.tanggal_bayar as tanggal, 
                    CONCAT('Pembayaran Tagihan ', i.nomor_invoice) as deskripsi,
                    0.00 as debit, py.jumlah_bayar as kredit, 'lunas' as status
             FROM payments py
             JOIN invoices i ON py.invoice_id = i.id
             WHERE i.client_id = ?",
            [$clientId]
        );

        // Gabungkan dan urutkan berdasarkan tanggal ASC
        $ledger = array_merge($invoices, $payments);
        usort($ledger, function($a, $b) {
            return strcmp($a['tanggal'], $b['tanggal']);
        });

        // Hitung running balance
        $runningBalance = 0;
        foreach ($ledger as &$entry) {
            $runningBalance += ((float)$entry['debit'] - (float)$entry['kredit']);
            $entry['saldo_berjalan'] = $runningBalance;
        }

        $reportRespond([
            'client' => $client,
            'ledger' => $ledger,
            'final_balance' => $runningBalance
        ]);
        break;

    case 'profit-loss':
        // Laporan Laba Rugi Operasional, Komparasi Biaya Aset & Profitabilitas Proyek
        $tahun = isset($params['tahun']) && is_numeric($params['tahun']) ? (int)$params['tahun'] : (int)date('Y');
        $startDate = $params['start_date'] ?? "{$tahun}-01-01";
        $endDate = $params['end_date'] ?? (isset($params['tahun']) ? "{$tahun}-12-31" : date('Y-m-d'));

        // 1. Total Pendapatan (Realisasi Kas Masuk)
        $revRow = $db->fetch(
            "SELECT COALESCE(SUM(jumlah_bayar), 0) as total_pendapatan, COUNT(*) as jml_transaksi
             FROM payments
             WHERE tanggal_bayar BETWEEN ? AND ?",
            [$startDate, $endDate]
        );
        $totalPendapatan = (float)($revRow['total_pendapatan'] ?? 0);
        $jmlTransaksiKas = (int)($revRow['jml_transaksi'] ?? 0);

        // 2. Total Nilai Tagihan Diterbitkan (Omset Invoiced)
        $invRow = $db->fetch(
            "SELECT COALESCE(SUM(total_tagihan), 0) as total_tagihan, COUNT(*) as jml_faktur
             FROM invoices
             WHERE tanggal_invoice BETWEEN ? AND ? AND status != 'batal'",
            [$startDate, $endDate]
        );
        $totalTagihan = (float)($invRow['total_tagihan'] ?? 0);
        $jmlFaktur = (int)($invRow['jml_faktur'] ?? 0);

        // 3. Total Beban Pengeluaran Operasional Riil (Kas Keluar)
        $expRow = $db->fetch(
            "SELECT COALESCE(SUM(jumlah), 0) as total_beban, COUNT(*) as jml_pengeluaran
             FROM expenses
             WHERE tanggal BETWEEN ? AND ? AND status = 'lunas'",
            [$startDate, $endDate]
        );
        $totalBeban = (float)($expRow['total_beban'] ?? 0);
        $jmlPengeluaran = (int)($expRow['jml_pengeluaran'] ?? 0);

        // 4. Beban Khusus Server, Cloud & Infrastruktur
        $cloudExpRow = $db->fetch(
            "SELECT COALESCE(SUM(e.jumlah), 0) as total_server_cloud
             FROM expenses e
             LEFT JOIN expense_categories ec ON e.expense_category_id = ec.id
             WHERE e.tanggal BETWEEN ? AND ? AND e.status = 'lunas' 
               AND (ec.kode IN ('SERVER_CLOUD', 'DOMAIN_SSL', 'LISENSI_SOFTWARE') OR e.judul LIKE '%server%' OR e.judul LIKE '%cloud%' OR e.deskripsi LIKE '%server%' OR e.deskripsi LIKE '%cloud%')",
            [$startDate, $endDate]
        );
        $totalServerCloud = (float)($cloudExpRow['total_server_cloud'] ?? 0);
        $totalBebanLain = max(0, $totalBeban - $totalServerCloud);

        // 5. Estimasi Biaya Aset & Langganan Cloud (Burn Rate dari Company Assets)
        $estMonthlyBurn = 0.0;
        $activeAssetsCount = 0;
        $activeAssets = [];
        try {
            $assetKpi = $db->fetch(
                "SELECT 
                    COUNT(*) as total_active,
                    COALESCE(SUM(CASE 
                        WHEN status != 'dihentikan' AND siklus = 'bulanan' THEN biaya_idr
                        WHEN status != 'dihentikan' AND siklus = 'triwulan' THEN (biaya_idr / 3)
                        WHEN status != 'dihentikan' AND siklus = 'semesteran' THEN (biaya_idr / 6)
                        WHEN status != 'dihentikan' AND siklus = 'tahunan' THEN (biaya_idr / 12)
                        WHEN status != 'dihentikan' AND siklus = 'dua_tahunan' THEN (biaya_idr / 24)
                        ELSE 0 
                    END), 0) as est_monthly_burn
                 FROM company_assets
                 WHERE status != 'dihentikan'"
            );
            $estMonthlyBurn = (float)($assetKpi['est_monthly_burn'] ?? 0);
            $activeAssetsCount = (int)($assetKpi['total_active'] ?? 0);

            $activeAssets = $db->fetchAll(
                "SELECT ca.id, ca.nama_aset, ca.kategori, ca.provider, ca.biaya, ca.mata_uang, ca.biaya_idr, ca.siklus, ca.status,
                        ROUND(CASE 
                            WHEN siklus = 'bulanan' THEN biaya_idr
                            WHEN siklus = 'triwulan' THEN (biaya_idr / 3)
                            WHEN siklus = 'semesteran' THEN (biaya_idr / 6)
                            WHEN siklus = 'tahunan' THEN (biaya_idr / 12)
                            WHEN siklus = 'dua_tahunan' THEN (biaya_idr / 24)
                            ELSE 0 
                        END, 2) as burn_bulanan,
                        ROUND(CASE 
                            WHEN siklus = 'bulanan' THEN (biaya_idr * 12)
                            WHEN siklus = 'triwulan' THEN (biaya_idr * 4)
                            WHEN siklus = 'semesteran' THEN (biaya_idr * 2)
                            WHEN siklus = 'tahunan' THEN biaya_idr
                            WHEN siklus = 'dua_tahunan' THEN (biaya_idr / 2)
                            ELSE 0 
                        END, 2) as burn_tahunan
                 FROM company_assets ca
                 WHERE ca.status != 'dihentikan'
                 ORDER BY burn_bulanan DESC
                 LIMIT 20"
            );
        } catch (\Throwable $e) {}
        $estYearlyBurn = $estMonthlyBurn * 12;

        $labaBersih = $totalPendapatan - $totalBeban;
        $profitMargin = $totalPendapatan > 0 ? round(($labaBersih / $totalPendapatan) * 100, 1) : 0;
        $assetRatioPendapatan = $totalPendapatan > 0 ? round(($estYearlyBurn / $totalPendapatan) * 100, 1) : 0;

        // 6. Rincian Laba / Rugi Bulanan (12 Bulan untuk Tahun Terpilih)
        $namaBulan = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];

        // Grouped queries per bulan
        $payMonthlyMap = [];
        $pmRows = $db->fetchAll(
            "SELECT MONTH(tanggal_bayar) as bln, COALESCE(SUM(jumlah_bayar), 0) as total
             FROM payments
             WHERE YEAR(tanggal_bayar) = ?
             GROUP BY MONTH(tanggal_bayar)",
            [$tahun]
        );
        foreach ($pmRows as $r) $payMonthlyMap[(int)$r['bln']] = (float)$r['total'];

        $invMonthlyMap = [];
        $imRows = $db->fetchAll(
            "SELECT MONTH(tanggal_invoice) as bln, COALESCE(SUM(total_tagihan), 0) as total
             FROM invoices
             WHERE YEAR(tanggal_invoice) = ? AND status != 'batal'
             GROUP BY MONTH(tanggal_invoice)",
            [$tahun]
        );
        foreach ($imRows as $r) $invMonthlyMap[(int)$r['bln']] = (float)$r['total'];

        $expMonthlyMap = [];
        $emRows = $db->fetchAll(
            "SELECT MONTH(tanggal) as bln, COALESCE(SUM(jumlah), 0) as total
             FROM expenses
             WHERE YEAR(tanggal) = ? AND status = 'lunas'
             GROUP BY MONTH(tanggal)",
            [$tahun]
        );
        foreach ($emRows as $r) $expMonthlyMap[(int)$r['bln']] = (float)$r['total'];

        $cloudMonthlyMap = [];
        $cmRows = $db->fetchAll(
            "SELECT MONTH(e.tanggal) as bln, COALESCE(SUM(e.jumlah), 0) as total
             FROM expenses e
             LEFT JOIN expense_categories ec ON e.expense_category_id = ec.id
             WHERE YEAR(e.tanggal) = ? AND e.status = 'lunas'
               AND (ec.kode IN ('SERVER_CLOUD', 'DOMAIN_SSL', 'LISENSI_SOFTWARE') OR e.judul LIKE '%server%' OR e.judul LIKE '%cloud%' OR e.deskripsi LIKE '%server%' OR e.deskripsi LIKE '%cloud%')
             GROUP BY MONTH(e.tanggal)",
            [$tahun]
        );
        foreach ($cmRows as $r) $cloudMonthlyMap[(int)$r['bln']] = (float)$r['total'];

        $analisisBulanan = [];
        for ($m = 1; $m <= 12; $m++) {
            $mRev = $payMonthlyMap[$m] ?? 0.0;
            $mInv = $invMonthlyMap[$m] ?? 0.0;
            $mExp = $expMonthlyMap[$m] ?? 0.0;
            $mCloud = $cloudMonthlyMap[$m] ?? 0.0;
            $mOtherExp = max(0, $mExp - $mCloud);
            $mNet = $mRev - $mExp;
            $mMargin = $mRev > 0 ? round(($mNet / $mRev) * 100, 1) : 0;

            $analisisBulanan[] = [
                'bulan_angka' => $m,
                'bulan_nama' => $namaBulan[$m],
                'pendapatan_kas' => $mRev,
                'tagihan_terbit' => $mInv,
                'beban_operasional' => $mExp,
                'beban_server_cloud' => $mCloud,
                'beban_operasional_lain' => $mOtherExp,
                'estimasi_biaya_aset' => $estMonthlyBurn,
                'laba_bersih' => $mNet,
                'margin_persen' => $mMargin,
                'status' => $mNet >= 0 ? 'surplus' : 'defisit'
            ];
        }

        // 7. Analisis Komparasi Tahunan (Multi-Year: $tahun, $tahun - 1, $tahun - 2)
        $tahunList = [$tahun - 2, $tahun - 1, $tahun];
        $analisisTahunan = [];
        foreach ($tahunList as $t) {
            $yRevRow = $db->fetch(
                "SELECT COALESCE(SUM(jumlah_bayar), 0) as total FROM payments WHERE YEAR(tanggal_bayar) = ?",
                [$t]
            );
            $yInvRow = $db->fetch(
                "SELECT COALESCE(SUM(total_tagihan), 0) as total FROM invoices WHERE YEAR(tanggal_invoice) = ? AND status != 'batal'",
                [$t]
            );
            $yExpRow = $db->fetch(
                "SELECT COALESCE(SUM(jumlah), 0) as total FROM expenses WHERE YEAR(tanggal) = ? AND status = 'lunas'",
                [$t]
            );

            $yRev = (float)($yRevRow['total'] ?? 0);
            $yInv = (float)($yInvRow['total'] ?? 0);
            $yExp = (float)($yExpRow['total'] ?? 0);
            $yNet = $yRev - $yExp;
            $yMargin = $yRev > 0 ? round(($yNet / $yRev) * 100, 1) : 0;

            $analisisTahunan[] = [
                'tahun' => $t,
                'pendapatan_kas' => $yRev,
                'tagihan_terbit' => $yInv,
                'beban_operasional' => $yExp,
                'estimasi_biaya_aset' => $estYearlyBurn,
                'laba_bersih' => $yNet,
                'margin_persen' => $yMargin,
                'status' => $yNet >= 0 ? 'surplus' : 'defisit'
            ];
        }

        // 8. Breakdown Beban per Kategori
        $byCategory = $db->fetchAll(
            "SELECT ec.nama_kategori, ec.warna, COALESCE(SUM(e.jumlah), 0) as total, COUNT(e.id) as count
             FROM expense_categories ec
             JOIN expenses e ON ec.id = e.expense_category_id
             WHERE e.tanggal BETWEEN ? AND ? AND e.status = 'lunas'
             GROUP BY ec.id, ec.nama_kategori, ec.warna
             ORDER BY total DESC",
            [$startDate, $endDate]
        );

        // 9. Profitabilitas per Proyek (Pendapatan Invoice Terbayar vs Beban Terkait Proyek)
        $projectProfits = $db->fetchAll(
            "SELECT p.id as project_id, p.nama_project, c.nama_perusahaan,
                    COALESCE((
                        SELECT SUM(py.jumlah_bayar) 
                        FROM payments py 
                        JOIN invoices inv ON py.invoice_id = inv.id 
                        WHERE inv.project_id = p.id AND py.tanggal_bayar BETWEEN ? AND ?
                    ), 0) as pendapatan_proyek,
                    COALESCE((
                        SELECT SUM(e.jumlah) 
                        FROM expenses e 
                        WHERE e.project_id = p.id AND e.tanggal BETWEEN ? AND ? AND e.status = 'lunas'
                    ), 0) as beban_proyek
             FROM projects p
             JOIN clients c ON p.client_id = c.id
             ORDER BY pendapatan_proyek DESC",
            [$startDate, $endDate, $startDate, $endDate]
        );

        foreach ($projectProfits as &$pp) {
            $pp['pendapatan_proyek'] = (float)$pp['pendapatan_proyek'];
            $pp['beban_proyek'] = (float)$pp['beban_proyek'];
            $pp['margin_bersih'] = $pp['pendapatan_proyek'] - $pp['beban_proyek'];
            $pp['margin_persen'] = $pp['pendapatan_proyek'] > 0 ? round(($pp['margin_bersih'] / $pp['pendapatan_proyek']) * 100, 1) : 0;
        }

        $reportRespond([
            'periode' => [
                'tahun' => $tahun,
                'start_date' => $startDate, 
                'end_date' => $endDate
            ],
            'ringkasan' => [
                'total_pendapatan' => $totalPendapatan,
                'total_tagihan' => $totalTagihan,
                'total_beban' => $totalBeban,
                'total_server_cloud' => $totalServerCloud,
                'total_beban_lain' => $totalBebanLain,
                'laba_bersih' => $labaBersih,
                'profit_margin_persen' => $profitMargin,
                'jml_transaksi_kas' => $jmlTransaksiKas,
                'jml_faktur' => $jmlFaktur,
                'jml_pengeluaran' => $jmlPengeluaran,
                'estimasi_aset' => [
                    'active_count' => $activeAssetsCount,
                    'est_monthly_burn' => $estMonthlyBurn,
                    'est_yearly_burn' => $estYearlyBurn,
                    'ratio_thd_pendapatan_persen' => $assetRatioPendapatan
                ]
            ],
            'analisis_bulanan' => $analisisBulanan,
            'analisis_tahunan' => $analisisTahunan,
            'aset_aktif' => $activeAssets,
            'beban_per_kategori' => $byCategory,
            'profitabilitas_proyek' => $projectProfits
        ]);
        break;

    case 'cashflow-tax':
        $tahun = (int)($params['tahun'] ?? date('Y'));
        $taxRows = $db->fetchAll(
            "SELECT DATE_FORMAT(tanggal_invoice, '%Y-%m') as bulan,
                    COUNT(*) as jumlah_faktur,
                    COALESCE(SUM(subtotal - diskon_nilai), 0) as dpp,
                    COALESCE(SUM(pajak_nominal), 0) as ppn_keluaran,
                    COALESCE(SUM(total_tagihan), 0) as total_faktur
             FROM invoices
             WHERE YEAR(tanggal_invoice) = ? AND status NOT IN ('draft', 'batal', 'dibatalkan')
             GROUP BY DATE_FORMAT(tanggal_invoice, '%Y-%m')
             ORDER BY bulan ASC",
            [$tahun]
        );

        $expTaxRows = $db->fetchAll(
            "SELECT DATE_FORMAT(tanggal, '%Y-%m') as bulan,
                    COALESCE(SUM(ppn_masukan), 0) as ppn_masukan,
                    COALESCE(SUM(pph23_nominal), 0) as pph23_terpotong
             FROM expenses
             WHERE YEAR(tanggal) = ? AND status != 'batal'
             GROUP BY DATE_FORMAT(tanggal, '%Y-%m')",
            [$tahun]
        );
        $expTaxMap = [];
        foreach ($expTaxRows as $er) {
            $expTaxMap[$er['bulan']] = $er;
        }

        $totalDpp = 0.0;
        $totalPpn = 0.0;
        $totalPpnMasukan = 0.0;
        $totalEstPph23 = 0.0;
        $totalPph23Terpotong = 0.0;
        foreach ($taxRows as &$tr) {
            $tr['dpp'] = (float)$tr['dpp'];
            $tr['ppn_keluaran'] = (float)$tr['ppn_keluaran'];
            $tr['ppn_masukan'] = (float)($expTaxMap[$tr['bulan']]['ppn_masukan'] ?? 0);
            $tr['ppn_kurang_bayar'] = round($tr['ppn_keluaran'] - $tr['ppn_masukan'], 2);
            $tr['total_faktur'] = (float)$tr['total_faktur'];
            $tr['est_pph23'] = round($tr['dpp'] * 0.02, 2);
            $tr['pph23_terpotong'] = (float)($expTaxMap[$tr['bulan']]['pph23_terpotong'] ?? 0);
            $totalDpp += $tr['dpp'];
            $totalPpn += $tr['ppn_keluaran'];
            $totalPpnMasukan += $tr['ppn_masukan'];
            $totalEstPph23 += $tr['est_pph23'];
            $totalPph23Terpotong += $tr['pph23_terpotong'];
        }
        unset($tr);

        $projRow = $db->fetch(
            "SELECT
                COALESCE(SUM(CASE WHEN DATEDIFF(tanggal_jatuh_tempo, CURDATE()) <= 30 THEN sisa_tagihan ELSE 0 END), 0) as masuk_30,
                COALESCE(SUM(CASE WHEN DATEDIFF(tanggal_jatuh_tempo, CURDATE()) BETWEEN 31 AND 60 THEN sisa_tagihan ELSE 0 END), 0) as masuk_60,
                COALESCE(SUM(CASE WHEN DATEDIFF(tanggal_jatuh_tempo, CURDATE()) BETWEEN 61 AND 90 THEN sisa_tagihan ELSE 0 END), 0) as masuk_90
             FROM invoices
             WHERE sisa_tagihan > 0 AND status NOT IN ('draft', 'lunas', 'batal', 'dibatalkan')"
        );

        $recActive = $db->fetchAll("SELECT frekuensi, data_items_json FROM recurring_invoices WHERE status = 'aktif'");
        $monthlyRecurring = 0.0;
        foreach ($recActive as $rec) {
            $items = json_decode((string)$rec['data_items_json'], true);
            $sumRec = 0.0;
            if (is_array($items)) {
                foreach ($items as $it) {
                    $sumRec += ((float)($it['kuantitas'] ?? 1) * (float)($it['harga_satuan'] ?? 0));
                }
            }
            $freq = $rec['frekuensi'] ?? 'bulanan';
            $monthlyRecurring += ($freq === 'tahunan') ? ($sumRec / 12) : (($freq === 'triwulan') ? ($sumRec / 3) : $sumRec);
        }

        $reportRespond([
            'tahun' => $tahun,
            'pajak_bulanan' => $taxRows,
            'ringkasan_pajak' => [
                'total_dpp' => $totalDpp,
                'total_ppn_keluaran' => $totalPpn,
                'total_ppn_masukan' => $totalPpnMasukan,
                'ppn_kurang_bayar' => round($totalPpn - $totalPpnMasukan, 2),
                'estimasi_pph23_2persen' => $totalEstPph23,
                'total_pph23_terpotong' => $totalPph23Terpotong
            ],
            'proyeksi_arus_kas' => [
                'hari_30' => round((float)($projRow['masuk_30'] ?? 0) + $monthlyRecurring, 2),
                'hari_60' => round((float)($projRow['masuk_60'] ?? 0) + $monthlyRecurring, 2),
                'hari_90' => round((float)($projRow['masuk_90'] ?? 0) + $monthlyRecurring, 2),
                'estimasi_recurring_bulanan' => round($monthlyRecurring, 2)
            ]
        ]);
        break;

    default:
        errorResponse('Sub-laporan tidak ditemukan', 404);
}
