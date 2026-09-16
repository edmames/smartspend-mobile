/**
 * Dashboard (Beranda).
 *
 * The dashboard is intentionally one vertical, scrollable surface. The tab bar
 * is fixed by the navigator and the final padding is calculated centrally so
 * the last card can always be brought above it. There is no floating action
 * button on this overview screen; create actions live on the screens that own
 * the corresponding data.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
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
import { Stagger } from '../../src/components/ui/Stagger';
import { DashboardSkeleton } from '../../src/components/ui/Skeleton';
import { TransactionRow } from '../../src/components/TransactionRow';
import { WalletCard } from '../../src/components/WalletCard';
import { PieChart } from '../../src/components/charts/PieChart';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import {
  calculateCategoryBreakdown,
  calculateMonthlySummary,
  progressFraction,
  sortNewestFirst,
} from '../../src/utils/calculations';
import { currentMonthYear, formatMonthYear } from '../../src/utils/date';
import { formatCurrency } from '../../src/utils/formatting';
import { CATEGORY_META, DASHBOARD_RECENT_TRANSACTIONS, DASHBOARD_TOP_WALLETS } from '../../src/utils/constants';
import { useCountUp } from '../../src/utils/motion';
import { useListBottomPadding } from '../../src/utils/layout';

/** Unequal but still valid flex ratios (a zero share must not collapse). */
const ratio = (value: number) => (value > 0 ? value : 0.0001);

