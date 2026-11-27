# Catatan Rilis CRUDWorks ERP

Daftar pembaruan fitur, peningkatan kenyamanan, dan perbaikan sistem **CRUDWorks ERP** yang ditulis ringkas untuk memudahkan pengguna memantau setiap perkembangan aplikasi.

---

## [1.8.16] - 2026-11-27

### Disempurnakan (Improved)

- **Identitas Logo & Ikon Aplikasi Baru**: Pembaruan desain logo dan ikon aplikasi (`icon-192` & `icon-512`) dengan nuansa warna yang lebih segar dan modern.
- **Tampilan Halaman Login Lebih Rapi & Informatif**: Penataan ulang indikator status layanan dan keterangan versi, serta tambahan deteksi tombol Caps Lock saat mengetik kata sandi agar proses masuk lebih nyaman.
- **Keamanan Login & Perlindungan Akses API**: Pesan kesalahan saat gagal masuk kini diseragamkan untuk melindungi privasi akun pengguna, disertai pembatasan akses lintas domain agar hanya origin resmi aplikasi yang diizinkan.

---

## [1.8.15] - 2026-11-27

### Ditambahkan (Added)

- **Menu Riwayat Pengiriman Email**: Menu baru untuk memantau status pengiriman email Faktur, Surat Penawaran (SPH), Kuitansi Pembayaran, dan uji coba server email, lengkap dengan pencarian, filter status/jenis dokumen, serta detail kendala bila pengiriman gagal.
- **Kirim Email Kuitansi Pembayaran & Aksi Cepat di Faktur**: Pembayaran Masuk kini dapat mengirim kuitansi resmi langsung ke email pelanggan, dan daftar Tagihan & Faktur memiliki tombol **Kirim via Email** langsung dari menu aksi tabel.
- **Tambah, Edit & Hapus Termin Proyek**: Pengelolaan Daftar Termin Proyek kini mendukung penambahan termin satuan, pengubahan nama/porsi/nominal/tanggal target, serta penghapusan termin yang belum ditagihkan.

### Disempurnakan (Improved)

- **Lampiran PDF Otomatis & Logo Perusahaan pada Email**: Pengiriman email Surat Penawaran, Faktur Tagihan, dan Kuitansi Pembayaran kini otomatis melampirkan dokumen PDF resmi serta menampilkan logo perusahaan di bagian atas email. Khusus email penawaran, nominal harga tidak ditampilkan di isi email agar pelanggan meninjau rincian lengkap langsung dari PDF terlampir.
- **Tampilan Dokumen PDF Lebih Ringkas**: Faktur Tagihan, Kuitansi Pembayaran, dan Laporan Keuangan tidak lagi menampilkan kolom paraf manual, sedangkan PDF Surat Penawaran hanya menampilkan ruang tanda tangan calon pelanggan dengan keterangan penerbitan resmi sistem.
- **Nama Layanan Otomatis pada PDF Faktur**: Faktur yang tidak terhubung ke proyek kini menampilkan nama layanan atau item yang ditagihkan, bukan lagi label umum.
- **Diagram Timeline Penawaran dalam Satuan Minggu**: Jadwal pengerjaan pada Surat Penawaran menggunakan satuan **Minggu** secara default.
- **Ringkasan Laporan Arus Kas**: Aktivitas Operasional, Investasi, dan Pendanaan pada Laporan Arus Kas tampil ringkas per kelompok akun transaksi, dengan tombol beralih ke mode Rincian Jurnal bila dibutuhkan.

---

## [1.8.14] - 2026-11-26

### Ditambahkan (Added)

- **Checklist Kesiapan Serah Terima Proyek (Go-Live Checklist)**: Pemeriksaan otomatis dan manual pada modul Proyek untuk memastikan URL produksi online, sertifikat SSL aktif, kredensial tersimpan di Brankas, tugas selesai, serta SPK dan BAST sudah ditandatangani sebelum serah terima ke klien.

---

## [1.8.13] - 2026-11-25

### Ditambahkan (Added)

- **Peta Alur Aplikasi 3D Interaktif**: Menu baru untuk melihat alur kerja bisnis secara menyeluruh (mulai dari prospek pelanggan, penawaran, kontrak, proyek, penagihan, hingga laporan keuangan) dalam tampilan 3D yang bisa diputar, diperbesar, difilter per bagian, dan dilengkapi simulasi alur otomatis.

---

## [1.8.11] - 2026-11-25

### Ditambahkan (Added)

- **Suite Akuntansi & Laporan Keuangan Lengkap**:
  - **Master Bagan Akun (COA)** beserta pemetaan otomatis akun kas/bank pada setiap rekening penerima di menu Pengaturan.
  - **Jurnal Umum & Buku Besar** yang tercatat otomatis setiap kali faktur terbit, pembayaran diterima, atau pengeluaran dicatat, lengkap dengan fitur pencarian, filter tanggal, serta buat jurnal manual.
  - **Laporan Keuangan Standar**: **Neraca Saldo**, **Laba Rugi Berbasis Akun**, **Laporan Arus Kas**, **Laporan Perubahan Ekuitas**, dan **Neraca Keuangan (Format T)** dengan total aktiva dan pasiva yang sejajar rapi.
  - **Tutup Buku Periode**: Mengunci transaksi pada bulan yang sudah selesai diaudit dan membuat jurnal penutup secara otomatis.
  - **Pratinjau PDF Minimalis & Ekspor CSV**: Seluruh laporan keuangan kini mendukung pratinjau PDF sebelum diunduh dengan tata letak hitam-putih bersih, judul rata tengah, dan seluruh angka rata kanan.

