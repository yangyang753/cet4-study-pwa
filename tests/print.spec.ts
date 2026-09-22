import { expect, test } from '@playwright/test';

test('renders separate A4 question and answer sheets', async ({ page }) => {
  await page.goto('/print');
  const sheets = page.locator('.print-sheet');
  await expect(sheets).toHaveCount(4);
  await expect(sheets.first()).toContainText('高频词汇速记');
  await expect(sheets.nth(1)).toContainText('重点搭配与语法');
  await expect(sheets.first()).not.toContainText('答案与解析');
  await expect(sheets.nth(3)).toContainText('答案与解析');
  await expect(sheets.nth(2).locator('.writing-space')).toHaveCount(2);
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  expect(pdf.byteLength).toBeGreaterThan(10_000);
});
