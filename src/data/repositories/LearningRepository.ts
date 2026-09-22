import type { Attempt } from '../../domain/attempt';
import type { DraftRecord, PendingOperation, SyncQueue } from '../sync/SyncEngine';

export interface LearningRepository extends SyncQueue {
  saveAttempt(attempt: Attempt): Promise<void>;
  saveDraft(draft: DraftRecord): Promise<void>;
  getPendingOperations(): Promise<PendingOperation[]>;
}
