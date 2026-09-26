import { describe, expect, it } from 'vitest';
import type { KnowledgeState } from '../../domain/learning';
import { applyKnowledgeReviewResult } from './knowledgeMastery';

const now = '2026-09-26T08:00:00.000Z';

describe('evidence-based knowledge mastery', () => {
  it('keeps the first correct assessment in review instead of claiming stable mastery', () => {
    expect(applyKnowledgeReviewResult(undefined, 'v1', true, now)).toMatchObject({
      itemId: 'v1', status: 'review', reviewStage: 1,
    });
  });

  it('marks an item mastered only after four successful review stages', () => {
    let state: KnowledgeState | undefined;
    for (let index = 0; index < 4; index += 1) state = applyKnowledgeReviewResult(state, 'c1', true, now);
    expect(state).toMatchObject({ itemId: 'c1', status: 'mastered', reviewStage: 4 });
  });

  it('demotes a mastered item immediately after a later failure', () => {
    const mastered: KnowledgeState = {
      id: 'knowledge:c1', itemId: 'c1', status: 'mastered', favorite: true,
      reviewStage: 4, lapseCount: 1, updatedAt: now,
    };
    expect(applyKnowledgeReviewResult(mastered, 'c1', false, now)).toMatchObject({
      status: 'review', reviewStage: 0, lapseCount: 2, favorite: true,
    });
  });
});
