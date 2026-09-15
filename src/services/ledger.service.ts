/**
 * Ledger validation — the guard rail around every write.
 *
 * Rule: a mutation is only committed when the FULL prospective ledger is
 * valid. That means no wallet or savings target may have a negative balance on
 * ANY date, not just "today".
 */
import type {
  ID,
  ISODate,
  LedgerError,
  LedgerValidationResult,
  SavingsTarget,
  Transaction,
  TransactionType,
  Wallet,
} from '../types';
import { MAX_AMOUNT, MIN_AMOUNT } from '../utils/constants';
import { isFutureDate, isValidISODate } from '../utils/date';
import {
  savingsBalance,
  sortChronologically,
  walletBalance,
  walletDelta,
  savingsDelta,
  calculateTotalMoney as calculateTotalMoneySnapshot,
} from '../utils/calculations';

const TRANSACTION_TYPES: readonly TransactionType[] = [
  'initial',
  'income',
  'expense',
  'transfer',
  'savings_deposit',
  'savings_withdraw',
];

/* -------------------------------------------------------------------------- */
/*                            Structural validation                           */
/* -------------------------------------------------------------------------- */

/** Validates a single ledger row in isolation. */
export function validateTransactionShape(
  transaction: Transaction,
  options: { today?: ISODate } = {},
): LedgerError[] {
  const errors: LedgerError[] = [];
  const push = (error: LedgerError) => errors.push(error);
  const ref = { transactionId: transaction.id, date: transaction.date };

  if (!TRANSACTION_TYPES.includes(transaction.type)) {
    push({ code: 'type_invalid', ...ref, detail: `Unknown type "${transaction.type}"` });
  }

  const { amount } = transaction;
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    !Number.isInteger(amount) ||
    amount < MIN_AMOUNT ||
    amount > MAX_AMOUNT
  ) {
    push({
      code: 'amount_invalid',
      ...ref,
      detail: `Amount must be a positive integer ≤ ${MAX_AMOUNT} (received ${String(amount)})`,
    });
  }

  if (!isValidISODate(transaction.date)) {
    push({ code: 'date_invalid', ...ref, detail: `Invalid date "${transaction.date}"` });
  } else if (isFutureDate(transaction.date, options.today ? new Date(`${options.today}T12:00:00`) : undefined)) {
    push({ code: 'date_future', ...ref, detail: 'Transaction date is in the future' });
  }

  switch (transaction.type) {
    case 'income':
    case 'expense':
    case 'initial':
      if (!transaction.walletSourceId) {
        push({ code: 'missing_source_wallet', ...ref });
      }
      break;
    case 'transfer':
      if (!transaction.walletSourceId) push({ code: 'missing_source_wallet', ...ref });
      if (!transaction.walletDestinationId) push({ code: 'missing_destination_wallet', ...ref });
      if (
        transaction.walletSourceId &&
        transaction.walletDestinationId &&
        transaction.walletSourceId === transaction.walletDestinationId
      ) {
        push({ code: 'transfer_same_wallet', ...ref });
      }
      break;
    case 'savings_deposit':
    case 'savings_withdraw':
      if (!transaction.walletSourceId) push({ code: 'missing_source_wallet', ...ref });
      if (!transaction.savingsTargetId) push({ code: 'missing_savings_target', ...ref });
      break;
    default:
      break;
  }

  return errors;
}

/* -------------------------------------------------------------------------- */
/*                                Full ledger                                 */
/* -------------------------------------------------------------------------- */

/**
 * Validates an entire ledger: structural rules, referential integrity and the
 * historical balance rule (no negative balances, ever).
 *
 * @param transactions Ledger snapshot to check (may be a prospective one).
 * @param wallets      Wallets referenced by the ledger.
 * @param targets      Savings targets referenced by the ledger.
 */
export function validateLedger(
  transactions: Transaction[],
  wallets: Wallet[] = [],
  targets: SavingsTarget[] = [],
): LedgerValidationResult {
  const errors: LedgerError[] = [];
  const walletIds = new Set(wallets.map((wallet) => wallet.id));
  const targetIds = new Set(targets.map((target) => target.id));

  for (const transaction of sortChronologically(transactions)) {
    errors.push(...validateTransactionShape(transaction));

    for (const walletId of [transaction.walletSourceId, transaction.walletDestinationId]) {
      if (walletId && wallets.length > 0 && !walletIds.has(walletId)) {
        errors.push({
          code: 'unknown_wallet',
          transactionId: transaction.id,
          walletId,
          date: transaction.date,
        });
      }
    }

    if (
      transaction.savingsTargetId &&
      targets.length > 0 &&
      !targetIds.has(transaction.savingsTargetId)
    ) {
      errors.push({
        code: 'unknown_target',
        transactionId: transaction.id,
        targetId: transaction.savingsTargetId,
        date: transaction.date,
      });
    }
  }

  errors.push(...findNegativeWalletBalances(transactions, wallets));
  errors.push(...findNegativeSavingsBalances(transactions, targets));

  return { valid: errors.length === 0, errors };
}

