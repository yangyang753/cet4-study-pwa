import { describe, expect, it, vi } from 'vitest';
import { requestPersistentStorage, readStorageProtection } from './persistentStorage';

describe('persistentStorage', () => {
  it('reports unsupported browsers without throwing', async () => {
    await expect(readStorageProtection(undefined)).resolves.toEqual({ status: 'unsupported' });
  });

  it('reports quota usage and an existing persistent grant', async () => {
    const manager = { persisted: vi.fn(async () => true), estimate: vi.fn(async () => ({ usage: 20, quota: 100 })) };
    await expect(readStorageProtection(manager)).resolves.toEqual({ status: 'granted', usage: 20, quota: 100 });
  });

  it('requests protection and reports a denial clearly', async () => {
    const manager = { persisted: vi.fn(async () => false), persist: vi.fn(async () => false), estimate: vi.fn(async () => ({ usage: 10, quota: 100 })) };
    await expect(requestPersistentStorage(manager)).resolves.toEqual({ status: 'denied', usage: 10, quota: 100 });
    expect(manager.persist).toHaveBeenCalledOnce();
  });
});
