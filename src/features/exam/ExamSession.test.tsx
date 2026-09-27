import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

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

  it('lets the learner finish a section early and continue to the next section', async () => {
    const repo = repository();
    vi.stubEnv('BASE_URL', '/cet4-study-pwa/');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ExamSession mockId="mock-1" repository={repo} now={() => '2026-09-23T08:00:00.000Z'} />);

    await userEvent.click(await screen.findByRole('button', { name: '完成写作并进入听力' }));

    expect(await screen.findByText('当前分区：听力（25 分钟）')).toBeVisible();
    expect(screen.getByLabelText('模考听力音频')).toHaveAttribute('src', expect.stringContaining('/cet4-study-pwa/audio/'));
    await waitFor(() => expect(repo.saveExamSession).toHaveBeenCalledWith(expect.objectContaining({
      currentSectionIndex: 1,
      lockedSectionIndexes: [0],
    })));
  });

  it('shows a real save failure, keeps the answer, and retries before claiming success', async () => {
    const repo = repository();
    vi.mocked(repo.saveExamSession).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('disk')).mockResolvedValue(undefined);
    render(<ExamSession mockId="mock-1" repository={repo} />);
    const answer = await screen.findByLabelText('写作答题区');
    fireEvent.change(answer, { target: { value: 'My saved draft.' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
    expect(answer).toHaveValue('My saved draft.');
    await userEvent.click(screen.getByRole('button', { name: '重新保存' }));
    expect(await screen.findByRole('status')).toHaveTextContent('已保存');
  });

  it('serializes rapid answer saves so an older write cannot overwrite the latest answer', async () => {
    const repo = repository();
    render(<ExamSession mockId="mock-1" repository={repo} />);
    const answer = await screen.findByLabelText('写作答题区');
    await waitFor(() => expect(repo.saveExamSession).toHaveBeenCalledTimes(1));
    let releaseFirst!: () => void;
    vi.mocked(repo.saveExamSession).mockImplementationOnce(() => new Promise<void>((resolve) => { releaseFirst = resolve; })).mockResolvedValue(undefined);
    fireEvent.change(answer, { target: { value: 'old' } });
    fireEvent.change(answer, { target: { value: 'latest answer' } });
    await waitFor(() => expect(repo.saveExamSession).toHaveBeenCalledTimes(2));
    expect(repo.saveExamSession).toHaveBeenCalledTimes(2);
    releaseFirst();
    await waitFor(() => expect(repo.saveExamSession).toHaveBeenCalledTimes(3));
    const questionId = resolveExam('mock-1').sections[0].questions[0].id;
    expect(vi.mocked(repo.saveExamSession).mock.calls[2][0].answers[questionId]).toBe('latest answer');
  });
});
