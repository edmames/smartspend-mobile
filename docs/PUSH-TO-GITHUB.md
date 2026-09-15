# Simpan SmartSpend ke GitHub

Repo git-nya **sudah siap** di `/home/user/smartspend-mobile`: branch `main`, 2 commit, 107 file
ter-track (tanpa `node_modules`, `.expo`, `dist`, dan tanpa `.env`).

```
441760e  ci: run strict typecheck, 171 logic checks and web export on push
c10efb6  feat: SmartSpend — personal finance app (Expo + TypeScript)
```

Ada dua paket yang bisa diunduh dari workspace:

| File | Isi | Kapan dipakai |
| --- | --- | --- |
| `smartspend-mobile.bundle` (775 KB) | Seluruh riwayat git (2 commit, branch `main`) | Cara paling bersih: clone dari bundle → push ke GitHub, riwayat ikut terbawa |
| `smartspend-mobile-source.zip` (1,7 MB) | Snapshot sumber (276 file, termasuk `.git/`) | Kalau lebih suka unzip manual lalu push |

> Catatan: sandbox ini tidak menyimpan kredensial (`.git/config` & `.netrc` difilter dari snapshot) dan
> tidak punya akses ke akun GitHub Anda, jadi **langkah push harus dijalankan di komputer Anda**.

---

## Cara 1 — dari bundle (disarankan, riwayat utuh)

1. Buat repo kosong di GitHub (jangan centang "Add a README"):

   https://github.com/new → nama mis. `smartspend-mobile` → **Create repository**

2. Unduh `smartspend-mobile.bundle`, lalu di terminal komputer Anda:

```bash
git clone smartspend-mobile.bundle smartspend-mobile
cd smartspend-mobile
git remote set-url origin https://github.com/<USERNAME>/smartspend-mobile.git
git push -u origin main
```

Ganti `<USERNAME>` dengan username GitHub Anda. Selesai — riwayat commit ikut terunggah.

---

## Cara 2 — pakai repo yang sudah ada di sandbox

Kalau Anda menjalankan perintah langsung di workspace ini (butuh kredensial GitHub Anda), cukup
tambahkan remote lalu push:

```bash
cd /home/user/smartspend-mobile

# HTTPS + Personal Access Token (Settings → Developer settings → Tokens, scope: repo)
git remote add origin https://<USERNAME>:<TOKEN>@github.com/<USERNAME>/smartspend-mobile.git

# atau SSH (kalau kunci SSH Anda tersedia di mesin ini)
# git remote add origin git@github.com:<USERNAME>/smartspend-mobile.git

git push -u origin main
```

Kalau remote sudah pernah ada: `git remote set-url origin <url>`.

---

## Cara 3 — GitHub CLI

```bash
gh auth login
cd /home/user/smartspend-mobile
gh repo create smartspend-mobile --private --source=. --remote=origin --push
```

---

## Setelah ter-push

* **CI langsung jalan.** `.github/workflows/ci.yml` menjalankan `npm ci`, `npm run typecheck`,
  `npm run verify` (171 cek) dan `npm run export:web`. Ketiganya sudah diuji lokal dan hijau.
* **README GitHub** menampilkan `README.md` di root — di dalamnya ada quick start, peta fitur,
  aturan ledger, dan ringkasan design system (`docs/DESIGN-SYSTEM.md`).
* **Pratinjau desain** ada di `docs/*.svg` (mock Beranda, form transaksi, penanda dompet) — bisa
  dibuka langsung di GitHub karena SVG dirender sebagai gambar.

## Yang TIDAK ikut ter-commit (memang disengaja)

| Path | Alasan |
| --- | --- |
| `node_modules/`, `.expo/`, `dist/`, `web-build/` | artefak instalasi/build — dipulihkan dengan `npm ci` |
| `.env`, `.env*.local` | kredensial (Supabase/Telegram). Hanya `.env.example` yang masuk repo |
| `*.bundle`, `*.zip` | paket lokal untuk push |
| `/android`, `/ios` | hasil `expo prebuild` (dibuat ulang saat dibutuhkan) |

## Jangan lupa

* Kalau nanti mengisi Supabase/Telegram, buat `.env` lokal — **jangan** commit.
* Untuk uji di HP: `npx expo start` lalu scan QR dengan Expo Go, atau `npm run web` di browser normal
  (di dalam iframe preview sandbox, localStorage diblokir sehingga data hanya bertahan per sesi).
