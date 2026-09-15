/**
 * Theme + i18n hooks. Dark mode is the default; `system` follows the OS.
 */
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { getTheme, resolveThemeMode, type ResolvedThemeMode, type Theme } from '../styles/theme';
import { translate, type TranslationKey } from '../utils/constants';
import type { Language } from '../types';

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

/** Convenience hook returning everything a screen usually needs. */
export function useThemedT(): { theme: Theme; t: (key: TranslationKey) => string; language: Language; isDark: boolean } {
  const theme = useTheme();
  const t = useT();
  const language = useLanguage();
  return { theme, t, language, isDark: theme.dark };
}
