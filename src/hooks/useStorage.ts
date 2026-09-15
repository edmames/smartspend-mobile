/**
 * Storage / bootstrap hooks.
 *
 * `useBootstrap()` hydrates auth + every data store once at app start.
 * `useStorage()` exposes backup export, backup import (merge / replace) and the
 * "delete all data" reset used by the Settings screen.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BackupPayload, ImportMode, MutationResult, Settings, User } from '../types';
import {
  backupFileName,
  exporter,
  reportFileName,
  type BackupValidationResult,
} from '../services/export.service';
import { fileService } from '../services/file.service';
import { validateLedger } from '../services/ledger.service';
import {
  getStorageStatus,
  initialiseStorage,
  storage,
  subscribeStorageStatus,
  type StorageStatus,
} from '../services/storage.service';
import { resetSnapshot } from '../store/snapshot';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';
import { useTransactionStore } from '../store/transactionStore';
import { useSavingsStore } from '../store/savingsStore';
import { useBudgetStore } from '../store/budgetStore';
import { useSettingsStore, DEFAULT_SETTINGS } from '../store/settingsStore';
import { todayISO } from '../utils/date';

export interface BootstrapState {
  /** True once auth + settings are loaded (data stores may still be loading). */
  ready: boolean;
  /** True when every data store finished hydrating. */
  dataReady: boolean;
}

