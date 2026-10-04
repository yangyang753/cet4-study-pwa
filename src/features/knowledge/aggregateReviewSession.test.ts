import { describe, expect, it } from 'vitest';
import {
  createAggregateReviewSession,
  loadAggregateReviewSession,
  recordAggregateReviewResult,
  saveAggregateReviewSession,
  selectAggregateReviewIds,
} from './aggregateReviewSession';

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

  it('includes learned words before they are due but rotates recently reviewed words behind older words', () => {
    const ids = selectAggregateReviewIds([
      { itemId: 'old', status: 'learning', updatedAt: '2026-09-20T08:00:00.000Z', nextReviewAt: '2026-12-01T00:00:00.000Z' },
      { itemId: 'today', status: 'learning', updatedAt: '2026-10-04T08:00:00.000Z', nextReviewAt: '2026-12-01T00:00:00.000Z' },
    ], '2026-10-04T12:00:00.000Z', 20);
    expect(ids).toEqual(['old', 'today']);
  });

  it('persists and restores a completed report across refreshes', () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    };
    const complete = recordAggregateReviewResult(createAggregateReviewSession(['v1'], () => 0), true);

    saveAggregateReviewSession(complete, { storage: adapter, ownerId: 'local' });

    expect(loadAggregateReviewSession({ storage: adapter, ownerId: 'local', validItemIds: new Set(['v1']) })).toEqual(complete);
  });

  it('repairs a stale current word and removes IDs that no longer exist', () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    };
    const session = createAggregateReviewSession(['v1', 'removed', 'v2'], () => 0, { ownerId: 'local' });
    saveAggregateReviewSession({ ...session, currentIndex: 1, currentId: 'removed', answeredCount: 1 }, { storage: adapter, ownerId: 'local' });

    expect(loadAggregateReviewSession({ storage: adapter, ownerId: 'local', validItemIds: new Set(['v1', 'v2']) })).toMatchObject({
      queue: ['v2', 'v1'], currentIndex: 1, currentId: 'v1', answeredCount: 1, completed: false,
    });
  });

  it('isolates saved review rounds by local profile owner', () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    };
    const session = createAggregateReviewSession(['v1'], () => 0, { ownerId: 'learner-a' });
    saveAggregateReviewSession(session, { storage: adapter, ownerId: 'learner-a' });

    expect(loadAggregateReviewSession({ storage: adapter, ownerId: 'learner-b', validItemIds: new Set(['v1']) })).toBeNull();
    expect(loadAggregateReviewSession({ storage: adapter, ownerId: 'learner-a', validItemIds: new Set(['v1']) })).toEqual(session);
  });

  it('discards a session when none of its queued words exist anymore', () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    };
    const session = createAggregateReviewSession(['removed'], () => 0, { ownerId: 'local' });
    saveAggregateReviewSession(session, { storage: adapter, ownerId: 'local' });

    expect(loadAggregateReviewSession({ storage: adapter, ownerId: 'local', validItemIds: new Set(['v1']) })).toBeNull();
  });

  it('caps one aggregate round at twenty unique learned words', () => {
    const ids = selectAggregateReviewIds(Array.from({ length: 44 }, (_, index) => ({
      itemId: `v${index}`, status: 'review' as const, updatedAt: `2026-09-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
    })), '2026-10-04T12:00:00.000Z', 20);
    expect(ids).toHaveLength(20);
    expect(new Set(ids).size).toBe(20);
  });
});
