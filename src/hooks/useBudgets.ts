/**
 * Budget hooks — per category, per month usage with green/orange/red status.
 */
import { useCallback, useMemo, useState } from 'react';
import type { Budget, BudgetInput, BudgetUsage, CategoryKey, ID, MutationResult, YearMonth } from '../types';
import { useBudgetStore, availableBudgetCategories } from '../store/budgetStore';
import { useTransactionStore } from '../store/transactionStore';
import { BUDGET_CATEGORY_KEYS } from '../utils/constants';
import { calculateBudgetUsage } from '../utils/calculations';
import { currentMonthYear } from '../utils/date';

export interface BudgetsApi {
  monthYear: YearMonth;
  setMonthYear: (monthYear: YearMonth) => void;
  usages: BudgetUsage[];
  totals: { limit: number; used: number; remaining: number; percentage: number };
  exceededCount: number;
  availableCategories: CategoryKey[];
  addBudget: (input: BudgetInput) => Promise<MutationResult<Budget>>;
  editBudget: (
    id: ID,
    input: Partial<Pick<BudgetInput, 'category' | 'limitAmount'>>,
  ) => Promise<MutationResult<Budget>>;
  deleteBudget: (id: ID) => Promise<MutationResult<undefined>>;
  getUsage: (category: CategoryKey) => BudgetUsage | null;
}

export function useBudgets(initialMonth: YearMonth = currentMonthYear()): BudgetsApi {
  const [monthYear, setMonthYear] = useState<YearMonth>(initialMonth);
  const budgets = useBudgetStore((state) => state.budgets);
  const transactions = useTransactionStore((state) => state.transactions);
  const addAction = useBudgetStore((state) => state.addBudget);
  const editAction = useBudgetStore((state) => state.editBudget);
  const deleteAction = useBudgetStore((state) => state.deleteBudget);

  const usages = useMemo(() => {
    // Same math as the store, recomputed here so the hook re-renders when the
    // ledger changes (e.g. right after adding an expense).
    return budgets
      .filter((budget) => budget.monthYear === monthYear)
      .map((budget) => calculateBudgetUsage(budget, transactions))
      .sort((a, b) => b.ratio - a.ratio);
  }, [budgets, monthYear, transactions]);

  const totals = useMemo(() => {
    const limit = usages.reduce((sum, usage) => sum + usage.budget.limitAmount, 0);
    const used = usages.reduce((sum, usage) => sum + usage.used, 0);
    return {
      limit,
      used,
      remaining: Math.max(0, limit - used),
      percentage: limit > 0 ? Math.round((used / limit) * 100) : 0,
    };
  }, [usages]);

  const availableCategories = useMemo(
    () => availableBudgetCategories(budgets, monthYear, BUDGET_CATEGORY_KEYS),
    [budgets, monthYear],
  );

  const getUsage = useCallback(
    (category: CategoryKey) =>
      usages.find((usage) => usage.budget.category === category) ?? null,
    [usages],
  );

  return {
    monthYear,
    setMonthYear,
    usages,
    totals,
    exceededCount: usages.filter((usage) => usage.status === 'exceeded').length,
    availableCategories,
    addBudget: addAction,
    editBudget: editAction,
    deleteBudget: deleteAction,
    getUsage,
  };
}

/** Dashboard helper: how many budgets are already exceeded this month. */
export function useBudgetAlertCount(): number {
  const budgets = useBudgetStore((state) => state.budgets);
  const transactions = useTransactionStore((state) => state.transactions);
  return useMemo(() => {
    const monthYear = currentMonthYear();
    return budgets
      .filter((budget) => budget.monthYear === monthYear)
      .map((budget) => calculateBudgetUsage(budget, transactions))
      .filter((usage) => usage.status === 'exceeded').length;
  }, [budgets, transactions]);
}
