import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { getPracticeItems } from '../../content/catalog';
import { ExerciseRunner } from './ExerciseRunner';

const validWriting = `First, daily practice helps students remember important knowledge and notice their weak points before an examination. A clear routine also makes a difficult goal feel smaller, so learners are more willing to begin instead of waiting for the perfect moment.

Therefore, I plan to study at the same time each evening, review mistakes, and write down one question for the next day. This simple method gives every session a purpose and allows steady progress without creating unnecessary pressure. It also builds confidence because improvement becomes visible after several consistent weeks.`;

describe('ExerciseRunner', () => {
  it('waits for attempt history before showing a catalog question', async () => {
    let resolveAttempts!: (value: []) => void;
    const repository = {
      listAttempts: vi.fn().mockReturnValue(new Promise<[]>(resolve => { resolveAttempts = resolve; })),
    } as unknown as LearningRepository;
    render(<ExerciseRunner kind="reading" limit={1} repository={repository} />);
    expect(screen.getByText('正在根据学习记录选题…')).toBeVisible();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    resolveAttempts([]);
    expect((await screen.findAllByRole('radio'))[0]).toBeVisible();
  });

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

  it('retries a failed objective save before allowing progress', async () => {
    const user = userEvent.setup();
    const saveAttemptOnce = vi.fn()
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValueOnce(undefined);
    const repository = { saveAttemptOnce } as unknown as LearningRepository;
    render(<ExerciseRunner setId="set-starter" repository={repository} />);

    await user.click(screen.getByRole('radio', { name: /encourage/ }));
    await user.click(screen.getByRole('button', { name: '提交答案' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
    expect(screen.getByRole('button', { name: /下一题|查看结果/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '重新保存' }));

    expect(await screen.findByText('已保存到本机，联网后自动同步')).toBeVisible();
    expect(saveAttemptOnce).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: /下一题|查看结果/ })).toBeEnabled();
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

  it('renders the writing editor for catalog writing practice', async () => {
    render(<ExerciseRunner kind="writing" limit={1} />);
    expect(await screen.findByRole('textbox', { name: '写作答题区' })).toBeVisible();
  });

  it('saves valid subjective submissions with bounded local self-check evidence', async () => {
    const user = userEvent.setup();
    const repository = { saveDraft: vi.fn().mockResolvedValue(undefined), saveAttemptOnce: vi.fn().mockResolvedValue(undefined), completeTask: vi.fn().mockResolvedValue(undefined) } as unknown as LearningRepository;
    render(<ExerciseRunner kind="writing" limit={1} repository={repository} />);
    fireEvent.change(await screen.findByRole('textbox', { name: '写作答题区' }), { target: { value: validWriting } });
    await user.click(screen.getByRole('button', { name: '提交自查' }));
    expect(repository.saveAttemptOnce).toHaveBeenCalledWith(expect.objectContaining({ response: validWriting, correct: true, score: 1 }));
  });

  it('does not save or complete a short subjective response', async () => {
    const user = userEvent.setup();
    const repository = { listAttempts: vi.fn().mockResolvedValue([]), saveDraft: vi.fn().mockResolvedValue(undefined), saveAttemptOnce: vi.fn(), completeTask: vi.fn() } as unknown as LearningRepository;
    render(<ExerciseRunner kind="writing" limit={1} repository={repository} />);
    fireEvent.change(await screen.findByRole('textbox', { name: '写作答题区' }), { target: { value: 'Too short.' } });
    await user.click(screen.getByRole('button', { name: '提交自查' }));
    expect(screen.getByRole('alert')).toHaveTextContent('至少需要 80 个英文单词');
    expect(repository.saveAttemptOnce).not.toHaveBeenCalled();
    expect(repository.completeTask).not.toHaveBeenCalled();
  });

  it('does not reveal explanations while running in exam mode', async () => {
    const user = userEvent.setup();
    const repository = { saveAttemptOnce: vi.fn().mockResolvedValue(undefined) } as unknown as LearningRepository;
    render(<ExerciseRunner kind="vocabulary" limit={1} mode="exam" repository={repository} />);
    await user.click((await screen.findAllByRole('radio'))[0]);
    await user.click(await screen.findByRole('button', { name: '提交答案' }));
    expect(screen.queryByText('答案解析')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '蒙对' })).not.toBeInTheDocument();
  });

  it('requires an objective response before saving', async () => {
    const user = userEvent.setup();
    const repository = { saveAttemptOnce: vi.fn().mockResolvedValue(undefined) } as unknown as LearningRepository;
    render(<ExerciseRunner kind="reading" limit={1} repository={repository} />);
    await user.click(await screen.findByRole('button', { name: '提交答案' }));
    expect(screen.getByText('请选择一个答案')).toBeVisible();
    expect(repository.saveAttemptOnce).not.toHaveBeenCalled();
  });

  it('replaces attempted catalog questions with unseen questions from history', async () => {
    const questions = getPracticeItems('reading');
    const unseen = questions[questions.length - 1];
    const repository = {
      listAttempts: vi.fn().mockResolvedValue(questions.slice(0, -1).map((question, index) => ({
        id: `attempt-${index}`, userId: 'learner', questionId: question.id, response: 'A', correct: true,
        score: 1, durationSeconds: 10, kind: 'reading', mode: 'practice', createdAt: '2026-09-23T08:00:00.000Z',
      }))),
    } as unknown as LearningRepository;

    render(<ExerciseRunner kind="reading" limit={1} repository={repository} today="2026-09-24" />);

    expect(await screen.findByText(unseen.prompt)).toBeVisible();
  });

  it('automatically completes the matching daily task after the final answer', async () => {
    const user = userEvent.setup();
    const repository = {
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
      completeTask: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<ExerciseRunner kind="vocabulary" limit={1} repository={repository} today="2026-09-22" />);
    await user.click((await screen.findAllByRole('radio'))[0]);
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    await user.click(await screen.findByRole('button', { name: '查看结果' }));
    expect(await screen.findByText('掌握度检测')).toBeVisible();
    expect(repository.completeTask).toHaveBeenCalledWith(expect.objectContaining({
      id: '2026-09-22:vocabulary', taskId: '2026-09-22:vocabulary', kind: 'vocabulary',
    }));
  });

  it('automatically completes grammar and opens its mastery check', async () => {
    const user = userEvent.setup();
    const repository = {
      listAttempts: vi.fn().mockResolvedValue([]),
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
      completeTask: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<ExerciseRunner kind="grammar" limit={1} repository={repository} today="2026-09-24" />);
    await user.click((await screen.findAllByRole('radio'))[0]);
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    await user.click(await screen.findByRole('button', { name: '查看结果' }));
    expect(await screen.findByText('掌握度检测')).toBeVisible();
    expect(repository.completeTask).toHaveBeenCalledWith(expect.objectContaining({ kind: 'grammar' }));
  });

  it('persists subjective self-check evidence as a score and correctness result', async () => {
    const user = userEvent.setup();
    const repository = {
      listAttempts: vi.fn().mockResolvedValue([]),
      saveDraft: vi.fn().mockResolvedValue(undefined),
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
      completeTask: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<ExerciseRunner kind="writing" limit={1} repository={repository} />);
    fireEvent.change(await screen.findByRole('textbox', { name: '写作答题区' }), { target: { value: validWriting } });
    await user.click(screen.getByRole('button', { name: '提交自查' }));
    expect(repository.saveAttemptOnce).toHaveBeenCalledWith(expect.objectContaining({ kind: 'writing', correct: true, score: 1 }));
  });
});
