import type { Attempt } from '../../domain/attempt';
import type { DraftRecord, PendingOperation, SyncQueue } from '../sync/SyncEngine';
import type { DashboardSnapshot, KnowledgeState, ReviewCard, StudyTaskCompletion, UserSettings } from '../../domain/learning';
import type { ExamSessionRecord } from '../../domain/exam';

export interface LearningRepository extends SyncQueue {
  saveAttempt(attempt: Attempt): Promise<void>;
  saveAttemptOnce(attempt: Attempt): Promise<void>;
  listAttempts(): Promise<Attempt[]>;
  saveDraft(draft: DraftRecord): Promise<void>;
  getDrafts(): Promise<DraftRecord[]>;
  upsertReviewCard(card: ReviewCard): Promise<void>;
  getReviewCard(id: string): Promise<ReviewCard | null>;
  listDueReviews(at: string): Promise<ReviewCard[]>;
  completeTask(completion: StudyTaskCompletion): Promise<void>;
  upsertKnowledgeState(state: KnowledgeState): Promise<void>;
  saveUserSettings(settings: UserSettings): Promise<void>;
  getDashboardSnapshot(at?: string): Promise<DashboardSnapshot>;
  getPendingOperations(): Promise<PendingOperation[]>;
  saveExamSession(session: ExamSessionRecord): Promise<void>;
  getActiveExamSession(): Promise<ExamSessionRecord | undefined>;
}
