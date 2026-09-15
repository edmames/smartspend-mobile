/**
 * SegmentedControl — iOS-style segmented switch: sunken track, elevated
 * selected thumb, no borders.
 */
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { haptics } from '../../utils/haptics';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
  size = 'md',
  fullWidth = true,
}: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceSunken,
          borderRadius: theme.radius.md,
          padding: 3,
          gap: 3,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(option.value);
            }}
            style={[
              styles.segment,
              {
                flex: fullWidth ? 1 : undefined,
                backgroundColor: selected ? theme.colors.cardAlt : 'transparent',
                borderRadius: theme.radius.sm,
                paddingVertical: size === 'sm' ? 6 : 9,
                paddingHorizontal: size === 'sm' ? 8 : 12,
              },
              selected ? theme.elevation.pressed : null,
            ]}
          >
            {option.icon ? (
              <Icon
                name={option.icon}
                size={13}
                color={selected ? theme.colors.text : theme.colors.textMuted}
                style={{ marginRight: 5 }}
              />
            ) : null}
            <AppText
              variant="small"
              weight={selected ? 'semibold' : 'medium'}
              color={selected ? theme.colors.text : theme.colors.textMuted}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SegmentedControl;
