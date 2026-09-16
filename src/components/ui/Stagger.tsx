/**
 * Stagger — entrance animation for list items.
 *
 * Wraps a row so it fades in and rises 8px, offset by `index * motion.stagger`
 * (50ms). Hooks live in this component rather than the caller's loop, and the
 * whole effect is skipped when the OS reports "reduce motion" or when
 * `index` reaches `maxAnimated` (a long list should not animate forever).
 */
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useEntrance } from '../../utils/motion';

export interface StaggerProps {
  /** Position in the list — drives the delay. */
  index: number;
  children: ReactNode;
  /** Only the first N items animate; the rest render immediately. */
  maxAnimated?: number;
}

export function Stagger({ index, children, maxAnimated = 8 }: StaggerProps) {
  if (index >= maxAnimated) return <View>{children}</View>;

  return <StaggerItem index={index}>{children}</StaggerItem>;
}

/** Split out so the hook is never called conditionally. */
function StaggerItem({ index, children }: { index: number; children: ReactNode }) {
  const entrance = useEntrance({ index, distance: 8 });

  return (
    <View style={entrance.style} onLayout={entrance.onLayout}>
      {children}
    </View>
  );
}

export default Stagger;
