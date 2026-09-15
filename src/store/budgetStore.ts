/**
 * Budget store — one limit per category per month (`YYYY-MM`).
 */
import { create } from 'zustand';
import type {
  Budget,
  BudgetInput,
  BudgetUsage,
  CategoryKey,
  ID,
  MutationResult,
  YearMonth,
} from '../types';
import { budgetsStorage, createId } from '../services/storage.service';
import { calculateBudgetUsage } from '../utils/calculations';
import { nowISOString } from '../utils/date';
import { translate } from '../utils/constants';
import { validateBudgetInput } from '../utils/validation';
import { getSnapshot, updateSnapshot } from './snapshot';

interface BudgetState {
  budgets: Budget[];
  userId: ID | null;
  hydrated: boolean;
  hydrate: (userId: ID) => Promise<void>;
  addBudget: (input: BudgetInput) => Promise<MutationResult<Budget>>;
  editBudget: (
    id: ID,
    input: Partial<Pick<BudgetInput, 'category' | 'limitAmount'>>,
  ) => Promise<MutationResult<Budget>>;
  deleteBudget: (id: ID) => Promise<MutationResult<undefined>>;
  getBudgetsForMonth: (monthYear: YearMonth) => BudgetUsage[];
  getBudgetUsage: (category: CategoryKey, monthYear: YearMonth) => BudgetUsage | null;
  setAll: (budgets: Budget[]) => Promise<void>;
  merge: (budgets: Budget[]) => Promise<void>;
  reset: () => void;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  userId: null,
  hydrated: false,

  hydrate: async (userId) => {
    try {
      const budgets = (await budgetsStorage.load()).filter((budget) => budget.userId === userId);
      updateSnapshot({ budgets });
      set({ budgets, userId, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  addBudget: async (input) => {
    const userId = get().userId ?? '';
    const validation = validateBudgetInput(input, {
      wallets: getSnapshot().wallets,
      targets: getSnapshot().targets,
      budgets: get().budgets,
    });

    if (!validation.ok || !validation.value) {
      const [field] = Object.keys(validation.errors);
      const key = validation.errors[field as keyof typeof validation.errors] ?? 'unknown';
      return { ok: false, error: translate(`error.${key}` as never), errors: validation.errors };
    }

    const budget: Budget = {
      id: createId('bgt'),
      userId,
      category: validation.value.category,
      monthYear: validation.value.monthYear,
      limitAmount: validation.value.limitAmount,
      createdAt: nowISOString(),
    };

    const next = [...get().budgets, budget];
    try {
      await budgetsStorage.save(next);
    } catch {
      return { ok: false, error: translate('error.storage') };
    }

    updateSnapshot({ budgets: next });
    set({ budgets: next });
    return { ok: true, data: budget };
  },

  editBudget: async (id, input) => {
    const current = get().budgets.find((budget) => budget.id === id);
    if (!current) return { ok: false, error: translate('error.unknown') };

    // The month is fixed once a budget exists; only the limit (and optionally
    // the category) can change.
    const merged: BudgetInput = {
      category: input.category ?? current.category,
      monthYear: current.monthYear,
      limitAmount: input.limitAmount ?? current.limitAmount,
    };

    const validation = validateBudgetInput(
      merged,
      { wallets: getSnapshot().wallets, targets: getSnapshot().targets, budgets: get().budgets },
      { budgetId: id },
    );

    if (!validation.ok || !validation.value) {
      const [field] = Object.keys(validation.errors);
      const key = validation.errors[field as keyof typeof validation.errors] ?? 'unknown';
      return { ok: false, error: translate(`error.${key}` as never), errors: validation.errors };
    }

    const updated: Budget = {
      ...current,
      category: validation.value.category,
      limitAmount: validation.value.limitAmount,
    };

    const next = get().budgets.map((budget) => (budget.id === id ? updated : budget));
    try {
      await budgetsStorage.save(next);
    } catch {
      return { ok: false, error: translate('error.storage') };
    }

    updateSnapshot({ budgets: next });
    set({ budgets: next });
    return { ok: true, data: updated };
  },

  deleteBudget: async (id) => {
    const next = get().budgets.filter((budget) => budget.id !== id);
    try {
      await budgetsStorage.save(next);
    } catch {
      return { ok: false, error: translate('error.storage') };
    }
    updateSnapshot({ budgets: next });
    set({ budgets: next });
    return { ok: true, data: undefined };
  },

  getBudgetsForMonth: (monthYear) => {
    const transactions = getSnapshot().transactions;
    return get()
      .budgets.filter((budget) => budget.monthYear === monthYear)
      .map((budget) => calculateBudgetUsage(budget, transactions))
      .sort((a, b) => b.used - a.used);
  },

  getBudgetUsage: (category, monthYear) => {
    const budget = get().budgets.find(
      (item) => item.category === category && item.monthYear === monthYear,
    );
    if (!budget) return null;
    return calculateBudgetUsage(budget, getSnapshot().transactions);
  },

  setAll: async (budgets) => {
    await budgetsStorage.save(budgets);
    updateSnapshot({ budgets });
    set({ budgets, hydrated: true });
  },

  merge: async (incoming) => {
    const map = new Map<string, Budget>();
    for (const budget of get().budgets) map.set(`${budget.category}:${budget.monthYear}`, budget);
    for (const budget of incoming) map.set(`${budget.category}:${budget.monthYear}`, budget);
    await get().setAll([...map.values()]);
  },

  reset: () => {
    updateSnapshot({ budgets: [] });
    set({ budgets: [], userId: null, hydrated: false });
  },
}));

/** Categories that still have no budget in the given month. */
export function availableBudgetCategories(
  budgets: Budget[],
  monthYear: YearMonth,
  allCategories: CategoryKey[],
): CategoryKey[] {
  const used = new Set(
    budgets.filter((budget) => budget.monthYear === monthYear).map((budget) => budget.category),
  );
  return allCategories.filter((category) => !used.has(category));
}
