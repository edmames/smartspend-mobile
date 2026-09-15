/**
 * Wallet store.
 *
 * Wallets are thin entities: the `initial` transaction carries the opening
 * balance, so deleting a wallet with only that row is allowed (the row is
 * removed with it), while a wallet with real history is protected.
 */
import { create } from 'zustand';
import type { ID, ISODate, MutationResult, Transaction, Wallet, WalletInput, WalletType } from '../types';
import { createId, transactionsStorage, walletsStorage } from '../services/storage.service';
import { validateLedger } from '../services/ledger.service';
import { walletBalance } from '../utils/calculations';
import { todayISO } from '../utils/date';
import { validateWalletInput } from '../utils/validation';
import { translate } from '../utils/constants';
import {
  getSnapshot,
  transactionsForWallet,
  updateSnapshot,
  walletById,
} from './snapshot';
import { useTransactionStore } from './transactionStore';

interface WalletState {
  wallets: Wallet[];
  /** Active account id (set during hydrate) — every write is stamped with it. */
  userId: ID | null;
  hydrated: boolean;
  hydrate: (userId: ID) => Promise<void>;
  addWallet: (input: WalletInput) => Promise<MutationResult<Wallet>>;
  editWallet: (id: ID, input: WalletInput) => Promise<MutationResult<Wallet>>;
  deleteWallet: (id: ID) => Promise<MutationResult<undefined>>;
  getWallet: (id: ID) => Wallet | undefined;
  getWalletBalance: (id: ID, date?: ISODate) => number;
  getWalletTransactions: (id: ID) => Transaction[];
  getWalletTransactionCount: (id: ID, options?: { ignoreInitial?: boolean }) => number;
  setAll: (wallets: Wallet[]) => Promise<void>;
  merge: (wallets: Wallet[]) => Promise<void>;
  reset: () => void;
}

