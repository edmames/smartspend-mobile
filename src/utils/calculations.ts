/**
 * Pure ledger arithmetic.
 *
 * The transaction ledger is the ONLY source of truth for balances. Every
 * function here is side-effect free so it can be unit-tested without a device
 * (see `scripts/verify.ts`).
 */
import type {
  Budget,
  BudgetUsage,
  CategoryBreakdownItem,
  DailyCashFlowPoint,
  ID,
  ISODate,
  MonthlySummary,
  MonthlyTrendPoint,
  SavingsTarget,
  TargetProgress,
  TotalMoneySnapshot,
  Transaction,
  TransactionType,
  Wallet,
  YearMonth,
} from '../types';
import {
  budgetStatusForRatio,
  FALLBACK_CATEGORY,
  INITIAL_CATEGORY,
  MAX_AMOUNT,
  MIN_AMOUNT,
  TREND_MONTHS,
} from './constants';
import { daysInMonth, monthYearOf, todayISO, trailingMonths } from './date';

/* -------------------------------------------------------------------------- */
/*                             Ledger primitives                              */
/* -------------------------------------------------------------------------- */

/** Signed effect of a transaction on ONE wallet balance. 0 when unrelated. */
export function walletDelta(transaction: Transaction, walletId: ID): number {
  const isSource = transaction.walletSourceId === walletId;
  const isDestination = transaction.walletDestinationId === walletId;

  switch (transaction.type) {
    case 'initial':
    case 'income':
      return isSource ? transaction.amount : 0;
    case 'expense':
      return isSource ? -transaction.amount : 0;
    case 'transfer':
      if (isSource) return -transaction.amount;
      if (isDestination) return transaction.amount;
      return 0;
    case 'savings_deposit':
      return isSource ? -transaction.amount : 0;
    case 'savings_withdraw':
      // Savings withdrawals credit the receiving wallet (stored as source, or
      // as the destination when both are present for legacy records).
      if (isDestination) return transaction.amount;
      return isSource ? transaction.amount : 0;
    default:
      return 0;
  }
}

/** Signed effect of a transaction on ONE savings target balance. */
export function savingsDelta(transaction: Transaction, targetId: ID): number {
  if (transaction.savingsTargetId !== targetId) return 0;
  if (transaction.type === 'savings_deposit') return transaction.amount;
  if (transaction.type === 'savings_withdraw') return -transaction.amount;
  return 0;
}

/** Every wallet referenced by a transaction (source and/or destination). */
export function walletsInvolved(transaction: Transaction): ID[] {
  const ids: ID[] = [];
  if (transaction.walletSourceId) ids.push(transaction.walletSourceId);
  if (transaction.walletDestinationId && transaction.walletDestinationId !== transaction.walletSourceId) {
    ids.push(transaction.walletDestinationId);
  }
  return ids;
}

export function affectsWallet(transaction: Transaction, walletId: ID): boolean {
  return transaction.walletSourceId === walletId || transaction.walletDestinationId === walletId;
}

export function affectsTarget(transaction: Transaction, targetId: ID): boolean {
  return transaction.savingsTargetId === targetId;
}

export function isSavingsTransaction(type: TransactionType): boolean {
  return type === 'savings_deposit' || type === 'savings_withdraw';
}

/** Ledger entries that count towards a wallet's balance (all of them). */
export function sortChronologically(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
  });
}

/** Newest first — the order used by every list in the app. */
export function sortNewestFirst(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
  });
}

/* -------------------------------------------------------------------------- */
/*                                 Balances                                   */
/* -------------------------------------------------------------------------- */

export function walletBalance(
  transactions: Transaction[],
  walletId: ID,
  date?: ISODate,
): number {
  let total = 0;
  for (const transaction of transactions) {
    if (date && transaction.date > date) continue;
    total += walletDelta(transaction, walletId);
  }
  return total;
}

export function savingsBalance(
  transactions: Transaction[],
  targetId: ID,
  date?: ISODate,
): number {
  let total = 0;
  for (const transaction of transactions) {
    if (date && transaction.date > date) continue;
    total += savingsDelta(transaction, targetId);
  }
  return total;
}

