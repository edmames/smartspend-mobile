# SmartSpend — Personal Finance Mobile App (Expo + TypeScript)

[![CI](https://github.com/<USERNAME>/smartspend-mobile/actions/workflows/ci.yml/badge.svg)](https://github.com/<USERNAME>/smartspend-mobile/actions/workflows/ci.yml)
[![Deploy web demo](https://github.com/<USERNAME>/smartspend-mobile/actions/workflows/pages.yml/badge.svg)](https://github.com/<USERNAME>/smartspend-mobile/actions/workflows/pages.yml)
![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-000020)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Logic checks](https://img.shields.io/badge/logic%20checks-186%2F186-2ea043)
![License MIT](https://img.shields.io/badge/License-MIT-yellow)

A mobile-first personal finance app built with **Expo (React Native)**, **TypeScript (strict)**,
**Expo Router**, **Zustand** and **AsyncStorage**. Navy `#1e3a8a` + Electric Blue `#0ea5e9`, dark
mode by default, bottom-tab navigation, card-based layout.

The transaction ledger is the single source of truth: every wallet and savings balance is derived
from it, and **no mutation is accepted if it would make any balance negative on any date**.

---

## Demo

Setiap push ke `main` menerbitkan ulang build web statis ke **GitHub Pages**:

> https://<USERNAME>.github.io/smartspend-mobile/

Sumbernya adalah `npx expo export --platform web` (lihat `.github/workflows/pages.yml`).
Halaman itu dilayani dari origin sungguhan, jadi **localStorage aktif**: akun dan transaksi
bertahan setelah reload. (Di iframe preview sandbox, storage diblokir dan data hanya bertahan
per sesi.)

Cara mengaktifkan sekali saja: **Settings → Pages → Source: GitHub Actions**, lalu jalankan
workflow "Deploy web demo to GitHub Pages".

**Atau deploy ke Vercel** (juga dukung): import repo di <https://vercel.com/new> — `vercel.json`
sudah memuat build command, output directory, SPA rewrite, dan cache header, jadi tidak perlu
setelan manual. Vercel menyajikan di domain root (tanpa tambal `baseUrl`) dan memberi Preview URL
per commit. Langkah lengkap: `docs/PUSH-TO-GITHUB.md` → "Deploy ke Vercel".

---

## Quick start

```bash
cd smartspend-mobile
npm install
npm start           # Expo dev server (scan the QR with Expo Go)
npm run web         # run in the browser
npm run check       # typecheck + 186-check verification suite
```

First launch: create a local account (email + password) on the register screen — data is stored on
device only. There are **no fixtures and no demo data**: the app starts empty, exactly as specified.

### Scripts

| Script | What it does |
| --- | --- |
| `npm start` | Expo dev server (Expo Go / dev client) |
| `npm run android` / `npm run ios` / `npm run web` | Launch on a specific platform |
| `npm run typecheck` | `tsc --noEmit` with strict mode, no `any` |
| `npm run verify` | Runs the pure logic suite (`scripts/verify.ts`) on Node |
| `npm run check` | `typecheck && verify` |
| `npm run export:web` | Static web export (PWA guide path) |
| `npm run prebuild` | Generate native projects (`expo prebuild --clean`) |

---

## Feature map

| Screen | Highlights |
| --- | --- |
| **Auth** (`app/(auth)`) | Local register/login, salted password hashing, 30-day persisted session, auth-group redirect guard |
| **Dashboard** (`app/(tabs)/index.tsx`) | Total money (wallets + savings), monthly income/expense/net, 6-month area chart, top-3 wallets, 5 recent transactions, budget-exceeded banner, pull-to-refresh, FAB |
| **Transactions** (`app/(tabs)/transactions.tsx`) | Type chips + filter sheet (type/wallet/category/period), search by description · category · amount, infinite scroll (30/page), signed colour coding, long-press quick actions, pull-to-refresh |
| **Wallets** (`app/(tabs)/wallets.tsx`, `app/wallet/[id].tsx`) | Card list with live balances, add/edit (type immutable), delete blocked while history exists, detail view with 10 recent transactions |
| **Savings** (`app/(tabs)/savings.tsx`, `app/savings/[id].tsx`) | Progress cards (capped bar, real %), deposit/withdraw sheets, due-date badges, movement history, delete blocked while it holds money |
| **Budget** (`app/budget/index.tsx`) | Per category per month (1:1), month navigator + picker, green <50% / orange 50–99% / red >100%, exceeded warnings |
| **Reports** (`app/(tabs)/reports.tsx`) | Month arrows, summary, daily cash-flow table + bar chart, top-5 category donut, 6-month trend, JSON export |
| **Settings** (`app/(tabs)/settings.tsx`) | Account, theme (light/dark/system), language (id/en), honest storage-mode row, backup export/import (merge or replace), Telegram, PWA guide, delete-all-data, logout |

---

## Architecture

```
smartspend-mobile/
├── app/                        # Expo Router (file-based routes)
│   ├── _layout.tsx             # providers, theme, toasts, splash, auth gate
│   ├── (auth)/                 # login · register
│   ├── (tabs)/                 # index (dashboard) · transactions · wallets · savings · reports · settings
│   ├── transaction/            # new.tsx, [id].tsx
│   ├── wallet/[id].tsx         # wallet detail
│   ├── savings/[id].tsx        # savings target detail
│   ├── budget/index.tsx        # monthly budgets
│   └── +not-found.tsx
├── src/
│   ├── components/
│   │   ├── ui/                 # Card, Button, Input, AmountInput, Select, Modal, BottomSheet,
│   │   │                       # ProgressBar, Chip/Badge, Toast, ConfirmDialog, DateField,
│   │   │                       # MonthNavigator, SegmentedControl, SettingRow, StatTile, FAB,
│   │   │                       # EmptyState, AppText, Icon
│   │   ├── forms/              # TransactionForm, WalletForm, BudgetForm, SavingsForm, SavingsMovementForm
│   │   ├── charts/             # AreaChart, PieChart, BarChart (hand-rolled on react-native-svg)
│   │   ├── AmountText.tsx · TransactionRow.tsx · WalletCard.tsx · SavingsCard.tsx · BudgetCard.tsx
│   ├── hooks/                  # useTransactions, useWallets, useBudgets, useSavings, useAuth,
│   │                           # useStorage, useTheme (theme + i18n)
│   ├── services/
│   │   ├── storage.service.ts  # AsyncStorage bridge, IDs, password digest, session
│   │   ├── ledger.service.ts   # validateLedger, historical balance rules, balance calculators
│   │   ├── export.service.ts   # PURE: monthly report + backup payload build/validate/merge
│   │   └── file.service.ts     # native IO: write+share, document picker, web download
│   ├── store/                  # zustand: auth, wallet, transaction, budget, savings, settings + snapshot registry
│   ├── types/index.ts          # every domain type (single source of truth)
│   ├── utils/                  # calculations, validation, formatting, date, constants (incl. i18n), haptics
│   └── styles/                 # colors.ts, theme.ts
├── scripts/verify.ts           # 186 checks: parsing, dates, ledger, reports, budgets, import/export
├── app.json · eas.json · tsconfig.json · package.json
└── docs/SPEC-COMPLIANCE.md     # spec → implementation traceability + deviations
```

### Why a snapshot registry?

Wallet balances need the ledger, and the ledger needs wallets/savings targets to validate writes.
Importing the stores into each other would create cycles, so each store publishes its latest array
to `src/store/snapshot.ts` and reads the others through `getSnapshot()`. AsyncStorage stays the
source of truth; the snapshot is derived state only.

### Write pipeline (every ledger mutation)

1. Validate the input (`utils/validation.ts`) → per-field error codes.
2. Build the **prospective ledger** (add / edit / delete applied).
3. Run `validateLedger(next, wallets, targets)` — structure, referential integrity, and the
   **historical balance rule** (no wallet or savings balance may go negative on *any* date).
4. Persist to AsyncStorage, then publish to the snapshot + Zustand state.
5. If any step fails, nothing is written and the user sees a precise message.

---

## The ledger rules (implemented, not documented-only)

| Type | Source wallet | Destination wallet | Savings | Total money | Monthly report |
| --- | --- | --- | --- | --- | --- |
| `initial` | +amount | — | — | +amount | excluded |
| `income` | +amount | — | — | +amount | income |
| `expense` | −amount | — | — | −amount | expense |
| `transfer` | −amount | +amount | — | unchanged | excluded |
| `savings_deposit` | −amount | — | +amount | unchanged | excluded |
| `savings_withdraw` | +amount | — | −amount | unchanged | excluded |

* `Total money = Σ wallet balances + Σ savings balances` (a savings deposit moves money between the
  two buckets, so nothing is double counted).
* Amounts are **integers in Rupiah** — decimals (`1000,5`), exponents (`1e6`), letters, zero,
  negatives and values above **Rp 1.000.000.000.000** are rejected at parse time *and* re-checked in
  the stores.
* An empty (or zero) opening balance creates **no** `initial` transaction.
* Dates are `YYYY-MM-DD` in **Asia/Jakarta (UTC+7)** and may never be in the future (budget months
  and savings due dates are the only forward-looking values).
* Editing or deleting a row is rejected when a later balance would go negative — e.g. deleting the
  income that funded an expense, even if the wallet is healthy today.
* QRIS is only offered for **expenses** paid from a **bank / e-wallet** wallet.
* Deleting a wallet is allowed only while it has no history besides its own opening balance; the
  same guard applies to savings targets (no movements at all).

`npm run verify` proves these rules, including the "dip and recover" case that a naive
"check today's balance" implementation would let through.

---

## Design system

Full token list, rules and component inventory: [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md).

* Palette and semantic tokens in `src/styles/colors.ts` + `src/styles/theme.ts`, resolved by
  `useTheme()` from the theme setting (`system` follows the OS; **dark is the default**).
  Brand hues are fixed: navy `#1e3a8a`, electric blue `#0ea5e9`.
* **Surfaces are flat.** Cards are borderless planes separated by rhythm and hairline dividers;
  `elevation` is reserved for elements that genuinely float (sheets, FAB, toasts, modals).
* **Type scale**: `hero | money | display | title | subtitle | bodyLarge | body | small | caption | micro`
  (`display`, `heading` and `label` remain as aliases so older screens keep compiling).
  Money always renders through `<Money>` — a small muted `Rp` next to large, tabular digits.
* **Charts are quiet**: no dot on every data point, 2px strokes, gradient fills that fade out,
  ghost tracks for empty days, a touch crosshair readout, and a donut with hairline segment gaps.
* **Motion is restrained and optional**: `src/utils/motion.ts` exposes `usePressScale`, `useCountUp`,
  `useEntrance` and `useTweenStyle`; all of them no-op when the OS reports Reduce Motion.
* **Wallets carry an identity mark**: `WalletMark` renders a banknote / bank-building / tap-to-pay glyph
  on a soft tint tile, so cash, bank and e-wallet wallets are recognisable at a glance. A wallet can
  additionally carry an optional provider (`brand`: BCA, Mandiri, BNI, BRI, BSI, CIMB, GoPay, OVO, DANA,
  ShopeePay) which renders a monogram tile in that brand's colour — no third-party logo assets shipped
  (preview: `docs/wallet-marks.svg`).
* **The transaction form has no dropdowns**: three type tabs (income / expense / transfer), an amount field
  with a live balance that follows the money's direction, a tile grid of categories, wallet chips carrying
  the Dompet marks (plus an inline "new wallet" chip), and one compact date/method row
  (preview: `docs/transaction-form.svg`).
* **Cloud is optional and fails quietly**: with no `EXPO_PUBLIC_SUPABASE_*` variables the app is
  fully offline; Settings → Cloud shows why it is unconfigured, and a "Uji koneksi" action verifies
  a real project (`docs/SUPABASE-SETUP.md` includes the schema + RLS to copy).
* **Savings deposits/withdrawals live on the Savings screen**, not in the add-transaction form: they move
  money between a wallet and a goal without changing total money, and they need the goal's progress in view.
* **One month is a composition, not a trend**: the dashboard shows a donut ("Tren 1 bulan") of this
  month's category mix with an expense/income toggle; the Reports screen keeps the 6-month area chart
  where a movement over time is actually what you want to see.
* **Transactions read as a ledger**: rows are grouped by day with a subtotal header, and the screen
  pins a filtered in/out/net summary above the list.
* Bilingual copy (`id` / `en`) lives in `src/utils/constants.ts`; `useT()` returns `t('key')` bound
  to the selected language. Both dictionaries are type-checked against the same key union.
* Charts are hand-rolled on `react-native-svg` (area/donut/bars) — no unmaintained chart library,
  theme-aware, responsive via `onLayout`.
* Micro-interactions: haptic feedback on buttons/tabs/FAB, animated progress bars, bottom sheets
  and toasts, pull-to-refresh on dashboard/transactions/wallets/savings/budget, long-press context
  menus.

---

## Backup, restore and reports

* **Export monthly report** (`Reports → Export JSON`) writes exactly the spec contract:
  `exportDate · month · summary{income,expense,net} · dailyCashFlow[] · categoryBreakdown[] · transactions[]`.
  `dailyCashFlow` entries carry `date`, `amount` (net for the day) plus `income`/`expense` for convenience.
* **Export everything** (`Settings → Export all data`) produces a `smartspend-backup-YYYY-MM-DD.json`
  containing transactions, wallets, savings targets, budgets and settings.
* **Import** validates the file, drops malformed rows (reporting them as warnings) and asks whether
  to **merge** (incoming rows win on id collisions; budgets dedupe by category+month) or **replace**
  (the incoming ledger is validated before anything is deleted).
* On device the JSON goes through the OS share sheet (`expo-sharing`); on web it downloads via a Blob.

---

## Optional: Supabase

Offline-first by default — AsyncStorage is the only storage the app needs. To sync to the cloud:

1. `npx expo install @supabase/supabase-js` and add `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
2. Create the tables `users`, `wallets`, `transactions`, `savings_targets`, `budgets`, `settings`
   mirroring `src/types/index.ts` (all money as `bigint`, dates as `date`, `month_year` as `text`).
3. Implement the same function names as `src/services/storage.service.ts`
   (`readCollection` / `writeCollection` / session helpers) against Supabase, then swap the import in
   the stores — the ledger validator is transport-agnostic and runs server-side unchanged.
4. Telegram notifications: set `EXPO_PUBLIC_TELEGRAM_BOT_TOKEN`, then use the chat ID in
   *Settings → Telegram* (the test button reports `skipped` while no token is configured).

---

## Deviations from the original spec (and why)

| Spec | Implementation | Why |
| --- | --- | --- |
| `expo ^51`, RN 0.74, `expo-router ^3.5`, `react-native-svg-charts`, `nativewind ^2` | **Expo SDK 57** (RN 0.86, React 19, expo-router 57, `react-native-svg` 15.15) with `StyleSheet`-based theming | The spec's Tech Stack says "Expo (React Native latest)" while the pinned versions are from 2024 and are not installable together today; `react-native-svg-charts` is unmaintained (last release 2019) so the three charts were written directly on `react-native-svg`. React Native `StyleSheet` + theme tokens replaces NativeWind while keeping the design system centralised. |
| "Bottom tab navigation (5 tabs: … settings)" | 6 tabs, matching the specified `app/(tabs)` folder structure | The folder list includes `settings.tsx`, so it ships as a tab. |
| Budget screens not listed as routes | `app/budget/index.tsx` + entry points from the dashboard and reports | Six tabs were already used; budgets get a dedicated stack screen. |
| `export.service.ts` | Split into pure `export.service.ts` + platform `file.service.ts` | Keeps the export/import rules unit-testable on Node (no native module needed to test them). |
| Category list (6 expense keys) | The 6 specified expense keys **plus** income keys (`salary`, `bonus`, `business`, `gift`, `investment`) and system keys (`transfer`, `savings`, `initial`) | Income entries need meaningful categories; the ledger/report math still only counts the specified expense keys as spending. |
| Wallet delete "only if no transaction history" | The wallet's own auto-generated `initial` row does not block deletion (it is removed with the wallet); any other row blocks it | Otherwise a wallet created with an opening balance could never be deleted. |
| `validateLedger(transactions)` | `validateLedger(transactions, wallets, targets)` | Balances and references can only be checked with the entities in hand. |

See `docs/SPEC-COMPLIANCE.md` for the full requirement-by-requirement traceability table.

---

## Troubleshooting

* **Expo Go version mismatch** — install the latest Expo Go, or run `npm run prebuild` and build a
  development client (`eas build --profile development --platform android`).
* **Metro cache after dependency changes** — `npx expo start -c`.
* **Import finds nothing** — pick a file exported from this app (`app: "smartspend"`), JSON only.
* **Charts look empty** — they render from the ledger; add a transaction (or switch the report month
  with the arrows) so there is something to plot.

MIT licensed — see `LICENSE`.
