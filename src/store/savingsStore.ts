/**
 * Savings store.
 *
 * Deposits and withdrawals are NOT stored here — they are ledger transactions
 * (`savings_deposit` / `savings_withdraw`), so the transaction store owns them
 * and the ledger validator guarantees balances never go negative.
 */
import { create } from 'zustand';
import type {
  ID,
  ISODate,
  MutationResult,
  SavingsMovementInput,
  SavingsTarget,
  SavingsTargetInput,
  TargetProgress,
  Transaction,
} from '../types';
import { createId, savingsStorage } from '../services/storage.service';
import { calculateTargetProgress } from '../utils/calculations';
import { nowISOString, todayISO } from '../utils/date';
import { translate } from '../utils/constants';
import { validateSavingsTargetInput } from '../utils/validation';
import { getSnapshot, transactionsForTarget, updateSnapshot } from './snapshot';
import { useTransactionStore } from './transactionStore';

interface SavingsState {
  targets: SavingsTarget[];
  userId: ID | null;
  hydrated: boolean;
  hydrate: (userId: ID) => Promise<void>;
  addTarget: (input: SavingsTargetInput) => Promise<MutationResult<SavingsTarget>>;
  editTarget: (id: ID, input: SavingsTargetInput) => Promise<MutationResult<SavingsTarget>>;
  deleteTarget: (id: ID) => Promise<MutationResult<undefined>>;
  depositToTarget: (input: SavingsMovementInput) => Promise<MutationResult<Transaction>>;
  withdrawFromTarget: (input: SavingsMovementInput) => Promise<MutationResult<Transaction>>;
  getTargetProgress: (targetId: ID) => TargetProgress | null;
  getTargetsWithProgress: () => TargetProgress[];
  getTargetMovements: (targetId: ID) => Transaction[];
  setAll: (targets: SavingsTarget[]) => Promise<void>;
  merge: (targets: SavingsTarget[]) => Promise<void>;
  reset: () => void;
}

