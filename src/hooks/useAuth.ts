/**
 * Auth hook — wraps the auth store with navigation-friendly helpers.
 */
import { useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import type { MutationResult, User } from '../types';
import { useAuthStore } from '../store/authStore';

export interface AuthApi {
  user: User | null;
  hydrated: boolean;
  isSubmitting: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<MutationResult<User>>;
  register: (email: string, password: string, name: string) => Promise<MutationResult<User>>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): AuthApi {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const errorKey = useAuthStore((state) => state.errorKey);
  const loginAction = useAuthStore((state) => state.login);
  const registerAction = useAuthStore((state) => state.register);
  const logoutAction = useAuthStore((state) => state.logout);
  const deleteAccountAction = useAuthStore((state) => state.deleteAccount);
  const clearError = useAuthStore((state) => state.clearError);

  return useMemo(
    () => ({
      user,
      hydrated,
      isSubmitting,
      error: errorKey,
      isAuthenticated: Boolean(user),
      login: loginAction,
      register: registerAction,
      logout: logoutAction,
      deleteAccount: deleteAccountAction,
      clearError,
    }),
    [clearError, deleteAccountAction, errorKey, hydrated, isSubmitting, loginAction, logoutAction, registerAction, user],
  );
}

/** Login + navigate into the app. */
export function useLoginFlow() {
  const { login, register } = useAuth();

  const submitLogin = useCallback(
    async (email: string, password: string) => {
      const result = await login(email, password);
      if (result.ok) router.replace('/(tabs)');
      return result;
    },
    [login],
  );

  const submitRegister = useCallback(
    async (email: string, password: string, name: string) => {
      const result = await register(email, password, name);
      if (result.ok) router.replace('/(tabs)');
      return result;
    },
    [register],
  );

  return { submitLogin, submitRegister };
}

/** Logout + navigate back to the auth stack. */
export function useLogoutFlow() {
  const { logout } = useAuth();
  return useCallback(async () => {
    await logout();
    router.replace('/(auth)/login');
  }, [logout]);
}
