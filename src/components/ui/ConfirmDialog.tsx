/**
 * Confirmation dialog for destructive actions.
 *
 * Center modal, tinted icon chip, H3-style headline and a two-button footer
 * with the destructive action in red on the right (platform convention).
 */
import { View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { Button } from './Button';
import { AppModal } from './Modal';
import { Icon } from './Icon';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  loading?: boolean;
  /** Optional extra content (e.g. import-mode options). */
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = true,
  loading = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const accent = destructive ? theme.colors.danger : theme.colors.primary;

  return (
    <AppModal visible={visible} onClose={loading ? () => undefined : onCancel} dismissOnBackdrop={!loading}>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${accent}1f`,
            marginBottom: theme.spacing.md,
          }}
        >
          <Icon name={destructive ? 'alert-circle-outline' : 'information-circle-outline'} size={22} color={accent} />
        </View>

        <AppText variant="h3" align="center">
          {title}
        </AppText>
        {message ? (
          <AppText variant="small" tone="muted" align="center" style={{ marginTop: theme.spacing.sm, lineHeight: 20 }}>
            {message}
          </AppText>
        ) : null}

        {children ? <View style={{ width: '100%', marginTop: theme.spacing.lg }}>{children}</View> : null}

        <View style={{ flexDirection: 'row', gap: theme.spacing.lg, marginTop: theme.spacing.xl, width: '100%' }}>
          <Button label={cancelLabel} variant="secondary" onPress={onCancel} disabled={loading} style={{ flex: 1 }} />
          <Button
            label={confirmLabel}
            variant={destructive ? 'danger' : 'primary'}
            onPress={onConfirm}
            loading={loading}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </AppModal>
  );
}

export default ConfirmDialog;
