import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { ExerciseRunner } from './ExerciseRunner';

describe('ExerciseRunner', () => {
  it('reveals the explanation after an answer is submitted', async () => {
    const user = userEvent.setup();
    render(<ExerciseRunner setId="set-starter" />);
    await user.click(screen.getByRole('radio', { name: /encourage/ }));
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    expect(screen.getByText(/encourage sb\. to do sth/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '蒙对' })).toBeInTheDocument();
  });

  it('stores a submitted answer in the local-first repository', async () => {
    const user = userEvent.setup();
    const repository = { saveAttemptOnce: vi.fn().mockResolvedValue(undefined) } as unknown as LearningRepository;
    render(<ExerciseRunner setId="set-starter" repository={repository} userId="learner-1" />);
    await user.click(screen.getByRole('radio', { name: /encourage/ }));
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    expect(repository.saveAttemptOnce).toHaveBeenCalledWith(expect.objectContaining({ userId: 'learner-1', response: 'A', correct: true }));
  });

  it('persists the selected mistake reason on the same attempt', async () => {
    const user = userEvent.setup();
    const repository = {
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
      saveAttempt: vi.fn().mockResolvedValue(undefined),
      getReviewCard: vi.fn().mockResolvedValue(null),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<ExerciseRunner setId="set-starter" repository={repository} userId="learner-1" />);

    await user.click(screen.getByRole('radio', { name: /encourage/ }));
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    await screen.findByText('已保存到本机，联网后自动同步');
    await user.click(screen.getByRole('button', { name: '蒙对' }));

    const original = vi.mocked(repository.saveAttemptOnce).mock.calls[0][0];
    expect(repository.saveAttempt).toHaveBeenCalledWith(expect.objectContaining({
      id: original.id,
      mistakeReason: 'guessed',
    }));
    expect(repository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({
      questionId: original.questionId,
      priority: 5,
      reason: 'guessed',
    }));
  });

  it('adds an incorrectly answered practice question to the review queue', async () => {
    const user = userEvent.setup();
    const repository = {
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<ExerciseRunner setId="set-starter" repository={repository} />);

    await user.click(screen.getAllByRole('radio')[1]);
    await user.click(screen.getByRole('button', { name: '提交答案' }));

    await screen.findByText('已保存到本机，联网后自动同步');
    expect(repository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({
      questionId: expect.any(String),
      stage: 0,
      lastCorrect: false,
    }));
  });

  it('renders the writing editor for catalog writing practice', () => {
    render(<ExerciseRunner kind="writing" limit={1} />);
    expect(screen.getByRole('textbox', { name: '写作答题区' })).toBeVisible();
  });

  it('saves subjective submissions without assigning automatic correctness', async () => {
    const user = userEvent.setup();
    const repository = { saveDraft: vi.fn().mockResolvedValue(undefined), saveAttemptOnce: vi.fn().mockResolvedValue(undefined), completeTask: vi.fn().mockResolvedValue(undefined) } as unknown as LearningRepository;
    render(<ExerciseRunner kind="writing" limit={1} repository={repository} />);
    await user.type(screen.getByRole('textbox', { name: '写作答题区' }), 'Daily reading helps me learn.');
    await user.click(screen.getByRole('button', { name: '提交自查' }));
    expect(repository.saveAttemptOnce).toHaveBeenCalledWith(expect.objectContaining({ response: 'Daily reading helps me learn.', correct: null, score: null }));
  });

  it('does not reveal explanations while running in exam mode', async () => {
    const user = userEvent.setup();
    const repository = { saveAttemptOnce: vi.fn().mockResolvedValue(undefined) } as unknown as LearningRepository;
    render(<ExerciseRunner kind="vocabulary" limit={1} mode="exam" repository={repository} />);
    await user.click(screen.getAllByRole('radio')[0]);
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    expect(screen.queryByText('答案解析')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '蒙对' })).not.toBeInTheDocument();
  });

  it('requires an objective response before saving', async () => {
    const user = userEvent.setup();
    const repository = { saveAttemptOnce: vi.fn().mockResolvedValue(undefined) } as unknown as LearningRepository;
    render(<ExerciseRunner kind="reading" limit={1} repository={repository} />);
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    expect(screen.getByText('请选择一个答案')).toBeVisible();
    expect(repository.saveAttemptOnce).not.toHaveBeenCalled();
  });

  it('automatically completes the matching daily task after the final answer', async () => {
    const user = userEvent.setup();
    const repository = {
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
      completeTask: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<ExerciseRunner kind="vocabulary" limit={1} repository={repository} today="2026-09-22" />);
    await user.click(screen.getAllByRole('radio')[0]);
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    await user.click(await screen.findByRole('button', { name: '查看结果' }));
    expect(repository.completeTask).toHaveBeenCalledWith(expect.objectContaining({
      id: '2026-09-22:vocabulary', taskId: '2026-09-22:vocabulary', kind: 'vocabulary',
    }));
    expect(await screen.findByText('掌握度检测')).toBeVisible();
  });
});
