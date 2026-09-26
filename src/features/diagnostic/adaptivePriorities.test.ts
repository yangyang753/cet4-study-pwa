import { describe, expect, it } from 'vitest';
import type { Attempt } from '../../domain/attempt';
import type { DiagnosticProfileV2 } from '../../domain/learning';
import { deriveAdaptivePriorities } from './adaptivePriorities';

const profile = (levels: DiagnosticProfileV2['levels']): DiagnosticProfileV2 => ({
  version: 2, sessionId: 'session', completedAt: '2026-09-20T00:00:00.000Z', questionCount: 20,
  levels, sectionScores: { writing: 0, listening: 0, reading: 0, translation: 0 }, estimatedScore: 300,
  scoreRange: { low: 245, high: 355 }, weakSkills: [], confidence: 'initial',
});
const attempt = (id: string, kind: string, score: number, mode: Attempt['mode'] = 'practice'): Attempt => ({
  id, userId: 'local', questionId: id, response: 'A', correct: score >= 0.75, score, durationSeconds: 10,
  kind, mode, createdAt: `2026-09-2${Number(id.replace(/\D/g, '') || 0) % 6}T08:00:00.000Z`,
});

describe('adaptive learning priorities', () => {
  it('keeps a diagnostic level when only two recent answers exist for that skill', () => {
    const result = deriveAdaptivePriorities(profile({ writing: 0.1, listening: 0.4, reading: 0.5 }), [
      attempt('1', 'writing', 1), attempt('2', 'writing', 1),
    ], '2026-09-26T23:59:59.999Z');
    expect(result[0]).toMatchObject({ kind: 'writing', level: 0.1, source: 'diagnostic', attempts: 2 });
  });

  it('replaces only the skill with at least three recent answers and keeps other diagnostic evidence', () => {
    const result = deriveAdaptivePriorities(profile({ vocabulary: 0.2, grammar: 0.3, listening: 0.4, reading: 0.5 }), [
      attempt('1', 'vocabulary', 1), attempt('2', 'vocabulary', 1), attempt('3', 'vocabulary', 1),
    ], '2026-09-26T23:59:59.999Z');
    expect(result).toEqual([
      { kind: 'grammar', level: 0.3, source: 'diagnostic', attempts: 0 },
      { kind: 'listening', level: 0.4, source: 'diagnostic', attempts: 0 },
    ]);
  });

  it('does not feed diagnostic attempts back into recent practice evidence', () => {
    const result = deriveAdaptivePriorities(profile({ vocabulary: 0.2, grammar: 0.4, listening: 0.6 }), [
      attempt('1', 'vocabulary', 1, 'diagnostic'), attempt('2', 'vocabulary', 1, 'diagnostic'), attempt('3', 'vocabulary', 1, 'diagnostic'),
    ], '2026-09-26T23:59:59.999Z');
    expect(result[0]).toMatchObject({ kind: 'vocabulary', level: 0.2, source: 'diagnostic', attempts: 0 });
  });
});
