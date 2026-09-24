import { z } from 'zod';
import type { EntityTable } from 'dexie';
import type { Attempt } from '../../domain/attempt';
import type { ExamSessionRecord } from '../../domain/exam';
import type { KnowledgeState, ReviewCard, StudyTaskCompletion, UserSettings } from '../../domain/learning';
import { learningDb, type CachedPlan, type LearningDatabase } from '../localDb';
import type { DraftRecord, PendingOperation, TombstoneRecord } from '../sync/SyncEngine';

const iso = z.iso.datetime();
const attemptSchema = z.object({ id: z.string().min(1), userId: z.string(), questionId: z.string(), response: z.unknown(), correct: z.boolean().nullable(), score: z.number().nullable(), durationSeconds: z.number(), createdAt: iso }).passthrough();
const draftSchema = z.object({ id: z.string(), questionId: z.string(), body: z.string(), deviceId: z.string(), updatedAt: iso }).passthrough();
const planSchema = z.object({ id: z.string(), date: z.string(), tasks: z.array(z.unknown()), updatedAt: iso }).passthrough();
const syncEntityKindSchema = z.enum(['attempt', 'draft', 'reviewCard', 'taskCompletion', 'knowledgeState', 'examSession', 'settings', 'plan']);
const operationSchema = z.object({ id: z.string(), entityId: z.string(), kind: z.union([syncEntityKindSchema, z.literal('tombstone')]), payload: z.record(z.string(), z.unknown()), createdAt: iso, attempts: z.number() }).passthrough();
const reviewSchema = z.object({ id: z.string(), questionId: z.string(), stage: z.number(), nextReviewAt: iso, lastCorrect: z.boolean(), updatedAt: iso }).passthrough();
const completionSchema = z.object({ id: z.string(), date: z.string(), taskId: z.string(), kind: z.string(), completedAt: iso }).passthrough();
const knowledgeSchema = z.object({ id: z.string(), itemId: z.string(), status: z.enum(['learning', 'review', 'mastered']), favorite: z.boolean(), updatedAt: iso }).passthrough();
const settingsSchema = z.object({ id: z.literal('current'), examDate: z.string(), dailyMinutes: z.number(), playbackRate: z.number(), updatedAt: iso }).passthrough();
const examSchema = z.object({ id: z.string(), mockId: z.string(), contentVersion: z.string(), startedAt: iso, updatedAt: iso, sectionDeadlines: z.array(iso), currentSectionIndex: z.number(), lockedSectionIndexes: z.array(z.number()), answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])), status: z.enum(['active', 'submitted', 'stale']) }).passthrough();
const tombstoneSchema = z.object({ id: z.string(), kind: syncEntityKindSchema, entityId: z.string(), deletedAt: iso, updatedAt: iso }).passthrough();
const backupSchema = z.object({
  schemaVersion: z.literal(1), contentVersion: z.string(), exportedAt: z.iso.datetime(),
  data: z.object({ attempts: z.array(attemptSchema), drafts: z.array(draftSchema), plans: z.array(planSchema), syncQueue: z.array(operationSchema), reviewCards: z.array(reviewSchema), taskCompletions: z.array(completionSchema), knowledgeStates: z.array(knowledgeSchema), settings: z.array(settingsSchema), examSessions: z.array(examSchema), tombstones: z.array(tombstoneSchema) }),
});

export interface LearningBackupV1 {
  schemaVersion: 1; contentVersion: 'v1'; exportedAt: string;
  data: { attempts: Attempt[]; drafts: DraftRecord[]; plans: CachedPlan[]; syncQueue: PendingOperation[]; reviewCards: ReviewCard[]; taskCompletions: StudyTaskCompletion[]; knowledgeStates: KnowledgeState[]; settings: UserSettings[]; examSessions: ExamSessionRecord[]; tombstones: TombstoneRecord[] };
}

export async function exportLearningData(db: LearningDatabase = learningDb): Promise<LearningBackupV1> {
  const [attempts, drafts, plans, syncQueue, reviewCards, taskCompletions, knowledgeStates, settings, examSessions, tombstones] = await Promise.all([db.attempts.toArray(), db.drafts.toArray(), db.plans.toArray(), db.syncQueue.toArray(), db.reviewCards.toArray(), db.taskCompletions.toArray(), db.knowledgeStates.toArray(), db.settings.toArray(), db.examSessions.toArray(), db.tombstones.toArray()]);
  return { schemaVersion: 1, contentVersion: 'v1', exportedAt: new Date().toISOString(), data: { attempts, drafts, plans, syncQueue, reviewCards, taskCompletions, knowledgeStates, settings, examSessions, tombstones } };
}

function parseInput(input: unknown): LearningBackupV1 {
  let value = input;
  if (typeof input === 'string') { try { value = JSON.parse(input); } catch { throw new Error('Invalid backup file'); } }
  if (typeof value === 'object' && value && 'schemaVersion' in value && value.schemaVersion !== 1) throw new Error('Unsupported backup version');
  const result = backupSchema.safeParse(value);
  if (!result.success) throw new Error('Invalid backup file');
  return result.data as unknown as LearningBackupV1;
}

const timestamp = (value: { updatedAt?: string; completedAt?: string; createdAt?: string }) => value.updatedAt ?? value.completedAt ?? value.createdAt ?? '';

export async function importLearningData(db: LearningDatabase = learningDb, input: unknown): Promise<void> {
  const backup = parseInput(input);
  const tables = [db.attempts, db.drafts, db.plans, db.syncQueue, db.reviewCards, db.taskCompletions, db.knowledgeStates, db.settings, db.examSessions, db.tombstones];
  await db.transaction('rw', tables, async () => {
    await db.attempts.bulkPut(backup.data.attempts);
    const merge = async <T extends { id: string; updatedAt?: string; completedAt?: string; createdAt?: string }>(table: EntityTable<T, 'id'>, values: T[]) => {
      for (const value of values) { const local = await table.where(':id').equals(value.id).first(); if (!local || timestamp(local) <= timestamp(value)) await table.put(value); }
    };
    await merge(db.drafts, backup.data.drafts);
    await merge(db.plans, backup.data.plans);
    await db.syncQueue.bulkPut(backup.data.syncQueue);
    await merge(db.reviewCards, backup.data.reviewCards);
    await merge(db.taskCompletions, backup.data.taskCompletions);
    await merge(db.knowledgeStates, backup.data.knowledgeStates);
    await merge(db.settings, backup.data.settings);
    await merge(db.examSessions, backup.data.examSessions);
    await merge(db.tombstones, backup.data.tombstones);
  });
}

export async function clearLocalLearningData(db: LearningDatabase = learningDb): Promise<void> {
  const tables = [db.attempts, db.drafts, db.plans, db.syncQueue, db.reviewCards, db.taskCompletions, db.knowledgeStates, db.settings, db.examSessions, db.tombstones, db.syncCursors];
  await db.transaction('rw', tables, async () => { await Promise.all(tables.map((table) => table.clear())); });
}
