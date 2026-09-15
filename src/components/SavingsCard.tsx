/**
 * SavingsCard — goal title, saved figure, thin progress and the remaining
 * amount. Overdue / completed states appear as badges rather than tinting the
 * whole card.
 */
import { StyleSheet, View } from 'react-native';
import { useTheme, useT, useLanguage } from '../hooks/useTheme';
import type { TargetProgress } from '../types';
import { formatDateLong } from '../utils/date';
import { formatCurrency, formatPercentage } from '../utils/formatting';
import { AppText } from './ui/AppText';
import { Badge } from './ui/Chip';
import { Card } from './ui/Card';
import { Money } from './ui/Money';
import { ProgressBar } from './ui/ProgressBar';

export interface SavingsCardProps {
  progress: TargetProgress;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function SavingsCard({ progress, onPress, onLongPress }: SavingsCardProps) {
  const theme = useTheme();
  const t = useT();
  const language = useLanguage();
  const { target, saved, remaining, ratio, percentage, isComplete, daysLeft, isOverdue } = progress;

  const barColor = isComplete
    ? theme.colors.success
    : isOverdue
      ? theme.colors.danger
      : theme.colors.primary;

  return (
    <Card onPress={onPress} onLongPress={onLongPress} style={{ marginBottom: theme.spacing.sm }}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="body" weight="semibold" numberOfLines={1}>
            {target.name}
          </AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {target.dueDate ? formatDateLong(target.dueDate, language) : t('savings.no_due_date')}
          </AppText>
        </View>

        {isComplete ? (
          <Badge label={t('savings.completed')} color={theme.colors.success} icon="checkmark-circle" />
        ) : isOverdue ? (
          <Badge label={t('savings.overdue')} color={theme.colors.danger} icon="alert-circle" />
        ) : daysLeft !== null ? (
          <Badge
            label={`${daysLeft} ${t('savings.days_left')}`}
            color={daysLeft <= 14 ? theme.colors.warning : theme.colors.textMuted}
            icon="hourglass-outline"
          />
        ) : null}
      </View>

      <View style={[styles.amountRow, { marginTop: theme.spacing.md }]}>
        <Money value={saved} size="title" />
        <AppText variant="small" tone="muted" style={{ marginLeft: 8 }} numberOfLines={1}>
          {`${t('common.of')} ${formatCurrency(target.goalAmount)}`}
        </AppText>
      </View>

      <ProgressBar ratio={ratio} color={barColor} height={6} style={{ marginTop: theme.spacing.sm }} />

      <View style={[styles.footerRow, { marginTop: theme.spacing.sm }]}>
        <AppText variant="caption" tone={isComplete ? 'success' : 'muted'} tabular>
          {`${formatPercentage(percentage, 0, language)} ${t('common.progress').toLowerCase()}`}
        </AppText>
        <AppText variant="caption" tone="muted" tabular>
          {`${t('savings.remaining')} · ${formatCurrency(remaining)}`}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default SavingsCard;
