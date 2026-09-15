/**
 * SmartSpend — Shared domain types.
 *
 * Conventions (see docs in README):
 *  - All money values are INTEGER Rupiah (IDR). Never floats, never cents.
 *  - All dates are `YYYY-MM-DD` strings interpreted in Asia/Jakarta (UTC+7).
 *  - Months are `YYYY-MM` strings.
 *  - The transaction ledger is the single source of truth for every balance.
 */

export type ID = string;

/** Date string in `YYYY-MM-DD` format (Asia/Jakarta). */
export type ISODate = string;

/** Month string in `YYYY-MM` format (Asia/Jakarta). */
export type YearMonth = string;

/* -------------------------------------------------------------------------- */
/*                                   Auth                                     */
/* -------------------------------------------------------------------------- */

export type Language = 'id' | 'en';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface User {
  id: ID;
  email: string;
  name: string;
  createdAt: ISODate;
}

/** Persisted credential record. Demo-mode only — see storage.service.ts. */
export interface StoredCredential {
  userId: ID;
  email: string;
  salt: string;
  passwordHash: string;
}

export interface AuthSession {
  userId: ID;
  email: string;
  issuedAt: string;
  expiresAt: string;
}

/* -------------------------------------------------------------------------- */
/*                                  Wallets                                   */
/* -------------------------------------------------------------------------- */

export type WalletType = 'cash' | 'bank' | 'ewallet';

/**
 * Optional provider mark for a wallet (monogram tile in the brand's colour).
 * Only meaningful for `bank` and `ewallet` wallets — see `WALLET_BRANDS`.
 */
export type WalletBrand =
  | 'BCA'
  | 'Mandiri'
  | 'BNI'
  | 'BRI'
  | 'BSI'
  | 'CIMB'
  | 'GoPay'
  | 'OVO'
  | 'DANA'
  | 'ShopeePay';

export interface Wallet {
  id: ID;
  userId: ID;
  name: string;
  /** Immutable after creation. */
  type: WalletType;
  /** Informational: the ledger `initial` transaction carries the real amount. */
  initialBalance: number;
  /** Optional provider mark; must belong to this wallet's `type`. */
  brand?: WalletBrand | null;
  createdAt: ISODate;
}

export type WalletInput = {
  name: string;
  type: WalletType;
  /** Optional provider mark (BCA, Mandiri, GoPay…). */
  brand?: WalletBrand | null;
  /** Optional. Empty input means "no initial transaction". */
  initialBalance?: number | null;
};

/* -------------------------------------------------------------------------- */
/*                                Transactions                                */
/* -------------------------------------------------------------------------- */

export type TransactionType =
  | 'initial'
  | 'income'
  | 'expense'
  | 'transfer'
  | 'savings_deposit'
  | 'savings_withdraw';

/** Category keys. Expense keys follow the product spec; income keys extend it. */
export type CategoryKey =
  | 'food'
  | 'transport'
  | 'vacation'
  | 'education'
  | 'entertainment'
  | 'shopping'
  | 'health'
  | 'other'
  | 'salary'
  | 'bonus'
  | 'business'
  | 'gift'
  | 'investment'
  | 'transfer'
  | 'savings'
  | 'initial';

/** Payment methods. `qris` is only valid for expenses from bank / e-wallet. */
export type PaymentMethod =
  | 'cash'
  | 'transfer'
  | 'qris'
  | 'debit'
  | 'credit'
  | 'ewallet'
  | 'other';

export interface Transaction {
  id: ID;
  userId: ID;
  type: TransactionType;
  /** Integer Rupiah, strictly positive, max Rp 1.000.000.000.000. */
  amount: number;
  /** `YYYY-MM-DD`, never in the future. */
  date: ISODate;
  category: CategoryKey;
  description: string;
  walletSourceId?: ID;
  /** Transfers only (also used as the receiving wallet for savings withdrawals). */
  walletDestinationId?: ID;
  /** Savings deposists / withdrawals only. */
  savingsTargetId?: ID;
  paymentMethod?: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

export type TransactionTypeFilter = 'all' | TransactionType;

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  date: ISODate;
  category: CategoryKey;
  description: string;
  walletSourceId?: ID;
  walletDestinationId?: ID;
  savingsTargetId?: ID;
  paymentMethod?: PaymentMethod;
}

export type PeriodFilter = 'this_month' | 'last_3_months' | 'last_6_months' | 'all';

export interface TransactionFilters {
  type: TransactionTypeFilter;
  walletId: ID | 'all';
  category: CategoryKey | 'all';
  period: PeriodFilter;
  query: string;
}

/* -------------------------------------------------------------------------- */
/*                                   Savings                                  */
/* -------------------------------------------------------------------------- */

export interface SavingsTarget {
  id: ID;
  userId: ID;
  name: string;
  /** Integer Rupiah goal. */
  goalAmount: number;
  dueDate?: ISODate;
  createdAt: ISODate;
  updatedAt: string;
}

export type SavingsTargetInput = {
  name: string;
  goalAmount: number;
  dueDate?: ISODate | null;
};

export interface SavingsMovementInput {
  targetId: ID;
  amount: number;
  walletId: ID;
  date?: ISODate;
  description?: string;
}

export interface TargetProgress {
  target: SavingsTarget;
  /** Current balance = deposits − withdrawals (may exceed the goal). */
  saved: number;
  remaining: number;
  /** 0..1 (may exceed 1; progress bars cap rendering at 100%). */
  ratio: number;
  /** Whole percent, uncapped (e.g. 120). */
  percentage: number;
  isComplete: boolean;
  daysLeft: number | null;
  isOverdue: boolean;
}

