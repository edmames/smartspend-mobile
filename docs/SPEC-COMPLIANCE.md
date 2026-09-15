# Spec compliance — SmartSpend

Requirement-by-requirement traceability from the original build prompt to the code in this repo.
`✅` = implemented as specified, `≈` = implemented with a documented deviation (see README →
"Deviations"), `＋` = addition beyond the spec.

## Tech stack

| Requirement | Status | Where |
| --- | --- | --- |
| Expo (latest) | ✅ SDK 57 | `package.json` |
| TypeScript strict mode, no `any` | ✅ `strict` + `noUnusedLocals` + `noImplicitOverride` | `tsconfig.json`, `npm run typecheck` |
| AsyncStorage local storage | ✅ namespaced keys, corrupt-payload recovery | `src/services/storage.service.ts` |
| Supabase (optional) | ✅ documented swap-in path (no keys required to run) | README → "Optional: Supabase" |
| Expo Router (App Router) | ✅ | `app/**` |
| Zustand state management | ✅ 6 stores + snapshot registry | `src/store/*` |
| Styling | ≈ RN `StyleSheet` + theme tokens (NativeWind v2 pinned in spec is outdated) | `src/styles/*`, `src/components/ui/*` |
| date-fns for dates | ✅ (v4) | `src/utils/date.ts` |
| SVG charts | ≈ hand-rolled area/pie/bar on `react-native-svg` (`react-native-svg-charts` unmaintained) | `src/components/charts/*` |

## Folder structure

| Spec path | Status | Notes |
| --- | --- | --- |
| `app/(auth)/_layout.tsx, login.tsx, register.tsx` | ✅ | |
| `app/(tabs)/_layout.tsx + 6 screens` | ✅ | dashboard, transactions, wallets, savings, reports, settings |
| `app/_layout.tsx` | ✅ | providers, theme, toasts, splash, auth gate |
| `src/components/ui/*` | ✅ | Card, Button, Input, Select, Modal, BottomSheet + ProgressBar, Chip/Badge, Toast, ConfirmDialog, AmountInput, DateField, MonthNavigator, SegmentedControl, SettingRow, StatTile, FAB, EmptyState, AppText, Icon ＋ Money, Skeleton, WalletMark, StorageNotice |
| `src/components/forms/*` | ✅ | TransactionForm, WalletForm, BudgetForm, SavingsForm ＋ SavingsMovementForm |
| `src/components/charts/*` | ✅ | AreaChart, PieChart, BarChart |
| `src/hooks/*` | ✅ | useTransactions, useWallets, useBudgets, useSavings, useAuth, useStorage ＋ useTheme/useT, useRefreshAll |
| `src/services/*` | ✅ | storage.service, ledger.service, export.service ＋ file.service |
| `src/store/*` | ✅ | auth, transaction, wallet, budget, savings, settings ＋ snapshot |
| `src/types/index.ts` | ✅ | all interfaces + result/error unions |
| Categories ＋ | ✅ `vacation` (Liburan), `education` (Pendidikan) | additive expense categories requested by the user; they also appear in reports and monthly budgets (budgets are derived from the expense category list). |
| Wallet model ＋ | ✅ `Wallet.brand?` | additive, optional provider mark (`WalletBrand`) for bank/e-wallet wallets; validated against the wallet type, tolerated as absent in older backups. Requested by the user (wallet-type elements had to look like identity marks, not coloured text). |
| `src/utils/*` | ✅ | validation, formatting, calculations, constants (incl. i18n), date, haptics |
| `src/styles/*` | ✅ | colors.ts, theme.ts |
| `app.json`, `package.json`, `tsconfig.json`, `eas.json` | ✅ | `eas.json` with development/preview/production profiles |

## Data types

