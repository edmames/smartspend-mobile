# Menambahkan "Masuk dengan Google" — apa saja yang harus disiapkan

Dokumen ini adalah checklist persiapan (belum ada kode yang diubah). Semua nilai yang
disebut di sini diambil dari `app.json` proyek ini, jadi bisa langsung disalin.

---

## 0. Ketahui dulu: aplikasi ini lokal-first

Login saat ini adalah **akun demo lokal** di AsyncStorage (`src/store/authStore.ts`) — tidak
ada server yang memverifikasi siapa pun. "Masuk dengan Google" menambahkan **identitas**, dan
itu butuh pihak ketiga untuk **memverifikasi token** (token Google tidak boleh dipercaya
begitu saja dari klien). Jadi ada dua jalur:

| Jalur | Yang dipakai | Cocok untuk | Catatan |
| --- | --- | --- | --- |
| **A. Supabase Auth** (disarankan) | Google Cloud + Supabase + `@supabase/supabase-js` | Aplikasi nyata, sekaligus pintu ke sync cloud nanti | Supabase sudah disiapkan sebagai opsi di `.env.example`; gratis (free tier) |
| **B. Tanpa backend** | Hanya Google Cloud | Demo/prototipe | Token tidak diverifikasi siapa pun. **Jangan** dipakai untuk data pengguna nyata |

Sisanya di bawah berlaku untuk kedua jalur, kecuali bagian Supabase (B).

---

## 1. Google Cloud Console — bagian yang paling banyak bikin gagal

Buka <https://console.cloud.google.com> → buat **Project** baru (mis. `smartspend`).

### 1a. OAuth consent screen (sekarang bernama "Google Auth Platform")

Menu **APIs & Services → OAuth consent screen** (atau "Google Auth Platform" → **Branding/Audience**):

| Isian | Nilai |
| --- | --- |
| App name | `SmartSpend` |
| User support email | email Anda |
| Developer contact | email Anda |
| Logo | opsional (kalau ada, wajib verifikasi brand kalau publik) |
| Authorized domains | `github.io` (untuk demo Pages), domain Anda nanti |
| Scopes | `openid`, `email`, `profile` — **tidak sensitif**, jadi tidak perlu proses verifikasi Google |
| Publishing status | **Testing** dulu; tambahkan email Anda di **Test users** (tanpa ini, login ditolak) |

> Status **Testing** sudah cukup untuk pengembangan. Untuk publik/luas, ajukan **Publish**.
> Karena scope-nya tidak sensitif, tidak ada audit berbayar seperti scope Gmail/Drive.

### 1b. Buat tiga OAuth Client ID

Menu **APIs & Services → Credentials → Create credentials → OAuth client ID**.

**1. Web application** — dipakai untuk web (GitHub Pages) **dan** diserahkan ke Supabase.

```
Name: SmartSpend Web
Authorized JavaScript origins:
  http://localhost:8081
  https://edmames.github.io
Authorized redirect URIs:
  https://<PROJECT-REF>.supabase.co/auth/v1/callback   ← jalur A (Supabase)
  https://edmames.github.io/smartspend-mobile/          ← jalur B (langsung, tanpa Supabase)
  http://localhost:8081
```

**2. Android** — dibutuhkan kalau nanti dibuild ke Android.

```
Package name: com.smartspend.mobile        ← dari app.json
SHA-1 fingerprint:
  • debug    : hasil `keytool` keystore debug, ATAU `eas credentials -p android`
  • release  : keystore rilis Anda
  • Play Store: SHA-1 dari Play App Signing (ditambah belakangan)
```

**3. iOS** — dibutuhkan kalau dibuild ke iOS.

```
Bundle ID: com.smartspend.mobile           ← dari app.json
```

### 1c. Catat yang mana dipakai di mana

Ini sumber kebingungan nomor satu (`DEVELOPER_ERROR`, "Must specify an idToken or accessToken"):

