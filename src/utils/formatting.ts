/**
 * Number / currency / text formatting helpers.
 *
 * Money is always an integer number of Rupiah. Inputs are formatted with
 * Indonesian thousand separators (1.234.567) and parsed back strictly —
 * decimals, exponents, signs and scientific notation are rejected.
 */
import { MAX_AMOUNT, MAX_AMOUNT_INPUT_LENGTH, MIN_AMOUNT } from './constants';
import type { CategoryKey, Language, TransactionType } from '../types';
import { CATEGORY_META } from './constants';

/* -------------------------------------------------------------------------- */
/*                              Amount parsing                                */
/* -------------------------------------------------------------------------- */

export type AmountParseError =
  | 'amount_required'
  | 'amount_invalid_characters'
  | 'amount_not_integer'
  | 'amount_not_positive'
  | 'amount_too_large';

export interface AmountParseResult {
  ok: boolean;
  /** Parsed integer when `ok` is true. */
  value?: number;
  error?: AmountParseError;
}

/**
 * Parses user-typed amount strings ("1.250.000", "Rp 1 250 000", "1250000").
 *
 * Rejects: empty input, letters/symbols, decimals ("1000,5" or "1000.5" when
 * it looks like a fractional part), scientific notation ("1e6"), zero,
 * negatives and values above Rp 1 trillion.
 */
export function parseAmountInput(raw: string | null | undefined): AmountParseResult {
  if (raw === null || raw === undefined) return { ok: false, error: 'amount_required' };
  let text = String(raw).trim();
  if (text === '') return { ok: false, error: 'amount_required' };

  // Reject scientific notation explicitly ("1e6", "2E9").
  if (/[eE]/.test(text)) return { ok: false, error: 'amount_invalid_characters' };

  // Strip currency prefix, spaces and non-breaking spaces.
  text = text.replace(/rp/gi, '').replace(/[\s\u00A0]/g, '');
  if (text === '') return { ok: false, error: 'amount_required' };
  if (text.startsWith('-')) return { ok: false, error: 'amount_not_positive' };
  if (!/^[0-9.,]+$/.test(text)) return { ok: false, error: 'amount_invalid_characters' };

  // Grouping separators produce exactly 3-digit tails ("1.250.000", "1,000").
  // Any other tail is a decimal attempt ("1000,5") or malformed grouping.
  const lastSeparatorIndex = Math.max(text.lastIndexOf('.'), text.lastIndexOf(','));
  if (lastSeparatorIndex >= 0) {
    const tail = text.slice(lastSeparatorIndex + 1);
    if (tail.length !== 3) {
      return {
        ok: false,
        error: tail.length < 3 ? 'amount_not_integer' : 'amount_invalid_characters',
      };
    }
  }

  const digitsOnly = text.replace(/[.,]/g, '');
  if (!/^\d+$/.test(digitsOnly)) return { ok: false, error: 'amount_invalid_characters' };

  const value = Number(digitsOnly);
  if (!Number.isFinite(value)) return { ok: false, error: 'amount_invalid_characters' };
  if (!Number.isInteger(value)) return { ok: false, error: 'amount_not_integer' };
  if (value < MIN_AMOUNT) return { ok: false, error: 'amount_not_positive' };
  if (value > MAX_AMOUNT) return { ok: false, error: 'amount_too_large' };

  return { ok: true, value };
}

/** Keeps the raw digits from typed text (used by `onChangeText`). */
export function extractDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, MAX_AMOUNT_INPUT_LENGTH);
  // Normalize leading zeros ("007" -> "7") while allowing a lone "0".
  const trimmed = digits.replace(/^0+(?=\d)/, '');
  return trimmed;
}

/** Formats a digit string for display inside a TextInput: "1250000" -> "1.250.000". */
export function groupDigits(digits: string): string {
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** "1.250.000" from a numeric value (no currency symbol). */
export function formatAmountInput(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return groupDigits(String(Math.trunc(Math.abs(value))));
}

/* -------------------------------------------------------------------------- */
/*                               Currency output                              */
/* -------------------------------------------------------------------------- */

export function formatNumber(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  const sign = safe < 0 ? '-' : '';
  return `${sign}${groupDigits(String(Math.abs(safe)))}`;
}

/** "Rp 1.250.000" */
export function formatCurrency(value: number, { withSymbol = true } = {}): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  const sign = safe < 0 ? '-' : '';
  const body = groupDigits(String(Math.abs(safe)));
  return withSymbol ? `${sign}Rp ${body}` : `${sign}${body}`;
}

/** Signed display for ledger rows: "+ Rp 250.000" / "− Rp 20.000". */
export function formatSignedCurrency(value: number, direction: 'in' | 'out' | 'neutral'): string {
  const absolute = Math.abs(value);
  if (direction === 'in') return `+ ${formatCurrency(absolute)}`;
  if (direction === 'out') return `− ${formatCurrency(absolute)}`;
  return formatCurrency(absolute);
}

