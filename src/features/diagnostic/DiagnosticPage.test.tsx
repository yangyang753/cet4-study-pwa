import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getPracticeItems } from '../../content/catalog';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DiagnosticPage } from './DiagnosticPage';
import { scoreDiagnostic, selectDiagnosticWeakSkill } from './diagnostic';

describe('foundation diagnostic', () => {
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
    } as unknown as LearningRepository;
    render(<DiagnosticPage repository={repository} questions={[{ ...grammarQuestion, diagnosticKind: 'grammar' }]} />);
    await user.click(screen.getAllByRole('radio').find((radio) => radio.getAttribute('value') === String(grammarQuestion.correctAnswer))!);
    await user.click(screen.getByRole('button', { name: '完成诊断' }));
    expect(await screen.findByText('语法：100%')).toBeVisible();
    expect(screen.getByText('优先加强：语法')).toBeVisible();
  });
});
