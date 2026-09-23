import type { Attempt } from '../../domain/attempt';
import type { DraftRecord, PendingOperation, SyncQueue } from '../sync/SyncEngine';
import type { DashboardSnapshot, KnowledgeState, ReviewCard, StudyTaskCompletion, UserSettings } from '../../domain/learning';

export interface LearningRepository extends SyncQueue {
  saveAttempt(attempt: Attempt): Promise<void>;
  saveAttemptOnce(attempt: Attempt): Promise<void>;
  listAttempts(): Promise<Attempt[]>;
  saveDraft(draft: DraftRecord): Promise<void>;
  upsertReviewCard(card: ReviewCard): Promise<void>;
  listDueReviews(at: string): Promise<ReviewCard[]>;
  completeTask(completion: StudyTaskCompletion): Promise<void>;
  upsertKnowledgeState(state: KnowledgeState): Promise<void>;
  saveUserSettings(settings: UserSettings): Promise<void>;
  getDashboardSnapshot(at?: string): Promise<DashboardSnapshot>;
  getPendingOperations(): Promise<PendingOperation[]>;
}
