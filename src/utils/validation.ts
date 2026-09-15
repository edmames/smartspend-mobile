/**
 * Input validation for every form in the app.
 *
 * Validators are pure: they receive the input plus a snapshot of existing
 * entities and return a `ValidationResult` with per-field error codes that the
 * UI translates and the stores enforce a second time before persisting.
 */
import type {
  Budget,
  BudgetInput,
  ID,
  ISODate,
  SavingsTarget,
  SavingsTargetInput,
  TransactionInput,
  User,
  ValidationErrorCode,
  ValidationResult,
  Wallet,
  WalletInput,
  WalletBrand,
  WalletType,
} from '../types';
import {
  BUDGET_CATEGORY_KEYS,
  EXPENSE_CATEGORY_KEYS,
  WALLET_BRANDS,
  WALLET_BRAND_META,
  INCOME_CATEGORY_KEYS,
  MAX_AMOUNT,
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  PAYMENT_METHOD_META,
  WALLET_TYPES,
} from './constants';
import { isFutureDate, isValidISODate, isValidYearMonth } from './date';
import { parseAmountInput } from './formatting';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidationContext {
  wallets: Wallet[];
  targets: SavingsTarget[];
  budgets: Budget[];
  users?: User[];
  today?: ISODate;
}

function result<T>(
  errors: Partial<Record<string, ValidationErrorCode>>,
  value?: T,
): ValidationResult<T> {
  return { ok: Object.keys(errors).length === 0, value, errors };
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/* -------------------------------------------------------------------------- */
/*                                  Amounts                                   */
/* -------------------------------------------------------------------------- */

/** Validates a raw amount string (as typed by the user). */
export function validateAmountString(
  raw: string,
  field = 'amount',
): ValidationResult<number> {
  const parsed = parseAmountInput(raw);
  if (!parsed.ok || parsed.value === undefined) {
    return result({ [field]: (parsed.error ?? 'amount_invalid_characters') as ValidationErrorCode });
  }
  return result({}, parsed.value);
}

/** Validates an already-numeric amount (used by stores). */
export function validateAmountValue(
  value: unknown,
  field = 'amount',
): ValidationResult<number> {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return result({ [field]: 'amount_required' });
  }
  if (!Number.isFinite(value)) return result({ [field]: 'amount_invalid_characters' });
  if (!Number.isInteger(value)) return result({ [field]: 'amount_not_integer' });
  if (value <= 0) return result({ [field]: 'amount_not_positive' });
  if (value > MAX_AMOUNT) return result({ [field]: 'amount_too_large' });
  return result({}, value);
}

/* -------------------------------------------------------------------------- */
/*                                   Wallet                                   */
/* -------------------------------------------------------------------------- */

export interface WalletValidationResult extends ValidationResult<WalletInput> {
  /** Normalized payload ready to be persisted. */
  normalized?: {
    name: string;
    type: WalletType;
    brand: WalletBrand | null;
    initialBalance: number | null;
  };
}

export function validateWalletInput(
  input: WalletInput,
  context: ValidationContext,
  options: { walletId?: ID } = {},
): WalletValidationResult {
  const errors: Partial<Record<string, ValidationErrorCode>> = {};
  const name = (input.name ?? '').trim().replace(/\s+/g, ' ');

  if (!name) errors.name = 'name_required';
  else if (name.length > MAX_NAME_LENGTH) errors.name = 'name_too_long';
  else {
    const clash = context.wallets.some(
      (wallet) => wallet.id !== options.walletId && normalizeName(wallet.name) === normalizeName(name),
    );
    if (clash) errors.name = 'wallet_duplicate';
  }

  if (!WALLET_TYPES.includes(input.type)) errors.type = 'type_invalid';

  /**
   * Provider mark: optional, but it has to be a known brand *and* belong to the
   * chosen type (a `cash` wallet cannot be a BCA account).
   */
  let brand: WalletBrand | null = null;
  const rawBrand = input.brand;
  if (rawBrand !== null && rawBrand !== undefined && String(rawBrand).trim() !== '') {
    const candidate = String(rawBrand) as WalletBrand;
    if (!(candidate in WALLET_BRAND_META)) {
      errors.brand = 'brand_invalid';
    } else if (!WALLET_BRANDS[input.type]?.includes(candidate)) {
      errors.brand = 'brand_type_mismatch';
    } else {
      brand = candidate;
    }
  }

  let initialBalance: number | null = null;
  const rawBalance = input.initialBalance;
  // An empty field — or a literal 0 — means "no opening balance". Either way no
  // `initial` transaction is created (spec: an empty balance ≠ a zero entry).
  const hasBalanceInput =
    rawBalance !== null && rawBalance !== undefined && String(rawBalance).trim() !== '' && rawBalance !== 0;
  if (hasBalanceInput) {
    const validation = validateAmountValue(rawBalance, 'initialBalance');
    if (!validation.ok) {
      errors.initialBalance = validation.errors.initialBalance;
    } else {
      initialBalance = validation.value ?? null;
    }
  }

  return {
    ...result(errors, input),
    normalized: { name, type: input.type, brand, initialBalance },
  };
}

