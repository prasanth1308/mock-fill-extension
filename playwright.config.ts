import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 30000,
  webServer: {
    command: 'npm run demo',
    url: 'http://127.0.0.1:4173/demo/',
    reuseExistingServer: !process.env.CI,
  },
});
