/**
 * Export / backup logic — PURE module (no native imports).
 *
 * Everything here is deterministic and free of platform APIs, which is what
 * lets `npm run verify` exercise it directly on Node. The actual file writing,
 * sharing and document picking live in `file.service.ts`.
 */
import type {
  BackupPayload,
  Budget,
  CategoryKey,
  ISODate,
  MonthlyReport,
  SavingsTarget,
  Settings,
  Transaction,
  User,
  Wallet,
  WalletBrand,
  WalletType,
  YearMonth,
} from '../types';
import {
  APP_VERSION,
  BACKUP_FILE_PREFIX,
  BACKUP_VERSION,
  REPORT_FILE_PREFIX,
  REPORT_TOP_CATEGORIES,
  WALLET_BRANDS,
  WALLET_BRAND_META,
} from '../utils/constants';
import { isValidISODate, isValidYearMonth, todayISO } from '../utils/date';
import {
  calculateCategoryBreakdown,
  calculateDailyCashFlow,
  calculateMonthlySummary,
  sortNewestFirst,
  transactionsInMonth,
} from '../utils/calculations';

/* -------------------------------------------------------------------------- */
/*                            Monthly report builder                          */
/* -------------------------------------------------------------------------- */

export function buildMonthlyReport(
  transactions: Transaction[],
  monthYear: YearMonth,
  options: { exportDate?: ISODate; topCategories?: number } = {},
): MonthlyReport {
  const exportDate = options.exportDate ?? todayISO();
  const topCategories = options.topCategories ?? REPORT_TOP_CATEGORIES;
  const monthTransactions = sortNewestFirst(transactionsInMonth(transactions, monthYear));
  const summary = calculateMonthlySummary(transactions, monthYear);

  return {
    exportDate,
    month: monthYear,
    summary: {
      income: summary.income,
      expense: summary.expense,
      net: summary.net,
    },
    dailyCashFlow: calculateDailyCashFlow(transactions, monthYear).map((point) => ({
      date: point.date,
      amount: point.net,
      income: point.income,
      expense: point.expense,
    })),
    categoryBreakdown: calculateCategoryBreakdown(transactions, monthYear, 'expense')
      .slice(0, topCategories)
      .map((item) => ({
        category: item.category,
        amount: item.amount,
        percentage: Math.round(item.percentage * 10) / 10,
      })),
    transactions: monthTransactions,
  };
}

export function reportFileName(monthYear: YearMonth): string {
  return `${REPORT_FILE_PREFIX}-${monthYear}.json`;
}

export function backupFileName(date: ISODate = todayISO()): string {
  return `${BACKUP_FILE_PREFIX}-${date}.json`;
}

/* -------------------------------------------------------------------------- */
/*                              Backup payload                                */
/* -------------------------------------------------------------------------- */

export function buildBackupPayload(input: {
  user: User;
  wallets: Wallet[];
  transactions: Transaction[];
  targets: SavingsTarget[];
  budgets: Budget[];
  settings: Settings;
}): BackupPayload {
  return {
    app: 'smartspend',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    user: input.user,
    wallets: input.wallets,
    transactions: input.transactions,
    savingsTargets: input.targets,
    budgets: input.budgets,
    settings: input.settings,
  };
}

/* -------------------------------------------------------------------------- */
/*                             Backup validation                              */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export interface BackupValidationResult {
  ok: boolean;
  payload?: BackupPayload;
  error?: string;
  /** Non-fatal problems found while normalizing (surfaced as a toast). */
  warnings: string[];
}

const VALID_TRANSACTION_TYPES = new Set([
  'initial',
  'income',
  'expense',
  'transfer',
  'savings_deposit',
  'savings_withdraw',
]);

/**
 * Validates and normalizes an imported backup.
 *
 * Unknown fields are dropped and malformed rows are skipped (and reported as
 * warnings) rather than rejecting the entire file.
 */
