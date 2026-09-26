import type { KnowledgeState } from '../../domain/learning';

const DAY_MS = 86_400_000;
export const STABLE_MASTERY_STAGE = 4;
export const KNOWLEDGE_REVIEW_INTERVALS = [1, 3, 7, 14, 30] as const;

function addDays(value: string, days: number): string {
  return new Date(Date.parse(value) + days * DAY_MS).toISOString();
}

export function initialKnowledgeState(itemId: string, now: string): KnowledgeState {
  return {
    id: `knowledge:${itemId}`,
    itemId,
    status: 'learning',
    favorite: false,
    reviewStage: 0,
    lapseCount: 0,
    updatedAt: now,
  };
}

export function applyKnowledgeReviewResult(
  current: KnowledgeState | undefined,
  itemId: string,
  correct: boolean,
  now: string,
): KnowledgeState {
  const state = current ?? initialKnowledgeState(itemId, now);
  const reviewStage = correct ? Math.min(STABLE_MASTERY_STAGE, (state.reviewStage ?? 0) + 1) : 0;
  return {
    ...state,
    status: correct && reviewStage >= STABLE_MASTERY_STAGE ? 'mastered' : 'review',
    reviewStage,
    nextReviewAt: addDays(now, KNOWLEDGE_REVIEW_INTERVALS[reviewStage]),
    lastReviewedAt: now,
    lapseCount: (state.lapseCount ?? 0) + (correct ? 0 : 1),
    updatedAt: now,
  };
}

