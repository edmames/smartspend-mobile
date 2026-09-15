/**
 * Date helpers.
 *
 * SmartSpend stores every calendar value as a `YYYY-MM-DD` string that is
 * interpreted in Asia/Jakarta (UTC+7). `jakartaNow()` produces a Date whose
 * local getters (`getFullYear`, `format`, …) return the Jakarta wall clock,
 * so all date-fns calendar math stays consistent regardless of device timezone.
 */
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDaysInMonth,
  isValid,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { TIMEZONE_OFFSET_MINUTES } from './constants';
import type { ISODate, YearMonth } from '../types';

const OFFSET_MS = TIMEZONE_OFFSET_MINUTES * 60 * 1000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_MONTH_PATTERN = /^\d{4}-\d{2}$/;

/** Current wall-clock time in Asia/Jakarta, expressed as a local Date. */
export function jakartaNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + OFFSET_MS + now.getTimezoneOffset() * 60 * 1000);
}

/** Today in Asia/Jakarta as `YYYY-MM-DD`. */
export function todayISO(now: Date = new Date()): ISODate {
  return format(jakartaNow(now), 'yyyy-MM-dd');
}

/** Current month in Asia/Jakarta as `YYYY-MM`. */
export function currentMonthYear(now: Date = new Date()): YearMonth {
  return format(jakartaNow(now), 'yyyy-MM');
}

/** Current instant as an ISO 8601 UTC timestamp (for `createdAt`). */
export function nowISOString(now: Date = new Date()): string {
  return now.toISOString();
}

/** Formats a Date (already in wall-clock space) into `YYYY-MM-DD`. */
export function toISODate(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd');
}

/** Parses `YYYY-MM-DD` into a local Date at midday (avoids DST/DST-adjacent bugs). */
export function fromISODate(iso: ISODate): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
}

export function isValidISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > getDaysInMonth(new Date(year, month - 1, 1))) return false;
  return isValid(fromISODate(value));
}

export function isValidYearMonth(value: unknown): value is YearMonth {
  if (typeof value !== 'string' || !YEAR_MONTH_PATTERN.test(value)) return false;
  const [year, month] = value.split('-').map(Number);
  return year >= 1900 && year <= 2200 && month >= 1 && month <= 12;
}

/** True when the ISO date is strictly after today (Asia/Jakarta). */
export function isFutureDate(iso: ISODate, now: Date = new Date()): boolean {
  if (!isValidISODate(iso)) return false;
  return iso > todayISO(now);
}

export function addDaysISO(iso: ISODate, days: number): ISODate {
  return toISODate(addDays(fromISODate(iso), days));
}

export function addMonthsISO(iso: ISODate, months: number): ISODate {
  return toISODate(addMonths(fromISODate(iso), months));
}

export function addMonthsToYearMonth(monthYear: YearMonth, months: number): YearMonth {
  return format(addMonths(fromISODate(`${monthYear}-01`), months), 'yyyy-MM');
}

export function monthYearOf(iso: ISODate): YearMonth {
  return iso.slice(0, 7);
}

export function startOfMonthISO(monthYear: YearMonth): ISODate {
  return `${monthYear}-01`;
}

export function endOfMonthISO(monthYear: YearMonth): ISODate {
  return toISODate(endOfMonth(fromISODate(`${monthYear}-01`)));
}

export function daysInMonth(monthYear: YearMonth): number {
  return getDaysInMonth(fromISODate(`${monthYear}-01`));
}

/** Every date of the month, ascending. */
export function eachDayOfMonth(monthYear: YearMonth): ISODate[] {
  const start = startOfMonth(fromISODate(`${monthYear}-01`));
  const end = endOfMonth(start);
  return eachDayOfInterval({ start, end }).map(toISODate);
}

/** The `count` months ending at (and including) `monthYear`, ascending. */
export function trailingMonths(monthYear: YearMonth, count: number): YearMonth[] {
  const result: YearMonth[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    result.push(addMonthsToYearMonth(monthYear, -index));
  }
  return result;
}

