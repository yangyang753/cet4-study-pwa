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
});
