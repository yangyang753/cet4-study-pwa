import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { MasteryCheck } from './MasteryCheck';
import { selectMasteryQuestions } from './MasteryCheck';
import { getPracticeItems } from '../../content/catalog';
import { decodeMasteryContext, encodeMasteryContext } from './masteryContext';

function repository() {
  return {
    saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
    upsertReviewCard: vi.fn().mockResolvedValue(undefined),
    upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
    completeTask: vi.fn().mockResolvedValue(undefined),
  } as unknown as LearningRepository;
}

describe('MasteryCheck', () => {
  it('round-trips validated route context without duplicate source ids', () => {
    const query = encodeMasteryContext({ taskId: '2026-09-24:listening', kind: 'listening', sourceQuestionIds: ['l1', 'l2', 'l1'] });
    expect(decodeMasteryContext(new URLSearchParams(query), 'vocabulary')).toEqual({
      taskId: '2026-09-24:listening', kind: 'listening', sourceQuestionIds: ['l1', 'l2'],
    });
  });

  it('falls back safely for malformed route context', () => {
    expect(decodeMasteryContext(new URLSearchParams('taskId=x&source=one&source=one'), 'bad-kind')).toMatchObject({
      kind: 'vocabulary', sourceQuestionIds: ['one'],
    });
  });

  it('starts with questions from the practice that was just completed', () => {
    const sourceIds = getPracticeItems('listening').slice(3, 5).map((question) => question.id);

    expect(selectMasteryQuestions('listening', sourceIds).map((question) => question.id)).toEqual(expect.arrayContaining(sourceIds));
    expect(selectMasteryQuestions('listening', sourceIds)).toHaveLength(3);
  });

  it('marks the task mastered after all three contextual answers are correct', async () => {
    const user = userEvent.setup();
    const learningRepository = repository();
    const questions = selectMasteryQuestions('vocabulary');
    render(<MasteryCheck kind="vocabulary" taskId="2026-09-22:vocabulary" repository={learningRepository} now="2026-09-22T09:00:00.000Z" />);

    for (let index = 0; index < 3; index += 1) {
      const correctAnswer = String(questions[index].correctAnswer);
      await user.click(screen.getAllByRole('radio').find((radio) => radio.getAttribute('value') === correctAnswer)!);
      await user.click(screen.getByRole('button', { name: index === 2 ? '完成检测' : '提交答案' }));
      if (index < 2) await user.click(await screen.findByRole('button', { name: '下一题' }));
    }

    expect(await screen.findByText('已完全掌握')).toBeVisible();
    expect(learningRepository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({
      id: 'mastery:2026-09-22:vocabulary', status: 'mastered',
    }));
  });

  it('schedules a review when either mastery answer is wrong', async () => {
    const user = userEvent.setup();
    const learningRepository = repository();
    const questions = selectMasteryQuestions('vocabulary');
    render(<MasteryCheck kind="vocabulary" taskId="2026-09-22:vocabulary" repository={learningRepository} now="2026-09-22T09:00:00.000Z" />);

    const wrongOption = questions[0].options.find((option) => option.id !== questions[0].correctAnswer)!;
    await user.click(screen.getAllByRole('radio').find((radio) => radio.getAttribute('value') === wrongOption.id)!);
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    await user.click(await screen.findByRole('button', { name: '下一题' }));
    await user.click(screen.getAllByRole('radio').find((radio) => radio.getAttribute('value') === String(questions[1].correctAnswer))!);
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    await user.click(await screen.findByRole('button', { name: '下一题' }));
    await user.click(screen.getAllByRole('radio').find((radio) => radio.getAttribute('value') === String(questions[2].correctAnswer))!);
    await user.click(screen.getByRole('button', { name: '完成检测' }));

    expect(await screen.findByText('需要继续复习')).toBeVisible();
    expect(learningRepository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ status: 'review' }));
    expect(learningRepository.upsertReviewCard).toHaveBeenCalledTimes(1);
  });
});
