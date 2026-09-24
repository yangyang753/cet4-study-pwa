import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import type { Attempt } from '../../domain/attempt';
import type { ReviewCard } from '../../domain/learning';
import type { ExamSessionRecord } from '../../domain/exam';
import { LearningDatabase } from '../localDb';
import { DexieLearningRepository } from './DexieLearningRepository';

const databaseNames: string[] = [];
const databaseName = () => {
  const name = `cet4-test-${crypto.randomUUID()}`;
  databaseNames.push(name);
  return name;
};

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map((name) => Dexie.delete(name)));
});

const attempt: Attempt = {
  id: 'attempt-1',
  userId: 'local-learner',
  questionId: 'listen-01:q1',
  response: 'B',
  correct: true,
  score: 1,
  durationSeconds: 15,
  createdAt: '2026-09-23T10:00:00.000Z',
};

describe('DexieLearningRepository', () => {
  it('stores and retrieves the actual daily plan used for carryover', async () => {
    const db = new LearningDatabase(databaseName());
    const repository = new DexieLearningRepository(db);
    const plan = { id: 'plan:2026-10-19', date: '2026-10-19', tasks: [{ id: '2026-10-19:writing', kind: 'writing' as const, minutes: 20, priority: 2 }], updatedAt: '2026-10-19T00:00:00.000Z' };

    await repository.savePlan(plan);

    expect(await repository.getPlan('2026-10-19')).toEqual(plan);
    expect(await repository.list()).toContainEqual(expect.objectContaining({ kind: 'plan', entityId: plan.id }));
    db.close();
  });

  it('merges only a newer remote plan while preserving other dates', async () => {
    const db = new LearningDatabase(databaseName());
    const repository = new DexieLearningRepository(db);
    const local = { id: 'plan:2026-10-19', date: '2026-10-19', tasks: [], updatedAt: '2026-10-19T10:00:00.000Z' };
    await repository.savePlan(local);
    await repository.mergeRemoteBatch({ cursor: 'c1', records: [{ kind: 'plan', id: local.id, updatedAt: '2026-10-19T09:00:00.000Z', payload: { ...local, updatedAt: '2026-10-19T09:00:00.000Z' } }] });
    expect(await repository.getPlan(local.date)).toEqual(local);
    await repository.mergeRemoteBatch({ cursor: 'c2', records: [{ kind: 'plan', id: local.id, updatedAt: '2026-10-19T11:00:00.000Z', payload: { ...local, tasks: [{ id: 'new', kind: 'reading', minutes: 20, priority: 1 }], updatedAt: '2026-10-19T11:00:00.000Z' } }] });
    expect((await repository.getPlan(local.date))?.tasks[0]?.id).toBe('new');
    db.close();
  });

  it('updates an existing attempt with its learner-selected mistake reason', async () => {
    const db = new LearningDatabase(databaseName());
    const repository = new DexieLearningRepository(db);
    const attempt = {
      id: 'reason-attempt', userId: 'local', questionId: 'q1', response: 'B', correct: false,
      score: 0, durationSeconds: 12, createdAt: '2026-09-23T10:00:00.000Z',
    };

    await repository.saveAttemptOnce(attempt);
    await repository.saveAttempt({ ...attempt, mistakeReason: 'guessed', updatedAt: '2026-09-23T10:01:00.000Z' });

    expect(await db.attempts.get(attempt.id)).toMatchObject({ id: attempt.id, mistakeReason: 'guessed' });
    db.close();
  });

  it('accepts a newer remote mistake reason for an existing attempt', async () => {
    const db = new LearningDatabase(databaseName());
    const repository = new DexieLearningRepository(db);
    await repository.saveAttemptOnce(attempt);

    await repository.mergeRemoteBatch({ cursor: 'cursor-1', records: [{
      kind: 'attempt', id: attempt.id, updatedAt: '2026-09-23T10:05:00.000Z',
      payload: { ...attempt, mistakeReason: 'misunderstood', updatedAt: '2026-09-23T10:05:00.000Z' },
    }] });

    expect(await db.attempts.get(attempt.id)).toMatchObject({ mistakeReason: 'misunderstood' });
    db.close();
  });

  it('saves the same attempt id only once', async () => {
    const db = new LearningDatabase(databaseName());
    const repository = new DexieLearningRepository(db);

    await repository.saveAttemptOnce(attempt);
    await repository.saveAttemptOnce(attempt);

    expect(await repository.listAttempts()).toEqual([attempt]);
    db.close();
  });

  it('returns review cards that are due at the requested time', async () => {
    const db = new LearningDatabase(databaseName());
    const repository = new DexieLearningRepository(db);
    const reviewCard: ReviewCard = {
      id: 'review-1', questionId: 'listen-01:q1', stage: 0,
      nextReviewAt: '2026-09-23T08:00:00.000Z', lastCorrect: false,
      updatedAt: '2026-09-23T08:00:00.000Z',
    };

    await repository.upsertReviewCard(reviewCard);

    expect(await repository.listDueReviews('2026-09-23T12:00:00.000Z')).toEqual([reviewCard]);
    db.close();
  });

  it('orders due review cards by learner-specific priority', async () => {
    const db = new LearningDatabase(databaseName());
    const repository = new DexieLearningRepository(db);
    await repository.upsertReviewCard({ id: 'low', questionId: 'q1', stage: 0, priority: 2, nextReviewAt: '2026-09-23T08:00:00.000Z', lastCorrect: false, updatedAt: '2026-09-23T08:00:00.000Z' });
    await repository.upsertReviewCard({ id: 'high', questionId: 'q2', stage: 0, priority: 6, nextReviewAt: '2026-09-23T09:00:00.000Z', lastCorrect: false, updatedAt: '2026-09-23T09:00:00.000Z' });

    expect((await repository.listDueReviews('2026-09-23T12:00:00.000Z')).map((card) => card.id)).toEqual(['high', 'low']);
    db.close();
  });

  it('preserves version-one attempts and drafts during migration', async () => {
    const name = databaseName();
    const oldDb = new Dexie(name);
    oldDb.version(1).stores({
      attempts: 'id,userId,questionId,createdAt', drafts: 'id,questionId,updatedAt',
      plans: 'id,date', syncQueue: 'id,entityId,kind,createdAt',
    });
    await oldDb.open();
    await oldDb.table('attempts').put(attempt);
    await oldDb.table('drafts').put({ id: 'draft-1', questionId: 'write-01', body: 'hello', deviceId: 'phone', updatedAt: '2026-09-23T10:00:00.000Z' });
    oldDb.close();

    const migrated = new LearningDatabase(name);
    await migrated.open();

    expect(await migrated.attempts.get(attempt.id)).toEqual(attempt);
    expect(await migrated.drafts.get('draft-1')).toMatchObject({ body: 'hello' });
    migrated.close();
  });

  it('builds a dashboard snapshot from task, knowledge, and settings records', async () => {
    const db = new LearningDatabase(databaseName());
    const repository = new DexieLearningRepository(db);

    await repository.completeTask({ id: 'done-1', date: '2026-09-23', taskId: 'daily:listening', kind: 'listening', completedAt: '2026-09-23T10:00:00.000Z' });
    await repository.upsertKnowledgeState({ id: 'knowledge-1', itemId: 'v0001', status: 'mastered', favorite: true, updatedAt: '2026-09-23T10:00:00.000Z' });
    await repository.saveUserSettings({ id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1.25, updatedAt: '2026-09-23T10:00:00.000Z' });

    const snapshot = await repository.getDashboardSnapshot('2026-09-23T12:00:00.000Z');
    expect(snapshot.completions).toHaveLength(1);
    expect(snapshot.knowledgeStates).toEqual([expect.objectContaining({ itemId: 'v0001', status: 'mastered' })]);
    expect(snapshot.settings.playbackRate).toBe(1.25);
    db.close();
  });

  it('persists and retrieves the active exam session through the version-three store', async () => {
    const db = new LearningDatabase(databaseName());
    const repository = new DexieLearningRepository(db);
    const session: ExamSessionRecord = {
      id: 'exam:mock-1:1', mockId: 'mock-1', contentVersion: 'v1', startedAt: '2026-09-23T00:00:00.000Z',
      updatedAt: '2026-09-23T00:01:00.000Z', sectionDeadlines: ['2026-09-23T00:30:00.000Z', '2026-09-23T00:55:00.000Z', '2026-09-23T01:35:00.000Z', '2026-09-23T02:05:00.000Z'],
      currentSectionIndex: 0, lockedSectionIndexes: [], answers: {}, status: 'active',
    };

    await repository.saveExamSession(session);

    expect(await repository.getActiveExamSession()).toEqual(session);
    db.close();
  });

  it('keeps both divergent draft bodies and remains idempotent when a pull is retried', async () => {
    const db = new LearningDatabase(databaseName());
    const repository = new DexieLearningRepository(db);
    await repository.saveDraft({ id: 'draft-1', questionId: 'write-01', body: 'phone', deviceId: 'phone', updatedAt: '2026-09-23T10:00:00.000Z' });
    const batch = { cursor: 'cursor-1', records: [{ kind: 'draft' as const, id: 'draft-1', updatedAt: '2026-09-23T10:05:00.000Z', payload: { id: 'draft-1', questionId: 'write-01', body: 'computer', deviceId: 'computer', updatedAt: '2026-09-23T10:05:00.000Z' } }] };

    await repository.mergeRemoteBatch(batch);
    await repository.mergeRemoteBatch(batch);

    expect((await repository.getDrafts()).map((item) => item.body)).toEqual(expect.arrayContaining(['phone', 'computer']));
    expect(await repository.getDrafts()).toHaveLength(2);
    db.close();
  });

  it('applies a newer remote tombstone before mutable records', async () => {
    const db = new LearningDatabase(databaseName());
    const repository = new DexieLearningRepository(db);
    await repository.upsertReviewCard({ id: 'review-1', questionId: 'q1', stage: 0, nextReviewAt: '2026-09-23T10:00:00.000Z', lastCorrect: false, updatedAt: '2026-09-23T10:00:00.000Z' });

    await repository.mergeRemoteBatch({ cursor: 'cursor-2', records: [{ kind: 'tombstone', id: 'reviewCard:review-1', updatedAt: '2026-09-23T11:00:00.000Z', deletedAt: '2026-09-23T11:00:00.000Z', payload: { id: 'reviewCard:review-1', kind: 'reviewCard', entityId: 'review-1', deletedAt: '2026-09-23T11:00:00.000Z', updatedAt: '2026-09-23T11:00:00.000Z' } }] });

    expect(await repository.getReviewCard('review-1')).toBeNull();
    db.close();
  });
});