/** A wallet may only be deleted while it has zero ledger history. */
export function walletHasHistory(_walletId: ID, transactionsCount: number): boolean {
  return transactionsCount > 0;
}

/* -------------------------------------------------------------------------- */
/*                                Transaction                                 */
/* -------------------------------------------------------------------------- */

const ALLOWED_TYPES = [
  'income',
  'expense',
  'transfer',
  'savings_deposit',
  'savings_withdraw',
] as const;

export function validateTransactionInput(
  input: TransactionInput,
  context: ValidationContext,
): ValidationResult<TransactionInput> {
  const errors: Partial<Record<string, ValidationErrorCode>> = {};

  /* type */
  if (!(ALLOWED_TYPES as readonly string[]).includes(input.type)) {
    errors.type = 'type_invalid';
  }

  /* amount */
  const amountValidation = validateAmountValue(input.amount, 'amount');
  if (!amountValidation.ok) errors.amount = amountValidation.errors.amount;

  /* date */
  if (!input.date) errors.date = 'date_required';
  else if (!isValidISODate(input.date)) errors.date = 'date_invalid_format';
  else if (isFutureDate(input.date)) errors.date = 'date_future';

  /* category */
  const category = input.category;
  if (!category) {
    errors.category = 'category_required';
  } else if (input.type === 'income' && !INCOME_CATEGORY_KEYS.includes(category)) {
    errors.category = 'category_invalid';
  } else if (input.type === 'expense' && !EXPENSE_CATEGORY_KEYS.includes(category)) {
    errors.category = 'category_invalid';
  }

  /* description */
  if ((input.description ?? '').length > MAX_DESCRIPTION_LENGTH) {
    errors.description = 'description_too_long';
  }

  /* wallets */
  const source = context.wallets.find((wallet) => wallet.id === input.walletSourceId);
  if (!input.walletSourceId) errors.walletSourceId = 'wallet_required';
  else if (!source) errors.walletSourceId = 'wallet_not_found';

  if (input.type === 'transfer') {
    const destination = context.wallets.find((wallet) => wallet.id === input.walletDestinationId);
    if (!input.walletDestinationId) errors.walletDestinationId = 'destination_required';
    else if (!destination) errors.walletDestinationId = 'wallet_not_found';
    else if (destination.id === input.walletSourceId) errors.walletDestinationId = 'transfer_same_wallet';
  } else if (input.type === 'savings_withdraw') {
    // Withdrawals may optionally target a specific wallet; defaults to source.
    if (input.walletDestinationId && !context.wallets.some((w) => w.id === input.walletDestinationId)) {
      errors.walletDestinationId = 'wallet_not_found';
    }
  }

  /* savings target */
  if (input.type === 'savings_deposit' || input.type === 'savings_withdraw') {
    if (!input.savingsTargetId) errors.savingsTargetId = 'target_required';
    else if (!context.targets.some((target) => target.id === input.savingsTargetId)) {
      errors.savingsTargetId = 'target_not_found';
    }
  }

  /* payment method (QRIS requires a bank / e-wallet source) */
  if (input.paymentMethod) {
    const meta = PAYMENT_METHOD_META[input.paymentMethod];
    if (!meta) {
      errors.paymentMethod = 'category_invalid';
    } else if (meta.requiresNonCashWallet) {
      if (input.type !== 'expense') {
        errors.paymentMethod = 'qris_requires_non_cash_wallet';
      } else if (!source || source.type === 'cash') {
        errors.paymentMethod = 'qris_requires_non_cash_wallet';
      }
    }
  }

  return result(errors, input);
}

/* -------------------------------------------------------------------------- */
/*                              Savings target                                */
/* -------------------------------------------------------------------------- */

