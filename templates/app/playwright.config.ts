import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const STORAGE = path.resolve('playwright/.auth/storage-state.json');

const useBuiltApp = !!process.env.CI || process.env.FORGE_USE_BUILT_APP === '1';

export default defineConfig({
  testDir: './playwright',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  globalSetup: process.env.CLERK_SECRET_KEY ? './playwright/global-setup.ts' : undefined,
  globalTeardown: process.env.CLERK_SECRET_KEY ? './playwright/global-teardown.ts' : undefined,
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop',     use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile',      use: { ...devices['iPhone 14'] } },
    { name: 'tablet',      use: { ...devices['iPad (gen 7)'] } },
    { name: 'desktop-auth', testMatch: /authed\/.*\.spec\.ts$/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, storageState: STORAGE } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: useBuiltApp ? 'npm run build && npm run start' : 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
