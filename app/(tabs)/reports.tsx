/**
 * Monthly report — summary, daily cash-flow chart + table, top categories and
 * the 6-month trend. The month navigator sits in the header so the whole page
 * re-reads as you scrub through months.
 */
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT, useLanguage } from '../../src/hooks/useTheme';
import { useTransactionStore } from '../../src/store/transactionStore';
import { useBudgetStore } from '../../src/store/budgetStore';
import { useReportExport } from '../../src/hooks/useStorage';
import { AppText } from '../../src/components/ui/AppText';
import { Card, Divider, SectionHeader } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Icon } from '../../src/components/ui/Icon';
import { Money } from '../../src/components/ui/Money';
import { MonthNavigator } from '../../src/components/ui/MonthNavigator';
import { StatTile } from '../../src/components/ui/StatTile';
import { BarChart } from '../../src/components/charts/BarChart';
import { PieChart } from '../../src/components/charts/PieChart';
import { AreaChart } from '../../src/components/charts/AreaChart';
import { useToast } from '../../src/components/ui/Toast';
import {
  calculateBudgetUsage,
  calculateCategoryBreakdown,
  calculateDailyCashFlow,
  calculateMonthlySummary,
  calculateMonthlyTrend,
} from '../../src/utils/calculations';
import { CATEGORY_META, REPORT_TOP_CATEGORIES } from '../../src/utils/constants';
import { formatCurrency, formatPercentage } from '../../src/utils/formatting';
import { currentMonthYear, formatDateShort, formatMonthShort, formatWeekdayShort } from '../../src/utils/date';
import { useListBottomPadding } from '../../src/utils/layout';

