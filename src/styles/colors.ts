/**
 * SmartSpend palette + semantic tokens.
 *
 * Design language: "midnight premium" — deep indigo-night surfaces, ONE accent
 * (teal #14b8a6) that pops against the dark base, muted semantic colours and
 * desaturated category tints. Borders are translucent hairlines rather than
 * solid 1px outlines, so cards read as layered surfaces instead of boxes.
 */

export const palette = {
  /* Brand — teal family */
  teal: '#14b8a6',
  tealBright: '#2dd4bf',
  tealDeep: '#0d9488',

  /* Neutrals — indigo night (dark end) */
  night950: '#070b1f',
  night900: '#0a0e27',
  night850: '#0f1535',
  night800: '#151d3f',
  night750: '#1c2750',
  night700: '#263258',
  night600: '#3b4a75',
  night500: '#64748b',
  night400: '#9ca3af',
  night300: '#cbd5e1',
  night200: '#e2e8f0',
  night100: '#f0f4f8',
  night50: '#f8fafc',
  white: '#ffffff',

  /* Semantic — tuned for dark surfaces */
  emerald: '#10b981',
  emeraldDeep: '#059669',
  amber: '#f59e0b',
  amberDeep: '#d97706',
  coral: '#f87171',
  rose: '#ef4444',
  roseDeep: '#dc2626',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
  blue: '#3b82f6',
} as const;

/**
 * Category tints — deliberately mid-saturation so a list of them reads as one
 * cohesive system on the dark base instead of a rainbow of chips.
 */
export const categoryTints = {
  food: '#fb923c',
  transport: '#38bdf8',
  entertainment: '#a78bfa',
  shopping: '#f472b6',
  health: '#34d399',
  other: '#94a3b8',
  salary: '#34d399',
  bonus: '#2dd4bf',
  business: '#38bdf8',
  gift: '#f472b6',
  investment: '#a78bfa',
  transfer: '#8b5cf6',
  savings: '#06b6d4',
  initial: '#94a3b8',
} as const;

export interface ThemeColors {
  /** App background (deepest layer). */
  background: string;
  /** Secondary background for grouped sections. */
  backgroundAlt: string;
  /** Card surface. */
  card: string;
  /** Surface sitting on top of a card (rows, inputs, pressed states). */
  cardAlt: string;
  /** Surface that reads "recessed" (skeletons, empty slots, tracks). */
  surfaceSunken: string;
  /** Hairline divider — translucent, never a solid outline. */
  border: string;
  borderStrong: string;

  text: string;
  textMedium: string;
  textMuted: string;
  textFaint: string;
  textInverse: string;
  /**
   * Ink for content sitting on a `HeroCard` gradient.
   *
   * The hero ramp is dark in *both* themes, so these are always light — unlike
   * `onPrimary`, which is the ink for a bright teal *fill* and is near-black in
   * dark mode. Using `onPrimary` on a hero is what made hero captions vanish
   * into the card.
   */
  onHero: string;
  onHeroMuted: string;
  onHeroFaint: string;
  /** Rules, dividers and progress tracks on a hero ramp. */
  onHeroDivider: string;

  primary: string;
  /** Softer partner of `primary` for large fills / gradients. */
  primaryDeep: string;
  primaryBright: string;
  onPrimary: string;
  /** Accent used when the app needs "attention without alarm" (≈10% teal). */
  accentSoft: string;

  success: string;
  warning: string;
  danger: string;
  info: string;

  /** Ledger-direction colours, separate from status colours. */
  incomeColor: string;
  /** Softer coral for expenses — reads on dark without shouting. */
  expenseColor: string;
  transferColor: string;
  savingsColor: string;

  overlay: string;
  shadow: string;
  chartGrid: string;
  tabBar: string;
  tabBarBorder: string;
  inputBackground: string;
  skeleton: string;
  /** Hero gradient stops. */
  heroGradient: readonly [string, string, string];
  /** Neutral tint for icon chips (~7% of text). */
  chipTint: string;
}