/** "Rp 1,25 jt" / "Rp 1.5M" — compact form for tight cards and charts. */
export function formatCompactCurrency(value: number, language: Language = 'id'): string {
  const safe = Number.isFinite(value) ? Math.abs(Math.round(value)) : 0;
  const sign = value < 0 ? '-' : '';
  const units =
    language === 'en'
      ? [
          { limit: 1e12, suffix: 'T', divisor: 1e12 },
          { limit: 1e9, suffix: 'B', divisor: 1e9 },
          { limit: 1e6, suffix: 'M', divisor: 1e6 },
          { limit: 1e3, suffix: 'K', divisor: 1e3 },
        ]
      : [
          { limit: 1e12, suffix: 'T', divisor: 1e12 },
          { limit: 1e9, suffix: ' M', divisor: 1e9 },
          { limit: 1e6, suffix: ' jt', divisor: 1e6 },
          { limit: 1e3, suffix: ' rb', divisor: 1e3 },
        ];

  for (const unit of units) {
    if (safe >= unit.limit) {
      const scaled = safe / unit.divisor;
      const rounded = scaled >= 100 ? Math.round(scaled) : Math.round(scaled * 100) / 100;
      const separator = language === 'en' ? '.' : ',';
      const text = String(rounded).replace('.', separator);
      return `${sign}Rp ${text}${unit.suffix}`;
    }
  }
  return `${sign}Rp ${groupDigits(String(safe))}`;
}

/** "33,3%" */
export function formatPercentage(value: number, digits = 1, language: Language = 'id'): string {
  const safe = Number.isFinite(value) ? value : 0;
  const rounded = safe.toFixed(digits);
  const text = digits > 0 ? rounded.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1') : rounded;
  return `${language === 'en' ? text : text.replace('.', ',')}%`;
}

/** "75%" from a 0..1 ratio (clamped for display). */
export function formatRatioAsPercent(ratio: number, digits = 0): string {
  const safe = Number.isFinite(ratio) ? ratio : 0;
  return `${(safe * 100).toFixed(digits)}%`;
}

/* -------------------------------------------------------------------------- */
/*                                   Labels                                   */
/* -------------------------------------------------------------------------- */

export function categoryLabel(
  category: CategoryKey,
  language: Language = 'id',
  translateFn: (key: string) => string = (key) => key,
): string {
  const translated = translateFn(`category.${category}`);
  if (translated && translated !== `category.${category}`) return translated;
  const fromMeta = CATEGORY_META[category];
  if (!fromMeta) return language === 'en' ? 'Other' : 'Lainnya';
  return fromMeta.key;
}

export function categoryColor(category: CategoryKey): string {
  return CATEGORY_META[category]?.color ?? '#94a3b8';
}

export function categoryIcon(category: CategoryKey): string {
  return CATEGORY_META[category]?.icon ?? 'ellipsis-horizontal-outline';
}

/** Direction of a ledger entry for coloring purposes. */
/**
 * How a transaction moves the user's **total wealth** (wallets + savings).
 *
 * Only real income adds wealth and only a real expense removes it. Transfers and
 * savings movements move money between the user's own pockets: one balance goes
 * down while another goes up by the same amount, so net worth is untouched.
 *
 * This is why `savings_deposit` is NOT `out` even though the source wallet
 * shrinks: showing it in expense red would tell the user they spent money they
 * still have. Direction here drives colour and sign, so it has to describe the
 * effect on wealth, not the effect on one wallet.
 */
export function directionOf(type: TransactionType): 'in' | 'out' | 'neutral' {
  switch (type) {
    case 'income':
      return 'in';
    case 'expense':
      return 'out';
    default:
      return 'neutral';
  }
}

/**
 * Semantic tone for an amount, so every surface colour-codes identically.
 *   income   → green   (wealth up)
 *   expense  → coral   (wealth down)
 *   savings  → cyan    (asset movement, wallet ⇄ target)
 *   transfer → violet  (asset movement, wallet ⇄ wallet, opening balance)
 */
export type AmountTone = 'income' | 'expense' | 'savings' | 'transfer';

export function amountToneOf(type: TransactionType): AmountTone {
  switch (type) {
    case 'income':
      return 'income';
    case 'expense':
      return 'expense';
    case 'savings_deposit':
    case 'savings_withdraw':
      return 'savings';
    default:
      return 'transfer';
  }
}

export function truncate(text: string, max = 40): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** First letters of up to two words: "Budi Santoso" -> "BS". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function pluralizeID(count: number, word: string): string {
  return `${count} ${word}`;
}

/** 1000000 -> "1.000.000" with an explicit "+" prefix when positive. */
export function formatDelta(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${groupDigits(String(Math.abs(Math.round(value))))}`;
}