/** Hydrates the whole app. Called once from the root layout. */
export function useBootstrap(): BootstrapState {
  const user = useAuthStore((state) => state.user);
  const authHydrated = useAuthStore((state) => state.hydrated);
  const [ready, setReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);

  useEffect(() => {
    let active = true;
    (async () => {
      // Resolve the storage backend first (persistent, or the in-memory
      // fallback when the browser blocks local storage) so no read or write
      // happens against an unknown backend.
      await initialiseStorage();
      await hydrateSettings();
      await hydrateAuth();
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [hydrateAuth, hydrateSettings]);

  useEffect(() => {
    if (!ready) return;
    let active = true;

    (async () => {
      if (!user) {
        // Signed out: never leave another account's data on screen.
        resetSnapshot();
        useWalletStore.getState().reset();
        useTransactionStore.getState().reset();
        useSavingsStore.getState().reset();
        useBudgetStore.getState().reset();
        if (active) setDataReady(true);
        return;
      }

      setDataReady(false);
      await useWalletStore.getState().hydrate(user.id);
      await useTransactionStore.getState().hydrate(user.id);
      await useSavingsStore.getState().hydrate(user.id);
      await useBudgetStore.getState().hydrate(user.id);
      if (active) setDataReady(true);
    })();

    return () => {
      active = false;
    };
  }, [ready, user]);

  return { ready: ready && authHydrated, dataReady };
}

/** Re-hydrates every data store from AsyncStorage (pull-to-refresh). */
export function useRefreshAll(): () => Promise<void> {
  const user = useAuthStore((state) => state.user);
  return useCallback(async () => {
    if (!user) return;
    const started = Date.now();
    await Promise.all([
      useWalletStore.getState().hydrate(user.id),
      useTransactionStore.getState().hydrate(user.id),
      useSavingsStore.getState().hydrate(user.id),
      useBudgetStore.getState().hydrate(user.id),
    ]);
    // Keep the spinner visible long enough to feel deliberate on fast devices.
    const elapsed = Date.now() - started;
    if (elapsed < 350) await new Promise((resolve) => setTimeout(resolve, 350 - elapsed));
  }, [user]);
}

export interface StorageApi {
  /** Low-level AsyncStorage service. */
  service: typeof storage;
  /** `persistent` (device/browser storage) or `memory` (this session only). */
  status: StorageStatus;
  exportBackup: () => Promise<MutationResult<{ fileName: string }>>;
  pickBackup: () => Promise<MutationResult<BackupValidationResult>>;
  applyBackup: (
    payload: BackupPayload,
    mode: ImportMode,
  ) => Promise<MutationResult<{ warnings: string[] }>>;
  deleteAllData: () => Promise<void>;
}

export function useStorage(): StorageApi {
  const user = useAuthStore((state) => state.user);
  const settings = useSettingsStore((state) => state.settings);

  const exportBackup = useCallback(async (): Promise<MutationResult<{ fileName: string }>> => {
    if (!user) return { ok: false, error: 'error.user_not_found' };

    const payload = exporter.buildBackupPayload({
      user,
      wallets: useWalletStore.getState().wallets,
      transactions: useTransactionStore.getState().transactions,
      targets: useSavingsStore.getState().targets,
      budgets: useBudgetStore.getState().budgets,
      settings: settings ?? { ...DEFAULT_SETTINGS, userId: user.id },
    });

    const outcome = await fileService.exportBackupJSON(payload);
    if (!outcome.ok) return { ok: false, error: `error.${outcome.error}` };
    return { ok: true, data: { fileName: backupFileName() } };
  }, [settings, user]);

  const pickBackup = useCallback(() => fileService.importBackupFile(), []);

  /**
   * Applies a validated backup.
   *  - `replace`: the incoming ledger is validated on its own, then it becomes
   *    the whole dataset.
   *  - `merge`: incoming rows win on id collisions; budgets dedupe by
   *    category+month; the merged ledger is validated afterwards.
   */
  const applyBackup = useCallback(
    async (payload: BackupPayload, mode: ImportMode): Promise<MutationResult<{ warnings: string[] }>> => {
      const walletsStore = useWalletStore.getState();
      const transactionsStore = useTransactionStore.getState();
      const targetsStore = useSavingsStore.getState();
      const budgetsStore = useBudgetStore.getState();
      const settingsStore = useSettingsStore.getState();

      try {
        if (mode === 'replace') {
          const check = validateLedger(payload.transactions, payload.wallets, payload.savingsTargets);
          if (!check.valid) {
            return { ok: false, error: check.errors[0]?.detail ?? 'error.import_invalid' };
          }
          await walletsStore.setAll(payload.wallets);
          await targetsStore.setAll(payload.savingsTargets);
          await transactionsStore.setAll(payload.transactions);
          await budgetsStore.setAll(payload.budgets);
        } else {
          const nextWallets = exporter.mergeById(walletsStore.wallets, payload.wallets);
          const nextTargets = exporter.mergeById(targetsStore.targets, payload.savingsTargets);
          const nextTransactions = exporter.mergeById(transactionsStore.transactions, payload.transactions);
          const nextBudgets = exporter.mergeBudgets(budgetsStore.budgets, payload.budgets);

          const check = validateLedger(nextTransactions, nextWallets, nextTargets);
          if (!check.valid) {
            return { ok: false, error: check.errors[0]?.detail ?? 'error.negative_wallet_saldo' };
          }

          await walletsStore.setAll(nextWallets);
          await targetsStore.setAll(nextTargets);
          await transactionsStore.setAll(nextTransactions);
          await budgetsStore.setAll(nextBudgets);
        }

        if (payload.settings) {
          await settingsStore.setSettings({ ...(payload.settings as Settings), userId: user?.id ?? payload.settings.userId });
        }

        const validation = exporter.validateBackupPayload(payload);
        return { ok: true, data: { warnings: validation.warnings } };
      } catch {
        return { ok: false, error: 'error.storage' };
      }
    },
    [user],
  );

  const deleteAllData = useCallback(async () => {
    await storage.clearAllData();
    resetSnapshot();
    useTransactionStore.getState().reset();
    useWalletStore.getState().reset();
    useSavingsStore.getState().reset();
    useBudgetStore.getState().reset();
    useSettingsStore.getState().reset();
    await useSettingsStore.getState().hydrate();
  }, []);

  const storageStatus = useStorageStatus();

  return useMemo(
    () => ({
      service: storage,
      status: storageStatus,
      exportBackup,
      pickBackup,
      applyBackup,
      deleteAllData,
    }),
    [applyBackup, deleteAllData, exportBackup, pickBackup, storageStatus],
  );
}

/** Live storage-mode status (drives the "session-only" notices). */
export function useStorageStatus(): StorageStatus {
  const [storageStatus, setStorageStatus] = useState<StorageStatus>(() => getStorageStatus());
  useEffect(() => subscribeStorageStatus(setStorageStatus), []);
  return storageStatus;
}

/** Monthly report export (Reports screen). */
export function useReportExport() {
  const transactions = useTransactionStore((state) => state.transactions);
  return useCallback(
    async (monthYear: string): Promise<MutationResult<{ fileName: string }>> => {
      const outcome = await fileService.exportMonthlyReportJSON(transactions, monthYear);
      if (!outcome.ok) return { ok: false, error: `error.${outcome.error}` };
      return { ok: true, data: { fileName: reportFileName(monthYear) } };
    },
    [transactions],
  );
}

export { todayISO };
export type { User };
