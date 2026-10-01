import { expect, test } from '@playwright/test';

test('core learning routes remain usable across desktop and mobile browsers', async ({ page }) => {
  await page.goto('#/today');
  await expect(page.getByRole('heading', { name: /向目标 425 分前进/ })).toBeVisible();
  await expect(page.locator('main')).toBeVisible();

  await page.goto('#/knowledge');
  await expect(page.getByRole('heading', { name: '四级高频知识库' })).toBeVisible();

  await page.goto('#/listen');
  await expect(page.getByRole('heading', { name: '听力精练' })).toBeVisible();
  await expect(page.locator('audio')).toHaveAttribute('src', /audio\/v1\/listen-01\.wav$/);

  const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fitsViewport).toBe(true);
});
