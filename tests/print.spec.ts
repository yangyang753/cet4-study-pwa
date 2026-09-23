import { expect, test } from '@playwright/test';

test('renders separate A4 question and answer sheets', async ({ page }) => {
  await page.goto('/print');
  const sheets = page.locator('.print-sheet');
  await expect(sheets.first()).toContainText('高频知识与四级练习');
  await expect(sheets.first()).not.toContainText('答案与解析');
  await expect(sheets.last()).toContainText('答案与解析');
  await expect(sheets.last()).toContainText('解析：');
  await expect(page.locator('.writing-space')).toHaveCount(2);
  await expect(page.locator('.print-sheet footer').first()).toContainText(/第 1 页 \/ 共 \d+ 页/);
  await page.getByLabel('练习来源').selectOption('practice');
  await page.getByLabel('专项类别').selectOption('reading');
  await page.getByText('附高频知识').click();
  await expect(page.locator('.writing-space')).toHaveCount(0);
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  expect(pdf.byteLength).toBeGreaterThan(10_000);
});
