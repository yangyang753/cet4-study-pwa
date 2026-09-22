import Dexie, { type EntityTable } from 'dexie';
import type { Attempt } from '../domain/attempt';
import type { DraftRecord, PendingOperation } from './sync/SyncEngine';

export interface CachedPlan { id: string; date: string; tasks: unknown[]; updatedAt: string }

export class LearningDatabase extends Dexie {
  attempts!: EntityTable<Attempt, 'id'>;
  drafts!: EntityTable<DraftRecord, 'id'>;
  plans!: EntityTable<CachedPlan, 'id'>;
  syncQueue!: EntityTable<PendingOperation, 'id'>;

  constructor() {
    super('cet4-study');
    this.version(1).stores({ attempts: 'id,userId,questionId,createdAt', drafts: 'id,questionId,updatedAt', plans: 'id,date', syncQueue: 'id,entityId,kind,createdAt' });
  }
}

export const learningDb = new LearningDatabase();
