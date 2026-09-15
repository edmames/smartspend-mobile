/**
 * Create / edit a savings target.
 * Edits may change the name, the goal amount and the due date — the goal may be
 * raised or lowered even after money has been set aside.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MutationResult, SavingsTarget, SavingsTargetInput } from '../../types';
import { useTheme, useT } from '../../hooks/useTheme';
import { todayISO } from '../../utils/date';
import { parseAmountInput } from '../../utils/formatting';
import { validateSavingsTargetInput } from '../../utils/validation';
import { AppText } from '../ui/AppText';
import { AmountInput } from '../ui/AmountInput';
import { Button } from '../ui/Button';
import { DateField } from '../ui/DateField';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';

export interface SavingsFormProps {
  initial?: SavingsTarget;
  targets: SavingsTarget[];
  onSubmit: (input: SavingsTargetInput) => Promise<MutationResult<SavingsTarget>>;
  onCancel: () => void;
}

export function SavingsForm({ initial, targets, onSubmit, onCancel }: SavingsFormProps) {
  const theme = useTheme();
  const t = useT();
  const isEditing = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? '');
  const [goalDigits, setGoalDigits] = useState(initial ? String(initial.goalAmount) : '');
  const [dueDate, setDueDate] = useState<string | undefined>(initial?.dueDate);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrors({});
    const parsed = goalDigits ? parseAmountInput(goalDigits) : null;

    if (!parsed || !parsed.ok) {
      setErrors({ goalAmount: t(`error.${parsed?.error ?? 'amount_required'}` as never) });
      return;
    }

    const input: SavingsTargetInput = {
      name,
      goalAmount: parsed.value ?? 0,
      dueDate: dueDate ?? null,
    };

    const validation = validateSavingsTargetInput(
      input,
      { wallets: [], targets, budgets: [] },
      { targetId: initial?.id },
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
      <Input
        label={t('common.name')}
        value={name}
        onChangeText={setName}
        placeholder={t('savings.name_placeholder')}
        error={errors.name}
        leftIcon="flag-outline"
        autoCapitalize="sentences"
        maxLength={40}
      />

      <AmountInput
        label={t('savings.goal_amount')}
        value={goalDigits}
        onChangeText={setGoalDigits}
        error={errors.goalAmount}
        validateLive
      />

      <DateField
        label={`${t('savings.due_date')} (${t('common.optional')})`}
        value={dueDate ?? ''}
        onChange={(value) => setDueDate(value)}
        error={errors.dueDate}
        allowFuture
        helper={t('savings.no_due_date')}
      />

      {dueDate ? (
        <View>
          <Button
            label={t('common.reset')}
            variant="ghost"
            size="sm"
            icon="close"
            onPress={() => setDueDate(undefined)}
            style={{ alignSelf: 'flex-start', marginTop: -6 }}
          />
        </View>
      ) : null}

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

export { todayISO };

const styles = StyleSheet.create({
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

export default SavingsForm;
