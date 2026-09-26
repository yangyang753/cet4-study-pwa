import type { EntityTable, Table } from 'dexie';
import type { Attempt } from '../../domain/attempt';
import type { ExamSessionRecord } from '../../domain/exam';
import { normalizeUserSettings, type KnowledgeState, type ReviewCard, type StudyTaskCompletion, type UserSettings } from '../../domain/learning';
import { learningDb, type LearningDatabase } from '../localDb';
import { resolveDraftConflict, type DraftRecord, type OperationKind, type PendingOperation, type RemoteBatch, type TombstoneRecord } from '../sync/SyncEngine';
import type { LearningRepository } from './LearningRepository';

type StoredEntity = { id: string; updatedAt?: string; createdAt?: string; completedAt?: string; body?: string; questionId?: string; deviceId?: string };
const tableNames: Record<Exclude<OperationKind, 'tombstone'>, string> = { attempt: 'attempts', draft: 'drafts', reviewCard: 'reviewCards', taskCompletion: 'taskCompletions', knowledgeState: 'knowledgeStates', examSession: 'examSessions', settings: 'settings', plan: 'plans' };
const entityTimestamp = (entity: StoredEntity) => entity.updatedAt ?? entity.completedAt ?? entity.createdAt ?? '';

export class DexieLearningRepository implements LearningRepository {
  constructor(private readonly db: LearningDatabase = learningDb) {}
  async saveAttempt(attempt: Attempt) {
    const updatedAt = attempt.updatedAt ?? attempt.createdAt;
    await this.db.transaction('rw', this.db.attempts, this.db.syncQueue, async () => {
      await this.db.attempts.put(attempt);
      await this.put(this.operation('attempt', attempt.id, attempt as unknown as Record<string, unknown>, updatedAt));
    });
    this.requestSync();
  }
  async saveAttemptOnce(attempt: Attempt) {
    await this.db.transaction('rw', this.db.attempts, this.db.syncQueue, async () => {
      if (await this.db.attempts.get(attempt.id)) return;
      await this.db.attempts.put(attempt);
      await this.put(this.operation('attempt', attempt.id, attempt as unknown as Record<string, unknown>, attempt.createdAt));
    });
    this.requestSync();
  }
  listAttempts() { return this.db.attempts.toArray(); }
  async saveDraft(draft: DraftRecord) {
    await this.db.transaction('rw', this.db.drafts, this.db.syncQueue, async () => {
      await this.db.drafts.put(draft);
      await this.put(this.operation('draft', draft.id, draft as unknown as Record<string, unknown>, draft.updatedAt));
    });
    this.requestSync();
  }
  getDrafts() { return this.db.drafts.toArray(); }
  getPendingOperations() { return this.list(); }
  async upsertReviewCard(card: ReviewCard) { await this.saveMutable('reviewCard', this.db.reviewCards, card, card.updatedAt); }
  async getReviewCard(id: string) { return (await this.db.reviewCards.get(id)) ?? null; }
  async listDueReviews(at: string) {
    const cards = await this.db.reviewCards.where('nextReviewAt').belowOrEqual(at).toArray();
    return cards.sort((left, right) => (right.priority ?? 1) - (left.priority ?? 1) || left.nextReviewAt.localeCompare(right.nextReviewAt));
  }
  async listAllReviews() {
    const cards = await this.db.reviewCards.toArray();
    return cards.sort((left, right) => left.nextReviewAt.localeCompare(right.nextReviewAt) || left.id.localeCompare(right.id));
  }
  async completeTask(completion: StudyTaskCompletion) { await this.saveMutable('taskCompletion', this.db.taskCompletions, completion, completion.completedAt); }
  async upsertKnowledgeState(state: KnowledgeState) { await this.saveMutable('knowledgeState', this.db.knowledgeStates, state, state.updatedAt); }
  async saveUserSettings(settings: UserSettings) {
    const normalized = normalizeUserSettings(settings);
    await this.saveMutable('settings', this.db.settings, normalized, normalized.updatedAt);
  }
  async saveExamSession(session: ExamSessionRecord) { await this.saveMutable('examSession', this.db.examSessions, session, session.updatedAt); }
  async getActiveExamSession() { const active = await this.db.examSessions.where('status').equals('active').toArray(); return active.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]; }
  async listSubmittedExamSessions() { const submitted = await this.db.examSessions.where('status').equals('submitted').toArray(); return submitted.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)); }
  async savePlan(plan: import('../localDb').CachedPlan) { await this.saveMutable('plan', this.db.plans, plan, plan.updatedAt); }
  async getPlan(date: string) { return (await this.db.plans.where('date').equals(date).first()) ?? null; }
  async getDashboardSnapshot(at = new Date().toISOString()) {
    const [attempts, dueReviews, completions, knowledgeStates, settings] = await Promise.all([this.db.attempts.toArray(), this.listDueReviews(at), this.db.taskCompletions.toArray(), this.db.knowledgeStates.toArray(), this.db.settings.get('current')]);
    return { attempts, dueReviews, completions, knowledgeStates, settings: normalizeUserSettings(settings) };
  }
  list() { return this.db.syncQueue.toArray(); }
  async put(operation: PendingOperation) { if (!await this.db.syncQueue.get(operation.id)) await this.db.syncQueue.put(operation); }
  async remove(id: string) { await this.db.syncQueue.delete(id); }
  async replace(operation: PendingOperation) { await this.db.syncQueue.put(operation); }
  async getSyncCursor(userId: string) { return (await this.db.syncCursors.get(`sync:${userId}`))?.cursor ?? null; }
  async setSyncCursor(cursor: string, userId: string) { await this.db.syncCursors.put({ id: `sync:${userId}`, cursor, updatedAt: new Date().toISOString() }); }

  async mergeRemoteBatch(batch: RemoteBatch) {
    const tables = [this.db.attempts, this.db.drafts, this.db.plans, this.db.reviewCards, this.db.taskCompletions, this.db.knowledgeStates, this.db.examSessions, this.db.settings, this.db.tombstones];
    await this.db.transaction('rw', tables, async () => {
      const tombstoneRecords = batch.records.filter((record) => record.kind === 'tombstone');
      for (const record of tombstoneRecords) {
        const tombstone = record.payload as unknown as TombstoneRecord;
        const target = this.tableFor(tombstone.kind);
        const local = await target.get(tombstone.entityId);
        if (!local || entityTimestamp(local) <= tombstone.deletedAt) await target.delete(tombstone.entityId);
        await this.db.tombstones.put(tombstone);
      }
      for (const record of batch.records.filter((item) => item.kind !== 'tombstone')) {
        const kind = record.kind as Exclude<OperationKind, 'tombstone'>;
        const tombstone = await this.db.tombstones.get(`${kind}:${record.id}`);
        if (tombstone && tombstone.deletedAt >= record.updatedAt) continue;
        const table = this.tableFor(kind);
        const local = await table.get(record.id);
        if (kind === 'attempt') {
          if (!local || entityTimestamp(local) <= record.updatedAt) await table.put(record.payload as unknown as StoredEntity);
          continue;
        }
        if (kind === 'draft' && local?.body && local.body !== record.payload.body) {
          const merged = resolveDraftConflict(local as DraftRecord, record.payload as unknown as DraftRecord);
          await table.bulkPut(merged);
          continue;
        }
        if (!local || entityTimestamp(local) <= record.updatedAt) await table.put(record.payload as unknown as StoredEntity);
      }
    });
  }

  private tableFor(kind: Exclude<OperationKind, 'tombstone'>) { return this.db.table(tableNames[kind]) as Table<StoredEntity, string>; }
  private operation(kind: OperationKind, entityId: string, payload: Record<string, unknown>, createdAt: string): PendingOperation { return { id: `${kind}:${entityId}:${createdAt}`, entityId, kind, payload, createdAt, attempts: 0 }; }
  private async saveMutable<T extends { id: string }>(kind: OperationKind, table: EntityTable<T, 'id'>, entity: T, updatedAt: string) {
    await this.db.transaction('rw', table, this.db.syncQueue, async () => { await table.put(entity); await this.put(this.operation(kind, entity.id, entity as unknown as Record<string, unknown>, updatedAt)); });
    this.requestSync();
  }
  private requestSync() { if (typeof window !== 'undefined') window.dispatchEvent(new Event('cet4:sync-needed')); }
}
