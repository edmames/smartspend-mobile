/**
 * Deposit into / withdraw from a savings target.
 *
 * Both directions move money between a wallet and a target, so the ledger
 * total stays the same; the ledger validator blocks any movement that would
 * overdraw the wallet or the target.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MutationResult, SavingsMovementInput, SavingsTarget, Transaction, Wallet } from '../../types';
import { useTheme, useT } from '../../hooks/useTheme';
import { parseAmountInput, formatCurrency } from '../../utils/formatting';
import { savingsBalance, walletBalance } from '../../utils/calculations';
import { AppText } from '../ui/AppText';
import { AmountInput } from '../ui/AmountInput';
import { Button } from '../ui/Button';
import { DateField } from '../ui/DateField';
import { Icon } from '../ui/Icon';
import { Select } from '../ui/Select';
import { todayISO } from '../../utils/date';

export interface SavingsMovementFormProps {
  mode: 'deposit' | 'withdraw';
  target: SavingsTarget;
  wallets: Wallet[];
  transactions: Transaction[];
  onSubmit: (input: SavingsMovementInput) => Promise<MutationResult<Transaction>>;
  onCancel: () => void;
}

export function SavingsMovementForm({
  mode,
  target,
  wallets,
  transactions,
  onSubmit,
  onCancel,
}: SavingsMovementFormProps) {
  const theme = useTheme();
  const t = useT();

  const [amountDigits, setAmountDigits] = useState('');
  const [walletId, setWalletId] = useState<string | undefined>(wallets[0]?.id);
  const [date, setDate] = useState(todayISO());
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!walletId && wallets.length > 0) setWalletId(wallets[0].id);
  }, [walletId, wallets]);

  const savedBalance = savingsBalance(transactions, target.id);
  const walletAvailable = walletId ? walletBalance(transactions, walletId, date) : 0;
  const available = mode === 'deposit' ? walletAvailable : savedBalance;

  const parsed = parseAmountInput(amountDigits);
  const overLimit = parsed.ok && (parsed.value ?? 0) > available;

  const handleSubmit = async () => {
    setErrors({});

    if (!parsed.ok) {
      setErrors({ amount: t(`error.${parsed.error}` as never) });
      return;
    }
    if (!walletId) {
      setErrors({ walletId: t('error.wallet_required') });
      return;
    }
    if (overLimit) {
      setErrors({
        amount: t(mode === 'deposit' ? 'error.insufficient_wallet' : 'error.insufficient_savings'),
      });
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      targetId: target.id,
      amount: parsed.value ?? 0,
      walletId,
      date,
    });
    setSubmitting(false);
    if (!result.ok) setErrors({ form: result.error });
  };

  const walletOptions = wallets.map((wallet) => ({
    value: wallet.id,
    label: wallet.name,
    description: formatCurrency(walletBalance(transactions, wallet.id, date)),
  }));

  return (
    <View>
      <View style={[styles.summary, { backgroundColor: theme.colors.cardAlt, borderRadius: theme.radius.md }]}>
        <Icon
          name={mode === 'deposit' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
          size={20}
          color={mode === 'deposit' ? theme.colors.success : theme.colors.warning}
        />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <AppText variant="small" weight="semibold" numberOfLines={1}>
            {target.name}
          </AppText>
          <AppText variant="caption" tone="muted">
            {`${t('savings.saved')}: ${formatCurrency(savedBalance)}`}
          </AppText>
        </View>
      </View>

      <AmountInput
        label={t('common.amount')}
        value={amountDigits}
        onChangeText={setAmountDigits}
        error={errors.amount}
        helper={`${t('common.remaining')}: ${formatCurrency(available)}`}
        autoFocus
        validateLive
      />

      <DateField label={t('common.date')} value={date} onChange={setDate} error={errors.date} />

      <Select
        label={mode === 'deposit' ? t('savings.saved_from') : t('savings.withdraw_to')}
        value={walletId}
        options={walletOptions}
        onChange={setWalletId}
        error={errors.walletId}
      />

      {overLimit ? (
        <View style={[styles.hint, { backgroundColor: `${theme.colors.warning}1a`, borderRadius: theme.radius.sm }]}>
          <Icon name="warning-outline" size={14} color={theme.colors.warning} />
          <AppText variant="caption" color={theme.colors.warning} style={{ marginLeft: 6, flex: 1 }}>
            {t(mode === 'deposit' ? 'error.insufficient_wallet' : 'error.insufficient_savings')}
          </AppText>
        </View>
      ) : (
        <View style={[styles.hint, { backgroundColor: theme.colors.accentSoft, borderRadius: theme.radius.sm }]}>
          <Icon name="information-circle-outline" size={14} color={theme.colors.primary} />
          <AppText variant="caption" color={theme.colors.primary} style={{ marginLeft: 6, flex: 1 }}>
            {t('savings.deposit_hint')}
          </AppText>
        </View>
      )}

      {errors.form ? (
        <View style={[styles.errorBox, { backgroundColor: `${theme.colors.danger}18`, borderRadius: theme.radius.md }]}>
          <Icon name="alert-circle-outline" size={16} color={theme.colors.danger} />
          <AppText variant="small" tone="danger" style={{ flex: 1, marginLeft: 8 }}>
            {errors.form}
          </AppText>
        </View>
      ) : null}

      <View style={[styles.actions, { marginTop: theme.spacing.md }]}>
        <Button label={t('common.cancel')} variant="secondary" onPress={onCancel} style={{ flex: 1 }} disabled={submitting} />
        <Button
          label={mode === 'deposit' ? t('savings.deposit') : t('savings.withdraw')}
          variant={mode === 'deposit' ? 'success' : 'primary'}
          onPress={handleSubmit}
          loading={submitting}
          icon={mode === 'deposit' ? 'arrow-down' : 'arrow-up'}
          style={{ flex: 1.3 }}
        />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 14,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
  },
});

export default SavingsMovementForm;