export function calculateTotalMoney(
  transactions: Transaction[],
  wallets: Wallet[],
  targets: SavingsTarget[],
  date?: ISODate,
): TotalMoneySnapshot {
  const walletBalances = wallets.map((wallet) => ({
    walletId: wallet.id,
    balance: walletBalance(transactions, wallet.id, date),
  }));
  const savingsBalances = targets.map((target) => ({
    walletId: target.id,
    balance: savingsBalance(transactions, target.id, date),
  }));

  const walletsTotal = walletBalances.reduce((sum, item) => sum + item.balance, 0);
  const savingsTotal = savingsBalances.reduce((sum, item) => sum + item.balance, 0);

  return {
    walletsTotal,
    savingsTotal,
    total: walletsTotal + savingsTotal,
    walletBalances,
    savingsBalances,
  };
}

export function walletBalanceMap(
  transactions: Transaction[],
  wallets: Wallet[],
  date?: ISODate,
): Record<ID, number> {
  const map: Record<ID, number> = {};
  for (const wallet of wallets) map[wallet.id] = 0;
  for (const transaction of transactions) {
    if (date && transaction.date > date) continue;
    for (const walletId of walletsInvolved(transaction)) {
      if (map[walletId] === undefined) continue;
      map[walletId] += walletDelta(transaction, walletId);
    }
  }
  return map;
}

/** Running balance of a wallet after each day, used by the ledger validator. */
export function walletBalanceTimeline(
  transactions: Transaction[],
  walletId: ID,
): { date: ISODate; balance: number }[] {
  const chronological = sortChronologically(transactions);
  const timeline: { date: ISODate; balance: number }[] = [];
  let balance = 0;
  for (const transaction of chronological) {
    const delta = walletDelta(transaction, walletId);
    if (delta === 0) continue;
    balance += delta;
    timeline.push({ date: transaction.date, balance });
  }
  return timeline;
}

/* -------------------------------------------------------------------------- */
/*                             Monthly aggregation                            */
/* -------------------------------------------------------------------------- */

export function transactionsInMonth(
  transactions: Transaction[],
  monthYear: YearMonth,
): Transaction[] {
  return transactions.filter((transaction) => monthYearOf(transaction.date) === monthYear);
}

export function calculateMonthlySummary(
  transactions: Transaction[],
  monthYear: YearMonth,
): MonthlySummary {
  let income = 0;
  let expense = 0;
  let savingsIn = 0;
  let savingsOut = 0;
  let count = 0;

  for (const transaction of transactions) {
    if (monthYearOf(transaction.date) !== monthYear) continue;
    count += 1;
    switch (transaction.type) {
      case 'income':
        income += transaction.amount;
        break;
      case 'expense':
        expense += transaction.amount;
        break;
      case 'savings_deposit':
        savingsIn += transaction.amount;
        break;
      case 'savings_withdraw':
        savingsOut += transaction.amount;
        break;
      default:
        // `initial`, `transfer` never affect the monthly report (spec table).
        break;
    }
  }

  return { monthYear, income, expense, net: income - expense, savingsIn, savingsOut, transactionCount: count };
}

/** Net cash flow per month for the trailing `months` months. */
export function calculateMonthlyTrend(
  transactions: Transaction[],
  endMonthYear: YearMonth,
  months: number = TREND_MONTHS,
): MonthlyTrendPoint[] {
  const monthsList = trailingMonths(endMonthYear, months);
  const buckets = new Map<YearMonth, { income: number; expense: number }>();
  for (const monthYear of monthsList) buckets.set(monthYear, { income: 0, expense: 0 });

  for (const transaction of transactions) {
    const monthYear = monthYearOf(transaction.date);
    const bucket = buckets.get(monthYear);
    if (!bucket) continue;
    if (transaction.type === 'income') bucket.income += transaction.amount;
    else if (transaction.type === 'expense') bucket.expense += transaction.amount;
  }

  return monthsList.map((monthYear) => {
    const bucket = buckets.get(monthYear) ?? { income: 0, expense: 0 };
    return {
      monthYear,
      income: bucket.income,
      expense: bucket.expense,
      net: bucket.income - bucket.expense,
    };
  });
}

/**
 * Day-by-day cash flow for a month (income / expense / net / running total).
 * Days without activity are included with zeros so charts stay continuous.
 */