/** Detects the first date on which a wallet would dip below zero. */
export function findNegativeWalletBalances(
  transactions: Transaction[],
  wallets: Wallet[],
): LedgerError[] {
  const errors: LedgerError[] = [];

  for (const wallet of wallets) {
    let balance = 0;
    const reported = new Set<ISODate>();

    for (const transaction of sortChronologically(transactions)) {
      const delta = walletDelta(transaction, wallet.id);
      if (delta === 0) continue;
      balance += delta;
      if (balance < 0 && !reported.has(transaction.date) && errors.length < 12) {
        reported.add(transaction.date);
        errors.push({
          code: 'negative_wallet_balance',
          transactionId: transaction.id,
          walletId: wallet.id,
          date: transaction.date,
          detail: `${wallet.name} would be ${balance} on ${transaction.date}`,
        });
      }
    }
  }

  return errors;
}

/** Detects the first date on which a savings target would dip below zero. */
export function findNegativeSavingsBalances(
  transactions: Transaction[],
  targets: SavingsTarget[],
): LedgerError[] {
  const errors: LedgerError[] = [];

  for (const target of targets) {
    let balance = 0;
    const reported = new Set<ISODate>();

    for (const transaction of sortChronologically(transactions)) {
      const delta = savingsDelta(transaction, target.id);
      if (delta === 0) continue;
      balance += delta;
      if (balance < 0 && !reported.has(transaction.date) && errors.length < 12) {
        reported.add(transaction.date);
        errors.push({
          code: 'negative_savings_balance',
          transactionId: transaction.id,
          targetId: target.id,
          date: transaction.date,
          detail: `${target.name} would be ${balance} on ${transaction.date}`,
        });
      }
    }
  }

  return errors;
}

/* -------------------------------------------------------------------------- */
/*                          Prospective-change helper                         */
/* -------------------------------------------------------------------------- */

export interface LedgerChangeRequest {
  /** Current ledger (what is stored today). */
  current: Transaction[];
  /** Ledger after the mutation (added / edited / deleted rows applied). */
  next: Transaction[];
  wallets: Wallet[];
  targets: SavingsTarget[];
}

/**
 * Compares the current and prospective ledgers and returns a validation result
 * for the prospective one, tagging which entity would go negative so the UI can
 * show a precise message.
 */
export function validateLedgerChange(request: LedgerChangeRequest): LedgerValidationResult {
  return validateLedger(request.next, request.wallets, request.targets);
}

/** Human-readable summary of the first ledger error (used by stores/toasts). */
export function describeLedgerError(error: LedgerError, translateFn?: (key: string) => string): string {
  const t = translateFn ?? ((key: string) => key);
  switch (error.code) {
    case 'negative_wallet_balance':
      return error.detail ?? t('error.negative_wallet_saldo');
    case 'negative_savings_balance':
      return error.detail ?? t('error.negative_savings_saldo');
    case 'amount_invalid':
      return error.detail ?? t('error.amount_not_positive');
    case 'date_future':
      return t('error.date_future');
    case 'date_invalid':
      return t('error.date_invalid_format');
    case 'transfer_same_wallet':
      return t('error.transfer_same_wallet');
    case 'missing_source_wallet':
      return t('error.wallet_required');
    case 'missing_destination_wallet':
      return t('error.destination_required');
    case 'missing_savings_target':
      return t('error.target_required');
    case 'unknown_wallet':
      return t('error.wallet_not_found');
    case 'unknown_target':
      return t('error.target_not_found');
    default:
      return t('error.unknown');
  }
}

/* -------------------------------------------------------------------------- */
/*                        Public calculation re-exports                        */
/* -------------------------------------------------------------------------- */

/** Balance of one wallet up to (and including) `date`. */
export function calculateWalletBalance(
  transactions: Transaction[],
  walletId: ID,
  date?: ISODate,
): number {
  return walletBalance(transactions, walletId, date);
}

/** Deposits − withdrawals for one savings target up to `date`. */
export function calculateSavingsBalance(
  transactions: Transaction[],
  targetId: ID,
  date?: ISODate,
): number {
  return savingsBalance(transactions, targetId, date);
}

/**
 * Sum of every wallet balance plus every savings balance.
 * Savings deposits move money between the two buckets, so nothing is counted
 * twice.
 */
export function calculateTotalMoney(
  transactions: Transaction[],
  wallets: Wallet[],
  targets: SavingsTarget[],
  date?: ISODate,
): number {
  return calculateTotalMoneySnapshot(transactions, wallets, targets, date).total;
}

/** Maximum amount a wallet can move on a given date without going negative. */
export function availableWalletBalance(
  transactions: Transaction[],
  walletId: ID,
  date: ISODate,
): number {
  const upToDate = walletBalance(transactions, walletId, date);
  return upToDate;
}

export const ledger = {
  validateLedger,
  validateLedgerChange,
  validateTransactionShape,
  findNegativeWalletBalances,
  findNegativeSavingsBalances,
  calculateWalletBalance,
  calculateSavingsBalance,
  calculateTotalMoney,
  describeLedgerError,
};

export type LedgerService = typeof ledger;
