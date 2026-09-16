/**
 * Layout metrics that more than one screen needs.
 *
 * Bottom clearance used to be a per-screen magic number (120 here, 132 there,
 * 48 on the detail routes), which is exactly how content ends up hidden behind
 * the tab bar or the floating add button on one screen and not another. These
 * helpers replace those numbers with ONE derived source of truth:
 *
 *   - `useListBottomPadding()`        → scrollable tab screens: clears the FAB footprint
 *   - `useTabChromeHeight()`          → the tab bar's total footprint over the scene
 *   - `useFabBottomOffset()`          → where the FAB floats relative to the scene bottom
 *   - `useStackScreenBottomPadding()` → pushed detail screens: clears the home indicator
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Tab bar body height (icons + labels + pill indicator). Mirrors `(tabs)/_layout.tsx`. */
export const TAB_BAR_BODY_HEIGHT = 54;

/** Rendered FAB body height (`styles.button.height` in `ui/FAB.tsx`). */
export const FAB_SIZE = 54;

/** FAB lift above the element it floats over (tab bar / home indicator). Matches FAB's default `bottomOffset`. */
export const FAB_GAP = 24;

/** Extra air so content resting at max scroll never sits flush against the FAB's top edge. */
export const CONTENT_BREATHING_ROOM = 48;

/** Gap kept under pushed detail screens: home indicator + a little air. */
const STACK_CLEARANCE = 32;

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
 * The FAB's full protected footprint above the tab bar: gap + body. Content
 * resting at the end of a scroll must clear this entire zone, not just the
 * tab bar — this is the exclusion zone QA flagged on the dashboard.
 */
export function useFabFootprint(): number {
  return FAB_GAP + FAB_SIZE;
}

/**
 * Bottom padding for scrollable content on a tab screen.
 *
 * `hasFab: true` (default, screens with a contextual `<FAB />`):
 *
 *   tab bar body + safe-area inset   (navigation chrome)
 * + FAB gap + FAB height             (the FAB's full footprint)
 * + breathing room
 *
 * `hasFab: false` (read/overview screens like the Dashboard, which render no
 * floating overlay):
 *
 *   tab bar body + safe-area inset
 * + breathing room
 *
 * One centralized source of truth — screens never hand-compute padding.
 */
export function useListBottomPadding(
  options: { hasFab?: boolean; extra?: number } = {},
): number {
  const { hasFab = true, extra = 0 } = options;
  return (
    useTabChromeHeight() +
    (hasFab ? useFabFootprint() : 0) +
    CONTENT_BREATHING_ROOM +
    extra
  );
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
 * Bottom offset for a `<FAB />` on a tab screen: its lift plus the tab bar
 * footprint, so the button floats just above the bar on every device instead
 * of behind it. Derived from the same FAB_GAP the clearance formula uses, so
 * the FAB and the padding can never drift apart. Pair with
 * `useListBottomPadding()` on the same screen.
 */
export function useFabBottomOffset(extra = 0): number {
  return FAB_GAP + useTabChromeHeight() + extra;
}

/**
 * Bottom offset for a `<FAB />` on a pushed screen (no tab bar): the lift plus
 * the home-indicator inset, so the button clears the gesture bar.
 */
export function useStackFabBottomOffset(extra = 0): number {
  const insets = useSafeAreaInsets();
  return FAB_GAP + Math.max(insets.bottom, 8) + extra;
}