---

## [1.8.0] - 2026-11-25

### Ditambahkan (Added)

- **Panel GitOps & Deploy Proyek**: Memantau commit terakhir, status folder proyek, serta menjalankan pembaruan kode aplikasi langsung dari halaman Manajemen Proyek.
- **Kirim Faktur & Surat Penawaran Langsung via Email**: Mendukung pengiriman faktur dan penawaran resmi langsung ke email pelanggan melalui pengaturan server email perusahaan.
- **Pembayaran Online Otomatis (QRIS & Virtual Account)**: Pelanggan dapat membayar tagihan secara online melalui halaman faktur publik dan status tagihan otomatis berubah menjadi lunas setelah pembayaran terkonfirmasi.
- **Rekonsiliasi Mutasi Bank**: Impor mutasi rekening bank (CSV) dan pencocokan otomatis dengan data faktur, pembayaran masuk, maupun pengeluaran.
- **Rekap Pajak PPN & PPh 23**: Pencatatan PPN Masukan serta PPh 23 pada pengeluaran operasional dan rekapitulasi pajak tahunan siap ekspor.
- **Pusat Notifikasi & Integrasi Eksternal**: Lonceng notifikasi aktivitas terbaru di bagian atas layar, serta manajemen API Key dan Webhook di menu Pengaturan.

### Peningkatan (Changed)

- **Menu Pengaturan Sistem Lebih Rapi**: Tampilan 2 kolom dengan navigasi di sisi kiri, tombol edit langsung pada daftar rekening bank, dan pemisahan tab template pesan WhatsApp agar lebih mudah dioperasikan.
- **Edit Tagihan Berulang**: Kini jadwal tagihan berulang dapat diubah sewaktu-waktu, termasuk tanggal berakhir dan status aktif/jeda.

---

## [1.7.96] - 2026-11-24

### Keamanan (Security)

- **Autentikasi Dua Faktor (2FA) & Manajemen Sesi Perangkat**: Menambahkan perlindungan login menggunakan aplikasi Authenticator (kode 6 digit) serta daftar perangkat yang sedang login agar pengguna dapat keluar dari perangkat lain kapan saja.

### Peningkatan (Changed)

- **Tampilan Profil Akun & Keamanan**: Pembaruan antarmuka profil menjadi 3 tab ringkas (*Profil*, *Password*, *Keamanan*) lengkap dengan tombol intip kata sandi dan salin kunci 2FA sekali klik.

---

## [1.7.42] - 2026-11-21

### Ditambahkan (Added)

- **Kontrak Kerja & SPK Digital**: Pembuatan dokumen kontrak kerja otomatis dari surat penawaran, lengkap dengan fitur tanda tangan digital langsung oleh pelanggan di Portal Klien.
- **Saldo Deposit Klien & Pengingat Domain**: Pengelolaan saldo titipan (deposit) pelanggan yang bisa digunakan untuk memotong tagihan faktur, serta pengingat perpanjangan domain dan SSL via WhatsApp.
- **Knowledge Base & Target SLA Tiket**: Pusat panduan/FAQ untuk pelanggan serta penanda waktu target penanganan pada setiap tiket gangguan.

---

## [1.7.41] - 2026-11-20

### Ditambahkan (Added)

- **Kemudahan Portal Klien**:
  - Pelanggan dapat langsung mengunggah bukti transfer, menandatangani surat penawaran secara digital, dan mengunduh kuitansi resmi PDF dari dalam portal.
  - Admin dapat membagikan akses kredensial tertentu secara aman ke portal klien dengan fitur sembunyikan kata sandi otomatis.
  - Menampilkan daftar pembaruan rilis proyek terbaru dan banner pengingat otomatis untuk dokumen yang menunggu persetujuan atau faktur mendekati jatuh tempo.

---

## [1.7.40] - 2026-11-20

### Ditambahkan (Added)

- **Tindak Lanjut Tiket Sekali Klik**: Tim teknis dapat langsung mengubah laporan tiket pelanggan menjadi tugas kerja di papan Kanban proyek atau menjadi faktur tagihan tambahan.
- **Notifikasi Lonceng Admin**: Pemberitahuan otomatis untuk tiket baru dan dokumen BAST yang baru ditandatangani oleh pelanggan.

---

## [1.7.39] - 2026-11-20

### Peningkatan (Changed)

- **Percakapan Tiket Bergaya Email & Lampiran Gambar**: Tampilan diskusi tiket dibuat lebih rapi seperti utas email, dilengkapi editor teks lengkap dan dukungan unggah maupun tempel gambar tangkapan layar secara langsung.

---

## [1.7.36] - 2026-11-20

### Ditambahkan (Added)

- **Portal Klien Mandiri (Aplikasi Web)**: Pelanggan kini memiliki portal khusus yang dapat diakses dengan akun masing-masing dan bisa dipasang ke layar utama ponsel/komputer untuk memantau progres proyek, mengesahkan BAST digital, memeriksa faktur, dan mengirim tiket bantuan.
