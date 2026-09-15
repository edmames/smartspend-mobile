/**
 * Transaction store — the ledger.
 *
 * Every mutation follows the same contract:
 *   1. validate the input,
 *   2. build the prospective ledger,
 *   3. run `validateLedger` (no negative balances on ANY date),
 *   4. persist, then publish to the snapshot + state.
 * If any step fails, nothing is written.
 */
import { create } from 'zustand';
import type {
  ID,
  ISODate,
  MutationResult,
  Transaction,
  TransactionFilters,
  TransactionInput,
  YearMonth,
} from '../types';
import { createId, transactionsStorage } from '../services/storage.service';
import { describeLedgerError, validateLedger } from '../services/ledger.service';
import { sortNewestFirst } from '../utils/calculations';
import { monthYearOf, nowISOString, periodRange, todayISO } from '../utils/date';
import { parseAmountInput } from '../utils/formatting';
import { translate } from '../utils/constants';
import { validateTransactionInput } from '../utils/validation';
import { affectsTarget, affectsWallet } from '../utils/calculations';
import { getSnapshot, updateSnapshot } from './snapshot';

export const DEFAULT_FILTERS: TransactionFilters = {
  type: 'all',
  walletId: 'all',
  category: 'all',
  period: 'this_month',
  query: '',
};

interface TransactionState {
  transactions: Transaction[];
  userId: ID | null;
  hydrated: boolean;
  filters: TransactionFilters;
  hydrate: (userId: ID) => Promise<void>;
  addTransaction: (input: TransactionInput) => Promise<MutationResult<Transaction>>;
  editTransaction: (id: ID, input: TransactionInput) => Promise<MutationResult<Transaction>>;
  deleteTransaction: (id: ID) => Promise<MutationResult<undefined>>;
  findTransaction: (id: ID) => Transaction | undefined;
  setFilters: (partial: Partial<TransactionFilters>) => void;
  resetFilters: () => void;
  filterTransactions: (filters?: Partial<TransactionFilters>) => Transaction[];
  searchTransactions: (query: string, base?: Transaction[]) => Transaction[];
  getFilteredTransactions: () => Transaction[];
  getWalletTransactions: (walletId: ID, limit?: number) => Transaction[];
  getTargetMovements: (targetId: ID) => Transaction[];
  getMonthlyTransactions: (monthYear: YearMonth) => Transaction[];
  setAll: (transactions: Transaction[]) => Promise<void>;
  /**
   * Adopts a ledger snapshot written by ANOTHER store (the wallet store writes
   * the `initial` row when a wallet is created / re-opened / removed).
   *
   * Without this the row lands in AsyncStorage and in the cross-store snapshot
   * but not in this store's reactive state — and every screen derives balances
   * from here, so a new wallet would show a balance of 0 until a refresh.
   */
  adoptLedger: (transactions: Transaction[]) => void;
  merge: (transactions: Transaction[]) => Promise<void>;
  reset: () => void;
}

/* -------------------------------------------------------------------------- */
/*                                 Helpers                                    */
/* -------------------------------------------------------------------------- */

/** Applies the ledger rules that don't need user input (forced categories). */
function normalizeInput(input: TransactionInput): TransactionInput {
  switch (input.type) {
    case 'transfer':
      return { ...input, category: 'transfer', paymentMethod: undefined };
    case 'savings_deposit':
    case 'savings_withdraw':
      return {
        ...input,
        category: 'savings',
        paymentMethod: undefined,
        // Savings withdrawals credit the wallet in `walletSourceId`; the ledger
        // only ever needs one wallet reference for them.
        walletDestinationId:
          input.type === 'savings_withdraw'
            ? input.walletDestinationId ?? input.walletSourceId
            : undefined,
      };
    default:
      return input;
  }
}

