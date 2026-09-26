import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { CollocationCheck } from './CollocationCheck';
import type { CollocationEntry } from './collocationPractice';

const entries: CollocationEntry[] = [
  { id: 'c1', phrase: 'take part in', meaningZh: '参加', example: 'We take part in activities.', exampleZh: '我们参加活动。' },
  { id: 'c2', phrase: 'benefit from', meaningZh: '从……受益', example: 'We benefit from review.', exampleZh: '我们从复习中受益。' },
  { id: 'c3', phrase: 'focus on', meaningZh: '专注于', example: 'Focus on study.', exampleZh: '专注学习。' },
  { id: 'c4', phrase: 'lead to', meaningZh: '导致', example: 'It leads to change.', exampleZh: '它导致变化。' },
];

describe('CollocationCheck', () => {
  it('tests the learner before automatically advancing mastery', async () => {
    const repository = {
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
      upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<CollocationCheck repository={repository} entries={entries} states={[]} now="2026-09-26T08:00:00.000Z" onComplete={() => undefined} />);

    expect(screen.getByRole('heading', { name: 'take part in' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '显示搭配释义' }));
    await userEvent.click(screen.getByRole('button', { name: '开始搭配测试' }));
    await userEvent.click(screen.getByRole('radio', { name: /参加/ }));
    await userEvent.click(screen.getByRole('button', { name: '提交搭配答案' }));

    expect(repository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({
      itemId: 'c1', status: 'review', reviewStage: 1,
    }));
    expect(repository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({
      knowledgeItemId: 'c1', knowledgeKind: 'collocation', stage: 1, lastCorrect: true,
    }));
  });
});
