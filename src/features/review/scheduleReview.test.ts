import { describe, expect, it } from 'vitest';
import { scheduleReview } from './scheduleReview';

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
});
