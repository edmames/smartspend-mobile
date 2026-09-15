/**
 * Wallet hooks — every balance is derived from the ledger, never stored.
 */
import { useCallback, useMemo } from 'react';
import type { ID, ISODate, MutationResult, Transaction, Wallet, WalletInput } from '../types';
import { useWalletStore } from '../store/walletStore';
import { useTransactionStore } from '../store/transactionStore';
import { useSavingsStore } from '../store/savingsStore';
import { calculateTotalMoney, walletBalance, walletBalanceMap } from '../utils/calculations';
import { DASHBOARD_TOP_WALLETS, WALLET_RECENT_TRANSACTIONS } from '../utils/constants';

export interface WalletWithBalance extends Wallet {
  balance: number;
  transactionCount: number;
}

export interface WalletsApi {
  wallets: Wallet[];
  walletsWithBalance: WalletWithBalance[];
  sortedByBalance: WalletWithBalance[];
  topWallets: WalletWithBalance[];
  balances: Record<ID, number>;
  totalMoney: number;
  addWallet: (input: WalletInput) => Promise<MutationResult<Wallet>>;
  editWallet: (id: ID, input: WalletInput) => Promise<MutationResult<Wallet>>;
  deleteWallet: (id: ID) => Promise<MutationResult<undefined>>;
  getBalance: (id: ID, date?: ISODate) => number;
  isEmpty: boolean;
}

export function useWallets(): WalletsApi {
  const wallets = useWalletStore((state) => state.wallets);
  const addWalletAction = useWalletStore((state) => state.addWallet);
  const editWalletAction = useWalletStore((state) => state.editWallet);
  const deleteWalletAction = useWalletStore((state) => state.deleteWallet);
  const transactions = useTransactionStore((state) => state.transactions);
  const targets = useSavingsStore((state) => state.targets);

  const balances = useMemo(() => walletBalanceMap(transactions, wallets), [transactions, wallets]);

  const walletsWithBalance = useMemo<WalletWithBalance[]>(
    () =>
      wallets.map((wallet) => ({
        ...wallet,
        balance: balances[wallet.id] ?? 0,
        transactionCount: transactions.filter(
          (transaction) =>
            transaction.walletSourceId === wallet.id || transaction.walletDestinationId === wallet.id,
        ).length,
      })),
    [balances, transactions, wallets],
  );

  const sortedByBalance = useMemo(
    () => [...walletsWithBalance].sort((a, b) => b.balance - a.balance),
    [walletsWithBalance],
  );

  // Note: `calculateTotalMoney` returns the full snapshot; the dashboard only
  // needs the grand total (wallets + savings, no double counting).
  const totalMoney = useMemo(
    () => calculateTotalMoney(transactions, wallets, targets).total,
    [targets, transactions, wallets],
  );

  const getBalance = useCallback(
    (id: ID, date?: ISODate) => walletBalance(transactions, id, date),
    [transactions],
  );

  return {
    wallets,
    walletsWithBalance,
    sortedByBalance,
    topWallets: sortedByBalance.slice(0, DASHBOARD_TOP_WALLETS),
    balances,
    totalMoney,
    addWallet: addWalletAction,
    editWallet: editWalletAction,
    deleteWallet: deleteWalletAction,
    getBalance,
    isEmpty: wallets.length === 0,
  };
}

export interface WalletDetail {
  wallet: Wallet | undefined;
  balance: number;
  transactions: Transaction[];
  recentTransactions: Transaction[];
}

/** One wallet plus its movements (most recent first). */
export function useWalletDetail(walletId: ID): WalletDetail {
  const wallets = useWalletStore((state) => state.wallets);
  const transactions = useTransactionStore((state) => state.transactions);

  const wallet = useMemo(() => wallets.find((item) => item.id === walletId), [wallets, walletId]);

  const walletTransactions = useMemo(
    () =>
      transactions
        .filter(
          (transaction) =>
            transaction.walletSourceId === walletId || transaction.walletDestinationId === walletId,
        )
        .sort((a, b) =>
          a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1,
        ),
    [transactions, walletId],
  );

  const balance = useMemo(() => walletBalance(transactions, walletId), [transactions, walletId]);

  return {
    wallet,
    balance,
    transactions: walletTransactions,
    recentTransactions: walletTransactions.slice(0, WALLET_RECENT_TRANSACTIONS),
  };
}
