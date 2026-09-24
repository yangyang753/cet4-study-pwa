import type { Attempt } from '../../domain/attempt';

export type CoreStudyKind = 'vocabulary' | 'grammar' | 'listening' | 'reading' | 'writing' | 'translation';

export interface NormalizedEvidence {
  attempt: Attempt;
  kind: CoreStudyKind;
  correct: boolean;
  weight: number;
}

const kindMap: Record<string, CoreStudyKind> = {
  vocabulary: 'vocabulary',
  grammar: 'grammar',
  listening: 'listening',
  conversation: 'listening',
  news: 'listening',
  lecture: 'listening',
  reading: 'reading',
  cloze: 'reading',
  matching: 'reading',
  writing: 'writing',
  translation: 'translation',
};

const modeWeight: Record<NonNullable<Attempt['mode']>, number> = {
  practice: 1,
  exam: 1,
  review: 0.75,
  mastery: 0.5,
};

export function normalizeStudyKind(raw?: string): CoreStudyKind | null {
  return raw ? kindMap[raw] ?? null : null;
}

export function selectRecentEvidence(attempts: Attempt[], now: string, limit = 30, days = 14): NormalizedEvidence[] {
  const cutoff = Date.parse(now) - days * 86_400_000;
  return attempts
    .filter((attempt) => typeof attempt.correct === 'boolean' && Date.parse(attempt.createdAt) >= cutoff)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .flatMap((attempt) => {
      const kind = normalizeStudyKind(attempt.kind);
      return kind ? [{ attempt, kind, correct: attempt.correct as boolean, weight: modeWeight[attempt.mode ?? 'practice'] }] : [];
    })
    .slice(0, limit);
}
