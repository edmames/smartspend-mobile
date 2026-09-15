/**
 * StorageNotice — explains when the app is running on the in-memory fallback
 * (session-only) instead of persistent device/browser storage.
 *
 * Renders nothing while storage is persistent, so it never adds noise in the
 * normal case (Expo Go, a real browser tab, a production build).
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, useT } from '../../hooks/useTheme';
import { useStorageStatus } from '../../hooks/useStorage';
import { AppText } from './AppText';
import { Icon } from './Icon';

export interface StorageNoticeProps {
  style?: StyleProp<ViewStyle>;
  /** Compact single-line variant for auth screens. */
  compact?: boolean;
}

export function StorageNotice({ style, compact = false }: StorageNoticeProps) {
  const theme = useTheme();
  const t = useT();
  const status = useStorageStatus();

  if (status.mode !== 'memory') return null;

  const bodyKey =
    status.reason === 'write_failed'
      ? 'storage.memory.write_failed'
      : status.reason === 'storage_blocked'
        ? 'storage.memory.blocked'
        : 'storage.memory.unavailable';

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor: `${theme.colors.warning}1a`,
          borderColor: `${theme.colors.warning}55`,
          borderRadius: theme.radius.md,
          padding: compact ? theme.spacing.sm : theme.spacing.md,
          gap: theme.spacing.sm,
        },
        style,
      ]}
    >
      <Icon name="information-circle-outline" size={16} color={theme.colors.warning} />
      <View style={{ flex: 1 }}>
        <AppText variant="caption" weight="semibold" color={theme.colors.warning}>
          {t('storage.memory.title')}
        </AppText>
        {!compact ? (
          <AppText variant="caption" tone="muted" style={{ marginTop: 2, lineHeight: 17 }}>
            {t(bodyKey as never)}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
  },
});

export default StorageNotice;
