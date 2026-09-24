import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('supports the daily learning journey on desktop', async ({ page }) => {
  await page.goto('/today');
  await expect(page.getByRole('heading', { name: /向目标 425 分前进/ })).toBeVisible();
  await expect(page.getByText('今日 60 分钟计划')).toBeVisible();
  await page.getByRole('link', { name: '高频知识', exact: true }).click();
  await expect(page.getByRole('heading', { name: '四级高频知识库' })).toBeVisible();
  await page.getByRole('searchbox', { name: '搜索高频词' }).fill('environment');
  await expect(page.getByRole('heading', { name: 'environment' })).toBeVisible();
});

test('keeps the core navigation usable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/today');
  const mobileNav = page.getByRole('navigation', { name: '移动端主导航' });
  await expect(mobileNav).toBeVisible();
  await mobileNav.getByRole('link', { name: /听力精练/ }).click();
  await expect(page.getByRole('heading', { name: '听力精练' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('keeps core pages within a 360px viewport without serious accessibility violations', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const route of ['/today', '/listen', '/practice', '/account']) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${route} must not scroll horizontally`).toBeTruthy();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  }
});

test('exposes installable PWA metadata', async ({ page, request }) => {
  await page.goto('/today');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();
  const manifestResponse = await request.get(manifestHref!);
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.name).toContain('四级向前');
  expect(manifest.display).toBe('standalone');
});

test('reopens the visited study dashboard while offline', async ({ page, context }) => {
  await page.goto('/today');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /向目标 425 分前进/ })).toBeVisible();
});

test('continues a full mock into the next locked section', async ({ page }) => {
  await page.goto('/exam/mock-1');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '完成写作并进入听力' }).click();
  await expect(page.getByText('当前分区：听力（25 分钟）')).toBeVisible();
  await expect(page.getByText(/写作 · 30 分钟 · 已锁定/)).toBeVisible();
});
