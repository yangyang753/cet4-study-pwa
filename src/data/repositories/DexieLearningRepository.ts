import type { Attempt } from '../../domain/attempt';
import { learningDb, type LearningDatabase } from '../localDb';
import type { DraftRecord, PendingOperation } from '../sync/SyncEngine';
import type { LearningRepository } from './LearningRepository';

export class DexieLearningRepository implements LearningRepository {
  constructor(private readonly db: LearningDatabase = learningDb) {}
  async saveAttempt(attempt: Attempt) {
    await this.db.transaction('rw', this.db.attempts, this.db.syncQueue, async () => {
      await this.db.attempts.put(attempt);
      await this.put({ id: `attempt:${attempt.id}`, entityId: attempt.id, kind: 'attempt', payload: attempt as unknown as Record<string, unknown>, createdAt: attempt.createdAt, attempts: 0 });
    });
  }
  async saveDraft(draft: DraftRecord) {
    await this.db.transaction('rw', this.db.drafts, this.db.syncQueue, async () => {
      await this.db.drafts.put(draft);
      await this.put({ id: `draft:${draft.id}:${draft.updatedAt}`, entityId: draft.id, kind: 'draft', payload: draft as unknown as Record<string, unknown>, createdAt: draft.updatedAt, attempts: 0 });
    });
  }
  getPendingOperations() { return this.list(); }
  list() { return this.db.syncQueue.toArray(); }
  async put(operation: PendingOperation) { if (!await this.db.syncQueue.get(operation.id)) await this.db.syncQueue.put(operation); }
  async remove(id: string) { await this.db.syncQueue.delete(id); }
  async replace(operation: PendingOperation) { await this.db.syncQueue.put(operation); }
}
