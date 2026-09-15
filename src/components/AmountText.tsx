/**
 * Money display: right color and sign for every ledger direction.
 *
 * Direction colours come from the semantic ledger tokens (income green,
 * coral expense) rather than the alarm-red danger colour, so a ledger column
 * reads calm while still encoding meaning.
 */
import { AppText, type AppTextProps } from './ui/AppText';
import { useTheme } from '../hooks/useTheme';
import { directionOf, formatCurrency, formatSignedCurrency } from '../utils/formatting';
import type { TransactionType } from '../types';

export interface AmountTextProps extends Omit<AppTextProps, 'children'> {
  value: number;
  /** Ledger direction; inferred automatically when `type` is given. */
  direction?: 'in' | 'out' | 'neutral';
  type?: TransactionType;
  showSign?: boolean;
  variant?: AppTextProps['variant'];
}

export function AmountText({
  value,
  direction,
  type,
  showSign = true,
  variant = 'bodyLarge',
  ...rest
}: AmountTextProps) {
  const theme = useTheme();
  const resolved = direction ?? (type ? directionOf(type) : 'neutral');

  const color =
    resolved === 'in'
      ? theme.colors.incomeColor
      : resolved === 'out'
        ? theme.colors.expenseColor
        : theme.colors.text;

  const text = showSign ? formatSignedCurrency(value, resolved) : formatCurrency(value);

  return (
    <AppText variant={variant} weight="semibold" color={color} {...rest}>
      {text}
    </AppText>
  );
}

export default AmountText;