All spec interfaces are implemented verbatim (plus `CategoryKey`, `PaymentMethod`, filter/result
types): `User`, `StoredCredential`, `AuthSession`, `Wallet`, `Transaction`, `SavingsTarget`,
`Budget`, `Settings`, `TargetProgress`, `BudgetUsage`, `MonthlyReport`, `BackupPayload`.

## Features

| Requirement | Status | Where |
| --- | --- | --- |
| Email + password auth, persisted session | ✅ salted digest, 30-day session, group redirect | `src/store/authStore.ts`, `app/_layout.tsx` |
| No backend for demo mode | ✅ | AsyncStorage only |
| Dashboard: total money = wallets + savings | ✅ single snapshot calculation | `calculateTotalMoney` |
| Dashboard: monthly income/expense/net | ✅ | `calculateMonthlySummary` |
| Dashboard: 6-month area chart | ✅ | `AreaChart` |
| Dashboard: top 3 wallets, 5 recent transactions | ✅ | `app/(tabs)/index.tsx` |
| Dashboard: swipe to refresh | ✅ | `RefreshControl` + `useRefreshAll` |
| Wallets: card list with type icon and balance | ✅ | `WalletCard` |
| Wallets: FAB add, unique name, balance ≥ 0 | ✅ | `validateWalletInput` |
| Wallets: detail, edit name (type immutable) | ✅ type locked in the form and store | `app/wallet/[id].tsx` |
| Wallets: delete only without history | ✅ opening balance excluded from the block | `deleteWallet` |
| Wallets: 10 recent transactions in detail | ✅ | `useWalletDetail` |
| Transactions: filters (type/wallet/category/period) | ✅ filter sheet | `app/(tabs)/transactions.tsx` |
| Transactions: search description/category/amount | ✅ | `searchTransactions` |
| Transactions: infinite scroll 30 per page | ✅ | `TRANSACTION_PAGE_SIZE` |
| Transactions: signed colours + category icon | ✅ | `TransactionRow`, `AmountText` |
| Transactions: add/edit/delete with confirmation | ✅ | `TransactionForm`, `ConfirmDialog` |
| Transactions: future dates rejected | ✅ | `isFutureDate` in parsing + validation + ledger |
| Transactions: historical balance validation | ✅ on add, edit **and** delete | `validateLedger` |
| Transactions: QRIS ⇒ expense + non-cash wallet | ✅ | `validateTransactionInput` |
| Savings: cards with capped progress bar | ✅ visual cap, real % | `ProgressBar`, `SavingsCard` |
| Savings: create with optional due date | ✅ | `SavingsForm` |
| Savings: deposit / withdraw with wallet selection | ✅ ledger-backed | `SavingsMovementForm` |
| Savings: edit name/goal/due date, delete without history | ✅ | `savingsStore` |
| Savings: movement history | ✅ | `app/savings/[id].tsx` |
| Budget: per category per month, 1:1 enforced | ✅ | `validateBudgetInput` |
| Budget: used/remaining/% with green-orange-red | ✅ | `BudgetCard`, `budgetStatusForRatio` |
| Budget: month picker + arrows | ✅ | `MonthNavigator` |
| Reports: month arrows, default current month | ✅ | `app/(tabs)/reports.tsx` |
| Reports: summary, daily table, top-5 categories, 6-month chart | ✅ | `buildMonthlyReport`, `calculateDailyCashFlow` |
| Reports: export JSON in the specified shape | ✅ | `export.service.ts` |
| Settings: theme light/dark/system (dark default) | ✅ | `settingsStore`, `useTheme` |
| Settings: export/import all data, merge or replace | ✅ validated + warnings | `useStorage.applyBackup` |
| Settings: PWA guide | ✅ step-by-step sheet | `app/(tabs)/settings.tsx` |
| Settings: Telegram chat ID + toggle | ✅ real send when a bot token is configured | `sendTelegramMessage` |
| Settings: delete all data + confirmation | ✅ also deletes the local account on request | `useStorage.deleteAllData` |

## Calculation rules

