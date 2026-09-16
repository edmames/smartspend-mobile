/**
 * Month navigator: ‹ Month Year › with a grid picker sheet.
 * Future months are disabled by default (budgets are the only future-dated entity).
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useTheme';
import type { YearMonth } from '../../types';
import { addMonthsToYearMonth, currentMonthYear, formatMonthShort, formatMonthYear } from '../../utils/date';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';
import { haptics } from '../../utils/haptics';

export interface MonthNavigatorProps {
  value: YearMonth;
  onChange: (monthYear: YearMonth) => void;
  maxMonth?: YearMonth;
  minMonth?: YearMonth;
  style?: StyleProp<ViewStyle>;
  /** Disables the picker sheet (arrows only). */
  pickerDisabled?: boolean;
}

export function MonthNavigator({
  value,
  onChange,
  maxMonth,
  minMonth,
  style,
  pickerDisabled = false,
}: MonthNavigatorProps) {
  const theme = useTheme();
  const language = useLanguage();
  const [pickerOpen, setPickerOpen] = useState(false);

  const max = maxMonth ?? currentMonthYear();
  const atMax = value >= max;
  const atMin = minMonth ? value <= minMonth : false;

  const move = (delta: number) => {
    const next = addMonthsToYearMonth(value, delta);
    if (next > max || (minMonth && next < minMonth)) return;
    haptics.selection();
    onChange(next);
  };

  return (
    <View style={style}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderRadius: theme.radius.md,
            padding: 4,
          },
        ]}
      >
        <Pressable
          onPress={() => move(-1)}
          disabled={atMin}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={({ pressed }) => [
            styles.arrow,
            { opacity: atMin ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1 },
          ]}
        >
          <Icon name="chevron-back" size={20} color={theme.colors.primary} />
        </Pressable>

        <Pressable
          onPress={() => {
            if (pickerDisabled) return;
            haptics.light();
            setPickerOpen(true);
          }}
          style={styles.center}
          accessibilityRole="button"
        >
          <AppText variant="bodyLarge" weight="semibold">
            {formatMonthYear(value, language)}
          </AppText>
          {!pickerDisabled ? <Icon name="calendar-outline" size={15} color={theme.colors.primary} style={{ marginLeft: 8 }} /> : null}
        </Pressable>

        <Pressable
          onPress={() => move(1)}
          disabled={atMax}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={({ pressed }) => [
            styles.arrow,
            { opacity: atMax ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1 },
          ]}
        >
          <Icon name="chevron-forward" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>

      <MonthPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={value}
        maxMonth={max}
        minMonth={minMonth}
        onSelect={(monthYear) => {
          onChange(monthYear);
          setPickerOpen(false);
        }}
      />
    </View>
  );
}

interface MonthPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  value: YearMonth;
  maxMonth: YearMonth;
  minMonth?: YearMonth;
  onSelect: (monthYear: YearMonth) => void;
}

export function MonthPickerSheet({
  visible,
  onClose,
  value,
  maxMonth,
  minMonth,
  onSelect,
}: MonthPickerSheetProps) {
  const theme = useTheme();
  const language = useLanguage();
  const [year, setYear] = useState(() => Number(value.slice(0, 4)));

  const selectedYear = Number(value.slice(0, 4));
  const selectedMonth = Number(value.slice(5, 7));
  const maxYear = Number(maxMonth.slice(0, 4));

  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), []);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={String(year)} maxHeightRatio={0.7}>
      <View style={[styles.yearRow, { marginBottom: theme.spacing.md }]}>
        <Pressable
          onPress={() => setYear((current) => current - 1)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`${year - 1}`}
          style={styles.arrow}
        >
          <Icon name="chevron-back" size={20} color={theme.colors.text} />
        </Pressable>
        <AppText variant="body" weight="semibold">
          {year}
        </AppText>
        <Pressable
          onPress={() => setYear((current) => Math.min(maxYear, current + 1))}
          disabled={year >= maxYear}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`${year + 1}`}
          accessibilityState={{ disabled: year >= maxYear }}
          style={[styles.arrow, { opacity: year >= maxYear ? theme.opacity.disabled : 1 }]}
        >
          <Icon name="chevron-forward" size={20} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {months.map((month) => {
          const monthYear = `${year}-${String(month).padStart(2, '0')}` as YearMonth;
          const disabled = monthYear > maxMonth || (minMonth ? monthYear < minMonth : false);
          const selected = year === selectedYear && month === selectedMonth;

          return (
            <Pressable
              key={monthYear}
              disabled={disabled}
              // Screen readers announce the month name and its own state rather
              // than the bare cell contents.
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={formatMonthYear(monthYear, language)}
              onPress={() => {
                haptics.selection();
                onSelect(monthYear);
              }}
              style={({ pressed }) => [
                styles.monthCell,
                {
                  backgroundColor: selected ? theme.colors.primary : theme.colors.cardAlt,
                  borderRadius: theme.radius.sm,
                  opacity: disabled ? 0.35 : pressed ? theme.opacity.pressed : 1,
                },
              ]}
            >
              <AppText
                variant="small"
                weight={selected ? 'semibold' : 'regular'}
                color={selected ? theme.colors.onPrimary : theme.colors.text}
              >
                {formatMonthShort(monthYear, language)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: {
    width: 40,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthCell: {
    width: '22%',
    minWidth: 68,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MonthNavigator;
