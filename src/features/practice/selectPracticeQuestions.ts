import type { Attempt } from '../../domain/attempt';
import type { CatalogQuestion, PracticeKind } from '../../domain/content';

interface SelectionOptions {
  kind: PracticeKind;
  date: string;
  limit: number;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function selectPracticeQuestions(
  questions: CatalogQuestion[],
  attempts: Attempt[],
  options: SelectionOptions,
): CatalogQuestion[] {
  const latestAttemptByQuestion = new Map<string, number>();
  for (const attempt of attempts) {
    const timestamp = Date.parse(attempt.createdAt);
    if (!Number.isFinite(timestamp)) continue;
    const previous = latestAttemptByQuestion.get(attempt.questionId) ?? Number.NEGATIVE_INFINITY;
    if (timestamp > previous) latestAttemptByQuestion.set(attempt.questionId, timestamp);
  }

  const tieBreaker = (question: CatalogQuestion) => stableHash(`${options.date}:${options.kind}:${question.id}`);
  const unseen = questions
    .filter((question) => !latestAttemptByQuestion.has(question.id))
    .sort((left, right) => tieBreaker(left) - tieBreaker(right) || left.id.localeCompare(right.id));
  const seen = questions
    .filter((question) => latestAttemptByQuestion.has(question.id))
    .sort((left, right) => {
      const age = latestAttemptByQuestion.get(left.id)! - latestAttemptByQuestion.get(right.id)!;
      return age || tieBreaker(left) - tieBreaker(right) || left.id.localeCompare(right.id);
    });

  return [...unseen, ...seen].slice(0, Math.max(0, options.limit));
}
