/**
 * Dashboard (Beranda).
 *
 * Dense by design: a compact app bar, one hero figure, then three
 * information-dense bands (month strip → trend → wallets → ledger) with 8–12px
 * rhythm between them. Nothing is decorative; every row carries data.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT, useLanguage } from '../../src/hooks/useTheme';
import { useWallets } from '../../src/hooks/useWallets';
import { useSavings } from '../../src/hooks/useSavings';
import { useBudgetAlertCount } from '../../src/hooks/useBudgets';
import { useTransactionStore } from '../../src/store/transactionStore';
import { useWalletStore } from '../../src/store/walletStore';
import { useAuthStore } from '../../src/store/authStore';
import { useRefreshAll } from '../../src/hooks/useStorage';
import { AppText } from '../../src/components/ui/AppText';
import { Card, HeroCard, SectionHeader } from '../../src/components/ui/Card';
import { Icon } from '../../src/components/ui/Icon';
import { Money } from '../../src/components/ui/Money';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { FAB } from '../../src/components/ui/FAB';
import { DashboardSkeleton } from '../../src/components/ui/Skeleton';
import { TransactionRow } from '../../src/components/TransactionRow';
import { WalletCard } from '../../src/components/WalletCard';
import { PieChart } from '../../src/components/charts/PieChart';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { calculateCategoryBreakdown, calculateMonthlySummary, sortNewestFirst } from '../../src/utils/calculations';
import { currentMonthYear, formatMonthYear } from '../../src/utils/date';
import { formatCurrency } from '../../src/utils/formatting';
import { CATEGORY_META } from '../../src/utils/constants';
import { DASHBOARD_RECENT_TRANSACTIONS, DASHBOARD_TOP_WALLETS } from '../../src/utils/constants';
import { useCountUp } from '../../src/utils/motion';

/** Unequal but still valid flex ratios (a zero share must not collapse). */
const ratio = (value: number) => (value > 0 ? value : 0.0001);

