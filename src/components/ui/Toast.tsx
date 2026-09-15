/**
 * Toast notifications — feedback for every mutation.
 *
 * Presented top-anchored as a single elevated pill: icon, message, tap to
 * dismiss. No colour stripes, no stacked clutter (max 2 on screen).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import type { MutationResult, ToastKind, ToastMessage } from '../../types';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { haptics } from '../../utils/haptics';
import { useReducedMotion } from '../../utils/motion';

interface ToastApi {
  show: (kind: ToastKind, message: string, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  /** Shows `successMessage` on success, otherwise the result's error. */
  notify: <T,>(result: MutationResult<T>, successMessage: string) => boolean;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TOAST_META: Record<ToastKind, { icon: IconName; tone: 'success' | 'danger' | 'primary' | 'warning' }> = {
  success: { icon: 'checkmark-circle', tone: 'success' },
  error: { icon: 'alert-circle', tone: 'danger' },
  info: { icon: 'information-circle', tone: 'primary' },
  warning: { icon: 'warning', tone: 'warning' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((kind: ToastKind, message: string, duration = 3000) => {
    counter.current += 1;
    const id = `toast_${counter.current}`;
    setToasts((current) => [...current.slice(-1), { id, kind, message, duration }]);
    if (kind === 'success') haptics.success();
    if (kind === 'error') haptics.error();
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      dismiss,
      success: (message: string) => show('success', message),
      error: (message: string) => show('error', message),
      info: (message: string) => show('info', message),
      warning: (message: string) => show('warning', message),
      notify: <T,>(result: MutationResult<T>, successMessage: string) => {
        if (result.ok) {
          show('success', successMessage);
          return true;
        }
        show('error', result.error);
        return false;
      },
    }),
    [dismiss, show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastStack({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.host, { pointerEvents: 'box-none' }, { top: insets.top + 10 }]}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </View>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const translateY = useRef(new Animated.Value(reduced ? 0 : -14)).current;
  const opacity = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const meta = TOAST_META[toast.kind];
  const accent = theme.colors[meta.tone];

  /** Solid status surface with a matching hairline — high contrast on dark. */
  const pillBackground = theme.dark ? theme.colors.cardAlt : theme.colors.card;

  useEffect(() => {
    if (!reduced) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 9, tension: 160 }),
      ]).start();
    }

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -10, duration: 180, useNativeDriver: true }),
      ]).start(onDismiss);
    }, toast.duration ?? 3000);

    return () => clearTimeout(timer);
  }, [onDismiss, opacity, reduced, toast.duration, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }], marginBottom: 8 }}>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="alert"
        style={[
          styles.toast,
          theme.elevation.floating,
          {
            backgroundColor: pillBackground,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radius.pill,
          },
        ]}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${accent}24`,
            marginRight: 10,
          }}
        >
          <Icon name={meta.icon} size={13} color={accent} />
        </View>
        <AppText variant="small" tone="medium" style={{ flex: 1 }}>
          {toast.message}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return context;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
});

export default ToastProvider;
