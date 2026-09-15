/**
 * Savings hooks — targets with live progress plus deposit / withdrawal.
 *
 * Deposits and withdrawals go through the ledger (transaction store), which
 * enforces that neither the wallet nor the savings balance can go negative.
 */
import { useCallback, useMemo } from 'react';
import type {
  ID,
  MutationResult,
  SavingsMovementInput,
  SavingsTarget,
  SavingsTargetInput,
  TargetProgress,
  Transaction,
} from '../types';
import { useSavingsStore } from '../store/savingsStore';
import { useTransactionStore } from '../store/transactionStore';
import { calculateTargetProgress } from '../utils/calculations';
import { todayISO } from '../utils/date';

export interface SavingsApi {
  progressList: TargetProgress[];
  targets: SavingsTarget[];
  totals: { saved: number; goal: number; percentage: number; remaining: number };
  completedCount: number;
  addTarget: (input: SavingsTargetInput) => Promise<MutationResult<SavingsTarget>>;
  editTarget: (id: ID, input: SavingsTargetInput) => Promise<MutationResult<SavingsTarget>>;
  deleteTarget: (id: ID) => Promise<MutationResult<undefined>>;
  deposit: (input: SavingsMovementInput) => Promise<MutationResult<Transaction>>;
  withdraw: (input: SavingsMovementInput) => Promise<MutationResult<Transaction>>;
  getProgress: (targetId: ID) => TargetProgress | null;
  getMovements: (targetId: ID) => Transaction[];
  isEmpty: boolean;
}

export function useSavings(): SavingsApi {
  const targets = useSavingsStore((state) => state.targets);
  const transactions = useTransactionStore((state) => state.transactions);
  const addAction = useSavingsStore((state) => state.addTarget);
  const editAction = useSavingsStore((state) => state.editTarget);
  const deleteAction = useSavingsStore((state) => state.deleteTarget);
  const depositAction = useSavingsStore((state) => state.depositToTarget);
  const withdrawAction = useSavingsStore((state) => state.withdrawFromTarget);

  const progressList = useMemo(
    () =>
      targets
        .map((target) => calculateTargetProgress(target, transactions, todayISO()))
        .sort((a, b) => b.percentage - a.percentage),
    [targets, transactions],
  );

  const totals = useMemo(() => {
    const saved = progressList.reduce((sum, progress) => sum + progress.saved, 0);
    const goal = progressList.reduce((sum, progress) => sum + progress.target.goalAmount, 0);
    return {
      saved,
      goal,
      remaining: Math.max(0, goal - saved),
      percentage: goal > 0 ? Math.round((saved / goal) * 100) : 0,
    };
  }, [progressList]);

  const getProgress = useCallback(
    (targetId: ID) => {
      const target = targets.find((item) => item.id === targetId);
      if (!target) return null;
      return calculateTargetProgress(target, transactions, todayISO());
    },
    [targets, transactions],
  );

  const getMovements = useCallback(
    (targetId: ID) =>
      transactions
        .filter((transaction) => transaction.savingsTargetId === targetId)
        .sort((a, b) =>
          a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1,
        ),
    [transactions],
  );

  return {
    progressList,
    targets,
    totals,
    completedCount: progressList.filter((progress) => progress.isComplete).length,
    addTarget: addAction,
    editTarget: editAction,
    deleteTarget: deleteAction,
    deposit: depositAction,
    withdraw: withdrawAction,
    getProgress,
    getMovements,
    isEmpty: targets.length === 0,
  };
}

/** Single target detail view. */
export function useSavingsTarget(targetId: ID) {
  const targets = useSavingsStore((state) => state.targets);
  const transactions = useTransactionStore((state) => state.transactions);

  const target = useMemo(() => targets.find((item) => item.id === targetId), [targets, targetId]);
  const progress = useMemo(
    () => (target ? calculateTargetProgress(target, transactions, todayISO()) : null),
    [target, transactions],
  );
  const movements = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.savingsTargetId === targetId)
        .sort((a, b) =>
          a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1,
        ),
    [targetId, transactions],
  );

  return { target, progress, movements };
}

/** Dashboard: total saved across all targets. */
export function useTotalSavings(): number {
  const targets = useSavingsStore((state) => state.targets);
  const transactions = useTransactionStore((state) => state.transactions);
  return useMemo(
    () =>
      targets.reduce((sum, target) => {
        const balance = transactions
          .filter((transaction) => transaction.savingsTargetId === target.id)
          .reduce(
            (targetSum, transaction) =>
              transaction.type === 'savings_deposit'
                ? targetSum + transaction.amount
                : transaction.type === 'savings_withdraw'
                  ? targetSum - transaction.amount
                  : targetSum,
            0,
          );
        return sum + balance;
      }, 0),
    [targets, transactions],
  );
}
