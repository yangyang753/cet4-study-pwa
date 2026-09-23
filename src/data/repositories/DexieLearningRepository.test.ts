import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import type { Attempt } from '../../domain/attempt';
import type { ReviewCard } from '../../domain/learning';
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
});
