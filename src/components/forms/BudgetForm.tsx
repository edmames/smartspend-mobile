/**
 * Create / edit a monthly budget for one category.
 * A category can only have a single budget per month (validated here + store).
 */
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Budget, BudgetInput, CategoryKey, MutationResult, YearMonth } from '../../types';
import { useTheme, useT, useLanguage } from '../../hooks/useTheme';
import { BUDGET_CATEGORY_KEYS, CATEGORY_META } from '../../utils/constants';
import { formatMonthYear } from '../../utils/date';
import { parseAmountInput } from '../../utils/formatting';
import { validateBudgetInput } from '../../utils/validation';
import { AppText } from '../ui/AppText';
import { AmountInput } from '../ui/AmountInput';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Select } from '../ui/Select';

export interface BudgetFormProps {
  monthYear: YearMonth;
  initial?: Budget;
  /** Categories without a budget in this month (used for new budgets). */
  availableCategories: CategoryKey[];
  budgets: Budget[];
  onSubmit: (input: BudgetInput) => Promise<MutationResult<Budget>>;
  onCancel: () => void;
}

export function BudgetForm({
  monthYear,
  initial,
  availableCategories,
  budgets,
  onSubmit,
  onCancel,
}: BudgetFormProps) {
  const theme = useTheme();
  const t = useT();
  const language = useLanguage();
  const isEditing = Boolean(initial);

  const categoryChoices = useMemo<CategoryKey[]>(
    () => (isEditing && initial ? [initial.category] : availableCategories.length > 0 ? availableCategories : []),
    [availableCategories, initial, isEditing],
  );

  const [category, setCategory] = useState<CategoryKey | undefined>(initial?.category ?? categoryChoices[0]);
  const [limitDigits, setLimitDigits] = useState(initial ? String(initial.limitAmount) : '');
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const options = (isEditing && initial ? [initial.category] : BUDGET_CATEGORY_KEYS).map((key) => ({
    value: key,
    label: t(`category.${key}` as never),
    color: CATEGORY_META[key].color,
  }));

  const handleSubmit = async () => {
    setErrors({});
    const parsed = limitDigits ? parseAmountInput(limitDigits) : null;

    if (!parsed || !parsed.ok) {
      setErrors({ limitAmount: t(`error.${parsed?.error ?? 'limit_required'}` as never) });
      return;
    }
    if (!category) {
      setErrors({ category: t('error.category_required') });
      return;
    }

    const input: BudgetInput = { category, monthYear, limitAmount: parsed.value ?? 0 };
    const validation = validateBudgetInput(
      input,
      { wallets: [], targets: [], budgets },
      { budgetId: initial?.id },
    );

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

  return (
    <View>
      <View style={[styles.monthRow, { backgroundColor: theme.colors.surfaceSunken, borderRadius: theme.radius.md }]}>
        <Icon name="calendar-outline" size={16} color={theme.colors.textMuted} />
        <AppText variant="small" tone="medium" style={{ marginLeft: 8 }}>
          {formatMonthYear(monthYear, language)}
        </AppText>
      </View>

      <Select
        label={t('common.category')}
        value={category}
        options={options}
        onChange={(value) => setCategory(value as CategoryKey)}
        error={errors.category}
        disabled={isEditing || categoryChoices.length <= 1}
        helper={isEditing ? undefined : t('budget.month_hint')}
        title={t('common.category')}
      />

      <AmountInput
        label={t('budget.limit')}
        value={limitDigits}
        onChangeText={setLimitDigits}
        error={errors.limitAmount}
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
          label={isEditing ? t('common.save_changes') : t('common.save')}
          onPress={handleSubmit}
          loading={submitting}
          icon="checkmark"
          style={{ flex: 1.4 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
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

export default BudgetForm;
