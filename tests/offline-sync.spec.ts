import { expect, test } from '@playwright/test';

test('an offline listening answer survives a reload in IndexedDB', async ({ context, page }) => {
  await page.goto('/listen');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.getByRole('radio', { name: /Sunday afternoon/ }).check();
  await context.setOffline(true);
  await page.getByRole('button', { name: '提交答案' }).click();
  await expect(page.getByText(/已保存在本机|仅保存在本机/).first()).toBeVisible();
  await page.reload();
  const attempts = await page.evaluate(async () => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('cet4-study');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction('attempts', 'readonly');
      const count = transaction.objectStore('attempts').count();
      count.onsuccess = () => resolve(count.result);
      count.onerror = () => reject(count.error);
    };
  }));
  expect(attempts).toBeGreaterThan(0);
});
