import Dexie, { type EntityTable } from 'dexie';
import type { Attempt } from '../domain/attempt';
import type { DraftRecord, PendingOperation } from './sync/SyncEngine';
import type { KnowledgeState, ReviewCard, StudyTaskCompletion, UserSettings } from '../domain/learning';

export interface CachedPlan { id: string; date: string; tasks: unknown[]; updatedAt: string }

export class LearningDatabase extends Dexie {
  attempts!: EntityTable<Attempt, 'id'>;
  drafts!: EntityTable<DraftRecord, 'id'>;
  plans!: EntityTable<CachedPlan, 'id'>;
  syncQueue!: EntityTable<PendingOperation, 'id'>;
  reviewCards!: EntityTable<ReviewCard, 'id'>;
  taskCompletions!: EntityTable<StudyTaskCompletion, 'id'>;
  knowledgeStates!: EntityTable<KnowledgeState, 'id'>;
  settings!: EntityTable<UserSettings, 'id'>;

  constructor(name = 'cet4-study') {
    super(name);
    this.version(1).stores({ attempts: 'id,userId,questionId,createdAt', drafts: 'id,questionId,updatedAt', plans: 'id,date', syncQueue: 'id,entityId,kind,createdAt' });
    this.version(2).stores({
      attempts: 'id,userId,questionId,createdAt',
      drafts: 'id,questionId,updatedAt',
      plans: 'id,date',
      syncQueue: 'id,entityId,kind,createdAt',
      reviewCards: 'id,questionId,nextReviewAt,updatedAt',
      taskCompletions: 'id,date,taskId,kind,completedAt',
      knowledgeStates: 'id,itemId,status,updatedAt',
      settings: 'id,updatedAt',
    });
  }
}

export const learningDb = new LearningDatabase();
