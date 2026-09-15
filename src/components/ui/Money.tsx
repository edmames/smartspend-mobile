/**
 * Money — the app's signature typographic element.
 *
 * Renders the currency prefix small and muted next to large tabular digits, so
 * a column of figures aligns on the decimal edge and the eye lands on the
 * number rather than the label. Used for hero balances, list amounts and
 * summary figures.
 */
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/formatting';

export type MoneySize = 'hero' | 'money' | 'title' | 'subtitle' | 'body' | 'small';

export type MoneyTone = 'default' | 'muted' | 'success' | 'danger' | 'warning' | 'primary' | 'onPrimary' | 'auto';

export interface MoneyProps {
  value: number;
  size?: MoneySize;
  tone?: MoneyTone;
  /** Prefix with "Rp". */
  prefix?: boolean;
  /** Always show a leading + or −. */
  signed?: boolean;
  color?: string;
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  /** Animate the value towards `value` (hero balances). */
  animatedValue?: number;
  accessibilityLabel?: string;
}

const SIZE_SCALE: Record<MoneySize, { main: number; prefix: number; defaultWeight: TextStyle['fontWeight'] }> = {
  hero: { main: 38, prefix: 19, defaultWeight: '700' },
  money: { main: 30, prefix: 16, defaultWeight: '700' },
  title: { main: 22, prefix: 12, defaultWeight: '700' },
  subtitle: { main: 17, prefix: 11, defaultWeight: '600' },
  body: { main: 15, prefix: 10, defaultWeight: '600' },
  small: { main: 13, prefix: 9, defaultWeight: '600' },
};

export function Money({
  value,
  size = 'body',
  tone = 'default',
  prefix = true,
  signed = false,
  color,
  align,
  numberOfLines = 1,
  style,
  animatedValue,
  accessibilityLabel,
}: MoneyProps) {
  const { colors } = useTheme();
  const scale = SIZE_SCALE[size];

  const toneColor: Record<Exclude<MoneyTone, 'auto'>, string> = {
    default: colors.text,
    muted: colors.textMuted,
    success: colors.success,
    danger: colors.danger,
    warning: colors.warning,
    primary: colors.primary,
    onPrimary: colors.onPrimary,
  };

  const resolvedValue = animatedValue ?? value;
  const resolvedTone: Exclude<MoneyTone, 'auto'> =
    tone === 'auto' ? (resolvedValue > 0 ? 'success' : resolvedValue < 0 ? 'danger' : 'default') : tone;
  const textColor = color ?? toneColor[resolvedTone];

  const negative = resolvedValue < 0;
  const body = formatCurrency(Math.abs(resolvedValue), { withSymbol: false });
  const sign = signed ? (negative ? '−' : resolvedValue > 0 ? '+' : '') : negative ? '−' : '';

  return (
    <Text
      accessibilityLabel={accessibilityLabel ?? `${formatCurrency(resolvedValue)}`}
      numberOfLines={numberOfLines}
      allowFontScaling={false}
      adjustsFontSizeToFit
      style={[
        {
          color: textColor,
          fontSize: scale.main,
          fontWeight: scale.defaultWeight,
          letterSpacing: -0.6,
          fontVariant: ['tabular-nums'],
        },
        align ? { textAlign: align } : null,
        { flexShrink: 1 },
        style,
      ]}
    >
      {sign ? `${sign} ` : ''}
      {prefix ? (
        <Text style={{ fontSize: scale.prefix, fontWeight: '600', opacity: 0.7, letterSpacing: 0 }}>
          Rp{' '}
        </Text>
      ) : null}
      {body}
    </Text>
  );
}

export default Money;
