import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { LearningDatabase } from '../localDb';
import { exportLearningData, importLearningData } from './learningBackup';

const names: string[] = [];
const database = () => { const name = `backup-test-${crypto.randomUUID()}`; names.push(name); return new LearningDatabase(name); };
afterEach(async () => Promise.all(names.splice(0).map((name) => Dexie.delete(name))));

describe('learning backup', () => {
  it('exports a versioned snapshot and restores its learning records', async () => {
    const source = database();
    await source.attempts.put({ id: 'a-1', userId: 'local', questionId: 'q1', response: 'B', correct: true, score: 1, durationSeconds: 10, createdAt: '2026-09-23T10:00:00.000Z' });
    const backup = await exportLearningData(source);
    expect(backup.schemaVersion).toBe(1);
    const target = database();
    await importLearningData(target, backup);
    expect(await target.attempts.count()).toBe(1);
    source.close(); target.close();
  });

  it('rejects a future or malformed backup without changing the database', async () => {
    const db = database();
    await db.attempts.put({ id: 'a-1', userId: 'local', questionId: 'q1', response: 'B', correct: true, score: 1, durationSeconds: 10, createdAt: '2026-09-23T10:00:00.000Z' });
    await expect(importLearningData(db, { schemaVersion: 99 })).rejects.toThrow('Unsupported backup version');
    await expect(importLearningData(db, '{broken json')).rejects.toThrow('Invalid backup file');
    await expect(importLearningData(db, { schemaVersion: 1, contentVersion: 'v1', exportedAt: '2026-09-23T10:00:00.000Z', data: { attempts: [{ id: 'broken' }], drafts: [], plans: [], syncQueue: [], reviewCards: [], taskCompletions: [], knowledgeStates: [], settings: [], examSessions: [], tombstones: [] } })).rejects.toThrow('Invalid backup file');
    expect(await db.attempts.count()).toBe(1);
    db.close();
  });
});
