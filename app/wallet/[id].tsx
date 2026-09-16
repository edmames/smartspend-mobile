/**
 * Wallet detail — balance, month in/out, ledger and guarded delete.
 */
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT, useLanguage } from '../../src/hooks/useTheme';
import { useWallets, type WalletWithBalance } from '../../src/hooks/useWallets';
import { useTransactions } from '../../src/hooks/useTransactions';
import { AppText } from '../../src/components/ui/AppText';
import { Card, Divider, HeroCard, SectionHeader } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Icon } from '../../src/components/ui/Icon';
import { WalletMark } from '../../src/components/ui/WalletMark';
import { AppModal } from '../../src/components/ui/Modal';
import { Money } from '../../src/components/ui/Money';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { StatTile } from '../../src/components/ui/StatTile';
import { TransactionRow } from '../../src/components/TransactionRow';
import { WalletForm } from '../../src/components/forms/WalletForm';
import { useToast } from '../../src/components/ui/Toast';
import { WALLET_BRAND_META, WALLET_TYPE_META } from '../../src/utils/constants';
import { formatCurrency } from '../../src/utils/formatting';
import { currentMonthYear, formatDateLong, formatMonthYear } from '../../src/utils/date';
import { startOfMonthISO } from '../../src/utils/date';
import { useStackScreenBottomPadding } from '../../src/utils/layout';
import type { Transaction } from '../../src/types';

