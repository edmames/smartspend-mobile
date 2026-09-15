/**
 * Rupiah amount input.
 *
 * Keeps the raw digits in state and renders them with thousand separators, so
 * decimals, letters and scientific notation can never be typed in the first
 * place. `parseAmountInput` still validates on submit (defence in depth).
 */
import { Input, type InputProps } from './Input';
import { extractDigits, groupDigits, parseAmountInput } from '../../utils/formatting';
import { useT } from '../../hooks/useTheme';

export interface AmountInputProps
  extends Omit<InputProps, 'value' | 'onChangeText' | 'keyboardType' | 'prefix'> {
  /** Raw digit string, e.g. "1250000". */
  value: string;
  onChangeText: (digits: string) => void;
  /** Shows the parsed value error instead of the passed-in `error`. */
  validateLive?: boolean;
}

export function AmountInput({ value, onChangeText, validateLive = false, error, helper, ...rest }: AmountInputProps) {
  const t = useT();

  const liveError = (() => {
    if (!validateLive) return undefined;
    if (value === '') return undefined;
    const parsed = parseAmountInput(value);
    return parsed.ok ? undefined : t(`error.${parsed.error}` as never);
  })();

  return (
    <Input
      {...rest}
      value={groupDigits(value)}
      onChangeText={(text) => onChangeText(extractDigits(text))}
      keyboardType="number-pad"
      inputMode="numeric"
      prefix="Rp"
      placeholder={rest.placeholder ?? '0'}
      error={error ?? liveError}
      helper={helper}
      maxLength={20}
    />
  );
}

export default AmountInput;
