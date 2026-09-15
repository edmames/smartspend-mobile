/**
 * AsyncStorage persistence layer.
 *
 * Every store talks to storage exclusively through this module, so swapping in
 * Supabase later only means adding a second implementation behind the same
 * function names (see README → "Supabase (optional)").
 *
 * ## Why there is a fallback backend
 *
 * `@react-native-async-storage/async-storage`'s web build reads
 * `window.localStorage` directly. In a browser context where storage is blocked
 * (private mode, storage partitioning, or a sandboxed iframe without
 * `allow-same-origin`, such as the in-app preview) that property access throws a
 * `SecurityError` — which used to make register/login fail with no data ever
 * being written.
 *
 * So the active backend is resolved once at startup:
 *   1. probe AsyncStorage with a throwaway key,
 *   2. keep it if the round trip works ("persistent"),
 *   3. otherwise fall back to an in-memory backend ("memory") and tell the UI,
 *      which shows a "session-only storage" notice instead of failing silently.
 *
 * The backend is also injectable (`configureStorageBackend`) so the auth and
 * ledger flows can be verified on Node without a browser.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AuthSession,
  Budget,
  ID,
  SavingsTarget,
  Settings,
  StoredCredential,
  Transaction,
  User,
  Wallet,
} from '../types';
import { STORAGE_KEYS } from '../utils/constants';

/* -------------------------------------------------------------------------- */
/*                                  Backend                                   */
/* -------------------------------------------------------------------------- */

export interface StorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
  /** `readonly` so AsyncStorage's own type satisfies this interface directly. */
  getAllKeys(): Promise<readonly string[]>;
}

/** Non-persistent backend used when device/browser storage is unavailable. */
export function createMemoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return {
    async getItem(key) {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
    async multiRemove(keys) {
      for (const key of keys) map.delete(key);
    },
    async getAllKeys() {
      return [...map.keys()];
    },
  };
}

export type StorageMode = 'persistent' | 'memory';

export type StorageFallbackReason =
  | 'storage_blocked'
  | 'storage_unavailable'
  | 'write_failed'
  | 'not_initialised';

export interface StorageStatus {
  mode: StorageMode;
  /** Why the memory fallback is active (null while persistent). */
  reason: StorageFallbackReason | null;
}

const PROBE_KEY = `${STORAGE_KEYS.users}/__probe`;

let backend: StorageBackend = createMemoryBackend();
let status: StorageStatus = { mode: 'memory', reason: 'not_initialised' };
let initPromise: Promise<StorageStatus> | null = null;

const listeners = new Set<(status: StorageStatus) => void>();

/** Installs a backend (used by the startup probe and by tests). */
export function configureStorageBackend(next: StorageBackend, nextStatus: StorageStatus): StorageStatus {
  backend = next;
  status = nextStatus;
  for (const listener of listeners) listener(status);
  return status;
}

export function getStorageStatus(): StorageStatus {
  return status;
}

/** Subscribe to storage-mode changes (used by `useStorageStatus`). */
export function subscribeStorageStatus(listener: (status: StorageStatus) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isSecurityError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const name = (error as { name?: string }).name ?? '';
  const message = (error as { message?: string }).message ?? '';
  return (
    name === 'SecurityError' ||
    /insecure|denied|blocked|not allowed|sandbox/i.test(message)
  );
}

/**
 * Resolves the active backend once per app launch.
 * Safe to call repeatedly — the probe only runs the first time.
 */
export function initialiseStorage(): Promise<StorageStatus> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await AsyncStorage.setItem(PROBE_KEY, 'ok');
      const roundTrip = await AsyncStorage.getItem(PROBE_KEY);
      await AsyncStorage.removeItem(PROBE_KEY);

      if (roundTrip === 'ok') {
        return configureStorageBackend(AsyncStorage, { mode: 'persistent', reason: null });
      }
      return configureStorageBackend(createMemoryBackend(), {
        mode: 'memory',
        reason: 'storage_unavailable',
      });
    } catch (error) {
      return configureStorageBackend(createMemoryBackend(), {
        mode: 'memory',
        reason: isSecurityError(error) ? 'storage_blocked' : 'storage_unavailable',
      });
    }
  })();

  return initPromise;
}

/**
 * A persistent write can still fail mid-session (quota exceeded, permissions
 * revoked). When that happens we degrade to memory instead of losing the
 * user's action.
 */
function degradeToMemory(reason: StorageFallbackReason): void {
  if (status.mode === 'memory') return;
  configureStorageBackend(createMemoryBackend(), { mode: 'memory', reason });
}

/** Test helper: forces a backend without running the probe. */
export function __setStorageBackendForTests(next: StorageBackend, nextStatus: StorageStatus): void {
  initPromise = Promise.resolve(configureStorageBackend(next, nextStatus));
}

/* -------------------------------------------------------------------------- */
/*                              Primitive helpers                             */
/* -------------------------------------------------------------------------- */

async function readRaw(key: string): Promise<string | null> {
  try {
    return await backend.getItem(key);
  } catch {
    degradeToMemory('storage_unavailable');
    return null;
  }
}

async function writeRaw(key: string, value: string): Promise<void> {
  try {
    await backend.setItem(key, value);
  } catch {
    // Keep the app usable: mirror into memory and report the downgrade.
    degradeToMemory('write_failed');
    await backend.setItem(key, value);
  }
}

async function removeRaw(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await backend.multiRemove(keys);
  } catch {
    degradeToMemory('storage_unavailable');
    for (const key of keys) {
      try {
        await backend.removeItem(key);
      } catch {
        // Nothing else we can do — the key simply stays in the failed backend.
      }
    }
  }
}

export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await readRaw(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupted payloads must never crash the app — fall back and move on.
    return fallback;
  }
}

