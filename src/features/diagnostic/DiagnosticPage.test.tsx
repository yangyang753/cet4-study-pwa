import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPracticeItems } from '../../content/catalog';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DiagnosticPage } from './DiagnosticPage';
import { scoreDiagnostic, selectDiagnosticWeakSkill } from './diagnostic';
import { DIAGNOSTIC_SESSION_KEY } from './diagnosticSession';

describe('foundation diagnostic', () => {
  afterEach(() => localStorage.clear());
  it('scores each category independently without an official exam score', () => {
    const result = scoreDiagnostic([
      { questionId: 'v1', kind: 'vocabulary', correct: true },
      { questionId: 'v2', kind: 'vocabulary', correct: false },
      { questionId: 'g1', kind: 'grammar', correct: true },
      { questionId: 'l1', kind: 'listening', correct: false },
      { questionId: 'r1', kind: 'reading', correct: true },
    ], '2026-09-24T09:00:00.000Z');
    expect(result.completedAt).toBe('2026-09-24T09:00:00.000Z');
    expect(result.levels).toMatchObject({ vocabulary: 0.5, grammar: 1, listening: 0, reading: 1 });
    expect(result).not.toHaveProperty('officialScore');
  });

  it('keeps untested categories absent instead of treating them as weaknesses', () => {
    const result = scoreDiagnostic([], '2026-09-24T09:00:00.000Z');
    expect(result.levels).toEqual({});
  });

  it('ignores legacy zeroes for untested writing and translation', () => {
    expect(selectDiagnosticWeakSkill({ vocabulary: 0.67, grammar: 0.33, listening: 0.67, reading: 1, writing: 0, translation: 0 })).toBe('grammar');
  });

  it('provides audio controls for a listening diagnostic question', () => {
    const listeningQuestion = getPracticeItems('listening')[0];
    render(<DiagnosticPage questions={[{ ...listeningQuestion, diagnosticKind: 'listening' }]} />);
    expect(screen.getByLabelText('诊断听力音频')).toHaveAttribute('controls');
  });

  it('shows tested percentages and the selected learning priority after completion', async () => {
    const user = userEvent.setup();
    const grammarQuestion = getPracticeItems('grammar')[0];
    if (!('correctAnswer' in grammarQuestion)) throw new Error('Expected an objective grammar question');
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ settings: { id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-23T00:00:00.000Z' } }),
      saveUserSettings: vi.fn().mockResolvedValue(undefined),
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<DiagnosticPage repository={repository} questions={[{ ...grammarQuestion, diagnosticKind: 'grammar' }]} />);
    await user.click(screen.getAllByRole('radio').find((radio) => radio.getAttribute('value') === String(grammarQuestion.correctAnswer))!);
    await user.click(screen.getByRole('button', { name: '完成诊断' }));
    expect(await screen.findByText('语法：100%')).toBeVisible();
    expect(screen.getByText('优先加强：语法')).toBeVisible();
    expect(screen.getByText(/距离 425 分还差/)).toBeVisible();
    expect(screen.getByText('分项参考分')).toBeVisible();
    expect(screen.getByRole('button', { name: '重新诊断' })).toBeVisible();
    expect(repository.saveAttemptOnce).toHaveBeenCalledWith(expect.objectContaining({ mode: 'diagnostic', kind: 'grammar' }));
    expect(repository.saveUserSettings).toHaveBeenCalledWith(expect.objectContaining({ diagnosticProfile: expect.objectContaining({ version: 2 }) }));
  });

  it('keeps the current answer and offers retry when saving an answer fails', async () => {
    const user = userEvent.setup();
    const grammarQuestion = getPracticeItems('grammar')[0];
    if (!('correctAnswer' in grammarQuestion)) throw new Error('Expected objective question');
    const repository = { saveAttemptOnce: vi.fn().mockRejectedValue(new Error('offline')) } as unknown as LearningRepository;
    render(<DiagnosticPage repository={repository} questions={[{ ...grammarQuestion, diagnosticKind: 'grammar' }]} />);
    await user.click(screen.getAllByRole('radio')[0]);
    await user.click(screen.getByRole('button', { name: '完成诊断' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
    expect(screen.getAllByRole('radio')[0]).toBeChecked();
    expect(screen.getByRole('button', { name: '重新保存并完成' })).toBeEnabled();
  });

  it('offers to continue or restart a valid unfinished diagnostic', async () => {
    const user = userEvent.setup();
    const grammarQuestion = getPracticeItems('grammar')[0];
    localStorage.setItem(DIAGNOSTIC_SESSION_KEY, JSON.stringify({
      version: 2, sessionId: 'saved-session', date: '2026-09-26', questionIds: [grammarQuestion.id],
      kinds: { vocabulary: 0, grammar: 1, listening: 0, reading: 0, writing: 0, translation: 0 },
      currentIndex: 0, answers: [], startedAt: '2026-09-26T08:00:00.000Z', updatedAt: '2026-09-26T08:00:00.000Z',
    }));
    render(<DiagnosticPage questions={[{ ...grammarQuestion, diagnosticKind: 'grammar' }]} />);
    expect(screen.getByRole('heading', { name: '继续上次诊断' })).toBeVisible();
    expect(screen.getByRole('button', { name: '重新开始诊断' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '继续上次诊断' }));
    expect(screen.getByRole('heading', { name: '先测试，再按弱项学习' })).toBeVisible();
  });

  it('reuses the same attempt id when final profile saving must be retried', async () => {
    const user = userEvent.setup();
    const grammarQuestion = getPracticeItems('grammar')[0];
    const saveAttemptOnce = vi.fn().mockResolvedValue(undefined);
    const repository = {
      saveAttemptOnce,
      getDashboardSnapshot: vi.fn().mockResolvedValue({ settings: { id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-23T00:00:00.000Z' } }),
      saveUserSettings: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<DiagnosticPage repository={repository} questions={[{ ...grammarQuestion, diagnosticKind: 'grammar' }]} />);
    await user.click(screen.getAllByRole('radio')[0]);
    await user.click(screen.getByRole('button', { name: '完成诊断' }));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: '重新保存并完成' }));
    expect(await screen.findByText(/预计.*分/)).toBeVisible();
    expect(saveAttemptOnce).toHaveBeenCalledTimes(2);
    expect(saveAttemptOnce.mock.calls[0][0].id).toBe(saveAttemptOnce.mock.calls[1][0].id);
  });
});
