/**
 * Layout metrics that more than one screen needs.
 *
 * Bottom clearance used to be a per-screen magic number (120 here, 132 there,
 * 48 on the detail routes), which is exactly how content ends up hidden behind
 * the tab bar or the floating add button on one screen and not another. These
 * two helpers replace those numbers:
 *
 *   - `useListBottomPadding()`       → scrollable screens: clears the floating add button
 *   - `useStackScreenBottomPadding()` → pushed detail screens: clears the home indicator
 *
 * The tab bar itself needs no arithmetic: the navigator lays it out in normal
 * flow (`flexDirection: 'column'`, scenes `flex: 1`), so it reserves its own
 * space and the scene above it is already inset. What content actually has to
 * clear is the floating add button, which is absolutely positioned over the
 * scene at `bottom: 24`.
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Vertical room the floating add button needs: its 56px body, its 24px offset,
 * plus breathing room so the last row is never sitting under it.
 */
export const FLOATING_CLEARANCE = 120;

/** Gap kept under pushed detail screens: home indicator + a little air. */
const STACK_CLEARANCE = 32;

/**
 * Bottom padding for scrollable content on a screen that renders the tab bar
 * and/or a `<FAB />`. Pass `extra` when something else sits at the bottom edge.
 */
export function useListBottomPadding(extra = 0): number {
  return FLOATING_CLEARANCE + extra;
}

/**
 * Bottom padding for a pushed detail screen (no tab bar). Content must clear
 * the home indicator / gesture bar, which varies per device.
 */
export function useStackScreenBottomPadding(extra = 0): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 16) + STACK_CLEARANCE + extra;
}
