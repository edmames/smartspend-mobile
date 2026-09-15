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

## Cara 4 — .gitignore / .env manual

Kalau Anda lebih suka memindahkan file satu-satu (drag & drop di web GitHub), unggah isi
`smartspend-mobile-source.zip` **tanpa** `.git/`, `node_modules/`, `.expo/`, `dist/`, dan `.env`.
Perhatikan: drag & drop tidak membawa riwayat commit, dan file `.github/` (workflow) harus
di-commit lewat git supaya Actions jalan.

---

## Aktifkan demo web (GitHub Pages) — sekali klik

1. Push repo-nya dulu (cara mana pun di atas).
2. Buka **Settings → Pages** di repo → bagian **Source** pilih **GitHub Actions**.
3. Buka tab **Actions** → workflow **"Deploy web demo to GitHub Pages"** → **Run workflow**.

Setelah selesai, aplikasi live di:

```
https://<USERNAME>.github.io/smartspend-mobile/
```

Workflow `pages.yml` melakukan semuanya: `npm ci` → menambal `experiments.baseUrl` agar aset
dilayani dari `/<nama-repo>/` → `expo export --platform web` → menambah `.nojekyll` (supaya folder
`_expo` tidak dibuang Jekyll) → `404.html` untuk deep link (SPA) → deploy.

> **Ini juga solusi untuk data.** Di GitHub Pages, origin-nya sungguhan sehingga `localStorage`
> bekerja: akun dan transaksi bertahan setelah reload — beda dengan iframe preview sandbox di mana
> storage diblokir dan data hanya bertahan per sesi.

---

## Rilis sebagai versi (opsional tapi disarankan)

Repo ini sudah punya `CHANGELOG.md` dengan format Keep a Changelog. Untuk menerbitkan v1.0.0
dengan file unduhan (bundle + zip) sebagai aset rilis:

```bash
git tag -a v1.0.0 -m "SmartSpend v1.0.0"
git push origin v1.0.0
```

Lalu di GitHub: **Releases → Draft a new release → pilih tag `v1.0.0`** → tempel isi
`CHANGELOG.md` → unggah `smartspend-mobile.bundle` dan `smartspend-mobile-source.zip` sebagai
aset → **Publish release**.

Alternatif lebih rapi untuk berkas besar (APK/AAB hasil EAS Build): simpan di **Releases**, bukan
di riwayat git. Kalau nanti aset Anda >50 MB, pertimbangkan **Git LFS** — tapi untuk repo ini
(2,5 MB tanpa `node_modules`) LFS belum perlu.

---

## Hal lain yang sudah tersedia di repo

| Berkas | Fungsi |
| --- | --- |
| `.github/workflows/ci.yml` | Typecheck + 171 cek + export web pada setiap push/PR |
| `.github/workflows/pages.yml` | Build & deploy demo web ke GitHub Pages |
| `CHANGELOG.md` | Release notes v1.0.0 (format Keep a Changelog) |
| `.github/ISSUE_TEMPLATE/*` | Form laporan bug & permintaan fitur |
| `.github/PULL_REQUEST_TEMPLATE.md` | Checklist gate (typecheck/verify/docs) |
| `.gitattributes` | Normalisasi LF, penanda biner, dan linguist (agar SVG docs tidak dihitung sebagai kode) |
| `LICENSE` | MIT — **ganti `<NAMA ANDA>` dengan nama Anda** |

---

## Setelah ter-push

* **CI langsung jalan.** `.github/workflows/ci.yml` menjalankan `npm ci`, `npm run typecheck`,
  `npm run verify` (171 cek) dan `npm run export:web`. Ketiganya sudah diuji lokal dan hijau.
* **README GitHub** menampilkan `README.md` di root — di dalamnya ada quick start, peta fitur,
  aturan ledger, dan ringkasan design system (`docs/DESIGN-SYSTEM.md`).
* **Pratinjau desain** ada di `docs/*.svg` (mock Beranda, form transaksi, penanda dompet) — bisa
  dibuka langsung di GitHub karena SVG dirender sebagai gambar.
* **Badge di README** sudah menunjuk ke workflow Anda; ganti `<USERNAME>` di `README.md` (4 tempat)
  dan di `CHANGELOG.md` (1 tempat) setelah repo dibuat.

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
