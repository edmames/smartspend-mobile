/**
 * Create / edit a transaction.
 *
 * Dense by design: no dropdowns except the date picker.
 *   row 1  type tabs      Masuk · Keluar · Transfer · Setor · Tarik
 *   row 2  amount         large tabular field + available balance
 *   row 3  category       every category is a tappable tile (CategoryGrid)
 *   row 4  wallet         wallet chips carrying the same marks as the Dompet tab
 *   row 5  date + method  compact date field + payment-method chips
 *   row 6  note           one-line description
 *
 * Rules enforced here (and re-checked by the store + ledger validator):
 *  - type drives which fields are required (transfer needs a destination wallet,
 *    savings types need a target, QRIS needs a bank/e-wallet source),
 *  - the date can never be in the future,
 *  - the amount is a positive integer ≤ Rp 1 trillion.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import type {
  MutationResult,
  PaymentMethod,
  SavingsTarget,
  Transaction,
  TransactionInput,
  TransactionType,
  Wallet,
} from '../../types';
import { useTheme, useT } from '../../hooks/useTheme';
import {
  DEFAULT_EXPENSE_CATEGORY,
  DEFAULT_INCOME_CATEGORY,
  EXPENSE_CATEGORY_KEYS,
  INCOME_CATEGORY_KEYS,
  PAYMENT_METHOD_META,
  PAYMENT_METHODS,
  QUICK_TRANSACTION_TYPES,
  TRANSACTION_TYPE_META,
  WALLET_TYPE_META,
  defaultPaymentMethodForWallet,
} from '../../utils/constants';
import { todayISO } from '../../utils/date';
import { extractDigits, formatCurrency, groupDigits, parseAmountInput } from '../../utils/formatting';
import { walletBalance } from '../../utils/calculations';
import { validateTransactionInput } from '../../utils/validation';
import { haptics } from '../../utils/haptics';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { CategoryGrid } from '../ui/CategoryGrid';
import { DateField } from '../ui/DateField';
import { Icon, type IconName } from '../ui/Icon';
import { Input } from '../ui/Input';
import { AppModal } from '../ui/Modal';
import { Money } from '../ui/Money';
import { WalletMark } from '../ui/WalletMark';
import { WalletForm } from './WalletForm';
import { useWallets } from '../../hooks/useWallets';
import { useToast } from '../ui/Toast';

export interface TransactionFormProps {
  initial?: Transaction;
  wallets: Wallet[];
  targets: SavingsTarget[];
  transactions: Transaction[];
  onSubmit: (input: TransactionInput) => Promise<MutationResult<Transaction>>;
  onCancel: () => void;
  /** Preselected type for new transactions. */
  defaultType?: TransactionType;
  submitLabel?: string;
  /** Hides the type selector (savings deposit/withdraw sheets). */
  lockType?: boolean;
}

/** Compact type tabs: short label + icon, five fit on one row. */
const TYPE_ICONS: Record<TransactionType, IconName> = {
  income: 'trending-up-outline',
  expense: 'trending-down-outline',
  transfer: 'swap-horizontal-outline',
  savings_deposit: 'arrow-down-circle-outline',
  savings_withdraw: 'arrow-up-circle-outline',
  initial: 'flag-outline',
};

const TYPE_SHORT_KEYS: Record<string, string> = {
  income: 'transaction.short.income',
  expense: 'transaction.short.expense',
  transfer: 'transaction.short.transfer',
  savings_deposit: 'transaction.short.savings_deposit',
  savings_withdraw: 'transaction.short.savings_withdraw',
};

