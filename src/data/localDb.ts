import Dexie, { type EntityTable } from 'dexie';
import type { Attempt } from '../domain/attempt';
import type { DraftRecord, PendingOperation, TombstoneRecord } from './sync/SyncEngine';
import type { KnowledgeState, ReviewCard, StudyTaskCompletion, UserSettings } from '../domain/learning';
import type { ExamSessionRecord } from '../domain/exam';
import type { StudyTask } from '../features/planner/planDay';

export interface CachedPlan { id: string; date: string; tasks: StudyTask[]; updatedAt: string }
export interface SyncCursorRecord { id: string; cursor: string; updatedAt: string }

export class LearningDatabase extends Dexie {
  attempts!: EntityTable<Attempt, 'id'>;
  drafts!: EntityTable<DraftRecord, 'id'>;
  plans!: EntityTable<CachedPlan, 'id'>;
  syncQueue!: EntityTable<PendingOperation, 'id'>;
  reviewCards!: EntityTable<ReviewCard, 'id'>;
  taskCompletions!: EntityTable<StudyTaskCompletion, 'id'>;
  knowledgeStates!: EntityTable<KnowledgeState, 'id'>;
  settings!: EntityTable<UserSettings, 'id'>;
  examSessions!: EntityTable<ExamSessionRecord, 'id'>;
  tombstones!: EntityTable<TombstoneRecord, 'id'>;
  syncCursors!: EntityTable<SyncCursorRecord, 'id'>;

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
    this.version(3).stores({
      attempts: 'id,userId,questionId,createdAt',
      drafts: 'id,questionId,updatedAt',
      plans: 'id,date',
      syncQueue: 'id,entityId,kind,createdAt',
      reviewCards: 'id,questionId,nextReviewAt,updatedAt',
      taskCompletions: 'id,date,taskId,kind,completedAt',
      knowledgeStates: 'id,itemId,status,updatedAt',
      settings: 'id,updatedAt',
      examSessions: 'id,status,updatedAt',
    });
    this.version(4).stores({
      attempts: 'id,userId,questionId,createdAt', drafts: 'id,questionId,updatedAt', plans: 'id,date', syncQueue: 'id,entityId,kind,createdAt',
      reviewCards: 'id,questionId,nextReviewAt,updatedAt', taskCompletions: 'id,date,taskId,kind,completedAt', knowledgeStates: 'id,itemId,status,updatedAt',
      settings: 'id,updatedAt', examSessions: 'id,status,updatedAt', tombstones: 'id,kind,entityId,updatedAt', syncCursors: 'id,updatedAt',
    });
    this.version(5).stores({
      attempts: 'id,userId,questionId,createdAt', drafts: 'id,questionId,updatedAt', plans: 'id,date,updatedAt', syncQueue: 'id,entityId,kind,createdAt',
      reviewCards: 'id,questionId,nextReviewAt,updatedAt', taskCompletions: 'id,date,taskId,kind,completedAt', knowledgeStates: 'id,itemId,status,updatedAt',
      settings: 'id,updatedAt', examSessions: 'id,status,updatedAt', tombstones: 'id,kind,entityId,updatedAt', syncCursors: 'id,updatedAt',
    });
  }
}

export const learningDb = new LearningDatabase();
