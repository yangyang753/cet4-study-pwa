import { createContext, useContext } from 'react';

export type SyncState = 'local' | 'offline' | 'pending' | 'syncing' | 'synced' | 'error';
export interface SyncContextValue { state: SyncState; pendingCount: number; lastSyncedAt: string | null; retry(): void }
export const defaultSyncContext: SyncContextValue = { state: 'local', pendingCount: 0, lastSyncedAt: null, retry: () => undefined };
export const SyncContext = createContext<SyncContextValue>(defaultSyncContext);
export const useSync = () => useContext(SyncContext);
