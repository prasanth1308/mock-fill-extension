import { chromium, expect, test, type BrowserContext, type Page, type Worker } from '@playwright/test';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { browser } from 'wxt/browser';

let context: BrowserContext, worker: Worker, extensionId: string, userDataDir: string;
test.beforeAll(async () => {
  userDataDir = await mkdtemp(path.join(os.tmpdir(), 'formseed-browser-'));
  const extensionPath = path.resolve('.output/chrome-mv3');
  context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium', headless: true,
    viewport: { width: 1280, height: 800 },
    args: ['--enable-unsafe-extension-debugging', `--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  extensionId = new URL(worker.url()).host;
});
test.afterAll(async () => { await context?.close(); if (userDataDir) await rm(userDataDir, { recursive: true, force: true }); });

async function popupFor(page: Page) {
  await page.bringToFront();
  const cdp = await context.browser()!.newBrowserCDPSession();
  const { targetInfos } = await cdp.send('Target.getTargets', { filter: [{ type: 'tab', exclude: false }, { exclude: true }] });
  const targetInfo = targetInfos.find(target => target.type === 'tab' && target.url === page.url());
  if (!targetInfo) throw new Error(`No browser tab target for ${page.url()}: ${JSON.stringify(targetInfos)}`);
  // Chrome's extension debugging API invokes the real toolbar action and grants activeTab.
  // No test-only host permissions are added to the production manifest.
  await cdp.send('Extensions.triggerAction', { id: extensionId, targetId: targetInfo.targetId });
  await cdp.detach();
  const popup = await context.newPage(); await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.bringToFront();
  return popup;
}

test('real toolbar action fills native and framework state with production permissions', async () => {
  const page = await context.newPage(); await page.goto('http://127.0.0.1:4173/demo/');
  await expect(page.locator('#angular-form input').first()).toBeVisible();
  await worker.evaluate(async () => {
    const chrome = (globalThis as unknown as { chrome: typeof browser }).chrome;
    await chrome.storage.local.set({ 'formseed.settings.v1': { version: 1, locale: 'en', overwrite: false, seed: 'browser-regression', rules: [], profiles: [] } });
  });
  const popup = await popupFor(page);
  const start = Date.now();
  await popup.evaluate(() => (document.getElementById('fill-page') as HTMLButtonElement).click());
  await expect(page.locator('#native input[name=email]')).not.toHaveValue('', { timeout: 10000 });
  await expect(popup.locator('#status')).toContainText('fields filled');
  const duration = Date.now() - start;
  await expect(page.locator('#react-form input[name=email]')).not.toHaveValue('');
  const reactState = JSON.parse(await page.locator('#react-state').innerText());
  expect(reactState.email).toBe(await page.locator('#react-form input[name=email]').inputValue());
  expect(reactState.department).not.toBe('');
  const vueState = JSON.parse(await page.locator('#vue-state').innerText());
  expect(vueState.firstName).toBe(await page.locator('#vue-form input[name=firstName]').inputValue());
  await expect(page.locator('#angular-state')).toContainText('@example.com');
  await expect(page.locator('#native input[name=employeeId]')).toHaveValue(/^EMP-\d{4}$/);
  await expect(page.locator('#native input[name=readonly]')).toHaveValue('Keep this value');
  await expect(page.locator('#native input[name=disabled]')).toHaveValue('Disabled value');
  await expect(page.locator('#native input[name=honeypot]')).toHaveValue('');
  await expect(page.locator('#shadow-host input')).not.toHaveValue('');
  await expect(page.frameLocator('iframe').locator('input[name=email]')).not.toHaveValue('');
  expect(await page.locator('#benchmark input').evaluateAll(inputs => inputs.every(el => (el as HTMLInputElement).value !== ''))).toBe(true);
  expect(await page.locator('body').getAttribute('data-submitted')).toBeNull();
  console.log(`Production toolbar flow filled the fixture (including 100 benchmark fields) in ${duration} ms.`);
  await mkdir('store-assets/screenshots', { recursive: true });
  await page.screenshot({ path: 'store-assets/screenshots/filled-forms.png', fullPage: false });
  await page.locator('#native input[name=firstName]').fill('My manual edit');

  // Invoke the real background listener from the extension UI with the same activeTab grant.
  await page.bringToFront();
  await popup.evaluate(() => (document.getElementById('undo') as HTMLButtonElement).click());
  await expect(page.locator('#native input[name=email]')).toHaveValue('');
  await expect(page.locator('#react-form input[name=email]')).toHaveValue('');
  await expect(page.locator('#native input[name=firstName]')).toHaveValue('My manual edit');
  await popup.setViewportSize({ width: 390, height: 800 });
  await popup.screenshot({ path: 'store-assets/screenshots/popup.png', fullPage: true });
  await popup.close(); await page.close();
});

test('rule editor saves validated rules, applies profiles, and rejects malformed imports', async () => {
  const options = await context.newPage(); await options.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(options.locator('#locale')).toHaveValue('en');
  await options.locator('#match').fill('employeeId'); await options.locator('#generator').selectOption('fixed');
  await options.locator('#value').fill('EMP-0042'); await options.locator('#save-rule').click();
  await expect(options.locator('#status')).toHaveText('Custom rule saved.');
  await expect(options.locator('#rules')).toContainText('EMP-0042');
  await options.screenshot({ path: 'store-assets/screenshots/custom-rules.png', fullPage: true });
  await options.locator('#import').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(options.locator('#status')).toContainText('not valid JSON');
  const page = await context.newPage(); await page.goto('http://127.0.0.1:4173/demo/');
  await expect(page.locator('#angular-form input').first()).toBeVisible();
  const popup = await popupFor(page);
  await popup.evaluate(() => (document.getElementById('fill-page') as HTMLButtonElement).click());
  await expect(page.locator('#native input[name=employeeId]')).toHaveValue('EMP-0042');
  await expect(popup.locator('#status')).toContainText('fields filled');
  await popup.close(); await page.close(); await options.close();
});

test('protected pages return a useful error through the popup', async () => {
  const page = await context.newPage(); await page.goto('about:blank');
  const popup = await context.newPage(); await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.bringToFront(); await popup.evaluate(() => (document.getElementById('fill-page') as HTMLButtonElement).click());
  await expect(popup.locator('#status')).toContainText(/regular.*page/);
  await page.close(); await popup.close();
});
