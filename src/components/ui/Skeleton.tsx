/**
 * Skeleton — shimmer placeholder shown on first paint instead of a spinner, so
 * the layout is already in place when the data lands.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useReducedMotion } from '../../utils/motion';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 14, radius, style }: SkeletonProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    if (reduced) {
      pulse.setValue(0.75);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 760, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 760, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.colors.skeleton,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

/** Placeholder used while the first ledger read completes. */
export function DashboardSkeleton() {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing.screen, gap: theme.spacing.lg }}>
      <View style={{ gap: theme.spacing.sm }}>
        <Skeleton width="35%" height={12} />
        <Skeleton width="60%" height={20} />
      </View>
      <View style={{ backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: theme.spacing.card, gap: theme.spacing.md }}>
        <Skeleton width="30%" height={11} />
        <Skeleton width="70%" height={34} radius={theme.radius.sm} />
        <Skeleton width="100%" height={1} />
        <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
          <Skeleton width="30%" height={30} />
          <Skeleton width="30%" height={30} />
        </View>
      </View>
      <Skeleton width="100%" height={190} radius={theme.radius.lg} />
      <View style={{ gap: theme.spacing.sm }}>
        <Skeleton width="100%" height={58} radius={theme.radius.md} />
        <Skeleton width="100%" height={58} radius={theme.radius.md} />
        <Skeleton width="100%" height={58} radius={theme.radius.md} />
      </View>
    </View>
  );
}

export default Skeleton;
