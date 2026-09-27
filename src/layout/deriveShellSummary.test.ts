import { describe, expect, it } from 'vitest';
import type { DashboardSnapshot } from '../domain/learning';
import { deriveShellSummary } from './deriveShellSummary';

const snapshot = (overrides: Partial<DashboardSnapshot> = {}): DashboardSnapshot => ({
  attempts: [],
  dueReviews: [
    { id: 'r1', questionId: 'q1', stage: 1, nextReviewAt: '2026-09-27T00:00:00.000Z', lastCorrect: false, updatedAt: '2026-09-27T00:00:00.000Z' },
    { id: 'r2', questionId: 'q2', stage: 2, nextReviewAt: '2026-09-27T00:00:00.000Z', lastCorrect: true, updatedAt: '2026-09-27T00:00:00.000Z' },
  ],
  completions: [
    { id: 'c1', date: '2026-09-27', taskId: '2026-09-27:vocabulary', kind: 'vocabulary', completedAt: '2026-09-27T01:00:00.000Z' },
    { id: 'c2', date: '2026-09-27', taskId: '2026-09-27:listening', kind: 'listening', completedAt: '2026-09-27T02:00:00.000Z' },
    { id: 'old', date: '2026-09-26', taskId: '2026-09-26:review', kind: 'review', completedAt: '2026-09-26T02:00:00.000Z' },
  ],
  knowledgeStates: [],
  settings: { id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-27T00:00:00.000Z' },
  ...overrides,
});

describe('deriveShellSummary', () => {
  it('derives today completion and due review totals', () => {
    expect(deriveShellSummary(snapshot(), '2026-09-27')).toEqual({
      completed: 2,
      total: 4,
      dueReviews: 2,
      daysToExam: 76,
      phaseLabel: '基础补强期',
    });
  });

  it('clamps past exam countdown to zero', () => {
    const result = deriveShellSummary(snapshot({ settings: { ...snapshot().settings, examDate: '2026-09-01' } }), '2026-09-27');
    expect(result.daysToExam).toBe(0);
    expect(result.phaseLabel).toBe('冲刺模拟期');
  });
});