export default function WalletDetailScreen() {
  const theme = useTheme();
  const stackBottomPadding = useStackScreenBottomPadding();
  const t = useT();
  const language = useLanguage();
  const toast = useToast();
  const params = useLocalSearchParams<{ id: string }>();
  const walletId = String(params.id ?? '');

  const { walletsWithBalance, editWallet, deleteWallet, wallets } = useWallets();
  const { transactions, refresh, refreshing } = useTransactions();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const wallet = walletsWithBalance.find((item) => item.id === walletId);
  const meta = wallet ? WALLET_TYPE_META[wallet.type] : null;

  const walletTransactions = useMemo(
    () => transactions.filter((tx) => tx.walletSourceId === walletId || tx.walletDestinationId === walletId),
    [transactions, walletId],
  );

  const monthStats = useMemo(() => {
    const monthYear = currentMonthYear();
    const since = startOfMonthISO(monthYear);
    let income = 0;
    let expense = 0;
    for (const tx of walletTransactions) {
      if (tx.date < since) continue;
      if (tx.type === 'income' && tx.walletDestinationId === walletId) income += tx.amount;
      else if (tx.type === 'expense' && tx.walletSourceId === walletId) expense += tx.amount;
      else if (tx.type === 'transfer') {
        if (tx.walletDestinationId === walletId) income += tx.amount;
        if (tx.walletSourceId === walletId) expense += tx.amount;
      } else if (tx.type === 'savings_deposit' && tx.walletSourceId === walletId) expense += tx.amount;
      else if (tx.type === 'savings_withdraw' && tx.walletDestinationId === walletId) income += tx.amount;
    }
    return { income, expense, net: income - expense };
  }, [walletId, walletTransactions]);

  const nameForWallet = (id?: string) => wallets.find((item) => item.id === id)?.name;

  const handleDelete = async () => {
    if (!wallet) return;
    setDeleting(true);
    const result = await deleteWallet(wallet.id);
    setDeleting(false);
    setDeleteOpen(false);
    if (result.ok) {
      toast.success(t('common.delete'));
      router.replace('/(tabs)/wallets');
    } else {
      toast.error(result.error);
    }
  };

  if (!wallet || !meta) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <ScreenHeader title={t('wallet.detail')} onBack={() => router.back()} />
        <EmptyState icon="alert-circle-outline" title={t('error.wallet_not_found')} />
      </SafeAreaView>
    );
  }

  // The opening-balance row ('initial') is bookkeeping, not user history.
  const historyCount = walletTransactions.filter((tx) => tx.type !== 'initial').length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScreenHeader
        title={wallet.name}
        subtitle={t(meta.key as never)}
        onBack={() => router.back()}
        right={
          <Button label={t('common.edit')} variant="ghost" size="sm" icon="create-outline" onPress={() => setFormOpen(true)} />
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: theme.spacing.screen, paddingBottom: stackBottomPadding }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.card}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <HeroCard>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <WalletMark type={wallet.type} brand={wallet.brand} size={34} variant="solid" />
            <AppText variant="micro" tone="onHeroFaint" style={{ marginLeft: 10 }}>
              {t('wallet.subtitle_total').toUpperCase()}
            </AppText>
          </View>

          <View style={{ marginTop: theme.spacing.md }}>
            <Money value={wallet.balance} size="hero" color={theme.colors.onHero} />
          </View>

          <Divider style={{ backgroundColor: theme.colors.onHeroDivider, marginVertical: theme.spacing.lg }} />

          <View style={styles.heroSplit}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="caption" tone="onHeroFaint">
                {`${t('dashboard.income')} · ${formatMonthYear(currentMonthYear(), language)}`}
              </AppText>
              <Money value={monthStats.income} size="subtitle" color={theme.colors.onHero} style={{ marginTop: 2 }} />
            </View>
            <View style={[styles.heroDivider, { backgroundColor: theme.colors.onHeroDivider }]} />
            <View style={{ flex: 1, minWidth: 0, paddingLeft: theme.spacing.lg }}>
              <AppText variant="caption" tone="onHeroFaint">
                {`${t('dashboard.expense')} · ${formatMonthYear(currentMonthYear(), language)}`}
              </AppText>
              <Money value={monthStats.expense} size="subtitle" color={theme.colors.onHero} style={{ marginTop: 2 }} />
            </View>
          </View>
        </HeroCard>

        <View style={[styles.statsRow, { marginTop: theme.spacing.md }]}>
          <StatTile
            label={t('wallet.transaction_count')}
            value={String(walletTransactions.length)}
            icon="receipt-outline"
          />
          <View style={{ width: theme.spacing.md }} />
          <StatTile
            label={t('dashboard.net')}
            value={formatCurrency(monthStats.net)}
            icon={monthStats.net >= 0 ? 'trending-up-outline' : 'trending-down-outline'}
            tone={monthStats.net >= 0 ? 'success' : 'danger'}
          />
        </View>

        <SectionHeader title={t('wallet.recent_transactions')} count={walletTransactions.length} />

        <Card padded={false} style={{ paddingHorizontal: theme.spacing.card, paddingVertical: 4 }}>
          {walletTransactions.length === 0 ? (
            <EmptyState compact icon="receipt-outline" title={t('transaction.empty')} />
          ) : (
            walletTransactions
              .slice(0, 40)
              .map((tx: Transaction, index: number) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  sourceWalletName={nameForWallet(tx.walletSourceId)}
                  destinationWalletName={nameForWallet(tx.walletDestinationId)}
                  sourceWallet={wallet}
                  destinationWallet={walletsWithBalance.find((item) => item.id === tx.walletDestinationId) ?? wallet}
                  savingsMark
                  divider={index > 0}
                  onPress={() => router.push(`/transaction/${tx.id}`)}
                />
              ))
          )}
        </Card>

        {walletTransactions.length > 40 ? (
          <Button
            label={t('common.see_all')}
            variant="ghost"
            size="sm"
            icon="arrow-forward-outline"
            onPress={() => router.push('/(tabs)/transactions')}
            style={{ marginTop: theme.spacing.sm }}
          />
        ) : null}

        <Card variant="inset" style={{ marginTop: theme.spacing.lg }}>
          <View style={styles.infoRow}>
            <Icon name="information-circle-outline" size={16} color={theme.colors.textFaint} />
            <AppText variant="caption" tone="muted" style={{ flex: 1, marginLeft: 8 }}>
              {`${t('wallet.type_hint')} · ${formatDateLong(wallet.createdAt.slice(0, 10), language)}`}
            </AppText>
          </View>
          {wallet.brand ? (
            <View style={[styles.infoRow, { marginTop: theme.spacing.sm }]}>
              <Icon name="business-outline" size={16} color={theme.colors.textFaint} />
              <AppText variant="caption" tone="muted" style={{ flex: 1, marginLeft: 8 }}>
                {`${t('wallet.provider')}: ${WALLET_BRAND_META[wallet.brand].label}`}
              </AppText>
            </View>
          ) : null}
        </Card>

        <Button
          label={t('common.delete')}
          variant="danger"
          icon="trash-outline"
          onPress={() => {
            if (historyCount > 0) {
              toast.warning(t('wallet.delete_blocked'));
              return;
            }
            setDeleteOpen(true);
          }}
          style={{ marginTop: theme.spacing.md }}
        />
      </ScrollView>

      <AppModal visible={formOpen} onClose={() => setFormOpen(false)} title={t('wallet.edit')} subtitle={wallet.name}>
        <WalletForm
          initial={wallet as WalletWithBalance}
          wallets={walletsWithBalance}
          onSubmit={async (input) => {
            const result = await editWallet(wallet.id, input);
            if (result.ok) {
              toast.success(t('common.save_changes'));
              setFormOpen(false);
            }
            return result;
          }}
          onCancel={() => setFormOpen(false)}
        />
      </AppModal>

      <ConfirmDialog
        visible={deleteOpen}
        title={t('wallet.delete_confirm')}
        message={`${wallet.name} · ${formatCurrency(wallet.balance)}`}
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
  heroSplit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
  },
  statsRow: {
    flexDirection: 'row',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
