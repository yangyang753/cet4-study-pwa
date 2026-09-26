import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('supports the daily learning journey on desktop', async ({ page }) => {
  await page.goto('today');
  await expect(page.getByRole('heading', { name: /向目标 425 分前进/ })).toBeVisible();
  await expect(page.getByText('今日 60 分钟计划')).toBeVisible();
  await page.getByRole('link', { name: '高频知识', exact: true }).click();
  await expect(page.getByRole('heading', { name: '四级高频知识库' })).toBeVisible();
  await page.getByRole('searchbox', { name: '搜索高频词' }).fill('environment');
  await expect(page.getByRole('heading', { name: 'environment' })).toBeVisible();
});

test('keeps the core navigation usable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('today');
  const mobileNav = page.getByRole('navigation', { name: '移动端主导航' });
  await expect(mobileNav).toBeVisible();
  await mobileNav.getByRole('link', { name: /听力精练/ }).click();
  await expect(page.getByRole('heading', { name: '听力精练' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.goto('account');
  await expect(page.getByText('当前没有启用云端同步')).toBeVisible();
  await expect(page.getByRole('button', { name: '登录' })).toHaveCount(0);
});

test('keeps core pages within a 360px viewport without serious accessibility violations', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const route of ['today', 'listen', 'practice', 'account']) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${route} must not scroll horizontally`).toBeTruthy();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  }
});

test('exposes installable PWA metadata', async ({ page, request }) => {
  await page.goto('today');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();
  const manifestResponse = await request.get(manifestHref!);
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.name).toContain('四级向前');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
    expect.objectContaining({ sizes: '512x512', purpose: expect.stringContaining('maskable') }),
  ]));
  await page.goto('account');
  await expect(page.getByRole('heading', { name: '安装到手机桌面' })).toBeVisible();
});

test('starts vocabulary practice with word study and unlocks questions after translation', async ({ page }) => {
  await page.goto('practice/vocabulary');
  await expect(page.getByRole('heading', { level: 1, name: '先学单词，再开始做题' })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
  const progress = await page.locator('.vocabulary-warmup header span').textContent();
  const total = Number(progress?.match(/\/(\d+)/)?.[1]);
  expect(total).toBeGreaterThan(0);
  for (let index = 0; index < total; index += 1) {
    await page.getByRole('button', { name: '显示释义' }).click();
    await page.getByRole('button', { name: '基本认识' }).click();
  }
  await expect(page.getByRole('heading', { level: 1, name: '用一段话检查是否真正理解' })).toBeVisible();
  await page.getByRole('textbox', { name: '我的中文翻译' }).fill('这是今天学习单词的中文翻译。');
  await page.getByRole('button', { name: '检查翻译' }).click();
  await page.getByRole('button', { name: '继续做词义题' }).click();
  for (let index = 0; index < 3; index += 1) {
    await expect(page.getByRole('heading', { level: 1, name: '单词之后学习重点搭配' })).toBeVisible();
    await page.getByRole('button', { name: '显示搭配释义' }).click();
    await page.getByRole('button', { name: '开始搭配测试' }).click();
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: '提交搭配答案' }).click();
    await page.getByRole('button', { name: index === 2 ? '完成重点搭配' : '下一个重点搭配' }).click();
  }
  await expect(page.getByRole('heading', { level: 1, name: '专项练习' })).toBeVisible();
  await expect(page.getByRole('group', { name: '请选择 passage 的正确含义。' })).toBeVisible();
  const firstChoice = page.getByRole('radio').first();
  await expect(firstChoice).toBeDisabled();
  await page.getByRole('textbox', { name: '题干中文翻译' }).fill('这道题询问单词的正确含义。');
  await page.getByRole('button', { name: '检查翻译并解锁选项' }).click();
  await expect(firstChoice).toBeEnabled();
});

test('reopens the visited study dashboard while offline', async ({ page, context }) => {
  await page.goto('today');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /向目标 425 分前进/ })).toBeVisible();
});

test('continues a full mock into the next locked section', async ({ page, request }) => {
  await page.goto('exam/mock-1');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '完成写作并进入听力' }).click();
  await expect(page.getByText('当前分区：听力（25 分钟）')).toBeVisible();
  await expect(page.getByText(/写作 · 30 分钟 · 已锁定/)).toBeVisible();
  const audioSrc = await page.getByLabel('模考听力音频').getAttribute('src');
  expect(audioSrc).toContain('/audio/');
  expect((await request.get(new URL(audioSrc!, page.url()).toString())).ok()).toBeTruthy();
  await page.getByRole('button', { name: '交卷' }).click();
  await expect(page.getByText('备考估分', { exact: true })).toBeVisible();
  await expect(page.getByText(/备考估分基于本应用规则，不是官方 CET-4 标准分，也不能保证实际成绩/)).toBeVisible();
});
