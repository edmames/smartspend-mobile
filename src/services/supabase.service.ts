/**
 * Supabase plumbing — optional cloud layer.
 *
 * The app is offline-first: nothing here runs unless the two public env vars are
 * present. When they are missing, `isSupabaseConfigured()` is false, the client is
 * never created and the UI shows an explicit "belum dikonfigurasi" state instead
 * of failing silently.
 *
 * Env vars (see `.env.example` and `docs/SUPABASE-SETUP.md`):
 *   EXPO_PUBLIC_SUPABASE_URL       https://<project-ref>.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY  the public anon key (safe to ship *with RLS on*)
 *
 * The service-role key must NEVER be used here — this code runs on the client.
 * Pure config helpers live in `src/utils/supabaseConfig.ts` so they stay testable.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  healthUrlFor,
  parseSupabaseEnv,
  readSupabaseEnv,
  type ConnectionResult,
  type SupabaseEnv,
} from '../utils/supabaseConfig';

export {
  healthUrlFor,
  isSupabaseConfigured,
  maskAnonKey,
  normalizedBaseUrl,
  parseSupabaseEnv,
  projectRefOf,
  readSupabaseEnv,
} from '../utils/supabaseConfig';
export type { ConnectionResult, SupabaseEnv, SupabaseStatus } from '../utils/supabaseConfig';

/**
 * One-shot reachability check used by Settings → "Uji koneksi".
 * Deliberately dependency-light: plain fetch + timeout, no session required.
 */
export async function testSupabaseConnection(
  env: SupabaseEnv = readSupabaseEnv(),
  timeoutMs = 8000,
): Promise<ConnectionResult> {
  const status = parseSupabaseEnv(env);
  if (!status.configured) return { ok: false, code: 'not_configured' };

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const startedAt = Date.now();

  try {
    const response = await fetch(healthUrlFor(status.url), {
      method: 'GET',
      headers: { apikey: (env.anonKey ?? '').trim() },
      signal: controller ? controller.signal : undefined,
    });
    const latencyMs = Date.now() - startedAt;

    if (response.ok) return { ok: true, latencyMs };
    if (response.status === 401 || response.status === 403) {
      return { ok: false, code: 'unauthorized', detail: String(response.status) };
    }
    return { ok: false, code: 'server', detail: String(response.status) };
  } catch (error) {
    return { ok: false, code: 'network', detail: error instanceof Error ? error.name : 'unknown' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/* -------------------------------------------------------------------------- */
/*                                   client                                   */
/* -------------------------------------------------------------------------- */

type SupabaseClientLike = import('@supabase/supabase-js').SupabaseClient;
let cachedClient: SupabaseClientLike | null = null;

/** Storage adapter that survives blocked-storage iframes (never throws). */
const safeStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      /* blocked storage — the session simply won't persist */
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

/**
 * Returns a memoised client, or null when the env vars are absent.
 * Native builds need the URL polyfill; web already provides one.
 */
export function getSupabaseClient(env: SupabaseEnv = readSupabaseEnv()): SupabaseClientLike | null {
  if (cachedClient) return cachedClient;
  const status = parseSupabaseEnv(env);
  if (!status.configured) return null;

  if (Platform.OS !== 'web') {
    require('react-native-url-polyfill/auto');
  }

  const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
  cachedClient = createClient(status.url, (env.anonKey ?? '').trim(), {
    auth: {
      storage: safeStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Web needs the redirect parsing for the Google OAuth flow; native must not.
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
  });
  return cachedClient;
}

/** Test seam: forgets the memoised client. */
export function resetSupabaseClient(): void {
  cachedClient = null;
}