export function validateBackupPayload(raw: unknown): BackupValidationResult {
  const warnings: string[] = [];

  let candidate: unknown = raw;
  if (typeof raw === 'string') {
    try {
      candidate = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'import_invalid', warnings };
    }
  }

  if (!isRecord(candidate)) return { ok: false, error: 'import_invalid', warnings };
  if (candidate.app !== 'smartspend' && candidate.version === undefined) {
    return { ok: false, error: 'import_invalid', warnings };
  }

  const userRecord = isRecord(candidate.user) ? candidate.user : null;
  if (!userRecord || !asString(userRecord.id) || !asString(userRecord.email)) {
    return { ok: false, error: 'import_invalid', warnings };
  }

  const user: User = {
    id: asString(userRecord.id),
    email: asString(userRecord.email),
    name: asString(userRecord.name, asString(userRecord.email).split('@')[0] || 'User'),
    createdAt: isValidISODate(asString(userRecord.createdAt))
      ? asString(userRecord.createdAt)
      : todayISO(),
  };

  /* Wallets */
  const wallets: Wallet[] = [];
  const rawWallets = Array.isArray(candidate.wallets) ? candidate.wallets : [];
  for (const item of rawWallets) {
    if (!isRecord(item) || !asString(item.id) || !asString(item.name)) {
      warnings.push('wallet_skipped');
      continue;
    }
    const rawType = asString(item.type, 'cash');
    const type: WalletType = rawType === 'bank' || rawType === 'ewallet' ? rawType : 'cash';
    const rawBrand = asString(item.brand, '');
    // Tolerate backups written before providers existed, and drop a provider
    // that does not belong to the wallet's type (a cash wallet has none).
    const brand = rawBrand in WALLET_BRAND_META && WALLET_BRANDS[type].includes(rawBrand as WalletBrand)
      ? (rawBrand as WalletBrand)
      : null;
    wallets.push({
      id: asString(item.id),
      userId: asString(item.userId, user.id),
      name: asString(item.name),
      type,
      brand,
      initialBalance: Math.max(0, Math.round(asNumber(item.initialBalance))),
      createdAt: isValidISODate(asString(item.createdAt)) ? asString(item.createdAt) : todayISO(),
    });
  }
  const walletIds = new Set(wallets.map((wallet) => wallet.id));

  /* Savings targets */
  const targets: SavingsTarget[] = [];
  const rawTargets = Array.isArray(candidate.savingsTargets) ? candidate.savingsTargets : [];
  for (const item of rawTargets) {
    if (!isRecord(item) || !asString(item.id) || !asString(item.name)) {
      warnings.push('target_skipped');
      continue;
    }
    const dueDate = asString(item.dueDate);
    targets.push({
      id: asString(item.id),
      userId: asString(item.userId, user.id),
      name: asString(item.name),
      goalAmount: Math.max(1, Math.round(asNumber(item.goalAmount, 1))),
      dueDate: isValidISODate(dueDate) ? dueDate : undefined,
      createdAt: isValidISODate(asString(item.createdAt)) ? asString(item.createdAt) : todayISO(),
      updatedAt: asString(item.updatedAt, new Date().toISOString()),
    });
  }
  const targetIds = new Set(targets.map((target) => target.id));

  /* Transactions — orphan rows are dropped so the ledger stays consistent. */
  const transactions: Transaction[] = [];
  const rawTransactions = Array.isArray(candidate.transactions) ? candidate.transactions : [];
  for (const item of rawTransactions) {
    if (!isRecord(item)) {
      warnings.push('transaction_skipped');
      continue;
    }

    const id = asString(item.id);
    const type = asString(item.type);
    const amount = Math.round(asNumber(item.amount));
    const date = asString(item.date);
    const source = asString(item.walletSourceId) || undefined;
    const destination = asString(item.walletDestinationId) || undefined;
    const target = asString(item.savingsTargetId) || undefined;

    if (!id || !VALID_TRANSACTION_TYPES.has(type) || amount <= 0 || !isValidISODate(date)) {
      warnings.push('transaction_skipped');
      continue;
    }
    if ((source && !walletIds.has(source)) || (destination && !walletIds.has(destination))) {
      warnings.push('transaction_orphan_wallet');
      continue;
    }
    if (target && !targetIds.has(target)) {
      warnings.push('transaction_orphan_target');
      continue;
    }

    const paymentMethod = asString(item.paymentMethod);

    transactions.push({
      id,
      userId: asString(item.userId, user.id),
      type: type as Transaction['type'],
      amount,
      date,
      category: asString(item.category, 'other') as CategoryKey,
      description: asString(item.description),
      walletSourceId: source,
      walletDestinationId: destination,
      savingsTargetId: target,
      paymentMethod: paymentMethod ? (paymentMethod as Transaction['paymentMethod']) : undefined,
      createdAt: asString(item.createdAt, new Date().toISOString()),
      updatedAt: asString(item.updatedAt, new Date().toISOString()),
    });
  }

  /* Budgets — one per category/month, duplicates skipped. */
  const budgets: Budget[] = [];
  const rawBudgets = Array.isArray(candidate.budgets) ? candidate.budgets : [];
  const seenBudgetKeys = new Set<string>();
  for (const item of rawBudgets) {
    if (!isRecord(item)) {
      warnings.push('budget_skipped');
      continue;
    }
    const monthYear = asString(item.monthYear);
    const category = asString(item.category) as CategoryKey;
    const limitAmount = Math.round(asNumber(item.limitAmount));
    const key = `${category}:${monthYear}`;
    if (!isValidYearMonth(monthYear) || limitAmount <= 0 || seenBudgetKeys.has(key)) {
      warnings.push('budget_skipped');
      continue;
    }
    seenBudgetKeys.add(key);
    budgets.push({
      id: asString(item.id) || `budget_${monthYear}_${category}`,
      userId: asString(item.userId, user.id),
      category,
      monthYear,
      limitAmount,
      createdAt: asString(item.createdAt, new Date().toISOString()),
    });
  }

  /* Settings */
  const settingsRecord = isRecord(candidate.settings) ? candidate.settings : {};
  const theme = asString(settingsRecord.theme, 'dark');
  const language = asString(settingsRecord.language, 'id');
  const settings: Settings = {
    userId: user.id,
    theme: theme === 'light' || theme === 'system' ? theme : 'dark',
    currency: 'IDR',
    language: language === 'en' ? 'en' : 'id',
    telegramEnabled: settingsRecord.telegramEnabled === true,
    telegramChatId: asString(settingsRecord.telegramChatId) || undefined,
  };

  return {
    ok: true,
    warnings,
    payload: {
      app: 'smartspend',
      version: asNumber(candidate.version, APP_VERSION),
      exportedAt: asString(candidate.exportedAt, new Date().toISOString()),
      user,
      wallets,
      transactions,
      savingsTargets: targets,
      budgets,
      settings,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                                  Merging                                   */
/* -------------------------------------------------------------------------- */

/** Merges by id: incoming rows win, existing rows are preserved. */
export function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of current) map.set(item.id, item);
  for (const item of incoming) map.set(item.id, item);
  return [...map.values()];
}

/** Keeps one budget per `category:monthYear` key (incoming wins). */
export function mergeBudgets(current: Budget[], incoming: Budget[]): Budget[] {
  const map = new Map<string, Budget>();
  for (const budget of current) map.set(`${budget.category}:${budget.monthYear}`, budget);
  for (const budget of incoming) map.set(`${budget.category}:${budget.monthYear}`, budget);
  return [...map.values()];
}

/** Summary of what a backup contains (used by the import dialog). */
export function describeBackup(payload: BackupPayload): string {
  return `${payload.wallets.length} wallets · ${payload.transactions.length} transactions · ${payload.savingsTargets.length} targets · ${payload.budgets.length} budgets`;
}

export const exporter = {
  buildMonthlyReport,
  buildBackupPayload,
  validateBackupPayload,
  mergeById,
  mergeBudgets,
  describeBackup,
  reportFileName,
  backupFileName,
};

export type ExportService = typeof exporter;