export const useSavingsStore = create<SavingsState>((set, get) => ({
  targets: [],
  userId: null,
  hydrated: false,

  hydrate: async (userId) => {
    try {
      const targets = (await savingsStorage.load()).filter((target) => target.userId === userId);
      updateSnapshot({ targets });
      set({ targets, userId, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  addTarget: async (input) => {
    const validation = validateSavingsTargetInput(input, {
      wallets: getSnapshot().wallets,
      targets: get().targets,
      budgets: getSnapshot().budgets,
    });

    if (!validation.ok || !validation.value) {
      const [field] = Object.keys(validation.errors);
      const key = validation.errors[field as keyof typeof validation.errors] ?? 'unknown';
      return { ok: false, error: translate(`error.${key}` as never), errors: validation.errors };
    }

    const target: SavingsTarget = {
      id: createId('sav'),
      userId: get().userId ?? '',
      name: validation.value.name.trim(),
      goalAmount: validation.value.goalAmount,
      dueDate: validation.value.dueDate ? validation.value.dueDate : undefined,
      createdAt: todayISO(),
      updatedAt: nowISOString(),
    };

    const next = [...get().targets, target];
    try {
      await savingsStorage.save(next);
    } catch {
      return { ok: false, error: translate('error.storage') };
    }

    updateSnapshot({ targets: next });
    set({ targets: next });
    return { ok: true, data: target };
  },

  editTarget: async (id, input) => {
    const current = get().targets.find((target) => target.id === id);
    if (!current) return { ok: false, error: translate('error.target_not_found') };

    const validation = validateSavingsTargetInput(
      input,
      { wallets: getSnapshot().wallets, targets: get().targets, budgets: getSnapshot().budgets },
      { targetId: id },
    );

    if (!validation.ok || !validation.value) {
      const [field] = Object.keys(validation.errors);
      const key = validation.errors[field as keyof typeof validation.errors] ?? 'unknown';
      return { ok: false, error: translate(`error.${key}` as never), errors: validation.errors };
    }

    const updated: SavingsTarget = {
      ...current,
      name: validation.value.name.trim(),
      goalAmount: validation.value.goalAmount,
      dueDate: validation.value.dueDate ? validation.value.dueDate : undefined,
      updatedAt: nowISOString(),
    };

    const next = get().targets.map((target) => (target.id === id ? updated : target));
    try {
      await savingsStorage.save(next);
    } catch {
      return { ok: false, error: translate('error.storage') };
    }

    updateSnapshot({ targets: next });
    set({ targets: next });
    return { ok: true, data: updated };
  },

  deleteTarget: async (id) => {
    const movements = transactionsForTarget(id);
    if (movements.length > 0) {
      return { ok: false, error: translate('error.target_has_history') };
    }

    const next = get().targets.filter((target) => target.id !== id);
    try {
      await savingsStorage.save(next);
    } catch {
      return { ok: false, error: translate('error.storage') };
    }

    updateSnapshot({ targets: next });
    set({ targets: next });
    return { ok: true, data: undefined };
  },

  depositToTarget: async (input) => {
    const target = get().targets.find((item) => item.id === input.targetId);
    if (!target) return { ok: false, error: translate('error.target_not_found') };

    return useTransactionStore.getState().addTransaction({
      type: 'savings_deposit',
      amount: input.amount,
      date: input.date ?? todayISO(),
      category: 'savings',
      description: input.description ?? `${translate('savings.deposit')} — ${target.name}`,
      walletSourceId: input.walletId,
      savingsTargetId: input.targetId,
    });
  },

  withdrawFromTarget: async (input) => {
    const target = get().targets.find((item) => item.id === input.targetId);
    if (!target) return { ok: false, error: translate('error.target_not_found') };

    return useTransactionStore.getState().addTransaction({
      type: 'savings_withdraw',
      amount: input.amount,
      date: input.date ?? todayISO(),
      category: 'savings',
      description: input.description ?? `${translate('savings.withdraw')} — ${target.name}`,
      walletSourceId: input.walletId,
      walletDestinationId: input.walletId,
      savingsTargetId: input.targetId,
    });
  },

  getTargetProgress: (targetId) => {
    const target = get().targets.find((item) => item.id === targetId);
    if (!target) return null;
    return calculateTargetProgress(target, getSnapshot().transactions);
  },

  getTargetsWithProgress: () => {
    const transactions = getSnapshot().transactions;
    return get()
      .targets.map((target) => calculateTargetProgress(target, transactions))
      .sort((a, b) => b.percentage - a.percentage);
  },

  getTargetMovements: (targetId) =>
    transactionsForTarget(targetId)
      .slice()
      .sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1)),

  setAll: async (targets) => {
    await savingsStorage.save(targets);
    updateSnapshot({ targets });
    set({ targets, hydrated: true });
  },

  merge: async (incoming) => {
    const map = new Map(get().targets.map((target) => [target.id, target]));
    for (const target of incoming) map.set(target.id, target);
    await get().setAll([...map.values()]);
  },

  reset: () => {
    updateSnapshot({ targets: [] });
    set({ targets: [], userId: null, hydrated: false });
  },
}));

/** Total saved across every target (== sum of savings balances). */
export function totalSavings(targets: SavingsTarget[], transactions: Transaction[]): number {
  return targets.reduce((sum, target) => {
    const movements = transactions.filter((transaction) => transaction.savingsTargetId === target.id);
    return (
      sum +
      movements.reduce(
        (targetSum, transaction) =>
          transaction.type === 'savings_deposit'
            ? targetSum + transaction.amount
            : transaction.type === 'savings_withdraw'
              ? targetSum - transaction.amount
              : targetSum,
        0,
      )
    );
  }, 0);
}

export function formatDueHint(progress: TargetProgress): {
  key: string;
  days: number | null;
} {
  if (progress.daysLeft === null) return { key: 'savings.no_due_date', days: null };
  if (progress.daysLeft < 0) return { key: 'savings.overdue', days: progress.daysLeft };
  if (progress.daysLeft === 0) return { key: 'savings.due_today', days: 0 };
  return { key: 'savings.days_left', days: progress.daysLeft };
}

export type { ISODate };
