/**
 * Transaction hooks: filtering, search, infinite scroll (30 per page) and
 * ledger-safe CRUD.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CategoryKey,
  ID,
  MutationResult,
  Transaction,
  TransactionFilters,
  TransactionInput,
  YearMonth,
} from '../types';
import { useTransactionStore, DEFAULT_FILTERS } from '../store/transactionStore';
import { useWalletStore } from '../store/walletStore';
import { useAuthStore } from '../store/authStore';
import { sumIncomeExpense } from '../utils/calculations';
import { TRANSACTION_PAGE_SIZE } from '../utils/constants';
import { monthYearOf, periodRange } from '../utils/date';

export interface TransactionsApi {
  /** Filtered + searched rows for the active filters. */
  transactions: Transaction[];
  /** Same rows, truncated to the current page window (infinite scroll). */
  visibleTransactions: Transaction[];
  filters: TransactionFilters;
  setFilters: (partial: Partial<TransactionFilters>) => void;
  resetFilters: () => void;
  loadMore: () => void;
  hasMore: boolean;
  visibleCount: number;
  refreshing: boolean;
  refresh: () => Promise<void>;
  totals: { income: number; expense: number; net: number };
  addTransaction: (input: TransactionInput) => Promise<MutationResult<Transaction>>;
  editTransaction: (id: ID, input: TransactionInput) => Promise<MutationResult<Transaction>>;
  deleteTransaction: (id: ID) => Promise<MutationResult<undefined>>;
}

export function useTransactions(): TransactionsApi {
  const transactions = useTransactionStore((state) => state.transactions);
  const filters = useTransactionStore((state) => state.filters);
  const setFiltersAction = useTransactionStore((state) => state.setFilters);
  const resetFiltersAction = useTransactionStore((state) => state.resetFilters);
  const addAction = useTransactionStore((state) => state.addTransaction);
  const editAction = useTransactionStore((state) => state.editTransaction);
  const deleteAction = useTransactionStore((state) => state.deleteTransaction);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const [visibleCount, setVisibleCount] = useState(TRANSACTION_PAGE_SIZE);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    let rows = transactions;

    if (filters.type !== 'all') rows = rows.filter((row) => row.type === filters.type);
    if (filters.walletId !== 'all') {
      rows = rows.filter(
        (row) =>
          row.walletSourceId === filters.walletId || row.walletDestinationId === filters.walletId,
      );
    }
    if (filters.category !== 'all') rows = rows.filter((row) => row.category === filters.category);

    const { from, to } = periodRange(filters.period);
    if (from) rows = rows.filter((row) => row.date >= from);
    if (to) rows = rows.filter((row) => row.date <= to);

    const query = filters.query.trim().toLowerCase();
    if (query) {
      const digits = query.replace(/\D/g, '');
      rows = rows.filter((row) => {
        if (row.description.toLowerCase().includes(query)) return true;
        if (row.category.toLowerCase().includes(query)) return true;
        if (digits && String(row.amount).includes(digits)) return true;
        return false;
      });
    }

    return [...rows].sort((a, b) =>
      a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1,
    );
  }, [filters, transactions]);

  // Any filter change restarts the pagination window.
  useEffect(() => {
    setVisibleCount(TRANSACTION_PAGE_SIZE);
  }, [filters.category, filters.period, filters.query, filters.type, filters.walletId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      await useTransactionStore.getState().hydrate(userId);
      await useWalletStore.getState().hydrate(userId);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  const totals = useMemo(() => sumIncomeExpense(filtered), [filtered]);

  return {
    transactions: filtered,
    visibleTransactions: filtered.slice(0, visibleCount),
    filters,
    setFilters: setFiltersAction,
    resetFilters: resetFiltersAction,
    loadMore: () => setVisibleCount((count) => count + TRANSACTION_PAGE_SIZE),
    hasMore: visibleCount < filtered.length,
    visibleCount,
    refreshing,
    refresh,
    totals,
    addTransaction: addAction,
    editTransaction: editAction,
    deleteTransaction: deleteAction,
  };
}

/** Category totals for a month (reports screen). */
export function useMonthTransactions(monthYear: YearMonth) {
  const transactions = useTransactionStore((state) => state.transactions);
  return useMemo(
    () => ({
      monthly: transactions.filter((transaction) => monthYearOf(transaction.date) === monthYear),
      all: transactions,
    }),
    [monthYear, transactions],
  );
}

/** Options for the wallet filter dropdown. */
export function useWalletFilterOptions(): { value: ID | 'all'; label: string }[] {
  const wallets = useWalletStore((state) => state.wallets);
  return useMemo(
    () => [{ value: 'all' as const, label: 'all' }, ...wallets.map((wallet) => ({ value: wallet.id, label: wallet.name }))],
    [wallets],
  );
}

export { DEFAULT_FILTERS };
export type { CategoryKey };
