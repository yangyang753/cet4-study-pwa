export const backupStorageKey = 'cet4:last-backup-at';

export function backupFreshness(lastBackupAt: string, now: Date) {
  const parsed = Date.parse(lastBackupAt);
  if (!lastBackupAt || Number.isNaN(parsed)) return { status: 'never' as const, ageDays: null };
  const ageDays = Math.max(0, Math.floor((now.getTime() - parsed) / 86_400_000));
  return { status: ageDays > 7 ? 'stale' as const : 'fresh' as const, ageDays };
}

export function localBackupFreshness(now: Date) {
  if (typeof localStorage === 'undefined') return { status: 'never' as const, ageDays: null };
  return backupFreshness(localStorage.getItem(backupStorageKey) ?? '', now);
}
