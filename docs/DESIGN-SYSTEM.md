# SmartSpend — Design System

Referensi visual dan aturan UI. Ditulis untuk menjawab satu masalah: aplikasi ini sebelumnya
terlihat "AI slop" — semua elemen berbobot sama, kotak-kotak berbingkai 1px, ikon di dalam kotak
pastel, gradien dekoratif, dan grafik yang ramai. Versi sekarang memakai satu bahasa desain yang
disengaja.

---

## 1. Prinsip

| Prinsip | Aturan praktis |
| --- | --- |
| **Satu fokus per layar** | Tiap layar punya satu angka utama (hero). Sisanya adalah pendukung dengan ukuran/warna lebih tenang. |
| **Permukaan rata, bukan berbingkai** | Kartu = bidang tanpa border, dipisahkan oleh jarak dan hairline `Divider`. `borderWidth: 1` hanya untuk *field* input, bukan untuk kontainer. |
| **Elevasi hanya untuk yang benar-benar mengapung** | Bottom sheet, FAB, toast, modal. Kartu di dalam halaman tidak punya shadow. |
| **Warna = makna** | Hijau = masuk, merah = keluar, amber = mendekati batas, biru = aksi/netral. Warna tidak dipakai sebagai dekorasi. |
| **Angka itu tokoh utama** | Semua nominal memakai angka *tabular* (lebar digit sama) dan format `Rp` kecil + digit besar. |
| **Gerak harus punya alasan** | Animasi pendek (120–720 ms), selalu menghormati *Reduce Motion*. |

---

## 2. Token

`src/styles/colors.ts` → `palette`, `categoryTints`, `ThemeColors`, `darkThemeColors`, `lightThemeColors`,
`getTheme(mode)`, `resolveThemeMode()`, `themes`.

`src/styles/theme.ts` → `spacing`, `radius`, `typeScale`, `fontWeight`, `motion`, `opacity`, `elevation`.

```
spacing   xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 28 · screen 20 · card 18
radius    sm 10 · md 14 · lg 18 · xl 26 · pill 999
motion    fast 120 · normal 260 · slow 340 · countUp 720 · stagger 55 · pressScale 0.975
```

Warna brand tetap: navy `#1e3a8a`, electric blue `#0ea5e9`. Token permukaan/teks/border dilembutkan
agar kontras berlapis (`text` → `textMedium` → `textMuted` → `textFaint`) dan aksen tidak berteriak.

---

## 3. Tipografi

`<AppText variant="…" tone="…">`

| Variant | Ukuran | Dipakai untuk |
| --- | --- | --- |
| `hero` | 40 / −1.4 | angka total di kartu hero |
| `money` | 30 | angka utama di kartu biasa |
| `display` | alias → `title` | judul besar (kompatibilitas) |
| `title` | 24 | judul layar |
| `subtitle` | 19 | judul seksi/kartu |
| `bodyLarge` | 17 | nilai penting |
| `body` | 15 | teks utama |
| `small` | 13 | teks sekunder |
| `caption` | 12 | meta, label |
| `micro` | 11 / +0.9 tracking | *eyebrow* huruf kapital |
| `heading`, `label` | alias → `title`, `micro` | kompatibilitas layar lama |

`tone`: `default` · `muted` · `faint` · `primary` · `success` · `warning` · `danger` · `onPrimary`.

**Money.** `<Money value={1500000} size="hero|money|title|subtitle|body|small" tone="auto|…" signed />`
menampilkan `Rp` kecil & redup + digit besar tabular; `tone="auto"` memilih hijau/merah dari tanda nilai.

---

## 4. Komponen

**Inti** — `Card` (+ `SectionHeader`, `HeroCard`, `Divider`), `Button` (primary/secondary/ghost/danger/success/outline,
tekanan berskala + highlight atas), `Chip` (+`Badge`), `ProgressBar` (rasio di-clamp, overflow ditandai),
`Icon` (+`IconBadge`, tint ±14%), `Money`, `Skeleton` (+`DashboardSkeleton`), `EmptyState`, `StatTile`,
`SegmentedControl`, `SettingRow`, `Toast` (pil di atas, maksimum 2), `BottomSheet` (spring, radius 26),
`FAB` (squircle + label opsional), `StorageNotice`.

