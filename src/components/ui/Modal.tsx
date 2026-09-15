/**
 * Centered modal dialog for forms and confirmations.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Sticky footer rendered outside the scroll area (usually buttons). */
  footer?: ReactNode;
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  dismissOnBackdrop?: boolean;
}

export function AppModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  scrollable = true,
  contentStyle,
  dismissOnBackdrop = true,
}: AppModalProps) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(0.94)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Scale 0.9 → 1 + fade on enter, 150ms out — snappy, never floaty.
    Animated.parallel([
      Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: visible ? 180 : 140, useNativeDriver: true }),
      Animated.spring(scale, { toValue: visible ? 1 : 0.9, useNativeDriver: true, friction: 9, tension: 170 }),
    ]).start();
  }, [opacity, scale, visible]);

  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlay, opacity }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissOnBackdrop ? onClose : undefined}
            accessibilityLabel="Close dialog"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            theme.modalShadow,
            {
              backgroundColor: theme.colors.backgroundAlt,
              borderRadius: theme.radius.xl,
              borderColor: theme.colors.border,
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          {title ? (
            <View style={[styles.header, { padding: theme.spacing.xl, paddingBottom: theme.spacing.md }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="subtitle">{title}</AppText>
                {subtitle ? (
                  <AppText variant="small" tone="muted" style={{ marginTop: 3 }}>
                    {subtitle}
                  </AppText>
                ) : null}
              </View>
              <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
                <Icon name="close" size={22} color={theme.colors.textMuted} />
              </Pressable>
            </View>
          ) : null}

          {scrollable ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                { paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.lg },
                !title && { paddingTop: theme.spacing.xl },
                contentStyle,
              ]}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[{ padding: theme.spacing.xl }, contentStyle]}>{children}</View>
          )}

          {footer ? (
            <View
              style={{
                padding: theme.spacing.xl,
                paddingTop: theme.spacing.md,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.colors.border,
              }}
            >
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '88%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});

export default AppModal;
