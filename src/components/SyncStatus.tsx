import { useSync, type SyncState } from '../data/sync/SyncContext';

export function SyncStatus({ state: stateOverride, retry: retryOverride, compact = false }: { state?: SyncState; retry?: () => void; compact?: boolean }) {
  const context = useSync();
  const state = stateOverride ?? context.state;
  const retry = retryOverride ?? context.retry;
  const pending = context.pendingCount;
  const className = compact ? 'sync-status compact' : 'sync-status';
  if (state === 'local') return <span className={className} role="status">仅保存在本机</span>;
  if (state === 'offline') return <span className={className} role="status">离线，数据已保存在本机</span>;
  if (state === 'pending') return <span className={className} role="status">{pending} 条记录等待同步</span>;
  if (state === 'syncing') return <span className={className} role="status">正在同步…</span>;
  if (state === 'synced') return <span className={className} role="status">已同步{context.lastSyncedAt ? ` · ${new Date(context.lastSyncedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : ''}</span>;
  return <span className={className} role="alert">同步失败，答题仍保存在本机。<button onClick={retry}>重试</button></span>;
}