/* -------------------------------------------------------------------------- */
/*                                   Budgets                                  */
/* -------------------------------------------------------------------------- */

export interface Budget {
  id: ID;
  userId: ID;
  category: CategoryKey;
  /** `YYYY-MM` */
  monthYear: YearMonth;
  limitAmount: number;
  createdAt: string;
}

export type BudgetInput = {
  category: CategoryKey;
  monthYear: YearMonth;
  limitAmount: number;
};

export type BudgetStatus = 'safe' | 'warning' | 'exceeded';

export interface BudgetUsage {
  budget: Budget;
  used: number;
  remaining: number;
  /** 0..1+ */
  ratio: number;
  percentage: number;
  status: BudgetStatus;
}

/* -------------------------------------------------------------------------- */
/*                                  Settings                                  */
/* -------------------------------------------------------------------------- */

export interface Settings {
  userId: ID;
  theme: ThemeMode;
  currency: 'IDR';
  language: Language;
  telegramEnabled: boolean;
  telegramChatId?: string;
}

/* -------------------------------------------------------------------------- */
/*                            Derived / computed                              */
/* -------------------------------------------------------------------------- */

export interface MonthlySummary {
  monthYear: YearMonth;
  income: number;
  expense: number;
  net: number;
  savingsIn: number;
  savingsOut: number;
  transactionCount: number;
}

export interface DailyCashFlowPoint {
  date: ISODate;
  income: number;
  expense: number;
  /** income − expense for the day. */
  net: number;
  /** Running net accumulation across the month. */
  cumulativeNet: number;
}

export interface CategoryBreakdownItem {
  category: CategoryKey;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlyTrendPoint {
  monthYear: YearMonth;
  income: number;
  expense: number;
  net: number;
}

export interface WalletBalanceSnapshot {
  walletId: ID;
  balance: number;
}

export interface TotalMoneySnapshot {
  walletsTotal: number;
  savingsTotal: number;
  total: number;
  walletBalances: WalletBalanceSnapshot[];
  savingsBalances: WalletBalanceSnapshot[];
}

/* -------------------------------------------------------------------------- */
/*                            Export / backup payloads                        */
/* -------------------------------------------------------------------------- */

export interface MonthlyReportTransaction extends Transaction {}

/** Exactly the JSON contract described in the product spec (`Export JSON`). */
export interface MonthlyReport {
  exportDate: ISODate;
  month: YearMonth;
  summary: {
    income: number;
    expense: number;
    net: number;
  };
  dailyCashFlow: {
    date: ISODate;
    /** Net cash flow of the day. */
    amount: number;
    income: number;
    expense: number;
  }[];
  categoryBreakdown: {
    category: CategoryKey;
    amount: number;
    percentage: number;
  }[];
  transactions: MonthlyReportTransaction[];
}

export interface BackupPayload {
  app: 'smartspend';
  version: number;
  exportedAt: string;
  user: User;
  wallets: Wallet[];
  transactions: Transaction[];
  savingsTargets: SavingsTarget[];
  budgets: Budget[];
  settings: Settings;
}

export type ImportMode = 'merge' | 'replace';

/* -------------------------------------------------------------------------- */
/*                          Validation / ledger errors                        */
/* -------------------------------------------------------------------------- */

export type ValidationErrorCode =
  | 'required'
  | 'brand_invalid'
  | 'brand_type_mismatch'
  | 'amount_required'
  | 'amount_invalid_characters'
  | 'amount_not_integer'
  | 'amount_not_positive'
  | 'amount_too_large'
  | 'date_required'
  | 'date_invalid_format'
  | 'date_future'
  | 'wallet_required'
  | 'wallet_not_found'
  | 'wallet_duplicate'
  | 'wallet_has_transactions'
  | 'destination_required'
  | 'transfer_same_wallet'
  | 'target_required'
  | 'target_not_found'
  | 'target_has_history'
  | 'category_required'
  | 'category_invalid'
  | 'type_invalid'
  | 'name_required'
  | 'name_too_long'
  | 'description_too_long'
  | 'target_duplicate'
  | 'qris_requires_non_cash_wallet'
  | 'limit_required'
  | 'limit_not_positive'
  | 'budget_duplicate'
  | 'email_required'
  | 'email_invalid'
  | 'email_taken'
  | 'password_required'
  | 'password_too_short'
  | 'password_mismatch'
  | 'credentials_invalid'
  | 'user_not_found'
  | 'network_error'
  | 'import_invalid'
  | 'unknown';

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  errors: Partial<Record<string, ValidationErrorCode>>;
}

export type LedgerErrorCode =
  | 'amount_invalid'
  | 'date_invalid'
  | 'date_future'
  | 'type_invalid'
  | 'missing_source_wallet'
  | 'missing_destination_wallet'
  | 'missing_savings_target'
  | 'transfer_same_wallet'
  | 'unknown_wallet'
  | 'unknown_target'
  | 'negative_wallet_balance'
  | 'negative_savings_balance';

export interface LedgerError {
  code: LedgerErrorCode;
  transactionId?: ID;
  walletId?: ID;
  targetId?: ID;
  date?: ISODate;
  detail?: string;
}

export interface LedgerValidationResult {
  valid: boolean;
  errors: LedgerError[];
}

export type MutationResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; errors?: Partial<Record<string, ValidationErrorCode>> };

/* -------------------------------------------------------------------------- */
/*                                    UI                                      */
/* -------------------------------------------------------------------------- */

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  kind: ToastKind;
  message: string;
  duration?: number;
}

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  color?: string;
  icon?: string;
}
