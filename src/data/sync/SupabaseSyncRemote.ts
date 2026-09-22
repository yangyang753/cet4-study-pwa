import type { SupabaseClient } from '@supabase/supabase-js';
import type { SyncRemote } from './SyncEngine';

export class SupabaseSyncRemote implements SyncRemote {
  constructor(private readonly client: SupabaseClient, private readonly userId: string) {}

  async upsertAttempt(payload: Record<string, unknown>) {
    const { error } = await this.client.from('attempts').upsert({
      id: payload.id,
      user_id: this.userId,
      question_id: payload.questionId,
      response: payload.response,
      correct: payload.correct,
      score: payload.score,
      duration_seconds: payload.durationSeconds ?? 0,
      created_at: payload.createdAt,
    });
    if (error) throw error;
  }

  async upsertDraft(payload: Record<string, unknown>) {
    const { error } = await this.client.from('drafts').upsert({
      id: payload.id,
      user_id: this.userId,
      question_id: payload.questionId,
      body: payload.body,
      device_id: payload.deviceId,
      updated_at: payload.updatedAt,
    });
    if (error) throw error;
  }
}
