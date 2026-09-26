export type OperationKind = 'attempt' | 'draft' | 'reviewCard' | 'taskCompletion' | 'knowledgeState' | 'examSession' | 'settings' | 'plan' | 'tombstone';
export interface PendingOperation { id: string; entityId: string; kind: OperationKind; payload: Record<string, unknown>; createdAt: string; attempts: number; ownerId?: string }
export interface DraftRecord { id: string; questionId: string; body: string; deviceId: string; updatedAt: string }
export interface TombstoneRecord { id: string; kind: Exclude<OperationKind, 'tombstone'>; entityId: string; deletedAt: string; updatedAt: string }
export interface RemoteRecord { kind: OperationKind; id: string; updatedAt: string; payload: Record<string, unknown>; deletedAt?: string }
export interface RemoteBatch { records: RemoteRecord[]; cursor: string }
export interface SyncQueue {
  list(): Promise<PendingOperation[]>;
  put(operation: PendingOperation): Promise<void>;
  remove(id: string): Promise<void>;
  replace(operation: PendingOperation): Promise<void>;
  mergeRemoteBatch(batch: RemoteBatch): Promise<void>;
  getSyncCursor(userId: string): Promise<string | null>;
  setSyncCursor(cursor: string, userId: string): Promise<void>;
}
export interface SyncRemote {
  upsertAttempt(payload: Record<string, unknown>, signal?: AbortSignal): Promise<void>;
  upsertDraft(payload: Record<string, unknown>, signal?: AbortSignal): Promise<void>;
  upsertOperation?(kind: OperationKind, payload: Record<string, unknown>, signal?: AbortSignal): Promise<void>;
  pullSince?(cursor: string | null, signal?: AbortSignal): Promise<RemoteBatch>;
}
export interface SyncOptions { claimUnowned?: boolean }

export function resolveDraftConflict(local: DraftRecord, remote: DraftRecord): DraftRecord[] {
  if (local.body === remote.body) return [new Date(local.updatedAt) > new Date(remote.updatedAt) ? local : remote];
  const latest = new Date(local.updatedAt) > new Date(remote.updatedAt) ? local : remote;
  const older = latest === local ? remote : local;
  return [latest, { ...older, id: `${older.id}:conflict:${older.deviceId}:${Date.parse(older.updatedAt)}`, deviceId: `${older.deviceId}-来自另一设备` }];
}

export class SyncEngine {
  constructor(private readonly queue: SyncQueue, private readonly remote: SyncRemote) {}
  enqueue(operation: PendingOperation) { return this.queue.put(operation); }

  async sync(userId: string, signal?: AbortSignal, options: SyncOptions = {}) {
    if (this.remote.pullSince) {
      const cursor = await this.queue.getSyncCursor(userId);
      const batch = await this.remote.pullSince(cursor, signal);
      if (signal?.aborted) throw new DOMException('Sync cancelled', 'AbortError');
      await this.queue.mergeRemoteBatch(batch);
      await this.queue.setSyncCursor(batch.cursor, userId);
    }
    return this.flush(signal, userId, options.claimUnowned ?? false);
  }

  async flush(signal?: AbortSignal, userId?: string, claimUnowned = false): Promise<{ synced: number; failed: number }> {
    const operations = (await this.queue.list()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let synced = 0;
    let failed = 0;
    for (const originalOperation of operations) {
      if (signal?.aborted) throw new DOMException('Sync cancelled', 'AbortError');
      if (userId && originalOperation.ownerId && originalOperation.ownerId !== userId) continue;
      if (userId && !originalOperation.ownerId && !claimUnowned) continue;
      const operation = userId && !originalOperation.ownerId ? { ...originalOperation, ownerId: userId } : originalOperation;
      if (operation !== originalOperation) await this.queue.replace(operation);
      if (operation.attempts >= 5) { failed += 1; continue; }
      try {
        if (this.remote.upsertOperation) await this.remote.upsertOperation(operation.kind, operation.payload, signal);
        else if (operation.kind === 'attempt') await this.remote.upsertAttempt(operation.payload, signal);
        else if (operation.kind === 'draft') await this.remote.upsertDraft(operation.payload, signal);
        else throw new Error(`Unsupported sync operation: ${operation.kind}`);
        if (signal?.aborted) throw new DOMException('Sync cancelled', 'AbortError');
        await this.queue.remove(operation.id);
        synced += 1;
      } catch (error) {
        if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error;
        await this.queue.replace({ ...operation, attempts: operation.attempts + 1 });
        failed += 1;
      }
    }
    return { synced, failed };
  }
}
