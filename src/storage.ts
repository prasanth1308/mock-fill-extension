import { browser } from 'wxt/browser';
import { defaultSettings, STORAGE_KEY, validateSettings } from './settings';
import type { Settings } from './types';

export async function loadSettings(): Promise<Settings> {
  const stored = (await browser.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
  return stored === undefined ? structuredClone(defaultSettings) : validateSettings(stored);
}
export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: validateSettings(settings) });
}
