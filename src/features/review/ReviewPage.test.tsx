import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { LearningDatabase } from '../../data/localDb';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import { ReviewPage } from './ReviewPage';

const names: string[] = [];
afterEach(async () => Promise.all(names.splice(0).map((name) => Dexie.delete(name))));

async function setupRepository() {
  const name = `review-test-${crypto.randomUUID()}`;
  names.push(name);
  const repository = new DexieLearningRepository(new LearningDatabase(name));
  await repository.upsertReviewCard({ id: 'review:listen-01:q1', questionId: 'listen-01:q1', stage: 0, nextReviewAt: '2026-09-23T08:00:00.000Z', lastCorrect: false, updatedAt: '2026-09-23T08:00:00.000Z' });
  return repository;
}

describe('ReviewPage', () => {
  it('opens the real queued question for re-practice', async () => {
    const user = userEvent.setup();
    render(<ReviewPage repository={await setupRepository()} now="2026-09-23T12:00:00.000Z" />);
    await user.click(await screen.findByRole('button', { name: '重新练习' }));
    expect(screen.getByText('When is the additional session available?')).toBeVisible();
  });

  it('advances the review card after a correct re-practice answer', async () => {
    const user = userEvent.setup();
    const repository = await setupRepository();
    render(<ReviewPage repository={repository} now="2026-09-23T12:00:00.000Z" />);
    await user.click(await screen.findByRole('button', { name: '重新练习' }));
    await user.click(screen.getByRole('radio', { name: /Sunday afternoon/ }));
    await user.click(screen.getByRole('button', { name: '提交复习答案' }));
    expect(await screen.findByText('复习正确')).toBeVisible();
    await waitFor(async () => expect(await repository.listDueReviews('9999-12-31T23:59:59.999Z')).toEqual([expect.objectContaining({ stage: 1, lastCorrect: true })]));
  });

  it('automatically completes the review task and offers a mastery check', async () => {
    const user = userEvent.setup();
    const repository = await setupRepository();
    render(<ReviewPage repository={repository} now="2026-09-23T12:00:00.000Z" />);
    await user.click(await screen.findByRole('button', { name: '重新练习' }));
    await user.click(screen.getByRole('radio', { name: /Sunday afternoon/ }));
    await user.click(screen.getByRole('button', { name: '提交复习答案' }));
    expect(await screen.findByText('掌握度检测')).toBeVisible();
    await waitFor(async () => expect((await repository.getDashboardSnapshot()).completions).toEqual([
      expect.objectContaining({ taskId: '2026-09-23:review' }),
    ]));
  });
});
