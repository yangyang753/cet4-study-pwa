import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('preserves legacy deep-link queries when migrating to Hash routing', async ({ page }) => {
  await page.goto('review?source=reminder');
  await page.waitForURL(/#\/review\?source=reminder$/);
  await expect(page.getByRole('heading', { name: '错题复习' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '错题复习' })).toBeVisible();
});

test('supports the daily learning journey on desktop', async ({ page }) => {
  await page.goto('#/today');
  await expect(page.getByRole('heading', { name: /向目标 425 分前进/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: '今日学习路线' })).toBeVisible();
  await expect(page.getByText('60 分钟 · 按顺序完成效果更稳')).toBeVisible();
  await page.getByRole('link', { name: '高频知识', exact: true }).click();
  await expect(page.getByRole('heading', { name: '四级高频知识库' })).toBeVisible();
  await page.getByRole('searchbox', { name: '搜索高频词' }).fill('environment');
  await expect(page.getByRole('heading', { name: 'environment' })).toBeVisible();
});

test('keeps the core navigation usable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/today');
  const mobileNav = page.getByRole('navigation', { name: '移动端主导航' });
  await expect(mobileNav).toBeVisible();
  await mobileNav.getByRole('link', { name: /听力精练/ }).click();
  await expect(page.getByRole('heading', { name: '听力精练' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.goto('#/account');
  await expect(page.getByText('当前没有启用云端同步')).toBeVisible();
  await expect(page.getByRole('button', { name: '登录' })).toHaveCount(0);
});

test('keeps every primary page within a 360px viewport without serious accessibility violations', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const route of ['today', 'listen', 'practice', 'review', 'exam', 'knowledge', 'account', 'print']) {
    await page.goto(`#/${route}`);
    await expect(page.locator('main')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${route} must not scroll horizontally`).toBeTruthy();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  }
});

test('keeps mobile secondary navigation operable at 200% text size with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('#/today');
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  const trigger = page.getByRole('button', { name: '更多' });
  await trigger.click();
  await page.getByRole('button', { name: '关闭更多学习功能' }).click();
  await expect(trigger).toBeFocused();
  for (const [label, route] of [['限时模拟', 'exam'], ['高频知识', 'knowledge'], ['账户同步', 'account'], ['A4 打印', 'print']] as const) {
    await trigger.click();
    await page.getByRole('navigation', { name: '移动端更多导航' }).getByRole('link', { name: new RegExp(label) }).click();
    await expect(page).toHaveURL(new RegExp(`#/${route}$`));
    const overflow = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('body *')].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.right > window.innerWidth + 1 || rect.left < -1;
    }).map((element) => ({ tag: element.tagName, className: element.className, text: element.textContent?.trim().slice(0, 80), left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right })));
    expect(overflow, `${route} must not overflow at 200% text`).toEqual([]);
  }
});