| Rule | Status | Proof |
| --- | --- | --- |
| Ledger is the only source of truth (no separate balance edits) | ✅ | balances always derived: `walletBalance`, `savingsBalance`, `calculateTotalMoney` |
| Impact table for all six transaction types | ✅ | `walletDelta`, `savingsDelta` + verify checks |
| Total money without double counting | ✅ | deposits/withdrawals move between buckets; verify asserts the total is unchanged across transfers |
| Integer Rupiah, max Rp 1 trillion, reject decimals/exponents/0/negatives/non-finite | ✅ | `parseAmountInput` + `validateAmountValue` + `validateTransactionShape` |
| Empty initial balance ≠ zero transaction | ✅ zero is accepted as "none" and creates no row | `validateWalletInput`, `walletStore.addWallet` |
| `YYYY-MM-DD`, Asia/Jakarta, no future dates (budgets excepted) | ✅ | `jakartaNow`, `todayISO`, `isFutureDate` |
| Historical balance validation on edit/delete | ✅ including the "dip then recover" case | `findNegativeWalletBalances`, verify suite |
| `validateLedger` / `calculateWalletBalance` / `calculateSavingsBalance` / `calculateTotalMoney` | ✅ | `src/services/ledger.service.ts` |

## State management

| Store | Status | API |
| --- | --- | --- |
| `authStore` | ✅ | `user`, `login`, `register`, `logout` (+ `hydrate`, `deleteAccount`) |
| `walletStore` | ✅ | `wallets`, `addWallet`, `editWallet`, `deleteWallet`, `getWalletBalance` |
| `transactionStore` | ✅ | `transactions`, `addTransaction`, `editTransaction`, `deleteTransaction`, `filterTransactions`, `searchTransactions`, filters + paging helpers |
| `budgetStore` | ✅ | `budgets`, `addBudget`, `editBudget`, `deleteBudget`, `getBudgetUsage` |
| `savingsStore` | ✅ | `targets`, `addTarget`, `editTarget`, `deleteTarget`, `depositToTarget`, `withdrawFromTarget`, `getTargetProgress` |
| `settingsStore` | ✅ | `settings`, `updateTheme`, `updateLanguage`, `updateTelegram` |

## Design & interactions

| Requirement | Status |
| --- | --- |
| Navy + Electric Blue palette, dark mode default | ✅ `src/styles/colors.ts` |
| Heading 24–28, body 14–16, small 12–14, bold headings | ✅ `fontSize`/`fontWeight` tokens |
| Bottom tabs, card-based lists, modals, confirmation dialogs, toasts, bottom-sheet category picker | ✅ |
| Pull-to-refresh (dashboard, transactions, wallets, savings, budget) | ✅ |
| Long-press context menus (transactions, wallets, savings, budgets) | ✅ |
| Haptic feedback on important buttons | ✅ `src/utils/haptics.ts` |
| Smooth animations (sheets, dialogs, progress, toast) | ✅ `Animated` |
| Responsive on small/large phones and tablets | ✅ flexible layouts, `maxWidth` dialogs, `adjustsFontSizeToFit` on money figures |
| Offline-first | ✅ nothing in the core flow needs the network |

## Verification

```
npm run typecheck   # 0 errors (strict)
npm run verify      # 110 checks, 0 failures
npx expo export --platform web   # Metro bundle succeeds
```

The suite covers amount parsing edge cases, date math, ledger balances, monthly aggregation, budget
statuses, savings progress, the negative-balance rules (including dip-and-recover and
over-withdrawal), input validation (QRIS, transfers, duplicates, future dates), report shape and
backup round-trips (with merge semantics).

## Open items for a future pass

* Supabase sync + server-side validation (same ledger rules, different transport).
* Optional PDF/CSV report export alongside JSON.
* Biometric app lock and per-account encryption at rest.
* Recurring transactions and shared/家庭 wallets.
