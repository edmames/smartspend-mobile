/**
 * Design tokens: spacing, radii, typography, elevation and motion.
 *
 * Rules that keep the UI coherent:
 *  - Spacing follows a 4pt grid; screens use `screen` padding, cards `card`.
 *  - Radii come from one scale (inputs 8, cards 12, sheets 16, pills 999).
 *  - Type sizes are paired with tracking; money uses tabular figures, and the
 *    `mono*` variants add a real monospace face for editable figures.
 *  - Elevation is reserved for things that genuinely float (sheets, FAB,
 *    toasts) — cards take only a whisper of shadow.
 *
 * Spec-named aliases (`SPACING`, `RADIUS`, `TYPOGRAPHY`, `SHADOWS`) are exported
 * alongside the internal tokens so both call styles resolve to one source:
 *
 *   import { SPACING, RADIUS, TYPOGRAPHY } from '@/styles/theme';
 */
import { Platform } from 'react-native';
import { darkThemeColors, lightThemeColors, palette, type ThemeColors } from './colors';

export type ResolvedThemeMode = 'light' | 'dark';

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  /** Screen horizontal padding. */
  screen: 20,
  /** Card interior padding. */
  card: 16,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  /** Inputs, buttons, rows, inner blocks. */
  md: 8,
  /** Cards. */
  lg: 12,
  /** Hero panels + sheets. */
  xl: 16,
  pill: 999,
  full: 999,
} as const;

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing: number;
}

/**
 * Type scale.
 *   display/title/h3  → H1/H2/H3 headings
 *   bodyLarge/body/small → BODY_LG/MD/SM
 *   micro             → uppercase LABEL_SM
 *   mono/monoLarge    → tabular figures in a monospace face (money entry)
 */
export const typeScale = {
  hero: { fontSize: 40, lineHeight: 44, fontWeight: '700', letterSpacing: -1.4 },
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: 24, lineHeight: 32, fontWeight: '600', letterSpacing: -0.2 },
  subtitle: { fontSize: 20, lineHeight: 28, fontWeight: '600', letterSpacing: -0.2 },
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0 },
  body: { fontSize: 14, lineHeight: 22, fontWeight: '400', letterSpacing: 0.2 },
  small: { fontSize: 12, lineHeight: 18, fontWeight: '400', letterSpacing: 0.3 },
  caption: { fontSize: 11.5, lineHeight: 15, fontWeight: '500', letterSpacing: 0.2 },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.5 },
  money: { fontSize: 33, lineHeight: 38, fontWeight: '700', letterSpacing: -1.1 },
  monoLarge: { fontSize: 18, lineHeight: 28, fontWeight: '500', letterSpacing: 0 },
  mono: { fontSize: 14, lineHeight: 22, fontWeight: '500', letterSpacing: 0 },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof typeScale;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

/** Monospace face for figures you type or compare down a column. */
export const monoFontFamily = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const opacity = {
  disabled: 0.5,
  muted: 0.7,
  pressed: 0.92,
} as const;

/** Motion tokens — durations in ms, easings match iOS/Android defaults. */
export const motion = {
  /** Micro feedback: press, toggle. */
  fast: 120,
  /** Standard transitions: fades, entrance. */
  normal: 220,
  /** Sheets, modals, hero number. */
  slow: 300,
  /** Count-up duration for money figures. */
  countUp: 720,
  /** Delay between staggered children. */
  stagger: 50,
  /** Press scale factor. */
  pressScale: 0.95,
  /** Chart line draw. */
  chartDraw: 1000,
  /** Skeleton pulse half-cycle (full cycle = 2×). */
  skeletonPulse: 750,
} as const;

/**
 * A floating-surface shadow. Native platforms take the `shadow*` props; React
 * Native Web deprecates those in favour of `boxShadow`, so the token carries
 * whichever pair the current platform understands.
 */
export interface Elevation {
  shadowColor?: string;
  shadowOpacity?: number;
  shadowRadius?: number;
  shadowOffset?: { width: number; height: number };
  elevation?: number;
  /** Web-only equivalent of the `shadow*` trio. */
  boxShadow?: string;
}

/** `#rrggbb` + alpha → `rgba()`, so one token works on light and dark. */
function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildElevation(overrides: Partial<Elevation> & { shadowColor: string }): Elevation {
  const shadowOpacity = overrides.shadowOpacity ?? 0.35;
  const shadowRadius = overrides.shadowRadius ?? 20;
  const shadowOffset = overrides.shadowOffset ?? { width: 0, height: 10 };
  const elevation = overrides.elevation ?? 8;

  if (Platform.OS === 'web') {
    return { boxShadow: `0 ${shadowOffset.height}px ${shadowRadius}px ${withAlpha(overrides.shadowColor, shadowOpacity)}` };
  }

  return { shadowColor: overrides.shadowColor, shadowOpacity, shadowRadius, shadowOffset, elevation };
}

