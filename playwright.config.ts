import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for Mathvera Whiteboard Full-Stack Clone
 * Dual-webServer orchestration:
 * 1. Sync server (Yjs / WebSocket gateway) on port 3001
 * 2. Next.js 16 Web Application on port 3000
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: {
    timeout: 7_000,
  },
  fullyParallel: false, // Sequential / controlled concurrency for deterministic CRDT & room sync
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: [
    {
      command: 'node server/sync-server.mjs',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        NEXT_PUBLIC_WS_URL: 'ws://localhost:3001',
      },
    },
  ],
});
