/**
 * Cross-store snapshot registry.
 *
 * Stores need to validate against each other's data (the ledger needs wallets
 * and savings targets; the wallet store needs the ledger to compute balances).
 * Importing store modules into each other would create cycles, so every store
 * publishes its latest array here and reads the others' through `getSnapshot()`.
 *
 * The snapshot is derived state only — AsyncStorage remains the source of truth.
 */
import type { Budget, ID, SavingsTarget, Transaction, Wallet } from '../types';

interface StoreSnapshot {
  wallets: Wallet[];
  transactions: Transaction[];
  targets: SavingsTarget[];
  budgets: Budget[];
}

const EMPTY: StoreSnapshot = {
  wallets: [],
  transactions: [],
  targets: [],
  budgets: [],
};

let snapshot: StoreSnapshot = EMPTY;

export function getSnapshot(): StoreSnapshot {
  return snapshot;
}

export function updateSnapshot(partial: Partial<StoreSnapshot>): void {
  snapshot = { ...snapshot, ...partial };
}

export function resetSnapshot(): void {
  snapshot = EMPTY;
}

/* ------------------------------ Convenience -------------------------------- */

export function walletById(id: ID | undefined): Wallet | undefined {
  if (!id) return undefined;
  return snapshot.wallets.find((wallet) => wallet.id === id);
}

export function targetById(id: ID | undefined): SavingsTarget | undefined {
  if (!id) return undefined;
  return snapshot.targets.find((target) => target.id === id);
}

/** Ledger rows that reference a wallet in any role. */
export function transactionsForWallet(walletId: ID): Transaction[] {
  return snapshot.transactions.filter(
    (transaction) =>
      transaction.walletSourceId === walletId || transaction.walletDestinationId === walletId,
  );
}

export function transactionsForTarget(targetId: ID): Transaction[] {
  return snapshot.transactions.filter((transaction) => transaction.savingsTargetId === targetId);
}
