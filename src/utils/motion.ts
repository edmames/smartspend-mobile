/**
 * Motion helpers.
 *
 * The feel we want: motion that is *felt, not seen*. Short durations, soft
 * easing, springs on interaction — and a hard opt-out whenever the OS reports
 * "reduce motion" or the value is the first paint of a screen.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * `Animated` styles are structurally compatible with `ViewStyle` at runtime, but
 * RN's types narrow `transform`/`backfaceVisibility` to non-animated values.
 * `AnimatedStyle` documents that intentional looseness in one place.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnimatedStyle = any;
import { motion } from '../styles/theme';

/* -------------------------------------------------------------------------- */
/*                              Reduce motion                                  */
/* -------------------------------------------------------------------------- */

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      if (active) setReduced(value);
    });

    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, []);

  return reduced;
}

/* -------------------------------------------------------------------------- */
/*                                Press scale                                  */
/* -------------------------------------------------------------------------- */

export interface PressHandlers {
  onPressIn: (event: GestureResponderEvent) => void;
  onPressOut: (event: GestureResponderEvent) => void;
}

/**
 * Spring-based press feedback. Returns the animated style plus the handlers to
 * spread onto a `Pressable`.
 */
export function usePressScale(scaleTo: number = motion.pressScale): {
  style: AnimatedStyle;
  handlers: PressHandlers;
} {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(1)).current;

  const animate = useCallback(
    (toValue: number) => {
      if (reduced) return;
      Animated.spring(value, {
        toValue,
        useNativeDriver: true,
        friction: 9,
        tension: 220,
      }).start();
    },
    [reduced, value],
  );

  return {
    style: { transform: [{ scale: value }] },
    handlers: {
      onPressIn: () => animate(scaleTo),
      onPressOut: () => animate(1),
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                               Count up                                      */
/* -------------------------------------------------------------------------- */

/**
 * Animates a number towards `target` (used for money hero figures).
 * Returns the target immediately when motion is reduced.
 */
export function useCountUp(
  target: number,
  options: { duration?: number; enabled?: boolean } = {},
): number {
  const { duration = motion.countUp, enabled = true } = options;
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(() => (enabled && !reduced ? 0 : target));
  const animated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled || reduced) {
      setDisplay(target);
      return;
    }

    let lastRendered = -1;
    const listenerId = animated.addListener(({ value }) => {
      const rounded = Math.round(value);
      if (rounded !== lastRendered) {
        lastRendered = rounded;
        setDisplay(rounded);
      }
    });

    animated.setValue(0);
    const animation = Animated.timing(animated, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) setDisplay(target);
    });

    return () => {
      animation.stop();
      animated.removeListener(listenerId);
    };
  }, [animated, duration, enabled, reduced, target]);

  return display;
}

/* -------------------------------------------------------------------------- */
/*                                  Entrance                                   */
/* -------------------------------------------------------------------------- */

export interface EntranceStyle {
  opacity: Animated.AnimatedInterpolation<number> | Animated.Value;
  transform: { translateY: Animated.AnimatedInterpolation<number> | Animated.Value }[];
}

/**
 * Staggered fade + rise, used sparingly (hero + first section of a screen).
 * Pass `index` to derive the delay from the shared `motion.stagger`.
 */
export function useEntrance(options: { index?: number; delay?: number; distance?: number } = {}): {
  style: EntranceStyle;
  onLayout: () => void;
} {
  const { index = 0, delay, distance = 10 } = options;
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const started = useRef(false);

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    if (reduced) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: motion.slow,
      delay: delay ?? index * motion.stagger,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delay, index, progress, reduced]);

  useEffect(() => {
    start();
  }, [start]);

  return {
    style: {
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }),
        },
      ],
    },
    onLayout: start,
  };
}

/**
 * Horizontal shake for rejected input. Fires whenever `trigger` changes to a
 * new truthy value (typically an error message), and stays still on first
 * render so a pre-filled error does not animate on mount.
 */
export function useShake(trigger: unknown, options: { distance?: number } = {}): AnimatedStyle {
  const { distance = 4 } = options;
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (!trigger || reduced) return;

    value.setValue(0);
    const step = (toValue: number, duration: number) =>
      Animated.timing(value, { toValue, duration, easing: Easing.linear, useNativeDriver: true });

    Animated.sequence([
      step(-distance, 60),
      step(distance, 60),
      step(-distance / 2, 60),
      step(0, 80),
    ]).start();
  }, [distance, reduced, trigger, value]);

  return { transform: [{ translateX: value }] };
}

/** Bar widths / row flashes: a short eased tween on a plain style value. */
export function useTweenStyle(target: number, styleProp: 'opacity' | 'width'): StyleProp<ViewStyle> {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(target)).current;

  useEffect(() => {
    if (reduced) {
      value.setValue(target);
      return;
    }
    Animated.timing(value, {
      toValue: target,
      duration: motion.normal,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [reduced, target, value]);

  return styleProp === 'opacity' ? { opacity: value } : { width: value as unknown as number };
}
