/**
 * SmartSpend verification suite — runs the pure logic layer on Node.
 *
 *   npm run verify
 *
 * Covers: amount parsing, date handling, ledger math, historical balance
 * validation, budgets, savings progress, report building and backup
 * import/export round-trips. No device or React Native runtime needed.
 */
import {
  calculateBudgetUsage,
  calculateCategoryBreakdown,
  calculateDailyCashFlow,
  calculateMonthlySummary,
  calculateMonthlyTrend,
  calculateTargetProgress,
  calculateTotalMoney,
  savingsBalance,
  sortNewestFirst,
  walletBalance,
  walletBalanceMap,
} from '../src/utils/calculations';
import { isValidISODate, isFutureDate, todayISO, trailingMonths, addDaysISO, daysUntil, monthYearOf } from '../src/utils/date';
import {
  amountToneOf,
  directionOf,
  extractDigits,
  formatCurrency,
  formatCompactCurrency,
  formatSignedCurrency,
  groupDigits,
  parseAmountInput,
} from '../src/utils/formatting';
import { validateLedger } from '../src/services/ledger.service';
import { buildBackupPayload, buildMonthlyReport, mergeById, validateBackupPayload } from '../src/services/export.service';
import { validateBudgetInput, validateTransactionInput, validateWalletInput } from '../src/utils/validation';
import { translate } from '../src/utils/constants';
import {
  healthUrlFor,
  isSupabaseConfigured,
  maskAnonKey,
  normalizedBaseUrl,
  parseSupabaseEnv,
  projectRefOf,
} from '../src/utils/supabaseConfig';
import {
  __setStorageBackendForTests,
  configureStorageBackend,
  createMemoryBackend,
  getStorageStatus,
  loadSession,
  storage,
  usersStorage,
  type StorageBackend,
} from '../src/services/storage.service';
import { useAuthStore } from '../src/store/authStore';
import { useWalletStore } from '../src/store/walletStore';
import { useTransactionStore } from '../src/store/transactionStore';
import { useSavingsStore } from '../src/store/savingsStore';
import { useBudgetStore } from '../src/store/budgetStore';
import { resetSnapshot } from '../src/store/snapshot';
import type { Budget, SavingsTarget, Transaction, Wallet } from '../src/types';

/* -------------------------------------------------------------------------- */
/*                                 Harness                                    */
/* -------------------------------------------------------------------------- */

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed += 1;
    return;
  }
  failed += 1;
  failures.push(`${name}${detail ? ` → ${detail}` : ''}`);
}