export function TransactionForm({
  initial,
  wallets,
  targets,
  transactions,
  onSubmit,
  onCancel,
  defaultType = 'expense',
  submitLabel,
  lockType = false,
}: TransactionFormProps) {
  const theme = useTheme();
  const t = useT();
  const isEditing = Boolean(initial);

  const initialType = initial?.type ?? defaultType;
  const [type, setType] = useState<TransactionType>(initialType);
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [amountDigits, setAmountDigits] = useState(initial ? String(initial.amount) : '');
  const [category, setCategory] = useState(
    initial?.category ?? (initialType === 'income' ? DEFAULT_INCOME_CATEGORY : DEFAULT_EXPENSE_CATEGORY),
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [sourceWalletId, setSourceWalletId] = useState<string | undefined>(initial?.walletSourceId ?? wallets[0]?.id);
  const [destinationWalletId, setDestinationWalletId] = useState<string | undefined>(
    initial?.walletDestinationId ?? undefined,
  );
  const [savingsTargetId, setSavingsTargetId] = useState<string | undefined>(initial?.savingsTargetId ?? targets[0]?.id);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>(initial?.paymentMethod);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [newWalletOpen, setNewWalletOpen] = useState(false);
  const [newWalletTarget, setNewWalletTarget] = useState<'source' | 'destination'>('source');
  const { addWallet } = useWallets();
  const toast = useToast();

  const needsDestination = type === 'transfer';
  const isSavings = type === 'savings_deposit' || type === 'savings_withdraw';
  const isWithdraw = type === 'savings_withdraw';
  const showsCategory = type === 'income' || type === 'expense';
  const showsPaymentMethod = type === 'income' || type === 'expense';
  /**
   * Savings movements are created from the Tabungan screen; here they only show
   * up while *editing* an existing one, so the type is locked.
   */
  const isQuickType = QUICK_TRANSACTION_TYPES.includes(type);

  /**
   * Wallet field wording follows what actually happens to the money, not the
   * field name: income credits the wallet ("disimpan ke"), spending debits it
   * ("diambil dari"), and transfers have a clear from → to pair.
   */
  const sourceLabelKey = needsDestination
    ? 'transaction.wallet_from_short'
    : isSavings
      ? 'transaction.wallet_from_short'
      : 'transaction.wallet_from';
  const destinationLabelKey = 'transaction.wallet_to_short';
  const walletLabelKey = type === 'income' ? 'transaction.wallet_to' : isWithdraw ? destinationLabelKey : sourceLabelKey;
  /** Money moving INTO the selected wallet (income, savings withdrawal). */
  const walletReceives = type === 'income' || isWithdraw;

  const sourceWallet = wallets.find((wallet) => wallet.id === sourceWalletId);

  const categoryKeys = type === 'income' ? INCOME_CATEGORY_KEYS : EXPENSE_CATEGORY_KEYS;

  /* Keep the category valid when the type changes. */
  useEffect(() => {
    if (!showsCategory) return;
    if (!categoryKeys.includes(category)) {
      setCategory(type === 'income' ? DEFAULT_INCOME_CATEGORY : DEFAULT_EXPENSE_CATEGORY);
    }
  }, [category, categoryKeys, showsCategory, type]);

  /* Sensible default payment method per source wallet, minus QRIS for cash. */
  useEffect(() => {
    if (!showsPaymentMethod) {
      setPaymentMethod(undefined);
      return;
    }
    if (paymentMethod && PAYMENT_METHOD_META[paymentMethod].requiresNonCashWallet && sourceWallet?.type === 'cash') {
      setPaymentMethod(undefined);
      return;
    }
    if (!paymentMethod && sourceWallet) {
      setPaymentMethod(defaultPaymentMethodForWallet(sourceWallet.type));
    }
  }, [paymentMethod, showsPaymentMethod, sourceWallet]);

  /* Destination wallet must differ from source. */
  useEffect(() => {
    if (needsDestination && destinationWalletId === sourceWalletId) {
      setDestinationWalletId(wallets.find((wallet) => wallet.id !== sourceWalletId)?.id);
    }
  }, [destinationWalletId, needsDestination, sourceWalletId, wallets]);

  const availableBalance = useMemo(() => {
    if (!sourceWallet) return 0;
    const ledger = initial ? transactions.filter((row) => row.id !== initial.id) : transactions;
    return walletBalance(ledger, sourceWallet.id, date);
  }, [date, initial, sourceWallet, transactions]);

  const targetBalances = useMemo(() => {
    const map = new Map<string, number>();
    for (const target of targets) {
      let saved = 0;
      for (const row of transactions) {
        if (row.savingsTargetId !== target.id) continue;
        if (row.type === 'savings_deposit') saved += row.amount;
        else if (row.type === 'savings_withdraw') saved -= row.amount;
      }
      map.set(target.id, Math.max(0, saved));
    }
    return map;
  }, [targets, transactions]);

  const paymentOptions = PAYMENT_METHODS.filter(
    (method) => !PAYMENT_METHOD_META[method].requiresNonCashWallet || sourceWallet?.type !== 'cash',
  );

  const handleSubmit = async () => {
    setErrors({});
    const parsed = amountDigits ? parseAmountInput(amountDigits) : null;

    if (!parsed || !parsed.ok) {
      setErrors({ amount: t(`error.${parsed?.error ?? 'amount_required'}` as never) });
      return;
    }

    const input: TransactionInput = {
      type,
      amount: parsed.value ?? 0,
      date,
      category,
      description,
      walletSourceId: sourceWalletId,
      walletDestinationId: needsDestination ? destinationWalletId : isWithdraw ? sourceWalletId : undefined,
      savingsTargetId: isSavings ? savingsTargetId : undefined,
      paymentMethod: showsPaymentMethod ? paymentMethod : undefined,
    };

    const validation = validateTransactionInput(input, { wallets, targets, budgets: [] });
    if (!validation.ok) {
      const mapped: Partial<Record<string, string>> = {};
      for (const [field, code] of Object.entries(validation.errors)) {
        mapped[field] = t(`error.${code}` as never);
      }
      setErrors(mapped);
      return;
    }

    setSubmitting(true);
    const result = await onSubmit(input);
    setSubmitting(false);
    if (!result.ok) setErrors({ form: result.error });
  };

  const previewAmount = parseAmountInput(amountDigits);
  const typedAmount = previewAmount.ok ? (previewAmount.value ?? 0) : 0;
  const projectedBalance =
    sourceWallet && typedAmount > 0
      ? walletReceives
        ? availableBalance + typedAmount
        : availableBalance - typedAmount
      : undefined;

  return (
    <View>
      {/* ------------------------------------------------------------------ */}
      {/* Type — five compact tabs, no dropdown.                              */}
      {/* ------------------------------------------------------------------ */}
      {!lockType && !isQuickType ? (
        <View
          style={[
            styles.lockedType,
            { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.border, borderRadius: theme.radius.md, marginBottom: theme.spacing.md },
          ]}
        >
          <Icon name={TYPE_ICONS[type] ?? 'ellipse-outline'} size={15} color={theme.colors.primary} />
          <AppText variant="small" weight="semibold" style={{ marginLeft: 8, flex: 1 }} numberOfLines={1}>
            {t(TRANSACTION_TYPE_META[type].key as never)}
          </AppText>
          <AppText variant="caption" tone="faint" numberOfLines={1}>
            {t('transaction.savings_locked')}
          </AppText>
        </View>
      ) : null}

      {!lockType && isQuickType ? (
        <View
          style={[
            styles.tabs,
            { backgroundColor: theme.colors.backgroundAlt, borderRadius: theme.radius.md, marginBottom: theme.spacing.md },
          ]}
        >
          {QUICK_TRANSACTION_TYPES.map((value) => {
            const selected = value === type;
            return (
              <Pressable
                key={value}
                onPress={() => {
                  haptics.selection();
                  setType(value);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={t(TRANSACTION_TYPE_META[value].key as never)}
                style={({ pressed }) => [
                  styles.tab,
                  {
                    backgroundColor: selected ? theme.colors.card : 'transparent',
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Icon
                  name={TYPE_ICONS[value] ?? 'ellipse-outline'}
                  size={14}
                  color={selected ? theme.colors.primary : theme.colors.textMuted}
                />
                <AppText
                  variant="caption"
                  weight={selected ? 'semibold' : 'regular'}
                  color={selected ? theme.colors.text : theme.colors.textMuted}
                  numberOfLines={1}
                  style={{ marginTop: 3 }}
                >
                  {t((TYPE_SHORT_KEYS[value] ?? 'common.type') as never)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Amount — the hero of the form.                                      */}
      {/* ------------------------------------------------------------------ */}
      <View
        style={[
          styles.amountBlock,
          {
            backgroundColor: theme.colors.backgroundAlt,
            borderRadius: theme.radius.md,
            borderColor: errors.amount ? theme.colors.danger : theme.colors.border,
          },
        ]}
      >
        <View style={styles.amountRow}>
          <AppText variant="title" tone="muted" style={{ marginRight: 6 }}>
            Rp
          </AppText>
          <TextInput
            value={groupDigits(amountDigits)}
            onChangeText={(text) => setAmountDigits(extractDigits(text))}
            placeholder="0"
            placeholderTextColor={theme.colors.textFaint}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={20}
            autoFocus={!isEditing}
            accessibilityLabel={t('common.amount')}
            style={[styles.amountInput, { color: theme.colors.text }]}
          />
        </View>

        <View style={[styles.amountMeta, { borderTopColor: theme.colors.border }]}>
          {errors.amount ? (
            <AppText variant="caption" tone="danger" style={{ flex: 1 }} numberOfLines={2}>
              {errors.amount}
            </AppText>
          ) : sourceWallet ? (
            <AppText variant="caption" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
              {`${t(walletReceives ? 'transaction.balance_now' : 'transaction.available')} · ${sourceWallet.name}`}
            </AppText>
          ) : (
            <AppText variant="caption" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
              {t(walletLabelKey as never)}
            </AppText>
          )}

          {sourceWallet ? (
            projectedBalance !== undefined && projectedBalance < 0 ? (
              <AppText variant="caption" tone="danger" tabular numberOfLines={1}>
                {`→ ${formatCurrency(projectedBalance)}`}
              </AppText>
            ) : (
              <AppText variant="caption" tone="muted" tabular numberOfLines={1}>
                {formatCurrency(projectedBalance ?? availableBalance)}
              </AppText>
            )
          ) : null}
        </View>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Category — one tile per category.                                   */}
      {/* ------------------------------------------------------------------ */}
      {showsCategory ? (
        <View style={{ marginTop: theme.spacing.lg }}>
          <AppText variant="micro" tone="faint" style={styles.sectionLabel}>
            {t('common.category').toUpperCase()}
          </AppText>
          <CategoryGrid categories={categoryKeys} value={category} onChange={setCategory} error={errors.category} />
        </View>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Wallets — chips with the same marks as the Dompet tab.               */}
      {/* ------------------------------------------------------------------ */}
      <View style={{ marginTop: theme.spacing.lg }}>
        <AppText variant="micro" tone="faint" style={styles.sectionLabel}>
          {t(walletLabelKey as never).toUpperCase()}
        </AppText>
        <WalletChips
          wallets={wallets}
          value={sourceWalletId}
          onChange={(id) => {
            haptics.selection();
            setSourceWalletId(id);
          }}
          excludedId={needsDestination ? destinationWalletId : undefined}
          error={errors.walletSourceId}
          onCreate={() => {
            setNewWalletTarget('source');
            setNewWalletOpen(true);
          }}
        />
      </View>

      {needsDestination ? (
        <View style={{ marginTop: theme.spacing.md }}>
          <AppText variant="micro" tone="faint" style={styles.sectionLabel}>
            {t(destinationLabelKey as never).toUpperCase()}
          </AppText>
          <WalletChips
            wallets={wallets}
            value={destinationWalletId}
            onChange={(id) => {
              haptics.selection();
              setDestinationWalletId(id);
            }}
            excludedId={sourceWalletId}
            error={errors.walletDestinationId}
            onCreate={() => {
              setNewWalletTarget('destination');
              setNewWalletOpen(true);
            }}
          />
        </View>
      ) : null}

      {isSavings ? (
        <View style={{ marginTop: theme.spacing.md }}>
          <AppText variant="micro" tone="faint" style={styles.sectionLabel}>
            {t('transaction.savings_target').toUpperCase()}
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {targets.map((target) => {
              const selected = target.id === savingsTargetId;
              const saved = targetBalances.get(target.id) ?? 0;
              return (
                <Pressable
                  key={target.id}
                  onPress={() => {
                    haptics.selection();
                    setSavingsTargetId(target.id);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: selected ? theme.colors.chipTint : theme.colors.backgroundAlt,
                      borderColor: selected ? theme.colors.borderStrong : theme.colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Icon
                    name="flag-outline"
                    size={14}
                    color={selected ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <View style={{ marginLeft: 8, maxWidth: 150 }}>
                    <AppText variant="caption" weight={selected ? 'semibold' : 'regular'} numberOfLines={1}>
                      {target.name}
                    </AppText>
                    <AppText variant="caption" tone="faint" tabular numberOfLines={1}>
                      {`${formatCurrency(saved)} / ${formatCurrency(target.goalAmount)}`}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          {errors.savingsTargetId ? (
            <AppText variant="caption" tone="danger" style={{ marginTop: 6 }}>
              {errors.savingsTargetId}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {/* Savings movements live on the Tabungan screen — link, don't duplicate. */}
      {!lockType && !isSavings && targets.length > 0 ? (
        <Pressable
          onPress={() => router.push('/(tabs)/savings')}
          style={[
            styles.savingsLink,
            { backgroundColor: theme.colors.backgroundAlt, borderRadius: theme.radius.md, marginTop: theme.spacing.md },
          ]}
        >
          <Icon name="flag-outline" size={14} color={theme.colors.textMuted} />
          <AppText variant="caption" tone="muted" style={{ flex: 1, marginLeft: 8 }} numberOfLines={1}>
            {t('transaction.savings_flow')}
          </AppText>
          <Icon name="chevron-forward" size={13} color={theme.colors.textFaint} />
        </Pressable>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Date + payment method — one compact row.                            */}
      {/* ------------------------------------------------------------------ */}
      <View style={[styles.metaRow, { marginTop: theme.spacing.lg }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <DateField label={t('common.date')} value={date} onChange={setDate} error={errors.date} />
        </View>

        {showsPaymentMethod ? (
          <View style={{ flex: 1.15, minWidth: 0, marginLeft: theme.spacing.md }}>
            <AppText variant="micro" tone="faint" style={styles.sectionLabel}>
              {t('transaction.payment_method').toUpperCase()}
            </AppText>
            <View style={styles.chipRowWrap}>
              {paymentOptions.map((method) => {
                const selected = method === paymentMethod;
                return (
                  <Pressable
                    key={method}
                    onPress={() => {
                      haptics.selection();
                      setPaymentMethod(method);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.miniChip,
                      {
                        backgroundColor: selected ? theme.colors.chipTint : theme.colors.backgroundAlt,
                        borderColor: selected ? theme.colors.borderStrong : theme.colors.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      weight={selected ? 'semibold' : 'regular'}
                      color={selected ? theme.colors.text : theme.colors.textMuted}
                      numberOfLines={1}
                    >
                      {t(PAYMENT_METHOD_META[method].key as never)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            {errors.paymentMethod ? (
              <AppText variant="caption" tone="danger" style={{ marginTop: 6 }}>
                {errors.paymentMethod}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>

      <Input
        value={description}
        onChangeText={setDescription}
        placeholder={`${t('common.description')} (${t('common.optional')})`}
        maxLength={120}
        error={errors.description}
        containerStyle={{ marginTop: theme.spacing.md, marginBottom: 0 }}
      />

      {errors.form ? (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: `${theme.colors.danger}18`, borderRadius: theme.radius.md, marginTop: theme.spacing.md },
          ]}
        >
          <Icon name="alert-circle-outline" size={16} color={theme.colors.danger} />
          <AppText variant="small" tone="danger" style={{ flex: 1, marginLeft: 8 }}>
            {errors.form}
          </AppText>
        </View>
      ) : null}

      {/* Result preview: what the wallet(s) will read after saving. */}
      <View style={[styles.preview, { backgroundColor: theme.colors.backgroundAlt, borderRadius: theme.radius.md }]}>
        <Money value={typedAmount} size="small" tone="muted" />
        <Icon name="arrow-forward" size={12} color={theme.colors.textFaint} style={{ marginHorizontal: 8 }} />
        <AppText variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
          {sourceWallet
            ? `${sourceWallet.name}${
                needsDestination
                  ? ` → ${wallets.find((wallet) => wallet.id === destinationWalletId)?.name ?? '—'}`
                  : ''
              }`
            : '—'}
        </AppText>
      </View>

      <AppModal
        visible={newWalletOpen}
        onClose={() => setNewWalletOpen(false)}
        title={t('wallet.new')}
        subtitle={t('wallet.initial_balance_hint')}
      >
        <WalletForm
          wallets={wallets}
          onSubmit={async (input) => {
            const result = await addWallet(input);
            if (result.ok) {
              haptics.success();
              if (newWalletTarget === 'source') setSourceWalletId(result.data.id);
              else setDestinationWalletId(result.data.id);
              setNewWalletOpen(false);
              toast.success(t('wallet.add'));
            }
            return result;
          }}
          onCancel={() => setNewWalletOpen(false)}
          submitLabel={t('wallet.save_action')}
        />
      </AppModal>

      <View style={[styles.actions, { marginTop: theme.spacing.lg }]}>
        <Button label={t('common.cancel')} variant="secondary" onPress={onCancel} style={{ flex: 1 }} disabled={submitting} />
        <Button
          label={submitLabel ?? (isEditing ? t('common.save_changes') : t('transaction.add'))}
          onPress={handleSubmit}
          loading={submitting}
          icon="checkmark"
          style={{ flex: 1.4 }}
        />
      </View>
    </View>
  );
}

/** Horizontal wallet chips: mark + name + balance. */
function WalletChips({
  wallets,
  value,
  onChange,
  excludedId,
  error,
  onCreate,
}: {
  wallets: Wallet[];
  value?: string;
  onChange: (id: string) => void;
  excludedId?: string;
  error?: string;
  /** Opens the inline "new wallet" form. */
  onCreate?: () => void;
}) {
  const theme = useTheme();
  const t = useT();

  if (wallets.length === 0 && !onCreate) {
    return (
      <AppText variant="caption" tone="muted">
        {t('error.need_wallet_first')}
      </AppText>
    );
  }

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {wallets.map((wallet) => {
          const selected = wallet.id === value;
          const disabled = wallet.id === excludedId;
          return (
            <Pressable
              key={wallet.id}
              onPress={() => {
                if (!disabled) onChange(wallet.id);
              }}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={wallet.name}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: selected ? theme.colors.chipTint : theme.colors.backgroundAlt,
                  borderColor: selected ? theme.colors.borderStrong : theme.colors.border,
                  opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <WalletMark type={wallet.type} brand={wallet.brand} size={24} />
              <View style={{ marginLeft: 8, maxWidth: 140 }}>
                <AppText variant="caption" weight={selected ? 'semibold' : 'regular'} numberOfLines={1}>
                  {wallet.name}
                </AppText>
                <AppText variant="caption" tone="faint" numberOfLines={1}>
                  {wallet.brand ? wallet.brand : t(WALLET_TYPE_META[wallet.type].key as never)}
                </AppText>
              </View>
            </Pressable>
          );
        })}

        {onCreate ? (
          <Pressable
            onPress={onCreate}
            accessibilityRole="button"
            accessibilityLabel={t('transaction.new_wallet')}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: 'transparent',
                borderColor: theme.colors.borderStrong,
                borderStyle: 'dashed',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Icon name="add" size={14} color={theme.colors.primary} />
            <AppText variant="caption" weight="semibold" color={theme.colors.primary} style={{ marginLeft: 8 }}>
              {t('transaction.new_wallet')}
            </AppText>
          </Pressable>
        ) : null}
      </ScrollView>
      {error ? (
        <AppText variant="caption" tone="danger" style={{ marginTop: 6 }}>
          {error}
        </AppText>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    padding: 3,
  },
  lockedType: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  savingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 10,
  },
  amountBlock: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 0,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    flex: 1,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
    paddingVertical: 2,
  },
  amountMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    marginTop: 10,
  },
  sectionLabel: {
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default TransactionForm;
