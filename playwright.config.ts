import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Every browser project drives the same command-station process, so tests
  // must not race each other through its shared layout and power state.
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    // Headless by default; pass --headed to watch the run.
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
  outputDir: 'test-results/',
  webServer: [
    {
      command: 'npm run emulator',
      wait: { stdout: /emulator bridge on ws:\/\/127\.0\.0\.1:4444/ },
      stdout: 'pipe',
      timeout: 120_000,
    },
    {
      command: process.env.CI ? 'vite preview --port 5173' : 'vite dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
};

export default config;
