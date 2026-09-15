/**
 * Empty / zero-data placeholder — quiet and useful: a muted glyph, a short
 * title, one sentence of guidance and (optionally) a single action.
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
  actionLabel,
  onAction,
  style,
  compact = false,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: compact ? theme.spacing.xl : theme.spacing.xxxl,
          paddingHorizontal: theme.spacing.lg,
        },
        style,
      ]}
    >
      <View
        style={{
          width: compact ? 40 : 48,
          height: compact ? 40 : 48,
          borderRadius: theme.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.chipTint,
          marginBottom: theme.spacing.md,
        }}
      >
        <Icon name={icon} size={compact ? 18 : 22} color={theme.colors.textMuted} />
      </View>

      <AppText variant="subtitle" align="center" tone="medium">
        {title}
      </AppText>

      {message ? (
        <AppText variant="small" tone="muted" align="center" style={{ marginTop: 6, maxWidth: 280 }}>
          {message}
        </AppText>
      ) : null}

      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
          icon="add"
          style={{ marginTop: theme.spacing.lg }}
        />
      ) : null}
    </View>
  );
}

export default EmptyState;