**Charts** — `AreaChart` (garis 2px, fill gradien memudar, crosshair saat disentuh, tanpa titik permanen;
dipakai di Laporan), `PieChart` (donut dengan jeda rambut antar segmen, total di tengah — dipakai di
Beranda untuk komposisi 1 bulan dan di Laporan untuk kategori), `BarChart` (ghost track untuk hari kosong,
hanya garis dasar).

**Kapan pakai apa:** satu bulan = **komposisi** → donut; beberapa bulan = **pergerakan** → area/garis;
satu bulan per hari = **volume** → bar. Karena itu Beranda memakai donut "Tren 1 bulan" (menjawab "uangnya
ke mana bulan ini?"), sedangkan Laporan tetap punya tren 6 bulan untuk melihat pergerakan.

**Penanda dompet** — `WalletMark` (`src/components/ui/WalletMark.tsx`). Dua tampilan:

* `variant="tint"` (default) — glyph warna tipe di atas latar tint ±14%, untuk permukaan terang.
* `variant="solid"` — glyph putih di tile pekat, untuk latar gelap (kartu hero).

Glyph digambar manual di grid 24×24: *banknote* (Cash), *gedung bank* (Bank), *wallet + gelombang
tap-to-pay* (E-Wallet). Ukuran: 42 px daftar dompet, 36 px kartu ringkas, 34 px hero, 22 px chip provider.

Kalau dompet punya `brand` (BCA, Mandiri, BNI, BRI, BSI, CIMB, GoPay, OVO, DANA, ShopeePay), tile
menampilkan monogram warna brand — bukan logotype resmi, karena aplikasi tidak mengirim aset pihak
ketiga. Tipe tetap tampil sebagai pill (`Badge`), bukan teks berwarna telanjang.

Pratinjau statis: [`wallet-marks.svg`](wallet-marks.svg).

**Ledger** — `TransactionRow`: glyph depannya **mark dompet** yang terlibat (pengeluaran → dompet sumber,
pemasukan → dompet penerima, transfer → dompet sumber, setor/tarik tabungan → `SavingsMark`), jadi baris
transaksi memakai identitas yang sama dengan tab Dompet. Kategori, nama dompet, dan metode pembayaran
pindah ke baris meta (`Hari ini · Makanan · GoPay`). Kalau tidak ada data dompet, glyph jatuh kembali ke
ikon kategori. Plus `DayGroupHeader` (subtotal harian), `WalletCard` (+ bar kontribusi,
`WalletSummaryStrip`), `SavingsCard`, `BudgetCard`.

**Warna arah arus** — arah masuk/keluar dibawa **tanda + / −** dan label, bukan mark berwarna. Strip
"Bulan ini" di Beranda sengaja tanpa titik hijau/merah; warna merah/hijau hanya dipakai di daftar
transaksi dan grafik, tempat perbandingan in/out memang intinya.

---

## 5. Pola layar

```
Dashboard       app bar padat (inisial + "Halo, nama" + konteks dompet/tabungan/bulan + tombol setelan)
                → HERO total uang + bar komposisi dompet vs tabungan → strip "bulan ini" 3 kolom
                (Masuk · Keluar · Net, dipisah hairline) → alert anggaran (hanya kalau lewat) →
                "Tren 1 bulan" = **donut komposisi kategori** bulan berjalan (toggle Pengeluaran/Pemasukan,
                total di tengah, 4 kategori + sisa di footer) → dompet teratas (baris 66 px) →
                5 transaksi terakhir (baris 44 px).
                Ritme 8–16 px antar blok; padding layar 16. Mock: docs/dashboard-layout.svg
Transactions    judul + jumlah → pencarian → segmen periode → chip filter aktif → ringkasan in/out/net
                → daftar dikelompokkan per hari (header = tanggal + net harian) → infinite scroll 30/halaman
Wallets         total + bar komposisi (dompet vs tabungan) → daftar kartu dengan bar kontribusi
Savings         HERO saved vs goal → daftar target dengan progress tipis + badge status
Reports         navigator bulan → net + saving rate → 3 tile statistik → bar kas harian → tabel harian
                (dengan kolom kumulatif) → donut kategori (+ tabel sisanya) → tren 6 bulan
Budget          total bulan + bar → kartu per kategori (aman/warning/lewat)
Settings        baris bergrup: akun · tampilan · data · zona berbahaya · integrasi · tentang
```

**Modal & sheet.** Form tambah/edit memakai modal terpusat (`AppModal`); aksi kontekstual (long-press)
memakai `BottomSheet`; aksi destruktif selalu lewat `ConfirmDialog`.

**Form transaksi (padat, tanpa dropdown).** Urutannya: tab tipe (5, ikon + label pendek) → kolom jumlah
30 px dengan baris meta "saldo tersedia · dompet" dan sisa saldo yang berubah saat mengetik → grid
kategori (`CategoryGrid`, satu tile per kategori, 4 per baris) → chip dompet bermark (transfer: Dari/Ke,
setor/tarik: chip target dengan progres) → tanggal + metode dalam satu baris (metode berupa chip) →
catatan satu baris → baris pratinjau (nominal → dompet + sisa) → tombol aksi.
Satu-satunya pemilih yang masih membuka sheet adalah kalender tanggal. Mock: `docs/transaction-form.svg`.

**Istilah mengikuti arah uang**, bukan nama field: `income` menambah saldo dompet yang dipilih → labelnya
"Disimpan ke"; `expense` mengurangi → "Diambil dari"; transfer → "Dari / Ke"; setor tabungan → "Dari" +
target; tarik tabungan → target + "Ke". Baris meta jumlah memakai "Saldo sekarang" untuk pemasukan
(nilai bertambah) dan "Saldo tersedia" untuk pengeluaran (nilai berkurang, merah bila sampai minus).

**Setor / tarik tabungan tidak ada di "Transaksi baru".** Keduanya memindahkan uang antara dompet dan
target tabungan (total uang tetap), jadi dikelola dari layar Tabungan — di sana target dan progresnya
sudah terlihat. Form transaksi hanya menampilkan baris tautan "Setor / tarik tabungan →" bila pengguna
punya target. Kalau sebuah transaksi tabungan dibuka untuk diedit, tipenya tampil sebagai pil terkunci.

**Kategori** = satu tile per kategori, jadi jumlah kategori menentukan tinggi grid: sekarang 8 pengeluaran
(Makanan, Transportasi, Hiburan, Belanja, Liburan, Pendidikan, Kesehatan, Lainnya) dan 6 pemasukan
(Lainnya, Gaji, Bonus, Usaha, Hadiah, Investasi).

**Loading.** Skeleton hanya untuk hidrasi pertama. Akun baru langsung melihat *empty state* dengan
tombol aksi, bukan skeleton yang menggantung.

---

## 6. Gerak

`src/utils/motion.ts`:

* `useReducedMotion()` — membaca *prefers-reduced-motion* / *reduce motion*.
* `usePressScale(0.975)` — umpan balik tekanan berbasis spring.
* `useCountUp(value)` — angka hero naik dari nilai sebelumnya.
* `useEntrance({ index })` — fade + naik 8px dengan penundaan bertahap (`stagger`).
* `useTweenStyle(…), useMotionTiming(…)` — helper tween.

Semua hook di atas melewati animasi (langsung ke nilai akhir) jika Reduce Motion aktif.

---

## 7. Yang sengaja dihindari

* Kotak ikon pastel berukuran besar sebagai dekorasi.
* Gradien warna-warni dan *blob* dekoratif; gradien hanya di kartu hero (navi → biru).
* Border 1px di setiap kontainer.
* Titik-titik di setiap data point pada grafik, plus label permanen yang menumpuk.
* Shimmer berlebihan, animasi panjang, atau gerak yang tidak bisa dimatikan.
* Warna berbeda-beda di setiap kartu dengan bobot visual yang sama.
