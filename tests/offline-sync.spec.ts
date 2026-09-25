import { expect, test } from '@playwright/test';

test('an offline listening answer survives a reload in IndexedDB', async ({ context, page }) => {
  await page.goto('listen');
  await page.evaluate(() => navigator.serviceWorker.ready);
  const translationFields = page.locator('.translation-gate textarea');
  for (let index = 0; index < await translationFields.count(); index += 1) await translationFields.nth(index).fill('中文翻译');
  await page.getByRole('button', { name: '检查翻译并解锁选项' }).click();
  const answer = page.getByRole('radio', { name: /Sunday afternoon/ });
  await expect(answer).toBeEnabled();
  await answer.check();
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
