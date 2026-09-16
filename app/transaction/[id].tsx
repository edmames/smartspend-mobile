/**
 * Transaction detail — full breakdown, edit (ledger-validated) and delete.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT, useLanguage } from '../../src/hooks/useTheme';
import { useTransactionStore } from '../../src/store/transactionStore';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useWallets } from '../../src/hooks/useWallets';
import { useSavings } from '../../src/hooks/useSavings';
import { AppText } from '../../src/components/ui/AppText';
import { Card, HeroCard, SectionHeader } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Button } from '../../src/components/ui/Button';
import { Icon, IconBadge } from '../../src/components/ui/Icon';
import { SavingsMark, WalletMark } from '../../src/components/ui/WalletMark';
import { StackHeader } from '../../src/components/ui/ScreenHeader';
import { AppModal } from '../../src/components/ui/Modal';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { TransactionForm } from '../../src/components/forms/TransactionForm';
import { useToast } from '../../src/components/ui/Toast';
import { CATEGORY_META, PAYMENT_METHOD_META, TRANSACTION_TYPE_META } from '../../src/utils/constants';
import { formatDateLong } from '../../src/utils/date';
import { directionOf, formatCurrency } from '../../src/utils/formatting';
import { useStackScreenBottomPadding } from '../../src/utils/layout';

export default function TransactionDetailScreen() {
  const theme = useTheme();
  const stackBottomPadding = useStackScreenBottomPadding();
  const t = useT();
  const language = useLanguage();
  const toast = useToast();
  const params = useLocalSearchParams<{ id: string }>();
  const transactionId = String(params.id ?? '');

  const transaction = useTransactionStore((state) =>
    state.transactions.find((item) => item.id === transactionId),
  );
  const { transactions, editTransaction, deleteTransaction } = useTransactions();
  const { wallets } = useWallets();
  const { targets } = useSavings();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const walletName = (id?: string) => wallets.find((wallet) => wallet.id === id)?.name ?? '—';
  const targetName = (id?: string) => targets.find((target) => target.id === id)?.name ?? '—';

  if (!transaction) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <StackHeader title={t('common.details')} />
        <EmptyState icon="receipt-outline" title={t('transaction.empty')} />
      </SafeAreaView>
    );
  }

  const direction = directionOf(transaction.type);
  const categoryMeta = CATEGORY_META[transaction.category] ?? CATEGORY_META.other;
  const typeKey = TRANSACTION_TYPE_META[transaction.type].key;
  const isSavingsMovement = transaction.type === 'savings_deposit' || transaction.type === 'savings_withdraw';
  const sourceWallet = wallets.find((wallet) => wallet.id === transaction.walletSourceId);
  const destinationWallet = wallets.find((wallet) => wallet.id === transaction.walletDestinationId);
  const walletRef =
    transaction.type === 'income' ? (destinationWallet ?? sourceWallet) : (sourceWallet ?? destinationWallet);

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteTransaction(transaction.id);
    setDeleting(false);
    setDeleteOpen(false);
    if (result.ok) {
      toast.success(t('common.delete'));
      router.back();
    } else {
      toast.error(result.error);
    }
  };

  const rows: { label: string; value: string; icon: string }[] = [
    { label: t('common.date'), value: formatDateLong(transaction.date, language), icon: 'calendar-outline' },
    {
      label: t('common.type'),
      value: t(typeKey as never),
      icon: TRANSACTION_TYPE_META[transaction.type].icon,
    },
    { label: t('common.category'), value: t(`category.${transaction.category}` as never), icon: categoryMeta.icon },
  ];

  // Wording follows the money, not the field name: income credits a wallet.
  if (transaction.type === 'transfer') {
    rows.push({ label: t('transaction.wallet_from_short'), value: walletName(transaction.walletSourceId), icon: 'wallet-outline' });
    rows.push({
      label: t('transaction.wallet_to_short'),
      value: walletName(transaction.walletDestinationId),
      icon: 'wallet-outline',
    });
  } else if (transaction.type === 'savings_deposit') {
    rows.push({ label: t('transaction.wallet_from_short'), value: walletName(transaction.walletSourceId), icon: 'wallet-outline' });
    rows.push({
      label: t('transaction.savings_target'),
      value: targetName(transaction.savingsTargetId),
      icon: 'flag-outline',
    });
  } else if (transaction.type === 'savings_withdraw') {
    rows.push({
      label: t('transaction.savings_target'),
      value: targetName(transaction.savingsTargetId),
      icon: 'flag-outline',
    });
    rows.push({ label: t('transaction.wallet_to_short'), value: walletName(transaction.walletSourceId), icon: 'wallet-outline' });
  } else if (transaction.type === 'income') {
    rows.push({ label: t('transaction.wallet_to'), value: walletName(transaction.walletSourceId), icon: 'wallet-outline' });
  } else {
    rows.push({ label: t('transaction.wallet_from'), value: walletName(transaction.walletSourceId), icon: 'wallet-outline' });
  }

  if (transaction.paymentMethod) {
    rows.push({
      label: t('transaction.payment_method'),
      value: t(PAYMENT_METHOD_META[transaction.paymentMethod].key as never),
      icon: PAYMENT_METHOD_META[transaction.paymentMethod].icon,
    });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: stackBottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        <StackHeader title={t('common.details')} subtitle={t(typeKey as never)} fallbackRoute="/(tabs)/transactions" />

        {/* Neutral navy panel: the amount sign carries the direction, so the
            surface does not need to shout in green/red. */}
        <HeroCard>
          <View style={styles.heroTop}>
            {isSavingsMovement ? (
              <SavingsMark size={42} />
            ) : walletRef ? (
              <WalletMark type={walletRef.type} brand={walletRef.brand} size={42} />
            ) : (
              <IconBadge
                name={categoryMeta.icon as never}
                color="#ffffff"
                background="rgba(255,255,255,0.18)"
                containerSize={42}
                size={20}
              />
            )}
            <AppText variant="small" tone="onPrimary" style={{ opacity: 0.9, marginLeft: 10, flex: 1 }} numberOfLines={1}>
              {t(typeKey as never)}
            </AppText>
          </View>

          <AppText variant="hero" color={theme.colors.onPrimary} style={{ marginTop: theme.spacing.md }} numberOfLines={1} adjustsFontSizeToFit>
            {`${direction === 'in' ? '+ ' : direction === 'out' ? '− ' : ''}${formatCurrency(transaction.amount)}`}
          </AppText>

          <AppText variant="small" tone="onPrimary" style={{ opacity: 0.9, marginTop: 4 }} numberOfLines={2}>
            {transaction.description.trim() ? transaction.description : t(`category.${transaction.category}` as never)}
          </AppText>
        </HeroCard>

        <SectionHeader title={t('common.details')} style={{ marginTop: theme.spacing.xl }} />
        <Card>
          {rows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.detailRow,
                {
                  paddingVertical: theme.spacing.md,
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: theme.colors.border,
                },
              ]}
            >
              <Icon name={row.icon as never} size={16} color={theme.colors.textMuted} />
              <AppText variant="small" tone="muted" style={{ marginLeft: 10, flex: 1 }}>
                {row.label}
              </AppText>
              <AppText variant="small" weight="medium" numberOfLines={1} style={{ maxWidth: '55%' }}>
                {row.value}
              </AppText>
            </View>
          ))}
        </Card>

        <Card variant="outlined" style={{ marginTop: theme.spacing.lg }}>
          <AppText variant="caption" tone="muted">
            {`ID: ${transaction.id}`}
          </AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {`${t('wallet.created_at')}: ${formatDateLong(transaction.createdAt.slice(0, 10), language)}`}
          </AppText>
          <View style={[styles.noteRow, { marginTop: theme.spacing.sm }]}>
            <Icon name="shield-checkmark-outline" size={14} color={theme.colors.success} />
            <AppText variant="caption" tone="muted" style={{ marginLeft: 6, flex: 1 }}>
              {t('transaction.delete_confirm_body')}
            </AppText>
          </View>
        </Card>

        <View style={[styles.actions, { marginTop: theme.spacing.xl }]}>
          <Button label={t('common.edit')} variant="secondary" icon="create-outline" onPress={() => setEditOpen(true)} style={{ flex: 1 }} />
          <View style={{ width: theme.spacing.md }} />
          <Button label={t('common.delete')} variant="danger" icon="trash-outline" onPress={() => setDeleteOpen(true)} style={{ flex: 1 }} />
        </View>
      </ScrollView>

      <AppModal
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('transaction.edit')}
        subtitle={formatCurrency(transaction.amount)}
      >
        <TransactionForm
          initial={transaction}
          wallets={wallets}
          targets={targets}
          transactions={transactions}
          onSubmit={async (input) => {
            const result = await editTransaction(transaction.id, input);
            if (result.ok) {
              toast.success(t('common.save_changes'));
              setEditOpen(false);
            }
            return result;
          }}
          onCancel={() => setEditOpen(false)}
        />
      </AppModal>

      <ConfirmDialog
        visible={deleteOpen}
        title={t('transaction.delete_confirm')}
        message={t('transaction.delete_confirm_body')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  actions: {
    flexDirection: 'row',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