export default function DashboardScreen() {
  const theme = useTheme();
  const t = useT();
  const language = useLanguage();
  const refreshAll = useRefreshAll();
  const { width } = useWindowDimensions();
  const listBottomPadding = useListBottomPadding({ hasFab: false });

  const user = useAuthStore((state) => state.user);
  const transactions = useTransactionStore((state) => state.transactions);
  const { totalMoney, topWallets, wallets } = useWallets();
  const { totals: savingsTotals, targets } = useSavings();
  const exceededBudgets = useBudgetAlertCount();
  const [refreshing, setRefreshing] = useState(false);
  const [mix, setMix] = useState<'expense' | 'income'>('expense');

  // Only show the skeleton during the first hydration. Empty accounts should
  // immediately see their real empty states instead of an endless placeholder.
  const walletsHydrated = useWalletStore((state) => state.hydrated);
  const ledgerHydrated = useTransactionStore((state) => state.hydrated);
  const firstLoad = !walletsHydrated || !ledgerHydrated;

  const monthYear = currentMonthYear();
  const summary = useMemo(
    () => calculateMonthlySummary(transactions, monthYear),
    [monthYear, transactions],
  );
  const breakdown = useMemo(
    () => calculateCategoryBreakdown(transactions, monthYear, mix),
    [mix, monthYear, transactions],
  );
  const mixTotal = useMemo(
    () => breakdown.reduce((sum, item) => sum + item.amount, 0),
    [breakdown],
  );
  const recentTransactions = useMemo(
    () => sortNewestFirst(transactions).slice(0, DASHBOARD_RECENT_TRANSACTIONS),
    [transactions],
  );

  const heroValue = useCountUp(totalMoney);
  const walletsTotal = totalMoney - savingsTotals.saved;
  const initial = (user?.name ?? '?').trim().charAt(0).toUpperCase() || '?';

  const walletById = useCallback(
    (id?: string) => wallets.find((wallet) => wallet.id === id),
    [wallets],
  );
  const walletName = useCallback((id?: string) => walletById(id)?.name, [walletById]);
  const targetName = useCallback(
    (id?: string) => targets.find((target) => target.id === id)?.name,
    [targets],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  // At phone widths a side-by-side donut and legend makes the numeric column
  // too narrow. Stacking the legend keeps every amount readable and removes
  // the temptation to overlay a floating button on the chart.
  const chartLayout = width < 520 ? 'stacked' : 'row';
  const horizontalPadding = width >= 768 ? 32 : theme.spacing.screen;
  const sectionSpacing = { marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {firstLoad ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: listBottomPadding }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
              progressBackgroundColor={theme.colors.card}
            />
          }
        >
          <View style={[styles.content, { paddingHorizontal: horizontalPadding }]}>
            <DashboardSkeleton />
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: listBottomPadding + theme.spacing.lg }}
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
          scrollIndicatorInsets={{ bottom: listBottomPadding }}
          contentInsetAdjustmentBehavior="automatic"
        >
          <View style={[styles.content, { paddingHorizontal: horizontalPadding }]}>
            {/* Header: identity and one settings action only. */}
            <View style={styles.appBar}>
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: theme.colors.accentSoft,
                    borderRadius: theme.radius.pill,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <AppText variant="caption" weight="bold" color={theme.colors.primary}>
                  {initial}
                </AppText>
              </View>

              <View style={styles.headerCopy}>
                <AppText variant="body" weight="semibold" numberOfLines={1}>
                  {`${t('dashboard.greeting')}, ${user?.name ?? '—'}`}
                </AppText>
                <AppText variant="caption" tone="faint" numberOfLines={1} style={{ marginTop: 1 }}>
                  {`${wallets.length} ${t('wallet.title').toLowerCase()} · ${targets.length} ${t('savings.title').toLowerCase()} · ${formatMonthYear(monthYear, language)}`}
                </AppText>
              </View>

              <Pressable
                onPress={() => router.push('/(tabs)/settings')}
                accessibilityRole="button"
                accessibilityLabel={t('settings.account')}
                style={[styles.iconButton, { backgroundColor: theme.colors.chipTint }]}
              >
                <Icon name="settings-outline" size={18} color={theme.colors.textMedium} />
              </Pressable>
            </View>

            {/* Balance: one primary figure and two clearly separated sources. */}
            <HeroCard style={{ marginTop: theme.spacing.md }}>
              <AppText variant="micro" tone="onHeroFaint">
                {t('dashboard.total_money').toUpperCase()}
              </AppText>

              <Money
                value={totalMoney}
                animatedValue={heroValue}
                size="hero"
                color={theme.colors.onHero}
                style={{ marginTop: 6 }}
              />

              <View style={[styles.heroSplit, { marginTop: theme.spacing.md }]}>
                <View style={styles.heroColumn}>
                  <AppText variant="caption" tone="onHeroFaint">
                    {t('dashboard.wallets_total')}
                  </AppText>
                  <Money value={walletsTotal} size="subtitle" color={theme.colors.onHero} style={{ marginTop: 1 }} />
                </View>

                <View style={[styles.heroDivider, { backgroundColor: theme.colors.onHeroDivider }]} />

                <View style={[styles.heroColumn, { paddingLeft: theme.spacing.lg }]}>
                  <AppText variant="caption" tone="onHeroFaint">
                    {t('dashboard.savings_total')}
                  </AppText>
                  <Money value={savingsTotals.saved} size="subtitle" color={theme.colors.onHero} style={{ marginTop: 1 }} />
                </View>
              </View>

              <View style={[styles.composition, { marginTop: theme.spacing.md }]}>
                <View style={{ flex: ratio(walletsTotal), backgroundColor: theme.colors.primaryBright, opacity: 0.95 }} />
                <View style={{ flex: ratio(savingsTotals.saved), backgroundColor: theme.colors.primaryBright, opacity: 0.35 }} />
              </View>
            </HeroCard>

            {/* Month summary: fixed three-column rhythm, no absolute elements. */}
            <Card padded={false} style={styles.monthCard}>
              <View style={styles.stripHeader}>
                <AppText variant="micro" tone="faint">
                  {t('dashboard.this_month').toUpperCase()}
                </AppText>
                <AppText variant="caption" tone="faint">
                  {formatMonthYear(monthYear, language)}
                </AppText>
              </View>

              <View style={[styles.stripRow, { marginTop: theme.spacing.sm }]}>
                <View style={styles.statCell}>
                  <AppText variant="caption" tone="faint" numberOfLines={2} style={styles.statLabel}>
                    {t('dashboard.income')}
                  </AppText>
                  <Money value={summary.income} size="body" signed numberOfLines={1} />
                </View>

                <View style={[styles.vDivider, { backgroundColor: theme.colors.border }]} />

                <View style={styles.statCell}>
                  <AppText variant="caption" tone="faint" numberOfLines={2} style={styles.statLabel}>
                    {t('dashboard.expense')}
                  </AppText>
                  <Money value={-summary.expense} size="body" signed numberOfLines={1} />
                </View>

                <View style={[styles.vDivider, { backgroundColor: theme.colors.border }]} />

                <View style={[styles.statCell, { alignItems: 'flex-end' }]}>
                  <AppText variant="caption" tone="faint" numberOfLines={2} style={styles.statLabel}>
                    {t('dashboard.net')}
                  </AppText>
                  <Money value={summary.net} size="body" signed tone="auto" numberOfLines={1} />
                </View>
              </View>
            </Card>

            {/* Show the alert only when it communicates an actionable problem. */}
            {exceededBudgets > 0 ? (
              <Pressable
                onPress={() => router.push('/budget')}
                accessibilityRole="button"
                accessibilityLabel={`${exceededBudgets} ${t('budget.exceeded_warning')}`}
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

            {/* Monthly mix: responsive chart, never covered by an overlay. */}
            <SectionHeader
              title={t('dashboard.trend')}
              actionLabel={t('common.see_all')}
              onAction={() => router.push('/(tabs)/reports')}
              style={sectionSpacing}
            />
            <Card padded={false} style={styles.chartCard}>
              <View style={styles.chartToggle}>
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
                <PieChart
                  layout={chartLayout}
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
              )}
            </Card>

            {/* Wallets: the first thing below the chart, then the ledger. */}
            {topWallets.length === 0 ? (
              <>
                <SectionHeader title={t('dashboard.top_wallets')} style={sectionSpacing} />
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
                  style={sectionSpacing}
                />
                {topWallets.slice(0, DASHBOARD_TOP_WALLETS).map((wallet, index) => (
                  <Stagger key={wallet.id} index={index}>
                    <WalletCard
                      wallet={wallet}
                      balance={wallet.balance}
                      share={progressFraction(wallet.balance, walletsTotal)}
                      onPress={() => router.push(`/wallet/${wallet.id}`)}
                      compact
                    />
                  </Stagger>
                ))}
              </>
            )}

            {/* Recent ledger: the final section has generous bottom clearance. */}
            <SectionHeader
              title={t('dashboard.recent')}
              count={recentTransactions.length}
              actionLabel={t('common.see_all')}
              onAction={() => router.push('/(tabs)/transactions')}
              style={sectionSpacing}
            />
            <Card padded={false} style={styles.transactionCard}>
              {recentTransactions.length === 0 ? (
                <EmptyState compact icon="receipt-outline" title={t('dashboard.no_transactions')} />
              ) : (
                recentTransactions.map((transaction, index) => (
                  <Stagger key={transaction.id} index={index}>
                    <TransactionRow
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
                  </Stagger>
                ))
              )}
            </Card>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingTop: 4,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
  },
  avatar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  heroSplit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroColumn: {
    flex: 1,
    minWidth: 0,
  },
  heroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
  },
  composition: {
    height: 5,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
  },
  monthCard: {
    marginTop: 12,
    paddingVertical: 14,
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
    paddingHorizontal: 10,
  },
  statLabel: {
    minHeight: 32,
  },
  vDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
  },
  chartCard: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  chartToggle: {
    marginBottom: 10,
  },
  transactionCard: {
    paddingHorizontal: 16,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
});
