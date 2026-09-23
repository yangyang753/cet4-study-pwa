import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { resolveExam } from './examBlueprint';
import { createExamSession } from './examSessionReducer';
import { ExamSession } from './ExamSession';

function repository(active = undefined as ReturnType<typeof createExamSession> | undefined) {
  return {
    getActiveExamSession: vi.fn().mockResolvedValue(active),
    saveExamSession: vi.fn().mockResolvedValue(undefined),
    completeTask: vi.fn().mockResolvedValue(undefined),
  } as unknown as LearningRepository;
}

afterEach(() => vi.restoreAllMocks());

describe('ExamSession', () => {
  it('renders the official section without revealing feedback and submits once on double click', async () => {
    const repo = repository();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ExamSession mockId="mock-1" repository={repo} />);

    expect(await screen.findByText('写作 · 30 分钟')).toBeVisible();
    expect(screen.queryByText('答案解析')).not.toBeInTheDocument();
    await userEvent.dblClick(screen.getByRole('button', { name: '交卷' }));

    await waitFor(() => {
      const submittedWrites = vi.mocked(repo.saveExamSession).mock.calls.filter(([session]) => session.status === 'submitted');
      expect(submittedWrites).toHaveLength(1);
    });
    expect(repo.completeTask).toHaveBeenCalledWith(expect.objectContaining({ kind: 'mock' }));
    expect(await screen.findByText('掌握度检测')).toBeVisible();
  });

  it('offers to continue a recoverable active session', async () => {
    const active = createExamSession(resolveExam('mock-1'));
    render(<ExamSession mockId="mock-1" repository={repository(active)} />);

    expect(await screen.findByRole('dialog', { name: '继续上次模考' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '继续考试' }));
    expect(await screen.findByText('写作 · 30 分钟')).toBeVisible();
  });
});
