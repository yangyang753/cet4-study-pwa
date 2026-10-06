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

  it('marks an item mastered only after four due review stages', () => {
    let state: KnowledgeState | undefined;
    for (const date of ['2026-09-26T08:00:00.000Z', '2026-09-29T08:00:00.000Z', '2026-10-06T08:00:00.000Z', '2026-10-20T08:00:00.000Z']) {
      state = applyKnowledgeReviewResult(state, 'c1', true, date);
    }
    expect(state).toMatchObject({ itemId: 'c1', status: 'mastered', reviewStage: 4 });
  });

  it('does not advance a review stage when repeated before its due time', () => {
    const first = applyKnowledgeReviewResult(undefined, 'v1', true, now);
    const early = applyKnowledgeReviewResult(first, 'v1', true, '2026-09-26T09:00:00.000Z');
    expect(early).toMatchObject({ status: 'review', reviewStage: 1, nextReviewAt: first.nextReviewAt });
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

  it('demotes only the failed foundation word and leaves an unrelated mastered word unchanged', () => {
    const failed: KnowledgeState = { id: 'knowledge:f0001', itemId: 'f0001', status: 'mastered', favorite: false, reviewStage: 4, updatedAt: now };
    const unrelated: KnowledgeState = { id: 'knowledge:f0002', itemId: 'f0002', status: 'mastered', favorite: false, reviewStage: 4, updatedAt: now };
    const next = applyKnowledgeReviewResult(failed, 'f0001', false, '2026-10-27T08:00:00.000Z');
    expect(next).toMatchObject({ itemId: 'f0001', status: 'review', reviewStage: 0 });
    expect(unrelated).toMatchObject({ itemId: 'f0002', status: 'mastered', reviewStage: 4 });
  });
});
