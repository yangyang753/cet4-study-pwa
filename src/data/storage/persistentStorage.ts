export type StorageProtectionStatus = 'unsupported' | 'granted' | 'denied' | 'available';
export interface StorageProtection { status: StorageProtectionStatus; usage?: number; quota?: number }

interface StorageManagerLike {
  persisted?(): Promise<boolean>;
  persist?(): Promise<boolean>;
  estimate?(): Promise<{ usage?: number; quota?: number }>;
}

async function snapshot(manager: StorageManagerLike, status: StorageProtectionStatus): Promise<StorageProtection> {
  const estimate: { usage?: number; quota?: number } = await manager.estimate?.().catch(() => ({})) ?? {};
  return { status, ...(estimate?.usage === undefined ? {} : { usage: estimate.usage }), ...(estimate?.quota === undefined ? {} : { quota: estimate.quota }) };
}

export async function readStorageProtection(manager: StorageManagerLike | undefined = navigator.storage): Promise<StorageProtection> {
  if (!manager?.persisted) return { status: 'unsupported' };
  return snapshot(manager, await manager.persisted() ? 'granted' : 'available');
}

export async function requestPersistentStorage(manager: StorageManagerLike | undefined = navigator.storage): Promise<StorageProtection> {
  if (!manager?.persisted || !manager.persist) return { status: 'unsupported' };
  if (await manager.persisted()) return snapshot(manager, 'granted');
  return snapshot(manager, await manager.persist() ? 'granted' : 'denied');
}
