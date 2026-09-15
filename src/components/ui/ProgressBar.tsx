/**
 * ProgressBar — 6px track, pill caps, spring-filled.
 *
 * Over-100% values are visually capped but marked: the bar keeps its width and
 * a notch appears at the limit, so "exceeded" is legible without a second
 * element.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { clampProgressRatio } from '../../utils/calculations';
import { useReducedMotion } from '../../utils/motion';

export interface ProgressBarProps {
  /** 0..1 (values above 1 are visually capped, see `showOverflow`). */
  ratio: number;
  color?: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
  /** Marks the 100% position when the value overflows. */
  showOverflow?: boolean;
  /** Renders tick marks at 25/50/75%. */
  showTicks?: boolean;
}

export function ProgressBar({
  ratio,
  color,
  trackColor,
  height = 6,
  style,
  showOverflow = false,
  showTicks = false,
}: ProgressBarProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced ? clampProgressRatio(ratio) : 0)).current;
  const target = clampProgressRatio(ratio);
  const overflowing = showOverflow && ratio > 1;

  useEffect(() => {
    if (reduced) {
      progress.setValue(target);
      return;
    }
    Animated.timing(progress, {
      toValue: target,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, reduced, target]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }}
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: trackColor ?? theme.colors.chipTint },
        style,
      ]}
    >
      <Animated.View
        style={{
          width,
          height,
          borderRadius: height / 2,
          backgroundColor: color ?? theme.colors.primary,
        }}
      />

      {showTicks
        ? [0.25, 0.5, 0.75].map((tick) => (
            <View
              key={tick}
              style={{
                position: 'absolute',
                left: `${tick * 100}%`,
                top: 0,
                bottom: 0,
                width: StyleSheet.hairlineWidth,
                backgroundColor: theme.colors.borderStrong,
              }}
            />
          ))
        : null}

      {overflowing ? (
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: -2,
            bottom: -2,
            width: 2,
            borderRadius: 1,
            backgroundColor: theme.colors.text,
            opacity: 0.5,
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
  },
});

export default ProgressBar;