/** Signed day difference: `to - from` in calendar days. */
export function daysBetween(from: ISODate, to: ISODate): number {
  return differenceInCalendarDays(fromISODate(to), fromISODate(from));
}

export function daysUntil(iso: ISODate, now: Date = new Date()): number {
  return daysBetween(todayISO(now), iso);
}

/** Month bounds used by period filters. */
export function periodRange(
  period: 'this_month' | 'last_3_months' | 'last_6_months' | 'all',
  now: Date = new Date(),
): { from: ISODate | null; to: ISODate | null } {
  const current = currentMonthYear(now);
  switch (period) {
    case 'this_month':
      return { from: startOfMonthISO(current), to: endOfMonthISO(current) };
    case 'last_3_months':
      return { from: startOfMonthISO(addMonthsToYearMonth(current, -2)), to: endOfMonthISO(current) };
    case 'last_6_months':
      return { from: startOfMonthISO(addMonthsToYearMonth(current, -5)), to: endOfMonthISO(current) };
    default:
      return { from: null, to: null };
  }
}

/**
 * Explicit name tables instead of `Intl` — Hermes builds without full ICU
 * (some Android devices) would otherwise throw or fall back unexpectedly.
 */
const MONTHS_SHORT: Record<'id' | 'en', readonly string[]> = {
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const MONTHS_LONG: Record<'id' | 'en', readonly string[]> = {
  id: [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
};

/** Sunday-first weekday names. */
const WEEKDAYS_SHORT: Record<'id' | 'en', readonly string[]> = {
  id: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

/** `1 Sep 2026` */
export function formatDateLong(iso: ISODate, language: 'id' | 'en' = 'id'): string {
  const date = fromISODate(iso);
  return `${date.getDate()} ${MONTHS_SHORT[language][date.getMonth()]} ${date.getFullYear()}`;
}

/** `1 Sep` */
export function formatDateShort(iso: ISODate, language: 'id' | 'en' = 'id'): string {
  const date = fromISODate(iso);
  return `${date.getDate()} ${MONTHS_SHORT[language][date.getMonth()]}`;
}

/** `September 2026` from a `YYYY-MM` string. */
export function formatMonthYear(monthYear: YearMonth, language: 'id' | 'en' = 'id'): string {
  const [year, month] = monthYear.split('-').map(Number);
  return `${MONTHS_LONG[language][month - 1]} ${year}`;
}

/** `Sep` from a `YYYY-MM` string — chart axis labels. */
export function formatMonthShort(monthYear: YearMonth, language: 'id' | 'en' = 'id'): string {
  const month = Number(monthYear.split('-')[1]);
  return MONTHS_SHORT[language][month - 1];
}

/** `Sen` — weekday label from a full date. */
export function formatWeekdayShort(iso: ISODate, language: 'id' | 'en' = 'id'): string {
  return WEEKDAYS_SHORT[language][fromISODate(iso).getDay()];
}

/** `Today` / `Yesterday` / `15 Sep 2026`. */
export function formatRelativeDay(iso: ISODate, language: 'id' | 'en' = 'id'): string {
  const today = todayISO();
  if (iso === today) return language === 'en' ? 'Today' : 'Hari ini';
  if (iso === addDaysISO(today, -1)) return language === 'en' ? 'Yesterday' : 'Kemarin';
  return formatDateLong(iso, language);
}

export function clampYearMonth(monthYear: YearMonth, min: YearMonth, max: YearMonth): YearMonth {
  if (monthYear < min) return min;
  if (monthYear > max) return max;
  return monthYear;
}

/**
 * Sunday-first weekday index (0 = Sunday) for a date, used by the mini
 * calendar picker.
 */
export function weekdayIndex(iso: ISODate): number {
  return fromISODate(iso).getDay();
}

export function subMonthsYearMonth(monthYear: YearMonth, months: number): YearMonth {
  return format(subMonths(fromISODate(`${monthYear}-01`), months), 'yyyy-MM');
}
