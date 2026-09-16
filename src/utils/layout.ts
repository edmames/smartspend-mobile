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
 * Height of the tab bar body (labels + pill indicator), matching the value in
 * `app/(tabs)/_layout.tsx`. The bar's total footprint adds the device's bottom
 * safe-area inset — see `useTabChromeHeight()`.
 */
export const TAB_BAR_BODY_HEIGHT = 54;

/**
 * Total vertical space the tab bar occupies over the scene: its body plus the
 * safe-area inset it absorbs. The bar overlays the scene, so scroll content
 * and floating buttons have to clear this to stay visible.
 */
export function useTabChromeHeight(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_BODY_HEIGHT + Math.max(insets.bottom, 8);
}

/**
 * Bottom padding for scrollable content on a tab screen (with or without a
 * `<FAB />`): clears the tab bar, the floating add button and keeps breathing
 * room, so the last card/row always scrolls fully above both.
 */
export function useListBottomPadding(extra = 0): number {
  return useTabChromeHeight() + FLOATING_CLEARANCE + extra;
}

/**
 * Bottom padding for a pushed detail screen (no tab bar). Content must clear
 * the home indicator / gesture bar, which varies per device.
 */
export function useStackScreenBottomPadding(extra = 0): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 16) + STACK_CLEARANCE + extra;
}

/**
 * Bottom offset for a `<FAB />` on a tab screen: its default 24px lift plus the
 * tab bar footprint, so the button floats just above the bar on every device
 * instead of behind it. Pair with `useListBottomPadding()` on the same screen.
 */
export function useFabBottomOffset(extra = 0): number {
  return 24 + useTabChromeHeight() + extra;
}

/**
 * Bottom offset for a `<FAB />` on a pushed screen (no tab bar): the default
 * lift plus the home-indicator inset, so the button clears the gesture bar.
 */
export function useStackFabBottomOffset(extra = 0): number {
  const insets = useSafeAreaInsets();
  return 24 + Math.max(insets.bottom, 8) + extra;
}
