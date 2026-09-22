import { useEffect, type PropsWithChildren } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '../../features/auth/AuthProvider';
import { DexieLearningRepository } from '../repositories/DexieLearningRepository';
import { SyncEngine } from './SyncEngine';
import { SupabaseSyncRemote } from './SupabaseSyncRemote';

const repository = new DexieLearningRepository();

export function SyncCoordinator({ client, children }: PropsWithChildren<{ client: SupabaseClient | null }>) {
  const { user } = useAuth();
  useEffect(() => {
    if (!client || !user) return;
    const engine = new SyncEngine(repository, new SupabaseSyncRemote(client, user.id));
    const flush = () => { void engine.flush(); };
    flush();
    window.addEventListener('online', flush);
    window.addEventListener('cet4:sync-needed', flush);
    return () => { window.removeEventListener('online', flush); window.removeEventListener('cet4:sync-needed', flush); };
  }, [client, user]);
  return children;
}
