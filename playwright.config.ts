import { defineConfig, devices } from '@playwright/test';

const appBasePath = process.env.GITHUB_ACTIONS === 'true' ? '/cet4-study-pwa/' : '/';
const appUrl = new URL(appBasePath, 'http://127.0.0.1:4173').toString();

export default defineConfig({
  testDir: './tests',
  use: { baseURL: appUrl, trace: 'retain-on-failure' },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' } }],
  webServer: { command: 'npm run preview:test', url: appUrl, reuseExistingServer: true },
});
