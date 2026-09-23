import type { SupabaseClient } from '@supabase/supabase-js';
import type { OperationKind, RemoteBatch, RemoteRecord, SyncRemote } from './SyncEngine';

const tables: Array<[Exclude<OperationKind, 'tombstone'> | 'tombstone', string]> = [
  ['attempt', 'attempts'], ['draft', 'drafts'], ['reviewCard', 'review_queue'], ['taskCompletion', 'task_completions'],
  ['knowledgeState', 'knowledge_states'], ['examSession', 'exam_sessions'], ['settings', 'user_settings'], ['tombstone', 'tombstones'],
];

const asString = (value: unknown) => typeof value === 'string' ? value : '';

export class SupabaseSyncRemote implements SyncRemote {
  constructor(private readonly client: SupabaseClient, private readonly userId: string) {}

  async upsertAttempt(payload: Record<string, unknown>, signal?: AbortSignal) { return this.upsertOperation('attempt', payload, signal); }
  async upsertDraft(payload: Record<string, unknown>, signal?: AbortSignal) { return this.upsertOperation('draft', payload, signal); }

  async upsertOperation(kind: OperationKind, payload: Record<string, unknown>, signal?: AbortSignal) {
    const [tableName, row] = this.toRow(kind, payload);
    let query = this.client.from(tableName).upsert(row);
    if (signal) query = query.abortSignal(signal);
    const { error } = await query;
    if (error) throw error;
  }

  async pullSince(cursor: string | null, signal?: AbortSignal): Promise<RemoteBatch> {
    const since = cursor?.split('|')[0] ?? '1970-01-01T00:00:00.000Z';
    const pages = await Promise.all(tables.map(async ([kind, tableName]) => {
      let query = this.client.from(tableName).select('*').gte('updated_at', since).order('updated_at').order('id').limit(1000);
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => this.fromRow(kind, row as Record<string, unknown>));
    }));
    const records = pages.flat().filter((record) => `${record.updatedAt}|${record.id}` > (cursor ?? '')).sort((left, right) => `${left.updatedAt}|${left.id}`.localeCompare(`${right.updatedAt}|${right.id}`));
    const last = records.at(-1);
    return { records, cursor: last ? `${last.updatedAt}|${last.id}` : (cursor ?? `${since}|`) };
  }

  private toRow(kind: OperationKind, payload: Record<string, unknown>): [string, Record<string, unknown>] {
    const common = { id: payload.id, user_id: this.userId, updated_at: payload.updatedAt ?? payload.createdAt ?? payload.completedAt };
    if (kind === 'attempt') return ['attempts', { ...common, question_id: payload.questionId, response: payload.response, correct: payload.correct, score: payload.score, duration_seconds: payload.durationSeconds ?? 0, content_version: payload.contentVersion ?? 'v1', kind: payload.kind ?? 'practice', mode: payload.mode ?? 'practice', device_id: payload.deviceId ?? 'unknown', created_at: payload.createdAt }];
    if (kind === 'draft') return ['drafts', { ...common, question_id: payload.questionId, body: payload.body, device_id: payload.deviceId }];
    if (kind === 'reviewCard') return ['review_queue', { ...common, question_id: payload.questionId, priority: 1, next_review_at: payload.nextReviewAt, stage: payload.stage, last_correct: payload.lastCorrect }];
    if (kind === 'taskCompletion') return ['task_completions', { ...common, task_id: payload.taskId, kind: payload.kind, completion_date: payload.date, completed_at: payload.completedAt }];
    if (kind === 'knowledgeState') return ['knowledge_states', { ...common, item_id: payload.itemId, status: payload.status, favorite: payload.favorite }];
    if (kind === 'examSession') return ['exam_sessions', { ...common, mock_id: payload.mockId, content_version: payload.contentVersion, status: payload.status, payload }];
    if (kind === 'settings') return ['user_settings', { ...common, exam_date: payload.examDate, daily_minutes: payload.dailyMinutes, payload }];
    return ['tombstones', { ...common, entity_kind: payload.kind, entity_id: payload.entityId, deleted_at: payload.deletedAt }];
  }

  private fromRow(kind: OperationKind, row: Record<string, unknown>): RemoteRecord {
    const updatedAt = asString(row.updated_at);
    if (kind === 'attempt') return { kind, id: asString(row.id), updatedAt, payload: { id: row.id, userId: this.userId, questionId: row.question_id, response: row.response, correct: row.correct, score: row.score, durationSeconds: row.duration_seconds, contentVersion: row.content_version, kind: row.kind, mode: row.mode, deviceId: row.device_id, createdAt: row.created_at, updatedAt } };
    if (kind === 'draft') return { kind, id: asString(row.id), updatedAt, payload: { id: row.id, questionId: row.question_id, body: row.body, deviceId: row.device_id, updatedAt } };
    if (kind === 'reviewCard') return { kind, id: asString(row.id), updatedAt, payload: { id: row.id, questionId: row.question_id, stage: row.stage, nextReviewAt: row.next_review_at, lastCorrect: row.last_correct, updatedAt } };
    if (kind === 'taskCompletion') return { kind, id: asString(row.id), updatedAt, payload: { id: row.id, taskId: row.task_id, kind: row.kind, date: row.completion_date, completedAt: row.completed_at, updatedAt } };
    if (kind === 'knowledgeState') return { kind, id: asString(row.id), updatedAt, payload: { id: row.id, itemId: row.item_id, status: row.status, favorite: row.favorite, updatedAt } };
    if (kind === 'examSession' || kind === 'settings') return { kind, id: asString(row.id), updatedAt, payload: { ...(row.payload as Record<string, unknown>), updatedAt } };
    const payload = { id: row.id, kind: row.entity_kind, entityId: row.entity_id, deletedAt: row.deleted_at, updatedAt };
    return { kind: 'tombstone', id: asString(row.id), updatedAt, deletedAt: asString(row.deleted_at), payload };
  }
}
