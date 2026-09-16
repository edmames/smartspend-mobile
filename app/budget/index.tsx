/**
 * Budgets — one limit per category per month, with live usage.
 */
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT, useLanguage } from '../../src/hooks/useTheme';
import { useBudgets } from '../../src/hooks/useBudgets';
import { useBudgetStore } from '../../src/store/budgetStore';
import { useTransactions } from '../../src/hooks/useTransactions';
import { AppText } from '../../src/components/ui/AppText';
import { Card, Divider, SectionHeader } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { FAB } from '../../src/components/ui/FAB';
import { Money } from '../../src/components/ui/Money';
import { MonthNavigator } from '../../src/components/ui/MonthNavigator';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { AppModal } from '../../src/components/ui/Modal';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { BudgetCard } from '../../src/components/BudgetCard';
import { BudgetForm } from '../../src/components/forms/BudgetForm';
import { useToast } from '../../src/components/ui/Toast';
import { formatCurrency } from '../../src/utils/formatting';
import { formatMonthYear } from '../../src/utils/date';
import { useFabBottomOffset, useListBottomPadding } from '../../src/utils/layout';
import type { BudgetUsage } from '../../src/types';

export default function BudgetScreen() {
  const theme = useTheme();
  // No tab bar on this route, but the floating add button still sits at the bottom.
  const listBottomPadding = useListBottomPadding();
  const fabBottomOffset = useFabBottomOffset();
  const t = useT();
  const language = useLanguage();
  const toast = useToast();

  const { monthYear, setMonthYear, usages, totals, availableCategories, addBudget, editBudget, deleteBudget } =
    useBudgets();
  const budgets = useBudgetStore((state) => state.budgets);
  const { refresh, refreshing } = useTransactions();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetUsage | null>(null);
  const [menuTarget, setMenuTarget] = useState<BudgetUsage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetUsage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteBudget(deleteTarget.budget.id);
    setDeleting(false);
    setDeleteTarget(null);
    toast.notify(result, t('common.delete'));
  };

  const barColor =
    totals.percentage > 100
      ? theme.colors.danger
      : totals.percentage >= 50
        ? theme.colors.warning
        : theme.colors.success;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.screen,
          paddingTop: theme.spacing.sm,
          paddingBottom: listBottomPadding,
        }}
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
        <AppText variant="title">{t('budget.title')}</AppText>
        <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
          {`${formatMonthYear(monthYear, language)} · ${t('budget.month_hint')}`}
        </AppText>

        <MonthNavigator value={monthYear} onChange={setMonthYear} style={{ marginTop: theme.spacing.md }} />

        {/* Month total */}
        <Card style={{ marginTop: theme.spacing.md }}>
          <View style={styles.totalRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="caption" tone="muted">
                {t('budget.total_used')}
              </AppText>
              <View style={{ marginTop: 2 }}>
                <Money value={totals.used} size="money" />
              </View>
            </View>
            <AppText variant="small" tone="muted" tabular>
              {`${t('budget.total_limit')} ${formatCurrency(totals.limit)}`}
            </AppText>
          </View>

          <ProgressBar ratio={totals.percentage / 100} color={barColor} height={6} showOverflow style={{ marginTop: theme.spacing.md }} />

          <Divider style={{ marginVertical: theme.spacing.md }} />

          <View style={styles.metaRow}>
            <AppText variant="caption" tone="muted">
              {`${usages.length} ${t('budget.title').toLowerCase()}`}
            </AppText>
            <AppText variant="caption" tone={totals.remaining < 0 ? 'danger' : 'muted'} tabular>
              {totals.remaining < 0
                ? `${t('budget.exceeded_warning')}`
                : `${t('common.remaining')} ${formatCurrency(totals.remaining)}`}
            </AppText>
          </View>
        </Card>

        <SectionHeader
          title={t('budget.title')}
          count={usages.length}
          actionLabel={t('budget.new')}
          onAction={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        />

        {usages.length === 0 ? (
          <Card>
            <EmptyState
              icon="pie-chart-outline"
              title={t('budget.empty')}
              message={t('budget.empty_hint')}
              actionLabel={t('budget.new')}
              onAction={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            />
          </Card>
        ) : (
          usages.map((usage) => (
            <BudgetCard
              key={usage.budget.id}
              usage={usage}
              onPress={() => {
                setEditing(usage);
                setFormOpen(true);
              }}
              onLongPress={() => setMenuTarget(usage)}
            />
          ))
        )}
      </ScrollView>

      <FAB
        bottomOffset={fabBottomOffset}
        onPress={() => {
          setEditing(null);
          setFormOpen(true);
        }}
        accessibilityLabel={t('budget.new')}
      />

      <BottomSheet
        visible={Boolean(menuTarget)}
        onClose={() => setMenuTarget(null)}
        title={menuTarget ? t(`category.${menuTarget.budget.category}` as never) : undefined}
        subtitle={
          menuTarget
            ? `${formatCurrency(menuTarget.used)} ${t('budget.of_limit')} ${formatCurrency(menuTarget.budget.limitAmount)}`
            : undefined
        }
      >
        <Button
          label={t('common.edit')}
          variant="secondary"
          icon="create-outline"
          onPress={() => {
            const usage = menuTarget;
            setMenuTarget(null);
            if (usage) {
              setEditing(usage);
              setFormOpen(true);
            }
          }}
          style={{ marginBottom: theme.spacing.sm }}
        />
        <Button
          label={t('common.delete')}
          variant="danger"
          icon="trash-outline"
          onPress={() => {
            const usage = menuTarget;
            setMenuTarget(null);
            if (usage) setDeleteTarget(usage);
          }}
        />
      </BottomSheet>

      <AppModal
        visible={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? t('budget.edit') : t('budget.new')}
        subtitle={formatMonthYear(monthYear, language)}
      >
        <BudgetForm
          monthYear={monthYear}
          initial={editing?.budget}
          budgets={budgets}
          availableCategories={availableCategories}
          onSubmit={async (input) => {
            const result = editing ? await editBudget(editing.budget.id, input) : await addBudget(input);
            if (result.ok) {
              toast.success(editing ? t('common.save_changes') : t('budget.new'));
              setFormOpen(false);
              setEditing(null);
            }
            return result;
          }}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      </AppModal>

      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        title={t('common.confirm')}
        message={deleteTarget ? t(`category.${deleteTarget.budget.category}` as never) : undefined}
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
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
