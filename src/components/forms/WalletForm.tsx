/**
 * Create / edit a wallet.
 * Type is immutable after creation; the opening balance is stored as the
 * wallet's `initial` ledger transaction.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { MutationResult, Wallet, WalletBrand, WalletInput, WalletType } from '../../types';
import { useTheme, useT } from '../../hooks/useTheme';
import { WALLET_BRANDS, WALLET_BRAND_META, WALLET_TYPES, WALLET_TYPE_META } from '../../utils/constants';
import { formatAmountInput, parseAmountInput } from '../../utils/formatting';
import { validateWalletInput } from '../../utils/validation';
import { AppText } from '../ui/AppText';
import { AmountInput } from '../ui/AmountInput';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { WalletMark } from '../ui/WalletMark';

export interface WalletFormProps {
  /** Existing wallet when editing. */
  initial?: Wallet;
  wallets: Wallet[];
  onSubmit: (input: WalletInput) => Promise<MutationResult<Wallet>>;
  onCancel: () => void;
  submitLabel?: string;
}

export function WalletForm({ initial, wallets, onSubmit, onCancel, submitLabel }: WalletFormProps) {
  const theme = useTheme();
  const t = useT();
  const isEditing = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<WalletType>(initial?.type ?? 'cash');
  const [brand, setBrand] = useState<WalletBrand | null>(initial?.brand ?? null);
  const [balanceDigits, setBalanceDigits] = useState(
    initial?.initialBalance ? String(initial.initialBalance) : '',
  );
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrors({});

    const parsedBalance = balanceDigits ? parseAmountInput(balanceDigits) : null;
    const input: WalletInput = {
      name,
      type,
      brand: WALLET_BRANDS[type].length > 0 ? brand : null,
      initialBalance: parsedBalance ? (parsedBalance.value ?? 0) : null,
    };

    const validation = validateWalletInput(
      input,
      { wallets, targets: [], budgets: [] },
      { walletId: initial?.id },
    );

    if (!validation.ok) {
      const mapped: Partial<Record<string, string>> = {};
      for (const [field, code] of Object.entries(validation.errors)) {
        mapped[field] = t(`error.${code}` as never);
      }
      if (parsedBalance && !parsedBalance.ok) mapped.initialBalance = t(`error.${parsedBalance.error}` as never);
      setErrors(mapped);
      return;
    }

    setSubmitting(true);
    const result = await onSubmit(input);
    setSubmitting(false);
    if (!result.ok) setErrors({ form: result.error });
  };

  return (
    <View>
      <Input
        label={t('common.name')}
        value={name}
        onChangeText={setName}
        placeholder={t('wallet.name_placeholder')}
        error={errors.name}
        leftIcon="wallet-outline"
        autoCapitalize="words"
        maxLength={40}
      />

      {/* Type picker — each option is its own identity mark, not a coloured word. */}
      <View style={{ marginBottom: theme.spacing.md }}>
        <AppText variant="micro" tone="faint" style={{ marginBottom: 8, textTransform: 'uppercase' }}>
          {t('common.type')}
        </AppText>

        <View style={styles.typeRow}>
          {WALLET_TYPES.map((walletType) => {
            const meta = WALLET_TYPE_META[walletType];
            const selected = type === walletType;
            return (
              <Pressable
                key={walletType}
                onPress={() => {
                  if (isEditing) return;
                  setType(walletType);
                  // Providers differ per type; a cash wallet has none.
                  if (!WALLET_BRANDS[walletType].includes(brand as never)) setBrand(null);
                }}
                disabled={isEditing}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: isEditing }}
                accessibilityLabel={t(meta.key as never)}
                style={({ pressed }) => [
                  styles.typeTile,
                  {
                    backgroundColor: selected ? `${meta.color}1a` : theme.colors.backgroundAlt,
                    borderColor: selected ? `${meta.color}80` : theme.colors.border,
                    opacity: isEditing && !selected ? 0.45 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <WalletMark type={walletType} size={34} />
                <AppText
                  variant="caption"
                  weight={selected ? 'semibold' : 'regular'}
                  color={selected ? theme.colors.text : theme.colors.textMuted}
                  style={{ marginTop: 7 }}
                  numberOfLines={1}
                >
                  {t(meta.key as never)}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.typeHintRow}>
          <AppText variant="caption" tone={errors.type || errors.brand ? 'danger' : 'muted'}>
            {errors.type ?? errors.brand ?? (isEditing ? t('wallet.type_hint') : t('wallet.initial_balance_hint'))}
          </AppText>
        </View>
      </View>

      {/* Provider — only for bank / e-wallet wallets. */}
      {WALLET_BRANDS[type].length > 0 ? (
        <View style={{ marginBottom: theme.spacing.md }}>
          <AppText variant="micro" tone="faint" style={{ marginBottom: 8, textTransform: 'uppercase' }}>
            {t('wallet.provider')}
          </AppText>

          <View style={styles.brandRow}>
            <Pressable
              onPress={() => setBrand(null)}
              accessibilityRole="radio"
              accessibilityState={{ selected: brand === null }}
              style={({ pressed }) => [
                styles.brandChip,
                {
                  backgroundColor: brand === null ? theme.colors.chipTint : theme.colors.backgroundAlt,
                  borderColor: brand === null ? theme.colors.borderStrong : theme.colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText variant="caption" tone={brand === null ? 'default' : 'muted'}>
                {t('wallet.provider_none')}
              </AppText>
            </Pressable>

            {WALLET_BRANDS[type].map((option) => {
              const meta = WALLET_BRAND_META[option];
              const selected = brand === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setBrand(option)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={meta.label}
                  style={({ pressed }) => [
                    styles.brandChip,
                    {
                      backgroundColor: selected ? `${meta.color}1f` : theme.colors.backgroundAlt,
                      borderColor: selected ? `${meta.color}80` : theme.colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <WalletMark type={type} brand={option} size={22} style={{ marginRight: 7 }} />
                  <AppText variant="caption" weight={selected ? 'semibold' : 'regular'} color={selected ? meta.color : theme.colors.textMuted}>
                    {meta.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
            {errors.brand ?? t('wallet.provider_optional')}
          </AppText>
        </View>
      ) : null}

      <AmountInput
        label={`${t('wallet.initial_balance')} (${t('common.optional')})`}
        value={balanceDigits}
        onChangeText={setBalanceDigits}
        error={errors.initialBalance}
        validateLive
      />

      {errors.form ? (
        <View style={[styles.errorBox, { backgroundColor: `${theme.colors.danger}18`, borderRadius: theme.radius.md }]}>
          <Icon name="alert-circle-outline" size={16} color={theme.colors.danger} />
          <AppText variant="small" tone="danger" style={{ flex: 1, marginLeft: 8 }}>
            {errors.form}
          </AppText>
        </View>
      ) : null}

      <View style={[styles.actions, { marginTop: theme.spacing.sm }]}>
        <Button label={t('common.cancel')} variant="secondary" onPress={onCancel} style={{ flex: 1 }} disabled={submitting} />
        <Button
          label={submitLabel ?? (isEditing ? t('common.save_changes') : t('wallet.save_action'))}
          onPress={handleSubmit}
          loading={submitting}
          icon="checkmark"
          style={{ flex: 1.4 }}
        />
      </View>
    </View>
  );
}

/** Balance helper reused by the wallet detail screen. */
export function formatWalletInitialBalance(value: number): string {
  return formatAmountInput(value);
}

const styles = StyleSheet.create({
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  typeHintRow: {
    marginTop: 6,
  },
  brandRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
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

export default WalletForm;
