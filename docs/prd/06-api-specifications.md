# 06 — Spesifikasi API

Dokumen ini mendokumentasikan spesifikasi seluruh endpoint RESTful API pada CRUDWorks ERP, format request/response, parameter paginasi, dan standarisasi kode error HTTP.

---

## 1. Standar Format Respons

Seluruh respons API mengembalikan header `Content-Type: application/json; charset=utf-8` dengan format pembungkus (envelope) standar:

### 1.1 Respons Berhasil (Single Object / Operasi Sukses)
```json
{
  "success": true,
  "message": "Data berhasil disimpan",
  "data": {
    "id": 1,
    "nomor_invoice": "INV-202611-0001"
  }
}
```

### 1.2 Respons Berhasil dengan Paginasi (List / Grid View)
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 45,
    "total_pages": 5
  }
}
```

### 1.3 Respons Gagal (Error)
```json
{
  "success": false,
  "message": "Klien dengan email ini sudah terdaftar",
  "code": 400
}
```

---

## 2. Katalog Endpoint

### 2.1 Autentikasi & Sesi Pengguna

#### `POST /api/auth/login`
- **Tujuan**: Otentikasi pengguna dan inisialisasi sesi Redis.
- **Header**: `Content-Type: application/json`
- **Body**:
  ```json
  { "username": "admin", "password": "password123" }
  ```
- **Respons 200**:
  ```json
  {
    "success": true,
    "message": "Login berhasil",
    "data": {
      "user": { "id": 1, "username": "admin", "nama_lengkap": "Administrator", "role_id": 1, "role_name": "super_admin" },
      "csrf_token": "a1b2c3d4..."
    }
  }
  ```

#### `GET /api/auth/check`
- **Tujuan**: Memeriksa apakah sesi pengguna saat ini masih valid di Redis.
- **Respons 200**: Mengembalikan profil pengguna dan token CSRF aktif.
- **Respons 401**: Sesi telah berakhir atau tidak ditemukan.

#### `POST /api/auth/logout`
- **Tujuan**: Menghancurkan data sesi di Redis dan membersihkan session cookie.

---

### 2.2 Navigasi & Hak Akses (RBAC)

#### `GET /api/menus`
- **Tujuan**: Mengambil pohon menu navigasi dinamis yang sudah difilter sesuai role pengguna saat ini.
- **Respons 200**: Array pohon hierarki menu dari `menus.json` yang telah melalui validasi permission.

#### `GET /api/menus/badges`
- **Tujuan**: Mengambil angka counter badge untuk item sidebar (misal: jumlah tagihan overdue atau belum bayar).
- **Respons 200**:
  ```json
  {
    "success": true,
    "data": {
      "#/invoices": 3,
      "#/recurring": 1
    }
  }
  ```

---

### 2.3 Dashboard

#### `GET /api/dashboard/stats`
- **Tujuan**: Menampilkan statistik agregat kartu KPI (Total Piutang, Pembayaran Bulan Ini, Overdue, Klien Aktif).

#### `GET /api/dashboard/chart`
- **Tujuan**: Data komparasi 6 bulan terakhir antara invoice yang diterbitkan vs pembayaran yang diterima.

---

### 2.4 Master Pelanggan (Clients)

#### `GET /api/clients`
- **Query Params**: `page` (default: 1), `per_page` (default: 10), `search` (string), `status` (opsional: aktif/prospek/nonaktif).
- **Respons 200**: Objek terpaginasi berisi array pelanggan.

#### `GET /api/clients/{id}`
- **Tujuan**: Detail satu pelanggan beserta rekap project dan piutang berjalan.

#### `POST /api/clients`
- **Header**: `X-CSRF-Token`
- **Body**:
  ```json
  {
    "nama_perusahaan": "PT Nusantara Digital",
    "penanggung_jawab": "Budi Santoso",
    "email": "budi@nusantara.co.id",
    "telepon": "081234567890",
    "alamat": "Jl. Sudirman Kav 21",
    "kota": "Jakarta",
    "npwp": "01.234.567.8-012.000",
    "status": "aktif"
  }
  ```

#### `PUT /api/clients/{id}`
- **Tujuan**: Mengubah data pelanggan yang sudah ada.

#### `DELETE /api/clients/{id}`
- **Tujuan**: Menghapus data pelanggan (hanya jika tidak memiliki invoice aktif).

---

### 2.5 Master Project & Bridge app-git

#### `GET /api/projects`
- **Query Params**: `client_id` (opsional), `status` (opsional), `search` (opsional).

#### `POST /api/projects`
- **Body**:
  ```json
  {
    "client_id": 1,
    "nama_project": "Portal E-Commerce Klien",
    "deskripsi": "Sistem belanja online berbasis katalog",
    "git_repo_url": "https://github.com/client/ecommerce-app.git",
    "git_branch": "main",
    "deploy_path": "d:/laragon/www/client-ecommerce",
    "app_url": "http://ecommerce.local",
    "nilai_project": 25000000,
    "status": "aktif"
  }
  ```

#### `POST /api/projects/{id}/sync-git`
- **Tujuan**: Membaca status deployment terbaru dari instance app-git lokal.

---

### 2.6 Master Layanan (Services)

#### `GET /api/services`
- **Tujuan**: Daftar katalog produk/jasa standar untuk autocomplete invoice.

#### `POST /api/services`
- **Body**:
  ```json
  {
    "kode_layanan": "SRV-HOST-01",
    "nama_layanan": "Cloud VPS Hosting 2 Core 4GB",
    "kategori": "hosting",
    "harga_standar": 350000,
    "siklus_tagihan": "bulanan",
    "status": "aktif"
  }
  ```

---

### 2.7 Tagihan & Faktur (Invoices)

#### `GET /api/invoices`
- **Query Params**: `page`, `per_page`, `status` (draft/dikirim/sebagian/lunas/jatuh_tempo/batal), `client_id`, `search`.

#### `GET /api/invoices/{id}`
- **Tujuan**: Mengambil invoice lengkap beserta seluruh baris `invoice_items` dan riwayat `payments`.

#### `POST /api/invoices`
- **Header**: `X-CSRF-Token`
- **Body**:
  ```json
  {
    "client_id": 1,
    "project_id": 2,
    "tanggal_invoice": "2026-11-18",
    "tanggal_jatuh_tempo": "2026-12-02",
    "diskon_tipe": "nominal",
    "diskon_nilai": 0,
    "pajak_persen": 11,
    "catatan_klien": "Pembayaran via transfer bank ke rekening yang tertera di bawah.",
    "items": [
      {
        "service_id": 1,
        "deskripsi": "Sewa Cloud Server VPS Periode Nov 2026",
        "kuantitas": 1,
        "harga_satuan": 350000
      },
      {
        "service_id": null,
        "deskripsi": "Maintenance & Backup Harian",
        "kuantitas": 1,
        "harga_satuan": 500000
      }
    ]
  }
  ```

#### `PUT /api/invoices/{id}`
- **Tujuan**: Memperbarui informasi invoice berstatus `draft`.

#### `POST /api/invoices/{id}/status`
- **Body**: `{ "status": "dikirim" }` atau `{ "status": "batal" }`.

#### `POST /api/invoices/{id}/send-email`
- **Tujuan**: Mengirimkan notifikasi tagihan beserta lampiran rincian invoice ke email pelanggan via SMTP.

---

### 2.8 Pembayaran (Payments)

#### `GET /api/payments`
- **Query Params**: `page`, `per_page`, `invoice_id`, `search`.

#### `POST /api/payments`
- **Header**: `X-CSRF-Token`
- **Body**:
  ```json
  {
    "invoice_id": 5,
    "payment_method_id": 1,
    "tanggal_bayar": "2026-11-18",
    "jumlah_bayar": 850000,
    "nomor_referensi": "TRX-BCA-98765432",
    "catatan": "Pelunasan tagihan periode November"
  }
  ```
- **Side Effect**: Sistem otomatis memperbarui kolom `total_dibayar` dan `sisa_tagihan` pada tabel `invoices`, serta mengubah statusnya ke `lunas` atau `sebagian`.

---

### 2.9 Tagihan Berulang (Recurring)

#### `GET /api/recurring`
- **Tujuan**: Menampilkan seluruh template jadwal penagihan berkala.

#### `POST /api/recurring`
- **Tujuan**: Mendaftarkan jadwal baru tagihan periodik.

---

### 2.10 Laporan (Reports)

#### `GET /api/reports/aging`
- **Tujuan**: Data pengelompokan umur piutang per klien.

#### `GET /api/reports/revenue`
- **Query Params**: `start_date`, `end_date`.
- **Tujuan**: Rekapitulasi kas masuk dan omset penagihan.

#### `GET /api/reports/statement`
- **Query Params**: `client_id`, `year`.
- **Tujuan**: Rekening koran piutang historis pelanggan.
