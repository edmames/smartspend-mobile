/**
 * Transactions — search, filters, day-grouped ledger with infinite scroll.
 *
 * Layout decisions that make a long ledger readable:
 *  - rows are grouped by day with a header carrying the day's net movement,
 *  - a sticky summary shows the filtered in/out/net totals,
 *  - the filter sheet is a single panel (period · type · wallet · category)
 *    instead of scattered controls, and active filters are summarised as chips.
 */
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT, useLanguage } from '../../src/hooks/useTheme';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useWallets } from '../../src/hooks/useWallets';
import { useSavings } from '../../src/hooks/useSavings';
import { AppText } from '../../src/components/ui/AppText';
import { Card } from '../../src/components/ui/Card';
import { Chip } from '../../src/components/ui/Chip';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { FAB } from '../../src/components/ui/FAB';
import { Icon } from '../../src/components/ui/Icon';
import { Input } from '../../src/components/ui/Input';
import { Money } from '../../src/components/ui/Money';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { Button } from '../../src/components/ui/Button';
import { Select } from '../../src/components/ui/Select';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { DayGroupHeader, TransactionRow } from '../../src/components/TransactionRow';
import { useToast } from '../../src/components/ui/Toast';
import {
  CATEGORY_META,
  EXPENSE_CATEGORY_KEYS,
  INCOME_CATEGORY_KEYS,
  TRANSACTION_TYPE_META,
} from '../../src/utils/constants';
import { formatDateLong, formatWeekdayShort } from '../../src/utils/date';
import { useFabBottomOffset, useListBottomPadding } from '../../src/utils/layout';
import { formatCurrency } from '../../src/utils/formatting';
import type { CategoryKey, PeriodFilter, Transaction, TransactionType } from '../../src/types';

interface DayGroup {
  date: string;
  net: number;
  data: Transaction[];
}

