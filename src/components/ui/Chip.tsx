/**
 * Chip / Badge — filter pills and status badges. Borderless by design: chips
 * are tonal fills, which keeps filter rows calm when many are present.
 */
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { haptics } from '../../utils/haptics';
import { usePressScale } from '../../utils/motion';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** Accent used when selected (defaults to the theme primary). */
  color?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  size?: 'sm' | 'md';
  /** Optional trailing count (used by filter chips). */
  count?: number;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  color,
  style,
  disabled = false,
  size = 'md',
  count,
}: ChipProps) {
  const theme = useTheme();
  const accent = color ?? theme.colors.primary;
  const press = usePressScale(0.96);
  const height = size === 'sm' ? 30 : 34;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPressIn={press.handlers.onPressIn}
      onPressOut={press.handlers.onPressOut}
      onPress={() => {
        if (disabled) return;
        haptics.selection();
        onPress?.();
      }}
      style={[
        styles.base,
        {
          height,
          backgroundColor: selected ? accent : theme.colors.chipTint,
          borderRadius: theme.radius.pill,
          paddingHorizontal: size === 'sm' ? 12 : 14,
          opacity: disabled ? theme.opacity.disabled : 1,
        },
        press.style,
        style,
      ]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={13}
          color={selected ? theme.colors.onPrimary : theme.colors.textMuted}
          style={{ marginRight: label ? 6 : 0 }}
        />
      ) : null}
      <AppText
        variant={size === 'sm' ? 'small' : 'small'}
        weight="semibold"
        color={selected ? theme.colors.onPrimary : theme.colors.textMedium}
      >
        {label}
      </AppText>
      {typeof count === 'number' ? (
        <AppText
          variant="caption"
          tabular
          color={selected ? theme.colors.onPrimary : theme.colors.textFaint}
          style={{ marginLeft: 6, opacity: 0.85 }}
        >
          {String(count)}
        </AppText>
      ) : null}
    </Pressable>
  );
}

export interface BadgeProps {
  label: string;
  color: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, color, icon, style }: BadgeProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${color}1f`,
          borderRadius: theme.radius.pill,
          paddingHorizontal: 8,
          paddingVertical: 3,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={11} color={color} style={{ marginRight: 4 }} /> : null}
      <AppText variant="caption" weight="semibold" color={color}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
});

export default Chip;
