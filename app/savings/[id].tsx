/**
 * Savings target detail — progress, deposit / withdraw (both go through the
 * ledger) and the full movement history.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT, useLanguage } from '../../src/hooks/useTheme';
import { useSavingsTarget, useSavings } from '../../src/hooks/useSavings';
import { useWallets } from '../../src/hooks/useWallets';
import { useTransactionStore } from '../../src/store/transactionStore';
import { AppText } from '../../src/components/ui/AppText';
import { Card, HeroCard, SectionHeader } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Button } from '../../src/components/ui/Button';
import { Money } from '../../src/components/ui/Money';
import { Icon } from '../../src/components/ui/Icon';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { StackHeader } from '../../src/components/ui/ScreenHeader';
import { AppModal } from '../../src/components/ui/Modal';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { SavingsForm } from '../../src/components/forms/SavingsForm';
import { SavingsMovementForm } from '../../src/components/forms/SavingsMovementForm';
import { TransactionRow } from '../../src/components/TransactionRow';
import { useToast } from '../../src/components/ui/Toast';
import { formatCurrency, formatPercentage } from '../../src/utils/formatting';
import { formatDateLong } from '../../src/utils/date';
import { useStackScreenBottomPadding } from '../../src/utils/layout';
import { budgetStatusColor } from '../../src/components/BudgetCard';

export default function SavingsTargetDetailScreen() {
  const theme = useTheme();
  const stackBottomPadding = useStackScreenBottomPadding();
  const t = useT();
  const language = useLanguage();
  const toast = useToast();
  const params = useLocalSearchParams<{ id: string }>();
  const targetId = String(params.id ?? '');

  const { target, progress, movements } = useSavingsTarget(targetId);
  const {
    targets,
    deposit,
    withdraw,
    editTarget,
    deleteTarget: deleteTargetAction,
  } = useSavings();
  const { wallets } = useWallets();
  const transactions = useTransactionStore((state) => state.transactions);

  const [editOpen, setEditOpen] = useState(false);
  const [movement, setMovement] = useState<'deposit' | 'withdraw' | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const walletName = (id?: string) => wallets.find((wallet) => wallet.id === id)?.name;

  if (!target || !progress) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <StackHeader title={t('savings.detail')} fallbackRoute="/(tabs)/savings" />
        <EmptyState icon="flag-outline" title={t('error.target_not_found')} />
      </SafeAreaView>
    );
  }

  const deposited = movements
    .filter((row) => row.type === 'savings_deposit')
    .reduce((sum, row) => sum + row.amount, 0);
  const withdrawn = movements
    .filter((row) => row.type === 'savings_withdraw')
    .reduce((sum, row) => sum + row.amount, 0);

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteTargetAction(target.id);
    setDeleting(false);
    setDeleteOpen(false);
    if (result.ok) {
      toast.success(t('common.delete'));
      router.replace('/(tabs)/savings');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: stackBottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        <StackHeader title={t('savings.detail')} subtitle={target.name} fallbackRoute="/(tabs)/savings" />

        <HeroCard>
          <AppText variant="small" weight="medium" tone="onHeroMuted" numberOfLines={1}>
            {target.name}
          </AppText>
          <View style={{ marginTop: theme.spacing.sm }}>
            <Money value={progress.saved} size="hero" color={theme.colors.onHero} />
          </View>
          <AppText variant="caption" tone="onHeroFaint" style={{ marginTop: 2 }}>
            {`${t('common.of')} ${formatCurrency(target.goalAmount)}`}
          </AppText>

          <ProgressBar
            ratio={progress.ratio}
            color={theme.colors.primaryBright}
            trackColor={theme.colors.onHeroDivider}
            height={9}
            style={{ marginTop: theme.spacing.lg }}
          />

          <View style={[styles.heroFooter, { marginTop: theme.spacing.sm }]}>
            <AppText variant="caption" tone="onHeroMuted">
              {`${formatPercentage(progress.percentage, 0)} ${t('common.progress').toLowerCase()}`}
            </AppText>
            <AppText variant="caption" tone="onHeroMuted">
              {progress.isComplete
                ? t('savings.completed')
                : `${t('savings.remaining')} ${formatCurrency(progress.remaining)}`}
            </AppText>
          </View>
        </HeroCard>

        {/* Deposit / withdraw */}
        <View style={[styles.actions, { marginTop: theme.spacing.lg }]}>
          <Button
            label={t('savings.deposit')}
            variant="success"
            icon="arrow-down"
            onPress={() => setMovement('deposit')}
            style={{ flex: 1 }}
            disabled={wallets.length === 0}
          />
          <View style={{ width: theme.spacing.md }} />
          <Button
            label={t('savings.withdraw')}
            variant="secondary"
            icon="arrow-up"
            onPress={() => setMovement('withdraw')}
            style={{ flex: 1 }}
            disabled={wallets.length === 0 || progress.saved <= 0}
          />
        </View>

        {wallets.length === 0 ? (
          <AppText variant="caption" tone="warning" align="center" style={{ marginTop: theme.spacing.sm }}>
            {t('error.need_wallet_first')}
          </AppText>
        ) : null}

        {/* Stats */}
        <View style={[styles.statsRow, { marginTop: theme.spacing.lg }]}>
          <Card style={{ flex: 1 }}>
            <AppText variant="caption" tone="muted">
              {t('savings.deposited')}
            </AppText>
            <View style={{ marginTop: 2 }}>
              <Money value={deposited} size="subtitle" tone="success" />
            </View>
          </Card>
          <View style={{ width: theme.spacing.md }} />
          <Card style={{ flex: 1 }}>
            <AppText variant="caption" tone="muted">
              {t('savings.withdrawn')}
            </AppText>
            <View style={{ marginTop: 2 }}>
              <Money value={withdrawn} size="subtitle" tone="warning" />
            </View>
          </Card>
        </View>

        <Card style={{ marginTop: theme.spacing.md }}>
          <View style={styles.metaRow}>
            <Icon name="calendar-outline" size={15} color={theme.colors.textMuted} />
            <AppText variant="small" tone="muted" style={{ marginLeft: 8, flex: 1 }}>
              {t('savings.due_date')}
            </AppText>
            <AppText variant="small" weight="medium">
              {target.dueDate ? formatDateLong(target.dueDate, language) : t('savings.no_due_date')}
            </AppText>
          </View>
          {progress.daysLeft !== null ? (
            <View style={[styles.metaRow, { marginTop: theme.spacing.sm }]}>
              <Icon name="hourglass-outline" size={15} color={theme.colors.textMuted} />
              <AppText variant="small" tone="muted" style={{ marginLeft: 8, flex: 1 }}>
                {progress.isOverdue ? t('savings.overdue') : t('savings.days_left')}
              </AppText>
              <AppText
                variant="small"
                weight="medium"
                color={progress.isOverdue ? theme.colors.danger : theme.colors.text}
              >
                {`${Math.abs(progress.daysLeft)} ${t('savings.days_left')}`}
              </AppText>
            </View>
          ) : null}
          <View style={[styles.metaRow, { marginTop: theme.spacing.sm }]}>
            <Icon name="speedometer-outline" size={15} color={theme.colors.textMuted} />
            <AppText variant="small" tone="muted" style={{ marginLeft: 8, flex: 1 }}>
              {t('common.progress')}
            </AppText>
            <AppText
              variant="small"
              weight="medium"
              color={budgetStatusColor(progress.percentage >= 100 ? 'safe' : 'warning', theme.colors)}
            >
              {formatPercentage(progress.percentage, 0)}
            </AppText>
          </View>
        </Card>

        <View style={[styles.actions, { marginTop: theme.spacing.lg }]}>
          <Button
            label={t('common.edit')}
            variant="secondary"
            icon="create-outline"
            onPress={() => setEditOpen(true)}
            style={{ flex: 1 }}
          />
          <View style={{ width: theme.spacing.md }} />
          <Button
            label={t('common.delete')}
            variant="ghost"
            icon="trash-outline"
            onPress={() => {
              if (movements.length > 0) {
                toast.warning(t('savings.delete_blocked'));
                return;
              }
              setDeleteOpen(true);
            }}
            style={{ flex: 1 }}
          />
        </View>

        <SectionHeader title={t('savings.history')} style={{ marginTop: theme.spacing.xl }} />
        <Card padded={false} style={{ paddingHorizontal: theme.spacing.lg }}>
          {movements.length === 0 ? (
            <EmptyState compact icon="time-outline" title={t('savings.empty')} message={t('savings.empty_hint')} />
          ) : (
            movements.map((row, index) => (
              <TransactionRow
                key={row.id}
                transaction={row}
                sourceWalletName={walletName(row.walletSourceId)}
                savingsTargetName={target.name}
                sourceWallet={wallets.find((wallet) => wallet.id === row.walletSourceId)}
                destinationWallet={wallets.find((wallet) => wallet.id === row.walletDestinationId)}
                savingsMark
                divider={index > 0}
                onPress={() => router.push(`/transaction/${row.id}`)}
              />
            ))
          )}
        </Card>
      </ScrollView>

      {/* Deposit / withdrawal sheet */}
      <BottomSheet
        visible={movement !== null}
        onClose={() => setMovement(null)}
        title={movement === 'deposit' ? t('savings.deposit_title') : t('savings.withdraw_title')}
        subtitle={target.name}
      >
        {movement ? (
          <SavingsMovementForm
            mode={movement}
            target={target}
            wallets={wallets}
            transactions={transactions}
            onSubmit={async (input) => {
              const result = movement === 'deposit' ? await deposit(input) : await withdraw(input);
              if (result.ok) {
                toast.success(movement === 'deposit' ? t('savings.deposit') : t('savings.withdraw'));
                setMovement(null);
              }
              return result;
            }}
            onCancel={() => setMovement(null)}
          />
        ) : null}
      </BottomSheet>

      <AppModal visible={editOpen} onClose={() => setEditOpen(false)} title={t('savings.edit')} subtitle={target.name}>
        <SavingsForm
          initial={target}
          targets={targets}
          onSubmit={async (input) => {
            const result = await editTarget(target.id, input);
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
        title={t('savings.delete_confirm')}
        message={target.name}
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
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  actions: {
    flexDirection: 'row',
  },
  statsRow: {
    flexDirection: 'row',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
