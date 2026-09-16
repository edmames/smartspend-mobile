/**
 * Theme + i18n hooks. Dark mode is the default; `system` follows the OS.
 */
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { getTheme, resolveThemeMode, type ResolvedThemeMode, type Theme } from '../styles/theme';
import { translate, type TranslationKey } from '../utils/constants';
import { amountToneOf } from '../utils/formatting';
import type { Language, TransactionType } from '../types';

export function useThemeMode(): ResolvedThemeMode {
  const preference = useSettingsStore((state) => state.settings.theme);
  const systemScheme = useColorScheme();
  const normalized = systemScheme === 'light' || systemScheme === 'dark' ? systemScheme : null;
  return resolveThemeMode(preference, normalized);
}

export function useTheme(): Theme {
  const mode = useThemeMode();
  return useMemo(() => getTheme(mode), [mode]);
}

export function useLanguage(): Language {
  return useSettingsStore((state) => state.settings.language);
}

/** Translator bound to the active language: `t('nav.home')`. */
export function useT(): (key: TranslationKey) => string {
  const language = useLanguage();
  return useMemo(() => (key: TranslationKey) => translate(key, language), [language]);
}

/**
 * Ledger ink for a transaction type, from the central semantic tokens.
 *
 * Every amount in the app goes through here, so income/expense/savings/transfer
 * can never drift apart between the list, the detail screen and the reports.
 * Savings is deliberately its own tone rather than reusing expense: a deposit
 * shrinks one wallet without spending anything.
 */
export function useAmountColor(type: TransactionType | undefined): string {
  const theme = useTheme();
  return useMemo(() => {
    // `undefined` (transaction still loading) falls through to neutral ink.
    switch (type ? amountToneOf(type) : 'transfer') {
      case 'income':
        return theme.colors.incomeColor;
      case 'expense':
        return theme.colors.expenseColor;
      case 'savings':
        return theme.colors.savingsColor;
      default:
        return theme.colors.transferColor;
    }
  }, [theme, type]);
}

/** Convenience hook returning everything a screen usually needs. */
export function useThemedT(): { theme: Theme; t: (key: TranslationKey) => string; language: Language; isDark: boolean } {
  const theme = useTheme();
  const t = useT();
  const language = useLanguage();
  return { theme, t, language, isDark: theme.dark };
}
