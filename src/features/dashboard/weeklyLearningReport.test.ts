import { describe, expect, it } from 'vitest';
import type { DashboardSnapshot } from '../../domain/learning';
import { buildWeeklyLearningReport } from './weeklyLearningReport';

const settings = { id: 'current' as const, examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-27T00:00:00.000Z' };
const base = (overrides: Partial<DashboardSnapshot> = {}): DashboardSnapshot => ({ attempts: [], dueReviews: [], completions: [], knowledgeStates: [], settings, examSessions: [], ...overrides });

describe('buildWeeklyLearningReport', () => {
  it('returns an honest empty report', () => {
    expect(buildWeeklyLearningReport(base(), '2026-09-27')).toMatchObject({
      activeDays: 0, attemptCount: 0, accuracyByKind: [], masteredCount: 0, lapseCount: 0,
      recentMockMinimum: null, mockSampleCount: 0, priorities: [],
    });
  });

  it('includes the seven-day boundary and excludes older activity', () => {
    const report = buildWeeklyLearningReport(base({
      attempts: [
        { id: 'a1', userId: 'local', questionId: 'q1', response: 'A', correct: true, score: 1, durationSeconds: 10, kind: 'reading', mode: 'practice', createdAt: '2026-09-20T16:00:00.000Z' },
        { id: 'a2', userId: 'local', questionId: 'q2', response: 'A', correct: false, score: 0, durationSeconds: 10, kind: 'reading', mode: 'practice', createdAt: '2026-09-20T15:59:59.000Z' },
      ],
      completions: [{ id: 'c1', date: '2026-09-27', taskId: '2026-09-27:listening', kind: 'listening', completedAt: '2026-09-27T02:00:00.000Z' }],
    }), '2026-09-27');
    expect(report.activeDays).toBe(2);
    expect(report.attemptCount).toBe(1);
  });

  it('uses evidence weights and identifies the lowest-performing priority', () => {
    const report = buildWeeklyLearningReport(base({ attempts: [
      { id: 'a1', userId: 'local', questionId: 'q1', response: 'A', correct: true, score: 1, durationSeconds: 10, kind: 'reading', mode: 'practice', createdAt: '2026-09-27T01:00:00.000Z' },
      { id: 'a2', userId: 'local', questionId: 'q2', response: 'A', correct: false, score: 0, durationSeconds: 10, kind: 'reading', mode: 'review', createdAt: '2026-09-27T02:00:00.000Z' },
      { id: 'a3', userId: 'local', questionId: 'q3', response: 'A', correct: false, score: 0, durationSeconds: 10, kind: 'listening', mode: 'practice', createdAt: '2026-09-27T03:00:00.000Z' },
    ] }), '2026-09-27');
    expect(report.accuracyByKind).toEqual(expect.arrayContaining([
      { kind: 'reading', attempts: 2, accuracy: 4 / 7 },
      { kind: 'listening', attempts: 1, accuracy: 0 },
    ]));
    expect(report.priorities[0]).toBe('listening');
  });

  it('summarizes mastered knowledge and lapses', () => {
    const report = buildWeeklyLearningReport(base({ knowledgeStates: [
      { id: 'k1', itemId: 'v1', status: 'mastered', favorite: false, lapseCount: 2, updatedAt: '2026-09-27T00:00:00.000Z' },
      { id: 'k2', itemId: 'v2', status: 'review', favorite: false, lapseCount: 1, updatedAt: '2026-09-27T00:00:00.000Z' },
    ] }), '2026-09-27');
    expect(report.masteredCount).toBe(1);
    expect(report.lapseCount).toBe(3);
  });

  it('withholds a mock minimum until three submitted sessions exist', () => {
    const session = { id: 'e1', mockId: 'mock-1', contentVersion: 'v2', startedAt: '2026-09-21T00:00:00.000Z', updatedAt: '2026-09-21T02:00:00.000Z', submittedAt: '2026-09-21T02:00:00.000Z', sectionDeadlines: [], currentSectionIndex: 4, lockedSectionIndexes: [], answers: {}, status: 'submitted' as const };
    expect(buildWeeklyLearningReport(base({ examSessions: [session, { ...session, id: 'e2' }] }), '2026-09-27').recentMockMinimum).toBeNull();
    const report = buildWeeklyLearningReport(base({ examSessions: [session, { ...session, id: 'e2' }, { ...session, id: 'e3' }] }), '2026-09-27');
    expect(report.mockSampleCount).toBe(3);
    expect(report.recentMockMinimum).toBe(0);
  });
});