| Client ID | Simpan di mana | Dipakai di kode? |
| --- | --- | --- |
| **Web** (`...apps.googleusercontent.com`) | Supabase dashboard **dan** variabel `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Ya — sebagai `webClientId` |
| **Android** | *hanya* Google Cloud | Tidak (dibaca otomatis oleh Play Services) |
| **iOS** | *hanya* Google Cloud | Tidak untuk kode; nilainya masuk `Info.plist` lewat config plugin |

**Client Secret** (hanya ada di client Web) → **hanya** disimpan di Supabase. Jangan pernah
dimasukkan ke aplikasi atau repo (apa pun yang ada di bundle JS bisa dibaca siapa saja).

---

## 2. Supabase (jalur A)

1. Buat project di <https://supabase.com> → catat **Project URL** dan **anon key**
   (Settings → API). Anon key memang publik, tapi hanya aman kalau RLS aktif.
2. **Authentication → Providers → Google**: aktifkan, tempel **Client ID** + **Client Secret**
   dari client Web di atas, simpan.
3. **Authentication → URL Configuration**:
   * **Site URL**: `https://edmames.github.io/smartspend-mobile/`
   * **Redirect URLs** (tambahkan semuanya):
     ```
     http://localhost:8081
     https://edmames.github.io/smartspend-mobile/
     smartspend://**          ← skema aplikasi native (app.json → scheme)
     ```
4. **Row Level Security**: aktifkan RLS di setiap tabel milik pengguna, dengan policy
   `auth.uid() = user_id`. Tanpa ini, anon key = siapa pun bisa membaca data semua orang.
5. Kalau nanti cloud sync: siapkan tabel `profiles` (id = `auth.users.id`, name, email, avatar_url)
   plus tabel data (wallets/transactions/savings/budgets) yang semuanya dikunci `user_id`.
6. Salin **Project URL** + **anon key** ke `.env` lokal (tidak di-commit):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT-REF>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<...apps.googleusercontent.com>
   ```
   `app.json` sudah punya `scheme: "smartspend"` — itu syarat deep-link balik dari browser,
   jadi tidak perlu diubah.

---

## 3. Sisi aplikasi — yang akan berubah

Dependensi (semua lewat `npx expo install` agar versinya cocok dengan SDK 57):

```bash
npx expo install expo-web-browser expo-crypto expo-auth-session @supabase/supabase-js
# khusus build native (tidak jalan di Expo Go):
npx expo install @react-native-google-signin/google-signin
```

Perubahan berkas:

| Berkas | Perubahan |
| --- | --- |
| `src/services/auth.service.ts` *(baru)* | Satu antarmuka: `signInWithGoogle()`, `signOut()`, `getSession()`. Di dalamnya bercabang: web → Supabase OAuth; native → Google Sign-In native → `signInWithIdToken`; tanpa kredensial → tombol tampil nonaktif dengan pesan "belum dikonfigurasi" |
| `src/store/authStore.ts` | Tambah `provider: 'local' \| 'google'`, `email`, `avatarUrl`, dan simpan sesi Supabase (AsyncStorage; `expo-secure-store` di native) |
| `app/(auth)/login.tsx` + `register.tsx` | Tombol "Lanjutkan dengan Google" (sesuai pedoman merek Google: tombol resmi, teks "Lanjutkan dengan Google") |
| `src/hooks/useStorage.ts` | `useBootstrap()` tahu bedanya sesi Supabase vs sesi lokal |
| `src/services/export.service.ts` | **Redaksi** token/sesi dari backup JSON — jangan pernah ikut ter-export |
| `app.json` | Tambah plugin `@react-native-google-signin/google-signin` (+ `iosUrlScheme` dari iOS client) saat jalur native dipakai |
| `docs/`, `README.md` | Dokumentasi alur login + env baru |

Dua alur berbeda yang perlu kode berbeda:

**Web (termasuk GitHub Pages demo)** — paling sederhana, andal:
```ts
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: window.location.origin + '/smartspend-mobile/' },
});
// client dibuat dengan { auth: { flowType: 'pkce', detectSessionInUrl: true } }
```

**Native (Android/iOS)** — pengalaman asli, tanpa browser:
```ts
const { data } = await GoogleSignin.signIn();       // butuh development build
await supabase.auth.signInWithIdToken({ provider: 'google', token: data.idToken! });
```

---

## 4. Jebakan yang sudah diketahui (2026) — baca sebelum mulai

1. **Expo Go tidak bisa Google Sign-In native.** `@react-native-google-signin/google-signin`
   butuh modul native → wajib *development build* (`npx expo run:android` / EAS Build).
2. **Alur browser `expo-auth-session` untuk Google sudah rapuh di SDK modern.** Sejak SDK 53
   alur ini rusak dan pemelihara Expo menyatakan tidak lagi merawat library autentikasi Google;
   dokumentasi resmi kini mengarahkan ke `@react-native-google-signin`. Untuk **web** jalurnya
   tetap aman (Supabase OAuth lewat browser biasa) — yang rapuh adalah versi browser-di-dalam-aplikasi-native.
3. **`DEVELOPER_ERROR` di Android** hampir selalu berarti **SHA-1 salah atau belum didaftarkan**,
   atau memakai Android client ID di kode padahal harus **Web client ID**.
4. **iOS: "Passed nonce and nonce in id_token must align."** Android Credential Manager punya opsi
   sponsor/berbayar; banyak tim memilih pasang "Skip nonce checks" di provider Supabase atau pindah
   ke modul native berlisensi. Uji di perangkat asli sebelum mengandalkan iOS.
5. **URL redirect harus persis.** Salah satu karakter berbeda → `redirect_uri_mismatch`.
   Daftar yang dipakai: `http://localhost:8081`, URL Pages, `.../auth/v1/callback`, `smartspend://`.
