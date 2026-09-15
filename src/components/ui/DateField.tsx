/**
 * Date field — tap to open a calendar sheet.
 * Future dates are disabled by default (the ledger forbids them).
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useTheme';
import { useT } from '../../hooks/useTheme';
import type { ISODate } from '../../types';
import {
  addMonthsToYearMonth,
  eachDayOfMonth,
  formatDateLong,
  formatMonthYear,
  formatWeekdayShort,
  monthYearOf,
  todayISO,
} from '../../utils/date';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';
import { haptics } from '../../utils/haptics';

export interface DateFieldProps {
  label?: string;
  value: ISODate;
  onChange: (date: ISODate) => void;
  error?: string;
  helper?: string;
  minDate?: ISODate;
  /** Defaults to today (Asia/Jakarta) — the ledger never allows future dates. */
  maxDate?: ISODate;
  /** Savings due dates may be in the future; transactions may not. */
  allowFuture?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday-first grid

export function DateField({
  label,
  value,
  onChange,
  error,
  helper,
  minDate,
  maxDate,
  allowFuture = false,
  containerStyle,
  disabled = false,
}: DateFieldProps) {
  const theme = useTheme();
  const language = useLanguage();
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <View style={[{ marginBottom: theme.spacing.md }, containerStyle]}>
      {label ? (
        <AppText variant="label" tone="muted" style={{ marginBottom: theme.spacing.xs }}>
          {label}
        </AppText>
      ) : null}

      <Pressable
        disabled={disabled}
        accessibilityRole="button"
        onPress={() => {
          haptics.light();
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: theme.colors.inputBackground,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.md,
            opacity: disabled ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1,
          },
        ]}
      >
        <Icon name="calendar-outline" size={18} color={theme.colors.textMuted} style={{ marginRight: 10 }} />
        <AppText variant="bodyLarge" style={{ flex: 1 }}>
          {value ? formatDateLong(value, language) : '—'}
        </AppText>
        <Icon name="chevron-down" size={18} color={theme.colors.textMuted} />
      </Pressable>

      {error ? (
        <View style={styles.messageRow}>
          <Icon name="alert-circle-outline" size={14} color={theme.colors.danger} style={{ marginRight: 4 }} />
          <AppText variant="small" tone="danger" style={{ flex: 1 }}>
            {error}
          </AppText>
        </View>
      ) : helper ? (
        <AppText variant="small" tone="muted" style={{ marginTop: theme.spacing.xs }}>
          {helper}
        </AppText>
      ) : null}

      <CalendarSheet
        visible={open}
        onClose={() => setOpen(false)}
        value={value}
        title={label ?? t('common.date')}
        minDate={minDate}
        maxDate={allowFuture ? undefined : maxDate ?? todayISO()}
        onSelect={(date) => {
          onChange(date);
          setOpen(false);
        }}
      />
    </View>
  );
}

export interface CalendarSheetProps {
  visible: boolean;
  onClose: () => void;
  value: ISODate;
  title?: string;
  minDate?: ISODate;
  maxDate?: ISODate;
  onSelect: (date: ISODate) => void;
}

export function CalendarSheet({
  visible,
  onClose,
  value,
  title,
  minDate,
  maxDate,
  onSelect,
}: CalendarSheetProps) {
  const theme = useTheme();
  const language = useLanguage();
  const [cursor, setCursor] = useState(() => monthYearOf(value || todayISO()));

  const today = todayISO();
  const days = useMemo(() => eachDayOfMonth(cursor), [cursor]);
  const firstWeekday = days.length ? new Date(`${days[0]}T12:00:00`).getDay() : 1;
  const leadingBlanks = WEEKDAY_ORDER.indexOf(firstWeekday);

  const cursorIsMax = maxDate ? monthYearOf(maxDate) <= cursor : false;
  const cursorIsMin = minDate ? monthYearOf(minDate) >= cursor : false;

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} maxHeightRatio={0.72}>
      <View style={styles.calendarHeader}>
        <Pressable
          onPress={() => setCursor((current) => addMonthsToYearMonth(current, -1))}
          disabled={cursorIsMin}
          hitSlop={10}
          style={[styles.arrow, { opacity: cursorIsMin ? theme.opacity.disabled : 1 }]}
        >
          <Icon name="chevron-back" size={20} color={theme.colors.text} />
        </Pressable>
        <AppText variant="bodyLarge" weight="semibold">
          {formatMonthYear(cursor, language)}
        </AppText>
        <Pressable
          onPress={() => setCursor((current) => addMonthsToYearMonth(current, 1))}
          disabled={cursorIsMax}
          hitSlop={10}
          style={[styles.arrow, { opacity: cursorIsMax ? theme.opacity.disabled : 1 }]}
        >
          <Icon name="chevron-forward" size={20} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_ORDER.map((weekday) => (
          <AppText key={weekday} variant="caption" tone="muted" align="center" style={styles.weekdayCell}>
            {formatWeekdayShort(days[0] ? findDateWithWeekday(cursor, weekday, days) : today, language)}
          </AppText>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {Array.from({ length: leadingBlanks }).map((_, index) => (
          <View key={`blank_${index}`} style={styles.dayCell} />
        ))}
        {days.map((date) => {
          const disabled = (maxDate ? date > maxDate : false) || (minDate ? date < minDate : false);
          const selected = date === value;
          const isToday = date === today;
          const dayNumber = Number(date.slice(8, 10));

          return (
            <Pressable
              key={date}
              disabled={disabled}
              onPress={() => {
                haptics.selection();
                onSelect(date);
              }}
              style={styles.dayCell}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? theme.colors.primary : 'transparent',
                  borderWidth: isToday && !selected ? 1 : 0,
                  borderColor: theme.colors.primary,
                  opacity: disabled ? 0.3 : 1,
                }}
              >
                <AppText
                  variant="small"
                  weight={selected || isToday ? 'semibold' : 'regular'}
                  color={selected ? theme.colors.onPrimary : theme.colors.text}
                >
                  {String(dayNumber)}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: 8 }} />
      <AppText variant="caption" tone="muted" align="center">
        {formatDateLong(value || today, language)}
      </AppText>
    </BottomSheet>
  );
}

/** Finds the first ISO date in the month that falls on `weekday`. */
function findDateWithWeekday(monthYear: string, weekday: number, days: ISODate[]): ISODate {
  const match = days.find((date) => new Date(`${date}T12:00:00`).getDay() === weekday);
  return match ?? `${monthYear}-01`;
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderWidth: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  arrow: {
    width: 40,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekdayCell: {
    flex: 1,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
});

export default DateField;