export default function TransactionsScreen() {
  const theme = useTheme();
  const listBottomPadding = useListBottomPadding({ hasFab: true });
  const fabBottomOffset = useFabBottomOffset();
  const t = useT();
  const language = useLanguage();
  const toast = useToast();

  const {
    transactions,
    visibleTransactions,
    filters,
    setFilters,
    resetFilters,
    loadMore,
    hasMore,
    refresh,
    refreshing,
    totals,
    deleteTransaction,
  } = useTransactions();
  const { wallets } = useWallets();
  const { targets } = useSavings();

  const [filterOpen, setFilterOpen] = useState(false);
  const [menuTarget, setMenuTarget] = useState<Transaction | null>(null);

  /** True when anything other than the defaults is narrowing the list. */
  const hasActiveFilters =
    filters.query.trim().length > 0 ||
    filters.type !== 'all' ||
    filters.walletId !== 'all' ||
    filters.category !== 'all';
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const walletById = (id?: string) => wallets.find((wallet) => wallet.id === id);
  const walletName = (id?: string) => walletById(id)?.name;
  const targetName = (id?: string) => targets.find((target) => target.id === id)?.name;

  /* Flatten the page into [day header, ...rows] so FlatList stays virtualised. */
  const listData = useMemo(() => {
    const groups: DayGroup[] = [];
    for (const transaction of visibleTransactions) {
      const last = groups[groups.length - 1];
      const net =
        transaction.type === 'income' ? transaction.amount : transaction.type === 'expense' ? -transaction.amount : 0;
      if (last && last.date === transaction.date) {
        last.data.push(transaction);
        last.net += net;
      } else {
        groups.push({ date: transaction.date, net, data: [transaction] });
      }
    }

    return groups.flatMap((group) => [
      { kind: 'header' as const, key: `h_${group.date}`, group },
      ...group.data.map((transaction) => ({ kind: 'row' as const, key: transaction.id, transaction })),
    ]);
  }, [visibleTransactions]);

  const periodOptions = useMemo(
    () => [
      { value: 'this_month' as PeriodFilter, label: t('transaction.period.this_month') },
      { value: 'last_3_months' as PeriodFilter, label: t('transaction.period.last_3_months') },
      { value: 'last_6_months' as PeriodFilter, label: t('transaction.period.last_6_months') },
      { value: 'all' as PeriodFilter, label: t('transaction.period.all') },
    ],
    [t],
  );

  const categoryOptions = useMemo(
    () => [
      { value: 'all' as const, label: t('common.all') },
      ...[...EXPENSE_CATEGORY_KEYS, ...INCOME_CATEGORY_KEYS]
        .filter((key, index, array) => array.indexOf(key) === index)
        .map((key) => ({ value: key, label: t(`category.${key}` as never), color: CATEGORY_META[key].color })),
    ],
    [t],
  );

  const activeFilterCount =
    (filters.walletId !== 'all' ? 1 : 0) + (filters.category !== 'all' ? 1 : 0) + (filters.type !== 'all' ? 1 : 0);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteTransaction(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    toast.notify(result, t('common.delete'));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.screen, paddingBottom: listBottomPadding }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.card}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasMore) loadMore();
        }}
        ListHeaderComponent={
          <View style={{ paddingTop: theme.spacing.sm }}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="title">{t('transaction.title')}</AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                  {`${transactions.length} ${t('transaction.found')}`}
                </AppText>
              </View>
              <Pressable
                onPress={() => setFilterOpen(true)}
                accessibilityLabel={t('common.filter')}
                style={[styles.iconButton, { backgroundColor: theme.colors.chipTint }]}
              >
                <Icon name="options-outline" size={18} color={theme.colors.textMedium} />
                {activeFilterCount > 0 ? (
                  <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
                ) : null}
              </Pressable>
            </View>

            <Input
              value={filters.query}
              onChangeText={(query) => setFilters({ query })}
              placeholder={t('transaction.search_placeholder')}
              leftIcon="search-outline"
              rightIcon={filters.query ? 'close-circle' : undefined}
              onRightIconPress={() => setFilters({ query: '' })}
              containerStyle={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.sm }}
            />

            {/* Period + active filter summary in one row */}
            <SegmentedControl
              options={periodOptions}
              value={filters.period}
              onChange={(period) => setFilters({ period })}
              size="sm"
            />

            {activeFilterCount > 0 ? (
              <View style={[styles.chipRow, { marginTop: theme.spacing.sm }]}>
                {filters.type !== 'all' ? (
                  <Chip
                    size="sm"
                    label={t(TRANSACTION_TYPE_META[filters.type as TransactionType].key as never)}
                    selected
                    onPress={() => setFilters({ type: 'all' })}
                    icon="close"
                  />
                ) : null}
                {filters.walletId !== 'all' ? (
                  <Chip
                    size="sm"
                    label={walletName(filters.walletId) ?? t('common.wallet')}
                    selected
                    onPress={() => setFilters({ walletId: 'all' })}
                    icon="close"
                  />
                ) : null}
                {filters.category !== 'all' ? (
                  <Chip
                    size="sm"
                    label={t(`category.${filters.category}` as never)}
                    selected
                    onPress={() => setFilters({ category: 'all' })}
                    icon="close"
                  />
                ) : null}
              </View>
            ) : null}

            {/* Filtered totals — the "receipt" of the current view */}
            <Card style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.xs }}>
              <View style={styles.totalsRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.totalsLabel}>
                    <View style={[styles.dotSmall, { backgroundColor: theme.colors.incomeColor }]} />
                    <AppText variant="caption" tone="muted">
                      {t('report.in')}
                    </AppText>
                  </View>
                  <Money value={totals.income} size="body" />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.totalsLabel}>
                    <View style={[styles.dotSmall, { backgroundColor: theme.colors.expenseColor }]} />
                    <AppText variant="caption" tone="muted">
                      {t('report.out')}
                    </AppText>
                  </View>
                  <Money value={totals.expense} size="body" />
                </View>

                <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
                  <AppText variant="caption" tone="muted">
                    {t('dashboard.net')}
                  </AppText>
                  <Money
                    value={totals.net}
                    size="body"
                    tone={totals.net >= 0 ? 'success' : 'danger'}
                    signed
                  />
                </View>
              </View>
            </Card>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return (
              <DayGroupHeader
                label={formatDateLong(item.group.date, language)}
                weekday={formatWeekdayShort(item.group.date, language)}
                net={item.group.net}
                count={item.group.data.length}
              />
            );
          }

          return (
            <TransactionRow
              transaction={item.transaction}
              // Rows sit under a `DayGroupHeader`, so the date lives there.
              showDate={false}
              sourceWalletName={walletName(item.transaction.walletSourceId)}
              destinationWalletName={walletName(item.transaction.walletDestinationId)}
              savingsTargetName={targetName(item.transaction.savingsTargetId)}
              sourceWallet={walletById(item.transaction.walletSourceId)}
              destinationWallet={walletById(item.transaction.walletDestinationId)}
              savingsMark
              onPress={() => router.push(`/transaction/${item.transaction.id}`)}
              onLongPress={() => setMenuTarget(item.transaction)}
            />
          );
        }}
        ListEmptyComponent={
          /*
           * Keyed off *any* active filter, not just the search query. Filtering
           * by category or wallet could previously empty the list while the
           * screen still said "no transactions yet" and offered to add one —
           * hiding the fact that a filter was responsible.
           */
          <EmptyState
            icon="receipt-outline"
            title={hasActiveFilters ? t('transaction.no_results') : t('transaction.empty')}
            message={hasActiveFilters ? undefined : t('transaction.empty_hint')}
            actionLabel={hasActiveFilters ? t('common.reset') : t('transaction.add')}
            onAction={() => (hasActiveFilters ? resetFilters() : router.push('/transaction/new'))}
          />
        }
        ListFooterComponent={
          hasMore ? (
            <View style={{ paddingVertical: theme.spacing.lg }}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>          ) : transactions.length > 0 ? (
            /**
             * Count only. The period's totals are already spelled out in the
             * summary card above the list, so repeating the money here would be
             * a second, differently-scoped number competing with it.
             */
            <View style={{ paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.md }}>
              <AppText variant="small" weight="medium" tone="muted" align="center" tabular>
                {`${transactions.length} ${t('transaction.found')}`}
              </AppText>
            </View>
          ) : null}
      />

      <FAB bottomOffset={fabBottomOffset} onPress={() => router.push('/transaction/new')} accessibilityLabel={t('transaction.add')} />

      {/* Filter panel */}
      <BottomSheet visible={filterOpen} onClose={() => setFilterOpen(false)} title={t('common.filter')}>
        <AppText variant="micro" tone="faint" style={{ marginBottom: theme.spacing.sm }}>
          {t('transaction.filter_period').toUpperCase()}
        </AppText>
        <SegmentedControl
          options={periodOptions}
          value={filters.period}
          onChange={(period) => setFilters({ period })}
          size="sm"
          style={{ marginBottom: theme.spacing.lg }}
        />

        <AppText variant="micro" tone="faint" style={{ marginBottom: theme.spacing.sm }}>
          {t('transaction.filter_type').toUpperCase()}
        </AppText>
        <View style={[styles.chipRow, { marginBottom: theme.spacing.lg }]}>
          {(['all', 'income', 'expense', 'transfer', 'savings_deposit', 'savings_withdraw'] as const).map((value) => (
            <Chip
              key={value}
              size="sm"
              label={
                value === 'all' ? t('common.all') : t(TRANSACTION_TYPE_META[value as TransactionType].key as never)
              }
              selected={filters.type === value}
              onPress={() => setFilters({ type: value })}
            />
          ))}
        </View>

        <Select
          label={t('transaction.filter_wallet')}
          value={filters.walletId}
          options={[
            { value: 'all' as const, label: t('common.all') },
            ...wallets.map((wallet) => ({ value: wallet.id, label: wallet.name })),
          ]}
          onChange={(walletId) => setFilters({ walletId })}
        />

        <Select
          label={t('transaction.filter_category')}
          value={filters.category}
          options={categoryOptions}
          onChange={(category) => setFilters({ category: category as CategoryKey | 'all' })}
        />

        <View style={[styles.sheetActions, { marginTop: theme.spacing.sm }]}>
          <Button
            label={t('common.reset')}
            variant="secondary"
            icon="refresh-outline"
            onPress={resetFilters}
            style={{ flex: 1 }}
          />
          <Button label={t('common.apply')} onPress={() => setFilterOpen(false)} style={{ flex: 1.2 }} />
        </View>
      </BottomSheet>

      {/* Long-press actions */}
      <BottomSheet
        visible={Boolean(menuTarget)}
        onClose={() => setMenuTarget(null)}
        title={menuTarget?.description?.trim() ? menuTarget.description : t('transaction.title')}
        subtitle={
          menuTarget
            ? `${t(TRANSACTION_TYPE_META[menuTarget.type].key as never)} · ${formatCurrency(menuTarget.amount)}`
            : undefined
        }
      >
        <Button
          label={t('common.details')}
          variant="secondary"
          icon="open-outline"
          onPress={() => {
            const id = menuTarget?.id;
            setMenuTarget(null);
            if (id) router.push(`/transaction/${id}`);
          }}
          style={{ marginBottom: theme.spacing.sm }}
        />
        <Button
          label={t('common.delete')}
          variant="danger"
          icon="trash-outline"
          onPress={() => {
            const target = menuTarget;
            setMenuTarget(null);
            setDeleteTarget(target);
          }}
          style={{ marginBottom: theme.spacing.sm }}
        />
      </BottomSheet>

      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        title={t('transaction.delete_confirm')}
        message={t('transaction.delete_confirm_body')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  totalsLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
});
