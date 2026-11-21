# CRUDWorks ERP — Dokumentasi PRD

> Product Requirements Document untuk sistem ERP Billing & Project Management CRUDWorks.

## Daftar Dokumen

| No | Dokumen | Deskripsi |
|----|---------|-----------|
| 1 | [01-ringkasan-eksekutif.md](01-ringkasan-eksekutif.md) | Ringkasan produk, tujuan, target pengguna, dan integrasi dengan app-git |
| 2 | [02-arsitektur-teknis.md](02-arsitektur-teknis.md) | Stack teknologi, diagram arsitektur, struktur folder, pola komunikasi, session, dan security layer |
| 3 | [03-desain-database.md](03-desain-database.md) | Schema database lengkap: 15+ tabel, relasi, indeks, constraint, dan SQL CREATE TABLE |
| 4 | [04-modul-inti.md](04-modul-inti.md) | Spesifikasi 10 modul inti: Dashboard, Pelanggan, Project, Invoice, Pembayaran, Recurring, Laporan, dll |
| 5 | [05-keamanan-infrastruktur.md](05-keamanan-infrastruktur.md) | CSRF, RBAC, session security, input validation, rate limiting, audit trail |
| 6 | [06-api-specifications.md](06-api-specifications.md) | Semua endpoint API: method, params, request/response contoh, pagination, error handling |
| 7 | [07-pwa-dan-ui.md](07-pwa-dan-ui.md) | PWA, responsive design, sidebar Cloudflare-style, layout preferences, dark mode, component library |

## Konvensi

- Bahasa: Indonesia
- Diagram: Mermaid
- SQL: MySQL 8.0+ / MariaDB 10.6+
- Semua contoh bersifat implementable — developer dapat langsung coding dari dokumen ini
- Arsitektur & komponen CSS termutakhir mengikuti pola `app-keuangan` (PHP native, single entry point router, ES Modules SPA, Universal Datatable, Compact Dock, Windows 11 Taskbar & 8 Theme Palettes)

## Stack Ringkas

```
PHP 8.1+ (native, tanpa framework)
MySQL 8.0+ / MariaDB 10.6+
Redis 7+ (session + cache)
TailwindCSS 3.x (via CDN)
Vanilla JS ES Modules (SPA)
PWA (manifest.json + sw.js)
```
