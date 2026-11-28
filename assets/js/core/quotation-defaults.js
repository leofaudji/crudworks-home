// assets/js/core/quotation-defaults.js — Teks naskah default Surat Penawaran (SPH)

export const DEFAULT_SALAM_PEMBUKA = `Dengan hormat,

Bersama surat ini, kami dari tim teknis & pengembangan mengajukan proposal penawaran kerja sama pengembangan dan implementasi sistem aplikasi sesuai kebutuhan operasional perusahaan Bapak/Ibu. Proposal ini disusun sebagai acuan ruang lingkup pekerjaan, daftar fitur utama, estimasi investasi biaya, serta hak dan kewajiban para pihak.`;

export const DEFAULT_RUANG_LINGKUP_FITUR = `1. Modul Autentikasi & Hak Akses Pengguna (RBAC)
   - Manajemen akun staf, pembagian peran, serta log aktivitas keamanan.
2. Modul Master Data & Operasional Utama
   - Pengelolaan data inti, pencarian cepat, filter, dan ekspor laporan.
3. Modul Transaksi, Tagihan & Pelaporan Keuangan
   - Pencatatan transaksi otomatis, pembuatan dokumen PDF resmi, dan rekapitulasi laporan.
4. Pengujian Sistem, Pelatihan Pengguna & Dokumentasi
   - Uji coba UAT bersama tim klien, pelatihan penggunaan sistem, dan deploy ke server produksi.`;

export const DEFAULT_TIMELINE_PENGERJAAN = `1. Analisis Kebutuhan & Perancangan Desain (Minggu 1)
- Penggalian proses bisnis klien, perancangan prototipe antarmuka UI/UX, dan penyusunan skema database.
2. Pengembangan Inti Sistem & Integrasi Modul (Minggu 2 – 3)
- Pengkodean modul utama aplikasi, logika bisnis, hak akses pengguna (RBAC), dan pengujian internal tim developer.
3. Pengujian Bersama, UAT & Revisi Minor (Minggu 4)
- User Acceptance Testing (UAT) bersama pihak klien, penyesuaian evaluasi alur kerja, dan persiapan rilis.
4. Deployment Server, Pelatihan Staf & BAST (Minggu 4)
- Pemasangan sistem di server produksi klien/cloud, pelatihan staf pengguna (*user training*), dan Berita Acara Serah Terima (BAST).
5. Pendampingan, Garansi & Pemeliharaan Sistem (Minggu 5 – 6)
- Pemantauan stabilitas sistem dan pendampingan penggunaan aplikasi selama masa pemeliharaan resmi.`;

export const DEFAULT_PASAL_HAK_KEWAJIBAN = `PASAL 1 — HAK DAN KEWAJIBAN PIHAK PERTAMA (PENYEDIA JASA)
1. Pihak Pertama berkewajiban menyelesaikan pengembangan dan implementasi fitur sistem sesuai ruang lingkup yang disepakati dalam surat penawaran ini secara tepat waktu dan profesional.
2. Pihak Pertama berkewajiban menjaga kerahasiaan seluruh data, informasi bisnis, dan kredensial server milik Pihak Kedua dengan standar keamanan terbaik.
3. Pihak Pertama berhak menerima pembayaran penuh secara tepat waktu sesuai termin dan tahapan yang tercantum pada syarat pembayaran penawaran ini.

PASAL 2 — LISENSI PEMAKAI AKHIR & KETENTUAN KODE SUMBER (SOURCE CODE)
1. Pihak Kedua berhak memperoleh hak akses penggunaan sistem aplikasi semata-mata sebagai Pemakai Akhir (End-User License / Hak Pakai Operasional) untuk kebutuhan operasional bisnis internal Pihak Kedua.
2. Pihak Kedua TIDAK MENERIMA dan TIDAK MEMILIKI hak kepemilikan atas Source Code (Kode Sumber), hak kekayaan intelektual (HAKI), algoritma, arsitektur, maupun kerangka dasar sistem perangkat lunak yang dibangun oleh Pihak Pertama.
3. Seluruh Source Code, hak cipta, dan hak milik industri tetap menjadi hak milik mutlak dan eksklusif Pihak Pertama. Pihak Kedua dilarang keras menyalin, membongkar (reverse engineer), mendekompilasi, memodifikasi kode sumber tanpa izin tertulis, mendistribusikan ulang, menyewakan, atau menjual kembali aplikasi maupun bagian dari kode sistem kepada pihak ketiga mana pun.
4. Pihak Kedua berkewajiban menunjuk perwakilan PIC resmi untuk koordinasi teknis, memberikan data/materi yang diperlukan tepat waktu, serta melakukan pengujian serah terima (UAT).
5. Permintaan penambahan fitur di luar daftar ruang lingkup penawaran ini akan dicatat sebagai pekerjaan tambahan (Change Request) dengan estimasi biaya dan waktu terpisah.

PASAL 3 — GARANSI SISTEM & DUKUNGAN PEMELIHARAAN
1. Pihak Pertama memberikan garansi perbaikan kerusakan teknis (bug/error) secara cuma-cuma selama masa pemeliharaan terhitung sejak tanggal serah terima sistem (BAST), selama tidak terjadi perubahan alur atau modifikasi dari pihak luar.`;

export const DEFAULT_SYARAT_KETENTUAN = `1. Penawaran harga ini berlaku selama 14 (empat belas) hari kalender sejak tanggal diterbitkan.
2. Pembayaran Uang Muka (DP) sebesar 50% dibayarkan setelah penawaran disetujui / SPK diterbitkan, dan pelunasan 50% setelah sistem siap serah terima (UAT).
3. Estimasi waktu pengerjaan dimulai sejak pembayaran DP diterima dan kebutuhan materi/data awal dari klien tersedia.`;
