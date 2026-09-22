import { describe, expect, it } from 'vitest';
import { summarizeExam } from './summarizeExam';

describe('summarizeExam', () => {
  it('reports accuracy and time without inventing an official score', () => {
    const summary = summarizeExam([
      { kind: 'listening', correct: true, durationSeconds: 20 },
      { kind: 'listening', correct: false, durationSeconds: 40 },
      { kind: 'reading', correct: true, durationSeconds: 60 },
    ]);
    expect(summary.accuracy).toBeCloseTo(2 / 3);
    expect(summary.totalSeconds).toBe(120);
    expect(summary.byKind.listening.accuracy).toBe(0.5);
    expect(summary).not.toHaveProperty('officialScore');
  });
});
