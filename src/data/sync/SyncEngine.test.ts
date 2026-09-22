import { describe, expect, it } from 'vitest';
import { SyncEngine, resolveDraftConflict, type PendingOperation, type SyncQueue, type SyncRemote } from './SyncEngine';

class MemoryQueue implements SyncQueue {
  operations: PendingOperation[] = [];
  async list() { return [...this.operations]; }
  async put(operation: PendingOperation) { if (!this.operations.some((item) => item.id === operation.id)) this.operations.push(operation); }
  async remove(id: string) { this.operations = this.operations.filter((item) => item.id !== id); }
  async replace(operation: PendingOperation) { this.operations = this.operations.map((item) => item.id === operation.id ? operation : item); }
}

function attemptOperation(id: string): PendingOperation {
  return { id, entityId: id, kind: 'attempt', payload: { id }, createdAt: '2026-09-22T00:00:00Z', attempts: 0 };
}

describe('SyncEngine', () => {
  it('replaying the same attempt UUID uploads once', async () => {
    const queue = new MemoryQueue();
    const uploaded: string[] = [];
    const remote: SyncRemote = { upsertAttempt: async (payload) => { uploaded.push(String(payload.id)); }, upsertDraft: async () => undefined };
    const engine = new SyncEngine(queue, remote);

    await engine.enqueue(attemptOperation('a-1'));
    await engine.enqueue(attemptOperation('a-1'));
    await engine.flush();

    expect(uploaded).toEqual(['a-1']);
    expect(await queue.list()).toEqual([]);
  });

  it('retains failed operations for a later retry', async () => {
    const queue = new MemoryQueue();
    const remote: SyncRemote = { upsertAttempt: async () => { throw new Error('offline'); }, upsertDraft: async () => undefined };
    const engine = new SyncEngine(queue, remote);
    await engine.enqueue(attemptOperation('a-2'));

    expect(await engine.flush()).toEqual({ synced: 0, failed: 1 });
    expect((await queue.list())[0].attempts).toBe(1);
  });
});

describe('resolveDraftConflict', () => {
  it('keeps both versions after divergent device edits', () => {
    const local = { id: 'd-1', questionId: 'q-1', body: 'local', deviceId: 'phone', updatedAt: '2026-09-22T10:00:00Z' };
    const remote = { id: 'd-1', questionId: 'q-1', body: 'remote', deviceId: 'desktop', updatedAt: '2026-09-22T10:01:00Z' };
    const result = resolveDraftConflict(local, remote);
    expect(result).toHaveLength(2);
    expect(result.map((draft) => draft.body)).toEqual(['remote', 'local']);
    expect(result[1].id).not.toBe('d-1');
  });
});
