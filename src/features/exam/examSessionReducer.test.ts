import { describe, expect, it } from 'vitest';
import { resolveExam } from './examBlueprint';
import { createExamSession, reduceExamSession, remainingSeconds, restoreExamSession } from './examSessionReducer';

const exam = resolveExam('mock-1');
const startedAt = '2026-09-23T00:00:00.000Z';

describe('exam session reducer', () => {
  it('locks completed sections when the learner advances manually', () => {
    const session = createExamSession(exam, startedAt);

    const advanced = reduceExamSession(session, {
      type: 'go-to-section',
      sectionIndex: 1,
      now: '2026-09-23T00:10:00.000Z',
    });

    expect(advanced.currentSectionIndex).toBe(1);
    expect(advanced.lockedSectionIndexes).toEqual([0]);
  });

  it('uses an absolute final deadline and records answers', () => {
    const session = createExamSession(exam, startedAt);
    expect(remainingSeconds(session, '2026-09-23T00:00:30.000Z')).toBe(7470);
    const answered = reduceExamSession(session, { type: 'answer', questionId: exam.sections[0].questions[0].id, response: 'draft' });
    expect(answered.answers[exam.sections[0].questions[0].id]).toBe('draft');
    expect(reduceExamSession(answered, { type: 'submit', now: '2026-09-23T00:10:00.000Z' }).status).toBe('submitted');
  });

  it('advances at the exact section deadline after refresh', () => {
    const session = createExamSession(exam, startedAt);
    const restored = restoreExamSession(session, exam, '2026-09-23T00:30:00.000Z');
    expect(restored.currentSectionIndex).toBe(1);
    expect(restored.lockedSectionIndexes).toEqual([0]);
  });

  it('automatically submits after the final deadline', () => {
    const session = createExamSession(exam, startedAt);
    expect(restoreExamSession(session, exam, '2026-09-23T02:05:00.000Z').status).toBe('submitted');
  });

  it('makes a content-version mismatch read-only', () => {
    const session = createExamSession(exam, startedAt);
    const changedExam = { ...exam, contentVersion: 'v2' };
    const restored = restoreExamSession(session, changedExam, '2026-09-23T00:05:00.000Z');
    expect(restored.status).toBe('stale');
    expect(reduceExamSession(restored, { type: 'answer', questionId: 'q1', response: 'B' })).toBe(restored);
  });

  it('does not mutate a submitted result', () => {
    const session = reduceExamSession(createExamSession(exam, startedAt), { type: 'submit', now: '2026-09-23T00:01:00.000Z' });
    expect(reduceExamSession(session, { type: 'answer', questionId: 'q1', response: 'B' })).toBe(session);
    expect(reduceExamSession(session, { type: 'submit', now: '2026-09-23T00:02:00.000Z' })).toBe(session);
  });
});
