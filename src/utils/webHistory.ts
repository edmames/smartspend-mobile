/**
 * Web history hardening.
 *
 * `expo-router` (via React Navigation's web linking) updates the URL through
 * `history.pushState` / `history.replaceState` on every navigation. In a
 * document with an opaque origin — a sandboxed iframe such as
 * `<iframe sandbox="allow-scripts">`, used by the in-app preview — Chrome
 * rejects those calls with:
 *
 *   SecurityError: A history state object with URL '…' cannot be created in a
 *   document with origin 'null'
 *
 * The throw happens *after* React Navigation has already updated its own state,
 * so swallowing it keeps the app fully navigable (the address bar just stays
 * put). Without this guard, tapping "Masuk" / "Daftar" would appear to do
 * nothing at all inside such a frame.
 *
 * No-op on native platforms and on normal web origins.
 */
import { Platform } from 'react-native';

interface PatchableHistory {
  pushState?: unknown;
  replaceState?: unknown;
}

let installed = false;

/** Idempotent: safe to call from multiple entry points. */
export function installHistoryFallback(): void {
  if (installed || Platform.OS !== 'web') return;

  const scope = globalThis as unknown as { history?: PatchableHistory };
  const history = scope.history;
  if (!history) return;

  installed = true;

  const patch = (method: 'pushState' | 'replaceState'): void => {
    const original = history[method] as
      | (((...args: unknown[]) => unknown) & { __smartspendPatched?: boolean })
      | undefined;

    if (typeof original !== 'function' || original.__smartspendPatched) return;

    const patched = function patchedHistoryMethod(this: unknown, ...args: unknown[]): unknown {
      try {
        return original.apply(this, args);
      } catch {
        // Opaque-origin frame or a browser that blocks the call: navigation
        // state is React-owned, so skipping the URL sync is safe.
        return undefined;
      }
    };

    patched.__smartspendPatched = true;
    (history as Record<string, unknown>)[method] = patched;
  };

  patch('pushState');
  patch('replaceState');
}

export const webHistory = { installHistoryFallback };
