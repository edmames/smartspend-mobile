/**
 * Typographic primitives.
 *
 * Every string in the app goes through `AppText` so size, weight, tracking and
 * colour come from one scale. Numbers should use `<Money>` (or `variant="money"`)
 * so digits are tabular and columns line up.
 */
import { Text, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import type { TypeVariant } from '../../styles/theme';

/** New scale. */
export type TextVariant = TypeVariant;
/** Legacy aliases kept so older screens keep compiling during refactors. */
export type LegacyTextVariant = 'heading' | 'display' | 'label';

export function resolveVariant(variant: TextVariant | LegacyTextVariant): TextVariant {
  switch (variant) {
    case 'heading':
      return 'title';
    case 'label':
      return 'micro';
    default:
      return variant;
  }
}

export type TextTone =
  | 'default'
  | 'medium'
  | 'muted'
  | 'faint'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'onPrimary';

export interface AppTextProps extends RNTextProps {
  variant?: TextVariant | LegacyTextVariant;
  tone?: TextTone;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  align?: TextStyle['textAlign'];
  /** Fixed colour escape hatch (amounts, chart labels). */
  color?: string;
  /** Force tabular figures for numeric content. */
  tabular?: boolean;
  children?: React.ReactNode;
}

export function AppText({
  variant = 'body',
  tone = 'default',
  weight,
  align,
  color,
  tabular = false,
  style,
  children,
  ...rest
}: AppTextProps) {
  const { colors, type, fontWeight, monoFontFamily } = useTheme();
  const resolved = resolveVariant(variant);

  const toneColor: Record<TextTone, string> = {
    default: colors.text,
    medium: colors.textMedium,
    muted: colors.textMuted,
    faint: colors.textFaint,
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    onPrimary: colors.onPrimary,
  };

  const scale = type[resolved];
  const moneyLike = resolved === 'money' || resolved === 'hero' || resolved === 'display';
  /** Mono variants get a real monospace face; digits stay tabular. */
  const monoLike = resolved === 'mono' || resolved === 'monoLarge';

  return (
    <Text
      {...rest}
      style={[
        {
          fontSize: scale.fontSize,
          lineHeight: scale.lineHeight,
          fontWeight: weight ? (fontWeight[weight] as TextStyle['fontWeight']) : (scale.fontWeight as TextStyle['fontWeight']),
          letterSpacing: scale.letterSpacing,
          color: color ?? toneColor[tone],
        },
        monoLike && monoFontFamily ? { fontFamily: monoFontFamily } : null,
        tabular || moneyLike || monoLike ? { fontVariant: ['tabular-nums'] } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export default AppText;
