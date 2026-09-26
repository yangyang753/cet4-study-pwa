import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '../../features/auth/AuthProvider';
import type { LearningRepository } from '../repositories/LearningRepository';
import { DexieLearningRepository } from '../repositories/DexieLearningRepository';
import { SyncEngine, type SyncRemote } from './SyncEngine';
import { SupabaseSyncRemote } from './SupabaseSyncRemote';
import { SyncContext, type SyncState } from './SyncContext';

const defaultRepository = new DexieLearningRepository();
const retryDelays = [2_000, 5_000, 15_000, 60_000];
const localProfileOwnerKey = 'cet4:local-profile-owner';

export function SyncCoordinator({ client, children, repository = defaultRepository, remoteFactory }: PropsWithChildren<{ client: SupabaseClient | null; repository?: LearningRepository; remoteFactory?: (userId: string) => SyncRemote }>) {
  const { user } = useAuth();
  const [state, setState] = useState<SyncState>('local');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const retry = useCallback(() => setRetryToken((value) => value + 1), []);
  const configured = Boolean(client || remoteFactory);

  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: number | undefined;
    let retryIndex = 0;
    const createRemote = remoteFactory ?? (client ? (userId: string) => new SupabaseSyncRemote(client, userId) : null);
    const run = async () => {
      const pending = await repository.list();
      if (controller.signal.aborted) return;
      setPendingCount(pending.length);
      if (!configured || !user || !createRemote) { setState('local'); return; }
      if (!navigator.onLine) { setState(pending.length ? 'pending' : 'offline'); return; }
      setState('syncing');
      setLastError(null);
      try {
        const engine = new SyncEngine(repository, createRemote(user.id));
        const localProfileOwner = localStorage.getItem(localProfileOwnerKey);
        const claimUnowned = !localProfileOwner || localProfileOwner === user.id;
        if (!localProfileOwner) localStorage.setItem(localProfileOwnerKey, user.id);
        await engine.sync(user.id, controller.signal, { claimUnowned });
        if (controller.signal.aborted) return;
        const remaining = (await repository.list()).length;
        setPendingCount(remaining);
        setLastSyncedAt(new Date().toISOString());
        setState(remaining ? 'pending' : 'synced');
        retryIndex = 0;
      } catch (error) {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
        setState('error');
        setLastError('网络或云端服务暂时不可用');
        retryTimer = window.setTimeout(() => { retryIndex = Math.min(retryIndex + 1, retryDelays.length - 1); void run(); }, retryDelays[retryIndex]);
      }
    };
    const handleSync = () => { if (retryTimer) window.clearTimeout(retryTimer); retryIndex = 0; void run(); };
    void run();
    window.addEventListener('online', handleSync);
    window.addEventListener('offline', handleSync);
    window.addEventListener('cet4:sync-needed', handleSync);
    return () => { controller.abort(); if (retryTimer) window.clearTimeout(retryTimer); window.removeEventListener('online', handleSync); window.removeEventListener('offline', handleSync); window.removeEventListener('cet4:sync-needed', handleSync); };
  }, [client, configured, remoteFactory, repository, retryToken, user]);

  const value = useMemo(() => ({ state, pendingCount, lastSyncedAt, lastError, retry }), [lastError, lastSyncedAt, pendingCount, retry, state]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
