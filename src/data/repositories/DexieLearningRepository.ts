import type { Attempt } from '../../domain/attempt';
import { learningDb, type LearningDatabase } from '../localDb';
import type { DraftRecord, PendingOperation } from '../sync/SyncEngine';
import type { LearningRepository } from './LearningRepository';
import { defaultUserSettings, type KnowledgeState, type ReviewCard, type StudyTaskCompletion, type UserSettings } from '../../domain/learning';

export class DexieLearningRepository implements LearningRepository {
  constructor(private readonly db: LearningDatabase = learningDb) {}
  async saveAttempt(attempt: Attempt) {
    return this.saveAttemptOnce(attempt);
  }
  async saveAttemptOnce(attempt: Attempt) {
    await this.db.transaction('rw', this.db.attempts, this.db.syncQueue, async () => {
      if (await this.db.attempts.get(attempt.id)) return;
      await this.db.attempts.put(attempt);
      await this.put({ id: `attempt:${attempt.id}`, entityId: attempt.id, kind: 'attempt', payload: attempt as unknown as Record<string, unknown>, createdAt: attempt.createdAt, attempts: 0 });
    });
    this.requestSync();
  }
  listAttempts() { return this.db.attempts.toArray(); }
  async saveDraft(draft: DraftRecord) {
    await this.db.transaction('rw', this.db.drafts, this.db.syncQueue, async () => {
      await this.db.drafts.put(draft);
      await this.put({ id: `draft:${draft.id}:${draft.updatedAt}`, entityId: draft.id, kind: 'draft', payload: draft as unknown as Record<string, unknown>, createdAt: draft.updatedAt, attempts: 0 });
    });
    this.requestSync();
  }
  getPendingOperations() { return this.list(); }
  upsertReviewCard(card: ReviewCard) { return this.db.reviewCards.put(card).then(() => undefined); }
  listDueReviews(at: string) { return this.db.reviewCards.where('nextReviewAt').belowOrEqual(at).sortBy('nextReviewAt'); }
  completeTask(completion: StudyTaskCompletion) { return this.db.taskCompletions.put(completion).then(() => undefined); }
  upsertKnowledgeState(state: KnowledgeState) { return this.db.knowledgeStates.put(state).then(() => undefined); }
  saveUserSettings(settings: UserSettings) { return this.db.settings.put(settings).then(() => undefined); }
  async getDashboardSnapshot(at = new Date().toISOString()) {
    const [attempts, dueReviews, completions, knowledgeStates, settings] = await Promise.all([
      this.db.attempts.toArray(),
      this.listDueReviews(at),
      this.db.taskCompletions.toArray(),
      this.db.knowledgeStates.toArray(),
      this.db.settings.get('current'),
    ]);
    return { attempts, dueReviews, completions, knowledgeStates, settings: settings ?? defaultUserSettings() };
  }
  list() { return this.db.syncQueue.toArray(); }
  async put(operation: PendingOperation) { if (!await this.db.syncQueue.get(operation.id)) await this.db.syncQueue.put(operation); }
  async remove(id: string) { await this.db.syncQueue.delete(id); }
  async replace(operation: PendingOperation) { await this.db.syncQueue.put(operation); }
  private requestSync() { if (typeof window !== 'undefined') window.dispatchEvent(new Event('cet4:sync-needed')); }
}
