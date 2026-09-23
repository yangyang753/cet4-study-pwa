import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { MasteryCheck } from './MasteryCheck';
import { selectMasteryQuestions } from './MasteryCheck';
import { getPracticeItems } from '../../content/catalog';

function repository() {
  return {
    saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
    upsertReviewCard: vi.fn().mockResolvedValue(undefined),
    upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
  } as unknown as LearningRepository;
}

describe('MasteryCheck', () => {
  it('starts with questions from the practice that was just completed', () => {
    const sourceIds = getPracticeItems('listening').slice(3, 5).map((question) => question.id);

    expect(selectMasteryQuestions('listening', sourceIds).map((question) => question.id)).toEqual(sourceIds);
  });

  it('marks the task mastered only after two correct answers', async () => {
    const user = userEvent.setup();
    const learningRepository = repository();
    render(<MasteryCheck kind="vocabulary" taskId="2026-09-22:vocabulary" repository={learningRepository} now="2026-09-22T09:00:00.000Z" />);

    for (let index = 0; index < 2; index += 1) {
      await user.click(screen.getAllByRole('radio')[0]);
      await user.click(screen.getByRole('button', { name: index === 0 ? '提交答案' : '完成检测' }));
      if (index === 0) await user.click(await screen.findByRole('button', { name: '下一题' }));
    }

    expect(await screen.findByText('已完全掌握')).toBeVisible();
    expect(learningRepository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({
      id: 'mastery:2026-09-22:vocabulary', status: 'mastered',
    }));
  });

  it('schedules a review when either mastery answer is wrong', async () => {
    const user = userEvent.setup();
    const learningRepository = repository();
    render(<MasteryCheck kind="vocabulary" taskId="2026-09-22:vocabulary" repository={learningRepository} now="2026-09-22T09:00:00.000Z" />);

    await user.click(screen.getAllByRole('radio')[1]);
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    await user.click(await screen.findByRole('button', { name: '下一题' }));
    await user.click(screen.getAllByRole('radio')[0]);
    await user.click(screen.getByRole('button', { name: '完成检测' }));

    expect(await screen.findByText('需要继续复习')).toBeVisible();
    expect(learningRepository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ status: 'review' }));
    expect(learningRepository.upsertReviewCard).toHaveBeenCalledTimes(1);
  });
});