export default function DashboardScreen() {
  const theme = useTheme();
  const t = useT();
  const language = useLanguage();
  const refreshAll = useRefreshAll();

  const user = useAuthStore((state) => state.user);
  const transactions = useTransactionStore((state) => state.transactions);
  const { totalMoney, topWallets, wallets } = useWallets();
  const { totals: savingsTotals, targets } = useSavings();
  const exceededBudgets = useBudgetAlertCount();
  const [refreshing, setRefreshing] = useState(false);
  const [mix, setMix] = useState<'expense' | 'income'>('expense');
  // Placeholders only during the very first hydration; a brand-new account must
  // land on real empty states instead of a permanent skeleton.
  const walletsHydrated = useWalletStore((state) => state.hydrated);
  const ledgerHydrated = useTransactionStore((state) => state.hydrated);
  const firstLoad = !walletsHydrated || !ledgerHydrated;

  const monthYear = currentMonthYear();
  const summary = useMemo(() => calculateMonthlySummary(transactions, monthYear), [monthYear, transactions]);
  /** Current month only: the donut answers "where did it go?", not "how has it moved?". */
  const breakdown = useMemo(
    () => calculateCategoryBreakdown(transactions, monthYear, mix),
    [mix, monthYear, transactions],
  );
  const mixTotal = useMemo(() => breakdown.reduce((sum, item) => sum + item.amount, 0), [breakdown]);
  const recentTransactions = useMemo(
    () => sortNewestFirst(transactions).slice(0, DASHBOARD_RECENT_TRANSACTIONS),
    [transactions],
  );

  const heroValue = useCountUp(totalMoney);

  const walletById = useCallback((id?: string) => wallets.find((wallet) => wallet.id === id), [wallets]);
  const walletName = useCallback((id?: string) => walletById(id)?.name, [walletById]);
  const targetName = useCallback((id?: string) => targets.find((target) => target.id === id)?.name, [targets]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  const walletsTotal = totalMoney - savingsTotals.saved;
  const initial = (user?.name ?? '?').trim().charAt(0).toUpperCase() || '?';
  const dense = { marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {firstLoad ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
        >
          <DashboardSkeleton />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
              progressBackgroundColor={theme.colors.card}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ---------------------------------------------------------------- */}
          {/* App bar — identity on the left, one glanceable line of context.  */}
          {/* ---------------------------------------------------------------- */}
          <View style={styles.appBar}>
            <View style={[styles.avatar, { backgroundColor: `${theme.colors.primary}1f` }]}>
              <AppText variant="caption" weight="bold" color={theme.colors.primary}>
                {initial}
              </AppText>
            </View>

            <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
              <AppText variant="body" weight="semibold" numberOfLines={1}>
                {`${t('dashboard.greeting')}, ${user?.name ?? '—'}`}
              </AppText>
              <AppText variant="caption" tone="faint" numberOfLines={1} style={{ marginTop: 1 }}>
                {`${wallets.length} ${t('wallet.title').toLowerCase()} · ${targets.length} ${t('savings.title').toLowerCase()} · ${formatMonthYear(monthYear, language)}`}
              </AppText>
            </View>

            <Pressable
              onPress={() => router.push('/(tabs)/settings')}
              accessibilityLabel={t('settings.account')}
              style={[styles.iconButton, { backgroundColor: theme.colors.chipTint }]}
            >
              <Icon name="settings-outline" size={16} color={theme.colors.textMedium} />
            </Pressable>
          </View>

          {/* ---------------------------------------------------------------- */}
          {/* Hero — the one number that matters, plus its composition.        */}
          {/* ---------------------------------------------------------------- */}
          <HeroCard style={{ marginTop: theme.spacing.md }}>
            <AppText variant="micro" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {t('dashboard.total_money').toUpperCase()}
            </AppText>

            <View style={{ marginTop: 6 }}>
              <Money value={totalMoney} animatedValue={heroValue} size="hero" color="#ffffff" />
            </View>

            <View style={[styles.heroSplit, { marginTop: theme.spacing.md }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.58)' }}>
                  {t('dashboard.wallets_total')}
                </AppText>
                <Money value={walletsTotal} size="subtitle" color="#ffffff" style={{ marginTop: 1 }} />
              </View>

              <View style={[styles.heroDivider, { backgroundColor: 'rgba(255,255,255,0.16)' }]} />

              <View style={{ flex: 1, minWidth: 0, paddingLeft: theme.spacing.lg }}>
                <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.58)' }}>
                  {t('dashboard.savings_total')}
                </AppText>
                <Money value={savingsTotals.saved} size="subtitle" color="#ffffff" style={{ marginTop: 1 }} />
              </View>
            </View>

            {/* Composition: wallets vs savings, in one hairline bar. */}
            <View style={[styles.composition, { marginTop: theme.spacing.md }]}>
              <View style={{ flex: ratio(walletsTotal), backgroundColor: '#ffffff', opacity: 0.94 }} />
              <View style={{ flex: ratio(savingsTotals.saved), backgroundColor: '#ffffff', opacity: 0.34 }} />
            </View>
          </HeroCard>

          {/* ---------------------------------------------------------------- */}
          {/* This month — three columns, hairline separated, no wasted space. */}
          {/* ---------------------------------------------------------------- */}
          <Card padded={false} style={{ marginTop: theme.spacing.sm, paddingVertical: theme.spacing.md }}>
            <View style={styles.stripHeader}>
              <AppText variant="micro" tone="faint">
                {t('dashboard.this_month').toUpperCase()}
              </AppText>
              <AppText variant="caption" tone="faint">
                {formatMonthYear(monthYear, language)}
              </AppText>
            </View>

            <View style={[styles.stripRow, { marginTop: theme.spacing.sm }]}>
              {/* No coloured markers here — direction is carried by the sign,
                  so the strip stays as quiet as the rest of the surface. */}
              <View style={styles.statCell}>
                <AppText variant="caption" tone="faint" numberOfLines={1}>
                  {t('dashboard.income')}
                </AppText>
                <Money value={summary.income} size="body" signed numberOfLines={1} />
              </View>

              <View style={[styles.vDivider, { backgroundColor: theme.colors.border }]} />

              <View style={styles.statCell}>
                <AppText variant="caption" tone="faint" numberOfLines={1}>
                  {t('dashboard.expense')}
                </AppText>
                {/* Negated so the sign reads "−", not "+" — expense is an outflow. */}
                <Money value={-summary.expense} size="body" signed numberOfLines={1} />
              </View>

              <View style={[styles.vDivider, { backgroundColor: theme.colors.border }]} />

              <View style={[styles.statCell, { alignItems: 'flex-end' }]}>
                <AppText variant="caption" tone="faint" numberOfLines={1}>
                  {t('dashboard.net')}
                </AppText>
                <Money value={summary.net} size="body" signed numberOfLines={1} />
              </View>
            </View>
          </Card>

          {/* Budget alert — only when something is actually over budget. */}
          {exceededBudgets > 0 ? (
            <Pressable
              onPress={() => router.push('/budget')}
              style={[
                styles.alert,
                {
                  marginTop: theme.spacing.sm,
                  backgroundColor: `${theme.colors.danger}14`,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <Icon name="alert-circle" size={15} color={theme.colors.danger} />
              <AppText variant="small" tone="danger" style={{ flex: 1, marginLeft: 8 }} numberOfLines={1}>
                {`${exceededBudgets} ${t('budget.exceeded_warning').toLowerCase()}`}
              </AppText>
              <Icon name="chevron-forward" size={14} color={theme.colors.danger} />
            </Pressable>
          ) : null}

          {/* ---------------------------------------------------------------- */}
          {/* This month's mix — a donut, because a single month is a          */}
          {/* composition, not a trend line.                                   */}
          {/* ---------------------------------------------------------------- */}
          <SectionHeader
            title={t('dashboard.trend')}
            actionLabel={t('common.see_all')}
            onAction={() => router.push('/(tabs)/reports')}
            style={dense}
          />
          <Card padded={false} style={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.md }}>
            <View style={styles.mixToggle}>
              <SegmentedControl
                options={[
                  { value: 'expense' as const, label: t('dashboard.expense') },
                  { value: 'income' as const, label: t('dashboard.income') },
                ]}
                value={mix}
                onChange={setMix}
                size="sm"
              />
            </View>

            {breakdown.length === 0 ? (
              <EmptyState compact icon="pie-chart-outline" title={t('dashboard.no_month_data')} />
            ) : (
              <>
                <PieChart
                  size={148}
                  thickness={15}
                  maxLegendItems={4}
                  centerValue={formatCurrency(mixTotal, { withSymbol: false })}
                  centerLabel={t(mix === 'expense' ? 'dashboard.expense' : 'dashboard.income')}
                  data={breakdown.slice(0, 4).map((item) => ({
                    label: t(`category.${item.category}` as never),
                    value: item.amount,
                    color: CATEGORY_META[item.category]?.color ?? theme.colors.primary,
                  }))}
                />

                {breakdown.length > 4 ? (
                  <View style={[styles.mixFooter, { borderTopColor: theme.colors.border, marginTop: theme.spacing.sm }]}>
                    <AppText variant="caption" tone="faint" numberOfLines={1} style={{ flex: 1 }}>
                      {`+${breakdown.length - 4} ${t('dashboard.other_categories')}`}
                    </AppText>
                    <AppText variant="caption" tone="muted" tabular numberOfLines={1}>
                      {formatCurrency(
                        breakdown.slice(4).reduce((sum, item) => sum + item.amount, 0),
                        { withSymbol: false },
                      )}
                    </AppText>
                  </View>
                ) : null}
              </>
            )}
          </Card>

          {/* ---------------------------------------------------------------- */}
          {/* Wallets                                                          */}
          {/* ---------------------------------------------------------------- */}
          {topWallets.length === 0 ? (
            <>
              <SectionHeader title={t('dashboard.top_wallets')} style={dense} />
              <Card>
                <EmptyState
                  compact
                  icon="wallet-outline"
                  title={t('dashboard.no_wallets')}
                  actionLabel={t('dashboard.add_first_wallet')}
                  onAction={() => router.push('/(tabs)/wallets')}
                />
              </Card>
            </>
          ) : (
            <>
              <SectionHeader
                title={t('dashboard.top_wallets')}
                count={wallets.length}
                actionLabel={t('common.see_all')}
                onAction={() => router.push('/(tabs)/wallets')}
                style={dense}
              />
              {topWallets.slice(0, DASHBOARD_TOP_WALLETS).map((wallet) => (
                <WalletCard
                  key={wallet.id}
                  wallet={wallet}
                  balance={wallet.balance}
                  share={walletsTotal > 0 ? Math.max(0, wallet.balance) / walletsTotal : 0}
                  onPress={() => router.push(`/wallet/${wallet.id}`)}
                  compact
                />
              ))}
            </>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Recent ledger                                                    */}
          {/* ---------------------------------------------------------------- */}
          <SectionHeader
            title={t('dashboard.recent')}
            count={recentTransactions.length}
            actionLabel={t('common.see_all')}
            onAction={() => router.push('/(tabs)/transactions')}
            style={dense}
          />
          <Card padded={false} style={{ paddingHorizontal: theme.spacing.md }}>
            {recentTransactions.length === 0 ? (
              <EmptyState compact icon="receipt-outline" title={t('dashboard.no_transactions')} />
            ) : (
              recentTransactions.map((transaction, index) => (
                <TransactionRow
                  key={transaction.id}
                  compact
                  transaction={transaction}
                  sourceWalletName={walletName(transaction.walletSourceId)}
                  destinationWalletName={walletName(transaction.walletDestinationId)}
                  savingsTargetName={targetName(transaction.savingsTargetId)}
                  sourceWallet={walletById(transaction.walletSourceId)}
                  destinationWallet={walletById(transaction.walletDestinationId)}
                  savingsMark
                  divider={index > 0}
                  onPress={() => router.push(`/transaction/${transaction.id}`)}
                />
              ))
            )}
          </Card>
        </ScrollView>
      )}

      <FAB onPress={() => router.push('/transaction/new')} accessibilityLabel={t('transaction.add')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSplit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
  },
  composition: {
    height: 4,
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
  },
  mixToggle: {
    marginBottom: 10,
  },
  mixFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  stripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  stripRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  statCell: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 14,
  },
  vDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
});
