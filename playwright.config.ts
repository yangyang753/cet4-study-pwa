import { defineConfig, devices } from '@playwright/test';

const appBasePath = process.env.GITHUB_ACTIONS === 'true' ? '/cet4-study-pwa/' : '/';
const appUrl = new URL(appBasePath, 'http://127.0.0.1:4173').toString();

export default defineConfig({
  testDir: './tests',
  // Accessibility scans, service-worker reloads, and WebKit startup are all
  // resource intensive. Capping concurrency keeps the release gate stable on
  // ordinary developer laptops instead of turning CPU contention into timeouts.
  // The PWA tests share one origin and exercise service-worker activation plus
  // IndexedDB migrations. Run them serially so one context cannot interrupt
  // another context's first navigation or database setup.
  workers: 1,
  timeout: 60_000,
  use: { baseURL: appUrl, trace: 'retain-on-failure' },
  projects: [
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: process.env.GITHUB_ACTIONS === 'true' ? undefined : 'chrome' } },
    ...(process.env.GITHUB_ACTIONS === 'true' ? [{ name: 'firefox-compat', testMatch: '**/compat.spec.ts', use: { ...devices['Desktop Firefox'] } }] : []),
    { name: 'webkit-mobile-compat', testMatch: '**/compat.spec.ts', use: { ...devices['iPhone 13'] } },
  ],
  webServer: { command: 'npm run preview:test', url: appUrl, reuseExistingServer: true },
});
