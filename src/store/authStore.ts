/**
 * Auth store — offline demo mode.
 *
 * Accounts and a 30-day session live in AsyncStorage. Passwords are stretched
 * with a demo digest (see storage.service.ts) — swap this store for Supabase
 * Auth when a real backend is available.
 */
import { create } from 'zustand';
import type { MutationResult, User } from '../types';
import { createId, createSalt, hashPassword, loadSession, saveSession, clearSession, usersStorage, verifyPassword } from '../services/storage.service';
import { isValidISODate, todayISO } from '../utils/date';
import { validateLoginInput, validateRegisterInput } from '../utils/validation';
import { translate } from '../utils/constants';

interface AuthState {
  user: User | null;
  hydrated: boolean;
  isSubmitting: boolean;
  errorKey: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<MutationResult<User>>;
  register: (email: string, password: string, name: string) => Promise<MutationResult<User>>;
  logout: () => Promise<void>;
  /** Local-only account deletion (used by "Delete all data"). */
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

function errorMessage(key: string, language: 'id' | 'en' = 'id'): string {
  return translate(key as never, language);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  hydrated: false,
  isSubmitting: false,
  errorKey: null,

  hydrate: async () => {
    try {
      const session = await loadSession();
      if (!session) {
        set({ user: null, hydrated: true });
        return;
      }
      const users = await usersStorage.load();
      const user = users.find((item) => item.id === session.userId) ?? null;
      set({ user, hydrated: true });
    } catch {
      set({ user: null, hydrated: true });
    }
  },

  login: async (email, password) => {
    set({ isSubmitting: true, errorKey: null });
    try {
      const validation = validateLoginInput({ email, password });
      if (!validation.ok) {
        const [field] = Object.keys(validation.errors);
        const key = `error.${validation.errors[field as keyof typeof validation.errors]}`;
        set({ isSubmitting: false, errorKey: key });
        return { ok: false, error: errorMessage(key), errors: validation.errors };
      }

      const normalizedEmail = validation.value?.email ?? email.trim().toLowerCase();
      const credentials = await usersStorage.loadCredentials();
      const credential = credentials.find((item) => item.email === normalizedEmail);
      if (!credential || !verifyPassword(password, credential)) {
        const key = 'error.credentials_invalid';
        set({ isSubmitting: false, errorKey: key });
        return { ok: false, error: errorMessage(key) };
      }

      const users = await usersStorage.load();
      const user = users.find((item) => item.id === credential.userId);
      if (!user) {
        const key = 'error.user_not_found';
        set({ isSubmitting: false, errorKey: key });
        return { ok: false, error: errorMessage(key) };
      }

      await saveSession(user.id);
      set({ user, isSubmitting: false, errorKey: null });
      return { ok: true, data: user };
    } catch {
      const key = 'error.storage';
      set({ isSubmitting: false, errorKey: key });
      return { ok: false, error: errorMessage(key) };
    }
  },

  register: async (email, password, name) => {
    set({ isSubmitting: true, errorKey: null });
    try {
      const users = await usersStorage.load();
      const validation = validateRegisterInput(
        { name, email, password, confirmPassword: password },
        { wallets: [], targets: [], budgets: [], users },
      );

      if (!validation.ok) {
        const [field] = Object.keys(validation.errors);
        const key = `error.${validation.errors[field as keyof typeof validation.errors]}`;
        set({ isSubmitting: false, errorKey: key });
        return { ok: false, error: errorMessage(key), errors: validation.errors };
      }

      const normalizedEmail = validation.value?.email ?? email.trim().toLowerCase();
      const salt = createSalt();
      const user: User = {
        id: createId('user'),
        email: normalizedEmail,
        name: (name ?? '').trim(),
        createdAt: isValidISODate(todayISO()) ? todayISO() : todayISO(),
      };

      const credentials = await usersStorage.loadCredentials();
      await usersStorage.saveCredentials([
        ...credentials,
        { userId: user.id, email: normalizedEmail, salt, passwordHash: hashPassword(password, salt) },
      ]);
      await usersStorage.save([...users, user]);
      await saveSession(user.id);

      set({ user, isSubmitting: false, errorKey: null });
      return { ok: true, data: user };
    } catch {
      const key = 'error.storage';
      set({ isSubmitting: false, errorKey: key });
      return { ok: false, error: errorMessage(key) };
    }
  },

  logout: async () => {
    await clearSession();
    set({ user: null, errorKey: null });
  },

  deleteAccount: async () => {
    const user = get().user;
    if (!user) return;
    try {
      const users = await usersStorage.load();
      const credentials = await usersStorage.loadCredentials();
      await usersStorage.save(users.filter((item) => item.id !== user.id));
      await usersStorage.saveCredentials(credentials.filter((item) => item.userId !== user.id));
    } finally {
      await clearSession();
      set({ user: null, errorKey: null });
    }
  },

  clearError: () => set({ errorKey: null }),
}));

export const authActions = {
  login: (email: string, password: string) => useAuthStore.getState().login(email, password),
  logout: () => useAuthStore.getState().logout(),
};
