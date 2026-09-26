import { useState, type ChangeEvent } from 'react';
import { clearLocalLearningData, exportLearningData, importLearningData } from '../../data/backup/learningBackup';
import { studyDate } from '../../lib/studyDate';

export interface DataManagementActions { exportData(): Promise<unknown> | unknown; importData(input: unknown): Promise<void> | void; clearData(): Promise<void> | void }
const defaultActions: DataManagementActions = { exportData: exportLearningData, importData: (input) => importLearningData(undefined, input), clearData: clearLocalLearningData };
const backupStorageKey = 'cet4:last-backup-at';

export function backupFreshness(lastBackupAt: string, now: Date) {
  const parsed = Date.parse(lastBackupAt);
  if (!lastBackupAt || Number.isNaN(parsed)) return { status: 'never' as const, ageDays: null };
  const ageDays = Math.max(0, Math.floor((now.getTime() - parsed) / 86_400_000));
  return { status: ageDays > 7 ? 'stale' as const : 'fresh' as const, ageDays };
}

export function DataManagement({ actions = defaultActions, now = () => new Date() }: { actions?: DataManagementActions; now?: () => Date }) {
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [lastBackupAt, setLastBackupAt] = useState(() => localStorage.getItem(backupStorageKey) ?? '');
  const freshness = backupFreshness(lastBackupAt, now());
  const download = async () => {
    try {
      const data = await actions.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `cet4-study-backup-${studyDate()}.json`; anchor.click(); URL.revokeObjectURL(url);
      const exportedAt = now().toISOString();
      localStorage.setItem(backupStorageKey, exportedAt);
      setLastBackupAt(exportedAt);
      setMessage('备份已导出。');
    } catch {
      setMessage('备份导出失败，请释放浏览器存储空间后重试。');
    }
  };
  const restore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { await actions.importData(await file.text()); setMessage('备份导入成功。'); } catch (error) { setMessage(error instanceof Error ? error.message : '导入失败。'); }
    event.target.value = '';
  };
  const clear = async () => { await actions.clearData(); setConfirmation(''); setMessage('本机学习数据已清空。'); };
  return <section className="data-management"><h2>数据备份与恢复</h2><p>手动换设备：先在旧设备导出 JSON 备份，再在新设备导入 JSON。导入前会检查文件结构和版本。</p>{freshness.status === 'never' ? <p role="status">尚未在此设备导出备份，建议现在备份一次。</p> : freshness.status === 'stale' ? <p role="alert">上次备份在 {freshness.ageDays} 天前，建议重新导出。</p> : <p role="status">最近备份在 {freshness.ageDays} 天前。</p>}<div className="data-actions"><button onClick={() => void download()}>导出 JSON 备份</button><label className="file-button">导入 JSON<input type="file" accept="application/json,.json" onChange={(event) => void restore(event)} /></label></div><h3>清空本机数据</h3><p>请输入“清空本机数据”后再执行，此操作不会删除云端数据。</p><label>清空确认<input aria-label="清空确认" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button className="danger" disabled={confirmation !== '清空本机数据'} onClick={() => void clear()}>清空本机数据</button>{message && <p role="status">{message}</p>}</section>;
}
