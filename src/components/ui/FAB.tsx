/**
 * FAB — squircle add button with a spring press. Optional label expands it into
 * a pill for screens where the action needs naming.
 */
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { haptics } from '../../utils/haptics';
import { usePressScale } from '../../utils/motion';

export interface FABProps {
  onPress: () => void;
  icon?: IconName;
  label?: string;
  style?: StyleProp<ViewStyle>;
  bottomOffset?: number;
  accessibilityLabel?: string;
}

export function FAB({ onPress, icon = 'add', label, style, bottomOffset = 24, accessibilityLabel }: FABProps) {
  const theme = useTheme();
  const press = usePressScale(0.94);

  return (
    <View style={[styles.host, { pointerEvents: 'box-none' }, { bottom: bottomOffset, right: theme.spacing.screen }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label ?? 'Add'}
        onPressIn={press.handlers.onPressIn}
        onPressOut={press.handlers.onPressOut}
        onPress={() => {
          haptics.medium();
          onPress();
        }}
        style={[
          styles.button,
          theme.elevation.floating,
          {
            backgroundColor: theme.colors.primary,
            borderRadius: label ? theme.radius.pill : 18,
            paddingHorizontal: label ? theme.spacing.lg : 0,
            borderTopWidth: StyleSheet.hairlineWidth * 2,
            borderTopColor: 'rgba(255,255,255,0.22)',
          },
          press.style,
        ]}
      >
        <Icon name={icon} size={24} color={theme.colors.onPrimary} />
        {label ? (
          <AppText variant="body" weight="semibold" color={theme.colors.onPrimary} style={{ marginLeft: 8 }}>
            {label}
          </AppText>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    zIndex: 20,
  },
  button: {
    minWidth: 54,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FAB;
