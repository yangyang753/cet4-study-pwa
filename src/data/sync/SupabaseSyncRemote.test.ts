import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseSyncRemote } from './SupabaseSyncRemote';

function clientDouble() {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn().mockReturnValue({ upsert });
  return { client: { from } as unknown as SupabaseClient, from, upsert };
}

describe('SupabaseSyncRemote', () => {
  it('syncs learner mistake reasons and review priority across devices', async () => {
    const fake = clientDouble();
    const remote = new SupabaseSyncRemote(fake.client, 'user-1');

    await remote.upsertOperation('attempt', {
      id: 'attempt-1', questionId: 'q1', response: 'B', correct: false, score: 0,
      durationSeconds: 20, mistakeReason: 'location', createdAt: '2026-09-23T10:00:00.000Z',
    });
    expect(fake.upsert).toHaveBeenLastCalledWith(expect.objectContaining({ mistake_reason: 'location' }));

    await remote.upsertOperation('reviewCard', {
      id: 'review-1', questionId: 'q1', priority: 5, reason: 'location', stage: 0,
      nextReviewAt: '2026-09-23T10:00:00.000Z', lastCorrect: false, updatedAt: '2026-09-23T10:00:00.000Z',
    });
    expect(fake.upsert).toHaveBeenLastCalledWith(expect.objectContaining({ priority: 5, reason: 'location' }));
  });

  it('maps a daily plan to the authenticated learner plan table', async () => {
    const fake = clientDouble();
    const remote = new SupabaseSyncRemote(fake.client, 'user-1');
    await remote.upsertOperation('plan', { id: 'plan:2026-09-24', date: '2026-09-24', tasks: [], updatedAt: '2026-09-24T09:00:00.000Z' });
    expect(fake.from).toHaveBeenCalledWith('daily_plans');
    expect(fake.upsert).toHaveBeenCalledWith({ id: 'plan:2026-09-24', user_id: 'user-1', plan_date: '2026-09-24', payload: { id: 'plan:2026-09-24', date: '2026-09-24', tasks: [], updatedAt: '2026-09-24T09:00:00.000Z' }, updated_at: '2026-09-24T09:00:00.000Z' });
  });

  it('preserves complete review and knowledge payloads across sync', async () => {
    const fake = clientDouble();
    const remote = new SupabaseSyncRemote(fake.client, 'user-1');
    const review = { id: 'review:v1', questionId: 'v1:meaning', stage: 2, priority: 5, format: 'word-meaning', wordId: 'v1', knowledgeItemId: 'v1', knowledgeKind: 'vocabulary', nextReviewAt: '2026-10-01T00:00:00.000Z', lastCorrect: false, updatedAt: '2026-09-30T00:00:00.000Z' };
    await remote.upsertOperation('reviewCard', review);
    expect(fake.upsert).toHaveBeenLastCalledWith(expect.objectContaining({ payload: review }));

    const state = { id: 'knowledge:v1', itemId: 'v1', status: 'review', favorite: false, reviewStage: 2, lapseCount: 3, nextReviewAt: '2026-10-01T00:00:00.000Z', lastReviewedAt: '2026-09-30T00:00:00.000Z', updatedAt: '2026-09-30T00:00:00.000Z' };
    await remote.upsertOperation('knowledgeState', state);
    expect(fake.upsert).toHaveBeenLastCalledWith(expect.objectContaining({ payload: state }));

    const restored = (remote as unknown as { fromRow(kind: string, row: Record<string, unknown>): { payload: Record<string, unknown> } }).fromRow('knowledgeState', { id: state.id, item_id: 'v1', status: 'review', favorite: false, payload: state, updated_at: state.updatedAt });
    expect(restored.payload).toMatchObject({ reviewStage: 2, lapseCount: 3, nextReviewAt: state.nextReviewAt });
  });
});
