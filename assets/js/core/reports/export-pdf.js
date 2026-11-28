// assets/js/core/reports/export-pdf.js — Ekspor PDF untuk halaman Laporan Finansial
import { App } from '../../app.js';

export async function exportReportPdf(activeTab, output = 'bloburl') {
    try {
        if (activeTab === 'aging') {
            const res = await App.api('reports/aging');
            if (!res || !res.success) {
                App.toast('Gagal memuat data aging piutang', 'error');
                return;
            }
            const { items, totals } = res.data;
            const body = items.map(r => [
                `${r.nama_perusahaan}\n(${r.kode_klien})`,
                App.formatIDR(r.current_amount),
                App.formatIDR(r.overdue_1_30),
                App.formatIDR(r.overdue_31_60),
                App.formatIDR(r.overdue_61_90),
                App.formatIDR(r.overdue_over_90),
                App.formatIDR(r.total_piutang)
            ]);
            const foot = [
                ['TOTAL:', App.formatIDR(totals.current_amount), App.formatIDR(totals.overdue_1_30), App.formatIDR(totals.overdue_31_60), App.formatIDR(totals.overdue_61_90), App.formatIDR(totals.overdue_over_90), App.formatIDR(totals.total_piutang)]
            ];
            const pdfRes = await App.exportPdf({
                filename: `laporan_aging_piutang_${new Date().toISOString().slice(0, 10)}.pdf`,
                title: 'LAPORAN ANALISIS UMUR PIUTANG (AGING)',
                subtitle: `Per Tanggal: ${App.formatDate(new Date().toISOString().slice(0, 10))}`,
                orientation: 'landscape',
                output,
                summaryCards: [
                    { label: 'Belum Jatuh Tempo', value: App.formatIDR(totals.current_amount), tone: 'default' },
                    { label: 'Tunggakan 1-30 Hari', value: App.formatIDR(totals.overdue_1_30), tone: 'warning' },
                    { label: 'Tunggakan >90 Hari', value: App.formatIDR(totals.overdue_over_90), tone: 'danger' },
                    { label: 'Total Saldo Piutang', value: App.formatIDR(totals.total_piutang), tone: 'primary' }
                ],
                sections: [{
                    type: 'table',
                    heading: 'Klasifikasi Umur Piutang Klien',
                    head: ['Pelanggan', 'Current (Rp)', '1 – 30 Hari', '31 – 60 Hari', '61 – 90 Hari', '> 90 Hari (Macet)', 'Total Piutang'],
                    body,
                    foot,
                    columnStyles: {
                        0: { cellWidth: 55, fontStyle: 'bold' },
                        1: { halign: 'right' },
                        2: { halign: 'right' },
                        3: { halign: 'right' },
                        4: { halign: 'right' },
                        5: { halign: 'right', textColor: [190, 18, 60] },
                        6: { halign: 'right', fontStyle: 'bold', textColor: [2, 132, 199] }
                    }
                }]
            });
            if (output === 'bloburl' && pdfRes?.blobUrl) {
                App.openPdfModal({
                    title: 'Laporan Analisis Umur Piutang',
                    filename: pdfRes.filename,
                    blobUrl: pdfRes.blobUrl
                });
            } else {
                App.toast('Laporan PDF berhasil diunduh', 'success');
            }
        } else if (activeTab === 'revenue') {
            const s = document.getElementById('rep-rev-start')?.value || '';
            const e = document.getElementById('rep-rev-end')?.value || '';
            const res = await App.api(`reports/revenue?start_date=${s}&end_date=${e}`);
            if (!res || !res.success) {
                App.toast('Gagal memuat data arus kas pendapatan', 'error');
                return;
            }
            const d = res.data;
            const body = d.transactions.map(t => [
                t.nomor_pembayaran,
                App.formatDate(t.tanggal_bayar),
                t.client_nama,
                t.nomor_invoice,
                t.nama_metode,
                App.formatIDR(t.jumlah_bayar)
            ]);
            const foot = [
                ['TOTAL REALISASI:', '', '', '', '', App.formatIDR(d.total_revenue)]
            ];
            const pdfRes = await App.exportPdf({
                filename: `laporan_arus_kas_${s}_sd_${e}.pdf`,
                title: 'LAPORAN ARUS KAS PENERIMAAN PENDAPATAN',
                subtitle: `Rentang Tanggal: ${App.formatDate(s)} s/d ${App.formatDate(e)}`,
                orientation: 'portrait',
                output,
                summaryCards: [
                    { label: 'Total Realisasi Kas', value: App.formatIDR(d.total_revenue), tone: 'success' },
                    { label: 'Jumlah Transaksi', value: `${d.transactions.length} Transaksi`, tone: 'default' }
                ],
                sections: [{
                    type: 'table',
                    heading: 'Rincian Transaksi Pembayaran Masuk',
                    head: ['No. Kuitansi', 'Tanggal', 'Pelanggan', 'Faktur', 'Kanal / Bank', 'Nominal (Rp)'],
                    body,
                    foot,
                    columnStyles: {
                        0: { fontStyle: 'bold' },
                        1: { cellWidth: 26 },
                        5: { halign: 'right', fontStyle: 'bold', textColor: [4, 120, 87] }
                    }
                }]
            });
            if (output === 'bloburl' && pdfRes?.blobUrl) {
                App.openPdfModal({
                    title: 'Laporan Arus Kas Penerimaan',
                    filename: pdfRes.filename,
                    blobUrl: pdfRes.blobUrl
                });
            } else {
                App.toast('Laporan PDF berhasil diunduh', 'success');
            }
        } else if (activeTab === 'statement') {
            const clientId = document.getElementById('rep-stmt-client')?.value;
            if (!clientId) {
                App.toast('Pilih pelanggan terlebih dahulu untuk mencetak rekening koran', 'warning');
                return;
            }
            const res = await App.api(`reports/statement?client_id=${clientId}`);
            if (!res || !res.success) {
                App.toast('Gagal memuat mutasi kartu piutang', 'error');
                return;
            }
            const { client, ledger, final_balance } = res.data;
            const body = ledger.map(l => [
                App.formatDate(l.tanggal),
                l.ref,
                l.deskripsi,
                Number(l.debit) > 0 ? App.formatIDR(l.debit) : '-',
                Number(l.kredit) > 0 ? App.formatIDR(l.kredit) : '-',
                App.formatIDR(l.saldo_berjalan)
            ]);
            const pdfRes = await App.exportPdf({
                filename: `rekening_koran_${String(client.kode_klien || 'klien').toLowerCase()}.pdf`,
                title: 'KARTU PIUTANG & REKENING KORAN PELANGGAN',
                subtitle: `${client.nama_perusahaan} (${client.kode_klien}) · UP: ${client.penanggung_jawab || '-'} · Telp: ${client.telepon || '-'}`,
                orientation: 'portrait',
                output,
                summaryCards: [
                    { label: 'Pelanggan', value: client.nama_perusahaan, tone: 'default' },
                    { label: 'Saldo Kewajiban', value: App.formatIDR(final_balance), tone: final_balance > 0 ? 'danger' : 'success' }
                ],
                sections: [{
                    type: 'table',
                    heading: 'Mutasi Transaksi Tagihan & Pembayaran',
                    head: ['Tanggal', 'No. Referensi', 'Keterangan', 'Debit (Rp)', 'Kredit (Rp)', 'Saldo Akhir (Rp)'],
                    body,
                    columnStyles: {
                        0: { cellWidth: 26 },
                        1: { cellWidth: 32, fontStyle: 'bold' },
                        3: { halign: 'right' },
                        4: { halign: 'right', textColor: [4, 120, 87] },
                        5: { halign: 'right', fontStyle: 'bold' }
                    }
                }]
            });
            if (output === 'bloburl' && pdfRes?.blobUrl) {
                App.openPdfModal({
                    title: `Rekening Koran — ${client.nama_perusahaan}`,
                    filename: pdfRes.filename,
                    blobUrl: pdfRes.blobUrl
                });
            } else {
                App.toast('Laporan PDF berhasil diunduh', 'success');
            }
        }
    } catch (err) {
        App.toast(err?.message || 'Gagal membuat dokumen PDF laporan', 'error');
    }
}
