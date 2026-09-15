/**
 * Settings — grouped rows: account, appearance, data, integrations, about.
 * Destructive actions are confirmed; storage mode is surfaced honestly.
 */
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/store/authStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useStorage } from '../../src/hooks/useStorage';
import {
  isSupabaseConfigured,
  maskAnonKey,
  parseSupabaseEnv,
  readSupabaseEnv,
  type ConnectionResult,
} from '../../src/utils/supabaseConfig';
import { testSupabaseConnection } from '../../src/services/supabase.service';
import type { BackupPayload } from '../../src/types';
import { AppText } from '../../src/components/ui/AppText';
import { Card, Divider, SectionHeader } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { AppModal } from '../../src/components/ui/Modal';
import { Icon } from '../../src/components/ui/Icon';
import { Input } from '../../src/components/ui/Input';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { SettingRow } from '../../src/components/ui/SettingRow';
import { StorageNotice } from '../../src/components/ui/StorageNotice';
import { useToast } from '../../src/components/ui/Toast';
import { APP_VERSION, LANGUAGES, LANGUAGE_LABELS } from '../../src/utils/constants';
import type { ImportMode, Language, ThemeMode } from '../../src/types';

export default function SettingsScreen() {
  const theme = useTheme();
  const t = useT();
  const toast = useToast();

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const settings = useSettingsStore((state) => state.settings);
  const updateTheme = useSettingsStore((state) => state.updateTheme);
  const updateLanguage = useSettingsStore((state) => state.updateLanguage);
  const updateTelegram = useSettingsStore((state) => state.updateTelegram);
  const { status, exportBackup, pickBackup, applyBackup, deleteAllData } = useStorage();

  /* ------------------------------- Supabase ------------------------------- */
  const supabaseEnv = readSupabaseEnv();
  const supabaseStatus = parseSupabaseEnv(supabaseEnv);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudResult, setCloudResult] = useState<ConnectionResult | null>(null);

  const cloudSubtitle = supabaseStatus.configured
    ? `${t('settings.cloud_project')}: ${supabaseStatus.projectRef} · ${maskAnonKey(supabaseEnv.anonKey ?? '')}`
    : t(`settings.cloud_${supabaseStatus.reason}` as never);

  const handleTestCloud = useCallback(async () => {
    setCloudBusy(true);
    setCloudResult(null);
    const result = await testSupabaseConnection(supabaseEnv);
    setCloudResult(result);
    setCloudBusy(false);
    if (result.ok) toast.success(`${t('settings.cloud_ok')} · ${result.latencyMs} ms`);
    else
      toast.error(
        t(
          (result.code === 'network'
            ? 'settings.cloud_fail_network'
            : result.code === 'unauthorized'
              ? 'settings.cloud_fail_auth'
              : result.code === 'server'
                ? 'settings.cloud_fail_server'
                : 'settings.cloud_hint') as never,
        ),
      );
  }, [supabaseEnv, t, toast]);

  const [busy, setBusy] = useState<'export' | 'import' | 'delete' | null>(null);
  const [pendingBackup, setPendingBackup] = useState<BackupPayload | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [pwaOpen, setPwaOpen] = useState(false);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState(settings.telegramChatId ?? '');

  const themeOptions = useMemo(
    () => [
      { value: 'dark' as ThemeMode, label: t('settings.theme.dark') },
      { value: 'light' as ThemeMode, label: t('settings.theme.light') },
      { value: 'system' as ThemeMode, label: t('settings.theme.system') },
    ],
    [t],
  );

  const languageOptions = useMemo(
    () => LANGUAGES.map((code: Language) => ({ value: code, label: LANGUAGE_LABELS[code] })),
    [],
  );

  const handleExport = useCallback(async () => {
    setBusy('export');
    const result = await exportBackup();
    setBusy(null);
    if (result.ok) toast.success(`${t('settings.export_success')} · ${result.data.fileName}`);
    else toast.error(t('settings.import_invalid'));
  }, [exportBackup, t, toast]);

  const handleImport = useCallback(async () => {
    const result = await pickBackup();
    if (!result.ok) {
      if (result.error) toast.error(t('settings.import_invalid'));
      return;
    }
    if (!result.data.ok || !result.data.payload) {
      toast.error(result.data.error ?? t('settings.import_invalid'));
      return;
    }
    setPendingBackup(result.data.payload);
  }, [pickBackup, t, toast]);

  const applyImport = useCallback(
    async (mode: ImportMode) => {
      const payload = pendingBackup;
      setPendingBackup(null);
      if (!payload) return;
      setBusy('import');
      const result = await applyBackup(payload, mode);
      setBusy(null);
      result.ok ? toast.success(t('settings.import_success')) : toast.error(result.error);
    },
    [applyBackup, pendingBackup, t, toast],
  );

  const handleDeleteAll = useCallback(async () => {
    setBusy('delete');
    await deleteAllData();
    setBusy(null);
    setDeleteOpen(false);
    toast.success(t('settings.deleted'));
  }, [deleteAllData, t, toast]);

  const handleSaveTelegram = useCallback(async () => {
    await updateTelegram(true, telegramChatId);
    setTelegramOpen(false);
    toast.success(t('settings.telegram_saved'));
  }, [telegramChatId, t, toast, updateTelegram]);

  const storageKey =
    status.mode === 'persistent' ? t('settings.storage_mode_local') : t('settings.storage_mode_memory');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.screen,
          paddingTop: theme.spacing.sm,
          paddingBottom: 132,
        }}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="title">{t('settings.title')}</AppText>

        {/* Account */}
        <SectionHeader title={t('settings.account')} />
        <Card padded={false} style={{ paddingHorizontal: theme.spacing.card }}>
          <View style={styles.profile}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.accentSoft, borderWidth: 1, borderColor: theme.colors.border }]}>
              <Icon name="person" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="body" weight="semibold" numberOfLines={1}>
                {user?.name ?? '—'}
              </AppText>
              <AppText variant="caption" tone="muted" numberOfLines={1}>
                {user?.email ?? '—'}
              </AppText>
            </View>
          </View>
        </Card>

        {/* Appearance */}
        <SectionHeader title={t('settings.appearance')} />
        <Card>
          <AppText variant="micro" tone="faint" style={{ marginBottom: theme.spacing.sm }}>
            {t('settings.theme').toUpperCase()}
          </AppText>
          <SegmentedControl options={themeOptions} value={settings.theme} onChange={updateTheme} size="sm" />

          <AppText variant="micro" tone="faint" style={{ marginVertical: theme.spacing.sm }}>
            {t('settings.language').toUpperCase()}
          </AppText>
          <SegmentedControl options={languageOptions} value={settings.language} onChange={updateLanguage} size="sm" />
        </Card>

        <Card padded={false} style={{ marginTop: theme.spacing.sm, paddingHorizontal: theme.spacing.card }}>
          <SettingRow
            icon="server-outline"
            title={t('settings.storage_mode')}
            subtitle={storageKey}
            destructive={false}
            right={
              <View style={styles.statusPill}>
                <Icon
                  name={status.mode === 'persistent' ? 'lock-closed-outline' : 'alert-circle-outline'}
                  size={12}
                  color={status.mode === 'persistent' ? theme.colors.success : theme.colors.warning}
                />
              </View>
            }
          />
          <SettingRow
            icon="cloud-outline"
            title={t('settings.cloud')}
            subtitle={cloudSubtitle}
            last
            onPress={isSupabaseConfigured(supabaseEnv) ? handleTestCloud : undefined}
            right={
              cloudBusy ? (
                <AppText variant="caption" tone="muted">
                  {t('settings.cloud_testing')}
                </AppText>
              ) : (
                <View style={styles.statusPill}>
                  <Icon
                    name={
                      supabaseStatus.configured
                        ? cloudResult && !cloudResult.ok
                          ? 'alert-circle-outline'
                          : 'checkmark-circle-outline'
                        : 'ellipse-outline'
                    }
                    size={12}
                    color={
                      supabaseStatus.configured
                        ? cloudResult && !cloudResult.ok
                          ? theme.colors.danger
                          : theme.colors.success
                        : theme.colors.textFaint
                    }
                  />
                </View>
              )
            }
          />
        </Card>

        {!supabaseStatus.configured ? (
          <AppText variant="caption" tone="faint" style={{ marginTop: theme.spacing.sm }}>
            {t('settings.cloud_hint')}
          </AppText>
        ) : null}

        <View style={{ marginTop: theme.spacing.sm }}>
          <StorageNotice />
        </View>

        {/* Data */}
        <SectionHeader title={t('settings.data')} />
        <Card padded={false} style={{ paddingHorizontal: theme.spacing.card }}>
          <SettingRow
            icon="cloud-download-outline"
            title={t('settings.export_data')}
            subtitle={t('settings.import_merge_desc')}
            onPress={handleExport}
            right={busy === 'export' ? <AppText variant="caption" tone="muted">{t('common.loading')}</AppText> : undefined}
          />
          <SettingRow
            icon="cloud-upload-outline"
            title={t('settings.import_data')}
            subtitle={t('settings.import_replace_desc')}
            onPress={handleImport}
            last
          />
        </Card>

        {/* Danger zone */}
        <SectionHeader title={t('settings.danger')} />
        <Card padded={false} style={{ paddingHorizontal: theme.spacing.card }}>
          <SettingRow
            icon="trash-outline"
            title={t('settings.delete_all')}
            subtitle={t('settings.delete_all_body')}
            destructive
            onPress={() => setDeleteOpen(true)}
            last
          />
        </Card>

        {/* Integrations */}
        <SectionHeader title={t('settings.integrations')} />
        <Card padded={false} style={{ paddingHorizontal: theme.spacing.card }}>
          <SettingRow
            icon="paper-plane-outline"
            title={t('settings.telegram')}
            subtitle={t('settings.telegram_hint')}
            onPress={() => setTelegramOpen(true)}
            value={settings.telegramEnabled && settings.telegramChatId ? settings.telegramChatId : undefined}
          />
          <SettingRow
            icon="phone-portrait-outline"
            title={t('settings.pwa')}
            subtitle={t('settings.pwa_hint')}
            onPress={() => setPwaOpen(true)}
            last
          />
        </Card>

        {/* About */}
        <SectionHeader title={t('settings.about')} />
        <Card padded={false} style={{ paddingHorizontal: theme.spacing.card }}>
          <SettingRow
            icon="information-circle-outline"
            title={t('settings.version')}
            value={`v${APP_VERSION}`}
            last
          />
        </Card>

        <Button
          label={t('common.logout')}
          variant="secondary"
          icon="log-out-outline"
          onPress={() => setLogoutOpen(true)}
          style={{ marginTop: theme.spacing.lg }}
        />
        <AppText variant="caption" tone="faint" align="center" style={{ marginTop: theme.spacing.md }}>
          {t('app.tagline')}
        </AppText>
      </ScrollView>

      {/* Import: merge or replace */}
      <AppModal
        visible={Boolean(pendingBackup)}
        onClose={() => setPendingBackup(null)}
        title={t('settings.import_mode_title')}
        subtitle={t('settings.import_data')}
      >
        <Button
          label={t('settings.import_merge')}
          icon="git-merge-outline"
          onPress={() => applyImport('merge')}
          loading={busy === 'import'}
          style={{ marginBottom: theme.spacing.sm }}
        />
        <AppText variant="caption" tone="muted" style={{ marginBottom: theme.spacing.md }}>
          {t('settings.import_merge_desc')}
        </AppText>
        <Button
          label={t('settings.import_replace')}
          variant="danger"
          icon="swap-horizontal-outline"
          onPress={() => applyImport('replace')}
          style={{ marginBottom: theme.spacing.sm }}
        />
        <AppText variant="caption" tone="muted" style={{ marginBottom: theme.spacing.md }}>
          {t('settings.import_replace_desc')}
        </AppText>
        <Button label={t('common.cancel')} variant="ghost" onPress={() => setPendingBackup(null)} />
      </AppModal>

      <ConfirmDialog
        visible={deleteOpen}
        title={t('settings.delete_all_confirm')}
        message={t('settings.delete_all_body')}
        confirmLabel={t('settings.delete_all_action')}
        cancelLabel={t('common.cancel')}
        loading={busy === 'delete'}
        onConfirm={handleDeleteAll}
        onCancel={() => setDeleteOpen(false)}
      />

      <ConfirmDialog
        visible={logoutOpen}
        title={t('auth.logout_confirm')}
        message={t('common.logout')}
        confirmLabel={t('common.logout')}
        cancelLabel={t('common.cancel')}
        onConfirm={async () => {
          setLogoutOpen(false);
          await logout();
          router.replace('/(auth)/login');
        }}
        onCancel={() => setLogoutOpen(false)}
      />

      {/* PWA guide */}
      <AppModal visible={pwaOpen} onClose={() => setPwaOpen(false)} title={t('settings.pwa')} subtitle={t('settings.pwa_hint')}>
        <View style={[styles.guideBlock, { backgroundColor: theme.colors.backgroundAlt, borderRadius: theme.radius.md }]}>
          <View style={styles.guideRow}>
            <Icon name="globe-outline" size={16} color={theme.colors.textMuted} />
            <AppText variant="small" style={{ flex: 1, marginLeft: 10 }}>
              {t('settings.storage_mode_local')}
            </AppText>
          </View>
          <Divider style={{ marginVertical: theme.spacing.sm }} />
          <AppText variant="caption" tone="muted">
            {t('settings.supabase_hint')}
          </AppText>
        </View>
        <Button label={t('common.close')} variant="secondary" onPress={() => setPwaOpen(false)} style={{ marginTop: theme.spacing.md }} />
      </AppModal>

      {/* Telegram */}
      <AppModal
        visible={telegramOpen}
        onClose={() => setTelegramOpen(false)}
        title={t('settings.telegram')}
        subtitle={t('settings.telegram_hint')}
      >
        <Input
          label={t('settings.telegram_chat_id')}
          value={telegramChatId}
          onChangeText={setTelegramChatId}
          placeholder="123456789"
          keyboardType="number-pad"
          helper={t('common.optional')}
        />
        <View style={[styles.modalActions, { marginTop: theme.spacing.md }]}>
          <Button label={t('common.cancel')} variant="secondary" onPress={() => setTelegramOpen(false)} style={{ flex: 1 }} />
          <Button label={t('common.save')} onPress={handleSaveTelegram} style={{ flex: 1.2 }} />
        </View>
      </AppModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusPill: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideBlock: {
    padding: 14,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
});