/** Shadow ramp: `none` → `xl`. Neutral black, low opacity, never aggressive. */
export const SHADOWS = {
  none: Platform.OS === 'web' ? ({ boxShadow: 'none' } as Elevation) : ({} as Elevation),
  sm: buildElevation({ shadowColor: '#000000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 }),
  md: buildElevation({ shadowColor: '#000000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 }),
  lg: buildElevation({ shadowColor: '#000000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 }),
  xl: buildElevation({ shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12 }),
} as const;

/** Spacing scale (4pt grid), spec-named. */
export const SPACING = {
  xs: spacing.xs,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
  xl: spacing.xl,
  xxl: spacing.xxl,
  xxxl: spacing.xxxl,
} as const;

/** Corner radii, spec-named. */
export const RADIUS = {
  sm: radius.sm,
  md: radius.md,
  lg: radius.lg,
  xl: radius.xl,
  full: radius.full,
} as const;

/**
 * Typography ramp, spec-named. Derived from `typeScale` so the two can never
 * drift apart.
 */
export const TYPOGRAPHY = {
  H1: typeScale.display,
  H2: typeScale.title,
  H3: typeScale.h3,
  BODY_LG: typeScale.bodyLarge,
  BODY_MD: typeScale.body,
  BODY_SM: typeScale.small,
  LABEL_LG: { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 0.1 },
  LABEL_MD: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.2 },
  LABEL_SM: typeScale.micro,
  MONO_LG: typeScale.monoLarge,
  MONO_MD: typeScale.mono,
} as const satisfies Record<string, TypeStyle>;

export interface Theme {
  mode: ResolvedThemeMode;
  dark: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: Record<TypeVariant, number>;
  lineHeight: Record<TypeVariant, number>;
  type: typeof typeScale;
  fontWeight: typeof fontWeight;
  /** Monospace family for money entry (`undefined` falls back to the system face). */
  monoFontFamily?: string;
  opacity: typeof opacity;
  motion: typeof motion;
  /** Shadow ramp (platform-aware). */
  shadows: typeof SHADOWS;
  /** Things that genuinely float. */
  elevation: {
    floating: Elevation;
    sheet: Elevation;
    pressed: Elevation;
  };
  /** Cards: a whisper of shadow only. */
  cardShadow: Elevation;
  modalShadow: Elevation;
}

export function getTheme(mode: ResolvedThemeMode): Theme {
  const dark = mode === 'dark';
  const colors = dark ? darkThemeColors : lightThemeColors;

  const floating = buildElevation(
    dark
      ? { shadowColor: palette.night950, shadowOpacity: 0.6, shadowRadius: 28, elevation: 12 }
      : { shadowColor: palette.night900, shadowOpacity: 0.14, shadowRadius: 20, elevation: 6 },
  );

  const sheet = buildElevation(
    dark
      ? { shadowColor: palette.night950, shadowOpacity: 0.7, shadowRadius: 40, shadowOffset: { width: 0, height: 18 }, elevation: 18 }
      : { shadowColor: palette.night900, shadowOpacity: 0.2, shadowRadius: 32, shadowOffset: { width: 0, height: 14 }, elevation: 12 },
  );

  const flat: Elevation = Platform.OS === 'web'
    ? { boxShadow: 'none' }
    : { shadowColor: colors.shadow, shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 };

  return {
    mode,
    dark,
    colors,
    spacing,
    radius,
    fontSize: {
      hero: typeScale.hero.fontSize,
      display: typeScale.display.fontSize,
      title: typeScale.title.fontSize,
      h3: typeScale.h3.fontSize,
      subtitle: typeScale.subtitle.fontSize,
      bodyLarge: typeScale.bodyLarge.fontSize,
      body: typeScale.body.fontSize,
      small: typeScale.small.fontSize,
      caption: typeScale.caption.fontSize,
      micro: typeScale.micro.fontSize,
      money: typeScale.money.fontSize,
      monoLarge: typeScale.monoLarge.fontSize,
      mono: typeScale.mono.fontSize,
    },
    lineHeight: {
      hero: typeScale.hero.lineHeight,
      display: typeScale.display.lineHeight,
      title: typeScale.title.lineHeight,
      h3: typeScale.h3.lineHeight,
      subtitle: typeScale.subtitle.lineHeight,
      bodyLarge: typeScale.bodyLarge.lineHeight,
      body: typeScale.body.lineHeight,
      small: typeScale.small.lineHeight,
      caption: typeScale.caption.lineHeight,
      micro: typeScale.micro.lineHeight,
      money: typeScale.money.lineHeight,
      monoLarge: typeScale.monoLarge.lineHeight,
      mono: typeScale.mono.lineHeight,
    },
    type: typeScale,
    fontWeight,
    monoFontFamily,
    opacity,
    motion,
    shadows: SHADOWS,
    elevation: { floating, sheet, pressed: flat },
    cardShadow: SHADOWS.sm,
    modalShadow: sheet,
  };
}

/** Normalizes a user preference (`system`) into a concrete mode. */
export function resolveThemeMode(
  preference: 'light' | 'dark' | 'system',
  systemScheme: 'light' | 'dark' | null | undefined,
): ResolvedThemeMode {
  if (preference === 'system') {
    return systemScheme === 'light' ? 'light' : 'dark';
  }
  return preference;
}

export const themes = {
  light: getTheme('light'),
  dark: getTheme('dark'),
} as const;