6. **Repo publik + anon key**: aman **hanya** kalau RLS aktif di semua tabel. Jangan simpan
   service-role key di aplikasi.
7. **Sesi di preview iframe**: storage diblokir, jadi login Google tidak akan "menempel" di
   preview sandbox. Ujilah di GitHub Pages atau browser normal.
8. **Kebijakan toko aplikasi**: kalau dipublikasikan dan menyediakan login pihak ketiga, Google Play
   meminta kebijakan privasi + cara hapus akun. Siapkan sebelum rilis, bukan sesudah.

---

## 5. Uji di empat tempat (checklist)

| Tempat | Cara login | Yang dicek |
| --- | --- | --- |
| Web lokal `npm run web` | Supabase OAuth (browser) | Redirect balik ke `localhost:8081`, sesi bertahan setelah reload |
| GitHub Pages | Supabase OAuth (browser) | Origin & redirect URL sudah didaftarkan; data bertahan (localStorage aktif) |
| Android dev build | Google Sign-In native | SHA-1 benar, `webClientId` = client Web, tidak `DEVELOPER_ERROR` |
| iOS dev build | Google Sign-In native | Nonce/`Info.plist` URL scheme, uji di perangkat asli |

---

## 6. Perkiraan waktu & pembagian kerja

| Bagian | Siapa | Perkiraan |
| --- | --- | --- |
| Setup Google Cloud (consent + 3 client ID + SHA-1) | Anda | 30–45 menit |
| Setup Supabase (provider, URL config, RLS) | Anda | 20 menit |
| `auth.service.ts` + tombol di login + store + redaksi backup | Saya | ±1 sesi kerja |
| Uji web lokal & Pages | Bersama | 20 menit |
| Alur native (dev build, SHA-1, nonce iOS) | Anda + saya | 1–2 jam, banyak bolak-balik |

**Yang bisa saya kerjakan sekarang tanpa kredensial apa pun:** kerangka `auth.service.ts` dengan
deteksi kredensial (kalau env kosong → tombol Google tampil nonaktif + pesan "belum dikonfigurasi"),
tombol resmi di halaman login, `provider` di `authStore`, dan redaksi token di backup. Begitu Anda
menempel Client ID + anon key ke `.env`, tinggal diuji — tanpa ubah kode lagi.

---

## 7. Biaya

* Google Cloud OAuth: **gratis** (scope `email`/`profile` tidak berbayar dan tidak perlu verifikasi).
* Supabase: **gratis** (free tier: 50k MAU, 500 MB database) — cukup jauh untuk aplikasi pribadi.
* Tidak ada biaya lain sampai aplikasi dipublikasikan di toko.
