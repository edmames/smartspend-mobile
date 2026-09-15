/**
 * Select / dropdown. Renders as a tappable field; the option list opens in a
 * bottom sheet (the spec's "bottom sheet untuk kategori picker").
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import type { SelectOption } from '../../types';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { BottomSheet } from './BottomSheet';
import { Input } from './Input';
import { haptics } from '../../utils/haptics';

export interface SelectProps<T extends string = string> {
  label?: string;
  value: T | null | undefined;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
  helper?: string;
  disabled?: boolean;
  title?: string;
  containerStyle?: StyleProp<ViewStyle>;
  /** Adds a search box when the list is long. */
  searchable?: boolean;
}

export function Select<T extends string = string>({
  label,
  value,
  options,
  onChange,
  placeholder,
  error,
  helper,
  disabled = false,
  title,
  containerStyle,
  searchable,
}: SelectProps<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);
  const showSearch = searchable ?? options.length > 8;

  const visibleOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

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
        accessibilityState={{ disabled, expanded: open }}
        onPress={() => {
          haptics.selection();
          setQuery('');
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: theme.colors.inputBackground,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.lg,
            opacity: disabled ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1,
          },
        ]}
      >
        {selected?.color ? (
          <View style={[styles.dot, { backgroundColor: selected.color }]} />
        ) : null}
        <AppText
          variant="bodyLarge"
          color={selected ? theme.colors.text : theme.colors.textMuted}
          style={{ flex: 1 }}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder ?? '—'}
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

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={title ?? label ?? placeholder ?? ''}
        maxHeightRatio={0.75}
      >
        {showSearch ? (
          <Input
            placeholder="Cari…"
            value={query}
            onChangeText={setQuery}
            leftIcon="search-outline"
            autoCorrect={false}
          />
        ) : null}

        <ScrollView scrollEnabled={false}>
          {visibleOptions.length === 0 ? (
            <AppText variant="small" tone="muted" style={{ paddingVertical: theme.spacing.lg, textAlign: 'center' }}>
              —
            </AppText>
          ) : (
            visibleOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    haptics.selection();
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.accentSoft
                        : pressed
                          ? theme.colors.chipTint
                          : 'transparent',
                      borderRadius: theme.radius.md,
                      paddingVertical: theme.spacing.md,
                      paddingHorizontal: theme.spacing.md,
                      opacity: pressed && !isSelected ? theme.opacity.pressed : 1,
                    },
                  ]}
                >
                  {option.color ? <View style={[styles.dot, { backgroundColor: option.color }]} /> : null}
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" weight={isSelected ? 'semibold' : 'regular'}>
                      {option.label}
                    </AppText>
                    {option.description ? (
                      <AppText variant="caption" tone="muted" style={{ marginTop: 1 }}>
                        {option.description}
                      </AppText>
                    ) : null}
                  </View>
                  {isSelected ? <Icon name="checkmark" size={18} color={theme.colors.primary} /> : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderWidth: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
});

export default Select;
