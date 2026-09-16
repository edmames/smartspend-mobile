/**
 * BottomSheet — drag handle, 26px top radius, spring track, backdrop fade.
 * Used for pickers and quick action menus.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal as RNModal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { useReducedMotion } from '../../utils/motion';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  maxHeightRatio?: number;
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxHeightRatio = 0.85,
  scrollable = true,
  contentStyle,
}: BottomSheetProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  /**
   * Drag-to-dismiss: past ~20% of the sheet (or a decisive flick) the sheet
   * closes, otherwise it springs back to rest. Attached to the handle row only,
   * so the scrollable body still scrolls normally.
   */
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_event, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_event, gesture) => {
        const threshold = screenHeight * maxHeightRatio * 0.2;
        if (gesture.dy > threshold || gesture.vy > 0.7) {
          onClose();
          return;
        }
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 9,
          tension: 140,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 9, tension: 140 }).start();
      },
    }),
  ).current;

  useEffect(() => {
    if (reduced) {
      opacity.setValue(visible ? 1 : 0);
      translateY.setValue(visible ? 0 : screenHeight);
      return;
    }

    // Spring-bounce entrance: cubic-bezier(0.34, 1.56, 0.64, 1) feel via a
    // soft spring with a slight overshoot; exit stays a quick eased slide.
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 200 : 150,
        useNativeDriver: true,
      }),
      visible
        ? Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 9,
            tension: 130,
          })
        : Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 200,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
    ]).start();
  }, [opacity, reduced, screenHeight, translateY, visible]);

  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlay, opacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            theme.elevation.sheet,
            {
              backgroundColor: theme.colors.backgroundAlt,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              maxHeight: screenHeight * maxHeightRatio,
              paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handleRow} {...pan.panHandlers}>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close sheet">
              <View style={[styles.handle, { backgroundColor: theme.colors.borderStrong }]} />
            </Pressable>
          </View>

          {title ? (
            <View style={[styles.header, { paddingHorizontal: theme.spacing.screen }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="subtitle">{title}</AppText>
                {subtitle ? (
                  <AppText variant="small" tone="muted" style={{ marginTop: 2 }}>
                    {subtitle}
                  </AppText>
                ) : null}
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityLabel="Close"
                style={[styles.closeButton, { backgroundColor: theme.colors.chipTint }]}
              >
                <Icon name="close" size={16} color={theme.colors.textMuted} />
              </Pressable>
            </View>
          ) : null}

          {scrollable ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                { paddingHorizontal: theme.spacing.screen, paddingBottom: theme.spacing.md },
                contentStyle,
              ]}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[{ paddingHorizontal: theme.spacing.screen }, contentStyle]}>{children}</View>
          )}
        </Animated.View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 14,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BottomSheet;
