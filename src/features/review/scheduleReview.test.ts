import { describe, expect, it } from 'vitest';
import { scheduleReview, scheduleReviewStage } from './scheduleReview';

describe('scheduleReview', () => {
  it('increases the interval after repeated correct reviews', () => {
    const first = scheduleReview([{ correct: false }, { correct: true }], '2026-09-22', '2026-12-12');
    const mastered = scheduleReview([{ correct: false }, { correct: true }, { correct: true }, { correct: true }], '2026-09-22', '2026-12-12');
    expect(Date.parse(mastered.nextReviewAt)).toBeGreaterThan(Date.parse(first.nextReviewAt));
  });

  it('shortens an otherwise long interval near the exam', () => {
    const schedule = scheduleReview([{ correct: true }, { correct: true }, { correct: true }], '2026-12-08', '2026-12-12');
    expect(schedule.intervalDays).toBeLessThanOrEqual(2);
  });

  it('advances correct answers through the approved stages', () => {
    expect(scheduleReviewStage(0, true, '2026-09-23', '2026-12-12')).toMatchObject({ stage: 1, intervalDays: 1 });
  });

  it('resets wrong answers and stays valid after the exam date', () => {
    expect(scheduleReviewStage(3, false, '2026-09-23', '2026-12-12').stage).toBe(0);
    expect(scheduleReviewStage(4, true, '2026-12-13', '2026-12-12').intervalDays).toBeGreaterThanOrEqual(0);
  });
});
