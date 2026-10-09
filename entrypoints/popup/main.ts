import './style.css';
import { browser } from 'wxt/browser';
import { loadSettings, saveSettings } from '../../src/storage';
import { profileForUrl } from '../../src/settings';
import type { Action, RunResponse, Settings } from '../../src/types';

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let settings: Settings;
let siteUrl = '';
function status(message: string, error = false) { el('status').textContent = message; el('status').classList.toggle('error', error); }
async function run(action: Action) {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.fill, .actions button');
  buttons.forEach(b => { b.disabled = true; });
  try {
    const response: RunResponse = await browser.runtime.sendMessage({ kind: 'run', action, overwrite: el<HTMLInputElement>('overwrite').checked, seed: el<HTMLInputElement>('seed').value });
    if (!response?.ok) throw new Error(response?.error || 'Unable to reach FormSeed. Reload the extension and try again.');
    const result = response.result!;
    status(result.message || `${result.filled} field${result.filled === 1 ? '' : 's'} ${action === 'undo' ? 'restored' : 'filled'} · ${result.skipped} skipped`);
    el('issues').hidden = result.issues.length === 0;
    const list = el('issue-list'); list.replaceChildren();
    for (const issue of result.issues) { const item = document.createElement('li'); item.textContent = issue; list.append(item); }
    if (action === 'pick') window.close();
  } catch (error) { status(error instanceof Error ? error.message : String(error), true); }
  finally { buttons.forEach(b => { b.disabled = false; }); }
}
for (const [id, action] of [['fill-page', 'page'], ['fill-form', 'form'], ['fill-field', 'field'], ['pick', 'pick'], ['undo', 'undo']] as const) el(id).addEventListener('click', () => { void run(action); });
el('settings').addEventListener('click', () => { void browser.runtime.openOptionsPage(); });
async function savePreferences() {
  try {
    const latest = await loadSettings();
    latest.overwrite = el<HTMLInputElement>('overwrite').checked;
    latest.seed = el<HTMLInputElement>('seed').value;
    await saveSettings(latest); settings = latest;
  } catch (error) { status(String(error), true); }
}
el('overwrite').addEventListener('change', () => { void savePreferences(); });
el('seed').addEventListener('change', () => { void savePreferences(); });
function refreshSite() {
  const paused = /^https?:/.test(siteUrl) && (settings.pausedOrigins.includes(new URL(siteUrl).origin) || profileForUrl(settings, siteUrl)?.enabled === false);
  el('site-toggle').textContent = paused ? 'Enable' : 'Pause';
}
el('site-toggle').addEventListener('click', async () => {
  try {
    settings = await loadSettings();
    const existing = profileForUrl(settings, siteUrl);
    const origin = new URL(siteUrl).origin;
    const paused = settings.pausedOrigins.includes(origin) || existing?.enabled === false;
    if (paused) {
      settings.pausedOrigins = settings.pausedOrigins.filter(value => value !== origin);
      if (existing) existing.enabled = true;
    } else settings.pausedOrigins.push(origin);
    await saveSettings(settings); refreshSite(); status(paused ? 'Enabled on this site.' : 'Paused on this site.');
  } catch (error) { status(String(error), true); }
});
void (async () => {
  try {
    settings = await loadSettings();
    el<HTMLInputElement>('overwrite').checked = settings.overwrite;
    el<HTMLInputElement>('seed').value = settings.seed;
    const tab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
    siteUrl = tab?.url ?? '';
    el('site').textContent = /^https?:/.test(siteUrl) ? new URL(siteUrl).hostname : 'Open a web page to begin';
    el('site-toggle').hidden = !/^https?:/.test(siteUrl);
    refreshSite();
  } catch (error) { status(String(error), true); }
})();
