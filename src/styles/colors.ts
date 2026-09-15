/**
 * SmartSpend palette + semantic tokens.
 *
 * Design language: "quiet finance" — deep navy-black surfaces, ONE accent
 * (electric blue), muted semantic colors and desaturated category tints.
 * Borders are translucent hairlines rather than solid 1px outlines, so cards
 * read as layered surfaces instead of boxes.
 */

export const palette = {
  /* Brand */
  navy: '#1e3a8a',
  navyDeep: '#122150',
  blue: '#0ea5e9',
  blueBright: '#38bdf8',
  blueDeep: '#0284c7',

  /* Neutrals — dark end */
  ink950: '#080C16',
  ink900: '#0B1120',
  ink850: '#101827',
  ink800: '#151E31',
  ink750: '#1B253A',
  ink700: '#243044',
  ink600: '#334155',
  ink500: '#64748b',
  ink400: '#94a3b8',
  ink300: '#cbd5e1',
  ink200: '#e2e8f0',
  ink100: '#f1f5f9',
  ink50: '#f8fafc',
  white: '#ffffff',

  /* Semantic — softened for dark surfaces */
  emerald: '#34d399',
  emeraldDeep: '#059669',
  amber: '#fbbf24',
  amberDeep: '#d97706',
  rose: '#fb7185',
  roseDeep: '#e11d48',
  violet: '#a78bfa',
  teal: '#2dd4bf',
} as const;

/**
 * Category tints — deliberately low-saturation so a list of them reads as one
 * cohesive system instead of a rainbow of pastel chips.
 */
export const categoryTints = {
  food: '#e0a06a',
  transport: '#6fb0e6',
  entertainment: '#a993e8',
  shopping: '#e08cae',
  health: '#5cc39b',
  other: '#93a3b8',
  salary: '#4fc08d',
  bonus: '#54b8b0',
  business: '#6fb0e6',
  gift: '#e08cae',
  investment: '#a993e8',
  transfer: '#7d8ba1',
  savings: '#6fb0e6',
  initial: '#93a3b8',
} as const;

export interface ThemeColors {
  /** App background (deepest layer). */
  background: string;
  /** Secondary background for grouped sections. */
  backgroundAlt: string;
  /** Card surface. */
  card: string;
  /** Surface sitting on top of a card (rows, inputs). */
  cardAlt: string;
  /** Surface that reads "recessed" (skeletons, empty slots). */
  surfaceSunken: string;
  /** Hairline divider — translucent, never a solid outline. */
  border: string;
  borderStrong: string;

  text: string;
  textMedium: string;
  textMuted: string;
  textFaint: string;
  textInverse: string;

  primary: string;
  /** Softer partner of `primary` for large fills / gradients. */
  primaryDeep: string;
  primaryBright: string;
  onPrimary: string;
  /** Accent used when the app needs "attention without alarm". */
  accentSoft: string;

  success: string;
  warning: string;
  danger: string;
  info: string;

  overlay: string;
  shadow: string;
  chartGrid: string;
  tabBar: string;
  tabBarBorder: string;
  inputBackground: string;
  skeleton: string;
  /** Hero gradient stops. */
  heroGradient: readonly [string, string, string];
  /** Neutral tint for icon chips (12% of textMuted). */
  chipTint: string;
}

export const darkThemeColors: ThemeColors = {
  background: palette.ink950,
  backgroundAlt: palette.ink900,
  card: palette.ink850,
  cardAlt: palette.ink800,
  surfaceSunken: '#0d1424',
  border: 'rgba(148, 163, 184, 0.12)',
  borderStrong: 'rgba(148, 163, 184, 0.22)',

  text: '#eef2f8',
  textMedium: '#c3cddc',
  textMuted: '#8a97ab',
  textFaint: '#5f6b7f',
  textInverse: palette.ink900,

  primary: palette.blue,
  primaryDeep: palette.navy,
  primaryBright: palette.blueBright,
  onPrimary: '#04121f',
  accentSoft: 'rgba(14, 165, 233, 0.14)',

  success: palette.emerald,
  warning: palette.amber,
  danger: palette.rose,
  info: palette.blue,

  overlay: 'rgba(4, 8, 16, 0.72)',
  shadow: '#02060f',
  chartGrid: 'rgba(148, 163, 184, 0.12)',
  tabBar: 'rgba(11, 17, 32, 0.96)',
  tabBarBorder: 'rgba(148, 163, 184, 0.1)',
  inputBackground: '#101a2c',
  skeleton: '#182238',
  heroGradient: ['#0d1b3e', '#14306b', '#1b56a5'],
  chipTint: 'rgba(148, 163, 184, 0.12)',
};

export const lightThemeColors: ThemeColors = {
  background: '#f6f8fb',
  backgroundAlt: palette.ink50,
  card: palette.white,
  cardAlt: '#f2f5f9',
  surfaceSunken: '#eef2f7',
  border: 'rgba(15, 23, 42, 0.08)',
  borderStrong: 'rgba(15, 23, 42, 0.16)',

  text: '#0d1526',
  textMedium: '#3c4a60',
  textMuted: '#68758a',
  textFaint: '#94a1b5',
  textInverse: palette.white,

  primary: '#1668d6',
  primaryDeep: palette.navy,
  primaryBright: palette.blue,
  onPrimary: palette.white,
  accentSoft: 'rgba(14, 165, 233, 0.12)',

  success: palette.emeraldDeep,
  warning: palette.amberDeep,
  danger: '#dc2626',
  info: '#1668d6',

  overlay: 'rgba(15, 23, 42, 0.42)',
  shadow: '#0f172a',
  chartGrid: 'rgba(15, 23, 42, 0.08)',
  tabBar: 'rgba(255, 255, 255, 0.97)',
  tabBarBorder: 'rgba(15, 23, 42, 0.08)',
  inputBackground: palette.white,
  skeleton: '#e6ecf4',
  heroGradient: ['#122150', '#1e3a8a', '#1668d6'],
  chipTint: 'rgba(15, 23, 42, 0.05)',
};