export function calculateDailyCashFlow(
  transactions: Transaction[],
  monthYear: YearMonth,
): DailyCashFlowPoint[] {
  const days = daysInMonth(monthYear);
  const points: DailyCashFlowPoint[] = [];
  const byDate = new Map<ISODate, { income: number; expense: number }>();

  for (const transaction of transactions) {
    const date = transaction.date;
    if (monthYearOf(date) !== monthYear) continue;
    const bucket = byDate.get(date) ?? { income: 0, expense: 0 };
    if (transaction.type === 'income') bucket.income += transaction.amount;
    else if (transaction.type === 'expense') bucket.expense += transaction.amount;
    byDate.set(date, bucket);
  }

  let cumulative = 0;
  for (let day = 1; day <= days; day += 1) {
    const date = `${monthYear}-${String(day).padStart(2, '0')}`;
    const bucket = byDate.get(date) ?? { income: 0, expense: 0 };
    const net = bucket.income - bucket.expense;
    cumulative += net;
    points.push({ date, income: bucket.income, expense: bucket.expense, net, cumulativeNet: cumulative });
  }

  return points;
}

/** Top spending (or income) categories for a month, descending by amount. */
export function calculateCategoryBreakdown(
  transactions: Transaction[],
  monthYear: YearMonth,
  direction: 'expense' | 'income' = 'expense',
): CategoryBreakdownItem[] {
  const target: TransactionType = direction === 'expense' ? 'expense' : 'income';
  const totals = new Map<string, { amount: number; count: number }>();
  let grandTotal = 0;

  for (const transaction of transactions) {
    if (transaction.type !== target) continue;
    if (monthYearOf(transaction.date) !== monthYear) continue;
    const key = transaction.category || FALLBACK_CATEGORY;
    const bucket = totals.get(key) ?? { amount: 0, count: 0 };
    bucket.amount += transaction.amount;
    bucket.count += 1;
    totals.set(key, bucket);
    grandTotal += transaction.amount;
  }

  return [...totals.entries()]
    .map(([category, bucket]) => ({
      category: category as CategoryBreakdownItem['category'],
      amount: bucket.amount,
      count: bucket.count,
      percentage: grandTotal > 0 ? (bucket.amount / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** Sum of income/expense for arbitrary transaction slices. */
export function sumIncomeExpense(transactions: Transaction[]): { income: number; expense: number; net: number } {
  let income = 0;
  let expense = 0;
  for (const transaction of transactions) {
    if (transaction.type === 'income') income += transaction.amount;
    else if (transaction.type === 'expense') expense += transaction.amount;
  }
  return { income, expense, net: income - expense };
}

/* -------------------------------------------------------------------------- */
/*                            Progress calculators                            */
/* -------------------------------------------------------------------------- */

export function calculateTargetProgress(
  target: SavingsTarget,
  transactions: Transaction[],
  today: ISODate = todayISO(),
): TargetProgress {
  const saved = savingsBalance(transactions, target.id);
  const goal = Math.max(0, target.goalAmount);
  const remaining = Math.max(0, goal - saved);
  const ratio = goal > 0 ? saved / goal : saved > 0 ? 1 : 0;
  const daysLeft = target.dueDate ? Math.round(
    (new Date(`${target.dueDate}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) /
      (24 * 60 * 60 * 1000),
  ) : null;

  return {
    target,
    saved,
    remaining,
    ratio,
    percentage: Math.round(ratio * 100),
    isComplete: goal > 0 && saved >= goal,
    daysLeft,
    isOverdue: daysLeft !== null && daysLeft < 0 && saved < goal,
  };
}

export function calculateBudgetUsage(
  budget: Budget,
  transactions: Transaction[],
): BudgetUsage {
  let used = 0;
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;
    if (transaction.category !== budget.category) continue;
    if (monthYearOf(transaction.date) !== budget.monthYear) continue;
    used += transaction.amount;
  }

  const limit = budget.limitAmount;
  const ratio = limit > 0 ? used / limit : used > 0 ? 1 : 0;

  return {
    budget,
    used,
    remaining: Math.max(0, limit - used),
    ratio,
    percentage: Math.round(ratio * 100),
    status: budgetStatusForRatio(ratio),
  };
}

/* -------------------------------------------------------------------------- */
/*                                 Utilities                                  */
/* -------------------------------------------------------------------------- */

/** Big-int-safe addition guard: refuses to overflow past the ledger maximum. */
export function isAmountWithinLedgerLimits(amount: number): boolean {
  return Number.isInteger(amount) && amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;
}

export function clampProgressRatio(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;
  return Math.min(1, ratio);
}

/** Percentage of a budget/target capped at 100 for progress bar widths. */
export function progressFraction(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return clampProgressRatio(value / total);
}

export function isEditableCategory(category: string): boolean {
  return category !== INITIAL_CATEGORY;
}

/** Human-friendly title for a ledger row. */
export function transactionTitle(transaction: Transaction): string {
  if (transaction.description.trim()) return transaction.description.trim();
  return transaction.category;
}