export default function ReportsScreen() {
  const theme = useTheme();
  const listBottomPadding = useListBottomPadding();
  const t = useT();
  const language = useLanguage();
  const toast = useToast();
  const transactions = useTransactionStore((state) => state.transactions);
  const budgets = useBudgetStore((state) => state.budgets);
  const exportReport = useReportExport();

  const [monthYear, setMonthYear] = useState(currentMonthYear());
  const [exporting, setExporting] = useState(false);
  const [showAllDays, setShowAllDays] = useState(false);

  const summary = useMemo(() => calculateMonthlySummary(transactions, monthYear), [monthYear, transactions]);
  const daily = useMemo(() => calculateDailyCashFlow(transactions, monthYear), [monthYear, transactions]);
  const categories = useMemo(
    () => calculateCategoryBreakdown(transactions, monthYear, 'expense'),
    [monthYear, transactions],
  );
  const trend = useMemo(() => calculateMonthlyTrend(transactions, monthYear, 6), [monthYear, transactions]);
  const budgetSummary = useMemo(() => {
    const usages = budgets
      .filter((budget) => budget.monthYear === monthYear)
      .map((budget) => calculateBudgetUsage(budget, transactions));
    return {
      exceededCount: usages.filter((usage) => usage.status === 'exceeded').length,
      used: usages.reduce((sum, usage) => sum + usage.used, 0),
      limit: usages.reduce((sum, usage) => sum + usage.budget.limitAmount, 0),
    };
  }, [budgets, monthYear, transactions]);

  const activeDays = daily.filter((day) => day.income > 0 || day.expense > 0);
  const visibleDays = showAllDays ? [...daily].reverse() : [...activeDays].slice(-10).reverse();
  const savingsRate = summary.income > 0 ? (summary.net / summary.income) * 100 : 0;

  const handleExport = async () => {
    setExporting(true);
    const result = await exportReport(monthYear);
    setExporting(false);
    if (result.ok) toast.success(`${t('report.exported')} · ${result.data.fileName}`);
    else toast.error(result.error);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.screen,
          paddingTop: theme.spacing.sm,
          paddingBottom: listBottomPadding,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <AppText variant="title">{t('report.title')}</AppText>
          <Button
            label={t('report.export_json')}
            variant="ghost"
            size="sm"
            icon="download-outline"
            onPress={handleExport}
            loading={exporting}
          />
        </View>

        <MonthNavigator value={monthYear} onChange={setMonthYear} style={{ marginTop: theme.spacing.md }} />

        {/* Headline: net cash flow with savings rate */}
        <Card style={{ marginTop: theme.spacing.md }}>
          <View style={styles.netRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="caption" tone="muted">
                {t('dashboard.net')}
              </AppText>
              <View style={{ marginTop: 2 }}>
                <Money value={summary.net} size="money" tone={summary.net >= 0 ? 'success' : 'danger'} signed />
              </View>
            </View>
            <View
              style={[
                styles.rateChip,
                {
                  backgroundColor:
                    savingsRate >= 20 ? `${theme.colors.success}1a` : `${theme.colors.chipTint}`,
                },
              ]}
            >
              <AppText
                variant="caption"
                weight="semibold"
                tabular
                color={savingsRate >= 20 ? theme.colors.success : theme.colors.textMuted}
              >
                {formatPercentage(savingsRate, 0, language)}
              </AppText>
            </View>
          </View>

          <Divider style={{ marginVertical: theme.spacing.md }} />

          <View style={styles.ioRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.ioLabel}>
                <View style={[styles.dot, { backgroundColor: theme.colors.incomeColor }]} />
                <AppText variant="caption" tone="muted">
                  {t('dashboard.income')}
                </AppText>
              </View>
              <Money value={summary.income} size="subtitle" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.ioLabel}>
                <View style={[styles.dot, { backgroundColor: theme.colors.expenseColor }]} />
                <AppText variant="caption" tone="muted">
                  {t('dashboard.expense')}
                </AppText>
              </View>
              <Money value={summary.expense} size="subtitle" />
            </View>
          </View>
        </Card>

        {budgetSummary.exceededCount > 0 ? (
          <Card
            variant="inset"
            onPress={() => router.push('/budget')}
            style={{
              marginTop: theme.spacing.sm,
              backgroundColor: `${theme.colors.danger}14`,
            }}
          >
            <View style={styles.alertRow}>
              <Icon name="alert-circle" size={16} color={theme.colors.danger} />
              <AppText variant="small" tone="danger" style={{ flex: 1, marginLeft: 8 }}>
                {`${budgetSummary.exceededCount} · ${t('budget.exceeded_warning')} · ${formatCurrency(budgetSummary.used)} / ${formatCurrency(budgetSummary.limit)}`}
              </AppText>
              <Icon name="chevron-forward" size={15} color={theme.colors.danger} />
            </View>
          </Card>
        ) : null}

        {/* Monthly stats */}
        <View style={[styles.statsRow, { marginTop: theme.spacing.md }]}>
          <StatTile
            label={t('report.transaction_count')}
            value={String(summary.transactionCount)}
            icon="receipt-outline"
          />
          <View style={{ width: theme.spacing.md }} />
          <StatTile
            label={t('savings.title')}
            value={formatCurrency(summary.savingsIn - summary.savingsOut)}
            icon="flag-outline"
            tone="primary"
          />
        </View>

        {/* Daily cash flow */}
        <SectionHeader
          title={t('report.cash_flow')}
          actionLabel={showAllDays ? t('report.cash_flow') : t('common.see_all')}
          onAction={() => setShowAllDays((value) => !value)}
        />

        {activeDays.length === 0 ? (
          <Card>
            <EmptyState compact icon="calendar-outline" title={t('report.no_activity')} />
          </Card>
        ) : (
          <>
            <Card>
              <BarChart
                labels={daily.map((day) => String(Number(day.date.slice(8, 10))))}
                series={[
                  { label: t('report.in'), values: daily.map((day) => day.income), color: theme.colors.incomeColor },
                  { label: t('report.out'), values: daily.map((day) => day.expense), color: theme.colors.expenseColor },
                ]}
                height={140}
              />
            </Card>

            <Card padded={false} style={{ marginTop: theme.spacing.sm, paddingHorizontal: theme.spacing.card }}>
              <View style={[styles.tableHeader, { borderBottomColor: theme.colors.border }]}>
                <AppText variant="micro" tone="faint" style={{ flex: 1.3 }}>
                  {t('report.day').toUpperCase()}
                </AppText>
                <AppText variant="micro" tone="faint" style={{ flex: 1, textAlign: 'right' }}>
                  {t('report.in').toUpperCase()}
                </AppText>
                <AppText variant="micro" tone="faint" style={{ flex: 1, textAlign: 'right' }}>
                  {t('report.out').toUpperCase()}
                </AppText>
                <AppText variant="micro" tone="faint" style={{ flex: 1.2, textAlign: 'right' }}>
                  {t('report.cumulative').toUpperCase()}
                </AppText>
              </View>

              {visibleDays.map((day) => (
                <View key={day.date} style={[styles.tableRow, { borderTopColor: theme.colors.border }]}>
                  <View style={{ flex: 1.3 }}>
                    <AppText variant="caption" weight="medium" tabular>
                      {formatDateShort(day.date, language)}
                    </AppText>
                    <AppText variant="caption" tone="faint">
                      {formatWeekdayShort(day.date, language)}
                    </AppText>
                  </View>
                  <AppText variant="caption" tabular color={theme.colors.incomeColor} style={{ flex: 1, textAlign: 'right' }}>
                    {day.income > 0 ? formatCurrency(day.income, { withSymbol: false }) : '—'}
                  </AppText>
                  <AppText variant="caption" tabular color={theme.colors.expenseColor} style={{ flex: 1, textAlign: 'right' }}>
                    {day.expense > 0 ? formatCurrency(day.expense, { withSymbol: false }) : '—'}
                  </AppText>
                  <AppText
                    variant="caption"
                    weight="medium"
                    tabular
                    color={day.cumulativeNet >= 0 ? theme.colors.incomeColor : theme.colors.expenseColor}
                    style={{ flex: 1.2, textAlign: 'right' }}
                  >
                    {formatCurrency(day.cumulativeNet, { withSymbol: false })}
                  </AppText>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Categories */}
        <SectionHeader title={t('report.categories')} />
        <Card>
          {categories.length === 0 ? (
            <EmptyState compact icon="pie-chart-outline" title={t('report.no_category')} />
          ) : (
            <PieChart
              maxLegendItems={REPORT_TOP_CATEGORIES}
              data={categories.slice(0, REPORT_TOP_CATEGORIES).map((item) => ({
                label: t(`category.${item.category}` as never),
                value: item.amount,
                color: CATEGORY_META[item.category]?.color ?? theme.colors.primary,
              }))}
              centerValue={formatCurrency(summary.expense, { withSymbol: false })}
              centerLabel={t('dashboard.expense')}
            />
          )}
        </Card>

        {categories.length > REPORT_TOP_CATEGORIES ? (
          <Card padded={false} style={{ marginTop: theme.spacing.sm, paddingHorizontal: theme.spacing.card }}>
            {categories.slice(REPORT_TOP_CATEGORIES).map((item, index) => (
              <View
                key={item.category}
                style={[
                  styles.categoryRow,
                  {
                    borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: theme.colors.border,
                  },
                ]}
              >
                <View
                  style={[styles.dot, { backgroundColor: CATEGORY_META[item.category]?.color ?? theme.colors.primary }]}
                />
                <AppText variant="small" style={{ flex: 1 }}>
                  {t(`category.${item.category}` as never)}
                </AppText>
                <AppText variant="small" weight="semibold" tabular>
                  {formatCurrency(item.amount, { withSymbol: false })}
                </AppText>
                <AppText variant="caption" tone="faint" tabular style={{ marginLeft: 10, width: 48, textAlign: 'right' }}>
                  {formatPercentage(item.percentage, 1, language)}
                </AppText>
              </View>
            ))}
          </Card>
        ) : null}

        {/* 6-month trend */}
        <SectionHeader title={t('report.trend')} />
        <Card>
          <AreaChart
            labels={trend.map((point) => formatMonthShort(point.monthYear, language))}
            series={[
              { label: t('dashboard.income'), values: trend.map((point) => point.income), color: theme.colors.incomeColor },
              { label: t('dashboard.expense'), values: trend.map((point) => point.expense), color: theme.colors.expenseColor },
            ]}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  ioRow: {
    flexDirection: 'row',
    gap: 16,
  },
  ioLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
});
