import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { LearningDatabase } from '../localDb';
import { DexieLearningRepository } from '../repositories/DexieLearningRepository';
import { clearLocalLearningData, exportLearningData, importLearningData, type StorageAdapter } from './learningBackup';

const names: string[] = [];
const database = () => { const name = `backup-test-${crypto.randomUUID()}`; names.push(name); return new LearningDatabase(name); };
class MemoryStorage implements StorageAdapter {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
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

  it('restores learning data but regenerates rather than replaying the source sync queue', async () => {
    const source = database();
    const now = '2026-09-24T09:00:00.000Z';
    await new DexieLearningRepository(source).savePlan({ id: 'plan:2026-09-24', date: '2026-09-24', tasks: [], updatedAt: now });
    const backup = await exportLearningData(source);
    const target = database();

    await expect(importLearningData(target, backup)).resolves.toBeUndefined();
    expect(await target.plans.get('plan:2026-09-24')).toBeTruthy();
    const importedQueue = await target.syncQueue.toArray();
    expect(importedQueue.some((item) => backup.data.syncQueue.some((source) => source.id === item.id))).toBe(false);
    expect(importedQueue).toContainEqual(expect.objectContaining({ kind: 'plan', entityId: 'plan:2026-09-24' }));
    expect(importedQueue[0].ownerId).toBeUndefined();
    source.close(); target.close();
  });

  it('round-trips every exam readiness field including payment confirmation', async () => {
    const source = database();
    await source.settings.put({
      id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1,
      readiness: { registrationConfirmed: true, paymentConfirmed: true, admissionTicketPrepared: false, equipmentPrepared: false },
      updatedAt: '2026-09-26T08:00:00.000Z',
    });
    const target = database();
    await importLearningData(target, await exportLearningData(source));

    expect((await target.settings.get('current'))?.readiness).toMatchObject({ registrationConfirmed: true, paymentConfirmed: true });
    source.close(); target.close();
  });