test('shows a diagnostic estimate and targeted task on desktop and phone', async ({ page }) => {
  await page.goto('#/today');
  await page.getByRole('heading', { name: /向目标 425 分前进/ }).waitFor();
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('cet4-study');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('settings', 'readwrite');
      transaction.objectStore('settings').put({
        id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1,
        diagnosticCompletedAt: '2026-09-26T08:00:00.000Z',
        diagnosticProfile: {
          version: 2, sessionId: 'e2e-profile', completedAt: '2026-09-26T08:00:00.000Z', questionCount: 20,
          levels: { vocabulary: 0.7, grammar: 0.6, listening: 0.35, reading: 0.65, writing: 0.2, translation: 0.55 },
          sectionScores: { writing: 35, listening: 90, reading: 149, translation: 45 }, estimatedScore: 319,
          scoreRange: { low: 264, high: 374 }, weakSkills: ['writing', 'listening'], confidence: 'initial',
        },
        updatedAt: '2026-09-26T08:00:00.000Z',
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });
  await page.reload();
  await expect(page.getByText('预计 319 分')).toBeVisible();
  await expect(page.getByText('初步可信度 · 20 道诊断题')).toBeVisible();
  await expect(page.getByRole('heading', { name: '短文写作', exact: true })).toBeVisible();
  await expect(page.getByText('诊断补强').first()).toBeVisible();

  await page.setViewportSize({ width: 360, height: 800 });
  await page.reload();
  await expect(page.getByText('参考区间 264～374')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('exposes installable PWA metadata', async ({ page, request }) => {
  await page.goto('#/today');
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
  await page.goto('#/account');
  await expect(page.getByRole('heading', { name: '安装到手机桌面' })).toBeVisible();
});

test('keeps one vocabulary cohort and unlocks separate culture and collocation tasks', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('#/practice/vocabulary');
  await expect(page.getByRole('heading', { level: 1, name: '先学单词，再开始做题' })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
  const progress = await page.locator('.vocabulary-warmup header span').textContent();
  const total = Number(progress?.match(/\/(\d+)/)?.[1]);
  expect(total).toBeGreaterThan(0);
  const learnedWords: Array<{ word: string; meaning: string }> = [];
  for (let index = 0; index < total; index += 1) {
    const word = (await page.locator('.warmup-card > h2').textContent()) ?? '';
    await page.getByRole('button', { name: '显示释义' }).click();
    const meaning = (await page.locator('.warmup-answer > strong').textContent()) ?? '';
    learnedWords.push({ word, meaning });
    await page.getByRole('button', { name: index === total - 1 ? '完成单词学习' : '下一个单词' }).click();
    if (index < total - 1) await expect(page.locator('.vocabulary-warmup > header span')).toContainText(`${index + 2}/${total}`);
  }
  await expect(page.getByRole('heading', { level: 1, name: '严格检测今日新词' })).toBeVisible();
  for (let index = 0; index < learnedWords.length; index += 1) {
    const kind = (await page.locator('.check-type').textContent()) ?? '';
    const prompt = (await page.locator('.strict-check-card > h2').textContent()) ?? '';
    const current = kind.includes('看中文')
      ? learnedWords.find((item) => item.meaning === prompt)
      : kind.includes('看英文')
        ? learnedWords.find((item) => item.word === prompt)
        : learnedWords.find((item) => item.word.length === prompt.length && [...prompt].every((letter, position) => letter === '_' || letter === item.word[position]));
    expect(current, `strict question must reuse a word from today's cohort: ${prompt}`).toBeTruthy();
    if (kind !== '看英文，写全中文词义') await page.getByRole('textbox', { name: '英文拼写' }).fill(current!.word);
    if (kind !== '看中文，默写英文') await page.getByRole('textbox', { name: '完整中文词义' }).fill(current!.meaning);
    await page.getByRole('button', { name: index === learnedWords.length - 1 ? '提交并完成检测' : '提交严格检测' }).click();
    const strictFeedback = page.getByRole('alert');
    if (index < learnedWords.length - 1) {
      await Promise.race([
        expect(page.locator('.strict-vocabulary-check > header span')).toContainText(`${index + 2} / ${learnedWords.length}`),
        strictFeedback.waitFor({ state: 'visible' }),
      ]);
      if (await strictFeedback.isVisible()) throw new Error(`strict answer unexpectedly failed: ${await strictFeedback.textContent()}`);
    }
  }
  await expect(page.getByRole('heading', { level: 1, name: '今日词汇训练已完成' })).toBeVisible();
  await page.goto('#/practice/culture');
  await expect(page.getByRole('heading', { level: 1, name: '中国文化翻译' })).toBeVisible();
  await page.getByRole('textbox', { name: '我的英文翻译' }).fill('Chinese culture has a long history and remains important in modern society.');
  await page.getByRole('button', { name: '提交文化翻译' }).click();
  const retryTranslation = page.getByRole('button', { name: '修改后重新提交' });
  await retryTranslation.waitFor();
  const reference = (await page.locator('.translation-result details p').textContent()) ?? '';
  await retryTranslation.click();
  await page.getByRole('textbox', { name: '我的英文翻译' }).fill(reference);
  await page.getByRole('button', { name: '提交文化翻译' }).click();
  await page.getByRole('button', { name: '完成今日文化翻译' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '今日中国文化翻译已完成' })).toBeVisible();
  await page.goto('#/practice/collocation');
  await expect(page.getByRole('heading', { level: 1, name: '单词之后学习重点搭配' })).toBeVisible();
  await page.getByRole('button', { name: '显示搭配释义' }).click();
  await page.getByRole('button', { name: '开始搭配测试' }).click();
  await expect(page.getByRole('textbox', { name: '填写重点搭配' })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
});

test('starts the no-repeat vocabulary review beside its launcher on desktop and phone', async ({ page }) => {
  await page.goto('#/knowledge');
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('cet4-study');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('knowledgeStates', 'readwrite');
      transaction.objectStore('knowledgeStates').put({
        id: 'knowledge:v0001', itemId: 'v0001', status: 'review', favorite: false,
        reviewStage: 0, updatedAt: '2026-09-30T08:00:00.000Z',
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });
  await page.reload();
  await page.getByRole('button', { name: /开始待复习词总巩固，共 1 个/ }).click();
  const launcher = page.getByRole('heading', { name: '无提示待复习总巩固' });
  const exercise = page.getByRole('heading', { name: '待复习单词总巩固' });
  await expect(exercise).toBeVisible();
  await expect(page.getByText(/第 1 \/ 1 题/)).toBeVisible();
  expect(await launcher.evaluate((node, target) => Boolean(node.compareDocumentPosition(target as Node) & Node.DOCUMENT_POSITION_FOLLOWING), await exercise.elementHandle())).toBeTruthy();

  await page.setViewportSize({ width: 360, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('reopens the visited study dashboard while offline', async ({ page, context }) => {
  await page.goto('#/today');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /向目标 425 分前进/ })).toBeVisible();
});

test('continues a full mock into the next locked section', async ({ page, request }) => {
  await page.goto('#/exam/mock-1');
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
