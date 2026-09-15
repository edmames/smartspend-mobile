/**
 * Settings store — theme, language, Telegram options. Dark mode is the default.
 */
import { create } from 'zustand';
import type { ID, Language, Settings, ThemeMode } from '../types';
import { settingsStorage } from '../services/storage.service';
import { DEFAULT_CURRENCY } from '../utils/constants';

export const DEFAULT_SETTINGS: Settings = {
  userId: '',
  theme: 'dark',
  currency: DEFAULT_CURRENCY,
  language: 'id',
  telegramEnabled: false,
  telegramChatId: undefined,
};

interface SettingsState {
  settings: Settings;
  hydrated: boolean;
  hydrate: (userId?: ID) => Promise<void>;
  updateTheme: (theme: ThemeMode) => Promise<void>;
  updateLanguage: (language: Language) => Promise<void>;
  updateTelegram: (enabled: boolean, chatId?: string) => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  setSettings: (settings: Settings) => Promise<void>;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async (userId) => {
    try {
      const stored = await settingsStorage.load(DEFAULT_SETTINGS);
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        ...stored,
        userId: userId ?? stored.userId ?? '',
        currency: 'IDR',
      };
      set({ settings, hydrated: true });
    } catch {
      set({ settings: { ...DEFAULT_SETTINGS, userId: userId ?? '' }, hydrated: true });
    }
  },

  updateTheme: async (theme) => {
    const settings = { ...get().settings, theme };
    set({ settings });
    await settingsStorage.save(settings);
  },

  updateLanguage: async (language) => {
    const settings = { ...get().settings, language };
    set({ settings });
    await settingsStorage.save(settings);
  },

  updateTelegram: async (enabled, chatId) => {
    const settings = {
      ...get().settings,
      telegramEnabled: enabled,
      telegramChatId: chatId?.trim() ? chatId.trim() : undefined,
    };
    set({ settings });
    await settingsStorage.save(settings);
  },

  updateSettings: async (partial) => {
    const settings = { ...get().settings, ...partial };
    set({ settings });
    await settingsStorage.save(settings);
  },

  setSettings: async (settings) => {
    const merged: Settings = { ...DEFAULT_SETTINGS, ...settings, currency: 'IDR' };
    set({ settings: merged, hydrated: true });
    await settingsStorage.save(merged);
  },

  reset: async () => {
    set({ settings: DEFAULT_SETTINGS, hydrated: false });
  },
}));

/* -------------------------------------------------------------------------- */
/*                          Telegram notification stub                        */
/* -------------------------------------------------------------------------- */

/**
 * Optional Telegram push. Offline by default: without a bot token the call is a
 * no-op that reports `skipped` so the UI can explain why nothing was sent.
 *
 * To enable, set `EXPO_PUBLIC_TELEGRAM_BOT_TOKEN` and use the chat ID from
 * @userinfobot.
 */
export async function sendTelegramMessage(
  chatId: string | undefined,
  message: string,
): Promise<{ ok: boolean; status: 'sent' | 'skipped' | 'failed'; detail?: string }> {
  if (!chatId) return { ok: false, status: 'skipped', detail: 'missing_chat_id' };

  const token = process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, status: 'skipped', detail: 'missing_bot_token' };

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
    if (!response.ok) return { ok: false, status: 'failed', detail: `http_${response.status}` };
    return { ok: true, status: 'sent' };
  } catch {
    return { ok: false, status: 'failed', detail: 'network_error' };
  }
}
