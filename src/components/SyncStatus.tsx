export function SyncStatus({ state, retry }: { state: 'synced' | 'pending' | 'error'; retry?: () => void }) {
  if (state === 'synced') return <span role="status">已同步</span>;
  if (state === 'pending') return <span role="status">已保存到本机，等待同步</span>;
  return <span role="alert">同步失败，答题仍保存在本机。{retry && <button onClick={retry}>重试</button>}</span>;
}
