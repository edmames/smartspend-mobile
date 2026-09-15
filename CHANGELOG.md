# Release notes

Ikuti format [Keep a Changelog](https://keepachangelog.com/id/1.1.0/) dan
[Semantic Versioning](https://semver.org/lang/id/).

## [1.0.0] — 2026-09-15

Rilis pertama: aplikasi keuangan pribadi lokal-first (Expo + TypeScript), lengkap
dengan dompet, buku besar transaksi, target tabungan, anggaran bulanan, dan laporan.

### Ditambahkan

- **Autentikasi lokal** (AsyncStorage, opsional Supabase) dengan halaman masuk/daftar; di
  iframe tanpa storage, sesi berjalan in-memory dan sebuah `StorageNotice` memberi tahu pengguna.
- **Beranda padat**: app bar (inisial + sapaan + konteks dompet/tabungan/bulan + tombol setelan),
  hero total uang dengan bar komposisi dompet vs tabungan, strip "Bulan ini" 3 kolom tanpa mark
  warna (arah dibawa tanda +/−), alert anggaran, **donut "Tren 1 bulan"** (komposisi kategori
  dengan toggle Pengeluaran/Pemasukan), dompet teratas, 5 transaksi terakhir, pull-to-refresh.
- **Buku besar transaksi**: daftar dikelompokkan per hari dengan subtotal, filter
  tipe/dompet/kategori/periode, pencarian, dan infinite scroll 30 per halaman.
- **Form transaksi tanpa dropdown**: tab tipe (Masuk · Keluar · Transfer), kolom jumlah dengan
  saldo berjalan yang ikut berubah saat mengetik, **grid tile kategori** (termasuk Liburan dan
  Pendidikan), chip dompet bermark yang bisa digeser, chip "Dompet baru" untuk membuat dompet
  tanpa keluar dari form, tanggal + metode pembayaran dalam satu baris.
- **Dukungan QRIS** (hanya pengeluaran, sumber harus bank/e-wallet) dengan validasi di form,
  store, dan validator.
- **Dompet**: CRUD, tipe tidak bisa diubah setelah dibuat, hapus hanya bila tanpa riwayat,
  saldo awal sebagai transaksi `initial` (bukan asumsi nol).
- **Penanda dompet (wallet mark)**: glyph per tipe (tunai/bank/e-wallet) gaya tint + monogram
  brand opsional (BCA, Mandiri, BNI, BRI, BSI, CIMB, GoPay, OVO, DANA, ShopeePay), dipakai
  konsisten di tab Dompet, form transaksi, baris transaksi, dan detail.
- **Target tabungan**: setor/tarik dari layar Tabungan (bukan dari form transaksi), progres
  dibatasi 100% secara visual, hapus hanya bila tanpa riwayat setor/tarik.
- **Anggaran bulanan** per kategori (satu kategori = satu anggaran per bulan) dengan status
  aman/mendekati/lewat dan alert di Beranda.
- **Laporan bulanan** dengan tren 6 bulan, komposisi kategori, rincian per dompet, dan
  **ekspor JSON sesuai skema** yang bisa dipakai untuk backup/restore.
- **Setelan**: tema, bahasa (id/en), backup & restore JSON (dengan pilihan merge/replace),
  panduan PWA, integrasi Telegram, dan hapus semua data.
- **Panduan desain** (`docs/DESIGN-SYSTEM.md`) dan mock SVG: `docs/dashboard-layout.svg`,
  `docs/transaction-form.svg`, `docs/wallet-marks.svg`.
- **Skrip verifikasi** `scripts/verify.ts`: 171 pemeriksaan di 13 seksi (aturan ledger, validasi
  input, agregasi bulanan, degradasi storage, i18n, store).
- **CI** (GitHub Actions): `typecheck` → `verify` → `export:web` pada setiap push/PR.
- **Deploy demo web** ke GitHub Pages (workflow `pages.yml`).

### Catatan teknis

- TypeScript strict tanpa `any`; seluruh tipe di `src/types/index.ts`.
- Buku besar adalah satu-satunya sumber kebenaran; saldo dompet/tabungan selalu turunan.
- Validasi saldo historis dijalankan pada setiap tambah/ubah/hapus — tidak ada saldo negatif
  pada tanggal mana pun.
- Tanggal `YYYY-MM-DD` zona Asia/Jakarta, tanpa tanggal masa depan (anggaran dikecualikan).
- Jumlah: bilangan bulat positif IDR, maksimum Rp1 triliun.
- Data awal kosong (tanpa fixture) — aplikasi dimulai dari nol.

[1.0.0]: https://github.com/<USERNAME>/smartspend-mobile/releases/tag/v1.0.0