export function validateSavingsTargetInput(
  input: SavingsTargetInput,
  context: ValidationContext,
  options: { targetId?: ID } = {},
): ValidationResult<SavingsTargetInput> {
  const errors: Partial<Record<string, ValidationErrorCode>> = {};
  const name = (input.name ?? '').trim().replace(/\s+/g, ' ');

  if (!name) errors.name = 'name_required';
  else if (name.length > MAX_NAME_LENGTH) errors.name = 'name_too_long';
  else {
    const clash = context.targets.some(
      (target) => target.id !== options.targetId && normalizeName(target.name) === normalizeName(name),
    );
    if (clash) errors.name = 'target_duplicate';
  }

  const goal = validateAmountValue(input.goalAmount, 'goalAmount');
  if (!goal.ok) errors.goalAmount = goal.errors.goalAmount;

  if (input.dueDate !== null && input.dueDate !== undefined && input.dueDate !== '') {
    if (!isValidISODate(input.dueDate)) errors.dueDate = 'date_invalid_format';
  }

  return result(errors, { ...input, name });
}

/* -------------------------------------------------------------------------- */
/*                               Budget                                       */
/* -------------------------------------------------------------------------- */

export function validateBudgetInput(
  input: BudgetInput,
  context: ValidationContext,
  options: { budgetId?: ID } = {},
): ValidationResult<BudgetInput> {
  const errors: Partial<Record<string, ValidationErrorCode>> = {};

  if (!input.category) errors.category = 'category_required';
  else if (!BUDGET_CATEGORY_KEYS.includes(input.category)) errors.category = 'category_invalid';

  if (!isValidYearMonth(input.monthYear)) errors.monthYear = 'date_invalid_format';

  const limit = validateAmountValue(input.limitAmount, 'limitAmount');
  if (!limit.ok) {
    const code = limit.errors.limitAmount;
    errors.limitAmount =
      code === 'amount_required'
        ? 'limit_required'
        : code === 'amount_too_large'
          ? 'amount_too_large'
          : code === 'amount_not_integer'
            ? 'amount_not_integer'
            : 'limit_not_positive';
  }

  if (!errors.category && !errors.monthYear) {
    const duplicate = context.budgets.some(
      (budget) =>
        budget.id !== options.budgetId &&
        budget.category === input.category &&
        budget.monthYear === input.monthYear,
    );
    if (duplicate) errors.category = 'budget_duplicate';
  }

  return result(errors, input);
}

/* -------------------------------------------------------------------------- */
/*                                   Auth                                     */
/* -------------------------------------------------------------------------- */

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function validateRegisterInput(
  input: RegisterInput,
  context: ValidationContext,
): ValidationResult<RegisterInput> {
  const errors: Partial<Record<string, ValidationErrorCode>> = {};
  const name = (input.name ?? '').trim();
  const email = (input.email ?? '').trim().toLowerCase();

  if (!name) errors.name = 'name_required';
  else if (name.length > MAX_NAME_LENGTH) errors.name = 'name_too_long';

  if (!email) errors.email = 'email_required';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'email_invalid';
  else if (context.users?.some((user) => user.email.toLowerCase() === email)) {
    errors.email = 'email_taken';
  }

  if (!input.password) errors.password = 'password_required';
  else if (input.password.length < MIN_PASSWORD_LENGTH) errors.password = 'password_too_short';

  if (input.password !== input.confirmPassword) errors.confirmPassword = 'password_mismatch';

  return result(errors, { ...input, name, email });
}

export function validateLoginInput(input: { email: string; password: string }): ValidationResult<{
  email: string;
  password: string;
}> {
  const errors: Partial<Record<string, ValidationErrorCode>> = {};
  const email = (input.email ?? '').trim().toLowerCase();

  if (!email) errors.email = 'email_required';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'email_invalid';
  if (!input.password) errors.password = 'password_required';

  return result(errors, { email, password: input.password ?? '' });
}

/** Simple strength meter used by the register screen (0..4). */
export function passwordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score);
}

/* -------------------------------------------------------------------------- */
/*                             Cross-entity guards                            */
/* -------------------------------------------------------------------------- */

/**
 * True when the wallet can be deleted: the spec only allows deletion while
 * there is no transaction history for that wallet.
 */
export function canDeleteWallet(_walletId: ID, transactionCount: number): boolean {
  return transactionCount === 0;
}

/** True when the savings target can be deleted (no deposits/withdrawals). */
export function canDeleteTarget(_targetId: ID, movementCount: number): boolean {
  return movementCount === 0;
}

export function isFutureISO(iso: ISODate): boolean {
  return isFutureDate(iso);
}
