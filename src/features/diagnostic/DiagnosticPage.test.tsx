import { describe, expect, it } from 'vitest';
import { scoreDiagnostic } from './diagnostic';

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

  it('keeps empty categories at zero and every level within zero to one', () => {
    const result = scoreDiagnostic([], '2026-09-24T09:00:00.000Z');
    expect(Object.values(result.levels).every((value) => value >= 0 && value <= 1)).toBe(true);
    expect(result.levels).toMatchObject({ vocabulary: 0, grammar: 0, listening: 0, reading: 0 });
  });
});