function equal(name: string, actual: unknown, expected: unknown): void {
  check(name, JSON.stringify(actual) === JSON.stringify(expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function section(title: string): void {
  console.log(`\n▸ ${title}`);
}

/* -------------------------------------------------------------------------- */
/*                                   Fixtures                                 */
/* -------------------------------------------------------------------------- */

const USER = 'user_1';
const TODAY = todayISO();

const wallets: Wallet[] = [
  { id: 'w_cash', userId: USER, name: 'Cash', type: 'cash', initialBalance: 500_000, createdAt: '2026-01-01' },
  { id: 'w_bank', userId: USER, name: 'BCA', type: 'bank', initialBalance: 5_000_000, createdAt: '2026-01-01' },
  { id: 'w_gopay', userId: USER, name: 'GoPay', type: 'ewallet', initialBalance: 250_000, createdAt: '2026-01-01' },
];

const targets: SavingsTarget[] = [
  { id: 's_emergency', userId: USER, name: 'Emergency', goalAmount: 10_000_000, createdAt: '2026-01-01', updatedAt: '2026-01-01', dueDate: addDaysISO(TODAY, 30) },
];

function txn(partial: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'amount' | 'date'>): Transaction {
  return {
    userId: USER,
    category: partial.type === 'expense' ? 'food' : 'salary',
    description: '',
    createdAt: `${partial.date}T08:00:00.000Z`,
    updatedAt: `${partial.date}T08:00:00.000Z`,
    ...partial,
  } as Transaction;
}

const ledger: Transaction[] = [
  txn({ id: 't_init_cash', type: 'initial', amount: 500_000, date: '2026-08-01', category: 'initial', walletSourceId: 'w_cash' }),
  txn({ id: 't_init_bank', type: 'initial', amount: 5_000_000, date: '2026-08-01', category: 'initial', walletSourceId: 'w_bank' }),
  txn({ id: 't_init_gopay', type: 'initial', amount: 250_000, date: '2026-08-01', category: 'initial', walletSourceId: 'w_gopay' }),
  txn({ id: 't_salary', type: 'income', amount: 7_000_000, date: '2026-08-05', walletSourceId: 'w_bank', category: 'salary', description: 'August salary' }),
  txn({ id: 't_move', type: 'transfer', amount: 1_000_000, date: '2026-08-06', walletSourceId: 'w_bank', walletDestinationId: 'w_cash', category: 'transfer' }),
  txn({ id: 't_groceries', type: 'expense', amount: 750_000, date: '2026-08-07', walletSourceId: 'w_cash', category: 'food', paymentMethod: 'cash' }),
  txn({ id: 't_transport', type: 'expense', amount: 150_000, date: '2026-08-08', walletSourceId: 'w_gopay', category: 'transport', paymentMethod: 'qris' }),
  txn({ id: 't_deposit', type: 'savings_deposit', amount: 2_000_000, date: '2026-08-10', walletSourceId: 'w_bank', savingsTargetId: 's_emergency', category: 'savings' }),
  txn({ id: 't_withdraw', type: 'savings_withdraw', amount: 500_000, date: '2026-08-12', walletSourceId: 'w_cash', savingsTargetId: 's_emergency', category: 'savings' }),
];

const budgets: Budget[] = [
  { id: 'b_food', userId: USER, category: 'food', monthYear: '2026-08', limitAmount: 1_000_000, createdAt: '2026-08-01T00:00:00.000Z' },
  { id: 'b_transport', userId: USER, category: 'transport', monthYear: '2026-08', limitAmount: 100_000, createdAt: '2026-08-01T00:00:00.000Z' },
];

/* -------------------------------------------------------------------------- */
/*                              1. Amount parsing                             */
/* -------------------------------------------------------------------------- */

section('Amount parsing (strict integer Rupiah)');
equal('plain digits', parseAmountInput('1250000').value, 1_250_000);
equal('dot grouping', parseAmountInput('1.250.000').value, 1_250_000);
equal('comma grouping', parseAmountInput('1,000').value, 1_000);
equal('currency prefix + spaces', parseAmountInput('Rp 1 500 000').value, 1_500_000);
equal('leading zeros', parseAmountInput('000900').value, 900);
check('decimal rejected', parseAmountInput('1000,5').error === 'amount_not_integer');
check('english decimal rejected', parseAmountInput('1.5').error === 'amount_not_integer');
check('scientific notation rejected', parseAmountInput('1e6').error === 'amount_invalid_characters');
check('letters rejected', parseAmountInput('12a3').error === 'amount_invalid_characters');
check('negative rejected', parseAmountInput('-5000').error === 'amount_not_positive');
check('zero rejected', parseAmountInput('0').error === 'amount_not_positive');
check('empty rejected', parseAmountInput('').error === 'amount_required');
check('one trillion accepted', parseAmountInput('1000000000000').ok);
check('above one trillion rejected', parseAmountInput('1000000000001').error === 'amount_too_large');
equal('digit extraction', extractDigits('12.34a5'), '12345');
equal('digit grouping', groupDigits('1250000'), '1.250.000');
equal('currency formatting', formatCurrency(1_250_000), 'Rp 1.250.000');
equal('signed income', formatSignedCurrency(50_000, 'in'), '+ Rp 50.000');
equal('signed expense', formatSignedCurrency(50_000, 'out'), '− Rp 50.000');
equal('compact id', formatCompactCurrency(1_250_000, 'id'), 'Rp 1,25 jt');
equal('compact en', formatCompactCurrency(1_250_000, 'en'), 'Rp 1.25M');

/* -------------------------------------------------------------------------- */
/*                              2. Date handling                              */
/* -------------------------------------------------------------------------- */

section('Dates (Asia/Jakarta)');
check('valid ISO date', isValidISODate('2026-02-28'));
check('invalid month rejected', !isValidISODate('2026-13-01'));
check('invalid day rejected', !isValidISODate('2026-02-30'));
check('wrong format rejected', !isValidISODate('01-02-2026'));
check('today is not future', !isFutureDate(TODAY));
check('tomorrow is future', isFutureDate(addDaysISO(TODAY, 1)));
equal('day arithmetic', addDaysISO('2026-02-28', 1), '2026-03-01');
equal('trailing months window', trailingMonths('2026-08', 3), ['2026-06', '2026-07', '2026-08']);
equal('days until', daysUntil(addDaysISO(TODAY, 10)), 10);

/* -------------------------------------------------------------------------- */
/*                          3. Ledger math (balances)                         */
/* -------------------------------------------------------------------------- */

section('Ledger math');
equal('wallets + savings total', calculateTotalMoney(ledger, wallets, targets).total, 11_850_000);
equal('cash balance (initial + transfer − expense + withdrawal)', walletBalance(ledger, 'w_cash'), 1_250_000);
equal('bank balance after income/transfer/deposit', walletBalance(ledger, 'w_bank'), 9_000_000);
equal('savings balance (deposit − withdraw)', savingsBalance(ledger, 's_emergency'), 1_500_000);
equal('wallet balance as of a date', walletBalance(ledger, 'w_cash', '2026-08-31'), 1_250_000);
equal('balance before the transfer only counts the opening balance', walletBalance(ledger, 'w_cash', '2026-08-05'), 500_000);

/* Transfers and savings movements must never change the grand total. */
const beforeTransfer = calculateTotalMoney(
  ledger.filter((row) => row.id !== 't_move'),
  wallets,
  targets,
).total;
const afterTransfer = calculateTotalMoney(ledger, wallets, targets).total;
equal('transfer keeps total money constant', afterTransfer, beforeTransfer);

/*
 * A savings deposit shrinks the source wallet and grows the target by the same
 * amount, so total money is untouched. It is an asset move, not spending — this
 * is the invariant that stops a deposit being reported as an expense.
 */
const beforeDeposit = calculateTotalMoney(
  ledger.filter((row) => row.id !== 't_deposit'),
  wallets,
  targets,
).total;
const afterDeposit = calculateTotalMoney(ledger, wallets, targets).total;
equal('savings deposit keeps total money constant', afterDeposit, beforeDeposit);
equal('savings deposit moves exactly its amount', walletBalance(ledger, 'w_bank') + savingsBalance(ledger, 's_emergency'), 9_000_000 + 1_500_000);

/* The same holds in reverse for a withdrawal. */
const beforeWithdraw = calculateTotalMoney(
  ledger.filter((row) => row.id !== 't_withdraw'),
  wallets,
  targets,
).total;
const afterWithdraw = calculateTotalMoney(ledger, wallets, targets).total;
equal('savings withdrawal keeps total money constant', afterWithdraw, beforeWithdraw);

/* The presentation layer must agree: a deposit is never "out"/expense ink. */
equal('deposit direction is neutral', directionOf('savings_deposit'), 'neutral');
equal('withdrawal direction is neutral', directionOf('savings_withdraw'), 'neutral');
equal('income direction is in', directionOf('income'), 'in');
equal('expense direction is out', directionOf('expense'), 'out');
equal('transfer direction is neutral', directionOf('transfer'), 'neutral');
equal('opening balance direction is neutral', directionOf('initial'), 'neutral');
equal('deposit tone is savings', amountToneOf('savings_deposit'), 'savings');
equal('withdrawal tone is savings', amountToneOf('savings_withdraw'), 'savings');
equal('transfer tone is transfer', amountToneOf('transfer'), 'transfer');

/* -------------------------------------------------------------------------- */
/*                           4. Monthly aggregation                           */
/* -------------------------------------------------------------------------- */

section('Monthly aggregation & reports');
const august = calculateMonthlySummary(ledger, '2026-08');
equal('income excludes transfers', august.income, 7_000_000);
equal('expense excludes savings moves', august.expense, 900_000);
equal('net cash flow', august.net, 6_100_000);
equal('savings in/out tracked separately', [august.savingsIn, august.savingsOut], [2_000_000, 500_000]);
equal('monthly rows counted (all types)', august.transactionCount, 9);

/* Savings activity must not leak into the monthly cash-flow figures. */
equal('savings deposit is not an expense', august.expense, 900_000);
equal('savings withdrawal is not income', august.income, 7_000_000);
equal('net cash flow ignores savings entirely', august.net, august.income - august.expense);

const daily = calculateDailyCashFlow(ledger, '2026-08');
equal('daily rows = days in month', daily.length, 31);
equal('cumulative net at month end', daily[daily.length - 1].cumulativeNet, 6_100_000);
equal('no activity day is zero', daily[0].income + daily[0].expense, 0);

const breakdown = calculateCategoryBreakdown(ledger, '2026-08', 'expense');
equal('category breakdown grouped', breakdown.map((item) => item.category), ['food', 'transport']);
equal('category percentage', Math.round(breakdown[0].percentage), 83);

const trend = calculateMonthlyTrend(ledger, '2026-08', 6);
equal('trend window', trend.length, 6);
equal('trend ends at current month', trend[5].monthYear, '2026-08');
equal('trend drops empty months', trend[0].income + trend[0].expense, 0);

const report = buildMonthlyReport(ledger, '2026-08');
equal('report contract keys', Object.keys(report).sort(), ['categoryBreakdown', 'dailyCashFlow', 'exportDate', 'month', 'summary', 'transactions']);
equal('report summary', report.summary, { income: 7_000_000, expense: 900_000, net: 6_100_000 });
check('report transactions serialisable', JSON.parse(JSON.stringify(report)).summary.income === 7_000_000);

/* -------------------------------------------------------------------------- */
/*                             5. Budget usage                                */
/* -------------------------------------------------------------------------- */

section('Budgets');
const food = calculateBudgetUsage(budgets[0], ledger);
equal('budget used amount', food.used, 750_000);
equal('budget remaining', food.remaining, 250_000);
equal('budget status safe/warning/exceeded', food.status, 'warning');

const transport = calculateBudgetUsage(budgets[1], ledger);
equal('exceeded budget status', transport.status, 'exceeded');
equal('exceeded remaining clamps at 0', transport.remaining, 0);
check('exceeded percentage above 100', transport.percentage === 150);

/* -------------------------------------------------------------------------- */
/*                          6. Savings progress                               */
/* -------------------------------------------------------------------------- */

section('Savings progress');
const progress = calculateTargetProgress(targets[0], ledger, TODAY);
equal('saved amount', progress.saved, 1_500_000);
equal('remaining to goal', progress.remaining, 8_500_000);
equal('percentage', progress.percentage, 15);
check('due date in the future is not overdue', !progress.isOverdue);
check('not complete', !progress.isComplete);

const overfunded = calculateTargetProgress(
  { ...targets[0], goalAmount: 1_000_000 },
  ledger,
  TODAY,
);
check('progress can exceed 100% without breaking', overfunded.percentage === 150 && overfunded.isComplete);
check('ratio capped for rendering happens in the UI', overfunded.ratio > 1);

/* -------------------------------------------------------------------------- */
/*                       7. Ledger validation (headline)                      */
/* -------------------------------------------------------------------------- */

section('Ledger validation');
check('valid ledger accepted', validateLedger(ledger, wallets, targets).valid);

/* Overdrawing a wallet must be rejected... */
const overdraft = [
  ...ledger,
  txn({ id: 't_big', type: 'expense', amount: 99_999_999, date: '2026-08-20', walletSourceId: 'w_gopay', category: 'shopping' }),
];
const overdraftResult = validateLedger(overdraft, wallets, targets);
check('overdraft rejected', !overdraftResult.valid);
check('overdraft reports the wallet', overdraftResult.errors.some((error) => error.code === 'negative_wallet_balance' && error.walletId === 'w_gopay'));

/* ...even when the balance recovers later in the month. */
const dipAndRecover = [
  ...ledger,
  txn({ id: 't_dip', type: 'expense', amount: 1_500_000, date: '2026-08-13', walletSourceId: 'w_cash', category: 'shopping' }),
  txn({ id: 't_topup', type: 'income', amount: 2_000_000, date: '2026-08-25', walletSourceId: 'w_cash', category: 'salary' }),
];
const dipResult = validateLedger(dipAndRecover, wallets, targets);
check('historical dip rejected even if funded later', !dipResult.valid);
check('dip reported on its own date', dipResult.errors.some((error) => error.code === 'negative_wallet_balance' && error.date === '2026-08-13'));

/* Withdrawing more savings than were deposited is rejected. */
const overWithdraw = [
  ...ledger,
  txn({ id: 't_over', type: 'savings_withdraw', amount: 5_000_000, date: '2026-08-15', walletSourceId: 'w_cash', savingsTargetId: 's_emergency', category: 'savings' }),
];
const overWithdrawResult = validateLedger(overWithdraw, wallets, targets);
check('over-withdrawal rejected', !overWithdrawResult.valid);
check('over-withdrawal reports the target', overWithdrawResult.errors.some((error) => error.code === 'negative_savings_balance'));

/* Structural checks. */
const malformed = [
  txn({ id: 't_bad_amount', type: 'expense', amount: 1_000.5, date: '2026-08-01', walletSourceId: 'w_cash' }),
  txn({ id: 't_future', type: 'income', amount: 1_000, date: addDaysISO(TODAY, 3), walletSourceId: 'w_cash' }),
  txn({ id: 't_same_wallet', type: 'transfer', amount: 1_000, date: '2026-08-02', walletSourceId: 'w_cash', walletDestinationId: 'w_cash' }),
  txn({ id: 't_no_source', type: 'expense', amount: 1_000, date: '2026-08-03' }),
];
const malformedResult = validateLedger(malformed, wallets, targets);
check('decimal amount rejected', malformedResult.errors.some((error) => error.code === 'amount_invalid' && error.transactionId === 't_bad_amount'));
check('future date rejected', malformedResult.errors.some((error) => error.code === 'date_future'));
check('same-wallet transfer rejected', malformedResult.errors.some((error) => error.code === 'transfer_same_wallet'));
check('missing source wallet rejected', malformedResult.errors.some((error) => error.code === 'missing_source_wallet'));

/* Deleting an income row that later spending depends on must be rejected. */
const dependentLedger = [
  txn({ id: 'd_init', type: 'initial', amount: 100_000, date: '2026-07-01', category: 'initial', walletSourceId: 'w_cash' }),
  txn({ id: 'd_income', type: 'income', amount: 500_000, date: '2026-07-05', category: 'salary', walletSourceId: 'w_cash' }),
  txn({ id: 'd_spend', type: 'expense', amount: 550_000, date: '2026-07-06', category: 'shopping', walletSourceId: 'w_cash' }),
];
check('dependency ledger is valid as a whole', validateLedger(dependentLedger, wallets, targets).valid);
const withoutIncome = dependentLedger.filter((row) => row.id !== 'd_income');
const withoutIncomeResult = validateLedger(withoutIncome, wallets, targets);
check('deleting an income that funded later spending is rejected', !withoutIncomeResult.valid);
check('rejection names the affected date', withoutIncomeResult.errors.some((error) => error.code === 'negative_wallet_balance' && error.date === '2026-07-06'));
const withoutSpend = dependentLedger.filter((row) => row.id !== 'd_spend');
check('deleting the newest expense is allowed', validateLedger(withoutSpend, wallets, targets).valid);

/* -------------------------------------------------------------------------- */
/*                            8. Input validation                             */
/* -------------------------------------------------------------------------- */

section('Input validation');
const walletValidation = validateWalletInput({ name: 'Cash', type: 'cash' }, { wallets, targets, budgets });
check('duplicate wallet name rejected', walletValidation.errors.name === 'wallet_duplicate');

const cashWalletValidation = validateWalletInput({ name: 'New wallet', type: 'cash', initialBalance: 0 }, { wallets, targets, budgets });
check('empty initial balance is allowed', cashWalletValidation.ok);
check('literal zero initial balance is accepted as "none"', cashWalletValidation.normalized?.initialBalance === null);

const negativeInitial = validateWalletInput({ name: 'Negative', type: 'bank', initialBalance: -5_000 }, { wallets, targets, budgets });
check('negative initial balance rejected', negativeInitial.errors.initialBalance === 'amount_not_positive');

const decimalInitial = validateWalletInput({ name: 'Decimal', type: 'bank', initialBalance: 1500.5 }, { wallets, targets, budgets });
check('decimal initial balance rejected', decimalInitial.errors.initialBalance === 'amount_not_integer');

const bankBrand = validateWalletInput({ name: 'BCA Tabungan', type: 'bank', brand: 'BCA' }, { wallets, targets, budgets });
check('provider accepted for a matching type', bankBrand.ok && bankBrand.normalized?.brand === 'BCA');

const mismatchedBrand = validateWalletInput({ name: 'Wrong', type: 'bank', brand: 'GoPay' }, { wallets, targets, budgets });
check('e-wallet provider on a bank wallet rejected', mismatchedBrand.errors.brand === 'brand_type_mismatch');

const unknownBrand = validateWalletInput(
  { name: 'Unknown', type: 'bank', brand: 'NotABank' as never },
  { wallets, targets, budgets },
);
check('unknown provider rejected', unknownBrand.errors.brand === 'brand_invalid');

const cashBrand = validateWalletInput({ name: 'Cash brand', type: 'cash', brand: 'BCA' }, { wallets, targets, budgets });
check('provider on a cash wallet rejected', cashBrand.errors.brand === 'brand_type_mismatch');

const noBrand = validateWalletInput({ name: 'No brand', type: 'ewallet' }, { wallets, targets, budgets });
check('provider is optional', noBrand.ok && noBrand.normalized?.brand === null);

const qrisCash = validateTransactionInput(
  { type: 'expense', amount: 50_000, date: TODAY, category: 'food', description: '', walletSourceId: 'w_cash', paymentMethod: 'qris' },
  { wallets, targets, budgets },
);
check('QRIS from cash rejected', qrisCash.errors.paymentMethod === 'qris_requires_non_cash_wallet');

const qrisEwallet = validateTransactionInput(
  { type: 'expense', amount: 50_000, date: TODAY, category: 'food', description: '', walletSourceId: 'w_gopay', paymentMethod: 'qris' },
  { wallets, targets, budgets },
);
check('QRIS from e-wallet accepted', qrisEwallet.ok);

const transferMissing = validateTransactionInput(
  { type: 'transfer', amount: 50_000, date: TODAY, category: 'transfer', description: '', walletSourceId: 'w_cash' },
  { wallets, targets, budgets },
);
check('transfer without destination rejected', transferMissing.errors.walletDestinationId === 'destination_required');

const futureTransaction = validateTransactionInput(
  { type: 'expense', amount: 50_000, date: addDaysISO(TODAY, 1), category: 'food', description: '', walletSourceId: 'w_cash' },
  { wallets, targets, budgets },
);
check('future transaction date rejected', futureTransaction.errors.date === 'date_future');

const transferredCategory = validateTransactionInput(
  { type: 'income', amount: 50_000, date: TODAY, category: 'food', description: '', walletSourceId: 'w_cash' },
  { wallets, targets, budgets },
);
check('expense category on income rejected', transferredCategory.errors.category === 'category_invalid');

const budgetDuplicate = validateBudgetInput(
  { category: 'food', monthYear: '2026-08', limitAmount: 500_000 },
  { wallets, targets, budgets },
);
check('duplicate budget rejected', budgetDuplicate.errors.category === 'budget_duplicate');

const budgetZero = validateBudgetInput(
  { category: 'health', monthYear: '2026-08', limitAmount: 0 },
  { wallets, targets, budgets },
);
check('zero budget limit rejected', budgetZero.errors.limitAmount === 'limit_not_positive');

/* -------------------------------------------------------------------------- */
/*                         9. Export / import round trip                      */
/* -------------------------------------------------------------------------- */

section('Backup export & import');
const backup = buildBackupPayload({
  user: { id: USER, email: 'demo@smartspend.app', name: 'Demo', createdAt: '2026-01-01' },
  wallets,
  transactions: ledger,
  targets,
  budgets,
  settings: { userId: USER, theme: 'dark', currency: 'IDR', language: 'id', telegramEnabled: false },
});

const roundTrip = validateBackupPayload(JSON.parse(JSON.stringify(backup)));
check('backup passes its own validator', roundTrip.ok && roundTrip.payload !== undefined);
equal('wallets survive the round trip', roundTrip.payload?.wallets.length, wallets.length);
equal('transactions survive the round trip', roundTrip.payload?.transactions.length, ledger.length);
equal('budgets survive the round trip', roundTrip.payload?.budgets.length, budgets.length);
equal('savings targets survive the round trip', roundTrip.payload?.savingsTargets.length, targets.length);

check('garbage rejected', !validateBackupPayload({ hello: 'world' }).ok);
check('broken JSON rejected', !validateBackupPayload('{ not json').ok);

const dirtyImport = validateBackupPayload({
  app: 'smartspend',
  version: 1,
  user: { id: USER, email: 'demo@smartspend.app', name: 'Demo', createdAt: '2026-01-01' },
  wallets,
  transactions: [...ledger, { id: 't_broken', type: 'expense', amount: -5, date: 'nope', userId: USER }],
  savingsTargets: targets,
  budgets,
  settings: { theme: 'dark', language: 'id' },
});
check('malformed rows are skipped, not fatal', dirtyImport.ok && dirtyImport.payload?.transactions.length === ledger.length);
check('skipped rows are warned about', dirtyImport.warnings.length > 0);

const merged = mergeById(wallets.slice(0, 1), wallets.slice(1));
equal('merge keeps both sides', merged.length, wallets.length);
const mergedOverlap = mergeById(wallets, [{ ...wallets[0], name: 'Renamed' }]);
equal('merge lets incoming win', mergedOverlap.length, wallets.length);
equal('merge applies incoming value', mergedOverlap.find((wallet) => wallet.id === 'w_cash')?.name, 'Renamed');

/* -------------------------------------------------------------------------- */
/*                                10. Sorting                                 */
/* -------------------------------------------------------------------------- */

section('Sorting & helpers');
const sorted = sortNewestFirst(ledger);
equal('newest first', sorted[0].date, '2026-08-12');
equal('oldest last', sorted[sorted.length - 1].date, '2026-08-01');

/* -------------------------------------------------------------------------- */
/*                                11. i18n                                   */
/* -------------------------------------------------------------------------- */

section('Localisation');
check('id copy present', translate('nav.home', 'id') === 'Beranda');
check('en copy present', translate('nav.home', 'en') === 'Home');
check('every error code has copy', ['amount_not_integer', 'qris_requires_non_cash_wallet', 'target_duplicate'].every((code) => translate(`error.${code}` as never, 'en') !== `error.${code}`));

/* -------------------------------------------------------------------------- */
/*           12. Storage fallback + auth flow (blocked localStorage)          */
/* -------------------------------------------------------------------------- */

/** Runs after the synchronous checks (top-level await is unavailable in CJS). */
async function runAsyncChecks(): Promise<void> {

  section('Storage fallback & auth flow');

  /* Simulate the in-app preview: a sandboxed frame where touching
     window.localStorage throws a SecurityError. */
  __setStorageBackendForTests(createMemoryBackend(), { mode: 'memory', reason: 'storage_blocked' });
  equal('storage reports the memory fallback', getStorageStatus().mode, 'memory');
  equal('fallback reason is surfaced to the UI', getStorageStatus().reason, 'storage_blocked');

  const auth = useAuthStore.getState();

  const shortPassword = await auth.register('blocked@smartspend.app', '123', 'Blocked User');
  check('register rejects a short password', !shortPassword.ok && Boolean(shortPassword.error));

  const registered = await auth.register('Blocked@SmartSpend.app', 'secret123', 'Budi Santoso');
  check('register succeeds even with blocked localStorage', registered.ok);
  equal('registered email is normalised', registered.ok ? registered.data.email : '', 'blocked@smartspend.app');
  equal('auth state holds the new user', useAuthStore.getState().user?.name, 'Budi Santoso');

  const savedCredentials = await usersStorage.loadCredentials();
  equal('credentials were persisted to the backend', savedCredentials.length, 1);
  check('no plaintext password is stored', !JSON.stringify(savedCredentials).includes('secret123'));
  equal('session was written', (await loadSession()) !== null, true);

  const duplicate = await auth.register('blocked@smartspend.app', 'another123', 'Someone Else');
  check('duplicate email rejected', !duplicate.ok);

  await auth.logout();
  equal('logout clears the session', await loadSession(), null);
  equal('logout clears the in-memory user', useAuthStore.getState().user, null);

  const wrongPassword = await auth.login('blocked@smartspend.app', 'nope-wrong');
  check('login with a wrong password fails', !wrongPassword.ok && Boolean(wrongPassword.error));

  const loggedIn = await auth.login('blocked@smartspend.app', 'secret123');
  check('login with the correct password succeeds', loggedIn.ok);
  equal('login restores the account', useAuthStore.getState().user?.email, 'blocked@smartspend.app');

  /* Session survives a reload of the JS state (hydrate reads it back). */
  await auth.logout();
  await auth.login('blocked@smartspend.app', 'secret123');
  useAuthStore.setState({ user: null, hydrated: false });
  await useAuthStore.getState().hydrate();
  equal('hydrate restores the user from the stored session', useAuthStore.getState().user?.email, 'blocked@smartspend.app');
  check('hydrate reports completion', useAuthStore.getState().hydrated);

  /* A backend that starts failing mid-session must degrade, not lose the action. */
  let writes = 0;
  const flakyBase = createMemoryBackend();
  const flakyBackend: StorageBackend = {
    ...flakyBase,
    async setItem(key, value) {
      writes += 1;
      if (writes > 2) throw new Error('QuotaExceededError: storage is full');
      return flakyBase.setItem(key, value);
    },
  };
  configureStorageBackend(flakyBackend, { mode: 'persistent', reason: null });
  await storage.writeJSON('@smartspend/flaky', { ok: true });
  await storage.writeJSON('@smartspend/flaky', { ok: true });
  await storage.writeJSON('@smartspend/flaky', { ok: true });
  equal('a failing persistent write degrades to memory', getStorageStatus().mode, 'memory');
  equal('degradation reason is reported', getStorageStatus().reason, 'write_failed');
  equal('the write still lands (in memory)', await storage.readJSON('@smartspend/flaky', null), { ok: true });

  /* Restore a clean persistent-ish backend for any later sections. */
  configureStorageBackend(createMemoryBackend(), { mode: 'memory', reason: 'not_initialised' });

}

/* -------------------------------------------------------------------------- */
/*       13. Store integration — balances shown on screen update instantly     */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                          10. Supabase configuration                        */
/* -------------------------------------------------------------------------- */

section('Supabase configuration (optional cloud layer)');

const VALID_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdefghijklmnop';

equal('empty env is not configured', parseSupabaseEnv({}), { configured: false, reason: 'missing_url' });
equal('url without anon key', parseSupabaseEnv({ url: 'https://abcd.supabase.co' }), {
  configured: false,
  reason: 'missing_key',
});
equal('placeholder url is rejected', parseSupabaseEnv({ url: 'https://<project-ref>.supabase.co', anonKey: VALID_KEY }), {
  configured: false,
  reason: 'missing_url',
});
equal('garbage url is rejected', parseSupabaseEnv({ url: 'not-a-url', anonKey: VALID_KEY }), {
  configured: false,
  reason: 'invalid_url',
});
equal('plain http is rejected', parseSupabaseEnv({ url: 'http://abcd.supabase.co', anonKey: VALID_KEY }), {
  configured: false,
  reason: 'invalid_url',
});
equal('REST path instead of project root is rejected', parseSupabaseEnv({ url: 'https://abcd.supabase.co/rest/v1', anonKey: VALID_KEY }), {
  configured: false,
  reason: 'invalid_url',
});

const parsedSupabase = parseSupabaseEnv({ url: 'https://abcd.supabase.co/', anonKey: VALID_KEY });
check('valid env is configured', parsedSupabase.configured);
equal(
  'project ref + normalised url + masked key',
  parsedSupabase.configured ? [parsedSupabase.projectRef, parsedSupabase.url, parsedSupabase.maskedKey] : [],
  ['abcd', 'https://abcd.supabase.co', `${VALID_KEY.slice(0, 6)}…${VALID_KEY.slice(-4)}`],
);
equal('project ref from a plain project url', projectRefOf('https://efgh.supabase.co'), 'efgh');
equal('custom domain falls back to the host', projectRefOf('https://api.myapp.dev'), 'api.myapp.dev');
equal('trailing slashes are stripped', normalizedBaseUrl('https://abcd.supabase.co///'), 'https://abcd.supabase.co');
equal('short keys are never partially shown', maskAnonKey('abc123'), '••••');
equal('health endpoint', healthUrlFor('https://abcd.supabase.co//'), 'https://abcd.supabase.co/auth/v1/health');
check('isSupabaseConfigured(false) for empty env', isSupabaseConfigured({}) === false);
check('isSupabaseConfigured(true) for complete env', isSupabaseConfigured({ url: 'https://abcd.supabase.co', anonKey: VALID_KEY }));

/**
 * Regression suite for the bug where a wallet's opening balance was written to
 * storage but did not reach the transaction store's reactive state (so the UI
 * showed Rp 0 until a manual refresh).
 *
 * Everything here goes through the real stores, exactly like the forms do.
 */
async function runStoreChecks(): Promise<void> {
  section('Store integration (UI-visible balances)');

  configureStorageBackend(createMemoryBackend(), { mode: 'memory', reason: 'storage_blocked' });
  resetSnapshot();
  useWalletStore.setState({ wallets: [], userId: null, hydrated: false });
  useTransactionStore.setState({ transactions: [], userId: null, hydrated: false });
  useSavingsStore.setState({ targets: [], userId: null, hydrated: false });
  useBudgetStore.setState({ budgets: [], userId: null, hydrated: false });
  useAuthStore.setState({ user: null, hydrated: false });

  await useAuthStore.getState().register('store@smartspend.app', 'secret123', 'Store Tester');
  const brandedWallet = await useWalletStore
    .getState()
    .addWallet({ name: 'GoPay', type: 'ewallet', brand: 'GoPay', initialBalance: 25_000 });
  check(
    'provider persists on the wallet',
    brandedWallet.ok && useWalletStore.getState().wallets.find((w) => w.name === 'GoPay')?.brand === 'GoPay',
  );
  const badBrand = await useWalletStore
    .getState()
    .addWallet({ name: 'Salah Provider', type: 'bank', brand: 'GoPay' });
  check('provider/type mismatch rejected by the store', !badBrand.ok);
  const storeUser = useAuthStore.getState().user;
  check('store test account created', storeUser !== null);
  const userId = storeUser?.id ?? '';

  await useWalletStore.getState().hydrate(userId);
  await useTransactionStore.getState().hydrate(userId);
  await useSavingsStore.getState().hydrate(userId);
  await useBudgetStore.getState().hydrate(userId);

  /** Exactly what the screens read: ledger store + wallet store. */
  const ledger = () => useTransactionStore.getState().transactions;
  const wallets = () => useWalletStore.getState().wallets;
  const uiBalances = () => walletBalanceMap(ledger(), wallets());

  /* 1 — opening balance must show up immediately (THE regression). */
  const bank = await useWalletStore.getState().addWallet({ name: 'BCA', type: 'bank', initialBalance: 5_000_000 });
  check('addWallet with an opening balance succeeds', bank.ok);
  const bankId = wallets()[0]?.id ?? '';
  equal('opening balance row reaches the ledger store', ledger().length, 1);
  equal('UI balance straight after creating the wallet', uiBalances()[bankId], 5_000_000);

  /* 2 — no opening balance means no ledger row. */
  await useWalletStore.getState().addWallet({ name: 'Cash', type: 'cash' });
  equal('empty opening balance creates no ledger row', ledger().length, 1);
  const cashId = wallets().find((item) => item.name === 'Cash')?.id ?? '';
  equal('empty wallet starts at zero', uiBalances()[cashId], 0);

  /* 3 — editing the opening balance is reflected both ways. */
  await useWalletStore.getState().editWallet(bankId, { name: 'BCA', type: 'bank', initialBalance: 7_500_000 });
  equal('raising the opening balance updates the UI', uiBalances()[bankId], 7_500_000);
  await useWalletStore.getState().editWallet(bankId, { name: 'BCA', type: 'bank' });
  equal('clearing the opening balance removes the ledger row', ledger().length, 0);
  await useWalletStore.getState().editWallet(bankId, { name: 'BCA', type: 'bank', initialBalance: 5_000_000 });
  equal('restoring the opening balance works', uiBalances()[bankId], 5_000_000);

  /* 4 — day-to-day transactions. */
  const expense = await useTransactionStore.getState().addTransaction({
    type: 'expense', amount: 1_500_000, date: TODAY, category: 'food', description: 'Groceries',
    walletSourceId: bankId, paymentMethod: 'transfer',
  });
  check('expense accepted', expense.ok);
  equal('expense reduces the on-screen balance', uiBalances()[bankId], 3_500_000);

  await useTransactionStore.getState().addTransaction({
    type: 'income', amount: 2_000_000, date: TODAY, category: 'salary', description: 'Bonus',
    walletSourceId: bankId,
  });
  equal('income increases the on-screen balance', uiBalances()[bankId], 5_500_000);

  const overdraw = await useTransactionStore.getState().addTransaction({
    type: 'expense', amount: 99_000_000, date: TODAY, category: 'shopping', description: '',
    walletSourceId: bankId,
  });
  check('overdrawing expense rejected', !overdraw.ok);
  equal('rejected write leaves balances untouched', uiBalances()[bankId], 5_500_000);

  const transfer = await useTransactionStore.getState().addTransaction({
    type: 'transfer', amount: 1_000_000, date: TODAY, category: 'transfer', description: '',
    walletSourceId: bankId, walletDestinationId: cashId,
  });
  check('transfer accepted', transfer.ok);
  equal('transfer debits the source wallet', uiBalances()[bankId], 4_500_000);
  equal('transfer credits the destination wallet', uiBalances()[cashId], 1_000_000);

  /* 5 — savings movements keep the grand total identical. */
  const target = await useSavingsStore.getState().addTarget({ name: 'Emergency', goalAmount: 10_000_000 });
  check('savings target created', target.ok);
  const targetId = useSavingsStore.getState().targets[0]?.id ?? '';

  const deposit = await useSavingsStore.getState().depositToTarget({ targetId, amount: 2_000_000, walletId: bankId });
  check('savings deposit accepted', deposit.ok);
  equal('deposit debits the wallet', uiBalances()[bankId], 2_500_000);
  equal('deposit credits savings', savingsBalance(ledger(), targetId), 2_000_000);

  const totalBeforeWithdrawal = calculateTotalMoney(ledger(), wallets(), useSavingsStore.getState().targets).total;
  const withdrawal = await useSavingsStore.getState().withdrawFromTarget({ targetId, amount: 500_000, walletId: cashId });
  check('savings withdrawal accepted', withdrawal.ok);
  equal('withdrawal credits the wallet', uiBalances()[cashId], 1_500_000);
  equal('withdrawal debits savings', savingsBalance(ledger(), targetId), 1_500_000);
  equal(
    'total money unchanged by savings movements',
    calculateTotalMoney(ledger(), wallets(), useSavingsStore.getState().targets).total,
    totalBeforeWithdrawal,
  );

  const overWithdrawal = await useSavingsStore.getState().withdrawFromTarget({ targetId, amount: 9_000_000, walletId: cashId });
  check('over-withdrawal rejected', !overWithdrawal.ok);

  /* 6 — budgets follow the ledger of the same month. */
  const budget = await useBudgetStore.getState().addBudget({
    category: 'food', monthYear: monthYearOf(TODAY), limitAmount: 1_000_000,
  });
  check('budget created', budget.ok);
  const usage = useBudgetStore.getState().getBudgetUsage('food', monthYearOf(TODAY));
  equal('budget usage tracks the expense', usage?.used, 1_500_000);
  equal('budget status flips to exceeded', usage?.status, 'exceeded');

  /* 7 — deletion rules. */
  const blockedDelete = await useWalletStore.getState().deleteWallet(bankId);
  check('wallet with real history cannot be deleted', !blockedDelete.ok);

  await useWalletStore.getState().addWallet({ name: 'Temp', type: 'cash' });
  const tempId = wallets().find((item) => item.name === 'Temp')?.id ?? '';
  const rowsBefore = ledger().length;
  const removed = await useWalletStore.getState().deleteWallet(tempId);
  check('untouched wallet can be deleted', removed.ok);
  equal('deleting an empty wallet leaves the ledger intact', ledger().length, rowsBefore);
  equal('deleted wallet disappears from the list', wallets().some((item) => item.id === tempId), false);

  /* 8 — persistence: a fresh hydrate returns the same numbers. */
  const balancesBefore = uiBalances();
  await useWalletStore.getState().hydrate(userId);
  await useTransactionStore.getState().hydrate(userId);
  equal('balances survive a reload from storage', uiBalances(), balancesBefore);
}

/* -------------------------------------------------------------------------- */
/*                                  Summary                                   */
/* -------------------------------------------------------------------------- */

function printSummary(): void {
  console.log(`\n${'─'.repeat(56)}`);
  console.log(`✅ passed: ${passed}`);
  console.log(`❌ failed: ${failed}`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach((failure) => console.log(` · ${failure}`));
  } else {
    console.log('All SmartSpend logic checks passed.');
  }
}

void runAsyncChecks()
  .then(() => runStoreChecks())
  .catch((error: unknown) => {
    failed += 1;
    failures.push(`async checks threw: ${error instanceof Error ? error.message : String(error)}`);
  })
  .then(() => {
    printSummary();
    if (failed > 0) process.exitCode = 1;
  });
