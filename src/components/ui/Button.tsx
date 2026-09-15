/**
 * Button — filled primary, tonal secondary, outline, ghost, danger, success.
 *
 * Filled variants get a 1px inner highlight along the top edge, which is what
 * makes a flat rectangle read as a physical key. Press feedback is a spring
 * scale rather than an opacity dip.
 */
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { palette } from '../../styles/colors';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { haptics } from '../../utils/haptics';
import { usePressScale } from '../../utils/motion';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  haptic = true,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();
  const { colors, radius, spacing } = theme;
  const isDisabled = disabled || loading;
  const press = usePressScale(0.97);

  const filled = variant === 'primary' || variant === 'danger' || variant === 'success';

  const backgrounds: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.cardAlt,
    ghost: 'transparent',
    danger: theme.dark ? palette.rose : '#dc2626',
    success: theme.dark ? palette.emerald : '#059669',
    outline: 'transparent',
  };

  const textColors: Record<ButtonVariant, string> = {
    primary: colors.onPrimary,
    secondary: colors.text,
    ghost: colors.textMedium,
    danger: theme.dark ? palette.ink900 : '#ffffff',
    success: theme.dark ? palette.ink900 : '#ffffff',
    outline: colors.text,
  };

  const heights: Record<ButtonSize, number> = { sm: 34, md: 44, lg: 52 };
  const paddings: Record<ButtonSize, number> = { sm: spacing.md, md: spacing.lg, lg: spacing.xl };
  const textVariant = size === 'sm' ? 'small' : size === 'lg' ? 'bodyLarge' : 'body';

  const handlePress = () => {
    if (isDisabled) return;
    if (haptic) haptics.light();
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={handlePress}
      onPressIn={press.handlers.onPressIn}
      onPressOut={press.handlers.onPressOut}
      disabled={isDisabled}
      style={[
        styles.base,
        {
          backgroundColor: backgrounds[variant],
          borderRadius: radius.md,
          minHeight: heights[size],
          paddingHorizontal: paddings[size],
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: variant === 'outline' ? colors.borderStrong : undefined,
          opacity: isDisabled ? theme.opacity.disabled : 1,
          width: fullWidth ? '100%' : undefined,
        },
        filled ? styles.innerHighlight : null,
        press.style,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={textColors[variant]} style={{ marginRight: 8 }} />
        ) : icon ? (
          <Icon
            name={icon}
            size={size === 'sm' ? 15 : 17}
            color={textColors[variant]}
            style={{ marginRight: label ? 8 : 0 }}
          />
        ) : null}
        <AppText variant={textVariant} color={textColors[variant]} weight="semibold">
          {label}
        </AppText>
        {iconRight ? (
          <Icon name={iconRight} size={16} color={textColors[variant]} style={{ marginLeft: 8 }} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerHighlight: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: 'rgba(255,255,255,0.22)',
  },
});

export default Button;