export const darkThemeColors: ThemeColors = {
  background: palette.night900,
  backgroundAlt: palette.night850,
  card: palette.night850,
  cardAlt: palette.night800,
  surfaceSunken: '#080c22',
  border: 'rgba(229, 231, 235, 0.1)',
  borderStrong: 'rgba(229, 231, 235, 0.2)',

  text: palette.night100,
  textMedium: '#c7cfdd',
  textMuted: palette.night400,
  textFaint: '#6b7280',
  textInverse: palette.night900,

  onHero: '#ffffff',
  onHeroMuted: 'rgba(255, 255, 255, 0.72)',
  onHeroFaint: 'rgba(255, 255, 255, 0.56)',
  onHeroDivider: 'rgba(255, 255, 255, 0.18)',

  primary: palette.teal,
  primaryDeep: palette.tealDeep,
  primaryBright: palette.tealBright,
  onPrimary: '#03211d',
  accentSoft: 'rgba(20, 184, 166, 0.12)',

  success: palette.emerald,
  warning: palette.amber,
  danger: palette.rose,
  info: palette.blue,

  incomeColor: palette.emerald,
  expenseColor: palette.coral,
  transferColor: palette.violet,
  savingsColor: palette.cyan,

  overlay: 'rgba(2, 6, 20, 0.64)',
  shadow: '#02060f',
  chartGrid: 'rgba(148, 163, 184, 0.1)',
  tabBar: 'rgba(10, 14, 39, 0.94)',
  tabBarBorder: 'rgba(229, 231, 235, 0.08)',
  inputBackground: '#141b3d',
  skeleton: '#1a2344',
  heroGradient: ['#0c1a38', '#0e3348', '#11605c'],
  chipTint: 'rgba(229, 231, 235, 0.07)',
};

/**
 * Flat, spec-named palette. Design-system consumers (and new screens) can
 * import a single semantic token without remembering the role-based key:
 *
 *   import { COLORS } from '@/styles/colors';
 */
export const COLORS = {
  /* Background & surface */
  DARK_BG: darkThemeColors.background,
  DARK_SURFACE: darkThemeColors.card,
  DARK_SURFACE_ALT: darkThemeColors.cardAlt,
  DARK_OVERLAY: darkThemeColors.overlay,

  /* Text */
  TEXT_PRIMARY: darkThemeColors.text,
  TEXT_SECONDARY: darkThemeColors.textMuted,
  TEXT_TERTIARY: darkThemeColors.textFaint,

  /* Accent (teal / cyan) */
  ACCENT_PRIMARY: darkThemeColors.primary,
  ACCENT_LIGHT: darkThemeColors.primaryBright,
  ACCENT_DARK: darkThemeColors.primaryDeep,
  ACCENT_SUBTLE: darkThemeColors.accentSoft,

  /* Status */
  SUCCESS: darkThemeColors.success,
  WARNING: darkThemeColors.warning,
  DANGER: darkThemeColors.danger,
  INFO: darkThemeColors.info,

  /* Borders & dividers */
  BORDER: darkThemeColors.border,
  BORDER_LIGHT: 'rgba(229, 231, 235, 0.05)',
  BORDER_DARK: darkThemeColors.borderStrong,

  /* Semantic ledger colours */
  INCOME_COLOR: darkThemeColors.incomeColor,
  EXPENSE_COLOR: darkThemeColors.expenseColor,
  TRANSFER_COLOR: darkThemeColors.transferColor,
  SAVINGS_COLOR: darkThemeColors.savingsColor,
} as const;

export const lightThemeColors: ThemeColors = {
  background: '#f3f6fb',
  backgroundAlt: palette.white,
  card: palette.white,
  cardAlt: '#f1f5f9',
  surfaceSunken: '#e8edf5',
  border: 'rgba(15, 23, 42, 0.08)',
  borderStrong: 'rgba(15, 23, 42, 0.16)',

  text: '#0e1630',
  textMedium: '#3f4d66',
  textMuted: '#68758c',
  textFaint: '#94a1b8',
  textInverse: palette.white,

  // Identical to dark: the hero ramp is a dark teal in both themes.
  onHero: '#ffffff',
  onHeroMuted: 'rgba(255, 255, 255, 0.78)',
  onHeroFaint: 'rgba(255, 255, 255, 0.62)',
  onHeroDivider: 'rgba(255, 255, 255, 0.22)',

  primary: palette.tealDeep,
  primaryDeep: '#0f766e',
  primaryBright: palette.teal,
  onPrimary: palette.white,
  accentSoft: 'rgba(13, 148, 136, 0.1)',

  success: palette.emeraldDeep,
  warning: palette.amberDeep,
  danger: palette.roseDeep,
  info: '#2563eb',

  incomeColor: palette.emeraldDeep,
  expenseColor: palette.roseDeep,
  transferColor: '#7c3aed',
  savingsColor: '#0891b2',

  overlay: 'rgba(15, 23, 42, 0.45)',
  shadow: '#0f172a',
  chartGrid: 'rgba(15, 23, 42, 0.08)',
  tabBar: 'rgba(255, 255, 255, 0.97)',
  tabBarBorder: 'rgba(15, 23, 42, 0.08)',
  inputBackground: palette.white,
  skeleton: '#e4eaf3',
  heroGradient: ['#134e4a', '#0f766e', palette.teal],
  chipTint: 'rgba(15, 23, 42, 0.05)',
};
