import { describe, expect, it } from 'vitest';
import type { CoreStudyKind } from '../dashboard/learningEvidence';
import { rankDiagnosticWeakSkills, scoreDiagnostic, type DiagnosticResponse } from './diagnostic';

function responses(kind: CoreStudyKind, scores: number[]): DiagnosticResponse[] {
  return scores.map((score, index) => ({ questionId: `${kind}-${index}`, kind, score, correct: score >= 0.75 }));
}

describe('diagnostic score profile', () => {
  it('converts six measured skills into a conservative weighted CET-4 estimate', () => {
    const result = scoreDiagnostic([
      ...responses('vocabulary', [1, 0, 0]),
      ...responses('grammar', [1, 1, 0]),
      ...responses('listening', [1, 1, 1, 0, 0, 0]),
      ...responses('reading', [1, 1, 1, 1, 0, 0]),
      ...responses('writing', [0.8]),
      ...responses('translation', [0.5]),
    ], '2026-09-26T09:00:00.000Z', 'session-1');

    expect(result).toMatchObject({
      version: 2,
      sessionId: 'session-1',
      completedAt: '2026-09-26T09:00:00.000Z',
      questionCount: 20,
      estimatedScore: 418,
      scoreRange: { low: 363, high: 473 },
      sectionScores: { writing: 85.2, listening: 124.3, reading: 155.3, translation: 53.3 },
      weakSkills: ['vocabulary', 'listening'],
      confidence: 'initial',
    });
    expect(result.levels).toMatchObject({
      vocabulary: 1 / 3, grammar: 2 / 3, listening: 0.5, reading: 2 / 3, writing: 0.8, translation: 0.5,
    });
  });

  it('smooths objective section extremes and keeps every range boundary inside 0 to 710', () => {
    const zero = scoreDiagnostic([
      ...responses('listening', [0, 0, 0, 0, 0, 0]),
      ...responses('reading', [0, 0, 0, 0, 0, 0]),
      ...responses('writing', [0]),
      ...responses('translation', [0]),
    ], '2026-09-26T09:00:00.000Z', 'zero');
    const perfect = scoreDiagnostic([
      ...responses('listening', [1, 1, 1, 1, 1, 1]),
      ...responses('reading', [1, 1, 1, 1, 1, 1]),
      ...responses('writing', [1]),
      ...responses('translation', [1]),
    ], '2026-09-26T09:00:00.000Z', 'perfect');

    expect(zero.sectionScores).toMatchObject({ listening: 31.1, reading: 31.1 });
    expect(zero.scoreRange.low).toBeGreaterThanOrEqual(0);
    expect(zero.scoreRange.high).toBeGreaterThanOrEqual(zero.estimatedScore);
    expect(perfect.sectionScores).toMatchObject({ listening: 217.4, reading: 217.4 });
    expect(perfect.scoreRange.high).toBeLessThanOrEqual(710);
    expect(perfect.scoreRange.low).toBeLessThanOrEqual(perfect.estimatedScore);
  });

  it('ranks all tested skills but returns only the two weakest in stable order', () => {
    expect(rankDiagnosticWeakSkills({
      vocabulary: 0.5, grammar: 0.5, listening: 0.7, reading: 0.8, writing: 0.2, translation: 0.4,
    })).toEqual(['writing', 'translation']);
  });
});
