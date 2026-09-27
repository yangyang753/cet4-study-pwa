import { expect, test } from '@playwright/test';

test('opens existing version-five learning data without losing records or the active mock', async ({ page }) => {
  await page.goto('#/today');
  const seededCounts = await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const deletion = indexedDB.deleteDatabase('cet4-study');
      deletion.onsuccess = () => resolve();
      deletion.onerror = () => reject(deletion.error);
      deletion.onblocked = () => reject(new Error('database deletion blocked'));
    });
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('cet4-study', 50);
      request.onupgradeneeded = () => {
        const db = request.result;
        const schemas: Record<string, string[]> = {
          attempts: ['userId', 'questionId', 'createdAt'], drafts: ['questionId', 'updatedAt'], plans: ['date', 'updatedAt'],
          syncQueue: ['entityId', 'kind', 'createdAt'], reviewCards: ['questionId', 'nextReviewAt', 'updatedAt'],
          taskCompletions: ['date', 'taskId', 'kind', 'completedAt'], knowledgeStates: ['itemId', 'status', 'updatedAt'],
          settings: ['updatedAt'], examSessions: ['status', 'updatedAt'], tombstones: ['kind', 'entityId', 'updatedAt'], syncCursors: ['updatedAt'],
        };
        for (const [name, indexes] of Object.entries(schemas)) {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          for (const index of indexes) store.createIndex(index, index);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['attempts', 'reviewCards', 'knowledgeStates', 'settings', 'examSessions'], 'readwrite');
        transaction.objectStore('attempts').put({ id: 'legacy-attempt', userId: 'local', questionId: 'listen-01:q1', response: 'B', correct: true, score: 1, durationSeconds: 20, createdAt: '2026-09-26T08:00:00.000Z' });
        transaction.objectStore('reviewCards').put({ id: 'legacy-review', questionId: 'listen-01:q1', stage: 1, nextReviewAt: '2026-09-27T08:00:00.000Z', lastCorrect: false, updatedAt: '2026-09-26T08:00:00.000Z' });
        transaction.objectStore('knowledgeStates').put({ id: 'legacy-knowledge', itemId: 'v0001', status: 'review', favorite: false, updatedAt: '2026-09-26T08:00:00.000Z' });
        transaction.objectStore('settings').put({ id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, examDateConfirmedAt: '2026-09-26T08:00:00.000Z', updatedAt: '2026-09-26T08:00:00.000Z' });
        transaction.objectStore('examSessions').put({ id: 'legacy-exam', mockId: 'mock-1', contentVersion: 'v2', startedAt: '2026-09-26T08:00:00.000Z', updatedAt: '2026-09-26T08:20:00.000Z', sectionDeadlines: ['2099-01-01T00:00:00.000Z'], currentSectionIndex: 0, currentQuestionIndex: 0, lockedSectionIndexes: [], answers: { 'write-01': 'saved answer' }, status: 'active' });
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
    const verify = indexedDB.open('cet4-study');
    const db = await new Promise<IDBDatabase>((resolve, reject) => { verify.onsuccess = () => resolve(verify.result); verify.onerror = () => reject(verify.error); });
    const names = ['attempts', 'reviewCards', 'knowledgeStates', 'settings', 'examSessions'];
    return Object.fromEntries(await Promise.all(names.map((name) => new Promise<[string, number]>((resolve, reject) => {
      const count = db.transaction(name).objectStore(name).count();
      count.onsuccess = () => resolve([name, count.result]);
      count.onerror = () => reject(count.error);
    }))));
  });
  expect(seededCounts).toEqual({ attempts: 1, reviewCards: 1, knowledgeStates: 1, settings: 1, examSessions: 1 });
  await page.reload();
  const counts = await page.evaluate(async () => {
    const request = indexedDB.open('cet4-study');
    const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const names = ['attempts', 'reviewCards', 'knowledgeStates', 'settings', 'examSessions'];
    return Object.fromEntries(await Promise.all(names.map((name) => new Promise<[string, number]>((resolve, reject) => {
      const count = db.transaction(name).objectStore(name).count();
      count.onsuccess = () => resolve([name, count.result]);
      count.onerror = () => reject(count.error);
    }))));
  });
  expect(counts).toEqual({ attempts: 1, reviewCards: 1, knowledgeStates: 1, settings: 1, examSessions: 1 });
  await page.goto('#/exam/mock-1');
  await expect(page.getByRole('heading', { name: '继续上次模考' })).toBeVisible();
  await expect(page.getByRole('button', { name: '继续考试' })).toBeVisible();
});
