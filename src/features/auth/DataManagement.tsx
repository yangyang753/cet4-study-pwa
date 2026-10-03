import { useEffect, useState, type ChangeEvent } from 'react';
import { clearLocalLearningData, exportLearningData, importLearningData } from '../../data/backup/learningBackup';
import { readStorageProtection, requestPersistentStorage, type StorageProtection } from '../../data/storage/persistentStorage';
import { studyDate } from '../../lib/studyDate';
import { backupFreshness, backupStorageKey } from './backupHealth';

export { backupFreshness } from './backupHealth';
export interface DataManagementActions { exportData(): Promise<unknown> | unknown; importData(input: unknown): Promise<void> | void; clearData(): Promise<void> | void }
interface StorageManagerLike { persisted?(): Promise<boolean>; persist?(): Promise<boolean>; estimate?(): Promise<{ usage?: number; quota?: number }> }
const defaultActions: DataManagementActions = { exportData: exportLearningData, importData: (input) => importLearningData(undefined, input), clearData: clearLocalLearningData };
const storageCopy: Record<StorageProtection['status'], string> = {
  unsupported: '此浏览器不支持持久存储，请定期导出 JSON 备份。', available: '学习记录尚未受浏览器持久保护。',
  denied: '浏览器暂未授予保护，请保留 JSON 备份并稍后重试。', granted: '浏览器已保护学习记录，不会因常规空间清理而优先删除。',
};

export function DataManagement({ actions = defaultActions, now = () => new Date(), storageManager = typeof navigator === 'undefined' ? undefined : navigator.storage }: { actions?: DataManagementActions; now?: () => Date; storageManager?: StorageManagerLike }) {
  const [confirmation, setConfirmation] = useState(''); const [message, setMessage] = useState('');
  const [protection, setProtection] = useState<StorageProtection>({ status: 'unsupported' });
  const [lastBackupAt, setLastBackupAt] = useState(() => localStorage.getItem(backupStorageKey) ?? '');
  const freshness = backupFreshness(lastBackupAt, now());
  useEffect(() => { void readStorageProtection(storageManager).then(setProtection); }, [storageManager]);
  const protect = async () => setProtection(await requestPersistentStorage(storageManager));
  const download = async () => { try { const data = await actions.exportData(); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `cet4-study-backup-${studyDate()}.json`; anchor.click(); URL.revokeObjectURL(url); const exportedAt = now().toISOString(); localStorage.setItem(backupStorageKey, exportedAt); setLastBackupAt(exportedAt); setMessage('备份已导出。'); } catch { setMessage('备份导出失败，请释放浏览器存储空间后重试。'); } };
  const restore = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; try { await actions.importData(await file.text()); setMessage('备份导入成功。'); } catch (error) { setMessage(error instanceof Error ? error.message : '导入失败。'); } event.target.value = ''; };
  const clear = async () => { await actions.clearData(); setConfirmation(''); setMessage('本机学习数据已清空。'); };
  return <section className="data-management">
    <h2>数据备份与恢复</h2><p>手动换设备：先在旧设备导出 JSON 备份，再在新设备导入 JSON。导入前会检查文件结构和版本。</p>
    <section className="storage-protection" aria-label="本机记录保护"><h3>防止浏览器自动清理</h3><p role="status">{storageCopy[protection.status]}</p>{protection.quota ? <p>当前已使用约 {Math.max(1, Math.round((protection.usage ?? 0) / 1024 / 1024))} MB，本网站可用空间约 {Math.max(1, Math.round(protection.quota / 1024 / 1024))} MB。</p> : null}{protection.status !== 'granted' && protection.status !== 'unsupported' ? <button onClick={() => void protect()}>保护本机学习记录</button> : null}</section>
    {freshness.status === 'never' ? <p role="status">尚未在此设备导出备份，建议现在备份一次。</p> : freshness.status === 'stale' ? <p role="alert">上次备份在 {freshness.ageDays} 天前，建议重新导出。</p> : <p role="status">最近备份在 {freshness.ageDays} 天前。</p>}
    <div className="data-actions"><button onClick={() => void download()}>导出 JSON 备份</button><label className="file-button">导入 JSON<input type="file" accept="application/json,.json" onChange={(event) => void restore(event)} /></label></div>
    <h3>清空本机数据</h3><p>请输入“清空本机数据”后再执行，此操作不会删除云端数据。</p><label>清空确认<input aria-label="清空确认" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button className="danger" disabled={confirmation !== '清空本机数据'} onClick={() => void clear()}>清空本机数据</button>{message && <p role="status">{message}</p>}
  </section>;
}