function buildTransaction(
  input: TransactionInput,
  userId: ID,
  existing?: Transaction,
): Transaction {
  const normalized = normalizeInput(input);
  const timestamp = nowISOString();
  const isWithdraw = normalized.type === 'savings_withdraw';

  return {
    id: existing?.id ?? createId('txn'),
    userId: existing?.userId ?? userId,
    type: normalized.type,
    amount: normalized.amount,
    date: normalized.date,
    category: normalized.category,
    description: (normalized.description ?? '').trim(),
    // For savings withdrawals the receiving wallet lives in `walletSourceId`.
    walletSourceId: normalized.walletSourceId,
    walletDestinationId: isWithdraw ? undefined : normalized.walletDestinationId,
    savingsTargetId: normalized.savingsTargetId,
    paymentMethod:
      normalized.type === 'expense' || normalized.type === 'income'
        ? normalized.paymentMethod
        : undefined,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

const isISODate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

/* -------------------------------------------------------------------------- */
/*                                  Store                                     */
/* -------------------------------------------------------------------------- */

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  userId: null,
  hydrated: false,
  filters: DEFAULT_FILTERS,

  hydrate: async (userId) => {
    try {
      const transactions = (await transactionsStorage.load()).filter(
        (transaction) => transaction.userId === userId,
      );
      updateSnapshot({ transactions });
      set({ transactions, userId, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  addTransaction: async (input) => {
    const userId = get().userId ?? getSnapshot().wallets[0]?.userId ?? '';
    const normalized = normalizeInput(input);
    const snapshot = getSnapshot();

    const validation = validateTransactionInput(normalized, {
      wallets: snapshot.wallets,
      targets: snapshot.targets,
      budgets: snapshot.budgets,
    });

    if (!validation.ok) {
      const [field] = Object.keys(validation.errors);
      const key = validation.errors[field as keyof typeof validation.errors] ?? 'unknown';
      return { ok: false, error: translate(`error.${key}` as never), errors: validation.errors };
    }

    const transaction = buildTransaction(normalized, userId);
    const next = [...get().transactions, transaction];

    const ledgerCheck = validateLedger(next, snapshot.wallets, snapshot.targets);
    if (!ledgerCheck.valid) {
      return { ok: false, error: describeLedgerError(ledgerCheck.errors[0], translate as never) };
    }

    try {
      await transactionsStorage.save(next);
    } catch {
      return { ok: false, error: translate('error.storage') };
    }

    updateSnapshot({ transactions: next });
    set({ transactions: next });
    return { ok: true, data: transaction };
  },

  editTransaction: async (id, input) => {
    const existing = get().transactions.find((transaction) => transaction.id === id);
    if (!existing) return { ok: false, error: translate('error.unknown') };

    const userId = get().userId ?? existing.userId;
    const normalized = normalizeInput(input);
    const snapshot = getSnapshot();

    const validation = validateTransactionInput(normalized, {
      wallets: snapshot.wallets,
      targets: snapshot.targets,
      budgets: snapshot.budgets,
    });
    if (!validation.ok) {
      const [field] = Object.keys(validation.errors);
      const key = validation.errors[field as keyof typeof validation.errors] ?? 'unknown';
      return { ok: false, error: translate(`error.${key}` as never), errors: validation.errors };
    }

    const updated = buildTransaction(normalized, userId, existing);
    const next = get().transactions.map((transaction) =>
      transaction.id === id ? updated : transaction,
    );

    const ledgerCheck = validateLedger(next, snapshot.wallets, snapshot.targets);
    if (!ledgerCheck.valid) {
      return { ok: false, error: describeLedgerError(ledgerCheck.errors[0], translate as never) };
    }

    try {
      await transactionsStorage.save(next);
    } catch {
      return { ok: false, error: translate('error.storage') };
    }

    updateSnapshot({ transactions: next });
    set({ transactions: next });
    return { ok: true, data: updated };
  },

  deleteTransaction: async (id) => {
    const existing = get().transactions.find((transaction) => transaction.id === id);
    if (!existing) return { ok: false, error: translate('error.unknown') };

    const snapshot = getSnapshot();
    const next = get().transactions.filter((transaction) => transaction.id !== id);

    const ledgerCheck = validateLedger(next, snapshot.wallets, snapshot.targets);
    if (!ledgerCheck.valid) {
      return { ok: false, error: describeLedgerError(ledgerCheck.errors[0], translate as never) };
    }

    try {
      await transactionsStorage.save(next);
    } catch {
      return { ok: false, error: translate('error.storage') };
    }

    updateSnapshot({ transactions: next });
    set({ transactions: next });
    return { ok: true, data: undefined };
  },

  findTransaction: (id) => get().transactions.find((transaction) => transaction.id === id),

  setFilters: (partial) => set({ filters: { ...get().filters, ...partial } }),

  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  filterTransactions: (override) => {
    const filters = { ...get().filters, ...override };
    const { from, to } = periodRange(filters.period);

    let rows = get().transactions;
    if (filters.type !== 'all') rows = rows.filter((row) => row.type === filters.type);
    if (filters.walletId !== 'all') {
      rows = rows.filter((row) => affectsWallet(row, filters.walletId as ID));
    }
    if (filters.category !== 'all') rows = rows.filter((row) => row.category === filters.category);
    if (from) rows = rows.filter((row) => row.date >= from);
    if (to) rows = rows.filter((row) => row.date <= to);

    return sortNewestFirst(rows);
  },

  searchTransactions: (query, base) => {
    const trimmed = query.trim().toLowerCase();
    const rows = base ?? get().transactions;
    if (!trimmed) return sortNewestFirst(rows);
    const digits = trimmed.replace(/\D/g, '');

    return sortNewestFirst(
      rows.filter((row) => {
        if (row.description.toLowerCase().includes(trimmed)) return true;
        if (row.category.toLowerCase().includes(trimmed)) return true;
        if (String(row.amount).includes(trimmed)) return true;
        if (digits && String(row.amount).includes(digits)) return true;
        return false;
      }),
    );
  },

  getFilteredTransactions: () => {
    const filtered = get().filterTransactions();
    const { query } = get().filters;
    return query.trim() ? get().searchTransactions(query, filtered) : filtered;
  },

  getWalletTransactions: (walletId, limit) => {
    const rows = sortNewestFirst(get().transactions.filter((row) => affectsWallet(row, walletId)));
    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  },

  getTargetMovements: (targetId) =>
    sortNewestFirst(get().transactions.filter((row) => affectsTarget(row, targetId))),

  getMonthlyTransactions: (monthYear) =>
    sortNewestFirst(get().transactions.filter((row) => monthYearOf(row.date) === monthYear)),

  setAll: async (transactions) => {
    await transactionsStorage.save(transactions);
    updateSnapshot({ transactions });
    set({ transactions, hydrated: true });
  },

  adoptLedger: (transactions) => {
    updateSnapshot({ transactions });
    set({ transactions });
  },

  merge: async (incoming) => {
    const map = new Map(get().transactions.map((transaction) => [transaction.id, transaction]));
    for (const transaction of incoming) map.set(transaction.id, transaction);
    await get().setAll([...map.values()]);
  },

  reset: () => {
    updateSnapshot({ transactions: [] });
    set({ transactions: [], userId: null, hydrated: false, filters: DEFAULT_FILTERS });
  },
}));

/* -------------------------------------------------------------------------- */
/*                              Derived helpers                               */
/* -------------------------------------------------------------------------- */

/** Splits a ledger into per-day totals (used by the wallet detail screen). */
export function groupTransactionsByDate(
  transactions: Transaction[],
): { date: ISODate; transactions: Transaction[] }[] {
  const groups = new Map<ISODate, Transaction[]>();
  for (const transaction of transactions) {
    const bucket = groups.get(transaction.date) ?? [];
    bucket.push(transaction);
    groups.set(transaction.date, bucket);
  }
  return [...groups.entries()]
    .map(([date, rows]) => ({ date, transactions: rows }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Parses an amount string and reports the user-facing error key. */
export function parseAmountOrError(raw: string): { ok: boolean; value?: number; errorKey?: string } {
  const parsed = parseAmountInput(raw);
  if (!parsed.ok) return { ok: false, errorKey: `error.${parsed.error}` };
  return { ok: true, value: parsed.value };
}

export function isValidTransactionDate(date: string): boolean {
  return isISODate(date) && date <= todayISO();
}
