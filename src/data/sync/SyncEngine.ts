export type OperationKind = 'attempt' | 'draft';
export interface PendingOperation { id: string; entityId: string; kind: OperationKind; payload: Record<string, unknown>; createdAt: string; attempts: number }
export interface DraftRecord { id: string; questionId: string; body: string; deviceId: string; updatedAt: string }
export interface SyncQueue { list(): Promise<PendingOperation[]>; put(operation: PendingOperation): Promise<void>; remove(id: string): Promise<void>; replace(operation: PendingOperation): Promise<void> }
export interface SyncRemote { upsertAttempt(payload: Record<string, unknown>): Promise<void>; upsertDraft(payload: Record<string, unknown>): Promise<void> }

export function resolveDraftConflict(local: DraftRecord, remote: DraftRecord): DraftRecord[] {
  if (local.body === remote.body) return [new Date(local.updatedAt) > new Date(remote.updatedAt) ? local : remote];
  const latest = new Date(local.updatedAt) > new Date(remote.updatedAt) ? local : remote;
  const older = latest === local ? remote : local;
  return [latest, { ...older, id: crypto.randomUUID(), body: older.body, deviceId: `${older.deviceId}-来自另一设备` }];
}

export class SyncEngine {
  constructor(private readonly queue: SyncQueue, private readonly remote: SyncRemote) {}

  enqueue(operation: PendingOperation) { return this.queue.put(operation); }

  async flush(): Promise<{ synced: number; failed: number }> {
    const operations = (await this.queue.list()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let synced = 0;
    let failed = 0;
    for (const operation of operations) {
      if (operation.attempts >= 5) { failed += 1; continue; }
      try {
        if (operation.kind === 'attempt') await this.remote.upsertAttempt(operation.payload);
        else await this.remote.upsertDraft(operation.payload);
        await this.queue.remove(operation.id);
        synced += 1;
      } catch {
        await this.queue.replace({ ...operation, attempts: operation.attempts + 1 });
        failed += 1;
      }
    }
    return { synced, failed };
  }
}
