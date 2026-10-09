import { browser, type Browser } from 'wxt/browser';
import { loadSettings } from '../src/storage';
import type { Action, ContentRequest, FillResult, RunRequest, RunResponse } from '../src/types';

export default defineBackground(() => {
  const menuItems: [string, string][] = [['page', 'Fill empty fields on page'], ['form', 'Fill this form'], ['field', 'Fill this field'], ['undo', 'Undo last fill']];
  async function menus() {
    if (!browser.contextMenus?.create) return;
    await browser.contextMenus.removeAll();
    for (const [action, title] of menuItems) browser.contextMenus.create({ id: `formseed-${action}`, title: `FormSeed: ${title}`, contexts: action === 'field' || action === 'form' ? ['editable'] : ['page', 'editable'], documentUrlPatterns: ['http://*/*', 'https://*/*'] });
  }
  browser.runtime.onInstalled.addListener(() => { void menus(); });
  browser.runtime.onStartup.addListener(() => { void menus(); });
  async function run(request: RunRequest, tab?: Browser.tabs.Tab, info?: Browser.contextMenus.OnClickData): Promise<RunResponse> {
    try {
      const active = tab ?? (await browser.tabs.query({ active: true, currentWindow: true }))[0];
      if (!active?.id) throw new Error('No active browser tab.');
      if (active.url && !/^https?:\/\//.test(active.url)) throw new Error('Open a regular http/https page. Browser settings and store pages cannot be filled.');
      const settings = await loadSettings();
      if (request.overwrite !== undefined) settings.overwrite = request.overwrite;
      if (request.seed !== undefined) settings.seed = request.seed;
      const frameId = info?.frameId ?? 0;
      await browser.scripting.executeScript({ target: { tabId: active.id, frameIds: [frameId] }, files: ['/filler.js'] });
      const result: FillResult = await browser.tabs.sendMessage(active.id, { kind: 'fill', action: request.action, settings, contextMenu: !!info, targetElementId: (info as Browser.contextMenus.OnClickData & { targetElementId?: number } | undefined)?.targetElementId } satisfies ContentRequest, { frameId });
      if (!result) throw new Error('The page did not respond. Reload it and try again.');
      return { ok: true, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: /Cannot access|Missing host permission|not allowed|cannot be scripted/i.test(message) ? 'This page or frame is protected by the browser. Try a regular web page.' : message };
    }
  }
  browser.runtime.onMessage.addListener((request: RunRequest, sender, respond) => {
    if (sender.id !== browser.runtime.id || !sender.url?.startsWith(browser.runtime.getURL('/')) || request?.kind !== 'run' || !['page', 'form', 'field', 'pick', 'undo'].includes(request.action)) return;
    run(request).then(respond); return true;
  });
  browser.contextMenus?.onClicked.addListener((info, tab) => {
    const action = String(info.menuItemId).replace('formseed-', '') as Action;
    if (!menuItems.some(([id]) => id === action)) return;
    void run({ kind: 'run', action }, tab, info).then(response => showBadge(response, tab?.id));
  });
  browser.commands.onCommand.addListener(command => {
    const actions: Record<string, Action> = { 'fill-page': 'page', 'fill-field': 'field', 'undo-fill': 'undo' };
    if (actions[command]) void run({ kind: 'run', action: actions[command] }).then(response => showBadge(response));
  });
  async function showBadge(response: RunResponse, tabId?: number) {
    const target = tabId ?? (await browser.tabs.query({ active: true, currentWindow: true }))[0]?.id;
    if (target === undefined) return;
    const action = browser.action;
    await action.setBadgeBackgroundColor({ tabId: target, color: response.ok ? '#24664f' : '#9b3232' });
    await action.setBadgeText({ tabId: target, text: response.ok ? String(response.result?.filled ?? 0) : '!' });
    await action.setTitle({ tabId: target, title: response.error || response.result?.message || `${response.result?.filled ?? 0} filled. ${response.result?.issues[0] ?? ''}` });
  }
});
