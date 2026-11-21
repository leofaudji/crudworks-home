# Panduan Standar Desain, Kode & Copywriting (Anti-AI Slop)

Dokumen ini mendokumentasikan adopsi dan implementasi nyata dari 7 referensi skill/rulebook utama yang diinstruksikan oleh pengguna pada pengembangan aplikasi **CRUDWorks ERP**:

1. **`github.com/leonxlnx/taste-skill`** (Taste & High-Craft Frontend)
2. **`github.com/miqdadbadjuber/anti-slop`** (Filter Anti-Slop UI & Kode)
3. **`github.com/pbakaus/impeccable`** (Design Engineering & Polish)
4. **`github.com/blader/humanizer`** (Human Copywriting & Natural Tone)
5. **`github.com/hardikpandya/stop-slop`** (Stop AI Slop & Purposeful Engineering)
6. **`github.com/petergyang/no-ai-slop`** (Practical Anti-Slop Guidelines)
7. **`github.com/conorbronsdon/avoid-ai-writing`** (Avoid AI Writing Tropes)

---

## 1. Implementasi Nyata per Skill

### 1. `Leonxlnx/taste-skill` (Taste & High-Craft Frontend)
* **Karakteristik**: Menghindari tampilan template AI standar. Mengedepankan arsitektur desain yang matang, hierarki visual jelas, pemilihan tipografi monospace untuk data angka finansial, serta *layout* berkelas setara aplikasi SaaS enterprise.
* **Penerapan pada CRUDWorks**:
  - Desain navigasi ganda: **Cloudflare Dock Sidebar** (ramping 64px dengan organic tree lines untuk submenu) dan **Windows 11 Taskbar & Start Menu** (bilah tugas bawah dengan kartu akses cepat).
  - Skema warna tidak menggunakan gradien ungu AI generik, melainkan palet profesional Slate + Primary (Oranye/Indigo) + Emerald/Rose untuk indikator akuntansi.
  - Tipografi finansial dengan font tabular/monospace (`font-mono`) pada seluruh angka nominal, saldo, dan kode faktur agar perataan desimal tetap presisi.

### 2. `miqdadbadjuber/anti-slop` (Filter Anti-Slop UI & Kode)
* **Karakteristik**: Membersihkan kode dari boilerplate berlebih, elemen hiasan tanpa fungsi, dan komponen "asal jadi" yang biasa dihasilkan LLM.
* **Penerapan pada CRUDWorks**:
  - Menggunakan **Native PHP 8.3** dan **Vanilla JavaScript (ES Modules)** murni tanpa membengkakkan dependensi `node_modules` atau framework JavaScript berat.
  - Tidak ada komentar kode basa-basi (misal: `// this function calculates sum` atau `// handle error`). Semua kode ditulis langsung pada intinya dengan nama variabel yang deskriptif (`sisa_tagihan`, `total_piutang`, `jatuh_tempo`).

### 3. `pbakaus/impeccable` (Design Engineering & Polish)
* **Karakteristik**: Standar kerajinan frontend tingkat tinggi; keselarasan piksel, jarak batas (*spacing & padding*), penanganan *micro-interactions*, dan pencegahan bug layout.
* **Penerapan pada CRUDWorks**:
  - **Penyempurnaan Ruang Lega Tabel (Table Breathing Room)**: Memperbaiki masalah margin yang mepet garis tepi dengan memberikan padding samping 28px (`1.75rem`) pada kolom pertama & terakhir, meniadakan duplikasi border bertingkat pada container tabel, serta menyelaraskan bilah pencarian/filter kolom (`.dt-toolbar`) dan paginasi.
  - Sistem pencetakan faktur native print CSS engine berstandar A4 yang rapi tanpa terpotong batas halaman.
  - Indikator bayangan *scroll* horizontal (`is-scrollable-left`, `is-scrollable-right`) pada tabel lebar.

### 4. `blader/humanizer` (Human Copywriting & Natural Tone)
* **Karakteristik**: Menghapus gaya bahasa terjemahan kaku dan frasa robotik ala mesin pencari / AI prompt.
* **Penerapan pada CRUDWorks**:
  - Seluruh label antarmuka, pesan notifikasi, dan status menggunakan istilah operasional bisnis Indonesia yang natural dan lazim digunakan di lapangan:
    - *Faktur Tagihan* (bukan "Manajemen Tagihan Berkelanjutan")
    - *Jatuh Tempo* & *Macet (>90 Hari)* (bukan "Status Melebihi Waktu")
    - *Pelunasan Kas Masuk* (bukan "Perekaman Transaksi Pembayaran Berhasil")
    - *Kartu Piutang & Rekening Koran* (bukan "Buku Besar Entitas Klien")

### 5. `hardikpandya/stop-slop` (Stop AI Slop & Purposeful Engineering)
* **Karakteristik**: Setiap komponen, tombol, dan endpoint harus memiliki tujuan operasional nyata, bukan sekadar pelengkap estetika palsu.
* **Penerapan pada CRUDWorks**:
  - Setiap tombol aksi langsung terhubung ke database operasional: Cetak Faktur PDF, Catat Pembayaran Masuk, Buat Tagihan Baru, Sinkronisasi Aplikasi Klien dari `www/app-git`, dan Manajemen Hak Akses RBAC dinamis.
  - Skema database relasional 15 tabel dengan foreign key, audit log trail, dan validasi CSRF token pada setiap mutasi state `POST`/`PUT`/`DELETE`.

### 6. `petergyang/no-ai-slop` (Practical Anti-Slop Guidelines)
* **Karakteristik**: Tidak menggunakan fungsi *dummy*, mock data buatan, atau kode "TODO: implement later".
* **Penerapan pada CRUDWorks**:
  - Database MySQL `crudworks_erp` telah dibuat, dimigrasi, dan diisi data awal riil dengan password bcrypt terverifikasi.
  - Seluruh endpoint API backend (`api/controllers/*`) memiliki implementasi lengkap, pengecekan RBAC, sanitasi input, dan transaksi database ACID (`beginTransaction` / `commit` / `rollBack`).

### 7. `conorbronsdon/avoid-ai-writing` (Avoid AI Writing Tropes)
* **Karakteristik**: Dokumentasi, changelog, dan commit log ditulis secara ringkas, padat informasi, tanpa kalimat klise pengantar yang berbunga-bunga (*filler*).
* **Penerapan pada CRUDWorks**:
  - `CHANGELOG.md` disusun mengikuti standar Keep a Changelog dan SemVer dengan poin-poin perubahan teknis konkret.
  - `docs/AGENTS.md` langsung menyajikan aturan operasional, konvensi teknis, dan struktur direktori tanpa pengantar filosofis yang bertele-tele.