export async function writeJSON<T>(key: string, value: T): Promise<void> {
  await writeRaw(key, JSON.stringify(value));
}

export async function removeKeys(keys: string[]): Promise<void> {
  await removeRaw(keys);
}

export async function readCollection<T>(key: string): Promise<T[]> {
  const value = await readJSON<unknown>(key, []);
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function writeCollection<T>(key: string, items: T[]): Promise<void> {
  await writeJSON(key, items);
}

/** Namespaced key helper for ad-hoc values. */
export function scopedKey(suffix: string): string {
  return `${STORAGE_KEYS.transactions.split('/')[0]}/${suffix}`;
}

/** Reads every domain collection in a single round trip. */
export async function readAppData(): Promise<{
  wallets: Wallet[];
  transactions: Transaction[];
  targets: SavingsTarget[];
  budgets: Budget[];
  users: User[];
  credentials: StoredCredential[];
}> {
  const [wallets, transactions, targets, budgets, users, credentials] = await Promise.all([
    readCollection<Wallet>(STORAGE_KEYS.wallets),
    readCollection<Transaction>(STORAGE_KEYS.transactions),
    readCollection<SavingsTarget>(STORAGE_KEYS.savingsTargets),
    readCollection<Budget>(STORAGE_KEYS.budgets),
    readCollection<User>(STORAGE_KEYS.users),
    readCollection<StoredCredential>(STORAGE_KEYS.credentials),
  ]);
  return { wallets, transactions, targets, budgets, users, credentials };
}

/** Removes every SmartSpend key (used by "Delete all data"). */
export async function clearAllData(): Promise<void> {
  await removeKeys(Object.values(STORAGE_KEYS));
}

/* -------------------------------------------------------------------------- */
/*                                   IDs                                      */
/* -------------------------------------------------------------------------- */

export function createId(prefix: string): ID {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}${random}`;
}

/* -------------------------------------------------------------------------- */
/*                            Auth (demo mode only)                           */
/* -------------------------------------------------------------------------- */

export function createSalt(): string {
  return `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/**
 * Demo-only password digest (FNV-1a based key stretching over 200 rounds).
 *
 * This keeps plaintext passwords out of storage for the offline demo, but it is
 * NOT production cryptography. Real deployments must use Supabase Auth
 * (bcrypt/scrypt server side) instead — see README.
 */
export function hashPassword(password: string, salt: string): string {
  let hash = 0x811c9dc5;
  const seed = `${salt}:${password}:smartspend`;
  for (let round = 0; round < 200; round += 1) {
    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index) + round;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return hash.toString(36);
}

export function verifyPassword(password: string, credential: StoredCredential): boolean {
  return hashPassword(password, credential.salt) === credential.passwordHash;
}

/* -------------------------------------------------------------------------- */
/*                                  Session                                   */
/* -------------------------------------------------------------------------- */

const SESSION_TTL_DAYS = 30;

export async function saveSession(userId: ID): Promise<AuthSession> {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const session: AuthSession = {
    userId,
    email: '',
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  await writeJSON(STORAGE_KEYS.session, session);
  return session;
}

export async function loadSession(): Promise<AuthSession | null> {
  const session = await readJSON<AuthSession | null>(STORAGE_KEYS.session, null);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await removeKeys([STORAGE_KEYS.session]);
    return null;
  }
  return session;
}

export async function clearSession(): Promise<void> {
  await removeKeys([STORAGE_KEYS.session]);
}

/* -------------------------------------------------------------------------- */
/*                              Typed collections                             */
/* -------------------------------------------------------------------------- */

export const storage = {
  readJSON,
  writeJSON,
  removeKeys,
  readCollection,
  writeCollection,
  readAppData,
  clearAllData,
  createId,
  createSalt,
  hashPassword,
  verifyPassword,
  saveSession,
  loadSession,
  clearSession,
  getStorageStatus,
  initialiseStorage,
  subscribeStorageStatus,
  keys: STORAGE_KEYS,
};

export type StorageService = typeof storage;

export const walletsStorage = {
  load: () => readCollection<Wallet>(STORAGE_KEYS.wallets),
  save: (items: Wallet[]) => writeCollection(STORAGE_KEYS.wallets, items),
};

export const transactionsStorage = {
  load: () => readCollection<Transaction>(STORAGE_KEYS.transactions),
  save: (items: Transaction[]) => writeCollection(STORAGE_KEYS.transactions, items),
};

export const savingsStorage = {
  load: () => readCollection<SavingsTarget>(STORAGE_KEYS.savingsTargets),
  save: (items: SavingsTarget[]) => writeCollection(STORAGE_KEYS.savingsTargets, items),
};

export const budgetsStorage = {
  load: () => readCollection<Budget>(STORAGE_KEYS.budgets),
  save: (items: Budget[]) => writeCollection(STORAGE_KEYS.budgets, items),
};

export const usersStorage = {
  load: () => readCollection<User>(STORAGE_KEYS.users),
  save: (items: User[]) => writeCollection(STORAGE_KEYS.users, items),
  loadCredentials: () => readCollection<StoredCredential>(STORAGE_KEYS.credentials),
  saveCredentials: (items: StoredCredential[]) => writeCollection(STORAGE_KEYS.credentials, items),
};

export const settingsStorage = {
  load: (fallback: Settings) => readJSON<Settings>(STORAGE_KEYS.settings, fallback),
  save: (settings: Settings) => writeJSON(STORAGE_KEYS.settings, settings),
};

/** Used by the report/backup exporters to know the active account. */
export async function loadActiveUser(): Promise<User | null> {
  const session = await loadSession();
  if (!session) return null;
  const users = await usersStorage.load();
  return users.find((user) => user.id === session.userId) ?? null;
}
