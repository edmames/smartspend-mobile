# Simpan SmartSpend ke GitHub

Repo git-nya **sudah siap** di `/home/user/smartspend-mobile`: branch `main`, 5 commit, 114 file
ter-track (tanpa `node_modules`, `.expo`, `dist`, dan tanpa `.env`).

```
5b81e7e  docs: rename default branch to main, add push troubleshooting (Windows)
3987451  chore(repo): GitHub Pages demo, CI badge, changelog, templates
9e51c36  docs: add GitHub push guide (bundle / remote / gh cli)
441760e  ci: run strict typecheck, 186 logic checks and web export on push
c10efb6  feat: SmartSpend — personal finance app (Expo + TypeScript)
```

Branch: **`main`** · tag: **`v1.0.0`** (bundle & zip sudah memakai `main`).

Ada dua paket yang bisa diunduh dari workspace:

| File | Isi | Kapan dipakai |
| --- | --- | --- |
| `smartspend-mobile.bundle` (~785 KB) | Seluruh riwayat git (5 commit, branch `main`, tag `v1.0.0`) | Cara paling bersih: clone dari bundle → push ke GitHub, riwayat ikut terbawa |
| `smartspend-mobile-source.zip` (~1,7 MB) | Snapshot sumber (305 file, termasuk `.git/`) | Kalau lebih suka unzip manual lalu push |

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
git branch -M main            # bundle memakai branch main; baris ini aman diulang
git remote set-url origin https://github.com/<USERNAME>/smartspend-mobile.git
git push -u origin main
```

Ganti `<USERNAME>` dengan username GitHub Anda. Selesai — riwayat commit dan tag `v1.0.0` ikut terunggah.

**Windows / PowerShell:** tulis URL tanpa tanda kurung siku atau markdown. Kalau ragu, apit dengan kutip:

```powershell
git remote set-url origin "https://github.com/<USERNAME>/smartspend-mobile.git"
git push -u origin main
```

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

## Kalau push gagal — masalah yang paling sering muncul

### `error: src refspec main does not match any`

Artinya **repo lokal Anda tidak punya branch bernama `main`**. Dua penyebab:

1. Branch lokal masih bernama `master` (default lama git, atau paket/kloning lama). Cek dulu:

   ```powershell
   git log --oneline      # ada commit? berarti ini penyebabnya
   ```

   Perbaikan:

   ```powershell
   git branch -M main     # ubah nama branch jadi main (histori tetap utuh)
   git push -u origin main
   ```

2. Repo lokal belum punya commit sama sekali (`git log` bilang *"does not have any commits yet"*),
   biasanya karena folder hanya berisi file hasil ekstrak zip tanpa `.git`. Perbaikan:

   ```powershell
   git init -b main
   git add -A .
   git commit -m "feat: SmartSpend v1.0.0"
   git remote add origin "https://github.com/<USERNAME>/smartspend-mobile.git"
   git push -u origin main
   ```

Cara paling mudah menghindari kasus 1: jalankan `git clone smartspend-mobile.bundle .` (lihat Cara 1),
karena bundle sudah berisi branch `main` dan tag `v1.0.0`.

### `error: failed to push some refs` / `remote: Repository not found`

Biasanya salah satu dari:

* **URL remote rusak** — sering terjadi kalau URL di-paste lengkap dengan penanda markdown,
  mis. `[https://github.com/user/repo.git](https://github.com/user/repo.git)`. Lihat URL yang
  tersimpan dan perbaiki:

  ```powershell
  git remote -v
  git remote set-url origin "https://github.com/<USERNAME>/smartspend-mobile.git"
  ```

* **Repo GitHub belum dibuat**, atau namanya beda (`edmames/smartspend-mobile` vs `smartspend-mobile`).
  Buat dulu via https://github.com/new (jangan centang "Add a README", supaya tidak bentrok).

* **Autentikasi** — GitHub tidak menerima password akun. Pakai Personal Access Token sebagai
  password, atau masuk lewat Git Credential Manager yang muncul otomatis di Windows.

### Mau menghindari `master` di repo berikutnya

```powershell
git config --global init.defaultBranch main
```

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

## Deploy ke Vercel (alternatif GitHub Pages)

Kode ini **100% kompatibel dengan Vercel**. Ekspor web-nya adalah situs statis biasa
(`npx expo export --platform web` → folder `dist/`, 23 file, aset di `/_expo/...`), jadi tidak
butuh server, serverless function, atau Node runtime saat diakses. Konfigurasinya sudah ada di
repo: `vercel.json`.

### Kenapa Vercel justru lebih mudah daripada GitHub Pages

| | Vercel | GitHub Pages |
| --- | --- | --- |
| Lokasi situs | Domain root (`https://<proyek>.vercel.app/`) | Subpath (`/<nama-repo>/`) |
| Tambal `baseUrl` | **Tidak perlu** — aset sudah root-relative | Perlu (sudah ditangani workflow) |
| Deep link SPA | Rewrite `/(.*)` → `/index.html` di `vercel.json` | Perlu `404.html` |
| Pratinjau per commit | ✅ URL unik tiap push/PR | ❌ hanya satu situs |
| Rollback | ✅ satu klik ke deployment lama | ❌ perlu revert commit |
| Lokasi kode | GitHub (Vercel menyambung ke repo) | GitHub |

Dua-duanya menyajikan aplikasi dari **origin sungguhan**, jadi `localStorage` aktif dan data
bertahan setelah reload — beda dengan iframe preview sandbox.

### Langkah

**Cara 1 — lewat dashboard (paling mudah)**

1. Buka <https://vercel.com/new> → **Import Git Repository** → pilih `edmames/smartspend-mobile`.
2. Karena ada `vercel.json`, biarkan semua setelan **default** (Vercel membaca build command &
   output directory dari file itu). Kalau tidak terbaca, isi manual:
   * Framework Preset: **Other**
   * Build Command: `npx expo export --platform web`
   * Output Directory: `dist`
   * Install Command: `npm ci`
3. **Environment Variables** (opsional, hanya kalau memakai Supabase/Telegram):
   `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`,
   `EXPO_PUBLIC_TELEGRAM_BOT_TOKEN`. Aplikasi tetap jalan tanpa ini (offline-first).
   Rincian + skema SQL: `docs/SUPABASE-SETUP.md`. **Penting:** variabel ditanam saat build,
   jadi setelah menambahkannya lakukan **Redeploy**.
4. **Deploy**. Hasilnya di `https://smartspend-mobile.vercel.app` (atau nama lain yang Anda pilih).
5. Setiap `git push` berikutnya otomatis membuat deployment baru, dan setiap PR mendapat
   **Preview URL** sendiri untuk dites sebelum merge.

**Cara 2 — lewat CLI**

```bash
npm i -g vercel
cd smartspend-mobile
vercel            # deploy pratinjau
vercel --prod     # deploy produksi
```

### Yang perlu diperhatikan di Vercel

* **Node 20+**: `package.json` sudah memuat `"engines": { "node": ">=20" }` supaya Vercel tidak
  memakai versi lama (Expo SDK 57 butuh Node 20).
* **Storage per-origin**: `https://xxx.vercel.app` dan URL pratinjau commit punya `localStorage`
  masing-masing. Data yang dibuat di URL pratinjau **tidak** muncul di domain produksi.
* **Paket gratis (Hobby)** hanya untuk penggunaan non-komersial. Kalau aplikasinya nanti dipakai
  untuk usaha, pindah ke plan Pro.
* **Jangan** menaruh kredensial di `vercel.json` — pakai Environment Variables.
* Kalau nanti aplikasi memakai Expo API Routes (`output: "server"`), barulah Vercel Functions
  dibutuhkan; selama `web.output` masih `"single"` (SPA), statis saja sudah cukup.

---

## Deploy ke layanan statis lain

Karena output-nya statis, ini juga jalan di Netlify, Cloudflare Pages, Firebase Hosting, atau
server Nginx apa pun. Aturan umumnya:

* Build: `npm ci && npx expo export --platform web`
* Publish/Output: `dist`
* SPA fallback: arahkan semua rute ke `/index.html`
* Base path: **root** (kecuali hosting di subpath → tambahkan `experiments.baseUrl` di `app.json`)

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
| `.github/workflows/ci.yml` | Typecheck + 186 cek + export web pada setiap push/PR |
| `.github/workflows/pages.yml` | Build & deploy demo web ke GitHub Pages |
| `vercel.json` | Konfigurasi deploy Vercel (build statis, SPA rewrite, cache header) |
| `package.json` → `engines.node` | Memastikan Vercel/CI memakai Node 20+ |
| `CHANGELOG.md` | Release notes v1.0.0 (format Keep a Changelog) |
| `.github/ISSUE_TEMPLATE/*` | Form laporan bug & permintaan fitur |
| `.github/PULL_REQUEST_TEMPLATE.md` | Checklist gate (typecheck/verify/docs) |
| `.gitattributes` | Normalisasi LF, penanda biner, dan linguist (agar SVG docs tidak dihitung sebagai kode) |
| `LICENSE` | MIT — **ganti `<NAMA ANDA>` dengan nama Anda** |

---

## Setelah ter-push

* **CI langsung jalan.** `.github/workflows/ci.yml` menjalankan `npm ci`, `npm run typecheck`,
  `npm run verify` (186 cek) dan `npm run export:web`. Ketiganya sudah diuji lokal dan hijau.
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
