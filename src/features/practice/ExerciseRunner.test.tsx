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
    const repository = { saveAttempt: vi.fn().mockResolvedValue(undefined) } as unknown as LearningRepository;
    render(<ExerciseRunner setId="set-starter" repository={repository} userId="learner-1" />);
    await user.click(screen.getByRole('radio', { name: /encourage/ }));
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    expect(repository.saveAttempt).toHaveBeenCalledWith(expect.objectContaining({ userId: 'learner-1', response: 'A', correct: true }));
  });
});
