/**
 * BudgetCard — category limit with a status-coloured bar:
 * green < 50%, amber 50–99%, red > 100%.
 */
import { StyleSheet, View } from 'react-native';
import { useTheme, useT, useLanguage } from '../hooks/useTheme';
import type { BudgetUsage } from '../types';
import { CATEGORY_META } from '../utils/constants';
import { formatCurrency, formatPercentage } from '../utils/formatting';
import { AppText } from './ui/AppText';
import { Badge } from './ui/Chip';
import { Card } from './ui/Card';
import { IconBadge } from './ui/Icon';
import { ProgressBar } from './ui/ProgressBar';

export interface BudgetCardProps {
  usage: BudgetUsage;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function budgetStatusColor(
  status: BudgetUsage['status'],
  colors: { success: string; warning: string; danger: string },
): string {
  switch (status) {
    case 'safe':
      return colors.success;
    case 'warning':
      return colors.warning;
    default:
      return colors.danger;
  }
}

export function BudgetCard({ usage, onPress, onLongPress }: BudgetCardProps) {
  const theme = useTheme();
  const t = useT();
  const language = useLanguage();
  const meta = CATEGORY_META[usage.budget.category] ?? CATEGORY_META.other;
  const color = budgetStatusColor(usage.status, theme.colors);
  const overspent = usage.status === 'exceeded';

  return (
    <Card onPress={onPress} onLongPress={onLongPress} style={{ marginBottom: theme.spacing.sm }}>
      <View style={styles.header}>
        <IconBadge name={meta.icon as never} color={meta.color} containerSize={36} size={16} tint={0.14} />

        <View style={{ flex: 1, marginLeft: theme.spacing.md, minWidth: 0 }}>
          <View style={styles.titleRow}>
            <AppText variant="body" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {t(`category.${usage.budget.category}` as never)}
            </AppText>
            {overspent ? (
              <Badge label={t('budget.exceeded_warning')} color={theme.colors.danger} style={{ marginLeft: 8 }} />
            ) : null}
          </View>
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }} tabular>
            {`${formatCurrency(usage.used)} ${t('common.of')} ${formatCurrency(usage.budget.limitAmount)}`}
          </AppText>
        </View>

        <AppText variant="body" weight="semibold" tabular color={color}>
          {formatPercentage(usage.percentage, 0, language)}
        </AppText>
      </View>

      <ProgressBar ratio={usage.ratio} color={color} height={6} showOverflow style={{ marginTop: theme.spacing.md }} />

      <View style={[styles.footer, { marginTop: theme.spacing.sm }]}>
        <AppText variant="caption" tone="muted">
          {t(`budget.status.${usage.status}` as never)}
        </AppText>
        <AppText variant="caption" tabular color={overspent ? theme.colors.danger : theme.colors.textMuted}>
          {overspent
            ? `${t('common.total')} +${formatCurrency(usage.used - usage.budget.limitAmount)}`
            : `${t('common.remaining')} ${formatCurrency(usage.remaining)}`}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default BudgetCard;
