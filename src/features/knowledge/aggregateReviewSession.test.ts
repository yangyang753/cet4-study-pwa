import { describe, expect, it } from 'vitest';
import { createAggregateReviewSession, recordAggregateReviewResult } from './aggregateReviewSession';

describe('aggregate review session', () => {
  it('tests every queued word once before completing', () => {
    const started = createAggregateReviewSession(['v1', 'v2', 'v3'], () => 0);
    expect(started.queue).toEqual(['v2', 'v3', 'v1']);
    expect(started.currentId).toBe('v2');

    const second = recordAggregateReviewResult(started, true);
    const third = recordAggregateReviewResult(second, false);
    const complete = recordAggregateReviewResult(third, true);

    expect([started.currentId, second.currentId, third.currentId]).toEqual(['v2', 'v3', 'v1']);
    expect(new Set([started.currentId, second.currentId, third.currentId]).size).toBe(3);
    expect(complete).toMatchObject({ currentId: null, completed: true, correctCount: 2, missedCount: 1, answeredCount: 3 });
  });

  it('handles an empty queue without exposing a current word', () => {
    expect(createAggregateReviewSession([], () => 0)).toMatchObject({ currentId: null, completed: true, answeredCount: 0 });
  });
});