function persist(wallets: Wallet[]): Promise<void> {
  updateSnapshot({ wallets });
  return walletsStorage.save(wallets);
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: [],
  userId: null,
  hydrated: false,

  hydrate: async (userId) => {
    try {
      const wallets = (await walletsStorage.load()).filter((wallet) => wallet.userId === userId);
      await persist(wallets);
      set({ wallets, userId, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  addWallet: async (input) => {
    const userId = get().userId ?? getSnapshot().wallets[0]?.userId ?? '';
    const validation = validateWalletInput(input, { wallets: get().wallets, targets: [], budgets: [] });
    if (!validation.ok || !validation.normalized) {
      const [field] = Object.keys(validation.errors);
      const key = validation.errors[field as keyof typeof validation.errors] ?? 'unknown';
      return { ok: false, error: translate(`error.${key}` as never), errors: validation.errors };
    }

    const { name, type, brand, initialBalance } = validation.normalized;
    const wallet: Wallet = {
      id: createId('wal'),
      // `userId` is stamped from the active session by the calling hook; the
      // snapshot fallback keeps direct store calls usable in tests.
      userId,
      name,
      type,
      brand: brand ?? null,
      initialBalance: initialBalance ?? 0,
      createdAt: todayISO(),
    };

    const transactions = getSnapshot().transactions;
    const nextTransactions: Transaction[] = [...transactions];
    if (initialBalance && initialBalance > 0) {
      const now = new Date().toISOString();
      nextTransactions.push({
        id: createId('txn'),
        userId,
        type: 'initial',
        amount: initialBalance,
        date: wallet.createdAt,
        category: 'initial',
        description: `${name} — ${translate('transaction.type.initial')}`,
        walletSourceId: wallet.id,
        createdAt: now,
        updatedAt: now,
      });
    }

    const nextWallets = [...get().wallets, wallet];
    const validation2 = validateLedger(nextTransactions, nextWallets, getSnapshot().targets);
    if (!validation2.valid) {
      return { ok: false, error: validation2.errors[0]?.detail ?? translate('error.unknown') };
    }

    try {
      await walletsStorage.save(nextWallets);
      await transactionsStorage.save(nextTransactions);
    } catch {
      return { ok: false, error: translate('error.storage') };
    }

    updateSnapshot({ wallets: nextWallets, transactions: nextTransactions });
    // Publish the opening-balance row to the ledger store so every balance on
    // screen updates immediately (no refresh needed).
    useTransactionStore.getState().adoptLedger(nextTransactions);
    set({ wallets: nextWallets });
    return { ok: true, data: wallet };
  },

  editWallet: async (id, input) => {
    const current = get().wallets.find((wallet) => wallet.id === id);
    if (!current) return { ok: false, error: translate('error.wallet_not_found') };

    const validation = validateWalletInput(
      { ...input, type: current.type },
      { wallets: get().wallets, targets: [], budgets: [] },
      { walletId: id },
    );
    if (!validation.ok || !validation.normalized) {
      const [field] = Object.keys(validation.errors);
      const key = validation.errors[field as keyof typeof validation.errors] ?? 'unknown';
      return { ok: false, error: translate(`error.${key}` as never), errors: validation.errors };
    }

    const { name, brand, initialBalance } = validation.normalized;
    const updated: Wallet = { ...current, name, brand: brand ?? null, initialBalance: initialBalance ?? 0 };

    const transactions = getSnapshot().transactions;
    const initialRow = transactions.find(
      (transaction) => transaction.walletSourceId === id && transaction.type === 'initial',
    );

    let nextTransactions: Transaction[] = transactions;
    if (initialBalance && initialBalance > 0) {
      const now = new Date().toISOString();
      nextTransactions = initialRow
        ? transactions.map((transaction) =>
            transaction.id === initialRow.id
              ? { ...transaction, amount: initialBalance, updatedAt: now }
              : transaction,
          )
        : [
            ...transactions,
            {
              id: createId('txn'),
              userId: current.userId,
              type: 'initial' as const,
              amount: initialBalance,
              date: current.createdAt,
              category: 'initial' as const,
              description: `${name} — ${translate('transaction.type.initial')}`,
              walletSourceId: id,
              createdAt: now,
              updatedAt: now,
            },
          ];
    } else if (initialRow) {
      // Opening balance removed → drop the ledger row (an empty balance is not
      // a zero transaction).
      nextTransactions = transactions.filter((transaction) => transaction.id !== initialRow.id);
    }

    const nextWallets = get().wallets.map((wallet) => (wallet.id === id ? updated : wallet));
    const ledgerCheck = validateLedger(nextTransactions, nextWallets, getSnapshot().targets);
    if (!ledgerCheck.valid) {
      return { ok: false, error: ledgerCheck.errors[0]?.detail ?? translate('error.negative_wallet_saldo') };
    }

    try {
      await walletsStorage.save(nextWallets);
      await transactionsStorage.save(nextTransactions);
    } catch {
      return { ok: false, error: translate('error.storage') };
    }

    updateSnapshot({ wallets: nextWallets, transactions: nextTransactions });
    useTransactionStore.getState().adoptLedger(nextTransactions);
    set({ wallets: nextWallets });
    return { ok: true, data: updated };
  },

  deleteWallet: async (id) => {
    const wallet = get().wallets.find((item) => item.id === id);
    if (!wallet) return { ok: false, error: translate('error.wallet_not_found') };

    const related = transactionsForWallet(id);
    const realHistory = related.filter((transaction) => transaction.type !== 'initial');
    if (realHistory.length > 0) {
      return { ok: false, error: translate('error.wallet_has_transactions') };
    }

    const nextWallets = get().wallets.filter((item) => item.id !== id);
    const removedIds = new Set(related.map((transaction) => transaction.id));
    const nextTransactions = getSnapshot().transactions.filter(
      (transaction) => !removedIds.has(transaction.id),
    );

    const ledgerCheck = validateLedger(nextTransactions, nextWallets, getSnapshot().targets);
    if (!ledgerCheck.valid) {
      return { ok: false, error: ledgerCheck.errors[0]?.detail ?? translate('error.negative_wallet_saldo') };
    }

    try {
      await walletsStorage.save(nextWallets);
      await transactionsStorage.save(nextTransactions);
    } catch {
      return { ok: false, error: translate('error.storage') };
    }

    updateSnapshot({ wallets: nextWallets, transactions: nextTransactions });
    useTransactionStore.getState().adoptLedger(nextTransactions);
    set({ wallets: nextWallets });
    return { ok: true, data: undefined };
  },

  getWallet: (id) => get().wallets.find((wallet) => wallet.id === id),

  getWalletBalance: (id, date) => walletBalance(getSnapshot().transactions, id, date),

  getWalletTransactions: (id) =>
    transactionsForWallet(id)
      .slice()
      .sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1)),

  getWalletTransactionCount: (id, options) =>
    transactionsForWallet(id).filter(
      (transaction) => !(options?.ignoreInitial && transaction.type === 'initial'),
    ).length,

  setAll: async (wallets) => {
    await walletsStorage.save(wallets);
    updateSnapshot({ wallets });
    set({ wallets, hydrated: true });
  },

  merge: async (incoming) => {
    const map = new Map(get().wallets.map((wallet) => [wallet.id, wallet]));
    for (const wallet of incoming) map.set(wallet.id, wallet);
    await get().setAll([...map.values()]);
  },

  reset: () => {
    updateSnapshot({ wallets: [] });
    set({ wallets: [], userId: null, hydrated: false });
  },
}));

/** Used by tests/utilities that build a wallet without the store. */
export function walletTypeLabel(type: WalletType, language: 'id' | 'en' = 'id'): string {
  return translate(`wallet.type.${type}` as never, language);
}

export const walletSelectors = {
  byId: (id: ID): Wallet | undefined => walletById(id),
};