  it('round-trips exam-date confirmation while older settings remain importable', async () => {
    const source = database();
    await source.settings.put({ id: 'current', examDate: '2026-12-12', examDateConfirmedAt: '2026-09-27T08:00:00.000Z', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-27T08:00:00.000Z' });
    const target = database();
    await importLearningData(target, await exportLearningData(source));
    expect((await target.settings.get('current'))?.examDateConfirmedAt).toBe('2026-09-27T08:00:00.000Z');

    const oldBackup = await exportLearningData(source);
    delete oldBackup.data.settings[0].examDateConfirmedAt;
    const olderTarget = database();
    await expect(importLearningData(olderTarget, oldBackup)).resolves.toBeUndefined();
    expect((await olderTarget.settings.get('current'))?.examDate).toBe('2026-12-12');
    source.close(); target.close(); olderTarget.close();
  });

  it('round-trips a valid diagnostic score profile and rejects a malformed one', async () => {
    const source = database();
    await source.settings.put({
      id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1,
      diagnosticProfile: {
        version: 2, sessionId: 'session-1', completedAt: '2026-09-26T08:00:00.000Z', questionCount: 20,
        levels: { vocabulary: 0.5, grammar: 0.4, listening: 0.3, reading: 0.6, writing: 0.2, translation: 0.5 },
        sectionScores: { writing: 32, listening: 91, reading: 149, translation: 43 },
        estimatedScore: 315, scoreRange: { low: 260, high: 370 }, weakSkills: ['writing', 'listening'], confidence: 'initial',
      },
      updatedAt: '2026-09-26T08:00:00.000Z',
    });
    const backup = await exportLearningData(source);
    const target = database();

    await importLearningData(target, backup);
    expect((await target.settings.get('current'))?.diagnosticProfile?.estimatedScore).toBe(315);

    const malformed = structuredClone(backup) as unknown as { data: { settings: Array<Record<string, unknown>> } };
    malformed.data.settings[0].diagnosticProfile = { version: 2, estimatedScore: 999 };
    await expect(importLearningData(target, malformed)).rejects.toThrow('Invalid backup file');
    const inverted = structuredClone(backup);
    inverted.data.settings[0].diagnosticProfile!.scoreRange = { low: 400, high: 300 };
    await expect(importLearningData(target, inverted)).rejects.toThrow('Invalid backup file');
    source.close(); target.close();
  });

  it('imports older knowledge states that do not contain review scheduling fields', async () => {
    const source = database();
    await source.knowledgeStates.put({
      id: 'knowledge:v0001', itemId: 'v0001', status: 'mastered', favorite: false,
      updatedAt: '2026-09-23T10:00:00.000Z',
    });
    const backup = await exportLearningData(source);
    const target = database();

    await expect(importLearningData(target, backup)).resolves.toBeUndefined();
    expect(await target.knowledgeStates.get('knowledge:v0001')).toMatchObject({ itemId: 'v0001', status: 'mastered' });
    source.close(); target.close();
  });

  it('backs up and restores whitelisted browser learning sessions without copying device identity', async () => {
    const source = database();
    const sourceStorage = new MemoryStorage();
    sourceStorage.setItem('draft:translation-1', '草稿内容');
    sourceStorage.setItem('dictation:listening-1', 'dictation answer');
    sourceStorage.setItem('cet4:diagnostic-session:v2', '{"step":2}');
    sourceStorage.setItem('cet4:aggregate-review-session:v2:local', '{"answered":3}');
    sourceStorage.setItem('cet4:device-id', 'do-not-export');
    sourceStorage.setItem('cet4:local-profile-owner', 'do-not-export');
    sourceStorage.setItem('cet4:last-backup-at', 'do-not-export');

    const backup = await exportLearningData(source, sourceStorage);
    expect(backup.browserState).toEqual({
      'draft:translation-1': '草稿内容',
      'dictation:listening-1': 'dictation answer',
      'cet4:diagnostic-session:v2': '{"step":2}',
      'cet4:aggregate-review-session:v2:local': '{"answered":3}',
    });

    const target = database();
    const targetStorage = new MemoryStorage();
    await importLearningData(target, backup, targetStorage);
    expect(targetStorage.getItem('draft:translation-1')).toBe('草稿内容');
    expect(targetStorage.getItem('cet4:device-id')).toBeNull();
    source.close(); target.close();
  });

  it('still imports an older backup that has no browserState field', async () => {
    const source = database();
    const backup = await exportLearningData(source, new MemoryStorage());
    delete backup.browserState;
    const target = database();
    await expect(importLearningData(target, backup, new MemoryStorage())).resolves.toBeUndefined();
    source.close(); target.close();
  });

  it('clears database learning records and browser learning sessions while preserving device identity', async () => {
    const db = database();
    await db.attempts.put({ id: 'a-1', userId: 'local', questionId: 'q1', response: 'B', correct: true, score: 1, durationSeconds: 10, createdAt: '2026-09-23T10:00:00.000Z' });
    const storage = new MemoryStorage();
    storage.setItem('draft:translation-1', '草稿内容');
    storage.setItem('dictation:listening-1', 'answer');
    storage.setItem('cet4:diagnostic-session:v2', '{}');
    storage.setItem('cet4:last-study-reminder', '2026-10-05');
    storage.setItem('cet4:device-id', 'keep-device');
    storage.setItem('cet4:local-profile-owner', 'keep-owner');

    await clearLocalLearningData(db, storage);

    expect(await db.attempts.count()).toBe(0);
    expect(storage.getItem('draft:translation-1')).toBeNull();
    expect(storage.getItem('dictation:listening-1')).toBeNull();
    expect(storage.getItem('cet4:diagnostic-session:v2')).toBeNull();
    expect(storage.getItem('cet4:last-study-reminder')).toBeNull();
    expect(storage.getItem('cet4:device-id')).toBe('keep-device');
    expect(storage.getItem('cet4:local-profile-owner')).toBe('keep-owner');
    db.close();
  });

  it('keeps IndexedDB backup operations usable when browser storage is unavailable', async () => {
    const db = database();
    await db.attempts.put({ id: 'a-1', userId: 'local', questionId: 'q1', response: 'B', correct: true, score: 1, durationSeconds: 10, createdAt: '2026-09-23T10:00:00.000Z' });
    const brokenStorage: StorageAdapter = {
      get length(): number { throw new Error('blocked'); },
      key() { throw new Error('blocked'); }, getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); },
    };

    const backup = await exportLearningData(db, brokenStorage);
    expect(backup.data.attempts).toHaveLength(1);
    await expect(clearLocalLearningData(db, brokenStorage)).resolves.toBeUndefined();
    db.close();
  });
});
