# Supabase (cloud opsional) — cara menyalakan

Aplikasi ini **offline-first**: seluruh fitur berjalan tanpa internet dan tanpa Supabase.
Supabase hanya lapisan tambahan (login, sinkronisasi/backup cloud). Karena itu integrasinya
dirancang **gagal dengan tenang**: kalau variabelnya kosong, aplikasi tetap normal dan
Setelan → Cloud menampilkan status "belum dikonfigurasi" beserta alasannya.

---

## 1. Yang sudah terpasang di kode

| Berkas | Isi |
| --- | --- |
| `src/utils/supabaseConfig.ts` | Helper murni (bisa diuji Node): validasi env, `projectRef`, masking anon key, URL health |
| `src/services/supabase.service.ts` | `testSupabaseConnection()` (uji jaringan 8 detik), `getSupabaseClient()` (klien *lazy*, memoized, PKCE, storage tahan error), `resetSupabaseClient()` |
| `app/(tabs)/settings.tsx` | Baris **Cloud (Supabase)** dengan status project + anon key tersamarkan, tombol **Uji koneksi**, dan petunjuk bila belum diisi |
| `scripts/verify.ts` | 15 pemeriksaan konfigurasi Supabase (env kosong, placeholder, URL salah, path `/rest/v1`, non-https, masking, dsb.) |
| `.env.example` | Daftar variabel |

Klien hanya dibuat **saat dipakai**. `autoRefreshToken` dan `persistSession` aktif, sesi
disimpan lewat adapter AsyncStorage yang tidak melempar error di iframe yang memblokir storage.

---

## 2. Menyalakan (5 langkah)

### 2.1 Buat project

<https://supabase.com> → **New project** → catat dua nilai dari **Settings → API**:

* **Project URL** → `EXPO_PUBLIC_SUPABASE_URL` (contoh `https://abcdefgh.supabase.co`)
* **anon public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

> Ambil **URL project**, bukan `https://xxx.supabase.co/rest/v1` — kalau salah, Setelan akan
> menampilkan "URL Supabase tidak valid".

### 2.2 Isi variabel sesuai tempat menjalankan

**Lokal** — buat `.env` (jangan di-commit):

```
EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

**Vercel** — Project → **Settings → Environment Variables** → tambahkan dua variabel di atas,
centang *Production*, *Preview*, *Development* → **Redeploy** (variabel ditanam saat build,
jadi deploy lama tidak ikut berubah).

**GitHub Actions** (kalau nanti CI ikut membangun web dengan Supabase) — repo → **Settings →
Secrets and variables → Actions → New repository secret**.

### 2.3 Verifikasi di aplikasi

Buka **Setelan → Cloud (Supabase)**. Barisnya menampilkan `Project: abcdefgh · eyJhbG…9fQ2`.
Ketuk baris itu untuk **Uji koneksi** — hasilnya lewat toast:

| Hasil | Artinya |
| --- | --- |
| "Terhubung · 120 ms" | URL & anon key benar, project hidup |
| "Tidak dapat dijangkau" | Salah URL, project di-pause, atau jaringan diblokir |
| "Project menolak anon key" | Anon key salah/terpotong (401/403) |
| "Project merespons error" | Project bermasalah (5xx) |

Perintah terminal untuk hal yang sama:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY" \
  "$EXPO_PUBLIC_SUPABASE_URL/auth/v1/health"
```

### 2.4 Skema & RLS (wajib sebelum menyimpan data)

Tanpa RLS, anon key publik = siapa pun bisa membaca seluruh tabel. Jalankan di **SQL Editor**:

```sql
-- Profil: satu baris per pengguna auth
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  email text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Contoh tabel data pengguna (pola yang sama untuk wallets/transactions/savings/budgets)
create table if not exists public.wallets (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  type text not null check (type in ('cash','bank','ewallet')),
  brand text,
  initial_balance bigint not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.wallets  enable row level security;

-- Setiap orang hanya melihat barisnya sendiri
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own wallets" on public.wallets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Saat pengguna baru mendaftar, buat profilnya otomatis
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

Catatan desain penting untuk sinkronisasi nanti:

* **ID dari aplikasi dipakai apa adanya** (`text primary key`) supaya tidak perlu memetakan ulang
  id lokal ↔ id server. Aplikasi sudah memakai id acak, jadi bentrok antar-perangkat kecil.
* Simpan **`updated_at`** di setiap tabel + `deleted_at` (soft delete) supaya sinkronisasi bisa
  memakai aturan "terbaru menang" tanpa menghidupkan baris yang sudah dihapus.
* **Buku besar tetap sumber kebenaran.** Karena itu yang disinkronkan adalah `transactions`
  (append-only), sedangkan saldo dompet/tabungan tetap hasil hitung lokal — jangan simpan saldo
  di server sebagai angka yang dipercaya.

### 2.5 Bucket untuk backup JSON (opsional)

Fitur backup aplikasi menghasilkan satu berkas JSON. Cara paling aman menyimpannya di cloud:

```sql
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

create policy "own backup files" on storage.objects
  for all using (
    bucket_id = 'backups' and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'backups' and auth.uid()::text = (storage.foldername(name))[1]
  );
```

Simpan sebagai `backups/<user-id>/<tanggal>.json`. **Selalu redaksi token/sesi** dari berkas
backup sebelum diunggah (lihat `src/services/export.service.ts`).

---

## 3. Belum termasuk (sengaja)

| Hal | Status |
| --- | --- |
| Login email+password Supabase | Belum — pendaftaran masih lokal (AsyncStorage). Lihat `docs/GOOGLE-LOGIN-SETUP.md` |
| Sinkronisasi dua arah otomatis | Belum — perlu mesin sinkronisasi + penanganan konflik |
| Unggah/unduh backup ke bucket | Belum — pola SQL & lokasi berkas sudah disiapkan di atas |
| Realtime | Belum — tidak diperlukan untuk aplikasi satu pengguna |

Urutan yang disarankan: **(1)** Supabase + Google login → **(2)** backup/restore ke bucket
(aman, mudah dibatalkan) → **(3)** sinkronisasi tabel (paling kompleks, baru setelah dua langkah
sebelumnya stabil).

---

## 4. Troubleshooting

| Gejala | Penyebab umum |
| --- | --- |
| Status tetap "belum dikonfigurasi" | Variabel belum ada saat **build**. Di Vercel harus **Redeploy**, di lokal restart `npm run web` (Expo membaca `.env` saat start) |
| "URL Supabase tidak valid" | Tersalin `.../rest/v1` atau `http://` (harus `https://`) |
| "Project menolak anon key" | Anon key terpotong (perhatikan tanda kutip ganda di Windows) atau Anda memakai **service-role** key — jangan pernah yang itu |
| Uji koneksi sukses tapi data tidak tersinkron | Wajar: sinkronisasi memang belum diaktifkan (lihat bagian 3) |
| Project "paused" | Free tier tidur setelah lama tidak dipakai — buka dashboard untuk membangunkan |
