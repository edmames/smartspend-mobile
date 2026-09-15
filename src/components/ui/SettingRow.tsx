/**
 * SettingRow — grouped settings row: tinted icon chip, title, optional value
 * and a right slot (Switch, chevron, badge…). Dividers are hairlines.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { haptics } from '../../utils/haptics';

export interface SettingRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  /** Removes the bottom divider (last row in a group). */
  last?: boolean;
}

export function SettingRow({
  title,
  subtitle,
  icon,
  iconColor,
  value,
  right,
  onPress,
  destructive = false,
  last = false,
}: SettingRowProps) {
  const theme = useTheme();
  const tint = destructive ? theme.colors.danger : iconColor ?? theme.colors.primary;

  const content = (
    <View
      style={[
        styles.row,
        {
          paddingVertical: 13,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      {icon ? (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: destructive ? `${tint}1f` : theme.colors.chipTint,
            marginRight: theme.spacing.md,
          }}
        >
          <Icon name={icon} size={16} color={destructive ? tint : tint} />
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <AppText variant="body" color={destructive ? theme.colors.danger : theme.colors.text}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {value ? (
        <AppText variant="small" tone="muted" style={{ marginRight: 6 }} numberOfLines={1}>
          {value}
        </AppText>
      ) : null}

      {right ?? (onPress ? <Icon name="chevron-forward" size={16} color={theme.colors.textFaint} /> : null)}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? theme.opacity.muted : 1 })}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
  },
});

export default SettingRow;
