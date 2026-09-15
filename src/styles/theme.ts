/**
 * Design tokens: spacing, radii, typography, elevation and motion.
 *
 * Rules that keep the UI coherent:
 *  - Spacing follows a 4pt grid; screens use `screen` padding, cards `card`.
 *  - Radii come from one scale (cards 20, inner 12, pills 999).
 *  - Type sizes are paired with tracking; money uses tabular figures.
 *  - Elevation is reserved for things that genuinely float (sheets, FAB,
 *    toasts) — cards are flat surfaces separated by hairlines.
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
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  /** Screen horizontal padding. */
  screen: 20,
  /** Card interior padding. */
  card: 18,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  /** Inputs, rows, inner blocks. */
  md: 12,
  /** Cards. */
  lg: 20,
  /** Hero panels + sheets. */
  xl: 26,
  pill: 999,
} as const;

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing: number;
}

/**
 * Type scale. `hero`/`display` are for money; `micro` is the uppercase label
 * used above numbers and section titles.
 */
export const typeScale = {
  hero: { fontSize: 40, lineHeight: 44, fontWeight: '700', letterSpacing: -1.4 },
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.9 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2 },
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400', letterSpacing: 0 },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: 0.1 },
  caption: { fontSize: 11.5, lineHeight: 15, fontWeight: '500', letterSpacing: 0.2 },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0.9 },
  money: { fontSize: 33, lineHeight: 38, fontWeight: '700', letterSpacing: -1.1 },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof typeScale;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const opacity = {
  disabled: 0.4,
  muted: 0.7,
  pressed: 0.92,
} as const;

/** Motion tokens — durations in ms, easings match iOS/Android defaults. */
export const motion = {
  /** Micro feedback: press, toggle. */
  fast: 120,
  /** Standard transitions: fades, entrance. */
  normal: 260,
  /** Sheets, modals, hero number. */
  slow: 340,
  /** Count-up duration for money figures. */
  countUp: 720,
  /** Delay between staggered children. */
  stagger: 55,
  /** Press scale factor. */
  pressScale: 0.975,
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
  opacity: typeof opacity;
  motion: typeof motion;
  /** Things that genuinely float. */
  elevation: {
    floating: Elevation;
    sheet: Elevation;
    pressed: Elevation;
  };
  /** Card shadows: effectively none — kept for API compatibility. */
  cardShadow: Elevation;
  modalShadow: Elevation;
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

export function getTheme(mode: ResolvedThemeMode): Theme {
  const dark = mode === 'dark';
  const colors = dark ? darkThemeColors : lightThemeColors;

  const floating = buildElevation(
    dark
      ? { shadowColor: palette.ink950, shadowOpacity: 0.6, shadowRadius: 28, elevation: 12 }
      : { shadowColor: palette.ink900, shadowOpacity: 0.14, shadowRadius: 20, elevation: 6 },
  );

  const sheet = buildElevation(
    dark
      ? { shadowColor: palette.ink950, shadowOpacity: 0.7, shadowRadius: 40, shadowOffset: { width: 0, height: 18 }, elevation: 18 }
      : { shadowColor: palette.ink900, shadowOpacity: 0.2, shadowRadius: 32, shadowOffset: { width: 0, height: 14 }, elevation: 12 },
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
      subtitle: typeScale.subtitle.fontSize,
      bodyLarge: typeScale.bodyLarge.fontSize,
      body: typeScale.body.fontSize,
      small: typeScale.small.fontSize,
      caption: typeScale.caption.fontSize,
      micro: typeScale.micro.fontSize,
      money: typeScale.money.fontSize,
    },
    lineHeight: {
      hero: typeScale.hero.lineHeight,
      display: typeScale.display.lineHeight,
      title: typeScale.title.lineHeight,
      subtitle: typeScale.subtitle.lineHeight,
      bodyLarge: typeScale.bodyLarge.lineHeight,
      body: typeScale.body.lineHeight,
      small: typeScale.small.lineHeight,
      caption: typeScale.caption.lineHeight,
      micro: typeScale.micro.lineHeight,
      money: typeScale.money.lineHeight,
    },
    type: typeScale,
    fontWeight,
    opacity,
    motion,
    elevation: { floating, sheet, pressed: flat },
    cardShadow: flat,
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
