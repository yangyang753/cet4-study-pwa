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

function repository() {
  return {
    saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
    upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
    upsertReviewCard: vi.fn().mockResolvedValue(undefined),
  } as unknown as LearningRepository;
}

describe('CollocationCheck', () => {
  it('tests the learner with free response before automatically advancing mastery', async () => {
    const learningRepository = repository();
    render(<CollocationCheck repository={learningRepository} entries={entries} states={[]} now="2026-09-26T08:00:00.000Z" random={() => 0} onComplete={() => undefined} />);

    expect(screen.getByRole('heading', { name: 'take part in' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '显示搭配释义' }));
    await userEvent.click(screen.getByRole('button', { name: '开始搭配测试' }));
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: '填写重点搭配' }), 'take part in');
    await userEvent.click(screen.getByRole('button', { name: '提交搭配答案' }));

    expect(learningRepository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'c1', status: 'review', reviewStage: 1 }));
    expect(learningRepository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({ knowledgeItemId: 'c1', knowledgeKind: 'collocation', stage: 1, lastCorrect: true }));
  });

  it('does not advance after a wrong answer until the same collocation is passed', async () => {
    const learningRepository = repository();
    render(<CollocationCheck repository={learningRepository} entries={entries} states={[]} now="2026-09-26T08:00:00.000Z" random={() => 0} onComplete={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: '显示搭配释义' }));
    await userEvent.click(screen.getByRole('button', { name: '开始搭配测试' }));
    await userEvent.type(screen.getByRole('textbox', { name: '填写重点搭配' }), 'benefit from');
    await userEvent.click(screen.getByRole('button', { name: '提交搭配答案' }));
    expect(await screen.findByRole('button', { name: '重新测试这个搭配' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '下一个重点搭配' })).not.toBeInTheDocument();
  });

  it('retries from the failed local state instead of restoring an old mastery stage', async () => {
    const learningRepository = repository();
    const states = [{ id: 'knowledge:c1', itemId: 'c1', status: 'review' as const, favorite: false, reviewStage: 3, lapseCount: 0, updatedAt: '2026-09-25T08:00:00.000Z' }];
    render(<CollocationCheck repository={learningRepository} entries={entries} states={states} now="2026-09-26T08:00:00.000Z" random={() => 0} onComplete={() => undefined} />);
    await userEvent.click(screen.getByRole('button', { name: '显示搭配释义' }));
    await userEvent.click(screen.getByRole('button', { name: '开始搭配测试' }));
    await userEvent.type(screen.getByRole('textbox', { name: '填写重点搭配' }), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: '提交搭配答案' }));
    await userEvent.click(await screen.findByRole('button', { name: '重新测试这个搭配' }));
    await userEvent.type(screen.getByRole('textbox', { name: '填写重点搭配' }), 'take part in');
    await userEvent.click(screen.getByRole('button', { name: '提交搭配答案' }));
    expect(learningRepository.upsertKnowledgeState).toHaveBeenLastCalledWith(expect.objectContaining({ reviewStage: 0, lapseCount: 1 }));
  });
});
