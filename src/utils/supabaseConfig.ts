/**
 * Pure Supabase configuration helpers.
 *
 * Deliberately free of `react-native` / AsyncStorage imports so it can run in
 * plain Node (the verify script) as well as in the app bundle. The client
 * itself lives in `src/services/supabase.service.ts`.
 */

/** Minimal shape of the env we read, so it can be tested without a bundler. */
export type SupabaseEnv = {
  url?: string;
  anonKey?: string;
};

export type SupabaseStatus =
  | { configured: false; reason: 'missing_url' | 'missing_key' | 'invalid_url' | 'placeholder' }
  | { configured: true; projectRef: string; maskedKey: string; url: string };

export type ConnectionResult =
  | { ok: true; latencyMs: number }
  | { ok: false; code: 'network' | 'unauthorized' | 'server' | 'not_configured'; detail?: string };

const PLACEHOLDER_VALUES = new Set([
  '',
  'undefined',
  'null',
  'your-anon-key',
  '<anon-key>',
  'https://<project-ref>.supabase.co',
  'https://<PROJECT-REF>.supabase.co',
]);

/** Reads the public env vars. `process.env` is inlined by Expo at build time. */
export function readSupabaseEnv(): SupabaseEnv {
  return {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };
}

/** Rejects obviously invalid / placeholder values so the UI can say why. */
export function parseSupabaseEnv(env: SupabaseEnv): SupabaseStatus {
  const rawUrl = (env.url ?? '').trim();
  const rawKey = (env.anonKey ?? '').trim();

  if (!rawUrl || PLACEHOLDER_VALUES.has(rawUrl)) return { configured: false, reason: 'missing_url' };
  if (!rawKey || PLACEHOLDER_VALUES.has(rawKey)) return { configured: false, reason: 'missing_key' };

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { configured: false, reason: 'invalid_url' };
  }
  if (parsed.protocol !== 'https:') return { configured: false, reason: 'invalid_url' };
  // Guard against pasting the REST path (…/rest/v1) instead of the project root.
  if (/\/(rest|auth|storage)\/v?1/.test(parsed.pathname)) {
    return { configured: false, reason: 'invalid_url' };
  }

  const projectRef = projectRefOf(rawUrl);
  if (!projectRef) return { configured: false, reason: 'placeholder' };

  return { configured: true, projectRef, maskedKey: maskAnonKey(rawKey), url: normalizedBaseUrl(rawUrl) };
}

/** `https://abcd.supabase.co` → `abcd`; custom domains fall back to the host. */
export function projectRefOf(url: string): string {
  try {
    const host = new URL(url).hostname;
    const match = host.match(/^([a-z0-9-]+)\.supabase\.(co|in)$/i);
    if (match) return match[1];
    return host;
  } catch {
    return '';
  }
}

/** Drops trailing slashes so `${url}/auth/v1/...` never doubles up. */
export function normalizedBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** Never render a full anon key in the UI: `eyJhbG…9fQ2` style. */
export function maskAnonKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 12) return '••••';
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
}

/** Health endpoint is public; a 200 means the project exists and is reachable. */
export function healthUrlFor(baseUrl: string): string {
  return `${normalizedBaseUrl(baseUrl)}/auth/v1/health`;
}

export function isSupabaseConfigured(env: SupabaseEnv = readSupabaseEnv()): boolean {
  return parseSupabaseEnv(env).configured;
}
