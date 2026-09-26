import { describe, expect, it, vi } from 'vitest';
import { SyncEngine, resolveDraftConflict, type PendingOperation, type RemoteBatch, type SyncQueue, type SyncRemote } from './SyncEngine';

class MemoryQueue implements SyncQueue {
  operations: PendingOperation[] = [];
  entities = new Map<string, Record<string, unknown>>();
  cursor: string | null = null;
  async list() { return [...this.operations]; }
  async put(operation: PendingOperation) { if (!this.operations.some((item) => item.id === operation.id)) this.operations.push(operation); }
  async remove(id: string) { this.operations = this.operations.filter((item) => item.id !== id); }
  async replace(operation: PendingOperation) { this.operations = this.operations.map((item) => item.id === operation.id ? operation : item); }
  async mergeRemoteBatch(batch: RemoteBatch) {
    for (const record of batch.records) {
      const key = `${record.kind}:${record.id}`;
      if (record.deletedAt) this.entities.delete(key);
      else if (!this.entities.has(key) || String(this.entities.get(key)?.updatedAt ?? '') <= record.updatedAt) this.entities.set(key, record.payload);
    }
  }
  async getSyncCursor() { return this.cursor; }
  async setSyncCursor(cursor: string) { this.cursor = cursor; }
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

  it('pulls retry-safely, deduplicates attempts, and advances the cursor after merge', async () => {
    const queue = new MemoryQueue();
    const batch: RemoteBatch = { cursor: '2026-09-23T12:00:00Z|a-1', records: [{ kind: 'attempt', id: 'a-1', updatedAt: '2026-09-23T12:00:00Z', payload: { id: 'a-1', updatedAt: '2026-09-23T12:00:00Z' } }] };
    const remote: SyncRemote = { upsertAttempt: async () => undefined, upsertDraft: async () => undefined, pullSince: async () => batch };
    const engine = new SyncEngine(queue, remote);

    await engine.sync('user-1');
    await engine.sync('user-1');

    expect([...queue.entities]).toHaveLength(1);
    expect(queue.cursor).toBe(batch.cursor);
  });

  it('does not advance the pull cursor when the local merge fails', async () => {
    const queue = new MemoryQueue();
    queue.mergeRemoteBatch = async () => { throw new Error('transaction failed'); };
    const remote: SyncRemote = { upsertAttempt: async () => undefined, upsertDraft: async () => undefined, pullSince: async () => ({ cursor: 'next', records: [] }) };
    const engine = new SyncEngine(queue, remote);

    await expect(engine.sync('user-1')).rejects.toThrow('transaction failed');
    expect(queue.cursor).toBeNull();
  });

  it('never uploads an interrupted operation under the next account', async () => {
    const queue = new MemoryQueue();
    await queue.put(attemptOperation('private-a-1'));
    const controller = new AbortController();
    const firstRemote: SyncRemote = { upsertAttempt: async () => { controller.abort(); }, upsertDraft: async () => undefined };
    await expect(new SyncEngine(queue, firstRemote).sync('user-1', controller.signal, { claimUnowned: true })).rejects.toMatchObject({ name: 'AbortError' });
    const secondUpload = vi.fn().mockResolvedValue(undefined);
    const secondRemote: SyncRemote = { upsertAttempt: secondUpload, upsertDraft: async () => undefined };

    await new SyncEngine(queue, secondRemote).sync('user-2');

    expect(secondUpload).not.toHaveBeenCalled();
  });

  it('does not let an account silently claim anonymous local operations', async () => {
    const queue = new MemoryQueue();
    await queue.put(attemptOperation('anonymous-a-1'));
    const upload = vi.fn().mockResolvedValue(undefined);
    const remote: SyncRemote = { upsertAttempt: upload, upsertDraft: async () => undefined };

    await new SyncEngine(queue, remote).sync('user-1', undefined, { claimUnowned: false });

    expect(upload).not.toHaveBeenCalled();
    expect((await queue.list())[0]).toMatchObject({ id: 'anonymous-a-1' });
    expect((await queue.list())[0].ownerId).toBeUndefined();
  });

  it('claims anonymous operations only for an explicitly attached local profile', async () => {
    const queue = new MemoryQueue();
    await queue.put(attemptOperation('anonymous-a-2'));
    const upload = vi.fn().mockResolvedValue(undefined);
    const remote: SyncRemote = { upsertAttempt: upload, upsertDraft: async () => undefined };

    await new SyncEngine(queue, remote).sync('user-1', undefined, { claimUnowned: true });

    expect(upload).toHaveBeenCalledOnce();
    expect(await queue.list()).toEqual([]);
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
